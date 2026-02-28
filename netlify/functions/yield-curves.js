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
    const store = getStore({ name: "bonds-cache", consistency: "strong" });
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
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Failed to load yield curve data." }),
    };
  }
};
