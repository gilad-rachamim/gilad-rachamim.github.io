// שער יציג של בנק ישראל לכלי /kelim/cheshbon/shaar/ – Cloudflare Worker בלי מצב (חינמי).
// בנק ישראל לא שולח כותרות CORS, ולכן הדפדפן לא יכול לקרוא ממנו ישירות. ה-Worker מביא, מסדר ושומר במטמון.
// מקורות: SDMX של בנק ישראל (שערים יציגים, DATA_TYPE=OF00) + PublicApi לשער של היום לפני שנכנס ל-SDMX.
//   GET /?date=2026-11-12            -> כל המטבעות לתאריך (או יום העסקים האחרון לפניו)
//   GET /?cur=USD&from=2026-01-01&to=2026-11-12 -> סדרה של מטבע אחד (עד 800 ימים)
const ORIGINS = ['https://gilad-rachamim.github.io', 'https://hakelim.com', 'https://www.hakelim.com'];
const SDMX = 'https://edge.boi.org.il/FusionEdgeServer/sdmx/v2/data/dataflow/BOI.STATISTICS/EXR/1.0/';
const LIVE = 'https://www.boi.org.il/PublicApi/GetExchangeRates?asJson=true';
const UA = { 'User-Agent': 'Mozilla/5.0 (hakelim.com shaar)', 'Accept': 'text/csv,application/json' };

export default {
  async fetch(req, env, ctx) {
    const cors = corsHeaders(req.headers.get('Origin') || '');
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'GET') return json({ error: 'method' }, 405, cors);
    const url = new URL(req.url);
    const today = ilToday();
    try {
      // מטמון לפי הכתובת המנורמלת (בלי Origin)
      const key = new Request('https://shaar.cache' + url.pathname + url.search);
      const cache = caches.default;
      let hit = await cache.match(key);
      if (hit) return withCors(hit, cors);
      let body, ttl;
      const cur = (url.searchParams.get('cur') || '').toUpperCase();
      if (cur) {
        if (!/^[A-Z]{3}$/.test(cur)) return json({ error: 'cur' }, 400, cors);
        let from = day(url.searchParams.get('from')), to = day(url.searchParams.get('to')) || today;
        if (!from) from = addDays(to, -30);
        if (to > today) to = today;
        if (from > to) return json({ error: 'range' }, 400, cors);
        if (diff(from, to) > 800) from = addDays(to, -800);
        const rows = await sdmx(`c%5BSERIES_CODE%5D=RER_${cur}_ILS&startperiod=${from}&endperiod=${to}`);
        if (to === today) await addLive(rows, today, cur);
        body = { cur, from, to, unit: rows[0] ? rows[0].u : 1, rates: rows.map(r => [r.d, r.v]) };
        ttl = to >= addDays(today, -1) ? 1800 : 30 * 86400;
      } else {
        let d = day(url.searchParams.get('date')) || today;
        if (d > today) d = today;
        if (d < '1990-01-01') return json({ error: 'date' }, 400, cors);
        const rows = await sdmx(`c%5BDATA_TYPE%5D=OF00&startperiod=${addDays(d, -14)}&endperiod=${d}`);
        if (d === today) await addLive(rows, today, null);
        const last = {};
        rows.forEach(r => { if (r.d <= d && (!last[r.c] || last[r.c].d < r.d)) last[r.c] = r; });
        const rates = Object.values(last).sort((a, b) => order(a.c) - order(b.c)).map(r => ({ c: r.c, u: r.u, v: r.v, d: r.d }));
        body = { date: d, rates };
        ttl = d >= addDays(today, -1) ? 1800 : 30 * 86400;
      }
      body.src = 'בנק ישראל';
      const res = new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=' + ttl } });
      ctx.waitUntil(cache.put(key, res.clone()));
      return withCors(res, cors);
    } catch (e) {
      return json({ error: 'upstream', msg: String(e && e.message || e).slice(0, 200) }, 502, cors);
    }
  }
};

async function sdmx(q) {
  const r = await fetch(SDMX + '?' + q + '&format=csv', { headers: UA, cf: { cacheTtl: 600 } });
  if (!r.ok) throw new Error('sdmx ' + r.status);
  const t = await r.text(), lines = t.trim().split(/\r?\n/), h = lines.shift().split(',');
  const iC = h.indexOf('BASE_CURRENCY'), iM = h.indexOf('UNIT_MULT'), iD = h.indexOf('TIME_PERIOD'), iV = h.indexOf('OBS_VALUE'), iT = h.indexOf('DATA_TYPE');
  return lines.map(l => l.split(',')).filter(c => c[iT] === 'OF00' && c[iV] !== '' && !isNaN(+c[iV]))
    .map(c => ({ c: c[iC], u: Math.pow(10, +c[iM] || 0), d: c[iD], v: +c[iV] }))
    .sort((a, b) => a.d < b.d ? -1 : 1);
}
// השער של היום מופיע ב-PublicApi לפני שהוא נכנס לסדרות; מוסיפים רק אם הוא מהיום ועוד חסר
async function addLive(rows, today, cur) {
  try {
    const r = await fetch(LIVE, { headers: UA, cf: { cacheTtl: 600 } });
    if (!r.ok) return;
    const j = await r.json();
    (j.exchangeRates || []).forEach(x => {
      if (cur && x.key !== cur) return;
      const d = ilDay(new Date(x.lastUpdate));
      if (d !== today || rows.some(r => r.c === x.key && r.d === today)) return;
      rows.push({ c: x.key, u: x.unit || 1, d: today, v: +x.currentExchangeRate });
    });
  } catch (e) {}
}

const ORDER = ['USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD', 'SEK', 'NOK', 'DKK', 'JOD', 'EGP', 'LBP', 'ZAR'];
function order(c) { const i = ORDER.indexOf(c); return i < 0 ? 99 : i; }
function ilDay(dt) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' }).format(dt); }
function ilToday() { return ilDay(new Date()); }
function day(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s || '') ? s : null; }
function addDays(s, n) { const d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function diff(a, b) { return Math.round((new Date(b + 'T12:00:00Z') - new Date(a + 'T12:00:00Z')) / 864e5); }
function corsHeaders(origin) {
  const h = { 'Vary': 'Origin' };
  if (ORIGINS.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    h['Access-Control-Allow-Origin'] = origin; h['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
  }
  return h;
}
function withCors(res, cors) { const r = new Response(res.body, res); Object.entries(cors).forEach(([k, v]) => r.headers.set(k, v)); return r; }
function json(o, s, cors) { return new Response(JSON.stringify(o), { status: s, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, cors) }); }
