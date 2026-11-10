// משחקי חשיבה (/kelim/chashiva/) – משותף לשלושת המשחקים:
// מחולל אקראי עם זרע (אותו לוח לכולם לפי התאריך), שמירה בטלפון, רצף ימים, שעון,
// וחלון "פתרתם!" עם תוצאה לשיתוף בלי ספוילר ובקשה חמה לעזור למיזם.
(function () {
  'use strict';
  var CH = window.CH = {};

  // ---------- אקראי עם זרע ----------
  function hash(s) { var h = 1779033703 ^ s.length; for (var i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; } return function () { h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); return (h ^= h >>> 16) >>> 0; }; }
  CH.rng = function (seed) {
    var a = hash(String(seed))();
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  };
  CH.shuffle = function (arr, rnd) { var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; };

  // ---------- תאריך ----------
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  CH.dateKey = function (d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  CH.today = function () { return CH.dateKey(); };
  CH.shortDate = function () { var d = new Date(); return d.getDate() + '.' + (d.getMonth() + 1); };
  // מספר האתגר: יום 1 = 10.11.2026, יום פתיחת המשחקים
  CH.dayNum = function () { var a = new Date(2026, 10, 10), b = new Date(); b.setHours(0, 0, 0, 0); return Math.round((b - a) / 864e5) + 1; };

  // ---------- שמירה (בטלפון בלבד) ----------
  CH.load = function (game) { try { return JSON.parse(localStorage.getItem('chashiva-' + game) || '{}') || {}; } catch (e) { return {}; } };
  CH.save = function (game, obj) { try { localStorage.setItem('chashiva-' + game, JSON.stringify(obj)); } catch (e) {} };

  // ---------- רצף ימים ----------
  function streakOf(days) {
    var n = 0, d = new Date();
    if (!days[CH.dateKey(d)]) d.setDate(d.getDate() - 1); // עוד לא שיחקו היום – הרצף של אתמול עדיין חי
    while (days[CH.dateKey(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  CH.stats = function (game) {
    var s = CH.load(game), days = s.days || {};
    return { streak: streakOf(days), best: s.bestStreak || 0, solved: s.solved || 0, todaySec: days[CH.today()] || 0, doneToday: !!days[CH.today()] };
  };
  // רושם פתרון. daily=true – גם לרצף ולאתגר של היום
  CH.record = function (game, daily, sec) {
    var s = CH.load(game);
    s.solved = (s.solved || 0) + 1;
    if (daily) {
      s.days = s.days || {};
      if (!s.days[CH.today()]) s.days[CH.today()] = Math.max(1, sec | 0);
      var keys = Object.keys(s.days).sort(); while (keys.length > 400) delete s.days[keys.shift()];
      s.bestStreak = Math.max(s.bestStreak || 0, streakOf(s.days));
    }
    CH.save(game, s);
    // רצף כללי: יום שבו נפתר לפחות אתגר יומי אחד
    if (daily) { var all = CH.load('all'); all.days = all.days || {}; all.days[CH.today()] = 1; CH.save('all', all); }
    return CH.stats(game);
  };
  CH.days = function (n) { return n === 1 ? 'יום אחד' : n + ' ימים'; };
  CH.allStreak =function () { return streakOf(CH.load('all').days || {}); };

  // ---------- שעון ----------
  CH.fmt = function (sec) { sec = sec | 0; var m = Math.floor(sec / 60), s = sec % 60; return m + ':' + pad(s); };
  CH.clock = function (el) {
    var c = { sec: 0, on: false };
    setInterval(function () { if (c.on && !document.hidden) { c.sec++; if (el) el.textContent = CH.fmt(c.sec); } }, 1000);
    c.set = function (s) { c.sec = s | 0; if (el) el.textContent = CH.fmt(c.sec); };
    return c;
  };

  // ---------- מדידה ----------
  // רמז / בדיקה / גילוי: לכל היותר אירוע אחד בחצי דקה, כדי לא להציף את הנתונים
  var lastEv = {};
  CH.used = function (tool, how, extra) {
    if (/^(hint|check|reveal)$/.test(how)) { var k = tool + how, t = Date.now(); if (lastEv[k] && t - lastEv[k] < 30000) return; lastEv[k] = t; }
    if (window.toolUsed) window.toolUsed(tool, Object.assign({ how: how }, extra || {}));
  };

  // ---------- חלון "פתרתם!" ----------
  // o: {tool, el, title, line, share, daily, next:[{label, fn}]}
  CH.win = function (o) {
    var el = o.el; if (!el) return;
    var st = o.stats || {};
    var streakTxt = o.daily && st.streak ? '<span>🔥 רצף <b>' + CH.days(st.streak) + '</b></span>' : '';
    el.innerHTML =
      '<div class="ch-win" role="status">' +
        '<h2>' + (o.title || 'פתרתם! 🎉') + '</h2>' +
        '<div class="ch-pills">' + (o.line || '') + streakTxt + '</div>' +
        (o.extra || '') +
        '<div class="ch-next"></div>' +
        '<div class="ch-help">' +
          '<b>רגע אחד, מכל הלב 🙏</b>' +
          '<p>המשחקים כאן בחינם ובלי פרסומות. אני גילעד, נפגעתי בחאן יונס, ואני בונה את האתר הזה לבד ובאהבה. גם לי הוא עולה כסף כל חודש. אם נהניתם, שתי דרכים לעזור:</p>' +
          '<ol><li><b>לשלוח לחבר אחד</b> שאוהב לפתור. זה הכי עוזר, והתוצאה לא מגלה את הפתרון.</li>' +
          '<li>מי שרוצה ויכול: <b>לתמוך במיזם</b>, בכל סכום.</li></ol>' +
          '<pre class="ch-res" dir="rtl"></pre>' +
          '<div class="actions"><a class="btn btn-gold" href="#" data-share-tool="wa" target="_blank" rel="noopener"><svg class="ic"><use href="#wa"/></svg> לשלוח לחבר בווטסאפ</a>' +
          '<button class="btn btn-line" type="button" data-ch-give>💛 לתמוך במיזם</button></div>' +
          '<div class="ch-give" hidden><p>בביט או בפייבוקס, למספר <b dir="ltr">058-404-9049</b>. אפשר לכתוב בהערה "משחקים", כדי שאדע ואודה לכם.</p>' +
          '<button class="btn btn-gold btn-sm" type="button" data-donate="copy" data-num="0584049049">להעתיק את המספר</button> ' +
          '<a class="btn btn-line btn-sm" href="/kelim/#litmoch">עוד דרכים לעזור</a></div>' +
        '</div>' +
      '</div>';
    el.querySelector('.ch-res').textContent = o.share || '';
    el.querySelector('[data-share-tool]').setAttribute('data-text', o.share || 'משחקי חשיבה בחינם');
    var nx = el.querySelector('.ch-next');
    (o.next || []).forEach(function (n, i) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'btn ' + (i ? 'btn-line' : 'btn-gold'); b.textContent = n.label;
      b.onclick = function () { el.innerHTML = ''; n.fn(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
      nx.appendChild(b);
    });
    el.querySelector('[data-ch-give]').onclick = function () { el.querySelector('.ch-give').hidden = false; CH.used(o.tool, 'give_open'); };
    el.querySelector('[data-share-tool]').addEventListener('click', function () { CH.used(o.tool, 'share_result', { daily: o.daily ? 1 : 0 }); });
    setTimeout(function () { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 250);
  };

  // ---------- דף התחום: ההתקדמות שלכם ----------
  var box = document.getElementById('ch-progress');
  if (box) {
    var games = [['mila', 'מילה ביום', '/kelim/chashiva/mila/'], ['nono', 'שחור ופתור', '/kelim/chashiva/shachor/'], ['tash', 'תשחצים', '/kelim/chashiva/tashchetz/'], ['sudoku', 'סודוקו', '/kelim/chashiva/sudoku/']];
    var any = false;
    box.innerHTML = '<div class="ch-prog">' + games.map(function (g) {
      var s = CH.stats(g[0]); if (s.solved) any = true;
      return '<a href="' + g[2] + '#daily"><b>' + g[1] + '</b><span>' + (s.doneToday ? '✓ האתגר של היום נפתר' : '⭐ האתגר של היום מחכה') + '</span>' +
        '<span>🔥 רצף ' + s.streak + ' · נפתרו ' + s.solved + '</span></a>';
    }).join('') + '</div>' + (any ? '' : '<p class="ch-hint">עוד לא שיחקתם כאן. ההתקדמות נשמרת בטלפון הזה בלבד, בלי הרשמה.</p>');
  }
})();
