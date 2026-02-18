/**
 * Tests for ArchiMate Open Exchange Format exporter.
 * Validates parsing, extraction, serialization, and summary generation.
 *
 * Run: npm test
 */
import assert from 'node:assert';
import { describe, it, beforeEach } from 'node:test';

import {
  extractModel,
  serializeToXml,
  exportToArchimate,
  generateExportSummary,
  formatSummaryMarkdown,
  escapeXml,
  parseFrontMatter,
  parseTables,
  parseMermaidGraphs,
  resetIdCounter,
} from '../core/archimate-exporter.js';
import type { ArchiModel } from '../core/archimate-exporter.js';
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

const STAKEHOLDER_FILE = makeFile(
  'A2_Stakeholder_Map.md',
  `---
togaf_phase: A
artifact_type: catalog
version: 0.1.0
status: draft
---
# Stakeholder Map

| Stakeholder | Role | Interest | Concern | Influence |
|-------------|------|----------|---------|-----------|
| CTO | Executive | High | Scalability | High |
| Product Owner | Business | Medium | Features | Medium |
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

| ID | Principle | Rationale | Implications |
|----|-----------|-----------|--------------|
| P-01 | Cloud-First | Reduce on-premises costs | All new services deployed to cloud |
| P-02 | API-Driven | Enable integration | Every service must expose REST APIs |
`
);

const BUSINESS_FILE = makeFile(
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

## Gap Analysis

| Baseline | Target | Gap | Action |
|----------|--------|-----|--------|
| Manual onboarding | Automated onboarding | No automation | Implement self-service portal |
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

## Target Components

| Component | Purpose | Interfaces | Owner |
|-----------|---------|------------|-------|
| API Gateway | Central entry point | REST API, GraphQL | Platform Team |
| User Service | Manage users | REST API | Identity Team |
| Order Service | Process orders | REST API, Events | Commerce Team |

\`\`\`mermaid
graph TD
    GW[API Gateway] --> US[User Service]
    GW --> OS[Order Service]
    US -->|events| OS
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

## Platform Components

| Component | Technology | Environment | Scaling | SLA |
|-----------|-----------|-------------|---------|-----|
| Kubernetes Cluster | EKS | Production | Auto-scaling | 99.9% |
| PostgreSQL Database | RDS | Production | Read replicas | 99.95% |
| API Gateway | Kong | Production | Horizontal | 99.9% |
`
);

const SOLUTIONS_FILE = makeFile(
  'E1_Solutions_Building_Blocks.md',
  `---
togaf_phase: E
artifact_type: catalog
version: 0.1.0
status: draft
---
# Solutions Building Blocks

## ABB to SBB Mapping

| ABB | SBB | Vendor | Buy/Build | Status |
|-----|-----|--------|-----------|--------|
| Identity Provider | Auth0 | Auth0 Inc | Buy | Active |
| Container Platform | EKS | AWS | Buy | Active |
| API Management | Kong Gateway | Kong Inc | Buy | Evaluating |
`
);

const REQUIREMENTS_FILE = makeFile(
  'R1_Architecture_Requirements.md',
  `---
togaf_phase: Requirements
artifact_type: catalog
version: 0.1.0
status: draft
---
# Architecture Requirements

## Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | Single sign-on for all services | High | Approved |
| FR-02 | Real-time order tracking | Medium | Draft |

## Non-Functional Requirements

| ID | Requirement | Category | Target |
|----|-------------|----------|--------|
| NFR-01 | Response time | NFR | p95 < 2s |
| NFR-02 | Availability | NFR | 99.9% |
`
);

const DECISION_LOG_FILE = makeFile(
  'X1_ADR_Decision_Log.md',
  `---
togaf_phase: Cross-Phase
artifact_type: deliverable
version: 0.1.0
status: draft
---
# ADR Decision Log

## AD-01: Container Orchestration Platform

**Status**: Decided

Selected Kubernetes (EKS) for container orchestration.

## AD-02: API Gateway Selection

**Status**: Open

Evaluating Kong vs AWS API Gateway.
`
);

const RISK_FILE = makeFile(
  'X2_Risk_Issue_Register.md',
  `---
togaf_phase: Cross-Phase
artifact_type: catalog
version: 0.1.0
status: draft
---
# Risk Register

| Risk | Probability | Impact | Mitigation | Owner |
|------|------------|--------|------------|-------|
| Vendor lock-in | Medium | High | Multi-cloud strategy | CTO |
| Skill gap | High | Medium | Training programme | HR |
`
);

