// סידור אנשי קשר: קורא CSV של גוגל / VCF / רשימה מודבקת, מאחד מספרים לצורה אחת,
// מוצא כפולים (אותו מספר), בלי שם, בלי מספר, מספר לא תקין, מוסיף תגית, ומוציא CSV/VCF.
// הכול בדפדפן. נשמר רק ב-localStorage של המכשיר.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  if (!$('sd-work')) return;
  var KEY = 'kelim-sidur';
  var MAXROWS = 150;

  // ---------- מספרים ----------
  function norm(raw) {
    var s = String(raw || '').trim();
    var short = s.replace(/[\s\-]/g, '');
    if (/^[*#]\d{2,5}#?$/.test(short) || /^\d{3,5}$/.test(short)) return { raw: s, key: short, ok: true, kind: 'short' };
    // שולח הודעות SMS בשם (Cal, SHIKUM) – לא מספר, אבל גם לא טעות
    if (/[A-Za-z]/.test(s) && /^[A-Za-z][A-Za-z0-9 .\-]{1,15}$/.test(s)) return { raw: s, key: 'S:' + s.toLowerCase(), ok: true, kind: 'short' };
    var d = s.replace(/[^\d+]/g, '');
    if (d.indexOf('+') > 0) d = d.replace(/\+/g, '');
    if (/^\+9721[5-9]/.test(d)) d = d.slice(4);
    else if (/^\+972/.test(d)) d = '0' + d.slice(4);
    else if (/^00972/.test(d)) d = '0' + d.slice(5);
    else if (/^972\d{8,9}$/.test(d)) d = '0' + d.slice(3);
    else if (/^5\d{8}$/.test(d)) d = '0' + d;
    else if (/^00[1-9]/.test(d)) d = '+' + d.slice(2);
    var kind = '';
    if (/^05\d{8}$/.test(d)) kind = 'mob';
    else if (/^07\d{8}$/.test(d)) kind = 'mob';
    else if (/^0[23489]\d{7}$/.test(d)) kind = 'land';
    else if (/^1[5-9]\d{2}\d{5,6}$/.test(d) || /^153\d{8}$/.test(d)) kind = 'biz';
    else if (/^\+\d{8,15}$/.test(d)) kind = 'abroad';
    return { raw: s, key: d.replace(/^\+/, ''), ok: !!kind, kind: kind, d: d };
  }
  function fmt(p, mode) {
    if (!p.ok) return p.raw;
    var d = p.d || p.key;
    if (p.kind === 'short' || p.kind === 'abroad') return p.kind === 'short' ? (p.key.indexOf('S:') === 0 ? p.raw : p.key) : d;
    if (p.kind === 'biz') return d.length === 11 ? d.slice(0, 3) + '-' + d.slice(3, 4) + '-' + d.slice(4) : d.slice(0, 1) + '-' + d.slice(1, 4) + '-' + d.slice(4, 7) + '-' + d.slice(7);
    if (mode === 'intl') {
      var r = d.slice(1);
      return p.kind === 'mob' ? '+972 ' + r.slice(0, 2) + '-' + r.slice(2, 5) + '-' + r.slice(5) : '+972 ' + r.slice(0, 1) + '-' + r.slice(1, 4) + '-' + r.slice(4);
    }
    return p.kind === 'mob' ? d.slice(0, 3) + '-' + d.slice(3) : d.slice(0, 2) + '-' + d.slice(2);
  }
  function cleanName(n) {
    return String(n || '').replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, '').replace(/\s+/g, ' ').trim();
  }
  function uniqPhones(list) {
    var seen = {}, out = [];
    list.forEach(function (p) {
      if (!p || !p.raw) return;
      var k = p.key || p.raw;
      if (seen[k]) return;
      seen[k] = 1; out.push(p);
    });
    return out;
  }

  // ---------- קריאת קבצים ----------
  function parseCSV(text) {
    var rows = [], row = [], cell = '', q = false, i, c;
    for (i = 0; i < text.length; i++) {
      c = text.charAt(i);
      if (q) {
        if (c === '"') { if (text.charAt(i + 1) === '"') { cell += '"'; i++; } else q = false; }
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text.charAt(i + 1) === '\n') i++;
        row.push(cell); cell = '';
        if (row.join('') !== '') rows.push(row);
        row = [];
      } else cell += c;
    }
    row.push(cell);
    if (row.join('') !== '') rows.push(row);
    return rows;
  }
  var NAME_MAIN = /^(name|first name|given name|display name|full name|שם|שם פרטי|שם מלא)$/i;
  var NAME_REST = /^(middle name|last name|family name|additional name|name prefix|name suffix|שם משפחה)$/i;
  function isPhoneCol(h) {
    h = h.toLowerCase();
    if (/label|type|תווית|סוג/.test(h)) return false;
    return /phone.*value|phone$|^mobile|^telephone|^טלפון|נייד/.test(h);
  }
  function fromCSV(text) {
    var rows = parseCSV(text.replace(/^\ufeff/, ''));
    if (!rows.length) return null;
    var h = rows[0].map(function (x) { return x.trim(); });
    var phoneCols = [], mainCols = [], restCols = [];
    h.forEach(function (x, i) {
      if (isPhoneCol(x)) phoneCols.push(i);
      else if (NAME_MAIN.test(x)) mainCols.push(i);
      else if (NAME_REST.test(x)) restCols.push(i);
    });
    if (!phoneCols.length && !mainCols.length) return fromText(text);
    var contacts = rows.slice(1).map(function (r) {
      var parts = [];
      var full = '';
      mainCols.forEach(function (i) { if (/^(name|display name|full name|שם מלא)$/i.test(h[i]) && r[i]) full = r[i]; });
      if (!full) {
        mainCols.concat(restCols).sort(function (a, b) { return a - b; }).forEach(function (i) {
          if (!/^(name prefix|name suffix)$/i.test(h[i]) && r[i]) parts.push(r[i]);
        });
        full = parts.join(' ');
      }
      var ph = [];
      phoneCols.forEach(function (i) { String(r[i] || '').split(':::').forEach(function (v) { if (v.trim()) ph.push(norm(v)); }); });
      var ex = {};
      h.forEach(function (x, i) { if (phoneCols.indexOf(i) < 0 && mainCols.indexOf(i) < 0 && restCols.indexOf(i) < 0 && r[i]) ex[i] = r[i]; });
      return mk(full, ph, ex);
    });
    return { src: 'csv', headers: h, phoneCols: phoneCols, mainCols: mainCols, restCols: restCols, contacts: contacts };
  }
  function qpDecode(v) {
    var bytes = [], i;
    for (i = 0; i < v.length; i++) {
      if (v.charAt(i) === '=' && /^[0-9A-F]{2}$/i.test(v.substr(i + 1, 2))) { bytes.push(parseInt(v.substr(i + 1, 2), 16)); i += 2; }
      else bytes.push(v.charCodeAt(i) & 255);
    }
    try { return new TextDecoder('utf-8').decode(new Uint8Array(bytes)); } catch (e) { return v; }
  }
  function vUnesc(v) { return v.replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1'); }
  function fromVCF(text) {
    text = text.replace(/\r\n/g, '\n').replace(/=\n/g, '').replace(/\n[ \t]/g, '');
    var lines = text.split('\n'), contacts = [], cur = null;
    lines.forEach(function (line) {
      if (/^BEGIN:VCARD/i.test(line)) { cur = { fn: '', n: '', ph: [], ex: [] }; return; }
      if (/^END:VCARD/i.test(line)) {
        if (cur) contacts.push(mk(cur.fn || cur.n, cur.ph, cur.ex));
        cur = null; return;
      }
      if (!cur || !line.trim()) return;
      var ci = line.indexOf(':');
      if (ci < 0) return;
      var left = line.slice(0, ci), val = line.slice(ci + 1);
      var params = left.split(';');
      var prop = params[0].replace(/^[^.]*\./, '').toUpperCase();
      if (/ENCODING=QUOTED-PRINTABLE/i.test(left)) val = qpDecode(val);
      if (prop === 'VERSION' || prop === 'PRODID') return;
      if (prop === 'FN') cur.fn = vUnesc(val);
      else if (prop === 'N') {
        var p = val.replace(/\\;/g, '\u0000').split(';').map(function (x) { return vUnesc(x.replace(/\u0000/g, ';')); });
        cur.n = [p[1], p[2], p[0]].filter(Boolean).join(' ');
      } else if (prop === 'TEL') cur.ph.push(norm(val));
      else cur.ex.push(line);
    });
    return { src: 'vcf', contacts: contacts };
  }
  var PH_RE = /(\+?\d[\d\s\-().]{5,}\d|\*\d{2,5})/g;
  function fromText(text) {
    var contacts = [];
    text.split(/\r?\n/).forEach(function (line) {
      if (!line.trim()) return;
      var ph = (line.match(PH_RE) || []).map(norm);
      var name = line.replace(PH_RE, ' ').replace(/[,;|\t:]+/g, ' ').replace(/\s-\s/g, ' ');
      contacts.push(mk(name, ph, null));
    });
    return { src: 'text', contacts: contacts };
  }
  var uid = 0;
  function mk(name, ph, ex) {
    return { id: 'c' + (++uid) + Date.now().toString(36), raw: String(name || '').trim(), name: cleanName(name), ph: uniqPhones(ph), ex: ex, sel: false };
  }

  // ---------- מצב ----------
  var S = null, hist = [], view = 'dup', search = '', shown = MAXROWS;
  function save() {
    if (!S || S.demo) return;
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {
      say('הרשימה גדולה מכדי לשמור במכשיר. אפשר להמשיך, רק לא לסגור את הדף באמצע.');
    }
  }
  function load() {
    try { var j = localStorage.getItem(KEY); if (j) { S = JSON.parse(j); return true; } } catch (e) {}
    return false;
  }
  function snap() {
    hist.push(JSON.stringify(S));
    if (hist.length > 30) hist.shift();
    $('sd-undo').disabled = false;
  }
  function say(t) { $('sd-msg').textContent = t || ''; }
  function begin(res, how) {
    if (!res || !res.contacts.length) { say('לא מצאתי אנשי קשר. בודקים שזה קובץ CSV או VCF, או שבכל שורה יש שם ומספר.'); return; }
    var fixedNames = 0, fixedPh = 0, inner = 0;
    res.contacts.forEach(function (c) {
      if (c.raw !== c.name) fixedNames++;
      c.ph.forEach(function (p) { if (p.ok && fmt(p, 'il') !== p.raw && fmt(p, 'intl') !== p.raw) fixedPh++; });
      delete c.raw;
    });
    res.fixedNames = fixedNames; res.fixedPh = fixedPh;
    res.ignore = []; res.fmt = (S && S.fmt) || 'il'; res.demo = /^demo/.test(how);
    S = res; hist = []; $('sd-undo').disabled = true;
    search = ''; shown = MAXROWS;
    var C = cats();
    view = ['dup', 'noname', 'bad', 'nophone'].filter(function (k) { return C[k].length; })[0] || 'all';
    save(); show();
    say('נטענו ' + S.contacts.length + ' אנשי קשר.');
    if (how !== 'demo-auto' && window.toolUsed) window.toolUsed('sidur', { how: how, n: S.contacts.length });
  }

  // ---------- ניתוח ----------
  function groups() {
    var parent = {}, byKey = {}, list = S.contacts;
    function f(x) { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }
    list.forEach(function (c) { parent[c.id] = c.id; });
    list.forEach(function (c) {
      c.ph.forEach(function (p) {
        if (!p.key || p.key.length < 7) return;
        if (byKey[p.key]) parent[f(c.id)] = f(byKey[p.key]); else byKey[p.key] = c.id;
      });
    });
    var g = {};
    list.forEach(function (c) { var r = f(c.id); (g[r] = g[r] || []).push(c); });
    var dup = [];
    Object.keys(g).forEach(function (k) {
      if (g[k].length < 2) return;
      var sig = g[k].map(function (c) { return c.id; }).sort().join(',');
      if (S.ignore.indexOf(sig) < 0) dup.push({ sig: sig, items: g[k], why: sameName(g[k]) ? 'same' : 'phone' });
    });
    var byName = {};
    list.forEach(function (c) { if (c.name) (byName[c.name] = byName[c.name] || []).push(c); });
    var same = [];
    Object.keys(byName).forEach(function (n) {
      var it = byName[n];
      if (it.length < 2) return;
      if (f(it[0].id) === f(it[1].id) && it.every(function (c) { return f(c.id) === f(it[0].id); })) return;
      var sig = 'n:' + it.map(function (c) { return c.id; }).sort().join(',');
      if (S.ignore.indexOf(sig) < 0) same.push({ sig: sig, items: it, why: 'name' });
    });
    return { dup: dup, same: same };
  }
  // "בטוח" = כל המילים של השם הקצר נמצאות בשם הארוך (אמא של יאיר זכריה / אמא יאיר זכריה), או שאין שם.
  function words(n) { return n.replace(/[()'"״׳\-–,.]/g, ' ').split(/\s+/).filter(Boolean); }
  function sameName(items) {
    var named = items.filter(function (c) { return c.name; });
    if (named.length < 2) return true;
    var big = words(longest(named));
    return named.every(function (c) { return words(c.name).every(function (w) { return big.indexOf(w) >= 0; }); });
  }
  function cats() {
    var G = groups();
    var safe = G.dup.filter(function (g) { return g.why === 'same'; });
    return {
      dup: safe.concat(G.dup.filter(function (g) { return g.why === 'phone'; }), G.same),
      dupPhone: safe.length,
      noname: S.contacts.filter(function (c) { return !c.name; }),
      nophone: S.contacts.filter(function (c) { return !c.ph.length; }),
      bad: S.contacts.filter(function (c) { return c.ph.some(function (p) { return !p.ok; }); }),
      all: S.contacts
    };
  }

  // ---------- פעולות ----------
  function longest(items) {
    return items.map(function (c) { return c.name; }).sort(function (a, b) { return b.length - a.length; })[0] || '';
  }
  function mergeEx(items) {
    if (S.src === 'vcf') {
      var seen = {}, out = [];
      items.forEach(function (c) { (c.ex || []).forEach(function (l) { if (!seen[l]) { seen[l] = 1; out.push(l); } }); });
      return out;
    }
    if (S.src === 'csv') {
      var o = {};
      items.forEach(function (c) {
        Object.keys(c.ex || {}).forEach(function (k) {
          var v = c.ex[k];
          if (!o[k]) o[k] = v;
          else if (o[k] !== v && /mail.*value|labels|notes|הערות/i.test(S.headers[k])) {
            var parts = o[k].split(' ::: ');
            v.split(' ::: ').forEach(function (x) { if (parts.indexOf(x) < 0) parts.push(x); });
            o[k] = parts.join(' ::: ');
          }
        });
      });
      return o;
    }
    return null;
  }
  function merge(items, name) {
    var keep = items[0];
    keep.name = name || longest(items);
    keep.ph = uniqPhones([].concat.apply([], items.map(function (c) { return c.ph; })));
    keep.ex = mergeEx(items);
    var drop = items.slice(1).map(function (c) { return c.id; });
    S.contacts = S.contacts.filter(function (c) { return drop.indexOf(c.id) < 0; });
  }
  function byId(id) { for (var i = 0; i < S.contacts.length; i++) if (S.contacts[i].id === id) return S.contacts[i]; return null; }

  // ---------- תצוגה ----------
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function phText(c) { return c.ph.map(function (p) { return fmt(p, S.fmt); }).join(', '); }
  function show() {
    $('sd-work').hidden = false;
    var C = cats();
    var tabs = [['dup', 'כפולים', C.dup.length, 1], ['noname', 'בלי שם', C.noname.length, 1], ['nophone', 'בלי מספר', C.nophone.length, 1], ['bad', 'מספר לא תקין', C.bad.length, 1], ['all', 'כולם', C.all.length, 0]];
    $('sd-sum').innerHTML = tabs.map(function (t) {
      return '<button type="button" role="tab" class="sd-chip' + (t[3] && t[2] ? ' warn' : '') + (view === t[0] ? ' on' : '') + '" data-v="' + t[0] + '" aria-selected="' + (view === t[0]) + '">' + t[1] + ' <b>' + t[2] + '</b></button>';
    }).join('');
    var fx = [];
    if (S.fixedPh) fx.push(S.fixedPh + ' מספרים סודרו לצורה אחת');
    if (S.fixedNames) fx.push(S.fixedNames + ' שמות נוקו מרווחים מיותרים');
    $('sd-fixed').textContent = fx.length ? '✓ כבר תוקן לבד: ' + fx.join(', ') + '.' : '';
    var h = '';
    if (view === 'dup') {
      if (!C.dup.length) h = '<p class="sd-empty">אין כפולים. 👌</p>';
      else {
        if (C.dupPhone > 1) h += '<div class="sd-bar" style="margin-top:0"><button class="btn btn-gold btn-sm" type="button" data-a="mergeall">למזג בבת אחת ' + C.dupPhone + ' כפולים בטוחים (אותו מספר ואותו שם)</button></div>' +
          '<p class="sd-note">כפולים עם אותו מספר אבל שם אחר (למשל בני זוג עם טלפון משותף) לא מתמזגים לבד. בהם בוחרים איזה שם להשאיר.</p>';
        var TITLE = { same: 'כנראה אותו אדם, שמור ' + '{n}' + ' פעמים', phone: 'אותו מספר, שמות שונים', name: 'אותו שם, מספרים שונים' };
        h += '<div class="sd-list">' + C.dup.slice(0, shown).map(function (g) {
          var names = [];
          g.items.forEach(function (c) { if (c.name && names.indexOf(c.name) < 0) names.push(c.name); });
          var btns = g.why === 'same' || names.length < 2
            ? '<button class="btn btn-gold btn-sm" type="button" data-a="merge" data-s="' + g.sig + '">למזג לאחד: ' + esc(longest(g.items)) + '</button>'
            : names.slice(0, 4).map(function (n, i) { return '<button class="btn btn-' + (i ? 'line' : 'gold') + ' btn-sm" type="button" data-a="merge" data-s="' + g.sig + '" data-n="' + esc(n) + '">למזג בשם: ' + esc(n) + '</button>'; }).join('');
          return '<div class="sd-grp"><h3>' + TITLE[g.why].replace('{n}', g.items.length) + '</h3><ul>' +
            g.items.map(function (c) { return '<li>' + (c.name ? esc(c.name) : '<i>(בלי שם)</i>') + ' – ' + (esc(phText(c)) || 'בלי מספר') + '</li>'; }).join('') + '</ul>' +
            (g.why === 'name' ? '<p class="why">אולי זה אותו אדם עם שני מספרים, ואולי שני אנשים שונים. אתם מחליטים.</p>' : '') +
            (g.why === 'phone' ? '<p class="why">אולי אותו אדם שנשמר פעמיים בשמות שונים, ואולי שני אנשים עם טלפון משותף.</p>' : '') +
            '<div class="actions">' + btns + '<button class="btn btn-line btn-sm" type="button" data-a="ignore" data-s="' + g.sig + '">' + (g.why === 'same' ? 'להשאיר כך' : 'אלה אנשים שונים') + '</button></div></div>';
        }).join('') + '</div>';
        if (C.dup.length > shown) h += more();
      }
    } else {
      var list = C[view];
      if (view === 'all') {
        h += '<div class="sd-bar" style="margin-top:0"><input type="text" id="sd-q" placeholder="חיפוש בשם או במספר" value="' + esc(search) + '"><button class="btn btn-line btn-sm" type="button" data-a="selall">לסמן את כל התוצאות</button><button class="btn btn-line btn-sm" type="button" data-a="selnone">לבטל סימון</button></div>';
        if (search) {
          var q = search.toLowerCase(), qd = search.replace(/\D/g, '');
          list = list.filter(function (c) { return c.name.toLowerCase().indexOf(q) >= 0 || (qd.length > 2 && c.ph.some(function (p) { return (p.key || '').indexOf(qd.replace(/^0/, '')) >= 0; })); });
        }
        var nsel = S.contacts.filter(function (c) { return c.sel; }).length;
        if (nsel) h += '<p class="sd-note">מסומנים: ' + nsel + '</p>';
      }
      if (view === 'noname' && list.length) h += '<p class="sd-note">כתבו שם ליד המספר, או מחקו מספר שלא צריך.</p>';
      if (view === 'bad' && list.length) h += '<p class="sd-note">המספרים האלה לא נראים כמו מספר ישראלי תקין (חסרה ספרה, יש ספרה מיותרת). אפשר לתקן בשורה.</p>';
      if (!list.length) h += '<p class="sd-empty">' + (view === 'all' ? 'לא נמצא.' : 'אין כאלה. 👌') + '</p>';
      h += '<div class="sd-list">' + list.slice(0, shown).map(row).join('') + '</div>';
      if (list.length > shown) h += more();
    }
    $('sd-view').innerHTML = h;
    var fr = document.querySelector('input[name=sd-fmt][value="' + S.fmt + '"]');
    if (fr) fr.checked = true;
  }
  function more() { return '<div class="sd-bar"><button class="btn btn-line btn-sm" type="button" data-a="more">להציג עוד</button></div>'; }
  function row(c) {
    var bad = c.ph.filter(function (p) { return !p.ok; }).map(function (p) { return p.raw; });
    return '<div class="sd-row" data-id="' + c.id + '"><input type="checkbox" aria-label="לסמן" data-a="sel"' + (c.sel ? ' checked' : '') + '>' +
      '<div><input type="text" data-f="name" aria-label="שם" placeholder="שם" value="' + esc(c.name) + '">' +
      '<input type="text" class="ph" data-f="ph" aria-label="מספרים" inputmode="tel" placeholder="מספר" value="' + esc(phText(c)) + '">' +
      (bad.length ? '<div class="bad">⚠ לא תקין: ' + esc(bad.join(', ')) + '</div>' : '') + '</div>' +
      '<button type="button" class="sd-x" data-a="del" aria-label="למחוק את איש הקשר">✕</button></div>';
  }

  // ---------- ייצוא ----------
  function download(name, text, type) {
    var blob = new Blob([text], { type: type + ';charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  function csvCell(v) { v = String(v == null ? '' : v); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function toCSV() {
    var out = [];
    if (S.src === 'csv') {
      var h = S.headers;
      out.push(h.map(csvCell).join(','));
      S.contacts.forEach(function (c) {
        var r = h.map(function (x, i) { return (c.ex && c.ex[i]) || ''; });
        var mainSet = false;
        S.mainCols.forEach(function (i) { r[i] = c.name; mainSet = true; });
        S.restCols.forEach(function (i) { r[i] = mainSet ? '' : r[i]; });
        var ph = c.ph.map(function (p) { return fmt(p, S.fmt); });
        S.phoneCols.forEach(function (col, k) {
          var last = k === S.phoneCols.length - 1;
          r[col] = last ? ph.slice(k).join(' ::: ') : (ph[k] || '');
        });
        out.push(r.map(csvCell).join(','));
      });
    } else {
      var max = Math.max(1, Math.max.apply(null, S.contacts.map(function (c) { return c.ph.length; })));
      var hd = ['First Name', 'Last Name'];
      for (var i = 1; i <= max; i++) hd.push('Phone ' + i + ' - Label', 'Phone ' + i + ' - Value');
      out.push(hd.join(','));
      S.contacts.forEach(function (c) {
        var r = [c.name, ''];
        for (var k = 0; k < max; k++) { var p = c.ph[k]; r.push(p ? 'Mobile' : '', p ? fmt(p, S.fmt) : ''); }
        out.push(r.map(csvCell).join(','));
      });
    }
    return '\ufeff' + out.join('\r\n') + '\r\n';
  }
  function vEsc(v) { return String(v).replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;'); }
  function toVCF() {
    return S.contacts.map(function (c) {
      var L = ['BEGIN:VCARD', 'VERSION:3.0', 'FN:' + vEsc(c.name || phText(c)), 'N:;' + vEsc(c.name) + ';;;'];
      c.ph.forEach(function (p) { L.push('TEL;TYPE=CELL:' + fmt(p, S.fmt)); });
      if (S.src === 'vcf') (c.ex || []).forEach(function (l) { L.push(l); });
      else if (S.src === 'csv' && c.ex) {
        Object.keys(c.ex).forEach(function (k) {
          if (/mail.*value/i.test(S.headers[k])) c.ex[k].split(' ::: ').forEach(function (m) { if (m.trim()) L.push('EMAIL:' + m.trim()); });
          if (/^birthday$/i.test(S.headers[k])) L.push('BDAY:' + c.ex[k]);
          if (/^notes$/i.test(S.headers[k])) L.push('NOTE:' + vEsc(c.ex[k]).replace(/\r?\n/g, '\\n'));
        });
      }
      L.push('END:VCARD');
      return L.join('\r\n');
    }).join('\r\n') + '\r\n';
  }
  function stamp() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }

  // ---------- אירועים ----------
  $('sd-file').addEventListener('change', function () {
    var f = this.files && this.files[0];
    if (!f) return;
    $('sd-fname').textContent = f.name;
    $('sd-paste').value = '';
    var r = new FileReader();
    r.onload = function () {
      var t = String(r.result || '');
      var res = /BEGIN:VCARD/i.test(t) ? fromVCF(t) : (/\.csv$/i.test(f.name) || /,/.test(t.split('\n')[0]) ? fromCSV(t) : fromText(t));
      begin(res, 'file');
    };
    r.onerror = function () { say('לא הצלחתי לקרוא את הקובץ.'); };
    r.readAsText(f);
  });
  $('sd-go').addEventListener('click', function () {
    var t = $('sd-paste').value;
    if (!t.trim()) { say('מדביקים קודם רשימה: שם ומספר בכל שורה.'); return; }
    begin(/BEGIN:VCARD/i.test(t) ? fromVCF(t) : fromText(t), 'paste');
  });
  var DEMO = 'דני כהן 050-1234567\nדני +972501234567\nאמא 052-7654321, 0527654321\n054-9998877\nרותי לוי\nשרה מהגן 03-5551234\nיוסי אינסטלטור 052-12345\nמשה   ישיבת שעלבים 0541112233\nמשה ישיבת שעלבים 054-111-2233\nמרים 0587773344\nדוד 0501112222\nדוד 0503334444\nמוקד העירייה 106';
  $('sd-demo').addEventListener('click', function () { $('sd-paste').value = DEMO; begin(fromText(DEMO), 'demo'); });

  $('sd-sum').addEventListener('click', function (e) {
    var b = e.target.closest('[data-v]');
    if (!b) return;
    view = b.getAttribute('data-v'); shown = MAXROWS; show();
  });
  $('sd-view').addEventListener('click', function (e) {
    var b = e.target.closest('[data-a]');
    if (!b) return;
    var a = b.getAttribute('data-a');
    var rowEl = b.closest('[data-id]'), c = rowEl && byId(rowEl.getAttribute('data-id'));
    if (a === 'more') { shown += MAXROWS; show(); return; }
    if (a === 'sel') { if (c) { c.sel = b.checked; save(); } return; }
    if (a === 'selall' || a === 'selnone') {
      var ids = {};
      Array.prototype.forEach.call(document.querySelectorAll('#sd-view [data-id]'), function (el) { ids[el.getAttribute('data-id')] = 1; });
      S.contacts.forEach(function (x) { if (a === 'selnone') x.sel = false; else if (ids[x.id] || !search) x.sel = true; });
      save(); show(); return;
    }
    snap();
    var C = cats(), g;
    if (a === 'merge' || a === 'ignore') {
      g = C.dup.filter(function (x) { return x.sig === b.getAttribute('data-s'); })[0];
      if (!g) return;
      if (a === 'merge') { merge(g.items, b.getAttribute('data-n')); if (window.toolUsed) window.toolUsed('sidur', { how: 'merge' }); }
      else S.ignore.push(g.sig);
    } else if (a === 'mergeall') {
      var n = 0;
      C.dup.filter(function (x) { return x.why === 'same'; }).forEach(function (x) { merge(x.items); n++; });
      say('מוזגו ' + n + ' כפולים.');
      if (window.toolUsed) window.toolUsed('sidur', { how: 'mergeall', n: n });
    } else if (a === 'del' && c) {
      S.contacts = S.contacts.filter(function (x) { return x !== c; });
    }
    save(); show();
  });
  $('sd-view').addEventListener('change', function (e) {
    var f = e.target.getAttribute('data-f');
    if (!f) return;
    var c = byId(e.target.closest('[data-id]').getAttribute('data-id'));
    if (!c) return;
    snap();
    if (f === 'name') c.name = cleanName(e.target.value);
    else c.ph = uniqPhones((e.target.value.match(PH_RE) || []).map(norm));
    save(); show();
  });
  $('sd-view').addEventListener('input', function (e) {
    if (e.target.id !== 'sd-q') return;
    search = e.target.value; shown = MAXROWS;
    var pos = e.target.selectionStart;
    show();
    var q = $('sd-q'); if (q) { q.focus(); try { q.setSelectionRange(pos, pos); } catch (er) {} }
  });
  $('sd-undo').addEventListener('click', function () {
    if (!hist.length) return;
    S = JSON.parse(hist.pop());
    this.disabled = !hist.length;
    save(); show(); say('בוטל.');
  });
  $('sd-tag-go').addEventListener('click', function () {
    var t = cleanName($('sd-tag').value);
    var sel = S.contacts.filter(function (c) { return c.sel; });
    if (!t) { say('כותבים קודם את התגית.'); return; }
    if (!sel.length) { say('מסמנים קודם אנשים ברשימה (בלשונית "כולם").'); return; }
    snap();
    var n = 0, had = 0, noname = 0;
    sel.forEach(function (c) {
      if (!c.name) noname++;
      else if (c.name.indexOf(t) >= 0) had++;
      else { c.name = cleanName(c.name + ' ' + t); n++; }
      c.sel = false;
    });
    save(); show();
    var ext = [];
    if (had) ext.push(had + ' כבר היו עם התגית');
    if (noname) ext.push(noname + ' בלי שם, כתבו להם שם קודם');
    say('התגית נוספה ל-' + n + ' אנשים' + (ext.length ? ' (' + ext.join(', ') + ').' : '.'));
    if (window.toolUsed) window.toolUsed('sidur', { how: 'tag', n: n });
  });
  Array.prototype.forEach.call(document.querySelectorAll('input[name=sd-fmt]'), function (r) {
    r.addEventListener('change', function () { if (S) { S.fmt = this.value; save(); show(); } });
  });
  $('sd-csv').addEventListener('click', function () {
    download('אנשי-קשר-מסודרים-' + stamp() + '.csv', toCSV(), 'text/csv');
    if (window.toolUsed) window.toolUsed('sidur', { how: 'csv', n: S.contacts.length });
  });
  $('sd-vcf').addEventListener('click', function () {
    download('אנשי-קשר-מסודרים-' + stamp() + '.vcf', toVCF(), 'text/vcard');
    if (window.toolUsed) window.toolUsed('sidur', { how: 'vcf', n: S.contacts.length });
  });
  $('sd-wipe').addEventListener('click', function () {
    if (!confirm('למחוק את הרשימה מהמכשיר? אנשי הקשר בטלפון ובגוגל לא נפגעים.')) return;
    try { localStorage.removeItem(KEY); } catch (e) {}
    S = null; hist = []; $('sd-work').hidden = true; $('sd-paste').value = ''; $('sd-file').value = '';
    say('נמחק מהמכשיר.');
  });

  // כניסה ראשונה: דוגמה מלאה. כניסה חוזרת: העבודה הקודמת.
  if (load() && S && S.contacts && !S.demo) { show(); say('ממשיכים מאיפה שעצרתם: ' + S.contacts.length + ' אנשי קשר.'); }
  else { $('sd-paste').value = DEMO; var d = fromText(DEMO); begin(d, 'demo-auto'); say('ככה זה נראה, עם רשימה לדוגמה. בוחרים קובץ שלכם או מדביקים רשימה.'); }

  window.__sidur = { norm: norm, fmt: fmt, fromCSV: fromCSV, fromVCF: fromVCF, fromText: fromText, toCSV: function () { return toCSV(); }, toVCF: function () { return toVCF(); }, state: function () { return S; } };
})();
