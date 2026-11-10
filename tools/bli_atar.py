#!/usr/bin/env python3
""""בלי אתר": גרסת וורד, PDF ותבנית ווטסאפ לכלים שבדף המוהלים (למוהל או הורים שלא נכנסים לאתרים).

    python tools/bli_atar.py          # וורד + PDF (דרך Word במחשב) + הדף המרכז
    python tools/bli_atar.py --no-pdf # בלי המרה ל-PDF

התוכן נלקח כמו שהוא מהדפים באתר (checklist, hachana/moed, hachana/tekes, hachana/yom,
hachana/achrei, kibudim). משנים שם קודם, ואז כאן. מה שכבר קיים כ-PDF ב-/mohel/dapim/ רק מקושר.
הקבצים נכתבים ל-kodesh/mohalim/bli-atar/, והדף ל-src/pages/kodesh/mohalim/bli-atar/index.html.
"""
import html, json, pathlib, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from britot_docx import rtl, run, shade, vcenter, NAVY, GOLD, GREY, FONT, TITLE_FONT  # noqa: E402

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "kodesh" / "mohalim" / "bli-atar"
PAGE = ROOT / "src" / "pages" / "kodesh" / "mohalim" / "bli-atar" / "index.html"
URL = "/kodesh/mohalim/bli-atar/"

CREDIT = "מתנה באהבה מגילעד רחמים, מוהל מוסמך, חבר בפורום המוהלים · 058-404-9049 (ווטסאפ) · עוד כלים חינמיים: hakelim.com/kodesh/mohalim"
WA_CREDIT = "_מתוך הכלים החינמיים של גילעד רחמים, מוהל מוסמך וחבר בפורום המוהלים_"
LINE = "━━━━━━━━━━"
SOFT = RGBColor(0x8A, 0x8F, 0x99)

# ---------- תוכן: רשימת ההכנה (src/pages/mohel/checklist) ----------
CHECKLIST = [
    ("בית מרקחת, לאחרי הברית", "💊", [
        ("עזרקאין 5%", "לאלחוש כאבי התינוק לאחר הברית"),
        ("מגבוני אלכוהול או אלכוהול 70% וצמר גפן", "לחיטוי הטבור"),
        ("נובימול", "משכך כאבים לתינוק"),
        ("בפנטן פלוס או מופירוסין", "למריחה אחרי שמורידים את התחבושת"),
        ("משחת הנקה", ""),
        ("שמן טבעי (שקדים או פרפין)", "למריחה אחרי הברית, נגד חיכוך"),
    ]),
    ("היגיינה", "🧴", [
        ("טיטולים ניובורן ומגבונים", ""),
        ("משטח החתלה", "לא חייב שידה, כן משטח"),
        ("שמפו לתינוקות", ""),
    ]),
    ("ביגוד", "👕", [
        ("ביגוד לימים הראשונים עד הברית", ""),
        ("חיתולי בד", "לפליטות ולעטיפת מוהלים"),
        ("בגד לברית לתינוק, משני חלקים", "מכנס/גטקס וחולצה נפרדים"),
        ("בגדים חגיגיים לכל המשפחה", ""),
    ]),
    ("שינה ונסיעה", "🚗", [
        ("סלקל", "חובה ליציאה מבית החולים"),
        ("מיטת תינוק", ""),
        ("עגלה", "או לחכות שמישהו יציע"),
    ]),
    ("לטקס", "🕯️", [
        ("מוהל", "שיחת היכרות לפני הברית"),
        ("מועד הברית", ""),
        ("בדיקת צהבת", "לשמור תוצאה, יום ושעה"),
        ("מקום ושעה", "בבוקר או בצהריים"),
        ("כיסא אליהו", "יש במקום, או להביא מבית הכנסת"),
        ("סנדק", ""),
        ("קוואטר", ""),
        ("מי מברך ומקריא את השם", ""),
        ("קייטרינג / אוכל", ""),
        ("לשלוח הזמנה לברית", ""),
    ]),
    ("להביא ביום הברית", "🎒", [
        ("כרית לברית", ""),
        ("כוס קידוש ויין אדום יבש", ""),
        ("2 טליתות", "לאבא ולסנדק"),
        ("בשמים, עדיף הדסים", "מנהג הספרדים ועדות המזרח"),
        ("סידור לברכות", "אלא אם המוהל מביא"),
        ("דפי סדר הברית והשירון", "או לברר מול המוהל אם הוא מביא מודפסים"),
        ("תיק החתלה", "חיתולי בד, טיטולים, מגבונים, בגד החלפה, תחליף חלב, מוצץ, משחה"),
        ("להאכיל את התינוק עד כשעה לפני", "בשעה שלפני הברית כבר לא מאכילים"),
        ("דפי תפילה לסגולה למוזמנים", "בונוס. אפשר לברר מול המוהל אם הוא דואג לזה"),
    ]),
]

