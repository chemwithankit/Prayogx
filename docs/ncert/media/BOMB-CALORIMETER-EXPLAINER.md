# Bomb Calorimeter — Concept Explainer

Status: **B1 design, approved; superseded for social media (2026-10-06)** by the two vertical reels in
[BOMB-CALORIMETER-REELS.md](BOMB-CALORIMETER-REELS.md). Its science, assets, camera shots and verification points still apply.
Source experience: **CON-CHE-CALORIMETER-01** ("How does a calorimeter work?"), scene 11, *The bomb calorimeter*:
its 3-D WebGL apparatus (with the drawn 2.5-D fallback). NCERT: Class 11 Chemistry Part I, Ch 5, §5.2.2(c)
(q = C ΔT, eq. 5.11) and §5.3(a) (ΔU measurements, Fig. 5.7).

This is a **concept explainer**, not a JEE reel: no question, no hook-then-question, no answer reveal. A teacher
explains one physical idea with one model.

## Learning Objective

After watching, a student can explain, in order:

1. what a bomb calorimeter is made of (sealed steel bomb, sample, ignition wire, oxygen; water, insulated
   container, stirrer, thermometer);
2. why the bomb's volume cannot change (rigid walls, ΔV = 0);
3. where the reaction's heat goes (through the steel into the water and the rest of the calorimeter);
4. what is actually measured (a temperature rise, ΔT — not heat, and not ΔU);
5. how ΔT becomes heat (the calorimeter's known heat capacity: heat absorbed = C ΔT; for the reaction q_V = −C ΔT);
6. why that heat is ΔU (no volume change → no expansion work → ΔU = q_V).

Maps to `LO-CHE-CALORIMETRY-BOMB-DELTA-U` and `LO-CHE-CALORIMETRY-CALCULATE` (data/ncert/concepts, CH05).

## Audience

NCERT Class 11 students meeting thermochemistry for the first time; JEE / NEET aspirants revising it. The weakest
student should follow it without pausing: one idea per scene, every symbol said aloud and shown on screen.

## Duration

About **85–90 s** (10 scenes; narration ≈ 220 words, symbols read aloud, at ≈ 150 words per minute, plus short pauses where the model moves).
Within the 60–90 s target. If the owner wants ≈ 70 s, scenes 4 and 5 can merge and scene 10 shortens (see
Open Questions).

## Visual Language

- **The 3-D model is the hero.** Full-frame apparatus; no split screens, no scoreboards, no text cards over it.
- **One idea per shot.** The camera moves only to bring the next part into view, slowly (1.5–2.5 s eased moves),
  and holds while the narration explains it.
- **Highlight, then label.** The part being explained is outlined (the page's existing highlight box style) and
  given one short label; everything else stays visible but unlabelled.
- **Cause → process → effect** in the reaction scenes: wire glows → sample burns → heat ring leaves the bomb →
  water warms → thermometer rises.
- **Lower-third equations** appear only in scenes 8–10, one line at a time, in the page's existing equation style.
- **Calm:** no flashes, no zoom punches, no shaking text, no stop-motion effects, no "WATCH THIS" kickers.
- **Honest data:** the temperatures in scene 11 of the page are illustrative (25.0 → 27.0 °C); the video says so
  on screen and shows **no heat value in kJ** (see Scientific Verification Points).

## Scene-by-Scene Storyboard

Timings are approximate; the voice track sets the final timing (voice-first, docs/NCERT_MEDIA.md §4).
"Existing" means the page already draws it in scene 11; "new" means it would have to be added (see 3-D Assets
Required).

| # | ~s | Camera shot | Visible | Moves / changes | Highlighted | On-screen label | Narration | Scientific purpose | Transition |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 6 | **Wide establishing** (existing scene-11 framing, after its zoom-in) | Whole apparatus: insulated container with its cut-away window, bomb inside, stirrer motor, firing leads, ignition unit, oxygen cylinder | Slow push-in (existing `zoom` move) | — | **Bomb calorimeter** (title) | "This is a bomb calorimeter. It measures the energy released when a substance burns." | Names the instrument and its purpose | Continue the push-in toward the window |
| 2 | 9 | **Bomb interior close-up** (new) through the window | Steel bomb (cut-away), sample cup, ignition wire, oxygen molecules (red pairs) | Oxygen molecules drift (existing) | Bomb wall, then the sample and wire, then the oxygen (one at a time) | **steel bomb** · **sample** · **ignition wire** · **oxygen, O₂** | "At its centre is the bomb, a sealed steel vessel. Inside, a small sample touches a thin ignition wire, surrounded by oxygen." | What reacts, where, and with what | Pull back to see the water around the bomb |
| 3 | 8 | **Calorimeter mid shot** (new, between 1 and 2) | Bomb in water; insulated wall; stirrer; thermometer bulb in the water | Stirrer turns slowly (existing) | Water, then insulation, then stirrer, then thermometer | **water (known mass)** · **insulated container** · **stirrer** · **thermometer** | "The bomb stands in a known amount of water, inside an insulated container, with a stirrer and a thermometer." | The surroundings that will receive the heat; insulation keeps it in | Hold, then ease toward the bomb wall |
| 4 | 7 | **Bomb wall close-up** (new) | Side of the bomb with its bolted cap | Existing `push` animation: the arrow presses, the wall does not move | Bomb wall | **rigid walls · volume constant (ΔV = 0)** | "The bomb's walls are rigid. They cannot move, so its volume stays constant." | Establishes the constant-volume condition *before* the reaction (see Teaching Order) | Cut back to the interior shot |
| 5 | 7 | **Bomb interior close-up** (same as 2) + ignition unit inset or quick pan (new) | Ignition unit FIRE light; wire; sample | Existing `ignite`: FIRE glows, wire glows, sample burns; O₂ molecules become product molecules | Wire, then flame | **ignition** | "A current through the wire ignites the sample, and it burns in the oxygen, sealed inside the bomb." | Cause: the reaction happens inside the closed, rigid vessel | Hold on the burning sample; heat ring begins |
| 6 | 9 | **Calorimeter mid shot** (same as 3) | Bomb, water, stirrer | Existing heat rings expand from the bomb wall into the water; water tint warms (existing) | Heat rings / arrows from bomb to water | **heat flows into the water** | "The reaction releases energy as heat. The heat flows through the steel into the water, and the stirrer spreads it evenly." | Process: heat transfer out of the reaction into the calorimeter | Ease to the thermometer |
| 7 | 9 | **Thermometer shot** (new: the in-water thermometer with the existing magnified thermometer and readout) | Thermometer column, readout | Existing rise 25.0 → 27.0 °C, levelling off | Thermometer column | **ΔT = rise in temperature** · *temperatures illustrative* | "The thermometer rises, then levels off. It measures temperature, not heat. We record the rise: delta T." | Effect: the only thing measured is ΔT | Pull back to the full calorimeter |
| 8 | 11 | **Calorimeter mid shot**, slightly wider (new framing) | Bomb + water + container all outlined together | Outline grows from the water to include bomb and container | Whole calorimeter as one system | **calorimeter: bomb + water + container** · **heat capacity C (known)** · then lower third: **heat absorbed = C ΔT** · **q_V = −C ΔT** | "Together, the bomb, the water and the container form the calorimeter. Its heat capacity, C, is known, so it absorbed C delta T of heat. The reaction gave out exactly that: q V equals minus C delta T." | Converts the measured ΔT into heat, with the correct system and sign | Hold; move to the bomb |
| 9 | 9 | **Bomb close-up** (as 4) | Bomb, still unmoved | No motion; existing "q_V = ΔU" tag appears | Bomb wall | **ΔV = 0 → w = 0** · lower third: **ΔU = q + w = q_V** | "The volume never changed, so no expansion work was done. All of the energy change left as heat. So, at constant volume, delta U equals q V." | First law with w = 0: q_V is ΔU | Slow pull-back to the wide shot |
| 10 | 10 | **Wide** (as 1), slow pull-back | Whole apparatus, settled | — | Four parts lit in turn: bomb → water → thermometer → bomb | Chain: **rigid bomb → heat into calorimeter → measure ΔT → q_V = −C ΔT = ΔU** · source line **NCERT Class 11 Chemistry · Ch 5 · §5.3** · PrayogX mark | "A rigid bomb means no work. So the heat the calorimeter takes in, C delta T, is the energy the reaction loses: delta U equals minus C delta T." | One mental model | Fade to end card (PrayogX + concept page) |

### Teaching order — one change from the suggested list

The suggested list placed "why the bomb is rigid" (7) after the temperature measurement (6). This storyboard
explains rigidity in **scene 4, before ignition**, and returns to it in scene 9:

- The page itself teaches it that way (inspect → push the wall → ignite), so the footage exists in that order.
- Constant volume is a property of the apparatus, not a result of the experiment. Stating it first lets the
  student watch the reaction already knowing "this happens at constant volume", and scene 9 only has to connect
  it to the first law instead of introducing a new idea late.
- Scene 9 recalls the same shot, so the link "ΔV = 0 → w = 0 → ΔU = q_V" is visual as well as verbal.

## Full Narration

Spoken form in brackets where a symbol is read aloud (for the voice script).

1. This is a bomb calorimeter. It measures the energy released when a substance burns.
2. At its centre is the bomb, a sealed steel vessel. Inside, a small sample touches a thin ignition wire,
   surrounded by oxygen.
3. The bomb stands in a known amount of water, inside an insulated container, with a stirrer and a thermometer.
4. The bomb's walls are rigid. They cannot move, so its volume stays constant.
5. A current through the wire ignites the sample, and it burns in the oxygen, sealed inside the bomb.
6. The reaction releases energy as heat. The heat flows through the steel into the water, and the stirrer
   spreads it evenly.
7. The thermometer rises, then levels off. It measures temperature, not heat. We record the rise: ΔT
   [delta T].
8. Together, the bomb, the water and the container form the calorimeter. Its heat capacity, C, is known, so it
   absorbed C ΔT [C delta T] of heat. The reaction gave out exactly that: q_V = −C ΔT [q V equals minus
   C delta T].
9. The volume never changed, so no expansion work was done. All of the energy change left as heat. So, at
   constant volume, ΔU = q_V [delta U equals q V].
10. A rigid bomb means no work. So the heat the calorimeter takes in, C ΔT, is the energy the reaction loses:
    ΔU = −C ΔT [delta U equals minus C delta T].

≈ 220 words (≈ 85–90 s). Calm, even pace; a short pause after scenes 4, 7 and 9, where the model makes the point.

## 3-D Assets Required

| Asset | In CON-CHE-CALORIMETER-01 scene 11? |
|---|---|
| Insulated container with cut-away window, water bucket, water body | existing (`calorimeter3`, bucket mode) |
| Steel bomb (cut-away) with bolted cap and terminals | existing (`bombScene3`) |
| Sample cup + ignition wire | existing |
| Oxygen molecules → product molecules after burning | existing (red O₂ pairs; after burning labelled "carbon dioxide, CO₂") — see Open Questions |
| Stirrer + motor, turning | existing (`stir3`, motor) |
| Thermometer in the water + magnified thermometer + digital readout | existing (3-D thermometer, `bigTherm`, readout) |
| Firing leads, ignition unit with FIRE light | existing (`igniter3`) |
| Oxygen cylinder | existing (`o2Cyl`) |
| Heat rings leaving the bomb into the water; water warming | existing (sprites during `ignite`) |
| "Push the wall" arrow; wall does not move | existing (`push`) |
| Part highlight box | existing (`hiBox` on inspected parts) |
| "q_V = ΔU" tag; sign chips | existing |
| **One outline around bomb + water + container as "the calorimeter"** | **new** |
| **Labels for C, C ΔT, q_V = −C ΔT, ΔU = q + w** | **new** (the page's sign card says "ΔU = q_V = −q_water": water only — not used, see F1) |
| **A clean presentation mode**: no lab guide, step dots, NEXT / sticky buttons, "push here" / "press FIRE" invitations | **new** |

## Camera Shots Required

The page renders scene 11 from **one fixed framing** (desktop and phone variants) plus an intro zoom, with a
small user orbit (yaw / pitch). It has no named shots and no scripted moves within a scene.

| Shot | Use | Exists? |
|---|---|---|
| `wide` | scenes 1, 10 | **existing** — the scene-11 framing (desktop `eye [6.5,23,58] at [6.5,8.4,0]`, phone variant) and its intro zoom |
| `calorimeter` (mid) | scenes 3, 6, 8 | **new** — closer, centred on the bucket, window facing camera |
| `interior` (close) | scenes 2, 5 | **new** — through the window onto the bomb's cut-away, sample and wire |
| `wall` (close) | scenes 4, 9 | **new** — the bomb's side and cap |
| `thermometer` (close) | scene 7 | **new** — the in-water thermometer; the magnified 2-D thermometer stays as an overlay |
| `ignition` (pan or inset) | scene 5 | **new**, optional — the FIRE light; can be an inset instead of a camera move |

These map directly onto the Experience Kit's camera contract (`cam@1`: named shots, eased moves with target lead,
tall variants for 9:16) and the Director (`dir@1`: shot / say / wait steps) — but the calorimeter page predates
the kit and does not use it. See Production Plan for how to get there without new rendering architecture.

## On-Screen Labels

Short, lower-case nouns on the model; equations only as lower thirds in scenes 8–10.

- Scene 1: **Bomb calorimeter**
- Scene 2: steel bomb · sample · ignition wire · oxygen, O₂
- Scene 3: water (known mass) · insulated container · stirrer · thermometer
- Scene 4: rigid walls · volume constant (ΔV = 0)
- Scene 5: ignition
- Scene 6: heat flows into the water
- Scene 7: ΔT = rise in temperature · *temperatures illustrative*
- Scene 8: calorimeter: bomb + water + container · heat capacity C (known) · heat absorbed = C ΔT · q_V = −C ΔT
- Scene 9: ΔV = 0 → w = 0 · ΔU = q + w = q_V
- Scene 10: rigid bomb → heat into calorimeter → measure ΔT → q_V = −C ΔT = ΔU · NCERT Class 11 Chemistry · Ch 5 · §5.3

No kJ value appears anywhere (see V6).

## Scientific Verification Points

| # | Claim | Basis |
|---|---|---|
| V1 | The bomb is a sealed, rigid steel vessel; its volume does not change (ΔV = 0) | NCERT §5.3(a); the page's `push` (the wall does not move) |
| V2 | The sample burns in oxygen inside the bomb, ignited electrically | NCERT Fig. 5.7 (firing leads, oxygen); page: ignition unit, wire, O₂ |
| V3 | The heat released passes through the steel into the water; the stirrer spreads it; insulation limits loss | NCERT §5.3(a); page: heat rings, stirrer, insulated container |
| V4 | The thermometer measures temperature, not heat; the measured quantity is ΔT | page PARTS/BPARTS text; NCERT §5.2.2(c) |
| V5 | Heat absorbed by the **calorimeter** = C ΔT, C = the whole calorimeter's heat capacity (bomb, water, container), known beforehand | NCERT eq. 5.11 (q = C ΔT); §5.3 sums the liquid's and the calorimeter's heat capacities. **Not** "q_water" (F1) |
| V6 | For the reaction, q_V = −C ΔT (negative: the reaction gave out heat) | sign convention, NCERT §5.1/5.2; the page's sign chips |
| V7 | With ΔV = 0 there is no expansion work: w = −p ΔV = 0 | NCERT §5.3(a) ("no work is done") |
| V8 | First law: ΔU = q + w; with w = 0, ΔU = q_V | NCERT §5.1.4 / §5.3(a) |
| V9 | So ΔU = q_V = −C ΔT, for the amount burned | follows from V5–V8 |
| V10 | ΔT is **not** ΔU: ΔT is a measured temperature change of the calorimeter; ΔU is the reaction's internal-energy change, inferred from it | stated explicitly in scenes 7–9 |

Three quantities are kept apart throughout: **reaction heat q_V** (negative), **heat absorbed by the calorimeter
C ΔT** (positive, equal in size) and **ΔU**, inferred as q_V.

## Audio Direction

- **Voice:** one calm teacher voice, measured pace (≈ 150 wpm), English. The narrated-reel voice layer
  (tools/reel-maker/README.md → Voiceover) applies: reviewed spoken-form script, verified audio, provenance and the
  AI-voice disclosure if a synthetic voice is used.
- **Music:** a soft, slow, low-level bed (no drops, no risers, no hit on a "reveal"); ducked well under the voice
  (≥ 10 dB, NCERT_MEDIA.md §4). It may stop entirely under scenes 8–9.
- **Effects:** minimal and physical only: a soft click at ignition, a low whoosh as the heat ring leaves the bomb.
  No pops on labels.
- **Original only:** composed by the existing tooling and listed in audio_library.json, as for every PrayogX sound.

## Production Plan

B2 is not started; this is the proposed route, for approval.

1. **Owner decisions first** (Open Questions 1–4).
2. **Make scene 11 directable without new rendering architecture.** Two options:
   - **(a) Recommended:** an owner-approved, additive *explainer mode* in CON-CHE-CALORIMETER-01 (for example a
     `?explain` flag): no guide panel or buttons, the 4–5 new camera framings, the "calorimeter" outline and
     lower-third labels, driven by a deterministic shot list on the page's own clock so the existing recorder
     captures it frame-exactly. Uses the page's existing WebGL renderer and 2.5-D fallback. The page is frozen,
     so this needs explicit approval and bumps its revision; the student-facing page is unchanged when the flag
     is absent.
   - **(b)** A separate media-only page that copies the scene-11 renderer. Leaves the frozen page untouched but
     duplicates ≈ 100 KB of rendering code that would then drift.
3. **Voice first:** write the reviewed spoken-form script, generate and verify the voice (explicit, under a credit
   cap), measure line lengths; scene timings follow the voice.
4. **A new composition template, `concept-explainer-v1`**, in the reel maker: full-frame footage, no question /
   answer beats, labels and lower thirds from the shot list, narration captions (.srt), end card. The current JEE
   template and the rejected `concept-reel-standard-v1` grammar are not used.
5. **Formats:** render the master at 1920 × 1080 (YouTube, classroom, NCERT Explorer) and a native 1080 × 1920
   version from the same shot list using the camera's tall variants — a 3-D scene is re-rendered, not cropped.
6. **Checks:** the existing video / audio / source-integrity checks, plus explainer checks: every scene's label
   present, no question or answer-reveal beat, voice within the video and ≥ 10 dB over music, captions present,
   duration 60–90 s, no kJ value on screen, the "illustrative" note visible in scene 7.
7. Review → approval → publishing only through the existing gates.

## Open Questions / Risks

1. **Which page is the explainer built from?** This spec uses CON-CHE-CALORIMETER-01 scene 11 (the 3-D bomb
   calorimeter). The previous request called the work "XP-09" (CON-CHE-DELTA-U-VS-DELTA-H, the two-calorimeter
   page, 2-D). Please confirm.
2. **Option (a) or (b)** in the Production Plan — (a) touches a frozen page (additively, behind a flag).
3. **F1 — water-only heat in the page.** The page's scene-11 text and sign card say "ΔU = q_V = −q_water" (and
   scene 9 teaches q = m c ΔT for the water). For a bomb calorimeter the steel bomb and container also absorb heat;
   NCERT uses the calorimeter's heat capacity (eq. 5.11). The explainer uses C ΔT; the page's wording is a
   simplification that may deserve a later correction (not part of this work).
4. **Product molecules.** After burning, the page labels the product "carbon dioxide, CO₂", but the sample's
   identity is never stated (and water would also form from most fuels). The narration says only "the sample
   burns"; proposal: label the product dots "products" in the explainer, or name a fuel.
5. **Illustrative temperatures.** 25.0 → 27.0 °C is illustrative (`DTV = 2.0`) and, in the 3-D view, is
   hard-coded rather than taken from the engine. The explainer shows "illustrative" and no heat value. A worked
   number (e.g. NCERT's graphite example, C = 20.7 kJ K⁻¹) would need a model change and its own verification.
6. **Per mole.** ΔU from the run is for the amount burned; the molar ΔU divides by the moles burned. Proposed: a
   one-line note in scene 10 only if the owner wants it (it adds ≈ 4 s).
7. **Small details deliberately left out** of the narration (true, but beyond a first explanation): the ignition
   wire's own small electrical energy (corrected for in practice); the pressure inside the bomb changing while the
   volume does not; the reaction's temperature changing slightly during the run.
8. **Duration.** ≈ 85–90 s, at the top of the range; a ≈ 70 s cut merges scenes 4 + 5 and shortens scene 10.
9. **Narration publishing.** Narrated videos are not yet publishable to Instagram (variants unsupported by the
   publishers); YouTube handles synthetic-media disclosure. The silent-plus-captions version is a fallback.
10. **Rejected Phase B code.** The uncommitted Phase B changes (`context.js`, the `concept-reel-standard-v1`
    template and its validator / YouTube branches, the XP-09 reel story and tests) are still in the working
    tree. The concept *context* (NCERT class / chapter / page link, no JEE fields) is reusable for the explainer;
    the reel template is not. Keep, rework or discard — owner's decision.
