const ROOT = process.env.PRAYOGX_ROOT || require('path').resolve(__dirname, '..');
const { launch } = require('./_browser');
const { spawn } = require('child_process');
const net = require('net');
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------------------------------------------------------------------------
   PrayogX Learn simulations: the numbers each one shows are checked against an
   independent calculation here, at phone and desktop widths, with reduced
   motion as well.
     learn/speed-vs-velocity/sim.html   distance, displacement, average speed and
                                        velocity for four paths over 10 s
     learn/equivalent-fractions/sim.html  LCM re-cut and the order of two
                                        fractions, negatives included
     learn/rest-and-motion/sim.html     your position from the platform (moves 40 m)
                                        and from your friend (fixed at −1.5 m)
     learn/rational-numbers-on-number-line/sim.html  where p/q lands, its side
                                        and the integers around it
     learn/why-the-sky-is-blue/sim.html  air mass, 1/λ⁴ scattering, blue sky,
                                        red low Sun, black sky without air
     learn/decimal-expansions/sim.html  long division of p/q: terminating or the
                                        repeating block, against exact arithmetic
     learn/particles-are-moving/sim.html  diffusion: D ∝ T/η (water viscosity), spread
                                        grows like √(D t)
     learn/laws-of-reflection/sim.html  r = i from the normal, the surface angle, the target
     learn/regular-vs-diffused-reflection/sim.html  spread grows with roughness, i = r per facet
     learn/electric-charge-like-and-unlike/sim.html  rubbing keeps the pair's total 0; like repel, unlike attract
     learn/empty-and-universal-relations/sim.html  rule → pairs against a brute-force filter; empty, universal
     learn/pascals-triangle-patterns/sim.html  binomials by the product formula, row sums, Fibonacci sums
     learn/oxidation-reduction-aldehydes-ketones/sim.html  products and carbon counts of each compound and reagent
     learn/roster-and-set-builder-form/sim.html  rule → elements, roster and set-builder text,
                                        order, infinite sets, letters of a word without repeats
     learn/image-in-a-plane-mirror/sim.html  image distance, gap, walking, the reflection point
                                        against a least-path search (Fermat)
     learn/why-metal-feels-colder-than-wood/sim.html  contact temperature and heat flow against
                                        a finite-difference heat solver
     learn/golden-ratio-and-fibonacci/sim.html  golden angle from the Fibonacci limit, packing
                                        by brute force, spokes, spiral counts, ratios
     learn/coordinates-introduction/sim.html  quadrants, axes, ordered pairs, Pythagoras distance
     learn/real-numbers-introduction/sim.html  factorisation by trial division, routes, HCF by Euclid
     learn/position-origin-and-direction/sim.html  positions, displacement unchanged by the origin
     learn/why-is-ice-slippery/sim.html  melting-point drop against Clausius-Clapeyron, the
                                        IAPWS anchor point, what no pressure can do
   --------------------------------------------------------------------------- */

let n = 0, bad = 0;
const ok = (l, c, x) => { n++; if (!c) bad++;
  console.log((c ? 'PASS  ' : 'FAIL  ') + l + (x !== undefined ? '   ' + x : '')); };
const near = (a, b, tol = 0.02) => Math.abs(a - b) <= tol;
const freePort = () => new Promise(res => { const sv = net.createServer();
  sv.listen(0, '127.0.0.1', () => { const q = sv.address().port; sv.close(() => res(q)); }); });
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };


/* Independent heat solver: explicit finite differences for two thick solids pressed together,
   each with its own grid. Returns the interface temperature and the heat flow at t seconds. */
function fdContact(A, B, t) {
  const dt = 2e-4, steps = Math.round(t / dt), N = 900;
  const side = m => { const al = m.k / (m.rho * m.c), dx = 2 * Math.sqrt(al * dt); return { m, al, dx, T: new Float64Array(N).fill(m.T), f: al * dt / (dx * dx) }; };
  const a = side(A), b = side(B);
  const gA = A.k / a.dx, gB = B.k / b.dx;
  let Ti = 0;
  for (let s = 0; s < steps; s++) {
    Ti = (gA * a.T[1] + gB * b.T[1]) / (gA + gB); // flux in = flux out at the interface
    a.T[0] = Ti; b.T[0] = Ti;
    for (const q of [a, b]) {
      const n = Float64Array.from(q.T);
      for (let i = 1; i < N - 1; i++) n[i] = q.T[i] + q.f * (q.T[i + 1] - 2 * q.T[i] + q.T[i - 1]);
      q.T = n;
    }
  }
  return { contact: Ti, flow: A.k * (a.T[1] - a.T[0]) / a.dx };
}
const SKIN = { k: 0.37, rho: 1100, c: 3400, T: 33 };
const MATERIALS = { copper: { k: 400, rho: 8960, c: 385 }, steel: { k: 45, rho: 7850, c: 490 }, glass: { k: 1, rho: 2500, c: 840 }, wood: { k: 0.15, rho: 600, c: 1700 } };
const FD = {};
for (const key of Object.keys(MATERIALS)) FD[key] = fdContact(SKIN, Object.assign({ T: 10 }, MATERIALS[key]), 1);

