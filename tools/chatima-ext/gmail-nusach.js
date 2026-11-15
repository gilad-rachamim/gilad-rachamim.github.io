// ג׳ימייל: כפתור "✍ ניסוח" בכל חלון כתיבת מייל. בוחרים סוג מייל, ממלאים כמה פרטים,
// והנושא (אחד מ-3) וגוף המייל נכנסים לחלון. הנוסחים מהכלי באתר (hakelim.com/kelim/tochen/mail/),
// המילוי ב-mail-fill.js (אותו מנוע כמו באתר). התוסף לא קורא את המיילים ולא שולח כלום לשום שרת.
// בתשובה למייל ("↩ נוסח תשובה"): לפי כתובת השולח ונושא המייל בלבד – שניהם מוצגים על המסך – מזהים את הגוף
// (ביטוח לאומי, רשות המסים, בנק, עירייה...) ואת מספר התיק, וממלאים מראש. גוף המייל לא נקרא. הכול במחשב.
// ליד קבצים מצורפים במייל פתוח: "📁 לשמור הכול בדרייב" – לוחץ בשבילכם על "הוספה לדרייב" של ג׳ימייל.
(function () {
  'use strict';
  if (!window.HKMail) return;
  var D = null, host = null, sh = null, cur = null, reply = null;
  var st = { t: 'pnia', lang: 'he', gd: '', vals: {}, sub: 0 };
  chrome.storage.local.get('mailSt').then(function (o) { if (o.mailSt) for (var k in o.mailSt) st[k] = o.mailSt[k]; }).catch(function () {});
  function save() { try { chrome.storage.local.set({ mailSt: st }); } catch (e) {} }
  function load() {
    if (D) return Promise.resolve(D);
    return new Promise(function (res, rej) {
      try { chrome.runtime.sendMessage({ mailTpl: 1 }, function (r) { void chrome.runtime.lastError; if (r && r.ok) { D = r.data; res(D); } else rej(); }); } catch (e) { rej(e); }
    });
  }
  function type() { for (var i = 0; i < D.types.length; i++) if (D.types[i].id === st.t) return D.types[i]; return D.types[0]; }

  // ---------- החלון הקטן (בתוך shadow DOM, כדי שהעיצוב של ג׳ימייל לא ישבור אותו) ----------
  var CSS = ':host{all:initial}*{box-sizing:border-box;font-family:Arial,"Segoe UI",sans-serif}' +
    '.p{position:fixed;z-index:2147483000;width:380px;max-width:calc(100vw - 16px);max-height:min(640px,calc(100vh - 24px));overflow:auto;direction:rtl;background:#16130f;color:#efe6d2;border:1px solid #c9a55c;border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,.45);padding:12px 14px;font-size:15px}' +
    'h2{margin:0 0 8px;font-size:15px;color:#c9a55c;display:flex;justify-content:space-between;align-items:center}' +
    '.x{background:none;border:0;color:#efe6d2;font-size:18px;cursor:pointer;padding:0 4px}' +
    'select,input,textarea{width:100%;font-size:15px;color:#efe6d2;background:#221d16;border:1px solid #8a7448;border-radius:8px;padding:6px 8px}' +
    'select:focus,input:focus,textarea:focus,button:focus-visible{outline:2px solid #c9a55c;outline-offset:1px}' +
    'label{display:block;margin:6px 0 0;color:#b9ae98;font-size:14.5px}' +
    '.seg{display:flex;gap:4px;flex-wrap:wrap;margin:8px 0 2px}.seg button{border:1px solid #8a7448;background:transparent;color:#efe6d2;border-radius:99px;padding:4px 10px;font-size:14.5px;cursor:pointer}.seg button[aria-pressed=true]{background:#c9a55c;color:#16130f;border-color:#c9a55c;font-weight:700}' +
    '.f{display:grid;grid-template-columns:1fr 1fr;gap:0 8px}.f .w{grid-column:1/-1}' +
    '.sub{display:flex;gap:6px;align-items:flex-start;margin:4px 0;padding:6px 8px;border:1px solid #8a7448;border-radius:8px;cursor:pointer;color:#efe6d2;font-size:15px}.sub input{width:auto;margin-top:2px;accent-color:#c9a55c}' +
    '.h{margin:10px 0 4px;color:#c9a55c;font-weight:700;font-size:15px}' +
    'textarea.b{min-height:120px;line-height:1.5}' +
    '.go{display:flex;gap:6px;margin-top:10px}.go button{flex:1;border:0;border-radius:99px;padding:8px 10px;font-weight:700;cursor:pointer;font-size:15px}.ok{background:#c9a55c;color:#16130f}.ln{background:transparent!important;color:#efe6d2!important;border:1px solid #8a7448!important;font-weight:400!important}' +
    '.r{background:rgba(201,165,92,.12);border:1px solid #c9a55c;border-radius:8px;padding:6px 8px;margin-top:6px;font-size:14.5px}.n{background:rgba(230,180,80,.14);border:1px solid rgba(230,180,80,.4);border-radius:8px;padding:6px 8px;margin-top:6px;font-size:14.5px}.m{min-height:1.2em;color:#c9a55c;margin:6px 0 0;font-size:14.5px}.s{color:#8f8573;font-size:13.5px;margin-top:6px}a{color:#c9a55c}' +
    // נגישות: כפתורים גדולים, פוקוס בולט, גבולות בניגודיות 3:1
    'button{min-height:36px}.x{min-width:40px;min-height:40px}button:focus-visible,select:focus-visible,input:focus-visible,textarea:focus-visible,a:focus-visible{outline:3px solid #ffd97a!important;outline-offset:2px}@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}';

  // בונים את החלון מאלמנטים ולא ממחרוזת HTML: ג׳ימייל מפעיל Trusted Types, שחוסם innerHTML
  function el(tag, props, kids) {
    var e = document.createElement(tag);
    for (var k in (props || {})) {
      if (k === 'text') e.textContent = props[k];
      else if (k === 'cls') e.className = props[k];
      else if (props[k] !== false && props[k] != null) e.setAttribute(k, props[k] === true ? '' : props[k]);
    }
    (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function close() { if (host) { host.remove(); host = null; sh = null; } }
  function open(btn, compose) {
    cur = compose;
    if (host) { close(); return; }
    load().then(function () {
      reply = btn.getAttribute('data-reply') ? guess() : null;
      if (reply) { st.t = reply.t; st.sub = 0; if (reply.to) st.vals.to = reply.to; if (reply.num) st.vals.num = reply.num; else if (reply.inst) st.vals.num = ''; if (reply.inst && reply.subj) st.vals.topic = reply.subj; save(); }
      host = document.createElement('div'); host.setAttribute('data-hk-nusach-panel', '1');
      sh = host.attachShadow({ mode: 'open' });
      sh.appendChild(el('style', { text: CSS }));
      sh.appendChild(el('div', { cls: 'p', role: 'dialog', 'aria-label': btn.getAttribute('data-reply') ? 'נוסח תשובה' : 'ניסוח מייל' }));
      document.body.appendChild(host);
      var r = btn.getBoundingClientRect(), p = sh.querySelector('.p');
      p.style.left = Math.max(8, Math.min(r.left, innerWidth - 390)) + 'px';
      // מעל הכפתור, בגובה שנכנס במסך; אם אין מקום מעליו – מתחתיו
      if (r.top >= 300 || r.top > innerHeight - r.bottom) { p.style.bottom = Math.max(8, innerHeight - r.top + 6) + 'px'; p.style.maxHeight = Math.min(640, r.top - 14) + 'px'; }
      else { p.style.top = (r.bottom + 6) + 'px'; p.style.maxHeight = Math.min(640, innerHeight - r.bottom - 14) + 'px'; }
      draw(true);
      var sel = sh.querySelector('select'); if (sel) sel.focus();
    }, function () { alert('הנוסחים לא נטענו. מרעננים את ג׳ימייל ומנסים שוב.'); });
  }
  function seg(g, items) {
    return el('div', { cls: 'seg', 'data-g': g, hidden: g === 'gd' && st.lang !== 'he' }, items.map(function (it) {
      return el('button', { type: 'button', 'data-v': it[0], 'aria-pressed': String(st[g] === it[0]), text: it[1] });
    }));
  }
  function draw(full) {
    var t = type(), fs = HKMail.fields(D, t), p = sh.querySelector('.p');
    if (full) {
      while (p.firstChild) p.removeChild(p.firstChild);
      var sel = el('select', {}, D.cats.map(function (c) {
        return el('optgroup', { label: c.n }, D.types.filter(function (x) { return x.cat === c.id; }).map(function (x) {
          return el('option', { value: x.id, selected: x.id === st.t, text: x.i + ' ' + x.n });
        }));
      }));
      var fields = el('div', { cls: 'f' }, fs.map(function (f) {
        var ph = 'למשל: ' + (reply && reply.inst && f.k === 'num' ? reply.inst.num : f.ex || ''), v = st.vals[f.k] || '';
        var inp = f.long ? el('textarea', { rows: '2', 'data-k': f.k, placeholder: ph }) : el('input', { 'data-k': f.k, placeholder: ph });
        inp.value = v;
        return el('label', { cls: f.long ? 'w' : '' }, [f.l, inp]);
      }));
      var x = el('button', { cls: 'x', type: 'button', 'aria-label': 'סגירה', text: '✕' });
      [el('h2', {}, [el('span', { text: reply ? '↩ נוסח תשובה' : '✍ ניסוח מייל' }), x]),
        el('label', {}, ['איזה מייל?', sel]),
        seg('lang', [['he', 'עברית'], ['en', 'English']]),
        seg('gd', [['', 'כותב/ת'], ['m', 'אני גבר'], ['f', 'אני אישה']]),
        reply ? el('div', { cls: 'r', text: '↩ תשובה אל: ' + (reply.inst ? (reply.to || 'גוף רשמי') + ' (' + reply.dom + ')' : (reply.from || 'המייל הפתוח')) + (reply.num ? ' · מספר מהנושא: ' + reply.num : '') + '. הנושא של השיחה נשאר; הנוסח נכנס מעל המייל המצוטט.' }) : null,
        t.note ? el('div', { cls: 'n', text: '⚖ ' + t.note }) : null,
        fields,
        el('div', { cls: 'h', text: 'נושא' }), el('div', { cls: 'subs', role: 'radiogroup', 'aria-label': 'נושא' }),
        el('div', { cls: 'h', text: 'המייל (אפשר לערוך גם אחרי שנכנס)' }), el('textarea', { cls: 'b', readonly: true, 'aria-label': 'המייל' }),
        el('div', { cls: 'go' }, [el('button', { cls: 'ok', type: 'button', 'data-a': 'in', text: 'להכניס למייל' }), el('button', { cls: 'ln', type: 'button', 'data-a': 'site', text: 'עוד בכלי באתר' })]),
        el('p', { cls: 'm', role: 'status' }),
        el('p', { cls: 's', text: 'שדה ריק נכנס בסוגריים [ ] – משלימים בתוך המייל. הכול נשאר במחשב.' })
      ].forEach(function (c) { if (c) p.appendChild(c); });
      x.onclick = close;
      sel.onchange = function (e) { st.t = e.target.value; st.sub = 0; save(); draw(true); };
      p.onclick = function (e) {
        var b = e.target.closest('button'); if (!b) return;
        var g = b.parentNode.getAttribute && b.parentNode.getAttribute('data-g');
        if (g) { st[g] = b.getAttribute('data-v'); save(); draw(true); return; }
        if (b.getAttribute('data-a') === 'in') insert();
        if (b.getAttribute('data-a') === 'site') window.open('https://hakelim.com/kelim/tochen/mail/#' + st.t, '_blank', 'noopener');
      };
      p.oninput = function (e) { var k = e.target.getAttribute('data-k'); if (k) { st.vals[k] = e.target.value; save(); draw(false); } };
      p.onchange = function (e) { if (e.target.name === 'hk-sub') { st.sub = +e.target.value; save(); } };
      p.onkeydown = function (e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    }
    var r = HKMail.fill(D, t, st.lang, st.vals, st.gd), subs = p.querySelector('.subs');
    if (st.sub > r.subjects.length - 1) st.sub = 0;
    while (subs.firstChild) subs.removeChild(subs.firstChild);
    r.subjects.forEach(function (s, i) {
      subs.appendChild(el('label', { cls: 'sub' }, [el('input', { type: 'radio', name: 'hk-sub', value: String(i), checked: i === st.sub }), el('span', { dir: 'auto', text: s })]));
    });
    var b = p.querySelector('textarea.b'); b.value = r.body; b.dir = st.lang === 'en' ? 'ltr' : 'rtl';
  }

  // ---------- הכנסה לחלון הכתיבה ----------
  function bodyOf(c) { return c.querySelector('div[contenteditable="true"][g_editable="true"]') || c.querySelector('div[contenteditable="true"][role="textbox"]'); }
  function insert() {
    var c = cur, msg = sh.querySelector('.m');
    if (!c || !document.contains(c)) { msg.textContent = 'חלון הכתיבה נסגר. פותחים מייל חדש ולוחצים שוב.'; return; }
    var r = HKMail.fill(D, type(), st.lang, st.vals, st.gd), subj = r.subjects[st.sub] || r.subjects[0];
    var si = c.querySelector('input[name="subjectbox"]');
    if (si && !reply && si.offsetParent) {
      si.focus(); si.value = subj;
      si.dispatchEvent(new Event('input', { bubbles: true })); si.dispatchEvent(new Event('change', { bubbles: true }));
    }
    var body = bodyOf(c);
    if (!body) { msg.textContent = 'לא מצאתי את גוף המייל. הנושא נכנס; את המייל אפשר להעתיק מהכלי באתר.'; return; }
    try {
      body.focus();
      // בראש המייל, לפני החתימה ולפני מייל מצוטט
      var box = el('div', { dir: st.lang === 'en' ? 'ltr' : 'rtl' }, r.body.split('\n').map(function (l) { return el('div', {}, [l ? l : el('br')]); }));
      box.appendChild(el('div', {}, [el('br')]));
      body.insertBefore(box, body.firstChild);
      var sel = window.getSelection(), rg = document.createRange();
      rg.setStartAfter(box); rg.collapse(true); sel.removeAllRanges(); sel.addRange(rg);
      body.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertFromPaste' }));
      close();
    } catch (e) { msg.textContent = 'לא הצלחתי להכניס. לוחצים בתוך המייל ומנסים שוב.'; }
  }

  // ---------- תשובה: מי השולח ומה מספר התיק – רק מהכתובת ומהנושא שעל המסך ----------
  function vis(e) { return !!(e && e.offsetParent); }
  function guess() {
    var hs = [].slice.call(document.querySelectorAll('h2.hP')).filter(vis), subj = hs.length ? hs[hs.length - 1].textContent.trim() : '';
    var me = ((document.title.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/) || [])[0] || '').toLowerCase();
    var fr = [].slice.call(document.querySelectorAll('span.gD[email]')).filter(vis), f = null;
    for (var i = fr.length - 1; i >= 0; i--) if (fr[i].getAttribute('email').toLowerCase() !== me) { f = fr[i]; break; }
    var em = f ? f.getAttribute('email').toLowerCase() : '', dom = em.split('@')[1] || '', name = f ? (f.getAttribute('name') || f.textContent || '').trim() : '';
    var inst = null;
    (D.inst || []).some(function (x) {
      return x.d.some(function (d) {
        var hit = d.charAt(0) === '.' ? ('.' + dom).slice(-d.length) === d : /\./.test(d) ? dom === d || ('.' + dom).slice(-(d.length + 1)) === '.' + d : dom.indexOf(d) >= 0;
        if (hit) inst = x;
        return hit;
      });
    });
    if (!inst && /ארנונה/.test(subj)) inst = (D.inst || []).filter(function (x) { return /ארנונה/.test(x.n); })[0] || null;
    var num = (subj.match(/(?:תיק|תביעה|חשבון|לקוח|אסמכתא|שומה|פנייה|פניה|נכס|משלם|חוזה|מספר|מס['׳.]|case|ref)\s*(?:מס['׳.]?\s*|מספר\s*)?[:#]?\s*(\d[\d\-\/]{3,}\d)/i) || subj.match(/(?:^|\D)(\d{6,})(?!\d)/) || [])[1] || '';
    var t = inst ? inst.t : st.t;
    if (inst) (D.instKw || []).some(function (k) { if (new RegExp(k[1]).test(subj)) { t = k[0]; return true; } return false; });
    return { inst: inst, dom: dom, from: name, to: inst ? (inst.n || name) : '', num: num, t: t, subj: subj.replace(/^(?:re|fwd?|השב|העבר)\s*:\s*/i, '').slice(0, 90) };
  }
  function isReply(c) {
    var si = c.querySelector('input[name="subjectbox"]');
    return !si || !vis(si) || /^(?:re|השב|תשובה)\s*:/i.test(si.value || '');
  }

  // ---------- ליד קבצים מצורפים במייל פתוח: "📁 לשמור את הקבצים בדרייב" (לחיצה על הכפתור של ג׳ימייל עצמו) ----------
  var RE_DRIVE = /(?:^|\s)(?:הוספ\S*\s(?:\S+\s){0,2}?ל-?\s?(?:google\s)?(?:drive|דרייב)|שמירה\sב-?\s?(?:google\s)?(?:drive|דרייב)|add\s(?:\S+\s){0,2}?to\s(?:google\s)?drive|save\sto\s(?:google\s)?drive)/i;
  function fireAll(e, types) { types.forEach(function (t) { e.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window })); }); }
  function saveAtt(box, b) {
    [].slice.call(box.querySelectorAll('span.aZo, .aSG, .aQy')).forEach(function (a) { fireAll(a, ['mouseover', 'mouseenter']); });
    setTimeout(function () {
      var seen = {}, B = [].slice.call(box.querySelectorAll('[role=button][aria-label], [role=button][data-tooltip], button[aria-label]')).filter(function (x) {
        var l = (x.getAttribute('aria-label') || x.getAttribute('data-tooltip') || '').trim();
        if (!RE_DRIVE.test(l) || /תמונות|photos/i.test(l) || seen[l]) return false;
        seen[l] = 1; return true;
      });
      if (!B.length) { b.textContent = 'לא מצאתי "הוספה לדרייב" – עוברים עם העכבר על הקובץ'; b.disabled = false; return; }
      var i = 0;
      (function next() {
        if (i >= B.length) { b.textContent = '✓ ' + B.length + ' נשמרו בדרייב ("האחסון שלי")'; return; }
        fireAll(B[i], ['mousedown', 'mouseup', 'click']); i++; b.textContent = '⏳ ' + i + '/' + B.length; setTimeout(next, 1500);
      })();
    }, 500);
  }
  function scanAtt() {
    var boxes = document.querySelectorAll('[role=main] .aQH');
    for (var i = 0; i < boxes.length; i++) {
      var box = boxes[i];
      if (!vis(box) || (box.parentElement && box.parentElement.closest('.aQH')) || (box.previousElementSibling && box.previousElementSibling.classList.contains('hk-att'))) continue;
      var b = document.createElement('button'); b.type = 'button'; b.className = 'hk-att'; b.textContent = '📁 לשמור את הקבצים בדרייב';
      b.title = 'לוחץ בשבילכם על "הוספה לדרייב" של ג׳ימייל ליד כל קובץ מצורף. לתיקייה: "ארגון" בהודעה של ג׳ימייל (הכלים של גילעד רחמים)';
      b.addEventListener('click', (function (box, b) { return function (e) { e.preventDefault(); e.stopPropagation(); b.disabled = true; saveAtt(box, b); }; })(box, b));
      box.parentElement.insertBefore(b, box);
    }
  }

  // ---------- הכפתור בכל חלון כתיבה ----------
  function composeOf(subj) {
    var el = subj;
    for (var i = 0; i < 14 && el; i++) { el = el.parentElement; if (el && bodyOf(el)) return el; }
    return null;
  }
  function composeOfBody(bd) {
    var el = bd;
    for (var i = 0; i < 16 && el; i++) { el = el.parentElement; if (el && (el.querySelector('tr.btC') || el.querySelector('input[name="subjectbox"]'))) return el; }
    return null;
  }
  function scan() {
    var subs = document.querySelectorAll('input[name="subjectbox"]'), C = [];
    for (var i = 0; i < subs.length; i++) { var c0 = composeOf(subs[i]); if (c0 && C.indexOf(c0) < 0) C.push(c0); }
    var bodies = document.querySelectorAll('div[contenteditable="true"][g_editable="true"]');
    for (i = 0; i < bodies.length; i++) { var c1 = composeOfBody(bodies[i]); if (c1 && !C.some(function (x) { return x === c1 || x.contains(c1) || c1.contains(x); })) C.push(c1); }
    for (i = 0; i < C.length; i++) {
      var c = C[i];
      if (c.querySelector('.hk-nusach')) continue;
      var rp = isReply(c);
      var b = document.createElement('button'); b.type = 'button'; b.className = 'hk-nusach'; b.textContent = rp ? '↩ נוסח תשובה' : '✍ ניסוח';
      if (rp) b.setAttribute('data-reply', '1');
      b.title = rp ? 'נוסח תשובה רשמי: השגה, הסבר לחיוב, פריסת תשלומים, דחיית מועד, הודעה על תשלום – לביטוח לאומי, למס הכנסה, לבנק, לעירייה ועוד (הכלים של גילעד רחמים)' : 'נושא ומייל מוכנים: ללקוח, למרצה, התפטרות, תלונה, מחוץ למשרד ועוד (הכלים של גילעד רחמים)';
      b.addEventListener('click', (function (b, c) { return function (e) { e.preventDefault(); e.stopPropagation(); open(b, c); }; })(b, c));
      // בשורת הכפתורים למטה (ליד "שליחה"), ואם אין – מעל גוף המייל
      var bar = c.querySelector('tr.btC');
      if (bar && bar.firstElementChild) { var td = document.createElement('td'); td.className = 'hk-nusach-td'; td.appendChild(b); bar.firstElementChild.insertAdjacentElement('afterend', td); }
      else { var body = bodyOf(c); if (body && body.parentElement) body.parentElement.insertBefore(b, body); }
    }
  }
  document.addEventListener('mousedown', function (e) { if (host && !e.composedPath().includes(host) && !(e.target.closest && e.target.closest('.hk-nusach'))) close(); }, true);
  var t;
  function scanAll() { scan(); try { scanAtt(); } catch (e) {} }
  new MutationObserver(function () { clearTimeout(t); t = setTimeout(scanAll, 500); }).observe(document.documentElement, { childList: true, subtree: true });
  scanAll();
})();
