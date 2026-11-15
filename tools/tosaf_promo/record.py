"""מקליט את תוסף הכרום בפעולה אמיתית (CDP screencast) לסרטון ההדמיה.

תלוי בסביבת הבדיקה של התוסף: ~/.claude/state/chrome-ext-test (harness.py + פרופיל prof2 שבו מנוע התרגום של כרום כבר ירד).
הרצה: HKSRC=<tools/chatima-ext> python tools/tosaf_promo/record.py <תיקיית פלט>
יוצא: seg-<name>/NNNNN.jpg + seg-<name>/times.json לכל קטע.
"""
import sys, os, asyncio, json, base64, pathlib, threading, functools, http.server
sys.stdout.reconfigure(encoding="utf-8")
T = pathlib.Path(os.path.expanduser("~/.claude/state/chrome-ext-test"))
sys.path.insert(0, str(T))
os.environ.setdefault("HKSRC", str(pathlib.Path(__file__).resolve().parents[1] / "chatima-ext"))
from playwright.async_api import async_playwright
from harness import boot, act

OUT = pathlib.Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
ONLY = sys.argv[2:]  # אפשר להקליט רק חלק מהקטעים

PORT = 8832
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), functools.partial(Q, directory=str(T / "site")))
threading.Thread(target=srv.serve_forever, daemon=True).start()

# כיתוב זהב-שחור למעלה + עיגול "עכבר" + מקש. translate="no" כדי שהתוסף לא יגע בהם.
UI = r"""([kind, a, b]) => {
  let r = document.getElementById('hkdemo');
  if (!r) { r = document.createElement('div'); r.id = 'hkdemo'; r.setAttribute('translate', 'no');
    for (const id of ['hkc', 'hkk', 'hkm']) { const d = document.createElement('div'); d.id = id; r.appendChild(d); }
    const s = document.createElement('style'); s.textContent = `
      #hkdemo{all:initial;position:fixed;inset:0;pointer-events:none;z-index:2147483646;font-family:Assistant,Arial,sans-serif;direction:rtl}
      #hkc{position:absolute;top:18px;left:50%;transform:translate(-50%,-20px);opacity:0;transition:all .45s ease;background:rgba(12,15,14,.94);color:#fff;border:2px solid #e2b85c;border-radius:16px;padding:12px 26px;font-size:30px;font-weight:700;white-space:nowrap;box-shadow:0 10px 30px rgba(0,0,0,.35)}
      #hkc.on{opacity:1;transform:translate(-50%,0)} #hkc b{color:#e2b85c}
      #hkk{position:absolute;bottom:120px;left:50%;transform:translateX(-50%) scale(.6);opacity:0;transition:all .25s;direction:ltr;display:flex;gap:10px}
      #hkk.on{opacity:1;transform:translateX(-50%) scale(1)}
      #hkk span{background:#141a18;color:#e2b85c;border:2px solid #e2b85c;border-bottom-width:6px;border-radius:12px;padding:10px 20px;font:700 34px Arial}
      #hkm{position:absolute;width:44px;height:44px;border-radius:50%;border:4px solid #e2b85c;background:rgba(226,184,92,.25);left:640px;top:400px;opacity:0;transition:left .8s ease,top .8s ease,opacity .3s,transform .15s;transform:translate(-50%,-50%)}
      #hkm.on{opacity:1} #hkm.down{transform:translate(-50%,-50%) scale(.7);background:rgba(226,184,92,.6)}`;
    r.appendChild(s); document.documentElement.appendChild(r); }
  const c = r.querySelector('#hkc'), k = r.querySelector('#hkk'), m = r.querySelector('#hkm');
  const rich = (el, s) => { el.replaceChildren(); s.split(/(<b>.*?<\/b>)/).forEach(x => { if (!x) return; const m2 = x.match(/^<b>(.*)<\/b>$/); if (m2) { const b = document.createElement('b'); b.textContent = m2[1]; el.appendChild(b); } else el.appendChild(document.createTextNode(x)); }); };
  if (kind === 'cap') { if (!a) { c.classList.remove('on'); return; } c.classList.remove('on'); const had = c.textContent; setTimeout(() => { rich(c, a); c.classList.add('on'); }, had ? 250 : 0); }
  if (kind === 'keys') { if (!a) { k.classList.remove('on'); return; } k.replaceChildren(); a.split('+').forEach((x, i) => { if (i) { const pl = document.createElement('span'); pl.style.cssText = 'border:0;background:none;padding:10px 0'; pl.textContent = '+'; k.appendChild(pl); } const s2 = document.createElement('span'); s2.textContent = x; k.appendChild(s2); }); k.classList.add('on'); }
  if (kind === 'mouse') { m.classList.add('on'); m.style.left = a + 'px'; m.style.top = b + 'px'; }
  if (kind === 'down') { m.classList.add('down'); setTimeout(() => m.classList.remove('down'), 220); }
  if (kind === 'mouseoff') m.classList.remove('on');
}"""

