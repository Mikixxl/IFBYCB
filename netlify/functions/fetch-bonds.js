// fetch-bonds.js
// Netlify Scheduled Function — 06:00 UTC daily.
//
// Data sources for yield curves (live only — no demo fallback for curves):
//   US   → FRED API (process.env.FRED_API_KEY, free at fred.stlouisfed.org)
//            fallback: WGB per-country scraping
//   DE   → ECB SDMX API (no key, issuer: European Central Bank)
//            fallback: WGB per-country scraping
//   GB  → Bank of England gilt par yields (no key needed)
//            fallback: WGB per-country scraping
//   CA  → Bank of Canada Valet API (no key needed)
//            fallback: WGB per-country scraping
//   JP  → Japan MoF JGB benchmark CSV (no key needed)
//            fallback: WGB per-country scraping
//   FR, IT, CN → WGB per-country scraping
//
// Central bank rates:
//   US   → FRED (FEDFUNDS series, if key set)  fallback: WGB cb-rates page
//   EU   → ECB SDMX (deposit facility rate, no key needed)
//   UK, CA, JP, CN, AU, NZ, CH, SE, NO → WGB central-bank-rates/ page
//
// Bonds table (35 countries, 10Y only):
//   curve 10Y → FRED OECD (24 countries) → IMF IFS FIGB_PA → WGB → demo
//
// Stored blobs in "bonds-cache":
//   "latest"        → bonds table
//   "yield-curves"  → ONLY countries where live data was obtained
//   "cb-rates"      → current central bank policy rates

const fetch   = require("node-fetch");
const cheerio = require("cheerio");
const { getStore } = require("@netlify/blobs");

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
           "(KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36";