# ---------- תוכן: מועד הברית (src/pages/mohel/hachana/moed + mohel/moed) ----------
MOED_SUB = "על פי היהדות יש לערוך ברית מילה ביום השמיני להולדת הבן, וזה גם המועד הכי מומלץ בריאותית."
MOED = [
    ("יום הברית", [
        "ברית מילה נעשית ביום השמיני ללידה: שבוע אחרי יום הלידה, באותו יום בשבוע.",
        "אם הילד נולד לפני השקיעה, מחשיבים את יום הלידה ליום הראשון. אם הוא נולד לאחר השקיעה, היום הראשון לספירה הוא היום שלמחרת. לשם כך צריך שהרך הנולד יהיה במצב כשיר לברית.",
    ]),
    ("בדיקת צהבת", [
        "יש לערוך לתינוק בדיקת צהבת, ולומר למוהל את התוצאה ואת היום והשעה שבהם נערכה הבדיקה, כי יש לכך השפעה. במידה והצהבת גבולית או גבוהה, תתבקשו לערוך עוד בדיקות. הכול עוד יכול להשתנות, ורק כאשר הילד כשיר לברית ימולו אותו, שחלילה לא יהיה פיקוח נפשות.",
        "מובן שהמוהל ילווה אתכם בתהליך קביעת המועד ויוודא שאכן בנכם כשיר מבחינה בריאותית לביצוע ברית בזמן. ייתכנו מקרים שבהם גם אם הבן בריא, הברית לא תהיה בזמנה, ולכן חייב לדבר לפני עם המוהל.",
    ]),
    ("שבת, חג, וניתוח קיסרי", [
        "ברית בזמנה, ביום השמיני, נעשית גם בשבת וביום טוב. ברית שלא בזמנה, למשל אחרי ניתוח קיסרי או אחרי דחייה בגלל צהבת, לא דוחה שבת, ולכן נדחית ליום חול.",
    ]),
]
MOED_DAYS = [
    ("יום הלידה", "מזל טוב. לנשום. לשים לב אם הלידה הייתה לפני השקיעה או אחריה."),
    ("לקבוע מוהל ומקום", "שיחה אחת קצרה. ככל שמוקדם יותר, רגוע יותר."),
    ("בדיקת צהבת", "בבית החולים או בטיפת חלב. לשמור את התוצאה, היום והשעה."),
    ("כיבודים", "סנדק, קוואטר, מי מברך. לברר במשפחה למי נהוג."),
    ("קניות אחרונות", "לפי רשימת ההכנה: בפנטן פלוס או מופירוסין, בגד משני חלקים."),
    ("ברית יצחק", "בערב: לימוד, תהילים ושירה סביב התינוק."),
    ("יום הברית", "להאכיל עד כשעה לפני, לבוא במצב רוח טוב, ולהשאיר את העייפות מאחור."),
]
MOED_FORM = ["תאריך הלידה", "שעת הלידה", "הלידה הייתה", "ניתוח קיסרי", "בדיקת צהבת: תוצאה, יום ושעה", "מועד הברית בלועזי", "מועד הברית בעברי"]
MOED_FORM_FILL = {"הלידה הייתה": "☐ לפני השקיעה      ☐ אחרי השקיעה", "ניתוח קיסרי": "☐ כן      ☐ לא"}

