// netlify/functions/market.js

// ---- Simple in-memory cache (per function instance) ----
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const CACHE = new Map(); // key -> { ts, data }

// Country code → human-friendly names for scrapers
const NAMES = {
  US: 'united-states',
  DE: 'germany',
  GB: 'united-kingdom',
  JP: 'japan',
  CA: 'canada',
};

// tenors we plot (must match your front-end labels)
const TENORS = ['1M','3M','6M','1Y','2Y','5Y','7Y','10Y','20Y','30Y'];

// ---- Utilities ----
const isoToday = () => new Date().toISOString().slice(0,10);

function ok(data, debugInfo) {
  // If debug requested, include debugInfo
  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(debugInfo ? { ...data, _debug: debugInfo } : data),
  };
}
function bad(code, msg) {
  return {
    statusCode: code,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ error: msg }),
  };
}

async function fetchWithUA(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ifb-yield/1.0; +https://ifcifb.com)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://www.worldgovernmentbonds.com/',
      'Cache-Control': 'no-cache',
    }
  });
  return res;
}

// ---- DEMO fallback (used only if live fails) ----
function demoCurve(country) {
  // simple smooth demo curve; keeps UI working
  const vals = [5.35,5.25,5.15,5.05,4.90,4.70,4.60,4.55,4.50,4.45];
  const tenors = {};
  TENORS.forEach((t,i)=> tenors[t] = vals[i]);
  return { asOf: isoToday(), country, tenors, src: 'demo' };
}

function demoCds(country) {
  return { asOf: isoToday(), country, cds5y_bps: 50, src: 'demo' };
}

// ---- Parsers -------------------------------------------------

// Try source A (WorldGovernmentBonds country page).
// We’ll look for the curve table values in HTML.
// NOTE: Scraping is brittle. This keeps us on the conservative side:
// if we can't recognize tenors, we bail and let demo take over.
function parseWgbYields(html) {
  // Look for a JS snippet holding curve points e.g. data: [[“1M”, 5.12],...]
  // As formats change, we keep this tolerant and greedy.
  // 1) Try to capture something like: "curveData":{ "1M":5.12, ... }
  const out = {};
  let found = 0;

  // Try key:value pairs for well-known tenors
  TENORS.forEach(t => {
    // escape 1Y/2Y... in regex
    const re = new RegExp(`["']${t}["']\\s*:\\s*([0-9]+(?:\\.[0-9]+)?)`, 'i');
    const m = html.match(re);
    if (m) {
      out[t] = Number(m[1]);
      found++;
    }
  });

  if (found >= 5) return out; // enough to be useful

  // 2) Try table rows fallback: <td>1Y</td><td>4.95</td> etc.
  TENORS.forEach(t => {
    const re = new RegExp(`>${t}<\\/[^>]+>\\s*<td[^>]*>\\s*([0-9]+(?:\\.[0-9]+)?)`, 'i');
    const m = html.match(re);
    if (m) {
      out[t] = Number(m[1]);
      found++;
    }
  });

  return found >= 5 ? out : null;
}

async function getYields(country, horizon, debug) {
  // cache key
  const key = `YIELD:${country}:${horizon}`;
  const c = CACHE.get(key);
  if (c && Date.now() - c.ts < CACHE_TTL_MS) return { ...c.data, cache: 'hit' };

  const debugInfo = { steps: [] };

  // Source A: WGB country page
  if (!NAMES[country]) {
    throw new Error(`Unsupported country: ${country}`);
  }
  const url = `https://www.worldgovernmentbonds.com/country/${NAMES[country]}/`;
  debugInfo.steps.push({ try: 'wgb', url });

  try {
    const res = await fetchWithUA(url);
    if (!res.ok) {
      debugInfo.steps.push({ wgb_status: res.status });
      throw new Error(`WGB status ${res.status}`);
    }
    const html = await res.text();
    const tenors = parseWgbYields(html);
    if (tenors) {
      const data = { asOf: isoToday(), country, tenors, src: 'wgb', horizon };
      CACHE.set(key, { ts: Date.now(), data });
      return debug ? { ...data, _debug: debugInfo } : data;
    }
    debugInfo.steps.push({ wgb_parse: 'failed' });
    throw new Error('WGB parse failed');
  } catch (e) {
    debugInfo.steps.push({ wgb_error: String(e) });
  }

  // If we’re here, live source failed → demo
  const data = demoCurve(country);
  if (debug) data._debug = debugInfo;
  CACHE.set(key, { ts: Date.now(), data });
  return data;
}

async function getCds(country, horizon, debug) {
  const key = `CDS:${country}:${horizon}`;
  const c = CACHE.get(key);
  if (c && Date.now() - c.ts < CACHE_TTL_MS) return { ...c.data, cache: 'hit' };

  const debugInfo = { steps: [] };

  // Try WGB sovereign cds page (single page, we then pick the row by country name)
  const url = 'https://www.worldgovernmentbonds.com/sovereign-cds/';
  debugInfo.steps.push({ try: 'wgb_cds', url });

  try {
    const res = await fetchWithUA(url);
    if (!res.ok) {
      debugInfo.steps.push({ wgb_cds_status: res.status });
      throw new Error(`CDS status ${res.status}`);
    }
    const html = await res.text();
    const countryName = {
      US: 'United States',
      DE: 'Germany',
      GB: 'United Kingdom',
      JP: 'Japan',
      CA: 'Canada',
    }[country] || country;

    // Find row like: <td>United States</td> ... <td>5 Years</td><td>123.45</td>
    const rowRe = new RegExp(
      `<tr[^>]*>[^<]*<td[^>]*>\\s*${countryName}\\s*<\\/td>[\\s\\S]*?<td[^>]*>\\s*5\\s*Years\\s*<\\/td>\\s*<td[^>]*>\\s*([0-9]+(?:\\.[0-9]+)?)\\s*<\\/td>`,
      'i'
    );
    const m = html.match(rowRe);
    if (m) {
      const cds5y_bps = Number(m[1]);
      const data = { asOf: isoToday(), country, cds5y_bps, src: 'wgb' };
      CACHE.set(key, { ts: Date.now(), data });
      return debug ? { ...data, _debug: debugInfo } : data;
    }
    debugInfo.steps.push({ wgb_cds_parse: 'failed' });
    throw new Error('CDS parse failed');
  } catch (e) {
    debugInfo.steps.push({ wgb_cds_error: String(e) });
  }

  const data = demoCds(country);
  if (debug) data._debug = debugInfo;
  CACHE.set(key, { ts: Date.now(), data });
  return data;
}

// ---- Netlify handler ----
exports.handler = async (event) => {
  try {
    const url = new URL(event.rawUrl || `https://dummy${event.path}?${event.queryStringParameters||''}`);
    const qs = Object.fromEntries(url.searchParams.entries());
    const type = (qs.type || 'yield').toLowerCase();   // 'yield' | 'cds'
    const country = (qs.country || 'US').toUpperCase(); // US, DE, GB, JP, CA
    const h = (qs.h || 'today').toLowerCase();          // today|1w|1m  (currently only labeling)
    const debug = qs.debug === '1' || qs.debug === 'true';

    if (!['yield','cds'].includes(type)) {
      return bad(400, 'Invalid type. Use type=yield or type=cds');
    }
    if (!NAMES[country]) {
      return bad(400, 'Invalid country. Use one of US,DE,GB,JP,CA');
    }

    const data = type === 'yield'
      ? await getYields(country, h, debug)
      : await getCds(country, h, debug);

    return ok(data, debug ? data._debug : null);
  } catch (e) {
    return bad(500, String(e));
  }
};