(async () => {
  const port = await freePort();
  const srv = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  await sleep(700);
  const base = 'http://127.0.0.1:' + port + '/learn/';
  const browser = await launch();
  try {
    for (const [width, motion] of [[390, 'no-preference'], [360, 'reduce'], [1280, 'no-preference']]) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: motion });
      const page = await ctx.newPage();
      const errs = [];
      page.on('pageerror', e => errs.push(e.message));
      page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
      const tag = `@${width}${motion === 'reduce' ? ' reduced-motion' : ''}`;

      // ---- speed vs velocity: independent expected values (10 s trips)
      await page.goto(base + 'speed-vs-velocity/sim.html', { waitUntil: 'load' });
      const R = 10, circ = 2 * Math.PI * R;
      const expect = {
        straight: { d: 40, x: 40 }, back: { d: 40, x: 0 },
        zigzag: { d: 4 * Math.sqrt(200), x: 40 }, circle: { d: circ, x: 0 } };
      for (const p of Object.keys(expect)) {
        const s = await page.evaluate(p => { PX.setPath(p); PX.setTime(10); return PX.state(); }, p);
        const e = expect[p];
        ok(`speed ${p} ${tag}: distance ${e.d.toFixed(2)} m`, near(s.distance, e.d, 0.05), s.distance.toFixed(3));
        ok(`speed ${p} ${tag}: displacement ${e.x.toFixed(2)} m`, near(s.displacement, e.x, 0.05), s.displacement.toFixed(3));
        ok(`speed ${p} ${tag}: average speed = distance / 10 s`, near(s.avgSpeed, e.d / 10, 0.01), s.avgSpeed.toFixed(3));
        ok(`speed ${p} ${tag}: average velocity = displacement / 10 s`, near(s.avgVelocity, e.x / 10, 0.01), s.avgVelocity.toFixed(3));
        ok(`speed ${p} ${tag}: average speed >= |average velocity|`, s.avgSpeed + 1e-9 >= s.avgVelocity);
      }
      // half a lap of the circle: chord = 2R
      const half = await page.evaluate(() => { PX.setPath('circle'); PX.setTime(5); return PX.state(); });
      ok(`speed circle half lap ${tag}: displacement = diameter`, near(half.displacement, 2 * R, 0.05), half.displacement.toFixed(3));
      const ov1 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok(`speed ${tag}: no horizontal overflow`, ov1 <= 0, ov1);
      // the Play button runs (or, with reduced motion, jumps) to the end
      await page.evaluate(() => PX.setPath('straight'));
      await page.click('#play');
      await sleep(motion === 'reduce' ? 200 : 600);
      const t1 = await page.evaluate(() => PX.state().t);
      ok(`speed ${tag}: Play advances time`, motion === 'reduce' ? near(t1, 10, 0.01) : t1 > 0, t1.toFixed(2));
      await page.click('#reset');
      ok(`speed ${tag}: Reset returns to t = 0`, (await page.evaluate(() => PX.state().t)) === 0);

      // ---- fractions: order and LCM against exact integer arithmetic
      await page.goto(base + 'equivalent-fractions/sim.html', { waitUntil: 'load' });
      const cases = [[1, 2, 4, 8], [3, 4, 5, 6], [-3, 4, -5, 6], [-3, 5, -6, 10], [2, 3, -1, 2], [5, 12, 7, 10], [-7, 9, -4, 5]];
      for (const [a, b, c, d] of cases) {
        const s = await page.evaluate(v => { PX.set(v[0], v[1], v[2], v[3]); PX.cut(); return PX.state(); }, [a, b, c, d]);
        const L = b / gcd(b, d) * d, cross = a * d - c * b, want = cross === 0 ? '=' : cross > 0 ? '>' : '<';
        ok(`fractions ${a}/${b} vs ${c}/${d} ${tag}: LCM ${L}, order ${want}`, s.lcm === L && s.order === want && s.aParts === a * L / b && s.bParts === c * L / d,
          `${s.lcm} ${s.order} ${s.aParts}/${s.bParts}`);
      }
      const verdict = await page.$eval('#verdict', e => e.textContent);
      ok(`fractions ${tag}: verdict names the bigger fraction`, verdict.includes('−7/9 > −4/5'), verdict);
      const ov2 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok(`fractions ${tag}: no horizontal overflow`, ov2 <= 0, ov2);

      // ---- roster and set-builder form: the set machine, against an independent filter
      await page.goto(base + 'roster-and-set-builder-form/sim.html', { waitUntil: 'load' });
      const primeQ = v => { if (v < 2) return false; for (let k = 2; k < v; k++) if (v % k === 0) return false; return true; };
      const setRules = { even: v => v % 2 === 0, odd: v => v % 2 !== 0, prime: primeQ, m3: v => v % 3 === 0, m5: v => v % 5 === 0, square: v => Number.isInteger(Math.sqrt(v)) };
      for (const [r, L] of [['even', 100], ['even', 20], ['odd', 15], ['prime', 30], ['prime', 100], ['m3', 50], ['m5', 7], ['square', 100], ['square', 5]]) {
        const s = await page.evaluate(v => { PX.reset(); PX.setRule(v[0]); PX.setLimit(v[1]); return PX.state(); }, [r, L]);
        const want = Array.from({ length: L }, (_, k) => k + 1).filter(setRules[r]);
        ok(`sets ${r} x ≤ ${L} ${tag}: ${want.length} elements, roster and builder agree`, JSON.stringify(s.elements) === JSON.stringify(want) && s.roster === '{' + want.join(', ') + '}' && s.builder.endsWith(', x ≤ ' + L + '}'),
          `${s.elements.length} ${s.builder}`);
      }
      const even100 = await page.evaluate(() => { PX.reset(); PX.setRule('even'); PX.setLimit(100); return PX.state().elements.length; });
      ok(`sets ${tag}: even numbers up to 100 are 50 (the reel's hook)`, even100 === 50, even100);
      const sh = await page.evaluate(() => { PX.reset(); PX.shuffle(true); return PX.state(); });
      ok(`sets shuffle ${tag}: order changes, same elements`, JSON.stringify(sh.shown) !== JSON.stringify(sh.elements) && JSON.stringify([...sh.shown].sort((p, q) => p - q)) === JSON.stringify(sh.elements), sh.roster);
      ok(`sets shuffle ${tag}: verdict says same set`, (await page.$eval('#verdict', e => e.textContent)).includes('Same set'));
      const inf = await page.evaluate(() => { PX.reset(); PX.setRule('prime'); PX.setInfinite(true); return PX.state(); });
      ok(`sets infinite ${tag}: dots and no upper limit`, inf.roster === '{2, 3, 5, 7, 11, ...}' && !inf.builder.includes('≤'), inf.roster);
      for (const w of ['SCHOOL', 'BANANA', 'MATHEMATICS', 'PRAYOGX']) {
        const s = await page.evaluate(v => { PX.setWord(v); return PX.state(); }, w);
        const want = [...new Set(w)];
        ok(`sets word ${w} ${tag}: ${want.length} letters, ${w.length - want.length} repeats dropped`, JSON.stringify(s.letters) === JSON.stringify(want) && s.repeats === w.length - want.length, s.letters.join(''));
      }
      await page.evaluate(() => { PX.reset(); PX.setRule('even'); PX.setLimit(100); });
      const ovS = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok(`sets ${tag}: no horizontal overflow with 50 elements`, ovS <= 0, ovS);

      // ---- electric charge: conservation, signs and the force rule
      await page.goto(base + 'electric-charge-like-and-unlike/sim.html', { waitUntil: 'load' });
      const rubbed = await page.evaluate(() => { PX.reset(); PX.rub(); PX.rub(); PX.setPair('pf'); PX.rub(); return PX.state(); });
      ok(`charge rub ${tag}: glass +6, silk −6, fur +3, plastic −3, pair totals 0`, rubbed.q.glass === 6 && rubbed.q.silk === -6 && rubbed.q.fur === 3 && rubbed.q.plastic === -3 && rubbed.q.glass + rubbed.q.silk === 0 && rubbed.q.fur + rubbed.q.plastic === 0, JSON.stringify(rubbed.q));
      for (const [a, b, want] of [['glass', 'fur', 'repel'], ['silk', 'plastic', 'repel'], ['glass', 'plastic', 'attract'], ['silk', 'fur', 'attract'], ['glass', 'silk', 'attract']]) {
        const s = await page.evaluate(v => { PX.pick(v[0], v[1]); return PX.state(); }, [a, b]);
        ok(`charge ${a} vs ${b} ${tag}: ${want}`, s.force === want, s.force);
      }
      const neutral = await page.evaluate(() => { PX.reset(); PX.pick('plastic', 'fur'); return PX.state().force; });
      ok(`charge ${tag}: unrubbed objects exert no force`, neutral === 'none', neutral);
      const ovChg = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok(`charge ${tag}: no horizontal overflow`, ovChg <= 0, ovChg);

      // ---- relations: each rule against a brute-force filter of A × A
      await page.goto(base + 'empty-and-universal-relations/sim.html', { waitUntil: 'load' });
      const relRules = { sum10: (a, b) => a + b === 10, eq: (a, b) => a === b, lt: (a, b) => a < b, even: (a, b) => (a + b) % 2 === 0, diff: (a, b) => Math.abs(a - b) < 5 };
      for (const [id, fn] of Object.entries(relRules)) {
        const s = await page.evaluate(v => { PX.setRule(v); return PX.state(); }, id);
        const want = []; for (const a of [1, 2, 3, 4]) for (const b of [1, 2, 3, 4]) if (fn(a, b)) want.push([a, b]);
        const ty = want.length === 0 ? 'empty' : want.length === 16 ? 'universal' : 'between';
        ok(`relations ${id} ${tag}: ${want.length} pairs, ${ty}`, JSON.stringify(s.pairs) === JSON.stringify(want) && s.type === ty, `${s.count} ${s.type}`);
      }
      const tog = await page.evaluate(() => { PX.setRule('sum10'); PX.toggle(0); return PX.state(); });
      ok(`relations ${tag}: tapping a cell leaves the empty relation`, tog.count === 1 && tog.type === 'between' && tog.pairs[0][0] === 1 && tog.pairs[0][1] === 1, JSON.stringify(tog.pairs));
      const ovRel = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok(`relations ${tag}: no horizontal overflow`, ovRel <= 0, ovRel);

      // ---- Pascal: every entry by the product formula, row sums 2^n, slanted sums Fibonacci
      await page.goto(base + 'pascals-triangle-patterns/sim.html', { waitUntil: 'load' });
      const nCk = (n, k) => { let v = 1; for (let i = 1; i <= k; i++) v = v * (n - k + i) / i; return Math.round(v); };
      const tbl = await page.evaluate(() => { PX.reset(); PX.setRows(16); return PX.state().table; });
      ok(`pascal ${tag}: 16 rows equal nCk`, tbl.every((row, n) => row.every((v, k) => v === nCk(n, k))), tbl[15].join(' '));
      for (const r of [0, 3, 7, 12]) {
        const s = await page.evaluate(v => { PX.setMode('rows'); PX.tap(v, 0); return PX.state(); }, r);
        ok(`pascal row ${r} ${tag}: sum 2^${r}`, s.rowSum === 2 ** r, s.rowSum);
      }
      const fibs = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55];
      for (let n = 0; n < 10; n++) {
        const s = await page.evaluate(v => { PX.setMode('fib'); PX.tap(v, 0); return PX.state(); }, n);
        ok(`pascal slanted line ${n} ${tag}: ${fibs[n]}`, s.fib === fibs[n], s.fib);
      }
      const rule = await page.evaluate(() => { PX.setMode('rule'); PX.tap(4, 2); return PX.state().text; });
      ok(`pascal rule ${tag}: 3 + 3 = 6`, rule.includes('3 + 3 = 6'), rule);
      const ovPas = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok(`pascal ${tag}: no horizontal overflow at 16 rows`, ovPas <= 0, ovPas);

      // ---- reagent lab: an independent table of expected outcomes
      await page.goto(base + 'oxidation-reduction-aldehydes-ketones/sim.html', { waitUntil: 'load' });
      const redox = [['ethanal', 'hydride', 'Ethanol', 2], ['propanal', 'hydride', 'Propan-1-ol', 3], ['propanone', 'hydride', 'Propan-2-ol', 3], ['butanone', 'hydride', 'Butan-2-ol', 4],
        ['ethanal', 'clem', 'Ethane', 2], ['propanone', 'wk', 'Propane', 3], ['butanone', 'clem', 'Butane', 4],
        ['ethanal', 'tollens', 'Ethanoic acid', 2], ['propanal', 'strong', 'Propanoic acid', 3], ['propanone', 'tollens', 'No reaction', 3], ['butanone', 'tollens', 'No reaction', 4]];
      for (const [c, r, want, n] of redox) {
        const s = await page.evaluate(v => { PX.set(v[0], v[1]); return PX.state(); }, [c, r]);
        ok(`redox ${c} + ${r} ${tag}: ${want}, ${n} C`, s.name === want && s.carbons === n, `${s.name} ${s.carbons}`);
      }
      for (const c of ['propanone', 'butanone']) {
        const s = await page.evaluate(v => { PX.set(v, 'strong'); return PX.state(); }, c);
        ok(`redox ${c} strong ${tag}: a mixture, every acid with fewer carbons`, s.kind === 'mixture' && s.carbons < s.start, `${s.carbons} < ${s.start}`);
      }
      const ovX = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok(`redox ${tag}: no horizontal overflow`, ovX <= 0, ovX);

      // ---- rest and motion: you start at −20 m and ride 4 m/s for 10 s; friend sits 1.5 m ahead
      await page.goto(base + 'rest-and-motion/sim.html', { waitUntil: 'load' });
      for (const [o, t, pos, ch, mov] of [['platform', 10, 20, 40, true], ['platform', 5, 0, 20, true], ['friend', 10, -1.5, 0, false], ['friend', 3, -1.5, 0, false]]) {
        const s = await page.evaluate(v => { PX.setObserver(v[0]); PX.setTime(v[1]); return PX.state(); }, [o, t]);
        ok(`rest ${o} t=${t} ${tag}: position ${pos} m, change ${ch} m, ${mov ? 'moving' : 'at rest'}`,
          near(s.position, pos, 1e-9) && near(s.change, ch, 1e-9) && s.moving === mov, `${s.position} ${s.change} ${s.moving}`);
      }
      const rv = await page.$eval('#verdict', e => e.textContent);
      ok(`rest ${tag}: friend view says AT REST`, rv.includes('AT REST'), rv);
      await page.evaluate(() => PX.setObserver('platform'));
      ok(`rest ${tag}: platform view says IN MOTION`, (await page.$eval('#verdict', e => e.textContent)).includes('IN MOTION'));
      const ov3 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok(`rest ${tag}: no horizontal overflow`, ov3 <= 0, ov3);

      // ---- rational numbers on the number line
      await page.goto(base + 'rational-numbers-on-number-line/sim.html', { waitUntil: 'load' });
      for (const [p, q, lo, hi] of [[3, 4, 0, 1], [5, 3, 1, 2], [-1, 2, -1, 0], [11, 4, 2, 3], [-7, 3, -3, -2], [6, 3, 2, 2]]) {
        const s = await page.evaluate(v => { PX.set(v[0], v[1]); PX.place(); return PX.state(); }, [p, q]);
        ok(`number line ${p}/${q} ${tag}: between ${lo} and ${hi}, ${p < 0 ? 'left' : 'right'}, ${Math.abs(p)} parts`,
          s.placed && near(s.value, p / q, 1e-12) && s.between[0] === lo && s.between[1] === hi && s.direction === (p < 0 ? 'left' : 'right') && s.parts === Math.abs(p),
          JSON.stringify(s));
      }
      const nl = await page.$eval('#out', e => e.textContent);
      ok(`number line ${tag}: 6/3 named as the integer 2 and equivalent to 2/1`, nl.includes('integer 2') && nl.includes('2/1'), nl);
      await page.click('[data-try="5,3"]');
      await page.waitForFunction(() => PX.state().placed, null, { timeout: 5000 });
      ok(`number line ${tag}: Try 5/3 animates to the point`, (await page.$eval('#out', e => e.textContent)).includes('between 1 and 2'));
      const ov4 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok(`number line ${tag}: no horizontal overflow`, ov4 <= 0, ov4);

      // ---- sky: independent Rayleigh check (λ⁻⁴ ratio, plane-parallel air mass at high Sun)
      await page.goto(base + 'why-the-sky-is-blue/sim.html', { waitUntil: 'load' });
      const hi = await page.evaluate(() => { PX.setAir(true); PX.setElevation(90); return PX.state(); });
      ok(`sky 90° ${tag}: air mass 1, sky blue-dominant, Sun near white`,
        near(hi.airMass, 1, 0.01) && hi.sky[2] > 3 * hi.sky[0] && Math.min.apply(null, hi.sun) > 0.75, JSON.stringify(hi));
      const r = (0.65 / 0.45) ** 4;
      ok(`sky ${tag}: blue scatters ≈ (650/450)⁴ = ${r.toFixed(2)} × red`, near(hi.sky[2] / hi.sky[0], r, 0.35), (hi.sky[2] / hi.sky[0]).toFixed(2));
      const m30 = await page.evaluate(() => { PX.setElevation(30); return PX.state().airMass; });
      ok(`sky 30° ${tag}: air mass ≈ 1/sin 30° = 2`, near(m30, 2, 0.02), m30);
      const lo2 = await page.evaluate(() => { PX.setElevation(2); return PX.state(); });
      ok(`sky 2° ${tag}: long path, red reaches you far more than blue`, lo2.airMass > 15 && lo2.redTransmission > 10 * lo2.blueTransmission, JSON.stringify(lo2));
      const none = await page.evaluate(() => { PX.setAir(false); return PX.state(); });
      ok(`sky no air ${tag}: black sky, white Sun`, none.sky.every(v => v === 0) && none.sun.every(v => v === 1));
      ok(`sky no air ${tag}: note says the sky is black`, (await page.$eval('#note', e => e.textContent)).includes('black'));
      const ov5 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok(`sky ${tag}: no horizontal overflow`, ov5 <= 0, ov5);

      // ---- decimal expansions: independent long division
      await page.goto(base + 'decimal-expansions/sim.html', { waitUntil: 'load' });
      const longDiv = (P, Q) => { let r = P % Q; const seen = new Map(); let d = ''; while (r && !seen.has(r)) { seen.set(r, d.length); r *= 10; d += Math.floor(r / Q); r %= Q; }
        return r ? { pre: d.slice(0, seen.get(r)), block: d.slice(seen.get(r)), term: false } : { pre: d, block: '', term: true }; };
      for (const [P, Q] of [[1, 4], [1, 3], [1, 7], [1, 6], [3, 12], [22, 7], [7, 20], [5, 13], [3, 8]]) {
        const s = await page.evaluate(v => { PX.set(v[0], v[1]); PX.run(); return PX.state(); }, [P, Q]);
        const w = longDiv(P, Q);
        ok(`decimals ${P}/${Q} ${tag}: ${Math.floor(P / Q)}.${w.pre}${w.block ? '(' + w.block + ')' : ''}`, s.whole === Math.floor(P / Q) && s.pre === w.pre && s.block === w.block && s.terminating === w.term, JSON.stringify(s));
      }
      await page.evaluate(() => { PX.set(1, 7); PX.run(); });
      const dOut = await page.$eval('#out', e => e.textContent);
      ok(`decimals ${tag}: 1/7 names the returning remainder 1 and the block 142857`, dOut.includes('142857') && dOut.includes('came back') && dOut.includes('recurring'), dOut);
      await page.evaluate(() => { PX.set(3, 12); PX.run(); });
      ok(`decimals ${tag}: 3/12 reduces to 1/4 and terminates`, (await page.$eval('#out', e => e.textContent)).includes('1/4'));
      const ov6 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok(`decimals ${tag}: no horizontal overflow`, ov6 <= 0, ov6);

      // ---- diffusion lab: hotter spreads faster; spread grows like √t (same random seed)
      await page.goto(base + 'particles-are-moving/sim.html', { waitUntil: 'load' });
      const spreadAt = (c, s) => page.evaluate(v => { PX.setTemp(v[0]); PX.drop(); PX.advance(v[1]); return PX.state(); }, [c, s]);
      const cold = await spreadAt(10, 2), hot = await spreadAt(80, 2);
      const eta = tk => 2.414e-5 * 10 ** (247.8 / (tk - 140)), Dr = (353.15 / eta(353.15)) / (283.15 / eta(283.15));
      ok(`diffusion ${tag}: D(80 °C)/D(10 °C) = T/η ratio (Stokes–Einstein) ≈ ${Dr.toFixed(2)}`, near(hot.diffusion / cold.diffusion, Dr, 0.01), (hot.diffusion / cold.diffusion).toFixed(3));
      ok(`diffusion ${tag}: 80 °C spreads about √(D ratio) = ${Math.sqrt(Dr).toFixed(2)}× more than 10 °C in 2 s`, near(hot.spread / cold.spread, Math.sqrt(Dr), 0.25), (hot.spread / cold.spread).toFixed(2));
      ok(`diffusion ${tag}: speed ratio = √(353.15/283.15)`, near(hot.speed / cold.speed, Math.sqrt(353.15 / 283.15), 0.005), (hot.speed / cold.speed).toFixed(4));
      const s1 = await spreadAt(20, 1), s4 = await spreadAt(20, 4);
      ok(`diffusion ${tag}: 4× the time ≈ 2× the spread (√t)`, s4.spread / s1.spread > 1.6 && s4.spread / s1.spread < 2.4, (s4.spread / s1.spread).toFixed(2));
      const ov7 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok(`diffusion ${tag}: no horizontal overflow`, ov7 <= 0, ov7);

      // ---- laws of reflection: r = i (from the normal); the surface angle is 90 - i; the target needs r = 50
      await page.goto(base + 'laws-of-reflection/sim.html', { waitUntil: 'load' });
      for (const a of [0, 30, 60, 85]) {
        const st = await page.evaluate(v => { PX.setAngle(v); return PX.state(); }, a);
        ok(`laws ${tag}: i = ${a} -> r = ${a}, from surface ${90 - a}`, st.i === a && st.r === a && st.fromSurface === 90 - a, JSON.stringify(st));
      }
      const hit = await page.evaluate(() => { PX.setTarget(0); PX.setAngle(50); return PX.state(); });
      const miss = await page.evaluate(() => { PX.setAngle(30); return PX.state(); });
      ok(`laws ${tag}: target at 50 is hit at i = 50 and missed at 30`, hit.hit && !miss.hit);
      const ov8 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok(`laws ${tag}: no horizontal overflow`, ov8 <= 0, ov8);

      // ---- regular vs diffused: spread grows with roughness; every ray obeys i = r and leaves upwards
      await page.goto(base + 'regular-vs-diffused-reflection/sim.html', { waitUntil: 'load' });
      const sp = [];
      for (const r of [0, 30, 60, 100]) sp.push(await page.evaluate(v => { PX.setRoughness(v); return PX.state(); }, r));
      ok(`diffused ${tag}: smooth surface = regular (spread ~0)`, sp[0].regular && sp[0].spread < 0.01, sp[0].spread);
      ok(`diffused ${tag}: spread grows with roughness`, sp[1].spread < sp[2].spread && sp[2].spread < sp[3].spread && !sp[3].regular, sp.map(x => x.spread.toFixed(1)).join(' < '));
      ok(`diffused ${tag}: every ray i = r at its facet and leaves upwards`, sp.every(x => x.rays.every(y => Math.abs(y.i - y.r) < 1e-6 && y.up)));
      const ov9 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok(`diffused ${tag}: no horizontal overflow`, ov9 <= 0, ov9);
      // ---- plane mirror: image distance, gap, and the reflection point found by least path (Fermat)
      await page.goto(base + 'image-in-a-plane-mirror/sim.html', { waitUntil: 'load' });
      const fermat = (d, y, ed, ey) => { let best = 1e9, by = 0; for (let h = -8; h <= 8; h += 0.0005) { const L = Math.hypot(d, y - h) + Math.hypot(ed, ey - h); if (L < best) { best = L; by = h; } } return by; };
      for (const [d, y, ed, ey] of [[2, 0.8, 4, -1.5], [0.5, 0, 7, 2], [6.5, -3, 1, 2], [3, 1, 3, 1]]) {
        const s = await page.evaluate(v => { PX.setObject(v[0], v[1]); PX.setEye(v[2], v[3]); return PX.state(); }, [d, y, ed, ey]);
        ok(`mirror object ${d} m ${tag}: image ${d} m behind, gap ${2 * d} m`, s.imageDist === d && s.imageY === y && near(s.gap, 2 * d, 1e-9), `${s.imageDist} ${s.gap}`);
        ok(`mirror ${d},${y} eye ${ed},${ey} ${tag}: reflection point = least path`, near(s.hit, fermat(d, y, ed, ey), 0.002), s.hit.toFixed(4));
        ok(`mirror ${d},${y} ${tag}: i = r at that point`, near(s.i, s.r, 1e-6), `${s.i.toFixed(3)} ${s.r.toFixed(3)}`);
      }
      const w0 = await page.evaluate(() => { PX.reset(); PX.walk(1); PX.walk(-1); return PX.state(); });
      ok(`mirror ${tag}: walking 1 m closer cuts the gap by 2 m`, w0.walked === -1 && w0.gapChange === -2 && w0.gap === 4, `${w0.walked} ${w0.gapChange} ${w0.gap}`);
      ok(`mirror ${tag}: the verdict states it`, (await page.$eval('#verdict', e => e.textContent)).includes('gap changed by 2.0 m'));
      const before = await page.evaluate(() => { PX.reset(); PX.setObject(2, 0); PX.setEye(3, 0); return PX.state(); });
      const offM = await page.evaluate(() => { PX.setObject(2, 4); PX.setEye(3, 4); return PX.state(); });
      ok(`mirror ${tag}: a ray that misses the mirror reaches no eye`, before.visible && !offM.visible, `${before.hit} ${offM.hit}`);
      ok(`mirror ${tag}: unseen image is still d behind`, offM.imageDist === 2 && (await page.$eval('#verdict', e => e.textContent)).includes('has not moved'));
      const movedEye = await page.evaluate(() => { PX.setObject(2, 0.5); PX.setEye(3, -2); const a = PX.state(); PX.setEye(5, 2); const b = PX.state(); return [a, b]; });
      ok(`mirror ${tag}: moving the eye never moves the image`, movedEye[0].imageDist === movedEye[1].imageDist && movedEye[0].imageY === movedEye[1].imageY && movedEye[0].hit !== movedEye[1].hit);
      const wAmb = await page.evaluate(() => { PX.setWord('AMBULANCE'); return PX.state(); });
      const wMom = await page.evaluate(() => { PX.setWord('MOM'); return PX.state(); });
      ok(`mirror words ${tag}: AMBULANCE reverses, MOM looks the same`, wAmb.reversed === 'ECNALUBMA' && !wAmb.sameInMirror && wMom.sameInMirror);
      await page.evaluate(() => PX.reset());
      const hb = await (await page.$('#h-object')).boundingBox();
      await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2); await page.mouse.down();
      await page.mouse.move(hb.x + hb.width / 2 - 30, hb.y + hb.height / 2, { steps: 3 }); await page.mouse.up();
      const dragged = await page.evaluate(() => PX.state());
      ok(`mirror ${tag}: dragging the object moves the image with it`, dragged.objectDist > 2 && dragged.imageDist === dragged.objectDist, dragged.objectDist);
      const ovM = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok(`mirror ${tag}: no horizontal overflow`, ovM <= 0, ovM);

      // ---- metal vs wood: contact temperature and heat flow against the finite-difference solver
      await page.goto(base + 'why-metal-feels-colder-than-wood/sim.html', { waitUntil: 'load' });
      for (const key of Object.keys(MATERIALS)) {
        const s = await page.evaluate(k => { PX.reset(); PX.setMaterial(0, k); PX.setTemp(10); PX.setTime(1); return PX.state(); }, key);
        ok(`heat ${key} ${tag}: contact ${FD[key].contact.toFixed(2)} °C (solver)`, near(s.left.contact, FD[key].contact, 0.15), s.left.contact.toFixed(2));
        ok(`heat ${key} ${tag}: heat flow after 1 s within 2% of the solver`, Math.abs(s.left.flow / FD[key].flow - 1) < 0.02, `${s.left.flow.toFixed(0)} / ${FD[key].flow.toFixed(0)}`);
      }
      const mw = await page.evaluate(() => { PX.reset(); PX.setMaterial(0, 'copper'); PX.setMaterial(1, 'wood'); PX.setTime(1); return PX.state(); });
      ok(`heat ${tag}: copper feels colder than wood at the same 10 °C`, mw.left.contact < 15 && mw.right.contact > 24 && mw.left.flow > 3 * mw.right.flow, `${mw.left.feel} / ${mw.right.feel}`);
      ok(`heat ${tag}: the flow ratio is far below the conductivity ratio`, mw.left.flow / mw.right.flow < 5 && mw.left.k / mw.right.k > 2000);
      ok(`heat ${tag}: both thermometers read the same`, (await page.$eval('#th0', e => e.textContent)) === (await page.$eval('#th1', e => e.textContent)));
      const eq = await page.evaluate(() => { PX.setTemp(33); return PX.state(); });
      ok(`heat ${tag}: at skin temperature no heat flows, they feel the same`, near(eq.left.flow, 0, 1e-9) && eq.left.feel === eq.right.feel && (await page.$eval('#verdict', e => e.textContent)).includes('No heat flows'));
      const hotS = await page.evaluate(() => { PX.setTemp(60); return PX.state(); });
      ok(`heat ${tag}: on a hot object metal feels hotter`, hotS.left.contact > hotS.right.contact + 10 && hotS.left.flow < 0 && (await page.$eval('#verdict', e => e.textContent)).includes('hotter'), `${hotS.left.contact.toFixed(1)} ${hotS.right.contact.toFixed(1)}`);
      const seam = await page.evaluate(() => { PX.reset(); PX.setTime(2); return [PX.tempAt(0, -1e-7), PX.tempAt(0, 1e-7), PX.state().left.contact]; });
      ok(`heat ${tag}: the profile is continuous at the skin`, near(seam[0], seam[2], 0.02) && near(seam[1], seam[2], 0.02), seam.map(v => v.toFixed(3)).join(' '));
      await page.evaluate(() => PX.reset());
      await page.click('#play');
      await sleep(motion === 'reduce' ? 150 : 500);
      const hp = await page.evaluate(() => PX.state().t);
      ok(`heat ${tag}: Touch both runs (reduced motion jumps to the end)`, motion === 'reduce' ? hp === 5 : hp > 0, hp);
      await page.click('#reset');
      ok(`heat ${tag}: Reset returns to no contact`, (await page.evaluate(() => PX.state().t)) === 0);
      const ovH = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok(`heat ${tag}: no horizontal overflow`, ovH <= 0, ovH);

      // ---- golden ratio: the angle from the Fibonacci limit, packing by brute force
      await page.goto(base + 'golden-ratio-and-fibonacci/sim.html', { waitUntil: 'load' });
      const fib = [1, 1]; while (fib.length < 40) fib.push(fib[fib.length - 1] + fib[fib.length - 2]);
      const limit = fib[39] / fib[38], goldenAngle = 360 * (1 - 1 / limit);
      const gs = await page.evaluate(() => { PX.reset(); return PX.state(); });
      ok(`golden ${tag}: φ and the golden angle match the Fibonacci limit`, near(gs.phi, limit, 1e-9) && near(gs.golden, goldenAngle, 1e-6), `${gs.phi} ${gs.golden}`);
      const closestPair = (a, n) => { const p = []; for (let i = 1; i <= n; i++) p.push([Math.sqrt(i) * Math.cos(i * a * Math.PI / 180), Math.sqrt(i) * Math.sin(i * a * Math.PI / 180)]);
        let m = Infinity; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) m = Math.min(m, Math.hypot(p[i][0] - p[j][0], p[i][1] - p[j][1])); return m; };
      const packs = {};
      for (const a of [120, 135, 137, 138, 144]) packs[a] = await page.evaluate(v => { PX.setAngle(v); return PX.state(); }, a);
      ok(`golden ${tag}: closest pair agrees with brute force`, near(gs.min, closestPair(goldenAngle, 300), 1e-6) && near(packs[135].min, closestPair(135, 300), 1e-6), gs.min.toFixed(3));
      ok(`golden ${tag}: 137.5° beats every neighbour for packing`, [120, 135, 137, 138, 144].every(a => gs.min > packs[a].min), [120, 135, 137, 138, 144].map(a => packs[a].min.toFixed(2)).join(' '));
      ok(`golden ${tag}: fractions leave bigger holes`, [120, 135, 144].every(a => packs[a].hole > 2 * gs.hole), `${gs.hole.toFixed(2)} vs ${packs[135].hole.toFixed(2)}`);
      ok(`golden ${tag}: 120°, 135°, 144° make 3, 8, 5 spokes; the golden angle none`, packs[120].spokes === 3 && packs[135].spokes === 8 && packs[144].spokes === 5 && gs.spokes === 0);
      await page.evaluate(() => PX.setAngle(135));
      ok(`golden ${tag}: 135° is named 3/8 of a turn`, (await page.$eval('#verdict', e => e.textContent)).includes('3/8'));
      const rim = await page.evaluate(() => { PX.golden(); PX.setSeeds(400); return PX.state().steps; });
      ok(`golden ${tag}: rim neighbours 34 and 55 seeds apart (the reel's spiral counts)`, rim[0] === 34 && rim[1] === 55, rim.join(','));
      for (const [a, b] of [[1, 1], [2, 7], [50, 3]]) {
        const s = await page.evaluate(v => { PX.setStart(v[0], v[1]); return PX.state(); }, [a, b]);
        let x = a, y = b; for (let i = 2; i < s.terms.length; i++) [x, y] = [y, x + y];
        ok(`golden start ${a}, ${b} ${tag}: last term ${y}, ratio settles on φ`, s.terms[s.terms.length - 1] === y && near(s.ratios[s.ratios.length - 1], limit, 2e-3), s.ratios[s.ratios.length - 1].toFixed(5));
      }
      await page.evaluate(() => PX.reset());
      await page.click('#grow');
      await sleep(motion === 'reduce' ? 100 : 2500);
      ok(`golden ${tag}: Grow it ends with every seed shown`, (await page.evaluate(() => PX.state().shown)) === 300);
      const ovG = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok(`golden ${tag}: no horizontal overflow`, ovG <= 0, ovG);

      // ---- coordinates: signs to quadrants, ordered pairs, Pythagoras
      await page.goto(base + 'coordinates-introduction/sim.html', { waitUntil: 'load' });
      for (const [x, y, name] of [[3, 2, 'Quadrant I'], [-2, 4, 'Quadrant II'], [-1, -3, 'Quadrant III'], [5, -2, 'Quadrant IV'], [0, 0, 'the origin'], [4, 0, 'on the x-axis'], [0, -3, 'on the y-axis']]) {
        const s = await page.evaluate(v => { PX.reset(); PX.setP(v[0], v[1]); return PX.state(); }, [x, y]);
        ok(`coordinates (${x}, ${y}) ${tag}: ${name}`, s.x === x && s.y === y && s.place === name, s.place);
      }
      for (const [a, b, c, d] of [[1, 1, 4, 5], [-2, -2, 3, 2], [0, 0, 6, 6], [-6, 6, 6, -6]]) {
        const s = await page.evaluate(v => { PX.reset(); PX.setSecond(true); PX.setP(v[0], v[1]); PX.setQ(v[2], v[3]); return PX.state(); }, [a, b, c, d]);
        const want = Math.sqrt((c - a) ** 2 + (d - b) ** 2);
        ok(`coordinates (${a}, ${b}) to (${c}, ${d}) ${tag}: distance ${want.toFixed(3)}`, near(s.distance, want, 1e-9), s.distance);
      }
      ok(`coordinates ${tag}: last case shows a surd`, (await page.$eval('#s-d', e => e.textContent)).startsWith('√288'));
      await page.evaluate(() => { PX.reset(); PX.setP(5, 1); PX.swap(); });
      const sw = await page.evaluate(() => PX.state());
      ok(`coordinates ${tag}: swapping gives a different point`, sw.x === 1 && sw.y === 5 && (await page.$eval('#verdict', e => e.textContent)).includes('ordered pair'));
      const gm = await page.evaluate(() => { PX.reset(); PX.setGame(true); PX.setP(3, -4); return PX.state(); });
      ok(`coordinates game ${tag}: swapped answer for (−4, 3) is caught`, !gm.hit && gm.target[0] === -4 && (await page.$eval('#verdict', e => e.textContent)).includes('You swapped them'));
      await page.evaluate(() => PX.setP(4, -3));
      ok(`coordinates game ${tag}: wrong signs for (−4, 3) are caught`, (await page.$eval('#verdict', e => e.textContent)).includes('wrong signs'));
      await page.evaluate(() => PX.setP(-4, 3));
      ok(`coordinates game ${tag}: the right point is accepted`, (await page.evaluate(() => PX.state().hit)) && (await page.$eval('#verdict', e => e.textContent)).includes('Exactly right'));
      await page.evaluate(() => PX.reset());
      const pb = await (await page.$('#plane')).boundingBox();
      await page.mouse.click(pb.x + pb.width * (220 + 33 * 4) / 440, pb.y + pb.height * (220 + 33 * 2) / 440);
      const tapped = await page.evaluate(() => PX.state());
      ok(`coordinates ${tag}: a tap places the point at (4, −2)`, tapped.x === 4 && tapped.y === -2, `${tapped.x},${tapped.y}`);
      const ovC = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok(`coordinates ${tag}: no horizontal overflow`, ovC <= 0, ovC);

      // ---- real numbers: any route gives the trial-division primes; HCF by Euclid
      await page.goto(base + 'real-numbers-introduction/sim.html', { waitUntil: 'load' });
      const trial = v => { const f = []; for (let p = 2; p * p <= v; p++) while (v % p === 0) { f.push(p); v /= p; } if (v > 1) f.push(v); return f; };
      for (const v of [360, 1001, 4096, 9999, 7560, 97]) {
        const s = await page.evaluate(x => { PX.setN(x); const out = []; for (let i = 0; i < 6; i++) { PX.restart(); PX.auto(); out.push(PX.state().row.slice().sort((a, b) => a - b)); } return { rows: out, st: PX.state() }; }, v);
        const want = JSON.stringify(trial(v));
        ok(`primes ${v} ${tag}: six random routes all give ${trial(v).join('×')}`, s.rows.every(r => JSON.stringify(r) === want) && s.st.finished, JSON.stringify(s.rows[0]));
      }
      const r360 = await page.evaluate(() => { PX.setN(360); PX.split(0, 36); return PX.state(); });
      ok(`primes ${tag}: 360 splits as 36 × 10`, JSON.stringify(r360.row) === '[36,10]', JSON.stringify(r360.row));
      const routeA = await page.evaluate(() => { PX.split(0, 6); PX.split(0, 2); PX.split(2, 2); PX.split(4, 2); return PX.state(); });
      ok(`primes ${tag}: route one ends in 2³ × 3² × 5`, routeA.finished && routeA.result === '2³ × 3² × 5', routeA.result);
      const routeB = await page.evaluate(() => { PX.restart(); PX.split(0, 2); PX.split(1, 2); PX.split(2, 2); PX.split(3, 3); PX.split(4, 3); return PX.state(); });
      ok(`primes ${tag}: route two gives the same, two routes counted`, routeB.result === '2³ × 3² × 5' && routeB.routes === 2, `${routeB.result} ${routeB.routes}`);
      ok(`primes ${tag}: the verdict names the theorem`, (await page.$eval('#verdict', e => e.textContent)).includes('Fundamental Theorem'));
      const badSplit = await page.evaluate(() => { PX.setN(360); return PX.split(0, 7); });
      ok(`primes ${tag}: a non-factor is refused`, badSplit === false);
      await page.evaluate(() => PX.setN(97));
      ok(`primes ${tag}: a prime cannot be split`, (await page.$eval('#verdict', e => e.textContent)).includes('97 is prime'));
      for (const [a, b] of [[12, 18], [96, 360], [35, 48], [9999, 7560], [17, 17]]) {
        const s = await page.evaluate(v => { PX.setAB(v[0], v[1]); return PX.state(); }, [a, b]);
        const h = gcd(a, b);
        ok(`primes HCF ${a}, ${b} ${tag}: ${h}, LCM ${a * b / h}`, s.hcf === h && s.lcm === a * b / h && s.hcf * s.lcm === a * b, `${s.hcf} ${s.lcm}`);
      }
      await page.evaluate(() => { PX.setN(4096); PX.auto(); PX.setAB(9999, 7560); });
      const ovR = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok(`primes ${tag}: no horizontal overflow on the longest case`, ovR <= 0, ovR);

      // ---- position: the reel's table, then any origin leaves the displacement alone
      await page.goto(base + 'position-origin-and-direction/sim.html', { waitUntil: 'load' });
      const home0 = await page.evaluate(() => { PX.reset(); return PX.state(); });
      ok(`position ${tag}: origin at home gives school −150, shop +200`, home0.positions.school === -150 && home0.positions.home === 0 && home0.positions.shop === 200, JSON.stringify(home0.positions));
      const sch = await page.evaluate(() => { PX.reset(); PX.originAt('school'); return PX.state(); });
      ok(`position ${tag}: origin at school gives 0, +150, +350 and still +200`, sch.positions.school === 0 && sch.positions.home === 150 && sch.positions.shop === 350 && sch.displacement === 200, JSON.stringify(sch.positions));
      for (const o of [-300, -70, 0, 130, 400]) {
        const s = await page.evaluate(v => { PX.reset(); PX.setOrigin(v); return PX.state(); }, o);
        ok(`position origin ${o} ${tag}: positions shift by it, displacement +200`, s.positions.shop === 200 - o && s.positions.school === -150 - o && s.displacement === 200 && s.distance === 200, JSON.stringify(s.positions));
      }
      const fl = await page.evaluate(() => { PX.reset(); PX.flip(); return PX.state(); });
      ok(`position flip ${tag}: signs reverse, displacement −200, distance 200`, fl.positions.shop === -200 && fl.positions.school === 150 && fl.displacement === -200 && fl.distance === 200, JSON.stringify(fl));
      ok(`position flip ${tag}: no negative zero at the origin`, !Object.is(fl.positions.home, -0));
      const tr = await page.evaluate(() => { PX.reset(); PX.setTrip('shop', 'school'); return PX.state(); });
      ok(`position trip ${tag}: shop to school is −350 m`, tr.displacement === -350 && tr.distance === 350);
      await page.evaluate(() => { PX.reset(); PX.setOrigin(100); });
      ok(`position ${tag}: verdict says positions change, the trip does not`, (await page.$eval('#verdict', e => e.textContent)).includes('Every position changed'));
      await page.evaluate(() => PX.reset());
      const gb = await (await page.$('#grab')).boundingBox();
      await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2); await page.mouse.down();
      await page.mouse.move(gb.x + gb.width / 2 + 40, gb.y + gb.height / 2, { steps: 3 }); await page.mouse.up();
      const dg = await page.evaluate(() => PX.state());
      ok(`position ${tag}: dragging the flag moves the origin`, dg.origin > 0 && dg.displacement === 200, dg.origin);
      const ovP = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok(`position ${tag}: no horizontal overflow`, ovP <= 0, ovP);

      // ---- ice: drop against Clausius-Clapeyron, the IAPWS anchor point, what no pressure can do
      await page.goto(base + 'why-is-ice-slippery/sim.html', { waitUntil: 'load' });
      const ccSlope = 273.15 * (1.0908e-3 - 1.0002e-3) / 333550; // dT/dP = T Δv / L, K per Pa
      for (const [m, area, cm2] of [[60, 'shoes', 300], [60, 'skates', 10], [60, 'edge', 1], [150, 'edge', 1]]) {
        const s = await page.evaluate(v => { PX.reset(); PX.setMass(v[0]); PX.setArea(v[1]); return PX.state(); }, [m, area]);
        const load = m * 9.81 / (cm2 * 1e-4), want = load * ccSlope;
        ok(`ice ${m} kg on ${area} ${tag}: pressure ${(load / 101325).toFixed(1)} atm above air`, near(s.loadAtm, load / 101325, 1e-6), s.loadAtm.toFixed(3));
        // Clausius-Clapeyron at 0 °C is the tangent to the melting curve, so it only holds for small drops;
        // the real curve steepens, so a bigger drop must sit a little above the tangent, never below it
        if (want < 0.5) ok(`ice ${m} kg on ${area} ${tag}: drop within 3% of Clausius-Clapeyron (${want.toFixed(4)} °C)`, Math.abs(s.drop / want - 1) < 0.03, s.drop.toFixed(4));
        else ok(`ice ${m} kg on ${area} ${tag}: drop just above the tangent ${want.toFixed(4)} °C (curve steepens)`, s.drop > want && s.drop < want * 1.06, s.drop.toFixed(4));
        ok(`ice ${m} kg on ${area} ${tag}: a fraction of a degree at most`, s.drop < 1.2, s.drop.toFixed(3));
      }
      const minus1 = await page.evaluate(() => PX.meltP(272.15));
      ok(`ice ${tag}: melting pressure at −1 °C is about 13 MPa`, near(minus1 / 1e6, 13.2, 0.3), (minus1 / 1e6).toFixed(2));
      const anchor = await page.evaluate(() => [PX.meltP(251.165), PX.meltP(273.16)]);
      ok(`ice ${tag}: melting curve hits the IAPWS points (208.566 MPa, 611.657 Pa)`, near(anchor[0] / 1e6, 208.566, 0.05) && near(anchor[1], 611.657, 1e-6), anchor.join(' '));
      const rink = await page.evaluate(() => { PX.reset(); return PX.state(); });
      const mNeed = rink.needAtm && (rink.needAtm - 1) * 101325 * 10e-4 / 9.81;
      ok(`ice ${tag}: 60 kg on skates at −5 °C does not melt it; about ${Math.round(mNeed / 100) / 10} tonnes would`, !rink.melts && near(rink.massNeeded, mNeed, 1) && rink.massNeeded > 3000, rink.massNeeded.toFixed(0));
      const warmI = await page.evaluate(() => { PX.reset(); PX.setArea('edge'); PX.setIce(-0.2); return PX.state(); });
      ok(`ice ${tag}: a skate edge can melt ice at −0.2 °C`, warmI.melts && warmI.massNeeded < 60, warmI.massNeeded.toFixed(1));
      const cold30 = await page.evaluate(() => { PX.reset(); PX.setIce(-30); return PX.state(); });
      ok(`ice ${tag}: at −30 °C no pressure works, and the page says so`, !cold30.possible && !cold30.melts && (await page.$eval('#verdict', e => e.textContent)).includes('No pressure'));
      const ovI = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok(`ice ${tag}: no horizontal overflow`, ovI <= 0, ovI);
      ok(`all sims ${tag}: no console errors`, errs.length === 0, errs.join(' | '));
      await ctx.close();
    }
  } finally {
    await browser.close();
    srv.kill();
  }
  console.log(`\n${n - bad} / ${n} passed`);
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
