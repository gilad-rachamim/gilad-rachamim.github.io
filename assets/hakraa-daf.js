/* הקראת הדף – כפתור "🔊 הקראה" בפס העליון של כל דף באתר (נטען משתי התבניות).
   לחיצה מקריאה את התוכן הראשי של הדף, או את הטקסט שסומן. הפסקה שמוקראת מסומנת בדף.
   תקציב: ברירת המחדל היא הקול של המכשיר (speechSynthesis) – מיידי ובחינם. "קול אנושי" הוא בלחיצה,
   דרך שרת הקול kelim-hakraa (src:'daf' – מכסה יומית קטנה משלה בתוך התקרה). קטע מומר רק כשמגיעים אליו,
   וטקסט שכתוב בדף המקורי נשמר במטמון של השרת, כך שדף שכבר הוקרא לא עולה שוב. נגמרה המכסה – ממשיכים
   בקול המכשיר מאותה נקודה, בלי שגיאה.
   נגישות: כפתורים אמיתיים, הודעות מצב קצרות (role=status), Escape סוגר, הנגן לא מסתיר את מה שבפוקוס. */
(function () {
  'use strict';
  if (window.__hkDaf) return;
  window.__hkDaf = 1;
  var d = document, root = d.documentElement;
  if (/[?&]embed=1/.test(location.search)) return;
  var bar = d.querySelector('.topbar .in'), main = d.getElementById('main') || d.querySelector('main');
  if (!bar || !main) return;

  var API = 'https://kelim-hakraa.gilad4049.workers.dev';
  try { if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && localStorage.getItem('hk_hakraa_api')) API = localStorage.getItem('hk_hakraa_api'); } catch (e) {}
  var MAXU = 160, SEG = 600, FIRST = 350;

  var lang = (root.lang || 'he').slice(0, 2).toLowerCase();
  var TXT = {
    he: { btn: 'הקראה', btnL: 'הקראה של הדף בקול, או של טקסט שסימנתם', region: 'הקראת הדף', play: '▶ נגן', pause: '⏸ השהה', prev: 'הפסקה הקודמת', next: 'הפסקה הבאה',
      rate: 'מהירות', x: 'פי ', toH: '🎙 קול אנושי', toD: 'קול המכשיר', close: 'לסגור את ההקראה',
      dev: 'מקריא בקול של המכשיר.', devSel: 'מקריא את הטקסט שסימנתם, בקול של המכשיר.', prep: 'מכין קול אנושי, כמה שניות…', hum: 'מקריא בקול אנושי.',
      mid: ' מתחיל מהמקום שמופיע במסך.', paused: 'ההקראה מושהית.', done: 'ההקראה הסתיימה.', none: 'לא נמצא בדף טקסט להקראה.', tap: 'לחצו "נגן" כדי להתחיל.',
      fb: { quota: 'המכסה היומית של הקול האנושי נגמרה. ממשיך בקול של המכשיר.', busy: 'שרת הקול עמוס כרגע. ממשיך בקול של המכשיר.', net: 'אין חיבור לשרת הקול. ממשיך בקול של המכשיר.' },
      nd: { quota: 'המכסה היומית של הקול האנושי נגמרה, ובמכשיר הזה לא מותקן קול בעברית. אפשר לנסות שוב מחר.', busy: 'שרת הקול עמוס כרגע, ובמכשיר הזה לא מותקן קול בעברית. נסו שוב בעוד כמה דקות.', net: 'אין חיבור לאינטרנט, ובמכשיר הזה לא מותקן קול בעברית.' },
      rateSet: 'מהירות פי ' },
    en: { btn: 'Listen', btnL: 'Listen to this page, or to the text you selected', region: 'Page reader', play: '▶ Play', pause: '⏸ Pause', prev: 'Previous paragraph', next: 'Next paragraph',
      rate: 'Speed', x: '×', toH: '🎙 Human voice', toD: 'Device voice', close: 'Close the reader',
      dev: 'Reading with the device voice.', devSel: 'Reading your selection with the device voice.', prep: 'Preparing a human voice, a few seconds…', hum: 'Reading with a human voice.',
      mid: ' Starting from what is on screen.', paused: 'Paused.', done: 'Finished reading.', none: 'No text to read on this page.', tap: 'Press Play to start.',
      fb: { quota: 'The daily human-voice quota is used up. Continuing with the device voice.', busy: 'The voice server is busy. Continuing with the device voice.', net: 'No connection to the voice server. Continuing with the device voice.' },
      nd: { quota: 'The daily human-voice quota is used up, and this device has no voice for this language. Please try again tomorrow.', busy: 'The voice server is busy, and this device has no voice for this language. Please try again in a few minutes.', net: 'No internet connection, and this device has no voice for this language.' },
      rateSet: 'Speed ×' },
    ru: { btn: 'Слушать', btnL: 'Слушать страницу или выделенный текст', region: 'Чтение страницы вслух', play: '▶ Слушать', pause: '⏸ Пауза', prev: 'Предыдущий абзац', next: 'Следующий абзац',
      rate: 'Скорость', x: '×', toH: '🎙 Живой голос', toD: 'Голос устройства', close: 'Закрыть чтение',
      dev: 'Читает голос устройства.', devSel: 'Читаю выделенный текст голосом устройства.', prep: 'Готовлю живой голос, несколько секунд…', hum: 'Читает живой голос.',
      mid: ' Начинаю с того, что на экране.', paused: 'Пауза.', done: 'Чтение закончено.', none: 'На странице нет текста для чтения.', tap: 'Нажмите «Слушать», чтобы начать.',
      fb: { quota: 'Дневной лимит живого голоса исчерпан. Продолжаю голосом устройства.', busy: 'Сервер голоса занят. Продолжаю голосом устройства.', net: 'Нет связи с сервером голоса. Продолжаю голосом устройства.' },
      nd: { quota: 'Дневной лимит живого голоса исчерпан, а на устройстве нет голоса для этого языка. Попробуйте завтра.', busy: 'Сервер голоса занят, а на устройстве нет голоса для этого языка. Попробуйте через несколько минут.', net: 'Нет интернета, а на устройстве нет голоса для этого языка.' },
      rateSet: 'Скорость ×' }
  };
  var T = TXT[lang] || TXT.he;
  var LTAG = { he: 'he-IL', en: 'en-US', ru: 'ru-RU' }[lang] || root.lang || 'he-IL';
  var VRE = lang === 'he' ? /^(he|iw)/i : new RegExp('^' + lang, 'i');

  function ev(how) { try { if (window.gtag) window.gtag('event', 'hakraa_daf', { how: how, page_path: location.pathname }); } catch (e) {} }
  function el(tag, cls, text) { var n = d.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  // ---------- הכפתור בפס העליון ----------
  var top = el('button', 'hkd-top no-print');
  top.type = 'button'; top.setAttribute('aria-label', T.btnL); top.title = T.btnL;
  var ic = el('span', '', '🔊'); ic.setAttribute('aria-hidden', 'true');
  top.appendChild(ic); top.appendChild(el('span', 'hkd-top-t', T.btn));
  var brand = bar.querySelector('.brand');
  if (brand && brand.nextSibling) bar.insertBefore(top, brand.nextSibling); else bar.appendChild(top);

  // ---------- הנגן (נבנה בלחיצה הראשונה) ----------
  var panel = null, st, bPlay, bVoice, selRate;
  function build() {
    panel = el('div', 'hkd no-print'); panel.id = 'hkd'; panel.setAttribute('role', 'region'); panel.setAttribute('aria-label', T.region); panel.hidden = true;
    st = el('p', 'hkd-st'); st.setAttribute('role', 'status'); st.setAttribute('aria-live', 'polite');
    var row = el('div', 'hkd-row');
    function b(cls, text, label, fn) { var x = el('button', 'hkd-b ' + cls, text); x.type = 'button'; if (label) x.setAttribute('aria-label', label); x.addEventListener('click', fn); row.appendChild(x); return x; }
    b('hkd-i', '⏮', T.prev, function () { jump(-1); });
    bPlay = b('hkd-play', T.pause, '', toggle);
    b('hkd-i', '⏭', T.next, function () { jump(1); });
    var lab = el('label', 'hkd-rate'); lab.appendChild(el('span', '', T.rate));
    selRate = el('select');
    ['0.75', '1', '1.25', '1.5', '2', '2.5', '3'].forEach(function (v) { var o = el('option', '', T.x + v); o.value = v; selRate.appendChild(o); });
    selRate.value = '1';
    try { var r0 = localStorage.getItem('hk_hakraa_rate'); if (r0 && selRate.querySelector('option[value="' + r0 + '"]')) selRate.value = r0; } catch (e) {}
    selRate.addEventListener('change', setRate);
    lab.appendChild(selRate); row.appendChild(lab);
    bVoice = b('hkd-voice', T.toH, '', switchVoice);
    b('hkd-i hkd-x', '✕', T.close, close);
    panel.appendChild(st); panel.appendChild(row);
    panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); close(); } });
    d.body.appendChild(panel);
  }
  function say(t) { if (st) st.textContent = t || ''; }
  function rate() { return selRate ? +selRate.value || 1 : 1; }
  function setPlay() { if (bPlay) bPlay.textContent = S && S.playing ? T.pause : T.play; }
  function setVoiceBtn() {
    if (!bVoice || !S) return;
    bVoice.textContent = S.mode === 'd' ? T.toH : T.toD;
    bVoice.hidden = S.mode === 'd' ? humanOff : !hasDevice();
  }

  // ---------- איסוף הטקסט מהדף ----------
  var SKIP = /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|SVG|CANVAS|VIDEO|AUDIO|IFRAME|OBJECT|EMBED|SELECT|TEXTAREA|INPUT|BUTTON|NAV|PROGRESS|METER|DATALIST|IMG|PICTURE|MAP|DIALOG)$/i;
  var SKIP_SEL = '[hidden],[aria-hidden="true"],[data-noread],.btn,.vh,.no-read,.hkd,.chesed,.newsbar,.rel,.hp,.share-alts,.fb';
  var PIC = null, LET = /[A-Za-z0-9א-תЀ-ӿ]/, NOTLET = /[^A-Za-z0-9א-תЀ-ӿ]+/g;
  try { PIC = new RegExp('[\\p{Extended_Pictographic}\\uFE0F\\u200D]', 'gu'); LET = new RegExp('[\\p{L}\\p{N}]', 'u'); NOTLET = new RegExp('[^\\p{L}\\p{N}]+', 'gu'); } catch (e) {}
  function tidy(t) {
    t = String(t || '').replace(/[‎‏‪-‮⁦-⁩­]/g, '').replace(/[֑-ֽ֯׀]/g, '');
    if (PIC) t = t.replace(PIC, ' ');
    return t.replace(/[←→↑↓✓✔•●▪◀▶⏮⏭⏸✕×|]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function key(t) { return String(t || '').replace(NOTLET, ''); }
  function collect(rootEl) {
    var blocks = [], buf = '', cur = { el: rootEl, leaf: false };
    function flush() {
      var t = tidy(buf); buf = '';
      if (!t || !LET.test(t)) return;
      if (!/[.!?…:;,׃]["”'׳״)\]]*$/.test(t)) t += '.';
      blocks.push({ c: cur, t: t });
    }
    function walk(n) {
      for (var c = n.firstChild; c; c = c.nextSibling) {
        if (c.nodeType === 3) { buf += c.nodeValue; continue; }
        if (c.nodeType !== 1) continue;
        if (c.tagName === 'BR') { buf += ' '; continue; }
        if (SKIP.test(c.tagName) || c.matches(SKIP_SEL)) continue;
        var cs = getComputedStyle(c), disp = cs.display;
        if (disp === 'none' || cs.visibility === 'hidden') continue;
        if (/^inline/.test(disp) || disp === 'contents' || /^ruby/.test(disp)) { walk(c); continue; }
        flush();
        var prev = cur; prev.leaf = false; cur = { el: c, leaf: true };
        walk(c); flush();
        cur = prev;
      }
    }
    walk(rootEl); flush();
    return blocks;
  }
  function sentences(t) {
    var out = [], re = /[.!?…;:׃]+["”'׳״)\]]*\s+/g, last = 0;
    while (re.exec(t)) { out.push(t.slice(last, re.lastIndex).trim()); last = re.lastIndex; }
    if (last < t.length) out.push(t.slice(last).trim());
    return out.filter(Boolean);
  }
  function chunk(t) {
    var out = [], cur = '';
    sentences(t).forEach(function (s) {
      while (s.length > MAXU) {
        var k = s.lastIndexOf(', ', MAXU);
        if (k < MAXU * 0.4) k = s.lastIndexOf(' ', MAXU); else k++;
        if (k < MAXU * 0.4) k = MAXU;
        if (cur) { out.push(cur); cur = ''; }
        out.push(s.slice(0, k).trim()); s = s.slice(k).trim();
      }
      if (!s) return;
      if (cur && cur.length + s.length + 1 > MAXU) { out.push(cur); cur = ''; }
      cur += (cur ? ' ' : '') + s;
    });
    if (cur) out.push(cur);
    return out;
  }
  function session(blocks, sel) {
    var U = [], B = [], segs = [], segOf = [];
    blocks.forEach(function (b) {
      var first = U.length;
      chunk(b.t).forEach(function (t) { U.push({ t: t, b: B.length }); });
      if (U.length > first) B.push({ c: b.c, first: first });
    });
    var cur = null;
    U.forEach(function (u, i) {
      if (cur && cur.len + u.t.length + 1 > (segs.length ? SEG : FIRST)) { segs.push(cur); cur = null; }
      if (!cur) cur = { from: i, to: i, len: 0 };
      cur.to = i + 1; cur.len += u.t.length + 1; segOf[i] = segs.length;
    });
    if (cur) segs.push(cur);
    segs.forEach(function (s) { s.t = U.slice(s.from, s.to).map(function (u) { return u.t; }).join(' '); });
    return { U: U, B: B, segs: segs, segOf: segOf, pos: 0, mode: 'd', playing: false, sel: !!sel, aud: {}, k: -1 };
  }

  // ---------- סימון הפסקה שמוקראת ----------
  var marked = null, userScroll = 0;
  ['wheel', 'touchmove', 'keydown'].forEach(function (n) { window.addEventListener(n, function () { userScroll = Date.now(); }, { passive: true }); });
  function unmark() { if (marked) { marked.classList.remove('hkd-now'); marked = null; } }
  function mark(i) {
    if (!S || !S.U[i]) return;
    var c = S.B[S.U[i].b].c, e = c && c.leaf && c.el !== main ? c.el : null;
    if (e === marked) return;
    unmark();
    if (!e || !e.isConnected) return;
    marked = e; e.classList.add('hkd-now');
    if (Date.now() - userScroll < 8000) return;
    var r = e.getBoundingClientRect(), bottom = window.innerHeight - (panel && !panel.hidden ? panel.offsetHeight : 0) - 8;
    if (r.top < 70 || r.bottom > bottom) {
      var smooth = !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
      try { e.scrollIntoView({ block: r.height > bottom - 90 ? 'start' : 'center', behavior: smooth ? 'smooth' : 'auto' }); } catch (x) {}
    }
  }

  // ---------- קול המכשיר ----------
  var synth = window.speechSynthesis || null, vlist = [], keep = null, token = 0, wd = 0;
  function loadVoices() { try { vlist = synth ? synth.getVoices() || [] : []; } catch (e) { vlist = []; } }
  if (synth) { loadVoices(); try { synth.addEventListener('voiceschanged', loadVoices); } catch (e) {} }
  function devVoice() {
    var m = vlist.filter(function (v) { return VRE.test(v.lang || ''); });
    return m.filter(function (v) { return v.localService; })[0] || m[0] || null;
  }
  function hasDevice() {
    if (!synth || !window.SpeechSynthesisUtterance) return false;
    if (devVoice()) return true;
    return !vlist.length && /Android|iPhone|iPad/i.test(navigator.userAgent);   // בטלפון הרשימה לפעמים ריקה אבל הקול קיים
  }
  function devStop() { clearTimeout(wd); if (synth) { try { synth.cancel(); } catch (e) {} } keep = null; }
  function devSpeak(i, fresh) {
    var ses = S, tok = token;
    if (i >= ses.U.length) { finish(); return; }
    ses.pos = i; mark(i);
    var u = new SpeechSynthesisUtterance(ses.U[i].t), v = devVoice(), started = Date.now();
    u.lang = v ? v.lang.replace('_', '-') : LTAG; if (v) u.voice = v;
    u.rate = Math.min(rate(), 3);
    function next() { clearTimeout(wd); if (tok === token && ses === S && ses.playing) devSpeak(i + 1); }
    u.onend = next;
    u.onerror = function (e) {
      if (tok !== token || ses !== S) return;
      if (e && (e.error === 'interrupted' || e.error === 'canceled')) return;
      clearTimeout(wd);
      if (Date.now() - started < 1500 && !ses.devOk) { devBroken = true; toHuman(i); } else next();
    };
    u.onstart = function () { ses.devOk = true; };
    keep = u;
    clearTimeout(wd);
    (function watch() {     // כרום לפעמים משתתק באמצע בלי להודיע: אם הקול נדם, ממשיכים הלאה
      wd = setTimeout(function () {
        if (tok !== token || ses !== S || !ses.playing) return;
        if (synth.speaking || synth.pending) watch(); else next();
      }, (u.text.length / 5 + 8) * 1000 / u.rate);
    })();
    if (fresh) setTimeout(function () { if (tok === token && ses === S) synth.speak(u); }, 90); else synth.speak(u);
  }

  // ---------- קול אנושי ----------
  var audio = null, humanOff = false, devBroken = false, silent = '', staticP = null;
  function wav(pcm, sr) {
    var h = new DataView(new ArrayBuffer(44)), n = pcm.byteLength;
    function s(o, t) { for (var i = 0; i < t.length; i++) h.setUint8(o + i, t.charCodeAt(i)); }
    s(0, 'RIFF'); h.setUint32(4, 36 + n, true); s(8, 'WAVEfmt '); h.setUint32(16, 16, true); h.setUint16(20, 1, true); h.setUint16(22, 1, true);
    h.setUint32(24, sr, true); h.setUint32(28, sr * 2, true); h.setUint16(32, 2, true); h.setUint16(34, 16, true); s(36, 'data'); h.setUint32(40, n, true);
    return new Blob([h, pcm], { type: 'audio/wav' });
  }
  function getAudio() {
    if (audio) return audio;
    audio = new Audio(); audio.preload = 'auto';
    audio.addEventListener('ended', function () {
      if (!S || S.mode !== 'h' || !S.playing) return;
      var n = S.segs[S.k + 1];
      if (n) humanPlay(n.from); else finish();
    });
    audio.addEventListener('timeupdate', function () {
      if (!S || S.mode !== 'h' || S.k < 0 || !audio.duration || audio.paused) return;
      var seg = S.segs[S.k], at = audio.currentTime / audio.duration * seg.len, acc = 0;
      for (var i = seg.from; i < seg.to; i++) { acc += S.U[i].t.length + 1; if (acc > at) break; }
      i = Math.min(i, seg.to - 1);
      if (i !== S.pos) { S.pos = i; mark(i); }
    });
    return audio;
  }
  function unlock() {     // בטלפון: ניגון חייב להתחיל בתוך הלחיצה; מנגנים רגע של שקט וכך הקול שיגיע אחר כך יתנגן
    var a = getAudio();
    if (!silent) silent = URL.createObjectURL(wav(new Uint8Array(2400), 24000));
    try { a.src = silent; var p = a.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
  }
  function staticKey() {   // הטקסט של הדף כמו שהוא בשרת: רק מה שכתוב בו מסומן "ציבורי" ונשמר במטמון של שרת הקול
    if (!staticP) staticP = fetch(location.pathname + location.search, { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (h) { var m = new DOMParser().parseFromString(h, 'text/html').querySelector('main'); return m ? key(tidy(m.textContent)) : ''; }).catch(function () { return ''; });
    return staticP;
  }
  function wait(ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); }
  async function fetchSeg(ses, k) {
    var seg = ses.segs[k], sk = await staticKey(), pub = 0;
    if (sk) { pub = 1; for (var i = seg.from; i < seg.to; i++) if (sk.indexOf(key(ses.U[i].t)) < 0) { pub = 0; break; } }
    for (var tries = 0; tries < 2; tries++) {
      var j = null;
      try {
        var r = await fetch(API + '/tts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: seg.t, voice: 'm', src: 'daf', pub: pub }) });
        j = await r.json();
      } catch (e) { j = { error: 'net' }; }
      if (j && j.error) { if ((j.error === 'busy' || j.error === 'net') && !tries) { await wait(4000); continue; } throw new Error(j.error); }
      var parts = (j && j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || [], a = null;
      for (var p = 0; p < parts.length; p++) if (parts[p].inlineData && parts[p].inlineData.data) a = parts[p].inlineData;
      if (!a) { if (!tries) { await wait(2000); continue; } throw new Error('busy'); }
      var bin = atob(a.data), n = bin.length, u8 = new Uint8Array(n);
      for (var q = 0; q < n; q++) u8[q] = bin.charCodeAt(q);
      if (u8[0] === 0x52 && u8[1] === 0x49 && u8[2] === 0x46 && u8[3] === 0x46) return URL.createObjectURL(new Blob([u8], { type: 'audio/wav' }));
      var m = /rate=(\d+)/.exec(a.mimeType || '');
      return URL.createObjectURL(wav(u8.subarray(0, n - n % 2), m ? +m[1] : 24000));
    }
    throw new Error('busy');
  }
  function getSeg(ses, k) { if (!ses.aud[k]) ses.aud[k] = fetchSeg(ses, k); return ses.aud[k]; }
  function humanPlay(i) {
    var ses = S, tok = token, k = ses.segOf[i], seg = ses.segs[k], a = getAudio();
    ses.pos = i; mark(i);
    var slow = setTimeout(function () { if (tok === token && ses === S) say(T.prep); }, 250);
    getSeg(ses, k).then(function (url) {
      clearTimeout(slow);
      if (tok !== token || ses !== S || !ses.playing) return;
      ses.k = k;
      var before = 0; for (var q = seg.from; q < i; q++) before += ses.U[q].t.length + 1;
      a.src = url; a.playbackRate = rate();
      if (before) a.addEventListener('loadedmetadata', function () { if (isFinite(a.duration)) { try { a.currentTime = a.duration * before / seg.len; } catch (e) {} } }, { once: true });
      var p = a.play();
      if (p && p.catch) p.catch(function () { if (tok === token && ses === S) { ses.playing = false; setPlay(); say(T.tap); } });
      a.playbackRate = rate();
      say(T.hum);
      try { if (navigator.mediaSession && window.MediaMetadata) navigator.mediaSession.metadata = new MediaMetadata({ title: d.title }); } catch (e) {}
      if (!ses.humOk) { ses.humOk = true; ev('human_ok'); }
      if (ses.segs[k + 1]) getSeg(ses, k + 1).catch(function () {});
      if (rate() >= 2 && ses.segs[k + 2]) getSeg(ses, k + 2).catch(function () {});
    }, function (e) {
      clearTimeout(slow);
      delete ses.aud[k];
      if (tok !== token || ses !== S || !ses.playing) return;
      var code = /^(quota|no_key|origin)$/.test(e.message) ? 'quota' : e.message === 'net' ? 'net' : 'busy';
      if (code === 'quota') humanOff = true;
      ev('human_' + e.message);
      if (hasDevice() && !devBroken) { ses.mode = 'd'; setVoiceBtn(); say(T.fb[code]); devSpeak(i, true); }
      else { ses.playing = false; setPlay(); setVoiceBtn(); say(T.nd[code]); }
    });
  }
  function toHuman(i) {
    if (!S) return;
    if (humanOff) { S.playing = false; setPlay(); say(T.nd.quota); return; }
    S.mode = 'h'; setVoiceBtn(); humanPlay(i);
  }

  // ---------- שליטה ----------
  var S = null;
  function stopAll() { token++; devStop(); if (audio) { try { audio.pause(); } catch (e) {} } }
  function playFrom(i, note) {
    stopAll();
    S.pos = Math.max(0, Math.min(i, S.U.length - 1)); S.playing = true; setPlay();
    if (S.mode === 'h') humanPlay(S.pos);
    else { say((S.sel ? T.devSel : T.dev) + (note || '')); devSpeak(S.pos, true); }
  }
  function toggle() {
    if (!S) return;
    if (S.playing) {
      S.playing = false; setPlay();
      if (S.mode === 'h' && audio) { token++; audio.pause(); } else stopAll();
      say(T.paused);
    } else if (S.mode === 'h' && audio && S.k === S.segOf[S.pos] && audio.src && !audio.ended) {
      S.playing = true; setPlay(); audio.playbackRate = rate(); audio.play().catch(function () {}); say(T.hum);
    } else { if (S.mode === 'h') unlock(); playFrom(S.pos); }
  }
  function jump(dir) {
    if (!S) return;
    var b = S.U[S.pos].b, t;
    if (dir > 0) { if (b + 1 >= S.B.length) return; t = S.B[b + 1].first; }
    else t = S.pos > S.B[b].first || !b ? S.B[b].first : S.B[b - 1].first;
    userScroll = 0;
    if (S.mode === 'h') unlock();
    playFrom(t);
  }
  function setRate() {
    try { localStorage.setItem('hk_hakraa_rate', selRate.value); } catch (e) {}
    if (S && S.mode === 'h' && audio) audio.playbackRate = rate();
    else if (S && S.playing) playFrom(S.pos);
    if (!S || !S.playing) say(T.rateSet + selRate.value + '.');
    ev('rate_' + selRate.value);
  }
  function switchVoice() {
    if (!S) return;
    var to = S.mode === 'd' ? 'h' : 'd';
    try { localStorage.setItem('hk_daf_voice', to); } catch (e) {}
    ev('to_' + to);
    stopAll(); S.mode = to; setVoiceBtn();
    if (to === 'h') unlock();
    playFrom(S.pos);
  }
  function finish() {
    if (!S) return;
    stopAll(); S.playing = false; S.pos = 0; S.k = -1; setPlay(); unmark(); say(T.done); ev('done');
  }
  function freeAudio(ses) {
    Object.keys(ses.aud).forEach(function (k) { ses.aud[k].then(function (u) { URL.revokeObjectURL(u); }, function () {}); });
  }
  function close() {
    stopAll(); unmark();
    if (S) freeAudio(S);
    S = null;
    if (panel) panel.hidden = true;
    root.classList.remove('hkd-open');
    try { top.focus(); } catch (e) {}
  }

  // ---------- טקסט שסומן ----------
  var lastSel = '', emptied = 0;
  function selText() {
    var a = d.activeElement, t = '';
    try {
      if (a && (a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && /^(text|search|url|tel)$/.test(a.type))) && a.selectionEnd > a.selectionStart) t = a.value.slice(a.selectionStart, a.selectionEnd);
    } catch (e) {}
    if (!t) { try { t = String(window.getSelection ? getSelection() : ''); } catch (e) {} }
    t = t.trim();
    return t.length >= 2 && LET.test(t) ? t : '';
  }
  d.addEventListener('selectionchange', function () {
    var t = selText();
    if (t) { lastSel = t; emptied = 0; } else if (lastSel && !emptied) emptied = Date.now();
  });
  function firstOnScreen(ses) {
    if ((window.scrollY || root.scrollTop || 0) < 250) return 0;
    for (var j = 0; j < ses.B.length; j++) {
      var e = ses.B[j].c.el;
      if (!e || e === main || !e.isConnected) continue;
      var r = e.getBoundingClientRect();
      if (r.bottom > 80 && r.height) return r.top > window.innerHeight ? 0 : ses.B[j].first;
    }
    return 0;
  }

  top.addEventListener('click', function (e) {
    var sel = selText();
    if (!sel && lastSel && emptied && Date.now() - emptied < 1500) sel = lastSel;
    lastSel = ''; emptied = 0;
    if (!sel && S && panel && !panel.hidden) { toggle(); return; }
    if (!panel) build();
    stopAll(); unmark();
    if (S) freeAudio(S);
    loadVoices();
    var blocks = sel ? sel.split(/\n+/).map(function (t) { t = tidy(t); return { c: { el: null, leaf: false }, t: t && !/[.!?…:;,׃]$/.test(t) ? t + '.' : t }; }).filter(function (b) { return b.t && LET.test(b.t); }) : collect(main);
    S = session(blocks, sel);
    panel.hidden = false; root.classList.add('hkd-open');
    if (!S.U.length) { S = null; say(T.none); setPlay(); return; }
    var pref = 'd';
    try { pref = localStorage.getItem('hk_daf_voice') || 'd'; } catch (x) {}
    S.mode = (pref === 'h' && !humanOff) || !hasDevice() || devBroken ? 'h' : 'd';
    if (S.mode === 'h' && humanOff) { setPlay(); setVoiceBtn(); say(T.nd.quota); return; }
    setVoiceBtn();
    if (S.mode === 'h') unlock();
    var from = sel ? 0 : firstOnScreen(S);
    userScroll = 0;
    playFrom(from, from ? T.mid : '');
    ev(sel ? 'start_sel' : 'start_' + S.mode);
    if (e.detail === 0) { try { bPlay.focus(); } catch (x) {} }
  });
  window.addEventListener('pagehide', function () { if (S) stopAll(); });
})();
