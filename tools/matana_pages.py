"""מחולל דפי המתנה הקצרים /matana/<שם>/ ודפי התודה /matana/<שם>/toda/ (24.11.2026).
קורא את tools/data/matana-pages.json וכותב ל-src/pages/matana/. אחר כך מריצים python build.py.
דפים: noindex, בלי תפריט (meta bare), בלי מחירים בדף עצמו - מחירים רק בדף התודה, במיילים ובווטסאפ."""
import json, html, pathlib, re
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


# חבילת מתנות בדף הלידים: רק מה שבאמת נשלח במייל (אותם gifts), עד 6 כרטיסים; קלוד: ארבע קבוצות הפרומפטים
PACK_N = 6
CLAUDE_PACK = [("להתחיל נכון", "איך מתחילים פרויקט עם Claude בלי לטעות"), ("כשמשהו נשבר", "הדבקת שגיאה ותיקון בשפה פשוטה"), ("לשפר ולבדוק", "בדיקה שהכלי לא נופל במקרים מוזרים"), ("לעבוד חכם", "הוראות שחוסכות סבבים מיותרים")]


def pack(p):
    if p["slug"] == "claude":
        items = CLAUDE_PACK
        total = 12
    elif p.get("gifts"):
        items = [(g[0], re.sub(r"\s*גם כקובץ PDF להדפסה:.*", "", g[2]).strip() or "בחינם") for g in p["gifts"]]
        total = len(items)
        items = items[:PACK_N]
    else:
        return ""
    more = f'<li class="more">ועוד {total - len(items)} במייל</li>' if total > len(items) and p["slug"] != "claude" else ""
    head = "12 פרומפטים מוכנים, בארבע קבוצות" if p["slug"] == "claude" else f"{total} מתנות במייל אחד"
    cards = "".join(f"<li><b>{esc(n)}</b><small>{esc(d)}</small></li>" for n, d in items)
    return f'<h2 class="mt-packh">🎁 {esc(head)}</h2><ul class="mt-pack">{cards}{more}</ul>\n'


def landing(p):
    """סבב 2 (24.11.2026): בטלפון הטופס במסך הראשון – תג, כותרת, שורת משנה, 3 נקודות, טופס; הוויזואל והשאר אחריו."""
    s = p["slug"]
    hmap = esc(json.dumps(p["h"], ensure_ascii=False))
    pk = pack(p)
    top = "".join(f"<li>{esc(x)}</li>" for x in p["points"][:3])
    rest = "".join(f"<li>{esc(x)}</li>" for x in p["points"][3:])
    vid = ""
    if p.get("video"):
        pre = p["video"][0]
        vid = (f'<div class="mt-vid" data-src="/assets/promo/{pre}.mp4" data-poster="/assets/promo/{pre}.jpg"></div>\n'
               f'<a class="mt-btn mt-gold mt-vid-cta" href="#form" data-cta="video">{esc(p["btn_mail"])}</a>\n')
    note = f" {esc(p['note'])}" if p.get("note") else ""
    return meta(p["title"], p["desc"]) + f"""<span class="mt-pill">🎁 מתנה חינם · מיזם חסד</span>
<h1 data-h="{hmap}">{esc(p['h1'])}</h1>
<p class="mt-sub">{esc(p['sub'])}</p>
<ul class="mt-points mt-top">{top}</ul>
<form class="mt-form" id="form" action="{ENDPOINT}" method="POST" data-next="/matana/{s}/toda/" novalidate>
<input type="hidden" name="מקור" value="מתנה: {s}">
<input type="hidden" name="_page" value="">
<input type="hidden" name="utm_source" value=""><input type="hidden" name="utm_medium" value=""><input type="hidden" name="utm_campaign" value=""><input type="hidden" name="utm_content" value="">
<div class="mt-hp" aria-hidden="true"><label>אל תמלאו שדה זה <input type="text" name="_honey" tabindex="-1" autocomplete="off"></label></div>
<input type="email" name="email" autocomplete="email" placeholder="מייל (לכאן נשלח את המתנות)" aria-label="מייל" dir="ltr" style="text-align:right" required>
<input type="text" name="שם" autocomplete="given-name" placeholder="שם פרטי (לא חובה)" aria-label="שם פרטי, לא חובה">
<details class="mt-tel"><summary>להוסיף טלפון לווטסאפ (לא חובה)</summary><input type="tel" name="טלפון" autocomplete="tel" inputmode="tel" placeholder="טלפון (לא חובה)" aria-label="טלפון, לא חובה"></details>
<p class="mt-err" role="alert"></p>
<button class="mt-btn mt-gold" type="submit">{esc(p['btn_mail'])}</button>
<p class="mt-micro">מגיע למייל תוך דקות. בלי תשלום ובלי כרטיס אשראי.</p>
<label class="chk"><input type="checkbox" name="מאשר/ת קבלת עדכונים" value="כן"><span>{esc(C['consent'])}</span></label>
</form>
<p class="mt-or">או</p>
<a class="mt-btn mt-green" data-wa="main" href="{wa(p['wa_text'])}" rel="noopener">{esc(p['wa_label'])}</a>
<p class="mt-wa-note">הבונוס האישי הזה מגיע רק למי שכותב לי בווטסאפ.</p>
<div class="gift" aria-hidden="true">
<span class="mt-badge">{esc(p['badge'])}</span>
<div class="book"><b>{esc(p['book'][0])}</b><small>{esc(p['book'][1])}</small></div>
<div class="phone"><i>לוגו</i><s></s><s></s><em>{esc(p['phone'])}</em></div>
</div>
{pk}{f'<ul class="mt-points">{rest}</ul>' if rest else ''}
<p class="mt-proof">{esc(PROOF)}</p>
{vid}{trust(mode="free")}
<p class="mt-trust">{esc(C['chesed'])}</p>
<p class="mt-priv">הפרטים נשמרים אצלי בלבד ולא מועברים לאף אחד. המתנה נשלחת גם בלי לסמן את התיבה. <a href="/kelim/pratiut/">פרטיות</a>.{note}</p>
<div class="mt-dock"><a class="mt-btn mt-gold" href="#form">למייל</a><a class="mt-btn mt-green" data-wa="dock" href="{wa(p['wa_text'])}" rel="noopener">{esc(p['dock_wa'])}</a></div>
"""


