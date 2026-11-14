# -*- coding: utf-8 -*-
"""דף "שאלות טריוויה עם תשובות" (13.11.2026, סבב "מומחה מספר אחת"): /kelim/chashiva/chidon/sheelot/
ב"חיפושים קשורים" של "טריוויה": "שאלות טריוויה עם תשובות", "שאלות טריוויה למבוגרים", "טריוויה לילדים";
במקום 5 בגוגל עומד דף של 100 שאלות עם תשובות. השאלות נלקחות ממאגר החידון (assets/chashiva-chidon-data.js),
כך שכל שאלה שנוספת שם נכנסת גם לכאן בריצה הבאה.
מריצים:  python tools/chidon_sheelot_page.py   ואז  python build.py"""
import json, pathlib, re, html

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = (ROOT / "assets" / "chashiva-chidon-data.js").read_text(encoding="utf-8")
B = re.search(r"var B = `(.*?)`", DATA, re.S).group(1)
CATS = dict(re.findall(r"\['(\w+)', '([^']+)'\]", re.search(r"CHIDON_CATS = \[(.*?)\];", DATA, re.S).group(1)))
rows = [l.split("|") for l in B.strip().splitlines() if l.count("|") >= 5]
ORDER = ["klali", "mada", "geo", "guf", "cheshbon"]
groups = {c: [r for r in rows if r[0] == c] for c in ORDER}
esc = lambda s: html.escape(s.strip(), quote=False)

lists, n = [], 0
for c in ORDER:
    if not groups[c]: continue
    items = []
    for r in groups[c]:
        n += 1
        items.append(f"    <li><span class=\"tq\">{esc(r[1])}</span> <span class=\"ta\">תשובה: <b>{esc(r[2])}</b></span></li>")
    lists.append(f'  <h2 id="cat-{c}">{esc(CATS.get(c, c))} ({len(groups[c])} שאלות)</h2>\n  <ol class="tv-list">\n' + "\n".join(items) + "\n  </ol>")

FAQ = [
    ("איפה יש שאלות טריוויה עם תשובות?", f"בדף הזה: {n} שאלות טריוויה בעברית, עם התשובה ליד כל שאלה, מחולקות לנושאים. אפשר להדפיס, או לשחק בהן כחידון בדף הטריוויה."),
    ("השאלות מתאימות לילדים?", "רובן כן, מגיל 9 בערך. השאלות בחשבון ובגוף האדם מתאימות במיוחד לילדים, ושאלות הארצות וההיסטוריה טובות למבוגרים ולמשפחה."),
    ("אפשר להדפיס את השאלות?", "כן. הכפתור \"להדפיס\" מדפיס את רשימת השאלות והתשובות בלבד, בלי תפריטים."),
    ("איך עושים ערב טריוויה עם השאלות?", "מחלקים לקבוצות, קוראים שאלה בקול, נותנים 20 שניות לתשובה, ונותנים נקודה על כל תשובה נכונה. כדי שאף אחד לא יציץ, המנחה מחזיק את הדף המודפס."),
    ("התשובות בדוקות?", "כן. במאגר נכנסות רק עובדות בדוקות ומוסכמות, בלי שאלות שנויות במחלוקת. מצאתם טעות? אפשר לכתוב לנו בדף בקשת כלי (hakelim.com/kelim/bakasha)."),
]
ld = json.dumps({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
    {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQ]}, ensure_ascii=False)
CSS = ('<link rel="stylesheet" href="/assets/seo-txt.css"><style>.tv-list{padding-inline-start:1.4rem;margin:.4rem 0 1.2rem}'
       '.tv-list li{margin:.45rem 0;line-height:1.7;color:var(--body)}.tv-list .ta{display:block;color:var(--muted);font-size:.95rem}'
       '.tv-list .ta b{color:var(--gold-hi)}.tv-actions{display:flex;flex-wrap:wrap;gap:.5rem;justify-content:center;margin:.6rem 0}'
       '@media print{.tv-actions,.k-hero .sub{display:none}.tv-list li{color:#000}.tv-list .ta,.tv-list .ta b{color:#000}h2{color:#000}}</style>')
