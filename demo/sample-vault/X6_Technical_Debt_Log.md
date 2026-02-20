---
id: X6
title: Technical Debt Log
status: active
owner: EA Team
version: 1.0.0
last_modified: 2026-02-18
artifact_type: catalog
togaf_phase: Cross
---

# X6 — Technical Debt Log

> Cross-Phase — Centralized register for tracking, prioritising, and resolving technical debt.

## Debt Register

| ID | Title | Description | Family | Criticality | T-Shirt | Application | Related Risk | Related Question | ADM Phase | Owner | Target Resolution | Status |
|----|-------|-------------|--------|-------------|---------|-------------|-------------|------------------|-----------|-------|-------------------|--------|
| TD-01 | Legacy SOAP adapters | Card scheme adapters use SOAP/XML with custom serialisation that is brittle and untested | Component | Blocker | S | APP-06 (Card Scheme Adapters) | R-02 | — | C | Integration Team | Q2 2026 | Open |
| TD-02 | Monolith session coupling | Payment processing logic is coupled to JBoss HTTP session state, preventing horizontal scaling | Application | Breaker | M | APP-01 (Legacy Monolith) | R-02 | — | C | Payments Team | Q3 2026 | Open |
| TD-03 | PCI-DSS tokenisation gap | Current tokenisation does not meet PCI-DSS 4.0 req 3.5.1 — HSM-based key management required | Corporate | Breaker | M | APP-01 (Legacy Monolith) | R-03 | — | C | Security Team | Q2 2026 | In Progress |
| TD-04 | No distributed tracing | Legacy platform has siloed Nagios + Splunk monitoring with no trace context propagation | Application | Builder | S | APP-01 (Legacy Monolith) | — | — | D | Platform Team | Q3 2026 | Open |
| TD-05 | Crystal Reports dependency | Reconciliation relies on Crystal Reports (EOL), blocking migration to new reporting service | Component | Blocker | XS | APP-04 (Reporting Service) | — | — | C | Finance Team | Q2 2026 | Open |
| TD-06 | Hardcoded credentials in SAP connector | SAP XI/PI connector uses hardcoded credentials instead of secrets management | Component | Builder | XS | APP-05 (SAP Connector) | — | — | D | Platform Team | Q1 2026 | Open |

## Family Legend

| Family | Scope | Examples |
|--------|-------|----------|
| **Corporate** | Root cause is beyond your software — external dependencies | Mandates, security policies, external library changes, datacenter migrations |
| **Application** | Cross-component or cross-functionality debt within the application | Changes spanning multiple components or functional areas |
| **Component** | Confined within a single class or module; minimal or no impact on other parts | Logging system replacement, CI step improvements, localised refactors |

## Criticality Legend

| Criticality | Impact | Description |
|-------------|--------|-------------|
| **Breaker** | Software will stop running very soon | Time-critical debt — e.g., obsolete dependency, terminating service. Must be handled immediately. |
| **Blocker** | Software cannot be updated | Software still runs but cannot be enhanced — e.g., unsupported library preventing upgrades. |
| **Builder** | Software can be updated very slowly | Slows productivity, reduces maintainability, or blocks new features — e.g., duplicate functions needing refactoring. |

## T-Shirt Sizing Legend

> Estimate the **cost to fix** vs the **cost to live with** the debt.

| Size | Effort Estimate |
|------|----------------|
| **XS** | < 50 person-days |
| **S** | 50 – 100 person-days |
| **M** | 100 person-days – 1 person-year |
| **L** | 1 – 5 person-years |
| **XL** | 5+ person-years |

---

## Resolution Plan: TD-03 — PCI-DSS Tokenisation Gap

| Field | Value |
|-------|-------|
| Status | In Progress |
| Raised | 2026-01-08 |
| Owner | Security Team |
| Family | Corporate |
| Criticality | Breaker |
| T-Shirt | M |
| Target Resolution | Q2 2026 |
| Estimated Effort | ~120 person-days |
| Related Application | APP-01 → [[C1_Application_Architecture]] |
| Related Risk | R-03 → [[X2_Risk_Issue_Register]] |
| Related Decision | AD-01 → [[X1_ADR_Decision_Log]] |

### Context

PCI-DSS 4.0 requirement 3.5.1 mandates HSM-based cryptographic key management for tokenisation. The current software tokenisation approach in the legacy monolith does not meet this standard. Failure to comply by June 2026 blocks QSA certification and may result in card scheme fines up to €50,000/month.

### Impact

If not resolved: loss of PCI-DSS certification, inability to process card payments, card scheme fines, and reputational damage. Estimated cost of inaction: **€600K/year** in fines alone.

### Remediation Steps

1. Evaluate Thales/Futurex HSM vs AWS Payment Cryptography (in progress)
2. Implement HSM-based tokenisation service (NEW-02 dependency)
3. Migrate all existing PANs to new token format
4. QSA assessment and certification by June 2026
