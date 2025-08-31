// netlify/functions/market.js
// Returns sovereign YIELD tenors or CDS(5Y) for US, DE, GB, JP, CA.
// Primary source: worldgovernmentbonds.com (HTML scrape).
//
// Query params:
//   type=yield|cds   (default: yield)
//   country=US|DE|GB|JP|CA  (default: US)
//   h=today|1w|1m    (kept for UI; source is "today")
//   debug=1          (optional debug payload)
//
// Response (yield):
// { asOf:"YYYY-MM-DD", country:"US", tenors:{ "1M":5.35,... }, src:"live|demo", debug? }
// Response (cds):
// { asOf:"YYYY-MM-DD", country:"US", cds5y_bps: 87, src:"live|demo", debug? }

const fetch = require("node-fetch");

// --------------------------------------
// Config
// --------------------------------------
const COUNTRY_SLUG = {
  US: "united-states",
  DE: "germany",
  GB: "united-kingdom",
  JP: "japan",
  CA: "canada",
};

// label aliases per tenor to survive site wording/layout changes
const TENOR_ALIASES = {
  "1M": ["1M", "1 Mo", "1 Month", "1-Month", "1 Monat"],
  "3M": ["3M", "3 Mo", "3 Months", "3-Month", "3 Monate"],
  "6M": ["6M", "6 Mo", "6 Months", "6-Month", "6 Monate"],
  "1Y": ["1Y", "1 Yr", "1 Year", "1-Year", "1 Jahr"],
  "2Y": ["2Y", "2 Yr", "2 Years", "2-Year", "2 Jahre"],
  "5Y": ["5Y", "5 Yr", "5 Years", "5-Year", "5 Jahre"],
  "7Y": ["7Y", "7 Yr", "7 Years", "7-Year", "7 Jahre"],
  "10Y": ["10Y", "10 Yr", "10 Years", "10-Year", "10 Jahre"],
  "20Y": ["20Y", "20 Yr", "20 Years", "20-Year", "20 Jahre"],
  "30Y": ["30Y", "30 Yr", "30 Years", "30-Year", "30 Jahre"],
};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// Demo curve used as safe fallback (same across countries)
const DEMO_TENORS = {
  "1M": 5.35,
  "3M": 5.25,
  "6M": 5.15,
  "1Y": 5.05,
  "2Y": 4.9,
  "5Y": 4.7,
  "7Y": 4.6,
  "10Y": 4.55,
  "20Y": 4.5,
  "30Y": 4.45,
};

// --------------------------------------
// Helpers
// --------------------------------------
const todayISO = () => new Date().toISOString().slice(0, 10);
const isNum = (x) => Number.isFinite(x) && !Number.isNaN(x);

// Find a percent like "4.55%" in a snippet of text
function firstPercent(str) {
  const m = str.match(/(-?\d+(?:[.,]\d+)?)\s*%/);
  return m ? parseFloat(m[1].replace(",", ".")) : null;
}

// Try to find a number near *any* of the provided label aliases
function findNearAliases(html, aliases, opts = {}) {
  const window = opts.window || 320; // characters around label
  const hay = html.replace(/\s+/g, " "); // normalize whitespace a bit
  for (const alias of aliases) {
    const idx = hay.toLowerCase().indexOf(alias.toLowerCase());
    if (idx >= 0) {
      const start = Math.max(0, idx - window);
      const end = Math.min(hay.length, idx + window);
      const snippet = hay.slice(start, end);
      const v = firstPercent(snippet);
      if (isNum(v)) return v;
    }
  }
  return null;
}

// Try a few structural fallbacks that sometimes appear on WGB pages:
// - inline JSON-ish like `"10Y": "4.55%"`
// - table cells with tenor short labels followed by a percent on same row
function structuralFallbacks(html, key) {
  // JSON-ish
  const j1 = new RegExp(`["']${key}["']\\s*[:=]\\s*["']?(-?\\d+(?:[.,]\\d+)?)%?["']?`, "i");
  const m1 = html.match(j1);
  if (m1) return parseFloat(m1[1].replace(",", "."));

  // table-like: key ... number%
  const j2 = new RegExp(`${key}[^%\\d]{0,80}(-?\\d+(?:[.,]\\d+)?)\\s*%`, "i");
  const m2 = html.match(j2);
  if (m2) return parseFloat(m2[1].replace(",", "."));

  return null;
}

