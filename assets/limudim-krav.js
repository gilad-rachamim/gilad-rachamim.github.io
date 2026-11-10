// דו-קרב עם חבר: מנוע משותף לשלושה דפים.
//   /limudim/krav/          – דו-קרב מתמטיקה לבגרות (תרגילים מהמחוללים של limudim-math.js, פתרון צעד אחרי צעד)
//   /limudim/krav-anglit/   – דו-קרב אנגלית לבגרות (assets/limudim-krav-anglit.js)
//   /kelim/chashiva/chidon/ – חידון וטריוויה (KAHOOT_BANK + chashiva-chidon-data.js), חידון יומי של 10 שאלות
// אותו זרע = אותן שאלות בכל טלפון. הקישור לחבר (?krav=) נושא את הזרע, הרמה, מועד הסיום ולוח התוצאות.
// אין שרת: כל מי ששולח תוצאה מוסיף את עצמו ללוח שבתוך הקישור, כך שבקבוצה הקישור האחרון מראה את כולם.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var app = $('kv-app'); if (!app || !window.CH || !window.PTS) return;
  var SUBJ = app.getAttribute('data-subject'); // math | eng | trivia
  var esc = CH.esc;

  // ---------- הגדרות לכל מקצוע ----------
  var CFG = {
    math: { tool: 'krav_math', src: 'krav-math', name: 'דו-קרב מתמטיקה', what: 'תרגילים', one: 'תרגיל', race: true,
      levels: [[3, '3 יח״ל'], [4, '4 יח״ל'], [5, '5 יח״ל']], par: { 3: 60, 4: 90, 5: 120 } },
    eng: { tool: 'krav_eng', src: 'krav-eng', name: 'דו-קרב אנגלית', what: 'שאלות', one: 'שאלה', race: true,
      levels: [[3, '3 יח״ל'], [4, '4 יח״ל'], [5, '5 יח״ל']], par: { 3: 15, 4: 15, 5: 15 } },
    trivia: { tool: 'chashiva_chidon', src: 'chidon', name: 'חידון וטריוויה', what: 'שאלות', one: 'שאלה', race: false, n: 10,
      levels: [[0, 'הכול']], par: { 0: 12 } }
  }[SUBJ];
  if (!CFG) return;
  var DURS = [[60, 'שעה'], [20, '20 דקות'], [10, '10 דקות']];

  // ---------- שמירה ----------
  var KEY = 'limudim-krav';
  function load() { try { var o = JSON.parse(localStorage.getItem(KEY) || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } }
  function save(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }
  function getRun(seed) { var o = load(); return (o.runs || {})[seed] || null; }
  function putRun(seed, r) {
    var o = load(); o.runs = o.runs || {}; r.at = Date.now(); o.runs[seed] = r;
    var ks = Object.keys(o.runs).sort(function (a, b) { return o.runs[a].at - o.runs[b].at; });
    while (ks.length > 30) delete o.runs[ks.shift()];
    o.lv = o.lv || {}; if (r.u) o.lv[SUBJ] = r.u; save(o);
  }
  function nowMin() { return Math.floor(Date.now() / 60000); }

  // ---------- קישור ----------
  function b64e(s) { return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function b64d(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return decodeURIComponent(escape(atob(s))); }
  var IN = (function () {
    try {
      var q = new URLSearchParams(location.search).get('krav'); if (!q) return null;
      var o = JSON.parse(b64d(q)); if (!o || o.g !== SUBJ || typeof o.s !== 'string' || o.s.length > 40) return null;
      o.r = (Array.isArray(o.r) ? o.r : []).filter(function (x) { return Array.isArray(x) && x.length >= 5; }).slice(0, 30).map(function (x) {
        return [String(x[0]).slice(0, 8), PTS.clean(x[1]) || 'חבר/ה', Math.max(0, x[2] | 0), Math.max(0, x[3] | 0), Math.max(0, x[4] | 0)];
      });
      o.u = o.u | 0; o.e = o.e | 0; o.m = PTS.clean(o.m);
      return o;
    } catch (e) { return null; }
  })();
  function link(p) {
    return location.origin + location.pathname + '?krav=' + b64e(JSON.stringify(p)) + '&utm_source=share&utm_medium=friend&utm_campaign=krav_' + SUBJ;
  }
  // לוח: [pid, כינוי, נקודות, נפתרו, ניסו]. מיזוג לפי pid, שומרים את הגבוה.
  function mergeBoard(a, b) {
    var m = {};
    a.concat(b).forEach(function (x) { if (!x) return; var o = m[x[0]]; if (!o || x[2] > o[2] || (x[2] === o[2] && x[4] >= o[4])) m[x[0]] = x; }); // שווה: החדש (עם הכינוי המעודכן) גובר
    return Object.keys(m).map(function (k) { return m[k]; }).sort(function (x, y) { return y[2] - x[2] || y[3] - x[3]; }).slice(0, 30);
  }
  function boardHtml(board, mePid, title) {
    if (!board.length) return '';
    var medal = ['🥇', '🥈', '🥉'];
    return '<div class="kv-board"><b>' + (title || '🏆 לוח התוצאות') + '</b><ol>' + board.map(function (x, i) {
      return '<li' + (x[0] === mePid ? ' class="me"' : '') + '><span class="pl">' + (medal[i] || (i + 1) + '.') + '</span><span class="nm">' + esc(x[1]) + (x[0] === mePid ? ' (אתם)' : '') + '</span><span class="sc"><b>' + x[2] + '</b> נק׳ · ' + x[3] + '/' + x[4] + '</span></li>';
    }).join('') + '</ol></div>';
  }

  // =====================================================================
  //  מחוללי שאלות
  // =====================================================================
  // שאלה: {type:'steps', html, steps:[{show,q,a,tol,fr}], fin, topic} או {type:'mc', html, ch:[...], ans, why, ltr}
  function withRandom(rnd, fn) { var orig = Math.random; Math.random = rnd; try { return fn(); } finally { Math.random = orig; } }
  var MATH = null;
  function mathTopics(u) {
    var T = (window.MX && window.MX.T) || [];
    var has = function (t, pre) { return (t.q || []).some(function (q) { return pre.some(function (p) { return q.indexOf(p) === 0; }); }); };
    if (u === 3) return T.filter(function (t) { return has(t, ['351', '353']); });
    if (u === 4) return T.filter(function (t) { return has(t, ['354']); });
    var five = T.filter(function (t) { return has(t, ['355']); });
    return five.concat(five, T.filter(function (t) { return has(t, ['354']) && !has(t, ['355']); }));
  }
  function makeMath(seed, i, u) {
    if (!MATH || MATH.seed !== seed) { var ts = mathTopics(u); MATH = { seed: seed, order: CH.shuffle(ts, CH.rng(seed + '|order')) }; }
    var ord = MATH.order; if (!ord.length) return null;
    // סבב שלם על כל הנושאים, ואז סדר חדש – כך לא חוזר אותו נושא פעמיים ברצף
    var round = Math.floor(i / ord.length), t = round ? CH.shuffle(ord, CH.rng(seed + '|order' + round))[i % ord.length] : ord[i % ord.length];
    var lv = u === 3 ? 2 : 3;
    var p = withRandom(CH.rng(seed + '|' + i), function () { return t.gen(lv); });
    return { type: 'steps', html: p.ex, steps: p.steps, fin: p.fin, topic: t.name, em: t.em };
  }
  function pickDistinct(rnd, pool, n, avoid) {
    var out = [], seen = {}; avoid.forEach(function (a) { seen[a] = 1; });
    var sh = CH.shuffle(pool, rnd);
    for (var k = 0; k < sh.length && out.length < n; k++) if (!seen[sh[k]]) { seen[sh[k]] = 1; out.push(sh[k]); }
    return out;
  }
  function mc(rnd, html, right, wrongs, why, extra) {
    var ch = CH.shuffle([right].concat(wrongs.slice(0, 3)), rnd);
    return Object.assign({ type: 'mc', html: html, ch: ch, ans: ch.indexOf(right), why: why || '' }, extra || {});
  }
  // ---------- אנגלית ----------
  var ENG = null;
  function engPools(u) {
    var E = window.KRAV_ENG || { words: [], sent: [], read: [] }, L = u === 3 ? [1] : u === 4 ? [1, 2] : [2, 3];
    var ok = function (x) { return L.indexOf(x.l) > -1; };
    return { words: E.words.filter(ok), sent: E.sent.filter(ok), read: E.read.filter(ok) };
  }
  function makeEng(seed, i, u) {
    if (!ENG || ENG.seed !== seed) { var P = engPools(u); ENG = { seed: seed, P: P, w: CH.shuffle(P.words, CH.rng(seed + '|w')), s: CH.shuffle(P.sent, CH.rng(seed + '|s')), r: [] };
      CH.shuffle(P.read, CH.rng(seed + '|r')).forEach(function (pa) { pa.qs.forEach(function (q) { ENG.r.push({ p: pa, q: q }); }); }); }
    var rnd = CH.rng(seed + '|' + i), P2 = ENG.P, kind = i % 5; // 0,2: מילה→עברית 1: עברית→מילה 3: השלמת משפט 4: הבנת הנקרא
    if (kind === 3 && ENG.s.length) {
      var s = ENG.s[Math.floor(i / 5) % ENG.s.length];
      return mc(rnd, '<p class="kv-q-he">איזו מילה משלימה את המשפט?</p><p class="kv-en" dir="ltr">' + esc(s.t).replace('___', '<span class="kv-blank">_____</span>') + '</p>', s.a, s.w, s.why, { ltr: 1 });
    }
    if (kind === 4 && ENG.r.length) {
      var r = ENG.r[Math.floor(i / 5) % ENG.r.length];
      return mc(rnd, '<p class="kv-q-he">קראו את הקטע וענו:</p><div class="kv-read" dir="ltr">' + esc(r.p.t) + '</div><p class="kv-en" dir="ltr"><b>' + esc(r.q.q) + '</b></p>', r.q.a, r.q.w, r.q.why, { ltr: 1, par: 40 });
    }
    var w = ENG.w[(i - Math.floor(i / 5) * 2) % ENG.w.length];
    if (kind === 1) {
      var wr = pickDistinct(rnd, P2.words.map(function (x) { return x.e; }), 3, [w.e]);
      return mc(rnd, '<p class="kv-q-he">איך אומרים באנגלית: <b>' + esc(w.h) + '</b>?</p>', w.e, wr, w.ex ? 'למשל: ' + w.ex : '', { ltr: 1 });
    }
    var wh = pickDistinct(rnd, P2.words.map(function (x) { return x.h; }), 3, [w.h]);
    return mc(rnd, '<p class="kv-q-he">מה הפירוש של המילה:</p><p class="kv-en big" dir="ltr">' + esc(w.e) + '</p>' + (w.ex ? '<p class="kv-ex" dir="ltr">' + esc(w.ex) + '</p>' : ''), w.h, wh, '');
  }
  // ---------- טריוויה ----------
  var TRIV = null;
  function triviaPool(cat) {
    var out = [];
    String(window.KAHOOT_BANK || '').split('\n').forEach(function (line) {
      var p = line.split('|'); if (p.length < 7) return;
      out.push({ c: 'kodesh', q: p[2], a: p[3], w: [p[4], p[5], p[6]] });
    });
    (window.CHIDON_BANK || []).forEach(function (x) { out.push(x); });
    return cat && cat !== 'all' ? out.filter(function (x) { return x.c === cat; }) : out;
  }
  function makeTrivia(seed, i, cat) {
    if (!TRIV || TRIV.seed !== seed) {
      var pool = triviaPool(cat), list;
      if (!cat || cat === 'all') { // לסירוגין: שאלת חגים/תנ"ך/ארץ ישראל ושאלת ידע כללי, כדי שהמאגר הגדול לא ישתלט
        var kd = CH.shuffle(pool.filter(function (x) { return x.c === 'kodesh'; }), CH.rng(seed + '|k')), gn = CH.shuffle(pool.filter(function (x) { return x.c !== 'kodesh'; }), CH.rng(seed + '|g'));
        list = []; for (var j = 0; j < Math.max(kd.length, gn.length); j++) { if (gn[j]) list.push(gn[j]); if (kd[j]) list.push(kd[j]); }
      } else list = CH.shuffle(pool, CH.rng(seed + '|t'));
      TRIV = { seed: seed, list: list };
    }
    var rnd = CH.rng(seed + '|' + i);
    // שאלה רביעית ותשיעית: חשבון בראש, מחושב בקוד
    if ((i % 10 === 3 || i % 10 === 8) && (!cat || cat === 'all' || cat === 'cheshbon')) return mental(rnd);
    var x = TRIV.list[i % TRIV.list.length];
    return mc(rnd, '<p class="kv-q-he big">' + esc(x.q) + '</p>', x.a, x.w, x.why || '', { cat: x.c });
  }
  function mental(rnd) {
    var R = function (a, b) { return a + Math.floor(rnd() * (b - a + 1)); }, k = R(0, 3), q, a;
    if (k === 0) { var x = R(12, 25), y = R(3, 9); q = x + ' × ' + y; a = x * y; }
    else if (k === 1) { var p = [10, 20, 25, 50][R(0, 3)], n = R(2, 30) * 20; q = p + '% מתוך ' + n; a = n * p / 100; }
    else if (k === 2) { var s = R(4, 15); q = s + '²'; a = s * s; }
    else { var d = R(3, 9), m = R(12, 40); q = (d * m) + ' ÷ ' + d; a = m; }
    var ws = []; [a + 1, a - 1, a + 10, a - 10, a + 2, Math.round(a * 1.1)].forEach(function (v) { if (v !== a && v > 0 && ws.indexOf(v) < 0) ws.push(v); });
    return mc(rnd, '<p class="kv-q-he">🧮 חשבון בראש, בלי מחשבון:</p><p class="kv-en big" dir="ltr">' + q + ' = ?</p>', String(a), CH.shuffle(ws, rnd).slice(0, 3).map(String), q + ' = ' + a, { cat: 'cheshbon' });
  }
  function make(i) {
    if (SUBJ === 'math') return makeMath(run.seed, i, run.u);
    if (SUBJ === 'eng') return makeEng(run.seed, i, run.u);
    return makeTrivia(run.seed, i, run.cat);
  }

  // =====================================================================
  //  משחק
  // =====================================================================
  var run = null, cur = null, qStart = 0, timer = null, mePid = PTS.pid();
  function show(id) { ['kv-home', 'kv-play', 'kv-end'].forEach(function (x) { if ($(x)) $(x).hidden = x !== id; }); }
  function leftSec() { return run && run.e ? run.e * 60 - Math.floor(Date.now() / 1000) : 0; }
  function hud() {
    if (!run) return;
    $('kv-pts').textContent = run.pts; $('kv-solved').textContent = run.solved;
    if (CFG.race) { var L = Math.max(0, leftSec()); $('kv-clock').textContent = CH.fmt(L); $('kv-clock').parentNode.classList.toggle('low', L < 120); }
    else $('kv-clock').textContent = Math.max(1, Math.min(run.i + (cur ? 1 : 0), CFG.n)) + '/' + CFG.n;
  }
  function tick() {
    hud();
    if (CFG.race && run && !run.done && leftSec() <= 0) finish(true);
  }
  function startRun(r) {
    run = r; cur = null; MATH = ENG = TRIV = null;
    show('kv-play'); hud(); clearInterval(timer); timer = setInterval(tick, 1000);
    if (CFG.race && !$('kv-rank')) { var rk = document.createElement('p'); rk.id = 'kv-rank'; rk.className = 'kv-rank'; rk.hidden = true; $('kv-q').parentNode.insertBefore(rk, $('kv-q')); }
    if ($('kv-rank')) $('kv-rank').hidden = true;
    next();
    livePush(true); livePoll(run.seed);
    CH.used(CFG.tool, run.joined ? 'join' : 'start', { u: run.u || 0 });
  }
  function persist() { if (run) putRun(run.seed, run); }
  // ---------- לוח חי (Worker limudim-krav, tools/krav-worker) – רק במרוצי מתמטיקה ואנגלית ----------
  // בלי חיבור הכול ממשיך לעבוד כמו קודם, עם הלוח שבתוך הקישור.
  var API = (function () { try { var o = localStorage.getItem('krav-api'); if (o) return o; } catch (e) {} return /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? 'http://127.0.0.1:8797' : 'https://limudim-krav.gilad4049.workers.dev'; })();
  var LIVE = {}, pushT = 0, pushWait = null, pollT = null;
  function liveOk(seed) { return CFG.race && /^(math|eng)-[a-z0-9]{4,12}$/.test(seed || ''); }
  function liveRows(seed) { return LIVE[seed] || []; }
  function gotRows(seed, d) {
    if (!d || !Array.isArray(d.rows)) return;
    LIVE[seed] = d.rows.filter(function (x) { return Array.isArray(x) && x.length >= 5; }).map(function (x) { return [String(x[0]).slice(0, 8), PTS.clean(x[1]) || 'שחקן/ית', x[2] | 0, x[3] | 0, x[4] | 0]; });
    liveUi(seed);
  }
  function livePush(force) {
    if (!run || !liveOk(run.seed)) return;
    var now = Date.now();
    if (!force && now - pushT < 4000) { clearTimeout(pushWait); pushWait = setTimeout(function () { livePush(true); }, 4000 - (now - pushT)); return; }
    clearTimeout(pushWait); pushT = now; var seed = run.seed;
    fetch(API + '/b/' + seed, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pid: mePid, nick: PTS.nick(), pts: run.pts, solved: run.solved, tried: run.tried, e: run.e, g: SUBJ }) })
      .then(function (r) { return r.json(); }).then(function (d) { gotRows(seed, d); }).catch(function () {});
  }
  function livePull(seed) {
    if (!liveOk(seed) || document.hidden) return;
    fetch(API + '/b/' + seed).then(function (r) { return r.json(); }).then(function (d) { gotRows(seed, d); }).catch(function () {});
  }
  function livePoll(seed) { clearInterval(pollT); if (!liveOk(seed)) return; livePull(seed); pollT = setInterval(function () { livePull(seed); }, 15000); }
  function liveUi(seed) {
    if (run && run.seed === seed) {
      var b = mergeBoard(run.board || [], liveRows(seed).concat([myRow()])), rk = $('kv-rank');
      if (rk) {
        var i = b.map(function (x) { return x[0]; }).indexOf(mePid); rk.hidden = b.length < 2;
        rk.innerHTML = '🏆 מקום <b>' + (i + 1) + '</b> מתוך ' + b.length + (b[0][0] !== mePid ? ' · מוביל/ה: ' + esc(b[0][1]) + ' (' + b[0][2] + ')' : ' · אתם מובילים!') + ' <span class="kv-live">● חי</span>';
      }
      var lb = $('kv-live-board'); if (lb) lb.innerHTML = boardHtml(b, mePid, '🏆 לוח התוצאות <span class="kv-live">● מתעדכן</span>');
    }
    if (IN && IN.s === seed && $('kv-banner') && !$('kv-banner').hidden) renderInvite();
  }
  // אחרי רענון חוזרים לאותה שאלה בדיוק (אותו זרע + אותו מספר)
  function next() {
    if (!run || run.done) return;
    if (!CFG.race && run.i >= CFG.n) return finish(false);
    cur = make(run.i); cur.k = 0; cur.tries = 0; cur.clean = true; cur.got = 0;
    qStart = Date.now();
    render();
    var inp = app.querySelector('#kv-in'); if (inp) try { inp.focus({ preventScroll: true }); } catch (e) {}
  }
  function render() {
    var box = $('kv-q'), q = cur;
    if (!q) { box.innerHTML = '<p class="kv-msg">לא נמצאו שאלות. נסו לרענן את הדף.</p>'; return; }
    var head = (q.topic ? '<p class="kv-topic">' + (q.em || '') + ' ' + esc(q.topic) + '</p>' : '') + '<div class="kv-qnum">' + CFG.one + ' ' + (run.i + 1) + '</div>';
    if (q.type === 'steps') {
      var done = q.steps.slice(0, q.k).map(function (s) { return '<li><span class="mx-math" dir="ltr">' + s.show + '</span><b class="' + (s.ok ? 'ok' : 'no') + '">' + (s.ok ? '✓' : '✗') + ' ' + fmtA(s) + '</b></li>'; }).join('');
      var s = q.steps[q.k];
      box.innerHTML = head + '<div class="mx-ex" dir="ltr">' + q.html + '</div>' +
        (done ? '<ol class="kv-done">' + done + '</ol>' : '') +
        (s ? '<div class="kv-step"><div class="mx-math mx-cur" dir="ltr">' + s.show + '</div><p class="kv-sq">' + s.q + '</p>' +
          '<form class="kv-form" id="kv-form" autocomplete="off"><input id="kv-in" inputmode="decimal" dir="ltr" placeholder="התשובה" aria-label="התשובה"><button class="btn btn-gold" type="submit">לבדוק</button></form>' +
          '<p class="kv-fb" id="kv-fb" aria-live="polite"></p><p class="kv-stepn">צעד ' + (q.k + 1) + ' מתוך ' + q.steps.length + ' · אפשר לכתוב 12, ‎-3, 2.5 או 3/4</p></div>' : '');
      var f = $('kv-form'); if (f) f.addEventListener('submit', onStep);
    } else {
      box.innerHTML = head + '<div class="kv-mcq">' + q.html + '</div><div class="kv-ch' + (q.ltr ? ' ltr' : '') + '">' + q.ch.map(function (c, j) {
        return '<button type="button" data-c="' + j + '"' + (q.ltr ? ' dir="ltr"' : '') + '>' + esc(c) + '</button>'; }).join('') + '</div><p class="kv-fb" id="kv-fb" aria-live="polite"></p>';
      box.querySelector('.kv-ch').addEventListener('click', onChoice);
    }
    $('kv-after').hidden = true; $('kv-skip').hidden = false;
  }
  function fmtA(s) { if (s.fr) return s.fr[0] + '/' + s.fr[1]; var a = s.a; return typeof a === 'number' ? String(Math.round(a * 10000) / 10000).replace('-', '−') : String(a); }
  function rightAns(s, raw) {
    var v = window.MX.parseVal(raw); if (isNaN(v)) return null;
    var tol = s.tol || 1e-6;
    if (!s.tol && Math.abs(Math.round(s.a * 1000) / 1000 - s.a) > 1e-9 && /[.,]\d{2,}/.test(raw)) tol = 0.0051;
    return Math.abs(v - s.a) <= tol;
  }
  function onStep(e) {
    e.preventDefault();
    var q = cur, s = q.steps[q.k], raw = $('kv-in').value, fb = $('kv-fb');
    if (!raw.trim()) { fb.textContent = 'כותבים מספר ולוחצים "לבדוק".'; return; }
    var ok = rightAns(s, raw);
    if (ok === null) { fb.textContent = 'לא הבנתי את המספר. אפשר לכתוב למשל 12, ‎-3, 2.5 או 3/4.'; fb.className = 'kv-fb no'; return; }
    if (ok && s.fr && raw.indexOf('/') > -1) { var pr = raw.replace(/\s/g, '').replace(/[−–]/g, '-').split('/'); if (window.MX.gcd(+pr[0], +pr[1]) !== 1) { fb.textContent = 'נכון, אבל אפשר לצמצם עוד.'; fb.className = 'kv-fb no'; return; } }
    if (ok) { s.ok = 1; q.got += q.tries ? 1 : 2; q.tries = 0; q.k++; }
    else {
      q.tries++; q.clean = false;
      if (q.tries < 2) { fb.textContent = 'עוד לא. יש עוד ניסיון אחד לצעד הזה.'; fb.className = 'kv-fb no'; $('kv-in').select(); return; }
      s.ok = 0; q.tries = 0; q.k++; q.fail = true;
    }
    if (q.k >= q.steps.length) return doneQ(); render();
    var f2 = $('kv-fb'); if (f2 && !ok) { f2.textContent = 'התשובה הייתה ' + fmtA(s) + '. ממשיכים לצעד הבא.'; f2.className = 'kv-fb no'; }
    try { $('kv-in').focus({ preventScroll: true }); } catch (er) {}
  }
  function onChoice(e) {
    var b = e.target.closest('[data-c]'); if (!b || cur.answered) return;
    cur.answered = true; var j = +b.dataset.c, ok = j === cur.ans;
    app.querySelectorAll('.kv-ch button').forEach(function (x, k) { x.disabled = true; if (k === cur.ans) x.classList.add('ok'); else if (k === j) x.classList.add('no'); });
    cur.got = ok ? 3 : 0; cur.clean = ok; cur.fail = !ok;
    doneQ();
  }
  function doneQ() {
    var q = cur, sec = (Date.now() - qStart) / 1000, par = q.par || CFG.par[run.u || 0] || 30, bonus = 0;
    if (q.type === 'steps') { if (q.clean) bonus += 3; if (!q.fail && sec <= par) bonus += 2; }
    else if (!q.fail && sec <= par) bonus += 1;
    var pts = q.got + bonus;
    run.pts += pts; run.tried++; if (!q.fail) run.solved++; run.i++;
    cur = null; persist();
    PTS.add(CFG.src, pts, { c: q.fail ? 0 : 1, q: 1, u: run.u || 0 });
    livePush();
    // לוח הכיתה של "כיתה משחקת" (assets/kita.js): נשלח רק אצל מי שהצטרף לכיתה
    if (CFG.race && pts) (window.KITA_Q = window.KITA_Q || []).push({ game: CFG.src, pts: pts, ref: run.seed + ':' + (run.i - 1) });
    if (q.type === 'steps' && q.k < q.steps.length) q.k = q.steps.length;
    // דרך הפתרון / ההסבר
    var box = $('kv-q');
    if (q.type === 'steps') {
      box.innerHTML = '<div class="kv-qnum">' + (q.em || '') + ' ' + esc(q.topic || '') + '</div><div class="mx-ex" dir="ltr">' + q.html + '</div>' +
        '<div class="kv-sol"><b>דרך הפתרון</b><ol>' + q.steps.map(function (s) { return '<li><span class="mx-math" dir="ltr">' + s.show + '</span> <b class="' + (s.ok ? 'ok' : 'no') + '">→ ' + fmtA(s) + '</b></li>'; }).join('') + '</ol>' +
        (q.fin ? '<p class="kv-fin" dir="ltr">' + q.fin + '</p>' : '') + '</div>';
    }
    var fb = $('kv-fb') || document.createElement('p');
    if (q.type === 'mc') { fb.className = 'kv-fb ' + (q.fail ? 'no' : 'ok'); fb.innerHTML = (q.fail ? 'לא הפעם. התשובה הנכונה מסומנת בירוק.' : 'נכון! ✓') + (q.why ? '<br><small>' + esc(q.why) + '</small>' : ''); }
    $('kv-gain').innerHTML = pts ? '+' + pts + ' נקודות' + (bonus ? ' <small>(כולל ' + bonus + ' בונוס ' + (q.type === 'steps' && q.clean ? 'על פתרון נקי' + (sec <= par && !q.fail ? ' ומהירות' : '') : 'מהירות') + ')</small>' : '') : 'הפעם בלי נקודות. ממשיכים!';
    $('kv-after').hidden = false; $('kv-skip').hidden = true; hud();
    var nb = $('kv-next'); nb.textContent = !CFG.race && run.i >= CFG.n ? 'לתוצאות 🏁' : 'לשאלה הבאה ←';
    try { nb.focus({ preventScroll: true }); } catch (e) {}
    if (CFG.race && leftSec() <= 0) finish(true);
  }
  $('kv-next').addEventListener('click', function () { next(); window.scrollTo({ top: $('kv-play').offsetTop - 8, behavior: 'smooth' }); });
  $('kv-skip').addEventListener('click', function () { if (!run || !cur) return; run.i++; run.tried++; cur = null; persist(); next(); });
  $('kv-stop').addEventListener('click', function () { if (run && !run.done) finish(false); });

  // ---------- סוף ----------
  function myRow() { return [mePid, PTS.nick() || 'שחקן/ית', run.pts, run.solved, run.tried]; }
  function finish(timeUp) {
    if (!run || run.done) return;
    clearInterval(timer); run.done = 1; run.sec = Math.round((Date.now() - run.start) / 1000); run.board = mergeBoard(run.board || [], [myRow()]); persist();
    var st = {}; livePush(true);
    if (SUBJ === 'trivia') st = CH.record('chidon', !!run.daily, run.sec, run.tried - run.solved);
    CH.used(CFG.tool, 'finish', { pts: run.pts, solved: run.solved, u: run.u || 0, time_up: timeUp ? 1 : 0 });
    showEnd(timeUp, st);
  }
  // מסך התוצאות (גם כשחוזרים לזרע ששיחקנו בו כבר: רק מציגים, בלי לרשום שוב)
  function showEnd(timeUp, st) {
    clearInterval(timer); run.board = mergeBoard(run.board || [], liveRows(run.seed).concat([myRow()])); persist();
    if (!st) st = SUBJ === 'trivia' ? CH.stats('chidon') : {};
    var sec = run.sec || 0;
    show('kv-end');
    var lvName = levelName(run.u), lead = run.board[0], iWin = run.board.length > 1 && lead[0] === mePid;
    var head = run.board.length > 1 ? (iWin ? '🏆 אתם במקום הראשון!' : '💪 ' + esc(lead[1]) + ' מוביל/ה כרגע') : (timeUp ? '⏰ הזמן נגמר!' : 'סיימתם! 🎉');
    var share = '⚔️ ' + CFG.name + (lvName ? ' (' + lvName + ')' : '') + (run.daily ? ' · ' + CH.shortDate() : '') + '\n✓ ' + run.solved + ' מתוך ' + run.tried + ' · ⭐ ' + run.pts + ' נקודות\nמצטרפים? ' + location.origin + location.pathname;
    CH.win({ tool: CFG.tool, el: $('kv-end'), daily: run.daily, stats: st, title: head,
      line: '<span>✓ <b>' + run.solved + '</b> מתוך ' + run.tried + '</span><span>⭐ <b>' + run.pts + '</b> נקודות</span>' + (SUBJ === 'trivia' ? '<span>⏱ ' + CH.fmt(sec) + '</span>' : ''),
      extra: '<div id="kv-live-board">' + boardHtml(run.board, mePid) + '</div>' + sendBox() + '<div data-pts></div>',
      share: share,
      next: [{ label: SUBJ === 'trivia' ? '🎲 עוד חידון' : '⚔️ מרוץ חדש', fn: function () { resetUrl(); if (SUBJ === 'trivia') { tabSet('practice'); newRun({}); } else home(); } }, { label: 'לעמוד הבית של הדו-קרב', fn: function () { resetUrl(); home(); } }] });
    wireSend($('kv-end'));
    PTS.render();
    if (liveOk(run.seed) && run.e * 60 + 900 > Date.now() / 1000) livePoll(run.seed); else clearInterval(pollT);
  }
  function levelName(u) { var l = CFG.levels.filter(function (x) { return x[0] === u; })[0]; return l && u ? l[1] : ''; }
  function payload() {
    var p = { g: SUBJ, s: run.seed, r: run.board || [] };
    if (run.u) p.u = run.u; if (run.e) p.e = run.e; if (run.cat) p.c = run.cat; if (run.daily) p.d = run.daily;
    var nm = PTS.nick(); if (nm) p.m = nm;
    return p;
  }
  function sendBox(invite) {
    var nm = PTS.nick();
    return '<div class="kv-vs kv-send"><b>' + (invite ? '📨 להזמין חבר לאותו מרוץ' : '📨 לשלוח את התוצאה לחברים') + '</b><span>' +
      (invite ? 'החבר יקבל את אותם ' + CFG.what + ' בדיוק, עד אותה שעת סיום. אפשר לשלוח גם לקבוצה של הכיתה.' : 'כל מי שמקבל את הקישור רואה את הלוח, וגם יכול לשחק על אותם ' + CFG.what + ' ולהוסיף את עצמו.') + '</span>' +
      '<input type="text" maxlength="20" placeholder="כינוי (בלי שם מלא)" value="' + esc(nm) + '" data-kv-name aria-label="כינוי">' +
      '<div class="actions"><a class="btn btn-gold" href="#" target="_blank" rel="noopener" data-kv-wa><svg class="ic"><use href="#wa"/></svg> לשלוח בווטסאפ</a><button class="btn btn-line" type="button" data-kv-copy>🔗 להעתיק קישור</button></div></div>';
  }
  function wireSend(root, invite) {
    var box = root.querySelector('.kv-send'); if (!box) return;
    var inp = box.querySelector('[data-kv-name]');
    function msg() {
      var nm = PTS.setNick(inp.value);
      if (run.done) { run.board = mergeBoard(run.board || [], liveRows(run.seed).concat([myRow()])); persist(); }
      var p = payload(); if (nm) p.m = nm;
      var t = invite ? '⚔️ ' + (nm || 'חבר') + ' מזמין/ה אותך ל' + CFG.name + (levelName(run.u) ? ' (' + levelName(run.u) + ')' : '') + '!\nמי פותר יותר ' + CFG.what + ' עד ' + endClock() + '? כל תשובה נכונה שווה נקודות.'
        : '⚔️ ' + CFG.name + (levelName(run.u) ? ' (' + levelName(run.u) + ')' : '') + ': צברתי ' + run.pts + ' נקודות (' + run.solved + ' נכונות). ' + (CFG.race && leftSec() > 0 ? 'יש לך עד ' + endClock() + ' לעקוף אותי!' : 'תצליח/י יותר?');
      return t + '\n' + link(p);
    }
    box.querySelector('[data-kv-wa]').addEventListener('click', function () { this.href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(msg()); CH.used(CFG.tool, invite ? 'invite' : 'send', { how: 'wa' }); });
    box.querySelector('[data-kv-copy]').addEventListener('click', function () { var t = msg(); if (window.kelimCopy) window.kelimCopy(t, this, 'הקישור הועתק ✓ אפשר להדביק לחבר'); CH.used(CFG.tool, invite ? 'invite' : 'send', { how: 'copy' }); });
  }
  function endClock() { var d = new Date(run.e * 60000); return d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes(); }
  function resetUrl() { if (location.search) try { history.replaceState(null, '', location.pathname); } catch (e) {} IN = null; }

  // ---------- התחלה ----------
  function rid() { return Math.random().toString(36).slice(2, 9); }
  function newRun(o) {
    var seed = o.seed || SUBJ + '-' + rid(), r = getRun(seed);
    if (r) r.board = mergeBoard(r.board || [], o.board || []);
    if (r && !r.done && (!CFG.race || r.e * 60 > Date.now() / 1000)) return startRun(r);
    if (r) { run = r; if (!r.done) { r.done = 1; persist(); } return showEnd(false); }
    r = { seed: seed, u: o.u || 0, e: o.e || 0, cat: o.cat || '', daily: o.daily || '', i: 0, pts: 0, solved: 0, tried: 0, start: Date.now(), board: o.board || [], joined: o.joined ? 1 : 0 };
    if (CFG.race && !r.e) r.e = nowMin() + (o.dur || 60);
    putRun(seed, r); startRun(r);
  }

  // ---------- דף הבית של הדו-קרב ----------
  var picked = { u: 0, dur: 60 };
  function home() {
    show('kv-home'); clearInterval(timer); clearInterval(pollT); run = null;
    var o = load(); picked.u = picked.u || (o.lv || {})[SUBJ] || CFG.levels[0][0];
    if ($('kv-levels')) $('kv-levels').innerHTML = CFG.levels.map(function (l) { return '<button type="button" data-u="' + l[0] + '" aria-pressed="' + (l[0] === picked.u) + '">' + l[1] + '</button>'; }).join('');
    if ($('kv-durs')) $('kv-durs').innerHTML = DURS.map(function (d) { return '<button type="button" data-d="' + d[0] + '" aria-pressed="' + (d[0] === picked.dur) + '">' + d[1] + '</button>'; }).join('');
    if ($('kv-nick') && !$('kv-nick').dataset.on) { $('kv-nick').value = PTS.nick(); $('kv-nick').dataset.on = 1; $('kv-nick').addEventListener('change', function () { PTS.setNick(this.value); }); }
    // מרוצים אחרונים
    var runs = Object.keys(o.runs || {}).map(function (k) { return o.runs[k]; }).filter(function (r) { return r.seed.split('-')[0] === SUBJ; }).sort(function (a, b) { return b.at - a.at; }).slice(0, 5);
    var rl = $('kv-recent');
    if (rl) rl.innerHTML = runs.length ? '<h3>המרוצים האחרונים שלכם</h3><ul class="kv-recent">' + runs.map(function (r) {
      var live = CFG.race && !r.done && r.e * 60 > Date.now() / 1000;
      return '<li><span>' + (live ? '🟢 ' : '') + (levelName(r.u) || (r.daily ? 'חידון ' + r.daily.slice(8) + '.' + (+r.daily.slice(5, 7)) : 'חידון')) + ' · ⭐ ' + r.pts + ' · ✓ ' + r.solved + '/' + r.tried + (r.board && r.board.length > 1 ? ' · ' + r.board.length + ' משתתפים' : '') + '</span>' +
        (live ? '<button class="btn btn-gold btn-sm" type="button" data-resume="' + esc(r.seed) + '">להמשיך</button>' : '') + '</li>';
    }).join('') + '</ul>' : '';
    PTS.render();
    renderInvite();
  }
  function renderInvite() {
    var bn = $('kv-banner'); if (!bn) return;
    if (!IN) { bn.hidden = true; return; }
    var mine = getRun(IN.s), left = IN.e ? IN.e * 60 - Date.now() / 1000 : 1, who = esc(IN.m || 'חבר');
    var board = mergeBoard(IN.r.concat(liveRows(IN.s)), mine && mine.board ? mine.board : []);
    bn.hidden = false;
    var lv = levelName(IN.u);
    if (mine && mine.done) { bn.innerHTML = '<p>⚔️ כבר שיחקתם במרוץ הזה. הנה הלוח המעודכן:</p>' + boardHtml(board, mePid) + '<button class="btn btn-gold" type="button" data-open-res>לראות ולשלוח את הלוח</button>'; return; }
    if (left <= 0) { bn.innerHTML = '<p>⏰ המרוץ של ' + who + ' כבר נגמר. התוצאות:</p>' + boardHtml(board, mePid) + '<p class="kv-small">אפשר לפתוח מרוץ חדש למטה, ולהזמין את ' + who + ' לסיבוב נוסף.</p>'; return; }
    bn.innerHTML = '<p>⚔️ <b>' + who + ' מזמין/ה אתכם ל' + CFG.name + '</b>' + (lv ? ' · ' + lv : '') + (IN.e ? ' · נשארו ' + Math.ceil(left / 60) + ' דקות' : '') + '</p>' +
      boardHtml(board, mePid, 'מי כבר שיחק') +
      '<div class="kv-joinrow"><input type="text" id="kv-join-nick" maxlength="20" placeholder="כינוי (בלי שם מלא)" value="' + esc($('kv-join-nick') ? $('kv-join-nick').value : PTS.nick()) + '" aria-label="כינוי"><button class="btn btn-gold" type="button" data-join>' + (mine ? 'להמשיך במרוץ' : 'להצטרף ולהתחיל') + ' ⚔️</button></div>';
  }
  app.addEventListener('click', function (e) {
    var t = e.target;
    var b = t.closest('[data-u]'); if (b) { picked.u = +b.dataset.u; home(); return; }
    b = t.closest('[data-d]'); if (b) { picked.dur = +b.dataset.d; home(); return; }
    b = t.closest('[data-resume]'); if (b) { var r = getRun(b.dataset.resume); if (r) startRun(r); return; }
    if (t.closest('[data-join]')) { var nk = $('kv-join-nick'); if (nk) PTS.setNick(nk.value); if (SUBJ === 'trivia') tabSet(IN.d === CH.today() ? 'daily' : 'practice'); newRun({ seed: IN.s, u: IN.u, e: IN.e, cat: IN.c, daily: IN.d === CH.today() ? IN.d : '', board: IN.r, joined: 1 }); return; }
    if (t.closest('[data-open-res]')) { run = getRun(IN.s); run.board = mergeBoard(run.board || [], IN.r); showEnd(false); return; }
    if (t.closest('[data-start]')) { if ($('kv-nick')) PTS.setNick($('kv-nick').value); newRun({ u: picked.u, dur: picked.dur }); return; }
    if (t.closest('[data-invite]')) { var iv = $('kv-invite'); iv.hidden = !iv.hidden; if (!iv.hidden) { iv.innerHTML = sendBox(true); wireSend(iv, true); } return; }
  });

  // ---------- טריוויה: לשוניות יומי / חופשי ----------
  function tabSet(m) { var tb = $('kv-tabs'); if (!tb) return; tb.querySelectorAll('[data-m]').forEach(function (x) { x.setAttribute('aria-selected', x.dataset.m === m ? 'true' : 'false'); }); }
  function triviaDaily() {
    tabSet('daily');
    var seed = 'trivia-daily-' + CH.today(), r = getRun(seed);
    if (r && r.done) { run = r; showEnd(false); return; }
    newRun({ seed: seed, daily: CH.today() });
  }
  if (SUBJ === 'trivia') {
    $('kv-tabs').addEventListener('click', function (e) {
      var b = e.target.closest('[data-m]'); if (!b) return; resetUrl(); $('kv-banner').hidden = true;
      if (b.dataset.m === 'daily') triviaDaily(); else { tabSet('practice'); newRun({ cat: ($('kv-cat') || {}).value || 'all' }); }
    });
    if ($('kv-cat')) $('kv-cat').innerHTML = (window.CHIDON_CATS || [['all', 'הכול']]).map(function (c) { return '<option value="' + c[0] + '">' + c[1] + '</option>'; }).join('');
    if ($('kv-cat')) $('kv-cat').addEventListener('change', function () { tabSet('practice'); resetUrl(); newRun({ cat: this.value }); });
  }

  // ---------- טעינה ----------
  if (SUBJ === 'math' && !(window.MX && window.MX.T && window.MX.T.length)) { $('kv-home').innerHTML = '<p class="kv-msg">התרגילים לא נטענו. נסו לרענן את הדף.</p>'; return; }
  if (SUBJ === 'trivia') {
    if (IN) { show('kv-home'); renderInvite(); if (getRun(IN.s) && getRun(IN.s).done) { /* מציגים באנר */ } }
    else if (location.hash !== '#practice') triviaDaily(); else { tabSet('practice'); newRun({ cat: 'all' }); }
  } else {
    home();
    if (IN && liveOk(IN.s)) livePoll(IN.s);
    // מרוץ שהיה באמצע (רענון / מעבר אפליקציה) – חוזרים אליו
    if (!IN) { var o0 = load(), live = Object.keys(o0.runs || {}).map(function (k) { return o0.runs[k]; }).filter(function (r) { return r.seed.split('-')[0] === SUBJ && !r.done && r.e * 60 > Date.now() / 1000 && r.tried > 0; }).sort(function (a, b) { return b.at - a.at; })[0]; if (live) { $('kv-resume').hidden = false; $('kv-resume').innerHTML = '🟢 יש לכם מרוץ פתוח (⭐ ' + live.pts + '). <button class="btn btn-gold btn-sm" type="button" data-resume="' + esc(live.seed) + '">להמשיך</button>'; } }
  }
  window.__kv = { make: function (seed, i, u, cat) { var keep = run; run = { seed: seed, u: u, cat: cat }; MATH = ENG = TRIV = null; var q = make(i); run = keep; MATH = ENG = TRIV = null; return q; }, run: function () { return run; }, cur: function () { return cur; } }; // לבדיקות
})();
