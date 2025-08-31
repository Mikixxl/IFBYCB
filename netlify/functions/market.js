// netlify/functions/market.js
// Real: GB (BoE CSV via user-provided link) + DE (Bundesbank CSV if available; fallback WGB).
// Demo: US/JP/CA for now. CDS: best-effort from WGB. 15-min cache.

const CACHE_TTL_MS = 15 * 60 * 1000;
const CACHE = new Map();

const TENORS = ['1M','3M','6M','1Y','2Y','5Y','10Y','30Y'];
const isoToday = () => new Date().toISOString().slice(0,10);

function resp(status, obj) {
  return {
    statusCode: status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    body: JSON.stringify(obj),
  };
}

function normCountry(input) {
  if (!input) return 'US';
  const s = String(input).trim().toUpperCase();
  const map = new Map([
    ['US','US'], ['USA','US'], ['UNITED STATES','US'],
    ['DE','DE'], ['GERMANY','DE'], ['BUND','DE'],
    ['GB','GB'], ['UK','GB'], ['UNITED KINGDOM','GB'], ['GILTS','GB'],
    ['JP','JP'], ['JAPAN','JP'], ['JGB','JP'],
    ['CA','CA'], ['CANADA','CA'], ['GOC','CA'],
  ]);
  return map.get(s) || 'US';
}

exports.handler = async (event) => {
  try {
    const url = new URL(`https://x.invalid${event.path}?${event.rawQueryString || ''}`);
    const type = (url.searchParams.get('type') || 'yield').toLowerCase();
    const ccy  = normCountry(url.searchParams.get('country'));
    const h    = (url.searchParams.get('h') || 'today').toLowerCase(); // today|1w|1m (visual)
    if (!['yield','cds'].includes(type)) return resp(400, { error: 'invalid type' });

    const key = `${type}:${ccy}:${h}`;
    const now = Date.now();
    const hit = CACHE.get(key);
    if (hit && now - hit.ts < CACHE_TTL_MS) return resp(200, hit.data);

    let data;
    if (type === 'yield') {
      if (ccy === 'GB') data = await loadGB_BoE(h);           // real
      else if (ccy === 'DE') data = await loadDE_BbkOrWGB(h); // real (or proxy) with graceful fallback
      else data = await loadDemoYield(ccy, h);                // US/JP/CA for now
    } else {
      data = await loadCDS_WGB(ccy, h);                       // best-effort 5Y CDS
    }

    CACHE.set(key, { ts: now, data });
    return resp(200, data);
  } catch (e) {
    return resp(502, { error: e.message });
  }
};

// ------------------------------
// REAL: United Kingdom (Gilts) – Bank of England CSV (user link)
async function loadGB_BoE(h) {
  // Your exact BoE CSV builder link (from your message). Keep as-is.
  const url = "https://www.bankofengland.co.uk/boeapps/database/fromshowcolumns.asp?Travel=NIxIRxSUx&FromSeries=1&ToSeries=50&DAT=RNG&FD=1&FM=Jan&FY=2015&TD=29&TM=Aug&TY=2025&FNY=&CSVF=TT&html.x=218&html.y=24&C=DQT&C=DQU&C=13S&C=13U&C=DR0&C=5JL&C=15A&C=158&C=C6R&C=2BN&C=4ZC&C=15B&C=5Z4&C=23N&C=DRW&C=C6S&C=DRY&C=4ZD&C=159&C=4ZB&C=2C6&C=DRZ&C=C6T&C=DR6&C=5Z3&C=RN&C=15F&Filter=N";

  const csv = await fetchText(url, { accept: 'text/csv,*/*' });
  // BoE CSV header is comma-separated; last non-empty row is latest
  const lines = csv.split(/\r?\n/).filter(l => l.trim().length);
  if (lines.length < 2) throw new Error('BoE CSV empty');

  const header = splitCSV(lines[0]);            // array of column names
  const row    = splitCSV(lines[lines.length-1]); // latest data row
  const H = indexHeader(header);

  const pick = (...names) => pickNum(row, H, names);

  const tenors = {
    '1M':  pick('1M','1 month','1 m'),
    '3M':  pick('3M','3 months','3 m'),
    '6M':  pick('6M','6 months','6 m'),
    '1Y':  pick('1Y','1 year','1 y'),
    '2Y':  pick('2Y','2 years','2 y'),
    '5Y':  pick('5Y','5 years','5 y'),
    '10Y': pick('10Y','10 years','10 y'),
    '30Y': pick('30Y','30 years','30 y'),
  };

  return { asOf: isoToday(), country: 'GB', tenors };
}

