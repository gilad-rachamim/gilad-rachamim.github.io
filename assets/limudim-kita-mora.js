/* הכיתה הווירטואלית – פורטל המורה (/limudim/kita/).
   כל הכיתות וההקבצות של המורה בקישור אישי אחד (#t=), מטלות עם דפי עבודה מועלים, מחשבון / סרטון / שיעור לכל תרגיל,
   שאלות לכיתה עם ניהול, התלמידים והנקודות. השרת: kelim-kita (tools/kita-worker). */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  if (!$('kp-app')) return;
  var API = (function () { try { var o = localStorage.getItem('kita-api'); if (o) return o; } catch (e) {} return /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? 'http://127.0.0.1:8796' : 'https://kelim-kita.gilad4049.workers.dev'; })();
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var usedOnce = {};
  function used(a, again) { if (usedOnce[a] && !again) return; usedOnce[a] = 1; if (window.toolUsed) window.toolUsed('kita_portal', { action: a }); }
  function call(path, body) {
    return fetch(API + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}) })
      .then(function (r) { return r.json().then(function (d) { d._s = r.status; return d; }); })
      .catch(function () { return { _s: 0, error: 'אין חיבור לשרת כרגע. בודקים את האינטרנט ומנסים שוב.' }; });
  }
  function admin(act, x) { return call('/c/' + C.code + '/admin', Object.assign({ key: C.key, act: act }, x || {})); }
  function ago(t) {
    if (!t) return '—';
    var m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return 'עכשיו'; if (m < 60) return 'לפני ' + m + ' דק׳'; var h = Math.round(m / 60); if (h < 24) return 'לפני ' + h + ' שע׳';
    var d = Math.round(h / 24); return d < 8 ? 'לפני ' + d + ' ימים' : new Date(t).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
  }
  function toast(msg) { var t = $('kp-toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function () { t.hidden = true; }, 4500); }
  function err(id, msg) { var e = $(id); e.hidden = !msg; e.textContent = msg || ''; }
  function copy(text, okMsg) { try { navigator.clipboard.writeText(text).then(function () { toast(okMsg); }, function () { prompt('להעתיק:', text); }); } catch (e) { prompt('להעתיק:', text); } }
  var TOPICS = [["seder", "סדר פעולות חשבון"], ["shvarim", "חיבור וחיסור שברים"], ["achuzim", "אחוזים"], ["mishvaa", "משוואה עם נעלם אחד"], ["pilug", "פתיחת סוגריים וכינוס איברים"], ["pitagoras", "משפט פיתגורס"], ["shorashim", "משוואה ריבועית ונוסחת השורשים"], ["kefel", "לוח הכפל"], ["shetach", "שטח והיקף"], ["kefel-shvarim", "כפל וחילוק שברים"], ["chezkot", "חזקות"], ["maarechet", "מערכת משוואות"], ["hiluk", "חילוק ארוך"], ["asroni", "מספרים עשרוניים"], ["memutza", "ממוצע"], ["yachas", "יחס ופרופורציה"], ["histabrut", "הסתברות"], ["kav", "פונקציה קווית וגרף"], ["sidra", "סדרה חשבונית"], ["merchak", "מרחק בין נקודות ואמצע קטע"], ["parabola", "פונקציה ריבועית: קודקוד וחיתוך עם הצירים"], ["trigo", "טריגונומטריה במשולש ישר זווית"], ["gdila", "גדילה ודעיכה (ריבית)"], ["stiya", "חציון, שכיח וסטיית תקן"], ["nigzeret", "נגזרת של פולינום"], ["mashik", "משוואת משיק"], ["kitzon", "נקודות קיצון"], ["integral", "אינטגרל ושטח מתחת לגרף"], ["maagal", "משוואת מעגל"], ["normalit", "התפלגות נורמלית"], ["handasit", "סדרה הנדסית"], ["sinusim", "משפט הסינוסים, הקוסינוסים ושטח משולש"], ["tnua", "בעיות תנועה ועבודה"], ["merchav", "טריגונומטריה במרחב: תיבה"], ["rationalit", "פונקציה רציונלית: תחום ואסימפטוטות"], ["shoresh-f", "פונקציית שורש: תחום ונגזרת"], ["etz", "הסתברות: עץ והסתברות מותנית"], ["trig-nigzeret", "נגזרת של sin ושל cos"], ["vektor", "וקטורים"], ["merukav", "מספרים מרוכבים"], ["logaritm", "לוגריתמים ומשוואות מעריכיות"], ["exp-ln", "נגזרת של e ושל ln"], ["piramida", "פירמידה: מקצוע, גובה וזוויות"], ["dimyon", "דמיון משולשים"], ["zaviot-maagal", "זוויות במעגל"], ["parametr", "חקירה עם פרמטר"], ["induktzia", "אינדוקציה"], ["nefach-sivuv", "נפח גוף סיבוב"]];

  // ---------- הפורטל האישי: קישור אחד לכל הכיתות (#t=tid.tkey) ----------
  var HUB = lsGet('kita-hub', null), CL = [], C = null, tab = 'hw';
  var hp = new URLSearchParams(location.hash.slice(1));
  var ht = (hp.get('t') || '').match(/^([a-z0-9]{10})\.([a-z0-9]{24})$/);
  if (ht) { HUB = { tid: ht[1], tkey: ht[2] }; lsSet('kita-hub', HUB); }
  var addFromLink = /^\d{6}$/.test(hp.get('c') || '') && /^[a-z0-9]{24}$/.test(hp.get('k') || '') ? { code: hp.get('c'), key: hp.get('k'), name: '' } : null;
  var LOCAL = lsGet('kita-teach', []); // כיתות שנפתחו בדפים הקודמים (מחברת / כיתה משחקת) בטלפון הזה

  function hub(act, x) { return call('/t/x', Object.assign({ tid: HUB.tid, tkey: HUB.tkey, act: act }, x || {})); }
  function myLink() { return location.origin + '/limudim/kita/#t=' + HUB.tid + '.' + HUB.tkey; }
  function ensureHub() {
    if (HUB) return Promise.resolve(true);
    return call('/t/new', {}).then(function (d) { if (!d.ok) { toast(d.error); return false; } HUB = { tid: d.tid, tkey: d.tkey }; lsSet('kita-hub', HUB); used('hub_new'); return true; });
  }
  function loadHub() {
    var extra = LOCAL.slice(); if (addFromLink) extra.unshift(addFromLink);
    if (!HUB && !extra.length) { render(); return; }
    ensureHub().then(function (ok) {
      if (!ok) { CL = extra; render(); return; }
      hub('get').then(function (d) {
        if (!d.ok) { $('kp-hub-err').hidden = false; $('kp-hub-err').textContent = d.error; CL = extra; render(); return; }
        CL = d.classes;
        var missing = extra.filter(function (x) { return !CL.some(function (c) { return c.code === x.code; }); });
        (function next(i) {
          if (i >= missing.length) { render(); return; }
          hub('add', { code: missing[i].code, key: missing[i].key, name: missing[i].name }).then(function (r) { if (r.ok) CL = r.classes; next(i + 1); });
        })(0);
      });
    });
  }

  // ---------- הכיתות ----------
  function render() {
    $('kp-loading').hidden = true;
    var cur = lsGet('kita-portal-cur', '');
    if (addFromLink) cur = addFromLink.code;
    C = CL.filter(function (c) { return c.code === cur; })[0] || CL[0] || null;
    $('kp-classes').innerHTML = CL.map(function (c) { return '<button type="button" class="kp-cl' + (C && c.code === C.code ? ' on' : '') + '" data-code="' + c.code + '"' + (C && c.code === C.code ? ' aria-current="true"' : '') + '><b>' + esc(c.name) + '</b><span dir="ltr">' + c.code + '</span></button>'; }).join('') +
      '<button type="button" class="kp-cl kp-cl-new" id="kp-new-b">➕ כיתה / הקבצה</button>';
    $('kp-mine').hidden = !HUB || !CL.length;
    if (HUB) $('kp-mylink').value = myLink();
    $('kp-start').hidden = !!CL.length; $('kp-new').hidden = !!CL.length;
    if (!CL.length) { $('kp-class').hidden = true; return; }
    openClass();
  }
  $('kp-classes').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.id === 'kp-new-b') { $('kp-new').hidden = false; $('kp-cname').focus(); return; }
    lsSet('kita-portal-cur', b.dataset.code); addFromLink = null; render();
  });
  $('kp-create').addEventListener('click', function () {
    var b = this; b.disabled = true; err('kp-cerr', '');
    var name = $('kp-cname').value.trim();
    call('/create', { name: name, teacher: $('kp-cteacher').value }).then(function (d) {
      if (!d.ok) { b.disabled = false; return err('kp-cerr', d.error); }
      var c = { code: d.code, key: d.key, name: name };
      LOCAL = [c].concat(LOCAL); lsSet('kita-teach', LOCAL); // גם הדפים הקודמים (מעקב חי, כיתה משחקת) מכירים אותה
      ensureHub().then(function () {
        hub('add', c).then(function (r) {
          b.disabled = false; if (r.ok) CL = r.classes; else CL = [c].concat(CL);
          $('kp-cname').value = ''; $('kp-new').hidden = true; lsSet('kita-portal-cur', c.code); used('class_new', true); render();
          toast('✓ הכיתה נפתחה. עכשיו שולחים לתלמידים את הקישור.');
        });
      });
    });
  });
  $('kp-copymine').addEventListener('click', function () { copy(myLink(), '✓ הקישור האישי הועתק. שומרים אותו במקום בטוח.'); used('hub_copy'); });
  $('kp-wamine').addEventListener('click', function () { window.open('https://wa.me/?text=' + encodeURIComponent('הקישור האישי שלי לפורטל המורה (לא לשלוח לתלמידים):\n' + myLink()), '_blank'); used('hub_wa'); });

  function sLink() { return location.origin + '/limudim/kita/talmidim/?kita=' + C.code; }
  function openClass() {
    $('kp-class').hidden = false;
    $('kp-cl-name').textContent = C.name; $('kp-code').textContent = C.code;
    $('kp-slink').value = sLink();
    $('kp-live').href = '/limudim/machberet/kita/#c=' + C.code + '&k=' + C.key;
    $('kp-gifts').href = '/kelim/chashiva/kita/more/#c=' + C.code + '&k=' + C.key;
    $('kp-proj').href = '/limudim/kita/makren/#c=' + C.code + '&k=' + C.key;
    setTab(tab);
  }
  $('kp-copy').addEventListener('click', function () { copy(sLink(), '✓ הקישור לתלמידים הועתק'); used('slink_copy'); });
  $('kp-wa').addEventListener('click', function () {
    window.open('https://wa.me/?text=' + encodeURIComponent('📚 ' + C.name + ' – הכיתה הווירטואלית שלנו\nנכנסים כאן, בוחרים כינוי (בלי שם מלא) ומתחילים:\n' + sLink() + '\nקוד הכיתה: ' + C.code), '_blank'); used('slink_wa');
  });
  $('kp-rename').addEventListener('click', function () {
    var n = prompt('השם החדש לכיתה / להקבצה:', C.name); if (!n || !n.trim()) return;
    admin('settings', { name: n }).then(function (d) {
      if (!d.ok) return toast(d.error);
      C.name = n.trim(); if (HUB) hub('rename', { code: C.code, name: n }).then(function (r) { if (r.ok) CL = r.classes; render(); }); else render();
    });
  });
  $('kp-remove').addEventListener('click', function () {
    if (!confirm('להסיר את "' + C.name + '" מהפורטל? הכיתה עצמה לא נמחקת, ואפשר להחזיר אותה עם הקישור למורה שלה.')) return;
    LOCAL = LOCAL.filter(function (c) { return c.code !== C.code; }); lsSet('kita-teach', LOCAL);
    if (HUB) hub('del', { code: C.code }).then(function (r) { if (r.ok) CL = r.classes; render(); });
  });

  // ---------- לשוניות ----------
  var TABS = ['hw', 'forum', 'kids', 'fun', 'par'];
  function setTab(t) {
    tab = t;
    TABS.forEach(function (x) { $('kp-t-' + x).setAttribute('aria-selected', x === t ? 'true' : 'false'); $('kp-p-' + x).hidden = x !== t; });
    if (t === 'hw') loadHw(); else if (t === 'forum') loadForum(); else if (t === 'kids') { loadKids(); loadNotes(); } else if (t === 'fun') { loadKids(); race(); } else loadPar();
  }
  TABS.forEach(function (x) { $('kp-t-' + x).addEventListener('click', function () { setTab(x); used('tab_' + x); }); });
  setInterval(function () { if (!C || document.hidden) return; if (tab === 'forum') loadForum(); else if (tab === 'hw') loadHw(); }, 40000);

  // ---------- מטלה חדשה: דפים ותרגילים ----------
  var PAGES = []; // { data (base64 בלי הקידומת), mime, url }
  function pageThumbs() {
    $('kp-thumbs').innerHTML = PAGES.map(function (p, i) { return '<figure><img src="' + p.url + '" alt="עמוד ' + (i + 1) + '"><figcaption>עמוד ' + (i + 1) + ' <button type="button" class="linkish" data-rm="' + i + '" aria-label="להסיר את עמוד ' + (i + 1) + '">✕</button></figcaption></figure>'; }).join('');
    $('kp-pgcount').textContent = PAGES.length ? PAGES.length + ' עמודים' : '';
    fillPgSelects();
  }
  $('kp-thumbs').addEventListener('click', function (e) { var b = e.target.closest('[data-rm]'); if (b) { PAGES.splice(+b.dataset.rm, 1); pageThumbs(); } });
  function shrink(src, cb) { // תמונה -> JPEG ברוחב עד 1500 פיקסלים, עד ~600KB
    var img = new Image();
    img.onload = function () {
      var w = img.naturalWidth, h = img.naturalHeight, s = Math.min(1, 1500 / w), cv = document.createElement('canvas');
      cv.width = Math.round(w * s); cv.height = Math.round(h * s);
      var x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height); x.drawImage(img, 0, 0, cv.width, cv.height);
      var q = 0.82, url = cv.toDataURL('image/jpeg', q);
      while (url.length > 820000 && q > 0.4) { q -= 0.12; url = cv.toDataURL('image/jpeg', q); }
      cb(url);
    };
    img.onerror = function () { cb(null); };
    img.src = src;
  }
  function addUrl(url) { if (url && PAGES.length < 20) PAGES.push({ url: url, data: url.split(',')[1], mime: 'image/jpeg' }); }
  function loadPdfJs(cb) {
    if (window.pdfjsLib) return cb(window.pdfjsLib);
    var s = document.createElement('script'); s.src = '/assets/vendor/pdfjs/pdf.min.js';
    s.onload = function () { window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/assets/vendor/pdfjs/pdf.worker.min.js'; cb(window.pdfjsLib); };
    s.onerror = function () { toast('לא הצלחתי לפתוח PDF. אפשר לצלם את הדף ולהעלות תמונה.'); };
    document.head.appendChild(s);
  }
  $('kp-files').addEventListener('change', function () {
    var files = Array.prototype.slice.call(this.files || []); this.value = '';
    $('kp-pgst').textContent = 'מכינים את הדפים…';
    (function next(i) {
      if (i >= files.length || PAGES.length >= 20) { $('kp-pgst').textContent = PAGES.length >= 20 ? 'אפשר עד 20 עמודים למטלה.' : ''; pageThumbs(); return; }
      var f = files[i];
      if (/pdf$/i.test(f.type) || /\.pdf$/i.test(f.name)) {
        loadPdfJs(function (pdfjs) {
          f.arrayBuffer().then(function (buf) { return pdfjs.getDocument({ data: buf }).promise; }).then(function (doc) {
            (function pg(n) {
              if (n > doc.numPages || PAGES.length >= 20) { next(i + 1); return; }
              doc.getPage(n).then(function (page) {
                var vp = page.getViewport({ scale: 1 }), sc = Math.min(2.2, 1500 / vp.width), v2 = page.getViewport({ scale: sc });
                var cv = document.createElement('canvas'); cv.width = Math.round(v2.width); cv.height = Math.round(v2.height);
                var x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height);
                page.render({ canvasContext: x, viewport: v2 }).promise.then(function () { shrink(cv.toDataURL('image/png'), function (u) { addUrl(u); pageThumbs(); pg(n + 1); }); });
              });
            })(1);
          }).catch(function () { toast('הקובץ ' + f.name + ' לא נפתח.'); next(i + 1); });
        });
      } else if (/^image\//.test(f.type)) {
        var r = new FileReader(); r.onload = function () { shrink(r.result, function (u) { addUrl(u); pageThumbs(); next(i + 1); }); }; r.readAsDataURL(f);
      } else next(i + 1);
    })(0);
    used('pages_add');
  });

  function exRow(o) {
    o = o || {};
    var li = document.createElement('li'); li.className = 'kp-exrow';
    li.innerHTML = '<div class="kp-exline"><input class="kh-in kp-exq" dir="ltr" maxlength="200" placeholder="x^2-5x+6=0" aria-label="התרגיל">' +
      '<label class="kp-frompg"><input type="checkbox" class="kp-pg-on"> מהדף</label><select class="kh-in kp-pg" aria-label="באיזה עמוד" hidden></select>' +
      '<button type="button" class="linkish kp-exdel" aria-label="למחוק את התרגיל">✕</button></div>' +
      '<details class="kp-exmore"><summary>מחשבון, סרטון, שיעור, רמז ותשובה</summary><div class="kp-exgrid">' +
      '<label>🧮 מחשבון<select class="kh-in kp-tl"><option value="sci">מחשבון מדעי</option><option value="graph">מחשבון וגרפים</option><option value="exam">מצב בחינה</option><option value="none">בלי מחשבון</option></select></label>' +
      '<label>▶️ סרטון הדרכה (קישור יוטיוב)<input class="kh-in kp-v" dir="ltr" placeholder="https://youtu.be/…"></label>' +
      '<label>🎬 שיעור קצר מהאתר<select class="kh-in kp-top"><option value="">— בלי —</option>' + TOPICS.map(function (t) { return '<option value="' + t[0] + '">' + t[1] + '</option>'; }).join('') + '</select></label>' +
      '<label>💡 רמז מוכן (התלמידים לא רואים עד שתשלחו)<input class="kh-in kp-h" maxlength="300"></label>' +
      '<label>🔓 תשובה מוכנה<input class="kh-in kp-a" dir="ltr" maxlength="300"></label></div></details>';
    if (o.q) li.querySelector('.kp-exq').value = o.q;
    if (o.pg) { li.querySelector('.kp-pg-on').checked = true; }
    $('kp-exlist').appendChild(li); fillPgSelects(); syncRow(li);
    if (o.pg) li.querySelector('.kp-pg').value = String(o.pg);
    return li;
  }
  function syncRow(li) {
    var on = li.querySelector('.kp-pg-on').checked, q = li.querySelector('.kp-exq');
    li.querySelector('.kp-pg').hidden = !on;
    q.placeholder = on ? 'לא חובה: מספר השאלה בדף, למשל 3א' : 'x^2-5x+6=0';
    q.dir = on ? 'rtl' : 'ltr';
  }
  function fillPgSelects() {
    var n = Math.max(1, PAGES.length);
    Array.prototype.forEach.call(document.querySelectorAll('.kp-pg'), function (s) {
      var v = s.value || '1'; s.innerHTML = ''; for (var i = 1; i <= n; i++) s.insertAdjacentHTML('beforeend', '<option value="' + i + '">עמוד ' + i + '</option>'); s.value = +v <= n ? v : '1';
    });
  }
  $('kp-exlist').addEventListener('change', function (e) { if (e.target.classList.contains('kp-pg-on')) syncRow(e.target.closest('li')); });
  $('kp-exlist').addEventListener('click', function (e) { if (e.target.closest('.kp-exdel')) { e.target.closest('li').remove(); if (!$('kp-exlist').children.length) exRow(); } });
  $('kp-exadd').addEventListener('click', function () { exRow().querySelector('.kp-exq').focus(); });
  $('kp-pgadd').addEventListener('click', function () {
    var n = Math.max(1, Math.min(20, +$('kp-pgn').value || 0));
    var first = $('kp-exlist').children[0];
    if ($('kp-exlist').children.length === 1 && !first.querySelector('.kp-exq').value.trim() && !first.querySelector('.kp-pg-on').checked) first.remove();
    for (var i = 0; i < n; i++) exRow({ pg: 1 });
    used('pg_questions');
  });
  exRow();

  var BANK = [["meunach", "🧾", "חיבור, חיסור וכפל במאונך", "כיתות ב׳–ד׳"], ["kefel", "✖️", "לוח הכפל", "כיתות ב׳–ג׳"], ["seder", "🧮", "סדר פעולות חשבון", "כיתות ג׳–ו׳"], ["hiluk", "➗", "חילוק ארוך", "כיתות ד׳–ה׳"], ["shetach", "▭", "שטח והיקף", "כיתות ד׳–ז׳"], ["hashvaat-shvarim", "⚖️", "השוואת שברים, הרחבה וצמצום", "כיתות ד׳–ה׳"], ["shvarim", "🍕", "חיבור וחיסור שברים", "כיתות ד׳–ו׳"], ["asroni", "🔢", "מספרים עשרוניים", "כיתות ה׳–ו׳"], ["kefel-shvarim", "🍰", "כפל וחילוק שברים", "כיתה ו׳"], ["memutza", "📊", "ממוצע", "כיתות ה׳–ו׳ וח׳"], ["achuzim", "％", "אחוזים", "כיתות ו׳ וח׳"], ["yachas", "🍹", "יחס ופרופורציה", "כיתות ו׳ וח׳"], ["igul", "⭕", "היקף מעגל ושטח עיגול", "כיתות ו׳–ז׳"], ["gufim", "📦", "גופים: תיבה, מנסרה, גליל וחרוט", "כיתות ו׳–ח׳"], ["mechuvanim", "➖", "מספרים מכוונים: חיבור, חיסור, כפל וחילוק", "כיתה ז׳"], ["tzirim", "🗺️", "מערכת צירים: נקודות, קטעים ושטחים", "כיתה ז׳"], ["zaviot", "📐", "זוויות: צמודות, קודקודיות ובמשולש", "כיתות ז׳–ח׳"], ["bituyim", "🔤", "ביטויים אלגבריים והצבה", "כיתה ז׳"], ["shchiut", "📋", "שכיחות, שכיחות יחסית ושכיח", "כיתות ז׳–ח׳"], ["histabrut", "🎲", "הסתברות", "כיתות ז׳–ט׳"], ["pilug", "🔓", "פתיחת סוגריים וכינוס איברים", "כיתות ז׳ וט׳"], ["mishvaa", "⚖️", "משוואה עם נעלם אחד", "כיתות ז׳–ח׳"], ["chezkot", "⚡", "חזקות", "כיתות ז׳ וט׳"], ["pitagoras", "📐", "משפט פיתגורס", "כיתות ז׳–ט׳"], ["grafim", "🧭", "קריאת טבלאות וגרפים, מבוא לפונקציות", "כיתות ח׳–ט׳"], ["kav", "📈", "פונקציה קווית וגרף", "כיתות ח׳–ט׳"], ["i-shivyon", "↔️", "אי שוויונות ממעלה ראשונה", "כיתות ח׳–ט׳"], ["hafifa", "🔺", "חפיפת משולשים ומשולש שווה שוקיים", "כיתות ח׳–ט׳"], ["maarechet", "🔗", "מערכת משוואות", "כיתות ח׳–ט׳"], ["kefel-mekutzar", "🧮", "חוק הפילוג המורחב ונוסחאות הכפל המקוצר", "כיתה ט׳"], ["gorem-meshutaf", "🧲", "פירוק לגורמים: הוצאת גורם משותף", "כיתה ט׳"], ["mechanim", "➗", "משוואות עם מכנים ותחום הצבה", "כיתה ט׳"], ["shorashim", "√", "משוואה ריבועית ונוסחת השורשים", "כיתות ט׳–י׳"], ["i-shivyon-ribui", "🌗", "אי שוויון ריבועי", "כיתה ט׳ ובגרות"], ["merubaim", "🔷", "מרובעים: מקבילית, מעוין, דלתון וטרפז", "כיתה ט׳"], ["peulot", "↔️", "פעולות על פונקציות: הזזה, שיקוף וערך מוחלט", "בגרות"], ["regresia", "📍", "קו רגרסיה ומתאם", "בגרות"], ["trig-yechida", "🔄", "מעגל היחידה, זהויות ומשוואות טריגונומטריות", "בגרות"], ["thales", "📐", "משפט תאלס ומשפט חוצה הזווית", "בגרות"], ["chatchei-charut", "🥚", "פרבולה, אליפסה והיפרבולה כמקום גאומטרי", "בגרות"], ["bernoulli", "🎯", "נוסחת ברנולי: הסתברות להצלחות בחזרות", "בגרות"], ["tichnun-lineari", "🏭", "תכנון לינארי: רווח מקסימלי", "בגרות"], ["sidra", "🪜", "סדרה חשבונית", "בגרות"], ["merchak", "📍", "מרחק בין נקודות ואמצע קטע", "בגרות"], ["parabola", "🌈", "פונקציה ריבועית: קודקוד וחיתוך עם הצירים", "בגרות"], ["trigo", "📏", "טריגונומטריה במשולש ישר זווית", "בגרות"], ["gdila", "💰", "גדילה ודעיכה (ריבית)", "בגרות"], ["stiya", "📉", "חציון, שכיח וסטיית תקן", "בגרות"], ["nigzeret", "🧭", "נגזרת של פולינום", "בגרות"], ["mashik", "↗️", "משוואת משיק", "בגרות"], ["kitzon", "⛰️", "נקודות קיצון", "בגרות"], ["integral", "∫", "אינטגרל ושטח מתחת לגרף", "בגרות"], ["maagal", "⭕", "משוואת מעגל", "בגרות"], ["normalit", "🔔", "התפלגות נורמלית", "בגרות"], ["handasit", "✖", "סדרה הנדסית", "בגרות"], ["sinusim", "🔺", "משפט הסינוסים, הקוסינוסים ושטח משולש", "בגרות"], ["etz", "🌳", "הסתברות: עץ והסתברות מותנית", "בגרות"], ["tnua", "🚗", "בעיות תנועה ועבודה", "בגרות"], ["rationalit", "🎢", "פונקציה רציונלית: תחום ואסימפטוטות", "בגרות"], ["shoresh-f", "🌱", "פונקציית שורש: תחום ונגזרת", "בגרות"], ["merchav", "📦", "טריגונומטריה במרחב: תיבה", "בגרות"], ["trig-nigzeret", "〰️", "נגזרת של sin ושל cos", "בגרות"], ["piramida", "⛺", "פירמידה: מקצוע, גובה וזוויות", "בגרות"], ["vektor", "➡️", "וקטורים", "בגרות"], ["merukav", "🌀", "מספרים מרוכבים", "בגרות"], ["logaritm", "🔍", "לוגריתמים ומשוואות מעריכיות", "בגרות"], ["exp-ln", "🧪", "נגזרת של e ושל ln", "בגרות"], ["dimyon", "🪞", "דמיון משולשים", "בגרות"], ["zaviot-maagal", "🎯", "זוויות במעגל", "בגרות"], ["parametr", "🎛️", "חקירה עם פרמטר", "בגרות"], ["induktzia", "🁢", "אינדוקציה", "בגרות"], ["nefach-sivuv", "🏺", "נפח גוף סיבוב", "בגרות"]];
  // ---------- מאגר השיעורים של האתר: 72 נושאים, שולחים לכיתה כ"הכנה לשיעור" ----------
  function band(g) { var m = (g || '').match(/כית(?:ות|ה) ([א-ת])/); if (!m) return 'bg'; if ('בגדהו'.indexOf(m[1]) >= 0) return 'ys'; return 'זחט'.indexOf(m[1]) >= 0 ? 'zt' : 'bg'; }
  var bandF = 'all';
  function renderBank() {
    var q = $('kp-bq').value.trim();
    var l = BANK.filter(function (t) { return (bandF === 'all' || band(t[3]) === bandF) && (!q || t[2].indexOf(q) >= 0); });
    $('kp-bgrid').innerHTML = l.map(function (t) {
      return '<div class="kp-bk"><span class="kp-bk-e" aria-hidden="true">' + t[1] + '</span><b>' + esc(t[2]) + '</b><small>' + esc(t[3] || 'בגרות') + '</small>' +
        '<span class="btns"><button type="button" class="btn btn-sm btn-gold" data-bsend="' + t[0] + '">📨 לשלוח לכיתה</button><a class="btn btn-sm" href="/limudim/matematika/#' + t[0] + '" target="_blank" rel="noopener">👀 לצפות</a></span></div>';
    }).join('') || '<p class="note">לא מצאנו נושא כזה. אפשר לבקש שנוסיף אותו.</p>';
  }
  $('kp-bfilter').addEventListener('click', function (e) {
    var b = e.target.closest('[data-band]'); if (!b) return; bandF = b.dataset.band;
    Array.prototype.forEach.call(this.querySelectorAll('[data-band]'), function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
    renderBank();
  });
  $('kp-bq').addEventListener('input', renderBank);
  $('kp-bank').addEventListener('toggle', function () { if (this.open) { renderBank(); used('bank_open'); } });
  $('kp-bgrid').addEventListener('click', function (e) {
    var b = e.target.closest('[data-bsend]'); if (!b) return;
    var t = BANK.filter(function (x) { return x[0] === b.dataset.bsend; })[0];
    $('kp-newhw').open = true; document.querySelector('input[name="kp-kind"][value="prep"]').click();
    $('kp-ptop').value = t[0]; $('kp-title').value = 'שיעור: ' + t[2];
    $('kp-bank').open = false; $('kp-newhw').scrollIntoView({ behavior: 'smooth', block: 'start' });
    toast('📚 השיעור נכנס למטלה. אפשר להוסיף תאריך ושאלות, ואז "לתת לכיתה".'); used('bank_pick', true);
  });
  $('kp-ptop').innerHTML = '<option value="">— בלי, רק הסרטון שלי —</option>' + BANK.map(function (t) { return '<option value="' + t[0] + '">' + t[1] + ' ' + t[2] + '</option>'; }).join('');

  // ---------- הכנה לשיעור: סרטון + עד 3 שאלות ----------
  function kind() { var r = document.querySelector('input[name="kp-kind"]:checked'); return r ? r.value : ''; }
  Array.prototype.forEach.call(document.querySelectorAll('input[name="kp-kind"]'), function (r) {
    r.addEventListener('change', function () { var p = kind() === 'prep'; $('kp-prepparts').hidden = !p; $('kp-hwparts').hidden = p; if (p && !$('kp-title').value) $('kp-title').placeholder = 'למשל: הכנה לשיעור – נגזרת'; used('kind_' + (p ? 'prep' : 'hw')); });
  });
  $('kp-pq').innerHTML = [1, 2, 3].map(function (i) {
    return '<fieldset class="kp-pqrow"><legend>שאלה ' + i + '</legend><input class="kh-in kp-pq-q" maxlength="200" placeholder="השאלה, למשל: מה הנגזרת של x²?">' +
      '<div class="kp-2"><input class="kh-in kp-pq-ok" maxlength="80" placeholder="✓ התשובה הנכונה"><input class="kh-in kp-pq-no" maxlength="160" placeholder="✗ תשובות לא נכונות, מופרדות בפסיק"></div></fieldset>';
  }).join('');
  function prepData() {
    return { v: $('kp-pv').value.trim(), top: $('kp-ptop').value, q: Array.prototype.map.call(document.querySelectorAll('.kp-pqrow'), function (f) {
      var q = f.querySelector('.kp-pq-q').value.trim(), ok = f.querySelector('.kp-pq-ok').value.trim(), no = f.querySelector('.kp-pq-no').value.split(/[,،]/).map(function (x) { return x.trim(); }).filter(Boolean);
      return q && ok && no.length ? { q: q, a: [ok].concat(no.slice(0, 3)) } : null;
    }).filter(Boolean) };
  }
  function resetNew() {
    PAGES = []; pageThumbs(); $('kp-title').value = ''; $('kp-due').value = ''; $('kp-note').value = ''; $('kp-exlist').innerHTML = ''; exRow();
    $('kp-pv').value = ''; $('kp-ptop').value = ''; $('kp-mar').checked = false; $('kp-mar-d').hidden = true; Array.prototype.forEach.call(document.querySelectorAll('.kp-pqrow input'), function (i) { i.value = ''; });
    $('kp-newhw').open = false; loadHw();
  }

  $('kp-mar').addEventListener('change', function () { $('kp-mar-d').hidden = !this.checked; if (this.checked && !$('kp-title').value) $('kp-title').value = 'מרתון חזרה למבחן'; used('mar_toggle'); });
  $('kp-send').addEventListener('click', function () {
    var b = this; err('kp-err', '');
    if (kind() === 'prep') {
      if (!$('kp-title').value.trim()) { err('kp-err', 'כותבים שם, למשל: הכנה לשיעור – נגזרת.'); $('kp-title').focus(); return; }
      if (!$('kp-pv').value.trim() && !$('kp-ptop').value) { err('kp-err', 'בוחרים שיעור מהמאגר או מדביקים קישור לסרטון.'); $('kp-ptop').focus(); return; }
      b.disabled = true;
      admin('hw_new', { kind: 'prep', title: $('kp-title').value, due: $('kp-due').value, note: $('kp-note').value, prep: prepData() }).then(function (d) {
        b.disabled = false; if (!d.ok) return err('kp-err', d.error);
        used('prep_new', true); resetNew(); toast('✓ ההכנה לשיעור נשלחה לכיתה');
      });
      return;
    }
    var ex = Array.prototype.map.call($('kp-exlist').children, function (li, i) {
      var pgOn = li.querySelector('.kp-pg-on').checked, q = li.querySelector('.kp-exq').value.trim();
      return { q: pgOn ? (q ? 'שאלה ' + q + ' מהדף' : '') : q, pg: pgOn ? +li.querySelector('.kp-pg').value : 0, tl: li.querySelector('.kp-tl').value, v: li.querySelector('.kp-v').value.trim(), top: li.querySelector('.kp-top').value, h: li.querySelector('.kp-h').value.trim(), a: li.querySelector('.kp-a').value.trim() };
    }).filter(function (e) { return e.q || e.pg; });
    if (!$('kp-title').value.trim()) { err('kp-err', 'כותבים שם למטלה, למשל: דף עבודה – משוואות.'); $('kp-title').focus(); return; }
    if (!ex.length) { err('kp-err', 'צריך לפחות תרגיל אחד. אם התרגילים בדף שהעליתם: "כמה שאלות יש בדף" ← להוסיף.'); return; }
    if (ex.some(function (e) { return e.pg; }) && !PAGES.length) { err('kp-err', 'סימנתם תרגילים "מהדף", אבל עוד לא העליתם את הדף.'); return; }
    b.disabled = true; $('kp-sendst').textContent = 'שולחים…';
    if ($('kp-mar').checked && !$('kp-due').value) { err('kp-err', 'במרתון חזרה צריך תאריך: עד מתי (יום המבחן).'); $('kp-due').focus(); return; }
    admin('hw_new', { title: $('kp-title').value, due: $('kp-due').value, note: $('kp-note').value, ex: ex, mar: $('kp-mar').checked ? +$('kp-marp').value : 0 }).then(function (d) {
      if (!d.ok) { b.disabled = false; $('kp-sendst').textContent = ''; return err('kp-err', d.error); }
      var id = d.id;
      (function up(i) {
        if (i >= PAGES.length) {
          b.disabled = false; $('kp-sendst').textContent = '';
          used('hw_new', true); resetNew(); toast('✓ המטלה נשלחה לכיתה');
          return;
        }
        $('kp-sendst').textContent = 'מעלים את דף העבודה: עמוד ' + (i + 1) + ' מתוך ' + PAGES.length + '…';
        admin('hw_page', { hw: id, i: i, mime: PAGES[i].mime, data: PAGES[i].data }).then(function (r) {
          if (!r.ok) { b.disabled = false; $('kp-sendst').textContent = ''; err('kp-err', 'המטלה נשלחה, אבל עמוד ' + (i + 1) + ' לא עלה: ' + r.error); loadHw(); return; }
          up(i + 1);
        });
      })(0);
    });
  });

  // ---------- רשימת המטלות ----------
  function loadHw() {
    admin('hw_list').then(function (d) {
      if (!d.ok) { $('kp-hwlist').innerHTML = '<p class="pt-err">' + esc(d.error) + '</p>'; return; }
      $('kp-nst').textContent = d.students + ' תלמידים בכיתה';
      $('kp-hwlist').innerHTML = d.hw.length ? d.hw.map(function (h) {
        var pct = d.students ? Math.round(h.full / d.students * 100) : 0;
        var late = h.due && new Date(h.due + 'T23:59:00') < Date.now(), left = d.students - h.full;
        var acts = '<button type="button" class="btn btn-sm" data-open="' + h.id + '" data-v="' + (h.open ? 0 : 1) + '">' + (h.open ? 'לסגור' : 'לפתוח שוב') + '</button><button type="button" class="btn btn-sm" data-del="' + h.id + '">למחוק</button>';
        if (h.open && left > 0) acts = '<button type="button" class="btn btn-sm" data-remind="' + h.id + '">🔔 תזכורת ל-' + left + ' שלא סיימו</button>' + acts;
        if (h.kind === 'prep') {
          return '<div class="kp-card kp-tcard' + (h.open ? '' : ' is-closed') + '"><span class="kp-card-t"><b>' + esc(h.title) + '</b><span class="kp-tag">🎬 הכנה לשיעור</span>' +
            (h.due ? '<span class="kp-tag' + (late ? ' warn' : '') + '">📅 ' + new Date(h.due + 'T12:00:00').toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' }) + '</span>' : '') + (h.open ? '' : '<span class="kp-tag">סגורה</span>') + '</span>' +
            '<span class="kp-bar" aria-hidden="true"><i style="width:' + pct + '%"></i></span><span class="kp-sub">' + h.full + ' מתוך ' + d.students + ' צפו וענו' + (h.full ? ' · ' + h.okSum + ' תשובות נכונות' : '') + '</span>' +
            '<span class="btns"><button type="button" class="btn btn-sm btn-gold" data-pv="' + h.id + '">👀 מי צפה ומה ענו</button>' + acts + '</span><div class="kp-pvbox" id="pv-' + h.id + '" hidden></div></div>';
        }
        return '<div class="kp-card kp-tcard' + (h.open ? '' : ' is-closed') + '"><span class="kp-card-t"><b>' + esc(h.title) + '</b>' +
          (h.mar ? '<span class="kp-tag">🏃 מרתון · יעד ' + h.mar + '%</span>' : '') + (h.np ? '<span class="kp-tag">📄 ' + h.np + ' עמ׳</span>' : '') + (h.due ? '<span class="kp-tag">📅 ' + new Date(h.due + 'T12:00:00').toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' }) + '</span>' : '') + (h.open ? '' : '<span class="kp-tag">סגורה</span>') + (h.stuck ? '<span class="kp-tag warn">🙋 ' + h.stuck + ' נתקעו</span>' : '') + '</span>' +
          '<span class="kp-bar" aria-hidden="true"><i style="width:' + pct + '%"></i></span><span class="kp-sub">' + h.full + ' מתוך ' + d.students + ' סיימו הכול · ' + h.who + ' התחילו · ' + h.n + ' תרגילים</span>' +
          '<span class="btns"><a class="btn btn-sm btn-gold" href="/limudim/machberet/kita/#c=' + C.code + '&k=' + C.key + '">📊 מעקב חי ורמזים</a>' + acts + '</span></div>';
      }).join('') : '<p class="note">עוד אין מטלות. לוחצים על "מטלה חדשה" למעלה.</p>';
    });
  }
  $('kp-hwlist').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.remind) { b.disabled = true; admin('remind', { hw: b.dataset.remind }).then(function (d) { toast(d.ok ? '🔔 נשלחה תזכורת אישית ל-' + d.n + ' תלמידים' : d.error); used('remind', true); }); }
    else if (b.dataset.pv) {
      var box = $('pv-' + b.dataset.pv); if (!box.hidden) { box.hidden = true; return; }
      admin('prep_view', { hw: b.dataset.pv }).then(function (d) {
        if (!d.ok) return toast(d.error);
        var q = d.prep.q || [];
        box.hidden = false;
        box.innerHTML = '<table class="kp-tbl"><thead><tr><th>כינוי</th><th>צפה/תה</th>' + q.map(function (x, i) { return '<th title="' + esc(x.q) + '">ש' + (i + 1) + '</th>'; }).join('') + '</tr></thead><tbody>' + d.rows.map(function (r) {
          return '<tr><td><b>' + esc(r.nick) + '</b></td><td>' + (r.done ? '✓' : '—') + '</td>' + q.map(function (x, i) { var a = r.ans[i]; return '<td>' + (!r.done || a === undefined || a < 0 ? '·' : a === 0 ? '✓' : '✗') + '</td>'; }).join('') + '</tr>';
        }).join('') + '</tbody></table>' + (q.length ? '<p class="note">' + q.map(function (x, i) { var n = d.rows.filter(function (r) { return r.done; }).length, okn = d.rows.filter(function (r) { return r.ans[i] === 0; }).length; return 'ש' + (i + 1) + ': ' + esc(x.q) + ' – ' + okn + '/' + n + ' נכון'; }).join('<br>') + '</p>' : '');
      });
    }
    else if (b.dataset.open) admin('hw_open', { hw: b.dataset.open, open: +b.dataset.v }).then(loadHw);
    else if (b.dataset.del && confirm('למחוק את המטלה, את דף העבודה ואת העבודה של התלמידים בה?')) admin('hw_del', { hw: b.dataset.del }).then(loadHw);
  });

  // ---------- שאלות לכיתה ----------
  var FD = null;
  function loadForum() { admin('forum').then(function (d) { if (!d.ok) { $('kp-posts').innerHTML = '<p class="pt-err">' + esc(d.error) + '</p>'; return; } FD = d; renderForum(); }); }
  function pHtml(p) {
    return '<div class="kp-post' + (p.teacher ? ' is-t' : '') + (p.good ? ' is-good' : '') + (p.hid ? ' is-hid' : '') + '"><div class="kp-post-h"><b>' + (p.teacher ? '👩‍🏫 ' : '') + esc(p.nick) + '</b><span>' + ago(p.t) + '</span>' +
      (p.hid ? '<span class="kp-badge warn">🙈 מוסתר' + (p.rep ? ' (' + p.rep + ' דיווחים)' : '') + '</span>' : p.rep ? '<span class="kp-badge warn">🚩 ' + p.rep + '</span>' : '') +
      (p.good ? '<span class="kp-badge">⭐ מצוינת</span>' : '') + (p.help ? '<span class="kp-badge">👍 עזר</span>' : '') + '</div>' +
      '<p dir="auto">' + esc(p.text).replace(/\n/g, '<br>') + '</p><div class="kp-post-a">' +
      (!p.teacher && !p.good ? '<button type="button" class="btn btn-sm" data-good="' + p.id + '">⭐ מצוינת (+15)</button>' : '') +
      '<button type="button" class="linkish" data-hide="' + p.id + '" data-v="' + (p.hid ? 0 : 1) + '">' + (p.hid ? '👁 להחזיר' : '🙈 להסתיר') + '</button>' +
      '<button type="button" class="linkish" data-del="' + p.id + '">🗑 למחוק</button></div></div>';
  }
  function renderForum() {
    $('kp-fopen').checked = FD.open;
    var n = FD.posts.length, unans = FD.posts.filter(function (p) { return !p.replies.length && !p.teacher; }).length;
    $('kp-fsum').textContent = n ? n + ' שאלות' + (unans ? ' · ' + unans + ' בלי תשובה' : '') : '';
    $('kp-posts').innerHTML = n ? FD.posts.map(function (p) {
      return '<article class="kp-thread">' + pHtml(p) + '<div class="kp-replies">' + p.replies.map(pHtml).join('') + '</div>' +
        '<div class="kp-reply"><textarea class="kh-in" rows="1" maxlength="600" placeholder="לענות לכיתה…" aria-label="תשובה"></textarea><button type="button" class="btn btn-sm" data-par="' + p.id + '">לענות</button></div></article>';
    }).join('') : '<p class="note">עוד אין שאלות. אפשר לפתוח בשאלה לכיתה, למשל "מי יכולה להסביר למה מחלקים ב-2a?"</p>';
  }
  function fafter(d) { if (!d.ok) { toast(d.error); return false; } FD = d; renderForum(); return true; }
  $('kp-fopen').addEventListener('change', function () { admin('forum_open', { open: this.checked ? 1 : 0 }).then(fafter); used('forum_toggle'); });
  $('kp-fask-b').addEventListener('click', function () {
    var t = $('kp-fask').value.trim(); if (!t) return $('kp-fask').focus();
    admin('post', { text: t }).then(function (d) { if (fafter(d)) { $('kp-fask').value = ''; used('t_post', true); } });
  });
  $('kp-posts').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.par) { var ta = b.parentNode.querySelector('textarea'), t = ta.value.trim(); if (!t) return ta.focus(); admin('post', { text: t, par: +b.dataset.par }).then(function (d) { if (fafter(d)) used('t_reply', true); }); }
    else if (b.dataset.good) admin('post_good', { id: +b.dataset.good }).then(function (d) { if (fafter(d)) { toast('⭐ סומן. נוספו 15 נקודות לכותב/ת'); used('t_good', true); } });
    else if (b.dataset.hide) admin('post_hide', { id: +b.dataset.hide, hid: +b.dataset.v }).then(fafter);
    else if (b.dataset.del && confirm('למחוק את ההודעה (וגם את התשובות אליה)?')) admin('post_del', { id: +b.dataset.del }).then(fafter);
  });

  // ---------- התלמידים ----------
  var KD = null;
  function loadKids() {
    admin('get', {}).then(function (d) {
      if (!d.ok) { $('kp-kids').innerHTML = '<p class="pt-err">' + esc(d.error) + '</p>'; return; }
      KD = d; fillKto(); if (tab === 'kids') fillRoles(); if (tab === 'fun') showBrk(d.brk);
      $('kp-lock').checked = !!d.locked; $('kp-cmsg').value = d.msg || '';
      var act = d.rows.filter(function (r) { return r.last > Date.now() - 7 * 864e5; }).length;
      $('kp-ksum').textContent = d.rows.length + ' תלמידים · ' + act + ' פעילים השבוע';
      $('kp-kids').innerHTML = d.rows.length ? '<table class="kp-tbl"><thead><tr><th>מקום</th><th>כינוי</th><th>נקודות</th><th>נכנס/ה לאחרונה</th><th></th></tr></thead><tbody>' + d.rows.map(function (r) {
        return '<tr><td>' + (r.place ? ['🥇', '🥈', '🥉'][r.place - 1] || r.place : '·') + '</td><td><b>' + esc(r.nick) + '</b>' + (r.crown ? ' 👑 ' + esc(r.crown) : '') + '</td><td>' + r.pts + '</td><td>' + ago(r.last) + '</td><td><button type="button" class="linkish" data-kudo="' + r.sid + '" aria-label="פרגון">💐</button> <button type="button" class="linkish" data-rm="' + r.sid + '" data-n="' + esc(r.nick) + '">להסיר</button></td></tr>';
      }).join('') + '</tbody></table>' : '<p class="note">עוד אף אחד לא הצטרף. שולחים לכיתה את הקישור שלמעלה.</p>';
    });
  }
  $('kp-kids').addEventListener('click', function (e) {
    var b = e.target.closest('[data-rm]'); if (!b) return;
    if (confirm('להסיר את "' + b.dataset.n + '" מהכיתה? הנקודות והעבודה שלו/ה יימחקו.')) admin('remove', { sid: b.dataset.rm }).then(loadKids);
  });
  $('kp-lock').addEventListener('change', function () { admin('settings', { locked: this.checked }).then(function (d) { toast(d.ok ? (d.locked ? '🔒 ההצטרפות נסגרה' : '✓ נשמר') : d.error); }); });
  $('kp-cmsg-b').addEventListener('click', function () { admin('settings', { msg: $('kp-cmsg').value }).then(function (d) { toast(d.ok ? '✓ ההודעה מופיעה לכיתה' : d.error); if (d.ok) used('class_msg', true); }); });

  // ---------- פרגון ----------
  var KTPL = [['🌟', 'איזו התמדה השבוע! גאה בך'], ['🚀', 'שיפור ענק בשבוע האחרון. ככה ממשיכים!'], ['🤝', 'תודה שעזרת לחברים בשאלות לכיתה'], ['💯', 'כל התרגילים נפתרו נכון. מדהים!'], ['🧠', 'דרך פתרון יצירתית ומקורית'], ['💐', 'כל הכבוד לכל הכיתה על ההשקעה!']];
  var kEmoji = '💐';
  $('kp-ktpl').innerHTML = KTPL.map(function (t, i) { return '<button type="button" class="kp-chip-b" data-k="' + i + '">' + t[0] + ' ' + esc(t[1]) + '</button>'; }).join('');
  $('kp-ktpl').addEventListener('click', function (e) { var b = e.target.closest('[data-k]'); if (!b) return; var t = KTPL[+b.dataset.k]; kEmoji = t[0]; $('kp-ktext').value = t[1]; });
  function fillKto() {
    if (!KD) return; var v = $('kp-kto').value;
    $('kp-kto').innerHTML = '<option value="*">לכל הכיתה</option>' + KD.rows.slice().sort(function (a, b) { return a.nick.localeCompare(b.nick, 'he'); }).map(function (r) { return '<option value="' + r.sid + '">' + esc(r.nick) + '</option>'; }).join('');
    if (v) $('kp-kto').value = v;
  }
  $('kp-ksend').addEventListener('click', function () {
    var t = $('kp-ktext').value.trim(), b = this; if (!t) { $('kp-ktext').focus(); return; }
    var to = $('kp-kto').value, nick = to === '*' ? '' : $('kp-kto').selectedOptions[0].textContent;
    b.disabled = true;
    admin('kudos', { sid: to, text: t, emoji: kEmoji, pts: +$('kp-kpts').value }).then(function (d) {
      b.disabled = false; if (!d.ok) return toast(d.error);
      toast('💐 הפרגון נשלח' + (+$('kp-kpts').value ? ' עם ' + $('kp-kpts').value + ' נקודות' : ''));
      var w = $('kp-kpar'); w.hidden = false;
      w.href = 'https://wa.me/?text=' + encodeURIComponent((nick ? 'שלום, רציתי לשתף ולפרגן ל' + nick + ' 💐\n' : 'הורים יקרים, רציתי לפרגן לכל הכיתה 💐\n') + t + '\n' + (C.name ? '– ' + C.name : ''));
      $('kp-ktext').value = ''; kEmoji = '💐'; used('kudos', true); loadNotes(); loadKids();
    });
  });
  $('kp-kids').addEventListener('click', function (e) { var b = e.target.closest('[data-kudo]'); if (!b) return; $('kp-kto').value = b.dataset.kudo; $('kp-kudos').scrollIntoView({ behavior: 'smooth', block: 'start' }); $('kp-ktext').focus(); });
  function loadNotes() {
    admin('notes').then(function (d) {
      if (!d.ok) return;
      $('kp-klist').innerHTML = d.notes.length ? d.notes.map(function (n) { return '<li>' + esc(n.emoji) + ' <b>' + esc(n.nick) + '</b>: ' + esc(n.text) + (n.pts ? ' (+' + n.pts + ')' : '') + ' <small>' + ago(n.t) + '</small></li>'; }).join('') : '<li class="note">עוד לא נשלחו פרגונים.</li>';
    });
  }

  // ---------- תפקידים בכיתה (crown) + הצעה: מי עזר/ה הכי הרבה השבוע בשאלות ----------
  function fillRoles() {
    if (!KD) return;
    $('kp-rwho').innerHTML = KD.rows.slice().sort(function (a, b) { return a.nick.localeCompare(b.nick, 'he'); }).map(function (r) { return '<option value="' + r.sid + '">' + esc(r.nick) + (r.crown ? ' – ' + esc(r.crown) : '') + '</option>'; }).join('');
    admin('forum').then(function (d) {
      if (!d.ok) return;
      var cnt = {}, wk = Date.now() - 7 * 864e5;
      d.posts.forEach(function (p) { p.replies.forEach(function (r) { if (r.sid && r.sid !== 'T' && r.t > wk) cnt[r.sid] = (cnt[r.sid] || 0) + 1 + (r.help ? 2 : 0) + (r.good ? 2 : 0); }); });
      var best = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; })[0], who = best && KD.rows.filter(function (r) { return r.sid === best; })[0];
      var el = $('kp-rsugg'); el.hidden = !who;
      if (who) { el.innerHTML = '💡 השבוע הכי עזר/ה לחברים בשאלות: <b>' + esc(who.nick) + '</b> <button type="button" class="btn btn-sm" id="kp-rsugg-b">להעניק "עוזר/ת השבוע"</button>'; $('kp-rsugg-b').onclick = function () { $('kp-rwho').value = who.sid; $('kp-rrole').selectedIndex = 0; $('kp-rgo').click(); }; }
    });
  }
  $('kp-rgo').addEventListener('click', function () {
    var sid = $('kp-rwho').value, role = $('kp-rrole').value; if (!sid) return;
    admin('crown', { sid: sid, label: role }).then(function (d) { if (!d.ok) return toast(d.error); toast(role ? '🦸 התפקיד הוענק' : 'התפקיד הוסר'); used('role', true); loadKids(); });
  });

  // ---------- הפסקת חשיבה ----------
  var GAMES = [['sudoku', 'סודוקו'], ['mila', 'מילה – וורדל בעברית'], ['avanim', 'אבני מספרים'], ['reviiot', 'ארבע בשורה'], ['tzviya-misparim', 'צביעה לפי מספרים'], ['tashbetz', 'תשבץ'], ['damka', 'דמקה'], ['shachmat', 'שחמט']];
  $('kp-bgame').innerHTML = GAMES.map(function (g) { return '<option value="' + g[0] + '">' + g[1] + '</option>'; }).join('');
  var brkT = null;
  function showBrk(k) {
    clearInterval(brkT); $('kp-bstop').hidden = !k; $('kp-bgo').hidden = !!k;
    if (!k) { $('kp-bst').textContent = ''; return; }
    var name = (GAMES.filter(function (g) { return g[0] === k.g; })[0] || [0, k.g])[1];
    var tick = function () { var s = Math.max(0, Math.round((k.until - Date.now()) / 1000)); $('kp-bst').textContent = '🧩 ' + name + ' – נשארו ' + Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); if (!s) { clearInterval(brkT); showBrk(null); } };
    tick(); brkT = setInterval(tick, 1000);
  }
  $('kp-bgo').addEventListener('click', function () {
    admin('brk', { game: $('kp-bgame').value, min: +$('kp-bmin').value }).then(function (d) { if (!d.ok) return toast(d.error); showBrk(d.brk); toast('🧩 ההפסקה התחילה. התלמידים רואים אותה בפורטל'); used('brk', true); });
  });
  $('kp-bstop').addEventListener('click', function () { admin('brk', { min: 0 }).then(function (d) { showBrk(null); }); });

  // ---------- תחרות בין הכיתות שלי (לוח השבוע של כל כיתה) ----------
  var RACE = [];
  function race() {
    var el = $('kp-race'); el.innerHTML = '<li class="note">סופרים…</li>';
    Promise.all(CL.map(function (c) {
      return fetch(API + '/c/' + c.code + '/board?p=week').then(function (r) { return r.json(); }).then(function (d) {
        var rows = (d && d.rows) || [], pts = rows.reduce(function (s, r) { return s + r.pts; }, 0), act = rows.filter(function (r) { return r.pts > 0; }).length;
        return { name: c.name, pts: pts, n: rows.length, act: act, avg: rows.length ? Math.round(pts / rows.length) : 0, me: c.code === C.code };
      }).catch(function () { return null; });
    })).then(function (l) {
      RACE = l.filter(Boolean).sort(function (a, b) { return b.avg - a.avg; });
      el.innerHTML = RACE.map(function (r, i) { return '<li class="' + (r.me ? 'me' : '') + '"><span>' + (['🥇', '🥈', '🥉'][i] || i + 1) + '</span><b>' + esc(r.name) + ' <small>(' + r.act + ' מתוך ' + r.n + ' פעילים)</small></b><em>' + r.avg + '</em></li>'; }).join('') || '<li class="note">עוד אין נקודות השבוע.</li>';
    });
  }
  $('kp-racewa').addEventListener('click', function () {
    if (!RACE.length) return;
    window.open('https://wa.me/?text=' + encodeURIComponent('🏆 התחרות בין הכיתות – השבוע (נקודות לתלמיד/ה בממוצע)\n' + RACE.map(function (r, i) { return (['🥇', '🥈', '🥉'][i] || (i + 1) + '.') + ' ' + r.name + ' – ' + r.avg; }).join('\n') + '\nממשיכים לתרגל בכיתה הווירטואלית!'), '_blank'); used('race_wa');
  });

  // ---------- הורים ----------
  function pLink() { return location.origin + '/limudim/kita/horim/?kita=' + C.code; }
  function loadPar() {
    $('kp-plink').href = pLink(); $('kp-plink').textContent = pLink();
    admin('get', {}).then(function (d) { if (!d.ok) return; KD = d; renderPar(d.pmsgs || []); });
  }
  function renderPar(l) {
    $('kp-plist').innerHTML = l.map(function (m) { return '<li><p dir="auto">' + esc(m.text).replace(/\n/g, '<br>') + '</p><small>' + ago(m.t) + '</small> <button type="button" class="linkish" data-pdel="' + m.id + '">למחוק</button></li>'; }).join('');
  }
  $('kp-plist').addEventListener('click', function (e) { var b = e.target.closest('[data-pdel]'); if (b && confirm('למחוק את ההודעה מדף ההורים?')) admin('pmsg_del', { id: b.dataset.pdel }).then(function (d) { if (d.ok) renderPar(d.pmsgs); }); });
  $('kp-psend').addEventListener('click', function () {
    var t = $('kp-ptext').value.trim(), b = this; if (!t) { $('kp-ptext').focus(); return; }
    var w = window.open('', '_blank'); b.disabled = true;
    admin('pmsg', { text: t }).then(function (d) {
      b.disabled = false;
      if (!d.ok) { if (w) w.close(); return toast(d.error); }
      renderPar(d.pmsgs); $('kp-ptext').value = ''; used('pmsg', true);
      var url = 'https://wa.me/?text=' + encodeURIComponent('📣 ' + C.name + '\n' + t + '\n\nכל העדכונים ושיעורי הבית של הכיתה:\n' + pLink());
      if (w) w.location = url; else location.href = url;
    });
  });
  $('kp-pweek').addEventListener('click', function () {
    Promise.all([admin('get', { p: 'week' }), admin('hw_list')]).then(function (r) {
      var g = r[0], h = r[1]; if (!g.ok || !h.ok) return;
      var act = g.rows.filter(function (x) { return x.pts > 0; }).length, top = g.rows.filter(function (x) { return x.pts > 0; }).slice(0, 3).map(function (x) { return x.nick; });
      var open = h.hw.filter(function (x) { return x.open; });
      $('kp-ptext').value = 'הורים יקרים, סיכום השבוע ב' + C.name + ':\n' +
        '• ' + act + ' מתוך ' + g.rows.length + ' תלמידים תרגלו השבוע בכיתה הווירטואלית.\n' +
        (open.length ? '• פתוח עכשיו: ' + open.map(function (x) { return x.title + (x.due ? ' (עד ' + new Date(x.due + 'T12:00:00').toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' }) + ')' : ''); }).join(', ') + '.\n' : '') +
        (top.length ? '• כל הכבוד ל' + top.join(', ') + ' על ההשקעה! 🌟\n' : '') +
        'תודה על העידוד מהבית. ' + (g.teacher || '');
      $('kp-ptext').focus(); used('pweek', true);
    });
  });

  loadHub();
})();
