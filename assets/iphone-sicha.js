/* Call recording page: method picker + on-device summary and calendar reminders from a transcript.
   The transcript itself comes from the shared tamlul engine (/assets/tamlul.js). Summary and dates
   are computed here, in the browser; nothing from this file is sent to any server. */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var IOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  var done = {};
  function used(a) { if (done[a]) return; done[a] = 1; try { if (window.toolUsed) window.toolUsed('iphone_hakltat_sichot', { how: a }); } catch (e) {} }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- 1. method picker ---------- */
  var M = {
    ios18: '<h3>📱 אייפון עם iOS 18.1 ומעלה: יש הקלטה מובנית</h3><ol class="ip-steps">' +
      '<li>בזמן השיחה לוחצים על <b>עוד</b>, ואז על <b>הקלטת השיחה</b>.</li>' +
      '<li>שני הצדדים שומעים הודעה קולית שהשיחה מוקלטת. כך אפל בנתה את זה, ואי אפשר לכבות את ההודעה.</li>' +
      '<li>לעצור: <b>עצירה</b>, או פשוט לסיים את השיחה. ההקלטה נשמרת ב<b>פתקים</b>, בתיקייה <b>הקלטות שיחות</b>.</li>' +
      '<li>לתמלול בעברית: פותחים את הפתק, לוחצים על ההקלטה ובתפריט שלה שומרים את השמע ב<b>קבצים</b>. אחר כך כאן למטה: <b>לבחור קובץ</b>.</li></ol>' +
      '<p class="ip-why">התמלול והסיכום של אפל עובדים רק בשפות מסוימות, ועברית לא ברשימה. לכן מעלים לכאן. השמות בתפריטים יכולים להשתנות מעט בין גרסאות.</p>',
    iosold: '<h3>📱 אייפון עם iOS ישן מ-18.1: אין כפתור הקלטה</h3><ol class="ip-steps">' +
      '<li>אם אפשר, מעדכנים: <b>הגדרות</b> ← <b>כללי</b> ← <b>עדכון תוכנה</b>. מ-iOS 18.1 יש הקלטה מובנית.</li>' +
      '<li>אי אפשר לעדכן? מקליטים במכשיר שני, לפי הדרך של "אין לי מקליט" (כפתור למעלה).</li>' +
      '<li>אפליקציות "מקליט שיחות" בחנות עובדות בדרך כלל דרך שיחת ועידה עם שרת שלהן, ורובן בתשלום. כאן זה בחינם.</li></ol>',
    samsung: '<h3>🤖 סמסונג גלקסי: יש הקלטה באפליקציית הטלפון</h3><ol class="ip-steps">' +
      '<li>בזמן השיחה לוחצים על <b>⋮</b> (שלוש נקודות) ובוחרים <b>הקלטת שיחה</b>.</li>' +
      '<li>להקליט כל שיחה לבד: אפליקציית <b>טלפון</b> ← <b>⋮</b> ← <b>הגדרות</b> ← <b>הקלטת שיחות</b>.</li>' +
      '<li>ההקלטות נמצאות באפליקציית <b>הקבצים שלי</b>, בתיקיית ההקלטות. בוחרים את הקובץ כאן למטה.</li></ol>' +
      '<p class="ip-why">השמות יכולים להשתנות מעט לפי הדגם והגרסה.</p>',
    android: '<h3>🤖 אנדרואיד אחר (שיאומי, פיקסל, וואווי ועוד)</h3><ol class="ip-steps">' +
      '<li>מחפשים בזמן שיחה כפתור <b>הקלטה</b>, או בהגדרות של אפליקציית הטלפון <b>הקלטת שיחות</b>.</li>' +
      '<li>באפליקציית הטלפון של גוגל ההקלטה קיימת רק בחלק מהמדינות, והצד השני שומע הודעה.</li>' +
      '<li>אין כפתור? מקליטים במכשיר שני, לפי הדרך של "אין לי מקליט".</li></ol>',
    none: '<h3>🎙 אין לי מקליט שיחות: מקליטים כאן, במכשיר שני</h3><ol class="ip-steps">' +
      '<li>פותחים את הדף הזה במכשיר <b>אחר</b>: מחשב, טאבלט או טלפון של בן הבית.</li>' +
      '<li>בטלפון שבו מדברים מפעילים <b>רמקול</b>, ומניחים אותו ליד המכשיר השני.</li>' +
      '<li>במכשיר השני לוחצים כאן למטה <b>להקליט עכשיו</b>. בסוף השיחה עוצרים, והתמלול מתחיל לבד.</li></ol>' +
      '<p class="ip-why">למה מכשיר שני? בזמן שיחת טלפון, גם אייפון וגם אנדרואיד לא נותנים לאתר או לאפליקציה אחרת להשתמש במיקרופון. זו הגנה של המערכת. וכמובן: לספר לצד השני שמקליטים.</p>'
  };
  var pick = $('ip-pick'), out = $('ip-how');
  if (pick && out) {
    pick.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-k]'); if (!b) return;
      pick.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      out.innerHTML = M[b.getAttribute('data-k')]; out.hidden = false; used('pick_' + b.getAttribute('data-k'));
    });
    var guess = IOS ? (/OS (1[89]|[2-9]\d)_/.test(navigator.userAgent) ? 'ios18' : 'iosold') : /SM-|Samsung/i.test(navigator.userAgent) ? 'samsung' : /android/i.test(navigator.userAgent) ? 'android' : '';
    if (guess) { var g = pick.querySelector('[data-k="' + guess + '"]'); if (g) { g.setAttribute('aria-pressed', 'true'); out.innerHTML = M[guess]; out.hidden = false; } }
  }

  /* ---------- 2. summary ---------- */
  var CUE = /(סיכמנו|סוכם|נקבע|קבענו|הוחלט|מסכים|מסכימים|צריך|צריכה|חייב|חייבת|תשלח|אשלח|תתקשר|אתקשר|נדבר|נפגש|ניפגש|תזכיר|לזכור|אל תשכח|תעביר|אעביר|לשלם|תשלום|מחיר|עולה|₪|שקל|חוזה|פגישה|תור|דדליין|עד יום|מחר|מחרתיים|השבוע|בשבוע הבא|בשעה)/;
  var STOP = ' של את על עם זה זו זאת הוא היא הם הן אני אתה את אנחנו אתם לא כן גם רק אבל או כי אם מה מי איך למה כמו יש אין היה היתה היו הזה הזאת כל עוד כבר אז פה שם לי לך לו לה לנו להם אותו אותה ממש טוב בסדר אוקיי נו יאללה סבבה רגע ';
  function sentences(t) {
    return t.replace(/\s+/g, ' ').split(/(?<=[.!?…])\s+|\s+(?=(?:אז|ובנוסף|ועוד|ודבר נוסף)\s)/).map(function (s) { return s.trim(); })
      .filter(function (s) { return s.split(' ').length >= 4; });
  }
  function summarize(t) {
    var ss = sentences(t); if (!ss.length) return [];
    var freq = {};
    ss.forEach(function (s) { s.split(/[^\u0590-\u05FFa-zA-Z0-9₪]+/).forEach(function (w) { w = w.replace(/^[ובהלמשכ](?=[\u0590-\u05FF]{3,})/, ''); if (w.length > 2 && STOP.indexOf(' ' + w + ' ') < 0) freq[w] = (freq[w] || 0) + 1; }); });
    var scored = ss.map(function (s, i) {
      var ws = s.split(/[^\u0590-\u05FFa-zA-Z0-9₪]+/), sc = 0;
      ws.forEach(function (w) { w = w.replace(/^[ובהלמשכ](?=[\u0590-\u05FF]{3,})/, ''); sc += freq[w] > 1 ? Math.log(freq[w]) : 0; });
      sc = sc / Math.sqrt(ws.length + 1);
      if (CUE.test(s)) sc += 2.5; if (/\d/.test(s)) sc += 1; if (i < 2) sc += .5;
      return { s: s.length > 220 ? s.slice(0, 217) + '…' : s, i: i, sc: sc };
    });
    var n = Math.min(8, Math.max(3, Math.round(ss.length / 6)));
    return scored.sort(function (a, b) { return b.sc - a.sc; }).slice(0, n).sort(function (a, b) { return a.i - b.i; }).map(function (x) { return x.s; });
  }

  /* ---------- 3. dates and times ---------- */
  var DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  var NUM = { 'אחת': 1, 'שתיים': 2, 'שלוש': 3, 'ארבע': 4, 'חמש': 5, 'שש': 6, 'שבע': 7, 'שמונה': 8, 'תשע': 9, 'עשר': 10, 'אחת עשרה': 11, 'שתים עשרה': 12 };
  function ymd(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function findDates(t) {
    var now = new Date(), res = [], seen = {};
    sentences(t).forEach(function (s) {
      var d = null, m;
      if (/מחרתיים/.test(s)) { d = new Date(now); d.setDate(d.getDate() + 2); }
      else if (/מחר/.test(s)) { d = new Date(now); d.setDate(d.getDate() + 1); }
      else if ((m = s.match(/(?:ב)?יום\s+(ראשון|שני|שלישי|רביעי|חמישי|שישי)|ב?שבת(?!\s*שלום)/))) {
        var k = m[1] ? DAYS.indexOf(m[1]) : 6; d = new Date(now); var add = (k - d.getDay() + 7) % 7 || 7;
        if (/הבא/.test(s) && add < 7) add += 0; d.setDate(d.getDate() + add);
      }
      else if ((m = s.match(/(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?/))) {
        var dd = +m[1], mm = +m[2], yy = m[3] ? +m[3] : now.getFullYear(); if (yy < 100) yy += 2000;
        if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12) { d = new Date(yy, mm - 1, dd); if (!m[3] && d < now) d.setFullYear(yy + 1); }
      }
      else if ((m = s.match(/ב(?:עוד)?\s*(\d+|שבוע|שבועיים|יומיים)\s*(ימים|יום)?/)) && /בעוד/.test(s)) {
        var nd = m[1] === 'שבוע' ? 7 : m[1] === 'שבועיים' ? 14 : m[1] === 'יומיים' ? 2 : +m[1];
        if (nd > 0 && nd < 120) { d = new Date(now); d.setDate(d.getDate() + nd); }
      }
      else if (/בשבוע הבא/.test(s)) { d = new Date(now); d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7)); }
      if (!d) return;
      var hh = '', mt;
      if ((mt = s.match(/(\d{1,2}):(\d{2})/))) hh = String(+mt[1]).padStart(2, '0') + ':' + mt[2];
      else if ((mt = s.match(/בשעה\s+(\d{1,2})/))) hh = String(+mt[1]).padStart(2, '0') + ':00';
      else { for (var w in NUM) { if (new RegExp('(?:בשעה|ב)' + w + '(?![\u0590-\u05FF])').test(s)) { hh = String(NUM[w]).padStart(2, '0') + ':00'; } } }
      if (hh) { var h = +hh.slice(0, 2); if (h < 12 && /(אחר הצהריים|אחה"צ|בערב|בלילה)/.test(s) && h < 12) hh = String(h + 12).padStart(2, '0') + hh.slice(2); else if (h <= 7 && !/בבוקר/.test(s)) hh = String(h + 12).padStart(2, '0') + hh.slice(2); }
      var key = ymd(d) + hh + s.slice(0, 20); if (seen[key]) return; seen[key] = 1;
      res.push({ title: s.length > 90 ? s.slice(0, 87) + '…' : s, date: ymd(d), time: hh || '09:00' });
    });
    return res.slice(0, 8);
  }

  /* ---------- 4. calendar ---------- */
  function icsText(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); }
  function stamp(date, time) { return date.replace(/-/g, '') + 'T' + time.replace(':', '') + '00'; }
  function ics(items) {
    var now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//hakelim.com//iphone-sicha//HE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
    items.forEach(function (it, i) {
      var end = new Date(it.date + 'T' + it.time + ':00'); end.setMinutes(end.getMinutes() + 30);
      var e = ymd(end).replace(/-/g, '') + 'T' + String(end.getHours()).padStart(2, '0') + String(end.getMinutes()).padStart(2, '0') + '00';
      L.push('BEGIN:VEVENT', 'UID:' + Date.now() + '-' + i + '@hakelim.com', 'DTSTAMP:' + now,
        'DTSTART;TZID=Asia/Jerusalem:' + stamp(it.date, it.time), 'DTEND;TZID=Asia/Jerusalem:' + e,
        'SUMMARY:' + icsText(it.title), 'DESCRIPTION:' + icsText('מתוך שיחה מוקלטת. hakelim.com/kelim/iphone/hakltat-sichot/'),
        'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsText(it.title), 'TRIGGER:-PT15M', 'END:VALARM', 'END:VEVENT');
    });
    L.push('END:VCALENDAR'); return L.join('\r\n');
  }
  function download(items) {
    var body = ics(items);
    if (IOS) { location.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(body); return; }
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([body], { type: 'text/calendar;charset=utf-8' }));
    a.download = 'tizkorot-mehasicha.ics'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
  function gcal(it) {
    var s = stamp(it.date, it.time), end = new Date(it.date + 'T' + it.time + ':00'); end.setMinutes(end.getMinutes() + 30);
    var e = ymd(end).replace(/-/g, '') + 'T' + String(end.getHours()).padStart(2, '0') + String(end.getMinutes()).padStart(2, '0') + '00';
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE&ctz=Asia/Jerusalem&text=' + encodeURIComponent(it.title) + '&dates=' + s + '/' + e;
  }

  /* ---------- 5. wiring ---------- */
  var box = $('ip-sum'), src = $('ip-paste'), reminders = [];
  if (!box) return;
  function rowHtml(it, i) {
    return '<li data-i="' + i + '"><div style="flex:1"><div class="ip-field"><label for="ipr-t' + i + '">מה לזכור</label><input id="ipr-t' + i + '" data-f="title" value="' + esc(it.title) + '"></div>' +
      '<div style="display:flex;gap:.5rem;flex-wrap:wrap"><div class="ip-field"><label for="ipr-d' + i + '">תאריך</label><input type="date" id="ipr-d' + i + '" data-f="date" value="' + it.date + '"></div>' +
      '<div class="ip-field"><label for="ipr-h' + i + '">שעה</label><input type="time" id="ipr-h' + i + '" data-f="time" value="' + it.time + '"></div></div>' +
      '<div class="actions" style="margin-top:.3rem"><button class="btn btn-line btn-sm" type="button" data-one>📅 ליומן של הטלפון</button><a class="btn btn-line btn-sm" data-g href="#" target="_blank" rel="noopener">ליומן גוגל</a><button class="btn btn-line btn-sm" type="button" data-del aria-label="למחוק את התזכורת">🗑</button></div></div></li>';
  }
  function drawRem() {
    var ul = $('ip-rem'); ul.innerHTML = reminders.map(rowHtml).join('');
    $('ip-rem-none').hidden = reminders.length > 0; $('ip-rem-all').hidden = reminders.length < 2;
  }
  function analyze(t) {
    t = (t || '').trim(); if (t.length < 40) return;
    var sum = summarize(t);
    $('ip-sum-list').innerHTML = sum.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') || '<li>ההקלטה קצרה מדי לסיכום.</li>';
    reminders = findDates(t); drawRem(); box.hidden = false; used('summary');
  }
  var tx = $('tl-text');
  if (tx && window.MutationObserver) {
    var tm; new MutationObserver(function () { clearTimeout(tm); tm = setTimeout(function () { analyze(tx.innerText); }, 400); }).observe(tx, { childList: true, subtree: true, characterData: true });
  }
  $('ip-paste-go').addEventListener('click', function () { analyze(src.value); if (!box.hidden) box.scrollIntoView({ behavior: 'smooth', block: 'start' }); used('paste'); });
  $('ip-rem').addEventListener('input', function (e) {
    var li = e.target.closest('li[data-i]'), f = e.target.getAttribute('data-f'); if (li && f) reminders[+li.getAttribute('data-i')][f] = e.target.value;
  });
  $('ip-rem').addEventListener('click', function (e) {
    var li = e.target.closest('li[data-i]'); if (!li) return; var i = +li.getAttribute('data-i');
    if (e.target.closest('[data-one]')) { download([reminders[i]]); used('ics'); }
    else if (e.target.closest('[data-g]')) { e.target.closest('[data-g]').href = gcal(reminders[i]); used('gcal'); }
    else if (e.target.closest('[data-del]')) { reminders.splice(i, 1); drawRem(); }
  });
  $('ip-rem-add').addEventListener('click', function () {
    var d = new Date(); d.setDate(d.getDate() + 1); reminders.push({ title: '', date: ymd(d), time: '09:00' }); drawRem();
    var last = $('ipr-t' + (reminders.length - 1)); if (last) last.focus();
  });
  $('ip-rem-all').addEventListener('click', function () { download(reminders); used('ics_all'); });
  function sumText() { return 'סיכום השיחה:\n' + Array.prototype.map.call($('ip-sum-list').querySelectorAll('li'), function (li) { return '• ' + li.textContent; }).join('\n'); }
  $('ip-sum-copy').addEventListener('click', function () {
    var b = this; (navigator.clipboard ? navigator.clipboard.writeText(sumText()) : Promise.reject()).then(function () { b.textContent = '✓ הועתק'; setTimeout(function () { b.textContent = 'להעתיק את הסיכום'; }, 1800); }).catch(function () {});
    used('copy');
  });
  $('ip-sum-wa').addEventListener('click', function () { this.href = 'https://wa.me/?text=' + encodeURIComponent(sumText()); used('wa'); });
  window.__ipSicha = { summarize: summarize, findDates: findDates, ics: ics };
})();
