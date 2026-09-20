const ROOT = process.env.PRAYOGX_ROOT || require('path').resolve(__dirname, '..');
/* Does ONE addition to the canonical source reach every client? */
const { chromium } = require(process.env.PLAYWRIGHT || '/home/claude/build/node_modules/playwright');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let n=0, bad=0;
const ok=(l,c,x)=>{n++;if(!c)bad++;console.log((c?'PASS  ':'FAIL  ')+l+(x!==undefined?'   '+x:''));};

(async () => {
  // the published site, with CORS so the app shell can read it in a browser
  const site = spawn('python3',[__dirname+'/corsserve.py','8940',ROOT],{stdio:'ignore'});
  // the app shell, origin rewired to the test site
  const T=__dirname+'/appwww';
  fs.rmSync(T,{recursive:true,force:true}); fs.mkdirSync(T,{recursive:true});
  for(const f of fs.readdirSync(ROOT+'/app/www'))
    fs.copyFileSync(ROOT+'/app/www/'+f, T+'/'+f);
  fs.writeFileSync(T+'/config.js', fs.readFileSync(T+'/config.js','utf8')
    .replace(/origin:\s*"[^"]+"/, 'origin: "http://127.0.0.1:8940"'));
  const app = spawn('python3',['-m','http.server','8941','--bind','127.0.0.1'],{cwd:T,stdio:'ignore'});
  await sleep(1100);
  const S='http://127.0.0.1:8940/', A='http://127.0.0.1:8941/';
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

  const feedVersion = () => JSON.parse(fs.readFileSync(ROOT+'/content/catalog.json','utf8')).version;
  const swVersion   = () => (/var VERSION = "([^"]*)";/.exec(fs.readFileSync(ROOT+'/sw.js','utf8'))||[])[1];

  // ---------------------------------------------------------------- BEFORE
  console.log('\n=== BEFORE: 17 simulations in the canonical source ===');
  const v1 = feedVersion();
  const c1 = await b.newContext({viewport:{width:1280,height:900}});
  const w1 = await c1.newPage();
  await w1.goto(S,{waitUntil:'networkidle'});
  const before = await w1.evaluate(()=>document.querySelectorAll('article.card').length);
  ok('website shows 17', before===17, before);
  const a1 = await (await b.newContext({viewport:{width:390,height:844}})).newPage();
  await a1.goto(A,{waitUntil:'networkidle'}); await sleep(1200);
  const appBefore = await a1.evaluate(()=>window.__prayogx.state().sims);
  ok('app shows 17', appBefore===17, appBefore);
  ok('probe is absent from the crawlable pages',
     !fs.existsSync(ROOT+'/s/ADV-2026-P2-PHY-Q99/index.html'));
  await c1.close();

  // ------------------------------------------------------------ THE ADDITION
  console.log('\n=== ADD ONE SIMULATION TO THE CANONICAL SOURCE ===');
  console.log(execSync('python3 '+__dirname+'/addsim.py',{encoding:'utf8'}).trim());
  const v2 = feedVersion();
  ok('the feed version moved', v1!==v2, v1+' -> '+v2);
  ok('the service worker was restamped to match', swVersion()===v2, swVersion());

  // ----------------------------------------------------------------- AFTER
  console.log('\n=== AFTER: with no further change to any client ===');
  const c2 = await b.newContext({viewport:{width:1280,height:900}});
  const w2 = await c2.newPage();
  const errs=[]; w2.on('pageerror',e=>errs.push(e.message));
  w2.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
  w2.on('response',r=>{ if(r.status()>=400) errs.push(r.status()+' '+r.url()); });
  await w2.goto(S,{waitUntil:'networkidle'});
  const after = await w2.evaluate(()=>document.querySelectorAll('article.card').length);
  ok('WEBSITE picks it up with no code change', after===18, after);
  await w2.fill('#q','propagation'); await sleep(1000);
  const found = await w2.evaluate(()=>[...document.querySelectorAll('article.card h3')].map(h=>h.textContent));
  ok('...and search finds it', found.length===1 && /Propagation probe/.test(found[0]), found.join('|'));
  const href = await w2.evaluate(()=>document.querySelector('article.card a.open').getAttribute('href'));
  ok('...with a revision-tagged link', /adv-2026-p2-phy-q99\/index\.html\?v=1$/.test(href), href);
  await w2.click('article.card h3 a'); await sleep(900);
  const det = await w2.evaluate(()=>document.body.innerText);
  ok('...and a working detail page', /Propagation probe/.test(det) && /Single-source delivery/.test(det));

  // PWA: service worker + offline
  await w2.goto(S,{waitUntil:'networkidle'});
  await w2.waitForFunction(()=>navigator.serviceWorker&&navigator.serviceWorker.controller,null,{timeout:15000}).catch(()=>{});
  const swOK = await w2.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();return !!(r&&r.active);});
  ok('PWA service worker active on the updated site', swOK);
  await w2.goto(S+'simulations/2026/paper-2/physics/adv-2026-p2-phy-q99/index.html?v=1',{waitUntil:'networkidle'});
  const probeText = await w2.evaluate(()=>document.body.innerText);
  ok('the new simulation itself opens', /PROPAGATION-PROBE-OK/.test(probeText));
  await sleep(500);
  const cached = await w2.evaluate(async()=>{
    const ks=await caches.keys(); const k=ks.filter(x=>x.indexOf('sims')>=0)[0];
    if(!k) return 0; const c=await caches.open(k); const e=await c.keys();
    return e.filter(r=>r.url.indexOf('q99')>=0).length;});
  ok('...and the PWA caches it for offline use', cached===1, cached);

  // SEO page
  await w2.goto(S+'s/ADV-2026-P2-PHY-Q99/',{waitUntil:'domcontentloaded'});
  const seo = await w2.evaluate(()=>({t:document.title,h:(document.querySelector('h1')||{}).textContent}));
  ok('a crawlable URL was generated for it', /Propagation probe/.test(seo.t) && /Propagation probe/.test(seo.h||''), seo.t.slice(0,50));

  // App
  const a2 = await (await b.newContext({viewport:{width:390,height:844}})).newPage();
  const aerr=[]; a2.on('pageerror',e=>aerr.push(e.message));
  await a2.goto(A,{waitUntil:'networkidle'}); await sleep(1400);
  const appAfter = await a2.evaluate(()=>window.__prayogx.state().sims);
  ok('CAPACITOR APP picks it up with no rebuild', appAfter===18, appAfter);
  ok('...and the app saw the new feed version',
     (await a2.evaluate(()=>window.__prayogx.state().catalog))===v2);
  await a2.fill('#q','propagation'); await sleep(1100);
  await a2.click('.simcard'); await sleep(700);
  await a2.click('#openbtn'); await sleep(1600);
  const inApp = await a2.evaluate(()=>{const f=document.getElementById('frame');
    return f.contentDocument? f.contentDocument.body.innerText : '';});
  ok('...and opens the new simulation inside the app', /PROPAGATION-PROBE-OK/.test(inApp), inApp.slice(0,40));
  const stored = await a2.evaluate(()=>new Promise(res=>{
    const r=indexedDB.open('prayogx',1);
    r.onsuccess=()=>{const d=r.result;const t=d.transaction('sims','readonly').objectStore('sims').getAll();
      t.onsuccess=()=>res(t.result.map(x=>x.id)); t.onerror=()=>res([]);};
    r.onerror=()=>res([]);}));
  ok('...and stores it on the device for offline use',
     stored.indexOf('ADV-2026-P2-PHY-Q99')>=0, stored.join(','));

  const urlErrs = errs.filter(e=>/^\d{3} /.test(e));
  const otherErrs = errs.filter(e=>!/^\d{3} /.test(e) && !/Failed to load resource/.test(e));
  ok('no failing requests anywhere in the run', urlErrs.length===0,
     [...new Set(urlErrs)].slice(0,3).join(' | '));
  ok('no page or console errors', otherErrs.length===0 && aerr.length===0,
     otherErrs.concat(aerr).slice(0,2).join(' | '));

  // ------------------------------------------------------------- CLEAN UP
  // The suite must be idempotent: remove the probe and prove the canonical
  // source returns to exactly the state it was in.
  console.log('\n=== REMOVE THE PROBE ===');
  console.log(execSync('python3 '+__dirname+'/removesim.py',{encoding:'utf8'}).trim());
  ok('the feed returns to its previous version, byte for byte', feedVersion()===v1,
     feedVersion()+' (was '+v1+')');
  ok('the service worker is restamped back', swVersion()===v1);
  ok('the probe is gone from the crawlable pages',
     !fs.existsSync(ROOT+'/s/ADV-2026-P2-PHY-Q99/index.html'));

  console.log('\n'+(n-bad)+' / '+n+' passed');
  await b.close(); site.kill(); app.kill();
  process.exit(bad?1:0);
})();
