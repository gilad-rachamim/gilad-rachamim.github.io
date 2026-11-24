"""מחולל דף השו"ת לגרים: קורא את qa-final.json ויוצר src/pages/kodesh/giur/shut/index.html (+ נתוני PDF).
הרצה: python -I -X utf8 tools/gen_giur_shut.py <qa-final.json>"""
import json, sys, html, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'src', 'pages', 'kodesh', 'giur', 'shut', 'index.html')

CATS = [
    ('לפני שמתחילים', 'לפני הגיור', 'מי בודק, מה בודקים, ומה חשוב לדעת לפני שמתחילים.'),
    ('יום הגיור', 'יום הגיור', 'קבלת מצוות, ברית מילה, טבילה, ומה קורה אחר כך.'),
    ('אחרי הגיור', 'אחרי הגיור', 'חיי היום-יום: תפילה, מנהגים, כלים ומצוות.'),
    ('משפחה', 'משפחה', 'הורים, אבלות, ירושה, נישואין ועוד.'),
    ('בני זוג וילדים', 'בן או בת זוג וילדים', 'בן זוג של יהודי, גיור קטנים ומחאה בגדלות. כשיש בספר מחלוקת, מובאות שתי הדעות.'),
    ('היחס לגר', 'היחס לגר', 'אהבת הגר ואיסור להכאיב לו.'),
    ('גרים בתולדות ישראל', 'גרים בתולדות ישראל', 'גרים גדולים שהיו לפנינו.'),
]
BOOK = 'https://ph.yhb.org.il/category/גיור/'
TITLE = 'שאלות ותשובות על גיור – הלכות גיור לגרים ולמתגיירים'
DESC = '{n} שאלות ותשובות על גיור בפשטות, לפי הספר "פניני הלכה – גיור" של הרב אליעזר מלמד, בעריכת גילעד רחמים ברשות הרב: חיפוש, שלבי הדרך, PDF. בחינם, בלי הרשמה.'
CREDIT = 'ההלכות מתוך הספר "פניני הלכה – גיור" מאת הרב אליעזר מלמד. ערך כשאלות ותשובות: גילעד רחמים, ברשות הרב.'


def e(s):
    return html.escape(s, quote=True)


