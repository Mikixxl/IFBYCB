// bonds-table.js
// Serves the pre-fetched government bond data stored daily by fetch-bonds.js.
// Falls back to demo data if the blob cache is empty (e.g. first deploy).
//
// GET /api/bonds-table
// Response: { asOf, fetchedAt?, bonds:[...], src, liveCount, totalCount }

const { getStore } = require("@netlify/blobs");

// ─── Demo baseline (fallback only — fetch-bonds.js is the live source) ────────
const DEMO_BONDS = [
  { code:"US", name:"United States",  flag:"🇺🇸", region:"Americas",            rating:"Aaa",  yield10y:4.28, change1d:-0.02, change1w: 0.05, change1m:-0.10, change6m: 0.15, change1y:-0.30 },
  { code:"CA", name:"Canada",         flag:"🇨🇦", region:"Americas",            rating:"Aaa",  yield10y:3.20, change1d:-0.02, change1w: 0.01, change1m:-0.12, change6m: 0.05, change1y:-0.25 },
  { code:"BR", name:"Brazil",         flag:"🇧🇷", region:"Americas",            rating:"Ba1",  yield10y:13.5, change1d: 0.05, change1w: 0.20, change1m: 0.80, change6m: 1.50, change1y: 2.80 },
  { code:"MX", name:"Mexico",         flag:"🇲🇽", region:"Americas",            rating:"Baa2", yield10y:9.50, change1d: 0.03, change1w: 0.10, change1m: 0.30, change6m: 0.80, change1y: 1.20 },
  { code:"DE", name:"Germany",        flag:"🇩🇪", region:"Europe",              rating:"Aaa",  yield10y:2.42, change1d:-0.01, change1w: 0.03, change1m:-0.08, change6m: 0.12, change1y:-0.45 },
  { code:"GB", name:"United Kingdom", flag:"🇬🇧", region:"Europe",              rating:"Aa3",  yield10y:4.52, change1d:-0.03, change1w: 0.02, change1m:-0.15, change6m: 0.20, change1y:-0.10 },
  { code:"FR", name:"France",         flag:"🇫🇷", region:"Europe",              rating:"Aa2",  yield10y:3.22, change1d:-0.01, change1w: 0.04, change1m:-0.07, change6m: 0.18, change1y:-0.40 },
  { code:"IT", name:"Italy",          flag:"🇮🇹", region:"Europe",              rating:"Baa3", yield10y:3.65, change1d:-0.02, change1w: 0.02, change1m:-0.10, change6m: 0.25, change1y:-0.55 },
  { code:"ES", name:"Spain",          flag:"🇪🇸", region:"Europe",              rating:"Baa1", yield10y:3.28, change1d:-0.01, change1w: 0.03, change1m:-0.09, change6m: 0.20, change1y:-0.48 },
  { code:"NL", name:"Netherlands",    flag:"🇳🇱", region:"Europe",              rating:"Aaa",  yield10y:2.68, change1d:-0.01, change1w: 0.03, change1m:-0.07, change6m: 0.13, change1y:-0.42 },
  { code:"CH", name:"Switzerland",    flag:"🇨🇭", region:"Europe",              rating:"Aaa",  yield10y:0.42, change1d: 0.00, change1w: 0.01, change1m:-0.05, change6m: 0.02, change1y:-0.15 },
  { code:"SE", name:"Sweden",         flag:"🇸🇪", region:"Europe",              rating:"Aaa",  yield10y:2.35, change1d:-0.01, change1w: 0.02, change1m:-0.06, change6m: 0.08, change1y:-0.35 },
  { code:"NO", name:"Norway",         flag:"🇳🇴", region:"Europe",              rating:"Aaa",  yield10y:4.10, change1d:-0.02, change1w: 0.03, change1m:-0.10, change6m: 0.12, change1y:-0.25 },
  { code:"AT", name:"Austria",        flag:"🇦🇹", region:"Europe",              rating:"Aa1",  yield10y:2.85, change1d:-0.01, change1w: 0.03, change1m:-0.08, change6m: 0.13, change1y:-0.40 },
  { code:"BE", name:"Belgium",        flag:"🇧🇪", region:"Europe",              rating:"Aa3",  yield10y:3.05, change1d:-0.01, change1w: 0.03, change1m:-0.08, change6m: 0.15, change1y:-0.42 },
  { code:"PT", name:"Portugal",       flag:"🇵🇹", region:"Europe",              rating:"Baa2", yield10y:3.10, change1d:-0.01, change1w: 0.02, change1m:-0.08, change6m: 0.12, change1y:-0.50 },
  { code:"GR", name:"Greece",         flag:"🇬🇷", region:"Europe",              rating:"Ba1",  yield10y:3.42, change1d:-0.01, change1w: 0.02, change1m:-0.08, change6m: 0.15, change1y:-0.80 },
  { code:"PL", name:"Poland",         flag:"🇵🇱", region:"Europe",              rating:"A2",   yield10y:5.65, change1d: 0.01, change1w: 0.05, change1m: 0.10, change6m: 0.30, change1y: 0.50 },
  { code:"CZ", name:"Czech Republic", flag:"🇨🇿", region:"Europe",              rating:"Aa3",  yield10y:4.20, change1d: 0.01, change1w: 0.03, change1m: 0.08, change6m: 0.20, change1y:-0.30 },
  { code:"HU", name:"Hungary",        flag:"🇭🇺", region:"Europe",              rating:"Baa2", yield10y:6.70, change1d: 0.02, change1w: 0.08, change1m: 0.15, change6m: 0.50, change1y:-1.00 },
  { code:"TR", name:"Turkey",         flag:"🇹🇷", region:"Europe",              rating:"B2",   yield10y:28.0, change1d:-0.10, change1w:-0.50, change1m:-2.00, change6m:-5.00, change1y:-20.0 },
  { code:"JP", name:"Japan",          flag:"🇯🇵", region:"Asia Pacific",        rating:"A1",   yield10y:1.55, change1d: 0.01, change1w: 0.05, change1m: 0.10, change6m: 0.35, change1y: 0.85 },
  { code:"CN", name:"China",          flag:"🇨🇳", region:"Asia Pacific",        rating:"A1",   yield10y:1.98, change1d:-0.01, change1w:-0.03, change1m:-0.15, change6m:-0.30, change1y:-0.80 },
  { code:"AU", name:"Australia",      flag:"🇦🇺", region:"Asia Pacific",        rating:"Aaa",  yield10y:4.32, change1d:-0.02, change1w: 0.04, change1m:-0.08, change6m: 0.10, change1y:-0.20 },
  { code:"NZ", name:"New Zealand",    flag:"🇳🇿", region:"Asia Pacific",        rating:"Aaa",  yield10y:4.65, change1d:-0.03, change1w: 0.05, change1m:-0.12, change6m: 0.15, change1y:-0.35 },
  { code:"IN", name:"India",          flag:"🇮🇳", region:"Asia Pacific",        rating:"Baa3", yield10y:6.70, change1d: 0.01, change1w:-0.02, change1m:-0.10, change6m:-0.20, change1y:-0.40 },
  { code:"KR", name:"South Korea",    flag:"🇰🇷", region:"Asia Pacific",        rating:"Aa2",  yield10y:2.80, change1d:-0.01, change1w: 0.02, change1m:-0.05, change6m: 0.10, change1y:-0.30 },
  { code:"SG", name:"Singapore",      flag:"🇸🇬", region:"Asia Pacific",        rating:"Aaa",  yield10y:3.20, change1d:-0.02, change1w: 0.01, change1m:-0.08, change6m: 0.05, change1y:-0.20 },
  { code:"ID", name:"Indonesia",      flag:"🇮🇩", region:"Asia Pacific",        rating:"Baa2", yield10y:7.10, change1d: 0.02, change1w: 0.05, change1m: 0.20, change6m: 0.40, change1y: 0.30 },
  { code:"MY", name:"Malaysia",       flag:"🇲🇾", region:"Asia Pacific",        rating:"A3",   yield10y:3.95, change1d: 0.01, change1w: 0.02, change1m: 0.08, change6m: 0.15, change1y: 0.10 },
  { code:"TH", name:"Thailand",       flag:"🇹🇭", region:"Asia Pacific",        rating:"Baa1", yield10y:2.85, change1d: 0.00, change1w: 0.01, change1m:-0.05, change6m: 0.05, change1y:-0.15 },
  { code:"PH", name:"Philippines",    flag:"🇵🇭", region:"Asia Pacific",        rating:"Baa2", yield10y:6.35, change1d: 0.01, change1w: 0.04, change1m: 0.10, change6m: 0.25, change1y:-0.20 },
  { code:"ZA", name:"South Africa",   flag:"🇿🇦", region:"Africa & Middle East",rating:"B1",   yield10y:11.0, change1d: 0.02, change1w: 0.08, change1m: 0.20, change6m: 0.40, change1y: 0.60 },
  { code:"SA", name:"Saudi Arabia",   flag:"🇸🇦", region:"Africa & Middle East",rating:"A1",   yield10y:4.80, change1d: 0.01, change1w: 0.03, change1m: 0.08, change6m: 0.15, change1y: 0.05 },
  { code:"IL", name:"Israel",         flag:"🇮🇱", region:"Africa & Middle East",rating:"A2",   yield10y:5.20, change1d: 0.02, change1w: 0.05, change1m: 0.15, change6m: 0.30, change1y: 0.80 },
];

// ─── Handler ──────────────────────────────────────────────────────────────────
exports.handler = async () => {
  // Try to serve from the Netlify Blobs cache written by fetch-bonds.js
  try {
    const store = getStore("bonds-cache");
    const cached = await store.get("latest", { type: "json" });

    if (cached && cached.bonds && cached.bonds.length > 0) {
      return okJson(cached);
    }
  } catch (err) {
    console.warn("[bonds-table] Blob read failed:", err.message);
  }

  // Cache empty (first deploy) — return demo data
  console.warn("[bonds-table] No cached data found, returning demo fallback.");
  return okJson({
    asOf:       new Date().toISOString().slice(0, 10),
    bonds:      DEMO_BONDS.map((b) => ({ ...b, src: "demo" })),
    src:        "demo",
    liveCount:  0,
    totalCount: DEMO_BONDS.length,
  });
};

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
