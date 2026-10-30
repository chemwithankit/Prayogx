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
