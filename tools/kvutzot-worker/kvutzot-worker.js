// מוצאים קבוצה – Cloudflare Worker + Durable Object אחד (חינמי). מחובר ל-/kelim/kehila/kvutzot-whatsapp/.
// הרעיון באדיבות אהרן גרינברג.
// פרטיות: השרת לא מקבל שם, טלפון, מייל או מוגבלות של מי שמחפש קבוצה. השאלון מחושב בדפדפן בלבד;
// לשרת מגיעה רק בקשה לקישור של קבוצה אחת (כדי שקישורים לא יהיו גלויים לסורקים), ומונה "רוצה קבוצה כזאת" אנונימי.
//
// ציבורי:
//   GET  /meta                      -> {interests, regions, ages, tags}
//   GET  /groups                    -> {items:[{id,name,desc,interests,region,ages,tags}]}   רק קבוצות שאושרו, בלי קישורים
//   POST /link   {id}               -> {link}                  קישור הצטרפות לקבוצה אחת (מוגבל לכל רשת ביום)
//   POST /add    {name,desc,interests,region,ages,tags,link,ok18,hp} -> {id,key}   הרשמת קבוצה – ממתינה לאישור
//   POST /remove {id,key}           -> {ok}                    מנהל הקבוצה מוריד אותה
//   POST /want   {interest,region,age,tag} -> {n}              "אין קבוצה כזאת – אני רוצה"; ב-5 מגיעה התראה לגילעד
//   POST /report {id,why}           -> {ok}                    דיווח; 2 דיווחים מרשתות שונות מסתירים את הקבוצה עד בדיקה
//   POST /broken {id}               -> {ok}                    "הקישור לא עובד"; 2 מרשתות שונות מסתירים עד שהמנהל מחליף קישור
//   POST /relink {id,key,link}      -> {ok, st}                מנהל הקבוצה מחליף קישור (קישור שאופס); קבוצה שהוסתרה בגלל קישור שבור חוזרת
// ניהול (כותרת X-Admin-Key):
//   GET  /admin/list                -> הכול, כולל ממתינות, מוסתרות ודיווחים
//   POST /admin/set {id, st}        st: live | pending | hidden | rejected
//   GET  /admin/wants               -> ביקושים לפי צירוף
const ORIGINS = ['https://gilad-rachamim.github.io', 'https://hakelim.com', 'https://www.hakelim.com'];
const SITE = 'https://hakelim.com';
const PAGE = '/kelim/kehila/kvutzot-whatsapp/';
export const META = {
  interests: ['לימוד תורה', 'הורות ומשפחה', 'תמיכה רגשית', 'בריאות', 'ספורט והליכה', 'טיולים', 'בישול ואפייה', 'מוזיקה ושירה',
    'ספרים וקריאה', 'מחשבים וטכנולוגיה', 'עבודה ותעסוקה', 'יזמות ועסק קטן', 'התנדבות וחסד', 'אמנות ויצירה', 'צילום',
    'גינה וטבע', 'בעלי חיים', 'קהילה ושכונה', 'פנאי והומור', 'לימודים ואקדמיה', 'שפות'],
  regions: ['כל הארץ', 'ירושלים והסביבה', 'גוש דן והמרכז', 'השרון', 'השפלה', 'חיפה והקריות', 'הצפון', 'הדרום והנגב', 'יהודה ושומרון'],
  ages: ['18–30', '30–45', '45–60', '60+'],
  kinds: ['שקטה – רק הודעות חשובות', 'שיחה רגועה', 'שיחה ערה'],
  tags: ['לוחמים ופצועי צה"ל', 'אנשים עם מוגבלות', 'הורים לילדים עם צרכים מיוחדים', 'בני משפחה מטפלים', 'נשים בלבד', 'גברים בלבד',
    'ציבור דתי', 'ציבור חרדי', 'ציבור כללי', 'עולים חדשים', 'דוברי אנגלית'],
};
const LIM = { LINK_IP: 25, ADD_IP: 4, ADD_ALL: 60, WANT_IP: 10, REPORT_IP: 10, RELINK_ID: 5 };   // ליום
const WANT_ALERT = 5, REPORTS_HIDE = 2, BROKEN_HIDE = 2;
const STATUS = ['pending', 'live', 'hidden', 'rejected'];
const LINK_RE = /^https:\/\/chat\.whatsapp\.com\/(invite\/)?[A-Za-z0-9]{10,40}$/;

