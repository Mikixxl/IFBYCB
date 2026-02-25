/* ═══════════════════════════════════════════════════════════
   BondCalc Pro — app.js
   Fixed Income Analytics Engine
   ═══════════════════════════════════════════════════════════ */

'use strict';

/* ─── MATH ENGINE ─────────────────────────────────────────── */

/**
 * Calculate the fair value (clean price) of a fixed-rate bond.
 * @param {number} face       Face/par value
 * @param {number} couponRate Annual coupon rate as a percentage (e.g. 5 for 5%)
 * @param {number} ytm        Yield to maturity as a percentage
 * @param {number} years      Years to maturity
 * @param {number} freq       Coupon payments per year (1, 2, 4, 12)
 * @returns {number} Bond price
 */
function bondPrice(face, couponRate, ytm, years, freq) {
  const n = Math.round(years * freq);          // total periods
  const c = (couponRate / 100 * face) / freq;  // coupon per period
  const r = ytm / 100 / freq;                  // periodic yield

  if (r === 0) return c * n + face;            // edge-case: zero yield

  let price = 0;
  for (let t = 1; t <= n; t++) {
    price += c / Math.pow(1 + r, t);
  }
  price += face / Math.pow(1 + r, n);
  return price;
}

/**
 * Solve for Yield to Maturity using Newton-Raphson iteration.
 * @param {number} face       Face/par value
 * @param {number} couponRate Annual coupon rate (%)
 * @param {number} price      Current market price
 * @param {number} years      Years to maturity
 * @param {number} freq       Coupon payments per year
 * @returns {number} YTM as a decimal (e.g. 0.06 for 6%)
 */
function solveYTM(face, couponRate, price, years, freq) {
  const n   = Math.round(years * freq);
  const c   = (couponRate / 100 * face) / freq;

  // Initial guess: use current yield as starting point
  let ytm = (couponRate / 100 * face) / price;
  if (ytm <= 0 || !isFinite(ytm)) ytm = 0.05;

  for (let iter = 0; iter < 300; iter++) {
    const r = ytm / freq;
    let pv  = 0;
    let dpv = 0;

    for (let t = 1; t <= n; t++) {
      const d  = Math.pow(1 + r, t);
      pv  += c / d;
      dpv -= t * c / (d * (1 + r)) / freq;
    }
    const dn  = Math.pow(1 + r, n);
    pv  += face / dn;
    dpv -= n * face / (dn * (1 + r)) / freq;

    const f  = pv - price;
    const df = dpv;
    if (Math.abs(df) < 1e-14) break;

    const next = ytm - f / df;
    if (Math.abs(next - ytm) < 1e-10) { ytm = next; break; }
    ytm = next;
  }
  return ytm;  // decimal form
}

/**
 * Calculate Macaulay and Modified Duration.
 * @returns {{ macDur: number, modDur: number }}
 */
function duration(face, couponRate, ytm, years, freq) {
  const n    = Math.round(years * freq);
  const c    = (couponRate / 100 * face) / freq;
  const r    = ytm / 100 / freq;
  const price = bondPrice(face, couponRate, ytm, years, freq);

  let mac = 0;
  for (let t = 1; t <= n; t++) {
    mac += (t / freq) * (c / Math.pow(1 + r, t));
  }
  mac += (n / freq) * (face / Math.pow(1 + r, n));
  mac /= price;

  const mod = mac / (1 + r);
  return { macDur: mac, modDur: mod };
}

/**
 * Calculate annual convexity.
 */
function convexity(face, couponRate, ytm, years, freq) {
  const n     = Math.round(years * freq);
  const c     = (couponRate / 100 * face) / freq;
  const r     = ytm / 100 / freq;
  const price = bondPrice(face, couponRate, ytm, years, freq);

  let conv = 0;
  for (let t = 1; t <= n; t++) {
    conv += t * (t + 1) * c / Math.pow(1 + r, t + 2);
  }
  conv += n * (n + 1) * face / Math.pow(1 + r, n + 2);
  conv /= (price * freq * freq);
  return conv;
}

/**
 * Build the full cash flow schedule with PV breakdown.
 * @returns {Array<Object>}
 */
function cashFlows(face, couponRate, ytm, years, freq) {
  const n    = Math.round(years * freq);
  const c    = (couponRate / 100 * face) / freq;
  const r    = ytm / 100 / freq;
  const rows = [];
  let cumPV  = 0;

  for (let t = 1; t <= n; t++) {
    const principal = t === n ? face : 0;
    const cf        = c + principal;
    const pv        = cf / Math.pow(1 + r, t);
    cumPV += pv;
    rows.push({
      period:    t,
      year:      t / freq,
      coupon:    c,
      principal,
      cf,
      pv,
      cumPV,
    });
  }
  return rows;
}


