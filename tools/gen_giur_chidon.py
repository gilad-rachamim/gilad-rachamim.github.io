"""מחולל דף "חידון חזרה לגרים": קורא את qa-final.json (אותו קובץ של דף השו"ת) ויוצר
src/pages/kodesh/giur/shut/chidon/index.html. לא כותב שאלות או תשובות חדשות.
הרצה: python -I -X utf8 tools/gen_giur_chidon.py <qa-final.json>"""
import json, sys, html, os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'src', 'pages', 'kodesh', 'giur', 'shut', 'chidon', 'index.html')

# אותו סדר ואותם שמות שלבים כמו בדף השו"ת (tools/gen_giur_shut.py)
CATS = [
    ('לפני שמתחילים', 'לפני הגיור'),
    ('יום הגיור', 'יום הגיור'),
    ('אחרי הגיור', 'אחרי הגיור'),
    ('משפחה', 'משפחה'),
    ('בני זוג וילדים', 'בני זוג וילדים'),
    ('היחס לגר', 'היחס לגר'),
    ('גרים בתולדות ישראל', 'גרים בתולדות ישראל'),
]
BOOK = 'https://ph.yhb.org.il/category/גיור/'
CREDIT = 'ההלכות מתוך הספר "פניני הלכה – גיור" מאת הרב אליעזר מלמד. ערך כשאלות ותשובות: גילעד רחמים, ברשות הרב.'
TITLE = 'מבחן גיור: חידון הלכה לגרים בשאלות ותשובות'
H1 = 'מבחן גיור – חידון הלכה לגרים בשאלות ותשובות'


def e(s):
    return html.escape(s, quote=True)


