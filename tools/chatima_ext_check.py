"""בדיקת אישור לתוסף הכרום "הכלים של גילעד רחמים" לפני העלאה לחנות.
הרצה מתיקיית הריפו:  python tools/chatima_ext_check.py [--store-zip PATH] [--axe PATH/axe.min.js] [--static-only]

שלב 1 – בדיקה סטטית (בלי דפדפן): manifest, קבצים חסרים/מיותרים, CSP (בלי סקריפט בתוך HTML ובלי onclick),
         בלי קוד מרוחק (eval / new Function / סקריפט מאתר חיצוני), תחביר JS, הרשאות שלא בשימוש, נגישות בסיסית,
         חבילת החנות (manifest בשורש, אותם קבצים, אותה גרסה), גרסה גבוהה מזו שבחנות.
שלב 2 – בדיקה חיה בכרום אמיתי (פרופיל נקי, עותק בדיקה עם <all_urls> כדי שהפעולות ירוצו בלי לחיצת משתמש):
         service worker, alarms, כל דף בלי שגיאות + axe, פעולות בפופאפ/פתקים/הדף שלי, גודל טקסט שנשמר,
         פעולות על דף (כיוון, כהה, תיקון שפה, צילום, תרגום), סקריפטים בג׳ימייל ובווטסאפ ווב על דף מדומה (https + host-resolver),
         hakelim.com אמיתי, ובדיקת 75 משפטי "מה לעשות?".
יוצא עם קוד 1 אם יש תקלה (FAIL). אזהרות (WARN) לא מכשילות, אבל צריך לקרוא אותן."""
import json, os, re, sys, subprocess, shutil, tempfile, zipfile, struct, threading, ssl, time, asyncio, urllib.request
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

ROOT = Path(__file__).resolve().parent.parent
EXT = ROOT / 'tools' / 'chatima-ext'
STORE_ID = 'ckjmijllmaoooihonpedfajaofhbegfg'
CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
fails, warns, oks = [], [], []
def FAIL(m): fails.append(m); print('  ✗ FAIL', m)
def WARN(m): warns.append(m); print('  ! WARN', m)
def OK(m): oks.append(m); print('  ✓', m)

args = sys.argv[1:]
def opt(name, default=None):
    return args[args.index(name) + 1] if name in args else default
STORE_ZIP = opt('--store-zip')
AXE = opt('--axe')

# ======================= שלב 1: סטטי =======================
print('== שלב 1: בדיקה סטטית')
man = json.loads((EXT / 'manifest.json').read_text(encoding='utf-8'))
ver = man.get('version', '')
(OK if man.get('manifest_version') == 3 else FAIL)(f'manifest_version {man.get("manifest_version")}')
(OK if re.fullmatch(r'\d+(\.\d+){0,3}', ver) else FAIL)(f'version {ver}')
(OK if len(man.get('name', '')) <= 75 else FAIL)(f'name length {len(man.get("name", ""))} (max 75)')
(OK if len(man.get('description', '')) <= 132 else FAIL)(f'description length {len(man.get("description", ""))} (max 132)')
if len(man.get('short_name', '')) > 12: FAIL('short_name over 12')

# icons: exist + real PNG size
def png_size(p):
    b = p.read_bytes()[:24]
    return struct.unpack('>II', b[16:24]) if b[:8] == b'\x89PNG\r\n\x1a\n' else None
for sz, f in man.get('icons', {}).items():
    p = EXT / f
    if not p.exists(): FAIL(f'icon missing {f}'); continue
    s = png_size(p)
    (OK if s == (int(sz), int(sz)) else FAIL)(f'icon {f} = {s}')

# every file the manifest points at
refs = set()
refs.add(man['action']['default_popup']); refs.update(man['action'].get('default_icon', {}).values())
refs.add(man['background']['service_worker']); refs.add(man.get('side_panel', {}).get('default_path', ''))
for cs in man.get('content_scripts', []): refs.update(cs.get('js', [])); refs.update(cs.get('css', []))
for w in man.get('web_accessible_resources', []): refs.update(w.get('resources', []))
refs.discard('')
miss = [r for r in refs if not (EXT / r).exists()]
(FAIL(f'manifest points to missing files: {miss}') if miss else OK(f'all {len(refs)} manifest files exist'))

