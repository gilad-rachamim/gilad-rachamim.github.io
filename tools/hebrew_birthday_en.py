# -*- coding: utf-8 -*-
"""מחולל הדף /kodesh/taarich-ivri/en/hebrew-birthday/ – מחשבון יום הולדת עברי באנגלית.
החישוב: assets/hebrew-birthday-en.js (ספריית hebcal שכבר באתר, getBirthdayOrAnniversary).
אין כאן פסיקה: מקרים מיוחדים (בין השמשות, אדר בשנה מעוברת, ל' חשוון/כסלו) – "לשאול רב".
הרצה: python -X utf8 tools/hebrew_birthday_en.py"""
import html, io, json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "src", "pages", "kodesh", "taarich-ivri", "en", "hebrew-birthday", "index.html")
E = html.escape
URL = "/kodesh/taarich-ivri/en/hebrew-birthday/"

TITLE = "Hebrew Birthday Calculator: Find Your Jewish Birthday Free"
H1 = "Hebrew Birthday Calculator"
DESC = ("Hebrew birthday calculator: enter your date of birth and see your Jewish birthday, "
        "the next one and 30 years ahead. Add to calendar. Free, no sign-up.")

FAQ = [
    ("What is my Hebrew birthday?",
     "Your Hebrew birthday is the date you were born on the Hebrew (Jewish) calendar, for example 29 Cheshvan 5775. "
     "Enter your Gregorian date of birth in the calculator at the top of this page, tick \"born after sunset\" if you were born in the evening, "
     "and it shows your Hebrew birthday in English and in Hebrew letters."),
    ("How do I find my Hebrew birthday?",
     "You need two things: the Gregorian date of birth and whether the birth was before or after sunset. "
     "The Hebrew day begins at sunset, so a baby born on Monday evening after sunset was born on Tuesday's Hebrew date. "
     "The calculator does the conversion for you."),
    ("When is my Hebrew birthday this year?",
     "The Hebrew date stays the same, but it falls on a different Gregorian date every year. "
     "The calculator shows your next Hebrew birthday with the day of the week, how many days are left, and a table of the next 30 years."),
    ("Why does my Hebrew birthday change every year?",
     "The Hebrew calendar follows the moon, and about every three years a thirteenth month (Adar II) is added so the holidays stay in their season. "
     "So the same Hebrew date moves around on the Gregorian calendar, usually within a few weeks of the same time of year."),
    ("What if I was born after sunset?",
     "Then your Hebrew birthday is the next day's Hebrew date. Tick \"born after sunset\" and the calculator moves the date forward. "
     "If the birth was very close to sunset (bein hashmashot), ask a rabbi which day to count."),
    ("I was born in Adar. When is my Hebrew birthday in a leap year?",
     "A leap year has two months of Adar. The calculator follows the common practice: someone born in Adar of a regular year "
     "keeps the birthday in Adar II in a leap year, and someone born in Adar I or Adar II of a leap year keeps it in that month when the next leap year comes, "
     "and in Adar in regular years. In a specific case, ask a rabbi."),
    ("What if I was born on 30 Cheshvan or 30 Kislev?",
     "Cheshvan and Kislev sometimes have 29 days and sometimes 30. In a year without the 30th, the calculator shows the birthday on 1 Kislev or 1 Tevet, "
     "following the common rule. For a Bar Mitzvah or another practical question, ask a rabbi."),
    ("Does my Hebrew birthday begin the evening before?",
     "Yes. Like every Hebrew date, a Hebrew birthday begins at sunset on the evening before the Gregorian date in the table and ends at the next sunset."),
    ("What do people do on a Hebrew birthday?",
     "Many people mark the day with extra Torah study, prayer and charity, and with a small celebration with family and friends. "
     "Some have the custom of reading the chapter of Psalms that matches the year of life they are starting."),
    ("Can I add my Hebrew birthdays to Google Calendar or my iPhone?",
     "Yes. After the result appears, tap \"Add to calendar (.ics)\". The file holds the next 30 Hebrew birthdays, "
     "and Google Calendar, Apple Calendar and Outlook all open it."),
    ("I know my Hebrew birthday but not the Gregorian date. Can I still use it?",
     "Yes. Choose \"I know my Hebrew date\", pick the day and month, and the calculator lists the Gregorian dates of that Hebrew date for the next 15 years."),
    ("How is my Bar Mitzvah or Bat Mitzvah date calculated?",
     "A Bar Mitzvah is on the boy's 13th Hebrew birthday and a Bat Mitzvah on the girl's 12th. "
     "The table here shows the age at each birthday; for the Shabbat and the evening before, use the Bar Mitzvah calculator on the Hebrew date converter page."),
    ("Is my birth date sent anywhere?",
     "No. The calculation runs in your browser. The date is saved only on your own device so it is there next time."),
    ("Is this Hebrew birthday calculator free?",
     "Yes. Free, unlimited, no sign-up and no ads. It is part of a free chesed project of tools for everyone."),
]

