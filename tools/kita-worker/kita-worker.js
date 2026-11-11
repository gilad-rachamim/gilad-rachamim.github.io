// כיתות ולוח נקודות למשחקים ולתרגול (/kelim/chashiva/kita/), ושיעורי בית במחברת (/limudim/machberet/kita/).
// Durable Object אחד (SQLite) לכל כיתה, לפי הקוד שלה (6 ספרות). עוד אחד, '_meta', רק להגבלות קצב.
// פרטיות: נשמרים רק שם הכיתה, שם המורה כפי שהיא כותבת אותו, כינויים של תלמידים, ונקודות לפי משחק.
//  - בלי טלפון, מייל, כתובת או שם מלא. מסנן חוסם בכינוי מספרים ארוכים, קישורים ומיילים.
//  - מפתח המורה ואסימוני התלמידים נשמרים רק כ-hash.
//  - כיתה בלי פעילות 180 יום נמחקת לבד. המורה יכולה למחוק הכול מיד.
// הגבלות לרשת אחת ביום: 80 כיתות חדשות, 600 הצטרפויות (בית ספר שלם על אותו Wi-Fi).
// נקודות: 1–30 לאירוע, עד 400 ביום לתלמיד/ה, ref כפול נספר פעם אחת.
const ORIGINS = ['https://gilad-rachamim.github.io', 'https://hakelim.com', 'https://www.hakelim.com'];
const MAX_EV = 30, MAX_DAY = 400, MAX_ST = 80, KEEP_MS = 180 * 864e5;

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const h = cors(origin, env);
    if (req.method === 'OPTIONS') return new Response(null, { headers: h });
    const url = new URL(req.url), p = url.pathname;
    const ip = await hash(req.headers.get('CF-Connecting-IP') || '');
    let res;
    try {
      if (p === '/ping') res = json({ ok: 1, v: 1 });
      else if (p === '/create' && req.method === 'POST') res = await create(req, env, ip);
      else {
        const m = p.match(/^\/c\/(\d{6})(\/[a-z]+)$/);
        if (!m) res = json({ error: 'לא נמצא' }, 404);
        else {
          if (m[2] === '/join' && req.method === 'POST' && !(await rl(env, 'j:' + ip, 600))) res = json({ error: 'יותר מדי ניסיונות מהרשת הזאת היום. נסו שוב מחר.' }, 429);
          else res = await env.KITA.get(env.KITA.idFromName('k' + m[1])).fetch(new Request('https://do' + m[2] + url.search, { method: req.method, headers: { 'content-type': 'application/json', 'x-ip': ip }, body: req.method === 'POST' ? await req.text() : undefined }));
        }
      }
    } catch (e) { res = json({ error: 'תקלה בשרת. נסו שוב בעוד רגע.' }, 500); }
    const out = new Response(res.body, res);
    for (const k in h) out.headers.set(k, h[k]);
    return out;
  }
};

async function rl(env, k, max) {
  const r = await env.KITA.get(env.KITA.idFromName('_meta')).fetch(new Request('https://do/_rl', { method: 'POST', body: JSON.stringify({ k, max }) }));
  return (await r.json()).ok === 1;
}

async function create(req, env, ip) {
  let b; try { b = await req.json(); } catch (e) { return json({ error: 'בקשה לא תקינה' }, 400); }
  const name = cleanText(b.name, 40), teacher = cleanText(b.teacher, 30);
  if (!name) return json({ error: 'שם הכיתה: עד 40 תווים, בלי קישורים, טלפונים או מיילים. למשל: ח׳2 מתמטיקה.' }, 400);
  if (teacher === null) return json({ error: 'בשם המורה אסור קישור, טלפון או מייל.' }, 400);
  if (!(await rl(env, 'c:' + ip, 80))) return json({ error: 'נפתחו הרבה כיתות מהרשת הזאת היום. אפשר להמשיך מחר.' }, 429);
  const key = rid(24);
  for (let i = 0; i < 6; i++) {
    const code = String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));
    const r = await env.KITA.get(env.KITA.idFromName('k' + code)).fetch(new Request('https://do/init', { method: 'POST', body: JSON.stringify({ name, teacher: teacher || '', period: b.period, kh: await hash('key:' + key) }) }));
    if (r.status === 200) return json({ ok: 1, code, key });
  }
  return json({ error: 'לא הצלחנו ליצור קוד. נסו שוב.' }, 500);
}

