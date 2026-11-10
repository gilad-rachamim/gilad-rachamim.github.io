var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// krav-worker.js
var ORIGINS = ["https://gilad-rachamim.github.io"];
var MAX_ROWS = 60;
var KEEP_MS = 3 * 864e5;
var GRACE_S = 15 * 60;
var krav_worker_default = {
  async fetch(req, env) {
    const url = new URL(req.url), origin = req.headers.get("Origin") || "";
    const cors = corsHeaders(origin, env);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    let res;
    try {
      const m = url.pathname.match(/^\/b\/((?:math|eng)-[a-z0-9]{4,12})$/);
      if (url.pathname === "/" || url.pathname === "/ping") res = json({ ok: true, name: "limudim-krav", v: 1 });
      else if (m && (req.method === "GET" || req.method === "POST")) {
        if (req.method === "POST" && origin && !allowed(origin, env)) res = json({ error: "origin" }, 403);
        else {
          const ip = req.headers.get("CF-Connecting-IP") || "x";
          if (req.method === "POST") {
            const r = await env.BOARD.get(env.BOARD.idFromName("rl:" + ip)).fetch("https://do/rl", { method: "POST" });
            if (r.status === 429) {
              res = json({ error: "\u05D9\u05D5\u05EA\u05E8 \u05DE\u05D3\u05D9 \u05E2\u05D3\u05DB\u05D5\u05E0\u05D9\u05DD \u05DE\u05D4\u05E8\u05E9\u05EA \u05D4\u05D6\u05D0\u05EA. \u05E0\u05E1\u05D5 \u05E9\u05D5\u05D1 \u05D1\u05E2\u05D5\u05D3 \u05DB\u05DE\u05D4 \u05D3\u05E7\u05D5\u05EA." }, 429);
            }
          }
          if (!res) res = await env.BOARD.get(env.BOARD.idFromName("b:" + m[1])).fetch(new Request("https://do/b", { method: req.method, headers: { "content-type": "application/json" }, body: req.method === "POST" ? await req.text() : null }));
        }
      } else res = json({ error: "\u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0" }, 404);
    } catch (e) {
      res = json({ error: "\u05EA\u05E7\u05DC\u05D4 \u05D1\u05E9\u05E8\u05EA. \u05E0\u05E1\u05D5 \u05E9\u05D5\u05D1 \u05D1\u05E2\u05D5\u05D3 \u05E8\u05D2\u05E2." }, 500);
    }
    res = new Response(res.body, res);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
};
var Board = class {
  static {
    __name(this, "Board");
  }
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
  }
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/rl") return this.rateLimit();
    let b = await this.ctx.storage.get("b") || null;
    if (req.method === "GET") return json(b ? { rows: b.rows, e: b.e } : { rows: [], e: 0 });
    let d;
    try {
      d = JSON.parse(await req.text());
    } catch (e2) {
      return json({ error: "\u05D1\u05E7\u05E9\u05D4 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05E0\u05D4" }, 400);
    }
    const pid = clean(d.pid, 8), nick = nickClean(d.nick) || "\u05E9\u05D7\u05E7\u05DF/\u05D9\u05EA";
    const pts = int(d.pts, 0, 2e4), solved = int(d.solved, 0, 1e3), tried = int(d.tried, 0, 1e3), e = int(d.e, 0, 1e8);
    if (pid.length < 4 || solved > tried || pts > tried * 16 + 16) return json({ error: "\u05D1\u05E7\u05E9\u05D4 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05E0\u05D4" }, 400);
    const now = Date.now();
    if (!b) {
      if (!e || e * 60 < now / 1e3 || e * 60 > now / 1e3 + 7200) return json({ error: "\u05DE\u05E8\u05D5\u05E5 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF" }, 400);
      b = { e, at: now, rows: [] };
      await this.ctx.storage.setAlarm(now + KEEP_MS);
    }
    if (now / 1e3 > b.e * 60 + GRACE_S) return json({ rows: b.rows, e: b.e, closed: 1 });
    const i = b.rows.findIndex((r) => r[0] === pid);
    if (i > -1) {
      const r = b.rows[i];
      if (pts >= r[2]) b.rows[i] = [pid, nick, pts, solved, tried];
      else b.rows[i][1] = nick;
    } else if (b.rows.length < MAX_ROWS) b.rows.push([pid, nick, pts, solved, tried]);
    else return json({ rows: b.rows, e: b.e, full: 1 });
    b.rows.sort((x, y) => y[2] - x[2] || y[3] - x[3]);
    await this.ctx.storage.put("b", b);
    return json({ rows: b.rows, e: b.e });
  }
  async rateLimit() {
    const now = Date.now();
    let r = await this.ctx.storage.get("rl") || { s: now, n: 0 };
    if (now - r.s > 36e5) r = { s: now, n: 0 };
    r.n++;
    await this.ctx.storage.put("rl", r);
    if (!await this.ctx.storage.getAlarm()) await this.ctx.storage.setAlarm(now + 2 * 36e5);
    return r.n > 3e3 ? new Response("rl", { status: 429 }) : new Response("ok");
  }
  async alarm() {
    await this.ctx.storage.deleteAll();
  }
};
function allowed(o, env) {
  return ORIGINS.includes(o) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o) || (env.EXTRA_ORIGINS || "").split(",").includes(o);
}
__name(allowed, "allowed");
function corsHeaders(o, env) {
  return { "Access-Control-Allow-Origin": allowed(o, env) ? o : ORIGINS[0], "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "content-type", Vary: "Origin" };
}
__name(corsHeaders, "corsHeaders");
function json(o, s) {
  return new Response(JSON.stringify(o), { status: s || 200, headers: { "content-type": "application/json; charset=utf-8" } });
}
__name(json, "json");
function clean(s, n) {
  return String(s || "").replace(/[<>"'`\u0000-\u001f]/g, "").trim().slice(0, n);
}
__name(clean, "clean");
function nickClean(s) {
  return clean(s, 40).replace(/https?:\S+|www\.\S+|\S+@\S+/gi, "").replace(/\d[\d\s-]{5,}/g, "").trim().slice(0, 20);
}
__name(nickClean, "nickClean");
function int(v, lo, hi) {
  v = Math.floor(Number(v) || 0);
  return Math.max(lo, Math.min(hi, v));
}
__name(int, "int");

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

// .wrangler/tmp/bundle-6JvFlC/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = krav_worker_default;

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

// .wrangler/tmp/bundle-6JvFlC/middleware-loader.entry.ts
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
  Board,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=krav-worker.js.map