def main(path):
    items = json.load(open(path, encoding='utf-8'))
    order = {c[0]: i for i, c in enumerate(CATS)}
    for it in items:
        assert it['cat'] in order, it['cat']
    # סדר: קטגוריה, ואז סדר הספר
    items.sort(key=lambda x: (order[x['cat']], x['code']))
    seen = {}
    for it in items:
        k = it['code']
        seen[k] = seen.get(k, 0) + 1
        it['id'] = 'q' + k[3:].replace('-', '') + ('' if seen[k] == 1 else chr(96 + seen[k]))
    n = len(items)
    json.dump(items, open(os.path.join(os.path.dirname(path), 'qa-sorted.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    faq_src = []
    per = {}
    for it in items:
        per[it['cat']] = per.get(it['cat'], 0) + 1
        if per[it['cat']] <= 5 and len(faq_src) < 30:
            faq_src.append(it)
    faq = {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
        {'@type': 'Question', 'name': it['q'], 'acceptedAnswer': {'@type': 'Answer', 'text': it['a'] + ' (מקור: ' + it['src'] + ', פניני הלכה – גיור)'}} for it in faq_src]}
    meta = {
        'site': 'kodesh', 'nav': 'rabanim', 'tool': 'giur_shut',
        'title': TITLE + ' | כלי קודש',
        'description': DESC.format(n=n),
        'head': '<link rel="stylesheet" href="/assets/seo-txt.css"><link rel="stylesheet" href="/assets/giur.css"><link rel="stylesheet" href="/assets/giur-shut.css"><script type="application/ld+json">' + json.dumps(faq, ensure_ascii=False) + '</script>',
        'foot': '<script src="/assets/giur.js" defer></script><script src="/assets/giur-shut.js" defer></script>',
        'og_title': 'שאלות ותשובות על גיור – לפי פניני הלכה',
        'priority': '0.9',
        'crumbs': [['תהליך גיור', '/kodesh/giur/'], ['שאלות ותשובות על גיור', None]],
    }
    o = []
    o.append('<!--meta ' + json.dumps(meta, ensure_ascii=False, indent=1) + ' -->')
    o.append('<header class="k-hero">\n  <h1>שאלות ותשובות על גיור – הלכות גיור לגרים ולמתגיירים</h1>\n  <p class="sub">%d שאלות ותשובות בעברית פשוטה, מסודרות לפי שלבי הדרך: לפני הגיור, יום הגיור, אחרי הגיור ובתוך המשפחה. כל תשובה נשענת על הלכה בספר "פניני הלכה – גיור", עם קישור להלכה המלאה.</p>\n</header>' % n)
    o.append('<div class="gr">')
    o.append('<div class="sh-credit"><b>מקור הדברים:</b> ההלכות מתוך הספר <a class="gold" href="%s" rel="noopener" target="_blank">"פניני הלכה – גיור"</a> מאת הרב אליעזר מלמד. ערך כשאלות ותשובות: <b>גילעד רחמים</b>, ברשות הרב. השאלות והניסוח המקוצר הם של העורך; ההלכה המלאה, עם כל פרטיה והנימוקים, בספר.</div>' % BOOK)
    o.append('<div class="gr-note"><b>חשוב לדעת:</b> הדף ללימוד ולהכרה. בכל שאלה מעשית פונים לבית הדין או לרב המלווה. אפשר להשיג את הספר המודפס ב<a class="gold" href="https://www.yhb.org.il/" rel="noopener" target="_blank">חנות הישיבה</a> ולקרוא אותו בחינם ב<a class="gold" href="%s" rel="noopener" target="_blank">אתר פניני הלכה</a>.</div>' % BOOK)
    o.append('<div class="gr-acts no-print"><a class="gr-btn gold" href="/kodesh/giur/shut/shut-giur.pdf" download>הורדת כל השאלות והתשובות (PDF)</a><button type="button" class="gr-btn" data-print>הדפסת הדף</button></div>')
    o.append('<div class="sh-tools no-print"><input id="sh-search" type="search" placeholder="חיפוש בשאלות: למשל טבילה, הורים, כשרות" aria-label="חיפוש בשאלות ובתשובות" autocomplete="off">')
    o.append('<div class="gr-tabs" role="group" aria-label="סינון לפי שלב"><button type="button" data-cat="all" aria-pressed="true">הכול</button>' + ''.join('<button type="button" data-cat="%s" aria-pressed="false">%s</button>' % (e(c[0]), e(c[1])) for c in CATS if c[0] in per) + '</div>')
    o.append('<div class="sh-meta"><span id="sh-count" aria-live="polite">%d שאלות ותשובות</span></div></div>' % n)
    o.append('<div id="sh-box">')
    for ckey, clabel, cdesc in CATS:
        its = [i for i in items if i['cat'] == ckey]
        if not its:
            continue
        o.append('<section class="k-sec sh-cat" data-cat="%s" aria-labelledby="c-%d"><h2 id="c-%d">%s</h2><p class="sh-cdesc">%s</p>' % (e(ckey), order[ckey], order[ckey], e(clabel), e(cdesc)))
        for it in its:
            o.append('<details class="sh-q" id="%s" data-cat="%s"><summary>%s</summary><p class="sh-a">%s</p><p class="sh-src">מקור: ספר "פניני הלכה – גיור", %s · <a href="%s" rel="noopener" target="_blank">להלכה המלאה באתר פניני הלכה</a></p><div class="sh-row no-print"><button type="button" class="gr-btn" data-share>שתף בווטסאפ</button></div></details>' % (
                it['id'], e(ckey), e(it['q']), e(it['a']), e(it['src']), e(it['url'])))
        o.append('</section>')
    o.append('</div>')
    o.append('<div class="sh-none" id="sh-none" hidden>לא מצאנו שאלה שמתאימה. נסו מילה אחרת, או עיינו בספר המלא ב<a class="gold" href="%s" rel="noopener" target="_blank">אתר פניני הלכה</a>. לשאלה מעשית – פנו לבית הדין או לרב המלווה.</div>' % BOOK)
    o.append('<section class="k-sec"><h2>עוד בתחום הגיור</h2><p><a class="gold" href="/kodesh/giur/">תהליך הגיור צעד אחר צעד</a> · <a class="gold" href="/kodesh/giur/shabat-rishona/">שבת ראשונה שלי</a> · <a class="gold" href="/kodesh/giur/yedaa/">בוחן ידע לגרים</a> · <a class="gold" href="/kodesh/giur/musagim/">מילון מושגים ומסמכים</a> · <a class="gold" href="/kodesh/giur/ahavat-hager/">ואהבת את הגר</a> · <a class="gold" href="/kodesh/giur/brit-mila-lager/">ברית מילה לגר</a> · <a class="gold" href="/kodesh/giur/mishpacha-melava/">משפחה מלווה</a></p></section>')
    o.append('</div>')
    o.append('<!--seo-txt-->\n<section class="k-sec seo-txt" aria-labelledby="seo-h">\n  <h2 id="seo-h">על הדף</h2>\n  <p>%s</p>\n  <p>הדף בחינם, בלי הגבלה, בלי הרשמה ובלי פרסומות – מיזם חסד, בלי כוונת רווח.</p>\n</section>' % e(CREDIT))
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, 'w', encoding='utf-8', newline='\n').write('\n'.join(o) + '\n')
    print('OK', n, 'questions ->', OUT)


if __name__ == '__main__':
    main(sys.argv[1])
