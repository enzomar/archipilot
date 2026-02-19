/**
 * Tests for C4, Sizing, and Timeline scaffold extractors.
 *
 * Run: node --import tsx --test src/test/scaffold.test.ts
 */
import assert from 'node:assert';
import { describe, it } from 'node:test';

import {
  extractC4Scaffold,
  formatC4ScaffoldMarkdown,
} from '../core/c4-scaffold.js';
import {
  extractSizingScaffold,
  formatSizingScaffoldMarkdown,
} from '../core/sizing-scaffold.js';
import {
  extractTimelineScaffold,
  formatTimelineScaffoldMarkdown,
} from '../core/timeline-scaffold.js';
import type { VaultFile } from '../types.js';

// ── Helpers ─────────────────────────────────────────────────────

function makeFile(name: string, content: string): VaultFile {
  return { name, path: `/vault/${name}`, relativePath: name, content };
}

// ── Fixtures ────────────────────────────────────────────────────

const A1 = makeFile('A1_Architecture_Vision.md', `---
type: architecture-vision
togaf_phase: A
status: draft
owner: Vincenzo
---
# AI Loyalty Architecture

## Scope
Build an AI-powered loyalty assistant for call center agents.

## Drivers
- Improve first-call resolution
- Reduce average handle time
`);

const A2 = makeFile('A2_Stakeholder_Map.md', `---
type: stakeholder-map
togaf_phase: A
status: draft
owner: TBD
---
# Stakeholder Map

## Stakeholder Catalog

| Stakeholder | Role | Interest | Concern | Influence | Engagement |
|-------------|------|----------|---------|-----------|------------|
| CTO | Executive Sponsor | High | Budget, timeline | High | Collaborate |
| Call Center Director | Business Owner | High | Agent adoption | High | Collaborate |
| Security Team | Technical Reviewer | Medium | Data privacy | Medium | Consult |
`);

const C1 = makeFile('C1_Application_Architecture.md', `---
type: application-architecture
togaf_phase: C
status: review
owner: Vincenzo
---
# Application Architecture

## Target Application Architecture

### Logical Components

| Component | Purpose | Interfaces | Owner |
|-----------|---------|------------|-------|
| Conversational Interface | Agent-facing chat UI | REST API, WebSocket | Frontend Team |
| Context Aggregation Engine | Merges CRM + knowledge | Internal API | AI Team |
| Rule Engine | Business rule evaluation | Internal API | Backend Team |
| Loyalty Knowledge Layer | Knowledge base connector | REST API | Data Team |

### Interaction Diagram

\`\`\`mermaid
graph TD
  CI["Conversational Interface"]
  CA["Context Aggregation Engine"]
  RE["Rule Engine"]
  LK["Loyalty Knowledge Layer"]
  subgraph AI_Layer["AI Assistant Layer"]
    CI --> CA
    CA --> RE
  end
  subgraph Data_Layer["Data Layer"]
    CA --> LK
  end
\`\`\`

## Gap Analysis

| Baseline | Target | Gap | Action |
|----------|--------|-----|--------|
| Manual lookup | AI-assisted lookup | No AI integration | Build Context Aggregation Engine |
`);

const D1 = makeFile('D1_Technology_Architecture.md', `---
type: technology-architecture
togaf_phase: D
status: draft
owner: Vincenzo
---
# Technology Architecture

## Target Technology Architecture

### Platform Components

| Component | Technology | Environment | Scaling | SLA |
|-----------|-----------|-------------|---------|-----|
| API Gateway | Azure APIM | Cloud | Auto-scale | 99.95% |
| LLM Service | Azure OpenAI | Cloud | Horizontal | 99.9% |
| Database | PostgreSQL | Cloud | Vertical | 99.99% |

### Deployment Topology (Target)

\`\`\`mermaid
graph TD
  subgraph Edge["Edge / CDN"]
    LB["Load Balancer"]
  end
  subgraph AppTier["Application Tier"]
    GW["API Gateway"]
    CI["Conversational Interface"]
  end
  LB --> GW
  GW --> CI
\`\`\`
`);

