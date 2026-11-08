"""מחירי סופר לכלי "כמה הגיוני לשלם על זה?" ב-/kesef/mechir/.

לפי חוק המזון (שקיפות מחירים) כל רשת גדולה מפרסמת כל יום קבצי PriceFull: כל המוצרים בכל סניף ומחיר המדף שלהם.
הסקריפט מוריד כמה סניפים מכל רשת שהקבצים שלה פתוחים בלי התחברות (שופרסל, קרפור, חצי חינם),
לוקח לכל ברקוד את מחיר האמצע בכל רשת, ושומר רק מוצרים נפוצים שנמכרים ביותר מרשת אחת.
כותב kesef/mechir.json (קטן, הדפדפן קורא אותו). רץ פעם בשבוע ב-GitHub Action (.github/workflows/mechir.yml).
רשת שלא ענתה נלקחת מהקובץ הקודם, ואם אין מספיק נתונים הקובץ הקיים לא נדרס.
מחיר מדף רגיל, בלי מבצעים ובלי מועדון.
הרצה: python tools/super_prices.py
"""
import gzip, html, json, re, statistics, sys, time, urllib.request
import xml.etree.ElementTree as ET
from datetime import date
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "kesef" / "mechir.json"
UA = "Mozilla/5.0 (kelim mechir weekly)"
PER_CHAIN = 8          # כמה סניפים מכל רשת
MAX_ITEMS = 900


def fetch(url, tries=3, timeout=90):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except Exception as e:
            print("  retry", i + 1, url[:90], e, file=sys.stderr)
            time.sleep(4 * (i + 1))
    return None


def spread(lst, n):
    """n פריטים מפוזרים לאורך הרשימה (לא רק הסניפים הראשונים)."""
    lst = sorted(set(lst))
    if len(lst) <= n:
        return lst
    step = len(lst) / n
    return [lst[int(i * step)] for i in range(n)]


def by_store(urls):
    """לכל סניף רק הקובץ האחרון שלו."""
    best = {}
    for u in urls:
        m = re.search(r"PriceFull(\d+)-(\d+)-(\d+)-(\d{8})-?(\d*)", u)
        if m:
            key = m.group(2) + "-" + m.group(3)
            stamp = m.group(4) + m.group(5)
            if key not in best or stamp > best[key][0]:
                best[key] = (stamp, u)
    return [u for _, u in best.values()]


# ---------- רשימת קבצים לכל רשת ----------
def list_shufersal():
    urls = []
    for page in range(1, 6):
        b = fetch(f"https://prices.shufersal.co.il/FileObject/UpdateCategory?catID=2&storeId=0&page={page}")
        if not b:
            break
        urls += [html.unescape(u) for u in re.findall(r'https://pricesprodpublic[^"]+', b.decode("utf-8", "replace"))]
    return by_store(urls)


def list_carrefour():
    b = fetch("https://prices.carrefour.co.il/")
    if not b:
        return []
    t = b.decode("utf-8", "replace")
    m = re.search(r"const path = '(\d{8})'", t)
    if not m:
        return []
    names = re.findall(r'"(PriceFull7290055700007-[^"]+\.gz)"', t)
    return by_store(f"https://prices.carrefour.co.il/{m.group(1)}/{n}" for n in names)


def list_hazi():
    b = fetch("https://shop.hazi-hinam.co.il/Prices")
    if not b:
        return []
    return by_store(html.unescape(u) for u in re.findall(r'https://hazihinamprod01[^"\s<>]+PriceFull[^"\s<>]+', b.decode("utf-8", "replace")))


CHAINS = [("shufersal", "שופרסל", list_shufersal), ("carrefour", "קרפור", list_carrefour), ("hazi", "חצי חינם", list_hazi)]


# ---------- קריאת קובץ ----------
def parse(gz):
    try:
        root = ET.fromstring(gzip.decompress(gz).decode("utf-8-sig", "replace"))
    except Exception as e:
        print("  bad file", e, file=sys.stderr)
        return {}
    items = {}
    for it in root.iter():
        if it.tag.lower() != "item":
            continue
        g = {c.tag.lower(): (c.text or "").strip() for c in it}
        code = g.get("itemcode", "").lstrip("0")
        if not re.fullmatch(r"\d{8,13}", code) or g.get("biswighted", g.get("bisweighted", "0")) == "1":
            continue
        try:
            price = float(g.get("itemprice") or 0)
        except ValueError:
            continue
        if not 0.5 <= price <= 500:
            continue
        name = re.sub(r"\s+", " ", g.get("itemname", "")).strip()
        items[code] = (price, name)
    return items


