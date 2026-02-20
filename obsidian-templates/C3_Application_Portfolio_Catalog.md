---
type: application-portfolio
togaf_phase: C
artifact_type: catalog
version: 0.1.0
status: draft
created: <% tp.date.now("YYYY-MM-DD") %>
last_modified: <% tp.date.now("YYYY-MM-DD") %>
owner: TBD
---

# Application Portfolio Catalog

> Phase C — Inventory of applications and services.

| ID | Application | Description | Type | Status | Disposition | Owner | Technology |
|----|------------|-------------|------|--------|-------------|-------|------------|
| APP-01 | | Brief description of the application | Service / UI / Batch | Current / New | Retain / Replace / Retire | | |
| | | | | | | | |

## Type Legend
- **Service** — Backend microservice or API
- **UI** — User-facing frontend application
- **Batch** — Scheduled or background processing job
- **Library** — Shared code library or SDK
- **Platform** — Infrastructure or middleware service

## Status Legend
- **Current** — In production today
- **New** — To be built as part of target architecture
- **Legacy** — Outdated; scheduled for replacement or retirement

## Disposition Legend
- **Retain** — Keep as-is
- **Invest** — Enhance / modernize
- **Migrate** — Move to new platform
- **Replace** — Substitute with new solution
- **Retire** — Decommission