PROOF = "מתוך מיזם הכלים: מאות כלים חינמיים בעברית, פתוחים לכולם."


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
    # עובדות מדף הקורס בפייהיפ (נבדק 24.11.2026). הקורס של הרב דוד צדוק – לא "בהדרכת גילעד".
    "mohel-kurs": [("קורס מוהלים אונליין עם הרב דוד צדוק", 597, "DI9mU", ["8 שיעורים מוקלטים, 57 פרקים, כ-7 שעות לימוד", "אודיו לכל פרק, דפי שיעור ודפי סיכום", "שאלות לרב דוד צדוק בווטסאפ", "קורס עיוני – לא מחליף הכשרה מעשית והסמכה"], True)],
}
for _k in ("roe", "orchei-din", "esek", "kelim"):
    LADDERS[_k] = BIZ_LADDER
GROUP_LINE = ("קבוצת הליווי והערכה", 18, "kNyeO")
BIZ = ("roe", "orchei-din", "esek", "kelim")


def trust(refund=True, mode="sale"):
    """רצועת אמון: רק טענות אמיתיות. mode="free" לדף מתנה חינמי (24.11.2026) – בלי תגי תשלום וקבלה."""
    if mode == "free":
        fr = [("🤝", "מיזם חסד, ללא כוונת רווח"), ("🎁", "בחינם, בלי כרטיס אשראי"), ("✉️", "מסירים מהרשימה בלחיצה"), ("💬", "מענה אישי מגילעד בווטסאפ")]
        li = "".join(f'<li><span aria-hidden="true">{i}</span> {esc(t)}</li>' for i, t in fr)
        return f'<ul class="mt-badges" aria-label="למה אפשר לסמוך">{li}</ul>'
    items = [("🤝", "מיזם חסד, ללא כוונת רווח"), ("🔒", "תשלום מאובטח (PayPal / כרטיס אשראי דרך Payhip)"), ("🧾", "קבלה על כל רכישה"), ("💬", "מענה אישי מגילעד בווטסאפ")]
    if refund:
        items.append(("↩️", "14 יום להחזר כספי"))
    li = "".join(f'<li><span aria-hidden="true">{i}</span> {esc(t)}</li>' for i, t in items)
    return f'<ul class="mt-badges" aria-label="למה אפשר לסמוך">{li}</ul>'


