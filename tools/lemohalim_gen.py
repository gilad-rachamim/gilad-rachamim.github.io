#!/usr/bin/env python3
"""מייצר את src/pages/mohel/lemohalim/index.html ואת קובץ ההודעות המוכנות של המוהל.

כל נוסח של כפתור "לשלוח להורים" יושב כאן, במקום אחד. משנים כאן ומריצים:
    python tools/lemohalim_gen.py
ואז build.py כרגיל. אחר כך מעתיקים את הקישורים (הם נבנים עם utm לכל כלי).
"""
import html, json, os, pathlib
from urllib.parse import quote

ROOT = pathlib.Path(__file__).resolve().parent.parent
BASE = "https://hakelim.com"
# 07.11.2026: הדף עבר ל"כלי קודש" (/kodesh/mohalim/). הכתובת הישנה /mohel/lemohalim/ נשארת כהפניה.
PAGE = ROOT / "src" / "pages" / "kodesh" / "mohalim" / "index.html"
MD = pathlib.Path(os.path.expanduser("~/.claude/skills/mohel-deploy/references/mohel-share-messages.md"))

# key, נתיב, אייקון, כותרת, שורה למוהל, שורת גילוי נאות (או ריק), הודעה להורים ({url} = קישור הכלי)
TOOLS = [
    ("hazmana", "/mohel/hazmana/", "heart", "הזמנה לברית",
     "הזמנה מעוצבת לווטסאפ תוך דקה, עם קישור לאורחים, אישורי הגעה ולוח מעקב מוזמנים.",
     "כדי לקבל את ההזמנה ההורים משאירים שם וטלפון, והפרטים מגיעים אליי.",
     "מזל טוב! כאן אפשר להכין בחינם הזמנה לברית לווטסאפ, תוך דקה.\nבוחרים עיצוב ומקבלים תמונה, טקסט מוכן וקישור לאורחים עם אישורי הגעה ומעקב מוזמנים:\n{url}"),
    ("moed", "/mohel/moed/", "cal", "מחשבון מועד הברית",
     "מזינים תאריך לידה ובית חולים, והוא בודק אם הלידה הייתה לפני השקיעה או אחריה ומראה את המועד בעברי ובלועזי.",
     "",
     "כאן אפשר לבדוק מתי חל מועד הברית.\nמזינים את תאריך הלידה ובית החולים, ומקבלים את המועד בעברי ובלועזי:\n{url}"),
    ("checklist", "/mohel/checklist/", "list", "רשימת הכנה להורים",
     "רשימה מלאה לקראת הלידה והברית. מסמנים בטלפון מה כבר יש, והיא נשמרת אצלם.",
     "",
     "רשימת הכנה לקראת הלידה והברית.\nמסמנים בטלפון מה כבר יש, והרשימה נשמרת אצלכם:\n{url}"),
    ("shirim", "/mohel/shirim/", "hadas", "שירים לפי המנהג",
     "חמישה פלייליסטים בספוטיפי: דתי, מסורתי, פיוטים לספרדים ועדות המזרח, אשכנזי חסידי ותימני.",
     "",
     "שירים לברית לפי המנהג, חמישה פלייליסטים בספוטיפי.\nדתי, מסורתי, פיוטים לספרדים ועדות המזרח, אשכנזי חסידי ותימני:\n{url}"),
    ("dapim", "/mohel/dapim/", "down", "דפי ברית להדפסה",
     "סדר הברית בנוסח ספרדי, עדות המזרח ואשכנז, שירונים, סעודה, כיבודים והכנות ליום הברית. בקובצי PDF.",
     "",
     "דפי הברית להורדה ולהדפסה, בחינם.\nסדר הברית בנוסח ספרדי, עדות המזרח ואשכנז, שירונים, סעודה, כיבודים והכנות ליום הברית:\n{url}"),
    ("madrich", "/mohel/madrich/", "book", "מדריך להורים",
     "מה לקנות, מתי הברית, מה להביא ואיך מתכוננים לטקס.",
     "כדאי לדעת לפני ששולחים: יש בו גם פרק על בחירת מוהל, וכדי לקבל אותו ההורים משאירים שם ומייל, והפרטים מגיעים אליי.",
     "מדריך להורים לקראת הברית, בחינם.\nמה לקנות, מתי הברית ומה להביא:\n{url}"),
    ("brachot", "/mohel/hazmana/brachot/", "seal", "ברכות לברית",
     "24 ברכות קצרות וחמות: להורים, לסבא ולסבתא, לסנדק, מהעבודה ועם פסוק. מוכנות להעתקה.",
     "",
     "24 ברכות קצרות לברית, מוכנות להעתקה לווטסאפ או לכרטיס.\nאפשר להעביר גם למשפחה ולחברים:\n{url}"),
]

