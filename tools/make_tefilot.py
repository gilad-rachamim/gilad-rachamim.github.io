# -*- coding: utf-8 -*-
"""בונה את דפי התפילה: /kodesh/shacharit/ (שלושה נוסחים, דף לכל נוסח) ואת /kodesh/nishmat-kol-chai/.

המקור: tools/data/tefilot-source.json (מוריד אותו tools/fetch_tefilot.py מספריא).
הכלל של האתר: הטקסט מספריא בדיוק כמו שהוא, שום מילה לא מושלמת מהזיכרון.
השינויים הם רק בתצוגה: בלי טעמים, שמות הקודש בכינוי, והוראות (מילים בלי ניקוד) בצבע אחר.

הרצה: python -X utf8 tools/make_tefilot.py
"""
import html
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGES = ROOT / "src" / "pages" / "kodesh"
SRC = json.loads((ROOT / "tools" / "data" / "tefilot-source.json").read_text(encoding="utf-8"))

# פונקציות התצוגה (N, name_fix, disp, is_name, runs_html) נלקחות כמו שהן מהסקריפט של דפי הקריאה,
# כדי שכל דפי התפילה באתר יוצגו באותו כלל בדיוק.
_k = (ROOT / "tools" / "make_dapei_kria.py").read_text(encoding="utf-8")
exec(_k[_k.index("NIK = "):_k.index("def plain(")])

VER = {"Daat Siddur Ashkenaz": 'סידור אשכנז, מהדורת "דעת" (נחלת הכלל)',
       "Torat Emet 357": 'סידור ספרד, "תורת אמת" (נחלת הכלל)',
       "Shaliehsaboo Edition": "סידור עדות המזרח, מהדורת שלייסבו (CC0)",
       "The Metsudah siddur, 1981": 'סידור "מצודה", 1981 (רישיון CC-BY)',
       "Tanach with Nikkud": 'תנ"ך מנוקד'}
NUS = [("em", "עדות המזרח"), ("sef", "ספרד"), ("ash", "אשכנז")]
NAME = dict(NUS)
HEAD = ('<link rel="stylesheet" href="/assets/seo-txt.css"><link rel="stylesheet" href="/assets/boker.css">'
        '<link rel="stylesheet" href="/assets/kodesh-kria.css">'
        '<style>.bk-seg a{display:block;text-align:center;font-size:1rem;padding:.55rem .4rem;border-radius:9px;color:var(--body);text-decoration:none}'
        '.bk-seg a.on{background:var(--gold);color:var(--ink);font-weight:700}.bk-paper h3{font-size:1.05em;margin:1.3em 0 .4em;color:#7a5a12}'
        '.bk-paper.dark h3{color:var(--gold)}</style>')
FOOT = '<script src="/assets/kodesh-kria.js" defer></script>'


def plain(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", s))).strip()


def tfix(t):
    """כותרות החלקים (שמות הפרקים בספריא): שם קודש בכינוי, כמו בטקסט."""
    return html.escape(re.sub(r"אלה(?=[יםנ])", "אלק", t), quote=False)


def vers(nodes):
    out = []
    for n in nodes:
        v = VER.get((n.get("versionTitle") or "").strip(), (n.get("versionTitle") or "").strip())
        if v and v not in out:
            out.append(v)
    return ", ".join(out)


def seg_html(seg):
    """מקטע אחד מספריא -> שורות HTML. שורה שכולה בלי ניקוד היא הוראה, וכותרת קצרה מודגשת היא כותרת משנה."""
    out = []
    for part in re.split(r"<br\s*/?>", seg):
        # תגי עיצוב באמצע מילה (אות מודגשת) שוברים את המילה, ולכן יורדים לפני הניתוח
        h, all_i = runs_html(re.sub(r"</?(?:b|big|small|em|i|strong)>", "", part))
        if not h:
            continue
        head = all_i and len(plain(h)) <= 40 and ("<big>" in part or re.fullmatch(r"\s*(<b>[^<]+</b>\s*)+", part))
        if head:
            out.append(f"    <h3>{plain(h).strip(':. ')}</h3>")
        elif all_i:
            out.append(f'    <p class="ins">{h}</p>')
        else:
            out.append(f"    <p>{h}</p>")
    return out


def faq_ld(qa):
    return '<script type="application/ld+json">' + json.dumps({
        "@context": "https://schema.org", "@type": "FAQPage",
        "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": plain(a)}} for q, a in qa]},
        ensure_ascii=False) + "</script>"


