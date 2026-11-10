// החדשות ב-3 דקות – Cloudflare Worker שמסכם חדשות 3 פעמים ביום (07:00, 13:00, 20:00 שעון ישראל).
// קורא כותרות ותקצירים מ-RSS ← מסנן לקו כשר ← Gemini כותב נקודות קצרות במילים שלו ← בדיקה שנייה מול המקור.
// אין מפתח Gemini? יוצא "מצב כותרות": הכותרות הנבחרות עם קישור, בלי סיכום.
// בשבת ובחג לא רץ (מהדלקת נרות בירושלים עד צאת הכוכבים). מוצ"ש בערב: סיכום "מה היה בשבת".
// התראות: Web Push בלי תוכן (לא צריך הצפנה) – ה-sw.js של הכלים מקבל את הדחיפה ומביא בעצמו את /latest.
// חינם לכולם. נקודות הקצה: /latest  /history  /report (POST)  /reports?key=  /run?key=  /stats  /subscribe  /unsubscribe
import { HDate, HebrewCalendar, Zmanim, GeoLocation, flags } from '@hebcal/core';

const TZ = 'Asia/Jerusalem';
const VERSION = 1;
const RUN_HOURS = [7, 13, 20];
const LATE_HOURS = [21, 22]; // ריצה מאוחרת רק אם הריצה של 20:00 נפלה על שבת/חג
const JLM = new GeoLocation('ירושלים', 31.778, 35.235, 754, TZ);

// [מזהה, שם, נושא, כתובת]
export const SOURCES = [
  ['ynet', 'ynet', 'כללי', 'https://www.ynet.co.il/Integration/StoryRss1854.xml'],
  ['walla', 'וואלה', 'כללי', 'https://www.walla.co.il/rss/feed/news/israel'],
  ['maariv', 'מעריב', 'כללי', 'https://www.maariv.co.il/rss/rsschadashot'],
  ['inn', 'ערוץ 7', 'כללי', 'https://www.inn.co.il/Rss.aspx'],
  ['c14', 'ערוץ 14', 'כללי', 'https://www.c14.co.il/feed/'],
  ['kikar', 'כיכר השבת', 'חרדי', 'https://www.kikar.co.il/feed'],
  ['bhol', 'בחדרי חרדים', 'חרדי', 'https://www.bhol.co.il/rss'],
  ['jdn', 'JDN', 'חרדי', 'https://www.jdn.co.il/feed/'],
  ['globes', 'גלובס', 'כלכלה', 'https://www.globes.co.il/webservice/rss/rssfeeder.asmx/FeederNode?iID=2']
];

// ---------- סינון לקו כשר ----------
// ידיעה עם אחת המילים האלה לא נכנסת בכלל (גם לא לבינה)
const BLOCK_WORDS = ['מינית', 'מיני ', 'אונס', 'נאנס', 'זנות', 'פורנו', 'עירום', 'חשפנ', 'פדופיל', 'מעשה מגונה', 'מעשים מגונים',
  'בגידה', 'רומן', 'דוגמנ', 'סלב', 'ריאליטי', 'האח הגדול', 'אירוויזיון', 'זמרת', 'שחקנית', 'הומו', 'להט"ב', 'גאווה',
  'הימורים', 'קזינו', 'כדורגל', 'כדורסל', 'ליגת העל', 'הפועל ', 'מכבי תל אביב', 'בית"ר ירושלים', 'מונדיאל', 'אולימפי', 'סמים', 'קנאביס', 'אלכוהול', 'שיכור', 'התאבד', 'התאבדות'];
// פשע: רק אם זה לא פיגוע/ביטחון (פיגוע נכנס כמשפט עובדתי אחד)
const CRIME_WORDS = ['נרצח', 'רצח', 'נדקר', 'דקירה', 'שוד', 'אלימות במשפחה', 'התעללות', 'גופה'];
const SECURITY_WORDS = ['פיגוע', 'מחבל', 'טרור', 'צה"ל', 'חמאס', 'חיזבאללה'];
const BLOCK_LINKS = /\/(sport|sports|spo|entertainment|celebs|culture|tarbut|food|fashion|travel|tvreviews|xnet|pnai|leisure|digital\/games)\b/i;

