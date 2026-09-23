/* The AdMob banner: shown on the library, never over a simulation, never in
   the way of the tab bar, and a no-op everywhere it does not belong.

   There is no native plugin in a headless browser, so window.Capacitor is
   stubbed with the real plugin's contract - including the part that matters
   most: hideBanner() REJECTS when no banner was ever shown. If the app layer
   does not swallow that, this suite sees an unhandled rejection. */
const ROOT = process.env.PRAYOGX_ROOT || require('path').resolve(__dirname, '..');
/* the library size comes from the canonical source, so adding a simulation never breaks this suite */
const NSIMS = JSON.parse(require('fs').readFileSync(ROOT + '/data/manifest.json', 'utf8')).simulations.length;
const { chromium } = require(process.env.PLAYWRIGHT || '/home/claude/build/node_modules/playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const STUB = () => {
  window.__ad = { log: [], on: {} };
  const rec = (name, opts) => { window.__ad.log.push({ name: name, opts: opts || null }); };
  window.Capacitor = {
    getPlatform: function () { return 'android'; },
    Plugins: {
      AdMob: {
        initialize: function (o) { rec('initialize', o); return Promise.resolve(); },
        showBanner: function (o) { rec('showBanner', o); return Promise.resolve(); },
        resumeBanner: function () { rec('resumeBanner'); return Promise.resolve(); },
        removeBanner: function () { rec('removeBanner'); return Promise.resolve(); },
        /* exactly what the plugin does when nothing was ever shown */
        hideBanner: function () {
          rec('hideBanner');
          return Promise.reject(new Error('You tried to hide a banner that was never shown'));
        },
        addListener: function (n, fn) {
          (window.__ad.on[n] = window.__ad.on[n] || []).push(fn);
          return Promise.resolve({ remove: function () {} });
        }
      }
    }
  };
  window.__fire = function (n, p) { (window.__ad.on[n] || []).forEach(function (f) { f(p); }); };
};

