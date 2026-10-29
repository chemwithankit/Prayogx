const ROOT = process.env.PRAYOGX_ROOT || require('path').resolve(__dirname, '..');
const { launch } = require('./_browser');
const { spawn } = require('child_process');
const fs = require('fs'), net = require('net'), path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------------------------------------------------------------------------
   PrayogX Learn portal (tools/build_learn.py) against its sources
   (data/learn/curriculum.json, data/learn/topics/*.json):
     home       the site root shows two entry points (JEE, Learn), JEE opens #/jee
     portal     five class cards, real video counts only
     class      one card per curriculum subject
     subject    one chapter card per curriculum chapter, in order; Chapters /
                Find a topic tabs; search and chapter filter narrow the topics
     chapter    every ready topic of the chapter has a Watch row; planned topics
                show as "Coming soon"; prev / next chapter links
     topic      video embed, Instagram fallback, notes PDF, breadcrumb to its
                chapter, up-next / previous within the chapter, the quiz
                (select, change, clear, submit, score, explanations, lock, retry)
                and the simulation where it is REQUIRED and passed
   plus: every internal link on every Learn page resolves, no horizontal
   overflow at 390 / 360 / 1280 px, no console errors.
   --------------------------------------------------------------------------- */

let n = 0, bad = 0;
const ok = (l, c, x) => { n++; if (!c) bad++;
  console.log((c ? 'PASS  ' : 'FAIL  ') + l + (x !== undefined ? '   ' + x : '')); };
const freePort = () => new Promise(res => { const sv = net.createServer();
  sv.listen(0, '127.0.0.1', () => { const q = sv.address().port; sv.close(() => res(q)); }); });
const slugify = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

(async () => {
  const dir = path.join(ROOT, 'data', 'learn', 'topics');
  const topics = fs.readdirSync(dir).filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))).filter(t => t.status === 'ready');
  const cur = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'learn', 'curriculum.json'), 'utf8'));
  // where each topic sits: class, subject, chapter (same rules as build_learn.place)
  const where = t => {
    const c = cur.classes.find(c => String(c.class) === String(t.class));
    const s = c.subjects.find(s => s.disciplines.includes(t.subject));
    if (c.id === 'extra') return { c, s, chapter: t.chapter, slug: slugify(t.chapter) };
    const ch = s.chapters.find(x => x.name === t.chapter || (x.aliases || []).includes(t.chapter));
    return { c, s, chapter: ch.name, slug: slugify(ch.name), ch };
  };
  const port = await freePort();
  const srv = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  await sleep(700);
  const base = 'http://127.0.0.1:' + port;
  const browser = await launch();
  try {
    for (const width of [1280, 390, 360]) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 } });
      // never let the suite depend on YouTube or ads: the embed is checked by its src, not played
      await ctx.route(/youtube(-nocookie)?\.com|ytimg|googlevideo|googlesyndication|doubleclick/, r => r.fulfill({ status: 200, body: '', contentType: 'text/html' }));
      const page = await ctx.newPage();
      const errs = [];
      page.on('pageerror', e => errs.push(e.message));
      page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
      const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      const visit = async (u, tag) => {
        errs.length = 0;
        await page.goto(base + u, { waitUntil: 'load' });
        const ov = await overflow();
        ok(`${tag} @${width}: no horizontal overflow`, ov <= 0, ov);
      };

      // ---- home: two entry points
      await visit('/?home', 'home');
      await page.waitForSelector('#home-jee');
      const home = await page.$$eval('.homecard', a => a.map(x => x.getAttribute('href')));
      ok(`home @${width}: exactly two entry points, JEE and Learn`, home.length === 2 && home[0] === '#/jee' && home[1] === 'learn/', home.join(', '));
      await page.click('#home-jee'); await page.waitForSelector('article.card');
      ok(`home @${width}: JEE opens the simulation catalogue`, page.url().endsWith('#/jee') && (await page.$$('article.card')).length > 0);

      // ---- portal
      await visit('/learn/', 'portal');
      const classes = await page.$$eval('.classcard', a => a.map(x => [x.getAttribute('href'), x.querySelector('.m').textContent]));
      ok(`portal @${width}: five class cards in order`, classes.map(c => c[0]).join() === cur.classes.map(c => c.id + '/').join(), classes.map(c => c[0]).join(' '));
      for (const c of cur.classes) {
        const cnt = topics.filter(t => where(t).c.id === c.id).length;
        const shown = (classes.find(x => x[0] === c.id + '/') || [, ''])[1];
        ok(`portal @${width}: ${c.id} count is real (${cnt})`, cnt ? shown === `${cnt} video${cnt === 1 ? '' : 's'}` : shown === 'Videos coming soon', shown);
      }

      // ---- every class, subject and (at desktop) chapter page
      for (const c of cur.classes) {
        await visit(`/learn/${c.id}/`, c.id);
        const subs = await page.$$eval('.subjcard', a => a.map(x => x.getAttribute('href')));
        ok(`${c.id} @${width}: one card per subject`, subs.join() === c.subjects.map(s => s.id + '/').join(), subs.join(' '));
        for (const s of c.subjects) {
          const mine = topics.filter(t => where(t).c.id === c.id && where(t).s.id === s.id);
          const phone = width !== 1280;
          if (phone && !(c.id === 'class-9' || mine.length)) continue;   // phones: the populated pages and all of Class 9
          await visit(`/learn/${c.id}/${s.id}/`, `${c.id}/${s.id}`);
          const chs = await page.$$eval('.chapcard', a => a.map(x => x.getAttribute('href')));
          const want = c.id === 'extra' ? [...new Set(mine.map(t => slugify(t.chapter) + '/'))] : s.chapters.map(x => slugify(x.name) + '/');
          ok(`${c.id}/${s.id} @${width}: chapters in curriculum order`, chs.join() === want.join(), chs.length + ' cards');
          if (mine.length) {
            await page.click('#tab-topics');
            ok(`${c.id}/${s.id} @${width}: Find a topic shows every topic`, (await page.$$eval('#tgrid .vcard', a => a.length)) === mine.length);
            const tag = (mine[0].tags || [mine[0].title])[0];
            await page.fill('#tq', tag);
            const vis = await page.$$eval('#tgrid .vcard', a => a.filter(x => !x.hidden).map(x => x.getAttribute('href')));
            ok(`${c.id}/${s.id} @${width}: search "${tag}" finds its topic`, vis.some(h => h.endsWith('/' + mine[0].slug + '/')), vis.join(' '));
            await page.fill('#tq', 'zzqx-no-such-topic');
            ok(`${c.id}/${s.id} @${width}: a search with no match says so`, await page.$eval('#tnone', e => !e.hidden));
            await page.fill('#tq', '');
            await page.click('#tab-chapters');
            ok(`${c.id}/${s.id} @${width}: back to Chapters`, await page.$eval('#view-topics', e => e.hidden));
          }
          ok(`${c.id}/${s.id} @${width}: no console errors`, errs.length === 0, errs.join(' | '));
        }
      }

      // ---- chapter pages that hold videos (plus one without)
      const chapUrls = [...new Set(topics.map(t => { const w = where(t); return `/learn/${w.c.id}/${w.s.id}/${w.slug}/`; }))];
      chapUrls.push('/learn/class-9/science/sound/');
      for (const u of chapUrls) {
        await visit(u, 'chapter ' + u);
        const watch = await page.$$eval('.trow.have a', a => a.map(x => x.getAttribute('href')));
        const expected = topics.filter(t => { const w = where(t); return u === `/learn/${w.c.id}/${w.s.id}/${w.slug}/`; });
        ok(`chapter ${u} @${width}: a Watch row per video`, watch.length === expected.length && expected.every(t => watch.some(h => h.endsWith('/' + t.slug + '/'))), watch.length + '/' + expected.length);
        const planned = (expected[0] && where(expected[0]).ch && where(expected[0]).ch.planned) || [];
        if (planned.length) {
          const soon = await page.$$eval('.trow.soon', a => a.length);
          ok(`chapter ${u} @${width}: planned topics without video say Coming soon`, soon === planned.length - expected.filter(t => planned.some(p => norm(p) === norm(t.topic) || norm(p) === norm(t.title))).length, soon);
        }
        ok(`chapter ${u} @${width}: no console errors`, errs.length === 0, errs.join(' | '));
      }

      // ---- topic pages
      for (const t of topics) {
        const w = where(t);
        await visit('/learn/' + t.slug + '/', t.slug);
        await page.waitForSelector('.qitem');
        const tag = `${t.slug} @${width}`;
        const src = await page.$eval('.video iframe', f => f.getAttribute('src'));
        ok(`${tag}: video embeds ${t.video.youtubeId}`, src.includes('/embed/' + t.video.youtubeId));
        ok(`${tag}: Instagram fallback link`, (await page.$eval('.video-alt a', a => a.href)) === t.video.instagram);
        const crumb = await page.$$eval('.crumbs a', a => a.map(x => x.getAttribute('href')));
        ok(`${tag}: breadcrumb ends at its chapter`, crumb[crumb.length - 1] === `../${w.c.id}/${w.s.id}/${w.slug}/`, crumb.join(' '));
        ok(`${tag}: an up-next or back-to-chapter link`, !!(await page.$('.upnext')));
        if (width === 1280) {
          const r = await page.request.get(await page.$eval('a.dl', a => a.href));
          const body = await r.body();
          ok(`${tag}: notes PDF downloads`, r.ok() && body.slice(0, 5).toString() === '%PDF-', r.status() + ' ' + body.length + ' B');
        }
        // quiz
        const qn = await page.$$eval('.qitem', a => a.length);
        ok(`${tag}: quiz shows ${t.quiz.length} questions`, qn === t.quiz.length, qn);
        const disabled = () => page.$eval('#qsubmit', b => b.disabled);
        ok(`${tag}: submit disabled before answering`, await disabled());
        const pick = (q, o) => page.click(`.qopt[data-q="${q}"][data-o="${o}"]`);
        const pressed = (q, o) => page.$eval(`.qopt[data-q="${q}"][data-o="${o}"]`, b => b.getAttribute('aria-pressed'));
        await pick(0, 0); ok(`${tag}: selecting marks the option`, (await pressed(0, 0)) === 'true');
        await pick(0, 1); ok(`${tag}: changing moves the selection`, (await pressed(0, 0)) === 'false' && (await pressed(0, 1)) === 'true');
        await pick(0, 1); ok(`${tag}: picking again clears it`, (await pressed(0, 1)) === 'false');
        const wrong0 = (t.quiz[0].answer + 1) % t.quiz[0].options.length;
        for (let i = 0; i < t.quiz.length; i++) await pick(i, i === 0 ? wrong0 : t.quiz[i].answer);
        ok(`${tag}: submit enabled when all answered`, !(await disabled()));
        await page.click('#qsubmit');
        const score = await page.$eval('#qscore', e => e.textContent);
        ok(`${tag}: score counts correct answers`, score.includes(`${t.quiz.length - 1} / ${t.quiz.length}`), score);
        const exps = await page.$$eval('.qexp', a => a.map(e => e.getAttribute('data-result')));
        ok(`${tag}: every question explained, first marked wrong`, exps.length === t.quiz.length && exps[0] === 'wrong' && exps.slice(1).every(x => x === 'right'), exps.join(','));
        ok(`${tag}: correct option highlighted`, await page.$eval(`.qopt[data-q="0"][data-o="${t.quiz[0].answer}"]`, b => b.classList.contains('right')));
        ok(`${tag}: answers locked after submit`, await page.$$eval('.qopt', a => a.every(b => b.disabled)));
        await page.click('#qretry');
        const cleared = await page.evaluate(() => { const s = window.PX_LEARN.state(); return !s.submitted && s.picks.every(p => p === -1); });
        ok(`${tag}: retry clears the quiz`, cleared && !(await page.$('.qexp')));
        // simulation
        const sim = t.simulation;
        const frame = await page.$('.simbox iframe');
        if (sim.decision === 'REQUIRED' && sim.status === 'pass') {
          ok(`${tag}: simulation framed`, !!frame);
          if (frame) {
            const f = await frame.contentFrame();
            await f.waitForLoadState('load');
            ok(`${tag}: simulation exposes window.PX`, await f.evaluate(() => !!(window.PX && window.PX.state)));
            ok(`${tag}: simulation has no horizontal overflow`, (await f.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 0);
          }
        } else {
          ok(`${tag}: no simulation frame (${sim.decision}${sim.status ? ' ' + sim.status : ''})`, !frame);
        }
        ok(`${tag}: no console errors`, errs.length === 0, errs.join(' | '));
      }

      // ---- desktop: every internal link on every Learn page resolves
      if (width === 1280) {
        const pages = [], seen = new Set(['/learn/']), queue = ['/learn/'], broken = [];
        while (queue.length) {
          const u = queue.shift();
          const r = await page.request.get(base + u);
          if (!r.ok()) { broken.push(u + ' ' + r.status()); continue; }
          if (!/\.html?$|\/$/.test(u)) continue;
          pages.push(u);
          const html = await r.text();
          for (const m of html.matchAll(/(?:href|src)="([^"#]+)/g)) {
            if (/^(https?:|data:|mailto:)/.test(m[1])) continue;
            const abs = new URL(m[1], base + u);
            if (abs.origin !== base) continue;
            const p = abs.pathname;
            if (seen.has(p)) continue;
            seen.add(p);
            if (p.startsWith('/learn/')) queue.push(p);
            else { const r2 = await page.request.get(base + p); if (!r2.ok()) broken.push(p + ' ' + r2.status() + ' (from ' + u + ')'); }
          }
        }
        ok(`crawl: every internal link from ${pages.length} Learn pages resolves`, broken.length === 0, broken.slice(0, 5).join(' | ') || seen.size + ' URLs');
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
    srv.kill();
  }
  console.log(`\n${n - bad} / ${n} passed`);
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
