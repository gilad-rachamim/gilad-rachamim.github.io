// "🧹 מה לעשות?" בג׳ימייל: מריץ חיפוש, מראה על הדף עצמו כמה מיילים נמצאו ובדיוק מה ייעשה,
// ורק אחרי "✓ לבצע" של המשתמש לוחץ בשבילו על הכפתורים של ג׳ימייל: לארכיון, מחיקה (לאשפה), סימון כנקרא,
// כוכב, חשוב, תווית (קיימת או חדשה). אין כאן שליחה, אין ספאם ואין מחיקה לצמיתות. ג׳ימייל עצמו מציע "ביטול" אחרי כל פעולה.
// נטען לג׳ימייל רק בלחיצה (chrome.scripting) מהחלון של התוסף. שום מייל לא נקרא ולא יוצא מהמחשב.
(function () {
  if (window.hkGmailDo) return;
  var ACT = {
    archive: { he: 'להעביר לארכיון', done: 'הועברו לארכיון', act: '7', re: /^(?:לארכיון|העברה לארכיון|archive)$/i },
    delete: { he: 'להעביר לאשפה (אפשר לשחזר 30 יום)', done: 'הועברו לאשפה', act: '10', re: /^(?:מחיקה|delete)$/i },
    read: { he: 'לסמן כנקרא', done: 'סומנו כנקרא', act: '1', re: /^(?:סימון כפריט שנקרא|סימון כנקרא|mark as read)$/i, menu: /סימון כפריט שנקרא|סימון כנקרא|mark as read/i },
    star: { he: 'לסמן בכוכב ⭐', done: 'סומנו בכוכב', menu: /הוספת כוכב|add star/i },
    important: { he: 'לסמן כחשוב', done: 'סומנו כחשובים', menu: /^סימון כחשוב$|^mark as important$/i },
    label: { he: 'להוסיף תווית', done: 'קיבלו תווית' }
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
    pan = el('div', null, 'position:fixed;z-index:2147483646;top:72px;left:24px;width:340px;max-width:calc(100vw - 48px);background:#141210;color:#f3ead7;border:2px solid #d9b25f;border-radius:14px;padding:12px 14px;font:14px/1.5 "Segoe UI",Arial,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.45);direction:rtl;text-align:right');
    pan.setAttribute('role', 'dialog'); pan.setAttribute('aria-label', 'פקודה במילים – הכלים של גילעד רחמים');
    document.body.appendChild(pan); return pan;
  }
  function button(txt, gold, fn) {
    var b = el('button', txt, 'font:inherit;cursor:pointer;border-radius:9px;padding:7px 12px;margin:6px 0 0 6px;' + (gold ? 'background:#d9b25f;color:#141210;border:0;font-weight:700' : 'background:transparent;color:#f3ead7;border:1px solid #4a3d24'));
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
    var what = a.he + (o.act === 'label' ? ' "' + o.label + '"' : '');
    p.appendChild(el('div', 'מה ייעשה: ' + what + ' – לכל השיחות שבחיפוש.', 'margin-top:6px;color:#e9c977'));
    p.appendChild(el('div', 'החיפוש: ' + o.q, 'margin-top:4px;font-size:12px;color:#bdb3a0;direction:ltr;text-align:left;word-break:break-word'));
    var go = button('✓ לבצע: ' + what, true, async function () {
      go.disabled = true; no.disabled = true; msg.textContent = '⏳ מבצע…';
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
  window.hkGmailDo = function (o) { run(o).catch(function () { var p = panel(); p.appendChild(closeBtn(p)); p.appendChild(el('div', 'משהו השתבש. מרעננים את ג׳ימייל ומנסים שוב.')); }); return true; };
})();