meta = {"site": "kelim", "nav": "tchumim", "tool": "chashiva_chidon",
        "title": f"שאלות טריוויה עם תשובות: {n} שאלות ידע כללי בעברית, להדפסה | הכלים של גילעד רחמים",
        "description": f"{n} שאלות טריוויה עם תשובות, בעברית: ידע כללי, מדע וטבע, ארצות, גוף האדם וחשבון. לערב טריוויה, לכיתה ולמשפחה. להדפסה בלחיצה, או לשחק בהן כחידון עם ניקוד. בחינם.",
        "og_title": f"{n} שאלות טריוויה עם תשובות – להדפסה ולערב חידון", "priority": "0.7",
        "crumbs": [["משחקי חשיבה", "/kelim/chashiva/"], ["טריוויה", "/kelim/chashiva/chidon/"], ["שאלות עם תשובות", None]],
        "head": CSS + '<script type="application/ld+json">' + ld + "</script>",
        "foot": "<script>document.getElementById('tv-print').addEventListener('click',function(){if(window.toolUsed)window.toolUsed('chashiva_chidon',{action:'print_list'});window.print();});</script>"}
nav = " · ".join(f'<a href="#cat-{c}">{esc(CATS.get(c, c))}</a>' for c in ORDER if groups[c])
fq = "\n".join(f"  <details><summary>{q}</summary><p>{a}</p></details>" for q, a in FAQ)
body = f'''<header class="k-hero">
  <h1>שאלות טריוויה עם תשובות</h1>
  <p class="sub">{n} שאלות ידע כללי בעברית, עם התשובה ליד כל שאלה. לקרוא, להדפיס, או לשחק כחידון.</p>
</header>
<div class="tool">
  <div class="tv-actions"><button class="btn btn-gold" type="button" id="tv-print">🖨 להדפיס את השאלות</button><a class="btn btn-line" href="/kelim/chashiva/chidon/">❓ לשחק כחידון עם ניקוד</a></div>
  <p style="text-align:center">{nav}</p>
</div>
<section class="k-sec" aria-label="השאלות והתשובות">
{chr(10).join(lists)}
</section>

<!--seo-txt-->
<section class="k-sec seo-txt" aria-labelledby="seo-h">
  <h2 id="seo-h">שאלות טריוויה עם תשובות: איך להשתמש בהן</h2>
  <p>הרשימה הזאת נבנתה לכל מי שצריך שאלות טריוויה מוכנות: מורה שמכינה חידון לסוף שיעור, משפחה שעושה ערב חידון בשישי, מדריך בתנועת נוער, או מי שמארגן תחרות בעבודה. כל שאלה כתובה בעברית פשוטה, והתשובה מופיעה מתחתיה, כך שאפשר לקרוא בקול בלי להתבלבל. השאלות מחולקות לחמישה נושאים: ידע כללי והיסטוריה, מדע וטבע, ארצות ומקומות, גוף האדם וחשבון וצורות.</p>
  <h3>ערב טריוויה בבית או בכיתה</h3>
  <p>מחלקים את המשתתפים לשתיים-שלוש קבוצות. המנחה קורא שאלה, כל קבוצה כותבת תשובה על דף, ואחרי 20 שניות מגלים. תשובה נכונה שווה נקודה, ואפשר לתת שתי נקודות על שאלות קשות. כדי לגוון, כל סבב יהיה מנושא אחר. בסוף הערב, הקבוצה המנצחת בוחרת את הנושא לשבוע הבא.</p>
  <h3>טריוויה לילדים ולמבוגרים</h3>
  <p>שאלות החשבון וגוף האדם מתאימות במיוחד לילדים בבית הספר היסודי, והן גם דרך כיפית לחזור על חומר. שאלות הארצות, ההיסטוריה והעברית טובות לנוער ולמבוגרים. בערב משפחתי כדאי לערבב, ולתת לילדים לענות ראשונים על השאלות הקלות.</p>
  <h3>לשחק כחידון עם ניקוד</h3>
  <p>מי שמעדיף לשחק בטלפון ימצא את אותן שאלות, ועוד שאלות על חגים, תנ"ך וארץ ישראל, ב<a href="/kelim/chashiva/chidon/">חידון הטריוויה היומי</a>: עשר שאלות ביום עם ניקוד, אתגר לחבר ומצב תרגול ללא הגבלה. לבחירה אקראית של מי עונה, יש <a href="/kelim/chashiva/galgal-shemot/">גלגל שמות</a>, ולשאלות היכרות <a href="/kelim/chashiva/galgal/sheelot/">גלגל שאלות</a>.</p>
</section>
<section class="k-sec seo-faq" aria-labelledby="seo-faq-h">
  <h2 id="seo-faq-h">שאלות ותשובות</h2>
{fq}
</section>
<!--/seo-txt-->
'''
out = ROOT / "src" / "pages" / "kelim" / "chashiva" / "chidon" / "sheelot" / "index.html"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(("<!--meta " + json.dumps(meta, ensure_ascii=False, indent=2) + " -->\n" + body).replace("\n", "\r\n"), encoding="utf-8", newline="")
print("wrote", out.relative_to(ROOT), n, "questions")
