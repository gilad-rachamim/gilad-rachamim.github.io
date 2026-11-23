// דף מקלדת עברית באנגלית לארה"ב: src/pages/kodesh/mikledet/en/index.html
// ("hebrew keyboard" 10K–100K חיפושים בחודש בארה"ב). מתחרים ושער: ~/.claude/state/kelim-seo/runs/2026-11-22-hebrew-keyboard/
// הרצה: node tools/mikledet_en.js  ואז  python build.py
// המקשים נבנים כאן מהנתונים של assets/mikledet-en.js, כך שגם בלי JavaScript רואים את הפריסה.
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'src/pages/kodesh/mikledet/en');
const K = require(path.join(ROOT, 'assets/mikledet-en.js'));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const L = (h, t) => `<a href="${h}">${t}</a>`;

const key = (ch, label, title, cls) => `<button type="button" class="mk-k${cls ? ' ' + cls : ''}" data-k="${esc(ch)}" title="${esc(title)}" aria-label="${esc(title)}"><b lang="he">${esc(ch)}</b>${label ? `<small>${esc(label)}</small>` : ''}</button>`;
const rows = K.IL.map((r, i) => `  <div class="mk-row r${i + 1}">${r.map(k => key(k[1], k[2], (K.NAMES[k[1]] || (k[1] === '.' ? 'Period' : k[1] === '/' ? 'Slash' : 'Apostrophe')) + ' (key ' + k[2] + ')')).join('')}</div>`).join('\n');
const bottom = `  <div class="mk-row"><button type="button" class="mk-k mid" data-k="BS" aria-label="Backspace"><b>⌫</b><small>Delete</small></button><button type="button" class="mk-k wide" data-k="SP" aria-label="Space"><b>&nbsp;</b><small>Space</small></button><button type="button" class="mk-k mid" data-k="NL" aria-label="New line"><b>↵</b><small>Enter</small></button></div>`;
const dot = c => 'א' + c; // מציגים את סימן הניקוד על אל"ף כדי שיראו אותו
const nik = K.NIKUD.map(([c, n]) => `<button type="button" class="mk-k" data-k="${c}" title="${n}" aria-label="${n}"><b lang="he">${dot(c)}</b><small>${n.split(' ')[0]}</small></button>`).join('');
const ext = K.EXTRA.map(([c, n]) => `<button type="button" class="mk-k" data-k="${c}" title="${n}" aria-label="${n}"><b lang="he">${c}</b><small>${n.split(' ')[0]}</small></button>`).join('');

// טבלת ההקלדה הפונטית
const phon = [['a', 'א', 'Alef'], ['b', 'ב', 'Bet'], ['g', 'ג', 'Gimel'], ['d', 'ד', 'Dalet'], ['h', 'ה', 'Hei'], ['v, w, o, u', 'ו', 'Vav'], ['z', 'ז', 'Zayin'], ['x, ch, H (Shift+h)', 'ח', 'Chet'], ['T (Shift+t)', 'ט', 'Tet'], ['y, i, j', 'י', 'Yud'], ['k, c', 'כ', 'Kaf'], ['l', 'ל', 'Lamed'], ['m', 'מ', 'Mem'], ['n', 'נ', 'Nun'], ['s', 'ס', 'Samech'], ['e', 'ע', 'Ayin'], ['p, f', 'פ', 'Pei'], ['tz, ts, C', 'צ', 'Tzadi'], ['q, K', 'ק', 'Kuf'], ['r', 'ר', 'Reish'], ['sh, S', 'ש', 'Shin'], ['t', 'ת', 'Tav']];
const phonRows = phon.map(([e, h, n]) => `<tr><th scope="row"><kbd>${e}</kbd></th><td lang="he" dir="rtl">${h}</td><td>${n}</td></tr>`).join('\n');
const finRows = [['כ', 'ך', 'Kaf'], ['מ', 'ם', 'Mem'], ['נ', 'ן', 'Nun'], ['פ', 'ף', 'Pei'], ['צ', 'ץ', 'Tzadi']].map(([a, b, n]) => `<tr><th scope="row">${n}</th><td lang="he" dir="rtl">${a}</td><td lang="he" dir="rtl">${b}</td></tr>`).join('\n');

