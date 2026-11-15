// ג׳ימייל: כפתור "✍ ניסוח" בכל חלון כתיבת מייל. בוחרים סוג מייל, ממלאים כמה פרטים,
// והנושא (אחד מ-3) וגוף המייל נכנסים לחלון. הנוסחים מהכלי באתר (hakelim.com/kelim/tochen/mail/),
// המילוי ב-mail-fill.js (אותו מנוע כמו באתר). התוסף לא קורא את המיילים ולא שולח כלום לשום שרת.
(function () {
  'use strict';
  if (!window.HKMail) return;
  var D = null, host = null, sh = null, cur = null;
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
    '.p{position:fixed;z-index:2147483000;width:380px;max-width:calc(100vw - 16px);max-height:min(640px,calc(100vh - 24px));overflow:auto;direction:rtl;background:#16130f;color:#efe6d2;border:1px solid #c9a55c;border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,.45);padding:12px 14px;font-size:13px}' +
    'h2{margin:0 0 8px;font-size:15px;color:#c9a55c;display:flex;justify-content:space-between;align-items:center}' +
    '.x{background:none;border:0;color:#efe6d2;font-size:18px;cursor:pointer;padding:0 4px}' +
    'select,input,textarea{width:100%;font-size:13px;color:#efe6d2;background:#221d16;border:1px solid #4a4033;border-radius:8px;padding:6px 8px}' +
    'select:focus,input:focus,textarea:focus,button:focus-visible{outline:2px solid #c9a55c;outline-offset:1px}' +
    'label{display:block;margin:6px 0 0;color:#b9ae98;font-size:12px}' +
    '.seg{display:flex;gap:4px;flex-wrap:wrap;margin:8px 0 2px}.seg button{border:1px solid #4a4033;background:transparent;color:#efe6d2;border-radius:99px;padding:4px 10px;font-size:12px;cursor:pointer}.seg button[aria-pressed=true]{background:#c9a55c;color:#16130f;border-color:#c9a55c;font-weight:700}' +
    '.f{display:grid;grid-template-columns:1fr 1fr;gap:0 8px}.f .w{grid-column:1/-1}' +
    '.sub{display:flex;gap:6px;align-items:flex-start;margin:4px 0;padding:6px 8px;border:1px solid #4a4033;border-radius:8px;cursor:pointer;color:#efe6d2;font-size:12.5px}.sub input{width:auto;margin-top:2px;accent-color:#c9a55c}' +
    '.h{margin:10px 0 4px;color:#c9a55c;font-weight:700;font-size:12.5px}' +
    'textarea.b{min-height:120px;line-height:1.5}' +
    '.go{display:flex;gap:6px;margin-top:10px}.go button{flex:1;border:0;border-radius:99px;padding:8px 10px;font-weight:700;cursor:pointer;font-size:13px}.ok{background:#c9a55c;color:#16130f}.ln{background:transparent!important;color:#efe6d2!important;border:1px solid #4a4033!important;font-weight:400!important}' +
    '.n{background:rgba(230,180,80,.14);border:1px solid rgba(230,180,80,.4);border-radius:8px;padding:6px 8px;margin-top:6px;font-size:12px}.m{min-height:1.2em;color:#c9a55c;margin:6px 0 0;font-size:12px}.s{color:#8f8573;font-size:11px;margin-top:6px}a{color:#c9a55c}';

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
      host = document.createElement('div'); host.setAttribute('data-hk-nusach-panel', '1');
      sh = host.attachShadow({ mode: 'open' });
      sh.appendChild(el('style', { text: CSS }));
      sh.appendChild(el('div', { cls: 'p', role: 'dialog', 'aria-label': 'ניסוח מייל' }));
      document.body.appendChild(host);
      var r = btn.getBoundingClientRect(), p = sh.querySelector('.p');
      p.style.left = Math.max(8, Math.min(r.left, innerWidth - 390)) + 'px';
      p.style.bottom = Math.max(8, innerHeight - r.top + 6) + 'px';
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
        var ph = 'למשל: ' + (f.ex || ''), v = st.vals[f.k] || '';
        var inp = f.long ? el('textarea', { rows: '2', 'data-k': f.k, placeholder: ph }) : el('input', { 'data-k': f.k, placeholder: ph });
        inp.value = v;
        return el('label', { cls: f.long ? 'w' : '' }, [f.l, inp]);
      }));
      var x = el('button', { cls: 'x', type: 'button', 'aria-label': 'סגירה', text: '✕' });
      [el('h2', {}, [el('span', { text: '✍ ניסוח מייל' }), x]),
        el('label', {}, ['איזה מייל?', sel]),
        seg('lang', [['he', 'עברית'], ['en', 'English']]),
        seg('gd', [['', 'כותב/ת'], ['m', 'אני גבר'], ['f', 'אני אישה']]),
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
    if (si) {
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

  // ---------- הכפתור בכל חלון כתיבה ----------
  function composeOf(subj) {
    var el = subj;
    for (var i = 0; i < 14 && el; i++) { el = el.parentElement; if (el && bodyOf(el)) return el; }
    return null;
  }
  function scan() {
    var subs = document.querySelectorAll('input[name="subjectbox"]');
    for (var i = 0; i < subs.length; i++) {
      var s = subs[i], c = composeOf(s);
      if (!c || c.querySelector('.hk-nusach')) continue;
      var b = document.createElement('button'); b.type = 'button'; b.className = 'hk-nusach'; b.textContent = '✍ ניסוח';
      b.title = 'נושא ומייל מוכנים: ללקוח, למרצה, התפטרות, תלונה, מחוץ למשרד ועוד (הכלים של גילעד רחמים)';
      b.addEventListener('click', (function (b, c) { return function (e) { e.preventDefault(); e.stopPropagation(); open(b, c); }; })(b, c));
      // בשורת הכפתורים למטה (ליד "שליחה"), ואם אין – מעל גוף המייל
      var bar = c.querySelector('tr.btC');
      if (bar && bar.firstElementChild) { var td = document.createElement('td'); td.className = 'hk-nusach-td'; td.appendChild(b); bar.firstElementChild.insertAdjacentElement('afterend', td); }
      else { var body = bodyOf(c); if (body && body.parentElement) body.parentElement.insertBefore(b, body); }
    }
  }
  document.addEventListener('mousedown', function (e) { if (host && !e.composedPath().includes(host) && !(e.target.closest && e.target.closest('.hk-nusach'))) close(); }, true);
  var t;
  new MutationObserver(function () { clearTimeout(t); t = setTimeout(scan, 500); }).observe(document.documentElement, { childList: true, subtree: true });
  scan();
})();
