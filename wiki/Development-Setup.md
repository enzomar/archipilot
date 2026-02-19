# Development Setup

Guide for contributors who want to build, test, and debug archipilot locally.

---

## Prerequisites

| Tool | Version |
|------|---------|
| **Node.js** | 20+ |
| **VS Code** | 1.93+ |
| **GitHub Copilot** | Active subscription (for runtime testing) |

## Clone & Install

```bash
git clone https://github.com/enzomar/archipilot.git
cd archipilot
npm install
```

## Build

```bash
npm run compile
```

This runs `esbuild` to bundle the extension into `out/extension.js`.

For watch mode (auto-rebuild on save):

```bash
npm run watch
```

## Test

```bash
npm test
```

Runs 152+ unit and integration tests using Node.js test runner with tsx.

## Lint

```bash
npm run lint
```

## Type Check

```bash
npx tsc --noEmit
```

## Debug in VS Code

1. Open the project in VS Code
2. Press `F5` to launch the **Extension Development Host**
3. In the new window, open Copilot Chat and test `@architect` commands
4. Set breakpoints in the source files — the debugger attaches automatically

## Project Structure

```
src/
  extension.ts        – Entry point, registration
  participant.ts      – @architect chat handler (all slash commands)
  features.ts         – ADR creation, context diagrams, vault graph
  sidebar.ts          – Vault Explorer, Quick Actions, Architecture Health views
  vault.ts            – Vault discovery, loading, switching, context windowing
  prompts.ts          – TOGAF system prompts per mode
  updater.ts          – Diff preview, file editor, audit log & backup
  vault-template.ts   – TOGAF vault scaffolding (27 template files)
  types.ts            – TypeScript interfaces
  core/               – Pure logic (zero vscode imports)
    archimate-exporter.ts – ArchiMate 3.2 Open Exchange XML generator
    drawio-exporter.ts    – Draw.io XML generator (As-Is / Target / Migration)
    todo-extractor.ts     – TOGAF action item scanner & prioritiser
    parser.ts         – Command extraction from LLM responses
    validator.ts      – Schema validation for architecture commands
    context.ts        – Context windowing & file summarisation
    mutations.ts      – Vault mutation helpers
    index.ts          – Barrel export
  test/               – Unit + integration tests
```

### Key Design Decisions

- **`core/` has zero VS Code imports** — all logic is testable without the extension host
- **esbuild** bundles everything into a single file for fast activation
- **No Webview** — the sidebar uses VS Code's native TreeView API
- **Chat Participant API** — uses `vscode.chat.createChatParticipant()`

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Stable, release-ready. Protected with required PR reviews and status checks |
| `dev` | Integration branch for feature work |
| `feat/*` | Feature branches (e.g. `feat/drawio-export`) |
| `fix/*` | Bug fixes |
| `chore/*` | Maintenance, docs, CI |

All feature work goes through `dev` → `main` via pull request.

See [CONTRIBUTING.md](https://github.com/enzomar/archipilot/blob/main/CONTRIBUTING.md) for the full workflow.

## Release Process

```bash
# One-command release (runs checks, bumps version, pushes tag)
./scripts/release.sh patch   # or minor / major
```

The CI/CD pipeline automatically publishes to the VS Code Marketplace when a `v*` tag is pushed.

---

**See also:** [[Contributing]] · [[Testing]] · [[Release-Process]] · [[Architecture]]
