---
type: governance-framework
togaf_phase: preliminary
artifact_type: deliverable
version: 0.1.0
status: draft
created: <% tp.date.now("YYYY-MM-DD") %>
last_modified: <% tp.date.now("YYYY-MM-DD") %>
owner: TBD
reviewers: []
---

# Architecture Governance Framework

> Preliminary Phase — Defines how architecture is governed.

## Architecture Board

| Role | Name | Responsibility |
|------|------|---------------|
| Chief Architect | TBD | Final architecture authority |
| Domain Architect | TBD | Domain-level decisions |
| Security Architect | TBD | Security review and approval |
| | | |

## Review Process

1. Architecture change proposed → Decision Log entry created
2. Impact analysis conducted (cross-phase)
3. Architecture Board review
4. Decision recorded with status (Proposed → Approved / Rejected)
5. Implementation governed via Compliance Assessment

## Escalation Path

- L1: Domain Architect
- L2: Architecture Board
- L3: CTO / Executive Sponsor

## Compliance Criteria

- [ ] Aligned with Architecture Principles
- [ ] Security review completed
- [ ] Data governance validated
- [ ] Integration impact assessed
- [ ] Cost/sizing estimated
