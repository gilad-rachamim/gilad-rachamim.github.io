"""דף נחיתה "בקרוב": קוד האימות מהטלפון נכנס לבד למחשב (הגשר של התוסף, גרסה 3.7.0).
מחקר: ~/.claude/state/kelim-seo/research-2026-11-17-kod-imut-bamachshev.md – ביטוי ראשי "קישור טלפון למחשב".
עובדות הפרטיות רק מ-tools/gesher-worker/PROTOCOL.md (ענף claude/gesher): ממסר עיוור, הצפנה מקצה לקצה,
שום תוכן/קוד/לוג לא נשמר. לא כותבים "בלי שרת", לא מבטיחים תאריך, ולא כותבים שעובד באייפון (אפליקציה לאנדרואיד בלבד).
הרצה: python tools/tosaf_promo/kod_bamachshev_page.py  (כותב רק את הדף הזה)
"""
import io, json, pathlib
R = pathlib.Path(__file__).resolve().parents[2]
SLUG = 'kod-bamachshev'
S = "https://chromewebstore.google.com/detail/ckjmijllmaoooihonpedfajaofhbegfg?utm_source=hakelim&amp;utm_medium="


def btn(place, label='🧩 מתקינים היום – העדכון יגיע לבד'):
    return '<a class="btn btn-gold" href="%s%s" target="_blank" rel="noopener" data-store="%s">%s</a>' % (S, place, place, label)


FAQ = [
    ('איך רואים הודעות SMS במחשב?',
     'בטלפון אנדרואיד: נכנסים במחשב ל-messages.google.com/web וסורקים את הקוד בטלפון, באפליקציית "הודעות" של Google ← תמונת הפרופיל ← "צימוד מכשירים". ב-Windows אפשר גם "קישור לטלפון" (Phone Link) של מיקרוסופט. שתי הדרכים חינמיות.'),
    ('מה זה "קישור לטלפון" ב-Windows?',
     'אפליקציה של מיקרוסופט שכבר מותקנת ב-Windows 10 ו-11. מצמדים אותה פעם אחת לטלפון, ורואים במחשב הודעות, התראות ותמונות מהטלפון. היא מציגה את הקוד, אבל לא מכניסה אותו בשבילכם לשדה בדפדפן.'),
    ('מה יעשה העדכון של התוסף?',
     'סורקים QR פעם אחת עם אפליקציית מיזם הכלים לאנדרואיד. מאז, כשמגיע לטלפון קוד אימות (SMS, ווטסאפ או מייל) ואתם מול אתר בכרום במחשב – הקוד מופיע בכרום וממולא לבד בשדה הקוד. התוסף תמיד מראה מאיפה הקוד הגיע.'),
    ('מתי זה יוצא?',
     'בקרוב, בלי תאריך מוגדר: קודם צריכה להיות מוכנה אפליקציית הטלפון. מי שכבר התקין את התוסף מקבל את העדכון לבד – כרום מעדכן תוספים אוטומטית.'),
    ('זה בטוח? מישהו יכול לראות את הקודים?',
     'הקוד עובר מוצפן מקצה לקצה: המפתחות נוצרים בסריקת ה-QR ונשארים רק במחשב ובטלפון שלכם. השרת באמצע הוא ממסר עיוור – מעביר בתים מוצפנים ולא יכול לפתוח אותם. לא נשמרים בו תוכן, קודים, שמות שולחים או לוגים, ולא נשלח כלום ל-Google Analytics. ניתוק מכל צד מוחק את הצימוד.'),
    ('זה יעבוד גם באייפון?',
     'בשלב הזה לא: הגשר עובד עם אפליקציה לאנדרואיד. באייפון יש לאפל מילוי קוד מובנה מ-SMS בתוך האייפון ובמק.'),
]

FAQ_LD = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
    {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQ]}

STYLE = ('<style>.ts-two{display:grid;gap:1rem}@media(min-width:760px){.ts-two{grid-template-columns:1fr 1fr}}'
         '.ts-two>div{border:1px solid var(--line);border-radius:14px;padding:.9rem 1rem}.ts-two h3{margin-top:0}'
         '.kb-soon{display:inline-block;background:var(--gold,#c9a227);color:#111;font-weight:700;border-radius:999px;padding:.15rem .7rem;font-size:.9rem;margin-bottom:.5rem}'
         '.kb-steps{counter-reset:s;list-style:none;padding:0;display:grid;gap:.7rem}'
         '.kb-steps li{counter-increment:s;border:1px solid var(--line);border-radius:14px;padding:.8rem 1rem .8rem 1rem;position:relative;padding-inline-start:3.2rem}'
         '.kb-steps li::before{content:counter(s);position:absolute;inset-inline-start:1rem;top:.75rem;width:1.7rem;height:1.7rem;border-radius:50%;'
         'background:var(--gold,#c9a227);color:#111;font-weight:700;display:grid;place-items:center}'
         '.kb-lock{border:1px solid var(--line);border-radius:14px;padding:.9rem 1rem}</style>')

