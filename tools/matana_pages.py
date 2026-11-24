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
<input type="text" name="שם" autocomplete="given-name" placeholder="שם פרטי" aria-label="שם פרטי" required>
<input type="email" name="email" autocomplete="email" placeholder="מייל (לכאן נשלח את המתנות)" aria-label="מייל" dir="ltr" style="text-align:right" required>
<input type="tel" name="טלפון" autocomplete="tel" inputmode="tel" placeholder="טלפון (לא חובה)" aria-label="טלפון, לא חובה">
<label class="chk"><input type="checkbox" name="מאשר/ת קבלת עדכונים" value="כן"><span>{esc(C['consent'])}</span></label>
<p class="mt-err" role="alert"></p>
<button class="mt-btn mt-gold" type="submit">{esc(p['btn_mail'])}</button>
</form>
<p class="mt-or">או</p>
<a class="mt-btn mt-green" data-wa="main" href="{wa(p['wa_text'])}" rel="noopener">{esc(p['wa_label'])}</a>
{vid}<p class="mt-trust">{esc(C['chesed'])}</p>
<p class="mt-priv">הפרטים נשמרים אצלי בלבד ולא מועברים לאף אחד. המתנה נשלחת גם בלי לסמן את התיבה. <a href="/kelim/pratiut/">פרטיות</a>.{note}</p>
<div class="mt-dock"><a class="mt-btn mt-gold" href="#form">למייל</a><a class="mt-btn mt-green" data-wa="dock" href="{wa(p['wa_text'])}" rel="noopener">{esc(p['dock_wa'])}</a></div>
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
{upsell(p)}
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


def write(rel, text):
    f = ROOT / "src" / "pages" / "matana" / rel / "index.html"
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(text, encoding="utf-8")


if __name__ == "__main__":
    for p in DATA["pages"]:
        write(p["slug"], landing(p))
        write(p["slug"] + "/toda", thanks(p))
        if p["slug"] == "kelim":
            write("kelim/asara", asara(p))
    print("נכתבו", len(DATA["pages"]) * 2 + 1, "דפים")
