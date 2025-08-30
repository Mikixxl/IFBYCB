// netlify/functions/market.js

const fetch = require("node-fetch");

// Cache settings
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const CACHE = new Map();

// Tenors we expect for yield curves
const TENORS = ["1M", "3M", "6M", "1Y", "2Y", "5Y", "10Y", "30Y"];

// Utility: wrap responses
function resp(status, obj, cached = false) {
  return {
    statusCode: status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
    body: JSON.stringify(obj),
  };
}

// Utility: today’s ISO date
function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

// Main handler
exports.handler = async (event) => {
  try {
    const url = new URL(`https://x.invalid${event.path}?${event.rawQueryString || ""}`);
    const type = (url.searchParams.get("type") || "yield").toLowerCase();
    const country = (url.searchParams.get("country") || "US").toUpperCase();
    const h = (url.searchParams.get("h") || "today").toLowerCase();

    // cache key must include country/type/horizon
    const cacheKey = `${type}:${country}:${h}`;
    const now = Date.now();

    const cached = CACHE.get(cacheKey);
    if (cached && now - cached.ts < CACHE_TTL_MS) {
      return resp(200, cached.data, true);
    }

    let data;
    if (type === "yield") {
      data = await fetchYield(country, h);
    } else if (type === "cds") {
      data = await fetchCDS(country, h);
    } else {
      return resp(400, { error: "invalid type" });
    }

    CACHE.set(cacheKey, { ts: now, data });
    return resp(200, data);
  } catch (err) {
    return resp(502, { error: err.message });
  }
};

// Fetch sovereign yield curve (placeholder demo values)
async function fetchYield(country, horizon) {
  // TODO: replace with real scraping/API if you want live data
  const base = {
    US: [5.25, 5.15, 5.10, 5.05, 5.00, 4.90, 4.85, 4.80],
    DE: [3.25, 3.20, 3.15, 3.10, 3.00, 2.90, 2.80, 2.70],
    GB: [4.50, 4.40, 4.35, 4.30, 4.20, 4.10, 4.00, 3.90],
    JP: [0.10, 0.12, 0.13, 0.15, 0.20, 0.25, 0.30, 0.40],
    CA: [4.20, 4.15, 4.10, 4.00, 3.90, 3.85, 3.80, 3.70],
  };

  const arr = base[country] || base["US"];
  const tenors = {};
  TENORS.forEach((t, i) => (tenors[t] = arr[i]));

  return { asOf: isoToday(), tenors };
}

// Fetch CDS 5Y spreads (demo values)
async function fetchCDS(country, horizon) {
  const demo = {
    US: 25,
    DE: 20,
    GB: 35,
    JP: 40,
    CA: 30,
  };

  return { asOf: isoToday(), cds5y_bps: demo[country] || 50 };
}
