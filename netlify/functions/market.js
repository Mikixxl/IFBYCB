// netlify/functions/market.js
//
// Usage:
//   /.netlify/functions/market?type=yield&country=US&h=today
//   /.netlify/functions/market?type=cds&country=DE&h=today
// Optional:
//   &debug=1   -> adds {debug:{...}} with fetch status, lengths, reasons
//
// Notes:
// - Tries WGB (WorldGovernmentBonds) first for yields; very light parser.
// - CDS is best-effort; if parsing fails, returns demo with reason.
// - Always sets `src` to "live" if a live parse succeeded, else "demo".
// - Adds CORS so you can open function URLs in the browser.

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const CACHE = new Map();

function resp(code, data, debug) {
  const body = JSON.stringify(debug ? { ...data, debug } : data);
  return {
    statusCode: code,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, OPTIONS',
    },
    body,
  };
}

function isoToday() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

// ---------- Country helpers ----------
const COUNTRY_MAP = {
  US: { name: 'United States', wgb: 'united-states' },
  DE: { name: 'Germany',        wgb: 'germany' },
  GB: { name: 'United Kingdom', wgb: 'united-kingdom' },
  JP: { name: 'Japan',          wgb: 'japan' },
  CA: { name: 'Canada',         wgb: 'canada' },
};

// Tenor order we’ll return
const TENORS = ['1M', '3M', '6M', '1Y', '2Y', '5Y', '7Y', '10Y', '20Y', '30Y'];

// ---------- Demo data (only used on fallback) ----------
const DEMO_CURVE = {
  '1M': 5.35, '3M': 5.25, '6M': 5.15, '1Y': 5.05, '2Y': 4.90,
  '5Y': 4.70, '7Y': 4.60, '10Y': 4.55, '20Y': 4.50, '30Y': 4.45,
};
const DEMO_CDS_5Y = 50; // bps

// ---------- Lightweight fetch with retry ----------
async function fetchText(url, debug, opts = {}) {
  const headers = {
    // Some sources block generic bots; this helps a bit.
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    ...opts.headers,
  };

  let lastErr = null;
  for (let i = 0; i < (opts.retries ?? 1); i++) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), opts.timeoutMs ?? 9000);
      const res = await fetch(url, { headers, signal: controller.signal });
      clearTimeout(t);
      debug.logs.push({ where: 'fetch', url, status: res.status });
      if (!res.ok) {
        lastErr = new Error('HTTP ' + res.status);
        continue;
      }
      const txt = await res.text();
      debug.logs.push({ where: 'fetch', url, length: txt.length });
      return txt;
    } catch (e) {
      lastErr = e;
      debug.logs.push({ where: 'fetch-error', url, error: String(e) });
    }
  }
  throw lastErr ?? new Error('fetch failed');
}

// ---------- Parse WGB yield curve (very tolerant) ----------
function parseWgbYield(html, debug) {
  // WGB often embeds a small table “Yield Curve” with tenors in first column
  // and yields in second; also sometimes a JS block with points.
  // We try multiple strategies, very lax regex.

  // Strategy A: look for table rows like: <td>10Y</td><td>4.55 %</td>
  const map = {};
  const tableRe = /<tr[^>]*>\s*<td[^>]*>\s*([0-9]{1,2}Y|[136]M)\s*<\/td>\s*<td[^>]*>\s*([0-9.,]+)\s*%/gi;
  let m;
  while ((m = tableRe.exec(html))) {
    const tenor = m[1].toUpperCase();
    const val = parseFloat(m[2].replace(',', '.'));
    if (!isNaN(val)) map[tenor] = val;
  }
  debug.logs.push({ where: 'parseWGB-table', found: Object.keys(map).length });

  // Strategy B: points in JS: ["1M",5.35],["3M",5.25],...
  if (Object.keys(map).length < 3) {
    const jsPairs = [...html.matchAll(/\["(1M|3M|6M|1Y|2Y|5Y|7Y|10Y|20Y|30Y)"\s*,\s*([0-9.]+)\]/gi)];
    jsPairs.forEach((p) => {
      const tenor = p[1].toUpperCase();
      const val = parseFloat(p[2]);
      if (!isNaN(val)) map[tenor] = val;
    });
    debug.logs.push({ where: 'parseWGB-js', found: jsPairs.length });
  }

  // Normalize to our TENORS order if we have at least a sensible set
  const have = TENORS.filter((t) => map[t] != null);
  if (have.length >= 5) {
    const out = {};
    TENORS.forEach((t) => {
      if (map[t] != null) out[t] = map[t];
    });
    return out;
  }
  return null;
}

