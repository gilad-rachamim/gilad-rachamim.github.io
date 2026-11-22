// דף האלף-בית באנגלית: src/pages/kodesh/alefbet/en/index.html  ("Hebrew Alphabet", 10K–100K חיפושים בחודש בארה"ב).
// הרצה: node tools/alefbet_en.js  ואז  python build.py
// הנתונים של האותיות (שם, צליל, ערך מספרי, מילה לדוגמה) כתובים כאן פעם אחת, ונכנסים גם לדף (לגוגל ולמי שאין לו JavaScript)
// וגם לסקריפט assets/alefbet-en.js (טבלה לחיצה, הקראה, בוחן, ממיר מספרים).
// מילות החיפוש והמתחרים: ~/.claude/state/kelim-seo/runs/2026-11-22-alefbet-en/
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'src/pages/kodesh/alefbet/en');

// [אות, שם, תעתיק, צליל, ערך, שם בעברית להקראה, מילה, תעתיק המילה, פירוש, אות סופית]
const L = [
  ['א', 'Alef', "' (silent)", 'Silent – it carries the vowel under it', 1, 'אָלֶף', 'אַבָּא', 'abba', 'father', ''],
  ['ב', 'Bet / Vet', 'b / v', 'B with a dot inside (בּ), V without it (ב)', 2, 'בֵּית', 'בַּיִת', 'bayit', 'house', ''],
  ['ג', 'Gimel', 'g', 'G as in "go"', 3, 'גִּימֶל', 'גָּמָל', 'gamal', 'camel', ''],
  ['ד', 'Dalet', 'd', 'D as in "door"', 4, 'דָּלֶת', 'דֶּלֶת', 'delet', 'door', ''],
  ['ה', 'Hei', 'h', 'H as in "hat"; often silent at the end of a word', 5, 'הֵא', 'הַר', 'har', 'mountain', ''],
  ['ו', 'Vav', 'v / o / u', 'V; with a dot it is also the vowel O (וֹ) or U (וּ)', 6, 'וָו', 'וֶרֶד', 'vered', 'rose', ''],
  ['ז', 'Zayin', 'z', 'Z as in "zoo"', 7, 'זַיִן', 'זְמַן', 'zman', 'time', ''],
  ['ח', 'Chet', 'ch', 'A throaty CH, as in "Bach"', 8, 'חֵית', 'חַלָּה', 'challah', 'challah bread', ''],
  ['ט', 'Tet', 't', 'T as in "tall"', 9, 'טֵית', 'טַלִּית', 'tallit', 'prayer shawl', ''],
  ['י', 'Yod', 'y / i', 'Y as in "yes"; also part of the vowels I and E', 10, 'יוֹד', 'יָד', 'yad', 'hand', ''],
  ['כ', 'Kaf / Chaf', 'k / ch', 'K with a dot (כּ), a throaty CH without it (כ)', 20, 'כַּף', 'כֶּלֶב', 'kelev', 'dog', 'ך'],
  ['ל', 'Lamed', 'l', 'L as in "lamp"', 30, 'לָמֶד', 'לֶחֶם', 'lechem', 'bread', ''],
  ['מ', 'Mem', 'm', 'M as in "mother"', 40, 'מֵם', 'מַיִם', 'mayim', 'water', 'ם'],
  ['נ', 'Nun', 'n', 'N as in "now"', 50, 'נוּן', 'נֵר', 'ner', 'candle', 'ן'],
  ['ס', 'Samech', 's', 'S as in "sun"', 60, 'סָמֶךְ', 'סֵפֶר', 'sefer', 'book', ''],
  ['ע', 'Ayin', "' (silent)", 'Silent in modern Hebrew – it carries the vowel under it', 70, 'עַיִן', 'עַיִן', 'ayin', 'eye', ''],
  ['פ', 'Pei / Fei', 'p / f', 'P with a dot (פּ), F without it (פ)', 80, 'פֵּא', 'פֶּה', 'peh', 'mouth', 'ף'],
  ['צ', 'Tsadi', 'ts', 'TS as in "cats"', 90, 'צָדִי', 'צְדָקָה', 'tzedakah', 'charity', 'ץ'],
  ['ק', 'Kuf', 'k', 'K as in "kite"', 100, 'קוֹף', 'קוֹל', 'kol', 'voice', ''],
  ['ר', 'Resh', 'r', 'R, said in the throat in Israeli Hebrew', 200, 'רֵישׁ', 'רֹאשׁ', 'rosh', 'head', ''],
  ['ש', 'Shin / Sin', 'sh / s', 'SH with a dot on the right (שׁ), S with a dot on the left (שׂ)', 300, 'שִׁין', 'שַׁבָּת', 'Shabbat', 'Sabbath', ''],
  ['ת', 'Tav', 't', 'T as in "top" (some communities say S without a dot)', 400, 'תָּו', 'תּוֹרָה', 'Torah', 'the Torah', '']
];
const FIN = [['ך', 'Final Chaf', 'כ', 500], ['ם', 'Final Mem', 'מ', 600], ['ן', 'Final Nun', 'נ', 700], ['ף', 'Final Fei', 'פ', 800], ['ץ', 'Final Tsadi', 'צ', 900]];
// ניקוד: [סימן על בּ, שם, צליל]
const V = [
  ['בָּ', 'Kamatz', 'a as in "father"'], ['בַּ', 'Patach', 'a as in "father"'], ['בֵּ', 'Tsere', 'e as in "they" or "bed"'], ['בֶּ', 'Segol', 'e as in "bed"'],
  ['בִּ', 'Chirik', 'i as in "ski"'], ['בֹּ', 'Cholam', 'o as in "more"'], ['בּוֹ', 'Cholam with Vav', 'o as in "more"'], ['בֻּ', 'Kubutz', 'u as in "flute"'],
  ['בּוּ', 'Shuruk', 'u as in "flute"'], ['בְּ', 'Shva', 'a very short e, or silent'], ['בֲּ', 'Chataf Patach', 'a short a'], ['בֱּ', 'Chataf Segol', 'a short e']
];

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const chart = '<div class="ab-grid" id="ab-grid" dir="rtl">' + L.map((r, i) =>
  `<button type="button" class="ab-c" data-i="${i}" lang="en" aria-label="${esc(r[1])}, number ${r[4]}"><span class="ab-g" lang="he">${r[0]}</span><span class="ab-n">${r[1]}</span><span class="ab-t">${esc(r[2])}</span><span class="ab-v">${r[4]}</span></button>`).join('') + '</div>';
