// נפש ויום-יום – הכלים של גילעד רחמים.
// כל הנתונים נשמרים רק בטלפון (localStorage, מפתחות nefesh-*). שום דבר לא נשלח לשרת,
// חוץ מ: (1) ההקלטה ביומן הקול, שנשלחת לתמלול בענן ולא נשמרת שם; (2) טופס "משפחת הכלים", רק כשממלאים אותו.
// מדידה: window.toolUsed(tool) מ-kelim.js → אירוע GA4 tool_use{site:'nefesh', tool}.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); };
  var body = document.body;
  var TOOL = body.getAttribute('data-tool') || '';

  // ---------- אחסון בטלפון ----------
  function load(k, def) { try { var v = localStorage.getItem('nefesh-' + k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
  function save(k, v) { try { localStorage.setItem('nefesh-' + k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function drop(k) { try { localStorage.removeItem('nefesh-' + k); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function today(d) { d = d || new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function addDays(ymd, n) { var p = ymd.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2] + n); return today(d); }
  var DAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
  function dayName(ymd) { var p = ymd.split('-'); return DAYS[new Date(+p[0], +p[1] - 1, +p[2]).getDay()]; }
  function heDate(ts) { var d = new Date(ts); return d.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'numeric' }) + ' · ' + d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }); }
  function telHref(p) { return 'tel:' + String(p || '').replace(/[^\d*#+]/g, ''); }
  function waHref(p, text) {
    var d = String(p || '').replace(/\D/g, '');
    if (d.indexOf('0') === 0) d = '972' + d.slice(1);
    return 'https://wa.me/' + d + (text ? '?text=' + encodeURIComponent(text) : '');
  }
  function flash(el, t) { if (!el) return; el.textContent = t; clearTimeout(el._t); el._t = setTimeout(function () { el.textContent = ''; }, 2600); }

  // שימוש בכלי: אירוע אחד לכל פעולה בכל טעינת דף, וסימון בטלפון (להזמנה העדינה)
  var sent = {};
  function used(action, extra) {
    var key = TOOL + ':' + action;
    if (!sent[key]) { sent[key] = 1; if (window.toolUsed) window.toolUsed(TOOL, Object.assign({ action: action }, extra || {})); }
    var u = load('used', {}); u[TOOL] = (u[TOOL] || 0) + 1; save('used', u);
    var j = $('join'); if (j && !load('joined', 0) && (!j.classList.contains('wait') || action === 'edit')) j.classList.add('lit');
  }
  window.nefeshUsed = used;
  // במסך רגע קשה ההזמנה מופיעה רק למי שכבר הכין את המסך ברגע טוב, לא באמצע הצפה
  (function () { var j = $('join'); if (j && j.classList.contains('wait') && load('words', []).length) j.classList.add('lit'); })();

  // ---------- גיבוי ומחיקה (בכל כלי) ----------
  document.addEventListener('click', function (e) {
    var ex = e.target.closest('[data-export]');
    if (ex) {
      var keys = ex.getAttribute('data-export').split(','), out = { 'נשמר מ': location.href, 'תאריך': new Date().toISOString() };
      keys.forEach(function (k) { out[k] = load(k, null); });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 1)], { type: 'application/json' }));
      a.download = 'נפש ויום-יום – ' + (ex.getAttribute('data-name') || TOOL) + ' – ' + today() + '.json';
      document.body.appendChild(a); a.click(); a.remove();
      return;
    }
    var wipe = e.target.closest('[data-wipe]');
    if (wipe) {
      if (!confirm('למחוק מהטלפון את כל מה ששמרת בכלי הזה? אי אפשר להחזיר.')) return;
      wipe.getAttribute('data-wipe').split(',').forEach(drop);
      location.reload();
    }
  });

  // =====================================================================
  // N1 רגע קשה
  // =====================================================================
  var br = $('breath');
  if (br) {
    var ball = br.querySelector('.ball'), say = br.querySelector('.say'), cap = $('breath-cap'), go = $('breath-go');
    var PH = [['לשאוף באף', 4, 2.15], ['להחזיק', 7, 2.15], ['לנשוף לאט מהפה', 8, 1]];
    var running = false, timer = null, cycle = 0, CYCLES = 4;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function stop(msg) {
      running = false; clearTimeout(timer);
      ball.style.transitionDuration = '1.2s'; ball.style.transform = 'scale(1)';
      say.innerHTML = ''; go.textContent = cycle ? 'עוד סבב נשימות' : 'להתחיל לנשום ביחד';
      cap.textContent = msg || '';
    }
    function phase(i, left) {
      if (!running) return;
      var p = PH[i];
      if (left === p[1]) {
        ball.style.transitionDuration = reduce ? '0s' : p[1] + 's';
        ball.style.transform = 'scale(' + p[2] + ')';
        cap.textContent = p[0] + ' (' + p[1] + ')' + '  ·  סבב ' + (cycle + 1) + ' מתוך ' + CYCLES;
      }
      say.innerHTML = '<span>' + esc(p[0].split(' ')[0]) + '<small>' + left + '</small></span>';
      timer = setTimeout(function () {
        if (left > 1) return phase(i, left - 1);
        if (i < 2) return phase(i + 1, PH[i + 1][1]);
        cycle++;
        if (cycle >= CYCLES) { cycle = CYCLES; return stop('יפה. ארבעה סבבים. אפשר להמשיך לשבת רגע, או לנשום עוד סבב.'); }
        phase(0, PH[0][1]);
      }, 1000);
    }
    go.addEventListener('click', function () {
      if (running) return stop('עצרנו. אפשר לחזור לזה בכל רגע.');
      running = true; cycle = 0; go.textContent = 'לעצור';
      phase(0, PH[0][1]);
      used('breath');
    });
  }

  var wordsBox = $('mywords');
  if (wordsBox) {
    var words = load('words', []), people = load('people', []);
    var DEF_WORDS = ['זה רגע. הוא יעבור.', 'אני כבר עברתי רגעים כאלה.', 'מותר לי לבקש עזרה.'];
    function renderWords() {
      var list = words.filter(Boolean);
      wordsBox.innerHTML = (list.length ? list : DEF_WORDS).map(function (w) { return '<blockquote>' + esc(w) + '</blockquote>'; }).join('') +
        (list.length ? '' : '<p class="note" style="text-align:center">אלה משפטים לדוגמה. כשיהיה רגע טוב, אפשר לכתוב כאן את המשפטים שלך, במילים שלך.</p>');
      var pb = $('mypeople');
      var pl = people.filter(function (p) { return p && p.n && p.p; });
      pb.innerHTML = pl.length ? pl.map(function (p) { return '<a href="' + esc(telHref(p.p)) + '" data-call><span>📞 ' + esc(p.n) + '</span><span class="ph">' + esc(p.p) + '</span></a>'; }).join('')
        : '<p class="note" style="text-align:center">עוד לא הוספת אנשים. כשיהיה רגע טוב, אפשר להוסיף כאן שלושה אנשים שאפשר להתקשר אליהם.</p>';
      // מכתב לעצמי (N5), אם יש
      var letters = load('letters', []), lb = $('rega-letter');
      if (lb) {
        if (letters.length) {
          var L = letters[letters.length - 1];
          lb.hidden = false;
          lb.querySelector('.letter').innerHTML = esc(L.text) + '<span class="from">כתבת לעצמך ב-' + esc(new Date(L.t).toLocaleDateString('he-IL')) + '</span>';
        } else lb.hidden = true;
      }
    }
    // טופס העריכה
    var wIn = $$('[data-word]'), pIn = $$('[data-person]');
    wIn.forEach(function (el, i) { el.value = words[i] || ''; });
    pIn.forEach(function (el) { var i = +el.getAttribute('data-person'), k = el.getAttribute('data-k'); el.value = (people[i] && people[i][k]) || ''; });
    var ef = $('rega-edit');
    ef.addEventListener('submit', function (e) {
      e.preventDefault();
      words = wIn.map(function (el) { return el.value.trim(); }).filter(Boolean);
      people = [0, 1, 2].map(function (i) {
        var n = ef.querySelector('[data-person="' + i + '"][data-k=n]').value.trim(), p = ef.querySelector('[data-person="' + i + '"][data-k=p]').value.trim();
        return n && p ? { n: n, p: p } : null;
      }).filter(Boolean);
      save('words', words); save('people', people);
      renderWords(); flash($('rega-saved'), 'נשמר בטלפון שלך ✓');
      used('edit');
    });
    var imp = $('rega-import');
    if (imp) imp.addEventListener('click', function () {
      var map = load('map', []).filter(function (p) { return p.p; }).slice(0, 3);
      if (!map.length) return flash($('rega-saved'), 'מפת התמיכה עוד ריקה.');
      map.forEach(function (p, i) {
        ef.querySelector('[data-person="' + i + '"][data-k=n]').value = p.n;
        ef.querySelector('[data-person="' + i + '"][data-k=p]').value = p.p;
      });
      flash($('rega-saved'), 'הועתקו מהמפה. לשמור למטה.');
    });
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-call]')) used('call_person');
      if (e.target.closest('[data-line]')) used('call_line', { line: e.target.closest('[data-line]').getAttribute('data-line') });
    });
    renderWords();
  }

  // =====================================================================
  // N2 הדבר החשוב של היום
  // =====================================================================
  var fc = $('focus');
  if (fc) {
    var F = load('focus', null), log = load('focus-log', {});
    var form = $('focus-form'), card = $('focus-card');
    function renderFocus() {
      var isToday = F && F.date === today();
      card.hidden = !isToday; form.hidden = !!isToday;
      $('f-remind-wrap').hidden = !isToday || !!F.done;
      if (isToday) {
        card.classList.toggle('done', !!F.done);
        $('f-what').textContent = F.what;
        $('f-next').textContent = F.done ? 'עשית את זה היום. זה הרבה. 💛' : (F.next ? 'הצעד הקטן הראשון: ' + F.next : '');
        $('f-done').hidden = !!F.done; $('f-undo').hidden = !F.done;
      } else if (F && F.what && !F.done) {
        $('f-yesterday').hidden = false;
        $('f-yesterday-what').textContent = F.what;
      }
      // שבוע אחרון
      var w = $('f-week'), html = '';
      for (var i = 6; i >= 0; i--) {
        var d = addDays(today(), -i);
        html += '<span class="' + (log[d] ? 'y' : '') + (i === 0 ? ' t' : '') + '">' + dayName(d) + '<br>' + (log[d] ? '✓' : '·') + '</span>';
      }
      w.innerHTML = html;
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var what = $('f-in').value.trim(); if (!what) return;
      F = { what: what, next: $('f-step').value.trim(), date: today(), done: false, t: Date.now() };
      save('focus', F); renderFocus(); used('set');
      if (window.HK) HK.mark('hayom', 5, 'hayom'); // כל יום שחוזרים לכאן נחשב (assets/hitkadmut.js, גרסה עדינה)
    });
    $('f-carry') && $('f-carry').addEventListener('click', function () {
      F = { what: F.what, next: F.next, date: today(), done: false, t: Date.now() };
      save('focus', F); $('f-yesterday').hidden = true; renderFocus(); used('carry');
      if (window.HK) HK.mark('hayom', 5, 'hayom');
    });
    $('f-done').addEventListener('click', function () {
      F.done = true; save('focus', F); log[today()] = 1; save('focus-log', log); renderFocus(); used('done');
      if (window.HK) HK.done('hayom', { el: $('f-hk'), title: 'עשית את זה. זה הרבה 💛', line: 'גם צעד קטן נחשב. מחר אפשר לבחור שוב דבר אחד.', help: 'הכלים לנפש כאן בחינם ובלי פרסומות', share: 'כלי קטן שעוזר לי: בוחרים כל יום דבר אחד חשוב וצעד קטן ראשון. בלי רשימות ובלי אשמה, בחינם:' });
    });
    $('f-undo').addEventListener('click', function () { F.done = false; save('focus', F); delete log[today()]; save('focus-log', log); renderFocus(); if ($('f-hk')) { $('f-hk').innerHTML = ''; $('f-hk').hidden = true; } });
    $('f-change').addEventListener('click', function () { $('f-in').value = F ? F.what : ''; $('f-step').value = F ? F.next : ''; card.hidden = true; form.hidden = false; $('f-in').focus(); });
    // תזכורת עדינה: ליומן (גוגל או קובץ לכל יומן בטלפון)
    function remindAt() {
      var t = $('f-time').value || '18:00', p = t.split(':');
      var d = new Date(); d.setHours(+p[0], +p[1], 0, 0);
      if (d < new Date()) d.setDate(d.getDate() + 1);
      return d;
    }
    function stamp(d) { return d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2) + 'T' + ('0' + d.getHours()).slice(-2) + ('0' + d.getMinutes()).slice(-2) + '00'; }
    $('f-gcal').addEventListener('click', function () {
      var d = remindAt(), e2 = new Date(d.getTime() + 15 * 60000);
      this.href = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent('🎯 ' + F.what) +
        '&details=' + encodeURIComponent((F.next ? 'הצעד הקטן: ' + F.next + '\n' : '') + 'רק תזכורת עדינה. גם צעד קטן נחשב.\nhttps://hakelim.com/nefesh/hayom/') +
        '&dates=' + stamp(d) + '/' + stamp(e2) + '&ctz=Asia/Jerusalem';
      used('remind', { how: 'google' });
    });
    $('f-ics').addEventListener('click', function () {
      var d = remindAt(), e2 = new Date(d.getTime() + 15 * 60000);
      var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//nefesh//he', 'BEGIN:VEVENT', 'UID:' + Date.now() + '@nefesh', 'DTSTAMP:' + stamp(new Date()), 'DTSTART:' + stamp(d), 'DTEND:' + stamp(e2),
        'SUMMARY:🎯 ' + F.what.replace(/[\r\n,;]/g, ' '), 'DESCRIPTION:' + (F.next ? 'הצעד הקטן: ' + F.next.replace(/[\r\n,;]/g, ' ') + '\\n' : '') + 'רק תזכורת עדינה.',
        'BEGIN:VALARM', 'TRIGGER:PT0M', 'ACTION:DISPLAY', 'DESCRIPTION:🎯 ' + F.what.replace(/[\r\n,;]/g, ' '), 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
      a.download = 'תזכורת – הדבר החשוב.ics';
      document.body.appendChild(a); a.click(); a.remove();
      used('remind', { how: 'ics' });
    });
    renderFocus();
  }

  // =====================================================================
  // N3 יומן קול → טקסט (תמלול בענן, דרך ה-Worker של המיזם)
  // =====================================================================
  var yb = $('yoman');
  if (yb) {
    // נקודת הקצה של התמלול: gilad-hub Worker, /tamlul (אותה שמשמשת את /kelim/tamlul/). CORS רק מהאתר.
    // נבדק 07.11.2026: run → token → status COMPLETED (כ-20 שניות). אם ה-Worker מחזיר 404/503, הדף מציע לכתוב במקום.
    var API = 'https://gilad-hub.gilad4049.workers.dev/tamlul';
    var recBtn = $('y-rec'), st = $('y-status'), txt = $('y-text'), good = $('y-good'), saveBtn = $('y-save');
    var entries = load('yoman', []);
    var rec = null, chunks = [], t0 = 0, tick = null, lastBlob = null, MAXSEC = 180;
    function mmss(s) { s = Math.round(s); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
    function sayS(t, busy) { st.innerHTML = (busy ? '<span class="spin" aria-hidden="true"></span> ' : '') + t; }
    function renderEntries() {
      var box = $('y-list');
      if (!entries.length) { box.innerHTML = '<p class="note" style="text-align:center">עוד אין כאן כלום. ההקלטה הראשונה תופיע כאן.</p>'; return; }
      box.innerHTML = entries.slice().reverse().map(function (e) {
        return '<div class="entry"><div class="when">' + esc(heDate(e.t)) + '</div>' + (e.text ? '<div class="txt">' + esc(e.text) + '</div>' : '') +
          (e.good ? '<div class="good">🌱 מה היה טוב: ' + esc(e.good) + '</div>' : '') +
          '<div class="acts"><button class="linkish" type="button" data-ydel="' + e.t + '">למחוק</button></div></div>';
      }).join('');
    }
    $('y-list').addEventListener('click', function (e) {
      var d = e.target.closest('[data-ydel]'); if (!d) return;
      if (!confirm('למחוק את הרשומה הזו?')) return;
      entries = entries.filter(function (x) { return String(x.t) !== d.getAttribute('data-ydel'); });
      save('yoman', entries); renderEntries();
    });
    function b64(blob) { return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(String(r.result).split(',')[1] || ''); }; r.onerror = rej; r.readAsDataURL(blob); }); }
    function transcribe(blob) {
      $('y-retry').hidden = true;
      sayS('שולח לענן ומתמלל… זה לוקח כמה שניות, לפעמים קצת יותר.', true);
      return b64(blob).then(function (data) {
        return fetch(API + '/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ b64: data, lang: 'he' }) });
      }).then(function (r) { if (r.status === 429) throw new Error('limit'); if (r.status === 404 || r.status === 503) throw new Error('notready'); return r.json(); })
        .then(function (j) {
          if (!j.token) throw new Error(j.error || 'run');
          var start = Date.now();
          return new Promise(function (res, rej) {
            (function poll() {
              fetch(API + '/status/' + j.token).then(function (r) { return r.json(); }).then(function (s) {
                if (s.status === 'COMPLETED') return res((s.segments || []).map(function (x) { return x.text; }).join(' ').trim());
                if (s.status === 'FAILED' || s.status === 'CANCELLED' || s.error) return rej(new Error('failed'));
                sayS(s.status === 'IN_QUEUE' ? 'בתור בענן. בפעם הראשונה זה יכול לקחת דקה-שתיים…' : 'מתמלל…', true);
                if (Date.now() - start > 6 * 60e3) return rej(new Error('timeout'));
                setTimeout(poll, 2500);
              }).catch(function () { if (Date.now() - start > 6 * 60e3) rej(new Error('net')); else setTimeout(poll, 4000); });
            })();
          });
        }).then(function (text) {
          if (!text) throw new Error('empty');
          txt.value = (txt.value ? txt.value + '\n' : '') + text;
          sayS('הנה הטקסט. אפשר לתקן מילה, ולשמור.');
          var q = {}; try { q = JSON.parse(localStorage.getItem('kelim-tamlul') || '{}'); } catch (e) {}
          var m = new Date().getFullYear() + '-' + (new Date().getMonth() + 1);
          if (q.m !== m) q = { m: m, used: 0, free: q.free };
          q.used += Math.round((Date.now() - t0) / 1000) || 30;
          try { localStorage.setItem('kelim-tamlul', JSON.stringify(q)); } catch (e) {}
          used('transcribe');
          good.focus();
        }).catch(function (e) {
          var m = String(e && e.message || e);
          sayS(m === 'notready' ? 'התמלול מהקול עוד בהקמה, ויעלה בקרוב. בינתיים אפשר לכתוב בתיבה למטה, והיומן שומר הכול.'
            : m === 'limit' ? 'הגעת למספר התמלולים להיום. אפשר לכתוב במקום, או לנסות מחר.'
            : m === 'empty' ? 'לא שמעתי דיבור בהקלטה. אפשר לנסות שוב, קרוב יותר לטלפון.'
            : !navigator.onLine ? 'אין כרגע אינטרנט. אפשר לכתוב במקום, או לנסות שוב כשיחזור.'
            : 'התמלול לא הצליח הפעם. אפשר לנסות שוב, או פשוט לכתוב.');
          $('y-retry').hidden = !lastBlob;
        });
    }
    $('y-retry').addEventListener('click', function () { if (lastBlob) transcribe(lastBlob); });
    recBtn.addEventListener('click', function () {
      if (rec && rec.state === 'recording') { rec.stop(); return; }
      if (!navigator.mediaDevices || !window.MediaRecorder) return sayS('הדפדפן הזה לא מאפשר להקליט. אפשר לכתוב בתיבה למטה.');
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
        chunks = [];
        rec = new MediaRecorder(stream);
        rec.ondataavailable = function (e) { if (e.data.size) chunks.push(e.data); };
        rec.onstop = function () {
          stream.getTracks().forEach(function (t) { t.stop(); });
          clearInterval(tick); recBtn.classList.remove('on'); recBtn.innerHTML = '🎙<br>להקליט';
          lastBlob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
          transcribe(lastBlob);
        };
        rec.start(1000); t0 = Date.now(); recBtn.classList.add('on');
        sayS('מקליט. מדברים בחופשיות, וכשמסיימים לוחצים שוב.');
        var upd = function () {
          var s = (Date.now() - t0) / 1000;
          recBtn.innerHTML = '⏹<br>לסיים<br><small>' + mmss(s) + '</small>';
          if (s >= MAXSEC && rec.state === 'recording') rec.stop();
        };
        upd(); tick = setInterval(upd, 500);
        used('record');
      }).catch(function () { sayS('צריך לאשר גישה למיקרופון. אפשר גם פשוט לכתוב בתיבה למטה.'); });
    });
    saveBtn.addEventListener('click', function () {
      var t = txt.value.trim(), g = good.value.trim();
      if (!t && !g) return flash($('y-saved'), 'אין עדיין מה לשמור.');
      entries.push({ t: Date.now(), text: t, good: g });
      if (!save('yoman', entries)) return flash($('y-saved'), 'הזיכרון בטלפון מלא. אפשר לשמור עותק ולמחוק ישנים.');
      txt.value = ''; good.value = ''; st.textContent = ''; lastBlob = null; $('y-retry').hidden = true;
      renderEntries(); flash($('y-saved'), 'נשמר ביומן שלך ✓');
      used('save', { good: g ? 1 : 0 });
      // כל יום שכותבים ביומן נחשב – בלי רצף ובלי יעד (assets/hitkadmut.js, גרסה עדינה)
      if (window.HK) HK.done('yoman', { el: $('y-hk'), title: 'נשמר ביומן שלך 💛', line: g ? 'וגם מצאתם משהו טוב היום. זה לא מובן מאליו.' : 'כל מילה שיוצאת החוצה מקלה קצת.', help: 'הכלים לנפש כאן בחינם ובלי פרסומות', share: 'כלי קטן שעוזר לי: יומן שמדברים אליו חצי דקה, והוא הופך לטקסט. נשמר רק בטלפון, בחינם:' });
    });
    renderEntries();
  }

  // =====================================================================
  // N4 מד כוח
  // =====================================================================
  var kb = $('koach');
  if (kb) {
    var K = load('koach', {}), sel = null;
    var LABEL = { 1: 'כמעט אין', 2: 'מעט', 3: 'בינוני', 4: 'טוב', 5: 'הרבה' };
    var ADVICE = {
      1: 'יום של כוח מועט. מותר לעשות רק את ההכרחי: לאכול משהו, לשתות, לנוח. כל השאר יכול לחכות.',
      2: 'יום של מעט כוח. לבחור דבר אחד קטן, ולשחרר את השאר בלי אשמה.',
      3: 'כוח בינוני. אפשר דבר אחד או שניים, עם הפסקות.',
      4: 'יום טוב. אפשר להתקדם, ולשמור קצת כוח גם למחר.',
      5: 'הרבה כוח היום. נהדר. אולי זה זמן טוב לכתוב לעצמך מכתב לרגע הבא.'
    };
    var t = today();
    function chosen() { return $$('#k-defer input:checked').map(function (c) { return c.value; }); }
    function draw(data, el) {
      var html = '';
      for (var i = 6; i >= 0; i--) {
        var d = addDays(today(), -i), v = data[d] && data[d].v;
        html += '<div class="col"><div class="bar' + (v ? '' : ' none') + '" style="height:' + (v ? v * 20 : 4) + '%"></div><div class="v">' + (v || '–') + '</div><div class="d">' + dayName(d) + '</div></div>';
      }
      el.innerHTML = html;
    }
    function pick(v) {
      sel = v;
      $$('#k-scale button').forEach(function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-v') === v)); });
      $('k-advice').textContent = ADVICE[v]; $('k-step2').hidden = false;
    }
    $$('#k-scale button').forEach(function (b) { b.addEventListener('click', function () { pick(+b.getAttribute('data-v')); }); });
    if (K[t]) {
      pick(K[t].v);
      (K[t].defer || []).forEach(function (x) { var c = $$('#k-defer input').filter(function (i) { return i.value === x; })[0]; if (c) c.checked = true; else $('k-other').value = x; });
    }
    $('k-save').addEventListener('click', function () {
      if (!sel) return;
      var d = chosen(), o = $('k-other').value.trim(); if (o) d.push(o);
      K[t] = { v: sel, defer: d };
      // שומרים רק 60 יום אחרונים
      Object.keys(K).sort().slice(0, -60).forEach(function (k) { delete K[k]; });
      save('koach', K); draw(K, $('k-chart'));
      flash($('k-saved'), 'נשמר ✓ ' + (d.length ? 'ומותר לדחות היום: ' + d.join(', ') : ''));
      used('save', { level: sel, deferred: d.length });
    });
    draw(K, $('k-chart'));
    // שיתוף עם בן/בת זוג: הנתונים של השבוע בתוך הקישור עצמו (בלי שרת)
    function b64u(s) { return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
    function unb64u(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return decodeURIComponent(escape(atob(s))); }
    $('k-share').addEventListener('click', function () {
      var name = $('k-name').value.trim(), week = {};
      save('koach-name', name);
      for (var i = 6; i >= 0; i--) { var d = addDays(today(), -i); if (K[d]) week[d] = K[d]; }
      if (!Object.keys(week).length) return flash($('k-saved'), 'קודם לסמן את היום, ואז לשתף.');
      var url = location.origin + '/nefesh/koach/#s=' + b64u(JSON.stringify({ n: name, w: week, at: today() }));
      var msg = (name ? 'זה ' + name + '. ' : '') + 'ככה הכוח שלי השבוע. לא צריך לשאול, רק לדעת 💛\n' + url;
      this.href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(msg);
      used('share_partner');
    });
    $('k-name').value = load('koach-name', '');
    var m = location.hash.match(/s=([\w-]+)/);
    if (m) {
      try {
        var S = JSON.parse(unb64u(m[1])), sv = $('k-shared');
        sv.hidden = false;
        $('k-shared-h').textContent = 'הכוח של ' + (S.n || 'מי ששלח לך') + ' השבוע';
        var last = Object.keys(S.w).sort().pop(), L = S.w[last];
        draw(S.w, $('k-shared-chart'));
        $('k-shared-today').innerHTML = 'הסימון האחרון (' + esc(dayName(last)) + '): <b>' + L.v + ' מתוך 5, ' + esc(LABEL[L.v]) + '</b>' +
          (L.defer && L.defer.length ? '<br>מה מותר לדחות: ' + esc(L.defer.join(', ')) : '');
        sv.scrollIntoView();
        if (window.kelimEv) window.kelimEv('tool_use', { tool: 'koach', action: 'open_shared' });
      } catch (e) {}
    }
  }

  // =====================================================================
  // N5 מכתב לעצמי לרגע הבא
  // =====================================================================
  var mb = $('michtav');
  if (mb) {
    var letters = load('letters', []), shown = -1;
    function renderLetters() {
      $('m-count').textContent = letters.length ? 'שמורים אצלך ' + letters.length + (letters.length === 1 ? ' מכתב' : ' מכתבים') + '.' : 'עוד אין מכתבים. כשטוב, כתבו את הראשון.';
      $('m-bad').disabled = !letters.length;
      var box = $('m-list');
      box.innerHTML = letters.slice().reverse().map(function (L) {
        return '<div class="entry"><div class="when">' + esc(heDate(L.t)) + (L.to ? ' · ' + esc(L.to) : '') + '</div><div class="txt">' + esc(L.text) + '</div><div class="acts"><button class="linkish" type="button" data-mdel="' + L.t + '">למחוק</button></div></div>';
      }).join('');
    }
    $('m-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var text = $('m-text').value.trim(); if (!text) return;
      letters.push({ t: Date.now(), text: text, to: $('m-to').value });
      save('letters', letters); $('m-text').value = '';
      renderLetters(); flash($('m-saved'), 'המכתב שמור. הוא יחכה לך ✓');
      used('write');
    });
    $('m-bad').addEventListener('click', function () {
      if (!letters.length) return;
      shown = shown < 0 ? letters.length - 1 : (shown - 1 + letters.length) % letters.length;
      var L = letters[shown], box = $('m-show');
      box.hidden = false;
      box.querySelector('.letter').innerHTML = esc(L.text) + '<span class="from">ממך, ב-' + esc(new Date(L.t).toLocaleDateString('he-IL')) + '</span>';
      $('m-more').hidden = letters.length < 2;
      box.scrollIntoView({ behavior: 'smooth', block: 'start' });
      used('read');
    });
    $('m-more').addEventListener('click', function () { $('m-bad').click(); });
    $('m-list').addEventListener('click', function (e) {
      var d = e.target.closest('[data-mdel]'); if (!d) return;
      if (!confirm('למחוק את המכתב הזה?')) return;
      letters = letters.filter(function (x) { return String(x.t) !== d.getAttribute('data-mdel'); });
      save('letters', letters); renderLetters();
    });
    renderLetters();
  }

  // =====================================================================
  // N6 מפת תמיכה
  // =====================================================================
  var tb = $('tmicha');
  if (tb) {
    var MAP = load('map', []);
    var GROUPS = ['משפחה', 'חברים', 'רופא/ה ובריאות', 'טיפול (מטפל/ת, עו"ס)', 'אגף השיקום וזכויות', 'קווי תמיכה', 'אחר'];
    function renderMap() {
      var box = $('t-list');
      if (!MAP.length) { box.innerHTML = '<p class="note" style="text-align:center">המפה עוד ריקה. מתחילים מאדם אחד.</p>'; return; }
      box.innerHTML = GROUPS.map(function (g) {
        var list = MAP.filter(function (p) { return p.g === g; });
        if (!list.length) return '';
        return '<div class="map-group"><h3>' + esc(g) + '</h3>' + list.map(function (p) {
          var isMobile = /^0?5\d/.test(String(p.p).replace(/\D/g, ''));
          return '<div class="person"><div class="nm">' + esc(p.n) + '</div>' + (p.h ? '<div class="hw">עוזר/ת לי: ' + esc(p.h) + '</div>' : '') +
            '<div class="ac">' + (p.p ? '<a class="btn btn-gold btn-sm" href="' + esc(telHref(p.p)) + '" data-tcall>📞 להתקשר</a>' : '') +
            (p.p && isMobile ? '<a class="btn btn-line btn-sm" href="' + esc(waHref(p.p)) + '" data-tcall>ווטסאפ</a>' : '') +
            '<button class="btn btn-line btn-sm" type="button" data-tedit="' + p.id + '">לעדכן</button></div></div>';
        }).join('') + '</div>';
      }).join('');
    }
    var tf = $('t-form');
    tf.addEventListener('submit', function (e) {
      e.preventDefault();
      var hw = $$('#t-how input:checked').map(function (c) { return c.value; }), o = $('t-how-other').value.trim();
      if (o) hw.push(o);
      var id = $('t-id').value || String(Date.now());
      var rec2 = { id: id, n: $('t-n').value.trim(), p: $('t-p').value.trim(), g: $('t-g').value, h: hw.join(', ') };
      if (!rec2.n) return;
      MAP = MAP.filter(function (x) { return x.id !== id; }); MAP.push(rec2);
      save('map', MAP); tf.reset(); $('t-id').value = ''; $('t-del').hidden = true;
      renderMap(); flash($('t-saved'), 'נוסף למפה ✓'); used('add', { group: rec2.g });
    });
    $('t-list').addEventListener('click', function (e) {
      if (e.target.closest('[data-tcall]')) used('call');
      var ed = e.target.closest('[data-tedit]'); if (!ed) return;
      var p = MAP.filter(function (x) { return x.id === ed.getAttribute('data-tedit'); })[0]; if (!p) return;
      $('t-id').value = p.id; $('t-n').value = p.n; $('t-p').value = p.p; $('t-g').value = p.g;
      var hw = (p.h || '').split(', '), known = $$('#t-how input').map(function (c) { return c.value; });
      $$('#t-how input').forEach(function (c) { c.checked = hw.indexOf(c.value) > -1; });
      $('t-how-other').value = hw.filter(function (x) { return x && known.indexOf(x) < 0; }).join(', ');
      $('t-del').hidden = false;
      $('t-add').open = true; tf.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    $('t-del').addEventListener('click', function () {
      var id = $('t-id').value; if (!id || !confirm('להוריד מהמפה?')) return;
      MAP = MAP.filter(function (x) { return x.id !== id; }); save('map', MAP);
      tf.reset(); $('t-id').value = ''; this.hidden = true; renderMap();
    });
    $$('[data-preset]').forEach(function (b) {
      b.addEventListener('click', function () {
        var p = JSON.parse(b.getAttribute('data-preset'));
        if (MAP.some(function (x) { return x.p === p.p; })) return flash($('t-saved'), 'כבר במפה.');
        p.id = String(Date.now()); MAP.push(p); save('map', MAP); renderMap(); flash($('t-saved'), 'נוסף ✓'); used('add_preset');
      });
    });
    renderMap();
  }

  // =====================================================================
  // N7 הסבר למשפחה: מילה אישית בקישור
  // =====================================================================
  var fam = $('mishpacha');
  if (fam) {
    var mm = location.hash.match(/m=([^&]+)/);
    if (mm) {
      try {
        var msg = decodeURIComponent(mm[1]).slice(0, 600);
        var from = (location.hash.match(/f=([^&]+)/) || [])[1];
        $('p-show').hidden = false;
        $('p-show-m').textContent = msg;
        $('p-show-h').textContent = 'מילה אישית' + (from ? ' מ' + decodeURIComponent(from).slice(0, 40) : '') + ', לפני שמתחילים:';
      } catch (e) {}
    }
    $('p-send').addEventListener('click', function () {
      var m = $('p-msg').value.trim(), f = $('p-from').value.trim(), who = $('p-who').value;
      var url = location.origin + '/nefesh/mishpacha/' + (who ? '#' + who : '') + (m ? (who ? '&' : '#') + 'm=' + encodeURIComponent(m) + (f ? '&f=' + encodeURIComponent(f) : '') : '');
      url = url.replace('#&', '#');
      this.href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent('כתבתי לך משהו, ויש גם דף שמסביר אותי קצת יותר טוב ממני. 💛\n' + url);
      used('send_family', { personal: m ? 1 : 0, who: who || 'all' });
    });
    // קפיצה לחלק לפי הקישור (#horim / #zug / #yeladim)
    var part = (location.hash.match(/^#(horim|zug|yeladim)/) || [])[1];
    if (part && $(part)) setTimeout(function () { $(part).scrollIntoView(); }, 50);
    var readSent = false;
    window.addEventListener('scroll', function () {
      if (readSent || window.scrollY < document.body.scrollHeight * 0.45) return;
      readSent = true; if (window.toolUsed) window.toolUsed('mishpacha', { action: 'read' });
    }, { passive: true });
  }

  // =====================================================================
  // הזמנה עדינה למשפחת הכלים → גיליון הלידים הקיים (מקור "כלים: משפחת הכלים · נפש")
  // =====================================================================
  var jf = $('join-form');
  function postJoin(p) {
    var fd = new FormData();
    fd.append('שם', p.name); fd.append('email', p.email);
    fd.append('מקור', 'כלים: משפחת הכלים · נפש · ' + p.tool);
    fd.append('עיר', 'משפחת הכלים · נפש');
    fd.append('הסכמה למשפחת הכלים', 'כן');
    fd.append('_page', p.page);
    return fetch(p.endpoint, { method: 'POST', body: fd, mode: 'no-cors', keepalive: true });
  }
  if (jf) {
    var ready = jf.getAttribute('data-ready') === '1', endpoint = jf.getAttribute('action');
    // הרשמה שחיכתה (לפני שהצינור היה מוכן) נשלחת עכשיו, פעם אחת
    var pend = load('join-pending', null);
    if (pend && ready) postJoin(Object.assign(pend, { endpoint: endpoint })).then(function () { drop('join-pending'); }).catch(function () {});
    if (load('joined', 0)) {
      jf.outerHTML = '<div class="done" role="status">כבר הצטרפת למשפחת הכלים. תודה 💛</div>';
    } else {
      jf.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!jf.reportValidity()) return;
        if (jf.querySelector('[name=_honey]').value) return;
        var p = { name: jf.querySelector('[name=fname]').value.trim(), email: jf.querySelector('[name=mail]').value.trim(), tool: TOOL || 'home', page: location.pathname };
        var btn = jf.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'שולח…';
        var done = function () {
          save('joined', 1);
          jf.outerHTML = '<div class="done" role="status">תודה, ' + esc(p.name) + '. הצטרפת למשפחת הכלים 💛<br>מייל אחד בשבוע לכל היותר, ואפשר להסיר בלחיצה.</div>';
          if (window.kelimEv) window.kelimEv('join_family', { tool: TOOL || 'home' });
        };
        if (!ready) { save('join-pending', p); return done(); }
        postJoin(Object.assign({ endpoint: endpoint }, p)).catch(function () { save('join-pending', p); }).then(done);
      });
    }
  }
})();
