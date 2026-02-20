import type { TemplateBuilder } from './types.js';

export const buildX6TechnicalDebtLog: TemplateBuilder = (d, _projectName, yaml) => ({
  name: 'X6_Technical_Debt_Log.md',
  content: `${yaml({
    type: 'technical-debt-log',
    togaf_phase: 'cross-phase',
    artifact_type: 'catalog',
    version: '0.1.0',
    status: 'draft',
    created: d,
    last_modified: d,
    owner: 'TBD',
  })}

# Technical Debt Log

> Cross-Phase — Centralized register for tracking, prioritising, and resolving technical debt.

## Debt Register

| ID | Title | Description | Family | Criticality | T-Shirt | Application | Related Risk | Related Question | ADM Phase | Owner | Target Resolution | Status |
|----|-------|-------------|--------|-------------|---------|-------------|-------------|------------------|-----------|-------|-------------------|--------|
| TD-01 | | | Corporate / Application / Component | Breaker / Blocker / Builder | XS / S / M / L / XL | APP-xx (see C3) | R-xx (see X2) | Q-xx (see X3) | | TBD | Qn YYYY | Open |
| | | | | | | | | | | | | |

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

## Resolution Plan Template

### TD-xx — (Title)

| Field | Value |
|-------|-------|
| Status | Open |
| Raised | ${d} |
| Owner | TBD |
| Family | Corporate / Application / Component |
| Criticality | Breaker / Blocker / Builder |
| T-Shirt | XS / S / M / L / XL |
| Target Resolution | Qn YYYY |
| Estimated Effort | — |
| Related Application | APP-xx → [[C3_Application_Portfolio_Catalog]] |
| Related Risk | R-xx → [[X2_Risk_Issue_Register]] |
| Related Question | Q-xx → [[X3_Open_Questions]] |
| Related Decision | AD-xx → [[X1_ADR_Decision_Log]] |

#### Context

(What is the debt and why was it incurred?)

#### Impact

(What happens if this is not resolved? Cost of delay.)

#### Remediation Steps

1. …
2. …
3. …

## How to Use

1. When logging a new debt item, fill in the **Debt Register** table and link it to the relevant **application** (C3), **risk** (X2), or **open question** (X3).
2. Use \`@architect /analyze\` to surface potential debt from code patterns (TODO/FIXME/HACK comments, deprecated dependencies).
3. Review this log at each **gate review** (G1) and during **change management** (H1).
4. When a debt is resolved, update its status and record the decision in [[X1_ADR_Decision_Log]] if applicable.
`,
});
