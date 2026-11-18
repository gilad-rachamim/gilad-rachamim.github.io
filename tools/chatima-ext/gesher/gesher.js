/* גשר – דף הצימוד והמצב. יוצר חדר + סוד + מפתח, מציג QR, מחכה לטלפון, מאמת אותו ושומר את המפתחות (לא ניתנים לחילוץ).
 * הפרוטוקול: tools/gesher-worker/PROTOCOL.md
 */
(function () {
  'use strict';
  var G = self.GesherCrypto, S = self.GesherStore;
  var SERVER = 'https://kelim-gesher.gilad4049.workers.dev';
  var qs = new URLSearchParams(location.search);
  if (/^http:\/\/127\.0\.0\.1:\d+$/.test(qs.get('w') || '')) SERVER = qs.get('w');   // בדיקה מקומית בלבד
  var $ = function (id) { return document.getElementById(id); };
  var ws = null, timer = null, alive = false;

  function show(id) { ['off', 'pairing', 'on'].forEach(function (x) { $(x).hidden = x !== id; }); $('clip').hidden = id !== 'on'; $('inbox').hidden = id !== 'on'; $('files').hidden = id !== 'on'; }
  function ask(m) { return chrome.runtime.sendMessage(m); }

  // ---------- מצב ----------
  function refresh() {
    return ask({ t: 'gesher-state' }).then(function (st) {
      if (!st || !st.paired) { if (!alive) show('off'); return; }
      show('on');
      var nm = st.name || 'טלפון';
      $('phone-name').textContent = (/^[֐-׿]/.test(nm) ? 'ל' : 'ל-') + nm;
      var phone = st.state && st.state.phone;
      $('dot').className = 'dot' + (st.online ? (phone ? ' ok' : ' half') : '');
      $('status-txt').textContent = !st.online ? 'מתחבר לשרת…' : phone ? 'הטלפון מחובר עכשיו' : 'מחכה לטלפון (הוא מתחבר לבד כשמגיע קוד)';
      if (st.last && Date.now() - st.last.at < 10 * 60e3) {
        var l = st.last, src = { sms: 'SMS', whatsapp: 'ווטסאפ', mail: 'מייל', app: 'התראה' }[l.src] || l.src;
        $('last').hidden = false;
        $('last').innerHTML = 'הקוד האחרון: <b></b> · הגיע ב-<span></span>' + (l.filled ? ' · הוזן' : '');
        $('last').querySelector('b').textContent = l.code;
        $('last').querySelector('span').textContent = src + (l.from ? ' מ' + l.from : '');
      } else $('last').hidden = true;
      chrome.permissions.contains({ origins: ['<all_urls>'] }).then(function (has) { $('perm').hidden = has; });
    }).catch(function () {});
  }

  // ---------- צימוד ----------
  function start() {
    $('off-msg').textContent = '';
    // בקשת ההרשאות חייבת לקרות מיד בלחיצה
    chrome.permissions.request({ origins: ['<all_urls>'], permissions: ['clipboardWrite', 'clipboardRead', 'downloads'] }).catch(function () { return false; }).then(function (granted) {
      if (!granted) $('off-msg').textContent = 'בלי הרשאה לאתרים הקוד לא ימולא לבד – רק יופיע בהתראה ויועתק. אפשר לאפשר אחר כך.';
      return pairNow();
    });
  }

  function pairNow() {
    alive = true;
    var room = G.random(16), secret = G.random(32), kp, pt;
    show('pairing');
    $('pair-msg').textContent = 'מכינים…';
    $('qr').textContent = '';
    return G.newKeyPair().then(function (k) {
      kp = k;
      return G.pairToken(secret);
    }).then(function (t) {
      pt = t;
      return G.sha256Hex(pt);
    }).then(function (ph) {
      return fetch(SERVER + '/pair', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ room: G.b64u(room), ph: ph }) });
    }).then(function (r) {
      if (r.status === 429) throw new Error('יותר מדי ניסיונות. נסו שוב בעוד שעה.');
      if (!r.ok) throw new Error('השרת לא זמין כרגע (' + r.status + ')');
      return chrome.runtime.getPlatformInfo();
    }).then(function (pi) {
      var name = 'כרום ב' + ({ win: 'מחשב Windows', mac: 'מק', linux: 'לינוקס', cros: 'כרומבוק' }[pi.os] || 'מחשב');
      var json = JSON.stringify({ v: 1, r: G.b64u(room), s: G.b64u(secret), k: G.b64u(kp.pub), n: name, w: SERVER });
      var url = 'https://hakelim.com/kelim/g/#' + G.b64u(new TextEncoder().encode(json));
      $('qr').dataset.url = url;   // לבדיקות אוטומטיות
      new QRCode($('qr'), { text: url, width: 600, height: 600, colorDark: '#000000', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.L });
      countdown();
      $('pair-msg').textContent = 'פותחים את אפליקציית "הכלים" בטלפון ← "חיבור למחשב" ← סורקים.';
      return listen(room, secret, kp, pt, name);
    }).catch(function (e) { fail(e.message || 'משהו השתבש'); });
  }

  function listen(room, secret, kp, pt, pcName) {
    var sess = null, phoneName = '';
    ws = new WebSocket(SERVER.replace(/^http/, 'ws') + '/r/' + G.b64u(room) + '/ws?tok=' + G.b64u(pt));
    ws.binaryType = 'arraybuffer';
    ws.onmessage = function (e) {
      if (typeof e.data === 'string') {
        var m; try { m = JSON.parse(e.data); } catch (x) { return; }
        if (m.t === 'peer' && m.on) $('pair-msg').textContent = 'הטלפון נמצא – מאמתים…';
        if (m.t === 'sealed' && sess) {
          var save = { room: G.b64u(room), w: SERVER, tokPc: sess.tokPc, k12: sess.k12, k21: sess.k21, name: phoneName || 'הטלפון', at: Date.now() };
          S.clear().then(function () { return S.set('pair', save); }).then(function () { return ask({ t: 'gesher-paired' }); }).then(function () {
            alive = false; clearInterval(timer);
            refresh();
            $('on-msg').textContent = 'מחובר! נסו: בקשו קוד באתר כלשהו – הוא ייכנס לבד.';
          });
        }
        if (m.t === 'err') fail('החיבור נכשל. נסו שוב.');
        return;
      }
      // hello מהטלפון (גלוי: מפתח ציבורי + הוכחה שראה את ה-QR)
      var h; try { h = JSON.parse(new TextDecoder().decode(e.data)); } catch (x) { return; }
      if (!h || h.type !== 'hello' || sess) return;
      var phonePub = G.unb64u(h.pub);
      G.helloMac(secret, room, kp.pub, phonePub).then(function (mac) {
        if (!G.sameBytes(mac, G.unb64u(h.mac || ''))) throw new Error('הטלפון לא עבר אימות. סורקים שוב.');
        phoneName = String(h.name || '').slice(0, 40);
        return G.deriveSession(kp.privateKey, phonePub, room);
      }).then(function (s) {
        sess = s;
        ws.send(JSON.stringify({ t: 'seal', hPc: s.hPc, hPhone: s.hPhone }));
      }).catch(function (err) { fail(err.message); });
    };
    ws.onclose = function (e) {
      if (e.code === 4002) return;           // הצימוד הושלם
      if (alive) fail(e.code === 4001 ? 'עבר הזמן. לוחצים שוב "חיבור טלפון".' : 'החיבור לשרת נפל. נסו שוב.');
    };
  }

  function countdown() {
    var end = Date.now() + 3 * 60e3;
    clearInterval(timer);
    timer = setInterval(function () {
      var s = Math.max(0, Math.round((end - Date.now()) / 1000));
      $('left').textContent = Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2);
      if (!s) { clearInterval(timer); fail('עבר הזמן. לוחצים שוב "חיבור טלפון".'); }
    }, 1000);
  }
  function fail(msg) {
    alive = false;
    clearInterval(timer);
    try { if (ws) ws.close(); } catch (e) {}
    show('off');
    $('off-msg').textContent = msg;
  }

  // ---------- כפתורים ----------
  $('start').addEventListener('click', start);
  $('cancel').addEventListener('click', function () { fail(''); });
  $('unpair').addEventListener('click', function () {
    if (!confirm('לנתק את הטלפון? הקודים יפסיקו להגיע למחשב הזה.')) return;
    ask({ t: 'gesher-unpair' }).then(function () { show('off'); $('off-msg').textContent = 'נותק. המפתחות נמחקו מהמחשב.'; });
  });
  $('perm').addEventListener('click', function () {
    chrome.permissions.request({ origins: ['<all_urls>'], permissions: ['clipboardWrite'] }).then(refresh);
  });
  $('keys').addEventListener('click', function (e) { e.preventDefault(); chrome.tabs.create({ url: 'chrome://extensions/shortcuts' }); });
  chrome.storage.local.get('gesherOpts').then(function (o) { $('opt-copy').checked = (o.gesherOpts || {}).copy !== false; });
  $('opt-copy').addEventListener('change', function () {
    var on = $('opt-copy').checked;
    chrome.storage.local.get('gesherOpts').then(function (o) { chrome.storage.local.set({ gesherOpts: Object.assign({}, o.gesherOpts, { copy: on }) }); });
    if (on) chrome.permissions.request({ permissions: ['clipboardWrite'] }).catch(function () {});
  });
  chrome.storage.onChanged.addListener(function (c, area) { if (area === 'session' && (c.gState || c.gLast || c.gClip)) refresh(); });

  // ---------- לוח משותף ----------
  var CLIP_DEF = { clipIn: true, clipOut: true, pause: false };
  function clipOpts() { return chrome.storage.local.get('gesherOpts').then(function (o) { return Object.assign({}, CLIP_DEF, o.gesherOpts || {}); }); }
  function setOpt(k, v) {
    return chrome.storage.local.get('gesherOpts').then(function (o) { var x = Object.assign({}, o.gesherOpts); x[k] = v; return chrome.storage.local.set({ gesherOpts: x }); })
      .then(function () { return ask({ t: 'gesher-clip-sync' }); }).then(clipView);
  }
  function ago(t) { var s = Math.round((Date.now() - t) / 1000); return s < 60 ? 'לפני ' + s + ' שניות' : 'לפני ' + Math.round(s / 60) + ' דקות'; }
  function clipView() {
    return Promise.all([clipOpts(), chrome.permissions.contains({ permissions: ['clipboardRead'] }), chrome.storage.session.get('gClip')]).then(function (r) {
      var op = r[0], canRead = r[1], last = r[2].gClip;
      $('clip-pause').textContent = op.pause ? '▶ הלוח המשותף מושהה – להמשיך' : '⏸ השהיית הלוח המשותף';
      $('clip-pause').classList.toggle('paused', op.pause);
      $('opt-clip-out').checked = op.clipOut && canRead;
      $('opt-clip-in').checked = op.clipIn;
      $('opt-clip-out').disabled = $('opt-clip-in').disabled = op.pause;
      var s = op.pause ? 'מושהה: שום דבר לא עובר בין הלוחות.' : '';
      if (!op.pause && last) {
        s = last.dir === 'in' ? 'אחרון: הגיע מהטלפון ' + ago(last.at) + (last.ok ? ' ✓' : ' – אין הרשאת לוח')
          : 'אחרון: הועתק במחשב ' + ago(last.at) + (last.sent ? ' · הגיע לטלפון ✓' : ' · מחכה שהטלפון יתחבר (עד 10 דקות)');
      }
      $('clip-state').textContent = s;
    }).catch(function () {});
  }
  $('clip-pause').addEventListener('click', function () { clipOpts().then(function (op) { setOpt('pause', !op.pause); }); });
  $('opt-clip-in').addEventListener('change', function () {
    var on = $('opt-clip-in').checked;
    if (on) chrome.permissions.request({ permissions: ['clipboardWrite'] }).catch(function () {});
    setOpt('clipIn', on);
  });
  $('opt-clip-out').addEventListener('change', function () {
    if (!$('opt-clip-out').checked) return setOpt('clipOut', false);
    // הבקשה חייבת לקרות מיד בלחיצה
    chrome.permissions.request({ permissions: ['clipboardRead', 'clipboardWrite'] }).catch(function () { return false; }).then(function (ok) {
      if (!ok) { $('opt-clip-out').checked = false; $('clip-state').textContent = 'בלי הרשאה לקרוא את הלוח אי אפשר לזהות העתקה במחשב.'; return; }
      setOpt('clipOut', true);
    });
  });
  chrome.storage.onChanged.addListener(function (c, area) { if ((area === 'local' && c.gesherOpts) || (area === 'session' && c.gClip)) clipView(); });
  clipView();
  setInterval(clipView, 5000);

  refresh();
  setInterval(refresh, 5000);
})();