/* ─── FORMATTING HELPERS ──────────────────────────────────── */

const fmt = {
  /** Format as US currency with 2 decimals */
  usd(v) {
    if (!isFinite(v)) return '—';
    const s = Math.abs(v).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (v < 0 ? '-$' : '$') + s;
  },
  /** Format as percentage with 4 decimals */
  pct(v, d = 4) {
    if (!isFinite(v)) return '—';
    return v.toFixed(d) + '%';
  },
  /** Format number with given decimals */
  num(v, d = 4) {
    if (!isFinite(v)) return '—';
    return v.toFixed(d);
  },
  /** Format as basis points */
  bps(v, d = 1) {
    if (!isFinite(v)) return '—';
    return v.toFixed(d) + ' bps';
  },
  /** Compact currency (e.g. for DV01) */
  usd2(v) {
    if (!isFinite(v)) return '—';
    const s = Math.abs(v).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (v < 0 ? '-$' : '$') + s;
  },
};


/* ─── TAB NAVIGATION ──────────────────────────────────────── */

document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});


/* ─── CHART REGISTRY ──────────────────────────────────────── */

const charts = {};

function destroyChart(id) {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
}

function priceYieldChartData(face, couponRate, years, freq, currentYTM) {
  const low  = Math.max(0.1, currentYTM - 5);
  const high = currentYTM + 5;
  const step = 0.1;
  const ys   = [];
  const ps   = [];
  for (let y = low; y <= high + 0.001; y += step) {
    const yr = Math.round(y * 1000) / 1000;
    ys.push(yr);
    ps.push(bondPrice(face, couponRate, yr, years, freq) / face * 100);
  }
  return { ys, ps };
}


/* ══════════════════════════════════════════════════════════════
   TAB 1 — BOND PRICER
══════════════════════════════════════════════════════════════ */

function runPricer() {
  const face   = parseFloat(document.getElementById('p-face').value);
  const coupon = parseFloat(document.getElementById('p-coupon').value);
  const years  = parseFloat(document.getElementById('p-maturity').value);
  const ytm    = parseFloat(document.getElementById('p-yield').value);
  const freq   = parseInt(document.getElementById('p-freq').value, 10);

  if ([face, coupon, years, ytm, freq].some(v => !isFinite(v) || v <= 0)) return;

  const price        = bondPrice(face, coupon, ytm, years, freq);
  const price100     = price / face * 100;
  const couponAnnual = coupon / 100 * face;
  const curYield     = couponAnnual / price * 100;
  const { macDur, modDur } = duration(face, coupon, ytm, years, freq);
  const conv         = convexity(face, coupon, ytm, years, freq);
  const dv01Bond     = modDur * price * 0.0001;
  const dv01Per1M    = dv01Bond * (1_000_000 / face);

  // Update DOM
  document.getElementById('r-clean-price').textContent   = fmt.usd(price);
  document.getElementById('r-price-100').textContent     = fmt.num(price100, 6);
  document.getElementById('r-current-yield').textContent = fmt.pct(curYield);
  document.getElementById('r-annual-coupon').textContent = fmt.usd(couponAnnual);
  document.getElementById('r-mac-dur').textContent       = fmt.num(macDur, 4) + ' yrs';
  document.getElementById('r-mod-dur').textContent       = fmt.num(modDur, 4) + ' yrs';
  document.getElementById('r-convexity').textContent     = fmt.num(conv, 4);
  document.getElementById('r-dv01').textContent          = fmt.usd(dv01Per1M);

  // Premium / Discount indicator
  const ind = document.getElementById('r-premium');
  if (price100 > 100.005) {
    ind.textContent = `Trading at PREMIUM — ${fmt.usd(price - face)} above par (${fmt.num(price100 - 100, 3)} pts)`;
    ind.className   = 'premium-indicator at-premium';
  } else if (price100 < 99.995) {
    ind.textContent = `Trading at DISCOUNT — ${fmt.usd(face - price)} below par (${fmt.num(100 - price100, 3)} pts)`;
    ind.className   = 'premium-indicator at-discount';
  } else {
    ind.textContent = 'Trading at PAR — bond priced at face value';
    ind.className   = 'premium-indicator at-par';
  }

  // Price-Yield Chart
  const { ys, ps } = priceYieldChartData(face, coupon, years, freq, ytm);
  const nearIdx     = ys.reduce((best, y, i) => Math.abs(y - ytm) < Math.abs(ys[best] - ytm) ? i : best, 0);

  const dotData = ps.map((p, i) => i === nearIdx ? p : null);

  destroyChart('price-yield');
  charts['price-yield'] = new Chart(
    document.getElementById('price-yield-chart').getContext('2d'),
    {
      type: 'line',
      data: {
        labels: ys.map(y => y.toFixed(1) + '%'),
        datasets: [
          {
            label: 'Bond Price per $100',
            data: ps,
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37,99,235,0.06)',
            fill: true,
            borderWidth: 2.5,
            pointRadius: 0,
            tension: 0.35,
            order: 2,
          },
          {
            label: `Current: YTM ${fmt.pct(ytm, 2)} → ${fmt.num(price100, 4)}`,
            data: dotData,
            borderColor: '#ef4444',
            backgroundColor: '#ef4444',
            pointRadius: dotData.map(v => v !== null ? 7 : 0),
            pointHoverRadius: 9,
            showLine: false,
            order: 1,
          },
        ],
      },
      options: chartOptions('Yield to Maturity (%)', 'Price per $100 Face'),
    }
  );
}