def main(path):
    items = json.load(open(path, encoding='utf-8'))
    order = {c[0]: i for i, c in enumerate(CATS)}
    for it in items:
        assert it['cat'] in order, it['cat']
    items.sort(key=lambda x: (order[x['cat']], x['code']))
    seen = {}
    for it in items:  # אותם עוגנים בדיוק כמו בדף השו"ת
        k = it['code']
        seen[k] = seen.get(k, 0) + 1
        it['id'] = 'q' + k[3:].replace('-', '') + ('' if seen[k] == 1 else chr(96 + seen[k]))
    n = len(items)
    per = {}
    for it in items:
        per[it['cat']] = per.get(it['cat'], 0) + 1
    ncat = len([c for c in CATS if c[0] in per])

    faq = [
        ('מה זה חידון חזרה לגרים?',
         'חידון של %d שאלות ותשובות על גיור, כשאלה אחת בכל פעם. קוראים את השאלה, מנסים לענות לעצמכם, לוחצים "הצג תשובה" ומסמנים אם ידעתם. בסוף מקבלים ציון ורשימה של מה שכדאי לחזור עליו.' % n),
        ('האם זה המבחן של בית הדין?',
         'לא. זה תרגול אישי לחזרה על החומר. אין לו קשר רשמי לבית הדין, והוא אינו מנבא תוצאה. את הדרך הרשמית מלווה הרב המלווה או בית הדין.'),
        ('מאיפה השאלות והתשובות?',
         'כולן מתוך הספר "פניני הלכה – גיור" מאת הרב אליעזר מלמד, בעריכה של גילעד רחמים ברשות הרב. לכל תשובה מצוינים הפרק וההלכה בספר וקישור להלכה המלאה.'),
        ('אפשר לבחור שלב מסוים בדרך?',
         'כן. אפשר לבחור את אחד משבעת השלבים: לפני הגיור, יום הגיור, אחרי הגיור, משפחה, בני זוג וילדים, היחס לגר וגרים בתולדות ישראל. אפשר גם לבחור את כל השלבים יחד.'),
        ('מה רואים בסוף החידון?',
         'את הציון, קישור לכל שאלה שסימנתם "לא ידעתי" בדף השאלות והתשובות המלא, ואת המקור בספר לכל תשובה, עם קישור לקריאה.'),
        ('צריך להירשם או לשלם?',
         'לא. החידון בחינם, בלי הגבלה, בלי הרשמה ובלי פרסומות. הציון אינו נשמר בשרת, והוא נשאר רק בדף שפתחתם.'),
        ('האם החידון מחליף שיעור או רב?',
         'לא. הדף לחזרה וללימוד. לשאלה מעשית פונים לבית הדין או לרב המלווה. את ההלכה המלאה, עם כל פרטיה והנימוקים, קוראים בספר.'),
        ('איפה אפשר לקרוא את הספר?',
         'באתר פניני הלכה, בחינם, וגם בגרסה המודפסת בחנות הישיבה. הקישורים נמצאים בראש הדף.'),
    ]
    ld = {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
        {'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in faq]}
    meta = {
        'site': 'kodesh', 'nav': 'rabanim', 'tool': 'giur_chidon',
        'title': TITLE + ' | כלי קודש',
        'description': 'מבחן גיור לתרגול: חידון של %d שאלות ותשובות מתוך "פניני הלכה – גיור" של הרב מלמד, בעריכת גילעד רחמים ברשות הרב. ציון ומקור לכל תשובה. בחינם.' % n,
        'head': '<link rel="stylesheet" href="/assets/seo-txt.css"><link rel="stylesheet" href="/assets/giur.css"><link rel="stylesheet" href="/assets/giur-shut.css"><link rel="stylesheet" href="/assets/giur-chidon.css"><script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False) + '</script>',
        'foot': '<script src="/assets/giur.js" defer></script><script src="/assets/giur-chidon.js" defer></script>',
        'og_title': 'מבחן גיור – חידון הלכה לגרים בשאלות ותשובות',
        'priority': '0.8',
        'crumbs': [['תהליך גיור', '/kodesh/giur/'], ['שאלות ותשובות על גיור', '/kodesh/giur/shut/'], ['חידון חזרה לגרים', None]],
    }
    data = [{'id': i['id'], 'cat': i['cat'], 'q': i['q'], 'a': i['a'], 'src': i['src'], 'url': i['url']} for i in items]
    data_js = json.dumps(data, ensure_ascii=False).replace('</', '<\\/')

    o = ['<!--meta ' + json.dumps(meta, ensure_ascii=False, indent=1) + ' -->']
    o.append('<header class="k-hero">\n  <h1>%s</h1>\n  <p class="sub">חידון חזרה על הלכות גיור: %d שאלות מתוך הספר "פניני הלכה – גיור", שאלה אחת בכל פעם. מציגים תשובה, מסמנים "ידעתי" או "לא ידעתי", ובסוף מקבלים ציון וקישור לשאלות שכדאי לחזור עליהן.</p>\n</header>' % (H1, n))
    o.append('<div class="gr">')
    o.append('<div class="sh-credit"><b>מקור הדברים:</b> ההלכות מתוך הספר <a class="gold" href="%s" rel="noopener" target="_blank">"פניני הלכה – גיור"</a> מאת הרב אליעזר מלמד. ערך כשאלות ותשובות: <b>גילעד רחמים</b>, ברשות הרב. השאלות והניסוח המקוצר הם של העורך; ההלכה המלאה, עם כל פרטיה והנימוקים, בספר.</div>' % BOOK)
    o.append('<div class="gr-note"><b>חשוב לדעת:</b> החידון לתרגול ולחזרה בלבד, ואינו המבחן של בית הדין. בכל שאלה מעשית פונים לבית הדין או לרב המלווה. אפשר גם לעיין בכל התשובות ב<a class="gold" href="/kodesh/giur/shut/">דף השאלות והתשובות על גיור</a>.</div>')

    # אפליקציית החידון
    o.append('<section class="k-sec ch-app" aria-labelledby="ch-h" id="ch-app">')
    o.append('<h2 id="ch-h">התחילו חידון</h2>')
    o.append('<div id="ch-setup">')
    o.append('<p class="ch-lead" id="ch-stage-l">בחרו שלב בדרך:</p>')
    o.append('<div class="gr-tabs" role="group" aria-labelledby="ch-stage-l" id="ch-stages"><button type="button" data-cat="all" aria-pressed="true">כל השלבים (%d)</button>' % n + ''.join('<button type="button" data-cat="%s" aria-pressed="false">%s (%d)</button>' % (e(c[0]), e(c[1]), per[c[0]]) for c in CATS if c[0] in per) + '</div>')
    o.append('<p class="ch-lead" id="ch-len-l">כמה שאלות?</p>')
    o.append('<div class="gr-tabs" role="group" aria-labelledby="ch-len-l" id="ch-lens"><button type="button" data-len="10" aria-pressed="true">10 שאלות</button><button type="button" data-len="20" aria-pressed="false">20 שאלות</button><button type="button" data-len="0" aria-pressed="false">כל השאלות בשלב</button></div>')
    o.append('<p><button type="button" class="gr-btn gold ch-start" id="ch-start">התחלת החידון</button></p>')
    o.append('</div>')
    o.append('<div id="ch-quiz" hidden>')
    o.append('<div class="ch-top"><span id="ch-prog" aria-live="polite"></span><span id="ch-score-live"></span></div>')
    o.append('<div class="ch-bar" aria-hidden="true"><div id="ch-fill"></div></div>')
    o.append('<p class="ch-stage" id="ch-qstage"></p>')
    o.append('<h3 class="ch-q" id="ch-q" tabindex="-1"></h3>')
    o.append('<p><button type="button" class="gr-btn gold" id="ch-show">הצג תשובה</button></p>')
    o.append('<div id="ch-ans" class="ch-ans" tabindex="-1" aria-live="polite" hidden><p class="sh-a" id="ch-a"></p><p class="sh-src" id="ch-src"></p>')
    o.append('<p class="ch-ask" id="ch-ask">האם ידעתם?</p><div class="ch-row"><button type="button" class="gr-btn ch-yes" id="ch-yes">ידעתי</button><button type="button" class="gr-btn ch-no" id="ch-no">לא ידעתי</button></div></div>')
    o.append('<p class="ch-quit"><button type="button" class="ch-link" id="ch-quit">סיום החידון ומעבר לציון</button></p>')
    o.append('</div>')
    o.append('<div id="ch-result" hidden>')
    o.append('<h3 id="ch-res-h" tabindex="-1">סיום החידון</h3>')
    o.append('<p class="ch-big" id="ch-res-score"></p><p id="ch-res-msg"></p>')
    o.append('<div class="ch-row"><button type="button" class="gr-btn gold" id="ch-again-miss" hidden>חידון חוזר על מה שלא ידעתי</button><button type="button" class="gr-btn" id="ch-again">חידון חדש</button><button type="button" class="gr-btn" id="ch-share">שתף בווטסאפ</button></div>')
    o.append('<div id="ch-miss-box" hidden><h3>שאלות שלא ידעתי – לקריאה בדף השאלות והתשובות</h3><ul class="ch-list" id="ch-miss"></ul></div>')
    o.append('<h3>המקור לכל תשובה</h3><p class="sh-cdesc">לכל שאלה שנענתה: הפרק וההלכה בספר "פניני הלכה – גיור", וקישור להלכה המלאה.</p><ul class="ch-list" id="ch-all"></ul>')
    o.append('</div>')
    o.append('<noscript><p class="gr-note">החידון פועל עם JavaScript. בלי JavaScript אפשר לעיין בכל השאלות והתשובות ב<a class="gold" href="/kodesh/giur/shut/">דף השאלות והתשובות על גיור</a>.</p></noscript>')
    o.append('</section>')
    o.append('<script type="application/json" id="ch-data">' + data_js + '</script>')

    # תוכן סטטי: על מה החידון (שאלות בלבד, בקישורים לדף השו"ת)
    o.append('<section class="k-sec" aria-labelledby="ch-about"><h2 id="ch-about">על מה שואל החידון</h2><p>החידון בנוי משבעה שלבים בדרך של הגר, מהחשיבה הראשונה על הגיור ועד גרים גדולים בתולדות ישראל. כל שאלה היא שאלה אמיתית מהדף ' + '<a class="gold" href="/kodesh/giur/shut/">שאלות ותשובות על גיור</a>' + ', ואפשר ללחוץ עליה כדי לקרוא את התשובה במלואה ואת המקור בספר.</p></section>')
    for ckey, clabel in CATS:
        its = [i for i in items if i['cat'] == ckey]
        if not its:
            continue
        o.append('<section class="k-sec" aria-labelledby="ab-%d"><h3 id="ab-%d">%s: %d שאלות בחידון</h3><details class="sh-q"><summary>רשימת השאלות בשלב "%s"</summary><ul class="ch-list">' % (order[ckey], order[ckey], e(clabel), len(its), e(clabel)) + ''.join('<li><a href="/kodesh/giur/shut/#%s">%s</a></li>' % (i['id'], e(i['q'])) for i in its) + '</ul></details></section>')

    o.append('<section class="k-sec" aria-labelledby="ch-faq"><h2 id="ch-faq">שאלות נפוצות על החידון</h2>' + ''.join('<h3>%s</h3><p>%s</p>' % (e(q), e(a)) for q, a in faq) + '</section>')
    o.append('<section class="k-sec"><h2>עוד בתחום הגיור</h2><p><a class="gold" href="/kodesh/giur/">תהליך הגיור צעד אחר צעד</a> · <a class="gold" href="/kodesh/giur/shut/">שאלות ותשובות על גיור</a> · <a class="gold" href="/kodesh/giur/yedaa/">בוחן ידע לגרים</a> · <a class="gold" href="/kodesh/giur/musagim/">מילון מושגים ומסמכים</a> · <a class="gold" href="/kodesh/giur/shabat-rishona/">שבת ראשונה שלי</a> · <a class="gold" href="/kodesh/giur/ahavat-hager/">ואהבת את הגר</a> · <a class="gold" href="/kodesh/giur/brit-mila-lager/">ברית מילה לגר</a> · <a class="gold" href="/kodesh/giur/mishpacha-melava/">משפחה מלווה</a></p></section>')
    o.append('</div>')
    o.append('<!--seo-txt-->\n<section class="k-sec seo-txt" aria-labelledby="seo-h">\n  <h2 id="seo-h">על הדף</h2>\n  <p>%s</p>\n  <p>הדף בחינם, בלי הגבלה, בלי הרשמה ובלי פרסומות – מיזם חסד, בלי כוונת רווח.</p>\n</section>' % e(CREDIT))
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, 'w', encoding='utf-8', newline='\n').write('\n'.join(o) + '\n')
    print('OK', n, 'questions ->', OUT)


if __name__ == '__main__':
    main(sys.argv[1])
