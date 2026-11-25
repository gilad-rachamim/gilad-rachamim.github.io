# -*- coding: utf-8 -*-
"""קישורים קצרים לכל מה שאנשים רואים ושולחים: hakelim.com/go/<קבוצה>/<שם>/ (25.11.2026, גילעד: "קישורים קצרים וברורים").

כל דף: noindex, תצוגה מקדימה (נלקחת מדף היעד), והפניה מיידית ליעד עם תגיות המעקב.
קבוצות: g = קישורים בתוך המדריך להורים (PDF) · m = הודעות המוהלים להורים · v = שליחת מדריך וידאו לחבר · e = המיילים האוטומטיים.
קישורים פנימיים באתר נשארים ישירים (דף noindex באמצע פוגע בגוגל).
הרצה: python tools/go_short.py   (אחרי build.py)
"""
import html
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
BASE = "https://hakelim.com"

GUIDE = {  # שם קצר -> נתיב היעד
    "moed": "/mohel/moed/", "herayon": "/kelim/herayon/", "checklist": "/mohel/checklist/", "hazmana": "/mohel/hazmana/",
    "ishurim": "/kelim/eruim/ishurim/", "kibudim": "/kodesh/kibudim-brit/", "dapim": "/mohel/dapim/",
    "hachana": "/mohel/hachana/", "shirim": "/mohel/shirim/", "shemot": "/kelim/shemot/banim/", "kelim": "/kelim/",
    "kartis": "/mohel/kartis/gilad-rachamim-mohel.vcf",
}
SHARE = {  # שליחת המדריך להורים לחבר
    "chaver": "/mohel/madrich/?utm_source=madrich&utm_medium=pdf-share&utm_campaign=madrich-links",
    "zug": "/mohel/madrich/?utm_source=madrich&utm_medium=todah-share&utm_campaign=madrich-links",
}
MOHALIM = {
    "hazmana": "/mohel/hazmana/", "moed": "/mohel/moed/", "checklist": "/mohel/checklist/", "shirim": "/mohel/shirim/",
    "dapim": "/mohel/dapim/", "brachot": "/mohel/hazmana/brachot/", "madrich": "/mohel/madrich/",
    "nusach": "/mohel/hazmana/nusach/", "tekes": "/mohel/hachana/tekes/", "yom": "/mohel/hachana/yom/",
}


def _meta(page, name):
    m = re.search(r'<meta (?:property|name)="%s" content="([^"]*)"' % re.escape(name), page)
    return html.unescape(m.group(1)) if m else ""


def preview(path):
    """כותרת, תיאור ותמונה מדף היעד; לקובץ איש קשר - נוסח קבוע."""
    if path.endswith(".vcf"):
        return ("לשמור את גילעד רחמים המוהל באנשי הקשר", "לחיצה אחת, והמספר שמור אצלכם.", BASE + "/assets/og-madrich.jpg")
    page = (ROOT / path.lstrip("/") / "index.html").read_text(encoding="utf-8")
    title = _meta(page, "og:title") or html.unescape(re.search(r"<title>([^<]*)</title>", page).group(1))
    desc = _meta(page, "og:description") or _meta(page, "description")
    image = _meta(page, "og:image")
    if not (title and desc and image):
        raise SystemExit("חסרה תצוגה מקדימה בדף היעד: " + path)
    return title, desc, image


def write(slug, target):
    path = target.split("?")[0].split("#")[0]
    title, desc, image = preview(path)
    e = lambda s: html.escape(s, quote=True)
    js = json.dumps(target)
    if path.endswith(".vcf"):  # לקובץ אין Google Analytics משלו - מודדים כאן לפני ההפניה
        q = dict(p.split("=") for p in target.split("?")[1].split("&"))
        params = json.dumps({"campaign_source": q["utm_source"], "campaign_medium": q["utm_medium"], "campaign_name": q["utm_campaign"]})
        head = ('<meta http-equiv="refresh" content="2;url=%s">'
                '<script async src="https://www.googletagmanager.com/gtag/js?id=G-4QR4583VST"></script>'
                "<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());"
                "gtag('config','G-4QR4583VST',%s);setTimeout(function(){location.replace(%s)},900)</script>") % (e(target), params, js)
    else:
        head = '<meta http-equiv="refresh" content="0;url=%s"><script>location.replace(%s)</script>' % (e(target), js)
    page = ('<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">'
            '<title>%(t)s</title><meta name="description" content="%(d)s"><link rel="canonical" href="%(c)s">'
            '<meta property="og:type" content="website"><meta property="og:locale" content="he_IL">'
            '<meta property="og:site_name" content="הכלים של גילעד רחמים"><meta property="og:title" content="%(t)s">'
            '<meta property="og:description" content="%(d)s"><meta property="og:image" content="%(i)s">'
            '<meta property="og:url" content="%(u)s"><meta name="twitter:card" content="summary_large_image">%(h)s</head>'
            '<body><p><a href="%(a)s">%(t)s</a></p></body></html>\n') % {
        "t": e(title), "d": e(desc), "c": e(BASE + path), "i": e(image), "u": e("%s/go/%s/" % (BASE, slug)), "h": head, "a": e(target)}
    out = ROOT / "go" / slug / "index.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(page, encoding="utf-8", newline="\n")


