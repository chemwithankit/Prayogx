/* The media source context (tools/reel-maker/context.js), without a browser: a JEE question's context (unchanged), an
   NCERT concept's (class, subject, chapter, its own page; no JEE field), missing metadata failing by name, the caption,
   the YouTube metadata agreeing with it, and the question-reel generator refusing concepts.
   Run:  node tests/test_media_context.js                                                                          */
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const ROOT = process.env.PRAYOGX_ROOT || path.resolve(__dirname, '..');
const C = require(path.join(ROOT, 'tools', 'reel-maker', 'context.js'));
let n = 0, bad = 0;
const ok = (l, c, x) => { n++; if (!c) bad++; console.log((c ? 'PASS  ' : 'FAIL  ') + l + (!c && x !== undefined ? '   ' + String(typeof x === 'string' ? x : JSON.stringify(x)).slice(0, 300) : '')); };
const throws = (f, re) => { try { f(); return false; } catch (e) { return re.test(e.message); } };

const SIMS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'manifest.json'), 'utf8')).simulations;
const CID = 'CON-CHE-DELTA-U-VS-DELTA-H', con = SIMS.find(s => s.id === CID);
const jees = SIMS.filter(s => s.kind !== 'concept' && !/^CON-/.test(s.id));

console.log('=== JEE questions: exactly the context question-simulation-v1 always drew');
const sameAsBefore = e => {
  const x = C.reelContext(e), chip = ['PAPER ' + e.paperNumber, e.subject.toUpperCase(), 'Q.' + e.questionNumber].join('  ·  ');
  return x.kind === 'question' && x.template === 'question-simulation-v1' && x.big === e.exam.toUpperCase() && x.year === String(e.year) && x.chip === chip
    && x.tag === e.exam.toUpperCase() + ' ' + e.year + '  ·  ' + chip && x.foot === 'Paper ' + e.paperNumber + ' · ' + e.subject + ' · Q.' + e.questionNumber
    && x.captionLine === 'JEE Advanced ' + e.year + ' · Paper ' + e.paperNumber + ' · ' + e.subject + ' · Q.' + e.questionNumber && x.link === 'https://prayogx.co.in/s/' + e.id + '/';
};
ok('every one of the ' + jees.length + ' JEE entries gets the exam, year, paper and question strings it always had', jees.length >= 50 && jees.every(sameAsBefore), jees.filter(e => !sameAsBefore(e)).map(e => e.id));
const q = jees.find(s => s.id === 'ADV-2026-P2-PHY-Q03');
for (const f of ['exam', 'year', 'paperNumber', 'questionNumber']) {
  const e = Object.assign({}, q); delete e[f];
  ok('a JEE entry without ' + f + ' is refused by name (no silent fallback)', throws(() => C.reelContext(e), new RegExp(f)));
}

console.log('=== NCERT concepts');
const x = C.reelContext(con);
ok('a concept gets kind concept and the concept explainer, never a question reel template', x.kind === 'concept' && x.template === 'concept-explainer-v1');
ok('...its context is the NCERT book from the registry: class, subject, chapter',
  x.big === 'NCERT' && x.year === 'CLASS 11' && x.chip === 'CHEMISTRY  ·  CH 5' && x.foot === 'NCERT Class 11 · Chemistry · Ch 5'
  && x.captionLine === 'NCERT Class 11 · Chemistry · Chapter 5 Thermodynamics · Two calorimeters, one reaction', x);
ok('...and its link is its own published page', x.link === 'https://prayogx.co.in/simulations/concepts/chemistry/con-che-delta-u-vs-delta-h/'
  && con.status !== 'draft' && fs.existsSync(path.join(ROOT, con.folder, 'index.html')));
ok('a concept needs no JEE field: no exam, year, paper or question anywhere in its context',
  ['exam', 'year', 'paperNumber', 'questionNumber'].every(f => con[f] === undefined) && !/JEE|PAPER \d|Q\.\d|2026/.test(JSON.stringify(x)), x);
