#!/usr/bin/env python3
"""tools/tracker_sheet.py against a saved snapshot of the live tracker Sheet.

tests/fixtures/tracker_sheet_values.json and tracker_sheet_spreadsheet.json are the connector's
get_values (Untitled!A1:S) and get_spreadsheet (sheets.properties) responses, saved read-only on
2026-09-29: the header and 32 rows, before ADV-2026-P1-CHE-Q16 was added. Everything here runs
on copies in a temporary directory; no test touches the Sheet, the network or data/.
"""
import copy
import csv
import json
import os
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, "tools"))
import tracker_sheet as ts  # noqa: E402

FIX = os.path.join(HERE, "fixtures")
SPREAD = json.load(open(os.path.join(FIX, "tracker_sheet_spreadsheet.json"), encoding="utf-8"))
VALUES = json.load(open(os.path.join(FIX, "tracker_sheet_values.json"), encoding="utf-8"))
Q16 = "ADV-2026-P1-CHE-Q16"

ok, fail = [], []


def chk(name, cond, detail=""):
    (ok if cond else fail).append(name)
    print(("PASS  " if cond else "FAIL  ") + name + ("" if cond or not detail else "  -> " + str(detail)))


def raises(fn, *a, **k):
    try:
        fn(*a, **k)
    except ts.SyncError as e:
        return str(e)
    return None


TMP = tempfile.mkdtemp(prefix="tracker-sheet-test.")
CSV = os.path.join(TMP, "tracker.csv")
MAN = os.path.join(TMP, "manifest.json")
# The fixtures are the Sheet as it stood before Q16 was synced; pair them with the CSV of that moment
# (header through ADV-2026-P1-CHE-Q16), so later additions to the library do not change what is tested.
with open(os.path.join(ROOT, "data", "tracker.csv"), encoding="utf-8", newline="") as fh:
    _rows = list(csv.reader(fh))
_cut = next(i for i, r in enumerate(_rows) if r and r[0] == "ADV-2026-P1-CHE-Q16")
with open(CSV, "w", encoding="utf-8", newline="") as fh:
    csv.writer(fh, lineterminator="\n").writerows(_rows[:_cut + 1])
shutil.copy(os.path.join(ROOT, "data", "manifest.json"), MAN)


def plan(spread=SPREAD, values=VALUES, csv_path=CSV, man=MAN):
    return ts.make_plan(spread, values, csv_path, man)


def written(values, p):
    """What the Sheet would hold after the plan's update_values calls, rendered as the Sheet shows it."""
    v = copy.deepcopy(values)
    rows = v["values"]
    for item in p["updates"] + p["appends"]:
        r = item["row"]
        while len(rows) < r:
            rows.append([])
        rows[r - 1] = [ts.norm(x) if ts.NUMERIC.match(x) else x for x in item["values"][0]]
    return v


def with_rows(values, fn):
    v = copy.deepcopy(values)
    fn(v["values"])
    return v


