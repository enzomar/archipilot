#!/usr/bin/env bash
#
# deploy-wiki.sh — push the local wiki/ folder to the GitHub wiki
#
# The GitHub wiki lives in a separate bare-git repo at:
#   https://github.com/enzomar/archipilot.wiki.git
#
# Usage:
#   ./scripts/deploy-wiki.sh
#   ./scripts/deploy-wiki.sh "chore: update scan command docs"   # custom commit msg
#

set -euo pipefail

# ── Config ─────────────────────────────────────────────────────────────────────
WIKI_REMOTE="https://github.com/enzomar/archipilot.wiki.git"
WIKI_BRANCH="master"   # GitHub wikis always use 'master'
COMMIT_MSG="${1:-"chore: sync wiki from local wiki/ folder [$(date -u +%Y-%m-%dT%H:%M:%SZ)]"}"

# ── Run from the repo root ──────────────────────────────────────────────────────
REPO_ROOT="$(git rev-parse --show-toplevel)"
WIKI_SRC="$REPO_ROOT/wiki"

if [[ ! -d "$WIKI_SRC" ]]; then
  echo "❌  wiki/ directory not found at $WIKI_SRC"
  exit 1
fi

echo "🚀  Deploying wiki/ → $WIKI_REMOTE"

# ── Work in a temp directory so we never pollute the main repo ─────────────────
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

WIKI_CLONE="$TMP_DIR/wiki"

# ── Clone the wiki repo (shallow to keep it fast) ─────────────────────────────
echo "📥  Cloning wiki repo..."
if ! git clone --depth 1 "$WIKI_REMOTE" "$WIKI_CLONE" 2>/dev/null; then
  # Wiki might not exist yet — initialise a fresh repo
  echo "⚠️   Wiki repo clone failed — initialising a new one."
  mkdir -p "$WIKI_CLONE"
  git -C "$WIKI_CLONE" init
  git -C "$WIKI_CLONE" remote add origin "$WIKI_REMOTE"
fi

# ── Remove old .md files (so deleted local pages are removed remotely too) ─────
echo "🧹  Clearing old markdown pages..."
find "$WIKI_CLONE" -maxdepth 1 -name "*.md" -delete

# ── Copy every .md file from wiki/ into the cloned wiki repo ──────────────────
echo "📄  Copying pages..."
for f in "$WIKI_SRC"/*.md; do
  cp "$f" "$WIKI_CLONE/"
  echo "   → $(basename "$f")  ✔"
done

# ── Commit ─────────────────────────────────────────────────────────────────────
cd "$WIKI_CLONE"

git add --all

if git diff --cached --quiet; then
  echo "✅  Wiki is already up-to-date — nothing to commit."
  exit 0
fi

git config user.email "$(git -C "$REPO_ROOT" config user.email 2>/dev/null || echo 'deploy@localhost')"
git config user.name  "$(git -C "$REPO_ROOT" config user.name  2>/dev/null || echo 'deploy-wiki script')"

git commit -m "$COMMIT_MSG"

# ── Push ───────────────────────────────────────────────────────────────────────
echo "📤  Pushing to $WIKI_REMOTE ($WIKI_BRANCH)..."
git push origin HEAD:"$WIKI_BRANCH"

echo ""
echo "✅  Wiki deployed successfully!"
echo "   🔗  https://github.com/enzomar/archipilot/wiki"
