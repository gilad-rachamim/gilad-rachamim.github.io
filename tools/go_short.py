# -*- coding: utf-8 -*-
"""קישורים קצרים לכל מה שאנשים רואים ושולחים: hakelim.com/go/<קבוצה>/<שם>/ (25.11.2026, גילעד: "קישורים קצרים וברורים").

כל דף: noindex, תצוגה מקדימה (נלקחת מדף היעד), והפניה מיידית ליעד עם תגיות המעקב.
קבוצות: g = קישורים בתוך המדריך להורים (PDF) · m = הודעות המוהלים להורים · v = שליחת מדריך וידאו לחבר.
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


if __name__ == "__main__":
    main()
