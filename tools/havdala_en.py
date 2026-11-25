# -*- coding: utf-8 -*-
"""Havdalah in English – /kodesh/havdala/en/.
Hebrew word for word from tools/data/havdala-source.json (Sefaria v3: Torat Emet siddur, Nusach Sefard,
public domain; checked against the Daat siddur, Nusach Ashkenaz). The Name is written ה'.
English: the verses from The Holy Scriptures, JPS 1917 (public domain); the four blessings from the
Sefaria Community Translation of Siddur Ashkenaz (CC0) – both in tools/data/havdala-en-source.json.
"Savri maranan" and "Ken tihyeh lanu" have no translation in those sources: a short gloss, marked as such.
Transliteration written for this page.
Run: python -X utf8 tools/havdala_en.py"""
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "tools/data/havdala-source.json"
SRC_EN = ROOT / "tools/data/havdala-en-source.json"
EN_KIDDUSH = ROOT / "src/pages/kodesh/kiddush/en/index.html"
OUT = ROOT / "src/pages/kodesh/havdala/en/index.html"

src = json.loads(SRC.read_text(encoding="utf-8"))
SF = src["Siddur Sefard, Motzaei Shabbat , Havdala"]["text"]
NAME = "יְהֹוָה"
EN = json.loads(SRC_EN.read_text(encoding="utf-8"))


def clean(s):
    s = re.sub(r"<small>.*?</small>", "", s, flags=re.S) if s.lstrip().startswith("<small>") else s
    s = re.sub(r"<[^>]+>", "", s).strip()
    return s.replace(NAME, "ה'")


HE = {"h1": clean(SF[2]), "h2": clean(SF[3]), "h3": clean(SF[4]),
      "h4": clean(SF[5]), "h5": clean(SF[6]), "h6": clean(SF[7])}
for k, v in HE.items():
    assert v and NAME not in v and "<" not in v, k


def bare(s):
    return re.sub(r"[֑-ׇ]", "", s)


assert bare(HE["h1"]).startswith("הנה אל") and bare(HE["h6"]).endswith("לחול:"), "source changed"


def verse(ref):
    t = EN["jps"][ref]["text"]
    t = " ".join(t) if isinstance(t, list) else t
    return re.sub(r"\s+", " ", t.replace("’", "").replace("‘", "")).strip()


VERSES = " ".join(verse(r) for r in ["Isaiah 12:2-3", "Psalms 3:9", "Psalms 46:12", "Psalms 84:13",
                                     "Psalms 20:10", "Esther 8:16"])
CUP = verse("Psalms 116:13")
B = EN["community"]["text"]
EN_B = {"h3": B[10], "h4": B[12], "h5": B[14], "h6": B[16]}
assert EN_B["h3"].endswith("fruit of the vine.") and "distinguishes" in EN_B["h6"], "source changed"

PREFIX = "Baruch ata A-donai, Eloheinu melech ha'olam, "

# (id, who/when, transliteration, English, response, note)
ROWS = [
    ("h1", "Holding the cup – verses of salvation",
     "Hineh El y'shu'ati evtach v'lo efchad, ki ozi v'zimrat Yah A-donai, vay'hi li lishu'ah. "
     "Ushavtem mayim b'sason mima'ainei hay'shu'ah. LA-donai hay'shu'ah, al am'cha virchatecha selah. "
     "A-donai Tz'va'ot imanu, misgav lanu Elohei Ya'akov selah. A-donai Tz'va'ot, ashrei adam botei'ach bach. "
     "A-donai hoshi'ah, hamelech ya'aneinu v'yom kor'einu. LaY'hudim hay'tah orah v'simchah v'sason vikar. "
     "Ken tih'yeh lanu. Kos y'shu'ot esa, uv'shem A-donai ekra.",
     VERSES + " [So may it be for us.] " + CUP,
     "", "Verses from Isaiah 12:2–3, Psalms and the Book of Esther (8:16). Many families say the line "
     "\"LaY'hudim hay'tah orah...\" together, and the leader repeats it."),
    ("h2", "Calling for attention", "Savri maranan v'rabanan v'rabotai.",
     "[Attention, my masters, teachers and friends.]",
     "", "This line is in the Nusach Sefard siddur; the Daat Nusach Ashkenaz siddur does not have it."),
    ("h3", "Blessing over the wine", PREFIX + "borei p'ri hagafen.", EN_B["h3"], "Amen",
     "Hold the cup, but do not drink yet – the wine is drunk at the end of Havdalah."),
    ("h4", "Over the spices", PREFIX + "borei minei v'samim.", EN_B["h4"], "Amen",
     "After the blessing, smell the spices and pass them around the table."),
    ("h5", "Over the candle", PREFIX + "borei m'orei ha'esh.", EN_B["h5"], "Amen",
     "A candle with several wicks is lit for this blessing, or two candles held together."),
    ("h6", "The Havdalah blessing",
     PREFIX + "hamavdil bein kodesh l'chol, bein or l'choshech, bein Yisra'el la'amim, "
     "bein yom hash'vi'i l'sheshet y'mei hama'aseh. Baruch ata A-donai, hamavdil bein kodesh l'chol.",
     EN_B["h6"], "Amen", "After this blessing the one who made Havdalah drinks the wine."),
]


