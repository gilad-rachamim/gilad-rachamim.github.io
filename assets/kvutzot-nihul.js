/* לוח הניהול של "מוצאים קבוצה" – רק עם המפתח של גילעד (בקישור הסודי #k=...). המפתח לא נשמר בשום מקום. */
(function () {
  'use strict';
  var API = 'https://kelim-kvutzot.gilad4049.workers.dev';
  var key = (location.hash.match(/k=([^&]+)/) || [])[1] || '';
  var box = document.querySelector('[data-kvn]');
  if (!box) return;
  if (!key) { box.innerHTML = '<p>הלוח הזה פתוח רק דרך הקישור הסודי מהבוט.</p>'; return; }
  history.replaceState(null, '', location.pathname);   // שהמפתח לא יישאר בשורת הכתובת
  var ST = { pending: 'ממתינה', live: 'פעילה', hidden: 'מוסתרת', rejected: 'נדחתה' };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }
  function api(path, data) {
    return fetch(API + path, { method: data ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', 'X-Admin-Key': key }, body: data ? JSON.stringify(data) : undefined })
      .then(function (r) { if (r.status === 403) throw new Error('המפתח לא נכון'); return r.json(); });
  }
  function draw() {
    Promise.all([api('/admin/list'), api('/admin/wants')]).then(function (x) {
      var items = x[0].items.sort(function (a, b) { return (a.st === 'pending' ? 0 : a.st === 'hidden' ? 1 : 2) - (b.st === 'pending' ? 0 : b.st === 'hidden' ? 1 : 2) || b.t - a.t; });
      var html = '<h2>קבוצות (' + items.length + ')</h2>' + (items.length ? '' : '<p>אין עדיין קבוצות.</p>');
      html += items.map(function (g) {
        return '<article class="kv-card"><h3>' + esc(g.name) + ' <small>· ' + ST[g.st] + (g.rep ? ' · ' + g.rep + ' דיווחים' : '') + (g.brk ? ' · ' + g.brk + ' דיווחי קישור שבור' : '') + (g.hid === 'broken' ? ' · ירדה בגלל קישור שבור' : '') + (g.kind ? ' · ' + esc(g.kind) : '') + ' · קישורים השבוע: ' + (g.wk || 0) + ' (שבוע שעבר ' + (g.pwk || 0) + ')</small></h3>' +
          (g.ver ? '<p class="kv-ver"><span class="kv-ver-tag">✓ קבוצה מאומתת</span> של ' + esc(g.ver) + (g.verUrl ? ' · <a href="' + esc(g.verUrl) + '" target="_blank" rel="noopener nofollow" dir="ltr">' + esc(g.verUrl) + '</a>' : '') + '</p>' : '') +
          '<p>' + esc(g.desc) + '</p><p class="kv-why">' + esc(g.interests.join(', ')) + ' · ' + esc(g.region) + (g.ages.length ? ' · ' + esc(g.ages.join(', ')) : '') + (g.tags.length ? ' · ' + esc(g.tags.join(', ')) : '') + '</p>' +
          (g.whys && g.whys.length ? '<p class="kv-why">דיווחים: ' + esc(g.whys.filter(Boolean).join(' / ')) + '</p>' : '') +
          '<p><a href="' + esc(g.link) + '" target="_blank" rel="noopener nofollow" dir="ltr">' + esc(g.link) + '</a></p>' +
          '<div class="kv-act">' + ['live', 'hidden', 'rejected'].filter(function (s) { return s !== g.st; }).map(function (s) {
            return '<button class="btn' + (s === 'live' ? ' btn-gold' : '') + '" data-id="' + esc(g.id) + '" data-st="' + s + '">' + { live: 'לאשר', hidden: 'להסתיר', rejected: 'לדחות' }[s] + '</button>';
          }).join('') + '<button class="btn" data-ver="' + esc(g.id) + '"' + (g.ver ? ' data-on="1">להסיר אימות' : '>✓ לסמן כמאומתת') + '</button></div></article>';
      }).join('');
      var w = x[1].items;
      html += '<h2>מה מחפשים ואין (' + w.length + ')</h2>' + (w.length ? '<ul>' + w.map(function (r) {
        return '<li><b>' + r.n + '</b> · ' + esc(r.combo.split('|').filter(Boolean).join(' · ')) + '</li>';
      }).join('') + '</ul>' : '<p>אין עדיין בקשות.</p>');
      box.innerHTML = html;
    }).catch(function (e) { box.innerHTML = '<p>' + esc(e.message || 'אין חיבור') + '</p>'; });
  }
  box.addEventListener('click', function (e) {
    var v = e.target.closest('button[data-ver]');
    if (v) {   // מסלול שותפים: שם הארגון (ואתר) – רק אחרי שבדקת שהארגון אמיתי והקבוצה שלו
      var org = '', url = '';
      if (!v.getAttribute('data-on')) {
        org = window.prompt('שם הארגון שמנהל את הקבוצה:'); if (!org) return;
        url = window.prompt('אתר הארגון (לא חובה, מתחיל ב-https://):') || '';
      } else if (!window.confirm('להסיר את תג האימות?')) return;
      v.disabled = true;
      api('/admin/verify', { id: v.getAttribute('data-ver'), org: org, url: url.trim() }).then(function (j) {
        if (j.error) { window.alert(j.error); v.disabled = false; return; }
        draw();
      });
      return;
    }
    var b = e.target.closest('button[data-st]'); if (!b) return;
    b.disabled = true;
    api('/admin/set', { id: b.getAttribute('data-id'), st: b.getAttribute('data-st') }).then(draw);
  });
  draw();
}());
