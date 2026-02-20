# Commands Overview

Complete reference for every `@architect` command. Commands are grouped by whether they read or write vault files.

---

## Cheat Sheet

| Command | What it does | Writes files? |
|---------|-------------|:---:|
| `@architect` | Free-form architecture Q&A | No |
| `/analyze` | Impact analysis of a proposed change | No |
| `/decide` | Two-step decision support (analyze → record) | No |
| `/status` | Vault health dashboard | No |
| `/todo` | Prioritised TOGAF action items | No |
| `/audit` | Unified audit (status + review + gate) | No |
| `/audit --quick` | Quick audit (status + review) | No |
| `/audit --full` | Full audit (status + review + gate) | No |
| `/review` | Alias for `/audit --full` | No |
| `/gate <phase>` | Alias for `/audit --full` | No |
| `/impact <ID>` | Cross-vault impact chain | No |
| `/update <instruction>` | Modify vault files (with diff preview) | **Yes** |
| `/adr <title>` | Record an Architecture Decision | **Yes** |
| `/diagram` | Mermaid context diagram for active file | **Yes** |
| `/graph` | Full vault dependency graph | **Yes** |
| `/c4` | C4 model diagram (Mermaid) | No |
| `/sizing` | Capacity & cost estimation | No |
| `/timeline` | Gantt chart from roadmap | No |
| `/archimate` | Export to ArchiMate 3.2 XML | **Yes** |
| `/drawio` | Export to Draw.io (3 views) | **Yes** |
| `/new <name>` | Scaffold a new TOGAF vault | **Yes** |
| `/scan` | Generate vault from workspace source code | **Yes** |
| `/scan --append` | Enrich existing vault with new source code signals | **Yes** |
| `/switch` | Switch active vault | No |

## Flags

| Flag | Applies to | Effect |
|------|-----------|--------|
| `--dry-run` / `--preview` | `/update` | Preview changes without writing |
| `--no-analysis` | `/archimate`, `/drawio`, `/todo` | Skip AI commentary, return structured data only |
| `--append` | `/scan` | Enrich existing vault instead of creating a new one |
| `--quick` | `/audit` | Quick audit: status + review only (skip gate) |
| `--full` | `/audit` | Full audit: status + review + phase gate |

---

## Query Commands (Read-Only)

See [[Query-Commands]] for detailed usage and examples.

### `@architect` — Free-form Questions

Ask anything about your architecture. The agent uses the full vault as context.

```
@architect What is the current state of our AI vendor strategy?
@architect Summarize all open decisions and their impact
@architect Which components depend on the API Gateway?
```

### `/analyze` — Impact Analysis

Assess the impact of a proposed change without modifying any files.

```
@architect /analyze What happens if we drop the API Gateway?
@architect /analyze Impact of moving to multi-vendor LLM strategy
```

### `/decide` — Two-Step Decision Support

Decision support follows a **two-step flow**:

**Step 1 — Analysis only (no vault changes):**
```
@architect /decide Should we go with Feature, Enterprise Service, or AI Platform?
@architect /decide Build or buy the Context Aggregation Engine?
```

The AI produces a structured pros/cons analysis grounded in your vault context. No vault commands are generated at this stage.

**Step 2 — Record the decision (after confirmation):**
```
Yes, go with Option B
Record this decision — Enterprise Service is the winner
```

After you confirm, archipilot generates an `ADD_DECISION` command with diff preview.

### `/status` — Vault Overview

Dashboard of document maturity, open decisions, risks, and questions.

```
@architect /status
@architect /status How many decisions are still open?
```

### `/todo` — Action Items

Prioritised list of next actions across decisions, risks, questions, work packages, requirements, compliance checks, and change requests.

```
@architect /todo
@architect /todo What should we focus on this sprint?
```

### `/audit` — Unified Vault Health Check

Combines status dashboard, quality review, and phase gate assessment into a single command.

```
@architect /audit             ← default scope (same as --full)
@architect /audit --quick      ← status + review only
@architect /audit --full       ← status + review + phase gate
```

The audit produces a pre-computed dashboard (same as `/status`), then calls the LLM for a structured assessment covering document quality, completeness, cross-reference integrity, and (with `--full`) phase gate readiness.

### `/review` — Quality Review (alias)

Now an alias for `/audit --full`. Performs the same unified health check.

```
@architect /review
```

### `/gate` — Phase Gate (alias)

Now an alias for `/audit --full`. Performs the same unified health check.

```
@architect /gate Phase B
```

---

## Mutation Commands (Write Files)

See [[Mutation-Commands]] for detailed usage and examples.

### `/update` — Modify Vault

Natural language instructions to add, update, or remove vault content. Updates now include **unified diffs** and **vault-aware validation** — the system checks file existence, section heading matches (with fuzzy suggestions), and duplicate detection before any write.

```
@architect /update Add risk R-06: "Regulatory change" — probability Low, impact High
@architect /update Mark AD-01 as decided: Option B
@architect /update Remove assumption ASM-03, it has been validated
```

### `/adr` — Record Decision

Create a new ADR entry in `X1_ADR_Decision_Log.md`.

```
@architect /adr Use PostgreSQL for transactional data
@architect /adr Adopt an API Gateway as the single entry point
```

### `/diagram` — Context Diagram

Generate a Mermaid diagram from `[[WikiLinks]]` in the active file.

```
@architect /diagram
```

### `/graph` — Vault Dependency Graph

Full vault visualisation saved to `Vault-Graph.mermaid`.

```
@architect /graph
```

### `/new` — Scaffold Vault

Create a new vault with 27 TOGAF template files.

```
@architect /new My-Project
```

### `/scan` — Generate Vault from Source Code

Scan workspace source code and generate (or enrich) a TOGAF-aligned vault. Maps source signals to TOGAF artifacts: package files → D2 standards, models → C2 data architecture, services → C1 application architecture, Docker/Terraform → D1 technology architecture, OpenAPI → B2 capabilities.

The scan now includes a **review step** — an extraction summary table showing each command, its target file, validation status, and a collapsible section with detailed unified diffs. Commands with vault validation errors are automatically filtered out before apply.

```
@architect /scan                  ← generate a new vault from source code
@architect /scan --append         ← enrich the active vault (never overwrites approved content)
```

The `--append` flag is automatically inferred when a vault is already active.

---

## Export Commands

See [[Export-Commands]] for detailed usage and examples.

### `/archimate` — ArchiMate 3.2 XML

```
@architect /archimate
@architect /archimate --no-analysis
```

### `/drawio` — Draw.io Diagrams

Three views: As-Is, Target, Migration (color-coded).

```
@architect /drawio
@architect /drawio --no-analysis
```

### `/c4` — C4 Model

```
@architect /c4
```

### `/timeline` — Gantt Chart

```
@architect /timeline
```

### `/sizing` — Capacity Estimation

```
@architect /sizing
```

---

## Palette Commands

Available from the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) — no chat required.

| Command | Description |
|---------|-------------|
| `archipilot: Export Vault to ArchiMate (XML)` | Quick-export without opening chat |
| `archipilot: Export Vault to Draw.io` | Quick-export diagrams without opening chat |
| `archipilot: Record Architecture Decision` | Open ADR input box |
| `archipilot: Generate Context Diagram` | Insert Mermaid diagram for active file |
| `archipilot: Show Vault Graph` | Generate and open `Vault-Graph.mermaid` |
| `archipilot: Open in Split Preview` | Side-by-side Markdown preview |

---

**See also:** [[Query-Commands]] · [[Mutation-Commands]] · [[Export-Commands]] · [[Palette-Commands]]