MORE = [
    ("nusach", "/mohel/hazmana/nusach/", "נוסחים להזמנה", "קלאסי, קצר לווטסאפ, עם פסוק, נוסח ספרדי, ברית בשבת ועוד.",
     "נוסחים מוכנים להזמנה לברית: קלאסי, קצר לווטסאפ, עם פסוק, נוסח ספרדי, ברית בשבת ועוד.\nמעתיקים ומחליפים את הפרטים:\n{url}"),
    ("tekes", "/mohel/hachana/tekes/", "הכנות לטקס", "בחירת אולם, שעת הברית, וחלוקת הכיבודים בלי שאף אחד ייפגע.",
     "הכנות לטקס הברית: איך בוחרים אולם, באיזו שעה עורכים, ואיך מחלקים כיבודים בלי שאף אחד ייפגע:\n{url}"),
    ("yom", "/mohel/hachana/yom/", "יום הברית", "מה להביא, ואיך מכינים את התינוק.",
     "יום הברית: מה להביא, ואיך מכינים את התינוק:\n{url}"),
]

# הודעה אחת עם הכלים. המדריך נשאר בחוץ לפי ברירת המחדל בתוכנית (יש בו פרק על בחירת מוהל).
ALL_KEYS = [("hazmana", "הזמנה לברית עם אישורי הגעה"), ("moed", "מחשבון מועד הברית"),
            ("checklist", "רשימת הכנה"), ("shirim", "שירים לפי המנהג"),
            ("dapim", "דפי ברית להדפסה"), ("brachot", "ברכות לברית")]


# 08.11.2026: גרסת "בלי אתר" (וורד / PDF / תבנית ווטסאפ) בדף /kodesh/mohalim/bli-atar/, מ-tools/bli_atar.py
BLI = "/kodesh/mohalim/bli-atar/"
NOWEB = {"moed": "בלי אתר: וורד / PDF", "checklist": "בלי אתר: וורד / PDF", "dapim": "בלי אתר: PDF",
         "tekes": "בלי אתר: וורד / PDF", "yom": "בלי אתר: PDF / ווטסאפ"}


def noweb(key):
    if key not in NOWEB:
        return ""
    return f'<a class="btn btn-line btn-sm" href="{BLI}#{key}" data-share="bli_atar_{key}">{NOWEB[key]}</a>'


CREDIT = "הכלי של גילעד רחמים, מוהל, קולגה שלי וחבר איתי בפורום המוהלים."


def tool_url(path, key):
    return f"{BASE}{path}?utm_source=mohel_share&utm_medium=whatsapp&utm_campaign={key}"


def send_href(text):
    return "https://api.whatsapp.com/send?text=" + quote(text, safe="")


def share_link(key, text, label, cls):
    return (f'<a class="btn {cls} btn-sm" href="{html.escape(send_href(text))}" target="_blank" rel="noopener" '
            f'data-share="{key}"><svg class="ic"><use href="#wa"/></svg> {label}</a>')


paths = {t[0]: t[1] for t in TOOLS}
all_text = "מזל טוב! כמה כלים חינמיים לקראת הברית:\n\n" + "\n\n".join(
    f"{label}:\n{tool_url(paths[k], k)}" for k, label in ALL_KEYS) + "\n\nהכלים של גילעד רחמים, מוהל, קולגה שלי וחבר איתי בפורום המוהלים."

GILAD = "https://wa.me/972584049049?text="
wa_fix = GILAD + quote("שלום גילעד, ראיתי את דף הכלים למוהלים. רציתי לכתוב לך: ")
wa_add = GILAD + quote("שלום גילעד, ראיתי את דף הכלים למוהלים. אשמח שתוסיף כלי: ")
wa_top = GILAD + quote("שלום גילעד, ראיתי את דף הכלים למוהלים. ")

