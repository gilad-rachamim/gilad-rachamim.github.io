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
  function setTab(t) {
    tab = t;
    ['hw', 'forum', 'kids'].forEach(function (x) { $('kp-t-' + x).setAttribute('aria-selected', x === t ? 'true' : 'false'); $('kp-p-' + x).hidden = x !== t; });
    if (t === 'hw') loadHw(); else if (t === 'forum') loadForum(); else loadKids();
  }
  ['hw', 'forum', 'kids'].forEach(function (x) { $('kp-t-' + x).addEventListener('click', function () { setTab(x); used('tab_' + x); }); });
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

  $('kp-send').addEventListener('click', function () {
    var b = this; err('kp-err', '');
    var ex = Array.prototype.map.call($('kp-exlist').children, function (li, i) {
      var pgOn = li.querySelector('.kp-pg-on').checked, q = li.querySelector('.kp-exq').value.trim();
      return { q: pgOn ? (q ? 'שאלה ' + q + ' מהדף' : '') : q, pg: pgOn ? +li.querySelector('.kp-pg').value : 0, tl: li.querySelector('.kp-tl').value, v: li.querySelector('.kp-v').value.trim(), top: li.querySelector('.kp-top').value, h: li.querySelector('.kp-h').value.trim(), a: li.querySelector('.kp-a').value.trim() };
    }).filter(function (e) { return e.q || e.pg; });
    if (!$('kp-title').value.trim()) { err('kp-err', 'כותבים שם למטלה, למשל: דף עבודה – משוואות.'); $('kp-title').focus(); return; }
    if (!ex.length) { err('kp-err', 'צריך לפחות תרגיל אחד. אם התרגילים בדף שהעליתם: "כמה שאלות יש בדף" ← להוסיף.'); return; }
    if (ex.some(function (e) { return e.pg; }) && !PAGES.length) { err('kp-err', 'סימנתם תרגילים "מהדף", אבל עוד לא העליתם את הדף.'); return; }
    b.disabled = true; $('kp-sendst').textContent = 'שולחים…';
    admin('hw_new', { title: $('kp-title').value, due: $('kp-due').value, note: $('kp-note').value, ex: ex }).then(function (d) {
      if (!d.ok) { b.disabled = false; $('kp-sendst').textContent = ''; return err('kp-err', d.error); }
      var id = d.id;
      (function up(i) {
        if (i >= PAGES.length) {
          b.disabled = false; $('kp-sendst').textContent = '';
          PAGES = []; pageThumbs(); $('kp-title').value = ''; $('kp-due').value = ''; $('kp-note').value = ''; $('kp-exlist').innerHTML = ''; exRow();
          $('kp-newhw').open = false; used('hw_new', true); loadHw(); toast('✓ המטלה נשלחה לכיתה');
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
        return '<div class="kp-card kp-tcard' + (h.open ? '' : ' is-closed') + '"><span class="kp-card-t"><b>' + esc(h.title) + '</b>' +
          (h.np ? '<span class="kp-tag">📄 ' + h.np + ' עמ׳</span>' : '') + (h.due ? '<span class="kp-tag">📅 ' + new Date(h.due + 'T12:00:00').toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' }) + '</span>' : '') + (h.open ? '' : '<span class="kp-tag">סגורה</span>') + (h.stuck ? '<span class="kp-tag warn">🙋 ' + h.stuck + ' נתקעו</span>' : '') + '</span>' +
          '<span class="kp-bar" aria-hidden="true"><i style="width:' + pct + '%"></i></span><span class="kp-sub">' + h.full + ' מתוך ' + d.students + ' סיימו הכול · ' + h.who + ' התחילו · ' + h.n + ' תרגילים</span>' +
          '<span class="btns"><a class="btn btn-sm btn-gold" href="/limudim/machberet/kita/#c=' + C.code + '&k=' + C.key + '">📊 מעקב חי ורמזים</a><button type="button" class="btn btn-sm" data-open="' + h.id + '" data-v="' + (h.open ? 0 : 1) + '">' + (h.open ? 'לסגור' : 'לפתוח שוב') + '</button><button type="button" class="btn btn-sm" data-del="' + h.id + '">למחוק</button></span></div>';
      }).join('') : '<p class="note">עוד אין מטלות. לוחצים על "מטלה חדשה" למעלה.</p>';
    });
  }
  $('kp-hwlist').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.open) admin('hw_open', { hw: b.dataset.open, open: +b.dataset.v }).then(loadHw);
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
      KD = d;
      $('kp-lock').checked = !!d.locked; $('kp-cmsg').value = d.msg || '';
      var act = d.rows.filter(function (r) { return r.last > Date.now() - 7 * 864e5; }).length;
      $('kp-ksum').textContent = d.rows.length + ' תלמידים · ' + act + ' פעילים השבוע';
      $('kp-kids').innerHTML = d.rows.length ? '<table class="kp-tbl"><thead><tr><th>מקום</th><th>כינוי</th><th>נקודות</th><th>נכנס/ה לאחרונה</th><th></th></tr></thead><tbody>' + d.rows.map(function (r) {
        return '<tr><td>' + (r.place ? ['🥇', '🥈', '🥉'][r.place - 1] || r.place : '·') + '</td><td><b>' + esc(r.nick) + '</b>' + (r.crown ? ' 👑 ' + esc(r.crown) : '') + '</td><td>' + r.pts + '</td><td>' + ago(r.last) + '</td><td><button type="button" class="linkish" data-rm="' + r.sid + '" data-n="' + esc(r.nick) + '">להסיר</button></td></tr>';
      }).join('') + '</tbody></table>' : '<p class="note">עוד אף אחד לא הצטרף. שולחים לכיתה את הקישור שלמעלה.</p>';
    });
  }
  $('kp-kids').addEventListener('click', function (e) {
    var b = e.target.closest('[data-rm]'); if (!b) return;
    if (confirm('להסיר את "' + b.dataset.n + '" מהכיתה? הנקודות והעבודה שלו/ה יימחקו.')) admin('remove', { sid: b.dataset.rm }).then(loadKids);
  });
  $('kp-lock').addEventListener('change', function () { admin('settings', { locked: this.checked }).then(function (d) { toast(d.ok ? (d.locked ? '🔒 ההצטרפות נסגרה' : '✓ נשמר') : d.error); }); });
  $('kp-cmsg-b').addEventListener('click', function () { admin('settings', { msg: $('kp-cmsg').value }).then(function (d) { toast(d.ok ? '✓ ההודעה מופיעה לכיתה' : d.error); if (d.ok) used('class_msg', true); }); });

  loadHub();
})();
