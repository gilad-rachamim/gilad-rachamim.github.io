// "🧹 מה לעשות?" בג׳ימייל: מריץ חיפוש, מראה על הדף עצמו כמה מיילים נמצאו ובדיוק מה ייעשה,
// ורק אחרי "✓ לבצע" של המשתמש לוחץ בשבילו על הכפתורים של ג׳ימייל: לארכיון, מחיקה (לאשפה), סימון כנקרא,
// כוכב, חשוב, תווית (קיימת או חדשה), שמירת קבצים מצורפים בדרייב / הורדה. רשימה לאקסל = רק קריאה של שורות הרשימה. אין כאן שליחה, אין ספאם ואין מחיקה לצמיתות. ג׳ימייל עצמו מציע "ביטול" אחרי כל פעולה.
// נטען לג׳ימייל רק בלחיצה (chrome.scripting) מהחלון של התוסף. שום מייל לא נקרא ולא יוצא מהמחשב.
(function () {
  if (window.hkGmailDo) return;
  var ACT = {
    archive: { he: 'להעביר לארכיון', done: 'הועברו לארכיון', act: '7', re: /^(?:לארכיון|העברה לארכיון|archive)$/i },
    delete: { he: 'להעביר לאשפה (אפשר לשחזר 30 יום)', done: 'הועברו לאשפה', act: '10', re: /^(?:מחיקה|delete)$/i },
    read: { he: 'לסמן כנקרא', done: 'סומנו כנקרא', act: '1', re: /^(?:סימון כפריט שנקרא|סימון כנקרא|mark as read)$/i, menu: /סימון כפריט שנקרא|סימון כנקרא|mark as read/i },
    star: { he: 'לסמן בכוכב ⭐', done: 'סומנו בכוכב', menu: /הוספת כוכב|add star/i },
    important: { he: 'לסמן כחשוב', done: 'סומנו כחשובים', menu: /^סימון כחשוב$|^mark as important$/i },
    label: { he: 'להוסיף תווית', done: 'קיבלו תווית' },
    list: { he: 'לספור ולהכין רשימה לאקסל' },
    'files-drive': { he: 'לשמור את הקבצים המצורפים בדרייב' },
    'files-down': { he: 'להוריד את הקבצים המצורפים למחשב' }
  };
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function vis(e) { return !!(e && e.offsetParent); }
  function all(sel, root) { return [].slice.call((root || document).querySelectorAll(sel)).filter(vis); }
  function fire(e, types) { (types || ['mousedown', 'mouseup', 'click']).forEach(function (t) { e.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window })); }); }
  function esc() { var a = document.activeElement || document.body; a.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true })); }
  function bar() { return all('div[gh="tm"]')[0]; }
  function rows() { return all('tr.zA'); }
  function pager() { var t = (all('span.Dj')[0] || {}).textContent || ''; var m = t.replace(/,/g, '').match(/(\d+)\s*[–-]\s*(\d+)(?:\D+(\d+))?/); return m ? { b: +m[2], n: m[3] ? +m[3] : null } : null; }
  function btn(a) {
    var b = bar(); if (!b) return null;
    return all('[role=button]', b).filter(function (x) { return (a.act && x.getAttribute('act') === a.act) || (a.re && a.re.test((x.getAttribute('aria-label') || x.getAttribute('data-tooltip') || '').trim())); })[0] || null;
  }
  function moreBtn() { var b = bar(); return b && all('[role=button]', b).filter(function (x) { return /אפשרויות אימייל נוספות|more email options|^עוד$|^more$/i.test(x.getAttribute('aria-label') || x.getAttribute('data-tooltip') || ''); })[0]; }
  function menus() { return all('[role=menu]'); }
  async function waitFor(fn, ms) { for (var t = 0; t < (ms || 6000); t += 150) { var v = fn(); if (v) return v; await sleep(150); } return null; }
  function toastText() { return all('.bAq, .vh').map(function (e) { return e.textContent; }).join(' ').replace(/\s+/g, ' ').trim(); }
  // לחיצה על "אישור" בחלון "פעולה על הרבה שיחות" של ג׳ימייל – המשתמש כבר אישר אצלנו
  async function bulkOk() {
    var ok = await waitFor(function () { return all('[role=alertdialog] button, [role=dialog] button, button[name=ok]').filter(function (b) { return /^(?:אישור|ok)$/i.test((b.textContent || '').trim()) || b.name === 'ok'; })[0]; }, 1500);
    if (ok) { fire(ok); await sleep(800); }
  }
  async function selectAll() {
    var b = bar(), cb = b && all('[role=checkbox]', b)[0]; if (!cb) return 0;
    if (cb.getAttribute('aria-checked') !== 'true') fire(cb);
    await sleep(600);
    var n = all('tr.zA.x7').length;
    var link = all('[role=main] span, [role=main] [role=link]').filter(function (e) { return /^(?:בחירת כל השיחות המתאימות|select all conversations that match)/i.test((e.textContent || '').trim()) && e.children.length === 0; })[0];
    if (link) { fire(link); await sleep(700); return -1; }  // -1 = כל התוצאות, גם בדפים הבאים
    return n;
  }
  async function viaMenu(re) {
    var m = moreBtn(); if (!m) return false;
    fire(m); var it = await waitFor(function () { return all('[role=menu] [role=menuitem]').filter(function (e) { return re.test((e.textContent || '').trim()); })[0]; }, 2500);
    if (!it) { esc(); return false; }
    fire(it); return true;
  }
  async function applyLabel(name) {
    var lab = null, sub;
    var lb = btn({ re: /^(?:תוויות|labels)$/i });
    if (lb) { fire(lb); await sleep(700); sub = menus().slice(-1)[0]; }
    else {
      var m = moreBtn(); if (!m) return 'nomenu';
      fire(m); lab = await waitFor(function () { return all('[role=menu] [role=menuitem]').filter(function (e) { return /סימון בתווית|label as/i.test(e.textContent || ''); })[0]; }, 2500);
      if (!lab) { esc(); return 'nomenu'; }
      fire(lab, ['mouseover', 'mouseenter', 'mousemove']); await sleep(800);
      if (menus().length < 2) { fire(lab); await sleep(800); }
      sub = menus().slice(-1)[0];
    }
    var inp = sub && sub.querySelector('input'); if (!inp) { esc(); esc(); return 'nomenu'; }
    inp.focus(); document.execCommand('insertText', false, name); await sleep(700);
    var items = all('[role=menuitemcheckbox], [role=menuitem]', sub);
    var exact = items.filter(function (e) { return e.getAttribute('role') === 'menuitemcheckbox' && (e.getAttribute('title') || e.textContent || '').trim() === name; })[0];
    if (exact) {
      if (exact.getAttribute('aria-checked') === 'true') { esc(); esc(); return 'already'; }
      fire(exact); await sleep(700);
      var apply = all('[role=menuitem]', sub).filter(function (e) { return /^(?:החלה|apply)$/i.test((e.textContent || '').trim()); })[0];
      if (apply) { fire(apply); await sleep(700); }
      return 'ok';
    }
    var mk = items.filter(function (e) { return /\((?:צור חדש|יצירת חדש|create new)\)/i.test(e.textContent || ''); })[0];
    if (!mk) { esc(); esc(); return 'nolabel'; }
    fire(mk);
    var dlg = await waitFor(function () { return all('[role=dialog], [role=alertdialog]').filter(function (d) { return d.querySelector('input'); })[0]; }, 3000);
    if (!dlg) return 'nolabel';
    var di = dlg.querySelector('input'); if (di && !di.value) { di.focus(); document.execCommand('insertText', false, name); }
    var create = all('button', dlg).filter(function (b) { return /^(?:יצירה|צור|create)$/i.test((b.textContent || '').trim()); })[0];
    if (!create) return 'nolabel';
    fire(create); await sleep(1200);
    return 'ok';
  }
  // ---------- הפאנל על הדף ----------
  var pan = null;
  function el(tag, txt, css) { var e = document.createElement(tag); if (txt != null) e.textContent = txt; if (css) e.style.cssText = css; return e; }
  function panel() {
    if (pan && document.body.contains(pan)) { pan.textContent = ''; return pan; }
    pan = el('div', null, 'position:fixed;z-index:2147483646;top:72px;left:24px;width:340px;max-width:calc(100vw - 48px);background:#141210;color:#f3ead7;border:2px solid #d9b25f;border-radius:14px;padding:12px 14px;font:16px/1.5 "Segoe UI",Arial,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.45);direction:rtl;text-align:right');
    pan.setAttribute('role', 'dialog'); pan.setAttribute('aria-label', 'פקודה במילים – הכלים של גילעד רחמים');
    document.body.appendChild(pan); return pan;
  }
  function button(txt, gold, fn) {
    var b = el('button', txt, 'font:inherit;cursor:pointer;border-radius:9px;padding:7px 12px;margin:6px 0 0 6px;' + (gold ? 'background:#d9b25f;color:#141210;border:0;font-weight:700' : 'background:transparent;color:#f3ead7;border:1px solid #8a7448'));
    b.type = 'button'; b.addEventListener('click', fn); return b;
  }
  function closeBtn(p) { var x = button('✕', false, function () { p.remove(); }); x.setAttribute('aria-label', 'סגירה'); x.style.cssText += ';position:absolute;top:4px;left:4px;margin:0;padding:2px 8px'; return x; }
  async function run(o) {
    var a = ACT[o.act], p = panel();
    p.appendChild(closeBtn(p));
    p.appendChild(el('b', '🧹 ' + (o.head || 'פקודה במילים'), 'display:block;color:#e9c977;margin-left:28px'));
    var msg = el('div', '⏳ מחפש בג׳ימייל…', 'margin-top:6px'); p.appendChild(msg);
    var want = '#search/' + encodeURIComponent(o.q).replace(/%20/g, '+');
    if (location.hash !== want) location.hash = want;
    await sleep(1200);
    await waitFor(function () { return rows().length || all('td.TC').length || all('[role=main] .TC').length; }, 8000);
    await sleep(500);
    var n = rows().length, pg = pager();
    if (!n) { msg.textContent = 'לא נמצאו מיילים לחיפוש הזה. אפשר לנסח אחרת בתוסף.'; return; }
    var cnt = pg && pg.n ? pg.n.toLocaleString('he-IL') : pg && pg.b > n ? 'יותר מ-' + n : (pg && !pg.n && pg.b >= 50 ? 'הרבה (יותר מ-' + pg.b + ')' : String(n));
    msg.textContent = 'נמצאו ' + cnt + ' שיחות – הן מוצגות כאן ברשימה. בודקים שזה באמת מה שרוצים.';
    if (o.act === 'list') { msg.textContent = 'נמצאו ' + cnt + ' שיחות.'; return list(o, p, msg); }
    var what = a.he + (o.act === 'label' ? ' "' + o.label + '"' : '');
    p.appendChild(el('div', 'מה ייעשה: ' + what + (/^files/.test(o.act) ? ' – בשיחות שבחיפוש (עד 25, אחת-אחת).' : ' – לכל השיחות שבחיפוש.'), 'margin-top:6px;color:#e9c977'));
    p.appendChild(el('div', 'החיפוש: ' + o.q, 'margin-top:4px;font-size:14.5px;color:#bdb3a0;direction:ltr;text-align:left;word-break:break-word'));
    var go = button('✓ לבצע: ' + what, true, async function () {
      go.disabled = true; no.disabled = true; msg.textContent = '⏳ מבצע…';
      if (/^files/.test(o.act)) { go.remove(); no.remove(); await files(o, p, msg, o.act); p.appendChild(button('סגירה', false, function () { p.remove(); })); return; }
      var sel = await selectAll();
      if (!sel) { msg.textContent = 'לא הצלחתי לבחור את המיילים. מרעננים את ג׳ימייל ומנסים שוב.'; return; }
      var res = 'ok';
      if (o.act === 'label') res = await applyLabel(o.label);
      else { var b = btn(a); if (b) fire(b); else if (a.menu) { if (!(await viaMenu(a.menu))) res = 'nomenu'; } else res = 'nomenu'; }
      await bulkOk();
      await sleep(1200);
      var t = toastText();
      if (res === 'already') msg.textContent = 'כל המיילים כבר בתווית "' + o.label + '".';
      else if (res !== 'ok') msg.textContent = 'לא מצאתי את הכפתור בג׳ימייל (אולי הממשק השתנה). הבחירה נשארה – אפשר ללחוץ בעצמכם בסרגל למעלה.';
      else msg.textContent = '✓ בוצע: ' + (sel === -1 ? 'כל השיחות בחיפוש ' : sel + ' שיחות ') + a.done + (o.act === 'label' ? ' "' + o.label + '"' : '') + '.' + (t ? ' ג׳ימייל: "' + t.slice(0, 90) + '"' : '') + ' לבטל – "ביטול" בהודעה של ג׳ימייל למטה, תוך כמה שניות.';
      go.remove(); no.textContent = 'סגירה'; no.disabled = false;
    });
    var no = button('ביטול', false, function () { p.remove(); });
    p.appendChild(go); p.appendChild(no);
    go.focus();
  }
  // ---------- רשימה לאקסל: רק מה שמוצג בשורות הרשימה (שולח, נושא, קטע קצר, תאריך). שום מייל לא נפתח ----------
  function money(s) {
    var m = s.match(/(?:₪|ש"ח|ש״ח|NIS|ILS)\s?(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)|(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)\s?(?:₪|ש"ח|ש״ח|שקלים|שקל|NIS|ILS)/i);
    if (m) return { v: +(m[1] || m[2]).replace(/,/g, ''), c: '₪' };
    m = s.match(/([$€])\s?(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)|(\d+(?:\.\d{1,2})?)\s?(USD|EUR)/i);
    if (m) return { v: +(m[2] || m[3]).replace(/,/g, ''), c: m[1] || (/eur/i.test(m[4]) ? '€' : '$') };
    return null;
  }
  function rowData(tr) {
    var who = tr.querySelector('.yW [email]') || tr.querySelector('.yW span[name]') || tr.querySelector('.yW span');
    var subj = (tr.querySelector('.bog') || {}).textContent || '', snip = ((tr.querySelector('.y2') || {}).textContent || '').replace(/^\s*[-–]\s*/, '');
    var dt = tr.querySelector('td.xW span[title], .xW [title]');
    var tid = (tr.querySelector('[data-legacy-thread-id]') || { getAttribute: function () { return ''; } }).getAttribute('data-legacy-thread-id') || '';
    var mo = money(subj + ' ' + snip);
    return { name: who ? (who.getAttribute('name') || who.textContent || '').trim() : '', mail: who ? who.getAttribute('email') || '' : '', subj: subj.trim(), date: dt ? (dt.getAttribute('title') || dt.textContent || '').trim() : '', short: dt ? (dt.textContent || '').trim() : '', amt: mo, tid: tid };
  }
  async function collect(o, msg, maxPages) {
    var out = [], seen = {}, base = '#search/' + encodeURIComponent(o.q).replace(/%20/g, '+');
    for (var p = 1; p <= maxPages; p++) {
      if (p > 1) {
        location.hash = base + '/p' + p; await sleep(1500);
        await waitFor(function () { return rows().length; }, 6000); await sleep(400);
      }
      var R = rows(), added = 0;
      R.forEach(function (tr) { var d = rowData(tr), k = d.tid || d.name + '|' + d.subj + '|' + d.date; if (!seen[k]) { seen[k] = 1; out.push(d); added++; } });
      msg.textContent = '⏳ קורא את הרשימה… ' + out.length + ' שורות (עמוד ' + p + ')';
      if (!added || R.length < 20) break;
    }
    if (location.hash !== base) location.hash = base;
    return out;
  }
  function csv(L, base) {
    var q = function (s) { s = String(s == null ? '' : s); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    var lines = [['תאריך', 'שולח', 'כתובת', 'נושא', 'סכום (מהשורה)', 'מטבע', 'קישור'].join(',')];
    L.forEach(function (d) { lines.push([d.date || d.short, d.name, d.mail, d.subj, d.amt ? d.amt.v : '', d.amt ? d.amt.c : '', d.tid ? base + '#all/' + d.tid : ''].map(q).join(',')); });
    return '﻿' + lines.join('\r\n');
  }
  async function list(o, p, msg) {
    msg.textContent = '⏳ קורא את הרשימה…';
    var L = await collect(o, msg, 20), base = location.href.split('#')[0];
    if (!L.length) { msg.textContent = 'לא מצאתי שורות ברשימה.'; return; }
    var sum = 0, nAmt = 0, by = {};
    L.forEach(function (d) { if (d.amt && d.amt.c === '₪') { sum += d.amt.v; nAmt++; } var k = d.name || d.mail || '?'; by[k] = (by[k] || 0) + 1; });
    msg.textContent = '✓ ' + L.length.toLocaleString('he-IL') + ' שיחות' + (L.length >= 1000 ? ' (עד 1,000 – לצמצם בזמן כדי לקבל הכול)' : '') + '.';
    if (nAmt) p.appendChild(el('div', 'סכום שמופיע בשורות: ' + nAmt + ' מיילים, סך הכול ₪' + Math.round(sum).toLocaleString('he-IL') + ' (לפי מה שכתוב בנושא ובשורה בלבד – לבדוק מול החשבונית).', 'margin-top:6px;color:#e9c977'));
    var top = Object.keys(by).sort(function (a, b) { return by[b] - by[a]; }).slice(0, 6);
    p.appendChild(el('div', 'הכי הרבה: ' + top.map(function (k) { return k + ' (' + by[k] + ')'; }).join(' · '), 'margin-top:4px;font-size:15px'));
    var tbl = el('div', null, 'margin-top:8px;max-height:180px;overflow:auto;border:1px solid #8a7448;border-radius:8px;font-size:14.5px');
    L.slice(0, 60).forEach(function (d) { tbl.appendChild(el('div', (d.short || '') + ' · ' + (d.name || d.mail) + ' · ' + d.subj.slice(0, 50) + (d.amt ? ' · ' + d.amt.c + d.amt.v : ''), 'padding:3px 6px;border-bottom:1px solid #2a241a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')); });
    p.appendChild(tbl);
    var data = csv(L, base);
    p.appendChild(button('⬇ להוריד לאקסל', true, function () {
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: 'text/csv;charset=utf-8' }));
      a.download = 'רשימת מיילים ' + new Date().toISOString().slice(0, 10) + '.csv'; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
      msg.textContent = '✓ הקובץ ירד לתיקיית "הורדות". נפתח באקסל, בעברית.';
    }));
    p.appendChild(button('📋 להעתיק לגיליון', false, function () {
      var tsv = data.slice(1).split('\r\n').map(function (l) { return l.replace(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/g, '\t').replace(/"/g, ''); }).join('\n');
      navigator.clipboard.writeText(tsv).then(function () { msg.textContent = '✓ הועתק. בגיליון גוגל או באקסל: Ctrl+V.'; }, function () { msg.textContent = 'ההעתקה נחסמה – אפשר להוריד לאקסל.'; });
    }));
    p.appendChild(el('div', 'רק מה שמוצג ברשימה. שום מייל לא נפתח, ושום דבר לא יוצא מהמחשב.', 'margin-top:6px;font-size:14px;color:#bdb3a0'));
  }
  // ---------- קבצים מצורפים: פותחים כל שיחה, ולוחצים על הכפתור של ג׳ימייל עצמו ליד כל קובץ ----------
  var RE_DRIVE = /(?:^|\s)(?:הוספ\S*\s(?:\S+\s){0,2}?ל-?\s?(?:google\s)?(?:drive|דרייב)|שמירה\sב-?\s?(?:google\s)?(?:drive|דרייב)|add\s(?:\S+\s){0,2}?to\s(?:google\s)?drive|save\sto\s(?:google\s)?drive)/i;
  var RE_DOWN = /^(?:להורדת|הורדת|הורדה\sשל|download)\s(?:ה)?(?:קובץ|attachment)/i;
  function attBtns(re) {
    var seen = {};
    return all('.aQH [role=button][aria-label], .aQH [role=button][data-tooltip], .aQH button[aria-label]').filter(function (b) {
      var l = (b.getAttribute('aria-label') || b.getAttribute('data-tooltip') || '').trim();
      if (!re.test(l) || /תמונות|photos/i.test(l) || b.getAttribute('data-hk-done') || seen[l]) return false;
      seen[l] = 1; return true;
    });
  }
  function showBtns() { all('[role=main] .aQH span.aZo, [role=main] .aQH .aSG, [role=main] .aQH > span').forEach(function (a) { fire(a, ['mouseover', 'mouseenter']); }); }
  async function files(o, p, msg, mode) {
    var re = mode === 'files-drive' ? RE_DRIVE : RE_DOWN, base = '#search/' + encodeURIComponent(o.q).replace(/%20/g, '+');
    var total = Math.min(rows().length, 25), saved = 0, threads = 0, stop = false;
    var st = button('⏹ לעצור', false, function () { stop = true; st.disabled = true; }); p.appendChild(st);
    for (var i = 0; i < total && !stop; i++) {
      if (location.hash !== base) { location.hash = base; await sleep(1300); await waitFor(function () { return rows().length; }, 6000); }
      var tr = rows()[i]; if (!tr) break;
      msg.textContent = '⏳ שיחה ' + (i + 1) + ' מתוך ' + total + ' · ' + saved + ' קבצים ' + (mode === 'files-drive' ? 'נשמרו' : 'ירדו');
      fire(tr.querySelector('.bog') || tr);
      await waitFor(function () { return all('h2.hP').length; }, 6000); await sleep(1200);
      showBtns(); await sleep(400);
      var B = attBtns(re);
      if (B.length) threads++;
      for (var j = 0; j < B.length && !stop; j++) { B[j].setAttribute('data-hk-done', '1'); fire(B[j]); saved++; await sleep(mode === 'files-drive' ? 1600 : 900); }
    }
    location.hash = base;
    st.remove();
    msg.textContent = (saved ? '✓ ' + saved + ' קבצים מ-' + threads + ' שיחות ' + (mode === 'files-drive' ? 'נשמרו בדרייב (ב"האחסון שלי").' : 'ירדו לתיקיית "הורדות".') : 'לא מצאתי כפתור ' + (mode === 'files-drive' ? '"הוספה לדרייב"' : '"הורדה"') + ' ליד הקבצים. אפשר לפתוח מייל ולעבור עם העכבר על הקובץ.') + (stop ? ' (נעצר)' : '') + (rows().length > 25 && total === 25 ? ' עברתי על 25 הראשונות – לצמצם את החיפוש בזמן ולהריץ שוב.' : '');
    if (saved && mode === 'files-drive') p.appendChild(button('📁 לפתוח את הדרייב', false, function () { window.open('https://drive.google.com/drive/recent', '_blank', 'noopener'); }));
  }
  window.hkGmailDo = function (o) { run(o).catch(function () { var p = panel(); p.appendChild(closeBtn(p)); p.appendChild(el('div', 'משהו השתבש. מרעננים את ג׳ימייל ומנסים שוב.')); }); return true; };
})();
