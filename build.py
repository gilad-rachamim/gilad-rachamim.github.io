#!/usr/bin/env python3
"""בונה את דפי האתר מ-src/pages לתוך שורש המאגר.

כל קובץ ב-src/pages הוא HTML של התוכן בלבד, עם בלוק JSON בראשו בין
<!--meta ... -->. הסקריפט עוטף אותו ב-src/layout.html, מסמן את הדף
הנוכחי בסרגל, מוסיף פירורי לחם ו-CTA, ומייצר sitemap.xml.

הרצה:  python3 build.py
"""
import json, os, re, pathlib, datetime, hashlib
import urllib.parse
import html as html_lib

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "src" / "pages"
LAYOUT = (ROOT / "src" / "layout.html").read_text(encoding="utf-8")
# תת-אתרים של "הכלים של גילעד רחמים" (meta "site"): תבנית משותפת, ניווט, צבעים ופוטר משלהם.
# דף בלי "site" = אתר המוהל, בדיוק כמו קודם.
LAYOUT_KELIM = (ROOT / "src" / "layout-kelim.html").read_text(encoding="utf-8")
LAYOUT_MATANA = (ROOT / "src" / "layout-matana.html").read_text(encoding="utf-8")
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
                ("tmchur", "/esek/tmchur-mana/", "תמחור מנה"), ("hazmana", "/esek/hazmana-vatsap/", "קישור וואטסאפ"), ("misadot", "/esek/misadot/", "למסעדות"), ("qr", "/esek/qr/", "QR מעוצב"), ("ptiha", "/esek/ptiha/", "פתיחת עסק"), ("tfutsa", "/esek/tfutsa/", "תפוצה ללקוחות"), ("seo", "/esek/seo/", "בדיקת SEO"), ("kelim", "/kelim/", "כל הכלים")],
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
# פיקסל של Meta (22.11.2026, בקשת גילעד): מודד כניסות מהפרסום הממומן לדפי אתר הכלים ולדפי הקורס.
# רק בדפים עם "site" (אתר הכלים), לא בדפים עם no_ga / no_pixel, ולא בדפי /nefesh/ (מידע רגיש – מדיניות Meta).
# שולח PageView, ו-InitiateCheckout בלחיצה על קישור קנייה ב-Payhip. בלי התאמה מתקדמת ובלי שום פרט אישי.
META_PIXEL_ID = "4627297074222937"
PIXEL = "" if not META_PIXEL_ID else f"""<script>!function(f,b,e,v,n,t,s){{if(f.fbq)return;n=f.fbq=function(){{n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)}};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','{META_PIXEL_ID}');fbq('track','PageView');document.addEventListener('click',function(e){{var a=e.target.closest&&e.target.closest('a[href*="payhip.com"]');if(a&&window.fbq)fbq('track','InitiateCheckout');}});</script>
"""
MT_TEST = "<script>try{var mtq=new URLSearchParams(location.search).get('mt_test');if(mtq==='1')localStorage.setItem('mt_notrack','1');if(mtq==='0')localStorage.removeItem('mt_notrack');if(localStorage.getItem('mt_notrack')==='1'){window._mtq=[];window.fbq=window._fbq=function(){window._mtq.push([].slice.call(arguments))};}}catch(e){}</script>"
def pixel_for(meta, url_path):
    # 24.11.2026: דפי מתנה קצרים (/matana/) – Lead נשלח מ-assets/matana.js בשליחת הטופס ובלחיצה על ווטסאפ
    if url_path.startswith("/matana/"):
        # InitiateCheckout עם ערך ושם מוצר נשלח מ-assets/matana.js, ולכן מסירים את המאזין הכללי כדי שלא יישלח פעמיים
        # 24.11.2026: מתג בדיקות ?mt_test=1 (נשמר בדפדפן; ?mt_test=0 מבטל) – fbq מוחלף ברשימה מקומית window._mtq,
        # וקוד הפיקסל עוצר ב-if(f.fbq)return, כך ששום דבר (גם לא PageView) לא נשלח למטא מהבדיקות שלנו
        return MT_TEST + PIXEL.replace("document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href*=\"payhip.com\"]');if(a&&window.fbq)fbq('track','InitiateCheckout');});", "")
    # 24.11.2026: דפי המוהל (/mohel/) – מודדים את מודעות מטא למדריך; Lead בדף התודה
    if url_path.startswith("/mohel/") and not (meta.get("no_ga") or meta.get("no_pixel")):
        return PIXEL.replace("</script>", ("if(location.pathname.indexOf('/mohel/todah')===0)fbq('track','Lead');" if url_path.startswith("/mohel/todah") else "") + "</script>")
    if not meta.get("site") or meta.get("no_ga") or meta.get("no_pixel") or url_path.startswith("/nefesh/"):
        return ""
    # טעינה דחויה (ראו LATER): התור של fbq נוצר מיד, והקובץ של Meta נטען אחר כך
    now = "t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)"
    assert now in PIXEL
    return PIXEL.replace(now, "f.hkLater(v)")
# טעינה דחויה של סקריפטי המעקב בדפי אתר הכלים (26.11.2026, ביצועים בנייד): gtag ו-fbq נשארים כתורים מקומיים מהרגע הראשון,
# כך שכל אירוע נשמר, והקבצים החיצוניים נטענים בנגיעה/גלילה/הקשה הראשונה, ביציאה לרקע, או 3 שניות אחרי load.
# טעינה מיידית: דפי תודה (אירועי רכישה), כניסה מפרסום או מקישור מסומן (gclid/fbclid/utm_). /mohel/ ו-/matana/ לא נדחים.
LATER = r"""<script>(function(w,d){var q=[],on=0,E=['pointerdown','keydown','touchstart','scroll','wheel'];function add(s){var e=d.createElement('script');e.async=true;e.src=s;d.head.appendChild(e)}function go(){if(on)return;on=1;q.splice(0).forEach(add)}w.hkLater=function(s){if(on)add(s);else q.push(s)};if(/\/todah?(\/|$)/.test(location.pathname)||/[?&](gclid|gbraid|wbraid|fbclid|utm_[a-z]+)=/.test(location.search)){on=1;return}E.forEach(function(n){w.addEventListener(n,go,{once:true,passive:true,capture:true})});d.addEventListener('visibilitychange',function(){if(d.visibilityState==='hidden')go()});function arm(){setTimeout(go,3000)}if(d.readyState==='complete')arm();else w.addEventListener('load',arm)})(window,document);</script>
"""
def deferred(meta, url_path):
    return bool(meta.get("site")) and not url_path.startswith(("/mohel/", "/matana/"))
