// בדיקות מודול טהרה: node --test tools/tahara/test.mjs  (הרעיון באדיבות אהרן גרינברג)
// 30 הדוגמאות מ-examples.json (נבדקו מול מקורות ו-hebcal) + בדיקות יחידה.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const root = new URL('../../', import.meta.url);
vm.runInThisContext(fs.readFileSync(new URL('assets/vendor/hebcal-bundle/hebcal-core-6.14.7.min.js', root), 'utf8') + ';globalThis.hebcal=hebcal;');
const T = require(fileURLToPath(new URL('assets/tahara-core.js', root)))(globalThis.hebcal);
const EX = JSON.parse(fs.readFileSync(new URL('tools/tahara/examples.json', root), 'utf8'));

const PRE = { sephardi_ovadia: 'sephardi_ovadia', ashkenaz: 'ashkenaz', chabad: 'chabad', any: 'sephardi_ovadia' };
const TYPE = { beinonit_31_shach: 'beinonit_31', haflaga_chabad: 'haflaga', chodesh_partial_day: 'chodesh_partial' };
const MIK = { hefsek_tahara: 'hefsek', clean_day_1: 'cleanFirst', clean_day_7: 'cleanLast', tevila_night: 'tevila' };
const toS = q => ({ abs: T.absFromYmd(q.greg), onah: q.onah, missed: !!q.missed,
  endAbs: q.flow_end ? T.absFromYmd(q.flow_end) : undefined, afterNetzMin: q.duration_after_netz_minutes });

for (const ex of EX) {
  test(ex.id, () => {
    const preset = T.PRESETS[PRE[ex.method]];
    const S = ex.sightings.map(toS);
    const res = T.compute(S, preset, ex.id.startsWith('ex30') ? { pregnant: true } : {});
    const mk = ex.expected.some(e => MIK[e.type]) ? T.mikveh(S[0].abs, preset) : null;
    if (!ex.expected.length) { assert.equal(res.onot.length, 0, 'לא אמורות להיות עונות'); return; }
    for (const e of ex.expected) {
      if (MIK[e.type]) {
        const k = MIK[e.type];
        if (e.greg === 'POSTPONED') { assert.equal(mk.postponedFrom && mk.postponedFrom.ymd, e.original, e.type + ' נדחה'); continue; }
        assert.equal(mk[k].ymd, e.greg, e.type);
        if (e.civil_evening) assert.equal(mk[k].ymdEve, e.civil_evening, e.type + ' ערב');
        if (e.note && /יום טוב/.test(e.note)) assert.ok(mk.alerts.includes('hefsek_yom_tov'), 'התראת הפסק ביום טוב');
        continue;
      }
      const type = TYPE[e.type] || e.type;
      if (e.greg === 'ASK_RABBI') {
        assert.ok(res.needRav.includes('chodesh30_ask'), 'שואלים רב ביום ל');
        assert.equal(res.onot.filter(o => o.type === type && o.doubt).length, 2, 'שני תאריכי ספק');
        continue;
      }
      const hit = res.onot.find(o => o.type === type && o.ymd === e.greg && o.onah === e.onah &&
        (!e.for_type || o.of === (TYPE[e.for_type] || e.for_type)));
      assert.ok(hit, `${e.type} ${e.greg} ${e.onah} חסר. יש: ` + res.onot.map(o => o.type + ':' + o.ymd + ':' + o.onah).join(', '));
      if (e.civil_evening) assert.equal(hit.ymdEve, e.civil_evening);
      if (e.interval_days) assert.equal(hit.interval, e.interval_days);
    }
    if (ex.id.startsWith('ex10')) assert.ok(!res.onot.some(o => o.type === 'or_zarua'), 'ספרדים בלי אור זרוע');
  });
}