const todayISO = () => new Date().toISOString().slice(0, 10);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── HTTP helpers ─────────────────────────────────────────────────────────────
async function getHtml(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":              UA,
      "Accept":                  "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language":         "en-US,en;q=0.9",
      "Accept-Encoding":         "gzip, deflate, br",
      "Cache-Control":           "no-cache",
      "Pragma":                  "no-cache",
      "Referer":                 "https://www.google.com/",
      "sec-ch-ua":               '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
      "sec-ch-ua-mobile":        "?0",
      "sec-ch-ua-platform":      '"Windows"',
      "sec-fetch-dest":          "document",
      "sec-fetch-mode":          "navigate",
      "sec-fetch-site":          "cross-site",
      "sec-fetch-user":          "?1",
      "upgrade-insecure-requests": "1",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function getJson(url, extraHeaders = {}) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json", ...extraHeaders },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ─── WGB scraper: full tenor curve ───────────────────────────────────────────
const TENOR_LABEL = {
  "1M":"1 Month","3M":"3 Months","6M":"6 Months","1Y":"1 Year",
  "2Y":"2 Years","5Y":"5 Years","7Y":"7 Years","10Y":"10 Years",
  "20Y":"20 Years","30Y":"30 Years",
};

async function scrapeWGBCurve(slug) {
  const html = await getHtml(`https://www.worldgovernmentbonds.com/country/${slug}/`);
  // Detect Cloudflare JS challenge / bot-block pages
  if (
    html.includes("cf-browser-verification") ||
    html.includes("Just a moment") ||
    html.includes("Enable JavaScript and cookies to continue") ||
    html.includes("Checking if the site connection is secure")
  ) {
    throw new Error("Cloudflare challenge page");
  }
  const $ = cheerio.load(html);
  const tenors = {};

  // Helper: try to parse a row — first cell must be a tenor label, second a yield number
  const tryRow = (row) => {
    const cells = $(row).find("td");
    if (cells.length < 2) return;
    const label = $(cells[0]).text().trim();
    const code  = Object.keys(TENOR_LABEL).find(
      k => TENOR_LABEL[k].toLowerCase() === label.toLowerCase()
    );
    if (code && !tenors[code]) {
      const m = $(cells[1]).text().trim().match(/(\d+[.,]\d+)/);
      if (m) tenors[code] = parseFloat(m[1].replace(",", "."));
    }
  };

  // Selector A: standard tbody rows
  $("table tbody tr").each((_, row) => tryRow(row));

  // Selector B: tables without explicit tbody (browser adds one, but raw HTML may not)
  if (Object.keys(tenors).length < 4) {
    $("table tr").each((_, row) => tryRow(row));
  }

  const count = Object.keys(tenors).length;
  if (count < 4) {
    // Log page start to diagnose structural changes (e.g. WGB redesign)
    console.warn(`WGB ${slug}: ${count} tenors — HTML start: ${html.replace(/\s+/g, " ").slice(0, 300)}`);
    return null;
  }
  return tenors;
}

async function scrapeWGB10Y(slug) {
  const curve = await scrapeWGBCurve(slug).catch(e => {
    console.warn(`[fetch-bonds] WGB ${slug}: ${e.message}`);
    return null;
  });
  return curve?.["10Y"] ?? null;
}

// ─── FRED API (US Treasury yields + Fed Funds rate) ───────────────────────────
// Free API key: https://fred.stlouisfed.org/docs/api/api_key.html
// Set as FRED_API_KEY in your Netlify site environment variables.
const FRED_YIELD_SERIES = {
  "1M":"DGS1MO","3M":"DGS3MO","6M":"DGS6MO","1Y":"DGS1",
  "2Y":"DGS2","5Y":"DGS5","7Y":"DGS7","10Y":"DGS10","20Y":"DGS20","30Y":"DGS30",
};

// OECD monthly 10Y government bond yields via FRED — used as secondary source
// for the bonds table when yield-curve APIs and WGB scraping are both unavailable.
// Skip US/DE/CA/JP — those are covered by primary curve APIs.
const FRED_COUNTRY_10Y = {
  GB:"IRLTLT01GBM156N", FR:"IRLTLT01FRM156N", IT:"IRLTLT01ITM156N",
  ES:"IRLTLT01ESM156N", AU:"IRLTLT01AUM156N", NZ:"IRLTLT01NZM156N",
  KR:"IRLTLT01KRM156N", SE:"IRLTLT01SEM156N", NO:"IRLTLT01NOM156N",
  CH:"IRLTLT01CHM156N", PL:"IRLTLT01PLM156N", CZ:"IRLTLT01CZM156N",
  HU:"IRLTLT01HUM156N", MX:"IRLTLT01MXM156N", IL:"IRLTLT01ILM156N",
  ZA:"IRLTLT01ZAM156N", BR:"IRLTLT01BRM156N", TR:"IRLTLT01TRM156N",
  IN:"IRLTLT01INM156N",
  // Eurozone — all OECD members with OECD Main Economic Indicators series in FRED
  NL:"IRLTLT01NLM156N", AT:"IRLTLT01ATM156N", BE:"IRLTLT01BEM156N",
  PT:"IRLTLT01PTM156N", GR:"IRLTLT01GRM156N",
  // OECD Key Partner / non-member series also published in FRED
  CN:"IRLTLT01CNM156N",
};

async function fetchFredCountryYields(apiKey) {
  if (!apiKey) return {};
  const results = {};
  await Promise.allSettled(
    Object.entries(FRED_COUNTRY_10Y).map(async ([code, sid]) => {
      const val = await fredLatest(sid, apiKey).catch(() => null);
      if (val !== null) results[code] = val;
    })
  );
  return results;
}

async function fredLatest(seriesId, apiKey) {
  // limit=120 (10 years) covers series with long publication lags or infrequent updates
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&limit=120&sort_order=desc&api_key=${apiKey}&file_type=json`;
  const data = await getJson(url);
  for (const obs of data.observations ?? []) {
    if (obs.value !== "." && obs.value !== "N/A") return parseFloat(obs.value);
  }
  return null;
}

async function fetchUSCurveFRED(apiKey) {
  const settled = await Promise.allSettled(
    Object.entries(FRED_YIELD_SERIES).map(async ([tenor, sid]) => ({
      tenor, value: await fredLatest(sid, apiKey),
    }))
  );
  const tenors = {};
  for (const r of settled) {
    if (r.status === "fulfilled" && r.value.value != null) tenors[r.value.tenor] = r.value.value;
  }
  return Object.keys(tenors).length >= 6 ? tenors : null;
}

async function fetchFedFundsRate(apiKey) {
  return fredLatest("FEDFUNDS", apiKey);
}

// ─── ECB SDMX API (Eurozone AAA yield curve + deposit facility rate) ──────────
// No key required. Issued by the European Central Bank.
const ECB_MATURITIES = {
  "3M":"SR_3M","6M":"SR_6M","1Y":"SR_1Y","2Y":"SR_2Y",
  "5Y":"SR_5Y","7Y":"SR_7Y","10Y":"SR_10Y","20Y":"SR_20Y","30Y":"SR_30Y",
};

function parseEcbValue(json) {
  try {
    const series = Object.values(json.dataSets[0].series)[0];
    const keys   = Object.keys(series.observations);
    const val    = series.observations[keys[keys.length - 1]][0];
    return Number.isFinite(val) ? val : null;
  } catch { return null; }
}

async function fetchECBCurve() {
  const settled = await Promise.allSettled(
    Object.entries(ECB_MATURITIES).map(async ([tenor, mat]) => ({
      tenor,
      value: parseEcbValue(
        await getJson(
          `https://data-api.ecb.europa.eu/service/data/YC/B.U2.EUR.4F.G_N_A.SV_C_YM.${mat}?lastNObservations=5&format=jsondata`
        )
      ),
    }))
  );
  const tenors = {};
  for (const r of settled) {
    if (r.status === "fulfilled" && r.value.value != null) tenors[r.value.tenor] = r.value.value;
  }
  // ECB does not publish 1M — that's expected; require ≥5 other tenors
  return Object.keys(tenors).length >= 5 ? tenors : null;
}

async function fetchECBRate() {
  const json = await getJson(
    "https://data-api.ecb.europa.eu/service/data/FM/B.U2.EUR.4F.KR.DFR.LEV?lastNObservations=5&format=jsondata"
  );
  return parseEcbValue(json);
}

// ─── IMF IFS Government Bond Yields ──────────────────────────────────────────
// Free, no key.  FIGB_PA = Government Securities: Yields (Long-Term / 10Y).
// Covers all IMF member countries — used as fallback for the bonds table for
// emerging-market countries not available via FRED OECD.
// One batched request covers all target countries.
function parseImfIfsSeries(series) {
  try {
    const obs = series.Obs ?? [];
    const arr = Array.isArray(obs) ? obs : [obs];
    for (let i = arr.length - 1; i >= 0; i--) {
      const v = parseFloat(arr[i]["@OBS_VALUE"]);
      if (Number.isFinite(v) && v > 0) return v;
    }
    return null;
  } catch { return null; }
}

