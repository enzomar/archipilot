---
id: A1
title: Architecture Vision
status: approved
owner: Vincenzo Marafioti
version: 1.1.0
last_modified: 2026-01-20
artifact_type: deliverable
togaf_phase: A
---

# A1 — Architecture Vision

## Executive Summary

PayPath is a digital payments processing platform serving 2.3M active merchants across 12 European markets. The current monolithic platform — in production since 2011 — has reached end-of-life. This initiative delivers a cloud-native, event-driven replacement with full PCI-DSS 4.0 compliance, real-time fraud detection, and API-first integration.

**Timeline:** Feb 2026 – Q4 2026  
**Budget approved:** €4.2M  
**Sponsor:** Alessandra Ferretti (CFO) · Marco Bianchi (CTO)

---

## Business Drivers

| ID | Driver | Priority |
|----|--------|----------|
| BD-01 | Legacy platform EOL — vendor support ends Q4 2026 | Critical |
| BD-02 | PCI-DSS 4.0 compliance deadline — June 2026 | Critical |
| BD-03 | Real-time fraud detection — current rate: 2.1% fraud miss rate | High |
| BD-04 | Cost reduction — current infra costs €1.8M/year, target €1.1M/year | High |
| BD-05 | EU market expansion — 5 new markets (PT, PL, CZ, HU, RO) by 2027 | Medium |
| BD-06 | Developer experience — current API is SOAP-based, team requests REST/gRPC | Medium |

---

## Architecture Goals

| Goal | Metric | Target |
|------|--------|--------|
| Availability | Uptime | 99.99% (< 52 min/year downtime) |
| Latency | P95 payment processing | < 300ms |
| Fraud detection | Response time | < 200ms inline |
| Scalability | Peak TPS | 10,000 TPS (3x current) |
| Compliance | PCI-DSS 4.0 | Fully certified June 2026 |
| Cost | Monthly infra spend | < €90,000/month |

---

## Scope

**In scope:**
- Payment processing engine (cards, SEPA, Open Banking)
- Fraud detection service
- Merchant portal and API
- Reporting and reconciliation
- PCI-DSS compliance controls

**Out of scope:**
- Customer-facing wallet app (separate programme)
- Loyalty and rewards (separate programme)
- FX and currency conversion (Phase 2)

---

## Architecture Constraints

| ID | Constraint | Source |
|----|-----------|--------|
| CON-01 | All cardholder data must remain in EU data centres | Regulatory (GDPR + PCI-DSS) |
| CON-02 | No single cloud vendor dependency — avoid lock-in | Board mandate |
| CON-03 | Must integrate with existing ERP (SAP S/4HANA) via certified connector | Finance requirement |
| CON-04 | Existing merchant contracts cannot be disrupted during migration | Legal |
| CON-05 | Budget fixed at €4.2M — no contingency headroom approved | Finance |

---

## Baseline vs Target Summary

| Dimension | Baseline (As-Is) | Target (To-Be) |
|-----------|-----------------|----------------|
| Architecture style | Monolith (J2EE) | Microservices, event-driven |
| Deployment | On-premises data centre | Hybrid cloud (AWS primary + Azure DR) |
| Integration | SOAP/XML APIs | REST + gRPC + AsyncAPI (Kafka) |
| Fraud detection | Batch (T+1 rules engine) | Real-time ML scoring (inline, < 200ms) |
| Database | Oracle DB (single instance) | PostgreSQL (cloud-managed) + Cassandra (events) |
| Compliance | PCI-DSS 3.2.1 | PCI-DSS 4.0 |
| Monitoring | Manual, siloed | Unified observability (OpenTelemetry) |

---

## Key Stakeholders

See [[A2_Stakeholder_Map]] for the full RACI.

| Name | Role | Concern |
|------|------|---------|
| Alessandra Ferretti | CFO / Sponsor | Cost, compliance, ROI |
| Marco Bianchi | CTO / Sponsor | Technical direction, vendor choice |
| Sofia Russo | Head of Payments | Merchant continuity, feature parity |
| Luca De Santis | CISO | PCI-DSS, data residency, security |
| Marta Conti | PMO Director | Schedule, budget, dependencies |

---

## Open Decisions

| ADR | Title | Status |
|-----|-------|--------|
| [[X1_ADR_Decision_Log#AD-01]] | API Gateway vendor selection | 🔴 Open — blocking Phase D |
| [[X1_ADR_Decision_Log#AD-02]] | Message bus (Kafka vs Pulsar vs RabbitMQ) | 🔴 Open — overdue |
| [[X1_ADR_Decision_Log#AD-03]] | Multi-cloud vs AWS-primary strategy | 🟡 In Analysis |
