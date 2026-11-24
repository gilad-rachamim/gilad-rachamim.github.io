# עטיפה דקה: הסרטון הקצר היומי נוצר עכשיו ב-tools/news_media.py (קול עברי, כתוביות מילה-מילה, פתיח ויראלי).
# אותו ממשק כמו קודם: python reel.py <out.mp4> [שם מהדורה] [--fresh]; הטקסט לפוסט נכתב ל-<out.mp4>.txt
import os, shutil, subprocess, sys, tempfile

out = sys.argv[1]
want = next((a for a in sys.argv[2:] if not a.startswith("--")), None)
cmd = [sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "news_media.py"), "short"]
d = tempfile.mkdtemp(prefix="reel-")
cmd.append(d)
if want:
    cmd += ["--edition", want]
if "--fresh" in sys.argv:
    cmd.append("--fresh")
cmd += ["--voice", "edge"]
r = subprocess.run(cmd)
if r.returncode:
    sys.exit(r.returncode)
shutil.copy(os.path.join(d, "short-edge.mp4"), out)
shutil.copy(os.path.join(d, "short-edge.mp4.txt"), out + ".txt")
print(out)
