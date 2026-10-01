# PrayogX design system: reference

Tokens, typography, charts, animation and accessibility are distilled from the G4 pages, which
remain their source of truth (copy from the latest, P1 PHY Q02, or P1 CHE Q15). **The page
layout of new pages is layout v3 (G5), not G4** — see "Layout v3 (G5)" below and
`docs/SIMULATION_STANDARDS.md` §4. No new design-token framework: this is the existing one.

## Brand

- Wordmark `PRAYOG<i>X</i>`: caps, weight 800, with the X in `var(--accent)`
  (`i{font-style:normal;color:var(--accent)}`).
- Mark: a white conical flask on a rounded accent square, as inline SVG. The favicon is the
  same path as a data URI with `#2a78d6`. Source: `templates/simulation-template.html`.
- In a simulation: a small brand bar above the sim ID and "PrayogX" in the footer. **The
  question is the hero**, not the brand.

## Colour tokens (verified in P1 Q15; copy verbatim)

Light values sit on `:root`. Dark values are defined **twice**: under
`@media (prefers-color-scheme: dark){:root:not([data-theme="light"])}` and under
`:root[data-theme="dark"]`.

| Token | Light | Dark |
|---|---|---|
| `--surface-0 / -1 / -2` | `#f4f4f1 / #fcfcfb / #ececea` | `#111110 / #1a1a19 / #232322` |
| `--line / --line-strong` | `#d9d9d4 / #bcbcb5` | `#34342f / #4a4a44` |
| `--text-primary / -secondary / -muted` | `#0b0b0b / #52514e / #77766f` | `#ffffff / #c3c2b7 / #95948b` |
| `--s1 / --s2 / --s3 / --s4` (series) | `#2a78d6 / #eb6834 / #1baf7a / #4a3aa7` | `#3987e5 / #d95926 / #199e70 / #9085e9` |
| `--good` | `#00743f` | `#3fae7a` |
| `--accent` | `= --s1` | |
| `--radius` | `10px` | |

- The four-slot series palette is validated in both modes. Don't invent new series colours;
  for a fifth series, fold into "Other" or facet the chart.
- Canvas and SVG read colours with `css('--token')` and repaint on theme toggle.
- **Lab canvas:** the experiment screen is a dark scene regardless of page theme. Semantic
  colours: bonds breaking = red dashed, bonds forming = green, attacking lone pairs = gold,
  electron-pair "comets" along the arrows. Take the exact values from the Q12–Q15 source.

## Typography

- `var(--sans)` for UI; `var(--serif)` for question text, formulae and equations;
  `var(--mono)` for numbers, IDs and readouts.
- Body 15 px, section `h2` 17 px with a mono two-digit number
  (`<h2><span class="n">01</span>Title</h2>`), lede ≤ 76ch.
- Classroom mode: narration ≥ 19 px.

## Layout v3 (G5) — new pages

Structure, hierarchy and rules: `docs/SIMULATION_STANDARDS.md` §4. The page contract the gate
checker (`tests/visual_gates.js`) reads:

```html
<section id="question">  … verbatim question, option tiles …                </section>
<section id="lab">
  <p class="keyres" id="target" data-kind="value"><span class="lbl">Target:</span><span class="sym">v</span><span class="val" id="ansval"></span></p>
  <!-- the symbol only until the run determines it; then .val gets the computed value and #target
       the class "pulse" once (CSS animation <= 2 s, none under reduced motion). Gate K checks it. -->
  <p id="narr">…stage caption…</p>

  <div class="stage"><canvas id="labcv" …></canvas></div>          <!-- the hero -->
  <div id="controls" role="group" aria-label="experiment controls">   <!-- ≤ 48 px away -->
    ▶ START · Pause · Replay · Reset · Classroom · the experiment's own controls
  </div>
</section>
<section id="solution"> … step by step, concept, key takeaways …          </section>
<section id="analysis"> … one or two graphs, only if useful (optional) … </section>
<section id="howto">    … five short points …                              </section>
```