# ---------- תוכן: הכנות לטקס (src/pages/mohel/hachana/tekes) ----------
TEKES_SUB = "ברית זה אירוע שצריך לערוך במהלך שעות היום, כשהשמש עוד זורחת. כל השאר, אפשר לתכנן בנחת."
TEKES_HALL = [
    ("זמן הברית", "בבוקר או בצהריים. בערב לא עורכים ברית, וכדאי לא לקבוע קרוב לשקיעה."),
    ("כיסא אליהו", "לברר אם יש באולם, או שצריך להביא מבית הכנסת באזור, ואם כן, לדאוג לכך מראש."),
    ("מיקום", "שיהיה נוח למוזמנים, והכי חשוב, שיהיה נוח לכם ההורים. אתם בעלי האירוע, והאישה אחרי לידה וצריכה שיהיה לה הכי נוח. הרגע ילדה!"),
    ("סגנון אולם", "יש לחשוב ולבחון איזה סגנון מתאים לכם. בית כנסת, אולם, מסעדה, או הבית שלכם."),
    ("קייטרינג", "כלול באולם, או מבחוץ."),
    ("", "כמה מוזמנים, מומלץ מיקרופון ורמקול, ואפשר גם DJ."),
]
TEKES_TIP = "ברית יכולה להיות בבית, בבית כנסת, באולם או במסעדה, ובכל מקום היא מרגשת. מה שקובע את האווירה הוא לא המקום, אלא מי שעומד סביב התינוק ומה שרים."
TEKES_HONORS_P = "נהוג לתת לאדם קרוב אחד להיות סנדק, ולאדם קרוב אחר להקריא את ברכות הברית ואת שם הרך הנימול. אם רוצים, ניתן גם לבקש מהמוהל שיקריא את הברכות בנעימה מסורתית ויאמר את שם הרך הנימול."
TEKES_HONORS = [
    ("סנדק", "מי שיושב על כיסא אליהו ומחזיק את התינוק במהלך הברית. הכיבוד הגדול ביותר, לרוב לסבא או לרב."),
    ("כיסא של אליהו", "לפי המסורת אליהו הנביא נוכח בכל ברית, ומניחים את התינוק לרגע על כיסא שמוקדש לו."),
    ("קוואטר", "מכניס את התינוק לאולם הברית ומעביר אותו מיד ליד. אפשר לכבד גם כמה. במשפחות רבות זה הכיבוד לזוג שמחכה לילדים."),
    ("הברכות וקריאת השם", "אחרי המילה מברכים על כוס יין ומכריזים לראשונה על שם התינוק."),
]
TEKES_NOTE = "חשוב לשים לב שלא פוגעים באף אחד מהקרובים שאולי מצפים לקבל אחד מהכיבודים. לכן חשוב לברר לפני במשפחה למי נהוג לתת את הסנדקאות בבן הראשון, וכן הלאה. וכך כולם יהיו מאושרים."

# ---------- תוכן: הכיבודים (src/pages/mohel/kibudim) ----------
KIBUDIM = ["קוואטר", "הנחת התינוק על כסא אליהו", "נטילת התינוק מכסא אליהו ומסירתו לאבי הבן", "סנדק",
           "החזקת התינוק בזמן הברכות", "ברכות על הכוס וקריאת השם", "שירה ופיוטים", "דברי תורה בסעודה", "זימון בברכת המזון"]
KIBUDIM_NOTE = "הקפידו שאף אחד מהקרובים שאולי מצפה לכיבוד לא ייפגע. בררו מראש במשפחה למי נהוג לתת את הסנדקאות בבן הראשון, וכן הלאה, וכך כולם יהיו מאושרים 🙂"


# ---------- תבניות ווטסאפ ----------
def wa_checklist():
    out = ["*📋 רשימת ההכנה לברית*", LINE]
    for i, (title, emo, items) in enumerate(CHECKLIST):
        if i:
            out.append("")
        out.append(f"*{emo} {title}*")
        out += [f"⬜ {name}" for name, _ in items]
    return "\n".join(out + [LINE, WA_CREDIT])


def wa_moed():
    return "\n".join([
        "*📅 מועד הברית*", LINE, MOED_SUB, "",
        "*🌅 יום הברית*", MOED[0][1][0], MOED[0][1][1].split(" לשם כך")[0], "",
        "*🩺 בדיקת צהבת*", "יש לערוך לתינוק בדיקת צהבת, ולומר למוהל את התוצאה ואת היום והשעה שבהם נערכה הבדיקה, כי יש לכך השפעה.", "",
        "*🕯️ שבת, חג, וניתוח קיסרי*", MOED[2][1][0], LINE,
        "*✍️ הפרטים שלנו*", "📅 תאריך הלידה:", "🕰️ שעת הלידה:", "🌅 לפני השקיעה / אחרי השקיעה:",
        "🏥 ניתוח קיסרי: כן / לא", "🩺 בדיקת צהבת (תוצאה, יום ושעה):", LINE,
        "ייתכנו מקרים שבהם גם אם הבן בריא, הברית לא תהיה בזמנה, ולכן חייב לדבר לפני עם המוהל.", WA_CREDIT])


def wa_kibudim():
    out = ["*🤝 הכיבודים בברית*", "_ממלאים ושולחים למוהל_", LINE, "*📝 פרטי הברית*",
           "👨‍👩‍👦 שם האב והאם:", "📅 תאריך הברית:", "🕰️ שעה:", "📍 מקום הברית:",
           "📖 נוסח הברית: ספרדי / עדות המזרח / אשכנז / תימני", "🎤 ציוד הגברה לאולם או לבית הכנסת: יש / אין", LINE,
           "*הכיבודים (שם המכובד וקרבה)*"]
    out += [f"*{i}. {h}:*" for i, h in enumerate(KIBUDIM, 1)]
    return "\n".join(out + [LINE, "💡 " + KIBUDIM_NOTE, WA_CREDIT])


