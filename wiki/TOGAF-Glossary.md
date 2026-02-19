# TOGAF Glossary

Quick reference for TOGAF terms used throughout archipilot. You don't need to memorise these — they're here when you need them.

---

| Term | Definition | Where it appears in archipilot |
|------|------------|-------------------------------|
| **ADM** | Architecture Development Method — TOGAF's iterative cycle (Phases A–H) for developing enterprise architecture | File prefixes (`A1_`, `B1_`, …), sidebar phase groups |
| **ADR** | Architecture Decision Record — a structured log entry capturing context, options, and rationale for a decision | `X1_ADR_Decision_Log.md`, `/adr`, `/decide` |
| **ABB** | Abstract Building Block — a conceptual component (e.g. "Identity Provider") | `E1_Solutions_Building_Blocks.md` |
| **SBB** | Solution Building Block — a concrete product filling an ABB (e.g. "Azure AD B2C") | `E1_Solutions_Building_Blocks.md` |
| **ArchiMate** | A modelling language for enterprise architecture (ISO/IEC/IEEE 42010 compliant) | `/archimate` export |
| **Baseline** | The current (as-is) state of the architecture | B1, C1, D1 files; Draw.io "As-Is" view |
| **Target** | The desired future (to-be) state | B1, C1, D1 files; Draw.io "Target" view |
| **Gap Analysis** | Comparison of baseline vs target to identify what must change | B1, C1, D1 files |
| **Capability** | A business ability (e.g. "Customer Onboarding") independent of how it's implemented | `B2_Business_Capability_Catalog.md` |
| **Deliverable** | A formally reviewed architecture work product | YAML `artifact_type: deliverable` |
| **Phase Gate** | A governance checkpoint where an ADM phase is assessed for readiness before proceeding | `/gate` command |
| **Stakeholder** | Anyone affected by or having authority over the architecture | `A2_Stakeholder_Map.md` |
| **Traceability** | End-to-end linking from business driver → requirement → component → decision → risk | WikiLinks across files |
| **RACI** | Responsible / Accountable / Consulted / Informed matrix | `A2_Stakeholder_Map.md` |
| **NFR** | Non-Functional Requirement (performance, security, scalability, etc.) | `R1_Architecture_Requirements.md` |
| **Work Package** | A defined chunk of delivery work in the migration roadmap | `F1_Architecture_Roadmap.md` |
| **WikiLink** | Obsidian-style `[[cross-reference]]` between vault files | Used everywhere for traceability |
| **Building Block** | A (potentially reusable) component of business, IT, or architectural capability | `E1_Solutions_Building_Blocks.md` |
| **Concern** | An interest in the architecture relevant to a stakeholder | `A2_Stakeholder_Map.md` |
| **Constraint** | A limitation on the architecture (budget, technology, regulation) | `A1_Architecture_Vision.md` |
| **Driver** | A business motivation that creates needs the architecture must address | `A1_Architecture_Vision.md` |
| **Principle** | A qualitative statement of intent that guides architecture decisions | `P1_Architecture_Principles.md` |
| **Transition Architecture** | An intermediate state between baseline and target | `F2_Migration_Plan.md` |
| **View** | A representation of the architecture from a specific perspective | ArchiMate views, Draw.io tabs, C4 diagrams |
| **Viewpoint** | A description of what a view should contain and who it is for | `/c4`, `/archimate` export views |

---

## ADM Phases Quick Reference

| Phase | Name | Key Question | Vault Files |
|-------|------|-------------|-------------|
| **Preliminary** | Framework & Principles | "What rules govern our architecture?" | `P1_`, `P2_`, `00_` |
| **A** | Architecture Vision | "What are we trying to achieve?" | `A1_`, `A2_`, `A3_` |
| **B** | Business Architecture | "What does the business need?" | `B1_`, `B2_`, `B3_` |
| **C** | Information Systems | "What applications and data support the business?" | `C1_`, `C2_`, `C3_` |
| **D** | Technology Architecture | "What infrastructure runs the applications?" | `D1_`, `D2_` |
| **E** | Opportunities & Solutions | "What building blocks fulfil the requirements?" | `E1_`, `E2_` |
| **F** | Migration Planning | "How do we get from here to there?" | `F1_`, `F2_` |
| **G** | Implementation Governance | "Are we building what we designed?" | `G1_` |
| **H** | Architecture Change Management | "How do we manage change requests?" | `H1_` |
| **Req. Mgmt** | Requirements Management | "What requirements must the architecture satisfy?" | `R1_` |

---

**See also:** [[ADM-Phases]] · [[Vault-Structure]] · [[Quick-Start]]
