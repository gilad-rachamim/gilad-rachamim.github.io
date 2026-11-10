// סטודיו לעיצוב – הסרת רקע מתמונה, כולה בדפדפן (Web Worker מסוג module).
// מודל ISNet (DIS, רישיון Apache-2.0) מכומת ל-8 ביט, ומריץ אותו onnxruntime-web (MIT) – שניהם יושבים באתר עצמו.
// הודעות: {type:'run', id, input: Float32Array(3*1024*1024)} -> {type:'progress', p} / {type:'mask', id, mask: Float32Array(1024*1024)} / {type:'error'}
// המודל (46MB) נשמר ב-Cache Storage אחרי הפעם הראשונה, כך שבפעם הבאה הוא עובד מיד וגם בלי אינטרנט.
import * as ort from '/assets/vendor/onnxruntime-web/ort.wasm.min.mjs';

const MODEL = '/assets/vendor/isnet/isnet-general-use-q8.onnx';
const CACHE = 'kelim-studio-model-v1';
ort.env.wasm.wasmPaths = '/assets/vendor/onnxruntime-web/';
ort.env.wasm.numThreads = 1;

let sessionP = null;

async function modelBytes() {
  let c = null;
  try { c = await caches.open(CACHE); const hit = await c.match(MODEL); if (hit) { postMessage({ type: 'progress', p: 1, cached: true }); return new Uint8Array(await hit.arrayBuffer()); } } catch (e) { c = null; }
  const r = await fetch(MODEL, { cache: 'no-store' });
  if (!r.ok) throw new Error('model ' + r.status);
  const total = +r.headers.get('content-length') || 46360867;
  const reader = r.body.getReader();
  const buf = new Uint8Array(total);
  let got = 0, parts = null;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (got + value.length > buf.length) { parts = parts || [buf.slice(0, got)]; parts.push(value); }
    else buf.set(value, got);
    got += value.length;
    postMessage({ type: 'progress', p: Math.min(0.99, got / total) });
  }
  let bytes = buf.subarray(0, got);
  if (parts) { bytes = new Uint8Array(got); let o = 0; for (const p of parts) { bytes.set(p, o); o += p.length; } }
  try { if (c) await c.put(MODEL, new Response(bytes.slice(0), { headers: { 'content-type': 'application/octet-stream' } })); } catch (e) {}
  return bytes;
}

function session() {
  if (!sessionP) sessionP = modelBytes().then(b => ort.InferenceSession.create(b, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' }))
    .catch(e => { sessionP = null; throw e; });
  return sessionP;
}

self.onmessage = async ev => {
  const m = ev.data || {};
  if (m.type === 'warm') { try { await session(); postMessage({ type: 'ready' }); } catch (e) { postMessage({ type: 'error', msg: String(e && e.message || e) }); } return; }
  if (m.type !== 'run') return;
  try {
    const s = await session();
    postMessage({ type: 'progress', p: 1, stage: 'run' });
    const t = new ort.Tensor('float32', m.input, [1, 3, 1024, 1024]);
    const out = await s.run({ [s.inputNames[0]]: t });
    const y = out[s.outputNames[0]].data;
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < y.length; i++) { const v = y[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
    const k = 1 / Math.max(1e-6, hi - lo), mask = new Float32Array(y.length);
    for (let i = 0; i < y.length; i++) mask[i] = (y[i] - lo) * k;
    postMessage({ type: 'mask', id: m.id, mask }, [mask.buffer]);
  } catch (e) {
    postMessage({ type: 'error', id: m.id, msg: String(e && e.message || e) });
  }
};
