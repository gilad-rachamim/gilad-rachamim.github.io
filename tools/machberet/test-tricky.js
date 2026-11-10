// סבב שני: שורות נכונות אבל מסובכות – אסור לסמן אותן "?". node tools/machberet/test-tricky.js
const M = require('../../assets/limudim-machberet-math.js');
let bad = 0, n = 0;
function T(name, lines, want, opt) {
  n++;
  const t0 = Date.now(), res = M.checkAll(lines, opt), ms = Date.now() - t0, got = res.map(r => r.mark || '-');
  const ok = want.every((m, i) => m === '*' || m === got[i]);
  if (!ok || ms > 400) { bad++; console.log('✗ ' + name + (ms > 400 ? ' (איטי: ' + ms + 'ms)' : '') + '\n' + res.map((r, i) => `   ${lines[i]}  [${r.info.kind}] ${got[i]} ${r.msg}`).join('\n') + '\n   want ' + want.join(' ')); }
}
const D = { deg: true };
// מספרים גדולים וקטנים
T('פתרון גדול', ['x-1000=500', 'x=1500'], ['-', 'ok'], D);
T('פתרון גדול מאוד', ['2x=50000', 'x=25000'], ['-', 'ok'], D);
T('פתרונות קרובים', ['x^2-0.3x+0.02=0', '(x-0.1)(x-0.2)=0', 'x=0.1 או x=0.2'], ['-', 'ok', 'ok'], D);
T('שבר קטן', ['1000x=1', 'x=0.001'], ['-', 'ok'], D);
T('ריבית', ['1000*1.03^n=1500', '1.03^n=1.5', 'n=ln(1.5)/ln(1.03)', 'n≈13.72'], ['-', 'ok', 'ok', 'ok'], D);
T('ריבית עיגול', ['1.03^n=1.5', 'n=13.72'], ['-', 'ok'], D);
// קטבים ותחומים
T('קוטב', ['1/(x-2)=3', '1=3(x-2)', '1=3x-6', 'x=7/3'], ['-', 'ok', 'ok', 'ok'], D);
T('שבר משני צדדים', ['(x+1)/(x-1)=(x+3)/(x+1)', '(x+1)^2=(x+3)(x-1)', 'x^2+2x+1=x^2+2x-3', '1=-3'], ['-', 'ok', 'ok', '*'], D);
T('ערך מוחלט', ['|x-1|=3', 'x-1=3 או x-1=-3'], ['-', '*'], D);
T('ערך מוחלט פתרון', ['|x-1|=3', 'x=4 או x=-2'], ['-', 'ok'], D);
T('שורש של ריבוע', ['sqrt(x^2)', '=|x|'], ['-', 'ok'], D);
T('ln מכפלה בתחום', ['ln(x)+ln(x+1)', '=ln(x(x+1))'], ['-', 'ok'], D);
T('מעריכית גדולה', ['e^x=1000', 'x=ln(1000)'], ['-', 'ok'], D);
T('מעריכית שלילית', ['e^(-x)=0.5', '-x=ln(0.5)', 'x=ln(2)'], ['-', 'ok', 'ok'], D);
T('חזקה שבר', ['x^(3/2)=8', 'x=4'], ['-', 'ok'], D);
T('שורש שלישי', ['x^3=-8', 'x=-2'], ['-', 'ok'], D);
T('שורש שלישי cbrt', ['x^3=27', 'x=cbrt(27)', 'x=3'], ['-', 'ok', 'ok'], D);
T('דו-ריבועית', ['x^4-5x^2+4=0', '(x^2-1)(x^2-4)=0', 'x=±1 או x=±2'], ['-', 'ok', 'ok'], D);
T('הצבת t', ['x^4-5x^2+4=0', 't^2-5t+4=0'], ['-', '*'], D);
// טריגו
T('טריגו רדיאנים עם π בטוגל מעלות', ['sin(x)=0', 'x=πk'], ['-', 'ok'], D);
T('טריגו רדיאנים π/6', ['sin(x)=0.5', 'x=π/6+2πk או x=5π/6+2πk'], ['-', 'ok'], D);
T('cos 2x', ['cos(2x)=0.5', '2x=±60+360k', 'x=±30+180k'], ['-', 'ok', 'ok'], D);
T('tan שבר', ['sin(x)=cos(x)', 'tan(x)=1', 'x=45+180k'], ['-', 'ok', 'ok'], D);
T('זהות טריגו ארוכה', ['(sin(x)+cos(x))^2', '=sin^2(x)+2sin(x)cos(x)+cos^2(x)', '=1+sin(2x)'], ['-', 'ok', 'ok'], D);
T('זהות tan', ['tan(x)*cos(x)', '=sin(x)'], ['-', 'ok'], D);
T('ערכים במעלות', ['sin(45)^2', '=0.5'], ['-', 'ok'], D);
T('cos 180-a', ['cos(180-x)', '=-cos(x)'], ['-', 'ok'], D);
T('משפט הסינוסים', ['a/sin(30)=10/sin(45)', 'a=10*sin(30)/sin(45)', 'a≈7.07'], ['-', 'ok', 'ok'], D);
T('משפט הסינוסים עיגול', ['a/sin(30)=10/sin(45)', 'a=7.07'], ['-', 'ok'], D);
T('שטח משולש', ['S=0.5*8*5*sin(60)', 'S=10sqrt(3)', 'S≈17.32'], ['-', 'ok', 'ok'], D);
// חדו"א
T('חקירה עם f\'(x)=0', ['f(x)=x^3-3x', "f'(x)=3x^2-3", "f'(x)=0", '3x^2-3=0', 'x=±1'], ['-', 'ok', 'ok', 'ok', 'ok'], D);
T('ערך בנקודה', ['f(x)=x^3-3x', 'f(1)=-2', 'f(-1)=2'], ['-', 'ok', 'ok'], D);
T('נגזרת בנקודה', ['f(x)=x^3-3x', "f'(x)=3x^2-3", "f'(2)=9"], ['-', 'ok', 'ok'], D);
T('נגזרת e^x', ['f(x)=e^(x^2)', "f'(x)=2x*e^(x^2)"], ['-', 'ok'], D);
T('נגזרת ln פשוט', ['f(x)=ln(2x)', "f'(x)=1/x"], ['-', 'ok'], D);
T('נגזרת שורש ln', ['f(x)=sqrt(ln(x))', "f'(x)=1/(2x*sqrt(ln(x)))"], ['-', 'ok'], D);
T('נגזרת a^x', ['f(x)=2^x', "f'(x)=2^x*ln(2)"], ['-', 'ok'], D);
T('נגזרת cos^2', ['f(x)=cos^2(x)', "f'(x)=-2cos(x)sin(x)"], ['-', 'ok'], D);
T('נגזרת tan', ['f(x)=tan(x)', "f'(x)=1/cos^2(x)"], ['-', 'ok'], D);
T('נגזרת מנה ln', ['f(x)=ln(x)/x', "f'(x)=(1-ln(x))/x^2"], ['-', 'ok'], D);
T('פיתול', ['f(x)=x^3-3x^2', "f'(x)=3x^2-6x", "f''(x)=6x-6", '6x-6=0', 'x=1'], ['-', 'ok', 'ok', 'ok', 'ok'], D);
T('קדומה ln', ['f(x)=1/x', 'F(x)=ln(x)+C'], ['-', 'ok'], D);
T('קדומה e', ['f(x)=e^(2x)', 'F(x)=0.5e^(2x)+C'], ['-', 'ok'], D);
T('קדומה sin', ['f(x)=sin(x)', 'F(x)=-cos(x)+C'], ['-', 'ok'], D);
T('שטח', ['int(x^2-4,-2,2)', '=-32/3'], ['-', 'ok'], D);
T('שטח e', ['int(e^x,0,1)', '=e-1'], ['-', 'ok'], D);
T('שטח בין גרפים', ['int(e^x-e^(-x),0,1)', '=e+1/e-2'], ['-', 'ok'], D);
T('אינטגרל sin', ['int(sin(x),0,pi)', '=2'], ['-', 'ok'], D);
// בעיות מילוליות עם שני נעלמים
T('עבודה', ['1/x+1/(x+5)=1/6', '6(x+5)+6x=x(x+5)', 'x^2-7x-30=0', 'x=10 או x=-3', 'x=10'], ['-', 'ok', 'ok', 'ok', '*'], D);
T('מערכת', ['x+y=10', 'x=10-y'], ['-', 'ok'], D);
T('סדרה n', ['5+3(n-1)=62', '3(n-1)=57', 'n=20'], ['-', 'ok', 'ok'], D);
T('הסתברות', ['5/8*4/7', '=20/56', '=5/14'], ['-', 'ok', 'ok'], D);
T('ncr', ['ncr(5,2)*0.3^2*0.7^3', '=0.3087'], ['-', 'ok'], D);
// כתיב מבולגן
T('רווחים', ['2 x + 6 = 10', '2 x = 4', 'x = 2'], ['-', 'ok', 'ok'], D);
T('כוכבית וחזקה', ['x**2=4', 'x=±2'], ['-', 'ok'], D);
T('יוניקוד', ['2x²−8=0', 'x²=4', 'x=±2'], ['-', 'ok', 'ok'], D);
T('נקודתיים', ['x:2=4', 'x=8'], ['-', 'ok'], D);
// "הראו לי את הצעד הבא": כל צעד שהמחברת מציעה חייב לקבל ✓, והשרשרת מגיעה לסוף
function NEXT(ex, maxSteps, opt) {
  n++;
  const lines = [ex];
  for (let k = 0; k < (maxSteps || 8); k++) {
    const s = M.nextStep(lines, opt || D);
    if (s && s.done) return;
    if (!s || s.fix || s.text || !s.line) { bad++; console.log('✗ צעד הבא נעצר: ' + lines.join(' → ') + ' → ' + JSON.stringify(s)); return; }
    lines.push(s.line);
    const r = M.checkAll(lines, opt || D), m = r[r.length - 1].mark;
    if (m !== 'ok') { bad++; console.log('✗ צעד הבא לא ✓: ' + lines.join(' → ') + '  [' + m + '] ' + r[r.length - 1].msg); return; }
  }
  bad++; console.log('✗ צעד הבא לא נגמר: ' + lines.join(' → '));
}
['3(x-2)+4=2x+5', 'x^2-5x+6=0', '2x^2+3x-5=0', 'x^2=3x', '(x+3)^2-(x-3)^2', 'f(x)=x^3-3x^2+4', '2(x+3)=x+10', 'x/2+x/3=5', 'x^2-4x+4=0', '5x=30',
 '6-5x+x^2=0', '0.5x+1.2=2.7', 'x^2-2x-1=0', 'x(x+2)=8', '(2x-1)(x+3)', '4-3(x-1)=2x', 'x^2-9=0', '3x^2=12', 'f(x)=2x^2-8x+1'].forEach(e => NEXT(e));
