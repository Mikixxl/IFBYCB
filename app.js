// app.js — Global Bonds Market frontend
// Fetches data from /api/bonds-table, renders a sortable/filterable table,
// and auto-refreshes every 60 seconds.

// ── State ─────────────────────────────────────────────────────────────────────
let allBonds     = [];
let sortCol      = "yield10y";
let sortDir      = "desc";      // "asc" | "desc"
let activeRegion = "All";
let searchQuery  = "";
let refreshTimer = null;
let countdown    = 60;

// ── DOM refs ──────────────────────────────────────────────────────────────────
const tbody       = document.getElementById("bonds-body");
const statusMsg   = document.getElementById("status-msg");
const lastUpdate  = document.getElementById("last-update");
const countdownEl = document.getElementById("countdown");
const rowCountEl  = document.getElementById("row-count");
const refreshBtn  = document.getElementById("refresh-btn");
const searchEl    = document.getElementById("search");

// ── Rating → sort score (lower = better) ─────────────────────────────────────
const RATING_ORDER = [
  "Aaa","Aa1","Aa2","Aa3",
  "A1","A2","A3",
  "Baa1","Baa2","Baa3",
  "Ba1","Ba2","Ba3",
  "B1","B2","B3",
  "Caa1","Caa2","Caa3","Ca","C",
];
const ratingScore = (r) => {
  const i = RATING_ORDER.indexOf(r);
  return i === -1 ? 99 : i;
};

// Rating → CSS class
const ratingClass = (r) => {
  if (!r) return "";
  if (r.startsWith("Aaa"))         return "rtg-aaa";
  if (r.startsWith("Aa"))          return "rtg-aa";
  if (r.startsWith("A"))           return "rtg-a";
  if (r.startsWith("Baa"))         return "rtg-bbb";
  if (r.startsWith("Ba"))          return "rtg-bb";
  if (r.startsWith("B"))           return "rtg-b";
  return "rtg-ccc";
};

// ── Format helpers ────────────────────────────────────────────────────────────
const fmtYield = (v) =>
  v == null ? "—" : v.toFixed(2) + "%";

const fmtChg = (v) => {
  if (v == null) return { text: "—", cls: "chg-zero", cellCls: "" };
  const sign  = v > 0 ? "+" : "";
  const text  = sign + v.toFixed(2) + "pp";
  const cls   = v > 0.0049 ? "chg-pos" : v < -0.0049 ? "chg-neg" : "chg-zero";
  const cellCls = v > 0.0049 ? "chg-cell-pos" : v < -0.0049 ? "chg-cell-neg" : "";
  return { text, cls, cellCls };
};

// ── Render table ──────────────────────────────────────────────────────────────
function getVisibleBonds() {
  return allBonds
    .filter((b) => activeRegion === "All" || b.region === activeRegion)
    .filter((b) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return b.name.toLowerCase().includes(q) || b.code.toLowerCase().includes(q);
    });
}

function sortBonds(bonds) {
  return [...bonds].sort((a, b) => {
    let av, bv;
    if (sortCol === "name") {
      av = a.name; bv = b.name;
      return sortDir === "asc"
        ? av.localeCompare(bv)
        : bv.localeCompare(av);
    }
    if (sortCol === "rating") {
      av = ratingScore(a.rating); bv = ratingScore(b.rating);
    } else {
      av = a[sortCol] ?? -Infinity;
      bv = b[sortCol] ?? -Infinity;
    }
    return sortDir === "asc" ? av - bv : bv - av;
  });
}

