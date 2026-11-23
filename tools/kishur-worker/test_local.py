# -*- coding: utf-8 -*-
"""בדיקת השרת kelim-kishur מול שרת מקומי או חי.

מקומי:
  cd tools/kishur-worker
  npx wrangler@4 d1 execute kelim-kishur --local --file schema.sql
  npx wrangler@4 dev --local --port 8791 --var ADMIN_KEY:testadmin IP_SALT:testsalt
  python -X utf8 test_local.py http://127.0.0.1:8791 testadmin
חי (קישורי הבדיקה נמחקים בסוף; בלי מפתח ניהול מדלגים על בדיקת admin):
  python -X utf8 test_local.py https://s.hakelim.com
"""
import http.client, json, sys, time, urllib.parse, uuid

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8791").rstrip("/")
ADMIN = sys.argv[2] if len(sys.argv) > 2 else ""
U = urllib.parse.urlparse(BASE)
ORIGIN = "https://hakelim.com"
RUN = uuid.uuid4().hex[:6]
fails = []
made = []


def req(method, path, body=None, ip="10.0.0.1", headers=None, origin=ORIGIN):
    c = (http.client.HTTPSConnection if U.scheme == "https" else http.client.HTTPConnection)(U.netloc, timeout=20)
    h = {"user-agent": "Mozilla/5.0 (Windows NT 10.0) Chrome/130 Safari/537.36", "cf-connecting-ip": ip}
    if origin:
        h["origin"] = origin
    if body is not None:
        body = json.dumps(body, ensure_ascii=False).encode("utf-8")
        h["content-type"] = "application/json"
    h.update(headers or {})
    c.request(method, urllib.parse.quote(path, safe="/?=&+:%.-_~") if not path.startswith("/api") else path, body, h)
    r = c.getresponse()
    data = r.read()
    try:
        j = json.loads(data)
    except Exception:
        j = None
    return r.status, dict((k.lower(), v) for k, v in r.getheaders()), j, data.decode("utf-8", "replace")


def check(name, cond, info=""):
    print(("OK   " if cond else "FAIL ") + name + ((" :: " + str(info)[:160]) if not cond else ""))
    if not cond:
        fails.append(name)


def new(url, alias=None, ip="10.0.0.1"):
    b = {"url": url}
    if alias is not None:
        b["alias"] = alias
    return req("POST", "/api/new", b, ip=ip)


# 1. יצירה והפניה
s, h, j, _ = new("https://example.com/page?x=1", ip="10.1.0.1")
check("יצירה 200 עם code/short/key", s == 200 and j and j.get("code") and j.get("key") and j["short"].endswith("/" + j["code"]), (s, j))
code, key = j["code"], j["key"]
made.append((code, key))
check("קוד באורך 5 מהאלפבית", len(code) == 5 and all(c in "abcdefghjkmnpqrstuvwxyz23456789" for c in code), code)
s, h, _, _ = req("GET", "/" + code, ip="10.1.0.2")
check("הפניה 302 עם location נכון", s == 302 and h.get("location") == "https://example.com/page?x=1", (s, h.get("location")))
check("כותרות הפניה: no-store, noindex, no-referrer", "no-store" in h.get("cache-control", "") and "noindex" in h.get("x-robots-tag", "") and h.get("referrer-policy") == "no-referrer", h)
s, _, _, _ = req("GET", "/" + code.upper(), ip="10.1.0.2")
check("חיפוש לא רגיש לאותיות גדולות", s == 302, s)

# 2. ספירה: דפדפן נספר, בוט והצצה לא
time.sleep(0.6)
s, _, st, _ = req("GET", f"/api/stats?code={code}&key={key}", ip="10.1.0.3")
before = st["clicks"] if st else -1
check("stats עם מפתח נכון", s == 200 and st["url"] == "https://example.com/page?x=1" and before >= 1, (s, st))
req("GET", "/" + code, headers={"user-agent": "WhatsApp/2.23 A"}, ip="10.1.0.4")
req("GET", "/" + code, headers={"user-agent": "facebookexternalhit/1.1"}, ip="10.1.0.4")
req("HEAD", "/" + code, ip="10.1.0.4")
time.sleep(0.6)
_, _, st2, _ = req("GET", f"/api/stats?code={code}&key={key}", ip="10.1.0.3")
check("בוט / HEAD לא נספרים", st2["clicks"] == before, (before, st2["clicks"]))
req("GET", "/" + code, ip="10.1.0.5")
time.sleep(0.8)
_, _, st3, _ = req("GET", f"/api/stats?code={code}&key={key}", ip="10.1.0.3")
check("לחיצה אמיתית נספרת", st3["clicks"] == before + 1, (before, st3["clicks"]))
check("גרף ימים מכיל את היום", st3["days"] and st3["days"][-1]["n"] >= 1, st3["days"])
s, _, _, _ = req("GET", f"/api/stats?code={code}&key=wrongkey", ip="10.1.0.3")
check("stats עם מפתח שגוי -> 403", s == 403, s)

