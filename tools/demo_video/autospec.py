"""מפרט אוטומטי לסרטון הדמיה + פרוספקט, לכל כלי באתר (15.11.2026).

גילעד: "תריץ על כל הכלים באתר את הסרטוני הדמיה והדפי פרוספקט... הכל באהבה ממיזם הכלים של גילעד רחמים מיזם חינמי
כדי להנגיש ... להציע שותפויות או אפילו אם לא כספיות לפחות שיעקבו אחריך או שיעזרו לך לקדם משהו.. לא הכל זה כסף!!"

כל העובדות נלקחות מהדף עצמו (כותרת, "איך משתמשים", שאלות ותשובות, פס החסד הבנוי) – לא ממציאים כלום.
בנוסף מצלם את הכלי האמיתי ברוחב טלפון (שרת מקומי שמגיש את הריפו), והצילום נכנס לסצנת "ככה זה נראה".

  python -I tools/demo_video/autospec.py --base http://127.0.0.1:8799 [--only tool1,tool2] [--limit N]
יוצא: tools/demo_video/specs/auto/<tool>.json ו-tools/demo_video/shots/auto/<tool>.jpg (לא נשמר בגיט).
מפרט שנכתב ביד (tools/demo_video/specs/<tool>.json) תמיד גובר, ולכלי כזה לא נוצר מפרט אוטומטי.
"""
import argparse
import html
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
SRC = ROOT / "src" / "pages"
OUT = HERE / "specs" / "auto"
SHOTS = HERE / "shots" / "auto"  # לא נשמר בגיט (.gitignore); בענן עובר בין השלבים כ-artifact

ICONS = {"bait": "🏠", "esek": "💼", "kesef": "💰", "kodesh": "📜", "limudim": "📚", "nefesh": "🌿",
         "machshev": "💻", "tamlul": "🎙", "shir": "🎵", "briut": "🩺", "avoda": "🧑‍💼", "shikum": "🦾",
         "mishpacha": "👨‍👩‍👧", "chashiva": "🧩", "tochen": "✍️", "eruim": "🎉", "kehila": "🤝", "tichnut": "🧮",
         "cheshbon": "🧾", "tiyulim": "🥾", "miluim": "🎖", "negishut": "♿", "bakasha": "📨", "hitkadmut": "📈",
         "kesharim": "🔗", "shipurim": "🛠", "pratiut": "🔒", "luach": "📅"}
# כלים רגישים: בלי מוזיקה שמחה ובלי שום בקשת כסף, רק "לשתף עם מי שצריך"
SOFT = re.compile(r"^/nefesh/|azkara|avel|shiva|levaya|kadish|kaddish|yahrzeit|nichum|rega|tmicha")
STEP_MAX, FEAT_MAX = 74, 70


def strip(s):
    s = re.sub(r"<br\s*/?>", " ", s or "")
    s = re.sub(r"<[^>]+>", "", s)
    return re.sub(r"\s+", " ", html.unescape(s)).strip()


def sentences(text):
    parts = re.split(r"(?<=[.!?])\s+", strip(text))
    return [p.strip() for p in parts if len(p.strip()) > 3]


def clip(s, n):
    """קיצור לשורה אחת בסרטון: עד n תווים, חיתוך בסימן פיסוק ולא באמצע מילה."""
    s = s.strip().rstrip(".")
    if len(s) <= n:
        return s
    for sep in (":", " – ", ",", " - "):
        i = s.rfind(sep, 0, n)
        if i > n * .45:
            return s[:i].strip()
    i = s.rfind(" ", 0, n - 1)
    return s[:i].strip() + "…"


