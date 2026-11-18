/* Call journal (/kelim/android/yoman-sichot/): IndexedDB store "yoman-sichot" in this browser only.
   window.YomanDB = { put, all, get, del, exportJSON, importJSON }. Renders #ys-list when present.
   Audio Blobs are kept only when the user ticked "keep the recording"; exports never include audio. */
(function () {
  var DBN = 'yoman-sichot', ST = 'calls', dbp = null;
  function open() {
    if (dbp) return dbp;
    dbp = new Promise(function (res, rej) {
      if (!window.indexedDB) return rej(new Error('no-idb'));
      var r = indexedDB.open(DBN, 1);
      r.onupgradeneeded = function () { var s = r.result.createObjectStore(ST, { keyPath: 'id' }); s.createIndex('when', 'when'); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
    return dbp;
  }
  function tx(mode, fn) {
    return open().then(function (db) {
      return new Promise(function (res, rej) {
        var t = db.transaction(ST, mode), s = t.objectStore(ST), out = fn(s);
        t.oncomplete = function () { res(out && 'result' in out ? out.result : out); };
        t.onerror = t.onabort = function () { rej(t.error); };
      });
    });
  }
  var DB = window.YomanDB = {
    put: function (rec) { return tx('readwrite', function (s) { return s.put(rec); }); },
    get: function (id) { return tx('readonly', function (s) { return s.get(id); }); },
    del: function (id) { return tx('readwrite', function (s) { return s.delete(id); }); },
    all: function () { return tx('readonly', function (s) { return s.getAll(); }).then(function (a) { return (a || []).sort(function (x, y) { return x.when < y.when ? 1 : -1; }); }); },
    exportJSON: function () {
      return DB.all().then(function (a) {
        return JSON.stringify({ app: 'hakelim-yoman-sichot', v: 1, exported: new Date().toISOString(), calls: a.map(function (r) { var c = Object.assign({}, r); delete c.audio; c.audioType = ''; return c; }) }, null, 1);
      });
    },
    importJSON: function (txt) {
      var d = JSON.parse(txt), list = d && d.calls;
      if (!Array.isArray(list)) throw new Error('bad-file');
      return DB.all().then(function (have) {
        var ids = {}; have.forEach(function (r) { ids[r.id] = 1; });
        var add = list.filter(function (r) { return r && r.id && typeof r.text === 'string' && !ids[r.id]; });
        return Promise.all(add.map(function (r) { r.audio = null; return DB.put(r); })).then(function () { return add.length; });
      });
    }
  };

  /* ---------- list UI ---------- */
  var list = document.getElementById('ys-list'); if (!list) return;
  var C = window.SichaCore || { esc: function (s) { return String(s); } }, esc = C.esc;
  var q = document.getElementById('ys-q'), filt = document.getElementById('ys-filter'), cnt = document.getElementById('ys-count'), empty = document.getElementById('ys-empty');
  var rows = [], urls = [];
  function used(what, extra) { try { if (window.toolUsed) window.toolUsed('android_yoman_sichot', Object.assign({ step: what }, extra || {})); } catch (e) {} }
  function fmt(iso) { try { var d = new Date(iso); return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit' }) + ' ' + d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
  function open_(r) { return (r.tasks || []).filter(function (t) { return !t.done; }).length; }
  function card(r) {
    var o = open_(r), det = (r.who ? 'שיחה עם ' + r.who + '. ' : '') + 'מתוך יומן השיחות: hakelim.com/kelim/android/yoman-sichot/';
    var h = '<article class="ys-e" data-id="' + esc(r.id) + '"><header><b>' + esc(r.who || 'שיחה בלי שם') + '</b><span class="ys-d">' + fmt(r.when) + '</span>' +
      (o ? '<span class="ys-open">' + o + ' משימות פתוחות</span>' : '') + '</header>';
    if (r.tags && r.tags.length) h += '<p class="ys-tags">' + r.tags.map(function (t) { return '<span>#' + esc(t) + '</span>'; }).join(' ') + '</p>';
    if (r.summary && r.summary.length) h += '<ul class="ys-sum">' + r.summary.slice(0, 4).map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>';
    if (r.tasks && r.tasks.length) h += '<ul class="ys-tasks">' + r.tasks.map(function (t, i) {
      return '<li><label><input type="checkbox" data-t="' + i + '"' + (t.done ? ' checked' : '') + '> <span>' + esc(t.t) + '</span></label></li>'; }).join('') + '</ul>';
    if (r.rems && r.rems.length) h += '<p class="ys-rems">' + r.rems.map(function (x, i) {
      var g = ''; try { g = C.gcal ? C.gcal(x, det) : ''; } catch (e) {}
      return (g ? '<a class="btn btn-line btn-sm" href="' + esc(g) + '" target="_blank" rel="noopener">📅 ' + esc(x.title || 'תזכורת') + ' · ' + esc(x.date) + '</a>' : '');
    }).join(' ') + '</p>';
    h += '<details class="ys-more"><summary>כל הטקסט' + (r.audio ? ' וההקלטה' : '') + '</summary>' + (r.audio ? '<audio controls preload="none" data-a="' + esc(r.id) + '"></audio>' : '') +
      '<p class="ys-text">' + esc(r.text || '') + '</p><div class="actions"><button class="btn btn-line btn-sm" type="button" data-copy>להעתיק</button>' +
      '<button class="btn btn-line btn-sm" type="button" data-edit>לשנות שם ותגיות</button><button class="btn btn-line btn-sm ys-del" type="button" data-del>🗑 למחוק</button></div></details></article>';
    return h;
  }
  function draw() {
    urls.forEach(function (u) { URL.revokeObjectURL(u); }); urls = [];
    var term = (q && q.value || '').trim().toLowerCase(), onlyOpen = filt && filt.value === 'open';
    var show = rows.filter(function (r) {
      if (onlyOpen && !open_(r)) return false;
      if (!term) return true;
      return [r.who, (r.tags || []).join(' '), r.text, r.fileName].join(' ').toLowerCase().indexOf(term) > -1;
    });
    list.innerHTML = show.map(card).join('');
    empty.hidden = rows.length > 0;
    function n(k) { return k === 1 ? 'שיחה אחת' : k + ' שיחות'; }
    cnt.textContent = rows.length ? (show.length === rows.length ? n(rows.length) + ' ביומן' : 'מוצגות ' + show.length + ' מתוך ' + n(rows.length)) : '';
  }
  function load() { return DB.all().then(function (a) { rows = a; draw(); }).catch(function () { empty.hidden = false; empty.textContent = 'הדפדפן הזה לא מאפשר לשמור יומן (אולי מצב גלישה בסתר). אפשר עדיין לתמלל ולסכם.'; }); }
  function rowOf(el) { var e = el.closest('.ys-e'); return e && rows.filter(function (r) { return r.id === e.getAttribute('data-id'); })[0]; }

  list.addEventListener('change', function (e) {
    var i = e.target.getAttribute('data-t'), r = rowOf(e.target); if (i == null || !r) return;
    r.tasks[+i].done = e.target.checked; DB.put(r).then(function () { draw(); used('task_done'); });
  });
  list.addEventListener('toggle', function (e) {
    var a = e.target.querySelector && e.target.querySelector('audio[data-a]'), r = a && rowOf(a);
    if (a && r && r.audio && !a.src) { var u = URL.createObjectURL(r.audio); urls.push(u); a.src = u; }
  }, true);
  list.addEventListener('click', function (e) {
    var t = e.target, r = rowOf(t); if (!r) return;
    if (t.hasAttribute('data-del')) {
      if (!confirm('למחוק את השיחה עם ' + (r.who || 'בלי שם') + ' מהיומן? אי אפשר לבטל.')) return;
      DB.del(r.id).then(load); used('delete');
    } else if (t.hasAttribute('data-copy')) {
      try { navigator.clipboard.writeText(r.text || ''); t.textContent = 'הועתק ✓'; } catch (x) {}
    } else if (t.hasAttribute('data-edit')) {
      var w = prompt('עם מי הייתה השיחה?', r.who || ''); if (w === null) return;
      var tg = prompt('תגיות, מופרדות בפסיק', (r.tags || []).join(', ')); if (tg === null) return;
      r.who = w.trim(); r.tags = tg.split(/[,،]/).map(function (s) { return s.trim(); }).filter(Boolean);
      DB.put(r).then(draw);
    }
  });
  if (q) q.addEventListener('input', draw);
  if (filt) filt.addEventListener('change', draw);
  document.addEventListener('yoman-change', load);

  var ex = document.getElementById('ys-export');
  if (ex) ex.onclick = function () {
    DB.exportJSON().then(function (s) {
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([s], { type: 'application/json' }));
      a.download = 'yoman-sichot-' + new Date().toISOString().slice(0, 10) + '.json'; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000); used('export');
    });
  };
  var im = document.getElementById('ys-import');
  if (im) im.onchange = function () {
    var f = im.files && im.files[0]; if (!f) return;
    f.text().then(DB.importJSON).then(function (n) { cnt.textContent = 'שוחזרו ' + n + ' שיחות מהגיבוי ✓'; im.value = ''; return DB.all(); }).then(function (a) { rows = a; draw(); used('import'); })
      .catch(function () { cnt.textContent = 'הקובץ הזה לא נראה כמו גיבוי של היומן.'; im.value = ''; });
  };
  load();
})();
