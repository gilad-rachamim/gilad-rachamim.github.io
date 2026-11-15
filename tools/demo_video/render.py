"""סרטון הדמיה + פרוספקט לכלי, מתוך מפרט JSON אחד (14.11.2026).

  python -I tools/demo_video/render.py tools/demo_video/specs/shir_karaoke.json [--only video|flyer] [--fps 30]

יוצא ל-assets/demo/:
  <id>.mp4        סרטון אנכי 720x1280 עם מוזיקה (מסונתזת, בלי זכויות יוצרים)
  <id>.jpg        תמונת פתיחה (poster) לסרטון
  <id>-post.png   פרוספקט 1080x1350 לשיתוף (ווטסאפ, פייסבוק, אינסטגרם)
  <id>-status.png פרוספקט 1080x1920 לסטטוס/סטורי
build.py מוסיף לבד לדף הכלי את הסרטון וכפתורי השיתוף, כשהקבצים קיימים (לפי "tool" במטא של הדף = id).
"""
import argparse
import base64
import hashlib
import io
import json
import subprocess
import sys
import tempfile
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(HERE))
from music import write_music  # noqa: E402

INDEX_NAME = "index.json"


def qr_data_uri(url):
    import qrcode
    q = qrcode.QRCode(border=1, box_size=10, error_correction=qrcode.constants.ERROR_CORRECT_M)
    q.add_data(url)
    q.make(fit=True)
    img = q.make_image(fill_color="#0e1628", back_color="white")
    b = io.BytesIO()
    img.save(b, format="PNG")
    return "data:image/png;base64," + base64.b64encode(b.getvalue()).decode()


def render_video(page, spec, out_dir, fps):
    page.goto((HERE / "engine.html").as_uri())
    page.evaluate("document.fonts.ready")
    info = page.evaluate("s => DV.load(s)", spec)
    # צילום של הכלי (סצנת shot): לחכות שהתמונה תיטען, אחרת יוצא מסך לבן
    page.evaluate("Promise.all([...document.images].map(i => i.decode().catch(() => null)))")
    for img in page.evaluate("[...document.images].filter(i => !i.naturalWidth).map(i => i.src)"):
        print("WARN image missing:", img, flush=True)
    total, cuts = info["total"], info["cuts"]
    sid = spec["id"]
    tmp = Path(tempfile.mkdtemp(prefix="dv-"))
    wav = write_music(tmp / "m.wav", total, cuts=cuts, mood=spec.get("mood", "bright"))
    mp4 = out_dir / f"{sid}.mp4"
    w, h = spec.get("size", [720, 1280])
    ff = subprocess.Popen([
        "ffmpeg", "-v", "error", "-y", "-f", "image2pipe", "-framerate", str(fps), "-c:v", "mjpeg", "-i", "-",
        "-i", str(wav), "-vf", f"scale={w}:{h}:flags=lanczos", "-c:v", "libx264", "-preset", "slow",
        "-crf", str(spec.get("crf", 29 if spec.get("auto") else 27)), "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "96k", "-shortest", "-movflags", "+faststart", str(mp4)], stdin=subprocess.PIPE)
    n = int(total * fps)
    poster_t = spec.get("poster_t", min(2.6, cuts[1] - .3 if len(cuts) > 1 else 2))
    for i in range(n):
        t = i / fps
        page.evaluate("t => DV.seek(t)", t)
        ff.stdin.write(page.screenshot(type="jpeg", quality=92))
    ff.stdin.close()
    ff.wait()
    page.evaluate("t => DV.seek(t)", poster_t)
    page.screenshot(path=str(tmp / "p.jpg"), type="jpeg", quality=90)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(tmp / "p.jpg"), "-vf", f"scale={w}:{h}", "-q:v", "4",
                    str(out_dir / f"{sid}.jpg")], check=True)
    print(f"video: {mp4} {mp4.stat().st_size/1e6:.2f}MB {total:.1f}s")
    if spec.get("wide"):
        render_wide(page.context.browser, spec, mp4, out_dir / f"{sid}-wide.mp4", tmp)
    return total