def ga_for(meta, url_path):
    if not GA or not deferred(meta, url_path):
        return GA
    tag = f'<script async src="https://www.googletagmanager.com/gtag/js?id={GA_ID}"></script>' + chr(10)
    assert tag in GA
    return LATER + GA.replace(tag, "").replace("</script>", f"hkLater('https://www.googletagmanager.com/gtag/js?id={GA_ID}');</script>", 1)
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
# דפים בשפה אחרת (22.11.2026, גיור באנגלית וברוסית): "lang": "en"/"ru" ב-meta -> <html lang dir=ltr>, התוכן בשפה,
# המסגרת של האתר (תפריט, משוב, תחתית) נשארת בעברית ומסומנת lang=he dir=rtl. "alt": {"he": ..., "en": ..., "ru": ...} -> hreflang.
LANG_UI = {
    "en": {"locale": "en_US", "skip": "Skip to content", "crumbs": "Breadcrumb", "browser": "Any phone or computer browser, no install.",
           "rel": "More free tools that may help", "all": "All tools in",
           "chips": ["Free", "No limits", "No ads"], "sub": "Many tools like this online are limited and full of ads. Not here: no sign-up and no ads, out of a wish to do kindness (chesed)."},
    "ru": {"locale": "ru_RU", "skip": "Перейти к содержанию", "crumbs": "Навигационная цепочка", "browser": "Любой браузер в телефоне или компьютере, без установки.",
           "rel": "Ещё бесплатные инструменты", "all": "Все инструменты раздела",
           "chips": ["Бесплатно", "Без ограничений", "Без рекламы"], "sub": "Многие такие инструменты в сети ограничены и полны рекламы. Здесь нет: без регистрации и без рекламы, как доброе дело (хесед)."},
}
GIUR_WA_TEXT = {
    "he": "שלום גילעד, אשמח לשאול על ברית מילה בגיור",
    "en": "Hello Gilad, I would like to ask about brit milah in conversion",
    "ru": "Здравствуйте, Гилад, хочу спросить об обрезании при гиюре",
}
# מסגרת האתר (תפריט, משוב, תחתית, הודעת התקנה) בשפת הדף, 23.11.2026 – בקשת גילעד: גר שלא קורא עברית לא פוגש עברית בדף
LANG_FRAME = {
    "en": {"brand_label": "Home page of the tools project", "search_label": "Search tools", "brand": "Jewish Tools", "navlabel": "Main navigation", "roadmap": "Conversion roadmap", "brit": "Adult brit milah", "write": "Write to Gilad",
           "cta_h": "Need adult brit milah or hatafat dam brit?",
           "cta_p": "Write to me, Gilad, on WhatsApp. I will listen, explain and connect you with a professional, experienced mohel in a proper clinic. No commitment.",
           "cta_wa": "Write to Gilad on WhatsApp", "cta_more": "More about brit milah in conversion",
           "share_h": "Know someone who is converting? Send them this page.", "share_btn": "Share on WhatsApp", "share_text": "A free, step-by-step guide for converts (Hebrew, English, Russian):",
           "feedback": "Something missing or unclear? Tell me on WhatsApp", "fb_text": "Hello Gilad, a suggestion about the conversion pages:",
           "contact": "Contact", "links": "Links", "wa_label": "(WhatsApp)", "heb": "The mohel site (Hebrew)", "tools": "All free tools (Hebrew)", "privacy": "Privacy (Hebrew)",
           "promise": ["Everything is free and ad-free", "No sign-up", "Your data stays on your phone", "Works on phone and computer"],
           "end": "Made by Gilad Rachamim Aviad, a disabled IDF veteran with severe combat PTSD. A chesed project: no profit intended.",
           "up": "Back to top", "install_t": "Install on your home screen like an app.", "install_b": "Install", "install_x": "Close", "install_l": "Install as an app"},
    "ru": {"brand_label": "Главная страница проекта", "search_label": "Поиск инструментов", "brand": "Еврейские инструменты", "navlabel": "Главная навигация", "roadmap": "Путь к гиюру", "brit": "Брит-мила для взрослых", "write": "Написать Гиладу",
           "cta_h": "Нужна брит-мила для взрослых или атафат дам брит?",
           "cta_p": "Напишите мне, Гиладу, в WhatsApp. Я выслушаю, объясню и свяжу вас с профессиональным опытным моэлем в хорошо организованной клинике. Без обязательств.",
           "cta_wa": "Написать Гиладу в WhatsApp", "cta_more": "Подробнее о брит-миле при гиюре",
           "share_h": "Знаете кого-то, кто проходит гиюр? Отправьте ему эту страницу.", "share_btn": "Отправить в WhatsApp", "share_text": "Бесплатный пошаговый путеводитель для проходящих гиюр (иврит, английский, русский):",
           "feedback": "Чего-то не хватает или непонятно? Напишите мне в WhatsApp", "fb_text": "Здравствуйте, Гилад, предложение по страницам о гиюре:",
           "contact": "Контакты", "links": "Ссылки", "wa_label": "(WhatsApp)", "heb": "Сайт моэля (иврит)", "tools": "Все бесплатные инструменты (иврит)", "privacy": "Конфиденциальность (иврит)",
           "promise": ["Всё бесплатно и без рекламы", "Без регистрации", "Данные остаются только в вашем телефоне", "Работает в телефоне и на компьютере"],
           "end": "Автор: Гилад Рахамим Авиад, инвалид ЦАХАЛа с тяжёлым боевым ПТСР. Проект добра (хесед), без цели получить прибыль.",
           "up": "Наверх", "install_t": "Установите на главный экран, как приложение.", "install_b": "Установить", "install_x": "Закрыть", "install_l": "Установка как приложения"},
}
# מסגרת דפי הכלים למוהלים בשפה אחרת (24.11.2026, גל 1): אותה מסגרת כמו בגיור, בלי פנייה לברית מבוגרים
MOHEL_FRAME = {
    "en": {"tools": "Tools for mohels", "wa_text": "Hello Gilad, I saw the tools for mohels. I wanted to write to you: ",
           "share_h": "Know a mohel who could use this? Send them this page.", "share_text": "Free tools for mohels and for families before a brit milah:",
           "feedback": "Something to fix or add? Tell me on WhatsApp", "fb_text": "Hello Gilad, a correction or suggestion about the tools for mohels: "},
    "ru": {"tools": "Инструменты для моэлей", "wa_text": "Здравствуйте, Гилад, я видел(а) страницу инструментов для моэлей. Хотел(а) написать вам: ",
           "share_h": "Знаете моэля, которому это пригодится? Отправьте ему эту страницу.", "share_text": "Бесплатные инструменты для моэлей и для семей перед брит-милой:",
           "feedback": "Что-то исправить или добавить? Напишите мне в WhatsApp", "fb_text": "Здравствуйте, Гилад, исправление или предложение по инструментам для моэлей: "},
}
# אתר הברית להורים (src/layout.html, דף בלי "site") בשפה אחרת – גל 2, 24.11.2026.
# קישור לדף שעוד אין לו גרסה בשפה מוביל לעברית ומסומן "(иврит)" / "(Hebrew)". אין פנייה "תזמינו אותי" (המוהל ששלח את הדף הוא המוהל שלהם).
MOHEL_SITE_FRAME = {
    "en": {"site": "Gilad Rachamim, mohel", "brand": "Gilad Rachamim · mohel", "nav": "Main navigation", "dock": "Quick actions", "heb": "Hebrew",
           "wa_text": "Hello Gilad, I am reading the brit milah pages for parents. I wanted to ask: ",
           "top": [("hachana", "Brit preparation"), ("moed", "Date calculator"), ("madrich", "Parents' guide"), ("hazmana", "Invitation")],
           "cols": [("Brit milah", [("brit-mila", "Brit milah step by step"), ("hachana", "Preparing for the brit"), ("hachana/yom", "The day of the brit"), ("hachana/achrei", "Care after the brit"), ("hachana/keev", "Pain and soothing")]),
                    ("Preparation", [("hachana/kniyot", "Shopping list"), ("hachana/moed", "Brit date and jaundice"), ("hachana/tekes", "Preparing the ceremony"), ("hachana/sandak", "Sandek and honors"), ("hachana/mohel", "How to choose a mohel"), ("hachana/pidyon", "Pidyon haben")]),
                    ("Free tools", [("moed", "Brit date calculator"), ("checklist", "Preparation checklist"), ("madrich", "Guide for parents"), ("hazmana", "Brit invitation"), ("hazmana/brachot", "Blessings for a brit"), ("shirim", "Songs for a brit"), ("dapim", "Printable brit pages")])],
           "contact": "Contact", "wa_label": "(WhatsApp)", "mohalim": "Tools for mohels", "privacy": "Privacy (Hebrew)", "a11y": "Accessibility (Hebrew)",
           "end": "Gilad Rachamim Aviad, certified mohel · Jerusalem", "end2": "A brit with all the heart and soul",
           "copy": "© 2026 Gilad Rachamim Aviad · All rights reserved. Do not copy, reproduce or publish content, design or code from the site without written permission.",
           "share_h": "Know a family preparing for a brit? Send them this page.", "share_p": "Everything here is free, with no sign-up and no ads.",
           "share_btn": "Send on WhatsApp", "share_text": "Free brit milah guide for parents:", "fb": "A correction or suggestion? Write to Gilad",
           "fb_text": "Hello Gilad, a correction or suggestion about the brit pages for parents: ", "dock_def": "Parents' guide", "wa": "WhatsApp"},
    "ru": {"site": "Гилад Рахамим, моэль", "brand": "Гилад Рахамим · моэль", "nav": "Главная навигация", "dock": "Быстрые действия", "heb": "иврит",
           "wa_text": "Здравствуйте, Гилад, я читаю страницы о брит-миле для родителей. Хотел(а) спросить: ",
           "top": [("hachana", "Подготовка к брит-миле"), ("moed", "Калькулятор даты"), ("madrich", "Гид для родителей"), ("hazmana", "Приглашение")],
           "cols": [("Брит-мила", [("brit-mila", "Брит-мила шаг за шагом"), ("hachana", "Подготовка к брит-миле"), ("hachana/yom", "День брит-милы"), ("hachana/achrei", "Уход после брит-милы"), ("hachana/keev", "Боль и как успокоить")]),
                    ("Подготовка", [("hachana/kniyot", "Список покупок"), ("hachana/moed", "Дата брит-милы и желтуха"), ("hachana/tekes", "Подготовка церемонии"), ("hachana/sandak", "Сандак и почести"), ("hachana/mohel", "Как выбрать моэля"), ("hachana/pidyon", "Пидьон а-бен")]),
                    ("Бесплатные инструменты", [("moed", "Калькулятор даты брит-милы"), ("checklist", "Список подготовки"), ("madrich", "Гид для родителей"), ("hazmana", "Приглашение на брит-милу"), ("hazmana/brachot", "Поздравления на брит-милу"), ("shirim", "Песни для брит-милы"), ("dapim", "Страницы для печати")])],
           "contact": "Контакты", "wa_label": "(WhatsApp)", "mohalim": "Инструменты для моэлей", "privacy": "Конфиденциальность (иврит)", "a11y": "Доступность (иврит)",
           "end": "Гилад Рахамим Авиад, сертифицированный моэль · Иерусалим", "end2": "Брит-мила от всего сердца и всей души",
           "copy": "© 2026 Гилад Рахамим Авиад · Все права защищены. Не копируйте, не воспроизводите и не публикуйте материалы, дизайн или код сайта без письменного разрешения.",
           "share_h": "Знаете семью, которая готовится к брит-миле? Отправьте им эту страницу.", "share_p": "Здесь всё бесплатно, без регистрации и без рекламы.",
           "share_btn": "Отправить в WhatsApp", "share_text": "Бесплатный гид по брит-миле для родителей:", "fb": "Исправление или предложение? Напишите Гиладу",
           "fb_text": "Здравствуйте, Гилад, исправление или предложение по страницам о брит-миле для родителей: ", "dock_def": "Гид для родителей", "wa": "WhatsApp"},
}
def mohel_lang_href(lang, slug):
    """כתובת דף באתר הברית בשפת הדף אם קיים, אחרת הדף העברי + סימון."""
    s = slug.strip("/")
    if (SRC / "mohel" / lang / s / "index.html").is_file():
        return f"/mohel/{lang}/{s}/", ""
    return f"/mohel/{s}/", f' ({MOHEL_SITE_FRAME[lang]["heb"]})'

def mohel_site_lang(html, meta, lang, url):
    """המסגרת של src/layout.html (אתר הברית) בשפת הדף: מותג, תפריט, שיתוף במקום פנייה, תחתית ותפריט תחתון."""
    from urllib.parse import quote
    f = MOHEL_SITE_FRAME[lang]
    alt = meta.get("alt", {})
    wa = "https://wa.me/972584049049?text=" + quote(f["wa_text"])
    def a(slug, label, cur=""):
        h, mark = mohel_lang_href(lang, slug)
        return f'<a href="{h}"{cur}>{label}{mark}</a>'
    html = html.replace('<meta property="og:site_name" content="גילעד רחמים המוהל">', f'<meta property="og:site_name" content="{f["site"]}">', 1)
    html = re.sub(r'(<a class="brand"[^>]*>.*?<b>)[^<]*(</b>)', lambda m: m.group(1) + f["brand"] + m.group(2), html, count=1, flags=re.S)
    langs = "".join(f'<a href="{alt[l]}" hreflang="{l}" lang="{l}"' + (' aria-current="true"' if l == lang else "") + f'>{n}</a>'
                    for l, n in (("he", "עברית"), ("en", "English"), ("ru", "Русский")) if l in alt)
    top = "".join(a(s, t, ' aria-current="page"' if meta.get("nav") == s else "") for s, t in f["top"])
    nav = f'<nav class="topnav" aria-label="{f["nav"]}">{top}<a class="wa" href="{wa}" rel="noopener">{f["wa"]}</a>{langs}</nav>'
    html = re.sub(r'<nav class="topnav" aria-label="[^"]*">.*?</nav>', lambda m: nav, html, count=1, flags=re.S)
    share = "https://wa.me/?text=" + quote(f["share_text"] + " " + url)
    fb = "https://wa.me/972584049049?text=" + quote(f["fb_text"])
    sec = (f'<section id="contact" class="contact no-print" aria-labelledby="contact-h"><div class="wrap"><h2 id="contact-h">{f["share_h"]}</h2><p>{f["share_p"]}</p>'
           f'<div class="actions"><a class="btn btn-gold" href="{share}" target="_blank" rel="noopener"><svg class="ic"><use href="#wa"/></svg> {f["share_btn"]}</a>'
           f'<a class="btn btn-line" href="{fb}" target="_blank" rel="noopener">{f["fb"]}</a></div></div></section>')
    html = re.sub(r'<section id="contact" class="contact".*?</section>', lambda m: sec, html, count=1, flags=re.S)
    cols = "".join(f'<div><b>{h}</b>' + "".join(a(s, t) for s, t in items) + '</div>' for h, items in f["cols"])
    foot = ('<footer class="site-foot"><div class="cols">' + cols +
            f'<div><b>{f["contact"]}</b><a href="{wa}"><span dir="ltr" style="white-space:nowrap">058-404-9049</span> {f["wa_label"]}</a>'
            f'<a href="mailto:{CONTACT_MAIL}">{CONTACT_MAIL}</a><a href="/kodesh/mohalim/{lang}/">{f["mohalim"]}</a>'
            f'<a href="/mohel/privacy/">{f["privacy"]}</a><a href="/mohel/negishut/">{f["a11y"]}</a></div></div>'
            f'<div class="end"><span><span lang="he" dir="rtl">בס"ד</span> · {f["end"]}</span><span>{f["end2"]}</span></div>'
            f'<p class="copy">{f["copy"]}</p></footer>')
    html = re.sub(r'<footer class="site-foot">.*?</footer>', lambda m: foot, html, count=1, flags=re.S)
    dh = meta.get("dock_href") or mohel_lang_href(lang, "madrich")[0]
    dock = (f'<nav class="dock" aria-label="{f["dock"]}"><a class="btn btn-gold" href="{wa}">{f["wa"]}</a>'
            f'<a class="btn btn-line" href="{dh}">{meta.get("dock_label") or f["dock_def"]}</a></nav>')
    html = re.sub(r'<nav class="dock" aria-label="[^"]*">.*?</nav>', lambda m: dock, html, count=1, flags=re.S)
    return html

