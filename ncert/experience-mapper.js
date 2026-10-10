/* ==========================================================================
   PrayogX - ExperienceMapper (the seam between reading and experiences)

     PDF reader -> page context -> ExperienceMapper -> learning context -> panel

   The reader says WHERE the student is; this module says WHAT there is to learn
   there. Neither knows the other's internals: the reader never decides which
   experiences exist, and the mapper never touches a PDF.

   Page context (from NCERT.reader.getCurrentPageContext()):
     { pdfPage, printedPage (or null), chapterId, editionStatus }

   getLearningContext(context [, options]) - the companion contract (docs/NCERT_UX.md):

     page -> printed page / section -> concepts -> their objectives
          -> their PUBLISHED experiences -> Apply

     returns null when there is no context and no chosen section, else
     { page:     { pdfPage, printedPage, chapterId, editionStatus } | null,
       match:    "printed-page" | "section" | "none",   how the place was found
       sections: [ { id, number, title } ],
       concepts: [ { concept:     { id, title, description },
                     objectives:  [ { id, statement, verb } ],
                     experiences: [ { id, type, title, objectives, libraryId } ] } ],
       understand: [ { libraryId, title, path } ],          published concept pages of these sections
       apply:    [ { libraryId, title, label } ] }
     options.sectionId: the section to use when the page has no printed number (or
     before a PDF is open); options.chapterId: the chapter when there is no context.
     Every call returns new plain objects; nothing the caller does reaches the data.

   setChapterData(data) - what the chapter controller hands over once per chapter:
     { chapterId, sections: [ { id, number, title, level, pages, understand, apply } ],
       practice: { <libraryId>: { title, label } },
       pages:    { <libraryId>: { title, path } },          the chapter feed's concept cards
       learning: { inventory: <concept inventory, tools/concept_schema.py>,
                   experiences: <experience document, tools/experience_schema.py> } | absent }
     The two learning documents are used as authored - concepts own their objectives,
     experiences point to a concept by conceptId - and are validated by the Python
     contracts when built; here they are only read defensively.

   getExperiencesForPage(context) - the original seam, unchanged: always [].

   Only experiences whose status is "published" are offered; "practice" ones join
   Apply (they are applied, not explored). No ranking, no maximum, no fetching, no
   rendering, no launching. Plain ES5, on the existing window.NCERT namespace.
   ========================================================================== */
