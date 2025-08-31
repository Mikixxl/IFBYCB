// netlify/functions/market.js
// Returns sovereign YIELD tenors or CDS(5Y) for US, DE, GB, JP, CA.
// Primary source: worldgovernmentbonds.com (HTML scrape).
//
// Query:
//   type=yield|cds        (default yield)
//   country=US|DE|GB|JP|CA (default US)
//   h=today|1w|1m         (kept for UI; source is "today")
//   debug=1               (optional: include parser notes/sample)
//
// Response (yield):
// { asOf:"YYYY-MM-DD", country:"US", tenors:{ "1M":5.35,... }, src:"live|demo", debug?:{...} }
//
// Response (cds):
// { asOf:"YYYY-MM-DD", country:"US", cds5y_bps: 87, src:"live|demo", debug?:{...} }

const fetch = require("node-fetch");

let cheerio = null;
// Cheerio is optional: we try to use it if installed. If not, we still work via regex fallback.
try {
  cheerio = require("cheerio");
} catch (e) {
  // leave cheerio = null
}

// ------------------------
// Config
// ------------------------
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

// Safe demo curve (used if live scrape fails)
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

// ------------------------
// Helpers
// ------------------------
const todayISO = () => new Date().toISOString().slice(0, 10);
const isNum = (x) => Number.isFinite(x) && !Number.isNaN(x);

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

// --- generic “nearest %” regex finder around a label (fallback if no Cheerio)
function findNearestPercent(html, label) {
  const i = html.toLowerCase().indexOf(label.toLowerCase());
  if (i < 0) return null;
  const WINDOW = 400; // broadened window for safety
  const start = Math.max(0, i - WINDOW);
  const end = Math.min(html.length, i + WINDOW);
  const snippet = html.slice(start, end);

  // Allow % with tags in between; also catch "p.a." patterns
  const m =
    snippet.match(/(\d+(?:[.,]\d+)?)\s*%/i) ||
    snippet.match(/(\d+(?:[.,]\d+)?)\s*p\.?\s*a\.?/i);
  if (!m) return null;
  return parseFloat(m[1].replace(",", "."));
}

// --- Cheerio-based row/neighbor search for a label’s number
function findByLabelCheerio($, label, debug) {
  // Heuristic: find any node that contains the label (case-insensitive),
  // then look in the same row/cell or immediate siblings for a number with %.
  const matches = [];
  $("*").each((_, el) => {
    const t = $(el).text().trim();
    if (!t) return;
    if (t.toLowerCase().includes(label.toLowerCase())) matches.push(el);
  });

  for (const el of matches) {
    // 1) If inside a table row: harvest text of the row
    const tr = $(el).closest("tr");
    if (tr.length) {
      const rowText = tr.text();
      const v =
        extractPercent(rowText) ?? extractPa(rowText) ?? extractBareNumber(rowText);
      if (isNum(v)) {
        debug && debug.notes.push(`Cheerio row hit for "${label}": ${v}`);
        return v;
      }
      // Try next cells explicitly
      const cells = tr.find("td,th").toArray().map((c) => $(c).text());
      for (const c of cells) {
        const vv = extractPercent(c) ?? extractPa(c) ?? extractBareNumber(c);
        if (isNum(vv)) {
          debug && debug.notes.push(`Cheerio cell hit for "${label}": ${vv}`);
          return vv;
        }
      }
    }
    // 2) Otherwise: use immediate parent’s text block
    const block = $(el).parent().text();
    const v =
      extractPercent(block) ?? extractPa(block) ?? extractBareNumber(block);
    if (isNum(v)) {
      debug && debug.notes.push(`Cheerio parent block hit for "${label}": ${v}`);
      return v;
    }
  }

  return null;
}

const extractPercent = (s) => {
  const m = String(s).match(/(\d+(?:[.,]\d+)?)\s*%/i);
  return m ? parseFloat(m[1].replace(",", ".")) : null;
};
const extractPa = (s) => {
  const m = String(s).match(/(\d+(?:[.,]\d+)?)\s*p\.?\s*a\.?/i);
  return m ? parseFloat(m[1].replace(",", ".")) : null;
};
// Last-ditch: number possibly separated by tags (no %/p.a. around)
const extractBareNumber = (s) => {
  const m = String(s).match(/(\d+(?:[.,]\d+)?)/);
  return m ? parseFloat(m[1].replace(",", ".")) : null;
};

function parseWGBYields(html, debug) {
  const tenors = {};
  if (cheerio) {
    const $ = cheerio.load(html);
    for (const [code, lbl] of Object.entries(TENOR_LABEL)) {
      const v = findByLabelCheerio($, lbl, debug);
      if (isNum(v)) tenors[code] = v;
    }
  } else {
    // fallback: regex window around labels
    for (const [code, lbl] of Object.entries(TENOR_LABEL)) {
      const v = findNearestPercent(html, lbl);
      if (isNum(v)) tenors[code] = v;
    }
  }
  const ok = Object.keys(tenors).length >= 4; // consider success if ≥4 points
  return { ok, tenors };
}

function parseWGBcds5y(html) {
  // look around “5Y” / “5 Years CDS … bp”
  const m =
    html.match(/5\s*Years?[^]{0,120}?(\d+(?:[.,]\d+)?)\s*bp/i) ||
    html.match(/5Y[^]{0,120}?(\d+(?:[.,]\d+)?)\s*bp/i);
  if (!m) return { ok: false, bps: null };
  const v = parseFloat(m[1].replace(",", "."));
  return { ok: isNum(v), bps: v };
}

// ------------------------
// HTTP JSON helper
// ------------------------
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

// ------------------------
// Handler
// ------------------------
exports.handler = async (event) => {
  const type = (event.queryStringParameters?.type || "yield").toLowerCase();
  const country = (event.queryStringParameters?.country || "US").toUpperCase();
  const h = (event.queryStringParameters?.h || "today").toLowerCase();
  const debugWanted = !!event.queryStringParameters?.debug;

  const debug = { type, country, h, notes: [] };

  try {
    if (!COUNTRY_SLUG[country]) {
      return okJson({ error: `Unsupported country "${country}"` }, 400);
    }

    if (type === "yield") {
      const slug = COUNTRY_SLUG[country];
      const url = `https://www.worldgovernmentbonds.com/country/${slug}/`;
      debug.url = url;

      const html = await getHtml(url);
      if (debugWanted) debug.htmlSample = html.slice(0, 1000);

      const parsed = parseWGBYields(html, debugWanted ? debug : null);
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
      if (debugWanted) debug.htmlSample = html.slice(0, 1000);

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
