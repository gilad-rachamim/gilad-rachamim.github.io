# -*- coding: utf-8 -*-
"""runner.py - "תמלול מיוטיוב": קישור לשיעור ביוטיוב -> PDF + Word מסודרים (22.11.2026).

רץ בענן של GitHub (.github/workflows/yutub.yml), לא במחשב של גילעד. שואל את ה-Worker (kelim-yutub) אם יש משימה,
מוריד רק את השמע (yt-dlp; יוטיוב חוסם כתובות של שרתים, אז אחרי ניסיון ישיר עוברים בפרוקסי ביתי),
חותך בשקטים לחלקים של ~6 דקות, מתמלל את כולם במקביל ב-RunPod (המודל העברי של ivrit.ai),
מנקה הזיות של המודל (clean_transcript.py), מסדר לפסקאות, ובונה PDF (Chrome) ו-Word (python-docx).

  python runner.py loop                       כל המשימות שבתור (GitHub Actions)
  python runner.py local URL --out DIR [--by "שם הרב / המוסד"] [--times]     בדיקה מהמחשב, בלי Worker

סביבה: YUTUB_WORKER, YUTUB_RUNNER_KEY (רק ל-loop), RUNPOD_KEY, RUNPOD_ENDPOINT, YUTUB_PROXY (לא חובה), CHROME (לא חובה),
YUTUB_GEMINI (לא חובה: מפתח Gemini לשלב העריכה - פיסוק, כותרות, תקציר ומקורות. בלעדיו הקובץ יוצא בלי עריכה).
הלוג ב-GitHub פתוח לכולם: לא מדפיסים קישור, כותרת או טקסט של אף אחד - רק מזהה משימה ושלב.
"""
import argparse
import base64
import datetime
import html
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import clean_transcript  # noqa: E402
import polish  # noqa: E402

MODEL = "ivrit-ai/whisper-large-v3-turbo-ct2"
PIECE = 6 * 60
KBPS = 24
MAX_SEC = 4 * 3600 + 600
SITE = "https://hakelim.com/kelim/tamlul/yutub/"
CREDIT = "תומלל בכלי \"תמלול מיוטיוב\" של מיזם הכלים של גילעד רחמים – מיזם חסד, בלי כוונת רווח."
NOTE = "תמלול אוטומטי: ייתכנו טעויות, במיוחד בפסוקים, בארמית ובשמות. כדאי לעבור על הטקסט לפני שמפיצים אותו."
NOTE_EDITED = ("התמלול, העריכה, התקציר ורשימת המקורות נעשו אוטומטית: ייתכנו טעויות, במיוחד בפסוקים, בארמית ובשמות. "
               "הנוסח הקובע הוא השיעור המוקלט.")
FONT = os.path.normpath(os.path.join(HERE, "..", "..", "assets", "fonts", "FrankRuhlLibre-wght.woff"))
NOWIN = 0x08000000 if os.name == "nt" else 0


class Fail(Exception):
    """שגיאה עם הודעה בעברית שמוצגת למשתמש."""


def say(msg):
    print(time.strftime("%H:%M:%S"), msg, flush=True)


def run(args, timeout=1800):
    return subprocess.run(args, capture_output=True, text=True, encoding="utf-8", errors="replace",
                          timeout=timeout, creationflags=NOWIN)


