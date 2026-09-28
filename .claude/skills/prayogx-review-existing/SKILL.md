---
name: prayogx-review-existing
description: Review, fix or improve one EXISTING PrayogX simulation the owner has explicitly named ("Fix Q15, the answer seems wrong", "Make P2 Q08 more interactive", "Redo Q8"). Minimal, generation-preserving changes, with a revision bump. Never use it to retrofit pages on your own initiative.
---

# Review or change an existing simulation

Only when the owner explicitly asks about **that** page. The 32 pages belong to four
generations (`docs/SIMULATION_STANDARDS.md` §3). A change keeps the page's generation. **The
immersive / layout-v2 standard is never a reason to retrofit an old page.** Adopt it only if
the owner asks for that specific upgrade.

## Workflow

1. **Inspect.** Read the page, its `meta.json`, `question.md`, its tests (if any) and its
   generation. Run its existing suite and verifier first, so later failures are attributable
   (Paper 2 pages have no suites and no `window.PX`).
2. **Identify the issue** precisely: reproduce it, name the element or line, and say whether
   it's science, behaviour, layout or wording.
3. **Re-verify the science** independently if the answer or any calculation is involved.
   Compare with the official key. If they disagree: stop and report before changing anything.
4. **Make the minimal change** that fixes the issue. No refactors, no style migrations, no
   new features the owner didn't ask for. Keep ids, `window.PX` hooks and section structure
   unless the fix requires otherwise.
5. **Test.** Re-run the page's verifier and suite (update them if the intended behaviour
   changed, and say so), check 390/360 px overflow and console errors, and screenshot the
   affected stages.
6. **Bump** `revision` and `updatedAt` in `meta.json` and the manifest if the page was
   published (see `prayogx-register` §4).
7. **Regenerate:** `sync_manifest.py → build_content.py → check_library.py →
   production_audit.py`, and confirm the drift gate.
8. **Validate** with `prayogx-validate` §5, and confirm with `git status` that no other
   simulation changed.
9. **Report exactly what changed**: the problem, the cause, the change (file and region),
   before and after, the tests and their counts, and the revision. Don't commit unless
   authorised; never push.
