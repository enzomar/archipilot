# Changelog

All notable changes to archipilot will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.8.0] - 2025-02-19

### Added

- **`/impact` command** — Scan the entire vault for cross-references to any TOGAF ID (e.g. `AD-02`, `R-05`, `WP-03`) and display a structured impact chain showing every file and section that mentions it.
- **Architecture Health sidebar view** — Phase readiness scores (0–100 %) per ADM phase, metadata-gap detection, capability/scenario/contract/traceability gap extractors with 18 TODO categories.
- **Shared diagram helpers** (`src/core/diagram-helpers.ts`) — Pure helper functions (`nextAdrId`, `formatAdrEntry`, `safeNodeId`, `extractWikiLinks`, `generateContextDiagramMermaid`, `generateVaultGraphMermaid`) used by both palette commands and chat handlers, eliminating duplicated logic.

### Changed

- **`features.ts` async I/O** — Replaced all synchronous `fs.readFileSync`/`fs.writeFileSync` with `vscode.workspace.fs` async API to avoid blocking the extension host.
- **ADR/diagram/graph consolidation** — Both palette commands (`features.ts`) and chat handlers (`participant.ts`) now share the same core helpers, consistent node-ID sanitisation (`n_` prefix), and default owner (`TBD`).
- **`ADD_DECISION` idempotency** — `updater.ts` now checks whether a `decision_id` already exists before writing, preventing duplicate entries.
- **Audit log rotation** — `.archipilot/audit.log` automatically rotates after 2 000 entries, retaining up to 3 archived logs.
- **VaultManager disposal** — Extension now pushes `vaultManager` into `context.subscriptions` so its `EventEmitter` is disposed on deactivate.
- **Auto-detect error handling** — `autoDetectVault()` promise chain now has a `.catch()` to prevent unhandled rejection on startup.

### Fixed

- **Metadata-gap regex** — `extractMetadataGaps` and `yamlValue` used `\s` inside `new RegExp()` template literals, which silently matched literal `s` instead of whitespace. Fixed to `\\s`.

## [0.7.0] - 2025-07-28

### Added

- **`/todo` command** — Scans the vault for actionable architecture TODOs (TBD placeholders, missing sections, unresolved questions, unsigned-off decisions, open risks, incomplete roadmap items, orphaned entities, sizing gaps, DrawIO portability items) and generates a prioritised markdown checklist grouped by ADM phase.
- **`/drawio` command** — Export the active vault to a DrawIO XML file, with element classification and migration-status colour coding.
- **`/adr` command** — Record a new Architecture Decision directly from the chat with auto-generated ID and template.
- **`/diagram` command** — Generate a Mermaid context diagram from the active file's `[[WikiLinks]]`.
- **`/graph` command** — Visualise the full vault as a Mermaid dependency graph saved to `Vault-Graph.mermaid`.
- **Palette commands** — `archipilot.recordDecision`, `archipilot.generateContextDiagram`, `archipilot.showGraph` registered in Command Palette.
- **TODO extractor core module** (`src/core/todo-extractor.ts`) — Pure module (zero vscode deps) with 13 category-specific extractors.

## [0.6.0] - 2025-07-26

### Added

- **Idempotent `APPEND_TO_FILE`** — Checks for existing TOGAF IDs in target file before appending, preventing duplicate entries.
- **Auto-stamped `last_modified`** — YAML front-matter `last_modified` field is automatically updated on every vault file write.
- **Metadata validation** (`extractMetadataGaps`) — Scans all vault files for missing or TBD YAML front-matter fields (`status`, `owner`, `version`, `last_modified`, `type`), reviewers on deliverable types.
- **Capability gap detection** (`extractCapabilityGaps`) — Flags business capabilities referenced without corresponding entries.
- **Business scenario gaps** (`extractBusinessScenarioGaps`) — Identifies scenarios missing desired outcomes or action items.
- **Architecture contract gaps** (`extractContractGaps`) — Detects contracts lacking quality criteria or review cadence.
- **Traceability gaps** (`extractTraceabilityGaps`) — Finds requirements or decisions not traced in the traceability matrix.

