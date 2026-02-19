# archipilot Demo — Recording Script

**Project:** PayPath — Payment Platform Modernisation  
**Duration:** ~6 minutes  
**Vault:** `demo/sample-vault/` (pre-populated — copy to workspace before recording)

---

## Before You Start

1. Copy `demo/sample-vault/` to a clean folder in your workspace:
   ```bash
   cp -r demo/sample-vault ~/Desktop/PayPath-Architecture
   ```
2. Open VS Code at that folder:
   ```bash
   code ~/Desktop/PayPath-Architecture
   ```
3. Make sure **Copilot Chat** is visible (`Cmd+Shift+I`)
4. Set VS Code font size to 14+ for readability
5. Set terminal/chat pane to at least 50% screen width
6. Optional: install [Markdown Mermaid](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid) to render diagrams

---

## Scene 1 — Hook (0:00–0:30)

**What to show:** Open `X1_ADR_Decision_Log.md` in the editor — multiple open decisions visible.

**Narration:**
> *"Enterprise architecture decisions buried in spreadsheets. Risks tracked in emails. Impact assessments that take days. Meet archipilot — your architecture copilot inside VS Code."*

---

## Scene 2 — Check the Vault Status (0:30–1:15)

**What to type:**
```
@architect /status
```

**What to expect:** A dashboard showing:
- 4 documents in `draft`, 3 in `review`, 2 `approved`
- 3 open architecture decisions
- 5 open risks (2 High severity)
- 4 open questions
- 7 pending work packages

**Narration:**
> *"The /status command gives you an instant health check. Four documents still in draft, three open decisions blocking delivery, two high-severity risks. This is a PayPath payment platform modernisation — let's work through it."*

> ⏸️ **Pause** — let the dashboard render fully before moving on.

---

## Scene 3 — What Should We Work on First? (1:15–1:50)

**What to type:**
```
@architect /todo
```

**What to expect:** A prioritised list:
- 🔴 HIGH: AD-01 API Gateway — open, blocking 3 work packages
- 🔴 HIGH: Risk R-03 PCI-DSS compliance gap — mitigation not started
- 🟡 MED: AD-02 Message Bus — open, target date overdue
- 🟡 MED: FR-04 Real-time fraud detection — no owner assigned
- 🟢 LOW: Q-03 Multi-cloud strategy question — target date next month

**Narration:**
> *"/todo scans the entire vault — decisions, risks, open questions, requirements — and returns a prioritised action list. We have two critical blockers: the API Gateway decision and a PCI-DSS compliance gap."*

---

## Scene 4 — Record a Decision (1:50–2:45)

**What to type:**
```
@architect /adr Adopt Kong as the API Gateway for all external traffic
```

**What to expect:**
- Diff preview opens showing new entry added to `X1_ADR_Decision_Log.md`
- Entry has ID `AD-04`, status `🟡 Proposed`, today's date

**Click:** Apply All

**Narration:**
> *"Let's record a new decision. /adr appends a structured Architecture Decision Record — with status, date, context, and template sections ready to fill."*

> ⏸️ **Pause** — show the file has been updated, navigate to `X1_ADR_Decision_Log.md` to confirm.

---

## Scene 5 — Get Structured Analysis on a Decision (2:45–3:30)

**What to type:**
```
@architect /decide AD-01 API Gateway — evaluate Kong, AWS API Gateway, and Azure APIM given our PCI-DSS requirements and multi-cloud strategy
```

**What to expect:** Structured analysis with:
- Context drawn from the vault (PCI-DSS risk, multi-cloud question, team skills)
- Pros/cons table for each option
- Recommended option with rationale
- Follow-up: suggested `/update` command to record the decision

**Narration:**
> *"/decide doesn't just give generic advice — it reads your actual architecture. It knows about the PCI-DSS risk, the multi-cloud question, your team's skills from the stakeholder map. The recommendation is grounded in your context."*

---

## Scene 6 — Impact Analysis Before a Change (3:30–4:15)

**What to type:**
```
@architect /analyze What is the impact of replacing the legacy payment processor with a cloud-native event-driven architecture?
```