const E1 = makeFile('E1_Solutions_Building_Blocks.md', `---
type: building-blocks
togaf_phase: E
status: draft
owner: Vincenzo
---
# Solutions Building Blocks

## Architecture Building Blocks → Solution Building Blocks

| ABB (Logical) | SBB (Physical) | Vendor / Product | Buy / Build | Status |
|---------------|----------------|------------------|-------------|--------|
| Conversational UI | React Chat Widget | Custom | Build | In progress |
| Context Engine | LangChain Pipeline | LangChain | Build | Not started |
| Knowledge Base | Azure AI Search | Microsoft | Buy | Evaluated |
| LLM Provider | Azure OpenAI GPT-4 | Microsoft | Buy | ✅ Decided |
`);

const E2 = makeFile('E2_Integration_Strategy.md', `---
type: integration-strategy
togaf_phase: E
status: draft
owner: Vincenzo
---
# Integration Strategy

## Integration Catalog

| Source | Target | Pattern | Protocol | Data Format | Frequency |
|--------|--------|---------|----------|-------------|-----------|
| Conversational Interface | Context Aggregation Engine | Sync | REST | JSON | Per-request |
| Context Aggregation Engine | LLM Service | Sync | REST | JSON | Per-request |
| Context Aggregation Engine | CRM System | Sync | REST | JSON | Per-request |

## External System Dependencies

| System | Owner | API Version | SLA | Contract |
|--------|-------|-------------|-----|----------|
| CRM System | CRM Team | v3.2 | 99.9% | Active |
| Telephony Platform | Infra Team | v2.1 | 99.95% | Active |
`);

const B3 = makeFile('B3_Business_Scenarios.md', `---
type: business-scenarios
togaf_phase: B
status: draft
owner: Vincenzo
---
# Business Scenarios

## Scenario 1 — Call Center Agent Assistant

| Field | Value |
|-------|-------|
| **Trigger** | Incoming customer call |
| **Actor(s)** | Call Center Agent, Customer |
| **Pre-conditions** | Agent logged into CRM |
| **Post-conditions** | Issue resolved or escalated |

### Architecture Implications

- Latency-sensitive (real-time)
- Must integrate with existing CRM
- Requires access to loyalty knowledge base
`);

const R1 = makeFile('R1_Architecture_Requirements.md', `---
type: requirements
togaf_phase: requirements-management
status: draft
owner: Vincenzo
---
# Architecture Requirements

## Non-Functional Requirements

| ID | Requirement | Priority | Category |
|----|-------------|----------|----------|
| NFR-01 | Response latency < 500ms p95 | Must | Performance |
| NFR-02 | System availability 99.9% | Must | Availability |
| NFR-03 | Support 500 concurrent agents | Should | Scalability |
| FR-01 | Agent can query customer history | Must | Functional |
`);

const X4 = makeFile('X4_Sizing_Catalogue.md', `---
type: sizing-catalogue
togaf_phase: cross-phase
status: draft
owner: TBD
---
# Sizing Catalogue

## Component Sizing

| Component | Users | Peak TPS | Storage | Compute | Notes |
|-----------|-------|----------|---------|---------|-------|
| Conversational Interface | 500 | 50 | 10 GB | 4 vCPU | TBD |
| Context Aggregation Engine | — | 50 | TBD | TBD | Needs profiling |
| LLM Service | — | 25 | — | GPU | TBD |

## Cost Estimation

| Category | Monthly Cost | Notes |
|----------|-------------|-------|
| LLM API usage | $5,000 | Based on 10K interactions/day |
| Compute | TBD | Pending sizing |
| Storage | TBD | Pending data volume analysis |

## Capacity Planning Assumptions

| Assumption | Value | Source |
|------------|-------|--------|
| Concurrent agents | 500 | Business requirement |
| Avg interactions/agent/day | 20 | Call center metrics |
| Peak multiplier | 3x | Industry benchmark |
`);

