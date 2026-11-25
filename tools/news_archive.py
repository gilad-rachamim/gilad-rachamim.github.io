# -*- coding: utf-8 -*-
"""ארכיון "החדשות ב-3 דקות" – דף קבוע לכל יום (תוכנית העצמת החדשות, צעד 2, 18.11.2026).

1. מושך את /history משרת kelim-news (21 המהדורות האחרונות = שבוע) ושומר כל מהדורה
   בקובץ יומי: tools/data/chadashot-archive/YYYY-MM-DD.json (בריפו, לא בשרת – חינם ולתמיד).
2. כותב דפי מקור ל-build.py:
   src/pages/kelim/machshev/chadashot/archion/index.html          – "סיכום החדשות היום" + כל הימים
   src/pages/kelim/machshev/chadashot/archion/YYYY-MM-DD/index.html – "סיכום חדשות יומי" ליום אחד
   הביטויים מהמחקר: ~/.claude/state/kelim-seo/runs/2026-11-18-chadashot-archive/

רץ כל ערב ב-GitHub Action (.github/workflows/news-archive.yml), ואפשר גם ידנית:
  python tools/news_archive.py            # משיכה + דפים
  python tools/news_archive.py --no-fetch # רק דפים מהקבצים הקיימים
"""
import datetime, html, json, pathlib, re, sys, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "tools" / "data" / "chadashot-archive"
OUT = ROOT / "src" / "pages" / "kelim" / "machshev" / "chadashot" / "archion"
API = "https://kelim-news.gilad4049.workers.dev/history"
BASE_URL = "/kelim/machshev/chadashot/archion/"
NEWS_URL = "/kelim/machshev/chadashot/"
BRAND = " | הכלים של גילעד רחמים"
SECS = [("main", "העיקר"), ("haredi", "ציבור חרדי"), ("economy", "כלכלה וכיס"), ("good", "חדשות טובות מהשבוע")]
ED_LABEL = {"בוקר": "מהדורת הבוקר", "צהריים": "מהדורת הצהריים", "ערב": "מהדורת הערב"}
SITE = "https://hakelim.com"
FEED = ROOT / "kelim" / "machshev" / "chadashot" / "feed.xml"
NEWS_MAP = ROOT / "news-sitemap.xml"
MONTHS = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"]
esc = lambda s: html.escape(str(s or ""), quote=False)
attr = lambda s: html.escape(str(s or ""), quote=True)

try:
    from zoneinfo import ZoneInfo
    TZ = ZoneInfo("Asia/Jerusalem")
except Exception:  # Windows בלי tzdata: המהדורות יוצאות 07/13/20, אז +2 תמיד נותן את אותו יום
    TZ = datetime.timezone(datetime.timedelta(hours=2))


def local_day(at):
    t = datetime.datetime.fromisoformat(at.replace("Z", "+00:00"))
    return t.astimezone(TZ).date().isoformat()


def clean(e):
    secs = {k: [{"text": p.get("text", ""), "sources": [{"name": s.get("name", ""), "link": s.get("link", "")}
                                                         for s in (p.get("sources") or [])][:3]}
                for p in (e.get("sections") or {}).get(k, []) if p.get("text")]
            for k, _ in SECS}
    return {"name": e.get("name", ""), "time": e.get("time", ""), "at": e["at"], "mode": e.get("mode", ""),
            "date": e.get("date") or {}, "sections": secs}


