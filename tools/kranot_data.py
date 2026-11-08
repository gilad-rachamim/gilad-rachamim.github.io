"""נתוני גמל-נט (משרד האוצר, data.gov.il) לכלי "מעקב קרנות השתלמות וגמל" ב-/kesef/kranot/.

מושך את כל המסלולים בחודש האחרון שפורסם, ומחשב תשואה ל-12 חודשים מ-12 החודשים האחרונים.
גם פנסיה-נט (קרנות פנסיה מקיפות וכלליות): אין שם שדה התמחות, אז ההתמחות נגזרת משם המסלול.
אם פנסיה-נט לא עונה, נשארים מסלולי הפנסיה מהקובץ הקודם.
כותב kesef/kranot.json (קובץ קטן שהדפדפן קורא). רץ פעם בחודש ב-GitHub Action (.github/workflows/kranot.yml).
אם המשיכה נכשלת, הקובץ הקיים נשאר ולא נדרס.
הרצה: python tools/kranot_data.py
"""
import json, sys, time, urllib.parse, urllib.request
from pathlib import Path

RES = "a30dcbea-a1d2-482c-ae29-8f781f5025fb"   # גמל-נט 2024 ואילך
RES_P = "6d47d6b5-cb08-488b-b333-f1e717b1e1bd"   # פנסיה-נט 2024 ואילך (b58b5a80... הוא רק תיאור השדות, לא הנתונים)
P_KIND = {"קרנות חדשות": "קרן פנסיה מקיפה", "קרנות כלליות": "קרן פנסיה כללית (משלימה)"}
API = "https://data.gov.il/api/3/action/datastore_search"
OUT = Path(__file__).resolve().parent.parent / "kesef" / "kranot.json"
UA = "Mozilla/5.0 (kelim kranot monthly)"


def get(params, tries=4, fatal=True):
    url = API + "?" + urllib.parse.urlencode(params)
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)["result"]
        except Exception as e:  # רשת, חסימה זמנית, תשובה שאינה JSON
            print("retry", i + 1, e, file=sys.stderr)
            time.sleep(5 * (i + 1))
    if fatal:
        raise SystemExit("data.gov.il לא ענה. הקובץ הקיים נשאר.")
    raise RuntimeError("data.gov.il לא ענה")


def period(p, res=RES, fatal=True):
    return get({"resource_id": res, "limit": 2000, "filters": json.dumps({"REPORT_PERIOD": p})}, fatal=fatal)["records"]


def prev(p, n=1):
    y, m = divmod(p, 100)
    m -= n
    while m < 1:
        m += 12; y -= 1
    return y * 100 + m


def months12(cur, last, res, fatal=True):
    # תשואה מצטברת ל-12 חודשים: מכפלת התשואות החודשיות (רק למסלול שיש לו את כל 12 החודשים)
    monthly = {r["FUND_ID"]: [r.get("MONTHLY_YIELD")] for r in cur}
    for k in range(1, 12):
        seen = {r["FUND_ID"]: r.get("MONTHLY_YIELD") for r in period(prev(last, k), res, fatal)}
        for fid, arr in monthly.items():
            arr.append(seen.get(fid))
    return monthly


last = get({"resource_id": RES, "limit": 1, "sort": "REPORT_PERIOD desc"})["records"][0]["REPORT_PERIOD"]
cur = period(last)
if len(cur) < 300:
    raise SystemExit(f"רק {len(cur)} מסלולים ב-{last}, משהו לא בסדר. הקובץ הקיים נשאר.")
monthly = months12(cur, last, RES)


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


def p_spec(n):
    # התמחות של מסלול פנסיה לפי השם שלו (בפנסיה-נט אין שדה כזה)
    import re
    for pat, name in [(r"קצבה|פנסיונר", "למקבלי קצבה"), (r"50 ומטה|עד 50(?!\s*עד)", "לבני 50 ומטה"),
                      (r"50\s*(-|עד)\s*60", "לבני 50-60"), (r"60 ומעלה", "לבני 60 ומעלה"), (r"S&P|500", "עוקב מדד S&P 500"),
                      (r"שריעה", "שריעה"), (r"הלכה", "הלכה"), (r"קיימות", "קיימות"), (r"עוקב מדדי מניות", "עוקב מדדי מניות"),
                      (r'עוקב מדדי אג"?ח', 'עוקב מדדי אג"ח'), (r"עוקב מדדים|גמיש", "עוקב מדדים גמיש"), (r"משולב סחיר", "משולב סחיר"),
                      (r"מניות סחיר", "מניות סחיר"), (r'אג"?ח סחיר', 'אג"ח סחיר'), (r"מניות", "מניות"),
                      (r'אשראי ואג"?ח|אג"?ח', 'אשראי ואג"ח'), (r"כספי|שקלי", "כספי (שקלי)"), (r"כללי|בסיסי", "כללי")]:
        if re.search(pat, n, re.I):
            return name
    return "אחר"


try:
    plast = get({"resource_id": RES_P, "limit": 1, "sort": "REPORT_PERIOD desc"}, fatal=False)["records"][0]["REPORT_PERIOD"]
    pcur = [r for r in period(plast, RES_P, False) if r.get("FUND_CLASSIFICATION") in P_KIND]
    if len(pcur) < 150:
        raise RuntimeError(f"רק {len(pcur)} מסלולי פנסיה")
    pmon = months12(pcur, plast, RES_P, False)
    for r in pcur:
        name = " ".join(r["FUND_NAME"].replace("S1;P", "S&P").replace("s1;p", "S&P").split())
        sp = p_spec(name)
        funds.append({
            "i": "p%s" % r["FUND_ID"], "n": name, "c": short(r["MANAGING_CORPORATION"] or ""),
            "k": P_KIND[r["FUND_CLASSIFICATION"]], "s": sp, "ss": "",
            "p": "מקבלי קצבה" if sp == "למקבלי קצבה" else "כלל האוכלוסיה",
            "f": r.get("AVG_ANNUAL_MANAGEMENT_FEE"), "fd": r.get("AVG_DEPOSIT_FEE"),
            "m": r.get("MONTHLY_YIELD"), "ytd": r.get("YEAR_TO_DATE_YIELD"), "y1": y12(pmon[r["FUND_ID"]]),
            "y3": r.get("AVG_ANNUAL_YIELD_TRAILING_3YRS"), "y5": r.get("AVG_ANNUAL_YIELD_TRAILING_5YRS"),
            "a": round(r["TOTAL_ASSETS"]) if r.get("TOTAL_ASSETS") is not None else None,
        })
    print(f"פנסיה-נט: {len(pcur)} מסלולים, חודש {plast}")
except Exception as e:
    old = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {"funds": []}
    keep = [f for f in old["funds"] if f["k"] in P_KIND.values()]
    funds += keep
    print(f"פנסיה-נט לא ענה ({e}). נשארו {len(keep)} מסלולי פנסיה מהקובץ הקודם.", file=sys.stderr)
funds.sort(key=lambda x: (x["k"], x["c"], x["n"]))
data = {"period": last, "fetched": time.strftime("%Y-%m-%d"), "source": "גמל נט ופנסיה נט, משרד האוצר (data.gov.il)", "funds": funds}
OUT.parent.mkdir(exist_ok=True)
OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"kranot.json: {len(funds)} מסלולים, חודש {last}, {OUT.stat().st_size // 1024} KB")
