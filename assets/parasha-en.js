/* Torah portion this week (/kodesh/parasha/en/): this Shabbat's parsha, the coming weeks, the year table,
   and "What is my Torah portion?" for a bar / bat mitzvah or a birth date.
   פרשת השבוע באנגלית. החישוב: hebcal-core (getSedra), חו"ל וישראל. טווחי הפסוקים: ספריא (tools/data/parshiot-sefaria.json).
   אותו קוד רץ גם ב-node (tools/parasha_en.js) כדי לכתוב בדף טבלה קבועה לגוגל. */
(function (root) {
  'use strict';

  function core(H, REFS) {
    var P = H.parshiot, cache = {};
    function sedra(y, il) { var k = y + (il ? 'i' : 'd'); return cache[k] || (cache[k] = H.getSedra(y, il)); }
    function lookup(sat, il) { return sedra(sat.getFullYear(), il).lookup(sat); }
    function heName(n) { var t = H.Locale.gettext(n, 'he-x-NoNikud'); return t && t !== n ? t : ''; }
    function info(r) {
      if (r.chag) return { en: r.parsha[0], he: heName(r.parsha[0]), chag: true, refs: [] };
      var refs = r.parsha.map(function (n) { var i = P.indexOf(n); return i < 0 ? null : { name: n, i: i, book: REFS[i][0], ref: REFS[i][1] }; }).filter(Boolean);
      return { en: r.parsha.join('-'), he: r.parsha.map(heName).join('-'), chag: false, refs: refs, num: r.num };
    }
    function sefaria(ref) { return 'https://www.sefaria.org/' + ref.replace(' ', '.').replace(/:/g, '.') + '?lang=bi'; }
    function verses(ref) { return ref.replace('-', '–'); }
    function satOf(d) { return new H.HDate(d).onOrAfter(6); }
    function week(sat) {
      var d = info(lookup(sat, false)), i = info(lookup(sat, true));
      return { sat: sat, greg: sat.greg(), dia: d, il: i, same: d.en === i.en };
    }
    function weeks(from, n) { var out = [], s = satOf(from); for (var k = 0; k < n; k++) { out.push(week(s)); s = s.add(7); } return out; }
    function year(hy) {
      var out = [], s = new H.HDate(1, 7, hy).onOrAfter(6);
      while (s.getFullYear() === hy) { out.push(week(s)); s = s.add(7); }
      return out;
    }
    // תאריך בר/בת מצווה: אותו יום ואותו חודש עברי, 13 (בן) או 12 (בת) שנים אחרי. אדר בשנה מעוברת – מוצגות שתי האפשרויות.
    function mitzvah(birth, afterSunset, age) {
      var hd = new H.HDate(birth); if (afterSunset) hd = hd.next();
      var ty = hd.getFullYear() + age, mm = hd.getMonth(), dd = hd.getDate(), opts = [], warn = '';
      var leapB = H.HDate.isLeapYear(hd.getFullYear()), leapT = H.HDate.isLeapYear(ty);
      if (mm === 12 || mm === 13) {
        if (!leapT) opts = [12];
        else if (leapB) opts = [mm];
        else { opts = [12, 13]; warn = 'adar'; }
      } else opts = [mm];
      var list = opts.map(function (m) {
        var day = dd, dim = H.HDate.daysInMonth(m, ty);
        if (day > dim) { warn = warn || 'thirty'; }
        var t = day > dim ? new H.HDate(dim, m, ty).next() : new H.HDate(day, m, ty);
        return { hd: t, greg: t.greg(), sat: satOf(t.greg()), w: week(satOf(t.greg())) };
      });
      return { born: hd, bornWeek: week(satOf(hd.greg())), list: list, warn: warn, age: age };
    }
    return { P: P, REFS: REFS, info: info, week: week, weeks: weeks, year: year, satOf: satOf, mitzvah: mitzvah, sefaria: sefaria, verses: verses, heName: heName };
  }

  if (typeof module !== 'undefined' && module.exports) { module.exports = { core: core }; return; }

  var doc = root.document, $ = function (id) { return doc.getElementById(id); };
  if (!$('pa') || !root.hebcal || !root.PA_REFS) return;
  var H = root.hebcal, C = core(H, root.PA_REFS), KEY = 'parasha-en', st = { il: false };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv) st.il = !!sv.il; } catch (e) {}
  try { var q = new URLSearchParams(location.search).get('il'); if (q === '1') st.il = true; else if (q === '0') st.il = false; } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function used(how) { if (root.toolUsed) root.toolUsed('parasha_en', { how: how }); }
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); };
  var fD = function (d, o) { return d.toLocaleDateString('en-US', o || { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }); };
  var place = function () { return st.il ? 'Israel' : 'outside Israel (USA and the diaspora)'; };

  function readLinks(x) {
    if (x.chag) return '<span>A special holiday reading replaces the weekly portion this Shabbat.</span>';
    return x.refs.map(function (r) { return '<a href="' + C.sefaria(r.ref) + '" target="_blank" rel="noopener">Read ' + esc(r.name) + ' · ' + esc(C.verses(r.ref)) + '</a>'; }).join('');
  }
  function heroHtml(w) {
    var x = st.il ? w.il : w.dia, o = st.il ? w.dia : w.il;
    var book = x.chag ? '' : x.refs[0].book + (x.refs.length > 1 ? ' · double portion' : '');
    var h = '<p class="pa-when">Shabbat ' + esc(fD(w.greg, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })) + ' · ' + esc(w.sat.render('en')) + '</p>' +
      '<p class="pa-name"><b>' + (x.chag ? '' : 'Parashat ') + esc(x.en) + '</b>' + (x.he ? ' <span lang="he" dir="rtl">' + esc(x.he) + '</span>' : '') + '</p>' +
      (book ? '<p class="pa-book">' + esc(book) + '</p>' : '') + '<p class="pa-read">' + readLinks(x) + '</p>';
    if (!w.same) h += '<p class="pa-diff">In ' + (st.il ? 'the diaspora' : 'Israel') + ' this Shabbat: <b>' + esc(o.en) + '</b>. Israel and the diaspora are on different portions for a few weeks; the calendars line up again later in the year.</p>';
    return h;
  }
  function rowHtml(w, now) {
    var x = st.il ? w.il : w.dia, o = st.il ? w.dia : w.il;
    return '<tr' + (now ? ' class="now"' : '') + '><th scope="row">' + esc(fD(w.greg, { month: 'short', day: 'numeric', year: 'numeric' })) + '</th><td><b>' + esc(x.en) + '</b>' + (x.he ? ' <span lang="he" dir="rtl">' + esc(x.he) + '</span>' : '') +
      '</td><td>' + (x.chag ? 'Holiday reading' : esc(x.refs.map(function (r) { return C.verses(r.ref); }).join('; '))) + '</td><td>' + (w.same ? '<span class="pa-same">same</span>' : esc(o.en)) + '</td></tr>';
  }
  var today = new Date(), thisSat = C.satOf(today);

  function draw() {
    var list = C.weeks(today, 9), w = list[0];
    $('pa-hero').innerHTML = heroHtml(w);
    $('pa-next').innerHTML = list.slice(1).map(function (x) { return rowHtml(x, false); }).join('');
    $('pa-where').textContent = 'Showing the reading for ' + place() + '.';
    doc.querySelectorAll('#pa-loc button').forEach(function (b) { b.setAttribute('aria-pressed', String((b.getAttribute('data-il') === '1') === st.il)); });
    doc.querySelectorAll('.pa-other').forEach(function (e) { e.textContent = st.il ? 'Diaspora' : 'In Israel'; });
    var x = st.il ? w.il : w.dia, sh = doc.querySelector('[data-share-tool]');
    if (sh) sh.setAttribute('data-text', 'This week\'s Torah portion: ' + (x.chag ? x.en : 'Parashat ' + x.en) + (x.chag ? '' : ' (' + x.refs.map(function (r) { return C.verses(r.ref); }).join('; ') + ')') + '. Free calendar of all the portions, no ads:');
    drawYear(); drawList();
  }
  function drawYear() {
    var y = +$('pa-y').value, rows = C.year(y);
    $('pa-ycap').textContent = 'Torah portions for the Jewish year ' + y + ' (' + rows[0].greg.getFullYear() + '–' + (rows[0].greg.getFullYear() + 1) + '), ' + place();
    $('pa-yrows').innerHTML = rows.map(function (r) { return rowHtml(r, r.sat.abs() === thisSat.abs()); }).join('');
  }
  // תאריך הקריאה של כל פרשה בשנה הנוכחית ברשימת 54 הפרשות
  function drawList() {
    var y = thisSat.getFullYear(), seen = {};
    C.year(y).forEach(function (w) { var x = st.il ? w.il : w.dia; if (!x.chag) x.refs.forEach(function (r) { if (!seen[r.i]) seen[r.i] = w.greg; }); });
    doc.querySelectorAll('#pa-all [data-i]').forEach(function (td) { var d = seen[+td.getAttribute('data-i')]; td.textContent = d ? fD(d, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'; });
    var c = $('pa-allcap'); if (c) c.textContent = 'The 54 Torah portions, with the Shabbat each is read in ' + y + ' (' + place() + ')';
  }
  doc.querySelectorAll('#pa-loc button').forEach(function (b) {
    b.addEventListener('click', function () { st.il = b.getAttribute('data-il') === '1'; save(); used(st.il ? 'israel' : 'diaspora'); draw(); if (lastM) calc(); });
  });
  var ys = $('pa-y'), hy = thisSat.getFullYear();
  ys.innerHTML = [hy - 1, hy, hy + 1, hy + 2].map(function (y) { return '<option value="' + y + '"' + (y === hy ? ' selected' : '') + '>' + y + ' (' + new H.HDate(1, 7, y).greg().getFullYear() + '–' + (new H.HDate(1, 7, y).greg().getFullYear() + 1) + ')</option>'; }).join('');
  ys.addEventListener('change', function () { used('year'); drawYear(); });

  // "What is my Torah portion?"
  var lastM = null;
  function calc() {
    var v = $('pb-d').value, out = $('pb-out');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) { out.innerHTML = '<p>Choose a date of birth first.</p>'; return; }
    var p = v.split('-').map(Number), age = $('pb-girl').checked ? 12 : 13, m = C.mitzvah(new Date(p[0], p[1] - 1, p[2]), $('pb-sun').checked, age);
    lastM = m;
    var pick = function (w) { var x = st.il ? w.il : w.dia; return x.chag ? esc(x.en) + ' (holiday reading)' : 'Parashat ' + esc(x.en) + (x.he ? ' <span lang="he" dir="rtl">' + esc(x.he) + '</span>' : ''); };
    var h = '<p><b>Hebrew birthday:</b> ' + esc(m.born.render('en')) + ' · <span lang="he" dir="rtl">' + esc(m.born.renderGematriya(true)) + '</span></p>' +
      '<p><b>Torah portion of the birth week:</b> ' + pick(m.bornWeek) + ', read on Shabbat, ' + esc(fD(m.bornWeek.greg, { month: 'long', day: 'numeric', year: 'numeric' })) + '.</p>';
    m.list.forEach(function (o) {
      h += '<div class="pb-card"><p><b>' + (age === 13 ? 'Bar' : 'Bat') + ' mitzvah (' + age + ' years):</b> ' + esc(o.hd.render('en')) + ' – ' + esc(fD(o.greg, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })) +
        ', beginning at nightfall the evening before.</p><p><b>Torah portion:</b> ' + pick(o.w) + ', on Shabbat, ' + esc(fD(o.w.greg, { month: 'long', day: 'numeric', year: 'numeric' })) + '.</p>' +
        (o.w.dia.chag || (st.il ? o.w.il : o.w.dia).chag ? '' : '<p class="pa-read">' + readLinks(st.il ? o.w.il : o.w.dia) + '</p>') + '</div>';
    });
    if (m.warn === 'adar') h += '<p class="pb-warn">Born in Adar of a regular year, and the ' + (age === 13 ? 'bar' : 'bat') + ' mitzvah year has two months of Adar. Both dates are shown; ask your rabbi which one to use.</p>';
    if (m.warn === 'thirty') h += '<p class="pb-warn">The Hebrew birthday is the 30th of a month that has only 29 days in the ' + (age === 13 ? 'bar' : 'bat') + ' mitzvah year, so the date shown is the next day. Ask your rabbi which day to use.</p>';
    h += '<p class="pb-note">The ' + (age === 13 ? 'bar' : 'bat') + ' mitzvah portion shown is the one read on the first Shabbat on or after the Hebrew birthday. Many families celebrate on that Shabbat; the date itself does not depend on the celebration.</p>';
    out.innerHTML = h;
  }
  $('pb-go').addEventListener('click', function () { calc(); used('mitzvah'); });
  $('pb-d').addEventListener('change', function () { if (lastM) calc(); });
  ['pb-girl', 'pb-boy', 'pb-sun'].forEach(function (id) { $(id).addEventListener('change', function () { if (lastM) calc(); }); });

  var cp = $('pa-copy');
  if (cp) cp.addEventListener('click', function () {
    var txt = 'Torah portions – ' + place() + '\n' + C.weeks(today, 8).map(function (w) { var x = st.il ? w.il : w.dia; return fD(w.greg, { month: 'short', day: 'numeric' }) + ': ' + x.en + (x.chag ? '' : ' (' + x.refs.map(function (r) { return C.verses(r.ref); }).join('; ') + ')'); }).join('\n') + '\nhttps://hakelim.com/kodesh/parasha/en/';
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { cp.textContent = 'Copied ✓'; }, function () { cp.textContent = 'Copy failed'; });
    used('copy');
  });
  draw();
})(typeof window !== 'undefined' ? window : this);
