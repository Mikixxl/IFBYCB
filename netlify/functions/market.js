// netlify/functions/market.js

// --- simple in-memory cache (per warm Lambda) ---
const CACHE = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

const ALLOWED_TYPES = new Set(['yield', 'cds']);
const ALLOWED_COUNTRIES = new Set(['US', 'DE', 'GB', 'JP', 'CA']);
const ALLOWED_H = new Set(['today', '1w', '1m']);

// Country display names for parsing/fallbacks
const CNAMES = {
  US: 'United States',
  DE: 'Germany',
  GB: 'United Kingdom',
  JP: 'Japan',
  CA: 'Canada'
};

// Country landing pages on WGB (for yields & CDS row label)
const WGB_COUNTRY_URL = {
  US: 'https://www.worldgovernmentbonds.com/country/united-states/',
  DE: 'https://www.worldgovernmentbonds.com/country/germany/',
  GB: 'https://www.worldgovernmentbonds.com/country/united-kingdom/',
  JP: 'https://www.worldgovernmentbonds.com/country/japan/',
  CA: 'https://www.worldgovernmentbonds.com/country/canada/'
};

// Country landing pages on Investing.com (yields)
const INV_COUNTRY_URL = {
  US: 'https://www.investing.com/rates-bonds/usa-government-bonds',
  DE: 'https://www.investing.com/rates-bonds/germany-government-bonds',
  GB: 'https://www.investing.com/rates-bonds/uk-government-bonds',
  JP: 'https://www.investing.com/rates-bonds/japan-government-bonds',
  CA: 'https://www.investing.com/rates-bonds/canada-government-bonds'
};

const COMMON_HEADERS = {
  // act like a browser; both sites serve bot-lite HTML to bare fetches otherwise
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept':
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://www.google.com/'
};

exports.handler = async (event) => {
  try {
    const url = new URL(
      event.rawUrl ??
        `https://dummy.local${event.path}${event.rawQuery ? '?' + event.rawQuery : ''}`
    );

    const type = (url.searchParams.get('type') || 'yield').toLowerCase();
    const country = (url.searchParams.get('country') || 'US').toUpperCase();
    const h = (url.searchParams.get('h') || 'today').toLowerCase();

    if (!ALLOWED_TYPES.has(type)) return resp(400, { error: 'invalid type' });
    if (!ALLOWED_COUNTRIES.has(country)) return resp(400, { error: 'invalid country' });
    if (!ALLOWED_H.has(h)) return resp(400, { error: 'invalid horizon' });

    // cache key by full query
    const cacheKey = `${type}|${country}|${h}`;
    const cached = CACHE.get(cacheKey);
    const now = Date.now();
    if (cached && now - cached.ts < CACHE_TTL_MS) {
      return resp(200, cached.data, /*fromCache*/ true);
    }

    let data;
    if (type === 'yield') {
      data = await getYields(country);
    } else {
      data = await getCds(country);
    }

    // attach metadata used by your UI
    data.country = country;
    data.h = h;

    CACHE.set(cacheKey, { ts: now, data });
    return resp(200, data);
  } catch (err) {
    console.error('Fatal function error:', err);
    return resp(502, { error: String(err) });
  }
};

// ---- main scrapers ----

// Yields: try WorldGovernmentBonds first, then Investing.com.
// Return shape:
// { asOf: 'YYYY-MM-DD', tenors:{'1M':..,'3M':..,'6M':..,'1Y':..,'2Y':..,'5Y':..,'7Y':..,'10Y':..,'20Y':..,'30Y':..}, src:'wgb'|'investing'|'demo' }
async function getYields(ccy) {
  // 1) WGB
  try {
    const url = WGB_COUNTRY_URL[ccy];
    const res = await fetch(url, { headers: COMMON_HEADERS });
    if (res.ok) {
      const html = await res.text();
      const parsed = parseWgbYields(html);
      if (parsed) {
        parsed.src = 'wgb';
        return parsed;
      }
    } else {
      console.warn('WGB yields HTTP', res.status, ccy);
    }
  } catch (e) {
    console.warn('WGB yields failed', ccy, e);
  }

  // 2) Investing.com
  try {
    const url = INV_COUNTRY_URL[ccy];
    const res = await fetch(url, { headers: COMMON_HEADERS });
    if (res.ok) {
      const html = await res.text();
      const parsed = parseInvestingYields(html);
      if (parsed) {
        parsed.src = 'investing';
        return parsed;
      }
    } else {
      console.warn('Investing yields HTTP', res.status, ccy);
    }
  } catch (e) {
    console.warn('Investing yields failed', ccy, e);
  }

  // 3) Fallback demo
  return demoYield();
}