try:
    # ------------------------------------------------------------ helpers
    chk("col_letter: 1 A, 19 S, 26 Z, 27 AA", [ts.col_letter(n) for n in (1, 19, 26, 27)] == ["A", "S", "Z", "AA"])
    chk("19 Sheet columns, last column S", len(ts.SHEET_COLUMNS) == 19 and ts.LAST_COL == "S")
    chk("a1: plain tab name unquoted", ts.a1("Untitled", 34) == "Untitled!A34:S34", ts.a1("Untitled", 34))
    chk("a1: spaced / apostrophe tab names quoted", ts.a1("Tracker 2026", 5) == "'Tracker 2026'!A5:S5"
        and ts.a1("Ankit's", 2) == "'Ankit''s'!A2:S2")
    chk("norm: 9.80 == 9.8 (numbers compared numerically)", ts.norm("9.80") == ts.norm("9.8") == "9.8")
    chk("norm: 1.50 == 1.5, 2000 stays 2000, 85018 stays 85018",
        ts.norm("1.50") == "1.5" and ts.norm("2000") == "2000" and ts.norm("85018") == "85018")
    chk("norm: 33.33 and 0.16 unchanged", ts.norm("33.33") == "33.33" and ts.norm("0.16") == "0.16")
    chk("norm: text compared exactly (dates, options, trimmed only)",
        ts.norm("2026-09-28") == "2026-09-28" and ts.norm(" (C) 5 ") == "(C) 5" and ts.norm("C") != ts.norm("c"))
    chk("norm: 9.8 != 9.81", ts.norm("9.8") != ts.norm("9.81"))

    # ------------------------------------------------------------ expected rows from the CSV
    exp = ts.expected_rows(CSV)
    chk("CSV gives 33 rows of 19 values", len(exp) == 33 and all(len(r) == 19 for r in exp), len(exp))
    chk("CSV row order: Q16 last", exp[-1][0] == Q16)
    chk("CSV '; ' becomes ' · ' (the Sheet's separator)", all("; " not in x for r in exp for x in r))
    raw = list(csv.DictReader(open(CSV, encoding="utf-8")))
    q09 = [r for r in raw if r["Simulation ID"] == "ADV-2026-P1-CHE-Q09"][0]
    chk("fixture case: CSV holds 9.80 where the Sheet shows 9.8", q09["Answer"] == "9.80"
        and [r for r in VALUES["values"] if r[0] == "ADV-2026-P1-CHE-Q09"][0][15] == "9.8")

    # ------------------------------------------------------------ the plan on the live snapshot
    p = plan()
    chk("plan: tab resolved by sheetId 1074895221 -> 'Untitled'", p["tab"] == "Untitled" and p["sheetId"] == 1074895221)
    chk("plan: Sheet 32 rows, CSV 33 rows", p["sheetRows"] == 32 and p["csvRows"] == 33, (p["sheetRows"], p["csvRows"]))
    chk("plan: 32 unchanged", len(p["unchanged"]) == 32, len(p["unchanged"]))
    chk("plan: 0 updates (9.80 vs 9.8 is not a difference)", p["updates"] == [], p["updates"])
    chk("plan: 1 new row, Q16 at Untitled!A34:S34",
        [(a["id"], a["row"], a["range"]) for a in p["appends"]] == [(Q16, 34, "Untitled!A34:S34")], p["appends"])
    chk("plan: new row carries the CSV's 19 values", p["appends"][0]["values"] == [exp[-1]])
    chk("plan: 0 deletions, nothing extra in the Sheet", p["deletions"] == [] and p["untouchedExtra"] == [])
    chk("plan: the spreadsheet ID is the permanent tracker",
        p["spreadsheetId"] == "13NOBOR5PyyaJNi-7AztrqwbgFVRM48fSpS3lr-sgvAU")

    # ------------------------------------------------------------ tab lookup by sheetId
    renamed = copy.deepcopy(SPREAD)
    renamed["sheets"][0]["properties"]["title"] = "Tracker 2026"
    renamed["sheets"].insert(0, {"properties": {"sheetId": 7, "title": "Untitled", "index": 0}})
    pr = plan(spread=renamed)
    chk("renamed tab: still found by sheetId, range quoted",
        pr["tab"] == "Tracker 2026" and pr["appends"][0]["range"] == "'Tracker 2026'!A34:S34", pr["tab"])
    gone = copy.deepcopy(SPREAD)
    gone["sheets"][0]["properties"]["sheetId"] = 99
    chk("tab with the sheetId missing -> stop", raises(plan, spread=gone) is not None)
    other = dict(SPREAD, spreadsheetId="someOtherSpreadsheet")
    chk("a different spreadsheet -> stop", raises(plan, spread=other) is not None)
    man_nosid = os.path.join(TMP, "manifest_nosid.json")
    m = json.load(open(MAN, encoding="utf-8"))
    del m["library"]["tracker"]["sheetId"]
    json.dump(m, open(man_nosid, "w", encoding="utf-8"))
    chk("manifest without library.tracker.sheetId -> stop", raises(plan, man=man_nosid) is not None)

    # ------------------------------------------------------------ header validation
    def hdr(fn):
        return with_rows(VALUES, lambda rows: fn(rows[0]))
    chk("header: two columns swapped -> stop", raises(plan, values=hdr(lambda h: h.__setitem__(slice(1, 3), [h[2], h[1]]))) is not None)
    chk("header: a column renamed -> stop", raises(plan, values=hdr(lambda h: h.__setitem__(9, "Q No"))) is not None)
    chk("header: a column missing -> stop", raises(plan, values=hdr(lambda h: h.pop())) is not None)
    chk("header: an extra 20th header -> stop", raises(plan, values=hdr(lambda h: h.append("Notes"))) is not None)
    chk("no rows at all -> stop", raises(plan, values={"range": "Untitled!A1:S1000"}) is not None)

    # ------------------------------------------------------------ upsert, duplicates, blanks
    edited = with_rows(VALUES, lambda rows: rows[12].__setitem__(4, "1"))   # row 13 = P2 Q12, revision 2 -> 1
    pe = plan(values=edited)
    u = pe["updates"]
    chk("changed cell -> update in place at its own row, not a new row",
        len(u) == 1 and u[0]["id"] == "ADV-2026-P2-CHE-Q12" and u[0]["range"] == "Untitled!A13:S13"
        and len(pe["appends"]) == 1, u)
    chk("update names the differing cell", u and u[0]["diffs"] == [{"column": "Revision", "sheet": "1", "csv": "2"}], u and u[0]["diffs"])
    chk("update writes the whole 19-value row", u and len(u[0]["values"][0]) == 19)
    moved = with_rows(VALUES, lambda rows: rows.__setitem__(slice(1, 3), [rows[2], rows[1]]))
    pm = plan(values=moved)
    chk("rows in a different order: matched by ID, nothing rewritten", pm["updates"] == [] and len(pm["unchanged"]) == 32)
    dup = with_rows(VALUES, lambda rows: rows.append(list(rows[5])))
    chk("duplicate ID in the Sheet -> stop", raises(plan, values=dup) is not None)
    blank = with_rows(VALUES, lambda rows: rows.append([""] + ["x"] * 18))
    chk("a filled row with no ID -> stop", raises(plan, values=blank) is not None)
    extra = with_rows(VALUES, lambda rows: rows.append(["ADV-2026-P9-CHE-Q99"] + ["x"] * 18))
    px = plan(values=extra)
    chk("an ID only in the Sheet is left untouched, new row goes after it",
        px["untouchedExtra"] == ["ADV-2026-P9-CHE-Q99"] and px["deletions"] == [] and px["appends"][0]["row"] == 35, px["appends"])
    gap = with_rows(VALUES, lambda rows: rows.extend([[], ["", "", ""]]))
    pg = plan(values=gap)
    chk("blank rows returned after the data are never overwritten", pg["appends"][0]["row"] == 36, pg["appends"][0]["row"])
    short = with_rows(VALUES, lambda rows: rows[3].__setitem__(slice(17, 19), []))
    ps = plan(values=short)
    chk("a short row (trailing cells empty) is compared as blanks and updated",
        [x["id"] for x in ps["updates"]] == ["ADV-2026-P2-CHE-Q03"]
        and [d["column"] for d in ps["updates"][0]["diffs"]] == ["Folder Path", "Source PDF"])

    # ------------------------------------------------------------ future Q17 / Q18
    csv_future = os.path.join(TMP, "tracker_future.csv")
    rows = list(csv.reader(open(CSV, encoding="utf-8", newline="")))
    head = rows[0]
    for q in ("17", "18"):
        r = list(rows[-1])
        r[head.index("Simulation ID")] = "ADV-2026-P1-CHE-Q" + q
        r[head.index("Q No.")] = q
        rows.append(r)
    with open(csv_future, "w", encoding="utf-8", newline="") as fh:
        csv.writer(fh, lineterminator="\n").writerows(rows)
    pf = plan(csv_path=csv_future)
    chk("Q16, Q17, Q18 pending -> rows 34, 35, 36 in CSV order",
        [(a["id"][-3:], a["range"]) for a in pf["appends"]] == [("Q16", "Untitled!A34:S34"), ("Q17", "Untitled!A35:S35"), ("Q18", "Untitled!A36:S36")])
    after16 = written(VALUES, p)
    pf2 = plan(values=after16, csv_path=csv_future)
    chk("after Q16 is synced, Q17 and Q18 go to rows 35, 36", [a["row"] for a in pf2["appends"]] == [35, 36] and len(pf2["unchanged"]) == 33)

    # ------------------------------------------------------------ idempotency
    p2 = plan(values=after16)
    chk("idempotent: re-plan after the write -> 33 unchanged, nothing to write",
        len(p2["unchanged"]) == 33 and p2["updates"] == [] and p2["appends"] == [], (len(p2["unchanged"]), p2["updates"], p2["appends"]))
    chk("idempotent: the Sheet showing 9.8 for 9.80 does not cause a rewrite",
        [r for r in after16["values"] if r[0] == "ADV-2026-P1-CHE-Q09"][0][15] == "9.8" and p2["updates"] == [])

    # ------------------------------------------------------------ precheck (concurrency)
    chk("precheck: unchanged Sheet -> ok", ts.precheck(p, VALUES) is True)
    taken = with_rows(VALUES, lambda rows: rows.append(["ADV-2026-P2-PHY-Q01"] + ["x"] * 18))
    chk("precheck: someone filled row 34 -> stop", raises(ts.precheck, p, taken) is not None)
    elsewhere = with_rows(VALUES, lambda rows: rows.extend([[], list(exp[-1])]))
    chk("precheck: Q16 appeared elsewhere -> stop", raises(ts.precheck, p, elsewhere) is not None)
    chk("precheck: after our own write (retry) -> stop, no double row", raises(ts.precheck, p, after16) is not None)
    shifted = with_rows(VALUES, lambda rows: rows.insert(1, ["ADV-2026-P0-CHE-Q00"] + ["x"] * 18))
    chk("precheck: an update row that moved -> stop", raises(ts.precheck, pe, shifted) is not None)
    chk("precheck: header changed -> stop", raises(ts.precheck, p, hdr(lambda h: h.__setitem__(0, "ID"))) is not None)

    # ------------------------------------------------------------ verify
    chk("verify: after the planned write -> no problems", ts.verify(after16, CSV) == [], ts.verify(after16, CSV))
    v0 = ts.verify(VALUES, CSV)
    chk("verify: before the write -> exactly 'Q16 missing'", v0 == ["%s is missing from the Sheet" % Q16], v0)
    wrong = with_rows(after16, lambda rows: rows[33].__setitem__(15, "A"))
    vw = ts.verify(wrong, CSV)
    chk("verify: a wrong cell is named with its row and column",
        len(vw) == 1 and "row 34, Answer" in vw[0] and "'A'" in vw[0] and "'B'" in vw[0], vw)
    partial = with_rows(after16, lambda rows: rows[33].__setitem__(slice(10, 19), []))
    chk("verify: a partial row -> one problem per missing cell", len(ts.verify(partial, CSV)) == 9)
    twice = with_rows(after16, lambda rows: rows.append(list(rows[33])))
    chk("verify: a duplicated row is a failure", ts.verify(twice, CSV) != [])
    chk("verify: a broken header is a failure", ts.verify(hdr(lambda h: h.pop()), CSV) != [])

    # ------------------------------------------------------------ status and record
    # The temporary manifest is set to the fixture's state (32 rows, synced 2026-09-28), so these
    # checks do not depend on what the repository's manifest has recorded since.
    pre = json.load(open(MAN, encoding="utf-8"))
    pre["library"]["tracker"].update(rows=32, syncedAt="2026-09-28")
    with open(MAN, "w", encoding="utf-8") as fh:
        json.dump(pre, fh, ensure_ascii=False, indent=2)
        fh.write("\n")
    pre_bytes = open(MAN, "rb").read()
    s0 = ts.status(CSV, MAN)
    chk("status: CSV 33 vs recorded 32 -> PENDING", s0.startswith("PENDING") and "33 rows" in s0 and "32" in s0, s0)
    chk("record: refuses when the Sheet does not verify", raises(ts.record, VALUES, CSV, MAN) is not None)
    chk("record: a refused record leaves the manifest untouched", open(MAN, "rb").read() == pre_bytes)
    meta = ts.record(after16, CSV, MAN, today="2026-09-29")
    chk("record: writes rows 33 and syncedAt", meta["rows"] == 33 and meta["syncedAt"] == "2026-09-29", meta)
    chk("status after record: in step", not ts.status(CSV, MAN).startswith("PENDING"), ts.status(CSV, MAN))
    new = json.load(open(MAN, encoding="utf-8"))
    for k in ("rows", "syncedAt"):
        new["library"]["tracker"][k] = pre["library"]["tracker"][k]
    chk("record: changes only rows and syncedAt", new == pre)
    # Round trip on the repository's manifest: re-recording the state it already holds must not
    # change a byte (same JSON format as the rest of the tooling).
    same = os.path.join(TMP, "manifest_same.json")
    shutil.copy(os.path.join(ROOT, "data", "manifest.json"), same)
    t = json.load(open(same, encoding="utf-8"))["library"]["tracker"]
    csv_n = os.path.join(TMP, "tracker_n.csv")
    with open(csv_n, "w", encoding="utf-8", newline="") as fh:
        csv.writer(fh, lineterminator="\n").writerows(list(csv.reader(open(CSV, encoding="utf-8", newline="")))[:t["rows"] + 1])
    ts.record(after16 if t["rows"] == 33 else VALUES, csv_n, same, today=t["syncedAt"])
    chk("record: writes the manifest in the repo's own JSON format (byte-identical round trip)",
        open(same, "rb").read() == open(os.path.join(ROOT, "data", "manifest.json"), "rb").read())

    # ------------------------------------------------------------ CLI, exit codes, no network
    def cli(*args):
        return subprocess.run([sys.executable, os.path.join(ROOT, "tools", "tracker_sheet.py")] + list(args),
                              capture_output=True, text=True, cwd=ROOT)
    sp_f, v_f = os.path.join(FIX, "tracker_sheet_spreadsheet.json"), os.path.join(FIX, "tracker_sheet_values.json")
    plan_out = os.path.join(TMP, "plan.json")
    r = cli("plan", "--spreadsheet", sp_f, "--values", v_f, "--out", plan_out)
    chk("CLI plan: exit 0, prints the new row's range", r.returncode == 0 and "Untitled!A34:S34  " + Q16 in r.stdout, r.stdout + r.stderr)
    chk("CLI plan --out: saved plan equals the in-process plan on the same (repository) CSV", json.load(open(plan_out, encoding="utf-8")) == json.loads(json.dumps(ts.make_plan(SPREAD, VALUES))))
    json.dump(taken, open(os.path.join(TMP, "taken.json"), "w"))
    r = cli("precheck", "--plan", plan_out, "--values", os.path.join(TMP, "taken.json"))
    chk("CLI precheck on a changed Sheet: exit 2, 'nothing was written'", r.returncode == 2 and "nothing was written" in r.stderr, r.stderr)
    r = cli("verify", "--values", v_f)
    chk("CLI verify on the unsynced Sheet: exit 1, names Q16", r.returncode == 1 and Q16 in r.stdout, r.stdout)
    src = open(os.path.join(ROOT, "tools", "tracker_sheet.py"), encoding="utf-8").read()
    chk("the script has no network or credential code",
        not any(w in src for w in ("import urllib", "import requests", "import socket", "http.client", "googleapiclient", "oauth")))
finally:
    shutil.rmtree(TMP, ignore_errors=True)

print()
print("%d passed, %d failed" % (len(ok), len(fail)))
sys.exit(1 if fail else 0)
