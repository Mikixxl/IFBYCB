// netlify/functions/market.js
// Sovereign yields & CDS(5Y) via HTML scraping from worldgovernmentbonds.com
// Query: ?type=yield|cds&country=US|DE|GB|JP|CA&h=today|1w|1m&debug=1

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

// mögliche Schreibweisen pro Tenor (inkl. engl./dt. Varianten)
const TENOR_VARIANTS = {
  "1M": ["1M", "1 M", "1 Month", "1 Mo", "1 Monat", "1 Monat"],
  "3M": ["3M", "3 M", "3 Months", "3 Mos", "3 Monate", "3 Monate"],
  "6M": ["6M", "6 M", "6 Months", "6 Mos", "6 Monate", "6 Monate"],
  "1Y": ["1Y", "1 Y", "1 Year", "1 Yr", "1 Jahr", "1 Jahr"],
  "2Y": ["2Y", "2 Y", "2 Years", "2 Yrs", "2 Jahre", "2 Jahre"],
  "5Y": ["5Y", "5 Y", "5 Years", "5 Yrs", "5 Jahre", "5 Jahre"],
  "7Y": ["7Y", "7 Y", "7 Years", "7 Yrs", "7 Jahre", "7 Jahre"],
  "10Y": ["10Y", "10 Y", "10 Years", "10 Yrs", "10 Jahre", "10 Jahre"],
  "20Y": ["20Y", "20 Y", "20 Years", "20 Yrs", "20 Jahre", "20 Jahre"],
  "30Y": ["30Y", "30 Y", "30 Years", "30 Yrs", "30 Jahre", "30 Jahre"],
};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// Demo curve (sicherer Fallback)
const DEMO_TENORS = {
  "1M": 5.35, "3M": 5.25, "6M": 5.15, "1Y": 5.05,
  "2Y": 4.90, "5Y": 4.70, "7Y": 4.60, "10Y": 4.55,
  "20Y": 4.50, "30Y": 4.45,
};

// ---------------------------
// Helpers
// ---------------------------
const todayISO = () => new Date().toISOString().slice(0, 10);
const numOk = (x) => Number.isFinite(x) && !Number.isNaN(x);

function normalize(s) {
  return s
    .replace(/\s+/g, " ")
    .replace(/[^\S\r\n]/g, " ") // no-break spaces
    .toLowerCase();
}

// findet Zahl in % in der Nähe eines Labels (vor ODER nach dem Label)
function numberNear(html, label, window = 360) {
  const L = normalize(label);
  const H = normalize(html);

  const idx = H.indexOf(L);
  if (idx < 0) return null;

  const start = Math.max(0, idx - window);
  const end = Math.min(H.length, idx + L.length + window);
  const region = H.slice(start, end);

  // Prozentwert z. B. 4.55% oder 4,55 %
  const m = region.match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (!m) return null;
  return parseFloat(m[1].replace(",", "."));
}

// Muster wie: >1M< … >5.35%<
function numberInTablePattern(html, label, window = 480) {
  const H = html;
  // sehr tolerantes Muster: Label in einem Tag, dann innerhalb von N Zeichen eine Prozentzahl
  const safeLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `>${safeLabel}<[^]{0,${window}}?(\\d+(?:[.,]\\d+)?)\\s*%`,
    "i"
  );
  const m = H.match(re);
  if (!m) return null;
  return parseFloat(m[1].replace(",", "."));
}

// robuster Parser: probiert Varianten + zwei Suchmethoden
function parseYieldsRobust(html, debug) {
  const tenors = {};
  const notes = [];

  for (const [code, labels] of Object.entries(TENOR_VARIANTS)) {
    let val = null;

    // 1) table-artiges Muster
    for (const lbl of labels) {
      val = numberInTablePattern(html, lbl);
      if (numOk(val)) { notes.push(`${code}: table-match "${lbl}" => ${val}`); break; }
    }

    // 2) Nähe-Suche
    if (!numOk(val)) {
      for (const lbl of labels) {
        val = numberNear(html, lbl);
        if (numOk(val)) { notes.push(`${code}: near "${lbl}" => ${val}`); break; }
      }
    }

    if (numOk(val)) tenors[code] = val;
  }

  const found = Object.keys(tenors).length;
  const ok = found >= 4; // mind. 4 Tenors, sonst zu unsicher
  if (debug) debug.notes.push(`yields found: ${found}`);

  return { ok, tenors, notes };
}

function parseCds5y(html, debug) {
  // Suche 5Y + bp/bps (auch mit etwas Abstand)
  const m =
    html.match(/5\s*years?[^]{0,100}?(\d+(?:[.,]\d+)?)\s*bp/i) ||
    html.match(/5y[^]{0,100}?(\d+(?:[.,]\d+)?)\s*bp/i);
  if (!m) return { ok: false, bps: null };
  const v = parseFloat(m[1].replace(",", "."));
  if (debug) debug.notes.push(`cds5y => ${v} bps`);
  return { ok: numOk(v), bps: v };
}

async function getHtml(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9,de;q=0.8",
      "Referer": "https://www.google.com/",
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

// ---------------------------
// Handler
// ---------------------------
exports.handler = async (event) => {
  const type = (event.queryStringParameters?.type || "yield").toLowerCase();
  const country = (event.queryStringParameters?.country || "US").toUpperCase();
  const h = (event.queryStringParameters?.h || "today").toLowerCase();
  const wantDebug = !!event.queryStringParameters?.debug;

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
      if (wantDebug) debug.htmlSample = html.slice(0, 800);

      const parsed = parseYieldsRobust(html, debug);
      if (!parsed.ok) {
        debug.notes.push("Yield parse incomplete; fallback demo");
        return okJson({
          asOf: todayISO(),
          country,
          tenors: DEMO_TENORS,
          src: "demo",
          debug: wantDebug ? debug : undefined,
        });
      }

      return okJson({
        asOf: todayISO(),
        country,
        tenors: parsed.tenors,
        src: "live",
        debug: wantDebug ? { ...debug, parserNotes: parsed.notes } : undefined,
      });
    }

    if (type === "cds") {
      const slug = COUNTRY_SLUG[country];
      const url = `https://www.worldgovernmentbonds.com/cds-historical-data/${slug}/`;
      debug.url = url;

      const html = await getHtml(url);
      if (wantDebug) debug.htmlSample = html.slice(0, 800);

      const parsed = parseCds5y(html, debug);
      if (!parsed.ok) {
        debug.notes.push("CDS parse failed; fallback demo 100 bps");
        return okJson({
          asOf: todayISO(),
          country,
          cds5y_bps: 100,
          src: "demo",
          debug: wantDebug ? debug : undefined,
        });
      }

      return okJson({
        asOf: todayISO(),
        country,
        cds5y_bps: parsed.bps,
        src: "live",
        debug: wantDebug ? debug : undefined,
      });
    }

    return okJson({ error: `Unsupported type "${type}"` }, 400);
  } catch (err) {
    debug.notes.push(`Error: ${err.message}`);
    return okJson({
      asOf: todayISO(),
      country,
      ...(type === "cds" ? { cds5y_bps: 100 } : { tenors: DEMO_TENORS }),
      src: "demo",
      debug: wantDebug ? debug : undefined,
    });
  }
};

// ---------------------------
// Response helper
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
