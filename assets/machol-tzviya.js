// צביעה לפי מספרים – /kelim/chashiva/tzviya-misparim/
// תמונה משלכם (נשארת בטלפון, הכול בדפדפן) או ציור מוכן -> דף צביעה ממוספר: אזורים (כמו ציור לפי מספרים) או משבצות (פיקסלים).
// השיטה: הקטנה, צמצום צבעים (k-means במרחב Lab), החלקה, איחוד אזורים קטנים מדי, ומספר בנקודה הכי רחבה בכל אזור.
// צביעה בטלפון בנגיעה, הדפסה עם מקרא צבעים ודף "ככה זה ייראה", ו-PDF.
(function () {
  'use strict';
  var MC = window.MC, $ = MC.$, TOOL = 'machol_tzviya', KEY = 'machol-tzviya';
  var app = $('cz-app'); if (!app) return;
  var O = MC.load(KEY + '-o', { src: 'tpl', tpl: 'bayit', style: 'r', k: 10, det: 2, light: false, ans: true, title: '' });
  var R = null, IMG = null, FILLED = null, SEL = 0, ZOOM = false;

  // ================= ציורים מוכנים (צבעים שטוחים, בלי קווי מתאר: הקווים נוצרים מהגבולות) =================
  var TPL = {
    bayit: ['בית ושמש', '<rect width="300" height="300" fill="#bfe6ff"/><circle cx="245" cy="55" r="32" fill="#ffd23f"/><ellipse cx="78" cy="62" rx="40" ry="17" fill="#ffffff"/><ellipse cx="104" cy="50" rx="26" ry="17" fill="#ffffff"/><path d="M0 232 Q75 206 150 229 T300 226 V300 H0Z" fill="#7cc36a"/><rect x="178" y="82" width="20" height="50" fill="#8c5a3c"/><path d="M58 152 L140 84 L222 152 Z" fill="#e4572e"/><rect x="74" y="150" width="132" height="96" fill="#f4a259"/><rect x="124" y="186" width="34" height="60" fill="#8c5a3c"/><rect x="88" y="168" width="28" height="26" fill="#bfe6ff"/><rect x="166" y="168" width="28" height="26" fill="#bfe6ff"/><rect x="244" y="168" width="18" height="78" fill="#8c5a3c"/><circle cx="253" cy="158" r="36" fill="#3f9b4b"/><circle cx="30" cy="262" r="9" fill="#e4572e"/><circle cx="55" cy="276" r="9" fill="#ffd23f"/><circle cx="222" cy="272" r="9" fill="#e4572e"/>'],
    dag: ['דג בים', '<rect width="300" height="300" fill="#4fb3e8"/><path d="M0 255 Q60 238 120 254 T240 250 T300 248 V300 H0Z" fill="#f2d48f"/><path d="M35 300 C25 260 55 235 38 195 C30 175 48 160 44 140 L56 142 C60 165 44 178 52 196 C68 238 40 262 52 300Z" fill="#2e9e5b"/><path d="M255 300 C245 265 270 245 258 210 L270 212 C282 246 258 266 268 300Z" fill="#2e9e5b"/><path d="M218 140 L282 92 L268 140 L282 188Z" fill="#e85d04"/><path d="M118 96 Q150 52 192 100Z" fill="#e85d04"/><path d="M138 184 Q160 218 186 180Z" fill="#e85d04"/><ellipse cx="150" cy="140" rx="80" ry="52" fill="#ff8c42"/><path d="M128 92 Q112 140 128 188 L148 191 Q132 140 148 89Z" fill="#ffd166"/><path d="M172 92 Q158 140 172 188 L190 184 Q176 140 190 96Z" fill="#ffd166"/><circle cx="102" cy="124" r="14" fill="#ffffff"/><circle cx="98" cy="124" r="7" fill="#1d3557"/><circle cx="60" cy="90" r="11" fill="#bde4f8"/><circle cx="46" cy="58" r="8" fill="#bde4f8"/><circle cx="70" cy="34" r="7" fill="#bde4f8"/>'],
    parpar: ['פרפר', '<rect width="300" height="300" fill="#e8f7d4"/><path d="M0 262 Q150 238 300 262 V300 H0Z" fill="#80b918"/><ellipse cx="96" cy="108" rx="72" ry="54" fill="#9b5de5" transform="rotate(-25 96 108)"/><ellipse cx="204" cy="108" rx="72" ry="54" fill="#9b5de5" transform="rotate(25 204 108)"/><ellipse cx="108" cy="196" rx="52" ry="42" fill="#f15bb5" transform="rotate(20 108 196)"/><ellipse cx="192" cy="196" rx="52" ry="42" fill="#f15bb5" transform="rotate(-20 192 196)"/><circle cx="84" cy="100" r="23" fill="#fee440"/><circle cx="216" cy="100" r="23" fill="#fee440"/><circle cx="118" cy="140" r="11" fill="#00bbf9"/><circle cx="182" cy="140" r="11" fill="#00bbf9"/><circle cx="104" cy="204" r="16" fill="#fee440"/><circle cx="196" cy="204" r="16" fill="#fee440"/><rect x="139" y="78" width="22" height="152" rx="11" fill="#5c3d2e"/><circle cx="150" cy="70" r="17" fill="#5c3d2e"/><path d="M142 58 Q124 28 106 24 L108 16 Q132 22 152 56Z" fill="#5c3d2e"/><path d="M158 58 Q176 28 194 24 L192 16 Q168 22 148 56Z" fill="#5c3d2e"/>'],
    perach: ['פרח בעציץ', '<rect width="300" height="300" fill="#fff3c4"/><circle cx="258" cy="42" r="24" fill="#ffd670"/><rect x="143" y="118" width="14" height="122" fill="#38a3a5"/><ellipse cx="116" cy="188" rx="30" ry="13" fill="#57cc99" transform="rotate(-30 116 188)"/><ellipse cx="184" cy="188" rx="30" ry="13" fill="#57cc99" transform="rotate(30 184 188)"/><circle cx="150" cy="72" r="27" fill="#ff70a6"/><circle cx="185" cy="92" r="27" fill="#ff9770"/><circle cx="185" cy="130" r="27" fill="#ff70a6"/><circle cx="150" cy="150" r="27" fill="#ff9770"/><circle cx="115" cy="130" r="27" fill="#ff70a6"/><circle cx="115" cy="92" r="27" fill="#ff9770"/><circle cx="150" cy="111" r="25" fill="#ffd670"/><path d="M100 232 H200 L187 292 H113Z" fill="#e07a5f"/><rect x="90" y="222" width="120" height="20" rx="5" fill="#c4553a"/>'],
    kadur: ['כדור פורח', '<rect width="300" height="300" fill="#a9def9"/><ellipse cx="60" cy="70" rx="38" ry="15" fill="#ffffff"/><ellipse cx="248" cy="120" rx="36" ry="14" fill="#ffffff"/><path d="M0 268 Q80 236 160 266 T300 258 V300 H0Z" fill="#06d6a0"/><path d="M130 196 L137 236 L142 236 L135 196Z" fill="#6d4c41"/><path d="M170 196 L163 236 L158 236 L165 196Z" fill="#6d4c41"/><path d="M150 28 C78 28 58 112 96 152 L128 198 H172 L204 152 C242 112 222 28 150 28Z" fill="#ef476f"/><path d="M150 28 C112 30 100 112 118 152 L136 198 H164 L182 152 C200 112 188 30 150 28Z" fill="#ffd166"/><path d="M150 28 C134 30 130 112 138 152 L144 198 H156 L162 152 C170 112 166 30 150 28Z" fill="#118ab2"/><rect x="126" y="232" width="48" height="34" rx="5" fill="#a1683a"/>'],
    chanukiya: ['חנוכייה', '<rect width="300" height="300" fill="#1d3557"/><path d="M40 40 l5 12 13 1 -10 8 4 13 -12 -7 -12 7 4 -13 -10 -8 13 -1z" fill="#ffb703"/><path d="M250 30 l4 10 11 1 -8 7 3 11 -10 -6 -10 6 3 -11 -8 -7 11 -1z" fill="#ffb703"/><path d="M262 92 l3 8 9 1 -7 5 3 9 -8 -5 -8 5 3 -9 -7 -5 9 -1z" fill="#ffb703"/><path d="M108 274 H192 L176 250 H124Z" fill="#e9c46a"/><rect x="143" y="160" width="14" height="92" fill="#e9c46a"/><rect x="36" y="150" width="228" height="15" rx="7" fill="#e9c46a"/>' +
      [52, 77, 102, 127, 173, 198, 223, 248].map(function (x, i) { return '<rect x="' + (x - 7) + '" y="108" width="14" height="42" fill="' + ['#e76f51', '#2a9d8f', '#f4a261', '#ffffff'][i % 4] + '"/><path d="M' + x + ' 80 C' + (x + 10) + ' 94 ' + (x + 8) + ' 104 ' + x + ' 104 C' + (x - 8) + ' 104 ' + (x - 10) + ' 94 ' + x + ' 80Z" fill="#ffb703"/>'; }).join('') +
      '<rect x="143" y="84" width="14" height="66" fill="#ffffff"/><path d="M150 56 C160 70 158 80 150 80 C142 80 140 70 150 56Z" fill="#ffb703"/>'],
    mechonit: ['מכונית', '<rect width="300" height="300" fill="#caf0f8"/><circle cx="250" cy="56" r="28" fill="#ffd60a"/><rect y="236" width="300" height="64" fill="#6c757d"/><rect x="20" y="264" width="40" height="8" fill="#ffffff"/><rect x="130" y="264" width="40" height="8" fill="#ffffff"/><rect x="240" y="264" width="40" height="8" fill="#ffffff"/><path d="M40 214 Q40 176 80 172 L105 140 Q112 130 125 130 H190 Q203 130 212 140 L238 172 Q265 175 265 200 V214 Q265 226 254 226 H51 Q40 226 40 214Z" fill="#e63946"/><path d="M118 146 H150 V172 H98Z" fill="#a8dadc"/><path d="M160 146 H198 L220 172 H160Z" fill="#a8dadc"/><rect x="250" y="186" width="15" height="11" rx="3" fill="#ffd60a"/><circle cx="90" cy="226" r="25" fill="#212529"/><circle cx="215" cy="226" r="25" fill="#212529"/><circle cx="90" cy="226" r="11" fill="#adb5bd"/><circle cx="215" cy="226" r="11" fill="#adb5bd"/>'],
    keshet: ['קשת בענן', '<rect width="300" height="300" fill="#dff3ff"/><circle cx="46" cy="46" r="26" fill="#ffd23f"/>' +
      ['#e63946', '#f77f00', '#fcbf49', '#2a9d8f', '#457b9d', '#8e7dbe'].map(function (c, i) { return '<circle cx="150" cy="252" r="' + (142 - i * 18) + '" fill="' + c + '"/>'; }).join('') +
      '<circle cx="150" cy="252" r="34" fill="#dff3ff"/><rect y="250" width="300" height="50" fill="#90be6d"/><ellipse cx="34" cy="246" rx="34" ry="20" fill="#ffffff"/><ellipse cx="62" cy="238" rx="26" ry="22" fill="#ffffff"/><ellipse cx="266" cy="246" rx="34" ry="20" fill="#ffffff"/><ellipse cx="238" cy="238" rx="26" ry="22" fill="#ffffff"/>']
  };
  function tplSvg(id, crisp) { var t = TPL[id] || TPL.bayit; return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300"' + (crisp ? ' shape-rendering="crispEdges"' : '') + '>' + t[1] + '</svg>'; }
  function tplPalette(id) { var m = (TPL[id] || TPL.bayit)[1].match(/#[0-9a-f]{6}/gi) || [], u = []; m.forEach(function (c) { c = c.toLowerCase(); if (u.indexOf(c) < 0) u.push(c); }); return u.map(hex); }
  function hex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }

  // ================= צבע: Lab ושמות בעברית =================
  function lab(r, g, b) {
    var f = function (c) { c /= 255; return c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92; };
    r = f(r); g = f(g); b = f(b);
    var x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047, y = r * 0.2126 + g * 0.7152 + b * 0.0722, z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
    var q = function (t) { return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116; };
    x = q(x); y = q(y); z = q(z);
    return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
  }
  function d2(a, b) { var x = a[0] - b[0], y = a[1] - b[1], z = a[2] - b[2]; return x * x + y * y + z * z; }
  var CN = [['לבן', 255, 255, 255], ['שחור', 25, 25, 25], ['אפור', 128, 128, 128], ['אפור בהיר', 200, 200, 200], ['אפור כהה', 72, 72, 72], ['אדום', 222, 45, 45], ['אדום כהה', 140, 22, 32], ['ורוד', 244, 120, 175], ['ורוד בהיר', 250, 198, 214], ['כתום', 246, 138, 40], ['כתום בהיר', 250, 188, 118], ['צהוב', 252, 218, 50], ['צהוב בהיר', 252, 240, 165], ['זהב', 214, 176, 70], ['בז׳', 232, 212, 172], ['חום', 140, 90, 52], ['חום בהיר', 192, 142, 92], ['חום כהה', 88, 54, 30], ['ירוק', 60, 168, 80], ['ירוק בהיר', 152, 218, 120], ['ירוק כהה', 30, 100, 52], ['ירוק זית', 120, 130, 52], ['טורקיז', 40, 178, 168], ['תכלת', 150, 208, 244], ['כחול', 40, 108, 208], ['כחול כהה', 26, 46, 108], ['סגול', 140, 80, 190], ['סגול בהיר', 196, 162, 230], ['בורדו', 112, 22, 42], ['צבע עור', 240, 196, 162]].map(function (x) { return { n: x[0], l: lab(x[1], x[2], x[3]) }; });
  function cname(rgb) { var L = lab(rgb[0], rgb[1], rgb[2]), b = CN[0], bd = 1e9; CN.forEach(function (c) { var d = d2(L, c.l); if (d < bd) { bd = d; b = c; } }); return b.n; }
  function names(pal) { var n = pal.map(cname), cnt = {}, k = {}; n.forEach(function (x) { cnt[x] = (cnt[x] || 0) + 1; }); return n.map(function (x) { if (cnt[x] < 2) return x; k[x] = (k[x] || 0) + 1; return x + ' ' + k[x]; }); }
  function css(rgb) { return 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')'; }

  // ================= עיבוד =================
  var DET = { 1: { W: 260, md: 2.8, G: 18 }, 2: { W: 400, md: 3.0, G: 26 }, 3: { W: 560, md: 3.4, G: 36 } };
  function process(img, isTpl, pal) {
    var D = DET[O.det] || DET[2], grid = O.style === 'g';
    var iw = img.width || img.naturalWidth, ih = img.height || img.naturalHeight, ar = ih / iw;
    if (ar > 1.6) ar = 1.6; if (ar < 0.55) ar = 0.55;
    var w, h;
    if (grid) { w = D.G; h = Math.max(6, Math.round(D.G * ar)); } else { w = ar > 1 ? Math.round(D.W / ar) : D.W; h = Math.round(w * ar); }
    var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    var g = cv.getContext('2d', { willReadFrequently: true });
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    // חיתוך למרכז כשהיחס קיצוני
    var sw = iw, sh = ih, sx = 0, sy = 0, want = h / w;
    if (ih / iw > want) { sh = iw * want; sy = (ih - sh) / 2; } else { sw = ih / want; sx = (iw - sw) / 2; }
    g.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
    var px = g.getImageData(0, 0, w, h).data, n = w * h;
    if (!isTpl && !grid) px = blur(px, w, h);
    var L = new Array(n);
    for (var i = 0; i < n; i++) L[i] = lab(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]);
    var cents, palRgb;
    if (isTpl) { palRgb = pal; cents = pal.map(function (c) { return lab(c[0], c[1], c[2]); }); }
    else { var km = kmeans(L, px, Math.max(3, Math.min(24, +O.k || 10))); cents = km.c; palRgb = km.rgb; }
    var ci = new Uint8Array(n);
    for (i = 0; i < n; i++) { var b = 0, bd = 1e12; for (var k = 0; k < cents.length; k++) { var d = d2(L[i], cents[k]); if (d < bd) { bd = d; b = k; } } ci[i] = b; }
    var out;
    if (grid) out = { w: w, h: h, ci: ci, rid: (function () { var a = new Int32Array(n); for (var j = 0; j < n; j++) a[j] = j; return a; })(), grid: true };
    else {
      if (!isTpl) for (var p = 0; p < 2; p++) ci = majority(ci, w, h);
      out = regions(ci, w, h, D.md, cents);
      out.grid = false;
    }
    // מספור: רק צבעים שבשימוש, מהבהיר לכהה
    var used = {}; for (i = 0; i < n; i++) used[out.ci[i]] = 1;
    var ids = Object.keys(used).map(Number).sort(function (a, b2) { return lab.apply(null, palRgb[b2])[0] - lab.apply(null, palRgb[a])[0]; });
    var map = {}; ids.forEach(function (c, j) { map[c] = j; });
    out.pal = ids.map(function (c) { return palRgb[c]; });
    for (i = 0; i < n; i++) out.ci[i] = map[out.ci[i]];
    finishRegions(out);
    return out;
  }
  function blur(px, w, h) {
    var o = new Uint8ClampedArray(px.length);
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var r = 0, g = 0, b = 0, c = 0;
      for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { var X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= w || Y >= h) continue; var j = (Y * w + X) * 4, wt = dx || dy ? 1 : 4; r += px[j] * wt; g += px[j + 1] * wt; b += px[j + 2] * wt; c += wt; }
      var i = (y * w + x) * 4; o[i] = r / c; o[i + 1] = g / c; o[i + 2] = b / c; o[i + 3] = 255;
    }
    return o;
  }
  function kmeans(L, px, K) {
    var n = L.length, rnd = MC.rng('km' + n + K), S = [], step = Math.max(1, Math.floor(n / 7000));
    for (var i = 0; i < n; i += step) S.push(i);
    var c = [L[S[Math.floor(rnd() * S.length)]].slice()], D = S.map(function () { return 1e12; });
    while (c.length < K) { // k-means++
      var sum = 0; S.forEach(function (s, j) { var d = d2(L[s], c[c.length - 1]); if (d < D[j]) D[j] = d; sum += D[j]; });
      var t = rnd() * sum, pick = S[0]; for (var j = 0; j < S.length; j++) { t -= D[j]; if (t <= 0) { pick = S[j]; break; } }
      c.push(L[pick].slice());
    }
    var as = new Int16Array(S.length);
    for (var it = 0; it < 12; it++) {
      var acc = c.map(function () { return [0, 0, 0, 0]; });
      S.forEach(function (s, j) { var b = 0, bd = 1e12; for (var k = 0; k < K; k++) { var d = d2(L[s], c[k]); if (d < bd) { bd = d; b = k; } } as[j] = b; var a = acc[b]; a[0] += L[s][0]; a[1] += L[s][1]; a[2] += L[s][2]; a[3]++; });
      c = c.map(function (old, k) { var a = acc[k]; return a[3] ? [a[0] / a[3], a[1] / a[3], a[2] / a[3]] : old; });
    }
    var rgb = c.map(function () { return [0, 0, 0, 0]; });
    S.forEach(function (s, j) { var a = rgb[as[j]]; a[0] += px[s * 4]; a[1] += px[s * 4 + 1]; a[2] += px[s * 4 + 2]; a[3]++; });
    return { c: c, rgb: rgb.map(function (a) { return a[3] ? [Math.round(a[0] / a[3]), Math.round(a[1] / a[3]), Math.round(a[2] / a[3])] : [255, 255, 255]; }) };
  }
  function majority(ci, w, h) {
    var o = new Uint8Array(ci.length), cnt = new Int16Array(32);
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var seen = [];
      for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { var X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= w || Y >= h) continue; var c = ci[Y * w + X]; if (!cnt[c]) seen.push(c); cnt[c]++; }
      var i = y * w + x, best = ci[i], bc = cnt[best];
      seen.forEach(function (c2) { if (cnt[c2] > bc) { bc = cnt[c2]; best = c2; } cnt[c2] = 0; });
      o[i] = bc >= 5 ? best : ci[i];
    }
    return o;
  }
  function components(ci, w, h) {
    var n = w * h, rid = new Int32Array(n).fill(-1), regs = [], st = new Int32Array(n);
    for (var i = 0; i < n; i++) {
      if (rid[i] >= 0) continue;
      var id = regs.length, c = ci[i], top = 0, area = 0; st[top++] = i; rid[i] = id;
      while (top) {
        var p = st[--top], x = p % w, y = (p - x) / w; area++;
        if (x > 0 && rid[p - 1] < 0 && ci[p - 1] === c) { rid[p - 1] = id; st[top++] = p - 1; }
        if (x < w - 1 && rid[p + 1] < 0 && ci[p + 1] === c) { rid[p + 1] = id; st[top++] = p + 1; }
        if (y > 0 && rid[p - w] < 0 && ci[p - w] === c) { rid[p - w] = id; st[top++] = p - w; }
        if (y < h - 1 && rid[p + w] < 0 && ci[p + w] === c) { rid[p + w] = id; st[top++] = p + w; }
      }
      regs.push({ c: c, area: area });
    }
    return { rid: rid, regs: regs };
  }
  // מרחק מקצה האזור (בתוך האזור בלבד): 1 בקצה, וגדל פנימה
  function distField(rid, w, h) {
    var n = w * h, d = new Float32Array(n), INF = 1e9;
    for (var i = 0; i < n; i++) {
      var x = i % w, y = (i - x) / w, r = rid[i];
      d[i] = (x === 0 || y === 0 || x === w - 1 || y === h - 1 || rid[i - 1] !== r || rid[i + 1] !== r || rid[i - w] !== r || rid[i + w] !== r) ? 1 : INF;
    }
    var S2 = Math.SQRT2;
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      i = y * w + x; r = rid[i]; var v = d[i];
      if (x > 0 && rid[i - 1] === r) v = Math.min(v, d[i - 1] + 1);
      if (y > 0) { if (rid[i - w] === r) v = Math.min(v, d[i - w] + 1); if (x > 0 && rid[i - w - 1] === r) v = Math.min(v, d[i - w - 1] + S2); if (x < w - 1 && rid[i - w + 1] === r) v = Math.min(v, d[i - w + 1] + S2); }
      d[i] = v;
    }
    for (y = h - 1; y >= 0; y--) for (x = w - 1; x >= 0; x--) {
      i = y * w + x; r = rid[i]; v = d[i];
      if (x < w - 1 && rid[i + 1] === r) v = Math.min(v, d[i + 1] + 1);
      if (y < h - 1) { if (rid[i + w] === r) v = Math.min(v, d[i + w] + 1); if (x < w - 1 && rid[i + w + 1] === r) v = Math.min(v, d[i + w + 1] + S2); if (x > 0 && rid[i + w - 1] === r) v = Math.min(v, d[i + w - 1] + S2); }
      d[i] = v;
    }
    return d;
  }
  function regions(ci, w, h, md, cents) {
    var minA = Math.round(md * md * 5), C, dist;
    for (var it = 0; it < 10; it++) {
      C = components(ci, w, h); dist = distField(C.rid, w, h);
      var R2 = C.regs, maxd = new Float32Array(R2.length);
      for (var i = 0; i < ci.length; i++) if (dist[i] > maxd[C.rid[i]]) maxd[C.rid[i]] = dist[i];
      var small = R2.map(function (r, j) { return r.area < minA || maxd[j] < md; });
      if (!small.some(Boolean)) break;
      // גבולות משותפים בין אזורים
      var adj = R2.map(function () { return {}; });
      for (i = 0; i < ci.length; i++) {
        var x = i % w, a = C.rid[i];
        if (x < w - 1 && C.rid[i + 1] !== a) { adj[a][C.rid[i + 1]] = (adj[a][C.rid[i + 1]] || 0) + 1; adj[C.rid[i + 1]][a] = (adj[C.rid[i + 1]][a] || 0) + 1; }
        if (i + w < ci.length && C.rid[i + w] !== a) { adj[a][C.rid[i + w]] = (adj[a][C.rid[i + w]] || 0) + 1; adj[C.rid[i + w]][a] = (adj[C.rid[i + w]][a] || 0) + 1; }
      }
      var newc = R2.map(function (r) { return r.c; }), order = R2.map(function (r, j) { return j; }).filter(function (j) { return small[j]; }).sort(function (p, q) { return R2[p].area - R2[q].area; });
      order.forEach(function (j) {
        var best = -1, bs = -1;
        for (var nb in adj[j]) { nb = +nb; var s = adj[j][nb] * (small[nb] ? 0.3 : 1) - Math.sqrt(d2(cents[R2[j].c], cents[R2[nb].c])) * 0.02; if (s > bs) { bs = s; best = nb; } }
        if (best >= 0) newc[j] = newc[best];
      });
      var o = new Uint8Array(ci.length); for (i = 0; i < ci.length; i++) o[i] = newc[C.rid[i]]; ci = o;
    }
    C = components(ci, w, h);
    return { w: w, h: h, ci: ci, rid: C.rid };
  }
  function finishRegions(o) {
    var n = o.w * o.h, nr = 0; for (var i = 0; i < n; i++) if (o.rid[i] + 1 > nr) nr = o.rid[i] + 1;
    var col = new Int16Array(nr), bx = new Int32Array(nr), by = new Int32Array(nr), bd = new Float32Array(nr), cnt = new Int32Array(nr);
    var dist = o.grid ? null : distField(o.rid, o.w, o.h);
    for (i = 0; i < n; i++) { var r = o.rid[i]; col[r] = o.ci[i]; cnt[r]++; var dv = dist ? dist[i] : 1; if (dv > bd[r]) { bd[r] = dv; bx[r] = i % o.w; by[r] = (i - i % o.w) / o.w; } }
    // רשימות פיקסלים לכל אזור (לצביעה מהירה)
    var start = new Int32Array(nr + 1); for (r = 0; r < nr; r++) start[r + 1] = start[r] + cnt[r];
    var pos = start.slice(0, nr), pix = new Int32Array(n); for (i = 0; i < n; i++) pix[pos[o.rid[i]]++] = i;
    o.nr = nr; o.col = col; o.bx = bx; o.by = by; o.bd = bd; o.start = start; o.pix = pix;
  }

  // ================= ציור =================
  function edges(o, s) { // מסלול הגבולות בקנה מידה s (קטעים מאוחדים)
    var p = new Path2D(), w = o.w, h = o.h, rid = o.rid;
    for (var y = 0; y < h - 1; y++) { var run = -1; for (var x = 0; x <= w; x++) { var b = x < w && rid[y * w + x] !== rid[(y + 1) * w + x]; if (b && run < 0) run = x; if (!b && run >= 0) { p.moveTo(run * s, (y + 1) * s); p.lineTo(x * s, (y + 1) * s); run = -1; } } }
    for (x = 0; x < w - 1; x++) { run = -1; for (y = 0; y <= h; y++) { b = y < h && rid[y * w + x] !== rid[y * w + x + 1]; if (b && run < 0) run = y; if (!b && run >= 0) { p.moveTo((x + 1) * s, run * s); p.lineTo((x + 1) * s, y * s); run = -1; } } }
    p.rect(0, 0, w * s, h * s);
    return p;
  }
  function render(cv, o, s, mode, filled, pxmm) { // mode: 'art' (קווים ומספרים), 'color' (התשובה), 'play'; pxmm = פיקסלים למ"מ בהדפסה
    var w = o.w, h = o.h, g = cv.getContext('2d');
    cv.width = Math.round(w * s); cv.height = Math.round(h * s);
    var sm = document.createElement('canvas'); sm.width = w; sm.height = h;
    var sg = sm.getContext('2d'), id = sg.createImageData(w, h), d = id.data;
    for (var i = 0; i < w * h; i++) {
      var r = o.rid[i], c = mode === 'color' || (filled && filled[r]) ? o.pal[o.col[r]] : null;
      d[i * 4] = c ? c[0] : 255; d[i * 4 + 1] = c ? c[1] : 255; d[i * 4 + 2] = c ? c[2] : 255; d[i * 4 + 3] = 255;
    }
    sg.putImageData(id, 0, 0);
    g.imageSmoothingEnabled = false; g.drawImage(sm, 0, 0, cv.width, cv.height);
    if (mode === 'color' && !o.grid) return;
    g.lineJoin = 'round';
    g.strokeStyle = O.light ? 'rgba(90,100,115,.55)' : '#2d2d2d';
    g.lineWidth = Math.max(1, s * (o.grid ? 0.05 : 0.16));
    if (o.grid) { var p = new Path2D(); for (var x = 0; x <= w; x++) { p.moveTo(x * s, 0); p.lineTo(x * s, h * s); } for (var y = 0; y <= h; y++) { p.moveTo(0, y * s); p.lineTo(w * s, y * s); } g.stroke(p); }
    else g.stroke(edges(o, s));
    if (mode === 'color') return;
    g.fillStyle = O.light ? '#5b6573' : '#333'; g.textAlign = 'center'; g.textBaseline = 'middle';
    var maxF = s * (o.grid ? 0.62 : 9);
    for (var rr = 0; rr < o.nr; rr++) {
      if (filled && filled[rr]) continue;
      var f = o.grid ? s * 0.52 : Math.min(maxF, Math.max(pxmm ? pxmm * 2 : s * 1.9, o.bd[rr] * s * 1.15));
      var num = o.col[rr] + 1, cx = (o.bx[rr] + 0.5) * s, cy = (o.by[rr] + 0.55) * s;
      g.font = '600 ' + f.toFixed(1) + 'px Assistant, Arial, sans-serif';
      if (num > 9 && !o.grid) g.font = '600 ' + (f * 0.85).toFixed(1) + 'px Assistant, Arial, sans-serif';
      g.fillText(String(num), cx, cy);
    }
  }

  // ================= משחק: צביעה בנגיעה =================
  var CV = null;
  function play() {
    var o = R, box = $('cz-box'), cw = box.clientWidth || 340, dpr = Math.min(3, window.devicePixelRatio || 1);
    var s = Math.max(2, Math.ceil((ZOOM ? cw * 2 : cw) * dpr / o.w));
    CV = $('cz-cv'); render(CV, o, s, 'play', FILLED);
    CV.style.width = (ZOOM ? 200 : 100) + '%';
    var left = 0, tot = 0; for (var r = 0; r < o.nr; r++) { tot++; if (!FILLED[r]) left++; }
    $('cz-prog').textContent = left ? 'צבעתם ' + (tot - left) + ' מתוך ' + tot + ' ' + (o.grid ? 'משבצות' : 'אזורים') : '🎉 הציור מוכן! כל הכבוד.';
    pal();
  }
  function pal() {
    var o = R, left = {}; for (var r = 0; r < o.nr; r++) if (!FILLED[r]) left[o.col[r]] = (left[o.col[r]] || 0) + 1;
    $('cz-pal').innerHTML = o.pal.map(function (c, i) {
      var lt = lab(c[0], c[1], c[2])[0] > 60;
      return '<button type="button" role="radio" aria-checked="' + (SEL === i) + '" data-i="' + i + '" style="--c:' + css(c) + ';color:' + (lt ? '#111' : '#fff') + '" aria-label="צבע ' + (i + 1) + ': ' + cname(c) + (left[i] ? '' : ', גמור') + '">' + (left[i] ? i + 1 : '✓') + '</button>';
    }).join('');
    [].forEach.call($('cz-pal').querySelectorAll('button'), function (b) { b.addEventListener('click', function () { SEL = +b.getAttribute('data-i'); pal(); $('cz-msg').textContent = 'בוחרים צבע ' + (SEL + 1) + ' (' + cname(R.pal[SEL]) + ') ונוגעים בכל האזורים עם המספר ' + (SEL + 1) + '.'; }); });
  }
  function hit(e) {
    var rc = CV.getBoundingClientRect(), x = Math.floor((e.clientX - rc.left) / rc.width * R.w), y = Math.floor((e.clientY - rc.top) / rc.height * R.h);
    if (x < 0 || y < 0 || x >= R.w || y >= R.h) return -1; return R.rid[y * R.w + x];
  }
  var painting = false;
  function tap(e, quiet) {
    var r = hit(e); if (r < 0 || FILLED[r]) return;
    if (R.col[r] !== SEL) { if (!quiet) $('cz-msg').textContent = 'כאן כתוב ' + (R.col[r] + 1) + ' – בחרו את צבע ' + (R.col[r] + 1) + ' (' + cname(R.pal[R.col[r]]) + ').'; return; }
    FILLED[r] = 1; saveFill();
    // צובעים רק את האזור הזה (מהיר)
    var g = CV.getContext('2d'), s = CV.width / R.w, c = R.pal[R.col[r]];
    g.fillStyle = css(c);
    for (var k = R.start[r]; k < R.start[r + 1]; k++) { var p = R.pix[k], x = p % R.w, y = (p - x) / R.w; g.fillRect(Math.floor(x * s), Math.floor(y * s), Math.ceil(s) + 1, Math.ceil(s) + 1); }
    clearTimeout(tap._t); tap._t = setTimeout(play, R.grid ? 400 : 60);
    MC.used(TOOL, 'color');
    var done = true; for (var q = 0; q < R.nr; q++) if (!FILLED[q]) { done = false; break; }
    if (done) { $('cz-msg').textContent = '🎉 סיימתם לצבוע! אפשר להוריד את הציור הצבוע.'; MC.used(TOOL, 'solved', { style: O.style }); }
  }
  function wire() {
    var cv = $('cz-cv');
    cv.addEventListener('pointerdown', function (e) { painting = true; tap(e); if (R && R.grid) try { cv.setPointerCapture(e.pointerId); } catch (x) {} });
    cv.addEventListener('pointermove', function (e) { if (painting && R && R.grid) tap(e, true); });
    window.addEventListener('pointerup', function () { painting = false; });
    $('cz-hint').addEventListener('click', function () {
      if (!R) return; var g = CV.getContext('2d'), s = CV.width / R.w; g.fillStyle = 'rgba(255,200,0,.55)';
      for (var r = 0; r < R.nr; r++) if (!FILLED[r] && R.col[r] === SEL) for (var k = R.start[r]; k < R.start[r + 1]; k++) { var p = R.pix[k], x = p % R.w, y = (p - x) / R.w; g.fillRect(x * s, y * s, s + 1, s + 1); }
      setTimeout(play, 900); MC.used(TOOL, 'hint');
    });
    $('cz-zoom').addEventListener('click', function () { ZOOM = !ZOOM; this.setAttribute('aria-pressed', String(ZOOM)); play(); });
    $('cz-reset').addEventListener('click', function () { FILLED = new Uint8Array(R.nr); saveFill(); play(); });
    $('cz-fillall').addEventListener('click', function () { FILLED = new Uint8Array(R.nr).fill(1); saveFill(); play(); MC.used(TOOL, 'reveal'); });
    $('cz-png').addEventListener('click', function () {
      var c = document.createElement('canvas'); render(c, R, Math.ceil(1600 / R.w), 'play', FILLED);
      c.toBlob(function (b) { var u = URL.createObjectURL(b), a = document.createElement('a'); a.href = u; a.download = (O.title || 'צביעה לפי מספרים') + '.png'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 30000); }, 'image/png');
      MC.used(TOOL, 'png');
    });
  }
  var FK = '';
  function saveFill() { if (FK) { var a = []; for (var i = 0; i < FILLED.length; i++) if (FILLED[i]) a.push(i); MC.save(FK, a); } }

  // ================= דפים להדפסה =================
  function pages() {
    var o = R, s = Math.ceil(2000 / Math.max(o.w, o.h)), c = document.createElement('canvas');
    var maxW = 186, maxH = o.pal.length > 12 ? 188 : 205, ar = o.h / o.w, iw = Math.min(maxW, maxH / ar), ih = iw * ar;
    render(c, o, s, 'art', null, o.w * s / iw); var art = c.toDataURL('image/png');
    render(c, o, s, 'color', null); var col = c.toDataURL('image/png');
    var t = O.title || (O.src === 'tpl' ? 'צביעה לפי מספרים: ' + TPL[O.tpl][0] : 'צביעה לפי מספרים');
    var nm = names(o.pal), leg = '<ul class="cz-leg' + (o.pal.length > 12 ? ' sm' : '') + '">' + o.pal.map(function (p, i) { return '<li><b>' + (i + 1) + '</b><i style="background:' + css(p) + '"></i>' + nm[i] + '</li>'; }).join('') + '</ul>';
    var sub = (o.grid ? 'משבצות' : 'אזורים') + ' · ' + o.pal.length + ' צבעים · צובעים כל ' + (o.grid ? 'משבצת' : 'אזור') + ' בצבע של המספר שבו';
    var out = [MC.head(t, sub, true) + '<div class="cz-art"><img alt="" src="' + art + '" style="width:' + iw.toFixed(1) + 'mm;height:' + ih.toFixed(1) + 'mm"></div>' + leg + MC.foot()];
    if (O.ans) out.push(MC.head('ככה זה ייראה: ' + t, 'דף פתרון – להשוואה בסוף', false) + '<div class="cz-art"><img alt="" src="' + col + '" style="width:' + iw.toFixed(1) + 'mm;height:' + ih.toFixed(1) + 'mm"></div>' + leg + MC.foot());
    return out;
  }
  function refreshPreview() { if (R) MC.preview($('cz-prev'), pages(), 2); }

  // ================= טעינה ויצירה =================
  function loadImg(src) { return new Promise(function (ok, no) { var im = new Image(); im.onload = function () { ok(im); }; im.onerror = no; im.src = src; }); }
  function run() {
    var t0 = Date.now(); $('cz-busy').hidden = false;
    var go = function (img, isTpl, palx) {
      setTimeout(function () {
        try { R = process(img, isTpl, palx); } catch (e) { $('cz-busy').hidden = true; $('cz-msg').textContent = 'לא הצלחנו לעבד את התמונה. נסו תמונה אחרת.'; return; }
        FK = KEY + '-f:' + MC.hash((O.src === 'tpl' ? O.tpl : 'img:' + (IMG ? IMG.width + 'x' + IMG.height : '')) + '|' + O.style + O.det + O.k);
        var got = O.src === 'tpl' ? MC.load(FK, []) : [];
        FILLED = new Uint8Array(R.nr); got.forEach(function (i) { if (i < R.nr) FILLED[i] = 1; });
        SEL = 0; $('cz-busy').hidden = true; $('cz-out').hidden = false;
        play(); refreshPreview();
        $('cz-sum').textContent = R.pal.length + ' צבעים · ' + R.nr + ' ' + (R.grid ? 'משבצות' : 'אזורים');
        $('cz-msg').textContent = 'בוחרים צבע למטה ונוגעים באזורים עם אותו מספר.';
        MC.used(TOOL, 'make', { src: O.src, style: O.style, det: O.det, k: R.pal.length, ms: Date.now() - t0 });
      }, 30);
    };
    if (O.src === 'img' && IMG) go(IMG, false);
    else loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(tplSvg(O.tpl, true))).then(function (im) { go(im, true, tplPalette(O.tpl)); });
  }
  function ui() {
    $('cz-tpls').innerHTML = Object.keys(TPL).map(function (k) { return '<button type="button" role="radio" data-t="' + k + '" aria-checked="' + (O.tpl === k) + '">' + tplSvg(k, false).replace('<svg ', '<svg aria-hidden="true" ') + '<span>' + TPL[k][0] + '</span></button>'; }).join('');
    [].forEach.call($('cz-tpls').querySelectorAll('button'), function (b) { b.addEventListener('click', function () { O.tpl = b.getAttribute('data-t'); O.src = 'tpl'; MC.save(KEY + '-o', O); sync(); run(); MC.used(TOOL, 'tpl', { t: O.tpl }); }); });
    [].forEach.call(document.querySelectorAll('#cz-srcs button'), function (b) { b.addEventListener('click', function () { O.src = b.getAttribute('data-s'); MC.save(KEY + '-o', O); sync(); if (O.src === 'tpl' || IMG) run(); else $('cz-file').click(); }); });
    [].forEach.call(document.querySelectorAll('#cz-styles button'), function (b) { b.addEventListener('click', function () { O.style = b.getAttribute('data-s'); MC.save(KEY + '-o', O); sync(); run(); }); });
    $('cz-file').addEventListener('change', function () {
      var f = this.files && this.files[0]; if (!f) return;
      var u = URL.createObjectURL(f);
      loadImg(u).then(function (im) { IMG = im; O.src = 'img'; if (!O.title) $('cz-title').value = ''; sync(); run(); MC.used(TOOL, 'upload'); }, function () { $('cz-msg').textContent = 'את הקובץ הזה לא הצלחנו לפתוח. נסו תמונה מסוג JPG או PNG.'; });
    });
    $('cz-pick').addEventListener('click', function () { $('cz-file').click(); });
    $('cz-k').value = String(O.k); $('cz-det').value = String(O.det); $('cz-light').checked = !!O.light; $('cz-ans').checked = O.ans !== false; $('cz-title').value = O.title || '';
    $('cz-k').addEventListener('change', function () { O.k = +this.value; MC.save(KEY + '-o', O); if (O.src === 'img') run(); });
    $('cz-det').addEventListener('change', function () { O.det = +this.value; MC.save(KEY + '-o', O); run(); });
    $('cz-light').addEventListener('change', function () { O.light = this.checked; MC.save(KEY + '-o', O); play(); refreshPreview(); });
    $('cz-ans').addEventListener('change', function () { O.ans = this.checked; MC.save(KEY + '-o', O); refreshPreview(); });
    $('cz-title').addEventListener('input', function () { O.title = MC.clean(this.value, 50); MC.save(KEY + '-o', O); clearTimeout(this._t); this._t = setTimeout(refreshPreview, 500); });
    $('cz-print').addEventListener('click', function () { MC.print(pages(), O.title || 'צביעה לפי מספרים'); MC.used(TOOL, 'print', { src: O.src, style: O.style }); });
    MC.pdfButton($('cz-pdf'), pages, function () { return O.title || 'צביעה לפי מספרים'; }, TOOL);
    window.addEventListener('resize', function () { clearTimeout(window._czr); window._czr = setTimeout(function () { if (R) { play(); refreshPreview(); } }, 300); });
    sync();
  }
  function sync() {
    app.setAttribute('data-src', O.src); app.setAttribute('data-style', O.style);
    [].forEach.call(document.querySelectorAll('#cz-srcs button'), function (b) { b.setAttribute('aria-checked', String(b.getAttribute('data-s') === O.src)); });
    [].forEach.call(document.querySelectorAll('#cz-styles button'), function (b) { b.setAttribute('aria-checked', String(b.getAttribute('data-s') === O.style)); });
    [].forEach.call(document.querySelectorAll('#cz-tpls button'), function (b) { b.setAttribute('aria-checked', String(O.src === 'tpl' && b.getAttribute('data-t') === O.tpl)); });
    $('cz-kf').hidden = O.src !== 'img';
  }
  ui(); wire();
  if (O.src === 'img') O.src = 'tpl'; // תמונה אישית לא נשמרת – בכניסה חוזרת מתחילים מציור מוכן
  sync(); run();
  window.__cz = { get: function () { return R; }, process: process, TPL: TPL };
})();
