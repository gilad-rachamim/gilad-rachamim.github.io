"""תמונת פופולריות ל-28 הימים האחרונים מ-GA4 -> src/pop.json (מזין את הקטלוג: "הכי שימושיים", דירוג חיפוש, כלים קשורים).

  python -I -X utf8 tools/pop_snapshot.py [--days 28] [--report]

ציון לכל נתיב = צפיות + 3 * שימושים בכלי (tool_use). נקרא דרך מפתח הקריאה של סקיל sevev-male.
--report מדפיס גם את מדדי הגילוי: דפים לביקור, לחיצות גילוי לפי משטח, 10 הכלים הראשונים. לא נוגע בכלום מלבד src/pop.json.
"""
import argparse, json, os, re, sys

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.expanduser("~/.claude/skills/sevev-male/scripts"))
import ga4  # noqa: E402

PROP = "561836940"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def norm(p):
    p = p.split("?")[0].split("#")[0]
    if not p.startswith("/"):
        return ""
    return p if p.endswith("/") else p + "/"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=28)
    ap.add_argument("--report", action="store_true")
    a = ap.parse_args()
    c = ga4.client()
    views = ga4.run(c, PROP, ["pagePath"], ["screenPageViews"], a.days, limit=5000)
    uses = ga4.run(c, PROP, ["pagePath"], ["eventCount"], a.days, filt=("eventName", "tool_use"), limit=5000)
    score = {}
    for d, m in views:
        k = norm(d[0])
        if k:
            score[k] = score.get(k, 0) + int(m[0])
    for d, m in uses:
        k = norm(d[0])
        if k:
            score[k] = score.get(k, 0) + 3 * int(m[0])
    cat = json.load(open(os.path.join(ROOT, "assets", "catalog.json"), encoding="utf-8"))
    tools = {x["u"] for x in cat["items"] if x["ty"] == "tool" and x["l"] == "he" and not x["sf"]}
    skip = re.compile(r"tahara|nida|azkara|avel|shiva|kadish|nefesh|levaya")
    out = {k: v for k, v in sorted(score.items(), key=lambda kv: -kv[1]) if k in tools and v > 0 and not skip.search(k)}
    if len(out) < 20:
        raise SystemExit("פחות מ-20 כלים עם נתונים (%d) – לא כותבים pop.json" % len(out))
    path = os.path.join(ROOT, "src", "pop.json")
    json.dump(out, open(path, "w", encoding="utf-8", newline="\n"), ensure_ascii=False, separators=(",", ":"))
    print("pop.json: %d כלים; עשרה ראשונים:" % len(out))
    for k, v in list(out.items())[:10]:
        print("  %6d %s" % (v, k))
    if a.report:
        tot = ga4.run(c, PROP, [], ["sessions", "screenPageViews"], a.days)
        if tot:
            s, v = int(tot[0][1][0]), int(tot[0][1][1])
            print("דפים לביקור: %.2f (%d צפיות, %d ביקורים)" % (v / max(s, 1), v, s))
        for ev in ("view_search_results", "discover_click", "hakelim_search"):
            r = ga4.run(c, PROP, ["eventName"], ["eventCount"], a.days, filt=("eventName", ev), limit=1)
            print("%s: %s" % (ev, r[0][1][0] if r else 0))
        try:
            r = ga4.run(c, PROP, ["customEvent:src"], ["eventCount"], a.days, filt=("eventName", "discover_click"), limit=10)
            print("discover_click לפי משטח:", [(d[0], m[0]) for d, m in r])
        except Exception as e:  # המימד המותאם src עוד לא רשום
            print("discover_click לפי משטח: לא נבדק (%s) – צריך לרשום מימד מותאם src" % type(e).__name__)


if __name__ == "__main__":
    main()
