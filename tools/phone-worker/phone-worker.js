// קו הכלים בטלפון – Cloudflare Worker שעונה ל"מודול API" של ימות המשיח.
// מתקשרים ממכשיר כשר, מקישים ספרות, והשרת מחזיר טקסט שהמערכת מקריאה בעברית (TTS, חינם).
// השרת לא שומר מצב: ימות שולחת בכל בקשה את כל מה שהוקש בשיחה, ומזה מחליטים מה לשאול.
// כל סבב בתפריט מקבל שמות משלו (m0, c0, k0... ואז m1, c1...) כדי שאפשר יהיה לחזור לתפריט שוב ושוב.
// מעקב כניסות: Durable Object אחד שסופר שיחות ושימוש בכל כלי ביום. לא נשמר שום מספר טלפון.
import { HDate, HebrewCalendar, Zmanim, GeoLocation, Locale, flags, DailyLearning } from '@hebcal/core';
import '@hebcal/learning'; // רושם את הדף היומי, משניות יומיות ונ"ך יומי

const TZ = 'Asia/Jerusalem';
const VERSION = 1;
const MAX_ROUNDS = 15;
const GILAD_PHONE = '0584049049';

// ערים: [שם, קו רוחב, קו אורך, דקות הדלקת נרות לפני השקיעה]
const CITIES = [
  null,
  ['ירושלים', 31.778, 35.235, 40],
  ['בני ברק', 32.084, 34.834, 20],
  ['בית שמש', 31.747, 34.988, 20],
  ['אלעד', 32.052, 34.951, 20],
  ['מודיעין עילית', 31.932, 35.043, 20],
  ['ביתר עילית', 31.697, 35.115, 20],
  ['צפת', 32.965, 35.496, 20],
  ['חיפה', 32.79, 34.99, 30],
  ['באר שבע', 31.25, 34.79, 20]
];
const CITY_MENU = CITIES.slice(1).map((c, i) => `ל${c[0]} הקישו ${i + 1}`).join(' ');

const MENU = 'לזמני היום הקישו 1. לתאריך העברי ולחגים הקרובים הקישו 2. למחשבון ברית בר מצווה ויארצייט הקישו 3. לזמני שבת הקישו 4. להשארת הודעה ובקשת עזרה הקישו 5. לדף היומי ולמשניות יומיות הקישו 6. לזמני חנוכה הקישו 7. לחדשות בשלוש דקות הקישו 8. לסיום הקישו 0';
const WELCOME = 'שלום וברוכים הבאים לקו הכלים של גילעד רחמים. כל הכלים בחינם ובלי אינטרנט. אפשר להקיש בכל רגע בלי לחכות לסוף ההודעה';
const SHARE = 'מכירים מישהו שזה יעזור לו? ספרו לו על הקו';
const LINE_NUMBER = '0772253345';
const SAVE = ['טיפ קטן. שמרו את המספר הזה באנשי הקשר בשם קו הכלים ושימו אותו על קיצור חיוג. המספר הוא', { raw: `d-${LINE_NUMBER}` }, SHARE];

const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

