"""מחולל דף "השבוע הראשון שלי כיהודי": ליקוט מתוך qa-sorted.json (אותן שאלות ותשובות כלשונן, בלי ניסוח חדש).
הרצה: python -I -X utf8 tools/gen_giur_shavua.py <qa-sorted.json>   (הקובץ נוצר ע"י gen_giur_shut.py ומכיל id לכל פריט)"""
import json, sys, html, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'src', 'pages', 'kodesh', 'giur', 'shut', 'shavua-rishon', 'index.html')

# נושא -> (תווית, תיאור, קודי הלכה בספר). הסדר לפי פרקי הספר; אין כאן סדר זמנים.
GROUPS = [
    ('יציאה מהמים', 'ברגע שיוצאים מהמים', 'מה אומרים לגר בצאתו מהמים, ואם בני זוג שהתגיירו יחד צריכים להתחתן שוב.', ['19-05-10', '19-05-11']),
    ('הורים', 'הורים נוכרים אחרי הגיור', 'כיבוד הורים, אבלות, קדיש ותפילה על ההורים.', ['19-08-04', '19-08-05', '19-08-06']),
    ('ירושה וקרובים', 'ירושה, ילדים וקרובי משפחה', 'ירושה לפי החוק, פרו ורבו, קרובים שאסור להתחתן ביניהם ואיסור ייחוד.', ['19-08-02', '19-08-07', '19-08-08']),
    ('עוונות וחובות', 'עוונות מהעבר וחובות לאנשים', 'מה הגיור מוחל ומה נשאר.', ['19-09-01']),
    ('תפילה', 'תפילה וברכות', 'נוסח התפילה והברכות, שליח ציבור וזימון, והדרגתיות בלימוד.', ['19-09-02', '19-09-06a']),
    ('נוסח ומנהג', 'נוסח תפילה ומנהג עדה', 'איזה מנהג נוהג מי שאין לו מנהג אבות.', ['19-09-03']),
    ('כלים וכשרות', 'כלים ומאכלים', 'טבילת כלים, הכשרת כלים ובישולי גויים.', ['19-09-04']),
    ('מצוות הבית', 'פדיון, חלה ומזוזה', 'מצוות שקשורות לבית ולמשפחה.', ['19-09-05', '19-09-06b']),
]
BOOK = 'https://ph.yhb.org.il/category/גיור/'
TITLE = 'אחרי הגיור: השבוע הראשון שלי כיהודי – מה חשוב לדעת'
DESC = 'אחרי הגיור: {n} שאלות ותשובות מ"פניני הלכה – גיור" – תפילה, מנהג, כלים וכשרות, הורים ומשפחה. בעריכת גילעד רחמים ברשות הרב מלמד. בחינם.'
CREDIT = 'ההלכות מתוך הספר "פניני הלכה – גיור" מאת הרב אליעזר מלמד. ערך כשאלות ותשובות: גילעד רחמים, ברשות הרב.'

# פריטים לפי אינדקס בקובץ המקור (qa-final) – נבחרו מהקטגוריות "אחרי הגיור" ו"משפחה" + שני פריטי "יום הגיור" שעוסקים במה שאחרי הטבילה
EXTRA_CODES = {'19-05-10', '19-05-11'}
CATS_OK = {'אחרי הגיור', 'משפחה'}


def e(s):
    return html.escape(s, quote=True)


def gkey(it):
    c = it['code']
    if c == '19-09-06':
        return '19-09-06a' if 'תפילה' in it['q'] else '19-09-06b'
    return c


