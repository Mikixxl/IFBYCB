// netlify/functions/market.js

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const CACHE = new Map();

module.exports.handler = async (event) => {
  try {
    const url = new URL(event.rawUrl || `https://x.invalid${event.path}?${new URLSearchParams(event.queryStringParameters||{}).toString()}`);
    const type = (url.searchParams.get('type') || 'yield').toLowerCase();
    const country = (url.searchParams.get('country') || 'US').toUpperCase();
    const h = (url.searchParams.get('h') || 'today').toLowerCase();

    const allowedTypes = new Set(['yield','cds']);
    const allowedCountries = new Set(['US','DE','GB','JP','CA']);
    const allowedH = new Set(['today','1w','1m']);
    if (!allowedTypes.has(type) || !allowedCountries.has(country) || !allowedH.has(h)) {
      return resp(400, { error: 'Invalid parameters' });
    }

    const cacheKey = `${type}:${country}:${h}`;
    const now = Date.now();
    const cached = CACHE.get(cacheKey);
    if (cached && now - cached.ts < CACHE_TTL_MS) return resp(200, cached.data, true);

    let data;
    if (type === 'yield') data = await fetchYieldUnified(country, h);
    else data = await fetchCdsUnified(country, h);

    CACHE.set(cacheKey, { ts: now, data });
    return resp(200, data);
  } catch (err) {
    return resp(500, { error: String(err && err.message || err) });
  }
};

/* -------------------- US Treasuries -------------------- */
async function provider_us_yield(h) {
  const url = 'https://www.treasury.gov/resource-center/data-chart-center/interest-rates/Datasets/yield.csv';
  try {
    const res = await fetch(url, { headers: { 'accept': 'text/csv' } });
    if (!res.ok) throw new Error(`Treasury ${res.status}`);
    const rows = parseCSV(await res.text());
    const mapped = rows.map(r => ({
      date: r['DATE'] || r['Date'],
      '1M': num(r['1 MO']), '3M': num(r['3 MO']), '6M': num(r['6 MO']),
      '1Y': num(r['1 YR']), '2Y': num(r['2 YR']), '3Y': num(r['3 YR']),
      '5Y': num(r['5 YR']), '7Y': num(r['7 YR']), '10Y': num(r['10 YR']),
      '20Y': num(r['20 YR']), '30Y': num(r['30 YR'])
    })).filter(r => r.date);
    const pick = pickByHorizon(mapped, h);
    return { asOf: pick.date, tenors: takeTenors(pick) };
  } catch (e) { return demoYield('US', h); }
}

/* -------------------- DE - Bundesbank -------------------- */
const BBK_SERIES = {
  '2Y': 'BBSSY.D.REN.EUR.A610.000000WT0202.A',
  '5Y': 'BBSSY.D.REN.EUR.A620.000000WT0505.A',
  '7Y': 'BBSSY.D.REN.EUR.A607.000000WT7070.A',
  '10Y':'BBSSY.D.REN.EUR.A630.000000WT1010.A',
  '15Y':'BBSSY.D.REN.EUR.A615.000000WT1515.A',
  '30Y':'BBSSY.D.REN.EUR.A640.000000WT3030.A'
};
async function provider_de_yield(h){
  try {
    const entries = await Promise.all(Object.entries(BBK_SERIES).map(async ([tenor, id]) => {
      const url = `https://api.statistiken.bundesbank.de/rest/data/BBSSY/${id}?detail=dataonly&lastNObservations=60&format=csv`;
      const res = await fetch(url, { headers: { 'accept': 'text/csv' } });
      if(!res.ok) throw new Error(`BBK ${tenor} ${res.status}`);
      const rows = parseBBKCSV(await res.text());
      const pick = pickRowByH(rows, h);
      return [tenor, pick];
    }));
    const dates = entries.map(([,p])=> p?.date).filter(Boolean).sort();
    const asOf = dates[dates.length-1] || isoToday();
    const ten = { '1M':null,'3M':null,'6M':null,'1Y':null,'2Y':null,'3Y':null,'5Y':null,'7Y':null,'10Y':null,'20Y':null,'30Y':null };
    entries.forEach(([tenor, p]) => { ten[tenor] = p?.value ?? null; });
    return { asOf, tenors: ten };
  } catch(e){ return demoYield('DE', h); }
}
function parseBBKCSV(text){
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(',').map(s=>s.trim());
  const timeIdx = headers.indexOf('TIME_PERIOD');
  const valIdx = headers.indexOf('OBS_VALUE');
  const out = [];
  for(let i=1;i<lines.length;i++){
    const parts = splitCSVLine(lines[i]);
    const date = parts[timeIdx]; const v = parts[valIdx];
    if(date){ out.push({ date, value: v==='' ? null : Number(v) }); }
  }
  return out;
}
function pickRowByH(rows, h){
  if(!rows.length) return null;
  const last = rows[rows.length-1];
  if(h==='today') return last;
  const want = h==='1w' ? 7 : 30;
  for(let i=rows.length-1;i>=0;i--){
    const d = new Date(rows[i].date);
    const d0 = new Date(last.date);
    const diff = (d0 - d) / 86400000;
    if(diff >= want) return rows[i];
  }
  return last;
}

