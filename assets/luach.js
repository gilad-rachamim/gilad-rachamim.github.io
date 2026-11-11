// T – הלוח השבועי לבית הכנסת ביחידה (כלי קודש, רבנות צבאית). גם לכל בית כנסת.
// זמני היום, פרשה וחגים מ-@hebcal/core (נטען מ-jsdelivr). התוכן של הרב נשמר בטלפון (localStorage).
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('lv-form'), board = $('lv-board');
  if (!form || !board) return;
  var H = window.hebcal;
  var DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  var ZM = [
    ['alot', 'עלות השחר', function (z) { return z.alotHaShachar(); }],
    ['netz', 'הנץ', function (z) { return z.sunrise(); }],
    ['shma', 'סוף ק״ש', function (z) { return z.sofZmanShma(); }],
    ['tfila', 'סוף תפילה', function (z) { return z.sofZmanTfilla(); }],
    ['chatzot', 'חצות', function (z) { return z.chatzot(); }],
    ['mincha', 'מנחה גדולה', function (z) { return z.minchaGedola(); }],
    ['shkia', 'שקיעה', function (z) { return z.sunset(); }],
    ['tzeit', 'צאת הכוכבים', function (z) { return z.tzeit(8.5); }]
  ];
  // פסוקי חיזוק, אחד לכל שבוע (מתחלפים לפי מספר השבוע בשנה)
  var PSUKIM = [
    ['חזק ואמץ, אל תערץ ואל תחת, כי עמך ה׳ אלוקיך בכל אשר תלך', 'יהושע א, ט'],
    ['כי ה׳ אלוקיכם ההולך עמכם, להלחם לכם עם אויביכם להושיע אתכם', 'דברים כ, ד'],
    ['ה׳ עוז לעמו יתן, ה׳ יברך את עמו בשלום', 'תהלים כט, יא'],
    ['הנה לא ינום ולא יישן שומר ישראל', 'תהלים קכא, ד'],
    ['חזק ונתחזק בעד עמנו ובעד ערי אלוקינו, וה׳ יעשה הטוב בעיניו', 'שמואל ב י, יב'],
    ['אל תירא כי עמך אני, אל תשתע כי אני אלוקיך', 'ישעיהו מא, י'],
    ['ה׳ ישמר צאתך ובואך מעתה ועד עולם', 'תהלים קכא, ח'],
    ['גם כי אלך בגיא צלמות לא אירא רע כי אתה עמדי', 'תהלים כג, ד'],
    ['קוה אל ה׳, חזק ויאמץ לבך, וקוה אל ה׳', 'תהלים כז, יד'],
    ['ה׳ אורי וישעי ממי אירא, ה׳ מעוז חיי ממי אפחד', 'תהלים כז, א'],
    ['כי לא יטש ה׳ עמו, ונחלתו לא יעזב', 'תהלים צד, יד'],
    ['בטחו בה׳ עדי עד, כי ביה ה׳ צור עולמים', 'ישעיהו כו, ד']
  ];
  // הטורים: [מפתח, כותרת ברירת מחדל, רמז]
  var COLS = [
    ['dvar', 'דבר תורה לפרשה', 'כמה שורות על הפרשה, עם מסר לחיילים'],
    ['chizuk', 'דבר חיזוק', 'מילה טובה לשבוע: על אמונה, על אחדות, על הבית שמחכה'],
    ['musar', 'מוסר שבועי', 'מידה אחת לעבוד עליה השבוע'],
    ['mishna', 'משנה שבועית', 'משנה אחת ללמוד ולחזור עליה כל יום'],
    ['halacha', 'הלכה יומית', 'שורה לכל יום, למשל:\nראשון: ...\nשני: ...'],
    ['tfilot', 'זמני תפילות ביחידה', 'שחרית: 6:15\nמנחה: 13:30\nערבית: אחרי ארוחת ערב'],
    ['shiur', 'שיעורים ולימוד', 'שיעור שבועי: יום שלישי 21:00, בבית הכנסת'],
    ['hodaot', 'הודעות', 'כל מה שחשוב לדעת השבוע'],
    ['free', 'טור חופשי', 'כל דבר אחר: סיפור, שאלה לשבוע, חידה, ברכה']
  ];
  var CITIES = [['31.778,35.235', 'ירושלים', 40], ['32.08,34.78', 'תל אביב', 20], ['32.79,34.99', 'חיפה', 30], ['31.25,34.79', 'באר שבע', 20], ['32.965,35.496', 'צפת', 20], ['32.79,35.53', 'טבריה', 20], ['29.557,34.952', 'אילת', 20], ['31.53,35.1', 'חברון', 20], ['31.35,34.3', 'עוטף עזה', 20], ['33.2,35.57', 'גבול הצפון (קריית שמונה)', 20], ['32.3,35.2', 'שומרון', 20]];

  // ---------- מצב ----------
  var KEY = 'kodesh-luach';
  var st = { title: 'הלוח השבועי', unit: '', sig: '', theme: 'zayit', place: CITIES[0][0], placeName: CITIES[0][1], candle: 'auto', zm: { netz: 1, shma: 1, shkia: 1, tzeit: 1 }, cols: {}, text: {}, names: {}, pasuk: '', week: '' };
  COLS.forEach(function (c) { st.cols[c[0]] = ['dvar', 'chizuk', 'halacha', 'tfilot'].indexOf(c[0]) >= 0 ? 1 : 0; });
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv) Object.keys(sv).forEach(function (k) { st[k] = sv[k]; }); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }

  // ---------- טופס ----------
  var sel = $('lv-place');
  sel.innerHTML = CITIES.map(function (c) { return '<option value="' + c[0] + '">' + c[1] + '</option>'; }).join('') + '<option value="gps">המיקום שלי (מהטלפון)</option><option value="manual">קואורדינטות (בסיס בלי שם)</option>';
  var colsBox = $('lv-cols');
  colsBox.innerHTML = COLS.map(function (c) {
    return '<div class="lv-col"><label class="check"><input type="checkbox" data-col="' + c[0] + '"> <span>' + c[1] + '</span></label>' +
      '<div class="lv-col-body" data-body="' + c[0] + '"><input type="text" data-name="' + c[0] + '" maxlength="30" placeholder="כותרת: ' + c[1] + '"><textarea data-text="' + c[0] + '" maxlength="900" placeholder="' + c[2] + '"></textarea></div></div>';
  }).join('');
  $('lv-zm').innerHTML = ZM.map(function (z) { return '<label class="check"><input type="checkbox" data-zm="' + z[0] + '"> <span>' + z[1] + '</span></label>'; }).join('');

  function fill() {
    ['title', 'unit', 'sig', 'candle', 'pasuk'].forEach(function (k) { var el = form.querySelector('[name=' + k + ']'); if (el) el.value = st[k] || ''; });
    form.querySelectorAll('[name=theme]').forEach(function (r) { r.checked = r.value === (st.theme || 'zayit'); });
    if (!st.week) st.week = isoDay(sunday(add(new Date(), new Date().getDay() === 6 ? 1 : 0)));  // במוצאי שבת: כבר השבוע הבא
    form.querySelector('[name=week]').value = st.week;
    sel.value = CITIES.some(function (c) { return c[0] === st.place; }) ? st.place : 'manual';
    $('lv-coords').value = st.place; $('lv-coords-row').hidden = sel.value !== 'manual';
    colsBox.querySelectorAll('[data-col]').forEach(function (cb) { var k = cb.getAttribute('data-col'); cb.checked = !!st.cols[k]; colsBox.querySelector('[data-body=' + k + ']').hidden = !cb.checked; });
    colsBox.querySelectorAll('[data-text]').forEach(function (t) { t.value = st.text[t.getAttribute('data-text')] || ''; });
    colsBox.querySelectorAll('[data-name]').forEach(function (t) { t.value = st.names[t.getAttribute('data-name')] || ''; });
    $('lv-zm').querySelectorAll('[data-zm]').forEach(function (cb) { cb.checked = !!st.zm[cb.getAttribute('data-zm')]; });
  }
  function readForm() {
    ['title', 'unit', 'sig', 'candle', 'pasuk'].forEach(function (k) { var el = form.querySelector('[name=' + k + ']'); if (el) st[k] = el.value; });
    var th = form.querySelector('[name=theme]:checked'); if (th) st.theme = th.value;
    st.week = form.querySelector('[name=week]').value || st.week;
    if (sel.value === 'manual') { st.place = $('lv-coords').value.replace(/\s/g, ''); st.placeName = 'המיקום שהוזן'; }
    else if (sel.value !== 'gps') { st.place = sel.value; st.placeName = sel.options[sel.selectedIndex].textContent; }
    colsBox.querySelectorAll('[data-col]').forEach(function (cb) { var k = cb.getAttribute('data-col'); st.cols[k] = cb.checked ? 1 : 0; colsBox.querySelector('[data-body=' + k + ']').hidden = !cb.checked; });
    colsBox.querySelectorAll('[data-text]').forEach(function (t) { st.text[t.getAttribute('data-text')] = t.value; });
    colsBox.querySelectorAll('[data-name]').forEach(function (t) { st.names[t.getAttribute('data-name')] = t.value; });
    $('lv-zm').querySelectorAll('[data-zm]').forEach(function (cb) { st.zm[cb.getAttribute('data-zm')] = cb.checked ? 1 : 0; });
  }
  sel.addEventListener('change', function () {
    $('lv-coords-row').hidden = sel.value !== 'manual';
    if (sel.value === 'gps' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function (p) {
        st.place = p.coords.latitude.toFixed(3) + ',' + p.coords.longitude.toFixed(3); st.placeName = 'המיקום שלך';
        $('lv-coords').value = st.place; draw(); save();
      }, function () { sel.value = CITIES[0][0]; });
    }
  });

  // ---------- תאריכים ----------
  function sunday(d) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - x.getDay()); return x; }
  function isoDay(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function parse(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function add(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  var tf = new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jerusalem' });
  function t(d) { return d && !isNaN(d) ? tf.format(d) : ''; }
  function heb(d) { return new H.HDate(d).renderGematriya(true); }
  function hebShort(d) { return heb(d).replace(/ [^ ]+$/, ''); }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function nl(s) { return esc(s).replace(/\n/g, '<br>'); }

  // ---------- ציור הלוח ----------
  function draw() {
    if (!H) { board.innerHTML = '<p style="padding:2rem">טוען את לוח השנה…</p>'; return; }
    var sun = sunday(parse(st.week)), sat = add(sun, 6);
    var ll = (st.place || CITIES[0][0]).split(',').map(Number);
    if (ll.length !== 2 || isNaN(ll[0]) || isNaN(ll[1])) ll = [31.778, 35.235];
    var city = CITIES.filter(function (c) { return c[0] === st.place; })[0];
    var mins = st.candle === 'auto' ? (city ? city[2] : 20) : +st.candle;
    var gl = new H.GeoLocation(st.placeName || '', ll[0], ll[1], 0, 'Asia/Jerusalem');
    var loc = new H.Location(ll[0], ll[1], true, 'Asia/Jerusalem', st.placeName || '', 'IL', undefined, 0);
    var evs = H.HebrewCalendar.calendar({ start: sun, end: sat, il: true, location: loc, candlelighting: true, candleLightingMins: mins, havdalahDeg: 8.5, noMinorFast: false, noSpecialShabbat: false });
    var shabbat = new H.HDate(sat), sedra = H.getSedra(shabbat.getFullYear(), true).lookup(shabbat);
    var parsha = sedra.chag ? '' : 'פרשת ' + sedra.parsha.map(function (p) { return H.Locale.gettext(p, 'he-x-NoNikud'); }).join('-');
    var zmOn = ZM.filter(function (z) { return st.zm[z[0]]; });
    var rows = '';
    for (var i = 0; i < 7; i++) {
      var d = add(sun, i), z = new H.Zmanim(gl, d, false), notes = [];
      evs.forEach(function (e) {
        var ed = e.getDate().greg();
        if (ed.getFullYear() !== d.getFullYear() || ed.getMonth() !== d.getMonth() || ed.getDate() !== d.getDate()) return;
        var desc = e.getDesc();
        if (desc === 'Candle lighting') notes.push('<b>הדלקת נרות ' + t(e.eventTime) + '</b>');
        else if (desc === 'Havdalah') notes.push('<b>צאת ' + (i === 6 ? 'השבת' : 'החג') + ' ' + t(e.eventTime) + '</b>');
        else if (/^Parashat/.test(desc)) return;
        else notes.push(esc(e.render('he-x-NoNikud')));
      });
      rows += '<tr' + (i === 6 ? ' class="sh"' : '') + '><th>' + DAYS[i] + '<small>' + hebShort(d) + ' · ' + d.getDate() + '.' + (d.getMonth() + 1) + '</small></th>' +
        zmOn.map(function (zz) { return '<td>' + t(zz[2](z)) + '</td>'; }).join('') + '<td class="n">' + notes.join('<br>') + '</td></tr>';
    }
    var weekNo = Math.floor((sun - new Date(sun.getFullYear(), 0, 1)) / 6048e5);
    var ps = st.pasuk ? [st.pasuk, ''] : PSUKIM[weekNo % PSUKIM.length];
    var cols = COLS.filter(function (c) { return st.cols[c[0]] && (st.text[c[0]] || '').trim(); }).map(function (c) {
      return '<section class="b-col' + ((st.text[c[0]] || '').length > 420 ? ' wide' : '') + '"><h3>' + esc(st.names[c[0]] || c[1]) + '</h3><p>' + nl(st.text[c[0]]) + '</p></section>';
    }).join('');
    board.className = 'lv-board th-' + (st.theme || 'zayit');
    board.innerHTML =
      '<header class="b-head"><span class="b-bsd">בס״ד</span><h2>' + esc(st.title || 'הלוח השבועי') + '</h2>' +
      (st.unit ? '<p class="b-unit">' + esc(st.unit) + '</p>' : '') +
      '<p class="b-week">' + (parsha ? '<b>' + parsha + '</b> · ' : '') + hebShort(sun) + ' – ' + heb(sat) + ' · ' + sun.getDate() + '.' + (sun.getMonth() + 1) + '–' + sat.getDate() + '.' + (sat.getMonth() + 1) + '.' + sat.getFullYear() + '</p></header>' +
      '<table class="b-zm"><thead><tr><th>יום</th>' + zmOn.map(function (z) { return '<th>' + z[1] + '</th>'; }).join('') + '<th>שבת וחג</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<p class="b-place">זמני היום ל' + esc(st.placeName || 'ירושלים') + ' · הדלקת נרות ' + mins + ' דקות לפני השקיעה · צאת הכוכבים 8.5°</p>' +
      (cols ? '<div class="b-cols">' + cols + '</div>' : '<p class="b-empty">כאן יופיעו הטורים שתכתבו: דבר תורה, חיזוק, הלכה יומית ועוד.</p>') +
      '<footer class="b-foot"><p class="b-pasuk">״' + esc(ps[0]) + '״' + (ps[1] ? '<small>' + ps[1] + '</small>' : '') + '</p>' +
      (st.sig ? '<p class="b-sig">' + esc(st.sig) + '</p>' : '') + '<p class="b-credit">נוצר בחינם בכלי קודש · hakelim.com/kodesh</p></footer>';
    fit();
  }
  // הלוח בגודל A4 (794 פיקסלים), מוקטן להתאים למסך
  function fit() {
    var wrap = $('lv-wrap'), s = Math.min(1, wrap.clientWidth / 794);
    board.style.transform = 'scale(' + s + ')';
    wrap.style.height = Math.ceil(board.offsetHeight * s) + 'px';
  }
  window.addEventListener('resize', fit);

  var timer;
  form.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(function () { readForm(); save(); draw(); }, 150); });
  form.addEventListener('change', function () { readForm(); save(); draw(); });
  $('lv-next').addEventListener('click', function () {
    readForm();
    var d = add(sunday(parse(st.week)), 7); st.week = isoDay(d); form.querySelector('[name=week]').value = st.week;
    if ($('lv-clear').checked) ['dvar', 'chizuk', 'musar', 'mishna', 'halacha'].forEach(function (k) { st.text[k] = ''; });
    st.pasuk = ''; fill(); save(); draw();
  });
  $('lv-this').addEventListener('click', function () { st.week = isoDay(sunday(add(new Date(), new Date().getDay() === 6 ? 1 : 0))); fill(); save(); draw(); });

  function used(how) { if (window.toolUsed) window.toolUsed('luach', { how: how, theme: st.theme, cols: COLS.filter(function (c) { return st.cols[c[0]]; }).length }); }
  $('lv-print').addEventListener('click', function () { used('print'); window.print(); });
  function png() {
    var s = board.style.transform; board.style.transform = 'none';
    return window.htmlToImage.toBlob(board, { pixelRatio: 2, backgroundColor: getComputedStyle(board).backgroundColor }).then(function (b) { board.style.transform = s; return b; }, function (e) { board.style.transform = s; throw e; });
  }
  $('lv-img').addEventListener('click', function () {
    var btn = this, label = btn.textContent; btn.textContent = 'מכין תמונה…';
    png().then(function (b) {
      var name = 'הלוח השבועי ' + st.week + '.png', f = new File([b], name, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [f] })) navigator.share({ files: [f] }).catch(function () {});
      else { var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
      used('image'); btn.textContent = label;
    }).catch(function () { btn.textContent = 'לא הצלחתי ליצור תמונה. אפשר להדפיס כ-PDF'; });
  });

  fill();
  function start() { H = window.hebcal; draw(); }
  if (H) start(); else { var sc = document.querySelector('script[data-hebcal]'); if (sc) sc.addEventListener('load', start); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
})();
