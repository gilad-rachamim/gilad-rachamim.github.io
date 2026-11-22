# -*- coding: utf-8 -*-
"""gen_pages.py - כותב את שני דפי המקור של הכלי (כדי שה-FAQ בדף וה-JSON-LD יהיו תמיד אותו טקסט):
  src/pages/kelim/tamlul/yutub/index.html          "תמלול מיוטיוב" - לכולם
  src/pages/kelim/tamlul/nahalat-avot/index.html   דף ייעודי לכולל נחלת אבות (noindex עד שמאשרים לפרסם)
הרצה: python tools/yutub-worker/gen_pages.py   ואז python build.py
"""
import json
import os

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))

STYLE = """<style>
.yt-card{background:rgba(255,255,255,.04);border:1px solid rgba(212,175,55,.35);border-radius:16px;padding:1.2rem;max-width:720px;margin:0 auto;text-align:right}
.yt-card label{display:block;color:var(--cream);font-weight:700;margin:.2rem 0 .4rem}
.yt-card input[type=url],.yt-card input[type=text]{width:100%;box-sizing:border-box;font:inherit;font-size:1.05rem;padding:.8rem .9rem;border-radius:10px;border:1px solid rgba(255,255,255,.25);background:#fff;color:#111}
.yt-card input[type=url]{direction:ltr;text-align:left}
.yt-opts{display:grid;gap:.7rem;margin:.9rem 0}
.yt-opts small{color:var(--body);display:block;margin-top:.25rem}
.yt-check{display:flex;gap:.5rem;align-items:center;color:var(--body);font-weight:400}
.yt-check input{width:1.2rem;height:1.2rem}
.yt-card .btn{width:100%;justify-content:center;font-size:1.15rem;padding:.9rem 1rem}
.yt-note{color:var(--body);font-size:.95rem;margin:.7rem 0 0;text-align:center}
#yt-status{margin-top:1rem}
.yt-track{height:12px;border-radius:99px;background:rgba(255,255,255,.12);overflow:hidden}
#yt-bar{height:100%;width:3%;background:var(--gold);border-radius:99px;transition:width .6s}
#yt-msg{color:var(--cream);margin:.6rem 0 0;text-align:center;font-weight:700}
#yt-err{margin-top:1rem;padding:.8rem 1rem;border-radius:10px;background:rgba(200,60,60,.18);border:1px solid rgba(255,120,120,.5);color:#ffe3e3}
#yt-result{margin-top:1.2rem;border-top:1px solid rgba(212,175,55,.35);padding-top:1rem}
#yt-result h2{margin:0 0 .2rem;font-size:1.35rem;color:var(--cream)}
#yt-r-meta{color:var(--body);margin:0 0 .9rem}
.yt-dl{display:grid;gap:.6rem;grid-template-columns:1fr 1fr}
.yt-dl .btn{font-size:1.05rem}
.yt-dl .wide{grid-column:1/-1}
#yt-text{white-space:pre-wrap;background:#fff;color:#1b1b1b;border-radius:10px;padding:1rem;max-height:340px;overflow:auto;font-size:1.05rem;line-height:1.8;margin:.9rem 0 .6rem;font-family:inherit}
.tlp-steps{list-style:none;padding:0;counter-reset:s;display:grid;gap:.7rem}
.tlp-steps li{counter-increment:s;display:flex;gap:.8rem;align-items:flex-start;color:var(--body);font-size:1.05rem}
.tlp-steps li::before{content:counter(s);flex:0 0 2rem;height:2rem;border-radius:50%;background:var(--gold);color:var(--ink);font-weight:700;display:flex;align-items:center;justify-content:center}
.tlp-sec p,.tlp-sec li{color:var(--body);font-size:1.05rem;line-height:1.8}
.tlp-sec p{margin-bottom:.8rem}
.tlp-sec h3{color:var(--cream);margin:1.1rem 0 .3rem;font-size:1.15rem}
.tlp-end{text-align:center}
@media(max-width:480px){.yt-dl{grid-template-columns:1fr}}
</style>"""