const ALL_FILES = [
  STAKEHOLDER_FILE,
  PRINCIPLES_FILE,
  BUSINESS_FILE,
  APPLICATION_FILE,
  TECHNOLOGY_FILE,
  SOLUTIONS_FILE,
  REQUIREMENTS_FILE,
  DECISION_LOG_FILE,
  RISK_FILE,
];

// ── Helper parsers ──────────────────────────────────────────────

describe('escapeXml', () => {
  it('escapes ampersand', () => {
    assert.strictEqual(escapeXml('A & B'), 'A &amp; B');
  });

  it('escapes angle brackets', () => {
    assert.strictEqual(escapeXml('<tag>'), '&lt;tag&gt;');
  });

  it('escapes quotes', () => {
    assert.strictEqual(escapeXml('"hello" \'world\''), '&quot;hello&quot; &apos;world&apos;');
  });

  it('handles empty string', () => {
    assert.strictEqual(escapeXml(''), '');
  });
});

describe('parseFrontMatter', () => {
  it('extracts YAML key-value pairs', () => {
    const fm = parseFrontMatter('---\ntogaf_phase: A\nversion: 1.0.0\n---\n# Title');
    assert.strictEqual(fm['togaf_phase'], 'A');
    assert.strictEqual(fm['version'], '1.0.0');
  });

  it('returns empty object if no front matter', () => {
    const fm = parseFrontMatter('# Just a heading\nSome content.');
    assert.deepStrictEqual(fm, {});
  });

  it('strips surrounding quotes from values', () => {
    const fm = parseFrontMatter('---\ntitle: "My Project"\nstatus: \'draft\'\n---\n');
    assert.strictEqual(fm['title'], 'My Project');
    assert.strictEqual(fm['status'], 'draft');
  });
});

describe('parseTables', () => {
  it('parses a simple markdown table', () => {
    const content = `| Name | Age |\n|------|-----|\n| Alice | 30 |\n| Bob | 25 |\n`;
    const tables = parseTables(content);
    assert.strictEqual(tables.length, 1);
    assert.strictEqual(tables[0].length, 2);
    assert.strictEqual(tables[0][0]['Name'], 'Alice');
    assert.strictEqual(tables[0][1]['Age'], '25');
  });

  it('handles multiple tables', () => {
    const content = `| A |\n|---|\n| 1 |\n\nSome text.\n\n| B |\n|---|\n| 2 |\n`;
    const tables = parseTables(content);
    assert.strictEqual(tables.length, 2);
  });

  it('returns empty array when no tables', () => {
    const tables = parseTables('Just plain text\nNo tables here.');
    assert.strictEqual(tables.length, 0);
  });
});

describe('parseMermaidGraphs', () => {
  it('parses a simple graph TD', () => {
    const content = '```mermaid\ngraph TD\n    A[Frontend] --> B[Backend]\n```\n';
    const graphs = parseMermaidGraphs(content);
    assert.strictEqual(graphs.length, 1);
    assert.ok(graphs[0].nodes.length >= 2);
    assert.strictEqual(graphs[0].edges.length, 1);
    assert.strictEqual(graphs[0].edges[0].from, 'A');
    assert.strictEqual(graphs[0].edges[0].to, 'B');
  });

  it('detects subgraph membership', () => {
    const content = '```mermaid\ngraph TD\n    subgraph Platform\n    A[Service] --> B[DB]\n    end\n```\n';
    const graphs = parseMermaidGraphs(content);
    assert.strictEqual(graphs.length, 1);
    const platformNodes = graphs[0].nodes.filter((n) => n.subgraph === 'Platform');
    assert.ok(platformNodes.length >= 1);
  });

  it('returns empty array for non-graph mermaid', () => {
    const content = '```mermaid\nsequenceDiagram\n    Alice->>Bob: Hello\n```\n';
    const graphs = parseMermaidGraphs(content);
    assert.strictEqual(graphs.length, 0);
  });

  it('returns empty for no mermaid blocks', () => {
    const graphs = parseMermaidGraphs('No code blocks here.');
    assert.strictEqual(graphs.length, 0);
  });
});

// ── Model extraction ────────────────────────────────────────────

