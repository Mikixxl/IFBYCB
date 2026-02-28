// fetch-bonds.js
// Netlify Scheduled Function — 06:00 UTC daily.
//
// Data sources for yield curves (live only — no demo fallback for curves):
//   US   → FRED API (process.env.FRED_API_KEY, free at fred.stlouisfed.org)
//            fallback: WGB per-country scraping
//   DE   → ECB SDMX API (no key, issuer: European Central Bank)
//            fallback: WGB per-country scraping
//   GB, FR, IT, CA, JP, CN → WGB per-country scraping
//
// Central bank rates:
//   US   → FRED (FEDFUNDS series, if key set)  fallback: WGB cb-rates page
//   EU   → ECB SDMX (deposit facility rate, no key needed)
//   UK, CA, JP, CN, AU, NZ, CH, SE, NO → WGB central-bank-rates/ page
//
// Bonds table (35 countries, 10Y only):
//   WGB per-country scraping; demo fallback for 10Y only (table clearly marks it)
//
// Stored blobs in "bonds-cache":
//   "latest"        → bonds table
//   "yield-curves"  → ONLY countries where live data was obtained
//   "cb-rates"      → current central bank policy rates

const fetch   = require("node-fetch");
const cheerio = require("cheerio");
const { getStore } = require("@netlify/blobs");

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
           "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const todayISO = () => new Date().toISOString().slice(0, 10);

// ─── HTTP helpers ─────────────────────────────────────────────────────────────
async function getHtml(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA, Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9", Referer: "https://www.google.com/",
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
  const $ = cheerio.load(html);
  const tenors = {};
  $("table tbody tr").each((_, row) => {
    const cells = $(row).find("td");
    const label = $(cells[0]).text().trim();
    const code  = Object.keys(TENOR_LABEL).find(
      k => TENOR_LABEL[k].toLowerCase() === label.toLowerCase()
    );
    if (code) {
      const m = $(cells[1]).text().trim().match(/(\d+[.,]\d+)/);
      if (m) tenors[code] = parseFloat(m[1].replace(",", "."));
    }
  });
  // Require at least 4 tenors to consider scrape successful
  return Object.keys(tenors).length >= 4 ? tenors : null;
}

async function scrapeWGB10Y(slug) {
  const curve = await scrapeWGBCurve(slug).catch(() => null);
  return curve?.["10Y"] ?? null;
}

// ─── FRED API (US Treasury yields + Fed Funds rate) ───────────────────────────
// Free API key: https://fred.stlouisfed.org/docs/api/api_key.html
// Set as FRED_API_KEY in your Netlify site environment variables.
const FRED_YIELD_SERIES = {
  "1M":"DGS1MO","3M":"DGS3MO","6M":"DGS6MO","1Y":"DGS1",
  "2Y":"DGS2","5Y":"DGS5","7Y":"DGS7","10Y":"DGS10","20Y":"DGS20","30Y":"DGS30",
};

async function fredLatest(seriesId, apiKey) {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&limit=10&sort_order=desc&api_key=${apiKey}&file_type=json`;
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

  // ── 1. Bonds table (35 countries × 10Y) ──────────────────────────────────────
  console.log("[fetch-bonds] Bonds table…");
  const bonds = []; let liveCount = 0;
  for (let i = 0; i < BONDS_COUNTRIES.length; i += 6) {
    const wave = await Promise.all(
      BONDS_COUNTRIES.slice(i, i + 6).map(async c => {
        const live = await scrapeWGB10Y(c.slug).catch(() => null);
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

  // ── 2. Yield curves (live only — failed countries are omitted entirely) ───────
  console.log("[fetch-bonds] Yield curves…");
  const curves = {};

  // US: FRED preferred → WGB fallback
  if (FRED_KEY) {
    const fred = await fetchUSCurveFRED(FRED_KEY).catch(e => { console.warn("FRED curve:", e.message); return null; });
    if (fred) { curves.US = fred; console.log("[fetch-bonds] US: FRED ✓"); }
    else {
      const wgb = await scrapeWGBCurve("united-states").catch(() => null);
      if (wgb) { curves.US = wgb; console.log("[fetch-bonds] US: WGB fallback ✓"); }
      else console.warn("[fetch-bonds] US: all sources failed — excluded from yield curve");
    }
  } else {
    console.log("[fetch-bonds] FRED_API_KEY not set — using WGB for US");
    const wgb = await scrapeWGBCurve("united-states").catch(() => null);
    if (wgb) { curves.US = wgb; console.log("[fetch-bonds] US: WGB ✓"); }
    else console.warn("[fetch-bonds] US: WGB failed — excluded");
  }

  // DE: ECB SDMX preferred → WGB fallback
  const ecbCurve = await fetchECBCurve().catch(e => { console.warn("ECB curve:", e.message); return null; });
  if (ecbCurve) { curves.DE = ecbCurve; console.log("[fetch-bonds] DE: ECB ✓"); }
  else {
    const wgb = await scrapeWGBCurve("germany").catch(() => null);
    if (wgb) { curves.DE = wgb; console.log("[fetch-bonds] DE: WGB fallback ✓"); }
    else console.warn("[fetch-bonds] DE: all sources failed — excluded");
  }

  // GB, FR, IT, CA, JP, CN: WGB only
  // Japan data is freely published by MoF Japan, aggregated by WGB.
  await Promise.all([
    { code:"GB", slug:"united-kingdom" },
    { code:"FR", slug:"france" },
    { code:"IT", slug:"italy" },
    { code:"CA", slug:"canada" },
    { code:"JP", slug:"japan" },
    { code:"CN", slug:"china" },
  ].map(async ({ code, slug }) => {
    const c = await scrapeWGBCurve(slug).catch(() => null);
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