meta = {
    "site": "kelim", "nav": "tchumim", "tool": "machshev_kod_bamachshev",
    "title": "קישור טלפון למחשב: הודעות SMS וקוד אימות במחשב | הכלים של גילעד רחמים",
    "description": "קוד האימות מגיע לטלפון ואתם מול המחשב? איך רואים הודעות SMS במחשב בחינם (קישור לטלפון, Messages for Web), ובקרוב בתוסף החינמי לכרום: הקוד נכנס לבד לשדה, מוצפן מקצה לקצה.",
    "og_title": "בקרוב: קוד האימות מהטלפון נכנס לבד למחשב",
    "priority": "0.8",
    "crumbs": [["מחשב וטלפון", "/kelim/machshev/"], ["קוד אימות במחשב", None]],
    "head": '<link rel="stylesheet" href="/assets/seo-txt.css">' + STYLE + '<script type="application/ld+json">' + json.dumps(FAQ_LD, ensure_ascii=False) + '</script>',
}

H = []
H.append('<!--meta ' + json.dumps(meta, ensure_ascii=False, indent=2) + ' -->')
H.append('''<header class="k-hero">
  <span class="kb-soon">בקרוב בתוסף</span>
  <h1>קישור טלפון למחשב – קוד האימות מהטלפון נכנס לבד למחשב</h1>
  <p class="sub">נכנסים לבנק, לקופת החולים או לאתר ממשלתי במחשב, והקוד מגיע לטלפון שבחדר השני. בעדכון הבא של התוסף החינמי לכרום: הקוד מופיע בכרום וממולא לבד בשדה. בלי לקום, בלי להקליד ספרות.</p>
  <div class="actions">
    ''' + btn('kod_bamachshev_hero') + '''
    <a class="btn btn-line" href="#today-h">מה אפשר כבר היום</a>
  </div>
  <p class="muted" style="font-size:.92rem;margin:.6rem 0 0">❤ מיזם חסד של מיזם הכלים: בחינם, בלי פרסומות ובלי לאסוף מידע. מהחנות הרשמית של כרום – וכרום מעדכן את התוסף לבד.</p>
</header>''')

H.append('''<section class="k-sec" aria-labelledby="how-h">
  <h2 id="how-h">איך זה יעבוד</h2>
  <ol class="kb-steps">
    <li><b>מתקינים את התוסף לכרום</b> – כבר היום, בחינם. כשהעדכון ייצא הוא יגיע לבד.</li>
    <li><b>סורקים QR פעם אחת</b> עם אפליקציית מיזם הכלים בטלפון אנדרואיד. זה הצימוד – לא חוזרים עליו.</li>
    <li><b>מגיע קוד לטלפון</b> ב-SMS, בווטסאפ או במייל – והוא מופיע בכרום במחשב, ממולא לבד בשדה הקוד. התוסף תמיד כותב מאיפה הקוד הגיע.</li>
  </ol>
</section>''')

H.append('''<section class="k-sec" aria-labelledby="lock-h">
  <h2 id="lock-h">מה קורה לקוד בדרך</h2>
  <div class="kb-lock">
    <p>🔒 <b>מוצפן מקצה לקצה.</b> המפתחות נוצרים בסריקת ה-QR ונשמרים רק במחשב ובטלפון שלכם.</p>
    <p>📦 <b>השרת באמצע הוא ממסר עיוור</b>: מעביר בתים מוצפנים בין שני המכשירים שלכם, ולא יכול לפתוח אותם.</p>
    <p>🚫 <b>לא נשמר כלום</b>: לא תוכן, לא קודים, לא שמות שולחים ולא לוגים. גם לא נשלח ל-Google Analytics.</p>
    <p>✂ <b>מתנתקים מתי שרוצים</b> – מכל צד, והצימוד נמחק מיד.</p>
  </div>
  <p class="muted" style="font-size:.92rem">והכלל הכי חשוב לא משתנה: את הקוד לא מוסרים לאף אחד, גם לא ל"נציג" בטלפון.</p>
</section>''')