describe('extractModel', () => {
  beforeEach(() => resetIdCounter());

  it('returns a valid model from empty file list', () => {
    const model = extractModel([], 'Empty');
    assert.strictEqual(model.name, 'Empty');
    assert.strictEqual(model.elements.length, 0);
    assert.strictEqual(model.relationships.length, 0);
  });

  it('extracts stakeholders from A2 file', () => {
    const model = extractModel([STAKEHOLDER_FILE], 'Test');
    const stakeholders = model.elements.filter((e) => e.type === 'Stakeholder');
    assert.ok(stakeholders.length >= 2, `Expected >= 2 stakeholders, got ${stakeholders.length}`);
    assert.ok(stakeholders.some((s) => s.name === 'CTO'));
    assert.ok(stakeholders.some((s) => s.name === 'Product Owner'));
  });

  it('creates Driver elements from stakeholder concerns', () => {
    const model = extractModel([STAKEHOLDER_FILE], 'Test');
    const drivers = model.elements.filter((e) => e.type === 'Driver');
    assert.ok(drivers.length >= 1, 'Expected at least one Driver from stakeholder concerns');
    assert.ok(drivers.some((d) => d.name === 'Scalability'));
  });

  it('extracts principles from P1 file', () => {
    const model = extractModel([PRINCIPLES_FILE], 'Test');
    const principles = model.elements.filter((e) => e.type === 'Principle');
    assert.ok(principles.length >= 2, `Expected >= 2 principles, got ${principles.length}`);
    assert.ok(principles.some((p) => p.name.includes('Cloud-First')));
    assert.ok(principles.some((p) => p.name.includes('API-Driven')));
  });

  it('extracts business processes from B1 file', () => {
    const model = extractModel([BUSINESS_FILE], 'Test');
    const processes = model.elements.filter((e) => e.type === 'BusinessProcess');
    assert.ok(processes.length >= 2, `Expected >= 2 processes, got ${processes.length}`);
    assert.ok(processes.some((p) => p.name === 'User Onboarding'));
  });

  it('extracts gap elements from gap analysis tables', () => {
    const model = extractModel([BUSINESS_FILE], 'Test');
    const gaps = model.elements.filter((e) => e.type === 'Gap');
    assert.ok(gaps.length >= 1, `Expected >= 1 Gap, got ${gaps.length}`);
    assert.ok(gaps.some((g) => g.name === 'No automation'));
  });

  it('extracts application components from C1 file', () => {
    const model = extractModel([APPLICATION_FILE], 'Test');
    const components = model.elements.filter((e) => e.type === 'ApplicationComponent');
    assert.ok(components.length >= 3, `Expected >= 3 components, got ${components.length}`);
    assert.ok(components.some((c) => c.name === 'API Gateway'));
  });

  it('creates ApplicationInterface elements from interface columns', () => {
    const model = extractModel([APPLICATION_FILE], 'Test');
    const interfaces = model.elements.filter((e) => e.type === 'ApplicationInterface');
    assert.ok(interfaces.length >= 1, `Expected >= 1 interface, got ${interfaces.length}`);
  });

  it('extracts technology nodes from D1 file', () => {
    const model = extractModel([TECHNOLOGY_FILE], 'Test');
    const techElements = model.elements.filter((e) => e.layer === 'Technology');
    assert.ok(techElements.length >= 3, `Expected >= 3 tech elements, got ${techElements.length}`);
  });

  it('maps technology types intelligently (SystemSoftware for databases)', () => {
    const model = extractModel([TECHNOLOGY_FILE], 'Test');
    const dbEl = model.elements.find((e) => e.name.includes('PostgreSQL'));
    assert.ok(dbEl, 'Expected a PostgreSQL element');
    assert.strictEqual(dbEl.type, 'SystemSoftware');
  });

  it('extracts SBB deliverables from E1 file', () => {
    const model = extractModel([SOLUTIONS_FILE], 'Test');
    const deliverables = model.elements.filter((e) => e.type === 'Deliverable');
    assert.ok(deliverables.length >= 3, `Expected >= 3 deliverables, got ${deliverables.length}`);
    assert.ok(deliverables.some((d) => d.name === 'Auth0'));
  });

  it('creates RealizationRelationships for ABB→SBB', () => {
    const model = extractModel([SOLUTIONS_FILE], 'Test');
    const realizations = model.relationships.filter((r) => r.type === 'RealizationRelationship');
    assert.ok(realizations.length >= 3, `Expected >= 3 realizations, got ${realizations.length}`);
  });

  it('extracts requirements from R1 file', () => {
    const model = extractModel([REQUIREMENTS_FILE], 'Test');
    const reqs = model.elements.filter((e) => e.type === 'Requirement');
    assert.ok(reqs.length >= 2, `Expected >= 2 requirements, got ${reqs.length}`);
    assert.ok(reqs.some((r) => r.name.includes('FR-01')));
  });

  it('extracts NFRs as Constraint type', () => {
    const model = extractModel([REQUIREMENTS_FILE], 'Test');
    const constraints = model.elements.filter((e) => e.type === 'Constraint');
    assert.ok(constraints.length >= 2, `Expected >= 2 constraints (NFRs), got ${constraints.length}`);
  });

  it('extracts decisions from X1 file', () => {
    const model = extractModel([DECISION_LOG_FILE], 'Test');
    const assessments = model.elements.filter((e) => e.type === 'Assessment');
    assert.ok(assessments.length >= 2, `Expected >= 2 assessments, got ${assessments.length}`);
    assert.ok(assessments.some((a) => a.name.includes('AD-01')));
    assert.ok(assessments.some((a) => a.name.includes('AD-02')));
  });

  it('extracts risks from X2 file', () => {
    const model = extractModel([RISK_FILE], 'Test');
    const assessments = model.elements.filter((e) => e.type === 'Assessment');
    assert.ok(assessments.length >= 2, `Expected >= 2 risk assessments, got ${assessments.length}`);
    assert.ok(assessments.some((a) => a.name.includes('Vendor lock-in')));
  });

  it('produces a comprehensive model from all files', () => {
    const model = extractModel(ALL_FILES, 'Full Test');
    assert.ok(model.elements.length >= 20, `Expected >= 20 elements, got ${model.elements.length}`);
    assert.ok(model.relationships.length >= 5, `Expected >= 5 relationships, got ${model.relationships.length}`);
    assert.ok(model.views.length >= 1, `Expected >= 1 view, got ${model.views.length}`);
  });

  it('covers multiple layers in a full export', () => {
    const model = extractModel(ALL_FILES, 'Full Test');
    const layers = new Set(model.elements.map((e) => e.layer));
    assert.ok(layers.has('Business'), 'Missing Business layer');
    assert.ok(layers.has('Application'), 'Missing Application layer');
    assert.ok(layers.has('Technology'), 'Missing Technology layer');
    assert.ok(layers.has('Motivation'), 'Missing Motivation layer');
  });

  it('infers cross-layer relationships', () => {
    const model = extractModel(ALL_FILES, 'Full Test');
    // Should have cross-layer rels from nameOverlap heuristic (e.g. API Gateway in C1 + D1)
    const crossRels = model.relationships.filter((r) => r.id.includes('xrel'));
    assert.ok(crossRels.length >= 1, `Expected >= 1 cross-layer rel, got ${crossRels.length}`);
  });

  it('sets metadata correctly', () => {
    const model = extractModel(ALL_FILES, 'Meta Test');
    assert.strictEqual(model.name, 'Meta Test');
    assert.strictEqual(model.metadata.vaultFileCount, ALL_FILES.length);
    assert.ok(model.metadata.exportedAt);
    assert.strictEqual(model.metadata.generatorVersion, '0.5.0-beta');
  });
});

