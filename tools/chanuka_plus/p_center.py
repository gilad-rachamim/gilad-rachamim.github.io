"""משדרג את מרכז החנוכה, לוח הנרות, דפי חנוכה קיימים ודפי הבית. אידמפוטנטי: מסמן בהערות."""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from lib import ROOT, L, a

CSS = '<link rel="stylesheet" href="/assets/chanuka-games.css">'
CD_JS = '<script src="/assets/chanuka-countdown.js" defer></script>'
BANNER = '<a class="cd-banner" id="cd-banner" href="/kodesh/chanuka/" hidden></a>\n'


def load(path):
    s = open(path, encoding='utf8').read()
    m = re.match(r'<!--meta (.*?)-->\n?', s, re.S)
    return json.loads(m.group(1)), s[m.end():]


def save(path, meta, body):
    with open(path, 'w', encoding='utf8', newline='\n') as f:
        f.write('<!--meta ' + json.dumps(meta, ensure_ascii=False, indent=1) + ' -->\n' + body)


def P(*x):
    return os.path.join(ROOT, 'src', 'pages', *x)


def add_once(meta, key, frag):
    v = meta.get(key, '')
    if frag not in v:
        meta[key] = v + frag


def center():
    p = P('kodesh', 'chanuka', 'index.html')
    meta, body = load(p)
    add_once(meta, 'head', CSS)
    add_once(meta, 'foot', CD_JS)
    meta['tool'] = 'chanuka_home'
    meta['title'] = 'חנוכה 2026 (תשפ״ז) – מתי חנוכה, משחקים, יצירה, שירים ומנהגים למשפחה | כלי קודש'
    meta['description'] = 'חנוכה 2026 (תשפ״ז): ספירה לאחור, מתי מדליקים, משחקים, יצירה, שירים ומגילת אנטיוכוס, ופעילויות לילדים. בחינם, בלי הרשמה ובלי פרסומות.'
    if 'id="cd-box"' not in body:
        cd = ('<section class="k-sec" aria-label="ספירה לאחור לחנוכה">\n  <div class="cd-box" id="cd-box"><b>הנר הראשון: יום שישי, 4 בדצמבר 2026, בערב</b></div>\n</section>\n\n')
        body = body.replace('<section class="k-sec" id="maroko"', cd + '<section class="k-sec" id="maroko"', 1)
    if 'data-cp="games"' not in body:
        cards = ''.join('    <a href="%s" data-cp="games"><span class="badge">חדש</span><b>%s</b><span>%s</span></a>\n' % (L[k][1], t, d) for k, t, d in [
            ('mischakim', 'משחקים לחנוכה', 'זיכרון, פאזל והדלקת חנוכייה: שלושה משחקים לילדים, בטלפון, בלי הרשמה.'),
            ('yetzira', 'יצירה לחנוכה', '12 רעיונות לפי גיל וזמן, עם תבניות להדפסה: סביבון, חנוכייה, פך שמן וגרלנד.'),
            ('shirim', 'שירי חנוכה לילדים', 'מעוז צור והנרות הללו עם תעתיק לועזי, וקישורים להקשבה לשירי הילדים.'),
            ('megila', 'מגילת אנטיוכוס', 'הנוסח הארמי בניקוד, באותיות גדולות, עם הדפסה לקריאה בבית.')])
        body = body.replace('<div class="dom">\n', '<div class="dom">\n' + cards, 1)
    if 'data-cp="mk"' not in body:
        card = '    <a href="/kodesh/chanuka/mekabim/" data-cp="mk"><span class="badge">חדש</span><b>ספר המקבים בקצרה</b><span>סיכום לכל פרק, מי זה מי וחידון קטן. ללמוד את סיפור חנוכה בכיף.</span></a>\n'
        body = body.replace('<div class="dom">\n', '<div class="dom">\n' + card, 1)
    if '<!--cp-seo-->' not in body:
        extra = ('  <!--cp-seo-->\n  <h3>חדש השנה: משחקים, יצירה, שירים ומגילה</h3>\n'
                 '  <p>הוספנו ל' + 'חבילה ' + a('mischakim', 'דף משחקים לחנוכה') + ' עם ' + a('zikaron', 'משחק זיכרון') + ', ' + a('pazel', 'פאזל') + ' ו' + a('hadlaka', 'משחק הדלקת החנוכייה') + ', ' + a('yetzira', 'רעיונות ליצירה לחנוכה') + ' עם תבניות להדפסה, ' + a('shirim', 'שירי חנוכה לילדים') + ', ' + a('megila', 'מגילת אנטיוכוס') + ' בניקוד ו' + a('mekabim', 'ספר המקבים בקצרה') + '. הכול בחינם, בלי הרשמה, ועובד גם אחרי שהדף נטען, בלי רשת.</p>\n'
                 '  <h3>ספירה לאחור לחנוכה</h3>\n  <p>בראש הדף מונה השעון כמה זמן נשאר עד הדלקת הנר הראשון. בימי החג הוא מראה איזה נר מדליקים הלילה ומוביל לסדר ההדלקה של אותו לילה בלוח הנרות.</p>\n'
                 '  <h3>ילדים לפי גיל</h3>\n  <p>לקטנים משחק הזיכרון והדלקת החנוכייה, לגיל בית הספר הפאזל והחידון, ולכולם יצירה משפחתית משותפת. בחופשה אפשר לבחור פעילות ביום מ' + a('chufsha') + '.</p>\n')
        body = body.replace('</section>\n<section class="k-sec seo-faq"', extra + '</section>\n<section class="k-sec seo-faq"', 1)
        faqs = ('  <details><summary>איזה משחקים יש לחנוכה בדף?</summary><p>זיכרון, פאזל והדלקת חנוכייה, וגם חידון וסביבון דיגיטלי. הכול בחינם ובלי הרשמה.</p></details>\n'
                '  <details><summary>יש יצירה לחנוכה עם תבניות להדפסה?</summary><p>כן, 12 רעיונות לפי גיל וזמן, עם תבנית סביבון, חנוכייה, פך שמן וגרלנד להדפסה בדף אחד.</p></details>\n'
                '  <details><summary>איפה אפשר לקרוא את מגילת אנטיוכוס?</summary><p>בדף מגילת אנטיוכוס, עם ניקוד, אותיות שמגדילים והדפסה.</p></details>\n')
        body = body.replace('</section>\n<!--/seo-txt-->', faqs + '</section>\n<!--/seo-txt-->', 1)
    save(p, meta, body)


