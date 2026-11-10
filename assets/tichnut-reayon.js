// הכנה לראיון טכני: סימון נושאים ("מוכן"), פס התקדמות, וסינון "רק מה שנשאר". נשמר בטלפון.
(function () {
  var T = window.TICHNUT, KEY = 'tichnut_reayon', $ = function (id) { return document.getElementById(id); };
  var st = T.load(KEY, { done: {}, left: false });
  function prog() {
    var all = document.querySelectorAll('input[data-k]'), n = 0;
    [].forEach.call(all, function (c) {
      c.checked = !!st.done[c.getAttribute('data-k')]; if (c.checked) n++;
      var card = c.closest('.rt-card'); card.classList.toggle('done', c.checked); card.hidden = st.left && c.checked;
    });
    $('rt-bar').style.width = (n / all.length * 100) + '%';
    $('rt-cnt').textContent = n + ' מתוך ' + all.length + ' נושאים' + (n === all.length ? ' – אתם מוכנים! 💪' : '');
    $('rt-left').checked = st.left;
    T.wa($('rt-wa'), 'מתכונן לראיון טכני: סימנתי ' + n + ' מתוך ' + all.length + ' נושאים.\nhttps://hakelim.com/kelim/tichnut/reayon-tech/');
    T.save(KEY, st);
  }
  document.addEventListener('change', function (e) {
    var c = e.target.closest('input[data-k]');
    if (c) { if (c.checked) st.done[c.getAttribute('data-k')] = 1; else delete st.done[c.getAttribute('data-k')]; prog(); if (c.checked) T.used('tichnut_reayon', 'done'); return; }
    if (e.target.id === 'rt-left') { st.left = e.target.checked; prog(); }
  });
  $('rt-wa').addEventListener('click', function () { T.used('tichnut_reayon', 'wa'); });
  $('rt-print').addEventListener('click', function () { T.used('tichnut_reayon', 'print'); window.print(); });
  $('rt-reset').addEventListener('click', function () { st.done = {}; st.left = false; prog(); });
  prog();
})();
