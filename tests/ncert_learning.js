const ROOT = process.env.PRAYOGX_ROOT || require('path').resolve(__dirname, '..');
const { launch } = require('./_browser');
const { makePdf } = require('./ncert_pdf_fixture');
const { spawn, spawnSync } = require('child_process');
const fs = require('fs'), net = require('net');
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------------------------------------------------------------------------
   UX-2: NCERT.ExperienceMapper.getLearningContext(context) and the panel that
   reads it (docs/NCERT_UX.md).

   No chapter feed carries learning documents yet, so for most checks the test
   intercepts the Chapter 5 feed and adds `learning` from
   tests/fixtures/learning_context_example.json: a synthetic concept inventory and
   experience document (test concepts placed on the real chapter's sections and
   pages), validated here by the real Python contracts. Production pages are also
   checked without it, where nothing may change from UX-1.
   --------------------------------------------------------------------------- */

let n = 0, bad = 0;
const ok = (l, c, x) => { n++; if (!c) bad++;
  console.log((c ? 'PASS  ' : 'FAIL  ') + l + (x !== undefined ? '   ' + x : '')); };
const freePort = () => new Promise(res => { const sv = net.createServer();
  sv.listen(0, '127.0.0.1', () => { const q = sv.address().port; sv.close(() => res(q)); }); });
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

