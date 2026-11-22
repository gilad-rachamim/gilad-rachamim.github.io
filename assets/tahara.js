/* ממשק כלי טהרת המשפחה (/kodesh/tahara/...). הרעיון באדיבות אהרן גרינברג.
   החישוב כולו ב-assets/tahara-core.js (עם מקורות ב-docs/tahara-rules.md). כאן רק ממשק, שמירה ושיתוף.
   הנתונים נשמרים רק בטלפון (localStorage, ואפשר בהצפנה עם קוד). לא נשלח שום נתון אישי לשרת או לאנליטיקס.
   מצבים: <div data-th-app="vestot|tevila|luach|full">. */
(function () {
  'use strict';
  var KEY = 'kelim-tahara-v1';
  var C, H;
  var CITIES = [
    ['yerushalaim', 'ירושלים', 31.778, 35.235], ['tel-aviv', 'תל אביב', 32.08, 34.78], ['haifa', 'חיפה', 32.79, 34.99],
    ['beer-sheva', 'באר שבע', 31.25, 34.79], ['bnei-brak', 'בני ברק', 32.084, 34.834], ['beit-shemesh', 'בית שמש', 31.747, 34.988],
    ['netanya', 'נתניה', 32.32, 34.85], ['ashdod', 'אשדוד', 31.8, 34.65], ['modiin-ilit', 'מודיעין עילית', 31.932, 35.044],
    ['elad', 'אלעד', 32.052, 34.951], ['tveria', 'טבריה', 32.79, 35.53], ['tzfat', 'צפת', 32.965, 35.496],
    ['kiryat-shmona', 'קריית שמונה', 33.2, 35.57], ['eilat', 'אילת', 29.557, 34.952]
  ];
  var DESC = {
    sephardi_ovadia: 'עונה בינונית ביום ל׳ בעונה שבה ראתה, בלי אור זרוע. הפסק טהרה ביום הרביעי.',
    morocco: 'כמו ספרדים בחישוב העונות. בשאלות שלא נמצא להן מקור מתועד – מסומן לשאול את הרב.',
    ben_ish_chai: 'עונה בינונית ביום ל׳, אור זרוע "ראוי להחמיר". הפסק ביום החמישי – לאמת עם הרב.',
    ashkenaz: 'יום ל׳ וגם וסת החודש (חכמת אדם), עם אור זרוע. הפסק טהרה ביום החמישי (רמ"א).',
    chabad: 'עונה בינונית מעת לעת – הלילה והיום של יום ל׳. ההפלגה נספרת מסוף הראייה.'
  };
  var SRC = {
    beinonit: 'שו"ע יו"ד קפט:א; חכמת אדם קיב:ה', beinonit_24h: 'שו"ע הרב, סימן קפט',
    chodesh: 'שו"ע יו"ד קפט:ב, ו; חכמת אדם קיב:ו',
    haflaga: 'שו"ע יו"ד קפט:ב; חכמת אדם קיב:ז', old_haflaga: 'רמ"א יו"ד קפט:יג; חכמת אדם קיב:כ',
    kavua: 'שו"ע יו"ד קפט:ב, ו; עקירה – קפט:ב', or_zarua: 'ש"ך יו"ד קפד ס"ק ז'
  };
  var ALERT = {
    hefsek_yom_tov: 'יום ההפסק הוא יום טוב. לא נמצא מקור שנבדק לחישוב – שואלים רב.',
    hefsek_shabbat: 'יום ההפסק הוא שבת – כדאי לברר עם הרב מראש מה מכינים לפני שבת.',
    leil_shabbat: 'ליל הטבילה הוא ליל שבת. לפי הרמ"א מותר לטבול כשלא יכלה לטבול קודם; אם יכלה לטבול קודם – יש מקומות שנהגו לאסור (רמ"א יו"ד קצז:ב). בודקים עם הרב ועם המקווה.',
    motzei_shabbat: 'ליל הטבילה הוא מוצאי שבת. לפי הרמ"א, במקום שנהגו להחמיר בליל שבת (כשיכלה לטבול קודם) – גם במוצאי שבת לא טובלת (רמ"א יו"ד קצז:ב). בודקים עם הרב, וגם את ההכנות.',
    yom_tov: 'ליל הטבילה הוא ליל יום טוב. לא נמצא מקור שנבדק – שואלים רב.',
    postponed_yom_kippur: 'הלילה המקורי הוא ליל יום הכיפורים – אסור לטבול בו (שו"ע או"ח תריג:יב). הטבילה נדחית ללילה שאחריו.',
    postponed_tisha_bav: 'הלילה המקורי הוא ליל תשעה באב – לא טובלים בו (שו"ע או"ח תקנד:ח). הטבילה נדחית ללילה שאחריו.'
  };
  var EXTRA_RAV = {
    guf: 'וסת הגוף (סימנים בגוף) או וסת על ידי אכילה או מאמץ – הכלי לא מחשב',
    tashmish: 'דם מחמת תשמיש – שואלים רב מיד'
  };

  /* ---------- כלים קטנים ---------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function gd(d) { return d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear(); }
  function bd(d) { return '<bdi dir="ltr">' + gd(d) + '</bdi>'; }
  function hm(d) { return '<bdi dir="ltr">' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + '</bdi>'; }
  function todayYmd() { return C.ymd(new Date()); }
  function absToday() { return C.absFromYmd(todayYmd()); }
  function city(id) { for (var i = 0; i < CITIES.length; i++) if (CITIES[i][0] === id) return CITIES[i]; return CITIES[0]; }
  function geo() { var c = city(S.city); return { lat: c[2], lng: c[3], elev: 0, tz: 'Asia/Jerusalem' }; }
  function zm(date) { var g = geo(); return new H.Zmanim(new H.GeoLocation('', g.lat, g.lng, 0, g.tz), date, false); }
  function when(abs, onah) {
    var d = C.describe(abs, onah);
    if (onah === 'day') return 'יום ' + C.DOW[d.dow] + ', ' + esc(d.hebrew) + ' (' + bd(d.greg) + ') – <b>ביום</b>, מהנץ עד השקיעה';
    return '<b>ליל</b> ' + esc(d.hebrew) + ' – מהשקיעה של יום ' + C.DOW[d.dowEve] + ' ' + bd(d.gregEve) + ' עד הנץ';
  }
  function heb(abs) { return esc(C.describe(abs, 'day').hebrew); }
  function dayLine(abs) { var d = C.describe(abs, 'day'); return 'יום ' + C.DOW[d.dow] + ', ' + esc(d.hebrew) + ' (' + bd(d.greg) + ')'; }
  function monthOf(hebrew) { var a = hebrew.split(' '); return a.slice(1, -1).join(' '); }

  /* ---------- סיכום: בינונית → חודש → הפלגה (לפי סדר העדיפות) ---------- */
  function sumHtml(r, p, title) {
    if (!r) return '';
    var ch = r.chodesh, h = '<div class="th-sum"><p class="th-k">' + title + '</p><p class="th-sum-from">' + when(r.last.abs, r.last.onah) + '</p><ol class="th-sumlist">';
    h += '<li><span class="th-n">1</span><div><b>עונה בינונית</b> – יום ל׳ מהראייה (יום הראייה הוא יום 1)<span class="th-when">' + when(r.beinonit.abs, r.beinonit.onah) + '</span></div></li>';
    var mName = monthOf(r.last.hebrew), chTxt;
    if (ch.edge) chTxt = 'הראייה ביום ל׳ והחודש הבא חסר – אין תאריך מקביל. מוצגים שני הימים כספק, ושואלים רב.';
    else if (r.sameDay) chTxt = 'חודש ' + esc(mName) + ' חסר (29 יום), ולכן עונת החודש נופלת <b>יחד עם העונה הבינונית</b>.';
    else chTxt = 'חודש ' + esc(mName) + ' מלא (30 יום), ולכן עונת החודש היא <b>יום אחרי</b> העונה הבינונית (יום ל״א מהראייה).';
    h += '<li><span class="th-n">2</span><div><b>עונת החודש</b> – אותו תאריך עברי בחודש הבא, באותה עונה' +
      ch.list.map(function (o) { return '<span class="th-when">' + when(o.abs, o.onah) + '</span>'; }).join('') + '<small>' + chTxt + '</small></div></li>';
    if (r.haflaga) h += '<li><span class="th-n">3</span><div><b>עונת ההפלגה</b> – ' + r.haflaga.len + ' ימים, כמו מ' + heb(r.haflaga.from.abs) + ' עד ' + heb(r.last.abs) +
      (p && p.haflagaFrom === 'end' ? ' (בשיטה הזאת – מסוף הראייה)' : ' (סופרים את שני ימי הראייה)') + '<span class="th-when">' + when(r.haflaga.abs, r.haflaga.onah) + '</span></div></li>';
    else h += '<li><span class="th-n">3</span><div><b>עונת ההפלגה</b> – <span class="th-sm">צריך גם את הראייה הקודמת כדי לדעת את המרווח. מוסיפים אותה.</span></div></li>';
    h += '</ol>';
    var notes = [];
    if (!p || p.beinonit !== '24h') notes.push('<b>הכרתי ופלתי</b> (תפארת ישראל) – בעונה בינונית חוששת לכל יום ל׳, כלומר גם ל' + when(r.notes.hakarti.abs, r.notes.hakarti.onah) +
      '. הב"ח והסדרי טהרה חולקים: רק העונה שבה ראתה. המחשבון לא מוסיף אותה.');
    if (!p || !p.orZarua) notes.push('<b>אור זרוע</b> – פרישה גם בעונה שלפני (סך הכול 24 שעות): ' + when(r.notes.orZarua.abs, r.notes.orZarua.onah) +
      '. מרן בבית יוסף: "חומרא יתירה"; הש"ך חושש לה. בשיטה שבחרת המחשבון לא מוסיף אותה.');
    else notes.push('<b>אור זרוע</b> – בשיטה שבחרת המחשבון מוסיף גם את העונה שלפני (ברשימה המלאה).');
    h += '<details class="th-sumnotes"><summary>הערות: הכרתי ופלתי ואור זרוע</summary>' + notes.map(function (n) { return '<p>' + n + '</p>'; }).join('') + '</details>';
    h += '<p class="th-note"><b>בדיקה בעונת הפרישה:</b> מספיק לבדוק פעם אחת במהלך העונה. יש נוהגים, לפי הרב מרדכי אליהו, לבדוק בתחילת העונה ובסופה. אם בדיעבד לא בדקה – אסורה לשמש עד שתבדוק. ואם רוצים לשמש אחרי העונה – פשוט בודקת לפני, ומותרת בשופי.</p>';
    h += '<p class="th-note">אלה הפרישות המקובלות. יש שכתבו שלדעת מרן, באשה שאין לה וסת קבוע די בעונה בינונית בלבד – אבל רוב הפוסקים היום חוששים גם לעונת החודש ולהפלגה. בכל שאלה – שואלים רב.</p></div>';
    return h;
  }
  function draftList(r) {
    var di = C.idxOf(r.abs, r.onah);
    var l = S.sightings.filter(function (q) { return !q.missed && C.idxOf(q.abs, q.onah) < di; });
    l.push({ abs: r.abs, onah: r.onah });
    return l;
  }
  function b64e(str) { return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function b64d(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return decodeURIComponent(escape(atob(s))); }
  function bytes2b64(u) { var s = ''; u = new Uint8Array(u); for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); }
  function b642bytes(s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  function download(name, text, type) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: type }));
    a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ---------- שמירה: ממשק אחד (גם לאפליקציה בהמשך) ---------- */
  var Store = {
    key: null, salt: null,
    raw: function () { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } },
    write: function (o) { try { localStorage.setItem(KEY, JSON.stringify(o)); return true; } catch (e) { return false; } },
    encrypted: function () { var r = this.raw(); return !!(r && r.enc); },
    derive: function (code, salt) {
      var enc = new TextEncoder();
      return crypto.subtle.importKey('raw', enc.encode(code), 'PBKDF2', false, ['deriveKey']).then(function (base) {
        return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: 200000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
      });
    },
    load: function () { var r = this.raw(); return r && !r.enc ? r : null; },
    unlock: function (code) {
      var r = this.raw(), self = this, salt = b642bytes(r.salt);
      return this.derive(code, salt).then(function (key) {
        return crypto.subtle.decrypt({ name: 'AES-GCM', iv: b642bytes(r.iv) }, key, b642bytes(r.data)).then(function (buf) {
          self.key = key; self.salt = salt; return JSON.parse(new TextDecoder().decode(buf));
        });
      }).catch(function () { return null; });
    },
    save: function (st) {
      if (!this.key) return Promise.resolve(this.write(st));
      var self = this, iv = crypto.getRandomValues(new Uint8Array(12));
      return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, this.key, new TextEncoder().encode(JSON.stringify(st))).then(function (ct) {
        return self.write({ enc: 1, v: 1, salt: bytes2b64(self.salt), iv: bytes2b64(iv), data: bytes2b64(ct) });
      });
    },
    setLock: function (code, st) {
      var self = this; this.salt = crypto.getRandomValues(new Uint8Array(16));
      return this.derive(code, this.salt).then(function (k) { self.key = k; return self.save(st); });
    },
    removeLock: function (st) { this.key = null; this.salt = null; return this.save(st); },
    clear: function () { try { localStorage.removeItem(KEY); } catch (e) {} this.key = null; this.salt = null; }
  };
  window.TaharaStore = Store;

  /* ---------- מצב ---------- */
  function blank() { return { v: 1, preset: null, custom: null, city: 'yerushalaim', sightings: [], status: {}, cycle: { start: null, hefsek: null } }; }
  var S = blank(), VIEW = false, MODE = 'full', ROOT = null, calY, calM;
  function preset() {
    if (!S.preset) return null;
    if (S.preset === 'custom') return C.customPreset((S.custom || {}).base || 'sephardi_ovadia', (S.custom || {}).over || {});
    return C.PRESETS[S.preset] || null;
  }
  function persist() { if (!VIEW) Store.save(S); }
  function sanitize(o) {
    var st = blank();
    if (!o || typeof o !== 'object') return st;
    if (o.preset === 'custom' || C.PRESETS[o.preset]) st.preset = o.preset;
    if (o.custom && typeof o.custom === 'object') st.custom = { base: C.PRESETS[o.custom.base] ? o.custom.base : 'sephardi_ovadia', over: o.custom.over || {} };
    if (city(o.city)[0] === o.city) st.city = o.city;
    (Array.isArray(o.sightings) ? o.sightings : []).forEach(function (q) {
      if (!q || typeof q.abs !== 'number' || (q.onah !== 'day' && q.onah !== 'night')) return;
      var x = { abs: Math.round(q.abs), onah: q.onah };
      if (q.doubt) x.doubt = true; if (q.missed) x.missed = true;
      if (typeof q.endAbs === 'number') x.endAbs = Math.round(q.endAbs);
      if (q.afterNetzMin > 0) x.afterNetzMin = Math.min(720, Math.round(q.afterNetzMin));
      st.sightings.push(x);
    });
    if (o.status && typeof o.status === 'object') ['pregnant', 'nursing', 'menopause', 'pill', 'guf', 'tashmish'].forEach(function (k) { if (o.status[k]) st.status[k] = true; });
    if (o.cycle) { if (typeof o.cycle.start === 'number') st.cycle.start = o.cycle.start; if (typeof o.cycle.hefsek === 'number') st.cycle.hefsek = o.cycle.hefsek; }
    return st;
  }
  function has(m) { return MODE === 'full' || m.indexOf(MODE) >= 0; }

  /* ---------- בניית הממשק ---------- */
  function shell() {
    var h = '';
    if (VIEW) h += '<div class="th-view" role="status"><b>זה לוח ששותף איתך בקישור.</b> הוא לא נשמר אצלך. <button type="button" class="btn btn-line btn-sm" id="th-keep">לשמור אצלי</button> <button type="button" class="btn btn-line btn-sm" id="th-leave">לחזור ללוח שלי</button></div>';
    h += '<section class="th-box" id="th-method" aria-labelledby="th-method-h"><h2 class="th-h" id="th-method-h">לפי איזו שיטה?</h2>' +
      '<p class="th-note">הכלי לא בוחר בשבילך. בוחרים את המנהג שלכם, ואם הרב אמר אחרת – "הרב שלי אמר אחרת".</p><div class="th-presets" role="radiogroup" aria-label="שיטה">';
    Object.keys(C.PRESETS).forEach(function (id) {
      h += '<label class="th-p"><input type="radio" name="th-preset" value="' + id + '"><span><b>' + esc(C.PRESETS[id].name) + '</b><small>' + esc(DESC[id] || '') + '</small></span></label>';
    });
    h += '<label class="th-p"><input type="radio" name="th-preset" value="custom"><span><b>הרב שלי אמר אחרת</b><small>מתחילים משיטה אחת ומשנים לפי מה שהרב אמר.</small></span></label></div>' +
      '<div id="th-custom" class="k-form" hidden><div class="th-grid">' +
      sel('th-c-base', 'על בסיס', Object.keys(C.PRESETS).map(function (k) { return [k, C.PRESETS[k].name]; })) +
      sel('th-c-bein', 'עונה בינונית', [['onah', 'יום ל׳ – העונה שבה ראתה'], ['24h', 'יום ל׳ – לילה ויום'], ['31', 'יום ל׳ וגם וסת החודש']]) +
      sel('th-c-oz', 'אור זרוע', [['false', 'לא'], ['recommended', 'ראוי להחמיר'], ['true', 'כן']]) +
      sel('th-c-min', 'ימים עד הפסק טהרה (כולל יום הראייה)', [['4', '4 ימים'], ['5', '5 ימים'], ['6', '6 ימים'], ['7', '7 ימים']]) +
      sel('th-c-old', 'הפלגות קודמות שלא נעקרו', [['true', 'חוששת להן'], ['ask', 'מציג לחומרה ושואלים'], ['false', 'לא חוששת']]) +
      sel('th-c-from', 'ספירת ההפלגה', [['start', 'מתחילת הראייה'], ['end', 'מסוף הראייה']]) +
      '</div></div><div id="th-pinfo" class="th-pinfo" aria-live="polite"></div></section>';
    h += '<div id="th-body">';
    if (has(['vestot', 'luach'])) h += entryHtml();
    if (has(['vestot', 'luach'])) h += '<section class="th-box" id="th-res" aria-labelledby="th-res-h"><h2 class="th-h" id="th-res-h">העונות שצריך לפרוש בהן</h2><div id="th-res-in" aria-live="polite"></div></section>';
    if (has(['luach'])) h += '<section class="th-box" id="th-cal" aria-labelledby="th-cal-h"><h2 class="th-h" id="th-cal-h">הלוח החודשי</h2><div id="th-cal-in"></div></section>';
    if (has(['tevila', 'luach'])) h += tevHtml();
    h += dataHtml() + '</div>';
    h += '<p class="disclaimer th-disc">הכלי מחשב לפי השיטה שבחרת ולפי המקורות שכתובים בדף. הוא לא פוסק ולא מחליף רב. בכל ספק, ובכל מקום שכתוב "שואלים רב" – שואלים רב. הרעיון באדיבות אהרן גרינברג.</p>';
    return h;
  }
  function sel(id, label, opts) {
    return '<div class="field"><label for="' + id + '">' + label + '</label><select id="' + id + '">' + opts.map(function (o) { return '<option value="' + o[0] + '">' + esc(o[1]) + '</option>'; }).join('') + '</select></div>';
  }
  function entryHtml() {
    return '<section class="th-box" id="th-entry" aria-labelledby="th-entry-h"><h2 class="th-h" id="th-entry-h">הוספת ראייה</h2><form class="k-form" id="th-form" novalidate onsubmit="return false">' +
      '<div class="th-grid">' + sel('th-city', 'עיר (בשביל שעת השקיעה)', CITIES.map(function (c) { return [c[0], c[1]]; })) +
      '<div class="field"><label for="th-date">תאריך הראייה</label><input id="th-date" type="date"></div>' +
      '<div class="field"><label for="th-time">שעה <span class="opt">(אם לא זוכרים – משאירים ריק)</span></label><input id="th-time" type="time"></div></div>' +
      '<div class="field" id="th-notime"><span class="label">מתי בערך?</span><div class="radios">' +
      '<label><input type="radio" name="th-nt" value="day" checked> ביום (בין הנץ לשקיעה)</label>' +
      '<label><input type="radio" name="th-nt" value="eve"> בערב או בלילה, אחרי השקיעה</label>' +
      '<label><input type="radio" name="th-nt" value="dawn"> לפנות בוקר, לפני הנץ</label></div></div>' +
      '<div class="field" id="th-near" hidden><span class="label" id="th-near-l"></span><div class="radios" id="th-near-r"></div></div>' +
      '<div class="field" id="th-endf" hidden><label for="th-end">מתי הסתיימה הראייה? <span class="opt">(לשיטת חב"ד ההפלגה נספרת מסוף הראייה)</span></label><input id="th-end" type="date"></div>' +
      '<details class="th-more"><summary>הראייה נמשכה אחרי הנץ?</summary><div class="field"><label for="th-netz">כמה דקות אחרי הנץ <span class="opt">(רק לראייה שהתחילה בלילה)</span></label><input id="th-netz" type="number" min="0" max="720" inputmode="numeric"></div></details>' +
      '<p class="th-prev" id="th-prev" aria-live="polite"></p><div id="th-quick" aria-live="polite"></div>' +
      '<div class="share-row"><button class="btn btn-gold" type="button" id="th-add">להוסיף ראייה</button></div></form>' +
      '<h3 class="th-h3">הראיות ששמורות</h3><ul class="th-list" id="th-list"></ul>' +
      '<details class="th-more" id="th-status"><summary>מצב מיוחד (הריון, הנקה ועוד)</summary><div class="radios th-checks">' +
      chk('pregnant', 'הריון שכבר הוכר') + chk('nursing', 'מניקה (עד 24 חודשים מהלידה)') + chk('menopause', 'גיל המעבר / שלושה חודשים בלי ראייה') +
      chk('pill', 'גלולות או טיפול הורמונלי') + chk('guf', 'וסת הגוף (סימנים בגוף לפני הראייה)') + chk('tashmish', 'דם מחמת תשמיש') +
      '</div><p class="th-note">במצבים האלה הדין משתנה. הכלי לא מחשב לבד – הוא מציג "שואלים רב".</p></details></section>';
  }
  function chk(k, t) { return '<label class="check"><input type="checkbox" data-st="' + k + '"> <span>' + t + '</span></label>'; }
  function tevHtml() {
    return '<section class="th-box" id="th-tev" aria-labelledby="th-tev-h"><h2 class="th-h" id="th-tev-h">מחשבון ליל טבילה</h2><form class="k-form" novalidate onsubmit="return false"><div class="th-grid">' +
      '<div class="field"><label for="th-tstart">היום הראשון של הראייה</label><input id="th-tstart" type="date"></div>' +
      '<div class="field"><label for="th-thef">יום ההפסק בפועל <span class="opt">(אם היה מאוחר יותר; אחרת ריק)</span></label><input id="th-thef" type="date"></div>' +
      (MODE === 'tevila' ? sel('th-tcity', 'עיר (בשביל צאת הכוכבים)', CITIES.map(function (c) { return [c[0], c[1]]; })) : '') +
      '</div></form><div id="th-tev-in" aria-live="polite"></div></section>';
  }
  function dataHtml() {
    return '<section class="th-box th-data" id="th-data" aria-labelledby="th-data-h"><h2 class="th-h" id="th-data-h">הנתונים שלך</h2>' +
      '<p class="th-note">הכול נשמר רק בטלפון הזה. שום נתון לא נשלח לשרת, ולא לסטטיסטיקה של האתר (שם נספרות רק כניסות לדף).</p>' +
      '<div class="share-row">' +
      '<button class="btn btn-line btn-sm" type="button" id="th-ics">ליומן (קובץ ‎.ics)</button>' +
      (inApp() ? '<button class="btn btn-line btn-sm" type="button" id="th-remind-on">להפעיל תזכורות בטלפון</button><button class="btn btn-line btn-sm" type="button" id="th-remind-off">לכבות תזכורות</button>' : '') +
      '<button class="btn btn-line btn-sm" type="button" id="th-print">להדפיס</button>' +
      '<button class="btn btn-line btn-sm" type="button" id="th-share">קישור לבן הזוג</button>' +
      '<button class="btn btn-line btn-sm" type="button" id="th-lockb">קוד נעילה</button>' +
      '<button class="btn btn-line btn-sm" type="button" id="th-backup">גיבוי לקובץ</button>' +
      '<label class="btn btn-line btn-sm th-file">שחזור מגיבוי<input type="file" id="th-restore" accept=".json,application/json"></label>' +
      '<button class="btn btn-line btn-sm th-danger" type="button" id="th-wipe">למחוק הכול</button></div>' +
      '<div id="th-share-box" class="th-warn" hidden><p><b>זהירות:</b> מי שיש לו את הקישור רואה את כל הראיות והתאריכים. שולחים רק לבן הזוג, ולא בקבוצה.</p>' +
      '<div class="share-row"><a class="btn btn-gold btn-sm" id="th-share-wa" target="_blank" rel="noopener"><svg class="ic"><use href="#wa"/></svg> לשלוח בווטסאפ</a><button class="btn btn-line btn-sm" type="button" id="th-share-copy">להעתיק את הקישור</button></div></div>' +
      '<form id="th-lock-box" class="k-form th-warn" hidden novalidate onsubmit="return false"><div class="field"><label for="th-code" id="th-code-l">קוד נעילה חדש (4 ספרות ומעלה)</label><input id="th-code" type="password" inputmode="numeric" autocomplete="new-password" minlength="4"></div>' +
      '<p class="th-note">בלי הקוד אי אפשר לפתוח את הנתונים, וגם לנו אין דרך לשחזר אותו. שכחת – אפשר רק למחוק ולהתחיל מחדש.</p>' +
      '<div class="share-row"><button class="btn btn-gold btn-sm" type="button" id="th-code-ok">לשמור קוד</button><button class="btn btn-line btn-sm" type="button" id="th-code-off" hidden>להסיר את הקוד</button></div></form>' +
      '<p class="th-msg" id="th-msg" role="status"></p></section>';
  }

  /* ---------- שיטה ---------- */
  function syncMethod() {
    var radios = ROOT.querySelectorAll('input[name="th-preset"]');
    radios.forEach(function (r) { r.checked = r.value === S.preset; r.disabled = VIEW; });
    var cu = $('th-custom'); cu.hidden = S.preset !== 'custom';
    if (S.preset === 'custom') {
      var c = S.custom || { base: 'sephardi_ovadia', over: {} }, p = preset();
      $('th-c-base').value = c.base; $('th-c-bein').value = p.beinonit; $('th-c-oz').value = String(p.orZarua);
      $('th-c-min').value = String(p.minDays); $('th-c-old').value = String(p.oldHaflagot); $('th-c-from').value = p.haflagaFrom;
    }
    $('th-body').hidden = !S.preset;
    var p2 = preset(), info = '';
    if (!p2) info = '<p class="th-pick">בוחרים שיטה, ואז מופיע המחשבון.</p>';
    else {
      info = '<p>השיטה: <b>' + esc(p2.name) + '</b>. ימים עד הפסק טהרה: ' + p2.minDays + ' (כולל יום הראייה).</p>';
      if (p2.sources) info += '<details><summary>המקורות לשיטה הזאת</summary><ul>' + Object.keys(p2.sources).map(function (k) { return '<li>' + esc(p2.sources[k]) + '</li>'; }).join('') + '</ul></details>';
      (p2.notes || []).forEach(function (n) { info += '<p class="th-note">' + esc(n) + '</p>'; });
      if ((p2.unverified || []).length) info += '<div class="th-unv"><b>מה לא אומת בשיטה הזאת</b> (מוצג לחומרה, ושואלים רב):<ul>' + p2.unverified.map(function (k) { return '<li>' + esc(C.RAV[k] || k) + '</li>'; }).join('') + '</ul></div>';
    }
    $('th-pinfo').innerHTML = info;
  }
  function readCustom() {
    var base = $('th-c-base').value, bp = C.PRESETS[base], over = {};
    var v = { beinonit: $('th-c-bein').value, orZarua: { 'false': false, 'true': true, recommended: 'recommended' }[$('th-c-oz').value],
      minDays: +$('th-c-min').value, oldHaflagot: { 'false': false, 'true': true, ask: 'ask' }[$('th-c-old').value], haflagaFrom: $('th-c-from').value };
    Object.keys(v).forEach(function (k) { if (v[k] !== bp[k]) over[k] = v[k]; });
    return { base: base, over: over };
  }

  /* ---------- הזנת ראייה ---------- */
  var nearPick = null, touched = false;
  function draft() {
    var ds = $('th-date').value; if (!ds) return null;
    var a = ds.split('-').map(Number), t = $('th-time').value, r;
    if (t) {
      r = C.onahFromClock(a[0], a[1], a[2], t, geo());
      if (r.near && nearPick) {
        var base = C.absFromYmd(ds);
        if (nearPick === 'before') { r.onah = r.near === 'sunset' ? 'day' : 'night'; r.abs = base; }
        else if (nearPick === 'after') { r.onah = r.near === 'sunset' ? 'night' : 'day'; r.abs = r.near === 'sunset' ? base + 1 : base; }
        else r.doubt = true;
      }
    } else {
      var nt = (ROOT.querySelector('input[name="th-nt"]:checked') || {}).value || 'day', ab = C.absFromYmd(ds);
      r = nt === 'day' ? { abs: ab, onah: 'day' } : nt === 'eve' ? { abs: ab + 1, onah: 'night' } : { abs: ab, onah: 'night' };
    }
    return r;
  }
  function onEntry(ev) {
    if (ev && (ev.target.id === 'th-date' || ev.target.id === 'th-time' || ev.target.id === 'th-city')) nearPick = null;
    if (ev && ev.target && (ev.target.id === 'th-date' || ev.target.id === 'th-time' || ev.target.name === 'th-nt')) touched = true;
    var t = $('th-time').value; $('th-notime').hidden = !!t;
    var r = draft(), near = $('th-near'), p;
    if (r && r.near && t) {
      near.hidden = false;
      var ss = r.near === 'sunset';
      $('th-near-l').innerHTML = ss ? 'השעה קרובה לשקיעה (' + hm(r.sunset) + ', צאת הכוכבים ' + hm(r.tzeit) + '). מתי זה היה?' : 'השעה קרובה לנץ (' + hm(r.sunrise) + '). מתי זה היה?';
      var opts = ss ? [['before', 'לפני השקיעה'], ['after', 'אחרי צאת הכוכבים'], ['between', 'ביניהם / לא בטוחה']] : [['before', 'לפני הנץ'], ['after', 'אחרי הנץ'], ['between', 'לא בטוחה']];
      $('th-near-r').innerHTML = opts.map(function (o) { return '<label><input type="radio" name="th-np" value="' + o[0] + '"' + (nearPick === o[0] ? ' checked' : '') + '> ' + o[1] + '</label>'; }).join('');
    } else near.hidden = true;
    p = preset(); $('th-endf').hidden = !(p && p.haflagaFrom === 'end');
    $('th-prev').innerHTML = !r ? '' : (r.near && t && !nearPick) ? 'בוחרים למעלה מתי בדיוק.' :
      'נרשם כ: ' + when(r.abs, r.onah) + (r.doubt ? ' <span class="th-tag">ספק – שואלים רב</span>' : '');
    var qk = $('th-quick'), ok = touched && r && !(r.near && t && !nearPick) && !r.doubt && p;
    qk.innerHTML = ok ? sumHtml(C.summary(draftList(r), p), p, 'מה יוצא מהראייה הזאת – עוד לפני ששומרים') : '';
  }
  function addSighting() {
    var r = draft(), msg = $('th-prev');
    if (!r) { msg.textContent = 'בוחרים תאריך.'; $('th-date').focus(); return; }
    if (r.near && $('th-time').value && !nearPick) { msg.textContent = 'בוחרים אם זה היה לפני או אחרי.'; return; }
    if (r.abs > absToday() + 1) { msg.textContent = 'התאריך בעתיד.'; return; }
    var q = { abs: r.abs, onah: r.onah };
    if (r.doubt) q.doubt = true;
    var e = $('th-end').value; if (e && !$('th-endf').hidden) q.endAbs = Math.max(C.absFromYmd(e), r.abs);
    var nz = +$('th-netz').value; if (nz > 0 && r.onah === 'night') q.afterNetzMin = Math.min(720, Math.round(nz));
    if (S.sightings.some(function (x) { return x.abs === q.abs && x.onah === q.onah && !x.missed; })) { msg.textContent = 'הראייה הזאת כבר רשומה.'; return; }
    S.sightings.push(q); S.sightings.sort(function (a, b) { return C.idxOf(a.abs, a.onah) - C.idxOf(b.abs, b.onah); });
    S.cycle = { start: q.abs, hefsek: null };
    $('th-time').value = ''; $('th-end').value = ''; $('th-netz').value = ''; nearPick = null; touched = false;
    persist(); renderAll(); msg.innerHTML = 'נוסף. התוצאות למטה עודכנו.';
  }
  function renderList() {
    var ul = $('th-list'); if (!ul) return;
    if (!S.sightings.length) { ul.innerHTML = '<li class="th-empty">עוד אין ראיות. מוסיפים את הראייה האחרונה, ואם אפשר גם את שתיים-שלוש שלפניה.</li>'; return; }
    var prevSeen = null, pr = preset();
    ul.innerHTML = S.sightings.map(function (q, i) {
      var gap = '';
      if (!q.missed) { if (prevSeen) gap = ' <span class="th-gap">הפלגה: ' + C.haflagaLen(prevSeen, q, pr) + ' ימים</span>'; prevSeen = q; }
      return '<li' + (q.missed ? ' class="th-missed"' : '') + '><span>' + (q.missed ? 'עברה בלי ראייה: ' : '') + when(q.abs, q.onah) +
        (q.doubt ? ' <span class="th-tag">ספק בשעה</span>' : '') + (q.endAbs != null ? ' · הסתיימה ' + bd(C.describe(q.endAbs, 'day').greg) : '') +
        (q.afterNetzMin ? ' · נמשכה ' + q.afterNetzMin + ' דק׳ אחרי הנץ' : '') + gap + '</span>' +
        (VIEW ? '' : '<button type="button" class="th-x" data-del="' + i + '" aria-label="למחוק את הרשומה">✕</button>') + '</li>';
    }).reverse().join('');
  }

  /* ---------- תוצאות ---------- */
  var RES = null;
  function compute() {
    var p = preset(); if (!p) return null;
    RES = C.compute(S.sightings, p, S.status);
    ['guf', 'tashmish'].forEach(function (k) { if (S.status[k] && RES.needRav.indexOf(k) < 0) RES.needRav.push(k); });
    return RES;
  }
  function checkNote(o, p) {
    var t = 'חובה לבדוק בעונה הזאת. אם לא בדקה – אסורה לשמש עד שתבדוק; אם רוצים לשמש אחריה – בודקת לפני, ומותרת בשופי.';
    if (o.type === 'beinonit' || o.alsoBeinonit || o.rule === 'kavua') return t + ' (שו"ע יו"ד קפט:ד; רמ"א קפד:ט)';
    return t;
  }
  function renderRes() {
    var box = $('th-res-in'); if (!box) return;
    var p = preset(), r = RES;
    if (!S.sightings.filter(function (q) { return !q.missed; }).length && !S.status.pregnant) { box.innerHTML = '<p class="th-empty">מוסיפים ראייה, והעונות יופיעו כאן.</p>'; return; }
    var h = '', today = absToday();
    if (r.needRav.length) h += '<div class="th-rav"><b>שואלים רב:</b><ul>' + r.needRav.map(function (k) { return '<li>' + esc(C.RAV[k] || EXTRA_RAV[k] || k) + '</li>'; }).join('') + '</ul></div>';
    if (r.fixed) h += '<p class="th-fixed">זוהה <b>' + esc(C.LABEL[r.fixed.kind === 'chodesh' ? 'chodesh_kavua' : 'haflaga_kavua']) + '</b>. וסת קבוע נעקר רק אחרי שלוש פעמים שעברו בלי ראייה.</p>';
    if (!r.fixed && !S.status.pregnant) h += sumHtml(C.summary(S.sightings, p), p, 'העיקר – מהראייה האחרונה');
    if (r.onot.length) h += '<h3 class="th-h3">כל העונות לפי הסדר</h3>';
    if (!r.onot.length) h += '<p class="th-empty">' + (S.status.pregnant ? 'בהריון שהוכר הכלי לא מחשב עונות – שואלים רב.' : 'אין עונות לחשב כרגע.') + '</p>';
    else {
      h += '<ol class="th-onot">';
      C.merge(r.onot).forEach(function (o) {
        var past = o.abs < today, oz = o.parts.every(function (x) { return x.type === 'or_zarua'; });
        var lbl = o.parts.map(function (x) { return (C.LABEL[x.type] || x.type) + (x.alsoBeinonit ? ' (וגם עונה בינונית)' : '') + (x.recommended ? ' – ראוי להחמיר' : ''); })
          .filter(function (v, i, a) { return a.indexOf(v) === i; }).join(' + ');
        var why = o.parts.map(function (x) { return '<p>' + esc(x.why) + '. <span class="th-src">מקור: ' + esc(SRC[x.rule] || 'ראו בטבלת המקורות בדף') + '</span></p>'; }).join('');
        var cn = o.parts.map(function (x) { return checkNote(x, p); }).sort(function (a, b) { return b.length - a.length; })[0];
        h += '<li class="th-on' + (o.doubt ? ' th-doubt' : '') + (past ? ' th-past' : '') + (oz ? ' th-oz' : '') + '">' +
          '<span class="th-lbl">' + esc(lbl) + (o.doubt ? ' <span class="th-tag">ספק – שואלים רב</span>' : '') + '</span>' +
          '<span class="th-when">' + when(o.abs, o.onah) + (o.type === 'chodesh_partial' ? ' – רק עד ' + o.untilNetzPlusMin + ' דקות אחרי הנץ' : '') + '</span>' +
          '<details><summary>למה?</summary>' + why + '<p>' + cn + '</p></details>' +
          (past && !VIEW && !oz ? '<button type="button" class="btn btn-line btn-sm th-miss" data-miss="' + o.abs + ':' + o.onah + '">העונה עברה בלי ראייה</button>' : '') + '</li>';
      });
      h += '</ol>';
      if (r.onot.some(function (o) { return o.doubt; })) h += '<p class="th-note">במקום שיש ספק, הכלי מציג את שתי האפשרויות ולא בוחר ביניהן.</p>';
    }
    h += '<div class="share-row"><a class="btn btn-gold btn-sm" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(C.ravText(S.sightings, p, r)) + '"><svg class="ic"><use href="#wa"/></svg> לשלוח שאלה לרב</a></div>' +
      '<p class="th-note">ההודעה לרב כוללת רק תאריכים עבריים ואת השיטה – בלי שם ובלי טלפון. אפשר לקרוא אותה לפני השליחה.</p>';
    box.innerHTML = h;
  }

  /* ---------- ליל טבילה ---------- */
  var TEV = null;
  function renderTev() {
    var box = $('th-tev-in'); if (!box) return;
    var p = preset(); TEV = null;
    var s = $('th-tstart'), hf = $('th-thef');
    if (S.cycle.start != null) s.value = C.describe(S.cycle.start, 'day').ymd; else if (!s.value) s.value = '';
    hf.value = S.cycle.hefsek != null ? C.describe(S.cycle.hefsek, 'day').ymd : '';
    if (S.cycle.start == null) { box.innerHTML = '<p class="th-empty">בוחרים את היום הראשון של הראייה.</p>'; return; }
    var m = TEV = C.mikveh(S.cycle.start, p, S.cycle.hefsek);
    var zH = zm(m.hefsek.greg), zT = zm(m.tevila.gregEve);
    var h = '<div class="res th-tres"><p class="th-k">ליל הטבילה</p><p class="th-big">ליל ' + esc(m.tevila.hebrew) + '</p>' +
      '<p class="th-sub">מוצאי יום ' + C.DOW[m.tevila.dowEve] + ', ' + bd(m.tevila.gregEve) + ', אחרי צאת הכוכבים (בערך ' + hm(zT.tzeit()) + ' ב' + esc(city(S.city)[1]) + ')</p></div>' +
      '<ol class="th-steps">' +
      '<li><b>הפסק טהרה:</b> יום ' + C.DOW[m.hefsek.dow] + ', ' + esc(m.hefsek.hebrew) + ' (' + bd(m.hefsek.greg) + '), לפני השקיעה (' + hm(zH.sunset()) + ') ולכתחילה לפני ערבית של הקהל.' +
      (m.hefsekLate ? ' <span class="th-tag">לפי היום שהזנת</span>' : ' <span class="th-sm">(היום ה-' + m.minDays + ' כולל יום הראייה)</span>') + '</li>' +
      '<li><b>שבעה נקיים:</b> מ' + dayLine(m.cleanFirst.abs) + ' עד ' + dayLine(m.cleanLast.abs) + '. לכתחילה בודקים פעמיים ביום, בבוקר וסמוך לשקיעה.</li>' +
      '<li><b>טבילה:</b> בלילה שאחרי היום השביעי, אחרי צאת הכוכבים. לא טובלים ביום השביעי.</li></ol>';
    if (m.postponedFrom) h += '<p class="th-alert">הלילה המקורי היה ליל ' + esc(m.postponedFrom.hebrew) + '.</p>';
    m.alerts.forEach(function (a) { if (ALERT[a]) h += '<p class="th-alert">' + esc(ALERT[a]) + '</p>'; });
    h += '<details><summary>למה?</summary><p>ימי ההמתנה לפני ההפסק: באשכנז 5 ימים עם יום הראייה (רמ"א יו"ד קצו:יא). לספרדים 4 ימים כולל יום הראייה, לפי טהרת הבית (מקור משני). בשיטה שלא אומתה – 5 לחומרה, ולאמת עם רב. שבעה נקיים מתחילים ממחרת ההפסק (שו"ע קצו:א), והטבילה בלילה שאחרי השביעי (שו"ע קצז:ג).</p>' +
      '<p>ראית דם בתוך השבעה, אפילו בסוף היום השביעי – מתחילים מחדש מהפסק טהרה (שו"ע קצו:י). מזינים את התאריך החדש למעלה.</p></details>';
    box.innerHTML = h;
  }

  /* ---------- לוח חודשי ---------- */
  function marks() {
    var M = {};
    function put(ymd, cls, t) { (M[ymd] = M[ymd] || []).push([cls, t]); }
    function key(abs, onah) { var d = C.describe(abs, onah); return onah === 'night' ? d.ymdEve : d.ymd; }
    S.sightings.forEach(function (q) { if (!q.missed) put(key(q.abs, q.onah), 'see', 'ראייה' + (q.onah === 'night' ? ' בלילה' : '')); });
    if (RES) C.merge(RES.onot).forEach(function (o) { put(key(o.abs, o.onah), o.doubt ? 'on dbt' : 'on', (o.type === 'or_zarua' ? 'אור זרוע' : 'עונה') + (o.onah === 'night' ? ' – מהערב' : ' – ביום')); });
    if (TEV) {
      put(TEV.hefsek.ymd, 'hef', 'הפסק טהרה');
      for (var i = 0; i < 7; i++) put(C.describe(TEV.cleanFirst.abs + i, 'day').ymd, 'clean', 'נקי ' + (i + 1));
      put(TEV.tevila.ymdEve, 'tev', 'ליל טבילה – מהערב');
    }
    return M;
  }
  function renderCal() {
    var box = $('th-cal-in'); if (!box) return;
    if (calY == null) { var n = new Date(); calY = n.getFullYear(); calM = n.getMonth(); }
    var M = marks(), first = new Date(calY, calM, 1), days = new Date(calY, calM + 1, 0).getDate(), td = todayYmd();
    var GM = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
    var h1 = new H.HDate(first), h2 = new H.HDate(new Date(calY, calM, days));
    var h = '<div class="th-calbar"><button type="button" class="th-nav" id="th-prevm" aria-label="החודש הקודם">›</button><p><b>' + GM[calM] + ' ' + calY + '</b><small>' +
      esc(h1.renderGematriya(true).replace(/^\S+\s/, '')) + ' – ' + esc(h2.renderGematriya(true).replace(/^\S+\s/, '')) + '</small></p><button type="button" class="th-nav" id="th-nextm" aria-label="החודש הבא">‹</button></div>' +
      '<table class="th-caltab"><caption class="sr-only">לוח טהרה ל' + GM[calM] + ' ' + calY + '</caption><thead><tr>' + ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'שבת'].map(function (d) { return '<th scope="col">' + d + '</th>'; }).join('') + '</tr></thead><tbody><tr>';
    for (var i = 0; i < first.getDay(); i++) h += '<td></td>';
    for (var d = 1; d <= days; d++) {
      var g = new Date(calY, calM, d, 12), y = C.ymd(g), hd = new H.HDate(g), mk = M[y] || [], di = C.dayInfo(hd.abs());
      var cls = [y === td ? 'th-today' : '', di.shabbat ? 'th-shab' : '', di.chag ? 'th-chag' : ''].filter(Boolean).join(' ');
      var hdTxt = hd.getDate() === 1 || d === 1 ? H.gematriya(hd.getDate()) + ' ' + monthOf(hd.renderGematriya(true)) : H.gematriya(hd.getDate());
      var hol = (di.shabbat && !di.chag ? ['שבת'] : []).concat(di.names);
      h += '<td class="' + cls + '"><span class="th-dn">' + d + '</span><span class="th-hd">' + esc(hdTxt) + '</span>' +
        (hol.length ? '<span class="th-hol">' + esc(hol.join(' · ')) + '</span>' : '') +
        mk.map(function (x) { return '<span class="th-mk th-' + x[0].split(' ').join(' th-') + '">' + esc(x[1]) + '</span>'; }).join('') + '</td>';
      if (g.getDay() === 6 && d < days) h += '</tr><tr>';
    }
    var end = new Date(calY, calM, days).getDay(); for (var j = end; j < 6; j++) h += '<td></td>';
    h += '</tr></tbody></table><p class="th-legend"><span class="th-mk th-see">ראייה</span><span class="th-mk th-on">עונת פרישה</span><span class="th-mk th-on th-dbt">ספק</span><span class="th-mk th-hef">הפסק</span><span class="th-mk th-clean">נקי</span><span class="th-mk th-tev">טבילה</span><span class="th-lg-shab">שבת</span><span class="th-lg-chag">יום טוב</span></p>' +
      '<p class="th-note">עונת לילה מסומנת ביום שבערב שלו היא מתחילה ("מהערב"). ליד כל יום לועזי – התאריך העברי; המועדים לפי ארץ ישראל.</p>';
    box.innerHTML = h;
  }

  /* ---------- יומן, שיתוף, גיבוי, נעילה ---------- */
  function ics() {
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//hakelim//tahara//HE', 'CALSCALE:GREGORIAN'], now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    function ev(ymd, title, desc) {
      var d = ymd.replace(/-/g, ''), a = ymd.split('-').map(Number), nx = C.ymd(new Date(a[0], a[1] - 1, a[2] + 1, 12)).replace(/-/g, '');
      L.push('BEGIN:VEVENT', 'UID:' + d + '-' + Math.random().toString(36).slice(2) + '@hakelim.com', 'DTSTAMP:' + now, 'DTSTART;VALUE=DATE:' + d, 'DTEND;VALUE=DATE:' + nx, 'SUMMARY:' + title, 'DESCRIPTION:' + desc, 'END:VEVENT');
    }
    var n = 0, today = absToday();
    if (RES) C.merge(RES.onot).forEach(function (o) { if (o.abs < today) return; var d = C.describe(o.abs, o.onah); ev(o.onah === 'night' ? d.ymdEve : d.ymd, o.onah === 'night' ? 'עונה – מהערב' : 'עונה – ביום', (C.LABEL[o.type] || '') + (o.doubt ? ' (ספק)' : '') + ' – ' + d.hebrew); n++; });
    if (TEV && TEV.tevila.abs >= today) { ev(TEV.hefsek.ymd, 'הפסק', 'לפני השקיעה – ' + TEV.hefsek.hebrew); ev(TEV.tevila.ymdEve, 'ליל ט׳', 'אחרי צאת הכוכבים – ליל ' + TEV.tevila.hebrew); n += 2; }
    L.push('END:VCALENDAR');
    if (!n) { msg('אין תאריכים קרובים לייצא.'); return; }
    download('tahara.ics', L.join('\r\n'), 'text/calendar;charset=utf-8'); msg('נוצר קובץ יומן עם ' + n + ' תאריכים. הכותרות ביומן דיסקרטיות.');
  }
  // תזכורות מקומיות – רק באפליקציית Google Play. הדף שולח לאפליקציה רק רשימת זמנים (מילישניות)
  // דרך קישור פנימי; האפליקציה שומרת ומתזמנת בטלפון, בלי שרת. נוסח ההתראה דיסקרטי.
  function inApp() { return document.documentElement.classList.contains('in-app'); }
  function remind(on) {
    var times = [];
    function at(ymd, h) { var a = ymd.split('-').map(Number); return new Date(a[0], a[1] - 1, a[2], h, 0).getTime(); }
    var today = absToday();
    if (on) {
      if (RES) C.merge(RES.onot).forEach(function (o) { if (o.abs < today) return; var d = C.describe(o.abs, o.onah); times.push(o.onah === 'night' ? at(d.ymdEve, 19) : at(d.ymd, 7)); });
      if (TEV && TEV.tevila.abs >= today) { times.push(at(TEV.hefsek.ymd, 14)); times.push(at(TEV.tevila.ymdEve, 18)); }
      times = times.filter(function (t) { return t > Date.now(); });
      if (!times.length) { msg('אין תאריכים קרובים לתזכורת.'); return; }
    }
    msg(on ? 'מפעיל תזכורות…' : 'מכבה תזכורות…');
    location.href = 'hakelim-tahara://remind?t=' + times.join(',');
  }
  function shareUrl() { return location.origin + '/kodesh/tahara/luach-tahara/#s=' + b64e(JSON.stringify({ preset: S.preset, custom: S.custom, city: S.city, sightings: S.sightings, status: S.status, cycle: S.cycle })); }
  function msg(t) { var m = $('th-msg'); if (m) m.textContent = t; }
  function wire() {
    ROOT.addEventListener('change', function (e) {
      var t = e.target;
      if (t.name === 'th-preset') {
        S.preset = t.value;
        if (t.value === 'custom' && !S.custom) S.custom = { base: 'sephardi_ovadia', over: {} };
        persist(); renderAll(); return;
      }
      if (/^th-c-/.test(t.id)) {
        if (t.id === 'th-c-base') S.custom = { base: t.value, over: {} }; else S.custom = readCustom();
        persist(); renderAll(); return;
      }
      if (t.id === 'th-city' || t.id === 'th-tcity') { S.city = t.value; persist(); onEntryIf(e); renderAll(); return; }
      if (t.name === 'th-np') { nearPick = t.value; onEntry(); return; }
      if (t.dataset && t.dataset.st) { if (t.checked) S.status[t.dataset.st] = true; else delete S.status[t.dataset.st]; persist(); renderAll(); return; }
      if (t.id === 'th-tstart') { S.cycle.start = t.value ? C.absFromYmd(t.value) : null; S.cycle.hefsek = null; persist(); renderAll(); return; }
      if (t.id === 'th-thef') { S.cycle.hefsek = t.value ? C.absFromYmd(t.value) : null; persist(); renderAll(); return; }
      if (t.id === 'th-restore' && t.files && t.files[0]) {
        var fr = new FileReader();
        fr.onload = function () {
          try { var o = JSON.parse(fr.result); if (!o || o.app !== 'kelim-tahara') throw 0; S = sanitize(o.data); persist(); renderAll(); msg('הגיבוי שוחזר.'); }
          catch (er) { msg('הקובץ הזה הוא לא גיבוי של לוח הטהרה.'); }
          t.value = '';
        };
        fr.readAsText(t.files[0]);
      }
    });
    ROOT.addEventListener('input', function (e) { onEntryIf(e); });
    ROOT.addEventListener('click', function (e) {
      var t = e.target.closest('button'); if (!t) return;
      var id = t.id;
      if (id === 'th-add') return addSighting();
      if (t.dataset.del != null) {
        var i = +t.dataset.del; if (!confirm('למחוק את הרשומה?')) return;
        S.sightings.splice(i, 1); persist(); renderAll(); return;
      }
      if (t.dataset.miss) { var p = t.dataset.miss.split(':'); S.sightings.push({ abs: +p[0], onah: p[1], missed: true }); persist(); renderAll(); return; }
      if (id === 'th-prevm' || id === 'th-nextm') { calM += id === 'th-prevm' ? -1 : 1; if (calM < 0) { calM = 11; calY--; } if (calM > 11) { calM = 0; calY++; } renderCal(); return; }
      if (id === 'th-ics') return ics();
      if (id === 'th-remind-on') return remind(true);
      if (id === 'th-remind-off') return remind(false);
      if (id === 'th-print') return window.print();
      if (id === 'th-share') {
        var b = $('th-share-box'); b.hidden = !b.hidden; if (b.hidden) return;
        $('th-share-wa').href = 'https://wa.me/?text=' + encodeURIComponent('הלוח שלנו (נפתח רק למי שיש לו את הקישור):\n' + shareUrl()); return;
      }
      if (id === 'th-share-copy') { navigator.clipboard.writeText(shareUrl()).then(function () { msg('הקישור הועתק. שולחים רק לבן הזוג.'); }, function () { msg('לא הצלחנו להעתיק.'); }); return; }
      if (id === 'th-lockb') { var lb = $('th-lock-box'); lb.hidden = !lb.hidden; $('th-code-off').hidden = !Store.key; $('th-code-l').textContent = Store.key ? 'קוד חדש במקום הקיים' : 'קוד נעילה חדש (4 ספרות ומעלה)'; return; }
      if (id === 'th-code-ok') {
        var c = $('th-code').value; if (c.length < 4) { msg('הקוד קצר מדי – לפחות 4 ספרות.'); return; }
        Store.setLock(c, S).then(function () { $('th-code').value = ''; $('th-lock-box').hidden = true; msg('נשמר. מעכשיו הנתונים מוצפנים, ובכניסה הבאה יתבקש הקוד.'); }); return;
      }
      if (id === 'th-code-off') { Store.removeLock(S).then(function () { $('th-lock-box').hidden = true; msg('הקוד הוסר.'); }); return; }
      if (id === 'th-backup') {
        download('tahara-gibui-' + todayYmd() + '.json', JSON.stringify({ app: 'kelim-tahara', v: 1, saved: todayYmd(), data: S }, null, 1), 'application/json');
        msg('נוצר קובץ גיבוי. הוא לא מוצפן – שומרים אותו במקום פרטי.'); return;
      }
      if (id === 'th-wipe') {
        if (!confirm('למחוק את כל הנתונים מהטלפון הזה? אי אפשר לבטל.')) return;
        Store.clear(); S = blank(); mount(ROOT); msg('הכול נמחק.'); return;
      }
      if (id === 'th-keep') { if (!confirm('לשמור את הלוח הזה אצלך? הוא יחליף את מה ששמור אצלך עכשיו.')) return; VIEW = false; history.replaceState(null, '', location.pathname); persist(); mount(ROOT); return; }
      if (id === 'th-leave') { VIEW = false; history.replaceState(null, '', location.pathname); start(ROOT); return; }
    });
  }
  function onEntryIf(e) { if ($('th-date') && e && e.target && (/^th-(date|time|city|end|netz)$/.test(e.target.id) || e.target.name === 'th-nt')) onEntry(e); }

  function renderAll() {
    syncMethod();
    if (!preset()) return;
    if ($('th-city')) $('th-city').value = S.city;
    if ($('th-tcity')) $('th-tcity').value = S.city;
    ROOT.querySelectorAll('[data-st]').forEach(function (c) { c.checked = !!S.status[c.dataset.st]; c.disabled = VIEW; });
    compute();
    renderList();
    if ($('th-date')) { $('th-date').max = todayYmd(); if (!$('th-date').value) $('th-date').value = todayYmd(); onEntry(); }
    renderRes(); renderTev(); renderCal();
    if (VIEW) ROOT.querySelectorAll('#th-entry form, #th-tev form, #th-data .share-row button:not(#th-ics):not(#th-print)').forEach(function (x) { x.hidden = true; });
  }
  function mount(root) { ROOT = root; root.innerHTML = shell(); renderAll(); }
  function start(root) {
    ROOT = root;
    var hs = location.hash.match(/^#s=([\w-]+)/);
    if (hs) { try { S = sanitize(JSON.parse(b64d(hs[1]))); VIEW = true; mount(root); return; } catch (e) {} }
    if (Store.encrypted() && !Store.key) {
      root.innerHTML = '<form class="k-form th-box th-lock" novalidate onsubmit="return false"><h2 class="th-h">הלוח נעול</h2><div class="field"><label for="th-un">קוד הנעילה</label><input id="th-un" type="password" inputmode="numeric" autocomplete="current-password"></div>' +
        '<div class="share-row"><button class="btn btn-gold" type="submit" id="th-un-ok">לפתוח</button><button class="btn btn-line btn-sm th-danger" type="button" id="th-un-wipe">שכחתי – למחוק הכול</button></div><p class="th-msg" id="th-un-msg" role="status"></p></form>';
      $('th-un-ok').onclick = function () {
        Store.unlock($('th-un').value).then(function (d) { if (!d) { $('th-un-msg').textContent = 'הקוד לא נכון.'; return; } S = sanitize(d); mount(root); });
      };
      $('th-un-wipe').onclick = function () { if (confirm('למחוק את כל הנתונים? אי אפשר לבטל.')) { Store.clear(); S = blank(); mount(root); } };
      return;
    }
    S = sanitize(Store.load()); mount(root);
  }
  function init() {
    H = window.hebcal; C = window.TaharaCore;
    var roots = document.querySelectorAll('[data-th-app]');
    if (!roots.length) return;
    if (!H || !C) { roots.forEach(function (r) { r.innerHTML = '<p class="th-empty">המחשבון לא נטען. מרעננים את הדף.</p>'; }); return; }
    Object.keys(EXTRA_RAV).forEach(function (k) { if (!C.RAV[k]) C.RAV[k] = EXTRA_RAV[k]; });
    MODE = roots[0].getAttribute('data-th-app') || 'full';
    wire.call(null, ROOT = roots[0]);
    start(roots[0]);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
}());
