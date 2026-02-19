---
id: C1
title: Application Architecture
status: draft
owner: Integration Team
version: 0.8.0
last_modified: 2026-02-15
artifact_type: deliverable
togaf_phase: C
---

# C1 — Application Architecture

## Baseline (As-Is) Architecture

The current PayPath platform is a monolithic J2EE application deployed on-premises with point-to-point integrations.

### Current Application Components

| ID | Component | Technology | Role | Status |
|----|-----------|-----------|------|--------|
| APP-01 | Legacy Payment Monolith | J2EE / JBoss 6 | Core payment processing | EOL Q4 2026 |
| APP-02 | Fraud Rules Engine | Drools (on-prem) | Batch fraud scoring | To be replaced |
| APP-03 | Merchant Portal | JSF / JSP | Merchant self-service | To be replaced |
| APP-04 | Reporting Service | Crystal Reports / Oracle | Reconciliation & reporting | To be replaced |
| APP-05 | SAP Connector | SAP XI/PI | ERP integration | To be retained |
| APP-06 | Card Scheme Adapters | Custom SOAP | Visa/Mastercard connectivity | To be rebuilt |

```mermaid
flowchart LR
    MP[Merchant Portal\nJSF/JSP] --> PM[Legacy Payment Monolith\nJ2EE / JBoss]
    PM --> FRE[Fraud Rules Engine\nDrools]
    PM --> SAP[SAP Connector\nXI/PI]
    PM --> CSA[Card Scheme Adapters\nSOAP]
    PM --> RPT[Reporting Service\nCrystal Reports]
    PM --> ODB[(Oracle DB\nSingle Instance)]
    CSA --> VISA[Visa Network]
    CSA --> MC[Mastercard Network]
    SAP --> ERP[SAP S/4HANA]

    style PM fill:#ffcccc,stroke:#cc0000
    style FRE fill:#ffcccc,stroke:#cc0000
    style MP fill:#ffcccc,stroke:#cc0000
    style RPT fill:#ffcccc,stroke:#cc0000
```

---

## Target Architecture

Cloud-native, event-driven microservices on Kubernetes with centralised API gateway and message bus.

### Target Application Components

| ID | Component | Technology | Role | Migration |
|----|-----------|-----------|------|-----------|
| NEW-01 | API Gateway | TBD (see AD-01) | Single entry point for all merchant APIs | 🟢 New |
| NEW-02 | Payment Processing Service | Go / gRPC | Core transaction orchestration | 🟢 New |
| NEW-03 | Fraud Detection Service | Python / FastAPI | Real-time ML inference < 200ms | 🟢 New |
| NEW-04 | Merchant Portal (SPA) | React / TypeScript | Merchant self-service | 🟢 New |
| NEW-05 | Notification Service | Node.js | Webhooks, email, SMS | 🟢 New |
| NEW-06 | Reconciliation Service | Python | Daily settlement & reporting | 🟢 New |
| NEW-07 | Card Scheme Adapters v2 | Go | REST/ISO 20022 connectivity | 🟢 New |
| NEW-08 | Identity & Access | Keycloak (OIDC) | OAuth2, merchant auth | 🟢 New |
| RET-01 | SAP Connector | SAP PI/PO (upgraded) | ERP integration — retained | 🔵 Keep |
| DEP-01 | Legacy Payment Monolith | J2EE / JBoss | Decommission post-migration | 🔴 Remove |
| DEP-02 | Fraud Rules Engine | Drools | Replaced by NEW-03 | 🔴 Remove |
| DEP-03 | Reporting (Crystal Reports) | Crystal Reports | Replaced by NEW-06 | 🔴 Remove |

```mermaid
flowchart TB
    subgraph External["External"]
        MER[Merchants\nREST / gRPC]
        VISA[Visa Network]
        MC[Mastercard Network]
        ERP[SAP S/4HANA]
    end

    subgraph Gateway["API Layer"]
        GW[API Gateway\nAD-01 pending]
        IAM[Keycloak\nOIDC/OAuth2]
    end

    subgraph Core["Core Services"]
        PPS[Payment Processing\nService]
        FDS[Fraud Detection\nService]
        NTF[Notification\nService]
        REC[Reconciliation\nService]
    end

    subgraph MsgBus["Event Bus (AD-02 pending)"]
        MB[(Message Bus\nKafka / Pulsar)]
    end

    subgraph Adapters["Adapters"]
        CSA2[Card Scheme\nAdapters v2]
        SAPC[SAP Connector]
    end

    subgraph Data["Data"]
        PG[(PostgreSQL\nRDS)]
        CAS[(Cassandra\nAWS Keyspaces)]
    end

    MER --> GW
    GW --> IAM
    GW --> PPS
    PPS --> MB
    PPS --> FDS
    MB --> REC
    MB --> NTF
    PPS --> CSA2
    CSA2 --> VISA
    CSA2 --> MC
    SAPC --> ERP
    PPS --> PG
    MB --> CAS
```

---

## Gap Analysis

| Gap | Current State | Target State | Action |
|-----|--------------|-------------|--------|
| API layer | No API gateway — direct SOAP calls | Centralised REST/gRPC gateway | Implement NEW-01 (AD-01) |
| Fraud detection | Batch T+1 rules | Real-time ML < 200ms | Implement NEW-03 |
| Event streaming | Point-to-point sync calls | Async event bus | Implement AD-02 |
| Identity | Basic OAuth in monolith | Centralised OIDC (Keycloak) | Implement NEW-08 |
| Observability | Siloed logs, no tracing | OpenTelemetry unified | Implement per service |

---

## Dependencies

| ID | Dependency | From | To | Type |
|----|-----------|------|----|------|
| DEP-01 | API Gateway decision | NEW-01 | AD-01 | Blocked by decision |
| DEP-02 | Message bus selection | NEW-02, NEW-06 | AD-02 | Blocked by decision |
| DEP-03 | Fraud ML model | NEW-03 | Data Science team | External dependency |
| DEP-04 | PCI-DSS tokenisation | NEW-02 | R-03 mitigation | Risk dependency |
| DEP-05 | Keycloak integration | NEW-08 | IT Security (Luca De Santis) | Stakeholder approval needed |

---

## Open Architecture Questions

- [[X3_Open_Questions#Q-01]] — Should the API Gateway enforce PCI payload inspection or delegate to the payment service?
- [[X3_Open_Questions#Q-02]] — Co-locate Fraud Detection Service with Payment Processing or separate deployment?
- [[X1_ADR_Decision_Log#AD-01]] — API Gateway vendor still open
- [[X1_ADR_Decision_Log#AD-02]] — Message bus still open
