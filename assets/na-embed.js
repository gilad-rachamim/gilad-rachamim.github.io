/* כפתור "סיכום השיעור" לשילוב בדפי השיעור של אתר כולל נחלת אבות (23.11.2026).
   שילוב: שורה אחת בדף השיעור:  <script src="https://hakelim.com/assets/na-embed.js" defer></script>
   אפשר גם לקבוע את מקום הכפתור עם <div id="hakelim-summary"></div>; בלעדיו הכפתור נכנס מתחת לכותרת הראשית.
   הכפתור שולח את כתובת הדף הנוכחי לשרת התמלול, מחכה, ומציג את הסיכום (פתיחה, PDF, Word, הדפסה) בלי לצאת מהאתר.
   יש בו קרדיט עם קישור חי ל-hakelim.com. */
(function () {
  'use strict';
  if (window.__hakelimSummary) return;
  window.__hakelimSummary = 1;
  var APIS = ['https://yt.hakelim.com', 'https://kelim-yutub.gilad4049.workers.dev'];
  var API = APIS[0];
  var LESSON = location.origin + location.pathname.replace(/\/+$/, '');
  if (!/\/lesson\/[^/]+$/.test(LESSON)) return;      // רק בדפי שיעור

  function call(path, opts, n) {
    n = n || 0;
    return fetch(API + path, opts).then(function (r) { return r.json(); }).catch(function (e) {
      if (n >= APIS.length * 2 - 1) throw e;
      API = APIS[(APIS.indexOf(API) + 1) % APIS.length];
      return new Promise(function (ok) { setTimeout(ok, n < APIS.length - 1 ? 0 : 1500); }).then(function () { return call(path, opts, n + 1); });
    });
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }

  var css = el('style');
  css.textContent =
    '#hakelim-summary{direction:rtl;font-family:inherit;margin:1.2rem 0;padding:1rem 1.2rem;border:2px solid #c9a227;border-radius:12px;background:#fffdf6;color:#1c2f4a;max-width:640px}' +
    '#hakelim-summary [hidden]{display:none!important}' +
    '#hakelim-summary h3{margin:0 0 .4rem;font-size:1.15rem}' +
    '#hakelim-summary p{margin:.3rem 0;line-height:1.6}' +
    '#hakelim-summary .hk-btn{display:inline-block;margin:.25rem 0 .25rem .5rem;padding:.65rem 1.2rem;border-radius:8px;border:2px solid #1c2f4a;background:#fff;color:#1c2f4a;font:inherit;font-weight:700;cursor:pointer;text-decoration:none}' +
    '#hakelim-summary .hk-gold{background:#c9a227;border-color:#c9a227;color:#1c2f4a;font-size:1.05rem}' +
    '#hakelim-summary .hk-btn:disabled{opacity:.6;cursor:wait}' +
    '#hakelim-summary .hk-bar{height:8px;background:#eadfb8;border-radius:4px;overflow:hidden;margin:.5rem 0}' +
    '#hakelim-summary .hk-bar i{display:block;height:100%;width:5%;background:#1c2f4a;transition:width .6s}' +
    '#hakelim-summary .hk-credit{font-size:.82rem;color:#555;margin-top:.6rem}' +
    '#hakelim-summary .hk-credit a{color:#1c2f4a;font-weight:700}';
  document.head.appendChild(css);

  var box = document.getElementById('hakelim-summary');
  if (!box) {
    box = el('div'); box.id = 'hakelim-summary';
    var h = document.querySelector('h1');
    if (h && h.parentNode) h.parentNode.insertBefore(box, h.nextSibling); else document.body.insertBefore(box, document.body.firstChild);
  }
  var title = el('h3', '', 'סיכום השיעור');
  var info = el('p', '', 'סיכום קצר ומסודר של השיעור: פתיחה, כותרות משנה, מקורות ומסר למעשה. מוכן בלחיצה אחת.');
  var go = el('button', 'hk-btn hk-gold', 'לקבל את סיכום השיעור'); go.type = 'button';
  var area = el('div');
  var credit = el('p', 'hk-credit');
  credit.appendChild(document.createTextNode('הסיכום נוצר אוטומטית בכלי התמלול של '));
  var a = el('a', '', 'hakelim.com'); a.href = 'https://hakelim.com/kelim/tamlul/'; a.target = '_blank'; credit.appendChild(a);
  credit.appendChild(document.createTextNode(', בחינם.'));
  [title, info, go, area, credit].forEach(function (x) { box.appendChild(x); });

  var timer = null, started = 0;
  function busy(text, pct) {
    area.textContent = '';
    area.appendChild(el('p', '', text));
    var bar = el('div', 'hk-bar'); var i = el('i'); i.style.width = pct + '%'; bar.appendChild(i); area.appendChild(bar);
  }
  function link(text, href, gold, dl) {
    var x = el('a', 'hk-btn' + (gold ? ' hk-gold' : ''), text); x.href = href; if (!dl) { x.target = '_blank'; x.rel = 'noopener'; } return x;
  }
  function done(j) {
    go.hidden = true; info.textContent = 'הסיכום מוכן.';
    area.textContent = '';
    if (!j.sum) { area.appendChild(el('p', '', 'השיעור תומלל, אבל הסיכום לא נוצר. אפשר לקבל את התמלול המלא:')); area.appendChild(link('התמלול המלא (PDF)', API + j.pdf + '?view=1', true)); return; }
    area.appendChild(link('לפתוח את הסיכום', API + j.sum + '?view=1', true));
    area.appendChild(link('הורדה כ-PDF', API + j.sum, false, true));
    area.appendChild(link('הורדה כ-Word', API + j.sumdocx, false, true));
    if (j.sumbw) area.appendChild(link('להדפסה בשחור-לבן', API + j.sumbw + '?view=1'));
  }
  function poll(id) {
    clearTimeout(timer);
    call('/status/' + id).then(function (j) {
      if (!j.ok) { fail('התהליך לא נמצא. אפשר ללחוץ שוב.'); return; }
      if (j.status === 'done') { done(j); return; }
      if (j.status === 'failed') { fail(j.msg || 'משהו השתבש. אפשר ללחוץ שוב.'); return; }
      var t = j.status === 'queued' ? (j.pos > 1 ? 'ממתין בתור, מקום ' + j.pos : 'השרת מתעורר, זה מתחיל בעוד רגע') : (j.msg || 'מעבד את השיעור');
      if (j.shabbat) t = 'בשבת הכלי נח. הבקשה נשמרה והסיכום יהיה מוכן במוצאי שבת';
      else if (Date.now() - started > 4 * 60000) t += '. זה לוקח כמה דקות; אפשר להשאיר את הדף פתוח';
      busy(t, j.status === 'queued' ? 3 : Math.max(5, j.pct || 5));
      timer = setTimeout(function () { poll(id); }, document.hidden ? 15000 : 5000);
    }).catch(function () { timer = setTimeout(function () { poll(id); }, 10000); });
  }
  function fail(text) { area.textContent = ''; area.appendChild(el('p', '', text)); go.disabled = false; go.hidden = false; }

  go.addEventListener('click', function () {
    go.disabled = true; started = Date.now(); busy('שולח את השיעור לעיבוד…', 3);
    call('/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: LESSON, by: '', times: false }) })
      .then(function (j) {
        if (!j.ok) { fail(j.msg || 'משהו השתבש. אפשר ללחוץ שוב.'); return; }
        poll(j.id);
      })
      .catch(function () { fail('אין חיבור לשרת כרגע. אפשר ללחוץ שוב בעוד רגע.'); });
  });

  // אם השיעור כבר מוכן, הכפתור מציג את הסיכום מיד
  call('/lookup?url=' + encodeURIComponent(LESSON)).then(function (j) { if (j && j.status === 'done' && j.sum) done(j); }).catch(function () { /* נשאר הכפתור */ });
})();
