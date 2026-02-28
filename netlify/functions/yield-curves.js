// yield-curves.js
// Returns full yield curve data (multiple tenors) for available countries.
// Data is populated daily by fetch-bonds.js and stored in Netlify Blobs.
// Only countries with live data are returned — no demo fallback.
//
// GET /api/yield-curves
// Response: { asOf, tenors, countries, curves }

const { getStore } = require("@netlify/blobs");

exports.handler = async (event, context) => {
  try {
    const store = getStore({
      name:   "bonds-cache",
      siteID: process.env.NETLIFY_SITE_ID || process.env.SITE_ID,
      token:  process.env.NETLIFY_AUTH_TOKEN,
    });
    const data = await store.get("yield-curves", { type: "json" });

    if (!data || !data.countries || data.countries.length === 0) {
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=3600",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          asOf: null,
          tenors: [],
          countries: [],
          curves: {},
          status: "Data not yet available. The daily import runs at 06:00 UTC.",
        }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error("yield-curves error:", err);
    // Return empty payload rather than 500 so the frontend can show a friendly message
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        asOf: null,
        tenors: [],
        countries: [],
        curves: {},
        status: "Yield curve data not yet available — updates daily at 06:00 UTC.",
      }),
    };
  }
};
