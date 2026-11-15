"""מרכיב את סרטון ההדמיה של תוסף הכרום מההקלטות של record.py.

הרצה: python tools/tosaf_promo/compose.py <תיקיית ההקלטות> <קובץ פלט בלי סיומת>
יוצאים: <out>-wide.mp4 (1920x1080) ו-<out>-tall.mp4 (1080x1920), עם מוזיקה מסונתזת (tools/demo_video/music.py).
"""
import sys, json, base64, pathlib, subprocess, tempfile
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools" / "demo_video"))
from music import write_music

REC, OUT = pathlib.Path(sys.argv[1]), sys.argv[2]
STILLS = [pathlib.Path(x) for x in sys.argv[3:]]  # צילומי מסך 1280x800 שנכנסים כשקופיות (למשל ג'ימייל, שאי אפשר להקליט בלי חשבון)
TMP = pathlib.Path(tempfile.mkdtemp(prefix="tosafvid-"))
FPS = 30

def b64(p, mime):
    return "data:%s;base64,%s" % (mime, base64.b64encode(pathlib.Path(p).read_bytes()).decode())
FONT = b64(ROOT / "assets/fonts/Assistant-wght.woff", "font/woff")
SERIF = b64(ROOT / "assets/fonts/FrankRuhlLibre-wght.woff", "font/woff")
ICON = b64(ROOT / "assets/icon-kelim-192.png", "image/png")

def run(*a):
    subprocess.run([str(x) for x in a], check=True)

BASE_CSS = """@font-face{font-family:A;src:url(%s)}@font-face{font-family:F;src:url(%s)}
*{box-sizing:border-box;margin:0}body{width:%dpx;height:%dpx;overflow:hidden;font-family:A;direction:rtl;color:#f3ead7;
background:radial-gradient(120%% 100%% at 80%% 0%%,#22302b 0%%,#0f1513 55%%,#090c0b 100%%)}
.c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:26px;padding:60px}
h1{font-family:F;font-weight:800;line-height:1.1;color:#fff} h1 b{color:#e2b85c;display:block}
.sub{color:#eadfc8} .gold{color:#e2b85c}
.brand{display:flex;align-items:center;gap:14px;color:#e2b85c} .brand img{border-radius:12px}
.grid{display:grid;gap:18px} .grid div{border:1px solid #4a3f2a;background:rgba(255,255,255,.04);border-radius:18px;padding:18px 22px;text-align:right}
.grid b{color:#e2b85c;display:block} .btn{background:#e2b85c;color:#111;font-weight:800;border-radius:999px}
"""

def card(html_body, w, h, name):
    css = BASE_CSS % (FONT, SERIF, w, h)
    doc = "<!doctype html><html><head><meta charset=utf-8><style>%s</style></head><body>%s</body></html>" % (css, html_body)
    path = TMP / (name + ".png")
    with sync_playwright() as p:
        b = p.chromium.launch(channel="chrome"); pg = b.new_page(viewport={"width": w, "height": h})
        pg.set_content(doc); pg.wait_for_timeout(300); pg.screenshot(path=str(path)); b.close()
    return path