# HTML: scripts/styles exist, no inline script, no inline handlers, no external scripts, a11y layer, lang/dir/title
used = set(refs)
for h in sorted(list(EXT.glob('*.html')) + list(EXT.glob('*/*.html'))):   # כולל תת-תיקיות (gesher/)
    s = h.read_text(encoding='utf-8')
    for src in re.findall(r'<script[^>]*\ssrc="([^"]+)"', s):
        if re.match(r'https?:', src): FAIL(f'{h.name}: external script {src}')
        elif not (h.parent / src).exists(): FAIL(f'{h.name}: missing script {src}')
        used.add(src)
    for href in re.findall(r'<link[^>]*\shref="([^"]+)"', s):
        if not re.match(r'https?:', href):
            if not (h.parent / href).exists(): FAIL(f'{h.name}: missing file {href}')
            used.add(href)
    for img in re.findall(r'<img[^>]*\ssrc="([^"]+)"', s): used.add(img)
    if re.search(r'<script(?![^>]*\ssrc=)[^>]*>\s*\S', s): FAIL(f'{h.name}: inline <script> (blocked by MV3 CSP)')
    if re.search(r'\son[a-z]+="', s): FAIL(f'{h.name}: inline event handler (blocked by MV3 CSP)')
    if h.name == 'offscreen.html': used.add(h.name); continue   # דף רקע נסתר (העתקה ללוח) – אין בו ממשק
    if 'a11y.css' not in s or 'a11y.js' not in s: FAIL(f'{h.name}: missing a11y.css/a11y.js')
    if not re.search(r'<html[^>]*lang="he"', s) or 'dir="rtl"' not in s: WARN(f'{h.name}: no lang="he" dir="rtl"')
    if not re.search(r'<title>[^<]+</title>', s): FAIL(f'{h.name}: no <title>')
    for m in re.finditer(r'<img(?![^>]*\salt=)[^>]*>', s): FAIL(f'{h.name}: img without alt')
    used.add(h.name)
OK('HTML: CSP / external scripts / a11y layer checked')

# JS: syntax, remote code, files referenced from code
js_all = ''
for j in sorted(list(EXT.glob('*.js')) + list(EXT.glob('*/*.js'))):
    s = j.read_text(encoding='utf-8', errors='replace'); js_all += s + '\n'
    if j.name.endswith('.min.js'): continue
    r = subprocess.run(['node', '--check', str(j)], capture_output=True, text=True)
    if r.returncode: FAIL(f'{j.name}: syntax {r.stderr.strip()[:200]}')
    if re.search(r'(?<![\w.])eval\s*\(|new Function\s*\(', s): FAIL(f'{j.name}: eval/new Function (remote code policy)')
    if re.search(r'importScripts\([^)]*https?:', s) or re.search(r"\.src\s*=\s*['\"]https?://[^'\"]+\.js", s): FAIL(f'{j.name}: loads remote script')
    if re.search(r'\bdebugger\b', s): FAIL(f'{j.name}: debugger statement')
    n = len(re.findall(r'console\.log\(', s))
    if n: WARN(f'{j.name}: {n}× console.log')
used.add('manifest.json')
for name in [p.name for p in EXT.iterdir()]:
    if name in js_all or name in json.dumps(man): used.add(name)
OK('JS syntax + remote-code scan done')

# files nobody uses (they still ship in the zip)
unused = sorted(p.name for p in EXT.iterdir() if p.is_file() and p.name not in used and p.name != 'README.txt')
(WARN(f'files not referenced anywhere: {unused}') if unused else OK('no unreferenced files'))

