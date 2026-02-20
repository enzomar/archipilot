/**
 * VaultTemplate – TOGAF-aligned vault scaffolding.
 *
 * Structure follows TOGAF ADM phases:
 *   Preliminary → Phase A → B → C → D → E → F → G → H → Requirements Management
 *
 * Each template lives in its own module under ./templates/.
 * This file re-exports the public API and orchestrates all builders.
 */

import {
  build00ArchitectureRepository,
  buildP1ArchitecturePrinciples,
  buildP2GovernanceFramework,
  buildA1ArchitectureVision,
  buildA2StakeholderMap,
  buildA3ValueChain,
  buildB1BusinessArchitecture,
  buildB2BusinessCapabilityCatalog,
  buildB3BusinessScenarios,
  buildC1ApplicationArchitecture,
  buildC2DataArchitecture,
  buildC3ApplicationPortfolioCatalog,
  buildD1TechnologyArchitecture,
  buildD2TechnologyStandardsCatalog,
  buildE1SolutionsBuildingBlocks,
  buildE2IntegrationStrategy,
  buildF1ArchitectureRoadmap,
  buildF2MigrationPlan,
  buildG1ComplianceAssessment,
  buildG2ArchitectureContracts,
  buildH1ChangeRequestLog,
  buildR1ArchitectureRequirements,
  buildX1AdrDecisionLog,
  buildX2RiskIssueRegister,
  buildX3OpenQuestions,
  buildX4SizingCatalogue,
  buildX5TraceabilityMatrix,
  buildX6TechnicalDebtLog,
} from './templates/index.js';

import type { TemplateFile, YamlFn } from './templates/types.js';

export type { TemplateFile, YamlFn };

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
    build00ArchitectureRepository(d, projectName, yaml),
    buildP1ArchitecturePrinciples(d, projectName, yaml),
    buildP2GovernanceFramework(d, projectName, yaml),
    buildA1ArchitectureVision(d, projectName, yaml),
    buildA2StakeholderMap(d, projectName, yaml),
    buildA3ValueChain(d, projectName, yaml),
    buildB1BusinessArchitecture(d, projectName, yaml),
    buildB2BusinessCapabilityCatalog(d, projectName, yaml),
    buildB3BusinessScenarios(d, projectName, yaml),
    buildC1ApplicationArchitecture(d, projectName, yaml),
    buildC2DataArchitecture(d, projectName, yaml),
    buildC3ApplicationPortfolioCatalog(d, projectName, yaml),
    buildD1TechnologyArchitecture(d, projectName, yaml),
    buildD2TechnologyStandardsCatalog(d, projectName, yaml),
    buildE1SolutionsBuildingBlocks(d, projectName, yaml),
    buildE2IntegrationStrategy(d, projectName, yaml),
    buildF1ArchitectureRoadmap(d, projectName, yaml),
    buildF2MigrationPlan(d, projectName, yaml),
    buildG1ComplianceAssessment(d, projectName, yaml),
    buildG2ArchitectureContracts(d, projectName, yaml),
    buildH1ChangeRequestLog(d, projectName, yaml),
    buildR1ArchitectureRequirements(d, projectName, yaml),
    buildX1AdrDecisionLog(d, projectName, yaml),
    buildX2RiskIssueRegister(d, projectName, yaml),
    buildX3OpenQuestions(d, projectName, yaml),
    buildX4SizingCatalogue(d, projectName, yaml),
    buildX5TraceabilityMatrix(d, projectName, yaml),
    buildX6TechnicalDebtLog(d, projectName, yaml),
  ];
}
