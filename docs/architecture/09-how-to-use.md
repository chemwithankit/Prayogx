# 09 — PrayogX 2.0: how to use it (built 2026-11-21)

**New reels only.** Past reels, published videos, Learn pages and the website are never changed by these tools.
Owner decisions (2026-11-21): phases 1–4; package ID = roadmap RM-ID; no separate Instagram cut for now; website
stats from Search Console only (no website change).

## Per new reel

```bash
python3 tools/content_package.py init RM-12-CHE-08-013          # 1. package + job link
#   fill packages/<RM-ID>/ facts, glossary, coverage, questions (35+: 10 quiz, 25 workbook), equations
python3 tools/maths_validator.py "MnO4^- + 8 H^+ + 5 e^- -> Mn^2+ + 4 H2O"
python3 tools/content_package.py check RM-12-CHE-08-013
#   write jobs/<slug>/hooks.json (Hook Creator), then the usual Studio stages
python3 tools/reel_pipeline.py check <slug>                      # 2. after every stage; stops at the first failure
#   independent QA writes jobs/<slug>/qa.json (ten checks + score)
python3 tools/content_package.py export RM-12-CHE-08-013         # 3. quiz.json + workbook.json
```

READY_FOR_REVIEW from the gate runner = every gate passed. Approval and publishing are unchanged (you approve).

## What exists now

| Tool | What it does |
|---|---|
| `tools/content_package.py` | one source of truth per concept; checks counts, facts, coverage, equations, same words everywhere |
| `tools/maths_validator.py` | balances chemical equations (atoms + charge, electrons, hydrates) and checks numbers; Python decides |
| `tools/reel_pipeline.py` | gate runner: package → research → hook → script (Hinglish lint) → plan → build (reuse check) → render (qa_reel) → independent QA ≥ 90 → deliverables |
| `tools/model_router.py` + `tools/router_policy.json` | Gemini fact check (Search grounding), text, Nano Banana image, Gemini-TTS; **OFF** until you turn it on |
| `tools/analytics_report.py` | read-only YouTube Analytics, Search Console, Instagram snapshot → `packages/analytics/` |
| `tools/schemas/*.json` | the agent output formats |
| `.claude/skills/prayogx-reel-studio/agents/hook-creator.md` | the new Hook Creator role; Scorecard v2 measures in `quality-gates.md` |
| `tests/test_px2.py` | 23 checks, in `tests/runall.sh` |

## What only you can switch on

1. **Gemini** (fact check, image, TTS bake-off): create a Gemini API key in a billed Google Cloud project with a
   budget alert, put `GEMINI_API_KEY=` in `.env`, then set `"enabled": true` and a `monthlyBudgetUSD` in
   `tools/router_policy.json`. Check the model IDs there first.
2. **Analytics**: set `YT_ANALYTICS=true` and `SEARCH_CONSOLE_SITE=sc-domain:prayogx.co.in` in `.env`, then run
   `python3 tools/youtube_publish.py auth` once (adds read-only YouTube Analytics + Search Console access).
   Then `python3 tools/analytics_report.py all` weekly.
