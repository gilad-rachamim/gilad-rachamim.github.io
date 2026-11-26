// יוצר את דפי "זמן הנחת תפילין <עיר>": src/pages/kodesh/tefillin/<עיר>/index.html, לכל עיר ב-CITIES של assets/kodesh-shabat.js.
// דף עיר מכיל רק את מה ששייך לעיר: כרטיס כלי מקוצר, זמני היום, טבלה לשנה שלמה ושאלות על העיר.
// הסדר המלא, האפליקציה, מסך התפילין וכללי הנקודות נמצאים רק בדף הראשי (דפים כמעט זהים לא נכנסים לגוגל).
// המנוע assets/kodesh-tefillin.js נפתח עם העיר של הדף (data-place / data-name על #tf).
// הטבלה שבתוך הדף (לגוגל ולמי שאין לו JavaScript) מחושבת כאן ליום ההרצה; בדפדפן המנוע מחשב מחדש בכל כניסה.
// העובדות המקומיות (המקום והגובה): tools/shabat_local.js.
// הרצה (פעם בכמה חודשים):  node tools/tefillin_city_pages.js   ואז  python build.py
'use strict';
process.env.TZ = 'Asia/Jerusalem';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const H = vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'assets/vendor/hebcal-bundle/hebcal-core-6.14.7.min.js'), 'utf8') + ';hebcal');
const S = require(path.join(ROOT, 'assets/kodesh-shabat.js'));
const LOCAL = require('./shabat_local.js');
const CITIES = S.CITIES, HOME = '/kodesh/tefillin/', ZM = '/kodesh/zmanim/', SHABAT = S.HOME;
const OUT = path.join(ROOT, 'src/pages/kodesh/tefillin');
const NOW = new Date(); NOW.setHours(12, 0, 0, 0);

// ---- הכלי והעיצוב מהדף הראשי
const MAIN = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8').split(String.fromCharCode(13)).join('');
const MAIN_META = JSON.parse(MAIN.match(/<!--meta\s*(\{[\s\S]*?\})\s*-->/)[1]);
const HEAD = MAIN_META.head.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '');
const FOOT = MAIN_META.foot;
const TABLE_CSS = '<style>.tf-tbl-wrap{overflow-x:auto}.tf-tbl{width:100%;border-collapse:collapse;font-size:.88rem;text-align:center}.tf-tbl th,.tf-tbl td{padding:.35rem .2rem;border-bottom:1px solid rgba(212,176,98,.25)}.tf-tbl th{color:var(--gold)}.tf-tbl caption{caption-side:bottom;padding-top:.5rem;font-size:.85rem}</style>';
function tool(c) {
  return `<div class="tool tf-card" id="tf" data-place="${c[3]},${c[4]}" data-name="${c[1]}">
  <div class="tf-status" id="tf-status" aria-live="polite"><b>בודק את השקיעה ${c[2]}…</b></div>
  <div class="tf-times" id="tf-times"></div>
  <button type="button" class="tf-done" id="tf-done">הנחתי תפילין ✓</button>
  <button type="button" class="tf-ptur" id="tf-ptur">היום הייתי פטור</button>
  <p class="tf-toast" id="tf-toast" aria-live="polite" hidden></p>
  <div class="tf-week" id="tf-week" aria-label="השבוע האחרון. לחיצה על יום שעבר: הנחתי / הייתי פטור"></div>
  <p class="tf-streak" id="tf-streak"></p>
  <div class="tf-game" id="tf-game">
    <div class="tf-lvl"><span class="tf-pts" id="tf-pts">0</span><span>נקודות</span><b id="tf-lvl">צעד ראשון</b></div>
    <div class="tf-bar" aria-hidden="true"><i id="tf-bar"></i></div>
    <p class="tf-next" id="tf-next"></p>
    <p class="tf-cheer" id="tf-cheer"></p>
  </div>
  <div class="tf-place">
    <label for="tf-city">המקום:</label>
    <select id="tf-city"></select>
    <button type="button" class="btn btn-sm btn-line" id="tf-gps">📍 המיקום שלי</button>
  </div>
  <p class="tf-msg" id="tf-gps-msg"></p>
  <div class="tf-row"><label for="tf-before">תזכורת לפני השקיעה ${c[2]}</label>
    <select id="tf-before"><option value="15">15 דקות</option><option value="30">30 דקות</option><option value="45">45 דקות</option><option value="60">שעה</option><option value="90">שעה וחצי</option></select></div>
  <div class="tf-btns">
    <button type="button" class="btn btn-gold" id="tf-ics">📅 יומן לחצי שנה לפי ${c[1]}</button>
    <button type="button" class="btn btn-line" id="tf-notif">🔔 להפעיל התראות בטלפון</button>
  </div>
  <p class="tf-msg" id="tf-ics-msg"></p>
</div>`;
}

