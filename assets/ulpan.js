// "אולפן ההקלטות" (/kelim/shir/ulpan/): שומעים את המוזיקה, שרים מהטלפון, והאולפן מסנכרן, מנקה, מיישר לקצב,
// מתקן זיופים, מערבב ומחזיר שיר מוכן. הכול בטלפון: ההקלטה לא עולה לשום שרת. המנוע: ulpan-dsp.js (Worker).
(function () {
  'use strict';
  var S = window.Shir, M = S.M, TOOL = 'shir_ulpan', LS = 'ulpan:v1';
  var $ = function (id) { return document.getElementById(id); };
  var esc = S.esc;
  var st = { set: { phones: 1, noise: 2, tight: 0.5, tune: 0.7, style: 'ulpan', voice2: 'off', v2cho: 0, bal: 0, off: 0, mic: '' }, cal: {}, words: '', src: null, takes: [] };
  var music = null;      // {buf, name, dur, kind, songId, rms, peaks, key}
  var takes = [];        // {id, startS, n, pcm:Int16Array, mode, lag, lagMs, on, y:Float32Array, ph:[{a,b,ms}], notes, cents, moved, a, b}
  var actx = null, sr = 48000, W = null, wcb = {}, wid = 0, busy = false, rec = null, player = null, head = 0, comp = {}, lastUsed = {};
  var pcmOf = {};        // id -> Int16Array (ההקלטה המקורית)

  function used(how) { var now = Date.now(); if (lastUsed[how] && now - lastUsed[how] < 30000) return; lastUsed[how] = now; S.used(TOOL, how); }
  function msg(t, cls) { var m = $('ul-msg'); m.textContent = t || ''; m.className = 'shr-msg' + (cls ? ' ' + cls : ''); }
  function fmt(t) { t = Math.max(0, Math.round(t)); return Math.floor(t / 60) + ':' + ('0' + (t % 60)).slice(-2); }
  function ctx() { if (!actx) { actx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' }); sr = actx.sampleRate; } return actx; }
  function wake() { var c = ctx(); if (c.state === 'suspended') c.resume(); return c; }
  function save() {
    st.takes = takes.map(function (t) { return { id: t.id, startS: t.startS, n: t.n, sr: sr, mode: t.mode, lag: t.lag, lagMs: t.lagMs, on: t.on }; });
    try { localStorage.setItem(LS, JSON.stringify(st)); } catch (e) {}
  }
  function prog(p) { var b = $('ul-prog'); b.hidden = p == null; if (p != null) b.firstElementChild.style.width = Math.round(Math.max(0, Math.min(1, p)) * 100) + '%'; }

  // ---------- שמירה בטלפון (IndexedDB) ----------
  var dbp = null;
  function idb() { if (!dbp) dbp = new Promise(function (res, rej) { var r = indexedDB.open('ulpan', 1); r.onupgradeneeded = function () { r.result.createObjectStore('kv'); }; r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; }); return dbp; }
  function dbDo(mode, fn) { return idb().then(function (db) { return new Promise(function (res, rej) { var tx = db.transaction('kv', mode), q = fn(tx.objectStore('kv')); tx.oncomplete = function () { res(q && q.result); }; tx.onerror = tx.onabort = function () { rej(tx.error); }; }); }); }
  function dbGet(k) { return dbDo('readonly', function (s) { return s.get(k); }).catch(function () { return null; }); }
  function dbPut(k, v) { return dbDo('readwrite', function (s) { return s.put(v, k); }).catch(function () {}); }
  function dbDel(k) { return dbDo('readwrite', function (s) { return s.delete(k); }).catch(function () {}); }

  // ---------- המנוע (Worker) ----------
  function work(m, transfer, onP) {
    if (!W) {
      W = new Worker($('ul-root').getAttribute('data-dsp') || '/assets/ulpan-dsp.js');
      W.onmessage = function (e) { var d = e.data, cb = wcb[d.id]; if (!cb) return; if (d.progress != null) { if (cb.p) cb.p(d.progress); return; } delete wcb[d.id]; d.error ? cb.rej(new Error(d.error)) : cb.res(d); };
      W.onerror = function (e) { Object.keys(wcb).forEach(function (k) { wcb[k].rej(new Error(e.message || 'worker')); delete wcb[k]; }); };
    }
    return new Promise(function (res, rej) { m.id = ++wid; wcb[m.id] = { res: res, rej: rej, p: onP }; W.postMessage(m, transfer || []); });
  }

  // ---------- 1. המוזיקה ----------
  function monoOf(buf) { var n = buf.length, m = new Float32Array(n), nc = buf.numberOfChannels; for (var c = 0; c < nc; c++) { var d = buf.getChannelData(c); for (var i = 0; i < n; i++) m[i] += d[i] / nc; } return m; }
  function rmsOf(x) { var s = 0; for (var i = 0; i < x.length; i++) s += x[i] * x[i]; return Math.sqrt(s / Math.max(1, x.length)); }
  function setMusic(buf, name, kind, songId, pcs, mel, cho) {
    stopAll();
    var mono = monoOf(buf), P = 600, peaks = new Float32Array(P), step = mono.length / P;
    for (var p = 0; p < P; p++) { var a = Math.floor(p * step), b = Math.min(mono.length, Math.floor((p + 1) * step)), mx = 0; for (var i = a; i < b; i += 8) { var v = Math.abs(mono[i]); if (v > mx) mx = v; } peaks[p] = mx; }
    music = { buf: buf, name: name, dur: buf.duration, kind: kind, songId: songId || null, rms: rmsOf(mono) || 0.05, peaks: peaks, key: null };
    head = 0; comp = {};
    st.src = kind === 'song' ? { kind: 'song', id: songId } : { kind: 'file', name: name };
    $('ul-mname').textContent = (kind === 'song' ? 'השיר: ' : 'הקובץ: ') + name + ' · ' + fmt(music.dur);
    [].forEach.call($('ul-src').children, function (b) { b.classList.toggle('on', b.getAttribute('data-v') === kind); });
    $('ul-songs').hidden = kind !== 'song';
    draw(); drawTakes(); save();
    music.mel = !!(mel && mel.length); music.cho = cho && cho.length ? cho : null; chips(); // cho = איפה הפזמון בשיר (שניות): [התחלה, סוף, ...]
    return work({ cmd: 'ref', x: mono, sr: sr, pcs: pcs || null, mel: mel || null }, [mono.buffer]).then(function (r) { if (music) music.key = r.key; });
  }
  function dropTakes() { takes.forEach(function (t) { dbDel('take:' + t.id); work({ cmd: 'drop', take: t.id }).catch(function () {}); delete pcmOf[t.id]; }); takes = []; comp = {}; }
  function okToReplace() { return !takes.length || window.confirm('החלפת המוזיקה תמחק את ההקלטות שכבר שרתם. להמשיך?'); }
  function loadSong(id, keep) {
    var song = id ? S.select(id) : S.cur(); if (!song) return Promise.resolve();
    var tl = M.timeline(song);
    if (!tl.total || tl.total < 2) { msg('בשיר הזה עוד אין מנגינה. מלחינים אותו קודם, או בוחרים קובץ מהטלפון.'); return Promise.resolve(); }
    msg('מכין את המוזיקה של השיר…'); busy = true;
    // מרנדרים בחצי קצב דגימה (מהיר פי 2.5) ושומרים בטלפון, כדי שבפעם הבאה השיר ייפתח מיד
    var key = song.id + ':' + hash(JSON.stringify([song.parts, song.order, song.music])), LOW = 24000;
    return dbGet('songbuf').then(function (c) {
      if (c && c.key === key && c.ch && c.ch.length) return c;
      return M.renderOffline(tl, { lead: true, leadGain: 0.2, chords: true, drums: true, volume: 0.85 }, LOW).then(function (b) {
        var r = { key: key, sr: LOW, ch: [] }; for (var i = 0; i < b.numberOfChannels; i++) r.ch.push(toPcm(b.getChannelData(i))); dbPut('songbuf', r); return r;
      });
    }).then(function (c) { // חזרה לקצב של הטלפון (אינטרפולציה לינארית)
      var n = Math.round(c.ch[0].length * sr / c.sr), buf = ctx().createBuffer(c.ch.length, n, sr), k = c.sr / sr;
      for (var ch = 0; ch < c.ch.length; ch++) { var s = c.ch[ch], d = buf.getChannelData(ch), m = s.length - 1; for (var i = 0; i < n; i++) { var p = i * k, q = p | 0, f = p - q; d[i] = q < m ? (s[q] * (1 - f) + s[q + 1] * f) / 32768 : s[m] / 32768; } }
      return buf;
    }).then(function (buf) {
      if (!keep) dropTakes();
      if (!st.words || st.wordsOf !== song.id) { st.words = S.sung(song).map(function (p) { return p.lines.join('\n'); }).join('\n\n'); st.wordsOf = song.id; $('ul-words').value = st.words; showWords(); }
      var mm = M.music(song), tn = M.tonic(mm), pcs = M.scale(mm).map(function (x) { return ((tn + x) % 12 + 12) % 12; });
      // המנגינה הידועה: [התחלה, אורך, תו, שורה] לכל הברה. לפיה האולפן מיישר ומתקן, לא רק לפי הסולם
      var mel = new Float32Array(tl.notes.length * 4); tl.notes.forEach(function (nt, i) { mel[i * 4] = nt.t; mel[i * 4 + 1] = nt.dur; mel[i * 4 + 2] = nt.midi; mel[i * 4 + 3] = nt.line; });
      // איפה הפזמון: לפי החלקים של השיר. לשם אפשר לכוון את קולות הליווי ("רק בפזמון")
      var types = {}, cho = []; (song.parts || []).forEach(function (p) { types[p.id] = p.type; });
      tl.lines.forEach(function (ln) { if (types[ln.part] !== 'chorus') return; var a = ln.tb != null ? ln.tb : ln.t0; if (cho.length && a - cho[cho.length - 1] < 0.05) cho[cho.length - 1] = ln.t1; else cho.push(a, ln.t1); });
      vidSet(null); return setMusic(buf, song.title || song.topic || 'שיר בלי שם', 'song', song.id, pcs, mel, cho);
    }).then(function () { busy = false; msg(''); }, function (e) { busy = false; msg('לא הצלחתי להכין את המוזיקה. (' + (e && e.message || '') + ')'); });
  }
  function hash(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + s.length; }
  function decode(ab) { var c = ctx(); return new Promise(function (res, rej) { var p = c.decodeAudioData(ab, res, rej); if (p && p.catch) p.catch(rej); }); }
  function loadFile(file, keep) {
    msg('פותח את הקובץ…'); busy = true;
    return file.arrayBuffer().then(decode).then(function (buf) {
      if (buf.duration > 600) throw new Error('long');
      if (buf.duration < 3) throw new Error('short');
      if (!keep) { dropTakes(); dbPut('music', { blob: file, name: file.name }); }
      return setMusic(buf, file.name.replace(/\.[a-z0-9]{2,5}$/i, ''), 'file').then(function (r) { vidSet(file); return r; });
    }).then(function () { busy = false; msg(''); used('music_file'); }, function (e) {
      busy = false; var m = e && e.message;
      msg(m === 'long' ? 'הקובץ ארוך מ-10 דקות. בוחרים קובץ קצר יותר.' : m === 'short' ? 'הקובץ קצר מדי.' : 'לא הצלחתי לפתוח את הקובץ. קובצי MP3, M4A ו-WAV עובדים הכי טוב.');
    });
  }
  function drawSongs() { $('ul-songs').innerHTML = S.list().map(function (s) { return '<option value="' + esc(s.id) + '"' + (st.src && st.src.id === s.id ? ' selected' : '') + '>' + esc(s.title || s.topic || 'שיר בלי שם') + '</option>'; }).join(''); }

  // ---------- ציור: גל הקול, ההקלטות והסמן ----------
  function draw() {
    var cv = $('ul-cv'), w = cv.clientWidth || 320, h = 72, dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    var g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    if (!music) return;
    var P = music.peaks.length, mx = 0.01, i; for (i = 0; i < P; i++) if (music.peaks[i] > mx) mx = music.peaks[i];
    g.fillStyle = 'rgba(227,183,101,.55)';
    for (var x = 0; x < w; x += 2) { var v = music.peaks[Math.min(P - 1, Math.floor(x / w * P))] / mx, bh = Math.max(1, v * (h - 18)); g.fillRect(x, (h - 12 - bh) / 2, 1.4, bh); }
    takes.forEach(function (t) { if (t.a == null) return; var a = (t.startS / sr + t.a) / music.dur * w, b = (t.startS / sr + t.b) / music.dur * w; g.fillStyle = t.on ? '#7fd1b0' : 'rgba(127,209,176,.3)'; g.fillRect(w - b, h - 9, Math.max(2, b - a), 5); });
    var hx = w - head / music.dur * w; g.fillStyle = '#fff'; g.fillRect(hx - 1, 0, 2, h);
    $('ul-time').textContent = fmt(head) + ' / ' + fmt(music.dur);
    var rb = $('ul-rec'); if (rb && !rec) rb.textContent = head > 0.5 ? '⏺ להקליט מ-' + fmt(head) : '⏺ להקליט';
  }
  function seekEv(e) { if (!music || rec) return; var r = $('ul-cv').getBoundingClientRect(), x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left; var was = player && player.mode; stopAll(); head = Math.max(0, Math.min(music.dur - 0.05, (1 - x / r.width) * music.dur)); draw(); if (was) play(was); }

  // ---------- ההקלטות: מהן נבנה ערוץ הקול ----------
  function f32(pcm, lag, n) { var y = new Float32Array(n), L = Math.round(lag || 0); for (var i = 0; i < n; i++) { var p = i + L; if (p >= 0 && p < pcm.length) y[i] = pcm[p] / 32768; } return y; }
  // ערוץ הקול לאורך כל השיר. הקלטה מאוחרת יותר מחליפה את מה שהיה מתחתיה (כך מתקנים קטע).
  function composite(mode) {
    if (comp[mode]) return comp[mode];
    var n = music.buf.length, v = new Float32Array(n), F = Math.round(sr * 0.02), offS = Math.round(st.set.off / 1000 * sr), ss = 0, cnt = 0;
    takes.forEach(function (t) {
      if (!t.on || !t.y || t.a == null) return;
      var src = mode === 'raw' ? f32(pcmOf[t.id], t.lag, t.n) : t.y, a = Math.max(0, Math.round(t.a * sr)), b = Math.min(t.n, Math.round(t.b * sr));
      for (var i = a; i < b; i++) { var q = t.startS + i - offS; if (q < 0 || q >= n) continue; var w = 1; if (i - a < F) w = (i - a) / F; if (b - i < F) w = Math.min(w, (b - i) / F); v[q] = v[q] * (1 - w) + src[i] * w; }
    });
    for (var i = 0; i < n; i++) { var x = v[i]; if (x > 0.004 || x < -0.004) { ss += x * x; cnt++; } }
    return (comp[mode] = { v: v, rms: cnt > sr / 4 ? Math.sqrt(ss / cnt) : 0 });
  }
  var irCache = {};
  function ir(c, secs) {
    var k = secs + ':' + c.sampleRate; if (irCache[k]) return irCache[k];
    var len = Math.floor(c.sampleRate * secs), b = c.createBuffer(2, len, c.sampleRate);
    for (var ch = 0; ch < 2; ch++) { var d = b.getChannelData(ch), lp = 0; for (var i = 0; i < len; i++) { var t = i / len, x = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.6), a = 0.25 + 0.6 * (1 - t); lp += a * (x - lp); d[i] = lp; } }
    return (irCache[k] = b);
  }
  var STYLE = { tivi: { pres: 1.5, air: 1, wet: 0.07, secs: 1.0, ratio: 2.5 }, ulpan: { pres: 3, air: 3, wet: 0.15, secs: 1.7, ratio: 3.5 }, ulam: { pres: 2.5, air: 2, wet: 0.3, secs: 2.9, ratio: 3.5 } };
  // המיקס: בהקשר חי (לשמיעה) או offline (לקובץ). mode: 'final' | 'raw' | 'none'
  function graph(c, dest, t0, from, mode, musicGain) {
    var nodes = [], lim = c.createDynamicsCompressor(); lim.threshold.value = -3; lim.knee.value = 3; lim.ratio.value = 14; lim.attack.value = 0.003; lim.release.value = 0.12; lim.connect(dest);
    var ms = c.createBufferSource(); ms.buffer = music.buf; var mg = c.createGain(); mg.gain.value = musicGain == null ? 0.9 : musicGain; ms.connect(mg); mg.connect(lim); ms.start(t0, from); nodes.push(ms);
    var cp = mode !== 'none' && takes.length ? composite(mode) : null;
    if (cp && cp.rms) {
      var vb = c.createBuffer(1, cp.v.length, sr); vb.getChannelData(0).set(cp.v);
      var vs = c.createBufferSource(); vs.buffer = vb; nodes.push(vs);
      var pre = c.createGain(); pre.gain.value = Math.min(40, 0.1 / cp.rms); vs.connect(pre);
      var post = c.createGain(); post.gain.value = music.rms / 0.1 * 0.9 * Math.pow(10, (st.set.bal + 2) / 20);
      if (mode === 'raw') { post.gain.value *= 0.78; pre.connect(post); post.connect(lim); }
      else {
        var sty = STYLE[st.set.style] || STYLE.ulpan;
        var hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 85; hp.Q.value = 0.7;
        var mud = c.createBiquadFilter(); mud.type = 'peaking'; mud.frequency.value = 280; mud.Q.value = 1; mud.gain.value = -2.5;
        var pr = c.createBiquadFilter(); pr.type = 'peaking'; pr.frequency.value = 3800; pr.Q.value = 0.9; pr.gain.value = sty.pres;
        var air = c.createBiquadFilter(); air.type = 'highshelf'; air.frequency.value = 9000; air.gain.value = sty.air;
        var cm = c.createDynamicsCompressor(); cm.threshold.value = -24; cm.knee.value = 8; cm.ratio.value = sty.ratio; cm.attack.value = 0.006; cm.release.value = 0.16;
        var mk = c.createGain(); mk.gain.value = Math.pow(10, (0.6 * (-24 + 24 / sty.ratio) + 5.5) / 20); // מבטל את ההגברה האוטומטית של המדחס, ומשאיר 3dB
        pre.connect(hp); hp.connect(mud); mud.connect(pr); pr.connect(air); air.connect(cm); cm.connect(mk); mk.connect(post); post.connect(lim);
        var sh = c.createBiquadFilter(); sh.type = 'highpass'; sh.frequency.value = 300;
        var cv = c.createConvolver(); cv.buffer = ir(c, sty.secs); var wet = c.createGain(); wet.gain.value = sty.wet * 1.6;
        post.connect(sh); sh.connect(cv); cv.connect(wet); wet.connect(lim);
        var bk = comp.back && comp.back.buf && comp.back.mode === backKey() ? comp.back.buf : null;
        if (bk) { // קולות הליווי (הכפלה / קול שני): מתחת לקול, בלי הנמוכים ובלי הגבוהים, ועם אותו הד
          var bs = c.createBufferSource(); bs.buffer = bk; nodes.push(bs);
          var bg = c.createGain(); bg.gain.value = pre.gain.value;
          var bh = c.createBiquadFilter(); bh.type = 'highpass'; bh.frequency.value = 170; bh.Q.value = 0.7;
          var bl = c.createBiquadFilter(); bl.type = 'lowpass'; bl.frequency.value = 6500; bl.Q.value = 0.6;
          var bc = c.createDynamicsCompressor(); bc.threshold.value = -24; bc.knee.value = 8; bc.ratio.value = sty.ratio; bc.attack.value = 0.006; bc.release.value = 0.16;
          var bm = c.createGain(); bm.gain.value = mk.gain.value * 0.5; // הליווי יושב כ-8dB מתחת לקול
          bs.connect(bg); bg.connect(bh); bh.connect(bl); bl.connect(bc); bc.connect(bm); bm.connect(post); bs.start(t0, from);
        }
      }
      vs.start(t0, from);
    }
    return { stop: function () { nodes.forEach(function (n) { try { n.stop(); } catch (e) {} }); try { lim.disconnect(); } catch (e) {} } };
  }
  // סרטון קריוקי (למשל מהבוט): המילים רצות מול העיניים, מסונכרן לשעון של המוזיקה
  var vidUrl = null;
  function vidSet(file) {
    var v = $('ul-vid'), w = $('ul-vidw'); if (!v) return;
    if (vidUrl) { try { URL.revokeObjectURL(vidUrl); } catch (e) {} vidUrl = null; }
    var isV = file && (/^video\//.test(file.type || '') || /\.(mp4|mov|webm|m4v)$/i.test(file.name || ''));
    if (isV) { vidUrl = URL.createObjectURL(file); v.src = vidUrl; v.muted = true; v.load(); } else { v.removeAttribute('src'); try { v.load(); } catch (e) {} }
    if (isV && st.wordsOf) { st.words = ''; st.wordsOf = null; $('ul-words').value = ''; save(); } // מילים של שיר מהאתר לא מתאימות לסרטון
    w.hidden = !isV; $('ul-vidhint').hidden = !isV; showWords();
    if (isV) [].forEach.call($('ul-src').children, function (b) { var k = b.getAttribute('data-v'); if (k === 'karaoke' || k === 'file') b.classList.toggle('on', k === 'karaoke'); });
  }
  function vidOn() { var v = $('ul-vid'); return !!(v && vidUrl && !$('ul-vidw').hidden); }
  function vidGo(from, t0) { if (!vidOn()) return; var v = $('ul-vid'), c = ctx(); v.pause(); try { v.currentTime = Math.max(0, from); } catch (e) {} setTimeout(function () { var p = v.play(); if (p && p.catch) p.catch(function () {}); }, Math.max(0, (t0 - c.currentTime) * 1000)); }
  function vidFix(at) { if (!vidOn()) return; var v = $('ul-vid'); if (!v.paused && Math.abs(v.currentTime - at) > 0.3) { try { v.currentTime = at; } catch (e) {} } }
  function vidStop(at) { if (!vidOn()) return; var v = $('ul-vid'); v.pause(); if (at != null) { try { v.currentTime = at; } catch (e) {} } }
  function stopAll() { vidStop(); if (player) { player.stop(); player = null; } $('ul-play').textContent = '▶'; var l = $('ul-listen'); if (l) l.textContent = '▶ לשמוע את השיר'; }
  // קולות הליווי נבנים פעם אחת לכל השיר, רק כשבאמת צריך אותם (לפני שמיעה או הכנת הקובץ)
  var BACK_MSG = { double: 'מכפיל את הקול…', second: 'מוסיף קול שני…', choir: 'מוסיף מקהלה…' };
  function backKey() { return st.set.voice2 + (st.set.v2cho && music && music.cho ? ':c' : ''); } // ':c' = הליווי רק בפזמון
  function backNeeded() { var m = st.set.voice2; return !!m && m !== 'off' && !!music && takes.length > 0 && !(comp.back && comp.back.mode === backKey()); }
  function prepBack() {
    if (!backNeeded()) return Promise.resolve();
    var m = st.set.voice2, key = backKey(), cp = composite('final'), c0 = comp;
    if (!cp.rms) { c0.back = { mode: key, buf: null }; return Promise.resolve(); }
    var v = new Float32Array(cp.v);
    return work({ cmd: 'back', v: v, mode: m, zones: key !== m ? music.cho : null }, [v.buffer]).then(function (r) {
      if (comp !== c0) return; // ההקלטות השתנו בינתיים
      var b = ctx().createBuffer(2, r.L.length, r.sr); b.getChannelData(0).set(r.L); b.getChannelData(1).set(r.R);
      c0.back = { mode: key, buf: b, notes: r.notes };
    }, function () { if (comp === c0) c0.back = { mode: key, buf: null }; });
  }
  function play(mode) {
    if (!music || rec) return;
    if (mode === 'final' && backNeeded()) {
      if (busy) return; stopAll(); busy = true; var bm0 = BACK_MSG[st.set.voice2] || 'מעדכן…'; msg(bm0);
      prepBack().then(function () { busy = false; if ($('ul-msg').textContent === bm0) msg(''); if (!backNeeded()) play(mode); });
      return;
    }
    stopAll(); var c = wake();
    if (head >= music.dur - 0.3) head = 0;
    var t0 = c.currentTime + 0.08, from = head, h = graph(c, c.destination, t0, from, mode), done = false, raf, tm; vidGo(from, t0);
    function tick() { if (done) return; head = Math.min(music.dur, from + Math.max(0, c.currentTime - t0)); draw(); if (c.currentTime > t0 + 0.3) vidFix(head); if (head >= music.dur - 0.02) { stop(); head = 0; draw(); stopAll(); return; } raf = requestAnimationFrame(tick); clearTimeout(tm); tm = setTimeout(tick, 60); }
    function stop() { done = true; cancelAnimationFrame(raf); clearTimeout(tm); h.stop(); }
    player = { stop: stop, mode: mode }; $('ul-play').textContent = '❚❚'; if (mode !== 'none') $('ul-listen').textContent = '❚❚ לעצור'; tick();
  }

  // ---------- 2. מקליטים ----------
  var WORKLET = 'class R extends AudioWorkletProcessor{constructor(){super();this.on=true;this.b=new Float32Array(2048);this.n=0;this.f=0;this.port.onmessage=()=>{this.on=false;if(this.n)this.port.postMessage({f:this.f,d:this.b.slice(0,this.n)});this.port.postMessage({end:1})}}process(i){if(!this.on)return false;var c=i[0]&&i[0][0];if(c){if(!this.n)this.f=currentFrame;this.b.set(c,this.n);this.n+=c.length;if(this.n>=2048){this.port.postMessage({f:this.f,d:this.b.slice(0)});this.n=0}}return true}}registerProcessor("ulpan-rec",R)';
  var wlReady = null;
  function capture(stream) { // אוסף את המיקרופון עם חותמת זמן מדויקת. stop() מחזיר {data, first}
    var c = ctx(), src = c.createMediaStreamSource(stream), chunks = [], first = null, peak = 0, node, mute = c.createGain(); mute.gain.value = 0; mute.connect(c.destination);
    function push(f, d) { if (first == null) first = f; chunks.push(d); for (var i = 0; i < d.length; i += 16) { var v = Math.abs(d[i]); if (v > peak) peak = v; } }
    function join() { var n = 0; chunks.forEach(function (d) { n += d.length; }); var y = new Float32Array(n), o = 0; chunks.forEach(function (d) { y.set(d, o); o += d.length; }); return { data: y, first: first || 0 }; }
    var ready;
    if (c.audioWorklet && window.AudioWorkletNode) {
      if (!wlReady) wlReady = c.audioWorklet.addModule(URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' })));
      ready = wlReady.then(function () { node = new AudioWorkletNode(c, 'ulpan-rec', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 1 }); src.connect(node); node.connect(mute); }, function () { node = null; });
    } else ready = Promise.resolve();
    ready = ready.then(function () {
      if (node) return;
      var sp = c.createScriptProcessor(4096, 1, 1); sp.onaudioprocess = function (e) { push(Math.round(c.currentTime * sr) - 4096, new Float32Array(e.inputBuffer.getChannelData(0))); }; src.connect(sp); sp.connect(mute); node = sp; node._sp = 1;
    });
    return ready.then(function () {
      var done = null;
      if (!node._sp) node.port.onmessage = function (e) { if (e.data.end) { if (done) done(join()); } else push(e.data.f, e.data.d); };
      return {
        peak: function () { var p = peak; peak = 0; return p; },
        stop: function () {
          return new Promise(function (res) {
            function fin(r) { try { src.disconnect(); node.disconnect(); mute.disconnect(); } catch (e) {} stream.getTracks().forEach(function (t) { t.stop(); }); res(r); }
            if (node._sp) { node.onaudioprocess = null; fin(join()); } else { done = fin; node.port.postMessage('stop'); setTimeout(function () { if (done) { done = null; fin(join()); } }, 800); }
          });
        }
      };
    });
  }
  // ---------- אוזניות בלוטות': מזהים לבד, ומקליטים מהמיקרופון של הטלפון ----------
  // המיקרופון של אוזניות בלוטות' מקליט כמו שיחת טלפון (עד 4 או 8 kHz), והן גם משמיעות את המוזיקה באיחור גדול.
  // כשהן מחוברות ולא בחרו מיקרופון ביד, פותחים לבד את המיקרופון של הטלפון. בלי בלוטות' הכול נשאר כמו שהיה.
  var BT_RE = /bluetooth|hands[- ]?free|\bhfp\b|\bsco\b|air ?pods|buds|\bbeats\b|\bjbl\b|\bbose\b|jabra|soundcore|\btws\b|\bw[hf]-\w*\d|\bbt\b|\dbt\b|בלוטות|אלחוטי/i;
  function micKind(l) { l = l || ''; return BT_RE.test(l) ? 'bt' : /wired|usb|חוט/i.test(l) ? 'wired' : /earpiece|אפרכסת/i.test(l) ? 'ear' : /speakerphone|built[- ]?in|internal|iphone|ipad|\bphone\b|array|מובנה|טלפון/i.test(l) ? 'phone' : 'other'; }
  var bt = { on: false, auto: '', only: false, manual: false, avoid: [] }, micNow = null; // avoid = מיקרופונים שכבר הקליטו צר // micNow = המיקרופון שנפתח: {id, group, label, kind, rate, auto}
  function scanMics() { // מי מחובר: {ins, hasBt, target (המיקרופון של הטלפון), need (צריך לעבור אליו לבד)}
    var md = navigator.mediaDevices; if (!md || !md.enumerateDevices) return Promise.resolve(null);
    return md.enumerateDevices().then(function (ds) {
      var ins = [], hasBt = false, btIn = false, wired = false, defBt = null, rank = { phone: 0, other: 1, wired: 2, ear: 3 };
      ds.forEach(function (d) {
        if (!d.label) return; var k = micKind(d.label);
        if (k === 'bt') hasBt = true; // גם אוזניות שרק מנגנות: האיחור שלהן גדול
        if (d.kind !== 'audioinput') return;
        if (d.deviceId === 'default' || d.deviceId === 'communications') { if (d.deviceId === 'default' && /\s-\s/.test(d.label)) defBt = k === 'bt'; return; }
        if (k === 'bt') btIn = true; if (k === 'wired') wired = true;
        ins.push({ id: d.deviceId, group: d.groupId || '', label: d.label, kind: k });
      });
      var cands = ins.filter(function (d) { return d.kind !== 'bt' && !bt.avoid.some(function (av) { return d.id === av.id || (av.group && d.group === av.group) || (av.label && av.label.indexOf(d.label) >= 0); }); }).sort(function (a, b) { return rank[a.kind] - rank[b.kind]; });
      return { ins: ins, hasBt: hasBt, btIn: btIn, target: cands[0] || null, need: !!cands.length && (bt.avoid.length > 0 || (btIn && (defBt === true || (defBt == null && !wired)))) };
    });
  }
  function showMics(s) {
    if (!s) return s;
    var man = st.set.mic ? s.ins.filter(function (d) { return d.id === st.set.mic; })[0] : null;
    bt.on = s.hasBt || bt.avoid.length > 0; bt.manual = !!man && man.kind === 'bt'; bt.auto = !man && s.need ? s.target.label : ''; bt.only = s.btIn && !s.target;
    if (s.ins.length >= 2) { $('ul-micw').hidden = false; $('ul-mic').innerHTML = '<option value="">האולפן בוחר לבד (מומלץ)</option>' + s.ins.map(function (d) { return '<option value="' + esc(d.id) + '"' + (d.id === st.set.mic ? ' selected' : '') + '>' + esc(d.label) + '</option>'; }).join(''); }
    chips(); return s;
  }
  function refreshMics() { return scanMics().then(showMics, function () { return null; }); }
  function openMic(id) {
    var a = { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 }; if (id) a.deviceId = { exact: id };
    return navigator.mediaDevices.getUserMedia({ audio: a });
  }
  function getMic() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return Promise.reject(new Error('nomic'));
    var bad = '';
    function want(s) { var w = st.set.mic || (s && s.need ? s.target.id : ''); return w === bad ? '' : w; }
    function scan() { return scanMics().catch(function () { return null; }); }
    function done(stream, s, id) {
      var tr = stream.getAudioTracks()[0], g = tr && tr.getSettings ? tr.getSettings() : {};
      micNow = { id: id || g.deviceId || '', group: g.groupId || '', label: tr && tr.label || '', rate: g.sampleRate || 0, auto: !!id && !st.set.mic };
      micNow.kind = micKind(micNow.label); showMics(s); return stream;
    }
    return scan().then(function (s0) {
      var id = want(s0);
      return openMic(id).catch(function (e) { if (!id) throw e; bad = id; if (st.set.mic) st.set.mic = ''; id = ''; return openMic(''); }).then(function (stream) {
        return scan().then(function (s) { // אחרי אישור המיקרופון יש למכשירים שמות, גם בפעם הראשונה
          var id2 = want(s); if (!id2 || id2 === id) return done(stream, s, id);
          stream.getTracks().forEach(function (t) { t.stop(); });
          return openMic(id2).then(function (s2) { return done(s2, s, id2); }, function () { bad = id2; return openMic('').then(function (s3) { return done(s3, s, ''); }); });
        });
      });
    });
  }
  // האיחור של הנגינה נמדד בנפרד לכל דרך שמיעה: רמקול / אוזניות / אוזניות בלוטות'
  function calKey() { return !st.set.phones ? 'speaker' : bt.on ? 'bt' : 'phones'; }
  function calMs() { var k = calKey(); return k === 'bt' && st.cal.bt == null && st.cal.phones >= 110 ? st.cal.phones : st.cal[k]; } // מדידה ישנה של בלוטות' נשמרה בשם "אוזניות"
  function guessLat() {
    var c = ctx(), m = calMs(); if (m != null) return m / 1000;
    if (calKey() === 'bt') return Math.max(0.2, (c.outputLatency || 0) + 0.035); // בלוטות' שעוד לא נמדד: בערך 200 אלפיות שנייה
    if (st.cal.speaker != null) return st.cal.speaker / 1000; return (c.outputLatency || c.baseLatency || 0.02) + 0.035;
  }
  function isNarrow(t) { var b = t.stat && t.stat.band, mc = t.mic || {}; return t.a != null && (b === 4 || (b === 8 && (mc.kind === 'bt' || (mc.rate > 0 && mc.rate <= 16000)))); }
  function offerCal() { return !!st.set.phones && bt.on && calMs() == null && takes.some(function (t) { return t.mode === 'guess' && t.a != null && !isNarrow(t) && !(t.stat && t.stat.sync === 'mel'); }); }
  // אחרי הקלטה: מה להגיד על המיקרופון ועל האוזניות (משפט אחד), ואם צריך – לעבור לבד למיקרופון אחר בהקלטה הבאה
  function micNote(t) {
    var mc = t.mic || {};
    if (!isNarrow(t)) return Promise.resolve(mc.auto && st.set.phones && t.mode === 'bleed' && t.stat.bleedDb > -12 ? ' המוזיקה התנגנה מהטלפון ולא מהאוזניות, והאולפן הוריד אותה מההקלטה.' : '');
    if (st.set.mic) return Promise.resolve(' ההקלטה נשמעת כמו שיחת טלפון, כי בחרתם במיקרופון של האוזניות. לקול מלא: ב"סנכרון ומיקרופון" בוחרים "האולפן בוחר לבד", ומקליטים שוב.');
    bt.avoid.push({ id: mc.id || '-', group: mc.group, label: mc.label });
    return refreshMics().then(function (s) {
      return s && s.need ? ' ההקלטה נשמעת כמו שיחת טלפון: הקליט המיקרופון של אוזניות הבלוטות\'. מקליטים שוב, והפעם אקליט מהמיקרופון של הטלפון.'
        : ' ההקלטה נשמעת כמו שיחת טלפון: כנראה הקליט מיקרופון של אוזניות בלוטות\'. לקול מלא מקליטים שוב בלי האוזניות, או עם אוזניות חוט.';
    });
  }
  function showWords() { var w = (st.words || '').trim(), on = vidOn(); $('ul-lyrv').textContent = w || (on ? '' : 'שרים עם המוזיקה. כשמסיימים – לוחצים "לסיים".'); $('ul-lyrv').hidden = !w && on; $('ul-stage').classList.toggle('ul-mini', !w && on); }
  function record() {
    if (busy || rec) return; if (!music) { msg('קודם בוחרים מוזיקה.'); return; }
    stopAll(); var c = wake(); busy = true; msg('מבקש גישה למיקרופון…');
    getMic().then(capture).then(function (cap) {
      busy = false; msg(''); used('rec');
      var pos = head > 0.5 ? head : 0, pre = pos ? Math.min(3, pos) : 0, startPos = pos - pre, lead = pos ? 0.35 : 2.4, t0 = c.currentTime + lead;
      var ms = c.createBufferSource(); ms.buffer = music.buf; var mg = c.createGain(); mg.gain.value = st.set.phones ? 0.9 : 0.7; ms.connect(mg); mg.connect(c.destination); ms.start(t0, startPos); vidGo(startPos, t0); if (vidOn()) { try { $('ul-vidw').scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {} }
      var lock = null; try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function (l) { lock = l; }, function () {}); } catch (e) {}
      rec = { cap: cap, t0: t0, startPos: startPos, ms: ms, done: false, mic: micNow };
      document.body.classList.add('ul-recording'); $('ul-rec').hidden = true; $('ul-stop').hidden = false; $('ul-stage').hidden = false; showWords();
      var cnt = $('ul-cnt'), raf, tm, clip = 0;
      function tick() {
        if (!rec || rec.done) return;
        var now = c.currentTime, t = now - t0, left = pos ? pre - t : -t;
        if (left > 0.05) { cnt.hidden = false; cnt.textContent = pos ? 'מתחילים לשיר בעוד ' + Math.ceil(left) : String(Math.max(1, Math.ceil(left / 0.8))); } else cnt.hidden = true;
        head = Math.max(0, startPos + Math.max(0, t)); draw(); if (t > 0.3) vidFix(head);
        var p = cap.peak(); if (p > 0.97) clip++; $('ul-lvl').style.width = Math.min(100, Math.round(Math.sqrt(p) * 100)) + '%';
        if (head >= music.dur - 0.02) { finish(); return; }
        raf = requestAnimationFrame(tick); clearTimeout(tm); tm = setTimeout(tick, 60);
      }
      function finish() {
        if (!rec || rec.done) return; rec.done = true; cancelAnimationFrame(raf); clearTimeout(tm);
        try { ms.stop(); } catch (e) {} vidStop(); if (lock) { try { lock.release(); } catch (e) {} }
        var sungFor = c.currentTime - t0 - pre;
        setTimeout(function () { // עוד רגע של הקלטה, כדי לא לחתוך את סוף המילה (וגם את האיחור של המכשיר)
          cap.stop().then(function (r) {
            document.body.classList.remove('ul-recording'); $('ul-rec').hidden = false; $('ul-stop').hidden = true; $('ul-stage').hidden = true; cnt.hidden = true; $('ul-lvl').style.width = '0';
            var i0 = Math.round(t0 * sr) - r.first, startPosNow = rec.startPos, mic = rec.mic; rec = null;
            if (sungFor < 1.5 || r.data.length - i0 < sr) { msg('ההקלטה קצרה מדי. מנסים שוב.'); draw(); return; }
            var data = i0 >= 0 ? r.data.subarray(i0) : (function () { var y = new Float32Array(r.data.length - i0); y.set(r.data, -i0); return y; })();
            addTake(data, Math.round(startPosNow * sr), clip > 8, mic);
          });
        }, 450);
      }
      rec.finish = finish; tick();
    }, function (e) {
      busy = false; var m = e && (e.name || e.message);
      msg(m === 'nomic' ? 'הדפדפן הזה לא נותן להקליט. מנסים בכרום.' : m === 'NotAllowedError' ? 'אין גישה למיקרופון. מאשרים אותו בהגדרות הדפדפן (המנעול ליד הכתובת) ומנסים שוב.' : 'לא הצלחתי לפתוח את המיקרופון. (' + (m || '') + ')');
    });
  }
  function toPcm(x) { var p = new Int16Array(x.length); for (var i = 0; i < x.length; i++) { var s = x[i]; s = s > 1 ? 1 : s < -1 ? -1 : s; p[i] = s < 0 ? s * 0x8000 : s * 0x7fff; } return p; }
  function addTake(data, startS, clipped, mic) {
    var t = { id: S.uid(), startS: startS, n: data.length, on: true, mic: mic || null }; pcmOf[t.id] = toPcm(data); takes.push(t);
    dbPut('take:' + t.id, { pcm: pcmOf[t.id] }); head = startS / sr; drawTakes();
    processTake(t, data).then(function () {
      used('rec_done');
      var m = t.a == null ? 'לא שמעתי שירה בהקלטה. בודקים שהמיקרופון פתוח, ומנסים שוב.' : t.mode === 'bleed' ? 'מוכן! הקול סונכרן לבד למוזיקה ונוקה. לוחצים "לשמוע את השיר".' : t.stat && t.stat.sync === 'mel' ? 'מוכן! הקול סונכרן לבד לפי המנגינה של השיר. לוחצים "לשמוע את השיר".' : offerCal() ? 'מוכן! לוחצים "לשמוע את השיר". אוזניות בלוטות\' מאחרות אחרי המוזיקה: כדי שהקול יישב בדיוק, לוחצים "למדוד עכשיו" (בדיקה של 5 שניות).' : 'מוכן! לוחצים "לשמוע את השיר". אם הקול לא יושב בדיוק על המוזיקה – מזיזים ב"סנכרון" למטה.';
      if (clipped) m += st.set.phones ? ' ההקלטה יצאה חזקה מדי – בפעם הבאה מרחיקים קצת את הטלפון מהפה.' : ' ההקלטה יצאה חזקה מדי – מנמיכים את עוצמת הטלפון ומקליטים שוב.';
      else if (t.mode === 'bleed' && t.stat && t.stat.bleedDb > -2.5 && t.a != null) m += ' המוזיקה נכנסה חזק למיקרופון. לקול נקי יותר: מנמיכים קצת את העוצמה, או שרים עם אוזניות.';
      if (!st.set.phones && t.mode !== 'bleed') m += ' לא שמעתי את המוזיקה בהקלטה – אם שרתם עם אוזניות, מסמנים "עם אוזניות".';
      return micNote(t).then(function (x) { msg(isNarrow(t) ? x.trim() : m + x); chips(); drawTakes(); });
    });
  }
  // סנכרון + ניקוי (שלב א'), ואז קצב + זיופים (שלב ב')
  function processTake(t, data) {
    busy = true; msg('מסנכרן את הקול למוזיקה ומנקה…'); prog(0);
    var o = { noise: st.set.noise, bleed: 2, lagGuess: Math.round(guessLat() * sr), trust: calMs() != null };
    if (calKey() === 'bt' && calMs() == null) { o.melMin = 2; o.melLo = -22; o.melHi = 14; } // בלוטות' שלא נמדד: הניחוש (200) באמצע הטווח, אז בשיר מהאתר מחפשים לפי המנגינה לשני הצדדים
    if (t.lag != null) { o.lagFixed = t.lag; o.speaker = t.mode === 'bleed'; }
    data = data || f32(pcmOf[t.id], 0, t.n);
    return work({ cmd: 'clean', take: t.id, rec: data, start: t.startS, o: o }, [data.buffer], function (p) { prog(p * 0.8); }).then(function (r) {
      if (t.lag == null) { t.mode = r.mode; t.lag = r.lag; t.lagMs = r.lagMs; if (r.mode === 'bleed' && r.lagMs > 0 && r.lagMs < 900 && calKey() !== 'bt') { st.cal[calKey()] = r.lagMs; } }
      t.stat = r; return finishTake(t);
    }).then(function () { busy = false; prog(null); save(); }, function (e) { busy = false; prog(null); msg('משהו נכשל בעיבוד. מנסים שוב. (' + (e && e.message || '') + ')'); });
  }
  function finishTake(t) {
    return work({ cmd: 'finish', take: t.id, o: { tight: st.set.tight, tune: st.set.tune, shiftS: Math.round(st.set.off / 1000 * sr) } }).then(function (r) {
      t.y = r.y; t.ph = r.phrases; t.notes = r.notes; t.cents = r.cents; t.moved = r.moved; t.mel = r.mel || 0; t.split = r.split || 0;
      if (r.phrases.length) { t.a = Math.max(0, r.phrases[0].a - 0.12); t.b = Math.min(t.n / sr, r.phrases[r.phrases.length - 1].b + 0.3); } else { t.a = t.b = null; }
      comp = {}; draw(); drawTakes();
    });
  }
  function refinish(label) { // אחרי שינוי בהגדרת קצב / זיופים / סנכרון
    if (!takes.length || busy) return Promise.resolve(); busy = true; msg(label || 'מעדכן…'); var was = player && player.mode; stopAll();
    return takes.reduce(function (p, t) { return p.then(function () { return finishTake(t); }); }, Promise.resolve()).then(function () { busy = false; msg(''); save(); if (was) play(was); }, function () { busy = false; msg('משהו נכשל. מנסים שוב.'); });
  }
  function reclean() { // אחרי שינוי ברמת הניקוי
    if (!takes.length || busy) return; stopAll();
    takes.reduce(function (p, t) { return p.then(function () { return processTake(t); }); }, Promise.resolve()).then(function () { msg(''); });
  }
  function drawTakes() {
    var box = $('ul-takes'); $('ul-s3').hidden = $('ul-s4').hidden = !takes.length;
    if (!takes.length) { box.innerHTML = ''; return; }
    box.innerHTML = takes.map(function (t, i) {
      var a = t.startS / sr + (t.a || 0), b = t.startS / sr + (t.b || t.n / sr), info = t.y ? (t.a == null ? 'בלי שירה' : (t.mode === 'bleed' ? '✓ סונכרן לבד' : '✓ מוכן') + (t.notes && st.set.tune ? ' · ' + (t.notes === 1 ? 'תו אחד כוון' : t.notes + ' תווים כוונו') + (t.mel ? (t.mel === 1 ? ', אחד מהם הוחזר למנגינה' : ', ' + t.mel + ' מהם הוחזרו למנגינה') : '') : '') + (t.moved ? ' · ' + (t.moved === 1 ? 'משפט אחד יושר לקצב' : t.moved + ' משפטים יושרו לקצב') : '') + (isNarrow(t) ? ' · ⚠ נשמע כמו שיחת טלפון' : '')) : 'מעבד…';
      return '<div class="pr' + (t.on ? '' : ' off') + '" data-id="' + esc(t.id) + '"><div><b>הקלטה ' + (i + 1) + '</b> <span class="ul-tt" dir="ltr">' + fmt(a) + '–' + fmt(b) + '</span><br><span class="ok">' + info + '</span></div><div class="ul-tb"><button class="shr-mini" type="button" data-act="play">▶ לשמוע</button><button class="shr-mini" type="button" data-act="del" aria-label="למחוק את ההקלטה">🗑</button></div></div>';
    }).join('');
  }

  // ---------- בדיקת סנכרון לאוזניות ----------
  function calibrate() {
    if (busy || rec) return; stopAll(); var c = wake(); busy = true; msg('מקרבים את האוזנייה למיקרופון של הטלפון… מודד.');
    getMic().then(capture).then(function (cap) {
      var n = Math.round(sr * 2), nb = c.createBuffer(1, n, sr), d = nb.getChannelData(0), lp = 0;
      for (var i = 0; i < n; i++) { lp += 0.35 * ((Math.random() * 2 - 1) - lp); d[i] = lp * 1.2 * Math.min(1, i / 2000, (n - i) / 2000); }
      var s = c.createBufferSource(); s.buffer = nb; s.connect(c.destination); var t0 = c.currentTime + 0.3; s.start(t0);
      setTimeout(function () {
        cap.stop().then(function (r) {
          var i0 = Math.max(0, Math.round(t0 * sr) - r.first), data = r.data.slice(i0), ref = new Float32Array(data.length); ref.set(d.subarray(0, Math.min(n, ref.length)));
          return work({ cmd: 'lag', rec: data, ref: ref, sr: sr, lo: -0.02, hi: 0.7 }, [data.buffer, ref.buffer]);
        }).then(function (g) {
          busy = false; var ms = Math.round(g.lag / sr * 1000);
          if (g.z < 8 || ms < 0) { msg('לא שמעתי את הצליל. מקרבים את האוזנייה ממש למיקרופון (בתחתית הטלפון), מגבירים, ומנסים שוב.'); return; }
          st.cal[st.set.phones ? calKey() : 'phones'] = ms; st.set.off = 0; $('ul-off').value = 0; chips(); save(); used('calibrate');
          var gs = takes.filter(function (t) { return t.mode !== 'bleed'; }); gs.forEach(function (t) { t.lag = Math.round(ms / 1000 * sr); t.lagMs = ms; });
          msg('נמדד: האוזניות מאחרות ב-' + ms + ' אלפיות שנייה. מעכשיו הקול יסונכרן לפי זה.');
          if (gs.length) gs.reduce(function (p, t) { return p.then(function () { return processTake(t); }); }, Promise.resolve());
        }, function () { busy = false; msg('המדידה נכשלה. מנסים שוב.'); });
      }, 2900);
    }, function () { busy = false; msg('אין גישה למיקרופון.'); });
  }

  // ---------- 4. השיר המוכן ----------
  function render(mode) {
    return (mode === 'final' ? prepBack() : Promise.resolve()).then(function () {
      var len = Math.ceil((music.dur + 1.2) * sr), oc = new OfflineAudioContext(2, len, sr); graph(oc, oc.destination, 0, 0, mode);
      return oc.startRendering();
    }).then(function (ab) {
      var pk = 0, c, i, d; for (c = 0; c < 2; c++) { d = ab.getChannelData(c); for (i = 0; i < d.length; i += 2) { var v = Math.abs(d[i]); if (v > pk) pk = v; } }
      var g = pk > 0 ? Math.min(3, 0.95 / pk) : 1; for (c = 0; c < 2; c++) { d = ab.getChannelData(c); for (i = 0; i < d.length; i++) d[i] *= g; }
      return ab;
    });
  }
  function fileName(suf, ext) { return (music.name || 'השיר שלי').replace(/[\\/:*?"<>|]/g, '').slice(0, 60) + (suf ? ' - ' + suf : '') + '.' + ext; }
  function makeMp3() {
    if (busy || !music) return; if (!takes.some(function (t) { return t.on && t.a != null; })) { msg('עוד אין הקלטה. קודם שרים.'); return; }
    stopAll(); busy = true; msg('מערבב את הקול עם המוזיקה ומכין קובץ…'); prog(0.05); used('mp3');
    render('final').then(function (ab) {
      var ch = [new Float32Array(ab.getChannelData(0)), new Float32Array(ab.getChannelData(1))];
      return work({ cmd: 'mp3', chans: ch, sr: ab.sampleRate, kbps: 160 }, [ch[0].buffer, ch[1].buffer], function (p) { prog(0.1 + 0.9 * p); }).then(function (d) { return { blob: d.blob, dur: ab.duration }; });
    }).then(function (r) {
      busy = false; prog(null); msg('השיר מוכן! אפשר להוריד ולשתף.'); offer(r.blob, fileName('', 'mp3'));
      if (music.kind === 'song' && music.songId) saveForClip(music.songId, r.blob, r.dur);
    }, function (e) { busy = false; prog(null); msg('משהו נכשל בהכנת הקובץ. מנסים שוב. (' + (e && e.message || '') + ')'); });
  }
  function saveForClip(id, blob, dur) { // אותו מקום שבו "מקליטים ושרים" שומר, כדי שהקליפ ימצא את השיר
    try { var r = indexedDB.open('shir', 1); r.onupgradeneeded = function () { r.result.createObjectStore('rec'); }; r.onsuccess = function () { try { r.result.transaction('rec', 'readwrite').objectStore('rec').put({ blob: blob, kind: 'voice', dur: dur, at: Date.now() }, 'mix:' + id); $('ul-clip').hidden = false; } catch (e) {} }; } catch (e) {}
  }
  function offer(blob, name) {
    var url = URL.createObjectURL(blob), file = null; try { file = new File([blob], name, { type: 'audio/mpeg' }); } catch (e) {}
    var can = file && navigator.canShare && navigator.canShare({ files: [file] });
    $('ul-file-out').innerHTML = '<audio controls src="' + url + '" style="width:100%;margin-top:.6rem"></audio><div class="share-row" style="justify-content:flex-start"><a class="btn btn-gold btn-sm" href="' + url + '" download="' + esc(name) + '" id="ul-dl">⬇ להוריד MP3</a>' + (can ? '<button class="btn btn-line btn-sm" type="button" id="ul-share">לשתף</button>' : '') + '</div>';
    $('ul-dl').onclick = function () { used('download'); };
    if (can) $('ul-share').onclick = function () { used('share'); navigator.share({ files: [file], title: music.name || 'השיר שלי' }).catch(function () {}); };
  }
  function wav(x) { var n = x.length, b = new ArrayBuffer(44 + n * 2), v = new DataView(b), i; function w(o, s) { for (var j = 0; j < s.length; j++) v.setUint8(o + j, s.charCodeAt(j)); } w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true); for (i = 0; i < n; i++) { var s = x[i]; s = s > 1 ? 1 : s < -1 ? -1 : s; v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true); } return new Blob([b], { type: 'audio/wav' }); }
  function dl(blob, name) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { a.remove(); }, 500); }

  // ---------- כפתורים ----------
  function chips() {
    var s = st.set;
    [['ul-phones', s.phones], ['ul-noise', s.noise], ['ul-tight', s.tight], ['ul-tune', s.tune], ['ul-style', s.style], ['ul-voice2', s.voice2], ['ul-v2where', s.v2cho ? 1 : 0]].forEach(function (p) { [].forEach.call($(p[0]).children, function (b) { b.classList.toggle('on', b.getAttribute('data-v') === String(p[1])); }); });
    $('ul-offv').textContent = (s.off > 0 ? 'מקדימים את הקול ב-' + s.off : s.off < 0 ? 'מאחרים את הקול ב-' + (-s.off) : '0') + ' אלפיות שנייה';
    $('ul-ph-hint').textContent = !s.phones ? 'אפשר גם בלי: האולפן מוריד מההקלטה את המוזיקה שנכנסה למיקרופון. מנגנים בעוצמה בינונית.'
      : bt.manual ? 'בחרתם במיקרופון של אוזניות הבלוטות\': הקול יישמע כמו בשיחת טלפון. לקול מלא בוחרים ב"סנכרון ומיקרופון" את "האולפן בוחר לבד".'
      : bt.auto ? '🎧 זיהיתי אוזניות בלוטות\'. מקליט מהמיקרופון של הטלפון, כי המיקרופון של האוזניות נשמע כמו שיחת טלפון.'
      : bt.only ? '🎧 זיהיתי אוזניות בלוטות\', ואין מיקרופון אחר: הקול יישמע כמו בשיחת טלפון. לקול מלא שרים עם אוזניות חוט או בלי אוזניות.'
      : bt.on ? '🎧 זיהיתי אוזניות בלוטות\'. מקליט מהמיקרופון של הטלפון.'
      : 'הכי נקי. אוזניות עם חוט עדיפות על בלוטות\'.';
    var th = $('ul-tune-hint'); if (th) th.hidden = !(music && music.mel);
    $('ul-v2where').hidden = !(music && music.cho) || !s.voice2 || s.voice2 === 'off';
    var last = takes[takes.length - 1], btc = !!s.phones && bt.on;
    $('ul-calw').hidden = !s.phones; $('ul-calnote').hidden = !s.phones || calMs() != null || (btc && !!last && (last.mode === 'bleed' || !!(last.stat && last.stat.sync === 'mel'))); // כבר סונכרן לבד
    $('ul-calt').textContent = btc ? 'אוזניות בלוטות\': בדיקת סנכרון של 5 שניות' : 'פעם אחת, 5 שניות: בדיקת סנכרון';
    $('ul-cald').textContent = (btc ? 'אוזניות בלוטות\' משמיעות את המוזיקה באיחור.' : 'אוזניות משמיעות את המוזיקה באיחור קטן.') + ' מקרבים אוזנייה אחת ממש למיקרופון שבתחתית הטלפון ולוחצים. יישמע רעש קצר, ומעכשיו הקול יישב בדיוק על המוזיקה.';
    $('ul-btcal').hidden = !offerCal();
    $('ul-mic-hint').textContent = bt.auto ? 'מחוברות אוזניות בלוטות\', אז האולפן מקליט מ: ' + bt.auto + '.' : 'כשמחוברות אוזניות בלוטות\', האולפן עובר לבד למיקרופון של הטלפון.';
  }
  function chipGroup(id, key, num, after) { $(id).onclick = function (e) { var b = e.target.closest('[data-v]'); if (!b || busy) return; var v = b.getAttribute('data-v'); st.set[key] = num ? +v : v; chips(); save(); used(key); if (after) after(); }; }
  function init() {
    try { var o = JSON.parse(localStorage.getItem(LS) || 'null'); if (o && o.set) { for (var k in o.set) st.set[k] = o.set[k]; st.cal = o.cal || {}; st.words = o.words || ''; st.wordsOf = o.wordsOf; st.src = o.src || null; st.takes = o.takes || []; } } catch (e) {}
    ctx(); drawSongs(); $('ul-words').value = st.words; $('ul-off').value = st.set.off; $('ul-bal').value = st.set.bal; chips(); showWords();
    chipGroup('ul-phones', 'phones', 1);
    chipGroup('ul-noise', 'noise', 1, reclean);
    chipGroup('ul-tight', 'tight', 1, function () { refinish('מיישר לקצב…'); });
    chipGroup('ul-tune', 'tune', 1, function () { refinish('מכוון את הקול…'); });
    chipGroup('ul-style', 'style', 0, function () { if (player && player.mode !== 'none') play(player.mode); });
    function hearBack() { // שומעים מיד את ההבדל
      if (!takes.length) return; var on = player && player.mode !== 'none';
      if (!on) { stopAll(); var t = takes[takes.length - 1]; head = Math.max(0, t.startS / sr + (t.a || 0) - 0.5); }
      play('final');
    }
    chipGroup('ul-voice2', 'voice2', 0, hearBack);
    chipGroup('ul-v2where', 'v2cho', 1, hearBack);
    $('ul-src').onclick = function (e) {
      var b = e.target.closest('[data-v]'); if (!b || busy || rec) return;
      if (b.getAttribute('data-v') === 'file' || b.getAttribute('data-v') === 'karaoke') { if (b.getAttribute('data-v') === 'karaoke') { used('music_karaoke'); $('ul-karhelp').hidden = false; } $('ul-file').click(); } else if (!music || music.kind !== 'song') { if (okToReplace()) { used('music_song'); loadSong(); } } else $('ul-songs').hidden = false;
    };
    $('ul-file').onchange = function () { var f = this.files && this.files[0]; this.value = ''; if (f && okToReplace()) loadFile(f); };
    $('ul-songs').onchange = function () { if (busy || rec) return; if (okToReplace()) { used('music_song'); loadSong(this.value); } else drawSongs(); };
    var cv = $('ul-cv'); cv.addEventListener('click', seekEv);
    $('ul-play').onclick = function () { if (player) stopAll(); else play('none'); };
    $('ul-rw').onclick = function () { var was = player && player.mode; stopAll(); head = 0; draw(); if (was) play(was); };
    $('ul-rec').onclick = record; $('ul-stop').onclick = function () { if (rec && rec.finish) rec.finish(); };
    $('ul-words').oninput = function () { st.words = this.value; st.wordsOf = st.src && st.src.id; showWords(); save(); };
    $('ul-takes').onclick = function (e) {
      var b = e.target.closest('[data-act]'), row = e.target.closest('[data-id]'); if (!b || !row || busy || rec) return;
      var id = row.getAttribute('data-id'), t = takes.filter(function (x) { return x.id === id; })[0]; if (!t) return;
      if (b.getAttribute('data-act') === 'play') { stopAll(); head = Math.max(0, t.startS / sr + (t.a || 0) - 1); play('final'); }
      else if (window.confirm('למחוק את ההקלטה הזאת?')) { stopAll(); takes = takes.filter(function (x) { return x !== t; }); delete pcmOf[id]; dbDel('take:' + id); work({ cmd: 'drop', take: id }).catch(function () {}); comp = {}; draw(); drawTakes(); save(); used('take_del'); }
    };
    $('ul-listen').onclick = function () { if (player && player.mode !== 'none') { stopAll(); return; } if (busy) return; used('listen'); if (head > music.dur - 2) head = 0; play('final'); };
    $('ul-ab').onclick = function () {
      if (busy || !takes.length) return; var next = player && player.mode === 'final' ? 'raw' : 'final', t = takes[takes.length - 1]; stopAll(); used('ab');
      head = Math.max(0, t.startS / sr + (t.a || 0) - 0.5); play(next); msg(next === 'raw' ? 'עכשיו: לפני – ההקלטה כמו שהיא. לוחצים שוב לשמוע אחרי.' : 'עכשיו: אחרי – נקי, מיושר ומכוון. לוחצים שוב לשמוע לפני.');
    };
    $('ul-bal').oninput = function () { st.set.bal = +this.value; save(); };
    $('ul-bal').onchange = function () { used('bal'); if (player && player.mode !== 'none') play(player.mode); };
    $('ul-off').oninput = function () { st.set.off = +this.value; chips(); };
    $('ul-off').onchange = function () { save(); used('off'); refinish('מזיז את הקול…').then(function () { if (!player && takes.length) { var t = takes[takes.length - 1]; head = Math.max(0, t.startS / sr + (t.a || 0) - 0.5); play('final'); } }); };
    $('ul-cal').onclick = calibrate; $('ul-cal2').onclick = calibrate; $('ul-cal3').onclick = calibrate;
    $('ul-mic').onchange = function () { st.set.mic = this.value; bt.avoid = []; save(); refreshMics(); };
    $('ul-mp3').onclick = makeMp3;
    $('ul-wav').onclick = function () { if (!takes.length || busy) return; used('wav'); dl(wav(composite('final').v), fileName('הקול בלבד', 'wav')); };
    $('ul-rawdl').onclick = function () { if (!takes.length || busy) return; used('raw'); dl(wav(composite('raw').v), fileName('ההקלטה המקורית', 'wav')); };
    window.addEventListener('resize', draw);
    refreshMics(); // אם כבר אישרו מיקרופון בעבר, יודעים מיד אילו אוזניות מחוברות
    try { navigator.mediaDevices.addEventListener('devicechange', function () { if (!rec) refreshMics(); }); } catch (e) {}
    restore();
  }
  // פותחים מאיפה שהפסקנו: המוזיקה וההקלטות נשמרות בטלפון
  function restore() {
    var src = st.src, p, savedTakes = st.takes || [];
    if (src && src.kind === 'file') p = dbGet('music').then(function (m) { return m && m.blob ? loadFile(new File([m.blob], m.name || 'מוזיקה', { type: m.blob.type || '' }), true) : loadSong(null, true); });
    else p = loadSong(src && src.id, true);
    p.then(function () {
      var saved = savedTakes.filter(function (t) { return t.sr === sr; }); if (!music || !saved.length) return;
      msg('מחזיר את ההקלטות שלכם…');
      return saved.reduce(function (q, s) {
        return q.then(function () { return dbGet('take:' + s.id); }).then(function (r) {
          if (!r || !r.pcm) return; var t = { id: s.id, startS: s.startS, n: r.pcm.length, mode: s.mode, lag: s.lag, lagMs: s.lagMs, on: s.on !== false }; pcmOf[t.id] = r.pcm; takes.push(t); drawTakes(); return processTake(t);
        });
      }, Promise.resolve()).then(function () { msg(''); });
    });
  }
  window.__ulpan = { ctx: ctx, st: st, takes: function () { return takes; }, music: function () { return music; }, addTake: addTake, render: render, graph: graph, composite: composite, prepBack: prepBack, back: function () { return comp.back || null; }, sr: function () { return sr; }, busy: function () { return busy; }, bt: function () { return bt; }, mic: function () { return micNow; }, scanMics: scanMics, micKind: micKind };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
