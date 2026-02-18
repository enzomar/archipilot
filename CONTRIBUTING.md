# Contributing to archipilot

Thank you for your interest in contributing to archipilot! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## How to Contribute

### Reporting Bugs

1. Check [existing issues](https://github.com/enzomar/archipilot/issues) to avoid duplicates.
2. Use the **Bug Report** issue template.
3. Include: VS Code version, extension version, steps to reproduce, expected vs. actual behavior.

### Suggesting Features

1. Open a **Feature Request** issue.
2. Describe the use case and how it relates to TOGAF or architecture workflows.
3. If possible, include examples of the expected interaction with `@architect`.

### Pull Requests

1. Fork the repository and create a branch from `main`.
2. Follow the coding standards below.
3. Test your changes in the Extension Development Host (`F5`).
4. Update documentation if you add or change commands.
5. Submit a PR using the pull request template.

## Development Setup

```bash
# Clone your fork
git clone https://github.com/<your-username>/archipilot.git
cd archipilot

# Install dependencies
npm install

# Compile
npm run compile

# Launch Extension Development Host
# Press F5 in VS Code
```

### Project Structure

```
src/
  extension.ts        – Entry point, registration
  participant.ts      – @architect chat handler & command routing
  vault.ts            – Vault discovery, loading, switching
  prompts.ts          – TOGAF system prompts per mode
  updater.ts          – Structured command parser & file editor
  vault-template.ts   – TOGAF vault scaffolding template
  types.ts            – TypeScript interfaces
```

## Coding Standards

- **TypeScript** strict mode — no `any` unless absolutely necessary.
- Use `async/await` over raw promises.
- Keep functions small and focused.
- Add JSDoc comments for public functions.
- Follow existing naming conventions (camelCase for variables/functions, PascalCase for types).

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add /compliance command for Phase G checks
fix: prevent empty message error on /status
docs: update README with /sizing examples
refactor: extract message builder from participant
```

## TOGAF Alignment

archipilot follows TOGAF ADM phases. When contributing:

- Map new features to the appropriate ADM phase.
- Use the established file prefix convention (`P*`, `A*`–`H*`, `R*`, `X*`).
- Maintain wiki-link cross-references between artifacts.
- Respect YAML front matter schema (version, status, owner, togaf_phase).

## Branch Strategy

archipilot uses a **trunk-based** workflow optimized for a solo maintainer:

- **`main`** is the primary branch. Direct pushes are fine for the maintainer.
- **Feature branches + PRs** are used for larger changes or external contributions.
- Versions are bumped **automatically** by CI when conventional commit prefixes are detected.

### Solo Maintainer — Quick Flow

```bash
# Small fix — push directly to main
git add . && git commit -m "fix: handle empty vault in sidebar"
git push origin main
# CI runs → auto-bump detects "fix:" → publishes patch release
```

### Contributor / Larger Changes — PR Flow

```bash
# 1. Create a feature branch
git checkout -b feat/add-compliance

# 2. Work, commit (use conventional commits)
git add .
git commit -m "feat: add /compliance command for Phase G"

# 3. Push and open a PR
git push origin feat/add-compliance
gh pr create --fill

# 4. CI runs on the PR. Merge when green.
gh pr merge --squash

# 5. Auto-bump kicks in on main after merge
```

### Manual Release (override auto-bump)

```bash
git checkout main && git pull
./scripts/release.sh patch   # or minor / major / 1.0.0
```

### Branch Naming Convention

| Prefix | Purpose | Example |
|--------|---------|---------|
| `feat/` | New feature | `feat/add-compliance` |
| `fix/` | Bug fix | `fix/gantt-reserved-words` |
| `docs/` | Documentation | `docs/update-readme` |
| `refactor/` | Code improvement | `refactor/extract-parser` |
| `chore/` | Build, CI, tooling | `chore/update-esbuild` |

## Releasing a New Version

Releases are **fully automated** via CI. When you push to `main` with a conventional commit prefix, the pipeline:

1. Runs CI (typecheck + tests on Node 20 & 22)
2. Detects the bump type from commit messages
3. Bumps `package.json`, stamps `CHANGELOG.md`
4. Tags, publishes to the VS Code Marketplace, creates a GitHub Release

| Commit prefix | Bump | Example |
|---|---|---|
| `feat:` | minor (0.5.0 → 0.6.0) | `feat: add sidebar panel` |
| `fix:`, `refactor:`, `perf:`, etc. | patch (0.5.0 → 0.5.1) | `fix: handle empty vault` |
| `feat!:` / `BREAKING CHANGE` | major (0.5.0 → 1.0.0) | `feat!: redesign API` |
| No prefix | skip | `update docs` |

### Manual Override

Use the helper script to bypass auto-bump:

```bash
# Stable release (removes -beta if present)
./scripts/release.sh 0.5.0

# Patch bump (0.5.0 → 0.5.1)
./scripts/release.sh patch

# Minor bump (0.5.0 → 0.6.0)
./scripts/release.sh minor

# Major bump (0.6.0 → 1.0.0)
./scripts/release.sh major
```

### Manual Release

```bash
# 1. Bump version
npm version 0.5.0            # explicit version
# or: npm version patch       # 0.5.0 → 0.5.1
# or: npm version minor       # 0.5.0 → 0.6.0

# 2. Push commit + tag
git push origin main --tags
```

### What Happens Automatically

1. **CI** runs typecheck + tests (Node 20 & 22)
2. **Auto-bump** detects conventional commit prefixes, bumps version
3. Packages the `.vsix`
4. Publishes to the VS Code Marketplace
5. Creates a GitHub Release with the `.vsix` attached
6. Stamps `CHANGELOG.md` with version + date

### Pre-requisites (one-time setup)

- Register publisher `enzomar` at https://marketplace.visualstudio.com/manage
- Create an Azure DevOps PAT with **Marketplace → Manage** scope
- Add the PAT as a GitHub secret named `VSCE_PAT`

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