# 3. תצוגה מקדימה
s, h, _, body = req("GET", "/" + code + "+", ip="10.1.0.6")
check("תצוגה מקדימה: 200, HTML עברי, noindex, מציג את היעד", s == 200 and "example.com" in body and "noindex" in h.get("x-robots-tag", "") and "המשך לאתר" in body, (s, body[:120]))
time.sleep(0.5)
_, _, st4, _ = req("GET", f"/api/stats?code={code}&key={key}", ip="10.1.0.3")
check("תצוגה מקדימה לא נספרת", st4["clicks"] == st3["clicks"], (st3["clicks"], st4["clicks"]))

# 4. שם מותאם
alias = "bdika-" + RUN
s, _, j, _ = new("https://example.org/a", alias, ip="10.2.0.1")
check("alias חופשי נוצר", s == 200 and j["code"] == alias, (s, j))
if s == 200:
    made.append((alias, j["key"]))
s, _, j, _ = new("https://example.org/b", alias.upper(), ip="10.2.0.1")
check("alias תפוס -> 409 (גם באותיות גדולות)", s == 409, (s, j))
s, _, j, _ = req("GET", "/api/check?alias=" + alias, ip="10.2.0.2")
check("check מחזיר תפוס", s == 200 and j["free"] is False, j)
s, _, j, _ = req("GET", "/api/check?alias=free-" + RUN, ip="10.2.0.2")
check("check מחזיר פנוי", s == 200 and j["free"] is True, j)
for bad in ["admin", "paypal-login", "google", "ab", "bad name", "x" * 31, "-start", "לאומי-כרטיס", "bank-verify"]:
    s, _, j, _ = new("https://example.org/c", bad, ip="10.2.0.3")
    check(f"alias שמור/לא תקין נדחה: {bad[:12]}", s == 400, (s, j))
heb = "שלום-" + RUN
s, _, j, _ = new("https://example.org/he", heb, ip="10.2.0.4")
check("alias בעברית נוצר", s == 200 and j["code"] == heb, (s, j))
if s == 200:
    made.append((heb, j["key"]))
    s2, h2, _, _ = req("GET", "/" + heb, ip="10.2.0.5")
    check("alias בעברית מפנה", s2 == 302 and h2.get("location") == "https://example.org/he", (s2, h2.get("location")))
    s3, _, j3, _ = new("https://example.org/x", heb, ip="10.2.0.4")
    check("alias עברי תפוס -> 409", s3 == 409, s3)

# 5. יעדים לא חוקיים
for bad in ["http://127.0.0.1/x", "http://192.168.1.5/", "http://localhost:3000", "https://10.0.0.1", "http://[::1]/", "https://server.local/a",
            "https://bit.ly/abc", "https://tinyurl.com/x", "https://s.hakelim.com/abcde", "https://example.com/setup.exe", "https://example.com/a/b.APK?x=1",
            "javascript:alert(1)", "ftp://example.com/a", "https://user:pw@example.com/", "https://example.com:8080/x", "https://nodot/", "", "   ", "https://" + "a" * 2100 + ".com"]:
    s, _, j, _ = new(bad, ip="10.3.0.1")
    check(f"יעד לא חוקי נדחה: {bad[:34]!r}", s == 400, (s, j))
s, _, j, _ = new("example.net/no-scheme", ip="10.3.0.2")
check("כתובת בלי https מושלמת", s == 200, (s, j))
if s == 200:
    made.append((j["code"], j["key"]))
s, _, j, _ = req("POST", "/api/new", {"url": "https://example.com"}, ip="10.3.0.3", origin="https://evil.example")
check("מקור לא מורשה -> 403", s == 403, s)
s, _, j, _ = req("GET", "/api/new", ip="10.3.0.3")
check("GET ל-new -> 405", s == 405, s)
s, _, _, _ = req("PUT", "/abcde", ip="10.3.0.3")
check("PUT -> 405", s == 405, s)
s, _, j, _ = new("https://malware.testcategory.com/x", ip="10.3.0.4")
check("אתר זדוני (DNS מסנן) נדחה", s == 400 and j.get("reason") == "malware", (s, j))

