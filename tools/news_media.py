#!/usr/bin/env python3
"""החדשות ב-3 דקות: שמע (MP3) וסרטון (MP4) לכל מהדורה, וסרטון קצר "ויראלי".

  python tools/news_media.py full  OUTDIR [--edition ערב] [--fresh]   -> OUTDIR/edition.mp3 + edition.mp4 + edition.txt
  python tools/news_media.py short OUTDIR [--voice edge|gemini] [--edition ערב] [--fresh] -> OUTDIR/short-<voice>.mp4 + .txt

הקול החינמי: edge-tts (he-IL-AvriNeural). Gemini Fenrir רק לסרטון הקצר ורק מקומית (voice.py של הכלים).
אין תמונות או וידאו של אירועים אמיתיים: רק כרטיסי טקסט מעוצבים (זהב על שחור), תנועה, זומים וכתוביות.
"""
import asyncio, datetime, html, json, os, pathlib, re, subprocess, sys, tempfile, urllib.request, wave

API = "https://kelim-news.gilad4049.workers.dev/history"
SITE = "https://hakelim.com/kelim/machshev/chadashot/"
VOICE = "he-IL-AvriNeural"
SECS = [("main", "החדשות המרכזיות"), ("haredi", "בציבור החרדי"), ("economy", "כלכלה")]
GAP = 0.35  # שניות שקט בין קטעים

# החלפות הגייה של הקריין החינמי (מילה שמשתבשת בתמלול – מוסיפים כאן)
FIX = ()


_N = "אפס אחד שניים שלוש ארבע חמש שש שבע שמונה תשע".split()


def spoken(t):
    for a, b in FIX:
        t = t.replace(a, b)
    t = re.sub(r"\b(\d)\.25%", lambda m: _N[int(m.group(1))] + " ורבע אחוז", t)
    t = re.sub(r"\b(\d)\.5%", lambda m: _N[int(m.group(1))] + " וחצי אחוז", t)
    return re.sub(r"\s+", " ", t).strip()


def sh(*a, **k):
    return subprocess.run([str(x) for x in a], check=True, capture_output=True, text=True, **k)