WIDE_HTML = """<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><style>
@font-face{font-family:Assistant;src:url(%(font)s) format("woff");font-weight:200 900}
*{margin:0;box-sizing:border-box}html,body{width:1920px;height:1080px;background:transparent;font-family:Assistant,sans-serif}
.side{position:absolute;top:0;bottom:0;width:600px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:60px;color:#e3e8f2}
.r{right:0}.l{left:0}
.ic{font-size:110px}.k{font-size:34px;color:#d4b062;font-weight:700;margin-top:18px}
.t{font-size:60px;font-weight:800;color:#fff;line-height:1.1;margin-top:14px}.t em{font-style:normal;color:#f0d38e}
.s{font-size:30px;margin-top:22px;line-height:1.4;color:#c9d1e2}
.qr{width:260px;height:260px;border-radius:24px;background:#fff;padding:14px}.qr img{width:100%%;height:100%%}
.u{direction:ltr;font-size:40px;font-weight:800;color:#f0d38e;margin-top:26px}
.f{font-size:28px;margin-top:16px;color:#c9d1e2}
</style></head><body>
<div class="side r"><div class="ic">%(icon)s</div><div class="k">מיזם הכלים של גילעד רחמים</div><div class="t">%(title)s</div><div class="s">%(sub)s</div></div>
<div class="side l"><div class="qr"><img src="%(qr)s"></div><div class="u">%(url_text)s</div><div class="f">%(foot)s</div></div>
</body></html>"""


def render_wide(browser, spec, mp4, out, tmp):
    """גרסה רחבה 1920x1080 (לאתר וליוטיוב): הסרטון האנכי באמצע, רקע מטושטש ממנו, ושני צדדים קבועים: מה זה + QR."""
    import html as H
    import re
    wd = spec["wide"]
    rich = lambda s: re.sub(r"\*([^*]+)\*", r"<em>\1</em>", H.escape(s)).replace("\n", "<br>")
    font = (ROOT / "assets" / "fonts" / "Assistant-wght.woff").as_uri()
    page = browser.new_page(viewport={"width": 1920, "height": 1080})
    page.set_content(WIDE_HTML % {"font": font, "icon": wd.get("icon", "🧰"), "title": rich(wd["title"]), "sub": rich(wd.get("sub", "")),
                                  "qr": qr_data_uri(wd["url"]), "url_text": H.escape(wd["url_text"]), "foot": rich(wd.get("foot", ""))})
    page.evaluate("document.fonts.ready")
    side = tmp / "side.png"
    page.screenshot(path=str(side), omit_background=True)
    page.close()
    fc = ("[0:v]split[a][b];[a]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,boxblur=30:3,eq=brightness=-0.22[bg];"
          "[b]scale=-2:1080:flags=lanczos[fg];[bg][1:v]overlay=0:0[bs];[bs][fg]overlay=(W-w)/2:0,format=yuv420p[v]")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(mp4), "-i", str(side), "-filter_complex", fc, "-map", "[v]", "-map", "0:a",
                    "-c:v", "libx264", "-preset", "slow", "-crf", "24", "-c:a", "copy", "-movflags", "+faststart", str(out)], check=True)
    print(f"wide: {out} {out.stat().st_size/1e6:.2f}MB")


def render_flyer(page, spec, out_dir):
    f = spec["flyer"]
    qr = qr_data_uri(f["url"])
    for size in (("post",) if spec.get("auto") else ("post", "status")):
        page.set_viewport_size({"width": 1080, "height": 1920 if size == "status" else 1350})
        page.goto((HERE / "flyer.html").as_uri())
        page.evaluate("document.fonts.ready")
        r = page.evaluate("([f,q,s]) => FL.load(f,q,s)", [f, qr, size])
        if r["overflow"]:
            print(f"WARN flyer {size} overflows: {r['overflow']}px > {r['height']}px")
        p = out_dir / f"{spec['id']}-{size}.png"
        page.screenshot(path=str(p), clip={"x": 0, "y": 0, "width": 1080, "height": r["height"]})
        # PNG גדול מדי לווטסאפ? דוחסים לפלטה
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(p), "-vf", "split[a][b];[a]palettegen=max_colors=256[p];[b][p]paletteuse=dither=sierra2_4a", str(p) + ".tmp.png"], check=True)
        Path(str(p) + ".tmp.png").replace(p)
        print(f"flyer: {p} {p.stat().st_size/1e3:.0f}KB")


