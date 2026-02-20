import type { TemplateBuilder } from './types.js';

export const buildR1ArchitectureRequirements: TemplateBuilder = (d, _projectName, yaml) => ({
  name: 'R1_Architecture_Requirements.md',
  content: `${yaml({
    type: 'architecture-requirements',
    togaf_phase: 'requirements-management',
    artifact_type: 'deliverable',
    version: '0.1.0',
    status: 'draft',
    created: d,
    last_modified: d,
    owner: 'TBD',
    reviewers: [],
  })}

# Architecture Requirements Specification

> Requirements Management — Cross-phase requirements traceability.

## Functional Requirements

| ID | Requirement | Priority | Source | Phase | Status |
|----|-------------|----------|--------|-------|--------|
| FR-01 | | Must/Should/Could | | | Open |
| | | | | | |

## Priority Legend (MoSCoW)
- **Must** — Non-negotiable; system is unacceptable without it
- **Should** — Important but not critical; workaround exists
- **Could** — Desirable; include if time/budget permits
- **Won't** — Explicitly excluded from current scope (may revisit later)

## Non-Functional Requirements

| ID | Category | Requirement | Target | Measure | Status |
|----|----------|-------------|--------|---------|--------|
| NFR-01 | Performance | | | | Open |
| NFR-02 | Availability | | | | Open |
| NFR-03 | Security | | | | Open |
| NFR-04 | Scalability | | | | Open |
| NFR-05 | Observability | | | | Open |

## NFR Category Legend
- **Performance** — Response time, throughput, latency targets
- **Availability** — Uptime SLA, failover, disaster recovery
- **Security** — Authentication, authorisation, encryption, compliance
- **Scalability** — Horizontal/vertical scaling, elasticity
- **Observability** — Logging, metrics, tracing, alerting
- **Maintainability** — Code quality, testability, deployment frequency
- **Portability** — Multi-cloud, container, platform independence

## Status Legend
- **Open** — Requirement identified, not yet validated
- **Validated** — Confirmed with stakeholders
- **Implemented** — Delivered and verified
- **Deferred** — Postponed to a later phase

## Constraints

| ID | Constraint | Source | Impact |
|----|-----------|--------|--------|
| CON-01 | | | |

## Assumptions

| ID | Assumption | Risk if Wrong | Validated |
|----|-----------|---------------|-----------|
| ASM-01 | | | ⬜ |
`,
});
