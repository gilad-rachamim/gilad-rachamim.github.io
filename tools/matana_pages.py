"""מחולל דפי המתנה הקצרים /matana/<שם>/ ודפי התודה /matana/<שם>/toda/ (24.11.2026).
קורא את tools/data/matana-pages.json וכותב ל-src/pages/matana/. אחר כך מריצים python build.py.
דפים: noindex, בלי תפריט (meta bare), בלי מחירים בדף עצמו - מחירים רק בדף התודה, במיילים ובווטסאפ."""
import json, html, pathlib
from urllib.parse import quote

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = json.loads((ROOT / "tools" / "data" / "matana-pages.json").read_text(encoding="utf-8"))
C = DATA["common"]
ENDPOINT = "https://script.google.com/macros/s/AKfycbxgWe4xxaclqfzmOD_E0hOg2XDr2genZZyvAcf0hpHw_AHkgvQAqDop-XjdURdARYNx-Q/exec"
WA = "https://wa.me/972584049049?text="
esc = lambda s: html.escape(s, quote=True)
FOOT = '<script src="/assets/matana.js" defer></script>'


def wa(text):
    return WA + quote(text)


def meta(title, desc):
    m = {"title": title, "description": desc, "noindex": True, "bare": True, "no_cta": True, "foot": FOOT}
    return "<!--meta " + json.dumps(m, ensure_ascii=False) + " -->\n"


def landing(p):
    s = p["slug"]
    hmap = esc(json.dumps(p["h"], ensure_ascii=False))
    pts = "".join(f"<li>{esc(x)}</li>" for x in p["points"])
    vid = ""
    if p.get("video"):
        pre = p["video"][0]
        vid = f'<div class="mt-vid" data-src="/assets/promo/{pre}.mp4" data-poster="/assets/promo/{pre}.jpg"></div>\n'
    note = f" {esc(p['note'])}" if p.get("note") else ""
    return meta(p["title"], p["desc"]) + f"""<span class="mt-pill">🎁 מתנה חינם · מיזם חסד</span>
<h1 data-h="{hmap}">{esc(p['h1'])}</h1>
<p class="mt-sub">{esc(p['sub'])}</p>
<div class="gift" aria-hidden="true">
<span class="mt-badge">{esc(p['badge'])}</span>
<div class="book"><b>{esc(p['book'][0])}</b><small>{esc(p['book'][1])}</small></div>
<div class="phone"><i>לוגו</i><s></s><s></s><em>{esc(p['phone'])}</em></div>
</div>
<ul class="mt-points">{pts}</ul>
<form class="mt-form" id="form" action="{ENDPOINT}" method="POST" data-next="/matana/{s}/toda/" novalidate>
<input type="hidden" name="מקור" value="מתנה: {s}">
<input type="hidden" name="_page" value="">
<input type="hidden" name="utm_source" value=""><input type="hidden" name="utm_medium" value=""><input type="hidden" name="utm_campaign" value=""><input type="hidden" name="utm_content" value="">
<div class="mt-hp" aria-hidden="true"><label>אל תמלאו שדה זה <input type="text" name="_honey" tabindex="-1" autocomplete="off"></label></div>
<input type="email" name="email" autocomplete="email" placeholder="מייל (לכאן נשלח את המתנות)" aria-label="מייל" dir="ltr" style="text-align:right" required>
<input type="text" name="שם" autocomplete="given-name" placeholder="שם פרטי (לא חובה, כדי שאפנה אליכם בשם)" aria-label="שם פרטי, לא חובה">
<input type="tel" name="טלפון" autocomplete="tel" inputmode="tel" placeholder="טלפון (לא חובה)" aria-label="טלפון, לא חובה">
<label class="chk"><input type="checkbox" name="מאשר/ת קבלת עדכונים" value="כן"><span>{esc(C['consent'])}</span></label>
<p class="mt-err" role="alert"></p>
<button class="mt-btn mt-gold" type="submit">{esc(p['btn_mail'])}</button>
</form>
<p class="mt-or">או</p>
<a class="mt-btn mt-green" data-wa="main" href="{wa(p['wa_text'])}" rel="noopener">{esc(p['wa_label'])}</a>
<p class="mt-wa-note">הבונוס האישי הזה מגיע רק למי שכותב לי בווטסאפ.</p>
{vid}<p class="mt-trust">{esc(C['chesed'])}</p>
<p class="mt-priv">הפרטים נשמרים אצלי בלבד ולא מועברים לאף אחד. המתנה נשלחת גם בלי לסמן את התיבה. <a href="/kelim/pratiut/">פרטיות</a>.{note}</p>
<div class="mt-dock"><a class="mt-btn mt-gold" href="#form">למייל</a><a class="mt-btn mt-green" data-wa="dock" href="{wa(p['wa_text'])}" rel="noopener">{esc(p['dock_wa'])}</a></div>
"""


