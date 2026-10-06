/* CON-CHE-CALORIMETER-01 - how does a calorimeter work? (a guided virtual experiment for beginners).

   Drives the finished page headlessly as a student would, with the page's own buttons: loads with every network
   request blocked and none made; no runtime errors; nothing advances on its own; each scene's main button unlocks
   only after its observation; the lab guide always answers did / happened / why / next, and its words match the
   model (25.0 → 27.5 °C, ΔT = 2.5 °C, 100 / 200 / 400 g, q = mcΔT, 1.75 °C and 1470 J with heat loss, the bomb's
   ΔV = 0, w = 0, q_V = ΔU, the piston's expansion work and q_p = ΔH, ΔH − ΔU = Δn_gRT and three reactions); no
   equation or symbol appears before the idea it names; tapping the apparatus; Replay, Back, Pause, Reset; the
   scripted run to the target reveal and every target check; keyboard; reduced motion; identical frames twice under
   the recorder's manual clock; 390 / 360 px; the measured visual gates; draft registration.

   Run:  node tests/sim_con_che_calorimeter_01.js                                                             */
const ROOT = process.env.PRAYOGX_ROOT || require('path').resolve(__dirname, '..');
const { launch } = require('./_browser');
const { gates } = require('./visual_gates');
const { targetChecks } = require('./target_gate');
const fs = require('fs');
const crypto = require('crypto');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const ID = 'CON-CHE-CALORIMETER-01';
const REL = 'simulations/concepts/chemistry/con-che-calorimeter-01/';
const FILE = ROOT + '/' + REL + 'index.html';
const URL = 'file://' + FILE.split('/').map(encodeURIComponent).join('/');
let n = 0, bad = 0;
const ok = (l, c, x) => { n++; if (!c) bad++; console.log((c ? 'PASS  ' : 'FAIL  ') + l + (x !== undefined && !c ? '   ' + (typeof x === 'string' ? x : JSON.stringify(x)) : '')); };
const near = (a, b, t) => Math.abs(a - b) <= (t || 1e-9);
const CLOCK = () => {
  let now = 0, q = [];
  window.__pxClock = { step(ms) { now += ms; const run = q; q = []; run.forEach(f => { try { f(now); } catch (e) { console.error(e); } }); return now; } };
  window.requestAnimationFrame = f => { q.push(f); return q.length; }; window.cancelAnimationFrame = () => {};
  performance.now = () => now; const d0 = Date.now(); Date.now = () => d0 + now;
};