# ---------- יוטיוב ----------
def ytdlp(extra, url, timeout=1500):
    """ניסיון ישיר, ואז דרך הפרוקסי. מחזיר CompletedProcess של הניסיון שהצליח, או זורק Fail."""
    base = [sys.executable, "-m", "yt_dlp", "--ignore-config", "--no-playlist", "--no-warnings", "--no-progress",
            "--socket-timeout", "30", "--retries", "3"]
    proxy = os.environ.get("YUTUB_PROXY", "").strip()
    ways = [[]] + ([["--proxy", proxy]] if proxy else [])
    if os.environ.get("YUTUB_PROXY_FIRST") and proxy:
        ways.reverse()
    err = ""
    for i, way in enumerate(ways):
        for attempt in range(2 if way else 1):
            try:
                p = run(base + way + extra + [url], timeout=timeout)
            except subprocess.TimeoutExpired:
                err = "timeout"
                continue
            if p.returncode == 0:
                return p
            err = (p.stderr or "")[-600:]
            if re.search(r"Private video|Video unavailable|removed|members-only|This live event|Premieres in", err):
                break
        say(f"yt-dlp way {i} failed")
    low = err.lower()
    if "private video" in low:
        raise Fail("הסרטון פרטי, ולכן אי אפשר לתמלל אותו.")
    if "members-only" in low or "join this channel" in low:
        raise Fail("הסרטון פתוח רק לחברי הערוץ.")
    if "live event" in low or "premieres" in low:
        raise Fail("השידור עוד לא התחיל או עוד לא הסתיים. אפשר לתמלל אחרי שהוא עולה כסרטון רגיל.")
    if "unavailable" in low or "removed" in low:
        raise Fail("הסרטון לא זמין ביוטיוב. כדאי לבדוק את הקישור.")
    if "sign in to confirm your age" in low:
        raise Fail("יוטיוב מגביל את הסרטון הזה לפי גיל, ולכן אי אפשר להוריד אותו.")
    raise Fail("לא הצלחתי להוריד את השמע מיוטיוב. אפשר לנסות שוב בעוד כמה דקות.")


def video_meta(url):
    p = ytdlp(["-J", "--skip-download"], url, timeout=240)
    try:
        j = json.loads(p.stdout)
    except ValueError:
        raise Fail("לא הצלחתי לקרוא את פרטי הסרטון מיוטיוב.")
    if j.get("is_live"):
        raise Fail("זה שידור חי שעוד רץ. אפשר לתמלל אחרי שהוא מסתיים.")
    dur = float(j.get("duration") or 0)
    if dur and dur > MAX_SEC:
        raise Fail("הסרטון ארוך מ-4 שעות. אפשר לחלק אותו ולתמלל חלק-חלק בכלי התמלול הרגיל.")
    d = j.get("upload_date") or ""
    return {"id": j.get("id") or "", "title": (j.get("title") or "").strip(), "channel": (j.get("channel") or j.get("uploader") or "").strip(),
            "dur": dur, "date": f"{d[6:8]}.{d[4:6]}.{d[0:4]}" if len(d) == 8 else "",
            "chapters": [{"t": float(c.get("start_time") or 0), "title": (c.get("title") or "").strip()}
                         for c in (j.get("chapters") or []) if c.get("title")]}


def download_audio(url, tmp):
    out = os.path.join(tmp, "a.%(ext)s")
    ytdlp(["-f", "249/250/139/140/251/ba/b[height<=360]/b", "-o", out], url)
    files = [f for f in os.listdir(tmp) if f.startswith("a.") and not f.endswith(".part")]
    if not files:
        raise Fail("לא הצלחתי להוריד את השמע מיוטיוב. אפשר לנסות שוב בעוד כמה דקות.")
    return os.path.join(tmp, files[0])


# ---------- אתר כולל נחלת אבות: דף שיעור עם קובץ MP3 פתוח ----------
NA_RE = re.compile(r"^https://(?:www\.)?nahalat-avot\.com/lesson/[A-Za-z0-9_\-%]+/?$")
NA_AUDIO = re.compile(r"https://yad-sh-audio\.b-cdn\.net/[^\"'\\<> ]+?\.mp3")
UA = "Mozilla/5.0 (compatible; hakelim-tamlul/1.0; +https://hakelim.com/kelim/tamlul/)"


def http_get(url, timeout=60, to_file=None, limit=400_000_000):
    last = None
    for i in range(3):
        try:
            r = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(r, timeout=timeout) as resp:
                if not to_file:
                    return resp.read(8_000_000)
                n = 0
                with open(to_file, "wb") as f:
                    while True:
                        b = resp.read(1 << 20)
                        if not b:
                            return n
                        n += len(b)
                        if n > limit:
                            raise Fail("קובץ השמע של השיעור גדול מדי.")
                        f.write(b)
        except Fail:
            raise
        except (urllib.error.URLError, OSError) as x:
            last = x
            time.sleep(3 + 3 * i)
    raise last


