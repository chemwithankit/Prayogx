/* Auto-generated from manifest.json by tools/sync_manifest.py — do not edit by hand.
   Exposes the manifest as window.SIM_MANIFEST so the website works from file://,
   where fetch() of a local JSON file is blocked. */
window.SIM_MANIFEST = {
  "schemaVersion": "1.0.0",
  "library": {
    "name": "PrayogX",
    "description": "PrayogX: interactive 2D scientific simulations built from selected JEE Advanced Physics and Chemistry questions.",
    "generator": "Cowork autonomous simulation agent",
    "updatedAt": "2026-08-26",
    "tracker": {
      "type": "Google Sheet",
      "title": "PrayogX — Simulation Progress Tracker",
      "id": "1TPwZ9rvYbVjYj8aRckp2A5TkuU8qV-BCcEvUgfx-gFA",
      "url": "https://docs.google.com/spreadsheets/d/1TPwZ9rvYbVjYj8aRckp2A5TkuU8qV-BCcEvUgfx-gFA/edit",
      "localSource": "data/tracker.csv",
      "note": "data/tracker.csv is the local source of truth. The Drive connector cannot append rows to an existing sheet, so the sheet is recreated from the CSV on each update and its URL changes; always take the URL from here."
    },
    "fullName": "PrayogX — JEE Advanced Interactive Simulation Library",
    "tagline": "Interactive JEE Advanced Physics and Chemistry simulations"
  },
  "conventions": {
    "simulationId": "ADV-<YEAR>-P<PAPER>-<SUBJ3>-Q<NN>",
    "subjectCodes": {
      "PHY": "Physics",
      "CHE": "Chemistry",
      "MAT": "Mathematics"
    },
    "folder": "simulations/<year>/paper-<n>/<subject>/<lowercase-id>/",
    "files": {
      "index.html": "self-contained interactive simulation (opens directly, no build step, no network)",
      "meta.json": "per-simulation metadata (authoritative source for the manifest entry)",
      "question.md": "verbatim question text, data, options, answer and worked solution"
    },
    "idPolicy": "Simulation IDs are permanent. A redo or fix edits the existing folder in place and bumps `updatedAt` / `revision`; it never mints a new ID."
  },
  "counts": {
    "total": 4,
    "byYear": {
      "2026": 4
    },
    "bySubject": {
      "Chemistry": 4
    },
    "byChapter": {
      "Electrochemistry": 1,
      "Chemical Bonding and Molecular Structure": 1,
      "Aldehydes, Ketones and Carboxylic Acids": 1,
      "Biomolecules": 1
    }
  },
  "simulations": [
    {
      "id": "ADV-2026-P2-CHE-Q01",
      "slug": "adv-2026-p2-che-q01",
      "revision": 1,
      "path": "simulations/2026/paper-2/chemistry/adv-2026-p2-che-q01/index.html",
      "folder": "simulations/2026/paper-2/chemistry/adv-2026-p2-che-q01/",
      "title": "Molar conductivity, Kohlrausch's law and the solubility of saturated AgCl",
      "shortTitle": "Solubility of AgCl from conductance",
      "summary": "Extrapolate molar conductivities of NaNO3, NaCl and AgNO3 to infinite dilution, combine them by Kohlrausch's law to get the limiting molar conductivity of AgCl, and convert the measured conductivity of a saturated solution into its solubility.",
      "exam": "JEE Advanced",
      "year": 2026,
      "paper": "Paper 2",
      "paperNumber": 2,
      "subject": "Chemistry",
      "branch": "Physical Chemistry",
      "questionNumber": 1,
      "section": "Section 1",
      "questionType": "Single correct MCQ",
      "marking": {
        "full": 3,
        "zero": 0,
        "negative": -1
      },
      "chapter": "Electrochemistry",
      "topic": "Conductance of electrolytic solutions",
      "subtopics": [
        "Molar conductivity and its concentration dependence",
        "Limiting molar conductivity by extrapolation",
        "Kohlrausch's law of independent migration of ions",
        "Solubility of a sparingly soluble salt from conductance measurements"
      ],
      "concepts": [
        "Conductivity vs molar conductivity",
        "Debye-Hückel-Onsager square-root law",
        "Strong vs sparingly soluble electrolytes",
        "Solubility product from solubility"
      ],
      "formulas": [
        "kappa = G * G_cell = (1/R)(l/A)",
        "Lambda_m = 1000 * kappa / c",
        "Lambda_m = Lambda_m_0 - A*sqrt(c)",
        "Lambda_m_0 = nu+ * lambda+_0 + nu- * lambda-_0",
        "Ksp(AgCl) = X^2"
      ],
      "tags": [
        "electrochemistry",
        "conductivity",
        "molar conductivity",
        "limiting molar conductivity",
        "kohlrausch law",
        "independent migration",
        "debye-huckel-onsager",
        "solubility",
        "solubility product",
        "ksp",
        "silver chloride",
        "agcl",
        "sparingly soluble salt",
        "conductivity cell",
        "cell constant",
        "extrapolation",
        "physical chemistry",
        "jee advanced 2026",
        "paper 2",
        "chemistry q1"
      ],
      "difficulty": "Moderate",
      "estimatedMinutes": 8,
      "answer": "(C) 5",
      "answerValue": 5,
      "derivedQuantities": {
        "Lambda0_NaNO3": 121,
        "Lambda0_NaCl": 127,
        "Lambda0_AgNO3": 134,
        "Lambda0_AgCl": 140,
        "solubility_X_mol_per_L": 1e-05,
        "Ksp": 1e-10
      },
      "verification": {
        "status": "verified",
        "methods": [
          "Independent recomputation of slopes and intercepts from the raw table",
          "Closed-form cross-check Lambda0 = 2*Lambda(0.01) - Lambda(0.04)",
          "Dimensional analysis of 1000*kappa/Lambda",
          "Numeric script check: 1000*1.40e-6/140 = 1.000000e-5, -log10 = 5.000000",
          "Physical sanity check against literature Ksp(AgCl) ~ 1.8e-10",
          "Headless-browser run of the simulation reproducing the answer from the live model"
        ],
        "verifiedOn": "2026-08-26"
      },
      "interactivity": [
        "Animated conductivity cell with ion drift, selectable salt, concentration, cell constant and temperature",
        "Live readouts of kappa, Lambda_m, conductance and resistance",
        "Measurement log with least-squares fit of Lambda_m vs sqrt(c)",
        "Lambda_m vs sqrt(c) chart with crosshair tooltip, tabulated points and extrapolated intercepts",
        "Kohlrausch builder with animated spectator-ion cancellation",
        "Saturated-AgCl solubility calculator with kappa and Lambda sliders",
        "Option checker and reveal-style step-by-step solution"
      ],
      "source": {
        "file": "papers/adv_2026_paper_2.pdf",
        "page": 20
      },
      "createdAt": "2026-08-26",
      "updatedAt": "2026-08-26"
    },
    {
      "id": "ADV-2026-P2-CHE-Q02",
      "slug": "adv-2026-p2-che-q02",
      "revision": 1,
      "path": "simulations/2026/paper-2/chemistry/adv-2026-p2-che-q02/index.html",
      "folder": "simulations/2026/paper-2/chemistry/adv-2026-p2-che-q02/",
      "title": "ONO bond angles in NO2+, NO2, NO3- and NO2-",
      "shortTitle": "Ordering ONO bond angles by VSEPR",
      "summary": "Count electron domains on nitrogen for four nitrogen oxo species, see each one drawn to scale at its experimental bond angle, and rank them: a lone pair closes the angle below 120 degrees while a single odd electron lets it open above.",
      "exam": "JEE Advanced",
      "year": 2026,
      "paper": "Paper 2",
      "paperNumber": 2,
      "subject": "Chemistry",
      "branch": "Inorganic / Physical Chemistry",
      "questionNumber": 2,
      "section": "Section 1",
      "questionType": "Single correct MCQ",
      "marking": {
        "full": 3,
        "zero": 0,
        "negative": -1
      },
      "chapter": "Chemical Bonding and Molecular Structure",
      "topic": "VSEPR theory and molecular geometry",
      "subtopics": [
        "Electron-domain (steric number) counting",
        "Lone-pair vs bond-pair vs single-electron repulsion",
        "Odd-electron (radical) species",
        "Resonance and fractional bond order",
        "Isoelectronic series",
        "Walsh's rules for AB2 triatomics"
      ],
      "concepts": [
        "Steric number and electron geometry",
        "Deviation from the ideal 120 degree angle",
        "Symmetry-fixed geometries (D3h, D-infinity-h)",
        "Electron count controls bending in AB2 species"
      ],
      "formulas": [
        "Steric number = sigma-bonded atoms + non-bonding domains on the central atom",
        "Repulsion: lone pair > bonding pair > single electron",
        "SN 2 -> linear 180 deg; SN 3 -> trigonal planar 120 deg (bent if a domain is non-bonding)",
        "Walsh (AB2): 16 valence e- linear; 17-20 bent with angle decreasing",
        "Formal charge = V - N_nonbonding - 0.5 * N_bonding"
      ],
      "tags": [
        "chemical bonding",
        "vsepr",
        "bond angle",
        "molecular geometry",
        "lone pair",
        "bond pair",
        "odd electron",
        "radical",
        "nitrite",
        "nitrate",
        "nitronium",
        "nitrogen dioxide",
        "no2",
        "no2+",
        "no2-",
        "no3-",
        "steric number",
        "hybridisation",
        "resonance",
        "bond order",
        "isoelectronic",
        "walsh rules",
        "inorganic chemistry",
        "jee advanced 2026",
        "paper 2",
        "chemistry q2"
      ],
      "difficulty": "Easy-Moderate",
      "estimatedMinutes": 6,
      "answer": "(B)",
      "answerValue": "NO2- < NO3- < NO2 < NO2+",
      "derivedQuantities": {
        "angle_NO2_minus_deg": 115.4,
        "angle_NO3_minus_deg": 120.0,
        "angle_NO2_deg": 134.1,
        "angle_NO2_plus_deg": 180.0
      },
      "verification": {
        "status": "verified",
        "methods": [
          "Symmetry argument fixes NO3- at 120 deg (D3h) and NO2+ at 180 deg (D-infinity-h) exactly",
          "Isoelectronic cross-checks: NO2+ with CO2 (linear), NO2- with O3 (116.8 deg) and SO2 (119 deg)",
          "Walsh's rules reproduce the 180 -> 134.1 -> 115.4 sequence for 16/17/18 valence electrons",
          "Redundant qualitative ranking by repulsion strength alone, using no numerical angles",
          "Robustness check: order unchanged for any NO2 angle in 121-180 deg and any NO2- angle below 120 deg",
          "Distractor audit of options A, C and D",
          "Headless-browser run: geometry viewer, VSEPR builder, chart and ordering checker all correct, no console errors"
        ],
        "verifiedOn": "2026-08-26"
      },
      "interactivity": [
        "2D geometry viewer drawing each species to scale at its experimental angle, with lone pair / single electron shown",
        "Overlay mode superimposing the other three angles as guides",
        "Free-drag mode to set the angle yourself and compare with experiment",
        "Walsh electron-count slider driving the 16/17/18-electron NO2 series",
        "VSEPR domain builder: choose sigma-bonded oxygens and the non-bonding domain to identify the species",
        "Bar chart of measured angles with hover tooltips and the ideal 120 degree reference",
        "Click-to-order exercise with checking, plus the option checker and step-by-step solution"
      ],
      "source": {
        "file": "papers/adv_2026_paper_2.pdf",
        "page": 20
      },
      "createdAt": "2026-08-26",
      "updatedAt": "2026-08-26"
    },
    {
      "id": "ADV-2026-P2-CHE-Q03",
      "slug": "adv-2026-p2-che-q03",
      "revision": 1,
      "path": "simulations/2026/paper-2/chemistry/adv-2026-p2-che-q03/index.html",
      "folder": "simulations/2026/paper-2/chemistry/adv-2026-p2-che-q03/",
      "title": "Ozonolysis of natural rubber and the intramolecular aldol that follows",
      "shortTitle": "Rubber to cyclopentenone",
      "summary": "Cleave every C=C of cis-1,4-polyisoprene to reach 4-oxopentanal, confirm it with the iodoform and Tollens tests, then discover why the base-mediated ring closure gives a five-membered ring and, after dehydration, cyclopent-2-en-1-one.",
      "exam": "JEE Advanced",
      "year": 2026,
      "paper": "Paper 2",
      "paperNumber": 2,
      "subject": "Chemistry",
      "branch": "Organic Chemistry",
      "questionNumber": 3,
      "section": "Section 1",
      "questionType": "Single correct MCQ",
      "marking": {
        "full": 3,
        "zero": 0,
        "negative": -1
      },
      "chapter": "Aldehydes, Ketones and Carboxylic Acids",
      "topic": "Aldol condensation",
      "subtopics": [
        "Reductive ozonolysis of alkenes (O3 then Zn/H2O)",
        "Structure of natural rubber as cis-1,4-polyisoprene",
        "Iodoform test for a methyl ketone",
        "Tollens test for an aldehyde",
        "Intramolecular aldol and the choice of ring size",
        "Dehydration to an alpha,beta-unsaturated ketone"
      ],
      "concepts": [
        "Alkene cleavage and the effect of the work-up",
        "Enolate formation at the alpha carbon",
        "Ring strain controls which closure happens",
        "Conjugation as the thermodynamic driving force"
      ],
      "formulas": [
        "R2C=CR'2 + O3, then Zn/H2O -> R2C=O + O=CR'2",
        "CH3CO-R + 3I2 + 4NaOH -> CHI3 + RCOONa + 3NaI + 3H2O",
        "RCHO + 2[Ag(NH3)2]+ + 3OH- -> RCOO- + 2Ag + 4NH3 + 2H2O",
        "ring size = |n_alpha - n_carbonyl| + 1",
        "beta-hydroxy carbonyl -> alpha,beta-unsaturated carbonyl + H2O"
      ],
      "tags": [
        "organic chemistry",
        "ozonolysis",
        "natural rubber",
        "polyisoprene",
        "isoprene",
        "polymers",
        "aldol condensation",
        "intramolecular aldol",
        "enolate",
        "ring strain",
        "ring size",
        "cyclopentenone",
        "levulinaldehyde",
        "4-oxopentanal",
        "iodoform test",
        "tollens test",
        "methyl ketone",
        "aldehyde",
        "dehydration",
        "conjugation",
        "alpha beta unsaturated ketone",
        "jee advanced 2026",
        "paper 2",
        "chemistry q3"
      ],
      "difficulty": "Moderate-Hard",
      "estimatedMinutes": 9,
      "answer": "(A)",
      "answerValue": "cyclopent-2-en-1-one",
      "derivedQuantities": {
        "X": "4-oxopentanal (C5H8O2)",
        "aldol": "3-hydroxycyclopentan-1-one (C5H8O2)",
        "Y": "cyclopent-2-en-1-one (C5H6O)",
        "ring_size": 5,
        "ring_strain_kcal_per_mol": {
          "3": 27.5,
          "4": 26.3,
          "5": 6.2,
          "6": 0.1,
          "7": 6.2
        }
      },
      "verification": {
        "status": "verified",
        "methods": [
          "Atom economy: one C5 repeat unit gives one C5 product; X, the aldol and Y balance exactly",
          "Mass balance checked in RDKit: 100.12 - 18.02 = 82.10 = M(Y)",
          "Both diagnostic tests re-derived by SMARTS substructure match on the structure of X",
          "Ring sizes enumerated independently of the drawing for every (alpha carbon, carbonyl) pair: {3,3,5}",
          "Literature precedent: base-mediated cyclisation of levulinaldehyde to cyclopent-2-enone",
          "Conjugation requirement: the thermodynamic product must contain C=C-C=O",
          "Distractor audit: (C) and (D) are C10 dimers, (B) is the strain-forbidden 3-ring aldol",
          "Headless-browser run of the finished page: ozonolysis, both work-ups, all candidates and all six aldol combinations behave correctly"
        ],
        "verifiedOn": "2026-08-26"
      },
      "interactivity": [
        "Ozonolysis slider that cleaves every C=C of a drawn polyisoprene chain and separates the fragments",
        "Choice of reductive (Zn/H2O) or oxidative (H2O2) work-up, with the product changing accordingly",
        "Adjustable number of repeat units, with live bookkeeping of cuts, fragments and carbon count",
        "Candidate picker running the iodoform and Tollens tests on four C5 isomers",
        "Ring-size explorer: choose the alpha carbon and the carbonyl, and the app computes the ring formed",
        "Dehydration step that converts the aldol into the conjugated enone",
        "Bar chart of measured cycloalkane ring strain marking which closures are reachable",
        "Option checker and step-by-step solution with an independent verification log"
      ],
      "source": {
        "file": "papers/adv_2026_paper_2.pdf",
        "page": 21
      },
      "createdAt": "2026-08-26",
      "updatedAt": "2026-08-26"
    },
    {
      "id": "ADV-2026-P2-CHE-Q04",
      "slug": "adv-2026-p2-che-q04",
      "revision": 1,
      "path": "simulations/2026/paper-2/chemistry/adv-2026-p2-che-q04/index.html",
      "folder": "simulations/2026/paper-2/chemistry/adv-2026-p2-che-q04/",
      "title": "Building sucralose from a Fischer projection",
      "shortTitle": "Structure of sucralose",
      "summary": "Convert the given D-galactose Fischer projection to Haworth one carbon at a time, then set the three stereochemical decisions that turn a galactose plus a fructose into sucralose, and watch three of the four printed options fail.",
      "exam": "JEE Advanced",
      "year": 2026,
      "paper": "Paper 2",
      "paperNumber": 2,
      "subject": "Chemistry",
      "branch": "Organic Chemistry / Biomolecules",
      "questionNumber": 4,
      "section": "Section 1",
      "questionType": "Single correct MCQ",
      "marking": {
        "full": 3,
        "zero": 0,
        "negative": -1
      },
      "chapter": "Biomolecules",
      "topic": "Carbohydrates - structure and glycosidic linkages",
      "subtopics": [
        "Fischer and Haworth projections",
        "Anomers and the alpha/beta convention",
        "Epimers: glucose versus galactose at C4",
        "Pyranose and furanose ring forms",
        "Glycosidic linkage in a non-reducing disaccharide",
        "Deoxy-halo sugars",
        "Artificial sweeteners"
      ],
      "concepts": [
        "Reading a Fischer projection into a Haworth ring",
        "The C4 epimeric relationship that defines galactose",
        "Anomeric configuration at two centres in one molecule",
        "Stereoisomers sharing one molecular formula"
      ],
      "formulas": [
        "Fischer to Haworth for a D-sugar: right -> down, left -> up, C6 -> up",
        "alpha-D-anomer: anomeric substituent down; beta-D-anomer: up",
        "galactose = glucose epimeric at C4",
        "sucralose = C12H19Cl3O8"
      ],
      "tags": [
        "biomolecules",
        "carbohydrates",
        "sucralose",
        "sucrose",
        "artificial sweetener",
        "splenda",
        "galactose",
        "fructose",
        "glucose",
        "fischer projection",
        "haworth projection",
        "anomer",
        "alpha anomer",
        "beta anomer",
        "epimer",
        "glycosidic linkage",
        "pyranose",
        "furanose",
        "disaccharide",
        "non-reducing sugar",
        "deoxy sugar",
        "chloro sugar",
        "stereochemistry",
        "jee advanced 2026",
        "paper 2",
        "chemistry q4"
      ],
      "difficulty": "Moderate",
      "estimatedMinutes": 7,
      "answer": "(A)",
      "answerValue": "sucralose",
      "derivedQuantities": {
        "compound": "sucralose",
        "formula": "C12H19Cl3O8",
        "molar_mass_g_per_mol": 397.6,
        "inchikey": "BAQAVOSOZGMPRM-QBMZZYIRSA-N",
        "pyranose_C4": "axial (galacto)",
        "pyranose_anomer": "alpha",
        "furanose_anomer": "beta"
      },
      "verification": {
        "status": "verified",
        "methods": [
          "Each drawn half rebuilt as explicit 3D coordinates and its configuration assigned from geometry by RDKit",
          "Galactose half matched the published sucralose structure only for the axial-C4 build",
          "Fructose half matched only for the CH2Cl-up (beta) build",
          "Reference structure: sucralose InChIKey BAQAVOSOZGMPRM-QBMZZYIRSA-N",
          "Name cross-check against the IUPAC name of sucralose, clause by clause",
          "Formula check: all four options are C12H19Cl3O8, confirming a purely stereochemical question",
          "Redundant chemical argument: chlorination of sucrose at C4 proceeds with inversion, gluco -> galacto",
          "Distractor audit: (B) fails C4 only, (D) fails the fructose anomer only, (C) fails both",
          "Headless-browser run of the finished page: builder, elimination matrix and Fischer stepper all correct"
        ],
        "verifiedOn": "2026-08-26",
        "note": "No official answer key was retrievable at the time of writing; the answer rests on the structural verification above."
      },
      "interactivity": [
        "Fischer-to-Haworth stepper that converts C2, C3, C4 and C5 one at a time with the rule shown",
        "Live table pairing each Fischer side with its Haworth direction",
        "Sweetener builder with three toggles: C4 chlorine axial/equatorial, pyranose alpha/beta, fructose beta/alpha",
        "Live checklist against the three requirements named in the question",
        "Automatic identification of which printed option the current structure is",
        "Elimination matrix scoring all four options against both contested centres",
        "Side-by-side sucrose structure and a table of what chlorination changes",
        "Log-scale plot of relative sweetness for six sweeteners",
        "Option checker and step-by-step solution with an independent verification log"
      ],
      "source": {
        "file": "papers/adv_2026_paper_2.pdf",
        "page": 22
      },
      "createdAt": "2026-08-26",
      "updatedAt": "2026-08-26"
    }
  ]
};
