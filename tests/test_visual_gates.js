/* tests/visual_gates.js - the layout v3 (G5) visual QA gates, checked against known pages.

   The reference fixture (tests/fixtures/g5_layout_reference.html) must pass every measured gate;
   copies of it with one defect each must fail exactly the gate that defect breaks; and a legacy
   G4 page (P1 Q16, read-only) must be flagged, so the checker is known to see what it claims to.
   Nothing in the repository is modified: the defective copies live in a temporary directory.

   Run:  node tests/test_visual_gates.js                                                     */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { gates } = require('./visual_gates');

const ROOT = path.resolve(__dirname, '..');
const FIX = path.join(__dirname, 'fixtures', 'g5_layout_reference.html');
const Q16 = path.join(ROOT, 'simulations/2026/paper-1/chemistry/adv-2026-p1-che-q16/index.html');
let n = 0, bad = 0;
const ok = (l, c, x) => { n++; if (!c) bad++; console.log((c ? 'PASS  ' : 'FAIL  ') + l + (x !== undefined && !c ? '   ' + x : '')); };
const st = (res, g) => (res.find(r => r.gate === g) || {}).status;
const failed = res => res.filter(r => r.status === 'FAIL').map(r => r.gate).join('');

(async () => {
  const before = fs.readFileSync(Q16);
  const res = await gates(FIX);
  ok('the reference fixture passes every measured gate (A C D E F I J)', failed(res) === '', failed(res));
  ok('B, G and H are reported as manual, never as passed', ['B', 'G', 'H'].every(g => st(res, g) === 'MANUAL'));

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'g5-gates-'));
  const src = fs.readFileSync(FIX, 'utf8');
  const variant = async (name, edit) => { const f = path.join(tmp, name + '.html'); fs.writeFileSync(f, edit(src)); return gates(f); };
  try {
    let r = await variant('dropdown', s => s.replace('<button type="button" id="classbtn">', '<select id="in_mode"><option>A</option><option>B</option></select><button type="button" id="classbtn">'));
    ok('a dropdown among the primary controls fails D (and only D)', failed(r) === 'D', failed(r));
    r = await variant('log', s => s.replace('<p id="narr"', '<ol id="calclist"><li>STATE_UPDATE: temp=327</li></ol><p id="narr"'));
    ok('a visible raw log fails E', failed(r) === 'E', failed(r));
    r = await variant('small', s => s.replace('.wrap{max-width:1240px', '.stage{max-width:620px}.wrap{max-width:1240px'));
    ok('a small experiment fails A', /A/.test(failed(r)), failed(r));
    r = await variant('far', s => s.replace('<div id="controls"', '<div style="height:400px"></div><div id="controls"'));
    ok('controls far from the experiment fail C', failed(r) === 'C', failed(r));
    r = await variant('order', s => s.replace(/(<section id="solution">[\s\S]*?<\/section>)\s*(<section id="analysis">[\s\S]*?<\/section>)\s*(<section id="howto">[\s\S]*?<\/section>)/, '$3$1$2'));
    ok('how-to before the solution fails F', failed(r) === 'F', failed(r));
    r = await variant('tiny', s => s.replace('phone ? 28 : 18', 'phone ? 14 : 18'));
    ok('canvas labels too small on phones fail I', failed(r) === 'I', failed(r));
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }

  const legacy = await gates(Q16);
  ok('a legacy G4 page (P1 Q16) is flagged: small experiment, no control group, dropdowns, logs and rail',
     ['A', 'C', 'D', 'E'].every(g => st(legacy, g) === 'FAIL'), failed(legacy));
  ok('...and the legacy page itself was not modified', Buffer.compare(before, fs.readFileSync(Q16)) === 0);

  console.log('\n' + (n - bad) + ' / ' + n + ' passed');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