def cards(w, h):
    tall = h > w
    s = 1.0 if not tall else 0.95
    big, mid, small = int(110 * s), int(46 * s), int(34 * s)
    brand = '<div class=brand style="font-size:%dpx"><img src="%s" width=%d height=%d>מיזם הכלים של גילעד רחמים</div>' % (small, ICON, int(56 * s), int(56 * s))
    intro = card('<div class=c>%s<h1 style="font-size:%dpx">תוסף אחד לכרום<b>שמסדר לכם את המחשב</b></h1><p class=sub style="font-size:%dpx">כרטיסיות, ג׳ימייל, ווטסאפ, קבצים, פתקים, תרגום – ומאות כלים.</p></div>' % (brand, big, mid), w, h, "intro")
    tr = card('<div class=c><p class=sub style="font-size:%dpx">והכלי הכי חזק:</p><h1 style="font-size:%dpx">כל אתר באנגלית<b>בעברית, בלי שיישבר</b></h1></div>' % (mid, big), w, h, "tr")
    feats = [("🔍 מאות כלים בחיפוש", "כלי חדש באתר נכנס לתוסף לבד"), ("✍ חתימה על PDF", "ישר מג׳ימייל, בלי להדפיס"), ("⌨ utz ← ואז", "כתבתם באנגלית במקום בעברית? Alt+Shift+H"),
             ("📸 צילום עמוד שלם", "כל הדף, כתמונה או PDF"), ("🗜 תמונה ו-PDF קטנים", "לחיצה ימנית – מקטינים לפני שליחה"), ("📅 \"רופא מחר ב-10:30\"", "נכנס ליומן גוגל לבד"),
             ("💬 ווטסאפ למספר", "בלי לשמור איש קשר"), ("🌐 האתר הזה", "להשתיק, להוסיף לדף שלי, לנקות כשנתקע")]
    cols = 2 if tall else 4
    grid = ''.join('<div><b style="font-size:%dpx">%s</b><span style="font-size:%dpx">%s</span></div>' % (int(36 * s), a, int(27 * s), b) for a, b in feats)
    more = card('<div class=c><h1 style="font-size:%dpx">ועוד בתוסף אחד</h1><div class=grid style="grid-template-columns:repeat(%d,1fr);width:%dpx">%s</div></div>' % (int(80 * s), cols, int(w * .86), grid), w, h, "more")
    priv = card('<div class=c><h1 style="font-size:%dpx">הכול בתוך המחשב<b>בלי שרת. בלי חשבון.</b></h1><p class=sub style="font-size:%dpx">התוסף לא קורא את המיילים ולא שולח את הדפים לשום מקום.<br>חינם, בלי פרסומות.</p></div>' % (int(96 * s), mid), w, h, "priv")
    cta = card('<div class=c>%s<h1 style="font-size:%dpx">להוסיף לכרום<b>בחינם</b></h1><p class=sub style="font-size:%dpx">בחנות של כרום: <span class=gold>"הכלים של גילעד רחמים"</span></p><p class="btn" style="font-size:%dpx;padding:18px 46px;direction:ltr">hakelim.com/kelim/machshev/chatima/tosaf</p></div>' % (brand, big, mid, int(38 * s)), w, h, "cta")
    # "🎤 לדבר" (תוסף 3.5): מה שאמרתם ← מה שנכנס למייל. הטקסט המסודר = הפלט של HKDibur.tidy על אותו דיבור.
    said = "שלום דני אממ רציתי לשאול לגבי החשבונית של אוקטובר כאילו היא עוד לא הגיעה אליי אפשר לשלוח שוב תודה רבה"
    mail = "<span class=gold>נושא: בעניין החשבונית של אוקטובר</span><br><br>שלום דני,<br><br>רציתי לשאול לגבי החשבונית של אוקטובר. היא עוד לא הגיעה אליי. אפשר לשלוח שוב?<br><br>תודה רבה!<br>בברכה,<br>גילעד"
    fs = int(30 * s)
    box = 'border:1px solid #4a3f2a;background:rgba(255,255,255,.05);border-radius:22px;padding:24px 28px;text-align:right;line-height:1.5;font-size:%dpx' % fs
    lab = 'display:block;color:#e2b85c;font-weight:800;margin-bottom:10px;font-size:%dpx' % int(28 * s)
    two = ('display:flex;flex-direction:column;gap:16px;width:%dpx' % int(w * .86)) if tall else ('display:grid;grid-template-columns:1fr auto 1.25fr;gap:26px;align-items:center;width:%dpx' % int(w * .84))
    arrow = '<div style="font-size:%dpx;color:#e2b85c;text-align:center">%s</div>' % (int(60 * s), "⬇" if tall else "⬅")
    dibur = card('<div class=c><h1 style="font-size:%dpx">🎤 מדברים<b>והוא מסדר</b></h1><div style="%s"><div style="%s"><span style="%s">מה שאמרתם</span><span style="color:#b9ae98">"%s"</span></div>%s<div style="%s;background:rgba(226,184,92,.08);border-color:#e2b85c"><span style="%s">מה שנכנס למייל</span>%s</div></div><p class=sub style="font-size:%dpx">בג׳ימייל ובווטסאפ ווב: פיסוק, פסקאות, בלי "אממ" – ושולחים בעצמכם.</p></div>' % (int(84 * s), two, box, lab, said, arrow, box, lab, mail, int(34 * s)), w, h, "dibur")
    return intro, tr, more, priv, cta, dibur

# קטעי ההקלטה: (שם, חיתוך x,y,w,h בתוך פריים 1280x800 או None)
# סדר הסרטון: (שם הקלטה, חיתוך x,y,w,h או None, עד כמה שניות), ("still", מספר), ("card", שם)
# לפי מה שהכי מחפשים (מחקר מילות המפתח 15.11.2026): אחסון גוגל, יומן עברי וגוגל, ג'ימייל, כרטיסיות, ואז התרגום.
import os
VARIANT = os.environ.get("VARIANT", "full")
if VARIANT == "short":
    SEGS = [("panui", (80, 0, 1120, 800), 9), ("popup", (300, 0, 720, 800), 13), ("tabs", (240, 0, 800, 800), 10),
            ("card", "dibur"), ("card", "tr"), ("atar", None, 11), ("youtube", (372, 0, 880, 700), 8)]
else:
    SEGS = [("panui", (80, 0, 1120, 800)), ("popup", (300, 0, 720, 800)), ("still", 3), ("tabs", (240, 0, 800, 800)),
            ("still", 0), ("still", 1), ("still", 2), ("card", "dibur"), ("card", "tr"),
            ("atar", None), ("youtube", (372, 0, 880, 700)), ("pdf2", None, 6)]

