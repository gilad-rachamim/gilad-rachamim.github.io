// "השיר שלי" – מנוע המוזיקה המשותף: סולמות, אקורדים, מחולל מנגינה, ציר זמן, סינתיסייזר (WebAudio), זיהוי גובה (YIN) ו-MIDI.
// בלי ספריות ובלי דגימות. משמש את הלחן, ההקלטה והקליפ.
(function () {
  'use strict';
  var S = window.Shir;
  var SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], hijaz: [0, 1, 4, 5, 7, 8, 10] };
  var TONIC_PC = { major: 0, minor: 9, hijaz: 4 }; // C, A, E
  var RANGE = { low: [45, 50], mid: [50, 56], high: [57, 63] };
  var BPM = { slow: 72, mid: 96, fast: 120 };
  // מהלכי אקורדים לפי דרגות בסולם (טריאדות דיאטוניות)
  var PROGS = {
    major: [[0, 4, 5, 3], [0, 5, 3, 4], [5, 3, 0, 4], [0, 3, 4, 3]],
    minor: [[0, 5, 2, 6], [0, 3, 6, 2], [0, 6, 5, 6], [0, 3, 4, 0]],
    hijaz: [[0, 1, 6, 0], [0, 6, 1, 0], [0, 3, 1, 0]]
  };
  var NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  var MOOD_OF = { 'שמח': 'major', 'תודה': 'major', 'אהבה': 'major', 'לילדים': 'major', 'כוח': 'major', 'תקווה': 'major', 'שקט': 'minor', 'געגוע': 'minor', 'תפילה': 'hijaz' };

  function defaults(song) {
    var mood = MOOD_OF[song.mood] || 'major';
    return { mood: mood, tempo: song.mood === 'שקט' || song.mood === 'תפילה' || song.mood === 'געגוע' ? 'slow' : 'mid', meter: 4, range: 'mid',
      prog: { verse: mood === 'major' ? 0 : 0, chorus: mood === 'major' ? 2 : 1, bridge: mood === 'hijaz' ? 2 : 3 }, mel: {} };
  }
  function music(song) { if (!song.music) song.music = defaults(song); var m = song.music; m.mel = m.mel || {}; m.prog = m.prog || { verse: 0, chorus: 1, bridge: 2 }; return m; }
  function tonic(m) { var pc = TONIC_PC[m.mood], r = RANGE[m.range] || RANGE.mid; for (var t = r[0]; t <= r[1]; t++) if (((t % 12) + 12) % 12 === pc) return t; return r[0]; }
  function scale(m) { return SCALES[m.mood] || SCALES.major; }
  function deg2midi(m, d) { var sc = scale(m), o = Math.floor(d / 7), k = ((d % 7) + 7) % 7; return tonic(m) + 12 * o + sc[k]; }
  function chordTones(r) { return [r, r + 2, r + 4]; }
  function chordName(m, r) {
    var sc = scale(m), k = ((r % 7) + 7) % 7, root = (((tonic(m) % 12) + 12) % 12 + sc[k]) % 12;
    var third = (sc[(k + 2) % 7] - sc[k] + 12) % 12, fifth = (sc[(k + 4) % 7] - sc[k] + 12) % 12;
    return NAMES[root] + (third === 3 ? (fifth === 6 ? 'dim' : 'm') : '');
  }
  function progOf(m, type) { var list = PROGS[m.mood] || PROGS.major; var i = (m.prog && m.prog[type]) || 0; return list[i % list.length]; }

  // ---------- מחולל מנגינה ----------
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  // line: {n, lastInPart, barOffset (בתוך החלק), wordEnds:[bool]} ; מחזיר {seed, start, bars, notes:[{d,len}]}
  function genLine(m, type, line, seed, variant) {
    var R = rng(seed), meter = m.meter || 4, bpb = meter * 2, n = Math.max(1, line.n);
    var bars = Math.max(2, Math.ceil((n + 3) / bpb)), S = bars * bpb;
    var restEnd = 2, start = (R() < 0.45 && n <= S - 6) ? 1 : 0;
    var lens = []; for (var i = 0; i < n; i++) lens.push(1);
    var extra = S - start - restEnd - n;
    var lastAdd = Math.min(extra, 2 + Math.floor(R() * 3)); lens[n - 1] += lastAdd; extra -= lastAdd;
    var guard = 0;
    while (extra > 0 && guard++ < 500) {
      var cand = []; for (var j = 0; j < n - 1; j++) if (lens[j] < 4) { cand.push(j); if (line.wordEnds && line.wordEnds[j]) { cand.push(j); cand.push(j); } }
      if (!cand.length) { lens[n - 1] += extra; break; }
      lens[cand[Math.floor(R() * cand.length)]]++; extra--;
    }
    var prog = progOf(m, type), notes = [], pos = start, prev = null;
    var shapes = [function (x) { return 2 + 2.4 * Math.sin(Math.PI * x); }, function (x) { return 1 + 4 * x; }, function (x) { return 4.5 - 2.5 * Math.sin(Math.PI * x); }];
    var shape = shapes[(variant || 0) % 3], lift = type === 'chorus' ? 1.5 : (type === 'bridge' ? 2.5 : 0);
    for (var k = 0; k < n; k++) {
      var bar = Math.floor(pos / bpb), chord = prog[(line.barOffset + bar) % prog.length], tones = chordTones(chord);
      var x = n > 1 ? k / (n - 1) : 0, target = shape(x) + lift + (R() - 0.5);
      var strong = pos % (meter === 4 ? 4 : 6) === 0, d;
      var opts = []; tones.forEach(function (t) { [-7, 0, 7].forEach(function (o) { opts.push(t + o); }); });
      if (k === n - 1) {
        if (line.lastInPart) d = nearest([0, 7], prev == null ? target : prev);
        else d = nearest(opts.filter(function (t) { return ((t % 7) + 7) % 7 !== ((chord % 7) + 7) % 7; }), prev == null ? target : prev);
      } else if (prev == null || strong) {
        var aim = prev == null ? target : prev + Math.sign(target - prev) * (R() < 0.7 ? 1 : 2);
        d = nearest(opts, aim);
        if (prev != null && Math.abs(d - prev) > 4) d = prev + Math.sign(d - prev) * 2;
      } else {
        var r = R(), step = r < 0.18 ? 0 : (r < 0.8 ? Math.sign(target - prev) || 1 : -(Math.sign(target - prev) || 1));
        d = prev + step;
      }
      d = Math.max(-2, Math.min(9, d)); notes.push({ d: d, len: lens[k] }); prev = d; pos += lens[k];
    }
    return { seed: seed, v: variant || 0, start: start, bars: bars, notes: notes };
  }
  function nearest(arr, x) { var b = arr[0]; arr.forEach(function (a) { if (Math.abs(a - x) < Math.abs(b - x) || (Math.abs(a - x) === Math.abs(b - x) && a < b)) b = a; }); return b; }
  function wordEnds(text, n) { return S.splitSyl(text, n).map(function (x) { return x.last; }); }

  // שורות שרים לכל חלק (רק שורות עם טקסט), עם המנגינה שלהן – מייצר מנגינה אם חסרה או אם מספר ההברות השתנה
  function partLines(song, p) {
    var m = music(song), lines = p.lines.filter(function (l) { return l.t && l.t.trim(); });
    var mel = m.mel[p.id] = m.mel[p.id] || [], barOff = 0, out = [];
    lines.forEach(function (l, i) {
      var n = S.lineSyl(l), cur = mel[i];
      if (!cur || !cur.notes || cur.notes.length !== n || cur.meter !== (m.meter || 4)) {
        var base = p.type === 'chorus' ? (i % 2) : i;
        cur = mel[i] = genLine(m, p.type, { n: n, lastInPart: i === lines.length - 1, barOffset: barOff, wordEnds: wordEnds(l.t, n) }, 1000 + base * 17 + (p.id.charCodeAt(0) * 7), cur ? cur.v : 0);
        cur.meter = m.meter || 4;
      }
      out.push({ text: l.t, n: n, mel: cur, barOffset: barOff, i: i });
      barOff += cur.bars;
    });
    mel.length = lines.length;
    return out;
  }
  // שלוש אפשרויות לשורה
  function options(song, p, i) {
    var m = music(song), pl = partLines(song, p), L = pl[i];
    return [0, 1, 2].map(function (v) {
      var o = genLine(m, p.type, { n: L.n, lastInPart: i === pl.length - 1, barOffset: L.barOffset, wordEnds: wordEnds(L.text, L.n) }, 5000 + v * 131 + i * 7 + Math.floor(Math.random() * 1000), v);
      o.meter = m.meter || 4; return o;
    });
  }
  function regenAll(song) { var m = music(song); m.mel = {}; song.parts.forEach(function (p) { partLines(song, p); }); }

  // ---------- ציר זמן ----------
  // {beat, eighth, total, intro, notes:[{t,dur,midi,line,syl}], chords:[{t,dur,midis,name,bar}], lines:[{t0,t1,text,part,name,syls:[{s,t,dur,midi}]}], drums:[{t,kind}]}
  function timeline(song, opt) {
    opt = opt || {};
    var m = music(song), meter = m.meter || 4, bpb = meter * 2, e = 30 / (BPM[m.tempo] || 96), barSec = bpb * e;
    var tl = { eighth: e, beat: 2 * e, bar: barSec, meter: meter, notes: [], chords: [], lines: [], drums: [], intro: barSec };
    var t = 0;
    function addBar(chordDeg, at) {
      tl.chords.push({ t: at, dur: barSec, deg: chordDeg, name: chordName(m, chordDeg), midis: chordTones(chordDeg).map(function (d) { return deg2midi(m, d) - 12; }), bass: deg2midi(m, chordDeg % 7) - 24 });
      for (var b = 0; b < meter; b++) tl.drums.push({ t: at + b * 2 * e, kind: b === 0 ? 'k' : (meter === 4 && b === 2 ? 'k2' : 'h') });
    }
    addBar(0, 0); t = barSec; // הקדמה: בר אחד
    var li = 0;
    tl._occ = -1;
    S.sung(song).forEach(function (x) {
      var p = x.part, prog = progOf(m, p.type); tl._occ++;
      partLines(song, p).forEach(function (L) {
        var mel = L.mel, chunks = S.splitSyl(L.text, L.n), pos = mel.start;
        for (var b = 0; b < mel.bars; b++) addBar(prog[(L.barOffset + b) % prog.length], t + b * barSec);
        var line = { tb: t, t0: t + mel.start * e, t1: t + mel.bars * barSec, text: L.text, part: p.id, name: x.name, idx: li, occ: tl._occ, syls: [] };
        mel.notes.forEach(function (nt, k) {
          var at = t + pos * e, dur = nt.len * e, midi = deg2midi(m, nt.d);
          tl.notes.push({ t: at, dur: dur, midi: midi, line: li, syl: k });
          line.syls.push({ s: (chunks[k] || {}).s || '', t: at, dur: dur, midi: midi, last: (chunks[k] || {}).last });
          pos += nt.len;
        });
        tl.lines.push(line); t += mel.bars * barSec; li++;
      });
    });
    addBar(0, t); t += barSec; // סיום
    tl.total = t;
    return tl;
  }

  // ---------- סינתיסייזר ----------
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  var noiseBuf = null;
  function noise(ctx) { if (noiseBuf && noiseBuf.sampleRate === ctx.sampleRate) return noiseBuf; var b = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate), d = b.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; noiseBuf = b; return b; }
  // מתזמן את כל השיר מראש (עובד גם ב-OfflineAudioContext וגם כשהחלון ברקע)
  function schedule(ctx, dest, tl, t0, o) {
    o = o || {}; var nodes = [];
    var master = ctx.createGain(); master.gain.value = o.volume == null ? 0.9 : o.volume;
    var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3;
    master.connect(comp); comp.connect(dest); nodes.push(master);
    var from = o.from || 0, to = o.to == null ? 1e9 : o.to;
    function inRange(x) { return x.t >= from - 0.001 && x.t < to; }
    function at(x) { return t0 + x - from; }
    if (o.lead !== false) {
      var lf = ctx.createBiquadFilter(); lf.type = 'lowpass'; lf.frequency.value = 2600; lf.connect(master);
      tl.notes.filter(inRange).forEach(function (n) {
        var s = at(n.t), d = Math.max(0.08, n.dur * 0.92), g = ctx.createGain(), a = ctx.createOscillator(), b = ctx.createOscillator();
        a.type = 'triangle'; b.type = 'sine'; a.frequency.value = mtof(n.midi + (o.leadShift || 0)); b.frequency.value = mtof(n.midi + 12 + (o.leadShift || 0));
        var bg = ctx.createGain(); bg.gain.value = 0.25; b.connect(bg); bg.connect(g); a.connect(g); g.connect(lf);
        var v = o.leadGain || 0.32;
        g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(v, s + 0.025); g.gain.linearRampToValueAtTime(v * 0.7, s + 0.15); g.gain.setValueAtTime(v * 0.7, s + d - 0.05); g.gain.linearRampToValueAtTime(0, s + d);
        a.start(s); b.start(s); a.stop(s + d + 0.02); b.stop(s + d + 0.02); nodes.push(a, b);
      });
    }
    if (o.chords !== false) {
      tl.chords.filter(inRange).forEach(function (c) {
        var s = at(c.t), d = c.dur;
        c.midis.concat([c.bass]).forEach(function (mm, i) {
          var g = ctx.createGain(), a = ctx.createOscillator(); a.type = i === 3 ? 'sine' : 'triangle'; a.frequency.value = mtof(mm);
          var v = i === 3 ? 0.16 : 0.045; a.connect(g); g.connect(master);
          g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(v, s + 0.06); g.gain.setValueAtTime(v, s + d - 0.12); g.gain.linearRampToValueAtTime(0, s + d);
          a.start(s); a.stop(s + d + 0.02); nodes.push(a);
        });
      });
    }
    if (o.drums !== false) {
      tl.drums.filter(inRange).forEach(function (dr) {
        var s = at(dr.t);
        if (dr.kind !== 'h') {
          var a = ctx.createOscillator(), g = ctx.createGain(); a.frequency.setValueAtTime(110, s); a.frequency.exponentialRampToValueAtTime(42, s + 0.14);
          g.gain.setValueAtTime(dr.kind === 'k' ? 0.5 : 0.3, s); g.gain.exponentialRampToValueAtTime(0.001, s + 0.2); a.connect(g); g.connect(master); a.start(s); a.stop(s + 0.22); nodes.push(a);
        }
        var nb = ctx.createBufferSource(), hf = ctx.createBiquadFilter(), hg = ctx.createGain(); nb.buffer = noise(ctx); hf.type = 'highpass'; hf.frequency.value = 7000;
        hg.gain.setValueAtTime(dr.kind === 'h' ? 0.05 : 0.03, s); hg.gain.exponentialRampToValueAtTime(0.001, s + 0.06); nb.connect(hf); hf.connect(hg); hg.connect(master); nb.start(s); nb.stop(s + 0.08); nodes.push(nb);
      });
    }
    return { stop: function () { nodes.forEach(function (n) { try { if (n.stop) n.stop(); n.disconnect(); } catch (e) {} }); } };
  }
  var actx = null;
  function ctx() { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' }); if (actx.state === 'suspended') actx.resume(); return actx; }
  // נגינה עם קריאה חוזרת לכל "טיק" (rAF + גיבוי setTimeout, כדי שימשיך גם ברקע)
  function play(tl, o, onTick, onEnd) {
    var c = ctx(), t0 = c.currentTime + 0.12, from = (o && o.from) || 0, to = o && o.to != null ? o.to : tl.total;
    var h = schedule(c, c.destination, tl, t0, Object.assign({}, o, { from: from, to: to })), done = false, timer = null, raf = null;
    function tick() {
      if (done) return; var now = c.currentTime - t0 + from;
      if (onTick) onTick(now);
      if (now >= to + 0.2) { stop(); if (onEnd) onEnd(); return; }
      raf = requestAnimationFrame(tick); clearTimeout(timer); timer = setTimeout(tick, 40);
    }
    function stop() { if (done) return; done = true; cancelAnimationFrame(raf); clearTimeout(timer); h.stop(); }
    tick();
    return { stop: stop, t0: t0, ctx: c };
  }
  function renderOffline(tl, o, sr) {
    sr = sr || 44100; var len = Math.ceil((tl.total + 0.5) * sr);
    var oc = new OfflineAudioContext(2, len, sr); schedule(oc, oc.destination, tl, 0, o); return oc.startRendering();
  }

  // ---------- זיהוי גובה (YIN) ----------
  function yin(buf, sr, thr) {
    thr = thr || 0.12; var half = Math.floor(buf.length / 2), d = new Float32Array(half), minLag = Math.floor(sr / 900), maxLag = Math.min(half - 1, Math.floor(sr / 65));
    for (var tau = 1; tau <= maxLag; tau++) { var s = 0; for (var i = 0; i < half; i++) { var x = buf[i] - buf[i + tau]; s += x * x; } d[tau] = s; }
    var run = 0; d[0] = 1;
    for (tau = 1; tau <= maxLag; tau++) { run += d[tau]; d[tau] = run ? d[tau] * tau / run : 1; }
    for (tau = minLag; tau <= maxLag; tau++) {
      if (d[tau] < thr) { while (tau + 1 <= maxLag && d[tau + 1] < d[tau]) tau++; var a = d[tau - 1], b = d[tau], c = d[tau + 1] || b, den = a + c - 2 * b; var t = den ? tau + (a - c) / (2 * den) : tau; return { f: sr / t, p: 1 - b }; }
    }
    return { f: 0, p: 0 };
  }
  // מסלול גובה: כל hop שניות; מחזיר [{t,f,rms}] (f=0 כשאין קול)
  function track(data, sr, hop, win) {
    hop = hop || 0.01; win = win || 2048; var H = Math.round(hop * sr), out = [];
    for (var i = 0; i + win <= data.length; i += H) {
      var seg = data.subarray(i, i + win), e = 0; for (var k = 0; k < win; k++) e += seg[k] * seg[k];
      var rms = Math.sqrt(e / win), r = rms > 0.012 ? yin(seg, sr) : { f: 0 };
      out.push({ t: (i + win / 2) / sr, f: r.f > 60 && r.f < 1000 ? r.f : 0, rms: rms });
    }
    return out;
  }
  function f2m(f) { return 69 + 12 * Math.log2(f / 440); }
  // ממיר midi לדרגה הקרובה בסולם
  function midi2deg(m, mid) { var best = 0, bd = 1e9; for (var d = -4; d <= 11; d++) { var x = Math.abs(deg2midi(m, d) - mid); if (x < bd) { bd = x; best = d; } } return best; }

  // ---------- MIDI ----------
  function vlq(n) { var b = [n & 0x7f]; while ((n >>= 7)) b.unshift((n & 0x7f) | 0x80); return b; }
  function midiFile(tl, bpm) {
    var tpq = 480, ev = [];
    function tick(sec) { return Math.round(sec / tl.beat * tpq); }
    tl.notes.forEach(function (n) { ev.push([tick(n.t), 0x90, n.midi, 96]); ev.push([tick(n.t + n.dur * 0.95), 0x80, n.midi, 0]); });
    tl.chords.forEach(function (c) { c.midis.concat([c.bass]).forEach(function (m) { ev.push([tick(c.t), 0x91, m, 60]); ev.push([tick(c.t + c.dur) - 1, 0x81, m, 0]); }); });
    ev.sort(function (a, b) { return a[0] - b[0] || (a[1] & 0xf0) - (b[1] & 0xf0); });
    var us = Math.round(60000000 / bpm), trk = [0, 0xff, 0x51, 3, (us >> 16) & 255, (us >> 8) & 255, us & 255, 0, 0xc0, 0, 0, 0xc1, 0], last = 0;
    ev.forEach(function (e) { trk = trk.concat(vlq(Math.max(0, e[0] - last)), [e[1], e[2], e[3]]); last = Math.max(last, e[0]); });
    trk = trk.concat([0, 0xff, 0x2f, 0]);
    var head = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, tpq >> 8, tpq & 255], L = trk.length;
    return new Blob([new Uint8Array(head.concat([0x4d, 0x54, 0x72, 0x6b, (L >>> 24) & 255, (L >> 16) & 255, (L >> 8) & 255, L & 255], trk))], { type: 'audio/midi' });
  }

  S.M = { SCALES: SCALES, PROGS: PROGS, BPM: BPM, music: music, defaults: defaults, tonic: tonic, scale: scale, deg2midi: deg2midi, midi2deg: midi2deg, chordName: chordName, progOf: progOf,
    genLine: genLine, partLines: partLines, options: options, regenAll: regenAll, timeline: timeline, schedule: schedule, play: play, ctx: ctx, renderOffline: renderOffline,
    yin: yin, track: track, f2m: f2m, mtof: mtof, midiFile: midiFile };
})();
