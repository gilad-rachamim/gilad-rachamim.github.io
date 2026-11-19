/* גשר – הרשימה "מהטלפון": הודעות שהגיעו מהטלפון, מענה (נשלח מהטלפון עצמו), העתקה, סגירה, ונא לא להפריע.
 * הנתונים רק ב-chrome.storage.session (בזיכרון). שום תוכן לא נשלח לשום מקום חוץ מהטלפון המצומד.
 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var qs = new URLSearchParams(location.search);
  var focusKey = qs.get('reply') || '';
  var openForms = {};                       // key → טקסט שהוקלד (כדי שרענון הרשימה לא ימחק אותו)
  var DEF = { notif: true, dnd: false, dndHours: false, dndFrom: '22:00', dndTo: '07:00' };
  var WHY = { gone: 'ההודעה כבר לא בטלפון (נקראה או נסגרה) – אי אפשר לענות מכאן.', noreply: 'לאפליקציה הזאת אין "תשובה" מההתראה.', fail: 'הטלפון לא הצליח לשלוח.', empty: '' };

  function ask(m) { return chrome.runtime.sendMessage(m); }
  function opts() { return chrome.storage.local.get('gesherOpts').then(function (o) { return Object.assign({}, DEF, o.gesherOpts || {}); }); }
  function setOpt(patch) {
    return chrome.storage.local.get('gesherOpts').then(function (o) { return chrome.storage.local.set({ gesherOpts: Object.assign({}, o.gesherOpts, patch) }); });
  }
  function when(t) {
    var d = new Date(t), s = Math.round((Date.now() - t) / 1000);
    if (s < 60) return 'עכשיו';
    if (s < 3600) return 'לפני ' + Math.round(s / 60) + ' דק׳';
    return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

  function render() {
    return chrome.storage.session.get(['gNotifs', 'gReplies']).then(function (o) {
      var list = o.gNotifs || [], rep = o.gReplies || {}, box = $('ntf-list');
      // שומרים מה שהוקלד
      box.querySelectorAll('textarea[data-key]').forEach(function (t) { openForms[t.dataset.key] = t.value; });
      var active = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.key : null;
      box.textContent = '';
      if (!list.length) { box.appendChild(el('p', 'ntf-empty', 'עוד לא הגיעו הודעות מהטלפון.')); return; }
      list.forEach(function (x) {
        var card = el('article', 'ntf' + (x.seen ? '' : ' new') + (x.key === focusKey ? ' focus' : ''));
        var img = el('img'); img.alt = ''; img.src = x.icon || '../icon32.png'; card.appendChild(img);
        var hd = el('div', 'hd');
        hd.appendChild(el('b', '', x.title || x.app));
        hd.appendChild(el('span', '', x.app + (x.dev ? ' · ' + x.dev : '') + ' · ' + when(x.at)));
        card.appendChild(hd);
        card.appendChild(el('div', 'tx', x.text));
        (x.replied || []).forEach(function (r) { card.appendChild(el('div', 'mine', '↩ אני: ' + r)); });
        var st = rep[x.key];
        if (st) card.appendChild(el('div', 'mine', st.pending ? '⏳ נשלח לטלפון…' : st.ok ? '✓ התשובה יצאה מהטלפון' : '✗ ' + (WHY[st.why] || WHY.fail)));
        var acts = el('div', 'acts');
        if (x.reply) {
          var rb = el('button', '', '↩ לענות'); rb.type = 'button';
          rb.addEventListener('click', function () { openForms[x.key] = openForms[x.key] || ''; focusKey = x.key; render().then(function () { var t = box.querySelector('textarea[data-key="' + CSS.escape(x.key) + '"]'); if (t) t.focus(); }); });
          acts.appendChild(rb);
        }
        var cb = el('button', '', '📋 להעתיק'); cb.type = 'button';
        cb.addEventListener('click', function () { navigator.clipboard.writeText(x.text).then(function () { $('ntf-msg').textContent = '✓ הועתק'; }); });
        acts.appendChild(cb);
        var xb = el('button', '', '✕ לסגור'); xb.type = 'button'; xb.title = 'נסגרת גם בטלפון';
        xb.addEventListener('click', function () { delete openForms[x.key]; ask({ t: 'gesher-ntf-dismiss', key: x.key }); });
        acts.appendChild(xb);
        card.appendChild(acts);
        if (x.reply && (x.key in openForms || x.key === focusKey)) {
          var f = el('form');
          var ta = el('textarea'); ta.dataset.key = x.key; ta.placeholder = 'כותבים תשובה… (Enter לשליחה, Shift+Enter לשורה חדשה)'; ta.value = openForms[x.key] || '';
          ta.setAttribute('aria-label', 'תשובה ל' + (x.title || x.app));
          var sb = el('button', 'gold', 'שליחה'); sb.type = 'submit';
          ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); f.requestSubmit(); } });
          f.addEventListener('submit', function (e) {
            e.preventDefault();
            var text = ta.value.trim();
            if (!text) return;
            delete openForms[x.key];
            if (focusKey === x.key) focusKey = '';
            ask({ t: 'gesher-ntf-reply', key: x.key, text: text }).then(function (r) {
              $('ntf-msg').textContent = r && r.online ? 'נשלח לטלפון…' : 'הטלפון לא מחובר כרגע – התשובה תצא כשיתחבר (עד 10 דקות).';
            });
          });
          f.appendChild(ta); f.appendChild(sb);
          card.appendChild(f);
        }
        box.appendChild(card);
      });
      if (active) { var t = box.querySelector('textarea[data-key="' + CSS.escape(active) + '"]'); if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); } }
    });
  }

  function optsView() {
    return opts().then(function (op) {
      $('opt-notif').checked = op.notif;
      $('opt-dnd').checked = op.dnd;
      $('opt-dnd-hours').checked = op.dndHours;
      $('dnd-from').value = op.dndFrom;
      $('dnd-to').value = op.dndTo;
    });
  }
  $('opt-notif').addEventListener('change', function () { setOpt({ notif: $('opt-notif').checked }); });
  $('opt-dnd').addEventListener('change', function () { setOpt({ dnd: $('opt-dnd').checked }); });
  $('opt-dnd-hours').addEventListener('change', function () { setOpt({ dndHours: $('opt-dnd-hours').checked }); });
  $('dnd-from').addEventListener('change', function () { setOpt({ dndFrom: $('dnd-from').value }); });
  $('dnd-to').addEventListener('change', function () { setOpt({ dndTo: $('dnd-to').value }); });

  chrome.storage.onChanged.addListener(function (c, area) {
    if (area === 'session' && (c.gNotifs || c.gReplies)) render();
    if (area === 'local' && c.gesherOpts) optsView();
  });
  // מי שפתח את הדף ראה את ההודעות – מנקים את המספר על סמל התוסף
  function seen() { if (document.visibilityState === 'visible') ask({ t: 'gesher-ntf-seen' }).catch(function () {}); }
  document.addEventListener('visibilitychange', seen);
  optsView();
  render().then(function () {
    seen();
    if (focusKey) {
      var t = $('ntf-list').querySelector('textarea[data-key="' + CSS.escape(focusKey) + '"]');
      if (t) { t.scrollIntoView({ block: 'center' }); t.focus(); }
    }
  });
  setInterval(function () { if (!document.querySelector('#ntf-list textarea:focus')) render(); }, 30e3);
})();