export default {
  async fetch(req, env) {
    const cors = corsHeaders(req.headers.get('Origin') || '', env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    let res;
    try {
      const url = new URL(req.url);
      if (url.pathname === '/' || url.pathname === '/ping') res = json({ ok: true, name: 'kelim-kvutzot', v: 2 });
      else if (url.pathname === '/meta') res = json(META, 200, 'public, max-age=3600');
      else {
        const admin = url.pathname.startsWith('/admin/');
        if (admin && (!env.ADMIN_KEY || req.headers.get('X-Admin-Key') !== env.ADMIN_KEY)) res = json({ error: 'forbidden' }, 403);
        else {
          const ip = req.headers.get('CF-Connecting-IP') || 'x';
          const iph = (await sha(ip + '|' + day() + '|' + (env.ADMIN_KEY || 'salt'))).slice(0, 16);   // לא שומרים כתובת רשת, רק טביעה יומית
          const r = await store(env).fetch('https://do' + url.pathname + url.search, {
            method: req.method, headers: { 'X-Iph': iph }, body: req.method === 'POST' ? await req.text() : undefined });
          res = new Response(r.body, r);
        }
      }
    } catch (e) {
      res = json({ error: 'שגיאה פנימית' }, 500);
    }
    res = new Response(res.body, res);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
    return res;
  },
  async scheduled(ev, env, ctx) {
    ctx.waitUntil(store(env).fetch('https://do/cron', { method: 'POST', body: '{}' }));
  },
};
function store(env) { return env.GROUPS.get(env.GROUPS.idFromName('groups')); }

export class Groups {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; this.s = ctx.storage; }

  async fetch(req) {
    const url = new URL(req.url), p = url.pathname, iph = req.headers.get('X-Iph') || 'x';
    const b = req.method === 'POST' ? await readJson(req) : null;
    if (req.method === 'POST' && !b) return json({ error: 'בקשה לא תקינה' }, 400);
    if (p === '/groups' && req.method === 'GET') return this.publicList();
    if (p === '/link' && b) return this.link(b, iph);
    if (p === '/add' && b) return this.add(b, iph);
    if (p === '/remove' && b) return this.remove(b);
    if (p === '/want' && b) return this.want(b, iph);
    if (p === '/report' && b) return this.report(b, iph);
    if (p === '/broken' && b) return this.broken(b, iph);
    if (p === '/relink' && b) return this.relink(b);
    if (p === '/admin/list') return json({ items: await this.all(true) });
    if (p === '/admin/set' && b) return this.set(b);
    if (p === '/admin/wants') return json({ items: await this.wants() });
    if (p === '/cron' && b) return json(await this.cron());
    return json({ error: 'not found' }, 404);
  }

  async all(withPrivate) {
    const m = await this.s.list({ prefix: 'g:', limit: 2000 });
    return [...m.values()].map(g => withPrivate ? Object.assign({}, g, { key: undefined }) : g);
  }

  async publicList() {
    const items = (await this.all()).filter(g => g.st === 'live')
      .map(g => ({ id: g.id, name: g.name, desc: g.desc, interests: g.interests, region: g.region, ages: g.ages, tags: g.tags,
        kind: g.kind || '', since: day(g.t) }));
    return json({ items });
  }

  async bump(key, max) {            // מונה יומי; true = עבר את התקרה
    const k = 'rl:' + day() + ':' + key, n = ((await this.s.get(k)) || 0) + 1;
    await this.s.put(k, n);
    return n > max;
  }

  async link(b, iph) {
    const g = await this.s.get('g:' + clean(b.id, 20));
    if (!g || g.st !== 'live') return json({ error: 'הקבוצה לא נמצאה או שהוסרה.' }, 404);
    if (await this.bump('l:' + iph, LIM.LINK_IP)) return json({ error: 'ביקשתם היום הרבה קישורים. אפשר להמשיך מחר.' }, 429);
    return json({ link: g.link });
  }

  async add(b, iph) {
    if (b.hp) return json({ id: '0', key: '' });                               // בוט
    const name = clean(b.name, 60), desc = publicText(clean(b.desc, 300)), link = String(b.link || '').trim();
    if (name.length < 3) return json({ error: 'כתבו את שם הקבוצה.' }, 400);
    if (desc.length < 10) return json({ error: 'כתבו משפט או שניים על הקבוצה.' }, 400);
    if (!LINK_RE.test(link)) return json({ error: 'הקישור צריך להיות קישור הזמנה של ווטסאפ (https://chat.whatsapp.com/...).' }, 400);
    if (!b.ok18) return json({ error: 'צריך לאשר את כללי הבטיחות (18+, בלי היכרויות).' }, 400);
    const interests = pick(b.interests, META.interests, 5);
    if (!interests.length) return json({ error: 'בחרו לפחות תחום עניין אחד.' }, 400);
    const region = META.regions.includes(b.region) ? b.region : 'כל הארץ';
    const ages = pick(b.ages, META.ages, 4), tags = pick(b.tags, META.tags, 4);
    const kind = META.kinds.includes(b.kind) ? b.kind : '';
    const dup = (await this.all()).find(g => g.link === link && g.st !== 'rejected');
    if (dup) return json({ error: 'הקבוצה הזאת כבר רשומה אצלנו.' }, 409);
    if (await this.bump('a:' + iph, LIM.ADD_IP)) return json({ error: 'קיבלנו מכם כבר כמה קבוצות היום. אפשר להמשיך מחר.' }, 429);
    if (await this.bump('a:all', LIM.ADD_ALL)) return json({ error: 'הגיעו היום הרבה קבוצות. נסו שוב מחר.' }, 429);
    const id = newId(8), key = newId(16);
    const g = { id, t: Date.now(), name, desc, interests, region, ages, tags, link, kind, st: 'pending', rep: 0, repBy: [], brk: 0, brkBy: [], key: await sha(key) };
    await this.s.put('g:' + id, g);
    this.ctx.waitUntil(this.alert('🆕 קבוצה חדשה ממתינה לאישור: ' + name + '\n' + desc + '\nתחומים: ' + interests.join(', ') + ' · ' + region));
    return json({ id, key });
  }

  async remove(b) {
    const g = await this.s.get('g:' + clean(b.id, 20));
    if (!g || !b.key || g.key !== await sha(String(b.key))) return json({ error: 'הקוד לא מתאים לקבוצה.' }, 403);
    await this.s.delete('g:' + g.id);
    return json({ ok: true });
  }

  async want(b, iph) {
    const parts = [META.interests.includes(b.interest) ? b.interest : '', META.regions.includes(b.region) ? b.region : '',
      META.ages.includes(b.age) ? b.age : '', META.tags.includes(b.tag) ? b.tag : ''];
    if (!parts[0] && !parts[3]) return json({ error: 'בחרו תחום עניין.' }, 400);
    const combo = parts.join('|'), k = 'w:' + (await sha(combo)).slice(0, 20);
    if (await this.s.get('rl:' + day() + ':w:' + k + ':' + iph)) return json({ dup: true });
    if (await this.bump('w:' + iph, LIM.WANT_IP)) return json({ dup: true });
    const w = (await this.s.get(k)) || { combo, n: 0, alerted: false, t: Date.now() };
    w.n++;
    await this.s.put({ [k]: w, ['rl:' + day() + ':w:' + k + ':' + iph]: 1 });
    if (w.n >= WANT_ALERT && !w.alerted) {
      w.alerted = true; await this.s.put(k, w);
      this.ctx.waitUntil(this.alert('🙋 ' + w.n + ' אנשים מחפשים קבוצה שאין עדיין: ' + combo.split('|').filter(Boolean).join(' · ')));
    }
    return json({ n: w.n });
  }

  async wants() {
    const m = await this.s.list({ prefix: 'w:', limit: 2000 });
    return [...m.values()].sort((a, b) => b.n - a.n);
  }

  async report(b, iph) {
    const g = await this.s.get('g:' + clean(b.id, 20));
    if (!g) return json({ error: 'הקבוצה לא נמצאה.' }, 404);
    if (await this.bump('r:' + iph, LIM.REPORT_IP)) return json({ ok: true });
    if (g.repBy.includes(iph)) return json({ ok: true });
    g.repBy.push(iph); g.rep++;
    (g.whys = g.whys || []).push(clean(b.why, 140));
    if (g.rep >= REPORTS_HIDE && g.st === 'live') {
      g.st = 'hidden'; g.hid = 'report';
      this.ctx.waitUntil(this.alert('⚠️ קבוצה הוסתרה אחרי ' + g.rep + ' דיווחים: ' + g.name + '\nסיבות: ' + g.whys.filter(Boolean).join(' / ')));
    }
    await this.s.put('g:' + g.id, g);
    return json({ ok: true });
  }

  async broken(b, iph) {
    const g = await this.s.get('g:' + clean(b.id, 20));
    if (!g) return json({ error: 'הקבוצה לא נמצאה.' }, 404);
    if (await this.bump('r:' + iph, LIM.REPORT_IP)) return json({ ok: true });
    g.brkBy = g.brkBy || [];
    if (g.brkBy.includes(iph)) return json({ ok: true });
    g.brkBy.push(iph); g.brk = (g.brk || 0) + 1;
    if (g.brk >= BROKEN_HIDE && g.st === 'live') {
      g.st = 'hidden'; g.hid = 'broken';
      this.ctx.waitUntil(this.alert('🔗 הקישור של "' + g.name + '" לא עובד (' + g.brk + ' דיווחים). הקבוצה הוסתרה עד שהמנהל יחליף קישור בדף.'));
    }
    await this.s.put('g:' + g.id, g);
    return json({ ok: true });
  }

  async relink(b) {
    const g = await this.s.get('g:' + clean(b.id, 20));
    if (!g || !b.key || g.key !== await sha(String(b.key))) return json({ error: 'הקוד לא מתאים לקבוצה.' }, 403);
    const link = String(b.link || '').trim();
    if (!LINK_RE.test(link)) return json({ error: 'הקישור צריך להיות קישור הזמנה של ווטסאפ (https://chat.whatsapp.com/...).' }, 400);
    if (await this.bump('k:' + g.id, LIM.RELINK_ID)) return json({ error: 'החלפתם היום כמה פעמים. אפשר שוב מחר.' }, 429);
    const dup = (await this.all()).find(x => x.link === link && x.id !== g.id && x.st !== 'rejected');
    if (dup) return json({ error: 'הקישור הזה כבר רשום לקבוצה אחרת.' }, 409);
    g.link = link; g.brk = 0; g.brkBy = [];
    if (g.st === 'hidden' && g.hid === 'broken') { g.st = 'live'; g.hid = ''; }
    await this.s.put('g:' + g.id, g);
    this.ctx.waitUntil(this.alert('🔁 מנהל "' + g.name + '" החליף קישור. מצב: ' + g.st));
    return json({ ok: true, st: g.st });
  }

  async set(b) {
    const g = await this.s.get('g:' + clean(b.id, 20));
    if (!g) return json({ error: 'not found' }, 404);
    if (!STATUS.includes(b.st)) return json({ error: 'bad status' }, 400);
    g.st = b.st;
    if (b.st === 'live') { g.rep = 0; g.repBy = []; g.brk = 0; g.brkBy = []; g.hid = ''; }
    await this.s.put('g:' + g.id, g);
    return json({ ok: true, id: g.id, st: g.st });
  }

  async alert(text) {
    const markup = { inline_keyboard: [[{ text: '📋 ללוח הניהול', url: SITE + PAGE + 'nihul/#k=' + (this.env.ADMIN_KEY || '') }]] };
    if (!this.env.HUB || !this.env.HUB_SECRET) { this.lastAlert = text; return { sent: false, why: 'no hub binding' }; }
    try {
      const res = await this.env.HUB.fetch('https://gilad-hub/pc/send', { method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Hub-Secret': this.env.HUB_SECRET }, body: JSON.stringify({ bot: 'hub', text, markup }) });
      return { sent: !!(await res.json().catch(() => ({}))).ok };
    } catch (e) { return { sent: false }; }
  }

  async cron() {
    const today = day(), old = await this.s.list({ prefix: 'rl:', limit: 1000 });
    const del = [...old.keys()].filter(k => !k.startsWith('rl:' + today + ':'));
    for (let i = 0; i < del.length; i += 120) await this.s.delete(del.slice(i, i + 120));
    return { cleaned: del.length };
  }
}

// ---------- עזר ----------
function clean(s, max) { return String(s || '').replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max); }
function publicText(s) {   // בלי קישורים, מיילים וטלפונים בתיאור
  return s.replace(/\bhttps?:\/\/\S+/gi, '…').replace(/\bwww\.\S+/gi, '…').replace(/\S+@\S+\.\S+/g, '…').replace(/(?:\+?\d[\s\-.]?){7,}/g, '… ').replace(/\s+/g, ' ').trim();
}
function pick(arr, allowed, max) { return Array.isArray(arr) ? [...new Set(arr.filter(x => allowed.includes(x)))].slice(0, max) : []; }
function newId(n) {
  const ABC = '23456789abcdefghijkmnpqrstuvwxyz';
  return [...crypto.getRandomValues(new Uint8Array(n))].map(x => ABC[x % ABC.length]).join('');
}
function day(t) { return (t ? new Date(t) : new Date()).toISOString().slice(0, 10); }
function corsHeaders(origin, env) {
  const extra = (env.EXTRA_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const ok = ORIGINS.includes(origin) || extra.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  const h = { 'Vary': 'Origin' };
  if (ok) {
    h['Access-Control-Allow-Origin'] = origin;
    h['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    h['Access-Control-Allow-Headers'] = 'Content-Type, X-Admin-Key';
    h['Access-Control-Max-Age'] = '86400';
  }
  return h;
}
function json(obj, status = 200, cache) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cache || 'no-store' } });
}
async function readJson(req) { try { const t = await req.text(); return t ? JSON.parse(t) : {}; } catch (e) { return null; } }
async function sha(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}
