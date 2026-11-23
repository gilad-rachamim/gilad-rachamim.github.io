"""כלי עזר לבניית דפי חנוכה פלוס: כותרת meta, טקסט SEO, שאלות ותשובות ו-FAQPage."""
import json, os, html

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PAGES = os.path.join(ROOT, 'src', 'pages', 'kodesh', 'chanuka')

# קישורים פנימיים משותפים
L = {
    'mischakim': ('משחקים לחנוכה', '/kodesh/chanuka/mischakim/'),
    'zikaron': ('משחק זיכרון חנוכה', '/kodesh/chanuka/mischakim/zikaron/'),
    'pazel': ('פאזל חנוכה', '/kodesh/chanuka/mischakim/pazel/'),
    'hadlaka': ('הדלק את החנוכייה', '/kodesh/chanuka/mischakim/hadlaka/'),
    'yetzira': ('יצירה לחנוכה', '/kodesh/chanuka/yetzira/'),
    'shirim': ('שירי חנוכה לילדים', '/kodesh/chanuka/shirim/'),
    'megila': ('מגילת אנטיוכוס', '/kodesh/chanuka/megila/'),
    'mekabim': ('ספר המקבים בקצרה', '/kodesh/chanuka/mekabim/'),
    'chidon': ('חידון חנוכה', '/kodesh/chanuka/chidon/'),
    'sevivon': ('סביבון דיגיטלי', '/kodesh/chanuka/sevivon/'),
    'tzviya': ('דפי צביעה לחנוכה', '/kodesh/chanuka/tzviya/'),
    'sipurim': ('סיפור לכל לילה', '/kodesh/chanuka/sipurim/'),
    'shiron': ('שירון חנוכה להדפסה', '/kodesh/chanuka/shiron/'),
    'nerot': ('סדר הדלקת נרות חנוכה', '/kodesh/chanuka/nerot/'),
    'chanukiya': ('חנוכייה משותפת', '/kodesh/chanuka/chanukiya/'),
    'kniyot': ('מחשבון קניות לחנוכה', '/kodesh/chanuka/kniyot/'),
    'matkonim': ('מתכוני סופגניות ולביבות', '/kodesh/chanuka/matkonim/'),
    'tashbetz': ('תשבץ ותפזורת לחנוכה', '/kodesh/chanuka/tashbetz/'),
    'chufsha': ('פעילות לחופשת חנוכה', '/kodesh/chanuka/chufsha/'),
    'bracha': ('כרטיס ברכה לחנוכה', '/kodesh/chanuka/bracha/'),
    'chesed': ('נר של חסד', '/kodesh/chanuka/chesed/'),
    'tshii': ('היום התשיעי של חנוכה', '/kodesh/chanuka/tshii/'),
    'center': ('חנוכה למשפחה', '/kodesh/chanuka/'),
}


def a(key, text=None):
    t, h = L[key]
    return '<a class="gold" href="%s">%s</a>' % (h, text or t)


def esc(s):
    return html.escape(s, quote=False)


def faq_ld(faqs):
    return {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
        {'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': strip_tags(ans)}} for q, ans in faqs]}


def strip_tags(s):
    import re
    return re.sub(r'<[^>]+>', '', s)


def build_page(slug, *, title, description, og_title, crumb, h1, sub, tool, body, seo_h2, seo, faqs,
               css='', foot='', priority='0.8', up=None):
    """seo = [(h3, html_paragraph)]; faqs = [(q, answer_html)]. up = (שם, כתובת) לפירור הלחם הביניים."""
    ld = json.dumps(faq_ld(faqs), ensure_ascii=False, separators=(',', ':'))
    head = ('<link rel="stylesheet" href="/assets/seo-txt.css"><link rel="stylesheet" href="/assets/chanuka-games.css">'
            + ('<style>%s</style>' % css if css else '') + '<script type="application/ld+json">%s</script>' % ld)
    crumbs = [[L['center'][0], L['center'][1]]]
    if up:
        crumbs.append([up[0], up[1]])
    crumbs.append([crumb, None])
    meta = {'site': 'kodesh', 'nav': 'rabanim', 'tool': tool, 'title': title, 'description': description,
            'og_title': og_title, 'priority': priority, 'crumbs': crumbs, 'head': head, 'foot': foot}
    out = ['<!--meta ' + json.dumps(meta, ensure_ascii=False, indent=1) + ' -->']
    out.append('<header class="k-hero">\n  <span class="bsd">בס"ד</span>\n  <h1>%s</h1>\n  <p class="sub">%s</p>\n</header>\n' % (h1, sub))
    out.append(body)
    out.append('<!--seo-txt-->\n<section class="k-sec seo-txt" aria-labelledby="seo-h">\n  <h2 id="seo-h">%s</h2>' % seo_h2)
    for h3, p in seo:
        if h3:
            out.append('  <h3>%s</h3>' % h3)
        out.append('  <p>%s</p>' % p)
    out.append('</section>\n<section class="k-sec seo-faq" aria-labelledby="seo-faq-h">\n  <h2 id="seo-faq-h">שאלות ותשובות</h2>')
    for q, ans in faqs:
        out.append('  <details><summary>%s</summary><p>%s</p></details>' % (esc(q), ans))
    out.append('</section>\n<!--/seo-txt-->\n')
    d = os.path.join(PAGES, *slug.split('/'))
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, 'index.html'), 'w', encoding='utf8', newline='\n') as f:
        f.write('\n'.join(out))
    return os.path.join(d, 'index.html')


def more_links(keys, title='עוד לחנוכה'):
    btns = ''.join('<a class="btn btn-line" href="%s">%s</a>' % (L[k][1], L[k][0]) for k in keys)
    return '<section class="k-sec" aria-label="%s">\n  <h2>%s</h2>\n  <div class="actions">%s</div>\n</section>\n' % (title, title, btns)
