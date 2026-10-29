// רשימת ההכנה – הסימונים נשמרים בטלפון של ההורה (localStorage), בלי שרת.
(function () {
  var KEY = 'mohel-checklist';
  var boxes = Array.prototype.slice.call(document.querySelectorAll('.ck input[type=checkbox]'));
  var saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
  boxes.forEach(function (b) { if (saved[b.value]) b.checked = true; });

  var bar = document.getElementById('ck-bar'), txt = document.getElementById('ck-txt');
  function update() {
    var done = boxes.filter(function (b) { return b.checked; }).length;
    var pct = Math.round(done * 100 / boxes.length);
    bar.style.width = pct + '%';
    txt.textContent = done + ' מתוך ' + boxes.length + ' מוכן' + (pct === 100 ? ' – מזל טוב, אתם מוכנים!' : '');
    var o = {}; boxes.forEach(function (b) { if (b.checked) o[b.value] = 1; });
    try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {}
    document.querySelectorAll('.ck-group').forEach(function (g) {
      var gb = g.querySelectorAll('input[type=checkbox]'), gd = g.querySelectorAll('input:checked');
      g.querySelector('.ck-count').textContent = gd.length + '/' + gb.length;
    });
    var wa = 'שלום גילעד 🙂 אני מתכונן/ת לברית עם הרשימה באתר שלך, סיימתי ' + done + ' מתוך ' + boxes.length + '. יש לי כמה שאלות.';
    document.querySelectorAll('a[data-wa-ck]').forEach(function (a) { a.href = 'https://wa.me/972584049049?text=' + encodeURIComponent(wa); });
  }
  boxes.forEach(function (b) { b.addEventListener('change', update); });
  update();

  var share = document.getElementById('ck-share');
  if (share) share.addEventListener('click', function () {
    var data = { title: 'רשימת ההכנה לברית', text: 'רשימת ההכנה לברית של גילעד רחמים המוהל', url: location.href.split('#')[0] };
    if (navigator.share) navigator.share(data).catch(function () {});
    else location.href = 'https://wa.me/?text=' + encodeURIComponent(data.text + ' ' + data.url);
  });
  var reset = document.getElementById('ck-reset');
  if (reset) reset.addEventListener('click', function () { boxes.forEach(function (b) { b.checked = false; }); update(); });
})();