MONTHS = [
    ("Tishrei", "תשרי", "30", "Sep–Oct"), ("Cheshvan", "חשוון", "29 or 30", "Oct–Nov"),
    ("Kislev", "כסלו", "29 or 30", "Nov–Dec"), ("Tevet", "טבת", "29", "Dec–Jan"),
    ("Shvat", "שבט", "30", "Jan–Feb"), ("Adar (I and II in a leap year)", "אדר", "29 (Adar I: 30)", "Feb–Mar"),
    ("Nisan", "ניסן", "30", "Mar–Apr"), ("Iyyar", "אייר", "29", "Apr–May"),
    ("Sivan", "סיוון", "30", "May–Jun"), ("Tamuz", "תמוז", "29", "Jun–Jul"),
    ("Av", "אב", "30", "Jul–Aug"), ("Elul", "אלול", "29", "Aug–Sep"),
]


def faq_ld():
    return json.dumps({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQ]}, ensure_ascii=False)


def app_ld():
    return json.dumps({"@context": "https://schema.org", "@type": "WebApplication", "name": "Hebrew Birthday Calculator",
                       "url": "https://hakelim.com" + URL, "applicationCategory": "UtilityApplication", "operatingSystem": "Any",
                       "inLanguage": "en", "isAccessibleForFree": True,
                       "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"}}, ensure_ascii=False)