def wa_yom():
    return "\n".join([
        "*🎉 יום הברית: מה להביא*", LINE, "*מה נדרש לברית עצמה*",
        "⬜ כרית לברית", "⬜ כוס קידוש ויין אדום יבש", "⬜ 2 טליתות (אחת לאבא ואחת לסנדק)",
        "⬜ בשמים, עדיפות להדסים (מנהג הספרדים ועדות המזרח)", "⬜ סידור עבור סדר הברכות, אלא אם כן המוהל מביא לכם", "",
        "*👕 ביגוד לתינוק*", "בגד שני חלקים, שניתן יהיה להוריד את הגטקס או המכנס ולהשאיר לתינוק גופייה או חולצה, כך שהתינוק לא יהיה חשוף כולו ולא יהיה לו קר.", "",
        "*🍼 האכלת התינוק*", "יש להאכיל את התינוק עד כשעה לפני הברית. בשעה שלפני כבר לא מאכילים, ועד אז שיאכל כמה שאפשר, בכיף.", "",
        "*🎒 תיק החתלה*", "חיתולי בד, טיטולים, מגבונים, בגד החלפה למקרה שיפספס, תחליפי חלב אם אינו יונק, מוצץ, משחת החתלה.", LINE,
        "והכי חשוב: לבוא במצב רוח טוב, ולהשאיר את כל העייפות מאחור.", WA_CREDIT])


def wa_achrei():
    b = lambda xs: [f"▫️ {x}" for x in xs]
    return "\n".join(
        ["*🩹 אחרי הברית: ההנחיות*", LINE, "*📍 ביום הברית*"] + b([
            "אחרי כל החלפת טיטול – לטפטף שמן טבעי על התחבושת.",
            "לבדוק שהתינוק נותן שתן (בבדיקה בטיטול).",
            "אפשר לשטוף את התינוק כשמונה שעות אחרי הברית.",
            "מעט דם בטיטול – אין סיבה לדאגה. רק במקרה של ריבוי דם – פנו למוהל להוראות.",
            "לשיכוך כאבים אפשר לתת סירופ נובימול כל חמש או שש שעות."]) +
        ["", "*📍 ביום שאחרי הברית*"] + b([
            "רצוי מאוד לעשות לתינוק אמבטיה (כולל מקום הברית) כמה פעמים – המים מרככים את התחבושת.",
            "אחרי האמבטיה – לטפטף על התחבושת שמן טבעי: שקדים או פרפין (אם אין – שמן זית טוב).",
            "המוהל מגיע יום אחרי הברית כדי להוריד את התחבושת. אחרי שהיא יורדת מופיעה סביב החתך הפרשה לבנה־צהבהבה – זה טבעי וחלק מתהליך הריפוי."]) +
        ["", "*📍 אחרי שהמוהל מוריד את התחבושת*"] + b([
            "להתייחס לתינוק כרגיל.",
            "למרוח בפנטן פלוס או מופירוסין סביב מקום הברית – פעמיים ביום, במשך שלושה ימים. לא להגזים – יותר מדי משחה אינו בריא; אם נראה שצריך יותר – רק בתיאום ובייעוץ עם המוהל.",
            "לרחוץ את התינוק באמבטיה פעמיים ביום, במשך חמישה ימים."]) +
        ["", "*🚨 מתי להתקשר מיד*"] + b([
            "דימום שאינו נעצר או כתם דם שהולך וגדל.",
            "התינוק לא הטיל שתן שעות ארוכות אחרי הברית.",
            "חום, נפיחות או אודם שמתפשט.",
            "כל דבר שמדאיג אתכם – אין שאלה מיותרת."]) +
        [LINE, "\"כשהאמא רגועה – גם התינוק רגוע\"",
         "_ההנחיות לא תחליף לרופא הילדים: בכל חשש בריאותי, חום או דימום שלא נעצר, פנו לרופא או למיון._", WA_CREDIT])


# התבנית של יומן הבריתות, זהה לזו שבדף /kodesh/britot/
WA_YOMAN = "\n".join(["*🍼 ברית מילה – יומן*", LINE, "👨‍👩‍👦 *שם ההורים:*", "📅 *תאריך הברית:*", "🕰️ *שעה:*", "📍 *מקום:*",
                      "👶 *שם התינוק:*", "📞 *טלפון:*", "🤝 *סנדק:*", LINE, "👀 *ראיתי את התינוק:* ⬜",
                      "🩹 *הורדתי תחבושת למחרת:* ⬜", "📝 *הערות:*", LINE,
                      "_יומן הבריתות של גילעד רחמים, מוהל מוסמך · 058-404-9049_"])