(function () {
  "use strict";

  var CHAPTERS = {};           // chapterId -> normalised chapter data
  var HANDS_ON = ["simulation", "virtual-lab", "graph", "data-explorer", "interactive-diagram", "molecular",
                  "animation", "derivation", "worked-example"];          // display order: hands-on modes first

  function isArr(x) { return Object.prototype.toString.call(x) === "[object Array]"; }
  function str(x) { return typeof x === "string" && x.length ? x : null; }
  function num(x) { return typeof x === "number" && isFinite(x) ? x : null; }
  function range(p) { return isArr(p) && p.length === 2 && num(p[0]) !== null && num(p[1]) !== null && p[0] <= p[1] ? [p[0], p[1]] : null; }
  function major(doc) { return doc && typeof doc === "object" ? String(doc.schemaVersion || "").split(".")[0] : ""; }

  /* Read the controller's data into private plain copies. Anything malformed is left out. */
  function normalise(data) {
    var out = { chapterId: str(data.chapterId), sections: [], practice: {}, pages: {}, pageMap: null, concepts: [], byConcept: {} };
    var i, j, s, secs = isArr(data.sections) ? data.sections : [];
    for (i = 0; i < secs.length; i++) {
      s = secs[i] || {};
      if (!str(s.id) || !range(s.pages)) continue;
      out.sections.push({ id: s.id, number: str(s.number) || "", title: str(s.title) || s.id, level: num(s.level) || 1,
                          pages: range(s.pages), understand: isArr(s.understand) ? s.understand.filter(str) : [],
                          apply: isArr(s.apply) ? s.apply.filter(str) : [] });
    }
    // Explicit page map { "<printed page>": { understand: [ids], apply: [ids] } } - null when the chapter has none
    var pm = data.pageMap && typeof data.pageMap === "object" && !isArr(data.pageMap) ? data.pageMap : null;
    if (pm) {
      out.pageMap = {};
      for (var key in pm) if (Object.prototype.hasOwnProperty.call(pm, key) && /^[0-9]+$/.test(key) && pm[key] && typeof pm[key] === "object") {
        out.pageMap[key] = { understand: isArr(pm[key].understand) ? pm[key].understand.filter(str) : [],
                             apply: isArr(pm[key].apply) ? pm[key].apply.filter(str) : [] };
      }
    }
    var pr = data.practice && typeof data.practice === "object" ? data.practice : {};
    for (var id in pr) if (Object.prototype.hasOwnProperty.call(pr, id) && pr[id] && str(pr[id].title)) {
      out.practice[id] = { title: pr[id].title, label: str(pr[id].label) || id };
    }
    var pg = data.pages && typeof data.pages === "object" ? data.pages : {};
    for (var pid in pg) if (Object.prototype.hasOwnProperty.call(pg, pid) && pg[pid] && str(pg[pid].title) && str(pg[pid].path)) {
      out.pages[pid] = { title: pg[pid].title, path: pg[pid].path };
    }
    var learning = data.learning && typeof data.learning === "object" ? data.learning : {};
    var inv = learning.inventory, exp = learning.experiences;
    if (major(inv) === "1" && isArr(inv.concepts)) {
      for (i = 0; i < inv.concepts.length; i++) {
        var c = inv.concepts[i];
        if (!c || !str(c.id) || !str(c.title) || out.byConcept[c.id]) continue;
        var locs = [], objs = [], ls = isArr(c.locations) ? c.locations : [], os = isArr(c.learningObjectives) ? c.learningObjectives : [];
        for (j = 0; j < ls.length; j++) {
          var l = ls[j] || {};
          if (!str(l.chapterId)) continue;
          locs.push({ chapterId: l.chapterId, sectionId: str(l.sectionId), printedPages: range(l.printedPages) });
        }
        for (j = 0; j < os.length; j++) {
          var o = os[j] || {};
          if (str(o.id) && str(o.statement)) objs.push({ id: o.id, statement: o.statement, verb: str(o.verb) });
        }
        var rec = { id: c.id, title: c.title, description: str(c.description), locations: locs, objectives: objs, experiences: [] };
        out.concepts.push(rec);
        out.byConcept[c.id] = rec;
      }
    }
    if (major(exp) === "2" && isArr(exp.experiences)) {
      for (i = 0; i < exp.experiences.length; i++) {
        var e = exp.experiences[i];
        if (!e || !str(e.id) || !str(e.type) || !str(e.title) || e.status !== "published") continue;   // students see published only
        var owner = out.byConcept[e.conceptId];
        if (!owner) continue;                                       // a concept that is not in the inventory
        var mine = {}, keep = [];
        for (j = 0; j < owner.objectives.length; j++) mine[owner.objectives[j].id] = true;
        var eo = isArr(e.objectives) ? e.objectives : [];
        for (j = 0; j < eo.length; j++) if (mine[eo[j]] && keep.indexOf(eo[j]) < 0) keep.push(eo[j]);
        if (!keep.length) continue;                                 // serves none of its concept's objectives
        owner.experiences.push({ id: e.id, type: e.type, title: e.title, objectives: keep, libraryId: str(e.libraryId) });
      }
    }
    return out;
  }

  /* The sections containing a printed page: the most specific (a parent is dropped when one
     of its subsections also contains it), deeper first, then the one starting on the page. */
  function sectionsAt(ch, page) {
    var hit = [], out = [], i, j;
    for (i = 0; i < ch.sections.length; i++) if (ch.sections[i].pages[0] <= page && page <= ch.sections[i].pages[1]) hit.push(ch.sections[i]);
    function within(child, parent) {
      if (child.id === parent.id || child.level <= parent.level || child.id.indexOf(parent.id) !== 0) return false;
      var c = child.id.charAt(parent.id.length);
      return c === "." || (c >= "a" && c <= "z");
    }
    for (i = 0; i < hit.length; i++) {
      var parent = false;
      for (j = 0; j < hit.length; j++) if (within(hit[j], hit[i])) parent = true;
      if (!parent) out.push(hit[i]);
    }
    out.sort(function (a, b) {
      if (b.level !== a.level) return b.level - a.level;
      var as = a.pages[0] === page ? 0 : 1, bs = b.pages[0] === page ? 0 : 1;
      if (as !== bs) return as - bs;
      return ch.sections.indexOf(a) - ch.sections.indexOf(b);
    });
    return out;
  }

  /* Concepts located here: a location in this chapter whose printed pages contain the page
     (exact, first), or whose section is one of the sections found (by section). */
  function conceptsFor(ch, chapterId, page, sections) {
    var ids = {}, exact = [], bySection = [], i, j;
    for (i = 0; i < sections.length; i++) ids[sections[i].id] = sections[i];
    for (i = 0; i < ch.concepts.length; i++) {
      var c = ch.concepts[i], how = 0;
      for (j = 0; j < c.locations.length; j++) {
        var l = c.locations[j];
        if (l.chapterId !== chapterId) continue;
        if (page !== null && l.printedPages) { if (l.printedPages[0] <= page && page <= l.printedPages[1]) how = 2; }
        else if (l.sectionId && ids[l.sectionId] && how < 1) how = 1;
        else if (page === null && !l.sectionId && l.printedPages && how < 1) {   // a stated section is the authority
          for (var k = 0; k < sections.length; k++) {
            var r = sections[k].pages;
            if (l.printedPages[0] <= r[1] && r[0] <= l.printedPages[1]) how = 1;
          }
        }
      }
      if (how === 2) exact.push(c); else if (how === 1) bySection.push(c);
    }
    return exact.concat(bySection);
  }

  function copyConcept(c) {
    var objs = [], exps = [], i;
    for (i = 0; i < c.objectives.length; i++) objs.push({ id: c.objectives[i].id, statement: c.objectives[i].statement, verb: c.objectives[i].verb });
    for (i = 0; i < c.experiences.length; i++) {
      var e = c.experiences[i];
      if (e.type === "practice") continue;                       // applied, not explored: listed under Apply
      exps.push({ id: e.id, type: e.type, title: e.title, objectives: e.objectives.slice(), libraryId: e.libraryId });
    }
    return { concept: { id: c.id, title: c.title, description: c.description }, objectives: objs, experiences: exps };
  }

  function stableSort(list, cmp) {
    var tagged = list.map(function (x, i) { return { x: x, i: i }; });
    tagged.sort(function (a, b) { return cmp(a.x, b.x) || a.i - b.i; });
    return tagged.map(function (t) { return t.x; });
  }

  var ExperienceMapper = {
    /* The original seam: the experiences for a page. Unchanged - always a new, empty array. */
    getExperiencesForPage: function (context) {
      if (!context || typeof context !== "object") return [];
      return [];
    },

    /* The chapter controller's data, once per chapter (see the header). */
    setChapterData: function (data) {
      if (!data || typeof data !== "object" || !str(data.chapterId)) return false;
      CHAPTERS[data.chapterId] = normalise(data);
      return true;
    },

    /* Where the student is and what there is to learn there (see the header). */
    getLearningContext: function (context, options) {
      options = options && typeof options === "object" ? options : {};
      var ctx = context && typeof context === "object" && num(context.pdfPage) !== null && str(context.chapterId) ? context : null;
      var chapterId = ctx ? ctx.chapterId : str(options.chapterId);
      var sectionId = str(options.sectionId);
      if (!ctx && !sectionId) return null;
      var page = ctx ? { pdfPage: ctx.pdfPage, printedPage: num(ctx.printedPage), chapterId: ctx.chapterId,
                         editionStatus: str(ctx.editionStatus) } : null;
      var out = { page: page, match: "none", sections: [], concepts: [], understand: [], apply: [] };
      var ch = chapterId ? CHAPTERS[chapterId] : null;
      if (!ch) return out;

      var printed = page ? page.printedPage : null, sections = [], i, j;
      if (printed !== null) { out.match = "printed-page"; sections = sectionsAt(ch, printed); }
      else if (sectionId) {
        for (i = 0; i < ch.sections.length; i++) if (ch.sections[i].id === sectionId) sections = [ch.sections[i]];
        if (sections.length) out.match = "section";
      }
      if (out.match === "none") return out;
      for (i = 0; i < sections.length; i++) out.sections.push({ id: sections[i].id, number: sections[i].number, title: sections[i].title });

      var strict = printed !== null && !!ch.pageMap;               // page-scoped: only what is mapped to THIS page
      var found = conceptsFor(ch, chapterId, printed, sections);
      if (strict) found = found.filter(function (c) {
        return c.locations.some(function (l) { return l.chapterId === chapterId && l.printedPages && l.printedPages[0] <= printed && printed <= l.printedPages[1]; });
      });
      for (i = 0; i < found.length; i++) out.concepts.push(copyConcept(found[i]));
      for (i = 0; i < out.concepts.length; i++) out.concepts[i].experiences = stableSort(out.concepts[i].experiences, function (a, b) {
        var ra = HANDS_ON.indexOf(a.type), rb = HANDS_ON.indexOf(b.type);
        return (ra < 0 ? 99 : ra) - (rb < 0 ? 99 : rb);
      });

      // Understand: the sections' published concept pages (the feed lists only published ones)
      var had = {}, here = strict ? (ch.pageMap[String(printed)] || { understand: [], apply: [] }) : null;
      var uids = [];
      if (strict) uids = here.understand;
      else for (i = 0; i < sections.length; i++) for (j = 0; j < sections[i].understand.length; j++) uids.push(sections[i].understand[j]);
      for (i = 0; i < uids.length; i++) {
        var uid = uids[i], pc = ch.pages[uid];
        if (!pc || had[uid]) continue;
        had[uid] = true;
        out.understand.push({ libraryId: uid, title: pc.title, path: pc.path });
      }

      // Apply: the sections' JEE practice links, then published practice experiences of these concepts
      var seen = {};
      function add(id, fallback) {
        if (!id || seen[id]) return;
        var card = ch.practice[id];
        if (!card && !fallback) return;
        seen[id] = true;
        out.apply.push({ libraryId: id, title: card ? card.title : fallback, label: card ? card.label : id });
      }
      if (strict) for (i = 0; i < here.apply.length; i++) add(here.apply[i], null);
      else for (i = 0; i < sections.length; i++) for (j = 0; j < sections[i].apply.length; j++) add(sections[i].apply[j], null);
      for (i = 0; i < found.length; i++) for (j = 0; j < found[i].experiences.length; j++) {
        var x = found[i].experiences[j];
        if (x.type === "practice" && x.libraryId) add(x.libraryId, x.title);
      }
      return out;
    }
  };

  var api = window.NCERT || {};
  api.ExperienceMapper = ExperienceMapper;
  window.NCERT = api;
})();