def iso_dur(s):
    m = re.fullmatch(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?", s or "")
    return (int(m.group(1) or 0) * 3600 + int(m.group(2) or 0) * 60 + float(m.group(3) or 0)) if m else 0.0


def lesson_meta(url):
    """דף שיעור באתר הכולל -> פרטים + כתובת ה-MP3 (מתוך ה-JSON-LD של הדף)."""
    try:
        page = http_get(url).decode("utf-8", "replace")
    except Exception:  # noqa: BLE001
        raise Fail("לא הצלחתי לפתוח את דף השיעור באתר נחלת אבות. כדאי לבדוק את הקישור.")
    m = NA_AUDIO.search(page)
    if not m:
        raise Fail("בדף השיעור הזה לא מצאתי קובץ שמע (MP3).")
    vid, crumbs = {}, []
    for raw in re.findall(r'<script type="application/ld\+json">(.*?)</script>', page, re.S):
        try:
            j = json.loads(raw)
        except ValueError:
            continue
        if j.get("@type") == "VideoObject":
            vid = j
        elif j.get("@type") == "BreadcrumbList":
            crumbs = [x.get("name", "") for x in j.get("itemListElement", [])]
    og = re.search(r'<meta property="og:title" content="([^"]*)"', page)
    og = html.unescape(og.group(1)) if og else ""
    title = (vid.get("name") or og.split("|")[0]).strip()
    rabbi = og.split("|")[1].strip() if "|" in og else ""
    d = (vid.get("uploadDate") or "")[:10]
    dur = iso_dur(vid.get("duration"))
    if dur > MAX_SEC:
        raise Fail("השיעור ארוך מ-4 שעות.")
    series = " · ".join(c for c in crumbs[:-1] if c)
    return {"id": "na-" + url.rstrip("/").rsplit("/", 1)[-1], "title": title, "channel": rabbi, "series": series, "dur": dur,
            "date": f"{d[8:10]}.{d[5:7]}.{d[0:4]}" if len(d) == 10 else "", "chapters": [], "audio": m.group(0),
            "by": "כולל נחלת אבות – המכון הגבוה לרבנות קהילתית", "watch": url.rstrip("/")}


# ---------- חיתוך בשקטים ----------
def silences(src):
    p = run(["ffmpeg", "-hide_banner", "-nostats", "-i", src, "-vn", "-af", "silencedetect=noise=-35dB:d=0.4", "-f", "null", "-"])
    quiet, start = [], None
    for line in (p.stderr or "").splitlines():
        m = re.search(r"silence_start: ([\d.]+)", line)
        if m:
            start = float(m.group(1))
        m = re.search(r"silence_end: ([\d.]+)", line)
        if m and start is not None:
            quiet.append((start, float(m.group(1))))
            start = None
    total = 0.0
    for m in re.finditer(r"time=(\d+):(\d+):([\d.]+)", p.stderr or ""):
        total = int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))
    return quiet, total


def cut_points(quiet, total):
    cuts, last = [], 0.0
    while total - last > PIECE * 1.35:
        lo, hi = last + PIECE * 0.75, last + PIECE * 1.25
        cand = [(e - s, (s + e) / 2) for s, e in quiet if lo <= (s + e) / 2 <= hi]
        t = max(cand)[1] if cand else last + PIECE
        cuts.append(round(t, 2))
        last = t
    return cuts


def split_audio(src, tmp):
    quiet, total = silences(src)
    if total < 1:
        raise Fail("בסרטון הזה לא נמצא שמע.")
    cuts = cut_points(quiet, total)
    args = ["ffmpeg", "-v", "error", "-y", "-i", src, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "libopus",
            "-b:a", f"{KBPS}k", "-application", "voip"]
    if cuts:
        args += ["-f", "segment", "-segment_times", ",".join(f"{c:.2f}" for c in cuts), "-reset_timestamps", "1",
                 os.path.join(tmp, "p%03d.ogg")]
    else:
        args += [os.path.join(tmp, "p000.ogg")]
    p = run(args)
    if p.returncode != 0:
        raise Fail("לא הצלחתי לעבד את השמע של הסרטון.")
    names = sorted(n for n in os.listdir(tmp) if re.fullmatch(r"p\d+\.ogg", n))
    offs = [0.0] + cuts
    return [(offs[i] if i < len(offs) else offs[-1], os.path.join(tmp, n)) for i, n in enumerate(names)], total


