#!/usr/bin/env python3
"""בונה את דפי האתר מ-src/pages לתוך שורש המאגר.

כל קובץ ב-src/pages הוא HTML של התוכן בלבד, עם בלוק JSON בראשו בין
<!--meta ... -->. הסקריפט עוטף אותו ב-src/layout.html, מסמן את הדף
הנוכחי בסרגל, מוסיף פירורי לחם ו-CTA, ומייצר sitemap.xml.

הרצה:  python3 build.py
"""
import json, os, re, pathlib, datetime, hashlib
import html as html_lib

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "src" / "pages"
LAYOUT = (ROOT / "src" / "layout.html").read_text(encoding="utf-8")
# תת-אתרים של "הכלים של גילעד רחמים" (meta "site"): תבנית משותפת, ניווט, צבעים ופוטר משלהם.
# דף בלי "site" = אתר המוהל, בדיוק כמו קודם.
LAYOUT_KELIM = (ROOT / "src" / "layout-kelim.html").read_text(encoding="utf-8")
SITES = {
    "kelim": {
        "name": "הכלים של גילעד רחמים", "brand": "מיזם הכלים של גילעד רחמים", "short": "הכלים", "home": "/kelim/", "theme": "#0f1d1c",
        "og": "og-kelim.jpg?v=4", "icon": "kelim",
        "desc": "כלים פשוטים, בחינם, לכל מי שצריך הנגשה",
        "nav": [("tchumim", "/kelim/#tchumim", "התחומים"), ("tamlul", "/kelim/tamlul/", "תמלול"),
                ("kodesh", "/kodesh/", "כלי קודש"), ("rotzim", "/kelim/bakasha/", "רוצים כלי?"),
                ("litmoch", "/kelim/#litmoch", "לתמוך"), ("mi", "/kelim/#mi", "מי אני")],
    },
    "kodesh": {
        "name": "כלי קודש", "short": "כלי קודש", "home": "/kodesh/", "theme": "#0e1628",
        "og": "og-kodesh.jpg?v=4", "icon": "kodesh",
        "desc": "כלים דיגיטליים לאנשי קודש, בחינם",
        "nav": [("rabanim", "/kodesh/#rabanim", "לרבנים"), ("taarichim", "/kodesh/taarichim/", "מחשבון תאריכים"),
                ("mohalim", "/kodesh/mohalim/", "למוהלים"), ("tamlul", "/kelim/tamlul/", "תמלול"),
                ("kelim", "/kelim/", "כל הכלים")],
    },
    # נפש ויום-יום: כלים להלומי קרב, לחרדה ולימים קשים, ולמשפחה שסביבם. כאן לא מרוויחים, תרומה בלבד.
    # כל הכלים עובדים גם בלי אינטרנט (sw.js שומר את כל הדפים), והנתונים נשארים בטלפון (localStorage).
    "nefesh": {
        "name": "נפש ויום-יום", "short": "נפש ויום-יום", "home": "/nefesh/", "theme": "#1b1a24",
        "og": "og-nefesh.jpg", "icon": "nefesh",
        "desc": "כלים שקטים לימים קשים: להלומי קרב, לחרדה, ולמשפחה שסביבם. בחינם.",
        "css": ["/assets/nefesh.css"], "js": ["/assets/nefesh.js"],
        "nav": [("rega", "/nefesh/rega/", "רגע קשה"), ("hayom", "/nefesh/hayom/", "הדבר החשוב"),
                ("koach", "/nefesh/koach/", "מד כוח"), ("yoman", "/nefesh/yoman/", "יומן קול"),
                ("mishpacha", "/nefesh/mishpacha/", "למשפחה"), ("kelim", "/nefesh/#kelim", "כל הכלים")],
    },
    # כלים לעסק קטן: תפריט דיגיטלי עם QR, מודעת מבצע, QR מעוצב וצ'ק-ליסט לפתיחת עסק. הכול בטלפון, בלי שרת.
    "esek": {
        "name": "כלים לעסק קטן", "short": "כלים לעסק", "home": "/esek/", "theme": "#1c1712",
        "og": "og-esek.jpg?v=4", "icon": "esek",
        "desc": "כלים חינמיים לעסק קטן: תפריט בקישור ו-QR, מודעת מבצע, QR מעוצב וצ'ק-ליסט לפתיחת עסק",
        "css": ["/assets/esek.css"],
        "nav": [("tafrit", "/esek/tafrit/", "תפריט ו-QR"), ("mivtza", "/esek/mivtza/", "מודעת מבצע"),
                ("qr", "/esek/qr/", "QR מעוצב"), ("ptiha", "/esek/ptiha/", "פתיחת עסק"), ("tfutsa", "/esek/tfutsa/", "תפוצה ללקוחות"), ("seo", "/esek/seo/", "בדיקת SEO"), ("kelim", "/kelim/", "כל הכלים")],
    },
    # משפחה ובית: קניות, תורנויות, שבת ואורחים, מי מביא מה. בלי שרת: הנתונים בטלפון (localStorage),
    # ושיתוף עם אחרים דרך ווטסאפ וקישור שמכיל את המצב (#d=...).
    "bait": {
        "name": "כלים למשפחה ולבית", "short": "משפחה ובית", "home": "/bait/", "theme": "#1f1915",
        "og": "og-bait.jpg?v=4", "icon": "bait",
        "desc": "קניות, תורנויות, שבת ואורחים ומי מביא מה. בחינם, בלי הרשמה.",
        "css": ["/assets/bait.css"], "js": ["/assets/bait.js"],
        "nav": [("kniyot", "/bait/kniyot/", "קניות"), ("toranut", "/bait/toranut/", "תורנויות"),
                ("shabat", "/bait/shabat/", "שבת ואורחים"), ("mevi", "/bait/mevi/", "מי מביא מה"),
                ("kelim", "/kelim/", "כל הכלים")],
    },
    # כלים לכסף: מחשבונים בלבד, לא ייעוץ. הכול בטלפון (localStorage), בלי שרת.
    "kesef": {
        "name": "כלים לכסף", "short": "כלים לכסף", "home": "/kesef/", "theme": "#11201a",
        "og": "og-kesef.jpg?v=4", "icon": "kesef",
        "desc": "מחשבונים פשוטים לכסף של הבית: תקציב, הלוואה, מנויים וחיסכון עם הילדים. בחינם.",
        "css": ["/assets/kesef.css"], "js": ["/assets/kesef.js"],
        "nav": [("taktziv", "/kesef/taktziv/", "תקציב"), ("halvaa", "/kesef/halvaa/", "הלוואה"),
                ("hechzer", "/kesef/hechzer/", "החזר מס"), ("yeladim", "/kesef/yeladim/", "חיסכון לילדים"),
                ("kelim", "/kesef/#kelim", "כל הכלים")],
    },
    # כלים ללימודים: כרטיסיות חזרה, מתכנן למבחן, טיימר למידה, לימוד יומי לסיום. הכול בטלפון (localStorage), בלי שרת.
    "limudim": {
        "name": "כלים ללימודים", "short": "כלים ללימודים", "home": "/limudim/", "theme": "#141c2b",
        "og": "og-limudim.jpg?v=4", "icon": "limudim",
        "desc": "כלים פשוטים ללמידה: כרטיסיות חזרה, תוכנית למבחן, טיימר, ולימוד יומי לסיום התנ״ך והמשנה. בחינם.",
        "css": ["/assets/limudim.css"], "js": ["/assets/limudim.js"],
        "nav": [("kartisiot", "/limudim/kartisiot/", "כרטיסיות"), ("mivchan", "/limudim/mivchan/", "למבחן"),
                ("timer", "/limudim/timer/", "טיימר"), ("yomi", "/limudim/yomi/", "לימוד יומי"), ("olami", "/limudim/olami/", "הדף היומי"), ("ilui", "/limudim/ilui/", "לעילוי נשמה"), ("kvutza", "/limudim/kvutza/", "בקבוצה"), ("matematika", "/limudim/matematika/", "מתמטיקה"), ("machshevon", "/limudim/machshevon/", "מחשבון"), ("maslul", "/limudim/maslul/", "המסלול שלי"), ("kahoot", "/limudim/kahoot/", "חידון Kahoot"),
                ("kelim", "/kelim/", "כל הכלים")],
    },
}
SPRITE =(ROOT / "assets" / "icons.svg").read_text(encoding="utf-8")
BASE = "https://hakelim.com"
# מעבר לכתובת משלנו: כשמשנים את BASE לכתובת חדשה (למשל "https://hakelim.com"), כל דף מקבל סקריפט קטן בראש:
# מי שנכנס לכתובת הישנה מועבר לאותו דף בכתובת החדשה, יחד עם הנתונים שהכלים שמרו אצלו בדפדפן (localStorage),
# כי נתונים כאלה נשמרים לפי כתובת האתר ולא עוברים לבד. הנתונים עוברים בחלק ה-# של הכתובת (לא נשלח לשום שרת)
# ונמחקים ממנה מיד. בכתובת החדשה לא דורסים מפתח שכבר קיים. כל עוד BASE היא הכתובת הישנה, אין סקריפט.
# (התמונה assets/mig-ready.png קיימת רק מהגרסה שיודעת לקלוט את הנתונים, כך שלא מעבירים לעותק ישן.)
# לפני ההעברה הדף הישן טוען תמונה קטנה מהכתובת החדשה: אם היא לא נטענת (סינון אינטרנט שעוד לא מכיר את הכתובת,
# או תעודת אבטחה שעוד לא מוכנה), הגולש נשאר בכתובת הישנה והכול ממשיך לעבוד לו שם.
OLD_HOST = "gilad-rachamim.github.io"
MIGRATE_JS = """<script>(function(){var N="__NEW__",O="__OLD__",L=location,k;function go(){try{var d={},n=0,ks=[],i,v,e;for(i=0;i<localStorage.length;i++)ks.push(localStorage.key(i));ks.sort(function(a,b){return localStorage.getItem(a).length-localStorage.getItem(b).length});for(i=0;i<ks.length;i++){k=ks[i];v=localStorage.getItem(k);e=encodeURIComponent(k).length+encodeURIComponent(v).length+12;if(n+e>1400000)continue;d[k]=v;n+=e}L.replace(N+L.pathname+L.search+(ks.length?"#__mig="+encodeURIComponent(JSON.stringify({d:d,h:L.hash})):L.hash))}catch(x){L.replace(N+L.pathname+L.search+L.hash)}}try{if(L.hostname===O){var im=new Image(),t=setTimeout(function(){im.onload=null},5000);im.onload=function(){clearTimeout(t);go()};im.src=N+"/assets/mig-ready.png?p="+Date.now()}else if(L.hash.indexOf("#__mig=")===0){var o=JSON.parse(decodeURIComponent(L.hash.slice(7)));for(k in o.d)if(localStorage.getItem(k)===null)localStorage.setItem(k,o.d[k]);history.replaceState(null,"",L.pathname+L.search+(o.h||""))}}catch(x){}})();</script>"""
MIGRATE = "" if BASE == "https://" + OLD_HOST else MIGRATE_JS.replace("__NEW__", BASE).replace("__OLD__", OLD_HOST)
# מזהה Google Analytics 4 (G-XXXXXXXXXX). ריק = בלי מעקב.
GA_ID = "G-4QR4583VST"
# כתובת ה-Web App של צינור הלידים (tools/leads-apps-script.gs, פריסה כ-Web app).
LEAD_ENDPOINT = "https://script.google.com/macros/s/AKfycbxgWe4xxaclqfzmOD_E0hOg2XDr2genZZyvAcf0hpHw_AHkgvQAqDop-XjdURdARYNx-Q/exec"
GA = "" if not GA_ID else f"""<script async src="https://www.googletagmanager.com/gtag/js?id={GA_ID}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}gtag('js',new Date());gtag('config','{GA_ID}');</script>
<script src="/assets/track.js" defer></script>
"""
# קישור קצר בכל שיתוף מהאתר (assets/kishur.js): ווטסאפ, SMS, שיתוף בטלפון, העתקה
KISHUR = '<script src="/assets/kishur.js" defer></script>\n'
WA_TEXT = "שלום גילעד, אשמח לשמוע פרטים על ברית מילה"