def fetch_and_store():
    req = urllib.request.Request(API, headers={"User-Agent": "kelim-news-archive"})
    hist = json.loads(urllib.request.urlopen(req, timeout=60).read().decode("utf-8"))
    DATA.mkdir(parents=True, exist_ok=True)
    added = 0
    for e in hist:
        if not e.get("at") or not any((e.get("sections") or {}).get(k) for k, _ in SECS):
            continue
        day = local_day(e["at"])
        f = DATA / f"{day}.json"
        cur = json.loads(f.read_text(encoding="utf-8")) if f.exists() else {"day": day, "editions": []}
        new = clean(e)
        old = next((x for x in cur["editions"] if x["name"] == new["name"]), None)
        if old and old["mode"] == "summary" and new["mode"] != "summary":
            continue  # לא מחליפים סיכום טוב בגיבוי של כותרות
        if old == new:
            continue
        cur["editions"] = [x for x in cur["editions"] if x["name"] != new["name"]] + [new]
        cur["editions"].sort(key=lambda x: x["at"])
        f.write_text(json.dumps(cur, ensure_ascii=False, indent=1) + "\n", encoding="utf-8", newline="\n")
        added += 1
    print(f"history: {len(hist)} editions, {added} new/updated")


def load_days():
    days = []
    for f in sorted(DATA.glob("????-??-??.json")):
        d = json.loads(f.read_text(encoding="utf-8"))
        if d.get("editions"):
            days.append(d)
    return days


def nice_date(day):
    y, m, d = map(int, day.split("-"))
    return f"{d}.{m}.{y}"


def day_name(d):
    n = (d["editions"][0].get("date") or {}).get("day", "")
    return ("יום " + n) if n and n != "שבת" else ("מוצאי שבת" if n == "שבת" else "")


def heb_date(d):
    return (d["editions"][0].get("date") or {}).get("he", "")


def points(d):
    return sum(len(e["sections"].get(k, [])) for e in d["editions"] for k, _ in SECS)


def edition_html(e, hlevel=2):
    label = ED_LABEL.get(e["name"], e["name"])
    h = f'<section class="ar-ed"><h{hlevel} class="ar-ed-h">{esc(label)} <small>{esc(e["time"])}</small></h{hlevel}>'
    if e["mode"] != "summary":
        h += '<p class="ar-note">במהדורה הזו הסיכום לא נוצר בזמן, ולכן מופיעות הכותרות עצמן מהאתרים.</p>'
    for k, name in SECS:
        items = e["sections"].get(k) or []
        if not items:
            continue
        h += f'<h{hlevel + 1} class="ar-sec">{esc(name)}</h{hlevel + 1}><ol class="nw-list">'
        for p in items:
            src = " · ".join(f'<a href="{attr(s["link"])}" rel="nofollow noopener" target="_blank">{esc(s["name"])}</a>'
                             for s in p["sources"] if s.get("link"))
            h += f'<li>{esc(p["text"])}' + (f'<span class="nw-src">מקור: {src}</span>' if src else "") + "</li>"
        h += "</ol>"
    return h + "</section>"


STYLE = ('<link rel="stylesheet" href="/assets/seo-txt.css"><style>'
         '.ar-nav{display:flex;flex-wrap:wrap;gap:.5rem .9rem;margin:.2rem 0 1.1rem}.ar-nav a{border:1px solid var(--line);border-radius:99px;padding:.35rem .9rem;color:var(--cream);text-decoration:none}'
         '.ar-ed{margin:0 0 1.4rem}.ar-ed-h{font-family:var(--serif);color:var(--gold);font-size:1.3rem;margin:1.2rem 0 .3rem}.ar-ed-h small{color:var(--muted);font-size:.9rem;font-family:inherit}'
         '.ar-sec{font-size:1.02rem;color:var(--cream);margin:.8rem 0 .4rem}.ar-note{color:var(--muted);font-size:.92rem;margin:.2rem 0 .5rem}'
         '.nw-list{list-style:none;margin:0;padding:0;counter-reset:n}.nw-list li{counter-increment:n;position:relative;padding:.7rem .9rem .65rem 2.6rem;padding-inline:2.6rem .9rem;border:1px solid var(--line);border-radius:12px;margin:0 0 .5rem;line-height:1.6;color:var(--body)}'
         '.nw-list li::before{content:counter(n);position:absolute;inset-inline-start:.75rem;top:.72rem;width:1.45rem;height:1.45rem;border-radius:50%;background:var(--gold);color:#1a1405;font-weight:700;font-size:.85rem;display:flex;align-items:center;justify-content:center}'
         '.nw-src{display:block;margin-top:.25rem;font-size:.86rem;color:var(--muted)}.nw-src a{color:var(--muted)}'
         '.ar-days{list-style:none;margin:0;padding:0}.ar-days li{border-bottom:1px solid var(--line);padding:.6rem 0}.ar-days a{color:var(--cream);font-weight:700}.ar-days span{display:block;color:var(--muted);font-size:.92rem;margin-top:.15rem}'
         '.ar-month{font-family:var(--serif);color:var(--gold);font-size:1.15rem;margin:1.2rem 0 .3rem}.ar-cta{border:1px solid var(--gold-soft);border-radius:14px;padding:.9rem 1rem;margin:1.2rem 0}'
         '@media print{.topbar,.site-foot,.crumbs,.no-print{display:none!important}}</style>')