function renderTable() {
  const visible = sortBonds(getVisibleBonds());
  rowCountEl.textContent = `${visible.length} bond${visible.length !== 1 ? "s" : ""} shown`;

  if (!visible.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="placeholder">No results found.</td></tr>`;
    return;
  }

  const html = visible.map((b) => {
    const c1d = fmtChg(b.change1d);
    const c1w = fmtChg(b.change1w);
    const c1m = fmtChg(b.change1m);
    const c6m = fmtChg(b.change6m);
    const c1y = fmtChg(b.change1y);
    const srcDot = b.src === "live"
      ? `<span class="src-dot src-live" title="Live data"></span>`
      : `<span class="src-dot src-demo" title="Demo data"></span>`;

    return `
      <tr data-code="${b.code}">
        <td class="col-flag-cell">${b.flag}</td>
        <td class="col-name-cell">
          ${srcDot}<span class="country-name">${b.name}</span>
          <span class="country-code">${b.code}</span>
        </td>
        <td><span class="yield-val">${fmtYield(b.yield10y)}</span></td>
        <td class="${c1d.cellCls}"><span class="${c1d.cls}">${c1d.text}</span></td>
        <td class="${c1w.cellCls}"><span class="${c1w.cls}">${c1w.text}</span></td>
        <td class="${c1m.cellCls}"><span class="${c1m.cls}">${c1m.text}</span></td>
        <td class="${c6m.cellCls}"><span class="${c6m.cls}">${c6m.text}</span></td>
        <td class="${c1y.cellCls}"><span class="${c1y.cls}">${c1y.text}</span></td>
        <td><span class="rating-badge ${ratingClass(b.rating)}">${b.rating || "—"}</span></td>
      </tr>`;
  }).join("");

  tbody.innerHTML = html;
}

// Flash animation when yields change after a refresh
function flashChangedRows(newBonds) {
  const oldMap = new Map(allBonds.map((b) => [b.code, b.yield10y]));
  allBonds = newBonds;
  renderTable();

  newBonds.forEach((b) => {
    const oldYield = oldMap.get(b.code);
    if (oldYield == null || Math.abs(b.yield10y - oldYield) < 0.001) return;
    const row = tbody.querySelector(`tr[data-code="${b.code}"]`);
    if (!row) return;
    const cls = b.yield10y > oldYield ? "flash-red" : "flash-green";
    row.classList.remove("flash-green", "flash-red");
    // force reflow so re-adding the class triggers the animation
    void row.offsetWidth;
    row.classList.add(cls);
    row.addEventListener("animationend", () => row.classList.remove(cls), { once: true });
  });
}

// ── Fetch & load data ─────────────────────────────────────────────────────────
async function loadData() {
  refreshBtn.classList.add("spinning");
  refreshBtn.disabled = true;
  statusMsg.textContent = "Fetching market data…";

  try {
    const res = await fetch("/api/bonds-table", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const isFirstLoad = allBonds.length === 0;
    if (isFirstLoad) {
      allBonds = data.bonds;
      renderTable();
    } else {
      flashChangedRows(data.bonds);
    }

    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    lastUpdate.textContent = `Updated ${now}`;
    const live = data.liveCount ?? 0;
    const total = data.totalCount ?? data.bonds.length;
    statusMsg.textContent =
      `As of ${data.asOf} · ${live}/${total} live · ${total - live} demo fallback`;

  } catch (err) {
    statusMsg.textContent = `Error: ${err.message}`;
    if (allBonds.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="placeholder">Failed to load data. Please try again.</td></tr>`;
    }
  } finally {
    refreshBtn.classList.remove("spinning");
    refreshBtn.disabled = false;
  }
}

// ── Auto-refresh (60-second countdown) ───────────────────────────────────────
function startCountdown() {
  countdown = 60;
  clearInterval(refreshTimer);
  refreshTimer = setInterval(() => {
    countdown--;
    countdownEl.textContent = `Refreshing in ${countdown}s`;
    if (countdown <= 0) {
      clearInterval(refreshTimer);
      countdownEl.textContent = "Refreshing…";
      loadData().then(startCountdown);
    }
  }, 1000);
}

// ── Sorting ───────────────────────────────────────────────────────────────────
document.querySelectorAll("th.sortable").forEach((th) => {
  th.addEventListener("click", () => {
    const col = th.dataset.col;
    if (sortCol === col) {
      sortDir = sortDir === "asc" ? "desc" : "asc";
    } else {
      sortCol = col;
      sortDir = col === "name" ? "asc" : "desc";
    }

    document.querySelectorAll("th.sortable").forEach((h) =>
      h.classList.remove("sort-asc", "sort-desc")
    );
    th.classList.add(sortDir === "asc" ? "sort-asc" : "sort-desc");
    renderTable();
  });
});

// Default sort indicator
document.querySelector(`th[data-col="${sortCol}"]`)?.classList.add("sort-desc");

// ── Region tabs ───────────────────────────────────────────────────────────────
document.getElementById("region-tabs").addEventListener("click", (e) => {
  const tab = e.target.closest(".tab");
  if (!tab) return;
  document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
  tab.classList.add("active");
  activeRegion = tab.dataset.region;
  renderTable();
});

// ── Search ────────────────────────────────────────────────────────────────────
searchEl.addEventListener("input", () => {
  searchQuery = searchEl.value.trim();
  renderTable();
});

// ── Manual refresh button ─────────────────────────────────────────────────────
refreshBtn.addEventListener("click", () => {
  clearInterval(refreshTimer);
  countdownEl.textContent = "Refreshing…";
  loadData().then(startCountdown);
});

// ── Boot ──────────────────────────────────────────────────────────────────────
loadData().then(startCountdown);
