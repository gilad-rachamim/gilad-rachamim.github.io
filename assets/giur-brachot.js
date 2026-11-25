/* מה מברכים על...? תרגול קצר. ההתקדמות נשמרת בטלפון. */
(function () {
  'use strict';
  var G = window.GIUR, q = G.$('pq-q'); if (!q) return;
  var NAMES = { hamotzi: 'המוציא', mezonot: 'בורא מיני מזונות', gefen: 'בורא פרי הגפן', etz: 'בורא פרי העץ', adama: 'בורא פרי האדמה', shehakol: 'שהכול נהיה בדברו' };
  var FOODS = [["לחם","hamotzi"],["חלה","hamotzi"],["עוגה","mezonot"],["עוגיות","mezonot"],["פסטה מבושלת","mezonot"],["יין","gefen"],["תפוח","etz"],["תפוז","etz"],["אגס","etz"],["ענבים","etz"],["גזר","adama"],["מלפפון","adama"],["תפוח אדמה","adama"],["עגבנייה","adama"],["בשר","shehakol"],["דג","shehakol"],["ביצה","shehakol"],["גבינה","shehakol"],["מים","shehakol"],["שוקולד","shehakol"]];
  if (G.lang === 'en') {
    NAMES = { hamotzi: 'HaMotzi lechem min ha\'aretz', mezonot: 'Borei minei mezonot', gefen: 'Borei pri hagafen', etz: 'Borei pri ha\'etz', adama: 'Borei pri ha\'adama', shehakol: 'Shehakol nihyah bidvaro' };
    FOODS = [['bread','hamotzi'],['challah','hamotzi'],['cake','mezonot'],['cookies','mezonot'],['cooked pasta','mezonot'],['wine','gefen'],['an apple','etz'],['an orange','etz'],['a pear','etz'],['grapes','etz'],['a carrot','adama'],['a cucumber','adama'],['a potato','adama'],['a tomato','adama'],['meat','shehakol'],['fish','shehakol'],['an egg','shehakol'],['cheese','shehakol'],['water','shehakol'],['chocolate','shehakol']];
  } else if (G.lang === 'ru') {
    NAMES = { hamotzi: 'А-моци лехем мин а-арец', mezonot: 'Борэ миней мезонот', gefen: 'Борэ при а-гафен', etz: 'Борэ при а-эц', adama: 'Борэ при а-адама', shehakol: 'Шеаколь ниъя бидваро' };
    FOODS = [['хлеб','hamotzi'],['хала','hamotzi'],['пирог','mezonot'],['печенье','mezonot'],['варёные макароны','mezonot'],['вино','gefen'],['яблоко','etz'],['апельсин','etz'],['груша','etz'],['виноград','etz'],['морковь','adama'],['огурец','adama'],['картофель','adama'],['помидор','adama'],['мясо','shehakol'],['рыба','shehakol'],['яйцо','shehakol'],['сыр','shehakol'],['вода','shehakol'],['шоколад','shehakol']];
  }
  var T = G.t({ he: { c: function (t, o) { return 'תרגלתם ' + t + ' מאכלים, ו-' + o + ' מהם נכון בפעם הראשונה. בכל קצב זה בסדר.'; }, q: function (f) { return 'מה מברכים על: ' + f + '?'; },
      ok: 'נכון, כל הכבוד! ', no: 'כמעט, וזה לגמרי בסדר. ', e: function (f, n) { return 'על ' + f + ' מברכים "' + n + '". הנוסח המלא מופיע בכרטיס למעלה.'; },
      w: function (t, o) { return 'שלום, אני לומד ברכות הנהנין. תרגלתי ' + t + ' מאכלים, ו-' + o + ' מהם נכון בפעם הראשונה. '; } },
    en: { c: function (t, o) { return 'You practiced ' + t + ' foods, ' + o + ' of them right the first time. Any pace is fine.'; }, q: function (f) { return 'Which blessing do we say over ' + f + '?'; },
      ok: 'Correct, well done! ', no: 'Almost, and that is completely fine. ', e: function (f, n) { return 'Over ' + f + ' we say "' + n + '". The full text is on the card above.'; },
      w: function (t, o) { return 'Hello, I am learning the blessings over food. I practiced ' + t + ' foods, ' + o + ' of them right the first time. '; } },
    ru: { c: function (t, o) { return 'Вы потренировались на ' + t + ' продуктах, из них ' + o + ' верно с первого раза. Любой темп – это нормально.'; }, q: function (f) { return 'Какое благословение говорят на: ' + f + '?'; },
      ok: 'Верно, молодец! ', no: 'Почти, и это совершенно нормально. ', e: function (f, n) { return 'На «' + f + '» говорят «' + n + '». Полный текст – в карточке выше.'; },
      w: function (t, o) { return 'Здравствуйте, я учу благословения на еду. Я потренировался на ' + t + ' продуктах, из них ' + o + ' верно с первого раза. '; } } });
  var KEY = G.lk('brachot');
  var st = G.get(KEY, { ok: 0, tried: 0, seen: {} }), cur = null, locked = false;
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function count() { G.$('pq-c').textContent = T.c(st.tried, st.ok); }
  function next() {
    locked = false; G.$('pq-e').hidden = true; G.$('pq-n').hidden = true;
    var pool = FOODS.filter(function (f) { return !st.seen[f[0]]; }); if (!pool.length) { st.seen = {}; pool = FOODS; }
    cur = pool[Math.floor(Math.random() * pool.length)];
    q.textContent = T.q(cur[0]);
    var box = G.$('pq-o'); box.textContent = '';
    shuffle(Object.keys(NAMES)).forEach(function (k) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'gr-opt'; b.textContent = NAMES[k]; b.setAttribute('data-k', k);
      b.addEventListener('click', function () { pick(b, k); }); box.appendChild(b);
    });
    count();
  }
  function pick(btn, k) {
    if (locked) return; locked = true;
    st.tried++; st.seen[cur[0]] = 1; var good = k === cur[1]; if (good) st.ok++;
    G.set(KEY, st); G.used('giur_brachot', { ok: good ? 1 : 0 });
    [].forEach.call(G.$('pq-o').children, function (b) { if (b.getAttribute('data-k') === cur[1]) b.classList.add('ok'); else if (b === btn) b.classList.add('no'); });
    var e = G.$('pq-e'); e.hidden = false;
    e.textContent = (good ? T.ok : T.no) + T.e(cur[0], NAMES[cur[1]]);
    G.$('pq-n').hidden = false; G.$('pq-n').focus(); count();
  }
  G.$('pq-n').addEventListener('click', next);
  G.$('pq-w').addEventListener('click', function () {
    G.wa(T.w(st.tried, st.ok) + G.url());
  });
  next();
})();
