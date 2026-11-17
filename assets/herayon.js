// מחשבון הריון: תאריך לידה משוער, באיזה שבוע, שליש, אבני דרך ותאריך עברי.
// גם בדפי השבועות: "לפי המחשבון שלך את בשבוע X". הכול בדפדפן; התאריכים נשמרים רק ב-localStorage.
// נוסחאות: וסת אחרונה + 280 + (מחזור − 28); החזרת עובר יום 5 + 261, יום 3 + 263 (ACOG 700).
(function () {
  'use strict';
  var KEY = 'hr1', DAY = 864e5;
  function D(y, m, d) { return new Date(y, m, d, 12); }
  function parse(v) { var p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ''); return p ? D(+p[1], p[2] - 1, +p[3]) : null; }
  function add(d, n) { return D(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function diff(a, b) { return Math.round((b - a) / DAY); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function g(d) { return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear(); }
  function today() { var t = new Date(); return D(t.getFullYear(), t.getMonth(), t.getDate()); }
  var WD = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

  // תאריך עברי (כמו ב-taarichim.js)
  var fmt; try { fmt = new Intl.DateTimeFormat('en-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) {}
  var MON = { tishri: 'תשרי', tishrei: 'תשרי', heshvan: 'חשוון', cheshvan: 'חשוון', kislev: 'כסלו', tevet: 'טבת', shevat: 'שבט', 'adar i': 'אדר א׳', 'adar ii': 'אדר ב׳', adar: 'אדר', nisan: 'ניסן', iyar: 'אייר', sivan: 'סיוון', tamuz: 'תמוז', av: 'אב', elul: 'אלול' };
  function gem(n) {
    var ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'], tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'], hunds = ['', 'ק', 'ר', 'ש', 'ת'];
    var s = '';
    while (n >= 400) { s += 'ת'; n -= 400; }
    s += hunds[Math.floor(n / 100)]; n %= 100;
    if (n === 15) s += 'טו'; else if (n === 16) s += 'טז'; else { s += tens[Math.floor(n / 10)]; s += ones[n % 10]; }
    return s.length === 1 ? s + '׳' : s.slice(0, -1) + '״' + s.slice(-1);
  }
  function heb(d) {
    if (!fmt) return '';
    var o = {}; fmt.formatToParts(d).forEach(function (p) { o[p.type] = p.value; });
    var m = (o.month || '').toLowerCase();
    return gem(+o.day) + ' ב' + (MON[m] || m) + ' ' + gem(+o.year % 1000);
  }
  window.hrHeb = { heb: heb, gem: gem, fmt: fmt, MON: MON };

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function save(st) { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }

  // "וסת אחרונה" אפקטיבית, שממנה סופרים את השבועות. תאריך משוער = היא + 280.
  function base(st) {
    var d = parse(st.d); if (!d) return null;
    if (st.m === 'edd') return add(d, -280);
    if (st.m === 'ivf') return add(d, (+st.e === 3 ? 263 : 261) - 280);
    var c = +st.c || 28; return add(d, c - 28);
  }
  function tri(w) { return w < 13 ? 'השליש הראשון' : w < 28 ? 'השליש השני' : 'השליש השלישי'; }
  function wd(w, d) { return w + (d ? '+' + d : ''); }

  // דפי השבוע: באנר קטן לפי מה שנשמר
  var mine = document.getElementById('hr-mine');
  if (mine) {
    var sv = load(), L = sv && base(sv);
    if (L) {
      var ga = diff(L, today()), w = Math.floor(ga / 7), here = +mine.getAttribute('data-week');
      if (ga >= 0 && ga <= 300) {
        mine.innerHTML = w === here ? 'לפי המחשבון שלך – זה השבוע שלך עכשיו 💛'
          : 'לפי המחשבון שלך את בשבוע ' + w + (w >= 4 && w <= 42 ? '. <a class="gold" href="/kelim/herayon/shavua-' + w + '/">לדף של שבוע ' + w + '</a>' : '');
        mine.hidden = false;
      }
    }
  }

  var form = document.getElementById('hr-form');
  if (!form) return;
  var $ = function (id) { return document.getElementById(id); };
  var mode = 'lmp';
  var LBL = { lmp: 'היום הראשון של הווסת האחרונה', edd: 'תאריך הלידה המשוער שקיבלת מהרופא/ה', ivf: 'תאריך החזרת העובר' };
  function setMode(m) {
    mode = m;
    [].forEach.call($('hr-mode').querySelectorAll('button'), function (b) { b.setAttribute('aria-selected', b.getAttribute('data-m') === m ? 'true' : 'false'); });
    $('hr-date-l').textContent = LBL[m];
    [].forEach.call(form.querySelectorAll('[data-for]'), function (el) { el.hidden = el.getAttribute('data-for') !== m; });
  }
  $('hr-mode').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) setMode(b.getAttribute('data-m')); });

  var MILES = [
    ['שקיפות עורפית וסקר שליש ראשון', 77, 97],
    ['סוף השליש הראשון', 91],
    ['סקירת מערכות מוקדמת', 84, 118],
    ['תבחין משולש', 112, 139],
    ['סקירת מערכות מאוחרת', 140, 174],
    ['העמסת סוכר', 168, 202],
    ['תחילת השליש השלישי', 196],
    ['תרבית GBS', 252, 265],
    ['שבוע 37 – מכאן זו לידה במועד', 259],
    ['תאריך הלידה המשוער (שבוע 40)', 280],
    ['שבוע 42 – הצוות ידבר איתך על המשך', 294]
  ];
  MILES.sort(function (a, b) { return a[1] - b[1]; });

  function render(st) {
    var L = base(st), err = $('hr-err'), res = $('hr-res');
    err.textContent = '';
    if (!L) { err.textContent = 'בחרי תאריך.'; res.hidden = true; return; }
    if (st.m === 'lmp' && (+st.c < 21 || +st.c > 40)) { err.textContent = 'אורך מחזור בין 21 ל-40 ימים.'; res.hidden = true; return; }
    var t = today(), ga = diff(L, t), edd = add(L, 280);
    if (st.m !== 'edd' && parse(st.d) > t) { err.textContent = 'התאריך שבחרת עוד לא הגיע. בדקי אותו שוב.'; res.hidden = true; return; }
    if (ga > 300) { err.textContent = 'לפי התאריך הזה ההריון כבר הסתיים. בדקי את התאריך.'; res.hidden = true; return; }
    var w = Math.floor(ga / 7), d = ga % 7, h = [];
    h.push('<div class="hr-big"><span class="lbl">תאריך לידה משוער</span><strong>' + g(edd) + '</strong><span class="hd">יום ' + WD[edd.getDay()] + ' · ' + heb(edd) + '</span></div>');
    if (ga >= 0) {
      var pct = Math.min(100, Math.round(ga / 280 * 100)), r = 280 - ga;
      h.push('<p class="hr-now">את בשבוע <b>' + w + '</b>' + (d === 1 ? ' ויום אחד' : d ? ' ו-<b>' + d + '</b> ימים' : '') + ' · ' + tri(w) + '</p>');
      h.push('<div class="hr-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><i style="width:' + pct + '%"></i></div>');
      h.push('<p class="hr-left">' + (r > 0 ? 'נשארו עוד כ-' + Math.floor(r / 7) + ' שבועות' + (r % 7 === 1 ? ' ויום אחד' : r % 7 ? ' ו-' + (r % 7) + ' ימים' : '') + ' עד התאריך המשוער.' : r === 0 ? 'היום הוא התאריך המשוער. בשעה טובה!' : 'עברו ' + (-r) + ' ימים מהתאריך המשוער. הצוות הרפואי מלווה אותך מקרוב.') + '</p>');
    } else {
      h.push('<p class="hr-now">ההריון לפי החישוב יתחיל בעוד ' + (-ga) + ' ימים.</p>');
    }
    var wk = Math.max(4, Math.min(42, w));
    h.push('<a class="hr-week" href="/kelim/herayon/shavua-' + wk + '/"><span class="lbl">השבוע שלך</span><b>שבוע ' + wk + ' להריון</b><span>' + (w < 4 ? 'דפי השבועות מתחילים משבוע 4 – הנה הראשון' : 'מה קורה אצל התינוק, מה את מרגישה, טיפ, מילה טובה ונקודה תורנית') + ' ←</span></a>');
    h.push('<h3 class="hr-h3">התאריכים החשובים</h3><ul class="hr-miles">');
    MILES.forEach(function (m) {
      var a = add(L, m[1]), b = m[2] ? add(L, m[2]) : null, past = diff(b || a, t) > 0;
      var wlab = 'שבוע ' + wd(Math.floor(m[1] / 7), m[1] % 7) + (m[2] ? '–' + wd(Math.floor(m[2] / 7), m[2] % 7) : '');
      h.push('<li' + (past ? ' class="past"' : '') + '><b>' + m[0] + '</b><span>' + (b ? g(a) + ' – ' + g(b) : g(a) + ' · ' + heb(a)) + '</span><small>' + wlab + '</small></li>');
    });
    h.push('</ul><p class="note">את מועדי הבדיקות קובעים עם הרופא/ה או האחות. הטווחים לפי משרד הבריאות.</p>');
    var txt = (ga >= 0 && w >= 1 ? 'אנחנו בשבוע ' + w + ' להריון! ' : '') + 'תאריך לידה משוער: ' + g(edd) + ' (' + heb(edd) + '). מחשבון הריון בחינם: https://hakelim.com/kelim/herayon/';
    h.push('<div class="share-row"><a class="btn btn-gold btn-sm" id="hr-wa" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(txt) + '"><svg class="ic"><use href="#wa"/></svg> לשתף בווטסאפ</a></div>');
    h.push($('hr-mohel-tpl') ? $('hr-mohel-tpl').innerHTML : '');
    h.push('<p class="disclaimer">התאריך הוא הערכה. רוב הלידות קורות בין שבוע 37 לשבוע 42, ואת התאריך המדויק קובע/ת הרופא/ה, בדרך כלל לפי האולטרסאונד.</p>');
    res.innerHTML = h.join('');
    res.hidden = false;
    var wa = $('hr-wa'); if (wa) wa.addEventListener('click', function () { if (window.toolUsed) window.toolUsed('herayon', { how: 'wa' }); });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var st = { m: mode, d: $('hr-date').value, c: $('hr-cycle').value || 28, e: $('hr-emb').value };
    save(st); render(st);
    $('hr-res').scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (window.toolUsed) window.toolUsed('herayon', { how: 'calc', mode: mode });
  });

  var sv0 = load();
  if (sv0 && sv0.d) {
    setMode(sv0.m || 'lmp'); $('hr-date').value = sv0.d; $('hr-cycle').value = sv0.c || 28; $('hr-emb').value = sv0.e || 5;
    render(sv0);
  } else setMode('lmp');
  window.hrCalc = { base: base, add: add, g: g, heb: heb };
})();
