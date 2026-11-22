/* תמלול מיוטיוב + תמלול שיעורי כולל נחלת אבות (22.11.2026).
   הדף שולח קישור ל-Worker kelim-yutub, שואל כל כמה שניות מה המצב, ובסוף מציג PDF, Word וטקסט.
   מספר המשימה נשמר בכתובת (#t=...) כדי שאפשר יהיה לסגור את הדף ולחזור, או לשלוח את הקישור הלאה. */
(function () {
  'use strict';
  // שתי כתובות לאותו שרת: סינון אינטרנט שחוסם אחת מהן לא עוצר את הכלי (23.11.2026)
  var APIS = ['https://yt.hakelim.com', 'https://kelim-yutub.gilad4049.workers.dev'];
  var API = APIS[0];
  function call(path, opts, n) {
    n = n || 0;
    return fetch(API + path, opts).then(function (r) { return r.json(); }).catch(function (e) {
      if (n >= APIS.length * 2 - 1) throw e;
      API = APIS[(APIS.indexOf(API) + 1) % APIS.length];
      return new Promise(function (ok) { setTimeout(ok, n < APIS.length - 1 ? 0 : 1500); }).then(function () { return call(path, opts, n + 1); });
    });
  }
  var root = document.getElementById('yt-tool');
  if (!root) return;
  var NA = root.getAttribute('data-mode') === 'na';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('yt-form'), inp = $('yt-url'), by = $('yt-by'), times = $('yt-times'), go = $('yt-go');
  var box = $('yt-status'), msg = $('yt-msg'), bar = $('yt-bar'), res = $('yt-result'), err = $('yt-err');
  var timer = null, started = 0, lastStatus = '';

  function ev(name, extra) { try { if (window.kelimEv) window.kelimEv(name, extra || {}); } catch (e) { /* בלי מדידה */ } }
  function show(el, on) { if (el) el.hidden = !on; }
  function fail(text) { err.textContent = text; show(err, true); show(box, false); go.disabled = false; }
  function fmtDur(s) { s = s | 0; var h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60); return h ? h + ' שעות ו-' + m + ' דקות' : m + ' דקות'; }

  function normalize(v) {
    v = (v || '').trim();
    if (v && !/^https?:\/\//i.test(v)) v = 'https://' + v;
    return v;
  }
  function looksOk(v) {
    if (/^https?:\/\/(www\.)?nahalat-avot\.com\/lesson\/[\w%-]+\/?$/i.test(v)) return true;
    if (NA) return false;
    return /^https?:\/\/((www|m|music)\.)?(youtube\.com\/(watch\?|shorts\/|live\/|embed\/)|youtu\.be\/)/i.test(v);
  }

  function setProgress(j) {
    show(box, true); show(err, false);
    var text = j.msg || '';
    if (j.status === 'queued') {
      text = j.pos > 1 ? 'ממתין בתור, מקום ' + j.pos : 'השרת מתעורר, התמלול מתחיל בעוד רגע';
      if (j.shabbat) text = 'בשבת הכלי נח. הקישור נשמר בתור, והתמלול יהיה מוכן במוצאי שבת';
      else if (Date.now() - started > 4 * 60000) text += '. זה לוקח קצת יותר מהרגיל; אפשר להשאיר את הדף פתוח או לחזור אליו אחר כך';
    }
    msg.textContent = text;
    var pct = j.status === 'queued' ? 3 : Math.max(5, j.pct || 5);
    bar.style.width = pct + '%';
    bar.parentNode.setAttribute('aria-valuenow', String(pct));
  }

  function render(j) {
    show(box, false); show(err, false); go.disabled = false;
    $('yt-r-title').textContent = j.title || 'השיעור';
    var meta = [j.channel, j.date, j.dur ? fmtDur(j.dur) : '', j.words ? Number(j.words).toLocaleString('he-IL') + ' מילים' : ''].filter(Boolean).join(' · ');
    $('yt-r-meta').textContent = meta;
    $('yt-pdf').href = API + j.pdf; $('yt-docx').href = API + j.docx; $('yt-txt').href = API + j.txt;
    $('yt-view').href = API + j.pdf + '?view=1';
    show($('yt-sumrow'), !!j.sum);
    if (j.sum && $('yt-sum')) { $('yt-sum').href = API + j.sum + '?view=1'; $('yt-sumpdf').href = API + j.sum; $('yt-sumdocx').href = API + j.sumdocx; }
    var share = $('yt-share');
    if (share) share.href = 'https://wa.me/?text=' + encodeURIComponent((j.title || 'שיעור') + ' – השיעור כתוב, להורדה כ-PDF או כוורד:\n' + location.href.split('#')[0] + '#t=' + j.id);
    show(res, true);
    var pre = $('yt-text');
    pre.textContent = 'טוען את הטקסט…';
    fetch(API + j.txt).then(function (r) { return r.text(); }).then(function (t) {
      pre.textContent = '';
      t.split('\n').forEach(function (line) {            // כותרות מודגשות, השאר טקסט רגיל
        var m = /^(#{1,2}) (.*)$/.exec(line), el;
        if (m) { el = document.createElement('strong'); el.className = m[1].length === 1 ? 'yt-t1' : 'yt-t2'; el.textContent = m[2]; }
        else el = document.createTextNode(line);
        pre.appendChild(el); pre.appendChild(document.createTextNode('\n'));
      });
      pre.setAttribute('data-full', '1');
    }).catch(function () { pre.textContent = 'הטקסט המלא נמצא בקבצים להורדה.'; });
    try { res.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) { /* דפדפן ישן */ }
  }

  function poll(id) {
    clearTimeout(timer);
    call('/status/' + id).then(function (j) {
      if (!j.ok) { fail(j.msg || 'התמלול הזה כבר לא נמצא. אפשר להדביק את הקישור שוב.'); return; }
      if (j.status === 'done') {
        if (lastStatus && lastStatus !== 'done' && window.toolUsed) window.toolUsed(null, { kind: j.kind, dur_min: Math.round((j.dur || 0) / 60) });
        lastStatus = 'done'; render(j); return;
      }
      if (j.status === 'failed') { ev('yutub_fail', { kind: j.kind }); fail(j.msg || 'משהו השתבש. אפשר לנסות שוב.'); return; }
      lastStatus = j.status; setProgress(j);
      timer = setTimeout(function () { poll(id); }, document.hidden ? 15000 : 5000);
    }).catch(function () { timer = setTimeout(function () { poll(id); }, 10000); });
  }

  function submit(url) {
    show(err, false); show(res, false);
    if (!looksOk(url)) {
      fail(NA ? 'מדביקים כאן קישור לדף שיעור מהאתר של נחלת אבות, למשל https://nahalat-avot.com/lesson/...' : 'זה לא נראה כמו קישור לסרטון ביוטיוב. מדביקים את הקישור המלא, למשל https://www.youtube.com/watch?v=...');
      return;
    }
    go.disabled = true; started = Date.now(); lastStatus = 'new';
    setProgress({ status: 'queued', pos: 1 });
    call('/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url, by: by ? by.value : '', times: !!(times && times.checked) }) })
      .then(function (j) {
        if (!j.ok) { fail(j.msg || 'משהו השתבש. אפשר לנסות שוב.'); return; }
        ev('yutub_submit', { kind: j.kind, cached: j.status === 'done' ? 1 : 0 });
        try { history.replaceState(null, '', location.pathname + location.search + '#t=' + j.id); } catch (e) { location.hash = 't=' + j.id; }
        poll(j.id);
      })
      .catch(function () { fail('אין חיבור לשרת התמלול כרגע. אפשר לנסות שוב בעוד רגע. אם זה חוזר, ייתכן שסינון האינטרנט אצלכם חוסם אותו.'); });
  }

  form.addEventListener('submit', function (e) { e.preventDefault(); submit(normalize(inp.value)); });

  var copy = $('yt-copy');
  if (copy) copy.addEventListener('click', function () {
    var t = $('yt-text').textContent;
    var done = function () { copy.textContent = 'הועתק ✓'; setTimeout(function () { copy.textContent = 'להעתיק את הטקסט'; }, 2000); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, function () {});
  });

  // חזרה לדף עם #t=<משימה>, או כניסה מהאתר של הכולל עם ?s=<שם השיעור בכתובת>
  var m = location.hash.match(/t=([a-f0-9]{16})/);
  var q = new URLSearchParams(location.search);
  if (m) { started = Date.now(); setProgress({ status: 'queued', pos: 1 }); poll(m[1]); }
  else if (NA && /^[\w-]{3,120}$/.test(q.get('s') || '')) { inp.value = 'https://nahalat-avot.com/lesson/' + q.get('s'); submit(inp.value); }
  else if (!NA && q.get('u')) { inp.value = normalize(q.get('u')); }
})();
