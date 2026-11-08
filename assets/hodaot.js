// T6 – הודעות מוכנות לחיילים (כלי קודש). שם היחידה והחתימה נכנסים לכל ההודעות, ונשמרים בטלפון.
// ההעתקה והווטסאפ – nusach.js (לוקח את הטקסט מה-<pre>).
(function () {
  'use strict';
  var form = document.getElementById('hd-form');
  if (!form) return;
  var KEY = 'kodesh-hodaot', st = { unit: '', sig: '' };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv) { st.unit = sv.unit || ''; st.sig = sv.sig || ''; } } catch (e) {}
  var pres = [].slice.call(document.querySelectorAll('.nusach pre'));
  pres.forEach(function (p) { p.dataset.t = p.textContent; });
  function draw() {
    pres.forEach(function (p) {
      var t = p.dataset.t;
      t = st.unit ? t.split('[היחידה]').join(st.unit) : t.split('ל[היחידה]').join('לחיילים').split('[היחידה]').join('החיילים');
      t = st.sig ? t.split('[חתימה]').join('\n' + st.sig) : t.replace(/\s*\[חתימה\]/g, '');
      p.textContent = t;
    });
  }
  form.elements.unit.value = st.unit; form.elements.sig.value = st.sig;
  form.addEventListener('input', function () {
    st.unit = form.elements.unit.value.trim(); st.sig = form.elements.sig.value.trim();
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {}
    draw();
  });
  draw();
})();
