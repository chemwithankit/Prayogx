#!/usr/bin/env python3
"""PrayogX - one front door for publishing an approved reel: the destination is always chosen explicitly.

    python3 tools/publish.py status [<ID>]                                      both platforms
    python3 tools/publish.py review <ID>                                        what to watch before approving
    python3 tools/publish.py approve <ID> --reviewer NAME                       the one approval (bound to the reel's hashes)
    python3 tools/publish.py publish <ID> --instagram [--dry-run [--online]]
    python3 tools/publish.py publish <ID> --youtube --privacy private [--dry-run [--online]]
    python3 tools/publish.py publish <ID> --instagram --youtube --privacy unlisted
    python3 tools/publish.py verify <ID> --instagram | --youtube

Approval never means "publish everywhere": `publish` refuses to run without --instagram and/or --youtube, and
YouTube also needs --privacy. Each platform runs independently and reports its own result; a failure on one never
marks or blocks the other. The work is done by tools/instagram_publish.py and tools/youtube_publish.py.
"""
import argparse
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import instagram_publish as IG  # noqa: E402
import youtube_publish as YT  # noqa: E402


def main(argv=None):
    argv = list(sys.argv[1:] if argv is None else argv)
    ap = argparse.ArgumentParser(prog="publish.py", description="Publish an approved PrayogX reel to the destinations you name.")
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("status"); p.add_argument("id", nargs="?")
    p = sub.add_parser("review"); p.add_argument("id"); p.add_argument("--open", action="store_true")
    p = sub.add_parser("approve"); p.add_argument("id"); p.add_argument("--reviewer", required=True); p.add_argument("--note"); p.add_argument("--confirm")
    p = sub.add_parser("reject"); p.add_argument("id"); p.add_argument("--reason", required=True); p.add_argument("--reviewer")
    for name in ("publish", "verify"):
        p = sub.add_parser(name); p.add_argument("id")
        p.add_argument("--instagram", action="store_true"); p.add_argument("--youtube", action="store_true")
        if name == "publish":
            p.add_argument("--dry-run", action="store_true"); p.add_argument("--online", action="store_true")
            p.add_argument("--privacy", choices=YT.PRIVACY); p.add_argument("--confirm"); p.add_argument("--confirm-public")
    a = ap.parse_args(argv)

    if a.cmd == "status":
        print("Instagram:"); IG.cmd_status(a.id)
        print("YouTube:"); YT.cmd_status(a.id)
        return 0
    if a.cmd in ("review", "approve", "reject"):
        return IG.main([a.cmd, a.id] + (["--open"] if a.cmd == "review" and a.open else [])
                       + (["--reviewer", a.reviewer] if a.cmd in ("approve", "reject") and a.reviewer else [])
                       + (["--note", a.note] if a.cmd == "approve" and a.note else []) + (["--confirm", a.confirm] if a.cmd == "approve" and a.confirm else [])
                       + (["--reason", a.reason] if a.cmd == "reject" else []))
    if not (a.instagram or a.youtube):
        print("ERROR: name the destination(s): --instagram and/or --youtube (an approval is never 'publish everywhere')", file=sys.stderr)
        return 2
    rc = 0
    if a.cmd == "verify":
        if a.instagram:
            rc |= IG.main(["verify", a.id])
        if a.youtube:
            rc |= YT.main(["verify", a.id])
        return rc
    if a.youtube and not a.privacy and not a.dry_run:
        print("ERROR: a YouTube upload needs its privacy stated: --privacy private | unlisted | public", file=sys.stderr)
        return 2
    if a.instagram:
        print("=== Instagram ===")
        ig = ["publish", a.id] + (["--dry-run"] if a.dry_run else []) + (["--online"] if a.dry_run and a.online else []) + (["--confirm", a.confirm] if a.confirm and not a.dry_run else [])
        rc |= IG.main(ig)
    if a.youtube:
        print("=== YouTube ===")
        yt = ["publish", a.id] + (["--dry-run"] if a.dry_run else []) + (["--online"] if a.dry_run and a.online else []) + (["--privacy", a.privacy] if a.privacy else [])
        yt += (["--confirm", a.confirm] if a.confirm and not a.dry_run else []) + (["--confirm-public", a.confirm_public] if a.confirm_public else [])
        rc |= YT.main(yt)
    return rc


if __name__ == "__main__":
    sys.exit(main())
