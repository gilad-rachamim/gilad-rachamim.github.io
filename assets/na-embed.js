/* כפתור "סיכום השיעור" לשילוב בדפי השיעור של אתר כולל נחלת אבות (23.11.2026).
   שילוב: שורה אחת בתבנית האתר:  <script src="https://hakelim.com/assets/na-embed.js" defer></script>
   (ב-Next.js: <Script src="https://hakelim.com/assets/na-embed.js" strategy="afterInteractive" /> ב-layout.)
   אפשר לקבוע את מקום הכפתור עם <div id="hakelim-summary"></div>; בלעדיו הכפתור נכנס מתחת לכותרת הראשית.
   האתר מחליף דפים בלי טעינה מחדש, לכן הסקריפט בודק כל שנייה: כתובת השיעור השתנתה או שהכפתור הוסר – בונה מחדש.
   הכפתור שולח את כתובת הדף לשרת התמלול, מחכה, ומציג את הסיכום (פתיחה, PDF, Word, הדפסה) בלי לצאת מהאתר.
   יש בו קרדיט עם קישור חי ל-hakelim.com. */
(function () {
  'use strict';
  if (window.__hakelimSummary) return;
  window.__hakelimSummary = 1;
  var APIS = ['https://yt.hakelim.com', 'https://kelim-yutub.gilad4049.workers.dev'];
  var API = APIS[0];
  var cur = '';          // כתובת השיעור שהכפתור מציג עכשיו
  var box = null;        // התיבה שבדף
  var run = 0;           // מספר רץ: תשובה של שיעור קודם לא נוגעת בשיעור הנוכחי
  var timer = null;
  var waited = 0;
  var known = {};        // מה שכבר ידוע על כל שיעור (מזהה תהליך / סיכום מוכן)

  function lessonUrl() {
    var p = location.pathname.replace(/\/+$/, '');
    return /\/lesson\/[^/]+$/.test(p) ? location.origin + p : '';
  }
  function call(path, opts, n) {
    n = n || 0;
    return fetch(API + path, opts).then(function (r) { return r.json(); }).catch(function (e) {
      if (n >= APIS.length * 2 - 1) throw e;
      API = APIS[(APIS.indexOf(API) + 1) % APIS.length];
      return new Promise(function (ok) { setTimeout(ok, n < APIS.length - 1 ? 0 : 1500); }).then(function () { return call(path, opts, n + 1); });
    });
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }

  function addCss() {
    if (document.getElementById('hakelim-summary-css')) return;
    var css = el('style'); css.id = 'hakelim-summary-css';
    css.textContent =
      '#hakelim-summary{direction:rtl;text-align:right;font-family:inherit;font-size:16px;margin:1.2rem 0;padding:1rem 1.2rem;border:2px solid #c9a227;border-radius:12px;background:#fffdf6;color:#1c2f4a;max-width:640px;box-sizing:border-box}' +
      '#hakelim-summary [hidden]{display:none!important}' +
      '#hakelim-summary .hk-t{margin:0 0 .4rem;font-size:1.15rem;font-weight:700;color:#1c2f4a}' +
      '#hakelim-summary p{margin:.3rem 0;line-height:1.6;color:#1c2f4a}' +
      '#hakelim-summary .hk-btn{display:inline-block;margin:.25rem 0 .25rem .5rem;padding:.65rem 1.2rem;border-radius:8px;border:2px solid #1c2f4a;background:#fff;color:#1c2f4a;font:inherit;font-weight:700;line-height:1.3;cursor:pointer;text-decoration:none}' +
      '#hakelim-summary .hk-gold{background:#c9a227;border-color:#c9a227;color:#1c2f4a;font-size:1.05rem}' +
      '#hakelim-summary .hk-btn:focus-visible{outline:3px solid #1c2f4a;outline-offset:2px}' +
      '#hakelim-summary .hk-btn:disabled{opacity:.6;cursor:wait}' +
      '#hakelim-summary .hk-bar{height:8px;background:#eadfb8;border-radius:4px;overflow:hidden;margin:.5rem 0}' +
      '#hakelim-summary .hk-bar i{display:block;height:100%;width:5%;background:#1c2f4a;transition:width .6s}' +
      '#hakelim-summary .hk-credit{font-size:.82rem;color:#555;margin-top:.6rem}' +
      '#hakelim-summary .hk-credit a{color:#1c2f4a;font-weight:700;text-decoration:underline}';
    document.head.appendChild(css);
  }

  // מוצא או יוצר את התיבה. מחזיר null כשהדף עוד לא מוכן (אין כותרת) – ננסה שוב בעוד שנייה.
  function place() {
    var b = document.getElementById('hakelim-summary');
    if (b) return b;
    var h = document.querySelector('main h1') || document.querySelector('h1');
    var host = h && h.parentNode;
    if (!host) {
      if (++waited < 8) return null;
      host = document.querySelector('main') || document.body; h = null;
    }
    b = el('div'); b.id = 'hakelim-summary';
    host.insertBefore(b, h ? h.nextSibling : null);
    return b;
  }

  function build(lesson) {
    var b = place();
    if (!b) return;
    waited = 0; addCss();
    clearTimeout(timer);
    var my = ++run;
    cur = lesson; box = b;
    b.textContent = ''; b.setAttribute('data-hk', lesson);
    var st = known[lesson] || (known[lesson] = {});
    var info = el('p', '', 'סיכום קצר ומסודר של השיעור: פתיחה, כותרות משנה, מקורות ומסר למעשה. מוכן בלחיצה אחת.');
    var go = el('button', 'hk-btn hk-gold', 'לקבל את סיכום השיעור'); go.type = 'button';
    var area = el('div'); area.setAttribute('aria-live', 'polite');
    var credit = el('p', 'hk-credit');
    credit.appendChild(document.createTextNode('הסיכום נוצר אוטומטית בכלי התמלול של '));
    var a = el('a', '', 'hakelim.com'); a.href = 'https://hakelim.com/kelim/tamlul/'; a.target = '_blank'; credit.appendChild(a);
    credit.appendChild(document.createTextNode(', בחינם.'));
    [el('p', 'hk-t', 'סיכום השיעור'), info, go, area, credit].forEach(function (x) { b.appendChild(x); });

    function live() { return my === run; }
    function busy(text, pct) {
      go.hidden = true;
      area.textContent = '';
      area.appendChild(el('p', '', text));
      var bar = el('div', 'hk-bar'); var i = el('i'); i.style.width = pct + '%'; bar.appendChild(i); area.appendChild(bar);
    }
    function link(text, href, gold, dl) {
      var x = el('a', 'hk-btn' + (gold ? ' hk-gold' : ''), text); x.href = href; if (!dl) { x.target = '_blank'; x.rel = 'noopener'; } return x;
    }
    function fail(text) { st.id = ''; area.textContent = ''; area.appendChild(el('p', '', text)); go.disabled = false; go.hidden = false; }
    function done(j) {
      st.done = j; go.hidden = true; area.textContent = '';
      if (!j.sum) {
        info.textContent = 'השיעור תומלל, אבל הסיכום לא נוצר. אפשר לקבל את התמלול המלא:';
        if (j.pdf) area.appendChild(link('התמלול המלא (PDF)', API + j.pdf + '?view=1', true));
        return;
      }
      info.textContent = 'הסיכום מוכן.';
      area.appendChild(link('לפתוח את הסיכום', API + j.sum + '?view=1', true));
      area.appendChild(link('הורדה כ-PDF', API + j.sum, false, true));
      if (j.sumdocx) area.appendChild(link('הורדה כ-Word', API + j.sumdocx, false, true));
      if (j.sumbw) area.appendChild(link('להדפסה בשחור-לבן', API + j.sumbw + '?view=1'));
    }
    function show(j) {       // תהליך קיים: מוכן, בעבודה או נכשל
      if (j.status === 'done') { done(j); return true; }
      if (j.status === 'queued' || j.status === 'running') { st.id = j.id; progress(j); return true; }
      return false;
    }
    function progress(j) {
      var t = j.status === 'queued' ? (j.pos > 1 ? 'ממתין בתור, מקום ' + j.pos : 'השרת מתעורר, זה מתחיל בעוד רגע') : (j.msg || 'מעבד את השיעור');
      if (j.shabbat) t = 'בשבת הכלי נח. הבקשה נשמרה והסיכום יהיה מוכן במוצאי שבת';
      else t += '. זה לוקח כמה דקות; אפשר להשאיר את הדף פתוח או לחזור אחר כך';
      busy(t, j.status === 'queued' ? 3 : Math.max(5, j.pct || 5));
      clearTimeout(timer);
      timer = setTimeout(poll, document.hidden ? 15000 : 5000);
    }
    function poll() {
      if (!live() || !st.id) return;
      call('/status/' + st.id).then(function (j) {
        if (!live()) return;
        if (!j.ok) { fail('התהליך לא נמצא. אפשר ללחוץ שוב.'); return; }
        if (j.status === 'failed') { fail(j.msg || 'משהו השתבש. אפשר ללחוץ שוב.'); return; }
        show(j);
      }).catch(function () { if (live()) { clearTimeout(timer); timer = setTimeout(poll, 10000); } });
    }
    go.addEventListener('click', function () {
      go.disabled = true; busy('שולח את השיעור לעיבוד…', 3);
      call('/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: lesson, by: '', times: false }) })
        .then(function (j) {
          if (!live()) return;
          if (!j.ok || !j.id) { fail(j.msg || 'משהו השתבש. אפשר ללחוץ שוב.'); return; }
          st.id = j.id; poll();
        })
        .catch(function () { if (live()) fail('אין חיבור לשרת כרגע. אפשר ללחוץ שוב בעוד רגע.'); });
    });

    if (st.done) { done(st.done); return; }
    if (st.id) { busy('בודק איפה זה עומד…', 5); poll(); return; }
    // שיעור שכבר סוכם (או שמישהו אחר כבר ביקש) מוצג מיד, בלי לחיצה
    call('/lookup?url=' + encodeURIComponent(lesson)).then(function (j) { if (live() && j && j.ok && !st.id) show(j); }).catch(function () { /* נשאר הכפתור */ });
  }

  function tick() {
    try {
      var l = lessonUrl();
      if (!l) {
        if (cur) { cur = ''; run++; clearTimeout(timer); var old = document.getElementById('hakelim-summary'); if (old) old.textContent = ''; }
        return;
      }
      var b = document.getElementById('hakelim-summary');
      if (l !== cur || !b || b !== box || b.getAttribute('data-hk') !== l || !b.firstChild) build(l);
    } catch (e) { /* הדף של האתר חשוב יותר מהכפתור */ }
  }
  function start() { tick(); setInterval(tick, 1000); }
  // מחכים שהאתר יסיים לעלות, כדי לא להפריע לו לבנות את הדף
  if (document.readyState === 'complete') setTimeout(start, 300);
  else window.addEventListener('load', function () { setTimeout(start, 300); });
})();