def block(kid, who, tr, en, resp, note):
    out = [f'<div class="kd-b" id="{kid}">', f'<p class="kd-who">{who}</p>',
           f'<p class="kd-he" lang="he" dir="rtl">{HE[kid]}</p>',
           f'<p class="kd-tr"><span class="kd-k">Say:</span> {html.escape(tr, quote=False)}</p>',
           f'<p class="kd-en"><span class="kd-k">Meaning:</span> {html.escape(en, quote=False)}</p>']
    if note:
        out.append(f'<p class="kd-note">{html.escape(note, quote=False)}</p>')
    if resp:
        out.append(f'<p class="kd-resp"><span class="kd-k">Everyone answers:</span> <b>{resp}</b></p>')
    out.append("</div>")
    return "\n".join(out)


FAQ = [
    ("What are the Havdalah blessings?",
     "Havdalah has four blessings: over wine (\"borei p'ri hagafen\"), over spices (\"borei minei v'samim\"), "
     "over the fire of a candle (\"borei m'orei ha'esh\"), and the Havdalah blessing itself, which ends "
     "\"Baruch ata A-donai, hamavdil bein kodesh l'chol\" – Blessed are You, who distinguishes between the holy and the profane. "
     "Before them, holding the cup, verses of salvation are said. All of it is on this page in Hebrew, transliteration and English."),
    ("What does Havdalah mean?",
     "Havdalah means \"separation\" or \"distinction\". With it we mark the end of the holy Shabbat and the start of the six working days of the week."),
    ("When is Havdalah said?",
     "On Saturday night, after Shabbat has ended – when three stars can be seen. The exact time in your city is on the "
     "Shabbat times page; follow your community's rabbi for the time to use."),
    ("What do I need for Havdalah?",
     "A cup of wine or grape juice, fragrant spices such as cloves or myrtle, and a candle with several wicks – many use a braided "
     "Havdalah candle. What to do if something is missing is a question of Jewish law; ask an Orthodox rabbi."),
    ("How do I say Havdalah if I don't read Hebrew?",
     "Read the line marked \"Say:\" under each Hebrew line – the same words in English letters. Tap \"Transliteration only\" "
     "and \"Big print\" to read it from your phone while one hand holds the cup, or print the page."),
    ("Why do people look at their fingernails during Havdalah?",
     "After the blessing over the candle, many hold up their hands toward the flame and look at the light on their fingernails, "
     "to benefit from the light of the fire they have just blessed."),
    ("Why do some put out the candle in the wine?",
     "It is a widespread custom: after Havdalah, a little wine is poured into a dish and the candle is put out in it. Customs differ between families."),
    ("Is Havdalah different after a holiday?",
     "Yes. After a festival or Yom Kippur the order is different from Saturday night. This page is Havdalah at the end of Shabbat; "
     "for holidays use the siddur of your synagogue."),
    ("What is the difference between Nusach Sefard and Ashkenaz here?",
     "In Havdalah the differences are small: the Nusach Sefard siddur has the call \"Savri maranan\" before the blessing over wine, "
     "and the Daat Nusach Ashkenaz siddur does not. The verses and the four blessings are the same."),
    ("Is this page really free?",
     "Yes. No payment, no sign-up and no ads. The site is a volunteer chesed project. The Hebrew is from the Torat Emet siddur on Sefaria (public domain)."),
]