H.append('''<section class="k-sec" aria-labelledby="today-h">
  <h2 id="today-h">מה אפשר כבר היום: הודעות SMS במחשב בחינם</h2>
  <div class="ts-two">
    <div><h3>Messages for Web של Google (אנדרואיד)</h3>
      <ol>
        <li>במחשב נכנסים ל-<a class="gold" href="https://messages.google.com/web" rel="noopener">messages.google.com/web</a>.</li>
        <li>בטלפון: אפליקציית "הודעות" של Google ← תמונת הפרופיל ← "צימוד מכשירים" ← סורקים את הקוד.</li>
        <li>ההודעות מופיעות בכרטיסייה. את הקוד מעתיקים ומדביקים בעצמכם.</li>
      </ol>
    </div>
    <div><h3>"קישור לטלפון" ב-Windows</h3>
      <ol>
        <li>בתפריט התחל מחפשים "קישור לטלפון" (Phone Link) – הוא כבר מותקן ב-Windows 10 ו-11.</li>
        <li>בוחרים אנדרואיד או אייפון ומצמדים עם הקוד שעל המסך.</li>
        <li>ההודעות וההתראות מופיעות בחלון במחשב. גם כאן – מעתיקים את הקוד לבד.</li>
      </ol>
    </div>
  </div>
  <p>ההבדל בעדכון של התוסף: לא צריך לפתוח חלון ולחפש את ההודעה. הקוד מגיע ישר לשדה שאתם עומדים עליו בכרום.</p>
  <p><a class="gold" href="/kelim/machshev/kod-imut/">הקוד כבר אצלכם בטלפון? הכלי "קוד אימות" מוצא אותו בהודעה ומעתיק בלחיצה ←</a></p>
  <div class="actions">''' + btn('kod_bamachshev_today') + '''</div>
</section>''')

H.append('''
<!--seo-txt-->
<section class="k-sec seo-txt" aria-labelledby="seo-h">
  <h2 id="seo-h">למה קוד אימות במחשב זה כל כך מעצבן</h2>
  <p>כמעט כל אתר רציני בישראל – בנקים, קופות חולים, ביטוח לאומי, אזור אישי בממשל – שולח היום קוד חד פעמי לטלפון בכל כניסה. כשעובדים במחשב, זה אומר לקום, למצוא את הטלפון, לפתוח את ההודעה, לזכור שש ספרות ולהקליד אותן לפני שהזמן נגמר. מי שעובד עם מסך גדול, עם קורא מסך, או פשוט רחוק מהטלפון – מרגיש את זה עשר פעמים ביום.</p>
  <h3>שלוש דרכים לקבל SMS במחשב</h3>
  <p><b>Messages for Web</b> של Google מציג את כל ההודעות של טלפון אנדרואיד בכרטיסייה בדפדפן. <b>קישור לטלפון</b> של מיקרוסופט עושה דבר דומה בתוך Windows, ותומך גם באייפון. שתיהן מצוינות לקריאת הודעות, אבל הקוד עדיין עובר דרך העיניים והאצבעות שלכם. <b>הגשר של תוסף הכלים</b> – בקרוב – מתמקד רק בדבר אחד: הקוד מהטלפון נכנס לבד לשדה הקוד באתר שפתוח לכם בכרום.</p>
  <h3>למה מתקינים כבר עכשיו</h3>
  <p>התוסף עובד כבר היום: תרגום דפים, יוטיוב ו-PDF לעברית, סידור כרטיסיות, כלים לג׳ימייל, פינוי מקום בגוגל, יומן עברי, פתקים ובורר גודל טקסט נגיש. כרום מעדכן תוספים לבד, כך שביום שהגשר ייצא הוא פשוט יופיע אצלכם.</p>
  <h3>עוד דברים שהתוסף עושה</h3>
  <p><a class="gold" href="/kelim/machshev/chatima/tosaf/">התוסף לכרום – כל היכולות</a> · <a class="gold" href="/kelim/machshev/achsun-google/">הגדלת נפח אחסון גוגל בחינם</a> · <a class="gold" href="/kelim/machshev/yoman-ivri/">תאריך עברי ליומן גוגל</a> · <a class="gold" href="/kelim/machshev/kartisiot/">שמירת כרטיסיות</a> · <a class="gold" href="/kelim/machshev/sismaot/">איפה נשמרות הסיסמאות</a> · <a class="gold" href="/kelim/tochen/tirgum/atar/">תרגום אתר לעברית</a></p>
</section>
<section class="k-sec seo-faq" aria-labelledby="seo-faq-h">
  <h2 id="seo-faq-h">שאלות ותשובות</h2>
''' + '\n'.join('  <details><summary>%s</summary><p>%s</p></details>' % qa for qa in FAQ) + '''
</section>
<!--/seo-txt-->
''')

p = R / 'src/pages/kelim/machshev' / SLUG / 'index.html'
p.parent.mkdir(parents=True, exist_ok=True)
io.open(p, 'w', encoding='utf-8', newline='\n').write('\n'.join(H))
print('wrote', p)
