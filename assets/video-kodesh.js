// משיעור כתוב לסרטון (כלי קודש): טקסט → שקופיות עם תמונות CC0 מ-/assets/video/ → סרטון (canvas + MediaRecorder).
// המוזיקה נוצרת כאן ב-WebAudio (אקורדים רכים), בלי שום הקלטה חיצונית.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('vd-form'), cv = $('vd-canvas');
  if (!form || !cv) return;
  var ctx = cv.getContext('2d');
  var SERIF = '"Frank Ruhl Libre", "David Libre", David, serif', SANS = '"Assistant", Arial, sans-serif';
  var SIZES = { story: [720, 1280], square: [720, 720] };
  var GOLD = '#e6c57e';

  // התמונות לפי נושא (כמה קבצים בכל נושא), ומילות מפתח שמובילות לכל נושא
  var IMGS = { kotel: 3, jeru: 2, light: 3, mount: 4, desert: 4, sea: 4, stars: 2, sunset: 4, wheat: 3, olive: 2, path: 2, torah: 3, books: 1, candles: 2, flowers: 2 };
  var KEYS = {
    kotel: ['כותל', 'מקדש', 'חורבן', 'גלות', 'ציון', 'תשעה באב', 'הר הבית', 'קרבן', 'כהן', 'אבן', 'אבנים'],
    jeru: ['ירושלים', 'עיר', 'שער', 'חומה', 'בית', 'עם ישראל', 'כנסת ישראל', 'שיבה', 'עלייה לרגל'],
    light: ['אור', 'הארה', 'נשמה', 'שכינה', 'אמונה', 'קדושה', 'רוח', 'הקב"ה', 'הקב״ה', 'בורא', 'אלוקים', 'ה\'', 'השם', 'חסד', 'רחמים', 'תשובה'],
    mount: ['הר', 'סיני', 'עלייה', 'לעלות', 'מעלה', 'גבוה', 'זריחה', 'בוקר', 'שמש', 'התחלה', 'חדש', 'מתן תורה', 'שבועות', 'עקדה', 'מוריה'],
    desert: ['מדבר', 'ענווה', 'ניסיון', 'נסיון', 'קושי', 'קשה', 'צרה', 'בדידות', 'יציאת מצרים', 'מצרים', 'עבדות', 'חירות', 'שממה', 'צמא'],
    sea: ['ים', 'מים', 'נהר', 'מבול', 'נח', 'קריעת', 'גלים', 'כנרת', 'מעיין', 'באר', 'נס', 'ניסים', 'יונה'],
    stars: ['כוכב', 'כוכבים', 'לילה', 'חלום', 'אברהם', 'זרעך', 'שמים', 'שמיים', 'הבטחה', 'לבנה', 'ירח', 'יעקב'],
    sunset: ['שבת', 'ערב', 'שקיעה', 'מנוחה', 'סוף', 'סיום', 'זיכרון', 'געגוע', 'תפילה', 'מנחה', 'יום כיפור', 'שלום'],
    wheat: ['שדה', 'קציר', 'לחם', 'ברכה', 'פרנסה', 'חיטה', 'עומר', 'ביכורים', 'זרע', 'צמיחה', 'פרי', 'יבול', 'רות', 'שפע', 'תודה', 'הודיה'],
    olive: ['זית', 'שורש', 'שורשים', 'אבות', 'עץ', 'שמן', 'חנוכה', 'דורות', 'מסורת', 'סבא', 'ותיק', 'יציבות'],
    path: ['דרך', 'הליכה', 'ללכת', 'לך לך', 'מסע', 'צעד', 'בחירה', 'כיוון', 'הולך', 'הלך', 'מטרה', 'שליחות'],
    torah: ['תורה', 'פסוק', 'פרשה', 'ספר תורה', 'מצווה', 'מצוה', 'מצוות', 'כתוב', 'קריאה', 'משה', 'הלכה', 'חומש'],
    books: ['ספר', 'ספרים', 'לימוד', 'ללמוד', 'חכמה', 'בית מדרש', 'גמרא', 'משנה', 'שיעור', 'חכמים', 'רבי', 'תלמיד', 'מדרש', 'רש"י', 'רש״י'],
    candles: ['נר', 'נרות', 'להבה', 'הדלקה', 'נשמת', 'לעילוי', 'אזכרה', 'חושך', 'ניצוץ', 'אש'],
    flowers: ['אביב', 'פסח', 'פריחה', 'פורח', 'חיים', 'שמחה', 'ארץ ישראל', 'הארץ', 'גאולה', 'תקווה', 'תקוה', 'משיח', 'לידה', 'ילד', 'ילדים', 'נישואין', 'חתן', 'כלה']
  };
  var DEFAULT_ORDER = ['light', 'mount', 'sunset', 'path', 'wheat', 'sea', 'olive', 'stars', 'flowers', 'desert'];
  var ALL = [];
  Object.keys(IMGS).forEach(function (c) { for (var i = 1; i <= IMGS[c]; i++) ALL.push(c + '-' + i); });

  var KEEP = ['rav', 'foot', 'size', 'pace', 'music', 'look'];
  var cache = {}, slides = [], seed = 0, playing = null, recording = false;

  function val(n) { var el = form.querySelector('[name=' + n + ']'); return el ? el.value.trim() : ''; }
  function img(name) {
    if (!cache[name]) cache[name] = new Promise(function (res) {
      var im = new Image(); im.decoding = 'async';
      im.onload = function () { res(im); }; im.onerror = function () { res(null); };
      setTimeout(function () { res(im.complete && im.naturalWidth ? im : null); }, 20000); // אינטרנט איטי: לא נתקעים
      im.src = '/assets/video/' + name + '.jpg';
    });
    return cache[name];
  }

  // ---------- חלוקה לשקופיות ----------
  // שורה = פסקה. משפטים לא מתחברים בין פסקאות, כדי שהחלוקה של הרב תישמר.
  function sentences(p) {
    var out = [], m = p.match(/[^.!?׃]+[.!?׃]*["'״”׳)\]]*\s*/g) || [p];
    m.forEach(function (s) { s = s.trim(); if (s) out.push(s); });
    return out;
  }
  function chunkLong(s, max) {
    if (s.length <= max) return [s];
    var parts = [], cur = '';
    s.split(/(?<=,|،|;)\s+|\s+/).forEach(function (w) {
      var t = cur ? cur + ' ' + w : w;
      if (t.length > max && cur) { parts.push(cur); cur = w; } else cur = t;
    });
    if (cur) parts.push(cur);
    return parts;
  }
  function split(body) {
    var MAX = 130, out = [];
    body.replace(/\r/g, '').split(/\n+/).forEach(function (para) {
      para = para.trim(); if (!para) return;
      var cur = '', n = 0;
      sentences(para).forEach(function (s) {
        chunkLong(s, MAX).forEach(function (c) {
          if (cur && (cur.length + c.length + 1 > MAX || n >= 2)) { out.push(cur); cur = ''; n = 0; }
          cur = cur ? cur + ' ' + c : c; n++;
        });
      });
      if (cur) out.push(cur);
    });
    return out.slice(0, 30);
  }

  // ---------- בחירת תמונה לפי מילות מפתח ----------
  function topics(text) {
    var t = ' ' + text.replace(/[^֐-׿'"״ ]/g, ' ') + ' ', sc = [];
    Object.keys(KEYS).forEach(function (c) {
      var s = 0;
      KEYS[c].forEach(function (k) {
        // מילה שלמה, או עם אות שימוש אחת (ו, ה, ב, ל, מ, ש, כ) לפניה
        var re = new RegExp('[ ]([והבלמשכ]{0,2})' + k.replace(/["'״]/g, '.') + '(ים|ות|ה|ו|י|ך|נו|כם)?[ ]', 'g');
        var m = t.match(re); if (m) s += m.length * (k.length > 3 ? 2 : 1);
      });
      if (s) sc.push([c, s]);
    });
    sc.sort(function (a, b) { return b[1] - a[1]; });
    return sc.map(function (x) { return x[0]; });
  }
  function assign() {
    var used = {}, last = '', di = seed;
    slides.forEach(function (sl, i) {
      if (sl.fixed) { used[sl.img] = 1; last = sl.img; return; }
      var cats = sl.kind === 'end' ? ['sunset', 'candles', 'light'] : topics(sl.text + (i === 0 ? ' ' + val('par') : ''));
      var pick = null;
      for (var k = 0; k < cats.length && !pick; k++) pick = freeIn(cats[k], used, last);
      while (!pick) { pick = freeIn(DEFAULT_ORDER[di % DEFAULT_ORDER.length], used, last); di++; if (di > seed + 40) pick = ALL[(i + seed) % ALL.length]; }
      sl.img = pick; used[pick] = 1; last = pick;
    });
  }
  function freeIn(cat, used, last) {
    var n = IMGS[cat]; if (!n) return null;
    for (var j = 0; j < n; j++) { var nm = cat + '-' + ((j + seed) % n + 1); if (!used[nm] && nm !== last) return nm; }
    return null;
  }

  // ---------- בניית הרצף ----------
  function build() {
    var body = val('body') || $('vd-body').placeholder, pace = parseFloat(val('pace')) || 1;
    var old = slides;
    var list = [{ kind: 'title', text: val('title') || 'דבר תורה', sub: val('par') }];
    split(body).forEach(function (s) { list.push({ kind: 'text', text: s }); });
    list.push({ kind: 'end', text: val('rav') || 'שבוע טוב ובשורות טובות', sub: val('foot') });
    list.forEach(function (sl, i) { if (old[i] && old[i].fixed && old[i].text === sl.text) { sl.fixed = true; sl.img = old[i].img; } });
    slides = list;
    assign();
    var t = 0;
    slides.forEach(function (sl) {
      var d = sl.kind === 'title' ? 4 : sl.kind === 'end' ? 4.5 : Math.min(11, Math.max(3.8, 1.6 + sl.text.length / 12));
      if (sl.kind === 'text') d *= pace;
      sl.start = t; sl.dur = d; t += d;
    });
    renderList();
    var secs = Math.round(total());
    $('vd-info').textContent = slides.length + ' שקופיות · כ-' + secs + ' שניות' + (secs > 60 ? ' · בסטטוס של ווטסאפ סרטון ארוך מדקה מתחלק לחלקים' : '');
  }
  function total() { var l = slides[slides.length - 1]; return l ? l.start + l.dur : 0; }

  function renderList() {
    var ol = $('vd-slides'); ol.innerHTML = '';
    slides.forEach(function (sl, i) {
      var li = document.createElement('li'), im = document.createElement('img'), sp = document.createElement('span');
      im.src = '/assets/video/' + sl.img + '.jpg'; im.alt = 'להחליף את התמונה של שקופית ' + (i + 1); im.loading = 'lazy'; im.title = 'להחליף תמונה';
      im.addEventListener('click', function () {
        var k = ALL.indexOf(sl.img); sl.img = ALL[(k + 1) % ALL.length]; sl.fixed = true; im.src = '/assets/video/' + sl.img + '.jpg'; img(sl.img).then(function () { frame(sl.start + 1.2); });
      });
      sp.textContent = sl.text;
      var sm = document.createElement('small'); sm.textContent = (i + 1) + ' · ' + (sl.kind === 'title' ? 'פתיחה' : sl.kind === 'end' ? 'סיום' : Math.round(sl.dur) + ' שנ\'');
      sp.prepend(sm);
      li.appendChild(im); li.appendChild(sp); ol.appendChild(li);
    });
  }

  // ---------- ציור ----------
  var loaded = {};
  function preload() { return Promise.all(slides.map(function (s) { return img(s.img).then(function (im) { loaded[s.img] = im; }); })); }
  function wrap(text, font, maxW) {
    ctx.font = font; var out = [], line = '';
    text.split(/\s+/).filter(Boolean).forEach(function (w) {
      var t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
    });
    if (line) out.push(line);
    return out;
  }
  function ease(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
  function drawBg(sl, p, alpha, idx) {
    var im = loaded[sl.img], W = cv.width, H = cv.height;
    ctx.globalAlpha = alpha;
    if (!im) { ctx.fillStyle = '#0e1628'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; return; }
    var z = 1.04 + 0.12 * (idx % 2 ? 1 - p : p);
    var s = Math.max(W / im.width, H / im.height) * z, w = im.width * s, h = im.height * s;
    var dx = (W - w) / 2 + (idx % 3 - 1) * (w - W) * 0.25 * (p - 0.5), dy = (H - h) / 2;
    ctx.drawImage(im, dx, dy, w, h);
    ctx.globalAlpha = 1;
  }
  function shade() {
    var W = cv.width, H = cv.height, g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(0,0,0,.45)'); g.addColorStop(0.3, 'rgba(0,0,0,.5)'); g.addColorStop(0.7, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,.7)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  function txt(s, x, y, color) {
    ctx.shadowColor = 'rgba(0,0,0,.75)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 2;
    ctx.fillStyle = color; ctx.fillText(s, x, y);
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  }
  function drawText(sl, a, rise) {
    var W = cv.width, H = cv.height, u = W / 720, gold = val('look') !== 'white' ? GOLD : '#ffffff';
    ctx.globalAlpha = a; ctx.direction = 'rtl'; ctx.textAlign = 'center';
    var maxW = W * 0.84, cy = H / 2 + rise * u;
    if (sl.kind === 'title') {
      var tl = wrap(sl.text, '700 ' + Math.round(64 * u) + 'px ' + SERIF, maxW), lh = 78 * u;
      var y = cy - (tl.length - 1) * lh / 2;
      if (sl.sub) { ctx.font = '600 ' + Math.round(32 * u) + 'px ' + SANS; txt(sl.sub, W / 2, y - 80 * u, gold); }
      ctx.font = '700 ' + Math.round(64 * u) + 'px ' + SERIF;
      tl.forEach(function (l, i) { txt(l, W / 2, y + i * lh, '#ffffff'); });
      ctx.fillStyle = gold; ctx.fillRect(W / 2 - 60 * u, y + (tl.length - 1) * lh + 36 * u, 120 * u, 3 * u);
    } else if (sl.kind === 'end') {
      ctx.font = '700 ' + Math.round(44 * u) + 'px ' + SERIF;
      var el = wrap(sl.text, ctx.font, maxW);
      el.forEach(function (l, i) { txt(l, W / 2, cy - (el.length - 1) * 28 * u + i * 56 * u, gold); });
      if (sl.sub) { ctx.font = '400 ' + Math.round(28 * u) + 'px ' + SANS; txt(sl.sub, W / 2, cy + (el.length) * 40 * u + 30 * u, '#ffffff'); }
      ctx.font = '400 ' + Math.round(20 * u) + 'px ' + SANS; txt('נוצר בחינם בכלי קודש', W / 2, H - 50 * u, 'rgba(255,255,255,.75)');
    } else {
      var fs, lines, lhh, box = H * (H > W ? 0.5 : 0.62);
      for (fs = 58; fs >= 26; fs -= 2) {
        lhh = fs * 1.5 * u; lines = wrap(sl.text, '600 ' + Math.round(fs * u) + 'px ' + SANS, maxW);
        if (lines.length * lhh <= box) break;
      }
      ctx.font = '600 ' + Math.round(fs * u) + 'px ' + SANS;
      var y0 = cy - (lines.length - 1) * lhh / 2 + fs * u * 0.35;
      lines.forEach(function (l, i) { txt(l, W / 2, y0 + i * lhh, '#ffffff'); });
    }
    ctx.font = '600 ' + Math.round(20 * u) + 'px ' + SANS; ctx.textAlign = 'right';
    txt('בס"ד', W - 26 * u, 44 * u, 'rgba(255,255,255,.8)');
    ctx.globalAlpha = 1;
  }
  var FADE = 0.9;
  function frame(t) {
    var W = cv.width, H = cv.height, i = 0;
    while (i < slides.length - 1 && t >= slides[i + 1].start) i++;
    var sl = slides[i]; if (!sl) return;
    var local = t - sl.start, p = Math.min(1, (local + FADE) / (sl.dur + FADE));
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    if (i > 0 && local < FADE) {
      var pr = slides[i - 1];
      drawBg(pr, 1, 1, i - 1);
      drawBg(sl, p, ease(local / FADE), i);
    } else drawBg(sl, p, 1, i);
    shade();
    var a = ease((local - 0.25) / 0.7), out = sl.dur - local;
    if (i < slides.length - 1 && out < 0.5) a *= ease(out / 0.5);
    if (i === slides.length - 1 && out < 0.8) { a *= ease(out / 0.8); }
    drawText(sl, a, 18 * (1 - ease((local - 0.25) / 0.7)));
    if (i === slides.length - 1 && out < 0.8) { ctx.fillStyle = 'rgba(0,0,0,' + (1 - out / 0.8) + ')'; ctx.fillRect(0, 0, W, H); }
  }

  // ---------- מוזיקה (WebAudio, נוצרת כאן) ----------
  var CH = [[50, 54, 57, 62], [47, 50, 54, 59], [43, 47, 50, 55], [45, 49, 52, 57]]; // D, Bm, G, A
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function music(ac, dest, dur) {
    var t0 = ac.currentTime + 0.05, master = ac.createGain(), lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 1500;
    master.gain.setValueAtTime(0, t0); master.gain.linearRampToValueAtTime(0.22, t0 + 2);
    master.gain.setValueAtTime(0.22, t0 + Math.max(2.1, dur - 3)); master.gain.linearRampToValueAtTime(0, t0 + dur);
    lp.connect(master); dest.forEach(function (d) { master.connect(d); });
    var dl = ac.createDelay(), fb = ac.createGain(); dl.delayTime.value = 0.42; fb.gain.value = 0.35;
    dl.connect(fb); fb.connect(dl); dl.connect(lp);
    var nodes = [];
    for (var b = 0, t = t0; t < t0 + dur; b++, t += 4) {
      var ch = CH[b % 4];
      ch.forEach(function (m, k) {
        ['sine', 'triangle'].forEach(function (type, j) {
          var o = ac.createOscillator(), g = ac.createGain();
          o.type = type; o.frequency.value = hz(m) * (j ? 1.003 : 1);
          g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(j ? 0.035 : 0.06, t + 1.2); g.gain.linearRampToValueAtTime(0, t + 4.6);
          o.connect(g); g.connect(lp); o.start(t); o.stop(t + 4.7); nodes.push(o);
        });
      });
      var arp = [ch[1] + 12, ch[2] + 12, ch[3] + 12, ch[2] + 12];
      arp.forEach(function (m, k) {
        var tt = t + k * 1 + 0.5; if (tt > t0 + dur - 1) return;
        var o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sine'; o.frequency.value = hz(m);
        g.gain.setValueAtTime(0, tt); g.gain.linearRampToValueAtTime(0.05, tt + 0.03); g.gain.exponentialRampToValueAtTime(0.0008, tt + 1.6);
        o.connect(g); g.connect(lp); g.connect(dl); o.start(tt); o.stop(tt + 1.7); nodes.push(o);
      });
    }
    return function stop() { nodes.forEach(function (o) { try { o.stop(); } catch (e) {} }); try { master.disconnect(); } catch (e) {} };
  }

  // ---------- ניגון והקלטה ----------
  function size() { var s = SIZES[val('size')] || SIZES.story; cv.width = s[0]; cv.height = s[1]; }
  function run(onFrame) {
    return new Promise(function (res) {
      var T = total(), st = performance.now();
      function tick() {
        if (!playing) return res(false);
        var t = (performance.now() - st) / 1000;
        if (t >= T) { frame(T - 0.001); return res(true); }
        frame(t); onFrame && onFrame(t / T);
        // requestAnimationFrame נעצר כשהחלון מוסתר או ממוזער; לכן גם טיימר גיבוי, ומה שמגיע ראשון מצייר
        var done = false, go = function () { if (!done) { done = true; tick(); } };
        requestAnimationFrame(go); setTimeout(go, 40);
      }
      tick();
    });
  }
  function stopAll() { if (playing && playing.stop) playing.stop(); playing = null; }
  function ac() { var A = window.AudioContext || window.webkitAudioContext; return A ? new A() : null; }

  $('vd-play').addEventListener('click', function () {
    var b = this;
    if (playing) { stopAll(); b.textContent = '▶ לצפות לפני'; return; }
    if (recording) return;
    build(); size();
    preload().then(function () {
      var a = val('music') !== 'none' ? ac() : null, st = null;
      if (a) st = music(a, [a.destination], total());
      playing = { stop: function () { st && st(); a && a.close(); } };
      b.textContent = '■ לעצור';
      run().then(function () { stopAll(); b.textContent = '▶ לצפות לפני'; });
      used('preview');
    });
  });

  function mime() {
    var list = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1,opus', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    if (!window.MediaRecorder) return null;
    for (var i = 0; i < list.length; i++) if (MediaRecorder.isTypeSupported(list[i])) return list[i];
    return '';
  }
  var result = null;
  $('vd-make').addEventListener('click', function () {
    if (recording) return;
    if (!val('body')) { form.reportValidity(); return; }
    var m = mime();
    if (m === null || !cv.captureStream) { $('vd-info').textContent = 'הדפדפן הזה לא יודע ליצור סרטון. נסו בכרום, בטלפון אנדרואיד או במחשב.'; return; }
    stopAll(); build(); size();
    var b = this, pg = $('vd-prog');
    recording = true; b.disabled = true; b.textContent = 'יוצר סרטון…';
    $('vd-result').hidden = true; pg.hidden = false; pg.value = 0;
    preload().then(function () {
      frame(0);
      var stream = cv.captureStream(30), a = null, st = null;
      if (val('music') !== 'none') {
        a = ac();
        if (a) { var d = a.createMediaStreamDestination(); st = music(a, [d], total()); d.stream.getAudioTracks().forEach(function (tr) { stream.addTrack(tr); }); }
      }
      var rec = new MediaRecorder(stream, m ? { mimeType: m, videoBitsPerSecond: 2500000 } : { videoBitsPerSecond: 2500000 }), parts = [];
      rec.ondataavailable = function (e) { if (e.data && e.data.size) parts.push(e.data); };
      rec.onstop = function () {
        var type = (rec.mimeType || m || 'video/webm').split(';')[0];
        result = { blob: new Blob(parts, { type: type }), ext: type.indexOf('mp4') > -1 ? 'mp4' : 'webm' };
        var v = $('vd-video'); v.src = URL.createObjectURL(result.blob);
        $('vd-result').hidden = false; pg.hidden = true;
        $('vd-fmt').textContent = result.ext === 'mp4' ? 'הסרטון בפורמט MP4, מתאים לווטסאפ.' : 'הסרטון נשמר בפורמט WebM. ווטסאפ בטלפון מעדיף MP4: כדאי ליצור אותו בכרום מעודכן או באייפון, או להמיר באתר המרה.';
        recording = false; b.disabled = false; b.textContent = 'ליצור את הסרטון';
        $('vd-info').textContent = 'הסרטון מוכן (' + Math.round(result.blob.size / 1048576 * 10) / 10 + ' MB). אפשר לצפות, לשמור ולשתף.';
        a && a.close();
        $('vd-result').scrollIntoView({ behavior: 'smooth', block: 'center' });
        used('create', { fmt: result.ext, slides: slides.length, secs: Math.round(total()) });
      };
      playing = { stop: function () { st && st(); } };
      rec.start(1000);
      run(function (p) { pg.value = p; }).then(function () {
        setTimeout(function () { playing = null; rec.stop(); stream.getTracks().forEach(function (tr) { tr.stop(); }); }, 250);
      });
    });
  });

  function fname() { return (val('title') || 'שיעור').replace(/[\\/:*?"<>|]/g, '').slice(0, 40) + '.' + (result ? result.ext : 'mp4'); }
  function download() { var x = document.createElement('a'); x.href = URL.createObjectURL(result.blob); x.download = fname(); document.body.appendChild(x); x.click(); x.remove(); }
  $('vd-dl').addEventListener('click', function () { if (result) { download(); used('download'); } });
  $('vd-share').addEventListener('click', function () {
    if (!result) return;
    var f = new File([result.blob], fname(), { type: result.blob.type });
    if (navigator.canShare && navigator.canShare({ files: [f] })) {
      navigator.share({ files: [f], text: val('title') }).then(function () { used('share'); }).catch(function () {});
    } else { download(); $('vd-tip').hidden = false; used('download_fallback'); }
  });
  $('vd-shuffle').addEventListener('click', function () {
    seed++; slides.forEach(function (s) { s.fixed = false; }); build(); preload().then(function () { frame(slides[0] ? 1.5 : 0); });
  });

  function used(how, extra) {
    if (!window.toolUsed) return;
    var o = { how: how, size: val('size'), music: val('music') };
    if (extra) for (var k in extra) o[k] = extra[k];
    window.toolUsed('video', o);
  }

  // שמירת העדפות + תצוגה חיה
  try { var s = JSON.parse(localStorage.getItem('kodesh-video') || '{}'); KEEP.forEach(function (k) { var el = form.querySelector('[name=' + k + ']'); if (el && s[k]) el.value = s[k]; }); } catch (e) {}
  var tmr;
  function upd() {
    var o = {}; KEEP.forEach(function (k) { o[k] = val(k); });
    try { localStorage.setItem('kodesh-video', JSON.stringify(o)); } catch (e) {}
    if (playing || recording) return;
    clearTimeout(tmr);
    tmr = setTimeout(function () { build(); size(); preload().then(function () { frame(1.5); }); }, 250);
  }
  form.addEventListener('input', upd);
  form.addEventListener('change', upd);
  var fontsReady = (document.fonts && document.fonts.load) ? Promise.all([document.fonts.load('700 40px "Frank Ruhl Libre"'), document.fonts.load('600 40px "Assistant"'), document.fonts.load('400 40px "Assistant"')]).catch(function () {}) : Promise.resolve();
  fontsReady.then(function () { build(); size(); return preload(); }).then(function () { frame(1.5); });

  // קרדיטים לתמונות
  fetch('/assets/video/credits.json').then(function (r) { return r.json(); }).then(function (list) {
    var ul = $('vd-credits'); if (!ul) return;
    list.forEach(function (c) {
      var li = document.createElement('li'), a = document.createElement('a');
      a.href = c.page; a.target = '_blank'; a.rel = 'noopener'; a.textContent = c.title; a.dir = 'ltr';
      li.appendChild(a); li.appendChild(document.createTextNode(' – ' + (c.artist || 'צלם לא ידוע') + ' (' + c.lic + ')'));
      ul.appendChild(li);
    });
  }).catch(function () {});
})();