ld = {"@context": "https://schema.org", "@type": "FAQPage",
      "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQ]}

en_k = EN_KIDDUSH.read_text(encoding="utf-8")
CSS = en_k.split('"head": "', 1)[1].split('<script type=', 1)[0]
CSS = json.loads('"' + CSS + '"')

meta = {
    "site": "kodesh",
    "nav": "rabanim",
    "lang": "en",
    "alt": {"en": "/kodesh/havdala/en/", "ru": "/kodesh/havdala/ru/"},
    "crumb_root": "Jewish tools",
    "tool": "havdala_en",
    "no_hub": True,
    "title": "Havdalah Blessing: Hebrew, Transliteration and English",
    "description": "The Havdalah blessings for Saturday night, line by line: Hebrew with vowels, transliteration and English, with when to use the wine, spices and candle. Big print, free.",
    "og_title": "Havdalah – Hebrew, transliteration and English",
    "priority": "0.8",
    "crumbs": [["Havdalah", None]],
    "head": CSS + '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False) + "</script>",
    "foot": '<script src="/assets/havdala-en.js" defer></script>',
}

rows_html = "\n".join(block(*r) for r in ROWS)
faq_html = "\n".join(f"  <details><summary>{html.escape(q)}</summary><p>{html.escape(a)}</p></details>" for q, a in FAQ)

body = f'''<header class="k-hero">
  <h1>Havdalah Blessing: Hebrew, Transliteration and English</h1>
  <p class="lead">Havdalah for Saturday night, line by line: the Hebrew with vowels, the same words in English letters so you can say them aloud over the cup, and what they mean in English. The verses of salvation and all four blessings – wine, spices, candle and the Havdalah blessing.</p>
</header>
<nav class="gr-lang" aria-label="Language / Язык"><a href="/kodesh/havdala/en/" lang="en" hreflang="en" aria-current="page">English</a><a href="/kodesh/havdala/ru/" lang="ru" hreflang="ru">Русский</a></nav>

<section class="k-sec kd-box no-print" aria-labelledby="kd-view-h">
  <h2 id="kd-view-h">Choose what to show</h2>
  <div class="kd-mode" id="kd-mode" role="group" aria-label="What to show">
    <button type="button" data-m="all" aria-pressed="true">All three</button>
    <button type="button" data-m="tr" aria-pressed="false">Transliteration only</button>
    <button type="button" data-m="he" aria-pressed="false">Hebrew only</button>
    <button type="button" data-m="en" aria-pressed="false">English only</button>
  </div>
  <div class="kd-acts">
    <button class="btn btn-gold" type="button" id="kd-big" aria-pressed="false">Big print for the table</button>
    <a class="btn btn-line" href="#" id="kd-wa" target="_blank" rel="noopener">Send on WhatsApp</a>
    <button class="btn btn-line" type="button" id="kd-print">Print</button>
  </div>
</section>

<section class="k-sec" aria-labelledby="kd-txt-h">
  <h2 id="kd-txt-h">Havdalah for Saturday night</h2>
  <p>The one making Havdalah holds a full cup of wine in the right hand and says it aloud; everyone listening answers Amen after each blessing.</p>
{rows_html}
  <p class="kd-src">Hebrew: the Torat Emet siddur, Nusach Sefard, through Sefaria (public domain), checked against the Daat siddur, Nusach Ashkenaz (public domain). The Name of God is written in short form. English: the verses from The Holy Scriptures, JPS 1917 (public domain); the blessings from the Sefaria Community Translation (CC0). Lines in [brackets] are a short explanation written for this page, not a source translation. Transliteration written for this page.</p>
</section>

<!--seo-txt-->
<section class="k-sec seo-txt" aria-labelledby="seo-h">
  <h2 id="seo-h">How to make Havdalah, step by step</h2>
  <h3>1. Wait until Shabbat is over</h3>
  <p>Havdalah is said after Shabbat has ended, when three stars are out. The time changes with your city and the season – see <a href="/kodesh/shabat/en/">Shabbat times for your city</a> or ask the rabbi of your community.</p>
  <h3>2. Set out the wine, spices and candle</h3>
  <p>Put on the table a cup filled with wine or grape juice, fragrant spices and a candle with several wicks. Many families have a braided Havdalah candle and a spice box, but simple things work too: two candles held together so the flames join, and cloves from the kitchen.</p>
  <h3>3. Say the verses and the blessings</h3>
  <p>Holding the cup, say the verses of salvation, then the blessings over wine, spices and fire, and last the Havdalah blessing. Everyone answers Amen. If it is your first time, tap "Transliteration only" and "Big print" – the words stay easy to read on a phone while one hand holds the cup.</p>
  <h3>4. Drink the wine and put out the candle</h3>
  <p>After the Havdalah blessing, the one who said it drinks the wine. Many put out the candle with a few drops of wine from the cup. The new week has begun.</p>
  <h3>Questions of Jewish law</h3>
  <p>Who can say Havdalah for others, what to do if you have no wine, spices or candle, and whether you may eat before Havdalah are questions of Jewish law, and customs differ. Ask an Orthodox rabbi about your family.</p>

  <h2>What the wine, spices and fire mean</h2>
  <h3>Wine – joy</h3>
  <p>Shabbat begins with <a href="/kodesh/kiddush/en/">Kiddush</a> over a cup of wine, and it ends over a cup of wine. The opening verses speak of salvation, light and joy – the words we carry into the week.</p>
  <h3>Spices – comfort</h3>
  <p>Tradition teaches that on Shabbat a person has an "extra soul", which leaves when Shabbat ends. The pleasant smell of the spices refreshes and comforts us at that moment.</p>
  <h3>Fire – the first work of the week</h3>
  <p>Fire is not lit on Shabbat, so the blessing over fire is said as it ends: the flame lit after Shabbat marks the start of the working week. Many raise their hands toward the candle and look at the light on their fingernails.</p>
  <h3>Separating holy from everyday</h3>
  <p>The last blessing lists what God has separated: holy from profane, light from darkness, Israel from the nations, the seventh day from the six working days. Saying it, we recognize that time is not all the same, and that the holiness of Shabbat is special.</p>

  <h2>How to read the transliteration</h2>
  <p>Each word is written in English letters the way it is said in most synagogues in Israel. "ch" is the throaty sound in Bach, not the ch of chair. An apostrophe marks a very short vowel or a break between syllables (b'sason, ha'esh). "ei" sounds like the ey in they, "ai" like the word eye. The Name of God is written with a hyphen (A-donai) out of respect. In many Ashkenazi communities some words sound different, such as "boruch" for "baruch" – both are correct.</p>

  <h2>More free Jewish tools in English</h2>
  <ul>
    <li><a href="/kodesh/kiddush/en/">Kiddush</a> – the Friday night and Shabbat day Kiddush over wine.</li>
    <li><a href="/kodesh/shabat/en/">Shabbat times</a> – when Shabbat starts and ends in your city.</li>
    <li><a href="/kodesh/birkat-hamazon/en/">Birkat Hamazon</a> – the blessing after the meal.</li>
    <li><a href="/kodesh/parasha/en/">Torah portion this week</a> and the <a href="/kodesh/taarich-ivri/en/">Hebrew date converter</a>.</li>
    <li><a href="/kodesh/giur/en/shabat-rishona/">My first Shabbat</a> – a checklist for a first Shabbat at home.</li>
    <li><a href="/kodesh/shema-israel/en/">The Shema</a>, the <a href="/kodesh/kaddish/en/">Mourner's Kaddish</a> and the <a href="/kodesh/tefilat-haderech/en/">Traveler's Prayer</a>.</li>
    <li><a href="/kodesh/havdala/ru/" lang="ru">Авдала</a> – the same Havdalah with Russian transliteration.</li>
  </ul>

  <h2>Questions and answers</h2>
{faq_html}
</section>
<!--/seo-txt-->
'''

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text("<!--meta " + json.dumps(meta, ensure_ascii=False, indent=1) + " -->\n" + body, encoding="utf-8", newline="\n")
print("OK", OUT, len(re.sub(r"<[^>]+>", " ", body).split()), "words")
