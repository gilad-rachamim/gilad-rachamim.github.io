/* גשר – כרטיס "תמונות וקבצים" בדף הגשר (שלב 4). שולח קבצים לטלפון בחלקים דרך ה-service worker
 * (gesher/files.js) ומציג את ההעברות האחרונות בשני הכיוונים מתוך chrome.storage.session (רק שם וגודל).
 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var ask = function (m) { return chrome.runtime.sendMessage(m); };
  var WHY = { cancel: 'בוטל', timeout: 'הטלפון לא ענה', hash: 'הקובץ הגיע פגום ונמחק', size: 'גדול מדי (עד 100MB)', idle: 'החיבור נקטע באמצע – לא נשאר קובץ חלקי', nophone: 'הטלפון לא מחובר – פתחו את נעילת הטלפון ונסו שוב', unpaired: 'אין טלפון מחובר', space: 'אין מקום בטלפון', order: 'שגיאת סדר', err: 'שגיאה' };
  var live = {};   // fid -> {pct} להעברות שיוצאות מהדף הזה (מהיר יותר מהרשימה)

  function size(n) { return n >= 1048576 ? (n / 1048576).toFixed(1) + 'MB' : Math.max(1, Math.round(n / 1024)) + 'KB'; }
  function b64(u8) { var s = ''; for (var i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }
  function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }
  function msg(t) { $('file-msg').textContent = t || ''; }

  function sendFile(f) {
    if (f.size > 100 * 1024 * 1024) { msg('"' + f.name + '" גדול מדי (עד 100MB)'); return Promise.resolve(); }
    return f.arrayBuffer().then(function (ab) {
      return crypto.subtle.digest('SHA-256', ab).then(function (d) {
        return ask({ t: 'gesher-file-start', name: f.name, mime: f.type || 'application/octet-stream', size: f.size, sha: hex(d) });
      }).then(function (s) {
        if (!s || !s.ok) { msg('"' + f.name + '" לא נשלח: ' + (WHY[s && s.why] || WHY.err)); return; }
        var u8 = new Uint8Array(ab), i = 0;
        live[s.fid] = { pct: 0 };
        return (function next() {
          if (i >= s.parts) { delete live[s.fid]; return; }
          var part = i++;
          return ask({ t: 'gesher-file-part', fid: s.fid, part: part, data: b64(u8.subarray(part * s.chunk, (part + 1) * s.chunk)) }).then(function (r) {
            if (!r || !r.ok) { delete live[s.fid]; if (r && r.why && r.why !== 'cancel') msg('"' + f.name + '" לא נשלח: ' + (WHY[r.why] || r.why)); return; }
            live[s.fid].pct = Math.round(i * 100 / s.parts);
            bar(s.fid, live[s.fid].pct);
            return next();
          });
        })();
      });
    });
  }
  function sendAll(list) {
    var a = Array.prototype.slice.call(list || []);
    if (!a.length) return;
    msg('');
    a.reduce(function (p, f) { return p.then(function () { return sendFile(f); }); }, Promise.resolve()).catch(function () { msg(WHY.err); });
  }
  function bar(fid, pct) { var el = document.querySelector('[data-fid="' + fid + '"] progress'); if (el) el.value = pct; }

  function render() {
    chrome.storage.session.get('gXfer').then(function (o) {
      var a = o.gXfer || [], box = $('xfer-list');
      box.textContent = '';
      a.slice(0, 10).forEach(function (x) {
        var d = document.createElement('div');
        d.className = 'xf'; d.dataset.fid = x.fid;
        var hd = document.createElement('div'); hd.className = 'hd';
        var b = document.createElement('b'); b.textContent = (x.dir === 'in' ? '📥 ' : '📤 ') + x.name;
        var sp = document.createElement('span'); sp.textContent = (x.dir === 'in' ? 'מהטלפון' : 'לטלפון') + ' · ' + size(x.size || 0) + ' · ' + new Date(x.at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
        hd.appendChild(b); hd.appendChild(sp); d.appendChild(hd);
        var st = document.createElement('div'); st.className = 'st';
        var row = document.createElement('div'); row.className = 'row';
        if (x.state === 'run' || x.state === 'wait') {
          var pg = document.createElement('progress'); pg.max = 100; pg.value = (live[x.fid] && live[x.fid].pct) || x.pct || 0; d.appendChild(pg);
          st.textContent = x.state === 'wait' ? '⏳ מחכה לטלפון – פתחו את נעילת הטלפון' : (x.dir === 'in' ? 'מקבל…' : 'שולח…');
          var c = document.createElement('button'); c.type = 'button'; c.textContent = '✖ ביטול';
          c.onclick = function () { c.disabled = true; ask({ t: 'gesher-file-cancel', fid: x.fid }); };
          row.appendChild(c);
          if (x.dir === 'in' && x.state === 'wait' && x.pct === 100) { st.textContent = '📥 הגיע – לחצו "לאשר שמירה" למעלה'; row.textContent = ''; }
        } else if (x.state === 'ok') {
          st.className = 'st ok';
          st.textContent = x.dir === 'in' ? '✓ נשמר ב"הורדות/מהטלפון"' + (x.clip ? ' · וגם בלוח' : '') : '✓ נשמר בטלפון ב-Downloads/Hakelim';
          if (x.dir === 'in' && x.dl != null) {
            var sh = document.createElement('button'); sh.type = 'button'; sh.textContent = '📂 פתח תיקייה';
            sh.onclick = function () { ask({ t: 'gesher-file-show', dl: x.dl }); };
            row.appendChild(sh);
          }
        } else { st.className = 'st err'; st.textContent = '✖ ' + (WHY[x.why] || x.why || WHY.err); }
        d.appendChild(st);
        if (row.childNodes.length) d.appendChild(row);
        box.appendChild(d);
      });
    }).catch(function () {});
    chrome.permissions.contains({ permissions: ['downloads'] }).then(function (has) { $('file-perm').hidden = has; });
  }

  $('file-in').addEventListener('change', function (e) { sendAll(e.target.files); e.target.value = ''; });
  $('drop').addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('file-in').click(); } });
  ['dragenter', 'dragover'].forEach(function (ev) { document.addEventListener(ev, function (e) { if ($('files').hidden) return; e.preventDefault(); $('drop').classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { document.addEventListener(ev, function (e) { e.preventDefault(); $('drop').classList.remove('over'); }); });
  document.addEventListener('drop', function (e) { if (!$('files').hidden && e.dataTransfer) sendAll(e.dataTransfer.files); });
  $('file-perm').addEventListener('click', function () {
    chrome.permissions.request({ permissions: ['downloads'] }).catch(function () { return false; }).then(function (ok) {
      if (ok) ask({ t: 'gesher-file-flush' }).then(render);
      render();
    });
  });
  chrome.storage.local.get('gesherOpts').then(function (o) { $('opt-file-clip').checked = (o.gesherOpts || {}).fileClip !== false; });
  $('opt-file-clip').addEventListener('change', function (e) {
    var on = e.target.checked;
    chrome.storage.local.get('gesherOpts').then(function (o) { var g = o.gesherOpts || {}; g.fileClip = on; return chrome.storage.local.set({ gesherOpts: g }); });
    if (on) chrome.permissions.request({ permissions: ['clipboardWrite'] }).catch(function () {});
  });
  chrome.storage.onChanged.addListener(function (c, area) { if (area === 'session' && c.gXfer) render(); });
  chrome.permissions.onAdded.addListener(render);
  render();
  if (location.hash === '#files') setTimeout(function () { $('files').scrollIntoView({ block: 'start' }); }, 300);
})();