def giur_cta(lang, url):
    """בלוק פנייה לגילעד לברית מילה למבוגרים בסוף כל דף גיור (עברית/אנגלית/רוסית), חוץ מדף הברית עצמו."""
    from urllib.parse import quote
    if "/brit-mila-lager/" in url or "/kodesh/giur/" not in url:
        return ""
    base = {"he": "/kodesh/giur/", "en": "/kodesh/giur/en/", "ru": "/kodesh/giur/ru/"}[lang]
    wa = "https://wa.me/972584049049?text=" + quote(GIUR_WA_TEXT[lang])
    if lang == "he":
        h, pp, b1, b2 = ("צריכים ברית מילה למבוגרים או הטפת דם ברית?",
                         "כתבו לי, גילעד, בווטסאפ ואדאג לכם באהבה: אקשיב, אסביר ואחבר אתכם למוהל מקצועי ומנוסה בקליניקה מסודרת. בלי התחייבות.",
                         "לכתוב לגילעד בווטסאפ", "עוד על ברית מילה בגיור")
    else:
        f = LANG_FRAME[lang]
        h, pp, b1, b2 = f["cta_h"], f["cta_p"], f["cta_wa"], f["cta_more"]
    return (f'<section class="k-sec giur-cta no-print" aria-labelledby="gcta-h"><h2 id="gcta-h">{h}</h2><p>{pp}</p>'
            f'<div class="gr-acts"><a class="gr-btn gold" href="{wa}" rel="noopener" data-gcta="wa">{b1}</a>'
            f'<a class="gr-btn" href="{base}brit-mila-lager/">{b2}</a></div></section>\n')

def lang_page(html, meta, url):
    """עוטף דף בשפה אחרת: html ltr, וכל המסגרת (תפריט, משוב, תחתית, התקנה) מתורגמת לשפת הדף."""
    from urllib.parse import quote
    lang = meta.get("lang")
    ui = LANG_UI[lang]
    f = LANG_FRAME[lang]
    alt = meta.get("alt", {})
    html = html.replace('<html lang="he" dir="rtl">', f'<html lang="{lang}" dir="ltr">', 1)
    html = html.replace('<meta property="og:locale" content="he_IL">', f'<meta property="og:locale" content="{ui["locale"]}">', 1)
    html = html.replace('<a class="skip" href="#main">דילוג לתוכן</a>', f'<a class="skip" href="#main">{ui["skip"]}</a>', 1)
    html = html.replace('<nav class="crumbs" aria-label="פירורי לחם">', f'<nav class="crumbs" aria-label="{ui["crumbs"]}">', 1)
    if not meta.get("site"):  # אתר הברית להורים (src/layout.html)
        return mohel_site_lang(html, meta, lang, url)
    wa ="https://wa.me/972584049049?text=" + quote(GIUR_WA_TEXT[lang])
    giur = "/kodesh/giur/" in url
    base = f"/kodesh/giur/{lang}/" if giur else f"/kodesh/mohalim/{lang}/"
    if not giur:
        wa = "https://wa.me/972584049049?text=" + quote(MOHEL_FRAME[lang]["wa_text"])
    langs = "".join(f'<a href="{alt[l]}" hreflang="{l}" lang="{l}"' + (' aria-current="true"' if l == lang else "") + f'>{n}</a>'
                    for l, n in (("he", "עברית"), ("en", "English"), ("ru", "Русский")) if l in alt)
    if giur:
        nav = (f'<nav class="topnav" aria-label="{f["navlabel"]}"><a href="{base}">{f["roadmap"]}</a><a href="{base}brit-mila-lager/">{f["brit"]}</a>'
               f'<a href="{wa}" rel="noopener">{f["write"]}</a>{langs}</nav>')
    else:
        mf = MOHEL_FRAME[lang]
        nav = (f'<nav class="topnav" aria-label="{f["navlabel"]}"><a href="{base}">{mf["tools"]}</a>'
               f'<a href="{wa}" rel="noopener">{f["write"]}</a>{langs}</nav>')
    html = re.sub(r'<nav class="topnav" aria-label="[^"]*">.*?</nav>', lambda m: nav, html, count=1, flags=re.S)
    html = re.sub(r'(<a class="brand"[^>]*>.*?<b>)[^<]*(</b>)', lambda m: m.group(1) + f["brand"] + m.group(2), html, count=1, flags=re.S)
    html = re.sub(r'<a class="brand-sub"[^>]*>[^<]*</a>', "", html, count=1)
    html = html.replace('aria-label="לדף הראשי של מיזם הכלים"', 'aria-label="' + f["brand_label"] + '"', 1)
    html = html.replace('aria-label="חיפוש כלי"', 'aria-label="' + f["search_label"] + '"', 1)
    full = url
    if giur:
        share = "https://wa.me/?text=" + quote(f["share_text"] + " " + full)
        fb = "https://wa.me/972584049049?text=" + quote(f["fb_text"])
        fbsec = (f'<section class="fb no-print" id="fb"><div class="in"><p class="fb-q">{f["share_h"]}</p>'
                 f'<p><a class="btn btn-gold btn-sm" href="{share}" target="_blank" rel="noopener">💬 {f["share_btn"]}</a></p>'
                 f'<p class="fb-note"><a class="gold" href="{fb}" target="_blank" rel="noopener">{f["feedback"]}</a></p></div></section>')
    else:
        mf = MOHEL_FRAME[lang]
        share = "https://wa.me/?text=" + quote(mf["share_text"] + " " + full)
        fb = "https://wa.me/972584049049?text=" + quote(mf["fb_text"])
        fbsec = (f'<section class="fb no-print" id="fb"><div class="in"><p class="fb-q">{mf["share_h"]}</p>'
                 f'<p><a class="btn btn-gold btn-sm" href="{share}" target="_blank" rel="noopener">💬 {f["share_btn"]}</a></p>'
                 f'<p class="fb-note"><a class="gold" href="{fb}" target="_blank" rel="noopener">{mf["feedback"]}</a></p></div></section>')
    cta = giur_cta(lang, url)
    html = re.sub(r'<section class="fb no-print".*?</section>', lambda m: cta + fbsec, html, count=1, flags=re.S)
    he_a = lambda href, t: f'<a href="{href}">{t}</a>'
    foot = ('<footer class="site-foot ft"><div class="cols">'
            f'<div><b>{f["contact"]}</b><a href="{wa}"><span dir="ltr" style="white-space:nowrap">058-404-9049</span> {f["wa_label"]}</a><a href="mailto:{CONTACT_MAIL}">{CONTACT_MAIL}</a></div>'
            f'<div><b>{f["links"]}</b>{he_a("/mohel/", f["heb"])}{he_a("/kelim/", f["tools"])}{he_a("/mohel/privacy/", f["privacy"])}</div></div>'
            '<ul class="ft-promise">' + "".join(f"<li>✓ {t}</li>" for t in f["promise"]) + '</ul>'
            f'<div class="end"><span>{f["end"]}</span><span><a class="ft-up" href="#" data-ft="up">{f["up"]} ↑</a></span></div></footer>')
    html = re.sub(r'<footer class="site-foot ft".*?</footer>', lambda m: foot, html, count=1, flags=re.S)
    inst = (f'<div class="install-bar" id="install-bar" role="region" aria-label="{f["install_l"]}" hidden><span data-install-text>📲 {f["install_t"]}</span>'
            f'<button class="btn btn-gold btn-sm" type="button" data-install>{f["install_b"]}</button>'
            f'<button class="x" type="button" data-install-close aria-label="{f["install_x"]}">×</button></div>')
    html = re.sub(r'<div class="install-bar".*?</div>', lambda m: inst, html, count=1, flags=re.S)
    return html

def hreflang(meta):
    alt = meta.get("alt")
    if not alt:
        return ""
    out = "".join(f'<link rel="alternate" hreflang="{l}" href="{BASE}{u}">' for l, u in alt.items())
    return out + (f'<link rel="alternate" hreflang="x-default" href="{BASE}{alt["he"]}">' if "he" in alt else "")
def in_sitemap(meta):
    """דף עם noindex - גם בדגל וגם כשהוכנס ידנית ב-head - לא נכנס למפת האתר.
    גוגל מתריע כשדף במפה חסום ב-noindex (סרץ' קונסול, 16.11.2026)."""
    return not meta.get("noindex") and not re.search(r"<meta[^>]+name=.robots.[^>]*noindex", meta.get("head", ""), re.I)

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
    # דפים בשפה אחרת (אנגלית/רוסית, "lang" ב-meta) לא נספרים כילדים של מרכז בשפה אחרת
    lang = INDEX.get(p, {}).get("lang", "he")
    return [c for c in INDEX if c != p and seo_parent(c) == p and c.rstrip("/").rsplit("/", 1)[1] not in SEO_SKIP
            and INDEX[c].get("lang", "he") == lang]

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
             "url": url, "inLanguage": meta.get("lang", "he"), "isAccessibleForFree": True, "author": SEO_AUTHOR,
             "mainEntity": {"@type": "ItemList", "itemListElement": [
                 {"@type": "ListItem", "position": i, "name": INDEX[c]["_name"], "url": BASE + c}
                 for i, c in enumerate(seo_children(p), start=1)]}}
    else:
        cat = ("GameApplication" if "/chashiva/" in p and "/kita/" not in p
               else "EducationalApplication" if meta["site"] == "limudim" or "/tichnut/" in p
               else "UtilitiesApplication")
        d = {"@context": "https://schema.org", "@type": "WebApplication", "name": meta["_name"], "description": desc,
             "url": url, "inLanguage": meta.get("lang", "he"), "applicationCategory": cat, "operatingSystem": "Any",
             "browserRequirements": LANG_UI.get(meta.get("lang"), {}).get("browser", "דפדפן רגיל בטלפון או במחשב, בלי התקנה."),
             "isAccessibleForFree": True, "offers": {"@type": "Offer", "price": "0", "priceCurrency": "ILS"},
             "author": SEO_AUTHOR, "publisher": SEO_AUTHOR,
             "isPartOf": {"@type": "WebSite", "name": site["name"], "url": BASE + site["home"]}}
    return '<script type="application/ld+json">' + json.dumps(d, ensure_ascii=False) + "</script>"

