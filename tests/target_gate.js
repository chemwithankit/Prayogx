/* PrayogX target variable / result display - docs/SIMULATION_STANDARDS.md §4 (from 2026-10-01).

   Shared by the visual gate K (tests/visual_gates.js) and by every new page suite:

     const { targetChecks } = require('./target_gate');
     for (const c of await targetChecks(browser, URL)) ok(c.name, c.ok, c.detail);

   The page contract it reads:

     <p class="keyres" id="target" data-kind="value | option | match">   (inside section#lab)
       <span class="lbl">Target:</span>                 optional static label
       <span class="sym">v</span>                       the target's name or symbol, never empty
       <span class="val" id="ansval"></span>            empty in the markup; the run writes the value
     </p>
     window.PX: answer() (the computed answer), start(), reset(), speed(k), RUN.done
     The reveal adds the class "pulse" to #target once (a short CSS animation) and removes it;
     under prefers-reduced-motion the value appears with no animation.

   The checks (one result each):
     1  before the run the target area shows only the symbol
     2  ...and no UNKNOWN / ? / dash / placeholder / the answer
     3  while the run is going it still shows only the symbol
     4  after a successful run the computed value appears in the same place
     5  the value is the model's: equal to PX.answer(), empty in the markup, no answer literal in the script
     6  the reveal pulses exactly once, then the value stays visible
     7  RESET returns the area to the symbol only
     8  reduced motion: the value appears with no pulse animation
     9  the representation fits the question type (value / option / match)            */
const sleep = ms => new Promise(r => setTimeout(r, ms));

const PLACEHOLDER = /UNKNOWN|\?|[—–]|^-+$|\s-+\s|\.\.\.|…|\bN\/A\b|\bTBD\b|placeholder|pending/i;

