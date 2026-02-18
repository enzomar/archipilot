/**
 * Tests for TOGAF TODO extractor.
 * Validates extraction of open decisions, risks, questions, work packages,
 * milestones, requirements, compliance items, document maturity, and ownership.
 *
 * Run: npm test
 */
import assert from 'node:assert';
import { describe, it } from 'node:test';

import {
  extractTodos,
  formatTodoMarkdown,
} from '../core/todo-extractor.js';
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

const DECISION_LOG = makeFile(
  'X1_ADR_Decision_Log.md',
  `---
type: decision-log
togaf_phase: cross-phase
status: draft
owner: TBD
---

# Architecture Decision Log

## AD-01 — Architectural Positioning

| Field | Value |
|-------|-------|
| **Status** | ✅ Decided |
| **Owner** | Vincenzo |
| **Phase** | A (Architecture Vision) |
| **Priority** | High |

### Decision
Option B selected.

---

## AD-02 — AI Vendor Strategy

| Field | Value |
|-------|-------|
| **Status** | 🟡 Open |
| **Owner** | TBD |
| **Phase** | D (Technology Architecture) |
| **Priority** | High |

### Context
Need to choose AI vendor.

---

## AD-03 — MCP Strategy

| Field | Value |
|-------|-------|
| **Status** | 🟡 Open |
| **Owner** | Vincenzo |
| **Phase** | E (Opportunities & Solutions) |
| **Priority** | Medium |

### Context
Integration protocol choice.
`
);

const RISK_REGISTER = makeFile(
  'X2_Risk_Issue_Register.md',
  `---
type: risk-register
togaf_phase: cross-phase
status: draft
owner: TBD
---

# Risk & Issue Register

## Risk Register

| ID | Risk | Probability | Impact | Severity | Mitigation | Owner | Status |
|----|------|-------------|--------|----------|------------|-------|--------|
| R-01 | **Model hallucination** — AI generates incorrect info | High | High | 🔴 Critical | Guardrails, fact-grounding | TBD | Open |
| R-02 | **Data leakage** — PII exposed via prompts | Medium | Critical | 🔴 Critical | Prompt sanitization | Security | Open |
| R-03 | **Vendor lock-in** | Medium | Medium | 🟡 Medium | Abstraction layer | TBD | Open |
| R-04 | **Latency** — Slow responses | Medium | High | 🟠 High | Caching | TBD | Mitigated |
`
);

const OPEN_QUESTIONS = makeFile(
  'X3_Open_Questions.md',
  `---
type: open-questions
togaf_phase: cross-phase
status: draft
owner: Vincenzo
---

# Open Questions

## Strategic (Phase A)

| ID | Question | Phase | Owner | Target Date | Status |
|----|----------|-------|-------|-------------|--------|
| Q-01 | Is this Loyalty-only or enterprise-wide? | A | TBD | TBD | 🟡 Open |
| Q-02 | Feature or platform? | A | TBD | TBD | ✅ Resolved |

## Technology (Phase D)

| ID | Question | Phase | Owner | Target Date | Status |
|----|----------|-------|-------|-------------|--------|
| Q-10 | Cloud vs. hybrid deployment? | D | TBD | TBD | 🟡 Open |
`
);

const ROADMAP = makeFile(
  'F1_Architecture_Roadmap.md',
  `---
type: architecture-roadmap
togaf_phase: F
status: draft
owner: TBD
---

# Architecture Roadmap

## Phase 1 — Architecture Definition (Target: Q1 2026)

**Objective:** Formalize target architecture.

| Work Package | Duration | Dependencies | Owner | Status |
|-------------|----------|--------------|-------|--------|
| Finalize Architecture Vision | 4 weeks | — | Vincenzo | In progress |
| Resolve AD-01 (Positioning) | 2 weeks | Stakeholder input | Vincenzo | ✅ Decided |
| Resolve AD-02 (Vendor Strategy) | 3 weeks | Market analysis | TBD | Not started |

## Phase 2 — Controlled Pilot (Target: Q2 2026)

**Objective:** Limited deployment.

| Work Package | Duration | Dependencies | Owner | Status |
|-------------|----------|--------------|-------|--------|
| Build Context Engine | 6 weeks | Phase 1 | AI Team | Not started |

## Key Milestones

| Milestone | Target Date | Phase | Status |
|-----------|-------------|-------|--------|
| Architecture Vision approved | 2026-03-31 | 1 | Pending |
| AD-01 Positioning decided | 2026-03-10 | 1 | ✅ Decided |
| Pilot go-live | 2026-06-30 | 2 | Pending |
`
);

const REQUIREMENTS = makeFile(
  'R1_Architecture_Requirements.md',
  `---
type: architecture-requirements
togaf_phase: requirements-management
status: draft
owner: TBD
---

# Architecture Requirements Specification

## Functional Requirements

| ID | Requirement | Priority | Source | Phase | Status |
|----|-------------|----------|--------|-------|--------|
| FR-01 | AI provides context summary | Must | Scenario 1 | 2 | Open |
| FR-02 | AI suggests responses | Must | Scenario 1 | 2 | Open |
| FR-03 | AI validates rules | Must | Scenario 2 | 3 | Closed |

## Non-Functional Requirements

| ID | Category | Requirement | Target | Measure | Status |
|----|----------|-------------|--------|---------|--------|
| NFR-01 | Performance | Response latency | p95 < 2s | Latency | Open |
| NFR-02 | Availability | AI service uptime | 99.9% | Uptime % | Open |
`
);