REFUND = "14 יום לנסות בשקט. לא מתאים? מחזיר לך את הכסף, בלי שאלות. לא הספקת לבדוק? כתוב לי בווטסאפ ואאריך לך את תקופת הניסיון, באהבה."
WHY = "זה מיזם חסד. אז למה בכלל תשלום? כי למדתי שמה שמקבלים בחינם נשאר בצד. תשלום סמלי גורם לך לפתוח, לנסות ולהשתמש באמת, וזו כל המטרה שלי."
INCOME = "ההכנסות מחזיקות את המיזם ומאפשרות לי להמשיך לבנות כלים בחינם לכולם"
# מחיר השקה: המחיר שאחרי ההשקה מחוק לידו (גילעד 24.11: "מחיר השקה" + הנחה שיווקית). חובה להעלות אליו בסוף ההשקה, אחרת זו הטעיה.
AFTER = {18: 29, 39: 59, 290: 450, 590: 890, 990: 1490}
def launch(pr):
    a = AFTER.get(pr)
    if not a:
        return '<span class="mt-launch">מחיר השקה</span> '
    return f'<span class="mt-launch">מחיר השקה · חוסכים {round((a - pr) * 100 / a)}%</span> <span class="mt-after">אחרי ההשקה: <s>{a:,} ₪</s></span> '
HARD = 'זה מיזם חסד, והמטרה שלי שהכלים יגיעו לכמה שיותר אנשים. אם התשלום קשה לכם כרגע, כתבו לי בווטסאפ ואשלח לכם קופון הנחה אישי. בלי בושה ובלי הסברים.'
def hard_box(slug):
    return f'<aside class="mt-hard"><p>{esc(HARD)}</p><a class="mt-btn mt-green" data-wa="kashe" href="{wa("שלום גילעד, התשלום קשה לי כרגע. אפשר קופון הנחה?")}" rel="noopener">לבקש קופון הנחה בווטסאפ</a></aside>'
SMALL = {18: "פחות מקפה ומאפה", 39: "פחות ממנת המבורגר עם צ'יפס ושתייה", 97: "כמו ארוחת בוקר זוגית"}


def save_note(slug):
    if slug not in SAVE:
        return ""
    return f'<p class="mt-small">דוגמה לחישוב, לא הבטחה: {esc(SAVE[slug])}</p>'


def refund_box(slug):
    if slug == "mohel-kurs":
        return ""
    return f'<aside class="mt-refund"><strong>אחריות 14 יום</strong><p>{esc(REFUND)}</p></aside>'


WIN = "ככה כולם מרוויחים: אתה מקבל כלי שחוסך לך זמן וכסף, והמיזם ממשיך לתת כלים בחינם לעוד אנשים."
SAVE = {'roe': 'משרד ששולח ל-40 לקוחות בחודש רשימת מסמכים ידנית של 10 דקות לכל אחד יכול לחסוך כשש שעות בחודש.', 'orchei-din': 'משרד שעונה ל-30 פניות בחודש על שאלות חישוב של 5 דקות כל אחת יכול לחסוך כשעתיים וחצי בחודש.', 'esek': 'עסק שמקבל 20 שאלות מחיר בחודש וחוסך 5 דקות בכל אחת יכול לחסוך כשעה וחצי בחודש.', 'kelim': 'עסק שכותב 20 מיילים בחודש וחוסך 5 דקות בכל אחד יכול לחסוך כשעה וחצי בחודש.'}


def why_box(slug):
    inc = "" if slug == "mohel-kurs" else f" {INCOME}. {WIN}"
    return f'<aside class="mt-why"><p>{esc(WHY)}{esc(inc)}</p><p class="mt-sign">גילעד</p></aside>'


def co(name, price, code, label, cls="mt-gold"):
    return f'<a class="mt-btn {cls}" data-co="{price}" data-name="{esc(name)}" href="{PAYHIP}{code}" rel="noopener">{esc(label)}</a>'


def cheap(p):
    n, pr, code, d, b = CHEAP[p["slug"]]
    s = p["slug"]
    ref = "" if s == "mohel-kurs" else " 14 יום להחזר כספי."
    return f"""<section class="mt-up" aria-labelledby="up-h">
<h2 id="up-h">{esc(n)}</h2>
<p>{esc(d)}</p>
<p class="mt-price">{"" if s == "mohel-kurs" else launch(pr)}{pr} ₪, {esc(SMALL[pr])}. תשלום חד-פעמי, בלי מנוי, מגיע למייל תוך דקה.{ref}</p>
{co(n, pr, code, b)}
{trust(s != "mohel-kurs")}
{refund_box(s)}
{why_box(s)}
<a class="mt-btn mt-green" data-wa="presale" href="{wa('שלום גילעד, יש לי שאלה לפני שאני קונה/ה')}" rel="noopener">שאלה לפני שקונים?</a>
</section>"""


