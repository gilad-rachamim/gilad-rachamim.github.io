"""צילומי חנות לתוסף הכרום (1280x800) ואריחים (440x280, 1400x560), מצילומי מסך אמיתיים של התוסף.

הרצה: python tools/tosaf_promo/store_shots.py <תיקיית צילומי המקור> <תיקיית פלט>
צילומי המקור: react-1-bi.png, yt-cap-bi.png, pdf-1-bi.png, local-1-bi.png (מ-~/.claude/state/chrome-ext-test/shots).
"""
import sys, base64, pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC, OUT = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)

def b64(p):
    return 'data:%s;base64,%s' % ('font/woff' if str(p).endswith('woff') else 'image/png', base64.b64encode(pathlib.Path(p).read_bytes()).decode())

FONT = b64(ROOT / 'assets/fonts/Assistant-wght.woff')
SERIF = b64(ROOT / 'assets/fonts/FrankRuhlLibre-wght.woff')
ICON = b64(ROOT / 'assets/icon-kelim-192.png')

CSS = """
@font-face{font-family:A;src:url(%s)}@font-face{font-family:F;src:url(%s)}
*{box-sizing:border-box;margin:0}
body{width:%dpx;height:%dpx;overflow:hidden;font-family:A;direction:rtl;color:#f3ead7;
 background:radial-gradient(120%% 120%% at 85%% 10%%,#1f2a26 0%%,#0f1513 60%%,#0b0f0e 100%%)}
.wrap{position:absolute;inset:0;display:flex;align-items:center;gap:48px;padding:56px 64px}
.txt{flex:0 0 470px}
h1{font-family:F;font-weight:800;font-size:60px;line-height:1.08;color:#fff}
h1 b{display:block;color:#e2b85c}
ul{list-style:none;padding:0;margin-top:30px}
li{font-size:25px;line-height:1.35;margin:13px 0;padding-right:36px;position:relative;color:#eadfc8}
li:before{content:'✓';position:absolute;right:0;color:#e2b85c;font-weight:800}
.key{display:inline-block;direction:ltr;border:1px solid #e2b85c;border-radius:8px;padding:0 8px;font-size:21px;color:#e2b85c;margin:0 4px}
.note{margin-top:22px;font-size:19px;color:#b9ad95}
.shot{flex:1;border-radius:14px;overflow:hidden;background:#fff;box-shadow:0 20px 60px rgba(0,0,0,.55);border:1px solid #3a3326}
.bar{height:34px;background:#e8e8ea;display:flex;align-items:center;padding:0 12px;gap:8px;direction:ltr}
.bar i{width:11px;height:11px;border-radius:50%%;background:#c7c7cc;display:block}
.bar span{flex:1;height:22px;border-radius:11px;background:#fff;font:13px Arial;color:#555;line-height:22px;padding:0 12px;direction:ltr;text-align:left}
.shot img{display:block;width:100%%}
.brand{position:absolute;bottom:34px;right:64px;display:flex;align-items:center;gap:12px;font-size:21px;color:#e2b85c}
.brand img{width:34px;height:34px;border-radius:8px}
"""

def shot_page(w, h, title, gold, bullets, img, url, note='התרגום רץ בתוך המחשב, במנוע של כרום. בלי שרת, בלי חשבון.', crop=None):
    css = CSS % (FONT, SERIF, w, h)
    style = ''
    lis = ''.join('<li>%s</li>' % b for b in bullets)
    return f"""<!doctype html><html><head><meta charset=utf-8><style>{css}</style></head><body>
<div class=wrap><div class=txt><h1>{title}<b>{gold}</b></h1><ul>{lis}</ul><p class=note>{note}</p></div>
<div class=shot><div class=bar><i></i><i></i><i></i><span>{url}</span></div><img src="{img}"></div></div>
<div class=brand><img src="{ICON}">מיזם הכלים של גילעד רחמים · hakelim.com</div></body></html>"""

