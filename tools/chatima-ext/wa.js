// סידור ומיפוי צ'אטים בוואטסאפ ווב (תוסף "הכלים של גילעד רחמים", 3.4.5).
// רץ רק בדף web.whatsapp.com: אחרי לחיצה בתוסף, או תמיד – אם המשתמש אישר פעם אחת.
// פרטיות: קוראים רק את רשימת הצ'אטים שעל המסך – שם, שעה, מי כתב אחרון, כמה לא נקראו.
// תוכן הודעות לא נקרא ולא נשמר. הכול נשמר רק במחשב (chrome.storage.local), ושום דבר לא נשלח לשרת.
// שום הודעה לא נשלחת לבד: "תזמון" רק פותח את הצ'אט ומכין את הטקסט בתיבה – המשתמש לוחץ "שלח".
(function () {
  'use strict';
  if (window.__hkWa) { if (window.__hkWaOpen) { window.__hkWaOpen = false; window.__hkWa.toggle(true); } return; }
  var api = window.__hkWa = {};
  var store = chrome.storage.local;
  var LANG_EN = /^en/i.test(document.documentElement.lang || '');
  var COLORS = ['#e53935', '#1e88e5', '#43a047', '#fb8c00', '#8e24aa', '#00897b', '#c9a45c', '#6d4c41'];
  var DEF_LABELS = ['לקוחות', 'משפחה', 'עבודה', 'ועד', 'קהילה'];
  var D = { map: {}, labels: DEF_LABELS.slice(), tags: {}, notes: {}, rem: [], opt: { hideMuted: true, groups: true, recent: true } };
  var tab = 'wait', open = false, scanning = false, dirty = false;

  // ---------- קריאת שורה ברשימת הצ'אטים (בלי תוכן) ----------
  var HE_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  var EN_DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  function parseWhen(s, now) {
    s = (s || '').replace(/[‎‏]/g, '').trim(); if (!s) return 0;
    var d = new Date(now), m;
    if ((m = s.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])?$/))) {
      var h = +m[1]; if (m[3]) { if (/p/i.test(m[3]) && h < 12) h += 12; if (/a/i.test(m[3]) && h === 12) h = 0; }
      d.setHours(h, +m[2], 0, 0); if (d.getTime() > now + 60000) d.setDate(d.getDate() - 1); return d.getTime();
    }
    if (/^(אתמול|yesterday)$/i.test(s)) { d.setDate(d.getDate() - 1); d.setHours(12, 0, 0, 0); return d.getTime(); }
    var w = s.replace(/^יום\s+/, '').toLowerCase(), i = HE_DAYS.indexOf(w); if (i < 0) i = EN_DAYS.indexOf(w);
    if (i >= 0) { var back = (d.getDay() - i + 7) % 7 || 7; d.setDate(d.getDate() - back); d.setHours(12, 0, 0, 0); return d.getTime(); }
    if ((m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})$/))) {
      var y = +m[3]; if (y < 100) y += 2000;
      var day = LANG_EN ? +m[2] : +m[1], mon = LANG_EN ? +m[1] : +m[2];
      return new Date(y, mon - 1, day, 12).getTime() || 0;
    }
    return 0;
  }
  var TIME_RE = /^(\d{1,2}:\d{2}(\s*[AaPp][Mm])?|אתמול|yesterday|(יום\s+)?(ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת)|sunday|monday|tuesday|wednesday|thursday|friday|saturday|\d{1,2}[./]\d{1,2}[./]\d{2,4})$/i;
  function rows() {
    var ps = document.querySelector('#pane-side'); if (!ps) return [];
    var r = ps.querySelectorAll('[role=listitem]'); if (!r.length) r = ps.querySelectorAll('[role=row]');
    return [].slice.call(r);
  }
  function rowName(row) { var t = row.querySelector('span[title]'); return t ? (t.getAttribute('title') || t.textContent || '').trim() : ''; }
  function readRow(row, now) {
    var name = rowName(row); if (!name) return null;
    var when = '';
    var leaves = row.querySelectorAll('div, span');
    for (var i = 0; i < leaves.length; i++) {
      var el = leaves[i]; if (el.children.length) continue;
      var tx = (el.textContent || '').replace(/[‎‏]/g, '').trim();
      if (tx && tx.length < 14 && TIME_RE.test(tx)) { when = tx; break; }
    }
    var tick = row.querySelector('[data-icon^="status-dblcheck"],[data-icon^="status-check"],[data-icon^="status-time"],[data-icon^="msg-dblcheck"],[data-icon^="msg-check"],[data-icon="msg-time"]');
    var read = false;
    if (tick) {
      var lab = (tick.getAttribute('aria-label') || (tick.parentElement && tick.parentElement.getAttribute('aria-label')) || '').trim();
      read = /^(read|נקראה|נקרא)$/i.test(lab) || /rgb\(83,\s*189,\s*235\)|rgb\(0,\s*157,\s*226\)/.test(getComputedStyle(tick).color || '');
    }
    var unread = 0;
    var ub = row.querySelectorAll('[aria-label]');
    for (var k = 0; k < ub.length; k++) {
      var a = ub[k].getAttribute('aria-label') || '';
      if (/unread|לא נקרא/i.test(a)) { var n = a.match(/\d+/); unread = n ? +n[0] : (unread || 1); break; }
    }
    var group = !!row.querySelector('[data-icon*="group"],[data-icon*="community"]');
    return {
      n: name, w: when, t: parseWhen(when, now), me: tick ? 1 : 0, rd: read ? 1 : 0, u: unread,
      mu: row.querySelector('[data-icon*="muted"]') ? 1 : 0, pin: row.querySelector('[data-icon*="pinned"]') ? 1 : 0,
      g: group ? 1 : 0, seen: now
    };
  }
  function collect() {
    var now = Date.now(), n = 0;
    rows().forEach(function (row) {
      var r = readRow(row, now); if (!r) return;
      var old = D.map[r.n];
      if (old && old.g && !r.g) r.g = 1;   // קבוצה נשארת קבוצה גם כשהאייקון לא נטען
      if (!old || old.w !== r.w || old.me !== r.me || old.rd !== r.rd || old.u !== r.u || old.mu !== r.mu || old.pin !== r.pin || old.g !== r.g) dirty = true;
      D.map[r.n] = r; n++; decorate(row, r.n);
    });
    return n;
  }
  function decorate(row, name) {
    var tg = D.tags[name], i = tg ? D.labels.indexOf(tg) : -1;
    if (i >= 0) { if (row.getAttribute('data-hk-tag') !== String(i % 8)) row.setAttribute('data-hk-tag', String(i % 8)); }
    else if (row.hasAttribute('data-hk-tag')) row.removeAttribute('data-hk-tag');
    var due = D.rem.some(function (x) { return x.n === name && x.at <= Date.now(); });
    if (due) row.setAttribute('data-hk-due', '1'); else if (row.hasAttribute('data-hk-due')) row.removeAttribute('data-hk-due');
  }
  function save() {
    if (!dirty) return; dirty = false;
    // לא שומרים יותר מ-3,000 צ'אטים (הישנים יוצאים)
    var keys = Object.keys(D.map);
    if (keys.length > 3000) keys.sort(function (a, b) { return (D.map[a].t || 0) - (D.map[b].t || 0); }).slice(0, keys.length - 3000).forEach(function (k) { delete D.map[k]; });
    store.set({ waMap: D.map }).catch(function () {});
  }

  // ---------- פתיחת צ'אט והכנת הודעה ----------
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function findRow(name) { return rows().filter(function (r) { return rowName(r) === name; })[0]; }
  function clickRow(row) {
    var t = row.querySelector('[role=gridcell]') || row.querySelector('span[title]') || row;
    ['mousedown', 'mouseup', 'click'].forEach(function (ev) { t.dispatchEvent(new MouseEvent(ev, { bubbles: true, cancelable: true, view: window })); });
  }
  function openName() { var h = document.querySelector('#main header span[title]') || document.querySelector('#main header span[dir="auto"]'); return h ? (h.getAttribute('title') || h.textContent || '').trim() : ''; }
  async function openChat(name) {
    if (openName() === name) return true;
    var row = findRow(name), ps = document.querySelector('#pane-side');
    if (!row && ps) {
      var keep = ps.scrollTop; ps.scrollTop = 0; await sleep(250);
      for (var i = 0; i < 80 && !row; i++) {
        row = findRow(name); if (row) break;
        var before = ps.scrollTop; ps.scrollTop += Math.max(200, ps.clientHeight * 0.7); await sleep(220);
        collect(); if (ps.scrollTop === before) break;
      }
      if (!row) ps.scrollTop = keep;
    }
    if (!row) return false;
    clickRow(row);
    for (var k = 0; k < 20; k++) { await sleep(150); if (openName() === name) return true; }
    return openName() === name;
  }
  function composeBox() { return document.querySelector('#main footer div[contenteditable="true"]') || document.querySelector('#main div[contenteditable="true"][role="textbox"]'); }
  // מכין טקסט בתיבה – רק אם הכותרת היא הצ'אט הנכון והתיבה ריקה (לא מוסיפים לטיוטה קיימת).
  async function prepare(name, text) {
    var ok = await openChat(name);
    if (!ok) return 'nochat';
    await sleep(300);
    if (openName() !== name) return 'nochat';
    var box = composeBox(); if (!box) return 'nobox';
    if ((box.innerText || '').trim()) return 'busy';
    box.focus(); document.execCommand('insertText', false, text);
    return (box.innerText || '').trim() ? 'ok' : 'nobox';
  }

  // ---------- סריקה מלאה של הרשימה (היא נטענת בחלקים בזמן גלילה) ----------
  async function scanAll() {
    var ps = document.querySelector('#pane-side'); if (!ps || scanning) return 0;
    scanning = true; draw();
    var keep = ps.scrollTop, seen = {}, total = 0;
    ps.scrollTop = 0; await sleep(400);
    for (var i = 0; i < 400; i++) {
      collect(); rows().forEach(function (r) { var n = rowName(r); if (n && !seen[n]) { seen[n] = 1; total++; } });
      setMsg('סורק… ' + total + ' צ\'אטים');
      // צעד של חצי מסך, ומחכים שוואטסאפ באמת יצייר את השורות החדשות (אחרת מדלגים על קטע ברשימה)
      var first = rows().map(rowName).join('|');
      var before = ps.scrollTop; ps.scrollTop += Math.max(150, ps.clientHeight * 0.5);
      if (ps.scrollTop === before) { await sleep(500); collect(); break; }
      for (var w = 0; w < 25; w++) { await sleep(80); if (rows().map(rowName).join('|') !== first) break; }
      await sleep(120);
    }
    ps.scrollTop = keep; scanning = false; save();
    store.set({ waScanAt: Date.now() }).catch(function () {});
    setMsg('נסרקו ' + total + ' צ\'אטים. נשמר רק במחשב.');
    draw(); return total;
  }

  // ---------- הממשק: כפתור צף + חלונית בתוך shadow root (לא נוגעים בעיצוב של וואטסאפ) ----------
  var host = document.createElement('div'); host.id = 'hk-wa-host';
  if ((document.documentElement.dir || '').toLowerCase() === 'ltr') host.className = 'ltr';   // וואטסאפ באנגלית: הרשימה משמאל, הלוח מימין
  var root = host.attachShadow({ mode: 'open' });
  var css = document.createElement('style');
  css.textContent = [
    ':host{all:initial}',
    '*{box-sizing:border-box;font-family:Segoe UI,Arial,sans-serif}',
    '.fab{position:fixed;left:16px;bottom:88px;z-index:2147483000;width:52px;height:52px;border-radius:50%;border:0;background:#1f1a12;color:#e9c46a;font-size:24px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.35)}',
    '.fab:focus-visible,button:focus-visible,select:focus-visible,input:focus-visible,textarea:focus-visible{outline:3px solid #e9c46a;outline-offset:2px}',
    '.fab .b{position:absolute;top:-4px;right:-4px;min-width:20px;height:20px;border-radius:10px;background:#e53935;color:#fff;font-size:12px;line-height:20px;padding:0 5px}',
    '.pan{position:fixed;left:12px;bottom:80px;top:64px;z-index:2147483000;width:min(420px,calc(100vw - 24px));background:#fff;color:#1b1b1b;border:1px solid #d9cfb8;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.3);display:flex;flex-direction:column;direction:rtl;font-size:14px;overflow:hidden}',
    '@media (prefers-color-scheme:dark){.pan{background:#1e2428;color:#e9edef;border-color:#3b4a54}.row:hover{background:#2a3942!important}.mut{color:#aebac1!important}input,select,textarea{background:#111b21;color:#e9edef;border-color:#3b4a54!important}}',
    'header{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#1f1a12;color:#e9c46a}',
    'header h2{font-size:15px;margin:0;flex:1}',
    'header button{background:transparent;border:0;color:#e9c46a;font-size:18px;cursor:pointer}',
    '.tabs{display:flex;flex-wrap:wrap;gap:4px;padding:8px 8px 4px;border-bottom:1px solid #e6dcc6}',
    '.tabs button{border:1px solid #d9cfb8;background:transparent;color:inherit;border-radius:999px;padding:4px 10px;cursor:pointer;font-size:13px}',
    '.tabs button[aria-selected=true]{background:#e9c46a;color:#1f1a12;border-color:#e9c46a;font-weight:600}',
    '.cur{padding:8px 12px;border-bottom:1px solid #e6dcc6;display:flex;flex-wrap:wrap;gap:6px;align-items:center}',
    '.cur b{flex-basis:100%}',
    '.btn{border:1px solid #c9a45c;background:transparent;color:inherit;border-radius:10px;padding:5px 9px;cursor:pointer;font-size:13px}',
    '.btn.g{background:#e9c46a;color:#1f1a12;border-color:#e9c46a}',
    '.body{flex:1;overflow:auto;padding:6px 8px}',
    '.row{display:flex;align-items:center;gap:8px;padding:7px 6px;border-radius:10px;cursor:pointer;border:0;background:transparent;color:inherit;width:100%;text-align:right}',
    '.row:hover{background:#f6f1e6}',
    '.row .nm{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.mut{color:#6b6252;font-size:12px}',
    '.dot{width:10px;height:10px;border-radius:50%;flex:none}',
    '.pill{font-size:11px;border-radius:999px;padding:1px 7px;background:#25d366;color:#fff}',
    '.msg{padding:6px 12px;min-height:22px;font-size:12px;color:#6b6252;border-top:1px solid #e6dcc6}',
    '.opt{display:flex;gap:10px;flex-wrap:wrap;padding:4px 6px 8px;font-size:12px}',
    'table{width:100%;border-collapse:collapse;font-size:12px}th,td{padding:4px;border-bottom:1px solid #eee;text-align:right}th{position:sticky;top:0;background:inherit;cursor:pointer}',
    'input,select,textarea{border:1px solid #d9cfb8;border-radius:8px;padding:5px 7px;font-size:13px;color:inherit;background:transparent}',
    'textarea{width:100%;min-height:70px;resize:vertical}',
    '.form{display:grid;gap:6px;padding:8px 12px;border-bottom:1px solid #e6dcc6}',
    '.banner{position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:2147483001;background:#1f1a12;color:#fff;border:2px solid #e9c46a;border-radius:14px;padding:10px 14px;direction:rtl;display:flex;gap:8px;align-items:center;flex-wrap:wrap;max-width:min(640px,calc(100vw - 24px));box-shadow:0 8px 30px rgba(0,0,0,.4);font-size:14px}',
    '.banner .btn{color:#fff}',
    '.empty{padding:16px;color:#6b6252;text-align:center;line-height:1.6}',
    ':host(.ltr) .fab,:host(.ltr) .pan{left:auto;right:16px}'
  ].join('\n');
  root.appendChild(css);
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') e.textContent = attrs[k];
      else if (k === 'on') Object.keys(attrs.on).forEach(function (ev) { e.addEventListener(ev, attrs.on[ev]); });
      else if (k === 'style') e.style.cssText = attrs[k];
      else e.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  var fab = el('button', { class: 'fab', type: 'button', title: 'סידור צ\'אטים – הכלים של גילעד רחמים', 'aria-label': 'סידור צ\'אטים', on: { click: function () { toggle(); } } }, ['📋']);
  var badge = el('span', { class: 'b', hidden: '' });
  fab.appendChild(badge);
  var pan = el('section', { class: 'pan', role: 'dialog', 'aria-label': 'סידור צ\'אטים', hidden: '' });
  var msgEl = el('div', { class: 'msg', role: 'status' });
  root.appendChild(fab); root.appendChild(pan);
  (document.body || document.documentElement).appendChild(host);
  function setMsg(t) { msgEl.textContent = t || ''; }

  function ago(ts) {
    if (!ts) return '';
    var m = Math.round((Date.now() - ts) / 60000);
    if (m < 60) return m <= 1 ? 'עכשיו' : m + ' דק\'';
    var h = Math.round(m / 60); if (h < 24) return h === 1 ? 'שעה' : h + ' שעות';
    var d = Math.round(h / 24); return d === 1 ? 'יום' : d + ' ימים';
  }
  function labelColor(name) { var i = D.labels.indexOf(D.tags[name]); return i >= 0 ? COLORS[i % 8] : 'transparent'; }
  function list() { return Object.keys(D.map).map(function (k) { return D.map[k]; }); }
  var RECENT = 14 * 864e5;
  function visible(c) { return !(D.opt.hideMuted && c.mu) && (D.opt.groups || !c.g) && (!D.opt.recent || !c.t || Date.now() - c.t < RECENT); }

  function chatRow(c, extra) {
    var b = el('button', { class: 'row', type: 'button', title: 'לפתוח את הצ\'אט', on: { click: function () { openChat(c.n).then(function (ok) { if (!ok) setMsg('לא מצאתי את "' + c.n + '" ברשימה. אפשר לחפש אותו בחיפוש של וואטסאפ.'); }); } } }, [
      el('span', { class: 'dot', style: 'background:' + labelColor(c.n) + (D.tags[c.n] ? '' : ';border:1px solid #d9cfb8') }),
      el('span', { class: 'nm', text: (c.g ? '👥 ' : '') + c.n + (D.notes[c.n] ? ' 📝' : '') }),
      c.u ? el('span', { class: 'pill', text: String(c.u) }) : null,
      el('span', { class: 'mut', text: extra || '' })
    ]);
    if (D.notes[c.n]) b.title = 'פתק: ' + D.notes[c.n];
    return b;
  }
  function opts(body) {
    function cb(key, label) {
      var i = el('input', { type: 'checkbox', id: 'o-' + key });
      i.checked = !!D.opt[key];
      i.addEventListener('change', function () { D.opt[key] = i.checked; store.set({ waOpt: D.opt }); draw(); });
      return el('label', { for: 'o-' + key }, [i, ' ' + label]);
    }
    body.appendChild(el('div', { class: 'opt' }, [cb('recent', 'רק שבועיים אחרונים'), cb('hideMuted', 'להסתיר מושתקים'), cb('groups', 'גם קבוצות')]));
  }
  function emptyHint(body, t) {
    body.appendChild(el('div', { class: 'empty' }, [t, el('br'), el('button', { class: 'btn g', type: 'button', on: { click: scanAll } }, ['🔄 לסרוק את כל הצ\'אטים'])]));
  }

  // ---------- הצ'אט הפתוח: תווית, פתק, תזכורת, תזמון ----------
  var form = null;   // 'note' | 'rem' | 'sched' | null
  function curBar() {
    var name = openName();
    var bar = el('div', { class: 'cur' });
    if (!name) { bar.appendChild(el('span', { class: 'mut', text: 'פותחים צ\'אט כדי לתת לו תווית, פתק או תזכורת.' })); return bar; }
    bar.appendChild(el('b', { text: 'הצ\'אט הפתוח: ' + name }));
    var sel = el('select', { 'aria-label': 'תווית לצ\'אט הפתוח' });
    sel.appendChild(el('option', { value: '', text: '🏷 בלי תווית' }));
    D.labels.forEach(function (l) { var o = el('option', { value: l, text: l }); if (D.tags[name] === l) o.selected = true; sel.appendChild(o); });
    sel.addEventListener('change', function () { if (sel.value) D.tags[name] = sel.value; else delete D.tags[name]; store.set({ waTags: D.tags }); collect(); draw(); });
    bar.appendChild(sel);
    [['note', '📝 פתק'], ['rem', '⏰ להזכיר לי'], ['sched', '🕐 לתזמן הודעה']].forEach(function (f) {
      bar.appendChild(el('button', { class: 'btn' + (form === f[0] ? ' g' : ''), type: 'button', 'aria-expanded': String(form === f[0]), on: { click: function () { form = form === f[0] ? null : f[0]; draw(); } } }, [f[1]]));
    });
    return bar;
  }
  function whenPicker() {
    var s = el('select', { 'aria-label': 'מתי' });
    var now = new Date(), opts = [['h1', 'בעוד שעה'], ['h3', 'בעוד 3 שעות'], ['ev', 'הערב ב-20:00'], ['tm', 'מחר ב-9:00'], ['wk', 'בעוד שבוע, 9:00'], ['cu', 'תאריך ושעה…']];
    if (now.getHours() >= 20) opts.splice(2, 1);
    opts.forEach(function (o) { s.appendChild(el('option', { value: o[0], text: o[1] })); });
    var dt = el('input', { type: 'datetime-local', hidden: '', 'aria-label': 'תאריך ושעה' });
    s.addEventListener('change', function () { dt.hidden = s.value !== 'cu'; });
    function at() {
      var d = new Date();
      switch (s.value) {
        case 'h1': return Date.now() + 3600e3;
        case 'h3': return Date.now() + 3 * 3600e3;
        case 'ev': d.setHours(20, 0, 0, 0); return d.getTime();
        case 'tm': d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d.getTime();
        case 'wk': d.setDate(d.getDate() + 7); d.setHours(9, 0, 0, 0); return d.getTime();
        default: return dt.value ? new Date(dt.value).getTime() : 0;
      }
    }
    return { el: el('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' }, [s, dt]), at: at };
  }
  function formBox() {
    var name = openName(); if (!name || !form) return null;
    var box = el('div', { class: 'form' });
    if (form === 'note') {
      var ta = el('textarea', { 'aria-label': 'פתק פרטי לצ\'אט', maxlength: '2000', placeholder: 'למשל: ביקש הצעת מחיר עד יום חמישי' });
      ta.value = D.notes[name] || '';
      box.appendChild(el('span', { class: 'mut', text: 'פתק פרטי – נשמר רק במחשב הזה, אף אחד לא רואה אותו.' }));
      box.appendChild(ta);
      box.appendChild(el('button', { class: 'btn g', type: 'button', on: { click: function () {
        var v = ta.value.trim(); if (v) D.notes[name] = v; else delete D.notes[name];
        store.set({ waNotes: D.notes }); form = null; setMsg(v ? '📝 הפתק נשמר.' : 'הפתק נמחק.'); draw();
      } } }, ['שמירה']));
      return box;
    }
    var wp = whenPicker();
    var ta2 = form === 'sched' ? el('textarea', { 'aria-label': 'ההודעה', maxlength: '4000', placeholder: 'ההודעה שתהיה מוכנה בתיבה בזמן שבחרתם' }) : null;
    if (ta2) box.appendChild(ta2);
    box.appendChild(wp.el);
    box.appendChild(el('span', { class: 'mut', text: form === 'sched' ? 'בזמן הזה יעלה פס בוואטסאפ ווב ↽ לחיצה פותחת את הצ\'אט עם ההודעה בתיבה, ואתם לוחצים "שלח". שום דבר לא נשלח לבד.' : 'בזמן הזה יעלה פס בוואטסאפ ווב וסימן על כפתור התוסף.' }));
    box.appendChild(el('button', { class: 'btn g', type: 'button', on: { click: function () {
      var at = wp.at(); if (!at || at < Date.now() - 60000) { setMsg('צריך לבחור זמן עתידי.'); return; }
      if (ta2 && !ta2.value.trim()) { setMsg('כותבים קודם את ההודעה.'); return; }
      addRem({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), n: name, at: at, k: form, x: ta2 ? ta2.value.trim() : '' });
      form = null; setMsg((ta2 ? '🕐 תוזמן ל-' : '⏰ אזכיר ב-') + new Date(at).toLocaleString('he-IL', { weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }));
      draw();
    } } }, [form === 'sched' ? 'לתזמן' : 'להזכיר']));
    return box;
  }
  function addRem(r) {
    D.rem.push(r); store.set({ waRem: D.rem });
    try { chrome.runtime.sendMessage({ waAlarm: { id: r.id, at: r.at } }, function () { void chrome.runtime.lastError; }); } catch (e) {}
  }
  function doneRem(id) {
    D.rem = D.rem.filter(function (x) { return x.id !== id; }); store.set({ waRem: D.rem });
    try { chrome.runtime.sendMessage({ waAlarm: { id: id, cancel: true } }, function () { void chrome.runtime.lastError; }); } catch (e) {}
  }

  // ---------- הלשוניות ----------
  var TABS = [['wait', '⏳ מחכים לי'], ['sent', '📤 לא ענו לי'], ['rem', '⏰ תזכורות'], ['map', '🗺 מפה'], ['labels', '🏷 תוויות']];
  function draw() {
    if (!open) return;
    pan.textContent = '';
    pan.appendChild(el('header', null, [el('h2', { text: '📋 סידור צ\'אטים' }),
      el('button', { type: 'button', title: 'לסרוק את כל הצ\'אטים', 'aria-label': 'לסרוק את כל הצ\'אטים', on: { click: scanAll } }, [scanning ? '⏳' : '🔄']),
      el('button', { type: 'button', title: 'סגירה', 'aria-label': 'סגירה', on: { click: function () { toggle(false); } } }, ['✕'])]));
    var tl = el('div', { class: 'tabs', role: 'tablist' });
    TABS.forEach(function (t) { tl.appendChild(el('button', { type: 'button', role: 'tab', 'aria-selected': String(tab === t[0]), on: { click: function () { tab = t[0]; draw(); } } }, [t[1]])); });
    pan.appendChild(tl);
    pan.appendChild(curBar());
    var fb = formBox(); if (fb) pan.appendChild(fb);
    var body = el('div', { class: 'body' });
    ({ wait: drawWait, sent: drawSent, rem: drawRem, map: drawMap, labels: drawLabels })[tab](body);
    pan.appendChild(body); pan.appendChild(msgEl);
  }
  function drawWait(body) {
    opts(body);
    var L = list().filter(function (c) { return !c.me && c.t && visible(c) && (c.u || !c.g); })
      .sort(function (a, b) { return a.t - b.t; });
    if (!L.length) { emptyHint(body, Object.keys(D.map).length ? 'אין צ\'אטים שמחכים לך. 🎉' : 'עוד לא נסרקה רשימת הצ\'אטים.'); return; }
    body.appendChild(el('div', { class: 'mut', style: 'padding:0 6px 6px', text: L.length + ' צ\'אטים שההודעה האחרונה בהם לא ממך (הכי ותיק למעלה)' }));
    L.forEach(function (c) { body.appendChild(chatRow(c, 'מחכה ' + ago(c.t))); });
  }
  function drawSent(body) {
    opts(body);
    var L = list().filter(function (c) { return c.me && c.t && visible(c); }).sort(function (a, b) { return a.t - b.t; });
    if (!L.length) { emptyHint(body, 'אין צ\'אטים שבהם ההודעה האחרונה שלך.'); return; }
    body.appendChild(el('div', { class: 'mut', style: 'padding:0 6px 6px', text: 'כתבת ולא ענו לך – ' + L.length + ' צ\'אטים (✓✓ = נקראה)' }));
    L.forEach(function (c) { body.appendChild(chatRow(c, (c.rd ? '✓✓ ' : '') + ago(c.t))); });
  }
  function drawRem(body) {
    var L = D.rem.slice().sort(function (a, b) { return a.at - b.at; });
    if (!L.length) { body.appendChild(el('div', { class: 'empty', text: 'אין תזכורות. פותחים צ\'אט ולוחצים ⏰ להזכיר לי או 🕐 לתזמן הודעה.' })); return; }
    L.forEach(function (r) {
      var due = r.at <= Date.now();
      var line = el('div', { class: 'row', style: due ? 'background:rgba(251,140,0,.15)' : '' }, [
        el('span', { class: 'nm', text: (r.k === 'sched' ? '🕐 ' : '⏰ ') + r.n + (r.x ? ' – ' + r.x.slice(0, 40) : '') }),
        el('span', { class: 'mut', text: new Date(r.at).toLocaleString('he-IL', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }) })
      ]);
      line.appendChild(el('button', { class: 'btn g', type: 'button', on: { click: function () { act(r); } } }, [r.k === 'sched' ? 'להכין' : 'לפתוח']));
      line.appendChild(el('button', { class: 'btn', type: 'button', title: 'בוצע / למחוק', 'aria-label': 'בוצע', on: { click: function () { doneRem(r.id); draw(); banners(); } } }, ['✓']));
      body.appendChild(line);
    });
  }
  var sortKey = 't', sortDir = -1, filterLabel = '';
  function drawMap(body) {
    var bar = el('div', { class: 'opt' });
    var fl = el('select', { 'aria-label': 'סינון לפי תווית' });
    fl.appendChild(el('option', { value: '', text: 'כל התוויות' }));
    D.labels.forEach(function (l) { var o = el('option', { value: l, text: l }); if (filterLabel === l) o.selected = true; fl.appendChild(o); });
    fl.addEventListener('change', function () { filterLabel = fl.value; draw(); });
    bar.appendChild(fl);
    bar.appendChild(el('button', { class: 'btn', type: 'button', on: { click: exportCsv } }, ['⬇ ייצוא לאקסל']));
    body.appendChild(bar);
    var L = list().filter(function (c) { return !filterLabel || D.tags[c.n] === filterLabel; });
    if (!L.length) { emptyHint(body, 'המפה ריקה. סורקים פעם אחת, וממשיכים להתעדכן לבד כשגוללים.'); return; }
    var groups = L.filter(function (c) { return c.g; }).length;
    body.appendChild(el('div', { class: 'mut', style: 'padding:0 6px 6px', text: L.length + ' צ\'אטים · ' + groups + ' קבוצות · ' + L.filter(function (c) { return c.u; }).length + ' עם הודעות שלא נקראו' }));
    L.sort(function (a, b) { var x = a[sortKey], y = b[sortKey]; return (typeof x === 'string' ? x.localeCompare(y, 'he') : (x || 0) - (y || 0)) * sortDir; });
    var tb = el('table');
    var hr = el('tr');
    [['n', 'שם'], ['t', 'אחרון'], ['u', 'לא נקראו'], ['me', 'אחרון ממני']].forEach(function (h) {
      hr.appendChild(el('th', { scope: 'col', tabindex: '0', 'aria-sort': sortKey === h[0] ? (sortDir > 0 ? 'ascending' : 'descending') : 'none', on: { click: function () { if (sortKey === h[0]) sortDir = -sortDir; else { sortKey = h[0]; sortDir = h[0] === 'n' ? 1 : -1; } draw(); } } }, [h[1]]));
    });
    tb.appendChild(el('thead', null, [hr]));
    var tbody = el('tbody');
    L.slice(0, 600).forEach(function (c) {
      tbody.appendChild(el('tr', null, [
        el('td', null, [chatRow(c)]),
        el('td', { text: c.w || '' }), el('td', { text: c.u ? String(c.u) : '' }), el('td', { text: c.me ? (c.rd ? '✓✓' : '✓') : '' })
      ]));
    });
    tb.appendChild(tbody); body.appendChild(tb);
  }
  function drawLabels(body) {
    body.appendChild(el('div', { class: 'mut', style: 'padding:4px 6px 8px', text: 'תווית נותנת לצ\'אט פס צבע ברשימה של וואטסאפ. בוחרים תווית לצ\'אט הפתוח למעלה. לתיקיות של וואטסאפ עצמו: ברשימת הצ\'אטים ← "רשימות".' }));
    D.labels.forEach(function (l, i) {
      var cnt = Object.keys(D.tags).filter(function (k) { return D.tags[k] === l; }).length;
      var line = el('div', { class: 'row' }, [el('span', { class: 'dot', style: 'background:' + COLORS[i % 8] }), el('span', { class: 'nm', text: l }), el('span', { class: 'mut', text: cnt + ' צ\'אטים' })]);
      line.appendChild(el('button', { class: 'btn', type: 'button', on: { click: function () { filterLabel = l; tab = 'map'; draw(); } } }, ['להציג']));
      line.appendChild(el('button', { class: 'btn', type: 'button', 'aria-label': 'למחוק את התווית ' + l, on: { click: function () {
        if (!confirm('למחוק את התווית "' + l + '"? הצ\'אטים עצמם לא נפגעים.')) return;
        D.labels.splice(D.labels.indexOf(l), 1);
        Object.keys(D.tags).forEach(function (k) { if (D.tags[k] === l) delete D.tags[k]; });
        store.set({ waLabels: D.labels, waTags: D.tags }); collect(); draw();
      } } }, ['🗑']));
      body.appendChild(line);
    });
    if (D.labels.length < 8) {
      var inp = el('input', { 'aria-label': 'תווית חדשה', maxlength: '24', placeholder: 'תווית חדשה…' });
      body.appendChild(el('div', { class: 'opt' }, [inp, el('button', { class: 'btn g', type: 'button', on: { click: function () {
        var v = inp.value.trim(); if (!v || D.labels.indexOf(v) >= 0) return;
        D.labels.push(v); store.set({ waLabels: D.labels }); draw();
      } } }, ['➕ להוסיף'])]));
    }
  }

  // ---------- ייצוא לאקסל (CSV עם BOM, נפתח בעברית תקינה) ----------
  function exportCsv() {
    var q = function (v) { v = String(v == null ? '' : v); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var head = ['שם', 'סוג', 'הודעה אחרונה', 'תאריך משוער', 'מי כתב אחרון', 'נקראה', 'לא נקראו', 'מושתק', 'מוצמד', 'תווית', 'פתק'];
    var lines = [head.join(',')];
    list().sort(function (a, b) { return (b.t || 0) - (a.t || 0); }).forEach(function (c) {
      lines.push([c.n, c.g ? 'קבוצה' : 'פרטי', c.w, c.t ? new Date(c.t).toLocaleDateString('he-IL') : '', c.me ? 'אני' : 'הצד השני', c.me ? (c.rd ? 'כן' : 'לא') : '', c.u || '', c.mu ? 'כן' : '', c.pin ? 'כן' : '', D.tags[c.n] || '', D.notes[c.n] || ''].map(q).join(','));
    });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    a.download = 'מפת הצאטים בוואטסאפ - ' + new Date().toLocaleDateString('he-IL').replace(/\./g, '-') + '.csv';
    root.appendChild(a); a.click(); a.remove();
    setMsg('נשמר קובץ לאקסל עם ' + (lines.length - 1) + ' צ\'אטים. בלי תוכן הודעות.');
  }

  // ---------- תזכורות שהגיע זמנן: פס למעלה ----------
  var bannerBox = el('div'); root.appendChild(bannerBox);
  async function act(r) {
    if (r.k === 'sched') {
      var res = await prepare(r.n, r.x);
      if (res === 'ok') { setMsg('ההודעה מוכנה בתיבה של "' + r.n + '". בודקים ולוחצים שלח.'); doneRem(r.id); }
      else if (res === 'busy') setMsg('בתיבה של "' + r.n + '" כבר יש טקסט. לא הוספתי כלום – מוחקים אותו ולוחצים שוב.');
      else setMsg('לא הצלחתי לפתוח את "' + r.n + '". מחפשים אותו בחיפוש של וואטסאפ ולוחצים שוב.');
    } else {
      var ok = await openChat(r.n);
      if (ok) doneRem(r.id); else setMsg('לא מצאתי את "' + r.n + '" ברשימה.');
    }
    draw(); banners();
  }
  var beeped = {};
  function beep() {
    try { var ac = new AudioContext(), o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = 880; g.gain.value = 0.08; o.connect(g); g.connect(ac.destination); o.start(); setTimeout(function () { o.stop(); ac.close(); }, 350); } catch (e) {}
  }
  function banners() {
    var due = D.rem.filter(function (r) { return r.at <= Date.now(); });
    badge.hidden = !due.length; badge.textContent = due.length ? String(due.length) : '';
    bannerBox.textContent = '';
    if (!due.length) return;
    var r = due[0];
    if (!beeped[r.id]) { beeped[r.id] = 1; beep(); }
    bannerBox.appendChild(el('div', { class: 'banner', role: 'alert' }, [
      el('span', { text: r.k === 'sched' ? '🕐 הגיע הזמן לשלוח ל-' + r.n + (r.x ? ': "' + r.x.slice(0, 50) + (r.x.length > 50 ? '…' : '') + '"' : '') : '⏰ תזכורת: לענות ל-' + r.n }),
      el('button', { class: 'btn g', type: 'button', on: { click: function () { act(r); } } }, [r.k === 'sched' ? 'לפתוח ולהכין בתיבה' : 'לפתוח את הצ\'אט']),
      el('button', { class: 'btn', type: 'button', on: { click: function () { r.at = Date.now() + 3600e3; store.set({ waRem: D.rem }); try { chrome.runtime.sendMessage({ waAlarm: { id: r.id, at: r.at } }, function () { void chrome.runtime.lastError; }); } catch (e) {} banners(); } } }, ['בעוד שעה']),
      el('button', { class: 'btn', type: 'button', on: { click: function () { doneRem(r.id); banners(); draw(); } } }, ['✓ בוצע']),
      due.length > 1 ? el('span', { class: 'mut', style: 'color:#e9c46a', text: '+' + (due.length - 1) + ' עוד' }) : null
    ]));
  }

  function toggle(force) {
    open = typeof force === 'boolean' ? force : !open;
    pan.hidden = !open;
    if (open) { collect(); draw(); }
  }
  api.toggle = toggle;
  api._t = { parseWhen: parseWhen, readRow: readRow, collect: collect, D: D, scanAll: scanAll, prepare: prepare, exportCsv: exportCsv, openChat: openChat };

  // ---------- טעינה ומעקב ----------
  store.get(['waMap', 'waLabels', 'waTags', 'waNotes', 'waRem', 'waOpt']).then(function (o) {
    if (o.waMap) D.map = o.waMap;
    if (Array.isArray(o.waLabels)) D.labels = o.waLabels;
    if (o.waTags) D.tags = o.waTags;
    if (o.waNotes) D.notes = o.waNotes;
    if (Array.isArray(o.waRem)) D.rem = o.waRem;
    if (o.waOpt) D.opt = Object.assign(D.opt, o.waOpt);
    collect(); banners(); if (open) draw();
  }).catch(function () {});
  chrome.storage.onChanged.addListener(function (ch, area) {
    if (area !== 'local') return;
    if (ch.waRem) { D.rem = ch.waRem.newValue || []; banners(); if (open && tab === 'rem') draw(); }
  });
  var pend = 0;
  new MutationObserver(function () {
    if (pend) return;
    pend = setTimeout(function () { pend = 0; if (!scanning) collect(); }, 700);
  }).observe(document.documentElement, { childList: true, subtree: true });
  setInterval(save, 4000);
  setInterval(banners, 30000);
  var lastOpen = '';
  setInterval(function () { var n = openName(); if (n !== lastOpen) { lastOpen = n; if (open) { form = null; draw(); } } }, 1000);
  if (window.__hkWaOpen) { window.__hkWaOpen = false; toggle(true); }
})();