/* what the target area shows, measured in the page */
const READ = () => {
  const t = document.getElementById('target');
  const vis = e => { if (!e) return false; const s = getComputedStyle(e), r = e.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0' && r.width > 0 && r.height > 0; };
  if (!t) return { exists: false };
  const lab = document.getElementById('lab'), sym = t.querySelector('.sym'), val = t.querySelector('.val'), lbl = t.querySelector('.lbl');
  const all = (t.innerText || '').replace(/\s+/g, ' ').trim(), l = lbl ? (lbl.innerText || '').replace(/\s+/g, ' ').trim() : '';
  return {
    exists: true, inLab: !!lab && lab.contains(t), visible: vis(t), kind: t.getAttribute('data-kind') || '',
    sym: sym ? (sym.innerText || '').replace(/\s+/g, ' ').trim() : '', symVisible: vis(sym),
    val: val && vis(val) ? (val.innerText || '').replace(/\s+/g, ' ').trim() : '',
    shown: (l && all.indexOf(l) === 0 ? all.slice(l.length) : all).trim(),
    pulsing: t.classList.contains('pulse'), anim: getComputedStyle(t).animationName,
    done: !!(window.PX && PX.RUN && PX.RUN.done)
  };
};

/* records every time the reveal class is added, with the animation that was running */
const WATCH = () => {
  const t = document.getElementById('target'); window.__pxPulse = [];
  if (!t) return;
  let was = t.classList.contains('pulse');
  new MutationObserver(() => {
    const now = t.classList.contains('pulse');
    if (now && !was) window.__pxPulse.push({ at: performance.now(), anim: getComputedStyle(t).animationName });
    was = now;
  }).observe(t, { attributes: true, attributeFilter: ['class'] });
};

const esc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const holdsAnswer = (text, ans) => !!ans && new RegExp('(^|[^\\w.])' + esc(ans) + '($|[^\\w.])').test(text);

function kindFor(entry) {
  if (!entry) return null;
  const t = (entry.questionType || '').toLowerCase();
  if (/match/.test(t)) return 'match';
  if (/option|mcq|correct/.test(t)) return 'option';
  return 'value';
}

/* symbol-only: the symbol, nothing else, nothing that looks like a placeholder or the answer */
function symbolOnly(s, ans) {
  if (!s || !s.exists) return [false, 'no #target'];
  if (!s.visible || !s.symVisible || !s.sym) return [false, 'target or its symbol not visible'];
  if (s.val) return [false, 'a value is already shown: "' + s.val + '"'];
  if (s.shown !== s.sym) return [false, 'shows "' + s.shown + '", not only the symbol "' + s.sym + '"'];
  return [true, 'shows only "' + s.sym + '"'];
}
function clean(s, ans) {
  if (!s || !s.exists) return [false, 'no #target'];
  if (PLACEHOLDER.test(s.shown)) return [false, 'placeholder text in "' + s.shown + '"'];
  if (holdsAnswer(s.shown, ans) && !holdsAnswer(s.sym, ans)) return [false, 'the answer ' + ans + ' is already shown'];
  return [true, 'no placeholder, no answer'];
}

async function runOnce(p) {
  const states = [];
  await p.evaluate(() => { if (PX.speed) PX.speed(4); PX.start(); });
  for (let i = 0; i < 1500; i++) {
    const s = await p.evaluate(READ);
    states.push(s);
    if (s.done) break;
    await sleep(60);
  }
  return states;
}

/* entry: the manifest entry when the page is registered (for the question type), else null */
async function targetChecks(b, url, src, entry) {
  const out = [];
  const add = (name, r) => out.push({ name: name, ok: !!r[0], detail: r[1] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  try {
    await p.goto(url); await sleep(600);
    await p.evaluate(WATCH);
    const hooks = await p.evaluate(() => !!(window.PX && typeof PX.answer === 'function' && typeof PX.start === 'function' && typeof PX.reset === 'function' && PX.RUN));
    const ans = hooks ? String(await p.evaluate(() => PX.answer())) : '';
    const s0 = await p.evaluate(READ);
    add('target 1: before the run the target area (#target in section#lab) shows only the symbol', !s0.exists ? [false, 'no #target'] : !s0.inLab ? [false, '#target is not inside section#lab'] : symbolOnly(s0, ans));
    add('target 2: no UNKNOWN, ?, dash, placeholder or answer before the run', clean(s0, ans));
    if (!hooks) {
      add('target 3-9: window.PX exposes answer(), start(), reset(), speed() and RUN', [false, 'missing PX hooks']);
      return out;
    }
    const states = await runOnce(p);
    const during = states.filter(s => !s.done);
    const bad = during.map(s => [symbolOnly(s, ans), clean(s, ans)]).find(r => !r[0][0] || !r[1][0]);
    add('target 3: while the experiment runs it still shows only the symbol', during.length < 3 ? [false, 'only ' + during.length + ' samples before the run ended'] : bad ? [false, (bad[0][0] ? bad[1] : bad[0])[1]] : [true, during.length + ' samples, symbol only']);
    const end = states[states.length - 1];
    await sleep(120);
    const s1 = await p.evaluate(READ);
    add('target 4: after the run the computed value appears in the same place', !end.done ? [false, 'the run did not finish'] : s1.val && s1.symVisible ? [true, '"' + s1.sym + '" + "' + s1.val + '"'] : [false, 'no value shown after the run']);
    const markupVal = /<[^>]*class="[^"]*\bval\b[^"]*"[^>]*>([^<]*)</.exec(src || '');
    const script = (src || '').slice((src || '').indexOf('<script'));
    /* a one-letter option answer is only a literal in its option form, "(D)"; labels like "D" are fine */
    const literal = ans && new RegExp(ans.length <= 2 ? '["\']\\(' + esc(ans) + '\\)["\']' : '["\']' + esc(ans) + '["\']').test(script);
    add('target 5: the value is the model\'s - it holds PX.answer(), is empty in the markup, and the script has no answer literal',
      !s1.val ? [false, 'no value'] : !holdsAnswer(s1.val, ans) && s1.val.indexOf(ans) < 0 ? [false, '"' + s1.val + '" does not hold PX.answer() = ' + ans]
        : !src ? [false, 'page source unavailable'] : markupVal && markupVal[1].trim() ? [false, 'the markup already holds "' + markupVal[1].trim() + '"']
          : literal ? [false, 'the script contains the literal ' + JSON.stringify(ans)] : [true, '"' + s1.val + '" from PX.answer() = ' + ans]);
    await sleep(3000);
    const pul = await p.evaluate(() => window.__pxPulse || []);
    const s2 = await p.evaluate(READ);
    add('target 6: the reveal pulses exactly once, then the value stays visible',
      pul.length !== 1 ? [false, 'the pulse was added ' + pul.length + ' times'] : pul[0].anim === 'none' ? [false, 'the pulse class has no animation']
        : s2.pulsing ? [false, 'still pulsing 3 s later'] : !s2.val ? [false, 'the value disappeared after the pulse'] : [true, 'one pulse (' + pul[0].anim + '), value kept']);
    await p.evaluate(() => PX.reset()); await sleep(250);
    const s3 = await p.evaluate(READ);
    const r3 = symbolOnly(s3, ans), c3 = clean(s3, ans);
    add('target 7: RESET returns the area to the symbol only', r3[0] && c3[0] ? r3 : (r3[0] ? c3 : r3));
    const kind = s1.kind, want = kindFor(entry);
    let r9;
    if (['value', 'option', 'match'].indexOf(kind) < 0) r9 = [false, 'data-kind is "' + kind + '", not value / option / match'];
    else if (want && want !== kind) r9 = [false, 'data-kind ' + kind + ' but the question type "' + entry.questionType + '" needs ' + want];
    else if (kind === 'value') r9 = [true, 'value'];
    else {
      const letters = (ans.match(/\b[A-D]\b/g) || []);
      const allLetters = letters.length && letters.every(x => new RegExp('\\(' + x + '\\)').test(s1.val));
      const maps = (s1.val.match(/[A-Z]\s*→\s*\(?\d+\)?/g) || []).length;
      r9 = !allLetters ? [false, 'the option(s) ' + letters.join(', ') + ' are not shown as (X) in "' + s1.val + '"']
        : kind === 'match' && maps < 2 ? [false, 'a match needs its pairs (P→3 ...) in "' + s1.val + '"'] : [true, kind + ': "' + s1.val + '"'];
    }
    add('target 9: the result fits the question type (value, option, or match with its pairs)', r9);
    add('target: no page errors', [errs.length === 0, errs[0] || 'none']);
  } finally { await ctx.close(); }

  /* 8 - reduced motion, in its own context */
  const rc = await b.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const rp = await rc.newPage();
  try {
    await rp.goto(url); await sleep(500);
    await rp.evaluate(WATCH);
    if (await rp.evaluate(() => !!(window.PX && PX.start))) {
      const st = await runOnce(rp); await sleep(400);
      const s = await rp.evaluate(READ), pul = await rp.evaluate(() => window.__pxPulse || []);
      add('target 8: reduced motion reveals the value with no pulse animation',
        !st[st.length - 1].done || !s.val ? [false, 'no value after the run'] : pul.some(x => x.anim !== 'none') ? [false, 'a pulse animation ran (' + pul.map(x => x.anim).join(',') + ')'] : [true, 'value "' + s.val + '", no animation']);
    }
  } finally { await rc.close(); }
  return out.sort((a, b) => a.name < b.name ? -1 : 1);
}

module.exports = { targetChecks, kindFor };