- **Hero sizing.** `.stage` spans the content width; `canvas#labcv{width:100%;height:auto}`. Pick
  the canvas resolution per layout: desktop landscape (e.g. 1200×720, displayed ≥ 55 % of the
  screen height at 1280×800); phones portrait (e.g. 720×900) with the scene re-laid out, not
  shrunk. Classroom mode: `.wrap{max-width:none}`, narration ≥ 22 px.
- **Legibility.** Draw every canvas label through one helper that records the smallest font of
  the frame and expose it as `PX.minLabelPx()`; on screen it must be ≥ 13 px (desktop) and
  ≥ 11 px (phone). Molecules: atoms ≥ 18 px across on screen, bond changes clearly coloured.
- **Measurements in the scene.** Draw readings on the instruments themselves (a thermometer's
  column and value, a meter's needle and digits). Up to 4 compact readouts may sit beside the
  key-result line; no gauge grid.
- **Controls** (`#controls`, one row that wraps): the primary START button; toggles
  (`[ON][OFF]`, `aria-pressed`); segmented buttons for 2–5 exclusive states; number inputs with a
  unit and validated bounds (bad input falls back with a visible message); sliders with value,
  unit and range. All ≥ 44 px tall. **No `<select>`.**
- **Not in new pages** (G4-only): `#xstat` stage-chip bar, `.rail` with gauges, `.badges`,
  reasoning log `#calclist`, evidence table `#log`, unknown tiles, option-audit `.board` cards,
  classification table. Their data may stay internal for the tests (`PX.calcKeys()` etc.), never
  rendered.

## Layout v2 (G4 structure)

The pages built to it (P1 CHE Q12–Q16, P1 PHY Q01–Q02) keep it. The key ids and classes:
`#xstat` status bar, `#ansstrip` answer strip, `.lab3d > canvas#labcv` (1040×620), `.rail`,
`#dock`, `#solgate` (hidden in G4), `#solbody`.

Grid rules: auto-fit grids use `minmax(min(430px,100%),1fr)`; put `min-width:0` on grid
items; wrap wide tables and figures in `overflow-x:auto`. An inline `grid-template-columns`
needs `!important` in the stacking media query.

## Components

G4 components below; in new pages use only those layout v3 keeps (the key-result line, `.assume`,
`.verify`, solution steps, the custom-input states, the reveal).

- **Answer strip / header answer box:** the option letter or value in `--good`, a decisive
  line, a stage message ("Analyzing…", "Testing options A–D…", "Calculating final result…")
  and a progress bar.
- **Unknown tiles** (`X = ?`), filled as stages complete.
- **Option / audit board:** claim → evidence → verdict, stamped "(C) ✓ SUPPORTED" / "✗".
- **Badges**, a **reasoning log** (timestamped rows) and an **evidence table**.
- **Instrument gauges** in the rail, reading the same state as the charts.
- `.assume` (left-bordered assumption note) and `.verify` (green-bordered block, ≥ 5
  independent checks).
- Solution `ol.steps`: `h4`, short prose, serif `.eq` blocks, and the decisive result in
  `span.hl`.
- Custom-input states: "✓ QUESTION VALUES LOADED" → "⚙ USING CUSTOM VALUES" → "RUN WITH
  CUSTOM VALUES", plus "↺ RESTORE QUESTION CONDITIONS".
- Trap: `.ctrl label` is flex space-between, so wrap descriptive text in one `<span>`.

## Controls

- New pages: see "Layout v3 (G5)" — `#controls` right by the canvas, ≥ 44 px, no `<select>`.
- G4 pages: primary **▶ START EXPERIMENT** in the dock; secondary Pause/Play, REPLAY, RESET,
  speed chips, CLASSROOM, SHOW EQUATION / OBSERVATION / WHY?, slow motion, OPEN EXPLORER; tap
  targets ≥ 32–34 px; native `select` `min-height:40px`.
- Sliders show value, unit, min, max and step, with large −/+ for phones. Every drag has a tap
  or keyboard fallback.

## Charts

Hand-built inline SVG; no libraries. In new pages a chart appears only if it helps the student
understand or solve the problem — at most two, below the solution (`#analysis`), unless one is so
central it belongs in the experiment itself.

- Recessive 1 px grid in `--line`; 1.5 px axes in `--line-strong`; 2 px series lines.
- Markers ≥ 5 px with a 2 px `--surface-1` ring; bars `rx:4`.
- Colour follows the entity in a fixed order across panels. **Direct-label every series**
  (`--s3` is below 3:1 contrast on light).
- A dashed muted reference line where theory predicts something. Never two y-scales.
- Charts respond to inputs. Fit results go under the chart, not on it.
- The same numbers are also available as an HTML table (in `<details>` if long).

## Animation

- Motion-graphics layer on the lab canvas: ambient backdrop, drifting motes, a kinetic title
  card per stage, stage wipes, sparks and rings when bonds break or form or values land,
  glossy shaded atoms, chips flying to the answer, electron comets along the arrows.
- **Meaningful only:** every motion is a real event (CAUSE → PROCESS → EFFECT).
- A virtual clock, so pause, speed (0.5× / 1× / 2×) and reduced motion govern everything.
- Reveal: "🎉 ANSWER FOUND! 🎉", CONGRATULATIONS, confetti; the answer **blinks once and
  stops**.

```css
@keyframes popblink{0%{transform:scale(1)} 12%{transform:scale(1.16)} 24%{transform:scale(1)}
  38%{opacity:.2} 50%{opacity:1} 64%{opacity:.2} 76%{opacity:1}
  88%{transform:scale(1.07)} 100%{transform:scale(1);opacity:1}}
.blink{animation:popblink 2s ease-in-out 1;display:inline-block}
@keyframes ringpulse{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--good) 55%,transparent)}
  70%{box-shadow:0 0 0 14px transparent} 100%{box-shadow:0 0 0 0 transparent}}
.celebrate{animation:ringpulse 1.5s ease-out 2}
@media(prefers-reduced-motion:reduce){.blink,.celebrate{animation:none}}
```

Strip the class after about 2.3 s. To restart it: remove the class, read `offsetWidth`, then
add it back.

## Immersive layer (future pages)

Progressive, per `docs/SIMULATION_STANDARDS.md` §6:

- depth and perspective on apparatus; believable glassware, liquids and light
- rotatable, zoomable molecules and apparatus with selectable atoms, bonds and components
- parallax and particle / fluid motion driven by the model

Start with pseudo-3-D (Canvas depth sorting, the technique the G4 explorers already use).
WebGL needs owner approval. Keep 60 fps-class smoothness on ordinary phones, a
reduced-motion path, and labels on any exaggeration.

## Accessibility and mobile

- `role="img"` + a meaningful `aria-label` on every canvas and SVG; `aria-live` on
  narration and the answer.
- Keyboard control in explorers (arrow keys). Colour is never the only signal (✓ / ✗ text).
- No horizontal scroll at 390 and 360 px. The canvas scales to width, the rail stacks under
  the screen, and the dock wraps.

## Anti-patterns

- Decorative animation or controls; fake graph data; a hard-coded answer; a distorted scale
  without a label.
- Clutter, cartoon effects, irrelevant gamification (XP, coins, streaks).
- Over-dashboarding (new pages): card grids, stats panels, gauge grids, badges, raw logs, event
  histories, state dumps or debug counters shown to students; a small experiment surrounded by
  panels; dropdowns for primary controls; controls far from the experiment; graphs added because
  the framework can.
- Permanently flashing elements; colour as the only signal.
- Duplicate element ids; `white-space:nowrap` equations without `min-width:0` parents;
  annotations colliding with axes; new series colours; external fonts or CDNs.