class Rec:
    def __init__(self, ctx, name):
        self.ctx, self.dir, self.n, self.times = ctx, OUT / ("seg-" + name), 0, []
        self.dir.mkdir(exist_ok=True)
        for f in self.dir.glob("*.jpg"): f.unlink()
    async def start(self, pg):
        self.s = await self.ctx.new_cdp_session(pg)
        self.s.on("Page.screencastFrame", lambda e: asyncio.ensure_future(self.frame(e)))
        await self.s.send("Page.startScreencast", {"format": "jpeg", "quality": 90, "maxWidth": 1280, "maxHeight": 800, "everyNthFrame": 1})
    async def frame(self, e):
        (self.dir / ("%05d.jpg" % self.n)).write_bytes(base64.b64decode(e["data"]))
        self.times.append(e["metadata"]["timestamp"]); self.n += 1
        try: await self.s.send("Page.screencastFrameAck", {"sessionId": e["sessionId"]})
        except Exception: pass
    async def stop(self):
        try: await self.s.send("Page.stopScreencast")
        except Exception: pass
        import time
        self.times.append(time.time())  # סוף הקטע
        (self.dir / "times.json").write_text(json.dumps(self.times))
        print("seg", self.dir.name, self.n, "frames", round(self.times[-1] - self.times[0], 1), "s", flush=True)

async def ui(pg, *a):
    a = list(a) + [None] * (3 - len(a))
    try: await pg.evaluate(UI, a)
    except Exception as e: print("ui err", e)

async def st(pg):
    return await pg.evaluate("() => { const h=document.querySelector('hk-tr-ui'); const s=h&&h.shadowRoot.querySelector('.st'); return s? s.innerText : null; }")

async def wait_tr(pg, n=30):
    for i in range(n * 2):
        s = await st(pg)
        if s and 'תורגמו' in s: return s
        await asyncio.sleep(0.5)

async def smooth(pg, dy, ms=1600):
    await pg.evaluate("([dy, ms]) => new Promise(r => { const y0 = scrollY, t0 = performance.now(); (function f(t){ const k = Math.min(1, (t - t0) / ms), e = k < .5 ? 2*k*k : 1 - Math.pow(-2*k + 2, 2) / 2; scrollTo(0, y0 + dy * e); k < 1 ? requestAnimationFrame(f) : r(); })(t0); })", [dy, ms])

async def click_ui(pg, text):
    """עיגול עכבר זז לכפתור בפס התרגום ולוחץ עליו (לחיצה אמיתית)."""
    loc = pg.locator("hk-tr-ui >> text=" + text)
    bb = await loc.bounding_box()
    await ui(pg, 'mouse', bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2); await asyncio.sleep(1.0)
    await ui(pg, 'down'); await loc.click(); await asyncio.sleep(0.4)

