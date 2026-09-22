const ROOT = process.env.PRAYOGX_ROOT || require('path').resolve(__dirname, '..');
const { chromium } = require(process.env.PLAYWRIGHT || '/home/claude/build/node_modules/playwright');
const { spawn } = require('child_process');
const fs = require('fs'), net = require('net'), path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------------------------------------------------------------------------
   The feed is live; an installed client is frozen at the parser it shipped
   with. content/catalog.json says which format it was published in, and each
   client says which format it can read. Majors must match; minors and patches
   must not matter.

   Nothing in the repository is touched: every case runs against a copy of the
   site in a temp directory, with catalog.json rewritten there.
   --------------------------------------------------------------------------- */

let n = 0, bad = 0;
const ok = (l, c, x) => { n++; if (!c) bad++;
  console.log((c ? 'PASS  ' : 'FAIL  ') + l + (x !== undefined ? '   ' + x : '')); };

const freePort = () => new Promise(res => { const sv = net.createServer();
  sv.listen(0, '127.0.0.1', () => { const q = sv.address().port; sv.close(() => res(q)); }); });

(async () => {
  /* ---------------------------------------------------- the shared rule */
  const siteJs = fs.readFileSync(ROOT + '/site/site.js', 'utf8');
  const appJs  = fs.readFileSync(ROOT + '/app/www/app.js', 'utf8');
  const majorOf = src => {
    const m = /var\s+SUPPORTED_SCHEMA_MAJOR\s*=\s*(\d+)\s*;/.exec(src);
    return m ? parseInt(m[1], 10) : null;
  };
  const webMajor = majorOf(siteJs), appMajor = majorOf(appJs);
  ok('the website declares a supported schema major', webMajor !== null, 'SUPPORTED_SCHEMA_MAJOR = ' + webMajor);
  ok('the app declares one too', appMajor !== null, 'SUPPORTED_SCHEMA_MAJOR = ' + appMajor);
  ok('Web and Android agree on the number', webMajor === appMajor, webMajor + ' === ' + appMajor);
  const ruleOf = src => {
    const m = /function schemaCompatible\(v\) \{([\s\S]*?)\n  \}/.exec(src);
    return m ? m[1].replace(/\s+/g, ' ').trim() : null;
  };
  ok('and on the rule itself, character for character',
     ruleOf(siteJs) !== null && ruleOf(siteJs) === ruleOf(appJs), ruleOf(siteJs));
  const MSG = 'This version of PrayogX is not compatible with the current library. Please update the app.';
  const norm = s => s.replace(/"\s*\+\s*\n?\s*"/g, '').replace(/\s+/g, ' ');
  ok('and on the sentence the student sees',
     norm(siteJs).indexOf(MSG) >= 0 && norm(appJs).indexOf(MSG) >= 0);
  ok('the generated feed still carries the source value, untouched',
     JSON.parse(fs.readFileSync(ROOT + '/content/catalog.json', 'utf8')).schemaVersion === '1.0.0');

  /* ------------------------------------------------------- the fixture */
  const T = __dirname + '/gatetest';
  fs.rmSync(T, { recursive: true, force: true });
  fs.mkdirSync(T + '/app', { recursive: true });
  for (const p of ['index.html', 'sw.js', 'manifest.webmanifest', 'offline.html'])
    fs.copyFileSync(ROOT + '/' + p, T + '/' + p);
  for (const d of ['site', 'content', 'data', 's'])
    fs.cpSync(ROOT + '/' + d, T + '/' + d, { recursive: true });
  for (const f of fs.readdirSync(ROOT + '/app/www'))
    fs.copyFileSync(ROOT + '/app/www/' + f, T + '/app/' + f);

  const PS = await freePort(), PA = await freePort();
  const site = spawn('python3', [__dirname + '/corsserve.py', String(PS), T], { stdio: 'ignore' });
  fs.writeFileSync(T + '/app/config.js', fs.readFileSync(T + '/app/config.js', 'utf8')
    .replace(/origin:\s*"[^"]+"/, 'origin: "http://127.0.0.1:' + PS + '"'));
  const app = spawn('python3', ['-m', 'http.server', String(PA), '--bind', '127.0.0.1'],
                    { cwd: T + '/app', stdio: 'ignore' });
  await sleep(1000);
  const S = 'http://127.0.0.1:' + PS + '/', A = 'http://127.0.0.1:' + PA + '/';

  const setSchema = v => {
    const p = T + '/content/catalog.json';
    if (!fs.existsSync(p)) return;         // the fallback cases hide content/ entirely
    const c = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (v === null) delete c.schemaVersion; else c.schemaVersion = v;
    fs.writeFileSync(p, JSON.stringify(c));
  };
  const setManifestSchema = v => {
    const p = T + '/data/manifest.json';
    const m = JSON.parse(fs.readFileSync(p, 'utf8'));
    m.schemaVersion = v;
    fs.writeFileSync(p, JSON.stringify(m));
  };

  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

  async function web(label, schema, expect) {
    setSchema(schema);
    const ctx = await b.newContext({ viewport: { width: 1100, height: 850 } });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(S, { waitUntil: 'networkidle' }); await sleep(1100);
    const st = await p.evaluate(() => ({
      cards: document.querySelectorAll('article.card').length,
      gate: !!document.getElementById('schemagate'),
      text: (document.getElementById('app') || document.body).innerText.slice(0, 180)
    }));
    await ctx.close();
    return { st, errs };
  }

  /* `pre` stocks the device from a compatible feed first, so the refusal is
     tested the way it will actually happen: on a phone that already has a
     library, not on a fresh install with nothing to lose. */
  async function android(label, schema, seed, pre) {
    setSchema(pre || schema);
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(A, { waitUntil: 'domcontentloaded' });
    if (seed) await p.evaluate(s => { try { localStorage.setItem('prayogx:v1:schemaBad', JSON.stringify(s)); } catch (e) {} }, seed);
    if (pre) { await p.goto(A, { waitUntil: 'networkidle' }); await sleep(1500); setSchema(schema); }
    await p.goto(A, { waitUntil: 'networkidle' }); await sleep(1600);
    const st = await p.evaluate(() => ({
      cards: document.querySelectorAll('.simcard').length,
      gate: !!document.getElementById('schemagate'),
      searchHidden: document.getElementById('searchwrap').style.display === 'none',
      remembered: (function () { try { return localStorage.getItem('prayogx:v1:schemaBad'); } catch (e) { return 'n/a'; } })(),
      text: document.getElementById('screen').innerText.slice(0, 160)
    }));
    return { st, errs, ctx, page: p };
  }

  /* ------------------------------------------------------------- WEB */
  console.log('\n=== the website ===');
  let r = await web('current', '1.0.0');
  ok('the current 1.0.0 feed loads normally', r.st.cards === 17 && !r.st.gate, r.st.cards + ' cards');
  r = await web('minor', '1.4.2');
  ok('a 1.4.2 feed - newer minor and patch - still loads', r.st.cards === 17 && !r.st.gate, r.st.cards + ' cards');
  r = await web('major', '2.0.0');
  ok('a 2.0.0 feed is refused, and nothing is rendered', r.st.gate && r.st.cards === 0, r.st.cards + ' cards');
  ok('and the student is told what to do', /not compatible[\s\S]*update the app/i.test(r.st.text),
     JSON.stringify(r.st.text.split('\n')[0].slice(0, 70)));
  ok('no exception was thrown getting there', r.errs.length === 0, r.errs.slice(0, 1).join(''));
  r = await web('absent', null);
  ok('a feed with no schemaVersion is not treated as hostile', r.st.cards === 17 && !r.st.gate, r.st.cards + ' cards');

  console.log('\n=== the website, falling back to the manifest ===');
  setSchema('1.0.0');
  fs.renameSync(T + '/content', T + '/content.off');
  setManifestSchema('2.0.0');
  r = await web('manifest-major', '1.0.0');
  ok('the manifest fallback is latched by the same rule', r.st.gate && r.st.cards === 0, r.st.cards + ' cards');
  setManifestSchema('1.0.0');
  r = await web('manifest-ok', '1.0.0');
  ok('and a compatible manifest fallback still boots', r.st.cards === 17 && !r.st.gate, r.st.cards + ' cards');
  fs.renameSync(T + '/content.off', T + '/content');

  /* --------------------------------------------------------- ANDROID */
  console.log('\n=== the Android app shell ===');
  let a = await android('current', '1.0.0');
  ok('the current 1.0.0 feed loads normally', a.st.cards === 17 && !a.st.gate, a.st.cards + ' cards');
  await a.ctx.close();
  a = await android('minor', '1.4.2');
  ok('a 1.4.2 feed still loads', a.st.cards === 17 && !a.st.gate, a.st.cards + ' cards');
  await a.ctx.close();

  a = await android('major', '2.0.0', null, '1.0.0');   // stocked first, then the feed breaks
  ok('a 2.0.0 feed is refused, and the library is not rendered',
     a.st.gate && a.st.cards === 0, a.st.cards + ' cards');
  ok('the search and filter chrome is taken away with it', a.st.searchHidden);
  ok('the student is told what to do', /not compatible[\s\S]*update the app/i.test(a.st.text),
     JSON.stringify(a.st.text.split('\n')[0].slice(0, 70)));
  ok('the refusal is remembered on the device', a.st.remembered === '"2.0.0"', a.st.remembered);
  ok('no exception was thrown getting there', a.errs.length === 0, a.errs.slice(0, 1).join(''));

  /* The device loses the feed but still has the app and its stored library.
     setOffline would stop the shell loading at all, which is not the scenario:
     block only the content host, the way a phone on a bad network does. */
  await a.ctx.route(u => u.port === String(PS), route => route.abort());
  await a.page.goto(A, { waitUntil: 'domcontentloaded' }); await sleep(1600);
  const offline = await a.page.evaluate(() => ({
    cards: document.querySelectorAll('.simcard').length,
    gate: !!document.getElementById('schemagate'),
    stored: !!JSON.parse(localStorage.getItem('prayogx:v1:index') || 'null') }));
  ok('it has a stored library to fall back on', offline.stored);
  ok('but with the feed unreachable it still refuses, rather than showing it',
     offline.gate && offline.cards === 0, offline.cards + ' cards');
  await a.ctx.close();

  console.log('\n=== after the app is updated ===');
  setSchema('1.0.0');
  a = await android('recovered', '1.0.0', '1.4.0');   // a remembered value THIS build understands
  ok('a refusal does not outlive the build that resolves it',
     a.st.cards === 17 && !a.st.gate, a.st.cards + ' cards');
  ok('and the stale flag is cleared', a.st.remembered === null || a.st.remembered === 'null', a.st.remembered);
  await a.ctx.close();

  setSchema('1.0.0');
  console.log('\n' + (n - bad) + ' / ' + n + ' passed');
  await b.close(); site.kill(); app.kill();
  fs.rmSync(T, { recursive: true, force: true });
  process.exit(bad ? 1 : 0);
})();