TEMPLATES = {
    "checklist": ("רשימת ההכנה לברית", wa_checklist()),
    "moed": ("מועד הברית", wa_moed()),
    "kibudim": ("הכיבודים בברית", wa_kibudim()),
    "yom": ("יום הברית: מה להביא", wa_yom()),
    "achrei": ("אחרי הברית: ההנחיות", wa_achrei()),
    "yoman": ("יומן הבריתות (למוהל)", WA_YOMAN),
}


# ---------- וורד ----------
def new_doc(title, sub):
    doc = Document()
    sec = doc.sections[0]
    sec.page_width, sec.page_height = Cm(21.0), Cm(29.7)
    sec.left_margin = sec.right_margin = Cm(1.6)
    sec.top_margin, sec.bottom_margin = Cm(1.2), Cm(1.3)
    sec.footer_distance = Cm(0.6)
    st = doc.styles["Normal"]; st.font.name = FONT; st.font.size = Pt(11)
    st.paragraph_format.space_after = Pt(0)
    p = doc.add_paragraph(); rtl(p); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run(p, "בס״ד", 9, color=GREY)
    p = doc.add_paragraph(); rtl(p); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run(p, title, 26, bold=True, color=NAVY, font=TITLE_FONT)
    if sub:
        p = doc.add_paragraph(); rtl(p); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(2)
        run(p, sub, 11.5, color=GREY)
    gold_rule(doc)
    fp = sec.footer.paragraphs[0]; rtl(fp); fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run(fp, CREDIT, 8, color=GOLD)
    doc.core_properties.title = title
    doc.core_properties.author = "גילעד רחמים, מוהל מוסמך"
    return doc


def gold_rule(doc, before=4, after=8):
    p = doc.add_paragraph(); rtl(p)
    p.paragraph_format.space_before = Pt(before); p.paragraph_format.space_after = Pt(after)
    ppr = p._p.get_or_add_pPr(); bdr = OxmlElement("w:pBdr"); b = OxmlElement("w:bottom")
    b.set(qn("w:val"), "single"); b.set(qn("w:sz"), "10"); b.set(qn("w:color"), "C9A55C"); b.set(qn("w:space"), "1")
    bdr.append(b); ppr.append(bdr)


def heading(container, text, size=15, before=10):
    p = container.add_paragraph(); rtl(p); p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p.paragraph_format.space_before = Pt(before); p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.keep_with_next = True
    run(p, text, size, bold=True, color=NAVY, font=TITLE_FONT)
    return p


def para(container, text, size=11, color=None, bold_lead=""):
    p = container.add_paragraph(); rtl(p); p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p.paragraph_format.space_after = Pt(4); p.paragraph_format.line_spacing = 1.15
    if bold_lead:
        run(p, bold_lead + ": ", size, bold=True, color=NAVY)
    run(p, text, size, color=color)
    return p


def no_borders(table):
    tblpr = table._tbl.tblPr
    b = OxmlElement("w:tblBorders")
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        e = OxmlElement(f"w:{edge}"); e.set(qn("w:val"), "nil"); b.append(e)
    tblpr.append(b)
    tblpr.append(OxmlElement("w:bidiVisual"))


def box(cell, color="C9B07A", fill=None):
    tcpr = cell._tc.get_or_add_tcPr()
    b = OxmlElement("w:tcBorders")
    for edge in ("top", "left", "bottom", "right"):
        e = OxmlElement(f"w:{edge}"); e.set(qn("w:val"), "single"); e.set(qn("w:sz"), "8"); e.set(qn("w:color"), color)
        b.append(e)
    tcpr.append(b)
    if fill:
        shade(cell, fill)


def tip(doc, title, text):
    t = doc.add_table(rows=1, cols=1); no_borders(t); t.alignment = WD_TABLE_ALIGNMENT.CENTER
    c = t.rows[0].cells[0]; box(c, fill="FAF6EC")
    p = c.paragraphs[0]; rtl(p); p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p.paragraph_format.space_before = Pt(4); p.paragraph_format.space_after = Pt(4)
    run(p, title + "  ", 11, bold=True, color=GOLD)
    run(p, text, 10.5)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)


