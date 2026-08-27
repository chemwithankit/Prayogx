#!/usr/bin/env bash
# =============================================================================
#  PrayogX — publish the library to GitHub
#
#  Run this in Terminal on your Mac, where your GitHub credentials live:
#
#      ./publish.sh                      # push whatever is already committed
#      ./publish.sh "Add Q5 and Q6"      # also commit any loose changes first
#
#  It re-validates the library, commits anything uncommitted, and pushes.
#  Commits made for you in the Cowork session are pushed as they are — their
#  messages and hashes are preserved.
#
#  If the library check fails it stops before pushing, so a broken simulation
#  never reaches the live site.
#
#  Files that exist on GitHub but not in this folder (the GitHub Pages workflow,
#  LICENSE, CNAME, anything added through the web interface) are pulled in and
#  kept. Nothing on GitHub is ever deleted by this script.
#
#  First run only: it links this folder to your GitHub repository.
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")"

MSG="${1:-}"

say()  { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
warn() { printf '\n\033[33m!! %s\033[0m\n' "$*"; }

# ---------------------------------------------------------------- 1. validate
say "Syncing the manifest"
python3 tools/sync_manifest.py

say "Checking the library"
if ! python3 tools/check_library.py; then
  warn "Library check failed. Fix the problems above before publishing —"
  warn "a broken path here becomes a broken link on the live site."
  exit 1
fi

# ------------------------------------------------------------ 2. repo + remote
if [ ! -d .git ]; then
  say "First run: creating a local git repository"
  git init -q
  git symbolic-ref HEAD refs/heads/main
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  echo
  echo "This folder is not linked to GitHub yet."
  echo "Paste your repository URL, e.g. https://github.com/<you>/prayogx.git"
  read -rp "GitHub repo URL: " REPO
  [ -z "$REPO" ] && { warn "No URL given — nothing published."; exit 1; }
  git remote add origin "$REPO"
fi

BRANCH="$(git symbolic-ref --quiet --short HEAD 2>/dev/null || echo main)"
if git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1; then
  REMOTE_HAS_BRANCH=yes
elif git ls-remote --exit-code --heads origin master >/dev/null 2>&1 && [ "$BRANCH" = "main" ]; then
  BRANCH=master
  git branch -M master
  REMOTE_HAS_BRANCH=yes
else
  REMOTE_HAS_BRANCH=no
fi

# ------------------------------------------------------- 3. commit loose work
git add -A
if git diff --cached --quiet; then
  echo
  echo "Working tree already clean — nothing new to commit."
else
  if [ -z "$MSG" ]; then
    MSG="Update PrayogX simulation library"
  fi
  say "Committing your uncommitted changes"
  git commit -q -m "$MSG"
  git --no-pager log --oneline -1
fi

if ! git rev-parse --quiet --verify HEAD >/dev/null 2>&1; then
  warn "There are no commits to publish."
  exit 0
fi

# ------------------------------------- 4. reconcile with history already on GitHub
#  Anything that exists on GitHub but not in this folder is PULLED IN and kept —
#  never deleted. That protects .github/workflows/*, LICENSE, CNAME and anything
#  else added through the GitHub web interface.
if [ "$REMOTE_HAS_BRANCH" = yes ]; then
  git fetch -q origin "$BRANCH"
  if ! git merge-base --is-ancestor "origin/$BRANCH" HEAD 2>/dev/null; then

    ONLY_REMOTE=""
    while IFS= read -r f; do
      [ -e "$f" ] || ONLY_REMOTE="$ONLY_REMOTE$f"$'\n'
    done < <(git ls-tree -r --name-only "origin/$BRANCH")

    if [ -n "$ONLY_REMOTE" ]; then
      say "Preserving files that exist on GitHub but not in this folder"
      while IFS= read -r f; do
        [ -z "$f" ] && continue
        echo "    keeping  $f"
        mkdir -p "$(dirname "$f")"
        git checkout "origin/$BRANCH" -- "$f"
      done <<< "$ONLY_REMOTE"
      git add -A
      if ! git diff --cached --quiet; then
        git commit -q -m "Preserve files already on GitHub (GitHub Pages workflow and friends)"
        git --no-pager log --oneline -1
      fi
    fi

    DIFFERING="$(git diff --name-only HEAD "origin/$BRANCH" 2>/dev/null || true)"
    if [ -n "$DIFFERING" ]; then
      echo
      echo "    These files exist in both places; this folder's version wins:"
      printf '      %s\n' $DIFFERING
    fi

    # remote history becomes a parent; this folder's content is the result
    git merge -q -s ours --allow-unrelated-histories \
      -m "Merge existing GitHub history; this folder is authoritative" "origin/$BRANCH"
  fi
fi

# --------------------------------------------------------------------- 5. push
if [ "$REMOTE_HAS_BRANCH" = yes ] && git merge-base --is-ancestor HEAD "origin/$BRANCH" 2>/dev/null; then
  echo
  echo "GitHub is already up to date with this folder. Nothing to push."
  exit 0
fi

say "Pushing to GitHub"
git push -u origin "$BRANCH"

echo
echo "Published. Commits now on GitHub:"
git --no-pager log --oneline -3
echo
echo "GitHub Pages usually redeploys within a minute."
echo "If the site looks stale, hard-refresh the page (Cmd-Shift-R)."
