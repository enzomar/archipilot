# Quick Start

Get productive with archipilot in 5 minutes — no TOGAF knowledge required.

---

## Option A: I Have Existing Source Code (Recommended)

If you already have a codebase open in VS Code, the fastest way to get a TOGAF vault is:

```
@architect /scan
```

This scans your workspace for package files, data models, services, infrastructure configs, API specs, and READMEs — then generates a TOGAF vault populated with real information from your code.

**What to do after `/scan`:**
```
@architect /status   ← see what was detected and what’s still missing
@architect /review   ← quality check the auto-generated content
@architect /todo     ← prioritised list of what to fill in next
```

> 💡 The scanner cannot infer business context (goals, stakeholders, value proposition) from code alone. After scanning, use `@architect /update` to add that layer.

---

## Option B: Starting from Scratch

## 1. Scaffold a Vault

Open Copilot Chat and type:

```
@architect /new My-First-Architecture
```

This creates **27 template files** covering all architecture domains. Don't worry about the naming — the prefixes (`A1_`, `B1_`, `C1_`, etc.) are just a filing convention.

## 2. Start with What You Know

You don't need to fill every file. Start with what makes sense:

| You know about... | Edit this file |
|-------------------|---------------|
| Existing source code | Run `@architect /scan` — vault auto-populated from code |
| Business goals | `A1_Architecture_Vision.md` — write your project scope and drivers in plain English |
| Applications / systems | `C1_Application_Architecture.md` — list the systems involved |
| Decisions to make | Type `@architect /adr Should we use Kafka or RabbitMQ?` |
| Risks | `X2_Risk_Issue_Register.md` — add rows to the table |

## 3. Let archipilot Guide You

```
@architect /todo     ← "What should I work on next?"
@architect /status   ← "How complete is my architecture?"
@architect /review   ← "Where are the quality gaps?"
```

## 4. Evolve Incrementally

Start with **Vision → Business Scenarios → Application Architecture → Decisions**. The `/todo` command will tell you what's missing and what to prioritise next.

## Mental Model

Think of the vault as a **structured notebook** for your architecture:

- Each file is a **chapter**
- `[[WikiLinks]]` are **cross-references** between chapters
- YAML front matter is **metadata** (status, owner, version)
- archipilot reads the whole notebook to answer questions, find inconsistencies, and suggest next steps

## Suggested Learning Path

| Day | Goal | Commands |
|-----|------|----------|
| 1 | Bootstrap | `/scan` (existing code) or `/new` (blank), `/status`, free-form questions |
| 2 | Capture decisions | `/adr`, `/decide` |
| 3 | Impact & risk | `/analyze`, `/todo` |
| 4 | Diagrams & exports | `/diagram`, `/graph`, `/c4` |
| 5 | Governance | `/review`, `/gate`, `/update` |
| 6 | Enterprise tooling | `/archimate`, `/drawio`, `/timeline`, `/scan --append` |

> Each session takes 15–30 minutes. By the end of the week you'll have a working architecture repository.

---

**Next:** [[Your-First-Vault]] · [[Commands-Overview]] · [[TOGAF-Glossary]]
