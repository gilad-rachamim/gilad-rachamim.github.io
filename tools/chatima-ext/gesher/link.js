/* גשר טלפון↔מחשב – החלק שרץ ב-service worker של התוסף.
 * מחזיק חיבור WebSocket לשרת הממסר (ping כל 20 שניות שומר את ה-SW ער, alarm כל דקה מחבר מחדש),
 * פותח את ההודעות המוצפנות מהטלפון, ממלא את הקוד בשדה שפתוח בדף, ותמיד אומר מאיפה הקוד הגיע.
 * נטען מ-background.js אחרי gesher/crypto.js ו-gesher/store.js. הפרוטוקול: tools/gesher-worker/PROTOCOL.md
 * לא כותב שום קוד ללוג ולא שולח שום דבר ל-Analytics.
 */
(function () {
  'use strict';
  var G = self.GesherCrypto, S = self.GesherStore;
  // כמה טלפונים (עד 5): לכל טלפון חדר משלו בשרת, חיבור משלו ודופק משלו. pairs = רשימת הצימודים מ-IndexedDB.
  var pairs = null, C = {};          // C[room] = { ws, pingT, connecting, lastSent, phoneOn, act }
  var MAX_PHONES = 5;
  var CODE_TTL = 10 * 60e3;          // קוד ישן מעשר דקות כבר לא ממלאים
  var FIELD_WAIT = 40e3;             // שדה קוד פתוח 40 שניות בלי קוד -> התראה "עוד לא הגיע"
  var SRC = { sms: 'SMS', whatsapp: 'ווטסאפ', mail: 'מייל', app: 'התראה של אפליקציה' };

  // הרשימה + מעבר חד-פעמי מהגרסה הקודמת (מפתח 'pair' יחיד ו-'lastIn' אחד)
  function loadAll() {
    if (pairs) return Promise.resolve(pairs);
    return S.get('pairs').then(function (a) {
      if (Array.isArray(a)) { pairs = a; return pairs; }
      return S.get('pair').then(function (old) {
        if (!old) { pairs = []; return pairs; }
        return S.get('lastIn').then(function (li) {
          pairs = [old];
          return S.set('pairs', pairs).then(function () { return li ? S.set('lastIn:' + old.room, li) : null; })
            .then(function () { return Promise.all([S.del('pair'), S.del('lastIn')]); }).then(function () { return pairs; });
        });
      });
    });
  }
  function conn(room) { return C[room] || (C[room] = { ws: null, pingT: null, connecting: false, lastSent: '0', phoneOn: false, act: 0 }); }
  function byRoom(room) { return loadAll().then(function (a) { return a.filter(function (p) { return p.room === room; })[0] || null; }); }
  function isOpen(room) { var c = C[room]; return !!(c && c.ws && c.ws.readyState === 1); }
  function anyOn() { return Object.keys(C).some(function (r) { return C[r].phoneOn; }); }
  // הטלפון "הראשי" לשליחה בלי בחירה (קישור/טקסט/קובץ מהתפריט): מחובר עכשיו, ומביניהם זה שהיה פעיל אחרון
  function pickRoom(a) {
    var on = a.filter(function (p) { return C[p.room] && C[p.room].phoneOn; });
    var pool = (on.length ? on : a).slice().sort(function (x, y) { return ((C[y.room] && C[y.room].act) || y.at || 0) - ((C[x.room] && C[x.room].act) || x.at || 0); });
    return pool[0] ? pool[0].room : null;
  }
  function target() { return loadAll().then(pickRoom); }
  // תאימות לקוד הישן: load() = הטלפון הראשי, load(room) = טלפון מסוים
  function load(room) { return loadAll().then(function (a) { var r = room || pickRoom(a); return a.filter(function (p) { return p.room === r; })[0] || null; }); }
  function setState(o) {
    var on = Object.keys(C).some(isOpen);
    return chrome.storage.session.set({ gState: Object.assign({ at: Date.now(), online: on, phone: anyOn() }, o) }).catch(function () {});
  }

  function connect() {
    return loadAll().then(function (a) {
      Object.keys(C).forEach(function (r) { if (!a.some(function (p) { return p.room === r; })) drop(r); });
      a.forEach(connectOne);
    }).catch(function () {});
  }
  function drop(room) {
    var c = C[room]; if (!c) return;
    clearInterval(c.pingT);
    delete C[room];
    try { if (c.ws) c.ws.close(); } catch (e) {}
  }
  function connectOne(p) {
    var c = conn(p.room);
    if (c.connecting || (c.ws && c.ws.readyState <= 1)) return;
    c.connecting = true;
    var s;
    try { s = new WebSocket(p.w.replace(/^http/, 'ws') + '/r/' + p.room + '/ws?tok=' + p.tokPc); } catch (e) { c.connecting = false; return; }
    s.binaryType = 'arraybuffer';
    c.ws = s;
    s.onopen = function () {
      c.connecting = false;
      clearInterval(c.pingT);
      // דופק: ping כל 20 שניות; אם 45 שניות לא חזר pong – החיבור מת בשקט (רשת התחלפה) → סוגרים ומתחברים מחדש
      var lastPong = Date.now();
      s.__pong = function () { lastPong = Date.now(); };
      c.pingT = setInterval(function () {
        if (Date.now() - lastPong > 45e3) { try { s.close(); } catch (e) {} if (c.ws === s) { c.ws = null; c.phoneOn = false; setState({}); } clearInterval(c.pingT); connect(); return; }
        try { s.send('ping'); } catch (e) {}
      }, 20e3);
      setState({});
    };
    s.onmessage = function (e) {
      if (typeof e.data === 'string') {
        if (e.data === 'pong') { if (s.__pong) s.__pong(); return; }
        var m; try { m = JSON.parse(e.data); } catch (x) { return; }
        if (m.t === 'peer') {
          c.phoneOn = !!m.on; if (c.phoneOn) c.act = Date.now();
          setState({});
          if (c.phoneOn) { flushClip(); flushOut(); }
          if (self.GesherFiles) self.GesherFiles.peer(c.phoneOn, p.room);
        }
        return;
      }
      onFrame(p.room, new Uint8Array(e.data));
    };
    s.onclose = function (e) {
      c.connecting = false;
      clearInterval(c.pingT);
      if (c.ws === s) { c.ws = null; c.phoneOn = false; }
      if (C[p.room] !== c) return;   // הצימוד הזה כבר נמחק
      setState({ code: e.code });
      if (e.code === 4003 || e.code === 4001) forget(p.room, 'הטלפון ניתק את החיבור');   // נותק מהצד השני / החדר פג
    };
    s.onerror = function () {};
  }

  // שליחה לטלפון מסוים (room), או לטלפון הראשי כשלא צוין
  function send(obj, room) {
    return (room ? Promise.resolve(room) : target()).then(function (r) {
      if (!r) return false;
      return byRoom(r).then(function (p) {
        var c = C[r];
        if (!p || !c || !c.ws || c.ws.readyState !== 1) return false;
        c.lastSent = G.nextCtr(c.lastSent);
        var w = c.ws;
        return G.seal(p.k12, G.unb64u(p.room), G.DIR_PC_TO_PHONE, c.lastSent, obj).then(function (f) { w.send(f); return true; });
      });
    });
  }

  function onFrame(room, frame) {
    var p;
    byRoom(room).then(function (x) {
      p = x;
      if (!p) throw new Error('gone');
      return S.get('lastIn:' + room);
    }).then(function (last) {
      return G.open(p.k21, G.unb64u(p.room), G.DIR_PHONE_TO_PC, frame, last || null);
    }).then(function (r) {
      S.set('lastIn:' + room, r.ctr);
      conn(room).act = Date.now();
      var o = r.obj || {};
      o._r = room;     // מאיזה טלפון הגיע – כל תשובה חוזרת לאותו טלפון
      if (/^(file|file-ack|file-x|link)$/.test(o.type) && self.GesherFiles) return self.GesherFiles.onMsg(o);   // שלב 4 – gesher/files.js
      if (o.type === 'otp') {
        // קוד כמו "123-456" או "123 456" – מנקים מקפים ורווחים. קוד שעדיין לא תקין מקבל ack (bad) כדי שהטלפון יפסיק לשלוח שוב
        var cc = String(o.code || '').replace(/[\s\-‐-―.]/g, '');
        if (!/^[0-9A-Za-z]{3,12}$/.test(cc)) return send({ type: 'ack', id: o.id, filled: false, bad: true }, room);
        o.code = cc;
        return gotCode(o);
      }
      if (o.type === 'bye') return forget(room, 'הטלפון ניתק את החיבור');
      if (o.type === 'clip' && typeof o.text === 'string') return gotClip(o);
      if (o.type === 'notif') return gotNotif(o);
      if (o.type === 'notif-x' && o.key) return send({ type: 'ack', id: o.id }, room).then(function () { return dropNotif(ikey(room, String(o.key)), false); });
      if (o.type === 'ack' && o.id) return Promise.all([clipAcked(o.id, room), outAcked(o)]);
    }).catch(function () { /* מסגרת לא תקינה / ישנה – מתעלמים בשקט */ });
  }

  // ---------- קוד הגיע ----------
  function gotCode(o) {
    if (o.at && Date.now() - o.at > CODE_TTL) return send({ type: 'ack', id: o.id, filled: false, old: true }, o._r);
    // אותו קוד נשלח שוב (ה-ack הקודם אבד בדרך): רק מאשרים שוב – בלי למלא שוב ובלי התראה כפולה
    return chrome.storage.session.get('gSeen').then(function (x) {
      var seen = (x.gSeen || []).filter(function (e) { return Date.now() - e.at < CODE_TTL; });
      // אותו id, או אותו קוד שכבר הגיע בשתי הדקות האחרונות (למשל SMS + התראת ווטסאפ על אותו קוד)
      var dup = seen.filter(function (e) { return e.id === o.id || (e.code === String(o.code) && Date.now() - e.at < 120e3); })[0];
      if (dup) return send({ type: 'ack', id: o.id, filled: !!dup.filled }, o._r);
      seen.push({ id: o.id, code: String(o.code), at: Date.now(), filled: false });
      return chrome.storage.session.set({ gSeen: seen.slice(-50) }).then(function () { return gotNewCode(o); });
    });
  }
  function markSeen(id, filled) {
    return chrome.storage.session.get('gSeen').then(function (x) {
      var seen = x.gSeen || [];
      seen.forEach(function (e) { if (e.id === id) e.filled = filled; });
      return chrome.storage.session.set({ gSeen: seen });
    }).catch(function () {});
  }
  function gotNewCode(o) {
    var c = { code: String(o.code), src: o.src || 'app', from: o.from || '', app: o.app || '', at: o.at || Date.now(), id: o.id };
    return chrome.storage.session.set({ gLast: c }).then(function () {
      chrome.action.setBadgeBackgroundColor({ color: '#2e7d32' });
      chrome.action.setBadgeText({ text: '🔑' });
      setTimeout(function () { chrome.action.getBadgeText({}).then(function (t) { if (t === '🔑') chrome.action.setBadgeText({ text: '' }); }); }, 60e3);
      return opts();
    }).then(function (op) {
      if (op.copy) copy(c.code);
      return fillSomewhere(c.code);
    }).then(function (res) {
      c.filled = !!res.filled;
      chrome.storage.session.set({ gLast: c });
      notify(c, res);
      markSeen(c.id, !!res.filled);
      send({ type: 'ack', id: c.id, filled: !!res.filled }, o._r);
    });
  }
  function opts() { return chrome.storage.local.get('gesherOpts').then(function (o) { return Object.assign({ copy: true, clipIn: true, clipOut: true, pause: false, notif: true, dnd: false, dndHours: false, dndFrom: '22:00', dndTo: '07:00' }, o.gesherOpts || {}); }); }
  function srcLine(c) {
    var s = 'הגיע ב' + (c.src === 'app' ? 'התראה' : '-' + (SRC[c.src] || c.src));
    if (c.from) s += ' מ' + (/^[֐-׿]/.test(c.from) ? '' : '-') + c.from;
    return s;
  }
  function notify(c, res) {
    var msg = srcLine(c) + (res.filled ? ' · הוזן בשדה' + (res.host ? ' ב-' + res.host : '') : ' · לחצו כאן כדי להזין אותו בדף הפתוח');
    chrome.notifications.create('gesher:code', {
      type: 'basic', iconUrl: 'icon128.png', title: 'קוד ' + c.code, message: msg, priority: 2,
      buttons: res.filled ? [{ title: 'להעתיק' }] : [{ title: 'להזין בדף' }, { title: 'להעתיק' }]
    });
  }

  // ממלאים בכרטיסייה שדיווחה על שדה קוד פתוח; אם אין – בכרטיסייה הפעילה.
  function fillSomewhere(code) {
    return chrome.storage.session.get('gField').then(function (o) {
      var f = o.gField;
      var tabP = f && Date.now() - f.at < 15 * 60e3 ? chrome.tabs.get(f.tab).catch(function () { return null; }) : Promise.resolve(null);
      return tabP.then(function (t) { return t || activeTab(); });
    }).then(function (tab) {
      if (!tab || !/^https?:/.test(tab.url || '')) return { filled: false };
      return fillTab(tab, code);
    }).catch(function () { return { filled: false }; });
  }
  // הכרטיסייה הפעילה בחלון האחרון שהיה בפוקוס; אם אין כזה – הכרטיסייה הפעילה בחלון כלשהו (עדיפות לאתר)
  function activeTab() {
    return chrome.tabs.query({ active: true, lastFocusedWindow: true }).then(function (a) {
      if (a[0] && /^https?:/.test(a[0].url || '')) return a[0];
      return chrome.tabs.query({ active: true }).then(function (all) {
        return all.filter(function (t) { return /^https?:/.test(t.url || ''); }).sort(function (x, y) { return (y.lastAccessed || 0) - (x.lastAccessed || 0); })[0] || a[0] || null;
      });
    });
  }
  function fillTab(tab, code) {
    return chrome.scripting.executeScript({ target: { tabId: tab.id, allFrames: true }, func: gesherFill, args: [code] }).then(function (rs) {
      var hit = (rs || []).map(function (r) { return r.result; }).filter(function (r) { return r && r.filled; })[0];
      var host = ''; try { host = new URL(tab.url).hostname.replace(/^www\./, ''); } catch (e) {}
      return hit ? { filled: true, host: host } : { filled: false };
    }).catch(function () { return { filled: false }; });
  }

  // רץ בתוך הדף (executeScript) – חייב להיות עצמאי לגמרי
  function gesherFill(code) {
    var RX = /one.?time|otp|code|pin|verif|token|2fa|mfa|sms|קוד|אימות|סיסמה חד|סיסמא חד/i;
    var NO = /search|query|^q$|chat|message|comment|email|e-mail|user|login|phone|tel|card|cvv|cvc|amount|zip|postal|חיפוש|הודעה|טלפון|מייל|כרטיס/i;
    function visible(el) { var r = el.getBoundingClientRect(); var s = getComputedStyle(el); return r.width > 4 && r.height > 4 && s.visibility !== 'hidden' && s.display !== 'none'; }
    function ok(el) {
      if (!(el instanceof HTMLInputElement) || el.disabled || el.readOnly) return false;
      var t = (el.type || 'text').toLowerCase();
      return (t === 'text' || t === 'tel' || t === 'number' || t === '') && visible(el);
    }
    function words(el) {
      var w = [el.name, el.id, el.placeholder, el.getAttribute('aria-label'), el.autocomplete, el.className].join(' ');
      if (el.labels) for (var i = 0; i < el.labels.length; i++) w += ' ' + el.labels[i].textContent;
      return w;
    }
    function score(el) {
      var w = words(el), s = 0;
      if ((el.autocomplete || '').indexOf('one-time-code') >= 0) s += 100;
      if (RX.test(w)) s += 50;
      if (NO.test(w) && s < 100) return -1;
      var ml = el.maxLength;
      if (ml >= 4 && ml <= 10) s += 20;
      if (/numeric|decimal/.test(el.inputMode || '')) s += 10;
      return s;
    }
    function setVal(el, v) {
      var set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      el.focus();
      set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
    var all = Array.prototype.filter.call(document.querySelectorAll('input'), ok);
    // תיבות של תו אחד (4–10 תיבות ליד אחת השנייה)
    var singles = all.filter(function (el) { return el.maxLength === 1 && score(el) >= 0; });
    if (singles.length >= 4) {
      var groups = new Map();
      singles.forEach(function (el) {
        var p = el.parentElement, k = p && p.parentElement && el.parentElement.children.length === 1 ? p.parentElement : p;
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(el);
      });
      var best = null;
      groups.forEach(function (g) { if (g.length >= 4 && g.length <= 10 && g.length >= code.length && (!best || g.length > best.length)) best = g; });
      if (best && best.length === code.length) {
        for (var i = 0; i < code.length; i++) setVal(best[i], code[i]);
        best[code.length - 1].blur && best[code.length - 1].focus();
        return { filled: true, how: 'boxes' };
      }
    }
    var cand = all.filter(function (el) { return el.maxLength !== 1; }).map(function (el) { return { el: el, s: score(el) }; }).filter(function (x) { return x.s >= 0; });
    var act = document.activeElement;
    var a = cand.filter(function (x) { return x.el === act && x.s >= 20; })[0];
    var top = cand.filter(function (x) { return x.s >= 50; }).sort(function (x, y) { return y.s - x.s; })[0];
    var pick = a || top;
    if (!pick) return { filled: false };
    if (pick.el.maxLength > 0 && pick.el.maxLength < code.length) return { filled: false };
    setVal(pick.el, code);
    return { filled: true, how: 'field' };
  }

  // ---------- לוח ----------
  function offscreen() {
    if (!chrome.offscreen) return Promise.reject(new Error('no offscreen'));
    return chrome.offscreen.hasDocument().then(function (h) {
      return h ? null : chrome.offscreen.createDocument({ url: 'gesher/offscreen.html', reasons: ['CLIPBOARD', 'BLOBS'], justification: 'לוח משותף עם הטלפון: כתיבה ללוח של טקסט שהגיע מהטלפון, וזיהוי העתקה במחשב כשהמשתמש הדליק את זה. קבצים מהטלפון: חיבור החלקים בזיכרון לקובץ אחד לפני השמירה' });
    }).catch(function (e) { if (!/single offscreen|already/i.test(String(e && e.message))) throw e; });
  }
  function copy(text) {
    rememberClip(text);
    return chrome.permissions.contains({ permissions: ['clipboardWrite'] }).then(function (has) {
      if (!has) return false;
      return offscreen().then(function () { return chrome.runtime.sendMessage({ t: 'gesher-copy', text: text }); }).then(function () { return true; });
    }).catch(function () { return false; });
  }

  // ---------- לוח משותף (clip) ----------
  var CLIP_MAX = 100 * 1024, CLIP_TTL = 10 * 60e3;
  function hash(t) { var h = 2166136261; for (var i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36) + ':' + t.length; }
  function rememberClip(t) { return chrome.storage.session.set({ gClipHash: hash(String(t || '')) }).catch(function () {}); }
  function preview(t) { t = t.replace(/\s+/g, ' ').trim(); return t.length > 90 ? t.slice(0, 88) + '…' : t; }
  function looksSecret(t) { return t.length <= 40 && !/\s/.test(t) && (/^\d{4,10}$/.test(t) || (/[A-Za-z]/.test(t) && /\d/.test(t) && /[^A-Za-z0-9]/.test(t))); }

  // טלפון -> מחשב: נכתב ללוח של Windows + התראה קטנה
  function gotClip(o) {
    var text = o.text.slice(0, CLIP_MAX);
    return opts().then(function (op) {
      if (op.pause || !op.clipIn) return send({ type: 'ack', id: o.id, paused: true }, o._r);
      return copy(text).then(function (ok) {
        chrome.storage.session.set({ gClip: { dir: 'in', at: Date.now(), len: text.length, ok: ok } });
        chrome.notifications.create('gesher:clip', {
          type: 'basic', iconUrl: 'icon128.png', priority: 0, silent: true,
          title: ok ? '📋 הועתק מהטלפון' : 'הגיע טקסט מהטלפון – אין הרשאת לוח',
          message: o.sens ? '(טקסט רגיש – לא מוצג)' : (preview(text) || ' ')
        });
        setTimeout(function () { chrome.notifications.clear('gesher:clip'); }, 6000);
        return send({ type: 'ack', id: o.id, ok: ok }, o._r);
      });
    });
  }

  // מחשב -> טלפון: העתקה במחשב (זוהתה ב-offscreen). שולחים רק את האחרון, לכל הטלפונים המצומדים;
  // טלפון שלא מחובר מקבל כשיתחבר (עד 10 דקות). rooms = הטלפונים שעוד לא אישרו.
  function localClip(text) {
    if (!text || text.length > CLIP_MAX) return Promise.resolve();
    return Promise.all([opts(), chrome.storage.session.get('gClipHash'), loadAll()]).then(function (r) {
      var op = r[0];
      if (!r[2].length || op.pause || !op.clipOut) return;
      if (r[1].gClipHash === hash(text)) return;            // זה בדיוק מה שהגיע מהטלפון – לא מחזירים (מניעת לולאה)
      rememberClip(text);
      var out = { type: 'clip', id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), text: text, at: Date.now(), sens: looksSecret(text), rooms: r[2].map(function (p) { return p.room; }) };
      return chrome.storage.session.set({ gClipOut: out, gClip: { dir: 'out', at: out.at, len: text.length, sent: false } }).then(flushClip);
    });
  }
  function flushClip() {
    return chrome.storage.session.get('gClipOut').then(function (o) {
      var c = o.gClipOut;
      if (!c) return;
      if (Date.now() - c.at > CLIP_TTL) return chrome.storage.session.remove('gClipOut');
      var msg = { type: 'clip', id: c.id, text: c.text, at: c.at, sens: c.sens };
      var left = c.rooms || [];
      if (left.some(function (r) { return !(C[r] && C[r].phoneOn); })) connect();
      return Promise.all(left.filter(function (r) { return C[r] && C[r].phoneOn; }).map(function (r) { return send(msg, r); }));
    }).catch(function () {});
  }
  // אישורים משני טלפונים יכולים להגיע באותו רגע – בתור, אחד אחרי השני (אחרת אחד דורס את השני והטלפון מקבל שוב)
  var clipQ = Promise.resolve();
  function clipAcked(id, room) {
    clipQ = clipQ.then(function () {
      return chrome.storage.session.get(['gClipOut', 'gClip']).then(function (o) {
        if (!o.gClipOut || o.gClipOut.id !== id) return;
        var left = (o.gClipOut.rooms || []).filter(function (r) { return r !== room; });
        return Promise.all([
          left.length ? chrome.storage.session.set({ gClipOut: Object.assign({}, o.gClipOut, { rooms: left }) }) : chrome.storage.session.remove('gClipOut'),
          chrome.storage.session.set({ gClip: Object.assign({}, o.gClip, { sent: true, at: Date.now() }) })
        ]);
      });
    }).catch(function () {});
    return clipQ;
  }
  // מדליק/מכבה את הבדיקה של הלוח במחשב לפי המתגים וההרשאה
  function syncClipWatch() {
    return Promise.all([loadAll(), opts(), chrome.permissions.contains({ permissions: ['clipboardRead'] })]).then(function (r) {
      var on = r[0].length > 0 && r[1].clipOut && !r[1].pause && r[2];
      if (!on) return chrome.offscreen && chrome.offscreen.hasDocument().then(function (h) { if (h) return chrome.runtime.sendMessage({ t: 'gesher-clip-watch', on: false }); });
      return offscreen().then(function () { return chrome.runtime.sendMessage({ t: 'gesher-clip-watch', on: true }); });
    }).catch(function () {});
  }

  // ---------- הודעות מהטלפון (notif) ----------
  // הרשימה נשמרת רק ב-chrome.storage.session (בזיכרון, נמחקת כשכרום נסגר), 50 אחרונות. שום תוכן לא נכתב ללוג.
  var NOTIF_MAX = 50, OUT_TTL = 10 * 60e3;
  function nid(key) { return 'gn:' + hash(String(key)); }
  function ikey(room, k) { return String(room).slice(0, 8) + '|' + k; }   // שני טלפונים יכולים לשלוח אותו מפתח
  function notifs() { return chrome.storage.session.get('gNotifs').then(function (o) { return o.gNotifs || []; }); }
  function saveNotifs(a) { return chrome.storage.session.set({ gNotifs: a.slice(0, NOTIF_MAX) }).then(badge); }
  function badge() {
    return notifs().then(function (a) {
      var n = a.filter(function (x) { return !x.seen; }).length;
      return chrome.action.getBadgeText({}).then(function (t) {
        if (t === '🔑') return;
        chrome.action.setBadgeBackgroundColor({ color: '#1565c0' });
        chrome.action.setBadgeText({ text: n ? String(Math.min(n, 99)) : '' });
      });
    }).catch(function () {});
  }
  function hhmm(s) { var m = /^(\d{1,2}):(\d{2})$/.exec(s || ''); return m ? +m[1] * 60 + +m[2] : null; }
  function quiet(op) {
    if (op.dnd) return true;
    if (!op.dndHours) return false;
    var a = hhmm(op.dndFrom), b = hhmm(op.dndTo);
    if (a === null || b === null || a === b) return false;
    var d = new Date(), now = d.getHours() * 60 + d.getMinutes();
    return a < b ? now >= a && now < b : now >= a || now < b;
  }
  function gotNotif(o) {
    var okey = String(o.key || o.id);
    var item = {
      key: ikey(o._r, okey), okey: okey, room: o._r, id: o.id, pkg: String(o.pkg || ''), app: String(o.app || 'הטלפון').slice(0, 60),
      title: String(o.title || '').slice(0, 200), text: String(o.text || '').slice(0, 4000),
      icon: /^data:image\/png;base64,[A-Za-z0-9+/=]{10,40000}$/.test(o.icon || '') ? o.icon : '',
      reply: !!o.reply, at: o.at || Date.now(), got: Date.now()
    };
    return send({ type: 'ack', id: o.id }, o._r).then(function () {
      return Promise.all([notifs(), opts(), loadAll()]);
    }).then(function (r) {
      // כמה טלפונים: מציינים מאיזה טלפון ההתראה
      if (r[2].length > 1) { var pp = r[2].filter(function (p) { return p.room === o._r; })[0]; item.dev = pp ? String(pp.name || 'טלפון').slice(0, 40) : ''; }
      // אותה התראה בדיוק כבר הגיעה מצימוד אחר (אותו טלפון צומד פעמיים) – מעדכנים בשקט, בלי קפיצה כפולה
      var twin = r[0].some(function (x) { return x.room !== item.room && x.okey === okey && x.title === item.title && x.text === item.text; });
      var a = r[0].filter(function (x) { return x.key !== item.key; });
      a.unshift(item);
      return saveNotifs(a).then(function () {
        if (twin || !r[1].notif || quiet(r[1])) return;
        var btns = item.reply ? [{ title: '↩ לענות' }, { title: '📋 להעתיק' }] : [{ title: '📋 להעתיק' }];
        chrome.notifications.create(nid(item.key), {
          type: 'basic', iconUrl: item.icon || 'icon128.png', priority: 1,
          title: item.title || item.app, message: item.text || ' ', contextMessage: '📲 ' + item.app + (item.dev ? ' · ' + item.dev : ''), buttons: btns
        });
      });
    });
  }
  // fromPc=true: נסגרה במחשב → לסגור גם בטלפון. false: נסגרה בטלפון → רק להעלים מהמחשב.
  function dropNotif(key, fromPc) {
    chrome.notifications.clear(nid(key));
    return notifs().then(function (a) {
      var it = a.filter(function (x) { return x.key === key; })[0];
      return saveNotifs(a.filter(function (x) { return x.key !== key; })).then(function () {
        if (fromPc && it) return queueOut({ type: 'notif-x', key: it.okey || it.key, room: it.room, ikey: key });
      });
    });
  }
  // מחשב → טלפון (סגירה / מענה): תור קטן ב-session עד שהטלפון מאשר, עד 10 דקות
  function queueOut(m) {
    m.id = 'o' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    m.at = Date.now();
    return (m.room ? Promise.resolve(m.room) : target()).then(function (r) {
      m.room = r;
      return chrome.storage.session.get('gOut');
    }).then(function (o) {
      var q = (o.gOut || []).filter(function (x) { return Date.now() - x.at < OUT_TTL; });
      q.push(m);
      return chrome.storage.session.set({ gOut: q.slice(-30) });
    }).then(flushOut).then(function () { return m.id; });
  }
  function flushOut() {
    return chrome.storage.session.get('gOut').then(function (o) {
      var q = (o.gOut || []).filter(function (x) { return Date.now() - x.at < OUT_TTL; });
      if (!q.length) return;
      if (q.some(function (m) { return !(C[m.room] && C[m.room].phoneOn); })) connect();
      return q.filter(function (m) { return C[m.room] && C[m.room].phoneOn; }).reduce(function (p, m) {
        var w = Object.assign({}, m); delete w.room; delete w.ikey;
        return p.then(function () { return send(w, m.room); });
      }, Promise.resolve());
    }).catch(function () {});
  }
  function outAcked(a) {
    return chrome.storage.session.get(['gOut', 'gReplies']).then(function (o) {
      var q = o.gOut || [], m = q.filter(function (x) { return x.id === a.id; })[0];
      if (!m) return;
      chrome.storage.session.set({ gOut: q.filter(function (x) { return x.id !== a.id; }) });
      if (m.type !== 'notif-reply') return;
      var k = m.ikey || m.key;
      var r = o.gReplies || {};
      r[k] = { ok: a.ok !== false, why: a.why || '', at: Date.now() };
      chrome.storage.session.set({ gReplies: r });
      if (a.ok !== false) return notifs().then(function (list) {
        list.forEach(function (x) { if (x.key === k) { x.seen = true; x.replied = (x.replied || []).concat([m.text]).slice(-5); } });
        return saveNotifs(list);
      });
    });
  }
  function replyNotif(key, text) {
    text = String(text || '').trim();
    if (!text || !key) return Promise.resolve({ ok: false });
    return chrome.storage.session.get('gReplies').then(function (o) {
      var r = o.gReplies || {};
      r[key] = { pending: true, at: Date.now() };
      return chrome.storage.session.set({ gReplies: r });
    }).then(function () { return notifs(); }).then(function (a) {
      var it = a.filter(function (x) { return x.key === key; })[0];
      var room = it && it.room;
      return queueOut({ type: 'notif-reply', key: it ? it.okey || it.key : key, room: room, ikey: key, text: text.slice(0, 4000) })
        .then(function () { return { ok: true, online: room ? !!(C[room] && C[room].phoneOn) : anyOn() }; });
    });
  }
  function openReply(key) {
    var base = chrome.runtime.getURL('gesher/gesher.html');
    var url = base + '?reply=' + encodeURIComponent(key) + '#inbox';
    return chrome.tabs.query({ url: base + '*' }).then(function (t) {
      if (t[0]) return chrome.tabs.update(t[0].id, { url: url, active: true }).then(function () { chrome.windows.update(t[0].windowId, { focused: true }); });
      return chrome.tabs.create({ url: url });
    });
  }
  function keyOf(id) {
    return notifs().then(function (a) { return a.filter(function (x) { return nid(x.key) === id; })[0] || null; });
  }

  // ---------- ניתוק ----------
  // ניתוק טלפון אחד (room). כשלא נשאר אף טלפון – מוחקים הכול כמו קודם.
  function forget(room, why) {
    var gone = null;
    return loadAll().then(function (a) {
      gone = a.filter(function (p) { return p.room === room; })[0] || null;
      pairs = a.filter(function (p) { return p.room !== room; });
      drop(room);
      if (self.GesherFiles) self.GesherFiles.reset(pairs.length ? room : undefined);
      if (!pairs.length) {
        chrome.storage.session.remove(['gLast', 'gSeen', 'gField', 'gClip', 'gClipOut', 'gNotifs', 'gOut', 'gReplies', 'gXfer']);
        setState({ online: false, phone: false, unpaired: true });
        return S.clear();
      }
      setState({});
      return Promise.all([S.set('pairs', pairs), S.del('lastIn:' + room),
        notifs().then(function (n) { n.filter(function (x) { return x.room === room; }).forEach(function (x) { chrome.notifications.clear(nid(x.key)); }); return saveNotifs(n.filter(function (x) { return x.room !== room; })); }),
        chrome.storage.session.get(['gOut', 'gClipOut']).then(function (o) {
          var w = { gOut: (o.gOut || []).filter(function (m) { return m.room !== room; }) };
          if (o.gClipOut) w.gClipOut = Object.assign({}, o.gClipOut, { rooms: (o.gClipOut.rooms || []).filter(function (r) { return r !== room; }) });
          return chrome.storage.session.set(w);
        })]);
    }).then(function () {
      badge();
      if (why && gone) chrome.notifications.create('gesher:off', { type: 'basic', iconUrl: 'icon128.png', title: 'הגשר לטלפון נותק', message: (pairs.length ? '«' + (gone.name || 'טלפון') + '» – ' : '') + why });
      return gone;
    });
  }
  // room = טלפון אחד; בלי room – כל הטלפונים
  function unpair(room) {
    return loadAll().then(function (a) {
      var list = a.filter(function (p) { return !room || p.room === room; });
      return list.reduce(function (pr, p) {
        return pr.then(function () {
          return send({ type: 'bye' }, p.room).catch(function () {}).then(function () {
            return fetch(p.w + '/r/' + p.room + '?tok=' + p.tokPc, { method: 'DELETE' }).catch(function () {});
          }).then(function () { return forget(p.room, ''); });
        });
      }, Promise.resolve());
    });
  }

  // ---------- שדה קוד פתוח ----------
  var fieldT = null;
  function fieldOpen(tab) {
    loadAll().then(function (a) {
      if (!a.length) return;
      chrome.storage.session.set({ gField: { tab: tab.id, at: Date.now() } });
      connect();
      clearTimeout(fieldT);
      fieldT = setTimeout(function () {
        chrome.storage.session.get(['gField', 'gLast']).then(function (o) {
          if (!o.gField || o.gField.tab !== tab.id) return;
          if (o.gLast && Date.now() - o.gLast.at < FIELD_WAIT + 5e3) return;
          chrome.notifications.create('gesher:wait', {
            type: 'basic', iconUrl: 'icon128.png', priority: 1,
            title: 'עוד לא הגיע קוד מהטלפון',
            message: 'הטלפון בודק: SMS, ווטסאפ, מייל והתראות. אם הקוד הגיע בדרך אחרת – אפשר להדביק אותו ידנית.'
          });
        });
      }, FIELD_WAIT);
    });
  }

  // ---------- חיבורים לתוסף ----------
  chrome.runtime.onMessage.addListener(function (m, sender, reply) {
    if (!m || typeof m.t !== 'string' || m.t.indexOf('gesher-') !== 0) return;
    var own = sender.id === chrome.runtime.id && String(sender.url || '').indexOf(chrome.runtime.getURL('')) === 0;
    if (m.t === 'gesher-field' && sender.tab && !own) {
      if (m.open) fieldOpen(sender.tab);
      else chrome.storage.session.get('gField').then(function (o) { if (o.gField && o.gField.tab === sender.tab.id) { clearTimeout(fieldT); chrome.storage.session.remove('gField'); } });
      return;
    }
    if (!own) return;   // שאר הפקודות רק מדפי התוסף עצמו (דף הגשר פתוח בכרטיסייה, לכן לא בודקים sender.tab)
    if (m.t === 'gesher-paired') { pairs = null; connect().then(function () { reply({ ok: true }); }); syncWatch(); syncClipWatch(); return true; }
    if (m.t === 'gesher-unpair') { unpair(m.room ? String(m.room) : undefined).then(function () { reply({ ok: true }); syncWatch(); syncClipWatch(); }); return true; }
    if (m.t === 'gesher-state') {
      Promise.all([loadAll(), chrome.storage.session.get(['gState', 'gLast', 'gClip'])]).then(function (r) {
        var a = r[0], main = pickRoom(a);
        var phones = a.map(function (p) { return { room: p.room, name: p.name, since: p.at, online: isOpen(p.room), phone: !!(C[p.room] && C[p.room].phoneOn), main: p.room === main }; });
        var f = phones.filter(function (x) { return x.main; })[0] || phones[0] || {};
        reply({ paired: phones.length > 0, phones: phones, max: MAX_PHONES, name: f.name, since: f.since, online: phones.some(function (x) { return x.online; }), phone: phones.some(function (x) { return x.phone; }), state: r[1].gState || {}, last: r[1].gLast || null, clip: r[1].gClip || null });
      });
      connect();
      return true;
    }
    if (m.t === 'gesher-fill-last') { typeLast().then(reply); return true; }
    if (m.t === 'gesher-clip-local') { localClip(String(m.text || '')); return; }
    if (m.t === 'gesher-clip-sync') { syncClipWatch().then(function () { reply({ ok: true }); }); return true; }
    if (m.t === 'gesher-ntf-reply') { replyNotif(String(m.key || ''), m.text).then(reply); return true; }
    if (m.t === 'gesher-ntf-dismiss') { dropNotif(String(m.key || ''), true).then(function () { reply({ ok: true }); }); return true; }
    if (m.t === 'gesher-ntf-seen') { notifs().then(function (a) { a.forEach(function (x) { x.seen = true; }); return saveNotifs(a); }).then(function () { reply({ ok: true }); }); return true; }
  });

  function typeLast() {
    return chrome.storage.session.get('gLast').then(function (o) {
      var c = o.gLast;
      if (!c || Date.now() - c.at > CODE_TTL) return { filled: false, none: true };
      return activeTab().then(function (t) { return t ? fillTab(t, c.code) : { filled: false }; });
    });
  }

  chrome.notifications.onClicked.addListener(function (id) {
    if (id === 'gesher:code') { typeLast(); chrome.notifications.clear(id); }
    if (id.indexOf('gn:') === 0) keyOf(id).then(function (x) { if (x) openReply(x.key); });
  });
  // סגירה ביד של התראה מהטלפון (X) → נסגרת גם בטלפון
  chrome.notifications.onClosed.addListener(function (id, byUser) {
    if (!byUser || id.indexOf('gn:') !== 0) return;
    keyOf(id).then(function (x) { if (x) dropNotif(x.key, true); });
  });
  chrome.notifications.onButtonClicked.addListener(function (id, i) {
    if (id.indexOf('gn:') === 0) {
      keyOf(id).then(function (x) {
        if (!x) return;
        if (x.reply && i === 0) return openReply(x.key);
        copy((x.title ? x.title + ': ' : '') + x.text);
      });
      return;
    }
    if (id !== 'gesher:code') return;
    chrome.storage.session.get('gLast').then(function (o) {
      if (!o.gLast) return;
      // כשהקוד כבר הוזן יש רק כפתור אחד – "להעתיק"
      chrome.notifications.clear(id);
      if (i === 0 && !o.gLast.filled) typeLast(); else copy(o.gLast.code);
    });
  });
  chrome.commands.onCommand.addListener(function (cmd) { if (cmd === 'gesher-type-code') typeLast(); });

  // סקריפט הזיהוי של שדות קוד – רק כשיש צימוד ויש הרשאה לכל האתרים
  function syncWatch() {
    return Promise.all([loadAll(), chrome.permissions.contains({ origins: ['<all_urls>'] })]).then(function (r) {
      var on = r[0].length > 0 && r[1];
      return chrome.scripting.getRegisteredContentScripts({ ids: ['hk-gesher'] }).then(function (have) {
        if (!on) return have.length ? chrome.scripting.unregisterContentScripts({ ids: ['hk-gesher'] }) : null;
        var spec = { id: 'hk-gesher', matches: ['<all_urls>'], excludeMatches: ['https://hakelim.com/*'], js: ['gesher/watch.js'], runAt: 'document_idle', allFrames: true, persistAcrossSessions: true };
        return have.length ? chrome.scripting.updateContentScripts([spec]) : chrome.scripting.registerContentScripts([spec]);
      });
    }).catch(function () {});
  }

  chrome.alarms.get('gesher', function (a) { if (!a) chrome.alarms.create('gesher', { periodInMinutes: 1 }); });
  chrome.alarms.onAlarm.addListener(function (a) { if (a.name === 'gesher') { connect(); syncClipWatch(); flushClip(); flushOut(); } });
  chrome.runtime.onStartup.addListener(function () { connect(); syncWatch(); syncClipWatch(); });
  chrome.runtime.onInstalled.addListener(function () { connect(); syncWatch(); syncClipWatch(); });
  chrome.permissions.onAdded.addListener(function () { syncWatch(); syncClipWatch(); });
  chrome.permissions.onRemoved.addListener(function () { syncWatch(); syncClipWatch(); });
  chrome.storage.onChanged.addListener(function (c, area) { if (area === 'local' && c.gesherOpts) syncClipWatch(); });
  connect();
  syncClipWatch();

  self.Gesher = { send: send, load: load, offscreen: offscreen, copy: copy, opts: opts, queueOut: queueOut, isPhoneOn: function (room) { return room ? !!(C[room] && C[room].phoneOn) : anyOn(); }, target: target, loadAll: loadAll, connect: connect, unpair: unpair, typeLast: typeLast, gesherFill: gesherFill, localClip: localClip, hash: hash, quiet: quiet, replyNotif: replyNotif, dropNotif: dropNotif };
})();
