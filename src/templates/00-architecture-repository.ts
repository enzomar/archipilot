import type { TemplateBuilder } from './types.js';

export const build00ArchitectureRepository: TemplateBuilder = (d, projectName, yaml) => ({
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
- [[X6_Technical_Debt_Log]]
`,
});