# permissions really used (the store rejects unused ones)
API = {'contextMenus': r'chrome\.contextMenus', 'notifications': r'chrome\.notifications', 'storage': r'chrome\.storage',
       'scripting': r'chrome\.scripting', 'alarms': r'chrome\.alarms', 'tts': r'chrome\.tts', 'tabGroups': r'chrome\.tabGroups',
       'system.memory': r'chrome\.system\.memory', 'favicon': r'_favicon', 'sidePanel': r'chrome\.sidePanel',
       'browsingData': r'chrome\.browsingData', 'offscreen': r'chrome\.offscreen', 'clipboardWrite': r"execCommand\('copy'\)", 'tabs': r"permissions: \['tabs'\]|chrome\.tabs", 'topSites': r'chrome\.topSites',
       'sessions': r'chrome\.sessions', 'unlimitedStorage': r'.', 'activeTab': r'chrome\.scripting|captureVisibleTab'}
for p in man.get('permissions', []) + man.get('optional_permissions', []):
    rx = API.get(p)
    if rx is None: WARN(f'permission {p}: no usage rule in the checker – check by hand')
    elif not re.search(rx, js_all): FAIL(f'permission {p} is not used in code')
OK(f'{len(man.get("permissions", []))} permissions + {len(man.get("optional_permissions", []))} optional are used')

# a11y regression: tiny fonts in the extension's own CSS
tiny = []
for f in list(EXT.glob('*.css')) + list(EXT.glob('*.html')) + list(EXT.glob('*/*.css')) + list(EXT.glob('*/*.html')):
    if f.name == 'translate.css': continue
    for m in re.finditer(r'font(?:-size)?\s*:\s*(?:[a-z0-9]+\s+)?(\d+(?:\.\d+)?)px', f.read_text(encoding='utf-8')):
        if float(m.group(1)) < 13: tiny.append(f'{f.name}:{m.group(1)}px')
(WARN(f'fonts under 13px: {tiny}') if tiny else OK('no font under 13px'))

# README version
rd = (EXT / 'README.txt').read_text(encoding='utf-8')
(OK if f'גרסה {ver}' in rd else WARN)(f'README mentions version {ver}')

# store version (public page)
try:
    req = urllib.request.Request(f'https://chromewebstore.google.com/detail/{STORE_ID}?hl=he', headers={'User-Agent': 'Mozilla/5.0'})
    html = urllib.request.urlopen(req, timeout=30).read().decode('utf-8', 'ignore')
    m = re.search(r'גרסה</div><div[^>]*>([^<]+)', html)
    live = m.group(1).strip() if m else None
    if live:
        t = lambda v: tuple(int(x) for x in v.split('.'))
        (OK if t(ver) > t(live) else FAIL)(f'version {ver} > store version {live}')
    else: WARN('could not read store version')
except Exception as e:
    WARN(f'store page not reachable: {e}')

# store zip
if STORE_ZIP:
    z = zipfile.ZipFile(STORE_ZIP); names = z.namelist()
    (OK if 'manifest.json' in names else FAIL)('store zip: manifest.json at the zip root')
    zm = json.loads(z.read('manifest.json')) if 'manifest.json' in names else {}
    (OK if zm.get('version') == ver else FAIL)(f'store zip version {zm.get("version")} == {ver}')
    src = sorted(p.name for p in EXT.iterdir() if p.is_file())
    diff = set(src) ^ set(names)
    (FAIL(f'store zip differs from source: {sorted(diff)}') if diff else OK(f'store zip = source ({len(names)} files)'))
    for n in names:
        if (EXT / n).exists() and z.read(n) != (EXT / n).read_bytes(): FAIL(f'store zip has an old copy of {n}')
    mb = os.path.getsize(STORE_ZIP) / 1e6
    (OK if mb < 100 else FAIL)(f'store zip {mb:.2f} MB')

if '--static-only' in args:
    print(f'\nסיכום: {len(fails)} תקלות, {len(warns)} אזהרות, {len(oks)} תקין'); sys.exit(1 if fails else 0)