const F1 = makeFile('F1_Architecture_Roadmap.md', `---
type: architecture-roadmap
togaf_phase: F
status: draft
owner: Vincenzo
---
# Architecture Roadmap

## Phase 1 — Architecture Definition (Target: Q1 2026)

| Work Package | Duration | Dependencies | Owner | Status |
|-------------|----------|-------------|-------|--------|
| Vision & Scope Definition | 4 weeks | — | Vincenzo | ✅ Decided |
| Stakeholder Alignment | 2 weeks | Vision | PM | In progress |
| Technology Assessment | 3 weeks | — | Tech Lead | Not started |

## Phase 2 — Controlled Pilot (Target: Q2 2026)

| Work Package | Duration | Dependencies | Owner | Status |
|-------------|----------|-------------|-------|--------|
| MVP Development | 6 weeks | Phase 1 | Dev Team | Not started |
| Integration Testing | 3 weeks | MVP | QA Team | Not started |
| Pilot Deployment | 2 weeks | Integration | Ops Team | Not started |

## Phase 3 — Production Rollout (Target: Q3 2026)

| Work Package | Duration | Dependencies | Owner | Status |
|-------------|----------|-------------|-------|--------|
| Performance Tuning | 4 weeks | Phase 2 | Dev Team | Not started |
| Full Deployment | 3 weeks | Tuning | Ops Team | Not started |

## Key Milestones

| Milestone | Target Date | Phase | Status |
|-----------|------------|-------|--------|
| Architecture Approved | 2026-03-15 | 1 | Pending |
| Pilot Go-Live | 2026-06-01 | 2 | Not started |
| Production Launch | 2026-09-01 | 3 | Not started |
`);

const F2 = makeFile('F2_Migration_Plan.md', `---
type: migration-plan
togaf_phase: F
status: draft
owner: Vincenzo
---
# Migration Plan

## Transition Architecture States

| State | Description | Entry Criteria | Exit Criteria |
|-------|------------|----------------|---------------|
| Baseline | Current manual process | — | Phase 1 complete |
| Transition 1 | Pilot with 50 agents | Phase 1 approved | Pilot metrics met |
| Target | Full production rollout | Pilot success | All agents onboarded |
`);

const F3 = makeFile('F3_Architecture_Timeline_Gantt.mermaid', `gantt
  title Architecture Delivery Timeline
  dateFormat YYYY-MM-DD
  axisFormat %b %Y

  section Phase 1
    Vision & Scope          :done, a11, 2026-01-06, 28d
    Stakeholder Alignment   :crit, a12, after a11, 14d
    Technology Assessment   :a13, after a11, 21d

  section Phase 2
    MVP Development         :a21, 2026-04-01, 42d
    Integration Testing     :a22, after a21, 21d
    Pilot Deployment        :a23, after a22, 14d

  section Milestones
    Architecture Approved   :milestone, m1, 2026-03-15, 0d
    Pilot Go-Live           :milestone, m2, 2026-06-01, 0d
    Production Launch       :milestone, m3, 2026-09-01, 0d
`);

const X2 = makeFile('X2_Risk_Issue_Register.md', `---
type: risk-register
togaf_phase: cross-phase
status: draft
owner: TBD
---
# Risk & Issue Register

## Risks

| ID | Risk | Probability | Impact | Mitigation |
|----|------|------------|--------|-----------|
| R-01 | LLM latency exceeds SLA | Medium | High | Caching strategy, fallback |
| R-02 | Data privacy breach | Low | Critical | Encryption, audit logging |
| R-03 | Vendor lock-in with Azure | Medium | Medium | Abstraction layer |
`);

const X3 = makeFile('X3_Open_Questions.md', `---
type: open-questions
togaf_phase: cross-phase
status: draft
owner: TBD
---
# Open Questions

| ID | Question | Owner | Target Date |
|----|---------|-------|------------|
| Q-01 | What is the target schedule for Phase 2 delivery? | PM | 2026-02-28 |
| Q-02 | Do we need a dedicated ML ops team? | CTO | 2026-03-15 |
| Q-03 | Should we use managed or self-hosted LLM? | Tech Lead | 2026-02-15 |
`);

const ALL_FILES: VaultFile[] = [A1, A2, C1, D1, E1, E2, B3, R1, X4, F1, F2, F3, X2, X3];

// ════════════════════════════════════════════════════════════════
// C4 Scaffold Tests
// ════════════════════════════════════════════════════════════════

