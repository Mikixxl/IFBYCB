// --- app.js : Yield Curve Visualiser ---

// Chart canvas
const ctx = document.getElementById('chart').getContext('2d');
let chart;

// Fixed tenor order used for labels and data alignment
const TENOR_LABELS = ['1M','3M','6M','1Y','2Y','3Y','5Y','7Y','10Y','20Y','30Y'];

// --- tiny helpers ---
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const setStatus = t => { document.getElementById('status').innerText = t; };

// Fetch JSON with Netlify Functions fallback
async function fetchJSON(url) {
  let r = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (r.status === 404 || r.status === 403) {
    // fallback to direct functions path (works on Netlify + local previews)
    url = url.replace('/api/market', '/.netlify/functions/market');
    r = await fetch(url, { headers: { 'Accept': 'application/json' } });
  }
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

// Load one country (+optional CDS) for a given horizon
async function load(country, h) {
  const y = await fetchJSON(`/api/market?type=yield&country=${country}&h=${h}`);
  const wantCds = document.getElementById('cds')?.checked;
  const cds = wantCds ? await fetchJSON(`/api/market?type=cds&country=${country}&h=${h}`) : null;
  return { country, horizon: h, y, cds };
}

// Build datasets from results, mapping values to fixed TENOR_LABELS
function buildDatasets(results) {
  const datasets = [];

  results.forEach(res => {
    if (!res.y || !res.y.tenors) return;

    const data = TENOR_LABELS.map(t => {
      const v = res.y.tenors[t];
      return (v === null || v === undefined) ? null : Number(v);
    });

    datasets.push({
      label: `${res.country} - ${res.horizon}`,
      data,
      borderWidth: 2,
      fill: false,
      spanGaps: true
    });

    if (res.cds && res.cds.cds5y_bps != null) {
      const cdsLine = Array(TENOR_LABELS.length).fill(Number(res.cds.cds5y_bps));
      datasets.push({
        label: `${res.country} CDS 5Y`,
        data: cdsLine,
        yAxisID: 'y1',
        borderDash: [4, 2],
        fill: false,
        spanGaps: true
      });
    }
  });

  return datasets;
}

// Main loader (called on button + changes)
async function loadAll() {
  try {
    const countries = $$('aside input[type=checkbox][value]:checked').map(el => el.value);
    const h = $('input[name=horizon]:checked')?.value || 'today';

    if (!countries.length) {
      if (chart) chart.destroy();
      setStatus('Select at least one country');
      return;
    }

    setStatus('Loading…');

    // Kick off all requests
    const tasks = countries.map(c => load(c, h));
    const resultsAll = await Promise.allSettled(tasks);
    const results = resultsAll.map(r => r.status === 'fulfilled'
      ? r.value
      : { country: '?', y: null, cds: null });

    const datasets = buildDatasets(results);

    if (!datasets.length) {
      if (chart) chart.destroy();
      setStatus('No data');
      return;
    }

    // (Re)draw chart
    if (chart) chart.destroy();
    chart = new Chart(ctx, {
      type: 'line',
      data: { labels: TENOR_LABELS, datasets },
      options: {
        responsive: true,
        interaction: { mode: 'nearest', intersect: false },
        elements: { point: { radius: 2 } },
        scales: {
          y:  { type: 'linear', position: 'left',  title: { display: true, text: 'Yield (%) p.a.' } },
          y1: { type: 'linear', position: 'right', title: { display: true, text: 'CDS 5Y (bps)' }, grid: { drawOnChartArea: false } }
        }
      }
    });

    setStatus('As of ' + (results[0]?.y?.asOf || 'demo'));
  } catch (err) {
    console.error(err);
    if (chart) chart.destroy();
    setStatus('API error: ' + (err.message || err.toString()));
  }
}

// Wire up UI
document.getElementById('refresh')?.addEventListener('click', loadAll);
// Update on any checkbox/radio change for snappier UX
$$('aside input[type=checkbox], aside input[type=radio]').forEach(el => {
  el.addEventListener('change', loadAll);
});

// Initial draw
loadAll();
