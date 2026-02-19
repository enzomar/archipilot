---
id: R1
title: Architecture Requirements
status: review
owner: BA Team
version: 1.3.0
last_modified: 2026-02-12
artifact_type: deliverable
togaf_phase: Requirements Management
---

# R1 — Architecture Requirements

## Functional Requirements

| ID | Requirement | Priority | Source | Status | Owner |
|----|-------------|----------|--------|--------|-------|
| FR-01 | System shall process card payments (Visa, Mastercard, Amex) via certified card scheme adapters | Must | BD-01 | ✅ Accepted | Payments Lead |
| FR-02 | System shall support SEPA Credit Transfer and SEPA Direct Debit | Must | BD-05 | ✅ Accepted | Payments Lead |
| FR-03 | System shall expose REST and gRPC APIs for merchant integration | Must | BD-06 | ✅ Accepted | Integration Team |
| FR-04 | System shall perform real-time fraud scoring inline during payment authorisation | Must | BD-03 | 🔵 In Progress | Data Science |
| FR-05 | System shall support Open Banking (PSD2) payment initiation flows | Should | BD-05 | 🟡 Draft | Integration Team |
| FR-06 | Merchants shall be able to manage API keys, webhooks, and settings via self-service portal | Should | Sofia Russo | 🟡 Draft | TBD |
| FR-07 | System shall generate daily reconciliation reports compatible with SAP S/4HANA import formats | Must | Finance Team | ✅ Accepted | Finance Team |
| FR-08 | System shall support multi-currency settlement in EUR, GBP, PLN, CZK, HUF, RON | Should | BD-05 | 🟡 Draft | TBD |

---

## Non-Functional Requirements

| ID | Requirement | Metric | Priority | Status | Owner |
|----|-------------|--------|----------|--------|-------|
| NFR-01 | Payment authorisation latency | P95 < 300ms, P99 < 500ms end-to-end | Must | 🔵 In Progress | Platform Team |
| NFR-02 | Fraud detection latency | P99 < 200ms inline (synchronous) | Must | 🔵 In Progress | Data Science |
| NFR-03 | System availability | 99.99% (< 52 min/year downtime) | Must | 🟡 Draft | Platform Team |
| NFR-04 | Peak throughput | 10,000 TPS sustained, 15,000 TPS burst (5 min) | Must | 🟡 Draft | Platform Team |
| NFR-05 | PCI-DSS 4.0 compliance | Full certification by June 2026 | Must | 🔴 At risk | Security Team |
| NFR-06 | Data residency | All cardholder data stored in EU (GDPR + PCI) | Must | ✅ Accepted | Security Team |
| NFR-07 | Disaster recovery | RTO < 15 min, RPO < 1 min for payment data | Must | 🟡 Draft | Platform Team |
| NFR-08 | Infrastructure cost | < €90,000/month at projected load | Should | 🟡 Draft | PMO |
| NFR-09 | API backwards compatibility | 12-month deprecation notice for breaking changes | Should | 🟡 Draft | Integration Team |

---

## Compliance Requirements

| ID | Requirement | Standard | Deadline | Status |
|----|-------------|----------|----------|--------|
| COMP-01 | Tokenise all PANs at point of entry | PCI-DSS 4.0 req 3.5 | June 2026 | 🔴 In Progress |
| COMP-02 | Encrypt all cardholder data in transit (TLS 1.2+) | PCI-DSS 4.0 req 4.2 | June 2026 | ✅ Met |
| COMP-03 | Implement WAF and DDoS protection on all payment endpoints | PCI-DSS 4.0 req 6.4 | June 2026 | 🟡 Planned |
| COMP-04 | MFA for all admin access to cardholder data systems | PCI-DSS 4.0 req 8.4 | June 2026 | 🟡 Planned |
| COMP-05 | GDPR right to erasure — PAN deletion on request within 30 days | GDPR Art. 17 | Ongoing | 🟡 Planned |
| COMP-06 | Strong customer authentication (SCA) for all EU transactions | PSD2 | Ongoing | ✅ Met |

---

## Traceability Matrix

| Requirement | Business Driver | Architecture Decision | Risk |
|-------------|----------------|----------------------|------|
| FR-04 (Real-time fraud) | BD-03 | AD-05 (resolved) | R-04 |
| NFR-02 (Fraud latency) | BD-03 | AD-05 (resolved) | — |
| NFR-05 (PCI compliance) | BD-02 | AD-01 (open) | R-03 |
| FR-03 (REST/gRPC APIs) | BD-06 | AD-01 (open) | R-01 |
| NFR-01 (Payment latency) | BD-01 | AD-02 (open) | R-04 |