for (const f of ['subject', 'chapter', 'folder']) {
  const e = Object.assign({}, con); delete e[f];
  ok('a concept without ' + f + ' is refused by name', throws(() => C.reelContext(e), new RegExp(f)));
}
ok('a concept without source.title or source.chapter is refused by name',
  throws(() => C.reelContext(Object.assign({}, con, { source: Object.assign({}, con.source, { title: '' }) })), /source\.title/)
  && throws(() => C.reelContext(Object.assign({}, con, { source: Object.assign({}, con.source, { chapter: undefined }) })), /source\.chapter/));
ok('...and one whose source does not name the class or the chapter number is refused, never guessed',
  throws(() => C.reelContext(Object.assign({}, con, { source: Object.assign({}, con.source, { title: 'Chemistry Part I' }) })), /NCERT class/)
  && throws(() => C.reelContext(Object.assign({}, con, { source: Object.assign({}, con.source, { chapter: 'Thermodynamics' }) })), /chapter number/));
const longest = SIMS.reduce((a, e) => Math.max(a, (e.subject || '').length), 0);
ok('the concept chip has no chapter name, so it stays short for any chapter (safe area): ' + JSON.stringify(x.chip), x.chip.length <= longest + 12 && x.chip.indexOf(con.chapter.toUpperCase()) < 0);
ok('roman and arabic classes both read (XI, XII, 11)', C.ncertClass('Physics Part I, Class XII') === '12' && C.ncertClass('Class 11 Biology') === '11' && C.ncertClass('Class XI') === '11');

console.log('=== the caption');
const spec = { caption: { hook: 'Hook line', body: 'Body text', cta: 'Try it on prayogx.co.in', hashtags: ['#A', '#B'] } };
const before = e => [spec.caption.hook, '', spec.caption.body, '', 'JEE Advanced ' + e.year + ' · Paper ' + e.paperNumber + ' · ' + e.subject + ' · Q.' + e.questionNumber, '', spec.caption.cta, '', '#A #B']
  .join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
ok('a JEE caption is byte-identical to the one generate-reel.js always wrote', C.captionText(spec, q, C.reelContext(q)) === before(q));
const cc = C.captionText(spec, con, x);
ok('a concept caption carries the NCERT source line and its page link, and no JEE claim',
  cc.indexOf(x.captionLine) >= 0 && cc.indexOf(x.link) >= 0 && !/JEE|Paper \d|Q\.\d/.test(cc), cc);
ok('a narrated caption ends with the voice disclosure, for both kinds', C.captionText(spec, con, x, { disclosureText: 'AI voice.' }).trim().endsWith('AI voice.'));

console.log('=== YouTube metadata agrees with the reel context (tools/youtube_publish.py)');
const py = spawnSync('python3', ['-c', 'import sys, json; sys.path.insert(0, "tools"); import youtube_publish as Y; print(json.dumps(Y.build_metadata("' + CID + '")))'], { cwd: ROOT, encoding: 'utf8' });
const md = py.status === 0 ? JSON.parse(py.stdout) : null;
ok('the YouTube link and source line are the reel\'s own (one concept context, two languages)',
  md && md.link === x.link && md.description.indexOf('NCERT Class 11 Chemistry, Chapter 5 Thermodynamics') >= 0 && /\| NCERT Class 11 Chemistry$/.test(md.title), py.stderr || md);

console.log('=== question reels refuse concepts');
const r = spawnSync('node', [path.join(ROOT, 'tools', 'reel-maker', 'generate-reel.js'), CID, '--draft'], { cwd: ROOT, encoding: 'utf8', timeout: 60000 });
ok('generate-reel.js refuses an NCERT concept before recording and points to the concept explainer',
  r.status === 2 && /use tools\/reel-maker\/generate-explainer\.js/.test(r.stderr) && !fs.existsSync(path.join(ROOT, 'tools', 'reel-maker', 'reels', CID + '.json')), r.stderr);

console.log('\n' + (n - bad) + ' / ' + n + ' passed');
process.exit(bad ? 1 : 0);