def shidrug(p):
    s = p["slug"]
    rows = ""
    for n, pr, code, lines, rec in LADDERS[s]:
        li = "".join(f"<li>{esc(x)}</li>" for x in lines)
        tag = '<span class="mt-rec">הכי נבחר</span>' if rec and len(LADDERS[s]) > 1 else ""
        rows += f'<section class="mt-tier{" rec" if rec else ""}">{tag}<h2>{esc(n)}</h2><p class="mt-big">{launch(pr) if s in BIZ else ""}{pr} ₪</p><ul>{li}</ul>{co(n, pr, code, "אני רוצה: " + n if len(LADDERS[s]) > 1 else "אני רוצה להצטרף", "mt-gold" if rec else "mt-ghost")}</section>'
    g = ""
    if s in BIZ:
        g = f'<p class="mt-small">רק רוצים ליווי והערכה? <a data-co="{GROUP_LINE[1]}" data-name="{GROUP_LINE[0]}" href="{PAYHIP}{GROUP_LINE[2]}" rel="noopener">{GROUP_LINE[0]} ב-{GROUP_LINE[1]} ₪, מחיר השקה</a></p>'
    t = {"claude": "השלב הבא: הקורס המלא", "mohel-kurs": "השלב הבא: קורס מוהלים אונליין עם הרב דוד צדוק"}.get(s, "רוצים את זה בלוגו שלכם?")
    return meta("השלב הבא", "השלב הבא אחרי הרכישה.") + f"""<span class="mt-pill">השלב הבא</span>
<h1 class="mt-center">{esc(t)}</h1>
<p class="mt-center">זה השלב הבא, למי שרוצה להמשיך. תשלום חד-פעמי, בלי מנוי, כולל קבלה.</p>
{rows}
{save_note(s)}
{hard_box(s)}
{trust(s != "mohel-kurs")}
{refund_box(s)}
{why_box(s)}
<a class="mt-btn mt-green" data-wa="shidrug" href="{wa('שלום גילעד, יש לי שאלה לפני שאני קונה/ה')}" rel="noopener">שאלה לפני שקונים?</a>
{g}
<p class="mt-trust">{esc(C['chesed'])}</p>
"""


def toda_shidrug(p):
    s = p["slug"]
    extra = "אם רכשתם את השלב שכולל קבוצה, אשלח לכם את הקישור אליה בהודעה אישית." if s in BIZ else "אחזור אליכם בהודעה אישית עם כל מה שצריך להתחיל."
    buy = f'<span id="mt-buy" data-value="597" data-name="{esc(LADDERS[s][0][0])}" hidden></span>\n' if s == "mohel-kurs" else '<span id="mt-buy" hidden></span>\n'
    return meta("תודה על ההזמנה", "ההזמנה התקבלה.") + buy + f"""<p class="mt-ok" aria-hidden="true">✅</p>
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
<p class="mt-price">{launch(18)}18 ₪, תשלום חד-פעמי, בלי חיוב אוטומטי. 14 יום להחזר כספי.</p>
<a class="mt-btn mt-gold" href="https://payhip.com/b/kNyeO" rel="noopener">אני רוצה להצטרף לקבוצה</a>
</section>"""
    who = p["upsell_for"]
    return f"""<section class="mt-up" aria-labelledby="up-h">
<h2 id="up-h">רוצים את זה בלוגו ובצבעי {esc(who)} שלכם?</h2>
<ul><li>כלי אחד בלוגו, בצבעים ובקישור משלכם, עם קוד QR</li><li>כפתור "שלחו לי את התוצאה בוואטסאפ" שמביא פניות ישר אליכם</li><li>מוכן תוך 48 שעות, עם סבב תיקונים אחד</li></ul>
<p class="mt-price">{launch(290)}290 ₪, תשלום חד-פעמי, בלי מנוי. כולל קבלה.</p>
<a class="mt-btn mt-gold" href="{C['branded_url']}" rel="noopener">אני רוצה כלי ממותג</a>
</section>"""


def next_link(s):
    """קישור מדף התודה לדף השדרוג (גילעד 24.11: "את הדף תודה אין בו שום קישור לדף מכירה אחרי!!")."""
    if s not in LADDERS:
        return ""
    h, d = {"claude": ("רוצים ללכת עד הסוף?", "הקורס המלא: לבנות כלים משלכם עם Claude, צעד אחר צעד."),
            "mohel-kurs": ("רוצים ללמוד את הלכות המילה לעומק?", "קורס מוהלים אונליין עם הרב דוד צדוק: שיעורים מוקלטים, דפי סיכום ושאלות לרב. קורס עיוני – לא מחליף הכשרה מעשית והסמכה.")}.get(
        s, ("רוצים את הכלים בלוגו ובצבעים שלכם?", "כלי ממותג, ערכת כלים לאתר או עסק דיגיטלי שלם. כל האפשרויות והמחירים בדף אחד."))
    return f"""<section class="mt-up mt-next" aria-labelledby="next-h">
<h2 id="next-h">{esc(h)}</h2>
<p>{esc(d)}</p>
<a class="mt-btn mt-gold" data-next="shidrug" href="/matana/{s}/shidrug/">לכל האפשרויות והמחירים</a>
</section>"""


