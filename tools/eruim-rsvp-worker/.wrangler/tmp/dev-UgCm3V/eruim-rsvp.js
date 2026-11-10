var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// eruim-rsvp.js
var ORIGINS = ["https://gilad-rachamim.github.io", "https://hakelim.com", "https://www.hakelim.com"];
var LIM = { name: 60, note: 200, field: 140, answers: 1500, count: 30, create: 8, rsvp: 60, windowSec: 600 };
var KINDS = ["chatuna", "bar-mitzva", "bat-mitzva", "erusin", "china", "sheva-brachot", "yom-huledet", "chalake", "sefer-torah", "chanukat-bayit"];
var PUB = ["k", "vr", "nm1", "nm2", "p1", "p2", "fam", "gp", "host", "age", "lzn", "dt", "tm", "t2", "pl", "pl2", "ad", "a_dt", "a_par", "a_pl", "fm", "vs", "fr", "end", "st", "nobsd"];
var KEEP_DAYS = 30;
var eruim_rsvp_default = {
  async fetch(req, env) {
    const url = new URL(req.url);
    const cors = corsHeaders(req.headers.get("Origin") || "", env);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    let res;
    try {
      const m = url.pathname.match(/^\/ev(?:\/([a-z0-9]{6,12}))?(?:\/(rsvp|admin|update|delete))?\/?$/);
      if (!m) res = json({ error: "not found" }, 404);
      else if (!m[1] && req.method === "POST") res = await createEvent(req, env);
      else if (m[1] && !m[2] && req.method === "GET") res = await getEvent(m[1], env);
      else if (m[2] === "rsvp" && req.method === "POST") res = await rsvp(m[1], req, env);
      else if (m[1] && m[2] && m[2] !== "rsvp") res = await admin(m[1], m[2], url, req, env);
      else res = json({ error: "not found" }, 404);
    } catch (e) {
      res = json({ error: "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05E4\u05E0\u05D9\u05DE\u05D9\u05EA: " + (e && e.message || e) }, 500);
    }
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
    return res;
  }
};
function corsHeaders(origin, env) {
  const extra = (env.EXTRA_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  const ok = ORIGINS.includes(origin) || extra.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  const h = { "Vary": "Origin" };
  if (ok) {
    h["Access-Control-Allow-Origin"] = origin;
    h["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    h["Access-Control-Allow-Headers"] = "Content-Type";
    h["Access-Control-Max-Age"] = "86400";
  }
  return h;
}
__name(corsHeaders, "corsHeaders");
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}
__name(json, "json");
var clean = /* @__PURE__ */ __name((s, max) => (typeof s === "string" ? s : "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max), "clean");
var evKey = /* @__PURE__ */ __name((id) => "ev:" + id, "evKey");
var ALPHA = "abcdefghjkmnpqrstuvwxyz23456789";
function shortId(len) {
  const a = crypto.getRandomValues(new Uint8Array(len));
  let s = "";
  for (const b of a) s += ALPHA[b % ALPHA.length];
  return s;
}
__name(shortId, "shortId");
async function sha(s) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(sha, "sha");
async function rateLimit(req, env, kind, max) {
  const ip = req.headers.get("CF-Connecting-IP") || "unknown";
  const key = "rl:" + ip + ":" + kind;
  const n = parseInt(await env.ERSVP.get(key) || "0", 10);
  if (n >= max) return json({ error: "\u05D9\u05D5\u05EA\u05E8 \u05DE\u05D3\u05D9 \u05E4\u05E2\u05D5\u05DC\u05D5\u05EA \u05D1\u05E8\u05E6\u05E3. \u05E0\u05E1\u05D5 \u05E9\u05D5\u05D1 \u05D1\u05E2\u05D5\u05D3 \u05DB\u05DE\u05D4 \u05D3\u05E7\u05D5\u05EA." }, 429);
  await env.ERSVP.put(key, String(n + 1), { expirationTtl: LIM.windowSec });
  return null;
}
__name(rateLimit, "rateLimit");
async function readJson(req) {
  try {
    return await req.json();
  } catch (e) {
    return null;
  }
}
__name(readJson, "readJson");
function pubDetails(d) {
  if (!d || typeof d !== "object") return null;
  const o = {};
  for (const k of PUB) {
    const v = d[k];
    if (v === void 0 || v === null || v === "" || v === 0) continue;
    o[k] = typeof v === "number" ? v ? 1 : 0 : clean(String(v), LIM.field);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(o.dt || "")) return null;
  if (!KINDS.includes(o.k)) o.k = "chatuna";
  return o;
}
__name(pubDetails, "pubDetails");
function ttlFor(d) {
  const day = Date.parse(d.dt + "T23:59:59Z");
  const end = Math.max(day, Date.now()) + KEEP_DAYS * 864e5;
  return Math.max(3600, Math.round((end - Date.now()) / 1e3));
}
__name(ttlFor, "ttlFor");
async function save(env, ev) {
  await env.ERSVP.put(evKey(ev.id), JSON.stringify(ev), { expirationTtl: ttlFor(ev.d) });
}
__name(save, "save");
async function load(env, id) {
  const raw = await env.ERSVP.get(evKey(id));
  return raw ? JSON.parse(raw) : null;
}
__name(load, "load");
async function createEvent(req, env) {
  const rl = await rateLimit(req, env, "create", LIM.create);
  if (rl) return rl;
  const b = await readJson(req);
  if (!b) return json({ error: "\u05D2\u05D5\u05E3 \u05D4\u05D1\u05E7\u05E9\u05D4 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF" }, 400);
  if (b.website) return json({ ok: true, id: shortId(7), tok: shortId(24) }, 201);
  const d = pubDetails(b.d);
  if (!d) return json({ error: "\u05D7\u05E1\u05E8 \u05EA\u05D0\u05E8\u05D9\u05DA \u05D4\u05D0\u05D9\u05E8\u05D5\u05E2" }, 400);
  let id;
  for (let i = 0; i < 5; i++) {
    id = shortId(7);
    if (!await env.ERSVP.get(evKey(id))) break;
  }
  const tok = shortId(24);
  await save(env, { id, th: await sha(tok), d, created: (/* @__PURE__ */ new Date()).toISOString(), answers: {} });
  return json({ ok: true, id, tok }, 201);
}
__name(createEvent, "createEvent");
async function getEvent(id, env) {
  const ev = await load(env, id);
  if (!ev) return json({ error: "\u05D4\u05D0\u05D9\u05E8\u05D5\u05E2 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0, \u05D0\u05D5 \u05E9\u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05DB\u05D1\u05E8 \u05E0\u05DE\u05D7\u05E7\u05D5" }, 404);
  return json({ d: ev.d, exp: KEEP_DAYS });
}
__name(getEvent, "getEvent");
async function rsvp(id, req, env) {
  const rl = await rateLimit(req, env, "rsvp", LIM.rsvp);
  if (rl) return rl;
  const b = await readJson(req);
  if (!b) return json({ error: "\u05D2\u05D5\u05E3 \u05D4\u05D1\u05E7\u05E9\u05D4 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF" }, 400);
  if (b.website) return json({ ok: true, aid: "a" + shortId(6) }, 201);
  const ev = await load(env, id);
  if (!ev) return json({ error: "\u05D4\u05D0\u05D9\u05E8\u05D5\u05E2 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0" }, 404);
  const ok = b.ok ? 1 : 0, n = clean(b.n, LIM.name), note = clean(b.note, LIM.note);
  let c = parseInt(b.c, 10);
  if (!ok) c = 0;
  else if (!(c >= 1)) c = 1;
  else if (c > LIM.count) c = LIM.count;
  if (n.length < 2) return json({ error: "\u05DB\u05EA\u05D1\u05D5 \u05E9\u05DD (\u05DC\u05E4\u05D7\u05D5\u05EA 2 \u05D0\u05D5\u05EA\u05D9\u05D5\u05EA)" }, 400);
  let aid = clean(b.aid, 12);
  if (!/^a[a-z0-9]{5,}$/.test(aid) || !ev.answers[aid]) aid = "a" + shortId(6);
  if (Object.keys(ev.answers).length >= LIM.answers && !ev.answers[aid]) return json({ error: "\u05D4\u05E8\u05E9\u05D9\u05DE\u05D4 \u05DE\u05DC\u05D0\u05D4" }, 400);
  ev.answers[aid] = { n, c, ok, note, ts: (/* @__PURE__ */ new Date()).toISOString() };
  await save(env, ev);
  return json({ ok: true, aid }, 201);
}
__name(rsvp, "rsvp");
async function admin(id, action, url, req, env) {
  const ev = await load(env, id);
  if (!ev) return json({ error: "\u05D4\u05D0\u05D9\u05E8\u05D5\u05E2 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0, \u05D0\u05D5 \u05E9\u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05DB\u05D1\u05E8 \u05E0\u05DE\u05D7\u05E7\u05D5" }, 404);
  const tok = url.searchParams.get("t") || "";
  if (!tok || await sha(tok) !== ev.th) return json({ error: "\u05E7\u05D9\u05E9\u05D5\u05E8 \u05D4\u05E0\u05D9\u05D4\u05D5\u05DC \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF" }, 403);
  if (action === "admin" && req.method === "GET") return json({ d: ev.d, created: ev.created, answers: ev.answers, exp: KEEP_DAYS });
  if (req.method !== "POST") return json({ error: "not found" }, 404);
  const b = await readJson(req) || {};
  if (action === "update") {
    const d = pubDetails(b.d);
    if (!d) return json({ error: "\u05D7\u05E1\u05E8 \u05EA\u05D0\u05E8\u05D9\u05DA \u05D4\u05D0\u05D9\u05E8\u05D5\u05E2" }, 400);
    ev.d = d;
    await save(env, ev);
    return json({ ok: true });
  }
  if (action === "delete") {
    await env.ERSVP.delete(evKey(id));
    return json({ ok: true });
  }
  return json({ error: "not found" }, 404);
}
__name(admin, "admin");

// ../../../../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-1rbjqm/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = eruim_rsvp_default;

// ../../../../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-1rbjqm/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=eruim-rsvp.js.map