document.getElementById('calc-price').addEventListener('click', runPricer);


/* ══════════════════════════════════════════════════════════════
   TAB 2 — YTM CALCULATOR
══════════════════════════════════════════════════════════════ */

function runYTM() {
  const face   = parseFloat(document.getElementById('y-face').value);
  const coupon = parseFloat(document.getElementById('y-coupon').value);
  const years  = parseFloat(document.getElementById('y-maturity').value);
  const price  = parseFloat(document.getElementById('y-price').value);
  const freq   = parseInt(document.getElementById('y-freq').value, 10);

  if ([face, coupon, years, price, freq].some(v => !isFinite(v) || v <= 0)) return;

  const ytmDec   = solveYTM(face, coupon, price, years, freq);
  const ytmPct   = ytmDec * 100;
  const curYield = (coupon / 100 * face) / price * 100;
  const spread   = (ytmPct - curYield) * 100;  // bps
  const { macDur, modDur } = duration(face, coupon, ytmPct, years, freq);
  const conv     = convexity(face, coupon, ytmPct, years, freq);
  const dv01     = modDur * price * 0.0001;
  const dv01M    = dv01 * (1_000_000 / face);

  // Simple total return: (face - price + total coupons) / price
  const couponAnnual = coupon / 100 * face;
  const totalReturn  = ((face - price + couponAnnual * years) / price) * 100;

  document.getElementById('ry-ytm').textContent         = fmt.pct(ytmPct);
  document.getElementById('ry-current').textContent     = fmt.pct(curYield);
  document.getElementById('ry-spread').textContent      = fmt.bps(spread);
  document.getElementById('ry-total-return').textContent = fmt.pct(totalReturn);
  document.getElementById('ry-mac-dur').textContent     = fmt.num(macDur, 4) + ' yrs';
  document.getElementById('ry-mod-dur').textContent     = fmt.num(modDur, 4) + ' yrs';
  document.getElementById('ry-convexity').textContent   = fmt.num(conv, 4);
  document.getElementById('ry-dv01').textContent        = fmt.usd(dv01M);

  // Chart
  const { ys, ps } = priceYieldChartData(face, coupon, years, freq, ytmPct);
  const price100User = price / face * 100;
  const nearIdx      = ys.reduce((best, y, i) => Math.abs(y - ytmPct) < Math.abs(ys[best] - ytmPct) ? i : best, 0);
  const dotData      = ps.map((_, i) => i === nearIdx ? price100User : null);

  destroyChart('ytm');
  charts['ytm'] = new Chart(
    document.getElementById('ytm-chart').getContext('2d'),
    {
      type: 'line',
      data: {
        labels: ys.map(y => y.toFixed(1) + '%'),
        datasets: [
          {
            label: 'Bond Price per $100',
            data: ps,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16,185,129,0.06)',
            fill: true,
            borderWidth: 2.5,
            pointRadius: 0,
            tension: 0.35,
            order: 2,
          },
          {
            label: `Your Bond: ${fmt.pct(ytmPct, 4)} YTM`,
            data: dotData,
            borderColor: '#f59e0b',
            backgroundColor: '#f59e0b',
            pointRadius: dotData.map(v => v !== null ? 8 : 0),
            pointHoverRadius: 10,
            showLine: false,
            order: 1,
          },
        ],
      },
      options: chartOptions('Yield (%)', 'Price per $100 Face'),
    }
  );
}

