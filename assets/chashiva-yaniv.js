// יניב – /kelim/chashiva/yaniv/
// לכל אחד 5 קלפים. בכל תור זורקים קלף, זוג/שלישייה/רביעייה של אותו מספר, או רצף של 3+ באותה צורה,
// ואז לוקחים קלף מהקופה או מהקלפים שזרק השחקן הקודם. מי שיש לו 7 או פחות יכול להכריז "יניב!".
// אם למישהו אחר יש סכום שווה או נמוך יותר – "אסף!" והמכריז מקבל 30 נקודות עונש. עד 100: הכי מעט נקודות מנצח.
(function () {
  'use strict';
  var CH = window.CH;
  if (!document.getElementById('tb') || !CH.table) return;
  var C = CH.cards, LIMIT = 100, YANIV = 7;
  function val(c) { if (c >= 52) return 0; var r = c % 13; return r >= 10 ? 10 : r + 1; }
  function sum(h) { return h.reduce(function (a, c) { return a + val(c); }, 0); }
  function clone(s) { return JSON.parse(JSON.stringify(s)); }
  function sortH(h) { h.sort(function (a, b) { return (a >= 52 ? 99 : a % 13) - (b >= 52 ? 99 : b % 13) || a - b; }); }
  // סוג הזריקה: 'one' / 'same' / 'run' / null
  function kind(cs) {
    if (!cs.length) return null;
    if (cs.length === 1) return 'one';
    var nj = cs.filter(function (c) { return c < 52; });
    if (nj.length && nj.every(function (c) { return c % 13 === nj[0] % 13; }) && cs.length <= 4 + 2) return 'same';
    if (cs.length >= 3 && nj.length && nj.every(function (c) { return Math.floor(c / 13) === Math.floor(nj[0] / 13); })) {
      var r = nj.map(function (c) { return c % 13; }).sort(function (a, b) { return a - b; });
      for (var i = 1; i < r.length; i++) if (r[i] === r[i - 1]) return null;
      var gaps = r[r.length - 1] - r[0] + 1 - r.length;
      if (gaps <= cs.length - nj.length) return 'run';
    }
    return null;
  }
  // מאיזה קלפים בערימה מותר לקחת: מרצף – רק הקצוות
  function takeable(top, tk) {
    if (tk !== 'run') return top.slice();
    var nj = top.filter(function (c) { return c < 52; }).sort(function (a, b) { return a % 13 - b % 13; });
    var ends = [nj[0], nj[nj.length - 1]];
    return top.filter(function (c) { return ends.indexOf(c) >= 0; });
  }
  function deal(s) {
    var deck = CH.shuffle(C.deck(2), CH.rng(s.seed + ':' + s.round));
    s.h = []; for (var k = 0; k < s.n; k++) { s.h.push(deck.splice(0, 5)); sortH(s.h[k]); }
    s.top = [deck.shift()]; s.tk = 'one'; s.deck = deck; s.used = []; s.phase = 'play'; s.reveal = null;
  }
  function refill(s) { if (!s.deck.length) { s.deck = CH.shuffle(s.used || [], CH.rng(s.seed + ':r' + s.round + ':' + s.moves)); s.used = []; s.log.push('🔄 הקופה נגמרה ועורבבה מחדש'); } }

  var game = {
    g: 'yaniv', tool: 'chashiva_yaniv', name: 'יניב', minP: 2, maxP: 5, defP: 3, botDelay: 1000,
    botNames: ['רוני', 'נועה', 'איתי', 'מאיה'],
    botDelayFor: function (s) { return s.phase === 'round' ? 4500 : 0; },
    init: function (seed, n, names) {
      var s = { seed: seed, n: n, nm: names, sc: new Array(n).fill(0), round: 1, t: 0, log: [], moves: 0, used: [] };
      deal(s); s.log.push('🃏 סיבוב 1. מתחיל: ' + names[0]);
      return s;
    },
    turn: function (s) { return s.t; },
    over: function (s) {
      if (s.phase !== 'end') return null;
      var lo = Math.min.apply(null, s.sc), w = [];
      s.sc.forEach(function (x, k) { if (x === lo) w.push(k); });
      return { w: w, text: lo + ' נקודות בסוף' };
    },
    view: function (s, seat) {
      return { seat: seat, hand: seat >= 0 ? s.h[seat].slice() : [], counts: s.h.map(function (h) { return h.length; }), top: s.top, take: takeable(s.top, s.tk), deck: s.deck.length,
        sc: s.sc, phase: s.phase, reveal: s.reveal, round: s.round, log: s.log.slice(-6), t: s.t,
        score: s.sc.map(function (x, k) { return s.nm[k] + ' ' + x; }).join(' · ') };
    },
    act: function (s0, seat, a) {
      var s = clone(s0), h = s.h[seat];
      if (s.phase === 'round') { if (!a.next) return 'מתחילים סיבוב חדש'; s.round++; deal(s); s.log.push('🃏 סיבוב ' + s.round + '. מתחיל: ' + s.nm[s.t]); return s; }
      if (s.phase !== 'play') return 'המשחק נגמר';
      if (a.y) {
        var me = sum(h); if (me > YANIV) return 'יניב אפשר רק עם ' + YANIV + ' או פחות';
        var sums = s.h.map(sum), asaf = -1;
        sums.forEach(function (x, k) { if (k !== seat && x <= me && (asaf < 0 || x < sums[asaf])) asaf = k; });
        var line = '📣 ' + s.nm[seat] + ': יניב! (' + me + ')';
        sums.forEach(function (x, k) {
          var add = k === seat ? (asaf >= 0 ? 30 + x : 0) : (k === asaf ? 0 : x);
          s.sc[k] += add;
          if (add && s.sc[k] % 50 === 0 && s.sc[k] <= LIMIT) { s.sc[k] -= 50; s.log.push('✨ ' + s.nm[k] + ': בדיוק ' + (s.sc[k] + 50) + ' – יורד 50'); }
        });
        s.log.push(line + (asaf >= 0 ? ' – 💥 אסף! ל' + s.nm[asaf] + ' יש ' + sums[asaf] + '. עונש של 30' : ' – ✓ בלי אסף'));
        s.reveal = s.h.map(function (x) { return x.slice(); });
        s.t = asaf >= 0 ? asaf : seat;
        s.phase = s.sc.some(function (x) { return x > LIMIT; }) ? 'end' : 'round';
        if (s.phase === 'end') s.log.push('🏁 עברו את ' + LIMIT + '. המשחק נגמר.');
        return s;
      }
      var d = Array.isArray(a.d) ? a.d.filter(function (c, i, arr) { return h.indexOf(c) >= 0 && arr.indexOf(c) === i; }) : [];
      if (!d.length || d.length !== (a.d || []).length) return 'בוחרים קלפים מהיד כדי לזרוק';
      var k2 = kind(d); if (!k2) return 'אפשר לזרוק: קלף אחד, כמה מאותו מספר, או רצף של 3+ באותה צורה';
      var tk = takeable(s.top, s.tk);
      if (a.take !== 'deck' && tk.indexOf(a.take) < 0) return 'מהערימה אפשר לקחת רק את הקלפים המסומנים';
      s.h[seat] = h.filter(function (c) { return d.indexOf(c) < 0; });
      var got;
      if (a.take === 'deck') { refill(s); got = s.deck.shift(); } else { got = a.take; s.top.splice(s.top.indexOf(got), 1); }
      s.used = (s.used || []).concat(s.top);
      s.h[seat].push(got); sortH(s.h[seat]);
      s.top = d.slice(); s.tk = k2; s.moves++;
      s.log.push('🂠 ' + s.nm[seat] + ': ' + d.map(C.name).join(' ') + (a.take === 'deck' ? ' · לקיחה מהקופה' : ' · לקיחה מהערימה: ' + C.name(got)));
      s.t = (seat + 1) % s.n;
      return s;
    },
    bot: function (s, seat) {
      if (s.phase === 'round') return { next: 1 };
      var h = s.h[seat], me = sum(h), minCards = Math.min.apply(null, s.h.map(function (x, k) { return k === seat ? 9 : x.length; }));
      if (me <= YANIV && (me <= 3 || (me <= 5 && minCards >= 2) || minCards >= 4)) return { y: 1 };
      // כל הזריקות האפשריות
      var opts = [];
      h.forEach(function (c) { opts.push([c]); });
      var byR = {}; h.forEach(function (c) { if (c < 52) (byR[c % 13] = byR[c % 13] || []).push(c); });
      Object.keys(byR).forEach(function (r) { if (byR[r].length > 1) opts.push(byR[r]); });
      for (var su = 0; su < 4; su++) {
        var cs = h.filter(function (c) { return c < 52 && Math.floor(c / 13) === su; }).sort(function (a, b) { return a - b; });
        for (var i = 0; i < cs.length; i++) for (var j = i + 2; j < cs.length; j++) { var run = cs.slice(i, j + 1); if (kind(run) === 'run') opts.push(run); }
      }
      var tk = takeable(s.top, s.tk), best = null, bv = -1;
      opts.forEach(function (o) {
        var rest = h.filter(function (c) { return o.indexOf(c) < 0; }), v = sum(o) - sum(rest) * 0.05 + o.length * 0.3;
        if (v > bv) { bv = v; best = o; }
      });
      var rest2 = h.filter(function (c) { return best.indexOf(c) < 0; }), take = 'deck', tv = 3.5;
      tk.forEach(function (c) { var v = val(c) - (rest2.some(function (x) { return x < 52 && c < 52 && x % 13 === c % 13; }) ? 6 : 0); if (v < tv) { tv = v; take = c; } });
      return { d: best, take: take };
    },
    render: function (v, el, ctx) {
      el._sel = (el._sel || []).filter(function (c) { return v.hand.indexOf(c) >= 0; });
      if (!ctx.mine) el._sel = [];
      var sel = el._sel, me = sum(v.hand);
      var h = '<div class="rv-others">' + v.counts.map(function (n, k) {
        if (k === v.seat) return '';
        var rv = v.reveal ? v.reveal[k] : null;
        return '<div class="rv-p' + (v.t === k ? ' turn' : '') + '"><b>' + CH.esc(ctx.names[k]) + '</b><span>' + (rv ? rv.map(function (c) { return C.html(c, { cls: 'sm' }); }).join('') + ' = ' + sum(rv) : '🂠 ' + n + ' קלפים') + '</span><span>' + v.sc[k] + ' נק׳</span></div>';
      }).join('') + '</div>';
      h += '<div class="yn-mid"><button type="button" class="yn-deck" data-take="deck"' + (ctx.mine && sel.length && v.phase === 'play' ? '' : ' disabled') + '>' + C.html(0, { hidden: true }) + '<small>קופה (' + v.deck + ')</small></button>' +
        '<div class="yn-top"><small>הערימה</small><div>' + v.top.map(function (c) { var ok = v.take.indexOf(c) >= 0 && ctx.mine && sel.length && v.phase === 'play'; return ok ? '<button type="button" class="yn-tk" data-take="' + c + '">' + C.html(c) + '</button>' : C.html(c, { cls: v.take.indexOf(c) < 0 ? 'dim' : '' }); }).join('') + '</div></div></div>';
      if (v.phase === 'round' || v.phase === 'end') {
        h += '<p class="rv-help">' + (v.phase === 'end' ? '🏁 המשחק נגמר' : ctx.mine ? '' : 'עוד רגע מתחיל סיבוב חדש…') + '</p>';
        if (v.phase === 'round' && ctx.mine) h += '<div class="ch-tools"><button type="button" class="on" data-next>▶️ לסיבוב הבא</button></div>';
      } else h += '<p class="rv-help">' + (!ctx.mine ? 'מחכים לתור שלכם…' : !sel.length ? '👇 בוחרים קלפים לזרוק' : kind(sel) ? '👆 עכשיו לוקחים: מהקופה או קלף מסומן מהערימה' : '⚠️ השילוב הזה לא חוקי') + '</p>';
      if (v.seat >= 0) {
        h += '<div class="yn-hand">' + v.hand.map(function (c) { return '<button type="button" data-c="' + c + '" class="yn-c"' + (ctx.mine && v.phase === 'play' ? '' : ' disabled') + '>' + C.html(c, { cls: sel.indexOf(c) >= 0 ? 'sel' : '' }) + '</button>'; }).join('') + '</div>';
        h += '<p class="yn-sum">ביד: <b>' + me + '</b>' + (me <= YANIV ? ' · אפשר להכריז יניב!' : '') + '</p>';
        if (ctx.mine && v.phase === 'play' && me <= YANIV) h += '<div class="ch-tools"><button type="button" class="on" data-yaniv>📣 יניב!</button></div>';
      }
      el.innerHTML = h;
      el.querySelectorAll('[data-c]').forEach(function (b) { b.onclick = function () { var c = +b.getAttribute('data-c'), i = sel.indexOf(c); if (i >= 0) sel.splice(i, 1); else sel.push(c); game.render(v, el, ctx); }; });
      el.querySelectorAll('[data-take]').forEach(function (b) { b.onclick = function () { if (!kind(sel)) { ctx.say('השילוב הזה לא חוקי'); return; } var t = b.getAttribute('data-take'), d = sel.slice(); el._sel = []; ctx.act({ d: d, take: t === 'deck' ? 'deck' : +t }); }; });
      var y = el.querySelector('[data-yaniv]'); if (y) y.onclick = function () { el._sel = []; ctx.act({ y: 1 }); };
      var nx = el.querySelector('[data-next]'); if (nx) nx.onclick = function () { ctx.act({ next: 1 }); };
    },
    share: function (s, ov) { return '🃏 ניצחתי ביניב עם ' + ov.text + '!\nבחינם ובלי פרסומות, מול המחשב או עם חברים. בואו לשחק:'; }
  };
  CH.table(game);
})();
