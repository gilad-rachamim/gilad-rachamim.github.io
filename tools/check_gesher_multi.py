"""בדיקה חיה: מחשב אחד עם שני טלפונים (למשל אייפון + אנדרואיד). כרום נקי + עותק בדיקה של התוסף + שני "טלפונים מדומים".
הרצה מתיקיית הריפו:  python -I -X utf8 tools/check_gesher_multi.py [כתובת-שרת] [תיקיית-צילומים]
בודק: צימוד שני לא מנתק את הראשון; שניהם שולחים קוד ומקבלים אישור (כל תשובה חוזרת לטלפון הנכון);
העתקה במחשב מגיעה לשני הטלפונים (גם אם לא היו מחוברים ברגע ההעתקה); הודעה לטלפון אחד לא מגיעה לשני;
המסך מציג רשימה עם שני הטלפונים ובוחר לאיזה טלפון לשלוח קובץ; ניתוק טלפון אחד משאיר את השני עובד; ניתוק אחרון מוחק הכול.
"""
import json, os, sys, subprocess, shutil, tempfile, asyncio
from pathlib import Path
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
    print(('  ✓ ' if c else '  ✗ ') + m + ('' if c or not extra else '  — ' + str(extra)[:300]), flush=True)

work = Path(tempfile.mkdtemp(prefix='hkgesher2-'))
TEST = work / 'ext'
shutil.copytree(EXT, TEST)
tm = json.loads((TEST / 'manifest.json').read_text(encoding='utf-8'))
tm['host_permissions'] = ['<all_urls>']
tm['permissions'] = tm['permissions'] + ['clipboardWrite', 'clipboardRead', 'downloads']
(TEST / 'manifest.json').write_text(json.dumps(tm, ensure_ascii=False), encoding='utf-8')
A, B = work / 'a.json', work / 'b.json'
NA, NB = 'אייפון מדומה', 'אנדרואיד מדומה'

def phone(*args, timeout=40):
    r = subprocess.run(['node', str(PHONE), *args], capture_output=True, text=True, encoding='utf-8', timeout=timeout)
    return r.returncode, (r.stdout + r.stderr).strip()
def room(f): return json.loads(f.read_text(encoding='utf-8'))['room']

