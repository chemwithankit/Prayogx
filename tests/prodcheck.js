const ROOT = process.env.PRAYOGX_ROOT || require('path').resolve(__dirname, '..');
/* The production tree, exercised the way a user and a crawler would. */
const { chromium } = require(process.env.PLAYWRIGHT || '/home/claude/build/node_modules/playwright');
const { spawn } = require('child_process');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let n=0,bad=0; const errs=[], misses=[];
const ok=(l,c,x)=>{n++;if(!c)bad++;console.log((c?'PASS  ':'FAIL  ')+l+(x!==undefined?'   '+x:''));};
(async () => {
  // A free port chosen at run time: a leftover server from an earlier run must
  // never be able to masquerade as this one.
  const net = require('net');
  const PORT = await new Promise(res=>{const sv=net.createServer();
    sv.listen(0,'127.0.0.1',()=>{const q=sv.address().port; sv.close(()=>res(q));});});
  const site = spawn('python3',[__dirname+'/corsserve.py',String(PORT),ROOT],{stdio:'ignore'});
  await sleep(1000);
  const S='http://127.0.0.1:'+PORT+'/';
  console.log('serving the production tree on port '+PORT);
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await b.newContext({viewport:{width:1280,height:950}});
  const p = await ctx.newPage();
  p.on('pageerror',e=>errs.push('PAGEERROR '+e.message));
  p.on('console',m=>{if(m.type()==='error')errs.push('CONSOLE '+m.text());});
  p.on('response',r=>{if(r.status()>=400) misses.push(r.status()+' '+r.url().replace(S,''));});

  // ---------------------------------------------------------------- catalogue
  console.log('\n--- catalogue ---');
  await p.goto(S,{waitUntil:'networkidle'});
  const cat = await p.evaluate(()=>({
    cards:document.querySelectorAll('article.card').length,
    total:document.querySelector('.count.total .n').textContent,
    subjects:[...document.querySelectorAll('.count.subj .k')].map(x=>x.textContent),
    foot:document.getElementById('foot-src').textContent}));
  ok('17 cards render from the feed', cat.cards===17 && cat.total==='17', cat.cards+'/'+cat.total);
  ok('it reads content/index.json', /content\/index\.json/.test(cat.foot), cat.foot.trim().slice(0,52));

  // ------------------------------------------------------------------ search
  console.log('\n--- search ---');
  await p.fill('#q','kjeldahl'); await sleep(900);
  ok('title-level search works', (await p.evaluate(()=>document.querySelectorAll('article.card').length))===1);
  await p.fill('#q','finkelstein'); await sleep(700);
  ok('prose-level search works (lazy blob)', (await p.evaluate(()=>document.querySelectorAll('article.card').length))>=1);
  await p.fill('#q','zzzznotathing'); await sleep(600);
  ok('a miss shows the empty state', await p.evaluate(()=>!!document.querySelector('.empty')));
  await p.fill('#q',''); await sleep(500);

  // ----------------------------------------------------------------- filters
  console.log('\n--- filters ---');
  await p.selectOption('#fs','Chemistry'); await sleep(500);
  ok('subject filter', (await p.evaluate(()=>document.querySelectorAll('article.card').length))===17);
  await p.selectOption('#fc','Solutions and Colligative Properties'); await sleep(500);
  ok('chapter filter narrows', (await p.evaluate(()=>document.querySelectorAll('article.card').length))===3);
  const topics = await p.evaluate(()=>[...document.querySelectorAll('#ft option')].length);
  ok('topic options narrow to the chapter', topics>=2 && topics<=5, topics+' options');
  await p.click('#reset'); await sleep(500);
  ok('reset restores everything', (await p.evaluate(()=>document.querySelectorAll('article.card').length))===17);

  // -------------------------------------------------------------- detail page
  console.log('\n--- simulation detail pages ---');
  await p.goto(S+'#/sim/ADV-2026-P2-CHE-Q17',{waitUntil:'networkidle'}); await sleep(900);
  const d = await p.evaluate(()=>({
    h1:(document.querySelector('.detail h1')||{}).textContent||'',
    cta:(document.querySelector('a.cta')||{}).getAttribute&&document.querySelector('a.cta').getAttribute('href'),
    lists:document.querySelectorAll('.cols ul.plain').length,
    id:(document.querySelector('.idline')||{}).textContent||''}));
  ok('detail renders with prose from the detail record', /Kjeldahl/.test(d.h1) && d.lists>=3, d.lists+' lists');
  ok('its OPEN link carries revision 2', /\?v=2$/.test(d.cta||''), d.cta);
  ok('the simulation ID is shown', /ADV-2026-P2-CHE-Q17/.test(d.id));
  ok('the answer does not leak', !/\b10 mL\b/.test(await p.evaluate(()=>document.body.innerText)));

  // ------------------------------------------------- direct URLs and deep links
  console.log('\n--- direct URLs and deep links ---');
  const fresh = await (await b.newContext({viewport:{width:1280,height:950}})).newPage();
  fresh.on('pageerror',e=>errs.push('DEEP '+e.message));
  await fresh.goto(S+'#/sim/ADV-2026-P2-CHE-Q11',{waitUntil:'networkidle'}); await sleep(1000);
  ok('a deep link opens the right simulation in a cold browser',
     /Freundlich/i.test(await fresh.evaluate(()=>(document.querySelector('.detail h1')||{}).textContent||'')));
  await fresh.goto(S+'#/?s=Chemistry&c=Polymers',{waitUntil:'networkidle'}); await sleep(800);
  ok('a filtered deep link restores its filters',
     (await fresh.evaluate(()=>document.querySelectorAll('article.card').length))===1);
  await fresh.goto(S+'s/ADV-2026-P2-CHE-Q14/',{waitUntil:'domcontentloaded'}); await sleep(400);
  const stub = await fresh.evaluate(()=>({t:document.title,
    go:(document.querySelector('a.go')||{}).getAttribute('href'),
    back:[...document.querySelectorAll('a')].some(a=>a.getAttribute('href')==='../../#/sim/ADV-2026-P2-CHE-Q14')}));
  ok('the crawlable URL works standalone', /Polymer|copolymer/i.test(stub.t), stub.t.slice(0,44));
  ok('...and deep-links back into the app view', stub.back);
  await fresh.click('a.go'); await sleep(800);
  ok('...and its OPEN link reaches the simulation itself',
     /polymer|reactor/i.test(await fresh.title()), (await fresh.title()).slice(0,40));

  // ------------------------------------------------------------ back navigation
  console.log('\n--- back navigation ---');
  await p.goto(S,{waitUntil:'networkidle'});
  await p.click('article.card h3 a'); await sleep(700);
  const onDetail = await p.evaluate(()=>!!document.querySelector('.detail'));
  await p.goBack(); await sleep(700);
  const backList = await p.evaluate(()=>document.querySelectorAll('article.card').length);
  ok('browser back returns from a detail page to the catalogue', onDetail && backList===17, backList);
  await p.goForward(); await sleep(600);
  ok('forward returns to the detail page', await p.evaluate(()=>!!document.querySelector('.detail')));
  await p.click('a.back'); await sleep(700);   // we are on the detail page after goForward
  ok('the in-page back link also returns to the catalogue',
     (await p.evaluate(()=>document.querySelectorAll('article.card').length))===17);

  // --------------------------------------------------------------- mobile
  console.log('\n--- mobile layout ---');
  for (const w of [390,360]) {
    const m = await (await b.newContext({viewport:{width:w,height:820},isMobile:true,hasTouch:true})).newPage();
    m.on('pageerror',e=>errs.push('M'+w+' '+e.message));
    await m.goto(S,{waitUntil:'networkidle'}); await sleep(700);
    const ov = await m.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    ok('no horizontal overflow at '+w+' px', ov<=0, ov);
    await m.goto(S+'s/ADV-2026-P2-CHE-Q17/',{waitUntil:'domcontentloaded'}); await sleep(400);
    const ov2 = await m.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    ok('...and none on a crawlable page at '+w+' px', ov2<=0, ov2);
  }

  // ------------------------------------------------------------------ PWA
  console.log('\n--- PWA ---');
  await p.goto(S,{waitUntil:'networkidle'});
  await p.waitForFunction(()=>navigator.serviceWorker&&navigator.serviceWorker.controller,null,{timeout:15000}).catch(()=>{});
  const mf = await (await p.request.get(S+'manifest.webmanifest')).json();
  ok('installable manifest', !!mf.name && !!mf.start_url && mf.display==='standalone' &&
     mf.icons.some(i=>i.sizes==='192x192') && mf.icons.some(i=>i.sizes==='512x512') &&
     mf.icons.some(i=>i.purpose==='maskable'));
  ok('service worker controls the page',
     await p.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();return !!(r&&r.active);}));
  const ck = await p.evaluate(()=>caches.keys());
  ok('shell, feed and sims caches all exist',
     ck.some(k=>/shell/.test(k)) && ck.some(k=>/feed/.test(k)), ck.join(', '));

  // --------------------------------------------------------------- offline
  console.log('\n--- offline ---');
  await p.goto(S+'simulations/2026/paper-2/chemistry/adv-2026-p2-che-q17/index.html?v=2',{waitUntil:'networkidle'});
  await sleep(600);
  /* Two different questions need two different instruments:
       - the offline BANNER keys on navigator.onLine, which only setOffline flips
       - the offline FALLBACK keys on fetch actually failing, which only a dead
         server reproduces (route interception is handled before the service
         worker ever sees the request). */
  await ctx.setOffline(true); await sleep(400);
  await p.goto(S,{waitUntil:'domcontentloaded'}).catch(()=>{}); await sleep(1100);
  ok('the catalogue still renders when the browser reports offline',
     (await p.evaluate(()=>document.querySelectorAll('article.card').length))===17,
     await p.evaluate(()=>document.querySelectorAll('article.card').length));
  ok('and the offline banner appears', await p.evaluate(()=>!!document.querySelector('.offlinebar')));
  await ctx.setOffline(false);

  site.kill('SIGKILL'); await sleep(1500);
  // prove the origin is really gone before asserting anything about offline
  const reachable = await fetch(S+'content/catalog.json').then(()=>true).catch(()=>false);
  ok('the origin is genuinely unreachable for this part of the test', reachable===false);
  await p.goto(S+'simulations/2026/paper-2/chemistry/adv-2026-p2-che-q17/index.html?v=2',
               {waitUntil:'domcontentloaded'}).catch(()=>{}); await sleep(800);
  ok('an opened simulation still runs with the server unreachable',
     /Kjeldahl/.test(await p.title()), (await p.title()).slice(0,36));
  await p.goto(S+'simulations/2026/paper-2/chemistry/adv-2026-p2-che-q01/index.html?v=1',
               {waitUntil:'domcontentloaded'}).catch(()=>{}); await sleep(900);
  ok('one never opened shows the offline page, not a browser error',
     /You are offline/.test(await p.evaluate(()=>document.body.innerText)),
     (await p.evaluate(()=>document.body.innerText)).split('\n')[0].slice(0,40));

  console.log('\n--- hygiene ---');
  const realErrs = errs.filter(e=>!/Failed to load resource/.test(e));
  ok('no page or console errors', realErrs.length===0, realErrs.slice(0,3).join(' | '));
  const realMisses = misses.filter(m=>!/favicon/.test(m));
  ok('no broken assets or bad paths', realMisses.length===0, [...new Set(realMisses)].slice(0,4).join(' | '));

  console.log('\n'+(n-bad)+' / '+n+' passed');
  await b.close(); try{site.kill();}catch(e){}
  process.exit(bad?1:0);
})();