# 6. עריכה ומחיקה
s, _, j, _ = req("POST", "/api/edit", {"code": code, "key": key, "url": "https://example.com/new-target"}, ip="10.4.0.1")
check("עריכת יעד", s == 200, (s, j))
s, h, _, _ = req("GET", "/" + code, headers={"user-agent": "WhatsApp/2"}, ip="10.4.0.2")
check("ההפניה מעודכנת", h.get("location") == "https://example.com/new-target", h.get("location"))
s, _, j, _ = req("POST", "/api/edit", {"code": code, "key": "wrong", "url": "https://example.com/x"}, ip="10.4.0.1")
check("עריכה עם מפתח שגוי -> 403", s == 403, s)
s, _, j, _ = req("POST", "/api/edit", {"code": code, "key": key, "url": "http://127.0.0.1"}, ip="10.4.0.1")
check("עריכה ליעד לא חוקי -> 400", s == 400, s)
s, _, j, _ = req("POST", "/api/delete", {"code": code, "key": "wrong"}, ip="10.4.0.1")
check("מחיקה עם מפתח שגוי -> 403", s == 403, s)
s, _, j, _ = req("POST", "/api/delete", {"code": code, "key": key}, ip="10.4.0.1")
check("מחיקה", s == 200, (s, j))
s, _, _, body = req("GET", "/" + code, ip="10.4.0.2")
check("אחרי מחיקה -> 410", s == 410, s)
s, _, _, body = req("GET", "/zzzzz9", ip="10.4.0.2")
check("קוד שלא קיים -> 404 עם דף עברי", s == 404 and "לא נמצא" in body, s)
s, h, _, _ = req("GET", "/", ip="10.4.0.2")
check("שורש -> 301 לדף הכלי", s == 301 and "kitzur-kishurim" in h.get("location", ""), (s, h.get("location")))
s, _, _, body = req("GET", "/robots.txt", ip="10.4.0.2")
check("robots.txt חוסם", "Disallow: /" in body, body)

# 7. מרובה
s, _, j, _ = req("POST", "/api/bulk", {"urls": ["https://example.com/1", "https://example.com/2", "bad", "https://example.com/3"]}, ip="10.5.0.1")
check("bulk: 4 תוצאות, אחת שגיאה", s == 200 and len(j["results"]) == 4 and sum(1 for r in j["results"] if r.get("error")) == 1, (s, j))
for r in (j or {}).get("results", []):
    if r.get("code"):
        made.append((r["code"], r["key"]))
s, _, j, _ = req("POST", "/api/bulk", {"urls": ["https://example.com/%d" % i for i in range(21)]}, ip="10.5.0.2")
check("bulk מעל 20 -> 400", s == 400, s)
s, _, j, _ = req("POST", "/api/new", {"url": "https://example.com/" + "x" * 30000}, ip="10.5.0.3")
check("גוף גדול מ-20KB -> 413", s == 413, s)

# 8. דיווחים: 3 שונים משביתים
s, _, j, _ = new("https://example.com/report-me", ip="10.6.0.1")
rc, rk = j["code"], j["key"]
made.append((rc, rk))
for i in range(3):
    s, _, j, _ = req("POST", "/api/report", {"code": rc, "reason": "בדיקה"}, ip="10.6.1.%d" % i)
    check(f"דיווח {i + 1} התקבל", s == 200, (s, j))
s, _, _, body = req("GET", "/" + rc, ip="10.6.2.1")
check("3 דיווחים -> הושבת (410)", s == 410 and "הושבת" in body, s)
s, _, j, _ = req("POST", "/api/report", {"code": "zzzzz9"}, ip="10.6.2.2")
check("דיווח על קוד לא קיים -> 404", s == 404, s)
for i in range(6):
    s, _, j, _ = req("POST", "/api/report", {"code": made[0][0] if made else rc, "reason": "x"}, ip="10.6.3.1")
check("הגבלת קצב דיווחים -> 429 אחרי 5", s == 429, s)

# 9. admin
s, _, _, _ = req("GET", "/api/admin?action=list", ip="10.7.0.1", origin="")
check("admin בלי סוד -> 404", s == 404, s)
s, _, _, _ = req("GET", "/api/admin?action=list", ip="10.7.0.1", headers={"x-admin-key": "wrong"}, origin="")
check("admin עם סוד שגוי -> 404", s == 404, s)
if ADMIN:
    s, _, j, _ = req("GET", "/api/admin?action=list", ip="10.7.0.1", headers={"x-admin-key": ADMIN}, origin="")
    check("admin list מחזיר את הדיווחים", s == 200 and any(r["code"] == rc for r in j["reports"]), (s, j))
    s, _, j, _ = req("GET", f"/api/admin?action=enable&code={rc}", ip="10.7.0.1", headers={"x-admin-key": ADMIN}, origin="")
    s2, _, _, _ = req("GET", "/" + rc, headers={"user-agent": "WhatsApp/2"}, ip="10.7.0.2")
    check("admin enable מחזיר לפעילות", s == 200 and s2 == 302, (s, s2))
else:
    print("SKIP admin עם סוד (לא ניתן סוד)")

# 10. הגבלת קצב יצירה: 20 בשעה
codes = 0
last = None
for i in range(22):
    s, _, j, _ = new("https://example.com/rl/%s/%d" % (RUN, i), ip="10.9.%d.1" % (int(RUN[:2], 16) % 200))
    if s == 200:
        codes += 1
        made.append((j["code"], j["key"]))
    last = (s, j)
check("הגבלת קצב: 20 עוברים, 21 -> 429 בעברית", codes == 20 and last[0] == 429 and "מכסה" in last[1]["error"], (codes, last))

# ניקוי קישורי הבדיקה
for c, k in made:
    req("POST", "/api/delete", {"code": c, "key": k}, ip="10.8.%d.1" % (len(c) % 200))
print("\nסיכום: %d נכשלו" % len(fails), fails if fails else "")
sys.exit(1 if fails else 0)