def spec_hash(spec_path):
    """המפרט + קבצי המנוע: שינוי באחד מהם = לרנדר מחדש."""
    hsh = hashlib.sha1(Path(spec_path).read_bytes())
    for f in ("engine.html", "flyer.html", "music.py", "render.py"):
        hsh.update((HERE / f).read_bytes())
    return hsh.hexdigest()[:12]


def update_index(out_dir, spec, h, total):
    """assets/demo/index.json: מה יש לכל כלי. kelim.js קורא אותו ומכניס את הסרטון לדף גם בלי בנייה מחדש."""
    ip = out_dir / INDEX_NAME
    idx = json.loads(ip.read_text(encoding="utf-8")) if ip.exists() else {}
    sid = spec["id"]
    idx[sid] = {"h": h, "name": spec.get("name", "ככה זה עובד"), "desc": spec.get("description", ""),
                "dur": round(total or idx.get(sid, {}).get("dur", 40)),
                "post": (out_dir / f"{sid}-post.png").exists(), "status": (out_dir / f"{sid}-status.png").exists()}
    ip.write_text(json.dumps(dict(sorted(idx.items())), ensure_ascii=False, indent=0), encoding="utf-8")


def reindex(out_dir):
    """index.json מחדש מכל הסרטונים שיש (גם כאלה שנבנו בענן במקביל, כל אחד עם index משלו)."""
    ip = out_dir / "index.json"
    idx = json.loads(ip.read_text(encoding="utf-8")) if ip.exists() else {}
    for part in out_dir.glob("index-*.json"):
        idx.update(json.loads(part.read_text(encoding="utf-8")))
        part.unlink()
    for mp4 in out_dir.glob("*.mp4"):
        sid = mp4.stem
        if sid in idx:
            continue
        sp = next((x for x in (HERE / "specs" / f"{sid}.json", HERE / "specs" / "auto" / f"{sid}.json") if x.exists()), None)
        spec = json.loads(sp.read_text(encoding="utf-8")) if sp else {"id": sid}
        idx[sid] = {"h": spec_hash(sp)[:12] if sp else "0", "name": spec.get("name", "ככה זה עובד"),
                    "desc": spec.get("description", ""), "dur": round(spec.get("duration") or sum(x.get("dur", 0) for x in spec.get("scenes", [])) or 40),
                    "post": (out_dir / f"{sid}-post.png").exists(), "status": (out_dir / f"{sid}-status.png").exists()}
    ip.write_text(json.dumps(dict(sorted(idx.items())), ensure_ascii=False, indent=0), encoding="utf-8")
    print("index:", len(idx))


