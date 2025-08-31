// app.js — frontend with per-country status & CDS overlay, using /api/* redirect

let chart;
const ctx = document.getElementById('chart').getContext('2d');
const statusEl = document.getElementById('status');

// helpers
const setStatus = (msg, append = false) => {
  if (!append) statusEl.textContent = '';
  statusEl.textContent += (statusEl.textContent ? '\n' : '') + msg;
};

const fetchJSON = async (url) => {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

const loadOne = async (country, h) => {
  try {
    const y = await fetchJSON(`/api/market?type=yield&country=${country}&h=${h}`);
    const cds = document.getElementById('cds').checked
      ? await fetchJSON(`/api/market?type=cds&country=${country}&h=${h}`)
      : null;

    const found = y?.tenors ? Object.values(y.tenors).filter(v => v != null).length : 0;
    const src = y?.src || 'n/a';
    setStatus(`✅ ${country}: yield ${found} pts [${src}]` + (cds ? ` • cds ${cds.cds5y_bps ?? '—'} bps [${cds.src||'n/a'}]` : ''), true);

    return { ok: true, country, h, y, cds };
  } catch (e) {
    setStatus(`❌ ${country}: ${String(e.message||e)}`, true);
    return { ok: false, country, h, y: null, cds: null, error: String(e.message||e) };
  }
};

const buildDatasets = (results) => {
  const datasets = [];
  let labels = null;

  for (const res of results) {
    if (!res.ok || !res.y || !res.y.tenors) continue;

    const ts = res.y.tenors;
    const theseLabels = Object.keys(ts);
    if (!labels || theseLabels.length > labels.length) labels = theseLabels;

    datasets.push({
      label: `${res.country} – ${res.h}${res.y.src ? ` (${res.y.src})` : ''}`,
      data: Object.values(ts),
      borderWidth: 2,
      fill: false,
      tension: 0.25,
      pointRadius: 2
    });

    if (res.cds && res.cds.cds5y_bps != null) {
      datasets.push({
        label: `${res.country} CDS 5Y`,
        data: Array(theseLabels.length).fill(res.cds.cds5y_bps),
        borderDash: [4, 2],
        yAxisID: 'y1',
        pointRadius: 0
      });
    }
  }

  return { labels: labels || [], datasets };
};

async function loadAll() {
  const countries = [...document.querySelectorAll('aside input[type=checkbox][value]:checked')].map(el => el.value);
  const h = document.querySelector('input[name=horizon]:checked').value;

  setStatus('Loading...');
  const promises = countries.map(c => loadOne(c, h));
  const settled = await Promise.all(promises);

  const { labels, datasets } = buildDatasets(settled);

  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      interaction: { mode: 'nearest', intersect: false },
      scales: {
        y: { type: 'linear', position: 'left', title: { display: true, text: 'Yield (%) p.a.' } },
        y1: { type: 'linear', position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'CDS 5Y (bps)' } }
      },
      plugins: { legend: { display: true } }
    }
  });

  const asOf = settled.find(r => r.y?.asOf)?.y.asOf || 'n/a';
  const okCount = settled.filter(r => r.ok && r.y && r.y.tenors).length;
  setStatus(`Done • As of ${asOf} • ${okCount}/${countries.length} countries OK`, true);
}

document.getElementById('refresh').addEventListener('click', loadAll);
window.addEventListener('load', loadAll);