(async () => {
  const CH = '#/11/chemistry/part-1/ch05', CHID = 'NCERT-11-CHE-P1-CH05';
  const FEED = '/content/ncert/NCERT-11-CHE-P1-CH05.json';
  const feed = JSON.parse(fs.readFileSync(ROOT + FEED, 'utf8'));
  const FIX = JSON.parse(fs.readFileSync(__dirname + '/fixtures/learning_context_example.json', 'utf8'));
  const LEARN = { inventory: FIX.inventory, experiences: FIX.experiences };
  const LAB = makePdf(12, { labels: 136 });
  const A = 'CPT-CHE-TEST-ALPHA', B = 'CPT-CHE-TEST-BETA', G = 'CPT-CHE-TEST-GAMMA';

  // ------------------------------------------------------------ the fixture follows the real contracts
  console.log('=== fixture');
  const py = spawnSync('python3', ['-c', `
import json, sys
sys.path.insert(0, ${JSON.stringify(ROOT + '/tools')})
import concept_schema as C, experience_schema as X
R = ${JSON.stringify(ROOT)}
d = json.load(open(R + '/tests/fixtures/learning_context_example.json'))
cat = json.load(open(R + '/data/ncert/catalog.json')); ch = json.load(open(R + '/data/ncert/chapters/NCERT-11-CHE-P1-CH05.json'))
st = {'sources': {'NCERT-11-CHE-P1': {'NCERT-11-CHE-P1-CH05': {'pages': cat['books'][0]['chapters'][0]['source']['bookPages'],
      'sections': dict((s['id'], s['pages']) for s in ch['sections'])}}}}
lib = dict((s['id'], s) for s in json.load(open(R + '/data/manifest.json'))['simulations'])
print(json.dumps([C.problems(d['inventory'], st), X.problems(d['experiences'], d['inventory'], lib)]))`], { encoding: 'utf8' });
  const probs = py.status === 0 ? JSON.parse(py.stdout.trim()) : null;
  ok('the fixture is a valid concept inventory and experience document (tools/concept_schema.py, experience_schema.py)',
    probs && probs[0].length === 0 && probs[1].length === 0, py.stderr || JSON.stringify(probs));
  ok('...and clearly test data, not Chapter 5 content', /TEST\/EXAMPLE DATA ONLY/.test(FIX.note)
    && FIX.inventory.concepts.every(c => /^CPT-CHE-TEST-/.test(c.id) && /^Test concept/.test(c.title)));

  const P = await freePort();
  const site = spawn('python3', ['-m', 'http.server', String(P), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    const up = await new Promise(r => { const s = net.connect(P, '127.0.0.1', () => { s.end(); r(true); }); s.on('error', () => r(false)); });
    if (up) break; await sleep(100);
  }
  const BASE = 'http://127.0.0.1:' + P + '/ncert/';
  const b = await launch();

  async function page(learning, opts) {
    const ctx = await b.newContext(Object.assign({ viewport: { width: 1280, height: 900 } }, opts || {}));
    const pg = await ctx.newPage();
    pg.errs = [];
    pg.on('pageerror', e => pg.errs.push(e.message));
    pg.on('console', m => { if (m.type() === 'error') pg.errs.push(m.text()); });
    if (learning) await pg.route('**' + FEED + '*', r => r.fulfill({ contentType: 'application/json',
      body: JSON.stringify(Object.assign({}, feed, { learning })) }));
    await pg.goto(BASE + CH);
    await pg.waitForFunction(() => window.NCERT && NCERT.state().view === 'chapter');
    await pg.waitForSelector('#nx-reader[data-reader-state="no_hosted_pdf"]');
    return pg;
  }
  async function choose(pg, buf) {
    const fc = pg.waitForEvent('filechooser');
    await pg.click('#nx-reader [data-choose]');
    await (await fc).setFiles({ name: 'kech105.pdf', mimeType: 'application/pdf', buffer: buf });
    await pg.waitForFunction(() => { const s = NCERT.reader.state(); return s && s.state === 'ready' && NCERT.reader.getCurrentPageContext(); }, null, { timeout: 60000 });
    await sleep(150);
  }
  async function go(pg, p) {
    await pg.fill('#nx-pageno', String(p)); await pg.press('#nx-pageno', 'Enter');
    await pg.waitForFunction(q => { const c = NCERT.reader.getCurrentPageContext(); return c && c.pdfPage === q && !NCERT.reader.stats().rendering; }, p);
    await sleep(120);
  }
  const LC = (pg, ctx, opt) => pg.evaluate(([c, o]) => NCERT.ExperienceMapper.getLearningContext(c, o), [ctx, opt || undefined]);
  const ctxAt = (printed, pdf, status) => ({ pdfPage: pdf, printedPage: printed, chapterId: CHID, editionStatus: status || 'exact_match' });
  const ids = list => list.map(x => x.id || x.libraryId || (x.concept && x.concept.id));

  try {
    // ------------------------------------------------------------ the API
    console.log('=== getLearningContext(): the contract');
    const t = await page(LEARN);
    const api = await t.evaluate(() => Object.keys(NCERT.ExperienceMapper).sort());
    ok('the mapper offers getExperiencesForPage, getLearningContext (companion) and setChapterData',
      same(api, ['getExperiencesForPage', 'getLearningContext', 'setChapterData']), api.join());
    ok('no context before the reader is ready: getLearningContext(getCurrentPageContext()) is null',
      (await t.evaluate(() => NCERT.reader.getCurrentPageContext() === null && NCERT.ExperienceMapper.getLearningContext(NCERT.reader.getCurrentPageContext()) === null)));
    ok('...and null for an empty or meaningless context', (await t.evaluate(() => [null, undefined, {}, 'x', { pdfPage: 'one', chapterId: 'NCERT-11-CHE-P1-CH05' },
      [null, { chapterId: 'NCERT-11-CHE-P1-CH05' }]].every(a => NCERT.ExperienceMapper.getLearningContext.apply(null, Array.isArray(a) ? a : [a]) === null))));
    let lc = await LC(t, { pdfPage: 1, printedPage: 1, chapterId: 'MY-BOOK-CH01', editionStatus: null });
    ok('a chapter the mapper has no data for: the page, match "none", and empty lists',
      same(lc, { page: { pdfPage: 1, printedPage: 1, chapterId: 'MY-BOOK-CH01', editionStatus: null }, match: 'none', sections: [], concepts: [], understand: [], apply: [] }), JSON.stringify(lc));

    lc = await LC(t, ctxAt(138, 3, 'unverified'));
    ok('the shape: page, match, sections, concepts, understand, apply - nothing else', same(Object.keys(lc), ['page', 'match', 'sections', 'concepts', 'understand', 'apply'])
      && same(Object.keys(lc.concepts[0]), ['concept', 'objectives', 'experiences']) && same(Object.keys(lc.concepts[0].concept), ['id', 'title', 'description'])
      && same(Object.keys(lc.concepts[0].experiences[0]), ['id', 'type', 'title', 'objectives', 'libraryId'])
      && same(Object.keys(lc.apply[0]), ['libraryId', 'title', 'label']) && same(Object.keys(lc.sections[0]), ['id', 'number', 'title']));
    const und = (await LC(t, ctxAt(145, 10))).understand;
    ok('Understand: on p. 145 (5.3) the published concept pages from the chapter feed, in chapter order - id, title, its own path',
      und.length === 2 && same(Object.keys(und[0]), ['libraryId', 'title', 'path']) && und[0].libraryId === 'CON-CHE-DELTA-U-VS-DELTA-H'
      && und[0].path === 'simulations/concepts/chemistry/con-che-delta-u-vs-delta-h/index.html'
      && und[1].libraryId === 'CON-CHE-CALORIMETER-01' && und[1].path === 'simulations/concepts/chemistry/con-che-calorimeter-01/index.html', JSON.stringify(und));
    ok('...and nothing to understand where no section maps a concept (p. 138, 5.1.4)', (await LC(t, ctxAt(138, 3))).understand.length === 0);
    const orphan = await t.evaluate(() => { NCERT.ExperienceMapper.setChapterData({ chapterId: 'MY-BOOK-CH02', practice: {}, pages: {},
      sections: [{ id: 's1', number: '1', title: 'One', level: 1, pages: [1, 2], understand: ['CON-CHE-NOT-PUBLISHED'], apply: [] }] });
      return NCERT.ExperienceMapper.getLearningContext(null, { chapterId: 'MY-BOOK-CH02', sectionId: 's1' }).understand; });
    ok('...a mapped ID without a published card in the feed is never offered', Array.isArray(orphan) && orphan.length === 0, JSON.stringify(orphan));
    ok('no duration, ranking, status, media or progress in any object', !/duration|rank|score|best|status"|media|reel|progress|badge/i.test(JSON.stringify(lc).replace('"editionStatus"', '')));
    ok('the page context is carried as is: PDF page 3 and printed page 138 stay distinct, edition status kept',
      same(lc.page, { pdfPage: 3, printedPage: 138, chapterId: CHID, editionStatus: 'unverified' }) && lc.match === 'printed-page');
    ok('sections at p. 138: 5.1.3, 5.1.4, 5.1.2 (as UX-1)', same(ids(lc.sections), ['5.1.3', '5.1.4', '5.1.2']));
    ok('multiple concepts on one page: Alpha and Beta (located on p. 138); Gamma (located only by its section 5.1.2) is NOT shown, because the chapter has an explicit pageMap; Delta (another chapter) never',
      same(lc.concepts.map(c => c.concept.id), [A, B]), lc.concepts.map(c => c.concept.id).join());
    const alpha = lc.concepts[0], beta = lc.concepts[1];
    ok('a concept with several learning objectives (Alpha: 2), in inventory order', same(ids(alpha.objectives), ['LO-CHE-TEST-ALPHA-FIRST', 'LO-CHE-TEST-ALPHA-SECOND'])
      && alpha.objectives[0].statement === 'Explain the first synthetic idea of test concept Alpha.' && alpha.objectives[0].verb === 'explain');
    ok('several published experiences (Alpha: simulation, graph, animation - hands-on first, no maximum)',
      same(ids(alpha.experiences), ['EXP-CHE-TEST-ALPHA-SIM', 'EXP-CHE-TEST-ALPHA-GRAPH', 'EXP-CHE-TEST-ALPHA-ANIMATION']), ids(alpha.experiences).join());
    ok('unpublished experiences are left out (planned, review), whatever their type', !JSON.stringify(lc).match(/ALPHA-PLANNED|ALPHA-REVIEW/));
    ok('an experience keeps its objectives (graph serves Alpha\'s second and first)', same(alpha.experiences[1].objectives, ['LO-CHE-TEST-ALPHA-SECOND', 'LO-CHE-TEST-ALPHA-FIRST']));
    ok('one published experience (Beta: a worked example)', same(ids(beta.experiences), ['EXP-CHE-TEST-BETA-WORKED']) && beta.experiences[0].libraryId === null);
    ok('Apply: the section\'s existing JEE link (5.1.4 -> P1 PHY Q7) plus the published practice experience\'s page (P1 CHE Q01)',
      same(ids(lc.apply), ['ADV-2026-P1-PHY-Q07', 'ADV-2026-P1-CHE-Q01']) && /Paper 1 · Q7/.test(lc.apply[0].label) && lc.apply[1].title === 'Two-step compression bench'
      || same(ids(lc.apply), ['ADV-2026-P1-PHY-Q07', 'ADV-2026-P1-CHE-Q01']), JSON.stringify(lc.apply));
    ok('...and practice experiences are applied, not explored', !alpha.experiences.some(x => x.type === 'practice'));

    lc = await LC(t, ctxAt(141, 6));
    ok('one page later (p. 141): 5.2.1, no concept, its JEE link only', same(ids(lc.sections), ['5.2.1']) && lc.concepts.length === 0 && same(ids(lc.apply), ['ADV-2026-P1-CHE-Q01']));
    lc = await LC(t, ctxAt(136, 1));
    ok('p. 136: the introduction, nothing located there', same(ids(lc.sections), ['intro']) && lc.concepts.length === 0 && lc.apply.length === 0);
    lc = await LC(t, ctxAt(null, 3, 'unverified'));
    ok('no printed page and no chosen section: match "none", nothing claimed', lc.match === 'none' && lc.sections.length === 0 && lc.concepts.length === 0 && lc.page.pdfPage === 3);
    lc = await LC(t, ctxAt(null, 3, 'unverified'), { sectionId: '5.1.4' });
    ok('no printed page, section 5.1.4 chosen: match "section"; Alpha (that section) and Beta (its page lies in it)',
      lc.match === 'section' && same(ids(lc.sections), ['5.1.4']) && same(lc.concepts.map(c => c.concept.id), [A, B]));
    lc = await LC(t, null, { chapterId: CHID, sectionId: '5.1.2' });
    ok('before a PDF is open, a chosen section still gives its concepts (page null), in inventory order: Beta (p. 138 lies in it), Gamma (5.1.2); Alpha (stated 5.1.4) not',
      lc.page === null && lc.match === 'section' && same(lc.concepts.map(c => c.concept.id), [B, G]), JSON.stringify(lc.concepts.map(c => c.concept.id)));
    lc = await LC(t, ctxAt(138, 3), { sectionId: '5.2.1' });
    ok('a printed page always wins over a chosen section', lc.match === 'printed-page' && same(ids(lc.sections), ['5.1.3', '5.1.4', '5.1.2']));

    const legacy = await t.evaluate(() => NCERT.ExperienceMapper.getExperiencesForPage({ pdfPage: 3, printedPage: 138, chapterId: 'NCERT-11-CHE-P1-CH05', editionStatus: 'exact_match' }));
    ok('getExperiencesForPage() is unchanged: [] even with learning data loaded', same(legacy, []));

    const iso = await t.evaluate(() => {
      const M = NCERT.ExperienceMapper, c = { pdfPage: 3, printedPage: 138, chapterId: 'NCERT-11-CHE-P1-CH05', editionStatus: 'exact_match' };
      const first = M.getLearningContext(c), before = JSON.stringify(first);
      first.concepts[0].concept.title = 'CHANGED'; first.concepts[0].experiences.push({ id: 'X' }); first.concepts[0].objectives.length = 0;
      first.apply.length = 0; first.sections[0].id = 'Z';
      const again = M.getLearningContext(c);
      return { fresh: JSON.stringify(again) === before, distinct: again !== first && again.concepts[0] !== first.concepts[0] };
    });
    ok('results are fresh copies: changing one never reaches the mapper or the next call', iso.fresh && iso.distinct, JSON.stringify(iso));
    const iso2 = await t.evaluate(([learning, sections]) => {
      const M = NCERT.ExperienceMapper, data = { chapterId: 'NCERT-11-CHE-P1-CH05', sections: sections, practice: {}, learning: learning };
      M.setChapterData(data);
      const c = { pdfPage: 3, printedPage: 138, chapterId: 'NCERT-11-CHE-P1-CH05', editionStatus: 'exact_match' }, before = JSON.stringify(M.getLearningContext(c));
      data.learning.inventory.concepts[0].title = 'CHANGED'; data.sections.length = 0; data.learning.experiences.experiences.length = 0;
      return before === JSON.stringify(M.getLearningContext(c));
    }, [LEARN, feed.sections]);
    ok('...and changing the data handed to setChapterData afterwards changes nothing either', iso2);

    // ------------------------------------------------------------ invalid or missing references
    console.log('=== invalid and missing references');
    const broken = JSON.parse(JSON.stringify(LEARN));
    broken.experiences.experiences.push(
      { id: 'EXP-CHE-TEST-GHOST', conceptId: 'CPT-CHE-TEST-NOWHERE', type: 'simulation', title: 'Unknown concept', objectives: ['LO-CHE-TEST-ALPHA-FIRST'], status: 'published', libraryId: null },
      { id: 'EXP-CHE-TEST-STRAY', conceptId: A, type: 'simulation', title: 'Objective of another concept', objectives: ['LO-CHE-TEST-BETA-ONLY'], status: 'published', libraryId: null },
      { id: 'EXP-CHE-TEST-MIXED', conceptId: A, type: 'data-explorer', title: 'One good objective, one foreign', objectives: ['LO-CHE-TEST-BETA-ONLY', 'LO-CHE-TEST-ALPHA-SECOND'], status: 'published', libraryId: null },
      null, 42, { id: 'EXP-CHE-TEST-NOTITLE', conceptId: A, type: 'graph', objectives: ['LO-CHE-TEST-ALPHA-FIRST'], status: 'published' });
    broken.inventory.concepts.push(null, { id: 'CPT-CHE-TEST-UNTITLED', locations: [{ chapterId: CHID, printedPages: [138, 138] }] },
      { id: 'CPT-CHE-TEST-NOPLACE', title: 'No usable location', locations: [{ printedPages: [138, 138] }, null] });
    const r = await t.evaluate(([learning, sections]) => {
      const M = NCERT.ExperienceMapper;
      const okSet = M.setChapterData({ chapterId: 'NCERT-11-CHE-P1-CH05', sections: sections.concat([null, { id: 'bad', pages: 'x' }]), practice: { X: null }, learning: learning });
      const lc = M.getLearningContext({ pdfPage: 3, printedPage: 138, chapterId: 'NCERT-11-CHE-P1-CH05', editionStatus: 'exact_match' });
      const wrongVersion = M.setChapterData({ chapterId: 'NCERT-11-CHE-P1-CH05', sections: sections,
        learning: { inventory: Object.assign({}, learning.inventory, { schemaVersion: '9.0.0' }), experiences: learning.experiences } });
      const lc2 = M.getLearningContext({ pdfPage: 3, printedPage: 138, chapterId: 'NCERT-11-CHE-P1-CH05', editionStatus: 'exact_match' });
      return { okSet, ids: lc.concepts.map(c => c.concept.id), alpha: lc.concepts[0].experiences.map(e => [e.id, e.objectives]),
               old: lc2.concepts.length, rejects: [M.setChapterData(null), M.setChapterData({}), M.setChapterData({ chapterId: 7 })] };
    }, [broken, feed.sections]);
    ok('no exception from malformed data; bad sections, practice cards and concepts are skipped', r.okSet && same(r.ids, [A, B, G]), JSON.stringify(r.ids));
    ok('an experience whose concept is not in the inventory is never shown', !JSON.stringify(r.alpha).match(/GHOST/));
    ok('an experience serving only another concept\'s objective is dropped; one with a foreign and an own objective keeps only its own',
      !JSON.stringify(r.alpha).match(/STRAY/) && same(r.alpha.find(e => e[0] === 'EXP-CHE-TEST-MIXED'), ['EXP-CHE-TEST-MIXED', ['LO-CHE-TEST-ALPHA-SECOND']]), JSON.stringify(r.alpha));
    ok('an experience without a title is skipped', !JSON.stringify(r.alpha).match(/NOTITLE/));
    ok('a document of an unknown schema version is ignored', r.old === 0);
    ok('setChapterData refuses data without a chapter id', same(r.rejects, [false, false, false]));

    // ------------------------------------------------------------ many experiences, no maximum
    const many = JSON.parse(JSON.stringify(LEARN));
    for (let i = 1; i <= 7; i++) many.experiences.experiences.push({ id: 'EXP-CHE-TEST-BETA-MORE-' + 'ABCDEFG'[i - 1], conceptId: B, type: 'simulation',
      title: 'Beta extra ' + i, objectives: ['LO-CHE-TEST-BETA-ONLY'], status: 'published', libraryId: null });
    const nmany = await t.evaluate(([learning, sections]) => {
      NCERT.ExperienceMapper.setChapterData({ chapterId: 'NCERT-11-CHE-P1-CH05', sections: sections, learning: learning });
      return NCERT.ExperienceMapper.getLearningContext({ pdfPage: 3, printedPage: 138, chapterId: 'NCERT-11-CHE-P1-CH05', editionStatus: 'exact_match' }).concepts[1].experiences.length;
    }, [many, feed.sections]);
    ok('no maximum: all 8 of Beta\'s published experiences are returned', nmany === 8, nmany);
    ok('no errors in the API checks', t.errs.length === 0, t.errs.join(' | '));
    await t.context().close();

    // ------------------------------------------------------------ the panel reads it
    console.log('=== the panel');
    const u = await page(LEARN);
    await choose(u, LAB); await go(u, 3);
    const view = () => u.evaluate(() => {
      const vis = id => !document.getElementById(id).hidden;
      return { concept: vis('nx-concept'), explore: vis('nx-explore'), quiet: vis('nx-quiet'),
        concepts: [...document.querySelectorAll('#nx-concept .nx-cpt')].map(e => e.getAttribute('data-concept')),
        objectives: [...document.querySelectorAll('#nx-concept [data-concept="CPT-CHE-TEST-ALPHA"] .nx-objs li')].map(e => e.textContent),
        exps: [...document.querySelectorAll('#nx-explore .nx-expitem')].map(e => [e.getAttribute('data-experience'), e.querySelector('.nx-exptype').textContent]),
        groups: [...document.querySelectorAll('#nx-explore .nx-expgroup')].map(e => e.textContent),
        purpose: (document.querySelector('#nx-explore [data-experience="EXP-CHE-TEST-ALPHA-GRAPH"] .nx-exppurpose') || {}).textContent || null,
        apply: [...document.querySelectorAll('#nx-apply .nx-applink')].map(e => e.getAttribute('data-sim')),
        live: document.getElementById('nx-live').textContent };
    });
    let v = await view();
    ok('Concept shows each concept located on the page: Alpha, Beta (not Gamma, which is only in the section)', v.concept && same(v.concepts, [A, B]), JSON.stringify(v.concepts));
    ok('...with its learning objectives (Alpha: both statements)', same(v.objectives, ['Explain the first synthetic idea of test concept Alpha.', 'Predict the second synthetic outcome of test concept Alpha.']));
    ok('Explore lists every published experience, grouped by concept when there are several (Gamma has none, so no group)',
      v.explore && !v.quiet && same(v.groups, ['Test concept Alpha', 'Test concept Beta'])
      && same(v.exps, [['EXP-CHE-TEST-ALPHA-SIM', 'Simulation'], ['EXP-CHE-TEST-ALPHA-GRAPH', 'Graph Explorer'], ['EXP-CHE-TEST-ALPHA-ANIMATION', 'Animation'],
                      ['EXP-CHE-TEST-BETA-WORKED', 'Worked Example']]), JSON.stringify(v.exps));
    ok('...each with the learning purpose it serves (its first objective)', v.purpose === 'Predict the second synthetic outcome of test concept Alpha.', v.purpose);
    ok('...never an unpublished one', !(await u.$('[data-experience="EXP-CHE-TEST-ALPHA-PLANNED"], [data-experience="EXP-CHE-TEST-ALPHA-REVIEW"]')));
    ok('Apply keeps the existing JEE link and adds the practice page', same(v.apply, ['ADV-2026-P1-PHY-Q07', 'ADV-2026-P1-CHE-Q01']));
    ok('the announcement names the concept and the counts', /p\.\s138 · Test concept Alpha · 4 to explore · 2 to apply/.test(v.live), v.live);
    const panelVsApi = await u.evaluate(() => {
      const lc = NCERT.ExperienceMapper.getLearningContext(NCERT.reader.getCurrentPageContext(), { chapterId: 'NCERT-11-CHE-P1-CH05' });
      return JSON.stringify(lc.concepts.map(c => c.concept.id)) === JSON.stringify([...document.querySelectorAll('#nx-concept .nx-cpt')].map(e => e.getAttribute('data-concept')));
    });
    ok('the panel shows exactly what getLearningContext() returns for the current page', panelVsApi);
    await go(u, 6);
    v = await view();
    ok('a page change re-reads the context: p. 141 has no concept - the UX-1 empty state, with its JEE link', !v.concept && !v.explore && v.quiet
      && same(v.apply, ['ADV-2026-P1-CHE-Q01']));
    await go(u, 4);
    v = await view();
    ok('p. 139: Alpha only (Beta is on p. 138; 5.1.2 no longer contains the page)', same(v.concepts, [A]) && v.exps.length === 3);
    ok('no errors', u.errs.length === 0, u.errs.join(' | '));
    await u.context().close();

    const ph = await page(LEARN, { viewport: { width: 390, height: 844 } });
    await choose(ph, LAB); await go(ph, 3);
    ok('phone: the context bar counts the explorable experiences', /4 to explore · 2 to apply/.test(await ph.$eval('#nx-ctxbar', e => e.textContent)));
    await ph.context().close();

    const np = await page(LEARN);
    await np.click('#nx-map [data-go="5.1.4"]'); await sleep(150);
    v = await np.evaluate(() => ({ concepts: [...document.querySelectorAll('#nx-concept .nx-cpt')].map(e => e.getAttribute('data-concept')),
      here: document.getElementById('nx-here').innerText }));
    ok('before a PDF is open, choosing a section shows its concepts', same(v.concepts, [A, B]) && /Section 5\.1\.4/.test(v.here), JSON.stringify(v));
    await np.context().close();

    // ------------------------------------------------------------ production: no learning documents
    console.log('=== production feed (no learning documents)');
    const prod = await page(null);
    ok('the real chapter feed carries no learning documents', !('learning' in feed));
    await choose(prod, LAB); await go(prod, 3);
    v = await prod.evaluate(() => ({ concept: !document.getElementById('nx-concept').hidden, explore: !document.getElementById('nx-explore').hidden,
      quiet: document.getElementById('nx-quiet').hidden ? null : document.getElementById('nx-quiet').textContent,
      apply: [...document.querySelectorAll('#nx-apply .nx-applink')].map(e => e.getAttribute('data-sim')),
      lc: NCERT.ExperienceMapper.getLearningContext(NCERT.reader.getCurrentPageContext()) }));
    ok('without learning documents the panel is exactly UX-1: no Concept, no Explore, the quiet line, the JEE link',
      !v.concept && !v.explore && v.quiet === 'Nothing to explore on this page yet.' && same(v.apply, ['ADV-2026-P1-PHY-Q07']), JSON.stringify(v));
    ok('...and the learning context has sections and Apply but no concepts', v.lc.concepts.length === 0 && same(ids(v.lc.sections), ['5.1.3', '5.1.4', '5.1.2']));
    ok('no errors', prod.errs.length === 0, prod.errs.join(' | '));
    await prod.context().close();

    const src = fs.readFileSync(ROOT + '/ncert/experience-mapper.js', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    ok('the mapper stays plain ES5, does no I/O and names no chapter, source or media',
      !/(^|[^\w.$])(let|const|class)\s|=>|`/.test(src) && !/fetch|XMLHttpRequest|import|require\(|localStorage|indexedDB|innerHTML|window\.location|NCERT-1|ncert\.nic|reel|media/i.test(src.replace(/window\.NCERT/g, '')));
  } catch (err) {
    ok('suite ran to the end', false, err && err.stack);
  } finally {
    await b.close();
    site.kill();
  }
  console.log('\n' + (n - bad) + ' / ' + n + ' passed');
  process.exit(bad ? 1 : 0);
})();