describe('extractC4Scaffold', () => {
  it('extracts system name from A1', () => {
    const scaffold = extractC4Scaffold(ALL_FILES);
    assert.ok(scaffold.systemName.length > 0, 'systemName should not be empty');
  });

  it('extracts persons/stakeholders from A2', () => {
    const scaffold = extractC4Scaffold(ALL_FILES);
    assert.ok(scaffold.persons.length >= 3, `Expected >= 3 persons, got ${scaffold.persons.length}`);
    assert.ok(scaffold.persons.some((p) => p.name === 'CTO'));
    assert.ok(scaffold.persons.some((p) => p.role === 'Executive Sponsor'));
  });

  it('extracts external systems from E2', () => {
    const scaffold = extractC4Scaffold(ALL_FILES);
    assert.ok(scaffold.externalSystems.length >= 2);
    assert.ok(scaffold.externalSystems.some((s) => s.name === 'CRM System'));
    assert.ok(scaffold.externalSystems.some((s) => s.name === 'Telephony Platform'));
  });

  it('extracts containers from C1', () => {
    const scaffold = extractC4Scaffold(ALL_FILES);
    assert.ok(scaffold.containers.length >= 4, `Expected >= 4 containers, got ${scaffold.containers.length}`);
    assert.ok(scaffold.containers.some((c) => c.name === 'Conversational Interface'));
    assert.ok(scaffold.containers.some((c) => c.name === 'Context Aggregation Engine'));
  });

  it('extracts platform components from D1', () => {
    const scaffold = extractC4Scaffold(ALL_FILES);
    assert.ok(scaffold.platformComponents.length >= 3);
    assert.ok(scaffold.platformComponents.some((c) => c.name === 'API Gateway'));
    assert.ok(scaffold.platformComponents.some((c) => c.technology === 'Azure APIM'));
  });

  it('extracts ABB→SBB building blocks from E1', () => {
    const scaffold = extractC4Scaffold(ALL_FILES);
    assert.ok(scaffold.components.length >= 4);
    assert.ok(scaffold.components.some((c) => c.abb === 'LLM Provider'));
    assert.ok(scaffold.components.some((c) => c.sbb === 'Azure AI Search'));
  });

  it('extracts integrations from E2', () => {
    const scaffold = extractC4Scaffold(ALL_FILES);
    assert.ok(scaffold.integrations.length >= 3);
    const edge = scaffold.integrations.find(
      (i) => i.source === 'Conversational Interface' && i.target === 'Context Aggregation Engine'
    );
    assert.ok(edge, 'Should find CI → CAE integration');
    assert.strictEqual(edge!.protocol, 'REST');
  });

  it('extracts Mermaid graphs from C1 and D1', () => {
    const scaffold = extractC4Scaffold(ALL_FILES);
    assert.ok(scaffold.graphs.length >= 2, `Expected >= 2 graphs, got ${scaffold.graphs.length}`);
    assert.ok(scaffold.graphs.some((g) => g.sourceFile === 'C1_Application_Architecture.md'));
    assert.ok(scaffold.graphs.some((g) => g.sourceFile === 'D1_Technology_Architecture.md'));
  });

  it('extracts deployment zones from D1', () => {
    const scaffold = extractC4Scaffold(ALL_FILES);
    assert.ok(scaffold.deploymentZones.length >= 2);
  });

  it('tracks source files', () => {
    const scaffold = extractC4Scaffold(ALL_FILES);
    assert.ok(scaffold.sourceFiles.includes('C1_Application_Architecture.md'));
    assert.ok(scaffold.sourceFiles.includes('E2_Integration_Strategy.md'));
  });

  it('handles empty vault gracefully', () => {
    const scaffold = extractC4Scaffold([]);
    assert.strictEqual(scaffold.persons.length, 0);
    assert.strictEqual(scaffold.containers.length, 0);
    assert.strictEqual(scaffold.systemName, 'System');
  });

  it('formats scaffold as markdown', () => {
    const scaffold = extractC4Scaffold(ALL_FILES);
    const md = formatC4ScaffoldMarkdown(scaffold);
    assert.ok(md.includes('## 📐 C4 Model Scaffold'));
    assert.ok(md.includes('Level 1 — System Context'));
    assert.ok(md.includes('Level 2 — Containers'));
    assert.ok(md.includes('Integration Edges'));
    assert.ok(md.includes('Conversational Interface'));
  });
});