// ---------- Best-effort CDS parser (placeholder) ----------
function parseWgbCds(html, debug) {
  // Many WGB country pages show a CDS 5y in text like: "CDS 5 Years: 75.12 (bp)"
  const m = html.match(/CDS\s*5\s*Years[^0-9]*([0-9.,]+)\s*\(?bp\)?/i);
  if (m) {
    const v = parseFloat(m[1].replace(',', '.'));
    if (!isNaN(v)) return v;
  }
  // Alternative tiny card “5 Years CDS … 75.1”
  const m2 = html.match(/5\s*Years\s*CDS[^0-9]*([0-9.,]+)/i);
  if (m2) {
    const v = parseFloat(m2[1].replace(',', '.'));
    if (!isNaN(v)) return v;
  }
  debug.logs.push({ where: 'parseCDS', found: false });
  return null;
}

// ---------- Data loaders ----------
async function loadYield(country, h, debug) {
  const info = COUNTRY_MAP[country];
  if (!info) throw new Error('unsupported country');

  const cacheKey = `y:${country}:${h}`;
  const now = Date.now();
  const cached = CACHE.get(cacheKey);
  if (cached && now - cached.ts < CACHE_TTL_MS) {
    debug.logs.push({ where: 'cache-hit', key: cacheKey });
    return { asOf: isoToday(), tenors: cached.data, src: 'live-cache' };
  }

  // Try WGB
  const url = `https://www.worldgovernmentbonds.com/country/${info.wgb}/`;
  let tenors = null;
  try {
    const html = await fetchText(url, debug, { retries: 1 });
    tenors = parseWgbYield(html, debug);
  } catch (e) {
    debug.logs.push({ where: 'wgb-fetch-error', error: String(e) });
  }

  if (tenors) {
    CACHE.set(cacheKey, { ts: now, data: tenors });
    return { asOf: isoToday(), tenors, src: 'live' };
  }

  // Fallback to demo
  debug.reason = 'yield-fallback-demo';
  return { asOf: isoToday(), tenors: DEMO_CURVE, src: 'demo' };
}

async function loadCds(country, h, debug) {
  const info = COUNTRY_MAP[country];
  if (!info) throw new Error('unsupported country');

  const cacheKey = `cds:${country}:${h}`;
  const now = Date.now();
  const cached = CACHE.get(cacheKey);
  if (cached && now - cached.ts < CACHE_TTL_MS) {
    debug.logs.push({ where: 'cache-hit', key: cacheKey });
    return { asOf: isoToday(), cds5y_bps: cached.data, src: 'live-cache' };
  }

  const url = `https://www.worldgovernmentbonds.com/country/${info.wgb}/`;
  let cds = null;
  try {
    const html = await fetchText(url, debug, { retries: 1 });
    cds = parseWgbCds(html, debug);
  } catch (e) {
    debug.logs.push({ where: 'wgb-cds-fetch-error', error: String(e) });
  }

  if (typeof cds === 'number') {
    CACHE.set(cacheKey, { ts: now, data: cds });
    return { asOf: isoToday(), cds5y_bps: cds, src: 'live' };
  }

  // Fallback
  debug.reason = 'cds-fallback-demo';
  return { asOf: isoToday(), cds5y_bps: DEMO_CDS_5Y, src: 'demo' };
}

// ---------- Handler ----------
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return resp(200, { ok: true });
  }

  const q = new URLSearchParams(event.rawQueryString || '');
  const type = (q.get('type') || 'yield').toLowerCase();
  const country = (q.get('country') || 'US').toUpperCase();
  const h = (q.get('h') || 'today').toLowerCase(); // today | 1w | 1m (stored but not used for now)
  const debugFlag = q.get('debug') === '1';

  const debug = { logs: [], params: { type, country, h } };

  try {
    if (!(country in COUNTRY_MAP)) {
      return resp(400, { error: 'Unsupported country', country }, debugFlag ? debug : undefined);
    }
    if (type !== 'yield' && type !== 'cds') {
      return resp(400, { error: 'Unsupported type', type }, debugFlag ? debug : undefined);
    }

    if (type === 'yield') {
      const out = await loadYield(country, h, debug);
      return resp(200, { ...out, country, h }, debugFlag ? debug : undefined);
    } else {
      const out = await loadCds(country, h, debug);
      return resp(200, { ...out, country, h }, debugFlag ? debug : undefined);
    }
  } catch (e) {
    debug.logs.push({ where: 'handler-catch', error: String(e) });
    // Hard fallback to demo instead of 500
    if (type === 'yield') {
      return resp(200, { asOf: isoToday(), tenors: DEMO_CURVE, src: 'demo', country, h },
        debugFlag ? { ...debug, reason: 'handler-exception-yield' } : undefined);
    } else {
      return resp(200, { asOf: isoToday(), cds5y_bps: DEMO_CDS_5Y, src: 'demo', country, h },
        debugFlag ? { ...debug, reason: 'handler-exception-cds' } : undefined);
    }
  }
};
