// "אולפן ההקלטות" (/kelim/shir/ulpan/) – מנוע הקול. רץ ב-Web Worker, הכול בטלפון, שום דבר לא עולה לשרת.
//   1. סנכרון: מוצא בכמה ההקלטה מאחרת אחרי המוזיקה (GCC-PHAT על המוזיקה שנכנסה למיקרופון).
//   2. ניקוי:  מוריד את המוזיקה שנכנסה למיקרופון (מסנן לכל תדר, בריבועים פחותים) + רעש רקע (Wiener).
//   3. קצב:    מזיז כל משפט מעט, למקום שבו הוא יושב הכי טוב על המוזיקה.
//   4. זיופים: מזיז כל תו לתו הקרוב בסולם של השיר, ושומר על הרטט הטבעי של הקול (TD-PSOLA).
//   5. MP3 (lamejs, LGPL).
'use strict';

// ---------- FFT ----------
var PLANS = {};
function plan(n) {
  var p = PLANS[n]; if (p) return p;
  var rev = new Uint32Array(n), lg = 0, i, b; while ((1 << lg) < n) lg++;
  for (i = 0; i < n; i++) { var r = 0; for (b = 0; b < lg; b++) if (i & (1 << b)) r |= 1 << (lg - 1 - b); rev[i] = r; }
  var c = new Float64Array(n >> 1), s = new Float64Array(n >> 1);
  for (i = 0; i < n >> 1; i++) { c[i] = Math.cos(2 * Math.PI * i / n); s[i] = Math.sin(2 * Math.PI * i / n); }
  return (PLANS[n] = { rev: rev, c: c, s: s });
}
function fft(re, im, inv) {
  var n = re.length, p = plan(n), rev = p.rev, C = p.c, S = p.s, i, j, k, t;
  for (i = 0; i < n; i++) { j = rev[i]; if (j > i) { t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
  for (var size = 2; size <= n; size <<= 1) {
    var half = size >> 1, step = (n / size) | 0;
    for (i = 0; i < n; i += size) {
      for (j = 0, k = 0; j < half; j++, k += step) {
        var wr = C[k], wi = inv ? S[k] : -S[k], a = i + j, b = a + half;
        var xr = re[b] * wr - im[b] * wi, xi = re[b] * wi + im[b] * wr;
        re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi;
      }
    }
  }
  if (inv) for (i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}
// דילול עם מסנן משולש (מספיק טוב לסנכרון ולמדידת גובה)
function decim(x, D) {
  if (D <= 1) return x;
  var m = Math.floor(x.length / D), y = new Float32Array(m), n = x.length, inv = 1 / (D * D);
  for (var i = 0; i < m; i++) { var c = i * D, s = 0; for (var j = -D + 1; j < D; j++) { var q = c + j; if (q >= 0 && q < n) s += x[q] * (D - (j < 0 ? -j : j)); } y[i] = s * inv; }
  return y;
}
function rms(x, a, b) { a = a || 0; b = b == null ? x.length : b; var s = 0; for (var i = a; i < b; i++) s += x[i] * x[i]; return Math.sqrt(s / Math.max(1, b - a)); }

// ---------- 1. סנכרון ----------
// בכמה דגימות a (ההקלטה) מאחרת אחרי b (המוזיקה). z = כמה הפסגה בולטת (מעל ~8 = בטוח).
function gcc(a, b, sr, lo, hi) {
  var L = Math.max(a.length, b.length) + Math.max(Math.abs(lo), Math.abs(hi)) + 8, n = 1; while (n < L) n <<= 1;
  var ar = new Float32Array(n), ai = new Float32Array(n), br = new Float32Array(n), bi = new Float32Array(n);
  ar.set(a); br.set(b); fft(ar, ai); fft(br, bi);
  var k0 = Math.max(1, Math.round(150 * n / sr)), k1 = Math.min((n >> 1) - 1, Math.round(Math.min(3800, sr * 0.45) * n / sr)), k;
  for (k = 0; k <= n >> 1; k++) {
    if (k < k0 || k > k1) { ar[k] = ai[k] = 0; }
    else { var xr = ar[k] * br[k] + ai[k] * bi[k], xi = ai[k] * br[k] - ar[k] * bi[k], m = Math.pow(xr * xr + xi * xi + 1e-30, 0.4); ar[k] = xr / m; ai[k] = xi / m; }
    if (k > 0 && k < n >> 1) { ar[n - k] = ar[k]; ai[n - k] = -ai[k]; }
  }
  br = bi = null; fft(ar, ai, true);
  function at(t) { return ar[((t % n) + n) % n]; }
  var best = lo, bv = -1e30, t, s = 0, s2 = 0, c = 0;
  for (t = lo; t <= hi; t++) { var v = at(t); if (v > bv) { bv = v; best = t; } }
  for (t = lo; t <= hi; t++) { if (Math.abs(t - best) < 6) continue; v = at(t); s += v; s2 += v * v; c++; }
  var mean = c ? s / c : 0, sd = Math.sqrt(Math.max(1e-30, c ? s2 / c - mean * mean : 1));
  var y0 = at(best - 1), y1 = bv, y2 = at(best + 1), den = y0 + y2 - 2 * y1, frac = den ? 0.5 * (y0 - y2) / den : 0;
  if (n > 262144) delete PLANS[n];
  return { lag: best + Math.max(-0.5, Math.min(0.5, frac)), z: (bv - mean) / sd };
}
// rec: ההקלטה. ref: המוזיקה מאותה נקודת התחלה. מחזיר איחור בדגימות (בקצב המלא), ביטחון, וסחיפת שעון.
function findLag(rec, ref, sr, loSec, hiSec) {
  var D = Math.max(1, Math.round(sr / 8000)), srd = sr / D, a = decim(rec, D), b = decim(ref, D);
  var g = gcc(a, b, srd, Math.round(loSec * srd), Math.round(hiSec * srd)), out = { lag: g.lag * D, z: g.z, drift: 0 };
  // סחיפה (מכשיר אחד מנגן ואחר מקליט, או אוזניות בלוטות'): משווים את השליש הראשון לשליש האחרון
  var third = Math.floor(a.length / 3);
  if (g.z > 8 && third > srd * 6) {
    var l0 = Math.round(g.lag), w = Math.round(0.04 * srd);
    function part(p0) { var bs = p0 - l0, bb = new Float32Array(third); for (var i = 0; i < third; i++) { var q = bs + i; bb[i] = q >= 0 && q < b.length ? b[q] : 0; } return gcc(a.subarray(p0, p0 + third), bb, srd, -w, w); }
    var g1 = part(0), g3 = part(a.length - third);
    if (g1.z > 6 && g3.z > 6) { var dr = (g3.lag - g1.lag) / (a.length - third); if (Math.abs(dr) > 2e-6 && Math.abs(dr) < 2e-3) { out.drift = dr; out.lag = (l0 + g1.lag) * D; } }
  }
  return out;
}
// ההקלטה מיושרת למוזיקה: y[i] = rec[i*(1+drift) + lag]
function shiftRec(rec, lag, drift, n) {
  var y = new Float32Array(n), N = rec.length, i, p;
  if (!drift) { var L = Math.round(lag); for (i = 0; i < n; i++) { p = i + L; y[i] = p >= 0 && p < N ? rec[p] : 0; } return y; }
  for (i = 0; i < n; i++) { p = i * (1 + drift) + lag; var q = Math.floor(p), f = p - q; y[i] = q >= 0 && q + 1 < N ? rec[q] * (1 - f) + rec[q + 1] * f : 0; }
  return y;
}

// ---------- 2. ניקוי: מוזיקה שנכנסה למיקרופון + רעש רקע ----------
var TAPS = 4, PRE = 2, POST = 1; // מסנן של 4 מסגרות לכל תדר: אחת לפני, ועד 2 אחרי (הד של החדר)
function solveH(Ar, Ai, br, bi, L) { // פתרון מערכת הרמיטית קטנה (אלימינציה של גאוס, מספרים מרוכבים)
  var i, j, k;
  for (i = 0; i < L; i++) {
    var pr = Ar[i * L + i], pi = Ai[i * L + i], pd = pr * pr + pi * pi; if (pd < 1e-30) { pr = 1e-15; pi = 0; pd = 1e-30; }
    for (j = i + 1; j < L; j++) {
      var fr = (Ar[j * L + i] * pr + Ai[j * L + i] * pi) / pd, fi = (Ai[j * L + i] * pr - Ar[j * L + i] * pi) / pd;
      if (!fr && !fi) continue;
      for (k = i; k < L; k++) { Ar[j * L + k] -= fr * Ar[i * L + k] - fi * Ai[i * L + k]; Ai[j * L + k] -= fr * Ai[i * L + k] + fi * Ar[i * L + k]; }
      br[j] -= fr * br[i] - fi * bi[i]; bi[j] -= fr * bi[i] + fi * br[i];
    }
  }
  for (i = L - 1; i >= 0; i--) {
    var sr = br[i], si = bi[i];
    for (k = i + 1; k < L; k++) { sr -= Ar[i * L + k] * br[k] - Ai[i * L + k] * bi[k]; si -= Ar[i * L + k] * bi[k] + Ai[i * L + k] * br[k]; }
    pr = Ar[i * L + i]; pi = Ai[i * L + i]; pd = pr * pr + pi * pi || 1e-30;
    br[i] = (sr * pr + si * pi) / pd; bi[i] = (si * pr - sr * pi) / pd;
  }
}
// rec, ref מיושרים (ref = null: רק רעש רקע). o: {noise 0..3, bleed 0..3}
function clean(rec, ref, sr, o, prog) {
  var N = sr >= 32000 ? 2048 : 1024, H = N >> 1, K = (N >> 1) + 1, n = rec.length, T = Math.ceil(n / H) + 1;
  var SEG = 256, OV = 64, HOPS = SEG - OV, MR = SEG + PRE + POST, win = new Float32Array(N), i, j, k, q;
  for (i = 0; i < N; i++) win[i] = Math.sqrt(0.5 - 0.5 * Math.cos(2 * Math.PI * (i + 0.5) / N));
  var lvN = Math.max(0, Math.min(3, o.noise == null ? 2 : o.noise)), lvB = Math.max(0, Math.min(3, o.bleed == null ? 2 : o.bleed));
  var alpha = [0, 1.0, 1.6, 2.6][lvN], gmin = [1, 0.3, 0.14, 0.06][lvN], cres = [0, 0.05, 0.14, 0.4][lvB], useRef = !!ref && lvB > 0;
  if (useRef) gmin = Math.min(gmin, [1, 0.25, 0.1, 0.04][lvB]);
  var YR = new Float32Array(K * SEG), YI = new Float32Array(K * SEG), RR = new Float32Array(K * SEG), RI = new Float32Array(K * SEG);
  var MRe = useRef ? new Float32Array(K * MR) : null, MIm = useRef ? new Float32Array(K * MR) : null, EP = useRef ? new Float32Array(K * SEG) : null;
  var CR = new Float32Array(K * OV), CI = new Float32Array(K * OV), NZ = new Float32Array(K), nzInit = false;
  var fr = new Float32Array(N), fi = new Float32Array(N), out = new Float32Array(n + N), tmp = new Float32Array(SEG);
  var Ar = new Float64Array(TAPS * TAPS), Ai = new Float64Array(TAPS * TAPS), br = new Float64Array(TAPS), bi = new Float64Array(TAPS), rcr = new Float64Array(TAPS), rci = new Float64Array(TAPS);
  var kLo = Math.ceil(70 * N / sr), sumY = 0, sumR = 0, sumE = 0, fo = new Float32Array(T + 1), fe = new Float32Array(T + 1);
  function frame(x, t, dR, dI, stride, row) { // STFT של מסגרת t לתוך מערך "תדר קודם" (k*stride + row)
    var base = (t - 1) * H, any = false;
    for (var a = 0; a < N; a++) { var p = base + a, v = p >= 0 && p < n ? x[p] : 0; if (v) any = true; fr[a] = v * win[a]; fi[a] = 0; }
    if (any) fft(fr, fi);
    for (var b = 0; b < K; b++) { dR[b * stride + row] = fr[b]; dI[b * stride + row] = fi[b]; }
  }
  var nseg = Math.max(1, Math.ceil((T - OV) / HOPS));
  for (var s = 0; s < nseg; s++) {
    var f0 = s * HOPS, last = s === nseg - 1, f1 = last ? T : f0 + SEG, nf = f1 - f0, from = s ? OV : 0;
    if (nf > SEG) nf = SEG;
    if (s) for (k = 0; k < K; k++) { YR.copyWithin(k * SEG, k * SEG + HOPS, k * SEG + SEG); YI.copyWithin(k * SEG, k * SEG + HOPS, k * SEG + SEG); }
    for (j = from; j < nf; j++) frame(rec, f0 + j, YR, YI, SEG, j);
    if (useRef) {
      var mfrom = s ? OV + PRE + POST : 0;
      if (s) for (k = 0; k < K; k++) { MRe.copyWithin(k * MR, k * MR + HOPS, k * MR + MR); MIm.copyWithin(k * MR, k * MR + HOPS, k * MR + MR); }
      for (j = mfrom; j < nf + PRE + POST; j++) frame(ref, f0 - PRE + j, MRe, MIm, MR, j);
    }
    var rows = nf + PRE + POST;
    for (k = 0; k < K; k++) {
      var yo = k * SEG, mo = k * MR, has = false, off, mr, mi, yr, yi;
      // --- מסנן לכל תדר: כמה מהמוזיקה נכנס למיקרופון, ובאיזה איחור ---
      if (useRef && k >= kLo) {
        for (q = 0; q < TAPS; q++) { var ar_ = 0, ai_ = 0; for (j = 0; j < rows - q; j++) { var ur = MRe[mo + j], ui = MIm[mo + j], vr = MRe[mo + j + q], vi = MIm[mo + j + q]; ar_ += ur * vr + ui * vi; ai_ += ur * vi - ui * vr; } rcr[q] = ar_; rci[q] = ai_; }
        if (rcr[0] > 1e-9 * rows) {
          has = true;
          for (var q1 = 0; q1 < TAPS; q1++) for (var q2 = 0; q2 < TAPS; q2++) { var d = q1 - q2; Ar[q1 * TAPS + q2] = rcr[d < 0 ? -d : d]; Ai[q1 * TAPS + q2] = d >= 0 ? rci[d] : -rci[-d]; }
          for (q = 0; q < TAPS; q++) {
            Ar[q * TAPS + q] += rcr[0] * 2e-3 + 1e-12; var sr_ = 0, si_ = 0; off = PRE + POST - q;
            for (j = 0; j < nf; j++) { mr = MRe[mo + j + off]; mi = MIm[mo + j + off]; yr = YR[yo + j]; yi = YI[yo + j]; sr_ += mr * yr + mi * yi; si_ += mr * yi - mi * yr; }
            br[q] = sr_; bi[q] = si_;
          }
          solveH(Ar, Ai, br, bi, TAPS);
        }
      }
      for (j = 0; j < nf; j++) {
        var er = 0, ei = 0;
        if (has) for (q = 0; q < TAPS; q++) { off = j + PRE + POST - q; mr = MRe[mo + off]; mi = MIm[mo + off]; er += br[q] * mr - bi[q] * mi; ei += br[q] * mi + bi[q] * mr; }
        yr = YR[yo + j]; yi = YI[yo + j]; var rr = yr - er, ri = yi - ei;
        RR[yo + j] = rr; RI[yo + j] = ri; if (EP) EP[yo + j] = er * er + ei * ei;
        if (k >= kLo) { sumY += yr * yr + yi * yi; sumR += rr * rr + ri * ri; sumE += er * er + ei * ei; }
        tmp[j] = rr * rr + ri * ri;
      }
      // --- רעש רקע בתדר הזה: האחוזון ה-20 של העוצמה (הרגעים השקטים) ---
      var srt = tmp.subarray(0, nf).slice().sort(), nz = srt[Math.floor(nf * 0.2)] * 2.2 + 1e-12;
      NZ[k] = nzInit ? Math.sqrt(NZ[k] * nz) : nz;
    }
    nzInit = true;
    for (k = 0; k < K; k++) { // --- Wiener עם "decision-directed": מנחית רעש בלי צפצופים ---
      yo = k * SEG;
      var k0 = Math.max(0, k - 2), k1 = Math.min(K - 1, k + 2), nzk = 0; for (q = k0; q <= k1; q++) nzk += Math.log(NZ[q]); nzk = Math.exp(nzk / (k1 - k0 + 1));
      var Gp = gmin, gamp = 1, hold = 0;
      for (j = 0; j < nf; j++) {
        rr = RR[yo + j]; ri = RI[yo + j]; var G = 1;
        if (k < kLo) G = 0;
        else if (alpha || useRef) {
          var e = EP ? cres * EP[yo + j] : 0; hold = e > hold * 0.6 ? e : hold * 0.6;
          var D = alpha * nzk + hold + 1e-12, gam = (rr * rr + ri * ri) / D, xi = 0.82 * Gp * Gp * gamp + 0.18 * Math.max(gam - 1, 0);
          G = xi / (1 + xi); if (G < gmin) G = gmin; Gp = G; gamp = gam;
        }
        RR[yo + j] = rr * G; RI[yo + j] = ri * G;
        if (last || j < HOPS) { fo[f0 + j] += (rr * rr + ri * ri) * G * G; if (EP) fe[f0 + j] += EP[yo + j]; }
      }
    }
    // --- חזרה לזמן, עם מעבר חלק בין מקטעים ---
    for (j = 0; j < nf; j++) {
      var rise = s && j < OV, fall = !last && j >= HOPS, w = rise ? (j + 0.5) / OV : fall ? 1 - (j - HOPS + 0.5) / OV : 1;
      if (fall) { for (k = 0; k < K; k++) { CR[k * OV + j - HOPS] = RR[k * SEG + j] * w; CI[k * OV + j - HOPS] = RI[k * SEG + j] * w; } continue; }
      for (k = 0; k < K; k++) {
        var vR = RR[k * SEG + j] * w, vI = RI[k * SEG + j] * w;
        if (rise) { vR += CR[k * OV + j]; vI += CI[k * OV + j]; }
        fr[k] = vR; fi[k] = vI;
      }
      for (k = 1; k < K - 1; k++) { fr[N - k] = fr[k]; fi[N - k] = -fi[k]; }
      fft(fr, fi, true);
      var base = (f0 + j - 1) * H;
      for (i = 0; i < N; i++) { var p = base + i; if (p >= 0 && p < n) out[p] += fr[i] * win[i]; }
    }
    if (prog) prog((s + 1) / nseg);
  }
  return { y: out.subarray(0, n), act: useRef ? { fo: fo, fe: fe, hop: H } : null, bleedDb: sumY ? 10 * Math.log10((sumE + 1e-20) / sumY) : -99, cancelDb: sumR ? 10 * Math.log10(sumY / sumR) : 0 };
}

// ---------- 3. קצב ----------
// מעטפת "התחלות" (onsets): כמה צליל חדש נכנס בכל 10 אלפיות שנייה
function onsetEnv(x, sr) {
  var D = Math.max(1, Math.round(sr / 16000)), y = decim(x, D), srd = sr / D, N = 512, H = Math.round(srd * 0.01), K = N >> 1;
  var n = Math.max(1, Math.floor((y.length - N) / H) + 1), env = new Float32Array(n), re = new Float32Array(N), im = new Float32Array(N), prev = new Float32Array(K), w = new Float32Array(N), i, k;
  for (i = 0; i < N; i++) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
  var k0 = Math.round(120 * N / srd);
  for (var t = 0; t < n; t++) {
    var b = t * H; for (i = 0; i < N; i++) { re[i] = (y[b + i] || 0) * w[i]; im[i] = 0; } fft(re, im);
    var f = 0; for (k = k0; k < K; k++) { var m = Math.log(1 + 100 * Math.sqrt(re[k] * re[k] + im[k] * im[k])), d = m - prev[k]; if (d > 0) f += d; prev[k] = m; }
    env[t] = t ? f : 0;
  }
  // מורידים ממוצע מקומי (0.4 שניות), משאירים רק את הפסגות
  var out = new Float32Array(n), W = 20, acc = 0, c = 0, a = 0, e = 0;
  for (t = 0; t < n; t++) { while (e < n && e <= t + W) { acc += env[e++]; c++; } while (a < t - W) { acc -= env[a++]; c--; } var v = env[t] - acc / c; out[t] = v > 0 ? v : 0; }
  return out; // 100 ערכים בשנייה
}
// משפטים: קטעים שבהם שרים, מופרדים בשתיקה של 0.22 שניות לפחות. מחזיר [{a,b}] בדגימות
function phrases(x, sr, ok) {
  var H = Math.round(sr * 0.01), n = Math.floor(x.length / H), e = new Float32Array(n), i, t, mx = 0;
  for (t = 0; t < n; t++) { var s = 0, b = t * H; for (i = 0; i < H; i++) s += x[b + i] * x[b + i]; e[t] = Math.sqrt(s / H); if (e[t] > mx) mx = e[t]; }
  var srt = e.slice().sort(), fl = srt[Math.floor(n * 0.15)] || 0, thr = Math.max(fl * 3, mx * 0.04, 1e-4), out = [], st = -1, gap = 0;
  for (t = 0; t < n; t++) {
    if (e[t] > thr && (!ok || ok[t])) { if (st < 0) st = t; gap = 0; }
    else if (st >= 0 && ++gap >= 22) { if (t - gap - st >= 12) out.push({ a: st * H, b: (t - gap + 1) * H }); st = -1; gap = 0; }
  }
  if (st >= 0 && n - gap - st >= 12) out.push({ a: st * H, b: (n - gap) * H });
  return out;
}
// בלי אוזניות: איפה באמת שרים, ואיפה נשארו רק שאריות של המוזיקה? בכל 10 אלפיות שנייה משווים את מה שנשאר אחרי הניקוי
// למוזיקה שנכנסה למיקרופון (על פני 0.15 שניות). שאריות הן בערך מאית ממנה; קול הוא הרבה יותר.
function voiced(act, n, sr, ratio) {
  var H = Math.round(sr * 0.01), m = Math.floor(n / H), ok = new Uint8Array(m), fo = act.fo, fe = act.fe, T = fo.length, r = ratio || 0.04;
  for (var t = 0; t < m; t++) { var c = Math.round(t * H / act.hop), so = 0, se = 0; for (var q = c - 3; q <= c + 3; q++) if (q >= 0 && q < T) { so += fo[q]; se += fe[q]; } ok[t] = so > r * se ? 1 : 0; }
  return ok;
}
// שקט בין המשפטים: מה שנשאר בין משפט למשפט (רעש, שאריות מוזיקה) מונמך בעדינות עד floor (0..1). בקול עצמו לא נוגעים:
// השער נפתח 90 אלפיות שנייה לפני כל משפט (נשימה, עיצור ראשון) ונסגר לאט, 0.28 שניות אחרי שהוא נגמר.
function gate(x, sr, floor, act, ratio) {
  var ph = phrases(x, sr, act ? voiced(act, x.length, sr, ratio) : null), n = x.length;
  if (!(floor < 1) || !ph.length) return x;
  var H = Math.round(sr * 0.005), m = Math.ceil(n / H) + 2, g = new Float32Array(m), pre = 0.09 * sr, post = 0.28 * sr, up = 0.06 * sr, down = 0.3 * sr, p, k;
  for (p = 0; p < ph.length; p++) {
    var a = ph[p].a - pre, b = ph[p].b + post, k0 = Math.max(0, Math.floor((a - up) / H)), k1 = Math.min(m - 1, Math.ceil((b + down) / H));
    for (k = k0; k <= k1; k++) { var t = k * H, u = t < a ? 1 - (a - t) / up : t > b ? 1 - (t - b) / down : 1; if (u <= 0) continue; u = u >= 1 ? 1 : 0.5 - 0.5 * Math.cos(Math.PI * u); if (u > g[k]) g[k] = u; }
  }
  var y = new Float32Array(n);
  for (var i = 0; i < n; i++) { var q = i / H, j = q | 0, f = q - j, w = g[j] * (1 - f) + g[j + 1] * f; y[i] = x[i] * (floor + (1 - floor) * w); }
  return y;
}
var GATE = [1, 0.4, 0.12, 0.03]; // לפי רמת "ניקוי רעשים": בלי / עדין / רגיל / חזק
// x: קול נקי, מיושר למוזיקה. envM: מעטפת ההתחלות של המוזיקה באותו קטע. strength 0..1, maxMs.
// envS (שיר מהאתר): איפה כל הברה אמורה להתחיל לפי המנגינה. משפט שיש בו 3 הברות ומעלה מיושר לפיהן, ובטווח רחב יותר (maxS).
function tighten(x, sr, envM, strength, maxMs, envS, maxS) {
  var ph = phrases(x, sr), info = [], n = x.length, H = sr * 0.01;
  if (!strength || !ph.length) return { y: x, phrases: ph.map(function (p) { return { a: p.a / sr, b: p.b / sr, ms: 0 }; }) };
  var envV = onsetEnv(x, sr), R0 = Math.round((maxMs || 70) / 10), RS = envS ? Math.round((maxS || 140) / 10) : 0, y = new Float32Array(n), F = Math.round(sr * 0.012);
  for (var p = 0; p < ph.length; p++) {
    var a = ph[p].a, b = ph[p].b, lo = p ? Math.floor((ph[p - 1].b + a) / 2) : 0, hi = p + 1 < ph.length ? Math.floor((b + ph[p + 1].a) / 2) : n;
    var ta = Math.max(0, Math.floor(a / H) - 2), tb = Math.min(envV.length, Math.ceil(b / H)), c = [], best = 0, bv = -1, d, t, sv = 0, R = R0, env = envM, byS = false;
    for (t = ta; t < tb; t++) sv += envV[t] * envV[t];
    if (envS) { var on = 0; for (t = ta; t < tb; t++) on += envS[t] || 0; if (on >= 9) { env = envS; R = RS; byS = true; } } // כל הברה = שטח 3
    for (d = -R; d <= R; d++) { var s = 0, sm = 0; for (t = ta; t < tb; t++) { var m = env[t + d] || 0; s += envV[t] * m; sm += m * m; } var v = s / Math.sqrt(sv * sm + 1e-12); c.push(v); if (v > bv) { bv = v; best = d; } }
    var c0 = c[R], ms = 0;
    if (best && bv > 0.12 && bv > c0 * 1.12 && best > -R && best < R) {
      var y0 = c[best + R - 1], y2 = c[best + R + 1], den = y0 + y2 - 2 * bv, frac = den ? 0.5 * (y0 - y2) / den : 0;
      ms = (best + Math.max(-0.5, Math.min(0.5, frac))) * 10 * strength;
    }
    var sh = Math.round(ms * sr / 1000); // חיובי = המשפט זז מאוחר יותר
    for (var i = lo; i < hi; i++) { var q = i + sh; if (q < 0 || q >= n) continue; var g = 1; if (i - lo < F) g = (i - lo) / F; if (hi - i < F) g = Math.min(g, (hi - i) / F); y[q] += x[i] * g; }
    info.push({ a: a / sr, b: b / sr, ms: Math.round(ms), s: byS ? 1 : 0 });
  }
  return { y: y, phrases: info };
}

// ---------- 4. זיופים ----------
// גובה הקול כל 10 אלפיות שנייה (YIN, עם FFT). 0 = לא קולי
function pitchTrack(x, sr) {
  var D = Math.max(1, Math.round(sr / 16000)), y = decim(x, D), srd = sr / D, W = 1024, Wh = 512, H = Math.round(srd * 0.01);
  var n = Math.max(1, Math.floor((y.length - W) / H) + 1), f = new Float32Array(n), ar = new Float32Array(W), ai = new Float32Array(W), br = new Float32Array(W), bi = new Float32Array(W);
  var minLag = Math.floor(srd / 900), maxLag = Math.min(Wh - 2, Math.ceil(srd / 70)), d = new Float32Array(maxLag + 2), i, tau, gate = Math.max(0.004, rms(y) * 0.12);
  for (var t = 0; t < n; t++) {
    var b = t * H, e0 = 0;
    for (i = 0; i < W; i++) { var v = y[b + i] || 0; br[i] = v; bi[i] = 0; ar[i] = i < Wh ? v : 0; ai[i] = 0; if (i < Wh) e0 += v * v; }
    if (Math.sqrt(e0 / Wh) < gate) { f[t] = 0; continue; }
    fft(ar, ai); fft(br, bi);
    for (i = 0; i < W; i++) { var xr = ar[i] * br[i] + ai[i] * bi[i], xi = ar[i] * bi[i] - ai[i] * br[i]; ar[i] = xr; ai[i] = xi; }
    fft(ar, ai, true); // ar[tau] = sum_{j<Wh} y[j]*y[j+tau]
    var et = e0, run = 0; d[0] = 1;
    for (tau = 1; tau <= maxLag + 1; tau++) { var o = y[b + tau - 1] || 0, nw = y[b + tau + Wh - 1] || 0; et += nw * nw - o * o; var df = e0 + et - 2 * ar[tau]; if (df < 0) df = 0; run += df; d[tau] = run ? df * tau / run : 1; }
    var pick = 0;
    for (tau = minLag; tau <= maxLag; tau++) if (d[tau] < 0.15) { while (tau + 1 <= maxLag && d[tau + 1] < d[tau]) tau++; pick = tau; break; }
    if (!pick) { var mn = 1; for (tau = minLag; tau <= maxLag; tau++) if (d[tau] < mn) { mn = d[tau]; pick = tau; } if (mn > 0.3) pick = 0; }
    if (pick) { var a0 = d[pick - 1], b0 = d[pick], c0 = d[pick + 1], den = a0 + c0 - 2 * b0, pp = den ? pick + 0.5 * (a0 - c0) / den : pick, hz = srd / pp; f[t] = hz > 65 && hz < 950 ? hz : 0; }
  }
  var g = new Float32Array(n); // סינון חציוני של 5: מעיף קפיצות אוקטבה בודדות
  for (t = 0; t < n; t++) { if (!f[t]) continue; var arr = []; for (i = -2; i <= 2; i++) if (f[t + i] > 0) arr.push(f[t + i]); arr.sort(function (p, q) { return p - q; }); g[t] = arr[arr.length >> 1]; }
  return g;
}
function f2m(f) { return 69 + 12 * Math.log(f / 440) / Math.LN2; }
// הסולם של השיר מתוך המוזיקה (Krumhansl-Schmuckler). מחזיר {pcs:[0..11], name, conf}
var KS_MAJ = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88], KS_MIN = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
var PC_HE = ['דו', 'דו דיאז', 'רה', 'מי במול', 'מי', 'פה', 'פה דיאז', 'סול', 'לה במול', 'לה', 'סי במול', 'סי'];
// אילו מ-12 הצלילים נשמעים במוזיקה, כל ~0.19 שניות. מזה יוצא הסולם, ולפי זה גם נבחר התו של הקול השני (שיתאים לאקורד).
function chromaFrames(x, sr) {
  var D = Math.max(1, Math.round(sr / 11025)), y = decim(x, D), srd = sr / D, N = 4096, step = Math.round(srd * 0.37), re = new Float32Array(N), im = new Float32Array(N), w = new Float32Array(N), i, k;
  for (i = 0; i < N; i++) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
  var k0 = Math.ceil(80 * N / srd), k1 = Math.floor(2000 * N / srd), pcOf = new Int8Array(k1 + 1);
  for (k = k0; k <= k1; k++) pcOf[k] = ((Math.round(f2m(k * srd / N)) % 12) + 12) % 12;
  var nfr = y.length >= N ? Math.floor((y.length - N) * 2 / step) + 1 : 0, c = new Float64Array(nfr * 12);
  for (var j = 0; j < nfr; j++) {
    var b = Math.floor(j * step / 2);
    for (i = 0; i < N; i++) { re[i] = y[b + i] * w[i]; im[i] = 0; } fft(re, im);
    var fr = new Float64Array(12), tot = 0; for (k = k0; k <= k1; k++) { var m = Math.sqrt(re[k] * re[k] + im[k] * im[k]) / Math.sqrt(k); fr[pcOf[k]] += m; tot += m; }
    if (tot > 1e-6) for (i = 0; i < 12; i++) c[j * 12 + i] = fr[i] / tot;
  }
  return { c: c, n: nfr, hop: step / 2 / srd, win: N / srd };
}
function detectKey(x, sr, cf) {
  cf = cf || chromaFrames(x, sr);
  var ch = new Float64Array(12), i;
  for (var j = 0; j < cf.n; j += 2) for (i = 0; i < 12; i++) ch[i] += cf.c[j * 12 + i];
  function corr(p, rot) { var mx = 0, my = 0, i; for (i = 0; i < 12; i++) { mx += ch[i]; my += p[i]; } mx /= 12; my /= 12; var a = 0, bb = 0, c = 0; for (i = 0; i < 12; i++) { var u = ch[(i + rot) % 12] - mx, v = p[i] - my; a += u * v; bb += u * u; c += v * v; } return a / Math.sqrt(bb * c + 1e-20); }
  var best = { c: -2 }, second = -2;
  for (var r = 0; r < 12; r++) [[KS_MAJ, 0], [KS_MIN, 1]].forEach(function (pm) { var c = corr(pm[0], r); if (c > best.c) { second = best.c; best = { c: c, pc: r, minor: pm[1] }; } else if (c > second) second = c; });
  if (best.pc == null) return { pcs: null, name: '', conf: 0 };
  var steps = best.minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
  return { pcs: steps.map(function (s) { return (best.pc + s) % 12; }), name: PC_HE[best.pc] + (best.minor ? ' מינור' : ' מז\'ור'), conf: best.c, margin: best.c - second };
}
// התו הקרוב בסולם (pcs = null: חצי הטון הקרוב)
function scaleNote(m, pcs) { if (!pcs) return Math.round(m); var best = null; for (var o = Math.floor(m / 12) - 1; o <= Math.floor(m / 12) + 1; o++) for (var q = 0; q < pcs.length; q++) { var c = o * 12 + pcs[q]; if (best == null || Math.abs(c - m) < Math.abs(best - m)) best = c; } return best; }
// התווים היציבים בשירה (70 אלפיות שנייה ומעלה): [{st, end, med}] במסגרות של 10 אלפיות שנייה. med = הגובה החציוני (MIDI)
function notesOf(f) {
  var n = f.length, k = 0, out = [], i;
  while (k < n) {
    if (!f[k]) { k++; continue; }
    var st = k, sum = 0, cnt = 0, gap = 0, end = k;
    while (k < n) { if (!f[k]) { if (++gap > 2) break; k++; continue; } var m = f2m(f[k]); if (cnt >= 3 && Math.abs(m - sum / cnt) > 0.8) break; gap = 0; sum += m; cnt++; end = k; k++; }
    if (cnt >= 7) { var ms = []; for (i = st; i <= end; i++) if (f[i]) ms.push(f2m(f[i])); ms.sort(function (a, b) { return a - b; }); out.push({ st: st, end: end, med: ms[ms.length >> 1] }); }
    if (k === st) k++;
  }
  return out;
}
// מפצל תו ששרו ברצף אחד לפי התווים של המנגינה שמתחתיו. מחזיר את החלקים (כל אחד עם התו שלו במנגינה), או null כשאין מה לפצל.
function splitByMel(nt, f, M, t0) {
  var a = t0 + nt.st * 0.01 + 0.02, b = t0 + nt.end * 0.01 + 0.03, lo = 0, hi = M.n, j, g = [], i, k;
  while (lo < hi) { var md = (lo + hi) >> 1; if (M.e[md] <= a) lo = md + 1; else hi = md; }
  for (j = lo; j < M.n && M.t[j] < b; j++) {
    if (M.line[j] !== nt.line || Math.min(b, M.e[j]) - Math.max(a, M.t[j]) < 0.09) continue;
    if (g.length && g[g.length - 1].midi === M.midi[j]) { g[g.length - 1].e = M.e[j]; continue; } // אותו תו פעמיים ברצף: אין מה לפצל
    g.push({ midi: M.midi[j], t: M.t[j], e: M.e[j], k: Math.round((M.t[j] - t0 - 0.02) / 0.01) });
  }
  if (g.length < 2 || b - a < 0.7 * (g[g.length - 1].e - g[0].t)) return null; // תו קצר שרק יושב על הגבול (הזמר הקדים או איחר): לא מפצלים
  var segs = [], st = nt.st, gi = 0;
  for (i = 1; i < g.length; i++) { // הגבול: המקום במנגינה, ואם יש לידו עיצור (רגע בלי גובה) – שם
    var kb = g[i].k, best = -1; for (k = 0; k <= 6 && best < 0; k++) { if (!f[kb - k]) best = kb - k; else if (!f[kb + k]) best = kb + k; }
    if (best >= 0) kb = best;
    if (kb - st < 7) { gi = i; continue; } // החלק שלפני הגבול קצר מדי: מצטרף לתו הבא
    if (nt.end - kb + 1 < 7) break;        // החלק שאחריו קצר מדי: נשאר עם התו הנוכחי
    segs.push({ st: st, end: kb - 1, g: g[gi] }); st = kb; gi = i;
  }
  segs.push({ st: st, end: nt.end, g: g[gi] });
  if (segs.length < 2) return null;
  return segs.map(function (q) {
    var ms = []; for (k = q.st; k <= q.end; k++) if (f[k]) ms.push(f2m(f[k])); if (!ms.length) ms.push(nt.med); ms.sort(function (x, y) { return x - y; });
    var med = ms[ms.length >> 1], ml = q.g.midi + 12 * Math.round((med - q.g.midi) / 12);
    return { st: q.st, end: q.end, med: med, mel: ml, dev: med - ml, line: nt.line, lineOk: true, follow: Math.abs(med - ml) <= 2.6 };
  });
}
// מתקן כל תו כיחידה אחת: מזיז את כולו לתו הקרוב בסולם, והרטט והגלישות נשארים טבעיים
// mel (שיר מהאתר, מתיקון "בינוני" ומעלה): {M: המנגינה הידועה, t0: הזמן בשיר של תחילת x}. שורה שבה באמת שרים את המנגינה
// (70% מהזמן בטווח טון וחצי ממנה) מתוקנת לתו של המנגינה עצמה, גם כשהזמר נחת על התו השכן. שורה ששרים אחרת: לפי הסולם, כרגיל.
function tune(x, sr, pcs, strength, mel) {
  var f = pitchTrack(x, sr), n = f.length, sh = new Float32Array(n), has = new Uint8Array(n), k, i, notes = 0, sumAbs = 0, melN = 0, split = 0, edges = [];
  if (!strength) return { y: x, f: f, notes: 0, cents: 0, mel: 0, split: 0 };
  var nts = notesOf(f);
  if (mel && mel.M && strength >= 0.7) {
    var M = mel.M, lines = {};
    nts.forEach(function (nt) {
      var a = mel.t0 + nt.st * 0.01 + 0.02, b = mel.t0 + nt.end * 0.01 + 0.03, lo = 0, hi = M.n, bo = 0, bi = -1, j;
      while (lo < hi) { var md = (lo + hi) >> 1; if (M.e[md] <= a) lo = md + 1; else hi = md; }
      for (j = lo; j < M.n && M.t[j] < b; j++) { var ov = Math.min(b, M.e[j]) - Math.max(a, M.t[j]); if (ov > bo) { bo = ov; bi = j; } }
      if (bi < 0) return;
      nt.mel = M.midi[bi] + 12 * Math.round((nt.med - M.midi[bi]) / 12); nt.dev = nt.med - nt.mel; nt.line = M.line[bi];
      var L = lines[nt.line] = lines[nt.line] || { tot: 0, ok: 0, n: 0 }, len = nt.end - nt.st + 1; L.tot += len; L.n++; if (Math.abs(nt.dev) <= 1.5) L.ok += len;
    });
    nts.forEach(function (nt) { var L = nt.mel != null ? lines[nt.line] : null; nt.lineOk = !!L && L.n >= 3 && L.ok >= (mel.thr || 0.7) * L.tot; nt.follow = nt.lineOk && Math.abs(nt.dev) <= 2.6; });
    // תו ארוך שהמנגינה מתחלפת בתוכו (הזמר נשאר על אותו גובה בשתי הברות): מפצלים אותו לפי המנגינה, וכל חלק מתוקן לתו שלו.
    // רק בשורה שבאמת שרים בה את המנגינה, ורק כשכל חלק ארוך מספיק (90 אלפיות שנייה במנגינה, 70 בשירה).
    if (!mel.nosplit) { var out = []; nts.forEach(function (nt) { var sg = nt.lineOk ? splitByMel(nt, f, M, mel.t0) : null; if (sg) { split++; edges.push.apply(edges, sg.slice(1).map(function (q) { return q.st; })); out.push.apply(out, sg); } else out.push(nt); }); nts = out; }
  }
  nts.forEach(function (nt) {
    var sc = scaleNote(nt.med, pcs), d = sc - nt.med; if (Math.abs(d) < 0.06) d = 0; d *= strength;
    if (nt.follow && nt.mel !== sc) { d += nt.mel - sc; melN++; } // התו הנכון במנגינה הוא לא התו הקרוב בסולם: קופצים אליו
    for (i = nt.st; i <= nt.end; i++) { sh[i] = d; has[i] = 1; } notes++; sumAbs += Math.abs(d) * 100;
  });
  edges.forEach(function (e) { var u = sh[e - 4], w = sh[e + 3]; if (e - 4 < 0 || e + 3 >= n || u === w) return; for (k = -3; k <= 2; k++) sh[e + k] = u + (w - u) * (k + 4) / 7; }); // בתוך תו שפוצל: גלישה קצרה בין שני הגבהים
  // בין תווים: מעבר הדרגתי. ואז החלקה של 50 אלפיות שנייה
  var lastI = -1;
  for (i = 0; i < n; i++) { if (!has[i]) continue; if (lastI >= 0 && i - lastI > 1 && i - lastI < 30) for (k = lastI + 1; k < i; k++) sh[k] = sh[lastI] + (sh[i] - sh[lastI]) * (k - lastI) / (i - lastI); lastI = i; }
  var ratio = new Float32Array(n);
  for (i = 0; i < n; i++) { var s = 0, c = 0; for (k = -2; k <= 2; k++) if (i + k >= 0 && i + k < n) { s += sh[i + k]; c++; } ratio[i] = f[i] ? Math.pow(2, s / c / 12) : 1; }
  return { y: psola(x, sr, f, ratio), f: f, notes: notes, cents: notes ? Math.round(sumAbs / notes) : 0, mel: melN, split: split };
}
// TD-PSOLA: מקטעים של שתי תקופות, מונחים מחדש במרווח תקופה/יחס. האורך והצבע של הקול נשמרים.
function psola(x, sr, f, ratio) {
  var N = x.length, y = new Float32Array(N), ws = new Float32Array(N), hop = sr * 0.01, off = 0.02 * sr, nf = f.length, i;
  function fa(p) { var k = Math.round((p - off) / hop); return k < 0 ? 0 : k >= nf ? nf - 1 : k; }
  var marks = []; i = 0;
  while (i < N) { var k = fa(i), P = f[k] ? sr / f[k] : sr * 0.008; marks.push(i, P, f[k] ? ratio[k] : 1); i += Math.max(32, Math.round(P)); }
  var ts = 0, mi = 0, nm = marks.length / 3;
  while (ts < N) {
    while (mi + 1 < nm && Math.abs(marks[(mi + 1) * 3] - ts) <= Math.abs(marks[mi * 3] - ts)) mi++;
    var c = marks[mi * 3], Pm = marks[mi * 3 + 1], L = Math.round(Pm), rt = Math.round(ts);
    for (var j = -L; j <= L; j++) { var src = c + j, dst = rt + j; if (src < 0 || src >= N || dst < 0 || dst >= N) continue; var w = 0.5 + 0.5 * Math.cos(Math.PI * j / (L + 1)); y[dst] += x[src] * w; ws[dst] += w; }
    ts += Math.max(16, Pm / marks[mi * 3 + 2]);
  }
  for (i = 0; i < N; i++) if (ws[i] > 0.15) y[i] /= ws[i];
  return y;
}

// ---------- 4ב. קולות ליווי: הכפלה וקול שני ----------
// בכמה חצאי טונים להזיז כל מסגרת כדי לקבל קול שני (dir = 1 מעל הקול, 1- מתחתיו). לכל תו יציב נבחר תו אחד:
// טרצה או קוורטה בסולם, זה שהכי מתאים למה שהמוזיקה מנגנת באותו רגע (cf = chromaFrames). הרטט של הקול נשאר.
function harmShift(f, notes, dir, pcs, cf, rnd) {
  var n = f.length, sh = new Float32Array(n), has = new Uint8Array(n), w = new Float64Array(12), i, k, picked = [];
  notes.forEach(function (nt) {
    var L = scaleNote(nt.med, pcs), t0 = nt.st * 0.01, t1 = nt.end * 0.01 + 0.04, mx = 0, j;
    for (i = 0; i < 12; i++) w[i] = 0;
    if (cf && cf.n) {
      var j0 = Math.max(0, Math.ceil((t0 - 0.15 - cf.win / 2) / cf.hop)), j1 = Math.min(cf.n - 1, Math.floor((t1 + 0.15 - cf.win / 2) / cf.hop));
      if (j1 < j0) j0 = j1 = Math.max(0, Math.min(cf.n - 1, Math.round(((t0 + t1) / 2 - cf.win / 2) / cf.hop)));
      for (j = j0; j <= j1; j++) for (i = 0; i < 12; i++) w[i] += cf.c[j * 12 + i];
      for (i = 0; i < 12; i++) if (w[i] > mx) mx = w[i];
    }
    var best = null, bs = -1e9;
    for (var s = 3; s <= 5; s++) {
      var T = L + dir * s, pc = ((T % 12) + 12) % 12; if (pcs && pcs.indexOf(pc) < 0) continue;
      var sc = (s < 5 ? 0.2 : 0) + (mx ? (w[pc] - 0.35 * Math.max(w[(pc + 1) % 12], w[(pc + 11) % 12])) / mx : 0);
      if (sc > bs) { bs = sc; best = T; }
    }
    if (best == null) best = L + dir * 4;
    var d = best - nt.med; d = dir > 0 ? Math.max(2.3, Math.min(5.7, d)) : Math.min(-2.3, Math.max(-5.7, d));
    d += rnd() * 0.05; // כמה סנטים לכאן או לכאן, כמו זמר אחר
    for (i = nt.st; i <= nt.end; i++) { sh[i] = d; has[i] = 1; }
    picked.push({ st: nt.st, end: nt.end, lead: L, note: best });
  });
  // בין תו לתו: מעבר הדרגתי כשהרווח קצר, אחרת כל חצי נצמד לתו הקרוב אליו
  var last = -1;
  for (i = 0; i < n; i++) {
    if (!has[i]) continue;
    if (last < 0) for (k = 0; k < i; k++) sh[k] = sh[i];
    else if (i - last > 1) { var g = i - last; for (k = last + 1; k < i; k++) sh[k] = g < 30 ? sh[last] + (sh[i] - sh[last]) * (k - last) / g : (k - last <= g / 2 ? sh[last] : sh[i]); }
    last = i;
  }
  if (last < 0) for (k = 0; k < n; k++) sh[k] = dir * 4; else for (k = last + 1; k < n; k++) sh[k] = sh[last];
  var ratio = new Float32Array(n);
  for (i = 0; i < n; i++) { var a = 0, c = 0; for (k = -2; k <= 2; k++) if (i + k >= 0 && i + k < n) { a += sh[i + k]; c++; } ratio[i] = f[i] ? Math.pow(2, a / c / 12) : 1; }
  return { ratio: ratio, picked: picked };
}
// v: הקול המוכן לאורך כל השיר. מחזיר ערוץ ליווי בסטריאו, בחצי קצב דגימה (הליווי ממילא רך ובלי גבוהים):
//   double – שתי הכפלות של הקול, אחת בכל צד, כמה סנטים מעל ומתחת ובאיחור קטן (כמו שמקליטים פעמיים באולפן)
//   second – קול שני מעל הקול            choir – שתי ההכפלות + קול שני מעל + קול שני מתחת
// o: {mode, pcs, cf, parts (לבדיקות: מחזיר גם כל קול בנפרד)}
function backing(v, sr, o) {
  o = o || {};
  var D = sr >= 32000 ? 2 : 1, srd = sr / D, x = decim(v, D), n = x.length, f = pitchTrack(v, sr), nf = f.length, mode = o.mode || 'double';
  var L = new Float32Array(n), R = new Float32Array(n), seed = 20261112, hop = srd * 0.01, off = 0.02 * srd, k, parts = o.parts ? {} : null, info = { sr: srd, notes: 0 };
  function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2147483648 - 1; }
  var vg = new Float32Array(nf + 2); // 1 = שרים תו, 0 = עיצור או שקט (מוחלק)
  for (k = 0; k < nf; k++) vg[k] = ((k && f[k - 1] ? 1 : 0) + (f[k] ? 1 : 0) + (k + 1 < nf && f[k + 1] ? 1 : 0)) / 3;
  // מוסיף קול לערוץ: באיחור delay שניות, כשהעיצורים מונמכים ל-uv (שלא יישמעו כפול)
  function add(name, y, delay, uv, gl, gr) {
    var dl = Math.round(delay * srd);
    for (var i = dl; i < n; i++) { var p = i - dl, q = (p - off) / hop, kk = q < 0 ? 0 : q >= nf ? nf - 1 : Math.floor(q), fr = q - kk; if (fr < 0) fr = 0; else if (fr > 1) fr = 1; var g = vg[kk] + (vg[kk + 1] - vg[kk]) * fr, s = y[p] * (uv + (1 - uv) * g); L[i] += s * gl; R[i] += s * gr; }
    if (parts) parts[name] = y;
  }
  function dbl(cents, phase) { var r = new Float32Array(nf); for (var k = 0; k < nf; k++) r[k] = f[k] ? Math.pow(2, (cents + 3 * Math.sin(2 * Math.PI * 0.31 * k * 0.01 + phase)) / 1200) : 1; return psola(x, srd, f, r); }
  function harm(dir) { var h = harmShift(f, notes, dir, o.pcs || null, o.cf || null, rnd); info[dir > 0 ? 'up' : 'down'] = h.picked; return psola(x, srd, f, h.ratio); }
  var notes = mode === 'double' ? [] : notesOf(f); info.notes = notes.length;
  if (mode === 'double') { add('d1', dbl(8, 0), 0.016, 0.5, 0.5, 0.06); add('d2', dbl(-8, 2), 0.026, 0.5, 0.06, 0.5); }
  else if (mode === 'second') add('up', harm(1), 0.014, 0.35, 0.67, 0.48);
  else { add('d1', dbl(8, 0), 0.016, 0.5, 0.44, 0.055); add('d2', dbl(-8, 2), 0.026, 0.5, 0.055, 0.44); add('up', harm(1), 0.014, 0.35, 0.5, 0.3); add('down', harm(-1), 0.021, 0.35, 0.27, 0.47); }
  return { L: L, R: R, sr: srd, info: info, f: f, parts: parts };
}

// ---------- 5. MP3 ----------
var lameLoaded = false;
function toMp3(chans, sr, kbps, prog) {
  if (!lameLoaded) { importScripts('/assets/vendor/lamejs/lame.min.js'); lameLoaded = true; }
  var nc = chans.length, enc = new self.lamejs.Mp3Encoder(nc, sr, kbps || 160), out = [], B = 1152;
  function i16(a) { var o = new Int16Array(a.length); for (var i = 0; i < a.length; i++) { var s = Math.max(-1, Math.min(1, a[i])); o[i] = s < 0 ? s * 0x8000 : s * 0x7fff; } return o; }
  var L = i16(chans[0]), R = nc > 1 ? i16(chans[1]) : null;
  for (var i = 0; i < L.length; i += B) {
    var buf = R ? enc.encodeBuffer(L.subarray(i, i + B), R.subarray(i, i + B)) : enc.encodeBuffer(L.subarray(i, i + B));
    if (buf.length) out.push(new Uint8Array(buf));
    if (prog && i % (B * 300) === 0) prog(i / L.length);
  }
  var end = enc.flush(); if (end.length) out.push(new Uint8Array(end));
  return new Blob(out, { type: 'audio/mpeg' });
}

// ---------- העבודה כולה ----------
var REF = null;   // {x: המוזיקה במונו, sr, env: מעטפת התחלות, key}
var TAKES = {};   // id -> {a: קול נקי ומיושר, start, lag, z, ...}
// המנגינה הידועה של שיר מהאתר. a = [זמן התחלה, אורך, תו (MIDI), מספר שורה] לכל הברה, לפי הסדר.
// env: איפה כל הברה מתחילה, באותו ציר ובאותו היסט של onsetEnv (פסגה כ-15 אלפיות שנייה לפני ההתחלה עצמה).
function melOf(a) {
  var n = Math.floor(a.length / 4), M = { n: n, t: new Float64Array(n), e: new Float64Array(n), midi: new Float32Array(n), line: new Int32Array(n), range: 140, env: null }, i, k, step = 1e9, end = 0;
  for (i = 0; i < n; i++) { M.t[i] = a[i * 4]; M.e[i] = a[i * 4] + a[i * 4 + 1]; M.midi[i] = a[i * 4 + 2]; M.line[i] = a[i * 4 + 3]; if (a[i * 4 + 1] > 0.02 && a[i * 4 + 1] < step) step = a[i * 4 + 1]; if (M.e[i] > end) end = M.e[i]; }
  M.range = Math.round(Math.max(70, Math.min(160, step * 450))); // פחות מחצי הברה, כדי לא להיצמד להברה השכנה
  var env = M.env = new Float32Array(Math.ceil(end * 100) + 100);
  for (i = 0; i < n; i++) { var c = M.t[i] * 100 - 1.5; for (k = Math.floor(c) - 3; k <= Math.ceil(c) + 3; k++) { var w = 1 - Math.abs(k - c) / 3; if (k >= 0 && k < env.length && w > env[k]) env[k] = w; } }
  return M;
}
// כל ההקלטה מול המקום הידוע של ההברות: בכמה מסגרות (10 אלפיות שנייה) להזיז את הקול. מחזיר null כשאין פסגה אחת ברורה
// (פחות מ-8 הברות, או שהזזה בהברה שלמה מתאימה כמעט באותה מידה).
function melSync(ev, envS, lo, hi) {
  var n = Math.min(ev.length, envS.length), sv = 0, on = 0, t, d, sc = [], best = lo, bv = -1, second = -1;
  for (t = 0; t < n; t++) { sv += ev[t] * ev[t]; on += envS[t]; }
  if (on < 24 || !sv) return null;
  for (d = lo; d <= hi; d++) { var s = 0, sm = 0; for (t = 0; t < ev.length; t++) { var m = envS[t + d] || 0; s += ev[t] * m; sm += m * m; } var v = s / Math.sqrt(sv * sm + 1e-12); sc.push(v); if (v > bv) { bv = v; best = d; } }
  for (d = lo; d <= hi; d++) if (Math.abs(d - best) > 5 && sc[d - lo] > second) second = sc[d - lo];
  return bv > 0.1 && bv > second * 1.25 && best > lo && best < hi ? { d: best, v: bv, second: second } : null;
}
// מעטפת שמתחילה במסגרת t0 (גם כשהיא שלילית)
function envFrom(env, t0) { if (t0 >= 0) return env.subarray(Math.min(t0, env.length)); var y = new Float32Array(env.length - t0); y.set(env, -t0); return y; }
function setRef(x, sr, pcs, mel) { var cf = chromaFrames(x, sr); REF = { x: x, sr: sr, env: onsetEnv(x, sr), cf: cf, mel: mel && mel.length >= 12 ? melOf(mel) : null, key: pcs && pcs.length ? { pcs: pcs, name: '', conf: 1, margin: 1 } : detectKey(x, sr, cf) }; TAKES = {}; return { key: REF.key, dur: x.length / sr }; }
// קולות הליווי של השיר כולו (v = ערוץ הקול המוכן, על ציר הזמן של המוזיקה)
// zones (לא חובה): [התחלה, סוף, התחלה, סוף...] בשניות על ציר המוזיקה. הליווי נשמע רק בהם (למשל רק בפזמון), עם כניסה ויציאה רכות.
function stageBack(v, mode, zones) {
  var key = REF.key, pcs = !key.pcs || key.conf < 0.45 ? null : key.pcs, r = backing(v, REF.sr, { mode: mode, pcs: pcs, cf: REF.cf });
  if (zones && zones.length >= 2) {
    var n = r.L.length, g = new Float32Array(n), F = Math.round(0.12 * r.sr), z, i;
    for (z = 0; z + 1 < zones.length; z += 2) { var a = Math.max(0, Math.round(zones[z] * r.sr) - F), b = Math.min(n, Math.round(zones[z + 1] * r.sr) + F); for (i = a; i < b; i++) { var w = Math.min(1, (i - a) / F, (b - i) / F); if (w > g[i]) g[i] = w; } }
    for (i = 0; i < n; i++) { r.L[i] *= g[i]; r.R[i] *= g[i]; }
  }
  return { L: r.L, R: r.R, sr: r.sr, notes: r.info.notes };
}
function refSlice(start, n) { var y = new Float32Array(n), x = REF.x; for (var i = 0; i < n; i++) { var p = start + i; y[i] = p >= 0 && p < x.length ? x[p] : 0; } return y; }
// רוחב הפס של המיקרופון, מתוך ההקלטה עצמה. מיקרופון של אוזניות בלוטות' מקליט כמו שיחת טלפון: אין בו כלום מעל 4kHz (או 8kHz).
// מחזיר {band: 0 = מלא / 4 / 8 (kHz), mid, hi: העוצמה ב-4.5–7.5kHz וב-9–14kHz מול החלק החזק של הקול, ב-dB}, או null כשאין מספיק קול.
function micBand(x, sr) {
  var N = 1024, K = N >> 1, BW = 500, nb = Math.floor(Math.min(16000, sr / 2) / BW), T = Math.floor(x.length / N), i, k, t;
  if (sr < 15000) return { band: 4, mid: -99, hi: -99 };
  if (T < 40) return null;
  var re = new Float32Array(N), im = new Float32Array(N), w = new Float32Array(N), P = new Float32Array(T * nb), tot = new Float32Array(T), mx = 0;
  for (i = 0; i < N; i++) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
  for (t = 0; t < T; t++) {
    for (i = 0; i < N; i++) { re[i] = x[t * N + i] * w[i]; im[i] = 0; }
    fft(re, im);
    for (k = 2; k < K; k++) { var b = Math.floor(k * sr / N / BW); if (b >= nb) break; var p = re[k] * re[k] + im[k] * im[k]; P[t * nb + b] += p; tot[t] += p; }
    if (tot[t] > mx) mx = tot[t];
  }
  var m = new Float64Array(nb), cnt = 0; // רק מסגרות שיש בהן קול (עד 30dB מתחת לחזקה ביותר)
  for (t = 0; t < T; t++) if (tot[t] > mx * 0.001) { cnt++; for (k = 0; k < nb; k++) m[k] += P[t * nb + k]; }
  if (cnt < 30 || mx < 1e-7) return null;
  function db(a, b2) { var s = 0; for (var q = a; q < b2; q++) s += m[q]; return 10 * Math.log10(s / (b2 - a) / cnt + 1e-30); }
  var ref = -999; for (k = 0; k < 7; k++) ref = Math.max(ref, db(k, k + 1));
  var mid = db(9, 15) - ref, hi = nb >= 28 ? db(18, 28) - ref : -99;
  return { band: mid < -55 ? 4 : hi < -62 ? 8 : 0, mid: +mid.toFixed(1), hi: +hi.toFixed(1) };
}
// שלב א': סנכרון + ניקוי. rec מתחיל (לפני תיקון האיחור) בנקודה start במוזיקה.
// o: {lagGuess (דגימות), lagFixed (המשתמש קבע ידנית), loSec, hiSec, noise, bleed, melMin, melLo, melHi (אוזניות בלוטות' שלא נמדדו: הניחוש באמצע הטווח, אז מחפשים לשני הצדדים וסומכים על המנגינה כבר מ-20 אלפיות שנייה)}
function stageClean(id, rec, start, o, prog) {
  var sr = REF.sr, n = rec.length, ref = refSlice(start, n), lg = null, lag, mode;
  var mb = micBand(rec, sr);
  if (o.lagFixed != null) { lag = o.lagFixed; mode = 'manual'; lg = { z: 0, drift: 0 }; }
  else {
    lg = findLag(rec, ref, sr, o.loSec == null ? -0.06 : o.loSec, o.hiSec == null ? 0.9 : o.hiSec);
    if (lg.z >= 8) { lag = lg.lag; mode = 'bleed'; }
    else { lag = o.lagGuess || 0; mode = 'guess'; lg.drift = 0; }
  }
  if (prog) prog(0.12);
  var al = shiftRec(rec, lag, lg.drift, n);
  // יש מוזיקה בהקלטה? מנקים אותה רק אם היא באמת שם (סנכרון בטוח), או אם המשתמש אמר "בלי אוזניות"
  var bleed = mode === 'bleed' || (mode === 'manual' && o.speaker);
  var r = clean(al, bleed ? ref : null, sr, { noise: o.noise, bleed: o.bleed }, function (p) { if (prog) prog(0.12 + 0.88 * p); });
  var a = new Float32Array(r.y), sync = ''; // עותק (subarray של מאגר גדול יותר)
  if (mode === 'guess' && !o.trust) { // עם אוזניות אין מוזיקה בהקלטה: מכוונים לפי הקצב, בטווח קטן סביב הניחוש
    var ev = onsetEnv(a, sr), t0 = Math.round(start / (sr * 0.01)), best = 0, bv = -1, R = 6, d, s, sm, t, m, v;
    var ms = !o.nomel && REF.mel ? melSync(ev, envFrom(REF.mel.env, t0), o.melLo || -42, o.melHi || 10) : null;
    if (ms && Math.abs(ms.d) >= (o.melMin || 5)) { best = ms.d; sync = 'mel'; } // שיר מהאתר: לפי המקום הידוע של ההברות, גם כשהאיחור גדול (אוזניות בלוטות')
    else for (d = -R; d <= R; d++) { s = 0; sm = 0; for (t = 0; t < ev.length; t++) { m = REF.env[t0 + t + d] || 0; s += ev[t] * m; sm += m * m; } v = s / Math.sqrt(sm + 1e-12) * Math.exp(-d * d / 32); if (v > bv) { bv = v; best = d; } }
    if (best) { var shs = Math.round(best * 0.01 * sr), a2 = new Float32Array(n); for (var i = 0; i < n; i++) { var q = i - shs; a2[i] = q >= 0 && q < n ? a[q] : 0; } a = a2; lag -= shs; }
  }
  if (!o.nogate) a = gate(a, sr, GATE[Math.max(0, Math.min(3, o.noise == null ? 2 : o.noise))], o.gateR === 0 ? null : r.act, o.gateR);
  TAKES[id] = { a: a, start: start, sr: sr };
  return { lag: lag, lagMs: Math.round(lag / sr * 1000), z: +lg.z.toFixed(1), drift: lg.drift, mode: mode, sync: sync, bleedDb: +r.bleedDb.toFixed(1), cancelDb: +r.cancelDb.toFixed(1), level: rms(a), band: mb ? mb.band : 0, bandMid: mb ? mb.mid : null, bandHi: mb ? mb.hi : null };
}
// שלב ב': קצב + זיופים, מהקול הנקי השמור. o: {tight 0..1, tune 0..1, chromatic}
function stageFinish(id, o) {
  var T = TAKES[id]; if (!T) throw new Error('no take');
  var sr = T.sr, t0 = Math.round((T.start - (o.shiftS || 0)) / (sr * 0.01)), envM = envFrom(REF.env, t0), M = o.nomel ? null : REF.mel;
  var tg = tighten(T.a, sr, envM, o.tight || 0, 70, M ? envFrom(M.env, t0) : null, M ? M.range : 0);
  var key = REF.key, pcs = o.chromatic || !key.pcs || key.conf < 0.45 ? null : key.pcs;
  var tn = tune(tg.y, sr, pcs, o.tune || 0, M ? { M: M, t0: (T.start - (o.shiftS || 0)) / sr, thr: o.melThr, nosplit: o.nosplit } : null);
  var y = tn.y === T.a ? new Float32Array(tn.y) : tn.y;
  return { y: y, phrases: tg.phrases, notes: tn.notes, cents: tn.cents, mel: tn.mel, split: tn.split || 0, moved: tg.phrases.filter(function (p) { return p.ms; }).length };
}

if (typeof self !== 'undefined' && typeof module === 'undefined') {
  self.onmessage = function (e) {
    var d = e.data, r;
    function prog(p) { self.postMessage({ id: d.id, progress: p }); }
    try {
      if (d.cmd === 'ref') { r = setRef(d.x, d.sr, d.pcs, d.mel); r.id = d.id; self.postMessage(r); }
      else if (d.cmd === 'clean') { r = stageClean(d.take, d.rec, d.start, d.o || {}, prog); r.id = d.id; self.postMessage(r); }
      else if (d.cmd === 'finish') { r = stageFinish(d.take, d.o || {}); r.id = d.id; self.postMessage(r, [r.y.buffer]); }
      else if (d.cmd === 'back') { r = stageBack(d.v, d.mode, d.zones); r.id = d.id; self.postMessage(r, [r.L.buffer, r.R.buffer]); }
      else if (d.cmd === 'raw') { var T = TAKES[d.take]; self.postMessage({ id: d.id, y: T ? new Float32Array(T.a) : null }); }
      else if (d.cmd === 'drop') { delete TAKES[d.take]; self.postMessage({ id: d.id }); }
      else if (d.cmd === 'lag') { r = findLag(d.rec, d.ref, d.sr, d.lo, d.hi); r.id = d.id; self.postMessage(r); }
      else if (d.cmd === 'mp3') { self.postMessage({ id: d.id, blob: toMp3(d.chans, d.sr, d.kbps, prog) }); }
    } catch (err) { self.postMessage({ id: d.id, error: String(err && err.message || err) }); }
  };
}
if (typeof module !== 'undefined') module.exports = { fft: fft, decim: decim, gcc: gcc, findLag: findLag, shiftRec: shiftRec, clean: clean, onsetEnv: onsetEnv, phrases: phrases, gate: gate, GATE: GATE, tighten: tighten, pitchTrack: pitchTrack, detectKey: detectKey, chromaFrames: chromaFrames, notesOf: notesOf, scaleNote: scaleNote, f2m: f2m, tune: tune, psola: psola, harmShift: harmShift, backing: backing, melOf: melOf, melSync: melSync, micBand: micBand, splitByMel: splitByMel, envFrom: envFrom, onsetEnv2: onsetEnv, setRef: setRef, stageClean: stageClean, stageFinish: stageFinish, stageBack: stageBack, ref: function () { return REF; }, rms: rms };
