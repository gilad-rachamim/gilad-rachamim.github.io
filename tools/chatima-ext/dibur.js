// "🎤 לדבר" בג׳ימייל ובווטסאפ ווב (תוסף "הכלים של גילעד רחמים", 3.5.0).
// מדברים בעברית, והטקסט נכנס לתיבה מסודר: פיסוק, פסקאות, בלי "אממ" ו"כאילו",
// ובמייל גם פתיחה, סיום ונושא מוצע. אפשר לערוך לפני שמכניסים, ושום דבר לא נשלח לבד.
// הדיבור הופך לטקסט במנוע הזיהוי שבתוך כרום (כמו המיקרופון בחיפוש של גוגל).
// הסידור עצמו – כאן, במחשב, בלי מודל ובלי שרת. התוסף לא שומר הקלטות.
(function () {
  'use strict';
  var W = typeof window !== 'undefined' ? window : {};
  if (W.__hkDibur) return;
  W.__hkDibur = 1;

  // ================= הסידור (פונקציה טהורה – נבדקת גם מחוץ לדפדפן) =================
  var FILLERS = /(^|\s)(א+מ+|א+ה+|אהם|הממ+|אה+ם|כאילו|יעני|נו+)(?=[\s,.?!]|$)/g;
  var QWORDS = /^(מה|למה|איך|מתי|איפה|היכן|כמה|מי|האם|מדוע|לאן|מאיפה|באיזה|איזה|איזו|אילו|אפשר|יש לך|יש לכם|תוכל|תוכלי|תוכלו|הספקת|הספקתם|קיבלת|קיבלתם|ראית|ראיתם|נוח לך|נוח לכם|מתאים לך|מתאים לכם)(\s|$)/;
  var GREET = /^(שלום רב|שלום|היי|הי|הלו|בוקר טוב|צהריים טובים|ערב טוב|לילה טוב|לכבוד|שבוע טוב|שבת שלום|חג שמח|אהלן)(\s|$|,)/;
  var CLOSE = /^(תודה רבה|תודה מראש|תודה|בברכה|בתודה|להתראות|יום טוב|המשך יום טוב|שבת שלום|שבוע טוב|ביי)/;

  function spoken(t) {
    // מילים של פיסוק שאומרים בקול
    return t
      .replace(/\s*(פסקה חדשה|פיסקה חדשה)\s*/g, '\u2029')
      .replace(/\s*(שורה חדשה|ירידת שורה)\s*/g, '\u2028')
      .replace(/\s*סימן שאלה(?=\s|$)/g, '?')
      .replace(/\s*סימן קריאה(?=\s|$)/g, '!')
      .replace(/\s*נקודתיים(?=\s|$)/g, ':')
      .replace(/\s*פסיק(?=\s|$)/g, ',')
      .replace(/\s*נקודה(?=\s|$)/g, '.');
  }
  function clean(t) {
    t = (' ' + t + ' ').replace(FILLERS, '$1').replace(FILLERS, '$1');
    t = t.replace(/(^|\s)(\S+)(\s+\2)+(?=\s|$)/g, '$1$2'); // "אני אני" → "אני"
    t = t.replace(/[ \t]+/g, ' ').replace(/ ([,.?!:])/g, '$1').replace(/([,.?!:])(?=[^\s\d,.?!:\u2028\u2029])/g, '$1 ');
    t = t.replace(/^[ \t,]+/, '').replace(/,+([.?!])/g, '$1').replace(/,{2,}/g, ',');
    return t.replace(/^[ \t]+|[ \t]+$/g, '');
  }
  function endMark(s) {
    if (/[.?!:]$/.test(s)) return s;
    s = s.replace(/,$/, '');
    return s + (QWORDS.test(s) || /(נכון|בסדר)$/.test(s) && /^(זה|אז|ו?הכל)\b/.test(s) ? '?' : '.');
  }
  // הקטעים מגיעים מהזיהוי לפי הפסקות בדיבור – כל קטע הוא בערך משפט
  function sentences(parts) {
    var out = [];
    parts.forEach(function (p) {
      p = clean(spoken(p)); if (!p) return;
      p.split(/(?<=[.?!])\s+|(?=[\u2028\u2029])|(?<=[\u2028\u2029])/).forEach(function (s) {
        if (/[\u2028\u2029]/.test(s) && !s.replace(/[\s\u2028\u2029]/g, '')) { out.push(s.replace(/[^\u2028\u2029]/g, '').charAt(0)); return; }
        s = s.trim(); if (!s) return;
        out.push(endMark(s));
      });
    });
    return out;
  }
  function wordsN(s, n) { var w = s.replace(/[.?!:,]+$/, '').split(/\s+/); return w.slice(0, n).join(' ') + (w.length > n ? '…' : ''); }
  var SMALL = /^(מה שלומ|מה נשמע|מה קורה|מה העניינים|מה המצב|מקווה ש|אני מקווה ש)/;
  var LEAD = /^(אני רק |רק )?(רציתי|אני רוצה|רציתי רק|אני פונה|פונה|אני כותב|אני כותבת)( אליך| אליכם| אלייך)?\s*(לשאול|לבקש|לעדכן|לברר|להגיד|לספר|להודיע|לבדוק)?\s*(אם |ש(?=\S))?/;
  function core(x) { return x.replace(LEAD, '').replace(/^(לגבי|בנוגע ל|בעניין|בקשר ל)\s*/, ''); }
  function subjects(body) {
    var s = body.filter(function (x) { return x.length > 2 && !GREET.test(x) && !CLOSE.test(x) && !SMALL.test(x); });
    if (!s.length) return [];
    var all = s.join(' '), out = [], m, f;
    function first(re) { for (var i = 0; i < s.length; i++) if (re.test(s[i])) return s[i]; return ''; }
    if ((m = all.match(/(?:לגבי|בנוגע ל|בעניין|בקשר ל|בנושא)\s*([^.?!,]{2,40})/))) out.push('בעניין ' + wordsN(m[1], 5));
    if ((f = first(/(לבקש|בקשה|אשמח אם|אפשר לקבל|אבקש)/))) out.push('בקשה: ' + wordsN(core(f), 6));
    else if ((f = first(/(\?$|לשאול|לברר)/))) out.push('שאלה: ' + wordsN(core(f), 6));
    else if ((f = first(/(לעדכן|להודיע|עדכון)/))) out.push('עדכון: ' + wordsN(core(f), 6));
    out.push(wordsN(core(s[0]), 7));
    var seen = {};
    return out.map(function (x) { return x.replace(/[.,?!]+$/, '').replace(/\s+/g, ' ').trim(); })
      .filter(function (x) {
        var k = x.replace(/^(בעניין|שאלה:|בקשה:|עדכון:)\s*/, '').replace(/…$/, '').split(' ').slice(0, 3).join(' ');
        if (x.length < 2 || seen[k]) return false; seen[k] = 1; return true;
      }).slice(0, 3);
  }
  // mode: 'wa' – הודעה קצרה; 'mail' – מייל עם פתיחה, פסקאות וסיום
  function tidy(parts, mode, o) {
    o = o || {};
    if (typeof parts === 'string') parts = [parts];
    var S = sentences(parts);
    if (mode !== 'mail') {
      var t = S.join(' ').replace(/ ?\u2028 ?/g, '\n').replace(/ ?\u2029 ?/g, '\n\n').trim();
      if (!o.keepDot) t = t.replace(/\.$/, '');
      return { body: t, subjects: [] };
    }
    S = S.filter(function (s) { return s !== '\u2028'; });
    var greet = '', close = [], body = S.slice();
    while (body.length && body[0] !== '\u2029' && GREET.test(body[0]) && !greet) {
      // "שלום דני מה שלומך" → הפתיחה "שלום דני," ומה שאחריה נשאר בגוף
      var g = body.shift(), m = g.match(/^(שלום רב|שלום|היי|הי|הלו|בוקר טוב|צהריים טובים|ערב טוב|לכבוד|שבוע טוב|שבת שלום|חג שמח|אהלן)\s*([^\s.,?!]+)?\s*[.,!]?\s*(.*)$/);
      var name = m && m[2] && !QWORDS.test(m[2] + ' ') ? m[2] : '';
      greet = (m ? m[1] : g.replace(/[.!]$/, '')) + (name ? ' ' + name : '') + ',';
      var rest = m ? (m[2] && !name ? m[2] + ' ' : '') + m[3] : '';
      if (rest.trim()) body.unshift(endMark(rest.trim().replace(/^[,.]\s*/, '').replace(/\.$/, '')));
    }
    while (body.length && (body[body.length - 1] === '\u2029' || CLOSE.test(body[body.length - 1]))) {
      var c = body.pop(); if (c !== '\u2029') close.unshift(c);
    }
    if (!greet) greet = 'שלום' + (o.to ? ' ' + o.to : '') + ',';
    // פסקאות: איפה שאמרו "פסקה חדשה", ואחרת כל 3 משפטים
    var paras = [[]];
    body.forEach(function (s) {
      if (s === '\u2029') { if (paras[paras.length - 1].length) paras.push([]); return; }
      if (paras[paras.length - 1].length >= 3 && !o.oneP) paras.push([]);
      paras[paras.length - 1].push(s);
    });
    paras = paras.filter(function (p) { return p.length; }).map(function (p) { return p.join(' '); });
    var thanks = close.filter(function (c) { return /^תודה/.test(c); })[0];
    var bye = close.filter(function (c) { return !/^תודה/.test(c) && !/^בברכה/.test(c); })[0];
    var end = [];
    if (thanks) end.push(thanks.replace(/[.,]$/, '') + (/!$/.test(thanks) ? '' : '!'));
    if (bye) end.push(bye.replace(/[.,!]$/, '') + '!');
    end.push('בברכה,'); if (o.name) end.push(o.name);
    var out = [greet, ''].concat(paras.reduce(function (a, p, i) { if (i) a.push(''); a.push(p); return a; }, []), [''], end);
    return { body: out.join('\n').replace(/\n{3,}/g, '\n\n').trim(), subjects: subjects(body.filter(function (s) { return s !== '\u2029'; })) };
  }
  W.HKDibur = { tidy: tidy };
  if (typeof module !== 'undefined' && module.exports) { module.exports = W.HKDibur; return; }
  if (typeof chrome === 'undefined' || !chrome.storage) return;

  // ================= ההקלטה =================
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var HOST = W.__hkDiburHost || location.hostname; // __hkDiburHost: רק לדף בדיקה מקומי
  var isMail = HOST === 'mail.google.com', isWa = HOST === 'web.whatsapp.com';
  if (!isMail && !isWa) return;
  var st = { name: '', frame: true };
  chrome.storage.local.get('diburSt').then(function (o) { if (o.diburSt) for (var k in o.diburSt) st[k] = o.diburSt[k]; }).catch(function () {});
  function save() { try { chrome.storage.local.set({ diburSt: st }); } catch (e) {} }

  var rec = null, want = false, parts = [], interim = '', onUpd = null, onState = null;
  function startRec() {
    if (!SR) { onState && onState('nosr'); return; }
    want = true; interim = '';
    rec = new SR(); rec.lang = 'he-IL'; rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = 1;
    rec.onresult = function (e) {
      interim = '';
      for (var i = e.resultIndex; i < e.results.length; i++) {
        var t = e.results[i][0].transcript;
        if (e.results[i].isFinal) { if (t.trim()) parts.push(t.trim()); } else interim += t;
      }
      onUpd && onUpd();
    };
    rec.onerror = function (e) {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      want = false; onState && onState(e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'deny' : e.error === 'network' ? 'net' : 'err');
    };
    // כרום עוצר את ההקלטה אחרי שתיקה – אם עוד לא לחצו "סיימתי", ממשיכים להקשיב
    rec.onend = function () { if (want) { try { rec.start(); return; } catch (e) {} } rec = null; onState && onState('stop'); };
    try { rec.start(); onState && onState('on'); } catch (e) { onState && onState('err'); }
  }
  function stopRec() { want = false; if (interim.trim()) { parts.push(interim.trim()); interim = ''; } if (rec) try { rec.stop(); } catch (e) {} else onState && onState('stop'); }

  // ================= החלון =================
  function el(tag, props, kids) {
    var e = document.createElement(tag);
    for (var k in (props || {})) {
      if (k === 'text') e.textContent = props[k];
      else if (k === 'cls') e.className = props[k];
      else if (k === 'on') for (var ev in props.on) e.addEventListener(ev, props.on[ev]);
      else if (props[k] !== false && props[k] != null) e.setAttribute(k, props[k] === true ? '' : props[k]);
    }
    (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  var CSS = ':host{all:initial}*{box-sizing:border-box;font-family:Arial,"Segoe UI",sans-serif}' +
    '.p{position:fixed;z-index:2147483000;width:400px;max-width:calc(100vw - 16px);max-height:min(660px,calc(100vh - 24px));overflow:auto;direction:rtl;background:#16130f;color:#efe6d2;border:1px solid #c9a55c;border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,.45);padding:12px 14px;font-size:15px}' +
    'h2{margin:0 0 8px;font-size:15px;color:#c9a55c;display:flex;justify-content:space-between;align-items:center}' +
    '.x{background:none;border:0;color:#efe6d2;font-size:18px;cursor:pointer;padding:0 4px}' +
    'input,textarea{width:100%;font-size:15px;color:#efe6d2;background:#221d16;border:1px solid #8a7448;border-radius:8px;padding:6px 8px}' +
    'input:focus,textarea:focus,button:focus-visible{outline:2px solid #c9a55c;outline-offset:1px}' +
    'label{display:block;margin:6px 0 0;color:#b9ae98;font-size:14.5px}' +
    '.live{min-height:70px;max-height:160px;overflow:auto;background:#221d16;border:1px solid #8a7448;border-radius:8px;padding:8px;line-height:1.6;font-size:16px;white-space:pre-wrap}.live i{color:#8f8573;font-style:normal}' +
    '.mic{display:flex;align-items:center;gap:10px;margin:2px 0 8px}.dot{width:14px;height:14px;border-radius:50%;background:#e53935;box-shadow:0 0 0 0 rgba(229,57,53,.6);animation:pu 1.2s infinite}.dot.off{background:#6b6252;animation:none}' +
    '@keyframes pu{0%{box-shadow:0 0 0 0 rgba(229,57,53,.6)}70%{box-shadow:0 0 0 10px rgba(229,57,53,0)}100%{box-shadow:0 0 0 0 rgba(229,57,53,0)}}' +
    '@media (prefers-reduced-motion:reduce){.dot{animation:none}}' +
    '.h{margin:10px 0 4px;color:#c9a55c;font-weight:700;font-size:15px}' +
    '.sub{display:flex;gap:6px;align-items:flex-start;margin:4px 0;padding:6px 8px;border:1px solid #8a7448;border-radius:8px;cursor:pointer;color:#efe6d2;font-size:15px}.sub input{width:auto;margin-top:2px;accent-color:#c9a55c}' +
    'textarea.b{min-height:150px;line-height:1.55;resize:vertical}' +
    '.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:6px}.row label{margin:0;display:flex;gap:5px;align-items:center;color:#efe6d2}.row input[type=checkbox]{width:auto;accent-color:#c9a55c}' +
    '.go{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap}.go button{flex:1;border:0;border-radius:99px;padding:8px 10px;font-weight:700;cursor:pointer;font-size:15px;white-space:nowrap}.ok{background:#c9a55c;color:#16130f}.ln{background:transparent!important;color:#efe6d2!important;border:1px solid #8a7448!important;font-weight:400!important}' +
    '.m{min-height:1.2em;color:#c9a55c;margin:6px 0 0;font-size:14.5px}.s{color:#8f8573;font-size:13.5px;margin-top:6px;line-height:1.5}' +
    '.fab{position:fixed;z-index:2147482999;border:1px solid #c9a55c;border-radius:99px;background:#fff8e6;color:#3d2f12;font:700 15px Arial,sans-serif;padding:6px 11px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.25);direction:rtl}.fab:hover{background:#c9a55c;color:#16130f}' +
    // נגישות: כפתורים גדולים, פוקוס בולט, גבולות בניגודיות 3:1
    'button{min-height:36px}.x{min-width:40px;min-height:40px}button:focus-visible,select:focus-visible,input:focus-visible,textarea:focus-visible,a:focus-visible{outline:3px solid #ffd97a!important;outline-offset:2px}@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}.fab{border-color:#8a6d2f;min-height:40px}.fab:focus-visible{outline-color:#3d2f12!important}';

  var host = null, sh = null, target = null, view = 'rec', subPick = 0, edited = null;
  function close() { stopRec(); onUpd = onState = null; if (host) { host.remove(); host = null; sh = null; } }
  function open(anchor, tgt) {
    if (host) { close(); return; }
    target = tgt; parts = []; interim = ''; view = 'rec'; subPick = 0; edited = null;
    host = document.createElement('div'); host.setAttribute('data-hk-dibur-panel', '1');
    sh = host.attachShadow({ mode: 'open' });
    sh.appendChild(el('style', { text: CSS }));
    var p = el('div', { cls: 'p', role: 'dialog', 'aria-label': 'לדבר – והוא מסדר' });
    sh.appendChild(p); document.body.appendChild(host);
    var r = anchor.getBoundingClientRect();
    p.style.left = Math.max(8, Math.min(r.left, innerWidth - 410)) + 'px';
    p.style.bottom = Math.max(8, innerHeight - r.top + 6) + 'px';
    p.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } });
    onUpd = function () { if (view === 'rec') drawLive(); };
    onState = function (s) {
      if (!sh) return;
      var dot = sh.querySelector('.dot'), lb = sh.querySelector('.st'), m = sh.querySelector('.m');
      if (s === 'on') { if (dot) dot.className = 'dot'; if (lb) lb.textContent = 'מקשיב… מדברים בחופשיות'; }
      if (s === 'stop') { if (view === 'rec') { if (parts.length) { view = 'out'; draw(); } else { if (dot) dot.className = 'dot off'; if (lb) lb.textContent = m.textContent ? 'ההקלטה נעצרה.' : 'לא שמעתי כלום. לוחצים "להקליט שוב".'; } } }
      if (s === 'deny') { if (dot) dot.className = 'dot off'; m.textContent = 'כרום לא קיבל גישה למיקרופון. לוחצים על סמל המנעול 🔒 ליד הכתובת ← מיקרופון ← לאשר, ומנסים שוב.'; }
      if (s === 'net') { if (dot) dot.className = 'dot off'; m.textContent = 'זיהוי הדיבור של כרום צריך אינטרנט. בודקים חיבור ומנסים שוב.'; }
      if (s === 'nosr') { m.textContent = 'בדפדפן הזה אין זיהוי דיבור. עובד בכרום במחשב.'; }
      if (s === 'err') { if (dot) dot.className = 'dot off'; m.textContent = 'ההקלטה נעצרה. מנסים שוב.'; }
    };
    draw(); startRec();
  }
  function drawLive() {
    var lv = sh && sh.querySelector('.live'); if (!lv) return;
    while (lv.firstChild) lv.removeChild(lv.firstChild);
    lv.appendChild(document.createTextNode(parts.join(' ') + (parts.length && interim ? ' ' : '')));
    if (interim) lv.appendChild(el('i', { text: interim }));
    if (!parts.length && !interim) lv.appendChild(el('i', { text: isMail ? 'למשל: "שלום דני רציתי לשאול לגבי החשבונית של אוקטובר נקודה תודה"' : 'למשל: "אני מאחר בעשר דקות סימן שאלה מתאים לך"' }));
    lv.scrollTop = lv.scrollHeight;
  }
  function result() { return tidy(parts, isMail ? 'mail' : 'wa', { name: st.frame ? st.name : '', to: '' }); }
  function draw() {
    var p = sh.querySelector('.p'); while (p.firstChild) p.removeChild(p.firstChild);
    var x = el('button', { cls: 'x', type: 'button', 'aria-label': 'סגירה', text: '✕', on: { click: close } });
    p.appendChild(el('h2', {}, [el('span', { text: '🎤 לדבר – והוא מסדר' }), x]));
    if (view === 'rec') {
      p.appendChild(el('div', { cls: 'mic' }, [el('span', { cls: 'dot', 'aria-hidden': 'true' }), el('span', { cls: 'st', role: 'status', text: 'מתחבר למיקרופון…' })]));
      p.appendChild(el('div', { cls: 'live', 'aria-live': 'polite' }));
      p.appendChild(el('div', { cls: 'go' }, [
        el('button', { cls: 'ok', type: 'button', text: '✓ סיימתי – לסדר', on: { click: function () { if (!parts.length && !interim.trim()) { stopRec(); return; } view = 'out'; stopRec(); draw(); } } }),
        el('button', { cls: 'ln', type: 'button', text: 'להקליט שוב', on: { click: function () { stopRec(); parts = []; interim = ''; setTimeout(function () { if (sh) { draw(); startRec(); } }, 250); } } })
      ]));
      p.appendChild(el('p', { cls: 'm', role: 'status' }));
      p.appendChild(el('p', { cls: 's', text: 'אפשר לומר בקול "נקודה", "פסיק", "סימן שאלה", "שורה חדשה" ו"פסקה חדשה". את השאר הוא מסדר לבד.' }));
      drawLive(); var b = p.querySelector('.ok'); if (b) b.focus();
      return;
    }
    var r = result();
    if (isMail) {
      p.appendChild(el('div', { cls: 'row' }, [
        el('label', {}, [el('input', { type: 'checkbox', checked: st.frame, on: { change: function (e) { st.frame = e.target.checked; save(); edited = null; draw(); } } }), 'פתיחה וסיום']),
        el('label', { style: 'flex:1' }, ['בשם:', el('input', { value: st.name, placeholder: 'השם שלכם לסיום', 'aria-label': 'השם שלכם לסיום', style: 'flex:1', on: { change: function (e) { st.name = e.target.value.trim(); save(); edited = null; draw(); } } })])
      ]));
      if (!st.frame) r.body = r.body.replace(/^[^\n]*\n\n/, '').replace(/\n\n(תודה[^\n]*\n)?([^\n]*!\n)?בברכה,(\n[^\n]*)?$/, '');
      if (r.subjects.length) {
        p.appendChild(el('div', { cls: 'h', text: 'נושא מוצע' }));
        var subs = el('div', { role: 'radiogroup', 'aria-label': 'נושא' });
        if (subPick > r.subjects.length - 1) subPick = 0;
        r.subjects.forEach(function (s, i) {
          subs.appendChild(el('label', { cls: 'sub' }, [el('input', { type: 'radio', name: 'hk-dsub', value: String(i), checked: i === subPick, on: { change: function () { subPick = i; } } }), el('span', { dir: 'auto', text: s })]));
        });
        p.appendChild(subs);
      }
    }
    p.appendChild(el('div', { cls: 'h', text: isMail ? 'המייל המסודר (אפשר לתקן כאן)' : 'ההודעה המסודרת (אפשר לתקן כאן)' }));
    var ta = el('textarea', { cls: 'b', 'aria-label': 'הטקסט המסודר', dir: 'rtl', on: { input: function (e) { edited = e.target.value; } } });
    ta.value = edited != null ? edited : r.body; p.appendChild(ta);
    p.appendChild(el('div', { cls: 'go' }, [
      el('button', { cls: 'ok', type: 'button', text: isMail ? 'להכניס למייל' : 'להכניס לתיבה', on: { click: function () { insert(ta.value, isMail ? r.subjects[subPick] : ''); } } }),
      el('button', { cls: 'ln', type: 'button', text: '🎤 להוסיף עוד', on: { click: function () { view = 'rec'; edited = null; draw(); startRec(); } } }),
      el('button', { cls: 'ln', type: 'button', text: 'כמו שאמרתי', title: 'בלי הסידור – בדיוק המילים שנקלטו', on: { click: function () { edited = parts.join(' '); ta.value = edited; } } })
    ]));
    p.appendChild(el('p', { cls: 'm', role: 'status' }));
    p.appendChild(el('p', { cls: 's', text: isWa ? 'ההודעה רק נכנסת לתיבה – שולחים בעצמכם. הסידור נעשה במחשב, והתוסף לא שומר הקלטות.' : 'המייל רק נכנס לחלון – שולחים בעצמכם. הסידור נעשה במחשב, והתוסף לא שומר הקלטות.' }));
    ta.focus(); ta.setSelectionRange(0, 0); ta.scrollTop = 0;
  }

  // ================= הכנסה =================
  function mailBody(c) { return c.querySelector('div[contenteditable="true"][g_editable="true"]') || c.querySelector('div[contenteditable="true"][role="textbox"]'); }
  function insert(text, subj) {
    var m = sh.querySelector('.m');
    if (!text.trim()) { m.textContent = 'אין טקסט להכניס.'; return; }
    if (isWa) {
      var box = waBox();
      if (!box) { m.textContent = 'פותחים צ׳אט, ואז לוחצים שוב.'; return; }
      box.focus();
      // כמו "תזמון" ב-wa.js: insertText (בלי Enter מדומה – שלא תישלח הודעה בטעות)
      document.execCommand('insertText', false, text);
      close(); return;
    }
    var c = target;
    if (!c || !document.contains(c)) { m.textContent = 'חלון הכתיבה נסגר. פותחים מייל חדש ולוחצים שוב.'; return; }
    var si = c.querySelector('input[name="subjectbox"]');
    if (si && subj && !si.value.trim()) {
      si.focus(); si.value = subj;
      si.dispatchEvent(new Event('input', { bubbles: true })); si.dispatchEvent(new Event('change', { bubbles: true }));
    }
    var body = mailBody(c);
    if (!body) { m.textContent = 'לא מצאתי את גוף המייל.'; return; }
    try {
      body.focus();
      var box2 = el('div', { dir: 'rtl' }, text.split('\n').map(function (l) { return el('div', {}, [l ? l : el('br')]); }));
      box2.appendChild(el('div', {}, [el('br')]));
      body.insertBefore(box2, body.firstChild);
      var sel = window.getSelection(), rg = document.createRange();
      rg.setStartAfter(box2); rg.collapse(true); sel.removeAllRanges(); sel.addRange(rg);
      body.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertFromPaste' }));
      close();
    } catch (e) { m.textContent = 'לא הצלחתי להכניס. לוחצים בתוך המייל ומנסים שוב.'; }
  }

  document.addEventListener('mousedown', function (e) {
    if (host && view === 'out' && !e.composedPath().includes(host) && !(e.target.closest && e.target.closest('.hk-dibur'))) close();
  }, true);

  // ================= הכפתורים =================
  function mkBtn(onClick) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'hk-nusach hk-dibur'; b.textContent = '🎤 לדבר';
    b.title = 'מדברים, והוא כותב ומסדר: פיסוק, פסקאות, בלי "אממ" (הכלים של גילעד רחמים)';
    b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); onClick(b); });
    return b;
  }
  if (isMail) {
    var composeOf = function (subj) { var e = subj; for (var i = 0; i < 14 && e; i++) { e = e.parentElement; if (e && mailBody(e)) return e; } return null; };
    var scan = function () {
      var subs = document.querySelectorAll('input[name="subjectbox"]');
      for (var i = 0; i < subs.length; i++) {
        var c = composeOf(subs[i]);
        if (!c || c.querySelector('.hk-dibur')) continue;
        var b = mkBtn((function (c) { return function (b) { open(b, c); }; })(c));
        var bar = c.querySelector('tr.btC');
        if (bar && bar.firstElementChild) { var td = document.createElement('td'); td.className = 'hk-nusach-td'; td.appendChild(b); bar.firstElementChild.insertAdjacentElement('afterend', td); }
        else { var bd = mailBody(c); if (bd && bd.parentElement) bd.parentElement.insertBefore(b, bd); }
      }
    };
    var t1;
    new MutationObserver(function () { clearTimeout(t1); t1 = setTimeout(scan, 500); }).observe(document.documentElement, { childList: true, subtree: true });
    scan();
  }
  function waBox() { return document.querySelector('#main footer div[contenteditable="true"]') || document.querySelector('#main div[contenteditable="true"][role="textbox"]'); }
  if (isWa) {
    // כפתור צף מעל תיבת הכתיבה (מחוץ לעץ של ווטסאפ, כדי לא לשבור אותו)
    var fh = document.createElement('div'); fh.setAttribute('data-hk-dibur-fab', '1');
    var fs = fh.attachShadow({ mode: 'open' }); fs.appendChild(el('style', { text: CSS }));
    var fb = el('button', { cls: 'fab', type: 'button', 'aria-label': 'לדבר – והוא מסדר את ההודעה', title: 'מדברים, והוא כותב ומסדר את ההודעה (הכלים של גילעד רחמים)', text: '🎤 לדבר', hidden: true });
    fb.addEventListener('click', function (e) { e.preventDefault(); open(fb, null); });
    fs.appendChild(fb); (document.body || document.documentElement).appendChild(fh);
    var place = function () {
      var f = document.querySelector('#main footer'), r = f && f.getBoundingClientRect();
      if (!r || !r.width) { fb.hidden = true; return; }
      fb.hidden = false;
      var rtl = getComputedStyle(f).direction === 'rtl';
      fb.style.top = Math.max(4, r.top - 40) + 'px';
      if (rtl) { fb.style.left = (r.left + 84) + 'px'; /* מקום לכפתור 📋 */ fb.style.right = 'auto'; } else { fb.style.right = (innerWidth - r.right + 12) + 'px'; fb.style.left = 'auto'; }
    };
    setInterval(place, 800); addEventListener('resize', place); place();
  }
})();