const finals = '<div class="ab-grid ab-fin" dir="rtl">' + FIN.map(r =>
  `<div class="ab-c"><span class="ab-g" lang="he">${r[0]}</span><span class="ab-n">${r[1]}</span><span class="ab-t">end of a word, instead of <span lang="he">${r[2]}</span></span></div>`).join('') + '</div>';
const table = '<table class="iv-tbl ab-tbl"><thead><tr><th scope="col">Letter</th><th scope="col">Name</th><th scope="col">Sound</th><th scope="col">Value</th><th scope="col">Example</th></tr></thead><tbody>' +
  L.map(r => `<tr><th scope="row"><span lang="he" class="ab-tg">${r[0]}</span>${r[9] ? ' <span lang="he" class="ab-tf">' + r[9] + '</span>' : ''}</th><td>${r[1]}</td><td>${esc(r[3])}</td><td>${r[4]}</td><td><span lang="he" class="ab-tw">${r[6]}</span> <i>${r[7]}</i> – ${r[8]}</td></tr>`).join('') + '</tbody></table>';
const vowels = '<table class="iv-tbl ab-tbl"><thead><tr><th scope="col">Sign</th><th scope="col">Name</th><th scope="col">Sound</th></tr></thead><tbody>' +
  V.map(r => `<tr><th scope="row"><span lang="he" class="ab-tg">${r[0]}</span></th><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('') + '</tbody></table>';

const qa = [
  ['How many letters are in the Hebrew alphabet?', 'The Hebrew alphabet has 22 letters, from Alef (א) to Tav (ת). Five of them – Kaf, Mem, Nun, Pei and Tsadi – have a second form used only at the end of a word (ך ם ן ף ץ), so you will sometimes see the count given as 27 forms. All the letters are consonants; vowels are written as dots and lines under, above or inside the letters.'],
  ['What are the 22 letters of the Hebrew alphabet?', 'In order: ' + L.map(r => r[1] + ' (' + r[0] + ')').join(', ') + '. The chart at the top of this page shows each one with its sound and number.'],
  ['What are the first four letters of the Hebrew alphabet?', 'Alef (א), Bet (ב), Gimel (ג) and Dalet (ד). The word "alphabet" itself comes from the first two letters, through the Greek alpha and beta.'],
  ['How is 666 written in Hebrew?', 'In Hebrew letters 666 is written תרס״ו: Tav (400) + Resh (200) + Samech (60) + Vav (6). The two small strokes before the last letter (gershayim) show that the letters stand for a number. Type any number in the "Numbers in Hebrew letters" box on this page to see it written out.'],
  ['Is the Yiddish alphabet the same as Hebrew?', 'Yiddish is written with the same 22 Hebrew letters, but it uses some of them as vowels: Alef, Ayin, Vav and Yod stand for vowel sounds, and a few letter pairs (such as two Vavs) have their own sounds. So a reader of Hebrew can sound out Yiddish letters, but the spelling rules and the language are different.'],
  ['Does Hebrew have vowels?', 'Yes, but they are not letters. Vowels are small marks called nikud, written under, inside or above the letters. Prayer books, the Bible and children\'s books print them; newspapers and most everyday Hebrew leave them out, and readers fill in the vowels from context. The vowel table on this page shows every mark with its sound.'],
  ['Is Hebrew written from right to left?', 'Yes. Hebrew is written and read from right to left, and a book opens from what an English reader would call the back. Numbers written in digits (1, 2, 3) are still read from left to right inside a Hebrew sentence.'],
  ['What is the difference between Bet and Vet, Kaf and Chaf, Pei and Fei?', 'They are the same letter with or without a dot inside, called a dagesh. With the dot: B, K, P. Without it: V, a throaty CH, F. Shin and Sin are also one letter: a dot on the right side means SH, on the left side S.'],
  ['How do I write my name in Hebrew?', 'Hebrew spells names by sound, so pick the letter for each sound in your name using the chart on this page: for example, David is דוד and Sarah is שרה. Many English names have more than one accepted Hebrew spelling. For a name on a ketubah, a gravestone or any formal document, ask a rabbi or a fluent Hebrew speaker to check the spelling.'],
  ['What is the numerical value of the Hebrew letters?', 'Every letter is also a number: Alef to Tet are 1 to 9, Yod to Tsadi are 10 to 90, and Kuf to Tav are 100 to 400. Larger numbers are written by adding letters, so 18 is יח (10 + 8). This is the basis of gematria, where the letters of a word are added up.'],
  ['Is this page free?', 'Yes. The chart, the quiz, the number converter and printing are free, with no sign-up and no ads. It works in any phone or computer browser.']
];
const faqLd = '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: qa.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a.replace(/<[^>]+>/g, '') } })) }) + '</script>';
const faqHtml = '<section class="k-sec seo-faq" aria-labelledby="seo-faq-h">\n  <h2 id="seo-faq-h">Questions about the Hebrew alphabet</h2>\n' +
  qa.map(([q, a]) => `  <details><summary>${q}</summary><p>${a}</p></details>`).join('\n') + '\n</section>';

const meta = {
  site: 'kodesh', nav: 'rabanim', lang: 'en', crumb_root: 'Jewish tools', tool: 'alefbet_en', no_hub: true,
  title: 'Hebrew Alphabet: All 22 Letters, Sounds, Vowels and Numbers',
  description: 'The Hebrew alphabet chart: all 22 Hebrew letters and 5 final letters with names, sounds, transliteration and numbers, the vowels (nikud), a quiz and a printable chart. Free.',
  og_title: 'Hebrew Alphabet – tap a letter, hear it, learn it',
  priority: '0.8',
  crumbs: [['Hebrew alphabet', null]],
  head: '<link rel="stylesheet" href="/assets/seo-txt.css"><link rel="stylesheet" href="/assets/kodesh-ivri.css"><link rel="stylesheet" href="/assets/alefbet-en.css">' + faqLd,
  foot: '<script>window.AB_L=' + JSON.stringify(L) + ';</script><script src="/assets/alefbet-en.js" defer></script>'
};
const body = `<header class="k-hero no-print">
  <h1>Hebrew Alphabet: All 22 Hebrew Letters with Sounds and Numbers</h1>
  <p class="sub">Tap any letter to see its name, its sound, an example word and its number, and to hear it said in Hebrew. Below the chart: the final letters, the vowels, a quiz to practise, and numbers written in Hebrew letters.</p>
</header>
<div class="tool" id="ab">
  <h2>The Hebrew alphabet chart</h2>
  <p class="lead2">Hebrew is read from right to left, so the chart starts at the top right with Alef. The small number on each letter is its value.</p>
  ${chart}
  <div class="res ab-det" id="ab-det" aria-live="polite" hidden></div>
  <div class="share-row no-print">
    <button class="btn btn-gold btn-sm" type="button" id="ab-quiz-go">Practise: letter quiz</button>
    <button class="btn btn-line btn-sm" type="button" onclick="window.print()">Print the chart</button>
    <a class="btn btn-line btn-sm" href="#" data-share-tool="wa" data-text="The Hebrew alphabet: tap a letter, hear it, learn it. Free, no ads:" target="_blank" rel="noopener">Share</a>
  </div>
  <div class="ab-quiz no-print" id="ab-quiz" hidden>
    <p class="ab-qq">Which letter is this? <span class="ab-score" id="ab-score"></span></p>
    <div class="ab-qg" id="ab-qg" lang="he"></div>
    <div class="ab-qa" id="ab-qa"></div>
    <p class="ab-qr" id="ab-qr" aria-live="polite"></p>
  </div>
</div>

<section class="k-sec" aria-labelledby="ab-fin-h" id="final-letters">
  <h2 id="ab-fin-h">The five final letters (sofit)</h2>
  <p class="lead2">Five letters change their shape when they come at the end of a word. The sound stays the same. A handy way to remember them is the word "Kamnefetz": Kaf, Mem, Nun, Pei, Tsadi.</p>
  ${finals}
</section>

<section class="k-sec" aria-labelledby="ab-tbl-h" id="letters-table">
  <h2 id="ab-tbl-h">Hebrew letters table: names, sounds and examples</h2>
  <p class="lead2">Every letter with its English name, how it sounds, its numerical value and a short Hebrew word that begins with it.</p>
  ${table}
</section>

<section class="k-sec" aria-labelledby="ab-v-h" id="vowels">
  <h2 id="ab-v-h">Hebrew vowels (nikud)</h2>
  <p class="lead2">The vowels are dots and lines written with the letters. Here they are shown on the letter Bet, so בָּ reads "ba" and בִּ reads "bi". Some pairs look different but sound the same in modern Hebrew.</p>
  ${vowels}
</section>

<section class="k-sec no-print" aria-labelledby="ab-num-h" id="numbers">
  <h2 id="ab-num-h">Numbers in Hebrew letters</h2>
  <p class="lead2">Type a number from 1 to 9999 and see how it is written in Hebrew letters, the way years, chapters and Hebrew dates are written.</p>
  <div class="ab-num">
    <label for="ab-n">Number</label>
    <input id="ab-n" type="number" inputmode="numeric" min="1" max="9999" value="666">
    <p class="ab-nout" id="ab-nout" aria-live="polite"><span lang="he" class="ab-tg">תרס״ו</span> = 400 + 200 + 60 + 6</p>
  </div>
</section>
<!--seo-txt-->
<section class="k-sec seo-txt" aria-labelledby="seo-h">
  <h2 id="seo-h">Learning the Hebrew alphabet</h2>
  <p>The Hebrew alphabet, called the Alef-Bet after its first two letters, has 22 letters. It is the alphabet of the Torah, of the prayer book and of modern Israeli Hebrew, and the same letters are used to write Yiddish and Ladino. Every letter is a consonant; the vowels are added as small marks. Once you know the 22 letters, the five final forms and about ten vowel signs, you can sound out any word in a Jewish prayer book, even before you understand it.</p>
  <h3>Reading from right to left</h3>
  <p>Hebrew is written from right to left. In a printed book the first page is on what an English reader would call the back. Letters are not joined in print, and there are no capital letters. Some letters look alike, so it is worth practising them in pairs: Bet (ב) and Kaf (כ), Dalet (ד) and Resh (ר), Hei (ה) and Chet (ח), Vav (ו) and Zayin (ז), Gimel (ג) and Nun (נ), Samech (ס) and final Mem (ם), Ayin (ע) and Tsadi (צ).</p>
  <h3>Final letters</h3>
  <p>Five letters have a special form at the end of a word: Chaf (ך), Mem (ם), Nun (ן), Fei (ף) and Tsadi (ץ). Most of them have a long tail that goes below the line. The final letters do not add new sounds; they only mark where a word ends, which helped readers in the days when words were written close together.</p>
  <h3>Letters with a dot inside</h3>
  <p>A dot inside a letter is called a dagesh. In three letters it changes the sound: Bet (בּ, B) and Vet (ב, V), Kaf (כּ, K) and Chaf (כ, CH), Pei (פּ, P) and Fei (פ, F). The letter Shin carries a dot on top: on the right side it is SH (שׁ), on the left side it is S (שׂ), and then it is called Sin. In everyday Hebrew without vowels you learn which sound to use from the word itself.</p>
  <h3>The vowels: nikud</h3>
  <p>Hebrew vowels were added to the text about 1,200 years ago by scholars called the Masoretes, to preserve the exact reading of the Torah. Kamatz and Patach both sound like "a", Tsere and Segol like "e", Chirik like "i", Cholam like "o", and Kubutz and Shuruk like "u". The Shva is a very short sound or no sound at all. In prayer books and children's books the vowels are printed; in newspapers, signs and text messages they are left out.</p>
  <h3>Letters as numbers</h3>
  <p>Before Arabic numerals reached Europe, Hebrew used its letters as numbers, and it still does for Hebrew dates, years, chapters of the Bible and page numbers in the Talmud. Alef to Tet count 1 to 9, Yod to Tsadi count by tens, and Kuf to Tav count by hundreds. Fifteen and sixteen are written טו and טז (9 + 6, 9 + 7) by custom. Adding up the letters of a word is called gematria; you can try it with the <a href="/kodesh/gimatria/en/">gematria calculator</a>. This week's Torah portion and the full parsha calendar: <a href="/kodesh/parasha/en/">Torah portion this week</a>. To write in Hebrew on any computer or phone, use the <a href="/kodesh/mikledet/en/">Hebrew keyboard online</a>.</p>
  <h3>Print, handwriting and Torah script</h3>
  <p>The letters in this chart are the printed "square" letters. Israelis write by hand in a cursive script whose shapes differ quite a lot, and a Torah scroll, tefillin and a mezuzah are written by a scribe in a special calligraphy with small crowns on some letters. Start with the printed letters: they are the ones in every prayer book.</p>
  <h3>How to learn the Hebrew letters fast</h3>
  <p>Learn four or five letters a day, starting with the ones that have an easy English match: Bet, Gimel, Dalet, Lamed, Mem, Nun, Shin. Say each letter's name out loud and think of its example word. After a few days, use the quiz on this page until you get ten right in a row, then move on to the vowels and read simple words such as שַׁבָּת (Shabbat) and תּוֹרָה (Torah). Printing the chart and keeping it next to your prayer book helps too.</p>
  <h3>More in English</h3>
  <p>Prayers in Hebrew with English transliteration, to practise reading: <a href="/kodesh/shema-israel/en/">the Shema</a>, <a href="/kodesh/birkat-hamazon/en/">Birkat Hamazon, the grace after meals</a> and <a href="/kodesh/tefilat-haderech/en/">Tefilat Haderech, the traveler's prayer</a>. Dates and holidays: <a href="/kodesh/shabat/en/">Shabbat times</a>, <a href="/kodesh/luach-ivri/en/">Hebrew calendar</a>, <a href="/kodesh/taarich-ivri/en/">Hebrew date converter</a> and <a href="/kodesh/luach-ivri/en/holidays/">Jewish holidays</a>. Today's halachic times for your city: <a href="/kodesh/zmanim/en/">zmanim</a>. For people converting to Judaism in Israel: <a href="/kodesh/giur/en/">preparing for conversion</a>.</p>
  <h3>Why it is free</h3>
  <p>This page is part of "Gilad Rachamim's Tools": simple tools, free, with no sign-up and no ads, built as an act of kindness. Everything runs in your own browser. The spoken letter names use your device's Hebrew voice when it has one.</p>
</section>
${faqHtml}
<!--/seo-txt-->
`;
fs.mkdirSync(DIR, { recursive: true });
fs.writeFileSync(path.join(DIR, 'index.html'), '<!--meta ' + JSON.stringify(meta, null, 2) + ' -->\n' + body, 'utf8');
console.log('alefbet en: ok');