def tool_block(mode, label, placeholder, extra_opts, button, note):
    return f"""<section class="k-sec" aria-label="הכלי">
  <div class="yt-card" id="yt-tool" data-mode="{mode}">
    <form id="yt-form" novalidate>
      <label for="yt-url">{label}</label>
      <input type="url" id="yt-url" inputmode="url" autocomplete="off" placeholder="{placeholder}" required>
      <div class="yt-opts">{extra_opts}
        <label class="yt-check" for="yt-times"><input type="checkbox" id="yt-times"> להוסיף זמן בתחילת כל פסקה</label>
      </div>
      <button class="btn btn-gold" id="yt-go" type="submit">{button}</button>
    </form>
    <p class="yt-note">{note}</p>
    <div id="yt-status" hidden>
      <div class="yt-track" role="progressbar" aria-label="התקדמות התמלול" aria-valuemin="0" aria-valuemax="100" aria-valuenow="3"><div id="yt-bar"></div></div>
      <p id="yt-msg" aria-live="polite"></p>
      <p class="yt-note">אפשר לסגור את הדף ולחזור אליו. הכתובת של הדף שומרת את התמלול הזה.</p>
    </div>
    <div id="yt-err" role="alert" hidden></div>
    <div id="yt-result" hidden>
      <h2 id="yt-r-title"></h2>
      <p id="yt-r-meta"></p>
      <div class="yt-dl">
        <a class="btn btn-gold" id="yt-pdf" href="#" data-mv="yutub_pdf">להוריד PDF</a>
        <a class="btn btn-gold" id="yt-docx" href="#" data-mv="yutub_docx">להוריד Word</a>
        <a class="btn btn-line" id="yt-view" href="#" target="_blank" rel="noopener" data-mv="yutub_view">לפתוח את ה-PDF</a>
        <a class="btn btn-line" id="yt-txt" href="#" data-mv="yutub_txt">קובץ טקסט</a>
      </div>
      <pre id="yt-text" dir="rtl" tabindex="0" aria-label="הטקסט של השיעור"></pre>
      <div class="yt-dl">
        <button class="btn btn-line" id="yt-copy" type="button">להעתיק את הטקסט</button>
        <a class="btn btn-line" id="yt-share" href="#" target="_blank" rel="noopener" data-mv="yutub_share"><svg class="ic"><use href="#wa"/></svg> לשלוח בווטסאפ</a>
      </div>
    </div>
  </div>
</section>"""


def faq_html(faq):
    return "\n".join(f"  <details><summary>{q}</summary><p>{a}</p></details>" for q, a in faq)


def faq_ld(faq):
    import re
    strip = lambda s: re.sub(r"<[^>]+>", "", s)
    return '<script type="application/ld+json">' + json.dumps({
        "@context": "https://schema.org", "@type": "FAQPage",
        "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": strip(a)}} for q, a in faq]},
        ensure_ascii=False) + "</script>"


def write(rel, meta, body):
    path = os.path.join(ROOT, "src", "pages", *rel.split("/"), "index.html")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write("<!--meta " + json.dumps(meta, ensure_ascii=False, indent=2) + "\n-->\n" + body.strip() + "\n")
    print("wrote", rel)


