/* PrayogX Experience Kit - the shared contract checks (tests/kit/contracts.js) run against the toy harness
   experience (tests/kit/toy/index.html, unregistered, test-only), plus the kit block check.
   Run:  node tests/kit/kit_toy.js                                                                          */
const path = require('path'), { execFileSync } = require('child_process');
const ROOT = process.env.PRAYOGX_ROOT || path.resolve(__dirname, '..', '..');
const { launch } = require(path.join(ROOT, 'tests', '_browser'));
const C = require('./contracts');
const FILE = path.join(ROOT, 'tests', 'kit', 'toy', 'index.html');
let n = 0, bad = 0;
const ok = (l, c, x) => { n++; if (!c) bad++; console.log((c ? 'PASS  ' : 'FAIL  ') + l + (!c && x !== undefined ? '   ' + (typeof x === 'string' ? x : JSON.stringify(x)).slice(0, 400) : '')); };

(async () => {
  const b = await launch();
  try {
    const res = await C.all(b, FILE, {
      root: ROOT,
      /* learner session for the replay check: frame → buttons to press (the real learner path) */
      session: { 5: ['#w100'], 70: ['#nextbtn'], 80: ['#heatbtn'], 320: ['#nextbtn'], 330: ['#revealbtn'] },
      lesson: { hintAfter: 5, clicks: ['#w200', '#heatbtn'], finishFrames: 300 }
    });
    for (const r of res) ok(r.name, r.ok, r.detail);
  } catch (e) { ok('the contract suite ran to the end', false, e && e.stack); }
  finally { await b.close(); }
  try { execFileSync('python3', [path.join(ROOT, 'tools', 'px_kit.py'), 'check', FILE], { stdio: 'pipe' }); ok('kit drift: the toy carries exact copies of recorded kit versions', true); }
  catch (e) { ok('kit drift: the toy carries exact copies of recorded kit versions', false, String(e.stdout)); }
  console.log('\n' + (n - bad) + ' / ' + n + ' passed');
  process.exit(bad ? 1 : 0);
})();
