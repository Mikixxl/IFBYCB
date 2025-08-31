// app.js — diagnostic build

const ctx = document.getElementById('chart').getContext('2d');
let chart;

// tiny helper to show statuses in the sidebar
function setStatus(msg, append=false){
  const el = document.getElementById('status');
  el.innerText = append ? (el.innerText ? el.innerText + '\n' : '') + msg : msg;
}

document.getElementById('refresh').onclick = loadAll;

// generic JSON fetch with 404/403 fallback to direct function path
async function fetchJSON(url){
  let r = await fetch(url);
  if(r.status === 404 || r.status === 403){
    url = url.replace('/api/market','/.netlify/functions/market');
    r = await fetch(url);
  }
  if(!r.ok){
    const text = await r.text().catch(()=> '');
    throw new Error(`HTTP ${r.status} ${text ? '– '+text.slice(0,200) : ''}`);
  }
  return r.json();
}

async function load(country,h){
  try {
    const y = await fetchJSON(`/api/market?type=yield&country=${country}&h=${h}`);
    const cds = document.getElementById('cds').checked
      ? await fetchJSON(`/api/market?type=cds&country=${country}&h=${h}`) : null;

    // status line per country (shows src: wgb/investing/demo)
    setStatus(`✅ ${country}: yield from ${y.src}${cds && cds.src ? `, cds from ${cds.src}` : ''}`, true);
    return { ok:true, country, horizon:h, y, cds };
  } catch(err){
    setStatus(`❌ ${country}: ${err.message}`, true);
    return { ok:false, country, horizon:h, y:null, cds:null, error:String(err) };
  }
}

async function loadAll(){
  const countries = [...document.querySelectorAll('aside input[type=checkbox][value]:checked')].map(el=>el.value);
  const h = document.querySelector('input[name=horizon]:checked').value;

  setStatus('Loading...');
  const tasks = countries.map(c=>load(c,h));
  const results = await Promise.all(tasks);

  // build datasets only for successful countries
  const datasets = [];
  let labels = null;

  for(const res of results){
    if(!res.ok || !res.y || !res.y.tenors) continue;
    const thisLabels = Object.keys(res.y.tenors);
    if(!labels || thisLabels.length > labels.length) labels = thisLabels;

    datasets.push({
      label: `${res.country} – ${res.horizon}${res.y.src ? ` (${res.y.src})` : ''}`,
      data: Object.values(res.y.tenors),
      borderWidth: 2,
      fill: false,
      tension: 0.25
    });

    if(res.cds && res.cds.cds5y_bps!=null){
      datasets.push({
        label: `${res.country} CDS 5Y`,
        data: Array(thisLabels.length).fill(res.cds.cds5y_bps),
        borderDash:[4,2],
        yAxisID: 'y1',
        pointRadius: 0
      });
    }
  }

  if(chart) chart.destroy();
  chart = new Chart(ctx,{
    type:'line',
    data:{ labels: labels || [], datasets },
    options:{
      responsive:true,
      interaction:{ mode:'nearest', intersect:false },
      scales:{
        y:{ type:'linear', position:'left', title:{display:true,text:'Yield (%) p.a.'} },
        y1:{ type:'linear', position:'right', grid:{drawOnChartArea:false}, title:{display:true,text:'CDS 5Y (bps)'} }
      },
      plugins:{
        legend:{ display:true }
      }
    }
  });

  // final status line
  const good = results.filter(r=>r.ok).length;
  setStatus(`As of ${results.find(r=>r.y?.asOf)?.y.asOf || '—'} • ${good}/${results.length} countries OK`, true);
}

// optional: load once on page load
window.addEventListener('load', loadAll);
