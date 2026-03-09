// swift-tracker.js — SWIFT Transfer Tracker frontend

// ─── Demo presets ─────────────────────────────────────────────────────────────

const DEMO_UETR = '97ed4827-7b6f-4491-a06f-b548d5a7512d';

const DEMO_DETAILS = {
  sendingBic: 'DEUTDEDB',
  receivingBic: 'NWBKGB2L',
  amount: '125000.00',
  currency: 'EUR',
  senderName: 'ACME Corporation GmbH',
};

// ─── DOM refs ────────────────────────────────────────────────────────────────

const tabBtns     = document.querySelectorAll('.tab-btn');
const tabPanels   = document.querySelectorAll('.tab-panel');
const statusEl    = document.getElementById('tracker-status');
const resultsEl   = document.getElementById('tracker-results');
const formUetr    = document.getElementById('form-uetr');
const formDetails = document.getElementById('form-details');

// ─── Tab switching ───────────────────────────────────────────────────────────

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === target));
    tabPanels.forEach(p => p.classList.toggle('active', p.dataset.tab === target));
  });
});

// ─── Status helper ───────────────────────────────────────────────────────────

function setStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.className = 'tracker-status-msg' + (isError ? ' status-error' : '');
}

// ─── API call ────────────────────────────────────────────────────────────────

async function trackTransfer(params) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, v.trim()); });
  const url = `/api/swift-track?${qs.toString()}`;

  setStatus('Querying SWIFT tracker…');

  const r = await fetch(url, { cache: 'no-store' });
  const data = await r.json();

  if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
  return data;
}

// ─── Render helpers ──────────────────────────────────────────────────────────

const STATUS_CLASS = { ACCC: 'status-ok', ACSP: 'status-progress', PDNG: 'status-pending', RJCT: 'status-rejected' };
const STATUS_ICON  = { ACCC: '✓', ACSP: '↻', PDNG: '…', RJCT: '✕' };

function fmtAmount(val, ccy) {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)
    + ' ' + ccy;
}

function fmtTs(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZoneName: 'short',
  });
}

function set(el, sel, text) {
  const t = el.querySelector(sel);
  if (t) t.textContent = text;
}

// ─── Render result ───────────────────────────────────────────────────────────

