/* מודול החישוב של כלי טהרת המשפחה – חישוב טהור, בלי DOM ובלי שרת.
   כל כלל כאן מתועד עם מקור ב-docs/tahara-rules.md. הנתונים האישיים לא יוצאים מהמכשיר.
   עובד בדפדפן (window.TaharaCore) וב-node (module.exports) – מקבל את @hebcal/core מבחוץ. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else root.TaharaCore = factory(root.hebcal);
}(typeof self !== 'undefined' ? self : this, function (H) {
  'use strict';
  if (!H || !H.HDate) throw new Error('hebcal חסר');

  /* ---------- עונות: מספור רציף ----------
     כל יום עברי (abs של hebcal) מתחיל בלילה ואחריו היום.
     idx = abs*2 (לילה) או abs*2+1 (יום). העונה הקודמת = idx-1. */
  function idxOf(abs, onah) { return abs * 2 + (onah === 'day' ? 1 : 0); }
  function fromIdx(idx) { var abs = Math.floor(idx / 2); return { abs: abs, onah: idx % 2 ? 'day' : 'night' }; }

  /* שעון ← עונה. date = תאריך לועזי (שנה, חודש 1-12, יום), time = 'HH:MM' שעון מקומי,
     geo = {lat,lng,elev?,tz?}. מחזיר גם האם קרוב לשקיעה/הנץ (ספק). */
  function onahFromClock(y, m, d, time, geo, opts) {
    opts = opts || {};
    var hm = String(time || '12:00').split(':'), hh = +hm[0], mm = +(hm[1] || 0);
    var civil = new Date(y, m - 1, d, 12, 0, 0);
    var gl = new H.GeoLocation('', geo.lat, geo.lng, geo.elev || 0, geo.tz || 'Asia/Jerusalem');
    var z = new H.Zmanim(gl, civil, false);
    var t = new Date(y, m - 1, d, hh, mm, 0).getTime();
    var rise = z.sunrise().getTime(), set = z.sunset().getTime();
    var abs = new H.HDate(civil).abs(), onah;
    if (t < rise) onah = 'night';
    else if (t < set) onah = 'day';
    else { onah = 'night'; abs += 1; }
    var w = (opts.doubtMinutes == null ? 20 : opts.doubtMinutes) * 60000;
    var near = null;
    if (Math.abs(t - set) <= w) near = 'sunset';
    else if (Math.abs(t - rise) <= w) near = 'sunrise';
    return { abs: abs, onah: onah, near: near, sunrise: new Date(rise), sunset: new Date(set) };
  }

  /* ---------- תצוגת תאריך ---------- */
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(g) { return g.getFullYear() + '-' + p2(g.getMonth() + 1) + '-' + p2(g.getDate()); }
  function absFromYmd(s) { var a = s.split('-'); return new H.HDate(new Date(+a[0], +a[1] - 1, +a[2], 12)).abs(); }
  function describe(abs, onah) {
    var hd = new H.HDate(abs), g = hd.greg();
    // עונת לילה של יום עברי abs מתחילה בערב היום הלועזי הקודם
    var eve = onah === 'night' ? new H.HDate(abs - 1).greg() : null;
    return {
      abs: abs, onah: onah,
      hebrew: hd.renderGematriya(true),
      greg: g, gregEve: eve, ymd: ymd(g), ymdEve: eve ? ymd(eve) : null,
      dow: hd.getDay()
    };
  }

  /* ---------- וסת החודש ----------
     אותו יום בחודש העברי הבא. טיפול ביום ל' כשהחודש הבא חסר – לפי preset.chodesh30 */
  function nextMonthSameDay(abs, preset) {
    var hd = new H.HDate(abs), day = hd.getDate();
    var first = new H.HDate(1, hd.getMonth(), hd.getFullYear());
    var nextFirst = new H.HDate(first.abs() + hd.daysInMonth()); // א' בחודש הבא
    var dim = nextFirst.daysInMonth();
    if (day <= dim) return { abs: nextFirst.abs() + day - 1, edge: null };
    // יום ל' והחודש הבא בן 29
    var mode = (preset && preset.chodesh30) || 'ask';
    if (mode === 'rosh_chodesh') return { abs: nextFirst.abs() + dim, edge: 'chodesh30_rc' }; // א' של החודש שאחריו
    if (mode === 'none') return { abs: null, edge: 'chodesh30_none' };
    return { abs: nextFirst.abs() + dim, edge: 'chodesh30_ask' };
  }

  /* ---------- הפלגה ----------
     ההפלגה = מספר הימים מראייה לראייה כשסופרים את שני ימי הראייה (מנהג רוב הפוסקים, ראו המסמך).
     preset.haflagaBy: 'days' (ברירת מחדל) או 'onot' (ספירת עונות). */
  function haflagaLen(a, b, preset) {
    if (preset && preset.haflagaBy === 'onot') return idxOf(b.abs, b.onah) - idxOf(a.abs, a.onah) + 1;
    return b.abs - a.abs + 1;
  }
  function haflagaTarget(last, len, preset) {
    if (preset && preset.haflagaBy === 'onot') return fromIdx(idxOf(last.abs, last.onah) + len - 1);
    return { abs: last.abs + len - 1, onah: last.onah };
  }

  /* ---------- וסת קבוע: זיהוי ----------
     חודש: 3 ראיות רצופות באותו יום בחודש ובאותה עונה.
     הפלגה: 4 ראיות עם 3 הפלגות שוות באותה עונה. דפוסים מורכבים – רק דגל "שואלים רב". */
  function detectFixed(s, preset) {
    var n = s.length, out = { type: null, flags: [] };
    if (n >= 3) {
      var a = s[n - 3], b = s[n - 2], c = s[n - 1];
      var da = new H.HDate(a.abs).getDate(), db = new H.HDate(b.abs).getDate(), dc = new H.HDate(c.abs).getDate();
      var consecutiveMonths = nextMonthSameDay(a.abs, preset).abs === b.abs && nextMonthSameDay(b.abs, preset).abs === c.abs;
      if (da === db && db === dc && a.onah === b.onah && b.onah === c.onah && consecutiveMonths)
        out.type = { kind: 'chodesh', day: dc, onah: c.onah };
    }
    if (!out.type && n >= 4) {
      var w = s.slice(n - 4), l1 = haflagaLen(w[0], w[1], preset), l2 = haflagaLen(w[1], w[2], preset), l3 = haflagaLen(w[2], w[3], preset);
      if (l1 === l2 && l2 === l3 && w[1].onah === w[2].onah && w[2].onah === w[3].onah)
        out.type = { kind: 'haflaga', len: l3, onah: w[3].onah };
    }
    // דילוג (הפלגות עולות בקבועות) – רק התראה
    if (!out.type && n >= 4) {
      var x = s.slice(n - 4), d1 = haflagaLen(x[0], x[1], preset), d2 = haflagaLen(x[1], x[2], preset), d3 = haflagaLen(x[2], x[3], preset);
      if (d2 - d1 === d3 - d2 && d2 !== d1) out.flags.push('dilug');
      var m1 = new H.HDate(x[1].abs).getDate() - new H.HDate(x[0].abs).getDate();
      var m2 = new H.HDate(x[2].abs).getDate() - new H.HDate(x[1].abs).getDate();
      var m3 = new H.HDate(x[3].abs).getDate() - new H.HDate(x[2].abs).getDate();
      if (m1 && m1 === m2 && m2 === m3) out.flags.push('dilug_chodesh');
    }
    if (n >= 3) {
      var dw = s.slice(n - 3).map(function (q) { return new H.HDate(q.abs).getDay(); });
      if (dw[0] === dw[1] && dw[1] === dw[2] && !out.type) out.flags.push('shavua');
    }
    return out;
  }

  /* ---------- החישוב הראשי ----------
     sightings: [{abs, onah}] (לא חייב להיות ממוין). preset: אובייקט שיטה (ראו PRESETS).
     מחזיר {onot:[...], fixed, flags, needRav:[...]} – כל עונה עם type, abs, onah, why, rule. */
  function compute(sightings, preset, state) {
    state = state || {};
    var s = sightings.slice().sort(function (a, b) { return idxOf(a.abs, a.onah) - idxOf(b.abs, b.onah); });
    var res = { onot: [], fixed: null, flags: [], needRav: [] };
    if (!s.length) return res;
    if (state.pregnant || state.nursing || state.menopause || state.pill) res.needRav.push('special_state');
    var last = s[s.length - 1];
    var fx = detectFixed(s, preset);
    res.fixed = fx.type; res.flags = fx.flags;
    fx.flags.forEach(function (f) { res.needRav.push(f); });
    if (last.doubt) res.needRav.push('doubt_time');

    function add(type, abs, onah, why, rule, extra) {
      if (abs == null) return;
      var o = describe(abs, onah); o.type = type; o.why = why; o.rule = rule;
      if (extra) for (var k in extra) o[k] = extra[k];
      res.onot.push(o);
    }

    if (fx.type && fx.type.kind === 'chodesh') {
      var nm = nextMonthSameDay(last.abs, preset);
      add('kavua_chodesh', nm.abs, fx.type.onah, 'וסת קבוע לחודש – ' + fx.type.day + ' בחודש', 'kavua');
    } else if (fx.type && fx.type.kind === 'haflaga') {
      var t = haflagaTarget(last, fx.type.len, preset);
      add('kavua_haflaga', t.abs, t.onah, 'וסת קבוע להפלגה של ' + fx.type.len + ' ימים', 'kavua');
    } else {
      // עונה בינונית: יום ה-30 כשיום הראייה נחשב יום 1
      var b = last.abs + 29;
      add('beinonit', b, last.onah, 'יום 30 מהראייה (יום הראייה הוא יום 1)', 'beinonit');
      if (preset.beinonit === '24h' || preset.beinonit === '24h+31')
        add('beinonit', b, last.onah === 'day' ? 'night' : 'day', 'עונה בינונית – גם העונה השנייה של יום 30', 'beinonit_24h');
      if (preset.beinonit === '31' || preset.beinonit === '24h+31')
        add('beinonit', b + 1, last.onah, 'יום 31 – לשיטה שחוששים גם לו', 'beinonit_31');
      // וסת החודש
      var ch = nextMonthSameDay(last.abs, preset);
      if (ch.edge) res.needRav.push(ch.edge);
      add('chodesh', ch.abs, last.onah, 'אותו תאריך עברי בחודש הבא', 'chodesh', ch.edge ? { edge: ch.edge } : null);
      // הפלגה
      if (s.length >= 2) {
        var prev = s[s.length - 2], len = haflagaLen(prev, last, preset), ht = haflagaTarget(last, len, preset);
        add('haflaga', ht.abs, ht.onah, 'הפלגה של ' + len + (preset.haflagaBy === 'onot' ? ' עונות' : ' ימים') + ' כמו בין שתי הראיות האחרונות', 'haflaga', { len: len });
        // הפלגות שלא נעקרו
        if (preset.oldHaflagot) {
          for (var i = s.length - 2; i >= 1; i--) {
            var L = haflagaLen(s[i - 1], s[i], preset);
            if (L <= len) continue;
            // נעקרה אם אחריה עברה הפלגה ארוכה ממנה בלי ראייה? – לפי preset.oldHaflagotRule; ברירת מחדל: לא נעקרה כל עוד לא הייתה הפלגה ארוכה ממנה אחריה
            var uprooted = false;
            for (var j = i + 1; j < s.length; j++) if (haflagaLen(s[j - 1], s[j], preset) >= L) { uprooted = true; break; }
            if (!uprooted) {
              var ot = haflagaTarget(last, L, preset);
              add('haflaga_old', ot.abs, ot.onah, 'הפלגה קודמת של ' + L + ' שעוד לא נעקרה', 'old_haflaga', { len: L });
            }
          }
        }
      }
    }
    // אור זרוע: העונה שלפני כל עונה
    if (preset.orZarua) {
      res.onot.slice().forEach(function (o) {
        if (o.rule === 'beinonit_24h' || o.rule === 'beinonit_31') return;
        var p = fromIdx(idxOf(o.abs, o.onah) - 1);
        add('or_zarua', p.abs, p.onah, 'אור זרוע – העונה שלפני ' + LABEL[o.type], 'or_zarua', { of: o.type });
      });
    }
    res.onot.sort(function (a, b) { return idxOf(a.abs, a.onah) - idxOf(b.abs, b.onah); });
    return res;
  }

  var LABEL = {
    beinonit: 'עונה בינונית', chodesh: 'וסת החודש', haflaga: 'וסת ההפלגה', haflaga_old: 'הפלגה שלא נעקרה',
    or_zarua: 'עונת אור זרוע', kavua_chodesh: 'וסת קבוע', kavua_haflaga: 'וסת קבוע'
  };

  /* ---------- ליל טבילה ----------
     startAbs = יום תחילת הראייה. preset.minDays = מספר הימים המינימלי (כולל יום הראייה) לפני הפסק.
     hefsekAbs (רשות) = היום שבו נעשה הפסק בפועל. מחזיר תאריכים + התראות. */
  function mikveh(startAbs, preset, hefsekAbs) {
    var minDays = preset.minDays || 5;
    var earliest = startAbs + minDays - 1;
    var hef = hefsekAbs != null ? Math.max(hefsekAbs, earliest) : earliest;
    var cleanFirst = hef + 1, cleanLast = hef + 7, tevilaAbs = hef + 8; // הלילה של יום abs הוא ליל הטבילה
    var alerts = [];
    var tev = new H.HDate(tevilaAbs), dow = tev.getDay();
    if (dow === 6) alerts.push('leil_shabbat');
    if (dow === 0) alerts.push('motzei_shabbat');
    var hol = (H.HebrewCalendar.getHolidaysOnDate(tev, true) || []);
    hol.forEach(function (ev) {
      var d = ev.getDesc();
      if (d === 'Yom Kippur') alerts.push('yom_kippur');
      else if (d === "Tish'a B'Av") alerts.push('tisha_bav');
      else if (ev.getFlags() & H.flags.CHAG) alerts.push('yom_tov');
    });
    return {
      earliestHefsek: describe(earliest, 'day'),
      hefsek: describe(hef, 'day'),
      cleanFirst: describe(cleanFirst, 'day'),
      cleanLast: describe(cleanLast, 'day'),
      tevila: describe(tevilaAbs, 'night'),
      hefsekLate: hefsekAbs != null && hefsekAbs > earliest,
      alerts: alerts
    };
  }

  return {
    idxOf: idxOf, fromIdx: fromIdx, ymd: ymd, absFromYmd: absFromYmd, onahFromClock: onahFromClock, describe: describe,
    nextMonthSameDay: nextMonthSameDay, haflagaLen: haflagaLen, detectFixed: detectFixed,
    compute: compute, mikveh: mikveh, LABEL: LABEL
  };
}));
