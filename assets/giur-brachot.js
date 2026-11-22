/* מה מברכים על...? תרגול קצר. ההתקדמות נשמרת בטלפון. */
(function () {
  'use strict';
  var G = window.GIUR, q = G.$('pq-q'); if (!q) return;
  var NAMES = { hamotzi: 'המוציא', mezonot: 'בורא מיני מזונות', gefen: 'בורא פרי הגפן', etz: 'בורא פרי העץ', adama: 'בורא פרי האדמה', shehakol: 'שהכול נהיה בדברו' };
  var FOODS = [["לחם","hamotzi"],["חלה","hamotzi"],["עוגה","mezonot"],["עוגיות","mezonot"],["פסטה מבושלת","mezonot"],["יין","gefen"],["תפוח","etz"],["תפוז","etz"],["אגס","etz"],["ענבים","etz"],["גזר","adama"],["מלפפון","adama"],["תפוח אדמה","adama"],["עגבנייה","adama"],["בשר","shehakol"],["דג","shehakol"],["ביצה","shehakol"],["גבינה","shehakol"],["מים","shehakol"],["שוקולד","shehakol"]];
  var st = G.get('brachot', { ok: 0, tried: 0, seen: {} }), cur = null, locked = false;
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function count() { G.$('pq-c').textContent = 'תרגלתם ' + st.tried + ' מאכלים, ו-' + st.ok + ' מהם נכון בפעם הראשונה. בכל קצב זה בסדר.'; }
  function next() {
    locked = false; G.$('pq-e').hidden = true; G.$('pq-n').hidden = true;
    var pool = FOODS.filter(function (f) { return !st.seen[f[0]]; }); if (!pool.length) { st.seen = {}; pool = FOODS; }
    cur = pool[Math.floor(Math.random() * pool.length)];
    q.textContent = 'מה מברכים על: ' + cur[0] + '?';
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
    G.set('brachot', st); G.used('giur_brachot', { ok: good ? 1 : 0 });
    [].forEach.call(G.$('pq-o').children, function (b) { if (b.getAttribute('data-k') === cur[1]) b.classList.add('ok'); else if (b === btn) b.classList.add('no'); });
    var e = G.$('pq-e'); e.hidden = false;
    e.textContent = (good ? 'נכון, כל הכבוד! ' : 'כמעט, וזה לגמרי בסדר. ') + 'על ' + cur[0] + ' מברכים "' + NAMES[cur[1]] + '". הנוסח המלא מופיע בכרטיס למעלה.';
    G.$('pq-n').hidden = false; G.$('pq-n').focus(); count();
  }
  G.$('pq-n').addEventListener('click', next);
  G.$('pq-w').addEventListener('click', function () {
    G.wa('שלום, אני לומד ברכות הנהנין. תרגלתי ' + st.tried + ' מאכלים, ו-' + st.ok + ' מהם נכון בפעם הראשונה. https://hakelim.com/kodesh/giur/brachot/');
  });
  next();
})();