def seg_video(name):
    d = REC / ("seg-" + name)
    t = json.loads((d / "times.json").read_text())
    lst = TMP / (name + ".txt")
    lines = []
    n = len(t) - 1
    for i in range(n):
        dur = max(1 / FPS, t[i + 1] - t[i])
        lines.append("file '%s'\nduration %.4f" % ((d / ("%05d.jpg" % i)).as_posix(), dur))
    lines.append("file '%s'" % (d / ("%05d.jpg" % (n - 1))).as_posix())
    lst.write_text("\n".join(lines))
    out = TMP / (name + "-raw.mp4")
    run("ffmpeg", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-vf", "fps=%d,scale=1280:800:force_original_aspect_ratio=decrease,pad=1280:800:(ow-iw)/2:(oh-ih)/2" % FPS, "-pix_fmt", "yuv420p", "-c:v", "libx264", "-crf", "16", out)
    return out, t[-1] - t[0]

def build(w, h, tag):
    intro, tr, more, priv, cta, dibur = cards(w, h)
    named = {"tr": tr, "dibur": dibur}
    hold = {"dibur": 5.5}
    bg = card("", w, h, "bg")
    parts = []
    def still(png, sec, name):
        o = TMP / ("%s-%s.mp4" % (tag, name))
        run("ffmpeg", "-loglevel", "error", "-y", "-loop", "1", "-t", sec, "-i", png, "-vf", "fps=%d,format=yuv420p,fade=in:0:9,fade=out:st=%.2f:d=0.3" % (FPS, sec - 0.3), "-c:v", "libx264", "-crf", "16", o)
        parts.append((o, sec))
    still(intro, 3.0 if VARIANT == "short" else 3.6, "intro")
    for item in SEGS:
        name, crop = item[0], item[1]
        maxdur = item[2] if len(item) > 2 else None
        if name == "card":
            still(named[crop], hold.get(crop, 3.0), crop); continue
        if name == "still":
            if crop >= len(STILLS): continue
            o = TMP / ("%s-still%d.mp4" % (tag, crop)); sec = 4.6
            maxw, maxh = (int(w * .9), int(h * .9)) if w > h else (int(w * .98), int(h * .7))
            run("ffmpeg", "-loglevel", "error", "-y", "-loop", "1", "-i", bg, "-loop", "1", "-i", STILLS[crop], "-filter_complex",
                "[1:v]scale=%d:%d:force_original_aspect_ratio=decrease:flags=lanczos[v];[0:v][v]overlay=(W-w)/2:(H-h)/2,fps=%d,format=yuv420p,fade=in:0:9,fade=out:st=%.2f:d=0.3" % (maxw, maxh, FPS, sec - 0.3),
                "-t", "%.2f" % sec, "-c:v", "libx264", "-crf", "17", o)
            parts.append((o, sec)); continue
        raw, dur = seg_video(name)
        if maxdur: dur = min(dur, maxdur)
        f = "crop=%d:%d:%d:%d," % (crop[2], crop[3], crop[0], crop[1]) if crop else ""
        maxw, maxh = (int(w * .86), int(h * .9)) if w > h else (int(w * .96), int(h * .62))
        o = TMP / ("%s-%s.mp4" % (tag, name))
        fade = "fade=in:0:6," if name != "pdf2" else ""
        run("ffmpeg", "-loglevel", "error", "-y", "-loop", "1", "-i", bg, "-i", raw, "-filter_complex",
            "[1:v]%sscale=%d:%d:force_original_aspect_ratio=decrease:flags=lanczos,pad=iw+6:ih+6:3:3:color=0xe2b85c[v];[0:v][v]overlay=(W-w)/2:(H-h)/2:shortest=1,fps=%d,format=yuv420p,%sfade=out:st=%.2f:d=0.25" % (f, maxw, maxh, FPS, fade, dur - 0.25),
            "-t", "%.2f" % dur, "-c:v", "libx264", "-crf", "17", o)
        parts.append((o, dur))
    if VARIANT != "short": still(more, 5.0, "more"); still(priv, 3.8, "priv")
    still(cta, 4.5 if VARIANT == "short" else 5.0, "cta")
    lst = TMP / (tag + "-all.txt")
    lst.write_text("\n".join("file '%s'" % p.as_posix() for p, _ in parts))
    total = sum(d for _, d in parts)
    cuts, acc = [], 0.0
    for _, d in parts: cuts.append(acc); acc += d
    wav = TMP / "music.wav"; write_music(str(wav), total + 0.5, cuts=cuts, mood="bright")
    out = "%s-%s%s.mp4" % (OUT, tag, "-short" if VARIANT == "short" else "")
    run("ffmpeg", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-i", wav, "-c:v", "libx264", "-crf", "18", "-preset", "slow", "-pix_fmt", "yuv420p",
        "-af", "afade=in:0:d=0.6,afade=out:st=%.2f:d=1.5,volume=0.8" % (total - 1.5), "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", out)
    print(tag, out, round(total, 1), "s")

build(1920, 1080, "wide")
build(1080, 1920, "tall")
