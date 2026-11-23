// דף טהרת המשפחה באנגלית: src/pages/kodesh/tahara/en/index.html
// ביטויים: "mikvah calendar" (100–1K), "mikvah" (1K–10K), "taharat hamishpacha", "niddah calculator" (10–100).
// הרצה: node tools/tahara_en.js  ואז  python build.py
// החישוב: assets/tahara-core.js (אותו מודול ואותם מקורות כמו הדפים בעברית, docs/tahara-rules.md). כל הטקסט ההלכתי כאן הוא מהדף העברי, בלי פסיקה חדשה.
// מחקר: ~/.claude/state/kelim-seo/runs/2026-11-23-tahara-en/
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'src/pages/kodesh/tahara/en');
const HEB = '/assets/vendor/hebcal-bundle/hebcal-core-6.14.7.min.js';

const qa = [
  ['What is a mikvah calendar?', 'A mikvah calendar is a calculator that works out the key dates of the family purity laws (taharat hamishpacha): the days to be careful about a new period (the veset, or onah), the earliest day for the hefsek tahara, the seven clean days and the night of immersion in the mikvah. This page does it free in your browser, for five customs.'],
  ['When is the mikvah night?', 'Immersion takes place at night, after nightfall, following the hefsek tahara and seven clean days. If the first day of bleeding is day 1, the hefsek tahara is on day 4 or 5 depending on custom at the earliest, the clean days are the seven days after it, and the mikvah night is the evening after the seventh clean day. The calculator above shows the exact evening for your dates.'],
  ['How many days before the hefsek tahara?', 'It depends on custom. In the sources used here the earliest hefsek tahara is on day 4 for Sephardic and Moroccan communities following Rabbi Ovadia Yosef, and on day 5 for Ashkenazi, Chabad and Ben Ish Chai / Rabbi Mordechai Eliyahu. The first day of bleeding counts as day 1. Where a custom was not verified in the written sources, the page shows the stricter number and says to ask a rabbi.'],
  ['What is a veset or onah?', 'A veset is a time when a woman may expect her period, and an onah is each half-day (daytime or nighttime) in which that is watched for. The main ones are the 30th day from the last period (onah beinonit), the same Hebrew date next month (veset hachodesh) and the same interval as between the last two periods (veset haflagah). These are the days when relations are avoided unless there are clear instructions from a rabbi.'],
  ['What happens if the mikvah night is on Shabbat or Yom Kippur?', 'The calculator flags these. If the seventh clean day ends on Yom Kippur or Tisha B\'Av, immersion moves to the next night. If the mikvah night falls on a Friday night, on a Yom Tov or on Saturday night, the page shows a note, and the details of what to do are for your rabbi or kallah teacher.'],
  ['Does this calculator replace asking a rabbi?', 'No. It is a calculation and memory aid, not a halachic ruling. Wherever the sources do not give a clear answer, or the situation is unusual (a fixed veset, pregnancy, nursing, hormonal medication, an unclear stain), the page says to ask a rabbi or a qualified kallah teacher.'],
  ['Is my data saved or sent anywhere?', 'No. The dates you enter are used only inside your browser to show the result. Nothing is saved on a server, there is no account and no sign-up, and the page has no ads. The site only counts how many people opened the page; it never sees a date.'],
  ['What does "Hebrew date" add?', 'The family purity laws follow the Hebrew calendar. A veset hachodesh, for example, is the same Hebrew day of the month, not the same number of days. The calculator shows the Hebrew date beside every result, and treats a day as beginning at nightfall, so night and day periods are kept apart.']
];
const faqLd = '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: qa.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }) + '</script>';
const faqHtml = '<section class="k-sec seo-faq" aria-labelledby="seo-faq-h">\n  <h2 id="seo-faq-h">Questions about the mikvah calendar</h2>\n' +
  qa.map(([q, a]) => `  <details><summary>${q}</summary><p>${a}</p></details>`).join('\n') + '\n</section>';

const src = [
  ['Onah beinonit: the 30th day from the period', 'Shulchan Aruch Yoreh Deah 189:1; Chochmat Adam 112:5'],
  ['Veset hachodesh: same Hebrew date next month', 'Shulchan Aruch Yoreh Deah 189:2, 6'],
  ['Veset haflagah: the same interval again', 'Shulchan Aruch Yoreh Deah 189:2; Chochmat Adam 112:7'],
  ['Or zarua: the onah before the veset', 'Shach Yoreh Deah 184, note 7'],
  ['Days of waiting before the hefsek (Ashkenazi 5)', 'Rema Yoreh Deah 196:11'],
  ['Hefsek tahara and seven clean days', 'Shulchan Aruch Yoreh Deah 196:1, 3, 4'],
  ['Immersion at night, not on the seventh day', 'Shulchan Aruch Yoreh Deah 197:3'],
  ['Yom Kippur and Tisha B\'Av: immersion is delayed', 'Shulchan Aruch Orach Chayim 613:12; 554:8']
];
const srcTbl = '<table class="tm-src"><thead><tr><th scope="col">Rule</th><th scope="col">Source</th></tr></thead><tbody>' +
  src.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('') + '</tbody></table>';