# ======================= שלב 2: בכרום אמיתי =======================
print('== שלב 2: בדיקה חיה בכרום אמיתי')
from playwright.async_api import async_playwright
work = Path(tempfile.mkdtemp(prefix='hkcheck-'))
TEST = work / 'ext'
shutil.copytree(EXT, TEST)
tm = json.loads((TEST / 'manifest.json').read_text(encoding='utf-8'))
tm['host_permissions'] = ['<all_urls>']   # רק בעותק הבדיקה: activeTab דורש לחיצה של אדם
(TEST / 'manifest.json').write_text(json.dumps(tm, ensure_ascii=False), encoding='utf-8')

# local https server: mock pages for mail.google.com / web.whatsapp.com, and a plain test page
site = work / 'site'; site.mkdir()
(site / 'test.html').write_text('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Test page</title></head><body>'
    '<h1>Hello world</h1><p>This is a simple paragraph about the weather and the city library.</p>'
    '<p>Second paragraph with a <a href="#x">link</a> inside.</p><p id="he">שלום עולם, זה טקסט בעברית בתוך דף באנגלית.</p><textarea id="ta">akuo</textarea></body></html>', encoding='utf-8')
(site / 'favicon.ico').write_bytes(b'')
(site / 'mail.html').write_text('<!doctype html><html><head><meta charset="utf-8"><title>Gmail mock</title></head><body>'
    '<div role="main"><table><tr class="zA"><td class="yX"><span email="a@b.c">A</span></td><td><span class="bog">Invoice 12</span></td></tr></table></div></body></html>', encoding='utf-8')
(site / 'wa.html').write_text('<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>WhatsApp mock</title></head><body>'
    '<div id="pane-side"><div role="listitem">צ׳אט</div></div><div id="main"><footer><div contenteditable="true" role="textbox"></div></footer></div></body></html>', encoding='utf-8')
key, crt = work / 'k.pem', work / 'c.pem'
subprocess.run(['openssl', 'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', str(key), '-out', str(crt), '-days', '2', '-subj', '/CN=localhost'],
               capture_output=True, check=True)

class H(SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=str(site), **k)
    def log_message(s, *a): pass
    def do_GET(s):
        host = (s.headers.get('Host') or '').split(':')[0]
        if s.path in ('/', '') or s.path.startswith('/mail') or s.path.startswith('/?'):
            s.path = '/mail.html' if host == 'mail.google.com' else '/wa.html' if host == 'web.whatsapp.com' else s.path
        return super().do_GET()
srv = ThreadingHTTPServer(('127.0.0.1', 0), H)
ctxs = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER); ctxs.load_cert_chain(crt, key)
srv.socket = ctxs.wrap_socket(srv.socket, server_side=True)
PORT = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f'https://127.0.0.1:{PORT}'

