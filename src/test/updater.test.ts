/**
 * Tests for command parsing and schema validation.
 * Imports production code from src/core/ — no duplicated logic.
 *
 * Run: npm test
 */
import assert from 'node:assert';
import { describe, it } from 'node:test';

import { parseCommands } from '../core/parser.js';
import { validateCommands, validateMetamodel } from '../core/validator.js';
import type { ArchCommand } from '../types.js';

// ── Tests ───────────────────────────────────────────────────────

describe('parseCommands', () => {
  it('extracts a single command from response text', () => {
    const text = `Here is the update:

\`\`\`json
{
  "command": "UPDATE_SECTION",
  "file": "A1_Architecture_Vision.md",
  "section": "## Scope",
  "content": "New scope content"
}
\`\`\`

Done.`;
    const cmds = parseCommands(text);
    assert.strictEqual(cmds.length, 1);
    assert.strictEqual(cmds[0].command, 'UPDATE_SECTION');
    assert.strictEqual(cmds[0].file, 'A1_Architecture_Vision.md');
  });

  it('extracts multiple commands', () => {
    const text = `
\`\`\`json
{"command": "APPEND_TO_FILE", "file": "a.md", "content": "hello"}
\`\`\`

\`\`\`json
{"command": "APPEND_TO_FILE", "file": "b.md", "content": "world"}
\`\`\`
`;
    const cmds = parseCommands(text);
    assert.strictEqual(cmds.length, 2);
  });

  it('skips malformed JSON blocks', () => {
    const text = '```json\n{not valid json}\n```';
    const cmds = parseCommands(text);
    assert.strictEqual(cmds.length, 0);
  });

  it('skips JSON without command field', () => {
    const text = '```json\n{"file": "a.md", "data": 42}\n```';
    const cmds = parseCommands(text);
    assert.strictEqual(cmds.length, 0);
  });

  it('returns empty for text with no JSON blocks', () => {
    const cmds = parseCommands('Just a regular response with no commands.');
    assert.strictEqual(cmds.length, 0);
  });
});

describe('validateCommands', () => {
  it('validates a correct UPDATE_SECTION command', () => {
    const cmds: ArchCommand[] = [{
      command: 'UPDATE_SECTION',
      file: 'A1_Architecture_Vision.md',
      section: '## Scope',
      content: 'New content',
    }];
    const errors = validateCommands(cmds);
    assert.strictEqual(errors.length, 0);
  });

  it('rejects unknown command types', () => {
    const cmds = [{ command: 'DELETE_FILE', file: 'a.md' } as unknown as ArchCommand];
    const errors = validateCommands(cmds);
    assert.strictEqual(errors.length, 1);
    assert.ok(errors[0].errors[0].includes('Unknown command type'));
  });

  it('reports missing required fields', () => {
    const cmds = [{
      command: 'ADD_DECISION',
      file: 'X1_ADR_Decision_Log.md',
      // missing: decision_id, title, status, content
    } as unknown as ArchCommand];
    const errors = validateCommands(cmds);
    assert.strictEqual(errors.length, 1);
    assert.ok(errors[0].errors.length >= 3); // at least decision_id, title, status, content
  });

  it('rejects unsafe file paths with ".."', () => {
    const cmds: ArchCommand[] = [{
      command: 'APPEND_TO_FILE',
      file: '../../../etc/passwd',
      content: 'hack',
    }];
    const errors = validateCommands(cmds);
    assert.strictEqual(errors.length, 1);
    assert.ok(errors[0].errors.some((e) => e.includes('Unsafe file path')));
  });

  it('rejects absolute file paths', () => {
    const cmds: ArchCommand[] = [{
      command: 'CREATE_FILE',
      file: '/tmp/evil.md',
      content: 'content',
    }];
    const errors = validateCommands(cmds);
    assert.strictEqual(errors.length, 1);
  });

  it('validates UPDATE_YAML_METADATA fields type', () => {
    const cmds = [{
      command: 'UPDATE_YAML_METADATA',
      file: 'A1_Architecture_Vision.md',
      fields: 'not-an-object',
    } as unknown as ArchCommand];
    const errors = validateCommands(cmds);
    assert.strictEqual(errors.length, 1);
    assert.ok(errors[0].errors.some((e) => e.includes('"fields" must be an object')));
  });

  it('passes valid UPDATE_YAML_METADATA', () => {
    const cmds: ArchCommand[] = [{
      command: 'UPDATE_YAML_METADATA',
      file: 'A1_Architecture_Vision.md',
      fields: { status: 'approved', version: '1.0.0' },
    }];
    const errors = validateCommands(cmds);
    assert.strictEqual(errors.length, 0);
  });

  it('rejects Windows backslash paths', () => {
    const cmds: ArchCommand[] = [{
      command: 'APPEND_TO_FILE',
      file: 'sub\\folder\\file.md',
      content: 'hello',
    }];
    const errors = validateCommands(cmds);
    assert.strictEqual(errors.length, 1);
    assert.ok(errors[0].errors.some((e) => e.includes('Backslashes')));
  });

  it('rejects Windows drive letter paths', () => {
    const cmds: ArchCommand[] = [{
      command: 'CREATE_FILE',
      file: 'C:\\Users\\evil\\file.md',
      content: 'hello',
    }];
    const errors = validateCommands(cmds);
    assert.strictEqual(errors.length, 1);
    assert.ok(errors[0].errors.some((e) => e.includes('drive letters') || e.includes('Backslashes')));
  });
});

describe('validateMetamodel', () => {
  it('warns when a decision targets a non-decision-log file', () => {
    const cmds: ArchCommand[] = [{
      command: 'ADD_DECISION',
      file: 'B1_Business_Architecture.md',
      decision_id: 'ADR-010',
      title: 'Adopt microservices',
      status: 'Proposed',
      content: 'We will adopt a microservices architecture.',
      impact: 'Significant increase in deployment complexity but better scaling.',
    }];
    const warnings = validateMetamodel(cmds);
    assert.ok(warnings.some((w) => w.message.includes('expected a decision log')));
  });

  it('no warnings when decision targets the decision log', () => {
    const cmds: ArchCommand[] = [{
      command: 'ADD_DECISION',
      file: 'X1_ADR_Decision_Log.md',
      decision_id: 'ADR-010',
      title: 'Adopt microservices',
      status: 'Proposed',
      content: 'We will adopt a microservices architecture.',
      impact: 'Significant increase in deployment complexity but better scaling.',
    }];
    const warnings = validateMetamodel(cmds);
    const decisionWarnings = warnings.filter((w) => w.message.includes('expected a decision log'));
    assert.strictEqual(decisionWarnings.length, 0);
  });

  it('warns when decision impact is very short', () => {
    const cmds: ArchCommand[] = [{
      command: 'ADD_DECISION',
      file: 'X1_ADR_Decision_Log.md',
      decision_id: 'ADR-011',
      title: 'Use Redis',
      status: 'Approved',
      content: 'Cache layer.',
      impact: 'Low',
    }];
    const warnings = validateMetamodel(cmds);
    assert.ok(warnings.some((w) => w.message.includes('short impact')));
  });
});