def parse(page, url, built):
    raw = page.read_text(encoding="utf-8")
    m = re.match(r"\s*<!--meta\s*(\{.*?\})\s*-->\s*", raw, re.S)
    meta = json.loads(m.group(1))
    body = raw[m.end():]
    h1 = strip((re.search(r"<h1[^>]*>(.*?)</h1>", body, re.S) or [None, ""])[1])
    sub = strip((re.search(r'<p class="sub"[^>]*>(.*?)</p>', body, re.S) or [None, ""])[1])
    faq = [(strip(q), strip(a)) for q, a in re.findall(r"<summary>(.*?)</summary>\s*<p>(.*?)</p>", body, re.S)]
    h3s = [(strip(h), strip(p)) for h, p in re.findall(r"<h3[^>]*>(.*?)</h3>\s*<p[^>]*>(.*?)</p>", body, re.S)]
    ol = [strip(li) for li in re.findall(r"<li[^>]*>(.*?)</li>", (re.search(r"<ol[^>]*>(.*?)</ol>", body, re.S) or [None, ""])[1], re.S)]
    chips = []
    if built.exists():
        b = built.read_text(encoding="utf-8", errors="ignore")
        c = re.search(r'<p class="chesed-t">(.*?)</p>', b, re.S)
        if c:
            chips = [strip(x).lstrip("✓ ").strip() for x in re.findall(r"<b>(.*?)</b>", c.group(1))]
    return meta, h1, sub, faq, h3s, ol, chips


VERB = re.compile(r"^(?:ו|ואז |ואחר כך |אחר כך |ש)?(?:בוחרים|לוחצים|מדביקים|פותחים|כותבים|מקלידים|מעלים|ממלאים|שולחים|מסמנים|"
                  r"מוסיפים|נכנסים|מצלמים|מקליטים|מורידים|שומרים|מדפיסים|גוררים|מזינים|עונים|מתחילים|מסדרים|מקבלים|"
                  r"משתפים|מחברים|מכוונים|מחכים|קוראים|מדברים|עוברים|מגדירים|מחפשים|משנים|מוחקים|מכינים|רואים|"
                  r"לוחצים|מעתיקים|מתקינים|בוחר|יוצרים|מוסיפות|בוחרות)\b")


def as_steps(text):
    """משפטים או חלקי משפט שמתחילים בפועל של הוראה ("בוחרים", "לוחצים"...)."""
    out = []
    for sen in sentences(text):
        for part in re.split(r",\s+(?=ו?(?:ואז )?[מנלש]\S+ים\b)|;\s+", sen):
            part = re.sub(r"^(?:ו|ואז |אחר כך )", "", part.strip())
            if VERB.match(part) and 8 <= len(part) <= 110:
                out.append(clip(part, STEP_MAX))
    return out


def pick_steps(ol, faq, h3s):
    if 2 <= len(ol) <= 6 and all(len(x) <= 120 for x in ol) and sum(bool(VERB.match(x)) for x in ol) >= 2:
        return [clip((sentences(x) or [x])[0], STEP_MAX) for x in ol[:3]]
    srcs = [p for h, p in h3s if "איך" in h] + [a for q, a in faq if q.startswith("איך")]
    best = []
    for s in srcs:
        st = as_steps(s)
        if len(st) > len(best):
            best = st
        if len(best) >= 3:
            break
    return best[:3] if len(best) >= 2 else []


SKIP_H3 = re.compile(r"איך משתמשים|למה (זה )?בחינם|^מה זה|שאלות|חשוב לדעת|עוד באותו|עוד כלים|מקורות|הערה|^למה ")
ICON_KW = [(r"פרטי|לא עול|נשאר אצל|בלי להעלות|שרת", "🔒"), (r"טלפון|נייד", "📱"), (r"הדפס|PDF|דף", "🖨"),
           (r"חינם|כסף|מחיר|₪|מע\"מ|חשבון|תשלום", "💰"), (r"מהיר|שניות|לחיצה", "⚡"), (r"ילד|הורים|משפח", "👨‍👩‍👧"),
           (r"שיתוף|לשלוח|ווטסאפ|וואטסאפ|קישור", "💌"), (r"שמיר|שומר|נשמר", "💾"), (r"תאריך|יומן|חג|שבת", "📅"),
           (r"מורה|כית|לימוד|תלמיד", "🎓"), (r"גוגל|ג׳ימייל|כרום", "🌐")]


def pick_features(h3s, faq):
    out = []
    for h, p in h3s:
        if SKIP_H3.search(h) or len(h) > 44 or h.endswith("?"):
            continue
        ss = sentences(p)
        if not ss:
            continue
        out.append([h, clip(ss[0], FEAT_MAX)])
    for f in out:
        txt = f[0] + " " + f[1]
        f.insert(0, next((e for k, e in ICON_KW if re.search(k, txt)), "✨"))
    return out[:4]