FAQ = [
    ("מה זה סיכום החדשות היומי?", "כל החדשות של יום אחד בדף אחד: שלוש מהדורות קצרות (בוקר, צהריים וערב), חמש נקודות עיקריות בכל אחת, ועוד נקודות לציבור החרדי ולכלכלה. כל נקודה עם קישור למקור."),
    ("מתי יוצא הסיכום?", "בשבע בבוקר, באחת בצהריים ובשמונה בערב. בשבת ובחג לא יוצא כלום, ובמוצאי שבת יוצא \"מה היה בשבת\"."),
    ("איך מוצאים סיכום חדשות של תאריך מסוים?", "בדף הארכיון יש רשימה של כל הימים לפי חודשים. לוחצים על התאריך ורואים את כל המהדורות של אותו יום."),
    ("מאיפה החדשות?", "מכותרות ותקצירים של אתרי חדשות כלליים וחרדיים – ynet, וואלה, מעריב, ערוץ 7, ערוץ 14, כיכר השבת, בחדרי חרדים, JDN וגלובס. כל נקודה נכתבת מחדש ונבדקת מול המקור."),
    ("אפשר לשמוע את החדשות בטלפון כשר?", "כן. מחייגים 077-2253345 ומקישים 8, ושומעים את המהדורה האחרונה בקול."),
    ("זה עולה כסף או צריך להירשם?", "לא. בחינם, בלי הרשמה ובלי פרסומות – מיזם חסד."),
    ("אפשר לשלוח לחבר סיכום של יום מסוים?", "כן. לכל יום יש כתובת קבועה משלו. מעתיקים את הקישור מהדפדפן ושולחים בווטסאפ או במייל, והוא יישאר זמין גם בעוד שנה."),
    ("למה אין פה פשע, רכילות וספורט?", "הסיכום שומר על קו נקי ורגוע: בלי פשע ופריצות, בלי רכילות, בלי ספורט ובידור ובלי תמונות, כדי שאפשר יהיה לקרוא אותו בכל בית."),
]


def faq_ld():
    return ('<script type="application/ld+json">' + json.dumps({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQ]}, ensure_ascii=False) + "</script>")