(async () => {
  const net = require('net');
  const freePort = () => new Promise(res => { const sv = net.createServer();
    sv.listen(0, '127.0.0.1', () => { const q = sv.address().port; sv.close(() => res(q)); }); });
  const PS = await freePort(), PA = await freePort(), PB = await freePort();
  const site = spawn('python3', [__dirname + '/corsserve.py', String(PS), ROOT], { stdio: 'ignore' });

  /* two copies of the shell: ads on, and ads switched off in config.js */
  const mk = (dir, off) => {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    for (const f of fs.readdirSync(ROOT + '/app/www'))
      fs.copyFileSync(ROOT + '/app/www/' + f, dir + '/' + f);
    let c = fs.readFileSync(dir + '/config.js', 'utf8')
      .replace(/origin:\s*"[^"]+"/, 'origin: "http://127.0.0.1:' + PS + '"');
    if (off) c = c.replace(/enabled:\s*true/, 'enabled: false');
    fs.writeFileSync(dir + '/config.js', c);
  };
  const ON = __dirname + '/adstest', OFF = __dirname + '/adstest-off';
  mk(ON, false); mk(OFF, true);
  const aOn  = spawn('python3', ['-m', 'http.server', String(PA), '--bind', '127.0.0.1'], { cwd: ON,  stdio: 'ignore' });
  const aOff = spawn('python3', ['-m', 'http.server', String(PB), '--bind', '127.0.0.1'], { cwd: OFF, stdio: 'ignore' });
  await sleep(1000);

  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const errs = []; let n = 0, bad = 0;
  const ok = (l, c, x) => { n++; if (!c) bad++; console.log((c ? 'PASS  ' : 'FAIL  ') + l + (x !== undefined ? '   ' + x : '')); };

  const TEST_UNIT = 'ca-app-pub-3940256099942544/9214589741';
  const PROD_UNIT = 'ca-app-pub-3980851000523907/6881959261';

  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
                                   isMobile: true, hasTouch: true });
  await ctx.addInitScript(STUB);
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errs.push('CONSOLE: ' + m.text()); });

  const calls = () => p.evaluate(() => window.__ad.log);
  const names = async () => (await calls()).map(c => c.name);
  const adh   = () => p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--adh').trim());
  const tabsBottom = () => p.evaluate(() => getComputedStyle(document.querySelector('.tabs')).bottom);
  const screenPad  = () => p.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.screen')).paddingBottom));

  await p.goto('http://127.0.0.1:' + PA + '/', { waitUntil: 'networkidle' });
  await sleep(900);

  /* ---------------------------------------------------- library, ad requested */
  const log0 = await calls();
  ok('the library asks AdMob to initialise, once',
     log0.filter(c => c.name === 'initialize').length === 1);
  const shows = log0.filter(c => c.name === 'showBanner');
  ok('and requests exactly one banner', shows.length === 1, shows.length + ' showBanner calls');
  ok('with Google’s official test unit while testing is on',
     shows[0] && shows[0].opts && shows[0].opts.adId === TEST_UNIT,
     shows[0] && shows[0].opts && shows[0].opts.adId);
  ok('the production unit is never requested in testing mode',
     JSON.stringify(log0).indexOf(PROD_UNIT) < 0);
  ok('isTesting is passed, so the device registers as a test device',
     shows[0] && shows[0].opts && shows[0].opts.isTesting === true);
  ok('it is an anchored adaptive banner at the bottom',
     shows[0] && shows[0].opts && shows[0].opts.adSize === 'ADAPTIVE_BANNER' &&
     shows[0].opts.position === 'BOTTOM_CENTER',
     shows[0] && shows[0].opts && shows[0].opts.adSize + ' / ' + shows[0].opts.position);
  ok('no interstitial, rewarded, native or app-open ad is ever asked for',
     !(await names()).some(x => /interstitial|reward|native|appopen|AppOpen/i.test(x)),
     (await names()).join(','));
  ok('before any ad has loaded the layout is untouched', (await adh()) === '0px', await adh());

  /* ------------------------------------------------- ad arrives, layout lifts */
  const padBefore = await screenPad();
  await p.evaluate(() => { window.__fire('bannerAdLoaded'); window.__fire('bannerAdSizeChanged', { width: 320, height: 50 }); });
  await sleep(200);
  ok('a loaded banner reports its height into --adh', (await adh()) === '50px', await adh());
  ok('the tab bar rides above the banner instead of under it',
     (await tabsBottom()) === '50px', await tabsBottom());
  ok('the list gains exactly the banner’s height of bottom padding',
     Math.round((await screenPad()) - padBefore) === 50,
     padBefore + ' → ' + (await screenPad()));
  const clear = await p.evaluate(() => {
    const r = document.querySelector('.tabs').getBoundingClientRect();
    return Math.round(window.innerHeight - r.bottom);
  });
  ok('so nothing in the bottom navigation is covered', clear >= 50, clear + 'px of clearance');
  const toastBottom = await p.evaluate(() => {
    const t = document.getElementById('toast'); t.hidden = false;
    const v = getComputedStyle(t).bottom; t.hidden = true; return v;
  });
  ok('the toast clears the banner too', parseFloat(toastBottom) >= 108, toastBottom);

  /* ------------------------------------------------------ into the simulation */
  await p.fill('#q', 'kjeldahl'); await sleep(500);
  await p.click('.simcard'); await sleep(500);
  await p.click('#openbtn'); await sleep(1400);
  ok('opening a simulation hides the banner',
     (await names()).indexOf('hideBanner') >= 0);
  ok('and the viewer gets the whole screen back', (await adh()) === '0px', await adh());
  ok('the simulation really is open',
     await p.evaluate(() => !document.getElementById('viewer').hidden));
  await p.evaluate(() => window.__fire('bannerAdSizeChanged', { width: 320, height: 50 }));
  await sleep(150);
  ok('an ad that loads late, while a simulation is open, does not pad the page',
     (await adh()) === '0px', await adh());

  /* ------------------------------------------------------------ back out */
  const beforeBack = (await names()).filter(x => x === 'showBanner').length;
  await p.click('#vback'); await sleep(500);
  ok('leaving the simulation resumes the banner rather than buying a new one',
     (await names()).indexOf('resumeBanner') >= 0 &&
     (await names()).filter(x => x === 'showBanner').length === beforeBack);
  await p.evaluate(() => window.__fire('bannerAdSizeChanged', { width: 320, height: 50 }));
  await sleep(150);
  ok('and the library layout lifts again', (await adh()) === '50px', await adh());

  await p.click('.simcard'); await sleep(400);
  await p.click('#openbtn'); await sleep(1200);
  ok('hardware back out of a simulation restores the banner as well',
     await (async () => {
       await p.evaluate(() => window.__prayogx.goBack());
       await sleep(400);
       await p.evaluate(() => window.__fire('bannerAdSizeChanged', { width: 320, height: 50 }));
       await sleep(150);
       return (await adh()) === '50px' && await p.evaluate(() => document.getElementById('viewer').hidden);
     })());

  /* hardware back left the detail screen up; step back to the list */
  await p.evaluate(() => window.__prayogx.goBack());
  await sleep(400);

  /* --------------------------------------------------------- failing ad */
  await p.evaluate(() => window.__fire('bannerAdFailedToLoad', { code: 3, message: 'No fill' }));
  await sleep(200);
  ok('an ad that fails to load gives its space straight back',
     (await adh()) === '0px', await adh());
  ok('the library still works after a failed ad',
     (await p.evaluate(() => document.querySelectorAll('.simcard').length)) > 0);
  const showsBefore = (await names()).filter(x => x === 'showBanner').length;
  await p.click('.simcard'); await sleep(400);
  await p.click('#openbtn'); await sleep(1000);
  await p.click('#vback'); await sleep(500);
  ok('after a failure the next visit asks for a fresh banner, not a resume',
     (await names()).filter(x => x === 'showBanner').length === showsBefore + 1,
     showsBefore + ' → ' + (await names()).filter(x => x === 'showBanner').length);
  ok('a rejecting hideBanner never reaches the page as an error',
     !errs.some(e => /never shown|Unhandled|rejection/i.test(e)), errs.slice(0, 2).join(' | '));

  /* ------------------------------------------------------- switched off */
  const p2 = await ctx.newPage();
  p2.on('pageerror', e => errs.push('OFF PAGEERROR: ' + e.message));
  await p2.goto('http://127.0.0.1:' + PB + '/', { waitUntil: 'networkidle' });
  await sleep(900);
  ok('with ads.enabled false the plugin is never called at all',
     (await p2.evaluate(() => window.__ad.log.length)) === 0,
     JSON.stringify(await p2.evaluate(() => window.__ad.log)).slice(0, 60));
  ok('and the layout is exactly what it was before ads existed',
     (await p2.evaluate(() => getComputedStyle(document.querySelector('.tabs')).bottom)) === '0px' &&
     (await p2.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--adh').trim())) === '0px');
  ok('the library still loads with ads off',
     (await p2.evaluate(() => window.__prayogx.state().sims)) === NSIMS);

  /* ------------------------------------- plain browser, no Capacitor at all */
  const bare = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p3 = await bare.newPage();
  p3.on('pageerror', e => errs.push('BARE PAGEERROR: ' + e.message));
  await p3.goto('http://127.0.0.1:' + PA + '/', { waitUntil: 'networkidle' });
  await sleep(900);
  ok('with no Capacitor present the shell runs untouched and error-free',
     (await p3.evaluate(() => getComputedStyle(document.querySelector('.tabs')).bottom)) === '0px' &&
     (await p3.evaluate(() => window.__prayogx.state().sims)) === NSIMS &&
     !errs.some(e => e.indexOf('BARE') === 0), errs.filter(e => e.indexOf('BARE') === 0)[0] || '');

  /* -------------------------------------------------------- source rules */
  const idx = fs.readFileSync(ROOT + '/app/www/index.html', 'utf8');
  ok('ads.js is loaded before app.js, so the hooks exist when app.js runs',
     idx.indexOf('ads.js') > 0 && idx.indexOf('ads.js') < idx.indexOf('app.js'));
  const src = fs.readFileSync(ROOT + '/app/www/ads.js', 'utf8');
  ok('ads.js adds no DOM of its own - it only reports a height',
     !/createElement|appendChild|innerHTML/.test(src));
  ok('and stores nothing on the device', !/localStorage|indexedDB|Preferences/.test(src));
  const siteIdx = fs.readFileSync(ROOT + '/index.html', 'utf8');
  const siteJs  = fs.readFileSync(ROOT + '/site/site.js', 'utf8');
  ok('the website carries no ads: nothing was added to site/',
     siteIdx.indexOf('ads.js') < 0 && !/AdMob|adsbygoogle/i.test(siteJs + siteIdx));
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).reduce((a, e) =>
    a.concat(e.isDirectory() ? walk(d + '/' + e.name) : [d + '/' + e.name]), []);
  const simFiles = walk(ROOT + '/simulations').filter(f => /\.html$/.test(f));
  const simsWithAds = simFiles.filter(f => /AdMob|adsbygoogle|PrayogXAds|--adh/i.test(fs.readFileSync(f, 'utf8')));
  ok('and no simulation was touched', simFiles.length >= NSIMS && simsWithAds.length === 0,
     simFiles.length + ' simulation files scanned' + (simsWithAds.length ? ', HIT: ' + simsWithAds[0] : ''));

  ok('console clean throughout', errs.length === 0, errs.slice(0, 2).join(' | '));
  console.log('\n' + (n - bad) + ' / ' + n + ' passed');
  await b.close(); try { site.kill(); } catch (e) {} aOn.kill(); aOff.kill();
  process.exit(bad ? 1 : 0);
})();