from urllib.parse import quote
WA = "https://wa.me/972584049049?text=" + quote(WA_TEXT)

# כתובת המייל לכפתור "או במייל" לא כתובה בקוד (14.11.2026): היא נקראת ממשתנה הסביבה SITE_CONTACT_EMAIL,
# או מהקובץ ~/.config/hakelim/contact_email.txt. שניהם נוצרים פעם אחת בקובץ "בניית אתר הכלים.bat" שעל שולחן העבודה.
def _contact_mail():
    v = os.environ.get("SITE_CONTACT_EMAIL", "").strip()
    f = pathlib.Path.home() / ".config" / "hakelim" / "contact_email.txt"
    if not v and f.exists():
        v = f.read_text(encoding="utf-8").strip()
    if not v:
        raise SystemExit("חסרה כתובת המייל לאתר: מגדירים את SITE_CONTACT_EMAIL או את ~/.config/hakelim/contact_email.txt")
    return v
CONTACT_MAIL = _contact_mail()

CTA = """
<section id="contact" class="contact" aria-labelledby="contact-h">
  <div class="wrap">
    <h2 id="contact-h">לברית מיוחדת ומלאת שמחה</h2>
    <p>מזל טוב! כתבו לי, ונתחיל להתכונן יחד. שיחת ההיכרות בחינם וללא התחייבות.</p>
    <a class="phone" href="{wa}"><small class="wa-tag">(ווטסאפ)</small> 058-404-9049</a>
    <div class="actions">
      <a class="btn btn-gold" href="{wa}"><svg class="ic"><use href="#wa"/></svg> שליחת הודעה בווטסאפ</a>
      <a class="btn btn-line" href="mailto:{mail}"><svg class="ic"><use href="#mail"/></svg> או במייל</a>
    </div>
  </div>
</section>
"""


