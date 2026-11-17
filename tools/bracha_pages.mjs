// מחולל הדפים של "ברכה לחג עם השם של כל אחד" (15.11.2026).
// דף ראשי: src/pages/kelim/kesharim/bracha-lechag/index.html
// דף לכל חג עם slug במאגר: src/pages/kelim/kesharim/bracha-lechag/<slug>/index.html
// הברכות נלקחות מ-assets/kesharim-bracha-data.js (אותו קובץ שהכלי טוען), והתאריכים מחושבים לפי היום שבו מריצים.
// להריץ שוב פעם בשנה (אחרי ראש השנה), כדי שהתאריכים בטקסט יתעדכנו:  node tools/bracha_pages.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets/kesharim-bracha-data.js'), 'utf8'), ctx);
const D = ctx.window.BRACHA_DATA;
const OCC = Object.fromEntries(D.occ.map(o => [o.id, o]));
const BASE = '/kelim/kesharim/bracha-lechag/';
const OUT = path.join(ROOT, 'src/pages/kelim/kesharim/bracha-lechag');

// ---------- תאריכים ----------
const HF = new Intl.DateTimeFormat('en-u-ca-hebrew', { day: 'numeric', month: 'long', timeZone: 'UTC' });
const HY = new Intl.DateTimeFormat('he-u-ca-hebrew', { year: 'numeric', timeZone: 'UTC' });
const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const MONTHS = ['בינואר', 'בפברואר', 'במרץ', 'באפריל', 'במאי', 'ביוני', 'ביולי', 'באוגוסט', 'בספטמבר', 'באוקטובר', 'בנובמבר', 'בדצמבר'];
const now = new Date(); const T0 = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
function nextDate(o) {
  for (let i = 0; i < 420; i++) {
    const d = new Date(T0.getTime() + i * 864e5), p = HF.formatToParts(d);
    const m = p.find(x => x.type === 'month').value, dd = +p.find(x => x.type === 'day').value;
    if (dd === o.d && o.m.includes(m)) return d;
  }
  return null;
}
function longD(d) { return 'יום ' + DAYS[d.getUTCDay()] + ', ' + d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); }
function eveOf(d) { return new Date(d.getTime() - 864e5); }
function gem(n) {
  const L = [[400, 'ת'], [300, 'ש'], [200, 'ר'], [100, 'ק'], [90, 'צ'], [80, 'פ'], [70, 'ע'], [60, 'ס'], [50, 'נ'], [40, 'מ'], [30, 'ל'], [20, 'כ'], [10, 'י'], [9, 'ט'], [8, 'ח'], [7, 'ז'], [6, 'ו'], [5, 'ה'], [4, 'ד'], [3, 'ג'], [2, 'ב'], [1, 'א']];
  let out = ''; n %= 1000;
  for (const [v, c] of L) while (n >= v) { if (n === 15) { out += 'טו'; n = 0; break; } if (n === 16) { out += 'טז'; n = 0; break; } out += c; n -= v; }
  return out.length > 1 ? out.slice(0, -1) + '״' + out.slice(-1) : out + '׳';
}
function hebYear(d) { const y = +HY.format(d).replace(/\D/g, ''); return y ? gem(y) : HY.format(d); }

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function show(t) { return esc(t.replace(/\{(לך|אותך|שלך|איתך)\}/g, '$1')).replace(/\{שם\}/g, '<b class="bl-nm">[השם]</b>').replace(/\n/g, '<br>'); }

