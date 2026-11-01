// מסלול הליד: שולח ל-Apps Script (הגיליון "לידים – מוהל" + מייל להורה + הודעה
// לגילעד), שומר בטלפון, ועובר לעמוד התודה עם הפרטים ב-hash כדי שכפתור הווטסאפ
// שם יכיל אותם. בלי JavaScript – הטופס נשלח ישירות ל-Apps Script (POST רגיל).
(function () {
  function val(form, name) {
    var el = form.querySelector('[name="' + name + '"]');
    return el ? el.value.trim() : '';
  }
  // מקור התנועה (utm) – נשמר מהביקור הראשון, גם אם הטופס מולא בדף אחר
  var utm = {};
  try {
    var q = new URLSearchParams(location.search);
    ['utm_source', 'utm_medium', 'utm_campaign', 'ref'].forEach(function (k) { if (q.get(k)) utm[k] = q.get(k); });
    if (Object.keys(utm).length) sessionStorage.setItem('mohel-utm', JSON.stringify(utm));
    else utm = JSON.parse(sessionStorage.getItem('mohel-utm') || '{}');
  } catch (err) {}

  document.querySelectorAll('form[data-lead]').forEach(function (form) {
    Object.keys(utm).forEach(function (k) {
      var el = form.querySelector('[name="' + k + '"]');
      if (el) el.value = utm[k];
    });
    var pg = form.querySelector('[name="_page"]');
    if (pg) pg.value = location.pathname;

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
      var timer = setTimeout(go, 8000);

      // Apps Script עונה ב-redirect, לכן no-cors: לא קוראים את התשובה, רק שולחים
      fetch(form.action, { method: 'POST', body: new FormData(form), mode: 'no-cors', keepalive: true })
        .catch(function () {})
        .then(function () { clearTimeout(timer); go(); });
    });
  });
})();
