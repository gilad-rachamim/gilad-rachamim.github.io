#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""בונה את דפי הקריאה של כלי קודש מתוך המקורות שהורדו מספריא (tools/fetch_dapei_kria.py):
  /kodesh/birkat-hamazon/      ברכת המזון, זימון, מעין שלוש ובורא נפשות – עדות המזרח, ספרד, אשכנז
  /kodesh/tefilat-haderech/    תפילת הדרך וברכת הגומל
  /kodesh/tehillim/sefer/      תהילים: כל הפרקים, לפי יום בחודש ויום בשבוע
  /kodesh/tehillim/sefer/<n>/  דף לכל פרק (150)

המילים והניקוד מהמקור, כמו שהם. מה שמשתנה בתצוגה בלבד (אותו כלל כמו בדף ברכות השחר, tools/make_boker.py):
  טעמי המקרא והמתג יורדים, פסק (׀) יורד, סוף פסוק (׃) נכתב ":", קמץ קטן נכתב קמץ, חולם חסר נכתב חולם;
  בתהילים: הכתיב יורד והקרי נשאר בלי סוגריים (כמו assets/tehillim-text.js);
  השמות הקדושים בכינוי: שם הוי"ה ו-יי נכתבים ה', אלהים / אלהינו נכתבים בקו"ף, אדני נכתב אֲ-דֹנָי.
  שום מילה לא מושלמת מהזיכרון. מה שחסר במקור – כתוב בדף שהוא חסר.
