# מחולל התחום "הריון ולידה": מחשבון הריון (/kelim/herayon/), 39 דפי שבוע (shavua-4 עד shavua-42) ומחשבון ביוץ.
# התוכן של כל שבוע: tools/data/herayon-weeks.json (בעברית שלנו, מתוך NHS ומשרד הבריאות).
# הפסוקים: tools/data/herayon-psukim.json – נבדקו מול ספריא, ומכאן לוקחים אותם לפי מספר (לא להקליד ידנית).
# הרצה:  python tools/herayon_pages.py && python build.py
# המחקר: ~/.claude/state/kelim-seo/research-2026-11-17-herayon.md
import io, json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src/pages/kelim/herayon"
W = json.loads((ROOT / "tools/data/herayon-weeks.json").read_text(encoding="utf-8"))
P = {p["n"]: p for p in json.loads((ROOT / "tools/data/herayon-psukim.json").read_text(encoding="utf-8"))}
SITE = " | הכלים של גילעד רחמים"
DISC = "המידע כללי ואינו מחליף רופאה / רב."

SIZE = {4: "0.2", 5: "0.2", 6: "0.6", 7: "1", 8: "1.6", 9: "2.2", 10: "3", 11: "4.1", 12: "5.4", 13: "7.4", 14: "8.5", 15: "10.1",
        16: "11.6", 17: "12", 18: "14.2", 19: "15.3", 20: "25.6", 21: "26.7", 22: "27.8", 23: "28.9", 24: "30", 25: "34.6", 26: "35.6",
        27: "36.6", 28: "37.6", 29: "38.6", 30: "39.9", 31: "41.1", 32: "42.4", 33: "43.7", 34: "45", 35: "46.2", 36: "47.4", 37: "48.6",
        38: "49.8", 39: "50.7", 40: "51.2"}
EMO = {7: "🍇", 9: "🍓", 10: "🍑", 13: "🍑", 14: "🥝", 15: "🍎", 16: "🥑", 18: "🫑", 19: "🍅", 20: "🍌", 21: "🥕", 22: "🍠", 23: "🥭",
       24: "🌽", 26: "🥒", 28: "🍆", 30: "🥬", 31: "🥥", 33: "🍍", 34: "🍈", 35: "🍈", 36: "🥬", 39: "🍉", 40: "🎃", 41: "👶", 42: "👶"}
MONTHS = [(1, 4), (5, 8), (9, 13), (14, 17), (18, 22), (23, 27), (28, 31), (32, 35), (36, 40)]
ORD = ["הראשון", "השני", "השלישי", "הרביעי", "החמישי", "השישי", "השביעי", "השמיני", "התשיעי"]

# לפי משרד הבריאות (בדיקות סקר בהריון) ולאומית; (שם, משבוע, עד שבוע)
TESTS = [("ביקור ראשון אצל רופא/ה ואחות", 6, 9), ("בדיקות דם ושתן ראשונות", 6, 12), ("אולטרסאונד לקביעת גיל ההריון", 6, 12),
         ("NIPT – בדיקת דם מתקדמת (לא בסל הבריאות)", 10, 13), ("שקיפות עורפית וסקר שליש ראשון", 11, 13),
         ("סקירת מערכות מוקדמת (בביטוח המשלים)", 12, 16), ("תבחין משולש", 16, 19), ("בדיקת מי שפיר – כשהרופא/ה ממליצים", 16, 22),
         ("סקירת מערכות מאוחרת", 20, 24), ("העמסת סוכר", 24, 28), ("חיסון נגד שעלת", 27, 36), ("אנטי D – למי שסוג הדם שלה שלילי", 28, 28),
         ("סקירה שלישית (לא חובה)", 30, 32), ("תרבית GBS", 36, 37), ("מעקב אחרי התאריך המשוער", 40, 42)]

U = dict(
    tests="https://me.health.gov.il/parenting/family-planning/pregnancy-monitoring/tests-during/screening/",
    leumit="https://www.leumit.co.il/pregnancy/during-your-pregnancy/the-tests-are-recommended-during-pregnancy/",
    warn="https://me.health.gov.il/parenting/family-planning/healthy-pregnancy/body-changes/second-trimester/",
    labor="https://me.health.gov.il/parenting/family-planning/preparing-for-labor/labor-signs/",
    moves="https://www.nhs.uk/pregnancy/keeping-well/your-babys-movements/",
    pre="https://www.nhs.uk/best-start-in-life/pregnancy/week-by-week-guide-to-pregnancy/2nd-trimester/week-25/",
    term="https://www.acog.org/clinical/guidance/committee-opinion/2013/11/definition-of-term-pregnancy",
    acogdue="https://www.acog.org/womens-health/faqs/when-pregnancy-goes-past-your-due-date",
    acogedd="https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2017/05/methods-for-estimating-the-due-date",
    nhsdue="https://www.nhs.uk/pregnancy/finding-out/due-date-calculator/",
    induce="https://www.nhs.uk/pregnancy/labour-and-birth/inducing-labour/",
    overdue="https://www.nhs.uk/best-start-in-life/pregnancy/preparing-for-labour-and-birth/overdue-have-you-gone-past-your-due-date/",
    supp="https://me.health.gov.il/parenting/family-planning/healthy-pregnancy/healthy-lifestyle/supplements/",
    meds="https://www.clalit.co.il/he/pregnancy_and_birth/pregnacy/Pages/pregnancy_meds.aspx",
    bag="https://me.health.gov.il/parenting/family-planning/preparing-for-labor/labor-bag/",
    carmel="https://hospitals.clalit.co.il/carmel/he/Departments-and-Outpatient-Clinics-main/Clinical-departments-and-clinics/Obstetrics-and-Gynecology/Pregnancy-and-Birth/Birth/Pages/delivery-room-tour.aspx",
    seat="https://www.oryarok.org.il/faq",
    sii="https://www.sii.org.il/he/safetychair",
    btl="https://www.btl.gov.il/benefits/maternity/maanakleda/Pages/OfenHagashatTvia.aspx",
)

MOHEL = ('<aside class="hr-mohel"><b>בשעה טובה – אם יהיה בן</b><p>גילעד רחמים, מוהל מוסמך, ישמח ללוות אתכם בברית מכל הלב והנשמה. '
         '<a class="gold" href="/mohel/">להכיר את המוהל</a> · <a class="gold" href="/mohel/hachana/">איך מתכוננים לברית</a> · '
         '<a class="gold" href="https://wa.me/972584049049" target="_blank" rel="noopener">058-404-9049 (ווטסאפ)</a></p></aside>')