# ---------- RunPod ----------
def rp(method, path, body=None, timeout=60, tries=4):
    url = f"https://api.runpod.ai/v2/{os.environ['RUNPOD_ENDPOINT']}/{path}"
    data = json.dumps(body).encode() if body is not None else None
    if data and len(data) > 200_000:
        timeout = max(timeout, 30 + len(data) / 40_000)
    last = None
    for i in range(tries):
        r = urllib.request.Request(url, data=data, method=method, headers={
            "Content-Type": "application/json", "Authorization": "Bearer " + os.environ["RUNPOD_KEY"],
            "User-Agent": "kelim-yutub/1.0"})
        try:
            with urllib.request.urlopen(r, timeout=timeout) as resp:
                return json.load(resp)
        except urllib.error.HTTPError as x:
            if x.code < 500 and x.code != 429:
                raise
            last = x
        except (urllib.error.URLError, OSError) as x:
            last = x
        time.sleep(2 + 3 * i)
    raise last


def flat_segments(output):
    segs = []

    def walk(x):
        if isinstance(x, dict):
            if x.get("type") == "segments":
                segs.extend(x.get("data") or [])
            elif "result" in x:
                walk(x["result"])
            elif "error" in x:
                raise RuntimeError(str(x["error"])[:200])
            elif "start" in x and "text" in x:
                segs.append(x)
        elif isinstance(x, list):
            for y in x:
                walk(y)
    walk(output)
    return segs


def submit(path):
    with open(path, "rb") as f:
        blob = base64.b64encode(f.read()).decode()
    job = rp("POST", "run", {"input": {"engine": "faster-whisper", "model": MODEL, "streaming": False,
                                       "transcribe_args": {"blob": blob, "language": "he"}}})
    if not job.get("id"):
        raise RuntimeError("no job id")
    return job["id"]


def transcribe(pieces, total, progress):
    with ThreadPoolExecutor(max_workers=min(6, len(pieces))) as ex:
        ids = list(ex.map(lambda p: submit(p[1]), pieces))
    jobs = dict(zip(ids, (off for off, _ in pieces)))
    limit = max(420, total * 0.5) + 60 * len(jobs)
    t0, done, last_note = time.time(), {}, 0
    while len(done) < len(jobs) and time.time() - t0 < limit:
        time.sleep(4)
        for jid in jobs:
            if jid in done:
                continue
            try:
                st = rp("GET", f"status/{jid}", tries=2)
            except (urllib.error.URLError, OSError):
                continue
            if st.get("status") in ("COMPLETED", "FAILED", "CANCELLED", "TIMED_OUT"):
                done[jid] = st
        if len(done) != last_note:
            last_note = len(done)
            progress(f"מתמלל: {len(done)} מתוך {len(jobs)} חלקים מוכנים", 35 + int(50 * len(done) / len(jobs)))
    if len(done) < len(jobs):
        for jid in jobs:
            if jid not in done:
                try:
                    rp("POST", f"cancel/{jid}", tries=1)
                except Exception:  # noqa: BLE001
                    pass
        raise Fail("התמלול לקח יותר מדי זמן. אפשר לנסות שוב בעוד כמה דקות.")
    segs = []
    for jid, off in sorted(jobs.items(), key=lambda kv: kv[1]):
        st = done[jid]
        if st.get("status") != "COMPLETED":
            raise Fail("התמלול נכשל באחד החלקים. אפשר לנסות שוב בעוד כמה דקות.")
        for s in flat_segments(st.get("output")):
            t = (s.get("text") or "").strip()
            if t:
                segs.append({"start": float(s.get("start", 0)) + off, "end": float(s.get("end", 0)) + off, "text": t})
    segs.sort(key=lambda s: s["start"])
    return segs


# ---------- פסקאות ----------
def hms(t):
    t = int(t)
    return f"{t // 3600}:{t % 3600 // 60:02d}:{t % 60:02d}" if t >= 3600 else f"{t // 60}:{t % 60:02d}"


