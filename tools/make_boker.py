# -*- coding: utf-8 -*-
"""בונה את /kodesh/boker/ (ברכות השחר, ברכות התורה, הנחת תפילין וארבע הפרשיות).
המקור: ספריא (Siddur Ashkenaz – Metsudah, Siddur Edot HaMizrach, Miqra according to the Masorah).
מורידים טעמים ומתגים, כותבים את השמות בכינוי (ה', אלקינו), ומחלקים לפי נוסח.
הרצה: python tools/make_boker.py tools/data/boker-sefaria.json  (ואז python build.py)
"""
import html
import unicodedata
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
raw = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))

NIK = "ְ-ׇּֿׁׂׅׄ"


def flat(t):
    if isinstance(t, list):
        for x in t:
            yield from flat(x)
    else:
        yield t


def N(s):
    return unicodedata.normalize("NFC", s)


def has(a, b):
    return N(b) in N(a)


def rep(s, a, b):
    out = N(s).replace(N(a), N(b))
    assert out != N(s), a
    return out


def clean(s):
    s = re.sub(r"<[^>]+>", "", s)
    s = html.unescape(s).replace(" ", " ").replace(" ", " ")
    s = re.sub(r"\*\([^)]*\)", "", s)                # הערות שוליים של MAM
    s = re.sub(r"\{[פס]\}", "", s)
    s = s.replace("ֺ", "ֹ")                # חולם חסר לוי"ו -> חולם
    s = s.replace("׀", "")                      # פסק
    s = re.sub("[֑-ֽ֯]", "", s)        # טעמים ומתג
    s = s.replace("ׇ", "ָ")                # קמץ קטן -> קמץ (תמיכת גופן)
    s = s.replace("׃", ":")                     # סוף פסוק
    # שם הוי"ה (עם תחילית אפשרית) -> ה'
    s = re.sub(rf"(?<![א-ת{NIK}])([ולבכמש][{NIK}]*)?י[{NIK}]*ה[{NIK}]*ו[{NIK}]*ה[{NIK}]*", lambda m: (m.group(1) or "") + "ה'", s)
    s = re.sub(rf"(?<![א-ת{NIK}])יְיָ", "ה'", s)
    # אלהים / אלהינו / אלהי / ואלהי -> בקו"ף
    s = re.sub(rf"(א[{NIK}]*ל[{NIK}]*)ה(?=[{NIK}]*[ייםנךכ])", r"\1ק", s)
    s = re.sub(r"\s+", " ", s).replace(" :", ":").replace(" ,", ",").strip()
    s = N(s)
    # דגשים וחולם שחסרים במהדורת עדות המזרח בספריא, והשם בסוגריים בלשם ייחוד
    for a, z in (("הַנוֹתֵן לַשֶּׂכְוִי", "הַנּוֹתֵן לַשֶּׂכְוִי"), ("מִלְפָנֶיךָ", "מִלְּפָנֶיךָ"),
                 ("שֶׁתַרְגִּילֵנִי", "שֶׁתַּרְגִּילֵנִי"), ("נִסָיוֹן", "נִסָּיוֹן"), ("וֵאלקֵי", "וֵאלֹקֵי"),
                 (" (ה')", ""), ("אֲדֹנָי", "אֲ-דֹנָי")):
        s = s.replace(N(a), N(z))
    return s


def T(key, i=None):
    items = [x for x in flat(raw[key]["text"]) if x and x.strip()]
    return clean(items[i]) if i is not None else [clean(x) for x in items]


# ---- בלוקים: (נוסח, סוג, טקסט). נוסח: all / ash / em. סוג: h3 / p / ins / resp
S = []


def sec(sid, title, sub):
    S.append({"id": sid, "title": title, "sub": sub, "b": []})


def b(n, kind, text):
    S[-1]["b"].append((n, kind, text))


BAR = "בָּרוּךְ אַתָּה ה' אֱלֹקֵינוּ מֶלֶךְ הָעוֹלָם, "