# ---------- מוצרים נפוצים ----------
# מילים בשם המוצר. מוצר נשמר רק אם יש בו אחת מהן.
WORDS = """חלב שוקו לבן גבינה קוטג' קוטג שמנת יוגורט מעדן חמאה ביצים ביצה לחם פיתות פיתה לחמניות חלה
שמן סוכר קמח אורז פסטה ספגטי פתיתים קוסקוס מלח קפה נס תה טונה רסק עגבניות שימורי תירס אפונה חומוס טחינה
קטשופ מיונז חרדל ממרח שוקולד ריבה דבש קורנפלקס דגני במבה ביסלי צ'יפס תפוצ'יפס עוגיות ופל
מים סודה קולה מיץ ענבים בירה חיתולים טיטולים האגיס פמפרס מגבונים נייר טואלט מגבות סבון שמפו מרכך
משחת מברשת דאודורנט אבקת ג'ל כביסה מרכך נוזל כלים אקונומיקה ניקוי שקיות רדיד אלומיניום
שניצל נקניקיות קפואים פיצה ירקות טבעול עוף הודו גבינת צהובה מוצרלה בולגרית פרוסות
מרגרינה שיבולת קוואקר גרנולה חטיף אגוזים בוטנים שקדים תמרים צימוקים פירה מרק אבקת ציפורן""".split()


def wanted(name):
    return any(w in name for w in WORDS)


def main():
    old = {}
    if OUT.exists():
        try:
            old = json.loads(OUT.read_text(encoding="utf-8"))
        except Exception:
            old = {}
    per_chain = {}     # chain -> code -> [prices]
    names = {}         # code -> name (שם מהרשת הראשונה שיש בה)
    stores = {}
    dates = {}
    for key, label, lister in CHAINS:
        files = spread(lister(), PER_CHAIN)
        print(label, "סניפים:", len(files))
        got = {}
        n = 0
        for u in files:
            b = fetch(u)
            if not b:
                continue
            items = parse(b)
            if len(items) < 500:
                continue
            n += 1
            for code, (p, nm) in items.items():
                got.setdefault(code, []).append(p)
                if nm and code not in names:
                    names[code] = nm
        stores[key] = n
        if n:
            per_chain[key] = got
            dates[key] = date.today().isoformat()
        print("  נקראו", n, "סניפים,", len(got), "ברקודים")

    keys = [k for k, _, _ in CHAINS]
    # רשת שלא ענתה השבוע: לוקחים את המחירים שלה מהקובץ הקודם
    if old.get("items") and old.get("chains"):
        oi = [c["key"] for c in old["chains"]]
        for k in keys:
            if k in per_chain or k not in oi:
                continue
            j = oi.index(k)
            # רשת שחוסמת את השרתים של GitHub: המחירים הישנים נשמרים עם התאריך שלהם, עד חודש
            od = old["chains"][j].get("date") or old.get("date")
            if not od or (date.today() - date.fromisoformat(od)).days > 35:
                print("  ", k, "ישן מדי, יורד")
                continue
            dates[k] = od
            per_chain[k] = {}
            for row in old["items"]:
                if row[4][j] is not None:
                    per_chain[k][row[0]] = [row[4][j]]
                    names.setdefault(row[0], row[1])
            stores[k] = -1
            print("  ", k, "מהקובץ הקודם")

    if len(per_chain) < 2:
        raise SystemExit("פחות משתי רשתות ענו. הקובץ הקיים נשאר.")

    rows = []
    allcodes = set().union(*[set(d) for d in per_chain.values()])
    for code in allcodes:
        nm = names.get(code, "")
        if not nm or not wanted(nm):
            continue
        prices, branches = [], 0
        for k in keys:
            lst = per_chain.get(k, {}).get(code)
            if lst:
                prices.append(round(statistics.median(lst), 2))
                branches += len(lst)
            else:
                prices.append(None)
        have = [p for p in prices if p is not None]
        if len(have) < 2:
            continue
        lo, hi = min(have), max(have)
        if hi > lo * 3:          # כנראה ברקוד שמשמש מוצרים שונים ברשתות שונות
            continue
        rows.append((branches, [code, nm, lo, round(statistics.median(have), 2), prices, hi]))

    rows.sort(key=lambda r: (-r[0], r[1][1]))
    items = [r for _, r in rows[:MAX_ITEMS]]
    if len(items) < 200:
        raise SystemExit(f"רק {len(items)} מוצרים, משהו לא בסדר. הקובץ הקיים נשאר.")
    items.sort(key=lambda r: r[1])
    data = {
        "date": date.today().isoformat(),
        "note": "מחיר מדף רגיל, בלי מבצעים. אמצע בין כמה סניפים בכל רשת.",
        "chains": [{"key": k, "name": lbl, "stores": stores.get(k, 0), "date": dates.get(k)} for k, lbl, _ in CHAINS],
        # כל שורה: ברקוד, שם, הכי זול, אמצע, [מחיר בכל רשת לפי הסדר של chains], הכי יקר
        "items": items,
    }
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print("נכתב", OUT, len(items), "מוצרים", OUT.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
