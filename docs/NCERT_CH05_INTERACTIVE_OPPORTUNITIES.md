# NCERT Class 11 Chemistry Chapter 5
# Interactive Opportunity Analysis and Learning + Media Strategy

Chapter `NCERT-11-CHE-P1-CH05`, Thermodynamics (book pp. 136–167, Reprint 2026-27).
Inventory: [`data/ncert/concepts/NCERT-11-CHE-P1-CH05.json`](../data/ncert/concepts/NCERT-11-CHE-P1-CH05.json),
committed in `c5cf130`: 44 concepts, 114 learning objectives.
Status: **strategy for owner review**. Nothing here is built, scheduled, recorded or published. There are
no experience records, no media records and no URLs.

---

## 1. Purpose

The concept inventory says *what* Chapter 5 teaches. This document decides **how each part of it reaches
the student**, through up to three complementary modes:

- **📖 Read**: the NCERT text, always available in the Explorer;
- **🧪 Explore**: an interactive experience, only where interaction adds real learning value;
- **🎬 Watch**: a short educational video, published on Instagram or YouTube and linked back into the
  Explorer once it is approved and live.

It has three jobs:

1. **Interactive opportunity analysis.** For each of the 44 concepts: is an interactive justified, which
   modality, and which experience serves it? **20 experiences** (XP-01 … XP-20) are proposed. There is no
   one-experience-per-concept target.
2. **Social coverage.** Every meaningful topic gets a chance at a short educational video, whether or not
   it has an interactive. The topics form a sequential series, *Thermodynamics — Part 00, 01, …*.
   The earlier version mentioned social-only content only in passing; this version defines it.
3. **The Media ↔ Explorer loop.** How published media comes back into the Explorer as **Watch**. Most of
   the architecture for this already exists (§11, §12). This document records it and lists the gaps;
   it implements nothing.

The inventory stays semantic and unchanged. Modality, priority, media and URLs never go into the concept,
experience or chapter files. `XP-nn` and `Part nn` are planning labels, not ids.

## 2. Product philosophy

```
Concept → best learning treatment

Read → Visualize → Interact → Observe → Understand → Apply     (when an experience exists)
Watch → Explore → Read                                          (arriving from social media)
```

Read, Explore and Watch are complementary, not competing. A student can use them in any order, and the
Explorer offers whichever ones exist (§3).

**Quality principles**:

1. Educational value over content quantity.
2. Interaction only when interaction adds learning value.
3. Every meaningful topic should have an opportunity for social learning content.
4. Social content must teach, not merely advertise. There is never a "new PrayogX simulation!" promo.
5. Experience-based media derives from the actual experience (its real footage and its aha moment).
6. Social-only media can exist without an interactive.
7. Every publication passes human approval.
8. Published media can be surfaced back in the Explorer.
9. The Explorer never shows unavailable, unapproved or fake media.
10. Chapter production is sequential and incremental.
11. We never wait for the whole chapter.
12. Underlying experiences are not duplicated per concept or per platform.
13. Source, concept, experience and media layers stay decoupled.

Scientific correctness outranks visual effect in experiences and media alike. Everything stays at
Class 11 NCERT level; anything beyond it is marked **OPTIONAL ENRICHMENT**.

## 3. Read / Explore / Watch model

| Mode | Comes from | Exists when |
|---|---|---|
| 📖 **Read** | the NCERT page in the reader (page context → section → concepts) | always |
| 🧪 **Explore** | a published interactive experience for the concept | only when justified **and** published |
| 🎬 **Watch** | a published, verified media asset for the concept or topic | only when one is live |
| 🎯 **Apply** | existing JEE pages, linked by id (unchanged) | where already mapped |

Valid states, all intentional:

```
A  Read only                 📖
B  Read + Explore            📖 🧪
C  Read + Watch              📖 🎬
D  Read + Explore + Watch    📖 🧪 🎬
E  Several media             📖 🧪 🎬 ├ Instagram reel
                                      ├ YouTube Short
                                      └ YouTube video
```

The Explorer shows only actions that exist. A missing mode leaves no placeholder, no disabled button and
no "coming soon".

### Final architecture

```
                 NCERT topic / concept
                         │
          ┌──────────────┴──────────────┐
          │                             │
          ▼                             ▼
        READ                      EXPERIENCE?
   (always, from the               (justified?)
    NCERT context)                      │
          │                    ┌────────┴────────┐
          │                   YES                NO
          │                    │                  │
          │                    ▼                  ▼
          │             Interactive          Social-only
          │             experience           animation /
          │             (Path A)             micro-explainer
          │                    │              (Path B)
          │                    ▼                  │
          │          Scientific + UX QA      Content QA
          │          → human approval        → human approval
          │                    │                  │
          │            published → EXPLORE        │
          │                    │                  │
          │                    ▼                  │
          │             Media Pipeline            │
          │        (candidate → production        │
          │          → human approval)            │
          │                    └────────┬─────────┘
          │                             ▼
          │                  Social publish (owner-gated)
          │                             │
          │                             ▼
          │                 Published media (VERIFIED)
          │                             │
          └──────────────┬──────────────┘
                         ▼
                   NCERT Explorer
                         │
            ┌────────────┼────────────┐
            ▼            ▼            ▼
          READ        EXPLORE       WATCH
        (always)   (if justified  (if approved media
                   and published)  is published)
```

- **Read** always comes from the NCERT context.
- **Explore** exists only when an interactive is justified and published.
- **Watch** exists only when approved, published, verified media exists.
- A social-only asset (Path B) has **no** Explore experience, and that is valid.
- Published media from either path can appear back inside the Explorer.

## 4. Interactive vs social content

**No experience does not mean no content.** The two decisions are independent.

| Path | When | Chain | Explorer result |
|---|---|---|---|
| **A: Interactive** | interaction adds substantial learning value | concept → experience → QA → approval → media → approval → publish | Explore, plus Watch once media is live |
| **B: Social-only** | the idea is best told, not manipulated | concept/topic → short animation or micro-explainer → content QA → approval → publish | Watch only (Read is always there) |

Path B is right for short definitions, conventions, framing ideas and statements of laws that a
shared experience already demonstrates. A Path B topic may still point to a *shared* experience that
covers it as a secondary concept: its video can end with "explore it in …" once that experience is live.

**Concepts with no dedicated interactive (7)**, which become the Path B candidates:

| Concept | Why no dedicated experience | Where the student still meets it |
|---|---|---|
| 1 Scope of thermodynamics | framing; nothing to manipulate | page text; made concrete in XP-16 ("spontaneous ≠ fast") |
| 17 Exothermic/endothermic | simple sign rule, shown by every enthalpy experience | XP-09, XP-11, XP-16 |
| 23 Reaction enthalpy | definition; measured or computed inside other experiences | XP-09 (as q_p), XP-11 (as level difference) |
| 24 Standard state | a convention | XP-11 callout on each species |
| 29 Enthalpy of combustion | best learned as a Hess application | XP-12 presets; XP-09 bomb |
| 41 Second law | a statement the ledger already demonstrates | XP-18 isolated-system preset |
| 42 Third law | a mode of the particle box | XP-17 (cool to 0 K) |

Every concept except 1 (Scope) is still served by at least one experience. Concept 1 needs none.

## 5. Topic / subtopic coverage

The production and social unit is the **topic**. A topic is one NCERT subsection or lettered part, or one
clearly separable idea inside it. **39 topics** cover all 44 concepts. Each topic is one episode of the
series *Thermodynamics — Part nn*, in book order. Interactive states:
- **YES**: the topic's own planned experience;
- **SHARED**: taught inside an experience whose home is another topic;
- **NO**: no interactive at all.

