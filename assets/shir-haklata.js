// "השיר שלי" – מקליטים ושרים: קריוקי עם ליווי, הקלטה חלק-חלק, תיקון זיופים לפי המנגינה (Web Worker), ניקוי, מיקס ו-MP3.
// ההקלטות נשמרות רק בטלפון (IndexedDB). שום הקלטה לא עולה לשרת.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  if (!$('sh-parts') || !window.Shir || !window.Shir.M) return;
  var S = window.Shir, M = S.M, TOOL = 'shir_haklata', esc = S.esc;
  var song, tl, recs = {}, fixed = {}, player = null, busy = false, lastPart = null, abState = 0, mic = null;
  function used(how) { S.used(TOOL, how); }
  function msg(t) { $('sh-msg').textContent = t || ''; }
  function st() { song.rec = song.rec || { phones: 1, guide: 1, strength: 0.7, off: 0 }; return song.rec; }

  // ---------- IndexedDB ----------
  var dbp = null;
  function idb() {
    if (!dbp) dbp = new Promise(function (res, rej) { var r = indexedDB.open('shir', 1); r.onupgradeneeded = function () { r.result.createObjectStore('rec'); }; r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; });
    return dbp;
  }
  function dbDo(mode, fn) { return idb().then(function (db) { return new Promise(function (res, rej) { var tx = db.transaction('rec', mode), q = fn(tx.objectStore('rec')); tx.oncomplete = function () { res(q && q.result); }; tx.onerror = function () { rej(tx.error); }; }); }); }
  function dbGet(k) { return dbDo('readonly', function (s) { return s.get(k); }); }
  function dbPut(k, v) { return dbDo('readwrite', function (s) { return s.put(v, k); }); }
  function rk(pid) { return song.id + ':' + pid; }

  // ---------- Worker ----------
  var W = null, wid = 0, wcb = {};
  function work(msgObj, transfer, onProgress) {
    if (!W) { W = new Worker('/assets/shir-dsp-worker.js'); W.onmessage = function (e) { var d = e.data; if (d.progress != null) { if (W._p) W._p(d.progress); return; } var cb = wcb[d.id]; delete wcb[d.id]; if (cb) cb(d); }; }
    return new Promise(function (res, rej) { msgObj.id = ++wid; W._p = onProgress; wcb[msgObj.id] = function (d) { d.error ? rej(new Error(d.error)) : res(d); }; W.postMessage(msgObj, transfer || []); });
  }

  // ---------- חלקים ומופעים ----------
  // מופע = רצף שורות של אותו חלק בציר הזמן: {pid, name, tb, t1, lines}
  function occs() {
    var out = [];
    tl.lines.forEach(function (l) { var o = out[out.length - 1]; if (o && o.occ === l.occ) { o.t1 = l.t1; o.lines.push(l); } else out.push({ pid: l.part, occ: l.occ, name: l.name, tb: l.tb, t1: l.t1, lines: [l] }); });
    return out;
  }
  function units() { var seen = {}, u = []; occs().forEach(function (o) { if (!seen[o.pid]) { seen[o.pid] = 1; u.push(o); } }); return u; }
  function unit(pid) { return units().filter(function (u) { return u.pid === pid; })[0]; }

  function drawSongs() { $('sh-songs').innerHTML = S.list().map(function (s) { return '<option value="' + esc(s.id) + '"' + (s.id === song.id ? ' selected' : '') + '>' + esc(s.title || s.topic || 'שיר בלי שם') + '</option>'; }).join(''); }
  function drawParts() {
    $('sh-parts').innerHTML = units().map(function (u) {
      var r = recs[u.pid];
      return '<div class="pr" data-p="' + u.pid + '"><span><b>' + esc(u.name) + '</b> <span class="hint">' + esc(u.lines[0].text) + '…</span><br>' + (r ? '<span class="ok">✓ מוקלט</span>' : '<span class="hint">עוד לא מוקלט</span>') + '</span>' +
        '<span><button class="btn ' + (r ? 'btn-line' : 'btn-gold') + ' btn-sm" type="button" data-rec="1">' + (r ? '🎤 שוב' : '🎤 להקליט') + '</button> ' + (r ? '<button class="shr-mini" type="button" data-play="1">▶</button>' : '') + '</span></div>';
    }).join('') || '<p class="shr-msg">אין עדיין מילים ומנגינה. מתחילים בכתיבת המילים.</p>';
  }
  function chips() {
    var s = st();
    [].forEach.call($('sh-phones').children, function (b) { b.classList.toggle('on', +b.getAttribute('data-v') === s.phones); });
    [].forEach.call($('sh-str').children, function (b) { b.classList.toggle('on', +b.getAttribute('data-v') === s.strength); });
    $('sh-guide').checked = !!s.guide; $('sh-off').value = s.off || 0; $('sh-offv').textContent = (s.off || 0) + ' מילי-שניות. מקשיבים, ומזיזים עד שהקול יושב על הליווי.';
  }
  function load() {
    song = S.cur(); tl = M.timeline(song); recs = {}; fixed = {};
    $('sh-demo').hidden = !song.demo; drawSongs(); chips(); drawParts();
    return Promise.all(units().map(function (u) { return dbGet(rk(u.pid)).then(function (r) { if (r && r.data) recs[u.pid] = r; }, function () {}); })).then(drawParts);
  }

  // ---------- קריוקי ----------
  var lastLine = -1, lastSyl = -1;
  function karaoke(t) {
    var L = null, k; for (k = 0; k < tl.lines.length; k++) { if (t >= tl.lines[k].tb - 0.3 && t < tl.lines[k].t1) { L = tl.lines[k]; break; } }
    if (!L) { if (lastLine !== -2) { $('sh-cur').textContent = '♪'; $('sh-nx').textContent = tl.lines[0] && t < tl.lines[0].tb ? tl.lines[0].text : ''; lastLine = -2; } return; }
    var si = -1; L.syls.forEach(function (s, i) { if (t >= s.t) si = i; });
    if (L.idx === lastLine && si === lastSyl) return; lastLine = L.idx; lastSyl = si;
    $('sh-cur').innerHTML = L.syls.map(function (s, i) { return '<span class="' + (i <= si ? 'on' : '') + '">' + esc(s.s) + '</span>' + (s.last ? ' ' : ''); }).join('');
    var nx = tl.lines[L.idx + 1]; $('sh-nx').textContent = nx ? nx.text : '';
  }
  function stopAll() { if (player) { player.stop(); player = null; } $('sh-stop').hidden = true; }

  // ---------- הקלטה ----------
  function record(pid) {
    if (busy) return; stopAll(); busy = true;
    var u = unit(pid), s = st(), c = M.ctx(), from = Math.max(0, u.tb - tl.bar), to = u.t1 + 0.25;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { busy = false; msg('הדפדפן הזה לא נותן להקליט. אפשר להכין MP3 עם קול מדגים.'); return; }
    var ec = !s.phones;
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: ec, noiseSuppression: ec, autoGainControl: false } }).then(function (stream) {
      mic = stream;
      var src = c.createMediaStreamSource(stream), bs = 4096, proc = c.createScriptProcessor(bs, 1, 1), an = c.createAnalyser(), chunks = [];
      var sink = c.createGain(); sink.gain.value = 0; src.connect(an); src.connect(proc); proc.connect(sink); sink.connect(c.destination);
      var lvl = new Float32Array(an.fftSize);
      var p = M.play(tl, { lead: !!s.guide, leadGain: 0.12, chords: true, drums: true, from: from, to: to }, function (t) {
        karaoke(t);
        var left = u.tb - t; $('sh-cnt').hidden = !(left > 0 && left <= tl.bar); $('sh-cnt').textContent = Math.max(1, Math.ceil(left / tl.beat));
        an.getFloatTimeDomainData(lvl); var m = 0; for (var i = 0; i < lvl.length; i += 8) m = Math.max(m, Math.abs(lvl[i])); $('sh-lvl').style.width = Math.min(100, m * 140) + '%';
      }, finish);
      player = p; $('sh-stop').hidden = false;
      proc.onaudioprocess = function (e) { chunks.push({ pt: e.playbackTime, d: new Float32Array(e.inputBuffer.getChannelData(0)) }); };
      function finish() {
        player = null; $('sh-stop').hidden = true; proc.onaudioprocess = null; try { proc.disconnect(); src.disconnect(); } catch (x) {} stream.getTracks().forEach(function (t) { t.stop(); }); mic = null;
        $('sh-cnt').hidden = true; $('sh-lvl').style.width = '0';
        var sr = c.sampleRate, lat = (c.baseLatency || 0) + (c.outputLatency || 0);
        var segStart = u.tb, len = Math.ceil((u.t1 - segStart + 0.2) * sr), data = new Float32Array(len);
        chunks.forEach(function (ch) {
          var songT = ch.pt - p.t0 + from - bs / sr - lat; // הזמן בשיר של הדגימה הראשונה בחתיכה
          var at = Math.round((songT - segStart) * sr);
          for (var i = 0; i < ch.d.length; i++) { var j = at + i; if (j >= 0 && j < len) data[j] = ch.d[i]; }
        });
        var peak = 0; for (var i = 0; i < len; i += 4) peak = Math.max(peak, Math.abs(data[i]));
        busy = false;
        if (peak < 0.01) { msg('לא שמעתי קול. בודקים שהמיקרופון מאושר, ומנסים שוב.'); drawParts(); return; }
        if (peak < 0.9) { var g = Math.min(4, 0.9 / peak); for (i = 0; i < len; i++) data[i] *= g; }
        var r = { sr: sr, data: data, t0: segStart, at: Date.now() };
        recs[pid] = r; delete fixed[pid]; lastPart = pid; S.undemo(song); S.save();
        dbPut(rk(pid), r).catch(function () {});
        used('record'); msg('הוקלט. שומעים "לפני / אחרי", או ממשיכים לחלק הבא.'); drawParts();
      }
    }, function () { busy = false; msg('אין גישה למיקרופון. מאשרים בהגדרות הדפדפן, או מכינים MP3 עם קול מדגים.'); });
  }

  // ---------- תיקון ומיקס ----------
  function notesFor(pid) {
    var u = unit(pid), out = [];
    tl.notes.forEach(function (n) { var L = tl.lines[n.line]; if (L.occ === u.occ) out.push({ t: n.t - u.tb, dur: n.dur, midi: n.midi }); });
    return out;
  }
  function scaleMidis() { var m = M.music(song), t = M.tonic(m); return M.scale(m).map(function (x) { return t + x; }); }
  function corrected(pid, strength) {
    var r = recs[pid]; if (!r) return Promise.resolve(null);
    if (!strength) return Promise.resolve(r.data);
    var k = pid + '@' + strength; if (fixed[k]) return Promise.resolve(fixed[k]);
    return work({ cmd: 'correct', x: r.data.slice(0), sr: r.sr, notes: notesFor(pid), scale: scaleMidis(), strength: strength, measure: !!window.__shirMeasure }).then(function (d) {
      fixed[k] = d.y; if (d.before) window.__shirLast = { before: d.before, after: d.after, inLen: r.data.length, outLen: d.y.length }; return d.y;
    });
  }
  var revBuf = null;
  function reverb(ctx) {
    var sr = ctx.sampleRate, len = Math.floor(sr * 1.8), b = ctx.createBuffer(2, len, sr);
    for (var ch = 0; ch < 2; ch++) { var d = b.getChannelData(ch); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    return b;
  }
  // בונה את המיקס בתוך הקשר (חי או offline). voices: {pid: Float32Array}
  function buildMix(ctx, dest, t0, voices, sr, o) {
    o = o || {}; var from = o.from || 0, to = o.to == null ? tl.total : o.to;
    var acc = M.schedule(ctx, dest, tl, t0, { lead: !!o.lead, leadGain: 0.3, chords: true, drums: true, from: from, to: to, volume: 0.75 });
    var hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 80;
    var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -22; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.2;
    var vg = ctx.createGain(); vg.gain.value = 1.25;
    var conv = ctx.createConvolver(); conv.buffer = reverb(ctx); var wet = ctx.createGain(); wet.gain.value = 0.16;
    hp.connect(comp); comp.connect(vg); vg.connect(dest); vg.connect(conv); conv.connect(wet); wet.connect(dest);
    var off = (st().off || 0) / 1000, srcs = [];
    occs().forEach(function (oc) {
      var v = voices[oc.pid]; if (!v) return;
      var buf = ctx.createBuffer(1, v.length, sr); buf.copyToChannel ? buf.copyToChannel(v, 0) : buf.getChannelData(0).set(v);
      var start = oc.tb - off; // מאחר = מקדימים את הקול
      if (start + v.length / sr < from || start > to) return;
      var bsn = ctx.createBufferSource(); bsn.buffer = buf; bsn.connect(hp);
      var when = t0 + (start - from), offset = 0; if (when < t0) { offset = t0 - when; when = t0; }
      bsn.start(when, offset, Math.max(0, Math.min(v.length / sr - offset, to - Math.max(start, from)))); srcs.push(bsn);
    });
    return { stop: function () { acc.stop(); srcs.forEach(function (s) { try { s.stop(); } catch (e) {} }); } };
  }
  function voicesAll(strength) {
    var v = {}, ids = Object.keys(recs);
    return Promise.all(ids.map(function (pid) { return corrected(pid, strength).then(function (y) { v[pid] = y; }); })).then(function () { return v; });
  }
  function anyRec() { return Object.keys(recs).length > 0; }
  function playMix(voices, from, to, label) {
    stopAll(); var c = M.ctx(), t0 = c.currentTime + 0.15, sr = (recs[Object.keys(recs)[0]] || {}).sr || c.sampleRate;
    var h = buildMix(c, c.destination, t0, voices, sr, { from: from, to: to }), done = false, raf, timer;
    function tick() { if (done) return; var t = c.currentTime - t0 + from; karaoke(t); if (t > to + 0.2) { stop(); return; } raf = requestAnimationFrame(tick); clearTimeout(timer); timer = setTimeout(tick, 40); }
    function stop() { done = true; cancelAnimationFrame(raf); clearTimeout(timer); h.stop(); $('sh-stop').hidden = true; player = null; }
    player = { stop: stop }; $('sh-stop').hidden = false; msg(label || ''); tick();
  }

  // ---------- MP3 ----------
  function encode(ab, name, kind) {
    var chans = []; for (var i = 0; i < ab.numberOfChannels; i++) chans.push(ab.getChannelData(i).slice(0));
    $('sh-prog').hidden = false; var bar = $('sh-prog').firstChild;
    return work({ cmd: 'mp3', chans: chans, sr: ab.sampleRate, kbps: 128 }, chans.map(function (c) { return c.buffer; }), function (p) { bar.style.width = Math.round(p * 100) + '%'; }).then(function (d) {
      bar.style.width = '100%'; setTimeout(function () { $('sh-prog').hidden = true; }, 600);
      var blob = d.blob; window.__shirMp3 = blob;
      dbPut('mix:' + song.id, { blob: blob, kind: kind, dur: ab.duration, at: Date.now() }).catch(function () {});
      offerFile(blob, name);
      return blob;
    });
  }
  function offerFile(blob, name) {
    var url = URL.createObjectURL(blob), file = null;
    try { file = new File([blob], name, { type: 'audio/mpeg' }); } catch (e) {}
    var canShare = file && navigator.canShare && navigator.canShare({ files: [file] });
    $('sh-file').innerHTML = '<audio controls src="' + url + '" style="width:100%;margin-top:.6rem"></audio><div class="share-row" style="justify-content:flex-start">' +
      '<a class="btn btn-gold btn-sm" href="' + url + '" download="' + esc(name) + '" id="sh-dl">⬇ להוריד MP3</a>' +
      (canShare ? '<button class="btn btn-line btn-sm" type="button" id="sh-share">לשתף</button>' : '<a class="btn btn-line btn-sm" target="_blank" rel="noopener" href="' + S.wa('הקלטתי שיר משלי – "' + (song.title || 'השיר שלי') + '". את הקובץ אני שולח בנפרד 🎵\nאפשר לכתוב שיר משלכם בחינם: https://hakelim.com/kelim/shir/') + '"><svg class="ic"><use href="#wa"/></svg> ווטסאפ</a>') + '</div>';
    $('sh-dl').onclick = function () { used('download'); };
    if (canShare) $('sh-share').onclick = function () { used('share'); navigator.share({ files: [file], title: song.title || 'השיר שלי' }).catch(function () {}); };
  }
  function fname(kind) { return (song.title || 'השיר שלי').replace(/[\\/:*?"<>|]/g, '') + (kind === 'demo' ? ' - קול מדגים' : '') + '.mp3'; }

  // ---------- אירועים ----------
  $('sh-parts').onclick = function (e) {
    var row = e.target.closest('[data-p]'); if (!row) return; var pid = row.getAttribute('data-p');
    if (e.target.closest('[data-rec]')) record(pid);
    if (e.target.closest('[data-play]')) { var u = unit(pid); lastPart = pid; corrected(pid, st().strength).then(function (y) { var v = {}; v[pid] = y; playMix(v, Math.max(0, u.tb - tl.bar * 0.5), u.t1, 'מנגן את ' + u.name + ' (עם תיקון).'); }); used('play_part'); }
  };
  $('sh-phones').onclick = function (e) { var b = e.target.closest('[data-v]'); if (!b) return; st().phones = +b.getAttribute('data-v'); S.save(); chips(); used('phones'); };
  $('sh-str').onclick = function (e) { var b = e.target.closest('[data-v]'); if (!b) return; st().strength = +b.getAttribute('data-v'); S.save(); chips(); used('strength'); };
  $('sh-guide').onchange = function () { st().guide = this.checked ? 1 : 0; S.save(); };
  $('sh-off').oninput = function () { st().off = +this.value; S.save(); chips(); };
  $('sh-off').onchange = function () { used('offset'); if (lastPart && recs[lastPart]) { var u = unit(lastPart); corrected(lastPart, st().strength).then(function (y) { var v = {}; v[lastPart] = y; playMix(v, Math.max(0, u.tb - tl.bar * 0.5), Math.min(u.t1, u.tb + 8), 'מקשיבים לתזמון…'); }); } };
  $('sh-ab').onclick = function () {
    var pid = lastPart && recs[lastPart] ? lastPart : Object.keys(recs)[0]; if (!pid) { msg('מקליטים קודם חלק אחד.'); return; }
    var u = unit(pid); abState = 1 - abState; used('ab');
    corrected(pid, abState ? 0 : (st().strength || 0.7)).then(function (y) { var v = {}; v[pid] = y; playMix(v, Math.max(0, u.tb - tl.bar * 0.5), u.t1, abState ? 'לפני התיקון. לוחצים שוב לשמוע אחרי.' : 'אחרי התיקון.'); });
    this.textContent = abState ? '▶ אחרי התיקון' : '▶ לפני / אחרי';
  };
  $('sh-listen').onclick = function () {
    used('listen');
    if (!anyRec()) { stopAll(); var p = M.play(tl, { lead: true }, karaoke, stopAll); player = p; $('sh-stop').hidden = false; msg('עוד אין הקלטה – מנגן עם קול מדגים.'); return; }
    msg('מכין…'); voicesAll(st().strength).then(function (v) { playMix(v, 0, tl.total, 'מנגן את השיר עם הקול שלך.'); });
  };
  $('sh-stop').onclick = function () { stopAll(); if (mic) { mic.getTracks().forEach(function (t) { t.stop(); }); mic = null; busy = false; } msg(''); };
  $('sh-mp3').onclick = function () {
    if (busy) return; if (!anyRec()) { msg('עוד לא הקלטתם. מקליטים חלק אחד לפחות, או לוחצים "MP3 עם קול מדגים".'); return; }
    busy = true; msg('מתקן, מערבב ומקודד… זה לוקח כמה שניות.'); used('mp3');
    var sr = recs[Object.keys(recs)[0]].sr;
    voicesAll(st().strength).then(function (v) {
      var oc = new OfflineAudioContext(2, Math.ceil((tl.total + 0.5) * sr), sr); buildMix(oc, oc.destination, 0, v, sr, {}); return oc.startRendering();
    }).then(function (ab) { return encode(ab, fname('voice'), 'voice'); }).then(function () { busy = false; msg('מוכן! אפשר להוריד, לשתף, או לעבור לקליפ.'); }, function (err) { busy = false; msg('משהו נכשל בהכנת הקובץ. מנסים שוב. (' + (err && err.message || '') + ')'); });
  };
  $('sh-demo-mp3').onclick = function () {
    if (busy) return; busy = true; msg('מכין MP3 עם קול מדגים…'); used('mp3_demo');
    M.renderOffline(tl, { lead: true, volume: 0.85 }, 44100).then(function (ab) { return encode(ab, fname('demo'), 'demo'); }).then(function () { busy = false; msg('מוכן! הקובץ עם קול מדגים.'); }, function (err) { busy = false; msg('משהו נכשל. מנסים שוב. (' + (err && err.message || '') + ')'); });
  };
  $('sh-songs').onchange = function () { stopAll(); S.select(this.value); used('switch'); load(); };
  var go = $('sh-go'); if (go && go.tagName === 'A') go.addEventListener('click', function () { used('next'); });

  window.__shir = { recs: function () { return recs; }, corrected: corrected, notesFor: notesFor, units: units, tl: function () { return tl; }, record: record };
  load();
})();
