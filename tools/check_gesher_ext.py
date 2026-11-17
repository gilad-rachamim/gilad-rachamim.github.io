"""בדיקה חיה של הגשר בתוסף: כרום נקי (פרופיל זמני) + עותק בדיקה של התוסף + "טלפון מדומה" ב-node.
הרצה מתיקיית הריפו:  python -I -X utf8 tools/check_gesher_ext.py [כתובת-שרת] [תיקיית-צילומים]
ברירת מחדל: השרת החי https://kelim-gesher.gilad4049.workers.dev
בודק: דף הצימוד מציג QR, הטלפון המדומה מצמד את עצמו, המחשב מציג "מחובר", ואז קודים מוצפנים נכנסים לבד
לשדה רגיל, ל-6 תיבות, לשדה של React – ולא נכנסים לשדה סיסמה, חיפוש או צ'אט. בסוף: ניתוק.
"""
import json, os, sys, subprocess, shutil, tempfile, threading, time, asyncio
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
EXT = ROOT / 'tools' / 'chatima-ext'
PHONE = ROOT / 'tools' / 'gesher_fake_phone.js'
CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
SERVER = sys.argv[1] if len(sys.argv) > 1 else 'https://kelim-gesher.gilad4049.workers.dev'
SHOTS = Path(sys.argv[2]) if len(sys.argv) > 2 else None
oks, fails = [], []
def ok(c, m, extra=''):
    (oks if c else fails).append(m)
    print(('  ✓ ' if c else '  ✗ ') + m + ('' if c or not extra else '  — ' + str(extra)), flush=True)

work = Path(tempfile.mkdtemp(prefix='hkgesher-'))
TEST = work / 'ext'
shutil.copytree(EXT, TEST)
tm = json.loads((TEST / 'manifest.json').read_text(encoding='utf-8'))
tm['host_permissions'] = ['<all_urls>']                 # בעותק הבדיקה בלבד: בלי חלון הרשאה
tm['permissions'] = tm['permissions'] + ['clipboardWrite']
(TEST / 'manifest.json').write_text(json.dumps(tm, ensure_ascii=False), encoding='utf-8')
state = work / 'phone.json'

# ---- דף בדיקה מקומי עם כל סוגי השדות ----
site = work / 'site'; site.mkdir()
(site / 'index.html').write_text('''<!doctype html><html dir="rtl" lang="he"><meta charset="utf-8"><title>דף בדיקה – קוד אימות</title>
<style>body{font:18px system-ui;padding:20px;background:#fff;color:#111} fieldset{margin:12px 0;padding:10px 14px} input{font-size:20px;margin:4px} .boxes input{width:34px;text-align:center}</style>
<h1>דף בדיקה: שדות קוד אימות</h1>
<fieldset id="f1"><legend>1. שדה רגיל</legend><label>קוד אימות <input id="otp" autocomplete="one-time-code" inputmode="numeric" maxlength="6"></label></fieldset>
<fieldset id="f2" hidden><legend>2. שש תיבות</legend><div class="boxes"><input maxlength="1"><input maxlength="1"><input maxlength="1"><input maxlength="1"><input maxlength="1"><input maxlength="1"></div></fieldset>
<fieldset id="f3" hidden><legend>3. שדה של React (מאזין ל-input)</legend><label>Verification code <input id="react" name="verificationCode"></label> <span id="rv"></span></fieldset>
<fieldset><legend>מלכודות – לא אמורות להתמלא</legend>
<label>סיסמה <input id="pw" type="password"></label> <label>חיפוש <input id="search" type="search" name="q"></label> <label>הודעה בצ'אט <input id="chat" name="message" placeholder="כתבו הודעה"></label></fieldset>
<script>
var r=document.getElementById('react');var stateVal='';
r.addEventListener('input',function(e){stateVal=e.target.value;document.getElementById('rv').textContent='react state: '+stateVal;});
window.reactState=function(){return stateVal};
function only(n){for(var i=1;i<=3;i++)document.getElementById('f'+i).hidden=i!==n;}
</script></html>''', encoding='utf-8')
class Q(SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=str(site), **k)
    def log_message(s, *a): pass
