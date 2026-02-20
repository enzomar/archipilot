import type { TemplateBuilder } from './types.js';

export const buildD2TechnologyStandardsCatalog: TemplateBuilder = (d, _projectName, yaml) => ({
  name: 'D2_Technology_Standards_Catalog.md',
  content: `${yaml({
    type: 'technology-standards',
    togaf_phase: 'D',
    artifact_type: 'catalog',
    version: '0.1.0',
    status: 'draft',
    created: d,
    last_modified: d,
    owner: 'TBD',
  })}

# Technology Standards Catalog

> Phase D — Approved and emerging technology standards.

| Category | Standard | Status | Version | Sunset Date | Notes |
|----------|----------|--------|---------|-------------|-------|
| Language | | Approved | | | |
| Framework | | Approved | | | |
| Database | | Approved | | | |
| Messaging | | Approved | | | |
| Cloud | | Approved | | | |
| Monitoring | | Approved | | | |
| Security | | Approved | | | |
| API | | Approved | | | |

## Status Legend
- **Approved** — Standard for new projects
- **Emerging** — Under evaluation
- **Contained** — No new adoption, maintain only
- **Retiring** — Migration away in progress
`,
});