def render_promo(paths, a):
    """סרטוני תדמית (specs/promo): המנוע ב-720x1280 בצפיפות x1.5 = פריימים חדים של 1080x1920."""
    out_dir = ROOT / "assets" / "promo"
    out_dir.mkdir(parents=True, exist_ok=True)
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        page = b.new_page(viewport={"width": 720, "height": 1280}, device_scale_factor=1.5)
        for p in paths:
            spec = json.loads(p.read_text(encoding="utf-8"))
            spec.setdefault("size", [1080, 1920])
            spec.setdefault("crf", 23)
            if a.only == "flyer":
                continue
            t0 = time.time()
            if a.fps and a.fps < 10:  # תצוגה מקדימה: כמה פריימים בלבד, בלי סרטון
                info = None
                page.goto((HERE / "engine.html").as_uri())
                page.evaluate("document.fonts.ready")
                info = page.evaluate("s => DV.load(s)", spec)
                page.evaluate("Promise.all([...document.images].map(i => i.decode().catch(() => null)))")
                prev = out_dir / "preview"
                prev.mkdir(exist_ok=True)
                for t in [x / a.fps for x in range(int(info["total"] * a.fps))]:
                    page.evaluate("t => DV.seek(t)", t)
                    page.screenshot(path=str(prev / f"{spec['id']}-{t:05.1f}.jpg"), type="jpeg", quality=80)
                print("preview", spec["id"], info["total"])
                continue
            render_video(page, spec, out_dir, a.fps or 30)
            print(f"DONE {spec['id']} {time.time()-t0:.0f}s", flush=True)
        b.close()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("specs", nargs="*", help="קובצי מפרט או תיקייה (למשל tools/demo_video/specs/auto)")
    ap.add_argument("--only", choices=["video", "flyer"])
    ap.add_argument("--fps", type=int)
    ap.add_argument("--changed", action="store_true", help="רק מפרטים שהשתנו מאז הרינדור האחרון (לפי index.json)")
    ap.add_argument("--shard", help="i/n: רק החלק ה-i מתוך n (להרצה מקבילה בענן)")
    ap.add_argument("--reindex", action="store_true")
    ap.add_argument("--index-name", default="index.json", help="בענן: index-<shard>.json, ומאחדים בסוף עם --reindex")
    a = ap.parse_args()
    if a.reindex:
        reindex(ROOT / "assets" / "demo")
        return
    global INDEX_NAME
    INDEX_NAME = a.index_name
    paths = []
    for s in a.specs:
        p = Path(s)
        paths += sorted(p.glob("*.json")) if p.is_dir() else [p]
    if a.shard:
        i, n = map(int, a.shard.split("/"))
        paths = paths[i::n]
    out_dir = ROOT / "assets" / "demo"
    out_dir.mkdir(parents=True, exist_ok=True)
    promo = [p for p in paths if json.loads(p.read_text(encoding="utf-8")).get("promo")]
    if promo:  # סרטוני תדמית: 1080x1920 + רחב, ל-assets/promo, בלי index של דפי הכלים
        render_promo(promo, a)
        paths = [p for p in paths if p not in promo]
        if not paths:
            return
    ip = out_dir / "index.json"
    idx = json.loads(ip.read_text(encoding="utf-8")) if ip.exists() else {}
    todo = []
    for p in paths:
        spec = json.loads(p.read_text(encoding="utf-8"))
        h = spec_hash(p)
        if a.only == "flyer":  # פרוספקט בלבד: הסרטון נשאר, וה-hash מתעדכן כדי שלא ירונדר שוב סתם
            todo.append((p, spec, h))
            continue
        if a.changed and idx.get(spec["id"], {}).get("h") == h and (out_dir / f"{spec['id']}.mp4").exists():
            continue
        todo.append((p, spec, h))
    print(f"to render: {len(todo)} of {len(paths)}", flush=True)
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        page = b.new_page(viewport={"width": 720, "height": 1280}, device_scale_factor=1)
        page2 = b.new_page(viewport={"width": 1080, "height": 1350}, device_scale_factor=1)
        for k, (p, spec, h) in enumerate(todo, 1):
            t0 = time.time()
            total = None
            try:
                if a.only != "flyer":
                    total = render_video(page, spec, out_dir, a.fps or (24 if spec.get("auto") else 30))
                if a.only != "video" and spec.get("flyer"):
                    render_flyer(page2, spec, out_dir)
                update_index(out_dir, spec, h, total)
                print(f"DONE {spec['id']} [{k}/{len(todo)}] {time.time()-t0:.0f}s", flush=True)
            except Exception as e:
                print(f"FAILED {spec['id']}: {e}", flush=True)
        b.close()


if __name__ == "__main__":
    main()
