// "השיר שלי" – הליבה המשותפת לכל הכלים: השירים השמורים, הברות, חרוזים, העוזר, ושיר הדוגמה.
// הכול נשמר רק בטלפון (localStorage, מפתח shir:v1). שום מילה לא נשמרת בשרת.
(function () {
  'use strict';
  var KEY = 'shir:v1';
  var HELP_URL = 'https://kelim-shir.gilad4049.workers.dev/help';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  // ---------- שיר הדוגמה (מקורי, נכתב לכלי הזה) ----------
  function example() {
    return {
      id: 'demo', demo: 1, title: 'בוקר חדש', author: '', topic: 'בוקר חדש אחרי תקופה קשה', forWhom: 'לעצמי', mood: 'תקווה', rhyme: 'yes',
      answers: { what: 'עברה עליי תקופה קשה, לילות בלי שינה', felt: 'שאני תקוע ולא זז', helped: 'אמא, והשמש שנכנסת בבוקר', say: 'שאפשר להתחיל מחדש', one: 'כל בוקר הוא התחלה' },
      parts: [
        { id: 'v1', type: 'verse', lines: [{ t: 'פותח את החלון לאור' }, { t: 'הלילה כבר מאחוריי' }, { t: 'יש בי עוד כוח לחזור' }, { t: 'ולהתחיל את חיי' }] },
        { id: 'c', type: 'chorus', lines: [{ t: 'בוקר חדש עולה עליי' }, { t: 'השמש שוב קוראת בשמי' }, { t: 'מה שהיה כבר לא כאן' }, { t: 'ואני כאן, אני כאן' }] },
        { id: 'v2', type: 'verse', lines: [{ t: 'אמא שולחת לי חיוך' }, { t: 'והקפה עוד חם ביד' }, { t: 'הדרך עוד ארוכה, נכון' }, { t: 'אבל אני כבר לא לבד' }] }
      ],
      order: ['v1', 'c', 'v2', 'c'],
      updated: Date.now()
    };
  }
  function blank() {
    return { id: uid(), title: '', author: '', topic: '', forWhom: '', mood: '', rhyme: 'yes', answers: {},
      parts: [{ id: 'v1', type: 'verse', lines: [{ t: '' }] }, { id: 'c', type: 'chorus', lines: [{ t: '' }] }, { id: 'v2', type: 'verse', lines: [{ t: '' }] }],
      order: ['v1', 'c', 'v2', 'c'], updated: Date.now() };
  }

  // ---------- שמירה ----------
  var db = null;
  function load() {
    if (db) return db;
    try { db = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { db = null; }
    if (!db || !db.songs) { var d = example(); db = { cur: d.id, songs: {} }; db.songs[d.id] = d; }
    if (!db.songs[db.cur]) db.cur = Object.keys(db.songs)[0];
    if (!db.cur) { var b = blank(); db.songs[b.id] = b; db.cur = b.id; }
    return db;
  }
  function save() { try { var s = cur(); if (s) s.updated = Date.now(); localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} }
  function cur() { return load().songs[db.cur]; }
  function list() { load(); return Object.keys(db.songs).map(function (k) { return db.songs[k]; }).sort(function (a, b) { return (b.updated || 0) - (a.updated || 0); }); }
  function select(id) { load(); if (db.songs[id]) { db.cur = id; save(); } return cur(); }
  function create() { load(); var b = blank(); db.songs[b.id] = b; db.cur = b.id; save(); return b; }
  function remove(id) { load(); delete db.songs[id]; if (db.cur === id) db.cur = Object.keys(db.songs)[0]; if (!db.cur) create(); save(); }
  function undemo(s) { if (s && s.demo) { s.demo = 0; } }

  // ---------- חלקים ----------
  var TYPE_NAME = { verse: 'בית', chorus: 'פזמון', bridge: 'גשר' };
  function partName(song, p) {
    if (p.type !== 'verse') return TYPE_NAME[p.type];
    var n = 0; for (var i = 0; i < song.parts.length; i++) { if (song.parts[i].type === 'verse') n++; if (song.parts[i] === p) break; }
    return 'בית ' + n;
  }
  function part(song, id) { for (var i = 0; i < song.parts.length; i++) if (song.parts[i].id === id) return song.parts[i]; return null; }
  // השיר לפי סדר השירה: [{part, name, lines:[text]}]
  function sung(song) {
    return (song.order || []).map(function (id) { var p = part(song, id); return p ? { part: p, name: partName(song, p), lines: p.lines.map(function (l) { return l.t; }).filter(function (t) { return t && t.trim(); }) } : null; })
      .filter(function (x) { return x && x.lines.length; });
  }
  function plain(song) {
    var seen = {};
    return (song.order || []).map(function (id) {
      var p = part(song, id); if (!p) return '';
      var txt = p.lines.map(function (l) { return l.t; }).filter(Boolean).join('\n'); if (!txt) return '';
      if (seen[id]) return '(' + partName(song, p) + ')'; seen[id] = 1;
      return '[' + partName(song, p) + ']\n' + txt;
    }).filter(Boolean).join('\n\n');
  }

  // ---------- הברות (בערך – בלי ניקוד) ----------
  function words(t) { return String(t || '').replace(/[^א-תA-Za-z0-9'״"\s-]/g, ' ').split(/[\s-]+/).filter(function (w) { return /[א-תA-Za-z0-9]/.test(w); }); }
  function wordSyl(w) {
    w = w.replace(/['״"]/g, '');
    var n = w.length; if (!n) return 0;
    if (/^[0-9]+$/.test(w)) return Math.max(1, n);
    return Math.max(1, Math.ceil(n / 2));
  }
  function syllables(t) { return words(t).reduce(function (a, w) { return a + wordSyl(w); }, 0); }
  function lineSyl(l) { return l.s ? l.s : syllables(l.t); }
  // מחלק שורה להברות (חלוקה משוערת של כל מילה לפי מספר ההברות שלה), כדי שאפשר יהיה לצבוע הברה-הברה
  function splitSyl(t, want) {
    var ws = words(t), out = [];
    ws.forEach(function (w, wi) {
      var k = wordSyl(w), clean = w;
      var step = clean.length / k;
      for (var i = 0; i < k; i++) out.push({ s: clean.slice(Math.round(i * step), Math.round((i + 1) * step)), w: wi, last: i === k - 1 });
    });
    if (want && want !== out.length && out.length) { // התאמה לתיקון ידני: מחברים או מפצלים את ההברה האחרונה
      while (out.length > want && out.length > 1) { var a = out.pop(); var b = out[out.length - 1]; if (b.w === a.w) { b.s += a.s; b.last = true; } else { b.s += ' ' + a.s; b.last = true; } }
      while (out.length < want) { var z = out[out.length - 1]; out.push({ s: '', w: z.w, last: true, ext: 1 }); }
    }
    return out;
  }

  // ---------- חרוזים (מילון בדפדפן, FrequencyWords CC BY-SA 4.0) ----------
  var FIN = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
  function norm(w) { return String(w || '').replace(/[^א-ת]/g, '').replace(/[ךםןףץ]/g, function (c) { return FIN[c]; }); }
  var dict = null, dictP = null;
  function loadDict() {
    if (dict) return Promise.resolve(dict);
    if (!dictP) dictP = fetch('/assets/vendor/frequencywords-he/he-20k.txt').then(function (r) { return r.text(); }).then(function (t) { dict = t.split('\n').filter(Boolean); return dict; });
    return dictP;
  }
  function lastWord(t) { var w = words(t); return w.length ? w[w.length - 1] : ''; }
  // חרוז = אותן 3 אותיות אחרונות (ואם אין מספיק – 2), ממוין לפי שכיחות
  function rhymes(word, max) {
    return loadDict().then(function (d) {
      var n = norm(word); if (n.length < 2) return [];
      var res = [], seen = {}; seen[n] = 1;
      [3, 2].forEach(function (k) {
        if (n.length < k || res.length >= (max || 24)) return;
        var end = n.slice(-k);
        for (var i = 0; i < d.length && res.length < (max || 24); i++) {
          var w = d[i], nw = norm(w);
          if (nw.length > k && !seen[nw] && nw.slice(-k) === end) { seen[nw] = 1; res.push(w); }
        }
      });
      return res;
    });
  }

  // ---------- העוזר (Workers AI דרך kelim-shir) ----------
  var REST = 'העוזר נח להיום. אפשר להמשיך לכתוב, והוא חוזר מחר.';
  function songForHelp(song) {
    return { topic: song.topic, forWhom: song.forWhom, mood: song.mood, rhyme: song.rhyme,
      answers: Object.keys(song.answers || {}).map(function (k) { return song.answers[k]; }).filter(Boolean),
      sections: (song.parts || []).map(function (p) { return { name: partName(song, p), lines: p.lines.map(function (l) { return l.t; }).filter(Boolean) }; }) };
  }
  function ask(task, song, line) {
    if (navigator.onLine === false) return Promise.reject({ msg: REST });
    var body = JSON.stringify({ task: task, song: songForHelp(song), line: line || {} });
    if (body.length > 1990) { var s = songForHelp(song); s.sections = s.sections.slice(-2); s.answers = s.answers.slice(0, 3); body = JSON.stringify({ task: task, song: s, line: line || {} }); }
    var ctl = window.AbortController ? new AbortController() : null;
    var to = setTimeout(function () { if (ctl) ctl.abort(); }, 25000);
    return fetch(HELP_URL, { method: 'POST', headers: (function (h) { try { var c = localStorage.getItem('kelim-partner'); if (c) h['x-kelim-partner'] = c; } catch (e) {} return h; })({ 'content-type': 'application/json' }), body: body, signal: ctl && ctl.signal })
      .then(function (r) { clearTimeout(to); return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || !j.options || !j.options.length) throw { msg: REST, code: r.status }; return j.options; }); },
        function () { clearTimeout(to); throw { msg: REST }; });
  }

  function wa(text) { return 'https://wa.me/?text=' + encodeURIComponent(text); }
  function used(tool, how) { try { if (window.toolUsed) window.toolUsed(tool, { how: how }); } catch (e) {} }

  window.Shir = { load: load, save: save, cur: cur, list: list, select: select, create: create, remove: remove, undemo: undemo, example: example,
    part: part, partName: partName, sung: sung, plain: plain, words: words, syllables: syllables, lineSyl: lineSyl, splitSyl: splitSyl,
    rhymes: rhymes, lastWord: lastWord, norm: norm, ask: ask, REST: REST, esc: esc, uid: uid, wa: wa, used: used, TYPE_NAME: TYPE_NAME };
})();
