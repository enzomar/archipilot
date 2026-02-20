import type { TemplateBuilder } from './types.js';

export const buildG1ComplianceAssessment: TemplateBuilder = (d, _projectName, yaml) => ({
  name: 'G1_Compliance_Assessment.md',
  content: `${yaml({
    type: 'compliance-assessment',
    togaf_phase: 'G',
    artifact_type: 'deliverable',
    version: '0.1.0',
    status: 'draft',
    created: d,
    last_modified: d,
    owner: 'TBD',
  })}

# Implementation Governance & Compliance

> Phase G — Ensuring implementation conforms to architecture.

## Compliance Checklist

| # | Criterion | Status | Evidence | Reviewer |
|---|----------|--------|----------|----------|
| 1 | Follows Architecture Principles | ⬜ | | |
| 2 | Security controls implemented | ⬜ | | |
| 3 | Data governance applied | ⬜ | | |
| 4 | Integration standards followed | ⬜ | | |
| 5 | Performance requirements met | ⬜ | | |
| 6 | Observability configured | ⬜ | | |
| 7 | Disaster recovery tested | ⬜ | | |

## Architecture Deviation Requests

| ID | Description | Impact | Status | Approved By |
|----|-------------|--------|--------|-------------|
| | | | | |

## Gate Reviews

| Gate | Phase | Date | Outcome | Notes |
|------|-------|------|---------|-------|
| G1 | Foundation | TBD | Pending | |
| G2 | Pilot | TBD | Pending | |
| G3 | Production | TBD | Pending | |

## Outcome Legend
- **Passed** — All criteria met; approved to proceed
- **Conditional** — Approved with agreed remediation actions
- **Failed** — Criteria not met; rework required before re-assessment
- **Pending** — Not yet assessed
`,
});