def toda_kniya(p):
    """דף שפייהיפ מעביר אליו מיד אחרי תשלום על המוצר הזול (גילעד 24.11: "חייב קריאה לפעולה מהירה להמשיך לדף הבא בלי שום מחשבה")."""
    s = p["slug"]
    n, pr, code, lines, rec = LADDERS[s][0]  # השורות והמחיר מאותה מדרגה, כדי שלא יהיה פער
    h = {"claude": "השלב הבא: לבנות כלים משלכם עם Claude", "mohel-kurs": "השלב הבא: קורס מוהלים אונליין עם הרב דוד צדוק"}.get(s, "השלב הבא: הכלים בלוגו ובצבעים שלכם")
    li = "".join(f"<li>{esc(x)}</li>" for x in (lines if s == "mohel-kurs" else lines[:3]))
    p0 = LADDERS[s][0][1]
    cn, cp = CHEAP[s][0], CHEAP[s][1]
    price = f'{launch(p0) if s in BIZ else ""}{"החל מ-" if len(LADDERS[s]) > 1 else ""}{p0} ₪'
    return meta("התשלום עבר, הקבצים במייל", "התשלום התקבל והקבצים נשלחו למייל.") + f"""<span id="mt-buy" data-value="{cp}" data-name="{esc(cn)}" hidden></span>
<p class="mt-paid" role="status"><span aria-hidden="true">✅</span> התשלום עבר. הקבצים כבר במייל שלכם</p>
<section class="mt-go" aria-labelledby="go-h">
<span class="mt-pill">רגע לפני שממשיכים</span>
<h1 id="go-h">{esc(h)}</h1>
<ul class="mt-points">{li}</ul>
<p class="mt-big mt-center">{price}</p>
<a class="mt-btn mt-gold mt-pulse" data-next="kniya" href="/matana/{s}/shidrug/">כן, להמשיך לשלב הבא <span aria-hidden="true">←</span></a>
<p class="mt-small">תשלום חד-פעמי, בלי מנוי, כולל קבלה.</p>
</section>
<p class="mt-small">הקבצים מחכים לכם במייל, בהודעה מ-Payhip עם כפתורי ההורדה. לא הגיע? כדאי לבדוק בספאם, או <a data-wa="kniya" href="{wa('שלום גילעד, קניתי ולא קיבלתי את הקבצים במייל')}" rel="noopener">לכתוב לי בווטסאפ</a>.</p>
<p class="mt-trust">{esc(C['chesed'])}</p>
"""


def thanks(p):
    s = p["slug"]
    return meta("תודה! המתנות בדרך אליכם", "המתנות נשלחו למייל שלכם.") + f"""<p class="mt-ok" aria-hidden="true">🎁</p>
<h1 class="mt-center">המתנות בדרך למייל שלכם</h1>
<p class="mt-center">זה יגיע תוך דקות. אם לא רואים, כדאי להסתכל גם בספאם ובלשונית "קידומי מכירות".</p>
<a class="mt-btn mt-green" data-wa="thanks" href="{wa(p['wa_thanks'])}" rel="noopener">בונוס בווטסאפ: {esc(p['wa_bonus'])}</a>
{(next_link(s) + chr(10) + cheap(p)) if s == "mohel-kurs" else (cheap(p) + chr(10) + next_link(s))}
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
            write(p["slug"] + "/toda-kniya", toda_kniya(p))
            write(p["slug"] + "/toda-shidrug" if p["slug"] != "mohel-kurs" else "mohel-kurs/toda-kurs", toda_shidrug(p))
        if p["slug"] == "mohel-kurs":
            for c in TZ_CODES:
                f = ROOT / "src" / "pages" / "go" / c / "index.html"
                f.parent.mkdir(parents=True, exist_ok=True)
                f.write_text(go(c), encoding="utf-8")
        if p["slug"] == "kelim":
            write("kelim/asara", asara(p))
    print("נכתבו", len(DATA["pages"]) * 2 + 1, "דפים")
