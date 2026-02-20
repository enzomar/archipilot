---
type: data-architecture
togaf_phase: C
artifact_type: deliverable
version: 0.1.0
status: draft
created: <% tp.date.now("YYYY-MM-DD") %>
last_modified: <% tp.date.now("YYYY-MM-DD") %>
owner: TBD
reviewers: []
---

# Data Architecture

> Phase C — Data entities, flows, governance, and quality.

## Data Entity Catalog

| Entity | Classification | Owner | Storage | Retention |
|--------|---------------|-------|---------|-----------|
| | PII / Internal / Public | | | |

## Classification Legend
- **PII** — Personally Identifiable Information (subject to GDPR / privacy regulations)
- **Confidential** — Internal-only, restricted access, business-sensitive
- **Internal** — General internal use, no regulatory constraints
- **Public** — Openly available, no access restrictions

## Data Flow Diagram

```mermaid
graph LR
  Source[Data Source] -->|Extract| Processing[Processing] -->|Load| Target[Data Store]
```

## Data Governance

| Policy | Description | Status |
|--------|-------------|--------|
| Data Residency | | TBD |
| Encryption at Rest | | TBD |
| Encryption in Transit | | TBD |
| Retention | | TBD |
| PII Handling | | TBD |

## Data Quality Rules

- 