def seo_related(p):
    meta = INDEX.get(p)
    if not meta or meta.get("no_rel") or seo_is_hub(p) or p.rstrip("/").rsplit("/", 1)[1] in SEO_SKIP:
        return ""
    v2 = seo_related_v2(p, meta)
    if v2 is not None:
        return v2
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
    ui = LANG_UI.get(meta.get("lang"))
    if ui:
        more = f'<p class="rel-all"><a class="gold" href="{par}">{ui["all"]} “{html_lib.escape(INDEX[par]["_name"], quote=False)}” →</a></p>' if par in INDEX else ""
    else:
        more = f'<p class="rel-all"><a class="gold" href="{par}">לכל הכלים של ״{html_lib.escape(INDEX[par]["_name"], quote=False)}״ ←</a></p>' if par in INDEX else ""
    return ('\n<section class="k-sec rel no-print" aria-labelledby="rel-h">\n  <h2 id="rel-h">' + (ui["rel"] if ui else "עוד כלים בחינם שאולי יעזרו") + '</h2>\n  <div class="dom">'
            + "".join(card(c) for c in pick) + f"</div>\n  {more}\n</section>\n")

# ---------- מפת האתר לאנשים (/mapa/): כל הדפים שבמפת האתר, לפי אתר ותחום. נוצרת בכל build, אז לא מתיישנת ----------
# גילעד (17.11.2026): "כדאי את הדפים המרכזיים שמפנים לכל האתר כמו הדף הראשי או המפה". בדף: {{mapa}} במקום הרשימה.
MAPA_SITES = [("kelim", "/kelim/"), ("kodesh", "/kodesh/"), ("limudim", "/limudim/"), ("kesef", "/kesef/"), ("bait", "/bait/"),
              ("esek", "/esek/"), ("nefesh", "/nefesh/"), ("mohel", "/mohel/")]
def mapa_html():
    items = []
    for _p in sorted(SRC.rglob("*.html")):
        _raw = _p.read_text(encoding="utf-8")
        _m = re.match(r"\s*<!--meta\s*(\{.*?\})\s*-->", _raw, re.S)
        if not _m:
            continue
        _meta = json.loads(_m.group(1))
        if not in_sitemap(_meta) or _meta.get("no_mapa"):
            continue
        rel = _p.relative_to(SRC).as_posix()
        u = "/" + (rel[:-len("index.html")] if rel.endswith("index.html") else rel)
        if u == "/mapa/":
            continue
        _h1 = re.search(r"<h1[^>]*>(.*?)</h1>", _raw, re.S)
        name = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", _h1.group(1))).strip() if _h1 else ""
        name = name or re.split(r"\s[–—|]\s|:\s", _meta["title"])[0].strip()
        items.append((u, name))
    names = dict(items)
    out, used = [], set()
    for key, home in MAPA_SITES:
        mine = [(u, n) for u, n in items if u.startswith(home)]
        if not mine:
            continue
        used.update(u for u, _ in mine)
        title = SITES[key]["name"] if key in SITES else "אתר המוהל – ברית מילה"
        groups = {}
        for u, n in mine:
            seg = u[len(home):].split("/")[0]
            groups.setdefault(seg, []).append((u, n))
        loose = [it for s, g in groups.items() for it in g if s == "" or len(g) < 2]
        sid = "m-" + key
        out.append(f'<section class="mp-site" aria-labelledby="{sid}"><h2 id="{sid}"><a href="{home}">{html_lib.escape(title, quote=False)}</a> <small>{len(mine)} דפים</small></h2>')
        if loose:
            out.append('<ul class="mp-list">' + "".join(f'<li><a href="{u}">{html_lib.escape(n, quote=False)}</a></li>' for u, n in loose) + "</ul>")
        for seg, g in groups.items():
            if seg == "" or len(g) < 2:
                continue
            dhome = home + seg + "/"
            dname = names.get(dhome, seg)
            out.append(f'<details class="mp-dom" open><summary><a href="{dhome}">{html_lib.escape(dname, quote=False)}</a> <small>{len(g)}</small></summary><ul class="mp-list">'
                       + "".join(f'<li><a href="{u}">{html_lib.escape(n, quote=False)}</a></li>' for u, n in g if u != dhome) + "</ul></details>")
        out.append("</section>")
    rest = [(u, n) for u, n in items if u not in used]
    if rest:
        out.append('<section class="mp-site" aria-labelledby="m-od"><h2 id="m-od">עוד דפים</h2><ul class="mp-list">'
                   + "".join(f'<li><a href="{u}">{html_lib.escape(n, quote=False)}</a></li>' for u, n in rest) + "</ul></section>")
    fresh = ('<section class="mp-site" aria-labelledby="m-new"><h2 id="m-new">חדש באתר</h2><ul class="mp-list">'
             + "".join(f'<li><a href="{u}">{html_lib.escape(names.get(u, n), quote=False)}</a></li>' for u, n, _ in latest_pages()) + "</ul></section>")
    return f'<p class="mp-count">{len(items)} דפים באתר, כולם בחינם.</p>\n' + fresh + "\n" + "\n".join(out)

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
# פס "החדשות ב-3 דקות" (18.11.2026, תוכנית העצמת החדשות): בדף הבית של הכלים ובדפים הנצפים ביותר לפי GA4 (21.10–18.11).
# פס דק ורגוע בראש התוכן, לא קופץ ולא מסתיר, בלי כותרות חדשות (רוגע בדפי הכלים). news-bar.js ממלא רק את שם המהדורה והשעה.
NEWSBAR_PAGES = {"/kelim/", "/kodesh/", "/kelim/tamlul/", "/kodesh/mohalim/", "/kelim/shikum/", "/kelim/machshev/fax/",
                 "/kelim/machshev/chatima/", "/limudim/dapim/", "/kelim/kehila/trempim/", "/kodesh/mohalim/bli-atar/",
                 "/kodesh/kartis/", "/kelim/tochen/tirgum/"}
NEWSBAR_URL = "/kelim/machshev/chadashot/?utm_source=home"
NEWSBAR_HTML = ('<aside class="newsbar no-print" data-newsbar aria-label="החדשות ב-3 דקות">'
                f'<a class="nb-main" href="{NEWSBAR_URL}" data-nb="open"><span class="nb-ic" aria-hidden="true">📰</span>'
                '<span class="nb-txt"><b>החדשות ב-3 דקות</b> <span class="nb-ed" data-nb-ed>המהדורה האחרונה</span>'
                '<span class="nb-sub">5 נקודות רגועות, 3 פעמים ביום</span></span><span class="nb-go" aria-hidden="true">←</span></a>'
                f'<a class="nb-bell" href="{NEWSBAR_URL}#nw-push" data-nb="bell" aria-label="לקבל התראה כשהסיכום יוצא">🔔<span class="nb-bell-t"> לקבל התראה</span></a></aside>')


# דפים שבהם הפס העונתי (discover.js) מוטמע מיד אחרי פס החדשות, כדי שלא ידחוף את הכותרת אחרי הטעינה (CLS)
HUB_INLINE = {"/kodesh/"}


def news_bar(url_path):
    bar = NEWSBAR_HTML if url_path in NEWSBAR_PAGES else ""
    if url_path in HUB_INLINE:
        bar += "<script>" + (ROOT / "assets" / "discover.js").read_text(encoding="utf-8") + "</script>"
    return bar


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
        chips, sub = ["בחינם", "ללא הגבלה", "בלי פרסומות"], "לכולם מכסה בחינם<span class=\"no-app\">, ולשותפים במיזם ללא הגבלה</span>. בלי פרסומות, מתוך רצון לעשות חסד."
    elif any(map(nop, below)):  # דף מרכז שיש מתחתיו כלי כזה
        chips, sub = ["הכול בחינם", "בלי פרסומות", "רוב הכלים ללא שום הגבלה"], CHESED_SUB
    else:
        chips, sub = ["בחינם", "ללא הגבלה", "בלי פרסומות"], CHESED_SUB
    if not meta.get("_login"):  # שער המקום הראשון (17.11.2026): בכל דף כתוב במפורש "בלי הרשמה"; לא בדף עם כניסת גוגל
        sub = sub.replace("בלי פרסומות, מתוך", "בלי הרשמה ובלי פרסומות, מתוך") if "בלי פרסומות, מתוך" in sub else sub.replace("כאן לא, מתוך", "כאן לא, וגם בלי הרשמה – מתוך")
    ui = LANG_UI.get(meta.get("lang"))
    if ui:
        return ('<div class="chesed no-print" role="note"><p class="chesed-t">' + "".join(f"<b>✓ {c}</b>" for c in ui["chips"])
                + f'</p><p class="chesed-s">{ui["sub"]}</p></div>')
    box = CHESED_CODE if any(p.startswith(l) for l in CHESED_PARTNER) and not p.startswith("/kelim/shir/karaoke/") else ""  # בקריוקי השותפות בתוך הבוט
    return ('<div class="chesed no-print" role="note"><p class="chesed-t">' + "".join(f"<b>✓ {c}</b>" for c in chips)
            + f'</p><p class="chesed-s">{sub}</p>{box}</div>')

# הפניה שקטה לקורס אחרי כל כלי (24.11.2026, גילעד: "הכלי האולטימטיבי שיבנה עבורכם את כל הכלים... חלק מהמיזם").
# שורה אחת, בלי חלון קופץ ובלי חסימה; no-app = לא מופיעה באפליקציות Play. אין בדפי noindex, מצוקה, תפילה, גיור, אבל וזכרון.
# מתג ביטול לדף: "no_kurs": true. הסיבות לכל החרגה: דף שנקרא בזמן טקס/אבל/מצוקה, או דף שהוא עצמו מכירה/מרכז.
KURS_SKIP_PREFIX = ("/nefesh/", "/mohel/", "/kodesh/giur/", "/kodesh/azkara/", "/kodesh/kaddish/", "/kodesh/yahrzeit/", "/kodesh/tziyud/",
                    "/kodesh/boker/", "/kodesh/mincha/", "/kodesh/arvit/", "/kodesh/musaf-chol-hamoed/", "/kodesh/musaf-rosh-chodesh/",
                    "/kodesh/havdala/", "/kodesh/kiddush/", "/kodesh/birkat-hamazon/", "/kodesh/brachot/", "/kodesh/brachon/",
                    "/kodesh/nishmat-kol-chai/", "/kodesh/modeh-ani/", "/kodesh/hodaot/", "/kodesh/misheberach/", "/kodesh/tehillim/",
                    "/kodesh/dapei-tefila/", "/kodesh/tefilat-haderech/", "/kodesh/shut/", "/kodesh/tefillin/", "/kodesh/tahara/",
                    "/kelim/claude/kurs/", "/kelim/claude/shutafim/", "/claude-kvutza/", "/kelim/shutafim/", "/kelim/pratiut/", "/kelim/negishut/",
                    "/kelim/bakasha/", "/kelim/katalog/", "/kelim/shipurim/")
KURS_SKIP_EXACT = {"/kelim/"}  # דף הבית והקטלוג מקבלים מקטע משלהם, לא פס
KURS_BAND = ('<aside class="kurs-band no-print no-app" aria-label="ללמוד לבנות כלים"><p>את הכלי הזה בניתי עם Claude, בלי להיות מתכנת. '
             'רוצים לבנות כלי כזה בעצמכם? <a href="/kelim/claude/kurs/?utm_source=tool" data-kurs="band">להכיר את הקורס ←</a></p></aside>')