const COMPLIANCE = makeFile(
  'G1_Compliance_Assessment.md',
  `---
type: compliance-assessment
togaf_phase: G
status: draft
owner: TBD
---

# Implementation Governance & Compliance

## Compliance Checklist

| # | Criterion | Status | Evidence | Reviewer |
|---|-----------|--------|----------|----------|
| 1 | Follows Architecture Principles | ⬜ | | |
| 2 | Security controls implemented | ✅ | Done | Security |
| 3 | Data governance applied | ⬜ | | |
`
);

const CHANGE_REQUESTS = makeFile(
  'H1_Change_Request_Log.md',
  `---
type: change-request-log
togaf_phase: H
status: draft
owner: TBD
---

# Architecture Change Request Log

| CR-ID | Date | Requestor | Description | Impact | Priority | Status | Decision |
|-------|------|-----------|-------------|--------|----------|--------|----------|
| CR-01 | 2026-02-15 | DevTeam | Add caching layer | Medium | High | Open | |
`
);

const VISION_APPROVED = makeFile(
  'A1_Architecture_Vision.md',
  `---
type: architecture-vision
togaf_phase: A
status: approved
owner: Vincenzo
---

# Architecture Vision
All good here.
`
);

const ALL_FILES = [
  DECISION_LOG,
  RISK_REGISTER,
  OPEN_QUESTIONS,
  ROADMAP,
  REQUIREMENTS,
  COMPLIANCE,
  CHANGE_REQUESTS,
  VISION_APPROVED,
];

// ── Tests ───────────────────────────────────────────────────────