def paragraphs(segs, chapters):
    """[{t, text, head?}] - פסקה נסגרת בהפסקה של 2 שניות (אחרי 40 מילים), בסוף משפט אחרי 110 מילים, או ב-170 מילים.
    פרקים של יוטיוב (אם יש) הופכים לכותרות משנה."""
    chapters = sorted(chapters or [], key=lambda c: c["t"])
    out, cur, words, ci, pending = [], None, 0, 0, None
    if chapters and chapters[0]["t"] <= 1:
        pending, ci = chapters[0]["title"], 1

    def close():
        nonlocal cur, words
        if cur and cur["text"].strip():
            cur["text"] = re.sub(r"\s+", " ", cur["text"]).strip()
            out.append(cur)
        cur, words = None, 0

    prev_end = 0.0
    for s in segs:
        if ci < len(chapters) and s["start"] >= chapters[ci]["t"] - 0.5:
            close()
            pending, ci = chapters[ci]["title"], ci + 1
        gap = s["start"] - prev_end
        if cur and gap >= 2.0 and words >= 40:
            close()
        if cur is None:
            cur = {"t": s["start"], "text": ""}
            if pending:
                cur["head"], pending = pending, None
        cur["text"] += " " + s["text"]
        words += len(s["text"].split())
        prev_end = s["end"]
        if words >= 170 or (words >= 110 and re.search(r"[.?!]['\"״”]?$", s["text"])):
            close()
    close()
    return out


# ---------- מסמכים ----------
def credit_for(meta):
    """שיעור מאתר הכולל -> קרדיט לכלי התמלול הכללי; יוטיוב -> לכלי "תמלול מיוטיוב"."""
    if str(meta.get("id", "")).startswith("na-"):
        return CREDIT.replace('בכלי "תמלול מיוטיוב"', "בכלי התמלול"), "https://hakelim.com/kelim/tamlul/"
    return CREDIT, SITE


def doc_html(meta, paras, by, times, url, summary=None, edited=False):
    e = html.escape
    box = ""
    if summary:
        box = "<div class='sum'><h3>תקציר השיעור</h3><p>" + e(summary["summary"]) + "</p>"
        if summary.get("points"):
            box += "<ul>" + "".join("<li>" + e(x) + "</li>" for x in summary["points"]) + "</ul>"
        if summary.get("sources"):
            box += "<h3>מקורות שהוזכרו בשיעור</h3><ul>" + "".join("<li>" + e(x) + "</li>" for x in summary["sources"]) + "</ul>"
        box += "</div>"
    credit, site = credit_for(meta)
    font = ""
    if os.path.isfile(FONT):
        with open(FONT, "rb") as f:
            font = ("@font-face{font-family:'Frank';src:url(data:font/woff;base64," + base64.b64encode(f.read()).decode()
                    + ") format('woff');font-weight:300 900}")
    sub = " · ".join(x for x in [meta.get("channel"), meta.get("series"), meta.get("date"), ("אורך השיעור " + hms(meta["dur"])) if meta.get("dur") else ""] if x)
    body = []
    for p in paras:
        if p.get("head"):
            body.append(f"<h2>{e(p['head'])}</h2>")
        t = f"<span class='t'>{hms(p['t'])}</span>" if times else ""
        body.append(f"<p>{t}{e(p['text'])}</p>")
    return f"""<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>{e(meta['title'])}</title><style>
{font}
@page{{size:A4;margin:22mm 20mm 20mm 20mm}}
body{{font-family:'Frank','Frank Ruhl Libre','David Libre',David,'Times New Roman',serif;font-size:13pt;line-height:1.75;color:#1b1b1b;margin:0}}
.by{{text-align:center;font-size:12pt;font-weight:700;color:#8a6a1c;letter-spacing:.02em;margin:0 0 6pt}}
h1{{text-align:center;font-size:23pt;line-height:1.3;margin:0 0 6pt;color:#1c2f4a;font-weight:800}}
.sub{{text-align:center;color:#666;font-size:10.5pt;margin:0 0 10pt}}
.rule{{border:0;border-top:1.2pt solid #b8943c;width:38%;margin:0 auto 16pt}}
h2{{font-size:15pt;color:#1c2f4a;margin:18pt 0 6pt;padding-bottom:3pt;border-bottom:.6pt solid #d9cfae;break-after:avoid}}
p{{margin:0 0 9pt;text-align:justify;orphans:2;widows:2}}
.t{{font-family:Arial,sans-serif;font-size:8pt;color:#999;margin-inline-end:6pt;direction:ltr;unicode-bidi:isolate}}
.end{{margin-top:22pt;padding-top:10pt;border-top:.8pt solid #b8943c;font-size:10pt;color:#555;line-height:1.6;break-inside:avoid}}
.end p{{margin:0 0 4pt;text-align:right}}
.end a{{color:#1c2f4a}}
.end .cr{{font-size:11pt;color:#1c2f4a;font-weight:700;margin-top:6pt}}
.ltr{{direction:ltr;unicode-bidi:isolate}}
.sum{{background:#faf6ea;border:.8pt solid #d9cfae;border-radius:6pt;padding:10pt 14pt 6pt;margin:0 0 16pt;font-size:12pt;line-height:1.6}}
.sum h3{{font-size:13pt;color:#1c2f4a;margin:0 0 4pt}}
.sum ul+h3{{margin-top:8pt}}
.sum p{{margin:0 0 6pt;text-align:right}}
.sum ul{{margin:0 0 4pt;padding-inline-start:16pt}}
.sum li{{margin:0 0 3pt}}
</style></head><body>
{f'<p class="by">{e(by)}</p>' if by else ''}
<h1>{e(meta['title'])}</h1>
{f'<p class="sub">{e(sub)}</p>' if sub else ''}
<hr class="rule">
{box}
{''.join(body)}
<div class="end">
<p>{e(NOTE_EDITED if edited else NOTE)}</p>
<p>לצפייה בשיעור המקורי: <a class="ltr" href="{e(url)}">{e(url)}</a></p>
<p class="cr">{e(credit)} <a class="ltr" href="{site}">{site.split('//')[1].rstrip('/')}</a></p>
</div></body></html>"""


