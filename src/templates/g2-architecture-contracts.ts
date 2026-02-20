import type { TemplateBuilder } from './types.js';

export const buildG2ArchitectureContracts: TemplateBuilder = (d, _projectName, yaml) => ({
  name: 'G2_Architecture_Contracts.md',
  content: `${yaml({
    type: 'architecture-contract',
    togaf_phase: 'G',
    artifact_type: 'deliverable',
    version: '0.1.0',
    status: 'draft',
    created: d,
    last_modified: d,
    owner: 'TBD',
  })}

# Architecture Contracts

> Phase G — Formal agreements between architecture and implementation teams.

## Active Contracts

| Contract ID | Title | Parties | Scope | Effective Date | Review Date | Status |
|-------------|-------|---------|-------|----------------|-------------|--------|
| AC-001 | | Architecture → Dev Team | | TBD | TBD | Draft |

## Contract Template

### AC-XXX — [Contract Title]

**Parties:**
- Architecture Owner: [Name]
- Implementation Lead: [Name]

**Scope:** [What this contract covers]

**Architecture Commitments:**
- Provide approved target architecture documentation
- Provide timely architecture review and decision support
- Maintain traceability from requirements to building blocks

**Implementation Commitments:**
- Follow approved architecture principles ([[P1_Architecture_Principles]])
- Use endorsed technology standards ([[D2_Technology_Standards_Catalog]])
- Submit architecture deviation requests for any non-compliance
- Participate in gate reviews ([[G1_Compliance_Assessment]])

**Quality Criteria:**
| Criterion | Target | Measure | Enforcement |
|-----------|--------|---------|-------------|
| Architecture conformance | 100% | Gate review checklist | Mandatory |
| Technology standards compliance | 100% | Automated checks | CI pipeline |
| Security controls | Per policy | Security review | Pre-release gate |

**Review & Escalation:**
- Review cadence: [Monthly / Per-phase]
- Escalation path: Implementation Lead → Architecture Owner → Architecture Board
- Breach handling: Architecture deviation request required (see [[G1_Compliance_Assessment]])
`,
});
