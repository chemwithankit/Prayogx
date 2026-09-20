#!/usr/bin/env python3
"""Remove the propagation probe and restore the canonical source."""
import json, os, shutil, subprocess, sys
ROOT = os.environ.get("PRAYOGX_ROOT",
                      os.path.dirname(os.path.dirname(os.path.abspath(__file__)))); SID="ADV-2026-P2-PHY-Q99"
p=os.path.join(ROOT,"data/manifest.json")
man=json.load(open(p,encoding="utf-8"))
man["simulations"]=[s for s in man["simulations"] if s["id"]!=SID]
json.dump(man,open(p,"w",encoding="utf-8"),indent=2,ensure_ascii=False); open(p,"a").write("\n")
shutil.rmtree(os.path.join(ROOT,"simulations/2026/paper-2/physics"),ignore_errors=True)
shutil.rmtree(os.path.join(ROOT,"s",SID),ignore_errors=True)
lp=os.path.join(ROOT,"data/revisions.json")
lock=json.load(open(lp,encoding="utf-8")); lock.pop(SID,None)
json.dump(lock,open(lp,"w",encoding="utf-8"),indent=2,sort_keys=True); open(lp,"a").write("\n")
for step in ("tools/sync_manifest.py","tools/build_content.py","tools/check_library.py"):
    r=subprocess.run([sys.executable,step],cwd=ROOT,capture_output=True,text=True)
    if r.returncode:
        print(r.stdout); sys.exit(1)
print("probe removed; sync, build and check all clean")
