// רביעיות – /kelim/chashiva/reviiot/
// 13 נושאים × 4 קלפים. בתור שלכם מבקשים משחקן קלף מנושא שכבר יש לכם בו קלף.
// יש לו – מקבלים וממשיכים. אין לו – התור עובר אליו. רביעייה שלמה יורדת לשולחן. הכי הרבה רביעיות – מנצח.
(function () {
  'use strict';
  var CH = window.CH;
  if (!document.getElementById('tb') || !CH.table) return;
  var CATS = [
    ['פירות', '🍎', [['תפוח', '🍎'], ['בננה', '🍌'], ['ענבים', '🍇'], ['אבטיח', '🍉']]],
    ['חיות בבית', '🐶', [['כלב', '🐶'], ['חתול', '🐱'], ['ארנב', '🐰'], ['תוכי', '🦜']]],
    ['חיות בר', '🦁', [['אריה', '🦁'], ['פיל', '🐘'], ['ג׳ירפה', '🦒'], ['זברה', '🦓']]],
    ['בים', '🌊', [['דג', '🐟'], ['דולפין', '🐬'], ['צב ים', '🐢'], ['תמנון', '🐙']]],
    ['תחבורה', '🚗', [['מכונית', '🚗'], ['אוטובוס', '🚌'], ['רכבת', '🚆'], ['מטוס', '✈️']]],
    ['ספורט', '⚽', [['כדורגל', '⚽'], ['כדורסל', '🏀'], ['טניס', '🎾'], ['שחייה', '🏊']]],
    ['כלי נגינה', '🎵', [['גיטרה', '🎸'], ['תוף', '🥁'], ['כינור', '🎻'], ['חצוצרה', '🎺']]],
    ['חגים', '🕎', [['חנוכה', '🕎'], ['פסח', '🍷'], ['סוכות', '🛖'], ['פורים', '🎭']]],
    ['מזג אוויר', '☀️', [['שמש', '☀️'], ['גשם', '🌧️'], ['שלג', '❄️'], ['ברק', '⚡']]],
    ['ירקות', '🥕', [['גזר', '🥕'], ['עגבנייה', '🍅'], ['מלפפון', '🥒'], ['תירס', '🌽']]],
    ['כלי עבודה', '🔨', [['פטיש', '🔨'], ['מברג', '🪛'], ['מסור', '🪚'], ['סרגל', '📏']]],
    ['מאפים', '🥐', [['פיתה', '🫓'], ['חלה', '🍞'], ['עוגה', '🎂'], ['עוגייה', '🍪']]],
    ['בגדים', '👕', [['חולצה', '👕'], ['מכנסיים', '👖'], ['כובע', '🧢'], ['נעליים', '👟']]]
  ];
  function cat(c) { return Math.floor(c / 4); }
  function cname(c) { var x = CATS[cat(c)][2][c % 4]; return x[1] + ' ' + x[0]; }
  function clone(s) { return JSON.parse(JSON.stringify(s)); }
  function nextWithCards(s, from) { for (var k = 0; k < s.n; k++) { var j = (from + k) % s.n; if (s.h[j].length) return j; } return -1; }
  function sortHand(h) { h.sort(function (a, b) { return a - b; }); }

  var game = {
    g: 'reviiot', tool: 'chashiva_reviiot', name: 'רביעיות', minP: 2, maxP: 5, defP: 3, botDelay: 1100,
    botNames: ['רוני', 'נועה', 'איתי', 'מאיה'],
    init: function (seed, n, names) {
      var deck = CH.shuffle(CH.cards.deck(0), CH.rng(seed)), s = { n: n, h: [], sets: [], t: 0, log: [], kc: {}, no: {}, has: {}, nm: names };
      for (var k = 0; k < n; k++) { s.h.push([]); s.sets.push([]); s.has[k] = {}; }
      deck.forEach(function (c, i) { s.h[i % n].push(c); });
      s.h.forEach(sortHand);
      for (k = 0; k < n; k++) settle(s, k);
      s.log.push('🃏 חולקו 52 קלפים. התור הראשון: ' + names[0]);
      return s;
    },
    turn: function (s) { return s.t; },
    over: function (s) {
      var done = s.sets.reduce(function (a, x) { return a + x.length; }, 0); if (done < 13) return null;
      var best = Math.max.apply(null, s.sets.map(function (x) { return x.length; })), w = [];
      s.sets.forEach(function (x, k) { if (x.length === best) w.push(k); });
      return { w: w, text: best + ' רביעיות' };
    },
    view: function (s, seat) {
      return { seat: seat, hand: seat >= 0 ? s.h[seat].slice() : [], counts: s.h.map(function (h) { return h.length; }), sets: s.sets, log: s.log.slice(-6), t: s.t,
        score: s.sets.map(function (x, k) { return s.nm[k] + ' ' + x.length; }).join(' · ') };
    },
    act: function (s0, seat, a) {
      if (!a || typeof a.c !== 'number' || typeof a.to !== 'number') return 'בקשה לא תקינה';
      var s = clone(s0), c = a.c, to = a.to;
      if (to === seat || to < 0 || to >= s.n || !s.h[to].length) return 'אפשר לבקש רק משחקן שיש לו קלפים';
      if (s.h[seat].indexOf(c) >= 0) return 'הקלף הזה כבר אצלכם';
      if (!s.h[seat].some(function (x) { return cat(x) === cat(c); })) return 'מבקשים רק מנושא שיש לכם בו קלף';
      s.has[seat][cat(c)] = 1;
      var i = s.h[to].indexOf(c), line = '🙋 ' + s.nm[seat] + ' ← ' + s.nm[to] + ': ' + cname(c);
      if (i >= 0) {
        s.h[to].splice(i, 1); s.h[seat].push(c); sortHand(s.h[seat]); s.kc[c] = seat; delete s.no[c];
        var got = settle(s, seat);
        s.log.push(line + ' – ✓ יש!' + (got ? ' ורביעייה שלמה: ' + CATS[got - 1][1] + ' ' + CATS[got - 1][0] + ' 🎉' : ''));
        if (!s.h[seat].length) s.t = nextWithCards(s, seat + 1);
      } else {
        s.no[c] = s.no[c] || {}; s.no[c][to] = 1;
        s.log.push(line + ' – ✗ אין. עכשיו התור: ' + s.nm[to]);
        s.t = to;
      }
      if (s.t >= 0 && !s.h[s.t].length) s.t = nextWithCards(s, s.t);
      if (s.t < 0) s.t = 0;
      return s;
    },
    bot: function (s, seat) {
      var h = s.h[seat], byCat = {};
      h.forEach(function (c) { (byCat[cat(c)] = byCat[cat(c)] || []).push(c); });
      var opts = [];
      Object.keys(byCat).forEach(function (k) {
        for (var j = 0; j < 4; j++) {
          var c = +k * 4 + j; if (h.indexOf(c) >= 0) continue;
          var others = []; for (var p = 0; p < s.n; p++) if (p !== seat && s.h[p].length && !(s.no[c] && s.no[c][p])) others.push(p);
          if (!others.length) continue;
          var known = s.kc[c] !== undefined && s.kc[c] !== seat && s.h[s.kc[c]].length ? s.kc[c] : -1;
          var catKnown = others.filter(function (p) { return s.has[p][k]; });
          var to = known >= 0 ? known : catKnown.length ? catKnown[Math.floor(Math.random() * catKnown.length)] : others[Math.floor(Math.random() * others.length)];
          opts.push({ c: c, to: to, v: byCat[k].length * 2 + (known >= 0 ? 10 : catKnown.length ? 3 : 0) + Math.random() });
        }
      });
      opts.sort(function (a, b) { return b.v - a.v; });
      if (opts.length) return { c: opts[0].c, to: opts[0].to };
      // אין ידע: נושא כלשהו, שחקן כלשהו
      var c0 = h[0], miss = []; for (var x = 0; x < 4; x++) if (h.indexOf(cat(c0) * 4 + x) < 0) miss.push(cat(c0) * 4 + x);
      var any = []; for (var q = 0; q < s.n; q++) if (q !== seat && s.h[q].length) any.push(q);
      return { c: miss[0], to: any[0] };
    },
    render: function (v, el, ctx) {
      var byCat = {}; v.hand.forEach(function (c) { (byCat[cat(c)] = byCat[cat(c)] || []).push(c); });
      var sel = el._sel;
      if (sel !== undefined && v.hand.indexOf(sel) >= 0) sel = el._sel = undefined;
      var h = '<div class="rv-others">' + v.counts.map(function (n, k) {
        if (k === v.seat) return '';
        var can = ctx.mine && sel !== undefined && n > 0;
        return '<button type="button" class="rv-p' + (v.t === k ? ' turn' : '') + (can ? ' can' : '') + '" data-to="' + k + '"' + (can ? '' : ' disabled') + '><b>' + CH.esc(ctx.names[k]) + '</b><span>🂠 ' + n + ' קלפים</span><span>' + (v.sets[k].map(function (ci) { return CATS[ci][1]; }).join('') || '—') + '</span></button>';
      }).join('') + '</div>';
      if (v.seat < 0) h += '<p>המשחק נגמר.</p>';
      else {
        h += '<div class="rv-mysets">הרביעיות שלכם: ' + (v.sets[v.seat].map(function (ci) { return CATS[ci][1] + ' ' + CATS[ci][0]; }).join(' · ') || 'עוד אין') + '</div>';
        h += '<p class="rv-help">' + (ctx.over ? '🏁 המשחק נגמר' : !ctx.mine ? 'מחכים לתור שלכם…' : sel === undefined ? '👇 נוגעים בקלף שחסר לכם (מקווקו), ואז בשחקן שממנו מבקשים' : '👆 ממי לבקש את ' + cname(sel) + '?') + '</p>';
        h += '<div class="rv-hand">' + Object.keys(byCat).map(function (k) {
          return '<div class="rv-cat"><small>' + CATS[k][1] + ' ' + CATS[k][0] + '</small><div>' + CATS[k][2].map(function (x, j) {
            var c = +k * 4 + j, have = byCat[k].indexOf(c) >= 0;
            return have ? '<span class="rv-c">' + x[1] + '<i>' + x[0] + '</i></span>' : '<button type="button" class="rv-c miss' + (sel === c ? ' sel' : '') + '" data-c="' + c + '"' + (ctx.mine ? '' : ' disabled') + '>' + x[1] + '<i>' + x[0] + '</i></button>';
          }).join('') + '</div></div>';
        }).join('') + '</div>';
      }
      el.innerHTML = h;
      el.querySelectorAll('[data-c]').forEach(function (b) { b.onclick = function () { el._sel = +b.getAttribute('data-c'); game.render(v, el, ctx); }; });
      el.querySelectorAll('[data-to]').forEach(function (b) { b.onclick = function () { if (el._sel === undefined) return; var c = el._sel; el._sel = undefined; ctx.act({ c: c, to: +b.getAttribute('data-to') }); }; });
    },
    share: function (s, ov) { return '🃏 ניצחתי ברביעיות עם ' + ov.text + '!\nבחינם ובלי פרסומות, גם מול המחשב וגם עם חברים. בואו לשחק:'; }
  };
  // רביעייה שלמה יורדת לשולחן. מחזיר את מספר הנושא + 1 אם ירדה
  function settle(s, seat) {
    var by = {}, got = 0; s.h[seat].forEach(function (c) { by[cat(c)] = (by[cat(c)] || 0) + 1; });
    Object.keys(by).forEach(function (k) {
      if (by[k] === 4) { s.h[seat] = s.h[seat].filter(function (c) { return cat(c) !== +k; }); s.sets[seat].push(+k); got = +k + 1; for (var j = 0; j < 4; j++) delete s.kc[+k * 4 + j]; }
    });
    return got;
  }
  CH.table(game);
})();
