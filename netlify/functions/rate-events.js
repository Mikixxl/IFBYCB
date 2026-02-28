// rate-events.js
// Returns upcoming central bank events (speeches, rate decisions).
// Demo data with realistic early-2026 calendar.
//
// GET /api/rate-events
// Response: { events: [...] }

const EVENTS = [
  // ── March 2026 ──────────────────────────────────────────────────────────────
  {
    date: "2026-03-01", time: "16:00",
    code: "DE", flag: "🇩🇪", title: "Bundesbank Nagel Speech",
    importance: "medium", actual: null, forecast: null, prior: null,
  },
  {
    date: "2026-03-02", time: "01:00",
    code: "CA", flag: "🇨🇦", title: "BoC Kozicki Speech",
    importance: "medium", actual: null, forecast: null, prior: null,
  },
  {
    date: "2026-03-02", time: "02:30",
    code: "JP", flag: "🇯🇵", title: "BOJ Himino Speech",
    importance: "medium", actual: null, forecast: null, prior: null,
  },
  {
    date: "2026-03-04", time: "15:00",
    code: "US", flag: "🇺🇸", title: "Fed Waller Speech",
    importance: "medium", actual: null, forecast: null, prior: null,
  },
  {
    date: "2026-03-06", time: "14:15",
    code: "EU", flag: "🇪🇺", title: "ECB Lagarde Speech",
    importance: "medium", actual: null, forecast: null, prior: null,
  },
  {
    date: "2026-03-12", time: "09:00",
    code: "AU", flag: "🇦🇺", title: "RBA Rate Decision",
    importance: "high", actual: null, forecast: "4.10%", prior: "4.10%",
  },
  {
    date: "2026-03-12", time: "19:00",
    code: "US", flag: "🇺🇸", title: "FOMC Rate Decision",
    importance: "high", actual: null, forecast: "4.25%", prior: "4.25%",
  },
  {
    date: "2026-03-12", time: "21:30",
    code: "US", flag: "🇺🇸", title: "Fed Powell Press Conference",
    importance: "high", actual: null, forecast: null, prior: null,
  },
  {
    date: "2026-03-19", time: "11:00",
    code: "GB", flag: "🇬🇧", title: "BoE Rate Decision",
    importance: "high", actual: null, forecast: "4.25%", prior: "4.50%",
  },
  {
    date: "2026-03-20", time: "14:15",
    code: "EU", flag: "🇪🇺", title: "ECB Rate Decision",
    importance: "high", actual: null, forecast: "2.00%", prior: "2.15%",
  },
  {
    date: "2026-03-20", time: "14:45",
    code: "EU", flag: "🇪🇺", title: "ECB Lagarde Press Conference",
    importance: "high", actual: null, forecast: null, prior: null,
  },
  {
    date: "2026-03-24", time: "09:00",
    code: "NZ", flag: "🇳🇿", title: "RBNZ Rate Decision",
    importance: "high", actual: null, forecast: "3.50%", prior: "3.75%",
  },
  {
    date: "2026-03-25", time: "03:00",
    code: "JP", flag: "🇯🇵", title: "BOJ Rate Decision",
    importance: "high", actual: null, forecast: "0.50%", prior: "0.50%",
  },
  {
    date: "2026-03-26", time: "15:30",
    code: "US", flag: "🇺🇸", title: "Fed Barr Speech",
    importance: "medium", actual: null, forecast: null, prior: null,
  },
  // ── April 2026 ──────────────────────────────────────────────────────────────
  {
    date: "2026-04-02", time: "14:00",
    code: "CA", flag: "🇨🇦", title: "BoC Rate Decision",
    importance: "high", actual: null, forecast: "2.75%", prior: "3.00%",
  },
  {
    date: "2026-04-07", time: "09:30",
    code: "SE", flag: "🇸🇪", title: "Riksbank Rate Decision",
    importance: "high", actual: null, forecast: "1.75%", prior: "2.00%",
  },
  {
    date: "2026-04-08", time: "14:15",
    code: "EU", flag: "🇪🇺", title: "ECB Rate Decision",
    importance: "high", actual: null, forecast: "1.90%", prior: "2.00%",
  },
  {
    date: "2026-04-15", time: "03:00",
    code: "CN", flag: "🇨🇳", title: "PBoC LPR Rate Decision",
    importance: "high", actual: null, forecast: "3.10%", prior: "3.10%",
  },
  {
    date: "2026-04-22", time: "13:00",
    code: "CA", flag: "🇨🇦", title: "BoC Summary of Deliberations",
    importance: "medium", actual: null, forecast: null, prior: null,
  },
  {
    date: "2026-04-28", time: "19:00",
    code: "US", flag: "🇺🇸", title: "FOMC Rate Decision",
    importance: "high", actual: null, forecast: "4.00%", prior: "4.25%",
  },
  {
    date: "2026-04-30", time: "03:00",
    code: "JP", flag: "🇯🇵", title: "BOJ Rate Decision",
    importance: "high", actual: null, forecast: "0.75%", prior: "0.50%",
  },
];

exports.handler = async () => ({
  statusCode: 200,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "public, max-age=3600",
    "Access-Control-Allow-Origin": "*",
  },
  body: JSON.stringify({ events: EVENTS }),
});
