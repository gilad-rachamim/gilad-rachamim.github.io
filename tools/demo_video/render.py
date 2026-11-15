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
    return total


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
    ip = out_dir / "index.json"
    idx = json.loads(ip.read_text(encoding="utf-8")) if ip.exists() else {}
    todo = []
    for p in paths:
        spec = json.loads(p.read_text(encoding="utf-8"))
        h = spec_hash(p)
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