# ---------- קישורים במיילים האוטומטיים: hakelim.com/go/e/<שם>/?c=<קוד> ----------
EMAIL = {  # יעד (נתיב או כתובת מלאה) -> שם קצר
    "/mohel/": "mohel", "/mohel/#shira": "shira", "/mohel/madrich/": "madrich",
    "/mohel/madrich/hamadrich-lekrat-huledet-haben.pdf": "pdf", "/mohel/kartis/gilad-rachamim-mohel.vcf": "kartis",
    "/mohel/moed/": "moed", "/mohel/checklist/": "checklist", "/mohel/hazmana/": "hazmana",
    "/mohel/hazmana/?k=zeved": "zeved", "/mohel/hazmana/?k=pidyon": "hazmana-pidyon", "/mohel/shirim/": "shirim",
    "/mohel/hachana/yom/": "yom", "/mohel/hachana/achrei/": "achrei", "/mohel/hachana/pidyon/": "pidyon",
    "/kelim/": "kelim", "/kelim/eruim/ishurim/": "ishurim", "/kelim/shemot/banim/": "shemot",
    "/kelim/yutub-bli-pirsomot/": "yutub", "/kelim/chalufot-chinam/": "chalufot", "/kelim/tamlul/": "tamlul",
    "/claude-kvutza/": "kvutza", "/kelim/claude/kurs/": "kurs-claude", "/kelim/claude/shutafim/": "shutafim",
    "/matana/kelim/asara/": "asara", "/kelim/mismachim-leroe-cheshbon/": "mismachim",
    "/assets/mismachim-leroe-cheshbon.pdf": "mismachim-pdf", "/kelim/mah-magia-leoved-sheputar/": "sheputar",
    "/assets/mah-magia-leoved-sheputar.pdf": "sheputar-pdf", "/assets/mohel-mapat-derech.pdf": "mapa",
    "/kesef/hechzer/": "hechzer", "/kelim/cheshbon/mikdamot/": "mikdamot", "/kesef/bruto-neto/": "neto",
    "/kesef/zchuyot-pitorin/": "zchuyot", "/kesef/pitzuyim-pitorin/": "pitzuyim", "/kesef/pitzuyim-shaati/": "shaati",
    "/kesef/hodaa-mukdemet/": "hodaa", "/kesef/pidyon-chufsha/": "chufsha", "/kesef/dmey-havraa/": "havraa",
    "/kesef/shaot-nosafot/": "shaot", "/kesef/tlush/": "tlush",
    "/esek/tafrit/": "tafrit", "/esek/qr/": "qr", "/esek/tmchur-mana/": "tmchur", "/esek/mivtza/": "mivtza",
    "/esek/hazmana-vatsap/": "vatsap", "/kelim/tochen/": "tochen", "/kelim/tochen/tirgum/": "tirgum",
    "/kelim/tochen/hakraa/": "hakraa", "/kelim/tochen/chaye/": "chaye", "/kelim/tochen/mail/": "nisuach",
    "/kelim/machshev/chatima/": "chatima", "/kelim/machshev/fax/": "fax", "/kelim/machshev/sader/": "sader",
    "/kelim/briut/tizkorot/": "tizkorot", "/kodesh/mohalim/": "mohalim", "/kodesh/kartis-mohel/": "kartis-mohel",
    "/matana/roe/shidrug/": "shidrug-roe", "/matana/orchei-din/shidrug/": "shidrug-din",
    "/matana/esek/shidrug/": "shidrug-esek", "/matana/kelim/shidrug/": "shidrug-kelim",
    "/matana/claude/shidrug/": "shidrug-claude", "/matana/mohel-kurs/shidrug/": "shidrug-mohel",
}
for _id in ("M5xC6", "8utXB", "bPiCF", "kNyeO", "jaDfg", "2sQ9Y", "uYQyE", "08VGv", "DI9mU"):
    EMAIL["https://payhip.com/b/" + _id] = "p-" + _id.lower()
GS = ROOT / "tools" / "leads-apps-script.gs"


