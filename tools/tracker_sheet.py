#!/usr/bin/env python3
"""Synchronise the Google Sheet progress tracker with data/tracker.csv - by upsert, in place.

The Sheet is permanent: its spreadsheet ID and URL never change, and nothing here creates,
trashes, clears, reorders or deletes anything. This script does no network I/O and holds no
credentials. Claude reads and writes the Sheet through the Google Sheets connector
(get_spreadsheet, get_values, update_values); this script decides, from saved copies of those
responses, exactly what may be written - and checks the result afterwards.

Workflow (the prayogx-register skill runs it):

  1. get_spreadsheet (fields sheets.properties)      -> save as  spreadsheet.json
     get_values  <Tab>!A1:S                           -> save as  values.json
  2. python3 tools/tracker_sheet.py plan --spreadsheet spreadsheet.json --values values.json --out plan.json
       prints the plan: unchanged / update-in-place / new row, each with its exact range.
       Exit 2 = unsafe (bad header, duplicate IDs, blank ID in a filled row, tab missing) - stop.
  3. just before writing, get_values again           -> values_now.json
     python3 tools/tracker_sheet.py precheck --plan plan.json --values values_now.json
       Exit 2 = the Sheet changed since the plan (a new row is no longer empty, an updated row no
       longer holds its ID, the header moved) - stop, re-plan.
  4. one update_values call per planned row, to the exact range in the plan, with those values
  5. get_values again                                 -> values_after.json
     python3 tools/tracker_sheet.py verify --values values_after.json
       Exit 0 only if the header is intact and every CSV row appears exactly once with all 19
       values equal (numbers compared numerically, everything else exactly). Exit 1 names every
       missing, duplicated or differing cell - a partial sync is reported, never hidden.
  6. only after verify passes:
     python3 tools/tracker_sheet.py record --values values_after.json
       writes rows and syncedAt into data/manifest.json -> library.tracker.

  python3 tools/tracker_sheet.py status   says whether the Sheet is known to be behind the CSV.
  python3 tools/tracker_sheet.py expected prints the 19-column rows the Sheet should hold.

Values are sent as the CSV's own text. The connector's update_values has no "raw / user-entered"
switch, so the Sheet may turn "9.80" into 9.8; comparisons therefore treat numbers numerically.
Anything else that comes back different is a real mismatch and fails verification.
"""
import argparse
import csv
import datetime
import json
import os
import re
import sys
from decimal import Decimal, InvalidOperation

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_PATH = os.path.join(ROOT, "data", "tracker.csv")
MANIFEST = os.path.join(ROOT, "data", "manifest.json")

# The Sheet's 19 columns, in the Sheet's order. The CSV carries 25; these six prose columns stay
# out of the Sheet (they live in meta.json and question.md).
SHEET_COLUMNS = [
    "Simulation ID", "Status", "Date Added", "Last Updated", "Revision", "Exam", "Year", "Paper",
    "Subject", "Q No.", "Section", "Question Type", "Chapter", "Topic", "Difficulty", "Answer",
    "Verified", "Folder Path", "Source PDF",
]
PROSE_COLUMNS = ["Subtopics", "Concepts", "Verification Methods", "Interactive Features", "Tags", "Notes"]
KEY = "Simulation ID"
NUMERIC = re.compile(r"^[+-]?(\d+(\.\d*)?|\.\d+)$")


class SyncError(Exception):
    """Unsafe to proceed: nothing may be written."""


# ------------------------------------------------------------------ helpers
def col_letter(n):
    """1 -> A, 19 -> S, 27 -> AA"""
    s = ""
    while n:
        n, r = divmod(n - 1, 26)
        s = chr(65 + r) + s
    return s


LAST_COL = col_letter(len(SHEET_COLUMNS))


def norm(v):
    """The form two cell values are compared in: numbers numerically, everything else exactly."""
    s = "" if v is None else str(v).strip()
    if NUMERIC.match(s):
        try:
            d = Decimal(s).normalize()
            return format(d, "f") if d != d.to_integral() else str(d.quantize(Decimal(1)))
        except InvalidOperation:
            pass
    return s


def a1(tab, row):
    """Untitled!A34:S34 - the tab name is quoted only when A1 notation needs it."""
    t = tab if re.match(r"^[A-Za-z_][A-Za-z0-9_]*$", tab) else "'%s'" % tab.replace("'", "''")
    return "%s!A%d:%s%d" % (t, row, LAST_COL, row)


def tracker_meta(manifest_path=MANIFEST):
    with open(manifest_path, encoding="utf-8") as fh:
        man = json.load(fh)
    t = man.get("library", {}).get("tracker", {})
    for k in ("id", "sheetId"):
        if k not in t:
            raise SyncError("data/manifest.json -> library.tracker has no %r" % k)
    return man, t


