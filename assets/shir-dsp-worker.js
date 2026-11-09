// "השיר שלי" – עיבוד קול ב-Web Worker (לא תוקע את הדף):
//   correct: תיקון זיופים – מסלול גובה (YIN, כל 10 מ"ש) -> היעד הוא התו של המנגינה באותו רגע
//            (רחוק מ-3 חצאי טון? התו הקרוב בסולם) -> הזזת גובה ב-TD-PSOLA ששומרת על צבע הקול ועל האורך.
//   mp3:     קידוד MP3 (lamejs, LGPL).
'use strict';
var lameLoaded = false;

function yin(buf, sr, thr) {
  thr = thr || 0.12; var half = Math.floor(buf.length / 2), d = new Float32Array(half), minLag = Math.floor(sr / 900), maxLag = Math.min(half - 1, Math.floor(sr / 65));
  for (var tau = 1; tau <= maxLag; tau++) { var s = 0; for (var i = 0; i < half; i++) { var x = buf[i] - buf[i + tau]; s += x * x; } d[tau] = s; }
  var run = 0; d[0] = 1;
  for (tau = 1; tau <= maxLag; tau++) { run += d[tau]; d[tau] = run ? d[tau] * tau / run : 1; }
  for (tau = minLag; tau <= maxLag; tau++) {
    if (d[tau] < thr) { while (tau + 1 <= maxLag && d[tau + 1] < d[tau]) tau++; var a = d[tau - 1], b = d[tau], c = d[tau + 1] || b, den = a + c - 2 * b; return sr / (den ? tau + (a - c) / (2 * den) : tau); }
  }
  return 0;
}
// מסלול גובה: f[k] לכל hop (0 = לא קולי)
function pitchTrack(x, sr, hop, win) {
  var H = Math.round(hop * sr), n = Math.max(1, Math.floor((x.length - win) / H) + 1), f = new Float32Array(n);
  for (var k = 0; k < n; k++) {
    var i = k * H, seg = x.subarray(i, i + win), e = 0; for (var j = 0; j < seg.length; j++) e += seg[j] * seg[j];
    var rms = Math.sqrt(e / win), v = rms > 0.01 ? yin(seg, sr) : 0;
    f[k] = v > 65 && v < 1000 ? v : 0;
  }
  // ניקוי קפיצות אוקטבה בודדות + סינון חציוני של 3
  var g = new Float32Array(n);
  for (k = 0; k < n; k++) {
    var a = f[k - 1] || 0, b = f[k], c = f[k + 1] || 0;
    if (!b) { g[k] = 0; continue; }
    var arr = [a, b, c].filter(function (q) { return q > 0; }).sort(function (p, q) { return p - q; });
    g[k] = arr[Math.floor(arr.length / 2)];
  }
  return g;
}
var log2 = Math.log2 || function (v) { return Math.log(v) / Math.LN2; };
function f2m(f) { return 69 + 12 * log2(f / 440); }