const meta = {
  site: 'kodesh', nav: 'rabanim', lang: 'en',
  alt: { he: '/kodesh/tahara/', en: '/kodesh/tahara/en/' },
  crumb_root: 'Jewish tools', tool: 'tahara_en', no_hub: true,
  title: 'Mikvah Calendar and Niddah Calculator: Taharat Hamishpacha',
  description: 'Free mikvah calendar and niddah calculator for taharat hamishpacha: mikvah night, hefsek tahara, seven clean days and veset. No sign-up.',
  og_title: 'Mikvah calendar and niddah calculator – free, in English',
  priority: '0.8',
  crumbs: [['Mikvah calendar', null]],
  head: '<link rel="stylesheet" href="/assets/seo-txt.css"><link rel="stylesheet" href="/assets/tahara-en.css"><link rel="stylesheet" href="/assets/lang-switch.css">' + faqLd,
  foot: '<script src="' + HEB + '" data-hebcal defer></script><script src="/assets/tahara-core.js" defer></script><script src="/assets/tahara-en.js" defer></script>'
};
const body = `<header class="k-hero no-print">
  <h1>Mikvah Calendar, Niddah Calculator and Taharat Hamishpacha</h1>
  <p class="sub">Work out your mikvah night, the hefsek tahara, the seven clean days and the days to be careful about the next period (veset), by your custom. Free, no sign-up, nothing is saved.</p>
</header>
<nav class="gr-lang no-print" aria-label="Language / שפה"><a href="/kodesh/tahara/" lang="he" hreflang="he">עברית</a><a href="/kodesh/tahara/en/" lang="en" hreflang="en" aria-current="page">English</a></nav>
<div class="tool" id="tm">
  <section class="tm-card" aria-labelledby="tm-h">
    <h2 id="tm-h">When is my mikvah night?</h2>
    <p class="tm-lead">Enter the first day of bleeding. The result shows the earliest hefsek tahara, the seven clean days and the mikvah night.</p>
    <div class="tm-form">
      <label for="tm-start">First day of bleeding<input type="date" id="tm-start"></label>
      <label for="tm-method">Your custom<select id="tm-method"></select></label>
      <label for="tm-hefsek">Hefsek tahara, if later than the earliest <span class="opt">(optional)</span><input type="date" id="tm-hefsek"></label>
    </div>
    <div id="tm-out" aria-live="polite"><p class="tm-hint">Choose the day the period began, and the result appears here.</p></div>
    <p class="no-print"><button class="btn btn-line btn-sm" type="button" id="tm-reset">Clear</button> <button class="btn btn-line btn-sm" type="button" onclick="window.print()">Print</button></p>
  </section>
  <section class="tm-card" aria-labelledby="tv-h">
    <h2 id="tv-h">Veset calculator: which days to be careful?</h2>
    <p class="tm-lead">Enter the start of the last period, and if you can, the one before it. The result shows the 30th day, the same Hebrew date next month and the same interval again.</p>
    <div class="tm-form">
      <label for="tv-last">Last period began<input type="date" id="tv-last"></label>
      <label for="tv-last-onah">It began in the<select id="tv-last-onah"><option value="day">Daytime</option><option value="night">Night</option></select></label>
      <label for="tv-prev">Previous period began <span class="opt">(optional)</span><input type="date" id="tv-prev"></label>
      <label for="tv-prev-onah">That one began in the<select id="tv-prev-onah"><option value="day">Daytime</option><option value="night">Night</option></select></label>
      <label for="tv-method">Your custom<select id="tv-method"></select></label>
    </div>
    <div id="tv-out" aria-live="polite"><p class="tm-hint">Enter the start of the last period, and the days to be careful appear here.</p></div>
    <p class="no-print"><button class="btn btn-line btn-sm" type="button" id="tv-reset">Clear</button></p>
  </section>
  <noscript><p class="tm-note">The calculators need JavaScript. The explanations below work without it.</p></noscript>
  <p class="disclaimer">A calculation aid, not a halachic ruling. In any doubt, ask a rabbi or a kallah teacher. The dates you enter stay in your browser.</p>
</div>
<!--seo-txt-->
<section class="k-sec seo-txt" aria-labelledby="seo-h">
  <h2 id="seo-h">Mikvah calendar: the family purity laws, step by step</h2>
  <p>Taharat hamishpacha, "family purity", is the Jewish tradition of marital laws that follow a woman's monthly cycle. A couple separates from the start of a period until she immerses in a mikvah, a ritual pool of natural water, on the night after seven clean days. Many women keep a mikvah calendar to know in advance which dates matter: when the next period may come, when the hefsek tahara can be done, and on which night to go to the mikvah. This page is a free mikvah calendar and niddah calculator in English. It is built on the same calculation module as the Hebrew tools on this site, and it follows the written sources shown in the table below.</p>
  <h3>The cycle of the laws</h3>
  <p>The stages follow one another. First comes the period itself, when a woman is a <em>niddah</em>. Then, after the bleeding has stopped and at least four or five days have passed, depending on custom, comes the <strong>hefsek tahara</strong>, an internal check made shortly before sunset that shows the bleeding has ended. After it come <strong>seven clean days</strong>, each checked as taught by a rabbi or kallah teacher. At the end of the seventh day, after nightfall, comes <strong>immersion in the mikvah</strong>, which is why it is called the mikvah night. Then the couple may be together again, until the next period.</p>
  <h3>How the mikvah night is calculated</h3>
  <p>If the first day of bleeding is counted as day 1, the earliest hefsek tahara is on day 4 for Sephardic communities who follow Rabbi Ovadia Yosef, and on day 5 for Ashkenazi, Chabad and the Ben Ish Chai custom. The seven clean days begin the next day. Immersion is on the night after the seventh clean day, not on the daytime of the seventh day. So a hefsek tahara done on a Monday gives clean days from Tuesday to the following Monday, and a mikvah night on Monday evening, after nightfall. The first calculator above does exactly this, shows the Hebrew date beside each result, and moves immersion forward when the seventh day ends on Yom Kippur or Tisha B'Av.</p>
  <h3>Veset and onah: when is the next period expected?</h3>
  <p>A woman who has no fixed pattern keeps three main times of caution, each of them an <em>onah</em>, a half-day (daytime or night). First, <strong>onah beinonit</strong>, the 30th day counted from the day she saw, with the first day as day 1. Second, <strong>veset hachodesh</strong>, the same day of the Hebrew month in the next month. Third, <strong>veset haflagah</strong>, the same number of days between the last two periods. The second calculator shows these three, with the Hebrew date, and the onah (daytime or night) in which each applies.</p>
  <h3>Which custom to choose</h3>
  <p>Customs differ, so the calculator does not choose for you. The options are Sephardic according to Rabbi Ovadia Yosef, the Moroccan custom, Ben Ish Chai and Rabbi Mordechai Eliyahu, Ashkenazi (Shulchan Aruch with the Rema and the Shach), and Chabad (Shulchan Aruch HaRav). Ashkenazi practice keeps the 31st day in addition to the 30th. Chabad keeps the whole twenty-four hours of the 30th day. If your rabbi told you something else, follow your rabbi. For a point that was not verified in the written sources for a custom, the page shows the stricter number and says to ask.</p>
  <h3>What is a mikvah?</h3>
  <p>A mikvah is a pool of water, part of it from rain or a natural source, built to the specifications of Jewish law. It is used for several purposes: by married women after the days of niddah, by those converting to Judaism, and by some men before Shabbat and holidays. It is also used to immerse new dishes. Almost every Jewish community has a mikvah, supervised by a rabbi, and a local rabbi or the community office can tell you where it is and when it is open. Many mikvah attendants (balaniyot) are warm, discreet women who help the visit go smoothly. Ask your rabbi or kallah teacher before your first visit.</p>
  <h3>Preparing for the mikvah</h3>
  <p>Before immersion a woman bathes, washes her hair, cleans her nails and removes anything that could form a barrier between her and the water, such as jewelry, polish and bandages. Each mikvah has its own preparation room and its own instructions, and a kallah teacher can go through the details. The calculator gives dates only; preparation and the manner of immersion are learned from a teacher.</p>
  <h3>Sources behind the calculator</h3>
  <p>Every rule here was checked against the wording of its source. A rule with no clear written source was not added to the calculation; it shows "ask a rabbi" instead. The main ones are:</p>
  ${srcTbl}
  <h3>Privacy: what is saved and where</h3>
  <p>The dates you type are used only in your browser to draw the result. They are not saved, not sent to any server, and the site only counts how many people opened the page. There is no account, no sign-up and no ad. You can print the result and clear the form with one tap.</p>
  <h3>More free tools and learning in English</h3>
  <p>The Hebrew calendar governs these laws, so you may want the <a href="/kodesh/luach-ivri/en/">Hebrew calendar</a> or the <a href="/kodesh/taarich-ivri/en/">Hebrew date converter</a> to check a date. For exact nightfall in your city use <a href="/kodesh/zmanim/en/">zmanim for today</a>, and for Friday night the <a href="/kodesh/shabat/en/">Shabbat times and candle lighting</a>. If you are preparing for conversion, see <a href="/kodesh/giur/en/">preparing for conversion in Israel</a>. The full set of tools in Hebrew, including a personal purity calendar that is saved only on your device, is on the <a href="/kodesh/tahara/">family purity tools page</a>.</p>
  <h3>Why it is free</h3>
  <p>This page is part of "Gilad Rachamim's Tools": simple tools, free, with no sign-up and no ads, built as an act of kindness. It does not promise a ruling; it saves you the arithmetic so you can bring clear dates to your rabbi.</p>
</section>
${faqHtml}
<!--/seo-txt-->
`;
fs.mkdirSync(DIR, { recursive: true });
fs.writeFileSync(path.join(DIR, 'index.html'), '<!--meta ' + JSON.stringify(meta, null, 2) + ' -->\n' + body, 'utf8');
console.log('tahara en: ok', body.split(/\s+/).length, 'words');