export class Kita {
  constructor(ctx) {
    this.ctx = ctx; this.sql = ctx.storage.sql; this.tables();
  }
  tables() {
    this.sql.exec('CREATE TABLE IF NOT EXISTS info (k TEXT PRIMARY KEY, v TEXT)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS st (sid TEXT PRIMARY KEY, nick TEXT, th TEXT, t INTEGER, last INTEGER, crown TEXT DEFAULT \'\')');
    this.sql.exec('CREATE TABLE IF NOT EXISTS ev (sid TEXT, ref TEXT, game TEXT, pts INTEGER, day TEXT, t INTEGER, PRIMARY KEY (sid, ref))');
    this.sql.exec('CREATE TABLE IF NOT EXISTS rate (k TEXT PRIMARY KEY, day TEXT, n INTEGER)');
    // שאלות המורה: התשובה הראשונה של כל תלמיד/ה לכל שאלה (pick 0 = נכונה). המורה רואה רק סיכום
    this.sql.exec('CREATE TABLE IF NOT EXISTS qa (v INTEGER, qi INTEGER, sid TEXT, pick INTEGER, PRIMARY KEY (v, qi, sid))');
    // שיעורי בית במחברת (/limudim/machberet/): מטלה, העבודה של כל תלמיד/ה בכל תרגיל, והודעות מהמורה (רמז / תשובה)
    this.sql.exec('CREATE TABLE IF NOT EXISTS hw (id TEXT PRIMARY KEY, title TEXT, ex TEXT, t INTEGER, open INTEGER DEFAULT 1)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS hwork (hw TEXT, sid TEXT, ex INTEGER, rows TEXT, ok INTEGER, warn INTEGER, done INTEGER, stuck INTEGER, t INTEGER, PRIMARY KEY (hw, sid, ex))');
    this.sql.exec('CREATE TABLE IF NOT EXISTS hmsg (id INTEGER PRIMARY KEY AUTOINCREMENT, hw TEXT, sid TEXT, ex INTEGER, kind TEXT, text TEXT, t INTEGER)');
  }
  rows(q, ...a) { return this.sql.exec(q, ...a).toArray(); }
  get(k, d) { const r = this.rows('SELECT v FROM info WHERE k = ?', k)[0]; return r ? r.v : d; }
  set(k, v) { this.sql.exec('INSERT OR REPLACE INTO info (k, v) VALUES (?, ?)', k, String(v)); }
  touch() { this.ctx.storage.setAlarm(Date.now() + KEEP_MS); }
  async alarm() { await this.ctx.storage.deleteAll(); this.tables(); }