def doc_checklist(path):
    doc = new_doc("רשימת ההכנה לברית", "מסמנים מה כבר יש. אפשר לחזור לרשימה בכל פעם, ולשתף עם בן או בת הזוג.")
    t = doc.add_table(rows=3, cols=2); no_borders(t); t.alignment = WD_TABLE_ALIGNMENT.CENTER
    t.autofit = False
    order = [0, 1, 2, 3, 4, 5]
    for idx, g in enumerate(order):
        title, _, items = CHECKLIST[g]
        c = t.rows[idx // 2].cells[idx % 2]; c.width = Cm(8.9)
        box(c, fill="FDFBF5" if idx % 2 == 0 else "FAF6EC")
        p = c.paragraphs[0]; rtl(p); p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        p.paragraph_format.space_before = Pt(4); p.paragraph_format.space_after = Pt(3)
        run(p, title, 13.5, bold=True, color=NAVY, font=TITLE_FONT)
        for name, note in items:
            q = c.add_paragraph(); rtl(q)
            q.paragraph_format.space_after = Pt(2.5)
            run(q, "☐  ", 12, color=GOLD)
            run(q, name, 10.5)
            if note:
                run(q, "  " + note, 8.5, color=SOFT)
        c.add_paragraph().paragraph_format.space_after = Pt(1)
    p = doc.add_paragraph(); rtl(p); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(8)
    run(p, "דפי סדר הברית והשירון להורדה בחינם: hakelim.com/mohel/dapim", 9.5, color=GREY)
    doc.save(path)


def doc_moed(path):
    doc = new_doc("מועד הברית", MOED_SUB)
    for title, ps in MOED:
        heading(doc, title, before=6)
        for x in ps:
            para(doc, x)
    heading(doc, "הפרטים שלנו", before=10)
    t = doc.add_table(rows=len(MOED_FORM), cols=2); no_borders(t); t.alignment = WD_TABLE_ALIGNMENT.CENTER
    t.autofit = False
    for i, label in enumerate(MOED_FORM):
        a, b = t.rows[i].cells
        a.width, b.width = Cm(5.6), Cm(12.2)
        box(a, fill="0E1628"); box(b, fill="FDFBF5" if i % 2 else "FAF6EC")
        t.rows[i].height = Cm(0.95)
        for c in (a, b):
            vcenter(c)
        p = a.paragraphs[0]; rtl(p); p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        run(p, label, 10.5, bold=True, color=RGBColor(0xF1, 0xDE, 0xA8))
        if label in MOED_FORM_FILL:
            q = b.paragraphs[0]; rtl(q); q.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            run(q, MOED_FORM_FILL[label], 11, color=NAVY)
    heading(doc, "שמונה ימים: מה עושים", before=12)
    for name, text in MOED_DAYS:
        p = doc.add_paragraph(); rtl(p); p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        p.paragraph_format.space_after = Pt(3)
        run(p, "◆  ", 9, color=GOLD); run(p, name + ": ", 11, bold=True, color=NAVY); run(p, text, 11)
    doc.save(path)


def doc_tekes(path):
    doc = new_doc("הכנות לטקס ברית המילה", TEKES_SUB)
    heading(doc, "בחירת אולם", before=4)
    for name, text in TEKES_HALL:
        p = doc.add_paragraph(); rtl(p); p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        p.paragraph_format.space_after = Pt(4); p.paragraph_format.line_spacing = 1.15
        run(p, "☐  ", 12, color=GOLD)
        if name:
            run(p, name + ": ", 11, bold=True, color=NAVY)
        run(p, text, 11)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)
    tip(doc, "טיפ של מוהל", TEKES_TIP)
    heading(doc, "תכנון הטקס: הכיבודים", before=6)
    para(doc, TEKES_HONORS_P)
    t = doc.add_table(rows=len(TEKES_HONORS), cols=2); no_borders(t); t.alignment = WD_TABLE_ALIGNMENT.CENTER
    t.autofit = False
    for i, (name, text) in enumerate(TEKES_HONORS):
        a, b = t.rows[i].cells
        a.width, b.width = Cm(4.2), Cm(13.6)
        box(a, fill="0E1628"); box(b, fill="FDFBF5" if i % 2 else "FAF6EC")
        for c in (a, b):
            vcenter(c)
        p = a.paragraphs[0]; rtl(p); p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        p.paragraph_format.space_before = Pt(4); p.paragraph_format.space_after = Pt(4)
        run(p, name, 11, bold=True, color=RGBColor(0xF1, 0xDE, 0xA8))
        q = b.paragraphs[0]; rtl(q); q.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        q.paragraph_format.space_before = Pt(4); q.paragraph_format.space_after = Pt(4)
        run(q, text, 10.5)
    doc.add_paragraph().paragraph_format.space_after = Pt(4)
    tip(doc, "הערה חשובה", TEKES_NOTE)
    p = doc.add_paragraph(); rtl(p); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run(p, "סדר הברית, השירון וטופס הכיבודים להורדה בחינם: hakelim.com/mohel/dapim", 9.5, color=GREY)
    doc.save(path)


DOCS = [  # slug, כותרת, פונקציה
    ("reshimat-hachana", "רשימת ההכנה לברית", doc_checklist),
    ("moed-habrit", "מועד הברית", doc_moed),
    ("hachanot-letekes", "הכנות לטקס ברית המילה", doc_tekes),
]


