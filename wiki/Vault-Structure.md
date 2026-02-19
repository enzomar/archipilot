# Vault Structure

When you run `@architect /new`, archipilot scaffolds **27 Markdown files** aligned to the TOGAF Architecture Development Method (ADM). Each file covers a specific concern.

---

## File Map

### Preliminary Phase — Principles & Governance

| File | Purpose |
|------|---------|
| `00_Architecture_Repository.md` | Master index linking all vault files |
| `P1_Architecture_Principles.md` | Guiding principles (business, data, application, technology) |
| `P2_Governance_Framework.md` | Governance model, review cadence, roles |

### Phase A — Architecture Vision

| File | Purpose |
|------|---------|
| `A1_Architecture_Vision.md` | High-level scope, drivers, objectives, constraints |
| `A2_Stakeholder_Map.md` | Stakeholders, concerns, RACI matrix |
| `A3_Value_Chain.md` | Business value chain analysis |

### Phase B — Business Architecture

| File | Purpose |
|------|---------|
| `B1_Business_Architecture.md` | Business processes, baseline vs target |
| `B2_Business_Capability_Catalog.md` | Capability model (what the business can do) |
| `B3_Business_Scenarios.md` | Scenario-based requirements (who, what, triggers, outcomes) |

### Phase C — Information Systems Architecture

| File | Purpose |
|------|---------|
| `C1_Application_Architecture.md` | Application components, dependencies, baseline vs target |
| `C2_Data_Architecture.md` | Data entities, flows, ownership |
| `C3_Application_Portfolio_Catalog.md` | Application inventory and lifecycle status |

### Phase D — Technology Architecture

| File | Purpose |
|------|---------|
| `D1_Technology_Architecture.md` | Infrastructure, platforms, baseline vs target |
| `D2_Technology_Standards_Catalog.md` | Approved technology standards and lifecycle |

### Phase E — Opportunities & Solutions

| File | Purpose |
|------|---------|
| `E1_Solutions_Building_Blocks.md` | ABB → SBB mapping (conceptual → concrete components) |
| `E2_Integration_Strategy.md` | Integration patterns, APIs, event flows |

### Phase F — Migration Planning

| File | Purpose |
|------|---------|
| `F1_Architecture_Roadmap.md` | Work packages, milestones, dependencies, Gantt data |
| `F2_Migration_Plan.md` | Transition architectures, rollback procedures |

### Phase G — Governance

| File | Purpose |
|------|---------|
| `G1_Compliance_Assessment.md` | Compliance checks against principles and standards |

### Phase H — Change Management

| File | Purpose |
|------|---------|
| `H1_Change_Request_Log.md` | Change requests with impact assessment |

### Requirements Management

| File | Purpose |
|------|---------|
| `R1_Architecture_Requirements.md` | Functional and non-functional requirements |

### Cross-Cutting

| File | Purpose |
|------|---------|
| `X1_ADR_Decision_Log.md` | Architecture Decision Records (ADRs) |
| `X2_Risk_Issue_Register.md` | Risks and issues with probability/impact/mitigation |
| `X3_Open_Questions.md` | Unresolved questions needing answers |
| `X4_Sizing_Catalogue.md` | Capacity and cost sizing data |

---

## File Conventions

### Prefix Convention

The letter prefix maps to the TOGAF ADM phase:

| Prefix | Phase |
|--------|-------|
| `P` | Preliminary |
| `A` | Architecture Vision |
| `B` | Business Architecture |
| `C` | Information Systems |
| `D` | Technology Architecture |
| `E` | Opportunities & Solutions |
| `F` | Migration Planning |
| `G` | Governance |
| `H` | Change Management |
| `R` | Requirements |
| `X` | Cross-cutting (decisions, risks, questions) |
| `00` | Repository index |

### YAML Front Matter

Every vault file includes metadata:

```yaml
---
id: C1
title: Application Architecture
status: draft        # draft | review | approved | deprecated
owner: TBD
version: 1.0.0
last_modified: 2026-02-19
artifact_type: deliverable
togaf_phase: C
---
```

See [[YAML-Front-Matter]] for the full field reference.

### WikiLinks

Files cross-reference each other using Obsidian-style links:

```markdown
See [[B1_Business_Architecture]] for the business process model.
This implements requirement [[R1_Architecture_Requirements#FR-03]].
```

See [[WikiLinks-and-Traceability]] for how archipilot uses these for impact analysis.

---

## Custom Files

You can add any `.md` file to the vault. Follow the prefix convention (e.g. `C4_API_Catalog.md`) so the sidebar groups it correctly, and add a WikiLink from `00_Architecture_Repository.md`.

---

**See also:** [[YAML-Front-Matter]] · [[WikiLinks-and-Traceability]] · [[Custom-Files]]