def kurs_band(p, meta):
    if meta.get("noindex") or meta.get("no_kurs") or meta.get("no_chesed") or meta.get("lang") or p in KURS_SKIP_EXACT:
        return ""
    if p.startswith(KURS_SKIP_PREFIX) or p.rstrip("/").rsplit("/", 1)[-1] in CHESED_SKIP:
        return ""
    return KURS_BAND


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
    if not sp.exists():
        sp = DEMO_SPECS / "auto" / f"{tool}.json"  # מפרט שנוצר אוטומטית מתוכן הדף (autospec.py)
    spec = json.loads(sp.read_text(encoding="utf-8")) if sp.exists() else {}
    dur = spec.get("duration") or sum(s.get("dur", 0) for s in spec.get("scenes", [])) or 45
    wide = spec.get("wide")  # סרטון הדרכה לרוחב (16:9), למשל צילומי מסך של מחשב
    name = spec.get("name", "ככה זה עובד")
    yt = spec.get("youtube", "")  # קישור לסרטון ביוטיוב (Shorts) – כפתור צפייה + sameAs ב-VideoObject
    v, poster = f"/assets/demo/{tool}.mp4", f"/assets/demo/{tool}.jpg"
    post, status = f"/assets/demo/{tool}-post.png", f"/assets/demo/{tool}-status.png"
    has_fl = (DEMO_DIR / f"{tool}-post.png").exists()
    share_txt = meta.get("og_title", meta["title"]).split(" | ")[0]
    fl = (f'<details class="dv-fl"><summary>📄 פרוספקט לשיתוף – תמונה אחת שמסבירה הכול</summary>'
          f'<a href="{post}" target="_blank" rel="noopener"><img src="{post}" alt="פרוספקט: {html_lib.escape(name)}" loading="lazy" width="1080" height="1350"></a>'
          f'<div class="dv-acts"><button type="button" class="btn btn-gold" data-dv-share="{post}" data-dv-kind="flyer">💌 לשלוח את הפרוספקט</button>'
          f'<a class="btn btn-line" href="{post}" download data-dv-dl="flyer">⬇️ להורדה (פוסט)</a>'
          + (f'<a class="btn btn-line" href="{status}" download data-dv-dl="status">⬇️ להורדה (סטטוס)</a>' if (DEMO_DIR / f"{tool}-status.png").exists() else "")
          + '</div></details>') if has_fl else ""
    # גילעד 15.11.2026: "הכל באהבה ממיזם הכלים... מיזם חינמי כדי להנגיש... לא הכל זה כסף!!" (בכלים רגישים בלי בקשת כסף)
    soft = re.search(r"^/nefesh/|azkara|avel|shiva|levaya|kadish|rega|tmicha", url.replace(BASE, ""))
    help_row = ('<p class="dv-help">💛 <b>באהבה ממיזם הכלים של גילעד רחמים</b> · מיזם חינמי להנגשה. לא הכול זה כסף: '
                + ('מכירים מישהו שזה יעזור לו? שלחו לו את הדף.' if soft else
                   '<a href="/kelim/#truma">רעיון, תוכן או עזרה בהפצה</a>, או <a href="/kelim/#litmoch">שותפות במיזם</a>.') + '</p>')
    # "replace_demo" ב-madrichim.json: מדריך היוטיוב מחליף את סרטון ההדגמה הישן בדף הכלי; הפרוספקט לשיתוף נשאר
    mdr = MADRICHIM.get(tool) or {}
    old = not (mdr.get("replace_demo") and not meta.get("lang") and BASE + mdr.get("page", "") == url)
    video = (
        f'<video class="dv-video{' dv-wide' if wide else ''}" controls playsinline preload="none" poster="{poster}" width="{1280 if wide else 720}" height="{720 if wide else 1280}" aria-label="{html_lib.escape(spec.get("description", name))}" data-dv-play="{tool}">'
        f'<source src="{v}" type="video/mp4"></video>'
        f'<div class="dv-acts"><button type="button" class="btn btn-gold" data-dv-share="{v}" data-dv-kind="video">💌 לשלוח את הסרטון לחבר</button>'
        f'<a class="btn btn-line" href="{v}" download data-dv-dl="video">⬇️ להורדת הסרטון</a>'
        + (f'<a class="btn btn-line" href="{html_lib.escape(yt)}" target="_blank" rel="noopener" data-dv-dl="youtube">▶️ לצפייה ביוטיוב</a>' if yt else '')
        + '</div>')
    blk = (
        '<style>.dv-sec .dv-video{display:block;width:100%;max-width:20rem;aspect-ratio:9/16;height:auto;margin:.6rem auto 0;border-radius:1.2rem;background:#0e1628;box-shadow:0 8px 30px rgba(0,0,0,.35)}'
        '.dv-sec .dv-video.dv-wide{max-width:100%;aspect-ratio:16/9;border-radius:.8rem}'
        '.dv-acts{display:flex;flex-wrap:wrap;gap:.5rem;justify-content:center;margin-top:.9rem}.dv-acts .btn{font-size:.95rem}'
        '.dv-fl{margin-top:1rem}.dv-fl summary{cursor:pointer;color:var(--gold);font-weight:700;text-align:center}'
        '.dv-fl img{display:block;width:100%;max-width:24rem;height:auto;margin:.8rem auto 0;border-radius:1rem}'
        '.dv-help{text-align:center;font-size:.95rem;margin-top:1rem;color:var(--muted,inherit)}</style>'
        f'<section class="k-sec dv-sec no-print" aria-labelledby="dv-h"><h2 id="dv-h">{"🎬 " + html_lib.escape(name) if old else "💌 לשתף את הכלי"}</h2>'
        f'{video if old else ""}{fl}{help_row}'
        f'<script>window.DV_SHARE={json.dumps({"tool": tool, "text": share_txt, "url": url}, ensure_ascii=False)}</script>'
        '<script src="/assets/demo-share.js" defer></script></section>')
    ld = json.dumps({"@context": "https://schema.org", "@type": "VideoObject", "name": name,
                     "description": spec.get("description", meta["description"]),
                     "thumbnailUrl": [BASE + poster], "contentUrl": BASE + v,
                     "uploadDate": spec.get("upload", "2026-11-14T12:00:00+02:00"), "duration": f"PT{round(dur)}S",
                     "inLanguage": "he", "publisher": {"@type": "Person", "name": "גילעד רחמים", "url": BASE + "/kelim/"},
                     **({"sameAs": yt} if yt else {})}, ensure_ascii=False)
    return blk, f'<script type="application/ld+json">{ld}</script>' if old else ""

def insert_demo(content, blk):
    if not blk:
        return content.replace("<!--demo-->", "")
    if "<!--demo-->" in content:
        return content.replace("<!--demo-->", blk, 1)
    if "<!--seo-txt-->" in content:  # כלי או דף תחום: הכלי/הכרטיסים קודם, הסרטון לפני ההסברים
        return content.replace("<!--seo-txt-->", blk + "<!--seo-txt-->", 1)
    i = content.find("</header>")
    return content[: i + 9] + blk + content[i + 9:] if i >= 0 else blk + content

# מדריכי וידאו (25.11.2026): אזור מדריך מעוצב בכל דף כלי שיש לו סרטון ביוטיוב. הנתונים ב-tools/madrichim.json (מפתח = tool),
# הבלוק נכנס אחרי ה-header הראשון (או במקום <!--madrich-->), והנגן נטען רק בלחיצה (assets/madrich.js).
MADRICHIM_FILE = ROOT / "tools" / "madrichim.json"
MADRICHIM = json.loads(MADRICHIM_FILE.read_text(encoding="utf-8")) if MADRICHIM_FILE.exists() else {}

def mdr_time(sec):
    return f"{sec // 60}:{sec % 60:02d}"

def madrich_block(meta, url):
    tool = meta.get("tool", "")
    m = MADRICHIM.get(tool)
    if not m or meta.get("lang") or BASE + m["page"] != url:  # רק בדף הראשי של הכלי, לא בדפים אחרים עם אותו tool
        return "", "", ""
    e = html_lib.escape
    vid, title, name, dur = m["youtube"], m["title"], m["name"], m["duration"]
    watch = f"https://www.youtube.com/watch?v={vid}"
    slug = tool.replace("_", "-")  # קישור קצר מ-tools/go_short.py; בלי דף קצר - הקישור המלא
    share = f"{BASE}/go/v/{slug}/" if (ROOT / "go" / "v" / slug / "index.html").exists() else f"{url}?utm_source=share&utm_medium=madrich#madrich"
    wa = "https://wa.me/?text=" + urllib.parse.quote(f"מדריך וידאו קצר: {name} 👇\n{share}")
    chips = "".join(f'<li><a href="{watch}&amp;t={s}s" target="_blank" rel="noopener" data-mdr-sec="{s}"><b>{mdr_time(s)}</b> {e(n)}</a></li>' for s, n in m["chapters"])
    steps = "".join(f'<li><b>{e(t)}</b><span>{e(x)}</span></li>' for t, x in m["steps"])
    blk = (
        f'<section class="mdr no-print" id="madrich" aria-labelledby="mdr-h" data-mdr-tool="{tool}" data-mdr-id="{vid}" data-mdr-name="{e(title)}">'
        f'<div class="mdr-top"><h2 id="mdr-h">🎬 מדריך וידאו: {e(name)}</h2><span class="mdr-dur">{mdr_time(dur)} דקות</span></div>'
        '<p class="mdr-trust">בחינם · בלי הרשמה · בלי פרסומות</p>'
        '<div class="mdr-grid"><div class="mdr-media"><div class="mdr-frame">'
        f'<a class="mdr-play" href="{watch}" target="_blank" rel="noopener" data-mdr-play aria-label="הפעלת מדריך הווידאו: {e(title)}">'
        f'<img src="/{m["thumb"]}.webp" alt="" width="1280" height="720" {"loading=\"lazy\" " if m.get("lazy") else ""}decoding="async"><span class="mdr-btn" aria-hidden="true"></span></a></div>'
        f'<ul class="mdr-chips" aria-label="פרקים בסרטון">{chips}</ul></div>'
        f'<div class="mdr-steps"><h3>הצעדים בקצרה</h3><ol>{steps}</ol></div></div>'
        f'<div class="mdr-acts"><a class="btn btn-gold" href="{m["cta"]["anchor"]}" data-mdr-cta>{e(m["cta"]["text"])}</a>'
        f'<a class="btn btn-line" href="{e(wa)}" target="_blank" rel="noopener" data-mdr-share="{e(share)}">💌 לשלוח את המדריך לחבר</a></div>'
        '<p class="mdr-sig">הכנתי את המדריך בשבילכם. גילעד רחמים'
        + (' · <a href="/kelim/madrichim/">לכל המדריכים</a>' if (SRC / "kelim" / "madrichim" / "index.html").exists() else '')
        + '</p></section>')
    head = '<link rel="stylesheet" href="/assets/madrich.css"><script src="/assets/madrich.js" defer></script>'
    ends = [c[0] for c in m["chapters"][1:]] + [dur]
    ld = json.dumps({"@context": "https://schema.org", "@type": "VideoObject", "name": title, "description": m["description"],
                     "thumbnailUrl": [f'{BASE}/{m["thumb"]}.jpg'], "uploadDate": m["upload"] + "T12:00:00+02:00", "duration": f"PT{dur}S",
                     "embedUrl": f"https://www.youtube-nocookie.com/embed/{vid}", "contentUrl": watch, "inLanguage": "he",
                     "publisher": {"@type": "Person", "name": "גילעד רחמים", "url": BASE + "/kelim/"},
                     "hasPart": [{"@type": "Clip", "name": n, "startOffset": s, "endOffset": end, "url": f"{watch}&t={s}s"}
                                 for (s, n), end in zip(m["chapters"], ends)]}, ensure_ascii=False)
    return blk, f'<script type="application/ld+json">{ld}</script>', head

