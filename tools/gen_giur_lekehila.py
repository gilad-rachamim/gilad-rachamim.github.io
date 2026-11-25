"""מחולל דף "היחס לגר – איך לקבל גר" : קורא את qa-final.json ויוצר src/pages/kodesh/giur/shut/lekehila/index.html.
רק שאלות ותשובות קיימות, כלשונן, בסדר הספר (code). בלי ניסוח חדש.
הרצה: python -I -X utf8 tools/gen_giur_lekehila.py <qa-final.json>"""
import json, sys, html, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'src', 'pages', 'kodesh', 'giur', 'shut', 'lekehila', 'index.html')

CATS = [
    ('היחס לגר', 'היחס לגר: אהבה, כבוד ואיסור לצער', 'מה כתוב בספר על האהבה לגר, על איסור הצער, ועל הזמנתו לשמחות.'),
    ('גרים בתולדות ישראל', 'גרים בתולדות ישראל', 'גרים גדולים שהיו לפנינו, כפי שהם מובאים בספר.'),
]
BOOK = 'https://ph.yhb.org.il/category/גיור/'
TITLE = 'היחס לגר: איך לקבל גר בקהילה ובמשפחה המלווה'
URL = 'https://hakelim.com/kodesh/giur/shut/lekehila/'
CREDIT = 'ההלכות מתוך הספר "פניני הלכה – גיור" מאת הרב אליעזר מלמד. ערך כשאלות ותשובות: גילעד רחמים, ברשות הרב.'


def e(s):
    return html.escape(s, quote=True)