// ---- חישובים (אותו חישוב כמו במנוע: משיכיר של hebcal, ו-66 דקות זמניות לפני הנץ לדעת פוסקים מסוימים בדורנו)
const fmt = new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jerusalem' });
const t = d => fmt.format(d);
const hdm = d => d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear();
const gl = c => new H.GeoLocation(c[1], c[3], c[4], 0, 'Asia/Jerusalem');
const Z = (c, d) => new H.Zmanim(gl(c), d, false);
const tod = d => d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
function day(c, d) {
  const z = Z(c, d), sr = z.sunrise(), ss = z.sunset(), sz = (ss - sr) / 720;
  return { d, sr, ss, msh: z.misheyakir(), msh66: new Date(sr.getTime() - 66 * sz), tz: z.tzeit(8.5), mz: sz / 60000 };
}
function year(c) {
  const out = [];
  for (let i = 0; i < 365; i++) { const d = new Date(NOW); d.setDate(d.getDate() + i); out.push(day(c, d)); }
  const by = (k, f) => out.reduce((a, b) => f(tod(b[k]), tod(a[k])) ? b : a);
  return { mshE: by('msh', (x, y) => x < y), mshL: by('msh', (x, y) => x > y), m66E: by('msh66', (x, y) => x < y), m66L: by('msh66', (x, y) => x > y),
    setE: by('ss', (x, y) => x < y), setL: by('ss', (x, y) => x > y) };
}
const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const gap = (a, b) => Math.round((a - b) / 60000);

function faqLd(qa) {
  return '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: qa.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a.replace(/<[^>]+>/g, '') } })) }) + '</script>';
}
function faqHtml(qa) {
  return '<section class="k-sec seo-faq" aria-labelledby="seo-faq-h">\n  <h2 id="seo-faq-h">שאלות ותשובות</h2>\n' +
    qa.map(([q, a]) => `  <details><summary>${q}</summary><p>${a}</p></details>`).join('\n') + '\n</section>';
}
function chips(cur) {
  return '<nav class="sb-chips" aria-label="זמן הנחת תפילין בערים נוספות">' + CITIES.map(c => `<a href="${HOME}${c[0]}/"${c[0] === cur ? ' aria-current="page"' : ''}>${c[1]}</a>`).join('') + '</nav>';
}
function write(dir, meta, body) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), '<!--meta ' + JSON.stringify(meta, null, 2) + ' -->\n' + body, 'utf8');
}
function dist(a, b) { const r = Math.PI / 180, x = (b[4] - a[4]) * r * Math.cos((a[3] + b[3]) / 2 * r), y = (b[3] - a[3]) * r; return Math.sqrt(x * x + y * y) * 6371; }

const mins = n => n === 1 ? 'דקה' : n === 2 ? 'שתי דקות' : n + ' דקות';
const hours = ms => { const m = Math.round(ms / 60000), h = Math.floor(m / 60), r = m % 60; return h + ' שעות' + (r ? ' ו-' + mins(r) : ''); };
const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
// שנה קדימה: ה-1 וה-15 בכל חודש
function table(c) {
  const rows = [];
  for (let m = 0; m < 12; m++) for (const dd of [1, 15]) {
    const d = new Date(NOW.getFullYear(), NOW.getMonth() + 1 + m, dd, 12), x = day(c, d);
    rows.push(`<tr><th scope="row">${dd} ב${MONTHS[d.getMonth()]}</th><td>${t(x.msh66)}</td><td>${t(x.msh)}</td><td>${t(x.sr)}</td><td>${t(x.ss)}</td><td>${t(x.tz)}</td></tr>`);
  }
  const a = new Date(NOW.getFullYear(), NOW.getMonth() + 1, 1), b = new Date(NOW.getFullYear(), NOW.getMonth() + 12, 15);
  return `<div class="tf-tbl-wrap" tabindex="0" role="region" aria-label="טבלת זמני תפילין ${c[1]}"><table class="tf-tbl">
  <caption>זמני תפילין ${c[2]}, מ${MONTHS[a.getMonth()]} ${a.getFullYear()} עד ${MONTHS[b.getMonth()]} ${b.getFullYear()}, בשעון ישראל (כולל שעון קיץ).</caption>
  <thead><tr><th scope="col">תאריך</th><th scope="col">מוקדם*</th><th scope="col">משיכיר</th><th scope="col">נץ</th><th scope="col">שקיעה</th><th scope="col">כוכבים</th></tr></thead>
  <tbody>
${rows.join('\n')}
  </tbody></table></div>`;
}
// היום הקצר והארוך: כמה זמן יש בין המשיכיר לשקיעה
function span(c) {
  let lo = null, hi = null, rl = null, rh = null;
  for (let i = 0; i < 365; i++) {
    const d = new Date(NOW); d.setDate(d.getDate() + i);
    const x = day(c, d), len = x.ss - x.msh;
    if (!lo || len < lo.len) lo = { len, x };
    if (!hi || len > hi.len) hi = { len, x };
    const m = x.sr.getHours() * 60 + x.sr.getMinutes();
    if (!rl || m < rl.m) rl = { m, x };
    if (!rh || m > rh.m) rh = { m, x };
  }
  return { lo, hi, rl, rh };
}