def faq_html(qa):
    return ('<section class="k-sec seo-faq" aria-labelledby="seo-faq-h">\n  <h2 id="seo-faq-h">שאלות ותשובות</h2>\n'
            + "\n".join(f"  <details><summary>{q}</summary><p>{a}</p></details>" for q, a in qa) + "\n</section>")


def bar(seg, nav):
    navh = '  <nav class="bk-nav" aria-label="קפיצה לחלק">' + "".join(f'<a href="#{a}">{tfix(b)}</a>' for a, b in nav) + "</nav>\n"
    return f"""<div class="tool bk-bar" id="kr-bar">
{seg}  <div class="bk-tools">
    <button type="button" class="bk-ic" id="kr-minus" aria-label="אות קטנה יותר">א-</button>
    <button type="button" class="bk-ic" id="kr-plus" aria-label="אות גדולה יותר">א+</button>
    <button type="button" class="bk-ic" id="kr-dark" aria-pressed="false" aria-label="רקע כהה">🌙</button>
    <button type="button" class="bk-ic bk-wake" id="kr-wake" aria-pressed="false" hidden>המסך לא ייכבה</button>
  </div>
{navh}</div>"""


def meta(d):
    return "<!--meta " + json.dumps(d, ensure_ascii=False, indent=1) + " -->\n"


