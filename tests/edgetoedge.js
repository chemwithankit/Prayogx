const ROOT = process.env.PRAYOGX_ROOT || require('path').resolve(__dirname, '..');
const { chromium } = require(process.env.PLAYWRIGHT || '/home/claude/build/node_modules/playwright');
const { spawn } = require('child_process');
const fs = require('fs'), net = require('net');
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------------------------------------------------------------------------
   Android 16 forces edge-to-edge on anything targeting API 36, so the WebView
   fills the screen including the status and navigation bars. MainActivity hands
   the real WindowInsets to the page as --safe-t/-b/-l/-r; app.css pads every
   edge-touching surface by them.

   This suite exercises the CSS half for real, in a browser, by setting those
   four properties exactly the way MainActivity does and then measuring what
   moved. The native half cannot run here - no Android SDK, no emulator - so it
   is checked statically: the property names MainActivity writes must be the
   ones app.css reads, or the two halves would pass separately and fail together.
   --------------------------------------------------------------------------- */

const MAIN_ACTIVITY = ROOT + '/app/android/app/src/main/java/com/prayogx/app/MainActivity.java';
const APP_CSS       = ROOT + '/app/www/app.css';
const AXES          = ['--safe-t', '--safe-b', '--safe-l', '--safe-r'];

let n = 0, bad = 0;
const ok = (l, c, x) => { n++; if (!c) bad++;
  console.log((c ? 'PASS  ' : 'FAIL  ') + l + (x !== undefined ? '   ' + x : '')); };