// ---------- בדיקות יחידה ----------
const A = T.absFromYmd, P = T.PRESETS;
const day = (g, o = 'day') => ({ abs: A(g), onah: o });
const J = { lat: 31.77, lng: 35.21 };
test('ספרדים: אין אור זרוע', () => assert.ok(!T.compute([day('2026-11-13')], P.sephardi_ovadia).onot.some(o => o.type === 'or_zarua')));
test('ספרדים: אין יום ל"א', () => assert.ok(!T.compute([day('2026-11-13')], P.sephardi_ovadia).onot.some(o => o.type === 'beinonit_31')));
test('אשכנז: יש אור זרוע', () => assert.ok(T.compute([day('2026-11-13')], P.ashkenaz).onot.some(o => o.type === 'or_zarua')));
test('אשכנז: אין אור זרוע ליום ל"א', () => assert.ok(!T.compute([day('2026-11-13')], P.ashkenaz).onot.some(o => o.of === 'beinonit_31')));
test('בן איש חי: אור זרוע מסומן "ראוי להחמיר"', () => assert.ok(T.compute([day('2026-11-13')], P.ben_ish_chai).onot.some(o => o.type === 'or_zarua' && o.recommended)));
test('חב"ד: עונה בינונית בשתי עונות', () => assert.equal(T.compute([day('2026-11-13')], P.chabad).onot.filter(o => o.type === 'beinonit').length, 2));
test('חב"ד: חסר סוף ראייה = שואלים רב', () => assert.ok(T.compute([day('2026-11-13'), day('2026-12-10')], P.chabad).needRav.includes('flow_end_missing')));
test('חב"ד: אור זרוע לא אומת = שואלים רב', () => assert.ok(T.compute([day('2026-11-13')], P.chabad).needRav.includes('or_zarua')));
test('מרוקו: כמו ספרדים בחישוב', () => {
  const a = T.compute([day('2026-10-12'), day('2026-11-13')], P.morocco).onot.map(o => o.ymd + o.type).join();
  const b = T.compute([day('2026-10-12'), day('2026-11-13')], P.sephardi_ovadia).onot.map(o => o.ymd + o.type).join();
  assert.equal(a, b);
});
test('אין ראיות – אין עונות', () => assert.equal(T.compute([], P.ashkenaz).onot.length, 0));
test('סדר הראיות לא משנה', () => {
  const a = T.compute([day('2026-10-12'), day('2026-11-13')], P.sephardi_ovadia).onot.map(o => o.ymd + o.type).join();
  const b = T.compute([day('2026-11-13'), day('2026-10-12')], P.sephardi_ovadia).onot.map(o => o.ymd + o.type).join();
  assert.equal(a, b);
});
test('העונות ממוינות לפי זמן', () => {
  const o = T.compute([day('2026-10-12'), day('2026-11-13')], P.ashkenaz).onot;
  for (let i = 1; i < o.length; i++) assert.ok(T.idxOf(o[i].abs, o[i].onah) >= T.idxOf(o[i - 1].abs, o[i - 1].onah));
});
test('ראייה בלילה – כל העונות בלילה (ספרדים)', () => {
  const o = T.compute([day('2026-11-25', 'night')], P.sephardi_ovadia).onot;
  assert.ok(o.length && o.every(x => x.onah === 'night'));
});
test('עונת לילה – ערב לועזי = היום הקודם', () => assert.equal(T.describe(A('2026-12-24'), 'night').ymdEve, '2026-12-23'));
test('idxOf ו-fromIdx הפוכים', () => { for (const i of [100, 101, 1474562, 1474563]) { const f = T.fromIdx(i); assert.equal(T.idxOf(f.abs, f.onah), i); } });
test('העונה שלפני לילה = היום הקודם', () => assert.deepEqual(T.fromIdx(T.idxOf(500, 'night') - 1), { abs: 499, onah: 'day' }));
test('הפלגה כוללת את שני הימים', () => assert.equal(T.haflagaLen(day('2026-03-19'), day('2026-04-07'), P.ashkenaz), 20));
test('הפלגה חב"ד מסוף הראייה', () => assert.equal(T.haflagaLen({ abs: A('2025-12-21'), endAbs: A('2025-12-23') }, day('2026-01-12'), P.chabad), 20));
test('וסת החודש – יום רגיל', () => assert.equal(T.nextMonthSameDay(A('2026-11-13'), P.ashkenaz).list.length, 1));
test('וסת החודש – יום ל לחודש חסר: שני ספקות', () => assert.equal(T.nextMonthSameDay(A('2026-04-17'), P.ashkenaz).list.length, 2));
test('מצב ראש חודש – תאריך אחד', () => assert.equal(T.nextMonthSameDay(A('2026-04-17'), { chodesh30: 'rosh_chodesh' }).list.length, 1));
test('מצב בלי – אין תאריך', () => assert.equal(T.nextMonthSameDay(A('2026-04-17'), { chodesh30: 'none' }).list.length, 0));
test('אדר א – שואלים רב', () => assert.ok(T.compute([day('2027-02-22')], P.sephardi_ovadia).needRav.includes('adar1')));
test('אדר בשנה פשוטה – בלי דגל', () => assert.ok(!T.compute([day('2026-02-27')], P.sephardi_ovadia).needRav.includes('adar1')));
test('וסת חודש קבוע מזוהה', () => assert.equal(T.detectFixed([day('2026-12-15'), day('2027-01-13'), day('2027-02-12')], P.ashkenaz).type.kind, 'chodesh'));
test('שתי ראיות – עוד לא קבוע', () => assert.equal(T.detectFixed([day('2026-12-15'), day('2027-01-13')], P.ashkenaz).type, null));
test('הפלגה קבועה דורשת 4 ראיות', () => assert.equal(T.detectFixed([day('2026-03-19'), day('2026-04-07'), day('2026-04-26')], P.ashkenaz).type, null));
test('הפלגה קבועה ב-4 ראיות', () => assert.equal(T.detectFixed([day('2026-03-19'), day('2026-04-07'), day('2026-04-26'), day('2026-05-15')], P.ashkenaz).type.len, 20));
test('הפלגה בעונות שונות – לא קבוע', () => assert.equal(T.detectFixed([day('2026-03-19'), day('2026-04-07', 'night'), day('2026-04-26'), day('2026-05-15')], P.ashkenaz).type, null));
test('בוסת קבוע אין עונה בינונית', () => assert.ok(!T.compute([day('2026-12-15'), day('2027-01-13'), day('2027-02-12')], P.ashkenaz).onot.some(o => o.type === 'beinonit')));
test('וסת קבוע נעקר אחרי 3 פעמים', () => {
  const m = g => ({ ...day(g), missed: true });
  const r = T.compute([day('2026-12-15'), day('2027-01-13'), day('2027-02-12'), m('2027-03-14'), m('2027-04-12'), m('2027-05-12')], P.sephardi_ovadia);
  assert.ok(r.uprooted); assert.equal(r.onot.filter(o => o.type === 'chodesh_kavua').length, 0);
});
test('דילוג – שואלים רב', () => assert.ok(T.compute([day('2026-01-01'), day('2026-01-21'), day('2026-02-11'), day('2026-03-05')], P.ashkenaz).needRav.includes('dilug')));
test('ראייה בספק זמן – שואלים רב', () => assert.ok(T.compute([{ ...day('2026-11-13'), doubt: true }], P.ashkenaz).needRav.includes('doubt_time')));
test('מניקה – שואלים רב', () => assert.ok(T.compute([day('2026-11-13')], P.ashkenaz, { nursing: true }).needRav.includes('special_state')));
test('הפלגות ישנות בספרדים – לחומרה ושואלים רב', () => {
  const r = T.compute([day('2026-03-19'), day('2026-04-07'), day('2026-04-18')], P.sephardi_ovadia);
  assert.ok(r.needRav.includes('old_haflagot')); assert.ok(r.onot.some(o => o.type === 'haflaga_not_uprooted' && o.doubt));
});
test('הפלגה ישנה שכבר עברה – לא מוצגת', () => assert.ok(!T.compute([day('2026-03-19'), day('2026-04-07'), day('2026-05-20')], P.ashkenaz).onot.some(o => o.type === 'haflaga_not_uprooted')));
test('ראייה אחרי הנץ – חלק מהיום', () => {
  const r = T.compute([{ ...day('2027-06-17', 'night'), afterNetzMin: 30 }], P.sephardi_ovadia);
  assert.ok(r.onot.some(o => o.type === 'chodesh_partial' && o.untilNetzPlusMin === 30)); assert.ok(r.needRav.includes('partial_day'));
});
test('שיטה מותאמת אישית', () => { const c = T.customPreset('ashkenaz', { orZarua: false }); assert.equal(c.id, 'custom'); assert.equal(c.orZarua, false); assert.equal(c.beinonit, '31'); });
test('שיטה מותאמת – בלי "לא אומת"', () => assert.equal(T.customPreset('chabad').unverified.length, 0));
test('לכל שיטה שם וימי המתנה', () => { for (const k in P) { assert.ok(P[k].name); assert.ok(P[k].minDays >= 4); } });
test('אין שיטת תימן (אין מקור)', () => assert.equal(P.teiman, undefined));
test('מקווה ספרדים: הפסק ביום 4', () => assert.equal(T.mikveh(A('2026-11-23'), P.sephardi_ovadia).hefsek.ymd, '2026-11-26'));
test('מקווה אשכנז: הפסק ביום 5', () => assert.equal(T.mikveh(A('2026-11-23'), P.ashkenaz).hefsek.ymd, '2026-11-27'));
test('מקווה: 7 נקיים רצופים', () => { const m = T.mikveh(A('2026-11-23'), P.ashkenaz); assert.equal(m.cleanLast.abs - m.cleanFirst.abs, 6); });
test('מקווה: טבילה בליל השמיני', () => { const m = T.mikveh(A('2026-11-23'), P.ashkenaz); assert.equal(m.tevila.abs - m.cleanLast.abs, 1); assert.equal(m.tevila.onah, 'night'); });
test('מקווה: הפסק מאוחר בפועל', () => { const m = T.mikveh(A('2026-11-23'), P.ashkenaz, A('2026-11-30')); assert.ok(m.hefsekLate); assert.equal(m.hefsek.ymd, '2026-11-30'); });
test('מקווה: הפסק מוקדם מדי – נדחה למוקדם האפשרי', () => assert.equal(T.mikveh(A('2026-11-23'), P.ashkenaz, A('2026-11-24')).hefsek.ymd, '2026-11-27'));
test('מקווה: ליל שבת – התראה', () => assert.ok(T.mikveh(A('2026-12-15'), P.sephardi_ovadia).alerts.includes('leil_shabbat')));
test('מקווה: יום כיפור – נדחה', () => assert.ok(T.mikveh(A('2026-09-09'), P.ashkenaz).alerts.includes('postponed_yom_kippur')));
test('מקווה: תשעה באב – נדחה', () => assert.ok(T.mikveh(A('2027-08-01'), P.sephardi_ovadia).alerts.includes('postponed_tisha_bav')));
test('מקווה: הפסק ביום טוב – התראה', () => assert.ok(T.mikveh(A('2026-09-09'), P.ashkenaz).alerts.includes('hefsek_yom_tov')));
test('מקווה: יום רגיל – בלי דחייה', () => assert.equal(T.mikveh(A('2026-11-23'), P.ashkenaz).postponedFrom, null));
test('טקסט לרב – עם שיטה ובלי פרטים מזהים', () => {
  const S = [day('2026-11-13')], r = T.compute(S, P.chabad), t = T.ravText(S, P.chabad, r);
  assert.match(t, /חב"ד/); assert.match(t, /מה הרב אומר/); assert.doesNotMatch(t, /@|\d{9,}/);
});
test('לכל סיבת "שואלים רב" יש הסבר', () => {
  const r = T.compute([day('2026-04-17'), { ...day('2027-02-22'), doubt: true }], P.chabad, { nursing: true });
  for (const k of r.needRav) assert.ok(T.RAV[k], 'חסר הסבר ל-' + k);
  for (const k in P) for (const u of P[k].unverified) assert.ok(T.RAV[u], 'חסר הסבר ל-' + u);
});
test('שעון: אחרי השקיעה = לילה של היום הבא', () => { const o = T.onahFromClock(2026, 11, 20, '20:00', J); assert.equal(o.onah, 'night'); assert.equal(o.abs, A('2026-11-21')); });
test('שעון: צהריים = יום', () => assert.equal(T.onahFromClock(2026, 11, 20, '12:00', J).onah, 'day'));
test('שעון: לפני הנץ = לילה של אותו יום', () => { const o = T.onahFromClock(2026, 11, 20, '04:00', J); assert.equal(o.onah, 'night'); assert.equal(o.abs, A('2026-11-20')); });
test('שעון: קרוב לשקיעה = ספק', () => {
  const z = T.onahFromClock(2026, 11, 20, '12:00', J).sunset;
  const t = String(z.getHours()).padStart(2, '0') + ':' + String(z.getMinutes()).padStart(2, '0');
  assert.equal(T.onahFromClock(2026, 11, 20, t, J).near, 'sunset');
});
