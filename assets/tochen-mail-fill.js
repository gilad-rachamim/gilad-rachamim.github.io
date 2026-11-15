// ניסוח מייל: מנוע המילוי של הנוסחים (assets/tochen-mail.json). משותף לכלי באתר ולתוסף לכרום
// (build.py מעתיק את הקובץ הזה ואת ה-JSON אל tools/chatima-ext/).
// {שדה} מתמלא מהערך שהמשתמש כתב; שדה ריק מופיע כ-[שם השדה], כדי שיהיה ברור מה להשלים.
// [[ ... ]] = קטע רשות: נמחק כולו אם אחד השדות בתוכו ריק.
// מגדר הכותב: "מבקש/ת" הופך ל"מבקש" או "מבקשת" (אות סופית מתוקנת: מעריך/ה -> מעריכה).
(function (g) {
  'use strict';
  var FIN = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
  function gender(s, gd) {
    if (gd !== 'm' && gd !== 'f') return s;
    return s.replace(/([א-ת]+)\/(ית|ת|ה|י)(?![א-ת])/g, function (m, w, suf) {
      if (gd === 'm') return w;
      var l = w.slice(-1);
      if (FIN[l]) w = w.slice(0, -1) + FIN[l];
      return w + suf;
    });
  }
  // השדות של סוג מייל, לפי הסדר: של הסוג עצמו, ואחריהם שדות כלליים שמופיעים בנוסח (שם הנמען, השם שלכם)
  function fields(data, t) {
    var out = (t.f || []).slice(), have = {}, txt = '';
    out.forEach(function (f) { have[f.k] = 1; });
    ['he', 'en'].forEach(function (l) { if (t[l]) txt += t[l].b + ' ' + t[l].s.join(' '); });
    var extra = [];
    txt.replace(/\{(\w+)\}/g, function (m, k) {
      if (!have[k] && data.fields && data.fields[k]) { have[k] = 1; var f = data.fields[k]; extra.push({ k: k, l: f.l, ex: f.ex }); }
    });
    // "שם הנמען" בהתחלה, "השם שלכם" בסוף
    extra.sort(function (a, b) { return (a.k === 'name') - (b.k === 'name'); });
    var to = extra.filter(function (f) { return f.k === 'to'; });
    return to.concat(out, extra.filter(function (f) { return f.k !== 'to'; }));
  }
  function clean(v) { return String(v == null ? '' : v).trim().replace(/[.。]+$/, ''); }
  function fill(data, t, lang, vals, gd) {
    var L = t[lang] || t.he, lab = {};
    fields(data, t).forEach(function (f) { lab[f.k] = f.l; });
    vals = vals || {};
    function v(k) { return clean(vals[k]); }
    function one(s) {
      s = s.replace(/\[\[([\s\S]*?)\]\]/g, function (m, inner) {
        var ok = true;
        inner.replace(/\{(\w+)\}/g, function (mm, k) { if (!v(k)) ok = false; return mm; });
        return ok ? inner : '';
      });
      s = s.replace(/\{(\w+)\}/g, function (m, k) { return v(k) || '[' + (lab[k] || k) + ']'; });
      return lang === 'he' ? gender(s, gd) : s;
    }
    return { subjects: L.s.map(one), body: one(L.b) };
  }
  var api = { fields: fields, fill: fill, gender: gender };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else g.HKMail = api;
})(typeof self !== 'undefined' ? self : this);
