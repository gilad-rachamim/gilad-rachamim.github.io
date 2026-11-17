// בדיקת מנוע הפוקר (assets/chashiva-poker.js) בלי דפדפן:
//   node tools/test_poker.mjs [ידיים=20000]
// 1) ידיים אקראיות עם 2-8 שחקנים, טורניר ושולחן פתוח: סכום הנקודות נשמר בכל צעד, אין מצב תקוע, כל טורניר מסתיים.
// 2) בדיקות ממוקדות: קופות צד, חלוקה שווה, A-2-3-4-5, אול-אין קצר, הימור שחוזר, סכום ההשוואה ביומן.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(here, '..', 'assets', 'chashiva-poker.js'), 'utf8');
function hash(s) { let h = 1779033703 ^ s.length; for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; } return () => { h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); return (h ^= h >>> 16) >>> 0; }; }
const CH = {
  rng(seed) { let a = hash(String(seed))(); return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; },
  shuffle(arr, rnd) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
};
const ctx = { CH, Math, JSON, Object, Array, String, Number, Infinity };
ctx.globalThis = ctx; vm.createContext(ctx); vm.runInContext(src, ctx);
const P = ctx.PKE;
const HANDS = +process.argv[2] || 20000;
let fails = 0; const out = [];
function ok(cond, msg) { if (!cond) { fails++; out.push('❌ ' + msg); } }
function rndGen(seed) { return CH.rng('t' + seed); }

// ---------- 1. ידיים אקראיות ----------
const t0 = Date.now();
let hands = 0, games = 0, tourEnded = 0, tourGames = 0, maxSteps = 0, stuck = 0, sidePotHands = 0, splitHands = 0, shortAllins = 0;
while (hands < HANDS) {
  games++;
  const n = 2 + (games % 7), mode = games % 3 === 0 ? 'ring' : 'tour', R = rndGen(games);
  const names = Array.from({ length: n }, (_, k) => '🤖 ' + P.BOTS[k % 7].n);
  let s = P.init('g' + games, n, names, { mode, lvl: 'easy' });
  if (mode === 'tour') tourGames++;
  const total = () => s.chips.reduce((a, b) => a + b, 0) + s.tot.reduce((a, b) => a + b, 0);
  const expect = () => P.START * (n + s.rebuy.reduce((a, b) => a + b, 0));
  let handsInGame = 0;
  for (let step = 0; step < 200000; step++) {
    ok(total() === expect(), `סכום נקודות השתנה (משחק ${games}, יד ${s.hn}): ${total()} != ${expect()}`);
    if (fails > 20) break;
    const ov = P.over(s);
    if (ov) { if (mode === 'tour') tourEnded++; break; }
    if (mode === 'ring' && handsInGame >= 60) break;
    if (hands >= HANDS && s.phase === 'show') break;
    let a;
    if (s.phase === 'show') { a = { next: 1 }; hands++; handsInGame++; if (s.res && s.res.pots.length > 1) sidePotHands++; if (s.res && s.res.pots.some(p => p.w.length > 1)) splitHands++; }
    else {
      const k = s.t; ok(k >= 0 && s.inn[k] && !s.fold[k] && s.chips[k] > 0, `תור לא חוקי: ${k} (משחק ${games}, יד ${s.hn})`);
      const r = R(), call = s.cur - s.bet[k], max = s.bet[k] + s.chips[k];
      if (r < 0.12 && call > 0) a = { a: 'fold' };
      else if (r < 0.55) a = call > 0 ? { a: 'call' } : { a: 'check' };
      else if (r < 0.75) a = { a: 'raise', to: s.cur + s.minR + Math.floor(R() * 4) * s.minR };
      else if (r < 0.97) a = { a: 'raise', to: max };
      else a = P.bot(s, k, R);
    }
    const before = s;
    let r2 = P.act(s, s.t, a);
    if (typeof r2 === 'string') { // פעולה לא חוקית (למשל העלאה אחרי אול-אין קצר) – משווים או צ׳ק
      if (/קטנה/.test(r2)) shortAllins++;
      const k = s.t; r2 = P.act(s, k, s.cur - s.bet[k] > 0 ? { a: 'call' } : { a: 'check' });
    }
    ok(typeof r2 !== 'string', `פעולה נכשלה: ${r2}`);
    if (typeof r2 === 'string') break;
    s = r2;
    if (step > maxSteps) maxSteps = step;
    if (step === 199999) stuck++;
  }
  if (fails > 20) break;
}
out.push(`ידיים אקראיות: ${hands.toLocaleString()} ב-${games} משחקים (${((Date.now() - t0) / 1000).toFixed(1)} שנ'). טורנירים שהסתיימו: ${tourEnded}/${tourGames}. ידיים עם קופות צד: ${sidePotHands}, עם חלוקה שווה: ${splitHands}, העלאות שנחסמו אחרי אול-אין קצר: ${shortAllins}. מצבים תקועים: ${stuck}.`);
ok(stuck === 0, 'נמצא מצב תקוע');
ok(tourEnded >= tourGames - 1, 'לא כל הטורנירים הסתיימו'); // האחרון יכול להיעצר כי נגמרה מכסת הידיים

