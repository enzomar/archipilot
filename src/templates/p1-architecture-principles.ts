import type { TemplateBuilder } from './types.js';

export const buildP1ArchitecturePrinciples: TemplateBuilder = (d, _projectName, yaml) => ({
  name: 'P1_Architecture_Principles.md',
  content: `${yaml({
    type: 'architecture-principles',
    togaf_phase: 'preliminary',
    artifact_type: 'catalog',
    version: '0.1.0',
    status: 'draft',
    created: d,
    last_modified: d,
    owner: 'TBD',
    reviewers: [],
  })}

# Architecture Principles Catalog

> TOGAF Preliminary Phase — Principles that govern architecture work.

| # | Principle | Rationale | Implications |
|---|-----------|-----------|-------------|
| P-01 | API-First | Maximizes interoperability and reuse | All capabilities exposed as APIs before UIs |
| P-02 | Secure by Design | Compliance and data protection | Security embedded in every layer |
| P-03 | Technology Agnostic | Avoid vendor lock-in | Abstraction layers for replaceable components |
| P-04 | Data Sovereignty | Regulatory compliance | Data residency and encryption enforced |
| P-05 | Governance-Driven | Controlled evolution | All changes through architecture review |
| P-06 | Reusable Components | Economies of scale | Build once, deploy across domains |
| P-07 | Observable by Default | Operational excellence | Logging, metrics, tracing in every component |
| | | | |
`,
});