// ---------- עזרי טקסט לימות ----------
// התווים . - " ' & | = , שמורים בפרוטוקול של ימות. מנקים אותם מכל טקסט שמוקרא.
function clean(s) {
  return String(s).replace(/[״׳"']/g, '').replace(/[.\-&|=,:־–]/g, ' ').replace(/\s+/g, ' ').trim();
}
// הודעה = רשימת חלקים: מחרוזת רגילה היא טקסט להקראה, ואובייקט {raw} נשלח כמו שהוא (למשל dateH-09/11/2026).
function msgs(parts) {
  return parts.filter(Boolean).map(p => (typeof p === 'object' ? p.raw : 't-' + clean(p))).filter(x => x !== 't-').join('.');
}
function readDigits(parts, name, { max = 1, min = 1, allowed = '' } = {}) {
  return `read=${msgs(parts)}=${name},no,${max},${min},7,No,no,no,,${allowed},,,`;
}
function readRecord(parts, name, fileName) {
  // מקליטים לשלוחה 8 במערכת של גילעד (9 שם היא חדר ועידה); עד 2 דקות. שומעים באתר הניהול.
  return `read=${msgs(parts)}=${name},no,record,/8,${fileName},,yes,,1,120`;
}
function sayAndHangup(parts) {
  return `id_list_message=${msgs(parts)}&go_to_folder=hangup`;
}
function gDate(d) { return { raw: `date-${dmy(d)}` }; }
function hDate(d) { return { raw: `dateH-${dmy(d)}` }; }
function dmy(d) { return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; }

// מספרים במילים (נקבה, כמו בשעות ובדקות)
const ONES = ['', 'אחת', 'שתיים', 'שלוש', 'ארבע', 'חמש', 'שש', 'שבע', 'שמונה', 'תשע'];
const TEENS = ['עשר', 'אחת עשרה', 'שתים עשרה', 'שלוש עשרה', 'ארבע עשרה', 'חמש עשרה', 'שש עשרה', 'שבע עשרה', 'שמונה עשרה', 'תשע עשרה'];
const TENS = ['', '', 'עשרים', 'שלושים', 'ארבעים', 'חמישים'];
function words(n) {
  if (n < 10) return ONES[n];
  if (n < 20) return TEENS[n - 10];
  const t = TENS[Math.floor(n / 10)], o = n % 10;
  return o ? `${t} ו${ONES[o]}` : t;
}
function sayTime(date) {
  if (!date || isNaN(date)) return 'לא ידוע';
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const h = +p.find(x => x.type === 'hour').value, m = +p.find(x => x.type === 'minute').value;
  const h12 = h % 12 || 12;
  const part = h < 12 ? 'בבוקר' : h < 16 ? 'בצהריים' : h < 18 ? 'אחר הצהריים' : 'בערב';
  return m === 0 ? `${words(h12)} בדיוק ${part}` : `${words(h12)} ו${words(m)} דקות ${part}`;
}

// ---------- תאריכים ----------
// התאריך של היום בישראל, כ-Date בצהריים (השרת רץ ב-UTC).
function israelToday(now = new Date()) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const g = t => +p.find(x => x.type === t).value;
  return new Date(g('year'), g('month') - 1, g('day'), 12);
}
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function geo(city) { return new GeoLocation(city[0], city[1], city[2], 0, TZ); }
function parseDigitsDate(s) {
  if (!/^\d{8}$/.test(s || '')) return null;
  const d = +s.slice(0, 2), m = +s.slice(2, 4), y = +s.slice(4);
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, m - 1, d, 12);
  return dt.getMonth() === m - 1 ? dt : null;
}
function parshaOf(sat) {
  try {
    const sd = HebrewCalendar.getSedra(new HDate(sat).getFullYear(), true).lookup(new HDate(sat));
    if (sd.chag) return '';
    return 'פרשת ' + sd.parsha.map(p => Locale.gettext(p, 'he-x-NoNikud')).join(' ');
  } catch (e) { return ''; }
}

// ---------- הכלים ----------
function toolZmanim(city) {
  const today = israelToday();
  const z = new Zmanim(geo(city), today, false);
  return [
    `זמני היום ב${city[0]} ליום ${DAYS[today.getDay()]}`, hDate(today),
    `הנץ החמה ${sayTime(z.sunrise())}`,
    `סוף זמן קריאת שמע לפי המגן אברהם ${sayTime(z.sofZmanShmaMGA())}`,
    `ולפי הגאון מוילנא ${sayTime(z.sofZmanShma())}`,
    `סוף זמן תפילה לפי הגאון מוילנא ${sayTime(z.sofZmanTfilla())}`,
    `חצות היום ${sayTime(z.chatzot())}`,
    `מנחה גדולה ${sayTime(z.minchaGedola())}`,
    `שקיעת החמה ${sayTime(z.sunset())}`,
    `צאת הכוכבים ${sayTime(z.tzeit(8.5))}`
  ];
}

function toolToday() {
  const today = israelToday();
  const out = [`היום יום ${DAYS[today.getDay()]}`, hDate(today), 'ובתאריך הלועזי', gDate(today)];
  // אחרי השקיעה בירושלים התאריך העברי כבר התחלף
  const sunset = new Zmanim(geo(CITIES[1]), today, false).sunset();
  if (new Date() > sunset) out.push('ומהערב כבר', hDate(addDays(today, 1)));
  const sat = addDays(today, (6 - today.getDay() + 7) % 7);
  const parsha = parshaOf(sat);
  if (parsha) out.push(`${parsha} היא פרשת השבוע`);
  const skip = flags.MODERN_HOLIDAY | flags.DAF_YOMI | flags.YOM_KIPPUR_KATAN | flags.SHABBAT_MEVARCHIM;
  const seen = new Set(), next = [];
  for (const e of HebrewCalendar.calendar({ start: today, end: addDays(today, 45), il: true })) {
    if (e.getFlags() & skip) continue;
    let name = clean(e.render('he-x-NoNikud').split(':')[0]);
    if (name === 'חנוכה') name = 'נר ראשון של חנוכה';
    if (!name || /חג הבנות|ערב/.test(name) || seen.has(name)) continue;
    seen.add(name);
    const days = Math.round((e.getDate().greg() - today) / 86400000);
    next.push(days === 0 ? `${name} היום` : days === 1 ? `${name} מחר` : `${name} בעוד ${days} ימים ביום ${DAYS[e.getDate().greg().getDay()]}`);
    if (next.length === 3) break;
  }
  if (next.length) out.push('בקרוב', ...next);
  return out;
}

