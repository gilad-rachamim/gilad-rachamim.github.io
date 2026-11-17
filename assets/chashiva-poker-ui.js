// פוקר על נקודות – התצוגה: שולחן אובלי, מושבים סביבו, פס פעולות, חלונות (סדר הידיים, הגדרות).
// המנוע (החוקים) ב-chashiva-poker.js. השולחן המשותף (מצבים, חדר) ב-chashiva-cards.js.
(function () {
  'use strict';
  var CH = window.CH; if (!CH || !document.getElementById('tb')) return;
  var esc = CH.esc, KEY = 'chashiva-poker-ui';
  var SUIT = ['s', 'h', 'd', 'c'], SYM = ['♠', '♥', '♦', '♣'], SUITHE = ['עלה', 'לב', 'יהלום', 'תלתן'], RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  var AVS = ['🙂', '😎', '🦁', '🐯', '🦊', '🐻', '🐼', '🐨', '🐸', '🦉', '🐙', '🦄', '🐬', '🐢', '🦅', '🌟'];
  var TAG = { fold: ['קיפל', 'k'], check: ['צ׳ק', 'k'], call: ['משווה', 'g'], raise: ['מעלה', 'r'], bet: ['מהמר', 'r'], allin: ['הכול!', 'a'] };

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function save(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }
  var P = load();
  if (P.c4 === undefined) P.c4 = true;
  function setP(k, val) { P[k] = val; save(P); }
  function fmt(n) { return (+n || 0).toLocaleString('he-IL'); }
  function nameOf(ctx, v, k) { return String((ctx.names && ctx.names[k]) || v.nm[k] || '').replace(/^🤖\s*/, ''); }
  function hashAv(s) { var h = 0; s = String(s); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return AVS[1 + Math.abs(h) % (AVS.length - 1)]; }
  function avOf(ctx, v, k) {
    var raw = (ctx.names && ctx.names[k]) || v.nm[k] || '';
    if (/^🤖/.test(raw)) { var b = window.PKE && PKE.botOf(raw); return b ? b.av : '🤖'; }
    if (k === v.seat && ctx.mode !== 'phone') return P.av || '🙂';
    return hashAv(raw);
  }
  function card(c, cls) {
    if (c === undefined || c === null) return '<span class="pk2-c ph' + (cls ? ' ' + cls : '') + '" aria-hidden="true"></span>';
    var s = Math.floor(c / 13), r = RANKS[c % 13];
    return '<span class="pk2-c ' + SUIT[s] + (cls ? ' ' + cls : '') + '" role="img" aria-label="' + r + ' ' + SUITHE[s] + '"><b>' + r + '</b><i>' + SYM[s] + '︎</i></span>';
  }
  function cd(x) { var su = { s: 0, h: 1, d: 2, c: 3 }[x.slice(-1)], r = x.slice(0, -1); return su * 13 + RANKS.indexOf(r); }

  // ---------- פריסת המושבים סביב השולחן ----------
  function layout(n, base, hero, wide, minY) {
    var cx = 50, cy = wide ? 44 : 43, rx = wide ? 44 : 41, ry = wide ? 40 : 37, out = [];
    for (var k = 0; k < n; k++) {
      var i = (k - base + n) % n, t = (90 + i * 360 / n) * Math.PI / 180;
      var x = cx + rx * Math.cos(t), y = cy + ry * Math.sin(t);
      x = Math.max(wide ? 8 : 12, Math.min(wide ? 92 : 88, x)); y = Math.max(minY || 0, y);
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
    }).join('') + '</ol>');
    CH.used('chashiva_poker', 'ranks');
  }
  function menuModal(el, v, ctx) {
    var h = '<h3>צבעי הקלפים</h3><div class="pk2-opt"><button type="button" data-c4="1" aria-pressed="' + !!P.c4 + '">4 צבעים (♠ ♥ ♦ ♣ שונים)</button><button type="button" data-c4="0" aria-pressed="' + !P.c4 + '">2 צבעים (קלאסי)</button></div>';
    h += '<h3>תצוגה</h3><div class="pk2-opt"><button type="button" data-fs>' + (document.body.classList.contains('pk2-fs') ? '↙️ יציאה ממסך מלא' : '⛶ מסך מלא') + '</button></div>';
    h += '<p>🪙 על נקודות בלבד. אין כסף אמיתי ואין הימורים.</p>';
    modal(el, '☰ הגדרות', h, function (m, close) {
      m.querySelectorAll('[data-c4]').forEach(function (b) { b.onclick = function () { setP('c4', b.getAttribute('data-c4') === '1'); close(); rerender(el); }; });
      m.querySelector('[data-fs]').onclick = function () { close(); fullscreen(el); };
    });
  }
  function fullscreen(el, force) {
    var on = force !== undefined ? force : !document.body.classList.contains('pk2-fs');
    document.body.classList.toggle('pk2-fs', on);
    try {
      if (on && document.documentElement.requestFullscreen && !document.fullscreenElement) document.documentElement.requestFullscreen().catch(function () {});
      if (!on && document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
    } catch (e) {}
    if (on) CH.used('chashiva_poker', 'fullscreen');
    setTimeout(function () { rerender(el); }, 60);
  }
  document.addEventListener('fullscreenchange', function () { if (!document.fullscreenElement && document.body.classList.contains('pk2-fs')) { document.body.classList.remove('pk2-fs'); var b = document.getElementById('tb-board'); if (b) setTimeout(function () { rerender(b); }, 60); } });

  // ---------- שלד ----------
  function build(el) {
    el.innerHTML = '<div class="pk2" dir="rtl">' +
      '<div class="pk2-top"><div class="ic"><button type="button" data-menu aria-label="הגדרות">☰</button></div>' +
      '<div class="pk2-inf" data-inf></div>' +
      '<div class="ic"><button type="button" data-ranks aria-label="סדר הידיים">❓</button></div></div>' +
      '<div class="pk2-stage"><div class="pk2-table"><div class="pk2-felt"><div class="pk2-mid"><div class="pk2-pot" data-pot></div><div class="pk2-board" data-board></div><div class="pk2-hint" data-hint></div></div></div></div>' +
      '<div data-seats></div><div class="pk2-side"><button type="button" data-fsb aria-label="מסך מלא">⛶</button></div></div>' +
      '<div class="pk2-dock" data-dock></div>' +
      '<p class="sr" aria-live="polite" data-live></p>' +
      '<div class="pk2-modal" hidden></div></div>';
    el._ui = el._ui || {};
    var q = function (s) { return el.querySelector(s); };
    q('[data-ranks]').onclick = function () { ranksModal(el); };
    q('[data-menu]').onclick = function () { var L = el._last; menuModal(el, L && L[0], L && L[1]); };
    q('[data-fsb]').onclick = function () { fullscreen(el); };
  }
  var resizeT = 0;
  window.addEventListener('resize', function () { clearTimeout(resizeT); resizeT = setTimeout(function () { var b = document.getElementById('tb-board'); if (b && b._last) rerender(b); }, 120); });
  function rerender(el) { if (el && el._last) render(el._last[0], el, el._last[1]); }

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
    root.style.setProperty('--u', u.toFixed(3));
    q('[data-fsb]').setAttribute('aria-pressed', fs); q('[data-fsb]').textContent = fs ? '↙️' : '⛶'; q('[data-fsb]').setAttribute('aria-label', fs ? 'יציאה ממסך מלא' : 'מסך מלא');

    var me = v.seat, show = v.phase === 'show', res = v.res;
    var key = v.id + ':' + v.hn + ':' + v.phase + ':' + v.cur;
    if (ui.key !== key) { ui.key = key; ui.to = 0; }

    // שורת מידע
    q('[data-inf]').innerHTML = 'יד ' + v.hn + ' · בליינדים <b>' + v.blind + '/' + v.blind * 2 + '</b><small>' + (v.mode === 'ring' ? 'שולחן פתוח · בליינדים קבועים' : v.nextUp > 1 ? 'עולים בעוד ' + v.nextUp + ' ידיים' : 'עולים ביד הבאה') + '</small>';

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
    // קלפי השולחן
    q('[data-board]').innerHTML = [0, 1, 2, 3, 4].map(function (i) { return v.board[i] !== undefined ? card(v.board[i], cc(v.board[i])) : card(null); }).join('');
    // שורת מצב באמצע
    var hint = '';
    if (show && res) {
      var main = res.pots[res.pots.length ? 0 : -1];
      if (!res.show) hint = '<span class="win">🏆 ' + esc(res.w.map(function (k) { return k === me ? 'אתם' : nameOf(ctx, v, k); }).join(' ו')) + ' לוקח/ת ' + fmt(res.won[res.w[0]]) + ' – כולם קיפלו</span>';
      else hint = '<span class="win">' + res.pots.map(function (p, i) {
        return '🏆 ' + (i ? 'קופת צד: ' : '') + esc(p.w.map(function (k) { return k === me ? 'אתם' : nameOf(ctx, v, k); }).join(' ו')) + ' +' + fmt(p.amt) + ' · ' + esc(p.cat);
      }).join('<br>') + '</span>';
      void main;
    } else if (me >= 0 && v.mine && !v.fold[me]) hint = '<span>יש לכם: ' + esc(v.mine) + '</span>';
    q('[data-hint]').innerHTML = hint;

    // מושבים
    var hero = me >= 0, base = hero ? me : 0, pos = layout(v.n, base, hero, wide, 50 * u / H * 100), center = { x: 50, y: wide ? 44 : 43 };
    var seatsH = '';
    for (var k = 0; k < v.n; k++) {
      var p = pos[k], out = !v.inn[k] && v.chips[k] <= 0, fold = v.fold[k], turn = v.t === k && !show && !ctx.over;
      var lastT = TAG[v.last && v.last[k]], won = show && res && res.won[k] > 0;
      var tag = won ? '<span class="pk2-tag w">+' + fmt(res.won[k]) + '</span>' : out ? '<span class="pk2-tag k">בחוץ</span>' : lastT ? '<span class="pk2-tag ' + lastT[1] + '">' + lastT[0] + '</span>' : '';
      var off = ctx.seatInfo && ctx.seatInfo[k] && ctx.seatInfo[k].on === false;
      if (p.hero) {
        var hc = v.hole.length ? v.hole.map(function (c) { return card(c, cc(c)); }).join('') : '';
        seatsH += '<div class="pk2-hero' + (turn ? ' turn' : '') + (fold ? ' fold' : '') + (won ? ' won' : '') + '"><div class="hc">' + hc + '</div><div class="pk2-plate">' + tag + '<b>' + esc(ctx.mode === 'phone' ? nameOf(ctx, v, k) : 'אתם') + ' ' + avOf(ctx, v, k) + '</b><span>' + fmt(v.chips[k]) + '</span></div></div>';
      } else {
        var shown = v.reveal && v.reveal[k];
        var cls = 'pk2-seat ' + p.side + (turn ? ' turn' : '') + (fold ? ' fold' : '') + (out ? ' out' : '') + (won ? ' won' : '') + (off ? ' off' : '');
        var lbl = nameOf(ctx, v, k) + ', ' + fmt(v.chips[k]) + ' נקודות' + (lastT ? ', ' + lastT[0] : '') + (turn ? ', בתור' : '');
        seatsH += '<div class="' + cls + '" style="left:' + p.x.toFixed(1) + '%;top:' + p.y.toFixed(1) + '%" role="group" aria-label="' + esc(lbl) + '">' +
          (shown ? '<div class="pk2-shown">' + shown.map(function (c) { return card(c, cc(c)); }).join('') + '</div>' : (v.cards[k] && !fold && !out ? '<div class="pk2-bk" aria-hidden="true"><i></i><i></i></div>' : '')) +
          '<div class="pk2-av" aria-hidden="true">' + avOf(ctx, v, k) + '</div><div class="pk2-plate">' + tag + '<b>' + esc(nameOf(ctx, v, k)) + '</b><span>' + fmt(v.chips[k]) + '</span></div></div>';
      }
      if (v.bet[k] > 0 && !show) { var bp = p.hero ? { x: 50, y: 66 } : lerp(p, center, 0.42); seatsH += '<div class="pk2-bet" style="left:' + bp.x.toFixed(1) + '%;top:' + bp.y.toFixed(1) + '%"><i class="pk2-chip" style="--c:' + (v.last[k] === 'allin' ? '#e8c87c' : '#c8463c') + '"></i>' + fmt(v.bet[k]) + '</div>'; }
      if (v.btn === k) { var dp = p.hero ? { x: 66, y: 74 } : lerp(p, center, 0.24); if (!p.hero) dp.x += p.side === 'L' ? 5 : p.side === 'R' ? -5 : 9; seatsH += '<div class="pk2-dl" style="left:' + dp.x.toFixed(1) + '%;top:' + dp.y.toFixed(1) + '%" aria-label="מחלק">D</div>'; }
    }
    q('[data-seats]').innerHTML = seatsH;

    // הודעה לקוראי מסך
    var live = (v.log || []).slice(-1)[0] || '';
    if (ctx.mine && !show) live = 'התור שלכם. ' + live;
    if (ui.live !== live) { ui.live = live; q('[data-live]').textContent = live; }

    dock(v, el, ctx);
  }

  // ---------- פס הפעולות ----------
  function raiseTo(v, frac) {
    var base = v.cur === 0 ? v.pot : v.pot + v.call;
    return Math.max(v.minTo, Math.min(v.maxTo, v.cur + Math.round(frac * base / v.blind) * v.blind));
  }
  function dock(v, el, ctx) {
    var d = el.querySelector('[data-dock]'), ui = el._ui, me = v.seat, h = '';
    var who = v.t >= 0 ? (v.t === me ? 'אתם' : nameOf(ctx, v, v.t)) : '';
    if (ctx.over) h = '<p class="pk2-wait">🏁 המשחק נגמר</p>';
    else if (me < 0) h = '<p class="pk2-wait">👀 צופים במשחק' + (v.pend ? ' · מצטרפים ביד הבאה' : '') + '</p>';
    else if (v.phase === 'show') {
      h = ctx.mine ? '<div class="pk2-acts"><button type="button" class="bn" data-next>ליד הבאה ▶<span class="pk2-kb"> (רווח)</span></button></div>' : '<p class="pk2-wait">עוד רגע יד חדשה…</p>';
    } else if (ctx.mine && !v.fold[me]) {
      var to = ui.to || raiseTo(v, v.cur === 0 ? 0.5 : 0.75); to = Math.max(v.minTo, Math.min(v.maxTo, to)); ui.to = to;
      var allIn = to >= v.maxTo, isBet = v.cur === 0 || (me >= 0 && v.cur === v.mybet && v.call === 0 && v.cur === 0);
      if (v.canRaise) {
        h += '<div class="pk2-pre" role="group" aria-label="גודל ההעלאה">' + [['⅓', 1 / 3], ['½ קופה', 0.5], ['¾', 0.75], ['קופה', 1]].map(function (x) { var t = raiseTo(v, x[1]); return '<button type="button" data-to="' + t + '" aria-pressed="' + (t === to) + '">' + x[0] + '</button>'; }).join('') + '<button type="button" data-to="' + v.maxTo + '" aria-pressed="' + allIn + '">הכול</button></div>';
        h += '<div class="pk2-sl"><button type="button" data-step="-1" aria-label="פחות">−</button><input type="range" min="' + v.minTo + '" max="' + v.maxTo + '" step="' + v.blind + '" value="' + to + '" aria-label="סכום ההעלאה" data-range><button type="button" data-step="1" aria-label="יותר">+</button><output data-out>' + fmt(to) + '</output></div>';
      }
      h += '<div class="pk2-acts"><button type="button" class="bf" data-a="fold">לקפל<span class="pk2-kb"> (F)</span></button>' +
        (v.call > 0 ? '<button type="button" class="bc" data-a="call">להשוות<small>' + fmt(v.call) + (v.call >= v.chips[me] ? ' (הכול)' : '') + '</small></button>' : '<button type="button" class="bc" data-a="check">צ׳ק<span class="pk2-kb"> (C)</span></button>') +
        (v.canRaise ? '<button type="button" class="br" data-a="raise">' + (allIn ? 'הכול!' : isBet ? 'להמר' : 'להעלות') + '<small data-rl>' + (isBet && !allIn ? fmt(to) : 'ל-' + fmt(to)) + '</small></button>' : '') + '</div>';
    } else {
      h = '<p class="pk2-wait">' + (v.fold[me] ? 'קיפלתם. מחכים לסוף היד…' : v.chips[me] === 0 && v.inn[me] ? 'אתם בהכול! מחכים לקלפים…' : !v.inn[me] ? 'אין לכם נקודות ביד הזאת' : '⏳ מחכים ל<b>' + esc(who) + '</b>…') + '</p>';
    }
    d.innerHTML = h;
    d.querySelectorAll('[data-a]').forEach(function (b) { b.onclick = function () { var a = b.getAttribute('data-a'); ctx.act(a === 'raise' ? { a: a, to: ui.to } : { a: a }); }; });
    var nx = d.querySelector('[data-next]'); if (nx) nx.onclick = function () { ctx.act({ next: 1 }); };
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

  function opts() { var o = load(); return { mode: o.mode === 'ring' ? 'ring' : 'tour', lvl: o.lvl || 'normal' }; }
  function setup(game) { document.getElementById('tb').classList.add('pk2-on'); void game; }
  window.PKUI = { render: render, opts: opts, setup: setup, card: card };
})();