document.getElementById('calc-ytm').addEventListener('click', runYTM);


/* ══════════════════════════════════════════════════════════════
   TAB 3 — DURATION & RISK
══════════════════════════════════════════════════════════════ */

function runRisk() {
  const face      = parseFloat(document.getElementById('ri-face').value);
  const coupon    = parseFloat(document.getElementById('ri-coupon').value);
  const years     = parseFloat(document.getElementById('ri-maturity').value);
  const ytm       = parseFloat(document.getElementById('ri-yield').value);
  const freq      = parseInt(document.getElementById('ri-freq').value, 10);
  const notional  = parseFloat(document.getElementById('ri-notional').value) * 1e6;

  if ([face, coupon, years, ytm, freq, notional].some(v => !isFinite(v) || v <= 0)) return;

  const price        = bondPrice(face, coupon, ytm, years, freq);
  const { macDur, modDur } = duration(face, coupon, ytm, years, freq);
  const conv         = convexity(face, coupon, ytm, years, freq);
  const dv01Bond     = modDur * price * 0.0001;
  const bpv          = dv01Bond / face * 100;   // per $100 face
  const portfolioDV01 = dv01Bond * (notional / face);

  document.getElementById('rr-mac-dur').textContent        = fmt.num(macDur, 4);
  document.getElementById('rr-mod-dur').textContent        = fmt.num(modDur, 4);
  document.getElementById('rr-convexity').textContent      = fmt.num(conv, 4);
  document.getElementById('rr-dv01').textContent           = fmt.usd(dv01Bond);
  document.getElementById('rr-bpv').textContent            = fmt.num(bpv, 4);
  document.getElementById('rr-portfolio-dv01').textContent = fmt.usd(portfolioDV01);

  // Scenario analysis
  const scenarios = [-200, -100, -50, -25, 0, 25, 50, 100, 200];
  const tbody     = document.getElementById('scenario-tbody');
  tbody.innerHTML = '';

  scenarios.forEach(bps => {
    const newYTM   = ytm + bps / 100;
    if (newYTM <= 0 && bps !== 0) {
      const tr = document.createElement('tr');
      if (bps === 0) tr.classList.add('base');
      tr.innerHTML = `
        <td>${bps === 0 ? 'Base (Current)' : (bps > 0 ? '+' : '') + bps + ' bps'}</td>
        <td colspan="5" style="text-align:center;color:#94a3b8">N/A (negative yield)</td>
      `;
      tbody.appendChild(tr);
      return;
    }

    const newPrice   = bondPrice(face, coupon, newYTM, years, freq);
    const delta      = newPrice - price;
    const pctChg     = delta / price * 100;
    const dy         = bps / 10000;
    const approxDelta = price * (-modDur * dy + 0.5 * conv * dy * dy);

    const tr = document.createElement('tr');
    if (bps === 0) tr.classList.add('base');
    tr.innerHTML = `
      <td>${bps === 0 ? 'Base (Current)' : (bps > 0 ? '+' : '') + bps + ' bps'}</td>
      <td>${fmt.pct(newYTM)}</td>
      <td>${fmt.num(newPrice / face * 100, 4)}</td>
      <td class="${delta >= 0 ? 'pos-change' : 'neg-change'}">${delta >= 0 ? '+' : ''}${fmt.usd(delta)}</td>
      <td class="${pctChg >= 0 ? 'pos-change' : 'neg-change'}">${pctChg >= 0 ? '+' : ''}${fmt.num(pctChg, 3)}%</td>
      <td>${approxDelta >= 0 ? '+' : ''}${fmt.usd(approxDelta)}</td>
    `;
    tbody.appendChild(tr);
  });

  // PV cash flow bar chart
  const flows = cashFlows(face, coupon, ytm, years, freq);
  const labels = flows.map(f => f.year % 1 === 0 ? f.year + 'y' : f.year.toFixed(1) + 'y');
  const pvData  = flows.map(f => f.pv);
  const colors  = flows.map(f => f.principal > 0 ? 'rgba(37,99,235,0.82)' : 'rgba(16,185,129,0.72)');

  destroyChart('risk');
  charts['risk'] = new Chart(
    document.getElementById('risk-chart').getContext('2d'),
    {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'PV of Cash Flow',
          data: pvData,
          backgroundColor: colors,
          borderRadius: 3,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: true,
            labels: {
              generateLabels: () => [
                { text: 'Coupon (PV)',              fillStyle: 'rgba(16,185,129,0.72)', strokeStyle: 'transparent', lineWidth: 0 },
                { text: 'Principal + Coupon (PV)',  fillStyle: 'rgba(37,99,235,0.82)',  strokeStyle: 'transparent', lineWidth: 0 },
              ],
            },
          },
          tooltip: {
            callbacks: {
              label: ctx => ` PV: ${fmt.usd(ctx.parsed.y)}`,
            },
          },
        },
        scales: {
          x: {
            ticks: { maxTicksLimit: 22, font: { size: 10 } },
            title: { display: true, text: 'Year' },
          },
          y: {
            title: { display: true, text: 'Present Value ($)' },
          },
        },
      },
    }
  );
}