const CALC_KINDS = { 1: 'ברית', 2: 'בר מצווה', 3: 'בת מצווה', 4: 'יארצייט' };

function toolCalc(kind, date, afterSunset) {
  // יום עברי מתחיל בשקיעה: אחרי השקיעה זה כבר התאריך העברי של מחר
  const day = afterSunset ? addDays(date, 1) : date;
  const hd = new HDate(day);
  const today = israelToday();
  const out = [];
  if (kind === 1) {
    const brit = addDays(day, 7);
    out.push('התאריך העברי של הלידה', hDate(day),
      `הברית ביום השמיני ביום ${DAYS[brit.getDay()]}`, hDate(brit), gDate(brit));
    if (brit.getDay() === 6) out.push('הברית חלה בשבת. בלידה רגילה מלים בשבת. בלידה בניתוח קיסרי הברית נדחית ליום ראשון. מתייעצים עם המוהל');
    out.push('אם הלידה הייתה סמוך לשקיעה בין השמשות שואלים את המוהל. ברית נדחית לפי הנחיות המוהל עד שהתינוק מוכן לגמרי');
    out.push('לשאלות ולתיאום ברית גילעד רחמים מוהל מוסמך בטלפון', { raw: `d-${GILAD_PHONE}` });
  } else if (kind === 2 || kind === 3) {
    const years = kind === 2 ? 13 : 12;
    const bd = HebrewCalendar.getBirthdayOrAnniversary(hd.getFullYear() + years, hd);
    if (!bd) return ['לא הצלחתי לחשב את התאריך'];
    const g = bd.greg();
    out.push('התאריך העברי של הלידה', hDate(day),
      `ה${CALC_KINDS[kind]} ביום ${DAYS[g.getDay()]}`, hDate(g), gDate(g),
      'המצוות מתחילות מצאת הכוכבים של הערב שלפני');
  } else {
    let hy = new HDate(today).getFullYear();
    let y = HebrewCalendar.getYahrzeit(hy, hd);
    if (y && y.greg() < today) y = HebrewCalendar.getYahrzeit(hy + 1, hd);
    if (!y) return ['לא הצלחתי לחשב את היארצייט. אם הפטירה הייתה בשנה האחרונה היארצייט הראשון עוד לא הגיע'];
    const g = y.greg();
    out.push('תאריך הפטירה העברי', hDate(day), `היארצייט הקרוב ביום ${DAYS[g.getDay()]}`, hDate(g), gDate(g),
      'היארצייט מתחיל בערב שלפני');
    if (hd.getMonth() >= 12) out.push('בפטירה בחודש אדר יש מנהגים שונים לשנה מעוברת. שואלים רב');
  }
  return out;
}

function toolShabbat(city) {
  const today = israelToday();
  const dow = today.getDay();
  const fri = dow === 6 ? addDays(today, -1) : addDays(today, (5 - dow + 7) % 7);
  const sat = addDays(fri, 1);
  const gl = geo(city);
  const sunsetFri = new Zmanim(gl, fri, false).sunset();
  const candle = new Date(sunsetFri.getTime() - city[3] * 60000);
  const zSat = new Zmanim(gl, sat, false);
  const havdala = zSat.tzeit(8.5);
  const parsha = parshaOf(sat);
  return [
    `זמני שבת ב${city[0]}`, parsha,
    `הדלקת נרות ביום שישי ${sayTime(candle)}`, `${city[3]} דקות לפני השקיעה`,
    `שקיעת החמה ביום שישי ${sayTime(sunsetFri)}`,
    `שקיעת החמה בשבת ${sayTime(zSat.sunset())}`,
    `צאת השבת ${sayTime(havdala)}`
  ];
}