def main(path):
    items = json.load(open(path, encoding='utf-8'))
    pick = [it for it in items if it['cat'] in CATS_OK or it['code'] in EXTRA_CODES]
    for it in pick:
        it['_g'] = None
        for gi, g in enumerate(GROUPS):
            if gkey(it) in g[3]:
                it['_g'] = gi
        assert it['_g'] is not None, it['code'] + ' ' + it['q']
    pick.sort(key=lambda x: (x['_g'], x['code'], x['id']))
    n = len(pick)
    words = sum(len((i['q'] + ' ' + i['a']).split()) for i in pick)
    faq = {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
        {'@type': 'Question', 'name': it['q'], 'acceptedAnswer': {'@type': 'Answer', 'text': it['a'] + ' (מקור: ' + it['src'] + ', פניני הלכה – גיור)'}} for it in pick[:12]]}
    meta = {
        'site': 'kodesh', 'nav': 'rabanim', 'tool': 'giur_shavua',
        'title': TITLE + ' | כלי קודש',
        'description': DESC.format(n=n),
        'head': '<link rel="stylesheet" href="/assets/seo-txt.css"><link rel="stylesheet" href="/assets/giur.css"><link rel="stylesheet" href="/assets/giur-shut.css"><script type="application/ld+json">' + json.dumps(faq, ensure_ascii=False) + '</script>',
        'foot': '<script src="/assets/giur.js" defer></script><script src="/assets/giur-shut.js" defer></script><script src="/assets/giur-shavua.js" defer></script>',
        'og_title': 'אחרי הגיור: השבוע הראשון שלי כיהודי',
        'priority': '0.8',
        'crumbs': [['תהליך גיור', '/kodesh/giur/'], ['שאלות ותשובות על גיור', '/kodesh/giur/shut/'], ['השבוע הראשון שלי כיהודי', None]],
    }
    o = []
    o.append('<!--meta ' + json.dumps(meta, ensure_ascii=False, indent=1) + ' -->')
    o.append('<header class="k-hero">\n  <h1>אחרי הגיור: השבוע הראשון שלי כיהודי – מה חשוב לדעת</h1>\n  <p class="sub">%d שאלות ותשובות מתוך "פניני הלכה – גיור" למי שזה עתה התגייר, מסודרות לפי נושאים: תפילה וברכות, מנהג, כלים וכשרות, הורים ומשפחה, פדיון, חלה ומזוזה. כל תשובה כלשונה, עם מקור וקישור להלכה המלאה.</p>\n</header>' % n)
    o.append('<div class="gr">')
    o.append('<div class="sh-credit"><b>מקור הדברים:</b> ההלכות מתוך הספר <a class="gold" href="%s" rel="noopener" target="_blank">"פניני הלכה – גיור"</a> מאת הרב אליעזר מלמד. ערך כשאלות ותשובות: <b>גילעד רחמים</b>, ברשות הרב. השאלות והניסוח המקוצר הם של העורך; ההלכה המלאה, עם כל פרטיה והנימוקים, בספר.</div>' % BOOK)
    o.append('<div class="gr-note"><b>חשוב לדעת:</b> הספר אינו קובע מה עושים ביום מסוים או בשבוע מסוים אחרי הגיור, ולכן הדף מסודר לפי נושאים ולפי סדר הפרקים בספר, ולא לפי ימים. הדף ללימוד ולהכרה; בכל שאלה מעשית פונים לבית הדין או לרב המלווה.</div>')
    it83 = [i for i in pick if i['code'] == '19-09-06' and 'תפילה' in i['q']][0]
    o.append('<section class="k-sec"><h2>קודם כול: לא חייבים להספיק הכול מיד</h2><p class="sh-a"><b>%s</b><br>%s</p><p class="sh-src">מקור: ספר "פניני הלכה – גיור", %s · <a href="%s" rel="noopener" target="_blank">להלכה המלאה באתר פניני הלכה</a></p></section>' % (e(it83['q']), e(it83['a']), e(it83['src']), e(it83['url'])))
    o.append('<div class="gr-acts no-print"><button type="button" class="gr-btn gold" data-sharepage>שתף את הדף בווטסאפ</button><button type="button" class="gr-btn" data-print>הדפסת הדף</button><a class="gr-btn gold" href="/kodesh/giur/shut/">כל %d השאלות והתשובות</a></div>' % 85)
    o.append('<div class="sh-tools no-print"><input id="sh-search" type="search" placeholder="חיפוש בדף: למשל תפילה, הורים, כלים, קדיש" aria-label="חיפוש בשאלות ובתשובות" autocomplete="off">')
    o.append('<div class="gr-tabs" role="group" aria-label="סינון לפי נושא"><button type="button" data-cat="all" aria-pressed="true">הכול</button>' + ''.join('<button type="button" data-cat="%s" aria-pressed="false">%s</button>' % (e(g[0]), e(g[1])) for g in GROUPS) + '</div>')
    o.append('<div class="sh-meta"><span id="sh-count" aria-live="polite">%d שאלות ותשובות</span></div></div>' % n)
    o.append('<div id="sh-box">')
    for gi, (gkey_, glabel, gdesc, _) in enumerate(GROUPS):
        its = [i for i in pick if i['_g'] == gi]
        o.append('<section class="k-sec sh-cat" data-cat="%s" aria-labelledby="g-%d"><h2 id="g-%d">%s</h2><p class="sh-cdesc">%s</p>' % (e(gkey_), gi, gi, e(glabel), e(gdesc)))
        for it in its:
            o.append('<details class="sh-q" id="%s" data-cat="%s"><summary>%s</summary><p class="sh-a">%s</p><p class="sh-src">מקור: ספר "פניני הלכה – גיור", %s · <a href="%s" rel="noopener" target="_blank">להלכה המלאה באתר פניני הלכה</a></p><div class="sh-row no-print"><button type="button" class="gr-btn" data-share>שתף בווטסאפ</button></div></details>' % (
                it['id'], e(gkey_), e(it['q']), e(it['a']), e(it['src']), e(it['url'])))
        o.append('</section>')
    o.append('</div>')
    o.append('<div class="sh-none" id="sh-none" hidden>לא מצאנו שאלה שמתאימה. נסו מילה אחרת, או עיינו בספר המלא ב<a class="gold" href="%s" rel="noopener" target="_blank">אתר פניני הלכה</a>. לשאלה מעשית – פנו לבית הדין או לרב המלווה.</div>' % BOOK)
    o.append('<section class="k-sec"><h2>עוד בתחום הגיור</h2><p><a class="gold" href="/kodesh/giur/">תהליך הגיור צעד אחר צעד</a> · <a class="gold" href="/kodesh/giur/shut/">כל השאלות והתשובות על גיור</a> · <a class="gold" href="/kodesh/giur/shabat-rishona/">שבת ראשונה שלי</a> · <a class="gold" href="/kodesh/giur/shut/chidon/">חידון חזרה לגרים</a> · <a class="gold" href="/kodesh/giur/yedaa/">בוחן ידע לגרים</a> · <a class="gold" href="/kodesh/giur/musagim/">מילון מושגים ומסמכים</a> · <a class="gold" href="/kodesh/giur/ahavat-hager/">ואהבת את הגר</a> · <a class="gold" href="/kodesh/giur/brit-mila-lager/">ברית מילה לגר</a> · <a class="gold" href="/kodesh/giur/mishpacha-melava/">משפחה מלווה</a></p></section>')
    o.append('</div>')
    o.append('<!--seo-txt-->\n<section class="k-sec seo-txt" aria-labelledby="seo-h">\n  <h2 id="seo-h">על הדף</h2>\n  <p>%s</p>\n  <p>הדף מלקט שאלות ותשובות שכבר מופיעות בדף השאלות והתשובות על גיור, ומתאים למי שהתגייר לאחרונה ורוצה לראות במקום אחד את הנושאים שנוגעים לחיים אחרי הגיור. התשובות כלשונן, בלי תוספת ובלי פסיקה של העורך.</p>\n  <p>הדף בחינם, בלי הגבלה, בלי הרשמה ובלי פרסומות – מיזם חסד, בלי כוונת רווח.</p>\n</section>' % e(CREDIT))
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, 'w', encoding='utf-8', newline='\n').write('\n'.join(o) + '\n')
    print('OK', n, 'questions', words, 'words ->', OUT)


if __name__ == '__main__':
    main(sys.argv[1])