def to_pdf(paths):
    import win32com.client
    word = win32com.client.DispatchEx("Word.Application")
    word.Visible = False
    try:
        for d in paths:
            doc = word.Documents.Open(str(d.resolve()), ReadOnly=True)
            doc.SaveAs2(str(d.with_suffix(".pdf").resolve()), FileFormat=17)
            doc.Close(False)
            print("pdf", d.with_suffix(".pdf").name)
    finally:
        word.Quit()


# ---------- הדף המרכז ----------
def wa_box(key):
    title, text = TEMPLATES[key]
    return (f'<details class="ba-wa"><summary>תבנית לווטסאפ</summary>'
            f'<div class="bt-wa" id="tpl-{key}">{html.escape(text)}</div>'
            f'<div class="share-row" style="justify-content:flex-start"><button class="btn btn-gold btn-sm" type="button" data-copy-tpl="tpl-{key}">להעתיק את התבנית</button></div></details>')


def btn(href, label, share, gold=False):
    return (f'<a class="btn {"btn-gold" if gold else "btn-line"} btn-sm" href="{href}" download data-share="{share}">{label}</a>')


def card(anchor, title, line, buttons, wa_key=None):
    return (f'    <article class="tl" id="{anchor}">\n      <div>\n        <h3>{title}</h3>\n        <p>{line}</p>\n'
            f'        <div class="tl-go">{"".join(buttons)}</div>\n'
            + (f"        {wa_box(wa_key)}\n" if wa_key else "") + "      </div>\n    </article>")


def page():
    F = URL
    D = "/mohel/dapim/"
    cards_parents = [
        card("checklist", "רשימת ההכנה לברית", "כל הרשימה לקראת הלידה והברית, בשישה חלקים: בית מרקחת, היגיינה, ביגוד, שינה ונסיעה, לטקס, ולהביא ביום הברית. מדפיסים ומסמנים.",
             [btn(F + "reshimat-hachana.docx", "וורד", "ba_checklist_docx", True), btn(F + "reshimat-hachana.pdf", "PDF להדפסה", "ba_checklist_pdf")], "checklist"),
        card("moed", "מועד הברית", "ההסבר בקצרה: היום השמיני, לידה לפני השקיעה או אחריה, בדיקת צהבת, שבת, חג וניתוח קיסרי. עם טבלה למילוי ושמונה הימים.",
             [btn(F + "moed-habrit.docx", "וורד", "ba_moed_docx", True), btn(F + "moed-habrit.pdf", "PDF להדפסה", "ba_moed_pdf")], "moed"),
        card("kibudim", "טופס הכיבודים", "קוואטר, סנדק, ברכות, שירה וזימון. ההורים ממלאים את השמות ושולחים למוהל.",
             [btn(D + "kibudim.pdf", "PDF להדפסה", "ba_kibudim_pdf", True)], "kibudim"),
        card("tekes", "הכנות לטקס", "בחירת אולם, שעת הברית, וחלוקת הכיבודים בלי שאף אחד ייפגע.",
             [btn(F + "hachanot-letekes.docx", "וורד", "ba_tekes_docx", True), btn(F + "hachanot-letekes.pdf", "PDF להדפסה", "ba_tekes_pdf")]),
        card("yom", "יום הברית", "מה להביא, ואיך מכינים את התינוק.",
             [btn(D + "hachanot.pdf", "PDF להדפסה", "ba_yom_pdf", True)], "yom"),
        card("achrei", "אחרי הברית", "ההנחיות יום אחרי יום, ומתי להתקשר מיד.",
             [btn(D + "acharei.pdf", "PDF להדפסה", "ba_achrei_pdf", True)], "achrei"),
    ]
    dapim = [("seder-sefaradi", "סדר הברית, נוסח ספרדי"), ("seder-edot-hamizrach", "סדר הברית, עדות המזרח"),
             ("seder-ashkenaz", "סדר הברית, אשכנז"), ("shiron", "שירון ופיוטים"), ("shiron-ashkenaz", "שירון אשכנז"),
             ("seudat-brit", "סעודת ברית"), ("tefila-sandak", "תפילה לסנדק"), ("tefila-bechi", "תפילה בשעת בכי התינוק")]
    dapim_btns = [btn(D + s + ".pdf", t, "ba_dapim_" + s) for s, t in dapim]
    cards_parents.append(card("dapim", "דפי הברית להדפסה", "סדר הברית בשלושה נוסחים, שירונים, סעודה ותפילות. כבר קיימים כקובצי PDF.", dapim_btns))
    yoman = card("yoman", "יומן הבריתות שלי", "טבלה מסודרת לכל ברית: הורים, תאריך, מקום, סנדק, ראיתי את התינוק והורדתי תחבושת.",
                 [btn("/kodesh/britot/yoman-britot.docx", "וורד", "britot_docx", True)], "yoman")

    meta = {
        "site": "kodesh", "nav": "mohalim", "tool": "bli_atar",
        "title": "בלי אתר: הכלים לברית כקובץ וורד, PDF או הודעת ווטסאפ | גילעד רחמים המוהל",
        "description": "למוהלים ולהורים שלא נכנסים לאתרים: רשימת ההכנה, מועד הברית, הכיבודים, הכנות לטקס ואחרי הברית, כקובץ וורד, PDF להדפסה או תבנית מוכנה לווטסאפ.",
        "og_title": "הכלים לברית, בלי אתר",
        "noindex": True, "no_cta": True,
        "crumbs": [["כלים למוהלים", "/kodesh/mohalim/"], ["בלי אתר", None]],
        "dock_href": "#kelim", "dock_label": "לקבצים",
        "head": "<style>" + STYLE + "</style>",
        "foot": FOOT,
    }
    return f"""<!--meta {json.dumps(meta, ensure_ascii=False, indent=2)} -->
<header class="hero">
  <span class="bsd">בס"ד</span>
  <h1>הכלים לברית, בלי אתר</h1>
  <p class="sub">לכל מי שלא נכנס לאתרים: כל כלי כקובץ וורד, PDF להדפסה, או תבנית מוכנה לווטסאפ שמעתיקים, ממלאים ושולחים.</p>
  <div class="rule" aria-hidden="true"></div>
</header>
<div class="wrap" id="kelim">
  <div class="tip"><b>איך זה עובד</b><p>וורד: פותחים, ממלאים במחשב או מדפיסים וכותבים ביד. תבנית לווטסאפ: לוחצים "להעתיק", מדביקים בצ'אט, ממלאים ושולחים. אפשר לשמור אותה בצ'אט עם עצמכם ולהשתמש בה כל פעם מחדש. סימון ✅ במקום ⬜ מראה מה כבר יש.</p></div>

  <section aria-labelledby="par-h">
    <h2 id="par-h">להורים</h2>
    <div class="tls">
{chr(10).join(cards_parents)}
    </div>
  </section>

  <section aria-labelledby="moh-h">
    <h2 id="moh-h">למוהל</h2>
    <div class="tls">
{yoman}
    </div>
  </section>
  <p class="disclaimer">חלק מ<a class="gold" href="/kodesh/mohalim/">הכלים למוהלים</a>. התוכן זהה לדפים באתר. אלה ההנחיות שלי, ואם אתם נוהגים אחרת, ההורים שלכם הולכים לפי ההנחיות שלכם.</p>
</div>
"""