const JER = CITIES[0];
CITIES.forEach(function (c) {
  const loc = c[2], L = LOCAL[c[0]];
  if (!L) throw new Error('חסרות עובדות מקומיות לעיר ' + c[0] + ' ב-tools/shabat_local.js');
  const X = day(c, NOW), Y = year(c), S2 = span(c), date = hdm(NOW);
  const msh = t(X.msh), m66 = t(X.msh66), rise = t(X.sr), set = t(X.ss);
  const near = CITIES.filter(o => o[0] !== c[0]).map(o => [o, dist(c, o)]).sort((a, b) => a[1] - b[1]).slice(0, 4);
  const nearHtml = near.map(x => { const n = day(x[0], NOW); return `<li><a href="${HOME}${x[0][0]}/">זמן תפילין ${x[0][1]}</a>: כ-${Math.max(1, Math.round(x[1]))} ק״מ מ${c[1]}, משיכיר <bdi>${t(n.msh)}</bdi> ושקיעה <bdi>${t(n.ss)}</bdi></li>`; }).join('\n    ');
  const ref = c[0] === JER[0] ? CITIES[1] : JER;
  // ההפרש מעיר הייחוס, בקיץ ובחורף
  const cmp = d => {
    const a = day(c, d), b = day(ref, d);
    const w = (x, y) => Math.abs(gap(x, y)) < 1 ? 'כמעט באותה דקה כמו ' + ref[2] : mins(Math.abs(gap(x, y))) + (x < y ? ' לפני ' : ' אחרי ') + ref[1];
    return `המשיכיר ${c[2]} חל ${w(a.msh, b.msh)}, והשקיעה ${c[2]} ${w(a.ss, b.ss)}`;
  };
  const Y0 = NOW.getFullYear() + 1, june = cmp(new Date(Y0, 5, 21, 12)), dec = cmp(new Date(NOW.getFullYear(), 11, 21, 12));
  const geo = L.geo.replace(/\s*[^.]*צאת השבת[^.]*\./g, '').trim();
  const L1 = `${hours(S2.lo.len)} (${hdm(S2.lo.x.d)}, מ-${t(S2.lo.x.msh)} עד ${t(S2.lo.x.ss)})`;
  const L2 = `${hours(S2.hi.len)} (${hdm(S2.hi.x.d)}, מ-${t(S2.hi.x.msh)} עד ${t(S2.hi.x.ss)})`;

  const qa = [
    [`מאיזו שעה מניחים תפילין ${loc} היום?`, `ב-${date} אפשר ${loc} מהמשיכיר ב-${msh}, ולדעת פוסקים מסוימים בדורנו מ-${m66}. ליום אחר ${loc} יש לוח בדף.`],
    [`עד מתי מניחים תפילין ${loc}?`, `עד השקיעה ${loc}: ב-${date} בשעה ${set}, ובמשך השנה בין ${t(Y.setE.ss)} ל-${t(Y.setL.ss)}.`],
    [`מתי המשיכיר ${loc} הכי מוקדם ומתי הכי מאוחר?`, `הכי מוקדם ${loc} ב-${hdm(Y.mshE.d)}, בשעה ${t(Y.mshE.msh)}. הכי מאוחר ב-${hdm(Y.mshL.d)}, בשעה ${t(Y.mshL.msh)}.`],
    [`כמה זמן יש ${loc} להניח תפילין ביום חורף קצר?`, `בין המשיכיר לשקיעה ${loc} יש ביום הקצר בשנה ${L1}, וביום הארוך ${L2}.`],
    [`במה זמני התפילין ${loc} שונים מ${ref[1]}?`, `בסוף יוני ${june}. בסוף דצמבר ${dec}.`],
    [`איך מקבלים תזכורת תפילין לפי ${c[1]}?`, `לוחצים בכלי על "יומן לחצי שנה לפי ${c[1]}" ופותחים את הקובץ בטלפון. כל תזכורת מחושבת לפי השקיעה ${loc} באותו יום, בחינם ובלי הרשמה.`]
  ];
  const meta = {
    site: 'kodesh', nav: 'rabanim', tool: 'tefillin_ir',
    title: `זמן הנחת תפילין ${c[1]} – משיכיר ושקיעה היום | כלי קודש`,
    description: `זמן הנחת תפילין ${c[1]}: משיכיר ושקיעה להיום, טבלה לשנה שלמה, ספירה לאחור ותזכורת ביומן לפי השקיעה ${loc}. בחינם, בלי הרשמה.`,
    og_title: `זמן הנחת תפילין ${c[1]}`,
    priority: '0.6',
    crumbs: [['סדר הנחת תפילין', HOME], [c[1], null]],
    head: HEAD + TABLE_CSS + faqLd(qa), foot: FOOT
  };
  const body = `<header class="k-hero">
  <h1>זמן הנחת תפילין ${c[1]}: מאיזו שעה ועד מתי</h1>
  <p class="sub">משיכיר ושקיעה ${loc} להיום, כמה זמן נשאר, תזכורת ולוח לשנה שלמה. בחינם, בלי הרשמה ובלי פרסומות.</p>
</header>
${tool(c)}
<!--seo-txt-->
<section class="k-sec seo-txt" aria-labelledby="seo-h">
  <h2 id="seo-h">זמן תפילין ${c[1]} להיום, ${date}</h2>
  <p>${loc} מניחים היום מ-<bdi>${msh}</bdi> (משיכיר) עד <bdi>${set}</bdi> (שקיעה), והנץ ${loc} ב-<bdi>${rise}</bdi>. לדעת פוסקים מסוימים בדורנו (66 דקות זמניות לפני הנץ) הזמן ${loc} מתחיל ב-<bdi>${m66}</bdi>, ומי שרוצה לסמוך על כך ישאל את הרב שלו.</p>
  <h3>לוח זמני תפילין ${c[1]} לשנה</h3>
  ${table(c)}
  <p class="note">* מוקדם: לדעת פוסקים מסוימים בדורנו. הלוח של ${c[1]} מחושב בגובה פני הים.</p>
  <h3>איך משתנה הזמן ${loc} במשך השנה</h3>
  <p>המשיכיר ${loc} נע בין <bdi>${t(Y.mshE.msh)}</bdi> (${hdm(Y.mshE.d)}) לבין <bdi>${t(Y.mshL.msh)}</bdi> (${hdm(Y.mshL.d)}). השקיעה המוקדמת ביותר ${loc} היא ב-<bdi>${t(Y.setE.ss)}</bdi> (${hdm(Y.setE.d)}), והמאוחרת ביותר ב-<bdi>${t(Y.setL.ss)}</bdi> (${hdm(Y.setL.d)}). ביום הקצר יש ${loc} ${L1}, וביום הארוך ${L2}.</p>
  <p>גם הנץ ${loc} משתנה: המוקדם ביותר ב-<bdi>${t(S2.rl.x.sr)}</bdi> (${hdm(S2.rl.x.d)}) והמאוחר ביותר ב-<bdi>${t(S2.rh.x.sr)}</bdi> (${hdm(S2.rh.x.d)}). מי שמתפלל ותיקין ${loc} מניח תפילין לפני הנץ, מהמשיכיר ואילך, ומוצא את שתי השעות של כל תקופה בלוח של ${c[1]}.</p>
  <p>צאת הכוכבים ${loc} היום, ${date}, הוא ב-<bdi>${t(X.tz)}</bdi>. הזמנים ${loc} מתעדכנים בכלי שבראש הדף בכל יום מחדש, ואפשר לבחור בו מקום אחר או את המיקום שלכם.</p>
  <h3>${c[1]}: המקום והשקיעה</h3>
  <p>${geo}</p>
  <h3>${c[1]} מול ${ref[1]}</h3>
  <p>בקיץ, ב-21.6.${Y0}, ${june}. בחורף, ב-21.12.${NOW.getFullYear()}, ${dec}.</p>
  <h3>ערים קרובות ל${c[1]}</h3>
  <ul>
    ${nearHtml}
  </ul>
  <p><a href="${HOME}">סדר הנחת תפילין המלא</a> · <a href="${ZM}${c[0]}/">זמני היום ${loc}</a> · <a href="${SHABAT}${c[0]}/">כניסת שבת ${loc}</a></p>
</section>
${faqHtml(qa)}
<!--/seo-txt-->
<section class="k-sec" aria-labelledby="tf-other-h">
  <h2 id="tf-other-h">זמן הנחת תפילין בערים נוספות</h2>
  ${chips(c[0])}
</section>
`;
  write(path.join(OUT, c[0]), meta, body);
});
console.log('נכתבו', CITIES.length, 'דפים אל', path.relative(ROOT, OUT));
