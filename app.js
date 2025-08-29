const ctx = document.getElementById('chart').getContext('2d');
let chart;

document.getElementById('refresh').onclick = loadAll;

async function fetchJSON(url){
  let r = await fetch(url);
  if(r.status === 404 || r.status === 403){
    // fallback to direct functions path
    url = url.replace('/api/market','/.netlify/functions/market');
    r = await fetch(url);
  }
  if(!r.ok) throw new Error('HTTP '+r.status);
  return r.json();
}

async function load(country,h){
  const y = await fetchJSON(`/api/market?type=yield&country=${country}&h=${h}`);
  const cds = document.getElementById('cds').checked
    ? await fetchJSON(`/api/market?type=cds&country=${country}&h=${h}`) : null;
  return { country, horizon: h, y, cds };
}

async function loadAll(){
  const countries = [...document.querySelectorAll('aside input[type=checkbox][value]:checked')].map(el=>el.value);
  const h = document.querySelector('input[name=horizon]:checked').value;

  document.getElementById('status').innerText = 'Loading...';
  const tasks = countries.map(c=>load(c,h));
  const resultsAll = await Promise.allSettled(tasks);
  const results = resultsAll.map(r=> r.status==='fulfilled' ? r.value : {country:'?', y:null, cds:null});

  const datasets = [];
  results.forEach(res=>{
    if(!res.y) return;
    datasets.push({
      label: res.country+' - '+res.horizon,
      data: Object.values(res.y.tenors),
      borderWidth: 2, fill: false
    });
    if(res.cds && res.cds.cds5y_bps!=null){
      datasets.push({
        label: res.country+' CDS 5Y',
        data: Array(Object.keys(res.y.tenors).length).fill(res.cds.cds5y_bps),
        borderDash:[4,2],
        yAxisID: 'y1'
      });
    }
  });

  if(chart) chart.destroy();
  chart = new Chart(ctx,{
    type:'line',
    data:{ labels:Object.keys(results[0]?.y?.tenors || {}), datasets },
    options:{
      responsive:true,
      scales:{
        y:{ type:'linear', position:'left', title:{display:true,text:'Yield %'} },
        y1:{ type:'linear', position:'right', grid:{drawOnChartArea:false}, title:{display:true,text:'CDS 5Y bps'} }
      }
    }
  });

  document.getElementById('status').innerText = 'As of '+(results[0]?.y?.asOf||'demo');
}