def body():
    faq = "\n".join(f"  <details><summary>{E(q)}</summary><p>{E(a)}</p></details>" for q, a in FAQ)
    months = "\n".join(f'    <tr><td>{E(a)}</td><td lang="he" dir="rtl">{E(b)}</td><td>{E(c)}</td><td>{E(d)}</td></tr>' for a, b, c, d in MONTHS)
    return f"""<header class="k-hero">
  <h1>{E(H1)}</h1>
  <p class="sub">Find your Jewish birthday: enter your date of birth and see your Hebrew birthday, when it falls this year, and the dates for the next 30 years. Add them all to your calendar in one tap.</p>
</header>
<section class="k-sec tool" id="hb-calc" aria-labelledby="hb-h">
  <h2 id="hb-h">Find your Hebrew birthday</h2>
  <div class="ns-chips" role="group" aria-label="What do you know?">
    <button type="button" data-hbmode="birth" aria-pressed="true">I know my date of birth</button>
    <button type="button" data-hbmode="hebrew" aria-pressed="false">I know my Hebrew date</button>
  </div>
  <div id="hb-m1">
    <form class="k-form" novalidate onsubmit="return false">
      <div class="field"><label for="hb-date">Date of birth</label><input id="hb-date" type="date" min="1300-01-01" max="2200-12-31"></div>
      <label class="check"><input type="checkbox" id="hb-after"> <span>Born after sunset (in the evening or at night)</span></label>
    </form>
    <div id="hb-res" aria-live="polite"><p class="iv-ex">Example: born on <bdi dir="ltr">Nov 22, 2014</bdi>, before sunset. Enter your own date and the result updates.</p><div class="res"><h3>Your Hebrew birthday</h3><p class="iv-big">29 Cheshvan 5775</p><p class="iv-he"><span lang="he" dir="rtl">כ״ט חשון תשע״ה</span></p><p class="iv-sub">Born Saturday, November 22, 2014</p></div><div class="res"><h3>Next Hebrew birthday</h3><p class="iv-big"><bdi dir="ltr">Monday, November 29, 2027</bdi></p><p class="iv-g">29 Cheshvan 5788 · turning 13</p></div></div>
  </div>
  <div id="hb-m2" hidden>
    <form class="k-form" novalidate onsubmit="return false">
      <div class="field"><label for="hb-hd">Day</label><select id="hb-hd"></select></div>
      <div class="field"><label for="hb-hm">Hebrew month</label><select id="hb-hm"></select></div>
    </form>
    <div id="hb-res2" aria-live="polite"></div>
  </div>
  <div class="share-row"><a class="btn btn-gold btn-sm" href="#" id="hb-ics" hidden>Add to calendar (.ics)</a><a class="btn btn-line btn-sm" href="#" id="hb-wa" target="_blank" rel="noopener"><svg class="ic"><use href="#wa"/></svg> Send</a><button class="btn btn-line btn-sm" type="button" id="hb-copy">Copy</button></div>
  <p class="disclaimer">The date stays on your device and is not sent anywhere. For a birth close to sunset, in Adar of a leap year or on 30 Cheshvan/Kislev, the calculator follows the common practice; for a practical question ask a rabbi.</p>
</section>
<!--seo-txt-->
<section class="k-sec seo-txt" aria-labelledby="seo-h">
  <h2 id="seo-h">What is a Hebrew birthday?</h2>
  <p>A Hebrew birthday (in Hebrew <i>yom huledet ivri</i>) is your date of birth on the Hebrew calendar: a day, a Hebrew month and a Hebrew year, such as 29 Cheshvan 5775. It is the date used in Jewish life for a Bar Mitzvah or Bat Mitzvah, and many people celebrate it alongside, or instead of, the Gregorian birthday. This Hebrew birthday calculator converts your date of birth to the Jewish calendar and shows when your Hebrew birthday falls every year.</p>
  <h3>How to use the Hebrew birthday calculator</h3>
  <p>Enter the Gregorian date of birth. If the birth was in the evening or at night, after sunset, tick "born after sunset". The calculator then shows three things: your Hebrew birthday in English and in Hebrew letters, your next Hebrew birthday with the day of the week and how many days are left, and a table of your Hebrew birthdays for the next 30 years with your age at each one. Tap "Add to calendar" to save all of them to Google Calendar, an iPhone or Outlook.</p>
  <h3>Why sunset matters</h3>
  <p>On the Hebrew calendar the day begins at sunset, not at midnight. A baby born on Monday at 9 pm was born on Tuesday's Hebrew date. That is why the calculator asks whether the birth was after sunset. If you are not sure, the hospital birth certificate usually gives the time; compare it with sunset in that city on that day. Births during the short time between sunset and nightfall (<i>bein hashmashot</i>) are a question for a rabbi.</p>
  <h3>Why your Hebrew birthday moves on the Gregorian calendar</h3>
  <p>Hebrew months follow the moon, so a Hebrew year of twelve months is about 11 days shorter than a solar year. To keep Passover in the spring, seven years out of every nineteen get a thirteenth month, Adar II. The result: your Hebrew birthday is always the same Hebrew date, but on the Gregorian calendar it moves back about 11 days in a regular year and forward about 19 days after a leap year. Every 19 years the two birthdays come close to the same day again.</p>
  <h3>Adar and the 30th of the month</h3>
  <p>Two cases need a rule. First, Adar: in a leap year there are two months of Adar. The calculator follows the common practice: born in Adar of a regular year, the birthday is kept in Adar II of a leap year; born in Adar I or Adar II of a leap year, it is kept in that same month in later leap years and in Adar in regular years. Second, Cheshvan and Kislev have 29 days in some years and 30 in others. If you were born on the 30th and this year has no 30th, the calculator shows the next day, 1 Kislev or 1 Tevet. In a practical case, for example a Bar Mitzvah, ask a rabbi.</p>
  <h3>I know my Hebrew birthday – when is it this year?</h3>
  <p>If you already know your Hebrew date, for example from a ketubah, a Bar Mitzvah certificate or a parent, choose "I know my Hebrew date", pick the day and the month, and the calculator lists the Gregorian dates of that Hebrew date for the next 15 years. You can add them to your calendar the same way.</p>
  <h3>Hebrew birthday and Bar Mitzvah</h3>
  <p>A Bar Mitzvah is on a boy's 13th Hebrew birthday, and a Bat Mitzvah on a girl's 12th. The age column in the table shows which birthday is which. For the evening the obligation of the mitzvot begins and the Shabbat after it, use the <a href="/kodesh/taarich-ivri/en/#ti-bm-h">Bar Mitzvah and Bat Mitzvah calculator</a> on the Hebrew date converter page.</p>
  <h3>How people mark a Hebrew birthday</h3>
  <p>Many people mark the day with extra Torah study, prayer and charity, and with a small celebration with family and friends. Some have the custom of reading the chapter of Psalms that matches the year of life they are starting. Because the day begins at sunset, a celebration on the evening before is already on the Hebrew birthday.</p>
  <h3>The Hebrew months</h3>
  <table class="ns-tbl"><thead><tr><th scope="col">Month</th><th scope="col">Hebrew</th><th scope="col">Days</th><th scope="col">Falls in</th></tr></thead><tbody>
{months}
  </tbody></table>
  <h3>Hebrew year and Gregorian year</h3>
  <p>The Hebrew year changes on Rosh Hashanah, in September or October, so each Gregorian year spans two Hebrew years. 2026 is 5786 until Rosh Hashanah on September 12, 2026, and 5787 after it. A Hebrew year is written in letters too: 5787 is <span lang="he" dir="rtl">תשפ״ז</span>. To convert any other date, use the <a href="/kodesh/taarich-ivri/en/">Hebrew date converter</a>, and to see a whole month, the <a href="/kodesh/luach-ivri/en/">Hebrew calendar</a>.</p>
  <h3>More free Jewish tools in English</h3>
  <p>The <a href="/kodesh/yahrzeit/en/">yahrzeit calculator</a> finds the anniversary of a passing on the Hebrew calendar. The <a href="/kodesh/luach-ivri/en/holidays/">Jewish holidays 2026 and 2027</a> page lists every holiday, <a href="/kodesh/parasha/en/">this week's Torah portion</a> shows the parsha, and <a href="/kodesh/shabat/en/candle-lighting/">candle lighting times</a> gives Shabbat times for your city. To write your name in Hebrew letters there is the <a href="/kodesh/alefbet/en/">Hebrew alphabet</a> and the <a href="/kodesh/gimatria/en/">gematria calculator</a>.</p>
  <h3>Free, no sign-up and no ads</h3>
  <p>The calculator is free, without limits, without sign-up and without ads. It runs in your browser, nothing is sent anywhere, and your birth date is kept only on your own device so it is ready next time.</p>
</section>
<section class="k-sec seo-faq" aria-labelledby="seo-faq-h">
  <h2 id="seo-faq-h">Questions and answers</h2>
{faq}
</section>
<!--/seo-txt-->
"""