# ---------------- תמלול מיוטיוב ----------------
YT_FAQ = [
    ("איך מתמללים סרטון מיוטיוב?",
     "מעתיקים את הקישור לסרטון, מדביקים אותו בתיבה שבראש הדף ולוחצים \"לתמלל את הסרטון\". אחרי כמה דקות מקבלים את כל מה שנאמר בסרטון כקובץ PDF מסודר, כקובץ Word וכטקסט להעתקה."),
    ("כמה זמן לוקח תמלול של סרטון מיוטיוב?",
     "שיעור של שעה מוכן בדרך כלל בתוך חמש עד עשר דקות. סרטון קצר מוכן מהר יותר. אפשר לסגור את הדף ולחזור אליו, כי הכתובת של הדף שומרת את התמלול."),
    ("במה זה שונה מהכתוביות האוטומטיות של יוטיוב?",
     "הכלי לא מעתיק את הכתוביות של יוטיוב. הוא מקשיב לשמע של הסרטון ומתמלל אותו מחדש במודל שאומן במיוחד על עברית מדוברת (של ivrit.ai), ולכן העברית יוצאת מדויקת יותר. הטקסט מסודר לפסקאות ולא לשורות קצרות של כתוביות."),
    ("אפשר לתמלל שיעור תורה ארוך מיוטיוב?",
     "כן. הכלי מתאים לסרטון של עד ארבע שעות, ולכן הוא טוב לשיעורים, להרצאות ולדרשות. בפסוקים, בארמית ובשמות יש יותר טעויות, וכדאי לעבור על הטקסט לפני שמפיצים אותו."),
    ("באיזה קובץ מקבלים את התמלול?",
     "בשלושה: PDF מעוצב ומוכן להדפסה, קובץ Word שאפשר לערוך בו, וקובץ טקסט פשוט. בכולם העברית מיושרת לימין, עם כותרת השיעור, שם הערוץ וקישור לסרטון המקורי."),
    ("צריך להירשם או לשלם?",
     "לא. אין הרשמה, אין תשלום ואין פרסומות. זה מיזם חסד, בלי כוונת רווח. יש רק מגבלה יומית של כמה סרטונים לכל אחד, כדי שהשרתים יספיקו לכולם."),
    ("אפשר לתמלל סרטון באנגלית?",
     "הכלי בנוי לעברית. סרטון באנגלית או בשפה אחרת מתמללים ב<a href=\"/kelim/tamlul/\">כלי התמלול הרגיל</a>, שבו בוחרים שפה, או מתרגמים אחר כך ב<a href=\"/kelim/tochen/tirgum/\">כלי התרגום</a>."),
    ("למה הסרטון שלי לא מתמלל?",
     "סרטון פרטי, סרטון לחברי ערוץ בלבד, שידור חי שעוד לא הסתיים או סרטון ארוך מארבע שעות לא יעבדו. במקרה כזה אפשר להוריד את ההקלטה ולהעלות אותה ב<a href=\"/kelim/tamlul/\">כלי התמלול</a>."),
    ("התמלול נשמר אצלכם?",
     "התמלול נשמר עד שלושה חודשים, כדי שמי שמבקש שוב את אותו סרטון יקבל אותו מיד. מתמללים רק סרטונים שפתוחים לכולם ביוטיוב. פרטים ב<a href=\"/kelim/pratiut/\">דף הפרטיות</a>."),
    ("מה עושים בשבת?",
     "בשבת הכלי נח. קישור שנשלח בשבת מחכה בתור, והתמלול מוכן במוצאי שבת."),
]

