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
  function icons(row) {
    var out = [];
    row.querySelectorAll('[data-icon]').forEach(function (e) { out.push(e.getAttribute('data-icon') || ''); });
    row.querySelectorAll('svg title').forEach(function (e) { out.push(e.textContent || ''); });
    return out;
  }
  function hasIcon(list, re) { for (var i = 0; i < list.length; i++) if (re.test(list[i])) return list[i]; return ''; }
  var TICK_RE = /(^|-)(read|delivered|sent|dblcheck|check|msg-time|pending|time)$/i;
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
    var ic = icons(row), tickName = hasIcon(ic, TICK_RE), read = false;
    if (tickName) {
      read = /(^|-)read$/i.test(tickName);
      if (!read) {
        var tick = row.querySelector('[data-icon="' + tickName + '"]');
        if (tick) {
          var lab = (tick.getAttribute('aria-label') || (tick.parentElement && tick.parentElement.getAttribute('aria-label')) || '').trim();
          read = /^(read|נקראה|נקרא)$/i.test(lab) || /rgb\(83,\s*189,\s*235\)|rgb\(0,\s*157,\s*226\)/.test(getComputedStyle(tick).color || '');
        }
      }
    }
    var unread = 0;
    var ub = row.querySelectorAll('[aria-label]');
    for (var k = 0; k < ub.length; k++) {
      var a = ub[k].getAttribute('aria-label') || '';
      if (/unread|לא נקרא/i.test(a)) { var n = a.replace(/[,.](?=\d{3})/g, '').match(/\d+/); unread = n ? +n[0] : (unread || 1); break; }
    }
    // קבוצה: אייקון קבוצה (רק בקבוצה בלי תמונה), או שם השולח לפני ההודעה האחרונה ("רפי: …") – בלי לקרוא את ההודעה עצמה
    var group = !!hasIcon(ic, /group|community/i) || [].some.call(row.querySelectorAll('span'), function (sp) { return !sp.children.length && sp.textContent.length < 40 && /\S:\s*$/.test(sp.textContent) && !TIME_RE.test(sp.textContent.trim()); });
    var loading = !when && /בטעינה|loading/i.test(row.textContent || '');
    return {
      n: name, w: when, t: parseWhen(when, now), me: tickName ? 1 : 0, rd: read ? 1 : 0, u: unread,
      mu: hasIcon(ic, /mute|notifications-off/i) ? 1 : 0, pin: hasIcon(ic, /push-pin|pinned/i) ? 1 : 0,
      g: group ? 1 : 0, seen: now, ld: loading ? 1 : 0
    };
  }
  function collect() {
    var now = Date.now(), n = 0;
    rows().forEach(function (row) {
      var r = readRow(row, now); if (!r) return;
      var old = D.map[r.n];
      if (old && old.g && !r.g) r.g = 1;   // קבוצה נשארת קבוצה גם כשהאייקון לא נטען
      if (r.ld && old && old.t) { r.w = old.w; r.t = old.t; r.me = old.me; r.rd = old.rd; r.ld = 0; }   // עוד בטעינה – משאירים את מה שידענו
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
      // הצעד: לפי השורות שכבר צוירו (וואטסאפ מצייר כ-16 שורות), לא לפי גובה החלון – בחלון קטן זה היה איטי פי 4
      var rr = rows(), rh = rr.length ? (rr[0].offsetHeight || 72) : 72;
      var before = ps.scrollTop; ps.scrollTop += Math.max(150, ps.clientHeight * 0.5, (rr.length - 4) * rh * 0.6);
      if (ps.scrollTop === before) { await sleep(500); collect(); break; }
      for (var w = 0; w < 25; w++) { await sleep(80); if (rows().map(rowName).join('|') !== first) break; }
      await sleep(120);
    }
    ps.scrollTop = keep; scanning = false; save();
    store.set({ waScanAt: Date.now() }).catch(function () {});
    var ld = list().filter(function (c) { return c.ld; }).length;
    setMsg('נסרקו ' + total + ' צ\'אטים. נשמר רק במחשב.' + (ld ? ' ' + ld + ' צ\'אטים עוד בטעינה אצל וואטסאפ – כדאי לסרוק שוב בעוד כמה דקות.' : ''));
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
  function visible(c) { return !c.ar && !(D.opt.hideMuted && c.mu) && (D.opt.groups || !c.g) && (!D.opt.recent || !c.t || Date.now() - c.t < RECENT); }

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
    if (isGroupOpen()) bar.appendChild(el('button', { class: 'btn' + (form === 'grp' ? ' g' : ''), type: 'button', 'aria-expanded': String(form === 'grp'), on: { click: function () { form = form === 'grp' ? null : 'grp'; if (form === 'grp') grpStart(); draw(); } } }, ['👥 חברי הקבוצה לאקסל']));
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
    if (form === 'grp') return grpBox(box, name);
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
  var TABS = [['wait', '⏳ מחכים לי'], ['sent', '📤 לא ענו לי'], ['rem', '⏰ תזכורות'], ['map', '🗺 מפה'], ['multi', '📨 לכמה צ\'אטים'], ['act', '🧹 פקודה במילים'], ['labels', '🏷 תוויות']];
  function draw() {
    if (!open) return;
    pan.textContent = '';
    pan.appendChild(el('header', null, [el('h2', { text: '📋 סידור צ\'אטים' }),
      el('button', { type: 'button', title: 'לסרוק את כל הצ\'אטים', 'aria-label': 'לסרוק את כל הצ\'אטים', on: { click: scanAll } }, [scanning ? '⏳' : '🔄']),
      el('button', { type: 'button', title: 'סגירה', 'aria-label': 'סגירה', on: { click: function () { toggle(false); } } }, ['✕'])]));
    var tl = el('div', { class: 'tabs', role: 'tablist' });
    TABS.forEach(function (t) { tl.appendChild(el('button', { type: 'button', role: 'tab', 'aria-selected': String(tab === t[0]), on: { click: function () { tab = t[0]; setMsg(''); draw(); } } }, [t[1]])); });
    pan.appendChild(tl);
    pan.appendChild(curBar());
    var fb = formBox(); if (fb) pan.appendChild(fb);
    var body = el('div', { class: 'body' });
    ({ wait: drawWait, sent: drawSent, rem: drawRem, map: drawMap, multi: drawMulti, act: drawAct, labels: drawLabels })[tab](body);
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
    download('מפת הצאטים בוואטסאפ - ' + today() + '.csv', lines);
    setMsg('נשמר קובץ לאקסל עם ' + (lines.length - 1) + ' צ\'אטים. בלי תוכן הודעות.');
  }

  function today() { return new Date().toLocaleDateString('he-IL').replace(/\./g, '-'); }
  function csvq(v) { v = String(v == null ? '' : v); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function download(fname, lines) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    a.download = fname.replace(/[\\/:*?"<>|]/g, ''); root.appendChild(a); a.click(); a.remove();
  }

  // ---------- חברי הקבוצה לאקסל / לאנשי הקשר של גוגל ----------
  // מקורות: השורה שמתחת לשם הקבוצה (רשימת המשתתפים), וחלונית "פרטי הקבוצה" אם פתוחה – אוספים תוך כדי גלילה בה.
  var PHONE_RE = /^\+?[\d\s\-()‎‏]{8,}$/;
  var ME_RE = /^(את\/ה|אתה|את|you)$/i;
  function subtitleMembers() {
    var spans = [].slice.call(document.querySelectorAll('#main header span[title]')).slice(1);
    for (var i = 0; i < spans.length; i++) {
      var t = spans[i].getAttribute('title') || '';
      if (t.indexOf(',') > 0) return t.split(/\s*,\s*/).filter(function (x) { return x && !ME_RE.test(x.trim()); });
    }
    return [];
  }
  function isGroupOpen() {
    var n = openName(); if (n && D.map[n] && D.map[n].g) return true;
    return !!document.querySelector('#main header [data-icon*="group"]') || !!subtitleMembers().length;
  }
  function normPhone(t) {
    var d = String(t || '').replace(/[^\d+]/g, ''); if (!d) return '';
    if (d[0] === '+') return d; if (/^972/.test(d)) return '+' + d; if (/^0\d{8,9}$/.test(d)) return '+972' + d.slice(1); return d;
  }
  var grp = null;   // { name, m: Map(key -> {n, p}) }
  function grpAdd(name, phone) {
    name = (name || '').replace(/^~\s*/, '').trim(); phone = normPhone(phone);
    if (!name && !phone) return; if (ME_RE.test(name)) return;
    if (!phone) { var dup = false; grp.m.forEach(function (x) { if (x.n === name) dup = true; }); if (dup) return; }
    var key = phone || name, old = grp.m.get(key);
    if (!old) { if (phone && name && grp.m.has(name)) grp.m.delete(name); grp.m.set(key, { n: name, p: phone }); }
    else if (!old.n && name) old.n = name;
  }
  function grpCollect() {
    if (!grp) return;
    subtitleMembers().forEach(function (x) { if (PHONE_RE.test(x)) grpAdd('', x); else grpAdd(x, ''); });
    // חלונית פרטי הקבוצה: שורות רשימה מחוץ לרשימת הצ'אטים ומחוץ לשיחה
    [].slice.call(document.querySelectorAll('[role=listitem], [role=row]')).forEach(function (row) {
      if (row.closest('#pane-side') || row.closest('#main') || row.closest('#hk-wa-host')) return;
      if (!row.offsetParent && getComputedStyle(row).position !== 'fixed') return;   // רק מה שעל המסך
      var t = row.querySelector('span[title]'); if (!t) return;
      var title = (t.getAttribute('title') || '').replace(/[‎‏‪-‮]/g, '').trim(), phone = '', name = '';
      if (PHONE_RE.test(title)) phone = title; else name = title;
      [].slice.call(row.querySelectorAll('span')).forEach(function (sp) {
        if (sp.children.length) return; var x = (sp.textContent || '').replace(/[‎‏‪-‮]/g, '').trim();
        if (!phone && PHONE_RE.test(x)) phone = x;
        if (!name && /^~/.test(x)) name = x;
      });
      grpAdd(name, phone);
    });
  }
  function grpStart() { var n = openName(); if (!grp || grp.name !== n) grp = { name: n, m: new Map() }; grpCollect(); }
  function grpBox(box, name) {
    if (!grp) grpStart(); grpCollect();
    var L = Array.from(grp.m.values()), withPhone = L.filter(function (x) { return x.p; }).length;
    box.appendChild(el('b', { text: '👥 ' + L.length + ' חברים נאספו מ"' + name + '" (' + withPhone + ' עם מספר)' }));
    box.appendChild(el('span', { class: 'mut', text: 'לכל הרשימה: לוחצים על שם הקבוצה למעלה ← "הצגת הכול" במשתתפים, וגוללים עד הסוף. אני אוסף תוך כדי. אנשי קשר שמורים מופיעים בשם, ומי שלא שמור – במספר.' }));
    box.appendChild(el('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' }, [
      el('button', { class: 'btn g', type: 'button', on: { click: function () {
        grpCollect(); var rows = [['שם', 'טלפון', 'קבוצה'].join(',')];
        grp.m.forEach(function (x) { rows.push([x.n, x.p, grp.name].map(csvq).join(',')); });
        download('חברי הקבוצה ' + grp.name + ' - ' + today() + '.csv', rows);
        setMsg('נשמר קובץ לאקסל עם ' + (rows.length - 1) + ' חברים.');
      } } }, ['⬇ לאקסל']),
      el('button', { class: 'btn', type: 'button', title: 'קובץ שגוגל אנשי קשר יודע לייבא, עם תווית בשם הקבוצה', on: { click: function () {
        grpCollect(); var rows = ['Name,Phone 1 - Type,Phone 1 - Value,Labels,Notes'];
        grp.m.forEach(function (x) { if (x.p) rows.push([x.n || ('מקבוצת ' + grp.name + ' ' + x.p.slice(-4)), 'Mobile', x.p, grp.name + ' ::: * myContacts', 'מקבוצת ווטסאפ: ' + grp.name].map(csvq).join(',')); });
        download('לייבוא לגוגל - ' + grp.name + '.csv', rows);
        setMsg((rows.length - 1) + ' מספרים בקובץ. מייבאים ב-contacts.google.com ← ייבוא. כדאי לעבור על הרשימה לפני הייבוא.');
      } } }, ['⬇ לאנשי הקשר של גוגל'])
    ]));
    return box;
  }

  // ---------- אותה הודעה לכמה צ'אטים – אחד אחד, ואתם לוחצים שלח בכל אחד ----------
  var multi = { pick: {}, text: '', lab: '', q: [], i: -1, st: '' };
  function personal(text, name) {
    var first = (PHONE_RE.test(name) || (D.map[name] && D.map[name].g)) ? '' : name.split(/\s+/)[0];
    return text.replace(/\{שם\}/g, first).replace(/[ \t]+([,!.])/g, '$1').replace(/^\s+/, '');
  }
  async function multiStep() {
    var name = multi.q[multi.i]; if (!name) return;
    multi.st = 'מכין…'; draw();
    var res = await prepare(name, personal(multi.text, name));
    multi.st = res === 'ok' ? 'ההודעה בתיבה. בודקים ולוחצים שלח בוואטסאפ, ואז "שלחתי – הבא".' : res === 'busy' ? 'בתיבה כבר יש טקסט – לא נגעתי. מפנים אותה ולוחצים "להכין שוב".' : 'לא מצאתי את הצ\'אט ברשימה. אפשר לדלג.';
    draw();
  }
  function multiNext(skip) {
    var name = multi.q[multi.i], box = composeBox();
    if (!skip && openName() === name && box && (box.innerText || '').trim()) {
      if (!confirm('ההודעה עוד בתיבה ולא נשלחה. לעבור הלאה בלי לשלוח?')) return;
    }
    multi.i++;
    if (multi.i >= multi.q.length) { setMsg('✓ סיימנו ' + multi.q.length + ' צ\'אטים.'); multi.q = []; multi.i = -1; multi.st = ''; draw(); return; }
    multiStep();
  }
  function hash(x) { var h = 0; for (var i = 0; i < x.length; i++) h = (h * 31 + x.charCodeAt(i)) | 0; return h; }
  function drawMulti(body) {
    if (multi.i >= 0) {
      var name = multi.q[multi.i];
      body.appendChild(el('div', { class: 'form' }, [
        el('b', { text: 'צ\'אט ' + (multi.i + 1) + ' מתוך ' + multi.q.length + ': ' + name }),
        el('span', { class: 'mut', text: multi.st }),
        el('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' }, [
          el('button', { class: 'btn g', type: 'button', on: { click: function () { multiNext(false); } } }, ['שלחתי – הבא ←']),
          el('button', { class: 'btn', type: 'button', on: { click: multiStep } }, ['להכין שוב']),
          el('button', { class: 'btn', type: 'button', on: { click: function () { multiNext(true); } } }, ['לדלג']),
          el('button', { class: 'btn', type: 'button', on: { click: function () { multi.q = []; multi.i = -1; setMsg('נעצר.'); draw(); } } }, ['⏹ לעצור'])
        ])
      ]));
      return;
    }
    body.appendChild(el('div', { class: 'mut', style: 'padding:4px 6px', text: 'כותבים הודעה ומסמנים צ\'אטים. התוסף פותח כל צ\'אט עם ההודעה בתיבה – ואתם לוחצים שלח בכל אחד. שום דבר לא נשלח לבד. לרשימה קבועה של אנשים: רשימת תפוצה של וואטסאפ.' }));
    var ta = el('textarea', { 'aria-label': 'ההודעה', maxlength: '4000', placeholder: 'שלום {שם}, …   ({שם} = השם הפרטי)' });
    ta.value = multi.text; ta.addEventListener('input', function () { multi.text = ta.value; });
    body.appendChild(ta);
    var bar = el('div', { class: 'opt' });
    var fl = el('select', { 'aria-label': 'לפי תווית' });
    fl.appendChild(el('option', { value: '', text: 'כל הצ\'אטים' }));
    D.labels.forEach(function (l) { var o = el('option', { value: l, text: l }); if (multi.lab === l) o.selected = true; fl.appendChild(o); });
    fl.addEventListener('change', function () { multi.lab = fl.value; draw(); });
    bar.appendChild(fl);
    var L = list().filter(function (c) { return !multi.lab || D.tags[c.n] === multi.lab; }).sort(function (a, b) { return (b.t || 0) - (a.t || 0); }).slice(0, 300);
    bar.appendChild(el('button', { class: 'btn', type: 'button', on: { click: function () { var all = L.length && L.every(function (c) { return multi.pick[c.n]; }); L.forEach(function (c) { if (all) delete multi.pick[c.n]; else multi.pick[c.n] = 1; }); draw(); } } }, ['לסמן הכול / לבטל']));
    var go = el('button', { class: 'btn g', type: 'button', on: { click: function () {
      var q = Object.keys(multi.pick);
      if (!multi.text.trim()) { setMsg('כותבים קודם את ההודעה.'); return; }
      if (!q.length) { setMsg('מסמנים לפחות צ\'אט אחד.'); return; }
      if (q.length > 50) { setMsg('עד 50 צ\'אטים בפעם אחת. לקבוצה גדולה יותר – רשימת תפוצה.'); return; }
      multi.q = q; multi.i = 0; multi.pick = {}; multiStep();
    } } }, ['להתחיל (' + Object.keys(multi.pick).length + ')']);
    bar.appendChild(go);
    body.appendChild(bar);
    L.forEach(function (c) {
      var id = 'm' + Math.abs(hash(c.n));
      var cb = el('input', { type: 'checkbox', id: id }); cb.checked = !!multi.pick[c.n];
      cb.addEventListener('change', function () { if (cb.checked) multi.pick[c.n] = 1; else delete multi.pick[c.n]; go.textContent = 'להתחיל (' + Object.keys(multi.pick).length + ')'; });
      body.appendChild(el('label', { for: id, class: 'row', style: 'cursor:pointer' }, [cb, el('span', { class: 'dot', style: 'background:' + labelColor(c.n) }), el('span', { class: 'nm', text: (c.g ? '👥 ' : '') + c.n }), el('span', { class: 'mut', text: c.w || '' })]));
    });
  }

  // ---------- סיכום בוקר: פעם ביום, בפתיחה הראשונה של וואטסאפ ווב ----------
  var morningBox = el('div'); root.appendChild(morningBox);
  function morning(force) {
    var d = new Date(), key = d.toDateString();
    if (!force && (d.getHours() < 5 || D.opt.morningOff)) return Promise.resolve();
    return store.get('waDaily').then(function (o) {
      if (!force && o.waDaily === key) return;
      collect();
      var L = list().filter(visible);
      var wait = L.filter(function (c) { return !c.me && c.t && (c.u || !c.g); }).length;
      var sent = L.filter(function (c) { return c.me && c.t && Date.now() - c.t > 864e5; }).length;
      var end = new Date(); end.setHours(23, 59, 59, 999);
      var rem = D.rem.filter(function (r) { return r.at <= end.getTime(); }).length;
      if (!wait && !sent && !rem && !force) return;
      store.set({ waDaily: key });
      morningBox.textContent = '';
      morningBox.appendChild(el('div', { class: 'banner', role: 'status', style: 'top:auto;bottom:150px' }, [
        el('span', { text: (d.getHours() < 12 ? '☀ בוקר טוב: ' : '📋 מה מחכה היום: ') + wait + ' צ\'אטים מחכים לך · ' + rem + ' תזכורות להיום · ' + sent + ' לא ענו לך' }),
        el('button', { class: 'btn g', type: 'button', on: { click: function () { morningBox.textContent = ''; tab = 'wait'; toggle(true); } } }, ['להציג']),
        el('button', { class: 'btn', type: 'button', 'aria-label': 'סגירה', on: { click: function () { morningBox.textContent = ''; } } }, ['✕']),
        el('button', { class: 'btn', type: 'button', on: { click: function () { D.opt.morningOff = true; store.set({ waOpt: D.opt }); morningBox.textContent = ''; } } }, ['לא להציג יותר'])
      ]));
    }).catch(function () {});
  }

  // ---------- פקודה במילים: להשתיק / לארכב / לסמן כנקרא – הרבה צ'אטים בבת אחת ----------
  // הפענוח נעשה כאן, בלי שרת ובלי AI. לפני כל ביצוע מוצגת הרשימה המדויקת, ורק "לבצע" של המשתמש מפעיל.
  // הפעולות הן אותן פעולות של תפריט הצ'אט של וואטסאפ (לחיצה ימנית). אין כאן מחיקה, יציאה מקבוצה או שליחה.
  var NUM_HE = { 'אחד': 1, 'אחת': 1, 'שניים': 2, 'שני': 2, 'שתיים': 2, 'שתי': 2, 'שלושה': 3, 'שלוש': 3, 'ארבעה': 4, 'ארבע': 4, 'חמישה': 5, 'חמש': 5, 'שישה': 6, 'שש': 6 };
  function parseCmd(text) {
    var t = ' ' + String(text || '').replace(/["״׳']/g, function (c) { return c === '\'' || c === '׳' ? '\'' : '"'; }).trim() + ' ';
    var c = { act: '', dur: 'always', who: 'all', days: 0, word: '', label: '', unread: false, words: [] };
    if (/השתק|להשתיק|השתיקו|mute/i.test(t)) c.act = 'mute';
    if (/ארכיון|לארכב|ארכב|archive/i.test(t)) c.act = c.act ? c.act : 'archive';
    if (/כנקרא|כנקראו|כנקראה|לנקות.*(לא נקרא|מספר)|mark.*read/i.test(t)) c.act = 'read';
    if (/(שבוע|7 ימים)/.test(t) && c.act === 'mute' && !/(מ|ב|של|לפני)\s*שבוע/.test(t)) c.dur = 'week';
    if (/8\s*שעות|שמונה שעות/.test(t)) c.dur = '8h';
    if (/קבוצ|groups?/i.test(t)) c.who = 'groups';
    if (/(פרטי|אנשים|אנשי קשר|private)/i.test(t) && c.who !== 'groups') c.who = 'private';
    var m = t.match(/(\d+|אחד|אחת|שניים|שני|שתיים|שתי|שלושה|שלוש|ארבעה|ארבע|חמישה|חמש|שישה|שש)?\s*(יום|ימים|שבוע|שבועות|חודש|חודשים|שנה|שנים)/);
    var quiet = /(שקט|שקטות|שקטים|כלום|בלי פעילות|לא פעיל|לא כתבו|אין הודעות|ישנ|מת|מתות|רדומ)/.test(t);
    if (m && (quiet || /(מעל|יותר מ|לפני|כבר|מ-|מזה|ב-?\s*\d)/.test(t) || m[1])) {
      var n = m[1] ? (/^\d+$/.test(m[1]) ? +m[1] : NUM_HE[m[1]] || 1) : 1;
      var unit = /שנ/.test(m[2]) ? 365 : /חוד/.test(m[2]) ? 30 : /שבוע/.test(m[2]) ? 7 : 1;
      if (!(c.act === 'mute' && c.dur === 'week' && unit === 7 && !m[1] && !quiet)) c.days = n * unit;
    } else if (quiet) c.days = 30;
    var q = t.match(/"([^"]{2,40})"/) || t.match(/(?:עם המילה|שכתוב בהם|שמכילות?|בשם|שנקרא(?:ות|ים)?)\s+([^\s,]{2,30})/);
    if (q) c.word = q[1].trim();
    D.labels.forEach(function (l) { if (t.indexOf(' ' + l + ' ') >= 0 || t.indexOf('תווית ' + l) >= 0) c.label = l; });
    if (/(שלא נקרא|לא נקראו|עם הודעות חדשות)/.test(t) && c.act !== 'read') c.unread = true;
    return c;
  }
  function cmdMatches(c) {
    var now = Date.now();
    return list().filter(function (x) {
      if (x.ar) return false;
      if (c.who === 'groups' && !x.g) return false;
      if (c.who === 'private' && x.g) return false;
      if (c.days && (!x.t || now - x.t < c.days * 864e5)) return false;
      if (c.word && x.n.indexOf(c.word) < 0) return false;
      if (c.label && D.tags[x.n] !== c.label) return false;
      if (c.unread && !x.u) return false;
      if (c.act === 'mute' && x.mu) return false;          // כבר מושתק
      if (c.act === 'read' && !x.u) return false;          // אין מה לסמן
      if (c.act === 'archive' && x.pin) return false;      // לא מארכבים צ'אט מוצמד
      return true;
    }).sort(function (a, b) { return (a.t || 0) - (b.t || 0); });
  }
  function cmdText(c, n) {
    var what = c.act === 'mute' ? 'להשתיק ' + ({ always: 'לתמיד', week: 'לשבוע', '8h': 'ל-8 שעות' })[c.dur] : c.act === 'archive' ? 'להעביר לארכיון' : c.act === 'read' ? 'לסמן כנקרא' : '';
    var who = c.who === 'groups' ? 'קבוצות' : c.who === 'private' ? 'צ\'אטים פרטיים' : 'צ\'אטים';
    var parts = [what, n + ' ' + who];
    if (c.days) parts.push('שלא היה בהם כלום ' + (c.days % 365 === 0 ? (c.days === 365 ? 'שנה' : c.days / 365 + ' שנים') : c.days % 30 === 0 ? (c.days / 30) + ' חודשים' : c.days % 7 === 0 ? (c.days === 7 ? 'שבוע' : c.days / 7 + ' שבועות') : c.days + ' ימים'));
    if (c.word) parts.push('עם "' + c.word + '" בשם');
    if (c.label) parts.push('בתווית ' + c.label);
    if (c.unread) parts.push('עם הודעות שלא נקראו');
    return parts.join(' ').replace('1 חודשים', 'חודש');
  }
  function visMenu() { return [].slice.call(document.querySelectorAll('[role=menuitem]')).filter(function (e) { return e.offsetParent; }); }
  function itemText(e) { var c = e.cloneNode(true); [].forEach.call(c.querySelectorAll('svg'), function (s) { s.remove(); }); return (c.textContent || '').trim(); }
  function findItem(re) { return visMenu().filter(function (e) { return re.test(itemText(e)); })[0]; }
  function fire(elm, types, extra) {
    var r = elm.getBoundingClientRect(), o = Object.assign({ bubbles: true, cancelable: true, composed: true, view: window, clientX: r.left + Math.min(20, r.width / 2), clientY: r.top + r.height / 2 }, extra || {});
    types.forEach(function (tp) { elm.dispatchEvent(/^pointer/.test(tp) ? new PointerEvent(tp, o) : new MouseEvent(tp, o)); });
  }
  async function closeMenus() {
    for (var i = 0; i < 3 && visMenu().length; i++) {
      var m = visMenu()[0]; m.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
      await sleep(200);
    }
    if (visMenu().length) { fire(document.querySelector('#pane-side') || document.body, ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']); await sleep(200); }
  }
  async function rowFor(name) {
    var row = findRow(name), ps = document.querySelector('#pane-side');
    if (row || !ps) return row;
    ps.scrollTop = 0; await sleep(300);
    for (var i = 0; i < 120 && !row; i++) {
      row = findRow(name); if (row) break;
      var rr = rows(), rh = rr.length ? (rr[0].offsetHeight || 72) : 72, before = ps.scrollTop;
      ps.scrollTop += Math.max(150, (rr.length - 4) * rh * 0.6); await sleep(350);
      if (ps.scrollTop === before) break;
    }
    return row;
  }
  // פעולה אחת על צ'אט אחד, דרך תפריט הצ'אט של וואטסאפ. מחזיר 'ok' / 'skip' / 'nochat' / 'nomenu'
  async function doOne(name, c) {
    var row = await rowFor(name); if (!row) return 'nochat';
    row.scrollIntoView({ block: 'center' }); await sleep(150);
    var t = row.querySelector('span[title]') || row;
    fire(t, ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'contextmenu'], { button: 2, buttons: 2 });
    for (var w = 0; w < 12 && !visMenu().length; w++) await sleep(100);
    if (!visMenu().length) return 'nomenu';
    var it, res = 'ok';
    if (c.act === 'archive') {
      it = findItem(/העברת הצ'אט לארכיון|העברה לארכיון|^archive/i);
      if (it) it.click(); else res = findItem(/הוצאה מהארכיון|unarchive/i) ? 'skip' : 'nomenu';
    } else if (c.act === 'read') {
      it = findItem(/סימון כנקרא|mark as read/i);
      if (it) it.click(); else res = 'skip';
    } else if (c.act === 'mute') {
      it = findItem(/השתקת התראות|^mute/i);
      if (!it) res = findItem(/ביטול השתקה|unmute/i) ? 'skip' : 'nomenu';
      else {
        fire(it, ['pointerover', 'pointerenter', 'mouseover', 'mouseenter', 'pointermove', 'mousemove']);
        var re = c.dur === 'week' ? /שבוע|week/i : c.dur === '8h' ? /8|שעות|hours/i : /תמיד|always/i, sub;
        for (var k = 0; k < 12 && !(sub = findItem(re)); k++) await sleep(100);
        if (!sub) { it.click(); for (k = 0; k < 10 && !(sub = findItem(re)); k++) await sleep(100); }
        if (sub) {
          sub.click(); await sleep(350);
          // גרסה ישנה של וואטסאפ ווב: חלון עם כפתור "השתקה"
          var ok = [].slice.call(document.querySelectorAll('[role=dialog] button, div[data-animate-modal-popup] button')).filter(function (b) { return b.offsetParent && /^(השתקה|mute)$/i.test((b.textContent || '').trim()); })[0];
          if (ok) ok.click();
        } else res = 'nomenu';
      }
    }
    await sleep(300); await closeMenus();
    if (res === 'ok') { var x = D.map[name]; if (x) { if (c.act === 'mute') x.mu = 1; if (c.act === 'read') x.u = 0; if (c.act === 'archive') x.ar = 1; dirty = true; } }
    return res;
  }
  var cmd = { text: '', c: null, pick: {}, run: false, stop: false, log: '' };
  var CMD_EX = ['להשתיק לתמיד את כל הקבוצות שלא היה בהן כלום חודש', 'להעביר לארכיון קבוצות שקטות מ-3 חודשים', 'לסמן כנקרא את כל הקבוצות', 'להשתיק לשבוע את הקבוצות עם המילה "שיווק"', 'להעביר לארכיון צ\'אטים פרטיים בלי פעילות שנה'];
  async function runCmd() {
    var names = Object.keys(cmd.pick); if (!names.length) return;
    cmd.run = true; cmd.stop = false; var done = 0, skip = 0, fail = 0; draw();
    for (var i = 0; i < names.length && !cmd.stop; i++) {
      cmd.log = (i + 1) + ' מתוך ' + names.length + ': ' + names[i]; setMsg(cmd.log);
      var r = await doOne(names[i], cmd.c);
      if (r === 'ok') { done++; delete cmd.pick[names[i]]; } else if (r === 'skip') { skip++; delete cmd.pick[names[i]]; } else fail++;
      await sleep(250);
    }
    cmd.run = false; save();
    cmd.log = '✓ בוצע ב-' + done + ' צ\'אטים' + (skip ? ', ' + skip + ' כבר היו כך' : '') + (fail ? ', ' + fail + ' לא הצלחתי (נשארו מסומנים – אפשר לנסות שוב)' : '') + (cmd.stop ? '. נעצר באמצע.' : '.');
    setMsg(cmd.log); draw();
  }
  function drawAct(body) {
    if (cmd.run) {
      body.appendChild(el('div', { class: 'form' }, [el('b', { text: '⏳ ' + cmd.log }), el('span', { class: 'mut', text: 'לא לגעת בוואטסאפ בזמן הביצוע. כל צ\'אט לוקח כשנייה.' }),
        el('button', { class: 'btn', type: 'button', on: { click: function () { cmd.stop = true; } } }, ['⏹ לעצור'])]));
      return;
    }
    body.appendChild(el('div', { class: 'mut', style: 'padding:4px 6px', text: 'כותבים במילים מה לעשות. אפשר: להשתיק (לתמיד / לשבוע / ל-8 שעות), להעביר לארכיון, לסמן כנקרא. לפני הביצוע תראו בדיוק אילו צ\'אטים. בלי מחיקה, בלי יציאה מקבוצות ובלי שליחה.' }));
    var ta = el('textarea', { 'aria-label': 'מה לעשות', maxlength: '300', placeholder: 'למשל: להשתיק לתמיד את כל הקבוצות שלא היה בהן כלום חודש' });
    ta.value = cmd.text;
    var go = function () { cmd.text = ta.value; cmd.c = parseCmd(cmd.text); cmd.pick = {}; if (cmd.c.act) cmdMatches(cmd.c).forEach(function (x) { cmd.pick[x.n] = 1; }); cmd.log = ''; draw(); };
    ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go(); } });
    body.appendChild(ta);
    var ex = el('div', { class: 'opt' });
    CMD_EX.forEach(function (x) { ex.appendChild(el('button', { class: 'btn', type: 'button', style: 'font-size:12px', on: { click: function () { ta.value = x; go(); } } }, [x])); });
    body.appendChild(el('div', { class: 'opt' }, [el('button', { class: 'btn g', type: 'button', on: { click: go } }, ['🔎 להראות על מה זה יחול'])]));
    if (!cmd.c) { body.appendChild(ex); return; }
    if (!cmd.c.act) { body.appendChild(el('div', { class: 'empty', text: 'לא הבנתי מה לעשות. כותבים "להשתיק", "להעביר לארכיון" או "לסמן כנקרא", ועל מה: קבוצות / פרטיים / שקטות מחודש / עם המילה "…".' })); return; }
    var L = cmdMatches(cmd.c);
    if (!Object.keys(D.map).length) { emptyHint(body, 'קודם סורקים את רשימת הצ\'אטים.'); return; }
    if (!L.length) { body.appendChild(el('div', { class: 'empty', text: 'אין צ\'אטים שמתאימים: ' + cmdText(cmd.c, 0) + '. אם הרשימה לא עדכנית – 🔄 לסרוק.' })); return; }
    var n = Object.keys(cmd.pick).length;
    var run = el('button', { class: 'btn g', type: 'button', on: { click: function () {
      var k = Object.keys(cmd.pick).length; if (!k) return;
      if (k > 150) { setMsg('עד 150 צ\'אטים בפעם אחת. מורידים סימון מחלק, או מצמצמים את הפקודה.'); return; }
      if (!confirm(cmdText(cmd.c, k) + '?\n\nזה כמו ללחוץ בתפריט של כל צ\'אט. אפשר לבטל אחר כך מתפריט הצ\'אט.')) return;
      runCmd();
    } } }, ['✓ לבצע (' + n + ')']);
    body.appendChild(el('div', { class: 'form' }, [el('b', { text: cmdText(cmd.c, L.length) }), el('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' }, [run,
      el('button', { class: 'btn', type: 'button', on: { click: function () { var all = L.every(function (x) { return cmd.pick[x.n]; }); L.forEach(function (x) { if (all) delete cmd.pick[x.n]; else cmd.pick[x.n] = 1; }); draw(); } } }, ['לסמן הכול / לבטל'])])]));
    L.slice(0, 300).forEach(function (x) {
      var id = 'c' + Math.abs(hash(x.n));
      var cb = el('input', { type: 'checkbox', id: id }); cb.checked = !!cmd.pick[x.n];
      cb.addEventListener('change', function () { if (cb.checked) cmd.pick[x.n] = 1; else delete cmd.pick[x.n]; run.textContent = '✓ לבצע (' + Object.keys(cmd.pick).length + ')'; });
      body.appendChild(el('label', { for: id, class: 'row', style: 'cursor:pointer' }, [cb, el('span', { class: 'nm', text: (x.g ? '👥 ' : '') + x.n }), el('span', { class: 'mut', text: x.t ? 'אחרון לפני ' + ago(x.t) : '' })]));
    });
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
  api._t = { parseCmd: parseCmd, cmdMatches: cmdMatches, doOne: doOne, morning: morning, personal: personal, grpStart: grpStart, parseWhen: parseWhen, readRow: readRow, collect: collect, D: D, scanAll: scanAll, prepare: prepare, exportCsv: exportCsv, openChat: openChat };

  // ---------- טעינה ומעקב ----------
  store.get(['waMap', 'waLabels', 'waTags', 'waNotes', 'waRem', 'waOpt']).then(function (o) {
    if (o.waMap) D.map = o.waMap;
    if (Array.isArray(o.waLabels)) D.labels = o.waLabels;
    if (o.waTags) D.tags = o.waTags;
    if (o.waNotes) D.notes = o.waNotes;
    if (Array.isArray(o.waRem)) D.rem = o.waRem;
    if (o.waOpt) D.opt = Object.assign(D.opt, o.waOpt);
    collect(); banners(); if (open) draw();
    setTimeout(function () { morning(false); }, 4000);
  }).catch(function () {});
  chrome.storage.onChanged.addListener(function (ch, area) {
    if (area !== 'local') return;
    if (ch.waRem) { D.rem = ch.waRem.newValue || []; banners(); if (open && tab === 'rem') draw(); }
  });
  var pend = 0;
  new MutationObserver(function () {
    if (pend) return;
    pend = setTimeout(function () { pend = 0; if (!scanning) collect(); if (form === 'grp' && grp && open) { var b = grp.m.size; grpCollect(); if (grp.m.size !== b) draw(); } }, 700);
  }).observe(document.documentElement, { childList: true, subtree: true });
  setInterval(save, 4000);
  setInterval(banners, 30000);
  var lastOpen = '';
  setInterval(function () { var n = openName(); if (n !== lastOpen) { lastOpen = n; grp = null; if (open) { form = null; draw(); } } else if (form === 'grp' && grp && open) { var b = grp.m.size; grpCollect(); if (grp.m.size !== b) draw(); } }, 1000);
  if (window.__hkWaOpen) { window.__hkWaOpen = false; toggle(true); }
})();