הבדיקה (נכתבה שוב, בנפרד מהקוד הזה): python tools/check_dapei_kria.py
הרצה:  python tools/make_dapei_kria.py   ואז   python build.py
"""
import html
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from tehillim_perakim import T as PEREK_T  # נושא ומנהג אמירה לכל פרק
SRC = json.loads((ROOT / "tools" / "data" / "dapei-kria-source.json").read_text(encoding="utf-8"))
TEH = json.loads((ROOT / "tools" / "data" / "tehillim-source.json").read_text(encoding="utf-8"))
PAGES = ROOT / "src" / "pages" / "kodesh"

NIK = "ְ-ׇּֿׁׂׅׄ"   # ניקוד (בלי מקף, פסק וסוף פסוק)


def N(s):
    return unicodedata.normalize("NFC", s)


# ---------- ניקוי לתצוגה ----------
def name_fix(s):
    s = re.sub(rf"(?<![א-ת{NIK}])((?:[ולבכמש][{NIK}]*){{0,2}})י[{NIK}]*ה[{NIK}]*ו[{NIK}]*ה[{NIK}]*", lambda m: m.group(1) + "ה'", s)
    s = re.sub(rf"(?<![א-ת{NIK}])((?:[ולבכמש][{NIK}]*){{0,2}})י[{NIK}]*[‑\-]?י[{NIK}]*(?![א-ת{NIK}'])", lambda m: m.group(1) + "ה'", s)
    s = re.sub(rf"(א[{NIK}]*ל[{NIK}]*)ה(?=[{NIK}]*[ייםנךכ])", r"\1ק", s)
    s = s.replace(N("אֲדֹנָי"), N("אֲ-דֹנָי"))
    return s


def disp(t):
    t = html.unescape(t).replace("\xa0", " ").replace(" ", " ").replace("‏", "").replace("‎", "")
    t = re.sub("[֑-ֽ֯]", "", t)     # טעמים ומתג
    t = t.replace("׀", "")                      # פסק
    t = t.replace("׃", ":")                     # סוף פסוק
    t = t.replace("ׇ", "ָ").replace("ֺ", "ֹ")
    t = N(t)
    return N(name_fix(t))


def pre_mam(seg):
    """מקרא על פי המסורה: הערות, כתיב וקרי, פ/ס פתוחה וסתומה."""
    seg = re.sub(r"<sup[^>]*>.*?</sup>", "", seg, flags=re.S)
    seg = re.sub(r'<i class="footnote">.*?</i>', "", seg, flags=re.S)
    seg = re.sub(r'<span class="mam-kq-k">.*?</span>', "", seg, flags=re.S)
    seg = re.sub(r'<span class="mam-kq-q">\[(.*?)\]</span>', r"\1", seg, flags=re.S)
    seg = re.sub(r'<span class="mam-spi-[^"]*">.*?</span>', "", seg, flags=re.S)
    seg = re.sub(r"\{[פס]\}", "", seg)
    return seg


def is_name(w):
    return bool(re.fullmatch(r"[\(\[]?(?:[ולבכמש][ְ-ׇ]*){0,2}ה'[\)\],.:;]*", w))


def runs_html(seg, mam=False):
    """מחזיר HTML של מקטע: טקסט התפילה רגיל, והוראות (מילים בלי ניקוד) בתוך span.ii. וגם: האם כל המקטע הוראה."""
    if mam:
        seg = pre_mam(seg)
    seg = re.sub(r"<br\s*/?>", " ", seg)
    parts = re.split(r"(<[^>]+>)", seg)
    words = []                                   # (text, kind) kind: L / I / None (רווח או סימן)
    for p in parts:
        if not p or p.startswith("<"):
            continue
        t = disp(p)
        for w in re.split(r"(\s+)", t):
            if not w:
                continue
            if w.isspace():
                words.append((w, None))
                continue
            heb = re.search("[א-ת]", w)
            nik = re.search(f"[{NIK}]", w)
            if heb and not nik and not is_name(w):
                words.append((w, "I"))
            elif heb:
                words.append((w, "L"))
            else:
                words.append((w, "P"))
    # סימן בלי אותיות מקבל את הסוג של המילה שלפניו (או אחריו)
    kinds = [k for _, k in words]
    for i, k in enumerate(kinds):
        if k == "P":
            prev = next((kinds[j] for j in range(i - 1, -1, -1) if kinds[j] in ("L", "I")), None)
            nxt = next((kinds[j] for j in range(i + 1, len(kinds)) if kinds[j] in ("L", "I")), None)
            # סוגר פותח שייך למה שאחריו, כל השאר למה שלפניו
            kinds[i] = (nxt if words[i][0][:1] in "([" else prev) or nxt or prev or "L"
    lab = [k for k in kinds if k in ("L", "I")]
    all_i = bool(lab) and all(k == "I" for k in lab)
    out, cur = [], None
    for (w, _), k in zip(words, kinds):
        if k is None:                            # רווח: נשאר בתוך הקבוצה הנוכחית
            out.append(html.escape(w, quote=False))
            continue
        if k != cur:
            if cur == "I" and not all_i:
                # רווחים שבסוף הקבוצה יוצאים מחוץ ל-span
                sp = []
                while out and out[-1].isspace():
                    sp.insert(0, out.pop())
                out.append("</span>")
                out.extend(sp)
            if k == "I" and not all_i:
                out.append('<span class="ii">')
            cur = k
        out.append(html.escape(w, quote=False))
    if cur == "I" and not all_i:
        out.append("</span>")
    h = re.sub(r"\s+", " ", "".join(out)).strip()
    return h, all_i


def plain(s):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", s)).strip()


def nonempty(key, i):
    return bool(plain(re.sub(r"<br\s*/?>", " ", SRC[key]["text"][i])))


# ---------- בניית חלק לפי מפרט ----------
USED = {}          # key -> set(index) מה שהוצג, לדוח ולבדיקה


def render(entries, key):
    out = []
    for e in entries:
        if isinstance(e, int):
            e = (e, e)
        if isinstance(e, tuple) and isinstance(e[0], int):
            for i in range(e[0], e[1] + 1):
                if not nonempty(key, i):
                    continue
                h, all_i = runs_html(SRC[key]["text"][i])
                USED.setdefault(key, set()).add(i)
                cls = ' class="ins"' if all_i else ""
                out.append(f'<p{cls} data-s="{key}:{i}">{h}</p>')
            continue
        kind = e[0]
        if kind == "lab":
            out.append(f'<p class="ins">{html.escape(e[1], quote=False)}</p>')
        elif kind == "note":
            out.append(f'<p class="kr-note">{e[1]}</p>')
        elif kind == "add":
            out.append(f'<div class="kr-add"><p class="kr-add-t">{html.escape(e[1], quote=False)}</p>{"".join(render(e[2], key))}</div>')
        elif kind == "det":
            out.append(f'<details class="bk-det"><summary>{html.escape(e[1], quote=False)}</summary><div>{"".join(render(e[2], key))}</div></details>')
        elif kind == "key":
            out.extend(render(e[2], e[1]))
        else:
            raise ValueError(e)
    return out


def section(sid, title, sub, blocks):
    """blocks: [(nusachim, key, entries)]"""
    o = [f'<section class="bk-sec" id="{sid}">', f"  <h2>{title}</h2>", f'  <p class="bk-sub">{sub}</p>']
    for nus, key, entries in blocks:
        o.append(f'  <div data-n="{nus}">' + "\n    ".join([""] + render(entries, key)) + "\n  </div>")
    o.append("</section>")
    return "\n".join(o)


VER = {"Daat Siddur Ashkenaz": "סידור אשכנז, מהדורת \"דעת\" (נחלת הכלל)",
       "Torat Emet 357": "סידור ספרד, \"תורת אמת\" (נחלת הכלל)",
       "Shaliehsaboo Edition": "סידור עדות המזרח, מהדורת שלייסבו (CC0)",
       "The Metsudah siddur, 1981": "סידור \"מצודה\", 1981 (רישיון CC-BY)",
       "Maginei Eretz: Shulchan Aruch Orach Chaim, Lemberg, 1893": "שולחן ערוך, מהדורת למברג 1893 (נחלת הכלל)",
       "Miqra according to the Masorah": "מקרא על פי המסורה (רישיון CC-BY-SA)"}


def ver(key):
    v = (SRC[key].get("versionTitle") or "").strip()
    return VER.get(v, v)


# ---------- ציטוט ממקור ההלכה, מילה במילה ----------
def quote(key, i, start, end=None):
    """ציטוט מתוך מקור (בלי תגיות), מהמילים start ועד end (כולל). נבדק שהוא באמת שם."""
    whole = plain(disp(re.sub(r"<br\s*/?>", " ", SRC[key]["text"][i])))
    a = whole.find(N(start))
    assert a >= 0, (key, i, start)
    if end is None:
        b = a + len(N(start))
    else:
        b = whole.find(N(end), a)
        assert b >= 0, (key, i, end)
        b += len(N(end))
    q = whole[a:b]
    return f'<q data-q="{key}:{i}">{html.escape(q, quote=False)}</q>'


HN1 = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"]
HN10 = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"]
HN100 = ["", "ק", "ר", "ש", "ת"]


def heb(n):
    s, r = HN100[n // 100], n % 100
    if r == 15:
        return s + "טו"
    if r == 16:
        return s + "טז"
    return s + HN10[r // 10] + HN1[r % 10]


def faq_ld(qa):
    return '<script type="application/ld+json">' + json.dumps({
        "@context": "https://schema.org", "@type": "FAQPage",
        "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": plain(a)}} for q, a in qa]},
        ensure_ascii=False) + "</script>"


def faq_html(qa):
    return ('<section class="k-sec seo-faq" aria-labelledby="seo-faq-h">\n  <h2 id="seo-faq-h">שאלות ותשובות</h2>\n'
            + "\n".join(f"  <details><summary>{q}</summary><p>{a}</p></details>" for q, a in qa) + "\n</section>")


def bar(nus, nav):
    seg = ""
    if nus:
        btns = "".join(f'<button type="button" data-set-n="{k}" aria-pressed="false">{v}</button>' for k, v in nus)
        seg = f'  <div class="bk-seg{" kr-3" if len(nus) == 3 else ""}" role="group" aria-label="נוסח">{btns}</div>\n'
    navh = ""
    if nav:
        navh = '  <nav class="bk-nav" aria-label="קפיצה לחלק">' + "".join(f'<a href="#{a}">{b}</a>' for a, b in nav) + "</nav>\n"
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


HEAD = '<link rel="stylesheet" href="/assets/seo-txt.css"><link rel="stylesheet" href="/assets/boker.css"><link rel="stylesheet" href="/assets/kodesh-kria.css">'
FOOT = '<script src="/assets/kodesh-kria.js" defer></script>'
NUS3 = [("em", "עדות המזרח"), ("sef", "ספרד"), ("ash", "אשכנז")]


def write(rel, text):
    p = PAGES / rel / "index.html"
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(N(text), encoding="utf-8")
    return p


# =====================================================================
# 1. ברכת המזון
# =====================================================================
PRE_LABEL = "לפני ברכת המזון: על נהרות בבל (בחול) ושיר המעלות (בשבת ובחג)"
mazon_secs = [
    section("zimun", "זימון", "כששלושה או יותר אכלו לחם יחד, אחד מזמן והשאר עונים", [
        ("em", "em_mazon", [(4, 14)]),
        ("sef", "sef_mazon", [("lab", "המזמן אומר:"), 8, ("lab", "המסובים עונים:"), 10, ("lab", "המזמן חוזר:"), 12, 13, 14,
                              ("lab", "המסובים עונים:"), 16, ("lab", "המזמן חוזר:"), 18, ("lab", "יש המוסיפים:"), 20,
                              ("det", "זימון בסעודת שבע ברכות", [("lab", "המזמן אומר:"), 23, ("lab", "המסובים עונים:"), 25,
                                                                  ("lab", "המזמן חוזר:"), 27, 29, 30, ("lab", "המסובים עונים:"), 32,
                                                                  ("lab", "המזמן חוזר:"), 34])]),
        ("ash", "ash_mazon", [(4, 19)]),
    ]),
    section("mazon", "ברכת המזון", "ארבע הברכות, והתוספות לשבת, לחג, לראש חודש, לחנוכה ולפורים – כל אחת במקומה", [
        ("em", "em_mazon", [("det", "לפני ברכת המזון: מים אחרונים, למנצח ואברכה", [(1, 3)]),
                            (15, 16), ("add", "בחנוכה ובפורים: על הניסים", [(17, 20)]), (21, 22),
                            ("add", "בשבת: רצה", [(23, 24)]),
                            ("add", "בראש חודש, בחג ובחול המועד: יעלה ויבוא", [(25, 33)]), 34,
                            ("add", "מי ששכח רצה או יעלה ויבוא, ונזכר לפני הברכה הבאה", [(35, 40)]), 41, 42,
                            ("add", "הרחמן לימים מיוחדים", [(43, 54)]), (55, 58)]),
        ("sef", "sef_mazon", [("det", PRE_LABEL, [("lab", "בימי חול:"), 1, ("lab", "בשבת ובחג:"), 3]),
                              (35, 38), ("add", "בחנוכה ובפורים: על הניסים", [40, ("lab", "בחנוכה:"), 42, ("lab", "בפורים:"), 44]),
                              (45, 47), ("add", "בשבת: רצה", [49]),
                              ("add", "בראש חודש, בחג ובחול המועד: יעלה ויבוא",
                               [51, 52, 53, ("note", "בשבועות וביום הכיפורים: השורות האלה חסרות במקור שלנו (סידור ספרד, מהדורת מצודה, בספריא). אפשר לראות אותן בנוסח עדות המזרח או אשכנז."),
                                55, 56, 57, 59]),
                              (60, 78), ("add", "הרחמן לימים מיוחדים", [(79, 88)]), (89, 90)]),
        ("ash", "ash_mazon", [("det", PRE_LABEL, [(0, 3)]),
                              (20, 23), ("add", "בחנוכה ובפורים: על הניסים", [(24, 29)]), (30, 32),
                              ("add", "בשבת: רצה", [(33, 34)]),
                              ("add", "בראש חודש, בחג ובחול המועד: יעלה ויבוא", [(35, 44)]),
                              (45, 63), ("add", "הרחמן לימים מיוחדים", [(64, 73)]), (74, 75)]),
    ]),
    section("shichcha", "מי ששכח רצה או יעלה ויבוא", "הנוסח שאומרים אחרי בונה ירושלים, אם נזכרו רק אחריה", [
        ("em", "em_mazon", [("note", "בנוסח עדות המזרח הנוסח הזה מופיע בתוך ברכת המזון, במסגרת \"מי ששכח\", מיד אחרי בונה ירושלים.")]),
        ("sef", "sef_mazon", [("lab", "בשבת:"), 93, ("lab", "בראש חודש:"), 95, ("lab", "ביום טוב:"), 99,
                              ("lab", "ביום טוב שחל בשבת:"), 101, ("lab", "בראש השנה:"), 103, ("lab", "בראש השנה שחל בשבת:"), 105,
                              ("note", "ראש חודש שחל בשבת: חסר במקור שלנו בנוסח ספרד. אפשר לראות בנוסח אשכנז.")]),
        ("ash", "ash_mazon", [(76, 88)]),
    ]),
    section("meein", "ברכה מעין שלוש – על המחיה", "אחרי מזונות (עוגה, פתיתים, קרקר), יין או פירות משבעת המינים", [
        ("em", "em_meein", [(1, 20)]),
        ("sef", "sef_meein", [(2, 16)]),
        ("ash", "ash_meein", [(0, 11)]),
    ]),
    section("nefashot", "בורא נפשות", "אחרי פירות העץ (שאינם משבעת המינים), ירקות, משקים, בשר, ביצים וכל השאר", [
        ("em", "em_nehenin", [(11, 12)]),
        ("sef", "sef_nefashot", [(1, 2)]),
        ("ash", "ash_nefashot", [(0, 4)]),
    ]),
]

MAZON_FAQ = [
    ("מתי צריך לברך ברכת המזון?",
     "אחרי שאוכלים לחם. בקיצור שולחן ערוך כתוב: " + quote("kitzur_44", 4, "אֲפִלּוּ לֹא אָכַל רַק כַּזַּיִת פַּת", "בִּרְכַּת הַמָּזוֹן") +
     ' <cite>(קיצור שולחן ערוך מד, ה)</cite>. אחרי מזונות, יין או פירות משבעת המינים אומרים ברכה מעין שלוש, ואחרי שאר המאכלים בורא נפשות. שתיהן בדף.'),
    ("עד מתי אפשר לברך אחרי האוכל?",
     quote("sa_184", 4, "עד אימתי יכול לברך", "כל זמן שאינו רעב מחמת אותה אכילה") +
     ' <cite>(שולחן ערוך, אורח חיים קפד, ה)</cite>. ובקיצור שולחן ערוך: ' + quote("kitzur_44", 7, "יֵשׁ אוֹמְרִים, דְּשִׁעוּר עִכּוּל הוּא שָׁעָה וְחֹמֶשׁ") +
     ' <cite>(מד, ח)</cite>.'),
    ("כמה אנשים צריך בשביל זימון?",
     quote("kitzur_45", 0, "שְׁלשָׁה שֶׁאָכְלוּ בְּיַחַד צְרִיכִין לְבָרֵךְ בְּזִמּוּן") + ' <cite>(קיצור שולחן ערוך מה, א)</cite>. ' +
     quote("kitzur_45", 11, "אִם הֵם עֲשָׂרָה, נִתְחַיְבוּ לְבָרֵךְ בְּשֵׁם") +
     ' <cite>(מה, יב)</cite>, כלומר מוסיפים "אלוקינו". נוסח הזימון נמצא בתחילת הדף.'),
    ("שכחתי לומר רצה בשבת. מה עושים?",
     "בקיצור שולחן ערוך: " + quote("kitzur_44", 11, "אִם נִזְכַּר קֹדֶם שֶׁהִזְכִּיר אֶת הַשֵּׁם", "אוֹמֵר שָׁם רְצֵה אוֹ יַעֲלֶה וְיָבֹא") +
     ' <cite>(מד, יב)</cite>. ואם נזכרו רק אחר כך, בדף יש חלק "מי ששכח" עם הנוסח שאומרים. בכל ספק למעשה, שואלים רב.'),
    ("שכחתי על הניסים בחנוכה או בפורים?",
     "בקיצור שולחן ערוך: " + quote("kitzur_44", 15, "אַךְ בְּתוֹךְ הָרַחֲמָן יֹאמַר", "בַּזְּמַן הַזֶּה") +
     ' <cite>(מד, טז)</cite>.'),
    ("מה ההבדל בין נוסח עדות המזרח, ספרד ואשכנז?",
     "בעיקר בניסוח של כמה משפטים, בזימון ובסדר של \"הרחמן\". כל אחד ממשיך במנהג אבותיו: בוחרים נוסח פעם אחת למעלה, והדף זוכר אותו בטלפון."),
]

DEUT = disp(re.sub(r"<[^>]+>", "", pre_mam(SRC["deut_8_10"]["text"]))).strip()

mazon_meta = {
    "site": "kodesh", "nav": "rabanim", "tool": "birkat_hamazon",
    "title": "ברכת המזון – נוסח עדות המזרח, ספרד ואשכנז, בניקוד מלא | כלי קודש",
    "description": "ברכת המזון המלאה בניקוד, בנוסח עדות המזרח, ספרד או אשכנז: זימון, רצה, יעלה ויבוא, על הניסים והרחמן – כל תוספת במקומה. וגם ברכה מעין שלוש ובורא נפשות. אות גדולה, מצב לילה, בלי פרסומות.",
    "og_title": "ברכת המזון בטלפון, בנוסח שלכם",
    "priority": "0.8",
    "crumbs": [["ברכת המזון", None]],
    "head": HEAD + faq_ld(MAZON_FAQ),
    "foot": FOOT,
}
mazon_srcs = "; ".join(sorted({f"{ver(k)}" for k in USED if k.endswith(("mazon", "meein", "nefashot", "nehenin"))}))
mazon_page = meta(mazon_meta) + f"""<header class="k-hero">
  <h1>ברכת המזון</h1>
  <p class="sub">כל ברכת המזון בניקוד מלא, מול העיניים בטלפון: זימון, ארבע הברכות, והתוספות לשבת, לחג, לראש חודש, לחנוכה ולפורים במקומן. וגם מעין שלוש ובורא נפשות.</p>