PAYHIP = "https://payhip.com/b/"
# מוצר זול בדף התודה: (שם, מחיר, קישור, תיאור קצר, כפתור)
CHEAP = {
    "roe": ("ערכת דפי לקוח לרואה חשבון", 39, "jaDfg", "דפי לקוח מוכנים להדפסה ולשליחה: רשימת מסמכים, תזכורות והסברים, כקבצי PDF ו-Word שאפשר לערוך.", "אני רוצה את הערכה"),
    "orchei-din": ("ערכת דפי לקוח לדיני עבודה", 39, "2sQ9Y", "דפי לקוח מוכנים למשרד: זכויות בפיטורין, טפסי איסוף מסמכים והסברים ללקוח, כקבצי PDF ו-Word.", "אני רוצה את הערכה"),
    "esek": ("ערכת השקה לעסק", 39, "uYQyE", "30 פוסטים מוכנים בחמש קבוצות, כולל מבצעים והזמנות, לעריכה ולהדפסה.", "אני רוצה את הערכה"),
    "kelim": ("ערכת השקה לעסק", 39, "uYQyE", "30 פוסטים מוכנים בחמש קבוצות, כולל מבצעים והזמנות, לעריכה ולהדפסה.", "אני רוצה את הערכה"),
    "claude": ("קבוצת עבודה עם Claude", 18, "kNyeO", "קבוצת ווטסאפ פרטית עם גילעד כמנטור, ערכה של 30 פרומפטים ב-PDF, וטיפ יומי.", "אני רוצה להצטרף"),
    "mohel-kurs": ("תיק המוהל", 97, "08VGv", "ערכה מסודרת למוהל בתחילת הדרך, מאת גילעד. הפרטים המלאים בדף המוצר.", "אני רוצה את התיק"),
}
# מדרגות השידרוג: (שם, מחיר, קישור, שורות, מומלץ)
BIZ_LADDER = [
    ("כלי ממותג", 290, "M5xC6", ["מחשבון אחד בלוגו, בצבעים ובקישור שלכם", "כפתור ווטסאפ וקוד QR", "סבב תיקונים אחד, מוכן תוך 48 שעות", "בונוס: הצטרפות לקבוצת הליווי והערכה"], False),
    ("ערכת כלים לאתר", 590, "8utXB", ["עד שלושה מחשבונים ממותגים", "קוד הטמעה לאתר שלכם ודף אחד", "דוח חודשי קצר", "שני סבבי תיקונים", "בונוס: קבוצת הליווי והערכה"], True),
    ("עסק דיגיטלי", 990, "bPiCF", ["הערכה המלאה", "כרטיס ביקור דיגיטלי", "דף עסק קטן", "בונוס: קבוצת הליווי והערכה"], False),
]
LADDERS = {
    "claude": [("הקורס המלא: לעבוד עם Claude", 147, "mXida", ["כל השיעורים והתרגילים", "מחיר מייסדים ל-30 הראשונים, אחר כך 247 ₪", "14 יום להחזר כספי"], True)],
    "mohel-kurs": [("הקורס המלא למוהלים", 597, "DI9mU", ["קורס מלא למוהלים בהדרכת גילעד", "ליווי מעשי: תרגול על בובה", "הפרטים המלאים בדף הקורס"], True)],
}
for _k in ("roe", "orchei-din", "esek", "kelim"):
    LADDERS[_k] = BIZ_LADDER
GROUP_LINE = ("קבוצת הליווי והערכה", 18, "kNyeO")
BIZ = ("roe", "orchei-din", "esek", "kelim")


def co(name, price, code, label, cls="mt-gold"):
    return f'<a class="mt-btn {cls}" data-co="{price}" data-name="{esc(name)}" href="{PAYHIP}{code}" rel="noopener">{esc(label)}</a>'


