import type { TemplateBuilder } from './types.js';

export const buildX4SizingCatalogue: TemplateBuilder = (d, _projectName, yaml) => ({
  name: 'X4_Sizing_Catalogue.md',
  content: `${yaml({
    type: 'sizing-catalogue',
    togaf_phase: 'cross-phase',
    artifact_type: 'catalog',
    version: '0.1.0',
    status: 'draft',
    created: d,
    last_modified: d,
    owner: 'TBD',
  })}

# Sizing Catalogue

> Cross-Phase — Capacity planning, infrastructure sizing, and cost estimation.

## Component Sizing

| Component | vCPU | Memory | Storage | Network | Instances | Scaling |
|-----------|------|--------|---------|---------|-----------|---------|
| | | | | | | Auto / Manual |

## Scaling Legend
- **Auto** — Automatic horizontal/vertical scaling based on metrics
- **Manual** — Scaling requires human intervention or approval
- **Scheduled** — Pre-configured scaling at known peak times

## Capacity Estimates

| Metric | Current | 6-month | 12-month | 24-month |
|--------|---------|---------|----------|----------|
| Users (concurrent) | | | | |
| Requests/sec (peak) | | | | |
| Data volume (GB) | | | | |
| API calls/day | | | | |

## Cost Estimation

| Component | Unit Cost | Quantity | Monthly Cost | Annual Cost |
|-----------|----------|----------|-------------|------------|
| | | | | |
| **Total** | | | **€ —** | **€ —** |

## Assumptions

- 
`,
});