// ════════════════════════════════════════════════════════════════
// Sizing Scaffold Tests
// ════════════════════════════════════════════════════════════════

describe('extractSizingScaffold', () => {
  it('extracts existing sizing data from X4', () => {
    const scaffold = extractSizingScaffold(ALL_FILES);
    assert.ok(scaffold.hasExistingSizing);
    const ci = scaffold.components.find((c) => c.name === 'Conversational Interface');
    assert.ok(ci, 'Should find CI component');
    assert.strictEqual(ci!.users, '500');
    assert.strictEqual(ci!.peakTps, '50');
  });

  it('merges component inventory from C1/D1/E1 with X4', () => {
    const scaffold = extractSizingScaffold(ALL_FILES);
    // X4 has 3 components, C1 adds more, D1 adds more, E1 adds more (deduped)
    assert.ok(scaffold.components.length >= 3, `Expected >= 3 merged components, got ${scaffold.components.length}`);
  });

  it('extracts cost estimates from X4', () => {
    const scaffold = extractSizingScaffold(ALL_FILES);
    assert.ok(scaffold.costs.length >= 3);
    const llmCost = scaffold.costs.find((c) => /LLM/i.test(c.category));
    assert.ok(llmCost, 'Should find LLM API cost');
    assert.ok(llmCost!.monthlyCost.includes('5,000'));
  });

  it('extracts capacity assumptions from X4', () => {
    const scaffold = extractSizingScaffold(ALL_FILES);
    assert.ok(scaffold.assumptions.length >= 3);
    assert.ok(scaffold.assumptions.some((a) => /concurrent/i.test(a.assumption)));
    assert.ok(scaffold.assumptions.some((a) => a.value === '500'));
  });

  it('extracts NFR performance targets from R1', () => {
    const scaffold = extractSizingScaffold(ALL_FILES);
    assert.ok(scaffold.nfrTargets.length >= 2, `Expected >= 2 NFR targets, got ${scaffold.nfrTargets.length}`);
    assert.ok(scaffold.nfrTargets.some((n) => /latency/i.test(n.description)));
    assert.ok(scaffold.nfrTargets.some((n) => /availability|99\.9/i.test(n.description)));
  });

  it('does not include functional requirements as NFR targets', () => {
    const scaffold = extractSizingScaffold(ALL_FILES);
    assert.ok(!scaffold.nfrTargets.some((n) => n.id === 'FR-01'));
  });

  it('extracts scenario hints from B3', () => {
    const scaffold = extractSizingScaffold(ALL_FILES);
    assert.ok(scaffold.scenarioHints.length >= 1);
    const s1 = scaffold.scenarioHints[0];
    assert.ok(/call center/i.test(s1.name));
    assert.ok(s1.implications.length >= 1);
  });

  it('extracts technology stack from D1', () => {
    const scaffold = extractSizingScaffold(ALL_FILES);
    assert.ok(scaffold.technologyStack.length >= 3);
    const gw = scaffold.technologyStack.find((t) => t.name === 'API Gateway');
    assert.ok(gw);
    assert.strictEqual(gw!.technology, 'Azure APIM');
  });

  it('handles vault without X4 gracefully', () => {
    const filesNoX4 = ALL_FILES.filter((f) => !/X4_/i.test(f.name));
    const scaffold = extractSizingScaffold(filesNoX4);
    assert.ok(!scaffold.hasExistingSizing);
    // Should still have components from C1/D1/E1
    assert.ok(scaffold.components.length > 0);
  });

  it('handles empty vault gracefully', () => {
    const scaffold = extractSizingScaffold([]);
    assert.strictEqual(scaffold.components.length, 0);
    assert.strictEqual(scaffold.costs.length, 0);
    assert.ok(!scaffold.hasExistingSizing);
  });

  it('formats scaffold as markdown', () => {
    const scaffold = extractSizingScaffold(ALL_FILES);
    const md = formatSizingScaffoldMarkdown(scaffold);
    assert.ok(md.includes('## 📊 Sizing Scaffold'));
    assert.ok(md.includes('Component Inventory'));
    assert.ok(md.includes('Technology Stack'));
    assert.ok(md.includes('Cost Estimation'));
    assert.ok(md.includes('Capacity Planning Assumptions'));
    assert.ok(md.includes('Performance & Quality Targets'));
    assert.ok(md.includes('Business Scenario Load Hints'));
    assert.ok(md.includes('Conversational Interface'));
  });
});