// ------------------------------
// REAL (preferred): Germany – Bundesbank KM1/KM1e CSV (if reachable)
// Fallback (proxy): WorldGovernmentBonds country page (if BBK blocked)
// Fallback2: demo to keep UI alive
async function loadDE_BbkOrWGB(h) {
  // Attempt: Bundesbank CSV (KM1 / KM1e). If you have a specific CSV URL, drop it here.
  const candidates = [
    // Generic AAA par curve series (example); replace with your exact KM1e CSV if you prefer.
    "https://www.bundesbank.de/statistic-rmi/Download?tsId=BBK01.WT1010&its_csvFormat=en&its_fileType=csv",
  ];

  for (const url of candidates) {
    try {
      const csv = await fetchText(url, { accept: 'text/csv,*/*' });
      const lines = csv.split(/\r?\n/).filter(l => l.trim().length);
      if (lines.length < 2) continue;

      // Bundesbank CSV often uses semicolons; detect delimiter
      const delim = lines[0].includes(';') ? ';' : ',';
      const header = lines[0].split(delim).map(s => s.trim());
      const row    = lines[lines.length-1].split(delim).map(s => s.trim());
      const H = indexHeader(header);

      const pick = (...names) => pickNum(row, H, names);

      const tenors = {
        '1M':  pick('1M','1 month','1 MONAT'),
        '3M':  pick('3M','3 months','3 MONATE'),
        '6M':  pick('6M','6 months','6 MONATE'),
        '1Y':  pick('1Y','1 year','1 JAHR'),
        '2Y':  pick('2Y','2 years','2 JAHRE'),
        '5Y':  pick('5Y','5 years','5 JAHRE'),
        '10Y': pick('10Y','10 years','10 JAHRE'),
        '30Y': pick('30Y','30 years','30 JAHRE'),
      };

      return { asOf: isoToday(), country: 'DE', tenors };
    } catch(_) { /* try next */ }
  }

  // Fallback: WGB Germany page (parse table for standard nodes)
  try {
    const html = await fetchText('https://www.worldgovernmentbonds.com/country/germany/', { accept: 'text/html,*/*' });
    const tenors = extractWGBTenors(html);
    if (Object.values(tenors).some(v => v != null)) {
      return { asOf: isoToday(), country: 'DE', tenors };
    }
  } catch(_) { /* ignore */ }

  // Final fallback: demo
  return await loadDemoYield('DE', h);
}

// ------------------------------
// CDS 5Y best-effort from WGB (graceful null on failure)
async function loadCDS_WGB(ccy, h) {
  const slug = { US:'united-states', DE:'germany', GB:'united-kingdom', JP:'japan', CA:'canada' }[ccy] || 'united-states';
  const url = `https://www.worldgovernmentbonds.com/cds-historical-data/${slug}/5-years/`;
  try {
    const html = await fetchText(url, { accept: 'text/html,*/*', referer: 'https://www.worldgovernmentbonds.com/' });
    const m = html.match(/Last[^0-9\-]*([0-9]+(?:\.[0-9]+)?)\s*bp/i);
    const val = m ? Number(m[1]) : null;
    return { asOf: isoToday(), country: ccy, cds5y_bps: Number.isFinite(val) ? val : null };
  } catch(_) {
    return { asOf: isoToday(), country: ccy, cds5y_bps: null };
  }
}

// ------------------------------
// TEMP demo curves — used for US/JP/CA (and as last resort)
async function loadDemoYield(ccy, h) {
  const demo = {
    US: [5.35,5.25,5.15,5.05,4.90,4.70,4.60,4.55],
    DE: [3.60,3.50,3.45,3.35,3.10,2.85,2.70,2.65],
    GB: [4.95,4.85,4.70,4.55,4.30,4.05,3.95,3.90],
    JP: [0.25,0.22,0.20,0.18,0.25,0.30,0.33,0.45],
    CA: [4.30,4.20,4.10,4.00,3.85,3.70,3.60,3.55],
  };
  const arr = demo[ccy] || demo.US;
  const tenors = {};
  TENORS.forEach((t,i) => tenors[t] = arr[i]);
  return { asOf: isoToday(), country: ccy, tenors };
}

// ------------------------------
// Helpers: fetching and parsing
async function fetchText(url, extraHeaders = {}) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': extraHeaders.accept || '*/*',
      ...(extraHeaders.referer ? { 'Referer': extraHeaders.referer } : {})
    },
    // Netlify runtime supports AbortSignal timeout in Node 18+, but not all envs:
    // we rely on upstream stability; catch network errors above.
  });
  if (!res.ok) throw new Error(`fetch ${res.status} ${url}`);
  return res.text();
}

function splitCSV(line) {
  // Simple CSV splitter (no quoted commas needed for these feeds)
  return line.split(',').map(s => s.trim());
}

function indexHeader(cols) {
  const H = {};
  cols.forEach((c, i) => { H[String(c).toUpperCase()] = i; });
  return H;
}

function pickNum(row, H, names) {
  for (const n of names) {
    const i = H[String(n).toUpperCase()];
    if (i != null && i < row.length) {
      const v = toNum(row[i]);
      if (v != null) return v;
    }
  }
  return null;
}

function toNum(x) {
  if (x == null) return null;
  const n = Number(String(x).replace(',', '.').replace(/[^\d.\-]/g,''));
  return Number.isFinite(n) ? n : null;
}

// Extract standard nodes from a WGB country page table (best-effort).
function extractWGBTenors(html) {
  const map = {};
  const grab = (label, patts) => {
    for (const p of patts) {
      const m = html.match(p);
      if (m) return toNum(m[1]);
    }
    return null;
  };

  map['1M']  = grab('1M',  [/1\s*Month[^0-9\-]*([0-9]+(?:\.[0-9]+)?)/i]);
  map['3M']  = grab('3M',  [/3\s*Months?[^0-9\-]*([0-9]+(?:\.[0-9]+)?)/i]);
  map['6M']  = grab('6M',  [/6\s*Months?[^0-9\-]*([0-9]+(?:\.[0-9]+)?)/i]);
  map['1Y']  = grab('1Y',  [/(?:1\s*Year|12\s*Months)[^0-9\-]*([0-9]+(?:\.[0-9]+)?)/i]);
  map['2Y']  = grab('2Y',  [/2\s*Years?[^0-9\-]*([0-9]+(?:\.[0-9]+)?)/i]);
  map['5Y']  = grab('5Y',  [/5\s*Years?[^0-9\-]*([0-9]+(?:\.[0-9]+)?)/i]);
  map['10Y'] = grab('10Y', [/10\s*Years?[^0-9\-]*([0-9]+(?:\.[0-9]+)?)/i]);
  map['30Y'] = grab('30Y', [/30\s*Years?[^0-9\-]*([0-9]+(?:\.[0-9]+)?)/i]);

  return map;
}
