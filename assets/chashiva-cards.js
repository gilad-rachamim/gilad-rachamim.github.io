// שולחן משותף למשחקי קלפים ואבנים (רביעיות, יניב, אבני מספרים, פוקר) – /kelim/chashiva/
// כל משחק נותן: init, view, act, turn, bot, over, render. השולחן נותן את השאר:
//  🤖 מול המחשב · 📱 כמה שחקנים על טלפון אחד (עם מסך הסתרה בין תורות) · 🌐 חדר אונליין עם חברים (שרת tools/chashiva-live-worker).
// בחדר אונליין: מי שפתח את החדר מחזיק את המשחק ושולח לכל שחקן רק את מה שמותר לו לראות.
(function () {
  'use strict';
  var CH = window.CH; if (!CH) return;
  var LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var API = LOCAL ? 'http://127.0.0.1:8790' : 'https://chashiva-live.gilad4049.workers.dev';
  var esc = CH.esc;

  // ---------- קלפים ----------
  var SUITS = ['♠', '♥', '♦', '♣'], RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  // קלף = 0..51 (צורה*13 + ערך), ג'וקר = 52, 53
  CH.cards = {
    SUITS: SUITS, RANKS: RANKS,
    deck: function (jokers) { var a = []; for (var c = 0; c < 52 + (jokers || 0); c++) a.push(c); return a; },
    rank: function (c) { return c >= 52 ? -1 : c % 13; }, suit: function (c) { return c >= 52 ? -1 : Math.floor(c / 13); },
    name: function (c) { return c >= 52 ? 'ג׳וקר' : RANKS[c % 13] + SUITS[Math.floor(c / 13)]; },
    html: function (c, o) {
      o = o || {};
      var cls = 'cd' + (o.cls ? ' ' + o.cls : '');
      if (o.hidden) return '<span class="' + cls + ' back"></span>';
      if (c >= 52) return '<span class="' + cls + ' jk"' + (o.data || '') + '><b>🃏</b><i>ג׳וקר</i></span>';
      var s = Math.floor(c / 13);
      return '<span class="' + cls + (s === 1 || s === 2 ? ' red' : '') + '"' + (o.data || '') + ' aria-label="' + RANKS[c % 13] + ' ' + SUITS[s] + '"><b>' + RANKS[c % 13] + '</b><i>' + SUITS[s] + '︎</i></span>';
    }
  };
  CH.cardHtml = function (c, hidden) { return CH.cards.html(c, { hidden: hidden }); };

  // ---------- השולחן ----------
  // cfg: {g, tool, name, minP, maxP, defP, init(seed, n, names), view(st, seat), act(st, seat, a) -> st | 'שגיאה',
  //       turn(st) -> seat, bot(st, seat) -> a, over(st) -> null | {w:[seats], text}, render(v, el, ctx), share(st, w), how}
  CH.table = function (cfg) {
    var root = document.getElementById('tb'); if (!root) return;
    var G = cfg.g, TOOL = cfg.tool;
    root.innerHTML =
      '<div class="ch-tabs" id="tb-tabs" role="tablist"><button type="button" role="tab" data-m="bot" aria-selected="true">🤖 מול המחשב</button><button type="button" role="tab" data-m="phone" aria-selected="false">📱 כמה על טלפון אחד</button><button type="button" role="tab" data-m="live" aria-selected="false">🌐 חדר עם חברים</button></div>' +
      '<p class="ch-weekline" id="ch-weekline"></p><div class="ch-vsbanner" id="ch-vsbanner" hidden></div>' +
      '<div id="tb-opts" class="tb-opts"></div>' +
      '<div class="ch-bar"><span id="tb-status"></span><span id="tb-score"></span></div>' +
      '<div class="ch-felt tb-felt" id="tb-felt"><div id="tb-board"></div><div class="tb-cover" id="tb-cover" hidden></div></div>' +
      '<ol class="tb-log" id="tb-log"></ol>' +
      '<p class="ch-msg" id="tb-msg" aria-live="polite"></p>' +
      '<div class="ch-tools"><button type="button" id="tb-new">🎲 משחק חדש</button></div>' +
      '<div id="tb-win"></div>';
    var $ = function (id) { return document.getElementById(id); };
    var data = CH.load(G); data.n = Math.min(cfg.maxP, Math.max(cfg.minP, data.n || cfg.defP)); data.names = data.names || ['', '', '', '', '', ''];
    var T = { mode: 'bot', st: null, seats: [], me: 0, shown: -1, seed: '' }, botTimer = null, finished = false, started = false;
    var live = null; // {ws, id, pid, host, members, seats}

    function say(t) { $('tb-msg').textContent = t || ''; }
    function persist() { if (T.mode === 'live' && !(live && live.isHost)) return; var d = CH.load(G); d.n = data.n; d.names = data.names; d.tab = T.mode; d.cur = d.cur || {}; d.cur[T.mode] = { st: T.st, seats: T.seats, seed: T.seed }; CH.save(G, d); }
    function myName() { return CH.myName() || 'אתם'; }
    function viewer() { return T.mode === 'phone' ? T.shown : T.me; }

    // ---------- תצוגה ----------
    function draw() {
      if (!T.st) { $('tb-board').innerHTML = ''; return; }
      var v = viewer(), turn = cfg.turn(T.st), ov = cfg.over(T.st);
      if (T.mode === 'phone' && !ov && T.shown !== turn) { cover(turn); return; }
      $('tb-cover').hidden = true;
      var view = T.remoteView || cfg.view(T.st, v);
      cfg.render(view, $('tb-board'), { act: act, seat: v, mine: !ov && turn === v && canAct(), over: !!ov, names: names(), say: say, mode: T.mode });
      var log = view.log || [];
      $('tb-log').innerHTML = log.slice(-4).map(function (x) { return '<li>' + x + '</li>'; }).join('');
      $('tb-status').textContent = ov ? '🏁 המשחק נגמר' : turn === v ? (T.mode === 'phone' ? '👉 התור של ' + names()[v] : '👉 התור שלכם') : '⏳ התור של ' + (names()[turn] || '');
      $('tb-score').textContent = view.score || '';
    }
    function names() { return T.seats.map(function (s) { return s.name; }); }
    function canAct() { if (T.mode === 'live') return true; return T.seats[cfg.turn(T.st)] && T.seats[cfg.turn(T.st)].kind !== 'bot'; }
    function cover(seat) {
      var c = $('tb-cover'); c.hidden = false;
      $('tb-board').innerHTML = '';
      c.innerHTML = '<div><b>📱 מעבירים את הטלפון ל' + esc(names()[seat]) + '</b><p>שאר השחקנים לא מסתכלים 🙈</p><button class="btn btn-gold" type="button">אני ' + esc(names()[seat]) + ' – להציג את הקלפים שלי</button></div>';
      c.querySelector('button').onclick = function () { T.shown = seat; draw(); };
      $('tb-status').textContent = '👉 התור של ' + names()[seat];
    }

    // ---------- מהלכים ----------
    function act(a) {
      if (T.mode === 'live' && live && !live.isHost) { live.send(live.host, { k: 'act', a: a }); return; }
      apply(T.mode === 'live' ? T.me : viewer(), a);
    }
    function apply(seat, a) {
      if (!T.st || cfg.over(T.st)) return;
      if (cfg.turn(T.st) !== seat && !(cfg.anyTurn && cfg.anyTurn(T.st, seat, a))) { if (seat === viewer()) say('רגע, עכשיו לא התור שלכם'); return; }
      var r = cfg.act(T.st, seat, a);
      if (typeof r === 'string') { if (T.mode === 'live' && live && live.isHost && seat !== T.me) live.sendSeat(seat, { k: 'err', m: r }); else say(r); return; }
      if (!started) { started = true; CH.used(TOOL, 'start', { mode: T.mode, n: T.seats.length }); }
      T.st = r; say('');
      if (T.mode === 'phone' && cfg.turn(T.st) !== seat) T.shown = -1;
      persist(); broadcast(); draw(); loop();
    }
    function loop() {
      clearTimeout(botTimer);
      if (!T.st) return;
      var ov = cfg.over(T.st); if (ov) return finish(ov);
      var t = cfg.turn(T.st);
      if (T.seats[t] && T.seats[t].kind === 'bot' && (T.mode !== 'live' || (live && live.isHost))) botTimer = setTimeout(function () { var a = cfg.bot(T.st, t); if (a) apply(t, a); }, window.CHTEST ? 20 : (cfg.botDelayFor && cfg.botDelayFor(T.st)) || cfg.botDelay || 900);
    }
    function finish(ov) {
      if (finished) return; finished = true;
      var v = T.mode === 'phone' ? -1 : T.me, iWon = ov.w.indexOf(v) >= 0, all = names();
      var head = ov.w.map(function (s) { return all[s]; }).join(' ו') + (ov.w.length > 1 ? ' ניצחו' : ' ניצח');
      if (T.mode === 'phone' || !iWon) {
        if (T.mode !== 'phone') CH.used(TOOL, 'end', { mode: T.mode, r: 'lose' });
        $('tb-win').innerHTML = '<div class="ch-win"><h2>' + (T.mode === 'phone' ? '🏆 ' + esc(head) + '!' : '💪 הפעם ' + esc(head)) + '</h2><p class="ch-hint">' + (ov.text || '') + '</p><div class="ch-next"><button class="btn btn-gold" type="button" id="tb-again">משחק חדש</button></div></div>';
        $('tb-again').onclick = function () { newGame(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
        if (T.mode === 'phone') CH.used(TOOL, 'end', { mode: 'phone' });
        return;
      }
      var st = CH.record(G, true, 0, 0);
      CH.used(TOOL, 'win', { mode: T.mode, n: T.seats.length });
      var vs = T.mode === 'bot' ? 'את המחשב' : 'את החברים';
      CH.win({ tool: TOOL, el: $('tb-win'), daily: true, stats: st, title: '🏆 ניצחתם ' + vs + ' ב' + cfg.name + '! 🎉',
        line: '<span>' + (ov.text || '') + '</span>', share: cfg.share ? cfg.share(T.st, ov) : 'ניצחתי ב' + cfg.name + '! בחינם ובלי פרסומות. בואו לשחק איתי:',
        next: [{ label: 'משחק חדש', fn: newGame }] });
    }

    // ---------- התחלה ----------
    function seatsFor(mode) {
      var s = [];
      if (mode === 'bot') { s.push({ name: myName(), kind: 'me' }); var bn = cfg.botNames || ['רוני', 'נועה', 'איתי', 'מאיה', 'עומר']; for (var k = 1; k < data.n; k++) s.push({ name: '🤖 ' + bn[k - 1], kind: 'bot' }); }
      else for (var j = 0; j < data.n; j++) s.push({ name: data.names[j] || 'שחקן ' + (j + 1), kind: 'human' });
      return s;
    }
    function newGame() {
      clearTimeout(botTimer); finished = false; started = false; $('tb-win').innerHTML = ''; say('');
      if (T.mode === 'live') { liveLobby(); return; }
      T.seats = seatsFor(T.mode); T.me = 0; T.shown = -1; T.remoteView = null;
      T.seed = G + '-' + Date.now().toString(36);
      T.st = cfg.init(T.seed, T.seats.length, names());
      persist(); drawOpts(); draw(); loop();
    }
    $('tb-new').onclick = function () { if (T.st && !cfg.over(T.st) && started && !confirm('להתחיל משחק חדש?')) return; newGame(); };
    function drawOpts() {
      var o = $('tb-opts');
      if (T.mode === 'live') return;
      var h = '<div class="ch-chips">' + (function () { var x = ''; for (var n = cfg.minP; n <= cfg.maxP; n++) x += '<button type="button" data-n="' + n + '" class="' + (data.n === n ? 'on' : '') + '">' + n + ' שחקנים</button>'; return x; })() + '</div>';
      if (T.mode === 'phone') {
        h += '<div class="tb-names">';
        for (var j = 0; j < data.n; j++) h += '<input type="text" maxlength="14" data-j="' + j + '" placeholder="שחקן ' + (j + 1) + '" value="' + esc(data.names[j] || '') + '" aria-label="שם שחקן ' + (j + 1) + '">';
        h += '<button class="btn btn-line btn-sm" type="button" id="tb-names-go">להתחיל עם השמות</button></div>';
      }
      o.innerHTML = h;
      o.querySelectorAll('[data-n]').forEach(function (b) { b.onclick = function () { data.n = +b.getAttribute('data-n'); persist(); newGame(); }; });
      o.querySelectorAll('[data-j]').forEach(function (i) { i.oninput = function () { data.names[+i.getAttribute('data-j')] = i.value.trim().slice(0, 14); persist(); }; });
      var go = $('tb-names-go'); if (go) go.onclick = newGame;
    }
    function tab(m) {
      CH.vsReset(); clearTimeout(botTimer); finished = false; T.mode = m; T.remoteView = null;
      document.querySelectorAll('#tb-tabs button').forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-m') === m); });
      $('tb-win').innerHTML = ''; say(''); $('tb-opts').innerHTML = ''; $('tb-cover').hidden = true;
      if (m !== 'live' && live) { live.close(); live = null; }
      if (m === 'live') { liveLobby(); return; }
      var cur = (CH.load(G).cur || {})[m];
      if (cur && cur.st && cur.seats) { T.st = cur.st; T.seats = cur.seats; T.seed = cur.seed; T.me = 0; T.shown = -1; started = true; drawOpts(); draw(); loop(); }
      else newGame();
      var d = CH.load(G); d.tab = m; CH.save(G, d);
    }
    document.querySelectorAll('#tb-tabs button').forEach(function (b) { b.onclick = function () { tab(b.getAttribute('data-m')); }; });

    // ---------- חדר אונליין ----------
    function broadcast() {
      if (T.mode !== 'live' || !live || !live.isHost) return;
      T.seats.forEach(function (s, k) { if (s.kind === 'remote') live.send(s.pid, { k: 'view', v: cfg.view(T.st, k), seat: k, seats: T.seats.map(function (x) { return { name: x.name, kind: x.kind === 'bot' ? 'bot' : 'p' }; }), turn: cfg.turn(T.st), over: cfg.over(T.st) }); });
    }
    function liveLobby(code) {
      T.st = null; $('tb-board').innerHTML = ''; $('tb-log').innerHTML = ''; $('tb-status').textContent = ''; $('tb-score').textContent = '';
      var o = $('tb-opts');
      if (live && live.id) { lobbyDraw(); return; }
      o.innerHTML = '<div class="tb-live"><p>פותחים חדר, שולחים לחברים קישור בווטסאפ, וכל אחד משחק מהטלפון שלו. כל אחד רואה רק את הקלפים שלו.</p>' +
        '<input type="text" maxlength="14" id="tb-myname" placeholder="השם שלכם" value="' + esc(CH.myName()) + '" aria-label="השם שלכם">' +
        '<div class="actions"><button class="btn btn-gold" type="button" id="tb-open">🌐 לפתוח חדר</button></div><p class="ch-hint" id="tb-livemsg"></p></div>';
      $('tb-open').onclick = function () { saveName(); openRoom(); };
      if (code) { saveName(); joinRoom(code); }
    }
    function saveName() { var i = $('tb-myname'); if (i && i.value.trim()) try { localStorage.setItem('chashiva-name', i.value.trim().slice(0, 14)); } catch (e) {} }
    function liveMsg(t) { var e = $('tb-livemsg'); if (e) e.textContent = t; else say(t); }
    function pid() { try { var p = localStorage.getItem('chashiva-pid'); if (!p) { p = Math.random().toString(36).slice(2, 12); localStorage.setItem('chashiva-pid', p); } return p; } catch (e) { return 'p' + Math.random().toString(36).slice(2, 10); } }
    function openRoom() {
      liveMsg('פותחים חדר…');
      fetch(API + '/r', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ g: G }) }).then(function (r) { return r.json(); }).then(function (j) {
        if (!j.id) throw new Error(j.error || 'x');
        CH.used(TOOL, 'room_open'); joinRoom(j.id);
      }).catch(function () { liveMsg('😕 החדרים האונליין עוד לא פתוחים (השרת בהכנה). בינתיים אפשר לשחק מול המחשב או כמה על טלפון אחד.'); });
    }
    function joinRoom(id) {
      live = { id: id, pid: pid(), members: [], isHost: false, host: '' };
      var url = API.replace(/^http/, 'ws') + '/r/' + id + '/ws?pid=' + encodeURIComponent(live.pid) + '&name=' + encodeURIComponent(myName()) + '&g=' + G;
      var ws; try { ws = new WebSocket(url); } catch (e) { liveMsg('😕 אין חיבור לשרת החדרים.'); return; }
      live.ws = ws;
      live.send = function (to, d) { if (ws.readyState === 1) ws.send(JSON.stringify({ t: 'to', to: to, d: d })); };
      live.sendSeat = function (seat, d) { var s = T.seats[seat]; if (s && s.pid) live.send(s.pid, d); };
      live.close = function () { try { ws.close(); } catch (e) {} };
      ws.onerror = function () { liveMsg('😕 אין חיבור לשרת החדרים. אולי הקישור ישן, או שהשרת עוד בהכנה.'); };
      ws.onclose = function () { if (live && live.ws === ws && T.mode === 'live') say('החיבור לחדר נותק. רעננו את הדף כדי לחזור.'); };
      ws.onmessage = function (e) {
        var m; try { m = JSON.parse(e.data); } catch (x) { return; }
        if (m.t === 'members' || m.t === 'hello') {
          live.members = m.members || []; live.host = m.host; live.isHost = m.host === live.pid;
          if (live.isHost && T.st) { T.seats.forEach(function (s) { if (s.kind === 'remote') s.on = live.members.some(function (x) { return x.pid === s.pid && x.on; }); }); broadcast(); }
          if (!T.st && !T.remoteView) lobbyDraw();
          if (m.t === 'hello' && !live.isHost) live.send(live.host, { k: 'hi' });
        } else if (m.t === 'msg') {
          var d = m.d || {};
          if (live.isHost) {
            if (d.k === 'act') { var seat = T.seats.findIndex(function (s) { return s.pid === m.from; }); if (seat >= 0) apply(seat, d.a); }
            if (d.k === 'hi' && T.st) broadcast();
          } else {
            if (d.k === 'view') {
              T.remoteView = d.v; T.me = d.seat; T.seats = d.seats; finished = false;
              T.st = { _remote: true, turn: d.turn, over: d.over };
              $('tb-opts').innerHTML = '<p class="ch-hint">🌐 חדר ' + esc(live.id) + '</p>';
              draw(); if (d.over) finish(d.over);
            }
            if (d.k === 'err') say(d.m);
            if (d.k === 'lobby') lobbyDraw();
          }
        }
      };
    }
    function lobbyDraw() {
      if (!live) return;
      var link = CH.vsLink({ g: G, z: 'room:' + live.id }, 'room_' + G);
      var ppl = live.members.filter(function (x) { return x.on; });
      var h = '<div class="tb-live"><b>🌐 החדר שלכם: ' + esc(live.id) + '</b><p>מי כבר בחדר: ' + ppl.map(function (x) { return esc(x.name) + (x.pid === live.host ? ' (פתח את החדר)' : ''); }).join(', ') + '</p>' +
        '<div class="actions"><a class="btn btn-gold" target="_blank" rel="noopener" href="https://api.whatsapp.com/send?text=' + encodeURIComponent('🃏 בואו לשחק איתי ' + cfg.name + ' – חדר ' + live.id + ':\n' + link) + '" id="tb-invite"><svg class="ic"><use href="#wa"/></svg> להזמין חברים בווטסאפ</a>' +
        (live.isHost ? '<button class="btn btn-line" type="button" id="tb-go">▶️ להתחיל (' + Math.max(cfg.minP, ppl.length) + ' שחקנים' + (ppl.length < cfg.minP ? ', עם מחשב' : '') + ')</button>' : '') + '</div>' +
        (live.isHost ? '<p class="ch-hint">' + (ppl.length < cfg.minP ? 'אם אין מספיק חברים, המחשב משלים את השולחן.' : 'אפשר להתחיל כשכולם בפנים. עד ' + cfg.maxP + ' שחקנים.') + '</p>' : '<p class="ch-hint">מחכים שמי שפתח את החדר יתחיל…</p>') + '</div>';
      $('tb-opts').innerHTML = h;
      $('tb-invite').onclick = function () { CH.used(TOOL, 'room_invite'); };
      var go = $('tb-go'); if (go) go.onclick = liveStart;
    }
    function liveStart() {
      var ppl = live.members.filter(function (x) { return x.on; }).slice(0, cfg.maxP);
      // מי שפתח את החדר ראשון
      ppl.sort(function (a, b) { return (a.pid === live.pid ? -1 : 0) - (b.pid === live.pid ? -1 : 0); });
      T.seats = ppl.map(function (x) { return { name: x.name, kind: x.pid === live.pid ? 'me' : 'remote', pid: x.pid, on: true }; });
      var bn = cfg.botNames || ['רוני', 'נועה', 'איתי', 'מאיה', 'עומר']; var k = 0;
      while (T.seats.length < cfg.minP) T.seats.push({ name: '🤖 ' + bn[k++], kind: 'bot' });
      T.me = 0; T.seed = G + '-' + Date.now().toString(36); T.st = cfg.init(T.seed, T.seats.length, names()); finished = false; started = false;
      $('tb-opts').innerHTML = '<p class="ch-hint">🌐 חדר ' + esc(live.id) + ' · ' + T.seats.length + ' שחקנים</p>';
      CH.used(TOOL, 'room_start', { n: T.seats.length });
      persist(); broadcast(); draw(); loop();
    }
    // השחקן המרוחק: turn/over מגיעים מהמארח
    var _turn = cfg.turn, _over = cfg.over;
    cfg.turn = function (st) { return st && st._remote ? st.turn : _turn(st); };
    cfg.over = function (st) { return st && st._remote ? st.over : _over(st); };

    // ---------- פתיחה ----------
    var V = CH.vsIn && CH.vsIn.g === G && typeof CH.vsIn.z === 'string' && /^room:[a-z0-9]{4,10}$/.test(CH.vsIn.z) ? CH.vsIn : null;
    if (V) {
      T.mode = 'live';
      document.querySelectorAll('#tb-tabs button').forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-m') === 'live'); });
      CH.turnBanner('🌐 <b>הוזמנתם לחדר ' + esc(V.z.slice(5)) + '</b>' + (V.m ? ' מאת ' + esc(V.m) : '') + '. כתבו את השם שלכם ונכנסים.');
      liveLobby();
      var o = $('tb-opts'); o.querySelector('.actions').innerHTML = '<button class="btn btn-gold" type="button" id="tb-join">🌐 להיכנס לחדר</button>';
      $('tb-join').onclick = function () { saveName(); CH.used(TOOL, 'room_join'); joinRoom(V.z.slice(5)); };
    } else tab(CH.load(G).tab === 'phone' ? 'phone' : 'bot');
    return T;
  };
})();