def love_items(soft, limited):
    items = [["💌", "לשתף עם מי שצריך", "זו העזרה הכי גדולה למיזם"]]
    if not soft:
        items += [["💡", "לעזור בלי כסף", "רעיון, תוכן, בדיקות או הפצה בקבוצות"],
                  ["💛", "שותפות במיזם", "ללא הגבלה בכלי, ומכסה גם אחרים" if limited else "מחזיקה את השרתים לכולם"]]
    else:
        items += [["🤍", "לספר עלינו", "ככה הכלי מגיע למי שצריך אותו"]]
    return items


def build_spec(page, base, page_obj):
    url = "/" + page.parent.relative_to(SRC).as_posix() + "/"
    built = ROOT / page.parent.relative_to(SRC) / "index.html"
    meta, h1, sub, faq, h3s, ol, chips = parse(page, url, built)
    tool = meta["tool"]
    crumbs = meta.get("crumbs") or []
    name = crumbs[-1][0] if crumbs else h1
    domain = crumbs[-2][0] if len(crumbs) > 1 else ""
    seg = [s for s in url.strip("/").split("/") if s]
    icon = next((ICONS[s] for s in reversed(seg) if s in ICONS), "🧰")
    soft = bool(SOFT.search(url))
    limited = any("מכסה" in c or "לשותפים" in c for c in chips) or "לשותפים במיזם ללא הגבלה" in " ".join(chips)
    steps = pick_steps(ol, faq, h3s)
    feats = pick_features(h3s, faq)
    hook = meta.get("og_title", "").split(" | ")[0]
    if not hook or h1 in hook or hook.split(" – ")[0].strip() in h1:  # כותרת השיתוף שחוזרת על ה-H1 לא מוסיפה כלום
        hook = ""
    sub_short = clip(sentences(sub)[0] if sentences(sub) else meta["description"], 110)
    chips = chips or ["בחינם", "בלי פרסומות", "בלי הרשמה"]

    # צילום הכלי האמיתי ברוחב טלפון
    shot = SHOTS / f"{tool}.jpg"
    shot_h = 0
    if page_obj is not None:
        try:
            page_obj.goto(base + url, wait_until="networkidle", timeout=30000)
            page_obj.add_style_tag(content=".dv-sec,.k-nav,header.site,.dock,.cookie,.chesed{display:none!important}")
            page_obj.wait_for_timeout(600)
            el = page_obj.query_selector(".tool") or page_obj.query_selector("main section") or page_obj.query_selector("main")
            bb = el.bounding_box()
            top = max(0, bb["y"] - 120)
            h = min(bb["height"] + 120, 1500)
            page_obj.set_viewport_size({"width": 390, "height": int(top + h + 10)})
            page_obj.screenshot(path=str(shot), type="jpeg", quality=82, clip={"x": 0, "y": top, "width": 390, "height": h})
            page_obj.set_viewport_size({"width": 390, "height": 844})
            shot_h = h
        except Exception as e:  # כלי שלא נטען: בלי צילום, הסרטון עדיין יוצא
            print("  shot failed:", tool, str(e)[:80])
    # מסגרת הטלפון: 500 רוחב פנימי, 880 גובה; התמונה ברוחב 390 נמתחת פי 500/390
    scroll = -int(max(0, shot_h * 500 / 390 - 880)) if shot_h else 0

    scenes = [{"type": "title", "dur": 4, "icon": icon, "kicker": domain or "מיזם הכלים", "title": h1, "sub": hook or sub_short,
               "chips": chips[:3]}]
    if shot_h:
        scenes.append({"type": "shot", "dur": 6.5, "title": "ככה זה *נראה*", "img": f"shots/auto/{tool}.jpg",
                       "scroll": scroll, "caption": clip(sub_short, 60)})
    if steps:
        scenes.append({"type": "steps", "dur": 5.5 + .5 * len(steps), "title": f"איך משתמשים? *{len(steps)} צעדים*" if len(steps) > 1 else "איך *משתמשים?*",
                       "items": [[s, ""] for s in steps], "gap": 1.0})
    if len(feats) >= 2:
        scenes.append({"type": "cards", "dur": 6.5, "title": "מה *כלול?*", "items": feats})
    scenes.append({"type": "cards", "cls": "gold", "dur": 7, "badge": "💛 באהבה ממיזם הכלים", "title": "מיזם חינמי, *כדי להנגיש*",
                   "items": love_items(soft, limited), "gap": .8,
                   "foot": "לעזור למיזם: hakelim.com/kelim/#truma" if not soft else "בלי פרסומות · בלי הרשמה · בחינם"})
    scenes.append({"type": "cta", "dur": 4.5, "icon": icon, "title": "נסו עכשיו, *בחינם*", "sub": name,
                   "url": "hakelim.com" + url.rstrip("/"), "small": "באהבה ממיזם הכלים של גילעד רחמים · מיזם חינמי להנגשה"})
    flyer = {
        "icon": icon, "kicker": domain or "מיזם הכלים", "title": h1, "sub": sub_short, "chips": chips[:3],
        "steps": steps or ["נכנסים לדף", "ממלאים או בוחרים", "מקבלים תוצאה, בחינם"],
        "features_title": "מה כלול",
        "features": [[f[0], f[1] if len(feats) > 2 else f"{f[1]}: {clip(f[2], 46)}"] for f in feats[:4]] or [["🎁", "בחינם"], ["🚫", "בלי פרסומות"]],
        "partner": {"title": "💛 באהבה ממיזם הכלים · מיזם חינמי להנגשה",
                    "items": [[i[0], i[1]] for i in love_items(soft, limited)],
                    "note": "לא הכול זה כסף: גם שיתוף, רעיון או עזרה בהפצה מחזיקים את המיזם · hakelim.com/kelim/#truma" if not soft
                    else "הכלים חינמיים לכולם. מכירים מישהו שזה יעזור לו? שלחו לו."},
        "cta": "סורקים ומתחילים",
        "url": f"https://hakelim.com{url}?utm_source=flyer&utm_medium=share",
        "url_text": "hakelim.com" + url.rstrip("/"),
    }
    if soft:
        scenes[-1]["small"] = "באהבה ממיזם הכלים של גילעד רחמים"
    return {"id": tool, "auto": True, "page": url, "name": f"{name} – ככה זה עובד",
            "description": f"סרטון קצר: מה {name} עושה, איך משתמשים בו, ומה כלול. {meta['description'][:140]}",
            "mood": "calm" if soft else "bright", "size": [540, 960], "scenes": scenes, "flyer": flyer}