  async fetch(req) {
    const url = new URL(req.url), p = url.pathname;
    let b = {};
    if (req.method === 'POST') { try { b = JSON.parse(await req.text() || '{}'); } catch (e) { return json({ error: 'בקשה לא תקינה' }, 400); } }

    if (p === '/_rl') {
      const day = ilDay(Date.now()), r = this.rows('SELECT day, n FROM rate WHERE k = ?', b.k)[0];
      const n = r && r.day === day ? r.n : 0;
      if (n >= b.max) return json({ ok: 0 });
      this.sql.exec('INSERT OR REPLACE INTO rate (k, day, n) VALUES (?, ?, ?)', b.k, day, n + 1);
      if (Math.random() < 0.02) this.sql.exec('DELETE FROM rate WHERE day < ?', day);
      return json({ ok: 1 });
    }
    if (p === '/init') {
      if (this.get('created')) return json({ error: 'תפוס' }, 409);
      this.set('created', Date.now()); this.set('name', b.name); this.set('teacher', b.teacher);
      this.set('period', ['week', 'month', 'round'].includes(b.period) ? b.period : 'week');
      this.set('kh', b.kh); this.set('round', Date.now()); this.set('gifts', '[]'); this.set('msg', ''); this.set('locked', '0');
      this.touch();
      return json({ ok: 1 });
    }
    if (!this.get('created')) return json({ error: 'לא מצאנו כיתה עם הקוד הזה. כדאי לבדוק את הספרות מול המורה.' }, 404);

    // שאלות של המורה: התשובה הנכונה תמיד ראשונה ברשימה (הטלפון מערבב). v = גרסה, כדי שנקודות ייספרו פעם אחת לכל שאלה
    if (p === '/quiz') { const q = this.get('quiz', ''); return json(q ? Object.assign({ ok: 1 }, JSON.parse(q)) : { ok: 1, none: 1 }); }
    if (p === '/info') return json({ ok: 1, name: this.get('name'), teacher: this.get('teacher'), locked: this.get('locked') === '1', n: this.rows('SELECT COUNT(*) AS n FROM st')[0].n });

    if (p === '/join' && req.method === 'POST') {
      if (this.get('locked') === '1') return json({ error: 'המורה סגרה את ההצטרפות לכיתה. אפשר לבקש ממנה לפתוח.' }, 403);
      const nick = cleanNick(b.nick);
      if (!nick) return json({ error: 'כינוי: 2 עד 16 אותיות, בלי מספר טלפון, קישור או מילים לא יפות. עדיף לא שם מלא.' }, 400);
      if (this.rows('SELECT 1 FROM st WHERE lower(nick) = lower(?)', nick).length) return json({ error: 'הכינוי הזה כבר תפוס בכיתה. אפשר להוסיף אות או אימוג׳י.' }, 409);
      if (this.rows('SELECT COUNT(*) AS n FROM st')[0].n >= MAX_ST) return json({ error: 'הכיתה מלאה (' + MAX_ST + ' משתתפים).' }, 403);
      const sid = rid(10), tok = rid(24);
      this.sql.exec('INSERT INTO st (sid, nick, th, t, last) VALUES (?, ?, ?, ?, ?)', sid, nick, await hash('tok:' + tok), Date.now(), Date.now());
      this.touch();
      return json({ ok: 1, sid, token: tok, nick, name: this.get('name'), teacher: this.get('teacher') });
    }

    if (p === '/add' && req.method === 'POST') {
      const s = await this.student(b); if (!s) return json({ error: 'לא מצאנו אתכם בכיתה. אולי המורה הסירה את הכינוי.', gone: 1 }, 403);
      const game = String(b.game || ''), ref = String(b.ref || '').slice(0, 80);
      if (!/^[a-z0-9-]{2,24}$/.test(game) || !ref) return json({ error: 'בקשה לא תקינה' }, 400);
      let pts = Math.round(+b.pts || 0); if (pts < 1) return json({ error: 'בקשה לא תקינה' }, 400); if (pts > MAX_EV) pts = MAX_EV;
      const day = ilDay(Date.now());
      if (this.rows('SELECT 1 FROM ev WHERE sid = ? AND ref = ?', s.sid, ref).length) return json({ ok: 1, again: 1, today: this.today(s.sid, day) });
      const today = this.today(s.sid, day);
      if (today >= MAX_DAY) return json({ ok: 1, capped: 1, today });
      pts = Math.min(pts, MAX_DAY - today);
      this.sql.exec('INSERT INTO ev (sid, ref, game, pts, day, t) VALUES (?, ?, ?, ?, ?, ?)', s.sid, ref, game, pts, day, Date.now());
      this.sql.exec('UPDATE st SET last = ? WHERE sid = ?', Date.now(), s.sid);
      this.touch();
      return json({ ok: 1, pts, today: today + pts });
    }

    if (p === '/board') {
      const per = ['week', 'prevweek', 'month', 'round', 'all'].includes(url.searchParams.get('p')) ? url.searchParams.get('p') : this.get('period');
      return json({ ok: 1, name: this.get('name'), teacher: this.get('teacher'), period: per, def: this.get('period'), since: this.since(per), msg: this.get('msg'), gifts: JSON.parse(this.get('gifts', '[]')), rows: this.board(per) });
    }

    if (p === '/hw' && req.method === 'POST') { // התלמיד/ה: המטלות הפתוחות, העבודה שלי וההודעות אליי
      const s = await this.student(b); if (!s) return json({ error: 'לא מצאנו אתכם בכיתה. אפשר להצטרף שוב עם הקוד מהמורה.', gone: 1 }, 403);
      const list = this.rows('SELECT id, title, ex, t FROM hw WHERE open = 1 ORDER BY t DESC LIMIT 20').map(h => ({ id: h.id, title: h.title, t: h.t, ex: JSON.parse(h.ex).map(e => ({ q: e.q })) }));
      const work = this.rows('SELECT hw, ex, rows, ok, warn, done, stuck, t FROM hwork WHERE sid = ?', s.sid).map(w => Object.assign(w, { rows: JSON.parse(w.rows || '[]') }));
      const msgs = this.rows('SELECT id, hw, ex, kind, text, t FROM hmsg WHERE sid = ? OR sid = \'*\' ORDER BY id', s.sid);
      return json({ ok: 1, name: this.get('name'), teacher: this.get('teacher'), hw: list, work, msgs });
    }
    if (p === '/hwsave' && req.method === 'POST') {
      const s = await this.student(b); if (!s) return json({ error: 'לא מצאנו אתכם בכיתה.', gone: 1 }, 403);
      const h = this.rows('SELECT ex, open FROM hw WHERE id = ?', String(b.hw || ''))[0];
      if (!h) return json({ error: 'המטלה לא נמצאה. אולי המורה מחקה אותה.' }, 404);
      if (!h.open) return json({ error: 'המורה סגרה את המטלה הזאת.', closed: 1 }, 403);
      const ex = Math.floor(+b.ex), n = JSON.parse(h.ex).length;
      if (!(ex >= 0 && ex < n)) return json({ error: 'בקשה לא תקינה' }, 400);
      const rows = (Array.isArray(b.rows) ? b.rows : []).slice(0, 60).map(r => String(r == null ? '' : r).slice(0, 160));
      if (rows.some(r => /https?:|www\.|@|<|>/i.test(r))) return json({ error: 'בשורות של המחברת אסור קישור או מייל.' }, 400);
      const prev = this.rows('SELECT done FROM hwork WHERE hw = ? AND sid = ? AND ex = ?', String(b.hw), s.sid, ex)[0];
      const done = b.done ? 1 : 0;
      this.sql.exec('INSERT OR REPLACE INTO hwork (hw, sid, ex, rows, ok, warn, done, stuck, t) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        String(b.hw), s.sid, ex, JSON.stringify(rows), Math.max(0, Math.min(99, +b.ok || 0)), Math.max(0, Math.min(99, +b.warn || 0)), done, b.stuck ? 1 : 0, Date.now());
      this.sql.exec('UPDATE st SET last = ? WHERE sid = ?', Date.now(), s.sid);
      let pts = 0;
      if (done && !(prev && prev.done)) { // תרגיל שנפתר נכון – 20 נקודות ללוח הכיתה, פעם אחת
        const ref = 'hw:' + b.hw + ':' + ex, day = ilDay(Date.now());
        if (!this.rows('SELECT 1 FROM ev WHERE sid = ? AND ref = ?', s.sid, ref).length) {
          pts = Math.min(20, Math.max(0, MAX_DAY - this.today(s.sid, day)));
          if (pts) this.sql.exec('INSERT INTO ev (sid, ref, game, pts, day, t) VALUES (?, ?, ?, ?, ?, ?)', s.sid, ref, 'machberet', pts, day, Date.now());
        }
      }
      this.touch();
      return json({ ok: 1, pts });
    }

    if (p === '/ans' && req.method === 'POST') {
      const s = await this.student(b); if (!s) return json({ error: 'לא מצאנו אתכם בכיתה.', gone: 1 }, 403);
      const qz = this.get('quiz', ''); if (!qz) return json({ ok: 1 });
      const z = JSON.parse(qz), qi = +b.qi, pick = +b.pick;
      if (+b.v !== z.v || !(qi >= 0 && qi < z.q.length) || !(pick >= 0 && pick < z.q[qi].a.length)) return json({ ok: 1, old: 1 });
      this.sql.exec('INSERT OR IGNORE INTO qa (v, qi, sid, pick) VALUES (?, ?, ?, ?)', z.v, qi, s.sid, pick);
      return json({ ok: 1 });
    }
    if (p === '/leave' && req.method === 'POST') {
      const s = await this.student(b); if (!s) return json({ ok: 1 });
      this.sql.exec('DELETE FROM ev WHERE sid = ?', s.sid); this.sql.exec('DELETE FROM st WHERE sid = ?', s.sid); this.sql.exec('DELETE FROM qa WHERE sid = ?', s.sid);
      this.sql.exec('DELETE FROM hwork WHERE sid = ?', s.sid); this.sql.exec('DELETE FROM hmsg WHERE sid = ?', s.sid);
      return json({ ok: 1 });
    }

    if (p === '/admin' && req.method === 'POST') {
      if (!b.key || (await hash('key:' + b.key)) !== this.get('kh')) return json({ error: 'מפתח המורה לא נכון. פותחים את הקישור שנשמר כשפתחתם את הכיתה.' }, 403);
      const a = b.act;
      if (a === 'settings') {
        if (b.name !== undefined) { const n = cleanText(b.name, 40); if (!n) return json({ error: 'שם הכיתה לא תקין.' }, 400); this.set('name', n); }
        if (b.teacher !== undefined) { const t = cleanText(b.teacher, 30); if (t === null) return json({ error: 'שם המורה לא תקין.' }, 400); this.set('teacher', t || ''); }
        if (['week', 'month', 'round'].includes(b.period)) this.set('period', b.period);
        if (b.locked !== undefined) this.set('locked', b.locked ? '1' : '0');
        if (b.msg !== undefined) { const m = cleanText(b.msg, 140); if (m === null) return json({ error: 'בהודעה לכיתה אסור קישור, טלפון או מייל.' }, 400); this.set('msg', m || ''); }
      } else if (a === 'gifts') {
        const g = (Array.isArray(b.gifts) ? b.gifts : []).slice(0, 10).map(x => ({ i: String(x.i || '🎁').slice(0, 4), t: cleanText(x.t, 50), d: cleanText(x.d, 160) || '', who: /^(1|2|3|top3|all|pts:\d{1,5})$/.test(x.who) ? x.who : '1', k: /^[a-z]{2,10}$/.test(x.k || '') ? x.k : 'other' }));
        if (g.some(x => !x.t)) return json({ error: 'בכל מתנה צריך שם קצר, בלי קישורים או טלפונים.' }, 400);
        this.set('gifts', JSON.stringify(g));
      } else if (a === 'crown') {
        this.sql.exec('UPDATE st SET crown = ? WHERE sid = ?', cleanText(b.label, 30) || '', String(b.sid));
      } else if (a === 'remove') {
        this.sql.exec('DELETE FROM ev WHERE sid = ?', String(b.sid)); this.sql.exec('DELETE FROM st WHERE sid = ?', String(b.sid)); this.sql.exec('DELETE FROM qa WHERE sid = ?', String(b.sid));
        this.sql.exec('DELETE FROM hwork WHERE sid = ?', String(b.sid)); this.sql.exec('DELETE FROM hmsg WHERE sid = ?', String(b.sid));
      } else if (a === 'quiz') {
        const qs = (Array.isArray(b.q) ? b.q : []).slice(0, 20).map(x => ({ q: cleanQ(x.q, 200), a: (Array.isArray(x.a) ? x.a : []).slice(0, 4).map(o => cleanQ(o, 80)) }));
        if (qs.some(x => !x.q || x.a.length < 2 || x.a.some(o => !o))) return json({ error: 'בכל שאלה צריך שאלה ולפחות 2 תשובות, בלי קישורים, טלפונים או מילים לא יפות.' }, 400);
        const t = cleanQ(b.title, 60) || 'תרגול מהמורה';
        this.set('quiz', qs.length ? JSON.stringify({ t, q: qs, v: Date.now() }) : ''); this.sql.exec('DELETE FROM qa');
      } else if (a === 'round') {
        this.set('round', Date.now()); this.sql.exec('UPDATE st SET crown = \'\'');
      } else if (a === 'delete') {
        await this.ctx.storage.deleteAll(); this.tables(); return json({ ok: 1, deleted: 1 });
      } else if (a === 'hw_new') {
        const title = cleanText(b.title, 60);
        if (!title) return json({ error: 'שם המטלה: עד 60 תווים, בלי קישורים או טלפונים. למשל: משוואות ריבועיות – שיעורי בית.' }, 400);
        const ex = (Array.isArray(b.ex) ? b.ex : []).slice(0, 10).map(e => ({ q: mathText(e && e.q, 200), a: mathText(e && e.a, 300) || '', h: mathText(e && e.h, 300) || '' })).filter(e => e.q);
        if (!ex.length) return json({ error: 'צריך לפחות תרגיל אחד. כל תרגיל בשורה משלו, למשל: x^2-5x+6=0' }, 400);
        if (this.rows('SELECT COUNT(*) AS n FROM hw')[0].n >= 60) return json({ error: 'יש כבר 60 מטלות בכיתה. אפשר למחוק ישנות.' }, 403);
        const id = rid(8);
        this.sql.exec('INSERT INTO hw (id, title, ex, t, open) VALUES (?, ?, ?, ?, 1)', id, title, JSON.stringify(ex), Date.now());
        this.touch();
        return json({ ok: 1, id });
      } else if (a === 'hw_list') {
        const st = this.rows('SELECT COUNT(*) AS n FROM st')[0].n;
        const hw = this.rows('SELECT id, title, ex, t, open FROM hw ORDER BY t DESC').map(h => {
          const w = this.rows('SELECT COUNT(DISTINCT sid) AS who, SUM(done) AS done, SUM(stuck) AS stuck FROM hwork WHERE hw = ?', h.id)[0];
          return { id: h.id, title: h.title, n: JSON.parse(h.ex).length, t: h.t, open: !!h.open, who: w.who || 0, done: w.done || 0, stuck: w.stuck || 0 };
        });
        return json({ ok: 1, name: this.get('name'), students: st, hw });
      } else if (a === 'hw_view') {
        const h = this.rows('SELECT id, title, ex, t, open FROM hw WHERE id = ?', String(b.hw || ''))[0];
        if (!h) return json({ error: 'המטלה לא נמצאה.' }, 404);
        const work = this.rows('SELECT sid, ex, rows, ok, warn, done, stuck, t FROM hwork WHERE hw = ?', h.id).map(w => Object.assign(w, { rows: JSON.parse(w.rows || '[]') }));
        const msgs = this.rows('SELECT id, sid, ex, kind, text, t FROM hmsg WHERE hw = ? ORDER BY id', h.id);
        return json({ ok: 1, name: this.get('name'), hw: { id: h.id, title: h.title, t: h.t, open: !!h.open, ex: JSON.parse(h.ex) }, students: this.rows('SELECT sid, nick, last FROM st ORDER BY nick'), work, msgs });
      } else if (a === 'hw_msg') {
        const h = this.rows('SELECT ex FROM hw WHERE id = ?', String(b.hw || ''))[0];
        if (!h) return json({ error: 'המטלה לא נמצאה.' }, 404);
        const ex = Math.floor(+b.ex), kind = b.kind === 'answer' ? 'answer' : 'hint', text = mathText(b.text, 400);
        if (!(ex >= 0 && ex < JSON.parse(h.ex).length) || !text) return json({ error: 'כותבים רמז או תשובה קצרים, בלי קישורים או מייל.' }, 400);
        const sid = b.sid === '*' ? '*' : String(b.sid || '');
        if (sid !== '*' && !this.rows('SELECT 1 FROM st WHERE sid = ?', sid).length) return json({ error: 'התלמיד/ה לא בכיתה.' }, 404);
        this.sql.exec('INSERT INTO hmsg (hw, sid, ex, kind, text, t) VALUES (?, ?, ?, ?, ?, ?)', String(b.hw), sid, ex, kind, text, Date.now());
        if (sid !== '*') this.sql.exec('UPDATE hwork SET stuck = 0 WHERE hw = ? AND sid = ? AND ex = ?', String(b.hw), sid, ex);
        this.touch();
        return json({ ok: 1 });
      } else if (a === 'hw_open') {
        this.sql.exec('UPDATE hw SET open = ? WHERE id = ?', b.open ? 1 : 0, String(b.hw || ''));
        return json({ ok: 1 });
      } else if (a === 'hw_del') {
        const id = String(b.hw || '');
        this.sql.exec('DELETE FROM hw WHERE id = ?', id); this.sql.exec('DELETE FROM hwork WHERE hw = ?', id); this.sql.exec('DELETE FROM hmsg WHERE hw = ?', id);
        return json({ ok: 1 });
      } else if (a !== 'get') return json({ error: 'פעולה לא מוכרת' }, 400);
      this.touch();
      const per = ['week', 'prevweek', 'month', 'round', 'all'].includes(b.p) ? b.p : this.get('period');
      const games = {};
      for (const r of this.rows(`SELECT sid, game, SUM(pts) AS p, COUNT(*) AS n FROM ev WHERE ${this.where(per)} GROUP BY sid, game`)) (games[r.sid] = games[r.sid] || {})[r.game] = { p: r.p, n: r.n };
      const rows = this.board(per).map(r => Object.assign(r, { games: games[r.sid] || {} }));
      return json({ ok: 1, name: this.get('name'), teacher: this.get('teacher'), period: this.get('period'), p: per, since: this.since(per), locked: this.get('locked') === '1', msg: this.get('msg'), quiz: this.get('quiz', '') ? JSON.parse(this.get('quiz')) : null, qstats: this.qstats(), gifts: JSON.parse(this.get('gifts', '[]')), created: +this.get('created'), rows });
    }
    return json({ error: 'לא נמצא' }, 404);
  }

  qstats() {
    const qz = this.get('quiz', ''); if (!qz) return [];
    const z = JSON.parse(qz), out = z.q.map(() => ({ n: 0, ok: 0, picks: {} }));
    for (const r of this.rows('SELECT qi, pick, COUNT(*) AS n FROM qa WHERE v = ? GROUP BY qi, pick', z.v)) {
      const o = out[r.qi]; if (!o) continue;
      o.n += r.n; if (r.pick === 0) o.ok += r.n; else o.picks[r.pick] = r.n;
    }
    return out;
  }
  async student(b) {
    const s = this.rows('SELECT sid, th FROM st WHERE sid = ?', String(b.sid || ''))[0];
    if (!s || (await hash('tok:' + String(b.token || ''))) !== s.th) return null;
    return s;
  }
  today(sid, day) { return this.rows('SELECT COALESCE(SUM(pts), 0) AS n FROM ev WHERE sid = ? AND day = ?', sid, day)[0].n; }
  since(per) {
    const now = Date.now(), d = ilDay(now);
    if (per === 'week' || per === 'prevweek') { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() - x.getUTCDay() - (per === 'prevweek' ? 7 : 0)); return x.toISOString().slice(0, 10); }
    if (per === 'month') return d.slice(0, 8) + '01';
    if (per === 'round') return ilDay(+this.get('round'));
    return '';
  }
  where(per) {
    if (per === 'round') return 't >= ' + (+this.get('round') || 0);
    if (per === 'all') return '1 = 1';
    if (per === 'prevweek') return "day >= '" + this.since('prevweek') + "' AND day < '" + this.since('week') + "'";
    return "day >= '" + this.since(per) + "'";
  }
  board(per) {
    const pts = {};
    for (const r of this.rows(`SELECT sid, SUM(pts) AS p, COUNT(DISTINCT game) AS g, COUNT(DISTINCT day) AS dd FROM ev WHERE ${this.where(per)} GROUP BY sid`)) pts[r.sid] = r;
    const rows = this.rows('SELECT sid, nick, crown, last FROM st').map(s => ({ sid: s.sid, nick: s.nick, crown: s.crown, last: s.last, pts: pts[s.sid] ? pts[s.sid].p : 0, g: pts[s.sid] ? pts[s.sid].g : 0, dd: pts[s.sid] ? pts[s.sid].dd : 0 }));
    rows.sort((a, b) => b.pts - a.pts || a.nick.localeCompare(b.nick, 'he'));
    let place = 0, prev = -1;
    rows.forEach((r, i) => { if (r.pts !== prev) { place = i + 1; prev = r.pts; } r.place = r.pts > 0 ? place : 0; });
    return rows;
  }
}