function he(name) { return clean(Locale.gettext(name, 'he-x-NoNikud') || name); }

function toolLearning() {
  const hd = new HDate(israelToday());
  const out = ['הלימוד היומי להיום'];
  try {
    const daf = DailyLearning.lookup('dafYomi', hd, true).daf;
    out.push(`הדף היומי מסכת ${he(daf.name)} דף ${daf.blatt}`);
  } catch (e) {}
  try {
    const m = DailyLearning.lookup('mishnaYomi', hd, true).mishnaYomi;
    const parts = m.map(x => { const [p, n] = x.v.split(':'); return { k: he(x.k), p, n }; });
    const a = parts[0], b = parts[parts.length - 1];
    out.push(a.k === b.k && a.p === b.p
      ? `משניות יומיות מסכת ${a.k} פרק ${a.p} משניות ${a.n} ו${b.n}`
      : `משניות יומיות מסכת ${a.k} פרק ${a.p} משנה ${a.n} עד מסכת ${b.k} פרק ${b.p} משנה ${b.n}`);
  } catch (e) {}
  try {
    const n = DailyLearning.lookup('nachYomi', hd, true);
    out.push(`נך יומי ${he(n.k)} פרק ${n.v}`);
  } catch (e) {}
  return out;
}

function toolChanukah(city) {
  const today = israelToday();
  const gl = geo(city);
  // הערב הראשון של חנוכה (כ"ד בכסלו) מהיום והלאה, או הערב של היום אם אנחנו באמצע החג
  const evs = HebrewCalendar.calendar({ start: addDays(today, -8), end: addDays(today, 370), il: true })
    .filter(e => /^Chanukah: \d Candle/.test(e.getDesc()));
  const tonight = evs.find(e => +e.getDate().greg() === +today);
  const first = evs.find(e => e.getDesc().startsWith('Chanukah: 1 Candle') && e.getDate().greg() >= today);
  const out = [`חנוכה ב${city[0]}`];
  const day = tonight ? today : first && first.getDate().greg();
  if (!day) return ['לא מצאתי את התאריך של חנוכה'];
  if (tonight) {
    const n = +tonight.getDesc().match(/\d/)[0];
    out.push(`הערב מדליקים ${n === 1 ? 'נר אחד' : `${words(n)} נרות`}`);
  } else {
    const days = Math.round((day - today) / 86400000);
    out.push(`הדלקת הנר הראשון בעוד ${days} ימים ביום ${DAYS[day.getDay()]} בערב`, hDate(addDays(day, 1)), gDate(day));
  }
  const z = new Zmanim(gl, day, false);
  out.push(`באותו ערב שקיעת החמה ${sayTime(z.sunset())}`, `וצאת הכוכבים ${sayTime(z.tzeit(8.5))}`,
    'מדליקים לפי המנהג שלכם בשקיעה או בצאת הכוכבים');
  if (day.getDay() === 5) out.push('ביום שישי מדליקים נרות חנוכה לפני נרות שבת');
  return out;
}

// ---------- החדשות ב-3 דקות (משרת kelim-news, tools/news-worker) ----------
// news = הסיכום האחרון (JSON) או null אם השרת לא ענה
export function toolNews(ed) {
  if (!ed || !ed.sections || !ed.sections.main?.length) return ['הסיכום לא זמין כרגע. נסו שוב מאוחר יותר'];
  const say = t => String(t).replace(/(\d)\.(\d)/g, '$1 נקודה $2').replace(/%/g, ' אחוז');
  const out = [`החדשות בשלוש דקות. סיכום ${ed.name} מיום ${ed.date?.day || ''}`, `שיצא בשעה ${ed.time || ''}`];
  ed.sections.main.forEach((p, i) => out.push(`${['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שביעי'][i] || ''}`, say(p.text)));
  if (ed.sections.haredi?.length) { out.push('ובציבור החרדי'); ed.sections.haredi.forEach(p => out.push(say(p.text))); }
  if (ed.sections.economy?.length) { out.push('ובכלכלה'); ed.sections.economy.forEach(p => out.push(say(p.text))); }
  out.push('הסיכום הבא יוצא בשבע בבוקר, באחת בצהריים ובשמונה בערב. בשבת ובחג אין סיכום');
  return out;
}