const qa = [
  ['How do I type Hebrew on my keyboard?', 'On this page you can type Hebrew right away, with no setup: choose "Phonetic" and type the sounds in English letters (s-h-l-o-m gives שלום), or choose "Israeli layout" and your keyboard types like a keyboard sold in Israel. To type Hebrew in every program, add the Hebrew keyboard in your computer\'s or phone\'s settings; the steps for Windows, Mac, iPhone, Android and Chromebook are on this page.'],
  ['How can I get a Hebrew keyboard?', 'You do not need to buy one. Every modern computer and phone has a free Hebrew keyboard built in: add Hebrew as an input language in the settings, and switch between English and Hebrew with a shortcut or the globe key. Stickers with Hebrew letters for the keys are sold cheaply, but the layout of the keys is also shown on this page.'],
  ['How can I write in Hebrew online?', 'Type in the box at the top of this page, using the phonetic mode, the Israeli layout or the keys on the screen. When you are done, copy the text, or send it straight to a Google search, Google Translate, WhatsApp or an email.'],
  ['What is Hebrew QWERTY?', 'Hebrew QWERTY is a phonetic layout, where each Hebrew letter sits on the English key with a similar sound: ב on B, ד on D, ל on L. Mac computers include it as "Hebrew – QWERTY". It is easier for English speakers, while the standard Israeli layout (the one on keyboards sold in Israel) is what Israelis use. This page offers both: "Phonetic" works like Hebrew QWERTY.'],
  ['How do I type Hebrew vowels (nikud)?', 'Type the letter first, then tap the vowel mark under the keyboard: kamatz, patach, tzere, segol, chirik, cholam, kubutz, sheva and the chataf vowels, with dagesh and the shin and sin dots. The mark joins the letter before it. "Remove vowels" takes all the marks off the text in one tap.'],
  ['What are final letters in Hebrew?', 'Five letters have a different shape at the end of a word: כ becomes ך, מ becomes ם, נ becomes ן, פ becomes ף and צ becomes ץ. With "Automatic final letters" on, the page writes the right form by itself as you type, and changes it back if you keep typing the same word.'],
  ['Why does Hebrew text go from right to left?', 'Hebrew is written from right to left, so the box on this page is set right to left. English words and numbers inside a Hebrew sentence are still written left to right; this is normal, and the text will look the same when you paste it into an email, a document or WhatsApp.'],
  ['How do I switch between English and Hebrew on the keyboard?', 'On Windows, press the Windows key and Space together (or Alt and Shift). On a Mac, press Control and Space, or the Globe (fn) key. On iPhone and Android phones, tap the globe icon on the keyboard, or press and hold the space bar on Android.'],
  ['Is my text sent anywhere?', 'No. The text stays in your browser and is saved only on this device, so it is still there if you close the page. It is sent somewhere only when you press Google, Translate, WhatsApp or Email yourself. The keyboard is free, with no sign-up and no ads.'],
  ['Can I type Hebrew without the internet?', 'Once this page has loaded, the keyboard works without a connection, because everything runs in your browser.']
];
const faqLd = '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: qa.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }) + '</script>';
const faqHtml = '<section class="k-sec seo-faq" aria-labelledby="seo-faq-h">\n  <h2 id="seo-faq-h">Questions about the Hebrew keyboard</h2>\n' +
  qa.map(([q, a]) => `  <details><summary>${q}</summary><p>${esc(a).replace(/&amp;/g, '&')}</p></details>`).join('\n') + '\n</section>';

const meta = {
  site: 'kodesh', nav: 'rabanim', lang: 'en', crumb_root: 'Jewish tools', tool: 'mikledet_en', no_hub: true,
  title: 'Hebrew Keyboard Online: Type in Hebrew with English Letters',
  description: 'Hebrew keyboard online: type in Hebrew with English letters or the Israeli layout, with vowels (nikud) and final letters. Copy, search or share. Free, no ads.',
  og_title: 'Hebrew Keyboard Online – type Hebrew with English letters',
  priority: '0.8',
  crumbs: [['Hebrew keyboard', null]],
  head: '<link rel="stylesheet" href="/assets/seo-txt.css"><link rel="stylesheet" href="/assets/kodesh-ivri.css"><link rel="stylesheet" href="/assets/mikledet-en.css">' + faqLd,
  foot: '<script src="/assets/mikledet-en.js" defer></script>'
};

