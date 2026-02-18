#!/usr/bin/env bash
#
# release.sh — Bump version, tag, and push to trigger CI/CD publish.
#
# Usage:
#   ./scripts/release.sh 0.5.0     # set explicit version
#   ./scripts/release.sh patch     # 0.5.0 → 0.5.1
#   ./scripts/release.sh minor     # 0.5.0 → 0.6.0
#   ./scripts/release.sh major     # 0.6.0 → 1.0.0
#
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

if [[ $# -ne 1 ]]; then
  echo -e "${RED}Usage: $0 <version|patch|minor|major>${NC}"
  echo ""
  echo "Examples:"
  echo "  $0 0.5.0    # set explicit version"
  echo "  $0 patch    # bump patch (0.5.0 → 0.5.1)"
  echo "  $0 minor    # bump minor (0.5.0 → 0.6.0)"
  echo "  $0 major    # bump major (0.6.0 → 1.0.0)"
  exit 1
fi

VERSION_ARG="$1"

# Ensure we're on main branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$BRANCH" != "main" ]]; then
  echo -e "${RED}Error: You must be on the 'main' branch to release (currently on '$BRANCH').${NC}"
  exit 1
fi

# Ensure working tree is clean
if [[ -n "$(git status --porcelain)" ]]; then
  echo -e "${RED}Error: Working tree is not clean. Commit or stash your changes first.${NC}"
  git status --short
  exit 1
fi

# Pull latest
echo -e "${YELLOW}Pulling latest from origin/main...${NC}"
git pull origin main --rebase

# Run checks
echo -e "${YELLOW}Running typecheck...${NC}"
npm run typecheck

echo -e "${YELLOW}Running tests...${NC}"
npm test

# Bump version (npm version creates the commit + tag automatically)
echo -e "${YELLOW}Bumping version: ${VERSION_ARG}...${NC}"
npm version "$VERSION_ARG" -m "release: v%s"

# Get the new version from package.json
NEW_VERSION=$(node -p "require('./package.json').version")

# Push commit + tag
echo -e "${YELLOW}Pushing to origin...${NC}"
git push origin main --tags

echo ""
echo -e "${GREEN}=== Release v${NEW_VERSION} pushed! ===${NC}"
echo ""
echo "GitHub Actions will now:"
echo "  1. Run typecheck + tests"
echo "  2. Package the .vsix"
echo "  3. Publish to VS Code Marketplace"
echo "  4. Create a GitHub Release"
echo ""
echo "Track progress: https://github.com/enzomar/archipilot/actions"
echo "Marketplace:    https://marketplace.visualstudio.com/items?itemName=enzomar.archipilot"