async def main():
    async with async_playwright() as p:
        dbg = 9600 + (os.getpid() % 150)
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
            ok(sw is not None, 'התוסף עלה')
            pg = await ctx.new_page()
            await pg.set_viewport_size({'width': 900, 'height': 1100})
            pg.on('pageerror', lambda e: print('    [שגיאה בדף]', str(e)[:300]))
            q = '' if SERVER.startswith('https://') else '?w=' + SERVER
            await pg.goto(f'chrome-extension://{eid}/gesher/gesher.html{q}')
            await pg.wait_for_selector('#off:not([hidden])', timeout=8000)
            ok('אייפון' in await pg.inner_text('#off'), 'במסך הפתיחה כתוב איך מחברים גם אייפון')

            async def pair_one(btn, f, name):
                await pg.click(btn)
                try:
                    await pg.wait_for_function("() => { const q = document.getElementById('qr'); return q && q.dataset.url && !document.getElementById('pairing').hidden; }", timeout=15000)
                except Exception:
                    print('    [מצב הדף]', await pg.evaluate("[...document.querySelectorAll('section,[id$=msg]')].filter(e=>!e.hidden).map(e=>e.id+': '+e.innerText.slice(0,120)).join(' | ')"))
                    raise
                url = await pg.evaluate("document.getElementById('qr').dataset.url")
                rc, out = await asyncio.to_thread(phone, 'pair', url, str(f), name)
                ok(rc == 0, f'«{name}» סרק וצומד', out)
                await pg.wait_for_selector('#on:not([hidden])', timeout=15000)
                await asyncio.sleep(1.5)

            # ---- טלפון ראשון ----
            await pair_one('#start', A, NA)
            ok(NA in await pg.inner_text('#phone-name'), 'מחובר לטלפון הראשון')
            ok(await pg.is_visible('#add'), 'יש כפתור "חיבור טלפון נוסף"')
            ok(not await pg.is_visible('#phones') and await pg.is_visible('#unpair'), 'עם טלפון אחד – המסך נראה כמו קודם')
            rc, out = await asyncio.to_thread(phone, 'send', str(A), '314159', 'sms', 'בנק הבדיקות')
            ok(rc == 0, 'הטלפון הראשון שלח קוד וקיבל אישור', out)

            # ---- טלפון שני ----
            await pair_one('#add', B, NB)
            msg = await pg.inner_text('#on-msg')
            ok('נוסף' in msg and '2' in msg, 'הודעה: הטלפון השני נוסף, 2 טלפונים מחוברים', msg)
            ok('2 טלפונים' in await pg.inner_text('#phone-name'), 'הכותרת: "מחובר ל-2 טלפונים"')
            rows = await pg.locator('#phones li').all_inner_texts()
            ok(len(rows) == 2 and any(NA in r for r in rows) and any(NB in r for r in rows), 'ברשימה שני הטלפונים, כל אחד עם "ניתוק" משלו', rows)
            pairs = await sw.evaluate("GesherStore.get('pairs').then(a => (a||[]).map(p => p.name))")
            ok(pairs == [NA, NB], 'במחשב שמורים שני צימודים', pairs)
            if SHOTS: await pg.screenshot(path=str(SHOTS / 'שני-טלפונים.png'), full_page=True)

            # הצימוד השני לא ניתק את הראשון; התשובות חוזרות לטלפון הנכון (אחרת האישור לא היה נפתח בהצפנה שלו)
            rc, out = await asyncio.to_thread(phone, 'send', str(A), '271828', 'sms', 'בנק הבדיקות')
            ok(rc == 0, 'אחרי צימוד השני – הראשון עדיין שולח ומקבל אישור', out)
            rc, out = await asyncio.to_thread(phone, 'send', str(B), '161803', 'whatsapp', 'ווטסאפ')
            ok(rc == 0, 'גם השני שולח קוד ומקבל אישור', out)

            # ---- העתקה במחשב -> לשני הטלפונים (הם לא מחוברים עכשיו – מגיע כשמתחברים) + הודעה רק לשני ----
            await sw.evaluate("Gesher.localClip('טקסט בדיקה לשני הטלפונים')")
            ta = asyncio.create_task(asyncio.to_thread(phone, 'recv', str(A), '9', timeout=30))
            tb = asyncio.create_task(asyncio.to_thread(phone, 'recv', str(B), '9', timeout=30))
            await asyncio.sleep(4)
            rb = room(B)
            await sw.evaluate("r => Gesher.send({ type: 'clip', id: 'only-b', text: 'רק לטלפון השני', at: Date.now() }, r)", rb)
            (rca, oa), (rcb, ob) = await ta, await tb
            ga = json.loads(oa) if rca == 0 else []; gb = json.loads(ob) if rcb == 0 else []
            ta_ = [x.get('text') for x in ga if x.get('type') == 'clip']; tb_ = [x.get('text') for x in gb if x.get('type') == 'clip']
            ok('טקסט בדיקה לשני הטלפונים' in ta_ and 'טקסט בדיקה לשני הטלפונים' in tb_, 'העתקה במחשב הגיעה לשני הטלפונים', (ta_, tb_))
            ok('רק לטלפון השני' in tb_ and 'רק לטלפון השני' not in ta_, 'הודעה לטלפון אחד הגיעה רק אליו', (ta_, tb_))
            ok(not any(x.get('bad') for x in ga + gb), 'כל טלפון פתח את ההודעות בהצפנה שלו')
            left = await sw.evaluate("chrome.storage.session.get('gClipOut').then(o => o.gClipOut ? o.gClipOut.rooms : [])")
            ok(left == [], 'שני הטלפונים אישרו קבלה – המחשב מחק את ההעתקה מהתור', left)

            # ---- בחירת טלפון לקובץ ----
            await asyncio.sleep(5.5)
            opts = await pg.locator('#file-to option').all_inner_texts()
            ok(await pg.is_visible('#file-to-wrap') and len(opts) == 2, 'באזור הקבצים: "לאיזה טלפון לשלוח" עם שתי אפשרויות', opts)
            st = await sw.evaluate("Gesher.load().then(p => p && p.name)")
            ok(st in (NA, NB), 'יש טלפון ברירת מחדל לשליחה: ' + str(st))

            # ---- ניתוק טלפון אחד ----
            pg.once('dialog', lambda d: asyncio.ensure_future(d.accept()))
            await pg.locator('#phones li', has_text=NA).locator('button').click()
            for _ in range(30):
                pairs = await sw.evaluate("GesherStore.get('pairs').then(a => (a||[]).map(p => p.name))")
                if pairs == [NB]: break
                await asyncio.sleep(0.3)
            ok(pairs == [NB], 'אחרי ניתוק הראשון נשאר רק השני', pairs)
            await asyncio.sleep(1.5)
            ok(NB in await pg.inner_text('#phone-name') and await pg.is_visible('#unpair'), 'המסך חזר לתצוגה של טלפון אחד')
            rc, out = await asyncio.to_thread(phone, 'send', str(A), '111111', timeout=25)
            ok(rc != 0, 'הטלפון שנותק כבר לא יכול לשלוח', out)
            rc, out = await asyncio.to_thread(phone, 'send', str(B), '222333', 'sms', 'בנק הבדיקות')
            ok(rc == 0, 'הטלפון השני ממשיך לעבוד', out)
            if SHOTS: await pg.screenshot(path=str(SHOTS / 'אחרי-ניתוק-אחד.png'), full_page=True)

            # ---- ניתוק אחרון ----
            pg.once('dialog', lambda d: asyncio.ensure_future(d.accept()))
            await pg.click('#unpair')
            await pg.wait_for_selector('#off:not([hidden])', timeout=10000)
            gone = False
            for _ in range(20):
                gone = await sw.evaluate("Promise.all([GesherStore.get('pair'), GesherStore.get('pairs')]).then(r => !r[0] && !(r[1] && r[1].length))")
                if gone: break
                await asyncio.sleep(0.25)
            ok(gone, 'אחרי ניתוק האחרון – כל המפתחות נמחקו')
            rc, out = await asyncio.to_thread(phone, 'send', str(B), '444555', timeout=25)
            ok(rc != 0, 'גם השני כבר לא יכול לשלוח', out)
        finally:
            try:
                if b: await b.close()
            except Exception: pass
            proc.terminate()

asyncio.run(main())
for f in (A, B):
    try: f.unlink()
    except Exception: pass
shutil.rmtree(work, ignore_errors=True)
print(f"\n{'✓' if not fails else '✗'} {len(oks)}/{len(oks) + len(fails)}")
sys.exit(1 if fails else 0)