function parseYieldsRobust(html, debug) {
  const tenors = {};
  const foundNotes = [];

  for (const code of Object.keys(TENOR_ALIASES)) {
    let v = findNearAliases(html, TENOR_ALIASES[code]);
    if (!isNum(v)) {
      // try structural fallback using the *short* key (e.g., "10Y")
      v = structuralFallbacks(html, code);
      if (isNum(v)) foundNotes.push(`${code}: structural`);
    } else {
      foundNotes.push(`${code}: near-alias`);
    }
    if (isNum(v)) tenors[code] = v;
  }

  const count = Object.keys(tenors).length;
  const ok = count >= 4; // require at least 4 tenors to call it "live"

  if (debug) {
    debug.foundTenors = Object.keys(tenors);
    debug.foundCount = count;
    debug.parseStrategy = foundNotes;
  }

  return { ok, tenors };
}

function parseCds5y(html, debug) {
  // look for patterns around "5Y" / "5 Years" with bp/bps
  const m =
    html.match(/5\s*Years?[^]{0,120}?(-?\d+(?:[.,]\d+)?)\s*bps?/i) ||
    html.match(/5Y[^]{0,120}?(-?\d+(?:[.,]\d+)?)\s*bps?/i);
  if (!m) return { ok: false, bps: null };
  const v = parseFloat(m[1].replace(",", "."));
  if (debug) debug.cdsParse = `matched:${m[0].slice(0, 80)}…`;
  return { ok: isNum(v), bps: v };
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
      Referer: "https://www.google.com/",
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

// --------------------------------------
// Main handler
// --------------------------------------
exports.handler = async (event) => {
  const qs = event.queryStringParameters || {};
  const type = (qs.type || "yield").toLowerCase();
  const country = (qs.country || "US").toUpperCase();
  const h = (qs.h || "today").toLowerCase();
  const debugWanted = !!qs.debug;

  const debug = { type, country, h, notes: [] };

  try {
    if (!COUNTRY_SLUG[country]) {
      throw new Error(`Unsupported country "${country}"`);
    }

    if (type === "yield") {
      const slug = COUNTRY_SLUG[country];
      const url = `https://www.worldgovernmentbonds.com/country/${slug}/`;
      debug.url = url;

      const html = await fetchHtml(url);
      if (debugWanted) debug.htmlSample = html.slice(0, 800);

      const parsed = parseYieldsRobust(html, debugWanted ? debug : null);

      if (!parsed.ok) {
        debug.notes.push("Yield parse incomplete; fallback to demo");
        return json200(
          {
            asOf: todayISO(),
            country,
            tenors: DEMO_TENORS,
            src: "demo",
            debug: debugWanted ? debug : undefined,
          }
        );
      }

      return json200({
        asOf: todayISO(),
        country,
        tenors: parsed.tenors,
        src: "live",
        debug: debugWanted ? debug : undefined,
      });
    }

    if (type === "cds") {
      const slug = COUNTRY_SLUG[country];
      const url = `https://www.worldgovernmentbonds.com/cds-historical-data/${slug}/`;
      debug.url = url;

      const html = await fetchHtml(url);
      if (debugWanted) debug.htmlSample = html.slice(0, 800);

      const parsed = parseCds5y(html, debugWanted ? debug : null);

      if (!parsed.ok) {
        debug.notes.push("CDS parse failed; fallback demo 100bps");
        return json200({
          asOf: todayISO(),
          country,
          cds5y_bps: 100,
          src: "demo",
          debug: debugWanted ? debug : undefined,
        });
      }

      return json200({
        asOf: todayISO(),
        country,
        cds5y_bps: parsed.bps,
        src: "live",
        debug: debugWanted ? debug : undefined,
      });
    }

    return json(400, { error: `Unsupported type "${type}"` });
  } catch (err) {
    debug.notes.push(`Error: ${err.message}`);
    return json200({
      asOf: todayISO(),
      country,
      ...(type === "cds" ? { cds5y_bps: 100 } : { tenors: DEMO_TENORS }),
      src: "demo",
      debug: debugWanted ? debug : undefined,
    });
  }
};

// --------------------------------------
// Response helpers (CORS friendly)
// --------------------------------------
function json200(obj) {
  return json(200, obj);
}
function json(statusCode, obj) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(obj),
  };
}