def nerot():
    p = P('kodesh', 'chanuka', 'nerot', 'index.html')
    meta, body = load(p)
    if 'id="seder"' not in body:
        nav = '  <p class="no-print cn-jump">קפיצה ללילה: ' + ' '.join('<a class="gold" href="#nerot-%d">%d</a>' % (i, i) for i in range(1, 9)) + '</p>\n'
        body = body.replace('  <table class="cn-tbl">', nav + '  <table class="cn-tbl">', 1)
        sec = '''<section class="k-sec" id="seder" aria-labelledby="seder-h">
  <h2 id="seder-h">סדר ההדלקה להדפסה, כולל מנהגי עדות המזרח</h2>
  <ol>
    <li>מסדרים את הנרות: בלילה הראשון נר אחד בקצה הימני של החנוכייה, ובכל לילה מוסיפים נר אחד משמאל.</li>
    <li>מדליקים את השמש, הנר הנוסף שנמצא בנפרד.</li>
    <li>מברכים "להדליק נר חנוכה" ו"שעשה ניסים", ובלילה הראשון גם "שהחיינו".</li>
    <li>מדליקים קודם את הנר החדש, השמאלי ביותר, וממשיכים ימינה.</li>
    <li>אחרי ההדלקה אומרים "הנרות הללו".</li>
    <li>שרים "מעוז צור", ויש שאומרים גם "מזמור שיר חנוכת הבית".</li>
  </ol>
  <h3>מנהגי עדות המזרח</h3>
  <ul>
    <li>בבית רבים מעדות המזרח, בעל הבית מדליק בשם כל בני הבית. בבתים אחרים כל בן משפחה מדליק חנוכייה משלו.</li>
    <li>במנהג מרוקו נפוץ הנוסח "להדליק נר של חנוכה", ומדליקים אחרי תפילת ערבית.</li>
    <li>ביום שישי מדליקים נרות חנוכה לפני נרות שבת, ובמוצאי שבת אחרי ההבדלה.</li>
  </ul>
  <p class="cg-note">כל מי שיש לו מנהג מאבותיו, ממשיך בו. בשאלה שואלים את הרב. אפשר להדפיס את הדף ולהניח ליד החנוכייה. <button type="button" class="btn btn-line no-print" onclick="window.print()">להדפסת הסדר</button></p>
</section>

'''
        body = body.replace('<section class="k-sec no-print" aria-labelledby="cn-more-h">', sec + '<section class="k-sec no-print" aria-labelledby="cn-more-h">', 1)
    body = re.sub(r'(<section class="k-sec no-print" aria-labelledby="cn-more-h">.*?<div class="actions">)(?!<a class="btn btn-line" href="/kodesh/chanuka/mischakim/">)',
                  r'\1<a class="btn btn-line" href="/kodesh/chanuka/mischakim/">משחקים לחנוכה</a><a class="btn btn-line" href="/kodesh/chanuka/yetzira/">יצירה לחנוכה</a><a class="btn btn-line" href="/kodesh/chanuka/shirim/">שירי חנוכה</a><a class="btn btn-line" href="/kodesh/chanuka/megila/">מגילת אנטיוכוס</a>', body, count=1, flags=re.S)
    add_once(meta, 'head', CSS)
    save(p, meta, body)
    js = os.path.join(ROOT, 'assets', 'chanuka-nerot.js')
    t = open(js, encoding='utf8').read()
    if "id=\"nerot-'" not in t:
        t = t.replace("return '<tr' + (cur && cur.n === o.n ? ' class=\"now\"' : '') + '>", "return '<tr id=\"nerot-' + o.n + '\"' + (cur && cur.n === o.n ? ' class=\"now\"' : '') + '>", 1)
        open(js, 'w', encoding='utf8', newline='\n').write(t)