document.getElementById('calc-risk').addEventListener('click', runRisk);


/* ══════════════════════════════════════════════════════════════
   TAB 4 — CASH FLOW SCHEDULE
══════════════════════════════════════════════════════════════ */

function runCashFlows() {
  const face   = parseFloat(document.getElementById('cf-face').value);
  const coupon = parseFloat(document.getElementById('cf-coupon').value);
  const years  = parseFloat(document.getElementById('cf-maturity').value);
  const ytm    = parseFloat(document.getElementById('cf-yield').value);
  const freq   = parseInt(document.getElementById('cf-freq').value, 10);

  if ([face, coupon, years, ytm, freq].some(v => !isFinite(v) || v <= 0)) return;

  const flows     = cashFlows(face, coupon, ytm, years, freq);
  const totalPV   = flows.reduce((s, f) => s + f.pv, 0);
  const totalCoup = flows.reduce((s, f) => s + f.coupon, 0);
  const totalCF   = flows.reduce((s, f) => s + f.cf, 0);
  const { macDur } = duration(face, coupon, ytm, years, freq);

  // Summary chips
  document.getElementById('cf-stat-price').textContent   = fmt.usd(totalPV);
  document.getElementById('cf-stat-coupons').textContent = fmt.usd(totalCoup);
  document.getElementById('cf-stat-total').textContent   = fmt.usd(totalCF);
  document.getElementById('cf-stat-periods').textContent = flows.length.toString();
  document.getElementById('cf-stat-dur').textContent     = fmt.num(macDur, 4) + ' yrs';
  document.getElementById('cf-stats').style.display      = 'flex';

  // Table
  const tbody = document.getElementById('cf-tbody');
  tbody.innerHTML = '';

  flows.forEach(f => {
    const pctOfPrice = (f.pv / totalPV) * 100;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${f.period}</td>
      <td>${f.year % 1 === 0 ? f.year.toFixed(0) : f.year.toFixed(2)}</td>
      <td>${fmt.usd(f.coupon)}</td>
      <td>${f.principal > 0 ? fmt.usd(f.principal) : '—'}</td>
      <td>${fmt.usd(f.cf)}</td>
      <td>${fmt.usd(f.pv)}</td>
      <td>${fmt.num(pctOfPrice, 3)}%</td>
      <td>${fmt.usd(f.cumPV)}</td>
    `;
    tbody.appendChild(tr);
  });

  // Totals row
  const tot = document.createElement('tr');
  tot.innerHTML = `
    <td colspan="2">TOTAL (${flows.length} periods)</td>
    <td>${fmt.usd(totalCoup)}</td>
    <td>${fmt.usd(face)}</td>
    <td>${fmt.usd(totalCF)}</td>
    <td>${fmt.usd(totalPV)}</td>
    <td>100.000%</td>
    <td>${fmt.usd(totalPV)}</td>
  `;
  tbody.appendChild(tot);
}

document.getElementById('calc-cf').addEventListener('click', runCashFlows);


/* ─── SHARED CHART OPTIONS ────────────────────────────────── */

function chartOptions(xLabel, yLabel) {
  return {
    responsive: true,
    maintainAspectRatio: true,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        display: true,
        labels: { font: { size: 11 }, boxWidth: 14 },
      },
      tooltip: {
        bodyFont: { size: 12 },
        callbacks: {
          title: items => `Yield: ${items[0].label}`,
        },
      },
    },
    scales: {
      x: {
        ticks: { maxTicksLimit: 12, font: { size: 11 } },
        title: { display: true, text: xLabel, font: { size: 11 } },
        grid: { color: 'rgba(0,0,0,0.04)' },
      },
      y: {
        title: { display: true, text: yLabel, font: { size: 11 } },
        grid: { color: 'rgba(0,0,0,0.04)' },
      },
    },
  };
}


/* ─── INIT ────────────────────────────────────────────────── */

window.addEventListener('load', () => {
  // Run pricer on load so results are immediately visible
  runPricer();
});
