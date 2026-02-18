/**
 * Tests for Draw.io exporter.
 * Validates migration classification, XML generation, color coding, and summary.
 *
 * Run: npm test
 */
import assert from 'node:assert';
import { describe, it, beforeEach } from 'node:test';

import {
  exportToDrawio,
  classifyMigration,
  generateDrawioSummary,
  formatDrawioSummaryMarkdown,
  resetDrawioIdCounter,
} from '../core/drawio-exporter.js';
import { extractModel, resetIdCounter } from '../core/archimate-exporter.js';
import type { VaultFile } from '../types.js';

// ── Test fixtures ───────────────────────────────────────────────

function makeFile(name: string, content: string): VaultFile {
  return {
    name,
    path: `/vault/${name}`,
    relativePath: name,
    content,
  };
}

const BUSINESS_FILE_WITH_GAPS = makeFile(
  'B1_Business_Architecture.md',
  `---
togaf_phase: B
artifact_type: deliverable
version: 0.1.0
status: draft
---
# Business Architecture

## Business Processes

| Process | Description |
|---------|-------------|
| User Onboarding | New user registration flow |
| Order Processing | End-to-end order lifecycle |
| Legacy Billing | Old billing system |

## Gap Analysis

| Baseline | Target | Gap | Action |
|----------|--------|-----|--------|
| Manual onboarding | Automated onboarding | No automation | Implement self-service portal |
| Legacy Billing | Modern Billing | Outdated billing system | Replace with cloud billing |
`
);

const APPLICATION_FILE = makeFile(
  'C1_Application_Architecture.md',
  `---
togaf_phase: C
artifact_type: deliverable
version: 0.1.0
status: draft
---
# Application Architecture

## Application Portfolio

| Component | Purpose | Status |
|-----------|---------|--------|
| API Gateway | Route requests | Active |
| Legacy CRM | Customer management | Retire |
| AI Assistant | Intelligent support | New |
| User Portal | Self-service | Active |

## Data Flow

\`\`\`mermaid
graph TD
  APIGateway["API Gateway"] --> UserPortal["User Portal"]
  APIGateway --> AIAssistant["AI Assistant"]
  UserPortal --> DB["Database"]
\`\`\`
`
);

const TECHNOLOGY_FILE = makeFile(
  'D1_Technology_Architecture.md',
  `---
togaf_phase: D
artifact_type: deliverable
version: 0.1.0
status: draft
---
# Technology Architecture

| Component | Technology | Status |
|-----------|-----------|--------|
| Kubernetes Cluster | K8s | Active |
| On-Prem Server | Physical | Retire |
| Cloud CDN | CloudFront | Planned |
`
);

const ROADMAP_FILE = makeFile(
  'F1_Architecture_Roadmap.md',
  `---
togaf_phase: F
artifact_type: deliverable
version: 0.1.0
status: draft
---
# Architecture Roadmap

| Initiative | Timeline | Status |
|-----------|----------|--------|
| Phase 1: Foundation | Q1 2026 | In Progress |
| Phase 2: Migration | Q2 2026 | Planned |
`
);

const PRINCIPLES_FILE = makeFile(
  'P1_Architecture_Principles.md',
  `---
togaf_phase: Preliminary
artifact_type: catalog
version: 0.1.0
status: draft
---
# Architecture Principles

| ID | Principle | Rationale |
|----|-----------|-----------|
| P-01 | Cloud-First | Reduce on-prem costs |
`
);

const ALL_FILES = [BUSINESS_FILE_WITH_GAPS, APPLICATION_FILE, TECHNOLOGY_FILE, ROADMAP_FILE, PRINCIPLES_FILE];

// ── Tests ───────────────────────────────────────────────────────