def main():
    meta = {
        "site": "kodesh", "lang": "en", "crumb_root": "Jewish tools", "tool": "hebrew_birthday_en", "no_hub": True,
        "title": TITLE, "description": DESC,
        "og_title": "Hebrew Birthday Calculator – your Jewish birthday, free",
        "priority": "0.8",
        "crumbs": [["Hebrew date converter", "/kodesh/taarich-ivri/en/"], ["Hebrew birthday calculator", None]],
        "head": ('<link rel="stylesheet" href="/assets/seo-txt.css"><link rel="stylesheet" href="/assets/kodesh-ivri.css">'
                 '<link rel="stylesheet" href="/assets/nosim.css">'
                 f'<script type="application/ld+json">{faq_ld()}</script><script type="application/ld+json">{app_ld()}</script>'),
        "foot": ('<script src="/assets/vendor/hebcal-bundle/hebcal-core-6.14.7.min.js" data-hebcal defer></script>'
                 '<script src="/assets/hebrew-birthday-en.js" defer></script>'),
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with io.open(OUT, "w", encoding="utf-8", newline="\n") as f:
        f.write("<!--meta " + json.dumps(meta, ensure_ascii=False, indent=1) + " -->\n" + body())
    print("OK", OUT, len(FAQ), "faq", len(DESC), "desc")


if __name__ == "__main__":
    main()
