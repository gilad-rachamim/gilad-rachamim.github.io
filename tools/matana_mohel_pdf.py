# -*- coding: utf-8 -*-
"""בונה את ה-PDF "איך נהיים מוהל: מפת הדרך" אל assets/mohel-mapat-derech.pdf. הרצה: python -X utf8 tools/matana_mohel_pdf.py
החומר כולו מהאתר הציבורי של המוהל (/kodesh/mohalim/); בלי חומר של הרב צדוק."""
import html, pathlib
from playwright.sync_api import sync_playwright
E_ = html.escape
OUT = pathlib.Path(__file__).resolve().parent.parent / "assets" / "mohel-mapat-derech.pdf"
CSS = """@page{size:A4;margin:16mm 16mm}body{font-family:"Segoe UI",Arial,sans-serif;direction:rtl;color:#1d2330;font-size:12pt;line-height:1.65;margin:0}
.pg{page-break-after:always}h1{font-size:22pt;color:#14213d;margin:4pt 0 6pt}h2{font-size:14pt;color:#1f6f5c;border-bottom:1.5px solid #d8b35f;padding-bottom:2pt;margin:14pt 0 4pt}
.box{background:#f3efe4;border-right:4px solid #d8b35f;padding:8pt 12pt;border-radius:4px;margin:10pt 0}
ul{padding-right:18pt;padding-left:0}li{margin:3pt 0}.fine{font-size:9.5pt;color:#5a6270}.ft{margin-top:16pt;padding-top:6pt;border-top:1px solid #ccc;font-size:10pt;color:#5a6270}
.cover{text-align:center;padding-top:110pt}.cover h1{font-size:30pt}.k{color:#a07c2c;font-weight:700}"""
P = [
 ("שלב 1: להבין מה המקצוע באמת", [
  "מוהל הוא מי שמלווה משפחה ברגע גדול מאוד של חייה. הברית עצמה היא דקות ספורות; סביבה יש הכנה, שיחות עם ההורים, תיאום, וליווי אחרי הברית.",
  "לפני שמתחילים, כדאי לשאול את עצמכם: האם אני אוהב להיות עם אנשים ברגעי התרגשות? האם אני רגוע תחת לחץ? האם אני מוכן להיות זמין גם בשבת, בחגים ובשעות לא נוחות?",
  "מי שעונה כן על אלה, בדרך כלל מתאים. השאר נלמד."]),
 ("שלב 2: לימוד והסמכה", [
  "הדרך הנכונה היא ללמוד אצל גורם מוסמך ולהסמיך רשמית. אין קיצור: הסמכה היא מה שנותן להורים ביטחון, ולכם שקט.",
  "בדקו מי מסמיך, כמה זמן נמשך הלימוד, ומה כולל החלק המעשי. שאלו מוהלים שכבר עברו את הדרך, ולא רק את בית הספר.",
  "אחרי ההסמכה מתחילים בליווי של מוהל מנוסה, ורק אחר כך לבד."]),
 ("שלב 3: תרגול מעשי, לאט ובלי לחץ", [
  "הידיים לומדות רק מתרגול. מתרגלים על בובה, שוב ושוב, עד שהתנועות רגועות ובטוחות.",
  "אחר כך צופים בבריתות אמיתיות, ומסייעים לפני שמבצעים. אל תמהרו לעבור שלב: הביטחון נבנה בהדרגה."]),
 ("שלב 4: ללמוד לדבר עם ההורים", [
  "חצי מהמקצוע הוא שיחה. הורים מגיעים עם שאלות, חששות ולפעמים עם הרבה מתח. מוהל טוב מקשיב קודם.",
  "מה כדאי להכין מראש: הסבר פשוט על מה קורה ביום הברית, מה להביא, מתי מאכילים, ומתי להתקשר אליכם מיד אחרי הברית.",
  "בהמשך נראה איך לשלוח להורים הכול בהודעה אחת מסודרת, כדי שלא יחפשו."]),
 ("שלב 5: כלי עבודה שכבר מוכנים בשבילכם", [
  "באתר hakelim.com/kodesh/mohalim יש כלים בחינם לכל מוהל, ואפשר להשתמש בהם מהיום:",
  "יומן בריתות מהטלפון, עם תזכורות. טופס פרטי הברית שההורים ממלאים בעצמם, והוא מגיע אליכם בהודעת ווטסאפ אחת. כרטיס ביקור דיגיטלי. כרטיס כיבודים. הודעות מוכנות להורים לכל שלב. לוח בריתות מיוחדות לשנה (שבת, חג, צום ועוד). מחשבון מועד הברית.",
  "אלה חוסכים שעות, ומאפשרים לכם להתרכז במה שחשוב: בני אדם."]),
 ("שלב 6: למצוא את ההורים הראשונים", [
  "בהתחלה לא מגיעים הרבה. מה שעובד: עבודה הגונה, המלצות מהורים מרוצים, נוכחות ברורה באינטרנט, ושיחה חמה לפני הברית.",
  "אל תתחרו על מחיר. הורים בוחרים מוהל שהם סומכים עליו.",
  "והכי חשוב: אחרי כל ברית, להתקשר ולבדוק מה שלום התינוק. אלה ההורים שימליצו עליכם."]),
]
body = '<div class="pg cover"><div class="k">hakelim.com · מיזם הכלים</div><h1>איך נהיים מוהל: מפת הדרך</h1><p>מדריך קצר למי שחושב להתחיל, מאת גילעד רחמים אביעד, מוהל מוסמך</p><p class="fine">בסייעתא דשמיא</p></div>'
for i in range(0, len(P), 2):
    body += '<div class="pg">'
    for t, ps in P[i:i+2]:
        body += f"<h1>{E_(t)}</h1>" + "".join(f"<p>{E_(x)}</p>" for x in ps)
    body += "</div>"
body += '<div class="pg"><h1>ומה עכשיו?</h1><div class="box"><p>אם אתם רוצים ללכת את כל הדרך עם ליווי, כולל ליווי מעשי על בובה, יש קורס מלא. אני מלווה אתכם צעד אחר צעד.</p></div><p>יש לכם שאלה לפני שמחליטים? כתבו לי בווטסאפ: 058-404-9049. אשמח לענות.</p><div class="ft">גילעד רחמים אביעד · מוהל מוסמך · ירושלים, מגיע לכל הארץ · hakelim.com/mohel<br>המדריך כללי, ואינו תחליף ללימוד והסמכה אצל גורם מוסמך. כל הזכויות שמורות.</div></div>'
h = f'<html dir="rtl"><head><meta charset="utf-8"><style>{CSS}</style></head><body>{body}</body></html>'
with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe", headless=True)
    pg = b.new_page(); pg.set_content(h); pg.pdf(path=str(OUT), format="A4", print_background=True); b.close()
print(OUT, OUT.stat().st_size)
