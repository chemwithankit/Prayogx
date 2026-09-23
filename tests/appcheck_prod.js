const ROOT = process.env.PRAYOGX_ROOT || require('path').resolve(__dirname, '..');
/* the library size comes from the canonical source, so adding a simulation never breaks this suite */
const NSIMS = JSON.parse(require('fs').readFileSync(ROOT + '/data/manifest.json', 'utf8')).simulations.length;
const { chromium } = require(process.env.PLAYWRIGHT || '/home/claude/build/node_modules/playwright');
const { spawn } = require('child_process');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  // "production site" (the feed + simulations) and the app shell, separately served
  // CORS headers only matter for this browser-based test: the installed app
  // uses CapacitorHttp, which goes out natively and never asks for them.
  const net=require('net');
  const freePort = () => new Promise(res=>{const sv=net.createServer();
    sv.listen(0,'127.0.0.1',()=>{const q=sv.address().port; sv.close(()=>res(q));});});
  const PS = await freePort(), PA = await freePort();
  const site = spawn('python3',[__dirname+'/corsserve.py',String(PS),
                     ROOT],{stdio:'ignore'});
  // Serve a copy of the shell with its origin pointed at the fixture, so the
  // shipped config.js keeps naming the real deployment.
  const fs = require('fs');
  const T = __dirname+'/apptest';
  fs.rmSync(T,{recursive:true,force:true});
  fs.mkdirSync(T,{recursive:true});
  for (const f of fs.readdirSync(ROOT+'/app/www'))
    fs.copyFileSync(ROOT+'/app/www/'+f, T+'/'+f);
  fs.writeFileSync(T+'/config.js',
    fs.readFileSync(T+'/config.js','utf8')
      .replace(/origin:\s*"[^"]+"/, 'origin: "http://127.0.0.1:'+PS+'"'));
  const app  = spawn('python3',['-m','http.server',String(PA),'--bind','127.0.0.1'],
                     {cwd:T,stdio:'ignore'});
  await sleep(1000);
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const errs=[]; let n=0,bad=0;
  const ok=(l,c,x)=>{n++;if(!c)bad++;console.log((c?'PASS  ':'FAIL  ')+l+(x!==undefined?'   '+x:''));};
  const ctx = await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,
                                  isMobile:true,hasTouch:true});
  const p = await ctx.newPage();
  p.on('pageerror',e=>errs.push('PAGEERROR: '+e.message));
  p.on('console',m=>{if(m.type()==='error'&&!/404|Failed to load resource/.test(m.text()))errs.push('CONSOLE: '+m.text());});
  const A='http://127.0.0.1:'+PA+'/';
  const reqs=[]; p.on('request',r=>reqs.push(r.url()));

  await p.goto(A,{waitUntil:'networkidle'}); await sleep(900);

  ok('the shell bundles no simulation and no catalogue',
     !reqs.some(u=>u.indexOf(':'+PA+'/')>=0 && /simulations|content\//.test(u)),
     'app requests: '+reqs.filter(u=>u.indexOf(':'+PA+'/')>=0).map(u=>u.split('/').pop()).join(', '));
  ok('it fetches the catalogue and index from the published site',
     reqs.some(u=>u.indexOf(':'+PS+'/content/catalog.json')>=0) &&
     reqs.some(u=>u.indexOf(':'+PS+'/content/index.json')>=0));
  const st = await p.evaluate(()=>window.__prayogx.state());
  ok('the library loads over the network', st.sims===NSIMS, st.sims+' simulations, feed '+st.catalog);
  const ui = await p.evaluate(()=>({
    cards:document.querySelectorAll('.simcard').length,
    tabs:document.querySelectorAll('.tabs button').length,
    title:document.getElementById('screenTitle').textContent
  }));
  ok('it renders a native-style list with a bottom tab bar', ui.cards===NSIMS && ui.tabs===4, ui.cards+' cards');
  const ov = await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  ok('no horizontal overflow at 390 px', ov<=0, ov);
  const tap = await p.evaluate(()=>{
    const r=document.querySelector('.tabs button').getBoundingClientRect();
    const sEl=document.querySelector('.star');
    const s=sEl?sEl.getBoundingClientRect():{width:0,height:0};
    return {tab:Math.round(r.height), star:Math.round(Math.min(s.width,s.height))};
  });
  ok('touch targets are big enough', tap.tab>=48 && tap.star>=36, 'tab '+tap.tab+'px, star '+tap.star+'px');

  // filters sheet
  await p.click('#filterbtn'); await sleep(300);
  ok('the filter sheet opens', await p.evaluate(()=>!document.getElementById('sheet').hidden));
  await p.click('[data-f="chapter"][data-v="Polymers"]'); await sleep(150);
  await p.click('#applyf'); await sleep(300);
  const filtered = await p.evaluate(()=>({
    cards:document.querySelectorAll('.simcard').length,
    chips:document.querySelectorAll('#chiprow button').length}));
  ok('a chapter filter applies and shows a removable chip',
     filtered.cards===1 && filtered.chips===1, filtered.cards+' card');
  await p.click('#chiprow button'); await sleep(250);
  ok('removing the chip restores the list',
     (await p.evaluate(()=>document.querySelectorAll('.simcard').length))===NSIMS);

  // search
  await p.fill('#q','kjeldahl'); await sleep(800);
  ok('search works against the same feed',
     (await p.evaluate(()=>document.querySelectorAll('.simcard').length))===1);
  await p.fill('#q',''); await sleep(400);

  // detail + open. The fixture only carries the last four simulation files, so
  // open one that exists there rather than the first card in the list.
  await p.fill('#q','kjeldahl'); await sleep(800);
  await p.click('.simcard'); await sleep(700);
  const det = await p.evaluate(()=>({
    h:(document.querySelector('.detail h2')||{}).textContent||'',
    open:!!document.getElementById('openbtn'),
    lists:document.querySelectorAll('.detail ul').length}));
  ok('the detail screen paints and then fills from the detail record',
     det.open && det.h.length>5 && det.lists>=1, det.lists+' lists');

  await p.click('#openbtn'); await sleep(1500);
  const viewer = await p.evaluate(()=>({
    open:!document.getElementById('viewer').hidden,
    title:document.getElementById('vtitle').textContent
  }));
  ok('the simulation opens in a full-screen viewer with its own bar', viewer.open, viewer.title.slice(0,40));
  const inside = await p.frames().find(f=>f.name()==='' && f!==p.mainFrame());
  const simTitle = await p.evaluate(()=>{
    const f=document.getElementById('frame');
    return f.contentDocument ? f.contentDocument.title : '';
  });
  ok('the real simulation renders inside it, not a link to a website',
     /Kjeldahl|PrayogX/i.test(simTitle), simTitle.slice(0,46));
  const stored = await p.evaluate(()=>new Promise(res=>{
    const r=indexedDB.open('prayogx',1);
    r.onsuccess=()=>{const d=r.result;const t=d.transaction('sims','readonly').objectStore('sims').getAll();
      t.onsuccess=()=>res(t.result.map(x=>({id:x.id,rev:x.revision,kb:Math.round(x.html.length/1024)})));
      t.onerror=()=>res([]);};
    r.onerror=()=>res([]);}));
  ok('it is stored on the device for offline use', stored.length===1,
     stored.map(s=>s.id+' r'+s.rev+' '+s.kb+'KB').join(', '));

  // back navigation
  await p.evaluate(()=>window.__prayogx.goBack()); await sleep(400);
  ok('back closes the viewer, not the app',
     await p.evaluate(()=>document.getElementById('viewer').hidden && /detail:/.test(window.__prayogx.state().mode)));
  await p.evaluate(()=>window.__prayogx.goBack()); await sleep(400);
  ok('back again returns to the list',
     await p.evaluate(()=>window.__prayogx.state().mode==='library'));

  // offline: kill the site server, reload the app
  site.kill(); await sleep(600);
  await p.goto(A,{waitUntil:'domcontentloaded'}); await sleep(1200);
  const offl = await p.evaluate(()=>({
    cards:document.querySelectorAll('.simcard').length,
    sims:window.__prayogx.state().sims}));
  ok('with the site unreachable the library still opens from its stored copy',
     offl.cards===NSIMS, offl.cards+' cards');
  await p.click('.tabs button[data-tab="offline"]'); await sleep(700);
  const offtab = await p.evaluate(()=>document.getElementById('screen').innerText);
  ok('the Offline tab lists what is stored on the device',
     /stored/.test(offtab) && /on this device/.test(offtab), offtab.split('\n')[0]);
  await p.click('.tabs button[data-tab="library"]'); await sleep(400);
  await p.fill('#q','kjeldahl'); await sleep(600);
  await p.click('.simcard'); await sleep(500);
  await p.click('#openbtn'); await sleep(1200);
  const offSim = await p.evaluate(()=>{
    const f=document.getElementById('frame');
    return f.contentDocument? f.contentDocument.title : '';});
  ok('and a stored simulation still runs with no connection at all',
     /Kjeldahl|PrayogX/i.test(offSim), offSim.slice(0,46));

  ok('console clean throughout', errs.length===0, errs.slice(0,2).join(' | '));
  console.log('\n'+(n-bad)+' / '+n+' passed');
  await b.close(); try{site.kill();}catch(e){} app.kill();
  process.exit(bad?1:0);
})();
