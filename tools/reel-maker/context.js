/* PrayogX media - what a video says about its source, from the simulation's data/manifest.json entry.

     reelContext(entry)  ->  { kind, template, big, year, chip, tag, foot, badge, captionLine, link }   (plain strings)

   A JEE question (kind "question") shows its exam, year, paper and question number - exactly the strings
   question-simulation-v1 has always drawn (generate-reel.js). An NCERT concept (kind "concept", the CON- IDs) shows
   its book, class, subject and chapter, from the entry's own NCERT source, and never a year, paper or question
   number; concepts are explained by concept explainers (generate-explainer.js), never by question reels.

   Missing metadata is an error naming the field, never a silent fallback to the other kind.
   tools/youtube_publish.py builds the same concept context in Python (ncert_context); the tests compare them. */

const SITE = 'https://prayogx.co.in/';
const ROMAN = { XI: '11', XII: '12', IX: '9', X: '10' };

function need(entry, fields) {
  const miss = fields.filter(f => f.split('.').reduce((o, k) => (o == null ? undefined : o[k]), entry) == null || String(f.split('.').reduce((o, k) => o[k], entry)).trim() === '');
  if (miss.length) throw new Error((entry.id || 'the simulation') + ': the reel needs ' + miss.join(', ') + ' in data/manifest.json');
}

/* "Chemistry Part I, Class XI" -> "11";  "5 Thermodynamics" -> "5" */
function ncertClass(title) { const m = /Class\s+(XII|XI|X|IX|\d{1,2})\b/i.exec(title || ''); return m ? (ROMAN[m[1].toUpperCase()] || m[1]) : null; }
function ncertChapterNo(ch) { const m = /^\s*(\d+)\b/.exec(ch || ''); return m ? m[1] : null; }

function reelContext(entry) {
  const kind = entry.kind === 'concept' || /^CON-/.test(entry.id || '') ? 'concept' : 'question';
  if (kind === 'question') {
    need(entry, ['exam', 'year', 'paperNumber', 'subject', 'questionNumber']);
    const chip = ['PAPER ' + entry.paperNumber, entry.subject.toUpperCase(), 'Q.' + entry.questionNumber].join('  ·  ');
    return { kind: kind, template: 'question-simulation-v1', big: entry.exam.toUpperCase(), year: String(entry.year), chip: chip,
      tag: entry.exam.toUpperCase() + ' ' + entry.year + '  ·  ' + chip, foot: 'Paper ' + entry.paperNumber + ' · ' + entry.subject + ' · Q.' + entry.questionNumber,
      badge: 'JEE', captionLine: 'JEE Advanced ' + entry.year + ' · Paper ' + entry.paperNumber + ' · ' + entry.subject + ' · Q.' + entry.questionNumber,
      link: SITE + 's/' + entry.id + '/' };
  }
  need(entry, ['id', 'subject', 'chapter', 'folder', 'source.title', 'source.chapter']);
  if (!(entry.shortTitle || entry.title)) throw new Error(entry.id + ': the reel needs shortTitle or title in data/manifest.json');
  const cls = ncertClass(entry.source.title), chNo = ncertChapterNo(entry.source.chapter);
  if (!cls) throw new Error(entry.id + ': source.title must name the NCERT class (e.g. "Chemistry Part I, Class XI"), got ' + JSON.stringify(entry.source.title));
  if (!chNo) throw new Error(entry.id + ': source.chapter must start with the chapter number (e.g. "5 Thermodynamics"), got ' + JSON.stringify(entry.source.chapter));
  /* the chip stays short whatever the chapter is called (the safe area); the chapter's name is in the caption line */
  const chip = [entry.subject, 'CH ' + chNo].join('  ·  ').toUpperCase();
  return { kind: kind, template: 'concept-explainer-v1', big: 'NCERT', year: 'CLASS ' + cls, chip: chip,
    tag: 'NCERT CLASS ' + cls + '  ·  ' + chip, foot: 'NCERT Class ' + cls + ' · ' + entry.subject + ' · Ch ' + chNo,
    badge: 'NCERT', captionLine: 'NCERT Class ' + cls + ' · ' + entry.subject + ' · Chapter ' + chNo + ' ' + entry.chapter + ' · ' + (entry.shortTitle || entry.title),
    link: SITE + entry.folder.replace(/^\/+/, '') };
}

/* the reel's caption.txt: the story's hook and body, the source line, the call to action, the hashtags, and a
   narrated reel's AI-voice disclosure. A concept reel also names its page, so the viewer can open it. */
function captionText(spec, entry, ctx, voice) {
  const c = spec.caption || {};
  const disclosure = voice && voice.disclosureText ? ['', voice.disclosureText] : [];
  const where = ctx.kind === 'concept' ? [ctx.captionLine, ctx.link] : [ctx.captionLine];
  return [c.hook, '', c.body, ''].concat(where, ['', c.cta, '', (c.hashtags || []).join(' ')])
    .concat(disclosure).filter(x => x !== undefined).join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
}

module.exports = { reelContext, captionText, ncertClass, ncertChapterNo };