(async () => {
  // ---------------------------------------------------- static: the contract
  const java = fs.readFileSync(MAIN_ACTIVITY, 'utf8');
  const css  = fs.readFileSync(APP_CSS, 'utf8');
  const written = AXES.filter(a => java.indexOf("setProperty('" + a + "'") >= 0);
  ok('MainActivity publishes all four inset axes', written.length === 4, written.join(' '));
  const consumed = AXES.filter(a => new RegExp('var\\(' + a + '\\)').test(css));
  ok('app.css consumes all four', consumed.length === 4, consumed.join(' '));
  ok('it reads the system bars and the display cutout, not just one',
     /Type\.systemBars\(\)\s*\|\s*WindowInsetsCompat\.Type\.displayCutout\(\)/.test(java));
  ok('it re-publishes on page load, so the first paint is not left unpadded',
     /addWebViewListener/.test(java) && /onPageLoaded/.test(java));
  ok('it does not move or resize the WebView',
     !/setLayoutParams|setPadding|MarginLayoutParams/.test(java));
  ok('it survives a document that does not exist yet',
     /var d\s*=\s*document\.documentElement;\s*if\s*\(!d\)\s*return;/.test(java));
  ok('it passes the insets on rather than consuming them',
     /return windowInsets;/.test(java) && !/CONSUMED/.test(java));
  ok('iOS is untouched: the properties still default to env(safe-area-inset-*)',
     AXES.every(a => new RegExp(a.replace('--','') + ':\\s*env\\(safe-area-inset-').test(
       css.replace(/--safe-t:/,'safe-t:').replace(/--safe-b:/,'safe-b:')
          .replace(/--safe-l:/,'safe-l:').replace(/--safe-r:/,'safe-r:'))));

  // ---------------------------------------------------------- serve + launch
  const freePort = () => new Promise(res => { const sv = net.createServer();
    sv.listen(0, '127.0.0.1', () => { const q = sv.address().port; sv.close(() => res(q)); }); });
  const PS = await freePort(), PA = await freePort();
  const site = spawn('python3', [__dirname + '/corsserve.py', String(PS), ROOT], { stdio: 'ignore' });
  const T = __dirname + '/e2etest';
  fs.rmSync(T, { recursive: true, force: true }); fs.mkdirSync(T, { recursive: true });
  for (const f of fs.readdirSync(ROOT + '/app/www'))
    fs.copyFileSync(ROOT + '/app/www/' + f, T + '/' + f);
  fs.writeFileSync(T + '/config.js', fs.readFileSync(T + '/config.js', 'utf8')
    .replace(/origin:\s*"[^"]+"/, 'origin: "http://127.0.0.1:' + PS + '"'));
  const app = spawn('python3', ['-m', 'http.server', String(PA), '--bind', '127.0.0.1'],
                    { cwd: T, stdio: 'ignore' });
  await sleep(1000);

  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const A = 'http://127.0.0.1:' + PA + '/';

  /* Exactly the statement MainActivity.publishInsets() builds. */
  const publishInsets = (t, bm, l, r) => `(function(){var d=document.documentElement; if(!d) return; var s=d.style;
      s.setProperty('--safe-t','${t.toFixed(2)}px');
      s.setProperty('--safe-b','${bm.toFixed(2)}px');
      s.setProperty('--safe-l','${l.toFixed(2)}px');
      s.setProperty('--safe-r','${r.toFixed(2)}px');
    })();`;

  /* Is the point (x,y) actually the given element, or something inside it? */
  const HITS = `(sel, x, y) => {
     const want = document.querySelector(sel); if (!want) return 'no element';
     const got = document.elementFromPoint(x, y);
     if (!got) return 'nothing at point';
     return (want === got || want.contains(got) || got.contains(want)) ? true : got.className || got.tagName;
   }`;

  async function battery(label, vw, vh, ins) {
    const ctx = await b.newContext({ viewport: { width: vw, height: vh },
                                     deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(A, { waitUntil: 'networkidle' });
    await p.evaluate(publishInsets(ins.t, ins.b, ins.l, ins.r));
    await sleep(700);

    const tag = '[' + label + ']';
    const safeBottom = vh - ins.b;

    // 1. status bar vs the header
    const head = await p.evaluate(() => {
      const r = document.querySelector('.tbrow').getBoundingClientRect();
      const bar = document.querySelector('.topbar').getBoundingClientRect();
      return { rowTop: r.top, barTop: bar.top, barBottom: bar.bottom };
    });
    ok(tag + ' the status bar does not cover the app header',
       head.rowTop >= ins.t - 0.5, 'title row starts at ' + head.rowTop.toFixed(0) + 'px, inset ' + ins.t);
    ok(tag + ' the header still paints up to the top edge behind it',
       Math.abs(head.barTop) < 0.5, 'topbar top ' + head.barTop.toFixed(1));

    // 5. search + filter reachable
    for (const sel of ['#q', '#filterbtn']) {
      const hit = await p.evaluate(([s, h]) => {
        const r = document.querySelector(s).getBoundingClientRect();
        return { r: { t: r.top, b: r.bottom, l: r.left, x: r.left + r.width / 2, y: r.top + r.height / 2 },
                 hit: eval(h)(s, r.left + r.width / 2, r.top + r.height / 2) };
      }, [sel, HITS]);
      ok(tag + ' ' + sel + ' is clear of the bars and clickable',
         hit.r.t >= ins.t - 0.5 && hit.r.l >= ins.l - 0.5 && hit.hit === true,
         'top ' + hit.r.t.toFixed(0) + ', left ' + hit.r.l.toFixed(0) + ', hit ' + hit.hit);
    }

    // 2. navigation bar vs the tab bar
    const tabs = await p.evaluate(([h]) => {
      const bar = document.querySelector('.tabs').getBoundingClientRect();
      const btns = [...document.querySelectorAll('.tabs button')].map(el => el.getBoundingClientRect());
      const last = btns[btns.length - 1];
      return { barBottom: bar.bottom, lowest: Math.max(...btns.map(r => r.bottom)),
               leftmost: Math.min(...btns.map(r => r.left)),
               rightmost: Math.max(...btns.map(r => r.right)),
               hit: eval(h)('.tabs button:nth-of-type(4)', last.left + last.width / 2, last.top + last.height / 2) };
    }, [HITS]);
    ok(tag + ' the navigation bar does not cover the tab bar',
       tabs.lowest <= safeBottom + 0.5,
       'lowest button edge ' + tabs.lowest.toFixed(0) + 'px, safe bottom ' + safeBottom);
    ok(tag + ' the tab bar keeps clear of side insets',
       tabs.leftmost >= ins.l - 0.5 && tabs.rightmost <= vw - ins.r + 0.5,
       'buttons span ' + tabs.leftmost.toFixed(0) + '-' + tabs.rightmost.toFixed(0));
    ok(tag + ' a tab button is still the thing under its own centre', tabs.hit === true, tabs.hit);

    // 4. catalogue cards
    const cards = await p.evaluate(() => {
      const c = document.querySelectorAll('.simcard');
      const f = c[0].getBoundingClientRect();
      return { count: c.length, firstTop: f.top, firstLeft: f.left, firstRight: f.right,
               headerBottom: document.querySelector('.topbar').getBoundingClientRect().bottom };
    });
    ok(tag + ' the first catalogue card is below the header, not under it',
       cards.firstTop >= cards.headerBottom - 1, 'card ' + cards.firstTop.toFixed(0) +
       ' vs header ' + cards.headerBottom.toFixed(0));
    ok(tag + ' cards keep clear of side insets',
       cards.firstLeft >= ins.l - 0.5 && cards.firstRight <= vw - ins.r + 0.5,
       cards.firstLeft.toFixed(0) + '-' + cards.firstRight.toFixed(0) + ' of ' + vw);

    await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(350);
    const tail = await p.evaluate(([h]) => {
      const c = document.querySelectorAll('.simcard');
      const last = c[c.length - 1].getBoundingClientRect();
      return { bottom: last.bottom, hit: eval(h)('.simcard:last-of-type',
               last.left + last.width / 2, last.top + Math.min(20, last.height / 2)) };
    }, [HITS]);
    ok(tag + ' the last card is reachable above the tab bar and the nav bar',
       tail.bottom <= safeBottom + 0.5 && tail.hit === true,
       'bottom ' + tail.bottom.toFixed(0) + ', safe ' + safeBottom + ', hit ' + tail.hit);

    // 3 + 6. the simulation viewer
    await p.evaluate(() => window.scrollTo(0, 0)); await sleep(200);
    await p.click('.simcard'); await sleep(500);
    await p.click('#openbtn'); await sleep(1400);
    const view = await p.evaluate(([h]) => {
      const back = document.querySelector('#vback').getBoundingClientRect();
      const fr = document.getElementById('frame');
      const f = fr.getBoundingClientRect();
      const cs = getComputedStyle(fr);
      return { backTop: back.top, backHit: eval(h)('#vback', back.left + back.width / 2, back.top + back.height / 2),
               frameTop: f.top, frameBottom: f.bottom,
               padBottom: parseFloat(cs.paddingBottom), padLeft: parseFloat(cs.paddingLeft),
               padRight: parseFloat(cs.paddingRight),
               title: fr.contentDocument ? fr.contentDocument.title : '' };
    }, [HITS]);
    ok(tag + ' the viewer back control is below the status bar and clickable',
       view.backTop >= ins.t - 0.5 && view.backHit === true,
       'top ' + view.backTop.toFixed(0) + ', hit ' + view.backHit);
    ok(tag + ' the simulation frame is inset from the navigation bar',
       Math.abs(view.padBottom - ins.b) < 0.6, 'frame padding-bottom ' + view.padBottom + ', inset ' + ins.b);
    ok(tag + ' and from the side insets',
       Math.abs(view.padLeft - ins.l) < 0.6 && Math.abs(view.padRight - ins.r) < 0.6,
       view.padLeft + ' / ' + view.padRight);
    ok(tag + ' the simulation still fills the rest of the screen and runs',
       view.frameBottom - view.frameTop > vh * 0.5 && view.title.length > 0,
       Math.round(view.frameBottom - view.frameTop) + 'px tall, "' + view.title.slice(0, 34) + '"');

    ok(tag + ' no horizontal overflow with insets applied',
       (await p.evaluate(() => document.documentElement.scrollWidth -
                               document.documentElement.clientWidth)) <= 0);
    ok(tag + ' console clean', errs.length === 0, errs.slice(0, 1).join(''));
    await ctx.close();
  }

  // Pixel 8-ish: 48dp status bar, 24dp gesture pill.
  await battery('portrait',  390, 844, { t: 48, b: 24, l: 0,  r: 0  });
  // Rotated, with a cutout on the left and three-button navigation on the right.
  await battery('landscape', 844, 390, { t: 24, b: 0,  l: 48, r: 48 });

  // ------------------------------------------- nothing changes without insets
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 },
                                   deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  await p.goto(A, { waitUntil: 'networkidle' }); await sleep(600);
  const zero = await p.evaluate(() => {
    const cs = getComputedStyle(document.querySelector('.topbar'));
    const tb = getComputedStyle(document.querySelector('.tabs'));
    return { top: cs.paddingTop, left: cs.paddingLeft, right: cs.paddingRight,
             tabBottom: tb.paddingBottom, tabLeft: tb.paddingLeft };
  });
  ok('with no insets reported the layout is exactly what it was',
     zero.top === '10px' && zero.left === '14px' && zero.right === '14px' &&
     zero.tabBottom === '0px' && zero.tabLeft === '0px',
     JSON.stringify(zero));
  await ctx.close();

  console.log('\n' + (n - bad) + ' / ' + n + ' passed');
  await b.close(); try { site.kill(); } catch (e) {} app.kill();
  fs.rmSync(T, { recursive: true, force: true });
  process.exit(bad ? 1 : 0);
})();
