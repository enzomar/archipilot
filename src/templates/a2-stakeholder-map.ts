import type { TemplateBuilder } from './types.js';

export const buildA2StakeholderMap: TemplateBuilder = (d, _projectName, yaml) => ({
  name: 'A2_Stakeholder_Map.md',
  content: `${yaml({
    type: 'stakeholder-map',
    togaf_phase: 'A',
    artifact_type: 'catalog',
    version: '0.1.0',
    status: 'draft',
    created: d,
    last_modified: d,
    owner: 'TBD',
    reviewers: [],
  })}

# Stakeholder Map

> Phase A — Stakeholder identification and concern mapping.

## Stakeholder Catalog

| Stakeholder | Role | Interest | Concern | Influence | Engagement |
|-------------|------|----------|---------|-----------|------------|
| | | | | High/Med/Low | Inform/Consult/Collaborate |
| | | | | | |

## RACI Matrix

| Decision Area | Responsible | Accountable | Consulted | Informed |
|--------------|-------------|-------------|-----------|----------|
| Architecture Vision | | | | |
| Technology Selection | | | | |
| Security Posture | | | | |
| Data Governance | | | | |

## Influence Legend
- **High** — Can veto or mandate architectural decisions
- **Medium** — Can shape decisions through expertise or budget
- **Low** — Affected by decisions but limited direct authority

## Engagement Legend
- **Inform** — One-way communication; no input required
- **Consult** — Two-way communication; input sought but decision lies elsewhere
- **Collaborate** — Active partnership in decision-making

## Communication Plan

| Audience | Channel | Frequency | Content |
|----------|---------|-----------|---------|
| | | | |
`,
});