def sub_pages():
    base = P('kodesh', 'chanuka')
    new = {'mischakim', 'yetzira', 'shirim', 'megila', 'mekabim', 'en'}
    for d in sorted(os.listdir(base)):
        p = os.path.join(base, d, 'index.html')
        if d in new or d == 'nerot' or not os.path.isfile(p):
            continue
        meta, body = load(p)
        if '<!--cp-links-->' in body:
            continue
        sec = '<!--cp-links-->\n<section class="k-sec no-print" aria-label="עוד לחנוכה">\n  <h2>עוד לחנוכה</h2>\n  <div class="actions"><a class="btn btn-line" href="/kodesh/chanuka/mischakim/">משחקים לחנוכה</a><a class="btn btn-line" href="/kodesh/chanuka/yetzira/">יצירה לחנוכה</a><a class="btn btn-line" href="/kodesh/chanuka/shirim/">שירי חנוכה לילדים</a><a class="btn btn-line" href="/kodesh/chanuka/megila/">מגילת אנטיוכוס</a></div>\n</section>\n'
        if '<!--seo-txt-->' in body:
            body = body.replace('<!--seo-txt-->', sec + '<!--seo-txt-->', 1)
        else:
            body = body.rstrip('\n') + '\n' + sec
        add_once(meta, 'head', CSS)
        save(p, meta, body)
        print('קושר:', d)


def homes():
    for p, anchor in [(P('kelim', 'index.html'), '<header class="k-hero">'), (P('index.html'), '<div class="home">')]:
        meta, body = load(p)
        if 'id="cd-banner"' not in body:
            body = body.replace(anchor, BANNER + anchor, 1)
        add_once(meta, 'head', CSS)
        add_once(meta, 'foot', CD_JS)
        save(p, meta, body)


if __name__ == '__main__':
    center(); nerot(); sub_pages(); homes()
    print('סיום')
