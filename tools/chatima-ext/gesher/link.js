/* גשר טלפון↔מחשב – החלק שרץ ב-service worker של התוסף.
 * מחזיק חיבור WebSocket לשרת הממסר (ping כל 20 שניות שומר את ה-SW ער, alarm כל דקה מחבר מחדש),
 * פותח את ההודעות המוצפנות מהטלפון, ממלא את הקוד בשדה שפתוח בדף, ותמיד אומר מאיפה הקוד הגיע.
 * נטען מ-background.js אחרי gesher/crypto.js ו-gesher/store.js. הפרוטוקול: tools/gesher-worker/PROTOCOL.md
 * לא כותב שום קוד ללוג ולא שולח שום דבר ל-Analytics.
 */
(function () {
  'use strict';
  var G = self.GesherCrypto, S = self.GesherStore;
  var ws = null, pingT = null, pair = null, connecting = false, lastSent = '0', phoneOn = false;
  var CODE_TTL = 10 * 60e3;          // קוד ישן מעשר דקות כבר לא ממלאים
  var FIELD_WAIT = 40e3;             // שדה קוד פתוח 40 שניות בלי קוד -> התראה "עוד לא הגיע"
  var SRC = { sms: 'SMS', whatsapp: 'ווטסאפ', mail: 'מייל', app: 'התראה של אפליקציה' };

  function load() {
    if (pair) return Promise.resolve(pair);
    return S.get('pair').then(function (p) { pair = p || null; return pair; });
  }
  function setState(o) { return chrome.storage.session.set({ gState: Object.assign({ at: Date.now() }, o) }).catch(function () {}); }

  function connect() {
    if (connecting || (ws && ws.readyState <= 1)) return Promise.resolve();
    connecting = true;
    return load().then(function (p) {
      if (!p) { connecting = false; return; }
      var url = p.w.replace(/^http/, 'ws') + '/r/' + p.room + '/ws?tok=' + p.tokPc;
      var s = new WebSocket(url);
      s.binaryType = 'arraybuffer';
      ws = s;
      s.onopen = function () {
        connecting = false;
        clearInterval(pingT);
        pingT = setInterval(function () { try { s.send('ping'); } catch (e) {} }, 20e3);
        setState({ online: true });
      };
      s.onmessage = function (e) {
        if (typeof e.data === 'string') {
          if (e.data === 'pong') return;
          var m; try { m = JSON.parse(e.data); } catch (x) { return; }
          if (m.t === 'peer') { phoneOn = !!m.on; setState({ online: true, phone: phoneOn }); if (phoneOn) { flushClip(); flushOut(); } }
          return;
        }
        onFrame(new Uint8Array(e.data));
      };
      s.onclose = function (e) {
        connecting = false;
        clearInterval(pingT);
        if (ws === s) { ws = null; phoneOn = false; }
        setState({ online: false, code: e.code });
        if (e.code === 4003 || e.code === 4001) forget('הטלפון ניתק את החיבור');   // נותק מהצד השני / החדר פג
      };
      s.onerror = function () {};
    }).catch(function () { connecting = false; });
  }

  function send(obj) {
    return load().then(function (p) {
      if (!p || !ws || ws.readyState !== 1) return false;
      lastSent = G.nextCtr(lastSent);
      return G.seal(p.k12, G.unb64u(p.room), G.DIR_PC_TO_PHONE, lastSent, obj).then(function (f) { ws.send(f); return true; });
    });
  }

  function onFrame(frame) {
    var p;
    load().then(function (x) {
      p = x;
      return S.get('lastIn');
    }).then(function (last) {
      return G.open(p.k21, G.unb64u(p.room), G.DIR_PHONE_TO_PC, frame, last || null);
    }).then(function (r) {
      S.set('lastIn', r.ctr);
      var o = r.obj || {};
      if (o.type === 'otp' && /^[0-9A-Za-z]{3,10}$/.test(String(o.code || ''))) return gotCode(o);
      if (o.type === 'bye') return forget('הטלפון ניתק את החיבור');
      if (o.type === 'clip' && typeof o.text === 'string') return gotClip(o);
      if (o.type === 'notif') return gotNotif(o);
      if (o.type === 'notif-x' && o.key) return send({ type: 'ack', id: o.id }).then(function () { return dropNotif(String(o.key), false); });
      if (o.type === 'ack' && o.id) return Promise.all([clipAcked(o.id), outAcked(o)]);
    }).catch(function () { /* מסגרת לא תקינה / ישנה – מתעלמים בשקט */ });
  }

  // ---------- קוד הגיע ----------
  function gotCode(o) {
    if (o.at && Date.now() - o.at > CODE_TTL) return send({ type: 'ack', id: o.id, filled: false, old: true });
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
      send({ type: 'ack', id: c.id, filled: !!res.filled });
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
      return h ? null : chrome.offscreen.createDocument({ url: 'gesher/offscreen.html', reasons: ['CLIPBOARD'], justification: 'לוח משותף עם הטלפון: כתיבה ללוח של טקסט שהגיע מהטלפון, וזיהוי העתקה במחשב כשהמשתמש הדליק את זה' });
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
      if (op.pause || !op.clipIn) return send({ type: 'ack', id: o.id, paused: true });
      return copy(text).then(function (ok) {
        chrome.storage.session.set({ gClip: { dir: 'in', at: Date.now(), len: text.length, ok: ok } });
        chrome.notifications.create('gesher:clip', {
          type: 'basic', iconUrl: 'icon128.png', priority: 0, silent: true,
          title: ok ? '📋 הועתק מהטלפון' : 'הגיע טקסט מהטלפון – אין הרשאת לוח',
          message: o.sens ? '(טקסט רגיש – לא מוצג)' : (preview(text) || ' ')
        });
        setTimeout(function () { chrome.notifications.clear('gesher:clip'); }, 6000);
        return send({ type: 'ack', id: o.id, ok: ok });
      });
    });
  }

  // מחשב -> טלפון: העתקה במחשב (זוהתה ב-offscreen). שולחים רק את האחרון; אם הטלפון לא מחובר – מחכה עד 10 דקות.
  function localClip(text) {
    if (!text || text.length > CLIP_MAX) return Promise.resolve();
    return Promise.all([opts(), chrome.storage.session.get('gClipHash'), load()]).then(function (r) {
      var op = r[0];
      if (!r[2] || op.pause || !op.clipOut) return;
      if (r[1].gClipHash === hash(text)) return;            // זה בדיוק מה שהגיע מהטלפון – לא מחזירים (מניעת לולאה)
      rememberClip(text);
      var out = { type: 'clip', id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), text: text, at: Date.now(), sens: looksSecret(text) };
      return chrome.storage.session.set({ gClipOut: out, gClip: { dir: 'out', at: out.at, len: text.length, sent: false } }).then(flushClip);
    });
  }
  function flushClip() {
    return chrome.storage.session.get('gClipOut').then(function (o) {
      var c = o.gClipOut;
      if (!c) return;
      if (Date.now() - c.at > CLIP_TTL) return chrome.storage.session.remove('gClipOut');
      if (!phoneOn) { connect(); return; }
      return send(c);
    }).catch(function () {});
  }
  function clipAcked(id) {
    return chrome.storage.session.get(['gClipOut', 'gClip']).then(function (o) {
      if (!o.gClipOut || o.gClipOut.id !== id) return;
      chrome.storage.session.remove('gClipOut');
      chrome.storage.session.set({ gClip: Object.assign({}, o.gClip, { sent: true, at: Date.now() }) });
    });
  }
  // מדליק/מכבה את הבדיקה של הלוח במחשב לפי המתגים וההרשאה
  function syncClipWatch() {
    return Promise.all([load(), opts(), chrome.permissions.contains({ permissions: ['clipboardRead'] })]).then(function (r) {
      var on = !!r[0] && r[1].clipOut && !r[1].pause && r[2];
      if (!on) return chrome.offscreen && chrome.offscreen.hasDocument().then(function (h) { if (h) return chrome.runtime.sendMessage({ t: 'gesher-clip-watch', on: false }); });
      return offscreen().then(function () { return chrome.runtime.sendMessage({ t: 'gesher-clip-watch', on: true }); });
    }).catch(function () {});
  }

  // ---------- הודעות מהטלפון (notif) ----------
  // הרשימה נשמרת רק ב-chrome.storage.session (בזיכרון, נמחקת כשכרום נסגר), 50 אחרונות. שום תוכן לא נכתב ללוג.
  var NOTIF_MAX = 50, OUT_TTL = 10 * 60e3;
  function nid(key) { return 'gn:' + hash(String(key)); }
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
    var item = {
      key: String(o.key || o.id), id: o.id, pkg: String(o.pkg || ''), app: String(o.app || 'הטלפון').slice(0, 60),
      title: String(o.title || '').slice(0, 200), text: String(o.text || '').slice(0, 4000),
      icon: /^data:image\/png;base64,[A-Za-z0-9+/=]{10,40000}$/.test(o.icon || '') ? o.icon : '',
      reply: !!o.reply, at: o.at || Date.now(), got: Date.now()
    };
    return send({ type: 'ack', id: o.id }).then(function () {
      return Promise.all([notifs(), opts()]);
    }).then(function (r) {
      var a = r[0].filter(function (x) { return x.key !== item.key; });
      a.unshift(item);
      return saveNotifs(a).then(function () {
        if (!r[1].notif || quiet(r[1])) return;
        var btns = item.reply ? [{ title: '↩ לענות' }, { title: '📋 להעתיק' }] : [{ title: '📋 להעתיק' }];
        chrome.notifications.create(nid(item.key), {
          type: 'basic', iconUrl: item.icon || 'icon128.png', priority: 1,
          title: item.title || item.app, message: item.text || ' ', contextMessage: '📲 ' + item.app, buttons: btns
        });
      });
    });
  }
  // fromPc=true: נסגרה במחשב → לסגור גם בטלפון. false: נסגרה בטלפון → רק להעלים מהמחשב.
  function dropNotif(key, fromPc) {
    chrome.notifications.clear(nid(key));
    return notifs().then(function (a) {
      var had = a.some(function (x) { return x.key === key; });
      return saveNotifs(a.filter(function (x) { return x.key !== key; })).then(function () {
        if (fromPc && had) return queueOut({ type: 'notif-x', key: key });
      });
    });
  }
  // מחשב → טלפון (סגירה / מענה): תור קטן ב-session עד שהטלפון מאשר, עד 10 דקות
  function queueOut(m) {
    m.id = 'o' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    m.at = Date.now();
    return chrome.storage.session.get('gOut').then(function (o) {
      var q = (o.gOut || []).filter(function (x) { return Date.now() - x.at < OUT_TTL; });
      q.push(m);
      return chrome.storage.session.set({ gOut: q.slice(-30) });
    }).then(flushOut).then(function () { return m.id; });
  }
  function flushOut() {
    return chrome.storage.session.get('gOut').then(function (o) {
      var q = (o.gOut || []).filter(function (x) { return Date.now() - x.at < OUT_TTL; });
      if (!q.length) return;
      if (!phoneOn) { connect(); return; }
      return q.reduce(function (p, m) { return p.then(function () { return send(m); }); }, Promise.resolve());
    }).catch(function () {});
  }
  function outAcked(a) {
    return chrome.storage.session.get(['gOut', 'gReplies']).then(function (o) {
      var q = o.gOut || [], m = q.filter(function (x) { return x.id === a.id; })[0];
      if (!m) return;
      chrome.storage.session.set({ gOut: q.filter(function (x) { return x.id !== a.id; }) });
      if (m.type !== 'notif-reply') return;
      var r = o.gReplies || {};
      r[m.key] = { ok: a.ok !== false, why: a.why || '', at: Date.now() };
      chrome.storage.session.set({ gReplies: r });
      if (a.ok !== false) return notifs().then(function (list) {
        list.forEach(function (x) { if (x.key === m.key) { x.seen = true; x.replied = (x.replied || []).concat([m.text]).slice(-5); } });
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
    }).then(function () { return queueOut({ type: 'notif-reply', key: key, text: text.slice(0, 4000) }); })
      .then(function () { return { ok: true, online: phoneOn }; });
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
  function forget(why) {
    var p = pair;
    pair = null;
    try { if (ws) ws.close(); } catch (e) {}
    ws = null;
    clearInterval(pingT);
    chrome.storage.session.remove(['gLast', 'gField', 'gClip', 'gClipOut', 'gNotifs', 'gOut', 'gReplies']);
    badge();
    setState({ online: false, unpaired: true });
    return S.clear().then(function () {
      if (why) chrome.notifications.create('gesher:off', { type: 'basic', iconUrl: 'icon128.png', title: 'הגשר לטלפון נותק', message: why });
      return p;
    });
  }
  function unpair() {
    return load().then(function (p) {
      if (!p) return;
      return send({ type: 'bye' }).catch(function () {}).then(function () {
        return fetch(p.w + '/r/' + p.room + '?tok=' + p.tokPc, { method: 'DELETE' }).catch(function () {});
      });
    }).then(function () { return forget(''); });
  }

  // ---------- שדה קוד פתוח ----------
  var fieldT = null;
  function fieldOpen(tab) {
    load().then(function (p) {
      if (!p) return;
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
    if (m.t === 'gesher-paired') { pair = null; lastSent = '0'; connect().then(function () { reply({ ok: true }); }); syncWatch(); syncClipWatch(); return true; }
    if (m.t === 'gesher-unpair') { unpair().then(function () { reply({ ok: true }); syncWatch(); syncClipWatch(); }); return true; }
    if (m.t === 'gesher-state') {
      Promise.all([load(), chrome.storage.session.get(['gState', 'gLast', 'gClip'])]).then(function (r) {
        reply({ paired: !!r[0], name: r[0] && r[0].name, since: r[0] && r[0].at, online: !!(ws && ws.readyState === 1), phone: phoneOn, state: r[1].gState || {}, last: r[1].gLast || null, clip: r[1].gClip || null });
      });
      if (!(ws && ws.readyState <= 1)) connect();
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
    return Promise.all([load(), chrome.permissions.contains({ origins: ['<all_urls>'] })]).then(function (r) {
      var on = !!r[0] && r[1];
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

  self.Gesher = { connect: connect, unpair: unpair, typeLast: typeLast, gesherFill: gesherFill, localClip: localClip, hash: hash, quiet: quiet, replyNotif: replyNotif, dropNotif: dropNotif };
})();
