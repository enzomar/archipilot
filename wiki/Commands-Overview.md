# Commands Overview

Complete reference for every `@architect` command. Commands are grouped by whether they read or write vault files.

---

## Cheat Sheet

| Command | What it does | Writes files? |
|---------|-------------|:---:|
| `@architect` | Free-form architecture Q&A | No |
| `/analyze` | Impact analysis of a proposed change | No |
| `/decide` | Structured pros/cons for decisions | No |
| `/status` | Vault health dashboard | No |
| `/todo` | Prioritised TOGAF action items | No |
| `/review` | Quality & completeness review | No |
| `/gate <phase>` | Phase gate readiness checklist | No |
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
| `/switch` | Switch active vault | No |

## Flags

| Flag | Applies to | Effect |
|------|-----------|--------|
| `--dry-run` / `--preview` | `/update` | Preview changes without writing |
| `--no-analysis` | `/archimate`, `/drawio`, `/todo` | Skip AI commentary, return structured data only |

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

### `/decide` — Decision Support

Structured pros/cons analysis for open decisions.

```
@architect /decide Should we go with Feature, Enterprise Service, or AI Platform?
@architect /decide Build or buy the Context Aggregation Engine?
```

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

### `/review` — Quality Review

Comprehensive quality and completeness assessment of the entire vault.

```
@architect /review
```

### `/gate` — Phase Gate

Readiness checklist for an ADM phase.

```
@architect /gate Phase B
```

---

## Mutation Commands (Write Files)

See [[Mutation-Commands]] for detailed usage and examples.

### `/update` — Modify Vault

Natural language instructions to add, update, or remove vault content.

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
