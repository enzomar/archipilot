---
id: P1
title: Architecture Principles
status: approved
owner: EA Team
version: 1.0.0
last_modified: 2025-11-20
artifact_type: deliverable
togaf_phase: Preliminary
---

# P1 — Architecture Principles

## Principles Summary

| ID | Principle | Domain |
|----|-----------|--------|
| P-01 | API-First | Application |
| P-02 | Security by Design | Security |
| P-03 | Cloud-Native, Vendor-Agnostic | Technology |
| P-04 | Event-Driven by Default | Application |
| P-05 | Data Residency in EU | Data |
| P-06 | Observability as a Standard | Technology |
| P-07 | Automate Everything | Delivery |
| P-08 | Fail Safe, Not Fail Silent | Application |

---

## P-01 — API-First

**Statement:** All capabilities are exposed as well-documented APIs before building UIs or integrations.

**Rationale:** Enables reuse, parallel development, and merchant self-service integration without depending on UI availability.

**Implications:**
- Every service exposes an OpenAPI or Protobuf spec
- APIs are versioned from day one
- No internal backdoor direct DB access between services

**Related:** [[R1_Architecture_Requirements#FR-03]], [[X1_ADR_Decision_Log#AD-01]]

---

## P-02 — Security by Design

**Statement:** Security controls are built into every component from inception, not added as an afterthought.

**Rationale:** PCI-DSS 4.0 and regulatory obligations require security to be embedded in architecture, not bolted on post-delivery.

**Implications:**
- Threat modelling is mandatory before design sign-off
- mTLS between all internal services
- Secrets management via HashiCorp Vault or AWS Secrets Manager — no hardcoded credentials

**Related:** [[X2_Risk_Issue_Register#R-03]], [[R1_Architecture_Requirements#COMP-01]]

---

## P-03 — Cloud-Native, Vendor-Agnostic

**Statement:** Architecture avoids proprietary cloud services where a portable alternative exists at comparable cost and complexity.

**Rationale:** Board mandate (CON-02) requires resilience against vendor changes. Avoids lock-in that would compromise future negotiating position.

**Implications:**
- Prefer Kubernetes-native workloads over cloud-proprietary compute
- Prefer open standards (OpenTelemetry, CloudEvents, OpenAPI) over vendor SDKs
- Evaluate vendor-managed services (e.g. RDS, Keyspaces) case-by-case against the portability trade-off

**Related:** [[A1_Architecture_Vision#CON-02]], [[X1_ADR_Decision_Log#AD-03]]

---

## P-04 — Event-Driven by Default

**Statement:** Service communication uses asynchronous events via the message bus as the default. Synchronous calls are used only where low latency is a hard requirement.

**Rationale:** Decoupling services via events improves resilience, enables replay and audit, and allows independent scaling.

**Implications:**
- All state changes publish a domain event
- Consumers are idempotent
- Synchronous gRPC reserved for payment authorisation path only

**Related:** [[C1_Application_Architecture]], [[X1_ADR_Decision_Log#AD-02]]

---

## P-05 — Data Residency in EU

**Statement:** All cardholder data, PII, and payment transaction data is stored and processed exclusively in EU data centres.

**Rationale:** Required by GDPR, PCI-DSS, and contractual obligations. Non-negotiable constraint.

**Implications:**
- AWS eu-west-1 (Ireland) primary, eu-central-1 (Frankfurt) DR
- No data transfer to US regions
- Third-party services must provide EU data processing agreements

**Related:** [[A1_Architecture_Vision#CON-01]], [[R1_Architecture_Requirements#NFR-06]]

---

## P-06 — Observability as a Standard

**Statement:** Every service implements distributed tracing, structured logging, and metrics from day one using OpenTelemetry.

**Rationale:** Silent failures in payment flows cause financial loss and merchant churn. Observability enables rapid diagnosis and SLA enforcement.

**Implications:**
- OpenTelemetry SDK is a mandatory dependency for all services
- Trace context is propagated across all synchronous and async boundaries
- SLO dashboards are defined before go-live

---

## P-07 — Automate Everything

**Statement:** All infrastructure, configuration, and deployment is managed as code. Manual changes to production are prohibited.

**Rationale:** Manual changes are error-prone, audit-unfriendly, and inconsistent. Automation enables reproducibility and compliance evidence.

**Implications:**
- Terraform for all infrastructure
- GitOps (ArgoCD) for Kubernetes deployments
- No `kubectl apply` or console changes in production

---

## P-08 — Fail Safe, Not Fail Silent

**Statement:** Services must handle failure explicitly — return clear error states, trigger alerts, and never silently discard transactions.

**Rationale:** A silent failure in a payment flow is worse than an explicit error. Merchants and customers must know when something has gone wrong.

**Implications:**
- Dead-letter queues on all message consumers
- Payment authorisation has a defined timeout + explicit decline response
- All unhandled errors are alerted within 60 seconds