// ---------- המכונה: מה לשאול עכשיו ----------
function menuRead(round, intro) {
  if (round >= MAX_ROUNDS) return sayAndHangup([...(intro || []), 'תודה שהתקשרתם. להתראות']);
  return readDigits([...(intro || []), MENU], `m${round}`, { allowed: '0.1.2.3.4.5.6.7.8' });
}

// sponsor: משפט הקדשה/חסות אופציונלי (משתנה SPONSOR ב-Cloudflare), מוקרא אחרי הברכה
function decide(v, sponsor = '', news = null) {
  let r = -1;
  for (let i = 0; i < MAX_ROUNDS; i++) if (v[`m${i}`] !== undefined) r = i;
  if (r < 0) return { text: menuRead(0, [WELCOME, sponsor]), event: 'call' };
  const tool = v[`m${r}`], next = r + 1;
  // אחרי הכלי הראשון: לשמור את הקו באנשי הקשר ובקיצור חיוג, ולספר לחבר
  const after = res => menuRead(next, [...res, ...(r === 0 ? SAVE : []), 'לכלי נוסף']);
  const askCity = () => readDigits(['בחרו עיר', CITY_MENU], `c${r}`, { allowed: '1.2.3.4.5.6.7.8.9' });

  if (tool === '0') return { text: sayAndHangup(['תודה שהתקשרתם לקו הכלים של גילעד רחמים', SHARE, 'להתראות']) };
  if (tool === '1' || tool === '4' || tool === '7') {
    const c = CITIES[+v[`c${r}`]];
    if (!c) return { text: askCity() };
    if (tool === '7') return { text: after(toolChanukah(c)), event: 'chanukah' };
    return { text: after(tool === '1' ? toolZmanim(c) : toolShabbat(c)), event: tool === '1' ? 'zmanim' : 'shabbat' };
  }
  if (tool === '6') return { text: after(toolLearning()), event: 'learning' };
  if (tool === '8') return { text: after(toolNews(news)), event: 'news' };
  if (tool === '2') return { text: after(toolToday()), event: 'today' };
  if (tool === '3') {
    const k = +v[`k${r}`];
    if (!CALC_KINDS[k]) return { text: readDigits(['לחישוב ברית הקישו 1. לבר מצווה 2. לבת מצווה 3. ליארצייט 4'], `k${r}`, { allowed: '1.2.3.4' }) };
    if (v[`d${r}`] === undefined) {
      const what = k === 4 ? 'הפטירה' : 'הלידה';
      return { text: readDigits([`הקישו את תאריך ${what} הלועזי בשמונה ספרות. יום חודש ושנה. למשל 0 9 1 1 2 0 2 6`], `d${r}`, { max: 8, min: 8 }) };
    }
    const date = parseDigitsDate(v[`d${r}`]);
    if (!date) return { text: menuRead(next, ['התאריך שהוקש לא תקין. נסו שוב']) };
    const a = v[`a${r}`];
    if (a !== '1' && a !== '2') return { text: readDigits(['אם זה היה אחרי השקיעה הקישו 1. לפני השקיעה הקישו 2'], `a${r}`, { allowed: '1.2' }) };
    return { text: after(toolCalc(k, date, a === '1')), event: 'calc' };
  }
  if (tool === '5') {
    if (v[`r${r}`] === undefined) {
      return { text: readRecord(['אחרי הצפצוף אמרו את השם ומספר הטלפון ובמה אפשר לעזור. למשל פקס דחוף. בסיום הקישו סולמית'], `r${r}`, `${Date.now()}`) };
    }
    return { text: after(['ההודעה נשמרה. תודה. גילעד יחזור אליכם בהקדם']), event: 'message' };
  }
  return { text: menuRead(next) };
}

// ---------- השרת ----------
async function params(request) {
  const url = new URL(request.url);
  const v = Object.fromEntries(url.searchParams);
  if (request.method === 'POST') {
    const ct = request.headers.get('content-type') || '';
    if (ct.includes('form')) for (const [k, val] of (await request.formData()).entries()) v[k] = String(val);
  }
  return v;
}

