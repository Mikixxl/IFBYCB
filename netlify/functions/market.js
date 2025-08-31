// netlify/functions/market.js
// Returns sovereign YIELD tenors or CDS(5Y) for US, DE, GB, JP, CA
// Primary source: worldgovernmentbonds.com (HTML scrape)
//
// Query:
//   type=yield|cds        (default: yield)
//   country=US|DE|GB|JP|CA (default: US)
//   h=today|1w|1m          (kept for UI compatibility; source is "today")
//   debug=1                (optional diagnostics in response)
//
// Response (yield):
//   { asOf:"YYYY-MM-DD", country:"US", tenors:{ "1M":5.35,... }, src:"live|demo", debug?:{...} }
//
// Response (cds):
//   { asOf:"YYYY-MM-DD", country:"US", cds5y_bps: 87, src:"live|demo", debug?:{...} }

const fetch = require("node-fetch");

// ---------------------------
// Config
// ---------------------------
const COUNTRY_SLUG = {
  US: "united-states",
  DE: "germany",
  GB: "united-kingdom",
  JP: "japan",
  CA: "canada",
};

// label patterns we will accept for each tenor (language/format agnostic)
const TENOR_PATTERNS = {
  "1M": [/1\s*month/i, /\b1m\b/i, /1\s*monat/i],
  "3M": [/3\s*months?/i, /\b3m\b/i, /3\s*monate?/i],
  "6M": [/6\s*months?/i, /\b6m\b/i, /6\s*monate?/i],
  "1Y": [/1\s*year/i, /\b1y\b/i, /1\s*jahr/i],
  "2Y": [/2\s*years?/i, /\b2y\b/i, /2\s*jahre?/i],
  "5Y": [/5\s*years?/i, /\b5y\b/i, /5\s*jahre?/i],
  "7Y": [/7\s*years?/i, /\b7y\b/i, /7\s*jahre?/i],
  "10Y": [/10\s*years?/i, /\b10y\b/i, /10\s*jahre?/i],
  "20Y": [/20\s*years?/i, /\b20y\b/i, /20\s*jahre?/i],
  "30Y": [/30\s*years?/i, /\b30y\b/i, /30\s*jahre?/i],
};

// demo curve as hard fallback
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

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// ---------------------------
// Helpers
// ---------------------------
const todayISO = () => new Date().toISOString().slice(0, 10);
const num = (x) => {
  const v = parseFloat(String(x).replace(",", "."));
  return Number.isFinite(v) ? v : null;
};

// grab HTML safely
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

// search the HTML for a label pattern and then the nearest percentage value
function findPercentNear(html, regex) {
  const m = html.match(regex);
  if (!m) return null;
  const idx = m.index ?? html.search(regex);
  if (idx < 0) return null;

  // scan a window around the label for something like "4.55 %" or "4,55%"
  const win = 300;
  const start = Math.max(0, idx - win);
  const end = Math.min(html.length, idx + win);
  const snippet = html.slice(start, end);

  const p = snippet.match(/(\d+(?:[.,]\d+)?)\s*%/);
  return p ? num(p[1]) : null;
}

// table-aware parser as primary approach; falls back to label-near-value search
function parseYieldsRobust(html, debug) {
  const out = {};

  // --- A) Try table rows like: <tr> <td>10 Years</td> <td>2.45 %</td> ... </tr>
  // Very permissive: label cell followed by value (with %). Works across languages.
  const rowRegex =
    /<tr[^>]*>\s*<t[hd][^>]*>(.*?)<\/t[hd]>\s*<t[hd][^>]*>(.*?)<\/t[hd]>/gims;
  let rowMatch;
  const rowHits = [];

  while ((rowMatch = rowRegex.exec(html))) {
    const labelCell = rowMatch[1].replace(/<[^>]+>/g, " ").toLowerCase();
    const valCell = rowMatch[2].replace(/<[^>]+>/g, " ");

    // try to map this row to a tenor code using our patterns
    for (const [code, patterns] of Object.entries(TENOR_PATTERNS)) {
      if (patterns.some((re) => re.test(labelCell))) {
        const p = valCell.match(/(\d+(?:[.,]\d+)?)\s*%/);
        if (p) {
          const v = num(p[1]);
          if (v != null) {
            out[code] = v;
            rowHits.push(`${code}:${v}`);
          }
        }
      }
    }
  }

  if (debug && rowHits.length) debug.notes.push(`tableRows: ${rowHits.join(", ")}`);

  // --- B) For any tenor still missing, search label anywhere and read nearby value
  for (const [code, patterns] of Object.entries(TENOR_PATTERNS)) {
    if (out[code] != null) continue;
    for (const re of patterns) {
      const v = findPercentNear(html, re);
      if (v != null) {
        out[code] = v;
        if (debug) debug.notes.push(`nearby(${code}) ok via ${re}`);
        break;
      }
    }
  }

  const found = Object.keys(out).length;
  return { ok: found >= 6, tenors: out, found };
}

function parseCDS5Y(html) {
  // match "... 5Y ... 87 bp(s)" OR "... 5 Years ... 87 bp(s)"
  const m =
    html.match(/5\s*Years?[^]{0,120}?(\d+(?:[.,]\d+)?)\s*bps?\b/i) ||
    html.match(/\b5Y\b[^]{0,120}?(\d+(?:[.,]\d+)?)\s*bps?\b/i);
  const v = m ? num(m[1]) : null;
  return { ok: v != null, bps: v ?? null };
}

// ---------------------------
// Main handler
// ---------------------------
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
      if (debugWanted) debug.htmlSample = html.slice(0, 800);

      const parsed = parseYieldsRobust(html, debugWanted ? debug : null);
      if (!parsed.ok) {
        debug.notes.push(`yield parse incomplete (found=${parsed.found}); fallback demo`);
        return okJson(
          {
            asOf: todayISO(),
            country,
            tenors: { ...DEMO_TENORS },
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
      if (debugWanted) debug.htmlSample = html.slice(0, 800);

      const parsed = parseCDS5Y(html);
      if (!parsed.ok) {
        debug.notes.push("cds parse failed; fallback 100bps");
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
    debug.notes.push(`error: ${err.message}`);
    return okJson(
      {
        asOf: todayISO(),
        country,
        ...(type === "cds" ? { cds5y_bps: 100 } : { tenors: { ...DEMO_TENORS } }),
        src: "demo",
        debug: debugWanted ? debug : undefined,
      },
      200
    );
  }
};

// ---------------------------
// Response helper (CORS)
// ---------------------------
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