**What to expect:** Impact analysis covering:
- Affected components (C1: Payment Service, Fraud Engine, Ledger)
- Affected requirements (FR-01, FR-04, NFR-02 latency)
- Risks triggered or mitigated (R-02, R-05)
- Decisions that become relevant (AD-02, AD-03)
- Estimated migration complexity

**Narration:**
> *"Before committing to a change, ask archipilot to assess the impact. It traces through the entire vault — application components, requirements, risks, decisions — and tells you exactly what would be affected."*

---

## Scene 7 — Update a Document (4:15–4:50)

**What to type:**
```
@architect /update Mark risk R-03 (PCI-DSS compliance gap) mitigation as "In Progress" — owner Security Team, target date 2026-04-30
```

**What to expect:**
- Diff preview shows the change in `X2_Risk_Issue_Register.md`
- Owner column updated, status updated to 🟡 In Progress

**Click:** Apply All

**Narration:**
> *"Updating the vault is just as easy. Plain English instruction, diff preview, one click to confirm. Every change is backed up automatically with a timestamped copy."*

---

## Scene 8 — Export to Draw.io (4:50–5:30)

**What to type:**
```
@architect /drawio
```

**What to expect:**
- Three `.drawio` files created in `exports/drawio/`
- Chat shows summary: components mapped to As-Is / Target / Migration
- Migration view highlights: 2 components to remove (red), 4 new (green), 6 unchanged (blue)

**Open** the `.drawio` file using the Draw.io VS Code extension.

**Narration:**
> *"Now let's generate architecture diagrams. /drawio creates three views automatically — current state, target state, and a migration overlay. Red components are being retired, green ones are new, blue stays unchanged. Open directly in VS Code with the Draw.io extension, or in Confluence."*

---

## Scene 9 — Export to ArchiMate (5:30–5:55)

**What to type:**
```
@architect /archimate
```

**What to expect:**
- ArchiMate XML generated in `exports/archimate/`
- Chat shows: business layer (5 elements), application layer (8), technology layer (6), motivation (principles + requirements)

**Narration:**
> *"For enterprise tooling — export to ArchiMate 3.2. Import the XML into Archi, BiZZdesign, or Sparx EA. One command, full model."*

---

## Scene 10 — Wrap Up (5:55–6:15)

**What to show:** Sidebar — Architecture Health view with green/amber indicators.

**Narration:**
> *"archipilot — your architecture copilot, right inside VS Code. Record decisions, assess impact, govern changes, export to enterprise tools — all from Copilot Chat, all from your Markdown vault. Free, open source, TOGAF-aligned."*

**End card:** Show `https://enzomar.github.io/archipilot/` and VS Code Marketplace link.

---

## Tips for Recording

| Tip | Detail |
|-----|--------|
| **Slow down on typing** | Viewers need to read the commands |
| **Pause after each response** | Let the AI output fully render before narrating |
| **Pre-expand the chat pane** | Make it 60% of screen width |
| **Close notifications** | Dismiss any VS Code popups before recording |
| **Use a clean VS Code profile** | Hide unrelated extensions in the sidebar |
| **Record at 1920×1080** | Standard for YouTube / Loom |
| **Trim dead air** | Edit out any waiting time between typing and response |
| **Add captions** | Loom auto-generates them; review before publishing |

---

## Fallback Commands (if AI response is off)

If a command produces a poor response, these alternatives tend to be more reliable:

| Scene | Primary | Fallback |
|-------|---------|---------|
| /decide | `@architect /decide AD-01 evaluate API Gateway options` | `@architect What are the pros and cons of Kong vs AWS API Gateway for PCI-DSS compliance?` |
| /analyze | `@architect /analyze replacing legacy payment processor` | `@architect Which components depend on the Legacy Payment Processor in the current architecture?` |
| /todo | `@architect /todo` | `@architect /todo What are the highest priority blockers in the vault?` |

---

## Suggested Post-Demo CTAs

- Star the repo: https://github.com/enzomar/archipilot
- Install: `ext install enzomar.archipilot`
- Website: https://enzomar.github.io/archipilot/
- Issues / feedback: https://github.com/enzomar/archipilot/issues
