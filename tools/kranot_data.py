"""נתוני גמל-נט (משרד האוצר, data.gov.il) לכלי "מעקב קרנות השתלמות וגמל" ב-/kesef/kranot/.

מושך את כל המסלולים בחודש האחרון שפורסם, ומחשב תשואה ל-12 חודשים מ-12 החודשים האחרונים.
כותב kesef/kranot.json (קובץ קטן שהדפדפן קורא). רץ פעם בחודש ב-GitHub Action (.github/workflows/kranot.yml).
אם המשיכה נכשלת, הקובץ הקיים נשאר ולא נדרס.
הרצה: python tools/kranot_data.py
"""
import json, sys, time, urllib.parse, urllib.request
from pathlib import Path

RES = "a30dcbea-a1d2-482c-ae29-8f781f5025fb"   # גמל-נט 2024 ואילך
API = "https://data.gov.il/api/3/action/datastore_search"
OUT = Path(__file__).resolve().parent.parent / "kesef" / "kranot.json"
UA = "Mozilla/5.0 (kelim kranot monthly)"


def get(params, tries=4):
    url = API + "?" + urllib.parse.urlencode(params)
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)["result"]
        except Exception as e:  # רשת, חסימה זמנית, תשובה שאינה JSON
            print("retry", i + 1, e, file=sys.stderr)
            time.sleep(5 * (i + 1))
    raise SystemExit("data.gov.il לא ענה. הקובץ הקיים נשאר.")


def period(p):
    return get({"resource_id": RES, "limit": 2000, "filters": json.dumps({"REPORT_PERIOD": p})})["records"]


def prev(p, n=1):
    y, m = divmod(p, 100)
    m -= n
    while m < 1:
        m += 12; y -= 1
    return y * 100 + m


last = get({"resource_id": RES, "limit": 1, "sort": "REPORT_PERIOD desc"})["records"][0]["REPORT_PERIOD"]
cur = period(last)
if len(cur) < 300:
    raise SystemExit(f"רק {len(cur)} מסלולים ב-{last}, משהו לא בסדר. הקובץ הקיים נשאר.")

# תשואה מצטברת ל-12 חודשים: מכפלת התשואות החודשיות (רק למסלול שיש לו את כל 12 החודשים)
monthly = {r["FUND_ID"]: [r.get("MONTHLY_YIELD")] for r in cur}
for k in range(1, 12):
    seen = {r["FUND_ID"]: r.get("MONTHLY_YIELD") for r in period(prev(last, k))}
    for fid, arr in monthly.items():
        arr.append(seen.get(fid))


def y12(arr):
    if len(arr) < 12 or any(v is None for v in arr):
        return None
    t = 1.0
    for v in arr:
        t *= 1 + v / 100
    return round((t - 1) * 100, 2)


def short(corp):
    # 'מיטב גמל ופנסיה בע"מ' → 'מיטב' ; 'עמ"י - חברה לניהול ...' → 'עמ"י'
    corp = full = corp.replace(' בע"מ', "").strip()
    for cut in [" - ", " -", " חברה ", " ניהול קופות", " קופות גמל", " גמל ופנסיה", " פנסיה וגמל", " השתלמות,"]:
        corp = corp.split(cut)[0]
    corp = corp.strip().rstrip(",")
    return full if corp in ("", "חברה לניהול") else corp


funds = []
for r in cur:
    funds.append({
        "i": r["FUND_ID"], "n": r["FUND_NAME"], "c": short(r["MANAGING_CORPORATION"] or ""),
        "k": r["FUND_CLASSIFICATION"], "s": r.get("SPECIALIZATION") or "", "ss": r.get("SUB_SPECIALIZATION") or "",
        "p": r.get("TARGET_POPULATION") or "",
        "f": r.get("AVG_ANNUAL_MANAGEMENT_FEE"), "fd": r.get("AVG_DEPOSIT_FEE"),
        "m": r.get("MONTHLY_YIELD"), "ytd": r.get("YEAR_TO_DATE_YIELD"), "y1": y12(monthly[r["FUND_ID"]]),
        "y3": r.get("AVG_ANNUAL_YIELD_TRAILING_3YRS"), "y5": r.get("AVG_ANNUAL_YIELD_TRAILING_5YRS"),
        "a": round(r["TOTAL_ASSETS"]) if r.get("TOTAL_ASSETS") is not None else None,
    })
funds.sort(key=lambda x: (x["k"], x["c"], x["n"]))
data = {"period": last, "fetched": time.strftime("%Y-%m-%d"), "source": "גמל נט, משרד האוצר (data.gov.il)", "funds": funds}
OUT.parent.mkdir(exist_ok=True)
OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"kranot.json: {len(funds)} מסלולים, חודש {last}, {OUT.stat().st_size // 1024} KB")
