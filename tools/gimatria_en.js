// דף הגימטריה באנגלית: src/pages/kodesh/gimatria/en/index.html  ("gematria calculator" ו-"gematria", 10K–100K חיפושים בחודש בארה"ב כל אחד).
// הרצה: node tools/gimatria_en.js  ואז  python build.py
// המנוע הוא אותו assets/kodesh-gimatria.js של הדף העברי; כאן מגדירים window.GM_L (טקסטים באנגלית, שמות הספרים ושמות האותיות),
// ו-assets/gematria-en.js מוסיף מקלדת עברית על המסך וחישוב לאותיות אנגליות (A=1 … Z=26).
// הטבלאות (שמות, מילים, ערכי האותיות) מחושבות כאן בקוד באותה שיטה, ולכן תמיד מדויקות.
// מילות החיפוש והמתחרים: ~/.claude/state/kelim-seo/runs/2026-11-22-gematria-en/
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'src/pages/kodesh/gimatria/en');

// הסגנון של הכלי לקוח מהדף העברי, כדי ששני הדפים ייראו אותו דבר
const heSrc = fs.readFileSync(path.join(ROOT, 'src/pages/kodesh/gimatria/index.html'), 'utf8');
const heMeta = JSON.parse(heSrc.match(/<!--meta ([\s\S]*?) -->/)[1]);
const style = heMeta.head.match(/<style>[\s\S]*?<\/style>/)[0];

const LET = 'אבגדהוזחטיכלמנסעפצקרשת';
const VAL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 300, 400];
const FIN = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
const BIG = { 'ך': 500, 'ם': 600, 'ן': 700, 'ף': 800, 'ץ': 900 };
const NM = ['Alef', 'Bet', 'Gimel', 'Dalet', 'Hei', 'Vav', 'Zayin', 'Chet', 'Tet', 'Yod', 'Kaf', 'Lamed', 'Mem', 'Nun', 'Samech', 'Ayin', 'Pei', 'Tsadi', 'Kuf', 'Resh', 'Shin', 'Tav'];
const FNM = { 'ך': 'Final Kaf', 'ם': 'Final Mem', 'ן': 'Final Nun', 'ף': 'Final Pei', 'ץ': 'Final Tsadi' };
const LNAME = {}; LET.split('').forEach((c, i) => { LNAME[c] = NM[i]; }); Object.assign(LNAME, FNM);
function val(ch, m) {
  if (m === 'big' && BIG[ch]) return BIG[ch];
  const i = LET.indexOf(FIN[ch] || ch); if (i < 0) return 0;
  let v = VAL[i]; if (m === 'small') while (v >= 10) v /= 10; return v;
}
const gv = (w, m = 'reg') => [...w].reduce((t, c) => t + val(c, m), 0);
function hebNum(n) {
  let s = '', r = n;
  while (r >= 400) { s += 'ת'; r -= 400; }
  if (r >= 100) { s += 'קרש'[Math.floor(r / 100) - 1]; r %= 100; }
  if (r === 15) s += 'טו'; else if (r === 16) s += 'טז';
  else { if (r >= 10) { s += 'יכלמנסעפצ'[Math.floor(r / 10) - 1]; r %= 10; } if (r) s += 'אבגדהוזחט'[r - 1]; }
  return s.length > 1 ? s.slice(0, -1) + '״' + s.slice(-1) : s + '׳';
}
const BOOKS = ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'I Samuel', 'II Samuel', 'I Kings', 'II Kings',
  'Isaiah', 'Jeremiah', 'Ezekiel', 'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
  'Psalms', 'Proverbs', 'Job', 'Song of Songs', 'Ruth', 'Lamentations', 'Ecclesiastes', 'Esther', 'Daniel', 'Ezra', 'Nehemiah', 'I Chronicles', 'II Chronicles'];

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const he = s => `<span lang="he" class="gx-he">${s}</span>`;

// טבלת ערכי האותיות
const letterTbl = '<table class="iv-tbl gx-tbl"><thead><tr><th scope="col">Letter</th><th scope="col">Name</th><th scope="col">Standard</th><th scope="col">Small</th></tr></thead><tbody>' +
  LET.split('').map((c, i) => `<tr><th scope="row">${he(c)}</th><td>${NM[i]}</td><td>${VAL[i]}</td><td>${val(c, 'small')}</td></tr>`).join('') +
  Object.keys(BIG).map(c => `<tr><th scope="row">${he(c)}</th><td>${FNM[c]}</td><td>${val(c)} <small>(large: ${BIG[c]})</small></td><td>${val(c, 'small')}</td></tr>`).join('') + '</tbody></table>';

