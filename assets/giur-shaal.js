/* "שאלה שלא מצאתי" בשו"ת לגרים – /kodesh/giur/shut/#shaal. השרת: tools/giur-shaal-worker.
   לבדיקה מקומית: localStorage['gs-api'] = 'http://127.0.0.1:8797'. */
(function () {
  'use strict';
  var form = document.querySelector('[data-ask-form]');
  if (!form) return;
  var API = 'https://giur-shaal.gilad4049.workers.dev';
  try { var o = localStorage.getItem('gs-api'); if (o && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o)) API = o; } catch (e) {}
  var done = document.querySelector('[data-ask-done]'), res = form.querySelector('[data-ask-res]'), btn = form.querySelector('.mm-send');
  var q = form.elements.q, left = form.querySelector('[data-ask-left]'), t0 = Date.now(), busy = false, started = false;
  function used(how) { if (window.toolUsed) window.toolUsed('giur_shut_ask', { how: how }); }
  function count() { if (left) left.textContent = (600 - q.value.length) + ' תווים נותרו'; }
  q.addEventListener('input', count); count();
  form.addEventListener('focusin', function () { if (!started) { started = true; used('start'); } });
  function idle() { busy = false; btn.disabled = false; btn.textContent = 'לשלוח את השאלה'; }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy) return;
    res.textContent = '';
    var f = form.elements;
    if (f.q.value.trim().length < 8) { res.textContent = 'כתבו את השאלה במשפט או שניים.'; f.q.focus(); return; }
    if (!f.consent.checked) { res.textContent = 'כדי לשלוח צריך לסמן שקראתם את ההבהרה.'; f.consent.focus(); return; }
    busy = true; btn.disabled = true; btn.textContent = 'שולח…';
    fetch(API + '/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: f.q.value, back: f.back.value, consent: true, hp: f.hp.value, ms: Date.now() - t0 }) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j.error) { idle(); res.textContent = j.error; return; }
        used('sent'); form.reset(); count(); idle();
        form.hidden = true; done.hidden = false; done.focus();
      }).catch(function () { idle(); res.textContent = 'אין חיבור לשרת כרגע. השאלה נשארה בשדה, אפשר לנסות שוב בעוד רגע.'; });
  });
  var again = document.querySelector('[data-ask-again]');
  if (again) again.addEventListener('click', function () { done.hidden = true; form.hidden = false; t0 = Date.now(); q.focus(); });
})();
