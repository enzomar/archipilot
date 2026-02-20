#!/usr/bin/env tsx
/**
 * generate-obsidian-templates.ts
 *
 * Generates Obsidian Templater-compatible `.md` files from the canonical
 * vault-template builders.  vault-template.ts stays the **single source
 * of truth** — this script simply calls the same builders with Obsidian
 * Templater placeholders instead of real values, then writes the output
 * to `obsidian-templates/`.
 *
 * Usage:
 *   npx tsx scripts/generate-obsidian-templates.ts
 *   # or
 *   npm run generate:obsidian
 *
 * The generated folder can be copied into any Obsidian vault and used
 * with the Templater community plugin.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildVaultTemplate } from '../src/vault-template.js';

// ── Obsidian Templater placeholders ──────────────────────────────
const DATE_PLACEHOLDER = '<% tp.date.now("YYYY-MM-DD") %>';
const PROJECT_PLACEHOLDER = '<% tp.file.title %>';

// ── Output directory (repo root / obsidian-templates) ────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OUT_DIR = join(__dirname, '..', 'obsidian-templates');

// ── Generate ─────────────────────────────────────────────────────

// We call buildVaultTemplate with unique sentinel strings so we can
// find & replace them precisely in the output — this avoids false
// positives that could happen with short date strings.
const DATE_SENTINEL = '__OBSIDIAN_DATE_SENTINEL__';
const PROJECT_SENTINEL = '__OBSIDIAN_PROJECT_SENTINEL__';

// Temporarily override the today() result by calling the exported
// function with our sentinel as the project name.  The builders
// receive `d` (date) and `projectName` as separate arguments, so
// both sentinels stay isolated.
//
// We can't easily override `today()` (it's a private function), but
// buildVaultTemplate calls it internally then passes the result as
// `d` to every builder.  Instead, we'll re-implement the
// orchestration here with our sentinels.
//
// Actually — the cleanest approach is to import all the builders
// directly and call them ourselves, exactly like vault-template.ts
// does, but with our sentinel strings.

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
} from '../src/templates/index.js';

/**
 * Identical to the yaml() helper in vault-template.ts.
 * Duplicated here so this script is self-contained and doesn't
 * depend on internal (non-exported) functions.
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

const builders = [
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
];

// Build all templates with sentinel strings
const files = builders.map((b) => b(DATE_SENTINEL, PROJECT_SENTINEL, yaml));

// Replace sentinels with Obsidian Templater placeholders
function replaceAll(s: string, search: string, replace: string): string {
  return s.split(search).join(replace);
}

mkdirSync(OUT_DIR, { recursive: true });

let count = 0;
for (const file of files) {
  let content = file.content;
  content = replaceAll(content, DATE_SENTINEL, DATE_PLACEHOLDER);
  content = replaceAll(content, PROJECT_SENTINEL, PROJECT_PLACEHOLDER);

  const outPath = join(OUT_DIR, file.name);
  writeFileSync(outPath, content, 'utf-8');
  count++;
}

console.log(`✅ Generated ${count} Obsidian templates in ${OUT_DIR}`);