// ════════════════════════════════════════════════════════════════
// Timeline Scaffold Tests
// ════════════════════════════════════════════════════════════════

describe('extractTimelineScaffold', () => {
  it('extracts phases from F1', () => {
    const scaffold = extractTimelineScaffold(ALL_FILES);
    assert.ok(scaffold.phases.length >= 3, `Expected >= 3 phases, got ${scaffold.phases.length}`);
    assert.strictEqual(scaffold.phases[0].number, 1);
    assert.ok(/Architecture Definition/i.test(scaffold.phases[0].name));
    assert.ok(/Q1 2026/i.test(scaffold.phases[0].targetDate));
  });

  it('extracts work packages within phases', () => {
    const scaffold = extractTimelineScaffold(ALL_FILES);
    const phase1 = scaffold.phases.find((p) => p.number === 1);
    assert.ok(phase1);
    assert.ok(phase1!.workPackages.length >= 3);
    const vision = phase1!.workPackages.find((wp) => /Vision/i.test(wp.name));
    assert.ok(vision);
    assert.strictEqual(vision!.duration, '4 weeks');
    assert.ok(/Decided|done|complete/i.test(vision!.status));
  });

  it('counts total work packages', () => {
    const scaffold = extractTimelineScaffold(ALL_FILES);
    assert.ok(scaffold.totalWorkPackages >= 8, `Expected >= 8 WPs, got ${scaffold.totalWorkPackages}`);
  });

  it('extracts milestones from F1', () => {
    const scaffold = extractTimelineScaffold(ALL_FILES);
    assert.ok(scaffold.milestones.length >= 3);
    assert.ok(scaffold.milestones.some((m) => /Architecture Approved/i.test(m.name)));
    assert.ok(scaffold.milestones.some((m) => m.targetDate === '2026-06-01'));
  });

  it('parses existing Gantt from .mermaid file', () => {
    const scaffold = extractTimelineScaffold(ALL_FILES);
    assert.ok(scaffold.existingGantt, 'Should find existing Gantt');
    assert.strictEqual(scaffold.existingGantt!.dateFormat, 'YYYY-MM-DD');
    assert.ok(scaffold.existingGantt!.tasks.length >= 6);
    assert.ok(scaffold.existingGantt!.milestones.length >= 3);
    assert.ok(scaffold.existingGantt!.sections.includes('Phase 1'));
    assert.ok(scaffold.existingGantt!.sections.includes('Phase 2'));
  });

  it('identifies done and crit tasks in Gantt', () => {
    const scaffold = extractTimelineScaffold(ALL_FILES);
    const g = scaffold.existingGantt!;
    const doneTask = g.tasks.find((t) => t.flags.includes('done'));
    assert.ok(doneTask, 'Should find a done task');
    assert.ok(/Vision/i.test(doneTask!.name));

    const critTask = g.tasks.find((t) => t.flags.includes('crit'));
    assert.ok(critTask, 'Should find a critical task');
  });

  it('extracts transition states from F2', () => {
    const scaffold = extractTimelineScaffold(ALL_FILES);
    assert.ok(scaffold.transitionStates.length >= 3);
    assert.ok(scaffold.transitionStates.some((ts) => ts.state === 'Baseline'));
    assert.ok(scaffold.transitionStates.some((ts) => ts.state === 'Target'));
    const t1 = scaffold.transitionStates.find((ts) => ts.state === 'Transition 1');
    assert.ok(t1);
    assert.ok(t1!.entryCriteria.length > 0);
  });

  it('extracts risks from X2', () => {
    const scaffold = extractTimelineScaffold(ALL_FILES);
    assert.ok(scaffold.risks.length >= 3);
    assert.ok(scaffold.risks.some((r) => r.id === 'R-01'));
    assert.ok(scaffold.risks.some((r) => /latency/i.test(r.description)));
  });

  it('extracts timeline-relevant questions from X3', () => {
    const scaffold = extractTimelineScaffold(ALL_FILES);
    assert.ok(scaffold.openQuestions.length >= 1);
    // Q-01 mentions "schedule" which is timeline-relevant
    assert.ok(scaffold.openQuestions.some((q) => q.id === 'Q-01'));
  });

  it('handles vault without F1 gracefully', () => {
    const filesNoF = ALL_FILES.filter((f) => !/F[1-3]_|\.mermaid$/i.test(f.name));
    const scaffold = extractTimelineScaffold(filesNoF);
    assert.strictEqual(scaffold.phases.length, 0);
    assert.strictEqual(scaffold.milestones.length, 0);
    assert.strictEqual(scaffold.existingGantt, null);
  });

  it('handles empty vault gracefully', () => {
    const scaffold = extractTimelineScaffold([]);
    assert.strictEqual(scaffold.phases.length, 0);
    assert.strictEqual(scaffold.totalWorkPackages, 0);
    assert.strictEqual(scaffold.existingGantt, null);
  });

  it('formats scaffold as markdown', () => {
    const scaffold = extractTimelineScaffold(ALL_FILES);
    const md = formatTimelineScaffoldMarkdown(scaffold);
    assert.ok(md.includes('## 📅 Timeline Scaffold'));
    assert.ok(md.includes('Phases & Work Packages'));
    assert.ok(md.includes('Key Milestones'));
    assert.ok(md.includes('Existing Gantt Chart'));
    assert.ok(md.includes('Migration Transition States'));
    assert.ok(md.includes('Risks to Timeline'));
    assert.ok(md.includes('Phase 1'));
    assert.ok(md.includes('Architecture Approved'));
  });

  it('formats scaffold markdown includes Gantt source in details', () => {
    const scaffold = extractTimelineScaffold(ALL_FILES);
    const md = formatTimelineScaffoldMarkdown(scaffold);
    assert.ok(md.includes('<details>'));
    assert.ok(md.includes('Raw Gantt source'));
    assert.ok(md.includes('```mermaid'));
  });
});

