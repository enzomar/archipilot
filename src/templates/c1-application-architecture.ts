import type { TemplateBuilder } from './types.js';

export const buildC1ApplicationArchitecture: TemplateBuilder = (d, _projectName, yaml) => ({
  name: 'C1_Application_Architecture.md',
  content: `${yaml({
    type: 'application-architecture',
    togaf_phase: 'C',
    artifact_type: 'deliverable',
    version: '0.1.0',
    status: 'draft',
    created: d,
    last_modified: d,
    owner: 'TBD',
    reviewers: [],
  })}

# Application Architecture

> Phase C — Application components, interfaces, and interactions.

## Baseline Application Landscape

(Current applications and services)

## Target Application Architecture

### Logical Components

| Component | Purpose | Interfaces | Owner |
|-----------|---------|------------|-------|
| | | | |

### Interaction Diagram

\`\`\`mermaid
graph TD
  subgraph "Application Layer"
    A[Component 1]
    B[Component 2]
  end
  A -->|API| B
\`\`\`

## Gap Analysis

| Baseline | Target | Gap | Action |
|----------|--------|-----|--------|
| | | | |
`,
});
