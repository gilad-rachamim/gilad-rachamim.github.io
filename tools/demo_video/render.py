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
import io
import json
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(HERE))
from music import write_music  # noqa: E402


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
    ff = subprocess.Popen([
        "ffmpeg", "-v", "error", "-y", "-f", "image2pipe", "-framerate", str(fps), "-c:v", "mjpeg", "-i", "-",
        "-i", str(wav), "-c:v", "libx264", "-preset", "slow", "-crf", "27", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "96k", "-shortest", "-movflags", "+faststart", str(mp4)], stdin=subprocess.PIPE)
    n = int(total * fps)
    poster_t = spec.get("poster_t", min(2.6, cuts[1] - .3 if len(cuts) > 1 else 2))
    for i in range(n):
        t = i / fps
        page.evaluate("t => DV.seek(t)", t)
        ff.stdin.write(page.screenshot(type="jpeg", quality=92))
        if i % (fps * 5) == 0:
            print(f"  frame {i}/{n}", flush=True)
    ff.stdin.close()
    ff.wait()
    page.evaluate("t => DV.seek(t)", poster_t)
    page.screenshot(path=str(out_dir / f"{sid}.jpg"), type="jpeg", quality=82)
    print(f"video: {mp4} {mp4.stat().st_size/1e6:.2f}MB {total:.1f}s")
    return total


def render_flyer(page, spec, out_dir):
    f = spec["flyer"]
    qr = qr_data_uri(f["url"])
    for size in ("post", "status"):
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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("spec")
    ap.add_argument("--only", choices=["video", "flyer"])
    ap.add_argument("--fps", type=int, default=30)
    a = ap.parse_args()
    spec = json.loads(Path(a.spec).read_text(encoding="utf-8"))
    out_dir = ROOT / "assets" / "demo"
    out_dir.mkdir(parents=True, exist_ok=True)
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch()
        page = b.new_page(viewport={"width": 720, "height": 1280}, device_scale_factor=1)
        if a.only != "flyer":
            render_video(page, spec, out_dir, a.fps)
        if a.only != "video" and spec.get("flyer"):
            page2 = b.new_page(viewport={"width": 1080, "height": 1350}, device_scale_factor=1)
            render_flyer(page2, spec, out_dir)
        b.close()
    print("DONE", spec["id"])


if __name__ == "__main__":
    main()