YT_BODY = f"""
<header class="k-hero tlp-hero">
  <h1>תמלול מיוטיוב ל-PDF ולוורד</h1>
  <p class="sub">מדביקים קישור לסרטון או לשיעור ביוטיוב, ומקבלים את כל מה שנאמר בו כתוב ומסודר: קובץ PDF, קובץ Word וטקסט להעתקה. בעברית, בלי הרשמה ובלי תשלום.</p>
</header>
{tool_block("yt", "הקישור לסרטון ביוטיוב", "https://www.youtube.com/watch?v=...",
            '''
        <div><label for="yt-by">שם הרב, המרצה או המוסד (לא חובה)</label><input type="text" id="yt-by" maxlength="80" autocomplete="off"><small>יופיע בראש הקובץ, מעל כותרת השיעור.</small></div>''',
            "לתמלל את הסרטון",
            "שיעור של שעה מוכן בדרך כלל בתוך 5 עד 10 דקות. מיזם חסד, בלי כוונת רווח.")}
<section class="k-sec tlp-sec" aria-labelledby="yt-how">
  <h2 id="yt-how">איך מתמללים סרטון מיוטיוב</h2>
  <ol class="tlp-steps">
    <li><span>פותחים את הסרטון ביוטיוב ומעתיקים את הקישור: בטלפון לוחצים "שיתוף" ואז "העתקת קישור", ובמחשב מעתיקים את הכתובת מלמעלה.</span></li>
    <li><span>מדביקים את הקישור בתיבה שבראש הדף ולוחצים "לתמלל את הסרטון".</span></li>
    <li><span>מחכים כמה דקות. הדף מראה מה קורה עכשיו: הורדת השמע, התמלול, סידור הקובץ.</span></li>
    <li><span>מורידים את התמלול כ-PDF או כ-Word, או מעתיקים את הטקסט ושולחים בווטסאפ.</span></li>
  </ol>
</section>
<section class="k-sec tlp-sec" aria-labelledby="yt-what">
  <h2 id="yt-what">מה מקבלים בסוף</h2>
  <h3>קובץ PDF מסודר</h3>
  <p>מסמך מעוצב ומוכן להדפסה: כותרת השיעור, שם הערוץ, התאריך ואורך הסרטון, ואחריהם הטקסט כולו בפסקאות, בעברית מיושרת לימין. בסוף המסמך יש קישור לסרטון המקורי. מתאים לדף מקורות, לחוברת שיעורים או לשליחה בקבוצה.</p>
  <h3>קובץ Word לעריכה</h3>
  <p>אותו תוכן בקובץ וורד רגיל, כדי שאפשר יהיה לתקן, לקצר, להוסיף כותרות ומקורות ולעצב איך שרוצים. הקובץ נפתח גם ב-Google Docs.</p>
  <h3>טקסט להעתקה</h3>
  <p>הטקסט מופיע גם בדף עצמו, עם כפתור העתקה. משם אפשר להדביק אותו במייל, בסיכום או בצ'אט, או להמשיך איתו לכלים אחרים באתר.</p>
</section>
<section class="k-sec tlp-sec" aria-labelledby="yt-diff">
  <h2 id="yt-diff">תמלול מהשמע עצמו, לא מהכתוביות של יוטיוב</h2>
  <p>רוב האתרים שמציעים תמלול של סרטון יוטיוב רק מעתיקים את הכתוביות האוטומטיות של יוטיוב. בעברית הכתוביות האלה חלשות: מילים מתחלפות, אין פיסוק, והטקסט מגיע כשורות קצרות וקטועות. בהרבה סרטונים בעברית אין כתוביות בכלל, ואז האתרים האלה לא מחזירים כלום.</p>
  <p>כאן זה עובד אחרת. הכלי מוריד רק את השמע של הסרטון, ומתמלל אותו מחדש במודל של ivrit.ai, מיזם ישראלי שאימן מודל זיהוי דיבור על אלפי שעות של עברית מדוברת. אחר כך הטקסט מסודר לפסקאות לפי ההפסקות של הדובר, ואם לסרטון יש פרקים ביוטיוב, הם הופכים לכותרות משנה במסמך.</p>
</section>
<section class="k-sec tlp-sec" aria-labelledby="yt-shiur">
  <h2 id="yt-shiur">תמלול שיעורי תורה מיוטיוב</h2>
  <p>הכלי נבנה קודם כול בשביל שיעורים: שיעור פרשת שבוע, שיעור הלכה, דף יומי, דרשה או הרצאה. הוא מתמלל סרטון של עד ארבע שעות, ואפשר לכתוב את שם הרב או שם בית המדרש, והוא יופיע בראש הקובץ. כך מקבלים דף שאפשר לחלק ללומדים, להעלות לאתר של בית הכנסת או לשמור בארכיון השיעורים.</p>
  <p>כדאי לדעת מראש: המודל טוב בעברית מדוברת, וחלש יותר בציטוטים. בפסוקים, בלשון הגמרא, בארמית ובשמות של ספרים וחכמים יש יותר טעויות, ולכן שיעור תורה צריך מעבר של עין אנושית לפני שמפיצים אותו. מי שרוצה להפוך את השיעור לעלון מעוצב ממשיך ל<a href="/kodesh/alon/">עלון A4 להדפסה</a>, ומי שרוצה להוציא ממנו הודעות ותמונות לכל השבוע ממשיך ל<a href="/kodesh/shavua/">שבוע של תוכן</a>.</p>
</section>
<section class="k-sec tlp-sec" aria-labelledby="yt-who">
  <h2 id="yt-who">למי זה מתאים</h2>
  <ul>
    <li><b>מגידי שיעור ובתי מדרש</b> שהשיעורים שלהם כבר ביוטיוב ורוצים אותם גם כתובים.</li>
    <li><b>סטודנטים ותלמידים</b> שמסכמים הרצאה מוקלטת ומחפשים בה לפני מבחן.</li>
    <li><b>יוצרי תוכן</b> שהופכים סרטון לפוסט, למאמר או לכתוביות.</li>
    <li><b>כבדי שמיעה</b> ומי שמעדיף לקרוא במקום לצפות.</li>
    <li><b>עיתונאים וחוקרים</b> שצריכים ציטוט מדויק מתוך ראיון או נאום.</li>
  </ul>
</section>
<section class="k-sec tlp-sec" aria-labelledby="yt-tips">
  <h2 id="yt-tips">כדי שהתמלול ייצא טוב</h2>
  <p>איכות התמלול תלויה באיכות ההקלטה. סרטון שבו הדובר קרוב למיקרופון יוצא כמעט נקי. הקלטה מרחוק, באולם עם הד, עם מוזיקת רקע או עם כמה אנשים שמדברים יחד, תצא עם יותר טעויות. אם יש לכם את ההקלטה המקורית, אפשר לנקות אותה קודם בכלי <a href="/kodesh/olpan/kol/">קול נקי לשיעור</a> ואז להעלות אותה ל<a href="/kelim/tamlul/">כלי התמלול</a>.</p>
  <p>סרטון שכבר תומלל פעם אחת חוזר מיד, בלי לחכות. לכן אם שלחתם קישור לחבר, הוא יקבל את אותו תמלול בשנייה.</p>
</section>
<section class="k-sec tlp-sec" aria-labelledby="yt-more">
  <h2 id="yt-more">ההקלטה לא ביוטיוב?</h2>
  <p>לקובץ שמע או וידאו שנמצא אצלכם, להודעה קולית מהווטסאפ או להקלטה ישירה מהמיקרופון יש את <a href="/kelim/tamlul/">כלי התמלול הרגיל</a>. לסרטון ששמור בטלפון יש הסבר ב<a href="/kelim/tamlul/sirton/">תמלול סרטון</a>, ולהקלטות ארוכות של שיעורים ב<a href="/kelim/tamlul/shiur/">תמלול שיעורים והרצאות</a>. מי שמעדיף טלגרם שולח את ההקלטה ל<a href="https://t.me/GiladTimlulBot?start=site_yutub" target="_blank" rel="noopener" data-bot="tamlul">בוט התמלול</a>.</p>
</section>
<section class="k-sec tlp-sec" aria-labelledby="yt-why">
  <h2 id="yt-why">למה זה בלי תשלום</h2>
  <p>מאז הפציעה הקשה מהמלחמה אני חי על תמלול: שיחות, שיעורים, פתקים קוליים. רציתי שזה יהיה פתוח ונגיש לכל מי שצריך, ובמיוחד למי שמלמד תורה. הכלי הוא חלק ממיזם חסד, בלי כוונת רווח: אין הרשמה, אין פרסומות ואין מנוי. המגבלה היומית קיימת רק כדי שהשרתים יספיקו לכולם. <a class="gold" href="/kelim/#sipur">הסיפור שלי</a></p>
</section>
<section class="k-sec" aria-labelledby="faq-h">
  <h2 id="faq-h">שאלות ותשובות</h2>
{faq_html(YT_FAQ)}
</section>
<section class="k-sec tlp-end" aria-labelledby="yt-go2">
  <h2 id="yt-go2">יש לכם קישור? מתחילים</h2>
  <div class="actions" style="justify-content:center"><a class="btn btn-gold" href="#yt-tool" data-mv="yutub_top">לתמלל סרטון מיוטיוב</a><a class="btn btn-line" href="#" data-share-tool="wa" data-text="תמלול מיוטיוב: מדביקים קישור לשיעור או לסרטון ומקבלים אותו כתוב, כ-PDF וכוורד. בלי הרשמה:" target="_blank" rel="noopener"><svg class="ic"><use href="#wa"/></svg> לשלוח לחבר שצריך את זה</a></div>
</section>
"""