# 1. השכמת הבוקר
sec("hashkama", "השכמת הבוקר", "מודה אני, נטילת ידיים, אשר יצר, אלקי נשמה")
b("all", "h3", "מוֹדֶה אֲנִי")
b("all", "ins", "מיד כשמתעוררים, עוד במיטה. אין בו שם ה', ולכן אומרים אותו גם לפני נטילת ידיים.")
b("all", "p", "מוֹדֶה אֲנִי לְפָנֶיךָ, מֶלֶךְ חַי וְקַיָּם, שֶׁהֶחֱזַרְתָּ בִּי נִשְׁמָתִי בְּחֶמְלָה, רַבָּה אֱמוּנָתֶךָ.")
b("all", "ins", "אישה אומרת: מוֹדָה אֲנִי.")
b("all", "h3", "נְטִילַת יָדַיִם")
b("all", "ins", "נוטלים מכלי, שלוש פעמים על כל יד לסירוגין: ימין, שמאל, ימין, שמאל. מנגבים ומברכים:")
b("all", "p", BAR + "אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו וְצִוָּנוּ עַל נְטִילַת יָדָיִם.")
b("all", "h3", "אֲשֶׁר יָצַר")
b("all", "ins", "אחרי היציאה מהשירותים. בבוקר אומרים אותה מיד אחרי ברכת נטילת ידיים.")
b("ash", "p", T("ash_asher", 0))
b("em", "p", T("em_morning", 4))
b("all", "h3", "אֱלֹקַי נְשָׁמָה")
b("all", "p", rep(T("em_morning", 6), "מוֹדֶה (האשה אומרת מוֹדָה) אֲנִי", "מוֹדֶה אֲנִי"))
b("all", "ins", "אישה אומרת: מוֹדָה אֲנִי לְפָנֶיךָ.")

# 2. ברכות השחר
sec("shachar", "ברכות השחר", "שבח והודיה על כל דבר קטן שהיום מביא איתו")
ash_m = T("ash_morning")
em_m = T("em_morning")
assert has(ash_m[0], "לַשֶּׂכְוִי") and has(ash_m[4], "כִּרְצוֹנוֹ") and has(ash_m[15], "שֵׁנָה"), "ash order"
for line in ash_m[0:3]:
    b("ash", "p", line)
b("ash", "ins", "האיש מברך:")
b("ash", "p", ash_m[3])
b("ash", "ins", "האישה מברכת במקומה: " + BAR + "שֶׁעָשַׂנִי כִּרְצוֹנוֹ.")
for line in ash_m[5:18]:
    b("ash", "p", line)
# עדות המזרח
assert has(em_m[7], "לַשֶּׂכְוִי") and em_m[15].startswith("בתשעה באב") and has(em_m[24], "כִּרְצוֹנוֹ") and has(em_m[25], "שֵׁנָה"), "em order"
for line in em_m[7:19]:
    if line.startswith("בתשעה באב"):
        b("em", "ins", "בתשעה באב וביום הכיפורים לא אומרים את הברכה הבאה.")
        continue
    b("em", "p", line)
for line in em_m[19:21]:
    main, _, fem = line.partition(" האשה אומרת: ")
    b("em", "p", main)
    b("em", "ins", "אישה אומרת: " + main.rsplit(" ", 1)[0] + " " + fem.strip() + ".")
b("em", "ins", "האיש מברך:")
b("em", "p", em_m[22])
b("em", "ins", "האישה מברכת בלי שם ומלכות: בָּרוּךְ שֶׁעָשַׂנִי כִּרְצוֹנוֹ.")
b("em", "p", em_m[25])
b("em", "p", em_m[26])

# 3. ברכות התורה
sec("torah", "ברכות התורה", "לפני כל לימוד תורה. ברכה אחת בבוקר חלה על כל היום")
ash_t = T("ash_torah")
em_t = T("em_torah")
b("all", "ins", "מברכים לפני שלומדים או אומרים פסוקים. אם כבר בירכו, לא חוזרים לברך במשך היום.")
b("ash", "p", ash_t[0])
b("ash", "p", rep(rep(ash_t[1], "(י\"א תוֹרָתְךָ) ", ""), "תוֹרָתֶךָ. לִשְׁמָהּ", "תוֹרָתֶךָ לִשְׁמָהּ"))
b("ash", "p", ash_t[2])
b("em", "p", em_t[1])
b("em", "p", em_t[2])
b("em", "p", em_t[3])
b("all", "h3", "לִמּוּד קָצָר אַחֲרֵי הַבְּרָכָה")
b("all", "ins", "מיד אחרי הברכות לומדים מעט, כדי שהברכה תחול על לימוד:")
b("ash", "p", T("ash_study", 0))
b("ash", "p", T("ash_study")[1])
b("em", "p", em_t[4])

# 4. טלית
sec("tallit", "עטיפת טלית", "מי שמתעטף בטלית, עושה זאת לפני התפילין")
b("all", "ins", "בודקים את הציציות, ולפני שמתעטפים מברכים:")
b("ash", "p", BAR + "אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו וְצִוָּנוּ לְהִתְעַטֵּף בַּצִּיצִית.")
b("em", "p", BAR + "אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו וְצִוָּנוּ לְהִתְעַטֵּף בְּצִיצִית.")
b("all", "ins", "מי שלובש רק טלית קטן (בלי טלית גדולה), מברך עליו:")
b("all", "p", BAR + "אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו וְצִוָּנוּ עַל מִצְוַת צִיצִית.")

