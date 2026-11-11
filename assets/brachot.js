// ברכות מכל הלב (כלי קודש): ברכות מוכנות עם מילוי שם וסינון סגנון, מחולל ברכה אישית,
// ותזכורת שנתית ביומן (לועזי, עברי או שניהם) עם קישור שפותח את הברכה מוכנה. הכול בטלפון, בלי שרת.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  function ev(name, p) { if (window.gtag) window.gtag('event', name, p || {}); }

  // ---------- העתקה ווטסאפ לכל ברכה ----------
  function flash(btn, msg) { var old = btn.innerHTML; btn.textContent = msg; setTimeout(function () { btn.innerHTML = old; }, 1800); }
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-copy],[data-wa]');
    if (!btn) return;
    var box = btn.closest('.nusach'), pre = box && box.querySelector('pre'), t = pre ? pre.textContent.trim() : '';
    if (!t) return;
    var id = box.id || '';
    if (btn.hasAttribute('data-wa')) { ev('nusach_whatsapp', { id: id, page: location.pathname }); window.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank', 'noopener'); return; }
    ev('nusach_copy', { id: id, page: location.pathname });
    var done = function () { flash(btn, 'הועתק ✓'); };
    var fb = function () { var ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.top = '-999px'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (x) {} ta.remove(); done(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, fb); else fb();
  });

  // ---------- ברכות מוכנות: השם נכנס לבד, וסינון לפי סגנון ----------
  var pres = [].slice.call(document.querySelectorAll('pre[data-orig]'));
  pres.forEach(function (p) { p._o = p.textContent; });
  var nameIn = $('br-name'), curSt = '';
  function fillNames() {
    var n = nameIn.value.trim();
    pres.forEach(function (p) { p.textContent = n ? p._o.replace(/\[שמות\]|\[שם\]/g, n) : p._o; });
    try { localStorage.setItem('kodesh-br-name', n); } catch (x) {}
  }
  function filter() {
    document.querySelectorAll('#ready .nusach').forEach(function (b) { b.hidden = !!curSt && b.getAttribute('data-st') !== curSt; });
    document.querySelectorAll('#ready .grp').forEach(function (g) { g.hidden = !g.querySelector('.nusach:not([hidden])'); });
  }
  if (nameIn) {
    try { nameIn.value = localStorage.getItem('kodesh-br-name') || ''; } catch (x) {}
    nameIn.addEventListener('input', fillNames); fillNames();
    document.querySelectorAll('#br-st [data-style]').forEach(function (b) {
      b.addEventListener('click', function () {
        curSt = b.getAttribute('data-style');
        document.querySelectorAll('#br-st .chip').forEach(function (x) { x.classList.toggle('on', x === b); });
        filter(); ev('brachot_style', { style: curSt || 'all' });
      });
    });
  }

  // ---------- מחולל ברכה אישית ----------
  var form = $('mk-form');
  if (!form) return;
  var F = form.elements;
  var REL = {
    ishti: { g: 'f', call: 'אשתי האהובה', kind: 'spouse' }, baali: { g: 'm', call: 'בעלי האהוב', kind: 'spouse' },
    bni: { g: 'm', call: 'בני היקר', kind: 'child' }, biti: { g: 'f', call: 'בתי היקרה', kind: 'child' },
    ima: { g: 'f', call: 'אמא יקרה', kind: 'parent' }, aba: { g: 'm', call: 'אבא יקר', kind: 'parent' },
    savta: { g: 'f', call: 'סבתא יקרה', kind: 'parent' }, saba: { g: 'm', call: 'סבא יקר', kind: 'parent' },
    chaver: { g: 'm', call: 'חבר יקר', kind: 'friend' }, chavera: { g: 'f', call: 'חברה יקרה', kind: 'friend' }
  };
  var st = 'lev', variant = 0;
  function list(a) { return a.length < 2 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' ו' + a[a.length - 1]; }
  function vals(name) { return [].slice.call(form.querySelectorAll('input[name=' + name + ']:checked')).map(function (i) { return i.value; }); }
  function S() {
    var r = REL[F.rel.value] || REL.ishti;
    return { r: r, occ: F.occ.value, name: F.name.value.trim(), me: F.me.value, num: F.num.value.trim(), q: vals('q').slice(0, 3), w: vals('w'), mem: F.mem.value.trim() };
  }
  function write(s, v) {
    var G = function (m, f) { return s.r.g === 'f' ? f : m; }, W = function (m, f) { return s.me === 'f' ? f : m; };
    var k = s.r.kind, spouse = k === 'spouse', open = (s.name ? s.name + ', ' : '') + s.r.call + ',';
    var wishes = s.w.length ? list(s.w) : 'בריאות, שמחה ואהבה';
    var sign = spouse ? W('אוהב אותך, היום ותמיד ❤️', 'אוהבת אותך, היום ותמיד ❤️') : k === 'child' ? 'באהבה גדולה, ' + W('אבא', 'אמא') : k === 'parent' ? 'באהבה, ' + W('בנך', 'בתך') : 'שלך באהבה';
    var L = [];
    var occLine = '';
    if (s.occ === 'bday') occLine = s.num ? 'היום ' + G('אתה בן ', 'את בת ') + s.num + ', ו' + G('אתה', 'את') + ' רק ' + G('הולך ומשתבח', 'הולכת ומשתבחת') + '.' : 'היום יום ההולדת שלך, ואני רוצה לעצור רגע ולהגיד לך כמה ' + G('אתה חשוב', 'את חשובה') + ' לי.';
    else if (s.occ === 'anniv') occLine = spouse ? (s.num ? 'היום מלאו ' + s.num + ' שנים מאז שעמדנו יחד מתחת לחופה.' : 'היום יום הנישואים שלנו.') : (s.num ? 'היום מלאו ' + s.num + ' שנים לחתונה שלכם.' : 'היום יום הנישואים שלכם.');
    else occLine = 'אין היום סיבה מיוחדת. פשוט רציתי ש' + G('תדע', 'תדעי') + ' כמה ' + G('אתה אהוב', 'את אהובה') + '.';
    var thanks = {
      spouse: s.occ === 'anniv' ? ['כל שנה איתך אני מגלה עוד סיבה לאהוב אותך.', 'הבית שבנינו יחד הוא המתנה הכי גדולה שקיבלתי.'] : ['תודה ש' + G('אתה', 'את') + ' בחיים שלי. כל יום איתך הוא מתנה.', G('אתה הבית שלי', 'את הבית שלי') + ', המקום הכי בטוח שיש לי.'],
      child: ['מהיום שנולדת ' + G('אתה ממלא', 'את ממלאת') + ' את הבית שלנו באור.', 'כל יום אני ' + W('מסתכל', 'מסתכלת') + ' עליך ' + W('ומודה', 'ומודה') + ' לקב"ה על המתנה הזאת.'],
      parent: ['תודה על כל מה שנתת לי, על כל לילה ועל כל חיבוק. אני מי שאני בזכותך.', 'כל מה שטוב בי, למדתי ממך.'],
      friend: ['תודה ש' + G('אתה תמיד שם', 'את תמיד שם') + ', בשמחות ובימים הקשים.', 'חבר' + G('', 'ה') + ' כמוך זו מתנה נדירה.']
    }[k];
    var qLine = s.q.length ? [W('אני אוהב', 'אני אוהבת') + ' את ' + list(s.q) + ' שלך.', 'יש בך ' + list(s.q.map(function (x) { return x.replace(/^ה/, ''); })) + ', וזה מאיר את כל מי שסביבך.'][v % 2] : '';
    var memLine = s.mem ? [W('אני תמיד אזכור', 'אני תמיד אזכור') + ' את ' + s.mem.replace(/^את /, '') + '.', 'הלב שלי עוד מחייך כש' + W('אני נזכר', 'אני נזכרת') + ' ב' + s.mem.replace(/^(את |ב)/, '') + '.'][v % 2] : '';
    var wishLine = W('מאחל', 'מאחלת') + ' לך ' + wishes + '.';
    if (st === 'lev') {
      L = [open, occLine, thanks[v % 2], qLine, memLine, wishLine + (s.occ === 'bday' ? ' עד מאה ועשרים.' : ''), sign];
    } else if (st === 'katzar') {
      var head = s.occ === 'bday' ? 'מזל טוב ליום ההולדת' : s.occ === 'anniv' ? 'מזל טוב ליום הנישואים' : G('אתה אהוב', 'את אהובה') + ' ❤️';
      L = [(s.name ? s.name + ', ' : '') + head + '! ' + wishLine, sign];
      if (v % 2) L = [(s.name ? s.name + ' ' : '') + '❤️ ' + head + '. ' + (s.q[0] ? 'תודה על ' + s.q[0] + ' שלך. ' : '') + wishLine];
    } else if (st === 'pasuk') {
      var P = s.occ === 'anniv' ? [['מים רבים לא יוכלו לכבות את האהבה', 'שיר השירים ח, ז'], ['זכרתי לך חסד נעורייך, אהבת כלולותייך', 'ירמיהו ב, ב']]
        : s.r.g === 'f' && spouse ? [['רבות בנות עשו חיל, ואת עלית על כולנה', 'משלי לא, כט'], ['אשת חיל מי ימצא, ורחוק מפנינים מכרה', 'משלי לא, י']]
        : spouse ? [['מצא אישה מצא טוב', 'משלי יח, כב'], ['אשרי איש ירא את ה\'', 'תהלים קיב, א']]
        : s.occ === 'bday' ? [['כי בי ירבו ימיך, ויוסיפו לך שנות חיים', 'משלי ט, יא'], ['יברכך ה\' וישמרך', 'במדבר ו, כד']]
        : [['יברכך ה\' וישמרך', 'במדבר ו, כד'], ['ה\' ישמור צאתך ובואך, מעתה ועד עולם', 'תהלים קכא, ח']];
      var p = P[v % 2];
      L = ['"' + p[0] + '" (' + p[1] + ').', open, occLine, qLine, wishLine, sign];
    } else {
      var K = s.occ === 'bday' ? [(s.name || 'מזל טוב') + '! עוד שנה עברה, ו' + G('אתה', 'את') + ' רק ' + G('משתבח', 'משתבחת') + ', כמו יין טוב 🍷', 'יום הולדת שמח' + (s.name ? ' ' + s.name : '') + '! לא סופרים שנים, סופרים חיוכים. ויש לך הרבה 😄']
        : s.occ === 'anniv' ? (spouse ? ['עוד שנה ש' + G('אתה סובל', 'את סובלת') + ' אותי 😄 ואפילו ' + G('אוהב', 'אוהבת') + '. תודה' + (s.name ? ' ' + s.name : '') + '!', (s.name ? s.name + ', ' : '') + (s.num ? s.num + ' שנים' : 'עוד שנה') + ' ועדיין ' + G('אתה', 'את') + ' הכי ' + G('מצחיק', 'מצחיקה') + ' בעיניי ❤️'] : ['מזל טוב ליום הנישואים! הסוד שלכם עובד, תמשיכו ככה 😄', 'עוד שנה של אהבה. תשאירו לנו קצת ממנה!'])
        : ['סתם הודעה באמצע היום: ' + G('אתה מדהים', 'את מדהימה') + ' ❤️', 'תזכורת יומית: ' + G('אתה האהוב שלי', 'את האהובה שלי') + '. זהו, אפשר להמשיך ביום 😄'];
      L = [K[v % 2], s.w.length ? wishLine : '', sign];
    }
    return L.filter(Boolean).join('\n');
  }
  function draw() {
    var s = S();
    $('mk-res').querySelector('pre').textContent = write(s, variant);
    $('mk-numl').textContent = s.occ === 'anniv' ? 'כמה שנים' : 'גיל';
    form.querySelector('[data-num]').hidden = s.occ === 'todah';
    $('mk-cal').hidden = s.occ === 'todah';
    $('mk-datel').textContent = s.occ === 'anniv' ? 'תאריך החתונה' : 'תאריך הלידה';
    // יום נישואים רק לבן או בת הזוג, או להורים ("שלכם")
    try { localStorage.setItem('kodesh-mk', JSON.stringify(state())); } catch (x) {}
    cal();
  }
  function state() { return { rel: F.rel.value, occ: F.occ.value, name: F.name.value.trim(), me: F.me.value, date: F.date.value, heb: F.heb.value, q: vals('q'), w: vals('w') }; }
  function load(o) {
    if (!o) return;
    ['rel', 'occ', 'name', 'me', 'date', 'heb'].forEach(function (k) { if (o[k] && F[k]) F[k].value = o[k]; });
    form.querySelectorAll('input[name=q],input[name=w]').forEach(function (i) { i.checked = (o[i.name] || []).indexOf(i.value) > -1; });
  }
  // עד שלוש תכונות
  form.addEventListener('change', function (e) {
    if (e.target.name === 'q' && vals('q').length > 3) e.target.checked = false;
    if (e.target.name === 'date') autoNum();
    variant = 0; draw();
  });
  form.addEventListener('input', function (e) { if (e.target.type !== 'checkbox') draw(); });
  document.querySelectorAll('#mk-st [data-mst]').forEach(function (b) {
    b.addEventListener('click', function () {
      st = b.getAttribute('data-mst'); variant = 0;
      document.querySelectorAll('#mk-st .chip').forEach(function (x) { x.classList.toggle('on', x === b); });
      draw();
    });
  });
  $('mk-more').addEventListener('click', function () {
    variant++;
    if (variant % 2 === 0) { var order = ['lev', 'katzar', 'pasuk', 'kalil']; st = order[(order.indexOf(st) + 1) % 4]; document.querySelectorAll('#mk-st .chip').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-mst') === st); }); }
    draw(); ev('bracha_more', { style: st });
  });

  // ---------- יומן: תזכורת כל שנה ----------
  function pad(n) { return ('0' + n).slice(-2); }
  function ymd(d) { return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()); }
  function parseD(v) { var p = (v || '').split('-').map(Number); return p.length === 3 && p[0] ? new Date(p[0], p[1] - 1, p[2]) : null; }
  function today() { var t = new Date(); t.setHours(0, 0, 0, 0); return t; }
  function nextG(d) { var t = today(), n = new Date(t.getFullYear(), d.getMonth(), d.getDate()); if (n < t) n.setFullYear(n.getFullYear() + 1); return n; }
  function hebOn(d, hy) { var H = window.hebcal; if (!H) return null; var x = H.HebrewCalendar.getBirthdayOrAnniversary(hy, d); return x ? x.greg() : null; }
  function nextH(d) {
    var H = window.hebcal; if (!H) return null;
    var hy = new H.HDate(today()).getFullYear();
    for (var i = 0; i < 3; i++) { var g = hebOn(d, hy + i); if (g && g >= today()) return g; }
    return null;
  }
  function autoNum() {
    var d = parseD(F.date.value); if (!d) return;
    var n = nextG(d).getFullYear() - d.getFullYear();
    if (n > 0 && n < 121) F.num.value = n;
  }
  function days(d) { return Math.round((d - today()) / 864e5); }
  function heRender(d) { var H = window.hebcal; return H ? new H.HDate(d).renderGematriya(true) : ''; }
  function enc(o) { return btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  // הקישור ביומן כולל את התאריך, כדי שהגיל ומספר השנים יתעדכנו לבד בכל שנה (אחרי #, לא נשלח לשום שרת)
  function backLink() { var o = state(); return location.origin + '/kodesh/brachot/#mk=' + enc(o); }
  function title(h) {
    var s = S(), who = s.name || (s.r.call.split(' ')[0]);
    return (s.occ === 'anniv' ? '💍 יום נישואים' + (s.r.kind === 'spouse' ? '' : ' ל' + who) : '🎂 יום הולדת ל' + who) + (h ? ' (עברי)' : '');
  }
  function cal() {
    var d = parseD(F.date.value), box = $('mk-next'), H = window.hebcal, heb = F.heb.value;
    if (!d) { box.innerHTML = ''; $('mk-gcal').removeAttribute('href'); return; }
    var g = nextG(d), h = nextH(d), parts = [];
    if (heb !== 'h') parts.push('<p>הלועזי הבא: <b>' + g.getDate() + '.' + (g.getMonth() + 1) + '.' + g.getFullYear() + '</b> (' + (days(g) === 0 ? 'היום! 🎉' : 'בעוד ' + days(g) + ' ימים') + ')</p>');
    if (heb !== 'g' && H) parts.push('<p>התאריך העברי: <b>' + heRender(d).replace(/ [^ ]+$/, '') + '</b>' + (h ? ' · השנה הוא יוצא ב-<b>' + h.getDate() + '.' + (h.getMonth() + 1) + '.' + h.getFullYear() + '</b> (' + (days(h) === 0 ? 'היום! 🎉' : 'בעוד ' + days(h) + ' ימים') + ')' : '') + '</p>');
    box.innerHTML = parts.join('');
    // יומן גוגל: לועזי = אירוע חוזר כל שנה. עברי = האירוע הקרוב (לעשר שנים קדימה: הכפתור השני)
    var useH = heb === 'h', when = useH ? h : g;
    if (!when) { $('mk-gcal').removeAttribute('href'); return; }
    var end = new Date(when); end.setDate(end.getDate() + 1);
    $('mk-gcal').href = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(title(useH)) +
      '&dates=' + ymd(when) + '/' + ymd(end) + (useH ? '' : '&recur=' + encodeURIComponent('RRULE:FREQ=YEARLY')) +
      '&details=' + encodeURIComponent('ברכה מוכנה, בלחיצה:\n' + backLink());
  }
  function ics() {
    var d = parseD(F.date.value); if (!d) { F.date.focus(); return; }
    var heb = F.heb.value, link = backLink(), stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//kelim//brachot//HE', 'CALSCALE:GREGORIAN'];
    function vev(start, rrule, h, i) {
      var end = new Date(start); end.setDate(end.getDate() + 1);
      L.push('BEGIN:VEVENT', 'UID:' + ymd(start) + '-' + (h ? 'h' : 'g') + i + '-' + Math.random().toString(36).slice(2) + '@hakelim.com', 'DTSTAMP:' + stamp,
        'DTSTART;VALUE=DATE:' + ymd(start), 'DTEND;VALUE=DATE:' + ymd(end));
      if (rrule) L.push('RRULE:FREQ=YEARLY');
      L.push('SUMMARY:' + title(h), 'DESCRIPTION:ברכה מוכנה\\, בלחיצה: ' + link, 'URL:' + link,
        'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + title(h), 'TRIGGER:-PT15H', 'END:VALARM', 'END:VEVENT');
    }
    if (heb !== 'h') vev(nextG(d), true, false, 0);
    if (heb !== 'g' && window.hebcal) {
      var hy = new window.hebcal.HDate(today()).getFullYear();
      for (var i = 0; i < 10; i++) { var g = hebOn(d, hy + i); if (g && g >= today()) vev(g, false, true, i); }
    }
    L.push('END:VCALENDAR');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([L.join('\r\n')], { type: 'text/calendar;charset=utf-8' }));
    a.download = (F.name.value.trim() || 'tizkoret') + '.ics';
    document.body.appendChild(a); a.click(); a.remove();
    ev('bracha_calendar', { kind: 'ics', heb: heb });
  }
  $('mk-ics').addEventListener('click', ics);
  $('mk-gcal').addEventListener('click', function () { ev('bracha_calendar', { kind: 'google', heb: F.heb.value }); });

  // הגיעו מתזכורת ביומן (#mk=...) או חוזרים לדף: ממלאים הכול
  var m = location.hash.match(/#mk=([\w-]+)/), saved = null;
  try { saved = JSON.parse(localStorage.getItem('kodesh-mk') || 'null'); } catch (x) {}
  if (m) { try { var o = JSON.parse(decodeURIComponent(escape(atob(m[1].replace(/-/g, '+').replace(/_/g, '/'))))); if (saved && saved.date && saved.name === o.name) o.date = saved.date; load(o); setTimeout(function () { $('mk').scrollIntoView(); }, 50); ev('bracha_from_calendar', {}); } catch (x) { load(saved); } }
  else load(saved);
  autoNum();
  draw();
  var sc = document.querySelector('script[data-hebcal]');
  if (!window.hebcal && sc) sc.addEventListener('load', cal);
})();
