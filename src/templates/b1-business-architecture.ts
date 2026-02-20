import type { TemplateBuilder } from './types.js';

export const buildB1BusinessArchitecture: TemplateBuilder = (d, _projectName, yaml) => ({
  name: 'B1_Business_Architecture.md',
  content: `${yaml({
    type: 'business-architecture',
    togaf_phase: 'B',
    artifact_type: 'deliverable',
    version: '0.1.0',
    status: 'draft',
    created: d,
    last_modified: d,
    owner: 'TBD',
    reviewers: [],
  })}

# Business Architecture

> Phase B — Baseline and Target Business Architecture.

## Baseline Business Architecture

(Current business processes, functions, and organizational structure)

## Target Business Architecture

(Target-state business processes and capabilities)

## Gap Analysis

| Baseline | Target | Gap | Action |
|----------|--------|-----|--------|
| | | | |

## Business Process Map

(Key processes affected by this initiative)

## Organization Impact

(How does this change roles, teams, or organizational structure?)
`,
});
