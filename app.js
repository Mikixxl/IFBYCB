// app.js – frontend chart logic using /api/market via Netlify redirects

const ctx = document.getElementById('chart').getContext('2d');
let chart;

document.getElementById('refresh').onclick = loadAll;

// Generic JSON fetch from our Netlify function (via redirect /api/*)
async function fetchJSON(url) {
  const r = await fetch(url);
  if (!r.ok) {
    throw new Error(`HTTP ${r.status}`);
  }
  return r.json();
}

async function load(country, h) {
  const y = await fetchJSON(`/api/market?type=yield&country=${country}&h=${h}`);
  const cds = document.getElementById('cds').checked
    ? await fetchJSON(`/api/market?type=cds&country=${country}&h=${h}`)
    : null;

  return { country, horizon: h, y, cds };
}

async function loadAll() {
  const countries = [
    ...document.querySelectorAll('aside input[type=checkbox][value]:checked'),
  ].map((el) => el.value);

  const h = document.querySelector('input[name=horizon]:checked').value;

  document.getElementById('status').innerText = 'Loading...';

  const tasks = countries.map((c) => load(c, h));
  const resultsAll = await Promise.allSettled(tasks);
  const results = resultsAll.map((r) =>
    r.status === 'fulfilled' ? r.value : { country: '?', y: null, cds: null }
  );

  const datasets = [];
  let labels = null;

  results.forEach((res) => {
    if (!res.y) return;
    const thisLabels = Object.keys(res.y.tenors);
    if (!labels || thisLabels.length > labels.length) labels = thisLabels;

    datasets.push({
      label: res.country + ' - ' + res.horizon,
      data: Object.values(res.y.tenors),
      borderWidth: 2,
      fill: false,
      tension: 0.25,
    });

    if (res.cds && res.cds.cds5y_bps != null) {
      datasets.push({
        label: res.country + ' CDS 5Y',
        data: Array(thisLabels.length).fill(res.cds.cds5y_bps),
        borderDash: [4, 2],
        yAxisID: 'y1',
        pointRadius: 0,
      });
    }
  });

  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'line',
    data: { labels: labels || [], datasets },
    options: {
      responsive: true,
      interaction: { mode: 'nearest', intersect: false },
      scales: {
        y: {
          type: 'linear',
          position: 'left',
          title: { display: true, text: 'Yield (%) p.a.' },
        },
        y1: {
          type: 'linear',
          position: 'right',
          grid: { drawOnChartArea: false },
          title: { display: true, text: 'CDS 5Y (bps)' },
        },
      },
      plugins: {
        legend: { display: true },
      },
    },
  });

  document.getElementById('status').innerText =
    'As of ' + (results[0]?.y?.asOf || 'n/a');
}

// optional: auto load on startup
window.addEventListener('load', loadAll);