async def seg_atar(ctx, sw, pg):
    for k in range(4):
        try: await pg.goto("https://react.dev/learn/synchronizing-with-effects", wait_until="domcontentloaded", timeout=45000); break
        except Exception: await asyncio.sleep(6)
    await asyncio.sleep(4)
    r = Rec(ctx, "atar"); await r.start(pg)
    await ui(pg, 'cap', 'אתר שלם <b>באנגלית</b>...'); await asyncio.sleep(2.6)
    await ui(pg, 'cap', 'לוחצים <b>Alt+Shift+T</b>'); await asyncio.sleep(0.6)
    await ui(pg, 'keys', 'Alt+Shift+T'); await asyncio.sleep(0.9)
    print("act", await act(sw, "translate"))
    await asyncio.sleep(0.5); await ui(pg, 'keys', '')
    await ui(pg, 'cap', 'והעברית מופיעה <b>מתחת לכל פסקה</b>')
    await wait_tr(pg); await asyncio.sleep(2.2)
    await ui(pg, 'cap', 'גוללים – <b>והתרגום ממשיך לבד</b>')
    await smooth(pg, 700); await asyncio.sleep(1.4); await smooth(pg, 700); await asyncio.sleep(1.8)
    await ui(pg, 'cap', 'האתר לא נשבר: <b>React נשאר React</b>'); await asyncio.sleep(2.6)
    await ui(pg, 'cap', 'רוצים רק עברית? <b>"רק תרגום"</b>')
    await click_ui(pg, "רק תרגום"); await ui(pg, 'mouseoff'); await asyncio.sleep(2.8)
    await ui(pg, 'cap', ''); await asyncio.sleep(0.6)
    await r.stop()

async def seg_links(ctx, sw, pg):
    await pg.goto(f"http://localhost:{PORT}/demo.html"); await asyncio.sleep(1.5)
    r = Rec(ctx, "links"); await r.start(pg)
    await ui(pg, 'cap', 'מאמר באנגלית, <b>עם קישורים</b>'); await asyncio.sleep(2.0)
    await ui(pg, 'keys', 'Alt+Shift+T'); await asyncio.sleep(0.6)
    await act(sw, "translate"); await asyncio.sleep(0.4); await ui(pg, 'keys', '')
    await ui(pg, 'cap', 'הקישורים וההדגשות <b>עוברים לתרגום</b>')
    await wait_tr(pg); await asyncio.sleep(2.0)
    a = pg.locator("hk-tr a").first; bb = await a.bounding_box()
    await ui(pg, 'cap', 'לוחצים על הקישור <b>בעברית</b>...')
    await ui(pg, 'mouse', bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2); await asyncio.sleep(1.6)
    await ui(pg, 'down'); await asyncio.sleep(0.25); await a.click()
    await asyncio.sleep(1.2); await ui(pg, 'cap', 'והוא <b>עובד</b> – כמו באתר המקורי'); await asyncio.sleep(2.6)
    await ui(pg, 'cap', ''); await asyncio.sleep(0.4)
    await r.stop()

async def seg_pdf(ctx, sw, pg):
    await pg.goto(f"http://localhost:{PORT}/lease.pdf"); await asyncio.sleep(2.5)
    r = Rec(ctx, "pdf"); await r.start(pg)
    await asyncio.sleep(0.3); await ui(pg, 'cap', 'קובץ <b>PDF</b> באנגלית?')  # בצופה ה-PDF הכיתוב לא תמיד נכנס – לכן גם כרטיס לפני
    await asyncio.sleep(2.0)
    await act(sw, "translate"); await asyncio.sleep(1.5)
    await r.stop()
    pv = [x for x in ctx.pages if "pdf.html" in x.url]
    if not pv: print("no pdf tab"); return
    v = pv[0]; await v.bring_to_front(); await v.set_viewport_size({"width": 1280, "height": 800})
    r = Rec(ctx, "pdf2"); await r.start(v)
    await ui(v, 'cap', 'נפתח <b>פסקה-פסקה</b>, עם התרגום'); await wait_tr(v); await asyncio.sleep(2.8)
    await smooth(v, 300, 1400); await asyncio.sleep(0.8)
    await ui(v, 'cap', 'להדפיס או <b>לשמור את התרגום</b>'); await asyncio.sleep(2.6)
    await ui(v, 'cap', ''); await asyncio.sleep(0.4)
    await r.stop(); await v.close()

