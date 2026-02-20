/**
 * Barrel export for all vault template builders.
 *
 * Each module exports a single TemplateBuilder function so that
 * vault-template.ts stays small and each template is independently editable.
 */

export type { TemplateFile, YamlFn, TemplateBuilder } from './types.js';

export { build00ArchitectureRepository } from './00-architecture-repository.js';
export { buildP1ArchitecturePrinciples } from './p1-architecture-principles.js';
export { buildP2GovernanceFramework } from './p2-governance-framework.js';
export { buildA1ArchitectureVision } from './a1-architecture-vision.js';
export { buildA2StakeholderMap } from './a2-stakeholder-map.js';
export { buildA3ValueChain } from './a3-value-chain.js';
export { buildB1BusinessArchitecture } from './b1-business-architecture.js';
export { buildB2BusinessCapabilityCatalog } from './b2-business-capability-catalog.js';
export { buildB3BusinessScenarios } from './b3-business-scenarios.js';
export { buildC1ApplicationArchitecture } from './c1-application-architecture.js';
export { buildC2DataArchitecture } from './c2-data-architecture.js';
export { buildC3ApplicationPortfolioCatalog } from './c3-application-portfolio-catalog.js';
export { buildD1TechnologyArchitecture } from './d1-technology-architecture.js';
export { buildD2TechnologyStandardsCatalog } from './d2-technology-standards-catalog.js';
export { buildE1SolutionsBuildingBlocks } from './e1-solutions-building-blocks.js';
export { buildE2IntegrationStrategy } from './e2-integration-strategy.js';
export { buildF1ArchitectureRoadmap } from './f1-architecture-roadmap.js';
export { buildF2MigrationPlan } from './f2-migration-plan.js';
export { buildG1ComplianceAssessment } from './g1-compliance-assessment.js';
export { buildG2ArchitectureContracts } from './g2-architecture-contracts.js';
export { buildH1ChangeRequestLog } from './h1-change-request-log.js';
export { buildR1ArchitectureRequirements } from './r1-architecture-requirements.js';
export { buildX1AdrDecisionLog } from './x1-adr-decision-log.js';
export { buildX2RiskIssueRegister } from './x2-risk-issue-register.js';
export { buildX3OpenQuestions } from './x3-open-questions.js';
export { buildX4SizingCatalogue } from './x4-sizing-catalogue.js';
export { buildX5TraceabilityMatrix } from './x5-traceability-matrix.js';
export { buildX6TechnicalDebtLog } from './x6-technical-debt-log.js';