async function fetchIMFCountryYields() {
  // Countries not covered by FRED OECD series
  const countries = ["BR","TR","IN","CN","SG","ID","MY","TH","PH","SA"];
  const from = new Date(); from.setFullYear(from.getFullYear() - 3);
  const startPeriod = from.toISOString().slice(0, 7); // YYYY-MM
  // 4-second hard cap — if the service is blocked or slow, fail fast
  const TIMEOUT = new Promise(resolve => setTimeout(() => resolve(null), 4000));
  const json = await Promise.race([
    getJson(`https://dataservices.imf.org/REST/SDMX_JSON.svc/CompactData/IFS/M.${countries.join("+")}.FIGB_PA?startPeriod=${startPeriod}`)
      .catch(e => { console.warn("[fetch-bonds] IMF IFS:", e.message); return null; }),
    TIMEOUT,
  ]);
  if (!json) return {};
  let seriesArr = json?.CompactData?.DataSet?.Series ?? null;
  if (!seriesArr) return {};
  if (!Array.isArray(seriesArr)) seriesArr = [seriesArr]; // single country → object
  const results = {};
  for (const s of seriesArr) {
    const cc = s["@REF_AREA"];
    const v  = parseImfIfsSeries(s);
    if (v !== null) results[cc] = v;
  }
  if (Object.keys(results).length > 0)
    console.log(`[fetch-bonds] IMF IFS 10Y: ${Object.keys(results).length} (${Object.keys(results).join(", ")})`);
  return results;
}

// ─── Country-specific 10Y yield scrapers (alt sources when FRED/IMF unavailable)
// Returns a map of { code → yield } pre-fetched before the table loop.
async function fetchAltCountryYields() {
  const results = {};

  // Singapore — MAS (Monetary Authority of Singapore) SGS benchmark yields API.
  // No key required.  resource_id 9a0bf149… is the monthly SGS benchmark table.
  await (async () => {
    const TIMEOUT = new Promise(r => setTimeout(() => r(null), 4000));
    const json = await Promise.race([
      getJson("https://eservices.mas.gov.sg/api/action/datastore/search.json?resource_id=9a0bf149-308c-4bd2-832d-76c8e6cb47ed&sort=end_of_period%20desc&limit=5")
        .catch(() => null),
      TIMEOUT,
    ]);
    const records = json?.result?.records ?? [];
    for (const rec of records) {
      // Field name is ann_yield_10yr (confirmed in MAS API schema)
      const v = parseFloat(rec["ann_yield_10yr"] ?? rec["ann_yield_10y"] ?? "");
      if (Number.isFinite(v) && v > 0) { results.SG = v; break; }
    }
  })();

  if (Object.keys(results).length > 0)
    console.log(`[fetch-bonds] Alt country 10Y: ${Object.keys(results).length} (${Object.keys(results).join(", ")})`);
  return results;
}

// ─── Bank of Canada Valet API (CA yield curve) ────────────────────────────────
// No key required. https://www.bankofcanada.ca/valet/docs/
const BOC_TENORS = {
  "3M":"BD.CDN.3MO.DQ.YLD", "6M":"BD.CDN.6MO.DQ.YLD",
  "1Y":"BD.CDN.1YR.DQ.YLD", "2Y":"BD.CDN.2YR.DQ.YLD",
  "5Y":"BD.CDN.5YR.DQ.YLD", "7Y":"BD.CDN.7YR.DQ.YLD",
  "10Y":"BD.CDN.10YR.DQ.YLD","30Y":"BD.CDN.LONG.DQ.YLD",
};

async function fetchBoCCurve() {
  // Use the official benchmark bond group endpoint — avoids 404 when any
  // individual series code is missing (e.g. short-tenor T-bill codes).
  const data = await getJson(
    "https://www.bankofcanada.ca/valet/observations/group/bond_yields_benchmark/json?recent=10&order_dir=desc"
  );
  // Iterate from most-recent; skip observations that have no data (weekends/holidays)
  for (const obs of data.observations ?? []) {
    const tenors = {};
    for (const [tenor, series] of Object.entries(BOC_TENORS)) {
      const v = obs[series]?.v;
      if (v != null && v !== "" && !isNaN(parseFloat(v))) tenors[tenor] = parseFloat(v);
    }
    if (Object.keys(tenors).length >= 4) return tenors;
  }
  return null;
}

