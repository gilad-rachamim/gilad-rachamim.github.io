// רשימת ההכנה – הסימונים נשמרים בטלפון של ההורה (localStorage), בלי שרת.
(function () {
  var KEY = 'mohel-checklist';
  var L = (document.documentElement.getAttribute('lang') || 'he').slice(0, 2);
  var T = function (d) { return d[L] || d.he; };
  var boxes = Array.prototype.slice.call(document.querySelectorAll('.ck input[type=checkbox]'));
  var saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
  boxes.forEach(function (b) { if (saved[b.value]) b.checked = true; });

  var bar = document.getElementById('ck-bar'), txt = document.getElementById('ck-txt');
  function update() {
    var done = boxes.filter(function (b) { return b.checked; }).length;
    var pct = Math.round(done * 100 / boxes.length);
    bar.style.width = pct + '%';
    txt.textContent = done + T({ he: ' מתוך ', ru: ' из ', en: ' of ' }) + boxes.length + T({ he: ' מוכן', ru: ' готово', en: ' ready' }) + (pct === 100 ? T({ he: ' – מזל טוב, אתם מוכנים!', ru: ' – мазаль тов, вы готовы!', en: ' – mazal tov, you are ready!' }) : '');
    var o = {}; boxes.forEach(function (b) { if (b.checked) o[b.value] = 1; });
    try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {}
    document.querySelectorAll('.ck-group').forEach(function (g) {
      var gb = g.querySelectorAll('input[type=checkbox]'), gd = g.querySelectorAll('input:checked');
      g.querySelector('.ck-count').textContent = gd.length + '/' + gb.length;
    });
    var wa = T({ he: 'שלום גילעד 🙂 אני מתכונן/ת לברית עם הרשימה באתר שלך, סיימתי ', ru: 'Здравствуйте, Гилад 🙂 Готовлюсь к брит-миле по списку на вашем сайте, готово ', en: 'Hi Gilad 🙂 I am getting ready for the brit with the checklist on your site, I have done ' }) + done + T({ he: ' מתוך ', ru: ' из ', en: ' of ' }) + boxes.length + T({ he: '. יש לי כמה שאלות.', ru: '. У меня есть несколько вопросов.', en: '. I have a few questions.' });
    document.querySelectorAll('a[data-wa-ck]').forEach(function (a) { a.href = 'https://wa.me/972584049049?text=' + encodeURIComponent(wa); });
  }
  boxes.forEach(function (b) { b.addEventListener('change', update); });
  update();

  var share = document.getElementById('ck-share');
  if (share) share.addEventListener('click', function () {
    var data = { title: T({ he: 'רשימת ההכנה לברית', ru: 'Брит мила: список подготовки', en: 'Brit Milah Checklist' }), text: T({ he: 'רשימת ההכנה לברית של גילעד רחמים המוהל', ru: 'Список подготовки к брит-миле от моэля Гилада Рахамима', en: 'Brit milah checklist by Gilad Rachamim, a certified mohel' }), url: location.href.split('#')[0] };
    if (navigator.share) navigator.share(data).catch(function () {});
    else (window.kelimShort ? window.kelimShort.go('https://wa.me/?text=' + encodeURIComponent(data.text + ' ' + data.url)) : (location.href = 'https://wa.me/?text=' + encodeURIComponent(data.text + ' ' + data.url)));
  });
  var reset = document.getElementById('ck-reset');
  if (reset) reset.addEventListener('click', function () { boxes.forEach(function (b) { b.checked = false; }); update(); });
})();
