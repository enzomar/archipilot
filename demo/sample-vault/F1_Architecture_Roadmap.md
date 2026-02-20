---
id: F1
title: Architecture Roadmap
status: review
owner: PMO
version: 1.0.0
last_modified: 2026-02-10
artifact_type: deliverable
togaf_phase: F
---

# F1 — Architecture Roadmap

## Programme Timeline

```mermaid
gantt
    title PayPath Modernisation Roadmap 2026
    dateFormat  YYYY-MM-DD
    section Phase A/B
    Architecture Vision & Business Arch     :done,    phaseAB, 2025-10-01, 2025-12-31
    section Phase C/D
    Application Architecture (C1)           :active,  phaseC, 2026-01-01, 2026-03-15
    Technology Architecture (D1)            :active,  phaseD, 2026-01-15, 2026-03-30
    Phase C/D Gate Review                   :milestone, 2026-03-15, 0d
    section Phase E/F
    Solutions Building Blocks (E1)          :         phaseE, 2026-03-01, 2026-04-15
    Migration Plan (F2)                     :         phaseF, 2026-03-15, 2026-04-30
    section Delivery
    API Gateway Implementation (WP-03)      :         wp03, 2026-04-01, 2026-05-15
    Core Services Build (WP-04)             :         wp04, 2026-04-15, 2026-07-31
    PCI-DSS Tokenisation (WP-05)            :crit,    wp05, 2026-03-01, 2026-05-01
    Fraud Detection Service (WP-06)         :         wp06, 2026-05-01, 2026-07-15
    Canary Migration 1% (WP-07)             :         wp07, 2026-07-01, 2026-08-01
    Full Migration (WP-08)                  :crit,    wp08, 2026-09-01, 2026-11-30
    Legacy Decommission (WP-09)             :         wp09, 2026-11-01, 2026-12-31
    section Compliance
    QSA Assessment                          :crit,    qsa, 2026-05-15, 2026-06-15
    PCI-DSS 4.0 Certification               :milestone, 2026-06-30, 0d
```

---

## Work Package Summary

| ID | Work Package | Phase | Status | Owner | Target | Depends On |
|----|-------------|-------|--------|-------|--------|-----------|
| WP-01 | Architecture Vision & Governance | A | ✅ Done | V. Marafioti | 2025-12-31 | — |
| WP-02 | Business Architecture & Scenarios | B | ✅ Done | Payments Lead | 2025-12-31 | WP-01 |
| WP-03 | API Gateway Platform | C/D | 🟡 Planned | Platform Team | 2026-05-15 | AD-01 |
| WP-04 | Core Microservices Build | E | 🟡 Planned | Engineering | 2026-07-31 | WP-03, AD-02 |
| WP-05 | PCI-DSS Tokenisation Service | C | 🔴 Critical | Security Team | 2026-05-01 | R-03 |
| WP-06 | Fraud Detection Service | C/E | 🟡 Planned | Data Science | 2026-07-15 | WP-04 |
| WP-07 | Canary Migration (1% traffic) | F | 🔵 Future | Platform Team | 2026-08-01 | WP-04, WP-05 |
| WP-08 | Full Platform Migration | F | 🔵 Future | All Teams | 2026-11-30 | WP-07 |
| WP-09 | Legacy Decommission | H | 🔵 Future | Platform Team | 2026-12-31 | WP-08 |
| WP-10 | QSA Compliance Assessment | G | 🔴 Critical | Security Team | 2026-06-15 | WP-05 |

---

## Critical Path

```mermaid
flowchart LR
    AD01[AD-01\nAPI Gateway Decision] --> WP03[WP-03\nAPI Gateway Build]
    AD02[AD-02\nMessage Bus Decision] --> WP04[WP-04\nCore Services]
    R03[R-03\nPCI-DSS Tokenisation] --> WP05[WP-05\nTokenisation Service]
    WP03 --> WP04
    WP04 --> WP06[WP-06\nFraud Detection]
    WP04 --> WP07[WP-07\nCanary Migration]
    WP05 --> WP10[WP-10\nQSA Assessment]
    WP10 --> CERT[PCI-DSS\nCertification\nJune 2026]
    WP07 --> WP08[WP-08\nFull Migration]
    WP08 --> WP09[WP-09\nDecommission]

    style AD01 fill:#ffcccc,stroke:#cc0000
    style AD02 fill:#ffcccc,stroke:#cc0000
    style WP05 fill:#ffcccc,stroke:#cc0000
    style CERT fill:#ccffcc,stroke:#009900
```

---

## Milestones

| Date | Milestone | Status |
|------|-----------|--------|
| 2025-12-31 | Phase A/B complete | ✅ Achieved |
| 2026-03-15 | Phase C/D gate review | 🟡 Upcoming |
| 2026-05-01 | Tokenisation service live | 🔴 At risk |
| 2026-06-30 | PCI-DSS 4.0 certification | 🔴 At risk |
| 2026-08-01 | Canary migration start | 🟡 On track (conditional) |
| 2026-11-30 | Full migration complete | 🟡 On track (conditional) |
| 2026-12-31 | Legacy decommission | 🟡 On track (conditional) |

## Status Legend
- **Not started** — Work not yet begun
- **In progress** — Actively being worked on
- **Blocked** — Cannot proceed; dependency or issue outstanding
- **Complete** — Delivered and verified
- **Deferred** — Postponed to a later phase