const BAD = ['זונה', 'זין', 'כוס', 'מזדיין', 'לזיין', 'שרמוטה', 'מניאק', 'חרא', 'קקי', 'דביל', 'מפגר', 'אידיוט', 'סתום', 'סתומה', 'מטומטם', 'מטומטמת', 'שמן', 'שמנה', 'מכוער', 'מכוערת', 'fuck', 'shit', 'bitch', 'sex', 'porn', 'סקס', 'פורנו', 'נאצי', 'היטלר', 'מוות ל'];
function bad(s) {
  const low = ' ' + s.toLowerCase().replace(/[.,?!:;()'"״׳-]/g, ' ') + ' ';
  return BAD.some(w => low.includes(' ' + w + ' ') || (w.length > 3 && low.includes(w)));
}
function cleanText(s, max) {
  s = String(s || '').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  s = s.slice(0, max);
  if (/https?:|www\.|\.(com|co|il|net|org|ly|me)\b|@|t\.me/i.test(s)) return null;
  if (/\d[\d\s-]{6,}\d/.test(s)) return null;
  if (/[<>{}]/.test(s) || bad(s)) return null;
  return s;
}
// טקסט מתמטי של המורה (תרגיל, רמז, תשובה): מספרים ארוכים מותרים, קישורים, מיילים ותגיות לא
function mathText(s, max) {
  s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, max);
  if (!s) return '';
  if (/https?:|www\.|\.(com|co\.il|net|org|ly|me)\b|@|t\.me|<|>/i.test(s) || bad(s)) return '';
  return s;
}
// טקסט של שאלה: מותרים מספרים וסימני חשבון (בלי מסנן הספרות של הכינוי), אבל לא קישור, מייל, טלפון נייד או תגיות
function cleanQ(s, max) {
  s = String(s || '').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  s = s.slice(0, max);
  if (/https?:|www\.|\.(com|co|il|net|org|ly|me)\b|@|t\.me/i.test(s)) return null;
  if (/(^|\D)05\d-?\d{7}(\D|$)/.test(s) || /[<>{}]/.test(s) || bad(s)) return null;
  return s;
}
function cleanNick(s) {
  s = String(s || '').replace(/\s+/g, ' ').trim();
  if (s.length < 2 || [...s].length > 16) return '';
  if (/\d{4,}/.test(s) || /[@<>{}/\\]|https?:|www\./i.test(s)) return '';
  if (!/^[֐-׿A-Za-z0-9 ._'"״׳\-\u{1F300}-\u{1FAFF}☀-➿️‍]+$/u.test(s)) return '';
  if (bad(s)) return '';
  return s;
}
function ilDay(t) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t)); }
function rid(n) { const a = 'abcdefghijkmnpqrstuvwxyz23456789'; let s = ''; const r = crypto.getRandomValues(new Uint8Array(n)); for (const x of r) s += a[x % a.length]; return s; }
async function hash(s) { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('kita:' + s)); return [...new Uint8Array(d)].slice(0, 12).map(x => x.toString(16).padStart(2, '0')).join(''); }
function json(o, st = 200, h = {}) { return new Response(JSON.stringify(o), { status: st, headers: Object.assign({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }, h) }); }
function cors(origin, env) {
  const extra = (env.EXTRA_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const ok = ORIGINS.includes(origin) || extra.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  const h = { 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'content-type', 'Vary': 'Origin' };
  if (ok) h['Access-Control-Allow-Origin'] = origin;
  return h;
}