// ════════════════════════════════════════════════════════════════
// Cross-cutting Tests
// ════════════════════════════════════════════════════════════════

describe('Scaffold extractors — cross-cutting', () => {
  it('all scaffolds produce non-empty sourceFiles', () => {
    const c4 = extractC4Scaffold(ALL_FILES);
    const sizing = extractSizingScaffold(ALL_FILES);
    const timeline = extractTimelineScaffold(ALL_FILES);
    assert.ok(c4.sourceFiles.length > 0);
    assert.ok(sizing.sourceFiles.length > 0);
    assert.ok(timeline.sourceFiles.length > 0);
  });

  it('all formatters produce valid markdown (no undefined output)', () => {
    const c4Md = formatC4ScaffoldMarkdown(extractC4Scaffold(ALL_FILES));
    const sizingMd = formatSizingScaffoldMarkdown(extractSizingScaffold(ALL_FILES));
    const timelineMd = formatTimelineScaffoldMarkdown(extractTimelineScaffold(ALL_FILES));
    for (const md of [c4Md, sizingMd, timelineMd]) {
      assert.ok(!md.includes('undefined'), `Markdown should not contain "undefined": ${md.slice(0, 200)}`);
      assert.ok(md.length > 100, 'Markdown should be substantial');
    }
  });

  it('all formatters produce valid markdown with empty vault', () => {
    const c4Md = formatC4ScaffoldMarkdown(extractC4Scaffold([]));
    const sizingMd = formatSizingScaffoldMarkdown(extractSizingScaffold([]));
    const timelineMd = formatTimelineScaffoldMarkdown(extractTimelineScaffold([]));
    for (const md of [c4Md, sizingMd, timelineMd]) {
      assert.ok(!md.includes('undefined'));
      assert.ok(md.length > 10);
    }
  });
});
