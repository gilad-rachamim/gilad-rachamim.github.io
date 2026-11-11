// מתכונים שמשתפים (חנוכה למשפחה): כל אחד מעלה מתכון עם תמונה, אחרים משאירים פרגון ולב.
// השרת: tools/matkonim-apps-script.gs (Google Apps Script + גיליון + תיקייה בדרייב).
// API ריק או לא עונה -> הודעת "בקרוב" רגועה, ומתכוני הבסיס בדף ממשיכים לעבוד.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var app = $('mt-app');
  if (!app) return;
  var LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var API = LOCAL ? 'http://127.0.0.1:8796/exec' : 'https://script.google.com/macros/s/AKfycbwuKYnSS0oo-7vAqKop2F4htfD8-AI5dStDmyk0Idg21wICygcXw1fi7_Ut_xzjZ6dw/exec';
  var KIND = { sufganiyot: 'סופגניות', levivot: 'לביבות', other: 'עוד מתכון' };
  var store = {
    get: function (k) { try { return localStorage.getItem('mt-' + k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem('mt-' + k, v); } catch (e) {} }
  };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function tok() { var t = store.get('t'); if (!t) { t = Math.random().toString(36).slice(2) + Date.now().toString(36); store.set('t', t); } return t; }
  function used(how) { if (window.toolUsed) window.toolUsed('chanuka_matkonim', { how: how }); }

  // ניהול: ?admin=KEY נשמר בטלפון הזה ונמחק מהכתובת
  var am = /[?&]admin=([a-z0-9]{8,40})/i.exec(location.search);
  if (am) { store.set('admin', am[1]); try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) {} }
  var ADMIN = store.get('admin');

  function call(body) {
    // text/plain = בקשה פשוטה, בלי preflight, כך ש-Apps Script עונה גם מאתר אחר
    return fetch(API, { method: 'POST', body: JSON.stringify(body) })
      .then(function (r) { return r.json(); })
      .then(function (d) { if (!d || !d.ok) throw new Error((d && d.error) || 'משהו השתבש. נסו שוב.'); return d; });
  }

  var LIST = [], FILTER = 'all', SORT = 'new', Q = '', HEARTS = {};
  var KOSHER = { chalavi: 'חלבי', parve: 'פרווה', basari: 'בשרי' };
  var DIET = { gf: 'ללא גלוטן', keto: 'קטוגני', vegan: 'טבעוני', veg: 'צמחוני' }, DF = '';
  function diets(r) { return (r.dt || []).filter(function (d) { return DIET[d]; }); }

  // רק רשימת המתכונים מתעדכנת בזמן חיפוש, כדי שהמקלדת לא תיסגר
  function drawItems() {
    var q = Q.trim().toLowerCase();
    var shown = LIST.filter(function (r) {
      if (FILTER !== 'all' && r.k !== FILTER) return false;
      if (DF && diets(r).indexOf(DF) < 0) return false;
      if (!q) return true;
      return [r.t, r.n, r.ing, r.st, r.sto, KOSHER[r.ks] || ''].concat(diets(r).map(function (d) { return DIET[d]; })).join(' ').toLowerCase().indexOf(q) >= 0;
    });
    if (SORT === 'love') shown = shown.slice().sort(function (a, b) { return (b.h || 0) - (a.h || 0); });
    $('mt-items').innerHTML = shown.length ? '<div class="mt-list">' + shown.map(card).join('') + '</div>'
      : '<p class="mt-sm">' + (q ? 'לא מצאנו מתכון כזה. נסו מילה אחרת.' : LIST.length ? 'אין עדיין מתכונים מהסוג הזה. אולי שלכם יהיה הראשון?' : 'עוד אין מתכונים. המתכון שלכם יכול להיות הראשון!') + '</p>';
    wireItems();
  }

  // הדפסת מתכון אחד ככרטיס נקי, בחלון נפרד
  function printRecipe(r) {
    var w = window.open('', '_blank');
    if (!w) { alert('הדפדפן חסם חלון חדש. אפשרו חלונות קופצים ונסו שוב.'); return; }
    var tags = [KIND[r.k] || KIND.other, KOSHER[r.ks]].concat(diets(r).map(function (d) { return DIET[d]; })).filter(Boolean).join(' · ');
    w.document.write('<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>' + esc(r.t) + '</title><style>' +
      'body{font-family:Arial,sans-serif;max-width:720px;margin:24px auto;padding:0 18px;color:#111;line-height:1.6}h1{font-size:26px;margin:0 0 4px}' +
      '.m{color:#555;margin:0 0 14px}h2{font-size:18px;border-bottom:2px solid #c9a55c;padding-bottom:3px;margin:18px 0 6px}p{white-space:pre-line;margin:0}' +
      'img{max-width:100%;max-height:300px;border-radius:10px;margin:8px 0}.f{margin-top:26px;color:#777;font-size:12px;border-top:1px solid #ddd;padding-top:6px}</style></head><body>' +
      '<h1>' + esc(r.t) + '</h1><p class="m">' + esc(tags) + (r.n ? ' · מאת ' + esc(r.n) : '') + '</p>' +
      (r.ph && r.ph[0] ? '<img src="' + esc(r.ph[0]) + '" alt="" referrerpolicy="no-referrer">' : '') +
      (r.sto ? '<p><i>' + esc(r.sto) + '</i></p>' : '') +
      '<h2>מצרכים</h2><p>' + esc(r.ing) + '</p><h2>אופן ההכנה</h2><p>' + esc(r.st) + '</p>' +
      '<p class="f">מתכונים שמשתפים לחנוכה · hakelim.com/kodesh/chanuka/matkonim/</p>' +
      '<script>window.onload=function(){setTimeout(function(){window.print()},400)}<\/script></body></html>');
    w.document.close();
    used('print');
  }
  try { HEARTS = JSON.parse(store.get('hearts') || '{}'); } catch (e) {}

  function load(focus) {
    return fetch(API + '?list=1').then(function (r) { return r.json(); }).then(function (d) {
      if (!d || !d.ok) throw new Error('x');
      LIST = d.recipes || [];
      draw(focus);
    });
  }

  function draw(focus) {
    var counts = { all: LIST.length, sufganiyot: 0, levivot: 0, other: 0 };
    LIST.forEach(function (r) { counts[r.k] = (counts[r.k] || 0) + 1; });
    var chips = [['all', 'הכול'], ['sufganiyot', 'סופגניות'], ['levivot', 'לביבות'], ['other', 'עוד']].map(function (c) {
      return '<button type="button" class="mt-chip' + (FILTER === c[0] ? ' on' : '') + '" data-f="' + c[0] + '">' + c[1] + ' (' + (counts[c[0]] || 0) + ')</button>';
    }).join('');
    var sorts = [['new', 'הכי חדשים'], ['love', 'הכי אהובים ❤']].map(function (c) {
      return '<button type="button" class="mt-chip' + (SORT === c[0] ? ' on' : '') + '" data-s="' + c[0] + '">' + c[1] + '</button>';
    }).join('');
    app.innerHTML =
      '<div class="mt-box"><h2>יש לכם מתכון חנוכה משלכם?</h2><p class="mt-sm">מעלים אותו עם תמונה, וכל המשפחות נהנות. בלי הרשמה.</p>' +
      '<div class="actions" style="justify-content:center"><button class="btn btn-gold" type="button" id="mt-open">להעלות מתכון</button></div></div>' +
      '<div id="mt-form-w"></div>' +
      (ADMIN ? '<p class="mt-adm">מצב ניהול פעיל בטלפון הזה: ליד כל מתכון ופרגון יש "להסתיר".</p>' : '') +
      '<div class="mt-chips">' + chips + '</div>' +
      '<div class="mt-chips" style="margin-top:0">' + ['', 'gf', 'keto', 'vegan', 'veg'].map(function (d) { var n = d ? LIST.filter(function (r) { return diets(r).indexOf(d) >= 0; }).length : 0; return '<button type="button" class="mt-chip' + (DF === d ? ' on' : '') + '" data-d="' + d + '">' + (d ? DIET[d] + ' (' + n + ')' : 'כל סוגי התזונה') + '</button>'; }).join('') + '</div>' +
      '<div class="mt-tools"><input id="mt-q" type="search" placeholder="חיפוש: שם, מצרך, מי כתב…" aria-label="חיפוש במתכונים" value="' + esc(Q) + '"><div class="mt-chips" style="margin:0">' + sorts + '</div></div>' +
      '<div id="mt-items"></div>';
    wire();
    drawItems();
    var target = focus || (location.hash.indexOf('#r-') === 0 ? location.hash.slice(3) : '');
    if (target && $('r-' + target)) { $('r-' + target).classList.add('hl'); $('r-' + target).scrollIntoView({ block: 'start' }); }
  }

  function card(r) {
    var ph = r.ph && r.ph.length ? '<div class="mt-ph n' + r.ph.length + '">' + r.ph.map(function (u, i) {
      return '<img src="' + esc(u) + '" alt="' + esc(r.t) + (r.ph.length > 1 ? ' – תמונה ' + (i + 1) : '') + '" loading="lazy" referrerpolicy="no-referrer">';
    }).join('') + '</div>' : '';
    var liked = !!HEARTS[r.id];
    var share = 'https://wa.me/?text=' + encodeURIComponent('מתכון לחנוכה: ' + r.t + '\n' + location.origin + location.pathname + '#r-' + r.id);
    return '<article class="mt-r" id="r-' + esc(r.id) + '">' + ph + '<div class="mt-in">' +
      '<h3>' + esc(r.t) + '</h3>' +
      '<p class="mt-by"><span class="mt-k">' + esc(KIND[r.k] || KIND.other) + '</span>' +
      (r.ks && KOSHER[r.ks] ? '<span class="mt-k mt-ks-' + r.ks + '">' + KOSHER[r.ks] + '</span>' : '') +
      diets(r).map(function (d) { return '<span class="mt-k mt-dt">' + DIET[d] + '</span>'; }).join('') + (r.n ? 'מאת ' + esc(r.n) + ' · ' : '') + esc(r.d) + '</p>' +
      (r.sto ? '<p class="mt-sto">' + esc(r.sto) + '</p>' : '') +
      '<details><summary>למתכון המלא</summary><h4>מצרכים</h4><p class="mt-txt">' + esc(r.ing) + '</p><h4>אופן ההכנה</h4><p class="mt-txt">' + esc(r.st) + '</p></details>' +
      '<div class="mt-bar"><button type="button" class="mt-heart' + (liked ? ' on' : '') + '" data-heart="' + esc(r.id) + '" aria-pressed="' + liked + '">' + (liked ? '❤' : '🤍') + ' <span>' + (r.h || 0) + '</span></button>' +
      '<a class="btn btn-line btn-sm" href="' + share + '" target="_blank" rel="noopener" data-wa="' + esc(r.id) + '">לשלוח בווטסאפ</a>' +
      '<button type="button" class="btn btn-line btn-sm" data-print="' + esc(r.id) + '">להדפיס</button>' +
      (ADMIN ? '<button type="button" class="mt-hide" data-hide-r="' + esc(r.id) + '">להסתיר מתכון</button>' : '') + '</div>' +
      '<h4>פרגונים' + (r.c.length ? ' (' + r.c.length + ')' : '') + '</h4>' +
      (r.c.length ? '<ul class="mt-cs">' + r.c.map(function (c) {
        return '<li>' + (c.n ? '<b>' + esc(c.n) + ':</b> ' : '') + esc(c.x) +
          (ADMIN ? ' <button type="button" class="mt-hide" data-hide-c="' + esc(c.id) + '">להסתיר</button>' : '') + '</li>';
      }).join('') + '</ul>' : '<p class="mt-sm">היו הראשונים לפרגן.</p>') +
      '<form class="mt-cf" data-cf="' + esc(r.id) + '" novalidate><input name="n" maxlength="40" placeholder="השם שלכם (לא חובה)" aria-label="השם שלכם">' +
      '<textarea name="x" maxlength="400" placeholder="מילה טובה למי שכתב את המתכון" aria-label="פרגון"></textarea>' +
      '<input name="hp" class="mt-hp" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<button class="btn btn-line btn-sm" type="submit">לשלוח פרגון</button><p class="mt-err" role="alert"></p></form>' +
      '</div></article>';
  }

  function wire() {
    $('mt-open').onclick = openForm;
    [].forEach.call(app.querySelectorAll('[data-f]'), function (b) { b.onclick = function () { FILTER = b.getAttribute('data-f'); draw(); }; });
    [].forEach.call(app.querySelectorAll('[data-d]'), function (b) { b.onclick = function () { DF = b.getAttribute('data-d'); draw(); }; });
    [].forEach.call(app.querySelectorAll('[data-s]'), function (b) { b.onclick = function () { SORT = b.getAttribute('data-s'); draw(); }; });
    $('mt-q').oninput = function () { Q = this.value; drawItems(); };
  }

  function wireItems() {
    [].forEach.call(app.querySelectorAll('[data-print]'), function (b) {
      b.onclick = function () { var id = b.getAttribute('data-print'); LIST.forEach(function (r) { if (r.id === id) printRecipe(r); }); };
    });
    [].forEach.call(app.querySelectorAll('[data-heart]'), function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-heart');
        if (HEARTS[id]) return;
        HEARTS[id] = 1; store.set('hearts', JSON.stringify(HEARTS));
        var n = b.querySelector('span'); n.textContent = (+n.textContent || 0) + 1;
        b.classList.add('on'); b.firstChild.nodeValue = '❤ '; b.setAttribute('aria-pressed', 'true');
        LIST.forEach(function (r) { if (r.id === id) r.h = (r.h || 0) + 1; });
        used('heart');
        call({ op: 'heart', id: id, tok: tok() }).catch(function () {});
      };
    });
    [].forEach.call(app.querySelectorAll('[data-wa]'), function (a) { a.addEventListener('click', function () { used('wa'); }); });
    [].forEach.call(app.querySelectorAll('form[data-cf]'), function (f) {
      f.onsubmit = function (e) {
        e.preventDefault();
        var err = f.querySelector('.mt-err'), x = f.x.value.trim();
        if (x.length < 2) { err.textContent = 'כתבו כמה מילים.'; return; }
        err.textContent = 'שולח…';
        var id = f.getAttribute('data-cf');
        call({ op: 'comment', id: id, n: f.n.value.trim(), x: x, hp: f.hp.value, tok: tok() }).then(function () {
          used('comment');
          return load(id);
        }).catch(function (er) { err.textContent = er.message; });
      };
    });
    [].forEach.call(app.querySelectorAll('[data-hide-r],[data-hide-c]'), function (b) {
      b.onclick = function () {
        var isC = b.hasAttribute('data-hide-c');
        if (!confirm(isC ? 'להסתיר את הפרגון?' : 'להסתיר את המתכון מכולם?')) return;
        call({ op: 'hide', key: ADMIN, type: isC ? 'c' : 'r', id: b.getAttribute(isC ? 'data-hide-c' : 'data-hide-r') })
          .then(function () { return load(); }).catch(function (er) { alert(er.message); });
      };
    });
  }

  // ---------- טופס העלאה ----------
  var PHOTOS = [];
  function openForm() {
    var w = $('mt-form-w');
    if (w.innerHTML) { w.innerHTML = ''; return; }
    PHOTOS = [];
    w.innerHTML = '<form class="k-form" id="mt-f" novalidate style="margin-top:1rem">' +
      '<div class="field"><label for="mt-t">שם המתכון</label><input id="mt-t" maxlength="70" placeholder="סופגניות במילוי קרם וניל של סבתא"></div>' +
      '<div class="field"><label for="mt-k">סוג</label><select id="mt-k"><option value="sufganiyot">סופגניות</option><option value="levivot">לביבות</option><option value="other">עוד מתכון לחנוכה</option></select></div>' +
      '<div class="field"><label for="mt-ks">חלבי, פרווה או בשרי?</label><select id="mt-ks"><option value="">לבחור…</option><option value="parve">פרווה</option><option value="chalavi">חלבי</option><option value="basari">בשרי</option></select></div>' +
      '<fieldset class="mt-dts"><legend>מתאים גם ל… <span class="opt">(לא חובה)</span></legend>' + Object.keys(DIET).map(function (d) { return '<label class="mt-gf"><input type="checkbox" name="mt-dt" value="' + d + '"> ' + DIET[d] + '</label>'; }).join('') + '</fieldset>' +
      '<div class="field"><label for="mt-ing">מצרכים</label><textarea id="mt-ing" maxlength="2500" rows="5" placeholder="שורה לכל מצרך:\n3 כוסות קמח\n2 ביצים"></textarea></div>' +
      '<div class="field"><label for="mt-st">אופן ההכנה</label><textarea id="mt-st" maxlength="4000" rows="6" placeholder="שלב אחרי שלב"></textarea></div>' +
      '<div class="field"><label for="mt-sto">מילה אישית <span class="opt">(לא חובה)</span></label><textarea id="mt-sto" maxlength="600" rows="2" placeholder="את המתכון הזה אמא הכינה לנו בכל חנוכה."></textarea></div>' +
      '<div class="field"><label for="mt-ph">תמונות <span class="opt">(עד 3, לא חובה)</span></label><input id="mt-ph" type="file" accept="image/*" multiple><div class="mt-prev" id="mt-prev"></div></div>' +
      '<div class="field"><label for="mt-n">השם שיופיע ליד המתכון <span class="opt">(לא חובה)</span></label><input id="mt-n" maxlength="40" placeholder="משפחת לוי מאשדוד"></div>' +
      '<input id="mt-hp" class="mt-hp" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<p class="mt-sm">המתכון עולה מיד ונראה לכולם. לא מבקשים טלפון או מייל, ולא כותבים כאן קישורים או מספרי טלפון.</p>' +
      '<button class="btn btn-gold" type="submit" id="mt-go">לשתף את המתכון</button><p class="mt-err" id="mt-err" role="alert"></p></form>';
    $('mt-ph').onchange = function () {
      var files = [].slice.call(this.files || [], 0, 3);
      $('mt-err').textContent = files.length ? 'מכין תמונות…' : '';
      Promise.all(files.map(shrink)).then(function (arr) {
        PHOTOS = arr.filter(Boolean);
        $('mt-prev').innerHTML = PHOTOS.map(function (u) { return '<img src="' + u + '" alt="">'; }).join('');
        $('mt-err').textContent = PHOTOS.length < files.length ? 'תמונה אחת לא נקראה. אפשר לנסות תמונה אחרת.' : '';
      });
    };
    $('mt-f').onsubmit = submit;
    $('mt-t').focus();
  }

  // מקטין ל-1200 פיקסלים לכל היותר ושומר JPEG, כדי שההעלאה תהיה קלה גם בטלפון
  function shrink(file) {
    return new Promise(function (res) {
      if (!/^image\//.test(file.type || 'image/')) return res(null);
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var max = 1200, w = img.naturalWidth, h = img.naturalHeight, s = Math.min(1, max / Math.max(w, h));
        var c = document.createElement('canvas'); c.width = Math.round(w * s); c.height = Math.round(h * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        var q = 0.82, d = c.toDataURL('image/jpeg', q);
        while (d.length > 1900000 && q > 0.45) { q -= 0.12; d = c.toDataURL('image/jpeg', q); }
        res(d.indexOf('data:image/jpeg') === 0 ? d : null);
      };
      img.onerror = function () { URL.revokeObjectURL(url); res(null); };
      img.src = url;
    });
  }

  var busy = false;
  function submit(e) {
    e.preventDefault();
    if (busy) return;
    var r = { t: $('mt-t').value.trim(), k: $('mt-k').value, ing: $('mt-ing').value.trim(), st: $('mt-st').value.trim(), sto: $('mt-sto').value.trim(), n: $('mt-n').value.trim(), ks: $('mt-ks').value, dt: [].map.call(document.querySelectorAll('input[name=mt-dt]:checked'), function (x) { return x.value; }) };
    var err = $('mt-err');
    if (r.t.length < 2) { err.textContent = 'כתבו שם למתכון.'; return; }
    if (!r.ks) { err.textContent = 'בחרו אם המתכון חלבי, פרווה או בשרי.'; return; }
    if (r.ing.length < 5) { err.textContent = 'כתבו את המצרכים.'; return; }
    if (r.st.length < 10) { err.textContent = 'כתבו את אופן ההכנה.'; return; }
    busy = true; $('mt-go').disabled = true;
    err.textContent = PHOTOS.length ? 'מעלה את המתכון והתמונות… (כמה שניות)' : 'מעלה את המתכון…';
    call({ op: 'add', r: r, photos: PHOTOS, hp: $('mt-hp').value, tok: tok() }).then(function (d) {
      used('add');
      var mine = []; try { mine = JSON.parse(store.get('mine') || '[]'); } catch (x) {}
      mine.unshift(d.id); store.set('mine', JSON.stringify(mine.slice(0, 30)));
      FILTER = 'all';
      return load(d.id);
    }).catch(function (er) { err.textContent = er.message; })
      .then(function () { busy = false; var g = $('mt-go'); if (g) g.disabled = false; });
  }

  // ---------- התחלה: בודקים שהשרת חי, אחרת הודעה רגועה ----------
  function soon() {
    app.innerHTML = '<div class="mt-box"><h2>השיתוף נפתח בקרוב</h2><p class="mt-sm">אנחנו מכינים את המקום להעלות מתכונים ולפרגן. בינתיים, מתכוני הבסיס כאן למטה.</p></div>';
  }
  if (!API) return soon();
  // פנייה אחת בלבד (הרשימה עצמה היא גם בדיקת החיים). השרת של גוגל לפעמים מתעורר לאט.
  app.innerHTML = '<p class="mt-sm">טוען את המתכונים של כולם…</p>';
  var ctl = window.AbortController ? new AbortController() : null;
  if (ctl) setTimeout(function () { ctl.abort(); }, 20000);
  fetch(API + '?list=1', ctl ? { signal: ctl.signal } : {}).then(function (r) { return r.json(); }).then(function (d) {
    if (!d || !d.ok) throw new Error('x');
    LIST = d.recipes || [];
    draw();
  }).catch(soon);
})();
