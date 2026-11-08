// שיעור לעלון (/kodesh/alon/): הממשק. העימוד עצמו ב-alon.js.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('al-form'), list = $('al-items'), view = $('al-view');
  if (!form || !window.KAlon) return;
  var KEY = 'kodesh-alon', FIELDS = ['mode', 'theme', 'btitle', 'name', 'par', 'rav', 'issue', 'ded', 'foot', 'cols', 'big'];
  var st = {};
  try { st = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) {}
  if (!Array.isArray(st.items) || !st.items.length) st.items = [{ title: '', body: '' }];
  function f(n) { return form.querySelector('[name=' + n + ']'); }
  FIELDS.forEach(function (n) { if (st[n] != null && f(n)) f(n).value = st[n]; });

  // טקסט שהגיע מהתמלול או מ"שבוע של תוכן"
  var note = '';
  try {
    var inc = JSON.parse(localStorage.getItem('kodesh-alon-in') || 'null');
    if (inc && inc.body) {
      localStorage.removeItem('kodesh-alon-in');
      var it = { title: inc.title || '', body: inc.body };
      if (f('mode').value === 'sefer') st.items.push(it); else st.items[0] = it;
      if (inc.rav && !f('rav').value) f('rav').value = inc.rav;
      if (inc.par && !f('par').value) f('par').value = inc.par;
      note = inc.from === 'tamlul' ? 'הטקסט מהתמלול נכנס. עכשיו מסמנים כותרות (#) וציטוט (>), ובודקים שאין טעויות תמלול.' : 'הטקסט נכנס לעלון.';
    }
  } catch (e) {}
  if (/[?&]dugma=1/.test(location.search)) demo(true);

  function demo(quiet) {
    var D = KAlon.DEMO;
    st.items[0] = { title: D.title, body: D.body };
    [['rav', D.rav], ['name', D.name], ['par', D.par], ['ded', D.ded], ['foot', D.foot], ['issue', '12']].forEach(function (x) { f(x[0]).value = x[1]; });
    if (!quiet) { drawItems(); upd(); }
  }
  $('al-demo').addEventListener('click', function (e) { e.preventDefault(); f('mode').value = 'alon'; demo(); used('demo'); });

  // ---------- רשימת השיעורים ----------
  var lastTa = null;
  function drawItems() {
    var sefer = f('mode').value === 'sefer';
    list.innerHTML = '';
    (sefer ? st.items : st.items.slice(0, 1)).forEach(function (it, i) {
      var box = document.createElement(sefer ? 'fieldset' : 'div');
      if (sefer) { box.className = 'al-item'; box.innerHTML = '<legend>שיעור ' + (i + 1) + '</legend>'; }
      var id = 'al-t' + i;
      box.insertAdjacentHTML('beforeend',
        '<div class="field"><label for="' + id + '">כותרת השיעור</label><input id="' + id + '" type="text" maxlength="70" data-i="' + i + '" data-k="title" placeholder="לך לך – ללכת אל עצמך"></div>' +
        '<div class="field"><label for="' + id + 'b">השיעור</label><textarea class="al-body" id="' + id + 'b" data-i="' + i + '" data-k="body" maxlength="40000" placeholder="מדביקים כאן את השיעור או את התמלול. כל שורה היא פסקה."></textarea></div>');
      if (sefer) {
        box.insertAdjacentHTML('beforeend', '<div class="al-item-acts"><button class="btn btn-line btn-sm" type="button" data-act="up" data-i="' + i + '">למעלה</button><button class="btn btn-line btn-sm" type="button" data-act="down" data-i="' + i + '">למטה</button><button class="btn btn-line btn-sm" type="button" data-act="del" data-i="' + i + '">להסיר</button></div>');
      }
      list.appendChild(box);
      box.querySelector('input').value = it.title || '';
      box.querySelector('textarea').value = it.body || '';
    });
    [].forEach.call(form.querySelectorAll('[data-for]'), function (e) { e.hidden = e.dataset.for !== (sefer ? 'sefer' : 'alon'); });
  }
  list.addEventListener('input', function (e) {
    var t = e.target; if (t.dataset.i == null) return;
    st.items[+t.dataset.i][t.dataset.k] = t.value;
  });
  list.addEventListener('focusin', function (e) { if (e.target.tagName === 'TEXTAREA') lastTa = e.target; });
  list.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b) return;
    var i = +b.dataset.i, a = b.dataset.act, L = st.items;
    if (a === 'up' && i > 0) L.splice(i - 1, 0, L.splice(i, 1)[0]);
    if (a === 'down' && i < L.length - 1) L.splice(i + 1, 0, L.splice(i, 1)[0]);
    if (a === 'del') { if (!confirm('להסיר את השיעור הזה מהחוברת?')) return; L.splice(i, 1); if (!L.length) L.push({ title: '', body: '' }); }
    drawItems(); upd();
  });
  $('al-add').addEventListener('click', function () { st.items.push({ title: '', body: '' }); drawItems(); upd(); var t = list.querySelectorAll('input'); t[t.length - 1].focus(); });

  // ---------- כפתורי הסימון ----------
  form.querySelector('.al-marks').addEventListener('click', function (e) {
    var b = e.target.closest('[data-mark]'); if (!b) return;
    var ta = lastTa || list.querySelector('textarea'); if (!ta) return;
    var m = b.dataset.mark, v = ta.value, s = ta.selectionStart, en = ta.selectionEnd;
    if (m === '**') {
      if (s === en) { ta.focus(); return; }
      ta.value = v.slice(0, s) + '**' + v.slice(s, en) + '**' + v.slice(en);
      ta.setSelectionRange(s, en + 4);
    } else {
      var ls = v.lastIndexOf('\n', s - 1) + 1, le = v.indexOf('\n', s); if (le < 0) le = v.length;
      var line = v.slice(ls, le), bare = KAlon.clean(line), has = /^\s*(#{1,3}|>)/.test(line) && line.trim().charAt(0) === m;
      var nl = has ? bare : m + ' ' + bare;
      ta.value = v.slice(0, ls) + nl + v.slice(le);
      ta.setSelectionRange(ls + nl.length, ls + nl.length);
    }
    ta.focus();
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  });

  // ---------- לוגו ----------
  function showLogo() { var im = $('al-logo-img'); im.hidden = !st.logo; $('al-logo-x').hidden = !st.logo; if (st.logo) im.src = st.logo; }
  $('al-logo').addEventListener('change', function () {
    var file = this.files && this.files[0]; if (!file) return;
    var im = new Image(), u = URL.createObjectURL(file);
    im.onload = function () {
      var k = Math.min(1, 360 / Math.max(im.width, im.height)), c = document.createElement('canvas');
      c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      st.logo = c.toDataURL('image/png'); URL.revokeObjectURL(u); showLogo(); upd();
    };
    im.src = u;
  });
  $('al-logo-x').addEventListener('click', function () { st.logo = ''; $('al-logo').value = ''; showLogo(); upd(); });

  // ---------- עימוד, שמירה ותצוגה ----------
  function data() {
    var d = { items: st.items, logo: st.logo || '' };
    FIELDS.forEach(function (n) { d[n] = f(n) ? f(n).value.trim() : ''; });
    d.cols = +d.cols || 2; d.big = !!d.big;
    return d;
  }
  var tmr, ready = false;
  function draw() {
    if (!ready) return;
    var d = data(), r = KAlon.render(d);
    KAlon.preview(view);
    var info = r.pages + (r.pages === 1 ? ' עמוד A4' : ' עמודי A4');
    if (d.mode === 'sefer') info += ' · ' + r.toc.length + ' שיעורים · שער ותוכן עניינים';
    else if (r.pages > 1) info += ' · בעלון של דף אחד (שני צדדים) נכנסים עד שני עמודים';
    $('al-info').textContent = (note ? note + ' ' : '') + info;
  }
  function upd() {
    FIELDS.forEach(function (n) { if (f(n)) st[n] = f(n).value; });
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {
      try { var c = JSON.parse(JSON.stringify(st)); c.logo = ''; localStorage.setItem(KEY, JSON.stringify(c)); } catch (e2) {}
    }
    clearTimeout(tmr); tmr = setTimeout(draw, 250);
  }
  form.addEventListener('input', upd);
  form.addEventListener('change', function (e) { if (e.target.name === 'mode') drawItems(); upd(); });

  $('al-printbtn').addEventListener('click', function () { used('print'); KAlon.print(data()); });
  $('al-shavua').addEventListener('click', function () {
    var it = st.items[0] || {};
    try { localStorage.setItem('kodesh-shavua-in', JSON.stringify({ title: it.title, body: it.body, rav: f('rav').value, par: f('par').value })); } catch (e) {}
    used('to_shavua');
    location.href = '/kodesh/shavua/';
  });
  function used(how) {
    if (window.toolUsed) window.toolUsed('alon', { how: how, mode: f('mode').value, theme: f('theme').value });
  }

  drawItems(); showLogo();
  KAlon.fontsReady().then(function () {
    ready = true; draw();
    // ?pdf=1: הדף מוכן ל"הדפסה" ישירה (למשל שמירה כ-PDF מכרום בלי ללחוץ על כפתור)
    if (/[?&]pdf=1/.test(location.search)) document.documentElement.classList.add('al-printing');
  });
  if (note || /dugma=1/.test(location.search)) upd();
})();
