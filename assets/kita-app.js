// כיתה משחקת (/kelim/chashiva/kita/): הצטרפות ולוח לתלמידים, דף מורה (לוח, מתנות, תעודות, הגדרות), ודף לבית הספר.
// השרת: Worker kelim-kita (tools/kita-worker). בטלפון: kita-me (תלמיד/ה), kita-teach (הכיתות של המורה), kita-names-<קוד> (שמות אמיתיים לתעודות, רק מקומי).
(function () {
  'use strict';
  var API = (function () { try { var o = localStorage.getItem('kita-api'); if (o) return o; } catch (e) {} return /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? 'http://127.0.0.1:8796' : 'https://kelim-kita.gilad4049.workers.dev'; })();
  var SITE = location.origin + '/kelim/chashiva/kita/';
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function lsSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function used(tool, how) { if (window.toolUsed) window.toolUsed(tool, { how: how }); }
  function call(path, body) {
    return fetch(API + path, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {})
      .then(function (r) { return r.json().then(function (d) { d._s = r.status; return d; }); })
      .catch(function () { return { _s: 0, error: 'אין חיבור לשרת כרגע. בודקים את האינטרנט ומנסים שוב.' }; });
  }
  var GAMES = { 'kita-quiz': 'שאלות המורה', 'krav-math': 'מתמטיקה', 'krav-eng': 'אנגלית', chidon: 'חידון וטריוויה', tash: 'תשחצים', nono: 'שחור ופתור', shesh: 'שש-בש', damka: 'דמקה', shachmat: 'שחמט', blackjack: '21', sudoku: 'סודוקו', mila: 'מילה ביום', tashchetz: 'תשחצים', shachor: 'שחור ופתור', 'bagrut-math': 'מתמטיקה לבגרות', 'bagrut-english': 'אנגלית לבגרות', math: 'מתמטיקה', english: 'אנגלית', trivia: 'טריוויה', quiz: 'חידון' };
  var PER = { week: 'השבוע', month: 'החודש', round: 'בסבב הזה', all: 'מההתחלה' };
  function who(w) { if (w === '1') return 'למקום הראשון'; if (w === '2') return 'למקום השני'; if (w === '3') return 'למקום השלישי'; if (w === 'top3') return 'לשלושת הראשונים'; if (w === 'all') return 'לכל מי שצובר נקודות'; var m = /^pts:(\d+)$/.exec(w || ''); return m ? 'לכל מי שמגיע ל-' + m[1] + ' נקודות' : ''; }
  function math(t) { return esc(t).replace(/[0-9][0-9\s+\-−×÷*\/=().,^²³√%:]*[0-9)²³%]/g, function (m) { return /[+\-−×÷*\/=^:]/.test(m) ? '<span dir="ltr" class="kq-m">' + m + '</span>' : m; }); }
  function medal(p) { return p === 1 ? '🥇' : p === 2 ? '🥈' : p === 3 ? '🥉' : p ? String(p) : '·'; }
  // התמדה: 5 ימי תרגול בשבוע (15 בחודש). dd מגיע מהשרת (ימים שונים עם נקודות)
  function needDays(per) { return per === 'month' ? 15 : per === 'week' || per === 'prevweek' ? 5 : 0; }
  function isPersist(r, per) { var n = needDays(per); return !!(n && r.dd >= n); }
  function fire(r, per) { return isPersist(r, per) ? '<small class="kt-fire">🔥 מתמידה · ' + r.dd + ' ימים</small>' : ''; }
  function giftsHtml(list) {
    return (list || []).map(function (g) { return '<li><span class="gi">' + esc(g.i) + '</span><div><b>' + esc(g.t) + '</b> <small>' + esc(who(g.who)) + (g.d ? ' · ' + esc(g.d) : '') + '</small></div></li>'; }).join('');
  }
  // יעד כיתתי: נשמר כ"מתנה" עם k=goalw/goalm ו-who=pts:N (בלי שינוי בשרת). הפרס בשדה d
  function isGoal(g) { return /^goal[wm]$/.test(g.k || ''); }
  function realG(list) { return (list || []).filter(function (g) { return !isGoal(g); }); }
  function goalOf(list) { return (list || []).filter(isGoal)[0] || null; }
  function goalHtml(g, sum) {
    var n = +((/^pts:(\d+)/.exec(g.who) || [0, 0])[1]) || 1, p = Math.min(100, Math.round(sum * 100 / n)), per = g.k === 'goalw' ? 'השבוע' : 'החודש', f = function (x) { return x.toLocaleString('he-IL'); };
    return '<div class="kt-goal' + (sum >= n ? ' done' : '') + '"><div class="kt-goal-h">🎯 יעד כיתתי ' + per + ': <b>' + f(sum) + '</b> מתוך ' + f(n) + '</div>' +
      '<div class="kt-goal-bar" role="progressbar" aria-valuenow="' + p + '" aria-valuemin="0" aria-valuemax="100"><span style="width:' + p + '%"></span></div>' +
      '<div class="kt-goal-s">' + (sum >= n ? '🎉 הגענו! כל הכבוד לכל הכיתה' : 'עוד ' + f(n - sum) + ' נקודות, כולנו ביחד') + (g.d ? ' · הפרס: ' + esc(g.d) : '') + '</div></div>';
  }
  function goalBox(el, code, g, rows, per) {
    if (!el) return; if (!g) { el.hidden = true; return; }
    var gp = g.k === 'goalw' ? 'week' : 'month';
    var draw = function (rs) { el.innerHTML = goalHtml(g, rs.reduce(function (a, r) { return a + r.pts; }, 0)); el.hidden = false; };
    if (per === gp) draw(rows); else call('/c/' + code + '/board?p=' + gp).then(function (d) { if (d.ok) draw(d.rows); });
  }
  function tabs(box, attr, cur, fn) {
    box.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute(attr) === cur ? 'true' : 'false'); });
    box.onclick = function (e) { var b = e.target.closest('button[' + attr + ']'); if (b) fn(b.getAttribute(attr)); };
  }

  var app = $('kt-app'), page = app ? app.getAttribute('data-page') : '';
  // השרת עוד לא עלה / לא זמין: הודעה רכה במקום שגיאות בכל כפתור
  if (app) call('/ping').then(function (d) {
    if (d.ok) return;
    var n = document.createElement('p'); n.className = 'kt-warn'; n.id = 'kt-offline';
    n.textContent = 'הכיתות נפתחות ממש בקרוב. בינתיים אפשר לשחק במשחקי החשיבה, והנקודות יתחילו להיספר מהיום שהכיתה נפתחת.';
    app.insertBefore(n, app.firstChild);
  });
  if ($('kt-doc-print')) $('kt-doc-print').addEventListener('click', function () { used('chashiva_kita_school', 'print'); window.print(); });

  // ================= תלמידים + פתיחת כיתה =================
  if (page === 'student') {
    var me = lsGet('kita-me', null), per = null;
    var qc = (new URLSearchParams(location.search).get('c') || '').replace(/\D/g, '').slice(0, 6);
    var codeIn = $('kt-code'), nickIn = $('kt-nick');
    if (qc) codeIn.value = qc;
    function peek() {
      var c = codeIn.value.replace(/\D/g, ''); codeIn.value = c; $('kt-code-name').textContent = ''; $('kt-join-err').textContent = '';
      if (c.length !== 6) return;
      call('/c/' + c + '/info').then(function (d) {
        if (codeIn.value !== c) return;
        if (d.ok) $('kt-code-name').textContent = '✓ ' + d.name + (d.teacher ? ' · ' + d.teacher : '') + (d.locked ? ' (ההצטרפות סגורה כרגע)' : '');
        else $('kt-join-err').textContent = d.error;
      });
    }
    codeIn.addEventListener('input', peek); if (qc) peek();
    $('kt-join').addEventListener('submit', function (e) {
      e.preventDefault();
      var c = codeIn.value.replace(/\D/g, ''), n = nickIn.value.trim(), err = $('kt-join-err');
      if (c.length !== 6) { err.textContent = 'קוד הכיתה הוא 6 ספרות. מקבלים אותו מהמורה.'; codeIn.focus(); return; }
      if (n.length < 2) { err.textContent = 'כותבים כינוי של 2 אותיות לפחות.'; nickIn.focus(); return; }
      err.textContent = 'מצטרפים…';
      call('/c/' + c + '/join', { nick: n }).then(function (d) {
        if (!d.ok) { err.textContent = d.error; return; }
        err.textContent = '';
        me = { code: c, sid: d.sid, token: d.token, nick: d.nick, name: d.name, teacher: d.teacher };
        lsSet('kita-me', me); used('chashiva_kita', 'join');
        if (!window.KITA) { var s = document.createElement('script'); s.src = '/assets/kita.js'; document.head.appendChild(s); }
        showMine(true);
      });
    });
    function showMine(scroll) {
      $('kt-mine').hidden = !me; $('kt-join-sec').hidden = !!me;
      if (!me) { $('kt-quiz').hidden = true; return; }
      loadQuiz();
      $('kt-mine-name').textContent = me.name || ''; $('kt-mine-nick').textContent = me.nick;
      $('kt-mine-teacher').textContent = me.teacher || 'הכיתה שלי';
      loadBoard();
      if (scroll) $('kt-mine').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    function loadBoard() {
      call('/c/' + me.code + '/board' + (per ? '?p=' + per : '')).then(function (d) {
        var err = $('kt-mine-err'); err.textContent = '';
        if (!d.ok) { err.textContent = d.error; if (d._s === 404) { lsSet('kita-me', null); } return; }
        per = d.period;
        me.name = d.name; me.teacher = d.teacher; lsSet('kita-me', me);
        $('kt-mine-name').textContent = d.name; $('kt-mine-teacher').textContent = d.teacher || 'הכיתה שלי';
        $('kt-mine-msg').textContent = d.msg ? '📣 ' + d.msg : '';
        tabs($('kt-per'), 'data-p', per, function (p) { per = p; loadBoard(); });
        var found = d.rows.some(function (r) { return r.sid === me.sid; });
        if (!found) { err.textContent = 'הכינוי שלכם כבר לא בכיתה (אולי המורה הסירה). אפשר להצטרף שוב.'; lsSet('kita-me', null); me = null; $('kt-join-sec').hidden = false; }
        $('kt-mine-board').innerHTML = d.rows.map(function (r) {
          return '<li class="' + (me && r.sid === me.sid ? 'me ' : '') + (r.place === 1 ? 'p1' : '') + '"><span class="pl">' + medal(r.place) + '</span><span class="nk">' + esc(r.nick) + (me && r.sid === me.sid ? ' (אני)' : '') + (r.crown ? '<small class="crown">👑 ' + esc(r.crown) + '</small>' : '') + fire(r, per) + '</span><span class="pt">' + (r.pts || '—') + '</span></li>';
        }).join('') || '<li><span class="pl">·</span><span class="nk">עוד אין אף אחד בכיתה</span><span></span></li>';
        $('kt-mine-gifts').innerHTML = giftsHtml(realG(d.gifts)); $('kt-mine-gifts-h').hidden = !realG(d.gifts).length;
        goalBox($('kt-mine-goal'), me ? me.code : '', goalOf(d.gifts), d.rows, d.period);
        $('kt-mine-magen').hidden = !d.gifts.some(function (g) { return g.k === 'magen'; });
        var mine = me && d.rows.filter(function (r) { return r.sid === me.sid; })[0], fb = $('kt-mine-fire');
        if (me) $('kt-parents').href = 'https://wa.me/?text=' + encodeURIComponent('אמא, אבא, ככה אפשר לראות איך אני מתקדמת בכיתה משחקת 🏆\n' + SITE + 'horim/#c=' + me.code + '&s=' + me.sid);
        if (mine && per === 'week' && mine.dd !== undefined) {
          fb.textContent = mine.dd >= 5 ? '🔥 יש לך תג התמדה השבוע: תרגלת ב-' + mine.dd + ' ימים. כל הכבוד!' : '🔥 תרגלת השבוע ב-' + mine.dd + ' ' + (mine.dd === 1 ? 'יום' : 'ימים') + '. עוד ' + (5 - mine.dd) + ' לתג ההתמדה. גם כמה דקות ביום נחשבות.';
          fb.hidden = false;
        } else fb.hidden = true;
      });
    }
    // ---- תרגול מהמורה ----
    var QZ = null, qi = 0, qOk = 0, qTries = 0, qDone = {};
    function qKey() { return 'kita-quiz-' + me.code + '-' + QZ.v; }
    // תרגיל חשבון בתוך משפט בעברית: עוטפים אותו בכיוון שמאל-לימין, אחרת "3/4 + 1/4" מוצג הפוך
    function rnd(seed) { var x = seed % 2147483647 || 7; return function () { x = x * 16807 % 2147483647; return (x - 1) / 2147483646; }; }
    function loadQuiz() {
      if (!me) return;
      call('/c/' + me.code + '/quiz').then(function (d) {
        if (!d.ok || d.none || !d.q || !d.q.length) { $('kt-quiz').hidden = true; return; }
        QZ = d; qDone = lsGet(qKey(), {});
        var left = d.q.filter(function (x, i) { return !qDone[i]; }).length;
        $('kt-q-title').textContent = '📝 ' + d.t;
        $('kt-q-sub').textContent = d.q.length + ' שאלות מהמורה. 3 נקודות לכל תשובה נכונה בניסיון הראשון.' + (left < d.q.length ? ' ענית כבר על ' + (d.q.length - left) + '.' : '');
        $('kt-q-start').textContent = left ? (left < d.q.length ? 'להמשיך' : 'להתחיל') : 'לתרגל שוב (בלי נקודות)';
        $('kt-q-box').innerHTML = ''; $('kt-quiz').hidden = false; $('kt-q-start').hidden = false;
      });
    }
    function showQ() {
      var x = QZ.q[qi]; if (!x) return endQ();
      var r = rnd(QZ.v + qi * 97), opts = x.a.map(function (t, i) { return { t: t, ok: i === 0, i: i }; });
      for (var i = opts.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), tmp = opts[i]; opts[i] = opts[j]; opts[j] = tmp; }
      qTries = 0;
      $('kt-q-box').innerHTML = '<p class="kt-pill">שאלה ' + (qi + 1) + ' מתוך ' + QZ.q.length + '</p><p class="kq-q" dir="auto">' + math(x.q) + '</p><div class="kq-opts">' +
        opts.map(function (o) { return '<button type="button" class="kq-o" dir="auto" data-ok="' + (o.ok ? 1 : 0) + '" data-i="' + o.i + '">' + math(o.t) + '</button>'; }).join('') + '</div><p class="kt-ok" id="kq-fb"></p>';
    }
    function endQ() {
      $('kt-q-box').innerHTML = '<p class="kt-msg">🎉 סיימת! ' + qOk + ' תשובות נכונות בניסיון הראשון' + (qOk ? ', ' + qOk * 3 + ' נקודות לכיתה' : '') + '.</p>';
      $('kt-q-start').hidden = false; $('kt-q-start').textContent = 'לתרגל שוב (בלי נקודות)'; loadBoard();
    }
    $('kt-q-start').addEventListener('click', function () {
      if (!QZ) return;
      qi = 0; qOk = 0; $('kt-q-start').hidden = true; used('chashiva_kita', 'quiz'); showQ();
    });
    $('kt-q-box').addEventListener('click', function (e) {
      var b = e.target.closest('.kq-o'); if (!b || b.disabled) return;
      qTries++;
      if (qTries === 1 && me) call('/c/' + me.code + '/ans', { sid: me.sid, token: me.token, v: QZ.v, qi: qi, pick: +b.getAttribute('data-i') });
      if (b.getAttribute('data-ok') === '1') {
        b.classList.add('ok'); $('kt-q-box').querySelectorAll('.kq-o').forEach(function (o) { o.disabled = true; });
        var first = qTries === 1, fresh = !qDone[qi];
        if (first) qOk++;
        if (first && fresh) (window.KITA_Q = window.KITA_Q || []).push({ game: 'kita-quiz', pts: 3, ref: 'q-' + QZ.v + '-' + qi });
        qDone[qi] = 1; lsSet(qKey(), qDone);
        $('kq-fb').textContent = first ? (fresh ? '✓ נכון! +3 נקודות' : '✓ נכון!') : '✓ נכון, בניסיון ' + qTries + '.';
        setTimeout(function () { qi++; showQ(); }, 1100);
      } else { b.classList.add('no'); b.disabled = true; $('kq-fb').textContent = 'לא בדיוק. נסו תשובה אחרת.'; }
    });

    $('kt-leave').addEventListener('click', function () {
      if (!me || !confirm('לצאת מהכיתה ' + (me.name || '') + '? הכינוי והנקודות שלכם יימחקו מהלוח.')) return;
      call('/c/' + me.code + '/leave', { sid: me.sid, token: me.token }).then(function () { lsSet('kita-me', null); me = null; used('chashiva_kita', 'leave'); showMine(); });
    });
    // מורים
    var mine = lsGet('kita-teach', []);
    if (mine.length) {
      $('kt-my-classes').hidden = false;
      $('kt-my-classes').innerHTML = '<b>הכיתות שלי</b>' + mine.map(function (c) { return '<a href="/kelim/chashiva/kita/more/#c=' + c.code + '&k=' + c.key + '">' + esc(c.name) + ' ←<span>' + c.code + '</span></a>'; }).join('');
    }
    $('kt-new').addEventListener('submit', function (e) {
      e.preventDefault();
      var err = $('kt-new-err'), name = $('kt-new-name').value.trim();
      if (!name) { err.textContent = 'כותבים שם לכיתה, למשל ח׳2 מתמטיקה.'; $('kt-new-name').focus(); return; }
      err.textContent = 'פותחים…';
      call('/create', { name: name, teacher: $('kt-new-teacher').value.trim(), period: $('kt-new-period').value }).then(function (d) {
        if (!d.ok) { err.textContent = d.error; return; }
        var L = lsGet('kita-teach', []).filter(function (c) { return c.code !== d.code; });
        L.unshift({ code: d.code, key: d.key, name: name }); lsSet('kita-teach', L);
        used('chashiva_kita', 'create');
        location.href = '/kelim/chashiva/kita/more/#c=' + d.code + '&k=' + d.key + '&new=1';
      });
    });
    showMine();
  }

  // ================= דף המורה =================
  if (page === 'teacher') {
    var hp = new URLSearchParams(location.hash.slice(1)), T = null, data = null, tp = null, gifts = [];
    var list = lsGet('kita-teach', []);
    if (/^\d{6}$/.test(hp.get('c') || '') && hp.get('k')) {
      T = { code: hp.get('c'), key: hp.get('k'), name: '' };
      var old = list.filter(function (c) { return c.code === T.code; })[0]; if (old) T.name = old.name;
      list = [T].concat(list.filter(function (c) { return c.code !== T.code; })); lsSet('kita-teach', list);
    } else if (list.length) { T = list.filter(function (c) { return c.code === hp.get('c'); })[0] || list[0]; history.replaceState(null, '', '#c=' + T.code + '&k=' + T.key); }
    if (!T) { $('kt-nokey').hidden = false; return; }
    var adminUrl = SITE + 'more/#c=' + T.code + '&k=' + T.key;
    var names = lsGet('kita-names-' + T.code, {});
    function nm(r) { return names[r.sid] || r.nick; }

    function admin(act, extra) {
      var b = Object.assign({ key: T.key, act: act, p: tp }, extra || {});
      return call('/c/' + T.code + '/admin', b).then(function (d) {
        if (!d.ok) {
          $('kt-t-err').textContent = d.error;
          if (d._s === 404 || d._s === 403) { if (d._s === 404) lsSet('kita-teach', lsGet('kita-teach', []).filter(function (c) { return c.code !== T.code; })); $('kt-t').hidden = true; $('kt-nokey').hidden = false; $('kt-nokey').querySelector('p').textContent = d.error; }
          return d;
        }
        if (d.deleted) return d;
        data = d; tp = d.p; render(); return d;
      });
    }
    function render() {
      $('kt-t').hidden = false; $('kt-t-err').textContent = '';
      $('kt-t-name').textContent = data.name; $('kt-t-teacher').textContent = data.teacher || 'דף המורה';
      $('kt-t-count').textContent = data.rows.length + ' בכיתה' + (data.locked ? ' · הצטרפות סגורה' : '');
      $('kt-t-code').textContent = T.code;
      if (T.name !== data.name) { T.name = data.name; lsSet('kita-teach', lsGet('kita-teach', []).map(function (c) { return c.code === T.code ? T : c; })); }
      var inv = 'הצטרפו לכיתה "' + data.name + '" במשחקי החשיבה! נכנסים לקישור, בוחרים כינוי, וכל משחק ותרגול מוסיף נקודות ללוח הכיתה 🏆\nקוד הכיתה: ' + T.code + '\n' + SITE + '?c=' + T.code;
      $('kt-t-wa').href = 'https://wa.me/?text=' + encodeURIComponent(inv);
      $('kt-t-self').href = 'https://wa.me/?text=' + encodeURIComponent('קישור הניהול שלי לכיתה "' + data.name + '" (לא לשתף עם אף אחד):\n' + adminUrl);
      var others = lsGet('kita-teach', []).filter(function (c) { return c.code !== T.code; });
      $('kt-t-switch').hidden = !others.length;
      $('kt-t-switch').innerHTML = others.length ? '<b>עוד כיתות שלי</b>' + others.map(function (c) { return '<a href="#c=' + c.code + '&k=' + c.key + '" data-sw>' + esc(c.name) + ' ←<span>' + c.code + '</span></a>'; }).join('') : '';
      tabs($('kt-t-per'), 'data-p', tp, function (p) { tp = p; admin('get'); });
      renderBoard(); goalBox($('kt-t-goal'), T.code, goalOf(data.gifts), data.rows, tp); renderGifts(); renderSet(); renderCerts(); giladGift(); weekly(); calLinks();
    }
    $('kt-t-switch').addEventListener('click', function (e) { if (e.target.closest('[data-sw]')) setTimeout(function () { location.reload(); }, 30); });

    function renderBoard() {
      $('kt-t-board').innerHTML = data.rows.map(function (r) {
        var g = Object.keys(r.games || {}).map(function (k) { return (GAMES[k] || k) + ' ' + r.games[k].p; }).join(' · ');
        return '<li class="' + (r.place === 1 ? 'p1' : '') + '" data-sid="' + esc(r.sid) + '"><span class="pl">' + medal(r.place) + '</span><span class="nk">' + esc(nm(r)) + (names[r.sid] ? '<small>כינוי: ' + esc(r.nick) + '</small>' : '') + (r.crown ? '<small class="crown">👑 ' + esc(r.crown) + '</small>' : '') + fire(r, tp) + '</span><span class="pt">' + (r.pts || '—') + '</span>' +
          (g ? '<span class="kt-games">' + esc(g) + (r.dd ? ' · ימי תרגול: ' + r.dd : '') + '</span>' : '') +
          '<span class="acts no-print"><button type="button" data-a="crown">👑 ' + (r.crown ? 'להוריד כתר' : 'כתר') + '</button><button type="button" data-a="real">✏️ שם אמיתי</button><button type="button" data-a="remove">הסרה</button></span></li>';
      }).join('') || '<li><span class="pl">·</span><span class="nk">עוד אין תלמידים. שולחים לקבוצת הכיתה את הקוד.</span><span></span></li>';
    }
    $('kt-t-board').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-a]'); if (!b) return;
      var sid = b.closest('li').getAttribute('data-sid'), r = data.rows.filter(function (x) { return x.sid === sid; })[0]; if (!r) return;
      var a = b.getAttribute('data-a');
      if (a === 'crown') {
        if (r.crown) { admin('crown', { sid: sid, label: '' }); return; }
        var l = prompt('מה כתוב ליד הכתר?', 'אלופת ' + { week: 'השבוע', month: 'החודש', round: 'הסבב', all: 'הכיתה' }[tp]);
        if (l) { admin('crown', { sid: sid, label: l }); used('chashiva_kita_more', 'crown'); }
      } else if (a === 'real') {
        var n = prompt('השם האמיתי של "' + r.nick + '" לתעודות. נשמר רק בטלפון הזה, לא נשלח לשרת. (ריק = למחוק)', names[sid] || '');
        if (n === null) return; n = n.trim().slice(0, 40);
        if (n) names[sid] = n; else delete names[sid];
        lsSet('kita-names-' + T.code, names); renderBoard(); renderCerts();
      } else if (a === 'remove') {
        if (confirm('להסיר את "' + r.nick + '" מהכיתה? גם הנקודות שלו יימחקו.')) admin('remove', { sid: sid });
      }
    });
    $('kt-t-refresh').addEventListener('click', function () { admin('get'); });

    // ---- מתנות ----
    var PRESETS = [
      { k: 'crown', i: '👑', t: 'כתר בלוח הכיתה', d: 'ליד הכינוי, עד הסבב הבא', who: '1' },
      { k: 'cert', i: '📜', t: 'תעודת הצטיינות', d: 'מודפסת ומוענקת מול הכיתה', who: 'top3' },
      { k: 'magen', i: '⭐', t: 'תוספת במגן', d: 'לפי החלטת המורה ובית הספר', who: '1' },
      { k: 'sweet', i: '🍫', t: 'צ׳ופר מתוק', d: '', who: 'top3' },
      { k: 'song', i: '🎵', t: 'בוחרת שיר או משחק לסוף השיעור', d: '', who: '1' },
      { k: 'hw', i: '📚', t: 'פטור משיעורי בית אחד', d: '', who: 'pts:300' },
      { k: 'parents', i: '💌', t: 'מילה טובה להורים', d: 'הודעה אישית מהמורה הביתה', who: 'top3' }
    ];
    var WHO = [['1', 'מקום ראשון'], ['2', 'מקום שני'], ['3', 'מקום שלישי'], ['top3', 'שלושת הראשונים'], ['pts', 'כל מי שמגיע ל…נקודות'], ['all', 'כל מי שצובר נקודות']];
    function renderGifts() {
      var cur = realG(data.gifts), gl = goalOf(data.gifts);
      $('kt-goal-on').checked = !!gl; $('kt-goal-n').value = gl ? (/^pts:(\d+)/.exec(gl.who) || [0, 2000])[1] : 2000;
      $('kt-goal-p').value = gl && gl.k === 'goalw' ? 'goalw' : 'goalm'; $('kt-goal-d').value = gl ? gl.d || '' : '';
      gifts = PRESETS.map(function (p) { var s = cur.filter(function (g) { return g.k === p.k; })[0]; return Object.assign({}, p, s || {}, { on: !!s }); })
        .concat(cur.filter(function (g) { return g.k === 'other'; }).map(function (g) { return Object.assign({}, g, { on: true }); }));
      drawGifts();
    }
    function drawGifts() {
      $('kt-g-list').innerHTML = gifts.map(function (g, i) {
        var w = /^pts:/.test(g.who) ? 'pts' : g.who, n = /^pts:(\d+)/.exec(g.who);
        return '<div class="kt-preset" data-i="' + i + '"><input type="checkbox" data-f="on" ' + (g.on ? 'checked' : '') + ' aria-label="' + esc(g.t) + '"><div><b>' + esc(g.i) + ' ' + esc(g.t) + '</b></div>' +
          '<div class="pd"><select data-f="who">' + WHO.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === w ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>' +
          '<input type="text" data-f="pts" inputmode="numeric" placeholder="כמה נקודות" value="' + (n ? n[1] : '200') + '"' + (w === 'pts' ? '' : ' hidden') + '>' +
          '<input type="text" data-f="d" maxlength="160" placeholder="פרטים (לא חובה)" value="' + esc(g.d || '') + '"></div></div>';
      }).join('');
    }
    $('kt-g-list').addEventListener('input', function (e) {
      var row = e.target.closest('[data-i]'); if (!row) return;
      var g = gifts[+row.getAttribute('data-i')], f = e.target.getAttribute('data-f');
      if (f === 'on') g.on = e.target.checked;
      if (f === 'd') g.d = e.target.value;
      if (f === 'who' || f === 'pts') {
        var w = row.querySelector('[data-f=who]').value, n = (row.querySelector('[data-f=pts]').value.replace(/\D/g, '') || '200').slice(0, 5);
        g.who = w === 'pts' ? 'pts:' + n : w; row.querySelector('[data-f=pts]').hidden = w !== 'pts';
      }
      if (f !== 'on') { g.on = true; row.querySelector('[data-f=on]').checked = true; }
    });
    $('kt-g-list').addEventListener('change', function (e) { if (e.target.tagName === 'SELECT' || e.target.type === 'checkbox') e.target.dispatchEvent(new Event('input', { bubbles: true })); });
    $('kt-g-add').addEventListener('click', function () {
      var t = $('kt-g-new-t').value.trim(); if (!t) { $('kt-g-new-t').focus(); return; }
      gifts.push({ k: 'other', i: '🎁', t: t, d: '', who: '1', on: true }); $('kt-g-new-t').value = ''; drawGifts();
    });
    $('kt-g-save').addEventListener('click', function () {
      $('kt-g-ok').textContent = ''; $('kt-g-err').textContent = '';
      var out = gifts.filter(function (g) { return g.on; }).map(function (g) { return { k: g.k, i: g.i, t: g.t, d: g.d || '', who: g.who }; });
      var gn = Math.round(+$('kt-goal-n').value.replace(/\D/g, '') || 0);
      if ($('kt-goal-on').checked) {
        if (gn < 50 || gn > 99999) { $('kt-g-err').textContent = 'היעד הכיתתי: בין 50 ל-99,999 נקודות.'; return; }
        out.push({ k: $('kt-goal-p').value, i: '🎯', t: 'יעד כיתתי', d: $('kt-goal-d').value.trim(), who: 'pts:' + gn });
      }
      call('/c/' + T.code + '/admin', { key: T.key, act: 'gifts', gifts: out, p: tp }).then(function (d) {
        if (!d.ok) { $('kt-g-err').textContent = d.error; return; }
        data = d; $('kt-g-ok').textContent = '✓ נשמר. התלמידים רואים עכשיו את המתנות' + ($('kt-goal-on').checked ? ' ואת היעד הכיתתי' : '') + ' מעל הלוח.'; goalBox($('kt-t-goal'), T.code, goalOf(d.gifts), d.rows, tp); used('chashiva_kita_more', 'gifts'); renderCerts();
      });
    });

    // ---- מתנה מגילעד: שובר 50 ₪ למקום הראשון בחודש בכיתה פעילה (6 בחודש). הבקשה בווטסאפ, רק קוד וכינוי ----
    var giftChecked = '';
    function giladGift() {
      if (giftChecked === T.code) return; giftChecked = T.code;
      call('/c/' + T.code + '/admin', { key: T.key, act: 'get', p: 'month' }).then(function (d) {
        if (!d.ok) return;
        var top = d.rows[0], n = d.rows.length, st = $('kt-gilad-st'), btn = $('kt-gilad-btn');
        var ok = n >= 5 && top && top.pts >= 300;
        st.textContent = ok ? '✓ הכיתה עומדת בתנאים החודש. המקום הראשון: "' + top.nick + '" עם ' + top.pts + ' נקודות.'
          : 'החודש: ' + n + ' תלמידים, למקום הראשון ' + (top ? top.pts : 0) + ' נקודות. צריך 5 תלמידים ו-300 נקודות.';
        btn.hidden = !ok;
        if (ok) {
          var mon = new Date().toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
          btn.href = 'https://wa.me/972584049049?text=' + encodeURIComponent('שלום גילעד, אני ' + (d.teacher || 'מורה') + ' מכיתה משחקת "' + d.name + '" (קוד ' + T.code + '). המקום הראשון ב' + mon + ': הכינוי "' + top.nick + '" עם ' + top.pts + ' נקודות, ' + n + ' תלמידים בכיתה. אשמח לשובר המתנה, ואעביר אותו לתלמידה. לבדיקה: https://kelim-kita.gilad4049.workers.dev/c/' + T.code + '/board?p=month');
          btn.onclick = function () { used('chashiva_kita_more', 'gilad-gift'); };
        }
      });
    }

    // ---- סיכום השבוע שעבר (בראש הלוח) + תזכורת ביומן כל יום ראשון ----
    var wkDone = '';
    function weekly() {
      if (wkDone === T.code) return; wkDone = T.code;
      call('/c/' + T.code + '/admin', { key: T.key, act: 'get', p: 'prevweek' }).then(function (d) {
        var box = $('kt-wk');
        if (!d.ok || d.p !== 'prevweek') { box.hidden = true; return; } // שרת ישן בלי "השבוע שעבר"
        var top = d.rows.filter(function (r) { return r.pts > 0 && r.place <= 3; });
        if (!top.length) { box.hidden = true; return; }
        var act = d.rows.filter(function (r) { return r.pts > 0; }).length, pers = d.rows.filter(function (r) { return isPersist(r, 'prevweek'); });
        var due = realG(d.gifts).map(function (g) {
          var m = /^pts:(\d+)$/.exec(g.who), win = d.rows.filter(function (r) { return r.pts > 0 && (g.who === 'all' || (m ? r.pts >= +m[1] : g.who === 'top3' ? r.place <= 3 : r.place === +g.who)); });
          return win.length ? g.i + ' ' + g.t + ': ' + win.map(function (r) { return nm(r); }).join(', ') : '';
        }).filter(Boolean);
        box.innerHTML = '<b>📅 סיכום השבוע שעבר</b> · ' + act + ' מתוך ' + d.rows.length + ' צברו נקודות<ol class="kt-list">' + top.map(function (r) { return '<li>' + medal(r.place) + ' ' + esc(nm(r)) + ' · ' + r.pts + '</li>'; }).join('') + '</ol>' + (pers.length ? '<b>🔥 התמידו (5 ימים ומעלה):</b> ' + pers.map(function (r) { return esc(nm(r)); }).join(', ') + '<br>' : '') +
          (due.length ? '<b>מה מגיע:</b><ul class="kt-list">' + due.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') +
          '<div class="kt-btns"><a class="btn btn-gold btn-sm" id="kt-wk-wa" target="_blank" rel="noopener" href="#"><svg class="ic"><use href="#wa"/></svg> לברך את הכיתה</a></div>';
        var msg = '🏆 סיכום השבוע ב' + d.name + ':\n' + top.map(function (r) { return medal(r.place) + ' ' + r.nick + ' – ' + r.pts + ' נקודות'; }).join('\n') + (pers.length ? '\n🔥 התמידו כל השבוע: ' + pers.map(function (r) { return r.nick; }).join(', ') : '') + '\nכל הכבוד! ' + act + ' מתוך ' + d.rows.length + ' צברו השבוע. שבוע חדש התחיל, כולם מתחילים מאפס 💪\n' + SITE;
        box.querySelector('#kt-wk-wa').href = 'https://wa.me/?text=' + encodeURIComponent(msg);
        box.querySelector('#kt-wk-wa').onclick = function () { used('chashiva_kita_more', 'weekly-wa'); };
        box.hidden = false;
      });
    }
    function nextSunday8() { var d = new Date(); d.setHours(8, 0, 0, 0); d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7)); return d; }
    function ymd(d) { return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0'); }
    function calLinks() {
      var d = nextSunday8(), day = ymd(d), url = SITE + 'more/#c=' + T.code, title = 'כיתה משחקת – סיכום השבוע של ' + (data.name || ''), det = 'מי הובילו השבוע ומה מגיע להן: ' + url;
      $('kt-cal-g').href = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(title) + '&details=' + encodeURIComponent(det) + '&dates=' + day + 'T080000/' + day + 'T081500&ctz=Asia/Jerusalem&recur=' + encodeURIComponent('RRULE:FREQ=WEEKLY;BYDAY=SU');
    }
    $('kt-cal-g').addEventListener('click', function () { used('chashiva_kita_more', 'cal-google'); });
    $('kt-cal-ics').addEventListener('click', function () {
      var d = nextSunday8(), day = ymd(d), url = SITE + 'more/#c=' + T.code;
      var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//kelim//kita//HE', 'BEGIN:VEVENT', 'UID:kita-' + T.code + '@hakelim.com', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z',
        'DTSTART;TZID=Asia/Jerusalem:' + day + 'T080000', 'DURATION:PT15M', 'RRULE:FREQ=WEEKLY;BYDAY=SU', 'SUMMARY:כיתה משחקת – סיכום השבוע של ' + (data.name || ''), 'DESCRIPTION:מי הובילו השבוע ומה מגיע להן', 'URL:' + url,
        'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:כיתה משחקת', 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })); a.download = 'kita-' + T.code + '.ics'; document.body.appendChild(a); a.click(); a.remove();
      used('chashiva_kita_more', 'cal-ics');
    });

    // ---- תעודות ----
    function certRows() {
      var w = $('kt-c-who').value;
      if (w === 'persist') return data.rows.filter(function (r) { return r.pts > 0 && isPersist(r, tp); });
      return data.rows.filter(function (r) { return r.pts > 0 && (w === 'all' || (w === '1' ? r.place === 1 : r.place >= 1 && r.place <= 3)); });
    }
    function giftFor(r) {
      return realG(data.gifts).filter(function (g) {
        if (g.k === 'crown' || g.k === 'cert' || g.k === 'magen') return false;
        var m = /^pts:(\d+)$/.exec(g.who);
        return g.who === 'all' || (m ? r.pts >= +m[1] : g.who === 'top3' ? r.place <= 3 : +g.who === r.place);
      }).map(function (g) { return g.i + ' ' + g.t; }).join(' · ');
    }
    function renderCerts() {
      if (!data) return;
      var rows = certRows(), st = $('kt-c-style').value, what = $('kt-c-what').value.trim(), dt = new Date().toLocaleDateString('he-IL');
      $('kt-c-out').innerHTML = rows.map(function (r) {
        var g = giftFor(r);
        return '<div class="kt-cert ' + st + '"><span class="c-bsd">בס״ד</span><div class="c-t">תעודת הצטיינות</div><div class="c-to">מוענקת בהוקרה ל</div><div class="c-n">' + esc(nm(r)) + '</div>' +
          '<div class="c-w">' + esc(what) + '<br>' + ($('kt-c-who').value === 'persist' ? 'תרגלה ב-' + r.dd + ' ימים ' + PER[tp] + ' בכיתה ' + esc(data.name) + '</div>' : (r.place <= 3 ? 'במקום ה' + ['', 'ראשון', 'שני', 'שלישי'][r.place] : 'במקום ה-' + r.place) + ' בכיתה ' + esc(data.name) + ', ' + PER[tp] + ': ' + r.pts + ' נקודות</div>') +
          (g ? '<div class="c-g">' + esc(g) + '</div>' : '') +
          '<div class="c-sig"><span>' + esc(data.teacher || 'המורה') + '</span><span>' + dt + '</span></div></div>';
      }).join('') || '<p class="kt-note">עוד אין נקודות בלוח ' + PER[tp] + '. אפשר להחליף בלשונית הלוח ל"החודש" או "מההתחלה".</p>';
    }
    ['kt-c-who', 'kt-c-style', 'kt-c-what'].forEach(function (id) { $(id).addEventListener('input', renderCerts); $(id).addEventListener('change', renderCerts); });
    function printWith(cls, how) {
      document.body.classList.add(cls); used('chashiva_kita_more', how);
      var done = function () { document.body.classList.remove(cls); window.removeEventListener('afterprint', done); };
      window.addEventListener('afterprint', done); window.print(); setTimeout(done, 60000);
    }
    $('kt-c-print').addEventListener('click', function () { if (!certRows().length) { renderCerts(); return; } printWith('kt-printing-cert', 'print-cert'); });

    // ---- מודעה לכיתה ----
    $('kt-t-poster-btn').addEventListener('click', function () {
      $('kt-poster').innerHTML = '<div class="p-h">🏆 ' + esc(data.name) + ': כיתה משחקת</div><div>כל משחק ותרגול מוסיף נקודות ללוח הכיתה</div><div class="p-code">' + T.code + '</div>' +
        '<ol><li>נכנסים ל: <span class="p-url">hakelim.com/kelim/chashiva/kita</span></li><li>כותבים את הקוד למעלה</li><li>בוחרים כינוי (לא שם מלא)</li><li>משחקים, מתרגלים וצוברים!</li></ol>' +
        (realG(data.gifts).length ? '<div><b>על מה מתחרים:</b> ' + realG(data.gifts).map(function (g) { return esc(g.i + ' ' + g.t); }).join(' · ') + '</div>' : '');
      $('kt-poster-sec').hidden = false; $('kt-poster-sec').scrollIntoView({ behavior: 'smooth' }); used('chashiva_kita_more', 'poster');
    });
    $('kt-p-print').addEventListener('click', function () { printWith('kt-printing-poster', 'print-poster'); });
    $('kt-p-close').addEventListener('click', function () { $('kt-poster-sec').hidden = true; });

    // ---- הגדרות ----
    function renderSet() {
      $('kt-s-name').value = data.name; $('kt-s-teacher').value = data.teacher || ''; $('kt-s-period').value = data.period;
      $('kt-s-msg').value = data.msg || ''; $('kt-s-lock').checked = !!data.locked;
    }
    $('kt-s-form').addEventListener('submit', function (e) {
      e.preventDefault(); $('kt-s-ok').textContent = ''; $('kt-s-err').textContent = '';
      call('/c/' + T.code + '/admin', { key: T.key, act: 'settings', p: tp, name: $('kt-s-name').value, teacher: $('kt-s-teacher').value, period: $('kt-s-period').value, msg: $('kt-s-msg').value, locked: $('kt-s-lock').checked }).then(function (d) {
        if (!d.ok) { $('kt-s-err').textContent = d.error; return; }
        data = d; render(); $('kt-s-ok').textContent = '✓ נשמר'; used('chashiva_kita_more', 'settings');
      });
    });
    $('kt-s-round').addEventListener('click', function () {
      if (!confirm('להתחיל סבב חדש? לוח "מהסבב" יתאפס והכתרים יורדו. הנקודות הקודמות נשארות ב"מההתחלה".')) return;
      tp = 'round'; admin('round').then(function () { used('chashiva_kita_more', 'round'); });
    });
    $('kt-s-delete').addEventListener('click', function () {
      var c = prompt('מחיקה לגמרי של הכיתה "' + data.name + '", כולל כל הכינויים והנקודות. אי אפשר לשחזר.\nכדי לאשר, כתבו את קוד הכיתה: ' + T.code);
      if (c !== T.code) return;
      admin('delete').then(function (d) {
        if (!d.deleted) return;
        lsSet('kita-teach', lsGet('kita-teach', []).filter(function (x) { return x.code !== T.code; })); lsSet('kita-names-' + T.code, null);
        $('kt-t').hidden = true; $('kt-nokey').hidden = false; $('kt-nokey').querySelector('h2').textContent = 'הכיתה נמחקה';
        history.replaceState(null, '', location.pathname);
      });
    });

    // ---- לשוניות ----
    function tab(t) {
      tabs($('kt-t-tabs'), 'data-tab', t, tab);
      app.querySelectorAll('[data-panel]').forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== t; });
      if (t === 'cert') renderCerts();
      if (t === 'school') school();
      if (t === 'quiz') { quizFill(); quizStats(); bankLoad(); }
    }

    // ---- שאלות של המורה: שורה = שאלה | נכונה | שגויה...
    function quizParse() {
      var bad = [], out = $('kt-q-text').value.split(/\n/).map(function (l) { return l.trim(); }).filter(Boolean).map(function (l, i) {
        var p = l.split('|').map(function (x) { return x.trim(); }).filter(Boolean);
        if (p.length < 3) bad.push(i + 1);
        return { q: p[0], a: p.slice(1, 5) };
      });
      return { q: out, bad: bad };
    }
    function quizFill() {
      var z = data && data.quiz;
      if (z && !$('kt-q-text').value) { $('kt-q-name').value = z.t; $('kt-q-text').value = z.q.map(function (x) { return [x.q].concat(x.a).join(' | '); }).join('\n'); }
      quizPrev();
    }
    function quizStats() {
      var z = data && data.quiz, st = (data && data.qstats) || [], box = $('kt-q-stats');
      if (!z || !st.some(function (x) { return x.n; })) { box.innerHTML = z ? '<p class="kt-note">עוד אף תלמידה לא ענתה. כאן יופיע כמה צדקו בכל שאלה.</p>' : ''; return; }
      var hard = [];
      box.innerHTML = '<h3>📊 מה קשה לכיתה</h3>' + z.q.map(function (q, i) {
        var x = st[i] || { n: 0, ok: 0, picks: {} }, pc = x.n ? Math.round(x.ok * 100 / x.n) : 0, top = null;
        Object.keys(x.picks).forEach(function (k) { if (!top || x.picks[k] > x.picks[top]) top = k; });
        if (x.n && pc < 60) hard.push(i + 1);
        return '<div class="kq-st' + (x.n && pc < 60 ? ' hard' : '') + '"><div dir="auto"><b>' + (i + 1) + '.</b> ' + math(q.q) + '</div>' +
          (x.n ? '<div class="kt-goal-bar"><span style="width:' + pc + '%"></span></div><small>' + x.ok + ' מתוך ' + x.n + ' צדקו בניסיון הראשון (' + pc + '%)' + (top ? ' · הטעות הנפוצה: <span dir="auto">' + math(q.a[top]) + '</span> (' + x.picks[top] + ')' : '') + '</small>' : '<small>עוד לא ענו</small>') + '</div>';
      }).join('') + (hard.length ? '<p class="kt-warn">כדאי להסביר שוב: שאלה ' + hard.join(', ') + '. פחות מ-60% צדקו בה בניסיון הראשון.</p>' : '<p class="kt-ok">✓ רוב הכיתה צדקה בכל השאלות.</p>');
    }
    function quizPrev() {
      var r = quizParse();
      $('kt-q-prev').textContent = r.q.length ? r.q.length + ' שאלות' + (r.q.length > 20 ? ' (נשמרות רק 20 הראשונות)' : '') + (data && data.quiz ? ' · כרגע מפורסמות ' + data.quiz.q.length : '') : (data && data.quiz ? 'כרגע מפורסמות ' + data.quiz.q.length + ' שאלות' : '');
      $('kt-q-err').textContent = r.bad.length ? 'בשורה ' + r.bad.join(', ') + ' חסר: צריך שאלה, תשובה נכונה ולפחות תשובה שגויה אחת, מופרדות ב-|' : '';
    }
    $('kt-q-text').addEventListener('input', quizPrev);
    // ---- בנק שאלות מוכן (assets/kita-bank.json, נוצר ב-tools/gen_kita_bank.py). נטען רק כשפותחים את לשונית השאלות ----
    var bank = null, bankP = null;
    function bankLoad() {
      if (bankP) return bankP;
      bankP = fetch('/assets/kita-bank.json').then(function (r) { if (!r.ok) throw new Error('bank'); return r.json(); }).then(function (j) {
        bank = j; var sel = $('kt-bank-t'), g = { math: 'מתמטיקה', eng: 'אנגלית' };
        sel.innerHTML = '<option value="">בוחרים נושא…</option>' + Object.keys(g).map(function (s) {
          return '<optgroup label="' + g[s] + '">' + j.topics.filter(function (t) { return t.subj === s; }).map(function (t) { return '<option value="' + esc(t.id) + '">' + esc(t.name) + '</option>'; }).join('') + '</optgroup>';
        }).join('');
        $('kt-bank-go').disabled = false;
      }).catch(function () { bankP = null; $('kt-bank-t').innerHTML = '<option value="">הבנק לא נטען. נסו לפתוח שוב את הלשונית.</option>'; });
      return bankP;
    }
    // seen = שאלות שהמורה כבר קיבלה בנושא (בטלפון הזה) + מה שמפורסם עכשיו. "עוד 10" בוחר מהשאר, וכשנגמרות מתחילים סבב חדש
    var bankLast = null, bankText = '';
    function bankSeen(id) { var s = lsGet('kita-bank-seen', {}); return s[id] || []; }
    function bankFill(t, more) {
      var cur = $('kt-q-text').value.trim();
      if (cur && cur !== bankText && !confirm('להחליף את השאלות שבתיבה ב-10 ' + (more ? 'שאלות אחרות' : 'שאלות') + ' על ' + t.name + '?')) return;
      var pick = bank.pick || 10, pub = (data && data.quiz ? data.quiz.q : []).map(function (x) { return [x.q].concat(x.a).join(' | '); });
      var seen = bankSeen(t.id).concat(pub, cur.split('\n'));
      function mix(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), tmp = a[i]; a[i] = a[j]; a[j] = tmp; } return a; }
      var fresh = mix(t.q.filter(function (r) { return seen.indexOf(r) < 0; })), round = fresh.length < pick;
      // נגמרו החדשות: כל מה שנשאר + השלמה מהישנות (לא מהתיבה), והסבב מתחיל מחדש
      var got = round ? fresh.concat(mix(t.q.filter(function (r) { return fresh.indexOf(r) < 0 && cur.split('\n').indexOf(r) < 0; }))).slice(0, pick) : fresh.slice(0, pick);
      var all = lsGet('kita-bank-seen', {});
      all[t.id] = (round ? [] : bankSeen(t.id)).concat(got); lsSet('kita-bank-seen', all);
      bankText = got.join('\n'); bankLast = t;
      $('kt-q-text').value = bankText; $('kt-q-name').value = t.name;
      var left = t.q.filter(function (r) { return all[t.id].indexOf(r) < 0 && pub.indexOf(r) < 0; }).length;
      $('kt-bank-more').hidden = false; $('kt-bank-more').textContent = '🔄 עוד 10 אחרות על ' + t.name;
      quizPrev(); $('kt-q-prev').textContent = '✓ נכנסו ' + got.length + ' שאלות על ' + t.name + (round ? ' (התחלנו סבב חדש של הנושא)' : '') + '. נשארו עוד ' + left + ' שלא קיבלתם. אפשר לערוך, ואז "לשמור ולפרסם לכיתה".';
      $('kt-q-text').focus(); used('chashiva_kita_more', (more ? 'bank-more-' : 'bank-') + t.id);
    }
    $('kt-bank-go').addEventListener('click', function () {
      var id = $('kt-bank-t').value, t = bank && bank.topics.filter(function (x) { return x.id === id; })[0];
      if (!t) { $('kt-q-err').textContent = 'בוחרים נושא מהרשימה.'; return; }
      bankFill(t, false);
    });
    $('kt-bank-more').addEventListener('click', function () { if (bankLast) bankFill(bankLast, true); });
    function quizSave(q) {
      $('kt-q-err').textContent = '';
      call('/c/' + T.code + '/admin', { key: T.key, act: 'quiz', p: tp, title: $('kt-q-name').value, q: q }).then(function (d) {
        if (!d.ok) { $('kt-q-err').textContent = d.error; return; }
        data = d; $('kt-q-prev').textContent = q.length ? '✓ פורסם. התלמידות רואות עכשיו ' + q.length + ' שאלות בדף הכיתה.' : '✓ השאלות הורדו.';
        used('chashiva_kita_more', q.length ? 'quiz-save' : 'quiz-clear');
      });
    }
    $('kt-q-save').addEventListener('click', function () {
      var r = quizParse();
      if (!r.q.length) { $('kt-q-err').textContent = 'כותבים לפחות שאלה אחת.'; return; }
      if (r.bad.length) { quizPrev(); return; }
      quizSave(r.q.slice(0, 20));
    });
    // דף עבודה להדפסה: השאלות עוברות למחולל דפי העבודה (/limudim/dapim/) דרך localStorage, באותו אתר
    $('kt-q-print').addEventListener('click', function () {
      var r = quizParse();
      if (!r.q.length) { $('kt-q-err').textContent = 'קודם בוחרים נושא מהבנק או כותבים שאלות, ואז מדפיסים.'; return; }
      if (r.bad.length) { quizPrev(); return; }
      lsSet('dapim-import', { title: $('kt-q-name').value.trim(), q: r.q.slice(0, 20).map(function (x) { return { t: x.q, a: x.a[0], o: x.a.slice(1) }; }) });
      used('chashiva_kita_more', 'print-dapim');
      var w = window.open('/limudim/dapim/?from=kita', '_blank');
      if (!w) location.href = '/limudim/dapim/?from=kita';
    });
    $('kt-q-clear').addEventListener('click', function () { if (confirm('להוריד את השאלות מדף הכיתה?')) { $('kt-q-text').value = ''; quizSave([]); } });

    // ---- הכיתות זו מול זו: הכיתות שלי (kita-teach) + כיתות שהוספתי לפי קוד (kita-watch). קריאה מהלוח הציבורי בלבד ----
    var scPer = 'week', scRows = [];
    function school() {
      tabs($('kt-sc-per'), 'data-p', scPer, function (p) { scPer = p; school(); });
      var mine = lsGet('kita-teach', []).map(function (c) { return { code: c.code, mine: 1 }; });
      var all = mine.concat(lsGet('kita-watch', []).filter(function (c) { return !mine.some(function (m) { return m.code === c; }); }).map(function (c) { return { code: c }; }));
      $('kt-sc-list').innerHTML = '<li><span class="pl">…</span><span class="nk">טוען ' + all.length + ' כיתות</span><span></span></li>';
      Promise.all(all.map(function (c) { return call('/c/' + c.code + '/board?p=' + scPer).then(function (d) { return { c: c, d: d }; }); })).then(function (res) {
        var gone = res.filter(function (x) { return !x.d.ok && x.d._s === 404 && !x.c.mine; }).map(function (x) { return x.c.code; });
        if (gone.length) lsSet('kita-watch', lsGet('kita-watch', []).filter(function (c) { return gone.indexOf(c) < 0; }));
        scRows = res.filter(function (x) { return x.d.ok; }).map(function (x) {
          var rows = x.d.rows, sum = rows.reduce(function (a, r) { return a + r.pts; }, 0), act = rows.filter(function (r) { return r.pts > 0; }).length;
          return { code: x.c.code, mine: x.c.mine, name: x.d.name, teacher: x.d.teacher, n: rows.length, act: act, sum: sum, avg: rows.length ? Math.round(sum / rows.length) : 0, top: rows[0] && rows[0].pts ? rows[0] : null };
        }).sort(function (a, b) { return b.avg - a.avg || b.sum - a.sum; });
        var place = 0, prev = -1;
        $('kt-sc-list').innerHTML = scRows.map(function (r, i) {
          if (r.avg !== prev) { place = i + 1; prev = r.avg; }
          return '<li class="' + (r.code === T.code ? 'me ' : '') + (place === 1 && r.avg ? 'p1' : '') + '"><span class="pl">' + (r.avg ? medal(place) : '·') + '</span><span class="nk">' + esc(r.name) + '<small>' + esc(r.teacher || '') + (r.teacher ? ' · ' : '') + r.n + ' תלמידים, ' + r.act + ' צברו · סה״כ ' + r.sum + (r.top ? ' · מובילה: ' + esc(r.top.nick) : '') + (r.mine ? '' : ' · קוד ' + r.code) + '</small></span><span class="pt">' + r.avg + '<small style="display:block;font-size:.7rem;font-weight:400;color:var(--muted)">לתלמיד</small></span>' +
            (r.mine ? '' : '<span class="acts no-print"><button type="button" data-rm="' + r.code + '">להוריד מההשוואה</button></span>') + '</li>';
        }).join('') || '<li><span class="pl">·</span><span class="nk">עוד אין כיתות להשוואה</span><span></span></li>';
        var lead = scRows[0];
        $('kt-sc-wa').href = 'https://wa.me/?text=' + encodeURIComponent('🏆 הכיתות ' + PER[scPer] + ' (ממוצע נקודות לתלמיד):\n' + scRows.map(function (r, i) { return (i + 1) + '. ' + r.name + ': ' + r.avg; }).join('\n') + (lead && lead.avg ? '\nכל הכבוד ל' + lead.name + '! 👏' : '') + '\n' + SITE);
      });
    }
    $('kt-sc-list').addEventListener('click', function (e) {
      var b = e.target.closest('[data-rm]'); if (!b) return;
      lsSet('kita-watch', lsGet('kita-watch', []).filter(function (c) { return c !== b.getAttribute('data-rm'); })); school();
    });
    $('kt-sc-add').addEventListener('click', function () {
      var c = $('kt-sc-code').value.replace(/\D/g, ''), err = $('kt-sc-err'); err.textContent = '';
      if (c.length !== 6) { err.textContent = 'קוד כיתה הוא 6 ספרות.'; return; }
      call('/c/' + c + '/info').then(function (d) {
        if (!d.ok) { err.textContent = d.error; return; }
        var W = lsGet('kita-watch', []); if (W.indexOf(c) < 0) W.push(c); lsSet('kita-watch', W.slice(-30));
        $('kt-sc-code').value = ''; used('chashiva_kita_more', 'school-add'); school();
      });
    });
    $('kt-sc-wa').addEventListener('click', function () { used('chashiva_kita_more', 'school-wa'); });
    tab('board');
    $('kt-t-copy').addEventListener('click', function () {
      var ok = function () { $('kt-t-copied').textContent = '✓ הקישור הועתק. שומרים אותו במקום בטוח.'; };
      if (navigator.clipboard) navigator.clipboard.writeText(adminUrl).then(ok, function () { prompt('להעתיק:', adminUrl); }); else prompt('להעתיק:', adminUrl);
    });
    $('kt-t-wa').addEventListener('click', function () { used('chashiva_kita_more', 'wa'); });
    if (hp.get('new')) { $('kt-t-save').scrollIntoView(); history.replaceState(null, '', '#c=' + T.code + '&k=' + T.key); }
    admin('get');
  }

  // ================= דף להורים: קורא את הלוח הציבורי לפי קוד הכיתה ומזהה התלמיד/ה (sid, לא האסימון) =================
  if (page === 'parent') {
    var ph = new URLSearchParams(location.hash.slice(1)), pc = ph.get('c') || '', ps = ph.get('s') || '';
    if (!/^\d{6}$/.test(pc) || !/^[a-z0-9]{6,20}$/.test(ps)) { $('kh-none').hidden = false; return; }
    Promise.all([call('/c/' + pc + '/board?p=week'), call('/c/' + pc + '/board?p=month')]).then(function (res) {
      var w = res[0], m = res[1];
      if (!w.ok) { $('kh-none').hidden = false; $('kh-none').querySelector('p').textContent = w.error; return; }
      var r = w.rows.filter(function (x) { return x.sid === ps; })[0], rm = m.ok ? m.rows.filter(function (x) { return x.sid === ps; })[0] : null;
      if (!r) { $('kh-none').hidden = false; $('kh-none').querySelector('h2').textContent = 'הכינוי כבר לא בכיתה'; $('kh-none').querySelector('p').textContent = 'אולי יצאו מהכיתה או שהמורה הסירה אותו. אפשר להצטרף שוב עם הקוד מהמורה.'; return; }
      $('kh-main').hidden = false;
      $('kh-title').textContent = 'ההתקדמות של ' + r.nick;
      $('kh-sub').textContent = 'בכיתה ' + w.name + '. כל משחק ותרגול באתר מוסיף נקודות ללוח של הכיתה.';
      $('kh-class').textContent = w.name; $('kh-teacher').textContent = w.teacher || 'הכיתה'; $('kh-nick').textContent = 'הכינוי: ' + r.nick;
      $('kh-week').textContent = r.pts; $('kh-days').textContent = r.dd !== undefined ? r.dd : '—'; $('kh-month').textContent = rm ? rm.pts : '—';
      $('kh-place').textContent = r.place ? medal(r.place) : '—';
      $('kh-place-l').textContent = r.place ? 'מקום בכיתה, מתוך ' + w.rows.length : 'עוד לא צברו השבוע';
      var b = [];
      if (r.crown) b.push('👑 ' + r.crown);
      if (isPersist(r, 'week')) b.push('🔥 תג התמדה השבוע: תרגלו ב-' + r.dd + ' ימים');
      else if (r.dd !== undefined) b.push('🔥 עוד ' + (5 - r.dd) + ' ימי תרגול השבוע לתג ההתמדה');
      if (rm && isPersist(rm, 'month')) b.push('🔥 מתמידים גם החודש: ' + rm.dd + ' ימים');
      $('kh-badges').textContent = b.join(' · '); $('kh-badges').hidden = !b.length;
      goalBox($('kh-goal'), pc, goalOf(w.gifts), w.rows, 'week');
      if (w.msg) { $('kh-msg').textContent = '📣 מהמורה: ' + w.msg; $('kh-msg').hidden = false; }
      used('chashiva_kita_horim', 'view');
    });
  }
})();
