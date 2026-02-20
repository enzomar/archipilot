---
id: X3
title: Open Questions
status: active
owner: EA Team
version: 1.2.0
last_modified: 2026-02-18
artifact_type: log
togaf_phase: Cross
---

# X3 — Open Questions

| ID | Question | Category | Priority | Owner | Target Date | Status |
|----|----------|----------|----------|-------|-------------|--------|
| Q-01 | Should the API Gateway enforce PCI payload inspection or delegate to the payment service? | Architecture | High | V. Marafioti | 2026-02-28 | Open |
| Q-02 | Co-locate Fraud Detection Service with Payment Processing, or separate Kubernetes namespace? | Architecture | High | Integration Team | 2026-02-28 | Open |
| Q-03 | Active-active multi-cloud or AWS-primary with Azure DR? | Strategy | High | CTO | 2026-03-01 | In Analysis |
| Q-04 | Should Keycloak be self-managed or use a managed OIDC provider (e.g. Auth0, AWS Cognito)? | Architecture | Medium | Security Team | 2026-03-15 | Open |
| Q-05 | What is the data retention policy for payment events in Cassandra? Regulatory minimum vs cost | Data | Medium | Compliance | 2026-03-15 | Open |
| Q-06 | Will the SAP Connector need to support real-time event subscription, or is batch sync sufficient? | Integration | Medium | Finance Team | 2026-03-30 | Open |

## Category Legend
- **Strategic** — High-level direction, business alignment
- **Governance** — Process, review cadence, decision authority
- **Data** — Data models, ownership, quality, residency
- **Technology** — Platform, tooling, infrastructure choices
- **Security** — Authentication, authorisation, encryption, compliance
- **Integration** — APIs, protocols, external system dependencies
- **Financial** — Budget, licensing, cost models
- **Regulatory** — Legal, compliance, audit requirements

## Status Legend
- **Open** — Awaiting answer
- **In Discussion** — Being actively investigated
- **Answered** — Resolved; answer recorded
- **Deferred** — Postponed to a later phase

---

## Q-01 — PCI Payload Inspection: Gateway or Service?

**Priority:** High | **Owner:** V. Marafioti | **Target:** 2026-02-28

**Question:** Should PCI-DSS payload inspection (PAN detection, header sanitisation, rate limiting per merchant) be enforced at the API Gateway level, or should the Payment Processing Service own this responsibility?

**Context:**
- Centralising at Gateway simplifies service development and provides consistent enforcement
- Delegating to the service allows tighter coupling to business rules and avoids gateway complexity
- R-03 (PCI-DSS gap) needs to be resolved before this question can be finalised

**Options:**
1. Gateway enforces all PCI controls (preferred by Security Team)
2. Gateway enforces network controls; service enforces data-level PCI controls (hybrid)
3. Service owns all PCI controls; gateway is dumb proxy

**Related:** [[C1_Application_Architecture#Dependencies]], [[X2_Risk_Issue_Register#R-03]]

---

## Q-02 — Fraud Detection Service Deployment Topology

**Priority:** High | **Owner:** Integration Team | **Target:** 2026-02-28

**Question:** Should the Fraud Detection Service run in the same Kubernetes namespace as the Payment Processing Service (minimising network latency) or in a separate namespace with network policies (following least-privilege principles)?

**Context:**
- Co-location achieves < 5ms inter-service latency (critical for 200ms SLA)
- Separation is cleaner from a security / blast-radius perspective
- Current P99 budget allocation: FDS < 85ms, leaving 115ms for network + Payment Processing

**Options:**
1. Same namespace — lower latency, less network policy complexity
2. Separate namespace — better isolation, requires careful latency budgeting

**Related:** [[C1_Application_Architecture#NEW-03]], [[R1_Architecture_Requirements#NFR-01]]

---

## Q-03 — Multi-Cloud Strategy

**Priority:** High | **Owner:** CTO (Marco Bianchi) | **Target:** 2026-03-01 | **Status:** In Analysis

**Question:** Active-active multi-cloud (AWS + Azure) vs AWS-primary with Azure as passive DR?

**Context:** See [[X1_ADR_Decision_Log#AD-03]]

---

## Q-04 — Keycloak: Self-Managed or Managed OIDC?

**Priority:** Medium | **Owner:** Security Team | **Target:** 2026-03-15

**Question:** Should we self-manage Keycloak on Kubernetes, or use a managed identity provider (Auth0, AWS Cognito, Azure AD B2C)?

**Options:**
1. Self-managed Keycloak — full control, no vendor lock-in, operational burden
2. Auth0 — managed, strong enterprise features, per-MAU pricing
3. AWS Cognito — AWS-native, low cost at low MAU scale, limited customisation
4. Azure AD B2C — strong enterprise integration, Azure dependency

**Related:** [[C1_Application_Architecture#NEW-08]], [[X1_ADR_Decision_Log#AD-03]]

---

## Q-05 — Cassandra Event Retention Policy

**Priority:** Medium | **Owner:** Compliance | **Target:** 2026-03-15

**Question:** Payment events must be retained for regulatory purposes. PCI-DSS requires 12 months online + 12 months archived. GDPR requires deletion upon request. What is the operational retention policy in Cassandra?

**Impact:** Directly affects Cassandra cluster sizing and cost.

---

## Q-06 — SAP Integration: Real-Time or Batch?

**Priority:** Medium | **Owner:** Finance Team | **Target:** 2026-03-30

**Question:** Finance currently runs nightly batch reconciliation via SAP Connector. With the new event-driven architecture, should we offer real-time settlement event subscription to SAP?

**Trade-off:** Real-time reduces reporting lag but requires event schema contract with Finance and SAP configuration changes.
