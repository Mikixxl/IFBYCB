// app.js — robust frontend

let chart;
const ctx = document.getElementById('chart').getContext('2d');
const statusEl = document.getElementById('status');

// auto-load once DOM is ready and when controls change
document.addEventListener('DOMContentLoaded', loadAll);
document.getElementById('refresh').addEventListener('click', loadAll);
document.querySelectorAll('aside input[type=checkbox][value]').forEach(el => {
  el.addEventListener('change', loadAll);
});
document.querySelectorAll('input[name=horizon]').forEach(el => {
  el.addEventListener('change', loadAll);
});

function setStatus(msg){ statusEl.textContent = msg; }

// try /api/* first (redirect), then fall back to /.netlify/functions/*
async function fetchJSON(url){
  let r = await fetch(url, { headers: { accept: 'application/json' } });
  if (r.status === 404 || r.status === 403) {
    const fb = url.replace('/api/market','/.netlify/functions/market');
    r = await fetch(fb, { headers: { accept: 'application/json' } });
  }
  if (!r.ok) {
    const body = await r.text().catch(()=> '');
    throw new Error(`HTTP ${r.status} ${r.statusText} – ${body.slice(0,200)}`);
  }
  return r.json();
}

async function load(country,h){
  const y = await fetchJSON(`/api/market?type=yield&country=${country}&h=${h}`);
  const wantCDS = document.getElementById('cds')?.checked;
  const cds = wantCDS ? await fetchJSON(`/api/market?type=cds&country=${country}&h=${h}`) : null;
  return { country, horizon: h, y, cds };
}

// fixed label order to align all series
const TENOR_LABELS = ['1M','3M','6M','1Y','2Y','3Y','5Y','7Y','10Y','20Y','30Y'];
function valuesForLabels(tenors){
  return TENOR_LABELS.map(k => (tenors && Object.prototype.hasOwnProperty.call(tenors,k)) ? tenors[k] : null);
}

async function loadAll(){
  try{
    const countries = [...document.querySelectorAll('aside input[type=checkbox][value]:checked')].map(el=>el.value);
    if (countries.length === 0){ setStatus('Select at least one country.'); renderEmpty(); return; }
    const h = document.querySelector('input[name=horizon]:checked').value;

    setStatus('Loading…');
    const tasks = countries.map(c => load(c,h));
    const settled = await Promise.allSettled(tasks);

    const ok = settled.filter(s => s.status === 'fulfilled').map(s => s.value);
    const bad = settled.filter(s => s.status === 'rejected');

    if (!ok.length){
      setStatus(`API error: ${bad[0]?.reason?.message || 'load failed'}`);
      console.error('Load errors:', bad);
      renderEmpty();
      return;
    }

    const datasets = [];
    let asOf = ok.find(r => r.y?.asOf)?.y.asOf || null;

    ok.forEach(res => {
      if (!res.y?.tenors) return;
      datasets.push({
        label: `${res.country} – ${res.horizon}`,
        data: valuesForLabels(res.y.tenors),
        borderWidth: 2,
        fill: false,
        tension: 0.2
      });
      if (res.cds && res.cds.cds5y_bps != null){
        datasets.push({
          label: `${res.country} CDS 5Y`,
          data: TENOR_LABELS.map(()=> res.cds.cds5y_bps),
          borderDash: [4,2],
          yAxisID: 'y1',
          pointRadius: 0
        });
      }
    });

    renderChart(TENOR_LABELS, datasets);
    setStatus(`As of ${asOf || 'N/A'}${bad.length ? ` · Partial data: ${bad.length} failed (see console)` : ''}`);
    if (bad.length) console.warn('Failed loads:', bad);
  }catch(err){
    setStatus(`Error: ${err.message}`);
    console.error(err);
    renderEmpty();
  }
}

function renderEmpty(){
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'line',
    data: { labels: TENOR_LABELS, datasets: [] },
    options: baseOptions()
  });
}

function renderChart(labels, datasets){
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: baseOptions()
  });
}

function baseOptions(){
  return {
    responsive: true,
    interaction: { mode: 'nearest', intersect: false },
    plugins: {
      legend: { position: 'top' },
      tooltip: { intersect: false, mode: 'index' }
    },
    scales: {
      y:  { type:'linear', position:'left',  title:{ display:true, text:'Yield (%)' } },
      y1: { type:'linear', position:'right', title:{ display:true, text:'CDS 5Y (bps)' }, grid:{ drawOnChartArea:false } }
    }
  };
}
