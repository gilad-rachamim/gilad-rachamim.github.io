// "השיר שלי" – קליפ לשיר: תמונות לפי הנושא (או של האדם), זום איטי ומעבר רך בכל חלק, כתוביות שנצבעות הברה-הברה,
// פתיחה עם שם השיר, שקף חתימה, הקלטה ל-MP4/WebM עם פס הקול של השיר, שיתוף ויוטיוב.
// משתמש ב-KVideo (assets/video-engine.js) רק לבחירת פורמט, לגופנים ולקרדיטים – בלי לשנות אותו.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  if (!$('sc-cv') || !window.Shir || !window.Shir.M) return;
  var S = window.Shir, M = S.M, TOOL = 'shir_clip', esc = S.esc, KV = window.KVideo || {};
  var cv = $('sc-cv'), g = cv.getContext('2d');
  var song, tl, audio = null, srcKind = '', imgs = [], slides = [], playing = null, busy = false, lastBlob = null, myPics = [];
  function used(how) { S.used(TOOL, how); }
  function msg(t) { $('sc-msg').textContent = t || ''; }
  function st() { song.clip = song.clip || { fmt: 'v', pics: 'auto', sign: 1 }; return song.clip; }

  // ---------- IndexedDB (אותו מסד של ההקלטה) ----------
  var dbp = null;
  function idb() { if (!dbp) dbp = new Promise(function (res, rej) { var r = indexedDB.open('shir', 1); r.onupgradeneeded = function () { r.result.createObjectStore('rec'); }; r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; }); return dbp; }
  function dbDo(mode, fn) { return idb().then(function (db) { return new Promise(function (res, rej) { var tx = db.transaction('rec', mode), q = fn(tx.objectStore('rec')); tx.oncomplete = function () { res(q && q.result); }; tx.onerror = function () { rej(tx.error); }; }); }); }
  function dbGet(k) { return dbDo('readonly', function (s) { return s.get(k); }).catch(function () { return null; }); }
  function dbPut(k, v) { return dbDo('readwrite', function (s) { return s.put(v, k); }).catch(function () {}); }

  // ---------- תמונות לפי הנושא ----------
  var CATS = { apples: 2, beach: 2, bird: 3, books: 1, butterfly: 1, candles: 2, cat: 3, challah: 2, desert: 4, duck: 2, flowers: 2, garden: 2, house: 2, jeru: 2, kite: 3, kotel: 3, lamb: 3, light: 3, moon: 3, mount: 4, olive: 2, path: 2, rainbow: 3, sea: 4, stars: 2, sunset: 4, teddy: 2, torah: 3, wheat: 3 };
  var KEYS = [[/ים|גל|חוף|מים/, ['sea', 'beach']], [/לילה|ירח|כוכב|חלום|שינה/, ['moon', 'stars']], [/בוקר|אור|שמש|זריחה/, ['light', 'sunset']], [/ירושלים|עיר/, ['jeru', 'kotel']], [/כותל|תפיל|אלוק|ה'|השם|ריבונו/, ['kotel', 'candles', 'torah']],
    [/הר|פסגה|טיפוס/, ['mount']], [/מדבר|חול/, ['desert']], [/פרח|אביב|גן/, ['flowers', 'garden']], [/ילד|משחק|ילדות/, ['kite', 'teddy', 'butterfly']], [/אמא|אבא|בית|משפחה/, ['house', 'challah']],
    [/שבת|נרות/, ['candles', 'challah']], [/דרך|שביל|הליכה|צעד/, ['path']], [/תורה|לימוד|ספר/, ['torah', 'books']], [/שדה|קציר|תודה/, ['wheat']], [/ציפור|לעוף|כנפ/, ['bird', 'butterfly']], [/קשת|תקווה/, ['rainbow']], [/שקיעה|ערב|געגוע/, ['sunset']]];
  var MOOD = { 'שמח': ['flowers', 'rainbow', 'kite', 'garden'], 'שקט': ['sea', 'olive', 'path'], 'געגוע': ['path', 'sunset', 'moon'], 'תודה': ['wheat', 'light', 'flowers'], 'תפילה': ['kotel', 'candles', 'jeru'],
    'כוח': ['mount', 'desert', 'light'], 'אהבה': ['flowers', 'sunset', 'garden'], 'תקווה': ['light', 'rainbow', 'path'], 'לילדים': ['kite', 'butterfly', 'duck', 'teddy'] };
  function pickCats() {
    // קודם הנושא והשם, אחר כך התשובות – כך "בוקר חדש" מקבל אור לפני "לילות בלי שינה"
    var main = [song.topic, song.title].join(' '), more = Object.keys(song.answers || {}).map(function (k) { return song.answers[k]; }).join(' '), out = [];
    [main, more].forEach(function (text) { KEYS.forEach(function (k) { if (k[0].test(text)) k[1].forEach(function (c) { if (out.indexOf(c) < 0) out.push(c); }); }); });
    (MOOD[song.mood] || ['light', 'sea', 'path', 'flowers']).forEach(function (c) { if (out.indexOf(c) < 0) out.push(c); });
    return out;
  }
  function autoFiles(n) {
    var cats = pickCats(), files = [], used2 = {}, i = 0, guard = 0;
    while (files.length < n && guard++ < 200) {
      var c = cats[i % cats.length], k = (used2[c] || 0) + 1; i++;
      if (k > CATS[c]) { if (Object.keys(used2).every(function (x) { return used2[x] >= CATS[x]; })) used2 = {}; continue; }
      used2[c] = k; files.push('/assets/video/' + c + '-' + k + '.jpg');
    }
    return files;
  }
  function loadImg(src) { return new Promise(function (res) { var im = new Image(); im.onload = function () { res(im); }; im.onerror = function () { res(null); }; im.src = src; }); }

  // ---------- שקופיות: פתיחה, חלק לכל מופע, סיום ----------
  function buildSlides() {
    var occ = [], cur = null;
    tl.lines.forEach(function (l) { if (cur && cur.occ === l.occ) cur.t1 = l.t1; else { cur = { occ: l.occ, t0: l.tb, t1: l.t1 }; occ.push(cur); } });
    slides = [{ t0: 0, t1: occ.length ? occ[0].t0 : tl.total, kind: 'title' }];
    occ.forEach(function (o) { slides.push({ t0: o.t0, t1: o.t1, kind: 'part' }); });
    slides.push({ t0: occ.length ? occ[occ.length - 1].t1 : 0, t1: total() + 1, kind: 'end' });
    slides.forEach(function (s, i) { s.img = imgs.length ? imgs[i % imgs.length] : null; });
  }
  function total() { return (audio ? audio.duration : tl.total) + (st().sign ? 1.6 : 0.3); }

  // ---------- ציור ----------
  var W = 720, H = 1280;
  function size() { var h = st().fmt === 'h'; W = h ? 1280 : 720; H = h ? 720 : 1280; cv.width = W; cv.height = H; $('sc-stage').classList.toggle('wide', h); }
  function cover(im, z, px, py, alpha) {
    if (!im) return; var r = Math.max(W / im.width, H / im.height) * z, w = im.width * r, h = im.height * r;
    g.globalAlpha = alpha; g.drawImage(im, (W - w) / 2 + px * (w - W) / 2, (H - h) / 2 + py * (h - H) / 2, w, h); g.globalAlpha = 1;
  }
  function slideAt(t) { for (var i = slides.length - 1; i >= 0; i--) if (t >= slides[i].t0) return i; return 0; }
  function font(px, serif) { return (serif ? '700 ' : '600 ') + px + 'px ' + (serif ? '"Frank Ruhl Libre", serif' : '"Assistant", sans-serif'); }
  function shadowText(txt, x, y, color) { g.fillStyle = 'rgba(0,0,0,.55)'; g.fillText(txt, x + 2, y + 3); g.fillStyle = color; g.fillText(txt, x, y); }
  function lineAt(t) { for (var k = 0; k < tl.lines.length; k++) if (t >= tl.lines[k].tb - 0.35 && t < tl.lines[k].t1 - 0.05) return k; return -1; }
  function lineText(L) { return L.syls.map(function (s) { return s.s + (s.last ? ' ' : ''); }).join('').trim(); }
  var drawn = { line: -1, slide: 0 };
  function draw(t) {
    var i = slideAt(t), s = slides[i], prev = slides[i - 1], dur = Math.max(1, s.t1 - s.t0), p = Math.min(1, Math.max(0, (t - s.t0) / dur));
    g.fillStyle = '#0b0f1a'; g.fillRect(0, 0, W, H);
    var dirx = i % 2 ? 1 : -1;
    if (prev && t - s.t0 < 0.9 && prev.img) { var pp = Math.min(1, (t - prev.t0) / Math.max(1, prev.t1 - prev.t0)); cover(prev.img, 1.04 + 0.1 * pp, -dirx * 0.3 * pp, 0, 1); }
    cover(s.img, 1.04 + 0.1 * p, dirx * 0.3 * p, 0.1 * p, prev && prev.img ? Math.min(1, (t - s.t0) / 0.9) : 1);
    // הכהיה עדינה בשביל הכתוביות
    var gr = g.createLinearGradient(0, H * 0.35, 0, H); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.62)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.direction = 'rtl'; g.textAlign = 'center'; g.textBaseline = 'middle';
    var base = Math.round(Math.min(W, H) * 0.068);
    if (s.kind === 'title' || (i === 1 && t - s.t0 < 0.6)) {
      var a = s.kind === 'title' ? Math.min(1, t / 0.6) : 1 - (t - s.t0) / 0.6;
      g.globalAlpha = Math.max(0, a); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 0, W, H);
      g.font = font(Math.round(base * 1.7), true); shadowText(song.title || 'השיר שלי', W / 2, H * 0.42, '#ffffff');
      var by = st().author || song.author; if (by) { g.font = font(Math.round(base * 0.8)); shadowText('מילים ולחן: ' + by, W / 2, H * 0.42 + base * 1.8, '#f1d58f'); }
      g.globalAlpha = 1;
    }
    if (s.kind === 'end' && st().sign && t > s.t0 + 0.3) {
      g.globalAlpha = Math.min(1, (t - s.t0 - 0.3) / 0.6); g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, 0, W, H);
      g.font = font(Math.round(base * 0.85)); shadowText('נוצר ב"השיר שלי"', W / 2, H * 0.47, '#ffffff');
      g.font = font(Math.round(base * 0.6)); shadowText('הכלים של גילעד רחמים', W / 2, H * 0.47 + base * 1.2, '#f1d58f');
      g.globalAlpha = 1;
    }
    var k = lineAt(t); drawn.line = k; drawn.slide = i; drawn.t = t;
    if (k >= 0) {
      var L = tl.lines[k], txt = lineText(L), fs = base, y = st().fmt === 'h' ? H * 0.78 : H * 0.72;
      g.font = font(fs); var Wt = g.measureText(txt).width; while (Wt > W * 0.9 && fs > 22) { fs -= 2; g.font = font(fs); Wt = g.measureText(txt).width; }
      shadowText(txt, W / 2, y, '#ffffff');
      // הצביעה: מכסה מימין לשמאל עד ההברה שמושרת עכשיו (חלק יחסי בתוך ההברה)
      var pre = '', w = 0;
      for (var q = 0; q < L.syls.length; q++) {
        var sy = L.syls[q]; if (t < sy.t) break;
        var part = sy.s, frac = Math.min(1, (t - sy.t) / Math.max(0.08, sy.dur));
        var wPre = g.measureText(pre).width, wCur = g.measureText(pre + part).width;
        w = wPre + (wCur - wPre) * frac; pre += part + (sy.last ? ' ' : '');
      }
      if (w > 0) { g.save(); g.beginPath(); g.rect(W / 2 + Wt / 2 - w, y - fs, w + 2, fs * 2); g.clip(); g.fillStyle = '#f1c35a'; g.fillText(txt, W / 2, y); g.restore(); }
      var nx = tl.lines[k + 1];
      if (nx) { var f2 = Math.round(fs * 0.72); g.font = font(f2); var nt = lineText(nx); while (g.measureText(nt).width > W * 0.9 && f2 > 18) { f2 -= 2; g.font = font(f2); } shadowText(nt, W / 2, y + fs * 1.35, 'rgba(255,255,255,.55)'); }
    }
  }

  // ---------- שעון שממשיך גם ברקע (Worker + rAF) ----------
  var tickUrl = null;
  function ticker(fn0) {
    var done = false, last = 0, w = null;
    function fn() { var n = performance.now(); if (n - last < 28) return; last = n; fn0(); }
    try { if (!tickUrl) tickUrl = URL.createObjectURL(new Blob(['setInterval(function(){postMessage(0)},33)'], { type: 'text/javascript' })); w = new Worker(tickUrl); w.onmessage = function () { if (!done) fn(); }; } catch (e) { w = null; }
    var iv = w ? null : setInterval(function () { if (!done) fn(); }, 40);
    (function raf() { if (done) return; fn(); requestAnimationFrame(raf); })();
    return function () { done = true; if (w) w.terminate(); if (iv) clearInterval(iv); };
  }

  // ---------- פס קול ----------
  function prepareAudio() {
    return dbGet('mix:' + song.id).then(function (mix) {
      var exp = tl.total + 0.5;
      if (mix && mix.blob && Math.abs((mix.dur || 0) - exp) < 1.2) {
        srcKind = mix.kind === 'voice' ? 'השירה שלך' : 'קול מדגים';
        return mix.blob.arrayBuffer().then(function (b) { return M.ctx().decodeAudioData(b); });
      }
      srcKind = 'קול מדגים (עוד לא הוקלט שיר)';
      return M.renderOffline(tl, { lead: true, volume: 0.85 }, 44100);
    }).then(function (ab) { audio = ab; $('sc-src').innerHTML = 'פס הקול: <b>' + esc(srcKind) + '</b> · ' + Math.round(ab.duration) + ' שניות'; });
  }
  function prepareImgs() {
    var n = tl.lines.length ? new Set(tl.lines.map(function (l) { return l.occ; })).size + 2 : 2;
    var list = st().pics === 'mine' && myPics.length ? Promise.resolve(myPics.map(function (b) { return URL.createObjectURL(b); })) : Promise.resolve(autoFiles(n));
    return list.then(function (srcs) { return Promise.all(srcs.map(loadImg)); }).then(function (a) { imgs = a.filter(Boolean); buildSlides(); });
  }
  function prepare() {
    song = S.cur(); tl = M.timeline(song); size(); chips(); drawSongs(); msg('מכין…');
    audio = null;
    var first = function () { buildSlides(); draw(Math.min(1.2, tl.lines[0] ? tl.lines[0].tb * 0.6 : 0.5)); };
    // התמונה הראשונה מוצגת מיד, בלי לחכות לפס הקול
    var pImg = Promise.all([dbGet('pics:' + song.id).then(function (p) { myPics = (p && p.list) || []; picInfo(); }).then(prepareImgs), KV.fontsReady ? KV.fontsReady() : null]).then(first);
    return Promise.all([prepareAudio(), pImg])
      .then(function () { buildSlides(); draw(Math.min(1.2, tl.lines[0] ? tl.lines[0].tb * 0.6 : 0.5)); msg('הקליפ מוכן לתצוגה. לוחצים "ליצור את הקליפ".'); fillDesc(); });
  }

  // ---------- תצוגה מקדימה ----------
  function stopAll() { if (playing) { playing(); playing = null; } $('sc-stop').hidden = true; }
  function preview() {
    if (!audio) { msg('רגע, מכין את פס הקול…'); return; }
    stopAll(); var c = M.ctx(), src = c.createBufferSource(); src.buffer = audio; src.connect(c.destination);
    var t0 = c.currentTime + 0.1; src.start(t0);
    var stopT = ticker(function () { var t = c.currentTime - t0; draw(Math.max(0, t)); if (t > total()) stopAll(); });
    playing = function () { stopT(); try { src.stop(); } catch (e) {} }; $('sc-stop').hidden = false; used('preview');
  }

  // ---------- הקלטה ----------
  function record(onProgress) {
    var m = KV.mime ? KV.mime() : (window.MediaRecorder ? '' : null);
    if (m === null || !cv.captureStream) { msg('הדפדפן הזה לא יודע ליצור סרטון. נסו בכרום.'); return Promise.resolve(null); }
    stopAll(); draw(0);
    return new Promise(function (res) {
      var probe = cv.captureStream(0), vt = probe.getVideoTracks()[0], manual = !!(vt && vt.requestFrame);
      var stream = manual ? probe : cv.captureStream(30); if (!manual) probe.getTracks().forEach(function (tr) { tr.stop(); });
      var grab = manual ? function () { vt.requestFrame(); } : function () {};
      var a = new (window.AudioContext || window.webkitAudioContext)(), d = a.createMediaStreamDestination();
      try { var keep = a.createConstantSource(); keep.offset.value = 0; keep.connect(d); keep.start(); } catch (e) {}
      d.stream.getAudioTracks().forEach(function (tr) { stream.addTrack(tr); });
      var opt = { videoBitsPerSecond: 3000000, audioBitsPerSecond: 128000 }; if (m) opt.mimeType = m;
      var rec = new MediaRecorder(stream, opt), parts = [], ready = false, stopT = null, t0 = 0, src = null;
      rec.ondataavailable = function (e) { ready = true; if (e.data && e.data.size) parts.push(e.data); };
      rec.onstop = function () { var type = (rec.mimeType || m || 'video/webm').split(';')[0]; a.close(); res({ blob: new Blob(parts, { type: type }), ext: type.indexOf('mp4') > -1 ? 'mp4' : 'webm', tracks: stream.getTracks().length }); };
      // הקול והתמונה מתחילים יחד עם המקליט: שניהם על אותו שעון של הקובץ, אז גם אם הפריימים הראשונים
      // נבלעים במכשיר איטי – הכתוביות נשארות מסונכרנות, ואין שקט מיותר בהתחלה.
      rec.start(250); draw(0); grab();
      (function () {
        src = a.createBufferSource(); src.buffer = audio; src.connect(d); t0 = a.currentTime + 0.08; src.start(t0);
        stopT = ticker(function () {
          var t = Math.max(0, a.currentTime - t0); draw(t); grab(); onProgress && onProgress(Math.min(1, t / total()));
          if (t >= total()) { stopT(); playing = null; grab(); setTimeout(function () { rec.stop(); stream.getTracks().forEach(function (tr) { tr.stop(); }); }, 250); }
        });
        playing = function () { stopT(); try { src.stop(); } catch (e) {} if (rec.state !== 'inactive') rec.stop(); };
      })();
    });
  }
  function make() {
    if (busy) return; if (!audio) { msg('רגע, מכין את פס הקול…'); return; } busy = true; $('sc-result').hidden = true; $('sc-prog').hidden = false; var bar = $('sc-prog').firstChild;
    msg('יוצר את הקליפ… זה לוקח בדיוק כמו אורך השיר. אפשר להשאיר את הדף פתוח.'); used('make');
    $('sc-make').disabled = true;
    record(function (p) { bar.style.width = Math.round(p * 100) + '%'; }).then(function (r) {
      busy = false; $('sc-make').disabled = false; $('sc-prog').hidden = true; if (!r) return;
      lastBlob = r; window.__clipLast = r;
      var url = URL.createObjectURL(r.blob); $('sc-video').src = url; $('sc-dl').href = url; $('sc-dl').download = fileName();
      $('sc-result').hidden = false; msg('הקליפ מוכן! ' + (r.ext === 'mp4' ? 'MP4' : 'WebM') + ', ' + (r.blob.size / 1048576).toFixed(1) + ' MB.');
    });
  }
  function fileName() { return (song.title || 'השיר שלי').replace(/[\\/:*?"<>|]/g, '') + ' - קליפ.' + (lastBlob ? lastBlob.ext : 'mp4'); }
  function fillDesc() {
    var by = st().author || song.author;
    $('sc-desc').value = (song.title || 'השיר שלי') + (by ? ' – ' + by : '') + '\n\n' + (by ? 'מילים ולחן: ' + by + '\n\n' : '') + S.plain(song).replace(/\[|\]/g, '') + '\n\nנוצר בחינם ב"השיר שלי" – הכלים של גילעד רחמים: https://hakelim.com/kelim/shir/';
  }
  function copyDesc() { var t = $('sc-desc'); t.select(); try { navigator.clipboard.writeText(t.value); } catch (e) { try { document.execCommand('copy'); } catch (x) {} } }

  // ---------- הגדרות ----------
  function drawSongs() { $('sc-songs').innerHTML = S.list().map(function (s) { return '<option value="' + esc(s.id) + '"' + (s.id === song.id ? ' selected' : '') + '>' + esc(s.title || s.topic || 'שיר בלי שם') + '</option>'; }).join(''); }
  function chips() {
    [].forEach.call($('sc-fmt').children, function (b) { b.classList.toggle('on', b.getAttribute('data-v') === st().fmt); });
    [].forEach.call($('sc-picsrc').children, function (b) { b.classList.toggle('on', b.getAttribute('data-v') === st().pics); });
    $('sc-sign').checked = !!st().sign; $('sc-author').value = st().author || song.author || '';
  }
  function picInfo() { $('sc-picinfo').textContent = st().pics === 'mine' ? (myPics.length ? myPics.length + ' תמונות שלכם. לוחצים שוב על "התמונות שלי" כדי להחליף.' : 'בוחרים 1-8 תמונות.') : 'תמונות נבחרות לפי הנושא והאווירה של השיר.'; }
  $('sc-fmt').onclick = function (e) { var b = e.target.closest('[data-v]'); if (!b) return; stopAll(); st().fmt = b.getAttribute('data-v'); S.save(); size(); chips(); draw(1); used('fmt'); };
  $('sc-picsrc').onclick = function (e) {
    var b = e.target.closest('[data-v]'); if (!b) return; st().pics = b.getAttribute('data-v'); S.save(); chips(); picInfo();
    if (st().pics === 'mine') $('sc-files').click(); else prepareImgs().then(function () { draw(1); });
  };
  $('sc-files').onchange = function () {
    var fs = [].slice.call(this.files || [], 0, 8); if (!fs.length) return;
    myPics = fs; dbPut('pics:' + song.id, { list: fs }); used('my_pics'); picInfo(); prepareImgs().then(function () { draw(1); });
  };
  $('sc-author').oninput = function () { st().author = this.value; S.save(); draw(0.8); fillDesc(); };
  $('sc-sign').onchange = function () { st().sign = this.checked ? 1 : 0; S.save(); buildSlides(); };
  $('sc-make').onclick = make;
  $('sc-preview').onclick = preview;
  $('sc-stop').onclick = stopAll;
  $('sc-share').onclick = function () {
    if (!lastBlob) return; var f; try { f = new File([lastBlob.blob], fileName(), { type: lastBlob.blob.type }); } catch (e) {}
    used('share');
    if (f && navigator.canShare && navigator.canShare({ files: [f] })) navigator.share({ files: [f], title: song.title || 'השיר שלי', text: (song.title || '') }).catch(function () {});
    else { $('sc-dl').click(); msg('הקובץ ירד. עכשיו "להעלות ליוטיוב שלי", או שולחים אותו בווטסאפ.'); }
  };
  $('sc-dl').addEventListener('click', function () { used('download'); });
  $('sc-yt').onclick = function () { copyDesc(); used('yt'); window.open('https://www.youtube.com/upload', '_blank', 'noopener'); msg('הכותרת והתיאור הועתקו. ביוטיוב: בוחרים את הקובץ שירד, ומדביקים.'); };
  $('sc-copy').onclick = function () { copyDesc(); used('copy'); this.textContent = 'הועתק ✓'; };
  $('sc-songs').onchange = function () { stopAll(); S.select(this.value); used('switch'); prepare(); };
  if (KV.credits) KV.credits($('sc-credits'));

  window.__clip = { draw: draw, lineAt: lineAt, tl: function () { return tl; }, total: total, record: record, drawn: drawn, audio: function () { return audio; }, ready: null };
  window.__clip.ready = prepare();
})();