// ── XML serialization ───────────────────────────────────────────

describe('serializeToXml', () => {
  beforeEach(() => resetIdCounter());

  it('produces valid XML with declaration', () => {
    const model = extractModel([], 'Empty');
    const xml = serializeToXml(model);
    assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  });

  it('contains ArchiMate 3.0 namespace', () => {
    const model = extractModel([], 'Empty');
    const xml = serializeToXml(model);
    assert.ok(xml.includes('xmlns="http://www.opengroup.org/xsd/archimate/3.0/"'));
  });

  it('includes elements section', () => {
    const model = extractModel([STAKEHOLDER_FILE], 'Test');
    const xml = serializeToXml(model);
    assert.ok(xml.includes('<elements>'), 'Missing <elements> section');
    assert.ok(xml.includes('</elements>'), 'Missing </elements>');
    assert.ok(xml.includes('xsi:type="Stakeholder"'), 'Missing Stakeholder type');
  });

  it('includes relationships section', () => {
    const model = extractModel([APPLICATION_FILE], 'Test');
    const xml = serializeToXml(model);
    assert.ok(xml.includes('<relationships>'), 'Missing <relationships> section');
    assert.ok(xml.includes('</relationships>'), 'Missing </relationships>');
  });

  it('includes views/diagrams section for non-empty models', () => {
    const model = extractModel(ALL_FILES, 'Test');
    const xml = serializeToXml(model);
    assert.ok(xml.includes('<views>'), 'Missing <views> section');
    assert.ok(xml.includes('<diagrams>'), 'Missing <diagrams> section');
  });

  it('includes property definitions for elements with properties', () => {
    const model = extractModel([STAKEHOLDER_FILE], 'Test');
    const xml = serializeToXml(model);
    assert.ok(xml.includes('<propertyDefinitions>'), 'Missing <propertyDefinitions>');
  });

  it('escapes XML special characters in names', () => {
    const file = makeFile('test.md', '---\n---\n| Stakeholder |\n|---|\n| R&D <Team> |');
    const model = extractModel([file], 'Test');
    // Manually add the file with content that has special chars
    if (model.elements.length === 0) {
      model.elements.push({
        id: 'test-1',
        type: 'Stakeholder',
        name: 'R&D <Team>',
        layer: 'Motivation',
      });
    }
    const xml = serializeToXml(model);
    assert.ok(!xml.includes('<Team>') || xml.includes('&lt;Team&gt;'), 'Should escape angle brackets');
  });

  it('produces closed XML document', () => {
    const model = extractModel(ALL_FILES, 'Test');
    const xml = serializeToXml(model);
    assert.ok(xml.endsWith('</model>'), 'XML should end with </model>');
  });
});

