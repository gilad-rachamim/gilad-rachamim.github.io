/* ספירת מילים ותווים: הטקסט נשאר בדפדפן ולא נשלח לשום מקום */
(function () {
  var ta = document.getElementById('sm-txt'); if (!ta) return;
  function $(i) { return document.getElementById(i); }
  function fmt(n) { return n.toLocaleString('he-IL'); }
  function run() {
    var t = ta.value, tr = t.trim();
    var words = tr ? tr.split(/\s+/).length : 0;
    var chars = Array.from(t).length, nosp = Array.from(t.replace(/\s/g, '')).length;
    var sent = tr ? (tr.match(/[^.!?…\n]+[.!?…]*/g) || []).filter(function (s) { return s.trim(); }).length : 0;
    var paras = tr ? tr.split(/\n\s*\n|\n/).filter(function (s) { return s.trim(); }).length : 0;
    $('sm-w').textContent = fmt(words); $('sm-c').textContent = fmt(chars); $('sm-n').textContent = fmt(nosp);
    $('sm-s').textContent = fmt(sent); $('sm-p').textContent = fmt(paras);
    var sec = Math.round(words / 200 * 60), sp = Math.round(words / 130 * 60);
    function tm(s) { return s < 60 ? s + ' שניות' : Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2) + ' דקות'; }
    $('sm-r').textContent = words ? tm(sec) : '0'; $('sm-d').textContent = words ? tm(sp) : '0';
    [].forEach.call(document.querySelectorAll('#sm-lim tr[data-max]'), function (r) {
      var max = +r.dataset.max, c = r.querySelector('.sm-st');
      c.textContent = chars <= max ? '✓ נשארו ' + fmt(max - chars) : '✗ חריגה של ' + fmt(chars - max);
      c.style.color = chars <= max ? '' : '#b3261e';
    });
    try { localStorage.setItem('kelim_sfirat_milim', t.slice(0, 20000)); } catch (e) {}
  }
  try { var sv = localStorage.getItem('kelim_sfirat_milim'); if (sv) ta.value = sv; } catch (e) {}
  ta.addEventListener('input', run);
  $('sm-clear').addEventListener('click', function () { ta.value = ''; run(); ta.focus(); });
  $('sm-paste').addEventListener('click', function () {
    if (navigator.clipboard && navigator.clipboard.readText) navigator.clipboard.readText().then(function (x) { ta.value = x; run(); }).catch(function () { ta.focus(); });
    else ta.focus();
  });
  run();
})();
