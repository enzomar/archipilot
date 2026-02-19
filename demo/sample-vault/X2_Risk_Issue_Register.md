---
id: X2
title: Risk & Issue Register
status: active
owner: Risk Team
version: 1.8.0
last_modified: 2026-02-17
artifact_type: log
togaf_phase: Cross
---

# X2 — Risk & Issue Register

## Risk Summary

| ID | Title | Category | Probability | Impact | Severity | Status | Owner |
|----|-------|----------|-------------|--------|----------|--------|-------|
| R-01 | API Gateway PoC delayed | Delivery | Medium | High | 🔴 High | Open | Platform Team |
| R-02 | Legacy platform stability during migration | Technical | Low | Critical | 🔴 High | Open | Payments Team |
| R-03 | PCI-DSS 4.0 compliance gap — tokenisation | Compliance | High | Critical | 🔴 Critical | In Progress | Security Team |
| R-04 | Message bus PoC underperformance | Technical | Medium | High | 🔴 High | Open | Integration Team |
| R-05 | Key person dependency — Kafka expertise | People | High | Medium | 🟡 Medium | Open | PMO |
| R-06 | EU regulatory change (PSD3 timeline slip) | Regulatory | Low | Medium | 🟢 Low | Monitoring | EA Team |
| R-07 | Budget overrun on cloud infra | Financial | Medium | Medium | 🟡 Medium | Open | PMO |

---

## R-01 — API Gateway PoC Delayed

**Probability:** Medium | **Impact:** High | **Severity:** 🔴 High  
**Status:** Open | **Owner:** Platform Team | **Raised:** 2025-11-15

**Description:**  
The API Gateway proof-of-concept was due 2026-01-31 but has slipped. AD-01 (API Gateway vendor selection) remains unresolved, which is blocking architecture design for the API platform (WP-03) and Technology Architecture (D1).

**Mitigation:**  
- Assign dedicated 2-engineer team to PoC from 2026-02-01
- Reduce PoC scope to 3 core evaluation criteria: PCI compliance, multi-region routing, Kubernetes integration
- Target PoC completion: 2026-03-01

**Mitigation status:** 🟡 In Progress  
**Related:** [[X1_ADR_Decision_Log#AD-01]], [[F1_Architecture_Roadmap#WP-03]]

---

## R-02 — Legacy Platform Stability During Migration

**Probability:** Low | **Impact:** Critical | **Severity:** 🔴 High  
**Status:** Open | **Owner:** Payments Team | **Raised:** 2025-12-10

**Description:**  
The legacy monolith is processing €2.8B/month in live transactions. Any instability during the parallel-run migration window could result in payment failures, merchant contractual penalties, and regulatory scrutiny.

**Mitigation:**  
- Feature freeze on legacy platform from 2026-04-01
- Canary migration: route 1% of traffic to new platform by 2026-05-01
- Automated circuit breaker: revert to legacy if error rate > 0.1%
- 24/7 on-call rota during migration window

**Mitigation status:** 🟡 Planned — not yet implemented  
**Related:** [[A1_Architecture_Vision]], [[F1_Architecture_Roadmap#WP-07]]

---

## R-03 — PCI-DSS 4.0 Compliance Gap: Tokenisation

**Probability:** High | **Impact:** Critical | **Severity:** 🔴 Critical  
**Status:** In Progress | **Owner:** Security Team | **Raised:** 2026-01-08

**Description:**  
Gap analysis against PCI-DSS 4.0 identified that the current tokenisation approach does not meet the new requirement 3.5.1 (cryptographic key management). A certified HSM-based tokenisation service must be implemented before the June 2026 compliance deadline. Failure to comply blocks QSA certification and could result in card scheme fines up to €50,000/month.

**Mitigation:**  
- Evaluate Thales/Futurex HSM vs cloud-native tokenisation (AWS Payment Cryptography)
- Appoint QSA for quarterly review from 2026-03-01
- Implement tokenisation service by 2026-05-01 (6 weeks before deadline)

**Mitigation status:** 🟡 In Progress — vendor evaluation ongoing  
**Target date:** 2026-05-01  
**Related:** [[R1_Architecture_Requirements#NFR-05]], [[A1_Architecture_Vision#BD-02]]

---

## R-04 — Message Bus PoC Underperformance

**Probability:** Medium | **Impact:** High | **Severity:** 🔴 High  
**Status:** Open | **Owner:** Integration Team | **Raised:** 2026-01-20

**Description:**  
Initial Kafka PoC on shared cluster showed P99 latency of 180ms at 30,000 events/second — below the 50,000 TPS target. Dedicated cluster and tuning may resolve this, but adds timeline risk to AD-02 decision.

**Mitigation:**  
- Dedicated MSK cluster with provisioned IOPS
- Benchmark with tuned producer/consumer configs
- Evaluate Pulsar as fallback if Kafka cannot meet SLA

**Mitigation status:** 🟡 In Progress  
**Related:** [[X1_ADR_Decision_Log#AD-02]]

---

## R-05 — Key Person Dependency: Kafka Expertise

**Probability:** High | **Impact:** Medium | **Severity:** 🟡 Medium  
**Status:** Open | **Owner:** PMO | **Raised:** 2026-01-25

**Description:**  
Only one engineer (Elena Marchetti) has deep Kafka operational experience. If she leaves or is unavailable during the critical migration window, the team will lack capacity to operate and troubleshoot the message bus.

**Mitigation:**  
- Pair-programming plan: 2 engineers shadow Elena from 2026-02-01
- Engage Confluent professional services for knowledge transfer (2 days)
- Documented runbooks for all Kafka operations

**Mitigation status:** 🟠 Not started

---

## R-06 — EU Regulatory Change (PSD3 Timeline Slip)

**Probability:** Low | **Impact:** Medium | **Severity:** 🟢 Low  
**Status:** Monitoring | **Owner:** EA Team  

**Description:**  
PSD3 implementation timelines have slipped by 12 months in the EU legislative process. If requirements change before our architecture is finalised, Open Banking integration design may need rework.

**Mitigation:** Monitor EBA publications quarterly. Architecture designed for extensibility.

---

## R-07 — Budget Overrun on Cloud Infrastructure

**Probability:** Medium | **Impact:** Medium | **Severity:** 🟡 Medium  
**Status:** Open | **Owner:** PMO | **Raised:** 2026-02-05

**Description:**  
Current cloud cost modelling shows €98,000/month at projected load — 9% above the €90,000 target. Committed savings plans and reserved instances not yet purchased.

**Mitigation:**  
- Purchase 1-year reserved instances for stable workloads by 2026-03-01
- Review over-provisioned development environments
- Monthly FinOps review from 2026-03-01