// ── Full pipeline ───────────────────────────────────────────────

describe('exportToArchimate', () => {
  beforeEach(() => resetIdCounter());

  it('returns a complete XML string', () => {
    const xml = exportToArchimate(ALL_FILES, 'Pipeline Test');
    assert.ok(xml.startsWith('<?xml'));
    assert.ok(xml.includes('Pipeline Test'));
    assert.ok(xml.endsWith('</model>'));
  });

  it('contains elements from all phases', () => {
    const xml = exportToArchimate(ALL_FILES, 'Test');
    assert.ok(xml.includes('Stakeholder'), 'Missing stakeholder');
    assert.ok(xml.includes('Principle'), 'Missing principle');
    assert.ok(xml.includes('BusinessProcess'), 'Missing business process');
    assert.ok(xml.includes('ApplicationComponent'), 'Missing app component');
    assert.ok(xml.includes('Assessment'), 'Missing assessment (decision/risk)');
  });
});

// ── Summary generation ──────────────────────────────────────────

describe('generateExportSummary', () => {
  beforeEach(() => resetIdCounter());

  it('counts elements correctly', () => {
    const model = extractModel(ALL_FILES, 'Test');
    const summary = generateExportSummary(model);
    assert.strictEqual(summary.totalElements, model.elements.length);
    assert.strictEqual(summary.totalRelationships, model.relationships.length);
    assert.strictEqual(summary.totalViews, model.views.length);
  });

  it('breaks down by layer', () => {
    const model = extractModel(ALL_FILES, 'Test');
    const summary = generateExportSummary(model);
    assert.ok('Business' in summary.byLayer, 'Missing Business in byLayer');
    assert.ok('Application' in summary.byLayer, 'Missing Application in byLayer');
    assert.ok('Motivation' in summary.byLayer, 'Missing Motivation in byLayer');
  });

  it('breaks down by type', () => {
    const model = extractModel(ALL_FILES, 'Test');
    const summary = generateExportSummary(model);
    assert.ok('Stakeholder' in summary.byType, 'Missing Stakeholder type');
    assert.ok('Principle' in summary.byType, 'Missing Principle type');
  });

  it('lists source files', () => {
    const model = extractModel(ALL_FILES, 'Test');
    const summary = generateExportSummary(model);
    assert.ok(summary.sourceFiles.length >= 5, `Expected >= 5 source files, got ${summary.sourceFiles.length}`);
  });
});

describe('formatSummaryMarkdown', () => {
  beforeEach(() => resetIdCounter());

  it('produces markdown table format', () => {
    const model = extractModel(ALL_FILES, 'Test');
    const summary = generateExportSummary(model);
    const md = formatSummaryMarkdown(summary);
    assert.ok(md.includes('## 📐 ArchiMate Export Summary'));
    assert.ok(md.includes('| Metric | Count |'));
    assert.ok(md.includes('| Elements'));
    assert.ok(md.includes('### By Layer'));
    assert.ok(md.includes('### By Element Type'));
    assert.ok(md.includes('### Source Files'));
  });
});