// מילים ושמות: [עברית, תעתיק, פירוש]
const WORDS = [['חי', 'chai', 'life'], ['אחד', 'echad', 'one'], ['אהבה', 'ahavah', 'love'], ['שלום', 'shalom', 'peace'], ['אמת', 'emet', 'truth'],
  ['חסד', 'chesed', 'kindness'], ['צדקה', 'tzedakah', 'charity'], ['יין', 'yayin', 'wine'], ['סוד', 'sod', 'secret'], ['תורה', 'Torah', 'the Torah'],
  ['שבת', 'Shabbat', 'Sabbath'], ['ישראל', 'Yisrael', 'Israel'], ['משיח', 'Mashiach', 'Messiah'], ['נחש', 'nachash', 'snake'], ['ציצית', 'tzitzit', 'fringes'],
  ['מזל טוב', 'mazal tov', 'congratulations'], ['ירושלים', 'Yerushalayim', 'Jerusalem'], ['ברכה', 'brachah', 'blessing']];
const NAMES = [['אברהם', 'Avraham (Abraham)'], ['יצחק', 'Yitzchak (Isaac)'], ['יעקב', 'Yaakov (Jacob)'], ['שרה', 'Sarah'], ['רבקה', 'Rivka (Rebecca)'],
  ['רחל', 'Rachel'], ['לאה', 'Leah'], ['משה', 'Moshe (Moses)'], ['אהרן', 'Aharon (Aaron)'], ['מרים', 'Miriam'], ['דוד', 'David'], ['שלמה', 'Shlomo (Solomon)'],
  ['יוסף', 'Yosef (Joseph)'], ['בנימין', 'Binyamin (Benjamin)'], ['יהודה', 'Yehuda (Judah)'], ['דניאל', 'Daniel'], ['שמואל', 'Shmuel (Samuel)'], ['אליהו', 'Eliyahu (Elijah)'],
  ['אסתר', 'Esther'], ['רות', 'Ruth'], ['חנה', 'Chana (Hannah)'], ['נח', 'Noach (Noah)'], ['מיכאל', 'Michael'], ['נתן', 'Natan (Nathan)']];
const wsum = (w, m) => w.split(' ').reduce((t, x) => t + gv(x, m), 0);
const rowsOf = (list, withMeaning) => list.map(r => `<tr><th scope="row"><button type="button" class="gx-try" data-w="${r[0]}">${he(r[0])}</button></th><td>${r[1]}${withMeaning ? ' – ' + r[2] : ''}</td><td><b>${wsum(r[0], 'reg')}</b></td><td>${wsum(r[0], 'big')}</td><td>${wsum(r[0], 'small')}</td></tr>`).join('');
const head5 = first => `<thead><tr><th scope="col">Hebrew</th><th scope="col">${first}</th><th scope="col">Standard</th><th scope="col">Large<br>finals</th><th scope="col">Small</th></tr></thead>`;
const wordTbl = '<div class="gx-scr"><table class="iv-tbl gx-tbl">' + head5('Word') + '<tbody>' + rowsOf(WORDS, true) + '</tbody></table></div>';
const nameTbl = '<div class="gx-scr"><table class="iv-tbl gx-tbl">' + head5('Name') + '<tbody>' + rowsOf(NAMES, false) + '</tbody></table></div>';

// מספרים מחושבים לטקסט
const V = w => wsum(w, 'reg');
const ex = (w, tr) => `${he(w)} (${tr}) = ${[...w.replace(/ /g, '')].map(c => val(c)).join(' + ')} = ${V(w)}`;
if (V('יין') !== V('סוד') || V('אחד') !== V('אהבה') || V('משיח') !== V('נחש') || V('חי') !== 18 || V('אליעזר') !== 318 || V('ציצית') !== 600) throw new Error('gematria check failed');