TRI_H = {"השליש הראשון": "השליש הראשון בקצרה", "השליש השני": "השליש השני בקצרה", "השליש השלישי": "השליש השלישי בקצרה"}
TRI_P = {
    "השליש הראשון": "השליש הראשון נמשך עד סוף שבוע 12. אלה שבועות של בנייה גדולה: כמעט כל האיברים של התינוק נוצרים בהם. אצל הרבה נשים יש בתקופה הזו בחילות ועייפות, וזה טבעי לגמרי. "
                    "מנוחה, ארוחות קטנות ושתייה מרובה עוזרות, ומומלץ לקחת חומצה פולית כפי שהרופא/ה הנחו.",
    "השליש השני": "השליש השני, משבוע 13 ועד סוף שבוע 27, נחשב אצל הרבה נשים לתקופה הנוחה בהריון: הבחילות בדרך כלל נרגעות, יש יותר כוח, והבטן מתחילה להיראות. "
                  "בתקופה הזו מרגישים בדרך כלל את התנועות הראשונות, ויש בה כמה מהבדיקות החשובות.",
    "השליש השלישי": "השליש השלישי מתחיל בשבוע 28 ונמשך עד הלידה. התינוק גדל ומתחזק, ואת עשויה להרגיש כבדות, עייפות וצורך במנוחה. "
                    "זה הזמן לשים לב לתנועות התינוק בכל יום, להכין את התיק ללידה, ולאסוף כוחות בשמחה לקראת המפגש.",
}


def nhs(n):
    t = "1st-trimester" if n <= 12 else "2nd-trimester" if n <= 27 else "3rd-trimester"
    return f"https://www.nhs.uk/best-start-in-life/pregnancy/week-by-week-guide-to-pregnancy/{t}/week-{n}/"


def sefaria(p):
    m = re.match(r"(.+?) (\d+[ab]?):([\d\-]+)", p["ref_en"])
    return f"https://www.sefaria.org.il/{m.group(1).replace(' ', '_')}.{m.group(2)}.{m.group(3)}"


def tri(n):
    return "השליש הראשון" if n <= 12 else "השליש השני" if n <= 27 else "השליש השלישי"


def month(n):
    for i, (a, b) in enumerate(MONTHS):
        if a <= n <= b:
            return f"החודש {ORD[i]} להריון"
    return "אחרי החודש התשיעי – כבר עבר התאריך המשוער"


def size_txt(n):
    if n in (4, 5):
        return "כ-2 מילימטרים"
    if n <= 19:
        return f"כ-{SIZE[n]} ס״מ מהראש ועד הישבן"
    if n <= 40:
        return f"כ-{SIZE[n]} ס״מ מהראש ועד העקב"
    if n == 41:
        return "משקל ממוצע של 3 עד 4 ק״ג"
    return ""


def doc(n):
    li = ["דימום", "כאבי בטן חזקים", "הקאות שלא נפסקות, עד שקשה לשתות", "חום גבוה", "עילפון", "כאב ראש חריג"]
    if 13 <= n <= 23:
        li += ["התכווצויות סדירות או חשד לירידת מים", "מכה או חבלה בבטן"]
    if 24 <= n <= 36:
        li = ["ירידה או שינוי בתנועות התינוק – מעכשיו שמים לב אליהן כל יום", "צירים סדירים לפני שבוע 37", "חשד לירידת מים, גם טפטוף", "דימום",
              "כאבי בטן חזקים", "נפיחות פתאומית בפנים ובידיים, כאב ראש חזק, טשטוש ראייה או כאב מתחת לצלעות", "חום גבוה", "מכה או חבלה בבטן"]
    if n >= 37:
        li = ["צירים סדירים ומתמשכים", "ירידת מים, גם טפטוף", "דימום טרי", "ירידה או שינוי בתנועות התינוק – לא מחכים לבוקר",
              "כאב ראש חזק, טשטוש ראייה או כאב מתחת לצלעות", "חום גבוה"]
    where = "לחדר הלידה (מיון יולדות)" if n >= 37 else "לרופא/ה, למוקד של הקופה או למיון יולדות"
    return (f'<p>רוב ההריונות עוברים בשלום, ובכל זאת טוב לדעת מתי לא מחכים. פונים {where} כשיש:</p><ul>'
            + "".join(f"<li>{x}</li>" for x in li) + "</ul>"
            "<p>ותחושה של עצב או לחץ שלא עוברים – גם זו סיבה טובה לדבר עם הרופא/ה או האחות. בכל ספק – עדיף לשאול. במצב חירום: מד״א <span dir=\"ltr\">101</span>.</p>")


