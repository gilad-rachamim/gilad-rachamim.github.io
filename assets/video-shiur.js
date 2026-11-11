// עריכת סרטון שיעור (/kodesh/video-shiur/) – הכלים של גילעד רחמים.
// שלושה כלים על אותו סרטון, הכול בדפדפן:
//  1. חלקים לסטטוס: 30/60 שניות, עם "1/5" בפינה.
//  2. כתוביות שזזות: תמלול בענן (Worker gilad-hub /tamlul, words:true → זמן לכל מילה), עריכה, צריבה בקנבס ו-SRT.
//  3. משיעור לשורטים: בוחרים משפטים מהתמלול, וכל קטע יוצא 9:16 עם כותרת וכתוביות.
// המנוע: <video> → קנבס → captureStream + קול דרך WebAudio → MediaRecorder (MP4 כשאפשר). בזמן אמת.
// requestAnimationFrame נעצר בחלון מוסתר, ולכן יש גם טיימר גיבוי. מתחילים לנגן כשהמקליט התחיל (אירוע start), ולא מחכים לחלק הראשון שלו – אחרת כל חלק נפתח בשנייה קפואה.
// עם תמלול, חלקי הסטטוס נחתכים בסוף משפט. התמלול נשמר במכשיר (IndexedDB) לפי שם, גודל ותאריך של הקובץ.
(function () {
  'use strict';
  var root = document.getElementById('vshiur');
  if (!root) return;
  var $ = function (id) { return document.getElementById(id); };
  var API = 'https://gilad-hub.gilad4049.workers.dev/tamlul';
  var RAW_MAX = 6.8e6, PIECE = 150, FREE_SEC = 3600, PAR = 4;
  var vid = $('vs-src'), cv = $('vs-cv'), ctx = cv.getContext('2d'), out = $('vs-out'), prog = $('vs-prog');
  var file = null, fileName = 'סרטון', dur = 0, busy = false, tab = 'status';
  var segs = null, groups = null; // תמלול: segs=[{start,end,text,words:[{w,s,e}]}], groups=שורות כתוביות
  var FONT = 'Assistant, "Segoe UI", Arial, sans-serif';
  // מראה קבוע (נשמר במכשיר): סגנון כתוביות, מוזיקה ושקופית סיום
  var LK = 'kelim-vs-look', TAIL = 4;
  var look = { size: 'm', bar: 'line', lines: '1', color: '#ffd84d', music: 'none', endOn: false, name: '', phone: '', link: '' };
  try { Object.assign(look, JSON.parse(localStorage.getItem(LK) || '{}')); } catch (e) {}
  function lsave() { try { localStorage.setItem(LK, JSON.stringify(look)); } catch (e) {} }
  function endOK() { return !!(look.endOn && (look.name || look.phone || look.link)); }
  Array.prototype.forEach.call(root.querySelectorAll('[data-look]'), function (el) {
    var k = el.dataset.look, cb = el.type === 'checkbox';
    if (cb) el.checked = !!look[k];
    else if (look[k]) { el.value = look[k]; if (el.value !== look[k]) look[k] = el.value; }
    else look[k] = el.value;
    el.addEventListener(cb || el.tagName === 'SELECT' ? 'change' : 'input', function () {
      look[k] = cb ? el.checked : el.value.trim();
      var endField = k === 'name' || k === 'phone' || k === 'link';
      if (endField && look[k] && !look.endTouched && !look.endOn) { look.endOn = true; $('end-on').checked = true; }
      if (k === 'endOn') look.endTouched = true;
      lsave();
      if (k === 'lines') relines();
      if (endField || k === 'endOn') { if (endOK()) endPreview(); else if (file && !busy) still(); }
      else if (file && !busy) still();
      used('look', { k: k });
    });
  });

  // גופן Assistant לקנבס
  try {
    var ff = new FontFace('Assistant', 'url(/assets/fonts/Assistant-wght.woff)', { weight: '200 800' });
    ff.load().then(function (f) { document.fonts.add(f); }).catch(function () {});
  } catch (e) {}

  function say(t, spin) { var s = $('vs-status'); s.hidden = !t; s.innerHTML = (spin ? '<span class="spin" aria-hidden="true"></span> ' : '') + (t || ''); }
  function used(how, extra) { if (window.toolUsed) window.toolUsed('video-shiur', Object.assign({ how: how, tab: tab }, extra || {})); }
  function mmss(s) { s = Math.max(0, Math.round(s)); var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); }
  function parseT(v) { v = String(v || '').trim(); if (!v) return NaN; var p = v.split(':').map(Number); if (p.some(isNaN)) return NaN; return p.reduce(function (a, b) { return a * 60 + b; }, 0); }

  // ---------- לשוניות ----------
  function setTab(t) {
    tab = t;
    Array.prototype.forEach.call(root.querySelectorAll('[data-tab]'), function (b) { b.setAttribute('aria-selected', b.dataset.tab === t ? 'true' : 'false'); });
    ['status', 'ktuviot', 'shorts'].forEach(function (k) { $('tab-' + k).hidden = k !== t; });
    $('vs-capstyle').hidden = t === 'status';
    if (history.replaceState) history.replaceState(null, '', '#' + t);
    if (file && !busy) still();
  }
  root.addEventListener('click', function (e) {
    var b = e.target.closest('[data-tab]'); if (b) setTab(b.dataset.tab);
    if (e.target.closest('[data-unlimited]')) { e.preventDefault(); var o = q(); o.free = true; qsave(o); quota(); $('vs-limit').hidden = true; if (window.kelimEv) window.kelimEv('tamlul_unlimited', { from: 'video-shiur' }); }
  });
  if (/^#(status|ktuviot|shorts)$/.test(location.hash)) setTab(location.hash.slice(1));

  // ---------- טעינת הסרטון ----------
  $('vs-file').addEventListener('change', function () {
    var f = this.files && this.files[0];
    if (!f) return;
    load(f);
  });
  function load(f) {
    fastBroken = false; file = f; fileName = (f.name || 'סרטון').replace(/\.[^.]+$/, '').slice(0, 40);
    segs = null; groups = null; out.innerHTML = ''; tamBtns();
    $('kt-edit').hidden = true; $('sh-sents').hidden = true; $('sh-auto').hidden = true; clips = []; drawClips();
    vid.src = URL.createObjectURL(f);
    say('טוען את הסרטון…', true);
    return new Promise(function (res) {
      vid.onloadedmetadata = function () {
        dur = vid.duration;
        if (!isFinite(dur)) { vid.currentTime = 1e7; vid.ontimeupdate = function () { vid.ontimeupdate = null; dur = vid.duration; vid.currentTime = 0; ready(); res(); }; }
        else { ready(); res(); }
      };
      vid.onerror = function () { say('⚠️ הדפדפן לא מצליח לפתוח את הקובץ הזה. נסו MP4 או סרטון מהמצלמה של הטלפון.'); res(); };
    });
  }
  function ready() {
    $('vs-meta').textContent = fileName + ' · ' + mmss(dur) + ' · ' + vid.videoWidth + '×' + vid.videoHeight;
    $('st-go').disabled = false; $('sh-add').disabled = false;
    Array.prototype.forEach.call(root.querySelectorAll('[data-tamlul]'), function (b) { b.disabled = false; });
    plan(); say('');
    seek(Math.min(1, dur / 2)).then(still);
    var f = file;
    recall(f).then(function (c) { if (c && c.length && file === f && !segs && !busy) gotSegs(c, true); });
    used('load', { secs: Math.round(dur) });
  }
  function seek(t) {
    return new Promise(function (res) {
      if (Math.abs(vid.currentTime - t) < 0.01 && vid.readyState >= 2) return res();
      var done = false, fin = function () { if (!done) { done = true; vid.removeEventListener('seeked', fin); res(); } };
      vid.addEventListener('seeked', fin); setTimeout(fin, 3000);
      vid.currentTime = t;
    });
  }

  // ---------- תצוגה (מה שמצויר בקנבס) ----------
  function srcSize() { var w = vid.videoWidth || 1280, h = vid.videoHeight || 720, k = Math.min(1, 1280 / Math.max(w, h)); return [Math.round(w * k / 2) * 2, Math.round(h * k / 2) * 2]; }
  function setCanvas(w, h) { if (cv.width !== w) cv.width = w; if (cv.height !== h) cv.height = h; $('vs-stage').hidden = false; }
  var job = null; // מה שמצויר עכשיו: {kind, n, of, clip}
  function still() {
    if (!file) return;
    if (tab === 'shorts') { job = { kind: 'short', clip: curClip() }; setCanvas(720, 1280); }
    else { var s = srcSize(); setCanvas(s[0], s[1]); job = tab === 'status' ? { kind: 'status', n: 1, of: parts().length } : { kind: 'caps' }; }
    paint(vid.currentTime);
  }
  function paint(t) {
    var W = cv.width, H = cv.height;
    ctx.save(); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    if (job && job.kind === 'short') drawShort(t, W, H);
    else {
      try { ctx.drawImage(SRC(), 0, 0, W, H); } catch (e) {}
      if (job && job.kind === 'status') badge(job.n + '/' + job.of, W, H);
      if (job && job.kind === 'caps') caps(t, W, H, +$('kt-pos').value);
    }
    if (job && job.banner && job.endK == null && t > job.bAt - 5) banner(W, H, Math.min(1, (t - job.bAt + 5) / 0.6));
    if (job && job.endK != null) drawEnd(W, H, Math.min(1, job.endK / 0.5));
    ctx.restore();
  }
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function badge(txt, W, H) {
    var pos = $('st-pos').value; if (pos === 'none') return;
    var fs = Math.round(Math.min(W, H) * 0.055), pad = fs * 0.45, m = Math.round(Math.min(W, H) * 0.035);
    ctx.font = '800 ' + fs + 'px ' + FONT; ctx.direction = 'ltr'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var w = ctx.measureText(txt).width + pad * 2, h = fs + pad * 1.2, y = pos === 'bl' ? H - m - h : m;
    ctx.fillStyle = 'rgba(10,16,30,.72)'; rr(m, y, w, h, h / 2); ctx.fill();
    ctx.strokeStyle = 'rgba(230,197,126,.9)'; ctx.lineWidth = Math.max(2, fs * 0.06); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillText(txt, m + w / 2, y + h / 2 + fs * 0.04);
  }

  // ---------- כתוביות: ציור מילה-מילה מימין לשמאל ----------
  function groupAt(t) {
    if (!groups) return null;
    for (var i = 0; i < groups.length; i++) { var g = groups[i]; if (t >= g.s - 0.05 && t < g.e) return g; }
    return null;
  }
  function caps(t, W, H, yk, color, maxW) {
    var g = groupAt(t); if (!g) return;
    color = color || look.color;
    var k = { s: 0.055, m: 0.07, l: 0.088 }[look.size] || 0.07, bar = look.bar === 'bar';
    var fs = Math.round(Math.min(W, H) * k), lh = fs * 1.25;
    ctx.font = '800 ' + fs + 'px ' + FONT; ctx.direction = 'rtl'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    var sp = ctx.measureText(' ').width, lim = (maxW || 0.88) * W, lines = [[]], lw = [0];
    var items = g.words.map(function (w) { return { w: w, ww: ctx.measureText(w.w).width }; });
    items.forEach(function (o) {
      var L = lines.length - 1;
      if (lines[L].length && lw[L] + sp + o.ww > lim) { lines.push([]); lw.push(0); L++; }
      lw[L] += (lines[L].length ? sp : 0) + o.ww; lines[L].push(o);
    });
    // שתי שורות: שורה ארוכה נחצית לשתיים מאוזנות
    if (look.lines === '2' && lines.length === 1 && items.length >= 4 && lw[0] > lim * 0.55) {
      var best = 1, bw = 1e9, acc = 0;
      for (var c = 1; c < items.length; c++) { acc += items[c - 1].ww + (c > 1 ? sp : 0); var m2 = Math.max(acc, lw[0] - acc - sp); if (m2 < bw) { bw = m2; best = c; } }
      lines = [items.slice(0, best), items.slice(best)];
      lw = lines.map(function (ln) { return ln.reduce(function (a, o, i) { return a + o.ww + (i ? sp : 0); }, 0); });
    }
    var y0 = yk * H - (lines.length - 1) * lh / 2;
    if (bar) {
      var mw = Math.max.apply(null, lw), pd = fs * 0.4;
      ctx.fillStyle = 'rgba(0,0,0,.62)'; rr(W / 2 - mw / 2 - pd, y0 - lh / 2 - pd * 0.35, mw + pd * 2, lines.length * lh + pd * 0.7, fs * 0.3); ctx.fill();
    }
    ctx.lineJoin = 'round'; ctx.lineWidth = bar ? Math.max(2, fs * 0.06) : Math.max(4, fs * 0.16); ctx.strokeStyle = 'rgba(0,0,0,.85)';
    ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = bar ? 0 : fs * 0.25;
    lines.forEach(function (ln, i) {
      var x = W / 2 + lw[i] / 2, y = y0 + i * lh;
      ln.forEach(function (o) {
        var now = t >= o.w.s && t < o.w.e2;
        ctx.strokeText(o.w.w, x, y);
        ctx.fillStyle = now ? color : '#fff';
        ctx.fillText(o.w.w, x, y);
        x -= o.ww + sp;
      });
    });
    ctx.shadowBlur = 0;
  }

  // ---------- שורט 9:16 ----------
  var tiny = document.createElement('canvas'); tiny.width = 36; tiny.height = 64;
  // רקע מטושטש בשני שלבים (36×64 ← 144×256 ← מסך): חלק, וזול לציור (איכות 'high' האטה את היצירה פי 4)
  var mid = document.createElement('canvas'); mid.width = 144; mid.height = 256;
  function cover(c, w, h) { var vw = vid.videoWidth || 16, vh = vid.videoHeight || 9, k = Math.max(w / vw, h / vh); c.drawImage(SRC(), (w - vw * k) / 2, (h - vh * k) / 2, vw * k, vh * k); }
  function drawShort(t, W, H) {
    var cl = job.clip || {}, mode = cl.bg || $('sh-bg').value, vw = vid.videoWidth || 16, vh = vid.videoHeight || 9;
    var capY = 0.74;
    try {
      if (mode === 'crop') { cover(ctx, W, H); }
      else {
        var tc = tiny.getContext('2d'); cover(tc, 36, 64);
        mid.getContext('2d').drawImage(tiny, 0, 0, 144, 256); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'low'; ctx.drawImage(mid, 0, 0, W, H);
        ctx.fillStyle = 'rgba(8,12,24,.45)'; ctx.fillRect(0, 0, W, H);
        var h = W * vh / vw; if (h > H * 0.62) h = H * 0.62; var w = h * vw / vh, y = H * 0.47 - h / 2;
        ctx.drawImage(SRC(), (W - w) / 2, y, w, h);
        capY = Math.min(0.86, (y + h) / H + 0.1);
      }
    } catch (e) {}
    // כותרת למעלה
    var title = cl.title != null ? cl.title : $('sh-title').value.trim();
    if (title) {
      var fs = 54; ctx.font = '800 ' + fs + 'px ' + FONT; ctx.direction = 'rtl'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      var words = title.split(/\s+/), lines = [''], lim = W * 0.84;
      words.forEach(function (w) { var L = lines.length - 1, tst = lines[L] ? lines[L] + ' ' + w : w; if (lines[L] && ctx.measureText(tst).width > lim) lines.push(w); else lines[L] = tst; });
      lines = lines.slice(0, 3);
      var lh = fs * 1.22, bh = lines.length * lh + 44, by = 96;
      ctx.fillStyle = 'rgba(10,16,30,.78)'; rr(W * 0.05, by, W * 0.9, bh, 26); ctx.fill();
      ctx.strokeStyle = 'rgba(230,197,126,.85)'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#e6c57e';
      lines.forEach(function (l, i) { ctx.fillText(l, W / 2, by + 22 + lh / 2 + i * lh); });
    }
    if ((cl.caps != null ? cl.caps : $('sh-caps').value === '1') && groups) caps(t, W, H, mode === 'crop' ? 0.78 : capY, null, 0.86);
  }

  // ---------- שקופית סיום ופס תחתון ----------
  function fit(txt, w, fs, wt) { ctx.font = wt + ' ' + fs + 'px ' + FONT; while (fs > 12 && ctx.measureText(txt).width > w) { fs -= 2; ctx.font = wt + ' ' + fs + 'px ' + FONT; } return fs; }
  function drawEnd(W, H, k) {
    ctx.save(); ctx.globalAlpha = k;
    var gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0a1020'); gr.addColorStop(1, '#1a2542');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    var m = Math.min(W, H), pad = m * 0.06;
    ctx.strokeStyle = 'rgba(230,197,126,.55)'; ctx.lineWidth = Math.max(2, m * 0.006); rr(pad, pad, W - 2 * pad, H - 2 * pad, m * 0.04); ctx.stroke();
    var rows = [];
    if (look.name) rows.push({ t: look.name, fs: m * 0.085, wt: 800, c: '#e6c57e', d: 'rtl' });
    if (look.phone) rows.push({ t: look.phone, fs: m * 0.075, wt: 700, c: '#ffffff', d: 'ltr', gap: 0.3 });
    if (look.link) {
      rows.push({ t: 'להצטרפות לקבוצה', fs: m * 0.042, wt: 600, c: 'rgba(255,255,255,.72)', d: 'rtl', gap: 0.6 });
      rows.push({ t: look.link.replace(/^https?:\/\//, '').replace(/\/$/, ''), fs: m * 0.05, wt: 700, c: '#9fd3ff', d: 'ltr' });
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var tot = 0;
    rows.forEach(function (r) { r.fs = fit(r.t, W - 4 * pad, Math.round(r.fs), r.wt); r.h = r.fs * 1.45 + (r.gap || 0) * r.fs; tot += r.h; });
    var y = H / 2 - tot / 2 + (1 - k) * m * 0.03;
    rows.forEach(function (r) {
      y += (r.gap || 0) * r.fs;
      ctx.font = r.wt + ' ' + r.fs + 'px ' + FONT; ctx.direction = r.d; ctx.fillStyle = r.c;
      ctx.fillText(r.t, W / 2, y + r.fs * 0.725); y += r.fs * 1.45;
    });
    ctx.restore();
  }
  function banner(W, H, k) {
    var txt = [look.name, look.phone].filter(Boolean).join('  ·  ') || look.link; if (!txt) return;
    var m = Math.min(W, H), h = m * 0.12, y = H - h - m * 0.035;
    ctx.save(); ctx.globalAlpha = k;
    ctx.fillStyle = 'rgba(10,16,32,.86)'; rr(W * 0.04, y, W * 0.92, h, h * 0.3); ctx.fill();
    ctx.strokeStyle = 'rgba(230,197,126,.8)'; ctx.lineWidth = Math.max(2, m * 0.004); ctx.stroke();
    var fs = fit(txt, W * 0.84, Math.round(h * 0.44), 800);
    ctx.direction = 'rtl'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#e6c57e';
    ctx.fillText(txt, W / 2, y + h / 2 + fs * 0.04);
    ctx.restore();
  }
  function endPreview() {
    if (busy) return;
    if (file) still(); else { setCanvas(720, 1280); job = { kind: 'none' }; }
    job.endK = 1; paint(vid.currentTime || 0);
  }
  $('end-see').addEventListener('click', function () {
    if (!endOK()) { say('⚠️ ממלאים שם, טלפון או קישור, ומסמנים "להוסיף שקופית סיום".'); return; }
    say(''); endPreview(); $('vs-stage').scrollIntoView({ block: 'nearest' });
  });

  // ---------- מוזיקה שקטה (WebAudio, נוצרת כאן, כמו ב-/kodesh/video-parasha/) ----------
  var CH = [[50, 54, 57, 62], [47, 50, 54, 59], [43, 47, 50, 55], [45, 49, 52, 57]];
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function music(ac, outs, len, vol) {
    var t0 = ac.currentTime + 0.05, master = ac.createGain(), lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 1500;
    master.gain.setValueAtTime(0, t0); master.gain.linearRampToValueAtTime(vol, t0 + 2);
    master.gain.setValueAtTime(vol, t0 + Math.max(2.1, len - 2.5)); master.gain.linearRampToValueAtTime(0, t0 + len);
    lp.connect(master); outs.forEach(function (d) { master.connect(d); });
    var dl = ac.createDelay(), fb = ac.createGain(); dl.delayTime.value = 0.42; fb.gain.value = 0.35;
    dl.connect(fb); fb.connect(dl); dl.connect(lp);
    var nodes = [];
    for (var b = 0, t = t0; t < t0 + len; b++, t += 4) {
      var ch = CH[b % 4];
      ch.forEach(function (m) {
        ['sine', 'triangle'].forEach(function (type, j) {
          var o = ac.createOscillator(), g = ac.createGain();
          o.type = type; o.frequency.value = hz(m) * (j ? 1.003 : 1);
          g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(j ? 0.035 : 0.06, t + 1.2); g.gain.linearRampToValueAtTime(0, t + 4.6);
          o.connect(g); g.connect(lp); o.start(t); o.stop(t + 4.7); nodes.push(o);
        });
      });
      [ch[1] + 12, ch[2] + 12, ch[3] + 12, ch[2] + 12].forEach(function (m, k) {
        var tt = t + k + 0.5; if (tt > t0 + len - 1) return;
        var o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sine'; o.frequency.value = hz(m);
        g.gain.setValueAtTime(0, tt); g.gain.linearRampToValueAtTime(0.05, tt + 0.03); g.gain.exponentialRampToValueAtTime(0.0008, tt + 1.6);
        o.connect(g); g.connect(lp); g.connect(dl); o.start(tt); o.stop(tt + 1.7); nodes.push(o);
      });
    }
    return function () { nodes.forEach(function (o) { try { o.stop(); } catch (e) {} }); try { master.disconnect(); } catch (e) {} };
  }

  // ---------- יצירה מהירה: WebCodecs + mp4-muxer (בלי לנגן בזמן אמת) ----------
  // קוראים את טבלת הדגימות מה-moov של הקובץ (MP4/MOV), מפענחים רק את הקטע הדרוש, מציירים כל תמונה בקנבס
  // ומקודדים H.264 + AAC. כשמשהו לא נתמך (דפדפן, קודק, WebM, קטע ארוך) – חוזרים למנוע הרגיל בזמן אמת.
  // FR: התמונה הנוכחית במנוע המהיר. מעתיקים כל תמונה פעם אחת לקנבס (fcv), כי ציור ישיר של VideoFrame כמה פעמים לכל תמונה איטי מאוד
  var FR = null, fcv = document.createElement('canvas'), fctx = fcv.getContext('2d'), fcFrom = null;
  function SRC() {
    if (!FR) return vid;
    if (fcFrom !== FR) {
      var s = srcSize(), m = dmx && dmx.rot; if (fcv.width !== s[0]) fcv.width = s[0]; if (fcv.height !== s[1]) fcv.height = s[1];
      if (!m) fctx.drawImage(FR, 0, 0, s[0], s[1]);
      else {
        // סרטון שצולם לאורך: התמונה שמורה לרוחב, ומטריצת הסיבוב (tkhd) אומרת איך להציג אותה
        var fw = FR.displayWidth, fh = FR.displayHeight, xs = [0, m[0] * fw, m[2] * fh, m[0] * fw + m[2] * fh], ys = [0, m[1] * fw, m[3] * fh, m[1] * fw + m[3] * fh];
        var x0 = Math.min.apply(0, xs), y0 = Math.min.apply(0, ys), sx = s[0] / (Math.max.apply(0, xs) - x0), sy = s[1] / (Math.max.apply(0, ys) - y0);
        fctx.setTransform(m[0] * sx, m[1] * sy, m[2] * sx, m[3] * sy, -x0 * sx, -y0 * sy); fctx.drawImage(FR, 0, 0, fw, fh); fctx.setTransform(1, 0, 0, 1, 0, 0);
      }
      fcFrom = FR;
    }
    return fcv;
  }
  var MUX = 'https://cdn.jsdelivr.net/npm/mp4-muxer@5.2.1/build/mp4-muxer.min.js', FAST_MAX = 10 * 60;
  var muxP = null, fastBroken = false, dmx = null;
  function fastOK(len) {
    return !fastBroken && window.__vsFast !== false && (!$('vs-fast') || $('vs-fast').checked) && len <= FAST_MAX &&
      !!(window.VideoEncoder && window.VideoDecoder && window.AudioEncoder && window.AudioDecoder && window.VideoFrame && window.OfflineAudioContext);
  }
  function muxLib() {
    if (window.Mp4Muxer) return Promise.resolve();
    return muxP || (muxP = new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = MUX; s.async = true; s.crossOrigin = 'anonymous';
      s.onload = res; s.onerror = function () { muxP = null; rej(new Error('lib')); }; document.head.appendChild(s);
    }));
  }
  function readAt(f, off, len) { return f.slice(off, off + len).arrayBuffer(); }
  // ---- קריאת ה-moov ----
  function topBoxes(f) {
    var list = [], off = 0;
    function next() {
      if (off + 8 > f.size || list.length > 60) return Promise.resolve(list);
      return readAt(f, off, 16).then(function (b) {
        var d = new DataView(b), size = d.getUint32(0), type = String.fromCharCode(d.getUint8(4), d.getUint8(5), d.getUint8(6), d.getUint8(7));
        if (size === 1) size = d.getUint32(8) * 4294967296 + d.getUint32(12); else if (size === 0) size = f.size - off;
        if (size < 8) throw new Error('box');
        list.push({ type: type, off: off, size: size }); off += size; return next();
      });
    }
    return next();
  }
  function parseMoov(buf) {
    var d = new DataView(buf), u8 = new Uint8Array(buf), mvTS = 1000, tracks = [];
    function str(o) { return String.fromCharCode(u8[o], u8[o + 1], u8[o + 2], u8[o + 3]); }
    function kids(s, e, cb) {
      while (s + 8 <= e) {
        var sz = d.getUint32(s), ty = str(s + 4), h = 8;
        if (sz === 1) { sz = d.getUint32(s + 8) * 4294967296 + d.getUint32(s + 12); h = 16; } else if (sz === 0) sz = e - s;
        if (sz < 8 || s + sz > e) break;
        cb(ty, s + h, s + sz); s += sz;
      }
    }
    function u64(o) { return d.getUint32(o) * 4294967296 + d.getUint32(o + 4); }
    kids(8, buf.byteLength, function (ty, s, e) {
      if (ty === 'mvhd') mvTS = d.getUint32(s + (u8[s] === 1 ? 20 : 12));
      if (ty !== 'trak') return;
      var T = { edits: [] };
      (function walk(s, e) {
        kids(s, e, function (ty, s, e) {
          if (ty === 'mdia' || ty === 'minf' || ty === 'stbl' || ty === 'edts') return walk(s, e);
          var v = u8[s];
          if (ty === 'tkhd') { var m = s + (v === 1 ? 52 : 40); T.mat = [d.getInt32(m), d.getInt32(m + 4), d.getInt32(m + 12), d.getInt32(m + 16)]; }
          else if (ty === 'mdhd') T.ts = d.getUint32(s + (v === 1 ? 20 : 12));
          else if (ty === 'hdlr') T.kind = str(s + 8);
          else if (ty === 'elst') { var n = d.getUint32(s + 4), o = s + 8; for (var i = 0; i < n; i++) { if (v === 1) { T.edits.push([u64(o), d.getInt32(o + 8) * 4294967296 + d.getUint32(o + 12)]); o += 20; } else { T.edits.push([d.getUint32(o), d.getInt32(o + 4)]); o += 12; } } }
          else if (ty === 'stsd') {
            var es = s + 8, ee = es + d.getUint32(es); T.fmt = str(es + 4);
            if (T.fmt === 'avc1' || T.fmt === 'avc3' || T.fmt === 'hvc1' || T.fmt === 'hev1') {
              T.w = d.getUint16(es + 32); T.h = d.getUint16(es + 34);
              kids(es + 86, ee, function (ty, s, e) { if (ty === 'avcC' || ty === 'hvcC') { T.cfgType = ty; T.cfg = u8.slice(s, e); } });
            } else if (T.fmt === 'mp4a') {
              var ver = d.getUint16(es + 16);
              T.ch = d.getUint16(es + 24); T.rate = d.getUint32(es + 32) >>> 16;
              kids(es + 36 + (ver === 1 ? 16 : ver === 2 ? 36 : 0), ee, function (ty, s, e) {
                if (ty !== 'esds') return;
                var p = s + 4;
                function desc() { var tag = u8[p++], len = 0, b; do { b = u8[p++]; len = (len << 7) | (b & 127); } while (b & 128 && p < e); return { tag: tag, len: len }; }
                while (p < e) {
                  var x = desc();
                  if (x.tag === 3) { var fl = u8[p + 2]; p += 3; if (fl & 128) p += 2; if (fl & 64) p += 1 + u8[p]; if (fl & 32) p += 2; }
                  else if (x.tag === 4) { T.oti = u8[p]; p += 13; }
                  else if (x.tag === 5) { T.asc = u8.slice(p, p + x.len); break; }
                  else p += x.len;
                }
              });
            }
          }
          else if (ty === 'stts') { T.stts = []; var n2 = d.getUint32(s + 4); for (var k = 0; k < n2; k++) T.stts.push([d.getUint32(s + 8 + k * 8), d.getUint32(s + 12 + k * 8)]); }
          else if (ty === 'ctts') { T.ctts = []; var n3 = d.getUint32(s + 4); for (var k2 = 0; k2 < n3; k2++) T.ctts.push([d.getUint32(s + 8 + k2 * 8), v === 1 ? d.getInt32(s + 12 + k2 * 8) : d.getUint32(s + 12 + k2 * 8)]); }
          else if (ty === 'stss') { T.stss = new Set(); var n4 = d.getUint32(s + 4); for (var k3 = 0; k3 < n4; k3++) T.stss.add(d.getUint32(s + 8 + k3 * 4)); }
          else if (ty === 'stsz') { var one = d.getUint32(s + 4), n5 = d.getUint32(s + 8); T.sizes = new Uint32Array(n5); for (var k4 = 0; k4 < n5; k4++) T.sizes[k4] = one || d.getUint32(s + 12 + k4 * 4); }
          else if (ty === 'stco' || ty === 'co64') { var n6 = d.getUint32(s + 4); T.chunks = new Float64Array(n6); for (var k5 = 0; k5 < n6; k5++) T.chunks[k5] = ty === 'co64' ? u64(s + 8 + k5 * 8) : d.getUint32(s + 8 + k5 * 4); }
          else if (ty === 'stsc') { T.stsc = []; var n7 = d.getUint32(s + 4); for (var k6 = 0; k6 < n7; k6++) T.stsc.push([d.getUint32(s + 8 + k6 * 12), d.getUint32(s + 12 + k6 * 12)]); }
        });
      })(s, e);
      if (T.sizes && T.chunks && T.stsc && T.stts && T.ts) tracks.push(T);
    });
    tracks.forEach(function (T) { table(T, mvTS); });
    return tracks;
  }
  // טבלת דגימות: מיקום, גודל, זמן הצגה (בשניות, אחרי רשימת העריכה) ותמונת מפתח
  function table(T, mvTS) {
    var n = T.sizes.length, off = new Float64Array(n), cts = new Float64Array(n), key = new Uint8Array(n);
    var si = 0, ci = 0;
    for (var e = 0; e < T.stsc.length && si < n; e++) {
      var first = T.stsc[e][0] - 1, last = e + 1 < T.stsc.length ? T.stsc[e + 1][0] - 1 : T.chunks.length, per = T.stsc[e][1];
      for (ci = first; ci < last && si < n; ci++) { var o = T.chunks[ci]; for (var k = 0; k < per && si < n; k++) { off[si] = o; o += T.sizes[si]; si++; } }
    }
    var dts = 0, i = 0;
    T.stts.forEach(function (x) { for (var k = 0; k < x[0] && i < n; k++) { cts[i++] = dts; dts += x[1]; } });
    if (T.ctts) { i = 0; T.ctts.forEach(function (x) { for (var k = 0; k < x[0] && i < n; k++) cts[i++] += x[1]; }); }
    var shift = 0, delay = 0;
    for (var j = 0; j < T.edits.length; j++) { if (T.edits[j][1] === -1) delay += T.edits[j][0] / mvTS; else { shift = T.edits[j][1] / T.ts; break; } }
    for (i = 0; i < n; i++) { cts[i] = cts[i] / T.ts - shift + delay; key[i] = !T.stss || T.stss.has(i + 1) ? 1 : 0; }
    T.n = n; T.off = off; T.cts = cts; T.key = key; T.fps = n > 1 ? n / Math.max(0.1, dts / T.ts) : 30;
  }
  function hexb(x) { return ('0' + x.toString(16)).slice(-2); }
  function vCodec(T) {
    var b = T.cfg; if (!b) return null;
    if (T.cfgType === 'avcC') return 'avc1.' + hexb(b[1]) + hexb(b[2]) + hexb(b[3]);
    var ps = b[1] >> 6, pidc = b[1] & 31, tier = (b[1] >> 5) & 1, c = ((b[2] << 24) | (b[3] << 16) | (b[4] << 8) | b[5]) >>> 0, rev = 0;
    for (var i = 0; i < 32; i++) { rev = ((rev << 1) | (c & 1)) >>> 0; c >>>= 1; }
    var cons = [b[6], b[7], b[8], b[9], b[10], b[11]]; while (cons.length && !cons[cons.length - 1]) cons.pop();
    return T.fmt + '.' + ['', 'A', 'B', 'C'][ps] + pidc + '.' + rev.toString(16).toUpperCase() + '.' + (tier ? 'H' : 'L') + b[12] + (cons.length ? '.' + cons.map(function (x) { return x.toString(16).toUpperCase(); }).join('.') : '');
  }
  function demux() {
    var f = file;
    if (dmx && dmx.file === f) return dmx.bad ? Promise.reject(new Error(dmx.bad)) : Promise.resolve(dmx);
    return topBoxes(f).then(function (list) {
      var mv = list.filter(function (x) { return x.type === 'moov'; })[0];
      if (!mv || mv.size > 80e6) throw new Error('nomoov');
      return readAt(f, mv.off, mv.size);
    }).then(function (buf) {
      var tr = parseMoov(buf), V = tr.filter(function (t) { return t.kind === 'vide' && t.cfg; })[0], A = tr.filter(function (t) { return t.kind === 'soun' && t.fmt === 'mp4a' && t.asc; })[0];
      dmx = { file: f, v: V, a: A };
      if (!V) dmx.bad = 'novideo';
      else if (V.mat && !(V.mat[0] > 0 && V.mat[1] === 0 && V.mat[2] === 0 && V.mat[3] > 0)) dmx.rot = V.mat.map(function (x) { return x / 65536; });
      if (dmx.bad) throw new Error(dmx.bad);
      return dmx;
    }, function (e) { dmx = { file: f, bad: e.message || 'demux' }; throw e; });
  }
  // קריאת דגימות ברצף: קטעים צמודים בקובץ נקראים בבת אחת
  function reader(f, T) {
    return function (i0, i1) {
      var lo = T.off[i0], hi = T.off[i1 - 1] + T.sizes[i1 - 1];
      if (hi - lo < 12e6) return readAt(f, lo, hi - lo).then(function (b) { var out = []; for (var i = i0; i < i1; i++) out.push(new Uint8Array(b, T.off[i] - lo, T.sizes[i])); return out; });
      var out = [], i = i0;
      return (function one() { if (i >= i1) return Promise.resolve(out); var k = i++; return readAt(f, T.off[k], T.sizes[k]).then(function (b) { out.push(new Uint8Array(b)); return one(); }); })();
    };
  }
  function first(T, t) { var k = 0; for (var i = 0; i < T.n; i++) { if (T.cts[i] > t) break; if (T.key[i]) k = i; } return k; }
  function tick() { return new Promise(function (r) { setTimeout(r, 0); }); }
  // ---- קול: מפענחים את הקטע, מוסיפים מוזיקה (OfflineAudioContext) ומקודדים AAC ----
  function fastAudio(A, a, b, len, rate, muxer) {
    var withMusic = look.music !== 'none';
    if (!A && !withMusic) return Promise.resolve(false);
    // הקול המקורי נשמר בקצב שלו (sr), וה-OfflineAudioContext ממיר לקצב היציאה (rate)
    var frames = Math.ceil(len * rate), sr = A ? A.rate : rate, sf = Math.ceil(len * sr), L = new Float32Array(sf), R = new Float32Array(sf);
    var dec = Promise.resolve();
    if (A) dec = new Promise(function (res, rej) {
      var ad = new AudioDecoder({
        output: function (x) {
          try {
            var n = x.numberOfFrames, ch = x.numberOfChannels, at = Math.round((x.timestamp / 1e6 - a) * sr), planes = [];
            for (var c = 0; c < Math.min(2, ch); c++) { var p = new Float32Array(n); x.copyTo(p, { planeIndex: c, format: 'f32-planar' }); planes.push(p); }
            if (planes.length === 1) planes.push(planes[0]);
            for (var i = 0; i < n; i++) { var j = at + i; if (j >= 0 && j < sf) { L[j] = planes[0][i]; R[j] = planes[1][i]; } }
          } catch (e) { rej(e); }
          x.close();
        }, error: rej
      });
      ad.configure({ codec: 'mp4a.40.' + Math.max(1, A.asc[0] >> 3), sampleRate: A.rate, numberOfChannels: A.ch, description: A.asc });
      var i0 = Math.max(0, first(A, a) - 2), i1 = i0, read = reader(file, A);
      while (i1 < A.n && A.cts[i1] < b + 0.2) i1++;
      (function feed(i) {
        if (i >= i1) return ad.flush().then(function () { ad.close(); res(); }, rej);
        var j = Math.min(i1, i + 200);
        read(i, j).then(function (bufs) { bufs.forEach(function (u, k) { ad.decode(new EncodedAudioChunk({ type: 'key', timestamp: Math.round(A.cts[i + k] * 1e6), data: u })); }); return feed(j); }).catch(rej);
      })(i0);
    });
    return dec.then(function () {
      var oac = new OfflineAudioContext(2, frames, rate), buf = oac.createBuffer(2, sf, sr);
      buf.copyToChannel(L, 0); buf.copyToChannel(R, 1);
      var src = oac.createBufferSource(); src.buffer = buf; src.connect(oac.destination); src.start(0);
      if (withMusic) music(oac, [oac.destination], len, look.music === 'soft' ? 0.5 : 0.22);
      return oac.startRendering();
    }).then(function (ab) {
      return aacDelay(rate).then(function (skip) {
        return new Promise(function (res, rej) {
          var enc = new AudioEncoder({ output: function (c, m) { muxer.addAudioChunk(c, m); }, error: rej });
          enc.configure({ codec: 'mp4a.40.2', sampleRate: rate, numberOfChannels: 2, bitrate: 128000 });
          var l = ab.getChannelData(0), r = ab.getChannelData(1);
          // מדלגים על דגימות כמספר דגימות השקט שהמקודד מוסיף בהתחלה, כדי שהקול יישב בדיוק על התמונה
          for (var s = skip; s < frames; s += 1024) {
            var n = Math.min(1024, frames - s), d = new Float32Array(n * 2);
            d.set(l.subarray(s, s + n), 0); d.set(r.subarray(s, s + n), n);
            var x = new AudioData({ format: 'f32-planar', sampleRate: rate, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round((s - skip) / rate * 1e6), data: d });
            enc.encode(x); x.close();
          }
          enc.flush().then(function () { enc.close(); res(true); }, rej);
        });
      });
    });
  }
  // מקודד ה-AAC של אנדרואיד מוסיף בתחילת הקול 2048 דגימות שקט (46ms) ולא מסמן אותן, והקול יוצא מאחר.
  // מודדים פעם אחת: מקודדים צפצוף קצר בנקודה ידועה, מפענחים, ורואים בכמה דגימות הוא זז.
  var aacDelayP = {};
  function aacDelay(rate) {
    if (aacDelayP[rate]) return aacDelayP[rate];
    var AT = 4096, total = 8192;
    return aacDelayP[rate] = new Promise(function (res, rej) {
      var chunks = [], cfg = null;
      var enc = new AudioEncoder({ output: function (c, m) { chunks.push(c); if (!cfg && m && m.decoderConfig) cfg = m.decoderConfig; }, error: rej });
      enc.configure({ codec: 'mp4a.40.2', sampleRate: rate, numberOfChannels: 2, bitrate: 128000 });
      for (var s = 0; s < total; s += 1024) {
        var d = new Float32Array(2048);
        for (var k = 0; k < 1024; k++) { var t = s + k; d[k] = d[k + 1024] = t >= AT && t < AT + 256 ? 0.8 * Math.sin(t * 0.3) : 0; }
        var x = new AudioData({ format: 'f32-planar', sampleRate: rate, numberOfFrames: 1024, numberOfChannels: 2, timestamp: Math.round(s / rate * 1e6), data: d });
        enc.encode(x); x.close();
      }
      enc.flush().then(function () {
        enc.close();
        if (!cfg) throw new Error('cfg');
        var pcm = [], dec = new AudioDecoder({ output: function (o) { var u = new Float32Array(o.numberOfFrames); o.copyTo(u, { planeIndex: 0, format: 'f32-planar' }); pcm.push(u); o.close(); }, error: rej });
        dec.configure(cfg);
        chunks.forEach(function (c) { dec.decode(c); });
        return dec.flush().then(function () {
          dec.close();
          var pos = 0, i, j, peak = 0, all = [];
          pcm.forEach(function (u) { for (i = 0; i < u.length; i++) all.push(u[i]); });
          for (i = 0; i < all.length; i++) peak = Math.max(peak, Math.abs(all[i]));
          for (j = 0; j < all.length; j++) if (Math.abs(all[j]) > peak * 0.5) { pos = j; break; }
          var delay = Math.round((pos - AT) / 64) * 64;
          window.__vsAacDelay = delay;
          res(delay > 0 && delay <= 4096 ? delay : 0);
        });
      }).catch(rej);
    }).catch(function (e) { window.__vsAacDelay = 'err ' + (e && e.message || e); return 0; });
  }
  function pickV(W, H, fps) {
    var list = ['avc1.640028', 'avc1.4d0028', 'avc1.42002a', 'avc1.42001f'];
    return (function one(i) {
      if (i >= list.length) return Promise.reject(new Error('venc'));
      var c = { codec: list[i], width: W, height: H, bitrate: 3500000, framerate: fps, avc: { format: 'avc' } };
      return VideoEncoder.isConfigSupported(c).then(function (s) { return s.supported ? c : one(i + 1); }, function () { return one(i + 1); });
    })(0);
  }
  function fastRec(a, b, onP, opt) {
    var tail = (opt && opt.tail) || 0, len = b - a + tail, W = cv.width, H = cv.height, D, V, A, rate, fps, muxer, vcfg;
    return Promise.all([muxLib(), demux()]).then(function (r) {
      D = r[1]; V = D.v; A = D.a; rate = A && (A.rate === 44100 || A.rate === 48000) ? A.rate : 48000;
      fps = Math.max(15, Math.min(30, Math.round(V.fps || 30)));
      var dc = { codec: vCodec(V), codedWidth: V.w, codedHeight: V.h, description: V.cfg };
      return Promise.all([VideoDecoder.isConfigSupported(dc), pickV(W, H, fps),
        AudioEncoder.isConfigSupported({ codec: 'mp4a.40.2', sampleRate: rate, numberOfChannels: 2, bitrate: 128000 }),
        A ? AudioDecoder.isConfigSupported({ codec: 'mp4a.40.' + Math.max(1, A.asc[0] >> 3), sampleRate: A.rate, numberOfChannels: A.ch, description: A.asc }) : { supported: true }]).then(function (s) {
        if (!s[0].supported) throw new Error('vdec ' + dc.codec);
        if (!s[2].supported || !s[3].supported) throw new Error('audio');
        vcfg = s[1]; return dc;
      });
    }).then(function (dc) {
      var hasA = !!A || look.music !== 'none';
      muxer = new Mp4Muxer.Muxer({ target: new Mp4Muxer.ArrayBufferTarget(), video: { codec: 'avc', width: W, height: H, frameRate: fps },
        audio: hasA ? { codec: 'aac', numberOfChannels: 2, sampleRate: rate } : undefined, fastStart: 'in-memory', firstTimestampBehavior: 'offset' });
      if (onP) onP(0.01);
      return fastAudio(A, a, b, len, rate, muxer).then(function () { return fastVideo(dc, vcfg, a, b, tail, len, fps, muxer, onP); });
    }).then(function () {
      muxer.finalize();
      window.__vsLast = 'fast';
      return { blob: new Blob([muxer.target.buffer], { type: 'video/mp4' }), ext: 'mp4', fast: true };
    });
  }
  function fastVideo(dc, vcfg, a, b, tail, len, fps, muxer, onP) {
    var V = dmx.v, read = reader(file, V), q = [], cur = null, err = null, fed = first(V, a), end = fed, done = false, flushed = false;
    while (end < V.n && V.cts[end] < b + 1) end++;
    // עוד כמה דגימות אחרי b, כדי שתמונות עם B-frames ייצאו מהמפענח
    end = Math.min(V.n, end + 8);
    var dec = new VideoDecoder({ output: function (fr) { q.push(fr); }, error: function (e) { err = e; } });
    dec.configure(dc);
    var enc = new VideoEncoder({ output: function (c, m) { muxer.addVideoChunk(c, m); }, error: function (e) { err = e; } });
    enc.configure(vcfg);
    var reading = null;
    function feed() {
      if (reading || fed >= end) {
        if (!reading && fed >= end && !flushed) { flushed = true; dec.flush().then(function () { done = true; }, function (e) { err = e; }); }
        return;
      }
      var j = Math.min(end, fed + 12), i0 = fed; fed = j;
      reading = read(i0, j).then(function (bufs) {
        bufs.forEach(function (u, k) { var i = i0 + k; dec.decode(new EncodedVideoChunk({ type: V.key[i] ? 'key' : 'delta', timestamp: Math.round(V.cts[i] * 1e6), data: u })); });
        reading = null;
      }, function (e) { err = e; });
    }
    var n = 0, total = Math.ceil(len * fps), prevJob = job, PF = window.__vsProf = { wf: 0, we: 0, t0: performance.now() };
    function frameAt(st) {
      // מקדמים עד התמונה האחרונה שזמנה לא עבר את st
      while (q.length && q[0].timestamp / 1e6 <= st + 0.5 / fps) { if (cur) cur.close(); cur = q.shift(); }
      return !!cur && (q.length > 0 || done || cur.timestamp / 1e6 >= st - 0.5 / fps);
    }
    return (function step() {
      if (err) return Promise.reject(err);
      if (stopFlag || n >= total) return finishV();
      var ot = n / fps, st = a + ot;
      if (st <= b + 1e-6) {
        if (q.length < 8 && dec.decodeQueueSize < 8) feed();
        if (!frameAt(st)) { PF.wf++; if (done && !q.length && !cur) return Promise.reject(new Error('noframes')); return new Promise(function (r) { setTimeout(r, 4); }).then(step); }
        FR = cur; job.endK = null; paint(st);
      } else {
        FR = cur; job.endK = st - b; paint(b);
      }
      if (enc.encodeQueueSize > 6) { PF.we++; FR = null; return new Promise(function (r) { setTimeout(r, 8); }).then(step); }
      var vf = new VideoFrame(cv, { timestamp: Math.round(ot * 1e6), duration: Math.round(1e6 / fps) });
      enc.encode(vf, { keyFrame: n % (fps * 2) === 0 }); vf.close();
      n++; if (onP && n % 5 === 0) onP(Math.min(0.99, n / total));
      return (n % 3 ? Promise.resolve() : tick()).then(step);
    })();
    function finishV() {
      FR = null; fcFrom = null; if (prevJob) prevJob.endK = null;
      return enc.flush().then(function () {
        try { enc.close(); } catch (e) {} try { dec.close(); } catch (e) {}
        if (cur) cur.close(); q.forEach(function (f) { f.close(); });
      });
    }
  }

  // ---------- מנוע הקלטה ----------
  var AC = null, srcNode = null, dest = null, spk = null;
  function audio() {
    if (AC) { if (AC.state === 'suspended') AC.resume(); return true; }
    var Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return false;
    try {
      AC = new Ctx(); srcNode = AC.createMediaElementSource(vid); dest = AC.createMediaStreamDestination(); spk = AC.createGain();
      srcNode.connect(dest); srcNode.connect(spk); spk.connect(AC.destination); spk.gain.value = 0;
      try { var keep = AC.createConstantSource(); keep.offset.value = 0; keep.connect(dest); keep.start(); } catch (e) {}
      return true;
    } catch (e) { AC = null; return false; }
  }
  function mime() {
    var list = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1,opus', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    if (!window.MediaRecorder) return null;
    for (var i = 0; i < list.length; i++) if (MediaRecorder.isTypeSupported(list[i])) return list[i];
    return '';
  }
  // מנגן את [a,b] לקנבס. rec=true מקליט ומחזיר {blob,ext}; אחרת רק תצוגה עם קול
  var stopFlag = false;
  // opt.tail: שניות של שקופית סיום אחרי b (הסרטון עומד, השקופית נכנסת בעמעום, המוזיקה ממשיכה)
  // יצירה: קודם המנוע המהיר, ואם הוא לא מצליח – בזמן אמת
  function play(a, b, rec, onP, opt) {
    var tail = (opt && opt.tail) || 0;
    if (rec && file && fastOK(b - a + tail)) {
      var t0 = performance.now();
      return fastRec(a, b, onP, opt).then(function (r) {
        used('fast_ok', { secs: Math.round(b - a + tail), x: Math.round((b - a + tail) / Math.max(0.1, (performance.now() - t0) / 1000) * 10) / 10 });
        return r;
      }, function (e) {
        FR = null; if (job) job.endK = null; fastBroken = true;
        window.__vsFastErr = String(e && e.message || e);
        used('fast_fail', { err: window.__vsFastErr.slice(0, 80) });
        return playRT(a, b, rec, onP, opt);
      });
    }
    return playRT(a, b, rec, onP, opt);
  }
  function playRT(a, b, rec, onP, opt) {
    if (rec) window.__vsLast = 'realtime';
    var tail = (opt && opt.tail) || 0, endAt = 0, stopM = null, span = Math.max(0.1, b - a + tail);
    // בלי שנייה קפואה בתחילת כל חלק: המקליט של כרום צריך כשנייה להתעורר, והנגן צריך רגע אחרי קפיצה.
    // לכן מדליקים את המקליט ומיד משהים אותו (הוא מתעורר בלי להקליט), מנגנים משנייה וחצי לפני a (הנגן נתקע לרגע כשנייה אחרי קפיצה),
    // וממשיכים את ההקלטה רק כשהתמונה כבר זזה והגיעה ל-a.
    var pre = rec ? Math.max(0, a - 1.5) : a;
    return seek(pre).then(function () {
      return new Promise(function (res) {
        var m = rec ? mime() : '';
        var hasA = audio();
        if (spk) spk.gain.value = rec ? 0 : 1;
        var stream = null, mr = null, parts = [], on = !rec, t0 = vid.currentTime;
        if (rec) {
          stream = cv.captureStream(30);
          if (hasA && dest) dest.stream.getAudioTracks().forEach(function (tr) { stream.addTrack(tr); });
          mr = new MediaRecorder(stream, m ? { mimeType: m, videoBitsPerSecond: 3000000 } : { videoBitsPerSecond: 3000000 });
          mr.ondataavailable = function (e) { if (e.data && e.data.size) parts.push(e.data); };
          mr.onstop = function () {
            var type = (mr.mimeType || m || 'video/webm').split(';')[0];
            stream.getVideoTracks().forEach(function (tr) { tr.stop(); });
            res({ blob: new Blob(parts, { type: type }), ext: type.indexOf('mp4') > -1 ? 'mp4' : 'webm' });
          };
          var ready = false; mr.onstart = function () { ready = true; };
          paint(pre); mr.start(250); try { mr.pause(); } catch (e) {}
        }
        paint(pre);
        var ended = false;
        function finish() {
          if (ended) return; ended = true; vid.pause();
          if (spk) spk.gain.value = 0;
          if (stopM) { stopM(); stopM = null; }
          if (!rec) return res(null);
          if (!on) { on = true; try { mr.resume(); } catch (e) {} }
          setTimeout(function () { mr.stop(); }, 200);
        }
        function loop() {
          if (ended) return;
          var t = vid.currentTime;
          // המקליט נדלק כשהגענו ל-a והתמונה באמת זזה (בתחילת הסרטון, אין ממה להתחיל מוקדם: מחכים רק שהתמונה תזוז)
          var next = function () { if (!fired) { fired = true; loop(); } }, fired = false;
          if (endAt) {
            var k = (performance.now() - endAt) / 1000; job.endK = k; paint(b);
            if (onP) onP(Math.min(1, (b - a + k) / span));
            if (stopFlag || k >= tail) { finish(); job.endK = null; return; }
            requestAnimationFrame(next); setTimeout(next, 20); return;
          }
          if (!on && t >= a - 0.02 && t > t0 + 0.02) { on = true; paint(t); try { mr.resume(); } catch (e) {} }
          if (on && !stopM && AC && look.music !== 'none') stopM = music(AC, rec ? [dest] : [AC.destination], Math.max(1, b - t) + tail, look.music === 'soft' ? 0.5 : 0.22);
          paint(t);
          if (onP && on) onP(Math.min(1, (t - a) / span));
          if (on && tail && !stopFlag && (t >= b || vid.ended)) { endAt = performance.now(); vid.pause(); job.endK = 0; paint(b); requestAnimationFrame(next); setTimeout(next, 20); return; }
          if (stopFlag || (on && t >= b) || vid.ended) return finish();
          requestAnimationFrame(next); setTimeout(next, 20);
        }
        var w0 = performance.now();
        (function wait() {
          if (stopFlag) return finish();
          // מחכים שהמקליט יתעורר (אירוע start), לכל היותר 1.5 שניות
          if (rec && !ready && performance.now() - w0 < 1500) return setTimeout(wait, 20);
          vid.play().then(loop).catch(function () { vid.muted = true; vid.play().then(loop).catch(finish); });
        })();
      });
    });
  }
  function lock(on) {
    busy = on; prog.hidden = !on; prog.value = 0;
    Array.prototype.forEach.call(root.querySelectorAll('button.btn'), function (b) { if (b.dataset.stop == null) b.disabled = on; });
    $('vs-file').disabled = on;
    if (!on) { $('st-go').disabled = !file; $('sh-add').disabled = !file; drawClips(); }
  }
  function canRec() {
    if (mime() === null || !cv.captureStream) { say('⚠️ הדפדפן הזה לא יודע ליצור סרטון. נסו בכרום, בטלפון אנדרואיד או במחשב.'); return false; }
    return true;
  }
  function addOut(r, label, name) {
    var li = document.createElement('li'), url = URL.createObjectURL(r.blob), fn = name.replace(/[\\/:*?"<>|]/g, '').slice(0, 60) + '.' + r.ext;
    li.innerHTML = '<b></b><video controls playsinline preload="metadata"></video><div class="share-row"><button class="btn btn-gold btn-sm" type="button" data-sh><svg class="ic"><use href="#wa"/></svg> לשתף בווטסאפ</button><a class="btn btn-line btn-sm" download>לשמור</a></div>';
    li.querySelector('b').textContent = label + ' · ' + (Math.round(r.blob.size / 1048576 * 10) / 10).toString() + ' מגה' + (r.ext === 'webm' ? ' · WebM' : '');
    li.querySelector('video').src = url;
    var a = li.querySelector('a'); a.href = url; a.download = fn;
    a.addEventListener('click', function () { used('download', { what: job ? job.kind : '' }); });
    li.querySelector('[data-sh]').addEventListener('click', function () {
      var f = new File([r.blob], fn, { type: r.blob.type });
      if (navigator.canShare && navigator.canShare({ files: [f] })) navigator.share({ files: [f] }).then(function () { used('share'); }).catch(function () {});
      else { a.click(); say('הסרטון נשמר. עכשיו פותחים את הווטסאפ ומצרפים אותו מהגלריה.'); }
    });
    out.appendChild(li);
    window.__vsOut = (window.__vsOut || []).concat([{ name: fn, blob: r.blob }]);
    return li;
  }

  // ---------- 1. חלקים לסטטוס ----------
  function parts() {
    var L = +$('st-len').value;
    if (segs && segs.length) return sentParts(L);
    var n = Math.max(1, Math.ceil((dur - 0.5) / L)), list = [];
    for (var i = 0; i < n; i++) list.push([i * L, Math.min(dur, (i + 1) * L)]);
    // חלק אחרון קצרצר (פחות מ-5 שניות) מצטרף לקודם
    if (list.length > 1 && list[n - 1][1] - list[n - 1][0] < 5) { list[n - 2][1] = list[n - 1][1]; list.pop(); }
    return list;
  }
  // עם תמלול: כל חלק נגמר בהפסקה שבין משפטים, תמיד לפני הגבול (30/60) ואף פעם לא אחריו.
  // סדר עדיפויות: סוף משפט (. ? !), אחר כך כל סוף קטע בתמלול, אחר כך רווח בין מילים, ורק בלית ברירה הגבול עצמו.
  function sentParts(L) {
    var lim = L - 0.4, cuts = [[], [], []]; // 0.4 שנייה מרווח ביטחון, כי ההקלטה מוסיפה עוד רגע בסוף
    segs.forEach(function (s, i) {
      var nx = segs[i + 1]; if (!nx) return;
      var gap = nx.start - s.end, t = gap > 0 ? s.end + Math.min(0.35, gap / 2) : s.end;
      cuts[/[.?!:]["'״”]?\s*$/.test(s.text) ? 0 : 1].push(t);
      var ws = s.words || [];
      for (var k = 0; k < ws.length - 1; k++) { var g = ws[k + 1].s - ws[k].e; if (g >= 0.2) cuts[2].push(ws[k].e + Math.min(0.15, g / 2)); }
    });
    var list = [], a = 0;
    while (dur - a > lim) {
      var lo = a + L * 0.5, hi = a + lim, b = 0;
      for (var tier = 0; tier < 3 && !b; tier++) cuts[tier].forEach(function (t) { if (t > lo && t <= hi && t > b) b = t; });
      if (!b) b = a + lim;
      list.push([a, b]); a = b;
    }
    list.push([a, dur]);
    // חלק אחרון קצרצר: מצטרף לקודם אם זה לא עובר את הגבול, ואם אין בו דיבור – נשמט (זה רק שקט בסוף)
    var n = list.length;
    if (n > 1 && dur - a < 5) {
      if (dur - list[n - 2][0] <= lim) { list[n - 2][1] = dur; list.pop(); }
      else if (!segs.some(function (s) { return s.end > a + 0.1; })) list.pop();
    }
    return list;
  }
  // ביצירה המהירה (כרום במחשב ובאנדרואיד) סרטון נוצר פי 4 עד 6 מזמן אמת; אחרת בזמן אמת
  function eta(t, len) { return mmss(fastOK(len) ? Math.max(5, Math.ceil(t / 4)) : t); }
  function plan() {
    if (!file) return;
    var p = parts(), L = $('st-len').value, sent = !!(segs && segs.length);
    $('st-plan').textContent = (p.length === 1 ? 'חלק אחד' : p.length + ' חלקים') + (sent ? (p.length === 1 ? ', שנגמר בסוף משפט' : ', כל חלק נגמר בסוף משפט') : ' של עד ' + L + ' שניות') + ': ' +
      p.slice(0, 8).map(function (x) { return mmss(x[0]) + '–' + mmss(x[1]); }).join(', ') + (p.length > 8 ? ', …' : '') +
      '. זה ייקח בערך ' + eta(p[p.length - 1][1] - p[0][0], +L) + ' דקות.';
    if (tab === 'status' && !busy) still();
  }
  $('st-len').addEventListener('change', plan); $('st-pos').addEventListener('change', plan);
  $('st-go').addEventListener('click', function () {
    if (busy || !file || !canRec()) return;
    var p = parts(), i = 0, s = srcSize();
    setCanvas(s[0], s[1]); out.innerHTML = ''; lock(true); stopFlag = false;
    used('status_start', { parts: p.length, len: +$('st-len').value });
    (function next() {
      if (i >= p.length || stopFlag) { lock(false); say('✅ ' + p.length + ' החלקים מוכנים. שולחים כל אחד לסטטוס לפי הסדר.'); used('status_done', { parts: p.length }); return; }
      var last = i === p.length - 1 && endOK(), fits = last && p[i][1] - p[i][0] + TAIL <= +$('st-len').value - 0.3;
      job = { kind: 'status', n: i + 1, of: p.length, banner: last && !fits, bAt: p[i][1] };
      say('יוצר חלק ' + (i + 1) + ' מתוך ' + p.length + '…', true);
      play(p[i][0], p[i][1], true, function (x) { prog.value = (i + x) / p.length; }, { tail: fits ? TAIL : 0 }).then(function (r) {
        addOut(r, 'חלק ' + (i + 1) + '/' + p.length, fileName + ' ' + (i + 1) + ' מתוך ' + p.length);
        i++; next();
      });
    })();
  });

  // ---------- תמלול (משותף לכתוביות ולשורטים) ----------
  function month() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1); }
  function q() { var o = {}; try { o = JSON.parse(localStorage.getItem('kelim-tamlul') || '{}'); } catch (e) {} if (o.m !== month()) o = { m: month(), used: 0, free: o.free }; return o; }
  function qsave(o) { try { localStorage.setItem('kelim-tamlul', JSON.stringify(o)); } catch (e) {} }
  function quota() { var o = q(); $('vs-quota').textContent = o.free ? '' : 'תמלול בחינם ובלי הגבלה.'; }
  quota();
  function b64(blob) { return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(String(r.result).split(',')[1] || ''); }; r.onerror = rej; r.readAsDataURL(blob); }); }
  function wav(pcm) {
    var b = new ArrayBuffer(44 + pcm.length * 2), v = new DataView(b), w = function (o, s) { for (var i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + pcm.length * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 16000, true); v.setUint32(28, 32000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, pcm.length * 2, true);
    new Int16Array(b, 44).set(pcm);
    return new Blob([b], { type: 'audio/wav' });
  }
  function pieces(blob) {
    if (blob.size <= RAW_MAX && dur <= PIECE) return Promise.resolve([{ off: 0, blob: blob }]);
    return blob.arrayBuffer().then(function (buf) {
      var Ctx = window.AudioContext || window.webkitAudioContext, c;
      try { c = new Ctx({ sampleRate: 16000 }); } catch (e) { c = new Ctx(); }
      return new Promise(function (res, rej) { c.decodeAudioData(buf, res, rej); }).then(function (ab) {
        var rate = ab.sampleRate, ch0 = ab.getChannelData(0), ch1 = ab.numberOfChannels > 1 ? ab.getChannelData(1) : null;
        var step = rate / 16000, total = Math.floor(ab.length / step), per = PIECE * 16000, list = [];
        for (var s = 0; s < total; s += per) {
          var len = Math.min(per, total - s), pcm = new Int16Array(len);
          for (var i = 0; i < len; i++) { var k = Math.floor((s + i) * step), x = ch1 ? (ch0[k] + ch1[k]) / 2 : ch0[k]; pcm[i] = x < -1 ? -32768 : x > 1 ? 32767 : x * 32767; }
          list.push({ off: s / 16000, blob: wav(pcm) });
        }
        if (c.close) c.close();
        return list;
      });
    });
  }
  function runOne(p) {
    return b64(p.blob).then(function (data) {
      return fetch(API + '/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ b64: data, lang: 'he', words: true }) });
    }).then(function (r) { if (r.status === 429) throw new Error('limit'); return r.json(); }).then(function (j) {
      if (!j.token) throw new Error(j.error || 'run');
      var t0 = Date.now();
      return new Promise(function (res, rej) {
        (function tick() {
          fetch(API + '/status/' + j.token).then(function (r) { return r.json(); }).then(function (s) {
            if (s.status === 'COMPLETED') return res((s.segments || []).map(function (x) {
              return { start: x.start + p.off, end: x.end + p.off, text: x.text, words: (x.words || []).map(function (w) { return { w: w.w, s: w.s + p.off, e: w.e + p.off }; }) };
            }));
            if (s.status === 'FAILED' || s.error) return rej(new Error('failed'));
            if (Date.now() - t0 > 20 * 60e3) return rej(new Error('timeout'));
            setTimeout(tick, 3000);
          }).catch(function () { if (Date.now() - t0 > 20 * 60e3) rej(new Error('net')); else setTimeout(tick, 5000); });
        })();
      });
    });
  }
  // בלי זמן לכל מילה מהשרת: מחלקים את זמן המשפט לפי אורך המילים
  function estimate(seg) {
    var ws = seg.text.split(/\s+/).filter(Boolean), tot = ws.reduce(function (a, w) { return a + w.length + 1; }, 0), t = seg.start, span = Math.max(0.2, seg.end - seg.start);
    return ws.map(function (w) { var d = span * (w.length + 1) / tot, o = { w: w, s: t, e: t + d }; t += d; return o; });
  }
  function regroup() {
    var all = [];
    segs.forEach(function (s) {
      var ws = s.words && s.words.length ? s.words.filter(function (w) { return w.w; }) : estimate(s);
      ws.forEach(function (w, i) { all.push({ w: w.w, s: w.s, e: w.e, end: i === ws.length - 1 }); });
    });
    build(all);
  }
  // שינוי מספר השורות: בונים מחדש מהמילים שכבר נערכו
  function relines() {
    if (!groups) return;
    var all = [];
    groups.forEach(function (g) { g.words.forEach(function (w, i) { all.push({ w: w.w, s: w.s, e: w.e, end: !!w.end }); }); });
    build(all); showCaps();
  }
  function build(all) {
    var two = look.lines === '2', MW = two ? 10 : 5, MC = two ? 46 : 24;
    groups = []; var g = null;
    all.forEach(function (w, i) {
      var prev = all[i - 1];
      if (!g || g.words.length >= MW || g.chars + w.w.length > MC || (prev && (prev.end || w.s - prev.e > 0.7 || /[.?!,:;]$/.test(prev.w)))) { g = { words: [], chars: 0 }; groups.push(g); }
      g.words.push(w); g.chars += w.w.length + 1;
    });
    fixTimes();
  }
  function fixTimes() {
    groups.forEach(function (g, i) {
      var nx = groups[i + 1];
      g.s = g.words[0].s;
      g.e = Math.min(g.words[g.words.length - 1].e + 0.6, nx ? nx.words[0].s : 1e9);
      g.words.forEach(function (w, k) { w.e2 = k < g.words.length - 1 ? g.words[k + 1].s : g.e; });
    });
  }
  // תמלול הגיע (מהענן או מהשמירה במכשיר): מעדכנים את כל הלשוניות
  function gotSegs(all, cached, how) {
    segs = all; regroup();
    var exact = segs.some(function (s) { return s.words && s.words.length; });
    if (how) {
      say('✅ התמלול יובא (' + segs.length + ' שורות)' + (how === 'import_text' ? '. בטקסט לא היו זמנים, אז הזמנים משוערים לפי האורך. כדאי לצפות ולבדוק.' : '. הזמן של כל מילה משוער לפי השורה.'));
      showCaps(); showSents(); tamBtns(); plan(); still(); keep(file, segs);
      used('tamlul_import', { how: how, segs: segs.length }); return;
    }
    say(cached ? '✅ התמלול של הסרטון הזה נשמר אצלכם מהפעם הקודמת, ולא ירד מהדקות. רוצים תמלול חדש? "לתמלל מחדש".'
      : '✅ התמלול מוכן' + (exact ? '' : ' (הזמן של כל מילה משוער לפי המשפט)') + '. עוברים על הטקסט ומתקנים מה שצריך.');
    showCaps(); showSents(); tamBtns(); plan(); still();
    if (!cached) { keep(file, segs); used('tamlul_done', { secs: Math.round(dur), segs: segs.length, exact: exact ? 1 : 0 }); }
    else used('tamlul_cached', { segs: segs.length });
  }
  function tamBtns() {
    Array.prototype.forEach.call(root.querySelectorAll('[data-tamlul]'), function (b) {
      if (b.dataset.label == null) b.dataset.label = b.textContent;
      b.textContent = segs ? 'לתמלל מחדש' : b.dataset.label;
    });
  }
  // ---------- שמירת התמלול במכשיר (IndexedDB), לפי טביעה של הקובץ ----------
  function fp(f) { return [f.name, f.size, f.lastModified].join('|'); }
  function idb() {
    return new Promise(function (res, rej) {
      try {
        var r = indexedDB.open('kelim-video-shiur', 1);
        r.onupgradeneeded = function () { r.result.createObjectStore('tamlul'); };
        r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); };
      } catch (e) { rej(e); }
    });
  }
  function keep(f, s) {
    if (!f) return Promise.resolve();
    return idb().then(function (db) {
      return new Promise(function (res) {
        try { var tx = db.transaction('tamlul', 'readwrite'); tx.objectStore('tamlul').put({ segs: s, at: Date.now() }, fp(f)); tx.oncomplete = tx.onerror = tx.onabort = function () { db.close(); res(); }; }
        catch (e) { db.close(); res(); }
      });
    }).catch(function () {});
  }
  function recall(f) {
    return idb().then(function (db) {
      return new Promise(function (res) {
        try { var g = db.transaction('tamlul').objectStore('tamlul').get(fp(f)); g.onsuccess = function () { db.close(); res(g.result && g.result.segs || null); }; g.onerror = function () { db.close(); res(null); }; }
        catch (e) { db.close(); res(null); }
      });
    }).catch(function () { return null; });
  }

  Array.prototype.forEach.call(root.querySelectorAll('[data-tamlul]'), function (btn) {
    btn.addEventListener('click', function () {
      if (busy || !file) return;
      var o = q();
      if (!o.free && o.used + dur > FREE_SEC) { $('vs-limit').hidden = false; say('⚠️ הסרטון ארוך מהדקות שנשארו לתמלול החודש.'); return; }
      lock(true); say('מכין את הקול לתמלול…', true);
      var done = 0, n = 0;
      pieces(file).then(function (list) {
        n = list.length; say('מתמלל בענן' + (n > 1 ? ' (' + n + ' חלקים במקביל)' : '') + '… זה לוקח כדקה' + (n > 4 ? ' או שתיים' : '') + '.', true);
        var res = new Array(n), idx = 0;
        function worker() {
          if (idx >= n) return Promise.resolve();
          var k = idx++;
          return runOne(list[k]).then(function (r) { res[k] = r; done++; prog.value = done / n; say('מתמלל בענן… ' + done + ' מתוך ' + n, true); return worker(); });
        }
        var ws = []; for (var i = 0; i < Math.min(PAR, n); i++) ws.push(worker());
        return Promise.all(ws).then(function () { return [].concat.apply([], res); });
      }).then(function (all) {
        all = all.filter(function (s) { return s.text; });
        if (!all.length) throw new Error('empty');
        var o2 = q(); o2.used += dur; qsave(o2); quota();
        lock(false); gotSegs(all, false);
      }).catch(function (e) {
        lock(false);
        if (e && e.message === 'limit') say('⚠️ הגעתם למספר התמלולים המקסימלי להיום. נסו שוב מחר.');
        else if (e && e.message === 'empty') say('⚠️ לא נשמע דיבור בסרטון.');
        else say('⚠️ התמלול לא הצליח. בדקו את החיבור לאינטרנט ונסו שוב.');
        used('tamlul_fail', { err: e && e.message || '' });
      });
    });
  });

  // ---------- 2. כתוביות ----------
  function showCaps() {
    var box = $('kt-caps'); box.innerHTML = '';
    groups.forEach(function (g, i) {
      var l = document.createElement('label'); l.innerHTML = '<small></small><input type="text" dir="rtl">';
      l.querySelector('small').textContent = mmss(g.s);
      var inp = l.querySelector('input'); inp.value = g.words.map(function (w) { return w.w; }).join(' ');
      inp.addEventListener('focus', function () { if (!busy) seek(g.s + 0.05).then(function () { paint(vid.currentTime); }); });
      inp.addEventListener('change', function () { edit(i, inp.value); });
      box.appendChild(l);
    });
    $('kt-edit').hidden = false;
  }
  function edit(i, txt) {
    var g = groups[i], ws = txt.split(/\s+/).filter(Boolean);
    if (!ws.length) { groups.splice(i, 1); fixTimes(); showCaps(); return; }
    if (ws.length === g.words.length) ws.forEach(function (w, k) { g.words[k].w = w; });
    else {
      var s = g.words[0].s, e = g.words[g.words.length - 1].e, tot = ws.reduce(function (a, w) { return a + w.length + 1; }, 0), t = s;
      var wasEnd = !!g.words[g.words.length - 1].end;
      g.words = ws.map(function (w) { var d = (e - s) * (w.length + 1) / tot, o = { w: w, s: t, e: t + d }; t += d; return o; });
      g.words[g.words.length - 1].end = wasEnd;
    }
    fixTimes(); paint(vid.currentTime); used('caps_edit');
  }
  $('kt-color').addEventListener('change', function () { paint(vid.currentTime); });
  $('kt-pos').addEventListener('change', function () { paint(vid.currentTime); });
  $('kt-play').addEventListener('click', function () {
    if (!groups) return;
    if (busy) { stopFlag = true; return; }
    var s = srcSize(); setCanvas(s[0], s[1]); job = { kind: 'caps' };
    var b = this; lock(true); b.disabled = false; b.dataset.stop = ''; b.textContent = '■ לעצור'; stopFlag = false;
    play(0, Math.min(dur, 60), false, function (x) { prog.value = x; }).then(function () { delete b.dataset.stop; b.textContent = '▶ לצפות לפני'; lock(false); });
  });
  $('kt-go').addEventListener('click', function () {
    if (busy || !groups || !canRec()) return;
    var s = srcSize(); setCanvas(s[0], s[1]); job = { kind: 'caps' }; lock(true); stopFlag = false;
    say('צורב את הכתוביות על הסרטון… זה לוקח בערך ' + eta(dur, dur) + ' דקות.', true);
    play(0, dur, true, function (x) { prog.value = x; }, { tail: endOK() ? TAIL : 0 }).then(function (r) {
      lock(false); addOut(r, 'עם כתוביות', fileName + ' – כתוביות'); say('✅ הסרטון עם הכתוביות מוכן.');
      used('caps_done', { secs: Math.round(dur), fmt: r.ext });
    });
  });
  function srtT(t) { var ms = Math.round(t * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms % 3600000 / 60000), s = Math.floor(ms % 60000 / 1000), x = ms % 1000; return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0') + ',' + String(x).padStart(3, '0'); }
  function srt(list, off) {
    return list.map(function (g, i) { return (i + 1) + '\n' + srtT(g.s - off) + ' --> ' + srtT(g.e - off) + '\n' + g.words.map(function (w) { return w.w; }).join(' ') + '\n'; }).join('\n');
  }
  $('kt-srt').addEventListener('click', function () {
    if (!groups) return;
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + srt(groups, 0)], { type: 'application/x-subrip' }));
    a.download = fileName + '.srt'; document.body.appendChild(a); a.click(); a.remove();
    window.__vsSrt = srt(groups, 0); used('srt');
  });

  // ---------- 3. משיעור לשורטים ----------
  var pick = [-1, -1], clips = [];
  function showSents() {
    var box = $('sh-sents'); box.innerHTML = '';
    segs.forEach(function (s, i) {
      var b = document.createElement('button'); b.type = 'button'; b.dataset.i = i;
      b.innerHTML = '<small></small><span></span>'; b.querySelector('small').textContent = mmss(s.start); b.querySelector('span').textContent = s.text;
      box.appendChild(b);
    });
    box.hidden = false; marks(); showSugg();
  }

  // ---------- הצעה אוטומטית לשורטים ----------
  // מועמדים: מתחילת משפט ועד סוף משפט, 30–75 שניות. ניקוד: שאלה בהתחלה ותשובה אחריה, מילים חזקות, אורך קרוב ל-50 שניות.
  var QW = /^(למה|מדוע|מה|מהו|מהי|מהם|איך|האם|כיצד|מי|מתי|היכן|איפה|כמה|ולמה|ומה|ואיך|ומדוע)[\s,]/;
  var STRONG = /(הכי|חשוב|העיקר|עיקר|יסוד|הסוד|כלל גדול|לכן|תמיד|אף פעם|אסור|חייב|באמת|דווקא|נפלא|עצום|זה הדבר|תזכרו|שימו לב|בדיוק)/g;
  var sugg = [];
  function endsSent(s) { return /[.?!:]["'״”]?\s*$/.test(s.text); }
  function isQ(s) { var t = s.text.trim(); return /\?["'״”]?\s*$/.test(t) || QW.test(t); }
  function suggest() {
    var n = segs.length, cand = [];
    for (var i = 0; i < n; i++) {
      if (i > 0 && !endsSent(segs[i - 1]) && !isQ(segs[i])) continue;
      for (var j = i; j < n; j++) {
        var len = segs[j].end - segs[i].start;
        if (len > 75) break;
        if (len < 30 || !endsSent(segs[j]) && j < n - 1) continue;
        var q = -1, sc = 0, why;
        for (var k = i; k <= Math.min(j - 1, i + 2); k++) if (isQ(segs[k])) { q = k; break; }
        var txt = segs.slice(i, j + 1).map(function (s) { return s.text; }).join(' '), hits = (txt.match(STRONG) || []).length;
        if (q >= 0) sc += 4 - (q - i);
        sc += Math.min(3, hits * 0.7) + (/!/.test(txt) ? 0.5 : 0) + 1 - Math.abs(len - 50) / 40;
        if (/^(אבל|כי|אז|גם|וגם|ולכן|זאת אומרת|כלומר)[\s,]/.test(segs[i].text.trim())) sc -= 1.5;
        why = q >= 0 ? 'qa' : hits >= 2 ? 'strong' : 'part';
        cand.push({ i: i, j: j, q: q, a: Math.max(0, segs[i].start - 0.15), b: Math.min(dur, segs[j].end + 0.35), sc: sc, why: why, txt: txt });
      }
    }
    cand.sort(function (x, y) { return y.sc - x.sc; });
    var max = Math.max(1, Math.min(6, Math.round(dur / 90))), pick = [];
    cand.forEach(function (c) { if (pick.length < max && !pick.some(function (p) { return c.a < p.b + 2 && c.b > p.a - 2; })) pick.push(c); });
    pick.sort(function (x, y) { return x.a - y.a; });
    pick.forEach(function (c) { c.title = titleFor(c); });
    return pick;
  }
  function titleFor(c) {
    var s = '';
    if (c.q >= 0) s = segs[c.q].text;
    else {
      var best = -1;
      for (var k = c.i; k <= c.j; k++) { var h = (segs[k].text.match(STRONG) || []).length * 10 - Math.abs(segs[k].text.split(/\s+/).length - 7); if (h > best) { best = h; s = segs[k].text; } }
    }
    s = s.trim().replace(/[.,:;]+$/, '');
    var w = s.split(/\s+/); if (w.length > 10) s = w.slice(0, 10).join(' ') + '…';
    return s;
  }
  function addClip(c, title) {
    clips.push({ a: c.a, b: c.b, title: title, bg: $('sh-bg').value, caps: $('sh-caps').value === '1' });
    drawClips(); c.added = true;
  }
  function showSugg() {
    var ul = $('sh-sugg'); ul.innerHTML = '';
    sugg = segs && segs.length ? suggest() : [];
    $('sh-auto').hidden = !segs; $('sh-sugg-all').hidden = sugg.length < 2;
    if (!sugg.length) { ul.innerHTML = '<li class="vs-st">לא מצאתי קטע של 30 עד 75 שניות שמתחיל ונגמר במשפט שלם. אפשר לבחור לבד למטה.</li>'; return; }
    var WHY = { qa: 'שאלה ותשובה', strong: 'משפט חזק', part: 'רעיון שלם' };
    sugg.forEach(function (c) {
      var li = document.createElement('li');
      li.innerHTML = '<div class="vs-sg-h"><b></b><span class="vs-chip"></span></div><input type="text" maxlength="70" dir="rtl" aria-label="כותרת לשורט"><p class="vs-st"></p><div class="share-row"><button class="btn btn-line btn-sm" type="button" data-see>▶ לצפות</button><button class="btn btn-gold btn-sm" type="button" data-ok>✓ להוסיף לרשימה</button></div>';
      li.querySelector('b').textContent = mmss(c.a) + '–' + mmss(c.b) + ' · ' + Math.round(c.b - c.a) + ' שניות';
      li.querySelector('.vs-chip').textContent = WHY[c.why];
      var inp = li.querySelector('input'); inp.value = c.title;
      li.querySelector('p').textContent = c.txt.length > 160 ? c.txt.slice(0, 160) + '…' : c.txt;
      li.querySelector('[data-see]').addEventListener('click', function () {
        if (busy) return;
        $('sh-from').value = mmss(c.a); $('sh-to').value = mmss(c.b); $('sh-from').dataset.t = c.a; $('sh-to').dataset.t = c.b;
        $('sh-title').value = inp.value; pick = [c.i, c.j]; marks(); lenInfo();
        $('vs-stage').scrollIntoView({ block: 'nearest' }); $('sh-play').click(); used('suggest_see');
      });
      var ok = li.querySelector('[data-ok]');
      ok.addEventListener('click', function () {
        if (busy || c.added) return;
        addClip(c, inp.value.trim()); ok.textContent = '✓ נוסף'; ok.disabled = true; used('suggest_ok', { why: c.why });
      });
      c.btn = ok; c.inp = inp;
      ul.appendChild(li);
    });
    used('suggest', { n: sugg.length });
  }
  $('sh-sugg-all').addEventListener('click', function () {
    if (busy) return;
    var n = 0;
    sugg.forEach(function (c) { if (!c.added) { addClip(c, c.inp.value.trim()); c.btn.textContent = '✓ נוסף'; c.btn.disabled = true; n++; } });
    if (n) used('suggest_all', { n: n });
  });

  // ---------- ייבוא תמלול (SRT / VTT / טקסט מתמלול שיעור) ----------
  function tsec(x) { return String(x).trim().replace(',', '.').split(':').map(Number).reduce(function (a, b) { return a * 60 + b; }, 0); }
  function parseSubs(txt) {
    var outp = [];
    txt.split(/\n\s*\n/).forEach(function (bl) {
      var L = bl.split('\n'), k = -1;
      for (var i = 0; i < L.length; i++) if (L[i].indexOf('-->') > -1) { k = i; break; }
      if (k < 0) return;
      var m = L[k].split('-->'), t = L.slice(k + 1).join(' ').replace(/<[^>]+>/g, '').replace(/\{[^}]*\}/g, '').replace(/\s+/g, ' ').trim();
      if (t) outp.push({ start: tsec(m[0]), end: tsec(m[1].trim().split(/\s/)[0]), text: t, words: [] });
    });
    return outp;
  }
  function parsePlain(txt) {
    var re = /\[(\d{1,2}(?::\d{2}){1,2})\]/g, parts = [], last = 0, lastT = null, m;
    while ((m = re.exec(txt))) { var body = txt.slice(last, m.index); if (body.trim()) parts.push({ t: lastT, body: body }); lastT = tsec(m[1]); last = re.lastIndex; }
    parts.push({ t: lastT, body: txt.slice(last) });
    parts = parts.filter(function (p) { return p.body.trim(); });
    if (!parts.length) return [];
    if (parts[0].t == null) parts[0].t = 0;
    var outp = [];
    parts.forEach(function (p, i) {
      if (p.t == null) return;
      var body = p.body, z = i + 1;
      while (z < parts.length && parts[z].t == null) { body += ' ' + parts[z].body; z++; }
      var a = p.t, b = z < parts.length ? parts[z].t : dur; if (!(b > a)) b = a + 2;
      var chunks = [];
      (body.replace(/\s+/g, ' ').match(/[^.?!]+[.?!]*["'״”]?/g) || []).forEach(function (s) {
        var w = s.trim().split(' ').filter(Boolean);
        for (var k = 0; k < w.length; k += 14) chunks.push(w.slice(k, k + 14).join(' '));
      });
      var tot = chunks.reduce(function (x, s) { return x + s.length + 1; }, 0), t = a;
      chunks.forEach(function (s) { var d = (b - a) * (s.length + 1) / tot; outp.push({ start: t, end: t + d, text: s, words: [] }); t += d; });
    });
    return outp;
  }
  function fromDoc(h) {
    var d = new DOMParser().parseFromString(h, 'text/html');
    Array.prototype.forEach.call(d.querySelectorAll('h1,style,title,script'), function (e) { e.remove(); });
    var ps = d.querySelectorAll('p');
    if (!ps.length) return d.body ? d.body.textContent : '';
    return Array.prototype.map.call(ps, function (p) { return p.textContent; }).filter(function (t) { return !/תומלל בכלי התמלול/.test(t); }).join('\n\n');
  }
  function importText(txt) {
    if (!file) { say('⚠️ קודם בוחרים את הסרטון, ואחר כך מייבאים את התמלול שלו.'); return false; }
    if (busy) return false;
    txt = String(txt || '').replace(/^\ufeff/, '').replace(/\r/g, '');
    if (/^\s*<(!doctype|html)/i.test(txt) || /<p[\s>]/i.test(txt)) txt = fromDoc(txt);
    var subs = txt.indexOf('-->') > -1, s = subs ? parseSubs(txt) : parsePlain(txt);
    s = s.filter(function (x) { return x.text && x.end > x.start && x.start < dur + 1; });
    if (!s.length) { say('⚠️ לא מצאתי טקסט בקובץ הזה.'); return false; }
    gotSegs(s, false, subs || /\[\d/.test(txt) ? 'import_timed' : 'import_text');
    return true;
  }
  $('vs-imp-file').addEventListener('change', function () {
    var f = this.files && this.files[0], inp = this; if (!f) return;
    f.text().then(function (t) { importText(t); inp.value = ''; });
  });
  $('vs-imp-go').addEventListener('click', function () { if (importText($('vs-imp-text').value)) $('vs-imp-text').value = ''; });
  $('sh-sents').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-i]'); if (!b || busy) return;
    var i = +b.dataset.i;
    if (pick[0] < 0 || pick[1] >= 0) pick = [i, -1];
    else pick = i < pick[0] ? [i, pick[0]] : [pick[0], i];
    var a = segs[pick[0]], z = segs[pick[1] >= 0 ? pick[1] : pick[0]];
    $('sh-from').value = mmss(a.start); $('sh-to').value = mmss(Math.ceil(z.end));
    $('sh-from').dataset.t = a.start; $('sh-to').dataset.t = z.end;
    marks(); lenInfo();
    seek(a.start + 0.05).then(still);
  });
  function marks() {
    Array.prototype.forEach.call($('sh-sents').children, function (b, i) {
      var lo = pick[0], hi = pick[1] >= 0 ? pick[1] : pick[0];
      b.classList.toggle('in', lo >= 0 && i >= lo && i <= hi); b.classList.toggle('edge', i === lo || i === hi);
    });
  }
  function range() {
    var a = +($('sh-from').dataset.t || NaN), b = +($('sh-to').dataset.t || NaN);
    if (isNaN(a)) a = parseT($('sh-from').value); if (isNaN(b)) b = parseT($('sh-to').value);
    if (isNaN(a) || isNaN(b) || b <= a) return null;
    return [Math.max(0, a), Math.min(dur, b)];
  }
  function lenInfo() { var r = range(); $('sh-len').textContent = r ? Math.round(r[1] - r[0]) + ' שניות' + (r[1] - r[0] > 90 ? ' (ארוך לשורט, עדיף עד דקה וחצי)' : '') : ''; }
  ['sh-from', 'sh-to'].forEach(function (id) { $(id).addEventListener('input', function () { delete this.dataset.t; pick = [-1, -1]; marks(); lenInfo(); }); });
  $('sh-title').addEventListener('input', function () { if (tab === 'shorts' && !busy) still(); });
  $('sh-bg').addEventListener('change', function () { if (!busy) still(); });
  $('sh-caps').addEventListener('change', function () { if (!busy) still(); });
  function curClip() { var r = range(); return { a: r ? r[0] : 0, b: r ? r[1] : 0 }; }
  $('sh-add').addEventListener('click', function () {
    var r = range();
    if (!r) { say('⚠️ בוחרים התחלה וסוף: לוחצים על משפט ועוד משפט, או כותבים זמנים כמו 1:20 ו-2:05.'); return; }
    clips.push({ a: r[0], b: r[1], title: $('sh-title').value.trim(), bg: $('sh-bg').value, caps: $('sh-caps').value === '1' });
    $('sh-title').value = ''; $('sh-from').value = ''; $('sh-to').value = ''; delete $('sh-from').dataset.t; delete $('sh-to').dataset.t;
    pick = [-1, -1]; marks(); lenInfo(); drawClips(); say('');
    used('short_add', { secs: Math.round(r[1] - r[0]) });
  });
  function drawClips() {
    var ul = $('sh-clips'); ul.innerHTML = '';
    clips.forEach(function (c, i) {
      var li = document.createElement('li'); li.innerHTML = '<span></span><button type="button" aria-label="להסיר">✕</button>';
      li.querySelector('span').textContent = (i + 1) + '. ' + mmss(c.a) + '–' + mmss(c.b) + (c.title ? ' · ' + c.title : '');
      li.querySelector('button').addEventListener('click', function () { if (!busy) { clips.splice(i, 1); drawClips(); } });
      ul.appendChild(li);
    });
    $('sh-go').disabled = busy || !clips.length; $('sh-play').disabled = busy || !file;
  }
  $('sh-play').addEventListener('click', function () {
    if (busy) { stopFlag = true; return; }
    var c = clips[clips.length - 1], r = range();
    if (r) c = { a: r[0], b: r[1] };
    if (!c) return;
    setCanvas(720, 1280); job = { kind: 'short', clip: r ? {} : c };
    var b = this; lock(true); b.disabled = false; b.dataset.stop = ''; b.textContent = '■ לעצור'; stopFlag = false;
    play(c.a, c.b, false, function (x) { prog.value = x; }, { tail: endOK() ? TAIL : 0 }).then(function () { delete b.dataset.stop; b.textContent = '▶ לצפות בקטע'; lock(false); });
  });
  $('sh-go').addEventListener('click', function () {
    if (busy || !clips.length || !canRec()) return;
    setCanvas(720, 1280); lock(true); stopFlag = false; var i = 0, n = clips.length;
    used('shorts_start', { n: n });
    (function next() {
      if (i >= n || stopFlag) { lock(false); say('✅ השורטים מוכנים. אפשר לשתף כל אחד בנפרד.'); used('shorts_done', { n: n }); return; }
      var c = clips[i]; job = { kind: 'short', clip: c };
      say('יוצר שורט ' + (i + 1) + ' מתוך ' + n + '…', true);
      play(c.a, c.b, true, function (x) { prog.value = (i + x) / n; }, { tail: endOK() ? TAIL : 0 }).then(function (r) {
        addOut(r, 'שורט ' + (i + 1) + (c.title ? ': ' + c.title : ''), (c.title || fileName) + ' – שורט ' + (i + 1));
        i++; next();
      });
    })();
  });

  // לבדיקות: טעינת קובץ מכתובת ותמלול מוכן
  window.__vs = { load: function (blob, name, lm) { return load(new File([blob], name || 'test.mp4', { type: blob.type || 'video/mp4', lastModified: lm || Date.now() })); }, setSegs: function (s) { gotSegs(s, false); }, parts: function () { return parts(); }, rec: function (a, b) { return play(a, b, true).then(function (r) { window.__vsOut = (window.__vsOut || []).concat([{ name: 'rec.' + r.ext, blob: r.blob }]); return r.blob.size; }); }, get groups() { return groups; }, get segs() { return segs; }, clips: function () { return clips; }, setTab: setTab, look: look, bench: function (n) { still(); var t = performance.now(); for (var i = 0; i < n; i++) paint(vid.currentTime); return (performance.now() - t) / n; }, fastOK: function (l) { return fastOK(l || 1); }, demux: function () { return demux().then(function (d) { return { v: d.v && { n: d.v.n, fps: d.v.fps, codec: vCodec(d.v), w: d.v.w, h: d.v.h, t0: d.v.cts[0] }, a: d.a && { n: d.a.n, rate: d.a.rate, ch: d.a.ch, t0: d.a.cts[0] } }; }); }, endPreview: endPreview, importText: importText, get sugg() { return sugg; } };
})();