export function kosher(text, link = '') {
  if (BLOCK_LINKS.test(link)) return false;
  if (BLOCK_WORDS.some(w => text.includes(w))) return false;
  if (CRIME_WORDS.some(w => text.includes(w)) && !SECURITY_WORDS.some(w => text.includes(w))) return false;
  return true;
}

// ---------- RSS ----------
function decode(s) {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}
// גרשיים בתוך מילה (זצ"ל, חב"ד) הופכים ל-״, אחרת הבינה סוגרת את המחרוזת באמצע המילה והנקודה נקטעת
export const gershayim = s => s.replace(/([א-ת])["“”]([א-ת])/g, '$1״$2');
function strip(s) { return gershayim(decode(decode(s || '')).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()); }
function tag(item, name) { const m = item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`)); return m ? m[1] : ''; }

export function parseRss(xml, src) {
  const items = [];
  for (const m of xml.matchAll(/<item[\s>][\s\S]*?<\/item>/g)) {
    const it = m[0];
    const title = strip(tag(it, 'title'));
    const link = strip(tag(it, 'link')).replace(/[?#]utm_[^ ]*$/, '').split('?utm_')[0];
    const desc = strip(tag(it, 'description')).slice(0, 400);
    const t = Date.parse(strip(tag(it, 'pubDate'))) || 0;
    if (title && link.startsWith('http')) items.push({ src: src[0], name: src[1], topic: src[2], title, desc, link, t });
  }
  return items;
}

async function fetchAll(sinceMs) {
  const res = await Promise.allSettled(SOURCES.map(async s => {
    const r = await fetch(s[3], { headers: { 'user-agent': 'Mozilla/5.0 (kelim-news; hakelim.com)' }, redirect: 'follow', cf: { cacheTtl: 300 } });
    if (!r.ok) throw new Error(s[0] + ' ' + r.status);
    return parseRss(await r.text(), s);
  }));
  const ok = [], failed = [];
  res.forEach((r, i) => r.status === 'fulfilled' ? ok.push(...r.value) : failed.push(SOURCES[i][0]));
  const seen = new Set();
  const items = ok
    .filter(x => !x.t || x.t >= sinceMs)
    .filter(x => kosher(x.title + ' ' + x.desc, x.link))
    .filter(x => { const k = x.title.slice(0, 40); if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => b.t - a.t);
  // עד 14 ידיעות מכל מקור, כדי שמקור אחד לא ישתלט
  const per = {}, out = [];
  for (const x of items) { per[x.src] = (per[x.src] || 0) + 1; if (per[x.src] <= 14) out.push(x); }
  out.forEach((x, i) => { x.id = i + 1; });
  return { items: out, failed };
}

// ---------- Gemini ----------
const WRITE_RULES = `אתה עורך של "החדשות ב-3 דקות": סיכום חדשות רגוע לציבור החרדי, למי שרוצה להפסיק לרפרש אתרי חדשות.
קיבלת רשימת ידיעות ממוספרות (כותרת, תקציר, מקור). כתוב:
- main: 5 הנקודות הכי חשובות לכלל הציבור. כל נקודה משפט אחד או שניים, עד 30 מילים, במילים שלך.
- haredi: עד 3 נקודות מהציבור החרדי (רק מידיעות שמקורן כיכר השבת, בחדרי חרדים או JDN, ושלא נכנסו ל-main).
- economy: עד 2 נקודות כלכלה שנוגעות לכיס של משפחה (מחירים, משכנתא, קצבאות, מיסים). אם אין – ריק.
חוקים:
1. רק עובדות שכתובות בידיעות. לא להוסיף שום פרט, מספר, שם או הערכה שלא מופיעים שם.
2. לא להעתיק משפטים מהמקור. לנסח מחדש, פשוט ורגוע. בלי סימני קריאה, בלי "דרמטי", "סערה", "הלם".
3. כל נקודה עם ids – מספרי הידיעות שעליהן היא מבוססת (לפחות אחת).
4. אם רק מקור אחד מדווח על משהו שנוי במחלוקת – לפתוח ב"לפי דיווח ב<שם המקור>".
5. קו כשר: בלי פשע ופריצות, בלי רכילות, בלי ספורט ובידור, בלי פרטים קשים. פיגוע או אסון – משפט עובדתי אחד, בלי תיאורים.
6. בלי פוליטיקה צועקת ובלי דעות. מה קרה, ומה זה אומר לאנשים.
7. אם יש כמה ידיעות על אותו נושא – נקודה אחת עם כל ה-ids.
8. ביטחון, פשע ואסונות: ניסוח שקט ועניני. מה קרה, איפה, ומה המצב עכשיו. בלי פעלים קשים ("נטבח", "נשחט", "מרחץ דמים"), בלי פרטי פציעות, בלי ציטוטים מפחידים. אם יש הנחיה לציבור (פיקוד העורף, משטרה) – לכתוב אותה.
9. ראשי תיבות כותבים עם ״ (גרשיים עבריים), לא עם מירכאות: זצ״ל, חב״ד, צה״ל.`;

const WRITE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    main: { type: 'ARRAY', items: { type: 'OBJECT', properties: { text: { type: 'STRING' }, ids: { type: 'ARRAY', items: { type: 'INTEGER' } } }, required: ['text', 'ids'] } },
    haredi: { type: 'ARRAY', items: { type: 'OBJECT', properties: { text: { type: 'STRING' }, ids: { type: 'ARRAY', items: { type: 'INTEGER' } } }, required: ['text', 'ids'] } },
    economy: { type: 'ARRAY', items: { type: 'OBJECT', properties: { text: { type: 'STRING' }, ids: { type: 'ARRAY', items: { type: 'INTEGER' } } }, required: ['text', 'ids'] } }
  },
  required: ['main', 'haredi', 'economy']
};

const CHECK_RULES = `אתה בודק עובדות. לכל נקודה מצורפים המקורות שלה (שם האתר, כותרת ותקציר).
ok=false רק אם יש בנקודה עובדה ממשית שלא כתובה במקורות או סותרת אותם: שם, מספר, תאריך, מקום, תפקיד, ציטוט, או טענה מה קרה.
מותר, ולא סיבה לפסול: ניסוח אחר במילים פשוטות; סיכום של כמה מקורות יחד; "לפי דיווח ב<שם האתר>" כששם האתר מופיע במקורות; "היום", "אתמול", "הלילה" כשהמקורות מדברים על אירוע עכשווי; תואר מוכר (נשיא, ראש הממשלה, ח״כ) של אדם ששמו במקור.
ok=false גם אם הנקודה קטועה או לא מובנת.
כש-ok=false: why קצר בעברית, ו-fix – הנקודה מתוקנת במשפט אחד או שניים שכל פרט בהם כתוב במקורות (בלי הפרט הבעייתי), או ריק אם אי אפשר.`;
const CHECK_SCHEMA = {
  type: 'OBJECT',
  properties: { results: { type: 'ARRAY', items: { type: 'OBJECT', properties: { n: { type: 'INTEGER' }, ok: { type: 'BOOLEAN' }, why: { type: 'STRING' }, fix: { type: 'STRING' } }, required: ['n', 'ok'] } } },
  required: ['results']
};

async function gemini(env, system, user, schema) {
  const models = (env.GEMINI_MODELS || 'gemini-3.8-flash,gemini-3.7-flash,gemini-3.5-flash,gemini-flash-lite-latest,gemini-3.5-flash-lite').split(',').map(s => s.trim());
  let last;
  for (const model of models) {
    let r;
    try {
    r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      signal: AbortSignal.timeout(45000),
      headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json', responseSchema: schema }
      })
    });
    } catch (e) { last = `${model} timeout`; continue; } // דגם עמוס – עוברים לבא
    if (r.ok) {
      const j = await r.json();
      const txt = j.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
      return { data: JSON.parse(txt), model };
    }
    last = `${model} ${r.status} ${(await r.text()).slice(0, 200)}`;
    if (![404, 429, 500, 503].includes(r.status)) break; // עמוס או לא קיים – מנסים את הדגם הבא
  }
  throw new Error(last);
}

// מספרים בנקודה חייבים להופיע במקור (בדיקה בקוד, בלי בינה)
export function numbersOk(text, srcText) {
  const nums = (text.match(/\d[\d,.]*/g) || []).map(n => n.replace(/[,.]$/, ''));
  const plain = srcText.replace(/,/g, '');
  return nums.every(n => srcText.includes(n) || plain.includes(n.replace(/,/g, '')));
}

// הדגמים הקלים מכניסים לפעמים מילה ברוסית/ערבית/סינית באמצע משפט – נקודה כזו לא יוצאת
export const FOREIGN = /[Ѐ-ӿ؀-ۿ぀-鿿가-힯]/;
// ניקוי אחרון: גרשיים, ו"דיווח בבחדרי חרדים" (ב' כפולה) ← "דיווח באתר בחדרי חרדים"
export const tidy = s => gershayim(String(s).trim()).replace(/(דיווח|פורסם|נמסר)\s+בבחדרי/g, '$1 באתר בחדרי');

// תיקון של הבודק מתקבל רק אם הוא משפט שלם וקצר, המספרים בו מהמקור, והוא עובר סינון כשר
export function fixOk(fix, srcText) {
  const t = (fix || '').trim();
  return t.length >= 25 && t.length <= 260 && /[.)א-ת\d]$/.test(t) && !FOREIGN.test(t) && numbersOk(t, srcText) && kosher(t);
}

async function summarize(env, items) {
  const list = items.map(x => `#${x.id} [${x.name}] ${x.title}${x.desc ? ' – ' + x.desc : ''}`).join('\n');
  const w = await gemini(env, WRITE_RULES, list, WRITE_SCHEMA);
  const byId = Object.fromEntries(items.map(x => [x.id, x]));
  const all = [];
  for (const sec of ['main', 'haredi', 'economy']) {
    for (const p of (w.data[sec] || [])) {
      const ids = (p.ids || []).filter(id => byId[id]);
      if (!ids.length || !p.text) continue;
      all.push({ sec, text: tidy(p.text), ids });
    }
  }
  // בדיקה שנייה מול המקור
  const checkText = all.map((p, i) => `נקודה ${i + 1}: ${p.text}\nמקורות:\n` +
    p.ids.map(id => `- [${byId[id].name}] ${byId[id].title}. ${byId[id].desc}`).join('\n')).join('\n\n');
  let verdict = null, checkError = '';
  for (let tryN = 0; tryN < 2 && !verdict; tryN++) { // דגמים עמוסים בבוקר – ניסיון שני אחרי הפסקה קצרה
    try {
      const c = await gemini(env, CHECK_RULES, checkText, CHECK_SCHEMA);
      verdict = {};
      for (const r of c.data.results || []) verdict[r.n] = r;
    } catch (e) { checkError = String(e.message || e).slice(0, 300); if (!tryN) await new Promise(r => setTimeout(r, 8000)); }
  }
  const dropped = [], fixed = [];
  const sections = { main: [], haredi: [], economy: [] };
  all.forEach((p, i) => {
    const srcText = p.ids.map(id => byId[id].name + ' ' + byId[id].title + ' ' + byId[id].desc).join(' ');
    const v = verdict ? verdict[i + 1] : null;
    let why = '', fixedFrom = '';
    // הבודק פסל ונתן תיקון שנשען רק על המקור – לוקחים את התיקון
    if (v && !v.ok && fixOk(v.fix, srcText)) { fixedFrom = p.text; p.text = tidy(v.fix); v.ok = true; }
    if (FOREIGN.test(p.text)) why = 'אותיות בשפה זרה באמצע הנקודה';
    else if (!numbersOk(p.text, srcText)) why = 'מספר שלא מופיע במקור';
    else if (verdict === null) why = 'הבדיקה השנייה לא רצה';
    else if (!v || !v.ok) why = (v && v.why) || 'לא אומת';
    else if (!kosher(p.text)) why = 'סינון כשר';
    if (why) { dropped.push({ text: p.text, why }); return; }
    if (fixedFrom) fixed.push({ from: fixedFrom, to: p.text, why: v.why || '' });
    const seen = new Set(); // מקור אחד פעם אחת, גם אם כמה ידיעות שלו
    sections[p.sec].push({ text: p.text, sources: p.ids.map(id => ({ name: byId[id].name, link: byId[id].link })).filter(x => !seen.has(x.name) && seen.add(x.name)) });
  });
  return { mode: 'summary', model: w.model, sections, dropped, fixed, checkError };
}

function titlesOnly(items) {
  const pick = (topic, n) => {
    const out = [], used = new Set();
    for (const x of items) {
      if (x.topic !== topic || used.has(x.src)) continue;
      const text = x.title.replace(/^(צפו|צפו בתיעוד|תיעוד|וידאו|בלעדי|דרמה|מבזק)\s*[:|]\s*/, '').replace(/\s*\|\s*(צפו|תיעוד|וידאו|גלריה)[^|]*$/, '').replace(/!+/g, '');
      used.add(x.src); out.push({ text, sources: [{ name: x.name, link: x.link }] });
      if (out.length >= n) break;
    }
    return out;
  };
  return { mode: 'titles', sections: { main: pick('כללי', 5), haredi: pick('חרדי', 3), economy: pick('כלכלה', 1) }, dropped: [] };
}

// ---------- זמן, שבת וחג ----------
export function israelParts(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short' })
    .formatToParts(d).map(x => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, hour: +p.hour % 24, min: +p.minute, wd: p.weekday };
}
function isHoly(civil) { // civil = Date בצהרי היום בישראל
  if (civil.getDay() === 6) return true;
  return HebrewCalendar.getHolidaysOnDate(new HDate(civil), true)?.some(e => e.getFlags() & flags.CHAG) || false;
}
// האם עכשיו שבת או חג (מהדלקת נרות – 40 דק' לפני השקיעה בירושלים – עד צאת הכוכבים + מרווח)
export function holyNow(now = new Date()) {
  const p = israelParts(now);
  const today = new Date(p.y, p.m - 1, p.d, 12);
  const tomorrow = new Date(p.y, p.m - 1, p.d + 1, 12);
  const z = new Zmanim(JLM, today, false);
  const candle = new Date(z.sunset().getTime() - 40 * 60000);
  const havdala = new Date(z.tzeit(8.5).getTime() + 10 * 60000);
  if (isHoly(today) && now < havdala) return true;
  if (isHoly(tomorrow) && now >= candle) return true;
  return false;
}
function editionName(hour, afterHoly) {
  if (afterHoly) return 'מה היה בשבת ובחג';
  return hour < 11 ? 'בוקר' : hour < 17 ? 'צהריים' : 'ערב';
}

// ---------- ריצה ----------
async function store(env) { return env.STORE.get(env.STORE.idFromName('news')); }
async function call(env, path, body) {
  const s = await store(env);
  const r = await s.fetch('https://store' + path, body ? { method: 'POST', body: JSON.stringify(body) } : undefined);
  return r.json();
}

export async function runEdition(env, { force = false, now = new Date(), push = !force } = {}) {
  const p = israelParts(now);
  if (!force) {
    if (holyNow(now)) return { skipped: 'שבת או חג' };
    const isRun = RUN_HOURS.includes(p.hour);
    const isLate = LATE_HOURS.includes(p.hour);
    if (!isRun && !isLate) return { skipped: 'לא שעת ריצה' };
    const last = await call(env, '/latest');
    const lastAge = last?.at ? now - Date.parse(last.at) : Infinity;
    if (lastAge < 90 * 60000) return { skipped: 'כבר יצא סיכום בשעה האחרונה' };
    if (isLate && lastAge < 10 * 3600000) return { skipped: 'אין צורך בריצה מאוחרת' };
  }
  const last = await call(env, '/latest');
  const afterHoly = !!(last?.at && now - Date.parse(last.at) > 20 * 3600000);
  const since = afterHoly ? now - 30 * 3600000 : Math.max(now - 9 * 3600000, Math.min(now - 6 * 3600000, last?.at ? Date.parse(last.at) - 3600000 : 0)); // לפחות 6 שעות אחורה
  const { items, failed } = await fetchAll(since);
  let ed;
  if (env.GEMINI_KEY && items.length) {
    try { ed = await summarize(env, items); } catch (e) { ed = titlesOnly(items); ed.error = String(e.message || e).slice(0, 300); }
    if (ed.mode === 'summary' && ed.sections.main.length < 2) { const t = titlesOnly(items); t.error = 'מעט מדי נקודות עברו בדיקה' + (ed.checkError ? ' – ' + ed.checkError : ''); t.dropped = ed.dropped; ed = t; }
  } else ed = titlesOnly(items);
  const hd = new HDate(new Date(p.y, p.m - 1, p.d, 12));
  ed.at = now.toISOString();
  ed.name = editionName(p.hour, afterHoly);
  ed.date = { he: hd.renderGematriya(true), day: ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'][new Date(p.y, p.m - 1, p.d).getDay()] };
  ed.time = `${String(p.hour).padStart(2, '0')}:${String(p.min).padStart(2, '0')}`;
  ed.count = items.length;
  ed.failed = failed;
  ed.v = VERSION;
  await call(env, '/save', ed);
  if (push) await call(env, '/push-start', {});
  const cfg = await call(env, '/config');
  if (push && env.FB_PAGE_TOKEN && env.FB_PAGE_ID) ed.fb = await postFacebook(env, ed, cfg.links || {}).catch(e => ({ error: String(e).slice(0, 200) }));
  if (push && env.WHAPI_TOKEN && cfg.waid) ed.wa = await postWhatsapp(env, ed, cfg.waid).catch(e => ({ error: String(e).slice(0, 200) }));
  return { ok: true, fb: ed.fb, wa: ed.wa, name: ed.name, mode: ed.mode, main: ed.sections.main.length, dropped: ed.dropped.length, failed, error: ed.error };
}

// ---------- השרת ----------
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type' };
const json = (o, status = 200, extra = {}) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...CORS, ...extra } });

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');
    const admin = env.ADMIN_KEY && key === env.ADMIN_KEY;
    if (request.method === 'OPTIONS') return new Response('', { headers: CORS });
    if (url.pathname === '/ping') return json({ ok: true, v: VERSION, gemini: !!env.GEMINI_KEY });
    if (url.pathname === '/latest') {
      const ed = await call(env, '/latest');
      const from = url.searchParams.get('from');
      ctx.waitUntil(call(env, '/hit', { e: FROM.includes(from) ? from : 'web' }).catch(() => {}));
      if (!ed?.at) return json({ empty: true });
      const { dropped, error, fixed, checkError, ...pub } = ed;
      const links = (await call(env, '/config')).links || {};
      return json({ ...(admin ? ed : pub), links }, 200, { 'cache-control': 'public, max-age=120' });
    }
    if (url.pathname === '/history') return json(await call(env, '/history'), 200, { 'cache-control': 'public, max-age=300' });
    if (url.pathname === '/report' && request.method === 'POST') {
      let b = {}; try { b = await request.json(); } catch (e) {}
      const text = String(b.text || '').slice(0, 300), note = String(b.note || '').slice(0, 500);
      if (!text && !note) return json({ ok: false }, 400);
      await call(env, '/report', { text, note, at: new Date().toISOString() });
      return json({ ok: true });
    }
    if (url.pathname === '/reports') return admin ? json(await call(env, '/reports')) : json({ ok: false }, 403);
    if (url.pathname === '/stats') return json(await call(env, '/stats'));
    // קישורים שמופיעים בדף ובפוסטים (ערוץ הווטסאפ) – נקבעים פעם אחת, בלי להעלות את השרת מחדש
    // /config?key=..&wa=https://whatsapp.com/channel/...   (wa= ריק מוחק)
    if (url.pathname === '/config') {
      if (!admin) return json({ ok: false }, 403);
      const wa = url.searchParams.get('wa');
      const waid = url.searchParams.get('waid');
      if (waid !== null) {
        if (waid && !/^\d{10,25}@newsletter$/.test(waid)) return json({ ok: false, error: 'מזהה ערוץ לא תקין' }, 400);
        return json(await call(env, '/config-set', { waid }));
      }
      if (wa === null) return json(await call(env, '/config'));
      if (wa && !/^https:\/\/(www\.)?whatsapp\.com\/channel\/[A-Za-z0-9]+$/.test(wa)) return json({ ok: false, error: 'קישור ערוץ לא תקין' }, 400);
      return json(await call(env, '/config-set', { wa }));
    }
    if (url.pathname === '/run') {
      if (!admin) return json({ ok: false }, 403);
      const force = url.searchParams.get('force') === '1';
      return json(await runEdition(env, { force, push: !force || url.searchParams.get('push') === '1' }));
    }
    if (url.pathname === '/push-test') { // שולח התראה רק למנוי אחד (endpoint) – לבדיקה
      if (!admin) return json({ ok: false }, 403);
      return json(await call(env, '/push-one', { endpoint: url.searchParams.get('endpoint') }));
    }
    if ((url.pathname === '/subscribe' || url.pathname === '/unsubscribe') && request.method === 'POST') {
      let b = {}; try { b = await request.json(); } catch (e) {}
      const ep = String(b.endpoint || '');
      if (!/^https:\/\/[a-z0-9.-]+\//i.test(ep) || ep.length > 1000) return json({ ok: false }, 400);
      return json(await call(env, url.pathname, { endpoint: ep }));
    }
    return json({ name: 'החדשות ב-3 דקות', page: 'https://hakelim.com/kelim/machshev/chadashot/' });
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runEdition(env).then(r => console.log(JSON.stringify(r))).catch(e => console.log('run error', String(e))));
  }
};

