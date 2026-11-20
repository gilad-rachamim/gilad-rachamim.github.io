/* מודול החישוב של כלי טהרת המשפחה – חישוב טהור, בלי DOM ובלי שרת. הרעיון באדיבות אהרן גרינברג.
   כל כלל כאן מתועד עם מקור ב-docs/tahara-rules.md (מספרי הסעיפים בהערות). הנתונים האישיים לא יוצאים מהמכשיר.
   עובד בדפדפן (window.TaharaCore) וב-node (module.exports = factory) – מקבל את @hebcal/core מבחוץ.
   עיקרון: מה שלא נמצא לו מקור כתוב לא מחושב בשקט – מסומן "שואלים רב" (needRav). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else root.TaharaCore = factory(root.hebcal);
}(typeof self !== 'undefined' ? self : this, function (H) {
  'use strict';
  if (!H || !H.HDate) throw new Error('hebcal חסר');

  /* ---------- שיטות (ז) ----------
     beinonit: 'onah' (יום ל', העונה בלבד) | '24h' (מעת לעת של יום ל') | '31' (יום ל' + יום ל"א)
     orZarua: false | true | 'recommended'
     haflagaFrom: 'start' | 'end' (חב"ד – מסוף הראייה, ב13)
     oldHaflagot: true (מציג) | 'ask' (מציג לחומרה + שואלים רב)
     minDays: ימי המתנה לפני הפסק טהרה, כולל יום הראייה (ה). unverified: מה שלא אומת בשיטה – מוצג כ"שואלים רב". */
  var PRESETS = {
    sephardi_ovadia: {
      id: 'sephardi_ovadia', name: 'ספרדים – לפי הרב עובדיה יוסף',
      beinonit: 'onah', orZarua: false, haflagaFrom: 'start', oldHaflagot: 'ask', minDays: 4, chodesh30: 'ask',
      sources: { beinonit: 'טהרת הבית עמ\' 77–80 (מקור משני)', minDays: 'טהרת הבית ח"ב יג:יב (מקור משני)', orZarua: 'טהרת הבית ח"ב פ"א (מקור משני)' },
      unverified: ['old_haflagot']
    },
    morocco: {
      id: 'morocco', name: 'מרוקו (כמו ספרדים, עם הערות)',
      beinonit: 'onah', orZarua: false, haflagaFrom: 'start', oldHaflagot: 'ask', minDays: 4, chodesh30: 'ask',
      notes: ['לא נמצא הבדל מתועד בין מנהג מרוקו לספרדים בחישוב העונות; בשאלות של ימי ההמתנה ושל ליל שבת – לשאול את הרב.'],
      unverified: ['old_haflagot', 'min_days', 'leil_shabbat']
    },
    ben_ish_chai: {
      id: 'ben_ish_chai', name: 'בן איש חי / הרב מרדכי אליהו',
      beinonit: 'onah', orZarua: 'recommended', haflagaFrom: 'start', oldHaflagot: 'ask', minDays: 5, chodesh30: 'ask',
      sources: { beinonit: 'דרכי טהרה ז:ז (מקור משני)', orZarua: 'דרכי טהרה ו:יא – "ראוי להחמיר" (מקור משני)' },
      unverified: ['old_haflagot', 'min_days']
    },
    ashkenaz: {
      id: 'ashkenaz', name: 'אשכנז – שו"ע ורמ"א, ש"ך וחכמת אדם',
      beinonit: '31', orZarua: true, haflagaFrom: 'start', oldHaflagot: true, minDays: 5, chodesh30: 'ask',
      sources: { beinonit: 'ש"ך קפט ס"ק ל; חכמת אדם קיב:ה', orZarua: 'ש"ך קפד ס"ק ז', minDays: 'רמ"א קצו:יא', oldHaflagot: 'רמ"א קפט:יג; חכמת אדם קיב:כ' },
      unverified: []
    },
    chabad: {
      id: 'chabad', name: 'חב"ד – שולחן ערוך הרב',
      beinonit: '24h', orZarua: false, haflagaFrom: 'end', oldHaflagot: 'ask', minDays: 5, chodesh30: 'ask',
      sources: { beinonit: 'שו"ע הרב קפט', haflaga: 'שו"ע הרב קפט – מסוף הראייה' },
      unverified: ['or_zarua', 'min_days', 'old_haflagot', 'chabad_onot']
    }
  };
  // "הרב שלי אמר אחרת" – מתחילים מאחת השיטות ומשנים מתגים
  function customPreset(base, over) {
    var p = {}, b = PRESETS[base] || PRESETS.sephardi_ovadia, k;
    for (k in b) p[k] = b[k];
    for (k in (over || {})) p[k] = over[k];
    p.id = 'custom'; p.base = b.id; p.name = 'לפי הוראת הרב שלי (על בסיס ' + b.name + ')';
    p.unverified = [];
    return p;
  }

  /* ---------- עונות: מספור רציף ----------
     כל יום עברי (abs של hebcal) מתחיל בלילה ואחריו היום. idx = abs*2 (לילה) או abs*2+1 (יום). */
  function idxOf(abs, onah) { return abs * 2 + (onah === 'day' ? 1 : 0); }
  function fromIdx(idx) { var abs = Math.floor(idx / 2); return { abs: abs, onah: idx % 2 ? 'day' : 'night' }; }

  /* שעון ← עונה (א1–א6). geo = {lat,lng,elev?,tz?}. near = קרוב לשקיעה/הנץ – הממשק שואל "לפני/אחרי/ביניהם". */
  function onahFromClock(y, m, d, time, geo, opts) {
    opts = opts || {};
    var hm = String(time || '12:00').split(':'), hh = +hm[0], mm = +(hm[1] || 0);
    var civil = new Date(y, m - 1, d, 12, 0, 0);
    var gl = new H.GeoLocation('', geo.lat, geo.lng, geo.elev || 0, geo.tz || 'Asia/Jerusalem');
    var z = new H.Zmanim(gl, civil, false);
    var t = new Date(y, m - 1, d, hh, mm, 0).getTime();
    var rise = z.sunrise().getTime(), set = z.sunset().getTime(), tz = z.tzeit().getTime();
    var abs = new H.HDate(civil).abs(), onah;
    if (t < rise) onah = 'night';
    else if (t < set) onah = 'day';
    else { onah = 'night'; abs += 1; }
    var w = (opts.doubtMinutes == null ? 20 : opts.doubtMinutes) * 60000;
    var near = null;
    if (t >= set - w && t <= tz) near = 'sunset';
    else if (Math.abs(t - rise) <= w) near = 'sunrise';
    return { abs: abs, onah: onah, near: near, sunrise: new Date(rise), sunset: new Date(set), tzeit: new Date(tz) };
  }

  /* ---------- תצוגת תאריך ---------- */
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(g) { return g.getFullYear() + '-' + p2(g.getMonth() + 1) + '-' + p2(g.getDate()); }
  function absFromYmd(s) { var a = s.split('-'); return new H.HDate(new Date(+a[0], +a[1] - 1, +a[2], 12)).abs(); }
  var DOW = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  function describe(abs, onah) {
    var hd = new H.HDate(abs), g = hd.greg();
    // עונת לילה של יום עברי abs מתחילה בערב היום הלועזי הקודם
    var eve = onah === 'night' ? new H.HDate(abs - 1).greg() : null;
    return {
      abs: abs, onah: onah,
      hebrew: hd.renderGematriya(true),
      greg: g, gregEve: eve, ymd: ymd(g), ymdEve: eve ? ymd(eve) : null,
      dow: hd.getDay(), dowEve: eve ? eve.getDay() : null
    };
  }
  function isAdar1(abs) { var hd = new H.HDate(abs); return H.HDate.isLeapYear(hd.getFullYear()) && hd.getMonth() === H.months.ADAR_I; }

  /* ---------- וסת החודש (ב1–ב10) ----------
     אותו יום בחודש העברי הבא. יום ל' כשהחודש הבא חסר (ב9) – אין תאריך מקביל:
     'ask' (ברירת מחדל) = שני התאריכים (כ"ט ו-א' שאחריו) כספק + שואלים רב. */
  function nextMonthSameDay(abs, preset) {
    var hd = new H.HDate(abs), day = hd.getDate();
    var first = new H.HDate(1, hd.getMonth(), hd.getFullYear());
    var nextFirst = first.abs() + hd.daysInMonth();
    var dim = new H.HDate(nextFirst).daysInMonth();
    if (day <= dim) return { abs: nextFirst + day - 1, list: [nextFirst + day - 1], edge: null };
    var mode = (preset && preset.chodesh30) || 'ask';
    if (mode === 'rosh_chodesh') return { abs: nextFirst + dim, list: [nextFirst + dim], edge: 'chodesh30_rc' };
    if (mode === 'none') return { abs: null, list: [], edge: 'chodesh30_none' };
    return { abs: null, list: [nextFirst + dim - 1, nextFirst + dim], edge: 'chodesh30_ask' };
  }

  /* ---------- הפלגה (ב11–ב18) ----------
     בימים, כשסופרים את שני ימי הראייה: הפלגה = b − a + 1. היעד = ראייה אחרונה + הפלגה − 1, באותה עונה.
     חב"ד (ב13): מסוף הראייה הקודמת עד תחילת הבאה (הפרש ימים), והיעד = סוף הראייה האחרונה + ההפרש. */
  function endAbs(s) { return s.endAbs != null ? s.endAbs : s.abs; }
  function haflagaLen(a, b, preset) {
    if (preset && preset.haflagaFrom === 'end') return b.abs - endAbs(a);
    return b.abs - a.abs + 1;
  }
  function haflagaTarget(last, len, preset) {
    if (preset && preset.haflagaFrom === 'end') return { abs: endAbs(last) + len, onah: last.onah };
    return { abs: last.abs + len - 1, onah: last.onah };
  }

  /* ---------- וסת קבוע (ג1–ג9) ----------
     חודש: 3 ראיות בחודשים רצופים באותו יום ובאותה עונה. הפלגה: 4 ראיות, 3 הפלגות שוות, באותה עונה (ג2).
     דילוג ושבוע – רק זיהוי + שואלים רב (ג9). */
  function detectFixed(s, preset) {
    var n = s.length, out = { type: null, flags: [] };
    if (n >= 3) {
      var a = s[n - 3], b = s[n - 2], c = s[n - 1];
      var da = new H.HDate(a.abs).getDate(), db = new H.HDate(b.abs).getDate(), dc = new H.HDate(c.abs).getDate();
      var consecutive = nextMonthSameDay(a.abs, preset).abs === b.abs && nextMonthSameDay(b.abs, preset).abs === c.abs;
      if (da === db && db === dc && a.onah === b.onah && b.onah === c.onah && consecutive)
        out.type = { kind: 'chodesh', day: dc, onah: c.onah };
    }
    if (!out.type && n >= 4) {
      var w = s.slice(n - 4), l1 = haflagaLen(w[0], w[1], preset), l2 = haflagaLen(w[1], w[2], preset), l3 = haflagaLen(w[2], w[3], preset);
      if (l1 === l2 && l2 === l3 && w[1].onah === w[2].onah && w[2].onah === w[3].onah)
        out.type = { kind: 'haflaga', len: l3, onah: w[3].onah };
    }
    if (!out.type && n >= 4) {
      var x = s.slice(n - 4), d1 = haflagaLen(x[0], x[1], preset), d2 = haflagaLen(x[1], x[2], preset), d3 = haflagaLen(x[2], x[3], preset);
      if (d2 - d1 === d3 - d2 && d2 !== d1) out.flags.push('dilug');
      var m1 = new H.HDate(x[1].abs).getDate() - new H.HDate(x[0].abs).getDate();
      var m2 = new H.HDate(x[2].abs).getDate() - new H.HDate(x[1].abs).getDate();
      var m3 = new H.HDate(x[3].abs).getDate() - new H.HDate(x[2].abs).getDate();
      if (m1 && m1 === m2 && m2 === m3) out.flags.push('dilug_chodesh');
    }
    if (n >= 3 && !out.type) {
      var dw = s.slice(n - 3).map(function (q) { return new H.HDate(q.abs).getDay(); });
      if (dw[0] === dw[1] && dw[1] === dw[2]) out.flags.push('shavua');
    }
    return out;
  }

  /* ---------- החישוב הראשי ----------
     sightings: [{abs, onah, endAbs?, afterNetzMin?, doubt?, missed?}]. missed=true = "עברה העונה בלי ראייה" (ג4).
     state: {pregnant, nursing, menopause, pill}. מחזיר {onot, fixed, flags, needRav, uprooted}. */
  function compute(sightings, preset, state) {
    preset = preset || PRESETS.sephardi_ovadia; state = state || {};
    var all = sightings.slice().sort(function (a, b) { return idxOf(a.abs, a.onah) - idxOf(b.abs, b.onah); });
    var s = all.filter(function (q) { return !q.missed; });
    var missed = all.filter(function (q) { return q.missed; });
    var res = { onot: [], fixed: null, flags: [], needRav: [], uprooted: false, preset: preset.id, unverified: (preset.unverified || []).slice() };
    function rav(x) { if (res.needRav.indexOf(x) < 0) res.needRav.push(x); }
    // הריון שהוכר (ד1, ex30): הכלי לא מחשב עונות – שואלים רב
    if (state.pregnant) { rav('pregnant'); return res; }
    if (state.nursing || state.menopause || state.pill) rav('special_state');
    if (!s.length) return res;
    var last = s[s.length - 1], lastIdx = idxOf(last.abs, last.onah);
    var fx = detectFixed(s, preset);
    res.fixed = fx.type; res.flags = fx.flags;
    fx.flags.forEach(rav);
    if (last.doubt) rav('doubt_time');
    if (isAdar1(last.abs)) rav('adar1');
    if (preset.haflagaFrom === 'end' && s.length >= 2 && s[s.length - 2].endAbs == null) rav('flow_end_missing');

    function add(type, abs, onah, why, rule, extra) {
      if (abs == null) return;
      var o = describe(abs, onah); o.type = type; o.why = why; o.rule = rule;
      if (extra) for (var k in extra) o[k] = extra[k];
      res.onot.push(o);
    }
    function addChodesh(fromAbs, onah, why, type, extra) {
      var ch = nextMonthSameDay(fromAbs, preset);
      if (ch.edge) rav(ch.edge);
      ch.list.forEach(function (a) {
        var ex = {}; for (var k in (extra || {})) ex[k] = extra[k];
        if (ch.edge) { ex.edge = ch.edge; ex.doubt = true; }
        add(type || 'chodesh', a, onah, ch.edge ? why + ' – יום ל\' והחודש הבא חסר: ספק, שואלים רב' : why, 'chodesh', ex);
      });
      return ch;
    }

    if (fx.type && fx.type.kind === 'chodesh') {
      // וסת קבוע נעקר רק בג' פעמים (ג4, ex22): מדלגים על חודשים שעברו בלי ראייה
      var cur = last.abs, misses = 0;
      for (;;) {
        var nx = nextMonthSameDay(cur, preset).abs;
        if (nx == null) break;
        var m = missed.filter(function (q) { return q.abs === nx; });
        if (!m.length) { cur = nx; break; }
        misses++; cur = nx;
        if (misses >= 3) break;
      }
      if (misses >= 3) { res.uprooted = true; rav('kavua_uprooted'); }
      else add('chodesh_kavua', cur, fx.type.onah, 'וסת קבוע לחודש – ' + fx.type.day + ' בכל חודש' + (misses ? ' (עדיין חוששת – נעקר רק אחרי 3 פעמים)' : ''), 'kavua', { misses: misses });
    } else if (fx.type && fx.type.kind === 'haflaga') {
      var t = haflagaTarget(last, fx.type.len, preset), hm = 0;
      while (missed.some(function (q) { return q.abs === t.abs; }) && hm < 3) { hm++; t = { abs: t.abs + fx.type.len - 1, onah: t.onah }; }
      if (hm >= 3) { res.uprooted = true; rav('kavua_uprooted'); }
      else add('haflaga_kavua', t.abs, t.onah, 'וסת קבוע להפלגה של ' + fx.type.len + ' ימים', 'kavua', { interval: fx.type.len });
    } else {
      // עונה בינונית (ב1–ב4): יום ל' כשיום הראייה הוא יום 1
      var b = last.abs + 29;
      add('beinonit', b, last.onah, 'יום ל\' מהראייה (יום הראייה הוא יום 1)', 'beinonit');
      if (preset.beinonit === '24h')
        add('beinonit', b, last.onah === 'day' ? 'night' : 'day', 'עונה בינונית מעת לעת – גם העונה השנייה של יום ל\'', 'beinonit_24h');
      if (preset.beinonit === '31')
        add('beinonit_31', b + 1, last.onah, 'יום ל"א – לשיטת הש"ך וחכמת אדם', 'beinonit_31');
      // וסת החודש מהראייה האחרונה
      var chL = addChodesh(last.abs, last.onah, 'אותו תאריך עברי בחודש הבא', 'chodesh');
      // ראייה שנמשכה אחרי הנץ (א4, ex24): גם היום – רק כשיעור הזמן
      if (last.onah === 'night' && last.afterNetzMin) {
        rav('partial_day');
        chL.list.forEach(function (a) { add('chodesh_partial', a, 'day', 'הראייה נמשכה ' + last.afterNetzMin + ' דקות אחרי הנץ – חוששת ביום רק עד אז', 'chodesh', { untilNetzPlusMin: last.afterNetzMin }); });
      }
      // וסת החודש של ראיות קודמות שעוד לא הגיע (ב15, ex04–ex05)
      for (var i = 0; i < s.length - 1; i++) {
        var nm = nextMonthSameDay(s[i].abs, preset);
        nm.list.forEach(function (a) {
          if (idxOf(a, s[i].onah) > lastIdx && !(a === chL.abs && s[i].onah === last.onah))
            add('chodesh', a, s[i].onah, 'וסת החודש של הראייה הקודמת – עוד לא הגיע ולא נעקר', 'chodesh', { from: 'prev' });
        });
      }
      // הפלגה
      if (s.length >= 2) {
        var prev = s[s.length - 2], len = haflagaLen(prev, last, preset), ht = haflagaTarget(last, len, preset);
        add('haflaga', ht.abs, ht.onah, preset.haflagaFrom === 'end'
          ? 'הפלגה של ' + len + ' ימים מסוף הראייה הקודמת – נספרת מסוף הראייה האחרונה (שו"ע הרב)'
          : 'הפלגה של ' + len + ' ימים כמו בין שתי הראיות האחרונות', 'haflaga', { interval: len });
        // הפלגות קודמות שלא נעקרו (ב15–ב18)
        for (var j = 1; j < s.length - 1; j++) {
          var L = haflagaLen(s[j - 1], s[j], preset), ot = haflagaTarget(s[j], L, preset);
          if (idxOf(ot.abs, ot.onah) <= lastIdx || L === len) continue;
          if (preset.oldHaflagot === 'ask') rav('old_haflagot');
          add('haflaga_not_uprooted', ot.abs, ot.onah, 'הפלגה קודמת של ' + L + ' ימים שעוד לא נעקרה' +
            (preset.oldHaflagot === true ? ' (רמ"א קפט:יג; לש"ך – נעקרה)' : ' – לחומרה, שואלים רב'), 'old_haflaga', { interval: L, doubt: preset.oldHaflagot !== true });
        }
      }
      // וסת שאינו קבוע נעקר בפעם אחת (ג4, ex21): עונה שעברה בלי ראייה יוצאת
      if (missed.length) {
        var mIdx = Math.max.apply(null, missed.map(function (q) { return idxOf(q.abs, q.onah); }));
        res.onot = res.onot.filter(function (o) { return idxOf(o.abs, o.onah) > mIdx; });
      }
    }
    // אור זרוע (ז): העונה שלפני – לא לעונות הנוספות (24 שעות / יום ל"א)
    if (preset.orZarua) {
      res.onot.slice().forEach(function (o) {
        if (o.rule === 'beinonit_24h' || o.rule === 'beinonit_31' || o.type === 'chodesh_partial') return;
        var p = fromIdx(idxOf(o.abs, o.onah) - 1);
        add('or_zarua', p.abs, p.onah, 'אור זרוע – העונה שלפני ' + LABEL[o.type] + (preset.orZarua === 'recommended' ? ' (ראוי להחמיר)' : ''), 'or_zarua', { of: o.type, recommended: preset.orZarua === 'recommended' });
      });
    }
    res.onot.sort(function (a, b) { return idxOf(a.abs, a.onah) - idxOf(b.abs, b.onah); });
    return res;
  }

  var LABEL = {
    beinonit: 'עונה בינונית', beinonit_31: 'יום ל"א', chodesh: 'וסת החודש', chodesh_partial: 'וסת החודש (חלק מהיום)',
    haflaga: 'וסת ההפלגה', haflaga_not_uprooted: 'הפלגה שלא נעקרה', or_zarua: 'עונת אור זרוע',
    chodesh_kavua: 'וסת קבוע לחודש', haflaga_kavua: 'וסת קבוע להפלגה'
  };
  var RAV = {
    special_state: 'מניקה / אחרי גיל המעבר / גלולות – הדין משתנה',
    pregnant: 'הריון שהוכר – הכלי לא מחשב עונות; החזרה לחשבון אחרי הלידה וההנקה – לשאול רב',
    doubt_time: 'הראייה הייתה קרוב לשקיעה או לנץ',
    adar1: 'ראייה באדר א\' – הכלי חישב לאדר ב\'; לאמת עם הרב',
    flow_end_missing: 'לשיטת חב"ד ההפלגה נספרת מסוף הראייה – חסר תאריך הסיום',
    chodesh30_ask: 'ראייה ביום ל\' והחודש הבא חסר – אין תאריך מקביל',
    chodesh30_rc: 'ראייה ביום ל\' והחודש הבא חסר', chodesh30_none: 'ראייה ביום ל\' והחודש הבא חסר',
    old_haflagot: 'הפלגות קודמות שלא נעקרו – בשיטה הזאת לא נמצא מקור; מוצג לחומרה',
    partial_day: 'ראייה שנמשכה אחרי הנץ – הדין נאמר בווסת קבוע',
    dilug: 'הפלגות בדילוג', dilug_chodesh: 'ימי חודש בדילוג', shavua: 'ראיות באותו יום בשבוע',
    kavua_uprooted: 'וסת קבוע שעבר 3 פעמים בלי ראייה',
    min_days: 'מספר ימי ההמתנה לפני ההפסק לא אומת בשיטה הזאת', or_zarua: 'אור זרוע לא אומת בשיטה הזאת',
    leil_shabbat: 'טבילה בליל שבת לא נבדקה בשיטה הזאת', chabad_onot: 'בלוח חב"ד ברשת ההפלגה נספרת בעונות – סתירה',
    hefsek_yom_tov: 'ההפסק נופל ביום טוב', yom_tov: 'ליל הטבילה בליל יום טוב', motzei_shabbat: 'ליל הטבילה במוצאי שבת – ההכנות'
  };

  /* ---------- ליל טבילה (ה, ו) ----------
     startAbs = יום תחילת הראייה (יום 1). minDays = ימי ההמתנה כולל יום הראייה (4 ספרדים, 5 אשכנז).
     hefsek = start + minDays − 1; נקיים = hef+1..hef+7; טבילה בליל hef+8, אחרי צאת הכוכבים.
     יום הכיפורים / תשעה באב – נדחית ללילה הבא (ו). */
  function holidayKinds(abs) {
    var out = [];
    (H.HebrewCalendar.getHolidaysOnDate(new H.HDate(abs), true) || []).forEach(function (ev) {
      var d = ev.getDesc(), f = ev.getFlags();
      if (d === 'Yom Kippur') out.push('yom_kippur');
      else if (/^Tish'a B'Av/.test(d)) out.push('tisha_bav');
      else if (f & H.flags.CHAG) out.push('yom_tov');
    });
    return out;
  }
  function mikveh(startAbs, preset, hefsekAbs) {
    preset = preset || PRESETS.sephardi_ovadia;
    var minDays = preset.minDays || 5;
    var earliest = startAbs + minDays - 1;
    var hef = hefsekAbs != null ? Math.max(hefsekAbs, earliest) : earliest;
    var cleanFirst = hef + 1, cleanLast = hef + 7, tev = hef + 8, original = null;
    var alerts = [];
    if (holidayKinds(hef).indexOf('yom_tov') >= 0) alerts.push('hefsek_yom_tov');
    if (new H.HDate(hef).getDay() === 6) alerts.push('hefsek_shabbat');
    for (var k = 0; k < 3; k++) {
      var hk = holidayKinds(tev);
      if (hk.indexOf('yom_kippur') >= 0 || hk.indexOf('tisha_bav') >= 0) {
        if (original == null) original = { day: describe(tev, 'night'), why: hk.indexOf('yom_kippur') >= 0 ? 'yom_kippur' : 'tisha_bav' };
        tev++;
      } else break;
    }
    if (original) alerts.push('postponed_' + original.why);
    var dow = new H.HDate(tev).getDay();
    if (dow === 6) alerts.push('leil_shabbat');
    if (dow === 0) alerts.push('motzei_shabbat');
    if (holidayKinds(tev).indexOf('yom_tov') >= 0) alerts.push('yom_tov');
    return {
      minDays: minDays,
      earliestHefsek: describe(earliest, 'day'),
      hefsek: describe(hef, 'day'),
      cleanFirst: describe(cleanFirst, 'day'),
      cleanLast: describe(cleanLast, 'day'),
      tevila: describe(tev, 'night'),
      postponedFrom: original ? original.day : null,
      hefsekLate: hefsekAbs != null && hefsekAbs > earliest,
      alerts: alerts
    };
  }

  /* ---------- טקסט לרב (ווטסאפ) – בלי שם ובלי פרטים מזהים ---------- */
  function ravText(sightings, preset, res) {
    var L = ['שאלה בהלכות טהרה (נשלח מהמחשבון באתר הכלים, בלי פרטים מזהים):', 'שיטה: ' + preset.name + '.'];
    sightings.filter(function (q) { return !q.missed; }).slice(-4).forEach(function (q) {
      var d = describe(q.abs, q.onah);
      L.push('ראייה: ' + d.hebrew + ' (' + (q.onah === 'day' ? 'ביום' : 'בלילה') + ')' + (q.doubt ? ' – קרוב לשקיעה/נץ' : ''));
    });
    (res.needRav || []).forEach(function (r) { if (RAV[r]) L.push('לשאלה: ' + RAV[r] + '.'); });
    L.push('מה הרב אומר?');
    return L.join('\n');
  }

  return {
    PRESETS: PRESETS, customPreset: customPreset,
    idxOf: idxOf, fromIdx: fromIdx, ymd: ymd, absFromYmd: absFromYmd, onahFromClock: onahFromClock, describe: describe, DOW: DOW,
    nextMonthSameDay: nextMonthSameDay, haflagaLen: haflagaLen, haflagaTarget: haflagaTarget, detectFixed: detectFixed,
    compute: compute, mikveh: mikveh, holidayKinds: holidayKinds, ravText: ravText, LABEL: LABEL, RAV: RAV
  };
}));