def insert_madrich(content, blk):
    if not blk:
        return content.replace("<!--madrich-->", "")
    if "<!--madrich-->" in content:
        return content.replace("<!--madrich-->", blk, 1)
    i = content.find("</header>")
    return content[: i + 9] + blk + content[i + 9:] if i >= 0 else blk + content

# דף "כל המדריכים": <!--madrich-hub--> מוחלף ברשת כרטיסים מתוך tools/madrichim.json (רק רשומות עם מזהה יוטיוב), ועוד ItemList
def madrich_hub(content):
    if "<!--madrich-hub-->" not in content:
        return content, ""
    e = html_lib.escape
    items = [(k, m) for k, m in MADRICHIM.items() if m.get("youtube")]
    cards = "".join(
        f'<li><a class="mdr-card" href="{m["page"]}#madrich"><span class="mdr-card-img"><img src="/{m["thumb"]}.webp" alt="" width="1280" height="720" loading="{"eager" if i < 2 else "lazy"}" decoding="async">'
        f'<span class="mdr-dur">{mdr_time(m["duration"])}</span></span><b>{e(m["title"])}</b><span class="mdr-card-more">לצפייה ולכלי ←</span></a></li>'
        for i, (k, m) in enumerate(items))
    ld = json.dumps({"@context": "https://schema.org", "@type": "ItemList", "name": "מדריכי וידאו",
                     "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": m["title"], "url": BASE + m["page"]} for i, (k, m) in enumerate(items)]}, ensure_ascii=False)
    return content.replace("<!--madrich-hub-->", f'<ul class="mdr-hub">{cards}</ul>', 1), f'<script type="application/ld+json">{ld}</script>'

# ---------- הקטלוג המאוחד (assets/catalog.json): מזין חיפוש, "עוד כלים", דף הבית והעונות ----------
def _git_added():
    import subprocess
    try:
        out = subprocess.run(["git", "-c", "core.quotepath=off", "log", "--diff-filter=A", "--format=@%cs", "--name-only", "--", "src/pages"],
                             cwd=ROOT, capture_output=True, text=True, encoding="utf-8", check=True).stdout
    except Exception:
        return {}
    added, cur = {}, datetime.date.today().isoformat()
    for line in out.splitlines():
        if line.startswith("@"):
            cur = line[1:]
        elif line.strip():
            added[line.strip()] = cur  # ההופעה הראשונה = ההוספה הישנה ביותר (הלוג הולך מהחדש לישן)
    return added
def build_catalog():
    disc = ROOT / "src" / "discover"
    tp = json.loads((disc / "topics.json").read_text(encoding="utf-8"))
    kw = json.loads((disc / "kw.json").read_text(encoding="utf-8"))
    pop = {}
    if (ROOT / "src" / "pop.json").exists():
        pop = json.loads((ROOT / "src" / "pop.json").read_text(encoding="utf-8"))
    added = _git_added()
    rows, fam = [], {}
    for _p in sorted(SRC.rglob("*.html")):
        _raw = _p.read_text(encoding="utf-8")
        _m = re.match(r"\s*<!--meta\s*(\{.*?\})\s*-->", _raw, re.S)
        if not _m:
            continue
        _meta = json.loads(_m.group(1))
        if not in_sitemap(_meta) or _meta.get("no_mapa"):
            continue
        rel = _p.relative_to(SRC).as_posix()
        u = "/" + (rel[:-len("index.html")] if rel.endswith("index.html") else rel)
        if u in ("/mapa/", "/") or u.startswith("/mohel/"):
            continue
        if any(u.startswith(i) for i in tp["info"]):
            continue
        _h1 = re.search(r"<h1[^>]*>(.*?)</h1>", _raw, re.S)
        h1 = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", _h1.group(1))).strip() if _h1 else ""
        name = h1 or re.split(r"\s[–—|]\s|:\s", _meta["title"])[0].strip()
        crumbs = _meta.get("crumbs") or []
        short = _meta.get("short") or (crumbs[-1][0] if crumbs else name)
        if len(short) > 22:
            short = short[:21].rstrip() + "…"
        rows.append({"u": u, "meta": _meta, "n": name, "s": short, "t": re.split(r"\s\|\s", _meta["title"])[0].strip(),
                     "d": (_meta.get("description") or "")[:120], "src": "src/pages/" + rel})
        fam.setdefault(_meta.get("tool"), []).append(u)
    heads = {k: min(v, key=lambda x: (x.count("/"), x)) for k, v in fam.items() if len(v) >= 3}
    byu = {r["u"]: r for r in rows}
    _today = datetime.date.today().isoformat()
    cutoff = (datetime.date.today() - datetime.timedelta(days=21)).isoformat()
    out, errs, notopic = [], [], []
    for r in rows:
        u, meta = r["u"], r["meta"]
        lang = meta.get("lang") or "he"
        parent = u.rstrip("/").rsplit("/", 1)[0] + "/"
        kind = meta.get("kind")
        if not kind:
            if lang != "he" or (INDEX.get(parent, {}).get("no_hub") and parent in byu):
                kind = "landing"
            elif meta.get("tool") in heads and heads[meta["tool"]] != u:
                kind = "landing"
            elif seo_is_hub(u):
                kind = "hub"
            else:
                kind = "tool"
        # נושא: ההתחלה הארוכה ביותר שמתאימה; דף שפה יורש מהדף העברי (אחרי /en/ או /ru/)
        base = re.sub(r"/(en|ru)(/|$)", "/", u) if lang != "he" else u
        g = next((t["id"] for t in tp["topics"] if base in t.get("exact", []) or any(base.startswith(p) for p in t["prefix"])), None)
        if not g:
            notopic.append(u)
            continue
        # מילות הקשר: רשומה ישירה, אחרת ירושה מראש המשפחה או מההורה הקרוב
        k = kw.get(u)
        if k is None:
            cand = [heads.get(meta.get("tool"))] if meta.get("tool") in heads else []
            q = base
            while q.count("/") > 1:
                q = q.rstrip("/").rsplit("/", 1)[0] + "/"
                cand.append(q)
            k = next((kw[c] for c in cand if c and c in kw), None)
            if k is None and kind in ("tool", "hub"):
                errs.append(u)
            k = k or ""
        soft = bool(re.search(r"^/nefesh/|azkara|avel|shiva|levaya|kadish|rega|tmicha", u))
        added_d = added.get(r["src"], _today)
        e = next(t["e"] for t in tp["topics"] if t["id"] == g)
        out.append({"u": u, "n": r["n"], "d": r["d"], "t": r["t"], "s": r["s"], "g": g, "e": e, "k": "" if kind == "landing" else k, "ty": kind,
                    "nw": added_d, "p": pop.get(u, 0), "l": lang, "sf": 1 if soft else 0})
    # "חדש": רק 12 הכלים העבריים החדשים ביותר מ-21 הימים האחרונים (האתר צעיר – אחרת הכול "חדש"); לא בדפים רגישים
    fresh = sorted((x for x in out if x["ty"] == "tool" and x["l"] == "he" and not x["sf"] and x["nw"] >= cutoff), key=lambda x: (x["nw"], x["u"]), reverse=True)[:12]
    keep = {x["u"] for x in fresh}
    for x in out:
        if x["u"] not in keep:
            x["nw"] = ""
    if notopic:
        print("catalog: דפים בלי נושא (תקנו את src/discover/topics.json):")
        for u in notopic:
            print("  ", u)
    if errs:
        print("catalog: כלים בלי מילות הקשר (הוסיפו ל-src/discover/kw.json):")
        for u in errs:
            print("  ", u)
    if notopic or errs:
        raise SystemExit("catalog: נכשל – חסר נושא או מילות הקשר")
    return tp, out

_CAT = {}
def catalog():
    if not _CAT:
        _CAT["tp"], _CAT["out"] = build_catalog()
    return _CAT["tp"], _CAT["out"]
TOPIC_PAGES = {"/kelim/atzmaim/", "/kelim/machshev/kelei-pdf/"}  # דפי נושא ייעודיים שמקושרים מהקטלוג מעבר לעמוד הראשי של הנושא
def katalog_fill(html):
    cat = catalog()[1]
    tools = [x for x in cat if x["ty"] == "tool" and x["l"] == "he" and not x["sf"] and x["u"] != "/kelim/katalog/"]
    sh = lambda x: x["n"].split(":")[0].split(",")[0].split(" – ")[0].strip()[:60]
    esc = lambda t: t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    top = sorted(tools, key=lambda x: (-x["p"], x["u"]))[:12]
    html = html.replace("<!--KATALOG-N-->", str(len(tools)))
    html = html.replace("<!--KATALOG-TOP-->", "".join('<li><a href="%s">%s</a></li>' % (x["u"], esc(sh(x))) for x in top))
    tp = catalog_topics()
    parts = []
    for t in tp:
        ts = sorted((x for x in tools if x["g"] == t["id"]), key=lambda x: (-x["p"], x["n"]))
        if not ts:
            continue
        hubs = sorted((x for x in cat if x["ty"] == "hub" and x["g"] == t["id"] and x["l"] == "he" and not x["sf"]), key=lambda x: (x["u"].count("/"), x["u"]))
        hub = '<p class="kt-hub"><a href="%s">לעמוד הנושא: %s</a></p>' % (hubs[0]["u"], esc(t["n"])) if hubs else ""
        # עמודי נושא מיוחדים נוספים באותו נושא (למשל כלים לעצמאים), לא רק העמוד הראשי
        extra = [h for h in hubs[1:] if h["u"] in TOPIC_PAGES]
        if extra:
            hub += '<p class="kt-hub">עמודי נושא נוספים: %s</p>' % " · ".join('<a href="%s">%s</a>' % (h["u"], esc(h["n"])) for h in extra)
        parts.append('<details class="kt-d"><summary>%s %s <small>(%d כלים)</small></summary>%s<ul class="kt-list">%s</ul></details>' % (
            t["e"], esc(t["n"]), len(ts), hub, "".join('<li><a href="%s">%s</a></li>' % (x["u"], esc(sh(x))) for x in ts)))
    return html.replace("<!--KATALOG-TOPICS-->", "".join(parts))
def catalog_topics():
    return [t for t in json.loads((ROOT / "src" / "discover" / "topics.json").read_text(encoding="utf-8"))["topics"] if t.get("show", True)]
def write_catalog():
    tp, out = catalog()
    (ROOT / "assets" / "catalog.json").write_text(json.dumps({"v": today, "topics": [{"id": t["id"], "n": t["n"], "e": t["e"]} for t in tp["topics"] if t.get("show", True)], "items": out},
                                                             ensure_ascii=False, separators=(",", ":")), encoding="utf-8", newline="\n")
    print("catalog:", len(out), "pages;", sum(1 for x in out if x["ty"] == "tool"), "tools")

