import type { TemplateBuilder } from './types.js';

export const buildA3ValueChain: TemplateBuilder = (d, _projectName, yaml) => ({
  name: 'A3_Value_Chain.md',
  content: `${yaml({
    type: 'value-chain',
    togaf_phase: 'A',
    artifact_type: 'diagram',
    version: '0.1.0',
    status: 'draft',
    created: d,
    last_modified: d,
    owner: 'TBD',
  })}

# Value Chain & Motivation

> Phase A — Business motivation model and value chain mapping.

## Business Motivation

| Element | Description |
|---------|-------------|
| Vision | |
| Mission | |
| Strategy | |
| Tactic | |
| Goal | |
| Objective | |

## Value Stream

(Describe or diagram the end-to-end value stream this initiative supports)

\`\`\`mermaid
graph LR
  A[Input] --> B[Process 1] --> C[Process 2] --> D[Output / Value]
\`\`\`
`,
});
