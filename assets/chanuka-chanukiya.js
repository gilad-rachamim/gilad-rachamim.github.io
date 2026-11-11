// חנוכייה משותפת בקישור: פותחים חנוכייה (לעילוי נשמה, לרפואה, של קהילה...), שולחים קישור,
// וכל מי שנכנס מדליק נר עם הקדשה. השרת: tools/chanuka-worker (Cloudflare, נמחק לבד אחרי 90 יום).
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  if (!$('chk-app')) return;
  var LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var API = LOCAL ? 'http://127.0.0.1:8789' : 'https://kodesh-chanuka.gilad4049.workers.dev';
  var VER = 1;   // גרסת השרת: הבקשות מופיעות רק משרת v2 ומעלה
  // בקשות מתחת לחנוכייה: [עם שם, בלי שם]
  var KIND = {
    refua: ['לרפואת', 'לרפואה שלמה'], zivug: ['לזיווג הגון ל', 'לזיווג הגון'], parnasa: ['לפרנסה טובה ל', 'לפרנסה טובה'],
    banim: ['לזרע של קיימא ל', 'לזרע של קיימא'], shalom: ['לשלום בית ל', 'לשלום בית'], yeshua: ['לישועה ל', 'לישועה'],
    hatzlacha: ['להצלחת', 'להצלחה'], other: ['בקשה בשביל', 'בקשה']
  };
  // שם ה' נכתב ה׳; מילים פוגעניות ופרטי קשר נחסמים (אותה רשימה כמו בשרת)
  function holyName(s) { return s.replace(/י[\s'"׳״-]*ה[\s'"׳״-]*ו[\s'"׳״-]*ה/g, 'ה׳').replace(/אלוהים/g, 'אלוקים'); }
  var BAD_SUB = ['שרמוט', 'זונה', 'כוסאמ', 'כוס אמ', 'כוסעמ', 'מניאק', 'קוקסינ', 'בןזונה', 'ימח שמ', 'מוות ל', 'שימות', 'שתמות', 'נאצי', 'fuck', 'shit', 'bitch', 'cunt', 'porn', 'dick', 'whore', 'slut', 'nigg', 'פורנו', 'סקס'];
  var BAD_WORD = /(^|[^א-ת])[והשלבכמ]?(זין|חרא|זבל|דפוק|מפגר|אידיוט|טמבל|כלב|חזיר|לעזאזל|תמות)([^א-ת]|$)/;
  function badWords(s) { var t = s.toLowerCase(); return BAD_SUB.some(function (w) { return t.indexOf(w) >= 0; }) || BAD_WORD.test(t); }
  function contactInfo(s) { return /\d[\d\s-]{6,}\d/.test(s) || /https?:|www\.|\.com|\.co\.il|@/i.test(s); }
  function reqTitle(k, who) { var a = KIND[k] || KIND.other; return who ? (/(^|\s)ל$/.test(a[0]) ? a[0] + who : a[0] + ' ' + who) : a[1]; }
  var PHR = { niftar: 'לעילוי נשמת', refua: 'לרפואת', hatzlacha: 'להצלחת', zivug: 'לזיווג הגון ל', zchut: 'לזכות' };
  var store = {
    get: function (k) { try { return localStorage.getItem('chk-' + k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem('chk-' + k, v); } catch (e) {} }
  };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function tok() { var t = store.get('t'); if (!t) { t = Math.random().toString(36).slice(2) + Date.now().toString(36); store.set('t', t); } return t; }
  function api(path, body) {
    return fetch(API + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {})
      .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || 'שגיאה'); return d; }); });
  }
  function ded(p, pt, who) {
    if (!who) return '';
    var ph = p === 'other' ? pt : PHR[p] || '';
    return ph ? (/(^|\s)ל$/.test(ph) ? ph + who : ph + ' ' + who) : who;
  }
  function title(m) {
    if (m.p === 'kehila') return m.n;
    return 'חנוכייה ' + ded(m.p, m.pt, m.n + (m.par ? ' ' + m.bb + ' ' + m.par : ''));
  }
  function menorah(n) {
    var lit = Math.min(8, n), h = '<div class="cn-menorah" aria-hidden="true">';
    for (var i = 1; i <= 8; i++) h += '<span class="c' + (i <= lit ? ' lit' : '') + '"></span>' + (i === 4 ? '<span class="c sh lit"></span>' : '');
    return h + '</div>';
  }
  function purposeFields(pre) {
    return '<div class="field"><label for="' + pre + '-p">ההקדשה</label><select id="' + pre + '-p">' +
      (pre === 'nw' ? '<option value="kehila">חנוכייה של קהילה / משפחה / קבוצה</option>' : '<option value="">בלי הקדשה – רק להדליק</option>') +
      '<option value="niftar">לעילוי נשמת</option><option value="refua">לרפואת</option><option value="hatzlacha">להצלחת</option><option value="zivug">לזיווג הגון ל</option><option value="zchut">לזכות</option><option value="other">אחר (לכתוב)</option></select></div>' +
      '<div class="field" id="' + pre + '-pt-w" hidden><label for="' + pre + '-pt">ניסוח ההקדשה</label><input id="' + pre + '-pt" maxlength="30" placeholder="לשלום החיילים ול"></div>' +
      '<div class="chk-row" id="' + pre + '-who"><div class="field"><label for="' + pre + '-n" id="' + pre + '-n-l">שם</label><input id="' + pre + '-n" maxlength="50"></div>' +
      '<div class="field chk-bb" id="' + pre + '-bb-w"><label for="' + pre + '-bb">בן / בת</label><select id="' + pre + '-bb"><option>בן</option><option>בת</option></select></div>' +
      '<div class="field" id="' + pre + '-par-w"><label for="' + pre + '-par">שם האם / האב <span class="opt">(לא חובה)</span></label><input id="' + pre + '-par" maxlength="40"></div></div>';
  }
  function wirePurpose(pre) {
    function upd() {
      var p = $(pre + '-p').value;
      $(pre + '-pt-w').hidden = p !== 'other';
      $(pre + '-who').hidden = pre !== 'nw' && !p;
      var kehila = p === 'kehila';
      $(pre + '-bb-w').hidden = kehila; $(pre + '-par-w').hidden = kehila;
      $(pre + '-n-l').textContent = kehila ? 'שם החנוכייה' : 'השם';
      $(pre + '-n').placeholder = kehila ? 'החנוכייה של בית הכנסת אוהל משה' : '';
    }
    $(pre + '-p').onchange = upd; upd();
  }

  // ---------- פתיחת חנוכייה ----------
  function newForm() {
    var mine = []; try { mine = JSON.parse(store.get('mine') || '[]'); } catch (e) {}
    $('chk-app').innerHTML = '<div class="cn-box">' + menorah(3) + '<h2>לפתוח חנוכייה משותפת</h2><p class="cn-sm">ממלאים פרטים, מקבלים קישור, ושולחים למשפחה ולחברים. כל מי שנכנס מדליק נר.</p></div>' +
      '<form class="k-form chk-form" id="nw" novalidate>' + purposeFields('nw') +
      '<div class="field"><label for="nw-x">מילה קצרה <span class="opt">(לא חובה)</span></label><textarea id="nw-x" rows="2" maxlength="200" placeholder="אבא אהב את חנוכה. נדליק יחד לזכרו."></textarea></div>' +
      '<div class="field"><label for="nw-cr">מי פותח <span class="opt">(לא חובה)</span></label><input id="nw-cr" maxlength="40" placeholder="משפחת כהן"></div>' +
      '<button class="btn btn-gold" type="submit">לפתוח את החנוכייה</button><p class="chk-err" id="nw-err" role="alert"></p></form>' +
      '<p class="cn-note">רוצים רק להדליק נר? <a href="?h=kn7cgpdj">להדליק בחנוכייה של כלי קודש, הפתוחה לכולם</a>.</p>' +
      (mine.length ? '<h3 class="chk-h3">החנוכיות שפתחתי בטלפון הזה</h3><ul class="chk-mine">' + mine.map(function (x) { return '<li><a href="?h=' + esc(x[0]) + '">' + esc(x[1]) + '</a></li>'; }).join('') + '</ul>' : '');
    wirePurpose('nw');
    $('nw').onsubmit = function (e) {
      e.preventDefault();
      var m = { p: $('nw-p').value, pt: $('nw-pt').value, n: $('nw-n').value.trim(), bb: $('nw-bb').value, par: $('nw-par').value, x: $('nw-x').value, cr: $('nw-cr').value };
      if (!m.n) { $('nw-err').textContent = m.p === 'kehila' ? 'כתבו שם לחנוכייה.' : 'כתבו את השם.'; return; }
      $('nw-err').textContent = 'פותח…';
      api('/h', { m: m }).then(function (d) {
        store.set('a-' + d.id, d.a);
        mine.unshift([d.id, title(m)]); store.set('mine', JSON.stringify(mine.slice(0, 20)));
        if (window.toolUsed) window.toolUsed('chanuka_chanukiya', { how: 'add' });
        location.href = '?h=' + d.id + '&new=1';
      }).catch(function (er) { $('nw-err').textContent = er.message; });
    };
  }

  // ---------- חנוכייה פתוחה ----------
  var H = null, ADMIN = null;
  function show(id) {
    // קישור ניהול (#a=...) – שומר את המפתח בטלפון הזה ומוחק אותו מהכתובת
    var ha = /#a=([a-z0-9]{14})$/.exec(location.hash);
    if (ha) { store.set('a-' + id, ha[1]); try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} }
    ADMIN = store.get('a-' + id);
    $('chk-app').innerHTML = '<p class="cn-sm">טוען את החנוכייה…</p>';
    api('/h/' + id).then(function (s) { H = s; draw(); }).catch(function (er) {
      $('chk-app').innerHTML = '<div class="cn-box"><p>' + esc(er.message) + '</p><a class="btn btn-gold" href="./">לפתוח חנוכייה חדשה</a></div>';
    });
  }
  function shareUrl() { return (LOCAL ? location.origin + location.pathname + '?h=' : API + '/j/') + H.id; }
  function draw() {
    var m = H.m, isNew = /[?&]new=1/.test(location.search);
    var f = m.bb === 'בת', TO = { niftar: f ? ' לעילוי נשמתה' : ' לעילוי נשמתו', refua: f ? ' לרפואתה' : ' לרפואתו', hatzlacha: f ? ' להצלחתה' : ' להצלחתו', zchut: f ? ' לזכותה' : ' לזכותו' };
    var wa = title(m) + ' 🕎\n' + (m.x ? m.x + '\n' : '') + 'היכנסו והדליקו נר' + (TO[m.p] || '') + ' – כל נר מוסיף אור:\n' + shareUrl();
    $('chk-app').innerHTML = '<div class="cn-box">' + menorah(H.n) +
      '<h2>' + esc(title(m)) + '</h2>' + (m.x ? '<p class="cn-sm">' + esc(m.x) + '</p>' : '') +
      '<p class="chk-cnt"><b>' + H.n + '</b> ' + (H.n === 1 ? 'נר הודלק' : 'נרות הודלקו') + '</p>' + (m.cr ? '<p class="cn-sm">פתחו: ' + esc(m.cr) + '</p>' : '') + '</div>' +
      (isNew ? '<p class="cn-note">החנוכייה נפתחה! עכשיו שלחו את הקישור למשפחה ולחברים.' + (ADMIN ? ' את החנוכייה אפשר לנהל רק מהטלפון הזה.' : '') + '</p>' : '') +
      '<div class="actions"><a class="btn btn-gold" id="chk-wa" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(wa) + '"><svg class="ic"><use href="#wa"/></svg> לשלוח את הקישור</a>' +
      '<button class="btn btn-line" type="button" id="chk-copy">להעתיק קישור</button></div>' +
      '<form class="k-form chk-form" id="lt" novalidate><h3 class="chk-h3">להדליק נר</h3>' +
      '<div class="field"><label for="lt-w">השם שלכם <span class="opt">(לא חובה)</span></label><input id="lt-w" maxlength="40" value="' + esc(store.get('w') || '') + '"></div>' +
      purposeFields('lt') +
      '<div class="field"><label for="lt-x">ברכה קצרה <span class="opt">(לא חובה)</span></label><input id="lt-x" maxlength="100" placeholder="שיהיה אור גדול"></div>' +
      '<button class="btn btn-gold" type="submit">🕯️ להדליק נר</button><p class="chk-err" id="lt-err" role="alert"></p></form>' +
      (VER >= 2 ? bakashot() : '') +
      '<h3 class="chk-h3">הנרות שהודלקו</h3><div class="chk-wall" id="chk-wall">' + wall() + '</div>' +
      (ADMIN ? '<details class="cn-d chk-adm"><summary>ניהול (רק בטלפון הזה)</summary><p class="cn-sm">לחיצה על "להסתיר" ליד נר מורידה אותו מהרשימה. החנוכייה נמחקת לבד אחרי 90 יום.</p><p class="cn-sm">לנהל גם מטלפון אחר: <button type="button" class="chk-hide" id="chk-alink">להעתיק קישור ניהול</button> (לא לשתף אותו!)</p><button class="btn btn-line btn-sm" type="button" id="chk-del">למחוק את החנוכייה עכשיו</button></details>' : '') +
      '<p class="note"><a href="./">לפתוח חנוכייה חדשה</a></p>';
    wirePurpose('lt');
    $('chk-copy').onclick = function () {
      var b = this; (navigator.clipboard ? navigator.clipboard.writeText(shareUrl()) : Promise.reject()).then(function () { b.textContent = 'הועתק ✓'; }).catch(function () { prompt('הקישור:', shareUrl()); });
    };
    $('chk-wa').onclick = function () { if (window.toolUsed) window.toolUsed('chanuka_chanukiya', { how: 'wa' }); };
    $('lt').onsubmit = function (e) {
      e.preventDefault();
      var p = $('lt-p').value, b = { t: tok(), w: $('lt-w').value, p: p, pt: $('lt-pt').value, n: p ? $('lt-n').value.trim() : '', bb: $('lt-bb').value, par: $('lt-par').value, x: $('lt-x').value };
      if (p && !b.n) { $('lt-err').textContent = 'כתבו את השם להקדשה, או בחרו "בלי הקדשה".'; return; }
      store.set('w', b.w);
      $('lt-err').textContent = 'מדליק…';
      api('/h/' + H.id + '/light', b).then(function (d) {
        H = d.s; draw();
        var w = $('chk-wall'); if (w) w.scrollIntoView({ block: 'start' });
        if (window.toolUsed) window.toolUsed('chanuka_chanukiya', { how: 'light' });
      }).catch(function (er) { $('lt-err').textContent = er.message; });
    };
    if (VER >= 2) wireBakashot();
    if (ADMIN) {
      [].forEach.call(document.querySelectorAll('[data-hide-r]'), function (x) {
        x.onclick = function () { api('/h/' + H.id + '/admin', { a: ADMIN, op: 'hideR', k: +x.getAttribute('data-hide-r') }).then(function (d) { H = d.s; draw(); }); };
      });
      [].forEach.call(document.querySelectorAll('[data-hide]'), function (x) {
        x.onclick = function () { api('/h/' + H.id + '/admin', { a: ADMIN, op: 'hide', k: +x.getAttribute('data-hide') }).then(function (d) { H = d.s; draw(); }); };
      });
      $('chk-alink').onclick = function () {
        var u = location.origin + location.pathname + '?h=' + H.id + '#a=' + ADMIN, b = this;
        (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(function () { b.textContent = 'הועתק ✓'; }).catch(function () { prompt('קישור ניהול:', u); });
      };
      $('chk-del').onclick = function () {
        if (!confirm('למחוק את החנוכייה וכל הנרות? אי אפשר לשחזר.')) return;
        api('/h/' + H.id + '/admin', { a: ADMIN, op: 'delete' }).then(function () { location.href = './'; });
      };
    }
  }
  // ---------- בקשות מתחת לחנוכייה ----------
  function bakashot() {
    var r = H.r || [];
    return '<section class="chk-bq" aria-labelledby="bq-h"><h3 class="chk-h3" id="bq-h">בקשות מתחת לחנוכייה</h3>' +
      '<p class="cn-sm">משאירים בקשה קצרה מתחת לחנוכייה – לרפואה, לזיווג, לפרנסה. כל מי שנכנס יכול לומר עליה אמן.</p>' +
      '<details class="cn-d" id="bq-d"' + (r.length ? '' : ' open') + '><summary>להשאיר בקשה</summary>' +
      '<form class="k-form" id="bq" novalidate>' +
      '<div class="field"><label for="bq-k">על מה הבקשה</label><select id="bq-k">' +
      '<option value="refua">לרפואה</option><option value="zivug">לזיווג הגון</option><option value="parnasa">לפרנסה טובה</option>' +
      '<option value="banim">לזרע של קיימא</option><option value="shalom">לשלום בית</option><option value="yeshua">לישועה</option>' +
      '<option value="hatzlacha">להצלחה</option><option value="other">בקשה אחרת</option></select></div>' +
      '<div class="chk-row"><div class="field"><label for="bq-n">שם פרטי <span class="opt">(לא חובה)</span></label><input id="bq-n" maxlength="30" autocomplete="off"></div>' +
      '<div class="field"><label for="bq-bb">בן / בת</label><select id="bq-bb"><option>בן</option><option>בת</option></select></div>' +
      '<div class="field"><label for="bq-par">שם האם <span class="opt">(לא חובה)</span></label><input id="bq-par" maxlength="30" autocomplete="off"></div></div>' +
      '<div class="field"><label for="bq-x" id="bq-x-l">במילים שלכם <span class="opt">(לא חובה, עד 80 תווים)</span></label><input id="bq-x" maxlength="80" placeholder="שיחזור הביתה בריא ושלם"></div>' +
      '<p class="cn-sm chk-priv">בלי שם משפחה, טלפון או כתובת. שם פרטי ושם האם מספיקים.</p>' +
      '<button class="btn btn-gold" type="submit">להשאיר את הבקשה</button><p class="chk-err" id="bq-err" role="alert"></p></form></details>' +
      '<div class="chk-wall" id="bq-wall">' + reqWall() + '</div></section>';
  }
  function reqWall() {
    var r = H.r || [];
    if (!r.length) return '<p class="cn-sm">עוד אין בקשות. אפשר להשאיר את הראשונה.</p>';
    return (H.nr > r.length ? '<p class="cn-sm">' + H.nr + ' בקשות. מוצגות האחרונות.</p>' : '') + r.map(function (x) {
      // [k, סוג, שם, טקסט, זמן, אמן]
      var said = store.get('am-' + H.id + '-' + x[0]);
      return '<div class="chk-c chk-r"><div><b>' + esc(reqTitle(x[1], x[2])) + '</b>' + (x[3] ? '<span class="bl">' + esc(x[3]) + '</span>' : '') + '</div>' +
        '<div class="chk-am"><button type="button" class="btn btn-line btn-sm" data-amen="' + x[0] + '"' + (said ? ' disabled' : '') + '>' + (said ? 'אמרתם אמן ✓' : 'אמן') + '</button>' +
        (x[5] ? '<small>' + x[5] + ' אמרו אמן</small>' : '') +
        (ADMIN ? '<button type="button" class="chk-hide" data-hide-r="' + x[0] + '">להסתיר</button>' : '') + '</div></div>';
    }).join('');
  }
  function wireBakashot() {
    function upd() {
      var o = $('bq-k').value === 'other';
      $('bq-x-l').innerHTML = o ? 'הבקשה במילים קצרות <span class="opt">(עד 80 תווים)</span>' : 'במילים שלכם <span class="opt">(לא חובה, עד 80 תווים)</span>';
    }
    $('bq-k').onchange = upd; upd();
    $('bq').onsubmit = function (e) {
      e.preventDefault();
      var b = { t: tok(), k: $('bq-k').value, n: holyName($('bq-n').value.trim()), bb: $('bq-bb').value, par: holyName($('bq-par').value.trim()), x: holyName($('bq-x').value.trim()) };
      var all = b.n + ' ' + b.par + ' ' + b.x;
      if (b.k === 'other' && !b.x) { $('bq-err').textContent = 'כתבו את הבקשה במילים קצרות.'; return; }
      if (badWords(all)) { $('bq-err').textContent = 'נא לכתוב בלשון נקייה. זו בקשה מתחת לחנוכייה.'; return; }
      if (contactInfo(all)) { $('bq-err').textContent = 'בלי טלפונים וקישורים – רק שם פרטי ושם האם.'; return; }
      $('bq-err').textContent = 'שומר…';
      api('/h/' + H.id + '/ask', b).then(function (d) {
        H = d.s; draw();
        var w = $('bq-h'); if (w) w.scrollIntoView({ block: 'start' });
        if (window.toolUsed) window.toolUsed('chanuka_chanukiya', { how: 'bakasha' });
      }).catch(function (er) { $('bq-err').textContent = er.message; });
    };
    wireAmen();
  }
  function wireAmen() {
    [].forEach.call(document.querySelectorAll('[data-amen]'), function (x) {
      x.onclick = function () {
        var k = +x.getAttribute('data-amen');
        x.disabled = true;
        api('/h/' + H.id + '/amen', { t: tok(), k: k }).then(function (d) {
          store.set('am-' + H.id + '-' + k, '1');
          H = d.s;
          $('bq-wall').innerHTML = reqWall(); wireAmen(); wireHideR();
          if (window.toolUsed) window.toolUsed('chanuka_chanukiya', { how: 'amen' });
        }).catch(function (er) { x.disabled = false; x.textContent = er.message; });
      };
    });
  }
  function wireHideR() {
    if (!ADMIN) return;
    [].forEach.call(document.querySelectorAll('[data-hide-r]'), function (x) {
      x.onclick = function () { api('/h/' + H.id + '/admin', { a: ADMIN, op: 'hideR', k: +x.getAttribute('data-hide-r') }).then(function (d) { H = d.s; draw(); }); };
    });
  }
  function wall() {
    if (!H.c.length) return '<p class="cn-sm">עוד לא הודלקו נרות. הדליקו את הראשון!</p>';
    return H.c.map(function (x) {
      // [k, מי, מטרה, ניסוח, שם, ברכה, זמן]
      var d = ded(x[2], x[3], x[4]);
      return '<div class="chk-c"><span class="fl" aria-hidden="true"></span><div><b>' + esc(x[1] || 'נר') + '</b>' +
        (d ? '<span>' + esc(d) + '</span>' : '') + (x[5] ? '<span class="bl">' + esc(x[5]) + '</span>' : '') + '</div>' +
        (ADMIN ? '<button type="button" class="chk-hide" data-hide="' + x[0] + '">להסתיר</button>' : '') + '</div>';
    }).join('');
  }

  // קודם בודקים שהשרת חי. אם לא – הודעה רגועה במקום שגיאה.
  var m = /[?&]h=([a-z0-9]{6,12})/.exec(location.search);
  var ctl = window.AbortController ? new AbortController() : null;
  if (ctl) setTimeout(function () { ctl.abort(); }, 8000);
  fetch(API + '/ping', ctl ? { signal: ctl.signal } : {}).then(function (r) { return r.json(); }).then(function (d) {
    if (!d || !d.ok) throw new Error('x');
    VER = +d.v || 1;
    if (m) show(m[1]); else newForm();
  }).catch(function () {
    $('chk-app').innerHTML = '<div class="cn-box">' + menorah(1) + '<h2>החנוכייה המשותפת נפתחת בקרוב</h2><p class="cn-sm">אנחנו מכינים אותה לקראת החג. בינתיים אפשר להשתמש בלוח שמונה הנרות.</p></div>';
  });
})();