const qa = [
  ['What is gematria?', `Gematria is the Jewish method of adding up the numerical values of the Hebrew letters in a word. Every Hebrew letter is also a number: Alef is 1, Bet is 2, up to Tav, which is 400. The gematria of a word is the sum of its letters, so ${he('חי')} (chai, "life") is 8 + 10 = 18. The calculator on this page does the sum for any Hebrew word, name or verse.`],
  ['How do I use this gematria calculator?', 'Type a Hebrew word, name or verse in the box, or tap the letters on the Hebrew keyboard under it if your device has no Hebrew keyboard. The total appears as you type, in three methods, with the value of every letter and a list of words and Tanach verses that have the same value. You can also type a number to see which words equal it.'],
  ['What is the gematria of my name?', 'Write your Hebrew name in Hebrew letters, as it appears on your ketubah, bar or bat mitzvah certificate or Hebrew documents, and type it in the calculator. If you are not sure how your name is spelled in Hebrew, ask your rabbi: different spellings give different values. The table of popular names on this page shows common examples.'],
  ['What is the numerical value of each Hebrew letter?', 'Alef to Tet are 1 to 9, Yod to Tsadi are 10 to 90 in steps of ten, and Kuf, Resh, Shin and Tav are 100, 200, 300 and 400. The five final letters (ך ם ן ף ץ) have the same value as the regular letters in the standard method, and 500 to 900 in the large-finals method. The full table is on this page.'],
  ['What is the difference between standard, large finals and small gematria?', 'Standard gematria (mispar hechrechi) counts final letters like regular ones. Large finals (mispar gadol) continues after Tav: final Kaf 500, final Mem 600, final Nun 700, final Pei 800, final Tsadi 900. Small gematria (mispar katan) drops the zeros, so Yod is 1, Kuf is 1 and Resh is 2. The calculator shows all three at once.'],
  ['Why do Jews give gifts in multiples of 18?', `Because 18 is the gematria of ${he('חי')} (chai), "life". A gift or donation of 18, 36 or 180 dollars carries a wish for life. Many people wear a Chai pendant for the same reason.`],
  ['What is gematria used for?', 'In Jewish tradition gematria is one of the ways of finding connections in the Torah: the Talmud, the Midrash and classic commentators such as Rashi point out words of equal value. The Mishnah in Pirkei Avot (chapter 3) calls gematria "side dishes of wisdom", meaning it adds flavor to Torah study but does not replace its plain meaning. People also use it for names, dates and meaningful numbers.'],
  ['What is 666 in gematria?', `In Hebrew letters 666 is written ${he(hebNum(666))}: Tav 400 + Resh 200 + Samech 60 + Vav 6. Type 666 in the number box on this page to see Hebrew words and Tanach phrases whose letters add up to 666.`],
  ['Can I type English words?', 'Gematria is a Hebrew system, so the main result counts Hebrew letters only. If you type English letters, the calculator also shows the simple English value (A = 1 to Z = 26) in a separate line, and suggests the Hebrew keyboard so you can write the word in Hebrew.'],
  ['Does the calculator count vowels (nikud)?', 'No. Vowel points, cantillation marks, the geresh and gershayim are removed before counting, so you can paste a verse straight from a prayer book or a Bible website. Spaces and hyphens separate words; English letters and digits are not counted.'],
  ['How do I find words with the same gematria?', 'After the total appears, the calculator searches a list of well-known words and names and then the whole Tanach (the Hebrew Bible) for single words and runs of consecutive words with the same value, and shows the book, chapter and verse. Tap any result to calculate it. Holy Names of God are not shown in the results.'],
  ['Is this gematria calculator free?', 'Yes. It is free, unlimited, with no ads and no sign-up. It works on any phone or computer, and the text you type stays on your device.']
];
const faqLd = '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: qa.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a.replace(/<[^>]+>/g, '') } })) }) + '</script>';
const faqHtml = '<section class="k-sec seo-faq" aria-labelledby="seo-faq-h">\n  <h2 id="seo-faq-h">Gematria questions and answers</h2>\n' +
  qa.map(([q, a]) => `  <details><summary>${q}</summary><p>${a}</p></details>`).join('\n') + '\n</section>';

const L = { names: { reg: 'Standard', big: 'Large finals', small: 'Small' }, link: 'https://hakelim.com/kodesh/gimatria/en/', key: 'gematria-en',
  def: { t: 'שלום', m: 'reg', n: '' }, share: 'Free Hebrew gematria calculator, no sign-up:', books: BOOKS, lname: LNAME };