def seo_text(kind):
    first = ("<p>בדף הזה מופיעות כל המהדורות של יום אחד. כל נקודה כתובה במשפט אחד או שניים, במילים פשוטות, ומתחתיה קישור לכתבה המלאה. "
             "מי שרוצה לדעת מה קרה ביום מסוים – נכנס, קורא בשלוש דקות, ויודע.</p>") if kind == "day" else (
             "<p>בראש הדף מופיע סיכום החדשות של היום – כל המהדורות שיצאו עד עכשיו. מתחתיו הארכיון: כל הימים לפי תאריך, "
             "כדי שאפשר יהיה לחזור ליום מסוים ולראות מה קרה בו. כל יום הוא דף קבוע, שאפשר לשמור ולשלוח.</p>")
    faq = "".join(f"<details><summary>{esc(q)}</summary><p>{esc(a)}</p></details>" for q, a in FAQ)
    return f'''<!--seo-txt-->
<section class="k-sec seo-txt" aria-labelledby="seo-h">
  <h2 id="seo-h">סיכום חדשות יומי, קצר ורגוע</h2>
  {first}
  <h3>שלוש מהדורות ביום, ולא יותר</h3>
  <p>בשבע בבוקר, באחת בצהריים ובשמונה בערב יוצא סיכום של חמש נקודות עיקריות, ואחריהן נקודות קצרות לציבור החרדי ולכלכלה. במקום לרפרש אתרי חדשות כל רבע שעה, נכנסים שלוש פעמים ביום ויודעים מה חשוב באמת. בשבת ובחג לא יוצא כלום, ובמוצאי שבת יוצא סיכום אחד של מה שהיה.</p>
  <h3>איך נבחרות הנקודות</h3>
  <p>המערכת קוראת את הכותרות והתקצירים של אתרי החדשות הגדולים, כלליים וחרדיים, ובוחרת את מה שהכי הרבה אתרים מדווחים עליו. כל נקודה נכתבת מחדש במילים שלנו, ואז נבדקת פעם שנייה מול הכתבה המקורית: שם, מספר או פרט שלא כתוב במקור – והנקודה יורדת. כך הסיכום נשאר קצר ונאמן למקור.</p>
  <h3>איך לקרוא את הסיכום של היום</h3>
  <p>מתחילים מ"העיקר": חמש הנקודות הראשונות הן מה שהכי הרבה אתרים דיווחו עליו באותה שעה. אחר כך "ציבור חרדי" – מה שקרה בקהילה, בישיבות ובמוסדות – ו"כלכלה וכיס", עם מה שנוגע לכסף של המשפחה: מחירים, משכורות, מסים והטבות. רוצים לדעת יותר על נקודה מסוימת? לוחצים על שם האתר שמתחתיה ומגיעים לכתבה המלאה. ביום שישי יוצאות רק מהדורת הבוקר והצהריים, ובמוצאי שבת יוצאת מהדורה אחת גדולה של כל מה שהיה בשבת.</p>
  <h3>קו כשר ונקי</h3>
  <p>בלי פשע ופריצות, בלי רכילות, בלי ספורט ובידור ובלי תמונות. בלי כותרות מפחידות ובלי "דחוף" כל חמש דקות. הסיכום מתאים לכל הבית, ולמי שרוצה להתעדכן בלי להיגרר לגלילה של שעה.</p>
  <h3>גם בטלפון כשר ובלי אינטרנט</h3>
  <p>את המהדורה האחרונה אפשר לשמוע בקול בכל טלפון, גם כשר: מחייגים 077-2253345 ומקישים 8 (<a class="gold" href="{NEWS_URL}telefon-kasher/">חדשות לטלפון כשר – מתי מתעדכן ומה נכלל</a>). אפשר גם לקבל התראה לטלפון שלוש פעמים ביום, להצטרף לערוץ הווטסאפ או לעקוב בפייסבוק – הכול מתוך <a class="gold" href="{NEWS_URL}">הדף של החדשות ב-3 דקות</a>.</p>
  <h3>למה ארכיון לפי תאריך</h3>
  <p>לפעמים רוצים לדעת מה קרה ביום מסוים: אחרי חופשה, אחרי אשפוז, אחרי שבוע עמוס או בשביל עבודה. בארכיון כל יום נשמר כדף קבוע, עם התאריך העברי והלועזי, ואפשר לעבור ליום הקודם או הבא בלחיצה.</p>
  <h3>בחינם, בלי הרשמה ובלי פרסומות</h3>
  <p>האתר נבנה כמיזם חסד. אין פרסומות, אין איסוף פרטים ואין צורך להירשם. רוצים לעזור? שלחו את הדף לחבר, או תלו בבית הכנסת את <a class="gold" href="{NEWS_URL}moda/">המודעה המוכנה להדפסה</a>. ועוד כלים חינמיים: <a class="gold" href="/kelim/machshev/">מחשב וטלפון</a>, <a class="gold" href="/kelim/">כל הכלים</a>.</p>
</section>
<section class="k-sec seo-faq" aria-labelledby="seo-faq-h">
  <h2 id="seo-faq-h">שאלות ותשובות</h2>
  {faq}
</section>
<!--/seo-txt-->'''


