// ניהול כרטיסיות: רשימה עם חיפוש, סגירת כפולות, קיבוץ לפי אתר, השהיה (חיסכון בזיכרון),
// איחוד חלונות, ושמירת כל הכרטיסיות כרשימה ושחזור. הכול בתוך כרום, שום דבר לא יוצא מהמחשב.
// את השמות והכתובות של הכרטיסיות כרום מראה רק אחרי רשות "tabs" (רשות אופציונלית, מבקשים כאן).
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var COLORS = ['yellow', 'blue', 'green', 'purple', 'cyan', 'orange', 'pink', 'red', 'grey'];
  var HEX = { grey: '#9aa0a6', blue: '#8ab4f8', red: '#f28b82', yellow: '#fdd663', green: '#81c995', pink: '#ff8bcb', purple: '#c58af9', cyan: '#78d9ec', orange: '#fcad70' };
  var hasTabs = false, wins = [], groups = {}, myTabId = -1, shown = [], saved = [];

  function say(t) { $('msg').textContent = t || ''; }
  function norm(s) { return (s || '').replace(/[֑-ׇ]/g, '').toLowerCase(); }
  function host(u) { try { var h = new URL(u).hostname.replace(/^www\./, ''); return h; } catch (e) { return ''; } }
  function siteName(h) {
    if (/^[\d.]+$|^\[/.test(h)) return h;
    var p = h.split('.');
    if (p.length > 2 && /^(co|org|gov|ac|net|muni|k12|com)$/.test(p[p.length - 2])) p = p.slice(0, -2);
    else if (p.length > 1) p = p.slice(0, -1);
    return p.join('.') || h;
  }
  function keyOf(u) { return (u || '').replace(/#.*$/, '').replace(/\/$/, ''); }
  function canTouch(u) { return /^(https?|file|ftp):/.test(u || ''); }
  function allTabs() { var a = []; wins.forEach(function (w) { a = a.concat(w.tabs); }); return a.filter(function (t) { return t.id !== myTabId; }); }
  function fav(t) {
    var u = t.url || t.pendingUrl || '';
    if (!hasTabs || !u) return 'icon16.png';
    return chrome.runtime.getURL('/_favicon/?pageUrl=' + encodeURIComponent(u) + '&size=32');
  }

  // ---------- טעינה ----------
  function load() {
    return Promise.all([
      chrome.permissions.contains({ permissions: ['tabs'] }),
      chrome.windows.getAll({ populate: true, windowTypes: ['normal'] }),
      chrome.tabGroups ? chrome.tabGroups.query({}) : Promise.resolve([]),
      chrome.storage.local.get(['savedTabs', 'autoNap'])
    ]).then(function (r) {
      hasTabs = r[0]; wins = r[1]; groups = {};
      r[2].forEach(function (g) { groups[g.id] = g; });
      saved = Array.isArray(r[3].savedTabs) ? r[3].savedTabs : [];
      $('auto').value = String(r[3].autoNap || 0);
      return memLine();
    }).then(render);
  }
  function memLine() {
    var tabs = allTabs(), napped = tabs.filter(function (t) { return t.discarded; }).length;
    var s = tabs.length + ' כרטיסיות' + (wins.length > 1 ? ' ב-' + wins.length + ' חלונות' : '') + (napped ? ' · ' + napped + ' מושהות 💤' : '');
    if (!chrome.system || !chrome.system.memory) { $('stats').textContent = s; return Promise.resolve(); }
    return chrome.system.memory.getInfo().then(function (m) {
      var used = m.capacity - m.availableCapacity, pct = Math.round(used / m.capacity * 100);
      $('stats').textContent = s + ' · זיכרון המחשב: ' + pct + '% בשימוש (' + (used / 1073741824).toFixed(1) + ' מתוך ' + Math.round(m.capacity / 1073741824) + ' GB)';
    }).catch(function () { $('stats').textContent = s; });
  }

  // ---------- תצוגה ----------
  function matches(t, words) {
    if (!words.length) return true;
    var hay = norm((t.title || '') + ' ' + (t.url || ''));
    return words.every(function (w) { return hay.indexOf(w) >= 0; });
  }
  function row(t, cur) {
    var d = document.createElement('div'); d.className = 'tab' + (cur ? ' cur' : '') + (t.discarded ? ' napped' : '');
    var go = document.createElement('button'); go.type = 'button'; go.className = 'go';
    var img = document.createElement('img'); img.alt = ''; img.src = fav(t); go.appendChild(img);
    var tx = document.createElement('span'); tx.className = 't';
    var b = document.createElement('b'); b.textContent = hasTabs ? (t.title || t.url || 'כרטיסייה') : 'כרטיסייה ' + (t.index + 1);
    var sm = document.createElement('small'); sm.textContent = hasTabs ? host(t.url || t.pendingUrl) || (t.url || '').slice(0, 60) : '';
    tx.appendChild(b); if (sm.textContent) tx.appendChild(sm); go.appendChild(tx);
    var g = t.groupId > -1 && groups[t.groupId];
    if (g && g.title) { var gs = document.createElement('span'); gs.className = 'grp'; gs.style.background = HEX[g.color] || '#ccc'; gs.textContent = g.title; go.appendChild(gs); }
    [[t.pinned, '📌', 'נעוצה'], [t.audible, '🔊', 'משמיעה קול'], [t.discarded, '💤', 'מושהית'], [cur, '●', 'הכרטיסייה הפתוחה']].forEach(function (x) {
      if (!x[0]) return; var s = document.createElement('span'); s.className = 'badge'; s.textContent = x[1]; s.title = x[2]; s.setAttribute('aria-label', x[2]); go.appendChild(s);
    });
    go.setAttribute('aria-label', 'לעבור אל: ' + b.textContent);
    go.addEventListener('click', function () { focusTab(t); });
    d.appendChild(go);
    var pin = document.createElement('button'); pin.type = 'button'; pin.className = 'ic' + (t.pinned ? ' on' : ''); pin.textContent = '📌';
    pin.title = pin.ariaLabel = (t.pinned ? 'לבטל נעיצה: ' : 'לנעוץ (כרטיסייה קבועה): ') + b.textContent;
    pin.setAttribute('aria-pressed', t.pinned ? 'true' : 'false');
    pin.addEventListener('click', function () { chrome.tabs.update(t.id, { pinned: !t.pinned }).then(function () { say(t.pinned ? 'הנעיצה בוטלה.' : 'נעוצה 📌: הכרטיסייה קבועה בתחילת הפס, קטנה, ולא נסגרת בטעות.'); }).catch(function () {}).then(load); });
    d.appendChild(pin);
    var nap = document.createElement('button'); nap.type = 'button'; nap.className = 'ic'; nap.textContent = '💤';
    nap.title = nap.ariaLabel = 'להשהות: ' + b.textContent; nap.disabled = t.discarded || t.active;
    nap.addEventListener('click', function () { chrome.tabs.discard(t.id).then(function () { say('הכרטיסייה הושהתה. היא תיטען שוב כשתלחצו עליה.'); }, function () { say('כרום לא השהה את הכרטיסייה הזאת.'); }).then(load); });
    var x = document.createElement('button'); x.type = 'button'; x.className = 'ic'; x.textContent = '✕';
    x.title = x.ariaLabel = 'לסגור: ' + b.textContent;
    x.addEventListener('click', function () { chrome.tabs.remove(t.id).then(function () { say('נסגרה. להחזיר: Ctrl+Shift+T.'); }).catch(function () {}).then(load); });
    d.appendChild(nap); d.appendChild(x);
    return d;
  }
  function render() {
    $('perm').hidden = hasTabs;
    [].forEach.call(document.querySelectorAll('[data-need=tabs]'), function (b) { b.disabled = !hasTabs; if (!hasTabs) b.title = 'צריך קודם לתת רשות לראות את הכרטיסיות'; });
    $('q').disabled = !hasTabs;
    var words = norm($('q').value.trim()).split(/\s+/).filter(Boolean);
    var box = $('list'); box.textContent = ''; shown = [];
    var dup = dupes();
    $('dupes').textContent = '🧹 לסגור כפולות' + (hasTabs ? ' (' + dup.length + ')' : '');
    if (hasTabs) $('dupes').disabled = !dup.length;
    wins.forEach(function (w, wi) {
      var list = w.tabs.filter(function (t) { return t.id !== myTabId && matches(t, words); });
      if (!list.length) return;
      var sec = document.createElement('section'); sec.className = 'win';
      var h = document.createElement('h3');
      var a = document.createElement('span'); a.textContent = (wins.length > 1 ? 'חלון ' + (wi + 1) : 'החלון') + (w.focused ? ' (הפעיל)' : '');
      var c = document.createElement('span'); c.textContent = list.length + ' כרטיסיות';
      h.appendChild(a); h.appendChild(c); sec.appendChild(h);
      list.forEach(function (t) { shown.push(t); sec.appendChild(row(t, t.active && w.focused)); });
      box.appendChild(sec);
    });
    if (!shown.length) { var p = document.createElement('p'); p.className = 'empty'; p.textContent = words.length ? 'לא נמצאה כרטיסייה כזאת.' : 'אין כרטיסיות פתוחות.'; box.appendChild(p); }
    var f = words.length && shown.length;
    $('found').hidden = !f;
    if (f) { $('f-close').textContent = '✕ לסגור את ' + shown.length + ' שנמצאו'; $('f-nap').textContent = '💤 להשהות את ' + shown.length + ' שנמצאו';
      $('f-group').textContent = '🗂 לקבץ את ' + shown.length + ' לקבוצה "' + $('q').value.trim().slice(0, 16) + '"'; $('f-pin').textContent = '📌 לנעוץ את ' + shown.length + ' שנמצאו'; }
    renderSaved();
  }
  function focusTab(t) {
    chrome.tabs.update(t.id, { active: true }).then(function () { return chrome.windows.update(t.windowId, { focused: true }); })
      .then(function () { if (isPopupWin) window.close(); }).catch(function () { load(); });
  }

  // ---------- פעולות ----------
  function dupes() {
    if (!hasTabs) return [];
    var keep = {}, out = [];
    // שומרים את הכרטיסייה הפתוחה/נעוצה/שמנגנת, וסוגרים את העותקים האחרים
    allTabs().slice().sort(function (a, b) { return (b.active + b.pinned + b.audible) - (a.active + a.pinned + a.audible); }).forEach(function (t) {
      var k = keyOf(t.url); if (!k || !canTouch(t.url)) return;
      if (keep[k]) { if (!t.pinned && !t.active) out.push(t); } else keep[k] = t;
    });
    return out;
  }
  $('dupes').addEventListener('click', function () {
    var d = dupes(); if (!d.length) return;
    chrome.tabs.remove(d.map(function (t) { return t.id; })).then(function () {
      say('נסגרו ' + d.length + ' כרטיסיות כפולות. להחזיר: Ctrl+Shift+T.');
    }).then(load);
  });
  $('group').addEventListener('click', function () {
    var jobs = [], n = 0, ci = 0;
    wins.forEach(function (w) {
      var by = {};
      w.tabs.forEach(function (t) { if (t.pinned || t.id === myTabId || !canTouch(t.url)) return; var h = host(t.url); if (h) (by[h] = by[h] || []).push(t); });
      Object.keys(by).sort().forEach(function (h) {
        var list = by[h]; if (list.length < 2) return;
        var title = siteName(h), color = COLORS[ci++ % COLORS.length];
        // כבר בקבוצה אחת עם השם הזה? לא נוגעים
        var g0 = list[0].groupId;
        if (g0 > -1 && groups[g0] && groups[g0].title === title && list.every(function (t) { return t.groupId === g0; })) return;
        n++;
        jobs.push(function () {
          return chrome.tabs.group({ tabIds: list.map(function (t) { return t.id; }), createProperties: { windowId: w.id } })
            .then(function (gid) { return chrome.tabGroups.update(gid, { title: title, color: color }); });
        });
      });
    });
    if (!jobs.length) { say('אין מה לקבץ: אין שתי כרטיסיות או יותר מאותו אתר (או שהן כבר בקבוצה).'); return; }
    jobs.reduce(function (p, j) { return p.then(j).catch(function () {}); }, Promise.resolve())
      .then(function () { say('נוצרו ' + n + ' קבוצות לפי אתר. לחיצה על שם הקבוצה בפס מקפלת אותה.'); }).then(load);
  });
  $('ungroup').addEventListener('click', function () {
    var ids = allTabs().filter(function (t) { return t.groupId > -1; }).map(function (t) { return t.id; });
    if (!ids.length) { say('אין קבוצות.'); return; }
    chrome.tabs.ungroup(ids).then(function () { say('הקבוצות בוטלו.'); }).then(load);
  });
  function napList(list) {
    var c = list.filter(function (t) { return !t.active && !t.discarded && !t.audible && !t.pinned && t.autoDiscardable !== false && t.id !== myTabId; });
    if (!c.length) { say('אין כרטיסיות להשהות.'); return Promise.resolve(); }
    return Promise.all(c.map(function (t) { return chrome.tabs.discard(t.id).then(function () { return 1; }, function () { return 0; }); }))
      .then(function (r) { var k = r.reduce(function (a, b) { return a + b; }, 0); say('הושהו ' + k + ' כרטיסיות 💤 – הזיכרון שלהן התפנה. כל אחת נטענת שוב כשלוחצים עליה.'); })
      .then(function () { return new Promise(function (r) { setTimeout(r, 400); }); }).then(load);
  }
  $('nap').addEventListener('click', function () { napList(allTabs()); });
  $('f-nap').addEventListener('click', function () { napList(shown); });
  $('f-close').addEventListener('click', function () {
    var b = this;
    if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'בטוח? ללחוץ שוב כדי לסגור ' + shown.length; setTimeout(function () { b.dataset.sure = ''; render(); }, 4000); return; }
    b.dataset.sure = '';
    var ids = shown.map(function (t) { return t.id; }), n = ids.length;
    chrome.tabs.remove(ids).then(function () { $('q').value = ''; say('נסגרו ' + n + ' כרטיסיות. להחזיר: Ctrl+Shift+T (אחת אחת).'); }).then(load);
  });
  // קבוצה מכל מה שנמצא בחיפוש, עם המילה שחיפשו כשם הקבוצה
  $('f-group').addEventListener('click', function () {
    var list = shown.filter(function (t) { return !t.pinned; }), title = $('q').value.trim().slice(0, 24);
    if (!list.length) { say('כרטיסיות נעוצות לא נכנסות לקבוצה.'); return; }
    var win = list[0].windowId;
    chrome.tabs.group({ tabIds: list.map(function (t) { return t.id; }), createProperties: { windowId: win } })
      .then(function (gid) { return chrome.tabGroups.update(gid, { title: title, color: COLORS[Object.keys(groups).length % COLORS.length] }); })
      .then(function () { say('נוצרה קבוצה "' + title + '" עם ' + list.length + ' כרטיסיות.'); }, function () { say('כרום לא יצר את הקבוצה.'); }).then(load);
  });
  $('f-pin').addEventListener('click', function () {
    var list = shown.filter(function (t) { return !t.pinned; });
    Promise.all(list.map(function (t) { return chrome.tabs.update(t.id, { pinned: true }).catch(function () {}); }))
      .then(function () { say('ננעצו ' + list.length + ' כרטיסיות 📌. הן קבועות בתחילת הפס.'); }).then(load);
  });
  $('merge').addEventListener('click', function () {
    if (wins.length < 2) { say('יש רק חלון אחד.'); return; }
    var target = wins.filter(function (w) { return w.focused; })[0] || wins[0];
    var jobs = [];
    wins.forEach(function (w) {
      if (w.id === target.id) return;
      var seenG = {};
      w.tabs.forEach(function (t) {
        if (t.groupId > -1) { if (!seenG[t.groupId]) { seenG[t.groupId] = 1; jobs.push(function () { return chrome.tabGroups.move(t.groupId, { windowId: target.id, index: -1 }); }); } }
        else jobs.push(function () { return chrome.tabs.move(t.id, { windowId: target.id, index: -1 }).then(function () { if (t.pinned) return chrome.tabs.update(t.id, { pinned: true }); }); });
      });
    });
    jobs.reduce(function (p, j) { return p.then(j).catch(function () {}); }, Promise.resolve())
      .then(function () { say('כל הכרטיסיות עברו לחלון אחד.'); }).then(load);
  });

  // ---------- רשימות שמורות ----------
  function snapshot() {
    return allTabs().filter(function (t) { return t.url && !/^chrome-extension:/.test(t.url); }).map(function (t) { return { u: t.url, t: (t.title || '').slice(0, 200) }; });
  }
  function stamp() {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function store() { return chrome.storage.local.set({ savedTabs: saved.slice(0, 50) }); }
  function saveNow() {
    var list = snapshot(); if (!list.length) return Promise.resolve(null);
    var item = { id: Date.now(), at: stamp(), tabs: list.slice(0, 500) };
    saved.unshift(item);
    return store().then(function () { return item; });
  }
  $('save').addEventListener('click', function () {
    saveNow().then(function (it) { say(it ? 'נשמרה רשימה של ' + it.tabs.length + ' כרטיסיות (למטה, ב"רשימות ששמרתי").' : 'אין מה לשמור.'); renderSaved(); });
  });
  $('save-close').addEventListener('click', function () {
    var b = this;
    if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'בטוח? הכרטיסיות יישמרו וייסגרו. ללחוץ שוב'; setTimeout(function () { b.dataset.sure = ''; b.textContent = '💾 לשמור ולסגור את כל השאר'; }, 4000); return; }
    b.dataset.sure = ''; b.textContent = '💾 לשמור ולסגור את כל השאר';
    saveNow().then(function (it) {
      if (!it) { say('אין מה לשמור.'); return; }
      // סוגרים הכול חוץ מהכרטיסייה הפתוחה בחלון הפעיל (וחוץ מהדף הזה)
      var w = wins.filter(function (x) { return x.focused; })[0] || wins[0];
      var keep = w && w.tabs.filter(function (t) { return t.active; })[0];
      var ids = allTabs().filter(function (t) { return !keep || t.id !== keep.id; }).map(function (t) { return t.id; });
      return chrome.tabs.remove(ids).then(function () { say('נשמרו ' + it.tabs.length + ' כרטיסיות ונסגרו. פותחים אותן מכאן מתי שרוצים.'); });
    }).then(load);
  });
  function openList(item) {
    var urls = item.tabs.map(function (x) { return x.u; });
    if (!urls.length) return;
    // הראשונה נטענת, השאר נפתחות מושהות – כדי שהמחשב לא ייתקע מעשרות דפים בבת אחת
    chrome.windows.create({ url: urls[0], focused: true }).then(function (w) {
      return urls.slice(1).reduce(function (p, u) {
        return p.then(function () {
          return chrome.tabs.create({ windowId: w.id, url: u, active: false }).then(function (t) {
            return new Promise(function (r) { setTimeout(r, 60); }).then(function () { return chrome.tabs.discard(t.id).catch(function () {}); });
          }).catch(function () {});
        });
      }, Promise.resolve());
    }).then(load);
  }
  function renderSaved() {
    var box = $('saved'); box.textContent = '';
    if (!saved.length) { var p = document.createElement('p'); p.className = 'empty'; p.textContent = 'עוד לא נשמרה רשימה.'; box.appendChild(p); return; }
    saved.forEach(function (it) {
      var d = document.createElement('details'); d.className = 'saved';
      var s = document.createElement('summary'); s.textContent = it.at + ' ';
      var sm = document.createElement('small'); sm.textContent = '· ' + it.tabs.length + ' כרטיסיות'; s.appendChild(sm); d.appendChild(s);
      var r = document.createElement('div'); r.className = 'row';
      [['📂 לפתוח הכול', function () { openList(it); }],
       ['📋 להעתיק כרשימת קישורים', function (e) {
          var btn = e.target, txt = it.tabs.map(function (x) { return (x.t ? x.t + '\n' : '') + x.u; }).join('\n\n');
          navigator.clipboard.writeText(txt).then(function () { btn.textContent = '✓ הועתק'; });
       }],
       ['🗑 למחוק', function (e) {
          var btn = e.target;
          if (btn.dataset.sure !== '1') { btn.dataset.sure = '1'; btn.textContent = 'ללחוץ שוב כדי למחוק'; return; }
          saved = saved.filter(function (x) { return x.id !== it.id; }); store().then(renderSaved);
       }]].forEach(function (a) { var b = document.createElement('button'); b.type = 'button'; b.className = 'line'; b.textContent = a[0]; b.addEventListener('click', a[1]); r.appendChild(b); });
      d.appendChild(r);
      var ol = document.createElement('ol');
      it.tabs.forEach(function (x) {
        var li = document.createElement('li'), a = document.createElement('a');
        a.href = x.u; a.target = '_blank'; a.rel = 'noopener'; a.textContent = x.t || x.u; li.appendChild(a); ol.appendChild(li);
      });
      d.appendChild(ol);
      box.appendChild(d);
    });
  }

  // ---------- הגדרות, רשות, חיפוש ----------
  $('auto').addEventListener('change', function () {
    var v = +this.value || 0;
    chrome.storage.local.set({ autoNap: v }).then(function () { say(v ? 'מעכשיו כרטיסייה שלא נגעו בה ' + $('auto').selectedOptions[0].textContent + ' תושהה לבד.' : 'ההשהיה האוטומטית כבויה.'); });
  });
  $('perm-btn').addEventListener('click', function () {
    chrome.permissions.request({ permissions: ['tabs'] }, function (ok) {
      void chrome.runtime.lastError;
      say(ok ? 'תודה! עכשיו רואים את כל הכרטיסיות.' : 'בלי הרשות אפשר רק להשהות ולאחד חלונות.');
      load();
    });
  });
  $('q').addEventListener('input', render);
  $('q').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && shown[0]) focusTab(shown[0]);
    if (e.key === 'ArrowDown') { var f = document.querySelector('#list .go'); if (f) { e.preventDefault(); f.focus(); } }
  });
  $('list').addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    var all = [].slice.call(document.querySelectorAll('#list .go')), i = all.indexOf(document.activeElement);
    if (i < 0) return; e.preventDefault();
    var n = all[i + (e.key === 'ArrowDown' ? 1 : -1)];
    if (n) n.focus(); else if (e.key === 'ArrowUp') $('q').focus();
  });

  // עדכון חי כשכרטיסיות נפתחות, נסגרות או משתנות
  var tm;
  function soon() { clearTimeout(tm); tm = setTimeout(load, 300); }
  ['onCreated', 'onRemoved', 'onUpdated', 'onMoved', 'onAttached', 'onDetached', 'onReplaced'].forEach(function (ev) { if (chrome.tabs[ev]) chrome.tabs[ev].addListener(soon); });
  if (chrome.tabGroups) chrome.tabGroups.onUpdated.addListener(soon);
  chrome.permissions.onAdded.addListener(soon);
  chrome.permissions.onRemoved.addListener(soon);

  var isPopupWin = false;
  chrome.tabs.getCurrent(function (t) {
    if (t) { myTabId = t.id; chrome.windows.get(t.windowId).then(function (w) { isPopupWin = w.type === 'popup'; }).catch(function () {}); }
    load().then(function () { if (hasTabs) $('q').focus(); });
  });
})();
