// מנוע הסרטונים המשותף של כלי קודש: טקסט → שקופיות עם תמונות CC0 מ-/assets/video/ → סרטון (canvas + MediaRecorder).
// משמש את "משיעור כתוב לסרטון" (/kodesh/video/) ואת "סיפור בהמשכים" (/kodesh/sipur/).
// המוזיקה נוצרת כאן ב-WebAudio, בלי שום הקלטה חיצונית.
(function () {
  'use strict';
  var SERIF = '"Frank Ruhl Libre", "David Libre", David, serif', SANS = '"Assistant", Arial, sans-serif';
  var ROUND = '"Varela Round", "Assistant", Arial, sans-serif';
  var SIZES = { story: [720, 1280], square: [720, 720] };
  var GOLD = '#e6c57e';
  var FADE = 0.9;

  // ---------- חלוקה לשקופיות ----------
  // שורה = פסקה. משפטים לא מתחברים בין פסקאות, כדי שהחלוקה של הכותב תישמר.
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
  function split(body, max, limit) {
    var MAX = max || 130, out = [];
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
    return out.slice(0, limit || 30);
  }
  function ease(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  // ---------- מוזיקה ----------
  // רכה: אקורדים ארוכים ועוד ארפג'ו עדין (D, Bm, G, A)
  function softMusic(ac, out, t0, dur) {
    var CH = [[50, 54, 57, 62], [47, 50, 54, 59], [43, 47, 50, 55], [45, 49, 52, 57]];
    var dl = ac.createDelay(), fb = ac.createGain(); dl.delayTime.value = 0.42; fb.gain.value = 0.35;
    dl.connect(fb); fb.connect(dl); dl.connect(out);
    var nodes = [];
    for (var b = 0, t = t0; t < t0 + dur; b++, t += 4) {
      var ch = CH[b % 4];
      ch.forEach(function (m) {
        ['sine', 'triangle'].forEach(function (type, j) {
          var o = ac.createOscillator(), g = ac.createGain();
          o.type = type; o.frequency.value = hz(m) * (j ? 1.003 : 1);
          g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(j ? 0.035 : 0.06, t + 1.2); g.gain.linearRampToValueAtTime(0, t + 4.6);
          o.connect(g); g.connect(out); o.start(t); o.stop(t + 4.7); nodes.push(o);
        });
      });
      [ch[1] + 12, ch[2] + 12, ch[3] + 12, ch[2] + 12].forEach(function (m, k) {
        var tt = t + k + 0.5; if (tt > t0 + dur - 1) return;
        var o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sine'; o.frequency.value = hz(m);
        g.gain.setValueAtTime(0, tt); g.gain.linearRampToValueAtTime(0.05, tt + 0.03); g.gain.exponentialRampToValueAtTime(0.0008, tt + 1.6);
        o.connect(g); g.connect(out); g.connect(dl); o.start(tt); o.stop(tt + 1.7); nodes.push(o);
      });
    }
    return nodes;
  }
  // עליזה לילדים: תיבת נגינה בסולם מז'ור, בס קופצני ומשטח רך (C, G, Am, F), 100 פעימות לדקה
  function kidsMusic(ac, out, t0, dur) {
    var CH = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]];
    // מנגינה לכל תיבה: מיקום בשמיניות → מדרגה באקורד (0-2), +3 = אוקטבה למעלה; null = שקט
    var MEL = [[0, 1, 2, null, 3, 2, 1, null], [2, null, 1, 0, 1, 2, null, null], [0, 2, 3, 2, 1, null, 0, null], [1, 2, 3, null, 4, 3, null, null]];
    var beat = 0.6, bar = beat * 4, nodes = [];
    function note(m, t, len, vol, type) {
      var o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.value = hz(m);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0006, t + len);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + len + 0.05); nodes.push(o);
    }
    for (var b = 0, t = t0; t < t0 + dur - 0.3; b++, t += bar) {
      var ch = CH[b % 4], mel = MEL[b % 4];
      // משטח רך
      ch.forEach(function (m) {
        var o = ac.createOscillator(), g = ac.createGain();
        o.type = 'triangle'; o.frequency.value = hz(m);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.022, t + 0.3); g.gain.linearRampToValueAtTime(0, t + bar + 0.2);
        o.connect(g); g.connect(out); o.start(t); o.stop(t + bar + 0.3); nodes.push(o);
      });
      // בס בפעמות 1 ו-3, ועוד קפיצה לקווינטה
      [[0, ch[0] - 12], [2, ch[0] - 5], [3, ch[0] - 12]].forEach(function (x) { var tt = t + x[0] * beat; if (tt < t0 + dur - 0.4) note(x[1], tt, 0.45, 0.11, 'triangle'); });
      // תיבת נגינה
      mel.forEach(function (d, k) {
        if (d === null) return;
        var tt = t + k * beat / 2; if (tt > t0 + dur - 0.6) return;
        var m = ch[d % 3] + 12 * (1 + Math.floor(d / 3));
        note(m, tt, 0.9, 0.07, 'sine'); note(m + 12, tt, 0.35, 0.018, 'sine');
      });
      // נקישה קלה על כל פעמה
      for (var k = 0; k < 4; k++) { var tk = t + k * beat; if (tk < t0 + dur - 0.4) note(96, tk, 0.05, k % 2 ? 0.012 : 0.02, 'square'); }
    }
    return nodes;
  }
  function music(ac, dest, dur, style, lead) {
    var t0 = ac.currentTime + (lead || 0.05), master = ac.createGain(), lp = ac.createBiquadFilter();
    var vol = style === 'kids' ? 1.25 : 0.65; // הצלילים הקצרים של הילדים שקטים יותר בממוצע, ולכן הגברה גדולה יותר
    lp.type = 'lowpass'; lp.frequency.value = style === 'kids' ? 4200 : 1500;
    master.gain.setValueAtTime(0, t0); master.gain.linearRampToValueAtTime(vol, t0 + (style === 'kids' ? 0.6 : 2));
    master.gain.setValueAtTime(vol, t0 + Math.max(2.1, dur - 3)); master.gain.linearRampToValueAtTime(0, t0 + dur);
    lp.connect(master); dest.forEach(function (d) { master.connect(d); });
    var nodes = (style === 'kids' ? kidsMusic : softMusic)(ac, lp, t0, dur);
    var stop = function () { nodes.forEach(function (o) { try { o.stop(); } catch (e) {} }); try { master.disconnect(); } catch (e) {} };
    stop.t0 = t0;
    return stop;
  }
  function audioCtx() { var A = window.AudioContext || window.webkitAudioContext; return A ? new A() : null; }

  // שעון שלא נעצר כשהחלון מוסתר: requestAnimationFrame נעצר, וטיימר רגיל בדף מוסתר מואט לפעם בשנייה,
  // ואז השקופיות נכנסות לסרטון באיחור. טיימר בתוך Worker ממשיך לתקתק.
  var workerTick = null;
  function ticker(fn0) {
    var done = false, stopW = null, lastT = 0;
    // שני מקורות מתקתקים (Worker ו-requestAnimationFrame): מציירים לכל היותר פעם ב-30 אלפיות
    function fn() { var n = performance.now(); if (n - lastT < 30) return; lastT = n; fn0(); }
    try {
      if (!workerTick) workerTick = URL.createObjectURL(new Blob(['setInterval(function(){postMessage(0)},33)'], { type: 'text/javascript' }));
      var w = new Worker(workerTick); w.onmessage = function () { if (!done) fn(); };
      stopW = function () { w.terminate(); };
    } catch (e) { stopW = null; }
    (function raf() { if (done) return; fn(); requestAnimationFrame(raf); })();
    var iv = stopW ? null : setInterval(function () { if (!done) fn(); }, 40);
    return function () { done = true; stopW && stopW(); iv && clearInterval(iv); };
  }

  function mime() {
    var list = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1,opus', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    if (!window.MediaRecorder) return null;
    for (var i = 0; i < list.length; i++) if (MediaRecorder.isTypeSupported(list[i])) return list[i];
    return '';
  }

  // cfg: imgs {נושא: כמה קבצים}, keys {נושא: [מילים]}, order [נושאים לברירת מחדל], endCats, opts() → { theme: 'torah'|'kids', look: 'gold'|'white', size, music }
  function create(cv, cfg) {
    var ctx = cv.getContext('2d');
    var IMGS = cfg.imgs, KEYS = cfg.keys, ORDER = cfg.order, ALL = [];
    Object.keys(IMGS).forEach(function (c) { for (var i = 1; i <= IMGS[c]; i++) ALL.push(c + '-' + i); });
    var cache = {}, loaded = {}, slides = [], seed = 0, playing = null;
    function opts() { return cfg.opts ? cfg.opts() : {}; }

    function img(name) {
      if (!cache[name]) cache[name] = new Promise(function (res) {
        var im = new Image(); im.decoding = 'async';
        im.onload = function () { res(im); }; im.onerror = function () { res(null); };
        setTimeout(function () { res(im.complete && im.naturalWidth ? im : null); }, 20000); // אינטרנט איטי: לא נתקעים
        im.src = '/assets/video/' + name + '.jpg';
      });
      return cache[name];
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
    function freeIn(cat, used, last) {
      var n = IMGS[cat]; if (!n) return null;
      for (var j = 0; j < n; j++) { var nm = cat + '-' + ((j + seed) % n + 1); if (!used[nm] && nm !== last) return nm; }
      return null;
    }
    function assign(extra) {
      var used = {}, last = '', di = seed;
      slides.forEach(function (sl, i) {
        if (sl.fixed) { used[sl.img] = 1; last = sl.img; return; }
        var cats = sl.kind === 'end' ? cfg.endCats : topics(sl.text + (i === 0 ? ' ' + (extra || '') : ''));
        // אין מילת מפתח בשקופית: ממשיכים את הנושא של השקופית הקודמת, כדי שסיפור יישאר באותו עולם
        if (!cats.length && sl.kind === 'text' && slides[i - 1] && slides[i - 1].cats) cats = slides[i - 1].cats.slice(0, 1);
        sl.cats = cats;
        var pick = null;
        for (var k = 0; k < cats.length && !pick; k++) pick = freeIn(cats[k], used, last);
        while (!pick) { pick = freeIn(ORDER[di % ORDER.length], used, last); di++; if (di > seed + 40) pick = ALL[(i + seed) % ALL.length]; }
        sl.img = pick; used[pick] = 1; last = pick;
      });
    }

    // list: [{kind:'title'|'text'|'end', text, sub}] → זמנים ותמונות
    function setSlides(list, o) {
      o = o || {};
      var old = slides, pace = o.pace || 1;
      list.forEach(function (sl, i) { if (old[i] && old[i].fixed && old[i].text === sl.text) { sl.fixed = true; sl.img = old[i].img; } });
      slides = list;
      assign(o.extra);
      var t = 0, kids = opts().theme === 'kids';
      slides.forEach(function (sl) {
        var d = sl.kind === 'title' ? (kids ? 4.5 : 4) : sl.kind === 'end' ? 4.5 : Math.min(11, Math.max(3.8, 1.6 + sl.text.length / (kids ? 11 : 12)));
        if (sl.kind === 'text') d *= pace;
        sl.start = t; sl.dur = d; t += d;
      });
      return slides;
    }
    function total() { var l = slides[slides.length - 1]; return l ? l.start + l.dur : 0; }
    function preload() { return Promise.all(slides.map(function (s) { return img(s.img).then(function (im) { loaded[s.img] = im; }); })); }
    function size() { var s = SIZES[opts().size] || SIZES.story; cv.width = s[0]; cv.height = s[1]; }

    // ---------- ציור ----------
    function wrap(text, font, maxW) {
      ctx.font = font; var out = [], line = '';
      text.split(/\s+/).filter(Boolean).forEach(function (w) {
        var t = line ? line + ' ' + w : w;
        if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
      });
      if (line) out.push(line);
      return out;
    }
    function drawBg(sl, p, alpha, idx) {
      var im = loaded[sl.img], W = cv.width, H = cv.height;
      ctx.globalAlpha = alpha;
      if (!im) { ctx.fillStyle = opts().theme === 'kids' ? '#f3b562' : '#0e1628'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; return; }
      var z = 1.04 + 0.12 * (idx % 2 ? 1 - p : p);
      var s = Math.max(W / im.width, H / im.height) * z, w = im.width * s, h = im.height * s;
      var dx = (W - w) / 2 + (idx % 3 - 1) * (w - W) * 0.25 * (p - 0.5), dy = (H - h) / 2;
      ctx.drawImage(im, dx, dy, w, h);
      ctx.globalAlpha = 1;
    }
    function shade() {
      var W = cv.width, H = cv.height, g = ctx.createLinearGradient(0, 0, 0, H);
      if (opts().theme === 'kids') {
        g.addColorStop(0, 'rgba(255,170,60,.12)'); g.addColorStop(0.55, 'rgba(255,150,50,.08)'); g.addColorStop(1, 'rgba(120,50,0,.28)');
      } else {
        g.addColorStop(0, 'rgba(0,0,0,.45)'); g.addColorStop(0.3, 'rgba(0,0,0,.5)'); g.addColorStop(0.7, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,.7)');
      }
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    function txt(s, x, y, color, soft) {
      ctx.shadowColor = soft ? 'transparent' : 'rgba(0,0,0,.75)'; ctx.shadowBlur = soft ? 0 : 14; ctx.shadowOffsetY = soft ? 0 : 2;
      ctx.fillStyle = color; ctx.fillText(s, x, y);
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    }
    function rrect(x, y, w, h, r) {
      ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }
    function card(x, y, w, h, u) {
      ctx.shadowColor = 'rgba(80,30,0,.35)'; ctx.shadowBlur = 24 * u; ctx.shadowOffsetY = 6 * u;
      ctx.fillStyle = 'rgba(255,249,236,.95)'; rrect(x, y, w, h, 34 * u); ctx.fill();
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      ctx.strokeStyle = '#f4a340'; ctx.lineWidth = 5 * u; rrect(x + 9 * u, y + 9 * u, w - 18 * u, h - 18 * u, 26 * u); ctx.stroke();
    }
    function pill(s, cx, y, u, bg) {
      ctx.font = '700 ' + Math.round(30 * u) + 'px ' + ROUND;
      var w = ctx.measureText(s).width + 56 * u, h = 56 * u;
      ctx.fillStyle = bg; rrect(cx - w / 2, y - h / 2, w, h, h / 2); ctx.fill();
      ctx.textBaseline = 'middle'; txt(s, cx, y + 2 * u, '#ffffff', true); ctx.textBaseline = 'alphabetic';
    }
    function star(cx, cy, r, color) {
      ctx.fillStyle = color; ctx.beginPath();
      for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill();
    }
    function drawKids(sl, a, rise) {
      var W = cv.width, H = cv.height, u = W / 720, tall = H > W, maxW = W * 0.74;
      ctx.globalAlpha = a; ctx.direction = 'rtl'; ctx.textAlign = 'center';
      var BROWN = '#5a3410', ORANGE = '#e8711f';
      if (sl.kind === 'title') {
        var fs = 70, tl; for (; fs >= 44; fs -= 4) { tl = wrap(sl.text, '700 ' + Math.round(fs * u) + 'px ' + ROUND, maxW); if (tl.length <= 3) break; }
        var top = (sl.sub ? 62 : 40) * u, lh = fs * 1.25 * u, ch = top + tl.length * lh + 44 * u, cy = (tall ? H * 0.52 : H * 0.5) + rise * u, y = cy - ch / 2;
        card(W * 0.08, y, W * 0.84, ch, u);
        if (sl.sub) pill(sl.sub, W / 2, y, u, '#2a9d8f');
        ctx.font = '700 ' + Math.round(fs * u) + 'px ' + ROUND;
        tl.forEach(function (l, i) { txt(l, W / 2, y + top + fs * u * 0.95 + i * lh, ORANGE, true); });
        star(W * 0.16, y + 10 * u, 24 * u, '#ffc93c'); star(W * 0.86, y + ch - 6 * u, 18 * u, '#ffc93c');
      } else if (sl.kind === 'end') {
        ctx.font = '700 ' + Math.round(60 * u) + 'px ' + ROUND;
        var el = wrap(sl.text, ctx.font, maxW), sub = sl.sub ? wrap(sl.sub, '400 ' + Math.round(30 * u) + 'px ' + ROUND, maxW) : [];
        var h2 = el.length * 76 * u + sub.length * 42 * u + 90 * u, y2 = H / 2 - h2 / 2 + rise * u;
        card(W * 0.08, y2, W * 0.84, h2, u);
        ctx.font = '700 ' + Math.round(60 * u) + 'px ' + ROUND;
        el.forEach(function (l, i) { txt(l, W / 2, y2 + 82 * u + i * 76 * u, ORANGE, true); });
        ctx.font = '400 ' + Math.round(30 * u) + 'px ' + ROUND;
        sub.forEach(function (l, i) { txt(l, W / 2, y2 + 82 * u + el.length * 76 * u - 14 * u + i * 42 * u, BROWN, true); });
        star(W * 0.2, y2, 22 * u, '#ffc93c'); star(W * 0.8, y2, 22 * u, '#ffc93c'); star(W / 2, y2 + h2, 18 * u, '#ffc93c');
        ctx.font = '400 ' + Math.round(20 * u) + 'px ' + SANS; txt(cfg.credit || 'נוצר בחינם בכלי קודש', W / 2, H - 50 * u, 'rgba(255,255,255,.9)');
      } else {
        var f, lines, lh2, box = H * (tall ? 0.36 : 0.5);
        for (f = 54; f >= 30; f -= 2) { lh2 = f * 1.42 * u; lines = wrap(sl.text, '700 ' + Math.round(f * u) + 'px ' + ROUND, maxW); if (lines.length * lh2 <= box) break; }
        var hh = lines.length * lh2 + 64 * u, yy = (tall ? H * 0.95 - hh - 70 * u : H - hh - 34 * u) + rise * u;
        card(W * 0.08, yy, W * 0.84, hh, u);
        ctx.font = '700 ' + Math.round(f * u) + 'px ' + ROUND;
        lines.forEach(function (l, i) { txt(l, W / 2, yy + 32 * u + i * lh2 + lh2 * 0.5 + f * u * 0.35, BROWN, true); });
      }
      ctx.font = '600 ' + Math.round(20 * u) + 'px ' + SANS; ctx.textAlign = 'right';
      txt('בס"ד', W - 26 * u, 44 * u, 'rgba(255,255,255,.95)');
      ctx.globalAlpha = 1;
    }
    function drawText(sl, a, rise) {
      if (opts().theme === 'kids') return drawKids(sl, a, rise);
      var W = cv.width, H = cv.height, u = W / 720, gold = opts().look !== 'white' ? GOLD : '#ffffff';
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
        ctx.font = '400 ' + Math.round(20 * u) + 'px ' + SANS; txt(cfg.credit || 'נוצר בחינם בכלי קודש', W / 2, H - 50 * u, 'rgba(255,255,255,.75)');
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
    function frame(t) {
      var W = cv.width, H = cv.height, i = 0;
      while (i < slides.length - 1 && t >= slides[i + 1].start) i++;
      var sl = slides[i]; if (!sl) return;
      var local = t - sl.start, p = Math.min(1, (local + FADE) / (sl.dur + FADE));
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      if (i > 0 && local < FADE) {
        drawBg(slides[i - 1], 1, 1, i - 1);
        drawBg(sl, p, ease(local / FADE), i);
      } else drawBg(sl, p, 1, i);
      shade();
      // הטקסט נכנס מהר יחסית (0.1–0.65 שנ'), כדי שלא ייראה שהשקופית מאחרת אחרי התמונה
      var a = ease((local - 0.1) / 0.55), out = sl.dur - local;
      if (i < slides.length - 1 && out < 0.45) a *= ease(out / 0.45);
      if (i === slides.length - 1 && out < 0.8) a *= ease(out / 0.8);
      drawText(sl, a, 18 * (1 - ease((local - 0.1) / 0.55)));
      if (i === slides.length - 1 && out < 0.8) { ctx.fillStyle = 'rgba(0,0,0,' + (1 - out / 0.8) + ')'; ctx.fillRect(0, 0, W, H); }
    }

    // ---------- ניגון והקלטה ----------
    // ctl.paused: השעון עומד (הדף מוסתר בזמן הקלטה), וכשממשיכים – ממשיכים בדיוק מאותה שנייה
    function run(onFrame, ctl) {
      return new Promise(function (res) {
        var T = total(), st = performance.now(), stopT = null, finished = false, pauseAt = 0, lost = 0;
        function end(v) { if (finished) return; finished = true; stopT && stopT(); res(v); }
        stopT = ticker(function () {
          if (finished) return;
          if (!playing) return end(false);
          if (ctl && ctl.check) ctl.check();
          if (ctl && ctl.paused) { if (!pauseAt) pauseAt = performance.now(); return; }
          if (pauseAt) { lost += performance.now() - pauseAt; pauseAt = 0; }
          var t = (performance.now() - st - lost) / 1000;
          if (t >= T) { frame(T - 0.001); return end(true); }
          frame(t); onFrame && onFrame(t / T);
        });
      });
    }
    function stop() { if (playing && playing.stop) playing.stop(); playing = null; }
    function preview(withMusic) {
      size();
      return preload().then(function () {
        var a = withMusic ? audioCtx() : null, st = null;
        if (a) st = music(a, [a.destination], total(), opts().music);
        playing = { stop: function () { st && st(); a && a.close(); } };
        return run().then(function (v) { stop(); return v; });
      });
    }
    // מחזיר Promise עם { blob, ext }, או null אם הדפדפן לא יודע להקליט
    function record(withMusic, onProgress, onPause) {
      var m = mime();
      if (m === null || !cv.captureStream) return Promise.resolve(null);
      stop(); size();
      return preload().then(function () {
        return new Promise(function (res) {
          frame(0);
          // צילום ידני של כל פריים (captureStream(0) + requestFrame): כשהחלון לא מוצג, הצילום האוטומטי נעצר
          // והסרטון "נתקע" על שקופית ישנה. כך כל שקופית נכנסת בזמן שלה גם ברקע.
          var probe = cv.captureStream(0), vt = probe.getVideoTracks()[0], manual = !!(vt && vt.requestFrame);
          var stream = manual ? probe : cv.captureStream(30), a = null, st = null, d = null, ready = false;
          if (!manual) probe.getTracks().forEach(function (tr) { tr.stop(); });
          var grab = manual ? function () { vt.requestFrame(); } : function () {};
          grab();
          if (withMusic) {
            a = audioCtx();
            // היעד של הצליל מקבל "שקט" כבר מההתחלה (בלי זה הדפדפן קורס כשהמנגינה מתחילה אחרי שההקלטה כבר רצה)
            if (a) { d = a.createMediaStreamDestination(); try { var keep = a.createConstantSource(); keep.offset.value = 0; keep.connect(d); keep.start(); } catch (e) {} d.stream.getAudioTracks().forEach(function (tr) { stream.addTrack(tr); }); }
          }
          var rec = new MediaRecorder(stream, m ? { mimeType: m, videoBitsPerSecond: 2500000 } : { videoBitsPerSecond: 2500000 }), parts = [];
          rec.ondataavailable = function (e) { ready = true; if (e.data && e.data.size) parts.push(e.data); };
          rec.onstop = function () {
            var type = (rec.mimeType || m || 'video/webm').split(';')[0];
            a && a.close();
            res({ blob: new Blob(parts, { type: type }), ext: type.indexOf('mp4') > -1 ? 'mp4' : 'webm' });
          };
          // כשהדף מוסתר (עוברים לאפליקציה אחרת, המסך כבה) הדפדפן מפסיק לצלם את הקנבס, והסרטון היה נתקע על שקופית
          // ואז מאחר. לכן עוצרים הכול (הקלטה, מוזיקה ושעון) וממשיכים מאותה נקודה כשחוזרים לדף.
          // גם חלון שמוסתר מאחורי חלון אחר נשאר "גלוי", אבל לא מצייר. הסימן: requestAnimationFrame לא רץ יותר מ-0.4 שנ'.
          var lastPaint = performance.now(), stalled = false;
          var ctl = { paused: false, on: true, check: function () {
            if (!stalled && performance.now() - lastPaint > 400) { stalled = true; vis(); }
          } };
          var smooth = 0; // ממשיכים רק אחרי כמה ציורים רצופים ומהירים, לא אחרי ציור בודד של חלון מוסתר
          (function paint() {
            if (!ctl.on) return;
            var n = performance.now(); smooth = n - lastPaint < 250 ? smooth + 1 : 0; lastPaint = n;
            if (stalled && smooth >= 3) { stalled = false; vis(); }
            requestAnimationFrame(paint);
          })();
          function vis() {
            var hide = document.visibilityState === 'hidden' || stalled;
            if (hide === ctl.paused || rec.state === 'inactive') return;
            ctl.paused = hide;
            try { if (hide) { rec.pause(); a && a.suspend(); } else { a && a.resume(); rec.resume(); grab(); } } catch (e) {}
            onPause && onPause(hide);
          }
          document.addEventListener('visibilitychange', vis);
          playing = { stop: function () { st && st(); } };
          rec.start(250); vis();
          // המקליט מתחיל לקבל תמונות רק אחרי רגע (בחלק מהמכשירים כמה שניות), ומה שמצויר לפני כן לא נכנס לסרטון.
          // לכן מחכים לחלק הראשון שהוא מוסר (dataavailable) עם מסך שחור, ורק אז מתחילים את המנגינה ואת השקופיות.
          var began = performance.now();
          (function wait() {
            if (!playing) return;
            if (!ready || performance.now() - began < 300) { frame(0); grab(); return setTimeout(wait, 30); }
            if (d && !st) { st = music(a, [d], total(), opts().music, 0.5); }
            if (st && a.currentTime < st.t0) { frame(0); grab(); return setTimeout(wait, 20); }
            run(function (p) { grab(); onProgress && onProgress(p); }, ctl).then(function () {
              document.removeEventListener('visibilitychange', vis); ctl.on = false;
              grab();
              setTimeout(function () { playing = null; rec.stop(); stream.getTracks().forEach(function (tr) { tr.stop(); }); }, 250);
            });
          })();
        });
      });
    }
    function nextImg(sl) { var k = ALL.indexOf(sl.img); sl.img = ALL[(k + 1) % ALL.length]; sl.fixed = true; return img(sl.img); }
    function shuffle() { seed++; slides.forEach(function (s) { s.fixed = false; }); }

    return {
      setSlides: setSlides, slides: function () { return slides; }, total: total, preload: preload, size: size, frame: frame,
      preview: preview, record: record, stop: stop, isPlaying: function () { return !!playing; }, nextImg: nextImg, shuffle: shuffle,
      split: split
    };
  }

  function credits(ul, filter) {
    if (!ul) return;
    fetch('/assets/video/credits.json').then(function (r) { return r.json(); }).then(function (list) {
      list.forEach(function (c) {
        if (filter && !filter(c)) return;
        var li = document.createElement('li'), a = document.createElement('a');
        a.href = c.page; a.target = '_blank'; a.rel = 'noopener'; a.textContent = c.title; a.dir = 'ltr';
        li.appendChild(a); li.appendChild(document.createTextNode(' – ' + (c.artist || 'צלם לא ידוע') + ' (' + c.lic + ')'));
        ul.appendChild(li);
      });
    }).catch(function () {});
  }
  function fontsReady(extra) {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var l = ['700 40px "Frank Ruhl Libre"', '600 40px "Assistant"', '400 40px "Assistant"'].concat(extra || []);
    return Promise.all(l.map(function (f) { return document.fonts.load(f, 'אבג'); })).catch(function () {});
  }

  // סט התמונות התורני: נופי ארץ ישראל, אור, ספרים. מילות מפתח שמובילות לכל נושא.
  var TORAH = {
    imgs: { kotel: 3, jeru: 2, light: 3, mount: 4, desert: 4, sea: 4, stars: 2, sunset: 4, wheat: 3, olive: 2, path: 2, torah: 3, books: 1, candles: 2, flowers: 2 },
    keys: {
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
    },
    order: ['light', 'mount', 'sunset', 'path', 'wheat', 'sea', 'olive', 'stars', 'flowers', 'desert'],
    endCats: ['sunset', 'candles', 'light']
  };
  // סט הילדים: חיות, בית, טבע, שבת וחגים. כל התמונות CC0 מוויקישיתוף, בלי פנים של ילדים.
  var KIDS = {
    imgs: { lamb: 3, cat: 3, bird: 3, butterfly: 1, duck: 2, apples: 2, challah: 2, beach: 2, garden: 2, house: 2, kite: 3, moon: 3, rainbow: 3, teddy: 2, flowers: 2, wheat: 3, candles: 2, light: 3, sunset: 2, stars: 2 },
    keys: {
      lamb: ['כבש', 'כבשה', 'כבשים', 'כבשונת', 'טלה', 'עדר', 'רועה', 'צאן', 'מרעה'],
      cat: ['חתול', 'חתולה', 'חתלתול', 'חתלתולה', 'מיאו', 'גור'],
      bird: ['ציפור', 'ציפורים', 'ציפורה', 'צפור', 'ציוץ', 'קן', 'כנף', 'כנפיים', 'עף', 'עפה', 'לעוף', 'יונה'],
      butterfly: ['פרפר', 'פרפרים', 'פרח', 'פרחים'],
      duck: ['ברווז', 'ברווזה', 'ברווזון', 'ברווזונים', 'אגם', 'בריכה'],
      apples: ['תפוח', 'תפוחים', 'דבש', 'ראש השנה', 'סל', 'שוק', 'קנה', 'קנתה', 'קניות', 'מתוק'],
      challah: ['חלה', 'חלות', 'שבת', 'קידוש', 'סעודה', 'אפה', 'אפתה', 'לאפות', 'בצק', 'מאפה', 'שולחן', 'אורחים', 'אורח'],
      beach: ['ים', 'חוף', 'גלים', 'חול', 'מים', 'דג', 'דגים'],
      garden: ['עץ', 'עצים', 'גינה', 'גן', 'פרי', 'פירות', 'שתל', 'שתילה', 'לשתול', 'ט"ו בשבט', 'שורש'],
      house: ['בית', 'הבית', 'דלת', 'חלון', 'שכן', 'שכנים', 'שכנה', 'משפחה', 'אבא', 'אמא', 'סבתא', 'סבא', 'חדר'],
      kite: ['רוח', 'עפיפון', 'משחק', 'שיחק', 'שיחקה', 'לשחק', 'חברים', 'חבר', 'חברה', 'חצר', 'רץ', 'רצה', 'הפסקה', 'גן הילדים', 'כיתה'],
      moon: ['ירח', 'לבנה', 'לילה', 'לילה טוב', 'חושך', 'חלום', 'לישון', 'שינה', 'מיטה', 'שמע'],
      rainbow: ['קשת', 'גשם', 'ענן', 'עננים', 'נח', 'תיבה', 'מבול', 'הבטחה', 'צבעים'],
      teddy: ['דובי', 'בובה', 'צעצוע', 'צעצועים', 'מתנה', 'סליחה', 'עצוב', 'עצובה', 'בכה', 'בכתה'],
      flowers: ['אביב', 'פסח', 'פריחה', 'שמחה', 'שמח', 'חיוך', 'חייך', 'חייכה', 'תודה'],
      wheat: ['שדה', 'לחם', 'חיטה', 'קציר', 'שבועות', 'ביכורים', 'פרנסה'],
      candles: ['נר', 'נרות', 'הדליק', 'הדליקה', 'להדליק', 'חנוכה', 'חנוכייה', 'חנוכיה', 'אור'],
      light: ['ה\'', 'השם', 'הקב"ה', 'הקב״ה', 'תפילה', 'התפלל', 'התפללה', 'ברכה', 'בירך', 'בירכה', 'נס', 'אמונה'],
      sunset: ['ערב', 'שקיעה', 'שבת שלום', 'מנוחה', 'סוף'],
      stars: ['כוכב', 'כוכבים', 'שמים', 'שמיים', 'אברהם']
    },
    order: ['garden', 'house', 'rainbow', 'lamb', 'kite', 'flowers', 'bird', 'beach', 'cat', 'duck'],
    endCats: ['rainbow', 'sunset', 'moon']
  };

  window.KVideo = { create: create, split: split, mime: mime, credits: credits, fontsReady: fontsReady, TORAH: TORAH, KIDS: KIDS };
})();
