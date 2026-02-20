# Welcome to the archipilot Wiki!

<p align="center">
  <strong>Enterprise Architecture Copilot for VS Code</strong><br/>
  TOGAF-aligned · Obsidian vaults · Powered by GitHub Copilot
</p>

---

**archipilot** turns your Obsidian architecture vaults into an interactive, TOGAF-aligned Enterprise Architecture assistant — right inside VS Code Copilot Chat.

Ask questions, record decisions, assess risks, generate diagrams, and export to ArchiMate or Draw.io — all without leaving your editor.

| | |
|---|---|
| **Version** | 0.10.0 |
| **Publisher** | [enzomar](https://github.com/enzomar) |
| **License** | MIT |
| **Website** | [enzomar.github.io/archipilot](https://enzomar.github.io/archipilot/) |
| **Marketplace** | [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=enzomar.archipilot) |

---

## 📚 Wiki Contents

### Getting Started

| Page | Description |
|------|-------------|
| [[Installation]] | Install from Marketplace, prerequisites, first launch |
| [[Quick-Start]] | Get productive in 5 minutes — no TOGAF knowledge required |
| [[Your-First-Vault]] | Scaffold a vault with `/new` and understand the file structure |
| [[Interactive-Tutorial]] | Built-in walkthrough: Create → Status → Analyze → Update |

### Commands Reference

| Page | Description |
|------|-------------|
| [[Commands-Overview]] | Full cheat sheet of all `@architect` commands |
| [[Query-Commands]] | Read-only commands: `/status`, `/analyze`, `/decide`, `/review`, `/todo`, `/gate` |
| [[Mutation-Commands]] | File-modifying commands: `/update`, `/adr`, `/diagram`, `/graph`, `/new`, `/scan` |
| [[Export-Commands]] | Export tools: `/archimate`, `/drawio`, `/c4`, `/timeline`, `/sizing` |
| [[Palette-Commands]] | Command Palette actions (no chat required) |

### Architecture Vault

| Page | Description |
|------|-------------|
| [[Vault-Structure]] | The 27 TOGAF template files and their purpose |
| [[YAML-Front-Matter]] | Status, owner, version, and other metadata fields |
| [[WikiLinks-and-Traceability]] | How `[[cross-references]]` create an architecture knowledge graph |
| [[Custom-Files]] | Adding your own files to the vault |
| [[Multi-Vault-Projects]] | Working with multiple vaults using `/switch` |

### Exports & Diagrams

| Page | Description |
|------|-------------|
| [[ArchiMate-Export]] | Export to ArchiMate 3.2 Open Exchange XML (Archi, BiZZdesign, Sparx EA) |
| [[DrawIO-Export]] | Generate As-Is / Target / Migration Draw.io diagrams |
| [[Mermaid-Diagrams]] | C4, Gantt, context diagrams, and vault dependency graphs |
| [[Export-Folder-Layout]] | Where exports are saved (`exports/archimate/`, `exports/drawio/`) |

### Safety & Governance

| Page | Description |
|------|-------------|
| [[Safety-Model]] | Diff preview, confirmation, dry-run, backup, and audit log |
| [[Phase-Gates]] | Using `/gate` for ADM phase readiness checks |
| [[Architecture-Review]] | Automated quality and completeness review with `/review` |
| [[Confidence-Markers]] | How archipilot flags AI-generated extrapolations with ⚠️ |

### TOGAF Reference

| Page | Description |
|------|-------------|
| [[TOGAF-Glossary]] | ADM, ADR, ABB, SBB, ArchiMate, and other key terms |
| [[ADM-Phases]] | Overview of TOGAF phases A–H and how they map to vault files |
| [[Architecture-Patterns]] | Common architecture patterns and how to capture them |

### Contributing & Development

| Page | Description |
|------|-------------|
| [[Contributing]] | How to contribute — branch strategy, PR workflow, coding standards |
| [[Development-Setup]] | Clone, install, build, test, debug locally |
| [[Architecture]] | Extension internals: participant, core engine, parser, validator |
| [[Testing]] | 152+ unit & integration tests, how to run and extend them |
| [[Release-Process]] | Version bumping, CI/CD pipeline, publishing to Marketplace |

---

## 🚀 Quick Start

### 0. Already have a codebase? Bootstrap from source code

```
@architect /scan
```

Scans your workspace and generates a populated TOGAF vault automatically.

### 1. Or scaffold a blank vault

Search for **"archipilot"** in the VS Code Extensions panel, or:

```
ext install enzomar.archipilot
```

**Requirements:** VS Code 1.93+, GitHub Copilot subscription.

### 2. Create a vault

Open Copilot Chat and type:

```
@architect /new My-Project
```

This scaffolds 27 TOGAF-aligned Markdown files in your workspace.

### 3. Start working

```
@architect /status           → Vault health dashboard
@architect /todo             → What should I work on next?
@architect /adr Use Kafka    → Record a new decision
@architect /analyze          → What-if impact analysis
@architect /update           → Make governed changes
```

### 4. Export

```
@architect /archimate        → ArchiMate 3.2 XML
@architect /drawio           → Draw.io diagrams
@architect /c4               → C4 model (Mermaid)
@architect /timeline         → Gantt chart (Mermaid)
```

---

## 🎯 Command Cheat Sheet

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

> **Tip:** Append `--dry-run` to any `/update` to preview without writing. Append `--no-analysis` to exports to skip AI commentary.

---

## 📅 Suggested Learning Path

| Day | Goal | Commands |
|-----|------|----------|
| 1 | Setup & explore | `/new`, `/status`, free-form questions |
| 2 | Capture decisions | `/adr`, `/decide` |
| 3 | Impact & risk | `/analyze`, `/todo` |
| 4 | Diagrams & exports | `/diagram`, `/graph`, `/c4` |
| 5 | Governance | `/review`, `/gate`, `/update` |
| 6 | Enterprise tooling | `/archimate`, `/drawio`, `/timeline` |

Each session takes 15–30 minutes. By end of week you'll have a working architecture repository.

---

## ❓ FAQ

<details>
<summary><strong>Do I need Obsidian?</strong></summary>

No. archipilot reads plain Markdown files — it doesn't require Obsidian itself. The vault structure and `[[WikiLinks]]` follow Obsidian conventions, but the files are standard `.md` you can edit in any tool.
</details>

<details>
<summary><strong>Do I need to know TOGAF?</strong></summary>

No. See the [[Quick-Start]] page. The templates provide structure; archipilot guides you on what to fill in next. The [[TOGAF-Glossary]] is there when you need it.
</details>

<details>
<summary><strong>Can I use archipilot without GitHub Copilot?</strong></summary>

No — archipilot is a Copilot Chat Participant and requires an active GitHub Copilot subscription. The LLM calls go through Copilot's API.
</details>

<details>
<summary><strong>Can I undo a `/update`?</strong></summary>

Yes. Every write creates a timestamped backup in `.archipilot/backups/`. You can also use `--dry-run` to preview before applying. The audit log (`.archipilot/audit.log`) records every mutation.
</details>

<details>
<summary><strong>Can multiple people work on the same vault?</strong></summary>

Yes — it's just a folder of Markdown files. Use Git for version control, branches, and merge. YAML front matter tracks `last_modified` and `owner` for coordination.
</details>

<details>
<summary><strong>Which tools import the ArchiMate export?</strong></summary>

Archi (free, open-source), BiZZdesign, Sparx EA, ADOIT, and any tool supporting the ArchiMate 3.2 Open Exchange Format.
</details>

---

## 🔗 Links

- **Website:** [enzomar.github.io/archipilot](https://enzomar.github.io/archipilot/)
- **Marketplace:** [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=enzomar.archipilot)
- **Repository:** [github.com/enzomar/archipilot](https://github.com/enzomar/archipilot)
- **Issues:** [Report a bug or request a feature](https://github.com/enzomar/archipilot/issues)
- **Changelog:** [CHANGELOG.md](https://github.com/enzomar/archipilot/blob/main/CHANGELOG.md)
- **Contributing:** [CONTRIBUTING.md](https://github.com/enzomar/archipilot/blob/main/CONTRIBUTING.md)
- **License:** [MIT](https://github.com/enzomar/archipilot/blob/main/LICENSE)

---

<p align="center">
  <sub>archipilot is an independent, community-driven project. TOGAF® is a registered trademark of The Open Group.<br/>
  Copyright © 2026 <a href="https://github.com/enzomar">enzomar</a> — MIT License</sub>
</p>