LEADFORM = """<form class="lead-form" data-lead data-next="/mohel/todah/" action="{endpoint}" method="POST">
  <input type="hidden" name="מקור" value="{source}">
  <input type="hidden" name="_page" value="">
  <input type="hidden" name="utm_source" value=""><input type="hidden" name="utm_medium" value=""><input type="hidden" name="utm_campaign" value=""><input type="hidden" name="ref" value="">
  <div class="hp" aria-hidden="true"><label>אל תמלאו שדה זה <input type="text" name="_honey" tabindex="-1" autocomplete="off"></label></div>
  <div class="field"><label for="{p}-name">שם</label><input id="{p}-name" name="שם" type="text" autocomplete="name" required placeholder="איך קוראים לכם?"></div>
  <div class="field"><label for="{p}-email">מייל <span class="opt">(לכאן נשלח המדריך)</span></label><input id="{p}-email" name="email" type="email" autocomplete="email" required placeholder="name@gmail.com" dir="ltr" style="text-align:right"></div>
  <div class="field"><label for="{p}-phone">טלפון <span class="opt">(לא חובה, אם תרצו גם בווטסאפ)</span></label><input id="{p}-phone" name="טלפון" type="tel" inputmode="tel" autocomplete="tel" placeholder="050-0000000" pattern="[0-9\\-\\+\\s]{{9,15}}" dir="ltr" style="text-align:right"></div>
  <label class="check"><input type="checkbox" name="מאשר/ת קבלת עדכונים" value="כן"> <span>אשמח לקבל עוד כמה טיפים קצרים במייל. אפשר להפסיק בכל רגע.</span></label>
  <button class="btn btn-gold btn-block" type="submit">שלח לי את המדריך (חינם)</button>
  <p class="privacy">נפתח מיד, נשלח למייל, ואם תרצו – גם לווטסאפ.<br>הפרטים נשמרים אצלי בלבד ולא מועברים לאף אחד. הם משמשים רק כדי לשלוח את המדריך ולענות לכם, ואפשר לבקש לראות, לתקן או למחוק אותם בכל רגע. <a href="/mohel/privacy/">פרטיות</a></p>
</form>"""

def leadforms(html):
    def rep(m):
        return LEADFORM.format(source=m.group(1), p=m.group(2), endpoint=LEAD_ENDPOINT)
    return re.sub(r"\{\{LEADFORM:([^:]+):([a-z]+)\}\}", rep, html)

def crumbs_html(items, root=("עמוד המוהל", "/mohel/")):
    if not items:
        return ""
    parts = [f'<a href="{root[1]}">{root[0]}</a>']
    for i, (label, href) in enumerate(items):
        if href:
            parts.append(f'<span><a href="{href}">{label}</a></span>')
        else:
            parts.append(f'<span>{label}</span>')
    return '<nav class="crumbs" aria-label="פירורי לחם">' + "".join(parts) + "</nav>"