# ---------- "עוד כלים שיעזרו לכם" v2: שישה כרטיסים קבועים לכל עמוד כלי (2 אחים, 2 מתחום אחר, 1 הכי שימושי בנושא, 1 חדש) ----------
_STOPW = set("מתי איך אני לי של את על עם זה יש אין לא או גם כל מה אם אפשר רוצה צריך".split())
def _ktoks(k):
    return {w for w in re.sub(r"[^א-תa-z0-9 ]+", " ", k.lower()).split() if len(w) > 2 and w not in _STOPW}
def _h(a, b):
    return int(hashlib.md5((a + "|" + b).encode("utf-8")).hexdigest()[:8], 16)
REL_LOG = []   # (עמוד, [כרטיסים]) לבדיקה בסוף הבנייה
_RP = {}
def _rel_prep():
    if not _RP:
        tp, out = catalog()
        pool = [x for x in out if x["ty"] == "tool" and x["l"] == "he"]
        _RP["pool"] = pool
        _RP["by"] = {x["u"]: x for x in pool}
        _RP["kt"] = {x["u"]: _ktoks(x["k"]) for x in pool}
    return _RP
def seo_related_picks(p, meta):
    R = _rel_prep()
    it = R["by"].get(p)
    if not it:
        return None
    pool, kt = R["pool"], R["kt"]
    soft = bool(it["sf"])
    ok = lambda x: x["u"] != p and (soft or not x["sf"])
    used, picks = {p}, []
    def take(x, slot):
        used.add(x["u"]); picks.append((x, slot))
    par = seo_parent(p)
    # 1) שני אחים מאותה תיקייה (הבאים אחרי הדף, בסדר קבוע)
    sibs = sorted((x for x in pool if seo_parent(x["u"]) == par and ok(x)), key=lambda x: x["u"])
    after = [x for x in sibs if x["u"] > p] + [x for x in sibs if x["u"] < p]
    for x in after[:2]:
        take(x, "sib")
    # 2) שניים מתחום אחר: meta "rel" אם יש, אחרת דמיון מילות הקשר (שובר שוויון קבוע לפי גיבוב)
    cross = [R["by"][u] for u in (meta.get("rel") or []) if u in R["by"] and ok(R["by"][u]) and R["by"][u]["u"] not in used]
    for x in cross[:2]:
        take(x, "rel")
    if sum(1 for _, sl in picks if sl == "rel") < 2:
        mine = kt[p]
        cand = [x for x in pool if ok(x) and x["u"] not in used and x["g"] != it["g"] and (not soft or True)]
        def sim(x):
            o = kt[x["u"]]
            return len(mine & o) / ((len(mine) * len(o)) ** .5) if mine and o else 0
        cand.sort(key=lambda x: (-sim(x), -x["p"], _h(p, x["u"])))
        for x in cand:
            if sum(1 for _, sl in picks if sl == "rel") >= 2:
                break
            take(x, "rel")
    # 3) הכי שימושי בנושא: פופולריות, אחר כך דף רדוד (כלי ראשי), אחר כך עושר מילות ההקשר
    top = sorted((x for x in pool if ok(x) and x["u"] not in used and x["g"] == it["g"]),
                 key=lambda x: (-x["p"], x["u"].count("/"), -len(kt[x["u"]]), x["u"]))
    if top:
        take(top[0], "top")
    # 4) חדש (לא ברגישים): אחד מ-12 החדשים, נבחר לפי גיבוב כדי שלא יהיה אותו כלי בכל עמוד; בלי חדש – עוד מהנושא
    if not soft:
        fresh = sorted((x for x in pool if x["nw"] and ok(x) and x["u"] not in used), key=lambda x: x["u"])
        if fresh:
            take(fresh[_h(p, "new") % len(fresh)], "new")
    # השלמה עד שש: מהנושא, ואז מכל האתר, בסדר קבוע
    for grp in ([x for x in pool if ok(x) and x["g"] == it["g"]], [x for x in pool if ok(x)]):
        for x in sorted(grp, key=lambda x: _h(p, x["u"])):
            if len(picks) >= 6:
                break
            if x["u"] not in used:
                take(x, "fill")
    order = {"sib": 0, "rel": 1, "top": 2, "new": 3, "fill": 4}
    picks.sort(key=lambda t: order[t[1]])
    return picks[:6]
def seo_related_v2(p, meta):
    picks = seo_related_picks(p, meta)
    if picks is None:
        return None
    par = seo_parent(p)
    hub = par if par in INDEX and seo_is_hub(par) else None
    if not hub:
        hub = "/kelim/"
    REL_LOG.append((p, [x["u"] for x, _ in picks]))
    def card(x, slot):
        d = x["d"]
        d = d if len(d) <= 95 else d[:95].rsplit(" ", 1)[0].rstrip(" ,.:;–-(") + "…"
        new = '<span class="badge">חדש</span>' if slot == "new" and x["nw"] and not x["sf"] else ""
        return (f'<div class="rc" data-slot="{slot}">' + f'<a href="{x["u"]}">{html_lib.escape(x["n"], quote=False)}</a>' + new
                + f'<span>{html_lib.escape(d, quote=False)}</span></div>')
    cards = "".join(card(x, sl) for x, sl in picks)
    return ('\n<section class="k-sec rel rel-v2 no-print" aria-labelledby="rel-h" data-rel="6">\n  <h2 id="rel-h">עוד כלים שיעזרו לכם</h2>\n  <div class="dom">'
            + cards + '</div>\n  <p class="rel-all"><a class="gold" href="' + hub + '">לכל הכלים בנושא ←</a></p>\n</section>\n')
def rel_check():
    bad = []
    for p, us in REL_LOG:
        if len(us) != 6 or len(set(us)) != 6 or p in us or any(u not in INDEX for u in us):
            bad.append(p)
    print("related v2:", len(REL_LOG), "pages; violations:", len(bad))
    if bad:
        for p in bad[:20]:
            print("  ", p)
        raise SystemExit("related v2: נכשל – לא שישה כרטיסים שונים תקינים")


def write_discover():
    sea = json.loads((ROOT / "src" / "discover" / "seasons.json").read_text(encoding="utf-8"))["seasons"]
    by = {x["u"]: x for x in catalog()[1]}
    for s in sea:
        tl = []
        for u in s["tools"]:
            if u not in by:
                raise SystemExit("seasons.json: " + u + " לא קיים בקטלוג")
            tl.append({"u": u, "n": by[u]["n"].split(":")[0].split(",")[0].strip()[:40], "d": by[u]["d"][:90]})
        s["tools"] = tl
    js = (ROOT / "src" / "discover" / "discover.js").read_text(encoding="utf-8").replace("/*SEASONS*/[]", json.dumps(sea, ensure_ascii=False, separators=(",", ":")))
    (ROOT / "assets" / "discover.js").write_text(js, encoding="utf-8")
    if len(js.encode("utf-8")) > 6144:
        raise SystemExit("discover.js גדול מ-6KB: %d" % len(js.encode("utf-8")))
write_discover()
def write_discover2():
    jr = json.loads((ROOT / "src" / "discover" / "journeys.json").read_text(encoding="utf-8"))["journeys"]
    cat = catalog()[1]
    by = {x["u"]: x for x in cat}
    sh = lambda x: x["n"].split(":")[0].split(",")[0].split(" – ")[0].strip()[:40]
    J = []
    for j in jr:
        st = []
        for u in j["steps"]:
            if u not in by or by[u]["sf"]:
                raise SystemExit("journeys.json: " + u + " לא קיים בקטלוג או רגיש")
            st.append([u, sh(by[u])])
        J.append({"id": j["id"], "s": st})
    new = [[x["u"], sh(x)] for x in sorted((x for x in cat if x["ty"] == "tool" and x["l"] == "he" and not x["sf"] and x["nw"]), key=lambda x: (x["nw"], x["u"]), reverse=True)[:12]]
    sf = sorted(x["u"] for x in cat if x["sf"])
    dump = lambda o: json.dumps(o, ensure_ascii=False, separators=(",", ":"))
    js = (ROOT / "src" / "discover" / "discover2.js").read_text(encoding="utf-8").replace("/*JOURNEYS*/[]", dump(J)).replace("/*NEWTOOLS*/[]", dump(new)).replace("/*SENSITIVE*/[]", dump(sf))
    (ROOT / "assets" / "discover2.js").write_text(js, encoding="utf-8")
    hp = (ROOT / "src" / "discover" / "helper.js").read_text(encoding="utf-8").replace("/*NEWTOOLS*/[]", dump(new)).replace("/*SENSITIVE*/[]", dump(sf))
    (ROOT / "assets" / "helper.js").write_text(hp, encoding="utf-8")
    if len(js.encode("utf-8")) > 14336:
        raise SystemExit("discover2.js גדול מ-14KB")
write_discover2()
def latest_pages(n=10):
    """n הדפים העבריים האחרונים שנוספו לאתר (לפי git), עד 2 מאותה תיקייה, בלי ארכיון החדשות היומי ובלי דפים רגישים."""
    added, today, rows = _git_added(), datetime.date.today().isoformat(), []
    for _p in sorted(SRC.rglob("*.html")):
        _raw = _p.read_text(encoding="utf-8")
        _m = re.match(r"\s*<!--meta\s*(\{.*?\})\s*-->", _raw, re.S)
        if not _m:
            continue
        meta = json.loads(_m.group(1))
        rel = _p.relative_to(SRC).as_posix()
        u = "/" + (rel[:-len("index.html")] if rel.endswith("index.html") else rel)
        if (not in_sitemap(meta) or meta.get("no_mapa") or meta.get("lang") or u.startswith("/mohel/") or "/chadashot/archion/" in u
                or re.search(r"^/nefesh/|azkara|avel|shiva|levaya|kadish|rega|tmicha", u)):
            continue
        rows.append((added.get("src/pages/" + rel, today), u, meta))
    out, per = [], {}
    for _d, u, meta in sorted(rows, key=lambda r: (r[0], r[1]), reverse=True):
        parent = u.rstrip("/").rsplit("/", 1)[0]
        if per.get(parent, 0) < 2:
            per[parent] = per.get(parent, 0) + 1
            out.append((u, re.split(r"\s\|\s", meta["title"])[0].split(":")[0].split(" – ")[0].strip(), meta.get("description") or ""))
        if len(out) == n:
            break
    return out