def cheap(p):
    n, pr, code, d, b = CHEAP[p["slug"]]
    return f"""<section class="mt-up" aria-labelledby="up-h">
<h2 id="up-h">{esc(n)}</h2>
<p>{esc(d)}</p>
<p class="mt-price">{pr} ₪, תשלום חד-פעמי, בלי מנוי. 14 יום להחזר כספי.</p>
{co(n, pr, code, b)}
</section>"""


def shidrug(p):
    s = p["slug"]
    rows = ""
    for n, pr, code, lines, rec in LADDERS[s]:
        li = "".join(f"<li>{esc(x)}</li>" for x in lines)
        tag = '<span class="mt-rec">הכי נבחר</span>' if rec and len(LADDERS[s]) > 1 else ""
        rows += f'<section class="mt-tier{" rec" if rec else ""}">{tag}<h2>{esc(n)}</h2><p class="mt-big">{pr} ₪</p><ul>{li}</ul>{co(n, pr, code, "אני רוצה: " + n if len(LADDERS[s]) > 1 else "אני רוצה להצטרף", "mt-gold" if rec else "mt-ghost")}</section>'
    g = ""
    if s in BIZ:
        g = f'<p class="mt-small">רק רוצים ליווי והערכה? <a data-co="{GROUP_LINE[1]}" data-name="{GROUP_LINE[0]}" href="{PAYHIP}{GROUP_LINE[2]}" rel="noopener">{GROUP_LINE[0]} ב-{GROUP_LINE[1]} ₪</a></p>'
    t = {"claude": "השלב הבא: הקורס המלא", "mohel-kurs": "השלב הבא: הקורס המלא למוהלים"}.get(s, "רוצים את זה בלוגו שלכם?")
    return meta("השלב הבא", "השלב הבא אחרי הרכישה.") + f"""<span class="mt-pill">תודה שרכשתם</span>
<h1 class="mt-center">{esc(t)}</h1>
<p class="mt-center">זה השלב הבא, למי שרוצה להמשיך. תשלום חד-פעמי, בלי מנוי, כולל קבלה.</p>
{rows}
<a class="mt-btn mt-green" data-wa="shidrug" href="{wa('שלום גילעד, יש לי שאלה לפני שאני מחליט/ה')}" rel="noopener">שאלה? כתבו לי בווטסאפ</a>
{g}
<p class="mt-trust">{esc(C['chesed'])}</p>
"""


def toda_shidrug(p):
    s = p["slug"]
    extra = "אם רכשתם את השלב שכולל קבוצה, אשלח לכם את הקישור אליה בהודעה אישית." if s in BIZ else "אחזור אליכם בהודעה אישית עם כל מה שצריך להתחיל."
    return meta("תודה על ההזמנה", "ההזמנה התקבלה.") + f"""<p class="mt-ok" aria-hidden="true">✅</p>
<h1 class="mt-center">תודה, ההזמנה התקבלה</h1>
<p class="mt-center">הקבלה והקבצים נשלחו למייל. {extra}</p>
<a class="mt-btn mt-green" data-wa="toda-shidrug" href="{wa('שלום גילעד, רכשתי ואני רוצה להתחיל')}" rel="noopener">לכתוב לי בווטסאפ</a>
<p class="mt-trust">{esc(C['chesed'])}</p>
"""


def upsell(p):
    if p["upsell"] == "claude":
        return f"""<section class="mt-up" aria-labelledby="up-h">
<h2 id="up-h">רוצים ללמוד לעבוד עם Claude יחד איתי?</h2>
<ul><li>קבוצת ווטסאפ פרטית עם גילעד כמנטור</li><li>ערכה של 30 פרומפטים ב-PDF</li><li>טיפ יומי ו"כלי היום"</li></ul>
<p class="mt-price">18 ₪, תשלום חד-פעמי, בלי חיוב אוטומטי. 14 יום להחזר כספי.</p>
<a class="mt-btn mt-gold" href="https://payhip.com/b/kNyeO" rel="noopener">אני רוצה להצטרף לקבוצה</a>
</section>"""
    who = p["upsell_for"]
    return f"""<section class="mt-up" aria-labelledby="up-h">
<h2 id="up-h">רוצים את זה בלוגו ובצבעי {esc(who)} שלכם?</h2>
<ul><li>כלי אחד בלוגו, בצבעים ובקישור משלכם, עם קוד QR</li><li>כפתור "שלחו לי את התוצאה בוואטסאפ" שמביא פניות ישר אליכם</li><li>מוכן תוך 48 שעות, עם סבב תיקונים אחד</li></ul>
<p class="mt-price">290 ₪, תשלום חד-פעמי, בלי מנוי. כולל קבלה.</p>
<a class="mt-btn mt-gold" href="{C['branded_url']}" rel="noopener">אני רוצה כלי ממותג</a>
</section>"""


