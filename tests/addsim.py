#!/usr/bin/env python3
"""Add one simulation to the canonical source, exactly as the real workflow does."""
import json, os, subprocess, sys

ROOT = os.environ.get("PRAYOGX_ROOT",
                      os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SID  = "ADV-2026-P2-PHY-Q99"

# Idempotent: if a previous run left the probe behind, clear it first so the
# revision lock can never see "changed content, same revision".
if os.path.isdir(os.path.join(ROOT, "simulations/2026/paper-2/physics")):
    subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), "removesim.py")],
                   capture_output=True, text=True)
SLUG = SID.lower()
FOLDER = "simulations/2026/paper-2/physics/%s/" % SLUG
D = os.path.join(ROOT, FOLDER)
os.makedirs(D, exist_ok=True)

open(os.path.join(D, "index.html"), "w", encoding="utf-8").write("""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Propagation probe — JEE Advanced 2026 Paper 2 Q.99 | PrayogX</title>
<meta name="description" content="A temporary probe simulation used to prove that one addition to the canonical source reaches every client.">
<meta name="sim-id" content="%s">
<link rel="icon" href="data:,">
<style>body{font:15px system-ui;padding:30px;background:#0d1118;color:#eef3ff}</style>
</head><body>
<h1>Propagation probe</h1>
<p id="marker">PROPAGATION-PROBE-OK</p>
<script>window.PROBE = "%s";</script>
</body></html>
""" % (SID, SID))

meta = {
  "id": SID, "slug": SLUG, "revision": 1,
  "path": FOLDER + "index.html", "folder": FOLDER,
  "title": "Propagation probe: one addition, every client",
  "shortTitle": "Propagation probe",
  "summary": "A temporary probe added to prove that a single addition to data/manifest.json reaches the website, the PWA and both mobile apps with no other change.",
  "exam": "JEE Advanced", "year": 2026, "paper": "Paper 2", "paperNumber": 2,
  "subject": "Physics", "branch": "Test", "questionNumber": 99,
  "section": "Section 1", "questionType": "Numerical value",
  "marking": {"full": 4, "partial": 0, "zero": 0, "negative": 0},
  "chapter": "Propagation Test", "topic": "Single-source delivery",
  "subtopics": ["Content pipeline", "Client synchronisation"],
  "concepts": ["One canonical source feeds every client"],
  "formulas": ["n/a"],
  "tags": ["propagation", "probe", "pipeline"],
  "difficulty": "Easy", "estimatedMinutes": 1,
  "answer": "42", "answerValue": "42",
  "derivedQuantities": {"probe": 1},
  "verification": {"status": "verified", "methods": ["temporary probe"],
                   "verifiedOn": "2026-09-20", "note": "temporary"},
  "interactivity": ["Nothing; it exists to be found by every client"],
  "source": {"file": "n/a", "page": 0},
  "createdAt": "2026-09-20", "updatedAt": "2026-09-20"
}
open(os.path.join(D, "meta.json"), "w", encoding="utf-8").write(
    json.dumps(meta, indent=2, ensure_ascii=False) + "\n")
open(os.path.join(D, "question.md"), "w", encoding="utf-8").write(
    "# %s — propagation probe\n\nTemporary.\n" % SID)

p = os.path.join(ROOT, "data/manifest.json")
man = json.load(open(p, encoding="utf-8"))
man["simulations"] = [s for s in man["simulations"] if s["id"] != SID] + [meta]
json.dump(man, open(p, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
open(p, "a", encoding="utf-8").write("\n")
print("added %s to data/manifest.json" % SID)

for step in ("tools/sync_manifest.py", "tools/build_content.py", "tools/check_library.py"):
    r = subprocess.run([sys.executable, step], cwd=ROOT, capture_output=True, text=True)
    tail = [l for l in r.stdout.strip().split("\n") if l][-1]
    print("%-26s exit %d   %s" % (step, r.returncode, tail.strip()))
    if r.returncode:
        print(r.stdout); sys.exit(1)