/* -------------------- GB - Gilts -------------------- */
const BOE_CODES = ['DQT','DQU','13S','13U','DR0','5JL','15A','158','C6R','2BN','4ZC','15B','5Z4','23N','DRW','C6S','DRY','4ZD','159','4ZB','2C6','DRZ','C6T','DR6','5Z3','RN','15F'];
async function provider_gb_yield(h){
  try{
    const today = new Date();
    const past = new Date(today.getTime() - 120*86400000);
    const fmt = d => `${String(d.getDate()).padStart(2,'0')}/${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]}/${d.getFullYear()}`;
    const datefrom = fmt(past);
    const dateto = 'now';
    const url = `https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp?csv.x=yes&Datefrom=${encodeURIComponent(datefrom)}&Dateto=${encodeURIComponent(dateto)}&SeriesCodes=${BOE_CODES.join(',')}&CSVF=TT&UsingCodes=Y`;
    const res = await fetch(url, { headers: { 'accept': 'text/csv' } });
    if(!res.ok) throw new Error(`BoE ${res.status}`);
    const parsed = parseBOE_TT(await res.text());
    const tenorMap = { '1Y':null,'2Y':null,'3Y':null,'5Y':null,'7Y':null,'10Y':null,'20Y':null,'30Y':null };
    const rx = /(\d+)\s*(?:year|yr|y)\b/i;
    parsed.series.forEach(s => {
      const m = s.title.match(rx) || s.title.match(/(\d+)\s*-\s*year|\b(\d+)\s*years\b/i);
      const n = m ? Number(m[1] || m[2]) : null;
      const key = n ? (n===1?'1Y': n===2?'2Y': n===3?'3Y': n===5?'5Y': n===7?'7Y': n===10?'10Y': n===20?'20Y': n===30?'30Y': null) : null;
      if(key){ tenorMap[key] = s.values; }
    });
    const refSeries = tenorMap['10Y'] || Object.values(tenorMap).find(v=>v);
    if(!refSeries) throw new Error('No gilt series matched');
    const ref = pickBOEByH(refSeries, h);
    const asOf = ref.date;
    const ten = { '1M':null,'3M':null,'6M':null,'1Y':null,'2Y':null,'3Y':null,'5Y':null,'7Y':null,'10Y':null,'20Y':null,'30Y':null };
    for(const k of Object.keys(ten)){
      if(tenorMap[k]) ten[k] = valueOnOrBefore(tenorMap[k], asOf);
    }
    return { asOf, tenors: ten };
  }catch(e){ return demoYield('GB', h); }
}
function parseBOE_TT(text){
  const lines = text.split(/\r?\n/).filter(l => l.trim().length>0);
  if(lines.length<2) return { asOf: null, series: [] };
  let headerIdx = lines.findIndex(l => /^"?Date"?\s*,/i.test(l));
  let titleRowIdx = headerIdx>0 ? headerIdx-1 : null;
  const headers = splitCSVLine(lines[headerIdx]);
  const titles = titleRowIdx!=null ? splitCSVLine(lines[titleRowIdx]) : headers;
  const series = [];
  for(let c=1;c<headers.length;c++){
    const code = headers[c].replace(/(^"|"$)/g,'');
    const title = (titles[c]||code).replace(/(^"|"$)/g,'');
    const values = [];
    for(let r=headerIdx+1;r<lines.length;r++){
      const row = splitCSVLine(lines[r]);
      const date = row[0]; const v = row[c];
      if(date){ values.push({ date: dateFromBoE(date), value: v===''?null:Number(v) }); }
    }
    series.push({ code, title, values });
  }
  const allDates = series.flatMap(s => s.values.map(v => v.date)).sort();
  const asOf = allDates[allDates.length-1] || null;
  return { asOf, series };
}
function dateFromBoE(s){
  const t = s.replace(/\//g,' ').trim();
  const parts = t.split(/\s+/);
  if(parts.length>=3){
    const d = parts[0]; const mon = parts[1]; const y = parts[2];
    return new Date(`${d} ${mon} ${y}`).toISOString().slice(0,10);
  }
  const d = new Date(s); return isNaN(d)? s : d.toISOString().slice(0,10);
}
function pickBOEByH(values, h){
  const last = values[values.length-1];
  if(h==='today') return last;
  const want = h==='1w'?7:30;
  for(let i=values.length-1;i>=0;i--){
    const d = new Date(values[i].date);
    const d0 = new Date(last.date);
    if((d0 - d)/86400000 >= want) return values[i];
  }
  return last;
}
function valueOnOrBefore(values, dateISO){
  for(let i=values.length-1;i>=0;i--){
    if(values[i].date <= dateISO) return values[i].value;
  }
  return null;
}

/* -------------------- JP - MoF -------------------- */
async function provider_jp_yield(h) {
  const url = 'https://www.mof.go.jp/english/policy/jgbs/reference/interest_rate/jgbcme.csv';
  try {
    const res = await fetch(url, { headers: { 'accept': 'text/csv' } });
    if (!res.ok) throw new Error(`MoF ${res.status}`);
    const rows = parseCSV(await res.text());
    const last = rows[rows.length-1];
    const asOf = last['Date'] || last['DATE'];
    let ref = last;
    if (h === '1w' && rows.length > 5) ref = rows[rows.length-6];
    if (h === '1m' && rows.length > 22) ref = rows[rows.length-23];
    const ten = {
      '1M': null, '3M': null, '6M': null,
      '1Y': num(ref['1Y']), '2Y': num(ref['2Y']), '3Y': num(ref['3Y']),
      '5Y': num(ref['5Y']), '7Y': num(ref['7Y']), '10Y': num(ref['10Y']),
      '20Y': num(ref['20Y']), '30Y': num(ref['30Y'])
    };
    return { asOf, tenors: ten };
  } catch (e) { return demoYield('JP', h); }
}

/* -------------------- CA - BoC -------------------- */
async function provider_ca_yield(h) {
  const url = 'https://www.bankofcanada.ca/valet/observations/group/bond_yields_all/json?recent=60';
  try {
    const res = await fetch(url, { headers: { 'accept': 'application/json' } });
    if (!res.ok) throw new Error(`BoC ${res.status}`);
    const j = await res.json();
    const obs = j.observations;
    const key = o => ({
      '1Y': num(o['BD.CDN.1YR.DQ.YLD']?.v),
      '2Y': num(o['BD.CDN.2YR.DQ.YLD']?.v),
      '3Y': num(o['BD.CDN.3YR.DQ.YLD']?.v),
      '5Y': num(o['BD.CDN.5YR.DQ.YLD']?.v),
      '7Y': num(o['BD.CDN.7YR.DQ.YLD']?.v),
      '10Y': num(o['BD.CDN.10YR.DQ.YLD']?.v),
      '20Y': num(o['BD.CDN.20YR.DQ.YLD']?.v),
      '30Y': num(o['BD.CDN.30YR.DQ.YLD']?.v)
    });
    const last = obs[obs.length-1];
    let ref = last;
    if (h==='1w' && obs.length>5) ref = obs[obs.length-6];
    if (h==='1m' && obs.length>22) ref = obs[obs.length-23];
    const m = key(ref);
    const ten = { '1M':null,'3M':null,'6M':null, ...m };
    return { asOf: ref.d, tenors: ten };
  } catch (e) { return demoYield('CA', h); }
}

/* -------------------- CDS scraper -------------------- */
async function provider_cds5y(country, h) {
  const cacheKey = `cds_page_cache`;
  const now = Date.now();
  let page = CACHE.get(cacheKey);
  if (!page || (now - page.ts) > CACHE_TTL_MS) {
    try {
      const icUrl = 'https://www.investing.com/rates-bonds/world-cds';
      const res = await fetch(icUrl, { headers: { 'User-Agent':'Mozilla/5.0', 'Accept':'text/html,application/xhtml+xml', 'Accept-Language':'en-US,en;q=0.9', 'Referer':'https://www.investing.com/' } });
      if (res.ok) { page = { ts: now, html: await res.text(), src: 'investing' }; CACHE.set(cacheKey, page); }
    } catch(e){ }
  }
  if (!page || !page.html) {
    try {
      const wgbUrl = 'https://www.worldgovernmentbonds.com/sovereign-cds/';
      const res2 = await fetch(wgbUrl, { headers: { 'User-Agent':'Mozilla/5.0', 'Accept':'text/html,application/xhtml+xml', 'Accept-Language':'en-US,en;q=0.9', 'Referer':'https://www.worldgovernmentbonds.com/' } });
      if (res2.ok) { page = { ts: now, html: await res2.text(), src: 'wgb' }; CACHE.set(cacheKey, page); }
    } catch(e){ }
  }
  let cds = null;
  if (page && page.html) {
    const name = countryName(country);
    if (page.src === 'investing') cds = parseInvestingCds(page.html, name);
    if (cds == null) cds = parseWGBCds(page.html, name);
  }
  const val = cds != null ? Number(cds) : demoCds(country, h);
  return { asOf: isoToday(), cds5y_bps: val };
}
function countryName(ccy){ const map={ US:'United States', DE:'Germany', GB:'United Kingdom', JP:'Japan', CA:'Canada' }; return map[ccy]||ccy; }
function parseInvestingCds
