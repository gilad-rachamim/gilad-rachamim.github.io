// טופס המדריך: שולח את הפרטים לטופס גוגל (הלידים נשמרים בגיליון של גילעד),
// ואז פותח את עמוד התודה עם המדריך. בלי JavaScript – הטופס נשלח ישירות לגוגל.
(function () {
  document.querySelectorAll('form[data-lead]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var trap = form.querySelector('.hp input');
      if (trap && trap.value) return; // בוט

      var btn = form.querySelector('button[type=submit]');
      btn.disabled = true;
      btn.textContent = 'שולח…';

      var body = new URLSearchParams(new FormData(form));
      var go = function () { location.href = form.getAttribute('data-next'); };
      var timer = setTimeout(go, 6000);

      fetch(form.action, { method: 'POST', mode: 'no-cors', body: body })
        .catch(function () {})
        .then(function () { clearTimeout(timer); go(); });
    });
  });
})();