// notes: [{t, dur, midi}] בזמן יחסי לתחילת x; scale: מערך midi מותרים; strength 0..1
function correct(x, sr, notes, scale, strength) {
  var hop = 0.01, win = 2048, H = Math.round(hop * sr), f = pitchTrack(x, sr, hop, win), n = f.length;
  var ratio = new Float32Array(n), cents = [];
  for (var k = 0; k < n; k++) {
    ratio[k] = 1; if (!f[k]) continue;
    var t = (k * H + win / 2) / sr, m = f2m(f[k]), target = null;
    for (var q = 0; q < notes.length; q++) { var nt = notes[q]; if (t >= nt.t - 0.03 && t < nt.t + nt.dur + 0.03) { target = nt.midi; break; } }
    // אותו תו באוקטבה אחרת (גבר ששר מנגינה שנכתבה גבוה) – שומרים על האוקטבה של הזמר
    if (target != null) target += Math.round((m - target) / 12) * 12;
    if (target == null || Math.abs(m - target) > 3) { var best = scale[0]; scale.forEach(function (s) { for (var o = -24; o <= 24; o += 12) if (Math.abs(s + o - m) < Math.abs(best - m)) best = s + o; }); target = best; }
    var diff = (target - m) * strength;
    ratio[k] = Math.pow(2, diff / 12);
  }
  // החלקה (5 מסגרות) כדי שהקול לא יישמע רובוטי
  var sm = new Float32Array(n);
  for (k = 0; k < n; k++) { var s = 0, c = 0; for (var j = -2; j <= 2; j++) { var r = ratio[k + j]; if (r && f[k + j]) { s += r; c++; } } sm[k] = f[k] && c ? s / c : 1; }
  var y = psola(x, sr, f, sm, H, win);
  return { y: y, f: f };
}
// TD-PSOLA: מקטעים בגודל שתי תקופות סביב סימני גובה, מונחים מחדש במרווח של תקופה/יחס. האורך לא משתנה.
function psola(x, sr, f, ratio, H, win) {
  var N = x.length, y = new Float32Array(N), wsum = new Float32Array(N);
  function frameAt(i) { var k = Math.round((i - win / 2) / H); return Math.max(0, Math.min(f.length - 1, k)); }
  // סימני ניתוח
  var marks = [], i = 0;
  while (i < N) { var k = frameAt(i), P = f[k] ? sr / f[k] : sr * 0.01; marks.push({ i: i, P: P, r: f[k] ? ratio[k] : 1 }); i += Math.max(32, Math.round(P)); }
  var ts = 0, mi = 0;
  while (ts < N) {
    while (mi + 1 < marks.length && Math.abs(marks[mi + 1].i - ts) <= Math.abs(marks[mi].i - ts)) mi++;
    var mk = marks[mi], P = mk.P, L = Math.round(P), c = mk.i;
    for (var j = -L; j <= L; j++) {
      var src = c + j, dst = Math.round(ts) + j; if (src < 0 || src >= N || dst < 0 || dst >= N) continue;
      var w = 0.5 + 0.5 * Math.cos(Math.PI * j / (L + 1));
      y[dst] += x[src] * w; wsum[dst] += w;
    }
    ts += Math.max(16, P / mk.r);
  }
  for (i = 0; i < N; i++) y[i] = wsum[i] > 0.15 ? y[i] / wsum[i] : y[i];
  return y;
}
function deviation(y, sr, notes) {
  var f = pitchTrack(y, sr, 0.01, 2048), H = Math.round(0.01 * sr), dev = [];
  for (var k = 0; k < f.length; k++) {
    if (!f[k]) continue; var t = (k * H + 1024) / sr, m = f2m(f[k]);
    for (var q = 0; q < notes.length; q++) { var nt = notes[q]; if (t >= nt.t + 0.06 && t < nt.t + nt.dur - 0.06) { var tg = nt.midi + Math.round((m - nt.midi) / 12) * 12; dev.push(Math.abs(m - tg) * 100); break; } }
  }
  dev.sort(function (a, b) { return a - b; });
  return { median: dev.length ? dev[Math.floor(dev.length / 2)] : null, frames: dev.length };
}

function toMp3(chans, sr, kbps) {
  if (!lameLoaded) { importScripts('/assets/vendor/lamejs/lame.min.js'); lameLoaded = true; }
  var nc = chans.length, enc = new self.lamejs.Mp3Encoder(nc, sr, kbps || 128), out = [], B = 1152;
  function i16(a) { var o = new Int16Array(a.length); for (var i = 0; i < a.length; i++) { var s = Math.max(-1, Math.min(1, a[i])); o[i] = s < 0 ? s * 0x8000 : s * 0x7fff; } return o; }
  var L = i16(chans[0]), R = nc > 1 ? i16(chans[1]) : null;
  for (var i = 0; i < L.length; i += B) {
    var buf = R ? enc.encodeBuffer(L.subarray(i, i + B), R.subarray(i, i + B)) : enc.encodeBuffer(L.subarray(i, i + B));
    if (buf.length) out.push(new Uint8Array(buf));
    if (i % (B * 400) === 0) self.postMessage({ progress: i / L.length });
  }
  var end = enc.flush(); if (end.length) out.push(new Uint8Array(end));
  return new Blob(out, { type: 'audio/mpeg' });
}

self.onmessage = function (e) {
  var d = e.data;
  try {
    if (d.cmd === 'correct') {
      var r = correct(d.x, d.sr, d.notes, d.scale, d.strength);
      var res = { id: d.id, y: r.y };
      if (d.measure) { res.before = deviation(d.x, d.sr, d.notes); res.after = deviation(r.y, d.sr, d.notes); }
      self.postMessage(res, [r.y.buffer]);
    } else if (d.cmd === 'mp3') {
      self.postMessage({ id: d.id, blob: toMp3(d.chans, d.sr, d.kbps) });
    } else if (d.cmd === 'measure') {
      self.postMessage({ id: d.id, dev: deviation(d.x, d.sr, d.notes) });
    }
  } catch (err) { self.postMessage({ id: d.id, error: String(err && err.message || err) }); }
};
