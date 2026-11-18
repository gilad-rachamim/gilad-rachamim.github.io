/* גשר טלפון↔מחשב – שלב 4: תמונות, קבצים וקישורים בשני הכיוונים. נטען ב-service worker אחרי gesher/link.js.
 * קובץ עובר בחלקים של 192KB (≈256KB אחרי base64), כל חלק מוצפן לבד ומחכה לאישור (file-ack) לפני הבא.
 * טלפון → מחשב: החלקים מתחברים בזיכרון של gesher/offscreen.js; רק כשכולם הגיעו וה-SHA-256 תואם – נשמר ב"הורדות/מהטלפון".
 * מחשב → טלפון: מהלחיצה הימנית ("📲 שלח לטלפון") או מכרטיס הקבצים בדף הגשר.
 * שום תוכן לא נכתב ללוג, לשרת או ל-Analytics. ברשימת ההעברות (storage.session, בזיכרון) נשמרים רק שם וגודל.
 */
(function () {
  'use strict';
  var L = self.Gesher;
  var CHUNK = 192 * 1024, MAX_SIZE = 100 * 1024 * 1024, IDLE = 60e3, ACK_WAIT = 30e3, PHONE_WAIT = 90e3, XFER_MAX = 20;
  var inc = {}, outs = {}, sweepT = null;

  function fidNew() { return 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function okFid(f) { return /^[A-Za-z0-9_-]{4,40}$/.test(f); }
  function safeName(n) {
    n = String(n || '').replace(/[\\/:*?"<>|\u0000-\u001f‎‏‪-‮]+/g, '_').replace(/^[.\s]+|[.\s]+$/g, '').slice(-120);
    if (/^(con|prn|aux|nul|com\d|lpt\d)(\.|$)/i.test(n)) n = '_' + n;
    return n || ('קובץ-' + new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-'));
  }
  function size(n) { return n >= 1048576 ? (n / 1048576).toFixed(1) + 'MB' : Math.max(1, Math.round(n / 1024)) + 'KB'; }
  function b64(u8) { var s = ''; for (var i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }
  function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }
  function off(m) { return L.offscreen().then(function () { return chrome.runtime.sendMessage(m); }); }
  var WHY = { cancel: 'בוטל', timeout: 'הטלפון לא ענה', hash: 'הקובץ הגיע פגום ונמחק', size: 'הקובץ גדול מדי (עד 100MB)', idle: 'החיבור נקטע באמצע', order: 'חלקים הגיעו לא לפי הסדר', nophone: 'הטלפון לא מחובר – פתחו את נעילת הטלפון ונסו שוב', space: 'אין מקום בטלפון', perm: 'אין הרשאה לשמור', err: 'שגיאה' };
  function why(w) { return WHY[w] || w || WHY.err; }

  // ---------- רשימת ההעברות (לדף הגשר) ----------
  var xferQ = Promise.resolve();
  function xfer(fid, patch) {
    xferQ = xferQ.then(function () {
      return chrome.storage.session.get('gXfer').then(function (o) {
        var a = o.gXfer || [], i = a.findIndex(function (x) { return x.fid === fid; });
        var it = Object.assign(i >= 0 ? a[i] : { fid: fid, at: Date.now() }, patch, { upd: Date.now() });
        if (i >= 0) a.splice(i, 1);
        a.unshift(it);
        return chrome.storage.session.set({ gXfer: a.slice(0, XFER_MAX) });
      });
    }).catch(function () {});
    return xferQ;
  }
  var progT = {};
  function prog(id, title, msg, pct, cancel) {
    var now = Date.now();
    if (pct > 0 && pct < 100 && progT[id] && now - progT[id] < 700) return;
    progT[id] = now;
    var o = { type: 'progress', iconUrl: 'icon128.png', title: title, message: msg, progress: Math.max(0, Math.min(100, pct | 0)), priority: 0, silent: true };
    if (cancel) o.buttons = [{ title: '✖ ביטול' }];
    chrome.notifications.create(id, o);
  }

  // ---------- נכנס: טלפון → מחשב ----------
  function ack(fid, part, ok, extra) { return L.send(Object.assign({ type: 'file-ack', fid: fid, part: part, ok: ok }, extra || {})); }
  function onFile(o) {
    var fid = String(o.fid || ''), part = o.part | 0;
    if (!okFid(fid)) return;
    var f = inc[fid];
    if (part === 0 && !f) {
      var parts = o.parts | 0, sz = +o.size || 0;
      if (parts < 1 || sz > MAX_SIZE || parts > Math.ceil(MAX_SIZE / CHUNK) + 1) return ack(fid, 0, false, { done: true, why: 'size' });
      f = inc[fid] = { name: safeName(o.name), mime: String(o.mime || 'application/octet-stream').slice(0, 100), size: sz, parts: parts, sha: String(o.sha || '').toLowerCase(), clip: !!o.clip, next: 0, last: Date.now(), busy: false };
      xfer(fid, { dir: 'in', name: f.name, size: sz, pct: 0, state: 'run' });
      sweep();
    }
    if (!f) return ack(fid, part, false, { done: true, why: 'gone' });
    if (part < f.next) return ack(fid, part, true);                    // שידור חוזר של חלק שכבר קיבלנו
    if (part !== f.next || f.busy) return;                               // יגיע שוב אחרי timeout אצל השולח
    f.busy = true; f.last = Date.now();
    return off({ t: 'gesher-blob-part', fid: fid, part: part, data: String(o.data || '') }).then(function (r) {
      if (!r || !r.ok) throw new Error((r && r.why) || 'err');
      f.next++; f.busy = false; f.last = Date.now();
      var pct = Math.round(f.next * 100 / f.parts);
      if (f.next < f.parts) {
        prog('gesher:fin:' + fid, '📥 מקבל מהטלפון: ' + f.name, size(f.size) + ' · ' + pct + '%', pct, true);
        if (pct % 5 === 0 || f.next === 1) xfer(fid, { pct: pct });
        return ack(fid, part, true);
      }
      return finish(fid, f, part);
    }).catch(function (e) { dropIn(fid, String(e && e.message || 'err'), true); });
  }
  function finish(fid, f, part) {
    return L.opts().then(function (op) {
      var clip = /^image\//.test(f.mime) && op.fileClip !== false && f.clip !== false;
      return off({ t: 'gesher-blob-make', fid: fid, mime: f.mime, sha: f.sha, clip: clip });
    }).then(function (r) {
      if (!r || !r.ok) throw new Error((r && r.why) || 'err');
      delete inc[fid];
      chrome.notifications.clear('gesher:fin:' + fid);
      return save(fid, f, r.url).then(function (dl) {
        ack(fid, part, true, { done: true, saved: dl.ok, clip: !!r.clip });
        xfer(fid, { pct: 100, state: dl.ok ? 'ok' : 'wait', dl: dl.id || null, clip: !!r.clip });
        chrome.notifications.create('gesher:fdone:' + fid, {
          type: 'basic', iconUrl: 'icon128.png',
          title: dl.ok ? '📥 התקבל מהטלפון: ' + f.name : '📥 הגיע קובץ מהטלפון – צריך אישור לשמירה',
          message: dl.ok ? size(f.size) + ' · נשמר ב"הורדות/מהטלפון"' + (r.clip ? ' · התמונה גם בלוח (Ctrl+V)' : '') : 'לחצו כאן ואשרו "ניהול הורדות" – והקובץ יישמר',
          priority: 1, buttons: dl.ok ? [{ title: '📂 פתח תיקייה' }, { title: '📄 פתח קובץ' }] : []
        });
      });
    });
  }
  // שמירה ב"הורדות/מהטלפון". בלי הרשאת downloads – הקובץ מחכה בזיכרון עד 10 דקות לאישור בדף הגשר.
  var pend = {};
  function save(fid, f, url) {
    if (!chrome.downloads) { pend[fid] = { f: f, url: url, at: Date.now() }; return Promise.resolve({ ok: false }); }
    return chrome.downloads.download({ url: url, filename: 'מהטלפון/' + f.name, conflictAction: 'uniquify', saveAs: false }).then(function (id) {
      dls[id] = fid;
      setTimeout(function () { off({ t: 'gesher-blob-free', fid: fid }).catch(function () {}); }, 120e3);
      return { ok: true, id: id };
    }).catch(function () { pend[fid] = { f: f, url: url, at: Date.now() }; return { ok: false }; });
  }
  var dls = {};
  function flushPending() {
    var ks = Object.keys(pend);
    return ks.reduce(function (p, fid) {
      return p.then(function () {
        var x = pend[fid]; delete pend[fid];
        if (Date.now() - x.at > 10 * 60e3) return off({ t: 'gesher-blob-free', fid: fid });
        return save(fid, x.f, x.url).then(function (d) { xfer(fid, { state: d.ok ? 'ok' : 'wait', dl: d.id || null }); });
      });
    }, Promise.resolve()).then(function () { return { ok: true, n: ks.length }; });
  }
  function dropIn(fid, w, tell) {
    var f = inc[fid];
    delete inc[fid];
    off({ t: 'gesher-blob-drop', fid: fid }).catch(function () {});
    chrome.notifications.clear('gesher:fin:' + fid);
    if (!f) return;
    xfer(fid, { state: w === 'cancel' ? 'x' : 'err', why: w });
    if (tell) L.send({ type: 'file-x', fid: fid, why: w });
    if (w !== 'cancel' || tell) chrome.notifications.create('gesher:fx:' + fid, { type: 'basic', iconUrl: 'icon128.png', title: 'הקובץ מהטלפון לא נשמר: ' + f.name, message: why(w) + ' · לא נשאר קובץ חלקי', priority: 0 });
  }
  // חלק שלא הגיע 60 שניות → ההעברה נזרקת (שום דבר לא נכתב לדיסק)
  function sweep() {
    if (sweepT) return;
    sweepT = setInterval(function () {
      var now = Date.now(), any = false;
      Object.keys(inc).forEach(function (k) { if (now - inc[k].last > IDLE) dropIn(k, 'idle', true); else any = true; });
      Object.keys(pend).forEach(function (k) { if (now - pend[k].at > 10 * 60e3) { delete pend[k]; off({ t: 'gesher-blob-free', fid: k }).catch(function () {}); } else any = true; });
      if (!any) { clearInterval(sweepT); sweepT = null; }
    }, 10e3);
  }

  // ---------- יוצא: מחשב → טלפון ----------
  function waitPhone(x) {
    if (L.isPhoneOn()) return Promise.resolve(true);
    xfer(x.fid, { state: 'wait' });
    L.connect();
    var t0 = Date.now();
    return new Promise(function (res) {
      (function poll() {
        if (x.cancel) return res(false);
        if (L.isPhoneOn()) { xfer(x.fid, { state: 'run' }); return res(true); }
        if (Date.now() - t0 > PHONE_WAIT) return res(false);
        setTimeout(poll, 1000);
      })();
    });
  }
  function outStart(meta) {
    var sz = +meta.size || 0;
    if (sz > MAX_SIZE) return Promise.resolve({ ok: false, why: 'size' });
    return L.load().then(function (p) {
      if (!p) return { ok: false, why: 'unpaired' };
      var x = { fid: fidNew(), name: safeName(meta.name), mime: String(meta.mime || 'application/octet-stream').slice(0, 100), size: sz, sha: String(meta.sha || ''), parts: Math.max(1, Math.ceil(sz / CHUNK)), next: 0, cancel: false, waiter: null };
      outs[x.fid] = x;
      xfer(x.fid, { dir: 'out', name: x.name, size: sz, pct: 0, state: 'run' });
      return { ok: true, fid: x.fid, parts: x.parts, chunk: CHUNK };
    });
  }
  function outPart(fid, part, data) {
    var x = outs[fid];
    if (!x || x.cancel) return Promise.resolve({ ok: false, why: 'cancel' });
    if (part !== x.next) return Promise.resolve({ ok: false, why: 'order' });
    var msg = { type: 'file', fid: fid, part: part, parts: x.parts, data: data };
    if (part === 0) { msg.name = x.name; msg.mime = x.mime; msg.size = x.size; msg.sha = x.sha; }
    var t0 = Date.now();
    return new Promise(function (res) {
      var fin = false;
      function done(r) { if (fin) return; fin = true; clearTimeout(x.timer); x.waiter = null; res(r); }
      function go() {
        if (fin) return;
        if (x.cancel) return done({ ok: false, why: 'cancel' });
        if (Date.now() - t0 > PHONE_WAIT + ACK_WAIT) return done({ ok: false, why: 'timeout' });
        waitPhone(x).then(function (on) {
          if (fin) return;
          if (!on) return done({ ok: false, why: x.cancel ? 'cancel' : 'nophone' });
          x.waiter = { part: part, res: done };
          return L.send(msg).then(function (sent) {
            if (fin) return;
            clearTimeout(x.timer);
            x.timer = setTimeout(go, sent ? ACK_WAIT : 2000);   // לא נענה / לא נשלח → שולחים את אותו חלק שוב (הטלפון מתעלם מכפילות)
          });
        }).catch(function () { x.timer = setTimeout(go, 2000); });
      }
      go();
    }).then(function (r) {
      if (!r.ok) { outEnd(x, r.why || 'err', r.why !== 'cancel'); return r; }
      x.next++;
      var pct = Math.round(x.next * 100 / x.parts);
      if (x.next < x.parts) {
        if (x.notif) prog('gesher:fout:' + fid, '📤 שולח לטלפון: ' + x.name, size(x.size) + ' · ' + pct + '%', pct, true);
        if (pct % 5 === 0 || x.next === 1) xfer(fid, { pct: pct });
      } else outEnd(x, '', false);
      return r;
    });
  }
  function outEnd(x, w, tell) {
    delete outs[x.fid];
    clearTimeout(x.timer);
    chrome.notifications.clear('gesher:fout:' + x.fid);
    xfer(x.fid, { pct: w ? undefined : 100, state: w ? (w === 'cancel' ? 'x' : 'err') : 'ok', why: w || '' });
    if (tell) L.send({ type: 'file-x', fid: x.fid, why: w }).catch(function () {});
    if (x.notif && w !== 'cancel') chrome.notifications.create('gesher:foutd:' + x.fid, { type: 'basic', iconUrl: 'icon128.png', priority: 0, title: w ? 'לא נשלח לטלפון: ' + x.name : '📲 נשלח לטלפון: ' + x.name, message: w ? why(w) : size(x.size) + ' · בטלפון: Downloads/Hakelim' });
  }
  function outCancel(fid) {
    var x = outs[fid];
    if (!x) return Promise.resolve({ ok: false });
    x.cancel = true;
    L.send({ type: 'file-x', fid: fid, why: 'cancel' }).catch(function () {});
    if (x.waiter) x.waiter.res({ ok: false, why: 'cancel' });
    else outEnd(x, 'cancel', false);
    return Promise.resolve({ ok: true });
  }
  // שליחת בתים שכבר בזיכרון (תמונה מהלחיצה הימנית) – עם התראת התקדמות
  function sendBytes(u8, name, mime) {
    return crypto.subtle.digest('SHA-256', u8).then(function (d) {
      return outStart({ name: name, mime: mime, size: u8.length, sha: hex(d) });
    }).then(function (s) {
      if (!s.ok) { note('לא נשלח לטלפון', why(s.why)); return s; }
      outs[s.fid].notif = true;
      prog('gesher:fout:' + s.fid, '📤 שולח לטלפון: ' + safeName(name), size(u8.length) + ' · 0%', 0, true);
      var i = 0;
      return (function next() {
        if (i >= s.parts) return { ok: true };
        var part = i++;
        return outPart(s.fid, part, b64(u8.subarray(part * CHUNK, (part + 1) * CHUNK))).then(function (r) { return r.ok ? next() : r; });
      })();
    });
  }
  function note(title, msg) { chrome.notifications.create('gesher:fnote', { type: 'basic', iconUrl: 'icon128.png', priority: 0, title: title, message: msg || ' ' }); }

  // ---------- קישור ----------
  function onLink(o) {
    var url = String(o.url || '');
    L.send({ type: 'ack', id: o.id, ok: /^https?:\/\//i.test(url) });
    if (!/^https?:\/\//i.test(url) || url.length > 4000) return;
    L.copy(url);
    chrome.storage.session.set({ gLinkIn: { url: url, title: String(o.title || '').slice(0, 200), at: Date.now() } });
    chrome.notifications.create('gesher:link', { type: 'basic', iconUrl: 'icon128.png', priority: 1, title: '🔗 קישור מהטלפון' + (o.title ? ': ' + String(o.title).slice(0, 80) : ''), message: url.slice(0, 200) + '\nהועתק ללוח · לחצו לפתיחה', buttons: [{ title: '🌐 לפתוח' }] });
  }
  function sendLink(url, title) {
    return L.load().then(function (p) {
      if (!p) return openPage();
      return L.queueOut({ type: 'link', url: url, title: String(title || '').slice(0, 200) }).then(function () {
        note('🔗 נשלח לטלפון', (title ? title + '\n' : '') + url.slice(0, 150) + (L.isPhoneOn() ? '' : '\nיגיע כשהטלפון יתחבר (פתיחת נעילה)'));
      });
    });
  }
  function sendText(text) {
    text = String(text || '').slice(0, 100 * 1024);
    return L.load().then(function (p) {
      if (!p) return openPage();
      return L.queueOut({ type: 'clip', text: text, at: Date.now(), sens: false }).then(function () {
        note('📋 נשלח ללוח של הטלפון', text.replace(/\s+/g, ' ').slice(0, 90));
      });
    });
  }
  function openPage(hash) { return chrome.tabs.create({ url: chrome.runtime.getURL('gesher/gesher.html') + (hash || '') }); }

  // ---------- לחיצה ימנית: "📲 שלח לטלפון" ----------
  function fromMenu(info, tab) {
    L.load().then(function (p) {
      if (!p) return openPage();
      if (info.selectionText) return sendText(info.selectionText);
      if (info.mediaType === 'image' && info.srcUrl) return sendImage(info.srcUrl, tab);
      if (info.linkUrl) return sendLink(info.linkUrl, info.selectionText || '');
      if (tab && /^https?:/.test(tab.url || '')) return sendLink(tab.url, tab.title);
    }).catch(function () { note('לא נשלח לטלפון', WHY.err); });
  }
  function sendImage(src, tab) {
    return fetch(src, { credentials: 'include' }).then(function (r) {
      if (!r.ok) throw new Error('http');
      var mime = (r.headers.get('content-type') || '').split(';')[0] || 'image/jpeg';
      return r.arrayBuffer().then(function (ab) {
        var name = '';
        try { name = decodeURIComponent(new URL(src).pathname.split('/').pop() || ''); } catch (e) {}
        if (/^data:/.test(src) || !/\.\w{2,5}$/.test(name)) name = 'תמונה-' + new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-') + '.' + ((mime.split('/')[1] || 'jpg').replace('jpeg', 'jpg').replace('svg+xml', 'svg'));
        return sendBytes(new Uint8Array(ab), name, mime);
      });
    }).catch(function () { return sendLink(src, tab && tab.title); });   // אין גישה לתמונה עצמה – שולחים את הקישור אליה
  }

  // ---------- הודעות מהטלפון ----------
  function onMsg(o) {
    if (o.type === 'file') return onFile(o);
    if (o.type === 'link') return onLink(o);
    var fid = String(o.fid || '');
    if (o.type === 'file-ack') {
      var x = outs[fid];
      if (x && x.waiter && x.waiter.part === (o.part | 0)) x.waiter.res({ ok: o.ok !== false, why: o.why || '', done: !!o.done });
      return;
    }
    if (o.type === 'file-x') {
      if (inc[fid]) dropIn(fid, o.why || 'cancel', false);
      if (outs[fid]) { var y = outs[fid]; y.cancel = true; if (y.waiter) y.waiter.res({ ok: false, why: o.why || 'cancel' }); else outEnd(y, o.why || 'cancel', false); }
    }
  }
  function peer(on) { /* ניתוק באמצע: החלק הבא יישלח שוב כשהטלפון יחזור (עד 90 שניות), ובקבלה – sweep זורק אחרי 60 שניות */ }
  function reset() {
    Object.keys(inc).forEach(function (k) { off({ t: 'gesher-blob-drop', fid: k }).catch(function () {}); });
    Object.keys(outs).forEach(function (k) { outs[k].cancel = true; if (outs[k].waiter) outs[k].waiter.res({ ok: false, why: 'cancel' }); });
    inc = {}; outs = {}; pend = {};
  }

  // ---------- התראות ----------
  chrome.notifications.onButtonClicked.addListener(function (id, i) {
    var m = /^gesher:(fin|fout|fdone):(.+)$/.exec(id);
    if (id === 'gesher:link') { chrome.storage.session.get('gLinkIn').then(function (o) { if (o.gLinkIn) chrome.tabs.create({ url: o.gLinkIn.url }); }); chrome.notifications.clear(id); return; }
    if (!m) return;
    if (m[1] === 'fin') return dropIn(m[2], 'cancel', true);
    if (m[1] === 'fout') return outCancel(m[2]);
    chrome.storage.session.get('gXfer').then(function (o) {
      var it = (o.gXfer || []).filter(function (x) { return x.fid === m[2]; })[0];
      if (!it || it.dl == null || !chrome.downloads) return;
      if (i === 0) chrome.downloads.show(it.dl); else chrome.downloads.open ? chrome.downloads.open(it.dl) : chrome.downloads.show(it.dl);
    });
    chrome.notifications.clear(id);
  });
  chrome.notifications.onClicked.addListener(function (id) {
    if (id === 'gesher:link') { chrome.storage.session.get('gLinkIn').then(function (o) { if (o.gLinkIn) chrome.tabs.create({ url: o.gLinkIn.url }); }); chrome.notifications.clear(id); return; }
    var m = /^gesher:fdone:(.+)$/.exec(id);
    if (!m) return;
    chrome.storage.session.get('gXfer').then(function (o) {
      var it = (o.gXfer || []).filter(function (x) { return x.fid === m[1]; })[0];
      if (it && it.dl != null && chrome.downloads) chrome.downloads.show(it.dl); else openPage('#files');
    });
    chrome.notifications.clear(id);
  });

  // ---------- דף הגשר (רק מדפי התוסף עצמו) ----------
  chrome.runtime.onMessage.addListener(function (m, sender, reply) {
    if (!m || typeof m.t !== 'string' || m.t.indexOf('gesher-file-') !== 0) return;
    var own = sender.id === chrome.runtime.id && String(sender.url || '').indexOf(chrome.runtime.getURL('')) === 0;
    if (!own) return;
    var p = null;
    if (m.t === 'gesher-file-start') p = outStart(m);
    else if (m.t === 'gesher-file-part') p = outPart(String(m.fid), m.part | 0, String(m.data || ''));
    else if (m.t === 'gesher-file-cancel') p = outCancel(String(m.fid)).then(function (r) { if (inc[m.fid]) dropIn(String(m.fid), 'cancel', true); return r; });
    else if (m.t === 'gesher-file-flush') p = flushPending();
    else if (m.t === 'gesher-file-show') { if (chrome.downloads) chrome.downloads.show(m.dl); p = Promise.resolve({ ok: true }); }
    else if (m.t === 'gesher-file-link') p = sendLink(String(m.url || ''), m.title).then(function () { return { ok: true }; });
    if (!p) return;
    p.then(reply, function () { reply({ ok: false, why: 'err' }); });
    return true;
  });

  self.GesherFiles = { onMsg: onMsg, peer: peer, reset: reset, fromMenu: fromMenu, sendBytes: sendBytes, sendLink: sendLink, safeName: safeName, CHUNK: CHUNK };
})();
