import type { TemplateBuilder } from './types.js';

export const buildX2RiskIssueRegister: TemplateBuilder = (d, _projectName, yaml) => ({
  name: 'X2_Risk_Issue_Register.md',
  content: `${yaml({
    type: 'risk-issue-register',
    togaf_phase: 'cross-phase',
    artifact_type: 'catalog',
    version: '0.1.0',
    status: 'draft',
    created: d,
    last_modified: d,
    owner: 'TBD',
  })}

# Risk & Issue Register

> Cross-Phase — Architectural risks, issues, and mitigations.

## Risks

| ID | Risk | Probability | Impact | Severity | Mitigation | Owner | Status |
|----|------|-------------|--------|----------|------------|-------|--------|
| R-01 | | H/M/L | H/M/L | | | | Open |
| | | | | | | | |

## Probability / Impact Legend
- **H (High)** — Likely to occur / Severe impact on architecture, timeline, or budget
- **M (Medium)** — Possible / Moderate impact, manageable with mitigation
- **L (Low)** — Unlikely / Minor impact, acceptable risk

## Severity Matrix

| | **Impact H** | **Impact M** | **Impact L** |
|---|---|---|---|
| **Prob. H** | Critical | High | Medium |
| **Prob. M** | High | Medium | Low |
| **Prob. L** | Medium | Low | Low |

## Status Legend
- **Open** — Identified, not yet mitigated
- **Mitigating** — Mitigation actions in progress
- **Accepted** — Risk acknowledged, no further action planned
- **Closed** — Risk resolved or no longer applicable

## Issues

| ID | Issue | Impact | Resolution | Owner | Status | Raised |
|----|-------|--------|------------|-------|--------|--------|
| I-01 | | | | | Open | ${d} |

## Constraints

| ID | Constraint | Source | Impact on Architecture |
|----|-----------|--------|----------------------|
| C-01 | | | |
`,
});
