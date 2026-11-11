/* בקשת כלי – /kelim/bakasha/ (טופס + לוח ציבורי) ו-/kelim/bakasha/sheli/ (הלוח של גילעד).
   השרת: tools/bakasha-worker (Cloudflare Worker). לבדיקה מקומית: localStorage['bk-api'] = 'http://127.0.0.1:8797'. */
(function () {
  'use strict';
  var API = 'https://kelim-bakasha.gilad4049.workers.dev';
  try { var o = localStorage.getItem('bk-api'); if (o && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o)) API = o; } catch (e) {}
  var ST = { 'new': 'התקבלה', build: 'בבנייה', done: 'נבנה', later: 'לא כרגע' };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ls(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function used(how, extra) { if (window.toolUsed) window.toolUsed('kelim_bakasha', Object.assign({ how: how }, extra || {})); }
  function call(path, body, key) {
    var h = {}; if (body) h['Content-Type'] = 'application/json'; if (key) h['X-Admin-Key'] = key;
    return fetch(API + path, { method: body ? 'POST' : 'GET', headers: h, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) { return r.json().then(function (j) { j._status = r.status; return j; }); });
  }
  function count(v) { return v > 1 ? v + ' רוצים' : 'ביקש אדם אחד'; }

  // ---------- הדף הציבורי ----------
  var form = $('[data-bk-form]'), list = $('[data-bk-board]');
  var mine = ls('bk-mine') || [], voted = ls('bk-voted') || [];

  function row(r) {
    var isMine = mine.indexOf(r.no) > -1, didVote = voted.indexOf(r.no) > -1 || isMine;
    return '<div class="bk-row' + (isMine ? ' is-mine' : '') + '" id="b' + r.no + '"><div class="bk-top"><span class="bk-no">בקשה ' + r.no + '</span>' +
      (r.dom ? '<span>' + esc(r.dom) + '</span>' : '') + '<span class="bk-st s-' + r.st + '">' + ST[r.st] + '</span>' + (isMine ? '<span class="bk-mine">שלכם</span>' : '') + '</div>' +
      '<p>' + esc(r.what) + '</p><div class="bk-act">' +
      (r.st === 'done' && r.url ? '<a class="btn btn-gold btn-sm" href="' + esc(r.url) + '">לפתוח את הכלי</a>' : '') +
      (r.st === 'done' ? '' : '<button class="bk-me" type="button" data-vote="' + r.no + '"' + (didVote ? ' disabled' : '') + '>' + (didVote ? '✓ נספרתם' : '🙋 גם אני רוצה') + '</button>') +
      '<span class="bk-cnt" data-cnt="' + r.no + '">' + count(r.v) + '</span></div></div>';
  }
  function loadBoard() {
    if (!list) return Promise.resolve();
    return call('/board').then(function (j) {
      var items = j.items || [];
      list.innerHTML = items.length ? items.map(row).join('') : '<p class="bk-empty">עוד אין בקשות בלוח. הראשונה יכולה להיות שלכם.</p>';
    }).catch(function () { list.innerHTML = '<p class="bk-empty">הלוח לא נטען כרגע. נסו לרענן את הדף בעוד רגע.</p>'; });
  }
  if (list) {
    loadBoard();
    list.addEventListener('click', function (e) {
      var b = e.target.closest('[data-vote]'); if (!b || b.disabled) return;
      var no = parseInt(b.getAttribute('data-vote'), 10);
      b.disabled = true; b.textContent = '✓ נספרתם';
      voted.push(no); ls('bk-voted', voted); used('vote');
      call('/vote', { no: no }).then(function (j) { var c = $('[data-cnt="' + no + '"]', list); if (c && j.v) c.textContent = count(j.v); }).catch(function () {});
    });
  }
  if (form) {
    var msg = $('.res', form), btn = $('button[type=submit]', form);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      var g = function (n) { var el = form.elements[n]; return el ? el.value.trim() : ''; };
      var body = { what: g('what'), who: g('who'), dom: g('dom'), email: g('email'), hp: g('_honey') };
      btn.disabled = true; btn.textContent = 'שולח…'; msg.textContent = '';
      call('/req', body).then(function (j) {
        if (!j.no) { if (j.error) throw new Error(j.error); j.no = 0; }
        if (j.no) { mine.push(j.no); ls('bk-mine', mine); }
        used('send', { domain: body.dom || 'לא נבחר', mail: body.email ? 'yes' : 'no' });
        if (window.gtag) window.gtag('event', 'request_tool', { domain: body.dom || '', page: location.pathname });
        var box = document.createElement('div');
        box.className = 'bk-done'; box.setAttribute('role', 'status'); box.tabIndex = -1;
        box.innerHTML = 'תודה רבה! הבקשה נרשמה.' + (j.no ? '<br>מספר הבקשה שלכם:<b class="num">' + j.no + '</b>' : '<br><br>') +
          'היא כבר מופיעה בלוח למטה. שם תראו מתי היא נכנסת לבנייה, ומתי הכלי מוכן.<br><br>' +
          'אני בונה לפי הסדר, ולפי מה שעוזר להכי הרבה אנשים. לכן לא כל בקשה נבנית מיד, אבל כל בקשה נשמרת.' +
          (body.email ? '<br><br>השארתם מייל, אז תקבלו הודעה כשהכלי מוכן.' : '');
        form.replaceWith(box); box.focus();
        loadBoard();
      }).catch(function (er) {
        btn.disabled = false; btn.textContent = 'לשלוח את הבקשה';
        msg.textContent = (er && er.message && !/fetch|network|load/i.test(er.message)) ? er.message : 'השליחה לא הצליחה. בדקו את החיבור לאינטרנט ונסו שוב.';
      });
    });
  }

  // ---------- הלוח של גילעד ----------
  var adm = $('[data-bk-admin]');
  if (!adm) return;
  var key = '';
  var m = location.hash.match(/k=([A-Za-z0-9_-]{16,80})/);
  if (m) { key = m[1]; ls('bk-admin', key); try { history.replaceState(null, '', location.pathname); } catch (e) {} }
  else key = ls('bk-admin') || '';
  var sumEl = $('[data-bk-sum]'), aList = $('[data-bk-alist]'), addForm = $('[data-bk-add]'), open = null;
  function locked() {
    adm.innerHTML = '<p class="lead2">הדף הזה שמור לגילעד. רוצים לבקש כלי?</p><div class="actions"><a class="btn btn-gold" href="/kelim/bakasha/">לבקשת כלי</a></div>';
  }
  if (!key) { locked(); return; }
  var ORDER = { build: 0, 'new': 1, later: 2, done: 3 };
  function arow(r) {
    var btns = [['build', '🔨 בבנייה'], ['done', '✅ נבנה'], ['later', '⏸ לא כרגע']].map(function (b) {
      return '<button type="button" data-set="' + b[0] + '" data-no="' + r.no + '"' + (r.st === b[0] ? ' class="on"' : '') + '>' + b[1] + '</button>';
    }).join('') + '<button type="button" data-hide="' + (r.hid ? '0' : '1') + '" data-no="' + r.no + '"' + (r.hid ? ' class="on"' : '') + '>' + (r.hid ? '👁 להחזיר ללוח' : '🙈 להסתיר') + '</button>';
    var mail = r.m_done === 'sent' ? '✉ קיבל עדכון שהכלי מוכן' : r.mail ? '✉ השאיר מייל' : '';
    return '<div class="bk-row' + (r.hid ? ' is-hid' : '') + '"><div class="bk-top"><span class="bk-no">בקשה ' + r.no + '</span>' + (r.dom ? '<span>' + esc(r.dom) + '</span>' : '') +
      '<span>' + count(r.v) + '</span>' + (mail ? '<span>' + mail + '</span>' : '') + (r.src === 'ווטסאפ' ? '<span>מווטסאפ</span>' : '') + '</div>' +
      '<p>' + esc(r.raw || r.what) + '</p>' + (r.who ? '<p class="bk-who">למי: ' + esc(r.who) + '</p>' : '') +
      (r.st === 'done' && r.url ? '<p class="bk-who"><a class="gold" href="' + esc(r.url) + '">' + esc(r.url.replace(/^https:\/\//, '')) + '</a></p>' : '') +
      '<div class="bk-adm">' + btns + '</div>' +
      (open === r.no ? '<div class="bk-url"><label for="bk-u">קישור לכלי <span class="opt">(לא חובה)</span></label><input id="bk-u" type="text" dir="ltr" placeholder="/kelim/..." value="' + esc(r.url || '') + '"><button class="btn btn-gold btn-sm" type="button" data-save="' + r.no + '">לשמור: נבנה</button></div>' : '') + '</div>';
  }
  function loadAdmin() {
    return call('/admin/list', null, key).then(function (j) {
      if (j._status === 403) { ls('bk-admin', ''); locked(); return; }
      var it = (j.items || []).slice().sort(function (a, b) { return (a.hid - b.hid) || (ORDER[a.st] - ORDER[b.st]) || (b.v - a.v) || (b.no - a.no); });
      var s = { 'new': 0, build: 0, done: 0 };
      it.forEach(function (r) { if (!r.hid && s[r.st] !== undefined) s[r.st]++; });
      sumEl.innerHTML = '<span><b>' + s['new'] + '</b> ממתינות</span><span><b>' + s.build + '</b> בבנייה</span><span><b>' + s.done + '</b> נבנו</span>';
      aList.innerHTML = it.length ? it.map(arow).join('') : '<p class="bk-empty">עוד אין בקשות.</p>';
    }).catch(function () { aList.innerHTML = '<p class="bk-empty">הלוח לא נטען כרגע. נסו לרענן בעוד רגע.</p>'; });
  }
  function set(body) { return call('/admin/set', body, key).then(loadAdmin); }
  aList.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var no = parseInt(b.getAttribute('data-no') || b.getAttribute('data-save'), 10);
    if (b.hasAttribute('data-save')) { var u = $('#bk-u', aList).value.trim(); open = null; set({ no: no, st: 'done', url: u }); return; }
    if (b.hasAttribute('data-hide')) { set({ no: no, hid: b.getAttribute('data-hide') === '1' }); return; }
    var st = b.getAttribute('data-set'); if (!st) return;
    if (st === 'done' && !b.classList.contains('on')) { open = no; loadAdmin().then(function () { var i = $('#bk-u', aList); if (i) i.focus(); }); return; }
    open = null; set({ no: no, st: b.classList.contains('on') ? 'new' : st });
  });
  addForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var t = addForm.elements.what.value.trim(); if (t.length < 4) return;
    call('/admin/add', { what: t }, key).then(function () { addForm.reset(); loadAdmin(); });
  });
  loadAdmin();
})();