STYLE = (".tls{display:grid;gap:1rem}"
         ".tl{padding:1.1rem 1rem;border:1px solid var(--line);border-radius:14px;background:rgba(201,165,92,.05);scroll-margin-top:5rem}"
         ".tl h3{font-family:var(--serif);font-weight:500;color:var(--cream);font-size:1.25rem;line-height:1.3}"
         ".tl p{color:var(--body);font-size:1rem;margin:.3rem 0 0;line-height:1.55}"
         ".tl-go{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.8rem}.tl-go .btn{display:inline-flex}"
         ".ba-wa{margin-top:.8rem}.ba-wa summary{cursor:pointer;color:var(--gold);font-family:var(--serif);font-size:1.05rem}"
         ".bt-wa{white-space:pre-wrap;font-size:1rem;line-height:1.7;padding:.9rem 1rem;border-radius:12px;background:#0b2a22;color:#e9f5ee;border:1px solid rgba(95,191,166,.35);margin:.6rem 0}")
FOOT = ("<script>document.addEventListener('click',function(e){var b=e.target.closest('[data-copy-tpl]');if(!b)return;"
        "var k=b.getAttribute('data-copy-tpl'),t=document.getElementById(k).innerText;"
        "(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){b.textContent='הועתק ✓ עכשיו להדביק בווטסאפ';})"
        ".catch(function(){b.textContent='סמנו את הטקסט והעתיקו';});"
        "if(window.kelimEv)window.kelimEv('bli_atar_copy',{tool:'bli_atar',how:k});});</script>")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    made = []
    for slug, title, fn in DOCS:
        p = OUT / f"{slug}.docx"; fn(p); made.append(p); print("docx", p.name)
    if "--no-pdf" not in sys.argv:
        to_pdf(made)
    PAGE.parent.mkdir(parents=True, exist_ok=True)
    PAGE.write_text(page(), encoding="utf-8")
    print("page", PAGE)
    (OUT / "templates.json").write_text(json.dumps(TEMPLATES, ensure_ascii=False, indent=1), encoding="utf-8") if "--json" in sys.argv else None


if __name__ == "__main__":
    main()