def write_email(name, dest):
    """דף אחד לכל יעד; הקוד ב-?c= נפתח בדף לתגיות המעקב (m = המדריך, y = יוטיוב, אחרת קמפיין[.תוכן])."""
    external = dest.startswith("http")
    path = dest.split("?")[0].split("#")[0]
    full = dest if external else BASE + dest
    delay = external or path.endswith((".pdf", ".vcf"))  # ליעד אין Google Analytics - מודדים כאן
    generic = BASE + "/assets/og-madrich.jpg"
    if external:
        title, desc, image = "לפרטים ולרכישה – הכלים של גילעד רחמים", "הדף נפתח ב-Payhip.", generic
    elif path.endswith(".vcf"):
        title, desc, image = preview(path)
    elif path.endswith(".pdf"):
        title, desc, image = "קובץ PDF להורדה – הכלים של גילעד רחמים", "לחיצה אחת והקובץ נפתח.", generic
    else:
        page = (ROOT / path.lstrip("/") / "index.html").read_text(encoding="utf-8")  # בדף בלי תמונת שיתוף - נוסח כללי
        title = _meta(page, "og:title") or html.unescape(re.search(r"<title>([^<]*)</title>", page).group(1))
        desc = _meta(page, "og:description") or _meta(page, "description") or "הכלים של גילעד רחמים, בחינם."
        image = _meta(page, "og:image") or generic
    e = lambda s: html.escape(s, quote=True)
    js = ("var c=new URLSearchParams(location.search).get('c')||'',a=c.split('.'),"
          "p=c==='m'?['madrich','email','madrich-links']:c==='y'?['youtube-guide','email','youtube-bli-pirsomot']"
          ":['email','nurture',a[0]||'mail',a[1]],u=new URL(%s);"
          "['utm_source','utm_medium','utm_campaign','utm_content'].forEach(function(k,i){if(p[i])u.searchParams.set(k,p[i])});") % json.dumps(full)
    if delay:
        js += ("window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());"
               "gtag('config','G-4QR4583VST',{campaign_source:p[0],campaign_medium:p[1],campaign_name:p[2]});"
               "setTimeout(function(){location.replace(u.href)},900)")
    else:
        js += "location.replace(u.href)"
    ga = '<script async src="https://www.googletagmanager.com/gtag/js?id=G-4QR4583VST"></script>' if delay else ""
    page = ('<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">'
            '<title>%(t)s</title><meta name="description" content="%(d)s">'
            '<meta property="og:type" content="website"><meta property="og:locale" content="he_IL">'
            '<meta property="og:site_name" content="הכלים של גילעד רחמים"><meta property="og:title" content="%(t)s">'
            '<meta property="og:description" content="%(d)s"><meta property="og:image" content="%(i)s">'
            '<meta property="og:url" content="%(u)s"><meta name="twitter:card" content="summary_large_image">'
            '<noscript><meta http-equiv="refresh" content="0;url=%(a)s"></noscript>%(g)s<script>%(js)s</script></head>'
            '<body><p><a href="%(a)s">%(t)s</a></p></body></html>\n') % {
        "t": e(title), "d": e(desc), "i": e(image), "u": e("%s/go/e/%s/" % (BASE, name)), "g": ga, "js": js, "a": e(full)}
    out = ROOT / "go" / "e" / name / "index.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(page, encoding="utf-8", newline="\n")


def email_pages():
    if len(set(EMAIL.values())) != len(EMAIL):
        raise SystemExit("שם קצר כפול ב-EMAIL")
    for dest, name in EMAIL.items():
        write_email(name, dest)
    # אותה טבלה בתוך סקריפט הלידים
    block = "var GOE = %s;" % json.dumps(EMAIL, ensure_ascii=False, separators=(",", ":"))
    s = GS.read_bytes().decode("utf-8")
    s, n = re.subn(r"var GOE = \{.*?\};", lambda m: block, s)
    if n != 1:
        raise SystemExit("לא נמצאה var GOE בסקריפט")
    GS.write_bytes(s.encode("utf-8"))
    print(len(EMAIL), "דפי קישור למיילים")


def main():
    pages = {}
    for k, p in GUIDE.items():
        pages["g/" + k] = p + "?utm_source=madrich&utm_medium=pdf&utm_campaign=madrich-links"
    pages.update(SHARE)
    for k, p in MOHALIM.items():
        pages["m/" + k] = p + "?utm_source=mohel_share&utm_medium=whatsapp&utm_campaign=" + k
    videos = json.loads((ROOT / "tools" / "madrichim.json").read_text(encoding="utf-8"))
    for tool, m in videos.items():
        pages["v/" + tool.replace("_", "-")] = m["page"] + "?utm_source=share&utm_medium=madrich#madrich"
    for slug, target in pages.items():
        write(slug, target)
    print(len(pages), "דפי קישור קצר")
    email_pages()


if __name__ == "__main__":
    main()