// אחסון: הסיכום האחרון, 21 הקודמים, דיווחי טעויות ומונה כניסות יומי
// ---------- פייסבוק: פוסט לדף "החדשות ב-3 דקות" (Graph API, מפתח קבוע של הדף) ----------
const PAGE_URL = 'https://hakelim.com/kelim/machshev/chadashot/';
// מאיפה הגיעו (נספר ב-/stats): דף, טלפון, התראה, פייסבוק, ווטסאפ, מודעה (QR), שיתוף, דף הבית
export const FROM = ['web', 'phone', 'push', 'fb', 'wa', 'qr', 'share', 'home'];
// ערוץ הווטסאפ: דרך Whapi.Cloud (מסלול חינמי), שמחובר למספר של גילעד כ"מכשיר מקושר". אין API רשמי לערוצים.
// WHAPI_TOKEN = סוד בשרת (tools/news-worker/wa-setup.ps1), מזהה הערוץ ב-/config?waid=
async function postWhatsapp(env, ed, waid) {
  const r = await fetch('https://gate.whapi.cloud/messages/text', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + env.WHAPI_TOKEN, 'content-type': 'application/json' },
    body: JSON.stringify({ to: waid, body: editionText(ed, {}, 'wa') })
  });
  const j = await r.json().catch(() => ({}));
  return r.ok ? { id: j.message?.id || true } : { error: (j.error && (j.error.message || j.error)) || String(r.status) };
}
export function editionText(ed, links = {}, src = 'fb') {
  const out = [`📰 החדשות ב-3 דקות – ${ed.name}, יום ${ed.date.day} ${ed.date.he}`, ''];
  const names = { haredi: 'ציבור חרדי', economy: 'כלכלה וכיס' };
  ed.sections.main.forEach((p, i) => out.push(`${i + 1}. ${p.text}`));
  for (const k of ['haredi', 'economy']) if (ed.sections[k]?.length) { out.push('', `▪️ ${names[k]}`); ed.sections[k].forEach(p => out.push(`• ${p.text}`)); }
  out.push('', 'כל נקודה עם קישור למקור, והתראה 3 פעמים ביום:', PAGE_URL + '?utm_source=' + src);
  if (links.wa) out.push('', '📲 בערוץ הווטסאפ, 3 פעמים ביום:', links.wa);
  out.push('בטלפון כשר: 077-2253345 שלוחה 8');
  return out.join('\n');
}
async function postFacebook(env, ed, links) {
  const v = env.FB_API_VERSION || 'v23.0';
  const r = await fetch(`https://graph.facebook.com/${v}/${env.FB_PAGE_ID}/feed`, {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ message: editionText(ed, links), link: PAGE_URL + '?utm_source=fb', access_token: env.FB_PAGE_TOKEN })
  });
  const j = await r.json().catch(() => ({}));
  return r.ok ? { id: j.id } : { error: (j.error && j.error.message) || String(r.status) };
}