// ---------- גוף הכלי (זהה בכל הדפים) ----------
function toolHtml(occ) {
  return `<div class="tool bl"${occ ? ` data-occ="${occ}"` : ''}>
  <ol class="bl-steps no-print" aria-label="חמישה שלבים">
    <li><a href="#bl-occ-h">1. החג</a></li>
    <li><a href="#bl-ppl-h">2. האנשים</a></li>
    <li><a href="#bl-msg-h">3. הברכה</a></li>
    <li><a href="#bl-send-h">4. שליחה</a></li>
    <li><a href="#bl-rem-h">5. תזכורת</a></li>
  </ol>

  <section class="bl-box" aria-labelledby="bl-occ-h">
    <h2 id="bl-occ-h">1. לאיזה חג?</h2>
    <div class="bl-occs" id="bl-occs" role="group" aria-label="בחירת חג"></div>
    <p class="bl-info" id="bl-occ-info" aria-live="polite"></p>
    <label class="bl-check" id="bl-sh-wrap"><input type="checkbox" id="bl-sh"> <span>להוסיף "ושבת שלום" לכל ברכה <small id="bl-sh-why"></small></span></label>
  </section>

  <section class="bl-box" aria-labelledby="bl-ppl-h">
    <h2 id="bl-ppl-h">2. האנשים הקרובים שלי</h2>
    <p class="bl-demo" id="bl-demo" hidden>👀 זו רשימת דוגמה, כדי לראות איך זה עובד. מוסיפים את האנשים שלכם, והדוגמה נמחקת. הרשימה נשמרת בטלפון, ובחג הבא היא כבר כאן.</p>
    <div class="bl-add">
      <div class="field"><label for="bl-addgrp">הקבוצה של מי שמוסיפים עכשיו</label><select id="bl-addgrp">${D.groups.map(g => `<option value="${g[0]}">${g[1]}</option>`).join('')}</select></div>
      <label class="bl-lbl" for="bl-paste">להדביק שמות ומספרים (מאקסל, מגוגל שיטס או מהטלפון)</label>
      <textarea id="bl-paste" rows="4" dir="auto" placeholder="סבתא רחל	050-1234567&#10;משה כהן	052-7654321	moshe@gmail.com&#10;משפחת לוי	054-1112233"></textarea>
      <p class="bl-hint">שורה לכל אדם: <b>שם, טלפון, מייל</b>. לא חייבים את כולם, והסדר לא משנה: מייל וטלפון מזוהים לבד. עמודה רביעית = איך פונים אליו (למשל "אמא").</p>
      <div class="bl-row">
        <button class="btn btn-gold btn-sm" type="button" id="bl-add-paste">להוסיף לרשימה</button>
        <button class="btn btn-line btn-sm" type="button" id="bl-pick" hidden>📱 לבחור מאנשי הקשר</button>
        <label class="btn btn-line btn-sm bl-file">📄 קובץ אנשי קשר (CSV / VCF)<input type="file" id="bl-file" accept=".csv,.vcf,.txt,text/csv,text/vcard,text/x-vcard,text/plain"></label>
        <button class="btn btn-line btn-sm" type="button" id="bl-one-open" aria-expanded="false">+ אדם אחד</button>
      </div>
      <form class="bl-one" id="bl-one" hidden novalidate>
        <div class="bl-2">
          <div class="field"><label for="bl-o-name">שם</label><input id="bl-o-name" type="text" maxlength="60" autocomplete="off" placeholder="רחל כהן"></div>
          <div class="field"><label for="bl-o-call">איך פונים (מה שייכתב בברכה)</label><input id="bl-o-call" type="text" maxlength="40" autocomplete="off" placeholder="אמא / סבתא רחל / משה"></div>
        </div>
        <div class="bl-2">
          <div class="field"><label for="bl-o-phone">טלפון</label><input id="bl-o-phone" type="tel" dir="ltr" maxlength="20" autocomplete="off"></div>
          <div class="field"><label for="bl-o-email">מייל</label><input id="bl-o-email" type="email" dir="ltr" maxlength="90" autocomplete="off"></div>
        </div>
        <div class="field"><label for="bl-o-grp">קבוצה</label><select id="bl-o-grp">${D.groups.map(g => `<option value="${g[0]}">${g[1]}</option>`).join('')}</select></div>
        <label class="bl-check"><input type="checkbox" id="bl-o-pl"> <span>משפחה או זוג: לפנות ברבים ("לכם", "אתכם")</span></label>
        <div class="bl-row" style="margin-top:.7rem"><button class="btn btn-gold btn-sm" type="submit" id="bl-o-save">להוסיף</button><button class="btn btn-line btn-sm" type="button" id="bl-o-cancel">ביטול</button></div>
        <p class="bl-msg" id="bl-one-msg" role="status" aria-live="polite"></p>
      </form>
      <p class="bl-msg" id="bl-add-msg" role="status" aria-live="polite"></p>
      <details class="bl-how"><summary>איך מוציאים קובץ אנשי קשר מהטלפון או מגוגל?</summary>
        <p><b>גוגל (אנדרואיד):</b> נכנסים ל-<a class="gold" href="https://contacts.google.com/" target="_blank" rel="noopener">contacts.google.com</a>, אפשר לסמן תווית (למשל "משפחה"), ובתפריט בוחרים <b>ייצוא</b> ← <b>Google CSV</b>. <b>אייפון:</b> באתר iCloud, אנשי קשר ← בוחרים ← <b>ייצוא vCard</b>. את הקובץ שירד מעלים כאן בכפתור "קובץ אנשי קשר". בכרום באנדרואיד יש גם כפתור "לבחור מאנשי הקשר" שבוחר ישר מהטלפון.</p>
      </details>
    </div>
    <div class="bl-listhead">
      <p id="bl-count">0 אנשים</p>
      <div class="bl-row">
        <input type="search" id="bl-find" placeholder="חיפוש ברשימה" aria-label="חיפוש ברשימה">
        <button class="btn btn-line btn-sm" type="button" id="bl-export">⬇ גיבוי CSV</button>
        <button class="btn btn-line btn-sm" type="button" id="bl-clear">🗑 לנקות</button>
      </div>
    </div>
    <ul class="bl-list" id="bl-list" aria-label="הרשימה שלי"></ul>
    <p class="bl-lbl" style="margin-top:.9rem">למי שולחים הפעם?</p>
    <div class="bl-sel" id="bl-sel" role="group" aria-label="קבוצות לשליחה"></div>
  </section>

  <section class="bl-box" aria-labelledby="bl-msg-h">
    <h2 id="bl-msg-h">3. הברכה ל<span data-occ-name></span></h2>
    <p class="bl-lbl">איזה סגנון לכל קבוצה?</p>
    <div class="bl-gstyle" id="bl-gstyle"></div>
    <p class="bl-lbl">הנוסח (אפשר לשנות כל מילה)</p>
    <div class="bl-tabs" id="bl-stabs" role="group" aria-label="סגנון לעריכה"></div>
    <div class="field"><label for="bl-text" class="vh">נוסח הברכה</label><textarea id="bl-text" rows="6" dir="auto"></textarea></div>
    <div class="bl-row"><button class="btn btn-line btn-sm" type="button" id="bl-other">↻ נוסח אחר</button><button class="btn btn-line btn-sm" type="button" id="bl-reset" hidden>לחזור לנוסח המוכן</button><span class="bl-varn" id="bl-var-n"></span></div>
    <div class="bl-chips" id="bl-chips" role="group" aria-label="להכניס לנוסח"><button type="button" data-v="{שם}">{שם}</button><button type="button" data-v="{שם מלא}">{שם מלא}</button><button type="button" data-v="{לך}">{לך}</button><button type="button" data-v="{חתימה}">{חתימה}</button></div>
    <p class="bl-hint"><b>{שם}</b> מתחלף בשם של כל אחד (או במה שכתבתם ב"איך פונים"). <b>{לך}</b> הופך ל"לכם" למשפחה או לזוג.</p>
    <div class="field" style="margin-top:.8rem"><label for="bl-sign">החתימה בסוף כל ברכה</label><input id="bl-sign" type="text" maxlength="80" placeholder="למשל: משה ורחל כהן והילדים"></div>
    <div class="bl-prev">
      <div class="bl-prev-top"><h3>כך זה ייראה</h3><div class="bl-row"><button class="btn btn-line btn-sm" type="button" id="bl-pv-prev" aria-label="הקודם">→</button><span id="bl-pv-who"></span><button class="btn btn-line btn-sm" type="button" id="bl-pv-next" aria-label="הבא">←</button></div></div>
      <div class="bl-bubble" id="bl-pv" dir="auto" aria-live="polite"></div>
    </div>
  </section>

  <section class="bl-box" aria-labelledby="bl-send-h">
    <h2 id="bl-send-h">4. שליחה, אחד אחרי השני</h2>
    <div class="bl-tabs" id="bl-modes" role="group" aria-label="דרך השליחה">
      <button type="button" data-m="wa" aria-pressed="true">וואטסאפ</button>
      <button type="button" data-m="sms" aria-pressed="false">SMS</button>
      <button type="button" data-m="em" aria-pressed="false">מייל</button>
      <button type="button" data-m="acc" aria-pressed="false">מייל לכולם בלחיצה</button>
      <button type="button" data-m="copy" aria-pressed="false">להעתיק הכול</button>
    </div>
    <div class="bl-mode" data-mode="wa">
      <div id="bl-next-wa"></div>
      <p class="bl-note">📌 <b>למה לוחצים "שליחה" בכל צ'אט?</b> וואטסאפ לא מרשה לשלוח הודעות אוטומטיות מטלפון רגיל, ומספר ששולח כך הרבה הודעות עלול להיחסם. כאן כל צ'אט נפתח עם הברכה האישית כבר כתובה, ואתם רק לוחצים שליחה וחוזרים לכאן לבא בתור. כמה שניות לאדם. הברכה מגיעה גם למי שלא שמר את המספר שלכם.</p>
      <details class="bl-all"><summary>כל הרשימה (לפתוח בכל סדר)</summary><ul class="bl-qlist" id="bl-all-wa"></ul></details>
      <button class="btn btn-line btn-sm" type="button" data-reset>להתחיל סבב חדש (לנקות את הסימונים)</button>
    </div>
    <div class="bl-mode" data-mode="sms" hidden>
      <div id="bl-next-sms"></div>
      <p class="bl-note">📌 למי שאין וואטסאפ (סבא וסבתא, טלפון כשר): הודעת SMS נפתחת עם הברכה, ולוחצים שליחה. עולה כמו כל SMS בחבילה שלכם.</p>
      <details class="bl-all"><summary>כל הרשימה (לפתוח בכל סדר)</summary><ul class="bl-qlist" id="bl-all-sms"></ul></details>
      <button class="btn btn-line btn-sm" type="button" data-reset>להתחיל סבב חדש (לנקות את הסימונים)</button>
    </div>
    <div class="bl-mode" data-mode="em" hidden>
      <div id="bl-next-em"></div>
      <p class="bl-note">📌 כל מייל נפתח עם השם של אותו אדם, ושולחים מהמייל שלכם. רוצים לשלוח לכולם בלחיצה אחת? "מייל לכולם בלחיצה".</p>
      <details class="bl-all"><summary>כל הרשימה (לפתוח בכל סדר)</summary><ul class="bl-qlist" id="bl-all-em"></ul></details>
      <button class="btn btn-line btn-sm" type="button" data-reset>להתחיל סבב חדש (לנקות את הסימונים)</button>
    </div>
    <div class="bl-mode" data-mode="acc" hidden>
      <p class="bl-note">✉️ <b>כל אחד מקבל מייל אישי עם השם שלו, בלחיצה אחת.</b> המיילים יוצאים מהג'ימייל שלכם ומופיעים אצלכם ב"דואר יוצא". זה עובד דרך קוד קטן שמתקינים פעם אחת בחשבון הגוגל שלכם, והרשימה לא עוברת דרך האתר. גוגל מאפשר עד כ-100 מיילים ביום מג'ימייל רגיל. בחינם.</p>
      <div id="bl-acc-setup">
        <h3>התקנה, פעם אחת (כ-5 דקות)</h3>
        <ol class="bl-install">
          <li>פותחים את <a class="gold" href="https://script.google.com/home/projects/create" target="_blank" rel="noopener">script.google.com</a> בחשבון הגוגל שלכם. נפתח פרויקט חדש.</li>
          <li>מוחקים את מה שכתוב שם, ומדביקים את הקוד: <button class="btn btn-line btn-sm" type="button" id="bl-copy-code">להעתיק את הקוד</button> <span class="bl-msg" id="bl-code-msg" role="status"></span></li>
          <li>שומרים (💾), בוחרים למעלה את הפעולה <b>setup</b> ולוחצים <b>הפעלה</b>. גוגל מבקש לאשר שליחת מייל בשמכם: מאשרים.</li>
          <li><b>פריסה</b> ← <b>פריסה חדשה</b> ← סוג: <b>אפליקציית אינטרנט</b>. "הפעלה בתור": אני. "למי יש גישה": <b>כולם</b>. לוחצים פריסה, ומעתיקים את כתובת אפליקציית האינטרנט.</li>
          <li>מדביקים אותה כאן:</li>
        </ol>
        <textarea id="bl-code" rows="6" dir="ltr" readonly hidden aria-label="קוד השליחה"></textarea>
        <form class="bl-form" id="bl-conn" novalidate>
          <div class="field"><label for="bl-url">כתובת אפליקציית האינטרנט</label><input id="bl-url" type="url" dir="ltr" placeholder="https://script.google.com/macros/s/.../exec"></div>
          <button class="btn btn-gold btn-sm" type="submit">לחבר</button>
          <p class="bl-msg" id="bl-conn-msg" role="status" aria-live="polite"></p>
        </form>
        <p class="bl-hint">כבר חיברתם את הקוד ב<a class="gold" href="/esek/tfutsa/">רשימת התפוצה לעסק</a> באותו דפדפן? זה אותו קוד, והחיבור כבר מוכן כאן.</p>
      </div>
      <div id="bl-acc-ready" hidden>
        <p class="bl-okline">✓ מחובר לחשבון הגוגל שלכם. <span id="bl-quota"></span></p>
        <p class="bl-prog" id="bl-acc-prog"></p>
        <button class="btn btn-gold" type="button" id="bl-acc-send">לשלוח את כל הברכות במייל</button>
        <p class="bl-msg" id="bl-acc-msg" role="status" aria-live="polite"></p>
        <p class="bl-hint">נשלח רק למי שיש לו מייל, בקבוצות שסימנתם, ושעוד לא קיבל ברכה לחג הזה. שם השולח: השורה הראשונה של החתימה.</p>
        <button class="btn btn-line btn-sm" type="button" id="bl-acc-off">לנתק את הדפדפן הזה</button>
      </div>
    </div>
    <div class="bl-mode" data-mode="copy" hidden>
      <p class="bl-note">כל הברכות, כל אחת עם השם שלה, בטקסט אחד. טוב להדפסה, לכרטיסים בכתב יד, או להדבקה במקום אחר.</p>
      <button class="btn btn-gold btn-sm" type="button" id="bl-copy">להעתיק את כל הברכות</button> <span class="bl-msg" id="bl-copy-msg" role="status"></span>
      <textarea id="bl-copy-ta" rows="10" dir="auto" readonly aria-label="כל הברכות"></textarea>
    </div>
  </section>

  <section class="bl-box" aria-labelledby="bl-rem-h">
    <h2 id="bl-rem-h">5. תזכורת לחג הבא</h2>
    <div id="bl-rem-next">
      <p class="bl-hint" id="bl-rem-txt" style="color:var(--parchment)"></p>
      <div class="bl-row" style="margin-top:.7rem"><a class="btn btn-gold btn-sm" id="bl-rem-g" href="#" target="_blank" rel="noopener">📅 ליומן גוגל</a><button class="btn btn-line btn-sm" type="button" id="bl-rem-ics">תזכורת לכל החגים בשנה (קובץ יומן)</button></div>
      <p class="bl-msg" id="bl-rem-msg" role="status" aria-live="polite"></p>
    </div>
  </section>

  <p class="disclaimer">הכלי לא שולח כלום לבד: כל ברכה יוצאת רק כשאתם לוחצים. הרשימה נשמרת רק בדפדפן שלכם, ואף אחד אחר לא רואה אותה. לפני החלפת טלפון לוחצים "גיבוי CSV".</p>
  <div class="share-row"><a class="btn btn-line btn-sm" href="#" data-share-tool="wa" data-text="כלי בחינם ששולח ברכה לחג לכל האנשים הקרובים, כל אחד עם השם שלו:" target="_blank" rel="noopener"><svg class="ic"><use href="#wa"/></svg> לשלוח את הכלי לחבר</a></div>
</div>`;
}

