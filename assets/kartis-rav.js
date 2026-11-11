// R2 – כרטיס ביקור דיגיטלי לרב ולבית כנסת (כלי קודש).
// הפרטים נארזים לקוד (enc). כדי שהקישור יהיה קצר, הקוד נשמר ב-Worker של Cloudflare (tools/kartis-worker)
// ומקבלים קישור /k/#a7Xq2b. אם השרת לא עונה - נופלים לקישור הארוך (#d=...), שממשיך לעבוד תמיד.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('kr-form'), view = $('kr-card'), builder = $('kr-build');
  if (!form) return;
  var F = ['name', 'role', 'org', 'phone', 'email', 'addr', 'site', 'times', 'note'];

  function enc(o) { return btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function dec(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); return JSON.parse(decodeURIComponent(escape(atob(s)))); }
  function esc(s) { return String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function intl(p) { p = String(p || '').replace(/[^\d+]/g, ''); if (p.indexOf('+') === 0) return p.slice(1); if (p.indexOf('0') === 0) return '972' + p.slice(1); return p; }
  function read() { var o = {}; F.forEach(function (k) { var el = form.querySelector('[name=' + k + ']'); if (el && el.value.trim()) o[k] = el.value.trim(); }); return o; }
  function link(o) { return location.origin + '/kodesh/kartis/#d=' + enc(o); }
  var API = 'https://kartis.gilad4049.workers.dev';
  try { API = localStorage.getItem('kartis-api') || API; } catch (e) {}
  // קישור קצר: מבקש קוד מהשרת; אם נכשל - מחזיר את הקישור הארוך
  function shortLink(o) {
    var long = link(o);
    if (!window.fetch) return Promise.resolve(long);
    var ctl = window.AbortController ? new AbortController() : null;
    var t = setTimeout(function () { if (ctl) ctl.abort(); }, 6000);
    return fetch(API + '/s', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ d: enc(o) }), signal: ctl ? ctl.signal : undefined })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { clearTimeout(t); return j && /^[0-9A-Za-z]{6}$/.test(j.k) ? location.origin + '/k/#' + j.k : long; })
      .catch(function () { clearTimeout(t); return long; });
  }
  function cardLink() { return view._url || link(view._o); }

  function vcard(o) {
    var v = ['BEGIN:VCARD', 'VERSION:3.0', 'FN;CHARSET=UTF-8:' + o.name + (o.role ? ' – ' + o.role : ''), 'N;CHARSET=UTF-8:;' + o.name + ';;;'];
    if (o.org) v.push('ORG;CHARSET=UTF-8:' + o.org);
    if (o.role) v.push('TITLE;CHARSET=UTF-8:' + o.role);
    if (o.phone) v.push('TEL;TYPE=CELL,VOICE:+' + intl(o.phone));
    if (o.email) v.push('EMAIL;TYPE=INTERNET:' + o.email);
    if (o.addr) v.push('ADR;CHARSET=UTF-8;TYPE=WORK:;;' + o.addr + ';;;;');
    if (o.site) v.push('URL:' + o.site);
    v.push('URL:' + (view._url || link(o)));
    if (o.note) v.push('NOTE;CHARSET=UTF-8:' + o.note.replace(/\n/g, ' '));
    v.push('END:VCARD');
    return v.join('\r\n');
  }

  function render(o, preview) {
    var h = '<div class="kr"><div class="kr-top"><span class="bsd">בס"ד</span><h2>' + esc(o.name) + '</h2>' +
      (o.role ? '<p class="kr-role">' + esc(o.role) + '</p>' : '') + (o.org ? '<p class="kr-org">' + esc(o.org) + '</p>' : '') + '</div><div class="kr-btns">';
    if (o.phone) h += '<a class="btn btn-gold" href="tel:+' + intl(o.phone) + '">📞 להתקשר</a><a class="btn btn-gold" href="https://wa.me/' + intl(o.phone) + '">💬 ווטסאפ</a>';
    if (o.addr) h += '<a class="btn btn-line" href="https://waze.com/ul?q=' + encodeURIComponent(o.addr) + '&navigate=yes">🧭 ניווט בוויז</a><a class="btn btn-line" href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(o.addr) + '">🗺️ גוגל מפות</a>';
    if (o.email) h += '<a class="btn btn-line" href="mailto:' + esc(o.email) + '">✉️ מייל</a>';
    if (o.site) h += '<a class="btn btn-line" href="' + esc(/^https?:/.test(o.site) ? o.site : 'https://' + o.site) + '" rel="noopener">🌐 אתר</a>';
    h += '<button class="btn btn-line" type="button" data-kr="vcf">👤 לשמור איש קשר</button><button class="btn btn-line" type="button" data-kr="share">↗️ לשתף את הכרטיס</button></div>';
    if (o.addr) h += '<p class="kr-addr">📍 ' + esc(o.addr) + '</p>';
    if (o.times) h += '<div class="kr-times"><h3>זמני תפילות ושיעורים</h3><ul>' + o.times.split('\n').filter(Boolean).map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul></div>';
    if (o.note) h += '<p class="kr-note">' + esc(o.note).replace(/\n/g, '<br>') + '</p>';
    h += '<p class="kr-credit">כרטיס חינמי מ<a href="/kodesh/kartis/">כלי קודש</a> · רוצים כזה? בונים תוך דקה</p></div>';
    view.innerHTML = h;
    view.hidden = false;
    view._o = o;
  }

  view.addEventListener('click', function (e) {
    var b = e.target.closest('[data-kr]');
    if (!b) return;
    var o = view._o, k = b.getAttribute('data-kr');
    if (k === 'vcf') {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([vcard(o)], { type: 'text/vcard;charset=utf-8' }));
      a.download = (o.name || 'kartis').replace(/[\\/:*?"<>|]/g, '') + '.vcf';
      document.body.appendChild(a); a.click(); a.remove();
      if (window.kelimEv) window.kelimEv('save_contact', { tool: 'kartis_rav' });
    } else if (k === 'share') {
      var url = cardLink(), text = o.name + (o.org ? ' · ' + o.org : '');
      if (navigator.share) navigator.share({ title: o.name, text: text, url: url }).catch(function () {});
      else (window.kelimShort ? window.kelimShort.go('https://api.whatsapp.com/send?text=' + encodeURIComponent(text + '\n' + url)) : (location.href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(text + '\n' + url)));
    }
  });

  // מצב כרטיס: הגיעו מקישור
  function showCard(o, url) {
    view._url = url || '';
    render(o);
    builder.hidden = true;
    document.title = o.name + (o.org ? ' · ' + o.org : '') + ' – כרטיס ביקור';
    $('kr-mine').hidden = false;
  }
  var m = location.hash.match(/#d=([\w-]+)/);
  if (m) {
    try { showCard(dec(m[1])); return; } catch (e) { /* קישור פגום – ממשיכים לבנייה */ }
  }
  var mk = location.hash.match(/#k=([0-9A-Za-z]{6})/);
  if (mk) {
    builder.hidden = true;
    view.hidden = false;
    view.innerHTML = '<p class="kr-note" style="text-align:center;padding:2rem 0">פותחים את הכרטיס…</p>';
    fetch(API + '/s/' + mk[1]).then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (j) { showCard(dec(j.d), location.origin + '/k/#' + mk[1]); })
      .catch(function () {
        view.innerHTML = '<p class="kr-note" style="text-align:center;padding:2rem 0">לא הצלחנו לפתוח את הכרטיס. בדקו שיש אינטרנט ונסו שוב, או בקשו מבעל הכרטיס קישור חדש.</p>';
        $('kr-mine').hidden = false;
      });
    return;
  }

  // מצב בנייה: מה שמקלידים נשמר בטלפון, והתצוגה מתעדכנת
  try { var saved = JSON.parse(localStorage.getItem('kodesh-kartis') || '{}'); F.forEach(function (k) { var el = form.querySelector('[name=' + k + ']'); if (el && saved[k]) el.value = saved[k]; }); } catch (e) {}
  function upd() {
    var o = read();
    try { localStorage.setItem('kodesh-kartis', JSON.stringify(o)); } catch (e) {}
    if (o.name) render(o, true); else view.hidden = true;
  }
  form.addEventListener('input', upd);
  upd();
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;
    var o = read(), btn = form.querySelector('[type=submit]'), label = btn.textContent;
    btn.disabled = true; btn.textContent = 'יוצרים קישור קצר…';
    shortLink(o).then(function (url) {
      btn.disabled = false; btn.textContent = label;
      $('kr-link').value = url;
      $('kr-ready').hidden = false;
      $('kr-copy').textContent = 'להעתיק את הקישור';
      $('kr-open').href = url;
      $('kr-wa').href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent('הכרטיס שלי: ' + o.name + (o.org ? ' · ' + o.org : '') + '\n' + url);
      $('kr-ready').scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (window.toolUsed) window.toolUsed('kartis_rav', { has_times: !!o.times, has_addr: !!o.addr, short: url.indexOf('/k/#') > -1 });
    });
  });
  $('kr-copy').addEventListener('click', function () {
    var b = this;
    (navigator.clipboard ? navigator.clipboard.writeText($('kr-link').value) : Promise.reject()).then(function () { b.textContent = 'הועתק ✓'; }).catch(function () { $('kr-link').select(); });
  });
})();