def crumbs_ld(items, url, root=("עמוד המוהל", "/mohel/")):
    if not items:
        return ""
    els = [{"@type": "ListItem", "position": 1, "name": root[0], "item": BASE + root[1]}]
    for i, (label, href) in enumerate(items, start=2):
        els.append({"@type": "ListItem", "position": i, "name": label, "item": BASE + href if href else url})
    return '<script type="application/ld+json">' + json.dumps({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": els}, ensure_ascii=False) + "</script>"

# ---------- נפש ויום-יום: חלקים קבועים בכל כלי ----------
# הטופס "משפחת הכלים" שולח מייל לצינור הלידים. עד שגרסת הסקריפט שמזהה "כלים:" פרוסה (בלי מדריך הברית
# ובלי סדרת ההריון), ההרשמה נשמרת בטלפון ונשלחת אוטומטית בביקור הבא אחרי שזה True. פרוס: גרסה 9, 07.11.2026.
KELIM_JOIN_READY = True

NEFESH_HELP = """<aside class="help-strip" aria-label="עזרה עכשיו"><div class="in"><span>קשה עכשיו?</span><a class="rega" href="/nefesh/rega/">למסך רגע קשה ←</a><a href="tel:*8944" data-line="8944">נפש אחת <span dir="ltr">*8944</span></a><a href="tel:1201" data-line="1201">ער"ן <span dir="ltr">1201</span></a><a href="tel:*3362" data-line="3362">נט"ל <span dir="ltr">*3362</span></a></div></aside>"""

NEFESH_FOOT = """<div class="tool-foot">
  <div class="share-row"><a class="btn btn-gold btn-sm" href="#" data-share-tool="wa" data-text="{text}" target="_blank" rel="noopener"><svg class="ic"><use href="#wa"/></svg> לשלוח לחבר בווטסאפ</a></div>
  <div data-install-wrap hidden><button class="btn btn-line btn-sm" type="button" data-install>להתקין בטלפון, כמו אפליקציה</button>
    <p class="ios-tip" id="ios-tip" hidden>באייפון: לוחצים על כפתור השיתוף <b>⬆︎</b> למטה בספארי, ואז "הוספה למסך הבית". מאותו רגע זה נפתח כמו אפליקציה, גם בלי אינטרנט.</p></div>
  <p class="note" style="margin-top:.8rem"><a class="gold" href="/nefesh/">כל הכלים של נפש ויום-יום</a> · חינם · בלי הרשמה · הנתונים נשארים בטלפון שלך</p>
</div>"""

NEFESH_JOIN = """<section class="join" id="join" aria-labelledby="join-h"><div class="in">
  <h2 id="join-h">להישאר בקשר?</h2>
  <p>אם זה עזר לך, אפשר להצטרף למשפחת הכלים: מייל אחד בשבוע לכל היותר, עם כלי חדש, מילה טובה, ולפעמים הטבה. הכלים תמיד יעבדו גם בלי זה.</p>
  <form class="lead-form" id="join-form" data-ready="{ready}" action="{endpoint}" method="POST">
    <div class="hp" aria-hidden="true"><label>אל תמלאו שדה זה <input type="text" name="_honey" tabindex="-1" autocomplete="off"></label></div>
    <div class="field"><label for="j-name">שם פרטי</label><input id="j-name" name="fname" type="text" autocomplete="given-name" required maxlength="40"></div>
    <div class="field"><label for="j-mail">מייל</label><input id="j-mail" name="mail" type="email" autocomplete="email" required dir="ltr" style="text-align:right" placeholder="name@gmail.com"></div>
    <label class="check"><input type="checkbox" required> <span>אני רוצה לקבל מיילים ממשפחת הכלים (כלים חדשים, עדכונים, ולפעמים הטבות). אפשר להסיר בלחיצה בכל רגע.</span></label>
    <button class="btn btn-gold btn-block" type="submit">להצטרף</button>
    <p class="privacy">נשמרים רק השם הפרטי והמייל, אצל גילעד בלבד, ולא מועברים לאף אחד. מה שכתבת בכלים עצמם לא נשלח לשום מקום. אפשר לבקש למחוק בכל רגע. <a href="/mohel/privacy/">פרטיות</a></p>
  </form>
</div></section>"""

def nefesh_blocks(html):
    html = html.replace("{{N:help}}", NEFESH_HELP)
    join = NEFESH_JOIN.format(ready="1" if KELIM_JOIN_READY else "0", endpoint=LEAD_ENDPOINT)
    html = html.replace("{{N:join:wait}}", join.replace('class="join"', 'class="join wait"', 1))
    html = html.replace("{{N:join}}", join)
    return re.sub(r"\{\{N:foot:([^}]+)\}\}", lambda m: NEFESH_FOOT.format(text=m.group(1)), html)

# ---------- כלים לכסף: פוטר קבוע בכל כלי ----------
KESEF_FOOT = """<div class="tool-foot">
  <div class="share-row"><a class="btn btn-gold btn-sm" href="#" data-share-tool="wa" data-text="{text}" target="_blank" rel="noopener"><svg class="ic"><use href="#wa"/></svg> לשלוח לחבר בווטסאפ</a></div>
  <div data-install-wrap hidden><button class="btn btn-line btn-sm" type="button" data-install>להתקין בטלפון, כמו אפליקציה</button>
    <p class="ios-tip" id="ios-tip" hidden>באייפון: לוחצים על כפתור השיתוף <b>⬆︎</b> למטה בספארי, ואז "הוספה למסך הבית".</p></div>
  <p class="note" style="margin-top:.8rem"><a class="gold" href="/kesef/">כל הכלים לכסף</a> · חינם · בלי הרשמה · הנתונים נשארים בטלפון שלך</p>
</div>"""

def kesef_blocks(html):
    return re.sub(r"\{\{K:foot:([^}]+)\}\}", lambda m: KESEF_FOOT.format(text=m.group(1)), html)

# מספר גרסה לכל קובץ ב-/assets/ (?v=<טביעה של התוכן>): כשהקובץ משתנה הכתובת משתנה,
# ולכן ה-service worker והדפדפן לא מגישים את הגרסה הישנה מהשמור (נצפה ב-08.11 בכלי מי שברך).
_VER = {}
def vurl(p):
    f = ROOT / p.lstrip("/")
    if p not in _VER:
        _VER[p] = hashlib.md5(f.read_bytes()).hexdigest()[:8] if f.is_file() else ""
    return p + ("?v=" + _VER[p] if _VER[p] else "")

def version_assets(html):
    return re.sub(r'((?:src|href)=")(/assets/[^"?#]+\.(?:js|css))"', lambda m: m.group(1) + vurl(m.group(2)) + '"', html)

# "שופר בזכותכם": src/shipurim.json (מפתח = tool של הכלי) מזין את הרשימה בדף /kelim/shipurim/
# ואת השורה הקטנה מעל תיבת המשוב בכל כלי. כלי בלי שיפורים: לא מוצג כלום.
SHIPURIM = {k: v for k, v in json.loads((ROOT / "src" / "shipurim.json").read_text(encoding="utf-8")).items() if not k.startswith("_") or k == "_kelali"}
TOOL_URL = {}
for _p in SRC.rglob("*.html"):
    _m = re.match(r"\s*<!--meta\s*(\{.*?\})\s*-->", _p.read_text(encoding="utf-8"), re.S)
    _t = json.loads(_m.group(1)).get("tool") if _m else None
    _rel = _p.relative_to(SRC).as_posix()
    if _t:
        TOOL_URL.setdefault(_t, "/" + (_rel[:-len("index.html")] if _rel.endswith("index.html") else _rel))
for _k in SHIPURIM:
    if _k != "_kelali" and _k not in TOOL_URL:
        raise SystemExit(f"src/shipurim.json: אין כלי עם tool \"{_k}\"")

def hdate(d):
    y, mo, da = d.split("-")
    return f"{da}.{mo}.{y}"

def shp_by(it):
    by = it.get("by", "").strip()
    return f' <span class="by">· בזכות {html_lib.escape(by, quote=False)}</span>' if by else ""

def shipurim_line(tool):
    items = SHIPURIM.get(tool, {}).get("items", [])
    if not items:
        return ""
    lis = "".join(f'<li><time datetime="{it["date"]}">{hdate(it["date"])}</time> {html_lib.escape(it["text"], quote=False)}{shp_by(it)}</li>' for it in items[:3])
    more = f' <span class="n">({len(items)} שיפורים)</span>' if len(items) > 3 else ""
    return f'<div class="shp-line" aria-labelledby="shp-line-h"><p class="shp-line-h" id="shp-line-h">✨ שופר בזכותכם{more}</p><ul>{lis}</ul></div>'

def fb_note(tool):
    if SHIPURIM.get(tool, {}).get("items"):
        return 'אני קורא כל הצעה, בשמחה ובתודה. מה שנבנה בעקבות הצעה נכנס לרשימה "שופר בזכותכם" שלמעלה. <a class="gold" href="/kelim/shipurim/">כל השיפורים בכל הכלים ←</a>'
    return 'אני קורא כל הצעה, בשמחה ובתודה. מה שייבנה בעקבות הצעה שלך יופיע כאן, ברשימה "שופר בזכותכם". <a class="gold" href="/kelim/shipurim/">מה כבר שיפרנו בכלים אחרים ←</a>'

def shipurim_list():
    rows = [(it, k, v) for k, v in SHIPURIM.items() for it in v.get("items", [])]
    rows.sort(key=lambda r: r[0]["date"], reverse=True)
    out = []
    for it, k, v in rows:
        href = v.get("href") or TOOL_URL.get(k)
        name = html_lib.escape(v.get("label", k), quote=False)
        tool = f'<a class="tool" href="{href}">{name}</a>' if href else f'<span class="tool">{name}</span>'
        out.append(f'<li><div class="top">{tool}<time datetime="{it["date"]}">{hdate(it["date"])}</time></div>\n      <p>{html_lib.escape(it["text"], quote=False)}{shp_by(it)}</p></li>')
    return '<ol class="shp" reversed>\n    ' + "\n    ".join(out) + "\n  </ol>"

# ---------- קידום בגוגל: לכל כלי "תעודת זהות" (schema), בלוק "עוד כלים בחינם", ותמונת שיתוף משלו ----------
# INDEX = כל דפי תתי-האתרים שפתוחים לגוגל. דף "מרכז" (hub) = בית של תת-אתר או דף שיש מתחתיו 3 דפים ומעלה.
# דף שלא רוצים בו את הבלוק: "no_rel": true ב-meta. תמונות השיתוף נוצרות ב-tools/og_images.py אל assets/og/.
SEO_SKIP = {"pratiut", "privacy", "shipurim", "hitkadmut", "negishut"}
SEO_AUTHOR = {"@type": "Person", "name": "גילעד רחמים אביעד", "url": BASE + "/kelim/#mi"}
INDEX = {}
for _p in sorted(SRC.rglob("index.html")):
    _raw = _p.read_text(encoding="utf-8")
    _m = re.match(r"\s*<!--meta\s*(\{.*?\})\s*-->", _raw, re.S)
    if not _m:
        continue
    _meta = json.loads(_m.group(1))
    if _meta.get("site") in SITES and not _meta.get("noindex"):
        _h1 = re.search(r"<h1[^>]*>(.*?)</h1>", _raw, re.S)
        _name = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", _h1.group(1))).strip() if _h1 else ""
        _meta["_name"] = _name or re.split(r"\s[–—|-]\s|:\s", _meta["title"])[0].strip()
        INDEX["/" + _p.relative_to(SRC).as_posix()[:-len("index.html")]] = _meta

def seo_parent(p):
    return p.rstrip("/").rsplit("/", 1)[0] + "/"

def seo_children(p):
    return [c for c in INDEX if c != p and seo_parent(c) == p and c.rstrip("/").rsplit("/", 1)[1] not in SEO_SKIP]

def seo_is_hub(p):
    if INDEX.get(p, {}).get("no_hub"):  # כלי שיש מתחתיו דפי נחיתה (תמלול): נשאר כלי, לא דף מרכז
        return False
    return any(s["home"] == p for s in SITES.values()) or len(seo_children(p)) >= 3

def seo_ld(p, url):
    meta = INDEX.get(p)
    if not meta or p.rstrip("/").rsplit("/", 1)[1] in SEO_SKIP:
        return ""
    site = SITES[meta["site"]]
    desc = meta["description"].replace('"', "״")
    if seo_is_hub(p):
        d = {"@context": "https://schema.org", "@type": "CollectionPage", "name": meta["_name"], "description": desc,
             "url": url, "inLanguage": "he", "isAccessibleForFree": True, "author": SEO_AUTHOR,
             "mainEntity": {"@type": "ItemList", "itemListElement": [
                 {"@type": "ListItem", "position": i, "name": INDEX[c]["_name"], "url": BASE + c}
                 for i, c in enumerate(seo_children(p), start=1)]}}
    else:
        cat = ("GameApplication" if "/chashiva/" in p and "/kita/" not in p
               else "EducationalApplication" if meta["site"] == "limudim" or "/tichnut/" in p
               else "UtilitiesApplication")
        d = {"@context": "https://schema.org", "@type": "WebApplication", "name": meta["_name"], "description": desc,
             "url": url, "inLanguage": "he", "applicationCategory": cat, "operatingSystem": "Any",
             "browserRequirements": "דפדפן רגיל בטלפון או במחשב, בלי התקנה.",
             "isAccessibleForFree": True, "offers": {"@type": "Offer", "price": "0", "priceCurrency": "ILS"},
             "author": SEO_AUTHOR, "publisher": SEO_AUTHOR,
             "isPartOf": {"@type": "WebSite", "name": site["name"], "url": BASE + site["home"]}}
    return '<script type="application/ld+json">' + json.dumps(d, ensure_ascii=False) + "</script>"

def seo_related(p):
    meta = INDEX.get(p)
    if not meta or meta.get("no_rel") or seo_is_hub(p) or p.rstrip("/").rsplit("/", 1)[1] in SEO_SKIP:
        return ""
    par = seo_parent(p)
    sibs = sorted(set(seo_children(par)) | {p})
    if len(sibs) < 2:
        return ""
    i = sibs.index(p)
    pick = [sibs[(i + k) % len(sibs)] for k in range(1, min(4, len(sibs) - 1) + 1)]
    def card(c):
        d = INDEX[c]["description"]
        d = d if len(d) <= 95 else d[:95].rsplit(" ", 1)[0].rstrip(" ,.:;–-(") + "…"
        return f'<a href="{c}"><b>{html_lib.escape(INDEX[c]["_name"], quote=False)}</b><span>{html_lib.escape(d, quote=False)}</span></a>'
    more = f'<p class="rel-all"><a class="gold" href="{par}">לכל הכלים של ״{html_lib.escape(INDEX[par]["_name"], quote=False)}״ ←</a></p>' if par in INDEX else ""
    return ('\n<section class="k-sec rel no-print" aria-labelledby="rel-h">\n  <h2 id="rel-h">עוד כלים בחינם שאולי יעזרו</h2>\n  <div class="dom">'
            + "".join(card(c) for c in pick) + f"</div>\n  {more}\n</section>\n")

# ---------- "בחינם, ללא הגבלה ובלי פרסומות": פס קטן בראש כל דף בתתי-האתרים ----------
# גילעד (11.11.2026): "אצלי זה גם בחינם גם ללא הגבלה וגם בלי פרסומות!! רק מרצון של חסד!!"
# ועל כלים עם מכסה: "מי שיהיה טיפה שותף זה יהיה לו ללא הגבלה אז כן זה נכון שאני כותב ללא הגבלה!!"
# CHESED_PARTNER = כלי עם מכסה שיש בו מסלול שותפות שפותח אותה -> "ללא הגבלה" + שורה על שותפים.
# CHESED_NO_PATH = כלי עם מכסה בלי מסלול שותפות (עדיין) -> בלי "ללא הגבלה". כשמוסיפים לו קוד שותף ב-Worker: להעביר ל-CHESED_PARTNER.
# הגנה מספאם (X פעולות ברצף) או משחק יומי היא לא מכסה.
# תמלול ווידאו-שיעור יצאו מכאן (11.11.2026): בלי הגבלה לכולם, אחרי 60 דקות לחיצה אחת "להמשיך לתמלל".
CHESED_PARTNER = {
    "/kelim/shir/karaoke/": "5 שירים חדשים ביום; שותפות בבוט = ללא הגבלה",
    "/kelim/tochen/chaye/": "2 החייאות ביום; קוד שותף (partner_codes.py) = ללא הגבלה",
    "/kelim/shir/clip/": "kelim-shir PER_IP 40; x-kelim-partner = ללא הגבלה",
    "/kelim/shir/haklata/": "kelim-shir",
    "/kelim/shir/lachan/": "kelim-shir",
    "/kelim/shir/milim/": "kelim-shir",
    "/kelim/tochen/studio/": "kelim-studio PER_IP 40; x-kelim-partner",
    "/limudim/poter/": "limudim-poter PER_IP 12; x-kelim-partner",
    "/limudim/machberet/": "limudim-poter; x-kelim-partner",
    "/kelim/miluim/gibush/": "7 ימים בחינם; קוד שותף (18 ₪) פותח את כל המסלול, הספר וההקלטה – Worker kelim-gibush",
}
CHESED_NO_PATH = {}  # כרגע ריק: לכל הכלים עם מכסה יש קוד שותף (11.11.2026)
CHESED_SKIP = SEO_SKIP | {"404"}
# קוד שותף אחד לכל הכלים עם מכסה: נשמר ב-localStorage 'kelim-partner' (kelim.js), הכלים שולחים אותו בכותרת x-kelim-partner
CHESED_CODE = ('<details class="chesed-p"><summary>🤝 יש לי קוד שותף</summary><label>קוד השותף שקיבלתי '
               '<input type="text" inputmode="numeric" dir="ltr" maxlength="12" autocomplete="off" placeholder="123-45678" data-partner-code></label>'
               '<span class="chesed-ok" data-partner-ok hidden>✓ נשמר. תודה שאתם שותפים ❤ ללא הגבלה בכל הכלים.</span>'
               '<span>הקוד נשמר רק בטלפון הזה. <a class="gold" href="/kelim/#litmoch">איך נהיים שותפים?</a></span></details>')
CHESED_SUB = "הרבה כלים כאלה ברשת מוגבלים ומלאים בפרסומות. כאן לא, מתוך רצון לעשות חסד."

def chesed_band(p, meta):
    if meta.get("noindex") or meta.get("no_chesed") or p.rstrip("/").rsplit("/", 1)[-1] in CHESED_SKIP:
        return ""
    nop = lambda c: any(c.startswith(l) for l in CHESED_NO_PATH)
    below = [c for c in INDEX if c != p and c.startswith(p)]
    if nop(p) or (below and 2 * sum(map(nop, below)) >= len(below)):  # מכסה בלי מסלול שותפות, או מרכז שרוב הכלים בו כאלה
        chips, sub = ["בחינם", "בלי פרסומות", "בלי הרשמה"], "הרבה כלים כאלה ברשת עולים כסף ומלאים בפרסומות. כאן לא, מתוך רצון לעשות חסד."
    elif any(p.startswith(l) for l in CHESED_PARTNER):
        chips, sub = ["בחינם", "ללא הגבלה", "בלי פרסומות"], "לכולם מכסה בחינם, ולשותפים במיזם ללא הגבלה. בלי פרסומות, מתוך רצון לעשות חסד."
    elif any(map(nop, below)):  # דף מרכז שיש מתחתיו כלי כזה
        chips, sub = ["הכול בחינם", "בלי פרסומות", "רוב הכלים ללא שום הגבלה"], CHESED_SUB
    else:
        chips, sub = ["בחינם", "ללא הגבלה", "בלי פרסומות"], CHESED_SUB
    box = CHESED_CODE if any(p.startswith(l) for l in CHESED_PARTNER) and not p.startswith("/kelim/shir/karaoke/") else ""  # בקריוקי השותפות בתוך הבוט
    return ('<div class="chesed no-print" role="note"><p class="chesed-t">' + "".join(f"<b>✓ {c}</b>" for c in chips)
            + f'</p><p class="chesed-s">{sub}</p>{box}</div>')

# סרטון הדמיה + פרוספקט לשיתוף (14.11.2026, גילעד: "סרטוני הדמיה באתר לכל כלי... ודף פרוספקט מעוצב לכל כלי שאפשר לשתף").
# נוצרים ב-tools/demo_video/render.py לתוך assets/demo/<tool>.*; כשהקבצים קיימים הבלוק נכנס לבד אחרי ה-header של דף הכלי,
# או במקום <!--demo--> אם הדף שם אותו במקום אחר. המפרט (שם, תיאור, משך) נקרא מ-tools/demo_video/specs/<tool>.json.
DEMO_DIR = ROOT / "assets" / "demo"
DEMO_SPECS = ROOT / "tools" / "demo_video" / "specs"

def demo_block(meta, url):
    tool = meta.get("tool", "")
    if not tool or not (DEMO_DIR / f"{tool}.mp4").exists():
        return "", ""
    sp = DEMO_SPECS / f"{tool}.json"
    spec = json.loads(sp.read_text(encoding="utf-8")) if sp.exists() else {}
    dur = spec.get("duration") or sum(s.get("dur", 0) for s in spec.get("scenes", [])) or 45
    wide = spec.get("wide")  # סרטון הדרכה לרוחב (16:9), למשל צילומי מסך של מחשב
    name = spec.get("name", "ככה זה עובד")
    v, poster = f"/assets/demo/{tool}.mp4", f"/assets/demo/{tool}.jpg"
    post, status = f"/assets/demo/{tool}-post.png", f"/assets/demo/{tool}-status.png"
    has_fl = (DEMO_DIR / f"{tool}-post.png").exists()
    share_txt = meta.get("og_title", meta["title"]).split(" | ")[0]
    fl = (f'<details class="dv-fl"><summary>📄 פרוספקט לשיתוף – תמונה אחת שמסבירה הכול</summary>'
          f'<a href="{post}" target="_blank" rel="noopener"><img src="{post}" alt="פרוספקט: {html_lib.escape(name)}" loading="lazy" width="1080" height="1350"></a>'
          f'<div class="dv-acts"><button type="button" class="btn btn-gold" data-dv-share="{post}" data-dv-kind="flyer">💌 לשלוח את הפרוספקט</button>'
          f'<a class="btn btn-line" href="{post}" download data-dv-dl="flyer">⬇️ להורדה (פוסט)</a>'
          f'<a class="btn btn-line" href="{status}" download data-dv-dl="status">⬇️ להורדה (סטטוס)</a></div></details>') if has_fl else ""
    blk = (
        '<style>.dv-sec .dv-video{display:block;width:100%;max-width:20rem;aspect-ratio:9/16;height:auto;margin:.6rem auto 0;border-radius:1.2rem;background:#0e1628;box-shadow:0 8px 30px rgba(0,0,0,.35)}'
        '.dv-sec .dv-video.dv-wide{max-width:100%;aspect-ratio:16/9;border-radius:.8rem}'
        '.dv-acts{display:flex;flex-wrap:wrap;gap:.5rem;justify-content:center;margin-top:.9rem}.dv-acts .btn{font-size:.95rem}'
        '.dv-fl{margin-top:1rem}.dv-fl summary{cursor:pointer;color:var(--gold);font-weight:700;text-align:center}'
        '.dv-fl img{display:block;width:100%;max-width:24rem;height:auto;margin:.8rem auto 0;border-radius:1rem}</style>'
        f'<section class="k-sec dv-sec no-print" aria-labelledby="dv-h"><h2 id="dv-h">🎬 {html_lib.escape(name)}</h2>'
        f'<video class="dv-video{' dv-wide' if wide else ''}" controls playsinline preload="none" poster="{poster}" width="{1280 if wide else 720}" height="{720 if wide else 1280}" aria-label="{html_lib.escape(spec.get("description", name))}" data-dv-play="{tool}">'
        f'<source src="{v}" type="video/mp4"></video>'
        f'<div class="dv-acts"><button type="button" class="btn btn-gold" data-dv-share="{v}" data-dv-kind="video">💌 לשלוח את הסרטון לחבר</button>'
        f'<a class="btn btn-line" href="{v}" download data-dv-dl="video">⬇️ להורדת הסרטון</a></div>{fl}'
        f'<script>window.DV_SHARE={json.dumps({"tool": tool, "text": share_txt, "url": url}, ensure_ascii=False)}</script>'
        '<script src="/assets/demo-share.js" defer></script></section>')
    ld = json.dumps({"@context": "https://schema.org", "@type": "VideoObject", "name": name,
                     "description": spec.get("description", meta["description"]),
                     "thumbnailUrl": [BASE + poster], "contentUrl": BASE + v,
                     "uploadDate": spec.get("upload", "2026-11-14T12:00:00+02:00"), "duration": f"PT{round(dur)}S",
                     "inLanguage": "he", "publisher": {"@type": "Person", "name": "גילעד רחמים", "url": BASE + "/kelim/"}}, ensure_ascii=False)
    return blk, f'<script type="application/ld+json">{ld}</script>'

def insert_demo(content, blk):
    if not blk:
        return content.replace("<!--demo-->", "")
    if "<!--demo-->" in content:
        return content.replace("<!--demo-->", blk, 1)
    i = content.find("</header>")
    return content[: i + 9] + blk + content[i + 9:] if i >= 0 else blk + content

pages = []
TOOLS_JSON = []
site_pages = {k: [] for k in SITES}
for path in sorted(SRC.rglob("*.html")):
    raw = path.read_text(encoding="utf-8")
    m = re.match(r"\s*<!--meta\s*(\{.*?\})\s*-->\s*", raw, re.S)
    if not m:
        raise SystemExit(f"{path}: חסר בלוק meta")
    meta = json.loads(m.group(1))
    content = leadforms(raw[m.end():]).replace("{{shipurim_list}}", shipurim_list())
    if meta.get("site") == "nefesh":
        content = nefesh_blocks(content)
    if meta.get("site") == "kesef":
        content = kesef_blocks(content)
    rel = path.relative_to(SRC).as_posix()            # e.g. mohel/moed/index.html
    out = ROOT / rel
    url_path = "/" + rel[:-len("index.html")] if rel.endswith("index.html") else "/" + rel
    url = BASE + url_path
    site = SITES.get(meta.get("site", ""))
    root = (site["name"], site["home"]) if site else ("עמוד המוהל", "/mohel/")
    html = LAYOUT_KELIM if site else LAYOUT
    content += seo_related(url_path)
    dv_blk, dv_ld = demo_block(meta, url) if site else ("", "")
    content = insert_demo(content, dv_blk)
    og_own = "og/" + url_path.strip("/").replace("/", "-") + ".jpg"
    og_default = og_own + "?v=4" if (site and (ROOT / "assets" / og_own).exists()) else (site["og"] if site else "og-mohel.jpg")
    # תיאור השיתוף (og:description) פותח ב"בחינם, בלי הגבלה ובלי הרשמה" - גילעד 11.11.2026.
    # כלי עם מכסה (CHESED_PARTNER) לא מקבל "בלי הגבלה"; כלי עם כניסת גוגל לא מקבל "בלי הרשמה". נפש נשאר בטון הרך שלו.
    og_desc = meta["description"]
    if site and meta.get("site") != "nefesh" and not meta.get("noindex"):
        limited = any(url_path.startswith(l) for l in CHESED_PARTNER)
        login = "gsi/client" in raw or "accounts.google.com" in raw
        free = [w for w, ok in (("בלי הגבלה", not limited), ("בלי הרשמה", not login)) if ok]
        lead = ("בחינם, " + free[0] + " ו" + free[1] if len(free) == 2 else "בחינם ו" + free[0] if free else "בחינם") + ". "
        og_desc = lead + re.sub(r"^בחינם[,.]?\s*", "", og_desc)
    rep = {
        "title": meta["title"],
        "og_description": og_desc,
        "description": meta["description"],
        "url": url,
        "base": BASE,
        "migrate": MIGRATE,
        "og_title": meta.get("og_title", meta["title"]),
        "og_image": meta.get("og_image", og_default),
        "robots": '<meta name="robots" content="noindex">' if meta.get("noindex") else "",
        "head": meta.get("head_pre", "") + GA + KISHUR + meta.get("head", "") + crumbs_ld(meta.get("crumbs"), url, root) + seo_ld(url_path, url) + dv_ld,
        "body_class": meta.get("body_class", ""),
        "sprite": SPRITE,
        "wa": WA,
        "crumbs": crumbs_html(meta.get("crumbs"), root),
        "content": content,
        "cta": "" if (meta.get("no_cta") or site) else CTA.format(wa=WA, mail=CONTACT_MAIL),
        "dock_href": meta.get("dock_href", "/mohel/madrich/"),
        "dock_label": meta.get("dock_label", "מדריך חינם"),
        "foot": meta.get("foot", "") + ('<script src="/assets/lead.js" defer></script>' if "data-lead" in content else "") + ('<script src="/assets/moed.js" defer></script>' if "moed-form" in content else "") + ('<script src="/assets/yt.js" defer></script>' if 'class="yt"' in content else ""),
    }
    if site:
        key = meta["site"]
        # גרשיים בתוך מאפיין HTML (content="...") שוברים אותו: בתת-האתרים הופכים " ל-״ (שו"ת → שו״ת)
        for k in ("title", "description", "og_title", "og_description"):
            rep[k] = rep[k].replace('"', "״")
        rep.update({
            "site": key, "site_name": site["name"], "site_brand": site.get("brand", site["name"]), "site_short": site["short"], "site_home": site["home"],
            "theme": site["theme"], "site_desc": site["desc"],
            "nav": "".join(f'<a href="{h}"' + (' aria-current="page"' if meta.get("nav") == k else "") + f'>{l}</a>' for k, h, l in site["nav"]),
            "tool": meta.get("tool", ""),
            "shipurim": shipurim_line(meta.get("tool", "")),
            "chesed": chesed_band(url_path, meta),
            "fb_note": fb_note(meta.get("tool", "")),
            "lead_endpoint": LEAD_ENDPOINT,
            "site_css": "".join(f'<link rel="stylesheet" href="{c}">' for c in site.get("css", [])),
        })
        rep["foot"] += "".join(f'<script src="{j}" defer></script>' for j in site.get("js", []))
        if not meta.get("no_precache"):  # דפים רבים מאותו סוג (פרקי תהילים): לא נשמרים מראש בטלפון, רק כשנכנסים אליהם
            site_pages[key].append(url_path)
    for k, v in rep.items():
        html = html.replace("{{" + k + "}}", v)
    for key in ["yerushalaim", "sipur", "hachana", "moed", "madrich", "kartis"]:
        html = html.replace("{{cur:" + key + "}}", ' aria-current="page"' if meta.get("nav") == key else "")
    html = version_assets(html)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")
    if site and not meta.get("noindex") and not meta.get("no_precache") and not re.search(r"/(pratiut|negishut|tosaf)/$", url_path):
        # רשימת הכלים לתוסף הכרום (kelim/tools.json): כלי חדש באתר מופיע בתוסף בלי לשלוח גרסה לחנות
        cr = meta.get("crumbs") or []
        name = cr[-1][0] if cr else re.split(r"\s[–—|-]\s|:\s", meta["title"])[0].strip()
        t = {"n": name, "d": meta["description"][:120], "u": url_path, "s": site["short"],
             "c": cr[-2][0] if len(cr) > 1 else site["name"]}
        if seo_is_hub(url_path): t["h"] = 1
        if meta.get("ext"): t["x"] = meta["ext"]
        TOOLS_JSON.append(t)
    if not meta.get("noindex"):
        pages.append((url, meta.get("priority", "0.6"), path))
    print("built", url_path)

# PWA לכל תת-אתר: manifest + service worker בתיקייה של התת-אתר (הטווח שלו = התיקייה).
SW_SRC = (ROOT / "src" / "sw.js").read_text(encoding="utf-8")
for key, site in SITES.items():
    d = ROOT / key
    d.mkdir(exist_ok=True)
    man = {
        "name": site["name"], "short_name": site["short"], "description": site["desc"],
        "id": site["home"], "start_url": site["home"] + "?utm_source=pwa", "scope": site["home"],
        "display": "standalone", "background_color": site["theme"], "theme_color": site["theme"],
        "dir": "rtl", "lang": "he",
        "icons": [{"src": f"/assets/icon-{site['icon']}-192.png", "sizes": "192x192", "type": "image/png"},
                  {"src": f"/assets/icon-{site['icon']}-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable"}],
    }
    if key == "kelim":  # לחיצה ארוכה על האייקון: ישר לכלים הכי שימושיים
        man["shortcuts"] = [{"name": n, "short_name": n, "url": u + "?utm_source=pwa_shortcut", "icons": [{"src": "/assets/icon-kelim-192.png", "sizes": "192x192"}]}
                            for n, u in [("תמלול", "/kelim/tamlul/"), ("התרופות שלי", "/kelim/briut/trufot/"), ("הכנה לוועדה", "/kelim/shikum/vaada/"), ("הקטנת סרטון", "/kelim/machshev/video/")]]
    if key == "kelim":  # "שיתוף" מאפליקציה אחרת בטלפון: src/sw.js מקבל את הקבצים ומנתב – שמע/וידאו בודד לתמלול, השאר למסדר התיקיות
        man["share_target"] = {"action": "/kelim/machshev/sader/?share=1", "method": "POST", "enctype": "multipart/form-data",
                               "params": {"files": [{"name": "files", "accept": ["*/*", "audio/*", "video/*", "image/*", "audio/ogg", "audio/opus", "audio/mpeg", "audio/mp4", "audio/aac", "audio/amr", "audio/wav", "video/mp4", "video/3gpp", "video/webm"]}]}}
        # "פתח באמצעות" במחשב (אחרי התקנת האתר כאפליקציה): קובץ PDF נפתח בכלי המילוי והחתימה
        man["file_handlers"] = [{"action": "/kelim/machshev/chatima/", "accept": {"application/pdf": [".pdf"]}}]
    (d / "manifest.webmanifest").write_text(json.dumps(man, ensure_ascii=False, indent=1), encoding="utf-8")
    pre = site_pages[key] + ["/assets/site.css", "/assets/kelim.css", "/assets/kelim.js", "/assets/track.js",
                             "/assets/fonts/FrankRuhlLibre-wght.woff", "/assets/fonts/Assistant-wght.woff",
                             f"/assets/icon-{site['icon']}-192.png"] + site.get("css", []) + site.get("js", [])
    pre = [vurl(p) if re.search(r"^/assets/.*\.(js|css)$", p) else p for p in pre]
    ver = datetime.datetime.now().strftime("%Y%m%d%H%M")
    (d / "sw.js").write_text(SW_SRC.replace("__CACHE__", f"{key}-{ver}").replace("__PRECACHE__", json.dumps(pre)), encoding="utf-8")
    print(f"pwa {key}: {len(site_pages[key])} pages")

# tools.json: לאתר (התוסף מעדכן ממנו את הרשימה) ועותק בתוך התוסף, למקרה שאין אינטרנט
_tj = json.dumps({"tools": TOOLS_JSON}, ensure_ascii=False, separators=(",", ":"))
for _p in (ROOT / "kelim" / "tools.json", ROOT / "tools" / "chatima-ext" / "tools.json"):
    _p.write_text(_tj, encoding="utf-8", newline="\n")
print("tools.json:", len(TOOLS_JSON), "pages,", sum(1 for t in TOOLS_JSON if "x" in t), "take files")

today = datetime.date.today().isoformat()
# lastmod אמיתי: התאריך של הקומיט האחרון שנגע בקובץ המקור של הדף (קובץ ששונה ועוד לא נשמר = היום).
# כשכל הדפים מסומנים "עודכנו היום" גוגל מפסיק לסמוך על התאריך; ככה הוא יודע אילו דפים באמת השתנו.
def _git_dates():
    import subprocess
    run = lambda *a: subprocess.run(["git", *a], cwd=ROOT, capture_output=True, text=True, encoding="utf-8", check=True).stdout
    try:
        out = run("-c", "core.quotepath=off", "log", "--format=@%cs", "--name-only", "--", "src/pages")
        dirty = run("-c", "core.quotepath=off", "status", "--porcelain", "--untracked-files=all", "--", "src/pages")
    except Exception:
        return {}, set()
    dates, cur = {}, today
    for line in out.splitlines():
        if line.startswith("@"):
            cur = line[1:]
        elif line.strip():
            dates.setdefault(line.strip(), cur)
    return dates, {l[3:].strip() for l in dirty.splitlines() if l.strip()}
GIT_DATES, GIT_DIRTY = _git_dates()
def lastmod(path):
    rel = path.relative_to(ROOT).as_posix()
    return today if rel in GIT_DIRTY else GIT_DATES.get(rel, today)
sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
for url, pr, path in pages:
    sm.append(f"  <url><loc>{url}</loc><lastmod>{lastmod(path)}</lastmod><priority>{pr}</priority></url>")
sm.append("</urlset>")
(ROOT / "sitemap.xml").write_text("\n".join(sm) + "\n", encoding="utf-8")
(ROOT / "robots.txt").write_text(f"User-agent: *\nAllow: /\nDisallow: /mohel/todah/\nSitemap: {BASE}/sitemap.xml\n", encoding="utf-8", newline="\n")
print("sitemap:", len(pages), "pages")