function faqLd(faq) {
  return JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a.replace(/<[^>]+>/g, '') } })) });
}
function page(meta, hero, body, seo, faq) {
  meta.head = '<link rel="stylesheet" href="/assets/seo-txt.css"><link rel="stylesheet" href="/assets/kesharim-bracha.css"><script type="application/ld+json">' + faqLd(faq) + '</script>';
  meta.foot = '<script src="/assets/kesharim-bracha-data.js" defer></script><script src="/assets/kesharim-bracha.js" defer></script>';
  return '<!--meta ' + JSON.stringify(meta, null, 2) + ' -->\n' + hero + '\n\n' + body + '\n\n<!--seo-txt-->\n<section class="k-sec seo-txt" aria-labelledby="seo-h">\n' + seo + '\n</section>\n' +
    '<section class="k-sec seo-faq" aria-labelledby="seo-faq-h">\n  <h2 id="seo-faq-h">שאלות ותשובות</h2>\n' +
    faq.map(([q, a]) => `  <details><summary>${q}</summary><p>${a}</p></details>`).join('\n') + '\n</section>\n<!--/seo-txt-->\n';
}
function write(rel, html) { const f = path.join(OUT, rel, 'index.html'); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html.replace(/\n/g, '\r\n'), 'utf8'); console.log('wrote', path.relative(ROOT, f)); }