def targets(only=None):
    tj = json.loads((ROOT / "kelim" / "tools.json").read_text(encoding="utf-8"))["tools"]
    hand = {p.stem for p in (HERE / "specs").glob("*.json")}
    seen = set()
    for t in tj:
        if t.get("h"):
            continue
        page = SRC / t["u"].strip("/") / "index.html"
        if not page.exists():
            continue
        m = re.match(r"\s*<!--meta\s*(\{.*?\})\s*-->", page.read_text(encoding="utf-8"), re.S)
        tool = json.loads(m.group(1)).get("tool")
        if not tool or tool in hand or tool in seen or (only and tool not in only):
            continue
        seen.add(tool)
        yield page


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://127.0.0.1:8799")
    ap.add_argument("--only")
    ap.add_argument("--limit", type=int)
    ap.add_argument("--no-shots", action="store_true")
    a = ap.parse_args()
    only = set(a.only.split(",")) if a.only else None
    OUT.mkdir(parents=True, exist_ok=True)
    SHOTS.mkdir(parents=True, exist_ok=True)
    pages = list(targets(only))[: a.limit]
    print("tools:", len(pages))
    pw = br = pg = None
    if not a.no_shots:
        from playwright.sync_api import sync_playwright
        pw = sync_playwright().start()
        br = pw.chromium.launch()
        pg = br.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True)
    n = 0
    for p in pages:
        try:
            spec = build_spec(p, a.base, pg)
        except Exception as e:
            print("SKIP", p, e)
            continue
        (OUT / f"{spec['id']}.json").write_text(json.dumps(spec, ensure_ascii=False, indent=1), encoding="utf-8")
        n += 1
        print("spec", spec["id"], len(spec["scenes"]), "scenes")
    if br:
        br.close()
        pw.stop()
    print("DONE specs", n)


if __name__ == "__main__":
    main()
