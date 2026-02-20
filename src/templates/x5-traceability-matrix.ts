import type { TemplateBuilder } from './types.js';

export const buildX5TraceabilityMatrix: TemplateBuilder = (d, _projectName, yaml) => ({
  name: 'X5_Traceability_Matrix.md',
  content: `${yaml({
    type: 'traceability-matrix',
    togaf_phase: 'cross-phase',
    artifact_type: 'matrix',
    version: '0.1.0',
    status: 'draft',
    created: d,
    last_modified: d,
    owner: 'TBD',
  })}

# Traceability Matrix

> Cross-phase — End-to-end traceability from business drivers through to implementation.

## Business Driver → Requirement → Architecture → Decision

| Driver | Requirement | Architecture Component | Decision | Building Block | Status |
|--------|-------------|----------------------|----------|---------------|--------|
| | FR-01 | | AD-01 | | |
| | FR-02 | | | | |

## Requirement → Component → Test → Risk

| Requirement ID | Component | Test / Validation | Risk ID | Gap |
|---------------|-----------|-------------------|---------|-----|
| FR-01 | | | | |
| FR-02 | | | | |
| NFR-01 | | | R-04 | |
| NFR-03 | | | R-02 | |

## Principle → Decision → Artifact

| Principle | Decisions Aligned | Artifacts Affected |
|-----------|------------------|--------------------|
| Technology Independence | AD-02 | D2, E1 |
| Security by Design | | D1, C2, G1 |
| Data is an Asset | | C2, R1 |

## How to Use

1. When adding a **requirement** (R1), trace it back to a business driver and forward to a component.
2. When making a **decision** (X1), trace it to the requirements and principles it satisfies.
3. When identifying a **risk** (X2), link it to the requirements and components it threatens.
4. Review this matrix at each **gate review** (G1) to ensure completeness.
5. Use \`@architect /analyze\` to check traceability gaps.
`,
});
