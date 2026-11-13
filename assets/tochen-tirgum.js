/* מתרגם – /kelim/tochen/tirgum/
   מנוע: Translator + LanguageDetector המובנים בכרום (בתוך המחשב, בלי שרת).
   גיבוי לדפדפנים בלי המנוע: MyMemory החינמי (נשלח לשרת שלהם, עם מכסה יומית). */
(function () {
  'use strict';
  var app = document.getElementById('tg-app');
  if (!app) return;
  function $(id) { return document.getElementById(id); }

  // קוד, שם, קוד דיבור
  var LANGS = [
    ['he', 'עברית', 'he-IL'], ['en', 'אנגלית', 'en-US'], ['ar', 'ערבית', 'ar-IL'], ['ru', 'רוסית', 'ru-RU'],
    ['fr', 'צרפתית', 'fr-FR'], ['es', 'ספרדית', 'es-ES'], ['am', 'אמהרית', 'am-ET'], ['uk', 'אוקראינית', 'uk-UA'],
    ['de', 'גרמנית', 'de-DE'], ['it', 'איטלקית', 'it-IT'], ['pt', 'פורטוגזית', 'pt-BR'], ['tr', 'טורקית', 'tr-TR'],
    ['ro', 'רומנית', 'ro-RO'], ['pl', 'פולנית', 'pl-PL'], ['nl', 'הולנדית', 'nl-NL'], ['hu', 'הונגרית', 'hu-HU'],
    ['fa', 'פרסית', 'fa-IR'], ['el', 'יוונית', 'el-GR'], ['hi', 'הינדי', 'hi-IN'], ['th', 'תאית', 'th-TH'],
    ['zh', 'סינית', 'zh-CN'], ['ja', 'יפנית', 'ja-JP'], ['ko', 'קוריאנית', 'ko-KR']
  ];
  var NAME = {}, SPEECH = {}, NATIVE = { he: 'עברית', en: 'English', ar: 'العربية', ru: 'Русский', fr: 'Français', es: 'Español', am: 'አማርኛ', uk: 'Українська', de: 'Deutsch', it: 'Italiano', pt: 'Português', tr: 'Türkçe', ro: 'Română', pl: 'Polski', nl: 'Nederlands', hu: 'Magyar', fa: 'فارسی', el: 'Ελληνικά', hi: 'हिन्दी', th: 'ไทย', zh: '中文', ja: '日本語', ko: '한국어' };
  LANGS.forEach(function (l) { NAME[l[0]] = l[1]; SPEECH[l[0]] = l[2]; });

  var EX_SRC = 'Thank you for your help yesterday. I will send you the documents by Sunday, and we can meet next week if that works for you.';
  var EX_OUT = 'תודה על העזרה שלך אתמול. אשלח לך את המסמכים עד יום ראשון, ונוכל להיפגש בשבוע הבא אם זה מתאים לך.';

  // ---------- שמירה ----------
  var KEY = 'hk_tirgum_v1';
  var st = { from: 'auto', to: 'he', src: '', gl: [], hist: [], big: false, rate: '1', seen: false };
  try { var s0 = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s0) for (var k in s0) st[k] = s0[k]; } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }

  var used = {};
  function track(how) {
    var now = Date.now();
    if (used[how] && now - used[how] < 30000) return;
    used[how] = now;
    try { window.toolUsed && window.toolUsed('tirgum', { how: how }); } catch (e) {}
  }

  // ---------- רכיבים ----------
  var selFrom = $('tg-from'), selTo = $('tg-to'), src = $('tg-src'), out = $('tg-out'), status = $('tg-status'),
      engineEl = $('tg-engine'), dlBox = $('tg-dl'), prog = $('tg-prog'), goBtn = $('tg-go');

  function opt(v, t) { var o = document.createElement('option'); o.value = v; o.textContent = t; return o; }
  selFrom.appendChild(opt('auto', '🔎 זיהוי שפה אוטומטי'));
  LANGS.forEach(function (l) { selFrom.appendChild(opt(l[0], l[1])); selTo.appendChild(opt(l[0], l[1])); });
  selFrom.value = NAME[st.from] || st.from === 'auto' ? st.from : 'auto';
  selTo.value = NAME[st.to] ? st.to : 'he';

  function setStatus(t, err) { status.textContent = t || ''; status.className = 'tg-status' + (err ? ' err' : ''); }
  function dirOf(code) { return /^(he|ar|fa)$/.test(code) ? 'rtl' : 'ltr'; }

  // ---------- זיהוי שפה ----------
  var HAS_T = typeof self !== 'undefined' && 'Translator' in self;
  var HAS_D = typeof self !== 'undefined' && 'LanguageDetector' in self;
  var detector = null, detectorTried = false, lastForeign = 'en';

  function scriptGuess(t) {
    var c = function (re) { var m = t.match(re); return m ? m.length : 0; };
    var counts = {
      he: c(/[א-ת]/g), ar: c(/[؀-ۿ]/g), ru: c(/[Ѐ-ӿ]/g), el: c(/[Ͱ-Ͽ]/g),
      am: c(/[ሀ-፿]/g), th: c(/[฀-๿]/g), hi: c(/[ऀ-ॿ]/g), ko: c(/[가-힯]/g),
      ja: c(/[぀-ヿ]/g), zh: c(/[一-鿿]/g), en: c(/[A-Za-z]/g)
    };
    var best = 'en', n = 0;
    for (var k in counts) if (counts[k] > n) { n = counts[k]; best = k; }
    if (best === 'zh' && counts.ja) best = 'ja';
    if (best === 'ru' && /[іїєґ]/i.test(t)) best = 'uk';
    if (best === 'ar' && /[پچژگ]/.test(t)) best = 'fa';
    return n ? best : null;
  }

  async function detect(t) {
    var guess = scriptGuess(t);
    // אותיות לטיניות: אנגלית, צרפתית, ספרדית... – רק המזהה של כרום יודע להבדיל
    if (guess === 'en' && HAS_D) {
      try {
        if (!detector && !detectorTried) {
          detectorTried = true;
          var av = await LanguageDetector.availability();
          if (av === 'available') detector = await LanguageDetector.create();
        }
        if (detector) {
          var r = await detector.detect(t.slice(0, 600));
          if (r && r[0] && r[0].confidence > 0.5) {
            var code = String(r[0].detectedLanguage).split('-')[0];
            if (code === 'iw') code = 'he';
            if (NAME[code]) return code;
          }
        }
      } catch (e) {}
    }
    return guess || 'en';
  }

  // ---------- מנוע כרום ----------
  var translators = {}, pairState = {};
  function pk(a, b) { return a + '>' + b; }

  async function chromeAvail(a, b) {
    if (!HAS_T) return 'no';
    var k = pk(a, b);
    if (pairState[k] === 'available') return 'available';
    try { pairState[k] = await Translator.availability({ sourceLanguage: a, targetLanguage: b }); }
    catch (e) { pairState[k] = 'no'; }
    return pairState[k];
  }

  // נקרא מתוך לחיצה (כרום דורש לחיצה כדי להוריד מודל)
  async function chromeCreate(a, b) {
    var k = pk(a, b);
    if (translators[k]) return translators[k];
    dlBox.hidden = false; prog.style.width = '3%';
    $('tg-dl-t').textContent = 'כרום מוריד פעם אחת את מודל התרגום ' + NAME[a] + ' ↔ ' + NAME[b] + '. אחר כך זה מהיר ועובד גם בלי אינטרנט.';
    try {
      var tr = await Translator.create({
        sourceLanguage: a, targetLanguage: b,
        monitor: function (m) { m.addEventListener('downloadprogress', function (e) { prog.style.width = Math.max(3, Math.round(e.loaded * 100)) + '%'; setStatus('מוריד את מודל התרגום… ' + Math.round(e.loaded * 100) + '%'); }); }
      });
      translators[k] = tr; pairState[k] = 'available';
      track('download');
      return tr;
    } finally { dlBox.hidden = true; }
  }

  // ---------- מנוע גיבוי ----------
  function chunks(text, max) {
    var parts = text.split(/(?<=[.!?。؟!?])\s+/), outp = [], cur = '';
    parts.forEach(function (p) {
      while (p.length > max) { if (cur) { outp.push(cur); cur = ''; } outp.push(p.slice(0, max)); p = p.slice(max); }
      if ((cur + ' ' + p).trim().length > max) { if (cur) outp.push(cur); cur = p; }
      else cur = cur ? cur + ' ' + p : p;
    });
    if (cur) outp.push(cur);
    return outp;
  }
  async function mmOne(q, a, b) {
    var ctl = new AbortController(), timer = setTimeout(function () { ctl.abort(); }, 20000);
    try {
      var r = await fetch('https://api.mymemory.translated.net/get?q=' + encodeURIComponent(q) + '&langpair=' + a + '|' + b, { signal: ctl.signal });
      var d = await r.json();
      if (d.quotaFinished || d.responseStatus === 429) throw new Error('quota');
      if (d.responseStatus !== 200 && d.responseStatus !== '200') throw new Error('mm ' + d.responseStatus);
      var t = d.responseData && d.responseData.translatedText || '';
      if (/MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(t)) throw new Error('quota');
      var tmp = document.createElement('textarea'); tmp.innerHTML = t; return tmp.value;
    } finally { clearTimeout(timer); }
  }
  async function fallbackTranslate(line, a, b) {
    var res = [];
    var cs = chunks(line, 450);
    for (var i = 0; i < cs.length; i++) res.push(await mmOne(cs[i], a, b));
    return res.join(' ');
  }

  // ---------- מילון אישי ----------
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function applyGlossary(text) {
    var map = {}, n = 71;
    var list = st.gl.slice().sort(function (x, y) { return y.a.length - x.a.length; });
    list.forEach(function (g) {
      if (!g.a) return;
      var latin = /^[\x00-\x7F]+$/.test(g.a);
      var re = new RegExp((latin ? '\\b' : '') + esc(g.a) + (latin ? '\\b' : ''), latin ? 'gi' : 'g');
      if (re.test(text)) {
        var tok = '[' + n + ']'; map[n] = g.b; n++;
        text = text.replace(re, tok);
      }
    });
    return { text: text, map: map };
  }
  function restoreGlossary(text, map) {
    return text.replace(/\[\s*(\d{2})\s*\]/g, function (m, d) { return map[d] != null ? map[d] : m; });
  }
  // ניקוד שהמודל מוסיף לפעמים למילה בודדת (משאירים מקף עברי)
  function stripNiqqud(t) { return t.replace(/[֑-ׇֽֿׁׂׅׄ]/g, ''); }

  // ---------- תרגום ----------
  var busy = false, again = false, lastKey = '', usedEngine = '';

  async function translateText(text, a, b, fromClick) {
    if (a === b) return text;
    var av = await chromeAvail(a, b);
    var tr = null;
    if (av === 'available') tr = await chromeCreate(a, b);
    else if ((av === 'downloadable' || av === 'downloading') && fromClick) tr = await chromeCreate(a, b);
    else if (av === 'downloadable' || av === 'downloading') {
      var e = new Error('need-click'); e.needClick = true; throw e;
    }
    var g = applyGlossary(text);
    var lines = g.text.split('\n'), res = [];
    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i];
      if (!ln.trim()) { res.push(ln); continue; }
      if (tr) { res.push(await tr.translate(ln)); usedEngine = 'chrome'; }
      else { res.push(await fallbackTranslate(ln, a, b)); usedEngine = 'mm'; }
    }
    var outT = restoreGlossary(res.join('\n'), g.map);
    if (b === 'he') outT = stripNiqqud(outT);
    return outT;
  }

  function showEngine() {
    if (usedEngine === 'chrome') engineEl.textContent = '🔒 תורגם בתוך המחשב, בתרגום המובנה של הדפדפן. הטקסט לא נשלח לשום מקום.';
    else if (usedEngine === 'mm') engineEl.textContent = HAS_T
      ? 'את השפה הזאת כרום עוד לא מתרגם בתוך המחשב, ולכן היא תורגמה בשירות התרגום החינמי MyMemory (הטקסט נשלח אליו כדי לתרגם).'
      : 'תורגם בשירות התרגום החינמי MyMemory (הטקסט נשלח אליו כדי לתרגם). בכרום במחשב התרגום נעשה בתוך המחשב, פרטי ובלי הגבלה.';
  }

  async function run(fromClick) {
    var text = src.value.trim();
    if (!text) { out.textContent = ''; setStatus(''); return; }
    if (busy) { again = true; return; }
    var a = selFrom.value, b = selTo.value;
    if (a === 'auto') {
      a = await detect(text);
      if (a === b) { b = a === 'he' ? (lastForeign || 'en') : 'he'; selTo.value = b; }
    }
    if (a !== 'he') lastForeign = a;
    var key = a + '|' + b + '|' + text + '|' + JSON.stringify(st.gl);
    if (key === lastKey && !fromClick) return;
    busy = true; goBtn.disabled = true;
    setStatus(selFrom.value === 'auto' ? 'מתרגם מ' + NAME[a] + '…' : 'מתרגם…');
    try {
      var res = await translateText(src.value, a, b, fromClick);
      lastKey = key;
      out.textContent = res;
      out.dir = dirOf(b); out.lang = b;
      setStatus(selFrom.value === 'auto' ? 'זוהתה ' + NAME[a] + ' ← ' + NAME[b] : '');
      showEngine();
      track('translate');
      remember(text, res, a, b);
    } catch (e) {
      if (e && e.needClick) setStatus('לוחצים "לתרגם" – בפעם הראשונה כרום מוריד את מודל התרגום (פעם אחת בלבד).');
      else if (e && e.message === 'quota') setStatus('המכסה היומית של שירות התרגום החינמי נגמרה. מחר היא מתחדשת, ובכרום במחשב אין הגבלה בכלל.', true);
      else setStatus('התרגום לא הצליח (אולי אין אינטרנט). נסו שוב בעוד רגע.', true);
    } finally {
      busy = false; goBtn.disabled = false;
      if (again) { again = false; run(false); }
    }
  }

  var tmr = null;
  function schedule() {
    clearTimeout(tmr);
    st.src = src.value; save();
    updCount();
    if (!src.value.trim()) { out.textContent = ''; setStatus(''); return; }
    // בתרגום בתוך המחשב – תוך כדי הקלדה. בשירות החיצוני – מחכים יותר, כדי לא לבזבז מכסה.
    var fast = HAS_T;
    tmr = setTimeout(function () { run(false); }, fast ? 450 : 1300);
  }
  function updCount() { var n = src.value.length; $('tg-count').textContent = n ? n.toLocaleString('he-IL') + ' תווים' : ''; }

  src.addEventListener('input', schedule);
  goBtn.addEventListener('click', function () { clearTimeout(tmr); lastKey = ''; run(true); });
  src.addEventListener('keydown', function (e) { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); goBtn.click(); } });
  selFrom.addEventListener('change', function () { st.from = selFrom.value; save(); lastKey = ''; schedule(); setConvLabels(); });
  selTo.addEventListener('change', function () { st.to = selTo.value; save(); lastKey = ''; schedule(); setConvLabels(); });
  $('tg-swap').addEventListener('click', function () {
    var a = selFrom.value, b = selTo.value;
    if (a === 'auto') a = src.value.trim() ? scriptGuess(src.value) || lastForeign : (b === 'he' ? 'en' : 'he');
    selFrom.value = b; selTo.value = a;
    if (out.textContent && !out.querySelector('.tg-ex')) src.value = out.textContent;
    st.from = selFrom.value; st.to = selTo.value; save();
    lastKey = ''; schedule(); setConvLabels(); track('swap');
  });
  $('tg-clear').addEventListener('click', function () { src.value = ''; out.textContent = ''; schedule(); src.focus(); });

  // ---------- הקראה ----------
  var voices = [];
  function loadVoices() { try { voices = speechSynthesis.getVoices() || []; } catch (e) {} }
  if ('speechSynthesis' in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
  function pickVoice(code) {
    var c = code === 'he' ? /^(he|iw)/i : new RegExp('^' + code, 'i');
    var vs = voices.filter(function (v) { return c.test(v.lang); });
    vs.sort(function (x, y) { return score(y) - score(x); });
    function score(v) { return (/natural|online|google|neural/i.test(v.name) ? 2 : 0) + (v.localService ? 0 : 1); }
    return vs[0] || null;
  }
  function speak(text, code, rate) {
    if (!('speechSynthesis' in window)) { setStatus('הדפדפן הזה לא יודע להקריא. נסו בכרום או באדג׳.', true); return; }
    text = (text || '').trim(); if (!text) return;
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = SPEECH[code] || code;
    var v = pickVoice(code);
    if (v) u.voice = v;
    else if (voices.length) setStatus('אין במכשיר הזה קול ב' + (NAME[code] || code) + '. אפשר להוסיף קול בהגדרות השפה של המכשיר.', true);
    u.rate = parseFloat(rate || st.rate || '1');
    speechSynthesis.speak(u);
  }
  $('tg-say').addEventListener('click', function () {
    var t = out.querySelector('.tg-ex') ? EX_OUT : out.textContent;
    speak(t, out.lang || selTo.value); track('speak');
  });
  $('tg-say-src').addEventListener('click', function () {
    var a = selFrom.value === 'auto' ? (scriptGuess(src.value) || 'en') : selFrom.value;
    speak(src.value, a); track('speak');
  });
  var rateSel = $('tg-rate'); rateSel.value = st.rate || '1';
  rateSel.addEventListener('change', function () { st.rate = rateSel.value; save(); });

  // ---------- העתקה ושליחה ----------
  function resultText() { return out.querySelector('.tg-ex') ? EX_OUT : out.textContent; }
  $('tg-copy').addEventListener('click', function () {
    var t = resultText(); if (!t) return;
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { setStatus('✓ התרגום הועתק'); }, function () {
      var r = document.createRange(); r.selectNodeContents(out); var s = getSelection(); s.removeAllRanges(); s.addRange(r); document.execCommand('copy'); setStatus('✓ התרגום הועתק');
    });
    track('copy');
  });
  var wa = $('tg-wa');
  wa.addEventListener('click', function () {
    var t = resultText();
    wa.href = 'https://wa.me/?text=' + encodeURIComponent(t || '');
    track('wa');
  });

  // ---------- דיבור במקום הקלדה ----------
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var micBtn = $('tg-mic'), rec = null, recOn = false;
  function micLang() {
    var a = selFrom.value;
    if (a === 'auto') a = src.value.trim() ? (scriptGuess(src.value) || 'he') : (selTo.value === 'he' ? lastForeign : 'he');
    return a;
  }
  function listen(code, onFinal, onInterim, onEnd) {
    var r = new SR();
    r.lang = SPEECH[code] || code; r.interimResults = true; r.continuous = !!onInterim;
    r.onresult = function (ev) {
      var fin = '', tmp = '';
      for (var i = ev.resultIndex; i < ev.results.length; i++) {
        if (ev.results[i].isFinal) fin += ev.results[i][0].transcript; else tmp += ev.results[i][0].transcript;
      }
      if (fin) onFinal(fin.trim());
      if (onInterim) onInterim(tmp);
    };
    r.onerror = function (e) {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') setStatus('צריך לאשר לדפדפן להשתמש במיקרופון (סמל המנעול ליד הכתובת).', true);
      else if (e.error === 'no-speech') setStatus('לא נשמע דיבור. נסו שוב, קרוב יותר למיקרופון.', true);
      else if (e.error === 'language-not-supported') setStatus('הדפדפן לא מזהה דיבור ב' + (NAME[code] || code) + '.', true);
      else if (e.error !== 'aborted') setStatus('המיקרופון הפסיק (' + e.error + ').', true);
    };
    r.onend = onEnd;
    r.start();
    return r;
  }
  var base = '';
  micBtn.addEventListener('click', function () {
    if (!SR) { setStatus('בדפדפן הזה אין זיהוי דיבור. בטלפון אפשר ללחוץ על המיקרופון שבמקלדת, ובמחשב לפתוח את הדף בכרום.', true); return; }
    if (recOn && rec) { rec.stop(); return; }
    var code = micLang();
    base = src.value ? src.value.replace(/\s*$/, ' ') : '';
    recOn = true; micBtn.setAttribute('aria-pressed', 'true');
    setStatus('מקשיב ב' + NAME[code] + '… לוחצים שוב כדי לעצור');
    track('mic');
    try {
      rec = listen(code, function (fin) { base += fin + ' '; src.value = base; schedule(); },
        function (tmp) { src.value = base + tmp; updCount(); },
        function () { recOn = false; micBtn.setAttribute('aria-pressed', 'false'); src.value = base.trim(); schedule(); if (/^מקשיב/.test(status.textContent)) setStatus(''); });
    } catch (e) { recOn = false; micBtn.setAttribute('aria-pressed', 'false'); }
  });

  // ---------- לשוניות ----------
  [].forEach.call(document.querySelectorAll('.tg-tab[data-tab]'), function (b) {
    b.addEventListener('click', function () {
      var box = $('tg-' + b.getAttribute('data-tab')), open = box.hidden;
      box.hidden = !open; b.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) track(b.getAttribute('data-tab'));
    });
  });
  var bigBtn = $('tg-big');
  function setBig() { app.classList.toggle('tg-big', !!st.big); bigBtn.setAttribute('aria-pressed', st.big ? 'true' : 'false'); }
  bigBtn.addEventListener('click', function () { st.big = !st.big; save(); setBig(); });
  setBig();

  // ---------- מילון אישי ----------
  function li(main, sub, onPick, onDel) {
    var el = document.createElement('li');
    var t = document.createElement('button'); t.type = 'button'; t.className = 'tg-li-t';
    t.textContent = main;
    if (sub) { var sm = document.createElement('small'); sm.textContent = sub; t.appendChild(sm); }
    if (onPick) t.addEventListener('click', onPick); else t.disabled = true;
    var d = document.createElement('button'); d.type = 'button'; d.className = 'tg-del'; d.textContent = '✕'; d.setAttribute('aria-label', 'למחוק');
    d.addEventListener('click', onDel);
    el.appendChild(t); el.appendChild(d);
    return el;
  }
  function drawGl() {
    var ul = $('tg-gl-list'); ul.textContent = '';
    st.gl.forEach(function (g, i) {
      ul.appendChild(li(g.a + '  ←  ' + g.b, '', null, function () { st.gl.splice(i, 1); save(); drawGl(); lastKey = ''; schedule(); }));
    });
  }
  $('tg-gl-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var a = $('tg-gl-a').value.trim(), b = $('tg-gl-b').value.trim();
    if (!a || !b) return;
    st.gl = st.gl.filter(function (g) { return g.a.toLowerCase() !== a.toLowerCase(); });
    st.gl.push({ a: a, b: b }); save(); drawGl();
    $('tg-gl-a').value = ''; $('tg-gl-b').value = ''; $('tg-gl-a').focus();
    lastKey = ''; schedule(); track('glossary');
  });
  drawGl();

  // ---------- היסטוריה ----------
  var histT = null;
  function remember(s, t, a, b) {
    clearTimeout(histT);
    histT = setTimeout(function () {
      if (st.hist[0] && st.hist[0].s === s && st.hist[0].b === b) return;
      // הקלדה נמשכת: מחליפים את הרשומה האחרונה אם היא תחילת אותו טקסט
      if (st.hist[0] && s.indexOf(st.hist[0].s) === 0 && Date.now() - st.hist[0].at < 120000) st.hist.shift();
      st.hist.unshift({ s: s.slice(0, 2000), t: t.slice(0, 3000), a: a, b: b, at: Date.now() });
      st.hist = st.hist.slice(0, 40); save(); drawHist();
    }, 2500);
  }
  function drawHist() {
    var ul = $('tg-hist-list'); ul.textContent = '';
    st.hist.forEach(function (h, i) {
      var cut = function (x) { return x.length > 90 ? x.slice(0, 90) + '…' : x; };
      ul.appendChild(li(cut(h.s), (NAME[h.a] || h.a) + ' ← ' + (NAME[h.b] || h.b) + ': ' + cut(h.t), function () {
        selFrom.value = h.a; selTo.value = h.b; st.from = h.a; st.to = h.b;
        src.value = h.s; out.textContent = h.t; out.dir = dirOf(h.b); out.lang = h.b;
        lastKey = h.a + '|' + h.b + '|' + h.s.trim() + '|' + JSON.stringify(st.gl);
        st.src = h.s; save(); updCount(); window.scrollTo({ top: app.offsetTop - 70, behavior: 'smooth' });
      }, function () { st.hist.splice(i, 1); save(); drawHist(); }));
    });
  }
  $('tg-hist-clear').addEventListener('click', function () { st.hist = []; save(); drawHist(); });
  drawHist();

  // ---------- מצב שיחה ----------
  var convA = 'he', convB = 'en', convRec = null;
  function setConvLabels() {
    var f = selFrom.value, t = selTo.value;
    var other = f !== 'he' && f !== 'auto' ? f : (t !== 'he' ? t : lastForeign || 'en');
    convA = 'he'; convB = other === 'he' ? 'en' : other;
    $('tg-conv-a-l').textContent = NATIVE.he;
    $('tg-conv-b-l').textContent = NATIVE[convB] || NAME[convB];
  }
  setConvLabels();
  function convTurn(btn, from, to, side) {
    if (!SR) { setStatus('בדפדפן הזה אין זיהוי דיבור. מצב שיחה עובד בכרום ובאדג׳.', true); return; }
    if (convRec) { convRec.stop(); return; }
    btn.classList.add('on');
    track('conv');
    var got = '';
    try {
      convRec = listen(from, function (fin) { got += fin + ' '; }, null, async function () {
        convRec = null; btn.classList.remove('on');
        got = got.trim(); if (!got) return;
        var item = document.createElement('li'); item.className = side; item.textContent = got;
        var sm = document.createElement('small'); sm.textContent = '…'; item.appendChild(sm);
        var log = $('tg-conv-log'); log.insertBefore(item, log.firstChild);
        try {
          var res = await translateText(got, from, to, true);
          sm.textContent = res; speak(res, to);
        } catch (e) { sm.textContent = e && e.needClick ? 'לוחצים שוב – כרום מוריד את מודל התרגום' : 'התרגום לא הצליח'; }
      });
    } catch (e) { convRec = null; btn.classList.remove('on'); }
  }
  $('tg-conv-a').addEventListener('click', function () { convTurn(this, convA, convB, 'a'); });
  $('tg-conv-b').addEventListener('click', function () { convTurn(this, convB, convA, 'b'); });

  // ---------- פתיחה ----------
  var q = null;
  try { q = new URLSearchParams(location.search).get('q'); } catch (e) {}
  if (q) { src.value = q.slice(0, 20000); schedule(); }
  else if (st.src) { src.value = st.src; updCount(); schedule(); }
  else if (!st.seen) {
    // דוגמה מלאה בכניסה הראשונה
    src.value = EX_SRC; updCount();
    out.textContent = EX_OUT;
    var ex = document.createElement('span'); ex.className = 'tg-ex'; ex.textContent = 'זו דוגמה. כתבו, הדביקו או הקליטו טקסט משלכם.';
    out.appendChild(ex); out.dir = 'rtl'; out.lang = 'he';
    st.seen = true; save();
    lastKey = 'en|he|' + EX_SRC + '|' + JSON.stringify(st.gl);
    src.addEventListener('focus', function once() { src.removeEventListener('focus', once); if (src.value === EX_SRC) src.select(); });
  }
  if (!HAS_T) engineEl.textContent = 'בדפדפן הזה התרגום עובר דרך שירות תרגום חינמי. בכרום במחשב התרגום נעשה בתוך המחשב – פרטי, מהיר ובלי הגבלה.';
  else engineEl.textContent = '🔒 בדפדפן הזה התרגום נעשה בתוך המחשב. הטקסט לא נשלח לשום מקום.';
})();
