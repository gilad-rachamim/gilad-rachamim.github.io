// טופס פרטי הברית – כלי קודש למוהלים. ההורים ממלאים בטלפון, והכול יוצא בהודעת ווטסאפ אחת למוהל שלהם.
// שום פרט לא נשלח לשרת: הטיוטה נשמרת רק בטלפון של ההורים (localStorage), וההודעה נפתחת בווטסאפ.
// קישור אישי של מוהל: /kodesh/tofes-brit/?m=9725XXXXXXXX&n=שם המוהל
// בסוף ההודעה קישור ‎/kodesh/britot/?add=…‎ שמכניס את הברית ליומן הבריתות של המוהל (assets/britot.js).
// חישוב מועד הברית והשקיעה: אותן נוסחאות של מחשבון מועד הברית (assets/moed.js).
(function () {
  'use strict';
  var DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  var SITE = 'https://hakelim.com';
  var DKEY = 'kodesh-tofes-brit', MKEY = 'kodesh-tofes-brit-mohel';
  var $ = function (id) { return document.getElementById(id); };
  function ev(n, p) { if (window.kelimEv) window.kelimEv(n, Object.assign({ tool: 'tofes_brit' }, p || {})); }

  // ---------- תאריך עברי (כמו moed.js) ----------
  var enFmt = new Intl.DateTimeFormat('en-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric' });
  var MONTHS = { tishri: 'תשרי', tishrei: 'תשרי', heshvan: 'חשוון', cheshvan: 'חשוון', kislev: 'כסלו', tevet: 'טבת', shevat: 'שבט', 'adar i': 'אדר א׳', 'adar ii': 'אדר ב׳', adar: 'אדר', nisan: 'ניסן', iyar: 'אייר', sivan: 'סיוון', tamuz: 'תמוז', av: 'אב', elul: 'אלול' };
  function gem(n) {
    var ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'], tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'], hunds = ['', 'ק', 'ר', 'ש', 'ת'];
    var s = '';
    while (n >= 400) { s += 'ת'; n -= 400; }
    s += hunds[Math.floor(n / 100)]; n %= 100;
    if (n === 15) s += 'טו'; else if (n === 16) s += 'טז'; else { s += tens[Math.floor(n / 10)]; s += ones[n % 10]; }
    return s.length === 1 ? s + '׳' : s.slice(0, -1) + '״' + s.slice(-1);
  }
  function heParts(d) {
    var o = {};
    enFmt.formatToParts(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12)).forEach(function (p) { o[p.type] = p.value; });
    return { day: parseInt(o.day, 10), month: (o.month || '').toLowerCase(), year: parseInt(o.year, 10) };
  }
  function hebrew(d) { var h = heParts(d); return gem(h.day) + ' ב' + (MONTHS[h.month] || h.month) + ' ' + gem(h.year % 1000); }
  function holiday(d) {
    var h = heParts(d), m = h.month, n = h.day;
    if (/^tishri|^tishrei/.test(m)) {
      if (n === 1 || n === 2) return 'ראש השנה';
      if (n === 10) return 'יום הכיפורים';
      if (n === 15) return 'סוכות';
      if (n === 22) return 'שמחת תורה';
      if (n >= 16 && n <= 21) return 'חול המועד סוכות';
    }
    if (/^nisan/.test(m)) {
      if (n === 15) return 'פסח';
      if (n === 21) return 'שביעי של פסח';
      if (n >= 16 && n <= 20) return 'חול המועד פסח';
    }
    if (/^sivan/.test(m) && n === 6) return 'שבועות';
    return '';
  }
  function isYomTov(name) { return name && !/חול המועד/.test(name); }

  // ---------- שקיעה (NOAA, כמו moed.js) ----------
  function israelOffset(d) {
    var y = d.getFullYear();
    function lastSunday(month) { var x = new Date(Date.UTC(y, month + 1, 0)); return new Date(Date.UTC(y, month, x.getUTCDate() - x.getUTCDay())); }
    var start = lastSunday(2); start = new Date(start.getTime() - 2 * 864e5); start.setUTCHours(0, 0, 0, 0);
    var end = lastSunday(9); end.setUTCHours(23, 0, 0, 0);
    var t = Date.UTC(y, d.getMonth(), d.getDate(), 12);
    return (t >= start.getTime() && t < end.getTime()) ? 3 : 2;
  }
  function sunset(d, lat, lon) {
    var rad = Math.PI / 180;
    var y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
    var a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
    var jd = day + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
    var n = jd - 2451545 + 0.0008 - lon / 360;
    var M = (357.5291 + 0.98560028 * n) % 360;
    var C = 1.9148 * Math.sin(M * rad) + 0.02 * Math.sin(2 * M * rad) + 0.0003 * Math.sin(3 * M * rad);
    var L = (M + C + 180 + 102.9372) % 360;
    var Jt = 2451545 + n + 0.0053 * Math.sin(M * rad) - 0.0069 * Math.sin(2 * L * rad);
    var dec = Math.asin(Math.sin(L * rad) * Math.sin(23.4397 * rad));
    var cosw = (Math.sin(-0.833 * rad) - Math.sin(lat * rad) * Math.sin(dec)) / (Math.cos(lat * rad) * Math.cos(dec));
    var w = Math.acos(cosw) / rad;
    var Jset = Jt + w / 360;
    var local = ((Jset - Math.floor(Jset)) * 24 + 12) % 24 + israelOffset(d);
    var hh = Math.floor(local), mi = Math.round((local - hh) * 60);
    if (mi === 60) { hh++; mi = 0; }
    return { h: hh, m: mi, text: (hh < 10 ? '0' : '') + hh + ':' + (mi < 10 ? '0' : '') + mi };
  }

  // ---------- עזרים ----------
  function addDays(d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; }
  function fmtG(d) { return d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear(); }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function parseDate(s) { if (!s) return null; var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function dayHe(d) { return 'יום ' + DAYS[d.getDay()] + ', ' + hebrew(d); }
  function intl(p) { p = (p || '').replace(/\D/g, ''); if (!p) return ''; if (p.indexOf('00') === 0) p = p.slice(2); return p.charAt(0) === '0' ? '972' + p.slice(1) : p; }
  function local(p) { p = intl(p); return p.indexOf('972') === 0 ? '0' + p.slice(3) : p; }
  function b64(obj) {
    var s = unescape(encodeURIComponent(JSON.stringify(obj)));
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  // ---------- המוהל מהקישור ----------
  var qs = new URLSearchParams(location.search);
  var mohelNum = intl(qs.get('m') || '');
  if (!/^\d{11,13}$/.test(mohelNum)) mohelNum = '';
  var mohelName = (qs.get('n') || '').replace(/[<>"']/g, '').trim().slice(0, 40);
  var form = $('tb-form');
  if (!form) return;
  document.body.classList.toggle('tb-has-mohel', !!mohelNum);
  if (mohelNum) {
    $('tb-for').hidden = false;
    $('tb-for').textContent = mohelName ? 'הטופס של ' + mohelName : 'הטופס של המוהל שלכם';
    $('tb-send').innerHTML = '<svg class="ic"><use href="#wa"/></svg> לשלוח ' + (mohelName ? 'ל' + mohelName : 'למוהל') + ' בווטסאפ';
  }

  // ---------- חישוב מועד הברית ----------
  var F = function (n) { var el = form.elements[n]; return el ? (el.type === 'checkbox' ? el.checked : el.value.trim()) : ''; };
  function calc() {
    var born = parseDate(F('birth'));
    if (!born) return null;
    var opt = form.hosp.options[form.hosp.selectedIndex], ll = form.hosp.value.split(',');
    var lat = +ll[0] || 31.778, lon = +ll[1] || 35.235;
    var s = sunset(born, lat, lon), state = '';
    if (F('btime')) {
      var t = F('btime').split(':'), mins = (+t[0]) * 60 + (+t[1]), sm = s.h * 60 + s.m;
      state = (mins >= sm - 20 && mins <= sm + 25) ? 'near' : (mins > sm ? 'after' : 'before');
    }
    var halachic = state === 'after' ? addDays(born, 1) : born;
    var brit = addDays(halachic, 7), hol = holiday(brit), shabbat = brit.getDay() === 6, postponed = null;
    if (F('cs') && (shabbat || isYomTov(hol))) {
      var x = addDays(brit, 1);
      while (x.getDay() === 6 || isYomTov(holiday(x))) x = addDays(x, 1);
      postponed = x;
    }
    return { born: born, halachic: halachic, brit: brit, main: postponed || brit, postponed: postponed, shabbat: shabbat, holiday: hol, state: state, sunset: s.text, city: opt.getAttribute('data-city') || 'ירושלים' };
  }
  function showCalc() {
    var r = calc(), box = $('tb-moed');
    if (!r) { box.hidden = true; return; }
    var notes = [];
    if (r.state === 'near') notes.push('הלידה הייתה סמוך לשקיעה (השקיעה באותו יום: ' + r.sunset + '). המוהל יבדוק איתכם את המועד המדויק.');
    else if (r.state === 'after') notes.push('הלידה הייתה אחרי השקיעה (' + r.sunset + '), ולכן היום ההלכתי הוא כבר המחרת.');
    else if (!r.state) notes.push('בלי שעת לידה, החישוב לפי לידה לפני השקיעה.');
    if (r.postponed) notes.push('אחרי ניתוח קיסרי הברית לא נעשית בשבת וביום טוב, ולכן היא נדחית ליום החול הבא.');
    else if (r.shabbat) notes.push('הברית חלה בשבת. המוהל יתאם איתכם את ההכנות.');
    else if (r.holiday) notes.push('הברית חלה ב' + r.holiday + '.');
    box.innerHTML = '<div class="tb-moed-k">מועד הברית לפי החישוב, בעזרת ה\':</div><div class="tb-moed-d">' + dayHe(r.main) + '</div><div class="tb-moed-g">' + fmtG(r.main) + '</div>' +
      '<ul>' + notes.map(function (n) { return '<li>' + n + '</li>'; }).join('') + '<li>המועד הסופי לפי הנחיות המוהל, כשהתינוק בריא ומוכן לגמרי.</li></ul>';
    box.hidden = false;
  }

  // ---------- טיוטה בטלפון ----------
  function saveDraft() {
    var o = {};
    Array.prototype.forEach.call(form.elements, function (el) { if (el.name) o[el.name] = el.type === 'checkbox' ? el.checked : el.value; });
    try { localStorage.setItem(DKEY, JSON.stringify(o)); } catch (e) {}
  }
  function loadDraft() {
    var o; try { o = JSON.parse(localStorage.getItem(DKEY) || 'null'); } catch (e) { o = null; }
    if (!o) return;
    Object.keys(o).forEach(function (k) { var el = form.elements[k]; if (!el || !el.name) return; if (el.type === 'checkbox') el.checked = !!o[k]; else el.value = o[k]; });
  }
  function hospOther() { $('tb-hosp-other').hidden = form.hosp.selectedIndex !== form.hosp.options.length - 1; }
  var started = false;
  form.addEventListener('input', function () {
    showCalc(); hospOther(); saveDraft();
    if (!started) { started = true; ev('tofes_brit_start', { mohel: mohelNum ? 'link' : 'none' }); }
  });
  form.addEventListener('change', function () { showCalc(); hospOther(); saveDraft(); });

  // ---------- ההודעה ----------
  function hospName() {
    if (!$('tb-hosp-other').hidden) return F('hospOther');
    return form.hosp.selectedIndex ? form.hosp.options[form.hosp.selectedIndex].textContent : '';
  }
  function jaundice() {
    var v = F('jval'), w = F('jwhen');
    if (!v && !w) return '';
    var s = v || 'נבדקה';
    if (w) { var p = w.split('T'), d = parseDate(p[0]); s += ' · נבדקה ' + (d ? d.getDate() + '.' + (d.getMonth() + 1) : '') + (p[1] ? ' בשעה ' + p[1].slice(0, 5) : ''); }
    return s;
  }
  function build() {
    var r = calc(), L = [], line = '━━━━━━━━━━';
    var row = function (ic, k, v) { if (v) L.push(ic + ' *' + k + ':* ' + v); };
    L.push('*🍼 פרטי הברית*');
    L.push(line);
    row('👨‍👩‍👦', 'ההורים', F('parents'));
    row('📞', 'טלפון', F('phone'));
    L.push(line);
    if (r) row('👶', 'הלידה', dayHe(r.born) + ' · ' + fmtG(r.born) + (F('btime') ? ' · בשעה ' + F('btime') : ''));
    row('🏥', 'בית החולים', hospName());
    row('⚖️', 'משקל', F('weight') ? F('weight') + (/[א-ת]/.test(F('weight')) ? '' : (+F('weight') > 100 ? ' גרם' : ' ק״ג')) : '');
    row('🟡', 'צהבת', jaundice());
    if (F('cs')) L.push('✂️ *הלידה בניתוח קיסרי*');
    L.push(line);
    if (r) {
      row('📅', 'הברית לפי החישוב', dayHe(r.main) + ' · ' + fmtG(r.main));
      if (r.state === 'near') L.push('⚠️ הלידה סמוך לשקיעה (' + r.sunset + '), צריך לבדוק את המועד');
    }
    row('🕰️', 'שעת הברית', F('time'));
    row('📍', 'מקום הברית', F('place'));
    row('📜', 'נוסח', F('nusach').replace(/^נוסח\s*/, ''));
    row('🤝', 'סנדק', F('sandak'));
    row('📝', 'הערות', F('notes'));
    L.push(line);
    L.push('➕ להכניס ליומן הבריתות:');
    L.push(SITE + '/kodesh/britot/?add=' + b64(payload(r)));
    L.push('_נשלח מטופס פרטי הברית · hakelim.com/kodesh/tofes-brit_');
    return L.join('\n');
  }
  // רשומה ליומן הבריתות, במפתחות קצרים כדי שהקישור יהיה קצר
  function payload(r) {
    var n = [];
    if (F('btime')) n.push('שעת לידה ' + F('btime'));
    if (hospName()) n.push(hospName());
    if (F('weight')) n.push('משקל ' + F('weight'));
    if (jaundice()) n.push('צהבת ' + jaundice());
    if (F('cs')) n.push('ניתוח קיסרי');
    if (r && r.state === 'near') n.push('לידה סמוך לשקיעה');
    if (F('nusach')) n.push('נוסח ' + F('nusach').replace(/^נוסח\s*/, ''));
    if (F('notes')) n.push(F('notes'));
    var o = { v: 1, d: r ? iso(r.main) : '', t: F('time'), p: F('parents'), ph: F('phone'), pl: F('place'), s: F('sandak'), b: r ? iso(r.born) : '', n: n.join(' · ') };
    Object.keys(o).forEach(function (k) { if (o[k] === '') delete o[k]; });
    return o;
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!F('birth')) { alert('כתבו בבקשה את תאריך הלידה.'); form.birth.focus(); return; }
    if (!F('parents')) { alert('כתבו בבקשה את שם ההורים.'); form.parents.focus(); return; }
    var text = build();
    var url = mohelNum ? 'https://wa.me/' + mohelNum + '?text=' + encodeURIComponent(text) : 'https://api.whatsapp.com/send?text=' + encodeURIComponent(text);
    ev('tofes_brit_send', { mohel: mohelNum ? 'link' : 'none' });
    if (window.toolUsed) window.toolUsed('tofes_brit');
    $('tb-sent').hidden = false;
    window.open(url, '_blank', 'noopener') || (location.href = url);
  });
  $('tb-clear').addEventListener('click', function () {
    if (!confirm('לנקות את כל מה שמילאתם?')) return;
    form.reset(); try { localStorage.removeItem(DKEY); } catch (e) {}
    showCalc(); hospOther(); $('tb-sent').hidden = true;
  });

  // ---------- למוהלים: קישור אישי ----------
  var mf = $('tb-mk');
  function mkLink() {
    var num = intl(mf.mnum.value), nm = mf.mname.value.trim();
    if (!/^\d{11,13}$/.test(num)) return '';
    return SITE + '/kodesh/tofes-brit/?m=' + num + (nm ? '&n=' + encodeURIComponent(nm) : '');
  }
  function mkShow() {
    var l = mkLink(), out = $('tb-mk-out');
    out.hidden = !l;
    if (!l) return;
    $('tb-mk-link').textContent = l;
    $('tb-mk-try').href = l;
    var msg = 'מזל טוב! 🎉\nכדי שאכין הכול לברית, מלאו בבקשה את הפרטים בקישור. זה כמה דקות, והפרטים מגיעים אליי ישר לווטסאפ:\n' + l;
    $('tb-mk-wa').href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(msg);
    try { localStorage.setItem(MKEY, JSON.stringify({ num: mf.mnum.value, name: mf.mname.value })); } catch (e) {}
  }
  if (mf) {
    try { var m = JSON.parse(localStorage.getItem(MKEY) || 'null'); if (m) { mf.mnum.value = m.num || ''; mf.mname.value = m.name || ''; } } catch (e) {}
    mf.addEventListener('input', mkShow);
    mf.addEventListener('submit', function (e) { e.preventDefault(); mkShow(); });
    $('tb-mk-copy').addEventListener('click', function () {
      var b = this, l = mkLink();
      (navigator.clipboard ? navigator.clipboard.writeText(l) : Promise.reject()).then(function () { b.textContent = 'הועתק ✓'; }).catch(function () { b.textContent = 'סמנו את הקישור והעתיקו'; });
      ev('tofes_brit_link', { how: 'copy' });
    });
    $('tb-mk-wa').addEventListener('click', function () { ev('tofes_brit_link', { how: 'wa' }); });
    mkShow();
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-copy-tpl]'); if (!b) return;
    var t = $('tb-tpl').innerText;
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { b.textContent = 'הועתק ✓ עכשיו להדביק בווטסאפ'; }).catch(function () { b.textContent = 'סמנו את הטקסט והעתיקו'; });
    ev('tofes_brit_link', { how: 'wa_template' });
  });

  loadDraft(); hospOther(); showCalc();
  window.__tofes = { calc: calc, build: build, payload: payload };
})();
