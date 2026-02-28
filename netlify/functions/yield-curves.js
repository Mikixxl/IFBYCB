// yield-curves.js
// Returns full yield curve (10 tenors) for 8 major countries.
// Realistic demo values for early 2026 — used by both the yield curve
// chart and the yield heatmap section.
//
// GET /api/yield-curves
// Response: { asOf, tenors, countries, curves }

const TENORS = ["1M","3M","6M","1Y","2Y","5Y","7Y","10Y","20Y","30Y"];

const COUNTRIES = [
  { code:"US", name:"USA",            flag:"🇺🇸", color:"#2962ff" },
  { code:"GB", name:"United Kingdom", flag:"🇬🇧", color:"#4caf50" },
  { code:"DE", name:"Germany",        flag:"🇩🇪", color:"#ff9800" },
  { code:"FR", name:"France",         flag:"🇫🇷", color:"#00bcd4" },
  { code:"IT", name:"Italy",          flag:"🇮🇹", color:"#e91e63" },
  { code:"CA", name:"Canada",         flag:"🇨🇦", color:"#f44336" },
  { code:"JP", name:"Japan",          flag:"🇯🇵", color:"#26c6da" },
  { code:"CN", name:"China",          flag:"🇨🇳", color:"#ec407a" },
];

// Yield curve values per tenor [1M,3M,6M,1Y,2Y,5Y,7Y,10Y,20Y,30Y]
// Reflects approximate early-2026 market levels
const DEMO = {
  US: [3.69, 3.66, 3.63, 3.49, 3.38, 3.51, 3.75, 3.95, 4.30, 4.62],
  GB: [3.76, 3.66, 3.61, 3.52, 3.65, 3.80, 4.10, 4.31, 4.75, 5.02],
  DE: [1.94, 1.95, 1.95, 1.98, 1.98, 2.25, 2.45, 2.64, 3.10, 3.32],
  FR: [2.01, 2.03, 2.04, 2.10, 2.32, 2.53, 2.80, 3.22, 3.90, 4.22],
  IT: [2.03, 2.00, 2.03, 2.06, 2.30, 2.59, 2.95, 3.28, 3.90, 4.19],
  CA: [2.18, 2.20, 2.24, 2.32, 2.42, 2.67, 2.85, 3.13, 3.45, 3.63],
  JP: [null, 0.78, 0.84, 1.01, 1.36, 1.57, 1.85, 2.11, 2.60, 3.34],
  CN: [1.60, 1.65, 1.70, 1.78, 1.83, 1.90, 1.95, 1.98, 2.05, 2.15],
};

exports.handler = async () => {
  const curves = {};
  for (const c of COUNTRIES) {
    curves[c.code] = {};
    DEMO[c.code].forEach((v, i) => { curves[c.code][TENORS[i]] = v; });
  }
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({
      asOf:      new Date().toISOString().slice(0, 10),
      tenors:    TENORS,
      countries: COUNTRIES,
      curves,
    }),
  };
};
