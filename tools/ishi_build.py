"""מרכיב את התוסף הפרטי "מצב אישי" לתיקייה בשולחן העבודה של גילעד, עם config.js (כתובת הסקריפט + מפתח).
המפתח נוצר פעם אחת ונשמר ב-~/.config/hakelim/ishi.json – לא בריפו.
הרצה:  python tools/ishi_build.py [--url https://script.google.com/macros/s/.../exec]
       python tools/ishi_build.py --code   ← מדפיס את Code.gs עם המפתח (להדבקה בעורך של Apps Script)"""
import json, pathlib, secrets, shutil, sys, subprocess
sys.stdout.reconfigure(encoding="utf-8")
ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "tools" / "ishi-ext"
MAIN = ROOT / "tools" / "chatima-ext"
CONF = pathlib.Path.home() / ".config" / "hakelim" / "ishi.json"

def desktop():
    try:
        out = subprocess.run(["powershell", "-NoProfile", "-Command", "[Environment]::GetFolderPath('Desktop')"], capture_output=True, text=True, timeout=20).stdout.strip()
        if out: return pathlib.Path(out)
    except Exception: pass
    return pathlib.Path.home() / "Desktop"

def conf():
    c = json.loads(CONF.read_text(encoding="utf-8")) if CONF.exists() else {}
    if not c.get("token"):
        c["token"] = secrets.token_urlsafe(32)
    CONF.parent.mkdir(parents=True, exist_ok=True)
    CONF.write_text(json.dumps(c, ensure_ascii=False, indent=1), encoding="utf-8")
    return c

def main():
    c = conf()
    if "--code" in sys.argv:
        print((SRC / "apps-script" / "Code.gs").read_text(encoding="utf-8").replace("__TOKEN__", c["token"]))
        return
    if "--url" in sys.argv:
        c["url"] = sys.argv[sys.argv.index("--url") + 1].strip()
        CONF.write_text(json.dumps(c, ensure_ascii=False, indent=1), encoding="utf-8")
    # לא בשולחן העבודה: הוא מסתנכרן ל-OneDrive, והמפתח לא צריך לעלות לענן
    out = pathlib.Path.home() / "hakelim-ishi"
    out.mkdir(exist_ok=True)
    for f in SRC.iterdir():
        if f.is_file(): shutil.copy(f, out / f.name)
    for n in ["when.js", "icon16.png", "icon32.png", "icon48.png", "icon128.png"]:
        shutil.copy(MAIN / n, out / n)
    (out / "config.js").write_text("// פרטי! כתובת הסקריפט והמפתח של גילעד. לא לשתף ולא להעלות לשום מקום.\nself.ISHI = " + json.dumps({"url": c.get("url", ""), "token": c["token"]}) + ";\n", encoding="utf-8")
    (out / "קרא אותי.txt").write_text(
        "מצב אישי – הכלים של גילעד\n\nתוסף פרטי, רק למחשב הזה. הוא מדבר עם הסקריפט בחשבון הגוגל שלך (Apps Script) עם מפתח סודי שבקובץ config.js.\n"
        "לא לשלוח את התיקייה הזאת לאף אחד: מי שיש לו את config.js יכול לקרוא את היומן, הדרייב ואנשי הקשר שלך.\n\n"
        "התקנה (פעם אחת): chrome://extensions ← 'מצב מפתח' למעלה ← 'טעינת תוסף לא ארוז' ← לבחור את התיקייה הזאת.\n"
        "פתיחה: Alt+Shift+G או הסמל 🔐 ליד שורת הכתובת.\n", encoding="utf-8")
    print(out, "url:", "yes" if c.get("url") else "MISSING")

main()