// ---------- טקסט ייחודי לכל חג ----------
const HOL = {
  rosh: { h1: 'ברכה לראש השנה, אישית עם השם של כל אחד', title: 'ברכה לראש השנה עם השם: ברכות אישיות לכל המשפחה, החברים והלקוחות',
    desc: 'ברכה לראש השנה לכל האנשים הקרובים, כל אחד עם השם שלו: למשפחה, לחברים, ללקוחות ולעובדים. 9 ברכות מוכנות בשלושה סגנונות, ושליחה בווטסאפ, SMS ומייל. בחינם.',
    intro: 'שנה טובה ומתוקה, אבל לכל אחד בשמו. מכניסים פעם אחת את האנשים הקרובים, בוחרים ברכה לראש השנה, וכל אחד מקבל אותה עם השם שלו: אמא, הדודים, החברים מהעבודה והלקוחות.',
    about: 'ראש השנה הוא הזמן שבו הכי הרבה אנשים שולחים ברכות, ולכן גם הזמן שבו הודעה גנרית אחת לכולם הכי בולטת. ברכה שמתחילה בשם, ושונה לאמא ולרואה החשבון, מראה שחשבתם על האדם. בכלי יש ברכות חמות למשפחה ולחברים ("שנה טובה ומתוקה, מאחלים לך שנה של בריאות, שמחה ונחת"), ברכות מכובדות ללקוחות ולעובדים עם תודה על השנה שעברה, וברכות קצרות של שורה אחת. "כתיבה וחתימה טובה" מתאים עד יום כיפור, ובכלי יש גם ברכות "גמר חתימה טובה" לימים שבין ראש השנה ליום כיפור.',
    faq: [['מה כותבים בברכה לראש השנה?', 'משפט קצר וחם עם השם: "שנה טובה ומתוקה, {שם}! שנה של בריאות, שמחה ונחת". ללקוחות מוסיפים תודה על השנה שעברה. בכלי יש 9 ברכות מוכנות בשלושה סגנונות.'],
      ['מה ההבדל בין ברכה לראש השנה למשפחה לבין ברכה ללקוחות?', 'למשפחה ולחברים כותבים חם ואישי ("אוהבים אותך"). ללקוחות ולעובדים כותבים מכובד: תודה על האמון, איחולי הצלחה ושנה טובה. בכלי בוחרים סגנון לכל קבוצה, וכל אחד מקבל את הנוסח שמתאים לו.'],
      ['עד מתי אומרים "כתיבה וחתימה טובה"?', 'מראש השנה ועד יום כיפור. ביום כיפור עצמו ובימים שלפניו אומרים "גמר חתימה טובה", וגם לזה יש ברכות מוכנות בכלי.']] },
  sukot: { h1: 'ברכה לסוכות, אישית עם השם של כל אחד', title: 'ברכה לחג סוכות עם השם: ברכות מוכנות ושליחה לכל המשפחה והחברים',
    desc: 'ברכה לחג סוכות שמח לכל האנשים הקרובים, כל אחד עם השם שלו. ברכות קצרות, חמות ומכובדות, "מועדים לשמחה" ו"ושבת שלום" כשהחג נכנס בשבת. שליחה בווטסאפ, SMS ומייל, בחינם.',
    intro: 'חג סוכות שמח לכל אחד בשמו. מכניסים את האנשים פעם אחת, בוחרים ברכה לסוכות, ושולחים לכולם, כל ברכה עם השם של מי שמקבל.',
    about: 'ברכה לסוכות היא בדרך כלל קצרה ושמחה: "חג סוכות שמח ומועדים לשמחה". בכלי יש ברכות חמות שמאחלות סוכה מלאה באורחים ובצחוק, ברכות מכובדות ללקוחות, וברכות של שורה אחת. כשהחג נכנס ביום שישי או בשבת, הכלי מציע לבד להוסיף "ושבת שלום" לכל ברכה, כי הרבה מחפשים בדיוק את זה: ברכה לחג סוכות שחל בשבת. אותה רשימה משמשת גם לשמחת תורה, ובסוף החג אפשר לסמן סבב חדש.',
    faq: [['מה כותבים בברכה לסוכות?', '"חג סוכות שמח ומועדים לשמחה", ואפשר להוסיף איחול: שהסוכה תתמלא באורחים ובשמחה. בכלי יש 9 ברכות מוכנות.'],
      ['מה כותבים כשסוכות נכנס בשבת?', 'מוסיפים "ושבת שלום" לברכה: "חג סוכות שמח ושבת שלום". הכלי מסמן את זה לבד כשהחג נכנס ביום שישי או בשבת.'],
      ['מה ההבדל בין "חג שמח" ל"מועדים לשמחה"?', '"מועדים לשמחה" נאמר בעיקר בחול המועד ובחגים, ו"חג שמח" מתאים תמיד. שני הנוסחים נמצאים בברכות שבכלי.']] },
  chanuka: { h1: 'ברכה לחנוכה, אישית עם השם של כל אחד', title: 'ברכה לחנוכה עם השם: ברכות אישיות לשליחה לכל המשפחה והלקוחות',
    desc: 'ברכה לחנוכה לכל האנשים הקרובים, כל אחד עם השם שלו: חג אורים שמח למשפחה, לחברים וללקוחות. 9 ברכות מוכנות בשלושה סגנונות, שליחה בווטסאפ, SMS ומייל, ותזכורת לחג הבא. בחינם.',
    intro: 'חג אורים שמח לכל אחד בשמו. מכניסים את האנשים פעם אחת, בוחרים ברכה לחנוכה, וכל אחד מקבל אותה עם השם שלו, לפני הנר הראשון.',
    about: 'חנוכה נמשך שמונה ימים, ולכן אפשר לשלוח ברכה לפני הנר הראשון או בכל אחד מימי החג. בכלי יש ברכות חמות למשפחה ("שהאור של הנרות ימלא את הבית שלך בחום ובאהבה"), ברכות מכובדות ללקוחות ולעובדים עם תודה ואיחול לשנה מוארת, וברכות קצרות של שורה אחת. כשהנר הראשון יוצא ביום שישי, הכלי מציע להוסיף "ושבת שלום". רוצים כרטיס מעוצב במקום טקסט? יש <a class="gold" href="/kodesh/chanuka/bracha/">כרטיס ברכה לחנוכה</a>, ואת הטקסט מכאן אפשר להדביק בו.',
    faq: [['מה כותבים בברכה לחנוכה?', '"חנוכה שמח, {שם}! שהאור של הנרות ימלא את הבית שלך בחום ובשמחה". ללקוחות: "לכבוד חג החנוכה, מאחלים לך ולבני הבית חג אורים שמח". בכלי יש 9 ברכות מוכנות.'],
      ['מתי שולחים ברכה לחנוכה?', 'הכי נהוג ביום שלפני הנר הראשון או ביום הראשון של החג. החג נמשך שמונה ימים, אז גם מי ששכח יכול לשלוח עד הנר השמיני.'],
      ['אפשר לשלוח ברכה לחנוכה לכל אנשי הקשר?', 'כן, אחד אחרי השני: כל צ\'אט בווטסאפ נפתח עם הברכה והשם כבר כתובים, ולוחצים שליחה. במייל אפשר לשלוח לכולם בלחיצה אחת מהחשבון שלכם.']] },
  purim: { h1: 'ברכה לפורים, אישית עם השם של כל אחד', title: 'ברכה לפורים עם השם: ברכות לפורים שמח לשליחה לכל המשפחה והחברים',
    desc: 'ברכה לפורים שמח לכל האנשים הקרובים, כל אחד עם השם שלו: למשפחה, לחברים, ללקוחות ולמשלוח המנות. 9 ברכות מוכנות ושליחה בווטסאפ, SMS ומייל. בחינם.',
    intro: 'פורים שמח לכל אחד בשמו. מכניסים את האנשים פעם אחת, בוחרים ברכה לפורים, ושולחים לכולם, כל ברכה עם השם של מי שמקבל.',
    about: 'ברכה לפורים היא שמחה וקלילה, ולפעמים מצוטט בה הפסוק "ליהודים הייתה אורה ושמחה וששון ויקר". בכלי יש ברכות חמות למשפחה ולחברים, ברכות מכובדות ללקוחות ("ונהפוך הוא, שכל הקשיים יתהפכו לטובה"), וברכות קצרות שמתאימות גם לפתק במשלוח המנות: בלשונית "להעתיק הכול" מקבלים את כל הברכות עם השמות בטקסט אחד, להדפסה ולהדבקה על המשלוחים.',
    faq: [['מה כותבים בברכה לפורים?', '"פורים שמח, {שם}! שתהיה לך שמחה גדולה, משלוחי מנות טעימים והרבה צחוק". בכלי יש 9 ברכות מוכנות בשלושה סגנונות.'],
      ['מה כותבים בפתק למשלוח מנות?', 'ברכה קצרה עם השם: "פורים שמח, {שם}! ונהפוך הוא, רק לטובה". בלשונית "להעתיק הכול" מקבלים את כל הברכות עם השמות, להדפסה.'],
      ['מה ההבדל בין פורים לשושן פורים?', 'פורים חל בי"ד באדר, ושושן פורים בט"ו באדר, בירושלים ובערים מוקפות חומה. הברכה זהה: "פורים שמח".']] },
  pesach: { h1: 'ברכה לפסח, אישית עם השם של כל אחד', title: 'ברכה לפסח עם השם: ברכות לחג פסח כשר ושמח לשליחה לכל המשפחה והלקוחות',
    desc: 'ברכה לפסח כשר ושמח לכל האנשים הקרובים, כל אחד עם השם שלו: למשפחה, לחברים, ללקוחות ולעובדים. 9 ברכות מוכנות בשלושה סגנונות ושליחה בווטסאפ, SMS ומייל. בחינם.',
    intro: 'חג פסח כשר ושמח לכל אחד בשמו. מכניסים את האנשים פעם אחת, בוחרים ברכה לפסח, וכל אחד מקבל אותה עם השם שלו לפני ליל הסדר.',
    about: 'ברכה לפסח מדברת על חירות, אביב והתחלות חדשות, ועל ליל הסדר עם המשפחה. בכלי יש ברכות חמות ("שיהיה לך ליל סדר מרגש, מלא בשירה ובסיפורים"), ברכות מכובדות ללקוחות ולעובדים ("חג כשר ושמח, חג של חירות, אביב והתחדשות"), וברכות קצרות. אותה רשימה מהחגים הקודמים כבר שמורה, אז שולחים בכמה דקות. גם בשביעי של פסח, החג השני, אפשר לפתוח סבב חדש.',
    faq: [['מה כותבים בברכה לפסח?', '"חג פסח כשר ושמח, {שם}! שיהיה לך ליל סדר מרגש, מלא בשירה ובאנשים שאוהבים". ללקוחות: "מאחלים לך ולבני הבית חג כשר ושמח, חג של חירות והתחדשות".'],
      ['מתי שולחים ברכה לפסח?', 'בדרך כלל יום או יומיים לפני ליל הסדר, כשכולם עוד בהכנות. תזכורת ביומן מהכלי מגיעה יומיים לפני.'],
      ['אפשר לשלוח ברכה לפסח לכל העובדים במייל?', 'כן. בלשונית "מייל לכולם בלחיצה" כל עובד מקבל מייל אישי עם השם שלו, מהג\'ימייל שלכם, אחרי התקנה קצרה של פעם אחת.']] },
  shavuot: { h1: 'ברכה לשבועות, אישית עם השם של כל אחד', title: 'ברכה לשבועות עם השם: ברכות לחג שבועות שמח לשליחה לכל המשפחה והחברים',
    desc: 'ברכה לשבועות, חג שמח לכל האנשים הקרובים, כל אחד עם השם שלו: חג מתן תורה, חג הביכורים, ו"ושבת שלום" כשצריך. 9 ברכות מוכנות ושליחה בווטסאפ, SMS ומייל. בחינם.',
    intro: 'חג שבועות שמח לכל אחד בשמו. מכניסים את האנשים פעם אחת, בוחרים ברכה לשבועות, ושולחים לכולם, כל ברכה עם השם של מי שמקבל.',
    about: 'שבועות הוא חג מתן תורה וחג הביכורים, ולכן הברכות מדברות על תורה, על שפע ועל פירות טובים, ולא מעט גם על עוגת גבינה. בכלי יש ברכות חמות ("שיהיה לך חג לבן, מתוק ושמח"), ברכות מכובדות ללקוחות ("חג של שפע וברכה"), וברכות קצרות. כשהחג חל ביום שישי, הכלי מציע להוסיף "ושבת שלום" לכל ברכה.',
    faq: [['מה כותבים בברכה לשבועות?', '"חג שבועות שמח, {שם}! שיהיה לך חג לבן, מתוק ושמח". או "חג מתן תורה שמח". בכלי יש 9 ברכות מוכנות.'],
      ['מה ההבדל בין חג מתן תורה לחג הביכורים?', 'אלה שני שמות של חג השבועות: ביום הזה ניתנה התורה בהר סיני, ובו הביאו את הביכורים, הפירות הראשונים, לבית המקדש. אפשר לברך בכל אחד מהם.'],
      ['כמה ימים חג שבועות?', 'בארץ יום אחד, ו׳ בסיוון. בחוץ לארץ יומיים.']] }
};

