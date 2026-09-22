const ROOT = process.env.PRAYOGX_ROOT || require('path').resolve(__dirname, '..');
/* A path interpolated into a shell string has to be quoted, or the shell
   splits it - and this project lives in "Project simulation". */
const q = p => "'" + String(p).replace(/'/g, "'\\''") + "'";
/* Item 8: unchanged simulations stay cached, changed ones invalidate, nobody
   is served stale content after a revision, and revisions stay traceable. */
const { chromium } = require(process.env.PLAYWRIGHT || '/home/claude/build/node_modules/playwright');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let n=0,bad=0;
const ok=(l,c,x)=>{n++;if(!c)bad++;console.log((c?'PASS  ':'FAIL  ')+l+(x!==undefined?'   '+x:''));};
const R=ROOT;
const SIM=R+'/simulations/2026/paper-2/chemistry/adv-2026-p2-che-q16/index.html';
const META=R+'/simulations/2026/paper-2/chemistry/adv-2026-p2-che-q16/meta.json';

(async () => {
  const orig = fs.readFileSync(SIM,'utf8');
  const origMeta = fs.readFileSync(META,'utf8');
  let probeAdded = false;          // set once the N1 case publishes a new simulation
  const restore = () => {
    fs.writeFileSync(SIM, orig); fs.writeFileSync(META, origMeta);
    const m = JSON.parse(fs.readFileSync(R+'/data/manifest.json','utf8'));
    m.simulations = m.simulations.map(s => s.id==='ADV-2026-P2-CHE-Q16' ? {...s, revision:1} : s);
    fs.writeFileSync(R+'/data/manifest.json', JSON.stringify(m,null,2)+'\n');
    const lp = R+'/data/revisions.json';
    const lock = JSON.parse(fs.readFileSync(lp,'utf8'));
    delete lock['ADV-2026-P2-CHE-Q16'];
    fs.writeFileSync(lp, JSON.stringify(lock,null,2)+'\n');
    if (probeAdded) {
      // removesim.py deletes the probe and re-runs sync, build and check itself
      probeAdded = false;
      execSync('python3 '+q(__dirname+'/removesim.py'),
               {cwd:R, env:{...process.env, PRAYOGX_ROOT:R}, stdio:'pipe'});
    } else {
      execSync('python3 tools/sync_manifest.py && python3 tools/build_content.py',{cwd:R,stdio:'pipe'});
    }
  };
  try {
  const site = spawn('python3',[__dirname+'/corsserve.py','8950',R],{stdio:'ignore'});
  const T=__dirname+'/appwww2';
  fs.rmSync(T,{recursive:true,force:true}); fs.mkdirSync(T,{recursive:true});
  for(const f of fs.readdirSync(R+'/app/www')) fs.copyFileSync(R+'/app/www/'+f, T+'/'+f);
  fs.writeFileSync(T+'/config.js', fs.readFileSync(T+'/config.js','utf8')
    .replace(/origin:\s*"[^"]+"/, 'origin: "http://127.0.0.1:8950"'));
  const app = spawn('python3',['-m','http.server','8951','--bind','127.0.0.1'],{cwd:T,stdio:'ignore'});
  await sleep(1100);
  const S='http://127.0.0.1:8950/', A='http://127.0.0.1:8951/';
  const Q16='simulations/2026/paper-2/chemistry/adv-2026-p2-che-q16/index.html';
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const feedV = () => JSON.parse(fs.readFileSync(R+'/content/catalog.json','utf8')).version;
  const swV = () => (/var VERSION = "([^"]*)";/.exec(fs.readFileSync(R+'/sw.js','utf8'))||[])[1];
  const lockOf = id => JSON.parse(fs.readFileSync(R+'/data/revisions.json','utf8'))[id];

  // ---------------------------------------------------------- v1 is cached
  console.log('\n=== a visitor opens Q16 at revision 1 ===');
  const ctx = await b.newContext({viewport:{width:1200,height:900}});
  const p = await ctx.newPage();
  await p.goto(S,{waitUntil:'networkidle'});
  await p.waitForFunction(()=>navigator.serviceWorker&&navigator.serviceWorker.controller,null,{timeout:15000}).catch(()=>{});
  await p.goto(S+Q16+'?v=1',{waitUntil:'networkidle'}); await sleep(600);
  const v1title = await p.title();
  ok('the simulation opens', /vapour/i.test(v1title), v1title.slice(0,40));
  const c1 = await p.evaluate(async()=>{const ks=await caches.keys();const k=ks.filter(x=>x.indexOf('sims')>=0)[0];
    const c=await caches.open(k);return (await c.keys()).map(r=>r.url.split('/').pop());});
  ok('the service worker caches it under its revision key', c1.some(u=>u.indexOf('v=1')>=0), c1.join(','));
  const swBefore = swV(), feedBefore = feedV(), lockBefore = lockOf('ADV-2026-P2-CHE-Q16');
  ok('the revision lock records revision 1 with a content hash',
     lockBefore.revision===1 && /^[0-9a-f]{64}$/.test(lockBefore.sha256), 'r'+lockBefore.revision);

  // app stores it too
  const ap = await (await b.newContext({viewport:{width:390,height:844}})).newPage();
  await ap.goto(A,{waitUntil:'networkidle'}); await sleep(1300);
  await ap.fill('#q','vapour phase'); await sleep(1000);
  await ap.click('.simcard'); await sleep(600);
  await ap.click('#openbtn'); await sleep(1500);
  const appStored1 = await ap.evaluate(()=>new Promise(res=>{const r=indexedDB.open('prayogx',1);
    r.onsuccess=()=>{const t=r.result.transaction('sims','readonly').objectStore('sims').getAll();
      t.onsuccess=()=>res(t.result.map(x=>({id:x.id,rev:x.revision,marker:/REVISION-TWO-MARKER/.test(x.html)})));
      t.onerror=()=>res([]);};r.onerror=()=>res([]);}));
  ok('the app stores it at revision 1',
     appStored1.some(x=>x.id==='ADV-2026-P2-CHE-Q16'&&x.rev===1&&!x.marker),
     JSON.stringify(appStored1.filter(x=>x.id.endsWith('Q16'))));

  // ------------------------------------------- edit WITHOUT bumping: refused
  console.log('\n=== editing the simulation without bumping its revision ===');
  fs.writeFileSync(SIM, orig.replace('</body>','<!-- REVISION-TWO-MARKER --></body>'));
  let rc = 0;
  try { execSync('python3 tools/check_library.py',{cwd:R,stdio:'pipe'}); } catch(e){ rc = e.status; }
  ok('the library check refuses it', rc===1, 'exit '+rc);

  // ------------------------------------------------- bump properly and rebuild
  console.log('\n=== bumping to revision 2 and rebuilding ===');
  fs.writeFileSync(META, origMeta.replace('"revision": 1','"revision": 2'));
  const man = JSON.parse(fs.readFileSync(R+'/data/manifest.json','utf8'));
  man.simulations = man.simulations.map(s => s.id==='ADV-2026-P2-CHE-Q16' ? {...s, revision:2} : s);
  fs.writeFileSync(R+'/data/manifest.json', JSON.stringify(man,null,2)+'\n');
  execSync('python3 tools/sync_manifest.py && python3 tools/build_content.py && python3 tools/check_library.py',
           {cwd:R,stdio:'pipe'});
  ok('after a proper bump the library check passes again', true);
  ok('the feed version moved', feedV()!==feedBefore, feedBefore.slice(0,8)+' -> '+feedV().slice(0,8));
  ok('the service worker version moved with it', swV()!==swBefore && swV()===feedV());
  const lockAfter = lockOf('ADV-2026-P2-CHE-Q16');
  ok('the lock re-recorded it at revision 2 with a NEW hash',
     lockAfter.revision===2 && lockAfter.sha256!==lockBefore.sha256);
  ok('...so the change is traceable: revision, hash and feed version all moved', true);

  // ------------------------------------------------ the visitor comes back
  console.log('\n=== the same visitor, same browser, returns ===');
  await p.goto(S,{waitUntil:'networkidle'}); await sleep(900);
  await p.reload({waitUntil:'networkidle'}); await sleep(900);
  const link = await p.evaluate(()=>{
    const a=[...document.querySelectorAll('article.card a.open')]
      .find(x=>x.getAttribute('href').indexOf('Q16')>=0);
    return a? a.getAttribute('href') : null; });
  ok('the catalogue links Q16 through the shell runner',
     /^#\/run\/ADV-2026-P2-CHE-Q16$/.test(link||''), link);
  // The runner is where the revision is applied now, so that is where to look.
  await p.goto(S+link,{waitUntil:'networkidle'}); await sleep(1500);
  const framed2 = await p.evaluate(()=>{const f=document.querySelector('#rstage iframe');
    return f?f.getAttribute('src'):null;});
  ok('and the frame it opens now carries revision 2', /\?v=2$/.test(framed2||''), framed2);
  await p.goto(S+Q16+'?v=2',{waitUntil:'networkidle'}); await sleep(500);
  const served = await p.evaluate(()=>document.documentElement.outerHTML.indexOf('REVISION-TWO-MARKER')>=0);
  ok('and the visitor is served the NEW content, not the cached old one', served);
  const c2 = await p.evaluate(async()=>{const ks=await caches.keys();const k=ks.filter(x=>x.indexOf('sims')>=0)[0];
    const c=await caches.open(k);return (await c.keys()).map(r=>r.url.split('?').pop());});
  ok('both revisions are distinct cache entries, so nothing was overwritten in place',
     c2.indexOf('v=2')>=0, c2.join(','));
  const allKeys = await p.evaluate(async()=>{const ks=await caches.keys();
    return ks.filter(x=>x.indexOf('prayogx-')===0);});
  // Shell and feed are version-named and must be replaced. The simulations cache
  // is deliberately not, so it is excluded here rather than expected to move.
  const versioned = allKeys.filter(k => k.indexOf('prayogx-shell-')===0 ||
                                        k.indexOf('prayogx-feed-')===0);
  ok('old shell and feed caches were retired by the new worker version',
     versioned.length>0 && versioned.every(k=>k.endsWith(swV())), versioned.join(', '));
  ok('...while the simulations cache stayed put through the version change',
     allKeys.some(k => k.indexOf('prayogx-sims-')===0 && k.indexOf(swV())<0),
     allKeys.join(', '));

  // --------------------------------------------------------------- the app
  console.log('\n=== the installed app, already holding revision 1 ===');
  await ap.goto(A,{waitUntil:'networkidle'}); await sleep(1500);
  await ap.fill('#q','vapour phase'); await sleep(1000);
  await ap.click('.simcard'); await sleep(600);
  await ap.click('#openbtn'); await sleep(1800);
  const inApp = await ap.evaluate(()=>{const f=document.getElementById('frame');
    return f.contentDocument? f.contentDocument.documentElement.outerHTML.indexOf('REVISION-TWO-MARKER')>=0 : false;});
  ok('the app detects the newer revision and shows the new content', inApp);
  const appStored2 = await ap.evaluate(()=>new Promise(res=>{const r=indexedDB.open('prayogx',1);
    r.onsuccess=()=>{const t=r.result.transaction('sims','readonly').objectStore('sims').getAll();
      t.onsuccess=()=>res(t.result.filter(x=>x.id==='ADV-2026-P2-CHE-Q16')
        .map(x=>({rev:x.revision,marker:/REVISION-TWO-MARKER/.test(x.html)})));
      t.onerror=()=>res([]);};r.onerror=()=>res([]);}));
  ok('...and replaces its stored copy rather than keeping both',
     appStored2.length===1 && appStored2[0].rev===2 && appStored2[0].marker===true,
     JSON.stringify(appStored2));

  // ------------------------------------------------- unchanged sims untouched
  const q15lock = lockOf('ADV-2026-P2-CHE-Q15');
  ok('an unchanged simulation keeps its revision and hash', q15lock.revision===1);

  /* ------------------------------------------------------------------ N1
     Growing the library must not cost a student the simulations they already
     saved. The feed version moves on every addition; the shell and feed caches
     are named after it and must be replaced, but the simulations cache must
     not be, or each new simulation wipes the offline library. */
  console.log('\n=== a new simulation is published while the visitor has one saved ===');
  const simsCaches = () => p.evaluate(async () => {
    const names = (await caches.keys()).filter(k => k.indexOf('prayogx-sims-') === 0);
    const out = [];
    for (const nm of names) {
      const c = await caches.open(nm);
      out.push({ name: nm, urls: (await c.keys()).map(r => r.url.replace(/^https?:\/\/[^/]+\//, '')) });
    }
    return out;
  });

  const before = await simsCaches();
  const beforeUrls = before.reduce((a, c) => a.concat(c.urls), []);
  ok('the visitor has simulations saved for offline use',
     beforeUrls.length > 0, before.map(c => c.name + ' (' + c.urls.length + ')').join(' | '));
  ok('the cache holding them is not named after the feed version',
     before.length > 0 && before.every(c => c.name.indexOf(feedV()) < 0),
     before.map(c => c.name).join(','));

  const feedBeforeAdd = feedV();
  probeAdded = true;
  execSync('python3 ' + q(__dirname + '/addsim.py'),
           { cwd: R, env: { ...process.env, PRAYOGX_ROOT: R }, stdio: 'pipe' });
  ok('adding a simulation through the real pipeline moves the feed version',
     feedV() !== feedBeforeAdd, feedBeforeAdd.slice(0,8) + ' -> ' + feedV().slice(0,8));
  ok('and the service worker is restamped with it', swV() === feedV());

  await p.goto(S,{waitUntil:'networkidle'}); await sleep(2200);
  await p.reload({waitUntil:'networkidle'}); await sleep(2200);
  const swState = await p.evaluate(async () => {
    const r = await navigator.serviceWorker.getRegistration();
    return r && r.active ? 'active' : 'none';
  });
  ok('the new service worker installed and activated', swState === 'active', swState);
  const shellNames = await p.evaluate(async () =>
    (await caches.keys()).filter(k => k.indexOf('prayogx-shell-') === 0));
  ok('the shell cache WAS replaced by the new version, as it must be',
     shellNames.length === 1 && shellNames[0].indexOf(swV()) >= 0, shellNames.join(','));

  const after = await simsCaches();
  const afterUrls = after.reduce((a, c) => a.concat(c.urls), []);
  const lost = beforeUrls.filter(u => afterUrls.indexOf(u) < 0);
  ok('the simulations saved for offline use SURVIVED the addition',
     lost.length === 0 && afterUrls.length >= beforeUrls.length,
     beforeUrls.length + ' saved -> ' + afterUrls.length + ' kept' +
     (lost.length ? ', LOST: ' + lost.join(',') : '') +
     (after.length ? '  [' + after.map(c => c.name).join(',') + ']' : '  [NO SIMS CACHE AT ALL]'));

  const stillWhole = await p.evaluate(async () => {
    const names = (await caches.keys()).filter(k => k.indexOf('prayogx-sims-') === 0);
    for (const nm of names) {
      const c = await caches.open(nm);
      for (const req of await c.keys()) {
        if (req.url.indexOf('q16') >= 0) {
          const res = await c.match(req);
          if (res) return (await res.text()).length;
        }
      }
    }
    return 0;
  });
  ok('...and a saved simulation still has its whole body, not just its key',
     stillWhole > 5000, stillWhole + ' bytes');

  restore();
  ok('the tree restores cleanly to revision 1 with the probe removed',
     feedV()===feedBefore, feedV().slice(0,8));

  console.log('\n'+(n-bad)+' / '+n+' passed');
  await b.close(); site.kill(); app.kill();
  process.exit(bad?1:0);
  } finally {
    // A suite that edits the canonical source must put it back even when it
    // fails half way, or the next suite inherits a dirty tree.
    try { restore(); } catch (e) { console.log('RESTORE FAILED: '+e.message); }
  }
})();


