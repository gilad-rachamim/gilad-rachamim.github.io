// טקסט תהילים מספריא (api/v3/texts, כמו mekorot.js) – משותף לסיום תהילים ולתהילים לפי שם.
// בלי טעמים, עם ניקוד. השם המפורש נכתב ה' (הדף מודפס ונשלח). תקלת רשת: עוד שני ניסיונות.
(function () {
  'use strict';
  var HEB = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'], TENS = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'], HUND = ['', 'ק', 'ר', 'ש', 'ת'];
  // מספר → אותיות (טו, טז במקום יה, יו)
  function num(n) {
    var s = HUND[Math.floor(n / 100)] || '', r = n % 100;
    if (r === 15) return s + 'טו';
    if (r === 16) return s + 'טז';
    return s + TENS[Math.floor(r / 10)] + HEB[r % 10];
  }
  function clean(t) {
    return String(t || '')
      .replace(/<sup[^>]*>.*?<\/sup>/g, '').replace(/<i class="footnote">.*?<\/i>/g, '')
      .replace(/<span class="mam-kq-k">.*?<\/span>/g, '')                       // כתיב: לא קוראים
      .replace(/<span class="mam-kq-q">\[(.*?)\]<\/span>/g, '$1')               // קרי: בלי סוגריים
      .replace(/<[^>]+>/g, '').replace(/&nbsp;|&thinsp;/g, ' ')
      .replace(/[֑-ֽ֯]/g, '')                                    // טעמים ומתג
      .replace(/\{[פס]\}/g, '')
      .replace(/י[ְ-ׇ]*ה[ְ-ׇ]*ו[ְ-ׇ]*ה[ְ-ׇ]*/g, "ה'") // השם
      .replace(/\s+/g, ' ').trim();
  }
  var cache = {};
  function get(u, tries) {
    return fetch(u).then(function (r) { return r.ok ? r.json() : null; }, function (err) {
      if (tries > 0) return new Promise(function (ok) { setTimeout(ok, 1500); }).then(function () { return get(u, tries - 1); });
      throw err;
    });
  }
  // ref כמו "Psalms.119" או "Psalms.119.97-176" → [{v: מספר פסוק, t: טקסט}]
  function load(ref) {
    if (cache[ref]) return Promise.resolve(cache[ref]);
    var m = ref.match(/\.(\d+)-/), first = m ? parseInt(m[1], 10) : 1;
    return get('https://www.sefaria.org/api/v3/texts/' + encodeURIComponent(ref) + '?version=hebrew', 2).then(function (d) {
      if (!d || !d.versions || !d.versions.length) return null;
      var arr = d.versions[0].text;
      if (!Array.isArray(arr)) arr = [arr];
      var out = arr.map(function (t, i) { return { v: first + i, t: clean(t) }; }).filter(function (x) { return x.t; });
      if (!out.length) return null;
      cache[ref] = out;
      return out;
    }).catch(function () { return null; });
  }
  window.TehillimText = { load: load, num: num };
})();
