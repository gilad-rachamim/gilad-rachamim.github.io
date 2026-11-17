/* גשר טלפון↔מחשב – החלק שרץ ב-service worker של התוסף.
 * מחזיק חיבור WebSocket לשרת הממסר (ping כל 20 שניות שומר את ה-SW ער, alarm כל דקה מחבר מחדש),
 * פותח את ההודעות המוצפנות מהטלפון, ממלא את הקוד בשדה שפתוח בדף, ותמיד אומר מאיפה הקוד הגיע.
 * נטען מ-background.js אחרי gesher/crypto.js ו-gesher/store.js. הפרוטוקול: tools/gesher-worker/PROTOCOL.md
 * לא כותב שום קוד ללוג ולא שולח שום דבר ל-Analytics.
 */
(function () {
  'use strict';
  var G = self.GesherCrypto, S = self.GesherStore;
  var ws = null, pingT = null, pair = null, connecting = false, lastSent = '0';
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
          if (m.t === 'peer') setState({ online: true, phone: !!m.on });
          return;
        }
        onFrame(new Uint8Array(e.data));
      };
      s.onclose = function (e) {
        connecting = false;
        clearInterval(pingT);
        if (ws === s) ws = null;
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
  function opts() { return chrome.storage.local.get('gesherOpts').then(function (o) { return Object.assign({ copy: true }, o.gesherOpts || {}); }); }
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
  function copy(text) {
    chrome.permissions.contains({ permissions: ['clipboardWrite'] }).then(function (has) {
      if (!has || !chrome.offscreen) return;
      return chrome.offscreen.hasDocument().then(function (h) {
        return h ? null : chrome.offscreen.createDocument({ url: 'gesher/offscreen.html', reasons: ['CLIPBOARD'], justification: 'העתקת קוד האימות שהגיע מהטלפון ללוח' });
      }).then(function () { return chrome.runtime.sendMessage({ t: 'gesher-copy', text: text }); });
    }).catch(function () {});
  }

  // ---------- ניתוק ----------
  function forget(why) {
    var p = pair;
    pair = null;
    try { if (ws) ws.close(); } catch (e) {}
    ws = null;
    clearInterval(pingT);
    chrome.storage.session.remove(['gLast', 'gField']);
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
    if (m.t === 'gesher-paired') { pair = null; lastSent = '0'; connect().then(function () { reply({ ok: true }); }); syncWatch(); return true; }
    if (m.t === 'gesher-unpair') { unpair().then(function () { reply({ ok: true }); syncWatch(); }); return true; }
    if (m.t === 'gesher-state') {
      Promise.all([load(), chrome.storage.session.get(['gState', 'gLast'])]).then(function (r) {
        reply({ paired: !!r[0], name: r[0] && r[0].name, since: r[0] && r[0].at, online: !!(ws && ws.readyState === 1), state: r[1].gState || {}, last: r[1].gLast || null });
      });
      if (!(ws && ws.readyState <= 1)) connect();
      return true;
    }
    if (m.t === 'gesher-fill-last') { typeLast().then(reply); return true; }
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
  });
  chrome.notifications.onButtonClicked.addListener(function (id, i) {
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
  chrome.alarms.onAlarm.addListener(function (a) { if (a.name === 'gesher') connect(); });
  chrome.runtime.onStartup.addListener(function () { connect(); syncWatch(); });
  chrome.runtime.onInstalled.addListener(function () { connect(); syncWatch(); });
  chrome.permissions.onAdded.addListener(syncWatch);
  chrome.permissions.onRemoved.addListener(syncWatch);
  connect();

  self.Gesher = { connect: connect, unpair: unpair, typeLast: typeLast, gesherFill: gesherFill };
})();
