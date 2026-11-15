// "הקבצים שלי": סורק תיקייה שהמשתמש בחר (File System Access) – מה תופס מקום, כפולים, ישנים.
// קריאה בלבד, עד שהמשתמש לוחץ "להעביר כפולים": אז כרום שואל רשות כתיבה, והעותקים המיותרים
// עוברים לתיקייה "_כפולים" (לא נמחקים). שום קובץ לא יוצא מהמחשב.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var SITE = 'https://hakelim.com';
  var CAT = {
    'תמונות': /^(jpe?g|png|gif|webp|heic|heif|bmp|tiff?|raw|cr2|nef|arw|dng|svg)$/,
    'סרטונים': /^(mp4|mov|avi|mkv|wmv|m4v|webm|3gp|mts|m2ts|flv)$/,
    'מוזיקה והקלטות': /^(mp3|m4a|wav|aac|ogg|opus|flac|wma|amr)$/,
    'PDF': /^pdf$/,
    'מסמכים': /^(docx?|xlsx?|pptx?|odt|ods|odp|txt|rtf|csv|md|pages|numbers|key)$/,
    'קבצים דחוסים': /^(zip|rar|7z|tar|gz|bz2|xz|iso)$/,
    'התקנות': /^(exe|msi|dmg|pkg|apk|appx|msix)$/
  };
  var ORDER = ['סרטונים', 'תמונות', 'התקנות', 'קבצים דחוסים', 'PDF', 'מסמכים', 'מוזיקה והקלטות', 'אחר'];
  var root = null, files = [], dupGroups = [], stopped = false;

  function fmt(b) {
    if (b >= 1073741824) return (b / 1073741824).toFixed(1) + ' GB';
    if (b >= 1048576) return (b / 1048576).toFixed(b >= 104857600 ? 0 : 1) + ' MB';
    return Math.max(1, Math.round(b / 1024)) + ' KB';
  }
  function cat(name) { var m = name.toLowerCase().match(/\.([a-z0-9]+)$/), e = m ? m[1] : ''; for (var k in CAT) if (CAT[k].test(e)) return k; return 'אחר'; }
  function date(t) { var d = new Date(t); return d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear(); }
  function prog(t, v, max) { $('prog-t').textContent = t; if (max) { $('prog-b').max = max; $('prog-b').value = v; } else $('prog-b').removeAttribute('value'); }

  // ---------- סריקה ----------
  async function scan(dir) {
    files = []; stopped = false;
    var stack = [{ h: dir, path: '' }], n = 0, last = 0;
    while (stack.length && !stopped) {
      var cur = stack.pop();
      try {
        for await (var entry of cur.h.values()) {
          if (stopped) break;
          var p = cur.path + entry.name;
          if (entry.kind === 'directory') { if (entry.name !== '_כפולים' && entry.name !== '$RECYCLE.BIN') stack.push({ h: entry, path: p + '/' }); continue; }
          try {
            var f = await entry.getFile();
            files.push({ path: p, name: entry.name, size: f.size, mod: f.lastModified, h: entry, dir: cur.h, cat: cat(entry.name) });
          } catch (e) {}
          if (++n - last >= 250) { last = n; prog('סורק… ' + n.toLocaleString('he-IL') + ' קבצים'); await new Promise(function (r) { setTimeout(r, 0); }); }
          if (n >= 200000) { stopped = true; break; }
        }
      } catch (e) {}
    }
  }
  async function hashOf(fl) {
    var f = await fl.h.getFile(), buf;
    if (f.size <= 64 * 1048576) buf = await f.arrayBuffer();
    else {
      var a = await f.slice(0, 4 * 1048576).arrayBuffer(), b = await f.slice(f.size - 4 * 1048576).arrayBuffer();
      var m = new Uint8Array(a.byteLength + b.byteLength + 8); m.set(new Uint8Array(a), 0); m.set(new Uint8Array(b), a.byteLength);
      new DataView(m.buffer).setFloat64(a.byteLength + b.byteLength, f.size); buf = m.buffer;
    }
    var d = new Uint8Array(await crypto.subtle.digest('SHA-256', buf));
    return Array.prototype.map.call(d.subarray(0, 16), function (x) { return (x < 16 ? '0' : '') + x.toString(16); }).join('');
  }
  async function findDups() {
    var bySize = {};
    files.forEach(function (f) { if (f.size >= 1024) (bySize[f.size] = bySize[f.size] || []).push(f); });
    var cands = []; Object.keys(bySize).forEach(function (k) { if (bySize[k].length > 1) cands = cands.concat(bySize[k]); });
    var byHash = {}, i = 0;
    for (; i < cands.length && !stopped; i++) {
      if (i % 10 === 0) prog('בודק כפולים… ' + i + ' מתוך ' + cands.length, i, cands.length);
      try { var h = cands[i].size + ':' + await hashOf(cands[i]); (byHash[h] = byHash[h] || []).push(cands[i]); } catch (e) {}
    }
    dupGroups = Object.keys(byHash).map(function (k) { return byHash[k]; }).filter(function (g) { return g.length > 1; })
      .map(function (g) { return g.sort(function (a, b) { return a.mod - b.mod || a.path.length - b.path.length; }); })
      .sort(function (a, b) { return b[0].size * (b.length - 1) - a[0].size * (a.length - 1); });
  }

  // ---------- תצוגה ----------
  function li(f) {
    var l = document.createElement('li');
    var b = document.createElement('b'); var bn = document.createElement('bdi'); bn.textContent = f.name; b.appendChild(bn);
    var s = document.createElement('span'); s.className = 'sz'; s.textContent = fmt(f.size);
    var p = document.createElement('span'); p.className = 'p'; p.textContent = date(f.mod) + ' · ';
    var bp = document.createElement('bdi'); bp.dir = 'ltr'; bp.textContent = f.path; p.appendChild(bp);
    l.appendChild(b); l.appendChild(s); l.appendChild(p); return l;
  }
  function show() {
    var total = files.reduce(function (a, f) { return a + f.size; }, 0);
    $('dir-name').textContent = 'התיקייה "' + root.name + '"';
    $('sum').textContent = files.length.toLocaleString('he-IL') + ' קבצים · ' + fmt(total) + (stopped ? ' (נעצר באמצע)' : '');
    var by = {}; files.forEach(function (f) { by[f.cat] = (by[f.cat] || 0) + f.size; });
    var max = Math.max.apply(null, ORDER.map(function (k) { return by[k] || 0; }).concat([1]));
    $('bars').textContent = '';
    ORDER.forEach(function (k) {
      if (!by[k]) return;
      var r = document.createElement('div'); r.className = 'bar';
      var a = document.createElement('span'); a.textContent = k;
      var i = document.createElement('i'); i.style.width = Math.max(1, by[k] / max * 100) + '%';
      var w = document.createElement('span'); w.appendChild(i);
      var c = document.createElement('span'); c.textContent = fmt(by[k]);
      r.appendChild(a); r.appendChild(w); r.appendChild(c); $('bars').appendChild(r);
    });
    $('big').textContent = '';
    files.slice().sort(function (a, b) { return b.size - a.size; }).slice(0, 20).forEach(function (f) { $('big').appendChild(li(f)); });
    var waste = dupGroups.reduce(function (a, g) { return a + g[0].size * (g.length - 1); }, 0);
    var extra = dupGroups.reduce(function (a, g) { return a + g.length - 1; }, 0);
    $('dup-sum').textContent = dupGroups.length ? dupGroups.length + ' קבוצות של קבצים זהים · ' + extra + ' עותקים מיותרים תופסים ' + fmt(waste) : 'לא נמצאו קבצים כפולים 👍';
    $('dups').textContent = '';
    dupGroups.slice(0, 30).forEach(function (g) {
      var d = document.createElement('div'); d.className = 'dup';
      var b = document.createElement('b'); var bn = document.createElement('bdi'); bn.textContent = g[0].name; b.appendChild(bn);
      b.appendChild(document.createTextNode(' · ' + g.length + ' עותקים · ')); var bs = document.createElement('bdi'); bs.textContent = fmt(g[0].size); b.appendChild(bs); d.appendChild(b);
      g.forEach(function (f, i) { var p = document.createElement('span'); p.className = 'p' + (i ? '' : ' keep'); p.textContent = (i ? '↪ ' : '✓ נשאר: '); var q = document.createElement('bdi'); q.dir = 'ltr'; q.textContent = f.path; p.appendChild(q); d.appendChild(p); });
      $('dups').appendChild(d);
    });
    $('dup-acts').hidden = !dupGroups.length;
    var lim = Date.now() - 2 * 365 * 864e5, old = files.filter(function (f) { return f.mod < lim; });
    $('old').textContent = old.length ? old.length.toLocaleString('he-IL') + ' קבצים, ' + fmt(old.reduce(function (a, f) { return a + f.size; }, 0)) + '. אפשר לגבות אותם לכונן חיצוני או לענן ולפנות מקום.' : 'אין קבצים ישנים כאלה.';
    var go = $('go'); go.textContent = '';
    var links = [['🗂 לסדר את התיקייה לפי סוג ותאריך', '/kelim/machshev/sader/']];
    if (by['תמונות']) links.push(['🖼 להקטין תמונות', '/kelim/machshev/tmuna/']);
    if (by['סרטונים']) links.push(['🎬 להקטין סרטונים', '/kelim/machshev/video/']);
    if (by['PDF']) links.push(['🗜 לכווץ PDF', '/kelim/machshev/pdf/']);
    if (by['מוזיקה והקלטות']) links.push(['📝 לתמלל הקלטות', '/kelim/tamlul/']);
    links.push(['💾 צ׳ק-ליסט גיבוי', '/kelim/machshev/gibui/']);
    links.forEach(function (x) { var a = document.createElement('a'); a.href = SITE + x[1] + '?utm_source=tosaf_files'; a.target = '_blank'; a.textContent = x[0]; go.appendChild(a); });
    $('out').hidden = false;
  }

  async function run(dir) {
    root = dir; $('start').hidden = true; $('out').hidden = true; $('prog').hidden = false; $('dup-msg').textContent = '';
    await scan(dir); if (!stopped) await findDups();
    $('prog').hidden = true; show();
  }
  $('pick').addEventListener('click', async function () {
    if (!window.showDirectoryPicker) { $('pick-msg').textContent = 'הדפדפן הזה לא מאפשר לבחור תיקייה. צריך כרום או אדג׳ במחשב.'; return; }
    try { var d = await window.showDirectoryPicker({ id: 'hk-files', mode: 'read' }); await run(d); }
    catch (e) {
      if (e && e.name === 'AbortError') return;
      $('pick-msg').textContent = 'כרום לא מאפשר לבדוק את התיקייה הזאת (תיקיות מערכת חסומות). בחרו תיקייה בתוכה, למשל "הורדות" או "מסמכים".';
    }
  });
  $('again').addEventListener('click', function () { $('out').hidden = true; $('start').hidden = false; $('pick').click(); });
  $('stop').addEventListener('click', function () { stopped = true; });

  // ---------- העברת כפולים ----------
  async function uniqueName(dir, name) {
    var base = name.replace(/(\.[^.]*)?$/, ''), ext = (name.match(/\.[^.]*$/) || [''])[0], n = name, i = 2;
    for (;;) { try { await dir.getFileHandle(n); n = base + ' (' + i++ + ')' + ext; } catch (e) { return n; } }
  }
  $('dup-move').addEventListener('click', async function () {
    var btn = this;
    if (btn.dataset.sure !== '1') { btn.dataset.sure = '1'; btn.textContent = 'בטוח? ללחוץ שוב כדי להעביר'; return; }
    btn.dataset.sure = ''; btn.disabled = true;
    try {
      if ((await root.requestPermission({ mode: 'readwrite' })) !== 'granted') { $('dup-msg').textContent = 'בלי רשות כתיבה אי אפשר להעביר. שום דבר לא השתנה.'; btn.disabled = false; return; }
      var to = await root.getDirectoryHandle('_כפולים', { create: true }), moved = 0, freed = 0, fail = 0;
      for (var g = 0; g < dupGroups.length; g++) for (var i = 1; i < dupGroups[g].length; i++) {
        var f = dupGroups[g][i];
        $('dup-msg').textContent = 'מעביר… ' + (moved + 1);
        try {
          var name = await uniqueName(to, f.name);
          if (f.h.move) { await f.h.move(to, name); }
          else {
            var nh = await to.getFileHandle(name, { create: true }), w = await nh.createWritable();
            await w.write(await f.h.getFile()); await w.close();
            if ((await nh.getFile()).size !== f.size) throw new Error('size');
            await f.dir.removeEntry(f.name);
          }
          moved++; freed += f.size;
        } catch (e) { fail++; }
      }
      $('dup-msg').textContent = 'הועברו ' + moved + ' עותקים (' + fmt(freed) + ') לתיקייה "_כפולים" שבתוך "' + root.name + '".' + (fail ? ' ' + fail + ' לא הועברו (אולי פתוחים בתוכנה אחרת).' : '') + ' בדקו אותה, ואז מחקו אותה בעצמכם.';
      dupGroups = []; $('dup-acts').hidden = true;
    } catch (e) { $('dup-msg').textContent = 'ההעברה נעצרה. מה שהועבר נמצא בתיקייה "_כפולים".'; }
    btn.disabled = false; btn.textContent = '📦 להעביר את העותקים המיותרים לתיקייה "_כפולים"';
  });

  // ---------- דוח ----------
  $('csv').addEventListener('click', function () {
    var dupOf = {}; dupGroups.forEach(function (g, i) { g.forEach(function (f) { dupOf[f.path] = i + 1; }); });
    var rows = [['נתיב', 'גודל (MB)', 'שונה לאחרונה', 'סוג', 'קבוצת כפולים']];
    files.slice().sort(function (a, b) { return b.size - a.size; }).forEach(function (f) { rows.push([f.path, (f.size / 1048576).toFixed(2), date(f.mod), f.cat, dupOf[f.path] || '']); });
    var csv = '﻿' + rows.map(function (r) { return r.map(function (c) { c = String(c); return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(','); }).join('\r\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'קבצים - ' + (root ? root.name : 'דוח') + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
  });
})();
