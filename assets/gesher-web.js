/* גשר טלפון↔מחשב – הדף בדפדפן (אייפון וכל טלפון בלי האפליקציה).
 * משחק את תפקיד "הטלפון" בפרוטוקול (tools/gesher-worker/PROTOCOL.md): צימוד ב-QR, ואז טקסט, קישורים
 * וקבצים בשני הכיוונים כל עוד הדף פתוח. ההצפנה – assets/gesher-crypto.js (עותק של crypto.js של התוסף).
 * המפתחות נשמרים רק ב-IndexedDB של הדפדפן הזה. שום תוכן לא נשלח ל-GA.
 */
(function () {
  'use strict';
  var G = self.GesherCrypto;
  var SERVERS = ['https://kelim-gesher.gilad4049.workers.dev'];
  var CHUNK = 192 * 1024, MAX_SIZE = 100 * 1024 * 1024, ACK_WAIT = 30e3, IDLE = 60e3, TEXT_MAX = 100 * 1024;
  var enc = new TextEncoder();
  var $ = function (id) { return document.getElementById(id); };
  var pair = null, ws = null, pingT = null, lastOut = '0', retry = 0, retryT = null, stopped = false;
  var waiters = {}, inc = {}, outs = {};

  // ---------- IndexedDB (מפתחות AES לא ניתנים לייצוא נשמרים כמו שהם) ----------
  function db() {
    return new Promise(function (res, rej) {
      var r = indexedDB.open('hakelim-gesher', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('kv'); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function kv(mode, fn) {
    return db().then(function (d) {
      return new Promise(function (res, rej) {
        var t = d.transaction('kv', mode), s = t.objectStore('kv'), out = fn(s);
        t.oncomplete = function () { res(out && out.result); };
        t.onerror = function () { rej(t.error); };
      });
    });
  }
  var load = function () { return kv('readonly', function (s) { return s.get('pair'); }); };
  var save = function (p) { return kv('readwrite', function (s) { s.put(p, 'pair'); }); };
  var wipe = function () { return kv('readwrite', function (s) { s.delete('pair'); }); };

  // ---------- תצוגה ----------
  function show(id) { ['gw-intro', 'gw-pairing', 'gw-on'].forEach(function (x) { $(x).hidden = x !== id; }); }
  function status(txt, ok) { var s = $('gw-status'); s.textContent = txt; s.className = 'gw-status' + (ok ? ' on' : ''); }
  function say(id, txt) { var e = $(id); if (e) e.textContent = txt; }
  function size(n) { return n < 1024 * 1024 ? Math.max(1, Math.round(n / 1024)) + 'KB' : (n / 1048576).toFixed(1) + 'MB'; }
  function item(icon, title, extra) {
    var li = document.createElement('li');
    var b = document.createElement('b'); b.textContent = (icon ? icon + ' ' : '') + title; li.appendChild(b);
    if (extra) li.appendChild(extra);
    var list = $('gw-log'); list.insertBefore(li, list.firstChild);
    while (list.children.length > 40) list.removeChild(list.lastChild);
    return li;
  }
  function row(li, txt) {
    var p = li.querySelector('.gw-st');
    if (!p) { p = document.createElement('span'); p.className = 'gw-st'; li.insertBefore(p, li.children[1] || null); }
    p.textContent = txt;
  }
  function phoneName() {
    var u = navigator.userAgent;
    return /iPhone/.test(u) ? 'אייפון (דפדפן)' : /iPad/.test(u) ? 'אייפד (דפדפן)' : /Android/.test(u) ? 'טלפון (דפדפן)' : 'דפדפן';
  }

  // ---------- צימוד מה-QR ----------
  function fromHash() {
    var h = location.hash.slice(1);
    if (!h) return null;
    try { history.replaceState(null, '', location.pathname); } catch (e) {}   // הסוד לא נשאר בשורת הכתובת ובהיסטוריה
    try {
      var q = JSON.parse(new TextDecoder().decode(G.unb64u(h)));
      var w = String(q.w || '').replace(/\/+$/, '');
      if (q.v !== 1 || !q.r || !q.s || !q.k || SERVERS.indexOf(w) < 0) return null;
      return { r: q.r, s: q.s, k: q.k, n: String(q.n || 'המחשב').slice(0, 40), w: w };
    } catch (e) { return null; }
  }
  function doPair(q) {
    show('gw-pairing');
    say('gw-pair-msg', 'מתחבר אל ' + q.n + '…');
    var room = G.unb64u(q.r), secret = G.unb64u(q.s), pcPub = G.unb64u(q.k), kp, sessP, done = false;
    return Promise.all([G.pairToken(secret), G.newKeyPair()]).then(function (a) {
      kp = a[1];
      sessP = G.deriveSession(kp.privateKey, pcPub, room);
      return G.helloMac(secret, room, pcPub, kp.pub).then(function (mac) {
        var s = new WebSocket(q.w.replace(/^http/, 'ws') + '/r/' + q.r + '/ws?tok=' + G.b64u(a[0]));
        s.binaryType = 'arraybuffer';
        var to = setTimeout(function () { if (!done) { done = true; try { s.close(); } catch (e) {} pairFail('לא הצלחנו להתחבר. בתוסף לוחצים שוב "חיבור לטלפון" וסורקים את ה-QR החדש.'); } }, 45e3);
        s.onopen = function () {
          s.send(enc.encode(JSON.stringify({ type: 'hello', pub: G.b64u(kp.pub), mac: G.b64u(mac), name: phoneName() })));
        };
        s.onmessage = function (e) {
          if (typeof e.data !== 'string') return;
          var m; try { m = JSON.parse(e.data); } catch (x) { return; }
          if (m.t === 'sealed' && !done) {
            done = true; clearTimeout(to);
            sessP.then(function (sess) {
              pair = { room: q.r, w: q.w, tokPhone: sess.tokPhone, k12: sess.k12, k21: sess.k21, name: q.n, at: Date.now(), lastIn: '0' };
              return save(pair);
            }).then(connected, function () { if (pair) connected(); else pairFail('הצימוד נכשל. סורקים שוב את ה-QR מהתוסף.'); });
          }
          if (m.t === 'err' && !done) { done = true; clearTimeout(to); pairFail('הצימוד נכשל. סורקים שוב את ה-QR מהתוסף.'); }
        };
        s.onclose = function (e) {
          if (e.code === 4002 || done) return;
          done = true; clearTimeout(to);
          pairFail(e.code === 4001 ? 'עבר הזמן של ה-QR. בתוסף לוחצים שוב "חיבור לטלפון".' : 'ה-QR הזה כבר לא תקף. בתוסף לוחצים שוב "חיבור לטלפון" וסורקים את ה-QR החדש.');
        };
      });
    }).catch(function () { pairFail('הדפדפן הזה לא תומך בהצפנה שהגשר צריך. נסו בספארי או בכרום מעודכנים.'); });
  }
  function pairFail(msg) { show('gw-intro'); say('gw-intro-msg', msg); $('gw-intro-msg').hidden = !msg; }

  // ---------- חיבור קבוע ----------
  function connected() {
    stopped = false;
    show('gw-on');
    say('gw-pc', pair.name);
    connect();
  }
  function connect() {
    if (!pair || stopped) return;
    clearTimeout(retryT);
    var old = ws; ws = null;
    try { if (old) old.close(); } catch (e) {}
    status('מתחבר…', false);
    var s = ws = new WebSocket(pair.w.replace(/^http/, 'ws') + '/r/' + pair.room + '/ws?tok=' + pair.tokPhone);
    s.binaryType = 'arraybuffer';
    s.onopen = function () {
      retry = 0;
      status('מחובר לשרת. מחכה ל' + pair.name + '…', false);
      clearInterval(pingT);
      pingT = setInterval(function () { if (s.readyState === 1) s.send('ping'); }, 20e3);
    };
    s.onmessage = function (e) {
      if (typeof e.data === 'string') {
        if (e.data === 'pong') return;
        var m; try { m = JSON.parse(e.data); } catch (x) { return; }
        if (m.t === 'peer') status(m.on ? 'מחובר ל' + pair.name + ' ✓' : pair.name + ' לא מחובר כרגע (כרום סגור?). פותחים כרום במחשב.', !!m.on);
        if (m.t === 'err') status(m.e === 'size' ? 'החלק גדול מדי' : m.e === 'quota' ? 'הגעתם למכסה היומית' : 'שגיאה בשרת', false);
        return;
      }
      G.open(pair.k12, G.unb64u(pair.room), 1, e.data, pair.lastIn).then(function (r) {
        pair.lastIn = r.ctr;
        return onMsg(r.obj);
      }).catch(function () { /* מסגרת לא תקינה או חוזרת – מתעלמים */ });
    };
    s.onclose = function (e) {
      if (s !== ws) return;
      clearInterval(pingT);
      if (e.code === 4003) return forget('המחשב ניתק את החיבור. כדי להתחבר שוב – סורקים QR חדש מהתוסף.');
      if (e.code === 4000) { status('הגשר נפתח במקום אחר (באפליקציה או בלשונית אחרת). "להתחבר שוב" מחזיר אותו לכאן.', false); return; }
      if (e.code === 4001) return forget('החיבור פג אחרי זמן רב בלי שימוש. סורקים QR חדש מהתוסף.');
      retry++;
      if (retry > 6) { status('אין חיבור. בודקים את האינטרנט ולוחצים "להתחבר שוב".', false); return; }
      status('החיבור נפל, מנסה שוב…', false);
      retryT = setTimeout(connect, Math.min(30e3, 1000 * Math.pow(2, retry)));
    };
  }
  function send(obj) {
    if (!ws || ws.readyState !== 1 || !pair) return Promise.reject(new Error('off'));
    var ctr = G.nextCtr(lastOut); lastOut = ctr;
    var s = ws;
    return G.seal(pair.k21, G.unb64u(pair.room), 2, ctr, obj).then(function (f) { s.send(f); });
  }
  function wait(key, ms) {
    return new Promise(function (res) {
      var t = setTimeout(function () { delete waiters[key]; res(null); }, ms);
      waiters[key] = function (o) { clearTimeout(t); delete waiters[key]; res(o); };
    });
  }
  function newId(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function forget(msg) {
    stopped = true; clearInterval(pingT); clearTimeout(retryT);
    var old = ws; ws = null; pair = null;
    try { if (old) old.close(); } catch (e) {}
    wipe().catch(function () {});
    pairFail(msg);
  }

  // ---------- הודעות מהמחשב ----------
  function onMsg(o) {
    if (!o || typeof o.type !== 'string') return;
    if (o.type === 'ack') { var a = waiters['a:' + o.id]; if (a) a(o); return; }
    if (o.type === 'file-ack') { var w = waiters['f:' + o.fid + ':' + (o.part | 0)]; if (w) w(o); return; }
    if (o.type === 'bye') return forget('המחשב ניתק את החיבור. כדי להתחבר שוב – סורקים QR חדש מהתוסף.');
    if (o.type === 'clip' && typeof o.text === 'string') { gotText(o.text.slice(0, TEXT_MAX)); return send({ type: 'ack', id: o.id }); }
    if (o.type === 'link') {
      var url = String(o.url || ''), ok = /^https?:\/\//i.test(url);
      if (ok) gotLink(url, String(o.title || ''));
      return send({ type: 'ack', id: o.id, ok: ok });
    }
    if (o.type === 'file') return onFile(o);
    if (o.type === 'file-x') {
      var fid = String(o.fid || '');
      if (inc[fid]) { row(inc[fid].li, 'בוטל במחשב'); delete inc[fid]; }
      if (outs[fid]) outs[fid].stop('cancel');
    }
    // otp / notif / notif-reply וכל סוג לא מוכר – לא שייכים לדף; מתעלמים (תאימות קדימה)
  }
  function copyBtn(text) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-line gw-mini'; b.textContent = 'העתקה';
    b.addEventListener('click', function () {
      (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { b.textContent = 'הועתק ✓'; }, function () { b.textContent = 'לא הצליח – מסמנים ומעתיקים'; });
    });
    return b;
  }
  function gotText(text) {
    var box = document.createElement('div');
    var p = document.createElement('p'); p.className = 'gw-text'; p.textContent = text; box.appendChild(p);
    box.appendChild(copyBtn(text));
    item('📋', 'טקסט מהמחשב', box);
    buzz();
  }
  function gotLink(url, title) {
    var box = document.createElement('div');
    var a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.className = 'gold gw-url'; a.textContent = title || url; box.appendChild(a);
    box.appendChild(copyBtn(url));
    item('🔗', 'קישור מהמחשב', box);
    buzz();
  }
  function buzz() { try { if (navigator.vibrate) navigator.vibrate(60); } catch (e) {} }

  function ackFile(fid, part, ok, extra) { return send(Object.assign({ type: 'file-ack', fid: fid, part: part, ok: ok }, extra || {})); }
  function onFile(o) {
    var fid = String(o.fid || ''), part = o.part | 0;
    if (!/^[A-Za-z0-9_-]{4,40}$/.test(fid)) return;
    var f = inc[fid];
    if (part === 0 && !f) {
      var parts = o.parts | 0, sz = +o.size || 0;
      if (parts < 1 || sz > MAX_SIZE || parts > Math.ceil(MAX_SIZE / CHUNK) + 1) return ackFile(fid, 0, false, { done: true, why: 'size' });
      f = inc[fid] = { name: String(o.name || 'קובץ').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '_').slice(-120) || 'קובץ', mime: String(o.mime || 'application/octet-stream').slice(0, 100), size: sz, parts: parts, sha: String(o.sha || '').toLowerCase(), chunks: [], last: Date.now() };
      f.li = item('📥', f.name + ' · ' + size(sz));
    }
    if (!f) return ackFile(fid, part, false, { done: true, why: 'gone' });
    if (part < f.chunks.length) return ackFile(fid, part, true);      // שידור חוזר של חלק שכבר קיבלנו
    if (part !== f.chunks.length) return;
    var u;
    try { var bin = atob(String(o.data || '')); u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); }
    catch (e) { delete inc[fid]; row(f.li, 'הקובץ הגיע פגום ונזרק'); return ackFile(fid, part, false, { done: true, why: 'data' }); }
    f.chunks.push(u); f.last = Date.now();
    if (f.chunks.length < f.parts) { row(f.li, Math.round(f.chunks.length * 100 / f.parts) + '%'); return ackFile(fid, part, true); }
    var blob = new Blob(f.chunks, { type: f.mime });
    delete inc[fid];
    return blob.arrayBuffer().then(function (ab) { return G.sha256Hex(new Uint8Array(ab)); }).then(function (h) {
      if (f.sha && h !== f.sha) { row(f.li, 'הקובץ הגיע פגום ונזרק'); return ackFile(fid, part, false, { done: true, why: 'hash' }); }
      showFile(f, blob);
      return ackFile(fid, part, true, { done: true, saved: true });
    });
  }
  function showFile(f, blob) {
    var url = URL.createObjectURL(blob), box = document.createElement('div');
    if (/^image\//.test(f.mime)) { var im = document.createElement('img'); im.src = url; im.alt = f.name; im.className = 'gw-img'; box.appendChild(im); }
    var a = document.createElement('a'); a.href = url; a.download = f.name; a.className = 'btn btn-gold gw-mini'; a.textContent = 'שמירה בטלפון'; box.appendChild(a);
    try {
      var file = new File([blob], f.name, { type: f.mime });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-line gw-mini'; b.textContent = 'שיתוף / שמירה לתמונות';
        b.addEventListener('click', function () { navigator.share({ files: [file] }).catch(function () {}); });
        box.appendChild(b);
      }
    } catch (e) {}
    row(f.li, 'הגיע ✓');
    f.li.appendChild(box);
    buzz();
  }
  setInterval(function () {   // צד שלא שמע כלום 60 שניות זורק את הקובץ
    Object.keys(inc).forEach(function (k) { if (Date.now() - inc[k].last > IDLE) { row(inc[k].li, 'ההעברה נקטעה'); delete inc[k]; } });
  }, 15e3);

  // ---------- שליחה למחשב ----------
  function sendText() {
    var t = $('gw-text').value.trim();
    if (!t || !pair) return;
    if (t.length > TEXT_MAX) { status('הטקסט ארוך מדי (עד 100KB).', false); return; }
    var id = newId('w'), isUrl = /^https?:\/\/\S+$/i.test(t);
    var obj = isUrl ? { type: 'link', id: id, url: t, title: '', at: Date.now() } : { type: 'clip', id: id, text: t, at: Date.now(), sens: false };
    var li = item(isUrl ? '🔗' : '📋', (isUrl ? 'קישור' : 'טקסט') + ' למחשב: ' + (t.length > 60 ? t.slice(0, 60) + '…' : t));
    row(li, 'שולח…');
    var w = wait('a:' + id, 15e3);
    send(obj).then(function () { return w; }, function () { return 'off'; }).then(function (r) {
      if (r === 'off') return row(li, 'אין חיבור – לא נשלח');
      if (!r) return row(li, 'המחשב לא אישר. כרום פתוח במחשב?');
      row(li, r.paused ? 'הגיע, אבל הלוח מושהה בתוסף' : isUrl ? 'הגיע למחשב ✓' : 'הגיע ללוח של המחשב ✓');
      $('gw-text').value = '';
    });
  }
  function b64(u) { var s = ''; for (var i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }
  function sendFiles(list) {
    var arr = Array.prototype.slice.call(list || []);
    return arr.reduce(function (p, file) { return p.then(function () { return sendFile(file); }); }, Promise.resolve());
  }
  function sendFile(file) {
    var li = item('📤', file.name + ' · ' + size(file.size));
    if (file.size > MAX_SIZE) { row(li, 'גדול מדי (עד 100MB)'); return Promise.resolve(); }
    if (!ws || ws.readyState !== 1) { row(li, 'אין חיבור – לא נשלח'); return Promise.resolve(); }
    var fid = newId('f'), cur = null, why = '';
    var x = outs[fid] = { stop: function (w) { why = w; if (cur) cur({ ok: false, why: w }); } };
    var cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'btn btn-line gw-mini'; cancel.textContent = 'ביטול';
    cancel.addEventListener('click', function () { send({ type: 'file-x', fid: fid, why: 'cancel' }).catch(function () {}); x.stop('cancel'); });
    li.appendChild(cancel);
    row(li, 'מכין…');
    return file.arrayBuffer().then(function (ab) {
      var all = new Uint8Array(ab);
      return G.sha256Hex(all).then(function (sha) {
        var parts = Math.max(1, Math.ceil(all.length / CHUNK)), part = 0, tries = 0;
        var mime = file.type || 'application/octet-stream';
        function next() {
          if (why) return why;
          var o = { type: 'file', fid: fid, part: part, parts: parts, data: b64(all.subarray(part * CHUNK, (part + 1) * CHUNK)) };
          if (part === 0) { o.name = file.name; o.mime = mime; o.size = all.length; o.sha = sha; o.clip = /^image\//.test(mime); }
          var key = 'f:' + fid + ':' + part, w = wait(key, ACK_WAIT);
          cur = waiters[key];
          return send(o).then(function () { return w; }, function () { return null; }).then(function (r) {
            cur = null;
            if (why) return why;
            if (!r) { if (++tries > 3) return 'timeout'; return next(); }
            if (r.ok === false) return r.why || 'fail';
            tries = 0; part++;
            if (part < parts) { row(li, Math.round(part * 100 / parts) + '%'); return next(); }
            return 'ok';
          });
        }
        return next();
      });
    }).then(function (res) {
      delete outs[fid];
      if (cancel.parentNode) cancel.parentNode.removeChild(cancel);
      if (res === 'timeout') send({ type: 'file-x', fid: fid, why: 'timeout' }).catch(function () {});
      row(li, res === 'ok' ? 'הגיע למחשב ✓ (בהורדות, בתיקייה "מהטלפון")' : res === 'cancel' ? 'בוטל' : res === 'timeout' ? 'המחשב לא עונה – לא נשלח' : 'לא נשלח (' + res + ')');
    }).catch(function () { delete outs[fid]; row(li, 'לא הצלחנו לקרוא את הקובץ'); });
  }

  function unpair() {
    if (!pair) return forget('');
    var p = pair;
    send({ type: 'bye' }).catch(function () {}).then(function () {
      return fetch(p.w + '/r/' + p.room + '?tok=' + encodeURIComponent(p.tokPhone), { method: 'DELETE' }).catch(function () {});
    }).then(function () { forget('נותקתם. כדי להתחבר שוב – סורקים QR מהתוסף במחשב.'); });
  }

  // ---------- התחלה ----------
  function init() {
    if (!G || !self.crypto || !crypto.subtle || !self.indexedDB) { pairFail('הדפדפן הזה ישן מדי לגשר. נסו בספארי או בכרום מעודכנים.'); return; }
    $('gw-send').addEventListener('click', sendText);
    $('gw-file').addEventListener('change', function (e) { sendFiles(e.target.files).then(function () { e.target.value = ''; }); });
    $('gw-unpair').addEventListener('click', function () { if (confirm('לנתק את הדפדפן הזה מהמחשב?')) unpair(); });
    $('gw-retry').addEventListener('click', function () { retry = 0; stopped = false; connect(); });
    document.addEventListener('visibilitychange', function () { if (!document.hidden && pair && !stopped && (!ws || ws.readyState > 1)) { retry = 0; connect(); } });
    var hadHash = location.hash.length > 1, q = fromHash();
    if (q) return doPair(q);
    if (hadHash) return pairFail('הקישור לא תקין. סורקים שוב את ה-QR מהתוסף.');
    load().then(function (p) {
      if (p && p.k12 && p.k21 && p.tokPhone) { pair = p; connected(); }
      else show('gw-intro');
    }, function () { show('gw-intro'); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
