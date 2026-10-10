/* Page-scoped mapping contract (NCERT Explorer MVP, owner rule 2026-10-10):
   the page panel shows ONLY resources explicitly mapped to the printed page being read.
   Pure Node: loads the ES5 mapper with a window stub and the real Chapter 5 feed. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = process.env.PRAYOGX_ROOT || path.resolve(__dirname, '..');
const ID = 'NCERT-11-CHE-P1-CH05';
const feed = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/ncert', ID + '.json'), 'utf8'));
const win = {}; vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'ncert/experience-mapper.js'), 'utf8'), { window: win });
const M = win.NCERT.ExperienceMapper;
let n = 0, bad = 0;
const ok = (l, c, x) => { n++; if (!c) bad++; console.log((c ? 'PASS  ' : 'FAIL  ') + l + (x !== undefined ? '   ' + x : '')); };

const practice = {}, pages = {};
feed.simulations.forEach(c => { if (c.kind === 'concept') pages[c.id] = { title: c.title, path: c.path };
  else practice[c.id] = { title: c.title, label: c.id }; });
const load = pageMap => M.setChapterData({ chapterId: ID, sections: feed.sections, practice, pages, pageMap });
const at = p => M.getLearningContext({ pdfPage: p - 135, printedPage: p, chapterId: ID, editionStatus: 'exact_match' }, {});
const ids = lc => ({ u: lc.understand.map(x => x.libraryId), a: lc.apply.map(x => x.libraryId) });
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

ok('feed carries an explicit pageMap', feed.pageMap && Object.keys(feed.pageMap).length > 0);
load(feed.pageMap);

// 1. every mapped page shows exactly its mapped, live resources - nothing else
let all = true;
Object.keys(feed.pageMap).forEach(k => { const r = ids(at(+k)), m = feed.pageMap[k];
  if (!eq(r.u, m.understand) || !eq(r.a, m.apply)) { all = false; console.log('   mismatch p.' + k, JSON.stringify(r), JSON.stringify(m)); } });
ok('every mapped page shows exactly its mapped resources', all);

// 2. same section, different page: the page decides, not the section
const s522 = feed.sections.find(s => s.id === '5.2.2');
ok('p.143 and p.145 share section 5.2.2 but differ', !eq(ids(at(143)), ids(at(145))) && s522.pages[0] <= 143 && 145 <= s522.pages[1]);
ok('CALORIMETER-01 is not on p.143 (section 5.2.2 lists it, the page map does not)',
   s522.understand.indexOf('CON-CHE-CALORIMETER-01') >= 0 && ids(at(143)).u.indexOf('CON-CHE-CALORIMETER-01') < 0);
ok('CALORIMETER-01 is on p.144', ids(at(144)).u.indexOf('CON-CHE-CALORIMETER-01') >= 0);

// 3. unmapped pages show nothing, even inside a section that links resources
ok('p.147 (no mapping) shows nothing', eq(ids(at(147)), { u: [], a: [] }));
ok('p.137 (no mapping) shows nothing', eq(ids(at(137)), { u: [], a: [] }));
ok('p.147 shows no concept experiences either', at(147).concepts.every(c => c.experiences.length === 0));

// 4. chapter-wide leakage: a resource appears only on its own pages
const where = {};
Object.keys(feed.pageMap).forEach(k => feed.pageMap[k].understand.concat(feed.pageMap[k].apply).forEach(i => (where[i] = where[i] || []).push(+k)));
let leak = false;
for (let p = 136; p <= 167; p++) { const r = ids(at(p));
  r.u.concat(r.a).forEach(i => { if (!(where[i] || []).includes(p)) leak = true; }); }
ok('across p.136-167 no resource appears off its mapped pages', !leak);

// 5. page changes refresh: results are fresh objects and independent
const a = at(144), b = at(146);
ok('different pages give different results', !eq(ids(a), ids(b)));
a.understand.push({ libraryId: 'X' });
ok('results are independent copies', ids(at(144)).u.indexOf('X') < 0);

// 6. a chosen section (no printed page) still works as the fallback when the PDF has no page numbers
const sec = M.getLearningContext(null, { sectionId: '5.3', chapterId: ID });
ok('no printed page: the chosen section is the fallback', sec && sec.match === 'section');

// 7. a chapter without a pageMap keeps the previous section behaviour (backward compatible)
load(null);
ok('without a pageMap the section mapping still applies', ids(at(143)).u.indexOf('CON-CHE-CALORIMETER-01') >= 0);
load(feed.pageMap);

// 8. malformed pageMap entries are ignored, never trusted
load({ '143': { understand: [7, null, 'CON-CHE-CALORIMETER-01'], apply: 'nope' }, 'abc': { understand: ['CON-CHE-CALORIMETER-01'] } });
ok('malformed pageMap is read defensively', eq(ids(at(143)), { u: ['CON-CHE-CALORIMETER-01'], a: [] }) && eq(ids(at(144)), { u: [], a: [] }));

console.log('\n' + (n - bad) + '/' + n + ' passed'); process.exit(bad ? 1 : 0);
