// app.js — Global Bonds Market
// Sections: Rates table | Yield curve | Yield heatmap | Key interest rates | Events

// ══════════════════════════════════════════════════════════════════════════════
// ── Section navigation ────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

const SECTIONS = ["rates", "yield-curve", "heatmap", "key-rates", "events"];
const loaded   = new Set(["rates"]);

function showSection(name) {
  SECTIONS.forEach(s => { document.getElementById(`sec-${s}`).hidden = s !== name; });
  document.querySelectorAll(".mtab").forEach(t =>
    t.classList.toggle("active", t.dataset.sec === name)
  );
  if (!loaded.has(name)) {
    loaded.add(name);
    ({ "yield-curve": initYieldCurve, heatmap: initHeatmap,
       "key-rates": initKeyRates, events: initEvents }[name] || (() => {}))();
  }
  // Resize any visible Chart.js charts after DOM is shown
  requestAnimationFrame(() => {
    [ycChart, krChart].forEach(c => c?.resize());
  });
}

document.getElementById("main-tabs").addEventListener("click", e => {
  const tab = e.target.closest(".mtab");
  if (tab) showSection(tab.dataset.sec);
});

// ══════════════════════════════════════════════════════════════════════════════
// ── SECTION 1: Rates table ────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

let allBonds   = [];
let sortCol    = "yield10y";
let sortDir    = "desc";
let activeReg  = "All";
let searchQ    = "";
let refreshTmr = null;
let countdown  = 60;

const tbody      = document.getElementById("bonds-body");
const statusMsg  = document.getElementById("status-msg");
const lastUpdate = document.getElementById("last-update");
const cntdownEl  = document.getElementById("countdown");
const rowCountEl = document.getElementById("row-count");
const refreshBtn = document.getElementById("refresh-btn");
const searchEl   = document.getElementById("search");

const RATING_ORDER = [
  "Aaa","Aa1","Aa2","Aa3","A1","A2","A3",
  "Baa1","Baa2","Baa3","Ba1","Ba2","Ba3",
  "B1","B2","B3","Caa1","Caa2","Caa3","Ca","C",
];
const ratingScore = r => { const i = RATING_ORDER.indexOf(r); return i === -1 ? 99 : i; };
const ratingClass = r => {
  if (!r) return "";
  if (r.startsWith("Aaa")) return "rtg-aaa";
  if (r.startsWith("Aa"))  return "rtg-aa";
  if (r.startsWith("A"))   return "rtg-a";
  if (r.startsWith("Baa")) return "rtg-bbb";
  if (r.startsWith("Ba"))  return "rtg-bb";
  if (r.startsWith("B"))   return "rtg-b";
  return "rtg-ccc";
};

const fmtYield = v => v == null ? "—" : v.toFixed(2) + "%";
const fmtChg = v => {
  if (v == null) return { text:"—", cls:"chg-zero", cellCls:"" };
  const text = (v > 0 ? "+" : "") + v.toFixed(2) + "pp";
  const cls     = v >  0.0049 ? "chg-pos" : v < -0.0049 ? "chg-neg" : "chg-zero";
  const cellCls = v >  0.0049 ? "chg-cell-pos" : v < -0.0049 ? "chg-cell-neg" : "";
  return { text, cls, cellCls };
};

function getVisible() {
  return allBonds
    .filter(b => activeReg === "All" || b.region === activeReg)
    .filter(b => {
      if (!searchQ) return true;
      const q = searchQ.toLowerCase();
      return b.name.toLowerCase().includes(q) || b.code.toLowerCase().includes(q);
    });
}

function sortBonds(bonds) {
  return [...bonds].sort((a, b) => {
    if (sortCol === "name")   return sortDir === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    if (sortCol === "rating") { const av = ratingScore(a.rating), bv = ratingScore(b.rating); return sortDir === "asc" ? av - bv : bv - av; }
    const av = a[sortCol] ?? -Infinity, bv = b[sortCol] ?? -Infinity;
    return sortDir === "asc" ? av - bv : bv - av;
  });
}