function renderResult(data) {
  const template = document.getElementById('result-template');
  const node = template.content.cloneNode(true);
  const root = node.querySelector('.result-root');

  // Badge
  const badge = root.querySelector('.badge');
  badge.textContent = `${STATUS_ICON[data.status] || '?'} ${data.statusLabel}`;
  badge.classList.add(STATUS_CLASS[data.status] || '');

  // Amounts
  set(root, '.summary-amount', fmtAmount(data.amount, ''));
  set(root, '.summary-ccy', data.currency);
  set(root, '.net-amount', fmtAmount(data.netAmount, data.currency) + ' (net)');

  // Route
  set(root, '.sender-name', data.sender.name);
  set(root, '.sender-bic', data.sender.bic);
  set(root, '.sender-acct', data.sender.account);
  set(root, '.receiver-name', data.receiver.name);
  set(root, '.receiver-bic', data.receiver.bic);
  set(root, '.receiver-acct', data.receiver.account);
  set(root, '.ccy-label', data.currency);

  // Fields
  set(root, '.uetr-val', data.uetr);
  set(root, '.msgid-val', data.messageId);
  set(root, '.e2e-val', data.endToEndId);
  set(root, '.settle-date', data.settlementDate);
  set(root, '.initiated-at', fmtTs(data.initiatedAt));
  set(root, '.completed-at', data.completedAt ? fmtTs(data.completedAt) : '—');
  set(root, '.charge-bearer', data.chargeBearer + ' (shared)');
  set(root, '.remittance-info', data.remittanceInfo);
  set(root, '.data-src', data.src === 'demo' ? '⚠ Demo / simulated data' : '✓ Live SWIFT gpi');

  if (!data.completedAt) {
    root.querySelector('.completed-row')?.classList.add('hidden');
  }
  if (data.src !== 'demo') {
    root.querySelector('.src-row')?.classList.add('hidden');
  }

  // Timeline
  const timeline = root.querySelector('#timeline-list');
  data.transactions.forEach(tx => {
    const li = document.createElement('li');
    li.className = `tl-item tl-${(STATUS_CLASS[tx.status] || 'status-pending').replace('status-','')}`;
    li.innerHTML = `
      <div class="tl-dot"></div>
      <div class="tl-body">
        <div class="tl-header">
          <span class="tl-role">${escHtml(tx.role)}</span>
          <span class="tl-badge ${STATUS_CLASS[tx.status] || ''}">${STATUS_ICON[tx.status] || '?'} ${escHtml(tx.statusLabel)}</span>
        </div>
        <div class="tl-route">
          <span class="tl-bic">${escHtml(tx.fromBic)}</span>
          <span class="tl-from-name">${escHtml(tx.fromName)}</span>
          <span class="tl-arrow">→</span>
          <span class="tl-bic">${escHtml(tx.toBic)}</span>
          <span class="tl-to-name">${escHtml(tx.toName)}</span>
        </div>
        <div class="tl-details">
          <span>Amount: <strong>${escHtml(tx.amount)} ${escHtml(tx.currency)}</strong></span>
          <span>Charges: ${escHtml(tx.charges)} ${escHtml(tx.currency)}</span>
          ${tx.timestamp ? `<span>At: ${escHtml(fmtTs(tx.timestamp))}</span>` : '<span class="pending-label">Awaiting confirmation</span>'}
        </div>
      </div>`;
    timeline.appendChild(li);
  });

  // Message panels
  root.querySelector('#pacs008-panel').textContent = data.pacs008 || '— not available —';
  root.querySelector('#mt103-panel').textContent   = data.mt103   || '— not available —';

  // Message tab switching
  const msgTabs   = root.querySelectorAll('.msg-tab');
  const msgPanels = root.querySelectorAll('.msg-panel');
  msgTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.msg;
      msgTabs.forEach(b => b.classList.toggle('active', b.dataset.msg === target));
      msgPanels.forEach(p => p.classList.toggle('active', p.id === target + '-panel'));
    });
  });

  // Copy button
  root.querySelector('#copy-msg-btn').addEventListener('click', () => {
    const activePanel = root.querySelector('.msg-panel.active');
    navigator.clipboard.writeText(activePanel.textContent).then(() => {
      const btn = root.querySelector('#copy-msg-btn');
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = orig; }, 1800);
    });
  });

  resultsEl.innerHTML = '';
  resultsEl.appendChild(node);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ─── Form submission ──────────────────────────────────────────────────────────

async function handleSearch(params) {
  try {
    const data = await trackTransfer(params);
    renderResult(data);
    setStatus(data.src === 'demo'
      ? 'Showing simulated demo data — connect SWIFT gpi credentials for live tracking.'
      : 'Live data retrieved from SWIFT gpi Tracker.');
  } catch (err) {
    setStatus('Error: ' + err.message, true);
    resultsEl.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠</div><p>${escHtml(err.message)}</p></div>`;
  }
}

formUetr.addEventListener('submit', e => {
  e.preventDefault();
  const uetr = formUetr.querySelector('[name=uetr]').value.trim();
  if (!uetr) { setStatus('Please enter a UETR.', true); return; }
  handleSearch({ uetr });
});

formDetails.addEventListener('submit', e => {
  e.preventDefault();
  const fd = new FormData(formDetails);
  const sendingBic = (fd.get('sendingBic') || '').trim();
  if (!sendingBic) { setStatus('Sending BIC is required.', true); return; }
  handleSearch({
    sendingBic,
    receivingBic: fd.get('receivingBic') || '',
    amount:       fd.get('amount') || '',
    currency:     fd.get('currency') || 'EUR',
    senderName:   fd.get('senderName') || '',
  });
});

// ─── Demo buttons ────────────────────────────────────────────────────────────

document.getElementById('demo-uetr-btn').addEventListener('click', () => {
  formUetr.querySelector('[name=uetr]').value = DEMO_UETR;
  handleSearch({ uetr: DEMO_UETR });
});

document.getElementById('demo-details-btn').addEventListener('click', () => {
  formDetails.querySelector('[name=sendingBic]').value = DEMO_DETAILS.sendingBic;
  formDetails.querySelector('[name=receivingBic]').value = DEMO_DETAILS.receivingBic;
  formDetails.querySelector('[name=amount]').value = DEMO_DETAILS.amount;
  formDetails.querySelector('[name=currency]').value = DEMO_DETAILS.currency;
  formDetails.querySelector('[name=senderName]').value = DEMO_DETAILS.senderName;
  handleSearch(DEMO_DETAILS);
});
