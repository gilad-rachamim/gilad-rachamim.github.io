// "הדף שלי": מסך בית אישי – קיצורים שבוחרים ומסדרים, האתרים שנכנסים אליהם הכי הרבה
// (chrome.topSites, רק אחרי אישור), אפליקציות של גוגל וכרטיסיות ששמרתם. הכול נשמר בכרום, בלי שרת.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var APPS = [
    ['✉', 'ג׳ימייל', 'https://mail.google.com/'], ['📅', 'יומן', 'https://calendar.google.com/'], ['📁', 'דרייב', 'https://drive.google.com/'],
    ['📄', 'מסמך חדש', 'https://docs.new'], ['📊', 'גיליון חדש', 'https://sheets.new'], ['🖼', 'תמונות', 'https://photos.google.com/'],
    ['👥', 'אנשי קשר', 'https://contacts.google.com/'], ['💬', 'ווטסאפ ווב', 'https://web.whatsapp.com/'], ['▶', 'יוטיוב', 'https://www.youtube.com/'],
    ['🗺', 'מפות', 'https://www.google.com/maps'], ['🧰', 'הכלים של גילעד', 'https://hakelim.com/kelim/?utm_source=tosaf_home'], ['🗂', 'הכרטיסיות שלי', 'tabs.html']
  ];
  var mine = [], editing = false;

  function fav(u) { return chrome.runtime.getURL('/_favicon/?pageUrl=' + encodeURIComponent(u) + '&size=32'); }
  function host(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; } }
  function tile(name, url, icon) {
    var a = document.createElement('a'); a.className = 'tile'; a.href = url;
    var i = document.createElement('span'); i.className = 'ico';
    if (icon) i.textContent = icon; else { var im = document.createElement('img'); im.alt = ''; im.src = fav(url); i.appendChild(im); }
    var n = document.createElement('span'); n.className = 'n'; n.textContent = name;
    a.appendChild(i); a.appendChild(n); a.title = name + ' – ' + host(url);
    return a;
  }

  // ---------- הקיצורים שלי ----------
  function saveMine() { return chrome.storage.sync.set({ homeLinks: mine.slice(0, 40) }).catch(function () { return chrome.storage.local.set({ homeLinks: mine }); }); }
  function renderMine() {
    var box = $('mine'); box.textContent = '';
    mine.forEach(function (x, i) {
      var t = tile(x.n, x.u);
      if (editing) {
        t.addEventListener('click', function (e) { e.preventDefault(); });
        var del = document.createElement('button'); del.type = 'button'; del.className = 'x'; del.textContent = '✕'; del.setAttribute('aria-label', 'להסיר: ' + x.n);
        del.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); mine.splice(i, 1); saveMine().then(render); });
        t.appendChild(del);
        if (i > 0) {
          var mv = document.createElement('button'); mv.type = 'button'; mv.className = 'mv'; mv.textContent = '→'; mv.setAttribute('aria-label', 'להזיז קדימה: ' + x.n);
          mv.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); var a = mine[i - 1]; mine[i - 1] = mine[i]; mine[i] = a; saveMine().then(render); });
          t.appendChild(mv);
        }
      }
      box.appendChild(t);
    });
    var add = document.createElement('button'); add.type = 'button'; add.className = 'tile add-tile';
    add.innerHTML = '<span class="ico">➕</span><span class="n">להוסיף קיצור</span>';
    add.addEventListener('click', function () { $('add').hidden = false; $('add-n').focus(); });
    box.appendChild(add);
    if (!mine.length) { var p = document.createElement('p'); p.className = 'empty'; p.style.gridColumn = '1/-1'; p.textContent = 'לוחצים ⭐ על אתר ברשימה למטה, או "להוסיף קיצור".'; box.appendChild(p); }
  }
  function addLink(n, u) {
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
    try { new URL(u); } catch (e) { return false; }
    if (mine.some(function (x) { return x.u === u; })) return true;
    mine.push({ n: n || host(u), u: u }); saveMine().then(render); return true;
  }
  $('add').addEventListener('submit', function (e) {
    e.preventDefault();
    if (addLink($('add-n').value.trim(), $('add-u').value.trim())) { $('add-n').value = $('add-u').value = ''; $('add').hidden = true; }
  });
  $('edit').addEventListener('click', function () { editing = !editing; this.setAttribute('aria-pressed', editing ? 'true' : 'false'); this.textContent = editing ? '✓ סיימתי' : '✎ לסדר'; renderMine(); });

  // ---------- האתרים הכי נפוצים ----------
  function renderTop() {
    chrome.permissions.contains({ permissions: ['topSites'] }).then(function (ok) {
      $('top-perm').hidden = ok; var box = $('top'); box.textContent = '';
      if (!ok) return;
      chrome.topSites.get(function (list) {
        var have = {}; mine.forEach(function (x) { have[x.u] = 1; });
        (list || []).filter(function (s) { return !have[s.url] && /^https?:/i.test(s.url); }).slice(0, 12).forEach(function (s) {
          var t = tile(s.title || host(s.url), s.url);
          var pin = document.createElement('button'); pin.type = 'button'; pin.className = 'pin'; pin.textContent = '⭐';
          pin.setAttribute('aria-label', 'להוסיף לקיצורים שלי: ' + (s.title || host(s.url)));
          pin.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); addLink((s.title || host(s.url)).slice(0, 30), s.url); });
          t.appendChild(pin); box.appendChild(t);
        });
      });
    });
  }
  $('top-btn').addEventListener('click', function () {
    chrome.permissions.request({ permissions: ['topSites'] }, function () { void chrome.runtime.lastError; renderTop(); });
  });

  // ---------- אפליקציות ----------
  APPS.forEach(function (a) { $('apps').appendChild(tile(a[1], a[2], a[0])); });

  // ---------- כרטיסיות שמורות ----------
  function renderSaved(list) {
    $('saved-sec').hidden = !list.length; var box = $('saved'); box.textContent = '';
    list.slice(0, 8).forEach(function (it) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'line sm';
      b.textContent = '📂 ' + it.at + ' · ' + it.tabs.length;
      b.title = 'לפתוח את ' + it.tabs.length + ' הכרטיסיות (נפתחות מושהות)';
      b.addEventListener('click', function () {
        var urls = it.tabs.map(function (x) { return x.u; });
        chrome.windows.create({ url: urls[0], focused: true }).then(function (w) {
          urls.slice(1).forEach(function (u) { chrome.tabs.create({ windowId: w.id, url: u, active: false }).then(function (t) { setTimeout(function () { chrome.tabs.discard(t.id).catch(function () {}); }, 60); }); });
        });
      });
      box.appendChild(b);
    });
  }
  $('tabs').addEventListener('click', function () { chrome.runtime.sendMessage({ tabsManager: true }, function () { void chrome.runtime.lastError; }); });

  // ---------- שעה ותאריך ----------
  function clock() {
    var d = new Date(), s = '';
    try { s = d.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' }) + ' · ' + d.toLocaleDateString('he-IL-u-ca-hebrew', { day: 'numeric', month: 'long' }); } catch (e) {}
    $('clock').textContent = d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) + ' · ' + s;
  }
  clock(); setInterval(clock, 20000);
  $('copy').addEventListener('click', function () { var b = this; navigator.clipboard.writeText(location.href.split('#')[0]).then(function () { b.textContent = '✓ הועתק'; }); });

  function render() { renderMine(); renderTop(); }
  Promise.all([chrome.storage.sync.get('homeLinks').catch(function () { return {}; }), chrome.storage.local.get(['homeLinks', 'savedTabs'])]).then(function (r) {
    mine = Array.isArray(r[0].homeLinks) ? r[0].homeLinks : Array.isArray(r[1].homeLinks) ? r[1].homeLinks : [];
    render(); renderSaved(Array.isArray(r[1].savedTabs) ? r[1].savedTabs : []);
  });
  chrome.permissions.onAdded.addListener(renderTop);
})();