# 5. הנחת תפילין
sec("tefillin", "הנחת תפילין", "שלב אחרי שלב, עם הברכות")
b("ash", "details", ("לשם ייחוד, למי שנוהג לומר לפני ההנחה", T("ash_tefillin", 0)))
b("em", "details", ("לשם ייחוד, למי שנוהג לומר לפני ההנחה", T("em_tefillin", 1)))
b("all", "step", "1. תפילין של יד")
b("all", "ins", "מניחים על השריר של הזרוע ביד שמאל (מי שכותב ביד שמאל, מניח ביד ימין), כשהבית נוטה מעט כלפי הלב. לפני שמהדקים את הרצועה מברכים:")
b("all", "p", BAR + "אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו וְצִוָּנוּ לְהָנִיחַ תְּפִלִּין.")
b("all", "step", "2. תפילין של ראש")
b("ash", "ins", "מהדקים, וכורכים שבע כריכות סביב הזרוע. מניחים את של ראש מעל המצח, במקום שבו מתחילות השערות, באמצע הראש. לפני ההידוק מברכים:")
b("ash", "p", BAR + "אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו וְצִוָּנוּ עַל מִצְוַת תְּפִלִּין.")
b("ash", "ins", "ומיד אחרי ההידוק:")
b("ash", "p", "בָּרוּךְ שֵׁם כְּבוֹד מַלְכוּתוֹ לְעוֹלָם וָעֶד.")
b("em", "ins", "מהדקים, כורכים שבע כריכות סביב הזרוע, ומניחים מיד את של ראש מעל המצח, במקום שבו מתחילות השערות. הברכה הראשונה פוטרת את שתיהן, ולכן לא מדברים ולא מפסיקים ביניהן.")
b("em", "ins", "רק מי שדיבר או הפסיק בין של יד לשל ראש, מברך על של ראש:")
b("em", "p", BAR + "אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו וְצִוָּנוּ עַל מִצְוַת תְּפִלִּין.")
b("all", "step", "3. הכריכות על האצבע")
b("all", "ins", "אחרי של ראש גומרים את של יד: כורכים את הרצועה על האצבע האמצעית, כריכה אחת בפרק האמצעי ושתיים בפרק התחתון, ואומרים:")
b("all", "p", T("ash_tefillin", 9))
b("all", "step", "4. הפרשיות")
b("all", "ins", "אחרי ההנחה אומרים את פרשיות \"קדש\" ו\"והיה כי יביאך\", כך שבכל יום נאמרות כל ארבע הפרשיות שכתובות בתפילין (את \"שמע\" ו\"והיה אם שמוע\" אומרים בקריאת שמע). מי שאין לו זמן לפני התפילה, אומר אותן אחריה.")
b("all", "jump", "לארבע הפרשיות ⬇")

# 6. ארבע הפרשיות
sec("parshiyot", "ארבע הפרשיות שבתפילין", "כפי שהן כתובות בקלף, מתוך התורה")
P = [("p1", "קַדֶּשׁ לִי", "שמות יג, א–י"), ("p2", "וְהָיָה כִּי יְבִאֲךָ", "שמות יג, יא–טז"),
     ("p3", "שְׁמַע יִשְׂרָאֵל", "דברים ו, ד–ט"), ("p4", "וְהָיָה אִם שָׁמֹעַ", "דברים יא, יג–כא")]
for key, name, src in P:
    vs = T(key)
    b("all", "h3", name + f' <small class="bk-src">{src}</small>')
    if key == "p3":
        b("all", "p big", vs[0])
        b("all", "ins", "בלחש:")
        b("all", "p", "בָּרוּךְ שֵׁם כְּבוֹד מַלְכוּתוֹ לְעוֹלָם וָעֶד.")
        vs = vs[1:]
    b("all", "p", " ".join(vs))


# ---- HTML
def esc(t):
    return html.escape(t, quote=False).replace("&lt;small class=\"bk-src\"&gt;", '<small class="bk-src">').replace("&lt;/small&gt;", "</small>")