n++; { const s = M.nextStep(['x^2+x+1=0'], D); if (!(s && s.text)) { bad++; console.log('✗ אין פתרון ממשי: ' + JSON.stringify(s)); } }
n++; { const s = M.nextStep(['2x+3=7', '2x=10'], D); if (!(s && s.fix === 1)) { bad++; console.log('✗ קודם מתקנים: ' + JSON.stringify(s)); } }
n++; if (M.nextStep(['sin(x)=0.5'], D) !== null) { bad++; console.log('✗ טריגו: אין צעד מקומי'); }

// "תרגיל מהבגרות": כל תרגיל שהמחוללים של "המסלול שלי" מייצרים בנושאים שבמחברת נקרא כשורה תקינה
{
  const W = global.window, Dd = global.document, Ls = global.localStorage;
  global.window = {}; global.document = { getElementById: id => id === 'mx-data' ? {} : null }; global.localStorage = { getItem: () => null, setItem: () => {} };
  require('../../assets/limudim-math.js');
  const MX = global.window.MX;
  global.window = W; global.document = Dd; global.localStorage = Ls;
  const src = require('fs').readFileSync(require('path').join(__dirname, '../../assets/limudim-machberet.js'), 'utf8');
  const BAG = eval('(' + src.match(/var BAG = (\{[\s\S]*?\});/)[1] + ')');
  for (const t of MX.T) {
    if (!BAG[t.id]) continue;
    for (const lv of BAG[t.id]) for (let i = 0; i < 25; i++) {
      n++;
      const g = t.gen(lv), c = M.fromMx(g.ex), I = M.readLine(c.line, D);
      if (!c.line || I.kind === 'bad' || I.kind === 'text') { bad++; console.log('✗ בגרות ' + t.id + ' ' + lv + ': ' + JSON.stringify(g.ex) + ' → ' + c.line + ' [' + I.kind + '] ' + (I.msg || '')); break; }
    }
  }
  const c1 = M.fromMx('x + y = 13<br>x − y = −1'); n++; if (c1.line !== 'x + y = 13 ; x - y = -1') { bad++; console.log('✗ מערכת מהמסלול: ' + c1.line); }
  const c2 = M.fromMx('∫<sub>2</sub><sup>5</sup> (3x² − 2) dx'); n++; if (Math.abs(M.ev(M.parse(c2.line), {}) - 111) > 1e-6) { bad++; console.log('✗ אינטגרל מהמסלול: ' + c2.line); }
  const c3 = M.fromMx('f(x) = −4sin 5x<br>f′(x) = ?·cos 5x'); n++; if (c3.line !== 'f(x) = -4sin(5x)' || !/f′/.test(c3.ask)) { bad++; console.log('✗ טריגו מהמסלול: ' + JSON.stringify(c3)); }
}

console.log(`\n${n - bad}/${n} עברו`);
process.exit(bad ? 1 : 0);
