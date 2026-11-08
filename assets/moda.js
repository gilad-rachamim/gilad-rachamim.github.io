// מודעה לאירוע: טופס → מודעה ביחס 4:5, תמונה (html-to-image) או הדפסה A4. נשמר בטלפון (localStorage).
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('md-form'), poster = $('mo-poster');
  if (!form || !poster) return;
  var KEY = 'kelim-moda', F = ['tag', 'title', 'sub', 'when', 'where', 'more', 'contact'];
  // בכניסה הראשונה: דוגמה מלאה, כדי שיהיה ברור איך זה נראה. מוחקים וכותבים במקום.
  var st = { theme: 'layla', tag: 'הזמנה לערב מיוחד', title: 'ערב שירה וסיפורים', sub: 'עם חברים, גיטרה ומילים טובות', when: 'יום חמישי, 20:30', where: 'המתנ״ס, רחוב הרימון 5', more: 'כיבוד קל\nהכניסה חופשית\nמתאים לכל המשפחה', contact: 'לפרטים: 050-0000000' };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv) Object.keys(sv).forEach(function (k) { st[k] = sv[k]; }); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function v(k) { return String(st[k] || '').trim(); }
  function fill() {
    F.forEach(function (k) { form.querySelector('[name=' + k + ']').value = st[k] || ''; });
    form.querySelectorAll('[name=theme]').forEach(function (r) { r.checked = r.value === st.theme; });
  }
  function draw() {
    var more = v('more').split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
    poster.className = 'mo-poster t-' + st.theme;
    poster.innerHTML = (v('tag') ? '<div class="tg">' + esc(v('tag')) + '</div>' : '') +
      '<h1>' + esc(v('title') || 'כותרת האירוע') + '</h1>' +
      (v('sub') ? '<div class="sb">' + esc(v('sub')) + '</div>' : '') + '<div class="ln"></div>' +
      '<div class="wh">' + esc(v('when') || 'מתי?') + '</div>' + '<div class="wr">' + esc(v('where') || 'איפה?') + '</div>' +
      (more.length ? '<ul>' + more.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') +
      (v('contact') ? '<div class="ct">' + esc(v('contact')) + '</div>' : '');
    fit();
  }
  // גודל הגופן לפי רוחב המודעה, ואם הטקסט ארוך מדי – מקטינים עד שנכנס
  function fit() {
    var fs = (poster.clientWidth || 400) / 22; poster.style.fontSize = fs + 'px';
    for (var i = 0; i < 12 && poster.scrollHeight > poster.clientHeight + 1; i++) { fs *= 0.93; poster.style.fontSize = fs + 'px'; }
  }
  form.addEventListener('input', function () {
    F.forEach(function (k) { st[k] = form.querySelector('[name=' + k + ']').value; });
    var r = form.querySelector('[name=theme]:checked'); if (r) st.theme = r.value;
    save(); draw();
  });
  window.addEventListener('resize', fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  function used(how) { if (window.toolUsed) window.toolUsed('moda', { how: how, theme: st.theme }); }
  $('mo-print').addEventListener('click', function () { used('print'); window.print(); });
  window.addEventListener('afterprint', fit);
  $('mo-img').addEventListener('click', function () {
    var btn = this, label = btn.innerHTML;
    if (!window.htmlToImage) { btn.textContent = 'רגע, עוד נטען… נסו שוב'; setTimeout(function () { btn.innerHTML = label; }, 1500); return; }
    btn.textContent = 'מכין תמונה…';
    window.htmlToImage.toBlob(poster, { pixelRatio: 1080 / (poster.clientWidth || 400) }).then(function (b) {
      var name = (v('title') || 'מודעה') + '.png', f = new File([b], name, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [f] })) navigator.share({ files: [f] }).catch(function () {});
      else { var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
      used('image'); btn.innerHTML = label;
    }).catch(function () { btn.textContent = 'לא הצלחתי. אפשר להדפיס ולשמור PDF'; });
  });
  fill(); draw();
})();