// ---------- Web Push (VAPID, בלי תוכן) ----------
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64uStr = str => b64u(new TextEncoder().encode(str));
async function vapidAuth(env, endpoint) {
  const jwk = JSON.parse(env.VAPID_JWK);
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const head = b64uStr(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const body = b64uStr(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: 'https://hakelim.com/kelim/' }));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(head + '.' + body));
  return `vapid t=${head}.${body}.${b64u(sig)}, k=${env.VAPID_PUBLIC}`;
}
export async function sendPush(env, endpoint) {
  const r = await fetch(endpoint, { method: 'POST', headers: { authorization: await vapidAuth(env, endpoint), ttl: '21600', urgency: 'normal', 'content-length': '0' } });
  return r.status;
}
async function subKey(endpoint) { return 'sub:' + b64u(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint))).slice(0, 32); }

export class Store {
  constructor(state, env) { this.s = state.storage; this.env = env; }
  // שליחה בקבוצות של 40 (מגבלת בקשות לכל ריצה); כל קבוצה בריצת alarm נפרדת
  async alarm() {
    const job = await this.s.get('push-job');
    if (!job || !this.env.VAPID_JWK) return;
    const page = await this.s.list({ prefix: 'sub:', startAfter: job.after || undefined, limit: 40 });
    let last = null;
    for (const [k, sub] of page) {
      last = k;
      try {
        const st = await sendPush(this.env, sub.endpoint);
        if (st === 404 || st === 410) { await this.s.delete(k); job.gone++; } else if (st < 300) job.sent++; else job.fail++;
      } catch (e) { job.fail++; }
    }
    if (page.size === 40) { job.after = last; await this.s.put('push-job', job); await this.s.setAlarm(Date.now() + 1000); }
    else { job.done = new Date().toISOString(); delete job.after; await this.s.put('push-last', job); await this.s.delete('push-job'); }
  }
  async fetch(request) {
    const path = new URL(request.url).pathname;
    const body = request.method === 'POST' ? await request.json() : null;
    if (path === '/latest') return Response.json((await this.s.get('latest')) || {});
    if (path === '/history') return Response.json((await this.s.get('history')) || []);
    if (path === '/save') {
      const h = (await this.s.get('history')) || [];
      h.unshift(body); await this.s.put('history', h.slice(0, 21)); await this.s.put('latest', body);
      return Response.json({ ok: true });
    }
    if (path === '/report') {
      const r = (await this.s.get('reports')) || [];
      r.unshift(body); await this.s.put('reports', r.slice(0, 200));
      return Response.json({ ok: true });
    }
    if (path === '/reports') return Response.json((await this.s.get('reports')) || []);
    if (path === '/config') return Response.json((await this.s.get('config')) || { links: {} });
    if (path === '/config-set') {
      const c = (await this.s.get('config')) || { links: {} };
      if ('wa' in body) { if (body.wa) c.links.wa = body.wa; else delete c.links.wa; }
      if ('waid' in body) { if (body.waid) c.waid = body.waid; else delete c.waid; } // מזהה הערוץ לפרסום (לא מוצג לציבור)
      await this.s.put('config', c);
      return Response.json({ ok: true, ...c });
    }
    if (path === '/hit') {
      const day = new Date().toISOString().slice(0, 10), st = (await this.s.get('stats')) || {};
      const k = `${day} ${String(body.e || 'web').slice(0, 12)}`;
      st[k] = (st[k] || 0) + 1;
      const keys = Object.keys(st).sort(); while (keys.length > 300) delete st[keys.shift()];
      await this.s.put('stats', st);
      return Response.json({ ok: true });
    }
    if (path === '/stats') {
      const subs = (await this.s.list({ prefix: 'sub:' })).size;
      return Response.json({ subscribers: subs, lastPush: (await this.s.get('push-last')) || null, days: (await this.s.get('stats')) || {} });
    }
    if (path === '/subscribe') { await this.s.put(await subKey(body.endpoint), { endpoint: body.endpoint, at: new Date().toISOString() }); return Response.json({ ok: true }); }
    if (path === '/unsubscribe') { await this.s.delete(await subKey(body.endpoint)); return Response.json({ ok: true }); }
    if (path === '/push-start') { await this.s.put('push-job', { sent: 0, gone: 0, fail: 0, start: new Date().toISOString() }); await this.s.setAlarm(Date.now() + 500); return Response.json({ ok: true }); }
    if (path === '/push-one') {
      if (!body.endpoint) return Response.json({ ok: false });
      try { return Response.json({ status: await sendPush(this.env, body.endpoint) }); } catch (e) { return Response.json({ error: String(e) }); }
    }
    return Response.json({}, { status: 404 });
  }
}