const body = `<header class="k-hero">
  <h1>Hebrew Keyboard Online: Type in Hebrew</h1>
  <p class="sub">Type Hebrew with the English letters you know, with the standard Israeli layout, or with the keys on the screen. Vowels (nikud) and final letters included. Then copy the text, search Google, translate it or send it on WhatsApp.</p>
</header>

<div class="tool" id="mk">
  <h2>Type in Hebrew</h2>
  <div class="mk-mode no-print" id="mk-mode" role="group" aria-label="How your keyboard types">
    <button type="button" data-m="ph" aria-pressed="true">Phonetic (English letters)</button>
    <button type="button" data-m="il" aria-pressed="false">Israeli layout</button>
    <button type="button" data-m="off" aria-pressed="false">Screen keys only</button>
  </div>
  <p class="mk-hint" id="mk-hint" aria-live="polite">Type the sounds in English letters, mostly without vowels: sh-l-o-m gives שלום. Use sh for ש, ch for ח, tz for צ.</p>
  <label class="sr-only" for="mk-t">Hebrew text</label>
  <textarea class="mk-t" id="mk-t" dir="rtl" lang="he" rows="4" spellcheck="false" autocomplete="off" autocapitalize="off" placeholder="הקלידו כאן · Type here"></textarea>
  <div class="mk-bar no-print">
    <label><input type="checkbox" id="mk-fin" checked> Automatic final letters</label>
    <span class="mk-n" id="mk-n">0 Hebrew letters · 0 words</span>
    <button type="button" class="btn btn-line btn-sm mk-own" id="mk-own" hidden aria-pressed="false">Use my phone's keyboard</button>
  </div>
  <div class="mk-kb no-print" id="mk-kb" dir="ltr" aria-label="Hebrew keyboard, Israeli layout">
${rows}
${bottom}
  </div>
  <p class="mk-sub no-print">Vowels (nikud) and marks – type the letter, then the vowel</p>
  <div class="mk-nik no-print" dir="ltr">${nik}${ext}</div>
  <div class="mk-acts no-print">
    <button class="btn btn-gold btn-sm" type="button" data-act="copy">Copy</button>
    <button class="btn btn-line btn-sm" type="button" data-act="google">Search Google</button>
    <button class="btn btn-line btn-sm" type="button" data-act="translate">Translate</button>
    <button class="btn btn-line btn-sm" type="button" data-act="wa">WhatsApp</button>
    <button class="btn btn-line btn-sm" type="button" data-act="mail">Email</button>
    <button class="btn btn-line btn-sm" type="button" data-act="nonikud">Remove vowels</button>
    <button class="btn btn-line btn-sm" type="button" data-act="big" aria-label="Larger text">A+</button>
    <button class="btn btn-line btn-sm" type="button" data-act="small" aria-label="Smaller text">A−</button>
    <button class="btn btn-line btn-sm" type="button" data-act="clear">Clear</button>
  </div>
</div>

<section class="k-sec" aria-labelledby="mk-ph-h" id="phonetic">
  <h2 id="mk-ph-h">Phonetic Hebrew keyboard: which English letter types which Hebrew letter</h2>
  <p class="lead2">In the phonetic mode you type the sound. Two letters together make one Hebrew letter: sh is ש, ch is ח, tz or ts is צ (kh stays כה, so ch-n-u-k-h gives חנוכה). Hold Shift for the second letter with a similar sound: T is ט, S is ש, K is ק.</p>
  <div class="pa-wrap"><table class="iv-tbl mk-tbl">
    <caption class="pa-cap">Phonetic typing table</caption>
    <thead><tr><th scope="col">Type</th><th scope="col">Hebrew</th><th scope="col">Letter name</th></tr></thead>
    <tbody>
${phonRows}
    </tbody>
  </table></div>
</section>

<section class="k-sec" aria-labelledby="mk-fin-h" id="final-letters">
  <h2 id="mk-fin-h">Hebrew final letters</h2>
  <p class="lead2">Five letters change shape at the end of a word. The keyboard does it for you; on an Israeli keyboard they have their own keys.</p>
  <div class="pa-wrap"><table class="iv-tbl mk-tbl">
    <thead><tr><th scope="col">Letter</th><th scope="col">Regular</th><th scope="col">Final (end of word)</th></tr></thead>
    <tbody>
${finRows}
    </tbody>
  </table></div>
</section>
<!--seo-txt-->
<section class="k-sec seo-txt" aria-labelledby="seo-h">
  <h2 id="seo-h">How to use the Hebrew keyboard</h2>
  <p>This online Hebrew keyboard lets you write in Hebrew from any computer, tablet or phone, without installing anything and without changing your settings. Choose how you want to type with the buttons above the box. The text appears from right to left, as Hebrew should, and the page keeps it on your device until you clear it.</p>
  <h3>Phonetic mode: type Hebrew with English letters</h3>
  <p>If you do not know where the Hebrew letters are, type the way the word sounds. Each English letter types the Hebrew letter with the same sound: b is ב, d is ד, l is ל, m is מ. Hebrew is usually written without vowels, so you type mainly the consonants, and a, e, o and i stand for the letters that often carry those sounds (א, ע, ו, י). For example, typing s-h-l-o-m gives שלום, t-o-d-h gives תודה, b-r-k-h gives ברכה and ch-n-u-k-h gives חנוכה. Type a or e only where the word has an א or ע: a-b-a gives אבא. The table above lists every letter.</p>
  <h3>Israeli layout: the standard Hebrew keyboard</h3>
  <p>The Israeli keyboard layout is the one printed on keyboards sold in Israel, and the one most Israelis type with. In this mode your physical keyboard types Hebrew exactly as if you had switched your computer to Hebrew: T is א, C is ב, A is ש and so on. The keys on the screen show the Hebrew letter in large print with its English key in small print, so you can learn the layout while you type. If you plan to type Hebrew often, learning this layout is worth it, because it is the same on every computer and phone.</p>
  <h3>Screen keys and typing on a phone</h3>
  <p>Tap the keys on the screen with a mouse or a finger. On a phone the page keeps the phone's own keyboard closed, so the Hebrew keys stay in view; tap "Use my phone's keyboard" if you want it back. Hover over a key on a computer to see the name of the letter, which helps when you are learning the Hebrew alphabet.</p>
  <h3>Typing Hebrew vowels (nikud)</h3>
  <p>Modern Hebrew is written without vowel marks, but they are used in prayer books, children's books, poetry and for teaching. To add a vowel, type the letter and then tap the vowel under the keyboard; it attaches to the letter before it. You can add a dagesh, the dot that marks the shin or sin, and the geresh and gershayim used in abbreviations and Hebrew numbers.</p>
  <h3>Copy, search, translate and share</h3>
  <p>When the text is ready, tap Copy and paste it anywhere: an email, a document, a social network or a chat. The other buttons send the text directly to a Google search, to Google Translate (Hebrew to English), to a WhatsApp message or to a new email. A+ and A− change the size of the letters, which helps when reading or checking nikud.</p>
  <h3>How to add a Hebrew keyboard to your computer or phone</h3>
  <p>To type Hebrew in every program, add Hebrew to the keyboards of your device. It is free and built in; the menu names can differ slightly between versions.</p>
  <ul>
    <li><b>Windows 11 and 10:</b> Settings, Time &amp; language, Language &amp; region, Add a language, Hebrew. Switch with the Windows key + Space, or Alt + Shift.</li>
    <li><b>Mac:</b> System Settings, Keyboard, Text Input, Edit, the + button, Hebrew. Choose "Hebrew" for the Israeli layout or "Hebrew – QWERTY" for the phonetic one. Switch with Control + Space or the Globe key.</li>
    <li><b>iPhone and iPad:</b> Settings, General, Keyboard, Keyboards, Add New Keyboard, Hebrew. Switch with the globe icon on the keyboard.</li>
    <li><b>Android (Gboard):</b> open the Gboard settings (the gear on the keyboard), Languages, Add keyboard, Hebrew. Switch with the globe icon or by holding the space bar.</li>
    <li><b>Chromebook:</b> Settings, Device, Keyboard and inputs (or Advanced, Languages and inputs), Inputs, Add input methods, Hebrew.</li>
  </ul>
  <h3>Hebrew QWERTY or the Israeli layout?</h3>
  <p>English speakers often start with a phonetic layout, because the letters are where they expect them. People who will type a lot of Hebrew, or who will use computers in Israel, are usually better off learning the standard layout from the start. You can try both here and switch at any moment.</p>
  <h3>Tips for typing Hebrew</h3>
  <p>Hebrew has no capital letters, so Shift is free for other uses. Punctuation is the same as in English. When you mix English words or numbers into a Hebrew sentence, they still run left to right inside the line; this is how Hebrew is meant to look. If a word ends in the wrong form of a letter, check that "Automatic final letters" is on.</p>
  <h3>More in English</h3>
  <p>Learning the letters? Start with the ${L('/kodesh/alefbet/en/', 'Hebrew alphabet')}, with every letter, its name, sound and number, and add up the letters of a word with the ${L('/kodesh/gimatria/en/', 'gematria calculator')}. Prayers in Hebrew with English transliteration: ${L('/kodesh/birkat-hamazon/en/', 'Birkat Hamazon')}, ${L('/kodesh/shema-israel/en/', 'the Shema')} and ${L('/kodesh/tefilat-haderech/en/', 'the Traveler\'s Prayer')}. Read ${L('/kodesh/parasha/en/', 'this week\'s Torah portion')}, find a date with the ${L('/kodesh/taarich-ivri/en/', 'Hebrew date converter')} and the ${L('/kodesh/luach-ivri/en/', 'Hebrew calendar')}, and get ${L('/kodesh/shabat/en/', 'Shabbat times')} for your city.</p>
</section>
${faqHtml}
<!--/seo-txt-->
`;
fs.mkdirSync(DIR, { recursive: true });
fs.writeFileSync(path.join(DIR, 'index.html'), '<!--meta ' + JSON.stringify(meta, null, 2) + ' -->\n' + body, 'utf8');
console.log('wrote', path.relative(ROOT, path.join(DIR, 'index.html')), 'words', body.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length);
