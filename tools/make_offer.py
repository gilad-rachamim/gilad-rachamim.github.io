# -*- coding: utf-8 -*-
"""דף הצעת שדרוג ממותג לליד שביקש "פרטים על השדרוגים".

  python tools/make_offer.py <slug> [--kind misada|office] [--no-card]

קורא את src/pages/kelim/b/<slug>/menu.json (עסק עם תפריט) או brand.json (משרד), ובונה:
  kelim/b/<slug>/shidrug/index.html   דף קצר: מה כבר יש, שלוש דרגות עם המחשה בלוגו ובצבעי העסק, מיזם חסד
  kelim/b/<slug>/shidrug/card.jpg     תמונה 1200x630 לתצוגה המקדימה של הקישור בוואטסאפ
  kelim/b/<slug>/shidrug/card-tall.jpg  תמונה 1080x1350 לשליחה כתמונה
ושומר נוסח הודעה קצר ב- src/pages/kelim/b/<slug>/offer-message.txt (נשלח רק אחרי "כן" של גילעד).
המחירים והתוכן של הדרגות: OFFERS למטה (אושרו 24.11.2026: 290 / 590 / 990, תחזוקה 190 לשנה מהשנה השנייה).
"""
import argparse, html, json, os, pathlib, shutil, subprocess, sys, tempfile, urllib.parse

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import make_brand as mb  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC_B, OUT_B, SITE = ROOT / "src/pages/kelim/b", ROOT / "kelim/b", "https://hakelim.com"
GILAD_WA = "972584049049"
PAY = {"290": "https://payhip.com/b/M5xC6", "590": "https://payhip.com/b/8utXB", "990": "https://payhip.com/b/bPiCF"}
CHROME = [r"C:\Program Files\Google\Chrome\Application\chrome.exe", r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"]

OFFERS = {
 "misada": {
  "kick": "השלב הבא",
  "h1": "מהתפריט שלכם <b>לעסק דיגיטלי שלם</b>",
  "sub": "שלוש דרגות, מחיר חד-פעמי. בוחרים בנחת, ואני בונה לכם בלוגו ובצבעים שלכם.",
  "have": "<b>כבר שלכם, בחינם ולתמיד:</b> התפריט עם ההזמנה בוואטסאפ וקוד ה-QR. הוא נשאר גם אם לא תיקחו שום דבר נוסף.",
  "tiers": [
   {"p": "290", "small": "דרגה 1", "name": "כלי ממותג", "short": "כלי אחד נוסף בלוגו שלכם, לבחירתכם",
    "line": "כלי אחד נוסף בלוגו ובצבעים שלכם. אתם בוחרים איזה:",
    "mock": "pick", "cap": "בוחרים אחד משלושת אלה",
    "li": ["קישור משלו וקוד QR", "מוכן תוך 48 שעות", "סבב תיקונים אחד"]},
   {"p": "590", "small": "דרגה 2", "name": "ערכת הכלים", "short": "שלושת הכלים יחד, בדף אחד, עם דוח חודשי", "best": "הכי משתלם",
    "line": "שלושת הכלים יחד, בדף אחד שמרכז אותם, ואתם יודעים מה עובד.",
    "mock": "kit", "cap": "דוגמה לדוח החודשי (המספרים להמחשה)",
    "li": ["דף מבצעים, שלט QR להדפסה וכרטיס ביקור דיגיטלי", "דוח חודשי קצר: כמה נכנסו וכמה לחצו להזמין", "יש לכם אתר? מטמיע את הכלים בתוכו", "שני סבבי תיקונים"]},
   {"p": "990", "small": "דרגה 3", "name": "עסק דיגיטלי מלא", "short": "הערכה, ועוד דף עסק שמחבר הכול בקישור אחד",
    "line": "כל הערכה, ועוד דף עסק אחד שמחבר הכול. קישור אחד לכל מקום.",
    "mock": "phone", "cap": "כך ייראה דף העסק שלכם",
    "li": ["כל מה שבערכת הכלים", "דף עסק: תפריט, מבצעים, ניווט, טלפון ודירוג בגוגל", "קישור אחד לפרופיל, לסטטוס, לאינסטגרם ולשלט"]},
  ],
  "pick": [("🔥", "דף מבצעים ודילים"), ("QR", "שלט QR מעוצב להדפסה"), ("📇", "כרטיס ביקור דיגיטלי")],
  "phone": [("", "🍕 לתפריט ולהזמנה"), ("", "🔥 המבצעים השבוע"), ("o", "📍 ניווט אלינו"), ("o", "⭐ דרגו אותנו בגוגל"), ("g", "💬 וואטסאפ")],
  "sign": ("סרקו והזמינו", "התפריט המלא בטלפון שלכם"),
 },
 "office": {
  "kick": "השלב הבא",
  "h1": "מהמחשבון שלכם <b>למשרד דיגיטלי שלם</b>",
  "sub": "שלוש דרגות, מחיר חד-פעמי. בוחרים בנחת, ואני בונה לכם בלוגו ובצבעים שלכם.",
  "have": "<b>כבר שלכם, בחינם ולתמיד:</b> המחשבון הממותג שקיבלתם. הוא נשאר גם אם לא תיקחו שום דבר נוסף.",
  "tiers": [
   {"p": "290", "small": "דרגה 1", "name": "כלי ממותג", "short": "מחשבון אחד נוסף בלוגו שלכם, לבחירתכם",
    "line": "מחשבון אחד נוסף בלוגו ובצבעים שלכם, שמביא פניות ישר לוואטסאפ של המשרד.",
    "mock": "pick", "cap": "דוגמאות. אפשר לבחור כל מחשבון מהאתר",
    "li": ["כפתור \"שלחו לי את התוצאה\" לוואטסאפ שלכם", "קישור משלו וקוד QR", "מוכן תוך 48 שעות, סבב תיקונים אחד"]},
   {"p": "590", "small": "דרגה 2", "name": "ערכת הכלים", "short": "שלושה מחשבונים, הטמעה באתר ודוח חודשי", "best": "הכי משתלם",
    "line": "שלושה מחשבונים ממותגים, מוטמעים באתר המשרד, עם דוח חודשי.",
    "mock": "kit", "cap": "דוגמה לדוח החודשי (המספרים להמחשה)",
    "li": ["עד שלושה מחשבונים בלוגו שלכם", "קוד הטמעה לאתר (וורדפרס, וויקס, כל אתר)", "דף אחד שמרכז את שלושתם", "דוח חודשי קצר ושני סבבי תיקונים"]},
   {"p": "990", "small": "דרגה 3", "name": "משרד דיגיטלי מלא", "short": "הערכה, כרטיס ביקור דיגיטלי ודף משרד",
    "line": "כל הערכה, ועוד כרטיס ביקור דיגיטלי ודף משרד שמחבר הכול.",
    "mock": "phone", "cap": "כך ייראה דף המשרד שלכם",
    "li": ["כל מה שבערכת הכלים", "כרטיס ביקור דיגיטלי לשמירה באנשי הקשר", "דף משרד: מחשבונים, תחומי טיפול, ניווט וטלפון"]},
  ],
  "pick": [("🧮", "מחשבון החזר מס"), ("📊", "מחשבון שכר נטו"), ("⚖️", "פיצויי פיטורין")],
  "phone": [("", "🧮 המחשבונים שלנו"), ("", "📋 תחומי הטיפול"), ("o", "📍 ניווט למשרד"), ("o", "📇 שמרו אותנו באנשי הקשר"), ("g", "💬 וואטסאפ")],
  "sign": ("סרקו וחשבו", "המחשבון שלנו בטלפון שלכם"),
 },
}

e = lambda s: html.escape(s or "", quote=True)
log = lambda *a: print(*a)


def load(slug, kind):
    d = SRC_B / slug
    for fn, k in (("menu.json", "misada"), ("brand.json", "office")):
        if (d / fn).exists():
            cfg = json.loads((d / fn).read_text(encoding="utf-8"))
            return cfg, kind or cfg.get("offer_kind") or k
    raise SystemExit("אין menu.json או brand.json ב-" + str(d))


def wa(name, t):
    txt = "היי גילעד, כאן %s. מעניין אותנו: %s (%s ₪)." % (name, t["name"], t["p"])
    return "https://wa.me/%s?text=%s" % (GILAD_WA, urllib.parse.quote(txt))


def mock(kind_cfg, t, logo_url, qr_url):
    m = t["mock"]
    if m == "pick":
        cells = ""
        for ic, lb in kind_cfg["pick"]:
            pic = '<img src="%s" alt="">' % qr_url if ic == "QR" and qr_url else "<em>%s</em>" % ("▦" if ic == "QR" else ic)
            cells += "<div>%s%s</div>" % (pic, e(lb))
        return '<div class="bo-mock"><div class="bo-pick">%s</div><span class="bo-cap">%s</span></div>' % (cells, e(t["cap"]))
    if m == "kit":
        s1, s2 = kind_cfg["sign"]
        q = '<img class="q" src="%s" alt="">' % qr_url if qr_url else ""
        lg = '<img class="l" src="%s" alt="">' % logo_url if logo_url else ""
        return ('<div class="bo-mock"><div class="bo-sign">%s<div>%s<b>%s</b><span>%s</span></div></div>'
                '<div class="bo-rep"><div><b>412</b>כניסות</div><div><b>96</b>לחצו להזמין</div><div><b>38</b>מהשלט</div></div>'
                '<span class="bo-cap">%s</span></div>') % (q, lg, e(s1), e(s2), e(t["cap"]))
    rows = "".join('<span class="%s">%s</span>' % (c, e(x)) for c, x in kind_cfg["phone"])
    lg = '<img src="%s" alt="">' % logo_url if logo_url else ""
    return '<div class="bo-mock"><div class="bo-ph">%s<small>הכול במקום אחד</small>%s</div><span class="bo-cap">%s</span></div>' % (lg, rows, e(t["cap"]))


HEAD = """<!doctype html>
<html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>%(title)s</title><meta name="description" content="%(desc)s">
<meta name="robots" content="noindex,nofollow"><link rel="canonical" href="https://hakelim.com/kelim/bniyat-machshevon/">
<meta property="og:title" content="%(title)s"><meta property="og:description" content="%(desc)s">
<meta property="og:image" content="%(og)s"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image"><meta name="theme-color" content="#0e0c14"><link rel="icon" href="%(icon)s">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;800;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="%(css)s">
"""
GA = """<script async src="https://www.googletagmanager.com/gtag/js?id=G-4QR4583VST"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-4QR4583VST',{brand:'%(slug)s'});gtag('set',{brand:'%(slug)s'});
document.addEventListener('click',function(ev){var a=ev.target.closest('[data-bo]');if(a)gtag('event','offer_click',{brand:'%(slug)s',plan:a.getAttribute('data-plan')||'',kind:a.getAttribute('data-bo')});});</script>
"""


def build(slug, kind=None, card=True):
    cfg, kind = load(slug, kind)
    K = OFFERS[kind]
    name = cfg["name"]
    out = OUT_B / slug / "shidrug"
    out.mkdir(parents=True, exist_ok=True)
    logo = SRC_B / slug / cfg.get("logo", "logo.png")
    logo_url = "/kelim/b/%s/%s" % (slug, logo.name) if logo.exists() else ""
    if logo.exists() and not (OUT_B / slug / logo.name).exists():
        shutil.copyfile(logo, OUT_B / slug / logo.name)
    qr_url = "/kelim/b/%s/qr.png" % slug if (OUT_B / slug / "qr.png").exists() else ""
    c1, c2 = cfg.get("color") or "#e3151a", cfg.get("color2") or "#ffd400"
    link = "%s/kelim/b/%s/shidrug/" % (SITE, slug)
    title = "%s – שלוש דרכים לשדרג" % name
    desc = "הצעה אישית ל%s: כלי ממותג 290 ₪, ערכת כלים 590 ₪, עסק דיגיטלי מלא 990 ₪. חד-פעמי." % name
    v = mb.asset_v()
    head = HEAD % {"title": e(title), "desc": e(desc), "og": link + "card.jpg?v=" + v, "icon": logo_url or "/assets/icon-esek-192.png",
                   "css": "/assets/brand-offer.css?v=" + v}
    style = "--c:%s;--c2:%s" % (e(c1), e(c2))
    lg = '<div class="bo-logo"><img src="%s" alt="%s"></div>' % (logo_url, e(name)) if logo_url else "<h2>%s</h2>" % e(name)
    tiers = ""
    for t in K["tiers"]:
        tiers += ('<section class="bo-t%s">%s<div class="bo-top"><h2><small>%s</small>%s</h2>'
                  '<div class="bo-pr">%s<i>₪</i><span>חד-פעמי</span></div></div><p class="bo-line">%s</p>%s<ul>%s</ul>'
                  '<a class="bo-go" data-bo="wa" data-plan="%s" href="%s" target="_blank" rel="noopener">💬 מתאים לי, דברו איתי</a>'
                  '<a class="bo-pay" data-bo="pay" data-plan="%s" href="%s" target="_blank" rel="noopener">או תשלום מאובטח בכרטיס ←</a></section>') % (
            " best" if t.get("best") else "", '<span class="bo-rib">★ %s</span>' % e(t["best"]) if t.get("best") else "",
            e(t["small"]), e(t["name"]), t["p"], e(t["line"]), mock(K, t, logo_url, qr_url),
            "".join("<li>%s</li>" % e(x) for x in t["li"]), t["p"], e(wa(name, t)), t["p"], PAY[t["p"]])
    ask = "https://wa.me/%s?text=%s" % (GILAD_WA, urllib.parse.quote("היי גילעד, כאן %s. יש לי שאלה על השדרוגים:" % name))
    page = head + GA % {"slug": slug} + """</head>
<body class="bo hk-brand-offer" data-brand="%s" style="%s">
<header class="bo-hero bo-wrap">%s<div><span class="bo-kick">%s · %s</span></div><h1>%s</h1><p>%s</p></header>
<main class="bo-wrap">
<div class="bo-have">✅ %s</div>
%s
<section class="bo-ch"><h3>🤍 למה המחירים האלה?</h3><p>"הכלים של גילעד רחמים" הוא מיזם חסד, בלי כוונת רווח: כל הכלים באתר פתוחים לכולם בחינם, בלי הרשמה ובלי פרסומות. התשלום כאן הוא על שעות הבנייה האישית לעסק שלכם, והוא מה שמחזיק את המיזם פתוח לכולם.</p></section>
<p class="bo-fine"><b>האותיות הקטנות, בגדול:</b> תשלום חד-פעמי בכרטיס או בביט, עם קבלה (עוסק פטור, בלי מע"מ). לא מרוצים? החזר מלא תוך 14 יום. השנה הראשונה של אחסון ועדכונים כלולה; מהשנה השנייה 190 ₪ לשנה למי שרוצה להמשיך לקבל עדכונים ודוח. בלי זה הכלים ממשיכים לעבוד כמו שהם.</p>
<div class="bo-end"><a class="bo-go" data-bo="ask" href="%s" target="_blank" rel="noopener">💬 יש שאלה? כתבו לי</a><p>גילעד רחמים · הכלים של גילעד רחמים · <a href="https://hakelim.com/?utm_source=brand&utm_medium=offer&utm_campaign=%s" target="_blank" rel="noopener">hakelim.com</a></p></div>
</main></body></html>
""" % (slug, style, lg, e(K["kick"]), e(name), K["h1"], e(K["sub"]), K["have"], tiers, e(ask), slug)
    (out / "index.html").write_text(page, encoding="utf-8")
    log("נבנה:", "/kelim/b/%s/shidrug/" % slug)

    if card:
        cells = "".join('<div class="%s"><small>%s</small><b>%s</b><span>%s</span><strong>%s<i>₪</i></strong></div>' % (
            "best" if t.get("best") else "", e(t["small"] + (" · ★ " + t["best"] if t.get("best") else "")), e(t["name"]), e(t["short"]), t["p"]) for t in K["tiers"])
        for fn, cls, size in (("card.jpg", "", "1200,630"), ("card-tall.jpg", " tall", "1080,1350")):
            ch = (HEAD % {"title": e(title), "desc": "", "og": "", "icon": "", "css": (ROOT / "assets/brand-offer.css").as_uri()} + """</head>
<body class="bo bo-card%s" style="%s"><div class="bc-h">%s<div><h1>%s</h1><p>%s</p></div></div>
<div class="bc-r">%s</div><p class="bc-f">תשלום חד-פעמי · החזר מלא תוך 14 יום · מיזם חסד, בלי כוונת רווח</p></body></html>""" % (
                cls, style, '<div class="bo-logo"><img src="%s" alt=""></div>' % logo.as_uri() if logo.exists() else "",
                "שלוש דרכים לשדרג את <b>%s</b>" % e(name), "בלוגו ובצבעים שלכם. בוחרים בנחת.", cells))
            shot(ch, out / fn, size)
    msg = MSG.format(name=name, link=link)
    mp = SRC_B / slug / "offer-message.txt"
    if not mp.exists():
        mp.write_text(msg + "\n", encoding="utf-8")
    log("קישור:", link, "\nנוסח ההודעה (לאישור גילעד לפני שליחה):", mp)
    return mb.check()


def shot(html_text, dst, size):
    """מצלם HTML לתמונה בכרום ללא ממשק. PNG זמני ואז JPG קל."""
    from PIL import Image
    exe = next((c for c in CHROME if os.path.exists(c)), None) or shutil.which("chrome") or shutil.which("chromium")
    if not exe:
        log("⚠️ אין כרום, מדלג על התמונה", dst.name); return
    with tempfile.TemporaryDirectory() as td:
        hp, pp = pathlib.Path(td) / "c.html", pathlib.Path(td) / "c.png"
        hp.write_text(html_text, encoding="utf-8")
        subprocess.run([exe, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1", "--virtual-time-budget=6000",
                        "--user-data-dir=" + str(pathlib.Path(td) / "p"), "--window-size=" + size, "--screenshot=" + str(pp), hp.as_uri()],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=90)
        if not pp.exists():
            log("⚠️ הצילום נכשל:", dst.name); return
        Image.open(pp).convert("RGB").save(dst, quality=86, optimize=True)
    log("תמונה:", dst.name, os.path.getsize(dst) // 1024, "KB")


MSG = """בשמחה! הכנתי לכם דף קצר עם שלוש האפשרויות, כולל איך כל אחת תיראה בלוגו של {name}:
{link}

בקצרה:
• 290 ₪ – כלי אחד נוסף בלוגו שלכם (דף מבצעים, שלט QR להדפסה או כרטיס ביקור דיגיטלי)
• 590 ₪ – שלושתם יחד + דוח חודשי. הכי משתלם
• 990 ₪ – הכול + דף עסק שמחבר את הכול בקישור אחד

תשלום חד-פעמי, החזר מלא תוך 14 יום. והתפריט שכבר קיבלתם נשאר שלכם בחינם בכל מקרה.
קחו את הזמן, ואם יש שאלה אני כאן.

מיזם חסד, בלי כוונת רווח.
גילעד"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug"); ap.add_argument("--kind", choices=sorted(OFFERS)); ap.add_argument("--no-card", action="store_true")
    a = ap.parse_args()
    sys.exit(build(a.slug, a.kind, not a.no_card))


if __name__ == "__main__":
    main()