## [0.5.0-beta] - 2025-07-24

### Added

- **`/archimate` command** — Export the active vault to an ArchiMate 3.2 Open Exchange Format (OEFF) XML file, compatible with Archi, BiZZdesign, Sparx EA, and ADOIT. Extracts elements across all ArchiMate layers (Business, Application, Technology, Motivation, Strategy, Implementation & Migration), infers cross-layer relationships, and auto-generates five views. Includes AI-powered export quality analysis.
- **`archipilot.exportArchimate` palette command** — Quick-export from the Command Palette without opening chat.
- **ArchiMate exporter core module** (`src/core/archimate-exporter.ts`) — Pure TypeScript module (zero vscode deps) with parsers for YAML front matter, markdown tables, and Mermaid graph diagrams. Phase-specific extractors map TOGAF ADM content to ArchiMate 3.2 element types with intelligent type inference (e.g., databases → SystemSoftware, API gateways → TechnologyService).
- **esbuild bundler** — VSIX packaging now uses esbuild for a single-file, tree-shaken bundle (~30× smaller than raw `tsc` output). New scripts: `compile` (esbuild dev), `package` (esbuild production), `typecheck` (tsc --noEmit).
- CI now runs `typecheck` step before esbuild compile.

### Changed

- `vscode:prepublish` script now runs `npm run package` (esbuild production) instead of `tsc`.
- `watch` script uses esbuild watch mode for faster rebuilds.

## [0.4.0] - 2025-07-24

### Added

- **Discriminated union for `ArchCommand`** — `types.ts` defines six specific command interfaces (`AddDecisionCommand`, `UpdateSectionCommand`, `AppendToFileCommand`, `AddOpenQuestionCommand`, `CreateFileCommand`, `UpdateYamlMetadataCommand`) extending `BaseArchCommand` with a discriminated `action` field.
- **Core mutations module** (`src/core/mutations.ts`) — Pure functions (`updateSection`, `addDecision`, `appendContent`, `addOpenQuestion`, `updateYamlMetadata`, `isPathContained`) with zero `vscode` imports.
- **Prompt injection defence** — All vault content injected into LLM prompts is wrapped in `<vault_content>` / `</vault_content>` XML tags with a `DATA BOUNDARY` instruction in the system prompt.
- **TOGAF metamodel validation** (`validateMetamodel`) — Warns when decisions don't target files via `[[wikilinks]]`, when impact analysis lacks quantitative language, and when principle metadata is incomplete.
- **Backup auto-pruning** — `.archipilot/backups/` retains at most 10 backups per file; oldest are pruned automatically on write.
- **Windows path rejection** — `validateCommands()` rejects any command whose `file` field contains backslash paths.
- **Extension walkthrough** — Four-step Getting Started walkthrough (Create Vault → Check Status → Analyze → Update) registered via `contributes.walkthroughs`.
- **Enriched sample vault** — `examples/sample-vault/` expanded to 11 files with B1 (Business Architecture), C1 (Data Architecture), D1 (Technology Architecture), R1 (Requirements), and S1 (Security).
- **VSIX CI artifact** — GitHub Actions workflow now packages and uploads `.vsix` artifact on Node 22.
- **ESLint test coverage** — ESLint config now includes `src/test/**` with relaxed rules (`no-unused-vars`, `no-explicit-any`).
- **30 new tests** — Total suite: 68 tests across 5 files (was 38). New coverage for mutations, Windows path checks, metamodel validation, YAML metadata updates, path containment.

### Changed

- `updater.ts` delegates all file mutations to `src/core/mutations.ts` (exhaustive `switch` with `_exhaustive: never` guard).
- `types.ts` discriminated union replaces permissive `ArchCommand` interface with index signature.
- `validator.ts` uses dynamic `COMMAND_SCHEMAS` map with per-field validation instead of inline checks.

## [0.3.0] - 2025-07-23

### Added

