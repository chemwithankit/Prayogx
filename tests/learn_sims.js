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
   --------------------------------------------------------------------------- */

let n = 0, bad = 0;
const ok = (l, c, x) => { n++; if (!c) bad++;
  console.log((c ? 'PASS  ' : 'FAIL  ') + l + (x !== undefined ? '   ' + x : '')); };
const near = (a, b, tol = 0.02) => Math.abs(a - b) <= tol;
const freePort = () => new Promise(res => { const sv = net.createServer();
  sv.listen(0, '127.0.0.1', () => { const q = sv.address().port; sv.close(() => res(q)); }); });
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };

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
      ok(`both sims ${tag}: no console errors`, errs.length === 0, errs.join(' | '));
      await ctx.close();
    }
  } finally {
    await browser.close();
    srv.kill();
  }
  console.log(`\n${n - bad} / ${n} passed`);
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