cards = []
for key, path, icon, title, line, notice, msg in TOOLS:
    text = msg.format(url=tool_url(path, key)) + "\n" + CREDIT
    note = f'<p class="tl-note">{notice}</p>' if notice else ""
    cards.append(f"""      <article class="tl">
        <svg class="ic" aria-hidden="true"><use href="#{icon}"/></svg>
        <div>
          <h3>{title}</h3>
          <p>{line}</p>{note}
          <div class="tl-go">{share_link(key, text, "לשלוח להורים בווטסאפ", "btn-gold")}<a class="btn btn-line btn-sm" href="{path}?utm_source=lemohalim&amp;utm_medium=site" target="_blank" rel="noopener">לפתוח</a>{noweb(key)}</div>
        </div>
      </article>""")

more = []
for key, path, title, line, msg in MORE:
    text = msg.format(url=tool_url(path, key)) + "\n" + CREDIT
    more.append(f"""      <article class="tl tl-s">
        <div>
          <h3>{title}</h3>
          <p>{line}</p>
          <div class="tl-go">{share_link(key, text, "לשלוח להורים", "btn-line")}<a class="btn btn-line btn-sm" href="{path}?utm_source=lemohalim&amp;utm_medium=site" target="_blank" rel="noopener">לפתוח</a>{noweb(key)}</div>
        </div>
      </article>""")

STYLE = (".tls{display:grid;gap:1rem}"
         ".tl{display:grid;grid-template-columns:2.4rem 1fr;gap:.85rem;align-items:start;padding:1.1rem 1rem;border:1px solid var(--line);border-radius:14px;background:rgba(201,165,92,.05)}"
         ".tl>.ic{width:2.2rem;height:2.2rem;color:var(--gold)}"
         ".tl-s{grid-template-columns:1fr}"
         ".tl h3{font-family:var(--serif);font-weight:500;color:var(--cream);font-size:1.25rem;line-height:1.3}"
         ".tl p{color:var(--body);font-size:1rem;margin:.3rem 0 0;line-height:1.55}"
         ".tl p.tl-note{color:var(--muted);font-size:.95rem}"
         ".tl-go{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.8rem}"
         ".tl-go .btn{display:inline-flex}"
         ".tl-all{margin:1.5rem 0}"
         ".tl-all .btn{display:inline-flex}"
         ".tl-all p{color:var(--muted);font-size:.95rem;margin-top:.5rem}"
         ".tl-end{text-align:center;font-family:var(--serif);color:var(--gold);font-size:1.25rem;margin:2rem 0 1rem}")

# כפתורי הווטסאפ הקבועים בראש ובתחתית הדף פותחים הודעה של הורים. בדף הזה הקורא הוא מוהל, אז מחליפים את הטקסט.
FOOT = ("<script>document.querySelectorAll('.topnav a.wa,.dock a[href*=\"wa.me\"],.site-foot a[href*=\"wa.me\"]')"
        ".forEach(function(a){a.href=" + json.dumps(wa_top) + "})</script>")

meta = {
    "site": "kodesh",
    "nav": "mohalim",
    "tool": "lemohalim",
    "title": "כלים לברית, בחינם, לכל מוהל ולכל משפחה | גילעד רחמים המוהל",
    "description": "דף למוהלים: כל הכלים החינמיים לברית במקום אחד, ולכל כלי כפתור ששולח אותו להורים בווטסאפ. לשימושכם בשמחה ובאהבה.",
    "og_title": "כלים לברית, בחינם, לכל מוהל ולכל משפחה",
    "noindex": True,
    "no_cta": True,
    "crumbs": [["כלים למוהלים", None]],
    "dock_href": "#kelim",
    "dock_label": "לכלים",
    "head": f"<style>{STYLE}</style>",
    "foot": FOOT,
}

