# NCERT Explorer — UI/UX blueprint

Status: **direction approved, design only** (2026-10-03, at `e97a0ae`; owner decisions in §11). Nothing
here is built. It evolves the existing chapter screen (Phases 2–3B, page context, ExperienceMapper
seam); it does not replace it. Companion to [NCERT.md](NCERT.md) and the contracts in
`tools/concept_schema.py` / `tools/experience_schema.py`.

> **Product:** an interactive learning book. The student reads the source book; interactive
> experiences appear exactly when they are useful. The PDF is the reading layer; experiences are the
> learning layer. Core loop: **read → see what this page is about → explore → interact → observe →
> understand → return to the same page → apply.**

## The UX model

```
NCERT Reader
    ↓
Current Context            the page the student is on (printed page, edition status)
    ↓
Section                    where that page sits in the chapter
    ↓
Concept                    what the page is about
    ↓
Learning Experiences       ways to understand it (zero, one or several per concept)
    ├── Simulation
    ├── Animation
    ├── Virtual Lab
    ├── Graph Explorer
    ├── Data Explorer
    ├── Interactive Diagram
    ├── Molecular
    ├── Derivation
    └── Worked Example
    ↓
Apply
    └── JEE Practice       using it on real questions
```

`practice` experiences (and, for now, the chapter's existing JEE links) appear under **Apply**, never
under Explore. Every other experience type is a learning experience under its concept.

---

## 1. What exists today (the starting point)

| Area | Today | Kept / changes |
|---|---|---|
| Header | PrayogX brand, "NCERT Explorer" kicker, "JEE Questions" link, theme toggle; shares `site/site.css` | kept |
| Chapter route | `#/11/chemistry/part-1/ch05`: breadcrumb, chapter title, facts (pages, sections, edition) | kept; facts move into the panel header on desktop |
| Layout ≥ 960 px | grid: context column ~30 % (PDF source card, section outline) + reader ~70 % | **kept**; the context column becomes the *contextual learning panel* (§3) |
| Layout < 960 px | stacked: reader first, then source card and outline | replaced by the context bar + sheet (§6) |
| Reader | single page, toolbar (« ‹ page/N › » − Fit +), zoom 50–300 %, keyboard, states `no_hosted_pdf → file_selected → validating → loading → ready`, `invalid_file`, `corrupt_pdf`, `unsupported_pdf`, `source_blocked`, `error` | **unchanged**; the experience stage (§5) sits over it, never replaces it |
| PDF source | two-step onboarding (download official PDF, choose it), verification badge, privacy note | kept; collapses once a PDF is open (§3.1) |
| Page context | `NCERT.reader.getCurrentPageContext()`, `onPageChange()`: `{pdfPage, printedPage, chapterId, editionStatus}` | the panel's only input from the reader |
| ExperienceMapper | `getExperiencesForPage(context) → []` | kept, backward compatible; the panel will use the companion `getLearningContext()` (§8) |

## 2. Design principles

1. **The book stays in charge.** The PDF never moves, resizes or reloads because of the panel. Panel
   updates cause no layout shift in the reader.
2. **Concept first, then experiences.** The panel says *what this page is about* before offering
   *ways to learn it*. Experiences sit under their concept, never as a flat list of tools.
3. **Why before what.** Every experience card states the learning purpose it serves ("Show that ΔH
   does not depend on the path"), not just its type.
4. **Everything valid stays reachable.** A concept may have zero, one or many experiences; the UI groups
   and discloses them progressively but never drops one because of a count.
5. **Quiet when there is nothing.** A page with no learning content shows a short, calm state on
   desktop and nothing at all on phones — no filler, no "coming soon" lists.
6. **Always an obvious way back.** Every experience has `← Back to NCERT`, which returns to the same
   page and reading position.
7. **Honest about the source.** When the edition is not verified, the page context is still used, and
   the student is told the match could not be verified.
8. **Same product.** Same tokens, header, typography, cards and subject colours as the library
   (`site.css`, `ncert.css`); no new design system.

## 3. Desktop / tablet landscape (≥ 960 px): the contextual learning panel

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ PRAYOGX  NCERT Explorer                               JEE Questions   ◐ theme │
├──────────────────────────┬───────────────────────────────────────────────────┤
│ Class 11 › Chemistry ›   │ Chapter 5 · Thermodynamics  « ‹ [16]/32 › »  − Fit + │
│ Part I › Ch 5            │                                  Book p. 151 · 100%  │
│ THERMODYNAMICS           │ ┌───────────────────────────────────────────────┐ │
│ ─────────────────────    │ │                                               │ │
│ ON THIS PAGE · p. 151    │ │                                               │ │
│ 5.4 (e) Hess's law of    │ │                 NCERT PDF page                │ │
│ constant heat summation  │ │                                               │ │
│                          │ │                                               │ │
│ CONCEPT                  │ │                                               │ │
│ Hess's law               │ │                                               │ │
│                          │ │                                               │ │
│ EXPLORE                  │ │                                               │ │
│ Show that ΔH does not    │ │                                               │ │
│ depend on the path       │ │                                               │ │
│ ┌──────────────────────┐ │ │                                               │ │
│ │ ◇ VIRTUAL LAB        │ │ │                                               │ │
│ │ The enthalpy         │ │ │                                               │ │
│ │ staircase   Explore ›│ │ │                                               │ │
│ └──────────────────────┘ │ │                                               │ │
│ ┌──────────────────────┐ │ │                                               │ │
│ │ ◇ GRAPH EXPLORER  …  │ │ │                                               │ │
│ └──────────────────────┘ │ │                                               │ │
│ ▸ More ways to explore (3)│ │                                               │ │
│ APPLY                    │ │                                               │ │
│ JEE 2026 P1 · Q13 ›      │ │                                               │ │
│ ─────────────────────    │ └───────────────────────────────────────────────┘ │
│ ▸ Chapter map (19)       │                                                   │
│ ▸ PDF: kech105.pdf ✓     │                                                   │
└──────────────────────────┴───────────────────────────────────────────────────┘
```

Grid as today: panel `minmax(260px, 30%)`, reader the rest. The panel scrolls on its own (sticky,
viewport-tall), so a long PDF page never pushes the panel's content out of view.

### 3.1 Panel anatomy, top to bottom

| Block | Content | Notes |
|---|---|---|
| Identity | compact breadcrumb + chapter title | replaces the hero above the grid once a PDF is open (saves ~180 px); before that the hero stays |
| On this page | printed page + the section(s) containing it | §4.1 for overlaps and missing labels |
| Concept | every concept matched to this page, with an optional one-line description | concepts whose location covers this exact page first; further concepts collapsed under "Also on this page (n)" — collapsed, never dropped |
| Explore | the concept's learning experiences (§3.2), grouped by learning purpose | progressive disclosure, no fixed maximum (§3.3) |
| Apply | JEE practice: today the chapter's existing JEE links for the section(s); later `practice` experiences of the concept | plain list ("JEE 2026 P1 · Q13 ›"), shown only when there is something to apply |
| Chapter map | the existing section outline, collapsed by default; current section highlighted; a section click jumps the PDF to its first printed page | the outline we already have |
| PDF source | collapsed summary "kech105.pdf · ✓ Verified" / "· edition not verified"; expands to today's source card (official link, choose another, privacy) | expanded and at the top while no PDF is open |

### 3.2 Experience card

```
┌──────────────────────────────────┐
│ ◇ VIRTUAL LAB                    │   learning mode (type label + line icon)
│ The enthalpy staircase           │   title
│ Show that ΔH does not depend on  │   learning purpose (the objective it serves), 2 lines max
│ the path taken                   │
│                       Explore ›  │   one action
└──────────────────────────────────┘
```

- A card communicates four things only: **type, title, learning purpose, action.** No duration,
  difficulty, score or badge.
- Type labels (simple line icons in the subject colour, no emoji): Simulation · Animation · Virtual Lab ·
  Graph Explorer · Data Explorer · Interactive Diagram · Molecular · Derivation · Worked Example.
- The whole card is one button (≥ 64 px tall, visible focus ring).
- Only `status: published` experiences appear for students. Others are invisible (a review build may
  show them outlined and labelled, never in production).
- A card linked to a library page (`libraryId`) may carry a small "Also in the JEE library" note; it
  opens the same way.

### 3.3 Many experiences without clutter

No hard cap: zero, one or many experiences per concept are all valid, and none is discarded.

- **Group by learning purpose.** Experiences are grouped under the objective they serve (the concept's
  objective order). When an experience serves several objectives it appears under the first one only.
- **Progressive disclosure.** The first purpose group is open. Further groups collapse into
  "More ways to explore (n)", expandable in place; the choice stays open while the student remains on
  the concept.
- **Order inside a group** comes from structure, not scoring: hands-on modes first (simulation, virtual
  lab, graph explorer, data explorer, interactive diagram, molecular), then animation, then derivation
  and worked example; ties keep inventory order.
- **No ranking metadata.** No "best", "top" or score fields in any contract; prominence follows only
  from the page match (§4.1) and the order above.

## 4. Panel behaviour as the student reads

### 4.1 Page → section → concept

1. On `onPageChange(ctx)`, if `ctx.printedPage` is a number, the sections whose printed range contains
   it are found.
2. **Overlaps** (a boundary page belongs to two sections, e.g. p. 140 ends 5.1.4 and starts 5.2): both
   are listed; the deeper one first, or, at equal depth, the one that starts on this page.
3. Concepts are those with a location in this chapter whose `printedPages` contain the page, or — when a
   location names only a `sectionId` — whose section is among those found.
4. **No printed page** (a PDF without page labels): the panel falls back to the section the student last
   chose in the chapter map, else to the chapter level (concepts listed by section). It says so: "Your PDF
   has no printed page numbers; showing the chosen section."

### 4.2 Update feel

- The panel updates on the **semantic** page-change event only (never on zoom, fit, resize or redraw —
  the page-context contract already guarantees this).
- The "On this page" block crossfades (150 ms); nothing above it moves. Reduced motion: instant.
- Same section and concepts as before → nothing animates (no flicker while turning pages in a section).
- One `aria-live="polite"` line per page change: "Page 151 · Hess's law · 2 to explore".

### 4.3 States of the panel

| Situation | Panel shows |
|---|---|
| No PDF open | Identity, the **PDF source card expanded** (today's two steps), then the chapter map with each section's concepts — the student can explore without the PDF |
| PDF loading / validating | Identity + source card with the reader's progress; the rest unchanged |
| Page with concept(s) and experiences | §3.1 in full |
| Concept(s), no published experience | Concept block + one quiet line: "Nothing to explore on this page yet." + Apply if any |
| No concept on the page (e.g. exercises, summary) | "On this page" + section; quiet line; "Next to explore: Hess's law, p. 151 ›" when a later page has experiences |
| Edition `unverified` or `unavailable` | The same content, matched by printed page, with a visible note under "On this page": **"Your PDF's edition could not be verified — page matching may be approximate."** Never presented as exact |
| No printed page labels | §4.1 step 4: section / chapter fallback, stated |
| Reader error / blocked | Chapter map and concepts remain; the reader shows its own error state (unchanged) |

## 5. Opening an experience: the experience stage

```
NCERT PDF  →  Experience Stage  →  ← Back to NCERT / Esc / browser Back  →  same NCERT page and reading position
```

- **Desktop / tablet landscape:** the experience opens in a focused **stage over the reader area** (the
  70 % column). The PDF stays loaded underneath where practical, so returning restores the same page,
  zoom and scroll without reloading.
- The stage's bar always leads with **`← Back to NCERT`** (with the page, e.g. "p. 151"), then the
  experience title and its type. `Esc` and browser Back do the same; focus returns to the card that
  opened it.
- **The panel enters an experience-focused state:** the concept, the learning purpose being served, the
  concept's other experiences (to move between them directly) and Apply.
- An opened experience is part of the chapter's address, so a shared link can open the chapter at that
  experience, and Back closes it.
- One experience at a time; choosing another replaces it.
- The experience itself is a self-contained page, framed as in the JEE library, so experiences stay
  single-file and unchanged.

```
┌──────────────────────────┬───────────────────────────────────────────────────┐
│ FOCUS · Hess's law       │ ← Back to NCERT · p. 151   The enthalpy staircase  │
│ Learning purpose         │                                       VIRTUAL LAB │
│ Show that ΔH does not    │ ┌───────────────────────────────────────────────┐ │
│ depend on the path       │ │                                               │ │
│ More for this concept    │ │                the experience                 │ │
│ ◇ Graph Explorer: ΔH  ›  │ │                                               │ │
│ APPLY                    │ │                                               │ │
│ JEE 2026 P1 · Q13 ›      │ └───────────────────────────────────────────────┘ │
└──────────────────────────┴───────────────────────────────────────────────────┘
```

## 6. Phones (< 768 px) and tablets in portrait (768–959 px)

- **The reader is the screen.** Toolbar as today (two rows on narrow phones).
- **Context bar, only when there is something useful** — a concept with experiences or Apply practice for
  this page: `p. 151 · Hess's law · 2 to explore  ▴`, pinned above the bottom edge (safe-area aware).
  On a page with nothing to offer there is **no bar**: the PDF stays clean, with no permanent chrome.
- Tapping the bar opens a **bottom sheet** (half height, draggable to full) with the same blocks as the
  desktop panel, in the same order. Swipe down or Back closes it; the PDF does not move.
- The chapter map and PDF source remain reachable without a bar through the reader's existing chapter
  title (tapping "Chapter 5 · Thermodynamics" opens the sheet at the chapter map) — a contextual action,
  not extra chrome.
- Opening an experience: **full-screen stage** with the same `← Back to NCERT · p. 151` bar; closing
  returns to the reader at the same position, sheet closed.
- Tablet portrait uses the same pattern, with the sheet up to 70 % of the height.
- No PDF yet: the onboarding (download → choose) stays the main screen, as today.

## 7. Visual language

- Tokens, header, footer and themes from `site/site.css`; NCERT styles stay `nx-` prefixed in
  `ncert.css`.
- Panel blocks use the existing card style (`--surface-1`, 1 px `--line`, `--radius` 12 px); block
  labels use the existing small-caps label style (`.nx-outline h2`).
- Subject colour (`--subj-chemistry`) for the concept accent and type icons only.
- Type sizes: concept title 17 px / 650; card title 15.5 px / 650; learning purpose 13.5 px secondary;
  labels 11.5–12 px caps.
- Motion: crossfades ≤ 150 ms, stage entrance 200 ms; all off under reduced motion.
- Dark mode: every new surface uses tokens; the PDF canvas keeps its white page.

## 8. Data → UI, and the future learning-context contract

| UI element | Field |
|---|---|
| On this page | `ctx.printedPage`, chapter `sections[].pages`, `sections[].number/title` |
| Concept | concept inventory `concepts[].title` (+ `description`), matched by `locations` |
| Card type | `experience.type` |
| Card title | `experience.title` |
| Card purpose | the concept's `learningObjectives[]` statement for the experience's first objective |
| Grouping | `experience.objectives` (§3.3) |
| Visibility | `experience.status === "published"` |
| Apply | now: the chapter file's `apply` links for the section(s); later: `practice` experiences (`libraryId: ADV-…`) |
| Edition note | `ctx.editionStatus !== "exact_match"` |

**APIs.** `NCERT.ExperienceMapper.getExperiencesForPage(context)` stays as it is (flat list, backward
compatible). The contextual UX will use a **companion, concept-aware operation — documented here as a
future contract only, not implemented:**

```
getLearningContext(context) →
{
  page:     { pdfPage, printedPage, editionStatus },
  match:    "printed-page" | "section" | "chapter",      how the context was found (drives the notes)
  sections: [ { id, number, title } ],
  concepts: [ {
      concept:     { id, title, description },
      objectives:  [ { id, statement } ],
      experiences: [ { id, type, title, objectives, libraryId } ]   published only, practice excluded
  } ],
  apply:    [ { libraryId, title } ]                       JEE practice for the page / concepts
}
```

It reads the generated concept inventory and experience feed; it contains no UI logic, no ranking and no
fetching beyond the existing feed. Its exact form is settled when the panel is built.

## 9. Accessibility

- The panel is a `complementary` landmark ("Learning for this page"); the stage is a labelled region
  that receives focus on open and returns it on close.
- Every card is a real button with an accessible name, e.g. "Virtual lab: The enthalpy staircase. Show
  that ΔH does not depend on the path."
- Keyboard: Tab order panel → reader toolbar → page; `Esc` closes the stage or sheet; the reader's
  existing keys keep working when focus is in the page.
- Touch targets ≥ 44 px; contrast per tokens; the edition note is text, never colour alone.

## 10. Implementation phases (each with its own approval and tests)

| Phase | Scope | Exit criteria |
|---|---|---|
| UX-1 | Panel structure on desktop with **no concept data**: identity, On this page (sections from page context), chapter map collapse, source card collapse, hero folding, Apply from the chapter's existing JEE links | page change updates section and Apply only; no layout shift in the reader; existing 3A/3B/page-context tests green |
| UX-2 | `getLearningContext()` + a generated inventory / experience feed (synthetic data in tests only); concept block, cards, grouping and disclosure, quiet states, edition note | panel renders from fixtures; many-experience and zero-experience cases; unverified and unlabelled PDFs |
| UX-3 | Experience stage (desktop) + experience-focused panel + addressable experiences | `← Back to NCERT`, `Esc` and browser Back restore page and position exactly; focus returns |
| UX-4 | Phone / tablet: conditional context bar, bottom sheet, chapter-title action, full-screen stage | 360 / 390 / 768 checks; no bar on pages without content; no overlap with the toolbar |
| UX-5 | First real concept inventory for Ch 5 and its experiences | separate content review by the owner |

## 11. Owner decisions (2026-10-03)

1. **Experience opening:** a focused stage over the reader area; the PDF stays loaded underneath where
   practical; the panel enters an experience-focused state; `← Back to NCERT` is always obvious, and
   Back / Esc / browser Back return to the same page and reader context.
2. **Learning context API:** `getExperiencesForPage(context)` stays backward compatible; the contextual UX
   uses a companion `getLearningContext(context)` (§8), documented only, not implemented.
3. **Unverified editions:** printed-page context is used when available, with a clear note that the
   edition could not be verified — never presented as exact; without labels, a graceful section /
   chapter fallback. No separate algorithm.
4. **Mobile context bar:** shown only when the page has useful learning content; otherwise no bar, and
   the sheet is reached through a contextual action.
5. **Duration:** not added to the experience contract and not part of the card; cards show type, title,
   learning purpose and action. It may become optional metadata later, once real content needs it.
6. **Apply:** the label is "Apply", with JEE practice as the application layer; the chapter's existing
   JEE links power it for now; `practice` experiences become its source later. No new practice contract
   and no JEE data change.
7. **Experience count:** no fixed maximum per concept; group by learning purpose and disclose
   progressively; no ranking, "top" or "best" metadata in any contract.
