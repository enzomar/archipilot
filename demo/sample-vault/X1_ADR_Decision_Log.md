---
id: X1
title: Architecture Decision Log
status: active
owner: EA Team
version: 2.1.0
last_modified: 2026-02-18
artifact_type: log
togaf_phase: Cross
---

# X1 — Architecture Decision Log

## Decision Summary

| ID | Title | Status | Date | Impact |
|----|-------|--------|------|--------|
| AD-01 | API Gateway vendor selection | 🔴 Open | 2025-11-10 | High |
| AD-02 | Message bus technology | 🔴 Open | 2025-12-01 | High |
| AD-03 | Multi-cloud vs AWS-primary strategy | 🟡 In Analysis | 2026-01-05 | High |
| AD-04 | Database for payment events | ✅ Decided | 2026-01-15 | Medium |
| AD-05 | Fraud model serving infrastructure | ✅ Decided | 2026-02-01 | Medium |

---

## AD-01 — API Gateway Vendor Selection

**Status:** 🔴 Open  
**Date raised:** 2025-11-10  
**Target date:** 2026-01-31 *(overdue)*  
**Raised by:** V. Marafioti  
**Impact:** Blocking D1 (Technology Architecture) and WP-03 (API Platform)

**Context:**  
All external merchant and partner integrations will route through an API Gateway. The gateway must enforce PCI-DSS controls (mTLS, rate limiting, payload inspection), support multi-region routing, and integrate with our OAuth2/OIDC identity provider. Team lacks deep expertise in enterprise API management.

**Options considered:**

| Option | Pros | Cons |
|--------|------|------|
| Kong Gateway (OSS) | Flexible, Kubernetes-native, strong plugin ecosystem | Requires significant operational knowledge; professional support costly |
| AWS API Gateway | Fully managed, low ops burden, native AWS integration | Vendor lock-in; limited multi-cloud; PCI controls require additional config |
| Azure APIM | Strong enterprise feature set, good PCI policy templates | Azure-first; adds Azure dependency; higher cost |
| Gravitee | Open source, good compliance features, EU-based vendor | Smaller community; less mature Kubernetes integration |

**Decision:** *Pending*  
**Rationale:** *To be completed after security review and PoC results*

**Related:** [[A1_Architecture_Vision#CON-02]], [[X2_Risk_Issue_Register#R-01]], [[X3_Open_Questions#Q-01]]

---

## AD-02 — Message Bus Technology

**Status:** 🔴 Open  
**Date raised:** 2025-12-01  
**Target date:** 2026-02-15 *(overdue)*  
**Raised by:** Integration Team  
**Impact:** Blocking C1 (Application Architecture) event-driven design

**Context:**  
The event-driven architecture requires a reliable, high-throughput message bus for payment events, fraud signals, and reconciliation streams. Must support at-least-once delivery, consumer groups, and replay. Expected peak: 50,000 events/second.

**Options considered:**

| Option | Pros | Cons |
|--------|------|------|
| Apache Kafka (MSK) | Industry standard, excellent throughput, rich ecosystem | Operational complexity; team learning curve |
| Apache Pulsar | Better multi-tenancy, built-in Geo-replication | Smaller community; less tooling |
| RabbitMQ | Simple, well-understood by team | Not designed for high-throughput streaming; limited replay |
| AWS EventBridge | Serverless, low ops | Limited throughput; vendor lock-in; cost at scale |

**Decision:** *Pending*  
**Rationale:** *PoC under way — results expected 2026-02-28*

**Related:** [[C1_Application_Architecture]], [[X2_Risk_Issue_Register#R-04]]

---

## AD-03 — Multi-Cloud vs AWS-Primary Strategy

**Status:** 🟡 In Analysis  
**Date raised:** 2026-01-05  
**Target date:** 2026-03-01  
**Raised by:** CTO (Marco Bianchi)  
**Impact:** Shapes D1 (Technology Architecture), CON-02 compliance

**Context:**  
Board mandate (CON-02) requires avoiding single-cloud vendor lock-in. Current plan is AWS primary with Azure DR. This decision formalises the operating model — active-active multi-cloud adds cost and complexity but eliminates lock-in risk.

**Options considered:**

| Option | Pros | Cons |
|--------|------|------|
| AWS primary + Azure DR (active-passive) | Simpler ops, lower cost, satisfies board mandate | Failover not tested at scale; 30-60 min RTO |
| Active-active multi-cloud | True resilience, zero lock-in | 40% higher complexity; 25% cost increase; team skill gap |
| AWS only | Lowest ops burden | Violates CON-02 board mandate |

**Decision:** *In Analysis — awaiting cost modelling from Platform Team*  

---

## AD-04 — Database for Payment Events

**Status:** ✅ Decided  
**Date decided:** 2026-01-15  
**Decided by:** V. Marafioti + Marco Bianchi

**Decision:** **Apache Cassandra (AWS Keyspaces)** for payment event storage; **PostgreSQL (AWS RDS)** for transactional/relational data (merchant accounts, configs, reconciliation).

**Rationale:** Cassandra provides the write-throughput and linear scalability needed for event storage (target: 10B events/year). PostgreSQL handles the relational model without introducing a new technology. AWS managed services reduce operational overhead.

---

## AD-05 — Fraud Model Serving Infrastructure

**Status:** ✅ Decided  
**Date decided:** 2026-02-01  
**Decided by:** V. Marafioti + Data Science Lead

**Decision:** **AWS SageMaker** for model training and A/B testing; **custom FastAPI inference service** (containerised) for inline scoring to meet the < 200ms SLA. SageMaker endpoints introduce too much cold-start latency for synchronous payment flows.

**Rationale:** P99 latency tests showed SageMaker endpoint at 340ms — exceeds the 200ms requirement. FastAPI container in the same Kubernetes cluster achieves P99 < 85ms.
