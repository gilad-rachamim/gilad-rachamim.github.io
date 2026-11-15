// אשף "לפנות מקום בגוגל": קישורים ישירים לדפים של גוגל (בלי התחברות ובלי לקרוא שום מידע),
// וסימון ✓ לכל צעד שנעשה (נשמר בכרום).
(function () {
  var done = {};
  function save() { chrome.storage.local.set({ panuiDone: done }); }
  function draw() {
    var lis = document.querySelectorAll('#steps li'), n = 0;
    [].forEach.call(lis, function (li) {
      var k = li.dataset.step, on = !!done[k]; li.classList.toggle('done', on); if (on) n++;
      var b = li.querySelector('.done-btn');
      if (!b) { b = document.createElement('button'); b.type = 'button'; b.className = 'line done-btn'; li.appendChild(b); b.addEventListener('click', function () { done[k] = !done[k]; save(); draw(); }); }
      b.textContent = on ? '↩ לא עשיתי' : '✓ עשיתי';
    });
    document.getElementById('prog').textContent = n ? n + ' מתוך ' + lis.length + ' צעדים נעשו' + (n === lis.length ? ' – כל הכבוד! 🎉' : '') : '';
  }
  // חיפושים בג'ימייל: בחשבון שפתוח בג'ימייל (u/0 אם אין)
  [].forEach.call(document.querySelectorAll('[data-gm]'), function (a) {
    a.href = 'https://mail.google.com/mail/u/0/#search/' + encodeURIComponent(a.dataset.gm).replace(/%20/g, '+');
    a.title = 'חיפוש בג׳ימייל: ' + a.dataset.gm;
  });
  [].forEach.call(document.querySelectorAll('.go a'), function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var li = a.closest('li'); if (li) { done[li.dataset.step] = true; save(); draw(); }
      chrome.tabs.create({ url: a.getAttribute('href').indexOf('http') === 0 ? a.href : chrome.runtime.getURL(a.getAttribute('href')) });
    });
  });
  chrome.storage.local.get('panuiDone').then(function (o) { done = o.panuiDone || {}; draw(); });
})();
