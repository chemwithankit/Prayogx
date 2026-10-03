/* ==========================================================================
   PrayogX - ExperienceMapper (the seam between reading and experiences)

     PDF reader -> current page context -> ExperienceMapper -> experience(s)

   The reader says WHERE the student is; this module will decide WHAT learning
   experiences belong there. Neither knows the other's internals: the reader
   never decides which experiences exist, and the mapper never touches a PDF.

   Input: a page context, exactly as the reader publishes it
     { pdfPage:       1-based PDF page,
       printedPage:   the book's printed page number, or null if unknown,
       chapterId:     the open chapter, e.g. "NCERT-11-CHE-P1-CH05",
       editionStatus: "exact_match" | "unverified" | "unavailable" | null }

   Output: an array of experiences. Today it is always empty: no mappings exist
   yet. They will be added deliberately, and should be concept-aware (section ->
   concept -> learning objective -> experience) and edition-aware (only trust
   printed pages when the edition is known), not a bare page -> simulation table.
   The source here is NCERT, but nothing in this contract is NCERT-specific.

   Rules: never mutates the context, never fetches, never renders, never launches.
   Plain ES5, attached to the existing window.NCERT namespace.
   ========================================================================== */
(function () {
  "use strict";

  var ExperienceMapper = {
    /* The experiences for the page a student is on. Always a new array. */
    getExperiencesForPage: function (context) {
      if (!context || typeof context !== "object") return [];
      return [];
    }
  };

  var api = window.NCERT || {};
  api.ExperienceMapper = ExperienceMapper;
  window.NCERT = api;
})();