describe('Draw.io Exporter', () => {
  beforeEach(() => {
    resetIdCounter();
    resetDrawioIdCounter();
  });

  describe('classifyMigration', () => {
    it('classifies elements with gap analysis as add/remove/keep', () => {
      const model = extractModel(ALL_FILES, 'TestVault');
      const { elements } = classifyMigration(model, ALL_FILES);

      assert.ok(elements.length > 0, 'Should extract elements');

      // Elements marked "Retire" in Status column should be "remove"
      const legacyCrm = elements.find((e) => e.name === 'Legacy CRM');
      if (legacyCrm) {
        assert.strictEqual(legacyCrm.migrationStatus, 'remove', 'Legacy CRM should be marked for removal');
      }

      // Elements marked "New" in Status column should be "add"
      const aiAssistant = elements.find((e) => e.name === 'AI Assistant');
      if (aiAssistant) {
        assert.strictEqual(aiAssistant.migrationStatus, 'add', 'AI Assistant should be marked as new');
      }

      // Gap elements should be "add"
      const gapElements = elements.filter((e) => e.type === 'Gap');
      for (const gap of gapElements) {
        assert.strictEqual(gap.migrationStatus, 'add', `Gap "${gap.name}" should be classified as add`);
      }
    });

    it('classifies elements with Retire status as remove', () => {
      const model = extractModel([TECHNOLOGY_FILE], 'TestVault');
      const { elements } = classifyMigration(model, [TECHNOLOGY_FILE]);

      const onPrem = elements.find((e) => e.name === 'On-Prem Server');
      if (onPrem) {
        assert.strictEqual(onPrem.migrationStatus, 'remove', 'On-Prem Server should be removed');
      }

      const cdn = elements.find((e) => e.name === 'Cloud CDN');
      if (cdn) {
        assert.strictEqual(cdn.migrationStatus, 'add', 'Cloud CDN should be added');
      }
    });

    it('classifies relationships based on connected elements', () => {
      const model = extractModel(ALL_FILES, 'TestVault');
      const { elements, relationships } = classifyMigration(model, ALL_FILES);

      // Relationships connected to "remove" elements should be "remove"
      const removedIds = new Set(elements.filter((e) => e.migrationStatus === 'remove').map((e) => e.id));
      for (const rel of relationships) {
        if (removedIds.has(rel.sourceId) || removedIds.has(rel.targetId)) {
          assert.strictEqual(rel.migrationStatus, 'remove', 'Relationship to removed element should be remove');
        }
      }
    });
  });

  describe('exportToDrawio', () => {
    it('produces valid XML for all three diagrams', () => {
      const result = exportToDrawio(ALL_FILES, 'TestVault');

      assert.ok(result.asIsXml.startsWith('<?xml'), 'As-Is should be valid XML');
      assert.ok(result.targetXml.startsWith('<?xml'), 'Target should be valid XML');
      assert.ok(result.migrationXml.startsWith('<?xml'), 'Migration should be valid XML');
      assert.ok(result.combinedXml.startsWith('<?xml'), 'Combined should be valid XML');
    });

    it('combined file contains three diagram tabs', () => {
      const result = exportToDrawio(ALL_FILES, 'TestVault');
      const diagramCount = (result.combinedXml.match(/<diagram /g) || []).length;
      assert.strictEqual(diagramCount, 3, 'Combined file should have 3 diagram tabs');
    });

    it('As-Is diagram excludes "add" elements', () => {
      const result = exportToDrawio(ALL_FILES, 'TestVault');
      // "AI Assistant" is marked as New, should NOT appear in As-Is
      assert.ok(!result.asIsXml.includes('[NEW]'), 'As-Is should not contain [NEW] labels');
    });

    it('Target diagram excludes "remove" elements', () => {
      const result = exportToDrawio(ALL_FILES, 'TestVault');
      // Elements marked [REMOVE] should not appear in target
      assert.ok(!result.targetXml.includes('[REMOVE]'), 'Target should not contain [REMOVE] labels');
    });

    it('Migration diagram contains color-coded elements', () => {
      const result = exportToDrawio(ALL_FILES, 'TestVault');

      // Migration should have the legend
      assert.ok(result.migrationXml.includes('Legend'), 'Migration should contain legend');

      // Should contain the migration color fills
      assert.ok(result.migrationXml.includes('#f8cecc') || result.migrationXml.includes('#d5e8d4'),
        'Migration should contain red or green color fills');
    });

    it('Migration diagram includes legend', () => {
      const result = exportToDrawio(ALL_FILES, 'TestVault');
      assert.ok(result.migrationXml.includes('KEEP (unchanged)'), 'Legend should show KEEP');
      assert.ok(result.migrationXml.includes('ADD (new)'), 'Legend should show ADD');
      assert.ok(result.migrationXml.includes('REMOVE (retire)'), 'Legend should show REMOVE');
    });

    it('uses dashed lines for removed relationships', () => {
      const result = exportToDrawio(ALL_FILES, 'TestVault');
      // Migration diagram may contain dashed edges for removed relationships
      if (result.summary.byMigrationStatus.remove > 0) {
        // There should be dashed styling in the migration XML
        assert.ok(
          result.migrationXml.includes('dashed=1') || result.migrationXml.includes('#b85450'),
          'Migration should use dashed/red styling for removed items'
        );
      }
    });
  });

  describe('generateDrawioSummary', () => {
    it('produces correct counts', () => {
      const model = extractModel(ALL_FILES, 'TestVault');
      const { elements, relationships } = classifyMigration(model, ALL_FILES);
      const summary = generateDrawioSummary(elements, relationships);

      assert.strictEqual(summary.totalElements, elements.length);
      assert.strictEqual(summary.totalRelationships, relationships.length);
      assert.strictEqual(summary.diagramCount, 3);

      // Migration status totals should equal total elements
      const statusTotal = summary.byMigrationStatus.keep + summary.byMigrationStatus.add + summary.byMigrationStatus.remove;
      assert.strictEqual(statusTotal, summary.totalElements, 'Migration status counts should sum to total');
    });

    it('tracks source files', () => {
      const model = extractModel(ALL_FILES, 'TestVault');
      const { elements, relationships } = classifyMigration(model, ALL_FILES);
      const summary = generateDrawioSummary(elements, relationships);

      assert.ok(summary.sourceFiles.length > 0, 'Should track source files');
    });
  });

  describe('formatDrawioSummaryMarkdown', () => {
    it('produces markdown with migration table', () => {
      const model = extractModel(ALL_FILES, 'TestVault');
      const { elements, relationships } = classifyMigration(model, ALL_FILES);
      const summary = generateDrawioSummary(elements, relationships);
      const md = formatDrawioSummaryMarkdown(summary);

      assert.ok(md.includes('Draw.io Export Summary'), 'Should contain title');
      assert.ok(md.includes('Migration Classification'), 'Should contain migration section');
      assert.ok(md.includes('Keep'), 'Should mention Keep status');
      assert.ok(md.includes('Add'), 'Should mention Add status');
      assert.ok(md.includes('Remove'), 'Should mention Remove status');
      assert.ok(md.includes('As-Is Architecture'), 'Should mention As-Is diagram');
      assert.ok(md.includes('Target Architecture'), 'Should mention Target diagram');
      assert.ok(md.includes('Migration Architecture'), 'Should mention Migration diagram');
    });
  });

  describe('edge cases', () => {
    it('handles empty vault gracefully', () => {
      const result = exportToDrawio([], 'EmptyVault');
      assert.ok(result.asIsXml.includes('<?xml'), 'Should produce valid XML even for empty vault');
      assert.strictEqual(result.summary.totalElements, 0);
    });

    it('handles vault with no gap analysis', () => {
      const simpleFile = makeFile(
        'B1_Business_Architecture.md',
        `---
togaf_phase: B
artifact_type: deliverable
version: 0.1.0
status: draft
---
# Business Architecture

| Process | Description |
|---------|-------------|
| User Onboarding | Registration flow |
`
      );
      const result = exportToDrawio([simpleFile], 'SimpleVault');
      assert.ok(result.summary.totalElements > 0, 'Should extract elements');
      // All should be "keep" since no gap analysis
      assert.strictEqual(result.summary.byMigrationStatus.add, 0, 'No adds without gaps');
      assert.strictEqual(result.summary.byMigrationStatus.remove, 0, 'No removes without gaps');
    });
  });
});
