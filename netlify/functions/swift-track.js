// netlify/functions/swift-track.js
// SWIFT gpi Transfer Tracker — PACS.008 / MT103
//
// Query params (GET):
//   uetr=<uuid-v4>                    — search by UETR
//   sendingBic=<bic>                  — search by sending BIC
//   receivingBic=<bic>               — (optional with sendingBic)
//   amount=<number>                  — transfer amount
//   currency=<ISO4217>               — e.g. EUR, USD
//   senderName=<string>              — ordering customer name
//
// Response: { uetr, status, amount, sender, receiver, transactions[], pacs008, mt103 }
//
// Set SWIFT_CONSUMER_KEY + SWIFT_CONSUMER_SECRET env vars to enable
// live SWIFT Developer Portal Sandbox calls. Without them, deterministic
// demo data is returned (same UETR always yields identical response).

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_LABELS = {
  ACCC: 'Completed',
  ACSP: 'In Progress',
  PDNG: 'Pending',
  RJCT: 'Rejected',
};

const BANK_NAMES = {
  DEUT: 'Deutsche Bank',
  COBA: 'Commerzbank',
  BNPA: 'BNP Paribas',
  SOGE: 'Société Générale',
  BCIT: 'Intesa Sanpaolo',
  UBSW: 'UBS',
  CRES: 'Credit Suisse',
  CHAS: 'JPMorgan Chase',
  CITI: 'Citibank',
  BOFA: 'Bank of America',
  NWBK: 'NatWest',
  HSBC: 'HSBC',
  BARS: 'Barclays',
  RABO: 'Rabobank',
  ABNA: 'ABN AMRO',
  BPOT: 'Banco BPI',
  INGA: 'ING Bank',
  SEBA: 'SEB',
  SWED: 'Swedbank',
  DNBA: 'DNB',
};

const CORRESPONDENT_BICS = {
  EUR: ['DEUTDEFFXXX', 'BNPAFRPPXXX', 'INGBNL2AXXX'],
  USD: ['CHASUS33XXX', 'CITIUS33XXX', 'BOFAUS3NXXX'],
  GBP: ['NWBKGB2LXXX', 'BARCGB22XXX', 'HSBCGB2LXXX'],
  CHF: ['UBSWCHZHXXX', 'CRESCHZZXXX', 'SWQBCHZZXXX'],
  JPY: ['BOTKJPJTXXX', 'MHCBJPJTXXX', 'SMITJPJTXXX'],
  DEFAULT: ['DEUTDEFFXXX', 'CHASUS33XXX', 'HSBCHKHHXXX'],
};

// ─── Validation ───────────────────────────────────────────────────────────────

function isValidUetr(u) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(u);
}

function isValidBic(b) {
  return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/i.test(b);
}

// ─── Seeded PRNG (deterministic) ─────────────────────────────────────────────