def thanks(p):
    s = p["slug"]
    return meta("תודה! המתנות בדרך אליכם", "המתנות נשלחו למייל שלכם.") + f"""<p class="mt-ok" aria-hidden="true">🎁</p>
<h1 class="mt-center">המתנות בדרך למייל שלכם</h1>
<p class="mt-center">זה יגיע תוך דקות. אם לא רואים, כדאי להסתכל גם בספאם ובלשונית "קידומי מכירות".</p>
<a class="mt-btn mt-green" data-wa="thanks" href="{wa(p['wa_thanks'])}" rel="noopener">בונוס בווטסאפ: {esc(p['wa_bonus'])}</a>
{cheap(p)}
<p class="mt-trust">{esc(C['chesed'])}</p>
<p class="mt-priv"><a href="/kelim/pratiut/">פרטיות</a></p>
"""


def asara(p):
    groups = {}
    for g in p["gifts"]:
        groups.setdefault(g[3], []).append(g)
    out = ""
    for name, items in groups.items():
        out += f'<h2 class="mt-h">{esc(name)}</h2><ul class="mt-list">' + "".join(
            f'<li><a href="{esc(u)}">{esc(t)}<small>{esc(d)}</small></a></li>' for t, u, d, _ in items) + "</ul>"
    return meta("10 הכלים הכי שימושיים באתר הכלים", "רשימת 10 כלים נבחרים, מסודרים לפי תחום.") + f"""<span class="mt-pill">🎁 המתנה שלכם</span>
<h1>10 הכלים הכי שימושיים באתר</h1>
<p class="mt-sub">כל הכלים בחינם, בעברית, בלי הרשמה. שמרו את הדף.</p>
{out}<a class="mt-btn mt-green" data-wa="asara" href="{wa(p['wa_thanks'])}" rel="noopener">כלי אחד במיתוג אישי – בווטסאפ</a>
<p class="mt-trust">{esc(C['chesed'])}</p>
"""


TZ_CODES = ["tz-s1", "tz-s2", "tz-v1", "tz-v2", "tz-m1", "tz-m2", "tz-m3"]


def go(code):
    """קישור מעקב קצר /go/tz-*/: מעביר לדף קורס המוהלים עם utm, כדי למדוד מה הביא כל פרסום (דוח: tzadokReport)."""
    t = f"/matana/mohel-kurs/?utm_source=tzadok&utm_medium=share&utm_campaign={code}"
    m = {"title": "מעבר לדף", "description": "מעבר לדף קורס המוהלים.", "noindex": True, "bare": True, "no_cta": True,
         "head": f'<meta http-equiv="refresh" content="0; url={t}"><script>location.replace("{t}")</script>'}
    return "<!--meta " + json.dumps(m, ensure_ascii=False) + " -->" + chr(10) + f'<p class="mt-center"><a href="{t}">להמשך לחצו כאן</a></p>' + chr(10)


def write(rel, text):
    f = ROOT / "src" / "pages" / "matana" / rel / "index.html"
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(text, encoding="utf-8")


if __name__ == "__main__":
    for p in DATA["pages"]:
        write(p["slug"], landing(p))
        write(p["slug"] + "/toda", thanks(p))
        if p["slug"] in LADDERS:
            write(p["slug"] + "/shidrug", shidrug(p))
            write(p["slug"] + "/toda-shidrug" if p["slug"] != "mohel-kurs" else "mohel-kurs/toda-kurs", toda_shidrug(p))
        if p["slug"] == "mohel-kurs":
            for c in TZ_CODES:
                f = ROOT / "src" / "pages" / "go" / c / "index.html"
                f.parent.mkdir(parents=True, exist_ok=True)
                f.write_text(go(c), encoding="utf-8")
        if p["slug"] == "kelim":
            write("kelim/asara", asara(p))
    print("נכתבו", len(DATA["pages"]) * 2 + 1, "דפים")