function renderTable() {
  const vis = sortBonds(getVisible());
  rowCountEl.textContent = `${vis.length} bond${vis.length !== 1 ? "s" : ""} shown`;
  if (!vis.length) { tbody.innerHTML = `<tr><td colspan="9" class="placeholder">No results found.</td></tr>`; return; }

  tbody.innerHTML = vis.map(b => {
    const [c1d,c1w,c1m,c6m,c1y] = [b.change1d,b.change1w,b.change1m,b.change6m,b.change1y].map(fmtChg);
    const dot = b.src === "live"
      ? `<span class="src-dot src-live" title="Live"></span>`
      : `<span class="src-dot src-demo" title="Demo"></span>`;
    return `
      <tr data-code="${b.code}">
        <td class="col-flag-cell">${b.flag}</td>
        <td class="col-name-cell">${dot}<span class="country-name">${b.name}</span><span class="country-code">${b.code}</span></td>
        <td><span class="yield-val">${fmtYield(b.yield10y)}</span></td>
        <td class="${c1d.cellCls}"><span class="${c1d.cls}">${c1d.text}</span></td>
        <td class="${c1w.cellCls}"><span class="${c1w.cls}">${c1w.text}</span></td>
        <td class="${c1m.cellCls}"><span class="${c1m.cls}">${c1m.text}</span></td>
        <td class="${c6m.cellCls}"><span class="${c6m.cls}">${c6m.text}</span></td>
        <td class="${c1y.cellCls}"><span class="${c1y.cls}">${c1y.text}</span></td>
        <td><span class="rating-badge ${ratingClass(b.rating)}">${b.rating || "—"}</span></td>
      </tr>`;
  }).join("");
}

function flashRows(newBonds) {
  const old = new Map(allBonds.map(b => [b.code, b.yield10y]));
  allBonds = newBonds;
  renderTable();
  newBonds.forEach(b => {
    const prev = old.get(b.code);
    if (prev == null || Math.abs(b.yield10y - prev) < 0.001) return;
    const row = tbody.querySelector(`tr[data-code="${b.code}"]`);
    if (!row) return;
    const cls = b.yield10y > prev ? "flash-red" : "flash-green";
    row.classList.remove("flash-green","flash-red"); void row.offsetWidth;
    row.classList.add(cls);
    row.addEventListener("animationend", () => row.classList.remove(cls), { once:true });
  });
}

