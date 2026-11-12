// אבני מספרים – /kelim/chashiva/avanim/
// 106 אבנים: 1-13 בארבעה צבעים, פעמיים, ועוד 2 ג'וקרים. לכל אחד 14.
// מניחים על השולחן קבוצות: "סדרה" (אותו צבע, מספרים עוקבים, 3+) או "משפחה" (אותו מספר, צבעים שונים, 3-4).
// הורדה ראשונה: לפחות 30 נקודות מהאבנים שלכם בלבד. אחר כך מותר גם לסדר מחדש את השולחן.
// מי שנגמרות לו האבנים – מנצח. אין מה להניח? לוקחים אבן.
(function () {
  'use strict';
  var CH = window.CH;
  if (!document.getElementById('tb') || !CH.table) return;
  var COLORS = ['אדום', 'כחול', 'כתום', 'שחור'], FIRST = 30, JK = 104;
  function isJ(t) { return t >= JK; }
  function num(t) { return t % 13 + 1; }
  function col(t) { return Math.floor((t % 52) / 13); }
  function clone(s) { return JSON.parse(JSON.stringify(s)); }
  function tileHtml(t, o) {
    o = o || {};
    return '<button type="button" class="av-t ' + (isJ(t) ? 'j' : 'c' + col(t)) + (o.sel ? ' sel' : '') + (o.nw ? ' nw' : '') + (o.dis ? ' lock' : '') + '" data-t="' + t + '" aria-label="' + (isJ(t) ? 'ג׳וקר' : num(t) + ' ' + COLORS[col(t)]) + '">' + (isJ(t) ? '☺' : num(t)) + '</button>';
  }
  // בדיקת קבוצה. מחזיר {ok, v (סכום), sorted} או null
  function check(g) {
    if (!g || g.length < 3) return null;
    var nj = g.filter(function (t) { return !isJ(t); }), jk = g.length - nj.length;
    if (!nj.length) return null;
    // משפחה
    if (g.length <= 4 && nj.every(function (t) { return num(t) === num(nj[0]); })) {
      var cs = nj.map(col); if (cs.every(function (c, i) { return cs.indexOf(c) === i; })) return { v: num(nj[0]) * g.length, sorted: nj.sort(function (a, b) { return col(a) - col(b); }).concat(g.filter(isJ)) };
    }
    // סדרה
    if (g.length <= 13 && nj.every(function (t) { return col(t) === col(nj[0]); })) {
      var ns = nj.map(num).sort(function (a, b) { return a - b; });
      for (var i = 1; i < ns.length; i++) if (ns[i] === ns[i - 1]) return null;
      var gaps = ns[ns.length - 1] - ns[0] + 1 - ns.length; if (gaps > jk) return null;
      var extra = jk - gaps, top = Math.min(13, ns[ns.length - 1] + extra), start = top - (g.length - 1);
      if (start < 1) return null;
      var byN = {}, out = [], js = g.filter(isJ), v = 0; nj.forEach(function (t) { byN[num(t)] = t; });
      for (var n = start; n < start + g.length; n++) { out.push(byN[n] !== undefined ? byN[n] : js.shift()); v += n; }
      return { v: v, sorted: out };
    }
    return null;
  }
  function tval(t) { return isJ(t) ? 30 : num(t); }
  function rackSum(r) { return r.reduce(function (a, t) { return a + tval(t); }, 0); }
  function sortRack(r, byNum) { return r.sort(function (a, b) { if (isJ(a) !== isJ(b)) return isJ(a) ? 1 : -1; return byNum ? (num(a) - num(b) || col(a) - col(b)) : (col(a) - col(b) || num(a) - num(b)); }); }

  // ---------- המחשב: מוצא קבוצות ביד ----------
  function findGroups(rack) {
    var r = rack.slice(), groups = [], jokers = r.filter(isJ);
    r = r.filter(function (t) { return !isJ(t); });
    function take(ts) { ts.forEach(function (t) { r.splice(r.indexOf(t), 1); }); groups.push(ts); }
    var changed = true;
    while (changed) {
      changed = false;
      // סדרות
      for (var c = 0; c < 4 && !changed; c++) {
        var byN = {}; r.forEach(function (t) { if (col(t) === c && byN[num(t)] === undefined) byN[num(t)] = t; });
        var run = [];
        for (var n = 1; n <= 14; n++) {
          if (byN[n] !== undefined) run.push(byN[n]);
          else { if (run.length >= 3) { take(run); changed = true; break; } run = []; }
        }
      }
      // משפחות
      for (var n2 = 13; n2 >= 1 && !changed; n2--) {
        var seen = {}, fam = r.filter(function (t) { if (num(t) !== n2 || seen[col(t)]) return false; seen[col(t)] = 1; return true; });
        if (fam.length >= 3) { take(fam); changed = true; }
      }
    }
    // ג'וקר משלים זוג
    jokers.forEach(function (j) {
      for (var i = 0; i < r.length; i++) for (var k = i + 1; k < r.length; k++) {
        var g = [r[i], r[k], j]; if (check(g)) { var a = r[i], b = r[k]; r.splice(r.indexOf(a), 1); r.splice(r.indexOf(b), 1); groups.push(g); return; }
      }
    });
    return groups;
  }

  var game = {
    g: 'avanim', tool: 'chashiva_avanim', name: 'אבני מספרים (רמי)', minP: 2, maxP: 4, defP: 2, botDelay: 1300,
    botNames: ['רוני', 'נועה', 'איתי'],
    init: function (seed, n, names) {
      var all = []; for (var t = 0; t < 106; t++) all.push(t);
      var pool = CH.shuffle(all, CH.rng(seed)), s = { n: n, nm: names, racks: [], table: [], pool: pool, melded: [], t: 0, log: [], passes: 0 };
      for (var k = 0; k < n; k++) { s.racks.push(sortRack(pool.splice(0, 14))); s.melded.push(false); }
      s.log.push('🀄 לכל אחד 14 אבנים. התור הראשון: ' + names[0]);
      return s;
    },
    turn: function (s) { return s.t; },
    over: function (s) {
      for (var k = 0; k < s.n; k++) if (!s.racks[k].length) return { w: [k], text: 'סיים את כל האבנים' };
      if (!s.pool.length && s.passes >= s.n) {
        var sums = s.racks.map(rackSum), lo = Math.min.apply(null, sums), w = [];
        sums.forEach(function (x, k) { if (x === lo) w.push(k); });
        return { w: w, text: 'האבנים בקופה נגמרו – הכי מעט נקודות ביד (' + lo + ')' };
      }
      return null;
    },
    view: function (s, seat) {
      return { seat: seat, rack: seat >= 0 ? s.racks[seat].slice() : [], counts: s.racks.map(function (r) { return r.length; }), table: s.table, pool: s.pool.length,
        melded: s.melded, log: s.log.slice(-6), t: s.t, score: s.racks.map(function (r, k) { return s.nm[k] + ' ' + r.length + ' אבנים'; }).join(' · ') };
    },
    act: function (s0, seat, a) {
      var s = clone(s0), rack = s.racks[seat];
      if (a.draw) {
        if (s.pool.length) { rack.push(s.pool.shift()); sortRack(rack); s.passes = 0; s.log.push('🎲 ' + s.nm[seat] + ': לקיחת אבן'); }
        else { s.passes++; s.log.push('⏭️ ' + s.nm[seat] + ': אין אבנים בקופה, תור עובר'); }
        s.t = (seat + 1) % s.n; return s;
      }
      if (!Array.isArray(a.table)) return 'מהלך לא תקין';
      var newT = a.table.filter(function (g) { return Array.isArray(g) && g.length; });
      var oldTiles = [].concat.apply([], s.table), newTiles = [].concat.apply([], newT);
      // מה הונח מהיד
      var played = newTiles.slice(); oldTiles.forEach(function (t) { var i = played.indexOf(t); if (i >= 0) played.splice(i, 1); });
      if (newTiles.length !== oldTiles.length + played.length) return 'אבן מהשולחן חסרה';
      if (oldTiles.some(function (t) { return newTiles.indexOf(t) < 0; })) return 'אבנים שהיו על השולחן חייבות להישאר עליו';
      if (!played.length) return 'לא הנחתם אף אבן. אין מה להניח? לוקחים אבן';
      if (played.some(function (t) { return rack.indexOf(t) < 0; })) return 'אבן שלא שלכם';
      var bad = newT.filter(function (g) { return !check(g); });
      if (bad.length) return 'יש קבוצה לא חוקית (מסומנת באדום). כל קבוצה: 3+ אבנים, סדרה באותו צבע או משפחה של אותו מספר';
      if (!s.melded[seat]) {
        var oldKeys = s.table.map(function (g) { return g.slice().sort().join(','); });
        var keep = newT.filter(function (g) { var k = g.slice().sort().join(','), i = oldKeys.indexOf(k); if (i >= 0) { oldKeys.splice(i, 1); return true; } return false; });
        if (oldKeys.length) return 'לפני ההורדה הראשונה אסור לגעת בשולחן';
        var mine = newT.filter(function (g) { return keep.indexOf(g) < 0; });
        var v = mine.reduce(function (x, g) { return x + check(g).v; }, 0);
        if (v < FIRST) return 'הורדה ראשונה צריכה להיות לפחות ' + FIRST + ' נקודות (יש ' + v + ')';
        s.melded[seat] = true;
      }
      s.table = newT.map(function (g) { return check(g).sorted; });
      s.racks[seat] = rack.filter(function (t) { return played.indexOf(t) < 0; });
      s.passes = 0;
      s.log.push('🀄 ' + s.nm[seat] + ': הונחו ' + played.length + ' אבנים' + (s.racks[seat].length ? ' · נשארו ' + s.racks[seat].length : ' · נגמרו האבנים! 🎉'));
      s.t = (seat + 1) % s.n;
      return s;
    },
    bot: function (s, seat) {
      var rack = s.racks[seat], groups = findGroups(rack), table = s.table.map(function (g) { return g.slice(); });
      if (!s.melded[seat]) {
        var v = groups.reduce(function (x, g) { return x + check(g).v; }, 0);
        if (v >= FIRST) return { table: table.concat(groups) };
        return { draw: 1 };
      }
      table = table.concat(groups);
      var used = [].concat.apply([], groups), rest = rack.filter(function (t) { return used.indexOf(t) < 0; });
      rest.forEach(function (t) { for (var i = 0; i < table.length; i++) { var g = table[i].concat([t]); if (check(g)) { table[i] = g; used.push(t); return; } } });
      return used.length ? { table: table } : { draw: 1 };
    },
    render: function (v, el, ctx) {
      // שלב עבודה מקומי: השולחן והיד כמו שהם בתור הזה
      var key = JSON.stringify([v.table, v.rack, v.t]);
      if (el._key !== key || !el._st) { el._key = key; el._st = { table: v.table.map(function (g) { return g.slice(); }), rack: v.rack.slice(), sel: null, from: null }; }
      var st = el._st, melded = v.seat >= 0 && v.melded[v.seat], mine = ctx.mine;
      var playedNow = v.rack.filter(function (t) { return st.rack.indexOf(t) < 0; });
      var h = '<div class="rv-others">' + v.counts.map(function (n, k) { return k === v.seat ? '' : '<div class="rv-p' + (v.t === k ? ' turn' : '') + '"><b>' + CH.esc(ctx.names[k]) + '</b><span>🀫 ' + n + ' אבנים</span><span>' + (v.melded[k] ? '✓ הוריד' : 'עוד לא הוריד') + '</span></div>'; }).join('') + '</div>';
      h += '<div class="av-table">' + (st.table.length ? st.table.map(function (g, i) {
        var ok = check(g), shown = ok ? ok.sorted : g;
        return '<div class="av-g' + (ok ? '' : ' bad') + (mine && st.sel !== null ? ' drop' : '') + '" data-g="' + i + '">' + shown.map(function (t) { return tileHtml(t, { sel: st.sel === t, nw: playedNow.indexOf(t) >= 0, dis: !mine || (!melded && playedNow.indexOf(t) < 0) }); }).join('') + '</div>';
      }).join('') : '<p class="av-empty">השולחן ריק</p>') +
        (mine && st.sel !== null ? '<button type="button" class="av-g av-new" data-g="new">➕ קבוצה חדשה</button>' : '') + '</div>';
      var meldV = 0; if (!melded) st.table.forEach(function (g) { if (g.some(function (t) { return playedNow.indexOf(t) >= 0; }) && check(g)) meldV += check(g).v; });
      h += '<p class="rv-help">' + (ctx.over ? '🏁 המשחק נגמר' : !mine ? 'מחכים לתור שלכם…' : st.sel !== null ? '👆 עכשיו נוגעים בקבוצה, או ב"קבוצה חדשה"' + (playedNow.indexOf(st.sel) >= 0 || st.rack.indexOf(st.sel) < 0 ? '' : '') : playedNow.length ? (melded ? 'ממשיכים להניח, או "סיום התור"' : 'בהורדה הראשונה: ' + meldV + ' מתוך ' + FIRST + ' נקודות') : '👇 נוגעים באבן כדי להזיז אותה' + (melded ? ' (גם מהשולחן)' : '')) + '</p>';
      if (v.seat >= 0) {
        h += '<div class="av-rack' + (mine && st.sel !== null && playedNow.indexOf(st.sel) >= 0 ? ' drop' : '') + '" data-g="rack">' + st.rack.map(function (t) { return tileHtml(t, { sel: st.sel === t, dis: !mine }); }).join('') + '</div>';
        if (mine) h += '<div class="ch-tools">' + (playedNow.length ? '<button type="button" class="on" data-go>✓ סיום התור</button><button type="button" data-undo>↶ להחזיר הכול</button>' : '<button type="button" class="on" data-draw>🎲 לקחת אבן' + (v.pool ? ' (' + v.pool + ')' : '') + '</button>') + '<button type="button" data-sort>⇅ מיון</button></div>';
      }
      el.innerHTML = h;
      el.querySelectorAll('[data-t]').forEach(function (b) {
        b.onclick = function (e) {
          e.stopPropagation(); if (!mine) return;
          var t = +b.getAttribute('data-t');
          if (st.sel === null && b.classList.contains('lock')) { ctx.say('לפני ההורדה הראשונה אי אפשר להזיז אבנים שעל השולחן'); return; }
          if (st.sel === t) { st.sel = null; game.render(v, el, ctx); return; }
          if (st.sel !== null) { var grp = b.closest('[data-g]'); if (grp) { move(grp.getAttribute('data-g')); return; } }
          st.sel = t; game.render(v, el, ctx);
        };
      });
      function move(to) {
        var t = st.sel; if (t === null) return;
        if (to === 'rack' && playedNow.indexOf(t) < 0) { ctx.say('אבן שהייתה על השולחן לא חוזרת ליד'); return; }
        var ri = st.rack.indexOf(t); if (ri >= 0) st.rack.splice(ri, 1);
        st.table.forEach(function (g) { var i = g.indexOf(t); if (i >= 0) g.splice(i, 1); });
        st.table = st.table.filter(function (g) { return g.length; });
        if (to === 'rack') st.rack.push(t); else if (to === 'new') st.table.push([t]); else { var gi = +to; if (st.table[gi]) st.table[gi].push(t); else st.table.push([t]); }
        st.sel = null; game.render(v, el, ctx);
      }
      el.querySelectorAll('[data-g]').forEach(function (g) { g.onclick = function () { if (mine && st.sel !== null) move(g.getAttribute('data-g')); }; });
      var go = el.querySelector('[data-go]'); if (go) go.onclick = function () { ctx.act({ table: st.table }); };
      var dr = el.querySelector('[data-draw]'); if (dr) dr.onclick = function () { ctx.act({ draw: 1 }); };
      var un = el.querySelector('[data-undo]'); if (un) un.onclick = function () { el._st = null; game.render(v, el, ctx); };
      var so = el.querySelector('[data-sort]'); if (so) so.onclick = function () { el._byNum = !el._byNum; sortRack(st.rack, el._byNum); game.render(v, el, ctx); };
    },
    share: function (s, ov) { return '🀄 ניצחתי באבני מספרים!\nבחינם ובלי פרסומות, מול המחשב או עם חברים. בואו לשחק:'; }
  };
  CH.table(game);
})();