def cta():
    return (f'<div class="ar-cta no-print"><b>רוצים את הסיכום הבא?</b> הוא יוצא ב-07:00, 13:00 ו-20:00. '
            f'<a class="gold" href="{NEWS_URL}?utm_source=archive">למהדורה האחרונה ←</a> · '
            f'<a class="gold" href="{NEWS_URL}?utm_source=archive#nw-push">לקבל התראה</a></div>')


def meta_block(meta):
    return "<!--meta " + json.dumps(meta, ensure_ascii=False, indent=1) + " -->\n"


def crumbs(last):
    c = [["מחשב וטלפון", "/kelim/machshev/"], ["החדשות ב-3 דקות", NEWS_URL]]
    return c + ([["ארכיון", BASE_URL], [last, None]] if last else [["ארכיון הסיכומים", None]])


def news_ld(d):
    """סכמת NewsArticle לדף יום (לחיפוש חדשות ולתוצאות עשירות)"""
    first, last = d["editions"][0]["at"], d["editions"][-1]["at"]
    nd = nice_date(d["day"])
    dn = day_name(d)
    return ('<script type="application/ld+json">' + json.dumps({
        "@context": "https://schema.org", "@type": "NewsArticle",
        "mainEntityOfPage": {"@type": "WebPage", "@id": f"{SITE}{BASE_URL}{d['day']}/"},
        "headline": f"סיכום חדשות יומי: {dn + ', ' if dn else ''}{nd}",
        "description": f"{points(d)} נקודות קצרות ורגועות מ-{len(d['editions'])} מהדורות של {nd}, עם קישור למקור.",
        "datePublished": first, "dateModified": last, "inLanguage": "he",
        "image": [f"{SITE}/og/kelim-machshev-chadashot.jpg"],
        "author": {"@type": "Organization", "name": "החדשות ב-3 דקות", "url": SITE + NEWS_URL},
        "publisher": {"@type": "Organization", "name": "הכלים של גילעד רחמים", "url": SITE + "/kelim/"},
    }, ensure_ascii=False) + "</script>")


def rfc822(at):
    t = datetime.datetime.fromisoformat(at.replace("Z", "+00:00")).astimezone(datetime.timezone.utc)
    return t.strftime("%a, %d %b %Y %H:%M:%S +0000")