// ---------- הדף הראשי ----------
const nexts = D.occ.filter(o => o.m).map(o => [o, nextDate(o)]).filter(x => x[1]).sort((a, b) => a[1] - b[1]);
const nextList = nexts.map(([o, d]) => `<li>${o.icon} <b>${o.name}</b>: ${o.id === 'chanuka' ? 'נר ראשון' : 'ערב החג'} ב${longD(eveOf(d))} (${hebYear(d)})</li>`).join('\n    ');
const mainFaq = [
  ['איך שולחים ברכה לחג לכל אנשי הקשר, כל אחד עם השם שלו?', 'מכניסים פעם אחת את האנשים (הדבקה, קובץ אנשי קשר או בחירה מהטלפון), בוחרים חג וסגנון, והכלי כותב לכל אחד ברכה עם השם שלו. בוואטסאפ כל צ\'אט נפתח עם הברכה כתובה ולוחצים שליחה; במייל אפשר לשלוח לכולם בלחיצה אחת.'],
  ['אפשר לשלוח ברכה לכל אנשי הקשר בוואטסאפ בלחיצה אחת?', 'לא באופן אוטומטי: וואטסאפ לא מרשה שליחה אוטומטית מטלפון רגיל, ומספר ששולח כך עלול להיחסם. כאן כל צ\'אט נפתח עם הברכה האישית כבר כתובה, לוחצים שליחה וחוזרים לבא בתור. כמה שניות לאדם, והברכה מגיעה גם למי שלא שמר אתכם.'],
  ['הרשימה נשמרת לחג הבא?', 'כן. הרשימה, הנוסחים והחתימה נשמרים בדפדפן שלכם, ובחג הבא פותחים ושולחים. אפשר גם לשמור גיבוי CSV ולהוסיף ליומן תזכורת יומיים לפני כל חג.'],
  ['מה זה "איך פונים"?', 'מה שייכתב בברכה במקום השם. למשל לרחל כהן כותבים "אמא", ולמשפחת לוי "משפחת לוי היקרה". בלי זה הכלי לוקח את השם הפרטי.'],
  ['אפשר לשלוח ברכה שונה ללקוחות ולמשפחה?', 'כן. לכל קבוצה (משפחה, חברים, לקוחות, עבודה) בוחרים סגנון: חם ואישי, מכובד או קצר. כל אחד מקבל את הנוסח של הקבוצה שלו, עם השם שלו.'],
  ['זה עולה כסף? מישהו רואה את הרשימה?', 'בחינם, בלי הרשמה ובלי פרסומות. הרשימה נשמרת רק בדפדפן שלכם ולא נשלחת לשום שרת. גם המייל בלחיצה יוצא מהחשבון שלכם, דרך קוד שמותקן אצלכם.']
];
const mainSeo = `  <h2 id="seo-h">ברכה לחג לכל האנשים הקרובים, וכל אחד מקבל אותה בשמו</h2>
  <p>לפני כל חג אותו סיפור: רוצים לברך את המשפחה, את החברים ואת הלקוחות, ושולחים לכולם אותה הודעה מועתקת, או מוותרים כי אין כוח לכתוב לכל אחד. הכלי הזה פותר את זה. מכניסים פעם אחת את האנשים הקרובים, והם נשמרים. בכל חג בוחרים ברכה, וכל אחד מקבל אותה עם השם שלו: "שנה טובה ומתוקה, אמא", "חנוכה שמח, משה", "שלום דנה, לקראת חג הפסח...". זה נראה כמו הודעה שנכתבה רק לו, כי היא באמת נכתבה לו.</p>
  <h3>ברכות מוכנות לכל חג, בשלושה סגנונות</h3>
  <p>לכל חג יש תשע ברכות: שלוש חמות ואישיות למשפחה ולחברים, שלוש מכובדות ללקוחות ולעבודה, ושלוש קצרות של שורה אחת. יש ברכות ל<a class="gold" href="${BASE}rosh-hashana/">ראש השנה</a>, יום כיפור (גמר חתימה טובה), <a class="gold" href="${BASE}sukot/">סוכות</a>, <a class="gold" href="${BASE}chanuka/">חנוכה</a>, <a class="gold" href="${BASE}purim/">פורים</a>, <a class="gold" href="${BASE}pesach/">פסח</a>, <a class="gold" href="${BASE}shavuot/">שבועות</a>, השנה האזרחית, יום הולדת וחג שמח כללי. לכל קבוצה בוחרים סגנון, ואפשר לשנות כל מילה. למשפחה או לזוג הכלי עובר לבד ללשון רבים ("לכם", "אתכם"), וכשהחג נכנס ביום שישי או בשבת הוא מציע להוסיף "ושבת שלום".</p>
  <h3>החגים הקרובים</h3>
  <ul>
    ${nextList}
  </ul>
  <h3>איך שולחים לכולם</h3>
  <p><b>וואטסאפ:</b> לוחצים "פתיחה בווטסאפ", הצ'אט נפתח עם הברכה והשם כבר כתובים, לוחצים שליחה וחוזרים לבא בתור. הכלי מסמן מי כבר קיבל, כך שאפשר לעצור באמצע ולהמשיך אחר כך. <b>SMS:</b> אותו דבר, למי שאין וואטסאפ. <b>מייל:</b> אחד אחרי השני מג'ימייל או מאפליקציית המייל, או לכולם בלחיצה אחת מהחשבון שלכם, דרך קוד קטן שמתקינים פעם אחת (כמו ב<a class="gold" href="/esek/tfutsa/">רשימת התפוצה לעסק</a>). הכלי לא שולח כלום בלי שאתם לוחצים.</p>
  <h3>תזכורת, כדי לא לפספס את החג הבא</h3>
  <p>בסוף הדף מוסיפים ליומן תזכורת יומיים לפני החג הבא, או קובץ אחד עם תזכורת לפני כל החגים בשנה. בחג הבא פותחים, והרשימה והחתימה כבר מחכות. לימי הולדת יש <a class="gold" href="/kelim/kesharim/yomulda/">רשימת ימי הולדת ותאריכים</a>, ולברכות לשמחות (חתונה, בר מצווה, לידה) יש <a class="gold" href="/kodesh/brachot/">ברכות מכל הלב לכל אירוע</a>. גם <a class="gold" href="/kelim/tochen/chatimat-mail/">חתימת המייל</a> יכולה לכלול שורת ברכה לחג.</p>
  <h3>בחינם, והרשימה נשארת אצלכם</h3>
  <p>הכלים במיזם של גילעד רחמים נבנים כחסד: בלי תשלום, בלי פרסומות ובלי הרשמה. הרשימה נשמרת רק בדפדפן שלכם ולא עוברת לשום שרת. אם הכלי עזר לכם, שלחו אותו למי שגם הוא מברך הרבה אנשים בחגים. חסר משהו? <a class="gold" href="/kelim/bakasha/">כתבו לנו איזה כלי לבנות</a>.</p>`;