K = '<span class=key>Alt+Shift+T</span>'
PAGES = [
    ('1-tirgum-atar', 'כל אתר באנגלית', 'בעברית, בלי שיישבר', [
        'התרגום מתחת לכל פסקה, המקור נשאר', 'כפתורים וטפסים ממשיכים לעבוד', 'React נשאר React, לא "להגיב"', 'לחיצה אחת: ' + K, '"תמיד באתר הזה" – מתרגם לבד'],
     'react-1-bi.png', 'react.dev/learn/synchronizing-with-effects', (340, 60, 900, 640)),
    ('2-youtube', 'כתוביות ביוטיוב', 'בעברית, בתוך הנגן', [
        'כל כתובית מתורגמת ברגע שהיא מופיעה', 'עברית מעל המקור, או "רק תרגום"', 'עובד גם במסך מלא', 'גם הכותרת של הסרטון מתורגמת', 'ללמוד אנגלית תוך כדי צפייה'],
     'yt-cap-bi.png', 'youtube.com/watch', (376, 300, 884, 360)),
    ('3-pdf', 'קובץ PDF באנגלית?', 'בעברית, פסקה-פסקה', [
        K + ' על PDF פתוח בכרום', 'פסקה באנגלית ומתחתיה העברית', 'להדפיס או לשמור את התרגום', 'הקובץ לא עולה לשום שרת', 'מתאים לחוזים, מכתבים ומאמרים'],
     'pdf-1-bi.png', 'sample.pdf', (230, 0, 820, 540)),
    ('4-kishurim', 'הקישורים', 'נשארים לחיצים', [
        'קישור בתוך משפט – לחיץ גם בעברית', 'הדגשות ומונחי קוד נשמרים', 'מסמנים חצי מילה – הסימון מתרחב', 'בועת תרגום לטקסט מסומן 🌐', 'מילון אישי למונחים שחוזרים'],
     'local-1-bi.png', 'example.com/docs', (0, 0, 1000, 540)),
]

with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome')
    for name, t, g, bl, src, url, crop in PAGES:
        pg = b.new_page(viewport={'width': 1280, 'height': 800})
        if crop:  # (x, y, w, h) בפיקסלים של צילום המקור
            import subprocess, tempfile
            tmp = pathlib.Path(tempfile.gettempdir()) / ('crop-' + src)
            subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', str(SRC / src), '-vf', 'crop=%d:%d:%d:%d' % (crop[2], crop[3], crop[0], crop[1]), str(tmp)], check=True)
            img = b64(tmp)
        else:
            img = b64(SRC / src)
        pg.set_content(shot_page(1280, 800, t, g, bl, img, url))
        pg.wait_for_timeout(400)
        pg.screenshot(path=str(OUT / ('%s.png' % name)))
        pg.close()
    # אריח קטן 440x280
    css = CSS % (FONT, SERIF, 440, 280)
    tile = f"""<!doctype html><html><head><meta charset=utf-8><style>{css}
.t{{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:6px}}
.t img{{width:58px;height:58px;border-radius:12px}} .t h1{{font-size:40px}} .t p{{font-size:19px;color:#e2b85c}}</style></head><body>
<div class=t><img src="{ICON}"><h1>תרגום לעברית<b>בלי שהאתר יישבר</b></h1><p>אתרים · יוטיוב · PDF · בחינם</p></div></body></html>"""
    pg = b.new_page(viewport={'width': 440, 'height': 280}); pg.set_content(tile); pg.wait_for_timeout(300)
    pg.screenshot(path=str(OUT / 'tile-440x280.png')); pg.close()
    # אריח רחב 1400x560
    css = CSS % (FONT, SERIF, 1400, 560)
    mq = f"""<!doctype html><html><head><meta charset=utf-8><style>{css}
.m{{position:absolute;inset:0;display:flex;align-items:center;gap:40px;padding:40px 70px}}
.m .txt{{flex:0 0 560px}} .m h1{{font-size:66px}} .m p{{font-size:26px;color:#e2b85c;margin-top:18px}}
.m .shot{{flex:1}}</style></head><body><div class=m><div class=txt><h1>כל אתר באנגלית<b>בעברית, בלחיצה</b></h1>
<p>אתרים · כתוביות ביוטיוב · PDF — בלי שהאתר יישבר. חינם, בתוך המחשב.</p></div>
<div class=shot><div class=bar><i></i><i></i><i></i><span>react.dev</span></div><div style="height:400px;overflow:hidden"><img src="{b64(SRC / 'react-1-bi.png')}" style="width:150%;margin-left:-40%;margin-top:-80px"></div></div></div></body></html>"""
    pg = b.new_page(viewport={'width': 1400, 'height': 560}); pg.set_content(mq); pg.wait_for_timeout(300)
    pg.screenshot(path=str(OUT / 'marquee-1400x560.png')); pg.close()
    b.close()
print('done', OUT)