# ------------------------------------------------------------------ expected (from the CSV)
def expected_rows(csv_path=CSV_PATH):
    with open(csv_path, encoding="utf-8", newline="") as fh:
        rows = list(csv.reader(fh))
    if not rows:
        raise SyncError("data/tracker.csv is empty")
    head = rows[0]
    missing = [c for c in SHEET_COLUMNS if c not in head]
    if missing:
        raise SyncError("data/tracker.csv lacks Sheet column(s): %s" % ", ".join(missing))
    idx = [head.index(c) for c in SHEET_COLUMNS]
    out, seen = [], set()
    for n, r in enumerate(rows[1:], start=2):
        if not any(x.strip() for x in r):
            continue
        rec = [r[i].replace("; ", " · ") if i < len(r) else "" for i in idx]
        if not rec[0]:
            raise SyncError("data/tracker.csv line %d has no Simulation ID" % n)
        if rec[0] in seen:
            raise SyncError("data/tracker.csv lists %s twice" % rec[0])
        seen.add(rec[0])
        out.append(rec)
    return out


# ------------------------------------------------------------------ the live Sheet (saved responses)
def load_json(path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def tab_title(spreadsheet, sheet_id):
    """Resolve the tab by its permanent sheetId; its title may have been renamed."""
    for s in spreadsheet.get("sheets", []):
        p = s.get("properties", {})
        if p.get("sheetId") == sheet_id:
            return p.get("title")
    raise SyncError("the spreadsheet has no tab with sheetId %s" % sheet_id)


def sheet_table(values_resp):
    """-> (header, {id: (row_number, cells)}, last_filled_row). Raises on duplicates or blank IDs."""
    vals = values_resp.get("values", [])
    if not vals:
        raise SyncError("the Sheet returned no rows at all - not even a header")
    header = [str(x) for x in vals[0]]
    table, last = {}, 1
    for i, r in enumerate(vals[1:], start=2):
        cells = [str(x) for x in r] + [""] * (len(SHEET_COLUMNS) - len(r))
        if not any(c.strip() for c in cells):
            continue
        last = i
        rid = cells[0].strip()
        if not rid:
            raise SyncError("Sheet row %d has data but no Simulation ID - fix it by hand first" % i)
        if rid in table:
            raise SyncError("Sheet lists %s twice (rows %d and %d) - fix it by hand first" % (rid, table[rid][0], i))
        table[rid] = (i, cells[:len(SHEET_COLUMNS)])
    return header, table, max(last, len(vals))


def check_header(header):
    if header[:len(SHEET_COLUMNS)] != SHEET_COLUMNS or any(h.strip() for h in header[len(SHEET_COLUMNS):]):
        raise SyncError("Sheet header is not the 19 expected columns in order: %s" % header)


# ------------------------------------------------------------------ plan / precheck / verify
def make_plan(spreadsheet, values_resp, csv_path=CSV_PATH, manifest_path=MANIFEST):
    _, meta = tracker_meta(manifest_path)
    if spreadsheet.get("spreadsheetId") not in (None, meta["id"]):
        raise SyncError("spreadsheet %s is not the tracker %s" % (spreadsheet.get("spreadsheetId"), meta["id"]))
    tab = tab_title(spreadsheet, meta["sheetId"])
    header, table, last = sheet_table(values_resp)
    check_header(header)
    want = expected_rows(csv_path)
    unchanged, updates, appends = [], [], []
    nxt = last + 1
    for rec in want:
        rid = rec[0]
        if rid in table:
            row, cells = table[rid]
            diffs = [{"column": SHEET_COLUMNS[j], "sheet": cells[j], "csv": rec[j]}
                     for j in range(len(SHEET_COLUMNS)) if norm(cells[j]) != norm(rec[j])]
            if diffs:
                updates.append({"id": rid, "row": row, "range": a1(tab, row), "values": [rec], "diffs": diffs})
            else:
                unchanged.append(rid)
        else:
            appends.append({"id": rid, "row": nxt, "range": a1(tab, nxt), "values": [rec]})
            nxt += 1
    extra = sorted(set(table) - set(r[0] for r in want))
    return {
        "spreadsheetId": meta["id"], "sheetId": meta["sheetId"], "tab": tab,
        "header": "ok", "sheetRows": len(table), "csvRows": len(want),
        "unchanged": unchanged, "updates": updates, "appends": appends,
        "deletions": [], "untouchedExtra": extra,
    }


def precheck(plan, values_now):
    """The Sheet must still be as planned: header intact, new rows empty, updated rows still theirs."""
    header, table, last = sheet_table(values_now)
    check_header(header)
    by_row = {row: rid for rid, (row, _) in table.items()}
    problems = []
    for u in plan["updates"]:
        if by_row.get(u["row"]) != u["id"]:
            problems.append("row %d no longer holds %s (now %r)" % (u["row"], u["id"], by_row.get(u["row"])))
    for a in plan["appends"]:
        if a["row"] in by_row:
            problems.append("row %d is no longer empty (now %s)" % (a["row"], by_row[a["row"]]))
        if a["id"] in table:
            problems.append("%s already appears at row %d" % (a["id"], table[a["id"]][0]))
    if problems:
        raise SyncError("the Sheet changed since the plan: " + "; ".join(problems))
    return True


def verify(values_after, csv_path=CSV_PATH):
    """-> list of problems; empty means the Sheet holds every CSV row exactly once, all 19 values equal."""
    try:
        header, table, _ = sheet_table(values_after)
        check_header(header)
    except SyncError as e:
        return [str(e)]
    problems = []
    for rec in expected_rows(csv_path):
        rid = rec[0]
        if rid not in table:
            problems.append("%s is missing from the Sheet" % rid)
            continue
        row, cells = table[rid]
        for j, c in enumerate(SHEET_COLUMNS):
            if norm(cells[j]) != norm(rec[j]):
                problems.append("%s row %d, %s: Sheet %r vs CSV %r" % (rid, row, c, cells[j], rec[j]))
    return problems


def status(csv_path=CSV_PATH, manifest_path=MANIFEST):
    _, meta = tracker_meta(manifest_path)
    n = len(expected_rows(csv_path))
    rec = meta.get("rows")
    if rec != n:
        return "PENDING: data/tracker.csv has %d rows; the Sheet was last verified with %s (syncedAt %s) - run the tracker sync" % (n, rec, meta.get("syncedAt"))
    return "in step as of the last verified sync: %d rows (syncedAt %s)" % (n, meta.get("syncedAt"))


def record(values_after, csv_path=CSV_PATH, manifest_path=MANIFEST, today=None):
    problems = verify(values_after, csv_path)
    if problems:
        raise SyncError("refusing to record a sync that does not verify: " + "; ".join(problems[:5]))
    man, meta = tracker_meta(manifest_path)
    meta["rows"] = len(expected_rows(csv_path))
    meta["syncedAt"] = today or datetime.date.today().isoformat()
    with open(manifest_path, "w", encoding="utf-8") as fh:
        json.dump(man, fh, ensure_ascii=False, indent=2)
        fh.write("\n")
    return meta


# ------------------------------------------------------------------ CLI
def print_plan(p):
    print("tracker %s  tab %r (sheetId %s)  header ok" % (p["spreadsheetId"], p["tab"], p["sheetId"]))
    print("Sheet rows %d · CSV rows %d" % (p["sheetRows"], p["csvRows"]))
    print("  unchanged : %d" % len(p["unchanged"]))
    print("  updates   : %d" % len(p["updates"]))
    for u in p["updates"]:
        print("    %s  %s" % (u["range"], u["id"]))
        for d in u["diffs"]:
            print("        %s: %r -> %r" % (d["column"], d["sheet"], d["csv"]))
    print("  new rows  : %d" % len(p["appends"]))
    for a in p["appends"]:
        print("    %s  %s" % (a["range"], a["id"]))
        print("        " + " | ".join(a["values"][0]))
    print("  deletions : 0 (never)")
    if p["untouchedExtra"]:
        print("  in the Sheet but not the CSV (left untouched): %s" % ", ".join(p["untouchedExtra"]))


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("expected")
    sp = sub.add_parser("plan"); sp.add_argument("--spreadsheet", required=True); sp.add_argument("--values", required=True); sp.add_argument("--out")
    sc = sub.add_parser("precheck"); sc.add_argument("--plan", required=True); sc.add_argument("--values", required=True)
    sv = sub.add_parser("verify"); sv.add_argument("--values", required=True)
    sub.add_parser("status")
    sr = sub.add_parser("record"); sr.add_argument("--values", required=True)
    a = ap.parse_args(argv)
    try:
        if a.cmd == "expected":
            print(json.dumps([SHEET_COLUMNS] + expected_rows(), ensure_ascii=False, indent=1))
        elif a.cmd == "plan":
            p = make_plan(load_json(a.spreadsheet), load_json(a.values))
            print_plan(p)
            if a.out:
                with open(a.out, "w", encoding="utf-8") as fh:
                    json.dump(p, fh, ensure_ascii=False, indent=1)
        elif a.cmd == "precheck":
            precheck(load_json(a.plan), load_json(a.values))
            print("precheck ok: the Sheet is still as planned - safe to write the planned rows")
        elif a.cmd == "verify":
            probs = verify(load_json(a.values))
            if probs:
                print("SHEET NOT IN SYNC - %d problem(s):" % len(probs))
                for x in probs:
                    print("  " + x)
                return 1
            print("verified: every CSV row appears exactly once in the Sheet with all 19 values equal")
        elif a.cmd == "status":
            s = status()
            print(s)
            return 3 if s.startswith("PENDING") else 0
        elif a.cmd == "record":
            m = record(load_json(a.values))
            print("recorded in data/manifest.json -> library.tracker: rows %s, syncedAt %s" % (m["rows"], m["syncedAt"]))
    except SyncError as e:
        print("SHEET SYNC STOPPED - nothing was written: %s" % e, file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
