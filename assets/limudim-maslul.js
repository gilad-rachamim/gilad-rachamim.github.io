// כלים ללימודים – המסלול האישי במתמטיקה (/limudim/maslul/).
// משחק על בסיס המחוללים של "מתמטיקה צעד אחרי צעד" (window.MX מ-limudim-math.js):
// מסלול לפי שאלון, שישה שלבים בכל נושא, כוכבים, רצף ימים, תגים, תשובה קרובה = חצי כוכב,
// ותשובה בקול דרך ממיר הדיבור המשותף (window.HeDibur מ-limudim-dibur.js). הכול נשמר רק בטלפון.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  if (!$('ms-app') || !window.MX) return;
  var T = window.MX.T, QN = window.MX.QN, parseVal = window.MX.parseVal, gcd = window.MX.gcd;
  var KEY = 'limudim-maslul';
  function load() { try { var v = localStorage.getItem(KEY); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  var usedOnce = {};
  function used(action, extra) { if (window.toolUsed) window.toolUsed('maslul', Object.assign({ action: action }, extra || {})); }
  function usedFirst(action) { if (usedOnce[action]) return; usedOnce[action] = 1; used(action); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function today(d) { d = d || new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function dayDiff(a, b) { return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5); }

  var st = load() || {};
  var OLDQ = { '35182': '35172', '35381': '35371', '35382': '35372', '35481': '35471', '35482': '35472', '35581': '35571', '35582': '35572' }; // השאלונים של התוכנית הקודמת -> תשפ"ז
  if (st.tr && OLDQ[st.tr]) st.tr = OLDQ[st.tr];
  st.v = 1; st.s = st.s || {}; st.b = st.b || {}; st.d = st.d || []; st.snd = st.snd == null ? 1 : st.snd;
  st.n = st.n || 0; st.best = st.best || 0;

  // ---------- מסלולים ----------
  var TRACKS = [{ id: 'base', name: 'יסודות', sub: 'עד כיתה ט׳', topics: T.filter(function (t) { return !t.bg; }) }];
  QN.forEach(function (q) {
    TRACKS.push({ id: q[0], name: q[0], sub: q[1].split(' · ')[0], long: q[1], topics: T.filter(function (t) { return t.q && t.q.indexOf(q[0]) > -1; }) });
  });
  function track() { return TRACKS.filter(function (x) { return x.id === st.tr; })[0] || null; }
  function topic(id) { return T.filter(function (t) { return t.id === id; })[0]; }

  // ---------- שלבים ----------
  // רמות המחולל לכל תרגיל בשלב. כל תשובה נכונה ברצף יכולה להקפיץ את התרגיל הבא ברמה.
  var STAGES = [
    { name: 'חימום', em: '🌱', lv: [1, 1, 1] },
    { name: 'חימום+', em: '🌿', lv: [1, 1, 2] },
    { name: 'מתקדם', em: '📈', lv: [2, 2, 2] },
    { name: 'מתקדם+', em: '🧭', lv: [2, 2, 3] },
    { name: 'אתגר', em: '🚀', lv: [3, 3, 3] },
    { name: 'שלב בגרות', em: '🎓', lv: [3, 3, 3, 3], exam: 1 }
  ];
  function tstars(id) { st.s[id] = st.s[id] || [0, 0, 0, 0, 0, 0]; return st.s[id]; }
  function topicStars(id) { var a = st.s[id]; return a ? a.reduce(function (x, y) { return x + y; }, 0) : 0; }
  function stagesDone(id) { var a = st.s[id]; return a ? a.filter(function (x) { return x > 0; }).length : 0; }
  function totalStars() { var n = 0; Object.keys(st.s).forEach(function (k) { n += topicStars(k); }); return n; }
  function unlocked(id, i) { return i === 0 || tstars(id)[i - 1] > 0; }

  // ---------- רצף ימים: מעודד, בלי "חוב" ----------
  function dayStreak() {
    var d = st.d.slice().sort(), t = today(), n = 0;
    if (!d.length) return 0;
    var last = d[d.length - 1], gap = dayDiff(last, t);
    if (gap > 1) return 0;
    n = 1;
    for (var i = d.length - 1; i > 0; i--) { if (dayDiff(d[i - 1], d[i]) === 1) n++; else break; }
    return n;
  }
  function markDay() {
    var t = today(), prev = st.d.length ? st.d[st.d.length - 1] : null;
    if (prev === t) return;
    if (prev && dayDiff(prev, t) >= 3) award('back');
    st.d.push(t); if (st.d.length > 90) st.d = st.d.slice(-90);
    var ds = dayStreak(); if (ds >= 3) award('days3'); if (ds >= 7) award('days7');
  }

  // ---------- תגים ----------
  var BADGES = [
    ['first', '🌱', 'צעד ראשון', 'תשובה נכונה ראשונה'],
    ['stage', '⭐', 'שלב ראשון', 'סיימתם שלב'],
    ['perfect', '💯', 'מושלם', 'שלושה כוכבים בשלב'],
    ['combo5', '🔥', 'רצף 5', 'חמש תשובות נכונות ברצף'],
    ['combo10', '☄️', 'רצף 10', 'עשר תשובות נכונות ברצף'],
    ['fixed', '🎯', 'תיקנתם לבד', 'מ"כמעט" לתשובה מדויקת'],
    ['voice', '🎤', 'עונים בקול', 'תשובה נכונה בדיבור'],
    ['days3', '📅', '3 ימים', 'שלושה ימי תרגול ברצף'],
    ['days7', '🗓', 'שבוע שלם', 'שבעה ימי תרגול ברצף'],
    ['back', '💪', 'חזרתם!', 'חוזרים לתרגל אחרי הפסקה'],
    ['stars25', '✨', '25 כוכבים', 'אספתם 25 כוכבים'],
    ['stars100', '🌟', '100 כוכבים', 'אספתם 100 כוכבים'],
    ['bagrut', '🎓', 'שלב בגרות', 'עברתם שלב בגרות'],
    ['topic', '🏔', 'נושא שלם', 'כל ששת השלבים בנושא'],
    ['track', '🏆', 'מסלול שלם', 'כל הנושאים במסלול'],
    ['train', '💪', 'אימון ראשון', 'סיימתם אימון חיזוק'],
    ['train10', '🏋', '10 אימונים', 'עשרה אימוני חיזוק'],
    ['daily', '🎁', 'אתגר יומי', 'סיימתם אתגר יומי'],
    ['daily7', '📆', '7 אתגרים', 'שבעה אתגרים יומיים'],
    ['week', '🎯', 'יעד שבועי', 'חמש פעילויות בשבוע אחד'],
    ['rank1', '🥉', 'מתאמנים', 'עברתם מבחן עלייה ראשון'],
    ['rank2', '🥈', 'מתקדמים', 'דרגת מתקדמים'],
    ['rank3', '🥇', 'מומחים', 'דרגת מומחים'],
    ['rank4', '🏆', 'מוכנים לבגרות', 'הדרגה הגבוהה ביותר']
  ];
  var fresh = [];
  function award(id) {
    if (st.b[id]) return;
    st.b[id] = today(); fresh.push(id);
    var b = BADGES.filter(function (x) { return x[0] === id; })[0];
    toast(b[1] + ' תג חדש: ' + b[2]);
    used('badge', { badge: id });
  }

  // ---------- צליל עדין (Web Audio, בלי קבצים) ----------
  var ac = null;
  function tone(seq) {
    if (!st.snd) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      var t0 = ac.currentTime + 0.01;
      seq.forEach(function (n) {
        var o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sine'; o.frequency.value = n[0];
        g.gain.setValueAtTime(0.0001, t0 + n[1]);
        g.gain.exponentialRampToValueAtTime(0.07, t0 + n[1] + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + n[1] + n[2]);
        o.connect(g); g.connect(ac.destination); o.start(t0 + n[1]); o.stop(t0 + n[1] + n[2] + 0.05);
      });
    } catch (e) {}
  }
  var SND = {
    ok: [[660, 0, 0.25], [880, 0.09, 0.35]],
    near: [[587, 0, 0.3]],
    up: [[523, 0, 0.2], [659, 0.1, 0.2], [784, 0.2, 0.4]],
    end: [[523, 0, 0.25], [659, 0.12, 0.25], [784, 0.24, 0.25], [1047, 0.36, 0.6]]
  };
  function sndBtn() { var b = $('ms-snd'); b.textContent = st.snd ? '🔔 צליל' : '🔕 בלי צליל'; b.setAttribute('aria-pressed', st.snd ? 'true' : 'false'); }
  $('ms-snd').addEventListener('click', function () { st.snd = st.snd ? 0 : 1; save(); sndBtn(); if (st.snd) tone(SND.ok); });

  // ---------- הודעה קופצת וכוכב עף ----------
  var toastT = null;
  function toast(msg) {
    var el = $('ms-toast');
    if (!el) { el = document.createElement('div'); el.id = 'ms-toast'; el.className = 'ms-toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.textContent = msg; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(function () { el.classList.remove('on'); }, 2600);
  }
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function flyStar(half) {
    hud();
    var chip = $('ms-pts'); chip.classList.remove('pop'); void chip.offsetWidth; chip.classList.add('pop');
    if (reduce) return;
    var to = $('ms-pts').getBoundingClientRect(), from = $('ms-in').getBoundingClientRect();
    var s = document.createElement('i'); s.className = 'ms-star' + (half ? ' half' : ''); s.textContent = '★';
    s.style.left = (from.left + from.width / 2) + 'px'; s.style.top = (from.top) + 'px';
    s.style.setProperty('--dx', (to.left + to.width / 2 - from.left - from.width / 2) + 'px');
    s.style.setProperty('--dy', (to.top - from.top) + 'px');
    $('ms-fly').appendChild(s);
    setTimeout(function () { s.remove(); }, 1000);
  }

  // ---------- לוח עליון ----------
  function hud() {
    $('ms-stars').textContent = totalStars();
    if (G && G.credit != null && $('ms-pts')) $('ms-pts').innerHTML = '⭐ <b>' + (Math.round(G.credit * 100) / 100) + '</b>';
    $('ms-days').textContent = dayStreak();
    $('ms-badges-n').textContent = Object.keys(st.b).length;
  }

  // =====================================================================
  //  המפה
  // =====================================================================
  // ציור דרך מתפתלת: צמתים במרחק קבוע, ציר x לפי גל, וקו SVG שמחבר ביניהם
  function drawPath(box, items, cls) {
    var W = box.clientWidth || 360, gap = cls === 'st' ? 128 : 112, amp = Math.min(W * 0.27, 120), pts = [];
    var html = '';
    items.forEach(function (it, i) {
      var x = W / 2 + amp * Math.sin(i * 1.05), y = 52 + i * gap;
      pts.push([x, y]);
      html += '<div class="ms-node ' + (it.cls || '') + '" role="listitem" style="left:' + x + 'px;top:' + y + 'px">' + it.html + '</div>';
    });
    var d = '';
    pts.forEach(function (p, i) {
      if (!i) { d = 'M' + p[0] + ' ' + p[1]; return; }
      var q = pts[i - 1], my = (q[1] + p[1]) / 2;
      d += ' C' + q[0] + ' ' + my + ' ' + p[0] + ' ' + my + ' ' + p[0] + ' ' + p[1];
    });
    var H = 52 + (items.length - 1) * gap + 90;
    box.style.height = H + 'px';
    box.innerHTML = '<svg class="ms-road" width="' + W + '" height="' + H + '" aria-hidden="true"><path d="' + d + '"/></svg>' + html;
  }
  function starRow(n, max) { var s = ''; for (var i = 0; i < max; i++) s += '<i class="' + (i < n ? 'on' : '') + '">★</i>'; return s; }

  function renderPick() {
    $('ms-pick').innerHTML = '<span class="ms-pick-l">המסלול שלי:</span>' + TRACKS.map(function (x) {
      return '<button type="button" data-tr="' + x.id + '" class="' + (x.id === st.tr ? 'on' : '') + '" aria-pressed="' + (x.id === st.tr) + '"><b>' + x.name + '</b><small>' + x.sub + '</small></button>';
    }).join('');
  }
  function hereTopic(tr) {
    // "אתם כאן": הנושא האחרון ששיחקתם בו במסלול, ואם הוא הושלם – הנושא הבא שלא הושלם
    var ts = tr.topics, i = ts.map(function (t) { return t.id; }).indexOf(st.last);
    if (i > -1 && stagesDone(ts[i].id) < 6) return ts[i].id;
    for (var k = 0; k < ts.length; k++) { var j = (Math.max(i, 0) + k) % ts.length; if (stagesDone(ts[j].id) < 6) return ts[j].id; }
    return null;
  }
  function renderHome() {
    renderPick();
    var tr = track();
    var ds = dayStreak(), msg;
    if (!st.d.length) msg = 'בוחרים מסלול ומתחילים מהתחנה הראשונה. אין מה להפסיד, רק כוכבים להרוויח.';
    else if (st.d[st.d.length - 1] === today()) msg = ds > 1 ? '🔥 ' + ds + ' ימים ברצף. איזה כיף לראות אתכם!' : '👏 כבר תרגלתם היום. כל תרגיל נוסף הוא בונוס.';
    else if (ds) msg = '🔥 ' + ds + (ds > 1 ? ' ימים ברצף' : ' יום ברצף') + '. תרגיל אחד היום ממשיך אותו.';
    else msg = '💪 טוב שחזרתם. היום מתחילים רצף חדש.';
    $('ms-daymsg').textContent = msg;
    if (!tr) {
      $('ms-sum').innerHTML = '<p class="ms-choose">👆 מה אתם לומדים? בוחרים מסלול, ואפשר להחליף בכל רגע. ההתקדמות בכל נושא נשמרת בכל המסלולים.</p>';
      $('ms-map').innerHTML = ''; $('ms-map').style.height = '';
    } else {
      var all = tr.topics.length * 6, done = 0, stars = 0;
      tr.topics.forEach(function (t) { done += stagesDone(t.id); stars += topicStars(t.id); });
      var pct = Math.round(done / all * 100);
      $('ms-sum').innerHTML = '<div class="ms-sumrow"><b>' + (tr.long || 'יסודות · ' + tr.sub) + '</b><span>' + (done ? 'עברתם ' + done + ' שלבים מתוך ' + all + ' · ' + stars + ' ⭐' : tr.topics.length + ' תחנות במסלול, 6 שלבים בכל אחת') + '</span></div>' +
        '<div class="ms-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><i style="width:' + Math.max(pct, done ? 3 : 0) + '%"></i></div>' +
        '<p class="ms-week">🎯 יעד השבוע: <b>' + Math.min(weekCount(), WEEK_GOAL) + '/' + WEEK_GOAL + '</b> פעילויות (שלב, אימון, אתגר או מבחן)' + (weekCount() >= WEEK_GOAL ? ' ✓ הגעתם!' : '') + '</p>';
      var here = hereTopic(tr);
      drawPath($('ms-map'), tr.topics.map(function (t) {
        var n = stagesDone(t.id), full = n === 6, isHere = t.id === here;
        return { cls: (full ? 'done' : n ? 'part' : '') + (isHere ? ' here' : ''),
          html: (isHere ? '<span class="ms-you">אתם כאן</span>' : '') +
            '<button type="button" data-topic="' + t.id + '" class="ms-dot" style="--p:' + (n / 6 * 100) + '%" aria-label="' + esc(t.name) + ': ' + n + ' מתוך 6 שלבים">' + t.em + '</button>' +
            '<span class="ms-lbl">' + t.name + '</span><span class="ms-st">' + (full ? '🏔 ' : '') + topicStars(t.id) + '/18 ⭐' + (isWeak(t.id) ? ' · <b class="ms-weak">💪 לחזק</b>' : '') + '</span>' };
      }), '');
    }
    renderCards(tr);
    $('ms-badges').innerHTML = BADGES.map(function (b) {
      var has = st.b[b[0]];
      return '<div class="ms-badge' + (has ? ' on' : '') + '" title="' + esc(b[3]) + '"><span aria-hidden="true">' + (has ? b[1] : '🔒') + '</span><b>' + b[2] + '</b><small>' + b[3] + '</small></div>';
    }).join('');
    hud();
  }
  $('ms-pick').addEventListener('click', function (e) {
    var b = e.target.closest('[data-tr]'); if (!b) return;
    st.tr = b.dataset.tr; save(); renderHome(); used('track', { track: st.tr });
  });
  $('ms-map').addEventListener('click', function (e) { var b = e.target.closest('[data-topic]'); if (b) openTopic(b.dataset.topic, true); });

  // =====================================================================
  //  נושא: שישה שלבים
  // =====================================================================
  var cur = null;
  function show(id) { ['ms-home', 'ms-topic', 'ms-play', 'ms-end'].forEach(function (x) { $(x).hidden = x !== id; }); }
  function openTopic(id, scroll) {
    cur = topic(id); if (!cur) return;
    st.last = id; save();
    show('ms-topic');
    $('ms-topic-h').innerHTML = cur.em + ' ' + esc(cur.name);
    $('ms-lesson').href = '/limudim/matematika/#' + cur.id;
    var n = stagesDone(id);
    $('ms-topic-sub').textContent = n === 6 ? 'עברתם את כל השלבים! אפשר לחזור לכל שלב ולאסוף עוד כוכבים.' : n ? 'עברתם ' + n + ' מתוך 6 שלבים. ממשיכים מהשלב שמהבהב.' : 'מתחילים בחימום. כל שלב שעוברים פותח את הבא.';
    var a = tstars(id), next = a.indexOf(0);
    drawPath($('ms-stages'), STAGES.map(function (sg, i) {
      var open = unlocked(id, i), isNext = i === next;
      return { cls: (a[i] ? 'done' : '') + (open ? '' : ' lock') + (isNext ? ' here' : ''),
        html: (isNext ? '<span class="ms-you">' + (i ? 'הבא בתור' : 'מתחילים כאן') + '</span>' : '') +
          '<button type="button" data-stage="' + i + '" class="ms-dot' + (sg.exam ? ' exam' : '') + '"' + (open ? '' : ' disabled') + ' aria-label="שלב ' + (i + 1) + ', ' + sg.name + (open ? '' : ', נעול') + '">' + (open ? sg.em : '🔒') + '</button>' +
          '<span class="ms-lbl">שלב ' + (i + 1) + ' · ' + sg.name + '</span><span class="ms-st stars">' + starRow(a[i], 3) + '</span>' };
    }), 'st');
    if (scroll) window.scrollTo({ top: $('ms-app').offsetTop - 10, behavior: reduce ? 'auto' : 'smooth' });
    used('topic', { topic: id });
  }
  $('ms-stages').addEventListener('click', function (e) { var b = e.target.closest('[data-stage]'); if (b && !b.disabled) startStage(+b.dataset.stage); });
  $('ms-back').addEventListener('click', function () { show('ms-home'); renderHome(); });

  // =====================================================================
  //  שליטה בנושא (לחיזוק אישי): ממוצע נע של הצעדים האחרונים בכל נושא
  // =====================================================================
  st.m = st.m || {};
  function rec(id, c) {
    var x = st.m[id] || { m: 0, n: 0, d: today() };
    x.m = x.n ? x.m * 0.75 + c * 0.25 : c; x.n++; x.d = today();
    st.m[id] = x;
  }
  function mastery(id) { var x = st.m[id]; return x && x.n ? x.m : null; }
  function isWeak(id) { var x = st.m[id]; return !!(x && x.n >= 3 && x.m < 0.7); }
  function isStale(id) { var x = st.m[id]; return !!(x && x.n >= 3 && x.m >= 0.7 && dayDiff(x.d, today()) >= 10); }
  // רמת התרגיל המתאימה לנושא: לפי השלבים שעברתם, וקצת יותר קל כשהנושא עוד חלש
  function levelFor(id) {
    var n = stagesDone(id), lv = n >= 4 ? 3 : n >= 2 ? 2 : 1, m = mastery(id);
    if (m != null && m < 0.5 && lv > 1) lv--;
    return lv;
  }
  function weakList(tr) {
    // הכי חלשים קודם; אחריהם נושאים שלא תרגלו מזמן
    var ts = (tr ? tr.topics : T).filter(function (t) { return isWeak(t.id) || isStale(t.id); });
    return ts.sort(function (a, b) { return (isWeak(b.id) - isWeak(a.id)) || (mastery(a.id) - mastery(b.id)); });
  }

  // ---------- יעד שבועי ----------
  function weekStart() { var d = new Date(); d.setDate(d.getDate() - d.getDay()); return today(d); }
  var WEEK_GOAL = 5;
  function weekCount() { return st.wk && st.wk.w === weekStart() ? st.wk.n : 0; }
  function weekAdd() {
    if (!st.wk || st.wk.w !== weekStart()) st.wk = { w: weekStart(), n: 0 };
    st.wk.n++;
    if (st.wk.n === WEEK_GOAL) { award('week'); toast('🎯 הגעתם ליעד השבועי!'); }
  }

  // ---------- דרגות ומבחן עלייה ----------
  var RANKS = [
    { name: 'מתחילים', em: '🌱' },
    { name: 'מתאמנים', em: '🥉', need: 0.15, lv: [1, 2], pass: 0.7 },
    { name: 'מתקדמים', em: '🥈', need: 0.35, lv: [2, 2], pass: 0.7 },
    { name: 'מומחים', em: '🥇', need: 0.6, lv: [2, 3], pass: 0.75 },
    { name: 'מוכנים לבגרות', em: '🏆', need: 0.8, lv: [3, 3], pass: 0.8 }
  ];
  st.r = st.r || {};
  function rank(tr) { return st.r[tr.id] || 0; }
  function trackFrac(tr) { var done = 0; tr.topics.forEach(function (t) { done += stagesDone(t.id); }); return done / (tr.topics.length * 6); }

  // ---------- אקראיות קבועה לאתגר היומי (אותו אתגר לכולם באותו יום) ----------
  function seeded(seed, fn) {
    var orig = Math.random, s = seed >>> 0;
    Math.random = function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
    try { return fn(); } finally { Math.random = orig; }
  }
  function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  // ---------- כרטיסי הבית: דרגה, אתגר יומי, חיזוק ----------
  st.focus = st.focus || {};
  function renderCards(tr) {
    if (!tr) { $('ms-rank').innerHTML = ''; $('ms-daily').innerHTML = ''; $('ms-train').innerHTML = ''; $('ms-cards').hidden = true; return; }
    $('ms-cards').hidden = false;
    var r = rank(tr), nx = RANKS[r + 1], fr = trackFrac(tr), html = '';
    html += '<div class="ms-rk"><span class="ms-rk-em" aria-hidden="true">' + RANKS[r].em + '</span><div><small>הדרגה שלי במסלול</small><b>' + RANKS[r].name + '</b></div>' +
      '<ol class="ms-rk-steps" aria-label="הדרגות">' + RANKS.map(function (x, i) { return '<li class="' + (i <= r ? 'on' : '') + '" title="' + x.name + '">' + x.em + '</li>'; }).join('') + '</ol></div>';
    if (nx) {
      var open = fr >= nx.need, left = Math.ceil(nx.need * tr.topics.length * 6 - fr * tr.topics.length * 6);
      html += '<div class="ms-rk-next"><p>הדרגה הבאה: <b>' + nx.em + ' ' + nx.name + '</b>. ' + (open ? 'מבחן העלייה פתוח! ' + 'צריך ' + Math.round(nx.pass * 100) + '% כדי לעלות.' : (left === 1 ? 'עוד שלב אחד' : 'עוד ' + left + ' שלבים') + ' במסלול, ומבחן העלייה נפתח.') + '</p>' +
        '<div class="ms-bar"><i style="width:' + Math.min(100, Math.round(fr / nx.need * 100)) + '%"></i></div>' +
        '<button type="button" class="btn ' + (open ? 'btn-gold' : 'btn-line') + ' btn-sm" id="ms-exam-go"' + (open ? '' : ' disabled') + '>📝 מבחן עלייה לדרגה "' + nx.name + '"</button></div>';
    } else html += '<p class="ms-rk-top">הגעתם לדרגה הגבוהה ביותר במסלול. אפשר להמשיך לאסוף כוכבים ולחזק נושאים. <button type="button" class="linkish" id="ms-cert-show">🎓 התעודה שלי</button></p>';
    $('ms-rank').innerHTML = html;

    // אתגר יומי
    var dn = st.daily && st.daily.date === today() && st.daily.tr === tr.id;
    $('ms-daily').innerHTML = '<h3>🎁 האתגר היומי</h3>' + (dn
      ? '<p>✓ עשיתם את האתגר של היום: <b>' + st.daily.score + '%</b>. מחר מחכה אתגר חדש.</p><button type="button" class="linkish" id="ms-daily-go">לשחק שוב, בשביל הכיף</button>'
      : '<p>חמישה תרגילים מכל המסלול. אותו אתגר לכל מי שלומד את ' + (tr.id === 'base' ? 'היסודות' : 'שאלון ' + tr.id) + ' היום.</p><button type="button" class="btn btn-gold btn-sm" id="ms-daily-go">לאתגר של היום ←</button>');

    // חיזוק אישי
    var weak = weakList(tr), f = st.focus[tr.id];
    if (!f || !f.length) f = weak.slice(0, 3).map(function (t) { return t.id; });
    f = f.filter(function (id) { return tr.topics.some(function (t) { return t.id === id; }); });
    st.focus[tr.id] = f;
    var played = tr.topics.filter(function (t) { return mastery(t.id) != null; });
    $('ms-train').innerHTML = '<h3>💪 האימון שלי</h3><p>' + (weak.length ? 'מצאתי נושאים שכדאי לחזק. סימנתי אותם, ואפשר לבחור אחרים.' : played.length ? 'הכול נראה חזק 👌 בוחרים נושאים, ומתאמנים דווקא בהם.' : 'בוחרים נושאים שרוצים לחזק. אחרי קצת תרגול, אציע לבד מה כדאי לחזק.') + '</p>' +
      '<div class="ms-fchips" role="group" aria-label="נושאים לאימון">' + tr.topics.map(function (t) {
        var m = mastery(t.id), on = f.indexOf(t.id) > -1, lvl = m == null ? '' : m < 0.5 ? 'lo' : m < 0.7 ? 'mid' : 'hi';
        return '<button type="button" data-focus="' + t.id + '" class="' + (on ? 'on' : '') + '" aria-pressed="' + on + '"><i class="ms-mdot ' + lvl + '" aria-hidden="true"></i>' + t.em + ' ' + esc(t.name) + (isWeak(t.id) ? ' <small>לחזק</small>' : isStale(t.id) ? ' <small>לרענן</small>' : '') + '</button>';
      }).join('') + '</div>' +
      '<button type="button" class="btn btn-gold btn-sm" id="ms-train-go"' + (f.length ? '' : ' disabled') + '>אימון חיזוק · 5 תרגילים</button>';
  }
  $('ms-cards').addEventListener('click', function (e) {
    var tr = track(); if (!tr) return;
    var fb2 = e.target.closest('[data-focus]');
    if (fb2) {
      var f = st.focus[tr.id] || [], id = fb2.dataset.focus, i = f.indexOf(id);
      if (i > -1) f.splice(i, 1); else f.push(id);
      st.focus[tr.id] = f; save(); renderCards(tr); return;
    }
    if (e.target.id === 'ms-train-go') startTrain(tr);
    if (e.target.id === 'ms-daily-go') startDaily(tr);
    if (e.target.id === 'ms-exam-go') startExam(tr);
    if (e.target.id === 'ms-cert-show') showCert(tr);
  });

  // =====================================================================
  //  משחק: שלב, אימון חיזוק, אתגר יומי ומבחן עלייה – אותו מנוע
  // =====================================================================
  var G = null, prob = null, k = 0, examTimer = null, REVEAL_MS = 1200;
  function begin(g, title) {
    G = Object.assign({ pi: 0, credit: 0, steps: 0, combo: 0, bumps: 0, per: {} }, g);
    show('ms-play');
    $('ms-play-h').textContent = title;
    $('ms-hintbtn').hidden = !!G.sg.exam;
    $('ms-show').hidden = G.mode === 'exam';
    $('ms-quit').textContent = G.mode === 'stage' ? '→ לשלבים' : '→ למפה';
    clearInterval(examTimer); $('ms-clock').hidden = G.mode !== 'exam';
    if (G.mode === 'exam') { G.t0 = Date.now(); examTimer = setInterval(clock, 1000); clock(); }
    newProblem();
    window.scrollTo({ top: $('ms-app').offsetTop - 10, behavior: reduce ? 'auto' : 'smooth' });
  }
  function clock() { var s = Math.floor((Date.now() - G.t0) / 1000); $('ms-clock').textContent = '⏱ ' + Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }
  function startStage(i) {
    var sg = STAGES[i];
    begin({ mode: 'stage', stage: i, sg: sg, items: sg.lv.map(function (lv) { return { t: cur, lv: lv, base: lv }; }) }, cur.em + ' ' + cur.name + ' · שלב ' + (i + 1) + ': ' + sg.name);
    used('stage_start', { topic: cur.id, stage: i + 1 });
  }
  function startTrain(tr) {
    var ids = st.focus[tr.id] || []; if (!ids.length) return;
    // הנושא הכי חלש מקבל יותר תרגילים
    var ts = ids.map(topic).filter(Boolean).sort(function (a, b) { return (mastery(a.id) == null ? 0.6 : mastery(a.id)) - (mastery(b.id) == null ? 0.6 : mastery(b.id)); });
    // למשל שלושה נושאים: חלש, שני, חלש, שלישי, חלש
    var order = [];
    for (var i = 0; i < 5; i++) order.push(ts.length === 1 || i % 2 === 0 ? ts[0] : ts[1 + ((i - 1) / 2 | 0) % (ts.length - 1)]);
    var before = {}; ts.forEach(function (t) { before[t.id] = mastery(t.id); });
    begin({ mode: 'train', tr: tr, sg: {}, before: before, items: order.map(function (t) { var lv = levelFor(t.id); return { t: t, lv: lv, base: lv }; }) }, '💪 אימון חיזוק');
    used('train_start', { track: tr.id, n: ts.length });
  }
  function startDaily(tr) {
    var day = today(), seed = hash(day + '|' + tr.id);
    var items = seeded(seed, function () {
      var pool = tr.topics.slice(), out = [];
      for (var i = 0; i < 5; i++) {
        var t = pool.splice(Math.floor(Math.random() * pool.length), 1)[0] || tr.topics[i % tr.topics.length];
        var lv = i < 2 ? 1 : i < 4 ? 2 : 3;
        out.push({ t: t, lv: lv, base: lv, p: t.gen(lv) });
      }
      return out;
    });
    begin({ mode: 'daily', tr: tr, sg: {}, items: items, replay: st.daily && st.daily.date === day && st.daily.tr === tr.id }, '🎁 האתגר היומי · ' + day.split('-').reverse().slice(0, 2).join('.'));
    used('daily_start', { track: tr.id });
  }
  function startExam(tr) {
    var r = rank(tr), nx = RANKS[r + 1]; if (!nx || trackFrac(tr) < nx.need) return;
    var ts = tr.topics.slice().sort(function () { return Math.random() - 0.5; }), n = Math.min(8, Math.max(5, ts.length)), items = [];
    for (var i = 0; i < n; i++) { var lv = nx.lv[i % 2]; items.push({ t: ts[i % ts.length], lv: lv, base: lv }); }
    begin({ mode: 'exam', tr: tr, rank: r + 1, sg: { exam: 1 }, items: items }, '📝 מבחן עלייה · ' + nx.em + ' ' + nx.name);
    used('exam_start', { track: tr.id, rank: r + 1 });
  }
  function dots() {
    $('ms-dots').innerHTML = G.items.map(function (it, i) { return '<i class="' + (i < G.pi ? 'd' : i === G.pi ? 'c' : '') + '" title="רמה ' + it.lv + '"></i>'; }).join('');
  }
  function comboUi() {
    $('ms-combo').innerHTML = G.combo >= 2 ? '🔥 <b>' + G.combo + '</b> ברצף' : '';
  }
  function newProblem() {
    var it = G.items[G.pi];
    prob = it.p || it.t.gen(it.lv); k = 0;
    dots(); comboUi();
    $('ms-ptopic').hidden = G.mode === 'stage';
    $('ms-ptopic').innerHTML = it.t.em + ' ' + esc(it.t.name) + ' · רמה ' + it.lv;
    $('ms-ex').innerHTML = '<div dir="ltr">' + prob.ex + '</div>';
    $('ms-done').innerHTML = ''; $('ms-next').hidden = true; $('ms-stepbox').hidden = false;
    step();
  }
  var S = null; // מצב הצעד: ניסיונות, "כמעט", רמז
  function step() {
    var s = prob.steps[k];
    S = { tries: 0, near: false, hint: false };
    $('ms-cur').innerHTML = '<div dir="ltr">' + s.show + '</div>';
    $('ms-q').innerHTML = (prob.steps.length > 1 ? '<span class="pill">צעד ' + (k + 1) + ' מתוך ' + prob.steps.length + '</span> ' : '') + s.q;
    $('ms-in').value = ''; fb('', ''); $('ms-hint').hidden = true; $('ms-heard').hidden = true;
    try { $('ms-in').focus({ preventScroll: true }); } catch (e) {}
  }
  function fb(msg, cls) { $('ms-fb').innerHTML = msg; $('ms-fb').className = 'mx-fb' + (cls ? ' ' + cls : ''); }
  function fmtAns(s) {
    if (s.fr) return s.fr[1] === 1 ? String(s.fr[0]) : s.fr[0] + '/' + s.fr[1];
    if (Number.isInteger(s.a)) return String(s.a);
    var a = Math.round(s.a * 1000) / 1000;
    if (Math.abs(a - s.a) < 1e-9) return String(a);
    for (var d = 2; d <= 24; d++) { var n = Math.round(s.a * d); if (Math.abs(n / d - s.a) < 1e-9) return n + '/' + d; }
    return String(a);
  }

  // ---------- בדיקת תשובה: נכון / כמעט (ולמה) / לא ----------
  function judge(s, raw) {
    var v = parseVal(raw);
    if (isNaN(v)) return { r: 'bad' };
    var a = s.a, tol = s.tol || 1e-6;
    if (!s.tol && Math.abs(Math.round(a * 1000) / 1000 - a) > 1e-9 && /[.,]\d{2,}/.test(raw)) tol = 0.0051;
    var frac = String(raw).replace(/\s/g, '').replace(/[−–—]/g, '-').replace(/^[a-zA-Zא-ת]+=/, '').match(/^(-?\d+)\/(-?\d+)$/);
    if (Math.abs(v - a) <= tol) {
      if (frac && gcd(+frac[1], +frac[2]) !== 1) return { r: 'near', why: 'reduce' };
      return { r: 'ok' };
    }
    if (a !== 0 && Math.abs(v + a) <= tol) return { r: 'near', why: 'sign' };
    var isInt = Number.isInteger(a) && Number.isInteger(v);
    if (!isInt && Math.abs(v - a) <= Math.max(0.051, Math.abs(a) * 0.006)) return { r: 'near', why: 'round' };
    if (a !== 0 && v !== 0) { var q = v / a; if ([10, 100, 0.1, 0.01].some(function (m) { return Math.abs(q - m) < 1e-6 * m; })) return { r: 'near', why: 'point' }; }
    return { r: 'no' };
  }
  var WHY = {
    sign: ['כמעט! בדקו את הסימן: פלוס או מינוס?', 'קרוב מאוד, רק הסימן הפוך. עוד מבט על המינוס?'],
    round: ['כמעט! זו טעות עיגול קטנה. נסו לעגל שוב, או לחשב בלי לעגל באמצע.', 'קרוב מאוד! רק העיגול לא מדויק.'],
    reduce: ['נכון! ועוד צעד קטן: אפשר לצמצם את השבר. מחלקים את המונה והמכנה באותו מספר.', 'הערך נכון 👌 עכשיו רק לצמצם את השבר.'],
    point: ['כמעט! הספרות נכונות, אבל בדקו איפה הנקודה העשרונית (או אחוזים מול שבר).']
  };
  function submit(raw, byVoice) {
    if (!prob || k >= prob.steps.length || G.busy) return;
    var s = prob.steps[k];
    if (!String(raw).trim()) { fb('כותבים את התשובה בתיבה, או לוחצים 🎤 ואומרים אותה.', ''); return; }
    var j = judge(s, raw);
    if (j.r === 'bad') { fb('לא הבנתי את המספר. אפשר לכתוב למשל 12, ‎-3, 2.5 או 3/4.', 'no'); return; }
    if (j.r === 'ok') {
      var c = S.tries === 0 && !S.hint ? 1 : 0.5;
      if (S.near) { c = 0.5; award('fixed'); }
      if (byVoice) award('voice');
      award('first');
      G.combo = c === 1 ? G.combo + 1 : 0;
      if (G.combo === 5) award('combo5'); if (G.combo === 10) award('combo10');
      if (G.combo > st.best) st.best = G.combo;
      st.n++;
      finishStep(c, true);
      tone(SND.ok); flyStar(c < 1);
      return;
    }
    S.tries++; G.combo = 0; comboUi();
    if (j.r === 'near') {
      S.near = true;
      tone(SND.near);
      fb('<span class="ms-halfstar" aria-hidden="true">⯪</span> ' + pick(WHY[j.why]) + ' (חצי כוכב כבר שלכם)', 'near');
      if (S.tries >= 3) { reveal(0.5); }
      return;
    }
    if (S.tries === 1 && !G.sg.exam) { fb('עוד לא. נסו שוב, הנה רמז קטן.', 'no'); showHint(); return; }
    if (S.tries === 1) { fb('עוד לא. יש עוד ניסיון אחד.', 'no'); return; }
    reveal(S.near ? 0.5 : 0);
  }
  function showHint() { S.hint = true; $('ms-hint').hidden = false; $('ms-hint').textContent = '💡 ' + prob.steps[k].hint; }
  function reveal(c) {
    fb('הנה התשובה. מסתכלים עליה רגע, וממשיכים 👇', 'no');
    if (!REVEAL_MS) { finishStep(c, false); return; }
    G.busy = true;
    setTimeout(function () { G.busy = false; finishStep(c, false); }, REVEAL_MS);
  }
  function finishStep(c, right) {
    var s = prob.steps[k], it = G.items[G.pi];
    G.credit += c; G.steps++;
    rec(it.t.id, c);
    var pt = G.per[it.t.id] = G.per[it.t.id] || { c: 0, n: 0 }; pt.c += c; pt.n++;
    var mark = c === 1 ? '★' : c > 0 ? '⯪' : '👀';
    $('ms-done').insertAdjacentHTML('beforeend', '<li class="' + (c === 1 ? '' : c > 0 ? 'half' : 'shown') + '"><div dir="ltr">' + s.show.replace(/<\/?mark>/g, '') + '</div><span>' + mark + ' <bdi dir="ltr">' + esc(fmtAns(s).replace(/^-/, '−')) + '</bdi></span></li>');
    k++; comboUi(); hud();
    if (k < prob.steps.length) { step(); if (right) fb(pick(['✓ נכון!', '✓ יפה!', '✓ בדיוק!']), 'ok'); return; }
    // סוף התרגיל
    G.pi++;
    var msg = right ? pick(['מצוין! פתרתם את כל התרגיל.', 'כל הכבוד!', 'יפה מאוד, ככה בדיוק.']) : 'סיימנו את התרגיל. ממשיכים, כל תרגיל מחזק.';
    // הקושי עולה: שלוש תשובות מושלמות ברצף מקפיצות את התרגיל הבא ברמה
    // (עד רמה אחת מעל הבסיס, כדי שהחימום יישאר חימום; במבחן ובאתגר היומי הרמות קבועות)
    var nxt = G.items[G.pi], prev = G.items[G.pi - 1];
    if (nxt && !nxt.p && G.mode !== 'exam' && G.combo >= 3 && nxt.lv < Math.min(3, nxt.base + 1) && nxt.lv <= prev.lv) {
      nxt.lv = Math.min(3, nxt.base + 1, prev.lv + 1); G.bumps++;
      msg += ' 🚀 הולך לכם מעולה, אז התרגיל הבא גדול יותר.';
      tone(SND.up);
    }
    if (G.pi >= G.items.length) { clearInterval(examTimer); save(); END[G.mode](); return; }
    save();
    dots();
    $('ms-stepbox').hidden = true; $('ms-next').hidden = false;
    $('ms-next-msg').innerHTML = '<span class="mx-fin" dir="ltr">' + (prob.fin || fmtAns(prob.steps[prob.steps.length - 1])) + '</span><br>' + msg;
    try { $('ms-nextbtn').focus({ preventScroll: true }); } catch (e) {}
  }
  $('ms-nextbtn').addEventListener('click', newProblem);
  $('ms-form').addEventListener('submit', function (e) { e.preventDefault(); submit($('ms-in').value, false); });
  $('ms-hintbtn').addEventListener('click', function () { if (prob && k < prob.steps.length) showHint(); });
  $('ms-show').addEventListener('click', function () { if (!prob || k >= prob.steps.length || G.busy) return; G.combo = 0; reveal(S.near ? 0.5 : 0); });
  $('ms-quit').addEventListener('click', function () {
    stopMic(); clearInterval(examTimer);
    if (G && G.mode === 'exam' && G.pi < G.items.length && !confirm('לצאת מהמבחן? אפשר לחזור אליו מתי שרוצים.')) { examTimer = setInterval(clock, 1000); return; }
    if (G && G.mode === 'stage') openTopic(cur.id, false); else goHome();
  });
  function goHome() { show('ms-home'); renderHome(); window.scrollTo({ top: $('ms-app').offsetTop - 10 }); }

  // ---------- מסכי סיום ----------
  function endScreen(stars, head, msg, btns) {
    show('ms-end');
    var big = $('ms-bigstars').children;
    $('ms-bigstars').hidden = stars == null;
    for (var i = 0; i < 3; i++) { big[i].className = ''; }
    if (stars != null) setTimeout(function () { for (var i = 0; i < 3; i++) if (i < stars) big[i].className = 'on d' + i; }, 60);
    tone(SND.end);
    $('ms-end-h').textContent = head;
    $('ms-end-msg').innerHTML = msg;
    $('ms-go-next').hidden = !btns.next; if (btns.next) $('ms-go-next').textContent = btns.next;
    $('ms-again').hidden = !btns.again; if (btns.again) $('ms-again').textContent = btns.again;
    $('ms-to-map').textContent = btns.map || 'למפה';
    $('ms-newbadges').innerHTML = fresh.map(function (id) { var b = BADGES.filter(function (x) { return x[0] === id; })[0]; return '<span class="ms-nb">' + b[1] + ' ' + b[2] + '</span>'; }).join('');
    fresh = [];
    $('ms-extra').innerHTML = btns.extra || '';
    $('ms-support').innerHTML = btns.support ? '<div class="mx-support"><p>💛 המסלול חינמי, ונבנה בהרבה שעות עבודה. אם הוא עוזר לכם בהכנה לבגרות, אפשר לעזור להחזיק את המיזם, גם בסכום קטן.</p><a class="btn btn-line btn-sm" href="/kelim/#litmoch" data-support="1">לתמוך במיזם</a></div>' : '';
    hud();
    window.scrollTo({ top: $('ms-app').offsetTop - 10, behavior: reduce ? 'auto' : 'smooth' });
  }
  function common() {
    markDay(); weekAdd();
    var tot = totalStars(); if (tot >= 25) award('stars25'); if (tot >= 100) award('stars100');
  }
  function masteryRows(ids) {
    return '<ul class="ms-mrows">' + ids.map(function (id) {
      var t = topic(id), b = G.before ? G.before[id] : null, a = mastery(id), up = b != null && a > b + 0.01;
      return '<li><span>' + t.em + ' ' + esc(t.name) + '</span><span class="ms-mbar"><i style="width:' + Math.round((a || 0) * 100) + '%"></i></span><b>' + Math.round((a || 0) * 100) + '%' + (up ? ' ⬆' : '') + '</b></li>';
    }).join('') + '</ul>';
  }
  var END = {
    stage: function () {
      var sc = G.steps ? G.credit / G.steps : 0, stars = sc >= 0.85 ? 3 : sc >= 0.6 ? 2 : 1;
      var a = tstars(cur.id), before = a[G.stage], wasDone = stagesDone(cur.id);
      if (stars > a[G.stage]) a[G.stage] = stars;
      common(); award('stage');
      if (stars === 3) award('perfect');
      if (G.sg.exam) award('bagrut');
      if (stagesDone(cur.id) === 6) award('topic');
      var tr = track(); if (tr && tr.topics.every(function (t) { return stagesDone(t.id) === 6; })) award('track');
      var nx = tr && RANKS[rank(tr) + 1], examOpen = nx && trackFrac(tr) >= nx.need && !st.examNote;
      save();
      var m = 'צדקתם ב-' + Math.round(sc * 100) + '% מהצעדים. ';
      m += stars === 3 ? 'ממש מושלם.' : stars === 2 ? 'עוד קצת, ושלושה כוכבים שלכם. אפשר לחזור לשלב מתי שרוצים.' : 'השלב הבא נפתח. וכל פעם שחוזרים לשלב הזה, הכוכבים רק עולים.';
      if (before && stars <= before) m += ' (השיא שלכם בשלב: ' + before + ' ⭐)';
      var last = G.stage + 1 >= STAGES.length;
      endScreen(stars, { 3: '🎉 שלושה כוכבים!', 2: '👏 שני כוכבים!', 1: '🌟 עברתם את השלב!' }[stars], esc(m), {
        next: last ? null : 'לשלב הבא ←', again: '↺ שוב, בשביל עוד כוכבים', map: last ? 'למפה, לנושא הבא' : 'לשלבים',
        extra: examOpen ? '<p class="ms-examnote">📝 נפתח לכם מבחן עלייה לדרגה "' + nx.name + '"! הוא מחכה בדף המסלול.</p>' : '',
        support: G.sg.exam || (stagesDone(cur.id) === 6 && wasDone < 6) });
      if (examOpen) { st.examNote = 1; save(); }
      used('stage_end', { topic: cur.id, stage: G.stage + 1, stars: stars, bumps: G.bumps });
    },
    train: function () {
      var sc = G.steps ? G.credit / G.steps : 0;
      common(); award('train');
      st.tn = (st.tn || 0) + 1; if (st.tn >= 10) award('train10');
      save();
      var ids = Object.keys(G.before), ups = ids.filter(function (id) { return G.before[id] != null && mastery(id) > G.before[id] + 0.01; });
      endScreen(null, ups.length ? '💪 התחזקתם!' : '👏 סיימתם אימון', 'צדקתם ב-' + Math.round(sc * 100) + '% מהצעדים. ' + (ups.length ? 'הנושאים שהשתפרו מסומנים בחץ.' : 'כל אימון בונה עוד שכבה. ככה מתחזקים.') + masteryRows(ids),
        { again: '↺ עוד אימון באותם נושאים', map: 'למפה' });
      used('train_end', { score: Math.round(sc * 100) });
    },
    daily: function () {
      var sc = G.steps ? Math.round(G.credit / G.steps * 100) : 0, stars = sc >= 85 ? 3 : sc >= 60 ? 2 : 1;
      if (!G.replay) {
        common(); award('daily');
        st.dn = (st.dn || 0) + 1; if (st.dn >= 7) award('daily7');
        st.daily = { date: today(), tr: G.tr.id, score: sc };
      }
      save();
      endScreen(stars, '🎁 האתגר היומי הושלם!', 'הציון שלכם היום: <b>' + sc + '%</b>. ' + (G.replay ? 'זה היה משחק חוזר, לכיף.' : 'מחר יחכה כאן אתגר חדש. ') + (st.dn ? ' סה״כ אתגרים יומיים: ' + st.dn + '.' : ''), { map: 'למפה' });
      used('daily_end', { score: sc, replay: G.replay ? 1 : 0 });
    },
    exam: function () {
      var sc = G.steps ? G.credit / G.steps : 0, nx = RANKS[G.rank], ok = sc >= nx.pass, tr = G.tr;
      var mins = Math.round((Date.now() - G.t0) / 60000);
      var weakIds = Object.keys(G.per).filter(function (id) { return G.per[id].c / G.per[id].n < 0.7; });
      common();
      if (ok) {
        st.r[tr.id] = G.rank; st.examNote = 0;
        award('rank' + G.rank);
        save();
        tone(SND.up);
        endScreen(3, nx.em + ' עליתם לדרגה "' + nx.name + '"!', 'הציון שלכם: <b>' + Math.round(sc * 100) + '%</b> (צריך היה ' + Math.round(nx.pass * 100) + '%), תוך ' + mins + ' דקות. ' +
          (RANKS[G.rank + 1] ? 'הדרגה הבאה: ' + RANKS[G.rank + 1].em + ' ' + RANKS[G.rank + 1].name + '. ממשיכים במסלול, והמבחן הבא ייפתח.' : 'זו הדרגה הגבוהה ביותר. אתם מוכנים לבגרות! 🎓') +
          (weakIds.length ? '<p class="ms-sub">ובכל זאת, כדאי לחזק עוד קצת: ' + weakIds.map(function (id) { return topic(id).name; }).join(', ') + '.</p>' : ''),
          { map: 'למפה', extra: RANKS[G.rank + 1] ? '' : '<button type="button" class="btn btn-gold btn-sm" id="ms-cert-show2">🎓 לתעודה שלי</button>', support: true });
      } else {
        if (weakIds.length) st.focus[tr.id] = weakIds.slice(0, 4);
        save();
        endScreen(null, '💪 כמעט שם!', 'הציון שלכם: <b>' + Math.round(sc * 100) + '%</b>. כדי לעלות צריך ' + Math.round(nx.pass * 100) + '%. זה לא כישלון, זו מפה: עכשיו ברור מה לחזק. ' +
          (weakIds.length ? 'סימנתי לכם באימון האישי את הנושאים: <b>' + weakIds.map(function (id) { return esc(topic(id).name); }).join(', ') + '</b>.' : '') + ' אפשר לנסות שוב מתי שרוצים.',
          { next: weakIds.length ? '💪 לאימון בנושאים האלה' : null, again: '↺ לנסות את המבחן שוב', map: 'למפה' });
      }
      used('exam_end', { track: tr.id, rank: G.rank, score: Math.round(sc * 100), pass: ok ? 1 : 0 });
    }
  };
  $('ms-go-next').addEventListener('click', function () {
    if (G.mode === 'stage') startStage(G.stage + 1);
    else if (G.mode === 'exam') startTrain(G.tr);
  });
  $('ms-again').addEventListener('click', function () {
    if (G.mode === 'stage') startStage(G.stage);
    else if (G.mode === 'train') startTrain(G.tr);
    else if (G.mode === 'exam') startExam(G.tr);
  });
  $('ms-to-map').addEventListener('click', function () {
    if (G.mode === 'stage' && G.stage + 1 < STAGES.length) openTopic(cur.id, true);
    else goHome();
  });
  $('ms-support').addEventListener('click', function (e) { if (e.target.closest('[data-support]')) used('support_click'); });
  $('ms-extra').addEventListener('click', function (e) { if (e.target.id === 'ms-cert-show2') showCert(G.tr); });

  // ---------- תעודה לדרגה הגבוהה ----------
  function showCert(tr) {
    st.cert = st.cert || {};
    var d = st.cert[tr.id] || today();
    st.cert[tr.id] = d; save();
    show('ms-end');
    $('ms-bigstars').hidden = true; $('ms-newbadges').innerHTML = ''; $('ms-support').innerHTML = '';
    $('ms-go-next').hidden = true; $('ms-again').hidden = true; $('ms-to-map').textContent = 'למפה';
    $('ms-end-h').textContent = '🎓 התעודה שלי';
    $('ms-end-msg').innerHTML = 'כותבים את השם, ואפשר להדפיס או לשמור כ-PDF.';
    $('ms-extra').innerHTML = '<label class="ms-certname">השם שלי: <input id="ms-cname" type="text" value="' + esc(st.name || '') + '" maxlength="40"></label>' +
      '<div class="ms-cert" id="ms-cert"><small>הכלים של גילעד רחמים · כלים ללימודים</small><div class="ms-cert-em">🏆</div><h3>תעודת "מוכנים לבגרות"</h3>' +
      '<p><b id="ms-cert-n">' + esc(st.name || '______') + '</b></p><p>עבר/ה את כל מבחני העלייה במסלול ' + esc(tr.long || 'היסודות') + ',<br>והגיע/ה לדרגה הגבוהה ביותר.</p><p class="ms-cert-d">' + d.split('-').reverse().join('.') + '</p></div>' +
      '<button type="button" class="btn btn-gold btn-sm" id="ms-print">🖨 להדפיס או לשמור</button>';
    $('ms-cname').addEventListener('input', function () { st.name = this.value.trim(); save(); $('ms-cert-n').textContent = st.name || '______'; });
    $('ms-print').addEventListener('click', function () { document.body.classList.add('ms-printing'); window.print(); setTimeout(function () { document.body.classList.remove('ms-printing'); }, 500); used('cert_print'); });
    G = G || { mode: 'cert' }; if (G.mode !== 'stage') G.mode = 'cert';
    window.scrollTo({ top: $('ms-app').offsetTop - 10 });
  }

  // =====================================================================
  //  לענות בקול: זיהוי דיבור בעברית ← ממיר הדיבור המשותף ← מספר
  // =====================================================================
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition, recog = null, listening = false, gfix = {};
  var FR = { 'חצאים': 2, 'שלישים': 3, 'רבעים': 4, 'חמישיות': 5, 'שישיות': 6, 'שביעיות': 7, 'שמיניות': 8, 'תשיעיות': 9, 'עשיריות': 10 };
  var FR1 = { 'שליש': 3, 'חמישית': 5, 'שישית': 6, 'שביעית': 7, 'שמינית': 8, 'תשיעית': 9, 'עשירית': 10 };
  // "שלושה רבעים" ← 3 חלקי 4, "אחת ושליש" ← 1 ועוד 1 חלקי 3, "25 אחוז" ← 25, "איקס שווה 4" ← 4
  function words(t, s) {
    var w = String(t).replace(/[״"]/g, '').replace(/%/g, ' ').trim().split(/\s+/).map(function (x) { return gfix[x] || x; }), out = [];
    w.forEach(function (x, i) {
      var y = x.length > 1 && x[0] === 'ו' && (FR1[x.slice(1)] || FR[x.slice(1)]) ? x.slice(1) : null;
      if (y) { out.push('ועוד', '1', 'חלקי', String(FR1[y] || FR[y])); return; }
      if (FR[x]) { out.push('חלקי', String(FR[x])); return; }
      if (FR1[x]) { if (!out.length || /^(מינוס|פחות)$/.test(out[out.length - 1])) out.push('1'); out.push('חלקי', String(FR1[x])); return; }
      if (/^(אחוז|אחוזים|%)$/.test(x)) return;
      if (/^(התשובה|תשובה|היא|הוא|יוצא|שווה|זה)$/.test(x) && out.length === 0) return;
      out.push(x);
    });
    var e = window.HeDibur.hasHe(out.join(' ')) ? window.HeDibur.heToExpr(out.join(' ')) : out.join(' ');
    e = e.replace(/^\s*[xyabn]\s*=\s*/i, '').replace(/^\s*=\s*/, '');
    if (s && /π/.test(s.q || '')) e = e.replace(/\s*\*?\s*pi\s*$/, '');
    return e;
  }
  // מחשב קטן ובטוח: מספרים, + − × ÷ ^, סוגריים, שורש ופאי
  function calc(e) {
    var tk = String(e).replace(/×/g, '*').replace(/÷/g, '/').match(/\d+(?:\.\d+)?|sqrt|pi|[+\-*/^()]/g) || [], i = 0;
    if (tk.join('') !== String(e).replace(/×/g, '*').replace(/÷/g, '/').replace(/\s+/g, '')) throw 0;
    function peek() { return tk[i]; }
    function ex() { var v = term(); while (peek() === '+' || peek() === '-') { var o = tk[i++], r = term(); v = o === '+' ? v + r : v - r; } return v; }
    function term() { var v = fac(); while (peek() === '*' || peek() === '/' || (peek() && /^(\d|sqrt|pi|\()/.test(peek()))) { var o = /^[*/]$/.test(peek()) ? tk[i++] : '*', r = fac(); v = o === '*' ? v * r : v / r; } return v; }
    function fac() { if (peek() === '-') { i++; return -fac(); } if (peek() === '+') { i++; return fac(); } var b = atom(); if (peek() === '^') { i++; return Math.pow(b, fac()); } return b; }
    function atom() {
      var t = tk[i++];
      if (t == null) throw 0;
      if (t === '(') { var v = ex(); if (tk[i++] !== ')') throw 0; return v; }
      if (t === 'pi') return Math.PI;
      if (t === 'sqrt') return Math.sqrt(fac());
      if (/^\d/.test(t)) return +t;
      throw 0;
    }
    var v = ex(); if (i !== tk.length || !isFinite(v)) throw 0; return v;
  }
  // מה לכתוב בתיבה: מספר או שבר כמו שנאמר (כדי שגם "שבר לא מצומצם" ייבדק), אחרת הערך המחושב
  function toAnswer(e) {
    var c = e.replace(/\s+/g, '');
    if (/^-?\d+(\.\d+)?$/.test(c)) return c;
    if (/^-?\d+\/\d+$/.test(c)) return c;
    var v = calc(e);
    return String(Math.round(v * 10000) / 10000);
  }
  function heard(alts) {
    var s = prob && prob.steps[k], first = alts[0] || '', got = null;
    for (var i = 0; i < alts.length && got == null; i++) {
      try { got = toAnswer(words(alts[i], s)); first = alts[i]; } catch (e) { got = null; }
    }
    $('ms-heard').hidden = false;
    if (got == null) {
      $('ms-heard').innerHTML = 'שמעתי: "' + esc(alts[0] || '') + '". לא הצלחתי להבין מזה מספר. אפשר לנסות שוב, או לכתוב בתיבה.';
      used('voice_miss'); return;
    }
    $('ms-heard').innerHTML = '🎤 שמעתי: "' + esc(first) + '" ← <bdi dir="ltr">' + esc(got.replace(/^-/, '−')) + '</bdi>';
    $('ms-in').value = got;
    usedFirst('voice');
    submit(got, true);
  }
  function micUi(on) {
    listening = on; var m = $('ms-mic');
    m.classList.toggle('on', on); m.setAttribute('aria-pressed', on ? 'true' : 'false');
    m.textContent = on ? '⏹' : '🎤'; m.setAttribute('aria-label', on ? 'מקשיב… לעצור' : 'לענות בקול');
  }
  function stopMic() { if (recog && listening) try { recog.stop(); } catch (e) {} micUi(false); }
  if (!SR) { $('ms-mic').hidden = true; }
  else {
    // תיקוני דיבור שהמחשבון כבר למד (מאגר משותף, קריאה בלבד)
    try { var cs = JSON.parse(localStorage.getItem('limudim-calc') || '{}'); gfix = Object.assign({}, cs.gfix || {}, (cs.vfix && cs.vfix.w) || {}); } catch (e) {}
    $('ms-mic').addEventListener('click', function () {
      if (listening) { stopMic(); return; }
      try {
        recog = new SR(); recog.lang = 'he-IL'; recog.interimResults = false; recog.maxAlternatives = 5;
        recog.onresult = function (ev) { var r = ev.results[0], a = []; for (var i = 0; i < r.length; i++) a.push(r[i].transcript); micUi(false); heard(a); };
        recog.onerror = function (ev) { micUi(false); $('ms-heard').hidden = false; $('ms-heard').textContent = ev.error === 'not-allowed' ? 'צריך לאשר לדפדפן להשתמש במיקרופון.' : ev.error === 'no-speech' ? 'לא שמעתי. לוחצים שוב ואומרים את התשובה.' : 'הדיבור לא עבד הפעם. אפשר לכתוב בתיבה.'; };
        recog.onend = function () { micUi(false); };
        recog.start(); micUi(true);
      } catch (e) { micUi(false); }
    });
  }

  // =====================================================================
  //  שמירה בקישור: להעביר את ההתקדמות לטלפון או למחשב אחר
  // =====================================================================
  function b64e(s) { return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function b64d(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return decodeURIComponent(escape(atob(s))); }
  function packed() { return b64e(JSON.stringify({ s: st.s, b: st.b, d: st.d.slice(-30), tr: st.tr, best: st.best, n: st.n, r: st.r, m: st.m, dn: st.dn, tn: st.tn })); }
  $('ms-share').addEventListener('click', function () {
    var url = location.origin + location.pathname + '#p=' + packed(), t = 'ההתקדמות שלי במסלול המתמטיקה: ' + Math.round(totalStars()) + ' ⭐';
    used('share');
    if (navigator.share) { navigator.share({ title: 'המסלול שלי במתמטיקה', text: t, url: url }).catch(function () {}); return; }
    var done = function () { $('ms-share-st').textContent = '✓ הקישור הועתק. פותחים אותו במכשיר השני.'; };
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, function () { prompt('מעתיקים את הקישור:', url); });
    else prompt('מעתיקים את הקישור:', url);
  });
  function merge(o) {
    Object.keys(o.s || {}).forEach(function (id) {
      if (!topic(id)) return;
      var a = tstars(id); (o.s[id] || []).forEach(function (n, i) { if (i < 6 && +n > a[i]) a[i] = Math.min(3, +n | 0); });
    });
    Object.keys(o.b || {}).forEach(function (id) { if (!st.b[id] && BADGES.some(function (x) { return x[0] === id; })) st.b[id] = String(o.b[id]).slice(0, 10); });
    (o.d || []).forEach(function (d) { if (/^\d{4}-\d\d-\d\d$/.test(d) && st.d.indexOf(d) < 0) st.d.push(d); });
    st.d.sort();
    if (!st.tr && o.tr) st.tr = String(o.tr);
    st.best = Math.max(st.best, +o.best || 0); st.n = Math.max(st.n, +o.n || 0);
    Object.keys(o.r || {}).forEach(function (id) { if (TRACKS.some(function (x) { return x.id === id; })) st.r[id] = Math.min(4, Math.max(st.r[id] || 0, +o.r[id] || 0)); });
    Object.keys(o.m || {}).forEach(function (id) { var x = o.m[id]; if (topic(id) && x && (!st.m[id] || +x.n > st.m[id].n)) st.m[id] = { m: Math.max(0, Math.min(1, +x.m || 0)), n: +x.n | 0, d: /^\d{4}-\d\d-\d\d$/.test(x.d) ? x.d : today() }; });
    st.dn = Math.max(st.dn || 0, +o.dn || 0); st.tn = Math.max(st.tn || 0, +o.tn || 0);
    save();
  }
  (function importLink() {
    var m = location.hash.match(/^#p=([\w-]+)/); if (!m) return;
    var o; try { o = JSON.parse(b64d(m[1])); } catch (e) { return; }
    var n = 0; Object.keys(o.s || {}).forEach(function (id) { (o.s[id] || []).forEach(function (x) { n += +x || 0; }); });
    var box = $('ms-import'); box.hidden = false;
    box.innerHTML = '<p>📲 בקישור יש התקדמות: <b>' + n + ' ⭐</b>. לצרף אותה לטלפון הזה? (מה שכבר יש כאן לא יימחק)</p><div class="ms-row2"><button type="button" class="btn btn-gold btn-sm" id="ms-imp-y">לצרף</button><button type="button" class="linkish" id="ms-imp-n">לא עכשיו</button></div>';
    function clear() { box.hidden = true; history.replaceState(null, '', location.pathname); }
    $('ms-imp-y').addEventListener('click', function () { merge(o); clear(); renderHome(); toast('✓ ההתקדמות צורפה'); used('import'); });
    $('ms-imp-n').addEventListener('click', clear);
  })();

  // ---------- התחלה ----------
  sndBtn();
  renderHome();
  var resizeT = null, lastW = $('ms-app').clientWidth;
  window.addEventListener('resize', function () {
    clearTimeout(resizeT);
    resizeT = setTimeout(function () {
      var w = $('ms-app').clientWidth; if (w === lastW) return; lastW = w;
      if (!$('ms-home').hidden) renderHome(); else if (!$('ms-topic').hidden && cur) openTopic(cur.id, false);
    }, 150);
  });
  var h = location.hash.slice(1);
  if (h && topic(h)) openTopic(h, false);
  window.__ms = { fast: function () { REVEAL_MS = 0; }, st: st, startTrain: startTrain, startDaily: startDaily, startExam: startExam, track: track, renderHome: renderHome, judge: judge, words: words, toAnswer: toAnswer, heard: heard, step: function () { return prob && prob.steps[k]; }, submit: submit, openTopic: openTopic, startStage: startStage, G: function () { return G; } }; // לבדיקות
})();