async def live():
    async with async_playwright() as p:
        prof = work / 'prof'
        # מנוע התרגום שבתוך כרום (TranslateKit) מועתק מפרופיל בדיקה ישן, כדי לבדוק תרגום אמיתי ולא רק את הסרגל
        tk = Path(os.environ.get('HK_TRANSLATEKIT', Path.home() / '.claude/state/chrome-ext-test/prof2/TranslateKit'))
        if tk.exists(): shutil.copytree(tk, prof / 'TranslateKit')
        dbg = 9300 + (os.getpid() % 500)
        proc = subprocess.Popen([CHROME, f'--remote-debugging-port={dbg}', '--no-first-run', '--no-default-browser-check',
            '--enable-unsafe-extension-debugging', '--ignore-certificate-errors', '--window-size=1000,800', '--window-position=-2400,0',
            f'--host-resolver-rules=MAP mail.google.com 127.0.0.1:{PORT},MAP web.whatsapp.com 127.0.0.1:{PORT}',
            f'--user-data-dir={prof}', 'about:blank'])
        b = None
        for _ in range(60):
            try: b = await p.chromium.connect_over_cdp(f'http://127.0.0.1:{dbg}'); break
            except Exception: await asyncio.sleep(0.5)
        if not b: FAIL('Chrome did not start'); proc.terminate(); return
        ctx = b.contexts[0]
        bs = await b.new_browser_cdp_session()
        eid = (await bs.send('Extensions.loadUnpacked', {'path': str(TEST)}))['id']
        sw = None
        for _ in range(60):
            sws = [w for w in ctx.service_workers if eid in w.url]
            if sws: sw = sws[0]; break
            await asyncio.sleep(0.25)
        if not sw: FAIL('service worker did not start'); return
        OK('extension loaded, service worker running')
        await asyncio.sleep(2)
        v = await sw.evaluate('chrome.runtime.getManifest().version')
        (OK if v == ver else FAIL)(f'running version {v}')
        al = await sw.evaluate('chrome.alarms.getAll().then(a => a.map(x => x.name))')
        (OK if 'refresh' in al and 'nap' in al else FAIL)(f'alarms {al}')
        await sw.evaluate('menuBusy')
        miss = await sw.evaluate("Promise.all(['hk','fix','tr-sel','translate','cal','side','speak','shot','rtl','dark','lens'].map(id => chrome.contextMenus.update(id, {}).then(() => null, () => id))).then(a => a.filter(Boolean))")
        (FAIL(f'right-click menu items missing: {miss}') if miss else OK('right-click menu created (11 main items)'))
        nt = await sw.evaluate("getTools().then(t => t.length).catch(e => 'ERR ' + e)")
        (OK if isinstance(nt, int) and nt > 50 else FAIL)(f'tool list loads ({nt} tools)')

        errs = []
        async def watch(pg, label):
            s = await ctx.new_cdp_session(pg)
            await s.send('Runtime.enable')
            s.on('Runtime.exceptionThrown', lambda e: errs.append(f'{label}: {e["exceptionDetails"].get("exception", {}).get("description", e["exceptionDetails"].get("text"))[:240]}'))
            pg.on('console', lambda m: errs.append(f'{label} console.error: {m.text[:240]}') if m.type == 'error' and 'favicon' not in m.text else None)
            return s
        X = f'chrome-extension://{eid}/'
        axe_src = Path(AXE).read_text(encoding='utf-8') if AXE else None

        # --- every page: loads clean + axe
        for name in ['popup', 'sidepanel', 'home', 'tabs', 'notes', 'files', 'panui', 'welcome', 'shot', 'always', 'mic', 'pdf']:
            pg = await ctx.new_page(); await watch(pg, name)
            await pg.set_viewport_size({'width': 800, 'height': 700})
            await pg.goto(X + name + '.html'); await pg.wait_for_timeout(1200)
            if axe_src:
                await pg.evaluate(axe_src)
                vio = await pg.evaluate("axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']}}).then(r=>r.violations.map(v=>v.id+' x'+v.nodes.length))")
                (OK if not vio else FAIL)(f'{name}: axe {vio or "0"}')
            await pg.close()

        # --- popup functions
        pg = await ctx.new_page(); await watch(pg, 'popup-fn'); await pg.goto(X + 'popup.html'); await pg.wait_for_timeout(1200)
        await pg.fill('#q', 'pdf'); await pg.wait_for_timeout(500)
        n = await pg.locator('#list .tool').count(); (OK if n > 0 else FAIL)(f'popup search "pdf" → {n} tools')
        await pg.fill('#q', ''); await pg.wait_for_timeout(300)
        await pg.locator('#list .star').first.click(); await pg.wait_for_timeout(400)
        fv = await pg.evaluate("chrome.storage.sync.get('favs').then(o => (o.favs||[]).length)"); (OK if fv >= 1 else FAIL)(f'favorite star saved ({fv})')
        await pg.click('#pw-btn'); await pg.wait_for_timeout(300)
        pw = await pg.inner_text('#pw-out'); (OK if len(pw) >= 14 else FAIL)(f'strong password ({len(pw)} chars)')
        # QR: בלשונית chrome-extension:// אין כתובת דף, ולכן QR נבדק רק ידנית בפופאפ אמיתי
        await pg.click('#qr-btn'); await pg.wait_for_timeout(400)
        (OK if await pg.locator('#qr').is_visible() else FAIL)('QR section opens')
        await pg.click('.hk-sz-l'); await pg.wait_for_timeout(300)
        await pg.click('#quick summary'); await pg.wait_for_timeout(200)
        await pg.close()
        pg = await ctx.new_page(); await pg.goto(X + 'home.html'); await pg.wait_for_timeout(600)
        sz = await pg.evaluate('document.documentElement.getAttribute("data-hk-size")'); (OK if sz == 'l' else FAIL)(f'text size kept across pages ({sz})')
        await pg.click('.hk-sz-m'); await pg.close()

        # --- notes
        pg = await ctx.new_page(); await watch(pg, 'notes-fn'); await pg.goto(X + 'notes.html'); await pg.wait_for_timeout(800)
        c0 = await pg.locator('#snips .snip').count()
        await pg.click('#sn-add-btn'); await pg.fill('#sn-new', 'בברכה, בדיקה'); await pg.click('#sn-form button[type=submit]'); await pg.wait_for_timeout(400)
        c = await pg.locator('#snips .snip').count(); (OK if c == c0 + 1 else FAIL)(f'snippet saved ({c0} → {c})')
        await pg.fill('#nt-new', 'פתק בדיקה'); await pg.click('#nt-save'); await pg.wait_for_timeout(400)
        c = await pg.locator('#notes .note').count(); (OK if c >= 1 else FAIL)(f'note saved ({c})')
        await pg.locator('#snips .x').first.click(); await pg.wait_for_timeout(300)
        c = await pg.locator('#snips .snip').count(); (OK if c == c0 else FAIL)(f'snippet deleted (→ {c})')
        await pg.close()

        # --- home: add a shortcut
        pg = await ctx.new_page(); await watch(pg, 'home-fn'); await pg.goto(X + 'home.html'); await pg.wait_for_timeout(800)
        try:
            await pg.locator('.add-tile').first.click(); await pg.wait_for_timeout(200)
            await pg.fill('#add-n', 'בדיקה'); await pg.fill('#add-u', 'https://example.com/'); await pg.locator('#add button[type=submit]').click()
            await pg.wait_for_timeout(400)
            t = await pg.locator('.tile', has_text='בדיקה').count(); (OK if t else FAIL)(f'home shortcut added ({t})')
        except Exception as e: FAIL(f'home shortcut: {e}')
        await pg.close()

        # --- page actions on a normal page
        pg = await ctx.new_page(); await watch(pg, 'page'); await pg.goto(BASE + '/test.html'); await pg.wait_for_timeout(500)
        await pg.bring_to_front()
        async def act(name):
            return await sw.evaluate("async (n) => { const [t] = await chrome.tabs.query({active: true, lastFocusedWindow: true}); try { return String(await PAGE_ACTS[n](t, {})); } catch (e) { return 'ERR ' + e; } }", name)
        r = await act('rtl'); await pg.wait_for_timeout(300)
        d = await pg.evaluate("getComputedStyle(document.getElementById('he')).direction"); (OK if d == 'rtl' else FAIL)(f'RTL fix on a Hebrew paragraph ({d})')
        await act('rtl'); r = await act('dark'); await pg.wait_for_timeout(300)
        dk = await pg.evaluate('!!document.querySelector("style[id*=hk], #hk-dark, [data-hk-dark]") || getComputedStyle(document.documentElement).filter'); (OK if dk else FAIL)(f'dark mode ({dk}; {r})')
        await act('dark')
        await pg.focus('#ta'); await pg.evaluate("document.getElementById('ta').select()")
        r = await act('fix'); await pg.wait_for_timeout(300)
        tv = await pg.input_value('#ta'); (OK if tv == 'שלום' else WARN)(f'wrong-layout fix akuo → {tv!r} ({r})')
        n0 = len(ctx.pages); r = await act('shot'); await pg.wait_for_timeout(3500)
        (OK if len(ctx.pages) > n0 else FAIL)(f'full-page screenshot opens shot.html ({r})')
        for extra in list(ctx.pages):
            if 'shot.html' in extra.url: await extra.close()
        await pg.bring_to_front(); await pg.wait_for_timeout(300)
        r = await act('translate'); await pg.wait_for_timeout(2500)
        bar = await pg.evaluate("(() => { const h = document.querySelector('hk-tr-ui'); return h && h.shadowRoot ? h.shadowRoot.textContent.replace(/\s+/g, ' ').trim().slice(0, 120) : ''; })()")
        n_tr = await pg.evaluate("document.querySelectorAll('hk-tr').length")
        (OK if bar else FAIL)(f'translate bar opens: {bar!r}')
        if n_tr: OK(f'{n_tr} paragraphs translated')
        else: WARN('no paragraph translated yet – in a fresh profile Chrome first downloads the on-device model (works in a used profile)')
        await pg.close()

        # --- Gmail (mock page on mail.google.com): content scripts + sender map
        pg = await ctx.new_page(); await watch(pg, 'gmail'); await pg.goto('https://mail.google.com/mail/u/0/#inbox'); await pg.wait_for_timeout(1500)
        await pg.bring_to_front()
        r = await sw.evaluate("async () => { const [t] = await chrome.tabs.query({active: true, lastFocusedWindow: true}); await chrome.scripting.executeScript({target: {tabId: t.id}, files: ['gmail-map.js']}); return t.url; }")
        await pg.wait_for_timeout(1200)
        h = await pg.evaluate("!!document.getElementById('hk-gm-host')"); (OK if h else FAIL)(f'Gmail sender map panel opens ({r})')
        await pg.close()

        # --- WhatsApp Web (mock): organizer + speak button scripts
        pg = await ctx.new_page(); await watch(pg, 'wa'); await pg.goto('https://web.whatsapp.com/'); await pg.wait_for_timeout(800)
        await pg.bring_to_front()
        await sw.evaluate("async () => { const [t] = await chrome.tabs.query({active: true, lastFocusedWindow: true}); await chrome.scripting.executeScript({target: {tabId: t.id}, func: () => { window.__hkWaOpen = true; }}); await chrome.scripting.executeScript({target: {tabId: t.id}, files: ['dibur.js', 'wa.js']}); }")
        await pg.wait_for_timeout(1500)
        h = await pg.evaluate("!!document.getElementById('hk-wa-host')"); (OK if h else FAIL)('WhatsApp Web organizer loads')
        await pg.close()

        # --- real hakelim.com (bridge content script)
        pg = await ctx.new_page(); await watch(pg, 'hakelim'); await pg.goto('https://hakelim.com/kelim/machshev/chatima/tosaf/'); await pg.wait_for_timeout(2500)
        await pg.close()

        ext_errs = [e for e in errs if 'chrome-extension://' in e or e.split(':')[0] in
                    ('popup', 'sidepanel', 'home', 'tabs', 'notes', 'files', 'panui', 'welcome', 'shot', 'always', 'mic', 'pdf', 'popup-fn', 'notes-fn', 'home-fn')]
        other = [e for e in errs if e not in ext_errs]
        (FAIL(f'errors from the extension: {ext_errs[:12]}') if ext_errs else OK('no errors from the extension in any page'))
        if other: WARN(f'page errors not from the extension (mock/site): {other[:6]}')
        await b.close(); proc.terminate()

asyncio.run(live())
srv.shutdown()

r = subprocess.run(['node', str(ROOT / 'tools' / 'chatima_cmd_test.js')], capture_output=True, text=True, encoding='utf-8')
last = (r.stdout.strip().splitlines() or [''])[-1]
(OK if r.returncode == 0 and 'עברו' in last else FAIL)(f'"מה לעשות?" sentences: {last}')
shutil.rmtree(work, ignore_errors=True)
print(f'\nסיכום: {len(fails)} תקלות, {len(warns)} אזהרות, {len(oks)} תקין')
for f in fails: print('  ✗', f)
for w in warns: print('  !', w)
sys.exit(1 if fails else 0)