out = []
for s in S:
    out.append(f'<section class="bk-sec" id="{s["id"]}">')
    out.append(f'  <h2>{s["title"]}</h2>\n  <p class="bk-sub">{s["sub"]}</p>')
    for n, kind, text in s["b"]:
        na = "" if n == "all" else f' data-n="{n}"'
        if kind == "h3":
            out.append(f"  <h3{na}>{esc(text)}</h3>")
        elif kind == "step":
            out.append(f'  <h3 class="bk-step"{na}>{esc(text)}</h3>')
        elif kind == "ins":
            out.append(f'  <p class="ins"{na}>{esc(text)}</p>')
        elif kind == "jump":
            out.append(f'  <p class="bk-jump"{na}><a href="#parshiyot">{esc(text)}</a></p>')
        elif kind == "details":
            summ, body = text
            out.append(f'  <details class="bk-det"{na}><summary>{esc(summ)}</summary><p>{esc(body)}</p></details>')
        else:
            cls = ' class="big"' if kind == "p big" else ""
            out.append(f"  <p{cls}{na}>{esc(text)}</p>")
    out.append("</section>")
body = N("\n".join(out))

META = {
    "site": "kodesh", "nav": "rabanim", "tool": "boker",
    "title": "ברכות השחר, ברכות התורה והנחת תפילין – נוסח נגיש בטלפון | כלי קודש",
    "description": "ברכות השחר, ברכות התורה, עטיפת טלית, הנחת תפילין שלב אחרי שלב וארבע הפרשיות שבתפילין, בנוסח אשכנז וספרד או עדות המזרח. אות גדולה, מסך שלא נכבה, ועובד גם בלי אינטרנט. בחינם.",
    "og_title": "ברכות השחר והנחת תפילין, מול העיניים בטלפון",
    "priority": "0.7",
    "crumbs": [["ברכות השחר ותפילין", None]],
    "head": '<link rel="stylesheet" href="/assets/boker.css">',
    "foot": '<script src="/assets/boker.js" defer></script>',
}
page = f"""<!--meta {json.dumps(META, ensure_ascii=False, indent=1)} -->
<header class="k-hero">
  <h1>ברכות השחר ותפילין</h1>
  <p class="sub">כל מה שאומרים בתחילת היום, מול העיניים בטלפון: מודה אני, ברכות השחר, ברכות התורה, הנחת תפילין שלב אחרי שלב, וארבע הפרשיות שבתפילין.</p>
</header>
<div class="tool bk-bar" id="bk-bar">
  <div class="bk-seg" role="group" aria-label="נוסח">
    <button type="button" data-set-n="ash" aria-pressed="true">אשכנז וספרד</button>
    <button type="button" data-set-n="em" aria-pressed="false">עדות המזרח</button>
  </div>
  <div class="bk-tools">
    <button type="button" class="bk-ic" id="bk-minus" aria-label="אות קטנה יותר">א-</button>
    <button type="button" class="bk-ic" id="bk-plus" aria-label="אות גדולה יותר">א+</button>
    <button type="button" class="bk-ic" id="bk-dark" aria-pressed="false" aria-label="רקע כהה">🌙</button>
    <button type="button" class="bk-ic bk-wake" id="bk-wake" aria-pressed="false" hidden>המסך לא ייכבה</button>
  </div>
  <nav class="bk-nav" aria-label="קפיצה לחלק">
    <a href="#hashkama">השכמה</a><a href="#shachar">ברכות השחר</a><a href="#torah">ברכות התורה</a><a href="#tallit">טלית</a><a href="#tefillin">תפילין</a><a href="#parshiyot">הפרשיות</a>
  </nav>
</div>
<div class="tool">
<div class="bk-paper" id="bk-paper" data-nusach="ash">
  <span class="bsd">בס"ד</span>
{body}
  <p class="bk-foot">השמות הקדושים כתובים בכינוי (ה', אלקינו), ואומרים אותם כרגיל. הנוסח לפי סידור אשכנז וסידור עדות המזרח (מתוך ספריא). נוסח ספרד קרוב מאוד לאשכנז בחלקים האלה. מי שנוהג אחרת, הולך לפי המנהג שלו; ובכל שאלה, שואלים את הרב.</p>
</div>
</div>
<div class="tool bk-install">
  <p><b>שימו בטלפון, ליד התפילין.</b> בתפריט הדפדפן: "הוספה למסך הבית". הדף נפתח כמו אפליקציה ועובד גם בלי אינטרנט.</p>
  <div class="share-row"><a class="btn btn-gold btn-sm" href="#" data-share-tool="wa" data-text="ברכות השחר, ברכות התורה והנחת תפילין, בנוסח נגיש בטלפון:" target="_blank" rel="noopener"><svg class="ic"><use href="#wa"/></svg> לשלוח לחבר בווטסאפ</a></div>
</div>
"""
dest = ROOT / "src" / "pages" / "kodesh" / "boker" / "index.html"
dest.parent.mkdir(parents=True, exist_ok=True)
dest.write_text(page, encoding="utf-8")
print("wrote", dest, len(page))