def chadash_html():
    cards = "".join('<a href="%s"><span class="badge">חדש</span><b>%s</b><span>%s</span></a>' % (u, html_lib.escape(name, quote=False), html_lib.escape(d[:100], quote=False)) for u, name, d in latest_pages())
    return '<p class="lead2">10 הדפים שנוספו לאחרונה:</p><div class="dom">' + cards + '</div>'

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
    if "{{mapa}}" in content:
        content = content.replace("{{mapa}}", mapa_html())
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
    if meta.get("crumb_root"):  # דף בשפה אחרת: שם השורש בפירורי הלחם בשפת הדף
        root = (meta["crumb_root"], root[1])
    html = LAYOUT_MATANA if meta.get("bare") else (LAYOUT_KELIM if site else LAYOUT)
    content += "" if meta.get("bare") else seo_related(url_path)
    dv_blk, dv_ld = demo_block(meta, url) if site else ("", "")
    content = insert_demo(content, dv_blk)
    mdr_blk, mdr_ld, mdr_head = madrich_block(meta, url) if site else ("", "", "")
    content = insert_madrich(content, mdr_blk)
    content, mdr_list = madrich_hub(content)
    og_own = "og/" + url_path.strip("/").replace("/", "-") + ".jpg"
    og_default = og_own + "?v=4" if (site and (ROOT / "assets" / og_own).exists()) else (site["og"] if site else "og-mohel.jpg")
    # תיאור השיתוף (og:description) פותח ב"בחינם, בלי הגבלה ובלי הרשמה" - גילעד 11.11.2026.
    # כלי עם מכסה (CHESED_PARTNER) לא מקבל "בלי הגבלה"; כלי עם כניסת גוגל לא מקבל "בלי הרשמה". נפש נשאר בטון הרך שלו.
    og_desc = meta["description"]
    if site and meta.get("site") != "nefesh" and not meta.get("noindex") and not meta.get("lang"):
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
        "head": meta.get("head_pre", "") + ("" if meta.get("no_ga") else ga_for(meta, url_path)) + pixel_for(meta, url_path) + ("" if meta.get("bare") else KISHUR) + meta.get("head", "") + crumbs_ld(meta.get("crumbs"), url, root) + seo_ld(url_path, url) + dv_ld + mdr_head + mdr_ld + mdr_list + hreflang(meta),
        "body_class": meta.get("body_class", ""),
        "sprite": SPRITE,
        "wa": WA,
        "crumbs": crumbs_html(meta.get("crumbs"), root),
        "content": content,
        "cta": "" if (meta.get("no_cta") or site) else CTA.format(wa=WA, mail=CONTACT_MAIL),
        "dock_href": meta.get("dock_href", "/mohel/madrich/"),
        "dock_label": meta.get("dock_label", "מדריך חינם"),
        "chadash": chadash_html() if "{{chadash}}" in raw else "",
        "foot": meta.get("foot", "") + ('<script src="/assets/lead.js" defer></script>' if "data-lead" in content else "") + ('<script src="/assets/moed.js" defer></script>' if "moed-form" in content else "") + ('<script src="/assets/yt.js" defer></script>' if 'class="yt"' in content else ""),
    }
    if site:
        key = meta["site"]
        # גרשיים בתוך מאפיין HTML (content="...") שוברים אותו: בתת-האתרים הופכים " ל-״ (שו"ת → שו״ת)
        for k in ("title", "description", "og_title", "og_description"):
            rep[k] = rep[k].replace('"', "״")
        rep.update({
            "site": key, "site_name": site["name"], "site_brand": site.get("brand", site["name"]), "site_short": site["short"], "site_home": site["home"],
            "brand_name": site.get("brand", site["name"]) if key == "kelim" else "מיזם הכלים",
            "brand_sub": "" if key == "kelim" else '<a class="brand-sub" href="' + site["home"] + '">' + site["short"] + "</a>",
            "theme": site["theme"], "site_desc": site["desc"],
            "nav": "".join(f'<a href="{h}"' + (' aria-current="page"' if meta.get("nav") == k else "") + f'>{l}</a>' for k, h, l in site["nav"]),
            "tool": meta.get("tool", ""),
            "shipurim": shipurim_line(meta.get("tool", "")),
            "chesed": news_bar(url_path) + chesed_band(url_path, dict(meta, _login="gsi/client" in raw or "accounts.google.com" in raw)),
            "kurs": kurs_band(url_path, meta),
            "fb_note": fb_note(meta.get("tool", "")),
            "lead_endpoint": LEAD_ENDPOINT,
            "site_css": "".join(f'<link rel="stylesheet" href="{c}">' for c in site.get("css", [])),
        })
        rep["foot"] += "".join(f'<script src="{j}" defer></script>' for j in site.get("js", []))
        if url_path in NEWSBAR_PAGES:
            rep["foot"] += '<script src="/assets/news-bar.js" defer></script>'
        if not meta.get("no_precache"):  # דפים רבים מאותו סוג (פרקי תהילים): לא נשמרים מראש בטלפון, רק כשנכנסים אליהם
            site_pages[key].append(url_path)
    for k, v in rep.items():
        html = html.replace("{{" + k + "}}", v)
    if url_path in HUB_INLINE:  # הסקריפט כבר מוטמע בראש התוכן: לא טוענים אותו פעם שנייה
        html = html.replace('<script src="/assets/discover.js" defer></script>', "")
    for key in ["yerushalaim", "sipur", "hachana", "moed", "madrich", "kartis"]:
        html = html.replace("{{cur:" + key + "}}", ' aria-current="page"' if meta.get("nav") == key else "")
    if meta.get("manifest") or meta.get("manifest_of"):  # דף שמותקן כאפליקציה משלו (הגשר, הטרמפים): manifest נפרד ליד הדף
        # manifest_of: דף-בן שמשתמש באפליקציה של דף אחר (הלו"ז והפרטיות של הטרמפים) – {"href", "short_name", "apple_touch_icon"}
        man = dict(meta.get("manifest") or meta["manifest_of"])
        href = man.get("href") or f"{url_path}manifest.webmanifest"
        html = re.sub(r'<link rel="manifest" href="[^"]*">', f'<link rel="manifest" href="{href}">', html, count=1)
        html = re.sub(r'(<meta name="apple-mobile-web-app-title" content=")[^"]*', lambda m: m.group(1) + man.get("short_name", ""), html, count=1)
        if man.get("apple_touch_icon"):
            html = html.replace('<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">', f'<link rel="apple-touch-icon" href="{man["apple_touch_icon"]}">')
        if man.get("display") == "browser":  # באייפון: האייקון נפתח בספארי עצמו – עם אותו אחסון (והצימוד) של הדף
            html = html.replace('<meta name="apple-mobile-web-app-capable" content="yes">', '<meta name="apple-mobile-web-app-capable" content="no">')
            html = html.replace('<meta name="mobile-web-app-capable" content="yes">', '<meta name="mobile-web-app-capable" content="no">')
    if meta.get("lang"):
        html = lang_page(html, meta, url)
    elif url_path.startswith("/kodesh/giur/") and '<section class="fb no-print"' in html:
        html = html.replace('<section class="fb no-print"', giur_cta("he", url_path) + '<section class="fb no-print"', 1)
    if "<!--KATALOG-" in html:
        html = katalog_fill(html)
    html = version_assets(html)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")
    if meta.get("manifest"):
        man = dict({"id": url_path, "start_url": url_path, "scope": url_path, "dir": "rtl", "lang": "he"}, **meta["manifest"])
        man.pop("apple_touch_icon", None)
        (out.parent / "manifest.webmanifest").write_text(json.dumps(man, ensure_ascii=False, indent=1), encoding="utf-8")
    if meta.get("sw_src"):  # service worker משלו לאפליקציה של הדף (טווח = תיקיית הדף), למשל התראות הטרמפים
        _sw = (ROOT / meta["sw_src"]).read_text(encoding="utf-8")
        _sw = _sw.replace("__CACHE__", url_path.strip("/").replace("/", "-") + "-" + datetime.datetime.now().strftime("%Y%m%d%H%M"))
        (out.parent / "sw.js").write_text(_sw, encoding="utf-8")
    if site and not meta.get("noindex") and not meta.get("no_precache") and not meta.get("lang") and not re.search(r"/(pratiut|negishut|tosaf)/$", url_path):
        # רשימת הכלים לתוסף הכרום (kelim/tools.json): כלי חדש באתר מופיע בתוסף בלי לשלוח גרסה לחנות
        cr = meta.get("crumbs") or []
        name = cr[-1][0] if cr else re.split(r"\s[–—|-]\s|:\s", meta["title"])[0].strip()
        t = {"n": name, "d": meta["description"][:120], "u": url_path, "s": site["short"],
             "c": cr[-2][0] if len(cr) > 1 else site["name"]}
        if seo_is_hub(url_path): t["h"] = 1
        if meta.get("ext"): t["x"] = meta["ext"]
        TOOLS_JSON.append(t)
    if in_sitemap(meta):
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
                               "params": {"title": "title", "text": "text", "url": "url", "files": [{"name": "files", "accept": ["*/*", "audio/*", "video/*", "image/*", "audio/ogg", "audio/opus", "audio/mpeg", "audio/mp4", "audio/aac", "audio/amr", "audio/wav", "video/mp4", "video/3gpp", "video/webm"]}]}}
        # "פתח באמצעות" במחשב (אחרי התקנת האתר כאפליקציה): קובץ PDF נפתח בכלי המילוי והחתימה
        man["file_handlers"] = [{"action": "/kelim/machshev/chatima/", "accept": {"application/pdf": [".pdf"]}}]
    (d / "manifest.webmanifest").write_text(json.dumps(man, ensure_ascii=False, indent=1), encoding="utf-8")
    pre = site_pages[key] + ["/assets/site.css", "/assets/kelim.css", "/assets/kelim.js", "/assets/hakraa-daf.js","/assets/track.js", "/assets/discover.js", "/assets/discover2.js", "/assets/helper.js",
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
# ניסוח מייל: הנוסחים והמנוע של /kelim/tochen/mail/ גם בתוך התוסף (כפתור "✍ ניסוח" בג'ימייל, נוסחים בווטסאפ ווב)
for _src, _dst in (("tochen-mail.json", "mail-nusach.json"), ("tochen-mail-fill.js", "mail-fill.js")):
    _b = (ROOT / "assets" / _src).read_bytes()
    _d = ROOT / "tools" / "chatima-ext" / _dst
    if not _d.exists() or _d.read_bytes() != _b:
        _d.write_bytes(_b)

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
(ROOT / "robots.txt").write_text(f"User-agent: *\nAllow: /\nDisallow: /mohel/todah/\nDisallow: /kelim/apps/*.apk\nSitemap: {BASE}/sitemap.xml\n", encoding="utf-8", newline="\n")
print("sitemap:", len(pages), "pages")
# ---------- אינדקס חיפוש לכל האתר (assets/search-index.json) – נוצר בכל build, נטען בחיפוש שבראש כל דף ----------
def write_search_index():
    out = []
    for _p in sorted(SRC.rglob("*.html")):
        _raw = _p.read_text(encoding="utf-8")
        _m = re.match(r"\s*<!--meta\s*(\{.*?\})\s*-->", _raw, re.S)
        if not _m:
            continue
        _meta = json.loads(_m.group(1))
        if not in_sitemap(_meta) or _meta.get("no_mapa"):
            continue
        rel = _p.relative_to(SRC).as_posix()
        u = "/" + (rel[:-len("index.html")] if rel.endswith("index.html") else rel)
        if u in ("/mapa/", "/") or u.startswith("/mohel/todah"):
            continue
        _h1 = re.search(r"<h1[^>]*>(.*?)</h1>", _raw, re.S)
        h1 = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", _h1.group(1))).strip() if _h1 else ""
        name = h1 or re.split(r"\s[–—|]\s|:\s", _meta["title"])[0].strip()
        out.append({"u": u, "n": name, "d": (_meta.get("description") or "")[:200], "t": re.split(r"\s\|\s", _meta["title"])[0].strip()})
    (ROOT / "assets" / "search-index.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8", newline="\n")
    print("search-index:", len(out), "pages")
write_search_index()
write_catalog()
rel_check()