async function loadRates() {
  refreshBtn.classList.add("spinning"); refreshBtn.disabled = true;
  statusMsg.textContent = "Fetching market data…";
  try {
    const res = await fetch("/api/bonds-table", { cache:"no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    allBonds.length === 0 ? (allBonds = data.bonds, renderTable()) : flashRows(data.bonds);
    const now = new Date().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit", second:"2-digit" });
    lastUpdate.textContent = `Updated ${now}`;
    const live = data.liveCount ?? 0, total = data.totalCount ?? data.bonds.length;
    statusMsg.textContent = `As of ${data.asOf} · ${live}/${total} live · ${total - live} demo fallback`;
  } catch(err) {
    statusMsg.textContent = `Error: ${err.message}`;
    if (!allBonds.length) tbody.innerHTML = `<tr><td colspan="9" class="placeholder">Failed to load. Try refreshing.</td></tr>`;
  } finally {
    refreshBtn.classList.remove("spinning"); refreshBtn.disabled = false;
  }
}

function startCountdown() {
  countdown = 60; clearInterval(refreshTmr);
  refreshTmr = setInterval(() => {
    cntdownEl.textContent = `Refreshing in ${--countdown}s`;
    if (countdown <= 0) { clearInterval(refreshTmr); cntdownEl.textContent = "Refreshing…"; loadRates().then(startCountdown); }
  }, 1000);
}

// Sorting
document.querySelectorAll("th.sortable").forEach(th => {
  th.addEventListener("click", () => {
    const col = th.dataset.col;
    sortDir = sortCol === col ? (sortDir === "asc" ? "desc" : "asc") : (col === "name" ? "asc" : "desc");
    sortCol = col;
    document.querySelectorAll("th.sortable").forEach(h => h.classList.remove("sort-asc","sort-desc"));
    th.classList.add(sortDir === "asc" ? "sort-asc" : "sort-desc");
    renderTable();
  });
});
document.querySelector(`th[data-col="${sortCol}"]`)?.classList.add("sort-desc");

// Region tabs
document.getElementById("region-tabs").addEventListener("click", e => {
  const tab = e.target.closest(".tab"); if (!tab) return;
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  tab.classList.add("active"); activeReg = tab.dataset.region; renderTable();
});

// Search
searchEl.addEventListener("input", () => { searchQ = searchEl.value.trim(); renderTable(); });

// Refresh button
refreshBtn.addEventListener("click", () => {
  clearInterval(refreshTmr); cntdownEl.textContent = "Refreshing…";
  loadRates().then(startCountdown);
});

// ══════════════════════════════════════════════════════════════════════════════
// ── SECTION 2: Yield Curve ────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

let ycChart = null;
let ycData  = null;
const ycActive = new Set();

async function initYieldCurve() {
  try {
    const res = await fetch("/api/yield-curves", { cache:"no-store" });
    ycData = await res.json();
    ycData.countries.forEach(c => ycActive.add(c.code));
    buildToggles("yc-toggles", ycData.countries, ycActive, renderYCChart);
    renderYCChart();
    document.getElementById("yc-status").textContent =
      `Data as of ${ycData.asOf}. Yield curves reflect approximate early-2026 market levels.`;
  } catch(e) {
    document.getElementById("yc-status").textContent = `Error: ${e.message}`;
  }
}

function renderYCChart() {
  const ctx = document.getElementById("yc-chart");
  if (ycChart) ycChart.destroy();
  const datasets = ycData.countries
    .filter(c => ycActive.has(c.code))
    .map(c => ({
      label:            c.name,
      data:             ycData.tenors.map(t => ycData.curves[c.code][t]),
      borderColor:      c.color,
      backgroundColor:  c.color + "18",
      borderWidth:      2,
      pointRadius:      4,
      pointBackgroundColor: c.color,
      tension:          0.3,
      fill:             false,
      spanGaps:         true,
    }));
  ycChart = new Chart(ctx, {
    type: "line",
    data: { labels: ycData.tenors, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        x: { grid:{ color:"#2a2f45" }, ticks:{ color:"#9598a1" } },
        y: {
          grid:{ color:"#2a2f45" }, ticks:{ color:"#9598a1", callback: v => v + "%" },
          title:{ display:true, text:"Yield %", color:"#9598a1" },
        },
      },
      plugins: {
        legend:{ display:false },
        tooltip:{ callbacks:{ label: c => `${c.dataset.label}: ${c.parsed.y?.toFixed(3) ?? "—"}%` } },
      },
    },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// ── SECTION 3: Yield Heatmap ──────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

const HM_TENORS      = ["1M","3M","6M","1Y","2Y","5Y","10Y","30Y"];
const HM_TENOR_LABEL = {
  "1M":"1 month","3M":"3 months","6M":"6 months","1Y":"1 year",
  "2Y":"2 years","5Y":"5 years","10Y":"10 years","30Y":"30 years",
};

async function initHeatmap() {
  try {
    if (!ycData) { const r = await fetch("/api/yield-curves",{cache:"no-store"}); ycData = await r.json(); }
    renderHeatmap();
  } catch(e) {
    document.getElementById("heatmap-tbl").innerHTML =
      `<tr><td colspan="9" class="placeholder">Error: ${e.message}</td></tr>`;
  }
}

function renderHeatmap() {
  // Build global min/max for colour scale
  const all = [];
  for (const c of ycData.countries)
    for (const t of HM_TENORS) { const v = ycData.curves[c.code][t]; if (v != null) all.push(v); }
  const minV = Math.min(...all), maxV = Math.max(...all);

  const cellBg = v => {
    if (v == null) return "";
    const pct = Math.max(0, Math.min(1, (v - minV) / (maxV - minV)));
    return `background:rgba(38,166,154,${(0.12 + pct * 0.78).toFixed(2)})`;
  };

  document.getElementById("heatmap-tbl").innerHTML = `
    <thead><tr>
      <th class="hm-country-col">Country</th>
      ${HM_TENORS.map(t => `<th>${HM_TENOR_LABEL[t]}</th>`).join("")}
    </tr></thead>
    <tbody>
      ${ycData.countries.map(c => `
        <tr>
          <td><div class="hm-country-cell"><span class="hm-flag">${c.flag}</span><span>${c.name}</span></div></td>
          ${HM_TENORS.map(t => {
            const v = ycData.curves[c.code][t];
            return `<td class="hm-val-cell ${v == null ? "hm-null" : ""}" style="${cellBg(v)}">${v != null ? v.toFixed(3)+"%" : "—"}</td>`;
          }).join("")}
        </tr>`).join("")}
    </tbody>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// ── SECTION 4: Key Interest Rates ─────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

let krChart   = null;
let krData    = null;
let krRange   = "10y";
const krActive = new Set();

async function initKeyRates() {
  try {
    const res = await fetch("/api/key-rates", { cache:"no-store" });
    krData = await res.json();
    krData.countries.forEach(c => krActive.add(c.code));
    buildToggles("kr-toggles", krData.countries, krActive, renderKRChart);
    renderKRChart();
  } catch(e) { console.error("Key rates:", e); }
}

function getRangeCutoff(range) {
  const now = new Date("2026-02-28");
  if (range === "1y")  return new Date(now.getFullYear()-1,  now.getMonth(), now.getDate());
  if (range === "5y")  return new Date(now.getFullYear()-5,  now.getMonth(), now.getDate());
  if (range === "10y") return new Date(now.getFullYear()-10, now.getMonth(), now.getDate());
  return new Date("2010-01-01");
}

// Expand step-function data into one point per month for smooth Chart.js rendering
function toMonthly(history, from, to) {
  const pts = []; const d = new Date(from);
  while (d <= to) {
    let rate = null;
    for (let i = history.length - 1; i >= 0; i--) {
      if (new Date(history[i][0]) <= d) { rate = history[i][1]; break; }
    }
    if (rate !== null) pts.push({ x: d.toISOString().slice(0,10), y: rate });
    d.setMonth(d.getMonth() + 1);
  }
  return pts;
}

function renderKRChart() {
  const ctx  = document.getElementById("kr-chart");
  if (krChart) krChart.destroy();
  const from = getRangeCutoff(krRange), to = new Date("2026-02-28");
  const datasets = krData.countries
    .filter(c => krActive.has(c.code))
    .map(c => ({
      label:           c.label,
      data:            toMonthly(krData.history[c.code] ?? [], from, to),
      borderColor:     c.color,
      backgroundColor: c.color + "18",
      borderWidth:     2,
      pointRadius:     0,
      stepped:         "before",
      fill:            false,
    }));
  krChart = new Chart(ctx, {
    type: "line",
    data: { datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        x: {
          type: "time",
          time: { unit: "year", displayFormats: { year:"yyyy", month:"MMM yyyy" } },
          grid: { color:"#2a2f45" }, ticks: { color:"#9598a1", maxTicksLimit:12 },
        },
        y: {
          grid: { color:"#2a2f45" }, ticks: { color:"#9598a1", callback: v => v + "%" },
          title: { display:true, text:"Rate %", color:"#9598a1" },
        },
      },
      plugins: {
        legend: { display:false },
        tooltip: { callbacks: { label: c => `${c.dataset.label}: ${c.parsed.y?.toFixed(2) ?? "—"}%` } },
      },
    },
  });
}

// Time-range buttons
document.getElementById("kr-time-btns").addEventListener("click", e => {
  const btn = e.target.closest(".trb"); if (!btn) return;
  document.querySelectorAll(".trb").forEach(b => b.classList.remove("active"));
  btn.classList.add("active"); krRange = btn.dataset.range;
  if (krChart) renderKRChart();
});

// ══════════════════════════════════════════════════════════════════════════════
// ── SECTION 5: Interest Rate Events ──────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

async function initEvents() {
  const grid = document.getElementById("events-grid");
  try {
    const res = await fetch("/api/rate-events", { cache:"no-store" });
    const { events } = await res.json();
    renderEvents(events, grid);
  } catch(e) { grid.innerHTML = `<div class="placeholder">Error: ${e.message}</div>`; }
}

function renderEvents(events, grid) {
  const TODAY    = "2026-02-28";
  const TOMORROW = "2026-03-01";
  const dtLabel  = d => {
    if (d === TODAY)    return "Today";
    if (d === TOMORROW) return "Tomorrow";
    return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month:"short", day:"numeric" });
  };
  const val = v => v ?? "—";
  const impDot = imp =>
    `<span class="evt-imp evt-imp-${imp === "high" ? "high" : "med"}" title="${imp} importance"></span>`;

  grid.innerHTML = events.map(e => `
    <div class="evt-card">
      <div class="evt-header">
        <span class="evt-when">${dtLabel(e.date)} · ${e.time}</span>
        ${impDot(e.importance)}
      </div>
      <div class="evt-body">
        <span class="evt-flag">${e.flag}</span>
        <span class="evt-title">${e.title}</span>
      </div>
      <div class="evt-footer">
        <span class="evt-col"><small>Actual</small><strong>${val(e.actual)}</strong></span>
        <span class="evt-col"><small>Forecast</small><strong>${val(e.forecast)}</strong></span>
        <span class="evt-col"><small>Prior</small><strong>${val(e.prior)}</strong></span>
      </div>
    </div>`).join("");
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Shared: country toggle builder ───────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

function buildToggles(containerId, countries, activeSet, onchange) {
  const wrap = document.getElementById(containerId);
  wrap.innerHTML = "";
  countries.forEach(c => {
    const lbl = document.createElement("label");
    lbl.className = "ctog is-active";
    lbl.style.setProperty("--cc", c.color);
    lbl.innerHTML = `<input type="checkbox" checked><span class="ctog-dot"></span>${c.flag} ${c.label ?? c.name}`;
    const cb = lbl.querySelector("input");
    cb.addEventListener("change", () => {
      if (cb.checked) { activeSet.add(c.code); lbl.classList.replace("is-inactive","is-active"); }
      else            { activeSet.delete(c.code); lbl.classList.replace("is-active","is-inactive"); }
      onchange();
    });
    wrap.appendChild(lbl);
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Boot ──────────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

loadRates().then(startCountdown);
