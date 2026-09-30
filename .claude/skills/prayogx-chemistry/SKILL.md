---
name: prayogx-chemistry
description: Chemistry doctrine for PrayogX simulations: organic mechanisms (two-level, arrow-pushing on molecule graphs), physical-chemistry apparatus and measurements, inorganic/coordination geometry, and the independent verification routes. Use with prayogx-new-simulation or prayogx-review-existing for any Chemistry question.
---

# Chemistry simulations

Full conventions: `docs/SIMULATION_STANDARDS.md` §7. This skill is the working checklist.
**Chemical correctness is never traded for a visual effect.**

## All chemistry

- Use standard data (ΔH°, S°, pKa, bond lengths…) and cite it in the solution. Where the
  question names only a class of process, use representative values and **say so** on the
  page and in `meta.json` → `verification.note`.
- Every custom option must be chemically meaningful, and flagged honestly when it leaves the
  question's pathway.
- Independent verification routes, available locally in `tests/.venv`: **sympy** (exact
  algebra), **RDKit** (reaction templates, SMARTS, canonical SMILES, 2-D coordinates, 3-D MMFF
  embedding), **numpy/scipy** (numerical integration, optimisation), literature values.
  `pyscf` is optional and not installed; verifiers must work without it.

## Organic (every reaction-based question)

- [ ] **Two levels in sync:** the vessel (reagents, colour, gas, precipitate, temperature)
      beside the molecules. Each vessel event is tied to its exact mechanistic step.
- [ ] Molecules are graphs: atoms with element, implicit H and position; bonds with order.
      Draw real structures: atom labels with H counts, bond orders, rings.
- [ ] Each elementary step = a list of curved arrows **pushed** on the graph (one electron
      pair: from a lone pair or bond → into a bond or onto an atom). Intermediates and
      products are **computed**, never drawn as new pictures.
- [ ] Charges are derived from bonding (C = v−4, N = v−3, O/S = v−2, halogen = v−1…), never
      typed.
- [ ] After every step: a valence check and total-charge conservation. The suite asserts
      that every intermediate is valid and every product equals what its arrows produce.
- [ ] Show the attacking species (lone pair), the direction of attack, bonds breaking (red,
      dashed) and forming (green), the electron pair travelling along each arrow in order,
      intermediates, and the product. Structures never simply appear or disappear.
- [ ] Name each step; show stereochemistry where it matters.
- [ ] Identify products and match them to the options **by structure comparison** (formula,
      functional groups, ring sizes, graph hash), never by a stored mapping. Compute
      selectivity rules and show the rejected alternatives.
- [ ] Show the reaction conditions and their observable consequences (cold baths, gas
      bubbling, end-point colours, precipitates, heating).
- [ ] The detailed solution draws every compound and the full mechanism with curved arrows,
      plus a summary table and traps.
- [ ] Layout coordinates may be precomputed at build time (RDKit, e.g. `tests/gen_q15.py`).
      **The chemistry may not.**
- [ ] Layout v3 (new pages): the molecules and the vessel are the hero — large enough to see atoms,
      bonds, bond changes, intermediates and electron movement from several feet away; no tiny
      structures beside large panels (standards §4).
- [ ] Immersive target: rotate and zoom the molecules, select the reacting atoms and bonds,
      view them from different angles, where that aids understanding.

## Physical chemistry

- [ ] Realistic, appealing apparatus: calorimeter, DSC cell, cylinder and piston,
      electrochemical cell, bubbler, flask in a bath, meters, particle view.
- [ ] Controls = the equation variables (T, P, n, V, c…), pre-filled with the question's
      values.
- [ ] Instruments show live measurements; derived quantities are computed from the data or a
      physical model (e.g. Hess cycles, Sackur–Tetrode, a numerically integrated DSC peak).
- [ ] Graphs come from the model and respond to inputs. Compressed / symlog axes and "not to
      scale" gaps are labelled.
- [ ] Equations are bound live to the student's numbers; observations are narrated;
      calculations are logged.
- [ ] Immersive target: liquids, gases, electrodes and particles that move with the model,
      with readings changing realistically.

## Inorganic and coordination

- [ ] Spatial structures: rotatable ball-and-stick with depth sorting, lone pairs as lobes,
      labelled atoms, an explorer with rotation and auto-spin.
- [ ] VSEPR: lone pairs counted from electrons; domains relaxed with LP–LP > LP–BP > BP–BP;
      the shape named from the bonded-atom angles only.
- [ ] Coordination: octahedral positions **1–4 around the square plane, 5–6 axial** (trans
      pairs 1-3, 2-4, 5-6), with the key printed where drawn. Define cis / trans / fac / mer
      at the moment of use. Compute chelation, linkage and geometric isomers and the mirror
      test. Prove by exhaustion that any arbitrary placement choice cannot change the answer.
- [ ] Electronic structure (MO filling, d-electron count) shown visually when it drives the
      answer.
- [ ] Observations (colour, precipitate, gas) are tied to the structure.
