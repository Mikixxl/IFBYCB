const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const CACHE = new Map();

exports.handler = async (event) => {
  try {
    const url = new URL(event.rawUrl);
    const type = (url.searchParams.get('type') || 'yield').toLowerCase();
    const country = (url.searchParams.get('country') || 'US').toUpperCase();
    const h = (url.searchParams.get('h') || 'today').toLowerCase();

    const allowedTypes = new Set(['yield', 'cds']);
    const allowedCountries = new Set(['US', 'DE', 'GB', 'JP', 'CA']);
    const allowedH = new Set(['today', '1w', '1m']);

    if (!allowedTypes.has(type) || !allowedCountries.has(country) || !allowedH.has(h)) {
      return resp(400, { error: 'Invalid parameters' });
    }

    const cacheKey = `${type}:${country}:${h}`;
    const now = Date.now();
    const cached = CACHE.get(cacheKey);
    if (cached && now - cached.ts < CACHE_TTL_MS) {
      return resp(200, cached.data, true);
    }

    let data;
    if (type === 'yield') {
      data = await loadYield(country, h);
    } else {
      data = await loadCds(country, h);
    }

    CACHE.set(cacheKey, { ts: now, data });
    return resp(200, data);
  } catch (e) {
    return resp(502, { error: e.message, stack: e.stack });
  }
};

function resp(statusCode, obj, cached = false) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(obj),
  };
}

async function loadYield(country, h) {
  // For demo purposes we use static yields
  const demoTenors = { '2Y': 1.5, '5Y': 1.7, '10Y': 2.0, '30Y': 2.5 };
  return {
    asOf: isoToday(),
    tenors: demoTenors,
  };
}

async function loadCds(country, h) {
  // Try fetching CDS from investing.com (stubbed here)
  let page = null;
  try {
    const url = 'https://www.investing.com/rates-bonds/sovereign-credit-default-swaps';
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'text/html,application/xhtml+xml',
      }
    });
    if (res.ok) {
      page = { ts: Date.now(), html: await res.text(), src: 'investing' };
    }
  } catch (e) { }

  if (!page || !page.html) {
    try {
      const wgbUrl = 'https://www.worldgovernmentbonds.com/sovereign-cds/';
      const res2 = await fetch(wgbUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });
      if (res2.ok) {
        page = { ts: Date.now(), html: await res2.text(), src: 'wgb' };
      }
    } catch (e) { }
  }

  let cds = null;
  if (page && page.html) {
    const name = countryName(country);
    if (page.src === 'investing') cds = parseInvestingCds(page.html, name);
    if (cds == null) cds = parseWGBCds(page.html, name);
  }

  return {
    asOf: isoToday(),
    cds5y_bps: cds != null ? Number(cds) : demoCds(country, h)
  };
}

function countryName(ccy) {
  const map = {
    US: 'United States',
    DE: 'Germany',
    GB: 'United Kingdom',
    JP: 'Japan',
    CA: 'Canada'
  };
  return map[ccy] || ccy;
}

function parseInvestingCds(html, name) {
  try {
    const re = new RegExp(`${name}[^\\n]*?5Y[^\\d]*(\\d+(?:\\.\\d+)?)`, 'i');
    const m = re.exec(html);
    return m ? Number(m[1]) : null;
  } catch (e) {
    return null;
  }
}

function parseWGBCds(html, name) {
  try {
    const re = new RegExp(`${name}[^\\n]*?(\\d+(?:\\.\\d+)?)\\s*bp`, 'i');
    const m = re.exec(html);
    return m ? Number(m[1]) : null;
  } catch (e) {
    return null;
  }
}

function demoCds(country, h) {
  // fallback demo values
  const vals = { US: 25, DE: 20, GB: 40, JP: 35, CA: 22 };
  return vals[country] || 50;
}

function isoToday() {
  return new Date().toISOString().substring(0, 10);
}
