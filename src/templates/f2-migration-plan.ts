import type { TemplateBuilder } from './types.js';

export const buildF2MigrationPlan: TemplateBuilder = (d, _projectName, yaml) => ({
  name: 'F2_Migration_Plan.md',
  content: `${yaml({
    type: 'migration-plan',
    togaf_phase: 'F',
    artifact_type: 'deliverable',
    version: '0.1.0',
    status: 'draft',
    created: d,
    last_modified: d,
    owner: 'TBD',
  })}

# Migration Plan

> Phase F — Transition from Baseline to Target Architecture.

## Transition Architecture States

| State | Description | Entry Criteria | Exit Criteria |
|-------|-------------|----------------|---------------|
| Baseline | Current state | — | Phase 1 approved |
| Transition 1 | | | |
| Target | Final state | | All phases delivered |

## Migration Strategy

(Big bang / Phased / Parallel run / Strangler fig)

## Rollback Plan

| Phase | Rollback Trigger | Rollback Steps | RTO |
|-------|-----------------|----------------|-----|
| | | | |

## Data Migration

| Data Set | Volume | Method | Validation | Cutover Window |
|----------|--------|--------|------------|---------------|
| | | | | |
`,
});
