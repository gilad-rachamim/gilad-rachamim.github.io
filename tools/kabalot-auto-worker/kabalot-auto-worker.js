// kelim-kabalot-auto – קבלה אוטומטית אחרי כל מכירה ב-Payhip.
// Payhip שולח הודעת webhook (paid / refunded) -> השרת מפיק קבלה ב"אלופים בחשבוניות" ומבקש לשלוח אותה ללקוח.
// סודות (רק גילעד מזין, דרך wrangler secret put): ALUFFIM_API_KEY, ALUFFIM_BUSINESS_ID, PAYHIP_API_KEY, ADMIN_KEY.
// בלי הסודות השרת לא מפיק כלום ומחזיר 503 (Payhip ינסה שוב כל שעה, עד 3 שעות).

const API = 'https://invoice.aluffim.co.il/api';
const KEEP = 60 * 60 * 24 * 400; // שומרים רישום של כל עסקה קצת יותר משנה

const json = (o, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

async function sha256hex(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

// מזהה קבוע (בצורת UUID) שנגזר ממזהה העסקה: אותה עסקה = אותו מסמך, גם אם ההודעה מגיעה פעמיים.
async function uuidFrom(s) {
  const h = await sha256hex(s);
  const v = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${v}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

function safeEq(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

// התאריך של היום בשעון ישראל (הפקה דרך מפתח מותרת רק בתאריך של היום).
export function todayIL(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

function payLabel(t) {
  const s = String(t || '').toLowerCase();
  if (s.includes('paypal')) return 'PayPal דרך Payhip';
  if (s.includes('card') || s.includes('stripe')) return 'כרטיס אשראי דרך Payhip';
  return 'תשלום מקוון דרך Payhip';
}

// בונה את טיוטת הקבלה. variant: 'detail' = פירוט בשורות הקבלה, 'lines' = שורות רגילות (ניסיון שני אם הראשון נדחה).
export function buildDraft(ev, date, variant) {
  const amount = Number(ev.price);
  const items = Array.isArray(ev.items) ? ev.items : [];
  const names = items.map((i) => String(i.product_name || '').trim()).filter(Boolean);
  const description = (names.join(' + ') || 'מוצר דיגיטלי').slice(0, 200);
  const email = String(ev.email || '').trim();
  const draft = {
    type: 'receipt',
    language: 'he',
    currency: 'ILS',
    documentDate: date,
    oneOffCustomer: { name: email || 'לקוח', ...(email ? { emails: [email] } : {}) },
    payments: [{ method: 'other', amount, date, description: payLabel(ev.payment_type) }],
    notes: `מספר עסקה ב-Payhip: ${ev.id}`,
  };
  const line = { description, quantity: '1', unitPrice: amount };
  if (variant === 'lines') draft.lines = [{ ...line, kind: 'service' }];
  else draft.receiptDetailLines = [line];
  return draft;
}

async function aluf(env, method, path, body, idem) {
  const r = await fetch(`${env.ALUFFIM_BASE || API}/v1/businesses/${env.ALUFFIM_BUSINESS_ID}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${env.ALUFFIM_API_KEY}`,
      'content-type': 'application/json',
      ...(idem ? { 'idempotency-key': idem } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  try { data = await r.json(); } catch (e) { /* תשובה בלי JSON */ }
  return { status: r.status, ok: r.ok, data };
}

const errText = (res) => {
  const e = res.data && (res.data.error || res.data);
  return `${res.status} ${JSON.stringify(e || '').slice(0, 400)}`;
};

async function save(env, id, rec) {
  rec.updated = new Date().toISOString();
  await env.KABALOT.put(`tx:${id}`, JSON.stringify(rec), { expirationTtl: KEEP });
  return rec;
}

async function handlePaid(env, ev) {
  const id = String(ev.id);
  const prev = JSON.parse((await env.KABALOT.get(`tx:${id}`)) || 'null');
  if (prev && prev.stage === 'issued') {
    if (!prev.sent) await trySend(env, id, prev);
    return json({ ok: true, already: true });
  }
  const amount = Number(ev.price);
  const rec = prev || { id, email: ev.email || '', amount, currency: ev.currency, created: new Date().toISOString() };
  rec.items = (ev.items || []).map((i) => i.product_name).join(' + ');

  if (!Number.isInteger(amount) || amount <= 0) {
    await save(env, id, { ...rec, stage: 'skipped', note: 'סכום אפס – אין קבלה' });
    return json({ ok: true, skipped: 'zero' });
  }
  if (String(ev.currency || '').toUpperCase() !== 'ILS') {
    await save(env, id, { ...rec, stage: 'manual', note: `מטבע ${ev.currency} – להפיק ידנית` });
    return json({ ok: true, manual: 'currency' });
  }

  const date = todayIL();
  const docId = await uuidFrom(`payhip:${id}`);
  rec.docId = docId;

  let draft = null;
  let last = null;
  for (const variant of ['detail', 'lines']) {
    last = await aluf(env, 'PUT', `/documents/${docId}`, buildDraft(ev, date, variant), await uuidFrom(`draft:${variant}:${id}:${date}`));
    if (last.ok) { draft = last.data && last.data.data; rec.variant = variant; break; }
    if (![400, 422].includes(last.status)) break;
  }
  if (!draft) {
    await save(env, id, { ...rec, stage: 'error', note: `טיוטה נדחתה: ${errText(last)}` });
    return json({ ok: false, step: 'draft' }, 502);
  }

  const gross = draft.totals && Number.isInteger(draft.totals.gross) ? draft.totals.gross : amount;
  const iss = await aluf(env, 'POST', `/documents/${docId}/issue`, { expectedGross: gross, documentDate: date, mode: 'real' }, await uuidFrom(`issue:${id}:${date}`));
  if (!iss.ok) {
    await save(env, id, { ...rec, stage: 'error', note: `הפקה נדחתה: ${errText(iss)}` });
    return json({ ok: false, step: 'issue' }, 502);
  }
  const doc = (iss.data && iss.data.data && iss.data.data.document) || {};
  rec.stage = 'issued';
  rec.number = doc.number || null;
  rec.note = '';
  await save(env, id, rec);
  await trySend(env, id, rec);
  return json({ ok: true, number: rec.number, sent: !!rec.sent });
}

// שליחה ללקוח: פתוחה רק אם המפתח נוצר עם אפשרות השליחה. אם לא – הקבלה כבר מופקת, והשליחה מהאתר של אלופים.
async function trySend(env, id, rec) {
  if (!rec.email) return;
  const s = await aluf(env, 'POST', `/documents/${rec.docId}/send-to-customer`, {}, await uuidFrom(`send:${id}`));
  rec.sent = s.ok;
  rec.sendNote = s.ok ? '' : `שליחה לא בוצעה: ${errText(s)}`;
  await save(env, id, rec);
}

// החזר כספי: דרך מפתח אי אפשר לבטל מסמך, לכן רק רושמים שצריך טיפול ידני באתר של אלופים.
async function handleRefund(env, ev) {
  const id = String(ev.id);
  const prev = JSON.parse((await env.KABALOT.get(`tx:${id}`)) || 'null') || { id, email: ev.email || '', amount: Number(ev.price) };
  prev.refund = { amount: Number(ev.amount_refunded || 0), date: ev.date_refunded || null, handled: false };
  await save(env, id, prev);
  return json({ ok: true, refund: 'manual' });
}

async function status(env) {
  const list = await env.KABALOT.list({ prefix: 'tx:', limit: 200 });
  const rows = [];
  for (const k of list.keys) rows.push(JSON.parse((await env.KABALOT.get(k.name)) || '{}'));
  rows.sort((a, b) => String(b.updated).localeCompare(String(a.updated)));
  const mask = (e) => String(e || '').replace(/^(.).*(@.*)$/, '$1***$2');
  return json({
    ready: !!(env.ALUFFIM_API_KEY && env.ALUFFIM_BUSINESS_ID && env.PAYHIP_API_KEY),
    count: rows.length,
    problems: rows.filter((r) => r.stage === 'error' || r.stage === 'manual' || (r.refund && !r.refund.handled)).length,
    rows: rows.map((r) => ({ ...r, email: mask(r.email) })),
  });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'GET' && url.pathname === '/') return json({ ok: true, name: 'kelim-kabalot-auto' });
    if (req.method === 'GET' && url.pathname === '/matzav') {
      if (!env.ADMIN_KEY || !safeEq(req.headers.get('x-admin-key') || '', env.ADMIN_KEY)) return json({ ok: false }, 403);
      return status(env);
    }
    if (req.method !== 'POST' || url.pathname !== '/payhip') return json({ ok: false }, 404);
    if (!env.ALUFFIM_API_KEY || !env.ALUFFIM_BUSINESS_ID || !env.PAYHIP_API_KEY) return json({ ok: false, error: 'not_configured' }, 503);

    let ev;
    try { ev = await req.json(); } catch (e) { return json({ ok: false }, 400); }
    if (!ev || !ev.id || !safeEq(String(ev.signature || ''), await sha256hex(env.PAYHIP_API_KEY))) return json({ ok: false }, 403);

    try {
      if (ev.type === 'paid') return await handlePaid(env, ev);
      if (ev.type === 'refunded') return await handleRefund(env, ev);
      return json({ ok: true, ignored: ev.type });
    } catch (e) {
      const old = JSON.parse((await env.KABALOT.get(`tx:${ev.id}`)) || 'null') || {};
      await save(env, String(ev.id), { ...old, id: String(ev.id), stage: old.stage === 'issued' ? 'issued' : 'error', note: `תקלה: ${String(e && e.message).slice(0, 300)}` });
      return json({ ok: false }, 500);
    }
  },
};
