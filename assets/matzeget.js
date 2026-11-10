// מצגת ואלבום לאירוע (/kelim/tochen/matzeget/): תמונות מהטלפון → סרטון (canvas + MediaRecorder + מנגינה ב-WebAudio)
// ואלבום להדפסה (A4 או ריבוע) + קובץ HTML אחד לצפייה בטלפון. התמונות נשארות בדפדפן: אין שום שליחה לשרת.
// המנוע של הסרטון מבוסס על /assets/video-kodesh.js (טיימר גיבוי כשהחלון מוסתר, MP4 כשאפשר).
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('mz-form'), cv = $('mz-canvas');
  if (!form || !cv) return;
  var ctx = cv.getContext('2d');
  var SERIF = '"Frank Ruhl Libre", "David Libre", David, serif', SANS = '"Assistant", Arial, sans-serif';
  var SIZES = { wide: [1280, 720], story: [720, 1280], square: [720, 720] };
  var MAX_PHOTOS = 60, MAX_DIM = 1600;

  // ---------- האירועים ----------
  // acc = צבע הדגשה בסרטון; al = צבעי האלבום (רקע, דיו, הדגשה); mood = המנגינה
  var EV = {
    chatuna: { top: 'שמחת החתונה', names: 'נועה ואיתי', end: 'מזל טוב! שתזכו לבנות בית נאמן בישראל', sub: 'תודה שבאתם לשמוח איתנו', mood: 'joy', acc: '#e6c57e', al: ['#fbf8f1', '#2a2620', '#a8843a'] },
    bar: { top: 'בר המצווה של', names: 'יונתן', end: 'מזל טוב!', sub: 'שתזכה לגדול לתורה ולמעשים טובים', mood: 'joy', acc: '#e6c57e', al: ['#f5f7fb', '#1d2a44', '#b08d3c'] },
    bat: { top: 'בת המצווה של', names: 'מאיה', end: 'מזל טוב!', sub: 'שתזכי לגדול בשמחה ולמעשים טובים', mood: 'joy', acc: '#f0c4cf', al: ['#fcf5f5', '#3a2a30', '#b5677d'] },
    brit: { top: 'ברית המילה של', names: 'אריאל', end: 'כשם שנכנס לברית, כן ייכנס לתורה ולחופה ולמעשים טובים', sub: 'מזל טוב!', mood: 'joy', acc: '#bcd9ef', al: ['#f4f8fb', '#1f2f3d', '#3c6e91'] },
    huledet: { top: 'יום ההולדת של', names: 'סבתא רחל', end: 'מזל טוב! עד מאה ועשרים', sub: 'באהבה, מכל המשפחה', mood: 'joy', acc: '#f3c98b', al: ['#fff8ec', '#33261a', '#c9741f'] },
    azkara: { top: 'לזכרו', topF: 'לזכרה', names: 'שם ושם משפחה', end: 'יהי זכרו ברוך', endF: 'יהי זכרה ברוך', sub: 'תהא נשמתו צרורה בצרור החיים', subF: 'תהא נשמתה צרורה בצרור החיים', mood: 'calm', acc: '#d9d4c7', al: ['#f4f3f0', '#2b2d31', '#6b6f78'] },
    other: { top: 'שמחה במשפחה', names: 'משפחת כהן', end: 'מזל טוב!', sub: 'תודה שבאתם', mood: 'joy', acc: '#e6c57e', al: ['#fbf8f1', '#2a2620', '#a8843a'] }
  };
  var KEEP = ['ev', 'gen', 'names', 'date', 'top', 'end', 'endsub', 'size', 'pace', 'music', 'move', 'asize', 'per', 'fit', 'look'];

  var photos = [], uid = 0, slides = [], playing = null, recording = false, result = null;

  function el(n) { return document.querySelector('[name=' + n + ']'); }
  function val(n) { var e = el(n); if (!e) return ''; return e.type === 'checkbox' ? (e.checked ? '1' : '') : e.value.trim(); }
  function ev() { return EV[val('ev')] || EV.other; }
  function fem() { return val('ev') === 'azkara' && val('gen') === 'f'; }
  function txt(k) { var e = ev(); return fem() && e[k + 'F'] ? e[k + 'F'] : e[k]; }
  function info() {
    return { top: val('top'), names: val('names'), date: val('date'), end: val('end') || txt('end'), sub: val('endsub'), bsd: !!val('bsd') };
  }

  // ממלאים את השורות האוטומטיות לפי האירוע, כל עוד המשתמש לא שינה אותן
  function autofill(force) {
    var map = { top: txt('top'), end: txt('end'), endsub: txt('sub') };
    Object.keys(map).forEach(function (k) {
      var e = el(k);
      if (force || e.getAttribute('data-auto') === '1' || !e.value) { e.value = map[k]; e.setAttribute('data-auto', '1'); }
    });
    el('names').placeholder = ev().names;
    $('mz-gen-f').hidden = val('ev') !== 'azkara';
  }
  ['top', 'end', 'endsub'].forEach(function (k) { el(k).addEventListener('input', function () { this.setAttribute('data-auto', '0'); }); });

  // ---------- טעינת תמונות ----------
  function loadImg(src) {
    return new Promise(function (res) {
      var im = new Image(); im.decoding = 'async';
      im.onload = function () { res(im); }; im.onerror = function () { res(null); };
      im.src = src;
    });
  }
  // מקטינים כל תמונה ל-1600 פיקסלים לכל היותר (חוסך זיכרון בטלפון), ומכינים רקע מטושטש קטן לסרטון
  function addFile(src, cap) {
    return loadImg(src).then(function (im) {
      if (!im) return null;
      var s = Math.min(1, MAX_DIM / Math.max(im.naturalWidth, im.naturalHeight));
      var w = Math.round(im.naturalWidth * s), h = Math.round(im.naturalHeight * s);
      var c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(im, 0, 0, w, h);
      var b = document.createElement('canvas'), bw = 40, bh = Math.max(1, Math.round(40 * h / w));
      b.width = bw; b.height = bh; b.getContext('2d').drawImage(c, 0, 0, bw, bh);
      return new Promise(function (res) {
        c.toBlob(function (blob) {
          var url = URL.createObjectURL(blob);
          loadImg(url).then(function (small) {
            res({ id: ++uid, url: url, img: small || c, blur: b, w: w, h: h, cap: cap || '' });
          });
        }, 'image/jpeg', 0.88);
      });
    });
  }
  function addMany(list) {
    var room = MAX_PHOTOS - photos.length;
    if (room <= 0) { $('mz-count').textContent = 'אפשר עד ' + MAX_PHOTOS + ' תמונות.'; return Promise.resolve(); }
    list = list.slice(0, room);
    $('mz-count').textContent = 'טוען ' + list.length + ' תמונות…';
    var chain = Promise.resolve();
    list.forEach(function (it) {
      chain = chain.then(function () { return addFile(it.src, it.cap); }).then(function (p) {
        if (it.revoke) URL.revokeObjectURL(it.src);
        if (p) photos.push(p);
      });
    });
    return chain.then(function () { renderList(); refresh(); used('add', { n: photos.length }); });
  }
  $('mz-files').addEventListener('change', function () {
    var fs = Array.prototype.slice.call(this.files || []).filter(function (f) { return /^image\//.test(f.type) || /\.(jpe?g|png|webp|heic|heif|gif)$/i.test(f.name); });
    fs.sort(function (a, b) { return (a.lastModified || 0) - (b.lastModified || 0); }); // לפי סדר הצילום
    addMany(fs.map(function (f) { return { src: URL.createObjectURL(f), revoke: true }; }));
    this.value = '';
  });
  var DEMO = [['flowers-1', 'הפרחים בכניסה'], ['sunset-1', 'שקיעה לפני הטקס'], ['jeru-1', 'ירושלים'], ['sea-2', ''], ['wheat-1', 'השדות ליד הבית'], ['olive-1', 'עץ הזית של סבא'], ['candles-1', ''], ['stars-1', 'לילה של שמחה'], ['mount-2', ''], ['flowers-2', 'עד מאה ועשרים']];
  $('mz-demo').addEventListener('click', function () {
    if (!val('names')) el('names').value = ev().names;
    addMany(DEMO.map(function (d) { return { src: '/assets/video/' + d[0] + '.jpg', cap: d[1] }; }));
    used('demo');
  });
  $('mz-clear').addEventListener('click', function () {
    photos.forEach(function (p) { URL.revokeObjectURL(p.url); });
    photos = []; renderList(); refresh();
  });

  // ---------- רשימת התמונות: גרירה, חיצים, כיתוב ----------
  var sortable = null;
  function move(i, d) {
    var j = i + d; if (j < 0 || j >= photos.length) return;
    var t = photos[i]; photos[i] = photos[j]; photos[j] = t; renderList(); refresh();
  }
  function renderList() {
    var ol = $('mz-list'); ol.innerHTML = '';
    photos.forEach(function (p, i) {
      var li = document.createElement('li'); li.setAttribute('data-id', p.id);
      var im = document.createElement('img'); im.src = p.url; im.alt = 'תמונה ' + (i + 1); im.draggable = false;
      var n = document.createElement('span'); n.className = 'n' + (i === 0 ? ' cover' : ''); n.textContent = i === 0 ? 'שער' : String(i + 1);
      var cap = document.createElement('input'); cap.type = 'text'; cap.maxLength = 60; cap.placeholder = 'כיתוב (לא חובה)'; cap.value = p.cap;
      cap.setAttribute('aria-label', 'כיתוב לתמונה ' + (i + 1));
      cap.addEventListener('input', function () { p.cap = cap.value; refreshSoon(); });
      var ctl = document.createElement('div'); ctl.className = 'ctl';
      [['→', -1, 'להקדים'], ['✕', 0, 'להסיר'], ['←', 1, 'לאחר']].forEach(function (b) {
        var bt = document.createElement('button'); bt.type = 'button'; bt.textContent = b[0]; bt.setAttribute('aria-label', b[2] + ' את תמונה ' + (i + 1));
        bt.addEventListener('click', function () {
          if (b[1]) move(i, b[1]);
          else { URL.revokeObjectURL(p.url); photos.splice(i, 1); renderList(); refresh(); }
        });
        ctl.appendChild(bt);
      });
      li.appendChild(im); li.appendChild(n); li.appendChild(cap); li.appendChild(ctl); ol.appendChild(li);
    });
    $('mz-drag').hidden = photos.length < 2;
    $('mz-clear').hidden = !photos.length;
    $('mz-count').textContent = photos.length ? photos.length + ' תמונות' + (photos.length >= MAX_PHOTOS ? ' (המקסימום)' : '') : 'עד 60 תמונות. אפשר לבחור כמה בבת אחת מהגלריה.';
    if (window.Sortable && !sortable) {
      sortable = Sortable.create(ol, {
        animation: 150, delay: 180, delayOnTouchOnly: true, filter: 'input,button', preventOnFilter: false,
        onEnd: function () {
          var ids = Array.prototype.map.call(ol.children, function (li) { return +li.getAttribute('data-id'); });
          photos.sort(function (a, b) { return ids.indexOf(a.id) - ids.indexOf(b.id); });
          renderList(); refresh(); used('reorder');
        }
      });
    }
  }

  // ---------- הסרטון: רצף השקופיות ----------
  function build() {
    var pace = parseFloat(val('pace')) || 5.5, t = 0, I = info();
    slides = [{ kind: 'title', p: photos[0], dur: 5 }];
    photos.forEach(function (p) { slides.push({ kind: 'photo', p: p, dur: pace }); });
    slides.push({ kind: 'end', p: photos[photos.length - 1], dur: 5.5 });
    slides.forEach(function (s) { s.start = t; t += s.dur; });
    var secs = Math.round(total()), m = Math.floor(secs / 60), sc = secs % 60;
    $('mz-info').textContent = photos.length ? photos.length + ' תמונות · ' + (m ? m + ':' + (sc < 10 ? '0' : '') + sc + ' דקות' : secs + ' שניות') + (I.names ? '' : '') : 'מוסיפים תמונות, ורואים כאן את הסרטון.';
  }
  function total() { var l = slides[slides.length - 1]; return l ? l.start + l.dur : 0; }
  function ease(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }

  function cover(src, w0, h0, W, H, z, dx, dy) {
    var s = Math.max(W / w0, H / h0) * z, w = w0 * s, h = h0 * s;
    ctx.drawImage(src, (W - w) / 2 + dx * (w - W) / 2, (H - h) / 2 + dy * (h - H) / 2, w, h);
  }
  function blurBg(p, W, H, dim) {
    if (!p) { ctx.fillStyle = '#10141c'; ctx.fillRect(0, 0, W, H); return; }
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    cover(p.blur, p.blur.width, p.blur.height, W, H, 1.15, 0, 0);
    ctx.fillStyle = 'rgba(0,0,0,' + dim + ')'; ctx.fillRect(0, 0, W, H);
  }
  // תמונה שלמה (בלי חיתוך) על רקע מטושטש של עצמה, עם זום איטי
  function drawPhoto(sl, prog, idx) {
    var W = cv.width, H = cv.height, p = sl.p;
    blurBg(p, W, H, 0.35);
    var zoom = val('move') === 'still' ? 1 : 1 + 0.07 * (idx % 2 ? 1 - prog : prog);
    var capH = sl.p.cap ? H * 0.13 : 0, pad = Math.min(W, H) * 0.045;
    var bw = W - pad * 2, bh = H - pad * 2 - capH;
    var s = Math.min(bw / p.w, bh / p.h), w = p.w * s, h = p.h * s;
    // תמונה שכמעט ממלאת את המסך (אותו כיוון) – ממלאים לגמרי, נראה טוב יותר
    var fill = Math.min(w / bw, h / bh) > 0.82 && !capH;
    ctx.save();
    if (fill) {
      ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
      cover(p.img, p.w, p.h, W, H, zoom, (idx % 3 - 1) * 0.5 * (prog - 0.5), 0);
    } else {
      var x = (W - w) / 2, y = pad + (bh - h) / 2;
      ctx.translate(W / 2, y + h / 2); ctx.scale(zoom * 0.97 + 0.03, zoom * 0.97 + 0.03); ctx.translate(-W / 2, -(y + h / 2));
      ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 8;
      ctx.drawImage(p.img, x, y, w, h);
    }
    ctx.restore();
  }
  function shadowText(s, x, y, color) {
    ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 2;
    ctx.fillStyle = color; ctx.fillText(s, x, y);
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  }
  function wrap(text, font, maxW) {
    ctx.font = font; var out = [], line = '';
    String(text || '').split(/\s+/).filter(Boolean).forEach(function (w) {
      var t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
    });
    if (line) out.push(line);
    return out;
  }
  function drawText(sl, a, rise) {
    var W = cv.width, H = cv.height, u = Math.min(W, H) / 720, I = info(), acc = ev().acc, maxW = W * 0.84;
    ctx.globalAlpha = a; ctx.direction = 'rtl'; ctx.textAlign = 'center';
    var cy = H / 2 + rise * u;
    if (sl.kind === 'title') {
      var nf = '700 ' + Math.round(84 * u) + 'px ' + SERIF, nl = I.names ? wrap(I.names, nf, maxW) : [], lh = 100 * u;
      var y = cy - (nl.length - 1) * lh / 2;
      if (I.top) { ctx.font = '600 ' + Math.round(36 * u) + 'px ' + SANS; shadowText(I.top, W / 2, y - 92 * u, acc); }
      ctx.font = nf; nl.forEach(function (l, i) { shadowText(l, W / 2, y + i * lh, '#ffffff'); });
      var ly = y + Math.max(0, nl.length - 1) * lh + 42 * u;
      ctx.fillStyle = acc; ctx.fillRect(W / 2 - 70 * u, ly, 140 * u, 3 * u);
      if (I.date) { ctx.font = '400 ' + Math.round(32 * u) + 'px ' + SANS; shadowText(I.date, W / 2, ly + 56 * u, '#ffffff'); }
    } else if (sl.kind === 'end') {
      var ef = '700 ' + Math.round(54 * u) + 'px ' + SERIF, el2 = wrap(I.end, ef, maxW), elh = 70 * u;
      var y2 = cy - (el2.length - 1) * elh / 2 - (I.sub ? 24 * u : 0);
      ctx.font = ef; el2.forEach(function (l, i) { shadowText(l, W / 2, y2 + i * elh, acc); });
      if (I.sub) { ctx.font = '400 ' + Math.round(32 * u) + 'px ' + SANS; shadowText(I.sub, W / 2, y2 + (el2.length - 1) * elh + 70 * u, '#ffffff'); }
      ctx.font = '400 ' + Math.round(19 * u) + 'px ' + SANS; shadowText('נוצר בחינם · הכלים של גילעד רחמים', W / 2, H - 34 * u, 'rgba(255,255,255,.7)');
    } else if (sl.p.cap) {
      ctx.font = '600 ' + Math.round(38 * u) + 'px ' + SANS;
      var cl = wrap(sl.p.cap, ctx.font, maxW).slice(0, 2);
      cl.forEach(function (l, i) { shadowText(l, W / 2, H - H * 0.13 / 2 - (cl.length - 1) * 22 * u + i * 44 * u + 12 * u, '#ffffff'); });
    }
    if (I.bsd) { ctx.font = '600 ' + Math.round(20 * u) + 'px ' + SANS; ctx.textAlign = 'right'; shadowText('בס"ד', W - 24 * u, 40 * u, 'rgba(255,255,255,.85)'); }
    ctx.globalAlpha = 1;
  }
  function drawSlide(sl, prog, idx, alpha) {
    var W = cv.width, H = cv.height;
    ctx.globalAlpha = alpha;
    if (sl.kind === 'photo') drawPhoto(sl, prog, idx);
    else {
      blurBg(sl.p, W, H, 0.2);
      if (sl.p) {
        var z = 1.03 + 0.06 * prog;
        ctx.save(); ctx.globalAlpha = alpha * 0.55; cover(sl.p.img, sl.p.w, sl.p.h, W, H, z, 0, 0); ctx.restore();
        ctx.globalAlpha = alpha;
      }
      var g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, 'rgba(0,0,0,.45)'); g.addColorStop(0.5, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,.7)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    ctx.globalAlpha = 1;
  }
  var FADE = 1.1;
  function frame(t) {
    var W = cv.width, H = cv.height, i = 0;
    while (i < slides.length - 1 && t >= slides[i + 1].start) i++;
    var sl = slides[i]; if (!sl) return;
    var local = t - sl.start, p = Math.min(1, (local + FADE) / (sl.dur + FADE));
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    if (i > 0 && local < FADE) {
      var pr = slides[i - 1];
      drawSlide(pr, 1, i - 1, 1);
      drawSlide(sl, p, i, ease(local / FADE));
    } else drawSlide(sl, p, i, 1);
    var a = ease((local - 0.3) / 0.8), out = sl.dur - local;
    if (i < slides.length - 1 && out < 0.5) a *= ease(out / 0.5);
    if (i === 0 && local < 0.6) { ctx.fillStyle = 'rgba(0,0,0,' + (1 - local / 0.6) + ')'; ctx.fillRect(0, 0, W, H); }
    drawText(sl, a, sl.kind === 'photo' ? 0 : 18 * (1 - ease((local - 0.3) / 0.8)));
    if (i === slides.length - 1 && out < 1) { ctx.fillStyle = 'rgba(0,0,0,' + (1 - out) + ')'; ctx.fillRect(0, 0, W, H); }
  }
  function placeholder() {
    var W = cv.width, H = cv.height, u = Math.min(W, H) / 720;
    ctx.fillStyle = '#10141c'; ctx.fillRect(0, 0, W, H);
    ctx.direction = 'rtl'; ctx.textAlign = 'center'; ctx.font = '600 ' + Math.round(34 * u) + 'px ' + SANS;
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillText('מוסיפים תמונות, ורואים כאן את המצגת', W / 2, H / 2);
  }

  // ---------- מנגינה (WebAudio, נוצרת כאן) ----------
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  var MOODS = {
    // שמחה: D–A–Bm–G, ארפג'ו של פעמונים ובס רך
    joy: { ch: [[50, 54, 57, 62], [45, 49, 52, 57], [47, 50, 54, 59], [43, 47, 50, 55]], bar: 2.4, arp: [0, 1, 2, 3, 2, 1], step: 0.4, pad: 0.04, bell: 0.055, lp: 2600, bass: true },
    // שקטה: Am–F–C–G לאט, בלי פעמונים מהירים
    calm: { ch: [[45, 52, 57, 60], [41, 48, 53, 57], [48, 52, 55, 60], [43, 50, 55, 59]], bar: 5, arp: [1, 2, 3, 2], step: 1.25, pad: 0.055, bell: 0.035, lp: 1300, bass: false }
  };
  function mood() { var m = val('music'); return m === 'auto' ? ev().mood : m; }
  function music(ac, dest, dur, mo, lead) {
    var M = MOODS[mo] || MOODS.joy, t0 = ac.currentTime + (lead || 0.05), master = ac.createGain(), lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = M.lp;
    master.gain.setValueAtTime(0, t0); master.gain.linearRampToValueAtTime(0.7, t0 + 2);
    master.gain.setValueAtTime(0.7, t0 + Math.max(2.1, dur - 3)); master.gain.linearRampToValueAtTime(0, t0 + dur);
    lp.connect(master); dest.forEach(function (d) { master.connect(d); });
    var dl = ac.createDelay(), fb = ac.createGain(); dl.delayTime.value = 0.36; fb.gain.value = 0.3;
    dl.connect(fb); fb.connect(dl); dl.connect(lp);
    var nodes = [];
    function note(m, t, len, type, peak, att, echo) {
      if (t > t0 + dur - 0.3) return;
      var o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.value = hz(m);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + att);
      if (att < 0.1) g.gain.exponentialRampToValueAtTime(0.0008, t + len); else g.gain.linearRampToValueAtTime(0, t + len);
      o.connect(g); g.connect(lp); if (echo) g.connect(dl); o.start(t); o.stop(t + len + 0.05); nodes.push(o);
    }
    for (var b = 0, t = t0; t < t0 + dur; b++, t += M.bar) {
      var ch = M.ch[b % M.ch.length];
      ch.forEach(function (m) { note(m, t, M.bar * 1.15, 'sine', M.pad, M.bar * 0.3); note(m + 12, t, M.bar * 1.1, 'triangle', M.pad * 0.35, M.bar * 0.35); });
      if (M.bass) { note(ch[0] - 12, t, M.bar * 0.5, 'sine', 0.09, 0.02); note(ch[0] - 12, t + M.bar / 2, M.bar * 0.45, 'sine', 0.06, 0.02); }
      for (var k = 0, tt = t + 0.02; tt < t + M.bar - 0.05; k++, tt += M.step) note(ch[M.arp[k % M.arp.length]] + 12, tt, 1.4, 'sine', M.bell, 0.015, true);
    }
    var stop = function () { nodes.forEach(function (o) { try { o.stop(); } catch (e) {} }); try { master.disconnect(); } catch (e) {} };
    stop.t0 = t0;
    return stop;
  }

  // ---------- ניגון והקלטה ----------
  function size() { var s = SIZES[val('size')] || SIZES.wide; if (cv.width !== s[0] || cv.height !== s[1]) { cv.width = s[0]; cv.height = s[1]; } }
  function run(onFrame, clock) {
    return new Promise(function (res) {
      var T = total(), st = performance.now();
      function tick() {
        if (!playing) return res(false);
        var t = clock ? clock() : (performance.now() - st) / 1000;
        if (t >= T) { frame(T - 0.001); return res(true); }
        frame(t); onFrame && onFrame(t / T);
        // requestAnimationFrame נעצר כשהחלון מוסתר; לכן גם טיימר גיבוי, ומה שמגיע ראשון מצייר
        var done = false, go = function () { if (!done) { done = true; tick(); } };
        requestAnimationFrame(go); setTimeout(go, 40);
      }
      tick();
    });
  }
  function stopAll() { if (playing && playing.stop) playing.stop(); playing = null; }
  function newAC() { var A = window.AudioContext || window.webkitAudioContext; return A ? new A() : null; }
  function need() {
    if (photos.length) return true;
    $('mz-info').textContent = 'קודם מוסיפים תמונות (או "לנסות עם תמונות לדוגמה").';
    return false;
  }

  $('mz-play').addEventListener('click', function () {
    var b = this;
    if (playing) { stopAll(); b.textContent = '▶ לצפות לפני'; return; }
    if (recording || !need()) return;
    build(); size();
    var a = mood() !== 'none' ? newAC() : null, st = null;
    if (a) st = music(a, [a.destination], total(), mood());
    playing = { stop: function () { st && st(); a && a.close(); } };
    b.textContent = '■ לעצור';
    run().then(function () { stopAll(); b.textContent = '▶ לצפות לפני'; });
    used('preview');
  });

  function mime() {
    var list = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1,opus', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    if (!window.MediaRecorder) return null;
    for (var i = 0; i < list.length; i++) if (MediaRecorder.isTypeSupported(list[i])) return list[i];
    return '';
  }
  $('mz-make').addEventListener('click', function () {
    if (recording || !need()) return;
    var m = mime();
    if (m === null || !cv.captureStream) { $('mz-info').textContent = 'הדפדפן הזה לא יודע ליצור סרטון. נסו בכרום, בטלפון אנדרואיד או במחשב.'; return; }
    stopAll(); build(); size();
    var b = this, pg = $('mz-prog');
    recording = true; b.disabled = true; b.textContent = 'יוצר סרטון…';
    $('mz-result').hidden = true; pg.hidden = false; pg.value = 0;
    // הכנה לפני ההקלטה: מפענחים ומציירים כל תמונה פעם אחת, כדי שהציור הראשון לא יתקע את הסרטון בהתחלה
    var warm = Promise.all(photos.map(function (p) { return p.img.decode ? p.img.decode().catch(function () {}) : null; })).then(function () {
      slides.forEach(function (sl) { frame(sl.start + sl.dur / 2); });
      frame(0);
    });
    warm.then(function () {
      var stream = cv.captureStream(30), a = null, st = null, d = null, ready = false;
      if (mood() !== 'none') {
        a = newAC();
        if (a) { d = a.createMediaStreamDestination(); try { var keep = a.createConstantSource(); keep.offset.value = 0; keep.connect(d); keep.start(); } catch (e) {} d.stream.getAudioTracks().forEach(function (tr) { stream.addTrack(tr); }); }
      }
      var bits = cv.width * cv.height > 800000 ? 3500000 : 2500000;
      var rec = new MediaRecorder(stream, m ? { mimeType: m, videoBitsPerSecond: bits } : { videoBitsPerSecond: bits }), parts = [];
      rec.ondataavailable = function (e) { ready = true; if (window.__mzDebug) window.__mzDebug.push([Math.round(performance.now()), e.data ? e.data.size : 0]); if (e.data && e.data.size) parts.push(e.data); };
      rec.onstop = function () {
        var type = (rec.mimeType || m || 'video/webm').split(';')[0];
        result = { blob: new Blob(parts, { type: type }), ext: type.indexOf('mp4') > -1 ? 'mp4' : 'webm' };
        window.__mzResult = result; // לבדיקות
        var v = $('mz-video'); v.src = URL.createObjectURL(result.blob);
        $('mz-result').hidden = false; pg.hidden = true;
        $('mz-fmt').textContent = result.ext === 'mp4' ? 'הסרטון בפורמט MP4, מתאים לווטסאפ, ליוטיוב ולמסך באולם.' : 'הסרטון נשמר בפורמט WebM. ווטסאפ בטלפון מעדיף MP4: כדאי ליצור אותו בכרום מעודכן או באייפון.';
        recording = false; b.disabled = false; b.textContent = 'ליצור את הסרטון';
        $('mz-info').textContent = 'הסרטון מוכן (' + Math.round(result.blob.size / 1048576 * 10) / 10 + ' MB). אפשר לצפות, לשמור ולשתף.';
        a && a.close();
        $('mz-result').scrollIntoView({ behavior: 'smooth', block: 'center' });
        used('create', { fmt: result.ext, photos: photos.length, secs: Math.round(total()) });
      };
      playing = { stop: function () { st && st(); } };
      var t0 = 0, began = performance.now(), clock = null;
      if (window.__mzDebug) window.__mzDebug.push(['start', Math.round(performance.now())]);
      rec.start(250);
      // מחכים שהמקליט באמת התחיל לקבל תמונות (בחלק מהמכשירים זה לוקח כמה שניות), ורק אז מתחילים את המצגת והמנגינה.
      // השעון של הסרטון הוא השעון של הצליל, כך שהתמונה והמוזיקה נשארות מסונכרנות.
      (function wait() {
        if (!clock) {
          if (!ready || performance.now() - began < 600) { frame(0); return setTimeout(wait, 30); }
          if (d) { st = music(a, [d], total(), mood(), 0.6); clock = function () { return a.currentTime - st.t0; }; }
          else { t0 = performance.now() + 300; clock = function () { return (performance.now() - t0) / 1000; }; }
        }
        if (clock() < 0) { frame(0); return setTimeout(wait, 30); }
        run(function (p) { pg.value = p; }, clock).then(function () {
          setTimeout(function () { playing = null; rec.stop(); stream.getTracks().forEach(function (tr) { tr.stop(); }); }, 300);
        });
      })();
    });
  });

  function baseName() { var I = info(); return ((I.top ? I.top + ' ' : '') + (I.names || 'מצגת')).replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 50); }
  function saveBlob(blob, name) { var x = document.createElement('a'); x.href = URL.createObjectURL(blob); x.download = name; document.body.appendChild(x); x.click(); x.remove(); }
  $('mz-dl').addEventListener('click', function () { if (result) { saveBlob(result.blob, baseName() + '.' + result.ext); used('download'); } });
  $('mz-share').addEventListener('click', function () {
    if (!result) return;
    var f = new File([result.blob], baseName() + '.' + result.ext, { type: result.blob.type });
    if (navigator.canShare && navigator.canShare({ files: [f] })) {
      navigator.share({ files: [f], text: baseName() }).then(function () { used('share'); }).catch(function () {});
    } else { saveBlob(result.blob, f.name); $('mz-tip').hidden = false; used('download_fallback'); }
  });

  // ---------- האלבום ----------
  var PATTERN = [2, 1, 3, 4, 2, 3, 1, 4];
  function pagesPlan() {
    var per = val('per'), rest = photos.slice(1), out = [], k = 0;
    if (!photos.length) return out;
    if (photos.length === 1) rest = photos.slice(0); // תמונה אחת: גם בשער וגם בפנים
    while (rest.length) {
      var n = per === 'auto' ? PATTERN[k++ % PATTERN.length] : +per;
      if (per === 'auto' && rest.length - n === 1 && n < 4) n++; // לא להשאיר תמונה אחת לבד בסוף
      out.push(rest.splice(0, Math.min(n, rest.length)));
    }
    return out;
  }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function palette() {
    var a = ev().al;
    return val('look') === 'dark' ? ['#17171a', '#f2ede2', ev().acc] : a;
  }
  function pageStyle() { var c = palette(); return '--al-bg:' + c[0] + ';--al-ink:' + c[1] + ';--al-acc:' + c[2]; }
  function albumHTML(srcOf) {
    var I = info(), st = pageStyle(), bsd = I.bsd ? '<span class="al-bsd">בס"ד</span>' : '', html = [], pn = 1;
    var cov = photos[0];
    html.push('<section class="al-page al-cover" style="' + st + '"><span class="al-frame"></span>' + bsd + '<div class="al-in">' +
      (cov ? '<div class="ph"><img src="' + srcOf(cov) + '" alt=""></div>' : '') +
      '<div class="tx">' + (I.top ? '<div class="top">' + esc(I.top) + '</div>' : '') + '<div class="nm">' + esc(I.names) + '</div><span class="al-orn"></span>' +
      (I.date ? '<div class="dt">' + esc(I.date) + '</div>' : '') + '</div></div></section>');
    pagesPlan().forEach(function (grp) {
      pn++;
      var figs = grp.map(function (p) {
        return '<figure><div class="ph"><img src="' + srcOf(p) + '" alt="' + esc(p.cap) + '"></div>' + (p.cap ? '<figcaption>' + esc(p.cap) + '</figcaption>' : '') + '</figure>';
      }).join('');
      html.push('<section class="al-page" style="' + st + '"><div class="al-in"><div class="al-grid l' + grp.length + '">' + figs + '</div></div><span class="al-pn">' + pn + '</span></section>');
    });
    var last = photos.length > 1 ? photos[photos.length - 1] : null;
    html.push('<section class="al-page al-end" style="' + st + '"><span class="al-frame"></span><div class="al-in">' +
      (last ? '<div class="ph"><img src="' + srcOf(last) + '" alt=""></div>' : '') +
      '<div class="e1">' + esc(I.end) + '</div>' + (I.sub ? '<div class="e2">' + esc(I.sub) + '</div>' : '') +
      '</div><span class="cr">נוצר בחינם · הכלים של גילעד רחמים</span></section>');
    return html.join('');
  }
  function bookClass() { return 'al-book on' + (val('asize') === 'sq' ? ' al-sq' : '') + (val('fit') === 'contain' ? ' al-contain' : ''); }
  function renderAlbum() {
    var bk = $('al-book'), show = tab === 'album' && photos.length;
    bk.className = show ? bookClass() : 'al-book';
    if (!show) { bk.innerHTML = ''; $('al-info').textContent = photos.length ? '' : 'מוסיפים תמונות, והאלבום מופיע כאן למטה.'; return; }
    bk.innerHTML = albumHTML(function (p) { return p.url; });
    var n = bk.children.length;
    $('al-info').textContent = n + ' עמודים: שער, ' + (n - 2) + ' עמודי תמונות וסיום. האלבום מופיע כאן למטה.';
    setPageSize();
  }
  function setPageSize() {
    var s = $('al-page-css');
    if (!s) { s = document.createElement('style'); s.id = 'al-page-css'; document.head.appendChild(s); }
    s.textContent = '@page{size:' + (val('asize') === 'sq' ? '210mm 210mm' : 'A4 portrait') + ';margin:0}';
  }
  $('al-print').addEventListener('click', function () {
    if (!need()) { $('al-info').textContent = 'קודם מוסיפים תמונות.'; return; }
    renderAlbum();
    var imgs = Array.prototype.slice.call($('al-book').querySelectorAll('img'));
    Promise.all(imgs.map(function (i) { return i.decode ? i.decode().catch(function () {}) : null; })).then(function () {
      used('print', { photos: photos.length, size: val('asize') });
      window.print();
    });
  });

  // קובץ HTML אחד לצפייה בטלפון: התמונות מוקטנות ל-1280 ומוטמעות בתוך הקובץ
  function dataURL(p) {
    var s = Math.min(1, 1280 / Math.max(p.w, p.h)), c = document.createElement('canvas');
    c.width = Math.round(p.w * s); c.height = Math.round(p.h * s);
    c.getContext('2d').drawImage(p.img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.8);
  }
  function phoneHTML() {
    var I = info(), c = palette(), cache = {};
    var src = function (p) { return cache[p.id] || (cache[p.id] = dataURL(p)); };
    var items = photos.map(function (p) {
      return '<figure><img src="' + src(p) + '" alt="' + esc(p.cap) + '" loading="lazy">' + (p.cap ? '<figcaption>' + esc(p.cap) + '</figcaption>' : '') + '</figure>';
    }).join('\n');
    var title = esc((I.top ? I.top + ' ' : '') + I.names);
    return '<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + title + '</title>' +
      '<style>:root{--bg:' + c[0] + ';--ink:' + c[1] + ';--acc:' + c[2] + '}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:Assistant,Arial,sans-serif;text-align:center}' +
      'header{min-height:92vh;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:24px 16px}header img{width:min(86vw,440px);aspect-ratio:4/5;object-fit:cover;border-radius:50% 50% 12px 12px/24% 24% 12px 12px;box-shadow:0 10px 30px rgba(0,0,0,.25)}' +
      '.top{color:var(--acc);font-weight:700;letter-spacing:.05em;margin-top:22px;font-size:1.05rem}h1{font-family:"Frank Ruhl Libre",David,serif;font-size:2.4rem;margin:.3rem 0}.dt{opacity:.8}.orn{width:70px;height:2px;background:var(--acc);margin:12px auto}.hint{margin-top:26px;font-size:.85rem;opacity:.6}' +
      'main{max-width:640px;margin:0 auto;padding:0 12px 20px}figure{margin:0 0 22px}figure img{width:100%;height:auto;border-radius:10px;display:block;box-shadow:0 6px 20px rgba(0,0,0,.18)}figcaption{padding:8px 4px 0;font-size:1rem}' +
      'footer{padding:50px 16px 60px}footer b{display:block;font-family:"Frank Ruhl Libre",David,serif;font-size:1.7rem;color:var(--acc)}footer p{margin:.6rem 0}footer small{opacity:.55;font-size:.75rem}.bsd{position:absolute;top:10px;right:14px;font-size:.8rem;opacity:.7}</style></head><body>' +
      (I.bsd ? '<span class="bsd">בס"ד</span>' : '') +
      '<header>' + (photos[0] ? '<img src="' + src(photos[0]) + '" alt="">' : '') + (I.top ? '<div class="top">' + esc(I.top) + '</div>' : '') + '<h1>' + esc(I.names) + '</h1><div class="orn"></div>' + (I.date ? '<div class="dt">' + esc(I.date) + '</div>' : '') + '<div class="hint">גוללים למטה ↓</div></header>' +
      '<main>' + items + '</main><footer><b>' + esc(I.end) + '</b>' + (I.sub ? '<p>' + esc(I.sub) + '</p>' : '') + '<small>נוצר בחינם · הכלים של גילעד רחמים · hakelim.com/kelim/tochen/matzeget/</small></footer></body></html>';
  }
  $('al-phone').addEventListener('click', function () {
    if (!need()) { $('al-info').textContent = 'קודם מוסיפים תמונות.'; return; }
    var b = this; b.disabled = true; b.textContent = 'מכין…';
    setTimeout(function () {
      var blob = new Blob([phoneHTML()], { type: 'text/html' }), name = baseName() + ' - אלבום.html';
      var f = new File([blob], name, { type: 'text/html' }), tip = $('al-tip');
      b.disabled = false; b.textContent = 'אלבום לצפייה בטלפון';
      tip.hidden = false;
      tip.textContent = 'הקובץ מוכן (' + Math.round(blob.size / 1048576 * 10) / 10 + ' MB). שולחים אותו בווטסאפ כ"מסמך" או במייל. מי שמקבל לוחץ עליו, והאלבום נפתח בדפדפן.';
      if (matchMedia('(pointer:coarse)').matches && navigator.canShare && navigator.canShare({ files: [f] })) navigator.share({ files: [f], title: name }).catch(function () { saveBlob(blob, name); });
      else saveBlob(blob, name);
      used('phone_album', { photos: photos.length, mb: Math.round(blob.size / 104857.6) / 10 });
    }, 30);
  });

  // ---------- לשוניות ----------
  var tab = 'video';
  function setTab(t) {
    tab = t;
    $('tab-video').setAttribute('aria-selected', t === 'video'); $('tab-album').setAttribute('aria-selected', t === 'album');
    $('pane-video').hidden = t !== 'video'; $('pane-album').hidden = t !== 'album';
    if (t !== 'video') { stopAll(); $('mz-play').textContent = '▶ לצפות לפני'; }
    refresh();
  }
  $('tab-video').addEventListener('click', function () { setTab('video'); });
  $('tab-album').addEventListener('click', function () { setTab('album'); });

  // ---------- עדכון ----------
  function still() {
    if (playing || recording) return;
    build(); size();
    if (!photos.length) return placeholder();
    frame(1.6);
  }
  function refresh() { still(); renderAlbum(); save(); }
  var tmr; function refreshSoon() { clearTimeout(tmr); tmr = setTimeout(refresh, 250); }
  function save() {
    var o = {}; KEEP.forEach(function (k) { o[k] = val(k); });
    ['top', 'end', 'endsub'].forEach(function (k) { o[k + '_a'] = el(k).getAttribute('data-auto'); });
    o.bsd = val('bsd') ? 1 : 0;
    try { localStorage.setItem('kelim-matzeget', JSON.stringify(o)); } catch (e) {}
  }
  function restore() {
    try {
      var s = JSON.parse(localStorage.getItem('kelim-matzeget') || '{}');
      KEEP.forEach(function (k) { var e = el(k); if (e && s[k]) e.value = s[k]; });
      ['top', 'end', 'endsub'].forEach(function (k) { if (s[k + '_a']) el(k).setAttribute('data-auto', s[k + '_a']); });
      if (s.bsd === 0) el('bsd').checked = false;
    } catch (e) {}
  }
  document.addEventListener('input', function (e) { if (e.target.closest && e.target.closest('#mz-tool') && !e.target.closest('#mz-list')) refreshSoon(); });
  document.addEventListener('change', function (e) {
    if (!e.target.closest || !e.target.closest('#mz-tool') || e.target.closest('#mz-list') || e.target.id === 'mz-files') return;
    if (e.target.name === 'ev' || e.target.name === 'gen') autofill(false);
    refresh();
  });

  function used(how, extra) {
    if (!window.toolUsed) return;
    var o = { how: how, ev: val('ev') };
    if (extra) for (var k in extra) o[k] = extra[k];
    window.toolUsed('matzeget', o);
  }

  restore(); autofill(false);
  var fontsReady = (document.fonts && document.fonts.load) ? Promise.all([document.fonts.load('700 40px "Frank Ruhl Libre"'), document.fonts.load('600 40px "Assistant"'), document.fonts.load('400 40px "Assistant"')]).catch(function () {}) : Promise.resolve();
  fontsReady.then(function () {
    renderList(); refresh();
    var q = new URLSearchParams(location.search);
    if (q.get('demo')) {
      if (q.get('demo') === 'album') setTab('album');
      $('mz-demo').click();
    }
  });
  window.addEventListener('load', function () { if (window.Sortable && !sortable && photos.length) renderList(); });
})();