| Part | § | Topic | Concepts (#) | Interactive | Path |
|---:|---|---|---|---|---|
| 00 | intro | What thermodynamics can and can't tell you | 1 | NO | B |
| 01 | 5.1.1 | System, surroundings and boundary | 2 | YES (XP-01) | A |
| 02 | 5.1.2 | Open, closed and isolated systems | 3 | YES (XP-01) | A |
| 03 | 5.1.3 | State of a system | 4 | YES (XP-02) | A |
| 04 | 5.1.3 | State functions | 5 | YES (XP-02, XP-03) | A |
| 05 | 5.1.4 (a) | Work changes internal energy (Joule) | 6, 8 | YES (XP-03) | A |
| 06 | 5.1.4 (b) | Heat | 9 | YES (XP-03) | A |
| 07 | 5.1.4 | Adiabatic: hotter without heat | 7 | YES (XP-03, XP-04) | A |
| 08 | 5.1.4 | The IUPAC sign convention | 10 | YES (XP-04) | A |
| 09 | 5.1.4 (c) | First law of thermodynamics | 11 | YES (XP-03, XP-04) | A |
| 10 | 5.2.1 | Work is an area: p–V work | 12 | YES (XP-05) | A |
| 11 | 5.2.1 | Reversible vs irreversible | 13 | YES (XP-05) | A |
| 12 | 5.2.1 | Same expansion, three ways (incl. free expansion) | 14, 15 | YES (XP-05) | A |
| 13 | 5.2.2 (a) | Why enthalpy exists | 16 | YES (XP-06) | A |
| 14 | 5.2.2 | Exothermic vs endothermic | 17 | SHARED (XP-09, XP-11) | B |
| 15 | 5.2.2 (a) | ΔH vs ΔU | 18 | YES (XP-09) | A |
| 16 | 5.2.2 (b) | Extensive vs intensive | 19 | YES (XP-07, P3) | A, or B if XP-07 is deferred |
| 17 | 5.2.2 (c) | Heat capacity | 20 | YES (XP-08) | A |
| 18 | 5.2.2 (d) | C_p − C_v = R | 21 | YES (XP-06) | A |
| 19 | 5.3 | Calorimetry: bomb vs constant pressure | 22 | YES (XP-09) | A |
| 20 | 5.4 | Reaction enthalpy | 23 | SHARED (XP-09, XP-11) | B |
| 21 | 5.4 (a) | Standard state | 24 | NO (XP-11 callout only) | B |
| 22 | 5.4 (b) | Phase changes: the flat parts of the curve | 25 | YES (XP-10) | A |
| 23 | 5.4 (c) | Enthalpy of formation | 26 | YES (XP-11) | A |
| 24 | 5.4 (d) | Thermochemical equations | 27 | YES (XP-11) | A |
| 25 | 5.4 (e) | Hess's law | 28 | YES (XP-12) | A |
| 26 | 5.5 (a) | Combustion → formation | 29 | SHARED (XP-12) | B |
| 27 | 5.5 (b)–(c) | Atomization and bond enthalpy | 30, 31 | YES (XP-13) | A |
| 28 | 5.5 (d) | Lattice enthalpy: the Born–Haber cycle | 32 | YES (XP-14) | A |
| 29 | 5.5 (e)–(f) | Dissolving and diluting | 33, 34 | YES (XP-15) | A |
| 30 | 5.6, (a) | Spontaneous ≠ fast; ΔH isn't enough | 35 | YES (XP-16) | A |
| 31 | 5.6 (b) | Entropy: why mixed gases never unmix | 36 | YES (XP-17) | A |
| 32 | 5.6 (b) | Total entropy: why iron rusts | 37 | YES (XP-18) | A |
| 33 | 5.6 (c) | Gibbs energy and spontaneity | 38, 39 | YES (XP-19) | A |
| 34 | 5.6 (c) | Temperature decides: Table 5.4 | 40 | YES (XP-19) | A |
| 35 | 5.6 (d) | The second law | 41 | SHARED (XP-18) | B |
| 36 | 5.6 (e) | Third law and absolute entropy | 42 | SHARED (XP-17) | B |
| 37 | 5.7 | Equilibrium: the bottom of the G valley | 43 | YES (XP-20) | A |
| 38 | 5.7 | ΔG° and K | 44 | YES (XP-20) | A |

Merges, so that no short is forced per concept:
- Parts 05, 12, 27, 29 and 33 each cover two closely related concepts in one short.
- XP-19 yields two shorts (Parts 33, 34) and XP-05 three (Parts 10–12), because each has distinct
  teaching angles.

Coverage: **39 topics**, of which **32 are Path A** (experience-based) and **7 are Path B** (social-only:
Parts 00, 14, 20, 21, 26, 35, 36). Part 16 moves to Path B if XP-07 (P3) is deferred.

## 6. Experience modalities

The experience contract (`tools/experience_schema.py`) has ten types. The brief's extra modalities map
onto them, so no new type is needed.

| Modality | Contract type | Best for | Example here |
|---|---|---|---|
| Simulation / parameter playground | `simulation` | a model with causes the student changes and effects that follow | XP-06 heating at constant V vs p |
| Virtual lab | `virtual-lab` | a real procedure with apparatus, readings and a calculation | XP-03 Joule's bench, XP-09 calorimeters |
| Graph explorer | `graph` | a relationship that is clearest as a curve or an area | XP-05 p–V work, XP-19 ΔG–T |
| Data explorer | `data-explorer` | tabulated NCERT data to compare, combine or trend | XP-15 dilution series |
| Interactive diagram / comparison explorer | `interactive-diagram` | classification, boundaries, energy-level diagrams | XP-01 system bench, XP-11 formation ladder |
| Molecular visualization | `molecular` | a particle-level cause behind a bulk property | XP-13 bond ladder, XP-17 mixing and disorder |
| Animation | `animation` | a sequence to watch whose order matters | intro scenes inside XP-16 |
| Interactive derivation | `derivation` | a chain of algebra the student steps through | panels inside XP-05, XP-06, XP-09, XP-19 |
| Worked example | `worked-example` | an NCERT problem solved step by step from the model | presets inside XP-09, XP-12, XP-20 |
| Practice | `practice` | existing JEE question pages (Apply) | ADV-2026-P1-CHE-Q01, PHY-Q07, PHY-Q11, CHE-Q13 |
| Hybrid | one page, several records | one apparatus that serves several concepts | most XP- below |
| No dedicated interactive | — | the text, a callout or a shared experience is enough | §4 |

**Contract note (reported, not changed).** An experience record names **one** `conceptId` and **one**
`type`. A shared page (§15) is therefore recorded as **one experience record per concept it serves**:
each record names that concept, that concept's objectives and its own type, and all of them point to
the same delivering page. Whether to keep this or add a first-class "shared page" link is a separate
owner decision. It also affects how the Media Pipeline counts candidates (§18).

## 7. Social media content types

The format follows the content; no single format is forced on every topic.

| Type | Path | Typical length | What it is | Built from |
|---|---|---|---|---|
| **Micro-explainer** | B | ~5–15 s (a guideline) | one idea, one visual, one line of text or voice | a short concept animation |
| **Concept animation** | B (also A) | ~10–30 s | a definition or law shown as motion (a boundary, an arrow, a level) | animation |
| **Experience demonstration** | A | 20–30 s standard reel | the real experience recorded: cause → process → effect → aha | the published experience page |
| **Virtual-lab demonstration** | A | 20–30 s or 40–50 s | the procedure, the reading and the result | the virtual lab |
| **Graph insight** | A | 20–30 s | one graph move that changes understanding (area = work, ΔG–T line) | graph explorer |
| **Molecular animation** | A | 20–50 s | a particle-level cause (bond ladder, mixing gases) | molecular experience |
| **Worked-example explanation** | A or B | 40–50 s | one NCERT problem solved from the model, with values computed | experience presets or animation |
| **Concept explanation** | A | 40–50 s explain reel | the NCERT idea actually taught, simulation-led | experience + voiceover |
| **YouTube educational video** | A | set by the concept | a longer explanation; not bound by reel limits | experience + animation (docs/NCERT_MEDIA.md) |

Platforms: Instagram Reel, YouTube Short (the same vertical asset where possible) and a YouTube video
for longer explanations. Use the shortest length that teaches the idea. Experience-based reels follow
`docs/NCERT_MEDIA.md` (20–30 s standard, 40–50 s explanation).

**Tooling gap (documented, not changed).** The reel maker records the **real simulation page**, and each
story's duration limits default to 20–40 s, while NCERT reel types are tied to 20–30 s or 40–50 s.
Path B assets therefore need two decisions before Part 00:
- a source with no simulation page (an animation);
- a short micro-explainer reel type of about 5–15 s.

Both are future owner decisions (§12, gap G6).

## 8. Sequential production model

```
SECTION → TOPIC / SUBTOPIC → CONCEPT(S) → DECIDE THE BEST LEARNING TREATMENT

PATH A: INTERACTIVE
  experience blueprint → build → scientific QA → UX QA → human approval
  → published experience (Explore appears in the Explorer)
  → media production candidate → media production → human approval
  → publish (Instagram / YouTube, owner-gated) → verified publication record
  → Watch link appears in the Explorer

PATH B: SOCIAL-ONLY
  short animation / micro-explainer → content QA → human approval
  → publish (owner-gated) → verified publication record
  → Watch link appears in the Explorer

→ NEXT TOPIC / SUBTOPIC
```

The chapter is never finished first. Each topic is a complete unit that can go live and publish on its own.

**Sequential content example: progressive availability is intentional.**

```
Part 01  System & surroundings     interactive XP-01 → QA → approval → media → Instagram + YouTube
                                   Explorer: 📖 Read  🧪 Explore  🎬 Watch (2 links)
Part 00  What thermodynamics…      no interactive → 10 s concept animation → approval → Instagram + YouTube
                                   Explorer: 📖 Read  🎬 Watch
Part 03  State of a system         XP-02 still being built, nothing published
                                   Explorer: 📖 Read
Part 05  Joule's work              XP-03 approved and live; its media not yet published
                                   Explorer: 📖 Read  🧪 Explore
```

## 9. Experience decision tree

```
Is it a meaningful NCERT learning idea? ──no──► no content (fold it into its topic)
        │ yes
Is it invisible, dynamic, multi-variable, graphical,
misconception-prone or energy-accounting-heavy? ──no──► no interactive → §10 (Path B)
        │ yes
Would manipulating a cause and seeing the effect
teach more than reading or watching? ──no──► no interactive → §10
        │ yes
Does an experience already planned for a related concept
serve it, with the same apparatus and a natural extension? ──yes──► SHARED experience (one page, a record per concept)
        │ no
Does it have two distinct learning angles (e.g. molecular vs quantitative)? ──yes──► two complementary experiences
        │ no
One dedicated experience. Pick the modality (§6), the priority (§17) and the place in the build order.
```

## 10. Social content decision tree

```
Is there a topic-level idea a student can take away in one short? ──no──► fold it into a neighbouring Part
        │ yes
Does a published experience cover it?
   ├─ yes ─► experience-based media: demo / graph insight / virtual-lab / molecular / worked example,
   │         made from the real experience; CTA "explore it on PrayogX"
   └─ no ──► is an experience planned for it?
              ├─ yes, not built yet ─► wait (the media follows the experience; nothing is published early)
              └─ no ─► Path B: concept animation or micro-explainer (5–15 s where enough)
Does a single short cover several closely related concepts well? ──yes──► one Part for all of them
Does one experience have several distinct teaching angles? ──yes──► several Parts from one experience
Should its URL appear in the Explorer? ── yes, once it is VERIFIED, under the concept(s) it teaches
```

## 11. Media → Explorer connection

The loop:

```
NCERT ──► PrayogX Explorer ──► social media ──► back to the PrayogX Explorer
           (Read / Explore)      (discovery,      (Read + Explore + Watch,
                                  micro-learning)   then Apply)
```

A student sees "Why is work path dependent?" on Instagram. The CTA says "Explore it on PrayogX". In the
Explorer they find 📖 Read §5.2.1, 🧪 Explore the p–V work explorer and 🎬 Watch the Short. So social media
is the discovery layer, and the Explorer is the learning hub.

**What already exists (documented, not changed):**
- **Publication ledger.** `tools/reel-maker/publications.json` already owns publication data:
  `simulationId`, `platform` (instagram/youtube), `url`/`permalink`, `status` (VERIFIED), `publishedAt`,
  `verifiedAt`, `approvedBy`/`approvedAt`, `reelSha256`, `origin`, and `asset` (reel/animation; a
  missing value means reel). Records are written only by the owner-gated publishers. 13 records exist
  today, all for JEE pages.
- **Chapter `watch` references** (`tools/ncert_schema.py`). A section's `watch` entry is a *reference*,
  `{"sim": <CON- id>, "asset": "animation" | "reel"}`, never a URL.
- **Feed resolution** (`tools/build_content.py` through `_verified_media`). The generated chapter feed
  lists a watch entry **only when a VERIFIED ledger record exists**, attaches its links with YouTube
  first, and drops it otherwise. That already enforces "no fake media".
- **Not yet built:** the UX-1/UX-2 panel renders Read, Concept, Explore and Apply. It does **not** render
  Watch, and `getLearningContext()` deliberately returns no media. No Chapter 5 section has a `watch`
  entry today.

**Explorer UX, for when Watch is implemented (guidance only):**
- **Labels, not URLs:** "🎬 Watch on Instagram", "▶ Watch on YouTube", "▶ Watch YouTube Short". Plain
  external links that open the public page. No embeds by default (performance, privacy, layout); an
  embed needs a strong reason.
- **Show only what exists.** No Watch row without a VERIFIED, active asset. No placeholder.
- **Desktop panel**, focused and never a feed:

  ```
  CURRENT CONCEPT  Hess's law
  Learn    objective summary
  Explore  The enthalpy staircase
  Watch    ▶ YouTube Short · 🎬 Instagram reel
  Apply    JEE practice
  ```
- **Mobile:** compact, inside the existing context bar and sheet: `[Read] [Explore] [Watch]`, showing
  only the actions that exist. Watch never pushes the PDF away; at most one short line per platform.
- **Apply** stays as designed; this document does not change it.

## 12. Media asset / publication layer

Publication data belongs to a separate media layer, never to the concept inventory, concept schema,
experience schema or chapter JSON:

```
Concept ──┬── NCERT locations                 (concept inventory)
          ├── interactive experience(s)       (experience document; one record per concept)
          └── media assets                    (publication layer; owns platform, URL, status)
                ├── Instagram reel
                ├── YouTube Short
                ├── YouTube video
                └── other approved media
```

The media layer is separate because a concept may gain several assets per platform; URLs change; assets
are replaced or retired; and publication state is platform-specific.

**Fields the eventual layer needs** (architecture only). Most already exist in the ledger:
- media id;
- source concept(s);
- source experience (or page);
- platform;
- media type;
- title;
- URL;
- publication status;
- publication date;
- approval (by, at);
- provenance (asset hash, music and voice provenance);
- replacement and retirement.

**Gaps between today's ledger seam and this strategy** (for a future phase; nothing implemented):

| # | Gap | Today | Needed |
|---|---|---|---|
| G1 | key | records key on `simulationId` (a library page) | key on an experience or delivering page **and/or** a concept, so a Path B asset with no page can exist |
| G2 | chapter link | a `watch` entry must name a CON- page that is also under `understand` | concept-level Watch through the learning context, without requiring a page |
| G3 | asset vocabulary | `reel`, `animation` | add micro-explainer / short / video distinctions, since platform is already separate |
| G4 | lifecycle | only VERIFIED is read | `replaced`, `retired`, `unavailable`, so a link can be withdrawn without deleting history |
| G5 | Explorer | the feed carries `watch`, but the panel and `getLearningContext()` ignore media | a companion Watch read in a future UX phase, with the same "only what exists" rule |
| G6 | production | the reel maker records a simulation page; reel types are 20–30 s or 40–50 s | a Path B source (animation) and a short micro-explainer type |
| G7 | queue | publishing is by explicit owner command; no candidate queue exists | a media-candidate queue fed only by **published** experiences and approved Path B items |

Each of these is a separate, owner-approved change to its own file (`ncert_schema.py`,
`build_content.py`, reel-maker, publishers, UX). None is made here.

## 13. Published URL lifecycle

```
produced → human media approval (APPROVED) → owner-gated publish → platform URL
→ VERIFIED ledger record ─► eligible for Watch (if active)
                           ├─► replaced  (a newer asset supersedes it; Watch shows the new one)
                           ├─► retired   (withdrawn by the owner; Watch hides it)
                           └─► unavailable (the platform link fails a check; Watch hides it until fixed)
```

Watch shows only **VERIFIED and active** records. URLs come only from the publishers' verified output
and are never typed into content files. The existing standing rule is kept: after a VERIFIED publish,
the ledger alone is committed and pushed by the publisher (CLAUDE.md). Replacement and retirement
states are future (G4).

## 14. Progressive availability

Availability grows topic by topic, and every combination below is valid at any time:

| Topic state | Read | Explore | Watch |
|---|---|---|---|
| nothing built yet | ✓ | — | — |
| experience live, media pending | ✓ | ✓ | — |
| Path B published | ✓ | — | ✓ |
| experience and media live | ✓ | ✓ | ✓ (one or more links) |
| experience being rebuilt, media live | ✓ | — (until re-approved) | ✓ |

The Explorer never assumes topics complete together, never shows a disabled or "coming soon" action,
and never links an unpublished experience or asset.

## 15. Shared experience architecture

**Decision: one underlying experience, many concept associations; no duplicated implementations.**

- An experience record names one `conceptId` and one `type` (`tools/experience_schema.py`, unchanged).
  A shared page is recorded as **one record per concept it serves**: each has that concept's objectives,
  and all point to the same delivering page (`libraryId`, a CON- page).
- The page is built **once**. Concepts are associations, not copies.
- **Media operates on the underlying experience or page, not on each record.** One media candidate per
  page (or per distinct teaching angle, for example Parts 10–12 from XP-05), listing the concepts it
  covers. The existing ledger already keys on the delivering page (`simulationId`), so it naturally
  avoids duplicates.
- Each asset is made once and reused across platforms (Instagram reel and YouTube Short from the same
  render) unless a platform really needs its own cut.
- Changing the contract to give shared pages a first-class link is a separate owner decision. It is
  not needed now.

A shared experience serves several concepts from one apparatus. **The concepts stay separate in the
inventory.** Under the current contract each concept served gets its own experience record, all pointing
to the same page (above).

| Experience | Concepts served | Why sharing is justified |
|---|---|---|
| XP-01 System and boundary bench | 2, 3 | the same beaker; the boundary and the walls are two switches on one picture |
| XP-02 One state, many routes | 4, 5 | the state is fixed by a few variables, and those variables are path independent |
| XP-03 Joule's bench | 5, 6, 7, 8, 9, 11 | NCERT 5.1.4 is one continuous argument: work (a), heat (b), general case (c) on one flask |
| XP-04 Energy ledger | 7, 10, 11 | sign convention and first-law accounting are one skill |
| XP-05 p–V work explorer | 10, 11, 12, 13, 14, 15 | NCERT Fig. 5.5 (a–c) and Problems 5.2–5.4 share one cylinder and one plot |
| XP-06 Heat it two ways | 16, 21 | ΔH = q_p and C_p − C_v = R are the same constant-V vs constant-p comparison |
| XP-08 Heat capacity bench | 19, 20 | C (extensive) vs C_m (intensive) on the same bench |
| XP-09 Two calorimeters, one reaction | 17, 18, 22, 23, 29 | one reaction, two apparatus; the gap is Δn_gRT (pilot `CON-CHE-DELTA-U-VS-DELTA-H`) |
| XP-10 Heating curve | 18, 20, 25 | slopes are heat capacity, plateaus are phase-change enthalpy; Problems 5.7 and 5.8 |
| XP-11 Formation-enthalpy ladder | 17, 19, 23, 24, 26, 27 | one enthalpy diagram carries formation, the conventions and Δ_rH |
| XP-12 The enthalpy staircase | 5, 26, 27, 28, 29 | Hess's law uses the equation tools of 5.4(d) and the combustion data of 5.5(a) (pilot `CON-CHE-HESS-LAW`) |
| XP-13 Bond-breaking ladder | 30, 31 | atomization is the full ladder; bond enthalpy is each rung |
| XP-14 Born–Haber cycle builder | 18, 28, 32 | the cycle is Hess's law; its ΔU note is the ΔH–ΔU relation |
| XP-15 Dissolve and dilute | 32, 33, 34 | the solution balance reuses the lattice term; dilution follows on the same page |
| XP-16 Which way does it go? | 17, 35 | Fig. 5.10 enthalpy diagrams sit inside the spontaneity question |
| XP-17 Mixing and disorder | 35, 36, 42 | one particle box: diffusion, phase order, and motion down to 0 K |
| XP-18 The entropy ledger | 13, 36, 37, 41 | q_rev/T, system + surroundings, second law, reversible vs irreversible |
| XP-19 ΔG–T explorer | 37, 38, 39, 40 | Gibbs equation, criterion and Table 5.4 on one graph (pilot `CON-CHE-GIBBS-SPONTANEITY`) |
| XP-20 ΔG° and K explorer | 13, 43, 44 | the minimum of G and the ΔG°–K link are the two halves of 5.7 |

The pairings the brief asked to evaluate:
- **First law + work + heat:** shared (XP-03). This is NCERT's own structure.
- **Reversible process + PV work:** shared (XP-05).
- **ΔH–ΔU + reaction enthalpy:** shared (XP-09).
- **Reaction enthalpy + Hess:** linked, not shared. XP-11 computes Δ_rH from formation data and XP-12
  builds routes. Both use the same enthalpy diagram, but they ask different questions.
- **Entropy + spontaneity:** shared in part. XP-16 asks the question and XP-17 answers it with diffusion.
- **Entropy + total entropy:** shared (XP-18).
- **Gibbs + spontaneity:** shared (XP-19).
- **Gibbs + equilibrium:** **kept separate** (XP-19 vs XP-20). 5.7 needs a different picture (G vs
  composition, K on a log scale), and merging the two would overload one page.

### Multiple-experience candidates

Only where each experience gives a distinct learning benefit:

| Concept | Experiences | Distinct benefit |
|---|---|---|
| 5 State functions | XP-02, XP-03 | p, V and T path independence (5.1.3) vs U path independent while q and w are not (5.1.4) |
| 11 First law | XP-03, XP-04 | discovery from Joule's apparatus vs fluent sign-correct accounting for any process |
| 20 Heat capacity | XP-08, XP-10 | heat capacity as a number (bench) vs heat capacity as the slope of a heating curve beside the plateaus |
| 28 Hess's law | XP-12, XP-14 | building routes between known reactions vs closing a cycle to find a quantity that can't be measured |
| 36 Entropy | XP-17, XP-18 | particle-level meaning (disorder) vs quantitative meaning (q_rev/T, ΔS_total) |

**Considered and rejected:**
- **Gibbs energy:** a separate temperature-dependence explorer is not needed, because the ΔG–T line in
  XP-19 already *is* the temperature dependence.
- **Hess's law:** a third "worked application" experience is not needed, because presets inside XP-12
  cover it.
- **Calorimetry:** a separate coffee-cup lab is not needed, because XP-09 has both apparatus.

## 16. Pilot selection

- **Path A pilot: XP-01, System and boundary bench (Parts 01–02).** It is the first thing the chapter
  teaches, foundational, low in complexity and strongly visual. It is also the first full test of
  Path A end to end: blueprint → build → QA → approval → Explore → media candidate → media approval →
  publish → VERIFIED record → Watch.
- **Path B pilot: Part 00, "What thermodynamics can and can't tell you"** (concept 1), a ~10 s concept
  animation. It is the first episode of the series and tests Path B, including tooling gap G6. If G6 is
  not resolved, Part 00 waits; nothing is published around the gates.
- **The approved concept-page pilots** in `docs/NCERT.md` §7 (ΔU vs ΔH, Hess's law, Gibbs spontaneity)
  are XP-09, XP-12 and XP-19, at steps 9, 12 and 19 of the chapter order. They can be brought forward;
  the recommendation is chapter order.

## 17. Sequential build order

### Priority framework

| Priority | Meaning |
|---|---|
| **P0** | exceptional value: a central idea, invisible or misconception-prone, transformed by interaction |
| **P1** | high value: a clear learning gain and a natural interaction |
| **P2** | useful: a modest gain; build when its chapter position comes up |
| **P3** | optional: small gain; can be skipped or deferred without leaving a gap |
| **NONE** | no dedicated experience (§4) |

**Experience priorities (20):**
- **P0 (6):** XP-03, XP-05, XP-09, XP-12, XP-17, XP-19
- **P1 (10):** XP-01, XP-02, XP-04, XP-06, XP-10, XP-11, XP-13, XP-14, XP-18, XP-20
- **P2 (3):** XP-08, XP-15, XP-16
- **P3 (1):** XP-07

**Concept priorities (44), in the coverage matrix (§19.2):** P0 14 · P1 16 · P2 5 · P3 2 · NONE 7.

### Experience build order (Path A)

The order follows the chapter. Each step is one complete unit (blueprint → build → QA → approval →
media) and is publishable on its own.

| Step | Section | Experience | Pri. | Depends on | Notes |
|---:|---|---|---|---|---|
| 1 | 5.1.1–5.1.2 | **XP-01** System and boundary bench | P1 | — | **recommended first**: foundational, low risk, proves the whole experience → media chain end to end |
| 2 | 5.1.3 | **XP-02** One state, many routes | P1 | — | introduces the piston–cylinder engine |
| 3 | 5.1.4 | **XP-03** Joule's bench | P0 | — | introduces the water-bath bench |
| 4 | 5.1.4 | **XP-04** Energy ledger | P1 | XP-03 (same apparatus, accounting layer) | |
| 5 | 5.2.1 | **XP-05** p–V work explorer | P0 | XP-02 engine | Apply: ADV-2026-P1-CHE-Q01 |
| 6 | 5.2.2(a), (d) | **XP-06** Heat it two ways | P1 | XP-05 engine | Apply: ADV-2026-P1-PHY-Q11 |
| 7 | 5.2.2(b) | **XP-07** The partition test | P3 | — | may be skipped or deferred |
| 8 | 5.2.2(c) | **XP-08** Heat capacity bench | P2 | XP-03 bench | |
| 9 | 5.3 (+ 5.2.2 ΔH–ΔU) | **XP-09** Two calorimeters, one reaction | P0 | XP-06 (meaning of ΔH), XP-08 (q = CΔT) | pilot `CON-CHE-DELTA-U-VS-DELTA-H` |
| 10 | 5.4(b) | **XP-10** Heating curve of water | P1 | XP-08 bench | |
| 11 | 5.4(a), (c), (d) | **XP-11** Formation-enthalpy ladder | P1 | — | introduces the enthalpy-level diagram |
| 12 | 5.4(e) + 5.5(a) | **XP-12** The enthalpy staircase | P0 | XP-11 diagram and equation card | pilot `CON-CHE-HESS-LAW` |
| 13 | 5.5(b), (c) | **XP-13** Bond-breaking ladder | P1 | XP-11 diagram | |
| 14 | 5.5(d) | **XP-14** Born–Haber cycle builder | P1 | XP-12 (Hess) | |
| 15 | 5.5(e), (f) | **XP-15** Dissolve and dilute | P2 | XP-14 (lattice term) | |
| 16 | 5.6, 5.6(a) | **XP-16** Which way does it go? | P2 | — | |
| 17 | 5.6(b), (e) | **XP-17** Mixing and disorder | P0 | — | introduces the particle box |
| 18 | 5.6(b)–(d) | **XP-18** The entropy ledger | P1 | XP-17 | |
| 19 | 5.6(c) | **XP-19** ΔG–T explorer | P0 | XP-18 (derivation of the criterion) | pilot `CON-CHE-GIBBS-SPONTANEITY`; Apply: ADV-2026-P1-CHE-Q13 |
| 20 | 5.7 | **XP-20** ΔG° and K explorer | P1 | XP-19 | |

Order inside the book is kept, with two small exceptions:
- **XP-09 (5.3)** also teaches the 5.2.2 ΔH–ΔU relation. It is built after XP-06 and XP-08 because it
  needs the meaning of ΔH and q = CΔT.
- **XP-10 (5.4(b))** comes before **XP-11 (5.4(a), (c), (d))**, because the book teaches phase
  transformations before formation; the standard state appears in XP-11's callout.

**Pilot note.** `docs/NCERT.md` §7 approved three pilot concept pages: ΔU vs ΔH, Hess's law, and Gibbs
spontaneity. They are XP-09, XP-12 and XP-19. In a strictly sequential plan they come at steps 9, 12
and 19. If you prefer to build the approved pilots first, the plan still works: each depends only on
the engines listed, which can be built inside the pilot. That is your choice. This document recommends
the chapter order.

**Progressive completion.** Each phase is one row, for example:

```
Phase A  5.1.1–5.1.2  XP-01  → QA → approval → live in the Explorer → media candidate → … → publish
Phase B  5.1.3        XP-02  → …
Phase C  5.1.4        XP-03  → …
```

Nothing in Phase B waits for Phase A's media, and nothing waits for the chapter to finish. P2 and P3
rows may be deferred without blocking later rows. Deferring XP-08 makes XP-10 build its own bench.

### Series order (Path A and Path B together)

The social series follows the book. Path B parts are produced at their own position, independently of the
experience queue:

```
Part 00 (B) → 01–02 (XP-01) → 03–04 (XP-02) → 05–07, 09 (XP-03) → 08 (XP-04) → 10–12 (XP-05)
→ 13, 18 (XP-06) → 14 (B) → 16 (XP-07 or B) → 17 (XP-08) → 15, 19 (XP-09) → 20 (B) → 21 (B)
→ 22 (XP-10) → 23–24 (XP-11) → 25 (XP-12) → 26 (B) → 27 (XP-13) → 28 (XP-14) → 29 (XP-15)
→ 30 (XP-16) → 31 (XP-17) → 36 (B) → 32 (XP-18) → 35 (B) → 33–34 (XP-19) → 37–38 (XP-20)
```

Episodes are numbered by book position, so a Part may be published after a later-numbered one while its
experience is still in production. The Part number keeps its place in the series.

## 18. Media Pipeline strategy

1. **Triggers.** A media candidate is created only by:
   - (A) an experience reaching **published** (scientific QA, UX QA and human approval done); or
   - (B) an approved Path B item.

   Never by the inventory, this document, a blueprint, or a planned, blueprint, building or review
   record.
2. **Unit.** The underlying experience or page (Path A) or the topic (Path B). There is one candidate
   per page or teaching angle, listing its concepts (§15).
3. **Human gates.** Media production → **human media approval** (`instagram_publish.py approve`) →
   publishing by a separate owner command. YouTube is private first unless the owner names another
   privacy. Nothing publishes automatically, and End-to-End Production Mode applies only to a question
   the owner names.
4. **Educational content only.** Every asset teaches the topic's idea; the hook is a question, the
   payoff is the aha moment, and the CTA points to the Explorer.
5. **Return path.** Publication writes a VERIFIED ledger record. A future change (G1–G5) surfaces it as
   Watch in the Explorer.
6. **Package by experience type** (planning; durations follow `docs/NCERT_MEDIA.md`):

| Experience type | Likely package | Examples |
|---|---|---|
| virtual lab | experiment-demo reel + result short | XP-03 Joule, XP-09 calorimeters, XP-10 heating curve |
| graph explorer | graph-insight short (explanation) | XP-05 area = work, XP-19 Table 5.4 as four lines, XP-20 K across many orders of ten |
| molecular | concept animation + educational short | XP-13 CH₄ bond ladder, XP-17 mixing |
| interactive diagram | quick hook reel | XP-01 open/closed/isolated, XP-11 "every compound has an address" |
| energy-path / cycle | step-build animation | XP-12 staircase, XP-14 Born–Haber |
| data explorer | trend short | XP-15 dilution |
| none (Path B) | micro-explainer / concept animation | Parts 00, 14, 20, 21, 26, 35, 36 |

Per-experience hooks are listed in the blueprints (Appendix B, "media hook").

## 19. Coverage matrix

### 19.1 Topic matrix: experience + media

No media exists yet: every **Published Media** is `NONE` and every **Explorer Watch** is `NOT YET
AVAILABLE`. No URL is recorded in this document.

| Part | Topic | Interactive | Experience | Social Content | Media Type | Published Media | Explorer Watch |
|---:|---|---|---|---|---|---|---|
| 00 | What thermodynamics can and can't tell you | NO | — | PLANNED | micro-explainer | NONE | NOT YET AVAILABLE |
| 01 | System, surroundings and boundary | YES | XP-01 | PLANNED | experience-based (diagram demo) | NONE | NOT YET AVAILABLE |
| 02 | Open, closed and isolated systems | YES | XP-01 | PLANNED | experience-based (diagram demo) | NONE | NOT YET AVAILABLE |
| 03 | State of a system | YES | XP-02 | PLANNED | experience-based (simulation demo) | NONE | NOT YET AVAILABLE |
| 04 | State functions | YES | XP-02 | PLANNED | experience-based (simulation demo) | NONE | NOT YET AVAILABLE |
| 05 | Work changes internal energy | YES | XP-03 | PLANNED | experience-based (virtual-lab demo) | NONE | NOT YET AVAILABLE |
| 06 | Heat | YES | XP-03 | PLANNED | experience-based (virtual-lab demo) | NONE | NOT YET AVAILABLE |
| 07 | Adiabatic: hotter without heat | YES | XP-03 | PLANNED | experience-based (virtual-lab demo) | NONE | NOT YET AVAILABLE |
| 08 | The IUPAC sign convention | YES | XP-04 | PLANNED | experience-based (diagram demo) | NONE | NOT YET AVAILABLE |
| 09 | First law | YES | XP-03, XP-04 | PLANNED | experience-based (concept explanation) | NONE | NOT YET AVAILABLE |
| 10 | Work is an area | YES | XP-05 | PLANNED | experience-based (graph insight) | NONE | NOT YET AVAILABLE |
| 11 | Reversible vs irreversible | YES | XP-05 | PLANNED | experience-based (graph insight) | NONE | NOT YET AVAILABLE |
| 12 | Same expansion, three ways | YES | XP-05 | PLANNED | experience-based (worked example) | NONE | NOT YET AVAILABLE |
| 13 | Why enthalpy exists | YES | XP-06 | PLANNED | experience-based (simulation demo) | NONE | NOT YET AVAILABLE |
| 14 | Exothermic vs endothermic | SHARED | XP-09, XP-11 | PLANNED | concept animation | NONE | NOT YET AVAILABLE |
| 15 | ΔH vs ΔU | YES | XP-09 | PLANNED | experience-based (virtual-lab demo) | NONE | NOT YET AVAILABLE |
| 16 | Extensive vs intensive | YES (P3) | XP-07 | PLANNED | experience-based, or micro-explainer if deferred | NONE | NOT YET AVAILABLE |
| 17 | Heat capacity | YES | XP-08 | PLANNED | experience-based (virtual-lab demo) | NONE | NOT YET AVAILABLE |
| 18 | C_p − C_v = R | YES | XP-06 | PLANNED | experience-based (derivation) | NONE | NOT YET AVAILABLE |
| 19 | Calorimetry | YES | XP-09 | PLANNED | experience-based (virtual-lab demo) | NONE | NOT YET AVAILABLE |
| 20 | Reaction enthalpy | SHARED | XP-09, XP-11 | PLANNED | concept animation | NONE | NOT YET AVAILABLE |
| 21 | Standard state | NO | — (XP-11 callout) | PLANNED | micro-explainer | NONE | NOT YET AVAILABLE |
| 22 | Phase changes | YES | XP-10 | PLANNED | experience-based (graph insight) | NONE | NOT YET AVAILABLE |
| 23 | Enthalpy of formation | YES | XP-11 | PLANNED | experience-based (diagram demo) | NONE | NOT YET AVAILABLE |
| 24 | Thermochemical equations | YES | XP-11 | PLANNED | experience-based (worked example) | NONE | NOT YET AVAILABLE |
| 25 | Hess's law | YES | XP-12 | PLANNED | experience-based (step-build animation) | NONE | NOT YET AVAILABLE |
| 26 | Combustion → formation | SHARED | XP-12 | PLANNED | worked example | NONE | NOT YET AVAILABLE |
| 27 | Atomization and bond enthalpy | YES | XP-13 | PLANNED | experience-based (molecular animation) | NONE | NOT YET AVAILABLE |
| 28 | Born–Haber cycle | YES | XP-14 | PLANNED | experience-based (step-build animation) | NONE | NOT YET AVAILABLE |
| 29 | Dissolving and diluting | YES | XP-15 | PLANNED | experience-based (trend short) | NONE | NOT YET AVAILABLE |
| 30 | Spontaneous ≠ fast | YES | XP-16 | PLANNED | experience-based (animation scenes) | NONE | NOT YET AVAILABLE |
| 31 | Entropy | YES | XP-17 | PLANNED | experience-based (molecular animation) | NONE | NOT YET AVAILABLE |
| 32 | Total entropy | YES | XP-18 | PLANNED | experience-based (graph insight) | NONE | NOT YET AVAILABLE |
| 33 | Gibbs energy and spontaneity | YES | XP-19 | PLANNED | experience-based (graph insight) | NONE | NOT YET AVAILABLE |
| 34 | Temperature decides | YES | XP-19 | PLANNED | experience-based (graph insight) | NONE | NOT YET AVAILABLE |
| 35 | The second law | SHARED | XP-18 | PLANNED | concept animation | NONE | NOT YET AVAILABLE |
| 36 | Third law | SHARED | XP-17 | PLANNED | molecular animation | NONE | NOT YET AVAILABLE |
| 37 | Equilibrium: the G valley | YES | XP-20 | PLANNED | experience-based (graph insight) | NONE | NOT YET AVAILABLE |
| 38 | ΔG° and K | YES | XP-20 | PLANNED | experience-based (worked example) | NONE | NOT YET AVAILABLE |

### 19.2 Concept matrix

The experience count is the number of experiences that serve the concept, as a dedicated or secondary
concept.

| # | Concept | LOs | Opportunity | Best Modality | Experience Count | Priority | Media Potential |
|---|---|---:|---|---|---:|---|---|
| 1 | `SCOPE-OF-THERMODYNAMICS` | 2 | none | no dedicated interactive | 0 | NONE | low |
| 2 | `SYSTEM-AND-SURROUNDINGS` | 2 | moderate | interactive diagram (XP-01) | 1 | P1 | moderate |
| 3 | `TYPES-OF-SYSTEMS` | 2 | strong | interactive diagram (XP-01) | 1 | P1 | strong |
| 4 | `STATE-OF-A-SYSTEM` | 2 | moderate | simulation (XP-02) | 1 | P1 | moderate |
| 5 | `STATE-FUNCTION` | 3 | strong | simulation (XP-02, XP-03; reuse XP-12) | 3 | P0 | strong |
| 6 | `INTERNAL-ENERGY` | 3 | strong | virtual lab (XP-03) | 1 | P0 | strong |
| 7 | `ADIABATIC-PROCESS` | 2 | moderate | virtual lab + diagram (XP-03, XP-04) | 2 | P1 | moderate |
| 8 | `WORK` | 2 | strong | virtual lab (XP-03) | 1 | P0 | strong |
| 9 | `HEAT` | 2 | strong | virtual lab (XP-03) | 1 | P0 | strong |
| 10 | `SIGN-CONVENTION-HEAT-WORK` | 2 | strong | interactive diagram (XP-04; XP-05) | 2 | P1 | strong |
| 11 | `FIRST-LAW` | 3 | strong | virtual lab + diagram (XP-03, XP-04; XP-05) | 3 | P0 | strong |
| 12 | `PRESSURE-VOLUME-WORK` | 3 | strong | graph explorer (XP-05) | 1 | P0 | strong |
| 13 | `REVERSIBLE-IRREVERSIBLE-PROCESSES` | 2 | strong | graph explorer (XP-05; XP-18, XP-20) | 3 | P0 | strong |
| 14 | `REVERSIBLE-ISOTHERMAL-WORK` | 3 | strong | graph explorer + derivation (XP-05) | 1 | P1 | moderate |
| 15 | `FREE-EXPANSION` | 2 | moderate | graph explorer (XP-05) | 1 | P2 | moderate |
| 16 | `ENTHALPY` | 3 | strong | simulation + derivation (XP-06) | 1 | P1 | moderate |
| 17 | `EXOTHERMIC-ENDOTHERMIC` | 2 | moderate | none dedicated (XP-09, XP-11, XP-16) | 3 | NONE | moderate |
| 18 | `DELTA-H-DELTA-U-RELATION` | 3 | strong | virtual lab (XP-09; XP-10, XP-14) | 3 | P0 | strong |
| 19 | `EXTENSIVE-INTENSIVE-PROPERTIES` | 3 | low | interactive diagram (XP-07; XP-08, XP-11) | 3 | P3 | moderate |
| 20 | `HEAT-CAPACITY` | 3 | moderate | virtual lab (XP-08, XP-10) | 2 | P2 | moderate |
| 21 | `CP-CV-RELATION` | 2 | strong | simulation + derivation (XP-06) | 1 | P1 | moderate |
| 22 | `CALORIMETRY` | 3 | strong | virtual lab (XP-09) | 1 | P0 | strong |
| 23 | `REACTION-ENTHALPY` | 2 | moderate | none dedicated (XP-09, XP-11) | 2 | NONE | low |
| 24 | `STANDARD-STATE` | 2 | low | none dedicated (XP-11 callout) | 1 | NONE | low |
| 25 | `PHASE-TRANSFORMATION-ENTHALPY` | 3 | strong | graph explorer + virtual lab (XP-10) | 1 | P1 | strong |
| 26 | `STANDARD-ENTHALPY-OF-FORMATION` | 3 | strong | interactive diagram + data (XP-11; XP-12) | 2 | P1 | moderate |
| 27 | `THERMOCHEMICAL-EQUATION` | 2 | moderate | interactive diagram (XP-11, XP-12) | 2 | P1 | moderate |
| 28 | `HESS-LAW` | 3 | strong | energy-path explorer (XP-12, XP-14) | 2 | P0 | strong |
| 29 | `ENTHALPY-OF-COMBUSTION` | 2 | moderate | none dedicated (XP-12, XP-09) | 2 | NONE | moderate |
| 30 | `ENTHALPY-OF-ATOMIZATION` | 2 | moderate | molecular (XP-13) | 1 | P2 | low |
| 31 | `BOND-ENTHALPY` | 4 | strong | molecular + diagram (XP-13) | 1 | P1 | strong |
| 32 | `LATTICE-ENTHALPY` | 3 | strong | interactive diagram (XP-14; XP-15) | 2 | P1 | strong |
| 33 | `ENTHALPY-OF-SOLUTION` | 4 | moderate | data explorer (XP-15) | 1 | P2 | moderate |
| 34 | `ENTHALPY-OF-DILUTION` | 2 | low | data explorer (XP-15) | 1 | P3 | low |
| 35 | `SPONTANEOUS-PROCESS` | 3 | moderate | interactive diagram (XP-16; XP-17) | 2 | P2 | moderate |
| 36 | `ENTROPY` | 4 | strong | molecular + graph (XP-17, XP-18) | 2 | P0 | strong |
| 37 | `TOTAL-ENTROPY-CHANGE` | 3 | strong | data/graph explorer (XP-18; XP-19) | 2 | P1 | moderate |
| 38 | `GIBBS-ENERGY` | 3 | strong | graph explorer (XP-19) | 1 | P0 | strong |
| 39 | `GIBBS-ENERGY-SPONTANEITY` | 2 | strong | graph explorer + derivation (XP-19) | 1 | P0 | strong |
| 40 | `TEMPERATURE-AND-SPONTANEITY` | 3 | strong | graph explorer (XP-19) | 1 | P0 | strong |
| 41 | `SECOND-LAW` | 2 | low | none dedicated (XP-18) | 1 | NONE | moderate |
| 42 | `THIRD-LAW` | 3 | moderate | none dedicated (XP-17) | 1 | NONE | moderate |
| 43 | `GIBBS-ENERGY-EQUILIBRIUM` | 2 | moderate | graph explorer (XP-20) | 1 | P1 | strong |
| 44 | `STANDARD-GIBBS-ENERGY-EQUILIBRIUM-CONSTANT` | 3 | strong | graph explorer + worked examples (XP-20) | 1 | P1 | strong |

## 20. Recommended production strategy

1. **Follow the book.** Experiences are built in chapter order: 5.1 → 5.2 → 5.3 → 5.4 → 5.5 → 5.6 → 5.7.
   An experience is only moved earlier when a later one depends on it (§17 states each dependency).
2. **Build shared engines once.** Four reusable pieces carry most of the chapter:
   - a **piston–cylinder gas engine** (XP-02, XP-05, XP-06);
   - a **thermometer / water-bath / calorimeter bench** (XP-03, XP-08, XP-09, XP-10);
   - an **enthalpy-level diagram** (XP-11 to XP-16);
   - a **particle box** (XP-17, XP-18).

   Later experiences reuse them, which keeps visuals and units consistent and lowers cost.
3. **Accounting before abstraction.** 5.1 and 5.2 make energy flows visible (boundary, q, w, ΔU, area).
   5.4 and 5.5 turn them into enthalpy diagrams. 5.6 and 5.7 add a second quantity (S, then G) on top
   of the same diagrams.
4. **NCERT numbers, computed.** Presets use values printed in the chapter. Every result is computed by
   the model. A known misprint is never reproduced (Appendix B).
5. **Each experience is publishable alone.** It has its own question to the student, its own aha
   moment, its own media candidate, and a working page even if every later experience is still unbuilt.

---
6. **One topic at a time, both paths.** Advance the series in Part order. Path A parts wait for their
   experience; Path B parts don't wait for anything except their own approval.
7. **Resolve the media seam before the first Watch link.** G1–G5 (§12) must land, as owner-approved
   changes, before any Explorer Watch appears. G6 is needed before the first Path B asset. Until then,
   publishing can proceed through the existing gated tools, and Watch simply stays absent.

## 21. Final summary

- **Interactive:** 44 concepts and 114 objectives analysed; **20 planned experiences** (P0 6, P1 10,
  P2 3, P3 1). 19 serve more than one concept. Five concepts have two complementary experiences. Seven
  concepts have no dedicated interactive. The count was not raised for social coverage.
- **Social:** **39 topics** in a sequential series (Parts 00–38): **32 experience-based** and **7
  social-only**. That is one short per meaningful topic, not per concept. Some shorts merge concepts,
  and some experiences yield several shorts.
- **Read / Explore / Watch:**
  - Read is always available.
  - Explore appears only when a published experience is justified.
  - Watch appears only when VERIFIED, active media exists.
  - Every partial state is valid, and nothing fake is shown.
- **Media → Explorer:**
  - The publication ledger owns URLs.
  - The chapter `watch` entries are references.
  - The feed already resolves only VERIFIED records.
  - Seven gaps (G1–G7) separate this seam from the full strategy; each is a future owner-approved change.
- **Shared experiences:** one page, one record per concept, media made once per page or angle.
- **Pilots:** Path A, XP-01 (Parts 01–02); Path B, Part 00 (needs G6).
- **Next human review:** approve the strategy → select one topic or experience → detailed blueprint →
  build one → scientific + UX QA → approval → media → approval → publish → VERIFIED URL → eventual
  Watch link → next topic.

---

## Appendix A. Concept-by-concept analysis

Format per concept:
- **ID**, title, location and learning objectives (the objective ids drop the `LO-CHE-` prefix);
- what it is, **importance**, **difficulty** (only what the NCERT text supports), **opportunity**;
- **best modality** and the **experience** that serves it;
- **mechanism** (Read → Interact → Observe → Infer) and the **aha** moment;
- **count**: dedicated experiences, plus any that serve it as a secondary concept;
- **JEE application** and **media potential**.

### Introduction

#### 1. `CPT-CHE-SCOPE-OF-THERMODYNAMICS`: Scope of chemical thermodynamics
*intro, p. 136* · LOs: `THERMODYNAMICS-SCOPE-STATES-NOT-RATE`, `THERMODYNAMICS-SCOPE-MACROSCOPIC-EQUILIBRIUM`
- **What:** thermodynamics deals with macroscopic systems and with initial and final equilibrium states,
  not with rate or mechanism.
- **Importance:** enrichment/supporting (framing). **Difficulty:** abstract. "Thermodynamics cannot say
  how fast" is stated here and only becomes concrete in 5.6 (H₂ + O₂ are spontaneous but slow).
- **Opportunity:** none. There is nothing to manipulate; the idea pays off when it reappears.
- **Best modality:** no dedicated interactive. The page text is enough; XP-16 shows "spontaneous ≠ fast" concretely.
- **Mechanism / aha:** read here, realised in XP-16. **Count:** 0.
- **JEE:** low. **Media:** low (it could open a chapter trailer, but it is not an experience).

### 5.1 Thermodynamic terms

#### 2. `CPT-CHE-SYSTEM-AND-SURROUNDINGS`: System, surroundings and boundary
*5.1.1, p. 137* · LOs: `SYSTEM-SURROUNDINGS-IDENTIFY`, `SYSTEM-SURROUNDINGS-BOUNDARY-ROLE`
- **What:** the system is what we observe; the surroundings are what can interact with it; a real or
  imaginary boundary lets matter and energy crossing it be tracked.
- **Importance:** foundational. **Difficulty:** the boundary is a *choice*. NCERT's footnote notes that
  the reactants alone, or the reactants plus the beaker, can be the system. An imaginary boundary is
  invisible.
- **Opportunity:** moderate. Moving the boundary and watching what counts as "crossing" makes the choice visible.
- **Best modality:** interactive diagram, in **XP-01, System and boundary bench**.
- **Mechanism:** read the beaker example (Fig. 5.1) → draw or drag the boundary (reactants only;
  reactants + beaker) → the crossing counters change → infer that system and surroundings are defined by
  where you put the boundary.
- **Aha:** "The same experiment has different systems depending on where I draw the line, and the line
  is what lets me count energy and matter."
- **Count:** 1 (shared). **JEE:** low (a prerequisite for every energy-accounting question). **Media:** moderate (a quick visual hook).

#### 3. `CPT-CHE-TYPES-OF-SYSTEMS`: Open, closed and isolated systems
*5.1.2, pp. 137–138* · LOs: `TYPES-OF-SYSTEMS-COMPARE`, `TYPES-OF-SYSTEMS-CLASSIFY`
- **What:** classification by what crosses the boundary: matter and energy, energy only, or neither.
- **Importance:** foundational. **Difficulty:** two independent switches (matter, energy) and three
  outcomes; everyday containers have to be mapped onto them (open beaker, copper/steel vessel, thermos).
- **Opportunity:** moderate–strong. Toggling *lid* and *insulation* and watching particle and heat arrows
  is the classification.
- **Best modality:** interactive diagram, in **XP-01** (same bench).
- **Mechanism:** read the three definitions → toggle lid (open/closed) and walls (conducting/insulated)
  → matter and energy arrows cross or stop → infer the three classes and classify NCERT's examples.
- **Aha:** "Closing the lid stops matter; insulating stops energy. You need both for an isolated system."
- **Count:** 1 (shared with concept 2). **JEE:** low–moderate (the system type sets which of q, w and Δn
  are possible). **Media:** strong (very visual; quick sorting short).

#### 4. `CPT-CHE-STATE-OF-A-SYSTEM`: State of a thermodynamic system
*5.1.3, p. 138* · LOs: `STATE-OF-SYSTEM-MACROSCOPIC`, `STATE-OF-SYSTEM-INDEPENDENT-VARIABLES`
- **What:** a state is fixed by bulk properties (p, V, T, n), not particle motions; only a minimum number
  are independent.
- **Importance:** foundational. **Difficulty:** microscopic vs macroscopic connection; "fix two, the rest
  follow" is stated, not shown.
- **Opportunity:** moderate. A gas sample where fixing p and T (n fixed) *locks* V shows it immediately.
- **Best modality:** simulation (parameter playground), in **XP-02, One state, many routes**.
- **Mechanism:** read → set p and T → V becomes read-only and takes its value → try to set a third, and
  it is refused → infer that a state needs only a few independent properties, and that bulk values
  describe it although the particles keep moving.
- **Aha:** "Millions of particles move, yet three numbers describe the gas, and once two are fixed the third has no choice."
- **Count:** 1 (shared). **JEE:** moderate (ideal-gas state reasoning; cf. ADV-2026-P1-CHE-Q09, not
  linked from NCERT). **Media:** moderate.

#### 5. `CPT-CHE-STATE-FUNCTION`: State functions
*5.1.3 p. 138; 5.1.4 pp. 139–140; 5.2.2 p. 143; 5.6(b) p. 159; 5.6(c) p. 160* · LOs: `STATE-FUNCTION-DEFINE`, `STATE-FUNCTION-VERSUS-HEAT-WORK`, `STATE-FUNCTION-IDENTIFY`
- **What:** a property whose change depends only on the initial and final states; q and w are not state
  functions, but q + w is.
- **Importance:** high-value (the idea behind ΔU, ΔH, Hess's law, ΔS, ΔG). **Difficulty:** abstraction;
  telling state quantities from path quantities; NCERT's own examples (25 → 35 °C directly or via
  cooling; a pond filled by rain or tubewell) are verbal.
- **Opportunity:** strong. Two routes between the same states, with a live comparison of what changes
  and what does not, *is* the definition.
- **Best modality:** simulation, in two complementary experiences:
  - **XP-02** (5.1.3): p, V, T path independence;
  - **XP-03** (5.1.4): ΔU is path independent while q and w are not.

  Reused later in **XP-12** (Hess).
- **Mechanism:** read → take the gas from A to B by several routes (direct heating; cool first then
  heat) → ΔT and ΔV are identical every time, while the route length and, in XP-03, q and w differ →
  infer the definition and classify quantities.
- **Aha:** "Only the start and the finish matter, for some quantities, and I can tell which ones."
- **Count:** 2 dedicated + 1 reuse. **JEE:** strong (path-independence arguments, cycles, Hess). **Media:** strong.

#### 6. `CPT-CHE-INTERNAL-ENERGY`: Internal energy as a state function
*5.1.4, pp. 138–140* · LOs: `INTERNAL-ENERGY-WAYS-TO-CHANGE`, `INTERNAL-ENERGY-JOULE-STATE-FUNCTION`, `INTERNAL-ENERGY-ONLY-CHANGES`
- **What:** U is the total energy; it changes by heat, work or matter transfer. Joule's equal-work
  experiments show it is a state function. Only ΔU is measurable.
- **Importance:** foundational. **Difficulty:** U is invisible and has no absolute value. The evidence is
  historical (Joule 1840–50): equal *adiabatic work* by different means gives the same ΔT.
- **Opportunity:** strong. Re-running Joule's paddle vs immersion-rod experiment is the textbook argument made hands-on.
- **Best modality:** virtual lab, in **XP-03, Joule's bench**.
- **Mechanism:** read Joule's experiment → do 1 kJ of work by paddles, then 1 kJ electrically, on the
  same insulated water → the same T_B each time → infer that U is fixed by the state. The display shows
  only ΔU, never an absolute U.
- **Aha:** "It doesn't matter *how* I put the 1 kJ in: same final state, same ΔU."
- **Count:** 1 (shared). **JEE:** strong (every first-law problem). **Media:** strong (a historical-experiment reel).

#### 7. `CPT-CHE-ADIABATIC-PROCESS`: Adiabatic system and process
*5.1.4 pp. 138–139; 5.2.1 p. 142* · LOs: `ADIABATIC-PROCESS-DEFINE`, `ADIABATIC-PROCESS-ENERGY`
- **What:** an adiabatic wall allows no heat; q = 0, so ΔU = w_ad.
- **Importance:** important. **Difficulty:** "adiabatic" is not "isothermal"; T can change with no heat.
- **Opportunity:** moderate. The insulated flask in XP-03 is already an adiabatic system; XP-04 adds the
  calculation.
- **Best modality:** virtual lab (XP-03, the wall toggle) + interactive diagram (**XP-04, Energy ledger**).
- **Mechanism:** read → switch the wall from conducting to adiabatic → the heat arrow is blocked, yet work
  still raises T → infer q = 0 and ΔU = w_ad.
- **Aha:** "No heat crossed, and it still got hotter: work alone did it."
- **Count:** 2 (secondary in both). **JEE:** strong (adiabatic steps in cycles; ADV-2026-P1-PHY-Q07 is
  linked as Apply on 5.1.4). **Media:** moderate.

#### 8. `CPT-CHE-WORK`: Work as energy transfer
*5.1.4 pp. 138–139; 5.2.1 p. 140* · LOs: `WORK-CHANGES-INTERNAL-ENERGY`, `WORK-HEAT-COMPARE`
- **What:** mechanical or electrical work changes U; in chemistry, mainly pressure–volume work.
- **Importance:** foundational. **Difficulty:** energy accounting; work done *on* vs *by* the system.
- **Opportunity:** strong as part of XP-03: two different kinds of work give the same effect, and work is
  then contrasted with heat.
- **Best modality:** virtual lab, in **XP-03**.
- **Mechanism:** read 5.1.4(a) → choose paddle or immersion rod and an amount of work → ΔT follows → then
  reach the same ΔT by heat (XP-03 mode 2) → infer that work and heat are two routes for the same ΔU.
- **Aha:** "Work and heat are not things the system *has*; they are energy *crossing* its boundary."
- **Count:** 1 (shared). **JEE:** strong. **Media:** strong (paired with heat).

#### 9. `CPT-CHE-HEAT`: Heat as energy transfer
*5.1.4, p. 139* · LOs: `HEAT-TEMPERATURE-DIFFERENCE`, `HEAT-CHANGES-INTERNAL-ENERGY`
- **What:** energy exchanged because of a temperature difference, through conducting walls; with no work
  at constant volume, ΔU = q.
- **Importance:** foundational. **Difficulty:** "heat" vs "temperature"; invisible flow.
- **Opportunity:** strong in XP-03 mode 2: copper walls in a reservoir at T_B, with flow driven by and
  ending at equal temperature.
- **Best modality:** virtual lab, in **XP-03**.
- **Mechanism:** read 5.1.4(b) → put the water (at T_A) in copper walls inside a reservoir at T_B → the
  flow arrow runs while T_A < T_B and stops at equality → q is read from ΔT → infer that heat is driven by
  the temperature difference and that q = ΔU here.
- **Aha:** "Heat stops when the temperatures match. The difference drives it."
- **Count:** 1 (shared). **JEE:** strong. **Media:** strong.

#### 10. `CPT-CHE-SIGN-CONVENTION-HEAT-WORK`: IUPAC sign convention for heat and work
*5.1.4 p. 139; 5.2.1 p. 141* · LOs: `SIGN-CONVENTION-PREDICT`, `SIGN-CONVENTION-COMPARE-PHYSICS`
- **What:** q and w are positive when energy enters the system; NCERT's footnote says physics books still
  use the opposite sign for work.
- **Importance:** high-value. **Difficulty:** sign convention, and the clash with physics texts (stated by NCERT itself).
- **Opportunity:** strong. Arrows that point into or out of the system, with the sign attached, plus a
  "physics convention" toggle that rewrites the equation.
- **Best modality:** interactive diagram, in **XP-04, Energy ledger**. It also appears in **XP-05**
  (compression work comes out positive).
- **Mechanism:** read → place q and w arrows for NCERT's Problem 5.1 cases → predict the signs → reveal →
  toggle IUPAC/physics and watch ΔU = q + w become ΔU = q − w with the same physics → infer that the
  convention is bookkeeping and only consistency matters.
- **Aha:** "Into the system is +. The physics book isn't wrong; it counts work from the other side."
- **Count:** 2 (dedicated XP-04; secondary XP-05). **JEE:** strong (the sign errors JEE punishes;
  chemistry vs physics cross-subject). **Media:** strong (a "two books, one equation" short).

#### 11. `CPT-CHE-FIRST-LAW`: First law of thermodynamics
*5.1.4 p. 140; 5.2.1 p. 142* · LOs: `FIRST-LAW-STATE`, `FIRST-LAW-CALCULATE`, `FIRST-LAW-SPECIAL-CASES`
- **What:** ΔU = q + w; q and w vary with the route but their sum doesn't; the energy of an isolated
  system is constant.
- **Importance:** foundational. **Difficulty:** energy accounting with signs; special cases (isolated,
  constant volume, isothermal ideal gas).
- **Opportunity:** strong. Two complementary experiences:
  - **XP-03** (discovery): the same ΔU reached by mixing q and w in different proportions;
  - **XP-04** (accounting): an energy ledger for any process, and the special cases.

  Also in **XP-05**, where isothermal q = −w is shown.
- **Best modality:** virtual lab (XP-03) + interactive diagram (XP-04).
- **Mechanism:** read eq. 5.1 → split the same ΔU between q and w with a slider → the sum is locked, the
  parts are free → in the ledger, set up isolated, constant-V and isothermal cases → infer ΔU = q + w and
  its special forms.
- **Aha:** "q and w trade off freely; their sum is set by the states."
- **Count:** 2 dedicated + 1 secondary. **JEE:** strong (ADV-2026-P1-PHY-Q07 heat flows in a cycle;
  Exercise 5.7). **Media:** strong.

### 5.2 Applications

#### 12. `CPT-CHE-PRESSURE-VOLUME-WORK`: Pressure–volume work
*5.2.1, pp. 140–142* · LOs: `PV-WORK-DERIVE`, `PV-WORK-CALCULATE`, `PV-WORK-AREA`
- **What:** w = −p_ex ΔV; finite steps give −Σ p ΔV; work is the area under the external-pressure path (Fig. 5.5).
- **Importance:** high-value. **Difficulty:** graph interpretation (area = work); sign; which pressure (external) is used.
- **Opportunity:** strong. NCERT itself draws three p–V plots (single step, finite steps, reversible);
  making them live is the most natural interactive in the chapter.
- **Best modality:** graph explorer + simulation, in **XP-05, p–V work explorer**, with a derivation panel.
- **Mechanism:** read Fig. 5.5 → compress in 1, 2, … N steps (or reversibly) → the shaded area and the
  w counter update → infer that work is the area under p_ex, and that it depends on the path.
- **Aha:** "More steps, less work to compress, and the area shows exactly how much."
- **Count:** 1 (dedicated). **JEE:** strong (ADV-2026-P1-CHE-Q01, the two-step compression bench, is
  linked as Apply on 5.2.1). **Media:** strong (an area-fill animation is a natural short).

#### 13. `CPT-CHE-REVERSIBLE-IRREVERSIBLE-PROCESSES`: Reversible and irreversible processes
*5.2.1 pp. 141–142; 5.7 p. 162* · LOs: `REVERSIBLE-PROCESS-DESCRIBE`, `REVERSIBLE-IRREVERSIBLE-COMPARE`
- **What:** reversible means reversible at any moment by an infinitesimal change, passing through
  equilibrium states, infinitely slowly; every other process is irreversible.
- **Importance:** high-value. **Difficulty:** an idealised limit; "infinitely slow"; p_ex = p_in ± dp.
- **Opportunity:** strong. The step-count slider in XP-05 shows the limit being approached, both
  numerically and on the graph.
- **Best modality:** graph explorer, in **XP-05**; revisited in **XP-18** (ΔS_total distinguishes the two)
  and **XP-20** (the chemical sense of "reversible").
- **Mechanism:** read → raise N → the staircase hugs the gas isotherm and the work converges → at any
  step, try a "nudge back": the irreversible case cannot retrace → infer that the reversible process is
  the infinite-step limit, always in near equilibrium.
- **Aha:** "Reversible is a limit you approach, not a speed you choose."
- **Count:** 1 dedicated + 2 secondary. **JEE:** strong (reversible vs irreversible work and heat). **Media:** strong.

#### 14. `CPT-CHE-REVERSIBLE-ISOTHERMAL-WORK`: Work in reversible isothermal expansion
*5.2.1, pp. 142–143* · LOs: `REVERSIBLE-ISOTHERMAL-WORK-DERIVE`, `REVERSIBLE-ISOTHERMAL-WORK-CALCULATE`, `REVERSIBLE-IRREVERSIBLE-WORK-COMPARE`
- **What:** w_rev = −2.303 nRT log(V_f/V_i); for an isothermal ideal gas q = −w. Problems 5.2–5.4 do the
  same expansion three ways.
- **Importance:** important. **Difficulty:** mathematical abstraction (integral to logarithm); comparing three routes.
- **Opportunity:** strong. A side-by-side of vacuum, constant 1 atm and reversible on the same p–V axes
  is NCERT's Problems 5.2–5.4 made visual.
- **Best modality:** graph explorer + interactive derivation, in **XP-05** (mode 3, "Same expansion, three ways").
- **Mechanism:** read Problems 5.2–5.4 → run the same 2 L → 10 L expansion into vacuum, against 1 atm and
  reversibly → the areas are 0, 8 and the reversible value → step through the derivation (Σ → ∫ → ln) →
  infer that reversible expansion delivers the most work.
- **Aha:** "Same start, same finish, three different works. The reversible path gives the most."
- **Count:** 1 (shared). **JEE:** strong. **Media:** moderate–strong.
- **Errata flag:** Problem 5.4 states "1 mol", but Problem 5.2's gas (2 L at 10 atm, 25 °C) is about
  0.818 mol. The experience must compute n from the chosen state and not reproduce 39.37 L atm as the
  answer to Problem 5.2's gas (Appendix C).

#### 15. `CPT-CHE-FREE-EXPANSION`: Free expansion of an ideal gas
*5.2.1, p. 142* · LOs: `FREE-EXPANSION-NO-WORK`, `FREE-EXPANSION-FIRST-LAW`
- **What:** p_ex = 0, so w = 0; for the isothermal free expansion of an ideal gas q = 0 (Joule), so ΔU = 0.
- **Importance:** important (small, but a classic case). **Difficulty:** "the gas expanded, so surely it did work?"
- **Opportunity:** moderate. Setting p_ex to 0 in XP-05 makes the shaded area vanish.
- **Best modality:** graph explorer, in **XP-05** (the p_ex = 0 preset).
- **Mechanism:** read → set p_ex = 0 → the piston flies out, the area stays zero and the ledger shows
  q = w = ΔU = 0 → infer that work needs something to push against.
- **Aha:** "Expanding into nothing does no work."
- **Count:** 1 (shared). **JEE:** moderate. **Media:** moderate.

#### 16. `CPT-CHE-ENTHALPY`: Enthalpy
*5.2.2, p. 143* · LOs: `ENTHALPY-WHY-DEFINED`, `ENTHALPY-DERIVE-QP`, `ENTHALPY-STATE-FUNCTION`
- **What:** H = U + pV; at constant pressure ΔH = q_p; it is defined because most reactions run at constant pressure.
- **Importance:** foundational. **Difficulty:** why a "new" function is needed; at constant pressure part
  of q goes into expansion work.
- **Opportunity:** strong. Heating the same gas in a rigid box and under a free piston shows the
  expansion share of q directly.
- **Best modality:** simulation + derivation panel, in **XP-06, Heat it two ways**.
- **Mechanism:** read 5.2.2(a) → supply heat at constant V, then at constant p, for the same ΔT → the
  constant-p run needs more heat; the extra equals pΔV → step from ΔU = q_p − pΔV to q_p = ΔH → infer that
  H accounts for the expansion work automatically.
- **Aha:** "At constant pressure some of my heat leaks out as work. Enthalpy is the bookkeeping that includes it."
- **Count:** 1 (dedicated, shared page). **JEE:** strong (ADV-2026-P1-PHY-Q11, the two-chamber heat lab,
  is linked as Apply on 5.2.2). **Media:** moderate–strong.
- **Errata flag:** p. 143 states ΔH = ΔU = q_V at constant volume. That holds only when VΔp is negligible
  (Appendix C). The constant-V mode must not state it generally.

#### 17. `CPT-CHE-EXOTHERMIC-ENDOTHERMIC`: Exothermic and endothermic reactions
*5.2.2 p. 143; 5.3 p. 146; 5.6 pp. 157–158* · LOs: `EXOTHERMIC-ENDOTHERMIC-SIGN`, `EXOTHERMIC-ENDOTHERMIC-DIAGRAM`
- **What:** ΔH < 0 when heat is evolved, ΔH > 0 when absorbed; enthalpy diagrams (Fig. 5.10).
- **Importance:** foundational, but simple. **Difficulty:** a sign convention viewed from the system side
  ("the beaker gets hot, so ΔH is negative").
- **Opportunity:** moderate, but no dedicated experience is needed. Every enthalpy experience shows it.
- **Best modality:** no dedicated interactive. It is served by **XP-09** (calorimeter warms → q_p < 0),
  **XP-11** (enthalpy-level diagram) and **XP-16** (Fig. 5.10 diagrams).
- **Mechanism / aha:** "The surroundings warm because the system's enthalpy went down."
- **Count:** 0 dedicated, 3 serving. **JEE:** moderate. **Media:** moderate.

#### 18. `CPT-CHE-DELTA-H-DELTA-U-RELATION`: Relationship between ΔH and ΔU
*5.2.2 pp. 143–144; 5.3 p. 146; 5.4 pp. 148–149; 5.5 p. 156* · LOs: `DELTA-H-DELTA-U-DERIVE`, `DELTA-H-DELTA-U-CALCULATE`, `DELTA-H-DELTA-U-WHEN-SIGNIFICANT`
- **What:** ΔH = ΔU + Δn_gRT; insignificant for solids and liquids.
- **Importance:** high-value. **Difficulty:** counting gaseous moles only; units (J vs kJ); when the difference matters.
- **Opportunity:** strong. The same reaction measured in a bomb (ΔU) and at constant pressure (ΔH); the
  gap tracks Δn_g. This is the owner-approved pilot `CON-CHE-DELTA-U-VS-DELTA-H`.
- **Best modality:** virtual lab, in **XP-09, Two calorimeters, one reaction**. Revisited in **XP-10**
  (vaporisation, Problems 5.5 and 5.7) and **XP-14** (lattice ΔU = ΔH − 2RT).
- **Mechanism:** read eq. 5.10 → choose a reaction with Δn_g < 0, = 0 or > 0 (or only solids/liquids) →
  run both calorimeters → the bars differ by Δn_gRT, and match when Δn_g = 0 (graphite, Problem 5.6) →
  infer the rule and when it matters.
- **Aha:** "Only the gas count changes the answer. Graphite burning gives ΔH = ΔU exactly."
- **Count:** 1 dedicated + 2 secondary. **JEE:** strong (Exercise 5.4 type; ADV-2026-P1-PHY-Q11).
  **Media:** strong.
- **Errata flag:** Exercise 5.8 writes cyanamide as (s) in the text and (g) in the equation, which
  changes Δn_g. Don't use it as a preset until the owner decides (Appendix C).

#### 19. `CPT-CHE-EXTENSIVE-INTENSIVE-PROPERTIES`: Extensive and intensive properties
*5.2.2 p. 144; 5.4 p. 151; 5.6(c) p. 160* · LOs: `EXTENSIVE-INTENSIVE-CLASSIFY`, `EXTENSIVE-INTENSIVE-PARTITION`, `EXTENSIVE-INTENSIVE-MOLAR`
- **What:** extensive properties depend on the amount; intensive ones don't; a molar property is intensive.
- **Importance:** important. **Difficulty:** low; the molar-property twist (extensive ÷ n = intensive).
- **Opportunity:** low–moderate. NCERT's partition thought experiment (Fig. 5.6) is a neat but quick interaction.
- **Best modality:** interactive diagram, in **XP-07, The partition test** (small). Reinforced in **XP-08**
  (C vs C_m) and **XP-11** (halving an equation halves ΔrH, p. 151).
- **Mechanism:** read → drop the partition → a property table updates (V, n, U, H, C halve; T, p, ρ, V_m,
  C_m stay) → sort the cards → infer the rule and the molar trick.
- **Aha:** "Cut the system in half: what halves is extensive; divide by n and it stops halving."
- **Count:** 1 dedicated + 2 secondary. **JEE:** low–moderate. **Media:** moderate (a quick sorting short).

#### 20. `CPT-CHE-HEAT-CAPACITY`: Heat capacity, molar and specific heat capacity
*5.2.2, pp. 144–145* · LOs: `HEAT-CAPACITY-MEANING`, `HEAT-CAPACITY-COMPARE-FORMS`, `HEAT-CAPACITY-CALCULATE`
- **What:** q = CΔT; C depends on size and nature; C_m per mole, c per gram (q = c m ΔT).
- **Importance:** important. **Difficulty:** three related quantities and their units; water's large heat
  capacity as a meaning, not just a number.
- **Opportunity:** moderate. A heating bench with the same heat into different samples gives different ΔT.
- **Best modality:** virtual lab, in two complementary experiences:
  - **XP-08, Heat capacity bench** (5.2.2(c));
  - **XP-10, Heating curve** (5.4(b)), where the sloped segments *are* heat capacity.
- **Mechanism:** read → put the same q into water vs aluminium, and 1 g vs 60 g (Exercise 5.9) → ΔT
  differs → compute C, C_m and c from the readings → infer what each one normalises.
- **Aha:** "Water barely warms. That is what a large heat capacity means."
- **Count:** 2. **JEE:** moderate (calorimetry arithmetic). **Media:** moderate.

#### 21. `CPT-CHE-CP-CV-RELATION`: Relationship between C_p and C_v for an ideal gas
*5.2.2, p. 145* · LOs: `CP-CV-DERIVE`, `CP-CV-EXPLAIN-DIFFERENCE`
- **What:** C_p − C_v = R, from ΔH = ΔU + RΔT for one mole.
- **Importance:** important. **Difficulty:** mathematical; why constant pressure needs more heat.
- **Opportunity:** strong as a mode of XP-06: heat one mole by 1 K both ways; the difference is R.
- **Best modality:** simulation + derivation panel, in **XP-06**.
- **Mechanism:** read eq. 5.12 → raise 1 mol by 1 K at constant V and at constant p → q_p − q_V = 8.314 J →
  step through the derivation → infer C_p − C_v = R.
- **Aha:** "The extra heat at constant pressure is exactly R per mole per kelvin: the expansion work."
- **Count:** 1 (shared). **JEE:** strong (C_p, C_v across physics and chemistry). **Media:** moderate.

### 5.3 Calorimetry

#### 22. `CPT-CHE-CALORIMETRY`: Calorimetry: measuring ΔU and ΔH
*5.3, pp. 145–146* · LOs: `CALORIMETRY-BOMB-DELTA-U`, `CALORIMETRY-CONSTANT-PRESSURE-DELTA-H`, `CALORIMETRY-CALCULATE`
- **What:** a bomb calorimeter (constant V) gives ΔU; a constant-pressure calorimeter gives ΔH; q = CΔT.
- **Importance:** high-value. **Difficulty:** which quantity each apparatus measures; sign (heat gained by
  the calorimeter = −q of the reaction).
- **Opportunity:** strong. A real procedure with readings; NCERT's Figs. 5.7 and 5.8 and Problem 5.6.
- **Best modality:** virtual lab, in **XP-09** (pilot `CON-CHE-DELTA-U-VS-DELTA-H`).
- **Mechanism:** read → burn 1 g graphite in the bomb (C = 20.7 kJ K⁻¹), read ΔT → q = −CΔT → scale to per
  mole → repeat at constant pressure → infer what each apparatus measures and why.
- **Aha:** "Sealing the vessel stops the work, so the bomb reads ΔU; open to the air, it reads ΔH."
- **Count:** 1 (shared). **JEE:** strong. **Media:** strong (a virtual-lab demo reel).
- **Errata flag:** Problem 5.6 prints ΔU "−20.7 kJ K⁻¹"; the experience shows kJ (Appendix C).

### 5.4 Enthalpy change of a reaction

#### 23. `CPT-CHE-REACTION-ENTHALPY`: Reaction enthalpy
*5.3 p. 146; 5.4 pp. 146–147* · LOs: `REACTION-ENTHALPY-DEFINE`, `REACTION-ENTHALPY-USES`
- **What:** Δ_rH = Σ a_i H(products) − Σ b_i H(reactants); the heat of reaction at constant pressure.
- **Importance:** foundational. **Difficulty:** absolute H values are never measured; the definition is
  conceptual until formation enthalpies supply a zero.
- **Opportunity:** moderate, but best served inside experiences that already measure or compute it.
- **Best modality:** no dedicated interactive. Served by **XP-09** (measured as q_p) and **XP-11**
  (computed on the enthalpy ladder).
- **Mechanism / aha:** "Δ_rH is the drop or rise between the product and reactant levels, measurable as
  heat at constant pressure."
- **Count:** 0 dedicated, 2 serving. **JEE:** moderate. **Media:** low on its own.

#### 24. `CPT-CHE-STANDARD-STATE`: Standard state and standard reaction enthalpy
*5.4(a), p. 147* · LOs: `STANDARD-STATE-DEFINE`, `STANDARD-STATE-WHY`
- **What:** the pure form of a substance at 1 bar at the stated temperature; ΔH° when everything is in its standard state.
- **Importance:** important (a convention). **Difficulty:** low; temperature is *not* fixed by the
  definition (NCERT: iron at 500 K), though data are usually at 298 K.
- **Opportunity:** low. It is a definition and a convention.
- **Best modality:** no dedicated interactive. A callout card in **XP-11** (each species badge shows its
  standard state, with NCERT's ethanol and iron examples).
- **Count:** 0 dedicated, 1 serving (callout). **JEE:** low–moderate. **Media:** low.

#### 25. `CPT-CHE-PHASE-TRANSFORMATION-ENTHALPY`: Enthalpy changes of phase transformations
*5.4(b), pp. 147–149* · LOs: `PHASE-ENTHALPY-COMPARE`, `PHASE-ENTHALPY-INTERMOLECULAR`, `PHASE-ENTHALPY-CALCULATE`
- **What:** Δ_fusH, Δ_vapH and Δ_subH are positive, at constant T and p; their size reflects intermolecular
  forces (water vs acetone); Problems 5.7 and 5.8.
- **Importance:** high-value. **Difficulty:** "heat goes in but the temperature doesn't rise"; multi-step
  processes (Problem 5.8, Exercise 5.10).
- **Opportunity:** strong. A heating or cooling curve with plateaus is the clearest picture of phase-change enthalpy.
- **Best modality:** graph explorer + virtual lab, in **XP-10, Heating curve of water**.
- **Mechanism:** read → heat ice at a steady rate → the temperature–heat curve shows slopes (C) and
  plateaus (Δ_fusH, Δ_vapH) → reverse the run (freezing releases the same heat) → step through Problem
  5.8 (100 °C water → ice at 0 °C) → infer what each segment means.
- **Aha:** "On the flat parts all the heat goes into breaking intermolecular attractions, not into temperature."
- **Count:** 1 (dedicated). **JEE:** moderate–strong (heating-curve and multi-step enthalpy problems). **Media:** strong.

#### 26. `CPT-CHE-STANDARD-ENTHALPY-OF-FORMATION`: Standard enthalpy of formation
*5.4(c), pp. 149–151* · LOs: `FORMATION-ENTHALPY-DEFINE`, `FORMATION-ENTHALPY-ELEMENTS-ZERO`, `FORMATION-ENTHALPY-CALCULATE-REACTION`
- **What:** forming 1 mol of a compound from its elements in their reference states; zero for those
  elements; Δ_rH° = Σ a Δ_fH°(products) − Σ b Δ_fH°(reactants).
- **Importance:** high-value. **Difficulty:** what counts as a formation reaction (NCERT's CaCO₃ and HBr
  counter-examples); why elements sit at zero.
- **Opportunity:** strong. An enthalpy "ladder" with elements on the zero line and compounds placed at
  their Δ_fH° makes eq. 5.15 a picture.
- **Best modality:** interactive diagram + data explorer, in **XP-11, Formation-enthalpy ladder**.
  Reused in **XP-12** (combustion data → formation).
- **Mechanism:** read → place reactants and products of CaCO₃ → CaO + CO₂ on the ladder → the arrow between
  the two levels is Δ_rH° = +178.3 kJ mol⁻¹ (endothermic, "heat it") → test whether candidate reactions
  are formation reactions → infer eq. 5.15.
- **Aha:** "Put the elements at zero and every compound gets an address. Any reaction is just the climb
  between addresses."
- **Count:** 1 dedicated + 1 reuse. **JEE:** strong. **Media:** moderate–strong.
- **Errata flag:** p. 150 prints Δ_rH° = −178.3 kJ mol⁻¹ for H₂ + Br₂ → 2HBr, the CaO value repeated. The
  experience computes 2 × (−36.4) = −72.8 kJ mol⁻¹ from Δ_fH°(HBr) and never shows −178.3 for it (Appendix C).

#### 27. `CPT-CHE-THERMOCHEMICAL-EQUATION`: Thermochemical equations
*5.4(d), pp. 150–151* · LOs: `THERMOCHEMICAL-EQUATION-CONVENTIONS`, `THERMOCHEMICAL-EQUATION-SCALE-REVERSE`
- **What:** physical states are written; coefficients are moles; Δ_rH is per mole of reaction as written;
  it scales with the coefficients and changes sign on reversal.
- **Importance:** important. **Difficulty:** "per mole of reaction"; halving an equation halves Δ_rH (Fe₂O₃: −33.3 → −16.6).
- **Opportunity:** moderate–strong. The scale and reverse buttons on an equation, with the Δ_rH arrow
  responding, are exactly the conventions.
- **Best modality:** interactive diagram, in **XP-11** (equation card with ×½, ×2 and reverse). Used again
  as the manipulation tool in **XP-12**.
- **Mechanism:** read → halve the Fe₂O₃ equation → the arrow halves → reverse N₂ + 3H₂ → 2NH₃ → the arrow
  flips (−91.8 → +91.8) → infer the conventions.
- **Aha:** "Δ_rH belongs to the equation as written: scale it, scale ΔH; flip it, flip the sign."
- **Count:** 2 (shared). **JEE:** strong (Hess-type manipulation). **Media:** moderate.

#### 28. `CPT-CHE-HESS-LAW`: Hess's law of constant heat summation
*5.4(e) pp. 151–152; 5.5 pp. 152–153; 5.5 pp. 155–156* · LOs: `HESS-LAW-EXPLAIN`, `HESS-LAW-APPLY`, `HESS-LAW-CYCLE`
- **What:** because H is a state function, Δ_rH is the same for one step or many; it lets unmeasurable
  enthalpies be computed (C + ½O₂ → CO).
- **Importance:** high-value. **Difficulty:** multiple variables; combining, reversing and scaling
  equations; seeing *why* routes agree.
- **Opportunity:** strong. An energy-path "staircase" where the student builds routes between the same
  two levels. This is the owner-approved pilot `CON-CHE-HESS-LAW`.
- **Best modality:** energy-path explorer (interactive diagram) with worked-example presets, in two
  complementary experiences:
  - **XP-12, The enthalpy staircase**;
  - **XP-14, Born–Haber cycle builder** (Hess applied to a quantity nobody can measure directly).
- **Mechanism:** read → target C(graphite) + ½O₂ → CO → drag in reactions (i) and (ii), reverse (ii) →
  the staircase closes at −110.5 kJ mol⁻¹ → try another route: same total → infer the law, and why
  (H is a state function).
- **Aha:** "Up and down by any staircase, the height between floors doesn't change."
- **Count:** 2 dedicated. **JEE:** strong. **Media:** strong.

### 5.5 Enthalpies for different types of reactions

#### 29. `CPT-CHE-ENTHALPY-OF-COMBUSTION`: Standard enthalpy of combustion
*5.5(a), pp. 152–153* · LOs: `COMBUSTION-ENTHALPY-DEFINE`, `COMBUSTION-ENTHALPY-FORMATION`
- **What:** the enthalpy change per mole burnt completely, in standard states; butane, glucose; combustion
  data give formation enthalpies (Problem 5.9, Exercise 5.5).
- **Importance:** important. **Difficulty:** a combustion → formation conversion is a Hess problem.
- **Opportunity:** moderate, best as a Hess application rather than alone.
- **Best modality:** no dedicated interactive. Served by **XP-12** (preset "From combustion to formation":
  CH₄ from Exercise 5.5, benzene from Problem 5.9) and **XP-09** (burning graphite in the bomb).
- **Mechanism / aha:** "Burn everything to CO₂ and H₂O, and those common products let you work backwards to formation."
- **Count:** 0 dedicated, 2 serving. **JEE:** strong (a standard formation-from-combustion step). **Media:** moderate.
- **Errata flag:** Problem 5.9 as printed gives −3267.0 for the reversed equation and −48.51 kJ mol⁻¹ for
  benzene. The arithmetic of the printed lines gives +48.51 (Appendix C). The preset computes the value
  and never shows the printed sign.

#### 30. `CPT-CHE-ENTHALPY-OF-ATOMIZATION`: Enthalpy of atomization
*5.5(b), p. 153* · LOs: `ATOMIZATION-ENTHALPY-DESCRIBE`, `ATOMIZATION-ENTHALPY-RELATE`
- **What:** breaking a substance completely into gaseous atoms (H₂, CH₄, Na); equals the bond dissociation
  enthalpy for a diatomic, and the sublimation enthalpy for sodium.
- **Importance:** important. **Difficulty:** relating three named enthalpies that coincide in special cases.
- **Opportunity:** moderate, as the first rung of the bond ladder.
- **Best modality:** molecular visualization, in **XP-13** (an "atomize" button for H₂, CH₄ and Na(s)).
- **Mechanism:** read → atomize H₂ (435 kJ = its bond enthalpy) and Na(s) (108.4 kJ = its sublimation) →
  infer when the names coincide.
- **Aha:** "For H₂, breaking the bond *is* atomizing it; for sodium, vaporizing it is."
- **Count:** 1 (shared). **JEE:** moderate (Born–Haber inputs). **Media:** low–moderate.
- **Errata flag:** the atomization wording ("one mole of bonds") is flagged; the experience shows the
  enthalpy per mole of substance, as NCERT's CH₄ example (1665 kJ mol⁻¹) does (Appendix C).

#### 31. `CPT-CHE-BOND-ENTHALPY`: Bond dissociation and mean bond enthalpy
*5.5(c), pp. 153–155* · LOs: `BOND-ENTHALPY-COMPARE`, `BOND-ENTHALPY-MEAN-CALCULATE`, `BOND-ENTHALPY-REACTION-ESTIMATE`, `BOND-ENTHALPY-LIMITS`
- **What:** the successive C–H steps in CH₄ differ (427, 439, 452, 347 kJ mol⁻¹), so a mean (416) is
  used; gas-phase Δ_rH ≈ Σ BE(reactants) − Σ BE(products), approximately.
- **Importance:** high-value. **Difficulty:** microscopic/macroscopic connection; "mean" vs individual
  values; the sign of the formula (breaking costs energy, forming releases it).
- **Opportunity:** strong. Pulling H atoms off CH₄ one at a time, with a growing energy ladder, shows why a mean is needed.
- **Best modality:** molecular visualization + energy diagram, in **XP-13, Bond-breaking ladder**.
- **Mechanism:** read → remove each H from CH₄; each step's energy appears, the total is 1665, the mean
  416 → estimate a gas-phase Δ_rH by breaking reactant bonds (up) and forming product bonds (down) →
  compare with the Δ_fH route where data exist → infer the method and its limits (gases only, approximate).
- **Aha:** "The four C–H bonds look identical, but each one costs a different amount to break, so tables use an average."
- **Count:** 1 (dedicated). **JEE:** strong (bond-enthalpy estimates; Exercise 5.15). **Media:** strong (molecular animation).

#### 32. `CPT-CHE-LATTICE-ENTHALPY`: Lattice enthalpy and the Born–Haber cycle
*5.5(d), pp. 155–156* · LOs: `LATTICE-ENTHALPY-DEFINE`, `LATTICE-ENTHALPY-BORN-HABER`, `LATTICE-ENTHALPY-WHY-INDIRECT`
- **What:** 1 mol of ionic solid → gaseous ions (+788 kJ mol⁻¹ for NaCl), found indirectly through a cycle whose sum is zero.
- **Importance:** high-value. **Difficulty:** five steps with signs (sublimation, ionization, ½ bond
  dissociation, electron gain, formation); "the sum round a cycle is zero".
- **Opportunity:** strong. Building the cycle step by step on an enthalpy diagram (Fig. 5.9) is far
  clearer than the list.
- **Best modality:** interactive diagram, in **XP-14, Born–Haber cycle builder**.
- **Mechanism:** read → place each step for NaCl as a rising or falling arrow → the last gap closes at
  +788 → infer why it must be found indirectly, and that it is Hess's law → note ΔU = ΔH − 2RT = +783
  (Δn_g = 2).
- **Aha:** "Nobody can measure lattice enthalpy directly, but go round the loop and the missing arrow has only one possible length."
- **Count:** 1 dedicated + 1 reuse (XP-15). **JEE:** strong. **Media:** strong.
- **Optional enrichment:** the ionization-energy vs ionization-enthalpy box (p. 155, 5/2 RT) as an
  info panel only. It is not needed for any objective.

#### 33. `CPT-CHE-ENTHALPY-OF-SOLUTION`: Enthalpy of solution
*5.5(e), p. 156* · LOs: `SOLUTION-ENTHALPY-LATTICE-HYDRATION`, `SOLUTION-ENTHALPY-CALCULATE`, `SOLUTION-ENTHALPY-HIGH-LATTICE`, `SOLUTION-ENTHALPY-SOLUBILITY`
- **What:** Δ_solH = Δ_latticeH + Δ_hydH; NaCl +788 − 784 = +4; positive for most salts, so solubility
  rises with T; a very high lattice enthalpy can stop dissolution.
- **Importance:** important. **Difficulty:** competition between two large, opposite terms.
- **Opportunity:** moderate. A two-arrow balance between lattice (up) and hydration (down) is a good
  visual; temperature effects stay qualitative.
- **Best modality:** data explorer + diagram, in **XP-15, Dissolve and dilute**.
- **Mechanism:** read → set NaCl's terms (from the text) → the net arrow is +4 kJ mol⁻¹ → raise the lattice
  term in "what if" mode (labelled hypothetical) → the net turns strongly endothermic → infer the balance
  and NCERT's qualitative predictions.
- **Aha:** "Two huge numbers almost cancel. Dissolving salt is a tug-of-war between the lattice and the water."
- **Count:** 1 (shared). **JEE:** moderate. **Media:** moderate.

#### 34. `CPT-CHE-ENTHALPY-OF-DILUTION`: Enthalpy of dilution
*5.5(f), pp. 156–157* · LOs: `DILUTION-ENTHALPY-EXPLAIN`, `DILUTION-ENTHALPY-CALCULATE`
- **What:** the HCl series (−69.01, −72.03, −72.79, −74.85 kJ mol⁻¹) approaches a limit; the difference
  between two dilutions (−0.76) is the enthalpy of dilution.
- **Importance:** enrichment/supporting. **Difficulty:** reading a trend toward a limit; subtracting equations.
- **Opportunity:** low–moderate. Plotting NCERT's four points toward the infinite-dilution limit is the
  whole idea.
- **Best modality:** data explorer, in **XP-15** (second panel).
- **Mechanism:** read → plot ΔH against mol of water → pick two points → the difference is the enthalpy
  of dilution → infer the dependence on concentration and on the amount added.
- **Aha:** "Adding more water still releases a little heat, less and less, toward a limit."
- **Count:** 1 (shared). **JEE:** low. **Media:** low.

### 5.6 Spontaneity

#### 35. `CPT-CHE-SPONTANEOUS-PROCESS`: Spontaneous processes
*5.6 and 5.6(a), pp. 157–158* · LOs: `SPONTANEOUS-PROCESS-MEANING`, `SPONTANEOUS-PROCESS-DIRECTION`, `SPONTANEOUS-PROCESS-ENTHALPY-NOT-ENOUGH`
- **What:** a spontaneous process can proceed without external agency, in one direction; this says nothing
  about rate (H₂ + O₂); a fall in enthalpy may contribute but is not the sole criterion.
- **Importance:** high-value. **Difficulty:** misconception-prone, as NCERT itself states: "spontaneous"
  is not "immediate"; "energy goes downhill" is not the whole story.
- **Opportunity:** moderate. A gallery of processes the student tries to run forward and backward.
- **Best modality:** interactive diagram with short animations, in **XP-16, Which way does it go?**.
  Diffusion (ΔH = 0) continues in **XP-17**.
- **Mechanism:** read → run each scene forward (heat flow, gas filling a box, H₂ + O₂ "very slowly"),
  then try to reverse it (refused without an agency) → compare the scenes' ΔH, including an endothermic
  change that still happens (water evaporating from a swimmer's skin, Problem 5.7) → infer that ΔH alone
  cannot decide.
- **Aha:** "Some changes go uphill in enthalpy and still happen, so something else must be driving them."
- **Count:** 1 dedicated + 1 secondary. **JEE:** moderate (sign reasoning; ADV-2026-P1-CHE-Q13). **Media:** moderate.
- **Errata flag:** NCERT's two endothermic examples, ½N₂ + O₂ → NO₂ and C + 2S → CS₂, are presented as
  spontaneous. Under standard conditions both have positive Δ_fG°, so they are **not** used as
  spontaneous examples (Appendix C).

#### 36. `CPT-CHE-ENTROPY`: Entropy
*5.6(b), pp. 158–160* · LOs: `ENTROPY-DISORDER`, `ENTROPY-PREDICT-CHANGE`, `ENTROPY-QREV-OVER-T`, `ENTROPY-CALCULATE`
- **What:** a state function measuring randomness; solid < liquid < gas for a given substance; ΔS = q_rev/T;
  sign predictions (Problem 5.10).
- **Importance:** high-value. **Difficulty:** invisible; microscopic ↔ macroscopic; why the same heat
  matters more at low T.
- **Opportunity:** strong. Two complementary experiences:
  - **XP-17**, molecular: the partition-removal mixing of Fig. 5.11, phases, particles warming;
  - **XP-18**, accounting: q_rev/T, then ΔS_total.
- **Best modality:** molecular visualization (XP-17) + graph/data explorer (XP-18).
- **Mechanism:** read → remove the partition between two gases → they mix and never unmix → step through
  solid → liquid → gas and the Problem 5.10 cases, predicting the sign each time → add the same q at a
  low and a high T in XP-18 → infer what entropy measures and why it is divided by T.
- **Aha:** "The gases mixed with no energy change at all. Spreading out is its own driving force."
- **Count:** 2 dedicated. **JEE:** strong (ΔS sign reasoning; ADV-2026-P1-CHE-Q13). **Media:** strong.

#### 37. `CPT-CHE-TOTAL-ENTROPY-CHANGE`: Total entropy change and spontaneity
*5.6(b) pp. 159–160; 5.6(c) p. 161* · LOs: `TOTAL-ENTROPY-CRITERION`, `TOTAL-ENTROPY-SURROUNDINGS-CALCULATE`, `TOTAL-ENTROPY-REVERSIBLE-IRREVERSIBLE`
- **What:** a spontaneous process has ΔS_total > 0; ΔS_surr = −ΔH_sys/T; iron rusts despite ΔS_sys < 0
  (Problem 5.11); ΔS_total, unlike ΔU, distinguishes reversible from irreversible.
- **Importance:** high-value. **Difficulty:** energy accounting across system and surroundings; a negative
  ΔS_sys with a spontaneous outcome.
- **Opportunity:** strong. A two-column ledger (system | surroundings) with a live total.
- **Best modality:** graph/data explorer, in **XP-18, The entropy ledger**. Its derivation panel feeds **XP-19**.
- **Mechanism:** read → enter iron oxidation (ΔH = −1648 kJ mol⁻¹, ΔS_sys = −549.4 J K⁻¹ mol⁻¹, 298 K) →
  ΔS_surr = +5530, total = +4980.6 → vary T → compare reversible vs irreversible isothermal expansion
  (ΔU = 0 both, ΔS_total = 0 vs > 0) → infer the criterion.
- **Aha:** "The system got more ordered, but the heat it released disordered the surroundings far more."
- **Count:** 1 dedicated + 1 secondary. **JEE:** strong. **Media:** moderate–strong.
- **Errata flag:** "entropy is maximum at equilibrium" is qualified as the *total* (isolated-system) entropy (Appendix C).

#### 38. `CPT-CHE-GIBBS-ENERGY`: Gibbs energy
*5.6(c), pp. 160–161* · LOs: `GIBBS-ENERGY-EQUATION`, `GIBBS-ENERGY-USEFUL-WORK`, `GIBBS-ENERGY-CALCULATE`
- **What:** G = H − TS; ΔG = ΔH − TΔS (the Gibbs equation); the decrease in G is the net energy available
  for useful work ("free energy").
- **Importance:** high-value. **Difficulty:** combining two terms with a temperature weight; units (J vs kJ in TΔS).
- **Opportunity:** strong, together with concepts 39 and 40 on one explorer. This is the owner-approved
  pilot `CON-CHE-GIBBS-SPONTANEITY`.
- **Best modality:** graph explorer (parameter playground), in **XP-19, ΔG–T explorer**.
- **Mechanism:** read → set ΔH, ΔS and T → ΔG is drawn as ΔH minus a TΔS bar → watch the units
  (J K⁻¹ × K = J) → infer how the two terms compete.
- **Aha:** "ΔG is what's left of ΔH after paying the entropy term, and that is what the reaction can actually do."
- **Count:** 1 (shared). **JEE:** strong (ADV-2026-P1-CHE-Q13). **Media:** strong.
- **Errata flag:** the useful-work wording is presented as the *decrease* in G (Appendix C).

#### 39. `CPT-CHE-GIBBS-ENERGY-SPONTANEITY`: Gibbs energy change as the criterion of spontaneity
*5.6(c), p. 161* · LOs: `GIBBS-SPONTANEITY-DERIVE`, `GIBBS-SPONTANEITY-PREDICT`
- **What:** from ΔS_total = ΔS_sys − ΔH_sys/T, a spontaneous process has ΔG < 0 at constant T and p.
- **Importance:** high-value. **Difficulty:** the derivation joins two earlier ideas; sign logic.
- **Opportunity:** strong, in the same explorer, with a derivation panel linking it to the XP-18 ledger.
- **Best modality:** graph explorer + derivation, in **XP-19**.
- **Mechanism:** read → step from ΔS_total > 0 to −ΔG > 0 → then predict "spontaneous?" for NCERT's cases
  (Problem 5.11, Exercise 5.19) before revealing ΔG → infer the criterion.
- **Aha:** "ΔG < 0 is just ΔS_total > 0 written with the system's own quantities."
- **Count:** 1 (shared). **JEE:** strong. **Media:** strong.

#### 40. `CPT-CHE-TEMPERATURE-AND-SPONTANEITY`: Effect of temperature on spontaneity
*5.6(c), pp. 161–162* · LOs: `TEMPERATURE-SPONTANEITY-PREDICT`, `TEMPERATURE-SPONTANEITY-THRESHOLD`, `TEMPERATURE-SPONTANEITY-HIGH-T`
- **What:** Table 5.4, the four sign combinations of ΔH and ΔS; a crossover temperature when they have
  the same sign (Exercise 5.17: 400 kJ, 0.2 kJ K⁻¹ → 2000 K).
- **Importance:** high-value. **Difficulty:** multiple variables; graph interpretation (the ΔG–T line);
  "high" and "low" T are relative (NCERT's footnote).
- **Opportunity:** strong. ΔG plotted against T as a straight line (intercept ΔH, slope −ΔS) shows all
  four rows of Table 5.4 at once.
- **Best modality:** graph explorer, in **XP-19** (mode 2, "ΔG vs T").
- **Mechanism:** read Table 5.4 → choose the ΔH and ΔS signs → the line crosses zero, or never does → read
  off T = ΔH/ΔS → infer the table instead of memorising it.
- **Aha:** "Table 5.4 is four straight lines. Where the line crosses zero, the reaction changes its mind."
- **Count:** 1 (shared). **JEE:** strong. **Media:** strong (graph-insight short).

#### 41. `CPT-CHE-SECOND-LAW`: Entropy and the second law of thermodynamics
*5.6(d), p. 161* · LOs: `SECOND-LAW-STATE`, `SECOND-LAW-EXOTHERMIC`
- **What:** in an isolated system, increasing entropy is the natural direction of spontaneous change;
  exothermic heat disorders the surroundings.
- **Importance:** important. **Difficulty:** an abstract statement; it links back to ΔS_total.
- **Opportunity:** low as a standalone; the ledger already shows it.
- **Best modality:** no dedicated interactive. Served by **XP-18** (an "isolated system" preset, and the
  surroundings column warming for an exothermic reaction).
- **Count:** 0 dedicated, 1 serving. **JEE:** moderate. **Media:** moderate (as part of the XP-18 reel).

#### 42. `CPT-CHE-THIRD-LAW`: Absolute entropy and the third law of thermodynamics
*5.6(e), pp. 161–162* · LOs: `THIRD-LAW-STATE`, `THIRD-LAW-MOLECULAR-MOTION`, `THIRD-LAW-ABSOLUTE-ENTROPY`
- **What:** translational, rotational and vibrational motion grow with T; a perfect crystal's S → 0 at 0 K;
  absolute entropies come from thermal data.
- **Importance:** important. **Difficulty:** three kinds of molecular motion (invisible); why only *pure crystalline* solids.
- **Opportunity:** moderate, as a mode of the particle box (cool to 0 K: motion stops, perfect order).
- **Best modality:** no dedicated interactive. Served by **XP-17** (temperature slider down to 0 K, with
  motion-type toggles; Problem 5.10(ii), 0 → 115 K).
- **Count:** 0 dedicated, 1 serving. **JEE:** low–moderate. **Media:** moderate (molecular motion is visual).

### 5.7 Gibbs energy change and equilibrium

#### 43. `CPT-CHE-GIBBS-ENERGY-EQUILIBRIUM`: Gibbs energy at equilibrium
*5.7, p. 162* · LOs: `GIBBS-EQUILIBRIUM-CRITERION`, `GIBBS-EQUILIBRIUM-MINIMUM`
- **What:** at dynamic equilibrium, G of the system is at a minimum, so Δ_rG = 0; away from it, the
  system moves toward lower G.
- **Importance:** high-value. **Difficulty:** "both directions proceed, yet G must fall": NCERT resolves
  it with the minimum.
- **Opportunity:** moderate–strong. A G-vs-composition curve with a minimum (a schematic, labelled as
  such) where a marker rolls to the bottom from either side.
- **Best modality:** graph explorer, in **XP-20, ΔG° and K explorer** (mode 1).
- **Mechanism:** read → start the mixture rich in reactants, then rich in products → the marker moves
  downhill to the same minimum → the slope (Δ_rG) is zero there → infer the criterion.
- **Aha:** "Equilibrium is the bottom of the valley, reached from either side."
- **Count:** 1 (shared). **JEE:** strong. **Media:** strong.

#### 44. `CPT-CHE-STANDARD-GIBBS-ENERGY-EQUILIBRIUM-CONSTANT`: Standard Gibbs energy change and the equilibrium constant
*5.7, pp. 162–163* · LOs: `GIBBS-K-CALCULATE-K`, `GIBBS-K-PREDICT-EXTENT`, `GIBBS-K-FROM-ENTHALPY-ENTROPY`
- **What:** Δ_rG° = −RT ln K = −2.303 RT log K; Δ_rG° = Δ_rH° − TΔ_rS°; large negative ΔG° gives a large K.
- **Importance:** high-value. **Difficulty:** logarithmic scale; signs; units; temperature.
- **Opportunity:** strong. A ΔG° slider against a log-scale K readout, with NCERT's Problems 5.12 and 5.13
  and Exercise 5.20 as presets, plus a T slider driven by ΔH° and ΔS°.
- **Best modality:** graph explorer + worked examples, in **XP-20** (mode 2).
- **Mechanism:** read → slide ΔG° from −50 to +50 kJ mol⁻¹ → K sweeps across about eighteen orders of magnitude →
  load O₂ → O₃ (K = 2.47 × 10⁻²⁹ → +163 kJ mol⁻¹) → set ΔH°, ΔS° and T → K follows → infer the link and how
  extent follows from it.
- **Aha:** "Every 5.7 kJ mol⁻¹ of ΔG° at 298 K is a factor of ten in K."
- **Count:** 1 (shared). **JEE:** strong. **Media:** strong.
- **Errata flag:** Problem 5.14's printed result (−763.8 kJ mol⁻¹) is not reproduced. Its own data give
  about −0.80 kJ mol⁻¹ (Appendix C).

---

## Appendix B. Experience blueprints (lightweight)

Planning only. No code, no experience records, no EXP ids. Complexity: **S** ≈ one engine, a few
controls; **M** ≈ an engine plus modes or presets; **L** ≈ several engines or a heavy model.
Mobile: **high** = works one-handed on a phone; **medium** = phone works, tablet or desktop is better.

#### XP-01: System and boundary bench (5.1.1–5.1.2) · P1 · interactive diagram
- **Concepts / LOs:** 2 (`SYSTEM-SURROUNDINGS-IDENTIFY`, `SYSTEM-SURROUNDINGS-BOUNDARY-ROLE`); 3
  (`TYPES-OF-SYSTEMS-COMPARE`, `TYPES-OF-SYSTEMS-CLASSIFY`).
- **Student interaction:** drag the boundary (reactants only / reactants + beaker / the room); toggle the
  lid and the walls; classify three NCERT containers.
- **Controls:**
  - boundary position (3 snap points);
  - lid open/closed;
  - walls conducting/insulated;
  - a "classify" card set (open beaker, copper/steel vessel, thermos).
- **Visual output:** the beaker in a room, a dashed boundary, matter dots and heat arrows crossing or
  stopping, and per-boundary counters.
- **Observation / inference:** what crosses depends on the walls and the lid → open, closed, isolated.
- **Aha:** "Two switches, three kinds of system."
- **Equations:** universe = system + surroundings.
- **Classroom:** projector-friendly sorting; teacher asks "where is the boundary?"
- **Mobile:** high. **Complexity:** S.
- **Media hook:** "Is a thermos flask a closed system? Not quite."

#### XP-02: One state, many routes (5.1.3) · P1 · simulation
- **Concepts / LOs:** 4 (`STATE-OF-SYSTEM-MACROSCOPIC`, `STATE-OF-SYSTEM-INDEPENDENT-VARIABLES`); 5
  (`STATE-FUNCTION-DEFINE`, `STATE-FUNCTION-IDENTIFY`).
- **Student interaction:** fix two of p, V, T (n fixed) and watch the third lock; then go from A to B by
  different routes, including NCERT's 25 → 35 °C directly or via cooling first.
- **Controls:** p, V and T handles (any two editable); route builder (steps of heat/cool/compress/expand);
  a "quantities" card set.
- **Visual output:** piston–cylinder with jiggling particles; p–V–T readouts; a route trace; "change"
  vs "route travelled" counters.
- **Observation / inference:** ΔT and ΔV are the same for every route; the route length is not → state
  functions.
- **Aha:** "Only the start and the finish matter, for state functions."
- **Equations:** pV = nRT (the model); ΔX = X_B − X_A.
- **Classroom:** strong for discussion. **Mobile:** high. **Complexity:** M.
- **Media hook:** "Two roads, same destination: what changes and what doesn't?"

#### XP-03: Joule's bench (5.1.4) · P0 · virtual lab
- **Concepts / LOs:**
  - 6 (`INTERNAL-ENERGY-WAYS-TO-CHANGE`, `INTERNAL-ENERGY-JOULE-STATE-FUNCTION`, `INTERNAL-ENERGY-ONLY-CHANGES`);
  - 7 (`ADIABATIC-PROCESS-DEFINE`);
  - 8 (`WORK-CHANGES-INTERNAL-ENERGY`, `WORK-HEAT-COMPARE`);
  - 9 (`HEAT-TEMPERATURE-DIFFERENCE`, `HEAT-CHANGES-INTERNAL-ENERGY`);
  - 5 (`STATE-FUNCTION-VERSUS-HEAT-WORK`);
  - 11 (`FIRST-LAW-STATE`).
- **Student interaction:**
  - *(a)* insulated flask: do work by paddles or by immersion rod;
  - *(b)* copper walls in a reservoir at T_B: heat only;
  - *(c)* general case: split the same ΔU between q and w.
- **Controls:**
  - wall type (adiabatic / conducting);
  - work source (paddle / electrical) and amount (kJ);
  - reservoir temperature;
  - q/w split slider (case c).
- **Visual output:** flask, thermometer, paddles or rod, heat-flow arrows with IUPAC signs, a ΔU bar (no
  absolute U shown).
- **Observation / inference:** equal adiabatic work gives equal T_B by either method; the same ΔT by heat;
  in (c) q and w vary while q + w stays fixed → U is a state function and ΔU = q + w.
- **Aha:** "How I put the energy in doesn't matter. The final state fixes ΔU."
- **Equations:** ΔU = w_ad; ΔU = q (no work, constant V); ΔU = q + w.
- **Classroom:** a re-enactment of Joule's experiments. **Mobile:** high. **Complexity:** M.
- **Model notes:**
  - the water's heat capacity is a labelled representative value;
  - ΔT = ΔU / C, linear and valid over the slider range.
- **Media hook:** "Joule stirred water to prove energy is conserved."

#### XP-04: Energy ledger (5.1.4 → 5.2.1) · P1 · interactive diagram
- **Concepts / LOs:** 10 (`SIGN-CONVENTION-PREDICT`, `SIGN-CONVENTION-COMPARE-PHYSICS`); 11
  (`FIRST-LAW-CALCULATE`, `FIRST-LAW-SPECIAL-CASES`); 7 (`ADIABATIC-PROCESS-ENERGY`).
- **Student interaction:** for each scenario, place the q and w arrows, predict the signs, compute ΔU;
  toggle the IUPAC/physics convention.
- **Controls:**
  - scenario picker (Problem 5.1 i–iii; Exercise 5.7: 701 J absorbed, 394 J done by the system;
    isolated; constant V; isothermal ideal gas);
  - arrow direction;
  - convention toggle.
- **Visual output:** the system box with arrows in/out; a ledger table q | w | ΔU; the equation rendered
  in the chosen convention.
- **Observation / inference:** into the system is +; the physics form ΔU = q − w describes the same events → only consistency matters.
- **Aha:** "Same physics, two bookkeeping styles."
- **Equations:** ΔU = q + w (IUPAC); ΔU = q − w (physics, w by the system).
- **Classroom:** quick-fire prediction rounds. **Mobile:** high. **Complexity:** S.
- **Media hook:** "Chemistry says +w, physics says −w. Who's right?"

#### XP-05: p–V work explorer (5.2.1) · P0 · graph explorer + simulation
- **Concepts / LOs:**
  - 12 (`PV-WORK-DERIVE`, `PV-WORK-CALCULATE`, `PV-WORK-AREA`);
  - 13 (`REVERSIBLE-PROCESS-DESCRIBE`, `REVERSIBLE-IRREVERSIBLE-COMPARE`);
  - 14 (all three);
  - 15 (both);
  - 10 (`SIGN-CONVENTION-PREDICT`);
  - 11 (`FIRST-LAW-SPECIAL-CASES`).
- **Student interaction:**
  - compress or expand the gas in 1…N steps or reversibly;
  - set p_ex (including 0);
  - "Same expansion, three ways": vacuum vs 1 atm vs reversible.
- **Controls:** direction; number of steps (1–20, ∞); p_ex; T; n (computed from the chosen state);
  derivation stepper.
- **Visual output:** the cylinder linked to a p–V plot; shaded area = |w|; the gas isotherm; a live
  w (sign shown) and q = −w for isothermal ideal-gas runs.
- **Observation / inference:** more steps → less compression work, more expansion work; reversible is
  the limit; p_ex = 0 → w = 0.
- **Aha:** "Work is an area, and the path decides how big it is."
- **Equations:** w = −p_ex ΔV; w = −Σ p ΔV; w_rev = −2.303 nRT log(V_f/V_i).
- **Classroom:** excellent on a projector. **Mobile:** medium (the plot needs width; stacked layout on
  phones). **Complexity:** M–L.
- **Errata:** Problem 5.4's "1 mol" is inconsistent with Problem 5.2's gas; n is computed from p, V, T (Appendix C).
- **Apply:** ADV-2026-P1-CHE-Q01.
- **Media hook:** "Why does squeezing a gas slowly cost less work?"

#### XP-06: Heat it two ways (5.2.2(a), (d)) · P1 · simulation + derivation
- **Concepts / LOs:** 16 (`ENTHALPY-WHY-DEFINED`, `ENTHALPY-DERIVE-QP`, `ENTHALPY-STATE-FUNCTION`); 21
  (`CP-CV-DERIVE`, `CP-CV-EXPLAIN-DIFFERENCE`).
- **Student interaction:** heat 1 mol of ideal gas by the same ΔT in a rigid box and under a free piston;
  compare the heat needed; step through ΔU = q_p − pΔV → q_p = ΔH, and C_p − C_v = R.
- **Controls:** ΔT; container (rigid / piston at constant p); n; derivation stepper.
- **Visual output:** two cylinders side by side; heat meters; an expansion-work arrow on the piston side;
  a bar showing q_p = ΔU + pΔV.
- **Observation / inference:** q_p − q_V = nRΔT → ΔH = q_p and C_p − C_v = R.
- **Aha:** "The extra heat at constant pressure pays for pushing the atmosphere back."
- **Equations:** H = U + pV; ΔH = ΔU + pΔV; C_p − C_v = R.
- **Classroom:** good. **Mobile:** high. **Complexity:** M.
- **Errata:** don't state ΔH = ΔU at constant volume in general (Appendix C).
- **Apply:** ADV-2026-P1-PHY-Q11.
- **Media hook:** "Same gas, same temperature rise, different heat."

#### XP-07: The partition test (5.2.2(b)) · P3 · interactive diagram
- **Concepts / LOs:** 19 (`EXTENSIVE-INTENSIVE-CLASSIFY`, `EXTENSIVE-INTENSIVE-PARTITION`, `EXTENSIVE-INTENSIVE-MOLAR`).
- **Student interaction:** insert the partition (Fig. 5.6) and sort property cards into extensive and intensive.
- **Controls:** partition in/out; a "divide by n" button.
- **Visual output:** the container halves; a property table updates.
- **Observation / inference:** V, n, U, H and C halve; T, p, ρ, V_m and C_m don't.
- **Aha:** "Divide by n and it stops depending on size."
- **Classroom / mobile:** high. **Complexity:** S. **Media hook:** "Cut it in half: what changes?"

#### XP-08: Heat capacity bench (5.2.2(c)) · P2 · virtual lab
- **Concepts / LOs:** 20 (all three); 19 (`EXTENSIVE-INTENSIVE-MOLAR`).
- **Student interaction:** supply the same heat to different substances and masses; compute C, C_m and c.
- **Controls:** substance (water, aluminium); mass; heat supplied.
- **Visual output:** heater, sample, thermometer; a readout table.
- **Observation / inference:** water has the large heat capacity; C scales with amount, C_m and c don't.
- **Aha:** "Water barely warms."
- **Equations:** q = CΔT = c m ΔT; C_m = C/n.
- **Presets:** Exercise 5.9 (60.0 g Al, 35 → 55 °C, C_m = 24 J mol⁻¹ K⁻¹).
- **Mobile:** high. **Complexity:** S. **Media hook:** "Why the sea stays cool on a hot day."

#### XP-09: Two calorimeters, one reaction (5.3 + 5.2.2) · P0 · virtual lab · pilot `CON-CHE-DELTA-U-VS-DELTA-H`
- **Concepts / LOs:**
  - 22 (all three);
  - 18 (`DELTA-H-DELTA-U-DERIVE`, `DELTA-H-DELTA-U-CALCULATE`, `DELTA-H-DELTA-U-WHEN-SIGNIFICANT`);
  - 17 (`EXOTHERMIC-ENDOTHERMIC-SIGN`);
  - 23 (`REACTION-ENTHALPY-DEFINE`);
  - 29 (`COMBUSTION-ENTHALPY-DEFINE`).
- **Student interaction:** run a reaction in a bomb calorimeter and at constant pressure; read ΔT; compute
  q; compare ΔU and ΔH.
- **Controls:**
  - reaction (Δn_g < 0, = 0, > 0, or solids/liquids only);
  - sample amount;
  - calorimeter heat capacity;
  - apparatus toggle.
- **Visual output:** Figs. 5.7 and 5.8 as working apparatus; thermometer traces; a ΔU vs ΔH bar pair
  with a gap labelled Δn_gRT.
- **Observation / inference:** the gap tracks Δn_g and vanishes when Δn_g = 0 → ΔH = ΔU + Δn_gRT.
- **Aha:** "Graphite gives ΔH = ΔU because no gas moles change."
- **Equations:** q = CΔT; q_reaction = −CΔT; ΔH = ΔU + Δn_gRT.
- **Presets:** Problem 5.6 (graphite, 20.7 kJ K⁻¹, 298 → 299 K → −2.48 × 10² kJ mol⁻¹); Problem 5.5
  (vaporisation at 373 K, 41 → 37.9 kJ mol⁻¹).
- **Mobile:** medium. **Complexity:** M–L.
- **Errata:** Problem 5.6's unit; Exercise 5.8 (s)/(g); the constant-volume statement on p. 143 (Appendix C).
- **Apply:** ADV-2026-P1-PHY-Q11.
- **Media hook:** "One reaction, two calorimeters, two different answers."

#### XP-10: Heating curve of water (5.4(b)) · P1 · graph explorer + virtual lab
- **Concepts / LOs:** 25 (all three); 20 (`HEAT-CAPACITY-MEANING`, `HEAT-CAPACITY-CALCULATE`); 18
  (`DELTA-H-DELTA-U-CALCULATE` via Problem 5.7).
- **Student interaction:** heat ice steadily; watch the T–q curve; reverse it (cooling and freezing);
  step through Problem 5.8 and Exercise 5.10.
- **Controls:** heating rate; direction; substance (water; a comparison card for dry ice and naphthalene
  sublimation, with values from the text).
- **Visual output:** the sample changing phase; a T vs q curve with slopes and plateaus labelled C and
  Δ_fusH/Δ_vapH.
- **Observation / inference:** on the plateaus T is constant while heat is absorbed; the plateau lengths
  differ (water: 6.00 vs 40.79 kJ mol⁻¹).
- **Aha:** "The flat parts are where the heat breaks attractions."
- **Equations:** q = n C_m ΔT; q = n Δ_transH.
- **Presets:** Problem 5.8 (−13.56 kJ mol⁻¹); Exercise 5.10 (C_p values 75.3 and 36.8 J mol⁻¹ K⁻¹; Δ_fusH 6.03).
- **Note:** Table 5.1 values are to be transcribed from the PDF at blueprint time.
- **Mobile:** high. **Complexity:** M. **Media hook:** "Why does boiling water stay at 100 °C?"

#### XP-11: Formation-enthalpy ladder (5.4(a), (c), (d)) · P1 · interactive diagram + data explorer
- **Concepts / LOs:**
  - 26 (all three);
  - 27 (both);
  - 23 (`REACTION-ENTHALPY-DEFINE`, `REACTION-ENTHALPY-USES`);
  - 24 (`STANDARD-STATE-DEFINE`, `STANDARD-STATE-WHY`);
  - 17 (`EXOTHERMIC-ENDOTHERMIC-DIAGRAM`);
  - 19 (`EXTENSIVE-INTENSIVE-CLASSIFY`, via p. 151).
- **Student interaction:** place species on an enthalpy axis with elements at zero; pick a reaction; scale
  or reverse its equation; test "is this a formation reaction?".
- **Controls:** reaction picker; ×½, ×2 and reverse; a formation-reaction quiz card.
- **Visual output:** an enthalpy ladder with labelled levels; the Δ_rH arrow (red up / blue down); the
  equation card; a standard-state badge on each species.
- **Observation / inference:** Δ_rH = Σ a Δ_fH(products) − Σ b Δ_fH(reactants); halving an equation
  halves ΔH; reversing it flips the sign.
- **Aha:** "Elements at zero give every compound an address."
- **Presets:** CaCO₃ decomposition (+178.3); Fe₂O₃ + 3H₂ (−33.3 / −16.6); NH₃ (−91.8 / +91.8); the
  formation of water, methane and ethanol; HBr (computed −72.8 for 2HBr).
- **Mobile:** high. **Complexity:** M.
- **Errata:** HBr (Appendix C).
- **Media hook:** "Why do elements have zero enthalpy?"

#### XP-12: The enthalpy staircase (5.4(e) + 5.5(a)) · P0 · energy-path explorer · pilot `CON-CHE-HESS-LAW`
- **Concepts / LOs:**
  - 28 (all three);
  - 27 (`THERMOCHEMICAL-EQUATION-SCALE-REVERSE`);
  - 26 (`FORMATION-ENTHALPY-CALCULATE-REACTION`);
  - 29 (`COMBUSTION-ENTHALPY-FORMATION`);
  - 5 (`STATE-FUNCTION-DEFINE`).
- **Student interaction:** build a target reaction by dragging, reversing and scaling known
  thermochemical equations; watch alternative routes meet at the same level.
- **Controls:** target picker; equation tiles (reverse, ×n); a route A / route B toggle.
- **Visual output:** a staircase diagram (NCERT's A→B, C→D figure); running sum; mismatch warnings when
  the species don't cancel.
- **Observation / inference:** any valid route gives the same Δ_rH → Hess's law.
- **Aha:** "The height between floors doesn't depend on the stairs."
- **Presets:** C + ½O₂ → CO (−110.5); CH₄ formation from combustion data (Exercise 5.5, −74.8); benzene
  from Problem 5.9 (computed +48.51).
- **Mobile:** medium (drag on small screens needs tap-to-place). **Complexity:** M–L.
- **Errata:** Problem 5.9 signs (Appendix C).
- **Media hook:** "How to measure the enthalpy of a reaction you can't run."

#### XP-13: Bond-breaking ladder (5.5(b), (c)) · P1 · molecular + energy diagram
- **Concepts / LOs:** 31 (all four); 30 (both).
- **Student interaction:** strip H atoms from CH₄ one at a time; atomize H₂, Cl₂, O₂ and Na(s); estimate a
  gas-phase Δ_rH by breaking and forming bonds.
- **Controls:** molecule picker; "break next bond"; a reaction builder from Table 5.3 bonds.
- **Visual output:** a 3-D-style molecule losing atoms; an energy ladder (427, 439, 452, 347 → Σ 1665,
  mean 416); break (up) and form (down) arrows.
- **Observation / inference:** successive bond enthalpies differ → the mean; Δ_rH ≈ Σ BE(reactants) −
  Σ BE(products), for gases only.
- **Aha:** "Identical-looking bonds cost different energies to break."
- **Presets:** H₂ 435; Cl₂ 242; O₂ 428; Na(s) 108.4; Exercise 5.15 (CCl₄).
- **Mobile:** medium. **Complexity:** M.
- **Errata:** atomization wording (Appendix C).
- **Media hook:** "Four identical bonds, four different prices."

#### XP-14: Born–Haber cycle builder (5.5(d)) · P1 · interactive diagram
- **Concepts / LOs:** 32 (all three); 28 (`HESS-LAW-APPLY`, `HESS-LAW-CYCLE`); 18 (`DELTA-H-DELTA-U-CALCULATE`).
- **Student interaction:** place the five NaCl steps as arrows; close the cycle; read the lattice enthalpy;
  view ΔU = ΔH − 2RT.
- **Controls:** step tiles; sign check; reveal.
- **Visual output:** Fig. 5.9 rebuilt live; a running sum toward zero round the cycle.
- **Observation / inference:** the missing arrow is fixed by the others → +788 kJ mol⁻¹.
- **Aha:** "Go round the loop and the unknown has only one possible length."
- **Equations:** Σ ΔH round the cycle = 0.
- **Values (from the text):** sublimation 108.4; ionization 496; ½ bond 121; electron gain −348.6; formation −411.2.
- **Optional enrichment:** the ionization-energy vs ionization-enthalpy box as an info panel.
- **Mobile:** medium. **Complexity:** M. **Media hook:** "Measuring the unmeasurable: the Born–Haber cycle."

#### XP-15: Dissolve and dilute (5.5(e), (f)) · P2 · data explorer
- **Concepts / LOs:** 33 (all four); 34 (both); 32 (`LATTICE-ENTHALPY-DEFINE`).
- **Student interaction:**
  - **Panel 1:** balance lattice (+788) against hydration (−784) for NaCl, plus a labelled "what if"
    lattice slider (hypothetical).
  - **Panel 2:** plot the four HCl dilution points and pick two to get the enthalpy of dilution.
- **Visual output:** a two-arrow balance; a curve approaching −74.85.
- **Observation / inference:** Δ_solH is a small difference of large terms; ΔH approaches a limit with dilution.
- **Aha:** "Salt dissolving is a near-tie."
- **Equations:** Δ_solH = Δ_latticeH + Δ_hydH.
- **Mobile:** high. **Complexity:** S–M. **Media hook:** "Why does dissolving salt barely change the temperature?"

#### XP-16: Which way does it go? (5.6, 5.6(a)) · P2 · interactive diagram + short animations
- **Concepts / LOs:** 35 (all three); 17 (`EXOTHERMIC-ENDOTHERMIC-DIAGRAM`).
- **Student interaction:** run each scene forward and try to reverse it; compare the scenes' ΔH.
- **Scenes:** heat flow hot → cold; gas filling a vessel; H₂ + O₂ (spontaneous but imperceptibly slow);
  exothermic examples from p. 157; an endothermic process that still occurs (evaporation of the
  swimmer's water film, Problem 5.7).
- **Visual output:** the scene plus an enthalpy diagram (Fig. 5.10 a/b).
- **Observation / inference:** spontaneous processes are one-way and not necessarily fast; ΔH < 0 is
  common but not required.
- **Aha:** "Something besides energy decides direction."
- **Mobile:** high. **Complexity:** S–M.
- **Errata:** NO₂ / CS₂ are not used as spontaneous examples (Appendix C).
- **Media hook:** "Spontaneous doesn't mean fast."

#### XP-17: Mixing and disorder (5.6(b), (e)) · P0 · molecular visualization
- **Concepts / LOs:**
  - 36 (`ENTROPY-DISORDER`, `ENTROPY-PREDICT-CHANGE`);
  - 35 (`SPONTANEOUS-PROCESS-DIRECTION`);
  - 42 (`THIRD-LAW-STATE`, `THIRD-LAW-MOLECULAR-MOTION`, `THIRD-LAW-ABSOLUTE-ENTROPY` qualitatively).
- **Student interaction:** remove the partition between gases A and B (Fig. 5.11); switch phase
  solid/liquid/gas; cool toward 0 K; predict the sign of ΔS for the Problem 5.10 cases.
- **Controls:** partition; phase; temperature; motion toggles (translation/rotation/vibration); prediction cards.
- **Visual output:** a particle box; a "how predictable is a picked particle?" indicator; a motion legend.
- **Observation / inference:** mixing happens with ΔH = 0 and never reverses; order decreases solid →
  gas; motion stops at 0 K in a perfect crystal.
- **Aha:** "Spreading out is a driving force by itself."
- **Note:** statistical (microstate) counting is **OPTIONAL ENRICHMENT** (NCERT: "beyond the scope").
- **Mobile:** high. **Complexity:** M. **Media hook:** "Why don't mixed gases ever unmix?"

#### XP-18: The entropy ledger (5.6(b)–(d)) · P1 · graph/data explorer
- **Concepts / LOs:**
  - 37 (all three);
  - 36 (`ENTROPY-QREV-OVER-T`, `ENTROPY-CALCULATE`);
  - 41 (both);
  - 13 (`REVERSIBLE-IRREVERSIBLE-COMPARE`).
- **Student interaction:** enter or choose a process; see ΔS_sys, ΔS_surr = −ΔH/T and ΔS_total; vary T;
  compare the reversible and irreversible isothermal expansion.
- **Controls:** ΔH, ΔS_sys, T; q_rev and T for the q/T panel; presets.
- **Visual output:** two columns with a total bar; a q/T panel (the same q at two temperatures).
- **Observation / inference:** ΔS_total > 0 for spontaneous change; ΔS_total = 0 reversibly.
- **Aha:** "Iron rusts because the surroundings gain more entropy than the iron loses."
- **Presets:** Problem 5.11 (5530; +4980.6 J K⁻¹ mol⁻¹); Exercise 5.22 (Δ_fH(H₂O,l) = −286 → ΔS_surr at 298 K).
- **Mobile:** high. **Complexity:** M.
- **Errata:** "maximum at equilibrium" qualified (Appendix C).
- **Media hook:** "If rusting makes iron more ordered, why does it happen?"

#### XP-19: ΔG–T explorer (5.6(c)) · P0 · graph explorer · pilot `CON-CHE-GIBBS-SPONTANEITY`
- **Concepts / LOs:**
  - 38 (all three);
  - 39 (both);
  - 40 (all three);
  - 37 (`TOTAL-ENTROPY-CRITERION`, via the derivation panel).
- **Student interaction:**
  - set ΔH, ΔS and T, and watch ΔG = ΔH − TΔS;
  - switch to the ΔG-vs-T line;
  - read the crossover temperature;
  - work through the four sign rows of Table 5.4;
  - step through ΔS_total > 0 ⇔ ΔG < 0.
- **Controls:** ΔH, ΔS, T; a sign-quadrant picker; presets; derivation stepper.
- **Visual output:** a bar pair (ΔH, TΔS) with the ΔG remainder; a line plot with a shaded spontaneous
  region; a Table 5.4 row highlight.
- **Observation / inference:** the sign of ΔG decides; same-sign ΔH and ΔS give a crossover at T = ΔH/ΔS.
- **Aha:** "Table 5.4 is four straight lines."
- **Presets:**
  - Exercise 5.17: 2000 K;
  - Exercise 5.19: ΔU, Δn_g = −1 → ΔH → ΔG > 0; this links back to XP-09;
  - Problem 5.11 (iron).
- **Mobile:** medium–high. **Complexity:** M.
- **Errata:** useful-work wording (Appendix C).
- **Apply:** ADV-2026-P1-CHE-Q13.
- **Media hook:** "When does a reaction change its mind?"

#### XP-20: ΔG° and K explorer (5.7) · P1 · graph explorer + worked examples
- **Concepts / LOs:** 43 (both); 44 (all three); 13 (`REVERSIBLE-PROCESS-DESCRIBE`, the chemical sense of "reversible").
- **Student interaction:**
  - **Mode 1:** a G-vs-composition curve, labelled schematic; start either side and roll to the minimum.
  - **Mode 2:** a ΔG° slider ↔ log K readout; a T slider driven by ΔH° and ΔS°.
- **Controls:** starting composition; ΔG°; T; ΔH°, ΔS°; presets.
- **Visual output:** a valley curve with the zero-slope point; a K scale spanning powers of ten.
- **Observation / inference:** Δ_rG = 0 at the minimum; K = 10^(−ΔG°/2.303RT); large negative ΔH° tends
  toward a large K.
- **Aha:** "About 5.7 kJ mol⁻¹ is a factor of ten in K at 298 K."
- **Presets:** Problem 5.12 (O₂ → O₃: K = 2.47 × 10⁻²⁹ → +163 kJ mol⁻¹); Problem 5.13 (−13.6 kJ mol⁻¹ →
  K ≈ 2.4 × 10²); Exercise 5.20 (K = 10, 300 K); Problem 5.14 recomputed.
- **Mobile:** medium–high. **Complexity:** M.
- **Errata:** Problem 5.14 (Appendix C).
- **Media hook:** "From one number, ΔG°, to how far a reaction goes."

---

## Appendix C. Errata and review flags that touch experiences

Printed values are never silently corrected in the inventory. An experience that touches one of these
computes its values from the model and states its source. Classes: **A** genuine error or
inconsistency · **B** wording that needs qualification · **C** correct as printed · **D** not relevant
to the inventory.

| Item | Class | Experience | Handling |
|---|---|---|---|
| HBr Δ_rH°, p. 150 (printed −178.3, the CaO value repeated) | A, D | XP-11 | compute 2 × (−36.4) = −72.8 |
| Problem 5.14, p. 163 (printed −763.8 kJ mol⁻¹; its data give ≈ −0.80 kJ mol⁻¹) | A, D | XP-20 | recompute; owner reviews before use |
| Problem 5.9, pp. 152–153 (reversed equation −3267.0; result −48.51; its arithmetic gives +48.51) | A, D | XP-12 | compute; never show the printed sign |
| Exercise 5.8 (NH₂CN (s) in the text, (g) in the equation) | A, D | XP-09 | not a preset until the owner decides |
| Constant-volume ΔH = ΔU = q_V, p. 143 | B, D | XP-06, XP-09 | not stated in general |
| "Entropy maximum at equilibrium", p. 159 | B | XP-18 | presented as total (isolated) entropy |
| "ΔG is the net energy available to do useful work", p. 161 | B | XP-19 | presented as the decrease in G |
| Atomization "one mole of bonds", p. 153 | B | XP-13 | per mole of substance, as in the CH₄ example |
| **New:** NO₂ and CS₂ given as spontaneous endothermic reactions, pp. 157–158 | A (owner review) | XP-16 | not used as spontaneous examples; standard Δ_fG° of both is positive |
| **New:** Problem 5.4 "1 mol" vs Problem 5.2's gas (2 L, 10 atm, 298 K ≈ 0.818 mol) | A (owner review) | XP-05 | n computed from the chosen state |
| Problem 5.6 ΔU unit "kJ K⁻¹" | A (minor), D | XP-09 | shown in kJ |
| Ionization energy vs enthalpy box, p. 155 | C, D | XP-14 | optional enrichment panel only |
