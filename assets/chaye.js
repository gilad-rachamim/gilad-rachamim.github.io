// תמונה שמתעוררת (/kelim/tochen/chaye/): תמונה אחת → סרטון קצר בתלת-ממד ("2.5D").
// 1) מפת עומק: Depth Anything V2 Small (ONNX, q8) שרץ בדפדפן עם onnxruntime-web (wasm) – הכול מ-/assets/vendor, בלי CDN.
// 2) WebGL מזיז כל פיקסל לפי העומק שלו (קרוב זז יותר מרחוק) → תנועת מצלמה עם פרלקסה.
// 3) canvas דו-ממדי מוסיף אווירה, כיתוב ורקע מטושטש; MediaRecorder מקליט עם מנגינה מ-WebAudio (כמו במצגת לאירוע).
// פרטיות: התמונה לא נשלחת לשום מקום. המודל והמנוע נשמרים ב-Cache Storage ('chaye-v1') אחרי הורדה ראשונה.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var cv = $('ch-canvas'), form = $('ch-form');
  if (!cv || !form) return;
  var ctx = cv.getContext('2d');
  var VENDOR = '/assets/vendor/onnxruntime-web/';
  var MODEL = '/assets/vendor/depth-anything/depth-anything-v2-small-q8.onnx';
  var CACHE = 'chaye-v1', KEY = 'chaye-v1';
  var SERIF = '"Frank Ruhl Libre", "David Libre", David, serif';
  var MAX_IMG = 1600;

  var src = null;      // canvas עם התמונה (מוקטנת)
  var depth = null;    // {w,h,data:Uint8Array} אחרי החלקה
  var isDemo = false, busy = false, recording = false, result = null;

  // ---------- הגדרות שנשמרות בטלפון ----------
  function val(n) { var el = form.elements[n]; if (!el) return ''; return el.value !== undefined ? el.value : ''; }
  function save() {
    try {
      var o = {}; ['move', 'power', 'secs', 'fx', 'music', 'size', 'title'].forEach(function (n) { o[n] = val(n); });
      localStorage.setItem(KEY, JSON.stringify(o));
    } catch (e) {}
  }
  function restore() {
    try {
      var o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (!o) return;
      Object.keys(o).forEach(function (n) {
        var el = form.elements[n]; if (!el) return;
        if (el.length !== undefined && el.tagName !== 'SELECT') { for (var i = 0; i < el.length; i++) el[i].checked = el[i].value === o[n]; }
        else el.value = o[n];
      });
    } catch (e) {}
  }
  function used(how, extra) {
    if (!window.toolUsed) return;
    var o = { how: how, move: val('move') };
    if (extra) for (var k in extra) o[k] = extra[k];
    window.toolUsed('chaye', o);
  }
  function info(t) { $('ch-info').textContent = t || ''; }
  function setBusy(on, text, p) {
    $('ch-busy').hidden = !on;
    if (text) $('ch-busy-t').textContent = text;
    var pg = $('ch-busy-p');
    if (p === undefined || p === null) pg.removeAttribute('value'); else pg.value = p;
  }

  // ---------- טעינה עם שמירה בטלפון ----------
  function openCache() { try { return window.caches ? caches.open(CACHE).catch(function () { return null; }) : Promise.resolve(null); } catch (e) { return Promise.resolve(null); } }
  function cachedBuf(url, onProg) {
    return openCache().then(function (c) {
      return (c ? c.match(url).catch(function () { return null; }) : Promise.resolve(null)).then(function (hit) {
        if (hit) return hit.arrayBuffer();
        return fetch(url).then(function (r) {
          if (!r.ok) throw new Error('http ' + r.status);
          var total = +r.headers.get('content-length') || 0;
          if (!r.body || !r.body.getReader || !total) return r.arrayBuffer();
          var rd = r.body.getReader(), got = 0, parts = [];
          return (function pump() {
            return rd.read().then(function (x) {
              if (x.done) {
                var out = new Uint8Array(got), o = 0;
                parts.forEach(function (p) { out.set(p, o); o += p.length; });
                return out.buffer;
              }
              parts.push(x.value); got += x.value.length; onProg && onProg(got / total);
              return pump();
            });
          })();
        }).then(function (buf) {
          if (c) c.put(url, new Response(buf.slice(0), { headers: { 'content-type': 'application/octet-stream' } })).catch(function () {});
          return buf;
        });
      });
    });
  }
  // ה-service worker של האתר שומר עותק נוסף של כל קובץ ב-/assets/; את הקבצים הגדולים מוחקים משם (הם כבר שמורים אצלנו)
  function dropSwCopies() {
    try {
      if (!window.caches) return;
      caches.keys().then(function (keys) {
        keys.filter(function (k) { return k !== CACHE && /^kelim-/.test(k); }).forEach(function (k) {
          caches.open(k).then(function (c) {
            [MODEL, VENDOR + 'ort-wasm-simd-threaded.wasm'].forEach(function (u) {
              c.keys().then(function (reqs) { reqs.forEach(function (rq) { if (new URL(rq.url).pathname === u) c.delete(rq); }); });
            });
          });
        });
      }).catch(function () {});
    } catch (e) {}
  }
  function loadScript(u) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = u; s.onload = res; s.onerror = function () { rej(new Error('script')); };
      document.head.appendChild(s);
    });
  }
  function hasCached() {
    return openCache().then(function (c) { return c ? c.match(MODEL).then(function (h) { return !!h; }) : false; }).catch(function () { return false; });
  }

  var sessionP = null;
  function getSession() {
    if (sessionP) return sessionP;
    sessionP = (window.ort ? Promise.resolve() : loadScript(VENDOR + 'ort.wasm.min.js')).then(function () {
      var ort = window.ort;
      ort.env.wasm.numThreads = 1;      // GitHub Pages בלי cross-origin isolation → בלי threads
      ort.env.wasm.wasmPaths = VENDOR;
      var pw = 0, pm = 0, show = function () { setBusy(true, 'מוריד את מנוע העומק (פעם אחת בלבד)… ' + Math.round((pw * 15 + pm * 27) / 42 * 100) + '%', (pw * 15 + pm * 27) / 42); };
      return Promise.all([
        cachedBuf(VENDOR + 'ort-wasm-simd-threaded.wasm', function (p) { pw = p; show(); }),
        cachedBuf(MODEL, function (p) { pm = p; show(); })
      ]).then(function (b) {
        ort.env.wasm.wasmBinary = b[0];
        setBusy(true, 'מכין את מנוע העומק…', null);
        return ort.InferenceSession.create(new Uint8Array(b[1]), { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
      });
    }).then(function (s) { dropSwCopies(); return s; });
    sessionP.catch(function () { sessionP = null; });
    return sessionP;
  }

  function estimateDepth(c) {
    return getSession().then(function (sess) {
      setBusy(true, 'מחשב את העומק של התמונה… (כמה שניות)', null);
      return new Promise(function (r) { setTimeout(r, 60); }).then(function () {
        var w = c.width, h = c.height, s = 518 / Math.max(w, h);
        var W = Math.max(14, Math.round(w * s / 14) * 14), H = Math.max(14, Math.round(h * s / 14) * 14);
        var t = document.createElement('canvas'); t.width = W; t.height = H;
        var tc = t.getContext('2d'); tc.imageSmoothingQuality = 'high'; tc.drawImage(c, 0, 0, W, H);
        var px = tc.getImageData(0, 0, W, H).data, n = W * H, f = new Float32Array(3 * n);
        var mean = [0.485, 0.456, 0.406], std = [0.229, 0.224, 0.225];
        for (var i = 0; i < n; i++) for (var k = 0; k < 3; k++) f[k * n + i] = (px[i * 4 + k] / 255 - mean[k]) / std[k];
        var feeds = {}; feeds[sess.inputNames[0]] = new window.ort.Tensor('float32', f, [1, 3, H, W]);
        return sess.run(feeds).then(function (out) {
          var o = out[sess.outputNames[0]], d = o.data, dims = o.dims, oh = dims[dims.length - 2], ow = dims[dims.length - 1];
          var mn = Infinity, mx = -Infinity, j;
          for (j = 0; j < d.length; j++) { if (d[j] < mn) mn = d[j]; if (d[j] > mx) mx = d[j]; }
          var u = new Uint8Array(ow * oh), sc = 255 / ((mx - mn) || 1);
          for (j = 0; j < u.length; j++) u[j] = Math.max(0, Math.min(255, (d[j] - mn) * sc));
          return { w: ow, h: oh, data: u };
        });
      });
    });
  }

  // החלקה: מרחיבים קצת את הקרוב (max) ומטשטשים, כדי שהקצוות של אנשים לא ייקרעו בתנועה
  function smooth(D) {
    var w = D.w, h = D.h, a = D.data, b = new Uint8Array(w * h), x, y, i, j, m, r = 2;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      m = 0;
      for (j = -r; j <= r; j++) { var yy = Math.min(h - 1, Math.max(0, y + j)); for (i = -r; i <= r; i++) { var v = a[yy * w + Math.min(w - 1, Math.max(0, x + i))]; if (v > m) m = v; } }
      b[y * w + x] = m;
    }
    function blur(s) {
      var t = new Float32Array(w * h), o = new Uint8Array(w * h), R = 3, sum, k;
      for (y = 0; y < h; y++) { for (x = 0; x < w; x++) { sum = 0; for (k = -R; k <= R; k++) sum += s[y * w + Math.min(w - 1, Math.max(0, x + k))]; t[y * w + x] = sum / (2 * R + 1); } }
      for (y = 0; y < h; y++) { for (x = 0; x < w; x++) { sum = 0; for (k = -R; k <= R; k++) sum += t[Math.min(h - 1, Math.max(0, y + k)) * w + x]; o[y * w + x] = sum / (2 * R + 1); } }
      return o;
    }
    return { w: w, h: h, data: blur(blur(b)) };
  }

  // ---------- WebGL ----------
  var gc = document.createElement('canvas'), gl = null, prog = null, texImg = null, texDep = null, U = {};
  var VS = 'attribute vec2 a;varying vec2 v;void main(){v=vec2(a.x*.5+.5,.5-a.y*.5);gl_Position=vec4(a,0.,1.);}';
  var FS = [
    'precision highp float;',
    'uniform sampler2D uImg,uDep;uniform vec2 uOff,uPan;uniform float uZoom,uDolly,uFocus;varying vec2 v;',
    'void main(){',
    ' vec2 c=vec2(.5);vec2 p=c+(v-c)/uZoom+uPan;vec2 q=p;',
    ' for(int i=0;i<12;i++){float d=texture2D(uDep,q).r-uFocus;vec2 tg=p-uOff*d-(p-c)*uDolly*d;q=mix(q,tg,.6);}',
    ' gl_FragColor=texture2D(uImg,clamp(q,vec2(.001),vec2(.999)));',
    '}'].join('\n');
  function initGL() {
    if (gl) return true;
    try { gl = gc.getContext('webgl', { preserveDrawingBuffer: true, premultipliedAlpha: false }) || gc.getContext('experimental-webgl'); } catch (e) { gl = null; }
    if (!gl) return false;
    function sh(t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; }
    prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { gl = null; return false; }
    gl.useProgram(prog);
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ['uImg', 'uDep', 'uOff', 'uPan', 'uZoom', 'uDolly', 'uFocus'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
    texImg = gl.createTexture(); texDep = gl.createTexture();
    return true;
  }
  function setTex(tex, unit, fmt, w, h, data) {
    gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    if (data instanceof Uint8Array) gl.texImage2D(gl.TEXTURE_2D, 0, fmt, w, h, 0, fmt, gl.UNSIGNED_BYTE, data);
    else gl.texImage2D(gl.TEXTURE_2D, 0, fmt, fmt, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
  function upload() {
    if (!initGL()) return false;
    setTex(texImg, 0, gl.RGBA, src.width, src.height, src);
    setTex(texDep, 1, gl.LUMINANCE, depth.w, depth.h, depth.data);
    gl.uniform1i(U.uImg, 0); gl.uniform1i(U.uDep, 1);
    return true;
  }

  // ---------- התנועות ----------
  function ease(t) { return 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, t))); }
  function camera(t) {
    var P = +val('power') || 1, A = 0.03 * P, e = ease(t), Z0 = 1.02 + 2 * A;
    var c = { zoom: Z0, dolly: 0, focus: 0.5, ox: 0, oy: 0, px: 0, py: 0 };
    switch (val('move')) {
      case 'side': c.ox = A * (2 * e - 1); c.zoom = Z0 + 0.03; break;
      case 'orbit': var g = 2 * Math.PI * t; c.ox = A * Math.cos(g); c.oy = A * 0.6 * Math.sin(g); c.zoom = Z0 + 0.03; break;
      case 'rise': c.oy = A * (1 - 2 * e); c.zoom = Z0 + 0.02 + 0.05 * e; break;
      case 'vertigo': c.zoom = Z0 + 0.02; c.focus = 1; c.dolly = -0.22 * P * e; break;
      default: c.focus = 0; c.zoom = Z0 + 0.14 * e; c.dolly = 0.13 * P * e; // in
    }
    return c;
  }

  // ---------- ציור פריים ----------
  function outSize() {
    var s = val('size'), w = src ? src.width : 4, h = src ? src.height : 3;
    if (s === 'story') return [720, 1280];
    if (s === 'square') return [1080, 1080];
    var k = 1280 / Math.max(w, h); return [Math.round(w * k / 2) * 2, Math.round(h * k / 2) * 2];
  }
  function layout() {
    var o = outSize(), W = o[0], H = o[1], ia = src.width / src.height;
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    var fw = W, fh = W / ia; if (fh > H) { fh = H; fw = H * ia; }
    var cover = (fw * fh) / (W * H) > 0.8;
    if (cover) { fw = W; fh = W / ia; if (fh < H) { fh = H; fw = H * ia; } }
    var gw = Math.round(Math.min(fw, src.width * 1.2)), gh = Math.round(gw / ia);
    if (gc.width !== gw || gc.height !== gh) { gc.width = gw; gc.height = gh; }
    return { W: W, H: H, x: (W - fw) / 2, y: (H - fh) / 2, w: fw, h: fh, cover: cover };
  }
  var PARTS = [];
  (function () { var s = 7; function r() { s = (s * 16807) % 2147483647; return s / 2147483647; } for (var i = 0; i < 46; i++) PARTS.push([r(), r(), r(), r(), r()]); })();
  function frame(t, T) {
    if (!src || !depth || !gl) return;
    var L = layout(), W = L.W, H = L.H, m = Math.min(W, H), c = camera(t / T);
    gl.viewport(0, 0, gc.width, gc.height);
    gl.uniform2f(U.uOff, c.ox, c.oy * src.width / src.height);
    gl.uniform2f(U.uPan, c.px, c.py);
    gl.uniform1f(U.uZoom, c.zoom); gl.uniform1f(U.uDolly, c.dolly); gl.uniform1f(U.uFocus, c.focus);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    ctx.save();
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    if (!L.cover) { // רקע: אותה תמונה, מוגדלת ומטושטשת
      var bw = W, bh = W * gc.height / gc.width; if (bh < H) { bh = H; bw = H * gc.width / gc.height; }
      if ('filter' in ctx) ctx.filter = 'blur(' + Math.round(m / 28) + 'px) brightness(.55)';
      ctx.drawImage(gc, (W - bw) / 2, (H - bh) / 2, bw, bh);
      ctx.filter = 'none';
      if (!('filter' in ctx)) { ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, W, H); }
    }
    ctx.drawImage(gc, L.x, L.y, L.w, L.h);
    ctx.beginPath(); ctx.rect(L.x, L.y, L.w, L.h); ctx.clip();
    var fx = val('fx'), p = t / T;
    if (fx === 'warm') {
      ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = 'rgba(255,170,90,.45)'; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
    }
    if (fx === 'dust') {
      ctx.globalCompositeOperation = 'lighter';
      PARTS.forEach(function (q) {
        var x = L.x + ((q[0] + 0.03 * Math.sin(6.283 * (q[3] + p * (0.4 + q[2])))) % 1) * L.w;
        var y = L.y + (((q[1] - p * (0.08 + 0.12 * q[2])) % 1 + 1) % 1) * L.h;
        var r = m * (0.002 + 0.006 * q[4] * q[4]), a = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(6.283 * (q[3] * 3 + p * 2)));
        var g = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
        g.addColorStop(0, 'rgba(255,240,205,' + (a * 0.9).toFixed(3) + ')'); g.addColorStop(0.35, 'rgba(255,225,170,' + (a * 0.35).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,220,160,0)');
        ctx.fillStyle = g; ctx.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
      });
      ctx.globalCompositeOperation = 'source-over';
    }
    if (fx === 'glow') {
      var k = -0.4 + 1.8 * ease((p - 0.1) / 0.8), cx = L.x + L.w * (1 - k), gr = ctx.createLinearGradient(cx - m * 0.5, 0, cx + m * 0.5, H * 0.4);
      gr.addColorStop(0, 'rgba(255,240,210,0)'); gr.addColorStop(0.5, 'rgba(255,240,210,.22)'); gr.addColorStop(1, 'rgba(255,240,210,0)');
      ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over';
    }
    // ויגנט עדין
    var vg = ctx.createRadialGradient(W / 2, H / 2, m * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.56);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, fx === 'warm' ? 'rgba(25,10,0,.55)' : 'rgba(0,0,0,.38)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    ctx.restore();

    var title = val('title').trim();
    if (title) {
      var ta = Math.max(0, Math.min(1, (t - T * 0.45) / 0.9));
      if (ta > 0) {
        var fs = Math.round(Math.min(m * 0.075, W * 0.9 / Math.max(6, title.length * 0.52)));
        ctx.save(); ctx.globalAlpha = ta; ctx.direction = 'rtl'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        var by = L.cover ? H * 0.9 : Math.min(H * 0.93, L.y + L.h + (H - L.y - L.h) * 0.55 + fs * 0.35);
        var gg = ctx.createLinearGradient(0, by - fs * 2.4, 0, H); gg.addColorStop(0, 'rgba(0,0,0,0)'); gg.addColorStop(1, 'rgba(0,0,0,.5)');
        ctx.fillStyle = gg; ctx.fillRect(0, by - fs * 2.4, W, H - by + fs * 2.4);
        ctx.font = '700 ' + fs + 'px ' + SERIF; ctx.shadowColor = 'rgba(0,0,0,.65)'; ctx.shadowBlur = fs * 0.35;
        ctx.fillStyle = '#fff8e8'; ctx.fillText(title, W / 2, by - (ta < 1 ? (1 - ta) * fs * 0.4 : 0));
        ctx.restore();
      }
    }
    // יציאה רכה לשחור (בלי כניסה משחור: אם המקליט מתעכב בהתחלה, רואים את התמונה ולא מסך שחור)
    var fade = Math.min(1, (T - t) / 0.45);
    if (fade < 1) { ctx.fillStyle = 'rgba(0,0,0,' + (1 - Math.max(0, fade)).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
  }

  // ---------- תצוגה חיה ----------
  var previewOn = false, pStart = 0;
  function secs() { return +val('secs') || 7; }
  function preview() {
    if (previewOn) return; previewOn = true; pStart = performance.now();
    (function tick() {
      if (!previewOn) return;
      if (!recording) { var T = secs(); frame(((performance.now() - pStart) / 1000) % T, T); }
      var done = false, go = function () { if (!done) { done = true; tick(); } };
      requestAnimationFrame(go); setTimeout(go, 40);
    })();
  }
  function placeholder(text) {
    cv.width = 1280; cv.height = 960;
    ctx.fillStyle = '#10141c'; ctx.fillRect(0, 0, 1280, 960);
    ctx.direction = 'rtl'; ctx.textAlign = 'center'; ctx.font = '600 44px "Assistant", Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillText(text, 640, 480);
  }

  // ---------- תמונות ----------
  function toCanvas(img) {
    var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height, k = Math.min(1, MAX_IMG / Math.max(w, h));
    var c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
    var x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, c.width, c.height);
    return c;
  }
  function loadImg(url) {
    return new Promise(function (res, rej) { var im = new Image(); im.onload = function () { res(im); }; im.onerror = function () { rej(new Error('img')); }; im.src = url; });
  }
  function ready(c, D, demo) {
    src = c; depth = smooth(D); isDemo = demo; result = null; $('ch-result').hidden = true;
    if (!upload()) { info('הדפדפן הזה לא תומך בתלת-ממד (WebGL). נסו בכרום או בספארי מעודכנים.'); return; }
    setBusy(false); preview(); warmEncoder();
    info(demo ? 'זו התמונה לדוגמה – בחרו תמונה משלכם, או נסו תנועה אחרת למטה.' : 'מוכן! בחרו תנועה ואווירה, ואז "ליצור את הסרטון".');
  }
  function loadDemo() {
    return Promise.all([loadImg('/assets/chaye-demo.jpg'), loadImg('/assets/chaye-demo-depth.png')]).then(function (a) {
      var dc = document.createElement('canvas'); dc.width = a[1].naturalWidth; dc.height = a[1].naturalHeight;
      var x = dc.getContext('2d'); x.drawImage(a[1], 0, 0);
      var px = x.getImageData(0, 0, dc.width, dc.height).data, u = new Uint8Array(dc.width * dc.height);
      for (var i = 0; i < u.length; i++) u[i] = px[i * 4];
      ready(toCanvas(a[0]), { w: dc.width, h: dc.height, data: u }, true);
    });
  }
  $('ch-demo').addEventListener('click', function () { if (busy || recording) return; loadDemo(); used('demo'); });
  $('ch-file').addEventListener('change', function () {
    var f = this.files && this.files[0]; this.value = '';
    if (!f || busy || recording) return;
    busy = true; info(''); setBusy(true, 'פותח את התמונה…', null);
    var url = URL.createObjectURL(f), c;
    loadImg(url).then(function (im) {
      c = toCanvas(im); URL.revokeObjectURL(url);
      return estimateDepth(c);
    }, function () { URL.revokeObjectURL(url); throw new Error('open'); }).then(function (D) {
      busy = false; ready(c, D, false); used('photo');
    }).catch(function (e) {
      busy = false; setBusy(false);
      info(e && e.message === 'open' ? 'לא הצלחתי לפתוח את התמונה. נסו תמונה בפורמט JPG או PNG (אפשר צילום מסך שלה).'
        : 'משהו השתבש בחישוב העומק. בדקו שיש אינטרנט (בפעם הראשונה מורידים את המנוע) ונסו שוב.');
      if (window.console) console.warn('chaye', e);
    });
  });

  // ---------- מנגינה (WebAudio, נוצרת כאן – כמו במצגת לאירוע) ----------
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  var MOODS = {
    joy: { ch: [[50, 54, 57, 62], [45, 49, 52, 57], [47, 50, 54, 59], [43, 47, 50, 55]], bar: 2.4, arp: [0, 1, 2, 3, 2, 1], step: 0.4, pad: 0.04, bell: 0.055, lp: 2600, bass: true },
    calm: { ch: [[45, 52, 57, 60], [41, 48, 53, 57], [48, 52, 55, 60], [43, 50, 55, 59]], bar: 3.2, arp: [1, 2, 3, 2], step: 0.8, pad: 0.055, bell: 0.035, lp: 1300, bass: false }
  };
  function music(ac, dest, dur, mo, lead) {
    var M = MOODS[mo] || MOODS.calm, t0 = ac.currentTime + (lead || 0.05), master = ac.createGain(), lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = M.lp;
    master.gain.setValueAtTime(0, t0); master.gain.linearRampToValueAtTime(0.7, t0 + 1.2);
    master.gain.setValueAtTime(0.7, t0 + Math.max(1.3, dur - 1.6)); master.gain.linearRampToValueAtTime(0, t0 + dur);
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
  function newAC() { var A = window.AudioContext || window.webkitAudioContext; return A ? new A() : null; }

  // ---------- יצירת הסרטון ----------
  // בפעם הראשונה בדפדפן, מקודד הווידאו נטען כמה שניות, והסרטון היה נפתח בתמונה עומדת.
  // לכן מחממים אותו מראש: הקלטה קטנה של חצי שנייה ברקע, שנזרקת.
  var warmed = false;
  function warmEncoder() {
    if (warmed) return; warmed = true;
    try {
      var m = mime(); if (m === null) return;
      var c = document.createElement('canvas'); c.width = 64; c.height = 64; var x = c.getContext('2d');
      if (!c.captureStream) return;
      var s = c.captureStream(30), r = new MediaRecorder(s, m ? { mimeType: m } : {}), n = 0;
      var iv = setInterval(function () { x.fillStyle = n++ % 2 ? '#123' : '#321'; x.fillRect(0, 0, 64, 64); }, 40);
      r.start(100);
      setTimeout(function () { clearInterval(iv); try { r.stop(); } catch (e) {} s.getTracks().forEach(function (t) { t.stop(); }); }, 700);
    } catch (e) {}
  }
  function mime() {
    var list = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1,opus', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    if (!window.MediaRecorder) return null;
    for (var i = 0; i < list.length; i++) if (MediaRecorder.isTypeSupported(list[i])) return list[i];
    return '';
  }
  $('ch-make').addEventListener('click', function () {
    if (recording || busy) return;
    if (!src || !depth) { info('קודם בוחרים תמונה.'); return; }
    var m = mime();
    if (m === null || !cv.captureStream) { info('הדפדפן הזה לא יודע ליצור סרטון. נסו בכרום, בטלפון אנדרואיד או במחשב.'); return; }
    var b = this, pg = $('ch-prog'), T = secs(), mo = val('music');
    recording = true; b.disabled = true; b.textContent = 'יוצר סרטון…';
    $('ch-result').hidden = true; pg.hidden = false; pg.value = 0; info('יוצר את הסרטון – להישאר בדף…');
    frame(0, T);
    var stream = cv.captureStream(30), a = null, d = null, ok = false, st = null;
    if (mo !== 'none') {
      a = newAC();
      if (a) { d = a.createMediaStreamDestination(); try { var keep = a.createConstantSource(); keep.offset.value = 0; keep.connect(d); keep.start(); } catch (e) {} d.stream.getAudioTracks().forEach(function (tr) { stream.addTrack(tr); }); }
    }
    var bits = cv.width * cv.height > 800000 ? 5000000 : 3500000;
    var rec = new MediaRecorder(stream, m ? { mimeType: m, videoBitsPerSecond: bits } : { videoBitsPerSecond: bits }), parts = [];
    rec.ondataavailable = function (e) { if (e.data && e.data.size) { ok = true; parts.push(e.data); } };
    rec.onstop = function () {
      var type = (rec.mimeType || m || 'video/webm').split(';')[0];
      result = { blob: new Blob(parts, { type: type }), ext: type.indexOf('mp4') > -1 ? 'mp4' : 'webm' };
      window.__chResult = result; // לבדיקות
      var v = $('ch-video'); v.src = URL.createObjectURL(result.blob);
      $('ch-result').hidden = false; pg.hidden = true;
      $('ch-fmt').textContent = result.ext === 'mp4' ? 'הסרטון בפורמט MP4, מתאים לווטסאפ, לסטטוס וליוטיוב.' : 'הסרטון נשמר בפורמט WebM. ווטסאפ בטלפון מעדיף MP4: כדאי ליצור אותו בכרום מעודכן או באייפון.';
      recording = false; b.disabled = false; b.textContent = '🎬 ליצור את הסרטון';
      info('הסרטון מוכן (' + Math.round(result.blob.size / 1048576 * 10) / 10 + ' MB). אפשר לצפות, לשמור ולשתף.');
      a && a.close();
      $('ch-result').scrollIntoView({ behavior: 'smooth', block: 'center' });
      used('create', { fmt: result.ext, secs: T, fx: val('fx'), size: val('size'), demo: isDemo ? 1 : 0 });
    };
    rec.start(250);
    var began = performance.now(), clock = null, t0 = 0;
    (function wait() {
      if (!clock) {
        if (!ok || performance.now() - began < 600) { frame(0, T); return setTimeout(wait, 30); }
        if (d) { st = music(a, [d], T, mo, 0.4); clock = function () { return a.currentTime - st.t0; }; }
        else { t0 = performance.now() + 300; clock = function () { return (performance.now() - t0) / 1000; }; }
      }
      var t = clock();
      if (t < 0) { frame(0, T); return setTimeout(wait, 30); }
      if (t >= T) {
        frame(T - 0.001, T);
        return setTimeout(function () { rec.stop(); stream.getTracks().forEach(function (tr) { tr.stop(); }); }, 250);
      }
      frame(t, T); pg.value = t / T;
      var done = false, go = function () { if (!done) { done = true; wait(); } };
      requestAnimationFrame(go); setTimeout(go, 33);
    })();
  });

  function baseName() { return (val('title').trim() || 'תמונה שמתעוררת').replace(/[\\/:*?"<>|]/g, '').slice(0, 50); }
  function saveBlob(blob, name) { var x = document.createElement('a'); x.href = URL.createObjectURL(blob); x.download = name; document.body.appendChild(x); x.click(); x.remove(); }
  $('ch-dl').addEventListener('click', function () { if (result) { saveBlob(result.blob, baseName() + '.' + result.ext); used('download'); } });
  $('ch-share').addEventListener('click', function () {
    if (!result) return;
    var f = new File([result.blob], baseName() + '.' + result.ext, { type: result.blob.type });
    if (navigator.canShare && navigator.canShare({ files: [f] })) {
      navigator.share({ files: [f], text: 'יצרתי סרטון תלת-ממד מתמונה, בחינם: https://hakelim.com/kelim/tochen/chaye/' }).then(function () { used('share'); }).catch(function () {});
    } else { saveBlob(result.blob, f.name); $('ch-tip').hidden = false; used('download_fallback'); }
  });

  // ---------- החייאה בענן (tools/chaye-worker → Runpod) ----------
  var AI = 'https://kelim-chaye.gilad4049.workers.dev';
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && window.__chAI) AI = window.__chAI; // בדיקות
  var aiBusy = false, aiBlob = null, CODE_KEY = 'chaye-code';
  // קוד שותף (20 ₪ לשירות הענן = בלי הגבלה) נשמר בטלפון
  try { var sc = localStorage.getItem(CODE_KEY); if (sc) { $('ch-code').value = sc; $('ch-partner').open = true; } } catch (e) {}
  $('ch-code').addEventListener('input', function () { try { localStorage.setItem(CODE_KEY, this.value.trim()); } catch (e) {} });
  function code() { return $('ch-code').value.replace(/\s/g, ''); }
  function aiInfo(t) { $('ch-ai-info').textContent = t || ''; }
  function aiStyle() { var r = document.querySelector('input[name=aist]:checked'); return r ? r.value : 'smile'; }
  function photoData() {
    var k = Math.min(1, 1024 / Math.max(src.width, src.height)), c = document.createElement('canvas');
    c.width = Math.round(src.width * k); c.height = Math.round(src.height * k);
    var x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.88);
  }
  function sleepMs(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  $('ch-ai-go').addEventListener('click', function () {
    if (aiBusy) return;
    if (!src) { aiInfo('קודם בוחרים תמונה למעלה.'); return; }
    if (!$('ch-ok').checked) { aiInfo('צריך לסמן שיש לכם רשות להשתמש בתמונה.'); $('ch-ok').focus(); return; }
    var b = this, pg = $('ch-ai-prog'), st = aiStyle(), t0 = Date.now();
    aiBusy = true; b.disabled = true; aiBlob = null; $('ch-ai-result').hidden = true;
    pg.hidden = false; pg.value = 0.03; aiInfo('שולח את התמונה לענן…');
    var tick = setInterval(function () { var s = (Date.now() - t0) / 1000; pg.value = Math.min(0.95, 0.03 + s / 80); }, 500);
    function end(msg) { clearInterval(tick); aiBusy = false; b.disabled = false; pg.hidden = true; if (msg) aiInfo(msg); }
    fetch(AI + '/animate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ image: photoData(), style: st, code: code() || undefined }) })
      .then(function (r) { return r.json().then(function (j) { if (j.badCode) { $('ch-partner').open = true; $('ch-code').focus(); } if (!r.ok || !j.id) throw new Error(j.error || 'שירות הענן לא זמין כרגע. נסו שוב בעוד כמה דקות.'); return j; }); })
      .then(function (j) {
        aiInfo('הענן יוצר את הסרטון… בערך דקה. אפשר להישאר בדף.');
        used('ai_start', { style: st, partner: j.partner ? 1 : 0 });
        return (function poll(n) {
          if (n > 120) throw new Error('זה לוקח יותר מהרגיל. נסו שוב בעוד כמה דקות.');
          return sleepMs(n ? 4000 : 6000).then(function () { return fetch(AI + '/status/' + j.id); }).then(function (r) { return r.json(); }).then(function (s) {
            if (s.status === 'done') return j.id;
            if (s.status === 'fail') throw new Error(s.error || 'יצירת הסרטון נכשלה. אפשר לנסות שוב.');
            if (s.queue) aiInfo('ממתינים בתור בענן… עוד רגע מתחילים.'); else aiInfo('הענן יוצר את הסרטון…');
            return poll(n + 1);
          });
        })(0).then(function (id) {
          aiInfo('מוריד את הסרטון…');
          return fetch(AI + '/video/' + id).then(function (r) { if (!r.ok) throw new Error('לא הצלחתי להוריד את הסרטון. נסו שוב.'); return r.blob(); }).then(function (bl) {
            aiBlob = bl.type ? bl : new Blob([bl], { type: 'video/mp4' });
            window.__chAIResult = aiBlob; // לבדיקות
            $('ch-ai-video').src = URL.createObjectURL(aiBlob); $('ch-ai-result').hidden = false;
            end('הסרטון מוכן! ' + (j.partner ? 'תודה שאתם שותפים ❤ – בלי הגבלה.' : j.left > 0 ? 'אפשר עוד ' + j.left + ' היום.' : 'זה היה האחרון להיום. שותפים – בלי הגבלה.'));
            $('ch-ai-result').scrollIntoView({ behavior: 'smooth', block: 'center' });
            used('ai_done', { style: st, secs: Math.round((Date.now() - t0) / 1000) });
          });
        });
      })
      .catch(function (e) { end(e && e.message && /[֐-׿]/.test(e.message) ? e.message : 'אין חיבור לשירות הענן כרגע. בדקו את האינטרנט ונסו שוב.'); });
  });
  function aiName() { return (val('title').trim() || 'תמונה שמתעוררת').replace(/[\\/:*?"<>|]/g, '').slice(0, 50) + ' - החייאה.mp4'; }
  $('ch-ai-dl').addEventListener('click', function () { if (aiBlob) { saveBlob(aiBlob, aiName()); used('ai_download'); } });
  $('ch-ai-share').addEventListener('click', function () {
    if (!aiBlob) return;
    var f = new File([aiBlob], aiName(), { type: 'video/mp4' });
    if (navigator.canShare && navigator.canShare({ files: [f] })) {
      navigator.share({ files: [f], text: 'התמונה שלנו התעוררה 😊 – בחינם: https://hakelim.com/kelim/tochen/chaye/' }).then(function () { used('ai_share'); }).catch(function () {});
    } else { saveBlob(aiBlob, f.name); aiInfo('הסרטון נשמר. עכשיו פותחים את הווטסאפ, ומצרפים אותו מהגלריה או מהקבצים.'); used('ai_download_fallback'); }
  });

  form.addEventListener('change', save);
  form.addEventListener('input', save);
  form.addEventListener('change', function (e) { if (e.target.name === 'move' || e.target.name === 'secs') pStart = performance.now(); });

  restore();
  placeholder('טוען את התמונה לדוגמה…');
  hasCached().then(function (h) { $('ch-first').hidden = h; });
  var fontsReady = (document.fonts && document.fonts.load) ? document.fonts.load('700 40px "Frank Ruhl Libre"').catch(function () {}) : Promise.resolve();
  fontsReady.then(loadDemo).catch(function () { placeholder('בוחרים תמונה, ורואים כאן את הסרטון'); });
})();
