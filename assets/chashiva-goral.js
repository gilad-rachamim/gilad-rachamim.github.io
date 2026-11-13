// גלגל המזל, גלגל שמות, הגרלה, הטלת קוביה והטלת מטבע: מנוע אחד לחמישה דפים (/kelim/chashiva/galgal/ ...).
// המצב של הדף נקבע ב-data-mode על #gr: wheel | names | raffle | dice | coin.
// הכול במכשיר, בלי שרת. האקראיות מ-crypto.getRandomValues (בלי הטיה), לא מ-Math.random.
(function () {
  'use strict';
  var root = document.getElementById('gr');
  if (!root) return;
  var MODE = root.getAttribute('data-mode'), KEY = 'chashiva-goral-' + (root.getAttribute('data-key') || MODE), PATH = location.pathname;
  var $ = function (id) { return document.getElementById(id); };
  function load(def) { try { var v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v && typeof v === 'object') Object.keys(v).forEach(function (k) { def[k] = v[k]; }); } catch (e) {} return def; }
  function save(st) { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function rnd(n) {  // מספר שלם אקראי 0..n-1, הוגן
    var c = window.crypto || window.msCrypto;
    if (!c || !c.getRandomValues) return Math.floor(Math.random() * n);
    var max = Math.floor(4294967296 / n) * n, a = new Uint32Array(1);
    do { c.getRandomValues(a); } while (a[0] >= max);
    return a[0] % n;
  }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  var lastEv = {};
  function used(how) {  // אירוע אחד בחצי דקה לכל סוג פעולה (כפתור שלוחצים עליו הרבה)
    var now = Date.now(); if (lastEv[how] && now - lastEv[how] < 30000) return; lastEv[how] = now;
    if (window.toolUsed) window.toolUsed(document.body.getAttribute('data-tool') || 'chashiva_galgal', { how: how });
  }
  function items(text) {
    var a = String(text || '').split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
    if (a.length === 1 && /[,،;]/.test(a[0])) a = a[0].split(/[,،;]/).map(function (s) { return s.trim(); }).filter(Boolean);
    return a.slice(0, 300).map(function (s) { return s.slice(0, 50); });
  }
  var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // ---- צלילים ----
  var audio = null, soundOn = true;
  function ctx() { try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); } catch (e) {} return audio; }
  function tone(f, at, len, vol, type) {
    if (!soundOn) return; var a = ctx(); if (!a) return;
    try { var o = a.createOscillator(), g = a.createGain(), t = a.currentTime + at; o.type = type || 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .008); g.gain.exponentialRampToValueAtTime(0.0001, t + len); o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + len + .02); } catch (e) {}
  }
  function tick() { tone(1200, 0, .04, .12, 'triangle'); }
  function fanfare() { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * .11, .28, .3); }); }
  function now() { var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; }; return d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()); }
  function copyBtn(b, getText, label) {
    if (!b) return;
    b.addEventListener('click', function () {
      (navigator.clipboard ? navigator.clipboard.writeText(getText()) : Promise.reject()).then(function () { b.textContent = 'הועתק ✓'; setTimeout(function () { b.textContent = label; }, 1800); }).catch(function () {});
      used('copy');
    });
  }
  function wa(a, getText) { if (a) a.addEventListener('click', function () { a.href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(getText()); used('wa'); }); }
  function soundBox(st) {
    var s = $('gr-sound'); if (!s) return;
    soundOn = st.sound !== false; s.checked = soundOn;
    s.addEventListener('change', function () { st.sound = soundOn = s.checked; save(st); if (soundOn) tick(); });
  }
  var frm = $('gr-form'); if (frm) frm.addEventListener('submit', function (e) { e.preventDefault(); });
  var fb = $('gr-full');
  if (fb) fb.addEventListener('click', function () {
    var on = document.body.classList.toggle('gr-fullscreen');
    fb.textContent = on ? 'לצאת ממסך מלא' : 'מסך מלא';
    if (on && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(function () {});
    else if (!on && document.fullscreenElement) document.exitFullscreen().catch(function () {});
    window.scrollTo(0, 0); window.dispatchEvent(new Event('resize')); used('full');
  });

  // =====================================================================
  // 1. גלגל (גלגל המזל / גלגל שמות)
  // =====================================================================
  function wheel() {
    var DEF = MODE === 'names' ? 'נועה\nאיתי\nתמר\nיונתן\nמאיה\nדניאל\nשירה\nאורי' : 'פיצה\nסושי\nהמבורגר\nפלאפל\nפסטה\nשקשוקה';
    var PRESETS = {
      yesno: ['כן או לא?', 'כן\nלא\nכן\nלא\nכן\nלא'],
      food: ['מה אוכלים הערב?', 'פיצה\nסושי\nהמבורגר\nפלאפל\nפסטה\nשקשוקה'],
      nums: ['מספר מ-1 עד 10', '1\n2\n3\n4\n5\n6\n7\n8\n9\n10'],
      chores: ['מי עושה מה בבית?', 'כלים\nכביסה\nזבל\nלסדר את הסלון\nלערוך שולחן\nפטור היום 🎉'],
      names: ['מי עולה בגורל?', 'נועה\nאיתי\nתמר\nיונתן\nמאיה\nדניאל\nשירה\nאורי'],
      prizes: ['גלגל הפרסים', 'ממתק\nמדבקה\nעוד סיבוב\nפרס גדול 🎁\nמחיאות כפיים\nבוחרים שיר'],
      sheelot: ['גלגל שאלות היכרות', 'מה המאכל הכי אהוב עליך?\nלאן היית רוצה לטוס?\nמה הכישרון הסודי שלך?\nמה הזיכרון הכי מצחיק מהילדות?\nאיזה שיר מרים לך את מצב הרוח?\nמה היית עושה עם מיליון שקל?\nמי הדמות שהכי מעוררת בך השראה?\nמה למדת השנה?\nאיזו חיה היית רוצה להיות?\nמה הדבר הכי טוב שקרה לך השבוע?\nבמה אתה הכי גאה?\nמה החלום הכי גדול שלך?']
    };
    // דפי נחיתה (13.11.2026): data-start = גלגל מוכן בכניסה הראשונה, data-key = שמירה נפרדת מהגלגל הראשי
    var SP = PRESETS[root.getAttribute('data-start')];
    if (SP) DEF = SP[1];
    var st = load({ title: SP ? SP[0] : MODE === 'names' ? 'מי עולה בגורל?' : 'מה אוכלים הערב?', text: DEF, remove: MODE === 'names', sound: true, hist: [], orig: '' });
    var PAL = [['#d8b25a', '#14110a'], ['#2f6f6a', '#fff'], ['#b5553c', '#fff'], ['#3d5a80', '#fff'], ['#7a8f3c', '#fff'], ['#8a4f7d', '#fff'], ['#e9dcc0', '#14110a'], ['#4b7f52', '#fff']];
    var cv = $('gr-canvas'), g = cv.getContext('2d'), angle = -Math.PI / 2, spinning = false, list = [], backup = null;
    // גלגל שהגיע בקישור: #g=<base64url של {t, i}>
    var hm = /[#&]g=([A-Za-z0-9_-]+)/.exec(location.hash);
    if (hm) {
      try {
        var o = JSON.parse(decodeURIComponent(escape(atob(hm[1].replace(/-/g, '+').replace(/_/g, '/')))));
        var got = items((o.i || []).join('\n')).join('\n');
        if (got && (got !== st.text || String(o.t || '') !== st.title)) { backup = { title: st.title, text: st.text, hist: st.hist }; st.title = String(o.t || '').slice(0, 60); st.text = got; st.hist = []; st.orig = ''; }
      } catch (e) {}
    }
    function link() { return location.origin + PATH + '#g=' + btoa(unescape(encodeURIComponent(JSON.stringify({ t: st.title, i: items(st.text) })))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
    function size() {
      var w = Math.round(cv.getBoundingClientRect().width) || 320, d = Math.min(3, window.devicePixelRatio || 1);
      if (cv.width !== w * d) { cv.width = cv.height = w * d; }
      draw();
    }
    function draw() {
      var W = cv.width, R = W / 2 - 4 * (W / 320), n = list.length;
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, W); g.translate(W / 2, W / 2);
      if (!n) { g.beginPath(); g.arc(0, 0, R, 0, 2 * Math.PI); g.fillStyle = 'rgba(255,255,255,.06)'; g.fill(); return; }
      var seg = 2 * Math.PI / n, fs = Math.max(11, Math.min(26, (2 * Math.PI * R * .62 / n) * .8, R * .13)) ;
      g.font = '700 ' + fs + 'px Assistant, Arial, sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'right'; try { g.direction = 'rtl'; } catch (e) {}
      for (var i = 0; i < n; i++) {
        var c = PAL[(i === n - 1 && n % PAL.length === 1 && n > 1) ? 3 : i % PAL.length], a0 = angle + i * seg;
        g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R, a0, a0 + seg); g.closePath(); g.fillStyle = c[0]; g.fill();
        g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = Math.max(1, W / 400); g.stroke();
        if (n <= 120) {
          var label = list[i], maxW = R * .66;
          while (label.length > 1 && g.measureText(label).width > maxW) label = label.slice(0, -2) + '…';
          g.save(); g.rotate(a0 + seg / 2); g.fillStyle = c[1]; g.fillText(label, R - fs * .7, 0); g.restore();
        }
      }
      g.beginPath(); g.arc(0, 0, R, 0, 2 * Math.PI); g.strokeStyle = '#d8b25a'; g.lineWidth = Math.max(3, W / 110); g.stroke();
    }
    function under() { var n = list.length, seg = 2 * Math.PI / n, a = ((-Math.PI / 2 - angle) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI); return Math.floor(a / seg) % n; }
    function refresh(keepWheel) {
      var live = items(st.text);
      if (!keepWheel) list = live;
      cv.setAttribute('aria-label', 'גלגל עם ' + list.length + ' אפשרויות: ' + list.slice(0, 12).join(', ') + (list.length > 12 ? ' ועוד' : ''));
      $('gr-count').textContent = live.length === 1 ? 'אפשרות אחת בגלגל. צריך לפחות שתיים.' : live.length ? live.length + ' אפשרויות בגלגל' : 'הגלגל ריק. כותבים אפשרות בכל שורה.';
      $('gr-spin').disabled = $('gr-spin2').disabled = live.length < 2 || spinning;
      $('gr-head').textContent = st.title || '';
      draw(); hist();
    }
    function hist() {
      var box = $('gr-hist'); $('gr-hist-sec').hidden = !st.hist.length;
      box.innerHTML = st.hist.map(function (h) { return '<li>' + esc(h) + '</li>'; }).join('');
    }
    function done(w) {
      spinning = false; var name = list[w];
      st.hist.push(name); if (st.hist.length > 100) st.hist.shift();
      var removed = false;
      if (st.remove) {
        if (!st.orig) st.orig = st.text;
        var arr = items(st.text); arr.splice(w, 1); st.text = arr.join('\n'); $('gr-text').value = st.text; removed = true;
      }
      save(st); fanfare();
      var left = items(st.text).length;
      $('gr-res').innerHTML = '<p class="gr-res-l">🎉 עלה בגורל</p><p class="gr-res-n">' + esc(name) + '</p>' +
        (removed ? '<p class="gr-res-s">' + (left > 1 ? 'יצא מהגלגל. נשארו ' + left + '.' : left === 1 ? 'יצא מהגלגל. נשאר רק אחד.' : 'כולם עלו בגורל!') + '</p>' : '') +
        '<div class="gr-btns">' + (left >= 2 ? '<button class="btn btn-gold btn-sm" type="button" data-act="again">לסובב שוב</button>' : '') +
        (!removed && list.length > 2 ? '<button class="btn btn-line btn-sm" type="button" data-act="out">להוציא מהגלגל</button>' : '') +
        (st.orig && st.orig !== st.text ? '<button class="btn btn-line btn-sm" type="button" data-act="back">להחזיר את כולם</button>' : '') + '</div>';
      $('gr-res').hidden = false; $('gr-res').setAttribute('data-w', name);
      refresh(true);
      try { $('gr-res').scrollIntoView({ block: 'nearest', behavior: calm ? 'auto' : 'smooth' }); } catch (e) {}
    }
    function spin() {
      if (spinning || items(st.text).length < 2) return;
      ctx(); spinning = true; $('gr-res').hidden = true; refresh();
      var n = list.length, seg = 2 * Math.PI / n, w = rnd(n), f = (10 + rnd(81)) / 100;
      var target = -Math.PI / 2 - (w + f) * seg, a0 = angle;
      var delta = (((target - a0) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) + 2 * Math.PI * (calm ? 1 : 5 + rnd(3));
      var dur = calm ? 700 : 4600 + rnd(900), t0 = performance.now(), last = under(), fin = false, lastTick = 0;
      function step() {
        if (fin) return;
        var t = Math.min(1, (performance.now() - t0) / dur), e = 1 - Math.pow(1 - t, 4);
        angle = a0 + delta * e; draw();
        var u = under(); if (u !== last) { last = u; var nw = performance.now(); if (nw - lastTick > 45) { tick(); lastTick = nw; } }
        if (t >= 1) { fin = true; clearInterval(iv); angle = a0 + delta; draw(); done(w); return; }
        requestAnimationFrame(step);
      }
      var iv = setInterval(step, 40);   // גיבוי: בדף מוסתר requestAnimationFrame לא רץ
      requestAnimationFrame(step); used('spin');
    }
    $('gr-spin').addEventListener('click', spin); $('gr-spin2').addEventListener('click', spin); cv.addEventListener('click', spin);
    $('gr-res').addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return; var act = b.getAttribute('data-act');
      if (act === 'again') spin();
      if (act === 'out') { var nm = $('gr-res').getAttribute('data-w'), arr = items(st.text), i = arr.indexOf(nm); if (i >= 0) { if (!st.orig) st.orig = st.text; arr.splice(i, 1); st.text = arr.join('\n'); $('gr-text').value = st.text; save(st); b.remove(); refresh(true); } }
      if (act === 'back') { st.text = st.orig; st.orig = ''; $('gr-text').value = st.text; save(st); $('gr-res').hidden = true; refresh(); }
    });
    $('gr-text').value = st.text; $('gr-title').value = st.title;
    $('gr-text').addEventListener('input', function () { st.text = this.value; st.orig = ''; save(st); refresh(); });
    $('gr-title').addEventListener('input', function () { st.title = this.value.slice(0, 60); save(st); refresh(); });
    $('gr-remove').checked = !!st.remove;
    $('gr-remove').addEventListener('change', function () { st.remove = this.checked; save(st); });
    $('gr-shuffle').addEventListener('click', function () { st.text = shuffle(items(st.text)).join('\n'); $('gr-text').value = st.text; save(st); refresh(); });
    $('gr-clear').addEventListener('click', function () { if (items(st.text).length > 3 && !confirm('לרוקן את הגלגל?')) return; st.text = ''; st.orig = ''; $('gr-text').value = ''; save(st); $('gr-res').hidden = true; refresh(); $('gr-text').focus(); });
    $('gr-hist-clear').addEventListener('click', function () { st.hist = []; save(st); hist(); });
    document.querySelectorAll('[data-preset]').forEach(function (b) {
      b.addEventListener('click', function () { var p = PRESETS[b.getAttribute('data-preset')]; if (!p) return; st.title = p[0]; st.text = p[1]; st.orig = ''; st.hist = []; $('gr-title').value = st.title; $('gr-text').value = st.text; save(st); $('gr-res').hidden = true; refresh(); used('preset'); });
    });
    var note = $('gr-note');
    if (backup) {
      note.hidden = false;
      note.innerHTML = '<span>פתחתם גלגל שקיבלתם בקישור.</span> <button class="btn btn-line btn-sm" type="button" id="gr-mine">לחזור לגלגל שלי</button>';
      $('gr-mine').addEventListener('click', function () { st.title = backup.title; st.text = backup.text; st.hist = backup.hist || []; st.orig = ''; $('gr-title').value = st.title; $('gr-text').value = st.text; save(st); note.hidden = true; try { history.replaceState(null, '', PATH); } catch (e) {} refresh(); });
      used('open_link');
    }
    function histText() { return (st.title ? st.title + '\n' : '') + 'עלו בגורל:\n' + st.hist.map(function (h, i) { return (i + 1) + '. ' + h; }).join('\n') + '\n\nגלגל המזל בחינם: ' + location.origin + PATH; }
    wa($('gr-hist-wa'), histText); copyBtn($('gr-hist-copy'), histText, 'להעתיק');
    wa($('gr-wa'), function () { return 'הכנתי גלגל' + (st.title ? ': ' + st.title : '') + ' 🎡\nלוחצים ומסובבים:\n' + link(); });
    copyBtn($('gr-copy'), link, '🔗 להעתיק קישור לגלגל');
    soundBox(st);
    window.addEventListener('resize', size);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
    refresh(); size();
  }

  // =====================================================================
  // 2. הגרלה (שמות או מספרים)
  // =====================================================================
  function raffle() {
    var st = load({ src: 'names', text: 'נועה כהן\nאיתי לוי\nתמר מזרחי\nיונתן פרץ\nמאיה ביטון\nדניאל אזולאי\nשירה פרידמן\nאורי דהן', from: 1, to: 100, count: 1, sound: true, last: null }), busy = false;
    function pool() {
      if (st.src === 'nums') { var a = Math.round(+st.from), b = Math.round(+st.to), out = []; if (isNaN(a) || isNaN(b)) return []; if (a > b) { var t = a; a = b; b = t; } if (b - a > 99999) b = a + 99999; for (var i = a; i <= b; i++) out.push(String(i)); return out; }
      return items(st.text);
    }
    function tabs() {
      document.querySelectorAll('[data-src]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-src') === st.src); });
      $('gr-names').hidden = st.src !== 'names'; $('gr-nums').hidden = st.src !== 'nums';
      info();
    }
    function info() {
      var n = pool().length; st.count = Math.max(1, Math.min(+st.count || 1, Math.max(1, n)));
      $('gr-n').value = st.count; $('gr-n').max = Math.max(1, n);
      $('gr-count').textContent = n === 1 ? 'משתתף אחד בהגרלה' : n ? n + ' משתתפים בהגרלה' : (st.src === 'nums' ? 'כותבים מספר התחלה ומספר סוף.' : 'כותבים שם בכל שורה.');
      $('gr-go').disabled = n < 1 || busy;
    }
    function show(r) {
      var box = $('gr-res');
      if (!r) { box.hidden = true; return; }
      box.hidden = false;
      box.innerHTML = '<p class="gr-res-l">🎉 ' + (r.w.length > 1 ? 'הזוכים' : 'עלה בגורל') + '</p>' +
        (r.w.length > 1 ? '<ol class="gr-win">' + r.w.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>' : '<p class="gr-res-n">' + esc(r.w[0]) + '</p>') +
        '<p class="gr-res-s">הוגרל ב-' + esc(r.at) + ', מתוך ' + r.of + ' משתתפים</p>' +
        '<div class="gr-btns"><button class="btn btn-gold btn-sm" type="button" data-act="again">להגריל שוב</button>' +
        (st.src === 'names' && r.of - r.w.length >= 1 ? '<button class="btn btn-line btn-sm" type="button" data-act="out">להוציא את הזוכים ולהגריל עוד</button>' : '') + '</div>';
      $('gr-share').hidden = false;
    }
    function go() {
      var p = pool(); if (busy || !p.length) return;
      ctx(); busy = true; info();
      var k = Math.max(1, Math.min(+st.count || 1, p.length)), win = shuffle(p).slice(0, k), box = $('gr-res'), n = 0, total = calm ? 1 : 16;
      box.hidden = false; $('gr-share').hidden = true;
      box.setAttribute('aria-busy', 'true');
      try { box.scrollIntoView({ block: 'nearest', behavior: calm ? 'auto' : 'smooth' }); } catch (e) {}
      var iv = setInterval(function () {
        n++;
        if (n >= total) {
          clearInterval(iv); busy = false; box.setAttribute('aria-busy', 'false');
          st.last = { w: win, at: now(), of: p.length }; save(st); show(st.last); fanfare(); info(); try { box.scrollIntoView({ block: 'nearest', behavior: calm ? 'auto' : 'smooth' }); } catch (e) {}
          return;
        }
        box.innerHTML = '<p class="gr-res-l">מגרילים…</p><p class="gr-res-n gr-roll">' + esc(p[rnd(p.length)]) + '</p>'; tick();
      }, 90);
      used('draw');
    }
    $('gr-go').addEventListener('click', go);
    $('gr-res').addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return;
      if (b.getAttribute('data-act') === 'out' && st.last) { var arr = items(st.text); st.last.w.forEach(function (x) { var i = arr.indexOf(x); if (i >= 0) arr.splice(i, 1); }); st.text = arr.join('\n'); $('gr-text').value = st.text; save(st); info(); }
      go();
    });
    document.querySelectorAll('[data-src]').forEach(function (b) { b.addEventListener('click', function () { st.src = b.getAttribute('data-src'); save(st); tabs(); }); });
    $('gr-text').value = st.text; $('gr-from').value = st.from; $('gr-to').value = st.to;
    $('gr-text').addEventListener('input', function () { st.text = this.value; save(st); info(); });
    $('gr-from').addEventListener('input', function () { st.from = this.value; save(st); info(); });
    $('gr-to').addEventListener('input', function () { st.to = this.value; save(st); info(); });
    $('gr-n').addEventListener('change', function () { st.count = +this.value || 1; save(st); info(); });
    $('gr-shuffle').addEventListener('click', function () { st.text = shuffle(items(st.text)).join('\n'); $('gr-text').value = st.text; save(st); });
    $('gr-clear').addEventListener('click', function () { if (items(st.text).length > 3 && !confirm('למחוק את כל השמות?')) return; st.text = ''; $('gr-text').value = ''; save(st); info(); $('gr-text').focus(); });
    function text() { var r = st.last; return r ? '🎉 תוצאות ההגרלה\n' + r.w.map(function (x, i) { return (r.w.length > 1 ? (i + 1) + '. ' : '') + x; }).join('\n') + '\n\nהוגרל ב-' + r.at + ', מתוך ' + r.of + ' משתתפים.\nהגרלה בחינם: ' + location.origin + PATH : ''; }
    wa($('gr-wa'), text); copyBtn($('gr-copy'), text, 'להעתיק');
    soundBox(st); tabs(); show(st.last); if (!st.last) $('gr-share').hidden = true;
  }

  // =====================================================================
  // 3. קוביות
  // =====================================================================
  function dice() {
    var st = load({ n: 2, sides: 6, sound: true, hist: [] }), busy = false, cur = [];
    var PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
    function face(v) {
      if (st.sides !== 6) return '<div class="gr-die num"><b>' + v + '</b></div>';
      var h = ''; for (var i = 0; i < 9; i++) h += '<i' + (PIPS[v].indexOf(i) >= 0 ? ' class="on"' : '') + '></i>';
      return '<div class="gr-die">' + h + '</div>';
    }
    function paint(vals, rolling) {
      $('gr-dice').innerHTML = vals.map(face).join('');
      $('gr-dice').classList.toggle('roll', !!rolling);
      $('gr-dice').setAttribute('aria-label', rolling ? 'הקוביות מתגלגלות' : 'יצא: ' + vals.join(', '));
    }
    function sum(v) { return v.reduce(function (a, b) { return a + b; }, 0); }
    function res() {
      $('gr-res').hidden = !cur.length;
      if (cur.length) $('gr-res').innerHTML = '<p class="gr-res-l">' + (cur.length > 1 ? 'יצא ' + cur.join(' + ') : 'יצא') + '</p><p class="gr-res-n">' + sum(cur) + '</p>';
      $('gr-hist-sec').hidden = !st.hist.length;
      $('gr-hist').innerHTML = st.hist.slice().reverse().map(function (h) { return '<li>' + esc(h) + '</li>'; }).join('');
    }
    function chips() {
      document.querySelectorAll('[data-n]').forEach(function (b) { b.setAttribute('aria-pressed', +b.getAttribute('data-n') === st.n); });
      document.querySelectorAll('[data-sides]').forEach(function (b) { b.setAttribute('aria-pressed', +b.getAttribute('data-sides') === st.sides); });
    }
    function blank() { var a = []; for (var i = 0; i < st.n; i++) a.push(Math.min(st.sides, i % 6 + 1)); return a; }
    function roll() {
      if (busy) return; ctx(); busy = true;
      var fin = []; for (var i = 0; i < st.n; i++) fin.push(1 + rnd(st.sides));
      var k = 0, total = calm ? 1 : 9;
      var iv = setInterval(function () {
        k++;
        if (k >= total) {
          clearInterval(iv); busy = false; cur = fin; paint(fin, false);
          st.hist.push((fin.length > 1 ? fin.join(' + ') + ' = ' : '') + sum(fin)); if (st.hist.length > 12) st.hist.shift();
          save(st); res(); tone(520, 0, .09, .25, 'triangle'); tone(780, .08, .14, .25, 'triangle');
          return;
        }
        var tmp = []; for (var j = 0; j < st.n; j++) tmp.push(1 + rnd(st.sides)); paint(tmp, true); tick();
      }, 75);
      used('roll');
    }
    $('gr-go').addEventListener('click', roll); $('gr-dice').addEventListener('click', roll);
    document.querySelectorAll('[data-n]').forEach(function (b) { b.addEventListener('click', function () { st.n = +b.getAttribute('data-n'); save(st); cur = []; chips(); paint(blank()); res(); }); });
    document.querySelectorAll('[data-sides]').forEach(function (b) { b.addEventListener('click', function () { st.sides = +b.getAttribute('data-sides'); st.hist = []; save(st); cur = []; chips(); paint(blank()); res(); }); });
    $('gr-hist-clear').addEventListener('click', function () { st.hist = []; save(st); res(); });
    soundBox(st); chips(); paint(blank()); res();
  }

  // =====================================================================
  // 4. מטבע
  // =====================================================================
  function coin() {
    var st = load({ a: 'עץ', b: 'פלי', ca: 0, cb: 0, sound: true, last: '' }), busy = false, rot = 0;
    var el = $('gr-coin');
    function labels() {
      $('gr-fa').textContent = st.a || 'עץ'; $('gr-fb').textContent = st.b || 'פלי';
      $('gr-stats').innerHTML = '<span><b>' + st.ca + '</b> ' + esc(st.a || 'עץ') + '</span><span><b>' + st.cb + '</b> ' + esc(st.b || 'פלי') + '</span><span>' + (st.ca + st.cb === 1 ? 'הטלה <b>אחת</b>' : '<b>' + (st.ca + st.cb) + '</b> הטלות') + '</span>';
      $('gr-reset').hidden = !(st.ca + st.cb);
    }
    function flip() {
      if (busy) return; ctx(); busy = true;
      var isA = rnd(2) === 0, showsA = (Math.round(rot / 180) % 2) === 0;
      rot += (calm ? 0 : 1800) + (isA === showsA ? 360 : 180);
      el.style.transition = 'transform ' + (calm ? .3 : 1.5) + 's cubic-bezier(.2,.7,.2,1)';
      el.style.transform = 'rotateY(' + rot + 'deg)';
      $('gr-res').hidden = true; tick(); setTimeout(tick, 180); setTimeout(tick, 400);
      setTimeout(function () {
        busy = false; if (isA) st.ca++; else st.cb++; st.last = isA ? 'a' : 'b'; save(st);
        $('gr-res').hidden = false; $('gr-res').innerHTML = '<p class="gr-res-l">יצא</p><p class="gr-res-n">' + esc(isA ? (st.a || 'עץ') : (st.b || 'פלי')) + '</p>';
        el.setAttribute('aria-label', 'מטבע. יצא: ' + (isA ? (st.a || 'עץ') : (st.b || 'פלי')));
        labels(); tone(880, 0, .12, .25); tone(1320, .09, .2, .25);
      }, calm ? 350 : 1550);
      used('flip');
    }
    $('gr-go').addEventListener('click', flip); el.addEventListener('click', flip);
    $('gr-a').value = st.a === 'עץ' ? '' : st.a; $('gr-b').value = st.b === 'פלי' ? '' : st.b;
    $('gr-a').addEventListener('input', function () { st.a = this.value.trim().slice(0, 14) || 'עץ'; save(st); labels(); });
    $('gr-b').addEventListener('input', function () { st.b = this.value.trim().slice(0, 14) || 'פלי'; save(st); labels(); });
    $('gr-reset').addEventListener('click', function () { st.ca = st.cb = 0; save(st); $('gr-res').hidden = true; labels(); });
    soundBox(st); labels();
  }

  if (MODE === 'wheel' || MODE === 'names') wheel();
  else if (MODE === 'raffle') raffle();
  else if (MODE === 'dice') dice();
  else if (MODE === 'coin') coin();
})();
