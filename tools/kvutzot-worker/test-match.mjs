// בדיקות לניקוד ההתאמה שרץ בדפדפן (assets/kvutzot.js)
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const M = require('../../assets/kvutzot.js');
let fails = 0, n = 0;
const ok = (c, m, x) => { n++; if (!c) { fails++; console.log('FAIL ' + m + (x !== undefined ? ' → ' + JSON.stringify(x) : '')); } };
const g = (id, o) => Object.assign({ id, name: id, desc: '', interests: [], region: 'כל הארץ', ages: [], tags: [] }, o);
const G = [
  g('walkJ', { interests: ['ספורט והליכה'], region: 'ירושלים והסביבה', ages: ['60+'] }),
  g('walkN', { interests: ['ספורט והליכה'], region: 'הצפון' }),
  g('walkAll', { interests: ['ספורט והליכה'] }),
  g('photo', { interests: ['צילום'], region: 'ירושלים והסביבה' }),
  g('women', { interests: ['בישול ואפייה'], tags: ['נשים בלבד'] }),
  g('men', { interests: ['בישול ואפייה'], tags: ['גברים בלבד'] }),
  g('fighters', { interests: ['תמיכה רגשית'], tags: ['לוחמים ופצועי צה"ל'] }),
];
const A = { interests: ['ספורט והליכה'], tags: [], region: 'ירושלים והסביבה', age: '60+' };
let t = M.top(A, G, 3);
ok(t[0].g.id === 'walkJ', 'same region+age first', t.map(x => x.g.id));
ok(t[1].g.id === 'walkAll', 'national second', t.map(x => x.g.id));
ok(t.length === 3 && t[2].g.id === 'walkN', 'other region last');
ok(!t.some(x => x.g.id === 'photo'), 'no shared interest = no match');
ok(t[0].why.some(w => w.includes('ירושלים')) && t[0].why.some(w => w.includes('60+')), 'why explains', t[0].why);
ok(M.top({ interests: [], tags: [] }, G).length === 0, 'empty answers = nothing');
t = M.top({ interests: ['בישול ואפייה'], tags: ['נשים בלבד'], region: '', age: '' }, G);
ok(t.length === 1 && t[0].g.id === 'women', 'women-only excludes men-only', t.map(x => x.g.id));
t = M.top({ interests: [], tags: ['לוחמים ופצועי צה"ל'], region: '', age: '' }, G);
ok(t.length === 1 && t[0].g.id === 'fighters', 'tag alone is enough');
ok(M.top(A, G, 1).length === 1, 'limit n');
const s1 = M.score({ interests: ['ספורט והליכה'], age: '18–30' }, G[0]).score, s2 = M.score({ interests: ['ספורט והליכה'], age: '18–30' }, G[2]).score;
ok(s2 > s1, 'age mismatch ranks lower than all-ages', [s1, s2]);
ok(M.score({ interests: ['ספורט והליכה', 'צילום', 'מוזיקה ושירה'] }, g('x', { interests: ['ספורט והליכה', 'צילום', 'מוזיקה ושירה'] })).score <= 60 + 15 + 10, 'interest score capped');
// סגנון וחיפוש שמור
const K = M.KINDS;
const GK = [g('quiet', { interests: ['צילום'], kind: K[0] }), g('loud', { interests: ['צילום'], kind: K[2] }), g('unk', { interests: ['צילום'] })];
t = M.top({ interests: ['צילום'], kind: K[0] }, GK, 3);
ok(t[0].g.id === 'quiet' && t[2].g.id === 'loud', 'quiet preference ranks loud last', t.map(x => x.g.id));
ok(M.top({ interests: ['צילום'] }, GK, 3).length === 3, 'no kind = all equal, none removed');
const sv = { a: { interests: ['צילום'] }, seen: ['quiet', 'loud'] };
ok(M.fresh(sv, GK).map(x => x.g.id).join() === 'unk', 'fresh = only unseen', M.fresh(sv, GK).map(x => x.g.id));
ok(M.fresh(null, GK).length === 0, 'no saved = nothing');
const now = Date.parse('2026-11-21');
ok(M.isNew({ since: '2026-11-10' }, now) && !M.isNew({ since: '2026-10-01' }, now) && !M.isNew({}, now), 'new badge window');
// מסלול שותפים: בונוס קטן לקבוצה מאומתת, לא עוקף התאמה טובה יותר ולא יוצר התאמה
const GV = [g('plain', { interests: ['צילום'] }), g('ver', { interests: ['צילום'], ver: 'עמותת אור' }),
  g('verOff', { interests: ['מוזיקה ושירה'], ver: 'עמותת אור' }), g('local', { interests: ['צילום'], region: 'הצפון' })];
t = M.top({ interests: ['צילום'] }, GV, 3);
ok(t[0].g.id === 'ver' && t[1].g.id === 'plain', 'verified first when otherwise equal', t.map(x => x.g.id));
ok(t[0].why.some(w => w.includes('מאומתת') && w.includes('עמותת אור')), 'why mentions verified org', t[0].why);
ok(!t.some(x => x.g.id === 'verOff'), 'verified without shared interest = no match');
t = M.top({ interests: ['צילום'], region: 'הצפון' }, GV, 3);
ok(t[0].g.id === 'local', 'better match beats verified bonus', t.map(x => x.g.id));
ok(M.score({ interests: ['צילום'] }, GV[1]).score - M.score({ interests: ['צילום'] }, GV[0]).score === M.VER_BONUS, 'bonus size');
const P = M.partners(GV.concat([g('v2', { ver: 'קהילת דרך', verUrl: 'https://d.org' }), g('v3', { ver: 'עמותת אור', verUrl: 'https://or.org' })]));
ok(P.length === 2 && P[0].org === 'עמותת אור' && P[0].n === 3 && P[0].url === 'https://or.org' && P[1].url === 'https://d.org', 'partners grouped', P);
ok(M.partners([]).length === 0 && M.partners(null).length === 0, 'no partners');
console.log((fails ? 'FAIL' : 'PASS') + ' ' + (n - fails) + '/' + n);
process.exit(fails ? 1 : 0);
