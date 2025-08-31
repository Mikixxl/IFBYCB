// netlify/functions/market.js
// Serverless function that returns sovereign YIELD tenors or CDS(5Y) for
// US, DE, GB, JP, CA. Primary source: worldgovernmentbonds.com (HTML scrape).
//
// Query params:
//   type=yield|cds   (default yield)
//   country=US|DE|GB|JP|CA  (default US)
//   h=today|1w|1m    (kept for UI compatibility; source is "today")
//   debug=1          (optional: include scrape URLs and parser notes)
//
// Response for type=yield:
// { asOf:"YYYY-MM-DD", country:"US", tenors:{ "1M":5.35,... }, src:"live|demo", debug?:{...} }
//
// Response for type=cds:
// { asOf:"YYYY-MM-DD", country:"US", cds5y_bps: 87, src:"live|demo", debug?:{...} }

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

const TENOR_LABEL = {
  "1M": "1 Month",
  "3M": "3 Months",
  "6M": "6 Months",
  "1Y": "1 Year",
  "2Y": "2 Years",
  "5Y": "5 Years",
  "7Y": "7 Years",
  "10Y": "10 Years",
  "20Y": "20 Years",
  "30Y": "30 Years",
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
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function notEmptyNumber(x) {
  return Number.isFinite(x) && !Number.isNaN(x);
}

// find nearest number like "4.55 %" near a label inside HTML
function findNearestPercent(html, label) {
  const i = html.toLowerCase().indexOf(label.toLowerCase());
  if (i < 0) return null;
  const window = 220; // characters to scan around the label
  const start = Math.max(0, i - window);
  const end = Math.min(html.length, i + window);
  const snippet = html.slice(start, end);
  const m = snippet.match(/(\d+(?:[.,]\d+)?)\s*%/); // first percentage near the label
  if (!m) return null;
  return parseFloat(m[1].replace(",", "."));
}

function parseWGBYields(html) {
  const tenors = {};
  Object.entries(TENOR_LABEL).forEach(([code, lbl]) => {
    const v = findNearestPercent(html, lbl);
    if (notEmptyNumber(v)) tenors[code] = v;
  });
  // consider success if we found at least 4 tenors
  const ok = Object.keys(tenors).length >= 4;
  return { ok, tenors };
}

function parseWGBcds5y(html) {
  // look for patterns around "5Y" or "5 Years CDS" with "bp"/"bps"
  const m =
    html.match(/5\s*Years?[^]{0,80}?(\d+(?:[.,]\d+)?)\s*bp/i) ||
    html.match(/5Y[^]{0,80}?(\d+(?:[.,]\d+)?)\s*bp/i);
  if (!m) return { ok: false, bps: null };
  const v = parseFloat(m[1].replace(",", "."));
  return { ok: notEmptyNumber(v), bps: v };
}

async function getHtml(url) {
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
  const type = (event.queryStringParameters?.type || "yield").toLowerCase();
  const country = (event.queryStringParameters?.country || "US").toUpperCase();
  const h = (event.queryStringParameters?.h || "today").toLowerCase();
  const debugWanted = !!event.queryStringParameters?.debug;

  const debug = { type, country, h, notes: [] };

  try {
    if (!COUNTRY_SLUG[country]) {
      throw new Error(`Unsupported country "${country}"`);
    }

    if (type === "yield") {
      const slug = COUNTRY_SLUG[country];
      const url = `https://www.worldgovernmentbonds.com/country/${slug}/`;
      debug.url = url;

      const html = await getHtml(url);
      debug.htmlSample = debugWanted ? html.slice(0, 600) : undefined;

      const parsed = parseWGBYields(html);
      if (!parsed.ok) {
        debug.notes.push("Yield parse incomplete; fallback to demo");
        return okJson(
          {
            asOf: todayISO(),
            country,
            tenors: DEMO_TENORS,
            src: "demo",
            debug: debugWanted ? debug : undefined,
          },
          200
        );
      }

      return okJson(
        {
          asOf: todayISO(),
          country,
          tenors: parsed.tenors,
          src: "live",
          debug: debugWanted ? debug : undefined,
        },
        200
      );
    }

    if (type === "cds") {
      const slug = COUNTRY_SLUG[country];
      const url = `https://www.worldgovernmentbonds.com/cds-historical-data/${slug}/`;
      debug.url = url;

      const html = await getHtml(url);
      debug.htmlSample = debugWanted ? html.slice(0, 600) : undefined;

      const parsed = parseWGBcds5y(html);
      if (!parsed.ok) {
        debug.notes.push("CDS parse failed; fallback demo 100bps");
        return okJson(
          {
            asOf: todayISO(),
            country,
            cds5y_bps: 100,
            src: "demo",
            debug: debugWanted ? debug : undefined,
          },
          200
        );
      }

      return okJson(
        {
          asOf: todayISO(),
          country,
          cds5y_bps: parsed.bps,
          src: "live",
          debug: debugWanted ? debug : undefined,
        },
        200
      );
    }

    return okJson({ error: `Unsupported type "${type}"` }, 400);
  } catch (err) {
    // Hard fallback with clear signal
    debug.notes.push(`Error: ${err.message}`);
    return okJson(
      {
        asOf: todayISO(),
        country,
        ...(type === "cds"
          ? { cds5y_bps: 100 }
          : { tenors: DEMO_TENORS }),
        src: "demo",
        debug: debugWanted ? debug : undefined,
      },
      200
    );
  }
};

// --------------------------------------
// Response helper (CORS friendly)
// --------------------------------------
function okJson(obj, statusCode = 200) {
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