YT_SET = """(t) => { const pl = document.querySelector('#movie_player'); if (!pl) return;
  pl.style.background = 'radial-gradient(circle at 50% 40%, #2b2f3a, #050506 70%)';
  let c = pl.querySelector('.ytp-caption-window-container');
  if (!c) { c = document.createElement('div'); c.className = 'ytp-caption-window-container'; pl.appendChild(c); }
  c.replaceChildren(); if (!t) return;
  const w = document.createElement('div'); w.className = 'caption-window ytp-caption-window-bottom'; w.dir = 'ltr'; w.style.cssText = 'position:absolute;bottom:8%;left:50%;transform:translateX(-50%);text-align:center;direction:ltr';
  const ct = document.createElement('span'); ct.className = 'captions-text'; const l = document.createElement('span'); l.className = 'caption-visual-line'; l.style.display = 'block';
  const sg = document.createElement('span'); sg.className = 'ytp-caption-segment'; sg.style.cssText = 'background:rgba(8,8,8,.75);color:#fff;font-size:26px;padding:2px 8px'; sg.textContent = t;
  l.appendChild(sg); ct.appendChild(l); w.appendChild(ct); c.appendChild(w); }"""
YT_LINES = ["So in college, I was a government major,", "which means I had to write a lot of papers.", "Now, when a normal student writes a paper,", "they might spread the work out a little like this."]

async def seg_youtube(ctx, sw, pg):
    for k in range(4):
        try: await pg.goto("https://www.youtube.com/watch?v=arj7oStGLkU", wait_until="commit", timeout=60000); break
        except Exception: await asyncio.sleep(10)
    await asyncio.sleep(10)
    for i in range(60):  # מחכים שהפרסומת תיגמר (התוסף לא מתרגם בזמן פרסומת)
        ad = await pg.evaluate("() => !!document.querySelector('#movie_player.ad-showing, #movie_player.ad-interrupting')")
        if not ad: break
        await pg.evaluate("() => document.querySelectorAll('.ytp-skip-ad-button, .ytp-ad-skip-button-modern').forEach(b => b.click())")
        await asyncio.sleep(1)
    print("ad gone after", i, flush=True)
    await pg.evaluate("() => { const v = document.querySelector('video'); if (v) { v.pause(); v.style.opacity = 0; } document.querySelectorAll('.ytp-error, .ytp-spinner').forEach(e => e.remove()); }")
    await pg.evaluate(YT_SET, "")
    # הנגן במרכז המסך
    await pg.evaluate("() => { const p = document.querySelector('#movie_player'); if (p) scrollTo(0, Math.max(0, p.getBoundingClientRect().top + scrollY - 80)); }")
    r = Rec(ctx, "youtube"); await r.start(pg)
    await ui(pg, 'cap', 'סרטון ביוטיוב <b>באנגלית</b>'); await pg.evaluate(YT_SET, YT_LINES[0]); await asyncio.sleep(2.2)
    await ui(pg, 'keys', 'Alt+Shift+T'); await act(sw, "translate"); await asyncio.sleep(0.6); await ui(pg, 'keys', '')
    await ui(pg, 'cap', 'הכתוביות <b>בעברית, בתוך הנגן</b>')
    for l in YT_LINES[1:]:
        await pg.evaluate(YT_SET, l); await asyncio.sleep(2.6)
    await ui(pg, 'cap', ''); await asyncio.sleep(0.4)
    await r.stop()

async def main():
    async with async_playwright() as p:
        ctx, sw = await boot(p)
        pg = ctx.pages[0]
        await pg.set_viewport_size({"width": 1280, "height": 800})
        await sw.evaluate("chrome.storage.local.clear()"); await sw.evaluate("chrome.storage.sync.remove(['glossary','trSites'])")
        for name, f in [("atar", seg_atar), ("links", seg_links), ("pdf", seg_pdf), ("youtube", seg_youtube)]:
            if ONLY and name not in ONLY: continue
            await sw.evaluate("chrome.storage.local.remove('trPrefs')")
            try: await f(ctx, sw, pg)
            except Exception as e: print("SEG FAIL", name, e, flush=True)
            if pg.is_closed(): pg = await ctx.new_page(); await pg.set_viewport_size({"width": 1280, "height": 800})
        await ctx.close()

asyncio.run(main())