</header>
{bar(NUS3, [("zimun", "זימון"), ("mazon", "ברכת המזון"), ("shichcha", "מי ששכח"), ("meein", "מעין שלוש"), ("nefashot", "בורא נפשות")])}
<div class="tool">
<div class="bk-paper" id="kr-paper" data-tool="birkat_hamazon" data-key="nusach" data-nusach="em">
  <span class="bsd">בס"ד</span>
  <p class="kr-nus-now">נוסח: <b id="kr-nlabel">עדות המזרח</b></p>
{chr(10).join(mazon_secs)}
  <p class="bk-foot">המילים והניקוד מתוך ספריא, מילה במילה: עדות המזרח – {ver("em_mazon")}; ספרד – ברכת המזון מ{ver("sef_mazon")}, מעין שלוש ובורא נפשות מ{ver("sef_meein")}; אשכנז – ברכת המזון מ{ver("ash_mazon")}, מעין שלוש ובורא נפשות מ{ver("ash_meein")}. טעמי המקרא הורדו, והשמות הקדושים כתובים בכינוי (ה', אלוקינו) ואומרים אותם כרגיל. בדיקה בקוד מוודאת שהטקסט זהה למקור. מי שנוהג אחרת, הולך לפי המנהג שלו; ובכל שאלה, שואלים רב.</p>
</div>
</div>
<div class="tool bk-install">
  <p><b>רוצים ברכון מודפס עם הקדשה?</b> לבר מצווה, לחתונה, לברית או לכל שמחה: <a class="gold" href="/kodesh/brachon/">ברכונים להדפסה עם הקדשה</a>.</p>
  <p>בתפריט הדפדפן: "הוספה למסך הבית", והדף נפתח כמו אפליקציה, גם בלי אינטרנט.</p>
  <div class="share-row"><a class="btn btn-gold btn-sm" href="#" data-share-tool="wa" data-text="ברכת המזון בניקוד מלא, בנוסח עדות המזרח, ספרד או אשכנז:" target="_blank" rel="noopener"><svg class="ic"><use href="#wa"/></svg> לשלוח לחבר בווטסאפ</a></div>
</div>
<!--seo-txt-->
<section class="k-sec seo-txt" aria-labelledby="seo-h">
  <h2 id="seo-h">ברכת המזון לקריאה בטלפון, בנוסח שלכם</h2>
  <p>ברכת המזון היא הברכה שאומרים אחרי סעודה עם לחם. המקור בתורה: <q data-q="deut_8_10:0">{html.escape(DEUT, quote=False)}</q> <cite>(דברים ח, י)</cite>. כאן היא כתובה במלואה, בניקוד מלא ובאות גדולה, בלי פרסומות באמצע ובלי לחפש עמודים בסידור.</p>
  <h3>ברכת המזון נוסח עדות המזרח, ספרד ואשכנז</h3>
  <p>בוחרים נוסח פעם אחת בכפתורים שלמעלה, והדף זוכר אותו בטלפון. נוסח עדות המזרח (ספרדי) לקוח מסידור עדות המזרח, נוסח ספרד (חסידי) מסידור "מצודה", ונוסח אשכנז מסידור "מצודה" ומסידור "דעת". ההבדלים קטנים: ניסוח של כמה משפטים, הזימון, והסדר של "הרחמן". כל אחד ממשיך במנהג אבותיו.</p>
  <h3>רצה, יעלה ויבוא ועל הניסים – במקום הנכון</h3>
  <p>כל תוספת מופיעה בדיוק במקום שבו אומרים אותה, בתוך מסגרת עם כותרת ברורה: רצה בשבת, יעלה ויבוא בראש חודש, בחגים ובחול המועד, על הניסים בחנוכה ובפורים, והרחמן המיוחד לכל יום. ככה לא מדלגים ולא מוסיפים בטעות. מי ששכח ונזכר מאוחר, ימצא את הנוסח בחלק "מי ששכח רצה או יעלה ויבוא".</p>
  <h3>זימון בשלושה ובעשרה</h3>
  <p>כשאוכלים יחד שלושה או יותר, אחד מזמן והשאר עונים. נוסח הזימון בראש הדף, עם מה שמוסיפים כשיש עשרה. בנוסח ספרד יש גם זימון לסעודת שבע ברכות.</p>
  <h3>ברכה מעין שלוש (על המחיה) ובורא נפשות</h3>
  <p>אחרי עוגה, קרקר או פתיתים, אחרי יין, ואחרי ענבים, תאנים, רימונים, זיתים או תמרים, אומרים ברכה מעין שלוש: על המחיה, על הגפן או על העץ, לפי מה שאכלו. אחרי שאר המאכלים והמשקים אומרים בורא נפשות. שתי הברכות נמצאות בסוף הדף, באותו נוסח שבחרתם.</p>
  <h3>אות גדולה, מצב לילה, ובלי אינטרנט</h3>
  <p>כפתורי א+ ו-א- מגדילים את האותיות, ויש רקע כהה לחדר חשוך. המסך לא נכבה באמצע הברכה. אחרי הכניסה הראשונה הדף נשמר בטלפון ועובד גם בלי קליטה: בטיול, בבסיס או בסוכה. ומי שרוצה ברכון מודפס ומעוצב לשמחה, עם עמוד הקדשה, ימצא אותו ב<a class="gold" href="/kodesh/brachon/">ברכונים להדפסה</a>. עוד בכלי קודש: <a class="gold" href="/kodesh/tefilat-haderech/">תפילת הדרך</a>, <a class="gold" href="/kodesh/boker/">ברכות השחר</a> ו<a class="gold" href="/kodesh/tehillim/sefer/">ספר תהילים המלא</a>.</p>
</section>
{faq_html(MAZON_FAQ)}
<!--/seo-txt-->
"""

# =====================================================================
# 2. תפילת הדרך
# =====================================================================
haderech_secs = [
    section("derech", "תפילת הדרך", "אומרים אחרי שיוצאים מהעיר, פעם אחת ביום", [
        ("em", "em_haderech", [(1, 8)]),
        ("sef", "sef_haderech", [(1, 21),
                                 ("key", "sef_haderech_air", [("add", "בטיסה: מוסיפים באווירון", [(1, 3)])]),
                                 ("det", "עוד תפילות לדרך: בכניסה לעיר וביציאה ממנה, ולמי שיוצא לים", [(22, 32)])]),
        ("ash", "ash_haderech", [(0, 5)]),
    ]),
    section("gomel", "ברכת הגומל", "מי שחזר בשלום מדרך מסוכנת, החלים ממחלה או ניצל מסכנה – מברך בפני עשרה", [
        ("em", "em_gomel", [(1, 10)]),
        ("sef ash", "sef_gomel", [(0, 2), ("note", "בסידור אשכנז שבספריא אין את ברכת הגומל כקטע נפרד, ולכן בנוסח אשכנז מוצג כאן הנוסח מסידור ספרד.")]),
    ]),
]

DERECH_FAQ = [
    ("מתי אומרים תפילת הדרך?",
     "בקיצור שולחן ערוך: " + quote("kitzur_68", 0, "לְאַחַר שֶׁיָּצָא מֵעִבּוּרָהּ שֶׁל הָעִיר", "מִתְפַּלֵּל תְּפִלַּת הַדֶּרֶךְ") +
     ' <cite>(קיצור שולחן ערוך סח, א)</cite>.'),
    ("מאיזה מרחק אומרים תפילת הדרך?",
     quote("kitzur_68", 1, "אֵין לְהִתְפַּלֵּל אוֹתָהּ אֶלָּא אִם כֵּן יֵשׁ לוֹ לָלֶכֶת לְכָל הַפָּחוֹת פַּרְסָה") +
     ' <cite>(קיצור שולחן ערוך סח, ב)</cite>. ובסידור עדות המזרח: ' + quote("em_haderech", 1, "לפחות מהלך שיעור פרסה", "אומר תפלת הדרך") +
     '. ומי ששכח: ' + quote("kitzur_68", 1, "וְאִם שָׁכַח, יָכוֹל לְהִתְפַּלֵּל כָּל זְמַן שֶׁהוּא בַדֶּרֶךְ") + ' <cite>(שם)</cite>.'),
    ("אומרים תפילת הדרך כל פעם שיוצאים, או פעם אחת ביום?",
     quote("kitzur_68", 4, "אֵין אוֹמְרִים אוֹתָהּ אֶלָּא פַּעַם אַחַת בְּכָל יוֹם שֶׁהוּא הוֹלֵךְ") +
     ' <cite>(קיצור שולחן ערוך סח, ה)</cite>. שם גם מפורט מתי אומרים אותה פעם שנייה.'),
    ("אפשר לומר תפילת הדרך בנסיעה?",
     quote("kitzur_68", 3, "יֵשׁ לְאָמְרָהּ בַּעֲמִידָה", "וְאִם לָאו, יֹאמְרָהּ כָּךְ") +
     ' <cite>(קיצור שולחן ערוך סח, ד)</cite>. בכל שאלה למעשה, שואלים רב.'),
    ("יש תפילה מיוחדת לטיסה?",
     'בסידור ספרד ("תורת אמת") יש תפילה ש' + quote("sef_haderech_air", 1, "באוירון מוסיפים") +
     '. היא מופיעה בדף בנוסח ספרד, מיד אחרי תפילת הדרך.'),
    ("מי מברך ברכת הגומל?",
     quote("sa_219", 0, "ארבעה צריכים להודות", "ומי שהיה חבוש בבית האסורים ויצא") +
     ' <cite>(שולחן ערוך, אורח חיים ריט, א)</cite>. נוסח הברכה ותשובת הקהל נמצאים בדף.'),
]

derech_meta = {
    "site": "kodesh", "nav": "rabanim", "tool": "tefilat_haderech",
    "title": "תפילת הדרך – הנוסח המלא בניקוד, בכתב גדול וברור | כלי קודש",
    "description": "תפילת הדרך בניקוד מלא ובכתב גדול, בנוסח עדות המזרח, ספרד או אשכנז, ומתי אומרים אותה – מתוך קיצור שולחן ערוך. וגם ברכת הגומל ותפילה לטיסה. נפתח גם בלי אינטרנט, בלי פרסומות.",
    "og_title": "תפילת הדרך, בכתב גדול בטלפון",
    "priority": "0.8",
    "crumbs": [["תפילת הדרך", None]],
    "head": HEAD + faq_ld(DERECH_FAQ),
    "foot": FOOT,
}
derech_page = meta(derech_meta) + f"""<header class="k-hero">
  <h1>תפילת הדרך</h1>
  <p class="sub">הנוסח המלא בניקוד ובכתב גדול, מוכן בטלפון לפני שיוצאים לדרך. ובהמשך: ברכת הגומל, ומה כתוב במקורות על מתי אומרים.</p>
</header>
{bar(NUS3, [("derech", "תפילת הדרך"), ("gomel", "ברכת הגומל"), ("seo-faq-h", "מתי אומרים")])}
<div class="tool">
<div class="bk-paper" id="kr-paper" data-tool="tefilat_haderech" data-key="nusach" data-nusach="em">
  <span class="bsd">בס"ד</span>
  <p class="kr-nus-now">נוסח: <b id="kr-nlabel">עדות המזרח</b></p>
{chr(10).join(haderech_secs)}
  <p class="bk-foot">המילים והניקוד מתוך ספריא, מילה במילה: עדות המזרח – {ver("em_haderech")}; ספרד – {ver("sef_haderech")}; אשכנז – {ver("ash_haderech")}. טעמי המקרא הורדו, והשמות הקדושים כתובים בכינוי (ה', אלוקינו) ואומרים אותם כרגיל. בדיקה בקוד מוודאת שהטקסט זהה למקור. מי שנוהג אחרת, הולך לפי המנהג שלו; ובכל שאלה, שואלים רב.</p>
</div>
</div>
<div class="tool bk-install">
  <p><b>לחיילים ולמי שנוסע הרבה:</b> <a class="gold" href="/kodesh/chayal/">דף לחייל בגודל כיס</a>, עם תפילת הדרך, ברכת הגומל וקריאת שמע על המיטה, להדפסה או כתמונה לווטסאפ.</p>
  <p>בתפריט הדפדפן: "הוספה למסך הבית", והדף נפתח כמו אפליקציה, גם בלי קליטה בדרך.</p>
  <div class="share-row"><a class="btn btn-gold btn-sm" href="#" data-share-tool="wa" data-text="תפילת הדרך בניקוד מלא ובכתב גדול, לפני שיוצאים לדרך:" target="_blank" rel="noopener"><svg class="ic"><use href="#wa"/></svg> לשלוח למי שיוצא לדרך</a></div>
</div>
<!--seo-txt-->
<section class="k-sec seo-txt" aria-labelledby="seo-h">
  <h2 id="seo-h">תפילת הדרך בכתב גדול וברור, תמיד בכיס</h2>
  <p>תפילת הדרך היא בקשה קצרה שאומרים כשיוצאים לדרך: שנגיע לשלום, שנינצל מכל רע בדרך, ושנחזור לשלום. כאן היא כתובה במלואה, בניקוד מלא ובאות גדולה, כך שאפשר לקרוא אותה בעשר שניות לפני שיוצאים מהעיר, גם בלי סידור ביד.</p>
  <h3>תפילת הדרך נוסח עדות המזרח, ספרד ואשכנז</h3>
  <p>בוחרים נוסח פעם אחת למעלה, והדף זוכר אותו. בנוסח עדות המזרח מופיעים גם הפסוקים שיש נוהגים להוסיף לשמירה. בנוסח ספרד מופיעים הפסוקים שאומרים כמה פעמים, תפילה מיוחדת לטיסה באווירון, ותפילות קצרות לכניסה לעיר וליציאה ממנה. בנוסח אשכנז הנוסח הקצר, עם הפסוקים ויעקב הלך לדרכו וברכת כהנים.</p>
  <h3>מתי אומרים, ומאיזה מרחק</h3>
  <p>בשאלות ותשובות שלמטה מובאים דברי קיצור שולחן ערוך (סימן סח) ושולחן ערוך (סימן קי) כפי שהם כתובים, עם מראה מקום: מתי אומרים אחרי שיוצאים מהעיר, מאיזה מרחק, מה עושה מי ששכח, ואם אומרים כל יום מחדש. אנחנו לא פוסקים הלכה: מביאים את לשון המקור, ובכל שאלה למעשה שואלים רב.</p>
  <h3>ברכת הגומל</h3>
  <p>מי שחזר בשלום מטיסה לחו"ל או מדרך מסוכנת, החלים ממחלה או ניצל מסכנה, מברך ברכת הגומל בפני עשרה, ובדרך כלל אחרי קריאת התורה. הנוסח ותשובת הקהל נמצאים בדף, מתחת לתפילת הדרך.</p>
  <h3>עובד גם בלי קליטה</h3>
  <p>אחרי הכניסה הראשונה הדף נשמר בטלפון, ונפתח גם בכביש בלי קליטה, בשטח או בטיסה. יש אות גדולה, מצב לילה ומסך שלא נכבה. לחיילים יש <a class="gold" href="/kodesh/chayal/">דף בגודל כיס להדפסה</a>, ולמי שרוצה את כל ברכות הבוקר: <a class="gold" href="/kodesh/boker/">ברכות השחר ותפילין</a>. עוד בכלי קודש: <a class="gold" href="/kodesh/birkat-hamazon/">ברכת המזון</a> ו<a class="gold" href="/kodesh/tehillim/sefer/">ספר תהילים המלא</a>.</p>
</section>
{faq_html(DERECH_FAQ)}
<!--/seo-txt-->
"""

# =====================================================================
# 3. תהילים
# =====================================================================
YOM = [[1, 9], [10, 17], [18, 22], [23, 28], [29, 34], [35, 38], [39, 43], [44, 48], [49, 54], [55, 59], [60, 65], [66, 68], [69, 71], [72, 76], [77, 78],
       [79, 82], [83, 87], [88, 89], [90, 96], [97, 103], [104, 105], [106, 107], [108, 112], [113, 118], ["119a"], ["119b"], [120, 134], [135, 139], [140, 144], [145, 150]]
WEEK = [("יום ראשון", 1, 29), ("יום שני", 30, 50), ("יום שלישי", 51, 72), ("יום רביעי", 73, 89), ("יום חמישי", 90, 106), ("יום שישי", 107, 119), ("שבת", 120, 150)]
SEFER = [(1, 41), (42, 72), (73, 89), (90, 106), (107, 150)]
SNAME = ["ראשון", "שני", "שלישי", "רביעי", "חמישי"]
HUB = "/kodesh/tehillim/sefer/"


def purl(n):
    return f"{HUB}{n}/"


def yom_of(n):
    out = []
    for i, y in enumerate(YOM, start=1):
        if y[0] == "119a" and n == 119:
            out.append((i, "פרק קיט, פסוקים א–צו"))
        elif y[0] == "119b" and n == 119:
            out.append((i, "פרק קיט, פסוקים צז–קעו"))
        elif isinstance(y[0], int) and y[0] <= n <= y[1]:
            out.append((i, None))
    return out


def week_of(n):
    return next(w for w in WEEK if w[1] <= n <= w[2])


def book_of(n):
    return next(i for i, (a, b) in enumerate(SEFER) if a <= n <= b)


def verses(n):
    vs = TEH["chapters"][str(n)]
    out = []
    for i, v in enumerate(vs, start=1):
        h, _ = runs_html(v, mam=True)
        out.append((i, h))
    return out


def chapter_html(n):
    vs = verses(n)
    USED.setdefault("ps", set()).add(n)
    body = " ".join(f'<span class="vn" aria-hidden="true">{heb(i)}</span>{h}' for i, h in vs)
    return f'<p class="kr-ps" data-s="ps:{n}">{body}</p>', len(vs)


def plain_start(n, words=7):
    t = plain(re.sub(r'<span class="vn"[^>]*>[^<]*</span>', "", chapter_html(n)[0]))
    t = re.sub(f"[{NIK}ֽ]", "", t)
    t = re.sub(r"<[^>]+>", "", t)
    w = re.sub(r"[^\sא-ת'\-]", "", t).split()
    return " ".join(w[:words])


def range_txt(a, b):
    return f"פרק {heb(a)}" if a == b else f"פרקים {heb(a)}–{heb(b)}"


# --- דף הפרק
TEH_SRC_LINE = f"הטקסט מתוך ספריא: {VER['Miqra according to the Masorah']}. טעמי המקרא הורדו, הכתיב והקרי כתובים כמו שקוראים, והשמות הקדושים כתובים בכינוי (ה', אלוקים) ואומרים אותם כרגיל. בדיקה בקוד מוודאת שהטקסט זהה למקור."
for n in range(1, 151):
    ch, nv = chapter_html(n)
    h = heb(n)
    start = plain_start(n)
    yom = yom_of(n)
    yom_t = " וגם ".join(f"ביום {heb(d)} בחודש" + (f" ({x})" if x else "") for d, x in yom)
    wk = week_of(n)
    b = book_of(n)
    prev_a = f'<a href="{purl(n - 1)}" rel="prev">→ פרק {heb(n - 1)}</a>' if n > 1 else f'<a href="{HUB}">→ כל הפרקים</a>'
    next_a = f'<a href="{purl(n + 1)}" rel="next">פרק {heb(n + 1)} ←</a>' if n < 150 else f'<a href="{HUB}">כל הפרקים ←</a>'
    theme, use = PEREK_T[n]
    wk_t = 'ב' + wk[0] if wk[0] != 'שבת' else 'בשבת'
    cyc = f"במחזור החודשי הוא נקרא {yom_t}, ובמחזור השבועי {wk_t} ({range_txt(wk[1], wk[2])})."
    qa = [
        (f"על מה מדבר תהילים פרק {h}?", theme),
        (f"מתי אומרים תהילים פרק {h}?", (use + " " if use else "") + cyc),
        (f"כמה פסוקים יש בתהילים פרק {h}?", f"בפרק {h} יש {nv} פסוקים. הוא נפתח במילים \"{start}\", והוא בספר {SNAME[b]} מתוך חמשת הספרים של תהילים ({range_txt(*SEFER[b])})."),
    ]
    m = {
        "site": "kodesh", "nav": "rabanim", "tool": "tehillim_perek",
        "title": f"תהילים פרק {h} – הטקסט המלא בניקוד | כלי קודש",
        "description": f"תהילים פרק {h} ({start}...) בניקוד מלא ובאות גדולה, {nv} פסוקים. נקרא {yom_t} ו{'ב' + wk[0] if wk[0] != 'שבת' else 'בשבת'}. עם מעבר לפרק הקודם והבא, בלי פרסומות.",
        "og_title": f"תהילים פרק {h}",
        "og_image": "og/kodesh-tehillim-sefer.jpg?v=4",
        "priority": "0.5",
        "no_rel": True,
        "no_precache": True,
        "crumbs": [["תהילים", HUB], [f"פרק {h}", None]],
        "head": HEAD + faq_ld(qa),
        "foot": FOOT,
    }
    page = meta(m) + f"""<header class="k-hero">
  <h1>תהילים פרק {h}</h1>
  <p class="sub">{start}... · {nv} פסוקים · ספר {SNAME[b]} של תהילים</p>
</header>
{bar(None, None)}
<div class="tool">
<div class="bk-paper ps" id="kr-paper" data-tool="tehillim_perek" data-key="tehillim">
  <span class="bsd">בס"ד</span>
  <section class="bk-sec" id="perek">
  <h2>פרק {h}</h2>
  <p class="kr-meta">נקרא {yom_t}, ו{'ב' + wk[0] if wk[0] != 'שבת' else 'בשבת'} ({range_txt(wk[1], wk[2])})</p>
  {ch}
  </section>
  <p class="bk-foot">{TEH_SRC_LINE}</p>
</div>
<nav class="kr-pn" aria-label="פרקים">{prev_a}{next_a}</nav>
</div>
<!--seo-txt-->
<section class="k-sec seo-txt" aria-labelledby="seo-h">
  <h2 id="seo-h">על תהילים פרק {h}</h2>
  <p>{theme}</p>
  <p>{use + ' ' if use else ''}{cyc} הפרק בספר {SNAME[b]} של תהילים ({range_txt(*SEFER[b])}), נפתח במילים "{start}", ויש בו {nv} פסוקים.</p>
  <p>לכל הפרקים, ולחלוקה לפי ימי החודש וימי השבוע: <a class="gold" href="{HUB}">ספר תהילים המלא</a>. רוצים לגמור את הספר יחד עם עוד אנשים, לעילוי נשמה או לרפואה? <a class="gold" href="/kodesh/tehillim/">סיום תהילים בקישור</a>. ולפי אותיות השם: <a class="gold" href="/kodesh/tehillim/shem/">תהילים לפי שם</a>.</p>
</section>
{faq_html(qa)}
<!--/seo-txt-->
"""
    write(f"tehillim/sefer/{n}", page)

# --- דף הספר
grid = "".join(f'<a href="{purl(n)}" aria-label="פרק {heb(n)}">{heb(n)}</a>' for n in range(1, 151))
yom_rows = []
for i, y in enumerate(YOM, start=1):
    if y[0] == "119a":
        t, href = "פרק קיט, פסוקים א–צו", purl(119)
    elif y[0] == "119b":
        t, href = "פרק קיט, פסוקים צז–קעו", purl(119)
    else:
        t, href = range_txt(y[0], y[1]), purl(y[0])
    yom_rows.append(f'<tr data-yom="{i}" data-href="{href}" data-label="יום {heb(i)} בחודש: {t}"><th>יום {heb(i)}</th><td><a href="{href}">{t}</a></td></tr>')
week_rows = "".join(f'<tr data-week="{i}" data-href="{purl(a)}" data-label="{d}: {range_txt(a, b)}"><th>{d}</th><td><a href="{purl(a)}">{range_txt(a, b)}</a></td></tr>'
                    for i, (d, a, b) in enumerate(WEEK, start=1))
book_rows = "".join(f'<tr><th>ספר {SNAME[i]}</th><td><a href="{purl(a)}">{range_txt(a, b)}</a></td></tr>' for i, (a, b) in enumerate(SEFER))

HUB_FAQ = [
    ("כמה פרקים יש בספר תהילים?",
     "150 פרקים, בחמישה ספרים: " + ", ".join(f"ספר {SNAME[i]} {range_txt(a, b)}" for i, (a, b) in enumerate(SEFER)) + ". לכל פרק יש בדף קישור משלו."),
    ("איך מחולק תהילים לימי החודש?",
     "לשלושים ימים, לפי הטבלה בדף. פרק קיט, הארוך בספר, מחולק לשני ימים: ביום כה בחודש פסוקים א–צו, וביום כו פסוקים צז–קעו. בראש הדף כתוב מה קוראים היום לפי התאריך העברי."),
    ("איך מחולק תהילים לימי השבוע?",
     "; ".join(f"{d}: {range_txt(a, b)}" for d, a, b in WEEK) + "."),
    ("מאיפה הטקסט, והוא מדויק?",
     "הטקסט מתוך ספריא, במהדורת \"מקרא על פי המסורה\", עם ניקוד מלא. טעמי המקרא הורדו כדי שיהיה קל לקרוא, והשמות הקדושים כתובים בכינוי (ה', אלוקים). בדיקה בקוד מוודאת שכל מילה זהה למקור."),
    ("אפשר לחלק את ספר תהילים בין כמה אנשים?",
     'כן. ב<a class="gold" href="/kodesh/tehillim/">סיום תהילים בקישור</a> שולחים קישור אחד, וכל אחד לוקח פרקים עד שהספר נגמר – לעילוי נשמה, לרפואה או להצלחה.'),
    ("מה זה תהילים לפי שם?",
     'קוראים את הפסוקים של פרק קיט לפי אותיות השם של מי שמתפללים עליו, ולעילוי נשמה גם את אותיות המילה נשמה. הכלי מוכן כאן: <a class="gold" href="/kodesh/tehillim/shem/">תהילים לפי שם</a>.'),
]
hub_meta = {
    "site": "kodesh", "nav": "rabanim", "tool": "tehillim_sefer",
    "title": "תהילים – ספר תהילים המלא בניקוד: 150 פרקים, יום בחודש ויום בשבוע | כלי קודש",
    "description": "תהילים המלא בניקוד ובאות גדולה: כל 150 הפרקים, כל פרק בדף משלו, והחלוקה לפי ימי החודש וימי השבוע – עם מה קוראים היום. בלי פרסומות, עובד גם בלי אינטרנט.",
    "og_title": "ספר תהילים המלא, בניקוד ובאות גדולה",
    "priority": "0.8",
    "crumbs": [["תהילים", None]],
    "head": HEAD + faq_ld(HUB_FAQ),
    "foot": FOOT,
}
hub_page = meta(hub_meta) + f"""<header class="k-hero">
  <h1>תהילים</h1>
  <p class="sub">ספר תהילים המלא, בניקוד ובאות גדולה: כל 150 הפרקים, והחלוקה לימי החודש ולימי השבוע.</p>
</header>
<div class="tool">
<div class="bk-paper" id="kr-paper" data-tool="tehillim_sefer" data-key="tehillim" style="background:transparent;box-shadow:none;color:inherit;padding:0">
  <p class="kr-today" id="kr-today" hidden></p>
  <section class="bk-sec" id="prakim" style="border:0">
  <h2 style="color:var(--cream)">כל פרקי תהילים</h2>
  <nav class="kr-grid" aria-label="פרקי תהילים">{grid}</nav>
  </section>
</div>
</div>
<div class="tool">
  <h2>תהילים לפי ימי החודש</h2>
  <table class="kr-tbl"><tbody>{"".join(yom_rows)}</tbody></table>
</div>
<div class="tool">
  <h2>תהילים לפי ימי השבוע</h2>
  <table class="kr-tbl"><tbody>{week_rows}</tbody></table>
</div>
<div class="tool">
  <h2>חמשת ספרי תהילים</h2>
  <table class="kr-tbl"><tbody>{book_rows}</tbody></table>
  <div class="share-row" style="margin-top:.8rem"><a class="btn btn-gold btn-sm" href="/kodesh/tehillim/">לחלק את הספר בין כולם</a> <a class="btn btn-line btn-sm" href="/kodesh/tehillim/shem/">תהילים לפי שם</a></div>
</div>
<!--seo-txt-->
<section class="k-sec seo-txt" aria-labelledby="seo-h">
  <h2 id="seo-h">ספר תהילים המלא לקריאה בטלפון</h2>
  <p>ספר תהילים הוא ספר של שירה ותפילה, 150 מזמורים שאנשים אומרים בכל מצב: בשמחה ובצרה, לרפואה, להצלחה, לעילוי נשמה, או סתם כי הלב רוצה לדבר. כאן הוא כתוב במלואו, בניקוד מלא ובאות גדולה, בלי פרסומות. לכל פרק יש דף משלו, עם כפתור לפרק הבא, כך שאפשר לקרוא ברצף בלי לחפש.</p>
  <h3>תהילים לפי ימי החודש</h3>
  <p>רבים נוהגים לגמור את כל הספר פעם בחודש: בכל יום בחודש העברי קוראים את החלק של אותו יום, לפי הטבלה. פרק קיט, הארוך בספר, מחולק לשני ימים. בראש הדף מסומן מה קוראים היום, לפי התאריך העברי.</p>
  <h3>תהילים לפי ימי השבוע</h3>
  <p>יש שגומרים את הספר כל שבוע: מיום ראשון ועד שבת, לפי החלוקה שבטבלה. גם כאן היום של השבוע מסומן, והקישור מוביל ישר לפרק הראשון של אותו יום.</p>
  <h3>פרקי תהילים לרפואה ולהצלחה</h3>
  <p>מי שרוצה לגמור את כל הספר יחד עם משפחה, חברים או קהילה – לרפואה, לעילוי נשמה או לכל בקשה – יכול לפתוח <a class="gold" href="/kodesh/tehillim/">סיום תהילים בקישור</a>: שולחים קישור אחד, כל אחד לוקח פרקים, והספר נגמר מהר. ומי שרוצה לקרוא לפי אותיות השם של מי שמתפללים עליו, ימצא את זה ב<a class="gold" href="/kodesh/tehillim/shem/">תהילים לפי שם</a>.</p>
  <h3>אות גדולה, מצב לילה, בלי אינטרנט</h3>
  <p>בכל פרק יש כפתורי א+ ו-א-, רקע כהה ומסך שלא נכבה. הטקסט מתוך ספריא, במהדורת "מקרא על פי המסורה", ובדיקה בקוד מוודאת שכל מילה זהה למקור. עוד בכלי קודש: <a class="gold" href="/kodesh/birkat-hamazon/">ברכת המזון</a>, <a class="gold" href="/kodesh/tefilat-haderech/">תפילת הדרך</a> ו<a class="gold" href="/kodesh/boker/">ברכות השחר</a>.</p>
</section>
{faq_html(HUB_FAQ)}
<!--/seo-txt-->
"""

write("birkat-hamazon", mazon_page)
write("tefilat-haderech", derech_page)
write("tehillim/sefer", hub_page)

# דוח: מה במקור לא הוצג (כדי שלא יחסר משהו בלי שנדע)
rep = {}
for k in USED:
    if k == "ps":
        continue
    miss = [i for i in range(len(SRC[k]["text"])) if nonempty(k, i) and i not in USED[k]]
    rep[k] = {"shown": len(USED[k]), "not_shown": [(i, plain(SRC[k]["text"][i])[:60]) for i in miss]}
(ROOT / "tools" / "data" / "dapei-kria-report.json").write_text(json.dumps(rep, ensure_ascii=False, indent=1), encoding="utf-8")
print("ok: 3 pages + 150 chapters; segments shown:", {k: len(v) for k, v in USED.items()})
