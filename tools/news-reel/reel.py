# Daily faceless news Reel (1080x1920, ~24s, gold on black) from the latest edition.
# usage: python reel.py <out.mp4> [edition-name e.g. ערב]
import sys, os, json, html, subprocess, tempfile, urllib.request, datetime
from playwright.sync_api import sync_playwright

OUT = sys.argv[1]
WANT = next((a for a in sys.argv[2:] if not a.startswith("--")), None)
API = "https://kelim-news.gilad4049.workers.dev/history"
ed = None
for e in json.load(urllib.request.urlopen(urllib.request.Request(API, headers={"User-Agent": "kelim-reel"}), timeout=30)):
    if not WANT or e.get("name") == WANT:
        ed = e; break
if not ed: sys.exit("no edition")
# --fresh: רק מהדורה מהשעות האחרונות (שלא יעלה סרטון של אתמול אם המהדורה לא רצה)
age = datetime.datetime.now(datetime.timezone.utc) - datetime.datetime.fromisoformat(ed["at"].replace("Z", "+00:00"))
if "--fresh" in sys.argv and age > datetime.timedelta(hours=3):
    print("stale edition", ed["at"]); sys.exit(3)
points = [s["text"] for s in ed["sections"]["main"][:5]]
day = ed.get("date", {}).get("day", ""); heb = ed.get("date", {}).get("he", "")

CSS = """
@import url('https://fonts.googleapis.com/css2?family=Heebo:wght@500;700;900&family=Frank+Ruhl+Libre:wght@900&display=block');
*{margin:0;box-sizing:border-box} html,body{width:1080px;height:1920px;overflow:hidden}
body{background:radial-gradient(circle at 50% 30%,#1c1a12,#070604 72%);color:#f4eedd;direction:rtl;
 font-family:Heebo,Arial,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;
 padding:150px 90px;text-align:center;position:relative}
.frame{position:absolute;inset:48px;border:3px solid #c9a447;border-radius:42px;opacity:.55}
.top{position:absolute;top:120px;left:0;right:0;font:700 44px Heebo;color:#c9a447;letter-spacing:1px}
.n{font:900 150px 'Frank Ruhl Libre',serif;color:#c9a447;line-height:1;margin-bottom:50px}
.p{font:700 76px/1.32 Heebo;text-wrap:balance}
.dots{position:absolute;bottom:170px;display:flex;gap:22px}
.dots i{width:26px;height:26px;border-radius:50%;border:3px solid #c9a447}
.dots i.on{background:#c9a447}
.t1{font:900 128px/1.15 'Frank Ruhl Libre',serif;color:#c9a447}
.t2{font:700 70px Heebo;margin-top:40px}
.t3{font:500 46px Heebo;color:#cfc6ad;margin-top:30px}
.big{font:900 96px/1.2 Heebo;color:#c9a447;direction:ltr}
.ph{font:900 84px Heebo;direction:ltr;margin-top:60px}
.ph small{display:block;font:700 54px Heebo;direction:rtl;margin-top:16px;color:#f4eedd}
.free{font:500 46px/1.4 Heebo;color:#cfc6ad;margin-top:70px}
"""
def page(body): return f"<!doctype html><meta charset=utf-8><style>{CSS}</style><div class=frame></div>{body}"
esc = html.escape
slides = [(page(f"<div class=t1>החדשות<br>ב-3 דקות</div><div class=t2>סיכום {esc(ed['name'])} · {esc(ed.get('time',''))}</div><div class=t3>יום {esc(day)} · {esc(heb)}</div>"), 3.0)]
for i, p in enumerate(points):
    dots = "".join(f"<i class={'on' if j <= i else ''}></i>" for j in range(len(points)))
    slides.append((page(f"<div class=top>החדשות ב-3 דקות · {esc(ed['name'])}</div><div class=n>{i+1}</div><div class=p>{esc(p)}</div><div class=dots>{dots}</div>"), 3.6))
slides.append((page("<div class=t2>הסיכום המלא, 3 פעמים ביום:</div><div class=big>hakelim.com</div>"
                    "<div class=ph>077-2253345<small>טלפון כשר · שלוחה 8</small></div><div class=free>בחינם · בלי הרשמה · בלי פרסומות</div>"), 3.5))

tmp = tempfile.mkdtemp()
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={"width": 1080, "height": 1920})
    for k, (h, _) in enumerate(slides):
        pg.set_content(h, wait_until="networkidle"); pg.evaluate("document.fonts.ready"); pg.wait_for_timeout(300)
        pg.screenshot(path=os.path.join(tmp, f"s{k}.png"))
    b.close()
args, filt = [], []
for k, (_, d) in enumerate(slides):
    args += ["-loop", "1", "-t", str(d), "-i", os.path.join(tmp, f"s{k}.png")]
    filt.append(f"[{k}:v]scale=1080:1920,format=yuv420p,fade=t=in:st=0:d=0.35,fade=t=out:st={d-0.35}:d=0.35,setsar=1[v{k}]")
filt.append("".join(f"[v{k}]" for k in range(len(slides))) + f"concat=n={len(slides)}:v=1:a=0[v]")
# silent stereo track: Reels/TikTok reject some video-only files
total = sum(d for _, d in slides)
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *args, "-f", "lavfi", "-t", str(total), "-i", "anullsrc=r=44100:cl=stereo",
                "-filter_complex", ";".join(filt), "-map", "[v]", "-map", f"{len(slides)}:a", "-r", "30", "-c:v", "libx264",
                "-preset", "medium", "-crf", "21", "-c:a", "aac", "-shortest", "-movflags", "+faststart", OUT], check=True)
desc = "\n".join([f"החדשות ב-3 דקות · סיכום {ed['name']}", ""] + [f"{i+1}. {p}" for i, p in enumerate(points)] +
                 ["", "הסיכום המלא, 3 פעמים ביום, בחינם: https://hakelim.com/kelim/machshev/chadashot/?utm_source=reel",
                  "טלפון כשר: 077-2253345 שלוחה 8"])
open(OUT + ".txt", "w", encoding="utf-8").write(desc)
print(OUT, round(total, 1), "s")