// CDS: WorldGovernmentBonds “Sovereign CDS” page (5Y).
// Return shape: { asOf:'YYYY-MM-DD', cds5y_bps:Number|null, src:'wgb'|'demo' }
async function getCds(ccy) {
  // the consolidated CDS page lists all countries
  const cdsUrl = 'https://www.worldgovernmentbonds.com/sovereign-cds/';
  try {
    const res = await fetch(cdsUrl, { headers: COMMON_HEADERS });
    if (res.ok) {
      const html = await res.text();
      const val = parseWgbCds(html, CNAMES[ccy]);
      if (val != null) {
        return { asOf: isoToday(), cds5y_bps: val, src: 'wgb' };
      }
      console.warn('WGB cds parse miss for', ccy);
    } else {
      console.warn('WGB cds HTTP', res.status);
    }
  } catch (e) {
    console.warn('WGB cds failed', e);
  }

  // fallback demo
  return { asOf: isoToday(), cds5y_bps: null, src: 'demo' };
}

// ---- parsers ----

// WorldGovernmentBonds (country page) yields parser.
// Tries to find a JS array with points or a table with tenors.
function parseWgbYields(html) {
  // Try to catch a JS array used to draw the curve; several WGB pages include something like:
  // data: [['1M',1.55],['3M',...],...,['30Y',...]]
  const jsArray = /(?:data|series)\s*:\s*(\[[^\]]+\])/i.exec(html);
  const tenors = {};

  if (jsArray) {
    const raw = jsArray[1];
    // very light, tolerant parsing of ["1M", 5.35] tuples
    const pairs = raw.match(/\[\s*['"]([0-9MY]+)['"]\s*,\s*(-?\d+(?:\.\d+)?)\s*\]/g) || [];
    for (const t of pairs) {
      const m = /\[\s*['"]([0-9MY]+)['"]\s*,\s*(-?\d+(?:\.\d+)?)\s*\]/.exec(t);
      if (m) tenors[normalizeTenor(m[1])] = Number(m[2]);
    }
  }

  // If nothing captured, try a table with tenor names in first column and yields in second.
  if (Object.keys(tenors).length === 0) {
    // tenor label followed by a yield number with %; grab common tenors only
    const rows = [...html.matchAll(
      />(1M|3M|6M|1Y|2Y|5Y|7Y|10Y|20Y|30Y)<\/td>\s*<td[^>]*>\s*(-?\d+(?:\.\d+)?)\s*%/gi
    )];
    for (const r of rows) {
      tenors[r[1]] = Number(r[2]);
    }
  }

  if (Object.keys(tenors).length === 0) return null;

  return { asOf: isoToday(), tenors };
}

// Investing.com yields parser.
// Page usually contains a table where tenor label and last yield (%) are present.
function parseInvestingYields(html) {
  const tenors = {};

  // Look for rows like: <td>United States 10-Year</td> ... <td class="lastNum">4.28</td>
  // We map a few common aliases to our canonical tenors
  const labelToTenor = [
    [/(\b1\s*month|\b1m)/i, '1M'],
    [/(\b3\s*month|\b3m)/i, '3M'],
    [/(\b6\s*month|\b6m)/i, '6M'],
    [/(\b1\s*year|\b1y)/i, '1Y'],
    [/(\b2\s*year|\b2y)/i, '2Y'],
    [/(\b5\s*year|\b5y)/i, '5Y'],
    [/(\b7\s*year|\b7y)/i, '7Y'],
    [/(\b10\s*year|\b10y)/i, '10Y'],
    [/(\b20\s*year|\b20y)/i, '20Y'],
    [/(\b30\s*year|\b30y)/i, '30Y']
  ];

  // Grab table rows roughly
  const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
  for (const row of rows) {
    const labelCell = /<td[^>]*>\s*([^<]+?)\s*<\/td>/i.exec(row);
    const yieldCell = /(?:last|pid-\d+-last|lastNum)[^>]*>\s*(-?\d+(?:\.\d+)?)/i.exec(row) ||
                      /<td[^>]*>\s*(-?\d+(?:\.\d+)?)\s*%?\s*<\/td>/i.exec(row);
    if (!labelCell || !yieldCell) continue;

    const label = labelCell[1];
    const y = Number(yieldCell[1]);
    for (const [re, tenor] of labelToTenor) {
      if (re.test(label)) {
        tenors[tenor] = y;
        break;
      }
    }
  }

  if (Object.keys(tenors).length === 0) return null;
  return { asOf: isoToday(), tenors };
}

// WorldGovernmentBonds global CDS page parser: extract 5Y bps for a country row
function parseWgbCds(html, countryName) {
  // Find the row with the country name, then capture the 5Y column value (bps)
  // Table often has columns: Country | 1Y | 2Y | 3Y | 5Y | 7Y | 10Y ...
  // We'll first locate the row, then grab the first number after a 5Y header, or the 4th numeric cell.
  const rowRe = new RegExp(`<tr[^>]*>[^<]*<td[^>]*>\\s*${escapeReg(countryName)}\\s*<\\/td>[\\s\\S]*?<\\/tr>`, 'i');
  const row = html.match(rowRe)?.[0];
  if (!row) return null;

  // Try to locate headers to know which index is 5Y
  const header = html.match(/<thead[^>]*>[\s\S]*?<\/thead>/i)?.[0] || '';
  let idx5y = -1;
  if (header) {
    const hcells = [...header.matchAll(/<th[^>]*>\s*([^<]+?)\s*<\/th>/gi)].map(m => m[1].trim().toUpperCase());
    idx5y = hcells.findIndex(t => /\b5Y\b/.test(t));
  }

  // Extract numeric cells from the row
  const nums = [...row.matchAll(/<td[^>]*>\s*(-?\d+(?:\.\d+)?)\s*<\/td>/gi)].map(m => Number(m[1]));

  // First numeric cell is usually the 1Y (since first cell is country); if header told us the slot, use it
  let v = null;
  if (idx5y >= 0 && nums.length >= idx5y) {
    // nums array aligns to numeric columns only (country cell removed), so idx offset may differ.
    // Heuristic: many tables have: Country | 1Y | 2Y | 3Y | 5Y ... so 5Y is 4th numeric -> index 3
    v = nums[idx5y - 1] ?? null;
  }
  if (v == null && nums.length >= 4) v = nums[3]; // 4th numeric cell heuristic (5Y)

  return v == null ? null : Number(v);
}

// ---- helpers ----
function resp(status, obj, fromCache = false) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*' // handy while you’re iterating
  };
  if (fromCache) headers['X-Cache'] = 'HIT';

  return {
    statusCode: status,
    headers,
    body: JSON.stringify(obj)
  };
}

function isoToday() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function normalizeTenor(t) {
  // normalize e.g. '1m','1 M','10 y' -> '1M'/'10Y'
  const s = String(t).replace(/\s+/g, '').toUpperCase();
  if (/\d+M/.test(s)) return s.replace(/[^0-9M]/g, '');
  if (/\d+Y/.test(s)) return s.replace(/[^0-9Y]/g, '');
  return s;
}

function escapeReg(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// --- demo fallback values (kept stable so UI doesn’t break) ---
function demoYield() {
  return {
    asOf: isoToday(),
    tenors: {
      '1M': 5.35,
      '3M': 5.25,
      '6M': 5.15,
      '1Y': 5.05,
      '2Y': 4.90,
      '5Y': 4.70,
      '7Y': 4.60,
      '10Y': 4.55,
      '20Y': 4.50,
      '30Y': 4.45
    },
    src: 'demo'
  };
}
