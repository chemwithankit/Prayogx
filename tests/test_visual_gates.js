/* tests/visual_gates.js - the layout v3 (G5) visual QA gates, checked against known pages.

   The reference fixture (tests/fixtures/g5_layout_reference.html) must pass every measured gate,
   including K (the target reveal);
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
  ok('the reference fixture passes every measured gate (A C D E F I J K)', failed(res) === '', failed(res));
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

    /* ---- K, the target reveal: each defect must fail K and only K */
    const VAL = '<span class="val" id="ansval"></span>';
    const K = [
      ['a placeholder ("?") in the target area', 1, s => s.replace(VAL, '<span class="val" id="ansval">?</span>')],
      ['UNKNOWN in place of the symbol', 2, s => s.replace('<span class="sym">v</span>', '<span class="sym">UNKNOWN</span>')],
      ['the answer shown from load', 1, s => s.replace('requestAnimationFrame(loop);\ndocument', 'requestAnimationFrame(loop); val.textContent = "= " + ANS;\ndocument')],
      ['the value shown while the run is going', 3, s => s.replace('RUN.state = "running"; }', 'RUN.state = "running"; val.textContent = "= " + ANS; }')],
      ['no value after the run', 4, s => s.replace('val.textContent = "= " + ANS + " m/s";', '')],
      ['a hard-coded answer literal', 5, s => s.replace('ANS = QRUN.answer', 'ANS = "1.87"')],
      ['a value that is not the model\'s', 5, s => s.replace('val.textContent = "= " + ANS + " m/s";', 'val.textContent = "= 2.00 m/s";')],
      ['no pulse on the reveal', 6, s => s.replace('if (!reduced){ tgt.classList.add("pulse");', 'if (false){ tgt.classList.add("pulse");')],
      ['a pulse that never stops', 6, s => s.replace('setTimeout(function(){ tgt.classList.remove("pulse"); }, 1200);', '')],
      ['two pulses', 6, s => s.replace('}, 1200); }', '}, 1200); setTimeout(function(){ tgt.classList.add("pulse"); setTimeout(function(){ tgt.classList.remove("pulse"); }, 600); }, 1500); }')],
      ['RESET that keeps the value', 7, s => s.replace('tgt.classList.remove("pulse"); val.textContent = ""; }', 'tgt.classList.remove("pulse"); }')],
      ['a pulse under reduced motion', 8, s => s.replace('@media (prefers-reduced-motion: reduce){#target.pulse{animation:none}}', '').replace('if (reduced){ reveal(); return; }', 'if (reduced){ reduced = false; reveal(); reduced = true; return; }')],
      ['an option question shown as a bare value', 9, s => s.replace('data-kind="value"', 'data-kind="option"').replace('v.toFixed(2)', '"D"').replace('"= " + ANS + " m/s"', '"= " + ANS')],
      ['a match without its pairs', 9, s => s.replace('data-kind="value"', 'data-kind="match"').replace('v.toFixed(2)', '"D"').replace('"= " + ANS + " m/s"', '"= (" + ANS + ")"')],
      ['the target outside the experiment section', 1, s => s.replace(/\s*<p class="keyres" id="target"[\s\S]*?<\/p>/, '').replace('<section id="solution">', '<p class="keyres" id="target" data-kind="value"><span class="lbl">Target:</span><span class="sym">v</span>' + VAL + '</p><section id="solution">')],
    ];
    for (const [i, [what, check, edit]] of K.entries()) {
      const src2 = edit(src);
      if (src2 === src) { ok('K variant applies: ' + what, false, 'the edit did not change the fixture'); continue; }
      r = await variant('k' + i, () => src2);
      const k = r.find(x => x.gate === 'K') || {};
      const why = (k.checks || []).filter(c => !c.ok).map(c => c.name.replace(/^target (\d+).*$/, '$1'));
      ok('K: ' + what + ' fails K (and only K), at check ' + check, failed(r) === 'K' && why.indexOf(String(check)) >= 0, failed(r) + ' failing checks ' + why.join(',') + '  ' + (k.detail || '').slice(0, 160));
    }
    r = await variant('kmatch', s => s.replace('data-kind="value"', 'data-kind="match"').replace('v.toFixed(2)', '"D"')
      .replace('"= " + ANS + " m/s"', '"P→3, Q→4, R→5, S→2 → (" + ANS + ")"'));
    ok('K: a matching question revealing its pairs and option passes K', failed(r) === '', failed(r) + '  ' + ((r.find(x => x.gate === 'K') || {}).detail || '').slice(0, 160));
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }

  /* K applies only from the standard's date: a published page built before it reports N/A, and is untouched */
  const Q13 = path.join(ROOT, 'simulations/2026/paper-1/physics/adv-2026-p1-phy-q13/index.html');
  const q13before = fs.readFileSync(Q13);
  const g13 = await gates(Q13);
  ok('a page created before 2026-10-01 (P1 PHY Q13) reports K as N/A and still passes A C D E F I J', st(g13, 'K') === 'N/A' && failed(g13) === '', failed(g13) + ' K=' + st(g13, 'K'));
  ok('...and that page was not modified', Buffer.compare(q13before, fs.readFileSync(Q13)) === 0);

  const legacy = await gates(Q16);
  ok('a legacy G4 page (P1 Q16) is flagged: small experiment, no control group, dropdowns, logs and rail',
     ['A', 'C', 'D', 'E'].every(g => st(legacy, g) === 'FAIL'), failed(legacy));
  ok('...and the legacy page itself was not modified', Buffer.compare(before, fs.readFileSync(Q16)) === 0);

  console.log('\n' + (n - bad) + ' / ' + n + ' passed');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
