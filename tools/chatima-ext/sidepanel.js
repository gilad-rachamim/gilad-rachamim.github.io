// חלון צד: כלי מהאתר פתוח ליד הדף (למשל עורך ההודעות ליד ווטסאפ ווב, או כיווץ PDF ליד ג׳ימייל).
// "מתאים לדף הזה" לפי שם האתר בלבד. הכלי עצמו נטען מ-hakelim.com ועובד כרגיל, בתוך הדפדפן.
(function () {
  var SITE = 'https://hakelim.com';
  var POPULAR = ['/kelim/machshev/chatima/', '/kelim/machshev/tmuna/', '/kelim/tamlul/', '/kelim/machshev/pdf/', '/kelim/tochen/wa/', '/kelim/tochen/tirgum/', '/kelim/machshev/fax/', '/kelim/eruim/hazmana/'];
  var $ = function (id) { return document.getElementById(id); };
  var tools = [], ctx = {}, cur = null;

  function norm(s) { return (s || '').replace(/[֑-ׇ]/g, '').replace(/["'״׳\-–]/g, ' ').toLowerCase(); }
  function item(t) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'it';
    var n = document.createElement('b'); n.textContent = t.n;
    var s = document.createElement('small'); s.textContent = t.d || t.c || '';
    b.appendChild(n); b.appendChild(s);
    b.addEventListener('click', function () { open(t); });
    return b;
  }
  function search(q) {
    var w = norm(q).split(/\s+/).filter(Boolean);
    return tools.filter(function (t) { return !t.h; }).map(function (t) {
      var n = norm(t.n), r = norm(t.c + ' ' + t.d), sc = 0;
      for (var i = 0; i < w.length; i++) { var h = (n.indexOf(w[i]) >= 0 ? 4 : 0) + (r.indexOf(w[i]) >= 0 ? 1 : 0); if (!h) return null; sc += h; }
      return { t: t, sc: sc };
    }).filter(Boolean).sort(function (a, b) { return b.sc - a.sc; }).slice(0, 40).map(function (x) { return x.t; });
  }
  function render() {
    var q = $('q').value.trim();
    var sg = HKSuggest(ctx.url || '', tools, 6), host = '';
    try { host = new URL(ctx.url).hostname.replace(/^www\./, ''); } catch (e) {}
    $('sug-sec').hidden = !!q;
    $('sug-site').textContent = host ? (sg.matched ? 'לפי ' + host + ':' : 'הכלים הכי שימושיים:') : 'הכלים הכי שימושיים:';
    $('sug').textContent = ''; sg.tools.forEach(function (t) { $('sug').appendChild(item(t)); });
    var res = q ? search(q) : POPULAR.map(function (u) { return tools.filter(function (t) { return t.u === u; })[0]; }).filter(Boolean);
    $('res-h').textContent = q ? (res.length ? 'נמצאו ' + res.length : 'לא נמצא כלי') : 'הכי שימושיים';
    $('res').textContent = ''; res.forEach(function (t) { $('res').appendChild(item(t)); });
  }
  var view = 'tools';
  function setView(v) {
    view = v;
    $('t-tools').setAttribute('aria-selected', v === 'tools' ? 'true' : 'false'); $('t-notes').setAttribute('aria-selected', v === 'notes' ? 'true' : 'false');
    $('notes').hidden = v !== 'notes';
    if (v === 'notes') { if (!$('notes').src) $('notes').src = 'notes.html'; $('pick').hidden = true; $('tool').hidden = true; }
    else { $('pick').hidden = !!cur; $('tool').hidden = !cur; }
  }
  $('t-tools').addEventListener('click', function () { setView('tools'); });
  $('t-notes').addEventListener('click', function () { setView('notes'); });
  function open(t) {
    cur = t;
    $('tool-name').textContent = t.n;
    $('frame').src = SITE + t.u + '?utm_source=tosaf_side';
    $('pick').hidden = true; $('tool').hidden = false; if (view !== 'tools') setView('tools');
  }
  $('back').addEventListener('click', function () { $('tool').hidden = true; $('pick').hidden = false; $('frame').src = 'about:blank'; cur = null; $('q').focus(); });
  $('out').addEventListener('click', function () { if (cur) chrome.tabs.create({ url: SITE + cur.u + '?utm_source=tosaf' }); });
  $('q').addEventListener('input', render);
  $('q').addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    var first = document.querySelector('#res .it') || document.querySelector('#sug .it');
    if (first) first.click();
  });

  // הדף הפתוח: מהלחיצה שפתחה את החלון, ואם יש רשות "tabs" – מתעדכן כשעוברים כרטיסייה
  function useCtx(c) {
    ctx = c || {};
    if (ctx.view === 'notes') { setView('notes'); chrome.storage.session.set({ spCtx: { url: ctx.url, title: ctx.title } }); }
    if (ctx.tool) {
      var t = tools.filter(function (x) { return x.u === ctx.tool; })[0];
      chrome.storage.session.set({ spCtx: { url: ctx.url, title: ctx.title } });
      if (t) open(t);
    }
    render();
  }
  function follow() {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }).then(function (r) {
      var t = r && r[0]; if (t && t.url) { ctx = { url: t.url, title: t.title }; if (!cur) render(); }
    }).catch(function () {});
  }
  chrome.tabs.onActivated.addListener(follow);
  chrome.tabs.onUpdated.addListener(function (id, ch) { if (ch.url) follow(); });
  chrome.storage.onChanged.addListener(function (ch, area) { if (area === 'session' && ch.spCtx && ch.spCtx.newValue) useCtx(ch.spCtx.newValue); });

  chrome.storage.local.get('tools').then(function (o) {
    if (o.tools && Array.isArray(o.tools.tools)) return o.tools.tools;
    return fetch('tools.json').then(function (r) { return r.json(); }).then(function (j) { return j.tools; });
  }).then(function (t) {
    tools = t || [];
    return chrome.storage.session.get('spCtx');
  }).then(function (o) { useCtx(o.spCtx); if (!cur) $('q').focus(); });
})();
