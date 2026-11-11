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
function tighten(x, sr, envM, strength, maxMs) {
  var ph = phrases(x, sr), info = [], n = x.length, H = sr * 0.01;
  if (!strength || !ph.length) return { y: x, phrases: ph.map(function (p) { return { a: p.a / sr, b: p.b / sr, ms: 0 }; }) };
  var envV = onsetEnv(x, sr), R = Math.round((maxMs || 70) / 10), y = new Float32Array(n), F = Math.round(sr * 0.012);
  for (var p = 0; p < ph.length; p++) {
    var a = ph[p].a, b = ph[p].b, lo = p ? Math.floor((ph[p - 1].b + a) / 2) : 0, hi = p + 1 < ph.length ? Math.floor((b + ph[p + 1].a) / 2) : n;
    var ta = Math.max(0, Math.floor(a / H) - 2), tb = Math.min(envV.length, Math.ceil(b / H)), c = [], best = 0, bv = -1, d, t, sv = 0;
    for (t = ta; t < tb; t++) sv += envV[t] * envV[t];
    for (d = -R; d <= R; d++) { var s = 0, sm = 0; for (t = ta; t < tb; t++) { var m = envM[t + d] || 0; s += envV[t] * m; sm += m * m; } var v = s / Math.sqrt(sv * sm + 1e-12); c.push(v); if (v > bv) { bv = v; best = d; } }
    var c0 = c[R], ms = 0;
    if (best && bv > 0.12 && bv > c0 * 1.12 && best > -R && best < R) {
      var y0 = c[best + R - 1], y2 = c[best + R + 1], den = y0 + y2 - 2 * bv, frac = den ? 0.5 * (y0 - y2) / den : 0;
      ms = (best + Math.max(-0.5, Math.min(0.5, frac))) * 10 * strength;
    }
    var sh = Math.round(ms * sr / 1000); // חיובי = המשפט זז מאוחר יותר
    for (var i = lo; i < hi; i++) { var q = i + sh; if (q < 0 || q >= n) continue; var g = 1; if (i - lo < F) g = (i - lo) / F; if (hi - i < F) g = Math.min(g, (hi - i) / F); y[q] += x[i] * g; }
    info.push({ a: a / sr, b: b / sr, ms: Math.round(ms) });
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
function detectKey(x, sr) {
  var D = Math.max(1, Math.round(sr / 11025)), y = decim(x, D), srd = sr / D, N = 4096, step = Math.round(srd * 0.37), re = new Float32Array(N), im = new Float32Array(N), ch = new Float64Array(12), w = new Float32Array(N), i, k;
  for (i = 0; i < N; i++) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
  var k0 = Math.ceil(80 * N / srd), k1 = Math.floor(2000 * N / srd), pcOf = new Int8Array(k1 + 1);
  for (k = k0; k <= k1; k++) pcOf[k] = ((Math.round(f2m(k * srd / N)) % 12) + 12) % 12;
  for (var b = 0; b + N <= y.length; b += step) {
    for (i = 0; i < N; i++) { re[i] = y[b + i] * w[i]; im[i] = 0; } fft(re, im);
    var fr = new Float64Array(12), tot = 0; for (k = k0; k <= k1; k++) { var m = Math.sqrt(re[k] * re[k] + im[k] * im[k]) / Math.sqrt(k); fr[pcOf[k]] += m; tot += m; }
    if (tot > 1e-6) for (i = 0; i < 12; i++) ch[i] += fr[i] / tot;
  }
  function corr(p, rot) { var mx = 0, my = 0, i; for (i = 0; i < 12; i++) { mx += ch[i]; my += p[i]; } mx /= 12; my /= 12; var a = 0, bb = 0, c = 0; for (i = 0; i < 12; i++) { var u = ch[(i + rot) % 12] - mx, v = p[i] - my; a += u * v; bb += u * u; c += v * v; } return a / Math.sqrt(bb * c + 1e-20); }
  var best = { c: -2 }, second = -2;
  for (var r = 0; r < 12; r++) [[KS_MAJ, 0], [KS_MIN, 1]].forEach(function (pm) { var c = corr(pm[0], r); if (c > best.c) { second = best.c; best = { c: c, pc: r, minor: pm[1] }; } else if (c > second) second = c; });
  if (best.pc == null) return { pcs: null, name: '', conf: 0 };
  var steps = best.minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
  return { pcs: steps.map(function (s) { return (best.pc + s) % 12; }), name: PC_HE[best.pc] + (best.minor ? ' מינור' : ' מז\'ור'), conf: best.c, margin: best.c - second };
}
// מתקן כל תו כיחידה אחת: מזיז את כולו לתו הקרוב בסולם, והרטט והגלישות נשארים טבעיים
function tune(x, sr, pcs, strength) {
  var f = pitchTrack(x, sr), n = f.length, sh = new Float32Array(n), has = new Uint8Array(n), k, i, notes = 0, sumAbs = 0;
  if (!strength) return { y: x, f: f, notes: 0, cents: 0 };
  function target(m) { if (!pcs) return Math.round(m); var best = null; for (var o = Math.floor(m / 12) - 1; o <= Math.floor(m / 12) + 1; o++) for (var q = 0; q < pcs.length; q++) { var c = o * 12 + pcs[q]; if (best == null || Math.abs(c - m) < Math.abs(best - m)) best = c; } return best; }
  k = 0;
  while (k < n) {
    if (!f[k]) { k++; continue; }
    var st = k, sum = 0, cnt = 0, gap = 0, end = k;
    while (k < n) { if (!f[k]) { if (++gap > 2) break; k++; continue; } var m = f2m(f[k]); if (cnt >= 3 && Math.abs(m - sum / cnt) > 0.8) break; gap = 0; sum += m; cnt++; end = k; k++; }
    if (cnt >= 7) { // תו יציב (70 אלפיות שנייה ומעלה)
      var ms = []; for (i = st; i <= end; i++) if (f[i]) ms.push(f2m(f[i])); ms.sort(function (a, b) { return a - b; });
      var med = ms[ms.length >> 1], d = target(med) - med; if (Math.abs(d) < 0.06) d = 0;
      for (i = st; i <= end; i++) { sh[i] = d * strength; has[i] = 1; } notes++; sumAbs += Math.abs(d) * 100;
    }
    if (k === st) k++;
  }
  // בין תווים: מעבר הדרגתי. ואז החלקה של 50 אלפיות שנייה
  var lastI = -1;
  for (i = 0; i < n; i++) { if (!has[i]) continue; if (lastI >= 0 && i - lastI > 1 && i - lastI < 30) for (k = lastI + 1; k < i; k++) sh[k] = sh[lastI] + (sh[i] - sh[lastI]) * (k - lastI) / (i - lastI); lastI = i; }
  var ratio = new Float32Array(n);
  for (i = 0; i < n; i++) { var s = 0, c = 0; for (k = -2; k <= 2; k++) if (i + k >= 0 && i + k < n) { s += sh[i + k]; c++; } ratio[i] = f[i] ? Math.pow(2, s / c / 12) : 1; }
  return { y: psola(x, sr, f, ratio), f: f, notes: notes, cents: notes ? Math.round(sumAbs / notes) : 0 };
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
function setRef(x, sr, pcs) { REF = { x: x, sr: sr, env: onsetEnv(x, sr), key: pcs && pcs.length ? { pcs: pcs, name: '', conf: 1, margin: 1 } : detectKey(x, sr) }; TAKES = {}; return { key: REF.key, dur: x.length / sr }; }
function refSlice(start, n) { var y = new Float32Array(n), x = REF.x; for (var i = 0; i < n; i++) { var p = start + i; y[i] = p >= 0 && p < x.length ? x[p] : 0; } return y; }
// שלב א': סנכרון + ניקוי. rec מתחיל (לפני תיקון האיחור) בנקודה start במוזיקה.
// o: {lagGuess (דגימות), lagFixed (המשתמש קבע ידנית), loSec, hiSec, noise, bleed}
function stageClean(id, rec, start, o, prog) {
  var sr = REF.sr, n = rec.length, ref = refSlice(start, n), lg = null, lag, mode;
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
  var a = new Float32Array(r.y); // עותק (subarray של מאגר גדול יותר)
  if (mode === 'guess' && !o.trust) { // עם אוזניות אין מוזיקה בהקלטה: מכוונים לפי הקצב, בטווח קטן סביב הניחוש
    var ev = onsetEnv(a, sr), t0 = Math.round(start / (sr * 0.01)), best = 0, bv = -1, R = 6;
    for (var d = -R; d <= R; d++) { var s = 0, sm = 0; for (var t = 0; t < ev.length; t++) { var m = REF.env[t0 + t + d] || 0; s += ev[t] * m; sm += m * m; } var v = s / Math.sqrt(sm + 1e-12) * Math.exp(-d * d / 32); if (v > bv) { bv = v; best = d; } }
    if (best) { var shs = Math.round(best * 0.01 * sr), a2 = new Float32Array(n); for (var i = 0; i < n; i++) { var q = i - shs; a2[i] = q >= 0 && q < n ? a[q] : 0; } a = a2; lag -= shs; }
  }
  if (!o.nogate) a = gate(a, sr, GATE[Math.max(0, Math.min(3, o.noise == null ? 2 : o.noise))], o.gateR === 0 ? null : r.act, o.gateR);
  TAKES[id] = { a: a, start: start, sr: sr };
  return { lag: lag, lagMs: Math.round(lag / sr * 1000), z: +lg.z.toFixed(1), drift: lg.drift, mode: mode, bleedDb: +r.bleedDb.toFixed(1), cancelDb: +r.cancelDb.toFixed(1), level: rms(a) };
}
// שלב ב': קצב + זיופים, מהקול הנקי השמור. o: {tight 0..1, tune 0..1, chromatic}
function stageFinish(id, o) {
  var T = TAKES[id]; if (!T) throw new Error('no take');
  var sr = T.sr, t0 = Math.round((T.start - (o.shiftS || 0)) / (sr * 0.01)), envM = REF.env.subarray(Math.max(0, t0));
  var tg = tighten(T.a, sr, envM, o.tight || 0, 70);
  var key = REF.key, pcs = o.chromatic || !key.pcs || key.conf < 0.45 ? null : key.pcs;
  var tn = tune(tg.y, sr, pcs, o.tune || 0);
  var y = tn.y === T.a ? new Float32Array(tn.y) : tn.y;
  return { y: y, phrases: tg.phrases, notes: tn.notes, cents: tn.cents, moved: tg.phrases.filter(function (p) { return p.ms; }).length };
}

if (typeof self !== 'undefined' && typeof module === 'undefined') {
  self.onmessage = function (e) {
    var d = e.data, r;
    function prog(p) { self.postMessage({ id: d.id, progress: p }); }
    try {
      if (d.cmd === 'ref') { r = setRef(d.x, d.sr, d.pcs); r.id = d.id; self.postMessage(r); }
      else if (d.cmd === 'clean') { r = stageClean(d.take, d.rec, d.start, d.o || {}, prog); r.id = d.id; self.postMessage(r); }
      else if (d.cmd === 'finish') { r = stageFinish(d.take, d.o || {}); r.id = d.id; self.postMessage(r, [r.y.buffer]); }
      else if (d.cmd === 'raw') { var T = TAKES[d.take]; self.postMessage({ id: d.id, y: T ? new Float32Array(T.a) : null }); }
      else if (d.cmd === 'drop') { delete TAKES[d.take]; self.postMessage({ id: d.id }); }
      else if (d.cmd === 'lag') { r = findLag(d.rec, d.ref, d.sr, d.lo, d.hi); r.id = d.id; self.postMessage(r); }
      else if (d.cmd === 'mp3') { self.postMessage({ id: d.id, blob: toMp3(d.chans, d.sr, d.kbps, prog) }); }
    } catch (err) { self.postMessage({ id: d.id, error: String(err && err.message || err) }); }
  };
}
if (typeof module !== 'undefined') module.exports = { fft: fft, decim: decim, gcc: gcc, findLag: findLag, shiftRec: shiftRec, clean: clean, onsetEnv: onsetEnv, phrases: phrases, gate: gate, GATE: GATE, tighten: tighten, pitchTrack: pitchTrack, detectKey: detectKey, tune: tune, psola: psola, setRef: setRef, stageClean: stageClean, stageFinish: stageFinish, rms: rms };
