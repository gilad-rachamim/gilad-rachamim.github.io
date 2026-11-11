"""קודי שותפים ל"תמונה שמתעוררת" (20 ₪ לשירות הענן = החייאה בלי הגבלה).
אותו חישוב כמו codeFor ב-chaye-worker.js: מספר בן 3 ספרות + 5 ספרות HMAC-SHA256 של הסוד.
הסוד נקרא מ-~/.claude/secrets/chaye-partner-secret.txt (אותו סוד שהועלה ל-Worker כ-PARTNER_SECRET) ולא מודפס.
שימוש:  python -I partner_codes.py 1 50 [--out FILE]
ביטול קוד: מוסיפים את המספר שלו ל-REVOKED ב-wrangler.toml ([vars]) ופורסים שוב.
"""
import hashlib, hmac, os, sys
sys.stdout.reconfigure(encoding="utf-8")
SECRET = open(os.path.join(os.path.expanduser("~"), ".claude", "secrets", "chaye-partner-secret.txt"), encoding="utf-8").read().strip()


def code_for(n):
    sig = hmac.new(SECRET.encode(), f"chaye-partner:{n}".encode(), hashlib.sha256).digest()
    return f"{n:03d}-{int.from_bytes(sig[:4], 'big') % 100000:05d}"


if __name__ == "__main__":
    a, b = int(sys.argv[1]), int(sys.argv[2])
    lines = [code_for(n) for n in range(a, b + 1)]
    if "--out" in sys.argv:
        with open(sys.argv[sys.argv.index("--out") + 1], "w", encoding="utf-8-sig") as f:
            f.write("\n".join(lines) + "\n")
        print(f"wrote {len(lines)} codes")
    else:
        print("\n".join(lines))