def write_feed(days):
    """RSS: כל מהדורה היא פריט (30 האחרונות); בנוסף מפת אתר חדשותית ל-48 השעות האחרונות"""
    eds = sorted(((e["at"], d, e) for d in days for e in d["editions"]), key=lambda x: x[0], reverse=True)
    items = []
    for at, d, e in eds[:30]:
        link = f"{SITE}{BASE_URL}{d['day']}/"
        body = "".join(f"<p><b>{esc(name)}</b></p><ol>" + "".join(f"<li>{esc(p['text'])}</li>" for p in e["sections"].get(k, [])) + "</ol>"
                       for k, name in SECS if e["sections"].get(k))
        dn = day_name(d)
        title = f"{ED_LABEL.get(e['name'], e['name'])} – {dn + ', ' if dn else ''}{nice_date(d['day'])}"
        items.append(f"<item><title>{esc(title)}</title><link>{link}#{e['time'].replace(':', '')}</link>"
                     f'<guid isPermaLink="false">kelim-news-{d["day"]}-{e["time"]}</guid><pubDate>{rfc822(at)}</pubDate>'
                     f"<description><![CDATA[{body}]]></description></item>")
    nl = chr(10)
    xml = ('<?xml version="1.0" encoding="UTF-8"?>' + nl + '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>'
           "<title>החדשות ב-3 דקות</title>"
           f'<link>{SITE}{NEWS_URL}</link><atom:link href="{SITE}{NEWS_URL}feed.xml" rel="self" type="application/rss+xml"/>'
           "<description>סיכום חדשות רגוע 3 פעמים ביום, בנקודות קצרות עם קישור למקור. מיזם חסד, בלי כוונת רווח.</description>"
           f"<language>he</language><lastBuildDate>{rfc822(eds[0][0])}</lastBuildDate>" + "".join(items) + "</channel></rss>" + nl)
    FEED.write_text(xml, encoding="utf-8", newline="\n")
    cut = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=48)
    recent = [x for x in eds if datetime.datetime.fromisoformat(x[0].replace("Z", "+00:00")) > cut]
    urls = "".join(f"<url><loc>{SITE}{BASE_URL}{d['day']}/</loc><news:news><news:publication><news:name>החדשות ב-3 דקות</news:name>"
                   f"<news:language>he</news:language></news:publication><news:publication_date>{at}</news:publication_date>"
                   f"<news:title>{esc(ED_LABEL.get(e['name'], e['name']))} – {nice_date(d['day'])}</news:title></news:news></url>"
                   for at, d, e in recent)
    NEWS_MAP.write_text('<?xml version="1.0" encoding="UTF-8"?>' + nl + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
                        'xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">' + urls + "</urlset>" + nl, encoding="utf-8", newline="\n")
    print(f"feed: {len(items)} items, news-sitemap: {len(recent)} urls")



def day_page(d, prev, nxt):
    day, nd = d["day"], nice_date(d["day"])
    dn, hd = day_name(d), heb_date(d)
    eds = " · ".join(ED_LABEL.get(e["name"], e["name"]).replace("מהדורת ה", "") for e in d["editions"])
    title = f"סיכום חדשות יומי – {dn + ', ' if dn else ''}{nd}" + (f" ({hd})" if hd else "")
    if len(title) > 64:
        title = f"סיכום חדשות יומי – {dn + ', ' if dn else ''}{nd}"
    desc = (f"סיכום חדשות יומי ל{dn + ' ' if dn else ''}{nd}: {len(d['editions'])} מהדורות ({eds}), "
            f"{points(d)} נקודות קצרות עם קישור למקור. בחינם, בלי הרשמה ובלי פרסומות.")
    meta = {"site": "kelim", "nav": "tchumim", "tool": "machshev_chadashot", "title": title + BRAND, "description": desc,
            "og_title": f"מה קרה ב-{nd}? סיכום החדשות של היום ב-3 דקות", "og_image": "og/kelim-machshev-chadashot.jpg?v=4",
            "priority": "0.5", "no_precache": True, "no_rel": True, "no_mapa": True, "crumbs": crumbs(nd),
            "head": STYLE + faq_ld() + news_ld(d)}
    nav = []
    if prev:
        nav.append(f'<a href="{BASE_URL}{prev}/">→ {nice_date(prev)}</a>')
    nav.append(f'<a href="{BASE_URL}">כל הימים</a>')
    if nxt:
        nav.append(f'<a href="{BASE_URL}{nxt}/">{nice_date(nxt)} ←</a>')
    nav.append(f'<a href="{NEWS_URL}?utm_source=archive">המהדורה האחרונה</a>')
    body = (f'<header class="k-hero">\n  <h1>סיכום חדשות יומי: {esc(dn + ", " if dn else "")}{nd}</h1>\n'
            f'  <p class="sub">{esc(hd)}{" · " if hd else ""}{len(d["editions"])} מהדורות, {points(d)} נקודות קצרות ורגועות. כל מה שחשוב ביום אחד, בשלוש דקות קריאה.</p>\n</header>\n'
            f'<div class="tool">\n<nav class="ar-nav no-print" aria-label="ימים">{"".join(nav)}</nav>\n'
            + "".join(edition_html(e) for e in d["editions"]) + "\n" + cta() + "\n</div>\n")
    return meta_block(meta) + body + seo_text("day") + "\n"


