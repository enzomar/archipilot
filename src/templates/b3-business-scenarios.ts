import type { TemplateBuilder } from './types.js';

export const buildB3BusinessScenarios: TemplateBuilder = (d, _projectName, yaml) => ({
  name: 'B3_Business_Scenarios.md',
  content: `${yaml({
    type: 'business-scenarios',
    togaf_phase: 'B',
    artifact_type: 'deliverable',
    version: '0.1.0',
    status: 'draft',
    created: d,
    last_modified: d,
    owner: 'TBD',
  })}

# Business Scenarios

> Phase B — Architecturally significant business scenarios.

## Scenario 1 — (Name)

| Field | Value |
|-------|-------|
| Trigger | |
| Actor(s) | |
| Pre-conditions | |
| Post-conditions | |

### Capabilities Required
- 

### Expected Outcome
- 

### Architecture Implications
- 

---

## Scenario 2 — (Name)

| Field | Value |
|-------|-------|
| Trigger | |
| Actor(s) | |
| Pre-conditions | |
| Post-conditions | |

### Capabilities Required
- 

### Expected Outcome
- 
`,
});