write("kelim/tamlul/yutub", {
    "site": "kelim", "nav": "tamlul", "tool": "tamlul_yutub",
    "title": "תמלול מיוטיוב ל-PDF ולוורד: מדביקים קישור ומקבלים טקסט | הכלים של גילעד רחמים",
    "description": "תמלול מיוטיוב בעברית: מדביקים קישור לסרטון או לשיעור, ומקבלים את כל מה שנאמר כקובץ PDF מסודר, כקובץ Word וכטקסט להעתקה. תמלול מהשמע עצמו, בלי הרשמה ובלי תשלום.",
    "og_title": "תמלול מיוטיוב ל-PDF ולוורד",
    "priority": "0.8",
    "crumbs": [["תמלול", "/kelim/tamlul/"], ["תמלול מיוטיוב", None]],
    "head": STYLE + faq_ld(YT_FAQ),
    "foot": "<script src=\"/assets/tamlul-yutub.js\" defer></script>",
}, YT_BODY)


# ---------------- כולל נחלת אבות ----------------
NA_FAQ = [
    ("איך מתמללים שיעור מהאתר של נחלת אבות?",
     "פותחים את דף השיעור באתר nahalat-avot.com, מעתיקים את הכתובת של הדף ומדביקים אותה כאן. אחרי כמה דקות השיעור מוכן כקובץ PDF, כקובץ Word וכטקסט."),
    ("כמה זמן זה לוקח?",
     "שיעור של שעה מוכן בדרך כלל בתוך חמש עד עשר דקות. שיעור שכבר תומלל פעם אחת נפתח מיד."),
    ("התמלול מדויק?",
     "זה תמלול אוטומטי במודל שאומן על עברית מדוברת. ברוב השיעור הוא מדויק, אבל בפסוקים, בארמית ובשמות יש יותר טעויות. כדאי לעבור על הטקסט לפני שמפיצים אותו."),
    ("מה כתוב בקובץ?",
     "שם הכולל, כותרת השיעור, שם הרב, הסדרה, התאריך ואורך השיעור, ואחריהם השיעור כולו בפסקאות. בסוף יש קישור לדף השיעור באתר של הכולל, וקרדיט לכלי התמלול."),
]