const kb = '<div class="gx-kb no-print" id="gx-kb" dir="rtl" lang="he" role="group" aria-label="Hebrew keyboard">' +
  LET.split('').map((c, i) => `<button type="button" data-k="${c}" aria-label="${NM[i]}">${c}</button>`).join('') +
  Object.keys(FNM).map(c => `<button type="button" data-k="${c}" class="gx-fin" aria-label="${FNM[c]}">${c}</button>`).join('') +
  '<button type="button" data-k=" " class="gx-sp" aria-label="Space" lang="en">space</button><button type="button" data-k="bk" class="gx-bk" aria-label="Delete last letter" lang="en">⌫</button></div>';

const meta = {
  site: 'kodesh', nav: 'rabanim', lang: 'en', crumb_root: 'Jewish tools', tool: 'gimatria_en', no_hub: true,
  alt: { he: '/kodesh/gimatria/', en: '/kodesh/gimatria/en/' },
  title: 'Gematria Calculator: Hebrew Gematria of Any Word or Name',
  description: 'Free Hebrew gematria calculator: type or tap a Hebrew word, name or verse and get its gematria – standard, large finals and small – letter by letter, with words and Tanach verses of the same value. No ads, no sign-up.',
  og_title: 'Gematria Calculator – Hebrew words, names and verses',
  priority: '0.8',
  crumbs: [['Gematria calculator', null]],
  head: '<link rel="stylesheet" href="/assets/seo-txt.css"><link rel="stylesheet" href="/assets/kodesh-ivri.css"><link rel="stylesheet" href="/assets/gematria-en.css">' + style + faqLd,
  foot: '<script>window.GM_L=' + JSON.stringify(L) + ';</script><script src="/assets/gematria-en.js" defer></script><script src="/assets/kodesh-gimatria.js" defer></script>'
};

