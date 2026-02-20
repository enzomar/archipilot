---
id: A2
title: Stakeholder Map
status: approved
owner: Vincenzo Marafioti
version: 1.0.0
last_modified: 2025-12-15
artifact_type: deliverable
togaf_phase: A
---

# A2 — Stakeholder Map

## Stakeholder Registry

| ID | Name | Role | Organisation | Concern | Influence | Interest |
|----|------|------|-------------|---------|-----------|---------|
| STK-01 | Alessandra Ferretti | CFO / Sponsor | Finance | Cost, compliance, ROI | High | High |
| STK-02 | Marco Bianchi | CTO / Sponsor | Technology | Technical direction, vendor choice | High | High |
| STK-03 | Sofia Russo | Head of Payments | Product | Merchant continuity, feature parity | High | High |
| STK-04 | Luca De Santis | CISO | Security | PCI-DSS 4.0, data residency, IAM | High | Medium |
| STK-05 | Marta Conti | PMO Director | Delivery | Schedule, budget, dependencies | Medium | High |
| STK-06 | Elena Marchetti | Lead Platform Engineer | Technology | Kafka operations, infra design | Low | High |
| STK-07 | Giulia Ferrari | QSA (external) | Compliance | PCI-DSS audit, certification | Medium | Low |
| STK-08 | Merchant Representatives | External customers | External | API stability, migration timing, support | Low | Medium |
| STK-09 | Head of Finance Ops | Finance | Finance | SAP integration, reconciliation continuity | Medium | Medium |
| STK-10 | Data Science Lead | Analytics | Technology | Fraud model deployment, ML infra | Low | High |

---

## RACI Matrix

| Activity | Alessandra (CFO) | Marco (CTO) | Sofia (Payments) | Luca (CISO) | Marta (PMO) | EA Team |
|----------|:---:|:---:|:---:|:---:|:---:|:---:|
| Architecture Vision approval | A | R | C | C | I | R |
| API Gateway decision (AD-01) | I | A | C | C | I | R |
| Message Bus decision (AD-02) | I | A | I | I | I | R |
| PCI-DSS compliance | C | A | I | R | I | C |
| Migration plan approval | A | R | R | C | R | C |
| Vendor contracts | R | C | I | C | C | I |
| Go-live approval | A | R | R | R | C | I |

*R = Responsible, A = Accountable, C = Consulted, I = Informed*

## Influence Legend
- **High** — Can veto or mandate architectural decisions
- **Medium** — Can shape decisions through expertise or budget
- **Low** — Affected by decisions but limited direct authority

## Engagement Legend
- **Inform** — One-way communication; no input required
- **Consult** — Two-way communication; input sought but decision lies elsewhere
- **Collaborate** — Active partnership in decision-making

---

## Stakeholder Concerns Map

### Alessandra Ferretti (CFO)

**Primary concerns:**
- Infrastructure cost stays within €90,000/month target
- PCI-DSS certification achieved by June 2026 (regulatory deadline)
- ROI realised within 18 months of go-live

**Architecture implications:**
- Cost efficiency in cloud provisioning — FinOps discipline required
- PCI-DSS controls non-negotiable
- Migration speed matters for benefit realisation

---

### Marco Bianchi (CTO)

**Primary concerns:**
- Avoid single-vendor cloud lock-in (board mandate CON-02)
- Team capability to operate the new stack
- Architectural coherence across all service teams

**Architecture implications:**
- AD-03 (multi-cloud) decision must satisfy this concern
- Investment in Kafka/Kubernetes training
- Architecture patterns must be documented and enforced (P-01–P-08)

---

### Sofia Russo (Head of Payments)

**Primary concerns:**
- No merchant-facing downtime during migration
- New API backward-compatible with existing integrations
- Feature parity before legacy shutdown

**Architecture implications:**
- Canary migration (1% → 100%) with automated rollback
- 12-month API deprecation notice (NFR-09)
- Feature flag service to control rollout per merchant segment

---

### Luca De Santis (CISO)

**Primary concerns:**
- PCI-DSS 4.0 compliance — specifically tokenisation (R-03) and WAF (COMP-03)
- Data residency — no cardholder data outside EU
- MFA on all admin access to payment systems (COMP-04)
- Identity architecture (Q-04)

**Architecture implications:**
- R-03 tokenisation gap is the highest-priority security action item
- AP-01 API Gateway must enforce PCI payload controls
- Q-04 Keycloak decision needs CISO sign-off