def find_chrome():
    c = os.environ.get("CHROME")
    if c and os.path.isfile(c):
        return c
    for n in ("google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "chrome"):
        w = shutil.which(n)
        if w:
            return w
    for p in (r"C:\Program Files\Google\Chrome\Application\chrome.exe", r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"):
        if os.path.isfile(p):
            return p
    raise RuntimeError("no chrome")


def build_pdf(html_text, tmp):
    src, out = os.path.join(tmp, "doc.html"), os.path.join(tmp, "doc.pdf")
    with open(src, "w", encoding="utf-8") as f:
        f.write(html_text)
    prof = os.path.join(tmp, "chrome-prof")
    run([find_chrome(), "--headless=new", "--no-sandbox", "--disable-gpu", "--user-data-dir=" + prof, "--no-pdf-header-footer",
         "--print-to-pdf=" + out, "file:///" + src.replace("\\", "/").lstrip("/")], timeout=240)
    if not os.path.isfile(out) or os.path.getsize(out) < 1500:
        raise RuntimeError("pdf not built")
    with open(out, "rb") as f:
        return f.read()


HEB = re.compile(r"[\u0590-\u05FF]")


def build_docx(meta, paras, by, times, url, tmp, summary=None, edited=False):
    from docx import Document
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.oxml.ns import qn
    from docx.shared import Cm, Pt, RGBColor

    doc = Document()
    sec = doc.sections[0]
    sec.page_width, sec.page_height = Cm(21), Cm(29.7)
    sec.left_margin = sec.right_margin = Cm(2.2)
    sec.top_margin = sec.bottom_margin = Cm(2.2)
    sect = sec._sectPr
    sect.append(sect.makeelement(qn("w:bidi"), {}))
    doc.core_properties.title = meta["title"]
    doc.core_properties.author = by or meta.get("channel") or ""

    def para(text, size=13, bold=False, color=None, align=None, after=8, before=0, line=1.5, font="David"):
        p = doc.add_paragraph()
        pPr = p._p.get_or_add_pPr()
        pPr.append(pPr.makeelement(qn("w:bidi"), {}))
        if align is not None:
            p.alignment = align
        pf = p.paragraph_format
        pf.space_after, pf.space_before, pf.line_spacing = Pt(after), Pt(before), line
        # ריצות נפרדות לעברית וללועזית/מספרים, כדי שמספרים וכתובות לא יתהפכו
        for chunk in re.findall(r"[^A-Za-z0-9]+|[A-Za-z0-9][A-Za-z0-9:/.\-_?=&%@]*", text):
            r = p.add_run(chunk)
            rPr = r._r.get_or_add_rPr()
            rPr.append(rPr.makeelement(qn("w:rFonts"), {qn("w:ascii"): font, qn("w:hAnsi"): font, qn("w:cs"): font}))
            r.font.size = Pt(size)
            rPr.append(rPr.makeelement(qn("w:szCs"), {qn("w:val"): str(int(size * 2))}))
            if bold:
                r.font.bold = True
                rPr.append(rPr.makeelement(qn("w:bCs"), {}))
            if color:
                r.font.color.rgb = RGBColor(*color)
            if HEB.search(chunk) or not re.search(r"[A-Za-z0-9]", chunk):
                rPr.append(rPr.makeelement(qn("w:rtl"), {}))
        return p

    C = WD_ALIGN_PARAGRAPH.CENTER
    if by:
        para(by, 12, True, (0x8A, 0x6A, 0x1C), C, after=4)
    para(meta["title"], 22, True, (0x1C, 0x2F, 0x4A), C, after=4, line=1.2)
    sub = " · ".join(x for x in [meta.get("channel"), meta.get("series"), meta.get("date"), ("אורך השיעור " + hms(meta["dur"])) if meta.get("dur") else ""] if x)
    if sub:
        para(sub, 10.5, False, (0x66, 0x66, 0x66), C, after=16)
    if summary:
        para("תקציר השיעור", 14, True, (0x1C, 0x2F, 0x4A), None, after=3, line=1.2)
        para(summary["summary"], 12, False, None, None, after=5, line=1.4)
        for x in summary.get("points") or []:
            para("• " + x, 12, False, None, None, after=2, line=1.4)
        if summary.get("sources"):
            para("מקורות שהוזכרו בשיעור", 14, True, (0x1C, 0x2F, 0x4A), None, after=3, before=8, line=1.2)
            for x in summary["sources"]:
                para("• " + x, 12, False, None, None, after=2, line=1.4)
        para(" ", 6, after=8)
    for p in paras:
        if p.get("head"):
            para(p["head"], 15, True, (0x1C, 0x2F, 0x4A), None, after=4, before=12, line=1.2)
        para((f"[{hms(p['t'])}] " if times else "") + p["text"], 13, False, None, WD_ALIGN_PARAGRAPH.JUSTIFY, after=8)
    para(NOTE_EDITED if edited else NOTE, 10, False, (0x55, 0x55, 0x55), None, after=3, before=18, line=1.3)
    para("לצפייה בשיעור המקורי: " + url, 10, False, (0x55, 0x55, 0x55), None, after=3, line=1.3)
    credit, site = credit_for(meta)
    para(credit + " " + site, 11, True, (0x1C, 0x2F, 0x4A), None, after=0, before=4, line=1.3)
    out = os.path.join(tmp, "doc.docx")
    doc.save(out)
    with open(out, "rb") as f:
        return f.read()


# ---------- משימה אחת ----------
def process(url, by="", times=False, progress=lambda m, pct: None):
    tmp = tempfile.mkdtemp(prefix="yutub_")
    try:
        if NA_RE.match(url):
            progress("קורא את פרטי השיעור מאתר נחלת אבות", 5)
            meta = lesson_meta(url)
            watch, by = meta["watch"], by or meta["by"]
            progress("מוריד את השמע של השיעור", 12)
            audio = os.path.join(tmp, "a.mp3")
            http_get(meta["audio"], timeout=120, to_file=audio)
        else:
            progress("קורא את פרטי השיעור מיוטיוב", 5)
            meta = video_meta(url)
            watch = "https://www.youtube.com/watch?v=" + meta["id"] if meta["id"] else url
            progress("מוריד את השמע של השיעור", 12)
            audio = download_audio(url, tmp)
        progress("מכין את השמע לתמלול", 28)
        pieces, total = split_audio(audio, tmp)
        if not meta["dur"]:
            meta["dur"] = total
        if total > MAX_SEC:
            raise Fail("הסרטון ארוך מ-4 שעות. אפשר לחלק אותו ולתמלל חלק-חלק בכלי התמלול הרגיל.")
        progress(f"מתמלל: {len(pieces)} חלקים נשלחו", 35)
        segs = transcribe(pieces, total, progress)
        segs, _ = clean_transcript.clean_segments(segs, total)
        if not segs:
            raise Fail("לא נמצא דיבור בסרטון הזה.")
        progress("מסדר את השיעור לקובץ", 88)
        paras = paragraphs(segs, meta["chapters"])
        try:
            paras, summary, n_edit = polish.polish(paras, meta["title"], progress)
        except Exception as ex:                                  # עריכה שנכשלה לא מפילה את התמלול
            say("polish failed: " + type(ex).__name__)
            summary, n_edit = None, 0
        edited = n_edit > 0
        progress("מסדר את השיעור לקובץ", 95)
        text = "\n\n".join((("## " + p["head"] + "\n\n") if p.get("head") else "") + p["text"] for p in paras)
        if summary:
            top = "## תקציר השיעור\n\n" + summary["summary"] + "".join("\n• " + x for x in summary.get("points") or [])
            if summary.get("sources"):
                top += "\n\n## מקורות שהוזכרו בשיעור\n" + "".join("\n• " + x for x in summary["sources"])
            text = top + "\n\n" + text
        pdf = build_pdf(doc_html(meta, paras, by, times, watch, summary, edited), tmp)
        docx = build_docx(meta, paras, by, times, watch, tmp, summary, edited)
        return {"title": meta["title"], "channel": meta["channel"], "date": meta["date"], "dur": round(meta["dur"]),
                "vid": meta["id"], "words": len(text.split()), "text": text, "pdf": pdf, "docx": docx}
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


# ---------- ה-Worker ----------
def hub(method, path, body=None, timeout=90):
    data = json.dumps(body).encode() if body is not None else None
    last = None
    for i in range(4):
        r = urllib.request.Request(os.environ["YUTUB_WORKER"].rstrip("/") + path, data=data, method=method, headers={
            "Content-Type": "application/json", "X-Runner-Key": os.environ["YUTUB_RUNNER_KEY"], "User-Agent": "kelim-yutub-runner/1.0"})
        try:
            with urllib.request.urlopen(r, timeout=timeout) as resp:
                return json.load(resp)
        except urllib.error.HTTPError as x:
            if x.code < 500 and x.code != 429:
                raise
            last = x
        except (urllib.error.URLError, OSError) as x:
            last = x
        time.sleep(3 + 4 * i)
    raise last


def loop(max_minutes=45):
    t0, n = time.time(), 0
    while time.time() - t0 < max_minutes * 60:
        job = hub("POST", "/r/next", {}).get("job")
        if not job:
            break
        n += 1
        jid = job["id"]
        say(f"job {jid} start")

        def progress(msg, pct, jid=jid):
            try:
                hub("POST", "/r/progress", {"id": jid, "msg": msg, "pct": pct}, timeout=20)
            except Exception:  # noqa: BLE001
                pass
        try:
            res = process(job["url"], job.get("by") or "", bool(job.get("times")), progress)
            res["pdf"] = base64.b64encode(res["pdf"]).decode()
            res["docx"] = base64.b64encode(res["docx"]).decode()
            res["id"] = jid
            hub("POST", "/r/done", res, timeout=180)
            say(f"job {jid} done {res['dur']}s {res['words']}w")
        except Fail as x:
            hub("POST", "/r/fail", {"id": jid, "msg": str(x)})
            say(f"job {jid} failed (user message)")
        except Exception as x:  # noqa: BLE001
            hub("POST", "/r/fail", {"id": jid, "msg": "משהו השתבש בעיבוד השיעור. אפשר לנסות שוב בעוד כמה דקות.", "tech": type(x).__name__ + ": " + str(x)[:300]})
            say(f"job {jid} crashed: {type(x).__name__}")
    say(f"loop end, {n} jobs")


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("loop")
    lo = sub.add_parser("local")
    lo.add_argument("url")
    lo.add_argument("--out", required=True)
    lo.add_argument("--by", default="")
    lo.add_argument("--times", action="store_true")
    a = ap.parse_args()
    if a.cmd == "loop":
        loop()
        return
    res = process(a.url, a.by, a.times, lambda m, pct: say(f"{pct}% {m}"))
    os.makedirs(a.out, exist_ok=True)
    name = re.sub(r'[\\/:*?"<>|]+', " ", res["title"]).strip()[:90] or "shiur"
    for ext in ("pdf", "docx"):
        with open(os.path.join(a.out, f"{name}.{ext}"), "wb") as f:
            f.write(res[ext])
    with open(os.path.join(a.out, f"{name}.txt"), "w", encoding="utf-8") as f:
        f.write(res["text"])
    say(f"DONE {res['dur']}s {res['words']} words -> {a.out}")


if __name__ == "__main__":
    main()
