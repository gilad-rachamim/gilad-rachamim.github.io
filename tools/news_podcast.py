#!/usr/bin/env python3
"""פודקאסט "החדשות ב-3 דקות": מהדורה אחת ביום -> mp3 בקול עברי חינמי (edge-tts) -> Release בשם podcast
(האחסון מחוץ לריפו) + podcast.xml בדף החדשות. רץ מ-.github/workflows/news-podcast.yml."""
import asyncio, datetime, email.utils, json, os, pathlib, subprocess, sys, urllib.request
from xml.sax.saxutils import escape

ROOT = pathlib.Path(__file__).resolve().parent.parent
API = "https://kelim-news.gilad4049.workers.dev/latest?from=web"
SITE = "https://hakelim.com"
NEWS_URL = "/kelim/machshev/chadashot/"
FEED = ROOT / "kelim" / "machshev" / "chadashot" / "podcast.xml"
DATA = ROOT / "tools" / "data" / "chadashot-podcast.json"
REPO = os.environ.get("GITHUB_REPOSITORY", "gilad-rachamim/gilad-rachamim.github.io")
VOICE = "he-IL-AvriNeural"
KEEP = 60
SECS = [("main", "החדשות המרכזיות"), ("haredi", "בציבור החרדי"), ("economy", "כלכלה")]


def fetch():
    with urllib.request.urlopen(urllib.request.Request(API, headers={"User-Agent": "kelim-podcast"}), timeout=30) as r:
        return json.load(r)


def script(ed):
    parts = [f"החדשות ב-3 דקות. מהדורת {ed['name']}, יום {ed['date']['day']}, {ed['date']['he']}, שעה {ed['time']}."]
    for k, name in SECS:
        pts = ed["sections"].get(k) or []
        if not pts:
            continue
        parts.append(name + ".")
        parts += [f"{i + 1}. {p['text']}" for i, p in enumerate(pts)]
    parts.append("לכל הנקודות והמקורות, באתר הכלים של גילעד רחמים, בכתובת hakelim.com. מיזם חסד, בחינם. להתראות במהדורה הבאה.")
    return "\n".join(parts)


async def tts(text, out):
    import edge_tts
    await edge_tts.Communicate(text, VOICE, rate="-3%").save(str(out))


def sh(*a, check=True):
    return subprocess.run(a, check=check, capture_output=True, text=True)


def main():
    ed = fetch()
    if ed.get("empty") or not ed.get("sections") or not (ed["sections"].get("main")):
        print("אין מהדורה")
        return 0
    at = ed["at"]
    day = at[:10]
    eid = f"{day}-{ed['time'].replace(':', '')}"
    eps = json.loads(DATA.read_text(encoding="utf-8")) if DATA.exists() else []
    if any(e["id"] == eid for e in eps):
        print("הפרק כבר קיים")
        return 0
    mp3 = pathlib.Path(f"{eid}.mp3")
    asyncio.run(tts(script(ed), mp3))
    size = mp3.stat().st_size
    if sh("gh", "release", "view", "podcast", "--repo", REPO, check=False).returncode != 0:
        sh("gh", "release", "create", "podcast", "--repo", REPO, "--title", "פודקאסט החדשות ב-3 דקות",
           "--notes", "קבצי האודיו של הפודקאסט. הפיד: " + SITE + NEWS_URL + "podcast.xml")
    sh("gh", "release", "upload", "podcast", str(mp3), "--repo", REPO, "--clobber")
    desc = " ".join(p["text"] for p in ed["sections"]["main"][:5])
    eps.insert(0, {"id": eid, "title": f"{ed['name']} – {ed['date']['day']}, {ed['date']['he']}", "at": at, "bytes": size,
                   "secs": round(size * 8 / 48000), "desc": desc})
    eps = eps[:KEEP]
    DATA.parent.mkdir(parents=True, exist_ok=True)
    DATA.write_text(json.dumps(eps, ensure_ascii=False, indent=1) + "\n", encoding="utf-8", newline="\n")
    items = ""
    for e in eps:
        dt = datetime.datetime.fromisoformat(e["at"].replace("Z", "+00:00"))
        url = f"https://github.com/{REPO}/releases/download/podcast/{e['id']}.mp3"
        items += (f"<item><title>{escape(e['title'])}</title><link>{SITE}{NEWS_URL}</link>"
                  f'<guid isPermaLink="false">kelim-podcast-{e["id"]}</guid><pubDate>{email.utils.format_datetime(dt)}</pubDate>'
                  f"<description>{escape(e['desc'])}</description>"
                  f'<enclosure url="{url}" length="{e["bytes"]}" type="audio/mpeg"/>'
                  f"<itunes:duration>{e['secs']}</itunes:duration><itunes:explicit>false</itunes:explicit></item>")
    nl = chr(10)
    xml = ('<?xml version="1.0" encoding="UTF-8"?>' + nl +
           '<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:atom="http://www.w3.org/2005/Atom"><channel>'
           "<title>החדשות ב-3 דקות</title>"
           f'<link>{SITE}{NEWS_URL}</link><atom:link href="{SITE}{NEWS_URL}podcast.xml" rel="self" type="application/rss+xml"/>'
           "<description>סיכום חדשות רגוע לשמיעה, כמה דקות ביום, בנקודות קצרות. מיזם חסד, בלי כוונת רווח.</description>"
           "<language>he</language><itunes:author>גילעד רחמים</itunes:author><itunes:explicit>false</itunes:explicit>"
           '<itunes:category text="News"/>'
           f'<itunes:image href="{SITE}/assets/podcast-cover.png"/>'
           "<itunes:owner><itunes:name>גילעד רחמים</itunes:name></itunes:owner>" + items + "</channel></rss>" + nl)
    FEED.write_text(xml, encoding="utf-8", newline="\n")
    mp3.unlink()
    print("פרק חדש:", eid, size)
    return 0


if __name__ == "__main__":
    sys.exit(main())
