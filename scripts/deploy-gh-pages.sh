#!/usr/bin/env bash
#
# deploy-gh-pages.sh — copy demo assets from main → gh-pages
#
# Deploys:
#   demo/onboarding.html          → demo/onboarding.html
#   demo/sample-vault/ (as .zip)  → demo/sample-vault.zip
#
# Usage:  ./scripts/deploy-gh-pages.sh
#

set -euo pipefail

# ── Ensure we run from the repo root ──
REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

echo "🚀 Starting gh-pages deployment..."

# ── Ensure we start on main with latest code ──
CURRENT_BRANCH="$(git branch --show-current)"
if [[ "$CURRENT_BRANCH" != "main" ]]; then
  echo "⚠️  Not on main (on '$CURRENT_BRANCH'). Switching to main..."
  git checkout main
fi
if ! git pull --ff-only origin main 2>/dev/null; then
  echo "⚠️  main has diverged from origin — deploying from local main as-is."
fi

# ── Build zip of sample vault ──
echo "📦 Creating sample-vault.zip..."
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT   # always clean up, even on error

(cd demo && zip -r "$TMP_DIR/sample-vault.zip" sample-vault > /dev/null)

# ── Stage onboarding.html alongside the zip ──
cp demo/onboarding.html "$TMP_DIR/onboarding.html"

echo "   → onboarding.html  ✔"
echo "   → sample-vault.zip ✔"

# ── Stash any uncommitted changes before switching ──
STASHED=false
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "📌 Stashing uncommitted changes..."
  git stash push -m "deploy-gh-pages: auto-stash" --include-untracked
  STASHED=true
fi

# ── Switch to gh-pages (always sync with remote first) ──
git fetch origin gh-pages
git checkout gh-pages
git reset --hard origin/gh-pages

# ── Copy files into place (overwrite) ──
mkdir -p demo
cp "$TMP_DIR/onboarding.html"  demo/onboarding.html
cp "$TMP_DIR/sample-vault.zip" demo/sample-vault.zip

# ── Commit & push ──
git add demo/onboarding.html demo/sample-vault.zip

if git diff --cached --quiet; then
  echo "ℹ️  No changes detected — skipping commit."
else
  git commit -m "chore: deploy demo assets from main ($(date +%Y-%m-%d))"
  git push --force-with-lease origin gh-pages
  echo "✅ Pushed to gh-pages."
fi

# ── Return to main ──
git checkout main

# ── Restore stashed changes ──
if [[ "$STASHED" == true ]]; then
  echo "📌 Restoring stashed changes..."
  git stash pop
fi

echo "✅ Deployment completed — back on main."