const body = `<header class="k-hero">
  <h1>Gematria Calculator: Hebrew Gematria of Any Word, Name or Verse</h1>
  <p class="sub">Type or tap a Hebrew word, name or verse and see its gematria as you type: the value of every letter, three counting methods, and words and Tanach verses with the same number. Free, no ads, no sign-up.</p>
</header>

<div class="tool" id="gimatria">
  <section class="k-sec" aria-labelledby="gm-q" style="margin-top:.6rem">
    <label class="gm-lbl" for="gm-t" id="gm-q">Hebrew word, name or verse</label>
    <textarea id="gm-t" dir="rtl" lang="he" rows="2" placeholder="שלום" autocomplete="off" autocapitalize="off" spellcheck="false"></textarea>
    <div class="gm-tacts"><button type="button" id="gm-clear">Clear the box</button></div>
    <p class="gx-kbh no-print">No Hebrew keyboard? Tap the letters:</p>
    ${kb}
    <p class="gx-enl" id="gx-enl" hidden></p>
    <div class="gm-seg" id="gm-m" role="group" aria-label="Counting method">
      <button type="button" data-v="reg" aria-pressed="true">Standard<small>mispar hechrechi</small></button>
      <button type="button" data-v="big" aria-pressed="false">Large finals<small>ך = 500 · ץ = 900</small></button>
      <button type="button" data-v="small" aria-pressed="false">Small<small>no zeros · י = 1</small></button>
    </div>

    <div class="gm-res" aria-live="polite">
      <div class="lbl" id="gm-l"></div>
      <div class="big" id="gm-b"></div>
      <div class="heb" id="gm-h" lang="he"></div>
      <dl class="gm-rows">
        <div><dt>Standard (mispar hechrechi)</dt><dd id="gm-reg"></dd></div>
        <div><dt>Large finals (mispar gadol)</dt><dd id="gm-big"></dd></div>
        <div><dt>Small (mispar katan)</dt><dd id="gm-small"></dd></div>
        <div><dt>Length</dt><dd id="gm-cnt"></dd></div>
      </dl>
    </div>
    <p class="gm-skip" id="gm-skip" hidden></p>
    <div class="gm-acts no-print">
      <button type="button" id="gm-copy">📋 Copy</button>
      <a href="#" id="gm-wa" target="_blank" rel="noopener"><svg class="ic"><use href="#wa"/></svg> WhatsApp</a>
    </div>
    <div class="gm-same" id="gm-same" aria-live="polite" hidden></div>
    <ul class="gm-words" id="gm-words" aria-label="Letter-by-letter breakdown"></ul>
  </section>

  <section class="k-sec" aria-labelledby="gm-nh">
    <label class="gm-lbl" for="gm-n" id="gm-nh">Have a number? See which Hebrew words equal it</label>
    <div class="gm-nin"><input id="gm-n" type="text" inputmode="numeric" placeholder="26" autocomplete="off"></div>
    <div id="gm-nr" aria-live="polite"></div>
  </section>

  <div class="gm-note"><span>ℹ️</span><span>Everything is calculated on your device; nothing you type is sent anywhere. Vowels, cantillation marks and quotation marks are not counted, and a space or hyphen separates words. Words and phrases of equal value come from a list of names and concepts and from the whole Tanach (text from Sefaria, public domain). Holy Names of God are not shown in the results.</span></div>
  <div class="gm-data"><button type="button" id="gm-reset">Back to the example</button><button type="button" data-wipe="gimatria">Clear saved data</button></div>
</div>

<section class="k-sec" aria-labelledby="gx-lt-h" id="letter-values">
  <h2 id="gx-lt-h">Hebrew gematria chart: the value of every letter</h2>
  <p class="lead2">The 22 letters and the 5 final letters with their standard and small values. In the large-finals method the final letters count 500 to 900.</p>
  ${letterTbl}
</section>

<section class="k-sec" aria-labelledby="gx-w-h" id="famous-words">
  <h2 id="gx-w-h">Gematria of famous Hebrew words</h2>
  <p class="lead2">Tap a word to open it in the calculator with the full letter-by-letter breakdown.</p>
  ${wordTbl}
</section>

<section class="k-sec" aria-labelledby="gx-n-h" id="names">
  <h2 id="gx-n-h">Gematria of popular Hebrew names</h2>
  <p class="lead2">Common Hebrew names in their usual spelling. A different spelling (for example with or without a Yod or a Vav) gives a different value, so check your own name in the calculator.</p>
  ${nameTbl}
</section>
<!--seo-txt-->
<section class="k-sec seo-txt" aria-labelledby="seo-h">
  <h2 id="seo-h">What is gematria?</h2>
  <p>Gematria (Hebrew ${he('גימטריה')}) is the practice of reading Hebrew letters as numbers and adding them up. Hebrew has no separate digits in its traditional writing: the letters themselves count, from Alef = 1 to Tav = 400. That is why Hebrew dates, years and chapter numbers are still written with letters, and why every Hebrew word also has a number. For example, ${ex('שלום', 'shalom')}.</p>
  <p>Jewish tradition treats these numbers as a way of noticing connections between words. The sages of the Talmud and the Midrash used gematria to point out hints in the Torah, and classic commentators such as Rashi quote them often. The Mishnah in Pirkei Avot calls gematria "side dishes of wisdom": it adds depth and flavor to learning, alongside the plain meaning of the text.</p>

  <h2>How to use the Hebrew gematria calculator</h2>
  <h3>1. Type or tap the Hebrew word</h3>
  <p>Type a word, a name or a whole verse in the box. If your phone or computer has no Hebrew keyboard, tap the letters on the on-screen keyboard right under the box: the five final letters are at the end of the row, together with a space key and a delete key. You can also paste a verse with vowels from any Bible website; the vowels are removed automatically.</p>
  <h3>2. Read the total and the breakdown</h3>
  <p>The big number is the gematria in the method you chose, and under it the same number written in Hebrew letters. Below the total you see all three methods side by side, the number of words and letters, and a card for every word with the name and value of each letter, so you can check the sum yourself.</p>
  <h3>3. Find words with the same value</h3>
  <p>Under the result the calculator lists words and phrases with exactly the same gematria: first well-known words and names, then single words from the Tanach, then runs of consecutive words, each with its book, chapter and verse. Tap any of them to calculate it. Or type a number in the second box to see which Hebrew words equal it.</p>

  <h2>Three methods of counting</h2>
  <h3>Standard gematria (mispar hechrechi)</h3>
  <p>The usual method, and the one meant when people simply say "gematria". Each letter has its value from 1 to 400, and the final letters count like the regular ones: final Mem (${he('ם')}) is 40, just like Mem (${he('מ')}).</p>
  <h3>Large finals (mispar gadol)</h3>
  <p>Here the five final letters continue the count after Tav: final Kaf 500, final Mem 600, final Nun 700, final Pei 800 and final Tsadi 900. Words without final letters have the same value in both methods.</p>
  <h3>Small gematria (mispar katan)</h3>
  <p>The zeros are dropped, so every letter is worth 1 to 9: Yod is 1, Kaf is 2, Kuf is 1, Resh is 2, Shin is 3 and Tav is 4. This method gives small numbers that are easy to compare.</p>

  <h2>Famous gematria examples</h2>
  <p><strong>Chai, life:</strong> ${ex('חי', 'chai')}. This is why gifts and donations are given in multiples of 18.</p>
  <p><strong>One and love:</strong> ${ex('אחד', 'echad')}, and ${ex('אהבה', 'ahavah')}. Both are 13.</p>
  <p><strong>Wine and secret:</strong> ${he('יין')} (yayin, wine) and ${he('סוד')} (sod, secret) are both ${V('יין')}. The Talmud says that when wine goes in, a secret comes out.</p>
  <p><strong>Eliezer and the 318 men:</strong> the Torah says Abraham went out to war with 318 men; the Talmud notes that ${he('אליעזר')} (Eliezer, Abraham's servant) has the gematria ${V('אליעזר')}.</p>
  <p><strong>Tzitzit and the 613 commandments:</strong> ${he('ציצית')} (tzitzit) is ${V('ציצית')}; Rashi explains that with the 8 strings and 5 knots of each fringe it makes 613, the number of the commandments of the Torah.</p>
  <p><strong>Mashiach and nachash:</strong> ${he('משיח')} (Mashiach, Messiah) and ${he('נחש')} (nachash, snake) are both ${V('משיח')}, a pair often discussed in Chassidic teaching.</p>

  <h2>Gematria of your Hebrew name</h2>
  <p>Many people look up the gematria of their Hebrew name, or of a baby's name before a brit milah or a naming. Use the Hebrew spelling that appears on your Hebrew documents. English spellings do not have a gematria in the Jewish sense, and the same English name can be written in Hebrew in more than one way: Michael can be ${he('מיכאל')} (${V('מיכאל')}), and a name written with an extra Yod or Vav gains 10 or 6. If you are not sure of the spelling, ask your rabbi.</p>

  <h2>Writing numbers in Hebrew letters</h2>
  <p>Gematria also works the other way: any number can be written in Hebrew letters by adding the largest letters first. 613 is ${he(hebNum(613))}, and the Hebrew year 5787 is written ${he('תשפ״ז')}, usually without the thousands. By custom 15 and 16 are written ${he('טו')} and ${he('טז')} (9 + 6 and 9 + 7) instead of Yod-Hei and Yod-Vav, because those letters spell part of the Name of God. The number box on this page shows every number in Hebrew letters.</p>

  <h2>Hebrew gematria and English gematria</h2>
  <p>Some websites offer "English gematria", giving values to the letters A to Z. That is a modern invention: classic gematria is a Hebrew tradition, built on the Hebrew alphabet in which letters have always been numbers. This calculator is a Hebrew gematria calculator. If you type English letters it shows their simple value (A = 1 to Z = 26) as a separate line, but for the traditional meaning write the word in Hebrew.</p>

  <h2>More free Jewish tools in English</h2>
  <p>Learn the letters and their numbers with the <a href="/kodesh/alefbet/en/">Hebrew alphabet chart</a>. Convert dates with the <a href="/kodesh/taarich-ivri/en/">Hebrew date converter</a>, see the <a href="/kodesh/luach-ivri/en/">Hebrew calendar</a> and the <a href="/kodesh/luach-ivri/en/holidays/">Jewish holidays</a>, find <a href="/kodesh/shabat/en/">Shabbat candle lighting times</a> and today's <a href="/kodesh/zmanim/en/">zmanim</a>. Pray with transliteration: <a href="/kodesh/shema-israel/en/">the Shema</a> and <a href="/kodesh/birkat-hamazon/en/">Birkat Hamazon</a>. For people converting to Judaism in Israel: <a href="/kodesh/giur/en/">preparing for conversion</a>. The original Hebrew calculator is <a href="/kodesh/gimatria/">here</a>.</p>

  <h2>Why it is free</h2>
  <p>This calculator is part of "Gilad Rachamim's Tools": simple tools, free and unlimited, with no sign-up and no ads, built as an act of kindness. Everything runs in your own browser, and the text you type stays on your device.</p>
</section>
${faqHtml}
<!--/seo-txt-->
`;
fs.mkdirSync(DIR, { recursive: true });
fs.writeFileSync(path.join(DIR, 'index.html'), '<!--meta ' + JSON.stringify(meta, null, 2) + ' -->\n' + body, 'utf8');
console.log('gimatria en: ok', V('שלום'), V('אליעזר'));