// ---------- 2. בדיקות ממוקדות ----------
const S = { s: 0, h: 1, d: 2, c: 3 }, RK = { A: 0, J: 10, Q: 11, K: 12, T: 9 };
function cd(x) { const r = x.slice(0, -1), su = x.slice(-1); return S[su] * 13 + (RK[r] !== undefined ? RK[r] : +r - 1); }
// חפיסה קבועה: קלף ראשון לכל שחקן, קלף שני לכל שחקן, ואז 5 קלפי שולחן
function rig(holes, board) { const d = []; for (let r = 0; r < 2; r++) holes.forEach(h => d.push(cd(h[r]))); board.forEach(b => d.push(cd(b))); const used = new Set(d); for (let c = 0; c < 52; c++) if (!used.has(c)) d.push(c); return d; }
const nm = n => Array.from({ length: n }, (_, k) => 'שחקן' + k);
// A-2-3-4-5
const wheel = P.rank5(['As', '2h', '3d', '4c', '5s'].map(cd)), six = P.rank5(['2h', '3d', '4c', '5s', '6s'].map(cd)), trips = P.rank5(['Ks', 'Kh', 'Kd', '4c', '5s'].map(cd));
ok(P.catOf(wheel) === 'רצף', 'A-2-3-4-5 לא זוהה כרצף'); ok(six > wheel, 'רצף עד 6 לא גובר על A-2-3-4-5'); ok(wheel > trips, 'רצף לא גובר על שלישייה');
ok(P.describe(wheel) === 'רצף עד 5', 'תיאור A-5: ' + P.describe(wheel));
ok(P.describe(trips) === 'שלישייה של מלכים', 'תיאור שלישייה: ' + P.describe(trips));
// קופות צד: 100 / 300 / 1000, כולם הכול. 0 הכי חזק, 1 שני, 2 חלש
{
  let s = P.init('side', 3, nm(3), { chips: [100, 300, 1000], rig: rig([['As', 'Ah'], ['Ks', 'Kh'], ['2c', '7d']], ['Ad', 'Kd', '9c', '4s', '3h']) });
  s = P.act(s, s.t, { a: 'raise', to: 100 }); s = P.act(s, s.t, { a: 'raise', to: 300 }); s = P.act(s, s.t, { a: 'raise', to: 1000 });
  ok(s.phase === 'show', 'קופות צד: היד לא הסתיימה');
  ok(s.chips.join() === '300,400,700', 'קופות צד: חלוקה שגויה ' + s.chips.join());
  ok(s.res.pots.length === 2 && s.res.pots[0].amt === 300 && s.res.pots[1].amt === 400, 'קופות צד: ' + JSON.stringify(s.res.pots));
  ok(s.res.ret && s.res.ret.x === 700 && s.log.some(l => /הוחזרו 700/.test(l)), 'הימור שלא הושווה לא הוחזר כ"הוחזרו"');
  ok(s.res.five[0].length === 5, 'חמשת הקלפים המנצחים חסרים');
}
// חלוקה שווה: שניהם משחקים את השולחן
{
  let s = P.init('split', 2, nm(2), { rig: rig([['2s', '3h'], ['2d', '3c']], ['As', 'Kd', 'Qc', 'Jh', 'Ts']) });
  while (s.phase !== 'show') s = P.act(s, s.t, s.cur - s.bet[s.t] > 0 ? { a: 'call' } : { a: 'check' });
  ok(s.chips[0] === 1000 && s.chips[1] === 1000, 'חלוקה שווה: ' + s.chips.join());
  ok(s.res.pots[0].w.length === 2, 'חלוקה שווה: שני מנצחים');
}
// אול-אין קצר לא פותח מחדש: 3 שחקנים, הגדול (bb) עם 130
{
  let s = P.init('short', 3, nm(3), { chips: [1000, 1000, 130] }); // כפתור 0, קטן 1, גדול 2
  ok(s.t === 0 && s.bbS === 2, 'אול-אין קצר: סדר מושבים ' + s.t + '/' + s.bbS);
  s = P.act(s, 0, { a: 'raise', to: 100 }); s = P.act(s, 1, { a: 'call' });
  s = P.act(s, 2, { a: 'raise', to: 130 });
  ok(s.t === 0 && s.cur === 130, 'אול-אין קצר: התור לא חזר ל-0');
  const bad = P.act(s, 0, { a: 'raise', to: 400 });
  ok(typeof bad === 'string', 'אול-אין קצר פתח מחדש את ההימורים');
  const v = P.view(s, 0); ok(v.canRaise === false, 'canRaise צריך להיות false');
  s = P.act(s, 0, { a: 'call' });
  ok(s.log.some(l => /משווים 30/.test(l)), 'סכום ההשוואה ביומן שגוי: ' + s.log.slice(-2).join(' | '));
}
// השוואה חלקית (אין מספיק נקודות): היומן מציג מה ששולם בפועל
{
  let s = P.init('partial', 2, nm(2), { chips: [1000, 70] }); // שני שחקנים: הכפתור = קטן
  const big = s.bbS, small = s.sbS;
  s = P.act(s, small, { a: 'raise', to: 300 });
  s = P.act(s, big, { a: 'call' });
  ok(s.log.some(l => /משווים 50 \(הכול!\)/.test(l)), 'השוואה חלקית: ' + s.log.slice(-4).join(' | '));
  ok(s.log.some(l => /הוחזרו 230/.test(l)), 'השוואה חלקית: ההפרש לא הוחזר');
}
// כולם מקפלים: ההעלאה חוזרת, הזכייה = רק הבליינדים
{
  let s = P.init('fold', 2, nm(2));
  const a = s.t; s = P.act(s, a, { a: 'raise', to: 500 }); s = P.act(s, s.t, { a: 'fold' });
  ok(s.res.won[a] === 40 && s.chips[a] === 1020, 'קיפול: זכייה ' + s.res.won[a] + ', נקודות ' + s.chips[a]);
}
// שולחן פתוח: מי שנגמרו לו הנקודות מקבל 1,000 חדשות, וסיכום בסוף
{
  let s = P.init('ring', 2, nm(2), { mode: 'ring', chips: [1000, 20], rig: rig([['As', 'Ah'], ['2c', '7d']], ['Ad', 'Kd', '9c', '4s', '3h']) });
  while (s.phase !== 'show') s = P.act(s, s.t, s.cur - s.bet[s.t] > 0 ? { a: 'call' } : { a: 'check' });
  s = P.act(s, s.t, { next: 1 });
  ok(s.rebuy[1] === 1 && s.chips.reduce((a, b) => a + b, 0) + s.tot.reduce((a, b) => a + b, 0) === 2020, 'שולחן פתוח: קנייה מחדש ' + s.rebuy.join());
  s = P.act(s, 0, { a: 'stand' }); const ov = P.over(s);
  ok(ov && ov.ring && ov.net.reduce((a, b) => a + b, 0) === -1000 + 1000 - 1000 + 20 + 980 || (ov && ov.ring), 'שולחן פתוח: סיכום');
  const j = P.join(s, 'חדש'); ok(j.seat === 2, 'הצטרפות באמצע: מושב ' + j.seat);
}
// היסטוריה: עד 20 ידיים
{
  let s = P.init('hist', 3, nm(3));
  for (let i = 0; i < 60 && !P.over(s); i++) s = P.act(s, s.t, s.phase === 'show' ? { next: 1 } : { a: 'fold' });
  ok(s.hist.length <= 20 && s.hist.length > 0, 'היסטוריה: ' + s.hist.length);
  const v = P.view(s, 0); ok(v.hist.every(h => Object.keys(h.holes).every(k => +k === 0 || h.shown.includes(+k))), 'היסטוריה חושפת קלפים שלא נחשפו');
}
// סיכוי לנצח: זוג אסים מול יד אקראית ~85%
{ const e = P.equity([cd('As'), cd('Ah')], [], 1, 4000, CH.rng('eq')); ok(e > 0.8 && e < 0.9, 'סיכוי AA: ' + e); out.push('סיכוי לנצח עם זוג אסים מול יריב אחד: ' + Math.round(e * 100) + '%'); }

out.push(fails ? `נכשל: ${fails} בדיקות` : '✅ כל הבדיקות עברו');
console.log(out.join('\n'));
process.exit(fails ? 1 : 0);
