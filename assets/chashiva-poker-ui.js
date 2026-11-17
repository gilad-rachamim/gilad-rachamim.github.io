// פוקר על נקודות – התצוגה: שולחן אובלי, מושבים סביבו, פס פעולות, אנימציות, צלילים,
// חלונות (סדר הידיים, היסטוריה, הגדרות, פרופיל), מצב לימוד, פעולה מראש, תגובות מהירות בחדר.
// המנוע (החוקים) ב-chashiva-poker.js. השולחן המשותף (מצבים, חדר) ב-chashiva-cards.js.
(function () {
  'use strict';
  var CH = window.CH; if (!CH || !document.getElementById('tb')) return;
  var esc = CH.esc, KEY = 'chashiva-poker-ui', PROF = 'chashiva-poker-prof', TOOL = 'chashiva_poker';
  var SUIT = ['s', 'h', 'd', 'c'], SYM = ['♠', '♥', '♦', '♣'], SUITHE = ['עלה', 'לב', 'יהלום', 'תלתן'], RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  var AVS = ['🙂', '😎', '🦁', '🐯', '🦊', '🐻', '🐼', '🐨', '🐸', '🦉', '🐙', '🦄', '🐬', '🐢', '🦅', '🌟'];
  var EMO = ['👍', '😂', '😮', '😎', '🤔', '😅', '🔥', '👏'], PHR = ['יפה!', 'מזל…', 'בלוף?', 'תודה', 'רגע', 'יאללה'];
  var TAG = { fold: ['קיפל', 'k'], check: ['צ׳ק', 'k'], call: ['משווה', 'g'], raise: ['מעלה', 'r'], bet: ['מהמר', 'r'], allin: ['הכול!', 'a'] };
  var LVL = { easy: 'קל', normal: 'רגיל', hard: 'קשה' };
  var RM = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  function loadK(k) { try { return JSON.parse(localStorage.getItem(k) || '{}') || {}; } catch (e) { return {}; } }
  function saveK(k, o) { try { localStorage.setItem(k, JSON.stringify(o)); } catch (e) {} }
  var P = loadK(KEY);
  if (P.c4 === undefined) P.c4 = true;
  if (P.snd === undefined) P.snd = true;
  function setP(k, val) { P[k] = val; saveK(KEY, P); }
  function fmt(n) { return (+n || 0).toLocaleString('he-IL'); }
  var AVN = {}; // דמויות של שחקנים אחרים בחדר (לפי שם)
  function rawName(ctx, v, k) { return String((ctx.names && ctx.names[k]) || v.nm[k] || ''); }
  function nameOf(ctx, v, k) { return rawName(ctx, v, k).replace(/^🤖\s*/, ''); }
  function hashAv(s) { var h = 0; s = String(s); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return AVS[1 + Math.abs(h) % (AVS.length - 1)]; }
  function avOf(ctx, v, k) {
    var raw = rawName(ctx, v, k);
    if (/^🤖/.test(raw)) { var b = window.PKE && PKE.botOf(raw); return b ? b.av : '🤖'; }
    if (k === v.seat && ctx.mode !== 'phone') return P.av || '🙂';
    return AVN[raw] || hashAv(raw);
  }
  function styleOf(v, k) { var p = v.pers && v.pers[k]; return p && window.PKE ? PKE.STYLE[p].he : ''; }
  function card(c, cls) {
    if (c === undefined || c === null) return '<span class="pk2-c ph' + (cls ? ' ' + cls : '') + '" aria-hidden="true"></span>';
    var s = Math.floor(c / 13), r = RANKS[c % 13];
    return '<span class="pk2-c ' + SUIT[s] + (cls ? ' ' + cls : '') + '" role="img" aria-label="' + r + ' ' + SUITHE[s] + '"><b>' + r + '</b><i>' + SYM[s] + '︎</i></span>';
  }
  function cd(x) { var su = { s: 0, h: 1, d: 2, c: 3 }[x.slice(-1)], r = x.slice(0, -1); return su * 13 + RANKS.indexOf(r); }
  function learnOn(ctx) { return ctx.mode !== 'live' && (P.learn !== undefined ? !!P.learn : ctx.mode === 'bot'); }

  // ---------- צלילים (מסונתזים, בלי קבצים) ----------
  var AC = null;
  function unlock() { if (!AC) try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } if (AC && AC.state === 'suspended') AC.resume(); }
  document.addEventListener('pointerdown', unlock, { passive: true }); document.addEventListener('keydown', unlock);
  function tone(f, d, type, vol, at) { var c = AC, t = c.currentTime + (at || 0), o = c.createOscillator(), g = c.createGain(); o.type = type || 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + d + 0.02); }
  function noise(d, vol, freq, at) { var c = AC, t = c.currentTime + (at || 0), n = Math.floor(c.sampleRate * d), b = c.createBuffer(1, n, c.sampleRate), x = b.getChannelData(0); for (var i = 0; i < n; i++) x[i] = (Math.random() * 2 - 1) * (1 - i / n); var s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); f.type = 'bandpass'; f.frequency.value = freq; g.gain.value = vol; s.buffer = b; s.connect(f); f.connect(g); g.connect(c.destination); s.start(t); }
  var SND = {
    deal: function () { noise(0.06, 0.5, 3200); noise(0.06, 0.4, 3000, 0.08); },
    flip: function () { noise(0.05, 0.45, 2200); },
    chip: function () { tone(2300, 0.06, 'triangle', 0.12); tone(3100, 0.05, 'triangle', 0.09, 0.045); },
    check: function () { tone(190, 0.07, 'sine', 0.45); tone(170, 0.07, 'sine', 0.4, 0.1); },
    fold: function () { noise(0.2, 0.35, 800); },
    turn: function () { tone(660, 0.13, 'sine', 0.16); tone(880, 0.18, 'sine', 0.16, 0.12); },
    win: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.2, 'triangle', 0.16, i * 0.1); }); }
  };
  function play(n) { if (!P.snd || !AC || window.CHTEST) return; try { if (AC.state === 'suspended') AC.resume(); SND[n](); } catch (e) {} }

  // ---------- פריסת המושבים סביב השולחן ----------
  function layout(n, base, hero, wide, minY) {
    var cx = 50, cy = wide ? 44 : 43, rx = wide ? 44 : 41, ry = wide ? 40 : 37, out = [];
    for (var k = 0; k < n; k++) {
      var i = (k - base + n) % n, t = (90 + i * 360 / n) * Math.PI / 180;
      var x = cx + rx * Math.cos(t), y = cy + ry * Math.sin(t);
      x = Math.max(wide ? 8 : 11, Math.min(wide ? 92 : 89, x)); y = Math.max(minY || 0, y);
      if (hero && i === 0) { out.push({ x: 50, y: 88, hero: true }); continue; }
      if (!hero && i === 0) y = Math.min(y, wide ? 83 : 80);
      out.push({ x: x, y: y, side: x < 38 ? 'L' : x > 62 ? 'R' : 'T' });
    }
    return out;
  }
  function lerp(p, q, f) { return { x: p.x + (q.x - p.x) * f, y: p.y + (q.y - p.y) * f }; }

  // ---------- חלונות ----------
  function modal(el, title, body, wire) {
    var m = el.querySelector('.pk2-modal');
    m.innerHTML = '<div class="pk2-box" role="dialog" aria-modal="true" aria-labelledby="pk2-mt"><h2><span id="pk2-mt">' + title + '</span><button type="button" data-close aria-label="סגירה">✕</button></h2>' + body + '</div>';
    m.hidden = false;
    var back = document.activeElement;
    function close() { m.hidden = true; m.innerHTML = ''; document.removeEventListener('keydown', onKey); if (back && back.focus) try { back.focus(); } catch (e) {} }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    m.onclick = function (e) { if (e.target === m) close(); };
    m.querySelector('[data-close]').onclick = close;
    m.querySelector('[data-close]').focus();
    if (wire) wire(m, close);
  }
  var RANKLIST = [
    ['רויאל פלאש', 'Royal Flush', 'A עד 10 באותה צורה', ['Ah', 'Kh', 'Qh', 'Jh', '10h']],
    ['רצף בצבע', 'Straight Flush', '5 קלפים ברצף באותה צורה', ['9c', '8c', '7c', '6c', '5c']],
    ['רביעייה', 'Four of a Kind', '4 קלפים מאותו ערך', ['Qs', 'Qh', 'Qd', 'Qc', '3s']],
    ['פול האוס', 'Full House', 'שלישייה + זוג', ['Ks', 'Kh', 'Kd', '7c', '7h']],
    ['צבע', 'Flush', '5 קלפים מאותה צורה', ['Ad', 'Jd', '9d', '6d', '2d']],
    ['רצף', 'Straight', '5 ערכים ברצף (A-2-3-4-5 גם נחשב)', ['10s', '9h', '8d', '7c', '6s']],
    ['שלישייה', 'Three of a Kind', '3 קלפים מאותו ערך', ['8s', '8h', '8d', 'Kc', '2s']],
    ['שני זוגות', 'Two Pair', 'שני זוגות שונים', ['Js', 'Jd', '4c', '4h', 'As']],
    ['זוג', 'One Pair', '2 קלפים מאותו ערך', ['10h', '10c', 'Ks', '6d', '3c']],
    ['קלף גבוה', 'High Card', 'כשאין כלום – הקלף הגבוה קובע', ['As', 'Jd', '8c', '5h', '2s']]
  ];
  function ranksModal(el) {
    modal(el, '🏆 סדר הידיים בפוקר', '<p>מהחזקה (למעלה) לחלשה. היד נבנית מ-5 קלפים: שני הקלפים שלכם + הקלפים המשותפים.</p><ol class="pk2-ranks">' + RANKLIST.map(function (r, i) {
      return '<li><span><b>' + (i + 1) + '. ' + r[0] + '</b><small>' + r[1] + ' · ' + r[2] + '</small></span><div>' + r[3].map(function (x) { return card(cd(x), 'mini'); }).join('') + '</div></li>';
    }).join('') + '</ol><p>שוויון? מחליטים לפי הקלף הגבוה הבא (ה"קיקר"). יד זהה לגמרי – מחלקים את הקופה.</p>');
    CH.used(TOOL, 'ranks');
  }
  var ACTHE = { f: 'קיפל', x: 'צ׳ק', c: 'השווה', r: 'העלה ל-' }, STREET = ['לפני הפלופ', 'פלופ', 'טרן', 'ריבר'];
  function histModal(el, v, ctx) {
    var H = (v.hist || []).slice().reverse();
    var body = H.length ? '<ul class="pk2-hist">' + H.map(function (h) {
      var nm = function (k) { return k === v.seat ? 'אתם' : String(h.nm[k] || '').replace(/^🤖\s*/, ''); };
      var ws = []; h.won.forEach(function (x, k) { if (x) ws.push(nm(k) + ' +' + fmt(x) + (h.cat && h.cat[k] ? ' (' + h.cat[k] + ')' : '')); });
      var shown = Object.keys(h.holes).map(function (k) { return '<span>' + esc(nm(+k)) + ':</span> ' + h.holes[k].map(function (c) { return card(c, 'mini'); }).join(''); }).join(' &nbsp; ');
      var acts = [0, 1, 2, 3].map(function (st) { var a = h.acts.filter(function (x) { return x[0] === st; }); return a.length ? '<b>' + STREET[st] + ':</b> ' + a.map(function (x) { return esc(nm(x[1])) + ' ' + ACTHE[x[2]] + (x[2] === 'r' ? fmt(x[3]) : x[2] === 'c' ? ' ' + fmt(x[3]) : ''); }).join(', ') : ''; }).filter(Boolean).join('<br>');
      return '<li><b>יד ' + h.hn + '</b> · 🏆 ' + esc(ws.join(' · ')) + '<div class="row">' + (h.board.length ? h.board.map(function (c) { return card(c, 'mini'); }).join('') : '<small>בלי קלפים משותפים</small>') + '</div>' + (shown ? '<div class="row">' + shown + '</div>' : '') + '<small>' + acts + '</small></li>';
    }).join('') + '</ul>' : '<p>עוד לא הסתיימה אף יד במשחק הזה.</p>';
    modal(el, '📜 הידיים האחרונות', body);
    CH.used(TOOL, 'history');
  }
  function profModal(el) {
    var S = loadK(PROF), me = CH.myName();
    var body = '<h3>הדמות שלכם</h3><div class="pk2-avs" role="group" aria-label="בחירת דמות">' + AVS.map(function (a) { return '<button type="button" data-av="' + a + '" aria-pressed="' + ((P.av || '🙂') === a) + '" aria-label="דמות ' + a + '">' + a + '</button>'; }).join('') + '</div>' +
      '<h3>השם שלכם</h3><input type="text" maxlength="14" data-nm value="' + esc(me) + '" placeholder="השם שלכם" aria-label="השם שלכם">' +
      '<h3>הסטטיסטיקה שלכם (נשמרת רק בטלפון הזה)</h3><div class="pk2-stats">' +
      [['ידיים ששוחקו', fmt(S.hands)], ['ידיים שנוצחו', fmt(S.won) + (S.hands ? ' (' + Math.round(100 * (S.won || 0) / S.hands) + '%)' : '')], ['היד הטובה ביותר', esc(S.bestTxt || '—')], ['הקופה הגדולה ביותר', fmt(S.bigPot)], ['טורנירים שנוצחו', fmt(S.tWins)], ['בלי הרשמה', 'רק אצלכם']].map(function (x) { return '<div><b>' + x[1] + '</b>' + x[0] + '</div>'; }).join('') + '</div>' +
      '<div class="pk2-opt" style="margin-top:12px"><button type="button" data-reset>🗑️ איפוס הסטטיסטיקה</button></div>';
    modal(el, '👤 הפרופיל שלי', body, function (m, close) {
      m.querySelectorAll('[data-av]').forEach(function (b) { b.onclick = function () { setP('av', b.getAttribute('data-av')); m.querySelectorAll('[data-av]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); rerender(el); sendAv(el); }; });
      var nm = m.querySelector('[data-nm]'); nm.onchange = function () { var t = nm.value.trim().slice(0, 14); try { if (t) localStorage.setItem('chashiva-name', t); } catch (e) {} };
      m.querySelector('[data-reset]').onclick = function () { if (confirm('לאפס את הסטטיסטיקה?')) { saveK(PROF, {}); close(); profModal(el); } };
    });
    CH.used(TOOL, 'profile');
  }
  function menuModal(el, v, ctx) {
    var O = opts(), live = ctx && ctx.mode === 'live', inGame = v && !ctx.over;
    var h = '<div class="pk2-opt"><button type="button" data-prof>👤 הפרופיל שלי</button><button type="button" data-fs>' + (document.body.classList.contains('pk2-fs') ? '↙️ יציאה ממסך מלא' : '⛶ מסך מלא') + '</button>' + (v && v.mode === 'ring' && inGame && v.seat >= 0 ? '<button type="button" data-stand>🚪 לקום מהשולחן (סיכום)</button>' : '') + '</div>';
    h += '<h3>סוג משחק' + (live ? ' (במשחק הבא)' : '') + '</h3><div class="pk2-opt"><button type="button" data-mode="tour" aria-pressed="' + (O.mode === 'tour') + '">🏆 טורניר – אחרון שנשאר מנצח</button><button type="button" data-mode="ring" aria-pressed="' + (O.mode === 'ring') + '">♾️ שולחן פתוח – בלי סוף</button></div>';
    if (!live) h += '<h3>רמת המחשב</h3><div class="pk2-opt">' + ['easy', 'normal', 'hard'].map(function (l) { return '<button type="button" data-lvl="' + l + '" aria-pressed="' + (O.lvl === l) + '">' + LVL[l] + '</button>'; }).join('') + '</div>';
    h += '<h3>מצב לימוד</h3>' + (live ? '<p>בחדר עם חברים מצב הלימוד כבוי (כדי שיהיה הוגן).</p>' : '<div class="pk2-opt"><button type="button" data-learn="1" aria-pressed="' + learnOn(ctx || {}) + '">🎓 דלוק – סיכוי לנצח ורמזים</button><button type="button" data-learn="0" aria-pressed="' + !learnOn(ctx || {}) + '">כבוי</button></div>');
    h += '<h3>צבעי הקלפים</h3><div class="pk2-opt"><button type="button" data-c4="1" aria-pressed="' + !!P.c4 + '">4 צבעים (♠ ♥ ♦ ♣ שונים)</button><button type="button" data-c4="0" aria-pressed="' + !P.c4 + '">2 צבעים (קלאסי)</button></div>';
    h += '<h3>היריבים</h3><ul>' + PKE.BOTS.map(function (b) { return '<li>' + b.av + ' <b>' + b.n + '</b> – ' + PKE.STYLE[b.p].he + '</li>'; }).join('') + '</ul>';
    h += '<h3>קיצורי מקלדת (במחשב)</h3><p><b>F</b> לקפל · <b>C</b> צ׳ק / להשוות · <b>R</b> להעלות · <b>רווח</b> ליד הבאה</p>';
    h += '<p>🪙 על נקודות בלבד. אין כסף אמיתי ואין הימורים.</p>';
    modal(el, '☰ הגדרות', h, function (m, close) {
      m.querySelector('[data-prof]').onclick = function () { close(); profModal(el); };
      m.querySelector('[data-fs]').onclick = function () { close(); fullscreen(el); };
      var st = m.querySelector('[data-stand]'); if (st) st.onclick = function () { close(); ctx.act({ a: 'stand' }); CH.used(TOOL, 'stand'); };
      m.querySelectorAll('[data-c4]').forEach(function (b) { b.onclick = function () { setP('c4', b.getAttribute('data-c4') === '1'); close(); rerender(el); }; });
      m.querySelectorAll('[data-learn]').forEach(function (b) { b.onclick = function () { setP('learn', b.getAttribute('data-learn') === '1'); CH.used(TOOL, 'learn_toggle', { on: P.learn ? 1 : 0 }); close(); rerender(el); }; });
      function newWith(k, val, ev) {
        var o = loadK(KEY); o[k] = val; saveK(KEY, o); P[k] = val; CH.used(TOOL, ev); close();
        if (!live) { var nb = document.getElementById('tb-new'); if (nb) nb.click(); }
      }
      m.querySelectorAll('[data-mode]').forEach(function (b) { b.onclick = function () { var x = b.getAttribute('data-mode'); newWith('mode', x, x === 'ring' ? 'mode_ring' : 'mode_tourney'); }; });
      m.querySelectorAll('[data-lvl]').forEach(function (b) { b.onclick = function () { newWith('lvl', b.getAttribute('data-lvl'), 'level'); }; });
    });
  }
  function fullscreen(el, force) {
    var on = force !== undefined ? force : !document.body.classList.contains('pk2-fs');
    document.body.classList.toggle('pk2-fs', on);
    try {
      if (on && document.documentElement.requestFullscreen && !document.fullscreenElement) document.documentElement.requestFullscreen().catch(function () {});
      if (!on && document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
    } catch (e) {}
    if (on) CH.used(TOOL, 'fullscreen');
    setTimeout(function () { rerender(el); }, 60);
  }
  document.addEventListener('fullscreenchange', function () { if (!document.fullscreenElement && document.body.classList.contains('pk2-fs')) { document.body.classList.remove('pk2-fs'); var b = document.getElementById('tb-board'); if (b) setTimeout(function () { rerender(b); }, 60); } });

  // ---------- תגובות מהירות (בחדר עם חברים) ----------
  function bubble(el, seat, txt) {
    var ui = el._ui, p = ui.pos && ui.pos[seat], st = el.querySelector('.pk2-stage'); if (!p || !st) return;
    var b = document.createElement('div'); b.className = 'pk2-emo' + (txt.length > 2 ? ' t' : ''); b.textContent = txt;
    b.style.left = p.x + '%'; b.style.top = (p.hero ? 70 : p.y - 9) + '%';
    st.appendChild(b); setTimeout(function () { b.remove(); }, 2500);
  }
  function emoPanel(el, ctx) {
    var now = Date.now(), ui = el._ui;
    var body = '<div class="pk2-avs" role="group" aria-label="אימוג׳י">' + EMO.map(function (e) { return '<button type="button" data-e="' + e + '">' + e + '</button>'; }).join('') + '</div><div class="pk2-opt" style="margin-top:8px">' + PHR.map(function (e) { return '<button type="button" data-e="' + e + '">' + e + '</button>'; }).join('') + '</div><p>תגובה אחת כל 3 שניות. אין כאן צ׳אט חופשי.</p>';
    modal(el, '😀 תגובה מהירה', body, function (m, close) {
      m.querySelectorAll('[data-e]').forEach(function (b) { b.onclick = function () {
        if (ui.emoT && Date.now() - ui.emoT < 3000) { close(); return; }
        ui.emoT = Date.now(); var e = b.getAttribute('data-e'); close();
        if (ctx.send) ctx.send({ k: 'emo', e: e }); bubble(el, el._last[0].seat, e);
        if (!ui.emoUsed) { ui.emoUsed = 1; CH.used(TOOL, 'emoji'); }
      }; });
    });
    void now;
  }
  function sendAv(el) { var L = el._last; if (L && L[1].send) L[1].send({ k: 'av', av: P.av || '🙂', nm: CH.myName() || 'אתם' }); }
  function onMsg(d, seat) {
    var el = document.getElementById('tb-board'); if (!el || !el._ui) return;
    if (d && d.k === 'emo' && (EMO.indexOf(d.e) >= 0 || PHR.indexOf(d.e) >= 0)) bubble(el, seat, d.e);
    if (d && d.k === 'av' && AVS.indexOf(d.av) >= 0 && typeof d.nm === 'string') { AVN[d.nm.slice(0, 14)] = d.av; rerender(el); }
  }

  // ---------- שלד ----------
  function build(el) {
    el.innerHTML = '<div class="pk2" dir="rtl">' +
      '<div class="pk2-top"><div class="pk2-ic"><button type="button" data-menu aria-label="הגדרות ופרופיל">☰</button><button type="button" data-snd aria-label="צליל"></button></div>' +
      '<div class="pk2-inf" data-inf></div>' +
      '<div class="pk2-ic"><button type="button" data-hist aria-label="הידיים האחרונות">📜</button><button type="button" data-ranks aria-label="סדר הידיים">❓</button></div></div>' +
      '<div class="pk2-stage"><div class="pk2-table"><div class="pk2-felt"><div class="pk2-mid"><div class="pk2-pot" data-pot></div><div class="pk2-board" data-board></div><div class="pk2-hint" data-hint></div></div></div></div>' +
      '<div data-seats></div><div class="pk2-eq" data-eq hidden></div><div class="pk2-side"><button type="button" data-fsb aria-label="מסך מלא">⛶</button></div><div class="pk2-side r" data-emob hidden><button type="button" data-emo aria-label="תגובה מהירה">😀</button></div></div>' +
      '<div class="pk2-dock" data-dock></div>' +
      '<p class="sr" aria-live="polite" data-live></p>' +
      '<div class="pk2-modal" hidden></div></div>';
    el._ui = el._ui || {};
    var q = function (s) { return el.querySelector(s); };
    q('[data-ranks]').onclick = function () { ranksModal(el); };
    q('[data-hist]').onclick = function () { var L = el._last; if (L) histModal(el, L[0], L[1]); };
    q('[data-menu]').onclick = function () { var L = el._last; menuModal(el, L && L[0], L && L[1]); };
    q('[data-fsb]').onclick = function () { fullscreen(el); };
    q('[data-emo]').onclick = function () { var L = el._last; if (L) emoPanel(el, L[1]); };
    q('[data-snd]').onclick = function () { setP('snd', !P.snd); unlock(); if (P.snd) play('chip'); rerender(el); };
  }
  var resizeT = 0;
  window.addEventListener('resize', function () { clearTimeout(resizeT); resizeT = setTimeout(function () { var b = document.getElementById('tb-board'); if (b && b._last) rerender(b); }, 120); });
  function rerender(el) { if (el && el._last) render(el._last[0], el, el._last[1]); }

  // ---------- סיכוי לנצח ברקע (לא תוקע את המסך) ----------
  function equityAsync(el, v) {
    var ui = el._ui, key = v.id + ':' + v.hn + ':' + v.board.join() + ':' + v.opp + ':' + v.hole.join();
    if (ui.eq && ui.eq.key === key) return ui.eq.val;
    ui.eq = { key: key, val: null }; var sum = 0, done = 0, N = window.CHTEST ? 1 : 8, IT = 150;
    (function chunk() {
      if (!ui.eq || ui.eq.key !== key) return;
      sum += PKE.equity(v.hole, v.board, v.opp, IT); done++;
      if (done < N) return setTimeout(chunk, 0);
      ui.eq.val = sum / done; rerender(el);
    })();
    return null;
  }

  // ---------- סטטיסטיקה מקומית ----------
  function stats(v, ctx) {
    if (v.seat < 0 || ctx.mode === 'phone') return;
    var S = loadK(PROF), me = v.seat, key = v.id + ':' + v.hn;
    if (v.phase === 'show' && v.res && S.last !== key && v.cards[me]) {
      S.last = key; S.hands = (S.hands || 0) + 1;
      if (v.res.won[me] > 0) { S.won = (S.won || 0) + 1; if (v.res.won[me] > (S.bigPot || 0)) S.bigPot = v.res.won[me]; }
      if (v.res.show && v.mineV > (S.best || 0)) { S.best = v.mineV; S.bestTxt = PKE.describe(v.mineV); }
      saveK(PROF, S);
    }
    if (ctx.over && v.mode === 'tour' && v.chips[me] > 0 && S.tw !== v.id) { S.tw = v.id; S.tWins = (S.tWins || 0) + 1; saveK(PROF, S); }
  }

  // ---------- אנימציות ----------
  function rel(el, r) { var b = el.querySelector('.pk2').getBoundingClientRect(); return { x: r.left - b.left + r.width / 2, y: r.top - b.top + r.height / 2 }; }
  function fly(el, from, to, delay) {
    var root = el.querySelector('.pk2'), c = document.createElement('i'); c.className = 'pk2-chip pk2-fly';
    c.style.left = (from.x - 8) + 'px'; c.style.top = (from.y - 8) + 'px'; root.appendChild(c);
    var a = c.animate([{ translate: '0 0', opacity: 1 }, { translate: (to.x - from.x) + 'px ' + (to.y - from.y) + 'px', opacity: 0.9 }], { duration: 380, delay: delay || 0, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'forwards' });
    a.onfinish = function () { c.remove(); }; setTimeout(function () { c.remove(); }, 1200 + (delay || 0));
  }
  function animate(el, v, prev, betRects) {
    if (RM.matches || !prev || prev.id !== v.id || !Element.prototype.animate) return;
    var q = function (s) { return el.querySelector(s); }, potEl = q('[data-pot] span'); if (!potEl) return;
    var pot = rel(el, potEl.getBoundingClientRect());
    if (prev.hn !== v.hn) {
      var targets = el.querySelectorAll('.pk2-hero .hc .pk2-c, .pk2-bk'), i = 0;
      targets.forEach(function (t) { var r = rel(el, t.getBoundingClientRect()); t.animate([{ translate: (pot.x - r.x) + 'px ' + (pot.y - r.y) + 'px', opacity: 0 }, { translate: '0 0', opacity: 1 }], { duration: 340, delay: 60 * i++, easing: 'ease-out', fill: 'backwards' }); });
      return;
    }
    if (v.board.length > prev.board.length) {
      var cs = el.querySelectorAll('[data-board] .pk2-c');
      for (var b = prev.board.length; b < v.board.length; b++) if (cs[b]) cs[b].animate([{ transform: 'perspective(400px) rotateY(90deg)', opacity: 0.4 }, { transform: 'perspective(400px) rotateY(0)', opacity: 1 }], { duration: 300, delay: (b - prev.board.length) * 110, easing: 'ease-out', fill: 'backwards' });
    }
    if (betRects && betRects.length && (v.board.length > prev.board.length || (v.phase === 'show' && prev.phase !== 'show'))) betRects.forEach(function (r, i) { fly(el, r, pot, i * 40); });
    if (v.phase === 'show' && prev.phase !== 'show' && v.res) {
      v.res.w.forEach(function (k, i) { var s = el.querySelector('[data-k="' + k + '"]'); if (s) fly(el, pot, rel(el, s.getBoundingClientRect()), 380 + i * 90); });
    }
  }
  function sounds(v, prev, ctx) {
    if (!prev || prev.id !== v.id) return;
    if (prev.hn !== v.hn) { play('deal'); return; }
    if (v.board.length > prev.board.length) play('flip');
    var any = '';
    for (var k = 0; k < v.n; k++) if (v.last[k] && v.last[k] !== prev.last[k]) any = v.last[k];
    if (any === 'fold') play('fold'); else if (any === 'check') play('check'); else if (any) play('chip');
    if (v.phase === 'show' && prev.phase !== 'show' && v.res) { if (v.seat >= 0 && v.res.won[v.seat] > 0) play('win'); else play('chip'); }
  }

  // ---------- ציור ----------
  function render(v, el, ctx) {
    el._last = [v, ctx];
    if (!el.querySelector('.pk2')) build(el);
    var ui = el._ui, root = el.querySelector('.pk2'), q = function (s) { return el.querySelector(s); };
    var fs = document.body.classList.contains('pk2-fs');
    var wide = window.matchMedia('(min-width: 820px)').matches || (fs && window.innerWidth > window.innerHeight * 1.15);
    root.classList.toggle('wide', wide);
    root.classList.toggle('pk2-4c', !!P.c4);
    var stage = q('.pk2-stage'), W = stage.offsetWidth || 390, H = stage.offsetHeight || 560;
    var u = wide ? Math.min(1.35, Math.max(0.8, H / 470)) : Math.min(1.3, Math.max(0.78, Math.min(W / 390, H / 540)));
    if (!wide && v.n >= 7) u = Math.max(0.72, u * 0.85);
    root.style.setProperty('--u', u.toFixed(3));
    var fsb = q('[data-fsb]'); fsb.setAttribute('aria-pressed', fs); fsb.textContent = fs ? '↙️' : '⛶'; fsb.setAttribute('aria-label', fs ? 'יציאה ממסך מלא' : 'מסך מלא');
    var sb = q('[data-snd]'); sb.textContent = P.snd ? '🔊' : '🔇'; sb.setAttribute('aria-pressed', !!P.snd); sb.setAttribute('aria-label', P.snd ? 'צליל דלוק' : 'צליל כבוי');
    q('[data-emob]').hidden = !(ctx.mode === 'live' && ctx.send && v.seat >= 0);
    if (ctx.mode === 'live' && ctx.send && !ui.avSent) { ui.avSent = 1; sendAv(el); }

    var me = v.seat, show = v.phase === 'show', res = v.res, prev = ui.prev;
    var key = v.id + ':' + v.hn + ':' + v.phase + ':' + v.cur;
    if (ui.key !== key) { ui.key = key; ui.to = 0; }
    if (ui.preHn !== v.hn) { ui.pre = null; ui.preHn = v.hn; ui.paused = false; }
    // לפני שמחליפים את התצוגה: איפה היו האסימונים (כדי להעיף אותם לקופה)
    var betRects = null;
    if (prev && prev.id === v.id && prev.hn === v.hn && (v.board.length > prev.board.length || (show && prev.phase !== 'show'))) betRects = Array.prototype.map.call(el.querySelectorAll('.pk2-bet'), function (b) { return rel(el, b.getBoundingClientRect()); });

    // שורת מידע
    q('[data-inf]').innerHTML = 'יד ' + v.hn + ' · בליינדים <b>' + v.blind + '/' + v.blind * 2 + '</b><small>' + (v.mode === 'ring' ? '♾️ שולחן פתוח · ' + LVL[v.lvl] : (v.nextUp > 1 ? 'עולים בעוד ' + v.nextUp + ' ידיים' : 'עולים ביד הבאה') + (ctx.mode === 'bot' ? ' · ' + LVL[v.lvl] : '')) + '</small>';

    // הבלטת היד המנצחת
    var winSet = {};
    if (show && res && res.show) res.w.forEach(function (k) { (res.five[k] || []).forEach(function (c) { winSet[c] = 1; }); });
    var hl = show && res && res.show;
    function cc(c) { return hl ? (winSet[c] ? 'win' : 'dim') : ''; }

    // קופה
    var pots = v.pots && v.pots.length > 1 ? v.pots : null;
    q('[data-pot]').innerHTML = show ? (res ? '<span><i class="pk2-chip" style="--c:#2f6fd0"></i> קופה ' + fmt(res.pots.reduce(function (a, p) { return a + p.amt; }, 0)) + '</span>' : '') :
      pots ? pots.map(function (p, i) { return '<span class="' + (i ? 'side' : '') + '"><i class="pk2-chip" style="--c:' + (i ? '#8a5cc8' : '#2f6fd0') + '"></i> ' + (i ? 'קופת צד ' + fmt(p) : 'קופה ' + fmt(p)) + '</span>'; }).join('') :
      '<span><i class="pk2-chip" style="--c:#2f6fd0"></i> קופה ' + fmt(v.pot) + '</span>';
    q('[data-board]').innerHTML = [0, 1, 2, 3, 4].map(function (i) { return v.board[i] !== undefined ? card(v.board[i], cc(v.board[i])) : card(null); }).join('');

    // מצב לימוד: סיכוי לנצח ורמז
    var learn = learnOn(ctx) && me >= 0 && !show && v.inn[me] && !v.fold[me] && v.hole.length === 2, eq = learn ? equityAsync(el, v) : null;
    var eqEl = q('[data-eq]'); eqEl.hidden = !learn;
    if (learn) eqEl.innerHTML = 'סיכוי לנצח<b>' + (eq === null ? '…' : Math.round(eq * 100) + '%') + '</b><small>מול ' + v.opp + '</small>';

    // שורת מצב באמצע
    var hint = '';
    if (show && res) {
      var who = function (ks) { return ks.map(function (k) { return k === me ? 'אתם' : nameOf(ctx, v, k); }).join(' ו'); };
      if (!res.show) hint = '<span class="win">🏆 ' + esc(who(res.w)) + ' +' + fmt(res.won[res.w[0]]) + ' – כולם קיפלו</span>';
      else hint = '<span class="win">' + res.pots.map(function (p, i) { return '🏆 ' + (i ? 'קופת צד: ' : '') + esc(who(p.w)) + ' +' + fmt(p.amt) + ' · ' + esc(p.cat); }).join('<br>') + '</span>';
    } else if (me >= 0 && !v.fold[me] && v.hole.length) {
      var tip = '';
      if (learn && eq !== null && ctx.mine) {
        if (v.call > 0) { var need = v.call / (v.pot + v.call), r1 = (v.pot / v.call); tip = 'הקופה נותנת ' + (r1 >= 10 ? Math.round(r1) : r1.toFixed(1).replace('.0', '')) + ' ל-1 · ' + (eq >= need + 0.05 ? 'כדאי להשוות' : eq < need - 0.04 ? 'עדיף לקפל' : 'החלטה גבולית'); if (eq > 0.7 && v.canRaise) tip += ' – ואפילו להעלות'; }
        else tip = eq > 0.62 ? 'יד חזקה – כדאי להמר' : eq > 0.4 ? 'אפשר צ׳ק או הימור קטן' : 'צ׳ק בחינם – לא להוסיף';
      }
      if (v.mine || tip) hint = '<span>' + (v.mine ? 'יש לכם: ' + esc(v.mine) : '') + (v.mine && tip ? '<br>' : '') + (tip ? '💡 ' + esc(tip) : '') + '</span>';
    }
    q('[data-hint]').innerHTML = hint;

    // מושבים
    var hero = me >= 0, base = hero ? me : 0, pos = layout(v.n, base, hero, wide, 50 * u / H * 100), center = { x: 50, y: wide ? 44 : 43 };
    ui.pos = pos;
    var info = ctx.seatInfo || [], timed = ctx.turnEnd && !show && !ctx.over, left = timed ? Math.max(0, ctx.turnEnd - Date.now()) : 0, total = (ctx.turnSec || 30) * 1000;
    var seatsH = '';
    for (var k = 0; k < v.n; k++) {
      var p = pos[k], out = !v.inn[k] && v.chips[k] <= 0, fold = v.fold[k], turn = v.t === k && !show && !ctx.over;
      var lastT = TAG[v.last && v.last[k]], won = show && res && res.won[k] > 0, off = info[k] && info[k].on === false;
      var tag = won ? '<span class="pk2-tag w">+' + fmt(res.won[k]) + '</span>' : out ? '<span class="pk2-tag k">בחוץ</span>' : lastT ? '<span class="pk2-tag ' + lastT[1] + '">' + lastT[0] + '</span>' : '';
      var ring = turn && timed ? ' style="--from:' + (100 * left / total).toFixed(1) + '%;animation-duration:' + (left / 1000).toFixed(2) + 's"' : '';
      if (p.hero) {
        var hc = v.hole.length ? v.hole.map(function (c) { return card(c, cc(c)); }).join('') : '';
        seatsH += '<div class="pk2-hero' + (turn ? ' turn' : '') + (fold ? ' fold' : '') + (won ? ' won' : '') + '" data-k="' + k + '"><div class="hc">' + hc + '</div><div class="pk2-plate"' + (ctx.mode !== 'phone' ? ' data-me role="button" tabindex="0" aria-label="הפרופיל שלי"' : '') + '>' + tag + '<b>' + esc(ctx.mode === 'phone' ? nameOf(ctx, v, k) : 'אתם') + ' ' + avOf(ctx, v, k) + '</b><span>' + fmt(v.chips[k]) + '</span></div></div>';
      } else {
        var shown = v.reveal && v.reveal[k], sty = styleOf(v, k);
        var cls = 'pk2-seat ' + p.side + (turn ? ' turn' : '') + (turn && timed ? ' timed' : '') + (fold ? ' fold' : '') + (out ? ' out' : '') + (won ? ' won' : '') + (off ? ' off' : '');
        var lbl = nameOf(ctx, v, k) + (sty ? ' (' + sty + ')' : '') + ', ' + fmt(v.chips[k]) + ' נקודות' + (lastT ? ', ' + lastT[0] : '') + (turn ? ', בתור' : '') + (off ? ', מנותק' : '');
        seatsH += '<div class="' + cls + '" data-k="' + k + '" style="left:' + p.x.toFixed(1) + '%;top:' + p.y.toFixed(1) + '%" role="group" aria-label="' + esc(lbl) + '">' +
          (shown ? '<div class="pk2-shown">' + shown.map(function (c) { return card(c, cc(c)); }).join('') + '</div>' : (v.cards[k] && !fold && !out ? '<div class="pk2-bk" aria-hidden="true"><i></i><i></i></div>' : '')) +
          '<div class="pk2-av" aria-hidden="true"' + ring + '>' + avOf(ctx, v, k) + '</div><div class="pk2-plate">' + tag + '<b>' + esc(nameOf(ctx, v, k)) + '</b><span>' + fmt(v.chips[k]) + '</span></div></div>';
      }
      var mid = !p.hero && p.side !== 'T' && Math.abs(p.y - center.y) < 12;
      if (v.bet[k] > 0 && !show) { var bp = p.hero ? { x: 50, y: 66 } : mid ? { x: p.x + (p.side === 'L' ? 7 : -7), y: p.y - 14 } : lerp(p, center, 0.42); seatsH += '<div class="pk2-bet" style="left:' + bp.x.toFixed(1) + '%;top:' + bp.y.toFixed(1) + '%"><i class="pk2-chip" style="--c:' + (v.last[k] === 'allin' ? '#e8c87c' : '#c8463c') + '"></i>' + fmt(v.bet[k]) + '</div>'; }
      if (v.btn === k) { var dp = p.hero ? { x: 66, y: 74 } : mid ? { x: p.x + (p.side === 'L' ? 9 : -9), y: p.y + 9 } : lerp(p, center, 0.24); if (!p.hero && !mid) dp.x += p.side === 'L' ? 5 : p.side === 'R' ? -5 : 9; seatsH += '<div class="pk2-dl" style="left:' + dp.x.toFixed(1) + '%;top:' + dp.y.toFixed(1) + '%" role="img" aria-label="מחלק">D</div>'; }
    }
    q('[data-seats]').innerHTML = seatsH;
    var mp = q('[data-me]'); if (mp) { mp.onclick = function () { profModal(el); }; mp.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); profModal(el); } }; }

    // הודעה לקוראי מסך
    var live = (v.log || []).slice(-1)[0] || '';
    if (ctx.mine && !show) live = 'התור שלכם. ' + live;
    if (ui.live !== live) { ui.live = live; q('[data-live]').textContent = live; }

    // התור שלכם: צליל ורטט פעם אחת
    var myTurn = !!(ctx.mine && !show && me >= 0);
    if (myTurn && !ui.wasMine && prev && prev.id === v.id) { play('turn'); if (navigator.vibrate && !window.CHTEST) try { navigator.vibrate(35); } catch (e) {} }
    ui.wasMine = myTurn;

    animate(el, v, prev, betRects);
    sounds(v, prev, ctx);
    ui.prev = { id: v.id, hn: v.hn, board: v.board.slice(), phase: v.phase, last: (v.last || []).slice(), n: v.n };
    stats(v, ctx);
    dock(v, el, ctx);
  }

  // ---------- פס הפעולות ----------
  function raiseTo(v, frac) {
    var base = v.cur === 0 ? v.pot : v.pot + v.call;
    return Math.max(v.minTo, Math.min(v.maxTo, v.cur + Math.round(frac * base / v.blind) * v.blind));
  }
  var PRE = { cf: 'צ׳ק / קיפול', ca: 'להשוות הכול', ck: 'צ׳ק' };
  function dock(v, el, ctx) {
    var d = el.querySelector('[data-dock]'), ui = el._ui, me = v.seat, h = '';
    clearInterval(ui.cdT); clearTimeout(ui.preT);
    var who = v.t >= 0 ? (v.t === me ? 'אתם' : nameOf(ctx, v, v.t)) : '';
    var timed = ctx.turnEnd && v.phase !== 'show' && !ctx.over;
    if (ctx.over) h = '<p class="pk2-wait">🏁 המשחק נגמר</p>';
    else if (me < 0) h = '<p class="pk2-wait">👀 צופים במשחק' + (v.pend || ctx.pendingMe ? ' · מצטרפים ביד הבאה' : '') + '</p>';
    else if (v.phase === 'show') {
      var canShow = v.res && !v.res.show && v.res.w.indexOf(me) >= 0 && !(v.reveal && v.reveal[me]);
      var extra = (canShow ? '<button type="button" class="bc" data-show>👀 להראות</button>' : '') + (v.mode === 'ring' && ctx.mode !== 'live' ? '<button type="button" class="bf" data-stand>🚪 לקום</button>' : '');
      if (ctx.mine) {
        var auto = ctx.mode !== 'phone' && !ui.paused;
        h = (auto ? '<p class="pk2-wait">יד הבאה בעוד <b data-cd>4</b>… <button type="button" class="pk2-link" data-pause>⏸ לעצור רגע</button></p>' : '') +
          '<div class="pk2-acts">' + extra + '<button type="button" class="bn" data-next>ליד הבאה ▶<span class="pk2-kb"> (רווח)</span></button></div>';
      } else h = (extra ? '<div class="pk2-acts">' + extra + '</div>' : '') + '<p class="pk2-wait">עוד רגע יד חדשה…</p>';
    } else if (ctx.mine && !v.fold[me]) {
      ui.paused = false;
      var to = ui.to || raiseTo(v, v.cur === 0 ? 0.5 : 0.75); to = Math.max(v.minTo, Math.min(v.maxTo, to)); ui.to = to;
      var allIn = to >= v.maxTo, isBet = v.cur === 0;
      if (v.canRaise) {
        h += '<div class="pk2-pre" role="group" aria-label="גודל ההעלאה">' + [['⅓', 1 / 3], ['½ קופה', 0.5], ['¾', 0.75], ['קופה', 1]].map(function (x) { var t = raiseTo(v, x[1]); return '<button type="button" data-to="' + t + '" aria-pressed="' + (t === to) + '">' + x[0] + '</button>'; }).join('') + '<button type="button" data-to="' + v.maxTo + '" aria-pressed="' + allIn + '">הכול</button></div>';
        h += '<div class="pk2-sl"><button type="button" data-step="-1" aria-label="פחות">−</button><input type="range" min="' + v.minTo + '" max="' + v.maxTo + '" step="' + v.blind + '" value="' + to + '" aria-label="סכום ההעלאה" data-range><button type="button" data-step="1" aria-label="יותר">+</button><output data-out>' + fmt(to) + '</output></div>';
      }
      if (timed) h += '<p class="pk2-wait pk2-timer">⏱ <b data-tl>' + Math.ceil((ctx.turnEnd - Date.now()) / 1000) + '</b> שניות לפעולה</p>';
      h += '<div class="pk2-acts"><button type="button" class="bf" data-a="fold">לקפל<span class="pk2-kb"> (F)</span></button>' +
        (v.call > 0 ? '<button type="button" class="bc" data-a="call">להשוות<small>' + fmt(v.call) + (v.call >= v.chips[me] ? ' (הכול)' : '') + '</small></button>' : '<button type="button" class="bc" data-a="check">צ׳ק<span class="pk2-kb"> (C)</span></button>') +
        (v.canRaise ? '<button type="button" class="br" data-a="raise">' + (allIn ? 'הכול!' : isBet ? 'להמר' : 'להעלות') + '<small data-rl>' + (isBet && !allIn ? fmt(to) : 'ל-' + fmt(to)) + '</small></button>' : '') + '</div>';
    } else {
      var inHand = v.inn[me] && !v.fold[me] && v.chips[me] > 0 && ctx.mode !== 'phone';
      h = '<p class="pk2-wait">' + (v.fold[me] ? 'קיפלתם. מחכים לסוף היד…' : v.chips[me] === 0 && v.inn[me] ? 'אתם בהכול! מחכים לקלפים…' : !v.inn[me] ? 'אין לכם נקודות ביד הזאת' : '⏳ מחכים ל<b>' + esc(who) + '</b>…') + '</p>';
      if (inHand) h = '<div class="pk2-pre" role="group" aria-label="פעולה מראש – מתבצעת לבד כשמגיע התור">' + Object.keys(PRE).map(function (x) { return '<button type="button" data-pre="' + x + '" aria-pressed="' + !!(ui.pre && ui.pre.t === x) + '">' + PRE[x] + '</button>'; }).join('') + '</div>' + h;
    }
    d.innerHTML = h;
    d.querySelectorAll('[data-a]').forEach(function (b) { b.onclick = function () { var a = b.getAttribute('data-a'); ctx.act(a === 'raise' ? { a: a, to: ui.to } : { a: a }); }; });
    var nx = d.querySelector('[data-next]'); if (nx) nx.onclick = function () { clearInterval(ui.cdT); ctx.act({ next: 1 }); };
    var sh = d.querySelector('[data-show]'); if (sh) sh.onclick = function () { ui.paused = true; ctx.act({ a: 'show' }); };
    var sd = d.querySelector('[data-stand]'); if (sd) sd.onclick = function () { clearInterval(ui.cdT); ctx.act({ a: 'stand' }); CH.used(TOOL, 'stand'); };
    var pz = d.querySelector('[data-pause]'); if (pz) pz.onclick = function () { ui.paused = true; dock(v, el, ctx); };
    // ספירה ליד הבאה
    var cdEl = d.querySelector('[data-cd]');
    if (cdEl) { var t0 = Date.now(), hn0 = v.hn; ui.cdT = setInterval(function () { var left = 4 - Math.floor((Date.now() - t0) / 1000); if (left <= 0) { clearInterval(ui.cdT); var L = el._last; if (L && L[0].hn === hn0 && L[0].phase === 'show' && !ui.paused) ctx.act({ next: 1 }); } else cdEl.textContent = left; }, 250); }
    // שעון תור
    var tl = d.querySelector('[data-tl]'); if (tl) ui.cdT = setInterval(function () { var s = Math.max(0, Math.ceil((ctx.turnEnd - Date.now()) / 1000)); tl.textContent = s; if (!document.body.contains(tl)) clearInterval(ui.cdT); }, 500);
    // פעולה מראש
    d.querySelectorAll('[data-pre]').forEach(function (b) { b.onclick = function () { var x = b.getAttribute('data-pre'); ui.pre = ui.pre && ui.pre.t === x ? null : { t: x, cur: v.cur, hn: v.hn }; if (ui.pre && !ui.preUsed) { ui.preUsed = 1; CH.used(TOOL, 'preaction', { t: x }); } dock(v, el, ctx); }; });
    if (ctx.mine && v.phase !== 'show' && ui.pre && ui.pre.hn === v.hn && !v.fold[me]) {
      var pr = ui.pre, a = null; ui.pre = null;
      if (pr.t === 'cf') a = v.call > 0 ? { a: 'fold' } : { a: 'check' };
      else if (pr.t === 'ca') a = v.call > 0 ? { a: 'call' } : { a: 'check' };
      else if (pr.t === 'ck') { if (v.call === 0) a = { a: 'check' }; else ctx.say && ctx.say('הפעולה מראש בוטלה – מישהו הימר'); }
      if (a) ui.preT = setTimeout(function () { ctx.act(a); }, window.CHTEST ? 5 : 280);
    }
    function setTo(t) {
      ui.to = Math.max(v.minTo, Math.min(v.maxTo, t));
      var r = d.querySelector('[data-range]'), o = d.querySelector('[data-out]'), rl = d.querySelector('[data-rl]'), rb = d.querySelector('[data-a=raise]');
      if (r) r.value = ui.to; if (o) o.textContent = fmt(ui.to);
      var allIn = ui.to >= v.maxTo, isBet = v.cur === 0;
      if (rb) rb.firstChild.nodeValue = allIn ? 'הכול!' : isBet ? 'להמר' : 'להעלות';
      if (rl) rl.textContent = isBet && !allIn ? fmt(ui.to) : 'ל-' + fmt(ui.to);
      d.querySelectorAll('[data-to]').forEach(function (b) { b.setAttribute('aria-pressed', +b.getAttribute('data-to') === ui.to); });
    }
    d.querySelectorAll('[data-to]').forEach(function (b) { b.onclick = function () { setTo(+b.getAttribute('data-to')); }; });
    d.querySelectorAll('[data-step]').forEach(function (b) { b.onclick = function () { setTo(ui.to + (+b.getAttribute('data-step')) * v.blind * 2); }; });
    var rg = d.querySelector('[data-range]'); if (rg) rg.oninput = function () { setTo(Math.round(+rg.value / v.blind) * v.blind); };
  }
  // קיצורי מקלדת: F לקפל, C צ׳ק/להשוות, R להעלות, רווח ליד הבאה
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target, tag = t && t.tagName;
    if (tag === 'TEXTAREA' || tag === 'SELECT' || (tag === 'INPUT' && t.type !== 'range') || (t && t.isContentEditable)) return;
    var el = document.getElementById('tb-board'); if (!el || !el._last || !el.querySelector('.pk2')) return;
    var m = el.querySelector('.pk2-modal'); if (m && !m.hidden) return;
    var k = (e.key || '').toLowerCase(), d = el.querySelector('[data-dock]'), b = null;
    if (k === 'f' || k === 'כ') b = d.querySelector('[data-a=fold]');
    else if (k === 'c' || k === 'ב') b = d.querySelector('[data-a=call]') || d.querySelector('[data-a=check]');
    else if (k === 'r' || k === 'ר') b = d.querySelector('[data-a=raise]');
    else if (k === ' ' && tag !== 'BUTTON') b = d.querySelector('[data-next]');
    if (b) { e.preventDefault(); b.click(); }
  });

  function opts() { var o = loadK(KEY); return { mode: o.mode === 'ring' ? 'ring' : 'tour', lvl: o.lvl === 'easy' || o.lvl === 'hard' ? o.lvl : 'normal' }; }
  function lobby(box, isHost) {
    var O = opts();
    box.innerHTML = isHost ? '<p class="ch-hint">סוג משחק:</p><div class="ch-chips"><button type="button" data-lm="tour" class="' + (O.mode === 'tour' ? 'on' : '') + '" aria-pressed="' + (O.mode === 'tour') + '">🏆 טורניר</button><button type="button" data-lm="ring" class="' + (O.mode === 'ring' ? 'on' : '') + '" aria-pressed="' + (O.mode === 'ring') + '">♾️ שולחן פתוח (אפשר להצטרף באמצע)</button></div>' : '';
    box.querySelectorAll('[data-lm]').forEach(function (b) { b.onclick = function () { var o = loadK(KEY); o.mode = b.getAttribute('data-lm'); saveK(KEY, o); lobby(box, isHost); CH.used(TOOL, o.mode === 'ring' ? 'mode_ring' : 'mode_tourney'); }; });
  }
  function setup(game) { document.getElementById('tb').classList.add('pk2-on'); void game; }
  window.PKUI = { render: render, opts: opts, setup: setup, card: card, onMsg: onMsg, lobby: lobby };
})();
