// kelim-yutub - תור ומחסן ל"תמלול מיוטיוב" ולתמלול שיעורי כולל נחלת אבות (22.11.2026).
// הדף שולח קישור -> משימה בתור. הרץ בענן של GitHub (tools/yutub-worker/runner.py) מושך משימה,
// מתמלל, ומחזיר PDF + Word + טקסט, שנשמרים כאן. אותו שיעור שמבקשים שוב חוזר מיד מהמחסן.
// סודות: RUNNER_KEY (חובה, משותף עם הרץ), GH_TOKEN (לא חובה: מעיר את הרץ מיד במקום לחכות לתזמון).

const ORIGINS = ["https://hakelim.com", "https://www.hakelim.com", "https://gilad-rachamim.github.io", "https://nahalat-avot.com", "https://www.nahalat-avot.com"];
const PER_IP_DAY = 8, GLOBAL_DAY = 80, QUEUE_MAX = 40, CHUNK = 1_500_000;
const DAY = 86400000;

function cors(req) {
  const o = req.headers.get("Origin") || "";
  const ok = ORIGINS.includes(o) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o);
  return { "Access-Control-Allow-Origin": ok ? o : ORIGINS[0], "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Vary": "Origin" };
}
function json(req, obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...cors(req) } });
}

// קישור -> {key, url} מנורמל, או null. מקבלים רק יוטיוב ודפי שיעור של נחלת אבות (לא כתובות חופשיות).
export function parseSource(raw) {
  let u;
  try { u = new URL(String(raw || "").trim()); } catch (e) { return null; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const h = u.hostname.replace(/^(www|m|music)\./, "");
  let id = "";
  if (h === "youtu.be") id = u.pathname.slice(1).split("/")[0];
  else if (h === "youtube.com" || h === "youtube-nocookie.com") {
    if (u.pathname === "/watch") id = u.searchParams.get("v") || "";
    else { const m = u.pathname.match(/^\/(?:shorts|live|embed|v)\/([^/?]+)/); if (m) id = m[1]; }
  }
  if (/^[A-Za-z0-9_-]{11}$/.test(id)) return { key: "yt:" + id, url: "https://www.youtube.com/watch?v=" + id, kind: "yt" };
  if (h === "nahalat-avot.com") {
    const m = u.pathname.match(/^\/lesson\/([A-Za-z0-9_-]{3,120})\/?$/);
    if (m) return { key: "na:" + m[1], url: "https://nahalat-avot.com/lesson/" + m[1], kind: "na" };
  }
  return null;
}

// שבת (שעון ישראל, בשוליים רחבים): משישי 15:30 עד שבת 20:15 הרץ לא מקבל משימות; הן מחכות בתור.
export function isShabbat(now) {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jerusalem", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(now));
  const g = t => f.find(x => x.type === t).value;
  const mins = (+g("hour")) * 60 + (+g("minute"));
  return (g("weekday") === "Fri" && mins >= 15 * 60 + 30) || (g("weekday") === "Sat" && mins < 20 * 60 + 15);
}

async function sha(s) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].slice(0, 8).map(x => x.toString(16).padStart(2, "0")).join("");
}
function b64ToBytes(b64) {
  const bin = atob(b64); const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export class Yutub {
  constructor(state, env) {
    this.env = env; this.sql = state.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, key TEXT UNIQUE, url TEXT, kind TEXT, by TEXT, times INTEGER,
      status TEXT, msg TEXT, pct INTEGER, tries INTEGER DEFAULT 0, created INTEGER, started INTEGER, updated INTEGER,
      title TEXT, channel TEXT, date TEXT, dur INTEGER, words INTEGER, ip TEXT, tech TEXT)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS files (id TEXT, kind TEXT, n INTEGER, data BLOB, PRIMARY KEY (id, kind, n))`);
    this.sql.exec(`CREATE INDEX IF NOT EXISTS jobs_status ON jobs (status, created)`);
  }
  one(q, ...a) { const r = this.sql.exec(q, ...a).toArray(); return r[0] || null; }

  view(j) {
    const o = { ok: true, id: j.id, status: j.status, msg: j.msg || "", pct: j.pct || 0, kind: j.kind };
    if (j.status === "queued" && isShabbat(Date.now())) o.shabbat = true;
    if (j.status === "queued") o.pos = this.one("SELECT COUNT(*) c FROM jobs WHERE status='queued' AND created < ?", j.created).c + 1;
    if (j.status === "done") Object.assign(o, { title: j.title, channel: j.channel, date: j.date, dur: j.dur, words: j.words, source: j.url,
      pdf: `/file/${j.id}/pdf`, docx: `/file/${j.id}/docx`, txt: `/file/${j.id}/txt` });
    return o;
  }

  async wake() {
    if (!this.env.GH_TOKEN) return;
    try {
      await fetch("https://api.github.com/repos/" + (this.env.GH_REPO || "gilad-rachamim/gilad-rachamim.github.io") + "/dispatches", {
        method: "POST", headers: { "Authorization": "Bearer " + this.env.GH_TOKEN, "Accept": "application/vnd.github+json", "User-Agent": "kelim-yutub", "Content-Type": "application/json" },
        body: JSON.stringify({ event_type: "yutub" }) });
    } catch (e) { /* התזמון של ה-workflow ירים את המשימה */ }
  }

  async fetch(req) {
    const url = new URL(req.url); const p = url.pathname; const now = Date.now();
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });

    if (p === "/submit" && req.method === "POST") {
      let b; try { b = await req.json(); } catch (e) { return json(req, { ok: false, msg: "בקשה לא תקינה." }, 400); }
      const src = parseSource(b.url);
      if (!src) return json(req, { ok: false, msg: "זה לא נראה כמו קישור לסרטון ביוטיוב. מדביקים קישור מלא, למשל https://www.youtube.com/watch?v=..." }, 400);
      const by = src.kind === "na" ? "" : String(b.by || "").replace(/[<>]/g, "").trim().slice(0, 80);
      const times = b.times ? 1 : 0;
      const key = src.key + (times ? "|t" : "") + (by ? "|" + await sha(by) : "");
      let j = this.one("SELECT * FROM jobs WHERE key = ?", key);
      if (j && (j.status !== "failed" || now - j.updated < 3 * 60000)) return json(req, this.view(j));
      const ip = await sha((req.headers.get("CF-Connecting-IP") || "") + "|" + new Date(now).toISOString().slice(0, 10));
      if (this.one("SELECT COUNT(*) c FROM jobs WHERE ip = ? AND created > ?", ip, now - DAY).c >= PER_IP_DAY)
        return json(req, { ok: false, msg: "הגעת למספר השיעורים שאפשר לתמלל ביום אחד. מחר אפשר להמשיך." }, 429);
      if (this.one("SELECT COUNT(*) c FROM jobs WHERE created > ?", now - DAY).c >= GLOBAL_DAY || this.one("SELECT COUNT(*) c FROM jobs WHERE status='queued'").c >= QUEUE_MAX)
        return json(req, { ok: false, msg: "יש היום עומס גדול על הכלי. אפשר לנסות שוב מחר, או לתמלל קובץ בכלי התמלול הרגיל." }, 429);
      const id = j ? j.id : crypto.randomUUID().replace(/-/g, "").slice(0, 16);
      if (j) this.sql.exec("UPDATE jobs SET status='queued', msg='ממתין בתור', pct=0, tries=0, created=?, updated=?, ip=? WHERE id=?", now, now, ip, id);
      else this.sql.exec("INSERT INTO jobs (id,key,url,kind,by,times,status,msg,pct,created,updated,ip) VALUES (?,?,?,?,?,?,'queued','ממתין בתור',0,?,?,?)", id, key, src.url, src.kind, by, times, now, now, ip);
      await this.wake();
      return json(req, this.view(this.one("SELECT * FROM jobs WHERE id = ?", id)));
    }

    // בדיקה בלי לפתוח משימה: יש כבר תמלול לקישור הזה? (לשילוב באתר של הכולל)
    if (p === "/lookup" && req.method === "GET") {
      const src = parseSource(url.searchParams.get("url"));
      if (!src) return json(req, { ok: false, msg: "קישור לא מוכר." }, 400);
      const j = this.one("SELECT * FROM jobs WHERE key = ?", src.key);
      return json(req, j ? this.view(j) : { ok: true, status: "none" });
    }

    let m = p.match(/^\/status\/([a-f0-9]{16})$/);
    if (m && req.method === "GET") {
      const j = this.one("SELECT * FROM jobs WHERE id = ?", m[1]);
      return j ? json(req, this.view(j)) : json(req, { ok: false, msg: "לא נמצא." }, 404);
    }

    m = p.match(/^\/file\/([a-f0-9]{16})\/(pdf|docx|txt)$/);
    if (m && req.method === "GET") {
      const j = this.one("SELECT * FROM jobs WHERE id = ? AND status = 'done'", m[1]);
      const rows = j ? this.sql.exec("SELECT data FROM files WHERE id = ? AND kind = ? ORDER BY n", m[1], m[2]).toArray() : [];
      if (!rows.length) return json(req, { ok: false, msg: "הקובץ לא נמצא." }, 404);
      const parts = rows.map(r => new Uint8Array(r.data));
      const body = new Uint8Array(parts.reduce((s, x) => s + x.length, 0));
      let off = 0; for (const x of parts) { body.set(x, off); off += x.length; }
      const type = { pdf: "application/pdf", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", txt: "text/plain; charset=utf-8" }[m[2]];
      const name = (j.title || "shiur").replace(/[\\/:*?"<>|\r\n]+/g, " ").trim().slice(0, 90) + "." + m[2];
      const disp = (m[2] === "pdf" && url.searchParams.get("view") ? "inline" : "attachment") + `; filename="shiur.${m[2]}"; filename*=UTF-8''${encodeURIComponent(name)}`;
      return new Response(body, { headers: { "Content-Type": type, "Content-Disposition": disp, "Cache-Control": "public, max-age=3600", ...cors(req) } });
    }

    // ---- הרץ בענן ----
    if (p.startsWith("/r/")) {
      if (!this.env.RUNNER_KEY || req.headers.get("X-Runner-Key") !== this.env.RUNNER_KEY) return json(req, { ok: false }, 403);
      // משימה שנתקעה (רץ שנפל באמצע) חוזרת לתור, עד שני ניסיונות
      this.sql.exec("UPDATE jobs SET status='queued', msg='ממתין בתור', pct=0 WHERE status='running' AND started < ? AND tries < 2", now - 50 * 60000);
      this.sql.exec("UPDATE jobs SET status='failed', msg='העיבוד נתקע. אפשר לנסות שוב.', updated=? WHERE status='running' AND started < ? AND tries >= 2", now, now - 50 * 60000);
      if (isShabbat(now) && (p === "/r/peek" || p === "/r/next")) return json(req, { ok: true, queued: 0, job: null, shabbat: true });
      if (p === "/r/peek") return json(req, { ok: true, queued: this.one("SELECT COUNT(*) c FROM jobs WHERE status='queued'").c });
      let b = {}; try { b = await req.json(); } catch (e) { /* גוף ריק */ }
      if (p === "/r/next") {
        const j = this.one("SELECT * FROM jobs WHERE status='queued' ORDER BY created LIMIT 1");
        if (!j) return json(req, { ok: true, job: null });
        this.sql.exec("UPDATE jobs SET status='running', msg='מתחיל', pct=2, tries=tries+1, started=?, updated=? WHERE id=?", now, now, j.id);
        return json(req, { ok: true, job: { id: j.id, url: j.url, by: j.by, times: j.times } });
      }
      if (p === "/r/progress") {
        this.sql.exec("UPDATE jobs SET msg=?, pct=?, updated=? WHERE id=? AND status='running'", String(b.msg || "").slice(0, 120), Math.max(0, Math.min(99, b.pct | 0)), now, String(b.id));
        return json(req, { ok: true });
      }
      if (p === "/r/fail") {
        this.sql.exec("UPDATE jobs SET status='failed', msg=?, tech=?, updated=? WHERE id=?", String(b.msg || "משהו השתבש.").slice(0, 200), String(b.tech || "").slice(0, 300), now, String(b.id));
        return json(req, { ok: true });
      }
      if (p === "/r/done") {
        const id = String(b.id);
        if (!this.one("SELECT id FROM jobs WHERE id = ?", id)) return json(req, { ok: false }, 404);
        this.sql.exec("DELETE FROM files WHERE id = ?", id);
        const put = (kind, bytes) => { for (let i = 0, n = 0; i < bytes.length; i += CHUNK, n++) this.sql.exec("INSERT INTO files (id,kind,n,data) VALUES (?,?,?,?)", id, kind, n, bytes.slice(i, i + CHUNK).buffer); };
        put("pdf", b64ToBytes(b.pdf)); put("docx", b64ToBytes(b.docx)); put("txt", new TextEncoder().encode(String(b.text || "")));
        this.sql.exec("UPDATE jobs SET status='done', msg='מוכן', pct=100, title=?, channel=?, date=?, dur=?, words=?, updated=? WHERE id=?",
          String(b.title || "").slice(0, 200), String(b.channel || "").slice(0, 120), String(b.date || "").slice(0, 12), b.dur | 0, b.words | 0, now, id);
        // ניקוי: תמלולי יוטיוב נשמרים 90 יום; שיעורי הכולל נשארים
        const old = this.sql.exec("SELECT id FROM jobs WHERE kind='yt' AND updated < ?", now - 90 * DAY).toArray();
        for (const r of old) { this.sql.exec("DELETE FROM files WHERE id = ?", r.id); this.sql.exec("DELETE FROM jobs WHERE id = ?", r.id); }
        return json(req, { ok: true });
      }
    }
    if (p === "/" || p === "/health") return json(req, { ok: true, name: "kelim-yutub" });
    return json(req, { ok: false, msg: "לא נמצא." }, 404);
  }
}

export default {
  async fetch(req, env) {
    return env.YUTUB.get(env.YUTUB.idFromName("main")).fetch(req);
  },
};
