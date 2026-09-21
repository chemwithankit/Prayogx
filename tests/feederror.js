const ROOT = process.env.PRAYOGX_ROOT || require('path').resolve(__dirname, '..');
const { chromium } = require(process.env.PLAYWRIGHT || '/home/claude/build/node_modules/playwright');
const { spawn } = require('child_process');
const fs = require('fs'), net = require('net');
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------------------------------------------------------------------------
   The app once reported a published site that answered 404 as "No connection".
   It sent a whole debugging session into Android networking, when the truth was
   that the feed had never been deployed. Two different failures, two different
   things to do about them, so they must not share a message.

     reachable + HTTP error -> "The library is not published yet", with the
                               origin, the status and the path it asked for
     unreachable            -> "No connection"

   And neither may throw away a library already stored on the device.
   --------------------------------------------------------------------------- */

let n = 0, bad = 0;
const ok = (l, c, x) => { n++; if (!c) bad++;
  console.log((c ? 'PASS  ' : 'FAIL  ') + l + (x !== undefined ? '   ' + x : '')); };

(async () => {
  const freePort = () => new Promise(res => { const sv = net.createServer();
    sv.listen(0, '127.0.0.1', () => { const q = sv.address().port; sv.close(() => res(q)); }); });

  const PS = await freePort();          // the published site
  const PA = await freePort();          // the app shell
  const PDEAD = await freePort();       // nothing will ever listen here
  const site = spawn('python3', [__dirname + '/corsserve.py', String(PS), ROOT], { stdio: 'ignore' });

  const T = __dirname + '/feedtest';
  fs.rmSync(T, { recursive: true, force: true }); fs.mkdirSync(T, { recursive: true });
  for (const f of fs.readdirSync(ROOT + '/app/www'))
    fs.copyFileSync(ROOT + '/app/www/' + f, T + '/' + f);
  const CONFIG = fs.readFileSync(T + '/config.js', 'utf8');
  const pointAt = o => fs.writeFileSync(T + '/config.js',
    CONFIG.replace(/origin:\s*"[^"]+"/, 'origin: "' + o + '"'));

  const app = spawn('python3', ['-m', 'http.server', String(PA), '--bind', '127.0.0.1'],
                    { cwd: T, stdio: 'ignore' });
  await sleep(900);

  const GOOD = 'http://127.0.0.1:' + PS;
  const WRONG_PATH = 'http://127.0.0.1:' + PS + '/not-deployed-yet';   // answers, 404s
  const UNREACHABLE = 'http://127.0.0.1:' + PDEAD;                     // refuses
  const A = 'http://127.0.0.1:' + PA + '/';

  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));

  const screen = () => p.evaluate(() => document.getElementById('screen').innerText);
  const toast = () => p.evaluate(() => { const t = document.getElementById('toast');
                                         return t.hidden ? '' : t.innerText; });
  const cards = () => p.evaluate(() => document.querySelectorAll('.simcard').length);

  // 1. a real feed, so the device has a stored library to protect
  pointAt(GOOD);
  await p.goto(A, { waitUntil: 'networkidle' }); await sleep(1100);
  ok('the fixture feed loads normally', (await cards()) === 17, (await cards()) + ' cards');

  // 2. the site starts answering 404 while a library is already stored
  pointAt(WRONG_PATH);
  await p.goto(A, { waitUntil: 'networkidle' }); await sleep(1400);
  const keptCards = await cards(), keptToast = await toast();
  ok('a 404 does not throw away the library already on the device', keptCards === 17, keptCards + ' cards');
  ok('and it says the site answered, not that the device is offline',
     /404/.test(keptToast) && !/Offline/i.test(keptToast), JSON.stringify(keptToast));

  // 3. same 404, but nothing stored yet - the case that caused the confusion
  await ctx.clearCookies();
  await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await p.goto(A, { waitUntil: 'networkidle' }); await sleep(1400);
  const s404 = await screen();
  ok('with nothing stored, a 404 is reported as not-published, not no-connection',
     /not published/i.test(s404) && !/No connection/i.test(s404), s404.split('\n')[0]);
  ok('it names the status', /404/.test(s404));
  ok('it names the origin it asked', s404.indexOf('127.0.0.1:' + PS) >= 0);
  ok('it names the feed path, not Capacitor\'s interceptor',
     /content\/catalog\.json/.test(s404) && !/interceptor/.test(s404));

  // 4. genuinely unreachable
  await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  pointAt(UNREACHABLE);
  await p.goto(A, { waitUntil: 'domcontentloaded' }); await sleep(1800);
  const sOff = await screen();
  ok('an unreachable host is still reported as no connection',
     /No connection/i.test(sOff) && !/not published/i.test(sOff), sOff.split('\n')[0]);
  ok('and it still offers the download-once explanation',
     /offline use/i.test(sOff));

  ok('console clean throughout', errs.length === 0, errs.slice(0, 2).join(' | '));

  console.log('\n' + (n - bad) + ' / ' + n + ' passed');
  await b.close(); try { site.kill(); } catch (e) {} app.kill();
  fs.rmSync(T, { recursive: true, force: true });
  process.exit(bad ? 1 : 0);
})();
