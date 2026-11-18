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

  /* ---------- 2–4. summary, dates, calendar: shared in /assets/sicha-core.js ---------- */
  var C = window.SichaCore;
  if (!C) return;
  var summarize = C.summarize, findDates = C.findDates, gcal = C.gcal;
  var CAL = { prodid: 'iphone-sicha', desc: 'מתוך שיחה מוקלטת. hakelim.com/kelim/iphone/hakltat-sichot/' };
  function ics(items) { return C.ics(items, CAL); }
  function download(items) { C.download(items, CAL); }
  var ymd = C.ymd;

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