httpd = ThreadingHTTPServer(('127.0.0.1', 0), Q)
PORT = httpd.server_address[1]
threading.Thread(target=httpd.serve_forever, daemon=True).start()
PAGE = f'http://127.0.0.1:{PORT}/index.html'

def phone(*args, timeout=40):
    r = subprocess.run(['node', str(PHONE), *args], capture_output=True, text=True, encoding='utf-8', timeout=timeout)
    return r.returncode, (r.stdout + r.stderr).strip()

async def main():
    async with async_playwright() as p:
        dbg = 9800 + (os.getpid() % 150)
        proc = subprocess.Popen([CHROME, f'--remote-debugging-port={dbg}', '--no-first-run', '--no-default-browser-check',
            '--enable-unsafe-extension-debugging', '--window-size=1000,900', '--window-position=-2400,0',
            f'--user-data-dir={work / "prof"}', 'about:blank'])
        b = None
        try:
            for _ in range(60):
                try: b = await p.chromium.connect_over_cdp(f'http://127.0.0.1:{dbg}'); break
                except Exception: await asyncio.sleep(0.5)
            if not b: ok(False, 'כרום עלה'); return
            ctx = b.contexts[0]
            bs = await b.new_browser_cdp_session()
            eid = (await bs.send('Extensions.loadUnpacked', {'path': str(TEST)}))['id']
            sw = None
            for _ in range(40):
                sws = [w for w in ctx.service_workers if eid in w.url]
                if sws: sw = sws[0]; break
                await asyncio.sleep(0.25)
            ok(sw is not None, 'ה-service worker של התוסף עלה (כולל gesher/link.js)')
            if sw: ok(await sw.evaluate('typeof self.Gesher === "object" && typeof self.GesherCrypto === "object"'), 'הגשר נטען ב-service worker')

            # ---- צימוד ----
            pg = await ctx.new_page()
            await pg.set_viewport_size({'width': 900, 'height': 1000})
            pg.on('console', lambda m: print('    [דף]', m.type, m.text[:200]))
            pg.on('pageerror', lambda e: print('    [שגיאה]', str(e)[:300]))
            q = '' if SERVER.startswith('https://') else '?w=' + SERVER
            await pg.goto(f'chrome-extension://{eid}/gesher/gesher.html{q}')
            await pg.wait_for_selector('#off:not([hidden])', timeout=8000)
            if SHOTS: await pg.screenshot(path=str(SHOTS / '1-לפני-חיבור.png'))
            await pg.click('#start')
            await pg.wait_for_selector('#qr[data-url]', state='attached', timeout=15000)
            url = await pg.evaluate("document.getElementById('qr').dataset.url")
            ok(url.startswith('https://hakelim.com/kelim/g/#'), 'דף הצימוד מציג QR עם קישור hakelim.com/kelim/g/#…')
            ok(await pg.locator('#qr img, #qr canvas').count() > 0, 'ציור ה-QR קיים בדף')
            if SHOTS: await pg.screenshot(path=str(SHOTS / '2-QR.png'))
            rc, out = await asyncio.to_thread(phone, 'pair', url, str(state))
            ok(rc == 0, 'הטלפון המדומה סרק וצומד', out)
            await pg.wait_for_selector('#on:not([hidden])', timeout=15000)
            ok('טלפון מדומה' in await pg.inner_text('#phone-name'), 'המחשב מציג "מחובר ל-טלפון מדומה"')
            st = ''
            for _ in range(40):
                st = await pg.inner_text('#status-txt')
                if st and 'מתחבר לשרת' not in st: break
                await asyncio.sleep(0.5)
            ok(st and 'מתחבר לשרת' not in st, 'התוסף מחובר לשרת עם האסימון הקבוע: ' + st, st)

            # ---- קודים ----
            t = await ctx.new_page()
            await t.set_viewport_size({'width': 900, 'height': 700})
            await t.goto(PAGE)
            await t.bring_to_front()
            await t.focus('#otp')
            await asyncio.sleep(1.2)   # watch.js מדווח על השדה
            rc, out = await asyncio.to_thread(phone, 'send', str(state), '483920', 'sms', 'בנק הבדיקות')
            ack = json.loads(out) if rc == 0 else {}
            ok(rc == 0 and ack.get('filled') is True, 'קוד SMS הגיע, והטלפון קיבל אישור "הוזן"', out)
            ok(await t.input_value('#otp') == '483920', 'שדה רגיל (one-time-code) התמלא לבד: 483920')
            ok(all([await t.input_value(s) == '' for s in ('#pw', '#search', '#chat')]), 'סיסמה, חיפוש וצ\'אט לא התמלאו')
            if SHOTS: await t.screenshot(path=str(SHOTS / '3-שדה-מולא.png'))

            await t.evaluate('only(2)'); await t.focus('.boxes input'); await asyncio.sleep(1)
            rc, out = await asyncio.to_thread(phone, 'send', str(state), '771204', 'whatsapp', 'ווטסאפ עסקי')
            boxes = ''.join(await t.eval_on_selector_all('.boxes input', 'els => els.map(e => e.value)'))
            ok(boxes == '771204', 'שש תיבות התמלאו: ' + boxes, out)

            await t.evaluate('only(3)'); await t.focus('#react'); await asyncio.sleep(1)
            rc, out = await asyncio.to_thread(phone, 'send', str(state), '55821', 'mail', 'Google')
            ok(await t.evaluate('reactState()') == '55821', 'שדה React קיבל את הקוד גם ב-state', out)

            # בלי שדה קוד בכלל: לא ממלאים כלום, האישור אומר filled:false
            await t.evaluate('only(0)'); await t.focus('#chat'); await asyncio.sleep(1)
            rc, out = await asyncio.to_thread(phone, 'send', str(state), '909090', 'sms', '')
            ack = json.loads(out) if rc == 0 else {}
            ok(rc == 0 and ack.get('filled') is False and await t.input_value('#chat') == '', 'כשאין שדה קוד – לא ממלאים שום שדה אחר (גם לא את הצ\'אט שבפוקוס)', out)
            last = await sw.evaluate("chrome.storage.session.get('gLast').then(o => o.gLast)")
            ok(last and last.get('code') == '909090' and last.get('src') == 'sms', 'הקוד האחרון נשמר עם המקור (sms) – להקלדה בקיצור מקשים')

            await pg.bring_to_front(); await pg.reload()
            await pg.wait_for_selector('#on:not([hidden])', timeout=8000)
            await asyncio.sleep(1)
            if SHOTS: await pg.screenshot(path=str(SHOTS / '4-מחובר.png'))

            # ---- ניתוק ----
            pg.once('dialog', lambda d: asyncio.ensure_future(d.accept()))
            await pg.click('#unpair')
            await pg.wait_for_selector('#off:not([hidden])', timeout=10000)
            gone = False
            for _ in range(20):
                gone = await sw.evaluate("GesherStore.get('pair').then(p => !p)")
                if gone: break
                await asyncio.sleep(0.25)
            ok(gone, 'אחרי ניתוק המפתחות נמחקו מהמחשב')
            rc, out = await asyncio.to_thread(phone, 'send', str(state), '111111', timeout=25)
            ok(rc != 0, 'אחרי ניתוק הטלפון כבר לא יכול לשלוח', out)
        finally:
            try:
                if b: await b.close()
            except Exception: pass
            proc.terminate()

asyncio.run(main())
httpd.shutdown()
try: state.unlink()
except Exception: pass
shutil.rmtree(work, ignore_errors=True)
print(f"\n{'✓' if not fails else '✗'} {len(oks)}/{len(oks) + len(fails)}")
sys.exit(1 if fails else 0)
