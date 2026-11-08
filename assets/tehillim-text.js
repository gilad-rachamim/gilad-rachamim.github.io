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
  // מטרות התפילה – משותף לסיום ולתהילים לפי שם. [מפתח, ניסוח לפני השם, שם ברירת מחדל]
  // הבסיסיות נשמרות בשרת כ-p; כל השאר נשלחות כ-p:'other' עם הניסוח (pt), כך שאפשר להוסיף בלי לשנות את השרת.
  var PURPOSES = [
    ['niftar', 'לעילוי נשמת'], ['refua', 'לרפואת'], ['refua-nefesh', 'לרפואת הנפש של'],
    ['parnasa', 'לפרנסה טובה ובשפע ל'], ['zivug', 'לזיווג הגון ל'], ['shalom-bait', 'לשלום בית ל'],
    ['zera', 'לזרע של קיימא ל'], ['leida', 'ללידה קלה ובשעה טובה ל'], ['hatzlacha', 'להצלחת'],
    ['limudim', 'להצלחה בלימודים ובמבחנים של'], ['yeshua', 'לישועת'], ['shmira', 'לשמירת'],
    ['chayalim', 'לשמירת', 'חיילי צה״ל וכוחות הביטחון'], ['hodaya', 'להודיה ולזכות'], ['zchut', 'לזכות'], ['other', '']
  ];
  var CORE = { niftar: 1, refua: 1, hatzlacha: 1, zivug: 1, zchut: 1, other: 1 };
  function phrase(k) { for (var i = 0; i < PURPOSES.length; i++) if (PURPOSES[i][0] === k) return PURPOSES[i][1]; return ''; }
  // "לזיווג הגון ל" + "יעקב" → "לזיווג הגון ליעקב"; אחרת עם רווח
  function join(h, who) { return h ? (/(^|\s)ל$/.test(h) ? h + who : h + ' ' + who) : who; }
  // ממלא <select> במטרות. withOther=false מוריד את "ניסוח אחר"
  function fill(sel, withOther, otherLabel) {
    var cur = sel.value;
    sel.innerHTML = PURPOSES.filter(function (p) { return withOther || p[0] !== 'other'; }).map(function (p) {
      var lab = p[0] === 'other' ? (otherLabel || 'ניסוח אחר') : p[0] === 'chayalim' ? 'לשמירת חיילי צה״ל' : p[1].replace(/ (ל|של)$/, '').replace(/^לזרע של קיימא$/, 'לזרע של קיימא');
      return '<option value="' + p[0] + '">' + lab + '</option>';
    }).join('');
    if (cur && sel.querySelector('option[value="' + cur + '"]')) sel.value = cur;
  }
  window.TehillimText = { load: load, num: num, PURPOSES: PURPOSES, CORE: CORE, phrase: phrase, join: join, fill: fill,
    defName: function (k) { for (var i = 0; i < PURPOSES.length; i++) if (PURPOSES[i][0] === k) return PURPOSES[i][2] || ''; return ''; } };
})();