def write(rel, text):
    p = PAGES / rel / "index.html"
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(N(text), encoding="utf-8")
    print(rel, len(text.encode("utf-8")) // 1024, "KB")


def install(share_text, extra):
    return f"""<div class="tool bk-install">
  {extra}
  <p>בתפריט הדפדפן: "הוספה למסך הבית", והדף נפתח כמו אפליקציה.</p>
  <div class="share-row"><a class="btn btn-gold btn-sm" href="#" data-share-tool="wa" data-text="{share_text}" target="_blank" rel="noopener"><svg class="ic"><use href="#wa"/></svg> לשלוח לחבר בווטסאפ</a></div>
</div>"""


KROVIM = ('<h3>כלים קרובים</h3>\n  <p><a class="gold" href="/kodesh/shacharit/">תפילת שחרית</a>, '
          '<a class="gold" href="/kodesh/nishmat-kol-chai/">נשמת כל חי</a>, '
          '<a class="gold" href="/kodesh/birkat-hamazon/">ברכת המזון</a>, '
          '<a class="gold" href="/kodesh/tefilat-haderech/">תפילת הדרך</a>, '
          '<a class="gold" href="/kodesh/shema-al-hamita/">קריאת שמע על המיטה</a>, '
          '<a class="gold" href="/kodesh/tehillim/sefer/">ספר תהילים המלא</a>, '
          '<a class="gold" href="/kodesh/zmanim/">זמני היום</a>, '
          '<a class="gold" href="/kodesh/luach-ivri/">לוח שנה עברי</a> ו'
          '<a class="gold" href="/mapa/">מפת האתר</a>.</p>')

# =====================================================================
# שחרית
# =====================================================================
SH = {"em": ("shacharit", "תפילת שחרית", "נוסח עדות המזרח"),
      "sef": ("shacharit/sfarad", "שחרית נוסח ספרד", "נוסח ספרד"),
      "ash": ("shacharit/ashkenaz", "שחרית נוסח אשכנז", "נוסח אשכנז")}

SH_FAQ = [
    ("מה סדר תפילת שחרית?",
     "בקווים כלליים: ברכות השחר וברכות התורה, סדר הקרבנות, פסוקי דזמרה (מ\"ברוך שאמר\" או \"הודו\" ועד \"ישתבח\"), קריאת שמע וברכותיה, תפילת העמידה, תחנון, קריאת התורה בימי שני וחמישי, אשרי ובא לציון, שיר של יום ועלינו לשבח. הסדר המדויק משתנה מעט בין הנוסחים, ובדף הוא מופיע לפי הנוסח שבחרתם."),
    ("איזה נוסחים יש כאן?",
     "שלושה: נוסח עדות המזרח, נוסח ספרד ונוסח אשכנז. לכל נוסח יש דף משלו, ועוברים ביניהם בכפתורים שבראש הדף. כל אחד מתפלל בנוסח של מנהג אבותיו."),
    ("האם זו שחרית של יום חול או של שבת?",
     "זו שחרית של יום חול. התוספות לימים מיוחדים (ראש חודש, חנוכה, תענית, עשרת ימי תשובה) מופיעות במקומן עם הוראה באותיות קטנות, כמו שהן כתובות בסידור המקור."),
    ("מאיפה הטקסט, ואפשר לסמוך עליו?",
     "המילים והניקוד מגיעים מספריא, מילה במילה, מתוך סידורים שמותר להפיץ: מהדורת שלייסבו לעדות המזרח וסידור \"מצודה\" לספרד ולאשכנז. לא הוספנו ולא השלמנו שום מילה מהזיכרון. השינוי היחיד הוא בתצוגה: בלי טעמי המקרא, ושמות הקודש כתובים בכינוי, כדי שיהיה מותר לקרוא גם ממסך. מי שמצא טעות מוזמן לכתוב לנו."),
    ("עד מתי אפשר להתפלל שחרית?",
     "זמן התפילה תלוי במקום ובתאריך, ולכן לא כתבנו כאן שעה. את סוף זמן קריאת שמע וסוף זמן תפילה להיום אפשר לראות בדף <a class=\"gold\" href=\"/kodesh/zmanim/\">זמני היום</a>. בשאלה למעשה שואלים רב."),
    ("איך קוראים בנוחות מהטלפון?",
     "בכפתורים א+ וא- מגדילים ומקטינים את האות, בירח עוברים לרקע כהה, ובשורת הקיצורים קופצים ישר לחלק שצריך: פסוקי דזמרה, קריאת שמע, עמידה או עלינו. המסך נשאר דלוק בזמן הקריאה (בדפדפנים שתומכים בזה). אין פרסומות, אין הרשמה ואין הגבלה."),
    ("האם אפשר להתפלל מתוך הטלפון?",
     "הרבה אנשים מתפללים מהטלפון כשאין סידור בהישג יד. כדאי להעביר את הטלפון למצב שקט כדי שהודעות לא יפריעו באמצע. מי שרוצה סידור מודפס ימצא בבית הכנסת, והדף כאן נועד לרגעים שאין."),
]


def sh_sections(nus):
    """מחזיר [(id, כותרת, html)] לנוסח."""
    nodes = SRC["shacharit"][nus]
    groups = []                               # (כותרת ראשית, [(כותרת משנה, node)])
    for n in nodes:
        he = n["he"]
        if not groups or groups[-1][0] != he[0]:
            groups.append((he[0], []))
        groups[-1][1].append((" – ".join(he[1:]), n))
    secs = []
    for i, (title, items) in enumerate(groups, 1):
        lines = []
        for sub, n in items:
            if sub:
                lines.append(f"    <h3>{tfix(sub)}</h3>")
            body = []
            for seg in n["text"]:
                body += seg_html(seg)
            # כותרת משנה שחוזרת על כותרת החלק עצמו מיותרת
            body = [x for x in body if x != f"    <h3>{title}</h3>"]
            lines += body
        secs.append((f"s{i}", title, "\n".join(lines)))
    return secs


def sh_seo(nus):
    names = "ברכות השחר, פסוקי דזמרה, קריאת שמע וברכותיה, תפילת העמידה, תחנון, אשרי ובא לציון, שיר של יום ועלינו לשבח"
    return f"""<!--seo-txt-->
<section class="k-sec seo-txt" aria-labelledby="seo-h">
  <h2 id="seo-h">תפילת שחרית מלאה לקריאה בטלפון</h2>
  <p>שחרית היא תפילת הבוקר, הראשונה משלוש תפילות היום. כאן היא כתובה במלואה, מההתחלה ועד הסוף, בניקוד מלא ובאות גדולה: {names}. הכול בדף אחד רצוף, בלי לדפדף בין עמודים, בלי פרסומות באמצע התפילה ובלי חלונות קופצים.</p>
  <p>הדף שלפניכם הוא ב{SH[nus][2]}. בכפתורים שבראש הדף עוברים ל<a class="gold" href="/kodesh/shacharit/">שחרית בנוסח עדות המזרח</a>, ל<a class="gold" href="/kodesh/shacharit/sfarad/">שחרית בנוסח ספרד</a> או ל<a class="gold" href="/kodesh/shacharit/ashkenaz/">שחרית בנוסח אשכנז</a>. זו שחרית של יום חול, והתוספות לימים מיוחדים מופיעות במקומן.</p>
  <h3>איך משתמשים בדף</h3>
  <p>שורת הקיצורים שמתחת לכותרת מובילה ישר לחלק שצריך. מי שהגיע לבית הכנסת באיחור יכול לקפוץ לפסוקי דזמרה או לקריאת שמע, ומי שמחפש רק את העמידה או את עלינו לשבח מגיע אליהם בלחיצה אחת. בכפתורים א+ וא- משנים את גודל האות, והירח מעביר לרקע כהה שנוח לעיניים בבוקר מוקדם. ההוראות ("בעשרת ימי תשובה אומרים", "בראש חודש מוסיפים") כתובות באות קטנה ובצבע אחר, כדי שלא יתערבבו עם מילות התפילה.</p>
  <h3>סדר התפילה בקצרה</h3>
  <p>פותחים בברכות השחר ובברכות התורה, ממשיכים לסדר הקרבנות ולפסוקי דזמרה, שהם מזמורי שבח מתהילים. אחריהם קריאת שמע עם הברכות שלפניה ואחריה, ומיד אחריה תפילת העמידה, שמונה עשרה. אחרי העמידה אומרים תחנון, ובימי שני וחמישי קוראים בתורה. מסיימים באשרי, ובא לציון, שיר של יום ועלינו לשבח. בכל נוסח הסדר והניסוח שונים מעט, ולכן לכל נוסח יש כאן דף משלו.</p>
  <h3>מאיפה הטקסט</h3>
  <p>המילים והניקוד נלקחו מספריא, מילה במילה, מתוך סידורים שמותר להפיץ. לא השלמנו שום מילה מהזיכרון. בתצוגה בלבד הורדנו את טעמי המקרא וכתבנו את שמות הקודש בכינוי. הדף אינו תחליף לפסיקת רב: בשאלה למעשה, כמו זמן תפילה או מה אומרים ביום מסוים, שואלים רב.</p>
  <h3>למה בנינו את זה</h3>
  <p>הכלים של גילעד רחמים הם מיזם חסד: הכול בחינם, בלי הגבלה, בלי הרשמה ובלי פרסומות. רצינו שמי שנתקע בלי סידור, בצבא, בעבודה, בנסיעה או בבית החולים, יפתח את הטלפון ויתפלל בנחת, בלי שמשהו יקפוץ לו באמצע.</p>
  {KROVIM}
</section>
{faq_html(SH_FAQ)}
<!--/seo-txt-->"""


ON = ' class="on" aria-current="page"'


def make_shacharit():
    for nus, (rel, h1, nlabel) in SH.items():
        secs = sh_sections(nus)
        seg = '  <div class="bk-seg kr-3" role="group" aria-label="נוסח">' + "".join(
            f'<a href="/kodesh/{SH[k][0]}/"{ON if k == nus else ""}>{v}</a>' for k, v in NUS) + "</div>\n"
        nav = [(sid, t) for sid, t, _ in secs]
        body = "\n".join(f'<section class="bk-sec" id="{sid}">\n  <h2>{tfix(t)}</h2>\n{b}\n</section>' for sid, t, b in secs)
        src = vers(SRC["shacharit"][nus])
        crumbs = [["תפילת שחרית", None]] if nus == "em" else [["תפילת שחרית", "/kodesh/shacharit/"], [nlabel, None]]
        title = {"em": "תפילת שחרית – נוסח עדות המזרח, ספרד ואשכנז, מנוקד | כלי קודש",
                 "sef": "שחרית נוסח ספרד – תפילת שחרית מלאה, מנוקדת | כלי קודש",
                 "ash": "שחרית נוסח אשכנז – תפילת שחרית מלאה, מנוקדת | כלי קודש"}[nus]
        desc = ((f"תפילת שחרית המלאה ב{nlabel}" if nus == "em" else f"שחרית {nlabel}: התפילה המלאה") + ", בניקוד מלא ובאות גדולה: ברכות השחר, פסוקי דזמרה, קריאת שמע, עמידה, תחנון ועלינו. "
                "קפיצה מהירה לכל חלק. בחינם, בלי הרשמה.")
        m = meta({"site": "kodesh", "nav": "rabanim", "tool": "shacharit", "title": title, "description": desc,
                  "og_title": f"תפילת שחרית בטלפון, {nlabel}", "priority": "0.8" if nus == "em" else "0.7", "crumbs": crumbs,
                  "head": HEAD + faq_ld(SH_FAQ), "foot": FOOT})
        page = f"""{m}<header class="k-hero">
  <h1>{h1}</h1>
  <p class="sub">שחרית של יום חול, מההתחלה ועד עלינו לשבח, בניקוד מלא ובאות גדולה. בוחרים נוסח, קופצים לחלק שצריך, ומתפללים בלי פרסומות.</p>
</header>
{bar(seg, nav)}
<div class="tool">
<div class="bk-paper" id="kr-paper" data-tool="shacharit" data-key="shacharit-{nus}" data-nusach="{nus}">
  <span class="bsd">בס"ד</span>
  <p class="kr-nus-now">נוסח: <b>{NAME[nus]}</b></p>
{body}
  <p class="bk-foot">המילים והניקוד מתוך <a href="https://www.sefaria.org.il/" target="_blank" rel="noopener">ספריא</a>, מילה במילה: {src}. בתצוגה בלבד: בלי טעמים, ושמות הקודש בכינוי.</p>
</div>
</div>
{install(f"תפילת שחרית המלאה, {nlabel}, מנוקדת ונוחה לקריאה בטלפון:", '<p><b>אחרי התפילה:</b> <a class="gold" href="/kodesh/tehillim/sefer/">תהילים לפי ימי השבוע</a>, <a class="gold" href="/kodesh/zmanim/">זמני היום</a> ו<a class="gold" href="/kodesh/tefilat-haderech/">תפילת הדרך</a>.</p>')}
{sh_seo(nus)}
"""
        write(rel, page)


# =====================================================================
# נשמת כל חי
# =====================================================================
NI = SRC["nishmat"]
NI_PARTS = [
    ("nishmat", "נשמת כל חי", "התפילה עצמה, מ\"נשמת כל חי\" ועד \"וכל קרבי את שם קדשו\"",
     {"em": ("em", range(18, 23)), "sef": ("sef", range(88, 90)), "ash": ("ash", range(0, 1))}),
    ("shochen", "שוכן עד ובמקהלות", "ההמשך שאומרים בתפילת שחרית של שבת ויום טוב",
     {"em": ("em", range(23, 28)), "sef": ("sef", range(90, 97)), "ash": ("ash_shochen", range(0, 4))}),
    ("yishtabach", "ישתבח", "הברכה שחותמת את פסוקי דזמרה",
     {"em": ("em", range(28, 30)), "sef": ("sef", range(97, 98)), "ash": ("ash_yishtabach", range(0, 1))}),
]
NI_FAQ = [
    ("מתי אומרים נשמת כל חי?",
     "בתפילת שחרית של שבת ושל יום טוב, בסוף פסוקי דזמרה, אחרי שירת הים ולפני \"ישתבח\". אומרים אותה גם בליל הסדר, בסוף ההגדה. מלבד זה יש נוהגים לומר אותה כתפילת הודיה אחרי ישועה, בכל יום שרוצים."),
    ("מה זה \"סגולת נשמת כל חי\"?",
     "מנהג שנפוץ בקהילות רבות: מי שנמצא בצרה מקבל על עצמו לומר \"נשמת כל חי\" בציבור, כשייוושע, ויש שאומרים אותה גם כבקשה. זה מנהג ולא חובה. התפילה עצמה כולה שבח והודיה, ולכן היא מתאימה לכל מי שרוצה לומר תודה."),
    ("מה ההבדל בין הנוסחים?",
     "התפילה כמעט זהה בכל הנוסחים. ההבדלים הם בכמה מילים, ובעיקר בסוף: בנוסח עדות המזרח ובנוסח ספרד אומרים \"בפי ישרים תתרומם\", ובנוסח אשכנז \"בפי ישרים תתהלל\". בוחרים נוסח בכפתורים שלמעלה, והדף זוכר את הבחירה."),
    ("איפה נגמרת התפילה?",
     "התפילה עצמה מסתיימת במילים \"ברכי נפשי את ה' וכל קרבי את שם קדשו\". בתפילת שבת ממשיכים מיד ל\"האל בתעצומות עוזך\", \"שוכן עד\", \"ובמקהלות\" ו\"ישתבח\", ולכן הבאנו גם אותם, כל אחד תחת כותרת משלו."),
    ("מי חיבר את נשמת כל חי?",
     "התפילה עתיקה מאוד, והיא נזכרת כבר בתלמוד בשם \"ברכת השיר\" (פסחים קיח). שם המחבר אינו ידוע בוודאות."),
    ("מאיפה הטקסט שבדף?",
     "מספריא, מילה במילה: עדות המזרח מסידור מהדורת שלייסבו, ספרד מסידור \"תורת אמת\", ואשכנז מסידור \"דעת\". לא השלמנו שום מילה מהזיכרון. בתצוגה בלבד הורדנו טעמים וכתבנו את שמות הקודש בכינוי. בנוסח אשכנז הניקוד במקור חסר בכמה אותיות (חולם), והשארנו אותו כמו שהוא."),
    ("אפשר להדפיס או לשלוח?",
     "כן. בתפריט הדפדפן בוחרים \"הדפסה\" והדף יוצא נקי, בלי הכפתורים. ובכפתור הווטסאפ שולחים את הקישור למי שביקש שתאמרו איתו. הכול בחינם, בלי הרשמה ובלי פרסומות."),
]


def make_nishmat():
    secs = []
    for sid, title, sub, by in NI_PARTS:
        blocks = []
        for nus, _ in NUS:
            key, rng = by[nus]
            lines = []
            for i in rng:
                lines += seg_html(NI[key]["text"][i])
            blocks.append(f'  <div data-n="{nus}">\n' + "\n".join(lines) + "\n  </div>")
        secs.append(f'<section class="bk-sec" id="{sid}">\n  <h2>{title}</h2>\n  <p class="bk-sub">{sub}</p>\n' + "\n".join(blocks) + "\n</section>")
    seg = '  <div class="bk-seg kr-3" role="group" aria-label="נוסח">' + "".join(
        f'<button type="button" data-set-n="{k}" aria-pressed="false">{v}</button>' for k, v in NUS) + "</div>\n"
    nav = [(sid, t) for sid, t, _, _ in NI_PARTS]
    src = "; ".join(f"{NAME[k]} – {VER[NI[k]['versionTitle'].strip()]}" for k, _ in NUS)
    seo = f"""<!--seo-txt-->
<section class="k-sec seo-txt" aria-labelledby="seo-h">
  <h2 id="seo-h">נשמת כל חי, התפילה המלאה בניקוד</h2>
  <p>"נשמת כל חי" היא אחת מתפילות השבח וההודיה היפות שבסידור. היא פותחת במילים "נשמת כל חי תברך את שמך" וכולה הודאה על הטוב: "אילו פינו מלא שירה כים... אין אנחנו מספיקים להודות לך". כאן היא כתובה במלואה, בניקוד מלא ובאותיות גדולות וקריאות, בנוסח עדות המזרח, בנוסח ספרד ובנוסח אשכנז.</p>
  <h3>מתי אומרים נשמת כל חי</h3>
  <p>מקומה הקבוע הוא בתפילת שחרית של שבת ויום טוב, בסוף פסוקי דזמרה, וגם בסוף ההגדה בליל הסדר. מעבר לזה, בקהילות רבות נוהגים לומר אותה כהודיה אחרי ישועה: אחרי לידה, רפואה, שחרור מהצבא או כל בשורה טובה. יש שמתאספים עשרה ואומרים אותה יחד.</p>
  <h3>נשמת כל חי נוסח עדות המזרח, ספרד ואשכנז</h3>
  <p>בוחרים נוסח בכפתורים שבראש הדף, והדף זוכר את הבחירה לפעם הבאה. ההבדלים בין הנוסחים קטנים, כמה מילים וסדר השורות בסוף, אבל כל אחד רגיל לנוסח של בית אבא, ולכן הבאנו את שלושתם כמו שהם בסידורים.</p>
  <h3>איך קוראים בנוחות</h3>
  <p>בכפתורים א+ וא- מגדילים ומקטינים את האות, והירח מעביר לרקע כהה. המסך נשאר דלוק בזמן הקריאה (בדפדפנים שתומכים בזה), כך שלא צריך לגעת בטלפון באמצע התפילה. ההוראות כתובות באות קטנה ובצבע אחר. אין פרסומות, אין חלונות קופצים ואין הרשמה.</p>
  <h3>מה יש בדף</h3>
  <p>שלושה חלקים, כל אחד תחת כותרת: התפילה עצמה עד "וכל קרבי את שם קדשו"; ההמשך שאומרים בשבת, "שוכן עד" ו"ובמקהלות"; וברכת "ישתבח" שחותמת את פסוקי דזמרה. מי שאומר את התפילה כהודיה יכול לעצור בסוף החלק הראשון, או להמשיך, לפי מנהגו.</p>
  <h3>מאיפה הטקסט</h3>
  <p>המילים והניקוד נלקחו מספריא, מילה במילה. לא השלמנו שום מילה מהזיכרון. בתצוגה בלבד הורדנו את טעמי המקרא וכתבנו את שמות הקודש בכינוי. לתפילת השבת כולה ראו גם את <a class="gold" href="/kodesh/shacharit/">תפילת שחרית</a> של יום חול, ואת <a class="gold" href="/kodesh/birkat-hamazon/">ברכת המזון</a> לסעודת ההודיה.</p>
  {KROVIM}
</section>
{faq_html(NI_FAQ)}
<!--/seo-txt-->"""
    m = meta({"site": "kodesh", "nav": "rabanim", "tool": "nishmat", "priority": "0.8",
              "title": "נשמת כל חי – התפילה המלאה מנוקדת, עדות המזרח, ספרד ואשכנז | כלי קודש",
              "description": "תפילת נשמת כל חי המלאה בניקוד ובאותיות גדולות, בנוסח עדות המזרח, ספרד או אשכנז. מתי אומרים, מה הסגולה, וכפתור שליחה בווטסאפ. בלי פרסומות ובלי הרשמה.",
              "og_title": "נשמת כל חי, מנוקד ובאות גדולה", "crumbs": [["נשמת כל חי", None]],
              "head": HEAD + faq_ld(NI_FAQ), "foot": FOOT})
    page = f"""{m}<header class="k-hero">
  <h1>נשמת כל חי</h1>
  <p class="sub">תפילת נשמת כל חי המלאה, בניקוד מלא ובאותיות גדולות. בוחרים נוסח, מגדילים את האות, והמסך לא נכבה באמצע.</p>
</header>
{bar(seg, nav)}
<div class="tool">
<div class="bk-paper" id="kr-paper" data-tool="nishmat" data-key="nusach" data-nusach="em">
  <span class="bsd">בס"ד</span>
  <p class="kr-nus-now">נוסח: <b id="kr-nlabel">עדות המזרח</b></p>
{chr(10).join(secs)}
  <p class="bk-foot">המילים והניקוד מתוך <a href="https://www.sefaria.org.il/" target="_blank" rel="noopener">ספריא</a>, מילה במילה: {src}. בתצוגה בלבד: בלי טעמים, ושמות הקודש בכינוי.</p>
</div>
</div>
{install("תפילת נשמת כל חי המלאה, מנוקדת ובאות גדולה, בנוסח עדות המזרח, ספרד או אשכנז:", '<p><b>סעודת הודיה?</b> <a class="gold" href="/kodesh/birkat-hamazon/">ברכת המזון</a> בשלושה נוסחים, ו<a class="gold" href="/kodesh/brachon/">ברכונים להדפסה עם הקדשה</a>.</p>')}
{seo}
"""
    write("nishmat-kol-chai", page)


if __name__ == "__main__":
    make_shacharit()
    make_nishmat()