def hub_page(days):
    last = days[-1]
    meta = {"site": "kelim", "nav": "tchumim", "tool": "machshev_chadashot",
            "title": "סיכום החדשות היום – וארכיון סיכומי חדשות לפי תאריך" + BRAND,
            "description": "סיכום החדשות היום בנקודות קצרות ורגועות, וארכיון של כל הימים לפי תאריך: בוקר, צהריים וערב, עם קישור למקור. בחינם, בלי הרשמה ובלי פרסומות.",
            "og_title": "סיכום החדשות היום, וכל הימים הקודמים לפי תאריך", "og_image": "og/kelim-machshev-chadashot.jpg?v=4",
            "priority": "0.7", "no_precache": True, "crumbs": crumbs(None), "head": STYLE + faq_ld()}
    dn, nd = day_name(last), nice_date(last["day"])
    body = ('<header class="k-hero">\n  <h1>סיכום החדשות היום, וארכיון לפי תאריך</h1>\n'
            '  <p class="sub">כל המהדורות של היום בנקודות קצרות ורגועות, ומתחת – כל הימים הקודמים. שלוש פעמים ביום: 07:00, 13:00 ו-20:00.</p>\n</header>\n'
            f'<div class="tool">\n<h2 class="ss-h2">היום האחרון: {esc(dn + ", " if dn else "")}<a class="gold" href="{BASE_URL}{last["day"]}/">{nd}</a></h2>\n'
            + "".join(edition_html(e, 3) for e in last["editions"]) + "\n" + cta() + '\n<h2 class="ss-h2" id="kol-hayamim">כל הימים לפי תאריך</h2>\n')
    by_month = {}
    for d in reversed(days):
        y, m, _ = d["day"].split("-")
        by_month.setdefault((y, m), []).append(d)
    for (y, m), ds in by_month.items():
        body += f'<h3 class="ar-month">{MONTHS[int(m) - 1]} {y}</h3><ul class="ar-days">'
        for d in ds:
            first = next((p["text"] for e in d["editions"] for p in e["sections"].get("main", [])), "")
            first = first if len(first) <= 90 else first[:90].rsplit(" ", 1)[0] + "…"
            dn2, hd2 = day_name(d), heb_date(d)
            body += (f'<li><a href="{BASE_URL}{d["day"]}/">{esc(dn2 + ", " if dn2 else "")}{nice_date(d["day"])}</a>'
                     f' <small>{esc(hd2)} · {len(d["editions"])} מהדורות</small><span>{esc(first)}</span></li>')
        body += "</ul>"
    body += "\n</div>\n"
    return meta_block(meta) + body + seo_text("hub") + "\n"


def write_pages():
    days = load_days()
    if not days:
        sys.exit("אין ימים בארכיון")
    OUT.mkdir(parents=True, exist_ok=True)
    keys = [d["day"] for d in days]
    for i, d in enumerate(days):
        p = OUT / d["day"] / "index.html"
        p.parent.mkdir(exist_ok=True)
        new = day_page(d, keys[i - 1] if i else None, keys[i + 1] if i + 1 < len(keys) else None)
        if not p.exists() or p.read_text(encoding="utf-8") != new:
            p.write_text(new, encoding="utf-8", newline="\n")
    (OUT / "index.html").write_text(hub_page(days), encoding="utf-8", newline="\n")
    write_feed(days)
    print(f"pages: {len(days)} days + hub")


if __name__ == "__main__":
    if "--no-fetch" not in sys.argv:
        fetch_and_store()
    write_pages()
