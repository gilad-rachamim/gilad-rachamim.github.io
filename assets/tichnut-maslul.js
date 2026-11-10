// מסלולי לימוד: מעבר בין שני מסלולים, סימון "סיימתי" לכל שלב (נשמר בטלפון), ופס התקדמות.
(function () {
  var T = window.TICHNUT, KEY = 'tichnut_maslul', $ = function (id) { return document.getElementById(id); };
  var st = T.load(KEY, { tab: 'ai', done: {} });
  function tab(t) {
    st.tab = t;
    [].forEach.call(document.querySelectorAll('.ms-tabs button'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-t') === t); });
    [].forEach.call(document.querySelectorAll('.ms-track'), function (s) { s.hidden = s.id !== 'ms-' + t; });
    prog(); T.save(KEY, st);
  }
  function prog() {
    ['ai', 'eng'].forEach(function (t) {
      var all = document.querySelectorAll('#ms-' + t + ' input[data-step]'), n = 0;
      [].forEach.call(all, function (c) { c.checked = !!st.done[c.getAttribute('data-step')]; if (c.checked) n++; c.closest('.ms-step').classList.toggle('done', c.checked); });
      var bar = $('ms-bar-' + t); if (bar) { bar.style.width = (all.length ? n / all.length * 100 : 0) + '%'; }
      var l = $('ms-cnt-' + t); if (l) l.textContent = n + ' מתוך ' + all.length + ' שלבים' + (n === all.length && n ? ' – כל הכבוד! 🎉' : '');
    });
  }
  document.querySelector('.ms-tabs').addEventListener('click', function (e) { var b = e.target.closest('button[data-t]'); if (b) { tab(b.getAttribute('data-t')); T.used('tichnut_maslul', 'tab_' + st.tab); } });
  document.addEventListener('change', function (e) {
    var c = e.target.closest('input[data-step]'); if (!c) return;
    if (c.checked) st.done[c.getAttribute('data-step')] = 1; else delete st.done[c.getAttribute('data-step')];
    prog(); T.save(KEY, st); if (c.checked) T.used('tichnut_maslul', 'done');
  });
  document.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-copy]'); if (!b) return;
    try { navigator.clipboard.writeText(b.parentNode.querySelector('pre').textContent); b.textContent = 'הועתק ✓'; setTimeout(function () { b.textContent = 'להעתיק'; }, 1500); } catch (x) {}
    T.used('tichnut_maslul', 'copy');
  });
  document.getElementById('ms-print').addEventListener('click', function () { T.used('tichnut_maslul', 'print'); window.print(); });
  var h = location.hash.replace('#', ''); if (h === 'eng' || h === 'ai') st.tab = h;
  tab(st.tab);
})();
