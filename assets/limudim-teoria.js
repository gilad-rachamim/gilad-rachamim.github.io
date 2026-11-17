/* מבחן תיאוריה לדוגמה, מתוך המאגר הרשמי של משרד התחבורה (data.gov.il) – הכלים של גילעד רחמים */
(function () {
  var app = document.getElementById('te'); if (!app) return;
  var K = ['חוקי התנועה', 'תמרורים', 'בטיחות', 'הכרת הרכב'], IMG = 'https://www.gov.il/BlobFolder/generalpage/tq_pic_0';
  var bank = null, qs = [], i = 0, picks = [], mode = 'test', t0 = 0, tick = null, firstUse = true;
  var box = document.getElementById('te-q'), top = document.getElementById('te-top'), start = document.getElementById('te-start');
  function used(how) { if (!firstUse) return; firstUse = false; try { window.toolUsed && window.toolUsed('limudim_teoria', { how: how }); } catch (e) {} }
  function shuffle(a) { for (var j = a.length - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)), t = a[j]; a[j] = a[k]; a[k] = t; } return a; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function load(cb) {
    if (bank) return cb();
    box.innerHTML = '<p>טוען את מאגר השאלות…</p>';
    fetch('/assets/limudim-teoria.json').then(function (r) { return r.json(); }).then(function (d) { bank = d; cb(); })
      .catch(function () { box.innerHTML = '<p>לא הצלחנו לטעון את השאלות. בודקים את החיבור ומנסים שוב.</p>'; });
  }
  function begin() {
    mode = app.querySelector('[name="te-mode"]:checked').value;
    var cat = +document.getElementById('te-cat').value;
    load(function () {
      var pool = bank.map(function (q, n) { return n; }).filter(function (n) { return mode === 'test' || cat < 0 || bank[n][3] === cat; });
      qs = shuffle(pool).slice(0, mode === 'test' ? 30 : 20).map(function (n) {
        var q = bank[n], ord = shuffle([0, 1, 2, 3]);
        return { q: q[0], a: ord.map(function (o) { return q[1][o]; }), c: ord.indexOf(q[2]), k: q[3], img: q[4] };
      });
      i = 0; picks = []; start.hidden = true; top.hidden = false; t0 = Date.now();
      clearInterval(tick); if (mode === 'test') tick = setInterval(clock, 1000);
      clock(); show(); used(mode);
    });
  }
  function clock() {
    var left = 40 * 60 - Math.floor((Date.now() - t0) / 1000), ok = picks.filter(function (p, n) { return p === qs[n].c; }).length;
    document.getElementById('te-n').textContent = 'שאלה ' + (i + 1) + ' מתוך ' + qs.length;
    document.getElementById('te-t').textContent = mode === 'test' ? '⏱ ' + Math.floor(Math.max(left, 0) / 60) + ':' + ('0' + Math.max(left, 0) % 60).slice(-2) : '✓ ' + ok + ' נכונות';
    if (mode === 'test' && left <= 0) finish();
  }
  function show() {
    var q = qs[i];
    box.innerHTML = '<p class="te-cat">' + K[q.k] + '</p><h3 class="te-text">' + esc(q.q) + '</h3>' +
      (q.img ? '<img class="te-img" src="' + IMG + q.img.replace('/', '/he/') + '" alt="איור לשאלה" loading="lazy" referrerpolicy="no-referrer">' : '') +
      '<div class="te-ans">' + q.a.map(function (a, n) { return '<button type="button" data-a="' + n + '">' + esc(a) + '</button>'; }).join('') + '</div>' +
      '<p class="te-fb" aria-live="polite"></p><div class="te-nav"><button class="btn btn-gold" type="button" id="te-next" hidden>' + (i + 1 < qs.length ? 'לשאלה הבאה ←' : 'לסיים ולראות ציון') + '</button></div>';
    clock();
  }
  function answer(n) {
    if (picks[i] != null) return;
    picks[i] = n; var q = qs[i], bs = box.querySelectorAll('[data-a]');
    if (mode === 'practice') {
      bs[q.c].classList.add('ok'); if (n !== q.c) bs[n].classList.add('no');
      box.querySelector('.te-fb').textContent = n === q.c ? '✓ נכון!' : '✗ לא נכון. התשובה הנכונה מסומנת בירוק.';
    } else bs[n].classList.add('sel');
    bs.forEach(function (b) { b.disabled = true; });
    var nx = document.getElementById('te-next'); nx.hidden = false; nx.focus();
    if (mode === 'test') { var at = i; setTimeout(function () { if (i === at && picks[i] != null) next(); }, 350); }
    clock();
  }
  function next() { if (i + 1 < qs.length) { i++; show(); } else finish(); }
  function finish() {
    clearInterval(tick); tick = null;
    var ok = 0, wrong = [];
    qs.forEach(function (q, n) { if (picks[n] === q.c) ok++; else wrong.push(n); });
    var pass = mode === 'test' && ok >= 26, mins = Math.round((Date.now() - t0) / 60000);
    box.innerHTML = '<div class="res"><h3>' + (mode === 'test' ? (pass ? '🎉 עברתם!' : 'עוד קצת תרגול') : 'סיימתם את התרגול') + '</h3>' +
      '<p class="big">' + ok + ' מתוך ' + qs.length + ' <span class="g">תשובות נכונות</span></p>' +
      (mode === 'test' ? '<ul><li>במבחן האמיתי צריך לפחות 26 תשובות נכונות מתוך 30 (עד 4 טעויות).</li><li>הזמן שלכם: ' + mins + ' דקות מתוך 40.</li></ul>' : '') + '</div>' +
      (wrong.length ? '<h3 class="te-rev">השאלות שטעיתם בהן</h3>' + wrong.map(function (n) {
        var q = qs[n]; return '<div class="te-w"><p><b>' + esc(q.q) + '</b></p>' + (q.img ? '<img class="te-img sm" src="' + IMG + q.img.replace('/', '/he/') + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '') +
          '<p class="ok">✓ ' + esc(q.a[q.c]) + '</p>' + (picks[n] != null ? '<p class="no">✗ ' + esc(q.a[picks[n]]) + '</p>' : '<p class="no">לא נענתה</p>') + '</div>';
      }).join('') : '') +
      '<div class="te-nav"><button class="btn btn-gold" type="button" id="te-again">מבחן חדש</button></div>';
    top.hidden = true;
    try { var h = JSON.parse(localStorage.getItem('teoria-hist') || '[]'); h.push([Date.now(), mode, ok, qs.length]); localStorage.setItem('teoria-hist', JSON.stringify(h.slice(-30))); } catch (e) {}
    hist(); box.scrollIntoView({ block: 'start' });
  }
  function hist() {
    var el = document.getElementById('te-hist'), h = [];
    try { h = JSON.parse(localStorage.getItem('teoria-hist') || '[]'); } catch (e) {}
    h = h.filter(function (x) { return x[1] === 'test'; }).slice(-5).reverse();
    el.hidden = !h.length;
    el.innerHTML = '<b>המבחנים האחרונים שלכם:</b> ' + h.map(function (x) { return x[2] + '/' + x[3] + (x[2] >= 26 ? ' ✓' : ''); }).join(' · ');
  }
  app.addEventListener('click', function (e) {
    var a = e.target.closest('[data-a]'); if (a) return answer(+a.dataset.a);
    if (e.target.id === 'te-next') return next();
    if (e.target.id === 'te-again') { start.hidden = false; box.innerHTML = ''; start.scrollIntoView({ block: 'start' }); }
    if (e.target.id === 'te-go') begin();
    if (e.target.id === 'te-stop') { if (confirm('לסיים את המבחן עכשיו?')) finish(); }
  });
  app.addEventListener('change', function (e) { if (e.target.name === 'te-mode') document.getElementById('te-catf').hidden = e.target.value !== 'practice'; });
  document.addEventListener('keydown', function (e) {
    if (!qs.length || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
    if (e.key >= '1' && e.key <= '4' && box.querySelector('[data-a]')) answer(+e.key - 1);
  });
  hist();
})();