// ─── Japan Ministry of Finance JGB benchmark yields (CSV) ────────────────────
// No key required. File updated each business day.
// Headers: Date,1Y,2Y,3Y,4Y,5Y,6Y,7Y,8Y,9Y,10Y,15Y,20Y,25Y,30Y,40Y
// Date format: YYYY/M/D
async function fetchMoFJapanCurve() {
  const text = await getHtml(
    "https://www.mof.go.jp/english/jgbs/reference/interest_rate/jgbcme.csv"
  );
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const hIdx  = lines.findIndex(l => /Date/i.test(l) && /1Y/i.test(l));
  if (hIdx < 0) return null;
  const headers  = lines[hIdx].split(",").map(h => h.replace(/"/g, "").trim());
  const dataRows = lines.slice(hIdx + 1).filter(l => /^\d{4}/.test(l.trim()));
  const latest   = dataRows[dataRows.length - 1];
  if (!latest) return null;
  const vals = latest.split(",").map(v => v.replace(/"/g, "").trim());
  const want = { "1Y":1,"2Y":1,"5Y":1,"7Y":1,"10Y":1,"20Y":1,"30Y":1 };
  const tenors = {};
  headers.forEach((h, i) => {
    if (want[h] && vals[i] && vals[i] !== "-" && vals[i] !== "") {
      const v = parseFloat(vals[i]);
      if (!isNaN(v)) tenors[h] = v;
    }
  });
  return Object.keys(tenors).length >= 4 ? tenors : null;
}

// ─── Bank of England gilt nominal par yields ─────────────────────────────────
// No key required. https://www.bankofengland.co.uk/boeapps/database/
const BOE_TENORS = {
  "1Y":"IUDMNPY","2Y":"IUDMNY2","5Y":"IUDMNY5",
  "7Y":"IUDMNY7","10Y":"IUDMNY10","20Y":"IUDMNY20",
};

// Collect Set-Cookie headers from a fetch Response into an array of "name=value" strings.
function collectSetCookies(res) {
  const raw = typeof res.headers.getSetCookie === "function"
    ? res.headers.getSetCookie()
    : [res.headers.get("set-cookie") || ""];
  return raw
    .flatMap(h => h.split(/,(?=[^ ])/))  // naively split combined Set-Cookie header
    .map(c => c.split(";")[0].trim())
    .filter(Boolean);
}

async function fetchBoECurve() {
  const now    = new Date();
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const from   = new Date(now); from.setMonth(now.getMonth() - 3);
  const codes  = Object.values(BOE_TENORS).join(",");
  const fromD  = from.getDate(), fromM = MONTHS[from.getMonth()], fromY = from.getFullYear();
  const toD    = now.getDate(),  toM   = MONTHS[now.getMonth()],  toY   = now.getFullYear();

  const BASE = {
    "User-Agent":      UA,
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control":   "no-cache",
  };

  // BoE's IADB is a legacy ASP.NET app at /boeapps/database/ — completely
  // separate from the CMS content pages at /statistics/.  Its session cookie
  // (ASP.NET_SessionId) is only issued when you first hit the IADB app itself.
  // Navigation flow that mirrors a real browser:
  //   1. GET /boeapps/database/ → IADB home, establishes ASP.NET_SessionId
  //   2. GET fromshowcolumns.asp with UsingCodes=Y&SeriesCodes=... → loads the
  //      series-selection view; server stores chosen series in session state.
  //      If it already returns CSV (unlikely but possible), return immediately.
  //   3. GET same URL with csv.x=yes → triggers the CSV download handler.
  const cookieMap = {};
  const addCookies = arr => arr.forEach(c => {
    const k = c.split("=")[0].trim();
    if (k) cookieMap[k] = c;
  });
  const cookieHeader = () => Object.values(cookieMap).join("; ");

  // Step 1 — Cold hit to fromshowcolumns.asp itself (no params).
  // In Classic ASP, session cookies are keyed to the virtual directory.
  // fromshowcolumns.asp lives in a different IIS application than the
  // /boeapps/database/ index (they issue different ASPSESSIONID cookie names).
  // Visiting it cold first establishes the right session that step 2 can reuse.
  try {
    const r = await fetch("https://www.bankofengland.co.uk/boeapps/database/fromshowcolumns.asp",
      { headers: { ...BASE, "Accept": "text/html,application/xhtml+xml,*/*;q=0.8" } });
    const c = collectSetCookies(r);
    addCookies(c);
    console.log(`[fetch-bonds] BoE step1: ${c.length} cookies — ${c.map(x => x.split("=")[0]).join(", ") || "none"}`);
  } catch(e) { console.warn(`[fetch-bonds] BoE step1 failed: ${e.message}`); }

  // fromshowcolumns.asp — web display page; visiting it loads the series into
  // server-side session state so the subsequent _iadb download handler can serve CSV.
  const SERIES_URL = `https://www.bankofengland.co.uk/boeapps/database/fromshowcolumns.asp?UsingCodes=Y&SeriesCodes=${codes}&FD=${fromD}&FM=${fromM}&FY=${fromY}&TD=${toD}&TM=${toM}&TY=${toY}`;
  // _iadb-FromShowColumns.asp is the actual CSV-download handler used by the BoE website.
  const IADB_CSV   = `https://www.bankofengland.co.uk/boeapps/database/_iadb-FromShowColumns.asp?csv.x=yes&CSVF=TT&UsingCodes=Y&SeriesCodes=${codes}&FD=${fromD}&FM=${fromM}&FY=${fromY}&TD=${toD}&TM=${toM}&TY=${toY}`;

  // Step 2 — load series-selection page; IADB renders the data in an HTML table.
  // Try parseBoEHTML on the response — if it finds ≥4 tenors, return immediately
  // without needing the CSV download at all.
  try {
    const r = await fetch(SERIES_URL, {
      headers: { ...BASE, "Accept": "text/html,*/*", "Referer": "https://www.bankofengland.co.uk/boeapps/database/", "Cookie": cookieHeader() },
    });
    const c = collectSetCookies(r);
    addCookies(c);
    const text = await r.text();
    const isHTML = text.trimStart().startsWith("<");
    console.log(`[fetch-bonds] BoE step2: status=${r.status} isHTML=${isHTML} +cookies=${c.map(x => x.split("=")[0]).join(", ") || "none"}`);
    if (isHTML) {
      const parsed = parseBoEHTML(text);
      if (parsed) { console.log("[fetch-bonds] BoE: HTML table parsed ✓"); return parsed; }
    } else {
      const result = parseBoECSV(text, "step2");
      if (result) return result;
    }
  } catch(e) { console.warn(`[fetch-bonds] BoE step2 failed: ${e.message}`); }

  // Step 3 — CSV download via the _iadb handler with full accumulated cookie set
  for (const url of [IADB_CSV, IADB_CSV + "&DAT=RNG"]) {
    let res;
    try {
      res = await fetch(url, {
        headers: { ...BASE, "Accept": "text/csv,text/plain,*/*", "Referer": SERIES_URL, "Cookie": cookieHeader() },
      });
    } catch(e) { console.warn(`BoE step3 network error: ${e.message}`); continue; }
    if (!res.ok) { console.warn(`BoE step3: HTTP ${res.status}`); continue; }
    const text = await res.text();
    if (text.trimStart().startsWith("<")) {
      console.warn(`BoE step3: still HTML — ${text.replace(/\s+/g, " ").slice(0, 300)}`);
      continue;
    }
    const result = parseBoECSV(text, "step3");
    if (result) return result;
  }
  throw new Error("all BoE URL formats failed");
}

function parseBoECSV(text, label) {
  const lines   = text.trim().split(/\r?\n/).filter(l => l.trim());
  const hIdx    = lines.findIndex(l => /IUDM/i.test(l));
  if (hIdx < 0) {
    console.warn(`BoE ${label}: no IUDM header — start: ${text.replace(/\s+/g, " ").slice(0, 200)}`);
    return null;
  }
  const headers  = lines[hIdx].split(",").map(h => h.replace(/"/g, "").trim());
  const dataRows = lines.slice(hIdx + 1).filter(l => l.trim() && !/^[\s,]*$/.test(l));
  const latest   = dataRows[dataRows.length - 1];
  if (!latest) { console.warn(`BoE ${label}: no data rows`); return null; }
  const vals = latest.split(",").map(v => v.replace(/"/g, "").trim());
  const tenors = {};
  for (const [tenor, code] of Object.entries(BOE_TENORS)) {
    const idx = headers.indexOf(code);
    if (idx >= 0 && vals[idx] && vals[idx] !== "n/a" && vals[idx] !== "" && vals[idx] !== "..") {
      const v = parseFloat(vals[idx]);
      if (!isNaN(v)) tenors[tenor] = v;
    }
  }
  if (Object.keys(tenors).length >= 4) return tenors;
  console.warn(`BoE ${label}: only ${Object.keys(tenors).length} tenors`);
  return null;
}

// Parse yield tenors from the HTML table that fromshowcolumns.asp returns when
// UsingCodes=Y — the page renders a <table> with series-code column headers.
// This avoids the brittle CSV-download mechanism entirely.
function parseBoEHTML(html) {
  const $ = cheerio.load(html);
  const codeToTenor = Object.fromEntries(
    Object.entries(BOE_TENORS).map(([t, c]) => [c.toUpperCase(), t])
  );
  let best = null;
  $("table").each((_, table) => {
    // Scan ALL rows for a header row — IADB sometimes puts headers mid-table
    const rows = $(table).find("tr").toArray();
    let colIdx = {};
    let headerRowIdx = -1;
    for (let ri = 0; ri < rows.length; ri++) {
      const cells = $(rows[ri]).find("th, td");
      const candidate = {};
      cells.each((ci, cell) => {
        const txt = $(cell).text().trim().toUpperCase();
        // Match exact code OR code as substring (e.g. "IUDMNPY" inside longer text)
        for (const [code, tenor] of Object.entries(codeToTenor)) {
          if (txt === code || txt.includes(code)) { candidate[ci] = tenor; break; }
        }
      });
      if (Object.keys(candidate).length >= 2) { colIdx = candidate; headerRowIdx = ri; break; }
    }
    if (headerRowIdx < 0) return; // no header row found in this table
    // Walk data rows after the header; keep the last row with numeric values
    let latest = null;
    for (let ri = headerRowIdx + 1; ri < rows.length; ri++) {
      const cells = $(rows[ri]).find("td");
      if (!cells.length) continue;
      const tenors = {};
      Object.entries(colIdx).forEach(([ci, tenor]) => {
        const v = parseFloat($(cells[+ci]).text().trim().replace(",", "."));
        if (!isNaN(v) && v > 0) tenors[tenor] = v;
      });
      if (Object.keys(tenors).length >= 2) latest = tenors;
    }
    if (latest && Object.keys(latest).length >= 4) best = latest;
  });
  if (!best) {
    // Log the start of the HTML so we can diagnose what the IADB is returning
    console.warn(`[fetch-bonds] BoE parseBoEHTML: no table found — HTML start: ${html.replace(/\s+/g, " ").slice(0, 400)}`);
  }
  return best;
}

// ─── WGB central-bank-rates page ─────────────────────────────────────────────
const CB_MAP = {
  "united kingdom":"UK","great britain":"UK","bank of england":"UK",
  "canada":"CA","bank of canada":"CA",
  "japan":"JP","bank of japan":"JP",
  "china":"CN","peoples bank of china":"CN",
  "australia":"AU","reserve bank of australia":"AU",
  "new zealand":"NZ","reserve bank of new zealand":"NZ",
  "switzerland":"CH","swiss national bank":"CH",
  "sweden":"SE","riksbank":"SE",
  "norway":"NO","norges bank":"NO",
  "united states":"US","federal reserve":"US",
};

async function scrapeWGBCBRates() {
  const html = await getHtml("https://www.worldgovernmentbonds.com/central-bank-rates/");
  const $ = cheerio.load(html);
  const rates = {};
  $("table tbody tr").each((_, row) => {
    const cells = $(row).find("td");
    const raw   = $(cells[0]).text().trim().toLowerCase().replace(/[^a-z ]/g, "").trim();
    const code  = CB_MAP[raw];
    if (!code) return;
    const m = $(cells[1]).text().trim().match(/(-?\d+(?:[.,]\d+)?)/);
    if (m) rates[code] = parseFloat(m[1].replace(",", "."));
  });
  return rates;
}

// ─── Country catalogues ───────────────────────────────────────────────────────
const BONDS_COUNTRIES = [
  { code:"US",slug:"united-states",  region:"Americas",            flag:"🇺🇸",rating:"Aaa" },
  { code:"CA",slug:"canada",         region:"Americas",            flag:"🇨🇦",rating:"Aaa" },
  { code:"BR",slug:"brazil",         region:"Americas",            flag:"🇧🇷",rating:"Ba1" },
  { code:"MX",slug:"mexico",         region:"Americas",            flag:"🇲🇽",rating:"Baa2"},
  { code:"DE",slug:"germany",        region:"Europe",              flag:"🇩🇪",rating:"Aaa" },
  { code:"GB",slug:"united-kingdom", region:"Europe",              flag:"🇬🇧",rating:"Aa3" },
  { code:"FR",slug:"france",         region:"Europe",              flag:"🇫🇷",rating:"Aa2" },
  { code:"IT",slug:"italy",          region:"Europe",              flag:"🇮🇹",rating:"Baa3"},
  { code:"ES",slug:"spain",          region:"Europe",              flag:"🇪🇸",rating:"Baa1"},
  { code:"NL",slug:"netherlands",    region:"Europe",              flag:"🇳🇱",rating:"Aaa" },
  { code:"CH",slug:"switzerland",    region:"Europe",              flag:"🇨🇭",rating:"Aaa" },
  { code:"SE",slug:"sweden",         region:"Europe",              flag:"🇸🇪",rating:"Aaa" },
  { code:"NO",slug:"norway",         region:"Europe",              flag:"🇳🇴",rating:"Aaa" },
  { code:"AT",slug:"austria",        region:"Europe",              flag:"🇦🇹",rating:"Aa1" },
  { code:"BE",slug:"belgium",        region:"Europe",              flag:"🇧🇪",rating:"Aa3" },
  { code:"PT",slug:"portugal",       region:"Europe",              flag:"🇵🇹",rating:"Baa2"},
  { code:"GR",slug:"greece",         region:"Europe",              flag:"🇬🇷",rating:"Ba1" },
  { code:"PL",slug:"poland",         region:"Europe",              flag:"🇵🇱",rating:"A2"  },
  { code:"CZ",slug:"czech-republic", region:"Europe",              flag:"🇨🇿",rating:"Aa3" },
  { code:"HU",slug:"hungary",        region:"Europe",              flag:"🇭🇺",rating:"Baa2"},
  { code:"TR",slug:"turkey",         region:"Europe",              flag:"🇹🇷",rating:"B2"  },
  { code:"JP",slug:"japan",          region:"Asia Pacific",        flag:"🇯🇵",rating:"A1"  },
  { code:"CN",slug:"china",          region:"Asia Pacific",        flag:"🇨🇳",rating:"A1"  },
  { code:"AU",slug:"australia",      region:"Asia Pacific",        flag:"🇦🇺",rating:"Aaa" },
  { code:"NZ",slug:"new-zealand",    region:"Asia Pacific",        flag:"🇳🇿",rating:"Aaa" },
  { code:"IN",slug:"india",          region:"Asia Pacific",        flag:"🇮🇳",rating:"Baa3"},
  { code:"KR",slug:"south-korea",    region:"Asia Pacific",        flag:"🇰🇷",rating:"Aa2" },
  { code:"SG",slug:"singapore",      region:"Asia Pacific",        flag:"🇸🇬",rating:"Aaa" },
  { code:"ID",slug:"indonesia",      region:"Asia Pacific",        flag:"🇮🇩",rating:"Baa2"},
  { code:"MY",slug:"malaysia",       region:"Asia Pacific",        flag:"🇲🇾",rating:"A3"  },
  { code:"TH",slug:"thailand",       region:"Asia Pacific",        flag:"🇹🇭",rating:"Baa1"},
  { code:"PH",slug:"philippines",    region:"Asia Pacific",        flag:"🇵🇭",rating:"Baa2"},
  { code:"ZA",slug:"south-africa",   region:"Africa & Middle East",flag:"🇿🇦",rating:"B1"  },
  { code:"SA",slug:"saudi-arabia",   region:"Africa & Middle East",flag:"🇸🇦",rating:"A1"  },
  { code:"IL",slug:"israel",         region:"Africa & Middle East",flag:"🇮🇱",rating:"A2"  },
];

const YC_META = {
  US:{ name:"USA",           flag:"🇺🇸", color:"#2962ff" },
  GB:{ name:"United Kingdom",flag:"🇬🇧", color:"#4caf50" },
  DE:{ name:"Germany",       flag:"🇩🇪", color:"#ff9800" },
  FR:{ name:"France",        flag:"🇫🇷", color:"#00bcd4" },
  IT:{ name:"Italy",         flag:"🇮🇹", color:"#e91e63" },
  CA:{ name:"Canada",        flag:"🇨🇦", color:"#f44336" },
  JP:{ name:"Japan",         flag:"🇯🇵", color:"#26c6da" },
  CN:{ name:"China",         flag:"🇨🇳", color:"#ec407a" },
};

// Demo fallback for the bonds TABLE only (10Y yield, not for curves/heatmap)
const DEMO_YIELD = {
  US:4.28,CA:3.20,BR:13.50,MX:9.50,DE:2.42,GB:4.52,FR:3.22,IT:3.65,
  ES:3.28,NL:2.68,CH:0.42,SE:2.35,NO:4.10,AT:2.85,BE:3.05,PT:3.10,
  GR:3.42,PL:5.65,CZ:4.20,HU:6.70,TR:28.00,JP:1.55,CN:1.98,AU:4.32,
  NZ:4.65,IN:6.70,KR:2.80,SG:3.20,ID:7.10,MY:3.95,TH:2.85,PH:6.35,
  ZA:11.00,SA:4.80,IL:5.20,
};
const DEMO_CHG = {
  US:[-0.02,0.05,-0.10,0.15,-0.30],CA:[-0.02,0.01,-0.12,0.05,-0.25],
  BR:[0.05,0.20,0.80,1.50,2.80],MX:[0.03,0.10,0.30,0.80,1.20],
  DE:[-0.01,0.03,-0.08,0.12,-0.45],GB:[-0.03,0.02,-0.15,0.20,-0.10],
  FR:[-0.01,0.04,-0.07,0.18,-0.40],IT:[-0.02,0.02,-0.10,0.25,-0.55],
  ES:[-0.01,0.03,-0.09,0.20,-0.48],NL:[-0.01,0.03,-0.07,0.13,-0.42],
  CH:[0.00,0.01,-0.05,0.02,-0.15],SE:[-0.01,0.02,-0.06,0.08,-0.35],
  NO:[-0.02,0.03,-0.10,0.12,-0.25],AT:[-0.01,0.03,-0.08,0.13,-0.40],
  BE:[-0.01,0.03,-0.08,0.15,-0.42],PT:[-0.01,0.02,-0.08,0.12,-0.50],
  GR:[-0.01,0.02,-0.08,0.15,-0.80],PL:[0.01,0.05,0.10,0.30,0.50],
  CZ:[0.01,0.03,0.08,0.20,-0.30],HU:[0.02,0.08,0.15,0.50,-1.00],
  TR:[-0.10,-0.50,-2.00,-5.00,-20.00],JP:[0.01,0.05,0.10,0.35,0.85],
  CN:[-0.01,-0.03,-0.15,-0.30,-0.80],AU:[-0.02,0.04,-0.08,0.10,-0.20],
  NZ:[-0.03,0.05,-0.12,0.15,-0.35],IN:[0.01,-0.02,-0.10,-0.20,-0.40],
  KR:[-0.01,0.02,-0.05,0.10,-0.30],SG:[-0.02,0.01,-0.08,0.05,-0.20],
  ID:[0.02,0.05,0.20,0.40,0.30],MY:[0.01,0.02,0.08,0.15,0.10],
  TH:[0.00,0.01,-0.05,0.05,-0.15],PH:[0.01,0.04,0.10,0.25,-0.20],
  ZA:[0.02,0.08,0.20,0.40,0.60],SA:[0.01,0.03,0.08,0.15,0.05],
  IL:[0.02,0.05,0.15,0.30,0.80],
};

// ─── Main handler ─────────────────────────────────────────────────────────────
exports.handler = async () => {
  // @netlify/blobs v8 needs NETLIFY_BLOBS_CONTEXT (auto-injected for regular
  // functions) OR explicit siteID + token.  Scheduled functions sometimes don't
  // receive the auto-injected context, so we always supply credentials explicitly.
  const store = getStore({
    name:   "bonds-cache",
    siteID: process.env.NETLIFY_SITE_ID || process.env.SITE_ID,
    token:  process.env.NETLIFY_AUTH_TOKEN,
  });
  const FRED_KEY = process.env.FRED_API_KEY || "";
  const asOf     = todayISO();

  // ── 1. Yield curves (fetched first so bonds table can reuse 10Y values) ────────
  console.log("[fetch-bonds] Yield curves…");
  const curves = {};

  // US: FRED preferred → WGB fallback
  if (FRED_KEY) {
    const fred = await fetchUSCurveFRED(FRED_KEY).catch(e => { console.warn("FRED curve:", e.message); return null; });
    if (fred) { curves.US = fred; console.log("[fetch-bonds] US: FRED ✓"); }
    else {
      const wgb = await scrapeWGBCurve("united-states").catch(e => { console.warn("[fetch-bonds] US WGB:", e.message); return null; });
      if (wgb) { curves.US = wgb; console.log("[fetch-bonds] US: WGB fallback ✓"); }
      else console.warn("[fetch-bonds] US: all sources failed — excluded from yield curve");
    }
  } else {
    console.log("[fetch-bonds] FRED_API_KEY not set — using WGB for US");
    const wgb = await scrapeWGBCurve("united-states").catch(e => { console.warn("[fetch-bonds] US WGB:", e.message); return null; });
    if (wgb) { curves.US = wgb; console.log("[fetch-bonds] US: WGB ✓"); }
    else console.warn("[fetch-bonds] US: WGB failed — excluded");
  }

  // DE: ECB SDMX preferred → WGB fallback
  const ecbCurve = await fetchECBCurve().catch(e => { console.warn("ECB curve:", e.message); return null; });
  if (ecbCurve) { curves.DE = ecbCurve; console.log("[fetch-bonds] DE: ECB ✓"); }
  else {
    const wgb = await scrapeWGBCurve("germany").catch(e => { console.warn("[fetch-bonds] DE WGB:", e.message); return null; });
    if (wgb) { curves.DE = wgb; console.log("[fetch-bonds] DE: WGB fallback ✓"); }
    else console.warn("[fetch-bonds] DE: all sources failed — excluded");
  }

  // GB: Bank of England preferred → WGB fallback
  const boeCurve = await fetchBoECurve().catch(e => { console.warn("BoE:", e.message); return null; });
  if (boeCurve) { curves.GB = boeCurve; console.log("[fetch-bonds] GB: BoE ✓"); }
  else {
    const wgb = await scrapeWGBCurve("united-kingdom").catch(e => { console.warn("[fetch-bonds] GB WGB:", e.message); return null; });
    if (wgb) { curves.GB = wgb; console.log("[fetch-bonds] GB: WGB fallback ✓"); }
    else console.warn("[fetch-bonds] GB: all sources failed — excluded");
  }

  // CA: Bank of Canada preferred → WGB fallback
  const bocCurve = await fetchBoCCurve().catch(e => { console.warn("BoC:", e.message); return null; });
  if (bocCurve) { curves.CA = bocCurve; console.log("[fetch-bonds] CA: BoC ✓"); }
  else {
    const wgb = await scrapeWGBCurve("canada").catch(e => { console.warn("[fetch-bonds] CA WGB:", e.message); return null; });
    if (wgb) { curves.CA = wgb; console.log("[fetch-bonds] CA: WGB fallback ✓"); }
    else console.warn("[fetch-bonds] CA: all sources failed — excluded");
  }

  // JP: MoF Japan preferred → WGB fallback
  const mofCurve = await fetchMoFJapanCurve().catch(e => { console.warn("MoF:", e.message); return null; });
  if (mofCurve) { curves.JP = mofCurve; console.log("[fetch-bonds] JP: MoF ✓"); }
  else {
    const wgb = await scrapeWGBCurve("japan").catch(e => { console.warn("[fetch-bonds] JP WGB:", e.message); return null; });
    if (wgb) { curves.JP = wgb; console.log("[fetch-bonds] JP: WGB fallback ✓"); }
    else console.warn("[fetch-bonds] JP: all sources failed — excluded");
  }

  // FR, IT, CN: WGB only (no free official API available)
  await Promise.all([
    { code:"FR", slug:"france" },
    { code:"IT", slug:"italy" },
    { code:"CN", slug:"china" },
  ].map(async ({ code, slug }) => {
    const c = await scrapeWGBCurve(slug).catch(e => { console.warn(`[fetch-bonds] ${code} WGB: ${e.message}`); return null; });
    if (c) { curves[code] = c; console.log(`[fetch-bonds] ${code}: WGB ✓`); }
    else console.warn(`[fetch-bonds] ${code}: WGB failed — excluded from yield curve`);
  }));

  const TENORS = ["1M","3M","6M","1Y","2Y","5Y","7Y","10Y","20Y","30Y"];
  const ycCountries = Object.keys(YC_META)
    .filter(code => curves[code] != null)
    .map(code => ({ code, ...YC_META[code] }));

  console.log(`[fetch-bonds] Yield curves ready for: ${ycCountries.map(c => c.code).join(", ") || "none"}`);
  try {
    await store.setJSON("yield-curves", { asOf, tenors: TENORS, countries: ycCountries, curves });
  } catch(e) { console.error("[fetch-bonds] Blob 'yield-curves' write failed:", e.message); }

  // ── 2. Bonds table (35 countries × 10Y) ──────────────────────────────────────
  // Priority: curve 10Y → FRED OECD (24) → IMF IFS → alt (MAS…) → WGB → demo.
  // All secondary sources pre-fetched in parallel before the wave loop.
  console.log("[fetch-bonds] Bonds table…");
  const [fredCountryYields, imfCountryYields, altCountryYields] = await Promise.all([
    fetchFredCountryYields(FRED_KEY).catch(() => ({})),
    fetchIMFCountryYields().catch(() => ({})),
    fetchAltCountryYields().catch(() => ({})),
  ]);
  const fredLiveCount = Object.keys(fredCountryYields).length;
  if (fredLiveCount > 0) console.log(`[fetch-bonds] FRED country 10Y: ${fredLiveCount} (${Object.keys(fredCountryYields).join(", ")})`);

  const bonds = []; let liveCount = 0;
  for (let i = 0; i < BONDS_COUNTRIES.length; i += 3) {
    const wave = await Promise.all(
      BONDS_COUNTRIES.slice(i, i + 3).map(async c => {
        const fromCurve = curves[c.code]?.["10Y"] ?? null;
        const fromFred  = fredCountryYields[c.code] ?? null;
        const fromIMF   = imfCountryYields[c.code] ?? null;
        const fromAlt   = altCountryYields[c.code] ?? null;
        const live = fromCurve ?? fromFred ?? fromIMF ?? fromAlt ?? await scrapeWGB10Y(c.slug).catch(() => null);
        if (live !== null) liveCount++;
        const chg = DEMO_CHG[c.code] ?? [0,0,0,0,0];
        return {
          code:c.code, name: YC_META[c.code]?.name ?? c.code,
          flag:c.flag, region:c.region, rating:c.rating,
          yield10y: live ?? DEMO_YIELD[c.code] ?? 4.0,
          change1d:chg[0], change1w:chg[1], change1m:chg[2], change6m:chg[3], change1y:chg[4],
          src: live !== null ? "live" : "demo",
        };
      })
    );
    bonds.push(...wave);
  }
  console.log(`[fetch-bonds] Table: ${liveCount}/${bonds.length} live`);
  try {
    await store.setJSON("latest", {
      asOf, fetchedAt: new Date().toISOString(), bonds, liveCount,
      totalCount: bonds.length,
      src: liveCount > bonds.length / 2 ? "mostly-live" : "mostly-demo",
    });
  } catch(e) { console.error("[fetch-bonds] Blob 'latest' write failed:", e.message); }

  // ── 3. Central bank rates ─────────────────────────────────────────────────────
  console.log("[fetch-bonds] Central bank rates…");
  const cbRates = {};

  // EU: ECB SDMX (authoritative source)
  const ecbRate = await fetchECBRate().catch(e => { console.warn("ECB rate:", e.message); return null; });
  if (ecbRate != null) { cbRates.EU = ecbRate; console.log(`[fetch-bonds] EU rate (ECB): ${ecbRate}`); }

  // US: FRED if key available
  if (FRED_KEY) {
    const fedRate = await fetchFedFundsRate(FRED_KEY).catch(() => null);
    if (fedRate != null) { cbRates.US = fedRate; console.log(`[fetch-bonds] US rate (FRED): ${fedRate}`); }
  }

  // All others (and US/EU fallback): WGB central-bank-rates page
  const wgbRates = await scrapeWGBCBRates().catch(e => { console.warn("WGB CB rates:", e.message); return {}; });
  for (const [code, rate] of Object.entries(wgbRates)) {
    if (cbRates[code] == null) cbRates[code] = rate;
  }

  console.log("[fetch-bonds] CB rates:", JSON.stringify(cbRates));
  try {
    await store.setJSON("cb-rates", { asOf, rates: cbRates });
  } catch(e) { console.error("[fetch-bonds] Blob 'cb-rates' write failed:", e.message); }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ok: true, asOf,
      bondsLive: liveCount, bondsTotal: bonds.length,
      yieldCurveCountries: ycCountries.map(c => c.code),
      cbRates,
    }),
  };
};
