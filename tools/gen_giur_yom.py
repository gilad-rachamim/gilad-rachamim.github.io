"""מחולל דף "יום הגיור": קורא את qa-final.json ויוצר src/pages/kodesh/giur/shut/yom-hagiur/index.html.
התוכן רק מהשאלות והתשובות הקיימות, כלשונן, לפי סדר ההלכות בספר. אין ניסוח חדש ואין מספור שמרמז על סדר.
הרצה: python -I -X utf8 tools/gen_giur_yom.py <qa-final.json>"""
import json, sys, html, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'src', 'pages', 'kodesh', 'giur', 'shut', 'yom-hagiur', 'index.html')
BOOK = 'https://ph.yhb.org.il/category/גיור/'
TITLE = 'טבילה במקווה לגיור וברית מילה: מה קורה ביום הגיור'
H1 = 'טבילה במקווה לגיור וברית מילה – מה קורה ביום הגיור'
CATS = ('יום הגיור',)
EXTRA = ('19-05-02',)  # פתיחת הפרק: מה בית הדין שואל, מתוך "לפני שמתחילים"


def e(s):
    return html.escape(s, quote=True)


def halacha(src):
    return src.replace(',', ' ·')


def main(path):
    items = json.load(open(path, encoding='utf-8'))
    sel = [i for i in items if i['cat'] in CATS or i['code'] in EXTRA]
    order = {id(i): n for n, i in enumerate(items)}
    sel.sort(key=lambda x: (x['code'], order[id(x)]))
    n = len(sel)
    groups = []
    for it in sel:
        if groups and groups[-1][0] == it['code']:
            groups[-1][1].append(it)
        else:
            groups.append((it['code'], [it]))
    faq_items = sel[:12]
    faq = {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
        {'@type': 'Question', 'name': it['q'], 'acceptedAnswer': {'@type': 'Answer', 'text': it['a'] + ' (מקור: ' + it['src'] + ', פניני הלכה – גיור)'}} for it in faq_items]}
    meta = {
        'site': 'kodesh', 'nav': 'rabanim', 'tool': 'giur_yom',
        'title': TITLE + ' | כלי קודש',
        'description': 'טבילה במקווה לגיור, ברית מילה ומה קורה ביום הגיור: %d שאלות ותשובות מתוך פניני הלכה – גיור, עם מקור לכל תשובה. בחינם.' % n,
        'head': '<link rel="stylesheet" href="/assets/seo-txt.css"><link rel="stylesheet" href="/assets/giur.css"><link rel="stylesheet" href="/assets/giur-shut.css"><link rel="stylesheet" href="/assets/giur-yom.css"><script type="application/ld+json">' + json.dumps(faq, ensure_ascii=False) + '</script>',
        'foot': '<script src="/assets/giur.js" defer></script><script src="/assets/giur-yom.js" defer></script>',
        'og_title': 'מה קורה ביום הגיור – לפי פניני הלכה',
        'priority': '0.8',
        'crumbs': [['תהליך גיור', '/kodesh/giur/'], ['שאלות ותשובות על גיור', '/kodesh/giur/shut/'], ['יום הגיור', None]],
    }
    o = ['<!--meta ' + json.dumps(meta, ensure_ascii=False, indent=1) + ' -->']
    o.append('<header class="k-hero">\n  <h1>%s</h1>\n  <p class="sub">%d שאלות ותשובות על ברית המילה, הטבילה במקווה ומה שאומרים לגר אחרי שיצא מהמים. הכול מתוך הספר "פניני הלכה – גיור", בלשון הספר, עם מקור וקישור להלכה המלאה בכל תחנה.</p>\n</header>' % (H1, n))
    o.append('<div class="gr">')
    o.append('<div class="sh-credit"><b>מקור הדברים:</b> ההלכות מתוך הספר <a class="gold" href="%s" rel="noopener" target="_blank">"פניני הלכה – גיור"</a> מאת הרב אליעזר מלמד. ערך כשאלות ותשובות: <b>גילעד רחמים</b>, ברשות הרב. השאלות והניסוח המקוצר הם של העורך; ההלכה המלאה, עם כל פרטיה והנימוקים, בספר.</div>' % BOOK)
    o.append('<div class="gr-note"><b>חשוב לדעת:</b> הדף ללימוד ולהכרה. כל פרט מעשי, ובכלל זה מועד ומקום, נקבעים עם בית הדין או הרב המלווה.</div>')
    o.append('<div class="gr-acts no-print"><button type="button" class="gr-btn gold" data-print>הדפסת הדף</button><button type="button" class="gr-btn" data-share-page>שיתוף הדף בווטסאפ</button><a class="gr-btn" href="/kodesh/giur/shut/">כל השאלות והתשובות</a></div>')
    o.append('<section class="k-sec" aria-labelledby="yh-how"><h2 id="yh-how">איך לקרוא את הדף</h2><p class="yh-how">הדף מציג את ההלכות שבפרק ה בספר על הגיור עצמו, לפי הסדר שבו הן מופיעות בספר. כל תחנה נושאת את מספר ההלכה בספר, ולא מספר שלב משלנו: בספר אין לוח זמנים אחד קבוע ליום, ולכן אין כאן מספור שמרמז על סדר שהספר לא קבע. כשהספר עצמו קובע סדר, כמו ברית מילה לפני טבילה, הוא כתוב בתשובה.</p></section>')
    o.append('<section class="k-sec" aria-labelledby="yh-t"><h2 id="yh-t">מה קורה ביום הגיור: התחנות לפי סדר ההלכות בספר</h2><ol class="yh-line">')
    for code, its in groups:
        o.append('<li class="yh-node"><div class="yh-badge">%s</div><div class="yh-cards">' % e(halacha(its[0]['src'])))
        for k, it in enumerate(its):
            qid = 'q' + code[3:].replace('-', '') + ('' if k == 0 else chr(97 + k))
            o.append('<article class="yh-card" id="%s"><h3>%s</h3><p class="yh-a">%s</p><p class="sh-src">מקור: ספר "פניני הלכה – גיור", %s · <a href="%s" rel="noopener" target="_blank">להלכה המלאה באתר פניני הלכה</a></p><div class="sh-row no-print"><button type="button" class="gr-btn" data-share>שתף בווטסאפ</button></div></article>' % (qid, e(it['q']), e(it['a']), e(it['src']), e(it['url'])))
        o.append('</div></li>')
    o.append('</ol></section>')
    o.append('<section class="k-sec"><h2>עוד בתחום הגיור</h2><p><a class="gold" href="/kodesh/giur/shut/">כל השאלות והתשובות על גיור</a> · <a class="gold" href="/kodesh/giur/">תהליך הגיור צעד אחר צעד</a> · <a class="gold" href="/kodesh/giur/brit-mila-lager/">ברית מילה לגר</a> · <a class="gold" href="/kodesh/giur/shut/chidon/">חידון חזרה לגרים</a> · <a class="gold" href="/kodesh/giur/shabat-rishona/">שבת ראשונה שלי</a> · <a class="gold" href="/kodesh/giur/musagim/">מילון מושגים ומסמכים</a> · <a class="gold" href="/kodesh/giur/mishpacha-melava/">משפחה מלווה</a></p></section>')
    o.append('</div>')
    o.append('<!--seo-txt-->\n<section class="k-sec seo-txt" aria-labelledby="seo-h">\n  <h2 id="seo-h">על הדף</h2>\n  <p>ההלכות מתוך הספר "פניני הלכה – גיור" מאת הרב אליעזר מלמד. ערך כשאלות ותשובות: גילעד רחמים, ברשות הרב.</p>\n  <p>הדף בחינם, בלי הגבלה, בלי הרשמה ובלי פרסומות – מיזם חסד, בלי כוונת רווח.</p>\n</section>')
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, 'w', encoding='utf-8', newline='\n').write('\n'.join(o) + '\n')
    print('OK', n, 'items', len(groups), 'stops ->', OUT)


if __name__ == '__main__':
    main(sys.argv[1])
