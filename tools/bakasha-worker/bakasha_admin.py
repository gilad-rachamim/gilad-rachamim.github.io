# -*- coding: utf-8 -*-
"""בקשות כלים – ניהול מהמחשב (לשיחות של Claude שבונות כלים, ולפריסה).

  python -I bakasha_admin.py list                 הבקשות הפתוחות (ממתינות ובבנייה), הכי מבוקשות קודם
  python -I bakasha_admin.py list --all           הכול
  python -I bakasha_admin.py set 12 build         סטטוס: new / build / done / later
  python -I bakasha_admin.py set 12 done /kelim/briut/trufot/     נבנה + קישור (מי שהשאיר מייל מקבל הודעה לבד)
  python -I bakasha_admin.py add "טקסט הבקשה"      בקשה שהגיעה בווטסאפ
  python -I bakasha_admin.py hide 12 | show 12
  python -I bakasha_admin.py digest [--force]     לשלוח עכשיו את הסיכום לבוט הפרטי של גילעד
  python -I bakasha_admin.py link                 הקישור ללוח של גילעד (נכתב לקובץ, לא מודפס)
  python -I bakasha_admin.py deploy               wrangler deploy + סודות (רק אחרי "כן" של גילעד)

המפתח: ~/.claude/secrets/kelim-bakasha.json (נוצר בפריסה הראשונה). לא מודפס לעולם.
"""
import json, os, re, secrets as pysecrets, subprocess, sys, time, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
URL = os.environ.get("BAKASHA_API", "https://kelim-bakasha.gilad4049.workers.dev")
SEC = os.path.join(os.path.expanduser("~"), ".claude", "secrets", "kelim-bakasha.json")
HUB_SEC = os.path.join(os.path.expanduser("~"), ".claude", "secrets", "telegram-hub.json")
ENV_FILE = os.path.join(os.path.expanduser("~"), "OneDrive - Michlelet Orot Israel", "Documents", "6. כתבים אישיים",
                        "המסע לסופר-על", "מהדורת הגיבוש 2026", ".env")
UA = "kelim-bakasha-admin/1.0"   # workers.dev מחזיר 403 ל-User-Agent של Python
ST = {"new": "התקבלה", "build": "בבנייה", "done": "נבנה", "later": "לא כרגע"}


def key(create=False):
    if os.path.exists(SEC):
        with open(SEC, encoding="utf-8") as f:
            return json.load(f)["ADMIN_KEY"]
    if not create:
        sys.exit("אין מפתח: " + SEC)
    k = pysecrets.token_urlsafe(24)
    os.makedirs(os.path.dirname(SEC), exist_ok=True)
    with open(SEC, "w", encoding="utf-8") as f:
        json.dump({"ADMIN_KEY": k}, f)
    return k


def call(path, body=None):
    data = json.dumps(body, ensure_ascii=False).encode("utf-8") if body is not None else None
    req = urllib.request.Request(URL + path, data=data, method="POST" if data else "GET",
                                 headers={"User-Agent": UA, "X-Admin-Key": key(), "Content-Type": "application/json"})
    for i in range(4):
        try:
            with urllib.request.urlopen(req, timeout=40) as r:
                return json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            return {"error": e.code, "body": e.read().decode("utf-8", "replace")[:300]}
        except urllib.error.URLError as e:          # החיבור לא נפתח (רשת סלולרית): הבקשה לא יצאה, אפשר לנסות שוב
            if i == 3 or not isinstance(e.reason, (TimeoutError, ConnectionError, OSError)):
                raise
            time.sleep(5)


def cf_env():
    env = dict(os.environ)
    with open(ENV_FILE, encoding="utf-8") as f:
        for line in f:
            m = re.match(r"\s*(CLOUDFLARE_API_TOKEN|CLOUDFLARE_ACCOUNT_ID)\s*=\s*(\S+)", line)
            if m:
                env[m.group(1)] = m.group(2)
    env["NODE_OPTIONS"] = "--dns-result-order=ipv4first"
    for k in ("CLAUDECODE", "CLAUDE_CODE_ENTRYPOINT"):
        env.pop(k, None)
    return env


def wrangler(*args, stdin=None):
    r = subprocess.run(["npx", "--yes", "wrangler@4", *args], cwd=HERE, env=cf_env(), input=stdin, capture_output=True, text=True,
                       encoding="utf-8", errors="replace", timeout=400, shell=(os.name == "nt"))
    return r.returncode, (r.stdout or "") + (r.stderr or "")


def out(s):
    sys.stdout.buffer.write((s + "\n").encode("utf-8"))


def main(a):
    cmd = a[0] if a else "list"
    if cmd == "list":
        items = call("/admin/list").get("items", [])
        if "--all" not in a:
            items = [r for r in items if r["st"] in ("new", "build") and not r["hid"]]
        items.sort(key=lambda r: (r["st"] != "build", -r["v"], -r["no"]))
        for r in items:
            out("%3d | %-7s | %2d רוצים | %s%s%s%s" % (r["no"], ST[r["st"]], r["v"], r.get("raw") or r["what"],
                " | למי: " + r["who"] if r.get("who") else "", " | " + r["dom"] if r.get("dom") else "", " | מוסתרת" if r["hid"] else ""))
        out("סה\"כ: %d" % len(items))
    elif cmd == "set":
        body = {"no": int(a[1]), "st": a[2]}
        if len(a) > 3:
            body["url"] = a[3]
        out(json.dumps(call("/admin/set", body), ensure_ascii=False))
    elif cmd in ("hide", "show"):
        out(json.dumps(call("/admin/set", {"no": int(a[1]), "hid": cmd == "hide"}), ensure_ascii=False))
    elif cmd == "add":
        out(json.dumps(call("/admin/add", {"what": a[1]}), ensure_ascii=False))
    elif cmd == "digest":
        out(json.dumps(call("/admin/digest", {"force": "--force" in a}), ensure_ascii=False))
    elif cmd == "link":
        p = os.path.join(os.path.dirname(SEC), "kelim-bakasha-link.txt")
        with open(p, "w", encoding="utf-8") as f:
            f.write("https://hakelim.com/kelim/bakasha/sheli/#k=" + key() + "\n")
        out("נכתב: " + p)
    elif cmd == "deploy":
        rc, o = wrangler("deploy")
        out(o[-900:])
        if rc:
            sys.exit(rc)
        with open(HUB_SEC, encoding="utf-8") as f:
            hub = json.load(f).get("HUB_SECRET", "")
        for name, val in (("ADMIN_KEY", key(create=True)), ("HUB_SECRET", hub)):
            rc, o = wrangler("secret", "put", name, stdin=val + "\n")
            out("secret %s: %s" % (name, "ok" if rc == 0 else "FAILED " + o[-300:].replace(val, "***")))
    else:
        out(__doc__)


if __name__ == "__main__":
    main(sys.argv[1:])