write('', page({
  site: 'kelim', nav: 'tchumim', tool: 'kesharim_bracha',
  title: 'ברכה לחג עם השם של כל אחד: שליחה לכל אנשי הקשר בווטסאפ ובמייל',
  description: 'ברכה לחג לכל האנשים הקרובים, כל אחד עם השם שלו: ראש השנה, סוכות, חנוכה, פורים, פסח, שבועות ויום הולדת. רשימה קבועה, ברכות מוכנות בשלושה סגנונות, ושליחה בווטסאפ, SMS ומייל. בחינם.',
  og_title: 'ברכה לחג לכל האנשים הקרובים, כל אחד עם השם שלו',
  priority: '0.8',
  crumbs: [['חברה וקשרים', '/kelim/kesharim/'], ['ברכה לחג', null]]
}, `<header class="k-hero">
  <h1>ברכה לחג, אישית עם השם של כל אחד</h1>
  <p class="sub">מכניסים פעם אחת את האנשים הקרובים: משפחה, חברים, לקוחות. בכל חג בוחרים ברכה, וכל אחד מקבל אותה עם השם שלו, בווטסאפ, ב-SMS או במייל. בחינם, והרשימה נשארת רק אצלכם.</p>
</header>`, toolHtml(''), mainSeo, mainFaq));

