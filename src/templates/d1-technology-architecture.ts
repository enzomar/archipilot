import type { TemplateBuilder } from './types.js';

export const buildD1TechnologyArchitecture: TemplateBuilder = (d, _projectName, yaml) => ({
  name: 'D1_Technology_Architecture.md',
  content: `${yaml({
    type: 'technology-architecture',
    togaf_phase: 'D',
    artifact_type: 'deliverable',
    version: '0.1.0',
    status: 'draft',
    created: d,
    last_modified: d,
    owner: 'TBD',
    reviewers: [],
  })}

# Technology Architecture

> Phase D — Infrastructure, platforms, and technology components.

## Baseline Technology Landscape

(Current infrastructure, hosting, middleware)

## Target Technology Architecture

### Platform Components

| Component | Technology | Environment | Scaling | SLA |
|-----------|-----------|-------------|---------|-----|
| | | Cloud / On-prem / Hybrid | | |

### Environment Legend
- **Cloud** — Hosted on public cloud provider (AWS, Azure, GCP)
- **On-prem** — Deployed in own data centre
- **Hybrid** — Combination of cloud and on-premises
- **Edge** — Deployed at edge locations close to end users

### Deployment Topology

\`\`\`mermaid
graph TD
  subgraph "Production"
    LB[Load Balancer] --> App1[App Instance 1]
    LB --> App2[App Instance 2]
    App1 --> DB[(Database)]
    App2 --> DB
  end
\`\`\`

## Gap Analysis

| Baseline | Target | Gap | Action |
|----------|--------|-----|--------|
| | | | |
`,
});
