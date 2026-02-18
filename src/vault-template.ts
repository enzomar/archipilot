/**
 * VaultTemplate – TOGAF-aligned vault scaffolding.
 *
 * Structure follows TOGAF ADM phases:
 *   Preliminary → Phase A → B → C → D → E → F → G → H → Requirements Management
 *
 * YAML front matter includes:
 *   - togaf_phase     : ADM phase identifier
 *   - artifact_type   : catalog | matrix | diagram | deliverable | building-block
 *   - version         : semantic version (0.1.0 = initial draft)
 *   - status          : draft | in-review | approved | superseded
 *   - created / modified : ISO dates
 *   - owner / reviewers : accountability
 */

export interface TemplateFile {
  name: string;
  content: string;
}

/**
 * Returns the date string for today (YYYY-MM-DD).
 */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Build YAML front matter block.
 */
function yaml(fields: Record<string, string | string[]>): string {
  const lines = ['---'];
  for (const [key, value] of Object.entries(fields)) {
    if (Array.isArray(value)) {
      lines.push(`${key}: [${value.map((v) => `"${v}"`).join(', ')}]`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push('---');
  return lines.join('\n');
}

/**
 * Generate the full set of TOGAF-aligned vault template files.
 */
export function buildVaultTemplate(projectName: string): TemplateFile[] {
  const d = today();

  return [
    // ────────────────────────────────────────────────────────────────
    // ARCHITECTURE REPOSITORY INDEX
    // ────────────────────────────────────────────────────────────────
    {
      name: '00_Architecture_Repository.md',
      content: `${yaml({
        type: 'architecture-repository',
        project: projectName,
        togaf_phase: 'all',
        artifact_type: 'index',
        version: '0.1.0',
        status: 'draft',
        created: d,
        last_modified: d,
        owner: 'TBD',
      })}

# ${projectName} — Architecture Repository

> This repository follows the TOGAF Architecture Development Method (ADM).
> Each document maps to a specific ADM phase and artifact type.

## Preliminary Phase
- [[P1_Architecture_Principles]]
- [[P2_Governance_Framework]]

## Phase A — Architecture Vision
- [[A1_Architecture_Vision]]
- [[A2_Stakeholder_Map]]
- [[A3_Value_Chain]]

## Phase B — Business Architecture
- [[B1_Business_Architecture]]
- [[B2_Business_Capability_Catalog]]
- [[B3_Business_Scenarios]]

## Phase C — Information Systems Architecture
- [[C1_Application_Architecture]]
- [[C2_Data_Architecture]]
- [[C3_Application_Portfolio_Catalog]]

## Phase D — Technology Architecture
- [[D1_Technology_Architecture]]
- [[D2_Technology_Standards_Catalog]]

## Phase E — Opportunities & Solutions
- [[E1_Solutions_Building_Blocks]]
- [[E2_Integration_Strategy]]

## Phase F — Migration Planning
- [[F1_Architecture_Roadmap]]
- [[F2_Migration_Plan]]

## Phase G — Implementation Governance
- [[G1_Compliance_Assessment]]
- [[G2_Architecture_Contracts]]

## Phase H — Architecture Change Management
- [[H1_Change_Request_Log]]

## Requirements Management
- [[R1_Architecture_Requirements]]

## Cross-Phase Artifacts
- [[X1_ADR_Decision_Log]]
- [[X2_Risk_Issue_Register]]
- [[X3_Open_Questions]]
- [[X4_Sizing_Catalogue]]
- [[X5_Traceability_Matrix]]
`,
    },

    // ────────────────────────────────────────────────────────────────
    // PRELIMINARY PHASE
    // ────────────────────────────────────────────────────────────────
    {
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
    },
    {
      name: 'P2_Governance_Framework.md',
      content: `${yaml({
        type: 'governance-framework',
        togaf_phase: 'preliminary',
        artifact_type: 'deliverable',
        version: '0.1.0',
        status: 'draft',
        created: d,
        last_modified: d,
        owner: 'TBD',
        reviewers: [],
      })}

# Architecture Governance Framework

> Preliminary Phase — Defines how architecture is governed.

## Architecture Board

| Role | Name | Responsibility |
|------|------|---------------|
| Chief Architect | TBD | Final architecture authority |
| Domain Architect | TBD | Domain-level decisions |
| Security Architect | TBD | Security review and approval |
| | | |

## Review Process

1. Architecture change proposed → Decision Log entry created
2. Impact analysis conducted (cross-phase)
3. Architecture Board review
4. Decision recorded with status (Proposed → Approved / Rejected)
5. Implementation governed via Compliance Assessment

## Escalation Path

- L1: Domain Architect
- L2: Architecture Board
- L3: CTO / Executive Sponsor

## Compliance Criteria

- [ ] Aligned with Architecture Principles
- [ ] Security review completed
- [ ] Data governance validated
- [ ] Integration impact assessed
- [ ] Cost/sizing estimated
`,
    },

    // ────────────────────────────────────────────────────────────────
    // PHASE A — ARCHITECTURE VISION
    // ────────────────────────────────────────────────────────────────
    {
      name: 'A1_Architecture_Vision.md',
      content: `${yaml({
        type: 'architecture-vision',
        togaf_phase: 'A',
        artifact_type: 'deliverable',
        version: '0.1.0',
        status: 'draft',
        created: d,
        last_modified: d,
        owner: 'TBD',
        reviewers: [],
      })}

# Architecture Vision

> Phase A — Statement of Architecture Work

## Initiative Name

${projectName}

## Executive Summary

(Describe the initiative purpose, strategic value, and transformation intent)

## Business Context & Drivers

- (Driver 1)
- (Driver 2)

## Scope

### In Scope
- 

### Out of Scope
- 

## Objectives

1. 
2. 
3. 

## Value Proposition

| Benefit | Measure | Target |
|---------|---------|--------|
| | | |

## Key Constraints

- 

## Architecture Work Plan

| Deliverable | Target Date | Owner |
|-------------|-------------|-------|
| Architecture Vision (this doc) | ${d} | TBD |
| Business Architecture | TBD | TBD |
| Target Architecture | TBD | TBD |
| Roadmap | TBD | TBD |
`,
    },
    {
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

## Communication Plan

| Audience | Channel | Frequency | Content |
|----------|---------|-----------|---------|
| | | | |
`,
    },
    {
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
    },

    // ────────────────────────────────────────────────────────────────
    // PHASE B — BUSINESS ARCHITECTURE
    // ────────────────────────────────────────────────────────────────
    {
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
    },
    {
      name: 'B2_Business_Capability_Catalog.md',
      content: `${yaml({
        type: 'business-capability-catalog',
        togaf_phase: 'B',
        artifact_type: 'catalog',
        version: '0.1.0',
        status: 'draft',
        created: d,
        last_modified: d,
        owner: 'TBD',
      })}

# Business Capability Catalog

> Phase B — Inventory of business capabilities.

| ID | Capability | Level | Maturity | Target Maturity | Owner |
|----|-----------|-------|----------|-----------------|-------|
| BC-01 | | L1 | | | |
| BC-02 | | L2 | | | |
| | | | | | |

## Capability Maturity Model

- **Level 0** — Not present
- **Level 1** — Initial / Ad hoc
- **Level 2** — Managed
- **Level 3** — Defined
- **Level 4** — Measured
- **Level 5** — Optimized
`,
    },
    {
      name: 'B3_Business_Scenarios.md',
      content: `${yaml({
        type: 'business-scenarios',
        togaf_phase: 'B',
        artifact_type: 'deliverable',
        version: '0.1.0',
        status: 'draft',
        created: d,
        last_modified: d,
        owner: 'TBD',
      })}

# Business Scenarios

> Phase B — Architecturally significant business scenarios.

## Scenario 1 — (Name)

| Field | Value |
|-------|-------|
| Trigger | |
| Actor(s) | |
| Pre-conditions | |
| Post-conditions | |

### Capabilities Required
- 

### Expected Outcome
- 

### Architecture Implications
- 

---

## Scenario 2 — (Name)

| Field | Value |
|-------|-------|
| Trigger | |
| Actor(s) | |
| Pre-conditions | |
| Post-conditions | |

### Capabilities Required
- 

### Expected Outcome
- 
`,
    },

    // ────────────────────────────────────────────────────────────────
    // PHASE C — INFORMATION SYSTEMS ARCHITECTURE
    // ────────────────────────────────────────────────────────────────
    {
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
    },
    {
      name: 'C2_Data_Architecture.md',
      content: `${yaml({
        type: 'data-architecture',
        togaf_phase: 'C',
        artifact_type: 'deliverable',
        version: '0.1.0',
        status: 'draft',
        created: d,
        last_modified: d,
        owner: 'TBD',
        reviewers: [],
      })}

# Data Architecture

> Phase C — Data entities, flows, governance, and quality.

## Data Entity Catalog

| Entity | Classification | Owner | Storage | Retention |
|--------|---------------|-------|---------|-----------|
| | PII / Internal / Public | | | |

## Data Flow Diagram

\`\`\`mermaid
graph LR
  Source[Data Source] -->|Extract| Processing[Processing] -->|Load| Target[Data Store]
\`\`\`

## Data Governance

| Policy | Description | Status |
|--------|-------------|--------|
| Data Residency | | TBD |
| Encryption at Rest | | TBD |
| Encryption in Transit | | TBD |
| Retention | | TBD |
| PII Handling | | TBD |

## Data Quality Rules

- 
`,
    },
    {
      name: 'C3_Application_Portfolio_Catalog.md',
      content: `${yaml({
        type: 'application-portfolio',
        togaf_phase: 'C',
        artifact_type: 'catalog',
        version: '0.1.0',
        status: 'draft',
        created: d,
        last_modified: d,
        owner: 'TBD',
      })}

# Application Portfolio Catalog

> Phase C — Inventory of applications and services.

| ID | Application | Type | Status | Disposition | Owner | Technology |
|----|------------|------|--------|-------------|-------|------------|
| APP-01 | | Service / UI / Batch | Current / New | Retain / Replace / Retire | | |
| | | | | | | |

## Disposition Legend
- **Retain** — Keep as-is
- **Invest** — Enhance / modernize
- **Migrate** — Move to new platform
- **Replace** — Substitute with new solution
- **Retire** — Decommission
`,
    },

    // ────────────────────────────────────────────────────────────────
    // PHASE D — TECHNOLOGY ARCHITECTURE
    // ────────────────────────────────────────────────────────────────
    {
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
    },
    {
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
    },

    // ────────────────────────────────────────────────────────────────
    // PHASE E — OPPORTUNITIES & SOLUTIONS
    // ────────────────────────────────────────────────────────────────
    {
      name: 'E1_Solutions_Building_Blocks.md',
      content: `${yaml({
        type: 'solution-building-blocks',
        togaf_phase: 'E',
        artifact_type: 'building-block',
        version: '0.1.0',
        status: 'draft',
        created: d,
        last_modified: d,
        owner: 'TBD',
      })}

# Solutions & Building Blocks

> Phase E — Mapping Architecture Building Blocks (ABBs) to Solution Building Blocks (SBBs).

## Architecture Building Blocks → Solution Building Blocks

| ABB (Logical) | SBB (Physical) | Vendor / Product | Buy / Build | Status |
|--------------|----------------|------------------|-------------|--------|
| | | | | |

## Build vs Buy Analysis

| Capability | Build | Buy | Recommendation | Rationale |
|-----------|-------|-----|----------------|-----------|
| | | | | |

## Vendor Assessment

| Vendor | Product | Strengths | Weaknesses | Risk | Score |
|--------|---------|-----------|-----------|------|-------|
| | | | | | /10 |
`,
    },
    {
      name: 'E2_Integration_Strategy.md',
      content: `${yaml({
        type: 'integration-strategy',
        togaf_phase: 'E',
        artifact_type: 'deliverable',
        version: '0.1.0',
        status: 'draft',
        created: d,
        last_modified: d,
        owner: 'TBD',
        reviewers: [],
      })}

# Integration Strategy

> Phase E — Integration patterns, protocols, and external system mapping.

## Integration Principles

- 

## Integration Catalog

| Source | Target | Pattern | Protocol | Data Format | Frequency |
|--------|--------|---------|----------|-------------|-----------|
| | | Sync / Async / Event | REST / gRPC / MQ | JSON / Avro | Real-time / Batch |

## Integration Models

### Model 1 — (Description)

### Model 2 — (Description)

## External System Dependencies

| System | Owner | API Version | SLA | Contract |
|--------|-------|-------------|-----|----------|
| | | | | |

## Open Questions

- 
`,
    },

    // ────────────────────────────────────────────────────────────────
    // PHASE F — MIGRATION PLANNING
    // ────────────────────────────────────────────────────────────────
    {
      name: 'F1_Architecture_Roadmap.md',
      content: `${yaml({
        type: 'architecture-roadmap',
        togaf_phase: 'F',
        artifact_type: 'deliverable',
        version: '0.1.0',
        status: 'draft',
        created: d,
        last_modified: d,
        owner: 'TBD',
        reviewers: [],
      })}

# Architecture Roadmap

> Phase F — Phased delivery plan with transition architectures.

## Phase 1 — Foundation (Target: TBD)

**Objective:** Establish architecture baseline and governance.

| Work Package | Duration | Dependencies | Owner | Status |
|-------------|----------|--------------|-------|--------|
| | | | | Not started |

## Phase 2 — Pilot (Target: TBD)

**Objective:** Controlled deployment and validation.

| Work Package | Duration | Dependencies | Owner | Status |
|-------------|----------|--------------|-------|--------|
| | | | | Not started |

## Phase 3 — Production (Target: TBD)

**Objective:** Governed, scalable deployment.

| Work Package | Duration | Dependencies | Owner | Status |
|-------------|----------|--------------|-------|--------|
| | | | | Not started |

## Phase 4 — Extension (Target: TBD)

**Objective:** Expand scope and capabilities.

| Work Package | Duration | Dependencies | Owner | Status |
|-------------|----------|--------------|-------|--------|
| | | | | Not started |

## Key Milestones

| Milestone | Target Date | Phase | Status |
|-----------|-------------|-------|--------|
| | | | |
`,
    },
    {
      name: 'F2_Migration_Plan.md',
      content: `${yaml({
        type: 'migration-plan',
        togaf_phase: 'F',
        artifact_type: 'deliverable',
        version: '0.1.0',
        status: 'draft',
        created: d,
        last_modified: d,
        owner: 'TBD',
      })}

# Migration Plan

> Phase F — Transition from Baseline to Target Architecture.

## Transition Architecture States

| State | Description | Entry Criteria | Exit Criteria |
|-------|-------------|----------------|---------------|
| Baseline | Current state | — | Phase 1 approved |
| Transition 1 | | | |
| Target | Final state | | All phases delivered |

## Migration Strategy

(Big bang / Phased / Parallel run / Strangler fig)

## Rollback Plan

| Phase | Rollback Trigger | Rollback Steps | RTO |
|-------|-----------------|----------------|-----|
| | | | |

## Data Migration

| Data Set | Volume | Method | Validation | Cutover Window |
|----------|--------|--------|------------|---------------|
| | | | | |
`,
    },

    // ────────────────────────────────────────────────────────────────
    // PHASE G — IMPLEMENTATION GOVERNANCE
    // ────────────────────────────────────────────────────────────────
    {
      name: 'G1_Compliance_Assessment.md',
      content: `${yaml({
        type: 'compliance-assessment',
        togaf_phase: 'G',
        artifact_type: 'deliverable',
        version: '0.1.0',
        status: 'draft',
        created: d,
        last_modified: d,
        owner: 'TBD',
      })}

# Implementation Governance & Compliance

> Phase G — Ensuring implementation conforms to architecture.

## Compliance Checklist

| # | Criterion | Status | Evidence | Reviewer |
|---|----------|--------|----------|----------|
| 1 | Follows Architecture Principles | ⬜ | | |
| 2 | Security controls implemented | ⬜ | | |
| 3 | Data governance applied | ⬜ | | |
| 4 | Integration standards followed | ⬜ | | |
| 5 | Performance requirements met | ⬜ | | |
| 6 | Observability configured | ⬜ | | |
| 7 | Disaster recovery tested | ⬜ | | |

## Architecture Deviation Requests

| ID | Description | Impact | Status | Approved By |
|----|-------------|--------|--------|-------------|
| | | | | |

## Gate Reviews

| Gate | Phase | Date | Outcome | Notes |
|------|-------|------|---------|-------|
| G1 | Foundation | TBD | Pending | |
| G2 | Pilot | TBD | Pending | |
| G3 | Production | TBD | Pending | |
`,
    },
    {
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
    },

    // ────────────────────────────────────────────────────────────────
    // PHASE H — CHANGE MANAGEMENT
    // ────────────────────────────────────────────────────────────────
    {
      name: 'H1_Change_Request_Log.md',
      content: `${yaml({
        type: 'change-request-log',
        togaf_phase: 'H',
        artifact_type: 'catalog',
        version: '0.1.0',
        status: 'draft',
        created: d,
        last_modified: d,
        owner: 'TBD',
      })}

# Architecture Change Request Log

> Phase H — Tracking proposed changes to the approved architecture.

| CR-ID | Date | Requestor | Description | Impact | Priority | Status | Decision |
|-------|------|-----------|-------------|--------|----------|--------|----------|
| CR-001 | | | | | H/M/L | Open | |

## Change Impact Assessment Template

For each CR:
1. Which architecture layers are affected? (Business / Application / Data / Technology)
2. Which ADM phases need to be revisited?
3. What is the governance impact?
4. What are the risks of change vs. no-change?
5. What is the cost/timeline impact?
`,
    },

    // ────────────────────────────────────────────────────────────────
    // REQUIREMENTS MANAGEMENT
    // ────────────────────────────────────────────────────────────────
    {
      name: 'R1_Architecture_Requirements.md',
      content: `${yaml({
        type: 'architecture-requirements',
        togaf_phase: 'requirements-management',
        artifact_type: 'deliverable',
        version: '0.1.0',
        status: 'draft',
        created: d,
        last_modified: d,
        owner: 'TBD',
        reviewers: [],
      })}

# Architecture Requirements Specification

> Requirements Management — Cross-phase requirements traceability.

## Functional Requirements

| ID | Requirement | Priority | Source | Phase | Status |
|----|-------------|----------|--------|-------|--------|
| FR-01 | | Must/Should/Could | | | Open |
| | | | | | |

## Non-Functional Requirements

| ID | Category | Requirement | Target | Measure | Status |
|----|----------|-------------|--------|---------|--------|
| NFR-01 | Performance | | | | Open |
| NFR-02 | Availability | | | | Open |
| NFR-03 | Security | | | | Open |
| NFR-04 | Scalability | | | | Open |
| NFR-05 | Observability | | | | Open |

## Constraints

| ID | Constraint | Source | Impact |
|----|-----------|--------|--------|
| CON-01 | | | |

## Assumptions

| ID | Assumption | Risk if Wrong | Validated |
|----|-----------|---------------|-----------|
| ASM-01 | | | ⬜ |
`,
    },

    // ────────────────────────────────────────────────────────────────
    // CROSS-PHASE ARTIFACTS
    // ────────────────────────────────────────────────────────────────
    {
      name: 'X1_ADR_Decision_Log.md',
      content: `${yaml({
        type: 'decision-log',
        togaf_phase: 'cross-phase',
        artifact_type: 'catalog',
        version: '0.1.0',
        status: 'draft',
        created: d,
        last_modified: d,
        owner: 'TBD',
      })}

# Architecture Decision Log

> Cross-Phase — Architecture Decision Records (ADRs).

## Decision Index

| ID | Title | Phase | Status | Date |
|----|-------|-------|--------|------|
| AD-01 | (First decision) | A | Open | ${d} |

---

## AD-01 — (First Decision Title)

| Field | Value |
|-------|-------|
| Status | Open |
| Date | ${d} |
| ADM Phase | A |
| Decision Maker | TBD |
| Supersedes | — |

### Context

(What is the architectural context requiring a decision?)

### Options

| Option | Pros | Cons | Risk | Cost |
|--------|------|------|------|------|
| A — | | | | |
| B — | | | | |

### Decision

(Pending)

### Consequences

(Impact on other architecture artifacts)

### Affected Documents

- 
`,
    },
    {
      name: 'X2_Risk_Issue_Register.md',
      content: `${yaml({
        type: 'risk-issue-register',
        togaf_phase: 'cross-phase',
        artifact_type: 'catalog',
        version: '0.1.0',
        status: 'draft',
        created: d,
        last_modified: d,
        owner: 'TBD',
      })}

# Risk & Issue Register

> Cross-Phase — Architectural risks, issues, and mitigations.

## Risks

| ID | Risk | Probability | Impact | Severity | Mitigation | Owner | Status |
|----|------|-------------|--------|----------|------------|-------|--------|
| R-01 | | H/M/L | H/M/L | | | | Open |
| | | | | | | | |

## Issues

| ID | Issue | Impact | Resolution | Owner | Status | Raised |
|----|-------|--------|------------|-------|--------|--------|
| I-01 | | | | | Open | ${d} |

## Constraints

| ID | Constraint | Source | Impact on Architecture |
|----|-----------|--------|----------------------|
| C-01 | | | |
`,
    },
    {
      name: 'X3_Open_Questions.md',
      content: `${yaml({
        type: 'open-questions',
        togaf_phase: 'cross-phase',
        artifact_type: 'catalog',
        version: '0.1.0',
        status: 'draft',
        created: d,
        last_modified: d,
        owner: 'TBD',
      })}

# Open Questions Tracker

> Cross-Phase — Unresolved questions requiring stakeholder input.

| ID | Category | Question | ADM Phase | Owner | Due | Status |
|----|----------|----------|-----------|-------|-----|--------|
| Q-01 | Strategic | | A | TBD | | Open |
| Q-02 | Governance | | Preliminary | TBD | | Open |
| Q-03 | Data | | C | TBD | | Open |
| Q-04 | Technology | | D | TBD | | Open |
| Q-05 | Security | | C | TBD | | Open |
| Q-06 | Integration | | E | TBD | | Open |
| Q-07 | Financial | | F | TBD | | Open |
| Q-08 | Regulatory | | G | TBD | | Open |
`,
    },
    {
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
    },
    {
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
    },
  ];
}