def faq_ld(faq):
    return json.dumps({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": re.sub(r"<[^>]+>", "", a)}} for q, a in faq]}, ensure_ascii=False)


def page(path, meta, body, seo, faq):
    meta["head"] = ('<link rel="stylesheet" href="/assets/seo-txt.css"><link rel="stylesheet" href="/assets/mishpacha.css"><link rel="stylesheet" href="/assets/herayon.css">'
                    '<script type="application/ld+json">' + faq_ld(faq) + "</script>")
    mj = json.dumps(meta, ensure_ascii=False, indent=2)
    faqh = ['<section class="k-sec seo-faq" aria-labelledby="seo-faq-h">', '  <h2 id="seo-faq-h">שאלות ותשובות</h2>']
    faqh += [f"  <details><summary>{q}</summary><p>{a}</p></details>" for q, a in faq]
    faqh.append("</section>")
    html = f"<!--meta {mj} -->\n{body}\n<!--seo-txt-->\n{seo}\n" + "\n".join(faqh) + "\n<!--/seo-txt-->\n"
    d = OUT / path
    d.mkdir(parents=True, exist_ok=True)
    with io.open(d / "index.html", "w", encoding="utf-8", newline="\n") as f:
        f.write(html)
    return len(re.sub(r"<[^>]+>", " ", seo).split())


def sources(items):
    return ('<section class="k-sec hr-src" aria-labelledby="src-h"><h2 id="src-h">מקורות</h2><ul>'
            + "".join(f'<li><a href="{u}" target="_blank" rel="noopener">{t}</a></li>' for t, u in items) + "</ul></section>")


def seo_sec(h2, parts):
    s = ['<section class="k-sec seo-txt" aria-labelledby="seo-h">', f'  <h2 id="seo-h">{h2}</h2>']
    for h3, txt in parts:
        if h3:
            s.append(f"  <h3>{h3}</h3>")
        s.append(f"  <p>{txt}</p>")
    s.append("</section>")
    return "\n".join(s)


def weeks_grid(cur=None):
    out = []
    for name, a, b in (("השליש הראשון", 4, 12), ("השליש השני", 13, 27), ("השליש השלישי", 28, 42)):
        out.append(f'<p class="hr-tri">{name}</p><div class="hr-weeks">' + "".join(
            f'<a href="/kelim/herayon/shavua-{n}/"{" class=\"cur\" aria-current=\"page\"" if n == cur else ""}>{n}</a>' for n in range(a, b + 1)) + "</div>")
    return "".join(out)


# ---------- דפי השבוע ----------
def week(n):
    w = W[str(n)]
    p = P[w["t"]]
    fruit, sz = w["fruit"], size_txt(n)
    tests = [t for t in TESTS if t[1] <= n <= t[2]]
    tl = "".join(f"<li>{t[0]} <small>(שבוע {t[1]}{'–' + str(t[2]) if t[2] != t[1] else ''})</small></li>" for t in tests)
    tbox = (f'<section class="hr-tests" aria-labelledby="ts-h"><h2 id="ts-h">בתקופה הזו</h2>'
            + (f"<p>לפי משרד הבריאות, אלה הבדיקות שמקובלות סביב שבוע {n}:</p><ul>{tl}</ul><p>מה מתאים לך ומתי בדיוק – קובעים עם הרופא/ה או האחות.</p>" if tests
               else f"<p>סביב שבוע {n} אין בדיקת סקר מיוחדת ברשימה של משרד הבריאות – ממשיכים במעקב הרגיל אצל הרופא/ה או האחות.</p>")
            + "</section>")
    if fruit:
        sizebox = f'<div class="hr-size"><span class="em" aria-hidden="true">{EMO.get(n, "🌱")}</span><b>בגודל של {fruit}</b><span>{sz} · {tri(n)}</span></div>'
    elif sz:
        sizebox = f'<div class="hr-size"><span class="em" aria-hidden="true">{EMO.get(n, "🌱")}</span><b>{sz}</b><span>{tri(n)}</span></div>'
    else:
        sizebox = f'<div class="hr-size"><span class="em" aria-hidden="true">{EMO.get(n, "🌱")}</span><b>שבוע 42 – הצוות מלווה מקרוב</b><span>{tri(n)}</span></div>'
    prev = f'<a class="btn btn-line btn-sm" href="/kelim/herayon/shavua-{n - 1}/">→ שבוע {n - 1}</a>' if n > 4 else "<span></span>"
    nxt = f'<a class="btn btn-line btn-sm" href="/kelim/herayon/shavua-{n + 1}/">שבוע {n + 1} ←</a>' if n < 42 else "<span></span>"
    body = f"""<header class="k-hero">
  <h1>שבוע {n} להריון</h1>
  <p class="sub">{month(n).replace(' להריון', '')}, {tri(n)}. מה קורה אצל התינוק, מה את עשויה להרגיש – ומילה טובה לדרך.</p>
</header>
<div class="tool">
  <p class="hr-mine" id="hr-mine" data-week="{n}" hidden></p>
  {sizebox}
  <section class="hr-part" aria-labelledby="p1"><h2 id="p1">👶 התינוק השבוע</h2><p>{w['baby']}</p></section>
  <section class="hr-part" aria-labelledby="p2"><h2 id="p2">🤍 מה את עשויה להרגיש</h2><p>{w['mother']}</p></section>
  {tbox}
  <section class="hr-part" aria-labelledby="p3"><h2 id="p3">💡 טיפ קטן לשבוע</h2><p>{w['tip']}</p></section>
  <section class="hr-part good" aria-labelledby="p4"><h2 id="p4">💛 מילה טובה</h2><p>{w['good']}</p></section>
  <section class="hr-part torah" aria-labelledby="p5"><h2 id="p5">📖 נקודה תורנית</h2><blockquote>{p['text']}</blockquote><cite>(<a class="gold" href="{sefaria(p)}" target="_blank" rel="noopener">{p['ref_he']}</a>)</cite><p>{w['tn']}</p></section>
  <section class="hr-part doc" aria-labelledby="p6"><h2 id="p6">🩺 מתי לפנות לרופא/ה</h2>{doc(n)}</section>
  {MOHEL if n >= 30 else ''}
  <nav class="hr-pn" aria-label="שבועות">{prev}<a class="btn btn-gold btn-sm" href="/kelim/herayon/">למחשבון ההריון</a>{nxt}</nav>
  <p class="disclaimer">{DISC} המידות והתחושות הן ממוצע – כל הריון וכל תינוק בקצב שלהם.</p>
  <div class="share-row"><a class="btn btn-line btn-sm" href="#" data-share-tool="wa" data-text="שבוע {n} להריון – מה קורה אצל התינוק, טיפ ומילה טובה לשבוע. בלי פרסומות:" target="_blank" rel="noopener"><svg class="ic"><use href="#wa"/></svg> לשלוח לחברה</a></div>
</div>
<section class="k-sec" aria-labelledby="all-h"><h2 id="all-h">הריון שבוע אחר שבוע</h2>{weeks_grid(n)}<p class="k-next">🧮 <a class="gold" href="/kelim/herayon/">מחשבון הריון ותאריך לידה משוער</a> · 📅 <a class="gold" href="/kelim/herayon/biyutz/">מחשבון ביוץ</a> · <a class="gold" href="/kelim/briut/">כלים לבריאות</a></p></section>"""
    src = [(f"NHS – מדריך ההריון שבוע אחר שבוע, שבוע {n} (באנגלית)", nhs(n))] if n <= 41 else [
        ("NHS – זירוז לידה (באנגלית)", U["induce"]), ("NHS – כשעוברים את התאריך המשוער (באנגלית)", U["overdue"]), ("ACOG – הריון שעבר את התאריך (באנגלית)", U["acogdue"])]
    src.append(("משרד הבריאות – בדיקות סקר בהריון", U["tests"]))
    if any(t[0].startswith("סקירת מערכות מוקדמת") for t in tests):
        src.append(("לאומית – הבדיקות המומלצות בהריון", U["leumit"]))
    src.append(("משרד הבריאות – שינויים בגוף ומתי לפנות", U["warn"]))
    if n >= 24:
        src.append(("NHS – תנועות התינוק (באנגלית)", U["moves"]))
    if n >= 20:
        src.append(("NHS – נפיחות ולחץ דם בהריון, שבוע 25 (באנגלית)", U["pre"]))
    if n >= 33:
        src.append(("משרד הבריאות – סימנים ללידה ומתי מגיעים לחדר לידה", U["labor"]))
    if n >= 37:
        src.append(("ACOG – הגדרת לידה במועד (באנגלית)", U["term"]))
    src.append((f"ספריא – {p['ref_he']}", sefaria(p)))
    body += "\n" + sources(src)
    left = 40 - n
    remain = (f"עד התאריך המשוער (סוף שבוע 39 ותחילת שבוע 40) נשארו בערך {left} שבועות." if left > 1 else
              "התאריך המשוער ממש קרוב – בעוד כשבוע." if left == 1 else
              "זה השבוע של התאריך המשוער. רוב הלידות קורות בין שבוע 37 לשבוע 42, כך שאין סיבה לדאגה אם התינוק עוד לא הגיע." if left == 0 else
              f"התאריך המשוער עבר לפני כ-{-left} {'שבוע' if left == -1 else 'שבועות'}, וזה קורה להרבה נשים. הצוות הרפואי מלווה אותך מקרוב.")
    size_par = (f"בשבוע {n} התינוק {'בגודל של ' + fruit + ', ' if fruit else ''}{sz}. " if sz else "") + \
        "המספרים לפי ה-NHS הבריטי, והם ממוצע בלבד: כל תינוק גדל בקצב שלו, ואת ההתפתחות בודקים הרופא/ה והאחות במעקב."
    seo = seo_sec(f"שבוע {n} להריון – איזה חודש זה ובאיזה שליש", [
        ("", f"שבוע {n} להריון הוא {month(n)}, ב{tri(n)[1:]}. את השבועות סופרים מהיום הראשון של הווסת האחרונה, ולא מיום ההתעברות – ולכן בשבוע {n} עברו בערך {n - 2} שבועות מההתעברות עצמה. "
             f"השבוע נמשך שבעה ימים: מ-{n} שבועות בדיוק (שבוע {n}+0) ועד {n} שבועות ושישה ימים (שבוע {n}+6)."),
        ("כמה זמן נשאר?", remain + " רוצה לדעת בדיוק? <a class=\"gold\" href=\"/kelim/herayon/\">במחשבון ההריון</a> מכניסים את תאריך הווסת האחרונה, או את התאריך שקיבלת מהרופא/ה, ומקבלים את השבוע המדויק, תאריך לידה משוער גם בתאריך עברי, ואת כל התאריכים החשובים של הבדיקות."),
        (f"גודל העובר בשבוע {n}" if n <= 40 else f"התינוק בשבוע {n}", size_par),
        (f"בדיקות בשבוע {n} להריון", ("לפי משרד הבריאות, סביב השבוע הזה מקובלות הבדיקות האלה: " + ", ".join(t[0] for t in tests) + ". "
                                       if tests else "סביב השבוע הזה אין בדיקת סקר מיוחדת ברשימה של משרד הבריאות, וממשיכים במעקב הרגיל. ")
         + "לא כל בדיקה מתאימה לכל אחת, וחלק מהבדיקות הן לפי בחירה. את התאריכים המדויקים קובעים עם הרופא/ה או האחות בטיפת חלב או בקופה."),
        (TRI_H[tri(n)], TRI_P[tri(n)]),
        (("מה מחכה בשבוע הבא" if n < 42 else "אחרי הלידה"),
         (f"<a class=\"gold\" href=\"/kelim/herayon/shavua-{n + 1}/\">בשבוע {n + 1}</a> " + (f"התינוק כבר בגודל של {W[str(n + 1)]['fruit']}, " if W[str(n + 1)]['fruit'] else "")
          + "ובדף שלו מחכים טיפ חדש, מילה טובה ונקודה תורנית חדשה. אפשר לשמור את הדף ולחזור אליו בכל שבוע." if n < 42 else
          "כשהתינוק כבר נולד – בשעה טובה ומוצלחת! אם נולד בן, <a class=\"gold\" href=\"/mohel/hachana/\">בדף ההכנה לברית</a> יש את כל מה שצריך לדעת על הימים שלפני הברית.")),
        ("על הדף הזה", "כל דף שבוע בנוי משישה חלקים קבועים: מה קורה אצל התינוק, מה את עשויה להרגיש, טיפ קטן, מילה טובה, נקודה תורנית קצרה, ומתי פונים לרופא/ה. "
                       "המידע הרפואי לקוח ממשרד הבריאות ומה-NHS, ונכתב מחדש בשפה פשוטה ונעימה. הפסוקים והמאמרים נבדקו מול ספריא. אין כאן פרסומות, הכול נכתב בכבוד ובצניעות, ו" + DISC),
    ])
    faq = [(f"שבוע {n} להריון זה איזה חודש?", f"{month(n)}, ב{tri(n)[1:]}."),
           (f"מה גודל העובר בשבוע {n}?", (f"בגודל של {fruit}, {sz}. זה ממוצע – כל תינוק בקצב שלו." if fruit else (f"{sz}. זה ממוצע – כל תינוק בקצב שלו." if sz else "אחרי 42 שבועות כבר לא מודדים לפי ממוצעים; הצוות מלווה מקרוב ומחליט יחד איתך על ההמשך."))),
           (f"אילו בדיקות יש סביב שבוע {n}?", ("לפי משרד הבריאות: " + ", ".join(t[0] for t in tests) + ". מה מתאים לך – קובעים עם הרופא/ה." if tests else "אין בדיקת סקר מיוחדת – ממשיכים במעקב הרגיל.")),
           (f"מתי לפנות לרופא/ה בשבוע {n}?", ("בצירים סדירים, ירידת מים, דימום או שינוי בתנועות התינוק – מגיעים לחדר הלידה." if n >= 37 else
                                              "בדימום, כאבים חזקים, חום גבוה, שינוי בתנועות התינוק, צירים סדירים או חשד לירידת מים – פונים לרופא/ה או למיון יולדות." if n >= 24 else
                                              "בדימום, כאבי בטן חזקים, הקאות שלא נפסקות, חום גבוה או עילפון – פונים לרופא/ה, למוקד של הקופה או למיון יולדות."))]
    meta = {"site": "kelim", "nav": "tchumim", "tool": f"herayon_shavua_{n}",
            "title": f"שבוע {n} להריון – גודל העובר, תחושות וטיפים" + SITE,
            "description": (f"שבוע {n} להריון: " + (f"התינוק בגודל של {fruit} ({sz}). " if fruit else "") +
                            f"מה קורה אצל התינוק, מה את עשויה להרגיש, הבדיקות בתקופה הזו, טיפ, מילה טובה ונקודה תורנית. לפי משרד הבריאות ו-NHS, בלי פרסומות."),
            "og_title": f"שבוע {n} להריון – מה קורה השבוע", "priority": "0.6",
            "crumbs": [["הריון ולידה", "/kelim/herayon/"], [f"שבוע {n}", None]],
            "foot": '<script src="/assets/herayon.js" defer></script>'}
    return page(f"shavua-{n}", meta, body, seo, faq)


# ---------- מחשבון ההריון (הדף הראשי של התחום) ----------
def main_page():
    body = f"""<header class="k-hero">
  <h1>מחשבון הריון ותאריך לידה משוער</h1>
  <p class="sub">מכניסים את היום הראשון של הווסת האחרונה – ומקבלים תאריך לידה משוער, גם בתאריך עברי, באיזה שבוע את, ומה מחכה לך השבוע. בלי פרסומות, והתאריכים נשארים רק בטלפון שלך.</p>
</header>
<div class="tool">
  <form class="k-form" id="hr-form" novalidate>
    <div class="tabs" id="hr-mode" role="tablist">
      <button type="button" role="tab" aria-selected="true" data-m="lmp">לפי הווסת האחרונה</button>
      <button type="button" role="tab" aria-selected="false" data-m="edd">יש לי תאריך מהרופא/ה</button>
      <button type="button" role="tab" aria-selected="false" data-m="ivf">אחרי החזרת עובר</button>
    </div>
    <div class="field"><label for="hr-date" id="hr-date-l">היום הראשון של הווסת האחרונה</label><input id="hr-date" type="date" required></div>
    <div class="field" data-for="lmp"><label for="hr-cycle">אורך המחזור (בימים)</label><input id="hr-cycle" type="number" min="21" max="40" value="28" inputmode="numeric"><span class="opt">לא בטוחה? השאירי 28.</span></div>
    <div class="field" data-for="ivf" hidden><label for="hr-emb">גיל העובר בהחזרה</label><select id="hr-emb"><option value="5">עובר יום 5 (בלסטוציסט)</option><option value="3">עובר יום 3</option></select></div>
    <button class="btn btn-gold btn-block" type="submit">לחשב</button>
    <p class="note" id="hr-err" aria-live="polite"></p>
  </form>
  <div id="hr-res" hidden aria-live="polite"></div>
  <template id="hr-mohel-tpl">{MOHEL}</template>
  <p class="hr-safe">🔒 התאריכים נשמרים רק בטלפון שלך ולא נשלחים לשום מקום.</p>
  <p class="disclaimer">{DISC} התאריך הוא הערכה; רוב הלידות קורות בין שבוע 37 לשבוע 42, ואת התאריך המדויק קובע/ת הרופא/ה.</p>
  <div class="share-row"><a class="btn btn-line btn-sm" href="#" data-share-tool="wa" data-text="מחשבון הריון בעברית: תאריך לידה משוער גם בתאריך עברי, באיזה שבוע את, ודף לכל שבוע. בלי פרסומות:" target="_blank" rel="noopener"><svg class="ic"><use href="#wa"/></svg> לשלוח לחברה</a></div>
</div>
<section class="k-sec" aria-labelledby="prep-h">
  <h2 id="prep-h">רשימת הכנות – מתחילת ההריון ועד הלידה</h2>
  <p>הכנה טובה מורידה לחץ ומשאירה מקום לשמחה. אחרי החישוב למעלה אפשר ללחוץ על "להוסיף תזכורות ליומן", וכל הסעיפים האלה ייכנסו ליומן שלך בזמן הנכון.</p>
  <div class="hr-prep">
    <div class="hr-part"><h3>מה לבקש מהרופא/ה בביקור הראשון</h3><span class="when">בשבועות הראשונים</span><ul>
      <li>את ההפניות לבדיקות של השליש הראשון, ולשאול מתי לבקש את ההפניות הבאות.</li>
      <li>לשאול על תוספי תזונה: משרד הבריאות ממליץ בהריון על חומצה פולית, ברזל, ויטמין D ויוד – את הכמות ומה מתאים לך קובע/ת הרופא/ה.</li>
      <li>לעבור יחד על כל תרופה קבועה. לא מפסיקים תרופה לבד – הרופא/ה יגידו מה ממשיכים ומה מחליפים.</li>
      <li>לשאול מה מותר לקחת נגד כאב ראש או חום, כדי שיהיה מוכן בבית לפני שצריך.</li>
    </ul></div>
    <div class="hr-part"><h3>הפניות ותורים – במקום ובשעה שנוחים לך</h3><span class="when">כשלושה שבועות לפני כל בדיקה</span><ul>
      <li>לבקש את ההפניה מראש ולא ברגע האחרון – בבדיקות מבוקשות התורים מתמלאים.</li>
      <li>לשאול בקופה באילו מקומות אפשר לעשות את הבדיקה, ולבחור מקום קרוב לבית או לעבודה ושעה שמתאימה לך.</li>
      <li>לשמור את כל התוצאות בקלסר אחד – הוא יצטרך להגיע איתך ללידה.</li>
    </ul></div>
    <div class="hr-part"><h3>בית החולים ללידה</h3><span class="when">בסביבות שבוע 26–30</span><ul>
      <li>לבחור בית חולים מוקדם: לבדוק כמה זמן נסיעה, ולקרוא באתר שלו מה כדאי לדעת.</li>
      <li>להירשם לסיור בחדר הלידה. בחלק מבתי החולים מבקשים להירשם כ-6 עד 8 שבועות לפני הלידה, והסיורים בדרך כלל בחינם.</li>
      <li>את הוצאות האשפוז בלידה משלם הביטוח הלאומי ישירות לבית החולים, ומענק הלידה משולם בדרך כלל אוטומטית.</li>
    </ul></div>
    <div class="hr-part"><h3>קניות שחייבים לפני הלידה</h3><span class="when">עד שבוע 32 בערך</span><ul>
      <li><b>סלקל (מושב בטיחות לתינוק)</b> – תינוק עד גיל שנה נוסע רק במושב שגבו לכיוון הנסיעה, ובית החולים לא משחרר תינוק בלי מושב בטיחות. כדאי לקנות מושב עם תו תקן, להתקין ברכב מראש לפי הוראות היצרן, ולתרגל פעם אחת.</li>
      <li>בגדים לתינוק ליציאה הביתה, שמיכה קטנה וחיתולים לימים הראשונים.</li>
    </ul></div>
    <div class="hr-part"><h3>תיק ללידה</h3><span class="when">כמה שבועות לפני – שיהיה מוכן ליד הדלת</span><ul>
      <li>תעודות זהות של שניכם וכרטיס קופת חולים.</li>
      <li>כרטיס מעקב ההריון וקלסר הבדיקות.</li>
      <li>דברים אישיים לכמה ימים, ומה שהתינוק צריך ליציאה הביתה.</li>
    </ul></div>
  </div>
</section>
<section class="k-sec" aria-labelledby="all-h">
  <h2 id="all-h">הריון שבוע אחר שבוע</h2>
  <p>לכל שבוע דף משלו: מה קורה אצל התינוק ובאיזה גודל הוא, מה את עשויה להרגיש, טיפ קטן, מילה טובה, נקודה תורנית ומתי פונים לרופא/ה.</p>
  {weeks_grid()}
</section>
<section class="k-sec" aria-labelledby="more-h">
  <h2 id="more-h">עוד בתחום</h2>
  <div class="dom">
    <a href="/kelim/herayon/biyutz/"><span class="badge">חדש</span><b>מחשבון ביוץ</b><span>ימי הפוריות, מתי לעשות בדיקת ביוץ, ולוח חודשי עם תאריך עברי. וגם הסבר פשוט איך בדיקות ביוץ עובדות.</span></a>
    <a href="/mohel/hachana/"><span class="badge">פתוח</span><b>הכנה לברית מילה</b><span>מה צריך להכין, הכיבודים, שלום זכר ופדיון הבן – הכול במקום אחד.</span></a>
    <a href="/kelim/briut/"><span class="badge">פתוח</span><b>כלים לבריאות</b><span>הכנה לביקור אצל רופא, יומן מדדים ותזכורת לתרופות.</span></a>
  </div>
</section>
""" + sources([("ACOG – שיטות לחישוב תאריך לידה משוער (באנגלית)", U["acogedd"]), ("NHS – מחשבון תאריך לידה והסבר (באנגלית)", U["nhsdue"]),
               ("ACOG – הגדרת לידה במועד (באנגלית)", U["term"]), ("ACOG – הריון שעבר את התאריך (באנגלית)", U["acogdue"]),
               ("משרד הבריאות – בדיקות סקר בהריון", U["tests"]), ("לאומית – הבדיקות המומלצות בהריון", U["leumit"]),
               ("NHS – מדריך ההריון שבוע אחר שבוע (באנגלית)", nhs(12)),
               ("משרד הבריאות – תוספי תזונה בהריון", U["supp"]), ("כללית – תרופות בהריון", U["meds"]),
               ("משרד הבריאות – הכנת תיק לידה", U["bag"]), ("בית החולים כרמל – סיור בחדר לידה", U["carmel"]),
               ("אור ירוק – מושב בטיחות לתינוק", U["seat"]), ("מכון התקנים – כיסאות בטיחות", U["sii"]),
               ("ביטוח לאומי – מענק לידה", U["btl"])])
    seo = seo_sec("איך מחשבים תאריך לידה משוער", [
        ("", "תאריך לידה משוער מחשבים מהיום הראשון של הווסת האחרונה: מוסיפים 280 ימים, שהם 40 שבועות. זו הדרך המקובלת אצל רופאים בכל העולם. "
             "אם המחזור שלך ארוך או קצר מ-28 ימים, המחשבון מזיז את התאריך בהתאם – למשל במחזור של 32 ימים התאריך זז ארבעה ימים קדימה. "
             "באולטרסאונד הראשון הרופא/ה בודקים את גודל העובר, ולפעמים מעדכנים את התאריך לפיו."),
        ("חישוב שבוע הריון – באיזה שבוע אני?", "את שבועות ההריון סופרים מהיום הראשון של הווסת האחרונה, ולא מיום ההתעברות. לכן כשאומרים \"שבוע 6\", עברו בערך ארבעה שבועות מההתעברות. "
             "המחשבון מראה את השבוע והימים (למשל 12+3 – שנים עשר שבועות ושלושה ימים), באיזה שליש את, כמה נשאר, וקישור לדף של השבוע שלך."),
        ("יש לי כבר תאריך מהרופא/ה", "אם קיבלת תאריך לידה משוער מהרופא/ה או מהאולטרסאונד – בוחרים \"יש לי תאריך מהרופא/ה\", והמחשבון סופר ממנו אחורה. "
             "כך כל התאריכים, השבועות והבדיקות מסתדרים לפי התאריך המעודכן."),
        ("הריון אחרי החזרת עובר", "אחרי הפריה חוץ גופית התאריך מדויק יותר, כי יודעים בדיוק מתי הוחזר העובר. לפי ACOG, אחרי החזרת עובר של יום 5 מוסיפים 261 ימים, ואחרי עובר של יום 3 – 263 ימים."),
        ("מחשבון תאריך לידה עברי", "ליד כל תאריך לועזי מופיע גם התאריך העברי, כך שאפשר לדעת מראש בערך באיזה חודש עברי צפויה הלידה."),
        ("למה רוב התינוקות לא נולדים בדיוק בתאריך", "התאריך המשוער הוא אמצע הטווח, לא מועד קבוע. לידה בין שבוע 37 לשבוע 42 נחשבת לידה במועד, ורק חלק קטן מהתינוקות נולדים ביום עצמו. "
             "את מועדי הבדיקות ואת ההחלטות קובעים עם הרופא/ה או האחות."),
        ("בלי פרסומות, בעדינות ובכבוד", "המחשבון ודפי השבועות נבנו לציבור הדתי ולכל אחת: בלי פרסומות, בשפה נעימה ומחזקת, עם נקודה תורנית קטנה לכל שבוע. "
             "התאריכים נשמרים רק בטלפון שלך. הכלי חלק ממיזם הכלים של גילעד רחמים."),
    ])
    faq = [("איך מחשבים תאריך לידה משוער?", "מהיום הראשון של הווסת האחרונה מוסיפים 280 ימים (40 שבועות). במחזור ארוך או קצר מ-28 ימים מזיזים לפי ההפרש."),
           ("באיזה שבוע אני בהריון?", "סופרים מהיום הראשון של הווסת האחרונה. במחשבון מכניסים את התאריך ומקבלים את השבוע והימים, והשליש."),
           ("כמה מדויק תאריך הלידה המשוער?", "זו הערכה. רוב הלידות קורות בין שבוע 37 לשבוע 42, ואת התאריך המדויק קובע/ת הרופא/ה, בדרך כלל לפי האולטרסאונד."),
           ("אפשר לחשב תאריך לידה אחרי הפריה חוץ גופית?", "כן. בוחרים \"אחרי החזרת עובר\", מכניסים את תאריך ההחזרה ואת יום העובר (3 או 5)."),
           ("יש תאריך עברי?", "כן. ליד תאריך הלידה המשוער מופיע גם התאריך העברי."),
           ("אפשר להכניס את כל הבדיקות ליומן?", "כן. אחרי החישוב לוחצים \"להוסיף תזכורות ליומן\": כל הבדיקות וההכנות נכנסות ליומן, ושלושה שבועות לפני כל בדיקה מגיעה תזכורת לבקש הפניה ולקבוע תור."),
           ("מה חייבים לקנות לפני הלידה?", "קודם כול מושב בטיחות לתינוק (סלקל): בית החולים לא משחרר תינוק בלי מושב, ותינוק עד גיל שנה נוסע עם הגב לכיוון הנסיעה. כדאי להתקין אותו ברכב מראש."),
           ("התאריכים שלי נשמרים אצלכם?", "לא. הם נשמרים רק בטלפון שלך ולא נשלחים לשום מקום.")]
    meta = {"site": "kelim", "nav": "tchumim", "tool": "herayon",
            "title": "מחשבון הריון – תאריך לידה משוער ובאיזה שבוע אני" + SITE,
            "description": "מחשבון הריון בעברית: תאריך לידה משוער לפי הווסת האחרונה, לפי תאריך מהרופא/ה או אחרי החזרת עובר – גם בתאריך עברי. באיזה שבוע את, השליש, תאריכי הבדיקות, ודף לכל שבוע. בלי פרסומות, נשמר רק בטלפון.",
            "og_title": "מחשבון הריון ותאריך לידה משוער", "priority": "0.8",
            "crumbs": [["הריון ולידה", None]],
            "foot": '<script src="/assets/herayon.js" defer></script>'}
    return page("", meta, body, seo, faq)


# ---------- מחשבון הביוץ ----------
def biyutz():
    body = f"""<header class="k-hero">
  <h1>מחשבון ביוץ וימי פוריות</h1>
  <p class="sub">מכניסים את היום הראשון של המחזור האחרון ואת אורך המחזור – ומקבלים את הביוץ המשוער, את ימי הפוריות, ומתי להתחיל בדיקות ביוץ. עם לוח חודשי ותאריך עברי.</p>
</header>
<div class="tool">
  <form class="k-form" id="bz-form" novalidate>
    <div class="field"><label for="bz-date">היום הראשון של המחזור האחרון</label><input id="bz-date" type="date" required></div>
    <div class="field" id="bz-reg"><label for="bz-cycle">אורך המחזור (בימים)</label><input id="bz-cycle" type="number" min="21" max="40" value="28" inputmode="numeric"><span class="opt">מהיום הראשון של מחזור אחד עד היום הראשון של הבא. לא בטוחה? השאירי 28.</span></div>
    <label class="bz-chk"><input type="checkbox" id="bz-irr"> המחזור שלי לא סדיר</label>
    <div class="bz-two" id="bz-irrf" hidden>
      <div class="field"><label for="bz-short">המחזור הקצר ביותר</label><input id="bz-short" type="number" min="21" max="40" value="26" inputmode="numeric"></div>
      <div class="field"><label for="bz-long">המחזור הארוך ביותר</label><input id="bz-long" type="number" min="21" max="40" value="32" inputmode="numeric"></div>
    </div>
    <button class="btn btn-gold btn-block" type="submit">לחשב</button>
    <p class="note" id="bz-err" aria-live="polite"></p>
  </form>
  <div id="bz-res" hidden aria-live="polite">
    <div class="bz-out"></div>
    <div id="bz-cal"></div>
    <div class="bz-leg"><span><i class="l-p1"></i>יום 1 למחזור</span><span><i class="l-tst"></i>ימי בדיקות ביוץ</span><span><i class="l-fert"></i>ימי פוריות</span><span><i class="l-ov"></i>ביוץ משוער</span></div>
  </div>
  <p class="hr-safe">🔒 התאריכים נשמרים רק בטלפון שלך ולא נשלחים לשום מקום.</p>
  <p class="note">ביוץ לפני הטבילה? יש לזה פתרונות; פונים לרופאה ולרב או ליועצת הלכה.</p>
  <p class="disclaimer">זו הערכה בלבד ולא אמצעי למניעת הריון. אם אחרי שנה לא נקלט הריון – או אחרי חצי שנה מעל גיל 35 – פונים לרופא/ה. {DISC}</p>
  <div class="share-row"><a class="btn btn-line btn-sm" href="#" data-share-tool="wa" data-text="מחשבון ביוץ בעברית: ימי פוריות, מתי לעשות בדיקת ביוץ, ולוח חודשי עם תאריך עברי. בלי פרסומות:" target="_blank" rel="noopener"><svg class="ic"><use href="#wa"/></svg> לשלוח לחברה</a></div>
</div>
<section class="k-sec" aria-labelledby="lh-h">
  <h2 id="lh-h">איך עובדת בדיקת ביוץ?</h2>
  <p>בדיקת ביוץ ביתית מודדת בשתן הורמון שנקרא LH. יום-יומיים לפני הביוץ כמות ההורמון עולה בבת אחת – זה \"הגל\" שהבדיקה מחפשת. כשהבדיקה חיובית, הביוץ צפוי בדרך כלל בתוך 24 עד 36 שעות, ואלה הימים הכי טובים להיכנס להריון.</p>
  <ol class="bz-steps">
    <li>מתחילים בתאריך שהמחשבון נותן – כמה ימים לפני הביוץ המשוער. במחזור של 28 ימים זה יום 11.</li>
    <li>בודקים פעם ביום, באותה שעה בכל יום, לפי ההוראות של הערכה שקנית.</li>
    <li>לא שותים הרבה לפני הבדיקה, כדי שהשתן לא יהיה מדולל.</li>
    <li>איך יודעים שהתוצאה חיובית – לפי ההוראות של הערכה. כל ערכה קצת שונה.</li>
    <li>ממשיכים עד שמתקבלת תוצאה חיובית. ערכה רגילה מכילה בדרך כלל 5 עד 7 בדיקות.</li>
  </ol>
  <p>הבדיקות מדויקות בערך ב-9 מכל 10 פעמים. במחזור לא סדיר אפשר לפספס את הגל, וכדאי להתייעץ עם הרופא/ה. יש תרופות שמשפיעות על התוצאה – אם את מטופלת בתרופות לפוריות, שאלי את הרופא/ה איך לבדוק.</p>
</section>
<section class="k-sec" aria-labelledby="more-h">
  <h2 id="more-h">עוד בתחום</h2>
  <div class="dom">
    <a href="/kelim/herayon/"><span class="badge">חדש</span><b>מחשבון הריון ותאריך לידה משוער</b><span>באיזה שבוע את, תאריך לידה משוער גם בתאריך עברי, ודף לכל שבוע.</span></a>
    <a href="/kelim/briut/rofe/"><span class="badge">פתוח</span><b>הכנה לביקור אצל רופא</b><span>שאלות ורשימה מסודרת – כדי לא לשכוח כלום בתור.</span></a>
  </div>
</section>
""" + sources([("NHS – פוריות במחזור החודשי (באנגלית)", "https://www.nhs.uk/conditions/periods/fertility-in-the-menstrual-cycle/"),
               ("NHS – מנסים להיכנס להריון (באנגלית)", "https://www.nhs.uk/pregnancy/trying-for-a-baby/trying-to-get-pregnant/"),
               ("מכבי – סימני ביוץ", "https://www.maccabi4u.co.il/maccabi_circles/fertility/ovulation_signs/"),
               ("Cleveland Clinic – ביוץ (באנגלית)", "https://my.clevelandclinic.org/health/articles/23439-ovulation"),
               ("FDA – בדיקת ביוץ בשתן (באנגלית)", "https://www.fda.gov/medical-devices/home-use-tests/ovulation-urine-test"),
               ("MedlinePlus – בדיקת LH בשתן (באנגלית)", "https://medlineplus.gov/ency/article/007062.htm"),
               ("ACOG – בירור פוריות (באנגלית)", "https://www.acog.org/womens-health/faqs/evaluating-infertility"),
               ("NHS – פוריות (באנגלית)", "https://www.nhs.uk/conditions/infertility/")])
    seo = seo_sec("מתי יש ביוץ?", [
        ("", "הביוץ קורה בדרך כלל כ-14 ימים לפני תחילת המחזור הבא. לכן במחזור של 28 ימים הביוץ צפוי בערך ביום 14, ובמחזור של 32 ימים – בערך ביום 18. "
             "המחשבון לוקח את היום הראשון של המחזור האחרון, מוסיף את אורך המחזור ומוריד 14 ימים. זו הערכה: אצל רוב הנשים הביוץ קורה בין 10 ל-16 ימים לפני המחזור הבא."),
        ("ימי ביוץ וחלון הפוריות", "הביצית חיה כ-12 עד 24 שעות אחרי הביוץ, אבל תאי הזרע יכולים לחיות כמה ימים. לכן חלון הפוריות מתחיל כחמישה ימים לפני הביוץ ונגמר כיום אחריו. "
             "בלוח החודשי הימים האלה מסומנים בירוק, ויום הביוץ המשוער בזהב."),
        ("מתי לעשות בדיקת ביוץ", "כדי לא לפספס את גל ההורמון, מתחילים לבדוק כמה ימים לפני הביוץ המשוער. במחזור של 28 ימים מתחילים ביום 11. "
             "המחשבון מחשב את יום ההתחלה לפי אורך המחזור שלך, ומסמן בכחול את ימי הבדיקה."),
        ("מחזור לא סדיר", "אם המחזור משתנה מחודש לחודש, מסמנים \"המחזור שלי לא סדיר\" וכותבים את המחזור הקצר ביותר ואת הארוך ביותר. "
             "המחשבון מתחיל את הבדיקות לפי הקצר, כדי לא לאחר, ומראה טווח רחב יותר של ימי פוריות. במחזור לא סדיר כדאי להתייעץ עם הרופא/ה."),
        ("מתי פונים לרופא/ה", "אם אחרי שנה של ניסיונות לא נקלט הריון, פונים לרופא/ה. מעל גיל 35 – אחרי חצי שנה, ומעל גיל 40 כדאי לפנות כבר בהתחלה. גם מחזור לא סדיר מאוד הוא סיבה טובה להתייעץ."),
        ("בלי פרסומות ובצניעות", "המחשבון נבנה לציבור הדתי ולכל אחת: בלי פרסומות, בלי המלצות על מותגים, ובשפה עדינה. התאריכים נשמרים רק בטלפון שלך, ואפשר לחזור לדף בכל חודש ולחשב שוב לפי המחזור החדש. הכלי חלק ממיזם הכלים של גילעד רחמים."),
    ])
    faq = [("איך מחשבים ביוץ?", "מהיום הראשון של המחזור האחרון מוסיפים את אורך המחזור ומורידים 14 ימים. במחזור של 28 ימים – בערך ביום 14."),
           ("מה הם ימי הפוריות?", "בערך חמישה ימים לפני הביוץ ועד יום אחריו."),
           ("מתי לעשות בדיקת ביוץ?", "כמה ימים לפני הביוץ המשוער. במחזור של 28 ימים מתחילים ביום 11, ובודקים כל יום עד שהתוצאה חיובית."),
           ("איך עובדת בדיקת ביוץ?", "היא מזהה בשתן עלייה בהורמון LH, שמגיעה יום-יומיים לפני הביוץ. אחרי תוצאה חיובית הביוץ צפוי בתוך 24 עד 36 שעות."),
           ("אפשר להשתמש במחשבון כדי למנוע הריון?", "לא. זו הערכה בלבד ולא אמצעי למניעת הריון."),
           ("מה עושים כשהמחזור לא סדיר?", "מסמנים \"המחזור שלי לא סדיר\" וכותבים את הקצר והארוך. כדאי גם להתייעץ עם הרופא/ה.")]
    meta = {"site": "kelim", "nav": "tchumim", "tool": "biyutz",
            "title": "מחשבון ביוץ – ימי ביוץ ומתי לעשות בדיקת ביוץ" + SITE,
            "description": "מחשבון ביוץ בעברית: ביוץ משוער, ימי פוריות ומתי להתחיל בדיקות ביוץ, גם במחזור לא סדיר. לוח חודשי עם תאריך עברי, והסבר פשוט איך בדיקת ביוץ עובדת. בלי פרסומות, נשמר רק בטלפון.",
            "og_title": "מחשבון ביוץ וימי פוריות", "priority": "0.7",
            "crumbs": [["הריון ולידה", "/kelim/herayon/"], ["מחשבון ביוץ", None]],
            "foot": '<script src="/assets/biyutz.js" defer></script>'}
    return page("biyutz", meta, body, seo, faq)


def main():
    print("main seo words:", main_page())
    print("biyutz seo words:", biyutz())
    low = []
    for n in range(4, 43):
        c = week(n)
        if c < 250:
            low.append((n, c))
    print("weeks written: 39; under 250 words:", low)


if __name__ == "__main__":
    main()