(async () => {
  const src = fs.readFileSync(FILE, 'utf8');
  const b = await launch();
  try {
    console.log('=== load, network, errors, page contract');
    const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } }); const asked = [];
    await ctx.route('**/*', r => { const u = r.request().url(); if (!/^(file|data):/.test(u)) { asked.push(u); return r.abort(); } return r.continue(); });
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto(URL); await sleep(400);
    const G = () => p.evaluate(() => PX.guide());
    const S = () => p.evaluate(() => PX.state());
    const idle = () => p.waitForFunction(() => !PX.state().busy, null, { timeout: 30000 });
    const dis = id => p.evaluate(i => document.getElementById(i).disabled, id);
    const label = id => p.evaluate(i => document.getElementById(i).textContent, id);
    const texts = [];                                     /* every guide text the student reads, in order, with its scene */
    const read = async () => { const g = await G(), s = await S(); texts.push({ step: s.step, t: [g.did, g.happened, g.why, g.next].join(' ') }); return g; };
    const full = g => ['did', 'happened', 'why', 'next'].every(k => g[k] && g[k].length > 3);

    ok('layout v3 contract and sim-id', await p.evaluate(id => !!document.querySelector('section#question') && !!document.querySelector('section#lab canvas#labcv')
      && !!document.getElementById('controls') && !!document.querySelector('section#solution') && !!document.querySelector('section#howto') && document.querySelector('meta[name=sim-id]').content === id, ID));
    ok('no tour button, score, timer or exam styling: the student drives the experiment', await p.evaluate(() => !document.getElementById('gobtn') && !/score|timer|marks|negative marking|guided tour/i.test(document.querySelector('main').innerText)));
    let g = await read(), s = await S();
    ok('scene 1: the lab, and the guide answers did / happened / why / next', s.step === 1 && full(g) && /walked into the lab/.test(g.did) && /Pour in 200 g of water/.test(g.next), g);
    ok('the lid\'s job: warm air and evaporating water (no steam)', /evaporating water/.test(await p.evaluate(() => { PX.go(5); PX.pick('lid'); const t = PX.guide().why; PX.reset(); return t; })));
    ok('...the NEXT line above the lab and the screen-reader copy say the same', await p.evaluate(() => /NEXT: .*Pour in 200 g/.test(document.getElementById('narr').textContent) && /Pour in 200 g/.test(document.getElementById('guidesr').textContent)));
    ok('...the main button names the action: Pour 200 g of water', /Pour 200 g of water/.test(await label('actbtn')) && !(await dis('actbtn')));
    await sleep(1500);
    ok('nothing happens on its own: still scene 1 after 1.5 s', (await S()).step === 1 && !(await S()).busy);
    await p.evaluate(() => PX.speed(6));

    console.log('=== preparing the calorimeter');
    await p.click('#actbtn'); g = await read();
    ok('pouring: the guide asks the student to watch before explaining', (await S()).anim === 'pour' && /Watch first/.test(g.why) && await dis('actbtn'));
    await idle(); g = await read();
    ok('water added → the level rises → why water: it absorbs the heat; a measured amount', /fills the inner cup/.test(g.happened) && /absorb heat/.test(g.why) && /measured amount, 200 g/.test(g.why) && /Place the reaction tube/.test(g.next));
    await sleep(800); ok('...and the next scene does not start by itself', (await S()).step === 2 && !(await S()).busy);
    await p.click('#actbtn'); await idle(); g = await read();
    ok('reaction tube placed: water all around it; the water will receive the energy', /water all around it/.test(g.happened) && /receive that energy/.test(g.why));
    await p.click('#actbtn'); await idle(); g = await read(); s = await S();
    ok('thermometer inserted → 25.0 °C → it measures temperature, not heat', near(s.thermT, 25) && /reads 25\.0 °C/.test(g.happened) && /measures temperature, not heat/.test(g.why) && /magnified view/.test(g.happened));
    await p.click('#actbtn'); await idle(); g = await read();
    ok('lid closed: everything shut inside the insulated cup; the experiment is controlled', /shut inside the insulated cup/.test(g.happened) && /controlled/.test(g.why) && /start the reaction/.test(g.next));
    for (const [part, re] of [['lid', /lid stops that/], ['ins', /reduces this unwanted heat loss/], ['water', /absorbs the heat/], ['stir', /heat spreads evenly/], ['therm', /not heat/], ['tube', /Only the heat passes/]]) {
      await p.click('#partgroup [data-p="' + part + '"]'); g = await read();
      ok('inspect ' + part + ': the guide gives its job', (await S()).part === part && re.test(g.why), g.why); }
    ok('...every part inspected, still waiting for the student', (await S()).step === 5 && /You have seen every part/.test(g.next));

    console.log('=== the reaction and the reading');
    await p.click('#actbtn');
    await p.waitForFunction(() => PX.state().progress > 0.45);
    s = await S(); g = await read();
    ok('reaction started → mid-run the thermometer is between 25.0 and 27.5 °C and the guide reports it live', s.thermT > 25.05 && s.thermT < 27.45 && /Watch the thermometer carefully: 2\d\.\d °C/.test(g.happened), s.thermT);
    ok('...the water warms ahead of the thermometer (the thermometer lags)', s.T >= s.thermT - 1e-9);
    ok('...the next button stays locked while it runs', await dis('actbtn'));
    await idle(); s = await S(); g = await read();
    ok('...the reading settles at 27.5 °C: the water received the energy', near(s.thermT, 27.5) && /stopped at 27\.5 °C/.test(g.happened) && /water received that energy/.test(g.why));
    await p.click('#actbtn'); await idle(); g = await read();
    ok('ΔT appears only now, from the two readings: 27.5 − 25.0 = 2.5 °C', /ΔT = 27\.5 − 25\.0 = 2\.5 °C/.test(g.happened) && /change in temperature/.test(g.why));
    ok('no ΔT in anything the student read before reading the change', texts.filter(x => x.step < 7).every(x => !/ΔT/.test(x.t)));

    console.log('=== the amount of water');
    await p.click('#actbtn'); g = await read();
    ok('scene 8 opens with 200 g already measured; Build the rule is locked', (await S()).step === 8 && /2\.50 °C/.test(g.happened) && await dis('actbtn') && /choose 400 g/.test(g.next));
    await p.click('#watgroup [data-w="400"]'); await idle(); g = await read();
    ok('400 g chosen: fresh water at 25.0 °C, same reaction; run it', (await S()).fresh && /Fresh water at 25\.0 °C/.test(g.happened) && /Run the reaction/.test(g.next) && /with 400 g/.test(await label('runbtn')));
    await p.click('#runbtn'); await idle(); s = await S(); g = await read();
    ok('400 g → ΔT = 1.25 °C, smaller than with 200 g', near(s.runs[400], 1.25) && /1\.25 °C, smaller than with 200 g/.test(g.happened) && /choose 100 g/.test(g.next));
    ok('...Build the rule still locked until 100 g is tried', await dis('actbtn'));
    await p.click('#watgroup [data-w="100"]'); await idle(); await p.click('#runbtn'); await idle(); s = await S(); g = await read();
    ok('100 g → ΔT = 5.00 °C; why: more water needs more energy for the same rise', near(s.runs[100], 5) && /bigger than with 200 g/.test(g.happened) && /More water needs more energy/.test(g.why));
    ok('...now Build the rule unlocks', !(await dis('actbtn')));
    await p.click('#replaybtn'); ok('Replay repeats the last run', (await S()).anim === 'run8'); await idle();
    ok('...with the same result', near((await S()).runs[100], 5));
    ok('no equation q = mcΔT anywhere the student has read so far', texts.every(x => !/q = m|mcΔT/.test(x.t)) && await p.evaluate(() => !document.getElementById('ansval').textContent));

    console.log('=== the rule emerges: q = m c ΔT');
    await p.click('#actbtn'); g = await read();
    ok('scene 9: the rule builder; nothing revealed yet', (await S()).step === 9 && !(await S()).revealed && /three things you have already met/.test(g.happened));
    await p.click('#tilegroup [data-t="m"]'); await idle(); g = await read();
    ok('m placed: the mass of water, which the student varied', /m = mass of water = 200 g/.test(g.happened) && /100, 200 and 400 g/.test(g.why) && /Place c and ΔT/.test(g.next));
    await p.click('#tilegroup [data-t="c"]'); await idle(); g = await read();
    ok('c placed: 4.2 J for 1 g and 1 °C; the joule explained', /4\.2 J g−1 °C−1/.test(g.happened) && /J \(joule\) is the unit of energy/.test(g.why));
    ok('...not revealed before the rule is complete', !(await S()).revealed);
    await p.click('#tilegroup [data-t="dT"]'); await idle(); g = await read(); s = await S();
    ok('ΔT placed: the rule is complete and the target appears: q = 200 g × 4.2 × 2.5 °C = 2.1 kJ', s.done && s.revealed && /q = m c ΔT = 200 g × 4\.2 × 2\.5 °C = 2\.1 kJ/.test(await p.evaluate(() => document.getElementById('ansval').textContent)));
    ok('...the guide: 2100 J = 2.1 kJ (1 kJ = 1000 J), and the 100 g and 400 g runs give 2100 J too', /2100 J = 2\.1\u00a0kJ \(1 kJ = 1000 J\)/.test(g.happened) && /Your 100 g and 400 g runs give 2100 J too/.test(g.happened) && /Same heat every time/.test(g.why), g.happened);
    await p.click('#watgroup [data-w="400"]'); await p.evaluate(() => { const r = document.getElementById('in_dt'); r.value = '5'; r.dispatchEvent(new Event('input')); }); g = await read(); s = await S();
    ok('changing m and ΔT changes q: 400 × 4.2 × 5.0 = 8400 J, labelled as a what-if, not the reaction', s.m9 === 400 && s.dt9 === 5 && near(s.q9, 8400) && /q would be 400 × 4\.2 × 5\.0 = 8400 J/.test(g.happened) && /only a what-if, not your reaction/.test(g.happened) && /What if\?/.test(g.did));
    ok('...and the controls say What if?', await p.evaluate(() => /What if/.test(document.querySelector('#watgroup span').textContent) && /What if/.test(document.querySelector('#dtgroup label').textContent)));

    console.log('=== heat loss');
    await p.click('#actbtn'); g = await read();
    ok('scene 10: two cups, only the insulation differs; why: real cups lose heat', /only the insulation is different/.test(g.why) && /Real cups always lose some heat/.test(g.why) && await dis('actbtn'));
    await p.click('#runbtn'); await idle(); g = await read();
    ok('insulated 2.50 °C vs poorly insulated 1.75 °C: heat leaked into the room', /Insulated: ΔT = 2\.50 °C\. Poorly insulated: only 1\.75 °C/.test(g.happened));
    ok('...why: q = mcΔT would give 1470 J instead of 2100 J; a calorimeter controls heat loss', /1470 J instead of 2100 J/.test(g.why) && /controlled conditions/.test(g.why) && !(await dis('actbtn')));

    console.log('=== the bomb calorimeter');
    await p.click('#actbtn'); await idle(); g = await read();
    ok('scene 11: a strong sealed steel vessel in water, why a bomb is needed; the piston stays locked', /sealed steel vessel/.test(g.happened) && /strong, sealed container/.test(g.why) && /can its volume change\?/.test(g.next) && await dis('actbtn'));
    await p.click('#bombgroup [data-b="oxygen"]'); g = await read();
    ok('inspect the oxygen: why it is there', /Oxygen gas under pressure/.test(g.happened) && /burn completely/.test(g.why));
    ok('ΔV, w and ΔU have not appeared yet', texts.filter(x => x.step === 11).every(x => !/ΔV|w = 0|ΔU/.test(x.t)));
    ok('the experiment button: Push the bomb\'s wall', /Push the bomb's wall/.test(await label('runbtn')));
    await p.click('#runbtn'); await idle(); g = await read(); s = await S();
    ok('rigid vessel → it did not move → ΔV = 0 → w = 0, with work explained in words', s.pushed && /did not move/.test(g.happened) && /ΔV = 0/.test(g.why) && /w = 0/.test(g.why) && /energy used to push a wall outwards/.test(g.why));
    ok('...ΔU not yet: ignite first', !/ΔU/.test(g.why) && /ignite the sample/.test(g.next) && /Ignite the sample/.test(await label('runbtn')));
    await p.click('#runbtn'); await idle(); g = await read();
    ok('ignited → heat through the steel, volume unchanged → qᵥ = ΔU, with ΔU and V explained', /volume never changed/.test(g.happened) && /qᵥ = ΔU/.test(g.why) && /change in internal energy/.test(g.why) && /the V in qᵥ/.test(g.why));
    ok('...signs: water + (takes in heat), reaction − (gives it out), ΔU = −q(water), negative', /for the water q is positive \(\+\)/.test(g.why) && /for the reaction qᵥ is negative \(−\)/.test(g.why) && /ΔU = −q\(water\)/.test(g.why) && /ΔU is negative/.test(g.why), g.why);
    ok('...now the piston unlocks', !(await dis('actbtn')));

    console.log('=== the movable piston');
    await p.click('#actbtn'); g = await read();
    ok('scene 12: why a piston; the weight keeps the pressure the same; a stirred water bath with a thermometer; ΔH not yet', /walls could not move/.test(g.why) && /same force/.test(g.why) && /stirred water bath/.test(g.did) && /thermometer/.test(g.happened) && !/ΔH/.test(g.why + g.happened) && await dis('actbtn'));
    await p.click('#runbtn'); await p.waitForFunction(() => PX.state().progress > 0.3); s = await S();
    ok('pushing the piston: it moves (unlike the bomb)', s.anim === 'ppush'); await idle(); g = await read();
    ok('...movable boundary: the volume can change', /moved down/.test(g.happened) && /boundary can move/.test(g.why));
    await p.click('#runbtn'); await idle(); g = await read();
    ok('reaction → gas expands and lifts the weight → expansion work → qₚ = ΔH, with ΔH and p explained', /lifted the piston and the weight/.test(g.happened) && /expansion work/.test(g.why) && /qₚ = ΔH/.test(g.why) && /the p in qₚ/.test(g.why) && /enthalpy change/.test(g.why));
    ok('...observed in the water bath: 1.6 °C under the piston vs 2.0 °C sealed (illustrative); ΔH negative, less negative than ΔU', /warmed by 1\.6 °C/.test(g.happened) && /2\.0 °C \(illustrative\)/.test(g.happened) && /ΔH is negative \(−\), just less negative than ΔU/.test(g.why), g.happened);
    ok('...the finished piston experiment offers ↺ Run again', /Run again/.test(await label('runbtn')));
    ok('ΔH − ΔU = Δn_gRT has not appeared before the comparison', texts.filter(x => x.step < 13).every(x => !/Δn\(g\)RT/.test(x.t)));

    console.log('=== rigid or movable');
    await p.click('#actbtn'); await idle(); g = await read();
    ok('scene 13: both negative for a reaction that gives out heat', /both are negative/.test(g.happened));
    ok('scene 13: rigid vs movable, then ΔH − ΔU = Δn(g)RT with Δn(g), R and T explained', /Rigid: no volume change/.test(g.happened) && /ΔH − ΔU = Δn\(g\)RT/.test(g.why) && /moles of gas in the products − moles of gas in the reactants/.test(g.why) && /R is the gas constant/.test(g.why));
    for (const [k, re] of [['C', /Δn\(g\) = 0\./], ['H', /Δn\(g\) = −1\.5/], ['K', /Δn\(g\) = \+1/]]) { await p.click('#exgroup [data-ex="' + k + '"]'); await idle(); g = await read(); ok('reaction ' + k + ': ' + re.source, re.test(g.happened), g.happened); }
    ok('...CaCO₃ (Δn(g) = +1): ΔH is greater than ΔU', /ΔH is greater than ΔU/.test(g.why));
    ok('the link to XP-09 (which exists)', await p.evaluate(() => !document.getElementById('applybtn').hidden && document.getElementById('applybtn').getAttribute('href') === '../con-che-delta-u-vs-delta-h/index.html') && fs.existsSync(ROOT + '/simulations/concepts/chemistry/con-che-delta-u-vs-delta-h/index.html'));
    ok('every guide the student read had all four parts', texts.every(x => x.t.split(' ').length > 8));
    await p.click('#backbtn'); ok('Back returns to scene 12 with its result kept', (await S()).step === 12 && (await S()).pistonReacted);
    await p.click('#runbtn'); await p.waitForFunction(() => PX.state().progress > 0.2);
    await p.click('#pausebtn'); const pr0 = (await S()).progress; await sleep(500);
    ok('Pause freezes the experiment and says so', near((await S()).progress, pr0) && /Paused/.test((await G()).next));
    await p.click('#pausebtn'); await sleep(300); ok('...Resume continues it', (await S()).progress > pr0 || !(await S()).busy); await idle();
    await p.click('#resetbtn');
    ok('Reset: scene 1, empty bench, the target back to its name', await p.evaluate(() => PX.state().step === 1 && !PX.state().done && !document.getElementById('ansval').textContent));
    ok('no runtime errors in the whole journey', errs.length === 0, errs.join(' | '));
    ok('no network request of any kind', asked.length === 0, asked.join(' '));
    await ctx.close();

    console.log('=== tapping the apparatus');
    const tc = await b.newContext({ viewport: { width: 1280, height: 860 } }); const tp = await tc.newPage(); await tp.goto(URL); await sleep(300);
    const tapKey = async key => { await tp.evaluate(() => document.getElementById('labcv').scrollIntoView({ block: 'center' })); await sleep(80); const pt = await tp.evaluate(k => { const h = PX.hits().filter(x => x.k === k).pop(), c = document.getElementById('labcv'), r = c.getBoundingClientRect(); return h ? { x: r.left + (h.x + h.w / 2) * r.width / c.width, y: r.top + (h.y + h.h / 2) * r.height / c.height } : null; }, key); if (pt) await tp.mouse.click(pt.x, pt.y); return !!pt; };
    ok('scene 1: the glowing beaker is a tap target, and tapping it pours', await tapKey('adv') && await tp.evaluate(() => PX.state().step === 2 && PX.state().anim === 'pour'));
    await tp.evaluate(() => { PX.speed(10); }); await tp.waitForFunction(() => !PX.state().busy);
    for (let i = 0; i < 3; i++) { await tp.evaluate(() => { PX.advance(); }); await tp.waitForFunction(() => !PX.state().busy); }
    ok('scene 5: tapping the insulation on the drawing inspects it', await tapKey('part:ins') && await tp.evaluate(() => PX.state().part === 'ins'));
    ok('a new action clears the old highlight', await tp.evaluate(() => { PX.advance(); return PX.state().part === null; }));
    await tp.waitForFunction(() => !PX.state().busy);
    ok('the lab guide\'s NEXT card names the next action and is a tap target', await tp.evaluate(() => PX.nextAction() === 'Read the temperature change' && PX.hits().some(h => h.k === 'next')));
    ok('tapping the NEXT card does it (scene 6 → 7)', await tapKey('next') && await tp.evaluate(() => PX.state().step === 7));
    await tc.close();
    const sc = await b.newContext({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' }); const sp = await sc.newPage(); await sp.goto(URL); await sleep(300);
    await sp.evaluate(() => { PX.go(6); document.getElementById('labcv').scrollIntoView({ block: 'start' }); }); await sleep(150);
    ok('small phone: with the NEXT card and buttons off screen, a sticky button offers the next action', await sp.evaluate(() => { const b = document.getElementById('stickybtn'); return !b.hidden && /Read the temperature change/.test(b.textContent) && b.getBoundingClientRect().bottom <= innerHeight && b.getBoundingClientRect().height >= 44; }));
    await sp.click('#stickybtn'); ok('...and tapping it does it', await sp.evaluate(() => PX.state().step === 7));
    await sp.evaluate(() => PX.go(13)); await sleep(150); ok('...no sticky button when there is nothing left to do', await sp.evaluate(() => document.getElementById('stickybtn').hidden));
    await sc.close();

    console.log('=== the scripted run (tests, reel recorder) and the target display');
    const man = JSON.parse(fs.readFileSync(ROOT + '/data/manifest.json', 'utf8'));
    for (const c of await targetChecks(b, URL, src, man.simulations.find(x => x.id === ID) || null)) ok(c.name, c.ok, c.detail);

    console.log('=== keyboard, reduced motion');
    const kc = await b.newContext({ viewport: { width: 1280, height: 860 } }); const kp = await kc.newPage(); await kp.goto(URL); await sleep(300);
    await kp.focus('#actbtn'); await kp.keyboard.press('Enter');
    ok('keyboard: Enter on the main button pours the water', await kp.evaluate(() => PX.state().step === 2));
    ok('a visible focus ring on the controls', await kp.evaluate(() => { const e = document.getElementById('resetbtn'); e.focus(); const st = getComputedStyle(e); return st.outlineStyle !== 'none' && parseFloat(st.outlineWidth) >= 2; }));
    await kc.close();
    const rc = await b.newContext({ viewport: { width: 1280, height: 860 }, reducedMotion: 'reduce' }); const rp = await rc.newPage(); await rp.goto(URL); await sleep(300);
    const c0 = await rp.evaluate(() => PX.RUN.clock); await sleep(400);
    ok('reduced motion: nothing animates on its own', await rp.evaluate(c => PX.RUN.clock === c, c0));
    await rp.evaluate(() => { PX.go(5); PX.advance(); });
    ok('reduced motion: Start the reaction shows the settled result at once', await rp.evaluate(() => PX.state().step === 6 && !PX.state().busy && Math.abs(PX.state().thermT - 27.5) < 1e-9));
    await rc.close();

    console.log('=== determinism (the recorder\'s manual clock)');
    async function film() {
      const c = await b.newContext({ viewport: { width: 420, height: 860 }, deviceScaleFactor: 1 }); await c.addInitScript(CLOCK); const q = await c.newPage(); await q.goto(URL);
      for (let i = 0; i < 5; i++) await q.evaluate(() => __pxClock.step(1000 / 30));
      await q.evaluate(() => PX.start()); const fr = [], sts = [];
      for (let f = 0; f < 30 * 70; f++) { await q.evaluate(() => __pxClock.step(1000 / 30));
        if (f % 60 === 0) { fr.push(crypto.createHash('sha256').update(await q.evaluate(() => document.getElementById('labcv').toDataURL())).digest('hex').slice(0, 16));
          sts.push(await q.evaluate(() => { const s = PX.state(); return [s.step, s.anim, s.progress.toFixed(5), s.thermT === null ? '-' : s.thermT.toFixed(5)].join('|'); })); }
        if (await q.evaluate(() => PX.state().done)) break; }
      const done = await q.evaluate(() => PX.state().done); await c.close(); return { fr, sts, done };
    }
    const f1 = await film(), f2 = await film();
    ok('the scripted run completes under the manual clock', f1.done && f2.done);
    ok('identical states at every sampled frame (' + f1.sts.length + ')', JSON.stringify(f1.sts) === JSON.stringify(f2.sts));
    ok('identical canvas pixels (' + f1.fr.length + ' frames)', JSON.stringify(f1.fr) === JSON.stringify(f2.fr));
    ok('no Math.random, setInterval or new Date in the script', !/Math\.random|setInterval\(|new Date\(/.test(src.slice(src.indexOf('<script'))));

    console.log('=== phones and the visual gates');
    for (const vw of [390, 360]) {
      const pc = await b.newContext({ viewport: { width: vw, height: 844 }, isMobile: true, hasTouch: true }); const pp = await pc.newPage(); await pp.goto(URL); await sleep(300);
      const ms = [];
      for (const st of [1, 4, 5, 7, 8, 9, 10, 11, 12, 13]) { await pp.evaluate(k => PX.go(k), st); await sleep(60);
        ms.push(await pp.evaluate(() => ({ s: PX.state().step, over: document.documentElement.scrollWidth > window.innerWidth, minPx: PX.minLabelPx(), taps: Math.min.apply(null, [...document.querySelectorAll('#controls button, #controls input, #controls a')].filter(e => e.offsetParent).map(e => e.getBoundingClientRect().height)) }))); }
      const badm = ms.filter(m => m.over || m.taps < 44 || m.minPx * vw / 720 < 11 * 0.97);
      ok(vw + ' px: no overflow, taps ≥ 44 px, canvas labels ≥ 11 px on screen in every scene tried', !badm.length, badm);
      await pc.close();
    }
    for (const r of await gates(FILE)) if (r.status !== 'MANUAL') ok('gate ' + r.gate + ': ' + r.name + ' (' + r.status + ')', r.status === 'PASS', r.detail);

    console.log('=== registration and invariants');
    const e = man.simulations.find(x => x.id === ID), meta = JSON.parse(fs.readFileSync(ROOT + '/' + REL + 'meta.json', 'utf8'));
    ok('registered as a published concept (script_verified, NCERT Explorer only), byte-identical to meta.json', !!e && e.status === 'script_verified' && JSON.stringify(e) === JSON.stringify(meta));
    const feed = JSON.parse(fs.readFileSync(ROOT + '/content/index.json', 'utf8'));
    ok('...and absent from the public feed', !feed.simulations.some(x => x.id === ID));
    const ex = JSON.parse(fs.readFileSync(ROOT + '/data/ncert/experiences/NCERT-11-CHE-P1-CH05.json', 'utf8')).experiences.filter(x => x.libraryId === ID);
    ok('two experience records (calorimetry, heat capacity) point to this page', ex.length === 2);
    ok('self-contained: no external script, stylesheet, fetch or storage; no visual asset declared', !/<script[^>]+src=|<link[^>]+stylesheet|fetch\(|XMLHttpRequest|localStorage|sessionStorage|indexedDB|px-visual-asset/.test(src));
    ok('ES5 only in the script (block comments, such as the embedded kit blocks\' notes, are not code)', !/(^|[^\w.$])(let|const|class)\s|=>|`/.test(src.slice(src.indexOf('<script'), src.lastIndexOf('</script>')).replace(/\/\*[\s\S]*?\*\//g, '')));
  } catch (err) {
    ok('suite ran to the end', false, err && err.stack);
  } finally { await b.close(); }
  console.log('\n' + (n - bad) + ' / ' + n + ' passed');
  process.exit(bad ? 1 : 0);
})();
