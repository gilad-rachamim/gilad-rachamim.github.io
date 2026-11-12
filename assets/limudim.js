// כלים ללימודים – כרטיסיות חזרה, מתכנן למבחן, טיימר למידה, לימוד יומי לסיום.
// הכול רץ בטלפון. הנתונים נשמרים ב-localStorage בלבד, לא נשלחים לשום מקום.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  function load(k, def) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function used(tool, extra) { if (window.toolUsed) window.toolUsed(tool, extra); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // ---------- תאריכים ----------
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); return x; }
  function today() { return ymd(new Date()); }
  var DAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'שבת'];
  var MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  function dayLabel(s) { var d = parse(s); var w = d.getDay(); return (w === 6 ? 'שבת' : 'יום ' + DAYS[w]) + ' ' + d.getDate() + '.' + (d.getMonth() + 1); }
  function longDate(s) { var d = parse(s); return d.getDate() + ' ב' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); }
  function daysBetween(a, b) { return Math.round((parse(b) - parse(a)) / 864e5); }

  // ---------- גימטריה למספרי פרקים ----------
  function gem(n) {
    var ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'], tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'], hund = ['', 'ק', 'ר', 'ש', 'ת'];
    var s = '';
    while (n >= 400) { s += 'ת'; n -= 400; }
    if (n >= 100) { s += hund[Math.floor(n / 100)]; n %= 100; }
    if (n === 15) return s + 'טו';
    if (n === 16) return s + 'טז';
    return s + tens[Math.floor(n / 10)] + ones[n % 10];
  }

  // ---------- קובץ ליומן (ics) ----------
  function icsText(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  function fold(line) { var out = [], i = 0; while (line.length - i > 34) { out.push((i ? ' ' : '') + line.slice(i, i + 34)); i += 34; } out.push((i ? ' ' : '') + line.slice(i)); return out.join('\r\n'); }
  function icsDownload(file, calName, events) {
    var stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//kelim//limudim//HE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:' + icsText(calName), 'X-WR-TIMEZONE:Asia/Jerusalem'];
    events.forEach(function (ev, i) {
      var d = ev.date.replace(/-/g, '');
      L.push('BEGIN:VEVENT', 'UID:' + d + '-' + i + '-' + Math.random().toString(36).slice(2, 8) + '@limudim', 'DTSTAMP:' + stamp);
      if (ev.time) {
        var t = ev.time.split(':'), st = new Date(+d.slice(0, 4), +d.slice(4, 6) - 1, +d.slice(6, 8), +t[0], +t[1]), en = new Date(st.getTime() + (ev.mins || 30) * 6e4);
        var f = function (x) { return ymd(x).replace(/-/g, '') + 'T' + pad(x.getHours()) + pad(x.getMinutes()) + '00'; };
        L.push('DTSTART:' + f(st), 'DTEND:' + f(en));
      } else {
        L.push('DTSTART;VALUE=DATE:' + d, 'DTEND;VALUE=DATE:' + ymd(addDays(parse(ev.date), 1)).replace(/-/g, ''));
      }
      L.push(fold('SUMMARY:' + icsText(ev.title)));
      if (ev.desc) L.push(fold('DESCRIPTION:' + icsText(ev.desc)));
      if (ev.time && ev.alarm !== false) L.push('BEGIN:VALARM', 'ACTION:DISPLAY', fold('DESCRIPTION:' + icsText(ev.title)), 'TRIGGER:-PT' + (ev.alarm || 0) + 'M', 'END:VALARM');
      L.push('END:VEVENT');
    });
    L.push('END:VCALENDAR');
    var blob = new Blob([L.join('\r\n') + '\r\n'], { type: 'text/calendar;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  function fileDownload(name, text, type) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: type || 'application/json' })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { a.remove(); }, 1000);
  }

  // =====================================================================
  // 1. כרטיסיות חזרה (חזרה מרווחת בשיטת הקופסאות)
  // =====================================================================
  function flashcards() {
    var KEY = 'limudim-cards';
    var INT = [0, 1, 3, 7, 14, 30]; // כמה ימים עד החזרה הבאה בכל קופסה
    var st = load(KEY, null);
    if (!st || !st.decks) {
      st = { decks: [{ id: 'd1', name: 'דוגמה: מילים באנגלית', cards: [
        ['apple', 'תפוח'], ['to borrow', 'לשאול (חפץ), ללוות'], ['although', 'למרות ש...'], ['improve', 'לשפר'], ['knowledge', 'ידע']
      ].map(function (p) { return { q: p[0], a: p[1], b: 0, due: today() }; }) }], cur: 'd1' };
    }
    function persist() { save(KEY, st); }
    function deck() { var d = st.decks.filter(function (x) { return x.id === st.cur; })[0]; if (!d && st.decks.length) { d = st.decks[0]; st.cur = d.id; } return d; }
    function dueCards(d) { var t = today(); return d.cards.filter(function (c) { return c.due <= t; }); }

    var sel = $('fc-deck'), play = $('fc-play'), home = $('fc-home');
    function renderDecks() {
      sel.innerHTML = st.decks.map(function (d) { return '<option value="' + d.id + '"' + (d.id === st.cur ? ' selected' : '') + '>' + esc(d.name) + ' (' + d.cards.length + ')</option>'; }).join('') || '<option value="">אין עדיין חפיסות</option>';
      var d = deck();
      var due = d ? dueCards(d).length : 0, total = d ? d.cards.length : 0, known = d ? d.cards.filter(function (c) { return c.b >= 3; }).length : 0;
      $('fc-n-due').textContent = due; $('fc-n-all').textContent = total; $('fc-n-known').textContent = known;
      $('fc-start').textContent = due ? 'להתחיל חזרה (' + due + ' להיום)' : 'אין כרטיסים להיום ✓';
      $('fc-start').disabled = !due;
      $('fc-all').disabled = !total;
      var list = $('fc-list');
      $('fc-list-n').textContent = total;
      list.innerHTML = d ? d.cards.map(function (c, i) {
        return '<li><span>' + esc(c.q) + ' ← ' + esc(c.a) + '</span><small>' + (c.b >= 3 ? 'יודע' : c.due <= today() ? 'להיום' : longDate(c.due).replace(/ \d{4}$/, '')) + '</small><button type="button" data-del="' + i + '" aria-label="למחוק">×</button></li>';
      }).join('') : '';
    }
    sel.addEventListener('change', function () { st.cur = sel.value; persist(); renderDecks(); });
    $('fc-new').addEventListener('click', function () {
      var n = prompt('שם החפיסה החדשה (למשל: אנגלית יחידה 3, הלכות שבת)');
      if (!n || !n.trim()) return;
      var id = 'd' + Date.now(); st.decks.push({ id: id, name: n.trim().slice(0, 50), cards: [] }); st.cur = id; persist(); renderDecks();
      $('fc-text').focus();
    });
    $('fc-ren').addEventListener('click', function () {
      var d = deck(); if (!d) return; var n = prompt('שם חדש לחפיסה', d.name); if (!n || !n.trim()) return; d.name = n.trim().slice(0, 50); persist(); renderDecks();
    });
    $('fc-delete').addEventListener('click', function () {
      var d = deck(); if (!d) return;
      if (!confirm('למחוק את החפיסה "' + d.name + '" עם ' + d.cards.length + ' כרטיסים? אי אפשר לבטל.')) return;
      st.decks = st.decks.filter(function (x) { return x !== d; }); st.cur = st.decks[0] ? st.decks[0].id : ''; persist(); renderDecks();
    });
    $('fc-list').addEventListener('click', function (e) {
      var b = e.target.closest('[data-del]'); if (!b) return; var d = deck(); d.cards.splice(+b.getAttribute('data-del'), 1); persist(); renderDecks();
    });

    // הוספת כרטיסים מהדבקה
    var SEPS = { tab: '\t', dash: ' - ', colon: ':', eq: '=', pipe: '|', semi: ';' };
    function splitLine(line, how) {
      if (how === 'auto') {
        var tries = ['\t', ' - ', ' – ', ' — ', '=', ':', '|', ';', ' -', '- ', '-', ','];
        for (var i = 0; i < tries.length; i++) { var k = line.indexOf(tries[i]); if (k > 0 && k < line.length - tries[i].length) return [line.slice(0, k), line.slice(k + tries[i].length)]; }
        return null;
      }
      var s = how === 'custom' ? ($('fc-sep-c').value || '') : SEPS[how];
      if (!s) return null;
      var j = line.indexOf(s); if (j <= 0) return null; return [line.slice(0, j), line.slice(j + s.length)];
    }
    $('fc-sep').addEventListener('change', function () { $('fc-sep-c-wrap').hidden = $('fc-sep').value !== 'custom'; });
    $('fc-add').addEventListener('click', function () {
      var lines = $('fc-text').value.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
      if (!lines.length) { $('fc-add-st').textContent = 'צריך להדביק לפחות שורה אחת: שאלה, מפריד, תשובה.'; return; }
      var d = deck();
      if (!d) { d = { id: 'd' + Date.now(), name: 'החפיסה שלי', cards: [] }; st.decks.push(d); st.cur = d.id; }
      var how = $('fc-sep').value, ok = 0, bad = [];
      lines.forEach(function (l) {
        var p = splitLine(l, how);
        if (!p || !p[0].trim() || !p[1].trim()) { bad.push(l); return; }
        d.cards.push({ q: p[0].trim().slice(0, 400), a: p[1].trim().slice(0, 600), b: 0, due: today() }); ok++;
      });
      persist(); renderDecks();
      $('fc-add-st').textContent = 'נוספו ' + ok + ' כרטיסים לחפיסה "' + d.name + '".' + (bad.length === 1 ? ' שורה אחת בלי מפריד נשארה בתיבה, לתקן ולהוסיף שוב.' : bad.length ? ' ' + bad.length + ' שורות בלי מפריד נשארו בתיבה, לתקן ולהוסיף שוב.' : '');
      $('fc-text').value = bad.join('\n');
      if (ok) used('kartisiot', { action: 'add', n: ok });
    });

    // תרגול
    var queue = [], pos = 0, right = 0, wrong = 0, missed = {}, reversed = false, cur = null;
    function speakable(t) { return 'speechSynthesis' in window && t; }
    function say(t) {
      if (!('speechSynthesis' in window)) return;
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(t); u.lang = /[a-z]/i.test(t) && !/[\u0590-\u05FF]/.test(t) ? 'en-US' : 'he-IL'; u.rate = .9; speechSynthesis.speak(u);
    }
    function start(all) {
      var d = deck(); if (!d) return;
      var cards = all ? d.cards.slice() : dueCards(d);
      // ערבוב
      for (var i = cards.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = cards[i]; cards[i] = cards[j]; cards[j] = t; }
      queue = cards; pos = 0; right = 0; wrong = 0; missed = {}; reversed = $('fc-rev').checked; $('fc-hk').innerHTML = ''; $('fc-hk').hidden = true;
      home.hidden = true; play.hidden = false; $('fc-end').hidden = true; $('fc-cardbox').hidden = false;
      show(); used('kartisiot', { action: all ? 'practice_all' : 'practice_due', n: cards.length });
      play.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    function show() {
      if (pos >= queue.length) return end();
      cur = queue[pos];
      $('fc-q').textContent = reversed ? cur.a : cur.q;
      $('fc-a').textContent = reversed ? cur.q : cur.a;
      $('fc-a').hidden = true; $('fc-show').hidden = false; $('fc-judge').hidden = true;
      $('fc-pos').textContent = 'כרטיס ' + (pos + 1) + ' מתוך ' + queue.length;
      $('fc-say').hidden = !speakable(cur.q);
    }
    function reveal() { $('fc-a').hidden = false; $('fc-show').hidden = true; $('fc-judge').hidden = false; $('fc-yes').focus(); }
    function judge(knew) {
      if (!cur) return;
      if (knew) {
        if (!missed[cur.q]) right++;
        cur.b = missed[cur.q] ? 1 : Math.min(cur.b + 1, 5);
        cur.due = ymd(addDays(new Date(), INT[cur.b]));
      } else {
        if (!missed[cur.q]) wrong++;
        missed[cur.q] = 1; cur.b = 0; cur.due = today();
        queue.push(cur); // חוזר שוב בסוף הסבב
      }
      persist(); pos++; show();
    }
    function end() {
      $('fc-cardbox').hidden = true; $('fc-end').hidden = false;
      var d = deck(), tm = ymd(addDays(new Date(), 1));
      var next = d.cards.filter(function (c) { return c.due <= tm; }).length;
      $('fc-end-t').textContent = 'סיימת את הסבב! ' + (right + wrong ? 'ידעת ' + right + ' מתוך ' + (right + wrong) + ' כבר בפעם הראשונה.' : '');
      $('fc-end-n').textContent = next ? 'מחר מחכים לך ' + next + ' כרטיסים לחזרה.' : 'מחר אין כרטיסים לחזרה. כל הכבוד.';
      used('kartisiot', { action: 'done', right: right, wrong: wrong });
      // התקדמות יומית: סבב שהסתיים = יום של חזרה (assets/hitkadmut.js)
      if (window.HK && right + wrong) HK.done('kartisiot', { el: $('fc-hk'), title: 'עוד יום של חזרה ✓', help: 'הכרטיסיות כאן בחינם ובלי פרסומות', share: 'סיימתי היום סבב חזרה בכרטיסיות החכמות, בחינם. מתרגלים כמה דקות ביום וזוכרים לאורך זמן:' });
      renderDecks();
    }
    function back() { play.hidden = true; home.hidden = false; renderDecks(); if ('speechSynthesis' in window) speechSynthesis.cancel(); }
    $('fc-start').addEventListener('click', function () { start(false); });
    $('fc-all').addEventListener('click', function () { start(true); });
    $('fc-show').addEventListener('click', reveal);
    $('fc-yes').addEventListener('click', function () { judge(true); });
    $('fc-no').addEventListener('click', function () { judge(false); });
    $('fc-say').addEventListener('click', function () { say($('fc-a').hidden ? $('fc-q').textContent : $('fc-q').textContent + '. ' + $('fc-a').textContent); });
    $('fc-stop').addEventListener('click', back);
    $('fc-back').addEventListener('click', back);
    $('fc-again').addEventListener('click', function () { start(true); });
    document.addEventListener('keydown', function (e) {
      if (play.hidden || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.key === ' ' || e.key === 'Enter') { if (!$('fc-show').hidden) { e.preventDefault(); reveal(); } }
      else if (!$('fc-judge').hidden && (e.key === '1' || e.key === 'ArrowRight')) judge(true);
      else if (!$('fc-judge').hidden && (e.key === '2' || e.key === 'ArrowLeft')) judge(false);
    });

    // גיבוי ושיתוף
    $('fc-export').addEventListener('click', function () { fileDownload('kartisiot.json', JSON.stringify(st, null, 1)); });
    $('fc-import').addEventListener('change', function () {
      var f = this.files[0]; if (!f) return; var r = new FileReader();
      r.onload = function () {
        try {
          var x = JSON.parse(r.result); if (!x.decks) throw 0;
          x.decks.forEach(function (d) { d.id = 'd' + Date.now() + Math.random().toString(36).slice(2, 5); st.decks.push(d); });
          persist(); renderDecks(); $('fc-add-st').textContent = 'נוספו ' + x.decks.length + ' חפיסות מהקובץ.';
        } catch (e) { $('fc-add-st').textContent = 'הקובץ לא נראה כמו גיבוי של הכרטיסיות.'; }
      };
      r.readAsText(f);
    });
    $('fc-copy').addEventListener('click', function () {
      var d = deck(); if (!d) return; var t = d.cards.map(function (c) { return c.q + ' - ' + c.a; }).join('\n');
      var btn = this;
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { btn.textContent = 'הועתק ✓ אפשר להדביק לחבר בווטסאפ'; }).catch(function () { $('fc-text').value = t; btn.textContent = 'הטקסט בתיבה למעלה, להעתיק משם'; });
    });
    // ---------- שיתוף חפיסה בקישור (הכרטיסים בתוך הקישור עצמו, בלי שרת) ----------
    function b64u(bytes) { var bin = ''; for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]); return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
    function unb64u(t) { t = t.replace(/-/g, '+').replace(/_/g, '/'); while (t.length % 4) t += '='; var bin = atob(t), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
    function pipe(bytes, stream) { return new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer().then(function (b) { return new Uint8Array(b); }); }
    function encodeDeck(d) {
      var raw = new TextEncoder().encode(JSON.stringify({ n: d.name, c: d.cards.map(function (c) { return [c.q, c.a]; }) }));
      if (window.CompressionStream) return pipe(raw, new CompressionStream('deflate-raw')).then(function (z) { return 'z' + b64u(z); }).catch(function () { return 'j' + b64u(raw); });
      return Promise.resolve('j' + b64u(raw));
    }
    function decodeDeck(t) {
      var kind = t.charAt(0), bytes = unb64u(t.slice(1));
      var p = kind === 'z' ? pipe(bytes, new DecompressionStream('deflate-raw')) : Promise.resolve(bytes);
      return p.then(function (u) { var x = JSON.parse(new TextDecoder().decode(u)); if (!x.n || !Array.isArray(x.c)) throw 0; return x; });
    }
    $('fc-share').addEventListener('click', function () {
      var d = deck(); if (!d || !d.cards.length) { $('fc-add-st').textContent = 'אין עדיין כרטיסים בחפיסה לשתף.'; return; }
      encodeDeck(d).then(function (code) {
        var url = location.origin + '/limudim/kartisiot/#d=' + code;
        var box = $('fc-share-box'); box.hidden = false;
        $('fc-share-url').value = url;
        $('fc-share-n').textContent = d.cards.length + ' כרטיסים' + (url.length > 6000 ? '. החפיסה גדולה, ואם הקישור לא נפתח, עדיף לשלוח גיבוי בקובץ' : '');
        $('fc-share-wa').href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent('חפיסת כרטיסיות לחזרה: ' + d.name + ' (' + d.cards.length + ' כרטיסים). לוחצים על הקישור, והיא נכנסת לטלפון:\n' + url);
        box.scrollIntoView({ behavior: 'smooth', block: 'center' });
        used('kartisiot', { action: 'share_link', n: d.cards.length });
      });
    });
    $('fc-share-copy').addEventListener('click', function () {
      var b = this, v = $('fc-share-url').value;
      (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(function () { b.textContent = 'הועתק ✓'; }).catch(function () { $('fc-share-url').select(); b.textContent = 'לסמן ולהעתיק'; });
    });
    var incoming = null;
    if (/^#d=/.test(location.hash)) {
      decodeDeck(location.hash.slice(3)).then(function (x) {
        incoming = x;
        $('fc-in-t').textContent = 'קיבלת חפיסה: "' + x.n + '", ' + x.c.length + ' כרטיסים';
        $('fc-in-ex').textContent = x.c.slice(0, 3).map(function (c) { return c[0] + ' ← ' + c[1]; }).join(' · ');
        $('fc-incoming').hidden = false;
      }).catch(function () { $('fc-add-st').textContent = 'הקישור נקטע או לא תקין. אפשר לבקש מהשולח לשלוח שוב.'; });
    }
    $('fc-in-add').addEventListener('click', function () {
      if (!incoming) return;
      var id = 'd' + Date.now();
      st.decks.push({ id: id, name: String(incoming.n).slice(0, 50), cards: incoming.c.filter(function (c) { return c && c[0] && c[1]; }).map(function (c) { return { q: String(c[0]).slice(0, 400), a: String(c[1]).slice(0, 600), b: 0, due: today() }; }) });
      st.cur = id; persist(); renderDecks();
      $('fc-incoming').hidden = true; history.replaceState(null, '', location.pathname);
      $('fc-add-st').textContent = 'החפיסה נוספה ✓ אפשר להתחיל חזרה.';
      used('kartisiot', { action: 'import_link', n: incoming.c.length });
    });
    $('fc-in-no').addEventListener('click', function () { $('fc-incoming').hidden = true; history.replaceState(null, '', location.pathname); });
    renderDecks();
  }

  // =====================================================================
  // 2. מתכנן למידה למבחן
  // =====================================================================
  function examPlanner() {
    var KEY = 'limudim-mivchan';
    var st = load(KEY, { plans: [], cur: '' });
    var form = $('mv-form');
    $('mv-start').value = today();
    function cfgFromForm() {
      return {
        name: $('mv-name').value.trim() || 'המבחן', exam: $('mv-date').value, start: $('mv-start').value || today(),
        topics: $('mv-topics').value.split(/\r?\n/).map(function (s) { return s.replace(/^[\s\d.)\-•*]+/, '').trim(); }).filter(Boolean),
        rev: +$('mv-rev').value, noShabbat: $('mv-shabbat').checked, noFri: $('mv-fri').checked, time: $('mv-time').value || '18:00', mins: +$('mv-mins').value || 60
      };
    }
    function fill(c) {
      $('mv-name').value = c.name; $('mv-date').value = c.exam; $('mv-start').value = c.start; $('mv-topics').value = c.topics.join('\n');
      $('mv-rev').value = c.rev; $('mv-shabbat').checked = c.noShabbat; $('mv-fri').checked = !!c.noFri; $('mv-time').value = c.time; $('mv-mins').value = c.mins;
    }
    function build(c) {
      var days = [], d = parse(c.start), ex = parse(c.exam);
      for (; d < ex; d = addDays(d, 1)) { if (c.noShabbat && d.getDay() === 6) continue; if (c.noFri && d.getDay() === 5) continue; days.push(ymd(d)); }
      if (!days.length) return null;
      var R = Math.min(c.rev, Math.max(0, days.length - 1)), learn = days.slice(0, days.length - R), revDays = days.slice(days.length - R);
      var T = c.topics.length, Ln = learn.length, rows = [];
      var plan = learn.map(function (x) { return { date: x, items: [], review: [] }; });
      if (T <= Ln) {
        c.topics.forEach(function (t, i) {
          var a = Math.floor(i * Ln / T), b = Math.floor((i + 1) * Ln / T) - 1, parts = b - a + 1;
          for (var k = a; k <= b; k++) plan[k].items.push(parts > 1 ? t + ' (חלק ' + (k - a + 1) + ' מתוך ' + parts + ')' : t);
          if (b + 1 < Ln) plan[b + 1].review.push(t);
        });
      } else {
        for (var j = 0; j < Ln; j++) {
          var s = Math.floor(j * T / Ln), e = Math.floor((j + 1) * T / Ln);
          plan[j].items = c.topics.slice(s, e);
          if (j + 1 < Ln) plan[j + 1].review = c.topics.slice(s, e);
        }
      }
      plan.forEach(function (p) {
        var txt = p.items.length ? p.items.join(' · ') : 'חזרה על מה שנלמד עד עכשיו';
        rows.push({ date: p.date, kind: 'learn', text: txt, sub: p.review.length ? 'חזרה קצרה (10 דקות) על: ' + p.review.join(', ') : '' });
      });
      revDays.forEach(function (x, i) {
        var last = i === revDays.length - 1;
        rows.push({ date: x, kind: 'rev', text: last ? 'חזרה קלה, מבחן לדוגמה, ולישון מוקדם' : 'חזרה כללית על כל החומר', sub: last ? '' : 'לעבור על הסיכומים ולפתור שאלות מבחנים קודמים' });
      });
      rows.push({ date: c.exam, kind: 'exam', text: (/מבחן|בחינה|בגרות/.test(c.name) ? c.name : 'המבחן: ' + c.name) + ' · בהצלחה!', sub: '' });
      return rows;
    }
    function plan() { return st.plans.filter(function (p) { return p.id === st.cur; })[0]; }
    function renderList() {
      $('mv-plans-wrap').hidden = !st.plans.length;
      $('mv-plans').innerHTML = st.plans.map(function (p) { return '<option value="' + p.id + '"' + (p.id === st.cur ? ' selected' : '') + '>' + esc(p.cfg.name) + ' · ' + dayLabel(p.cfg.exam) + '</option>'; }).join('');
    }
    function render() {
      var p = plan(), out = $('mv-out');
      renderList();
      if (!p) { out.hidden = true; return; }
      var rows = build(p.cfg); if (!rows) { out.hidden = true; return; }
      var t = today(), left = daysBetween(t, p.cfg.exam), learnRows = rows.filter(function (r) { return r.kind !== 'exam'; });
      var done = learnRows.filter(function (r) { return p.done[r.date]; }).length;
      $('mv-sum').innerHTML = '<div class="big-n">' + (left > 0 ? 'עוד ' + left + ' ימים ל' + esc(p.cfg.name) : left === 0 ? 'המבחן היום. בהצלחה!' : 'המבחן עבר') + '</div>' +
        '<p>' + p.cfg.topics.length + ' נושאים, ' + learnRows.length + ' ימי לימוד, ' + p.cfg.mins + ' דקות ביום. סימנת ' + done + ' מתוך ' + learnRows.length + '.</p><div class="bar" style="margin-top:.6rem"><i style="width:' + Math.round(done * 100 / Math.max(1, learnRows.length)) + '%"></i></div>';
      $('mv-table').innerHTML = rows.map(function (r) {
        var cls = [r.kind === 'rev' ? 'rev' : r.kind === 'exam' ? 'exam' : '', r.date === t ? 'today' : '', p.done[r.date] ? 'done' : ''].join(' ');
        return '<tr class="' + cls + '"><td class="d">' + dayLabel(r.date) + '</td><td>' + esc(r.text) + (r.sub ? '<br><small style="color:var(--muted)">' + esc(r.sub) + '</small>' : '') + '</td><td class="x">' +
          (r.kind === 'exam' ? '🎯' : '<input type="checkbox" data-d="' + r.date + '"' + (p.done[r.date] ? ' checked' : '') + ' aria-label="למדתי ב' + dayLabel(r.date) + '">') + '</td></tr>';
      }).join('');
      out.hidden = false;
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var c = cfgFromForm(), msg = $('mv-st');
      if (!c.exam) { msg.textContent = 'צריך לבחור את תאריך המבחן.'; return; }
      if (!c.topics.length) { msg.textContent = 'צריך לכתוב לפחות נושא אחד, שורה לכל נושא.'; return; }
      if (c.exam <= c.start) { msg.textContent = 'תאריך המבחן צריך להיות אחרי היום שמתחילים.'; return; }
      if (!build(c)) { msg.textContent = 'אין ימי לימוד בין ההתחלה למבחן. אולי לבטל את הדילוג על שישי או שבת?'; return; }
      var p = plan();
      if (p && p.cfg.name === c.name && p.cfg.exam === c.exam) p.cfg = c;
      else { p = { id: 'm' + Date.now(), cfg: c, done: {} }; st.plans.push(p); st.cur = p.id; }
      save(KEY, st); msg.textContent = ''; render();
      used('mivchan', { topics: c.topics.length, days: daysBetween(c.start, c.exam) });
      $('mv-out').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    $('mv-table').addEventListener('change', function (e) {
      var cb = e.target; if (!cb.dataset.d) return; var p = plan(); if (cb.checked) p.done[cb.dataset.d] = 1; else delete p.done[cb.dataset.d]; save(KEY, st); render();
      // התקדמות יומית: כל יום שמסמנים בו לימוד נספר לרצף (assets/hitkadmut.js)
      if (cb.checked && window.HK) HK.done('mivchan', { el: $('mv-hk'), title: 'עוד יום של לימוד למבחן ✓', line: 'צעד אחרי צעד. בהצלחה ב' + p.cfg.name + '!', help: 'המתכנן למבחן כאן בחינם ובלי פרסומות', share: 'אני מתכונן ל' + p.cfg.name + ' עם מתכנן הלמידה למבחן: מה ללמוד בכל יום, עד המבחן. בחינם:' });
    });
    $('mv-plans').addEventListener('change', function () { st.cur = this.value; save(KEY, st); var p = plan(); if (p) fill(p.cfg); render(); });
    $('mv-newplan').addEventListener('click', function () { st.cur = ''; save(KEY, st); form.reset(); $('mv-start').value = today(); render(); $('mv-name').focus(); });
    $('mv-del').addEventListener('click', function () {
      var p = plan(); if (!p || !confirm('למחוק את התוכנית "' + p.cfg.name + '"?')) return;
      st.plans = st.plans.filter(function (x) { return x !== p; }); st.cur = st.plans[0] ? st.plans[0].id : ''; save(KEY, st); var q = plan(); if (q) fill(q.cfg); else { form.reset(); $('mv-start').value = today(); } render();
    });
    $('mv-ics').addEventListener('click', function () {
      var p = plan(); if (!p) return; var rows = build(p.cfg);
      icsDownload('mivchan.ics', 'לימוד ל' + p.cfg.name, rows.map(function (r) {
        return r.kind === 'exam' ? { date: r.date, title: '🎯 ' + r.text } : { date: r.date, time: p.cfg.time, mins: p.cfg.mins, alarm: 5, title: 'לימוד: ' + r.text, desc: (r.sub ? r.sub + '\n' : '') + 'נוצר בכלים ללימודים: https://hakelim.com/limudim/mivchan/' };
      }));
      $('mv-tip').hidden = false; used('mivchan', { action: 'ics' });
    });
    $('mv-print').addEventListener('click', function () { window.print(); });
    var p0 = plan(); if (p0) fill(p0.cfg);
    render();
  }

  // =====================================================================
  // 3. טיימר למידה
  // =====================================================================
  function studyTimer() {
    var MODES = { '25': [25, 5, 15], '50': [50, 10, 20], '15': [15, 3, 10] };
    var RUN = 'limudim-timer', LOG = 'limudim-timer-log';
    var cfg = load('limudim-timer-cfg', { mode: '25', f: 25, b: 5, l: 15, why: '', wake: true, sound: true, noise: false, auto: true });
    var run = load(RUN, null); // {phase, endAt, left, round, running}
    var clock = $('tm-clock'), wakeLock = null, tick = null, audio = null, noiseNode = null;
    var baseTitle = window.__baseTitle || document.title, titled = false;
    $('tm-why').value = cfg.why || '';
    $('tm-wake').checked = cfg.wake; $('tm-sound').checked = cfg.sound; $('tm-noise').checked = cfg.noise; $('tm-auto').checked = cfg.auto;
    $('tm-cf').value = cfg.f; $('tm-cb').value = cfg.b;
    function saveCfg() { save('limudim-timer-cfg', cfg); }
    function lens() { return cfg.mode === 'custom' ? [Math.max(1, +cfg.f || 25), Math.max(1, +cfg.b || 5), Math.max(1, +cfg.l || 15)] : MODES[cfg.mode]; }
    function phaseLen(ph) { var L = lens(); return (ph === 'focus' ? L[0] : ph === 'long' ? L[2] : L[1]) * 60000; }
    function fresh() { return { phase: 'focus', left: phaseLen('focus'), endAt: 0, round: 0, running: false }; }
    if (!run) run = fresh();
    function remaining() { return run.running ? Math.max(0, run.endAt - Date.now()) : run.left; }
    function fmt(ms) { var s = Math.ceil(ms / 1000), m = Math.floor(s / 60); return pad(m) + ':' + pad(s % 60); }
    function paint() {
      var ms = remaining(), brk = run.phase !== 'focus';
      $('tm-t').textContent = fmt(ms);
      $('tm-lbl').textContent = brk ? (run.phase === 'long' ? 'הפסקה ארוכה. לקום, לשתות, לזוז' : 'הפסקה. לקום מהכיסא, לנשום') : 'זמן לימוד';
      $('tm-whyshow').textContent = brk ? '' : (cfg.why ? '"' + cfg.why + '"' : '');
      clock.classList.toggle('brk', brk);
      $('tm-ring').style.width = (100 - ms * 100 / phaseLen(run.phase)) + '%';
      $('tm-go').textContent = run.running ? 'הפסקה רגעית ⏸' : (ms < phaseLen(run.phase) ? 'להמשיך ▶' : brk ? 'להתחיל הפסקה ▶' : 'להתחיל ללמוד ▶');
      var dots = '', r = run.round % 4; for (var i = 0; i < 4; i++) dots += '<i class="' + (i < r ? 'on' : '') + '"></i>';
      $('tm-dots').innerHTML = dots;
      // הכותרת של הדף (מה שגוגל רואה) נשארת כמו שהיא; רק בזמן שהטיימר רץ מוצג בה הזמן
      if (run.running) { document.title = fmt(ms) + ' · טיימר למידה'; titled = true; } else if (titled) { document.title = baseTitle; titled = false; }
    }
    function logStats() {
      var lg = load(LOG, {}), t = today(), tt = lg[t] || { m: 0, n: 0 }, wk = 0;
      for (var i = 0; i < 7; i++) { var k = ymd(addDays(new Date(), -i)); if (lg[k]) wk += lg[k].m; }
      $('tm-s-today').textContent = tt.m; $('tm-s-n').textContent = tt.n; $('tm-s-week').textContent = wk;
    }
    function chime() {
      if (!cfg.sound) return;
      try {
        audio = audio || new (window.AudioContext || window.webkitAudioContext)();
        [0, .35, .7].forEach(function (t, i) {
          var o = audio.createOscillator(), g = audio.createGain(); o.frequency.value = [660, 880, 990][i]; o.type = 'sine';
          g.gain.setValueAtTime(0.0001, audio.currentTime + t); g.gain.exponentialRampToValueAtTime(0.35, audio.currentTime + t + .03); g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + t + .6);
          o.connect(g); g.connect(audio.destination); o.start(audio.currentTime + t); o.stop(audio.currentTime + t + .65);
        });
      } catch (e) {}
    }
    function notify(text) {
      if (navigator.vibrate) navigator.vibrate([300, 150, 300, 150, 300]);
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      var opt = { body: text, icon: '/assets/icon-limudim-192.png', tag: 'limudim-timer', renotify: true, vibrate: [300, 150, 300] };
      if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) navigator.serviceWorker.getRegistration().then(function (r) { if (r) r.showNotification('טיימר למידה', opt); else new Notification('טיימר למידה', opt); }).catch(function () {});
      else try { new Notification('טיימר למידה', opt); } catch (e) {}
    }
    function setWake(on) {
      if (on && cfg.wake && 'wakeLock' in navigator && document.visibilityState === 'visible') {
        if (!wakeLock) navigator.wakeLock.request('screen').then(function (w) { wakeLock = w; w.addEventListener('release', function () { wakeLock = null; }); }).catch(function () {});
      } else if (!on && wakeLock) { wakeLock.release().catch(function () {}); wakeLock = null; }
    }
    // רעש רקע חום ושקט: עוזר להתרכז, ומחזיק את הדף ער גם כשהמסך כבוי (באנדרואיד)
    function setNoise(on) {
      try {
        if (on && cfg.noise && !noiseNode) {
          audio = audio || new (window.AudioContext || window.webkitAudioContext)();
          var len = audio.sampleRate * 4, buf = audio.createBuffer(1, len, audio.sampleRate), d = buf.getChannelData(0), last = 0;
          for (var i = 0; i < len; i++) { var w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
          var src = audio.createBufferSource(), g = audio.createGain(); src.buffer = buf; src.loop = true; g.gain.value = 0.18;
          src.connect(g); g.connect(audio.destination); src.start(); noiseNode = src;
          if (audio.state === 'suspended') audio.resume();
        } else if (!on && noiseNode) { noiseNode.stop(); noiseNode = null; }
      } catch (e) {}
    }
    function persist() { save(RUN, run); }
    function finishPhase() {
      var was = run.phase;
      if (was === 'focus') {
        run.round++;
        var lg = load(LOG, {}), t = today(); lg[t] = lg[t] || { m: 0, n: 0 }; lg[t].m += Math.round(phaseLen('focus') / 60000); lg[t].n++; save(LOG, lg);
        used('timer', { action: 'focus_done', mins: Math.round(phaseLen('focus') / 60000) });
        // התקדמות יומית: סבב לימוד שהסתיים = יום של לימוד (assets/hitkadmut.js)
        if (window.HK) HK.done('timer', { el: $('tm-hk'), title: 'עוד סבב לימוד ✓ כל הכבוד!', help: 'טיימר הלימוד כאן בחינם ובלי פרסומות', share: 'למדתי היום עם טיימר הלימוד: 25 דקות ריכוז והפסקה קטנה. בחינם:' });
        run.phase = run.round % 4 === 0 ? 'long' : 'break';
      } else run.phase = 'focus';
      run.left = phaseLen(run.phase);
      chime();
      notify(was === 'focus' ? 'כל הכבוד! עכשיו הפסקה של ' + Math.round(run.left / 60000) + ' דקות.' : 'ההפסקה נגמרה. חוזרים ללמוד' + (cfg.why ? ': ' + cfg.why : '.'));
      var autoGo = cfg.auto || was === 'focus';
      run.running = false;
      if (autoGo) startRun(); else { setNoise(false); setWake(false); }
      persist(); logStats(); paint();
    }
    function loop() {
      if (run.running && remaining() <= 0) finishPhase();
      paint();
    }
    function startRun() {
      run.endAt = Date.now() + run.left; run.running = true; persist();
      setWake(true); setNoise(run.phase === 'focus');
      if (!tick) tick = setInterval(loop, 500);
    }
    function pause() { run.left = remaining(); run.running = false; persist(); setWake(false); setNoise(false); paint(); }
    $('tm-go').addEventListener('click', function () {
      if (audio && audio.state === 'suspended') audio.resume();
      if (run.running) pause(); else { startRun(); if (!run.round && run.phase === 'focus') used('timer', { action: 'start', mode: cfg.mode }); }
      paint();
    });
    $('tm-reset').addEventListener('click', function () { setNoise(false); setWake(false); run = fresh(); persist(); paint(); });
    $('tm-skip').addEventListener('click', function () {
      if (run.phase === 'focus' && !confirm('לדלג להפסקה עכשיו? הסבב לא ייספר.')) return;
      run.phase = run.phase === 'focus' ? 'break' : 'focus'; run.left = phaseLen(run.phase); var r = run.running; run.running = false; if (r) startRun(); else { setNoise(false); } persist(); paint();
    });
    document.querySelectorAll('[data-mode]').forEach(function (b) {
      b.setAttribute('aria-pressed', b.dataset.mode === cfg.mode);
      b.addEventListener('click', function () {
        cfg.mode = b.dataset.mode; saveCfg();
        document.querySelectorAll('[data-mode]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
        $('tm-custom').hidden = cfg.mode !== 'custom';
        if (!run.running) { run = fresh(); persist(); }
        paint();
      });
    });
    $('tm-custom').hidden = cfg.mode !== 'custom';
    ['tm-cf', 'tm-cb'].forEach(function (id) {
      $(id).addEventListener('change', function () { cfg.f = +$('tm-cf').value; cfg.b = +$('tm-cb').value; cfg.l = Math.max(cfg.b * 3, 10); saveCfg(); if (!run.running) { run = fresh(); persist(); } paint(); });
    });
    $('tm-why').addEventListener('input', function () { cfg.why = this.value.trim().slice(0, 120); saveCfg(); paint(); });
    $('tm-wake').addEventListener('change', function () { cfg.wake = this.checked; saveCfg(); setWake(run.running); });
    $('tm-sound').addEventListener('change', function () { cfg.sound = this.checked; saveCfg(); if (this.checked) chime(); });
    $('tm-auto').addEventListener('change', function () { cfg.auto = this.checked; saveCfg(); });
    $('tm-noise').addEventListener('change', function () { cfg.noise = this.checked; saveCfg(); setNoise(run.running && run.phase === 'focus'); });
    $('tm-notif').addEventListener('click', function () {
      var b = this;
      if (!('Notification' in window)) { b.textContent = 'הדפדפן הזה לא תומך בהתראות'; return; }
      Notification.requestPermission().then(function (p) { b.textContent = p === 'granted' ? 'התראות פעילות ✓' : 'ההתראות חסומות. אפשר לאשר בהגדרות הדפדפן'; });
    });
    if ('Notification' in window && Notification.permission === 'granted') $('tm-notif').textContent = 'התראות פעילות ✓';
    $('tm-full').addEventListener('click', function () {
      document.body.classList.toggle('focus-mode');
      var on = document.body.classList.contains('focus-mode');
      this.textContent = on ? 'לצאת ממסך הריכוז' : 'מסך ריכוז (בלי כל השאר)';
      if (on && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(function () {});
      else if (!on && document.fullscreenElement) document.exitFullscreen().catch(function () {});
      window.scrollTo(0, 0);
    });
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') { if (run.running) setWake(true); loop(); } });
    if (run.running) {
      if (remaining() <= 0) finishPhase();
      else { tick = setInterval(loop, 500); setWake(true); }
    }
    logStats(); paint();
  }

  // =====================================================================
  // 4. לימוד יומי לסיום (תנ"ך / משנה / ספר אחר)
  // =====================================================================
  function dailyLearning() {
    var B = window.LIMUD_BOOKS, EN = window.LIMUD_EN;
    if (!B) return;
    var KEY = 'limudim-yomi';
    var st = load(KEY, { plans: [], cur: '' });
    var PARTS = {
      tanakh: [['all', 'כל התנ״ך (929 פרקים)'], ['torah', 'תורה (187 פרקים)'], ['neviim', 'נביאים (380 פרקים)'], ['ketuvim', 'כתובים (362 פרקים)']],
      mishnah: [['all', 'כל ששה סדרי משנה (525 פרקים)'], ['zeraim', 'סדר זרעים'], ['moed', 'סדר מועד'], ['nashim', 'סדר נשים'], ['nezikin', 'סדר נזיקין'], ['kodashim', 'סדר קדשים'], ['tahorot', 'סדר טהרות']],
      rambam: [['all', 'כל משנה תורה (1,006 פרקים)'], ['madda', 'ספר המדע'], ['ahavah', 'ספר אהבה'], ['zemanim', 'ספר זמנים'], ['nashim', 'ספר נשים'], ['kedushah', 'ספר קדושה'], ['haflaah', 'ספר הפלאה'], ['zeraim', 'ספר זרעים'], ['avodah', 'ספר עבודה'], ['korbanot', 'ספר קרבנות'], ['taharah', 'ספר טהרה'], ['nezikim', 'ספר נזיקין'], ['kinyan', 'ספר קנין'], ['mishpatim', 'ספר משפטים'], ['shoftim', 'ספר שופטים']],
      bavli: [['all', 'כל הש״ס הבבלי (2,684 דפים)'], ['zeraim', 'סדר זרעים (ברכות)'], ['moed', 'סדר מועד'], ['nashim', 'סדר נשים'], ['nezikin', 'סדר נזיקין'], ['kodashim', 'סדר קדשים'], ['tahorot', 'סדר טהרות (נדה)']]
    };
    var GROUP = { tanakh: 'ספר אחד', mishnah: 'מסכת אחת', rambam: 'הלכות', bavli: 'מסכת אחת' };
    function fillParts() {
      var w = $('ly-what').value;
      $('ly-part-wrap').hidden = w === 'other'; $('ly-other').hidden = w !== 'other'; $('ly-unit-wrap').hidden = w !== 'mishnah';
      if (w === 'other') return;
      var opts = PARTS[w].map(function (p) { return '<option value="' + p[0] + '">' + p[1] + '</option>'; }).join('');
      opts += '<optgroup label="' + GROUP[w] + '">' + B[w].map(function (b, i) { return '<option value="b' + i + '">' + b[0] + ' (' + b[1] + (w === 'bavli' ? ' דפים' : ' פרקים') + ')</option>'; }).join('') + '</optgroup>';
      $('ly-part').innerHTML = opts;
    }
    $('ly-what').addEventListener('change', fillParts);
    $('ly-len').addEventListener('change', function () { $('ly-end-wrap').hidden = this.value !== 'date'; });
    $('ly-start').value = today();

    function cfgFromForm() {
      var w = $('ly-what').value;
      return { what: w, part: $('ly-part').value, unit: $('ly-unit').value, oname: $('ly-oname').value.trim(), ocount: +$('ly-ocount').value, ofirst: +$('ly-ofirst').value || 1, ounit: $('ly-ounit').value,
        start: $('ly-start').value || today(), len: $('ly-len').value, end: $('ly-end').value, shabbat: $('ly-shabbat').checked, time: $('ly-time').value || '21:00' };
    }
    function fill(c) {
      $('ly-what').value = c.what; fillParts(); if (c.what !== 'other') $('ly-part').value = c.part;
      $('ly-unit').value = c.unit; $('ly-oname').value = c.oname; $('ly-ocount').value = c.ocount || ''; $('ly-ofirst').value = c.ofirst; $('ly-ounit').value = c.ounit;
      $('ly-start').value = c.start; $('ly-len').value = c.len; $('ly-end').value = c.end || ''; $('ly-end-wrap').hidden = c.len !== 'date'; $('ly-shabbat').checked = c.shabbat; $('ly-time').value = c.time;
    }
    function title(c) {
      if (c.what === 'other') return c.oname || 'הספר שלי';
      var lbl = c.part.charAt(0) === 'b' ? B[c.what][+c.part.slice(1)][0] : PARTS[c.what].filter(function (p) { return p[0] === c.part; })[0][1].replace(/ \(.*/, '');
      var one = c.part.charAt(0) === 'b';
      return (one && c.what === 'mishnah' ? 'משנה ' : one && c.what === 'bavli' ? 'מסכת ' : '') + lbl + (c.what === 'mishnah' && c.unit === 'm' ? ' (משנה ליום)' : '');
    }
    // כל יחידות הלימוד, לפי הסדר: {b: מספר ספר, c: פרק, m: משנה}
    function units(c) {
      var u = [];
      if (c.what === 'other') { for (var k = 0; k < c.ocount; k++) u.push({ b: -1, c: c.ofirst + k }); return u; }
      B[c.what].forEach(function (b, i) {
        var inPart = c.part === 'all' || c.part === b[2] || c.part === 'b' + i;
        if (!inPart) return;
        if (c.what === 'bavli') { for (var df = b[3]; df < b[3] + b[1]; df++) u.push({ b: i, c: df }); return; }
        for (var ch = 1; ch <= b[1]; ch++) {
          if (c.what === 'mishnah' && c.unit === 'm') for (var m = 1; m <= b[3][ch - 1]; m++) u.push({ b: i, c: ch, m: m });
          else u.push({ b: i, c: ch });
        }
      });
      return u;
    }
    function endDate(c) {
      var s = parse(c.start);
      var map = { m1: [0, 1], m3: [0, 3], m6: [0, 6], y1: [1, 0], y2: [2, 0], y3: [3, 0] };
      if (c.len === 'date') return c.end;
      var p = map[c.len]; return ymd(addDays(new Date(s.getFullYear() + p[0], s.getMonth() + p[1], s.getDate()), -1));
    }
    var UNIT_NAMES = { c: ['פרק', 'פרקים'], m: ['משנה', 'משניות'], daf: ['דף', 'דפים'], amud: ['עמוד', 'עמודים'], shiur: ['שיעור', 'שיעורים'], perek: ['פרק', 'פרקים'], siman: ['סימן', 'סימנים'] };
    function unitName(c) { return c.what === 'other' ? UNIT_NAMES[c.ounit] : c.what === 'mishnah' && c.unit === 'm' ? UNIT_NAMES.m : c.what === 'bavli' ? UNIT_NAMES.daf : UNIT_NAMES.c; }
    function bookName(c, i) { return i < 0 ? (c.oname || '') : B[c.what][i][0]; }
    function pos(x) { return gem(x.c) + (x.m ? ':' + gem(x.m) : ''); }
    function rangeText(c, list) {
      if (!list.length) return '';
      if (c.what === 'other') { var un = UNIT_NAMES[c.ounit][0]; var a = list[0].c, z = list[list.length - 1].c; return (c.oname ? c.oname + ', ' : '') + un + ' ' + gem(a) + (z !== a ? '–' + gem(z) : ''); }
      var segs = [], s = list[0], prev = list[0];
      for (var i = 1; i <= list.length; i++) {
        var x = list[i];
        if (!x || x.b !== s.b) { segs.push(bookName(c, s.b) + (c.what === 'bavli' ? ' דף ' : ' ') + pos(s) + (prev !== s ? '–' + pos(prev) : '')); s = x; }
        prev = x;
      }
      return segs.join(', ');
    }
    function sefaria(c, x) {
      if (c.what === 'other' || !EN) return '';
      return 'https://www.sefaria.org/' + encodeURIComponent(EN[c.what][x.b].replace(/ /g, '_')) + '.' + x.c + (c.what === 'bavli' ? 'a' : '') + (x.m ? '.' + x.m : '') + '?lang=he';
    }
    // ---------- הטקסט של היום, מספריא ----------
    function refsOf(c, x) {
      var b = EN[c.what][x.b];
      if (c.what === 'bavli') return [b + '.' + x.c + 'a', b + '.' + x.c + 'b'];
      return [b + '.' + x.c + (x.m ? '.' + x.m : '')];
    }
    function flat(t) { return Array.isArray(t) ? t.reduce(function (a, x) { return a.concat(flat(x)); }, []) : [t]; }
    function clean(h) { var d = document.createElement('div'); d.innerHTML = String(h || '').replace(/<sup[^>]*>.*?<\/sup>/g, '').replace(/<i class="footnote"[^>]*>.*?<\/i>/g, ''); return d.textContent.replace(/\{[פס]\}/g, '').replace(/\s+/g, ' ').trim(); }
    var textCache = {};
    function getText(ref) {
      if (textCache[ref]) return Promise.resolve(textCache[ref]);
      return fetch('https://www.sefaria.org/api/v3/texts/' + encodeURIComponent(ref) + '?version=hebrew').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
        if (!d || !d.versions || !d.versions.length) return null;
        var v = flat(d.versions[0].text).map(clean).filter(Boolean); textCache[ref] = v; return v;
      }).catch(function () { return null; });
    }
    var txtOpt = load('limudim-yomi-text', { size: 1.25, nikud: true });
    function showText(c, list) {
      var box = $('ly-text'); box.hidden = false;
      box.innerHTML = '<div class="txt-bar"><button type="button" class="say" data-ts="1">א+</button><button type="button" class="say" data-ts="-1">א−</button><label class="checks" style="display:flex"><input type="checkbox" id="ly-nikud"' + (txtOpt.nikud ? ' checked' : '') + '> <span>ניקוד וטעמים</span></label></div><div class="txt-body" id="ly-txt-body" style="font-size:' + txtOpt.size + 'rem"><p class="note">טוען מספריא…</p></div>';
      var items = list.slice(0, 12), jobs = [];
      items.forEach(function (x) { refsOf(c, x).forEach(function (ref, k) { jobs.push({ x: x, ref: ref, k: k }); }); });
      Promise.all(jobs.map(function (j) { return getText(j.ref); })).then(function (res) {
        var html = '';
        jobs.forEach(function (j, i) {
          var head = c.what === 'bavli' ? bookName(c, j.x.b) + ' דף ' + gem(j.x.c) + (j.k ? ' עמוד ב' : ' עמוד א') : bookName(c, j.x.b) + ' ' + pos(j.x);
          var v = res[i];
          html += '<h3>' + esc(head) + '</h3>' + (v ? v.map(function (t, n) { return '<p>' + (v.length > 1 && c.what !== 'bavli' ? '<span class="vn">' + gem(n + 1) + '</span> ' : '') + esc(txtOpt.nikud ? t : t.replace(/[֑-ֽֿ-ׇ]/g, '')) + '</p>'; }).join('') : '<p class="note">לא הצלחתי לטעון. אפשר לפתוח בספריא.</p>');
        });
        if (list.length > items.length) html += '<p class="note">ועוד ' + (list.length - items.length) + ', בספריא.</p>';
        html += '<p class="note" style="margin-top:1rem">הטקסט מספריא (sefaria.org), ברישיון פתוח.</p>';
        $('ly-txt-body').innerHTML = html;
        used('yomi', { action: 'text', what: c.what });
      });
    }
    function todayRow(c) { var s = schedule(c), t = today(); return s ? s.rows.filter(function (r) { return r.date >= t; })[0] : null; }
    $('ly-today').addEventListener('click', function (e) {
      var p = plan(); if (!p) return;
      if (e.target.closest('#ly-show-text')) { var tr = todayRow(p.cfg); if (tr) showText(p.cfg, tr.u); return; }
      var ts = e.target.closest('[data-ts]');
      if (ts) { txtOpt.size = Math.max(.9, Math.min(2.4, txtOpt.size + .15 * +ts.dataset.ts)); save('limudim-yomi-text', txtOpt); $('ly-txt-body').style.fontSize = txtOpt.size + 'rem'; }
    });
    $('ly-today').addEventListener('change', function (e) {
      if (e.target.id !== 'ly-nikud') return; txtOpt.nikud = e.target.checked; save('limudim-yomi-text', txtOpt);
      var p = plan(), tr = p && todayRow(p.cfg); if (tr) showText(p.cfg, tr.u);
    });
    function schedule(c) {
      var all = units(c), end = endDate(c), days = [], start = c.restFrom || c.start;
      var u = c.rest ? c.rest.map(function (i) { return all[i]; }).filter(Boolean) : all;
      if (!u.length || !end || end < start) return null;
      for (var d = parse(start), e = parse(end); d <= e; d = addDays(d, 1)) { if (!c.shabbat && d.getDay() === 6) continue; days.push(ymd(d)); }
      if (!days.length) return null;
      var N = u.length, D = days.length, rows = [];
      if (N >= D) {
        for (var i = 0; i < D; i++) rows.push({ date: days[i], u: u.slice(Math.floor(i * N / D), Math.floor((i + 1) * N / D)) });
      } else {
        var by = {};
        u.forEach(function (x, k) { var di = Math.floor(k * D / N); (by[di] = by[di] || []).push(x); });
        Object.keys(by).forEach(function (di) { rows.push({ date: days[+di], u: by[di] }); });
      }
      return { rows: rows, N: N, D: D, end: end };
    }
    function plan() { return st.plans.filter(function (p) { return p.id === st.cur; })[0]; }
    function perDay(s, c) {
      var un = unitName(c), r = s.N / s.D;
      if (r >= 1) {
        var lo = Math.floor(r), hi = Math.ceil(r);
        return lo === hi ? lo + ' ' + (lo === 1 ? un[0] : un[1]) + ' ביום' : 'בין ' + lo + ' ל-' + hi + ' ' + un[1] + ' ביום, בממוצע ' + (Math.round(r * 10) / 10);
      }
      var every = Math.round(1 / r * 10) / 10;
      return un[0] + ' אחד כל ' + (every === 2 ? 'יומיים' : every + ' ימים') + ' בערך';
    }
    function render() {
      var p = plan(), out = $('ly-out');
      $('ly-plans-wrap').hidden = !st.plans.length;
      $('ly-plans').innerHTML = st.plans.map(function (q) { return '<option value="' + q.id + '"' + (q.id === st.cur ? ' selected' : '') + '>' + esc(title(q.cfg)) + ' · עד ' + longDate(endDate(q.cfg)) + '</option>'; }).join('');
      if (!p) { out.hidden = true; return; }
      var s = schedule(p.cfg); if (!s) { out.hidden = true; return; }
      var c = p.cfg, t = today(), done = s.rows.filter(function (r) { return p.done[r.date]; }).length;
      var shouldBe = s.rows.filter(function (r) { return r.date < t; }).length, behind = s.rows.filter(function (r) { return r.date < t && !p.done[r.date]; }).length;
      var un = unitName(c);
      $('ly-sum').innerHTML = '<div class="big-n">' + esc(perDay(s, c)) + '</div><p>' + esc(title(c)) + ': ' + s.N + ' ' + un[1] + ', ' + s.rows.length + ' ימי לימוד, מ-' + longDate(c.restFrom || c.start) + ' עד ' + longDate(s.end) + '.</p>' +
        (c.rest ? '<p>חולק מחדש ב-' + longDate(c.restFrom) + '. לפני כן למדת ' + ((c.prevDone || 0) === 1 ? 'יום אחד' : (c.prevDone || 0) + ' ימים') + ' ✓</p>' : '') +
        '<p>למדת ' + done + ' מתוך ' + s.rows.length + ' ימים' + (behind ? ' · אפשר להמשיך מכאן בכל הכוח 💪' : shouldBe ? ' · בדיוק בזמן ✓' : '') + '</p>' +
        (behind ? '<button class="btn btn-line btn-sm no-print" type="button" id="ly-redo" style="margin-top:.6rem">להתחיל נקי מהיום: לחלק מחדש את מה שנשאר</button>' : '') + '<div class="bar" style="margin-top:.6rem"><i style="width:' + Math.round(done * 100 / s.rows.length) + '%"></i></div>';
      var tr = s.rows.filter(function (r) { return r.date >= t; })[0];
      var tb = $('ly-today');
      if (tr) {
        var link = sefaria(c, tr.u[0]);
        tb.innerHTML = '<div style="color:var(--accent);font-weight:700">' + (tr.date === t ? 'היום' : 'הלימוד הבא: ' + dayLabel(tr.date)) + '</div><b>' + esc(rangeText(c, tr.u)) + '</b>' +
          '<div class="btns" style="margin-top:.7rem"><label class="checks" style="display:flex"><input type="checkbox" data-d="' + tr.date + '"' + (p.done[tr.date] ? ' checked' : '') + '> <span>למדתי ✓</span></label>' + (link ? '<button class="btn btn-gold btn-sm" type="button" id="ly-show-text">📜 הטקסט כאן</button><a class="btn btn-line btn-sm" href="' + link + '" target="_blank" rel="noopener">בספריא</a>' : '') + '</div><div id="ly-text" class="txt" hidden></div>';
        tb.hidden = false;
      } else { tb.innerHTML = '<b>סיימת את התוכנית! מזל טוב 🎉</b>'; tb.hidden = false; }
      // טבלה לפי חודשים
      var months = {}, order = [];
      s.rows.forEach(function (r) { var k = r.date.slice(0, 7); if (!months[k]) { months[k] = []; order.push(k); } months[k].push(r); });
      var curM = t.slice(0, 7);
      $('ly-table').innerHTML = order.map(function (k, idx) {
        var rs = months[k], dn = rs.filter(function (r) { return p.done[r.date]; }).length, d0 = parse(k + '-01');
        var open = k === curM || (idx === 0 && curM < order[0]);
        return '<details class="month"' + (open ? ' open' : '') + '><summary><span>' + MONTHS[d0.getMonth()] + ' ' + d0.getFullYear() + '</span><span class="pill">' + dn + '/' + rs.length + '</span></summary><table class="plan"><tbody>' +
          rs.map(function (r) { return '<tr class="' + (r.date === t ? 'today ' : '') + (p.done[r.date] ? 'done' : '') + '"><td class="d">' + dayLabel(r.date) + '</td><td>' + esc(rangeText(c, r.u)) + '</td><td class="x"><input type="checkbox" data-d="' + r.date + '"' + (p.done[r.date] ? ' checked' : '') + ' aria-label="למדתי ב' + dayLabel(r.date) + '"></td></tr>'; }).join('') +
          '</tbody></table></details>';
      }).join('');
      out.hidden = false;
    }
    $('ly-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var c = cfgFromForm(), msg = $('ly-st');
      if (c.what === 'other' && !(c.ocount > 0)) { msg.textContent = 'צריך לכתוב כמה יחידות יש בספר (למשל 150 פרקים).'; return; }
      if (c.len === 'date' && !c.end) { msg.textContent = 'צריך לבחור עד איזה תאריך לסיים.'; return; }
      var s = schedule(c); if (!s) { msg.textContent = 'תאריך הסיום צריך להיות אחרי תאריך ההתחלה.'; return; }
      var p = plan();
      if (p && title(p.cfg) === title(c) && p.cfg.start === c.start) p.cfg = c;
      else { p = { id: 'y' + Date.now(), cfg: c, done: {} }; st.plans.push(p); st.cur = p.id; }
      save(KEY, st); msg.textContent = ''; render();
      used('yomi', { what: c.what, part: c.part, len: c.len, units: s.N, days: s.rows.length });
      $('ly-out').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    function onCheck(e) {
      var cb = e.target; if (!cb.dataset || !cb.dataset.d) return; var p = plan(); if (!p) return;
      if (cb.checked) p.done[cb.dataset.d] = 1; else delete p.done[cb.dataset.d];
      save(KEY, st);
      var open = Array.prototype.map.call(document.querySelectorAll('#ly-table details'), function (d) { return d.open; });
      render();
      document.querySelectorAll('#ly-table details').forEach(function (d, i) { d.open = open[i]; });
      if (cb.checked) used('yomi', { action: 'done' });
      // התקדמות יומית: כל יום שמסמנים בו לימוד נספר לרצף (assets/hitkadmut.js)
      if (cb.checked && window.HK) HK.done('yomi', { el: $('ly-hk'), title: 'למדת היום ✓ כל הכבוד!', help: 'הלימוד היומי כאן בחינם ובלי פרסומות', share: 'למדתי היום בלימוד היומי לסיום ' + title(p.cfg) + '. מצטרפים? כמה דקות ביום, בחינם:' });
    }
    $('ly-table').addEventListener('change', onCheck);
    $('ly-sum').addEventListener('click', function (e) {
      if (!e.target.closest('#ly-redo')) return;
      var p = plan(); if (!p) return; var c = p.cfg, s = schedule(c), t = today();
      if (endDate(c) <= t) { alert('תאריך הסיום כבר עבר. אפשר לבחור תאריך סיום חדש בטופס ולבנות שוב.'); return; }
      var all = units(c), key = function (x) { return x.b + ':' + x.c + ':' + (x.m || 0); }, idx = {};
      all.forEach(function (x, i) { idx[key(x)] = i; });
      var left = [], doneN = 0;
      s.rows.forEach(function (r) { if (p.done[r.date]) doneN++; else r.u.forEach(function (x) { left.push(idx[key(x)]); }); });
      if (!confirm('לחלק מחדש ' + left.length + ' ' + unitName(c)[1] + ' שנשארו, מהיום ועד ' + longDate(endDate(c)) + '?')) return;
      c.prevDone = (c.prevDone || 0) + doneN; c.rest = left; c.restFrom = t; p.done = {};
      save(KEY, st); render(); used('yomi', { action: 'redistribute', left: left.length });
    });
    // קיצורים מוכנים
    document.querySelectorAll('[data-preset]').forEach(function (b) {
      b.addEventListener('click', function () {
        var a = b.dataset.preset.split('|'), w = a[0], part = a[1];
        $('ly-what').value = w; fillParts();
        if (part.charAt(0) === '=') { var i = B[w].map(function (x) { return x[0]; }).indexOf(part.slice(1)); part = 'b' + i; }
        $('ly-part').value = part; $('ly-unit').value = a[3] || 'c'; $('ly-len').value = a[2]; $('ly-end-wrap').hidden = true; $('ly-start').value = today();
        $('ly-form').requestSubmit();
      });
    });
    $('ly-today').addEventListener('change', onCheck);
    $('ly-plans').addEventListener('change', function () { st.cur = this.value; save(KEY, st); var p = plan(); if (p) fill(p.cfg); render(); });
    $('ly-newplan').addEventListener('click', function () { st.cur = ''; save(KEY, st); $('ly-form').reset(); $('ly-start').value = today(); fillParts(); render(); window.scrollTo({ top: $('ly-form').offsetTop - 80, behavior: 'smooth' }); });
    $('ly-del').addEventListener('click', function () {
      var p = plan(); if (!p || !confirm('למחוק את התוכנית "' + title(p.cfg) + '" ואת הסימונים שלה?')) return;
      st.plans = st.plans.filter(function (x) { return x !== p; }); st.cur = st.plans[0] ? st.plans[0].id : ''; save(KEY, st); var q = plan(); if (q) fill(q.cfg); render();
    });
    $('ly-ics').addEventListener('click', function () {
      var p = plan(); if (!p) return; var s = schedule(p.cfg), c = p.cfg, t = today();
      var rows = s.rows.filter(function (r) { return r.date >= t; });
      if ($('ly-ics-range').value !== 'all') { var lim = ymd(addDays(new Date(), +$('ly-ics-range').value)); rows = rows.filter(function (r) { return r.date <= lim; }); }
      icsDownload('limud-yomi.ics', 'לימוד יומי: ' + title(c), rows.map(function (r) {
        var link = sefaria(c, r.u[0]);
        return { date: r.date, time: c.time, mins: 20, alarm: 0, title: '📖 ' + rangeText(c, r.u), desc: 'לימוד יומי לסיום ' + title(c) + (link ? '\nללמוד בספריא: ' + link : '') + '\nהתוכנית שלך: https://hakelim.com/limudim/yomi/' };
      }));
      $('ly-tip').hidden = false; used('yomi', { action: 'ics', n: rows.length });
    });
    $('ly-print').addEventListener('click', function () { document.querySelectorAll('#ly-table details').forEach(function (d) { d.open = true; }); window.print(); });
    fillParts();
    var p0 = plan(); if (p0) fill(p0.cfg);
    render();
  }

  // =====================================================================
  // 5. לומדים עם כל העולם: דף יומי, רמב"ם יומי, משנה יומית ועוד (חישוב: @hebcal/learning, עותק מקומי ב-assets/vendor/hebcal, טקסט: ספריא)
  // =====================================================================
  function olami() {
    var KEY = 'limudim-olami';
    var CYC = [
      { id: 'dafyomi', name: 'הדף היומי', sub: 'תלמוד בבלי, דף ביום', fresh: 'מסכת חדשה', key: function (e) { return e.daf.name; } },
      { id: 'rambam3', name: 'רמב״ם יומי, 3 פרקים', sub: 'משנה תורה בשנה', fresh: 'ספר חדש', key: function (e) { return sefer(e.readings[e.readings.length - 1].name); }, pre: function (e) { return seferName(e.readings[e.readings.length - 1].name); } },
      { id: 'rambam1', name: 'רמב״ם יומי, פרק אחד', sub: 'משנה תורה בשלוש שנים', fresh: 'ספר חדש', key: function (e) { return sefer(e.reading.name); }, pre: function (e) { return seferName(e.reading.name); } },
      { id: 'mishnayomi', name: 'משנה יומית', sub: 'שתי משניות ביום', fresh: 'מסכת חדשה', key: function (e) { return e.mishnaYomi[e.mishnaYomi.length - 1].k; } },
      { id: 'perekyomi', name: 'פרק משנה ביום', sub: 'פרק אחד ביום', fresh: 'מסכת חדשה', key: function (e) { return e.k; } },
      { id: '929', name: 'תנ״ך ביחד (929)', sub: 'פרק תנ״ך ביום', fresh: 'ספר חדש', key: function (e) { return e.reading.book; } },
      { id: 'nachyomi', name: 'נ״ך יומי', sub: 'פרק נביאים וכתובים ביום', fresh: 'ספר חדש', key: function (e) { return e.k; } },
      { id: 'yerushalmi-vilna', name: 'ירושלמי יומי', sub: 'דף ביום', fresh: 'מסכת חדשה', key: function (e) { return e.daf.name; } },
      { id: 'psalms', name: 'תהילים לפי ימי החודש', sub: 'כל התהילים בכל חודש', fresh: 'חודש חדש', key: function (e, hd) { return hd.getMonth(); } },
      { id: 'chofetzchaim', name: 'חפץ חיים יומי', sub: 'הלכות שמירת הלשון', fresh: 'פרק חדש', key: function (e) { return e.reading.k; } }
    ];
    // ברמב"ם, "התחלה חדשה" היא ספר חדש (14 ספרים), לא כל הלכות: לפי רשימת ספריא ב-limudim-data.js
    var SEFER = { madda: 'ספר המדע', ahavah: 'ספר אהבה', zemanim: 'ספר זמנים', nashim: 'ספר נשים', kedushah: 'ספר קדושה', haflaah: 'ספר הפלאה', zeraim: 'ספר זרעים', avodah: 'ספר עבודה', korbanot: 'ספר קרבנות', taharah: 'ספר טהרה', nezikim: 'ספר נזיקין', kinyan: 'ספר קנין', mishpatim: 'ספר משפטים', shoftim: 'ספר שופטים' };
    var RB = {};
    if (window.LIMUD_EN && window.LIMUD_EN.rambam) window.LIMUD_EN.rambam.forEach(function (en, i) { RB[en.replace('Mishneh Torah, ', '').toLowerCase()] = window.LIMUD_BOOKS.rambam[i][2]; });
    function sefer(name) { return RB[String(name).toLowerCase()] || name; }
    function seferName(name) { if (/Transmission of the Oral Law/i.test(name)) return 'מחזור חדש של הרמב״ם'; var k = RB[String(name).toLowerCase()]; return k ? SEFER[k] : ''; }
    var st = load(KEY, { sel: ['dafyomi', 'rambam3'], since: {}, done: {}, time: '07:00' });
    var t = today();
    st.sel.forEach(function (id) { if (!st.since[id]) st.since[id] = t; });
    save(KEY, st);
    var H = null, DL = null;
    var box = $('ol-app');
    box.innerHTML = '<p class="note">טוען את לוח הלימוד העולמי…</p>';
    Promise.all([
      import('/assets/vendor/hebcal/hebcal_hdate0-23-1.js'),
      import('/assets/vendor/hebcal/hebcal_learning6-13-1.js')
    ]).then(function (m) {
      H = m[0];
      return import('/assets/vendor/hebcal/hebcal_core6-14-7_dist_esm_DailyLearning.js');
    }).then(function (m) { DL = m.DailyLearning; render(); }).catch(function () {
      box.innerHTML = '<p class="status">לא הצלחתי לטעון את הלוח. צריך אינטרנט בפעם הראשונה. לנסות שוב בעוד רגע.</p>';
    });

    function cyc(id) { return CYC.filter(function (c) { return c.id === id; })[0]; }
    function hd(dateStr) { return new H.HDate(parse(dateStr)); }
    function ev(id, dateStr) { try { return DL.lookup(id, hd(dateStr)); } catch (e) { return null; } }
    function heb(dateStr) { return hd(dateStr).renderGematriya(true).replace(/[֑-ׇ]/g, ''); }
    function txt(e) {
      var s = e.render('he').replace(/[֑-ֽֿ-ׇ]/g, '').replace(/^דף יומי:\s*/, '').replace(/\s*\(\d+\)\s*$/, '');
      return s.replace(/\d+/g, function (n) { return H.gematriya(+n).replace(/[׳״]/g, ''); });
    }
    function full(c, e) { var p = c.pre ? c.pre(e) : ''; return (p ? p + ', ' : '') + txt(e); }
    function isFresh(c, dateStr) {
      var e = ev(c.id, dateStr), y = ev(c.id, ymd(addDays(parse(dateStr), -1)));
      if (!e || !y) return false;
      try { return c.key(e, hd(dateStr)) !== c.key(y, hd(ymd(addDays(parse(dateStr), -1)))); } catch (x) { return false; }
    }
    function nextFresh(c, from, max) {
      var out = [];
      for (var i = 0; i < 420 && out.length < max; i++) { var d = ymd(addDays(parse(from), i)); if (isFresh(c, d)) out.push(d); }
      return out;
    }
    function behind(id) {
      var n = 0, since = st.since[id] || t, done = st.done[id] || {};
      for (var d = parse(since); ymd(d) < t; d = addDays(d, 1)) if (!done[ymd(d)]) n++;
      return n;
    }
    function streak(id) {
      var done = st.done[id] || {}, n = 0, d = parse(t);
      if (!done[t]) d = addDays(d, -1);
      while (done[ymd(d)]) { n++; d = addDays(d, -1); }
      return n;
    }
    function inDays(d) { var k = daysBetween(t, d); return k === 0 ? 'היום' : k === 1 ? 'מחר' : 'בעוד ' + k + ' ימים'; }

    function render() {
      var chips = CYC.map(function (c) { return '<button type="button" data-cyc="' + c.id + '" aria-pressed="' + (st.sel.indexOf(c.id) >= 0) + '">' + c.name + '</button>'; }).join('');
      var fresh = [];
      st.sel.forEach(function (id) {
        var c = cyc(id);
        [t, ymd(addDays(parse(t), 1))].forEach(function (d) { if (isFresh(c, d)) { var e = ev(id, d); fresh.push({ c: c, d: d, e: e }); } });
      });
      var html = '<div class="today-heb">היום ' + esc(heb(t)) + ' · ' + dayLabel(t) + '</div>';
      if (fresh.length) html += fresh.map(function (f) {
        return '<div class="fresh">🌱 <b>' + (f.d === t ? 'היום' : 'מחר') + ' מתחילים ' + f.c.fresh + ' ב' + f.c.name + ': ' + esc(full(f.c, f.e)) + '.</b><br>לא משנה מה היה עד עכשיו. זה הרגע להצטרף מחדש, בכל הכוח.' +
          (behind(f.c.id) ? '<br><button class="btn btn-gold btn-sm" type="button" data-reset="' + f.c.id + '" data-from="' + f.d + '" style="margin-top:.5rem">להתחיל נקי מ' + (f.d === t ? 'היום' : 'מחר') + '</button>' : '') + '</div>';
      }).join('');
      html += st.sel.map(function (id) {
        var c = cyc(id), e = ev(id, t); if (!e) return '';
        var done = (st.done[id] || {})[t], b = behind(id), sk = streak(id), nf = nextFresh(c, ymd(addDays(parse(t), 1)), 1)[0], url = e.url ? e.url() : '';
        var sef = /sefaria\.org/.test(url);
        return '<div class="ol-card' + (done ? ' is-done' : '') + '"><div class="ol-h"><b>' + c.name + '</b><span class="pill">' + c.sub + '</span></div>' +
          '<div class="ol-today">' + esc(txt(e)) + '</div>' +
          '<div class="btns"><label class="checks" style="display:flex"><input type="checkbox" data-done="' + id + '"' + (done ? ' checked' : '') + '> <span>למדתי היום ✓</span></label>' +
          (sef ? '<button class="btn btn-gold btn-sm" type="button" data-text="' + id + '">📜 הטקסט כאן</button>' : '') + (url ? '<a class="btn btn-line btn-sm" href="' + esc(url.replace('lang=bi', 'lang=he')) + '" target="_blank" rel="noopener">' + (sef ? 'בספריא' : 'לקריאה') + '</a>' : '') + '</div>' +
          '<div class="ol-meta">' + (sk ? '🔥 רצף: ' + sk + (sk === 1 ? ' יום' : ' ימים') + ' · ' : '') + (nf ? c.fresh + ' ' + inDays(nf) + ' (' + esc(heb(nf).replace(/ ת[^ ]*$/, '')) + '): ' + esc(full(c, ev(id, nf))) : '') + '</div>' +
          (b ? '<div class="ol-back">יש ' + (b === 1 ? 'יום אחד' : b + ' ימים') + ' שלא סומנו. לא צריך להשלים הכול כדי להמשיך. ' + (nf ? 'כשמתחילים ' + c.fresh + ' (' + inDays(nf) + ') אפשר להצטרף מחדש בלי פיגור, ' : '') + 'או ממש עכשיו:' +
            '<br><button class="linkish" type="button" data-reset="' + id + '" data-from="' + t + '">להתחיל נקי מהיום, בלי הפיגור</button></div>' : '') +
          '<div class="ol-text" id="ol-text-' + id + '" hidden></div></div>';
      }).join('') || '<p class="note">בוחרים למטה מה ללמוד.</p>';
      html += '<div class="panel"><h3>מה ללמוד?</h3><p class="note">אפשר כמה. כל מחזור מתחיל לספור מהיום שבחרת בו.</p><div class="modes" style="justify-content:flex-start">' + chips + '</div></div>';
      var up = [];
      st.sel.forEach(function (id) { var c = cyc(id); nextFresh(c, ymd(addDays(parse(t), 1)), 3).forEach(function (d) { up.push({ d: d, c: c }); }); });
      up.sort(function (a, b) { return a.d < b.d ? -1 : 1; });
      if (up.length) html += '<div class="panel"><h3>🌱 מתי מתחילים מחדש</h3><p class="note">כל מסכת חדשה וכל ספר חדש הם הזדמנות להצטרף בלי פיגור.</p><table class="plan"><tbody>' +
        up.slice(0, 10).map(function (u) { return '<tr><td class="d">' + dayLabel(u.d) + '<br><small>' + esc(heb(u.d).replace(/ ת[^ ]*$/, '')) + '</small></td><td><b>' + u.c.name + '</b><br>' + esc(full(u.c, ev(u.c.id, u.d))) + '</td></tr>'; }).join('') + '</tbody></table></div>';
      html += '<div class="panel"><h3>תזכורות ביומן</h3><div class="row2"><div class="field"><label for="ol-time">באיזו שעה?</label><input id="ol-time" type="time" value="' + (st.time || '07:00') + '"></div></div>' +
        '<div class="btns"><button class="btn btn-gold btn-sm" type="button" id="ol-ics-fresh">🌱 התראה לכל התחלה חדשה (שנה קדימה)</button><button class="btn btn-line btn-sm" type="button" id="ol-ics-daily">תזכורת יומית עם מה לומדים (חודש קדימה)</button></div>' +
        '<p class="note">ההתראה על התחלה חדשה מגיעה גם בערב שלפני, כדי שתהיה מוכן להתחיל בכל הכוח.</p><p class="ios-tip" id="ol-tip" hidden>הקובץ ירד. פותחים אותו, והיומן מציע להוסיף את האירועים. ביומן גוגל במחשב: הגדרות ← ייבוא.</p></div>';
      box.innerHTML = html;
    }

    function showText(id) {
      var e = ev(id, t), el = $('ol-text-' + id); if (!e || !el) return;
      var m = (e.url() || '').match(/sefaria\.org\/([^?]+)/); if (!m) return;
      var ref = decodeURIComponent(m[1]).replace(/_/g, ' '), refs = [ref];
      if (/\d+a$/.test(ref)) refs.push(ref.replace(/a$/, 'b'));
      el.hidden = false; el.innerHTML = '<p class="note">טוען מספריא…</p>';
      Promise.all(refs.map(function (r) {
        return fetch('https://www.sefaria.org/api/v3/texts/' + encodeURIComponent(r) + '?version=hebrew').then(function (x) { return x.ok ? x.json() : null; }).catch(function () { return null; });
      })).then(function (res) {
        var flat = function (a) { return Array.isArray(a) ? a.reduce(function (o, x) { return o.concat(flat(x)); }, []) : [a]; };
        var html = res.map(function (d, i) {
          if (!d || !d.versions || !d.versions.length) return '<p class="note">לא הצלחתי לטעון. אפשר לפתוח בספריא.</p>';
          return (refs.length > 1 ? '<h3>' + (i ? 'עמוד ב' : 'עמוד א') + '</h3>' : '') + flat(d.versions[0].text).map(function (h) { var x = document.createElement('div'); x.innerHTML = String(h || '').replace(/<sup[^>]*>.*?<\/sup>/g, '').replace(/<i class="footnote"[^>]*>.*?<\/i>/g, ''); return x.textContent.trim(); }).filter(Boolean).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
        }).join('');
        el.innerHTML = '<div class="txt-body">' + html + '<p class="note">הטקסט מספריא (sefaria.org), ברישיון פתוח.</p></div>';
        used('olami', { action: 'text', cycle: id });
      });
    }

    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cyc]');
      if (b) {
        var id = b.dataset.cyc, i = st.sel.indexOf(id);
        if (i >= 0) st.sel.splice(i, 1); else { st.sel.push(id); st.since[id] = t; used('olami', { action: 'add', cycle: id }); }
        save(KEY, st); render(); return;
      }
      var r = e.target.closest('[data-reset]');
      if (r) { st.since[r.dataset.reset] = r.dataset.from; save(KEY, st); render(); used('olami', { action: 'fresh_start', cycle: r.dataset.reset }); return; }
      var x = e.target.closest('[data-text]'); if (x) { showText(x.dataset.text); return; }
      if (e.target.id === 'ol-ics-fresh' || e.target.id === 'ol-ics-daily') {
        var time = ($('ol-time') && $('ol-time').value) || '07:00'; st.time = time; save(KEY, st);
        var evs = [];
        if (e.target.id === 'ol-ics-fresh') {
          st.sel.forEach(function (id) {
            var c = cyc(id);
            nextFresh(c, t, 40).forEach(function (d) {
              if (daysBetween(t, d) > 366) return;
              evs.push({ date: d, time: time, mins: 30, alarm: 720, title: '🌱 מתחילים ' + c.fresh + ' ב' + c.name + ': ' + full(c, ev(id, d)), desc: 'לא משנה מה היה עד עכשיו. זה הרגע להצטרף מחדש, בכל הכוח.\nhttps://hakelim.com/limudim/olami/' });
            });
          });
          evs.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
          icsDownload('matchilim-mechadash.ics', 'מתחילים מחדש', evs);
        } else {
          for (var k = 0; k < 31; k++) {
            var d = ymd(addDays(parse(t), k));
            var lines = st.sel.map(function (id) { var q = ev(id, d); return q ? cyc(id).name + ': ' + txt(q) : ''; }).filter(Boolean);
            if (lines.length) evs.push({ date: d, time: time, mins: 20, alarm: 0, title: '📖 ' + lines.join(' · '), desc: lines.join('\n') + '\nhttps://hakelim.com/limudim/olami/' });
          }
          icsDownload('limud-olami.ics', 'הלימוד היומי שלי', evs);
        }
        $('ol-tip').hidden = false; used('olami', { action: 'ics', kind: e.target.id, n: evs.length });
      }
    });
    box.addEventListener('change', function (e) {
      var id = e.target.dataset && e.target.dataset.done; if (!id) return;
      st.done[id] = st.done[id] || {};
      if (e.target.checked) st.done[id][t] = 1; else delete st.done[id][t];
      save(KEY, st); render(); if (e.target.checked) used('olami', { action: 'done', cycle: id });
    });
  }

  if ($('ol-app')) olami();
  if ($('fc-deck')) flashcards();
  if ($('mv-form')) examPlanner();
  if ($('tm-clock')) studyTimer();
  if ($('ly-form')) dailyLearning();
})();