body = f"""<!--meta {json.dumps(meta, ensure_ascii=False, indent=2)} -->
<header class="hero">
  <span class="bsd">בס"ד</span>
  <h1>כלים לברית, בחינם, לכל מוהל ולכל משפחה</h1>
  <p class="sub">חברים יקרים, קיבצתי כאן את כל הכלים בשבילכם, לשימושכם בשמחה ובאהבה. אתם מוזמנים להשתמש כמה שאתם צריכים, ולשלוח גם להורים שלכם. גם אם אני לא המוהל, זה בסדר גמור.</p>
  <div class="rule" aria-hidden="true"></div>
</header>
<div class="wrap" id="kelim">
  <div class="tip"><b>איך זה עובד</b><p>לוחצים "לשלוח להורים בווטסאפ", בוחרים למי, וההודעה כבר כתובה. בסופה שורה אחת: שהכלי של גילעד רחמים, קולגה שלכם וחבר איתכם בפורום. אפשר לשנות אותה לפני השליחה. הכול יושב באתר שלי, אז הפרטים שלי מופיעים בכל כלי.</p></div>

  <section aria-labelledby="mine-h">
    <h2 id="mine-h">בשבילכם, המוהלים</h2>
    <div class="tls">
      <article class="tl">
        <svg class="ic" aria-hidden="true"><use href="#list"/></svg>
        <div>
          <h3>יומן הבריתות שלי</h3>
          <p>רושמים כל ברית בדקה מהטלפון: הורים, תאריך עברי ולועזי, שעה ומקום. מסמנים שראיתם את התינוק והורדתם תחבושת, ומקבלים "מה נשאר לעשות", תזכורות וקובץ לאקסל ולוורד. הכול נשמר רק אצלכם.</p>
          <p class="tl-note">בלי אתר? יש גם קובץ וורד למילוי ותבנית לווטסאפ.</p>
          <div class="tl-go"><a class="btn btn-gold btn-sm" href="/kodesh/britot/?utm_source=lemohalim&amp;utm_medium=site">לפתוח את היומן</a><a class="btn btn-line btn-sm" href="/kodesh/britot/yoman-britot.docx" download data-share="britot_docx">קובץ וורד</a><a class="btn btn-line btn-sm" href="{BLI}#yoman">תבנית לווטסאפ</a></div>
        </div>
      </article>
      <article class="tl">
        <svg class="ic" aria-hidden="true"><use href="#wa"/></svg>
        <div>
          <h3>טופס פרטי הברית</h3>
          <p>שולחים להורים קישור אישי, והם ממלאים בטלפון את פרטי הלידה, המשקל, הצהבת, מקום ושעת הברית, הנוסח והסנדק. הטופס מחשב את מועד הברית, והכול מגיע אליכם בהודעת ווטסאפ אחת מסודרת. לחיצה אחת בהודעה מכניסה את הברית ליומן.</p>
          <p class="tl-note">בלי אתר? יש גם תבנית לווטסאפ וקובץ וורד להדפסה.</p>
          <div class="tl-go"><a class="btn btn-gold btn-sm" href="/kodesh/tofes-brit/?utm_source=lemohalim&amp;utm_medium=site#tb-mk-h">להכין קישור אישי</a><a class="btn btn-line btn-sm" href="/kodesh/tofes-brit/tofes-brit.docx" download data-share="tofes_brit_docx">קובץ וורד</a></div>
        </div>
      </article>
      <article class="tl">
        <svg class="ic" aria-hidden="true"><use href="#tel"/></svg>
        <div>
          <h3>כרטיס ביקור דיגיטלי</h3>
          <p>ממלאים שם, טלפון, אזור ונוסחים, ומקבלים כרטיס משלכם: ההורים שומרים אתכם באנשי הקשר, כותבים בווטסאפ או מתקשרים בלחיצה. הפרטים יושבים בקישור עצמו ולא נשמרים אצלי.</p>
          <p class="tl-note">בלי אתר? יש גם תמונה עם QR לסטטוס, לווטסאפ ולהדפסה.</p>
          <div class="tl-go"><a class="btn btn-gold btn-sm" href="/kodesh/kartis-mohel/?utm_source=lemohalim&amp;utm_medium=site">לבנות את הכרטיס שלי</a></div>
        </div>
      </article>
      <article class="tl">
        <svg class="ic" aria-hidden="true"><use href="#heart"/></svg>
        <div>
          <h3>הודעות החלמה להורים</h3>
          <p>הודעת ווטסאפ מוכנה לכל שלב: אחרי שיחת ההיכרות, יום לפני הברית, ערב הברית, ומיום הברית ועד שבוע אחרי, וגם "מתי להתקשר אליי מיד". ממלאים פעם אחת שם וטלפון, ושולחים להורים בלחיצה.</p>
          <p class="tl-note">בלי אתר? יש גם קובץ וורד עם כל ההודעות.</p>
          <div class="tl-go"><a class="btn btn-gold btn-sm" href="/kodesh/hachlama/?utm_source=lemohalim&amp;utm_medium=site">לפתוח את ההודעות</a><a class="btn btn-line btn-sm" href="/kodesh/hachlama/hodaot-hachlama.docx" download data-share="hachlama_docx">קובץ וורד</a></div>
        </div>
      </article>
      <article class="tl">
        <svg class="ic" aria-hidden="true"><use href="#cal"/></svg>
        <div>
          <h3>לוח בריתות מיוחדות לשנה</h3>
          <p>לכל יום לידה: מתי היום השמיני חל בשבת, ביום טוב, ביום כיפור, בתשעה באב, בחנוכה, בפורים או בצום, וההלכה בקצרה עם מקורות. יש גם מחשבון "נולד ב...", כולל בין השמשות וניתוח קיסרי.</p>
          <p class="tl-note">בלי אתר? יש PDF מוכן להדפסה של כל השנה.</p>
          <div class="tl-go"><a class="btn btn-gold btn-sm" href="/kodesh/britot-meyuchadot/?utm_source=lemohalim&amp;utm_medium=site">לפתוח את הלוח</a><a class="btn btn-line btn-sm" href="/kodesh/britot-meyuchadot/britot-meyuchadot-5787.pdf" download data-share="bm_pdf">PDF לתשפ"ז</a></div>
        </div>
      </article>
    </div>
  </section>

  <section aria-labelledby="tools-h">
    <h2 id="tools-h">הכלים להורים</h2>
    <div class="tl-all">{share_link("all", all_text, "לשלוח להורים הכול בהודעה אחת", "btn-gold")}<p>שישה קישורים בהודעה אחת: כל הכלים חוץ מהמדריך.</p></div>
    <div class="tip"><b>להורים שלא נכנסים לאתרים</b><p>רשימת ההכנה, מועד הברית, הכיבודים, הכנות לטקס, יום הברית ואחרי הברית: כקובץ וורד, PDF להדפסה או תבנית מוכנה לווטסאפ.</p><div class="tl-go"><a class="btn btn-gold btn-sm" href="{BLI}" data-share="bli_atar">כל הכלים בלי אתר</a></div></div>
    <div class="tls">
{chr(10).join(cards)}
    </div>
  </section>

  <section aria-labelledby="more-h">
    <h2 id="more-h">עוד דפים קצרים</h2>
    <p>לשאלות שחוזרות אצל ההורים. אלה ההנחיות שלי, ואם אתם נוהגים אחרת, ההורים שלכם הולכים לפי ההנחיות שלכם.</p>
    <div class="tls">
{chr(10).join(more)}
    </div>
  </section>

  <section aria-labelledby="learn-h">
    <h2 id="learn-h">אתם הראשונים שרואים</h2>
    <div class="tip"><b>אשמח ללמוד מכם</b><p>כל דבר שצריך לתקן או לשפר, או שלא נראה לכם מדויק, אשמח שתכתבו לי. אני ממקום של ענווה, ורוצה ללמוד ולהשתפר מכם.</p><p>וגם מי שבמקרה עובר על האתר שלי ורואה דברים לתקן או לשפר, זה קריטי לי. אז תודה!</p></div>
    <div class="actions"><a class="btn btn-gold" href="{wa_fix}"><svg class="ic"><use href="#wa"/></svg> לכתוב לי תיקון או הערה</a></div>
    <div class="tip"><b>רוצים שאוסיף כלי?</b><p>כתבו לי מה חסר לכם ולהורים שלכם, ואשתדל להוסיף.</p></div>
    <div class="actions"><a class="btn btn-line" href="{wa_add}"><svg class="ic"><use href="#wa"/></svg> לכתוב לי מה להוסיף</a></div>
    <p class="tl-end">שנזכה להרבה בריתות בשמחה</p>
  </section>
</div>
"""

PAGE.parent.mkdir(parents=True, exist_ok=True)
PAGE.write_text(body, encoding="utf-8")
print("page:", PAGE)

if MD.parent.exists():
    lines = ["# הודעות מוכנות למוהלים: מה הכפתורים בדף /mohel/lemohalim/ שולחים להורים", "",
             "נוצר מ-`tools/lemohalim_gen.py` בריפו. לשון רבים להורים, עם קישור לכל כלי, ובסוף שורת קרדיט: גילעד רחמים, קולגה וחבר בפורום (גילעד, 06.11.2026).", ""]
    for key, path, icon, title, line, notice, msg in TOOLS:
        lines += [f"## {title}", "", msg.format(url=tool_url(path, key)), ""]
    for key, path, title, line, msg in MORE:
        lines += [f"## {title}", "", msg.format(url=tool_url(path, key)), ""]
    lines += ["## הכול בהודעה אחת (בלי המדריך)", "", all_text, "", "כל הודעה מסתיימת בשורה: " + CREDIT, ""]
    MD.write_text("\n".join(lines), encoding="utf-8")
    print("messages:", MD)