function count(env, ctx, event) {
  if (!event || !env.STATS) return;
  const stub = env.STATS.get(env.STATS.idFromName('all'));
  ctx.waitUntil(stub.fetch('https://stats/hit?e=' + event).catch(() => {}));
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/ping') return Response.json({ ok: true, v: VERSION });
    if (url.pathname === '/stats') {
      if (!env.STATS) return Response.json({});
      return env.STATS.get(env.STATS.idFromName('all')).fetch('https://stats/get');
    }
    // מצב "קליטת קוד" (עד 20 דקות): כל שיחה שנכנסת מוקלטת לשלוחה 8 בלי תפריט.
    // בשביל שיחת האימות של ווטסאפ, שמקריאה קוד כשפותחים ווטסאפ ביזנס על מספר הקו.
    // מפעילים עם המפתח של שרת החדשות (נבדק מולו, בלי סוד נוסף): /capture?key=..&min=15   (min=0 מכבה)
    if (url.pathname === '/capture') {
      const ok = env.NEWS && (await env.NEWS.fetch('https://news/config?key=' + encodeURIComponent(url.searchParams.get('key') || ''))).status === 200;
      if (!ok) return Response.json({ ok: false }, { status: 403 });
      const min = Math.min(20, Math.max(0, +url.searchParams.get('min') || 0));
      return env.STATS.get(env.STATS.idFromName('all')).fetch('https://stats/capture-set?until=' + (Date.now() + min * 60000));
    }
    const v = await params(request);
    if (v.hangup === 'yes') return new Response('', { headers: { 'content-type': 'text/plain; charset=utf-8' } });
    if (env.STATS && v.m0 === undefined) {
      const until = +(await (await env.STATS.get(env.STATS.idFromName('all')).fetch('https://stats/capture-get')).text()) || 0;
      if (Date.now() < until) {
        const text = v.w0 === undefined
          // ווטסאפ מבקש "הקישו 8" לפני הקוד – dtmf8.wav (בשלוחה הראשית) משמיע 3 פעמים צליל של 8, ואז מקליטים
          ? `read=f-dtmf8=w0,no,record,/8,whatsapp-code-${Date.now()},,yes,,1,120`
          : sayAndHangup(['תודה']);
        return new Response(text, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
      }
    }
    let out;
    // אם נבחרה שלוחה 8 (חדשות) – מביאים קודם את הסיכום האחרון משרת החדשות (Service Binding)
    let news = null;
    let last;
    for (let i = 0; i < MAX_ROUNDS; i++) if (v[`m${i}`] !== undefined) last = v[`m${i}`];
    if (last === '8' && env.NEWS) {
      try { news = await (await env.NEWS.fetch('https://news/latest?from=phone')).json(); } catch (e) {}
    }
    try { out = decide(v, env.SPONSOR || '', news); } catch (e) { out = { text: sayAndHangup(['סליחה, הייתה תקלה. נסו שוב מאוחר יותר']) }; }
    count(env, ctx, out.event);
    return new Response(out.text, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }
};

// מונה: שורה לכל יום ולכל אירוע (call, zmanim, today, calc, shabbat, message)
export class Stats {
  constructor(state) {
    this.sql = state.storage.sql;
    this.sql.exec('CREATE TABLE IF NOT EXISTS hits (day TEXT, ev TEXT, n INTEGER, PRIMARY KEY (day, ev))');
  }
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/capture-set') {
      this.sql.exec('CREATE TABLE IF NOT EXISTS cfg (k TEXT PRIMARY KEY, v TEXT)');
      this.sql.exec('INSERT INTO cfg VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v', 'capture', url.searchParams.get('until') || '0');
      return Response.json({ ok: true, until: new Date(+url.searchParams.get('until')).toISOString() });
    }
    if (url.pathname === '/capture-get') {
      this.sql.exec('CREATE TABLE IF NOT EXISTS cfg (k TEXT PRIMARY KEY, v TEXT)');
      const r = this.sql.exec("SELECT v FROM cfg WHERE k = 'capture'").toArray()[0];
      return new Response(r ? r.v : '0');
    }
    if (url.pathname === '/hit') {
      const ev = (url.searchParams.get('e') || '').replace(/[^a-z]/g, '').slice(0, 12);
      const day = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
      this.sql.exec('INSERT INTO hits VALUES (?, ?, 1) ON CONFLICT(day, ev) DO UPDATE SET n = n + 1', day, ev);
      return new Response('ok');
    }
    const rows = this.sql.exec('SELECT day, ev, n FROM hits ORDER BY day DESC LIMIT 600').toArray();
    const days = {}, total = {};
    for (const r of rows) { (days[r.day] ||= {})[r.ev] = r.n; total[r.ev] = (total[r.ev] || 0) + r.n; }
    return Response.json({ total, days });
  }
}

export { decide as _decide };