// ---------- דף לכל חג ----------
for (const o of D.occ.filter(x => x.slug)) {
  const H = HOL[o.id], d = nextDate(o);
  const when = d ? `${o.id === 'chanuka' ? 'הנר הראשון של חנוכה' : 'ערב ' + o.name} ${hebYear(d)} יוצא ב${longD(eveOf(d))}${o.id === 'chanuka' ? '' : ', והחג עצמו ב' + longD(d)}.` : '';
  const shab = d && (d.getUTCDay() === 6 || d.getUTCDay() === 5) ? ' השנה החג נכנס בסמוך לשבת, ולכן הכלי יציע להוסיף "ושבת שלום" לכל ברכה.' : '';
  const lists = D.styles.map(([s, sn, sd]) => `  <h3>ברכות ל${o.name}: ${sn} (${sd})</h3>\n  <ul class="bl-ex">\n${o.t[s].map(t => `    <li>${show(t)}</li>`).join('\n')}\n  </ul>`).join('\n');
  const others = D.occ.filter(x => x.slug && x.id !== o.id).map(x => `<a class="gold" href="${BASE}${x.slug}/">ברכה ל${x.name}</a>`).join(' · ');
  const faq = H.faq.map(([q, a]) => [q, a.replace(/\{שם\}/g, 'השם')]).concat([
    [`הברכות ל${o.name} כאן בחינם?`, 'כן. כל הברכות והשליחה בחינם, בלי הרשמה ובלי פרסומות.'],
    [`מתי ${o.name} ${d ? hebYear(d) : ''}?`.replace(/\s+\?/, '?'), when || 'לפי הלוח העברי.'],
    [`איך שולחים ברכה ל${o.name} לכל אנשי הקשר עם השם של כל אחד?`, 'מכניסים את האנשים פעם אחת, בוחרים ברכה, וכל אחד מקבל אותה עם השם שלו: בווטסאפ כל צ\'אט נפתח עם הברכה כתובה ולוחצים שליחה, ובמייל אפשר לשלוח לכולם בלחיצה אחת מהחשבון שלכם. בחינם.']
  ]);
  const seo = `  <h2 id="seo-h">${H.h1.replace(', אישית', ' אישית')}</h2>
  <p>${H.intro} ${when}${shab}</p>
  <h3>מה כותבים בברכה ל${o.name}</h3>
  <p>${H.about}</p>
${lists}
  <p class="bl-hint">במקום [השם] נכנס השם של כל אחד, או מה שכתבתם ב"איך פונים" (אמא, סבתא רחל). למשפחה או לזוג, "לך" הופך לבד ל"לכם".</p>
  <h3>שולחים לכולם, וכל אחד מקבל אותה בשמו</h3>
  <p>הרשימה נשמרת בדפדפן, אז בחג הבא היא כבר כאן. בוואטסאפ כל צ'אט נפתח עם הברכה האישית כתובה, ולוחצים שליחה; וואטסאפ לא מרשה שליחה אוטומטית מטלפון רגיל, ולכן זו הדרך הבטוחה. ב-SMS אותו דבר, ובמייל אפשר גם לשלוח לכולם בלחיצה אחת מהג'ימייל שלכם. הכלי מסמן מי כבר קיבל ברכה, ובסוף מוסיפים ליומן תזכורת לחג הבא. הכול בחינם, בלי הרשמה, והרשימה לא יוצאת מהמכשיר.</p>
  <p>ברכות לחגים נוספים: ${others} · <a class="gold" href="${BASE}">כל החגים</a>. לשמחות ואירועים: <a class="gold" href="/kodesh/brachot/">ברכות מכל הלב</a>.</p>`;
  write(o.slug, page({
    site: 'kelim', nav: 'tchumim', tool: 'kesharim_bracha_' + o.id,
    title: H.title, description: H.desc, og_title: H.h1, priority: '0.7',
    crumbs: [['חברה וקשרים', '/kelim/kesharim/'], ['ברכה לחג', BASE], [o.name, null]]
  }, `<header class="k-hero">
  <h1>${H.h1}</h1>
  <p class="sub">${H.intro} בווטסאפ, ב-SMS או במייל. בחינם.</p>
</header>`, toolHtml(o.id), seo, faq));
}
