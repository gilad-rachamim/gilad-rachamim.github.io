// בדיקת מנוע המחברת: node tools/machberet/test-math.js
const M = require('../../assets/limudim-machberet-math.js');
const show = (lines, opt) => M.checkAll(lines, opt).map((r, i) => `${i}. ${lines[i]}  →  [${r.info.kind}] ${r.mark || '-'} ${r.msg}`).join('\n');
let fails = 0;
function expect(lines, marks, opt) {
  const res = M.checkAll(lines, opt);
  const got = res.map(r => r.mark || '-');
  const ok = marks.every((m, i) => m === '*' || m === got[i]);
  if (!ok) { fails++; console.log('FAIL\n' + show(lines, opt) + '\n want ' + marks.join(' ') + '\n'); }
  else console.log('ok   ' + lines.join(' | '));
}
expect(['2(x+3)=x+10', '2x+6=x+10', 'x=4'], ['-', 'ok', 'ok']);
expect(['2(x+3)=x+10', '2x+3=x+10', 'x=7'], ['-', 'warn', 'warn']);
expect(['x^2-5x+6=0', '(x-2)(x-3)=0', 'x=2 או x=3'], ['-', 'ok', 'ok']);
expect(['x^2-5x+6=0', 'x=2'], ['-', 'warn']);
expect(['x^2=3x', 'x=3'], ['-', 'warn']);
expect(['sqrt(x+2)=x', 'x+2=x^2', 'x^2-x-2=0', 'x=2, x=-1'], ['-', 'ok', 'ok', 'warn']);
expect(['sqrt(x+2)=x', 'x+2=x^2', 'x^2-x-2=0', 'x=2'], ['-', 'ok', 'ok', 'ok']);
expect(['(x+1)^2', '=x^2+2x+1'], ['-', 'ok']);
expect(['(x+1)^2', '=x^2+x+1'], ['-', 'warn']);
expect(['(a+b)^2-(a-b)^2', '=4ab'], ['-', 'ok']);
expect(['f(x)=x^3-3x^2+4', "f'(x)=3x^2-6x", "3x^2-6x=0", "3x(x-2)=0", "x=0 או x=2"], ['-', 'ok', 'ok', 'ok', 'ok']);
expect(['f(x)=x^3-3x^2+4', "f'(x)=3x^2-3x"], ['-', 'warn']);
expect(['f(x)=x*ln(x)', "f'(x)=ln(x)+1"], ['-', 'ok']);
expect(['f(x)=2x', 'F(x)=x^2+5'], ['-', 'ok']);
expect(['2sin(x)=1', 'sin(x)=0.5'], ['-', 'ok'], { deg: true });
expect(['sin(x)^2+cos(x)^2', '=1'], ['-', 'ok']);
expect(['sin^2x+cos^2x', '=1'], ['-', 'ok']);
expect(['sin(30°)=0.5'], ['ok']);
expect(['3^2+4^2=25'], ['ok']);
expect(['sqrt(8)=2.83'], ['ok']);
expect(['2x+y=7', 'y=7-2x'], ['-', 'ok']);
expect(['xy=6', 'y=6/x'], ['-', 'ok']);
expect(['e^(2x)=5', '2x=ln(5)', 'x=ln(5)/2'], ['-', 'ok', 'ok']);
expect(['log(x)=2', 'x=100'], ['-', 'ok']);
expect(['(x-2)^2=0', 'x=2'], ['-', 'ok']);
expect(['x/(x-1)=2', 'x=2x-2', 'x=2'], ['-', 'ok', 'ok']);
expect(['int(x^2,0,3)=9'], ['ok']);
expect(['x>3'], ['-']);
expect(['נציב x=2'], ['-']);
console.log(M.checkAll(['2x+3=x+'])[0].info.msg);
console.log(M.readLine('sqrt(x+1)/(2x)').tex, '|', M.readLine('sin^2(x)').tex, '|', M.readLine('int(x^2,0,3)').tex, '|', M.readLine("f'(x)=3x^2").tex);
const t0 = Date.now(); for (let i = 0; i < 5; i++) M.checkAll(['sqrt(x+2)=x', 'x+2=x^2', 'x^2-x-2=0', 'x=2, x=-1']); console.log('ms per run', (Date.now() - t0) / 5);
process.exit(fails ? 1 : 0);
