/**
 * Tests for context windowing (vault summarization).
 * Imports production code from src/core/ — no duplicated logic.
 *
 * Run: npm test
 */
import assert from 'node:assert';
import { describe, it } from 'node:test';

import { buildContext, summarizeFile } from '../core/context.js';
import type { VaultFile } from '../types.js';

// ── Test fixtures ───────────────────────────────────────────────

function makeFile(name: string, size: number = 100): VaultFile {
  const yamlBlock = '---\ntogaf_phase: A\nartifact_type: deliverable\nversion: 1.0.0\nstatus: draft\n---\n';
  const body = `# ${name}\n\n## Section 1\n\n${'Content line. '.repeat(Math.max(1, Math.floor((size - yamlBlock.length - 30) / 15)))}\n`;
  return {
    name: `${name}.md`,
    path: `/vault/${name}.md`,
    relativePath: `${name}.md`,
    content: yamlBlock + body,
  };
}

// ── Tests ───────────────────────────────────────────────────────

describe('buildContext', () => {
  it('returns placeholder for empty file list', () => {
    assert.strictEqual(buildContext([]), '(No vault files loaded)');
  });

  it('includes all files when within budget', () => {
    const files = [makeFile('X1_ADR_Decision_Log'), makeFile('A1_Architecture_Vision')];
    const ctx = buildContext(files, 100_000);
    assert.ok(ctx.includes('X1_ADR_Decision_Log'));
    assert.ok(ctx.includes('A1_Architecture_Vision'));
  });

  it('prioritizes X* and 00_ files first', () => {
    const files = [
      makeFile('D1_Technology_Architecture'),
      makeFile('X1_ADR_Decision_Log'),
      makeFile('B1_Business_Architecture'),
    ];
    const ctx = buildContext(files, 100_000);
    const x1Pos = ctx.indexOf('X1_ADR_Decision_Log');
    const d1Pos = ctx.indexOf('D1_Technology_Architecture');
    assert.ok(x1Pos < d1Pos, 'X1 should appear before D1');
  });

  it('summarizes files when budget is tight', () => {
    const files = [
      makeFile('X1_ADR_Decision_Log', 200),
      makeFile('D1_Technology_Architecture', 5000),
      makeFile('D2_Technology_Standards', 5000),
    ];
    const ctx = buildContext(files, 1000);
    // X1 is priority so it's full; D files should be summarized or omitted
    assert.ok(ctx.includes('X1_ADR_Decision_Log'));
    assert.ok(ctx.includes('D1_Technology_Architecture'));
  });

  it('marks omitted files when budget is exhausted', () => {
    const bigFiles = Array.from({ length: 20 }, (_, i) => makeFile(`Z${i}_File`, 10000));
    const ctx = buildContext(bigFiles, 500);
    assert.ok(ctx.includes('content omitted'));
  });
});

describe('summarizeFile', () => {
  it('extracts YAML front matter', () => {
    const file = makeFile('Test');
    const summary = summarizeFile(file);
    assert.ok(summary.includes('togaf_phase'));
    assert.ok(summary.includes('version'));
  });

  it('extracts headings', () => {
    const file = makeFile('Test');
    const summary = summarizeFile(file);
    assert.ok(summary.includes('# Test'));
    assert.ok(summary.includes('## Section 1'));
  });

  it('adds summarized notice', () => {
    const file = makeFile('Test');
    const summary = summarizeFile(file);
    assert.ok(summary.includes('summarized'));
  });
});
