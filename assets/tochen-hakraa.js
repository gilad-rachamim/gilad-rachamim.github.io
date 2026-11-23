/* הקראת טקסט בעברית בקול אנושי – /kelim/tochen/hakraa/
   קובץ PDF, Word או טקסט -> קטעים -> שרת הקול (kelim-hakraa) -> MP3 בדפדפן -> נשמר במכשיר (IndexedDB).
   הכול בנוי למקלדת ולקורא מסך: כפתורים אמיתיים, הודעות מצב קצרות, התקדמות שמוכרזת רק כל עשרה אחוזים. */
(function () {
  'use strict';
  var app = document.getElementById('hk-app');
  if (!app) return;
  function $(id) { return document.getElementById(id); }

  var API = 'https://kelim-hakraa.gilad4049.workers.dev';
  try { if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && localStorage.getItem('hk_hakraa_api')) API = localStorage.getItem('hk_hakraa_api'); } catch (e) {}
  var SEG = 1200, FIRST = 500, MAX_CHARS = 1500000;

  if (/[?&]embed=1/.test(location.search)) document.documentElement.classList.add('hk-embed');

  var used = {};
  function track(how) {
    var now = Date.now();
    if (used[how] && now - used[how] < 30000) return;
    used[how] = now;
    try { window.toolUsed && window.toolUsed('hakraa', { how: how }); } catch (e) {}
  }

  // ---------- רכיבים ----------
  var src = $('hk-src'), fileIn = $('hk-file'), go = $('hk-go'), stop = $('hk-stop'), status = $('hk-status'), prog = $('hk-prog'),
      progT = $('hk-prog-t'), player = $('hk-player'), audio = $('hk-audio'), bPlay = $('hk-play'), bBack = $('hk-back'), bFwd = $('hk-fwd'),
      bPrev = $('hk-prev'), bNext = $('hk-next'), rate = $('hk-rate'), where = $('hk-where'), chList = $('hk-chapters'), chBox = $('hk-ch-box'),
      bDl = $('hk-dl'), bDevice = $('hk-device'), mine = $('hk-mine'), mineBox = $('hk-mine-box'), title = $('hk-title'), count = $('hk-count'),
      fname = $('hk-fname'), bText = $('hk-showtext'), textBox = $('hk-text');

  function say(t, bad) { status.textContent = t || ''; status.classList.toggle('bad', !!bad); }
  function voice() { var r = document.querySelector('input[name="hk-voice"]:checked'); return r ? r.value : 'm'; }
  function mode() { var r = document.querySelector('input[name="hk-mode"]:checked'); return r ? r.value : 'full'; }

  // ---------- שמירה במכשיר ----------
  var dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise(function (ok, bad) {
      var r = indexedDB.open('hk_hakraa', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('docs', { keyPath: 'id' }); r.result.createObjectStore('aud'); };
      r.onsuccess = function () { ok(r.result); };
      r.onerror = function () { bad(r.error); };
    });
    return dbp;
  }
  function tx(store, rw, fn) {
    return db().then(function (d) {
      return new Promise(function (ok, bad) {
        var t = d.transaction(store, rw ? 'readwrite' : 'readonly'), q = fn(t.objectStore(store));
        t.oncomplete = function () { ok(q && q.result); };
        t.onerror = t.onabort = function () { bad(t.error); };
      });
    }).catch(function () { return undefined; });
  }
  var mem = {};  // גיבוי כשאין IndexedDB (גלישה פרטית)
  function putAud(id, i, blob) { mem[id + ':' + i] = blob; return tx('aud', true, function (s) { return s.put(blob, id + ':' + i); }); }
  function getAud(id, i) {
    if (mem[id + ':' + i]) return Promise.resolve(mem[id + ':' + i]);
    return tx('aud', false, function (s) { return s.get(id + ':' + i); }).then(function (b) { if (b) mem[id + ':' + i] = b; return b; });
  }
  function putDoc(d) { return tx('docs', true, function (s) { return s.put(d); }); }
  function allDocs() { return tx('docs', false, function (s) { return s.getAll(); }).then(function (a) { return (a || []).sort(function (x, y) { return y.at - x.at; }); }); }
  function delDoc(d) {
    for (var i = 0; i < d.segs.length; i++) delete mem[d.id + ':' + i];
    return tx('aud', true, function (s) { return s.delete(IDBKeyRange.bound(d.id + ':', d.id + ':￿')); })
      .then(function () { return tx('docs', true, function (s) { return s.delete(d.id); }); });
  }

  // ---------- קריאת קבצים (אותה דרך כמו במתרגם) ----------
  function loadScript(u) {
    return new Promise(function (ok, bad) { var s = document.createElement('script'); s.src = u; s.onload = ok; s.onerror = bad; document.head.appendChild(s); });
  }
  function reflow(t) {
    var outp = [], cur = '';
    t.split('\n').forEach(function (ln) {
      ln = ln.trim();
      if (!ln) { if (cur) outp.push(cur); cur = ''; outp.push(''); return; }
      if (!cur) { cur = ln; return; }
      if (/[.!?:;׃"”)\]]$/.test(cur) || cur.length < 45 || /^[-•●▪*\d]+[.)]?\s/.test(ln)) { outp.push(cur); cur = ln; }
      else cur += ' ' + ln;
    });
    if (cur) outp.push(cur);
    return outp.join('\n').replace(/\n{3,}/g, '\n\n');
  }
  async function pdfText(buf) {
    if (!window.pdfjsLib) await loadScript('/assets/vendor/pdfjs/pdf.min.js');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/assets/vendor/pdfjs/pdf.worker.min.js';
    var doc = await window.pdfjsLib.getDocument({ data: buf }).promise, pages = [], step = Math.max(1, Math.round(doc.numPages / 10));
    for (var i = 1; i <= doc.numPages; i++) {
      var tc = await (await doc.getPage(i)).getTextContent();
      pages.push(reflow(tc.items.map(function (it) { return (it.str || '') + (it.hasEOL ? '\n' : ''); }).join('').replace(/[ \t]+\n/g, '\n').trim()));
      if (i === 1 || i % step === 0) say('קורא את הקובץ, עמוד ' + i + ' מתוך ' + doc.numPages);
    }
    return pages.join('\n\n');
  }
  async function zipEntry(buf, name) {
    var dv = new DataView(buf), e = buf.byteLength - 22;
    while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
    if (e < 0) throw new Error('zip');
    var n = dv.getUint16(e + 10, true), p = dv.getUint32(e + 16, true), dec = new TextDecoder();
    for (var i = 0; i < n; i++) {
      var method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true),
          xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lho = dv.getUint32(p + 42, true);
      if (dec.decode(new Uint8Array(buf, p + 46, nl)) === name) {
        var start = lho + 30 + dv.getUint16(lho + 26, true) + dv.getUint16(lho + 28, true);
        var data = new Uint8Array(buf, start, csize);
        if (method === 0) return data;
        var ds = new DecompressionStream('deflate-raw');
        return new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(ds)).arrayBuffer());
      }
      p += 46 + nl + xl + cl;
    }
    throw new Error('no ' + name);
  }
  async function docxText(buf) {
    var xml = new TextDecoder().decode(await zipEntry(buf, 'word/document.xml'));
    var d = new DOMParser().parseFromString(xml, 'application/xml'), out = [];
    [].forEach.call(d.getElementsByTagNameNS('*', 'p'), function (p) {
      var t = '';
      [].forEach.call(p.getElementsByTagNameNS('*', '*'), function (el) {
        if (el.localName === 't') t += el.textContent;
        else if (el.localName === 'tab') t += ' ';
        else if (el.localName === 'br') t += '\n';
      });
      out.push(t);
    });
    return out.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  var docName = '';
  async function fromFile(file) {
    if (!file) return;
    var name = file.name || '', low = name.toLowerCase(), text = '';
    say('קורא את הקובץ…');
    try {
      var buf = await file.arrayBuffer();
      if (/\.pdf$/.test(low) || file.type === 'application/pdf') text = await pdfText(buf);
      else if (/\.docx$/.test(low)) text = await docxText(buf);
      else if (/\.txt$/.test(low) || /^text\//.test(file.type)) text = new TextDecoder().decode(buf);
      else if (/\.doc$/.test(low)) { say('קובץ Word ישן (doc) לא נתמך. שמרו אותו ב-Word כ-docx ונסו שוב.', true); return; }
      else { say('אפשר להעלות קובץ PDF, Word (docx) או TXT.', true); return; }
    } catch (e) { say('לא הצלחתי לקרוא את הקובץ. נסו קובץ אחר, או הדביקו את הטקסט בתיבה.', true); return; }
    text = text.trim();
    if (text.length < 20) { say('לא נמצא טקסט בקובץ. כנראה שהוא סרוק (תמונה של דף). אפשר להדביק את הטקסט בתיבה.', true); return; }
    docName = name.replace(/\.[a-z0-9]+$/i, '');
    src.value = text.slice(0, MAX_CHARS);
    fname.textContent = 'הקובץ: ' + name;
    counter();
    say('הקובץ נקרא: ' + words(text) + ' מילים. בוחרים קול ולוחצים "המר לקובץ קול".');
    track('file');
    go.focus();
  }
  function words(t) { return (t.trim().match(/\S+/g) || []).length.toLocaleString('he-IL'); }
  function counter() {
    var t = src.value.trim();
    count.textContent = t ? words(t) + ' מילים, בערך ' + dur(t.length / 11) + ' של הקראה' : '';
  }
  function dur(sec) {
    sec = Math.round(sec);
    if (sec < 90) return sec + ' שניות';
    var m = Math.round(sec / 60);
    if (m < 90) return m + ' דקות';
    var h = Math.floor(m / 60); m = m % 60;
    return h + ' שעות' + (m ? ' ו-' + m + ' דקות' : '');
  }

  // ---------- חלוקה לפרקים ולקטעים ----------
  var HEAD = /^(פרק|שער|חלק|מבוא|הקדמה|פתח דבר|סיכום|סוף דבר|אחרית דבר|נספח|Chapter|Part)(\s|$|:)/i;
  function clean(t) {
    return String(t || '').replace(/[‎‏‪-‮⁦-⁩­]/g, '').replace(/\r/g, '').replace(/[ \t ]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  }
  function cut(s, max) {
    var out = [];
    while (s.length > max) {
      var k = s.lastIndexOf(' ', max);
      if (k < max * 0.5) k = max;
      out.push(s.slice(0, k).trim()); s = s.slice(k).trim();
    }
    if (s) out.push(s);
    return out;
  }
  function split(text) {
    var paras = clean(text).split(/\n+/).map(function (p) { return p.trim(); }).filter(Boolean);
    var segs = [], chapters = [], cur = '', ch = -1;
    function lim() { return segs.length ? SEG : FIRST; }
    function flush() { if (cur.trim()) segs.push({ t: cur.trim(), ch: Math.max(ch, 0) }); cur = ''; }
    paras.forEach(function (p) {
      if (p.length <= 70 && HEAD.test(p) && !/[.,;]$/.test(p)) {
        flush();
        chapters.push({ title: p, from: segs.length }); ch = chapters.length - 1;
        cur = p + '.\n';
        return;
      }
      var sents = p.match(/[^.!?…]+[.!?…]+["”'׳״)\]]*\s*|[^.!?…]+$/g) || [p];
      sents.forEach(function (s) {
        cut(s, SEG).forEach(function (piece) {
          if (cur && cur.length + piece.length + 1 > lim()) flush();
          cur += (cur && !/\n$/.test(cur) ? ' ' : '') + piece.trim();
        });
      });
      if (cur) cur += '\n';
    });
    flush();
    if (!chapters.length || chapters[0].from > 0) chapters.unshift({ title: chapters.length ? 'פתיחה' : 'כל הטקסט', from: 0 });
    segs.forEach(function (s, i) { var c = 0; for (var k = 0; k < chapters.length; k++) if (chapters[k].from <= i) c = k; s.ch = c; });
    return { segs: segs, chapters: chapters };
  }

  // ---------- פענוח הקול מהשרת והמרה ל-MP3 ----------
  var enc = null, waiting = {}, encN = 0;
  function encode(pcm, sr) {
    return new Promise(function (ok, bad) {
      if (!enc) {
        enc = new Worker('/assets/tochen-hakraa-enc.js?v=1');
        enc.onmessage = function (e) { var w = waiting[e.data.id]; delete waiting[e.data.id]; if (!w) return; e.data.error ? w[1](new Error(e.data.error)) : w[0](e.data); };
        enc.onerror = function () { Object.keys(waiting).forEach(function (k) { waiting[k][1](new Error('enc')); delete waiting[k]; }); enc = null; };
      }
      var id = ++encN; waiting[id] = [ok, bad];
      enc.postMessage({ id: id, pcm: pcm.buffer, sr: sr }, [pcm.buffer]);
    });
  }
  function b64(s) {
    var bin = atob(s), n = bin.length, u = new Uint8Array(n);
    for (var i = 0; i < n; i++) u[i] = bin.charCodeAt(i);
    return u;
  }
  function toPcm(part) {
    var u = b64(part.data), mime = part.mimeType || '', sr = 24000, off = 0, len = u.length;
    var m = /rate=(\d+)/.exec(mime); if (m) sr = +m[1];
    if (u[0] === 0x52 && u[1] === 0x49 && u[2] === 0x46 && u[3] === 0x46) {   // RIFF: קובץ WAV
      var dv = new DataView(u.buffer), p = 12;
      while (p + 8 <= u.length) {
        var id = String.fromCharCode(u[p], u[p + 1], u[p + 2], u[p + 3]), sz = dv.getUint32(p + 4, true);
        if (id === 'fmt ') sr = dv.getUint32(p + 12, true);
        if (id === 'data') { off = p + 8; len = Math.min(sz, u.length - off); break; }
        p += 8 + sz + (sz & 1);
      }
    }
    len -= len % 2;
    var pcm = new Int16Array(len / 2), dv2 = new DataView(u.buffer, off, len);
    for (var i = 0; i < pcm.length; i++) pcm[i] = dv2.getInt16(i * 2, true);
    return { pcm: pcm, sr: sr };
  }
  function wait(ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); }
  async function tts(text, v) {
    for (var tries = 0; tries < 4; tries++) {
      var j = null;
      try {
        var r = await fetch(API + '/tts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: text, voice: v }) });
        j = await r.json();
      } catch (e) { j = { error: 'net' }; }
      if (j && j.error) {
        if (j.error === 'busy' || j.error === 'net') { if (tries < 3) { await wait(8000 * (tries + 1)); continue; } }
        throw new Error(j.error);
      }
      var parts = (j && j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || [], a = null;
      for (var k = 0; k < parts.length; k++) if (parts[k].inlineData && parts[k].inlineData.data) a = parts[k].inlineData;
      if (!a) { if (tries < 2) { await wait(3000); continue; } throw new Error('empty'); }
      var p = toPcm(a);
      return await encode(p.pcm, p.sr);
    }
    throw new Error('busy');
  }

  // ---------- ההמרה ----------
  var cur = null, running = false, halt = false, lastTen = -1;
  function pct() { return cur ? Math.round(100 * cur.done / cur.segs.length) : 0; }
  function showProg() {
    if (!cur) return;
    var p = pct();
    prog.hidden = false; prog.value = p; prog.textContent = p + '%';
    progT.textContent = p + '% · קטע ' + cur.done + ' מתוך ' + cur.segs.length;
    var ten = Math.floor(p / 10);
    if (running && ten !== lastTen && p < 100) { lastTen = ten; say('ההמרה מתקדמת: ' + p + ' אחוזים.' + (cur.done ? ' אפשר כבר להקשיב.' : '')); }
  }
  var MSG = {
    quota: 'המכסה היומית של הקול האנושי נגמרה להיום. מה שכבר הומר נשמר במכשיר, ואפשר להמשיך מחר מאותה נקודה. בינתיים אפשר לשמוע את הטקסט בקול של המכשיר.',
    no_key: 'הקול האנושי עוד לא מחובר. בינתיים אפשר לשמוע את הטקסט בקול של המכשיר.',
    busy: 'שרת הקול עמוס כרגע. מה שהומר נשמר. נסו להמשיך בעוד כמה דקות, או הקשיבו בקול של המכשיר.',
    net: 'אין חיבור לאינטרנט. מה שהומר נשמר, ואפשר להמשיך כשהחיבור חוזר.',
    origin: 'הדף הזה לא מורשה לפנות לשרת הקול.',
    too_long: 'קטע ארוך מדי. נסו שוב.', empty: 'לא התקבל קול מהשרת. נסו שוב בעוד רגע.'
  };
  async function convert() {
    if (running || !cur) return;
    running = true; halt = false; lastTen = Math.floor(pct() / 10);
    go.hidden = true; stop.hidden = false; bDevice.hidden = true;
    showProg();
    say(cur.done ? 'ההמרה ממשיכה מהמקום שבו נעצרה.' : 'ההמרה התחילה. הקטע הראשון יהיה מוכן בעוד כמה שניות.');
    try {
      for (var i = 0; i < cur.segs.length; i++) {
        if (halt) break;
        if (cur.have[i]) continue;
        var doc = cur, res = await tts(doc.segs[i].t, doc.voice);
        await putAud(doc.id, i, res.blob);
        doc.have[i] = 1; doc.sec[i] = res.sec; doc.done++;
        await putDoc(doc);
        if (doc !== cur) break;
        showProg(); drawChapters();
        if (doc.done === 1) { player.hidden = false; say('הקטע הראשון מוכן. אפשר ללחוץ "נגן" ולהקשיב בזמן שההמרה ממשיכה.'); track('first'); }
        if (wantNext === i) { wantNext = -1; load(i, 0, true); }
      }
      if (cur.done >= cur.segs.length) {
        say('ההמרה הסתיימה. אפשר להקשיב, להאיץ את הקול ולהוריד כקובץ MP3. ההקראה נשמרה במכשיר.');
        bDl.textContent = 'להוריד כקובץ MP3'; track('done');
      } else if (halt) say('ההמרה נעצרה. ' + pct() + ' אחוזים מוכנים ונשמרו. אפשר להמשיך בכל רגע.');
    } catch (e) {
      say(MSG[e.message] || 'משהו השתבש בהמרה. מה שהומר נשמר; אפשר ללחוץ שוב ולהמשיך.', true);
      bDevice.hidden = false;
      track('err_' + e.message);
    }
    running = false; stop.hidden = true; go.hidden = false;
    go.textContent = cur && cur.done < cur.segs.length && cur.done ? 'להמשיך את ההמרה' : 'המר לקובץ קול';
    showProg(); drawMine();
  }

  async function start() {
    var text = clean(src.value);
    if (text.length < 2) { say('קודם מעלים קובץ או מדביקים טקסט.', true); src.focus(); return; }
    if (cur && cur.text === text && cur.voice === voice() && cur.mode === mode() && cur.done < cur.segs.length) { convert(); return; }
    pause(); stopDevice();
    var m = mode(), body = text, name = docName || text.slice(0, 40).replace(/\s+/g, ' ');
    if (m === 'skira') {
      if (text.length < 200) { say('סקירה קולית מתאימה למסמך של כמה פסקאות לפחות. לטקסט קצר בחרו "הקראה מלאה".', true); return; }
      say('מכין סקירה קצרה של המסמך…'); go.disabled = true;
      try {
        var r = await fetch(API + '/skira', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: text.slice(0, 120000) }) });
        var j = await r.json();
        if (j.error || !j.t) throw new Error(j.error || 'empty');
        body = j.t; name = 'סקירה: ' + name;
      } catch (e) { go.disabled = false; say(MSG[e.message] || 'לא הצלחתי להכין סקירה כרגע. אפשר לבחור "הקראה מלאה".', true); return; }
      go.disabled = false;
    }
    var sp = split(body);
    if (!sp.segs.length) { say('לא נמצא טקסט להקראה.', true); return; }
    cur = { id: 'd' + Date.now().toString(36), name: name, at: Date.now(), voice: voice(), mode: m, text: text, body: body, segs: sp.segs,
      chapters: sp.chapters, have: [], sec: [], done: 0, pos: { i: 0, t: 0 } };
    await putDoc(cur);
    open(cur, true);
    track('convert_' + m + '_' + cur.voice);
    convert();
  }

  // ---------- הנגן ----------
  var idx = 0, url = '', wantNext = -1, device = false;
  function open(d, fresh) {
    cur = d; idx = (d.pos && d.pos.i) || 0;
    title.textContent = d.name + ' · ' + (d.voice === 'f' ? 'קול אישה' : 'קול גבר');
    player.hidden = !d.done; textBox.textContent = d.body || '';
    bDl.textContent = d.done >= d.segs.length ? 'להוריד כקובץ MP3' : 'להוריד את מה שמוכן כ-MP3';
    go.textContent = d.done && d.done < d.segs.length ? 'להמשיך את ההמרה' : 'המר לקובץ קול';
    showProg(); drawChapters();
    if (!fresh && d.done) load(idx, (d.pos && d.pos.t) || 0, false);
    showWhere();
  }
  function chOf(i) { return cur.chapters[cur.segs[i].ch] || cur.chapters[0]; }
  function showWhere() {
    if (!cur) return;
    where.textContent = 'קטע ' + (idx + 1) + ' מתוך ' + cur.segs.length + (cur.chapters.length > 1 ? ' · ' + chOf(idx).title : '');
    [].forEach.call(chList.querySelectorAll('button'), function (b) { b.setAttribute('aria-current', +b.dataset.ch === cur.segs[idx].ch ? 'true' : 'false'); });
  }
  async function load(i, t, play) {
    if (!cur || i < 0 || i >= cur.segs.length) return false;
    var blob = cur.have[i] ? await getAud(cur.id, i) : null;
    if (!blob) {
      if (running && play) { wantNext = i; idx = i; showWhere(); say('הקטע הבא עוד בהמרה, ההקראה תמשיך מיד כשיהיה מוכן.'); }
      else if (play) say('הקטע הזה עוד לא הומר. לחצו "להמשיך את ההמרה".');
      setPlay(false);
      return false;
    }
    wantNext = -1; idx = i;
    if (url) URL.revokeObjectURL(url);
    url = URL.createObjectURL(blob);
    audio.src = url;
    audio.playbackRate = +rate.value || 1;
    if (t) { try { audio.currentTime = t; } catch (e) {} }
    showWhere();
    if (play) { try { await audio.play(); } catch (e) {} }
    return true;
  }
  function setPlay(on) { bPlay.textContent = on ? '⏸ השהה' : '▶ נגן'; bPlay.setAttribute('aria-pressed', on ? 'true' : 'false'); }
  function pause() { try { audio.pause(); } catch (e) {} wantNext = -1; }
  function savePos() { if (!cur || device) return; cur.pos = { i: idx, t: audio.currentTime || 0 }; putDoc(cur); }
  audio.addEventListener('play', function () { setPlay(true); audio.playbackRate = +rate.value || 1; });
  audio.addEventListener('pause', function () { setPlay(false); savePos(); });
  audio.addEventListener('ended', function () {
    if (idx + 1 < cur.segs.length) load(idx + 1, 0, true);
    else { setPlay(false); cur.pos = { i: 0, t: 0 }; putDoc(cur); say('ההקראה הסתיימה.'); }
  });
  var lastSave = 0;
  audio.addEventListener('timeupdate', function () { var n = Date.now(); if (n - lastSave > 5000) { lastSave = n; savePos(); } });
  bPlay.addEventListener('click', function () {
    if (device) { stopDevice(); return; }
    if (!audio.src) { load(idx, (cur.pos && cur.pos.t) || 0, true); return; }
    if (audio.paused) audio.play().catch(function () {}); else audio.pause();
    track('play');
  });
  function jump(d) {
    var t = (audio.currentTime || 0) + d;
    if (t < 0 && idx > 0) { load(idx - 1, 0, !audio.paused); return; }
    if (audio.duration && t >= audio.duration) { if (idx + 1 < cur.segs.length) load(idx + 1, 0, !audio.paused); return; }
    audio.currentTime = Math.max(0, t);
  }
  bBack.addEventListener('click', function () { jump(-15); });
  bFwd.addEventListener('click', function () { jump(15); });
  function goChapter(d) {
    var c = cur.segs[idx].ch + d;
    if (d < 0 && (audio.currentTime > 3 || idx > cur.chapters[cur.segs[idx].ch].from)) c = cur.segs[idx].ch;
    if (c < 0 || c >= cur.chapters.length) { say(d > 0 ? 'זה הפרק האחרון.' : 'זה הפרק הראשון.'); return; }
    load(cur.chapters[c].from, 0, true).then(function (ok) { if (ok) say(cur.chapters[c].title); });
  }
  bPrev.addEventListener('click', function () { goChapter(-1); });
  bNext.addEventListener('click', function () { goChapter(1); });
  rate.addEventListener('change', function () {
    audio.playbackRate = +rate.value || 1;
    try { localStorage.setItem('hk_hakraa_rate', rate.value); } catch (e) {}
    say('מהירות פי ' + rate.value + '.'); track('rate_' + rate.value);
  });
  try { var r0 = localStorage.getItem('hk_hakraa_rate'); if (r0 && rate.querySelector('option[value="' + r0 + '"]')) rate.value = r0; } catch (e) {}

  function drawChapters() {
    if (!cur) return;
    chBox.hidden = cur.chapters.length < 2;
    chList.textContent = '';
    if (cur.chapters.length < 2) return;
    cur.chapters.forEach(function (c, k) {
      var li = document.createElement('li'), b = document.createElement('button');
      var ready = !!cur.have[c.from];
      b.type = 'button'; b.className = 'hk-ch'; b.dataset.ch = k; b.disabled = !ready;
      b.textContent = c.title + (ready ? '' : ' (עוד לא הומר)');
      b.addEventListener('click', function () { load(c.from, 0, true); });
      li.appendChild(b); chList.appendChild(li);
    });
    showWhere();
  }

  // ---------- הורדה ----------
  bDl.addEventListener('click', async function () {
    if (!cur || !cur.done) return;
    var parts = [];
    for (var i = 0; i < cur.segs.length; i++) { if (!cur.have[i]) break; var b = await getAud(cur.id, i); if (!b) break; parts.push(b); }
    if (!parts.length) return;
    var a = document.createElement('a'), u = URL.createObjectURL(new Blob(parts, { type: 'audio/mpeg' }));
    a.href = u; a.download = (cur.name || 'הקראה').replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 80) + '.mp3';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(u); }, 60000);
    say('הקובץ יורד: ' + a.download); track('download');
  });

  // ---------- קול של המכשיר (גיבוי) ----------
  function stopDevice() { if (!device) return; device = false; try { speechSynthesis.cancel(); } catch (e) {} setPlay(false); bDevice.textContent = 'להקריא בקול של המכשיר'; }
  function speakFrom(i) {
    if (!device || !cur || i >= cur.segs.length) { stopDevice(); return; }
    idx = i; showWhere();
    var u = new SpeechSynthesisUtterance(cur.segs[i].t), vs = speechSynthesis.getVoices().filter(function (v) { return /^he|^iw/i.test(v.lang); });
    u.lang = 'he-IL'; if (vs[0]) u.voice = vs[0];
    u.rate = Math.min(+rate.value || 1, 3);
    u.onend = function () { if (device) speakFrom(i + 1); };
    u.onerror = function () { stopDevice(); };
    speechSynthesis.speak(u);
  }
  bDevice.addEventListener('click', function () {
    if (device) { stopDevice(); return; }
    if (!('speechSynthesis' in window)) { say('בדפדפן הזה אין קול מובנה.', true); return; }
    var text = clean(src.value);
    if (!cur || cur.text !== text) {
      if (text.length < 2) { say('קודם מעלים קובץ או מדביקים טקסט.', true); return; }
      var sp = split(text);
      cur = { id: 'tmp', name: docName || 'טקסט', at: Date.now(), voice: voice(), mode: 'full', text: text, body: text, segs: sp.segs, chapters: sp.chapters, have: [], sec: [], done: 0, pos: { i: 0, t: 0 } };
      idx = 0;
    }
    pause(); device = true; player.hidden = false; setPlay(true);
    bDevice.textContent = 'לעצור את קול המכשיר';
    say('מקריא בקול של המכשיר.'); track('device');
    speakFrom(idx);
  });

  // ---------- ההקראות שלי ----------
  async function drawMine() {
    var list = (await allDocs()).filter(function (d) { return d.done; });
    mineBox.hidden = !list.length;
    mine.textContent = '';
    list.forEach(function (d) {
      var li = document.createElement('li'), b = document.createElement('button'), x = document.createElement('button'), p = Math.round(100 * d.done / d.segs.length);
      b.type = 'button'; b.className = 'hk-mine-open';
      b.textContent = d.name + ' · ' + (d.voice === 'f' ? 'קול אישה' : 'קול גבר') + ' · ' + (p >= 100 ? 'מוכן' : p + '% מוכן');
      b.addEventListener('click', function () {
        if (running) { say('קודם עוצרים את ההמרה שרצה עכשיו.', true); return; }
        pause(); stopDevice(); src.value = d.text || ''; docName = d.name; counter();
        var rv = document.querySelector('input[name="hk-voice"][value="' + d.voice + '"]'); if (rv) rv.checked = true;
        var rm = document.querySelector('input[name="hk-mode"][value="' + d.mode + '"]'); if (rm) rm.checked = true;
        open(d, false);
        say('נפתח: ' + d.name + '. ' + (d.pos && (d.pos.i || d.pos.t) ? 'ממשיכים מהמקום שבו עצרתם.' : ''));
        bPlay.focus(); track('reopen');
      });
      x.type = 'button'; x.className = 'hk-mine-del'; x.textContent = 'למחוק'; x.setAttribute('aria-label', 'למחוק את ההקראה ' + d.name);
      x.addEventListener('click', async function () {
        if (cur && cur.id === d.id) { if (running) { say('קודם עוצרים את ההמרה.', true); return; } pause(); cur = null; player.hidden = true; prog.hidden = true; progT.textContent = ''; }
        await delDoc(d); say('ההקראה נמחקה מהמכשיר.'); drawMine();
      });
      li.appendChild(b); li.appendChild(x); mine.appendChild(li);
    });
  }

  // ---------- אירועים ----------
  $('hk-pick').addEventListener('click', function () { fileIn.click(); });
  fileIn.addEventListener('change', function () { fromFile(fileIn.files[0]); fileIn.value = ''; });
  src.addEventListener('input', function () { counter(); if (!src.value.trim()) { docName = ''; fname.textContent = ''; } });
  app.addEventListener('dragover', function (e) { e.preventDefault(); });
  app.addEventListener('drop', function (e) { e.preventDefault(); if (e.dataTransfer.files[0]) fromFile(e.dataTransfer.files[0]); });
  go.addEventListener('click', start);
  stop.addEventListener('click', function () { halt = true; say('עוצר אחרי הקטע הנוכחי…'); });
  bText.addEventListener('click', function () {
    var on = textBox.hidden; textBox.hidden = !on; bText.setAttribute('aria-expanded', on ? 'true' : 'false');
    bText.textContent = on ? 'להסתיר את הטקסט' : 'להציג את הטקסט שמוקרא';
  });
  var emb = $('hk-embed-code');
  if (emb) {
    emb.value = '<iframe src="https://hakelim.com/kelim/tochen/hakraa/?embed=1" title="הקראת טקסט בעברית בקול אנושי" style="width:100%;height:900px;border:0" allow="autoplay"></iframe>';
    $('hk-embed-copy').addEventListener('click', function () {
      emb.select();
      (navigator.clipboard ? navigator.clipboard.writeText(emb.value) : Promise.reject()).catch(function () { try { document.execCommand('copy'); } catch (e) {} });
      say('שורת ההטמעה הועתקה.'); track('embed_copy');
    });
  }
  window.addEventListener('beforeunload', function (e) { savePos(); if (running) { e.preventDefault(); e.returnValue = ''; } });
  counter();
  drawMine();
})();