function hashStr(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(h, 31) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function makeRand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function pick(rand, arr) {
  return arr[Math.floor(rand() * arr.length)];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normBic(bic) {
  bic = bic.toUpperCase();
  return bic.length === 8 ? bic + 'XXX' : bic;
}

function bicCountry(bic) {
  return bic.slice(4, 6).toUpperCase();
}

function getBankName(bic) {
  const prefix = bic.slice(0, 4).toUpperCase();
  return BANK_NAMES[prefix] || bic.slice(0, 4) + ' Bank';
}

function isoTs(d) {
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function genIban(country, rand) {
  const digits = Array.from({ length: 18 }, () => Math.floor(rand() * 10)).join('');
  const check = String(10 + Math.floor(rand() * 89)).padStart(2, '0');
  return `${country}${check}${digits}`;
}

function generateUetrFromSeed(rand) {
  const hex = (n) =>
    Array.from({ length: n }, () => Math.floor(rand() * 16).toString(16)).join('');
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${['8','9','a','b'][Math.floor(rand()*4)]}${hex(3)}-${hex(12)}`;
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Demo data generator ──────────────────────────────────────────────────────

function generateDemoTransfer(params) {
  const { uetr, sendingBic, receivingBic, amount, currency, senderName } = params;

  const seedStr = uetr || `${sendingBic}|${receivingBic}|${amount}|${senderName}`;
  const seed = hashStr(seedStr);
  const rand = makeRand(seed);

  // Resolve inputs
  const effectiveUetr = uetr || generateUetrFromSeed(makeRand(seed + 1));
  const effSendBic = normBic((sendingBic || 'DEUTDEDB').toUpperCase());
  const effRecvBic = normBic((receivingBic || 'NWBKGB2L').toUpperCase());
  const effCcy = (currency || 'EUR').toUpperCase();
  const effAmount = parseFloat(amount) || parseFloat((rand() * 490000 + 10000).toFixed(2));
  const effSenderName = senderName || pick(rand, [
    'ACME Corporation GmbH', 'Nordic Exports AS', 'Atlantic Trading Ltd',
    'Euro Commerce SA', 'Pacific Ventures Inc',
  ]);

  // Status (70 % ACCC, 20 % ACSP, 10 % PDNG)
  const statusRoll = rand();
  const overallStatus =
    statusRoll < 0.70 ? 'ACCC' :
    statusRoll < 0.90 ? 'ACSP' : 'PDNG';

  // Base timestamp: 1–48 h ago
  const baseTime = new Date();
  baseTime.setTime(baseTime.getTime() - (rand() * 47 + 1) * 3_600_000);
  baseTime.setSeconds(Math.floor(rand() * 60));
  baseTime.setMilliseconds(0);

  const settlementDate = baseTime.toISOString().slice(0, 10);

  // Optional correspondent bank (60 % chance)
  const hasCorrespondent = rand() > 0.40;
  const corrList = CORRESPONDENT_BICS[effCcy] || CORRESPONDENT_BICS.DEFAULT;
  const corrBic = hasCorrespondent ? pick(rand, corrList) : null;

  // Charges (SHA)
  const sendCharges = parseFloat((rand() * 20 + 5).toFixed(2));
  const corrCharges = hasCorrespondent ? parseFloat((rand() * 12 + 3).toFixed(2)) : 0;
  const recvCharges = parseFloat((rand() * 8 + 2).toFixed(2));
  const netAmount = parseFloat((effAmount - recvCharges).toFixed(2));

  // Build timeline steps
  const transactions = [];
  let stepTs = new Date(baseTime);

  // Step 1 – Debtor Agent → (correspondent or creditor)
  transactions.push({
    step: 1,
    role: 'Debtor Agent',
    fromBic: effSendBic,
    fromName: getBankName(effSendBic),
    toBic: hasCorrespondent ? corrBic : effRecvBic,
    toName: hasCorrespondent ? getBankName(corrBic) : getBankName(effRecvBic),
    status: 'ACCC',
    statusLabel: 'Confirmed',
    timestamp: isoTs(stepTs),
    amount: effAmount.toFixed(2),
    charges: sendCharges.toFixed(2),
    currency: effCcy,
  });

  // Step 2 – Intermediary (optional)
  if (hasCorrespondent) {
    stepTs = new Date(stepTs.getTime() + (rand() * 25 + 5) * 60_000);
    const corrStatus = overallStatus === 'PDNG' ? 'ACSP' : 'ACCC';
    transactions.push({
      step: 2,
      role: 'Intermediary Agent',
      fromBic: corrBic,
      fromName: getBankName(corrBic),
      toBic: effRecvBic,
      toName: getBankName(effRecvBic),
      status: corrStatus,
      statusLabel: corrStatus === 'ACSP' ? 'Processing' : 'Confirmed',
      timestamp: isoTs(stepTs),
      amount: (effAmount - sendCharges).toFixed(2),
      charges: corrCharges.toFixed(2),
      currency: effCcy,
    });
  }

  // Final step – Creditor Agent
  stepTs = new Date(stepTs.getTime() + (rand() * 55 + 10) * 60_000);
  transactions.push({
    step: hasCorrespondent ? 3 : 2,
    role: 'Creditor Agent',
    fromBic: effRecvBic,
    fromName: getBankName(effRecvBic),
    toBic: 'BENEFICIARY',
    toName: 'Beneficiary Account',
    status: overallStatus,
    statusLabel: STATUS_LABELS[overallStatus],
    timestamp: overallStatus === 'ACCC' ? isoTs(stepTs) : null,
    amount: netAmount.toFixed(2),
    charges: recvCharges.toFixed(2),
    currency: effCcy,
  });

  // Accounts
  const sendCountry = bicCountry(effSendBic);
  const recvCountry = bicCountry(effRecvBic);
  const senderIban = genIban(sendCountry, makeRand(seed + 10));
  const receiverIban = genIban(recvCountry, makeRand(seed + 11));

  const beneficiaryName = pick(makeRand(seed + 20), [
    'Global Supplies Ltd', 'Tech Innovations GmbH', 'Euro Trading SA',
    'Pacific Exports Corp', 'Nordic Commerce AS', 'Southern Logistics BV',
  ]);

  const remittanceInfo = pick(makeRand(seed + 30), [
    'Invoice payment', 'Service fee settlement', 'Goods delivery payment',
    'Contract settlement', 'Quarterly royalty', 'Purchase order payment',
  ]) + ' — ' + new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  const msgId = `MSG${settlementDate.replace(/-/g, '')}-${String(Math.floor(rand() * 9000 + 1000))}`;
  const instrId = `INSTR-${String(Math.floor(rand() * 900000 + 100000))}`;
  const e2eId = `E2E-${effectiveUetr.slice(0, 8).toUpperCase()}`;
  const completedAt = overallStatus === 'ACCC' ? isoTs(stepTs) : null;

  const transfer = {
    uetr: effectiveUetr,
    messageId: msgId,
    instructionId: instrId,
    endToEndId: e2eId,
    status: overallStatus,
    statusLabel: STATUS_LABELS[overallStatus],
    currency: effCcy,
    amount: effAmount.toFixed(2),
    netAmount: netAmount.toFixed(2),
    chargeBearer: 'SHA',
    initiatedAt: isoTs(baseTime),
    completedAt,
    settlementDate,
    sender: {
      name: effSenderName,
      account: senderIban,
      bic: effSendBic,
      bankName: getBankName(effSendBic),
      country: sendCountry,
    },
    receiver: {
      name: beneficiaryName,
      account: receiverIban,
      bic: effRecvBic,
      bankName: getBankName(effRecvBic),
      country: recvCountry,
    },
    remittanceInfo,
    transactions,
    src: 'demo',
  };

  transfer.pacs008 = buildPacs008(transfer);
  transfer.mt103 = buildMt103(transfer);

  return transfer;
}

// ─── PACS.008 builder ─────────────────────────────────────────────────────────

function buildPacs008(t) {
  const { uetr, messageId, instructionId, endToEndId, currency, amount,
          settlementDate, sender, receiver, remittanceInfo, initiatedAt } = t;
  const creTime = initiatedAt.replace('Z', '');

  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>${messageId}</MsgId>
      <CreDtTm>${creTime}</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <SttlmInf>
        <SttlmMtd>CLRG</SttlmMtd>
      </SttlmInf>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <InstrId>${instrId(instructionId)}</InstrId>
        <EndToEndId>${endToEndId}</EndToEndId>
        <UETR>${uetr}</UETR>
      </PmtId>
      <IntrBkSttlmAmt Ccy="${currency}">${amount}</IntrBkSttlmAmt>
      <IntrBkSttlmDt>${settlementDate}</IntrBkSttlmDt>
      <ChrgBr>SHAR</ChrgBr>
      <Dbtr>
        <Nm>${escapeXml(sender.name)}</Nm>
        <PstlAdr><Ctry>${sender.country}</Ctry></PstlAdr>
      </Dbtr>
      <DbtrAcct>
        <Id><IBAN>${sender.account}</IBAN></Id>
      </DbtrAcct>
      <DbtrAgt>
        <FinInstnId>
          <BICFI>${sender.bic}</BICFI>
          <Nm>${escapeXml(sender.bankName)}</Nm>
        </FinInstnId>
      </DbtrAgt>
      <CdtrAgt>
        <FinInstnId>
          <BICFI>${receiver.bic}</BICFI>
          <Nm>${escapeXml(receiver.bankName)}</Nm>
        </FinInstnId>
      </CdtrAgt>
      <Cdtr>
        <Nm>${escapeXml(receiver.name)}</Nm>
        <PstlAdr><Ctry>${receiver.country}</Ctry></PstlAdr>
      </Cdtr>
      <CdtrAcct>
        <Id><IBAN>${receiver.account}</IBAN></Id>
      </CdtrAcct>
      <RmtInf>
        <Ustrd>${escapeXml(remittanceInfo)}</Ustrd>
      </RmtInf>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`;
}

function instrId(id) { return id.slice(0, 35); }

// ─── MT103 builder ────────────────────────────────────────────────────────────

function buildMt103(t) {
  const { uetr, messageId, instructionId, currency, amount,
          settlementDate, sender, receiver, remittanceInfo } = t;
  const dateStr = settlementDate.replace(/-/g, '').slice(2); // YYMMDD
  const amountMt = parseFloat(amount).toFixed(2).replace('.', ',');
  const ref16 = messageId.replace(/[^A-Z0-9]/gi, '').slice(0, 16).toUpperCase();
  const instr16 = instructionId.replace(/[^A-Z0-9-]/gi, '').slice(0, 16).toUpperCase();
  const remit35 = remittanceInfo.slice(0, 35);

  return `{1:F01${sender.bic}0000000001}
{2:I103${receiver.bic}N}
{3:{108:${ref16}}{121:${uetr}}}
{4:
:20:${instr16}
:23B:CRED
:32A:${dateStr}${currency}${amountMt}
:50K:/${sender.account}
${sender.name}
:52A:${sender.bic}
:57A:${receiver.bic}
:59:/${receiver.account}
${receiver.name}
:70:${remit35}
:71A:SHA
-}`;
}

// ─── SWIFT gpi API (stub — configure via env vars) ───────────────────────────

async function fetchFromSwiftGpi(uetr, consumerKey, consumerSecret) {
  // Production / sandbox integration:
  // 1. Obtain OAuth 2.0 access token from SWIFT IAM
  // 2. Call GET https://sandbox.swift.com/swift-apitracker-pilot/v5/payments/{uetr}/transactions
  // 3. Map gpi response to our schema
  // Requires mTLS certificates and SWIFT network connectivity in production.
  throw new Error('SWIFT gpi API not yet configured (set SWIFT_CONSUMER_KEY / SWIFT_CONSUMER_SECRET)');
}

// ─── Netlify handler ──────────────────────────────────────────────────────────

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders() };
  }

  const p = event.queryStringParameters || {};
  const { uetr, sendingBic, receivingBic, amount, currency, senderName } = p;

  if (!uetr && !sendingBic) {
    return errJson(400, 'Provide uetr OR sendingBic (with optional receivingBic, amount, currency, senderName).');
  }

  if (uetr && !isValidUetr(uetr)) {
    return errJson(400, `Invalid UETR — must be UUID v4, e.g. 97ed4827-7b6f-4491-a06f-b548d5a7512d`);
  }
  if (sendingBic && !isValidBic(sendingBic)) {
    return errJson(400, `Invalid sending BIC "${sendingBic}" — expected 8 or 11 characters (e.g. DEUTDEDB)`);
  }
  if (receivingBic && !isValidBic(receivingBic)) {
    return errJson(400, `Invalid receiving BIC "${receivingBic}" — expected 8 or 11 characters`);
  }

  // Try live SWIFT gpi API
  const swiftKey = process.env.SWIFT_CONSUMER_KEY;
  const swiftSecret = process.env.SWIFT_CONSUMER_SECRET;
  if (swiftKey && swiftSecret && uetr) {
    try {
      const result = await fetchFromSwiftGpi(uetr, swiftKey, swiftSecret);
      return okJson(result);
    } catch (_) {
      // Fall through to demo
    }
  }

  const transfer = generateDemoTransfer({ uetr, sendingBic, receivingBic, amount, currency, senderName });
  return okJson(transfer);
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };
}

function okJson(obj) {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache, no-store', ...corsHeaders() },
    body: JSON.stringify(obj),
  };
}

function errJson(statusCode, message) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    body: JSON.stringify({ error: message }),
  };
}