describe('todo-extractor', () => {
  describe('extractTodos', () => {
    it('should extract open decisions (skipping decided ones)', () => {
      const summary = extractTodos(ALL_FILES);
      const decisions = summary.items.filter((i) => i.category === 'decision');

      assert.strictEqual(decisions.length, 2, 'should find 2 open decisions (AD-02, AD-03)');
      assert.ok(decisions.some((d) => d.id === 'AD-02'), 'should include AD-02');
      assert.ok(decisions.some((d) => d.id === 'AD-03'), 'should include AD-03');
      assert.ok(!decisions.some((d) => d.id === 'AD-01'), 'should NOT include AD-01 (decided)');
    });

    it('should extract open risks (skipping mitigated ones)', () => {
      const summary = extractTodos(ALL_FILES);
      const risks = summary.items.filter((i) => i.category === 'risk' || i.category === 'risk-no-owner');

      assert.strictEqual(risks.length, 3, 'should find 3 open risks (R-01, R-02, R-03)');
      assert.ok(!risks.some((r) => r.id === 'R-04'), 'should NOT include R-04 (mitigated)');
    });

    it('should assign correct priority from severity', () => {
      const summary = extractTodos(ALL_FILES);
      const r01 = summary.items.find((i) => i.id === 'R-01');
      const r03 = summary.items.find((i) => i.id === 'R-03');

      assert.strictEqual(r01?.priority, 'critical', 'R-01 should be critical');
      assert.strictEqual(r03?.priority, 'medium', 'R-03 should be medium');
    });

    it('should extract open questions (skipping resolved ones)', () => {
      const summary = extractTodos(ALL_FILES);
      const questions = summary.items.filter((i) => i.category === 'question');

      assert.strictEqual(questions.length, 2, 'should find 2 open questions (Q-01, Q-10)');
      assert.ok(!questions.some((q) => q.id === 'Q-02'), 'should NOT include Q-02 (resolved)');
    });

    it('should extract pending work packages (skipping decided ones)', () => {
      const summary = extractTodos(ALL_FILES);
      const wps = summary.items.filter((i) => i.category === 'work-package');

      // "Finalize Architecture Vision" (In progress), "Resolve AD-02" (Not started), "Build Context Engine" (Not started)
      // "Resolve AD-01" is ✅ Decided — should be skipped
      assert.strictEqual(wps.length, 3, 'should find 3 pending work packages');
      assert.ok(wps.some((w) => w.title.includes('Finalize Architecture Vision')), 'should include in-progress WP');
      assert.ok(!wps.some((w) => w.title.includes('Resolve AD-01')), 'should NOT include decided WP');
    });

    it('should extract pending milestones (skipping decided ones)', () => {
      const summary = extractTodos(ALL_FILES);
      const milestones = summary.items.filter((i) => i.category === 'milestone');

      assert.strictEqual(milestones.length, 2, 'should find 2 pending milestones');
      assert.ok(milestones.some((m) => m.title.includes('Architecture Vision approved')));
      assert.ok(!milestones.some((m) => m.title.includes('AD-01 Positioning decided')), 'should skip decided milestone');
    });

    it('should extract open requirements (functional + NFR)', () => {
      const summary = extractTodos(ALL_FILES);
      const reqs = summary.items.filter((i) => i.category === 'requirement');

      // FR-01 (Open), FR-02 (Open), NFR-01 (Open), NFR-02 (Open) — FR-03 is Closed
      assert.strictEqual(reqs.length, 4, 'should find 4 open requirements');
      assert.ok(!reqs.some((r) => r.id === 'FR-03'), 'should NOT include FR-03 (closed)');
    });

    it('should extract incomplete compliance items', () => {
      const summary = extractTodos(ALL_FILES);
      const compliance = summary.items.filter((i) => i.category === 'compliance');

      assert.strictEqual(compliance.length, 2, 'should find 2 incomplete compliance checks (⬜)');
    });

    it('should extract open change requests', () => {
      const summary = extractTodos(ALL_FILES);
      const crs = summary.items.filter((i) => i.category === 'change-request');

      assert.strictEqual(crs.length, 1, 'should find 1 open CR');
      assert.strictEqual(crs[0].id, 'CR-01');
    });

    it('should identify draft documents', () => {
      const summary = extractTodos(ALL_FILES);
      const docs = summary.items.filter((i) => i.category === 'document-maturity');

      // All files except A1_Architecture_Vision (approved) are draft
      assert.ok(docs.length >= 5, 'should find multiple draft documents');
      assert.ok(!docs.some((d) => d.sourceFile === 'A1_Architecture_Vision.md'), 'should NOT flag approved docs');
    });

    it('should identify TBD ownership', () => {
      const summary = extractTodos(ALL_FILES);
      const ownership = summary.items.filter((i) => i.category === 'ownership');

      // Multiple files have owner: TBD
      assert.ok(ownership.length >= 3, 'should find files with TBD ownership');
    });

    it('should compute correct total count', () => {
      const summary = extractTodos(ALL_FILES);
      assert.strictEqual(summary.totalCount, summary.items.length);
      assert.ok(summary.totalCount > 0, 'should have items');
    });

    it('should sort by priority (critical first)', () => {
      const summary = extractTodos(ALL_FILES);
      const priorities = summary.items.map((i) => i.priority);
      const order = { critical: 0, high: 1, medium: 2, low: 3 };

      for (let i = 1; i < priorities.length; i++) {
        assert.ok(
          order[priorities[i]] >= order[priorities[i - 1]],
          `Item ${i} (${priorities[i]}) should not precede priority ${priorities[i - 1]}`
        );
      }
    });

    it('should count TBD ownership across all items', () => {
      const summary = extractTodos(ALL_FILES);
      const tbdItems = summary.items.filter((i) => i.owner.toUpperCase() === 'TBD');
      assert.strictEqual(summary.tbd_ownership_count, tbdItems.length);
    });
  });

  describe('extractTodos – edge cases', () => {
    it('should return empty summary for empty vault', () => {
      const summary = extractTodos([]);
      assert.strictEqual(summary.totalCount, 0);
      assert.strictEqual(summary.items.length, 0);
    });

    it('should handle vault with only approved documents', () => {
      const summary = extractTodos([VISION_APPROVED]);
      // No open decisions, risks, etc. — just no draft flag since it's approved
      assert.strictEqual(
        summary.items.filter((i) => i.category === 'document-maturity').length,
        0,
        'approved docs should not appear as TODOs'
      );
    });

    it('should handle decision log with no open decisions', () => {
      const allDecided = makeFile(
        'X1_ADR_Decision_Log.md',
        `---
type: decision-log
togaf_phase: cross-phase
status: approved
owner: Vincenzo
---

# Architecture Decision Log

## AD-01 — Already Decided

| Field | Value |
|-------|-------|
| **Status** | ✅ Decided |
| **Owner** | Vincenzo |
| **Phase** | A (Architecture Vision) |
| **Priority** | High |
`
      );
      const summary = extractTodos([allDecided]);
      assert.strictEqual(
        summary.items.filter((i) => i.category === 'decision').length,
        0,
        'should find no open decisions'
      );
    });
  });

  describe('formatTodoMarkdown', () => {
    it('should produce markdown with header and tables', () => {
      const summary = extractTodos(ALL_FILES);
      const md = formatTodoMarkdown(summary);

      assert.ok(md.includes('TOGAF Architecture TODO List'), 'should have header');
      assert.ok(md.includes('actionable items'), 'should mention item count');
      assert.ok(md.includes('Open Decisions'), 'should have decisions section');
      assert.ok(md.includes('Open Risks'), 'should have risks section');
      assert.ok(md.includes('Priority'), 'should have priority column');
    });

    it('should include phase distribution table', () => {
      const summary = extractTodos(ALL_FILES);
      const md = formatTodoMarkdown(summary);

      assert.ok(md.includes('Distribution by ADM Phase'), 'should have phase distribution');
      assert.ok(md.includes('Cross-phase'), 'should include cross-phase');
    });

    it('should produce empty-ish output for empty vault', () => {
      const summary = extractTodos([]);
      const md = formatTodoMarkdown(summary);

      assert.ok(md.includes('0 actionable items'), 'should show 0 items');
    });
  });
});
