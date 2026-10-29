// מסלול הליד: שולח במייל (FormSubmit), שומר בטלפון, ועובר לעמוד התודה
// עם הפרטים ב-hash כדי שכפתור הווטסאפ שם יכיל אותם. בלי JavaScript – הטופס
// נשלח ישירות ל-FormSubmit ומגיע לעמוד התודה דרך _next.
(function () {
  function val(form, name) {
    var el = form.querySelector('[name="' + name + '"]');
    return el ? el.value.trim() : '';
  }
  document.querySelectorAll('form[data-lead]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      var trap = form.querySelector('.hp input');
      if (trap && trap.value) return; // בוט

      var btn = form.querySelector('button[type=submit]');
      btn.disabled = true;
      btn.textContent = 'שולח…';

      var lead = { n: val(form, 'שם'), p: val(form, 'טלפון'), e: val(form, 'email'), d: val(form, 'מועד הלידה'), c: val(form, 'עיר'), t: Date.now() };
      try { localStorage.setItem('mohel-lead', JSON.stringify(lead)); } catch (err) {}

      var next = form.getAttribute('data-next') + '#' + new URLSearchParams({ n: lead.n, p: lead.p, d: lead.d, c: lead.c }).toString();
      var done = false;
      var go = function () { if (!done) { done = true; location.href = next; } };
      var timer = setTimeout(go, 6000);

      fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .catch(function () {})
        .then(function () { clearTimeout(timer); go(); });
    });
  });
})();