def dur_of(p):
    return float(sh("ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p).stdout.strip())


# ---------------------------------------------------------------- מהדורה
def get_edition(want=None, fresh=False):
    req = urllib.request.Request(API, headers={"User-Agent": "kelim-media"})
    for e in json.load(urllib.request.urlopen(req, timeout=30)):
        if not want or e.get("name") == want:
            if not e.get("sections") or not e["sections"].get("main"):
                continue
            age = datetime.datetime.now(datetime.timezone.utc) - datetime.datetime.fromisoformat(e["at"].replace("Z", "+00:00"))
            if fresh and age > datetime.timedelta(hours=3):
                print("stale edition", e["at"]); sys.exit(3)
            return e
    sys.exit("no edition")


def full_segments(ed):
    day, heb = ed["date"]["day"], ed["date"]["he"]
    segs = [dict(kind="title", say=f"החדשות ב-3 דקות. מהדורת {ed['name']}, יום {day}, {heb}, שעה {ed['time']}.",
                 show="", ed=ed)]
    for k, name in SECS:
        pts = ed["sections"].get(k) or []
        if not pts:
            continue
        segs.append(dict(kind="head", say=name + ".", show=name, label=name))
        for i, p in enumerate(pts):
            segs.append(dict(kind="point", say=f"{i + 1}. {p['text']}", show=p["text"], label=name, n=i + 1, of=len(pts)))
    segs.append(dict(kind="end", say="לכל הנקודות והמקורות, באתר הכלים של גילעד רחמים. מיזם חסד, בחינם. להתראות במהדורה הבאה.",
                     show="לכל הנקודות והמקורות"))
    return segs


def short_segments(ed):
    pts = [p["text"] for p in ed["sections"]["main"][:4]]
    segs = []
    for i, t in enumerate(pts):
        segs.append(dict(kind="hook" if i == 0 else "point", say=t, show=t, n=i + 1, of=len(pts)))
    segs.append(dict(kind="end", say="כל החדשות ב-3 דקות, שלוש פעמים ביום. הקישור בפרופיל.", show="כל החדשות ב-3 דקות"))
    return segs


# ---------------------------------------------------------------- קול
async def _edge(text, out, rate):
    import edge_tts
    words = []
    c = edge_tts.Communicate(spoken(text), VOICE, rate=rate, boundary="WordBoundary")
    with open(out, "wb") as f:
        async for ch in c.stream():
            if ch["type"] == "audio":
                f.write(ch["data"])
            elif ch["type"] == "WordBoundary":
                words.append((ch["offset"] / 1e7, (ch["offset"] + ch["duration"]) / 1e7))
    return words


def synth(segs, tmp, engine="edge", rate="+8%"):
    """לכל קטע: קובץ wav אחיד, משך, וזמני מילים יחסיים לתחילת הקטע."""
    gem = None
    if engine == "gemini":
        sys.path.insert(0, os.path.expanduser("~/.claude/state/kelim-social/video"))
        import importlib.util
        spec = importlib.util.spec_from_file_location("voice_v2", os.path.expanduser("~/.claude/state/kelim-social/video/voice.v2.py"))
        gem = importlib.util.module_from_spec(spec); spec.loader.exec_module(gem)
    for i, s in enumerate(segs):
        wav = os.path.join(tmp, f"seg{i}.wav")
        if gem:
            src, _ = gem.tts(spoken(s["say"]))
            words = None
        else:
            mp3 = os.path.join(tmp, f"seg{i}.mp3")
            words = asyncio.run(_edge(s["say"], mp3, rate))
            src = mp3
        # שקט קל בסוף הקטע (GAP) כדי שיהיה מרווח טבעי
        sh("ffmpeg", "-y", "-loglevel", "error", "-i", src, "-af", f"aresample=44100,apad=pad_dur={GAP}", "-ac", "1", "-c:a", "pcm_s16le", wav)
        s["wav"], s["dur"] = wav, dur_of(wav)
        s["voice_dur"] = s["dur"] - GAP
        s["wt"] = words
    return segs


def word_times(s):
    """זמני התחלה לכל מילה מוצגת (לפי רשימת המילים ב-s['show']), יחסית לתחילת הקטע."""
    shown = s["show"].split()
    if not shown:
        return [], []
    wt = s.get("wt")
    if wt:  # edge: מיפוי לפי סדר; אם המספרים שונים – יחסית
        n = len(wt)
        idx = [min(n - 1, round(i * n / len(shown))) for i in range(len(shown))] if n != len(shown) else list(range(n))
        starts = [wt[j][0] for j in idx]
    else:  # gemini: חלוקה לפי אורך המילה
        total = sum(len(w) + 2 for w in shown); acc = 0; starts = []
        lead = 0.12
        for w in shown:
            starts.append(lead + (s["voice_dur"] - lead) * acc / total); acc += len(w) + 2
    starts = [min(t, s["voice_dur"] - 0.05) for t in starts]
    return shown, starts


def mix_audio(segs, out_wav):
    lst = os.path.join(os.path.dirname(out_wav), "audio.txt")
    open(lst, "w").write("".join(f"file '{pathlib.Path(s['wav']).as_posix()}'\n" for s in segs))
    sh("ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c:a", "pcm_s16le", out_wav)


def make_mp3(wav, out, ed):
    title = f"החדשות ב-3 דקות – מהדורת {ed['name']}, {ed['date']['day']}, {ed['date']['he']}"
    sh("ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-ac", "1", "-ar", "24000", "-c:a", "libmp3lame", "-b:a", "48k",
       "-id3v2_version", "3", "-metadata", f"title={title}", "-metadata", "artist=החדשות ב-3 דקות",
       "-metadata", "album=החדשות ב-3 דקות", "-metadata", f"date={ed['at'][:4]}", "-metadata", "genre=News",
       "-metadata", "comment=https://hakelim.com/kelim/machshev/chadashot/", out)


# ---------------------------------------------------------------- כרטיסים
CSS = """
@import url('https://fonts.googleapis.com/css2?family=Heebo:wght@500;700;900&family=Frank+Ruhl+Libre:wght@900&display=block');
*{margin:0;box-sizing:border-box} html,body{width:1080px;height:1920px;overflow:hidden}
body{background:radial-gradient(circle at 50% 28%,#1c1a12,#070604 72%);color:#f4eedd;direction:rtl;
 font-family:Heebo,Arial,sans-serif;position:relative}
.frame{position:absolute;inset:48px;border:3px solid #c9a447;border-radius:42px;opacity:.55}
.bar{position:absolute;top:0;left:0;height:14px;background:#c9a447;width:0}
.stage{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;
 padding:190px 100px;text-align:center;transform-origin:50% 50%}
.top{position:absolute;top:96px;left:0;right:0;text-align:center;font:700 44px Heebo;color:#c9a447}
.lab{font:700 52px Heebo;color:#c9a447;margin-bottom:34px}
.n{font:900 170px 'Frank Ruhl Libre',serif;color:#c9a447;line-height:1;margin-bottom:34px}
.p{font:700 74px/1.34 Heebo;text-wrap:balance}
.p span{color:#8d866f;transition:none}.p span.d{color:#f4eedd}.p span.c{color:#c9a447;background:rgba(201,164,71,.16);border-radius:12px;padding:0 8px}
.t1{font:900 140px/1.12 'Frank Ruhl Libre',serif;color:#c9a447}
.t2{font:700 76px Heebo;margin-top:46px}.t3{font:500 52px Heebo;color:#cfc6ad;margin-top:30px}
.big{font:900 112px/1.2 Heebo;color:#c9a447;direction:ltr;margin:34px 0}
.free{font:500 50px/1.4 Heebo;color:#cfc6ad;margin-top:40px}
.dots{position:absolute;bottom:150px;display:flex;gap:22px;left:0;right:0;justify-content:center}
.dots i{width:26px;height:26px;border-radius:50%;border:3px solid #c9a447}.dots i.on{background:#c9a447}
/* סרטון קצר: כתוביות קופצות */
.cap{font:900 148px/1.12 Heebo;display:flex;flex-wrap:wrap;gap:0 34px;justify-content:center;text-wrap:balance}
.cap span{color:#f4eedd;text-shadow:0 6px 0 #000}.cap span.c{color:#c9a447;display:inline-block;transform:scale(var(--pop,1))}
.sub{position:absolute;bottom:250px;left:110px;right:110px;font:500 46px/1.45 Heebo;color:#8d866f;text-align:center}
.sub span.d{color:#cfc6ad}.sub span.c{color:#f4eedd}
.chip{position:absolute;top:170px;left:0;right:0;text-align:center;font:900 60px Heebo;color:#1a1405}
.chip b{background:#c9a447;border-radius:99px;padding:6px 36px}
.hookl{font:900 64px Heebo;color:#c9a447;margin-bottom:40px;letter-spacing:2px}
"""


def card_html(s, ed, state, style, T, total):
    """state = (אינדקס מילה מודגשת או -1, התקדמות בקטע 0..1, שלב קפיצה)"""
    e = html.escape
    wi, prog, pop = state
    shown = s["show"].split()
    pct = 100 * T / total
    bar = f"<div class=bar style='width:{pct:.1f}%'></div>"
    zoom = 1 + 0.05 * prog if style == "short" else 1
    top = f"<div class=top>החדשות ב-3 דקות · מהדורת {e(ed['name'])}</div>"
    body = ""
    k = s["kind"]
    if k == "title":
        body = (f"<div class=t1>החדשות<br>ב-3 דקות</div><div class=t2>מהדורת {e(ed['name'])} · {e(ed['time'])}</div>"
                f"<div class=t3>יום {e(ed['date']['day'])} · {e(ed['date']['he'])}</div>")
        top = ""
    elif k == "head":
        body = f"<div class=t1 style='font-size:120px'>{e(s['show'])}</div>"
    elif k == "end" and style == "full":
        body = ("<div class=t2>הנקודות והמקורות, באתר:</div><div class=big>hakelim.com</div>"
                "<div class=t3>החדשות ב-3 דקות · שלוש פעמים ביום</div><div class=free>בחינם · בלי הרשמה · בלי פרסומות</div>")
    elif k == "end":
        body = ("<div class=t2>כל החדשות ב-3 דקות</div><div class=big>hakelim.com</div>"
                "<div class=t3>הקישור בפרופיל · שלוש פעמים ביום</div><div class=free>בחינם · בלי הרשמה · בלי פרסומות</div>")
    elif style == "full":  # point
        sp = "".join(f"<span class='{'c' if i == wi else ('d' if i < wi else '')}'>{e(w)}</span> " for i, w in enumerate(shown))
        dots = "".join(f"<i class={'on' if j < s['n'] else ''}></i>" for j in range(s["of"]))
        body = f"<div class=lab>{e(s.get('label', ''))}</div><div class=n>{s['n']}</div><div class=p>{sp}</div><div class=dots>{dots}</div>"
    else:  # short: point / hook
        grp = 4
        start = (max(wi, 0) // grp) * grp
        chunk = list(enumerate(shown))[start:start + grp]
        capw = "".join(f"<span class='{'c' if i == wi else ''}' style='{'--pop:%s' % (1.14 if pop else 1) if i == wi else ''}'>{e(w)}</span>" for i, w in chunk)
        sub = "".join(f"<span class='{'c' if i == wi else ('d' if i < wi else '')}'>{e(w)}</span> " for i, w in enumerate(shown))
        chip = f"<div class=chip><b>{s['n']}/{s['of']}</b></div>"
        hook = "<div class=hookl>החדשות הראשיות עכשיו</div>" if k == "hook" else ""
        body = f"{chip}{hook}<div class=cap>{capw}</div><div class=sub>{sub}</div>"
    return (f"<!doctype html><meta charset=utf-8><style>{CSS}</style><div class=frame></div>{bar}{top}"
            f"<div class=stage style='transform:scale({zoom:.4f})'>{body}</div>")


def render_video(segs, ed, audio_wav, out, style):
    total = sum(s["dur"] for s in segs)
    out_w, out_h = (720, 1280) if style == "full" else (1080, 1920)
    scale = out_w / 1080
    tmp = tempfile.mkdtemp(prefix="nm-frames-")
    frames = []  # (png, duration)
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        pg = b.new_page(viewport={"width": 1080, "height": 1920}, device_scale_factor=scale)
        n = 0

        def shot(s, state, T):
            nonlocal n
            pg.set_content(card_html(s, ed, state, style, T, total), wait_until="networkidle")
            pg.evaluate("document.fonts.ready")
            p = os.path.join(tmp, f"f{n:05d}.png"); n += 1
            pg.screenshot(path=p)
            return p
        t0 = 0.0
        for s in segs:
            shown, starts = word_times(s)
            ev = []  # (זמן יחסי בקטע, state)
            if not shown or s["kind"] in ("title", "head", "end"):
                ev = [(0.0, (-1, 0, False))]
            else:
                ev = [(0.0, (-1, 0, False))] if starts[0] > 0.05 else []
                for i, st in enumerate(starts):
                    if style == "short":
                        ev.append((st, (i, st / s["dur"], True)))
                        ev.append((st + 0.09, (i, (st + .09) / s["dur"], False)))
                    else:
                        ev.append((st, (i, st / s["dur"], False)))
            ev.sort(key=lambda x: x[0])
            for j, (t, state) in enumerate(ev):
                nxt = ev[j + 1][0] if j + 1 < len(ev) else s["dur"]
                if nxt - t <= 0.001:
                    continue
                frames.append((shot(s, state, t0 + t), nxt - t))
            t0 += s["dur"]
        b.close()
    lst = os.path.join(tmp, "frames.txt")
    with open(lst, "w") as f:
        for p, d in frames:
            f.write(f"file '{pathlib.Path(p).as_posix()}'\nduration {d:.4f}\n")
        f.write(f"file '{pathlib.Path(frames[-1][0]).as_posix()}'\n")
    crf, fps, ab = ("30", "24", "64k") if style == "full" else ("26", "30", "128k")
    sh("ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-i", audio_wav,
       "-vf", f"scale={out_w}:{out_h},format=yuv420p,setsar=1", "-r", fps, "-c:v", "libx264", "-preset", "medium", "-crf", crf,
       "-c:a", "aac", "-b:a", ab, "-ac", "1", "-shortest", "-movflags", "+faststart", out)
    return total


def description(ed, kind):
    pts = [s["text"] for s in ed["sections"]["main"][:5]]
    head = f"החדשות ב-3 דקות · סיכום {ed['name']}"
    return "\n".join([head, ""] + [f"{i + 1}. {p}" for i, p in enumerate(pts)] +
                     ["", f"הסיכום המלא, שלוש פעמים ביום, בחינם: {SITE}?utm_source={kind}", "טלפון כשר: 077-2253345 שלוחה 8"])


def main():
    a = sys.argv[1:]
    if len(a) < 2 or a[0] not in ("full", "short"):
        sys.exit(__doc__)
    mode, outdir = a[0], pathlib.Path(a[1]); outdir.mkdir(parents=True, exist_ok=True)
    opt = lambda k, d=None: (a[a.index(k) + 1] if k in a else d)
    ed = get_edition(opt("--edition"), "--fresh" in a)
    eid = f"{ed['at'][:10]}-{ed['time'].replace(':', '')}"
    (outdir / "id.txt").write_text(eid, encoding="utf-8")
    if opt("--release") and mode == "full":
        have = subprocess.run(["gh", "release", "view", opt("--release"), "--json", "assets", "-q", ".assets[].name"],
                              capture_output=True, text=True).stdout.split()
        if f"{eid}.mp3" in have and f"{eid}.mp4" in have:
            print("כבר קיים", eid); sys.exit(4)
    tmp = tempfile.mkdtemp(prefix="nm-audio-")
    if mode == "full":
        segs = synth(full_segments(ed), tmp, "edge", "+8%")
        wav = os.path.join(tmp, "all.wav"); mix_audio(segs, wav)
        make_mp3(wav, str(outdir / "edition.mp3"), ed)
        secs = render_video(segs, ed, wav, str(outdir / "edition.mp4"), "full")
        (outdir / "edition.txt").write_text(description(ed, "media"), encoding="utf-8")
        print("full", round(secs, 1), "s")
    else:
        eng = opt("--voice", "edge")
        segs = synth(short_segments(ed), tmp, eng, "+12%")
        wav = os.path.join(tmp, "all.wav"); mix_audio(segs, wav)
        out = str(outdir / f"short-{eng}.mp4")
        secs = render_video(segs, ed, wav, out, "short")
        (outdir / f"short-{eng}.mp4.txt").write_text(description(ed, "reel"), encoding="utf-8")
        print("short", eng, round(secs, 1), "s")


if __name__ == "__main__":
    main()