- **Mutation audit log** — Every vault mutation is recorded as a JSONL entry in `.archipilot/audit.log` (timestamp, command, file, promptHash, user, success/failure).
- **Pre-write file backup** — Before every overwrite, the original file is copied to `.archipilot/backups/{name}.{timestamp}.md`. Provides one-click rollback.
- **Dry-run mode for `/update`** — Append `--dry-run` or `--preview` to your prompt to see what *would* change without writing anything.
- **Confidence markers** — System prompts now require the LLM to prefix any extrapolation beyond vault data with "⚠️ Extrapolation:", reducing hallucination risk.
- **Integration tests** — 8 fs-based integration tests covering template write/read, APPEND, CREATE, UPDATE_YAML, backup creation, and end-to-end parse→validate→apply. Total suite: 38 tests.
- **ESLint flat config** — `eslint.config.mjs` with `typescript-eslint` recommended rules.

### Changed

- **Core module extraction** — Pure logic (parser, validator, context windowing) moved to `src/core/` with zero `vscode` imports. Tests now import production code instead of duplicating logic.
- **Stale prompt references fixed** — All 7 file references in system prompts updated to match the current TOGAF vault template (e.g., `12_Decision_Log.md` → `X1_ADR_Decision_Log.md`).
- `updater.ts` refactored to delegate parsing/validation to `src/core/`, added `_backupFile()`, `_writeAuditEntry()`, `_getCurrentUser()`.
- `vault.ts` delegates `buildContext` to `src/core/context.ts`.
- Unit tests rewritten to import from `src/core/` instead of duplicating logic inline.

## [0.2.0] - 2025-07-22

### Added

- **Diff preview for `/update`** — Before applying changes, a visual diff of every affected file is shown in the chat stream. A modal confirmation dialog ("Apply All" / "Cancel") lets you review and approve.
- **Schema validation** — LLM-generated architecture commands are validated against per-type schemas (required fields, safe paths, known command types) before any changes touch the vault.
- **Context windowing** — Smart priority-based summarisation keeps the LLM context budget (~30 K tokens). High-priority files (cross-phase, preliminary, Phase A) are always sent in full; lower-priority files are progressively summarised (YAML + headings) or omitted with markers.
- **Unit tests** — Three test suites covering command parsing & validation, vault template generation, and context windowing/summarisation. Uses Node.js built-in test runner + `tsx`.
- **CI pipeline** — GitHub Actions workflow: lint → compile → test → audit on Node 20/22.
- **G2_Architecture_Contracts** template — Formal agreement template between architecture and implementation teams, with quality criteria, review cadence, and escalation paths.
- **X5_Traceability_Matrix** template — End-to-end traceability (driver → requirement → component → decision → building block → risk/test).
- Demo GIF placeholder in README with recording instructions.
- CI status badge in README.

### Changed

- `/new` command now scaffolds 27 template files (was 25).
- `updater.ts` refactored: separate `validateCommands()`, `previewCommands()`, and `applyCommands()` pipeline.
- `vault.ts` `buildContext()` now uses a character budget with priority tiers instead of naive concatenation.
- README updated with full file reference for G2 and X5, source-tree description, demo section.

## [0.1.0] - 2025-02-17

### Added

- `@architect` chat participant with GitHub Copilot integration.
- `/analyze` — Architecture impact analysis (read-only).
- `/decide` — Structured decision support with pros/cons.
- `/update` — Modify vault documents with governance tracking.
- `/status` — Vault overview and decision status dashboard.
- `/switch` — Switch between vault folders.
- `/c4` — Generate C4 model diagrams (Mermaid).
- `/sizing` — Capacity and cost sizing analysis.
- `/timeline` — Generate Gantt timelines (Mermaid).
- `/new` — Scaffold a new TOGAF-aligned vault (25 template files).
- TOGAF ADM-aligned vault template with full YAML front matter.
- Structured architecture commands: `ADD_DECISION`, `UPDATE_SECTION`, `APPEND_TO_FILE`, `ADD_OPEN_QUESTION`, `CREATE_FILE`, `UPDATE_YAML_METADATA`.
- Auto-detection of Obsidian vaults in workspace.
- Status bar indicator showing active vault.
- Multi-project vault switching.