NA_BODY = f"""
<header class="k-hero tlp-hero">
  <h1>תמלול שיעורי כולל נחלת אבות</h1>
  <p class="sub">מדביקים קישור לדף של שיעור מהאתר של כולל נחלת אבות, ומקבלים את השיעור כתוב ומסודר: קובץ PDF, קובץ Word וטקסט להעתקה.</p>
</header>
{tool_block("na", "הקישור לדף השיעור באתר נחלת אבות", "https://nahalat-avot.com/lesson/...", "",
            "לתמלל את השיעור",
            "שיעור של שעה מוכן בדרך כלל בתוך 5 עד 10 דקות. שיעור שכבר תומלל נפתח מיד.")}
<section class="k-sec tlp-sec" aria-labelledby="na-how">
  <h2 id="na-how">איך זה עובד</h2>
  <ol class="tlp-steps">
    <li><span>פותחים שיעור באתר <a href="https://nahalat-avot.com/lessons" target="_blank" rel="noopener">כולל נחלת אבות</a> ומעתיקים את הכתובת של הדף.</span></li>
    <li><span>מדביקים אותה בתיבה שלמעלה ולוחצים "לתמלל את השיעור".</span></li>
    <li><span>הכלי לוקח את קובץ השמע של השיעור מהאתר של הכולל, מתמלל אותו ומסדר אותו לפסקאות.</span></li>
    <li><span>מורידים PDF או Word. בראש הקובץ מופיעים שם הכולל, שם השיעור ושם הרב, ובסופו קישור חזרה לדף השיעור.</span></li>
  </ol>
</section>
<section class="k-sec tlp-sec" aria-labelledby="na-site">
  <h2 id="na-site">לשילוב באתר של הכולל</h2>
  <p>אפשר לשים מתחת לכל שיעור באתר קישור אחד קבוע, והתמלול ייפתח לבד, בלי עבודה ידנית. הקישור בנוי כך, כשבסופו השם של השיעור כמו שהוא מופיע בכתובת של דף השיעור:</p>
  <p dir="ltr" style="text-align:left;word-break:break-all"><code>https://hakelim.com/kelim/tamlul/nahalat-avot/?s=vayishlach-01-qgbdrmuu5nm</code></p>
  <p>מי שלוחץ על הקישור בפעם הראשונה מחכה כמה דקות עד שהשיעור מתומלל. מהפעם השנייה והלאה התמלול נפתח מיד, לכל מי שלוחץ.</p>
</section>
<section class="k-sec tlp-sec" aria-labelledby="na-about">
  <h2 id="na-about">על הכלי</h2>
  <p>הכלי נבנה במיוחד בשביל שיעורי כולל נחלת אבות, המכון הגבוה לרבנות קהילתית, כחלק ממיזם הכלים של גילעד רחמים: מיזם חסד, בלי כוונת רווח, בלי הרשמה ובלי פרסומות. לשיעורים מיוטיוב יש את <a href="/kelim/tamlul/yutub/">תמלול מיוטיוב</a>, ולהקלטה שנמצאת אצלכם יש את <a href="/kelim/tamlul/">כלי התמלול</a>. בשבת הכלי נח, ושיעור שנשלח בשבת מתומלל במוצאי שבת.</p>
</section>
<section class="k-sec" aria-labelledby="faq-h">
  <h2 id="faq-h">שאלות ותשובות</h2>
{faq_html(NA_FAQ)}
</section>
"""

write("kelim/tamlul/nahalat-avot", {
    "noindex": True, "site": "kelim", "nav": "tamlul", "tool": "tamlul_nahalat_avot",
    "title": "תמלול שיעורי כולל נחלת אבות ל-PDF ולוורד | הכלים של גילעד רחמים",
    "description": "תמלול שיעורים מהאתר של כולל נחלת אבות: מדביקים קישור לדף השיעור ומקבלים אותו כתוב, כקובץ PDF מסודר, כקובץ Word וכטקסט.",
    "og_title": "תמלול שיעורי כולל נחלת אבות",
    "priority": "0.3",
    "crumbs": [["תמלול", "/kelim/tamlul/"], ["כולל נחלת אבות", None]],
    "head": "<meta name=\"robots\" content=\"noindex\">" + STYLE + faq_ld(NA_FAQ),
    "foot": "<script src=\"/assets/tamlul-yutub.js\" defer></script>",
}, NA_BODY)