def main(path):
    items = [i for i in json.load(open(path, encoding='utf-8')) if i['cat'] in dict((c[0], 1) for c in CATS)]
    order = {c[0]: i for i, c in enumerate(CATS)}
    items.sort(key=lambda x: (order[x['cat']], x['code']))
    seen = {}
    for it in items:
        k = it['code']
        seen[k] = seen.get(k, 0) + 1
        it['id'] = 'q' + k[3:].replace('-', '') + ('' if seen[k] == 1 else chr(96 + seen[k]))
    n = len(items)
    faq = {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
        {'@type': 'Question', 'name': it['q'], 'acceptedAnswer': {'@type': 'Answer', 'text': it['a'] + ' (מקור: ' + it['src'] + ', פניני הלכה – גיור)'}} for it in items[:12]]}
    meta = {
        'site': 'kodesh', 'nav': 'rabanim', 'tool': 'giur_lekehila',
        'title': TITLE + ' | כלי קודש',
        'description': 'היחס לגר לפי הספר "פניני הלכה – גיור" של הרב אליעזר מלמד: %d שאלות ותשובות לקהילה ולמשפחה המלווה, עם מקור לכל תשובה. בעריכת גילעד רחמים ברשות הרב. בחינם, בלי הרשמה.' % n,
        'head': '<link rel="stylesheet" href="/assets/seo-txt.css"><link rel="stylesheet" href="/assets/giur.css"><link rel="stylesheet" href="/assets/giur-shut.css"><script type="application/ld+json">' + json.dumps(faq, ensure_ascii=False) + '</script>',
        'foot': '<script src="/assets/giur.js" defer></script><script src="/assets/giur-shut.js" defer></script>',
        'og_title': 'היחס לגר – איך לקבל גר בקהילה ובמשפחה, לפי פניני הלכה',
        'priority': '0.8',
        'crumbs': [['תהליך גיור', '/kodesh/giur/'], ['שאלות ותשובות על גיור', '/kodesh/giur/shut/'], ['היחס לגר', None]],
    }
    o = []
    o.append('<!--meta ' + json.dumps(meta, ensure_ascii=False, indent=1) + ' -->')
    o.append('<header class="k-hero">\n  <h1>היחס לגר: איך לקבל גר בקהילה ובמשפחה המלווה</h1>\n  <p class="sub">%d שאלות ותשובות מתוך הספר "פניני הלכה – גיור" על היחס לגר ועל מקומם של גרים בעם ישראל, למשפחה המלווה ולקהילה שמקבלת אותו. התשובות כלשונן בספר, עם הפרק וההלכה וקישור לקריאה המלאה.</p>\n</header>' % n)
    o.append('<div class="gr">')
    o.append('<div class="sh-credit"><b>מקור הדברים:</b> ההלכות מתוך הספר <a class="gold" href="%s" rel="noopener" target="_blank">"פניני הלכה – גיור"</a> מאת הרב אליעזר מלמד. ערך כשאלות ותשובות: <b>גילעד רחמים</b>, ברשות הרב. השאלות הן של העורך; ההלכה המלאה, עם כל פרטיה והנימוקים, בספר.</div>' % BOOK)
    o.append('<div class="gr-note"><b>חשוב לדעת:</b> הדף ללימוד ולהכרה. בכל שאלה מעשית פונים לבית הדין או לרב המלווה. את הספר אפשר לקרוא בחינם ב<a class="gold" href="%s" rel="noopener" target="_blank">אתר פניני הלכה</a>.</div>' % BOOK)
    o.append('<div class="gr-acts no-print"><button type="button" class="gr-btn gold" data-pshare>שיתוף הדף בווטסאפ</button><button type="button" class="gr-btn" data-print>הדפסת הדף</button><a class="gr-btn gold" href="/kodesh/giur/mishpacha-melava/">להירשם כמשפחה מלווה</a></div>')
    o.append('<div id="sh-box">')
    for ckey, clabel, cdesc in CATS:
        its = [i for i in items if i['cat'] == ckey]
        o.append('<section class="k-sec sh-cat" data-cat="%s" aria-labelledby="c-%d"><h2 id="c-%d">%s</h2><p class="sh-cdesc">%s</p>' % (e(ckey), order[ckey], order[ckey], e(clabel), e(cdesc)))
        for it in its:
            o.append('<details class="sh-q" id="%s" data-cat="%s" open><summary>%s</summary><p class="sh-a">%s</p><p class="sh-src">מקור: ספר "פניני הלכה – גיור", %s · <a href="%s" rel="noopener" target="_blank">להלכה המלאה באתר פניני הלכה</a></p><div class="sh-row no-print"><button type="button" class="gr-btn" data-share>שתף בווטסאפ</button></div></details>' % (
                it['id'], e(ckey), e(it['q']), e(it['a']), e(it['src']), e(it['url'])))
        o.append('</section>')
    o.append('</div>')
    o.append('<section class="k-sec"><h2>משפחה מלווה: איך מצטרפים</h2><p>מי שרוצה ללוות מתגייר, לארח אותו בשבת ולהיות לצדו, יכול להירשם ב<a class="gold" href="/kodesh/giur/mishpacha-melava/">רישום משפחות מלוות</a>. הרישום בחינם.</p></section>')
    o.append('<section class="k-sec"><h2>עוד בתחום הגיור</h2><p><a class="gold" href="/kodesh/giur/">תהליך הגיור צעד אחר צעד</a> · <a class="gold" href="/kodesh/giur/shut/">כל השאלות והתשובות על גיור</a> · <a class="gold" href="/kodesh/giur/shut/chidon/">חידון חזרה לגרים</a> · <a class="gold" href="/kodesh/giur/ahavat-hager/">ואהבת את הגר</a> · <a class="gold" href="/kodesh/giur/shabat-rishona/">שבת ראשונה שלי</a> · <a class="gold" href="/kodesh/giur/brit-mila-lager/">ברית מילה לגר</a> · <a class="gold" href="/kodesh/giur/musagim/">מילון מושגים ומסמכים</a> · <a class="gold" href="/kodesh/giur/mishpacha-melava/">משפחה מלווה</a></p></section>')
    o.append('</div>')
    o.append('<!--seo-txt-->\n<section class="k-sec seo-txt" aria-labelledby="seo-h">\n  <h2 id="seo-h">על הדף</h2>\n  <p>%s</p>\n  <p>הדף מרכז מתוך דף השאלות והתשובות על גיור את מה שנוגע ליחס לגר, כדי שמשפחה מלווה וקהילה יוכלו לקרוא אותו במקום אחד, להדפיס אותו ולשלוח אותו הלאה. כל תשובה מובאת כלשונה, עם מקור וקישור להלכה המלאה בספר.</p>\n  <p>הדף בחינם, בלי הגבלה, בלי הרשמה ובלי פרסומות – מיזם חסד, בלי כוונת רווח.</p>\n</section>' % e(CREDIT))
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, 'w', encoding='utf-8', newline='\n').write('\n'.join(o) + '\n')
    print('OK', n, 'questions ->', OUT)


if __name__ == '__main__':
    main(sys.argv[1])
