/**
 * Tests for core mutation functions: updateSection, addDecision, addOpenQuestion,
 * appendContent, updateYamlMetadata, isPathContained.
 *
 * Run: npm test
 */
import assert from 'node:assert';
import { describe, it } from 'node:test';

import {
  updateSection,
  addDecision,
  appendContent,
  addOpenQuestion,
  updateYamlMetadata,
  isPathContained,
} from '../core/mutations.js';

// ── UPDATE_SECTION ─────────────────────────────────────────────

describe('updateSection', () => {
  it('replaces section content (happy path)', () => {
    const doc =
      '---\ntype: test\n---\n# Title\n\n## Scope\n\nOld scope content.\n\n## Drivers\n\nDrivers here.\n';
    const result = updateSection(doc, '## Scope', 'New scope content.');
    assert.ok(result.success);
    assert.ok(result.content.includes('New scope content.'));
    assert.ok(!result.content.includes('Old scope content'));
    assert.ok(result.content.includes('## Drivers'));
    assert.ok(result.content.includes('Drivers here.'));
  });

  it('returns failure when section is not found', () => {
    const doc = '# Title\n\n## Existing Section\n\nContent.\n';
    const result = updateSection(doc, '## Nonexistent', 'New content');
    assert.strictEqual(result.success, false);
    assert.ok(result.message.includes('not found'));
    assert.strictEqual(result.content, doc); // unchanged
  });

  it('handles section at end of file (no following heading)', () => {
    const doc = '# Title\n\n## Last Section\n\nOld content at the end.';
    const result = updateSection(doc, '## Last Section', 'New final content.');
    assert.ok(result.success);
    assert.ok(result.content.includes('New final content.'));
    assert.ok(!result.content.includes('Old content at the end'));
  });

  it('handles nested headings correctly (only replaces same level)', () => {
    const doc =
      '# Title\n\n## Parent\n\nParent content.\n\n### Child\n\nChild content.\n\n## Sibling\n\nSibling content.\n';
    const result = updateSection(doc, '## Parent', 'Replaced parent.\n\n### Child\n\nKept child.');
    assert.ok(result.success);
    assert.ok(result.content.includes('Replaced parent.'));
    assert.ok(result.content.includes('## Sibling'));
    assert.ok(result.content.includes('Sibling content.'));
  });

  it('handles special characters in heading', () => {
    const doc = '# Title\n\n## Risk (High) [R-01]\n\nOld risk.\n\n## Other\n\nOther.\n';
    const result = updateSection(doc, '## Risk (High) [R-01]', 'Updated risk.');
    assert.ok(result.success);
    assert.ok(result.content.includes('Updated risk.'));
    assert.ok(!result.content.includes('Old risk'));
    assert.ok(result.content.includes('## Other'));
  });

  it('handles h3 section replacement', () => {
    const doc = '## Parent\n\n### Sub A\n\nContent A.\n\n### Sub B\n\nContent B.\n';
    const result = updateSection(doc, '### Sub A', 'New A content.');
    assert.ok(result.success);
    assert.ok(result.content.includes('New A content.'));
    assert.ok(result.content.includes('### Sub B'));
    assert.ok(result.content.includes('Content B.'));
  });

  it('stops at --- separator', () => {
    const doc = '## Section\n\nContent before separator.\n\n---\n\n## Next\n';
    const result = updateSection(doc, '## Section', 'Replaced content.');
    assert.ok(result.success);
    assert.ok(result.content.includes('Replaced content.'));
    assert.ok(result.content.includes('---'));
    assert.ok(result.content.includes('## Next'));
  });
});

// ── ADD_DECISION ───────────────────────────────────────────────

describe('addDecision', () => {
  it('appends a formatted decision block', () => {
    const existing = '---\ntype: decision-log\n---\n# Decision Log\n\nExisting content.';
    const result = addDecision(existing, 'AD-05', 'API Gateway', 'Proposed', 'Use Kong.', 'All integrations');
    assert.ok(result.success);
    assert.ok(result.content.includes('## AD-05 – API Gateway'));
    assert.ok(result.content.includes('Status: Proposed'));
    assert.ok(result.content.includes('Use Kong.'));
    assert.ok(result.content.includes('Impact: All integrations'));
    assert.ok(result.content.includes('Existing content.'));
  });

  it('separates decisions with --- divider', () => {
    const existing = '# Log\n\n## AD-01\nExisting.';
    const result = addDecision(existing, 'AD-02', 'New', 'Approved', 'Content', 'Impact');
    assert.ok(result.success);
    assert.ok(result.content.includes('\n\n---\n'));
    assert.ok(result.content.includes('## AD-02 – New'));
  });

  it('preserves existing content before the new decision', () => {
    const existing = '---\ntype: decision-log\n---\n# Decision Log\n\n## AD-01 – First\nStatus: Open\n\nFirst decision.';
    const result = addDecision(existing, 'AD-02', 'Second', 'Proposed', 'Second decision.', 'Medium');
    assert.ok(result.success);
    assert.ok(result.content.includes('## AD-01 – First'));
    assert.ok(result.content.includes('First decision.'));
    assert.ok(result.content.includes('## AD-02 – Second'));
  });

  it('includes all required fields in the output block', () => {
    const result = addDecision('', 'AD-10', 'Title', 'Rejected', 'Body text', 'High impact');
    assert.ok(result.content.includes('AD-10'));
    assert.ok(result.content.includes('Title'));
    assert.ok(result.content.includes('Status: Rejected'));
    assert.ok(result.content.includes('Body text'));
    assert.ok(result.content.includes('Impact: High impact'));
  });
});

// ── APPEND_CONTENT ─────────────────────────────────────────────

describe('appendContent', () => {
  it('appends content with blank line separator', () => {
    const result = appendContent('Existing.', 'New content.');
    assert.ok(result.success);
    assert.ok(result.content.includes('Existing.'));
    assert.ok(result.content.includes('\n\nNew content.'));
  });

  it('trims trailing whitespace from existing content', () => {
    const result = appendContent('Existing.  \n\n\n', 'Appended.');
    assert.ok(result.content.startsWith('Existing.'));
    assert.ok(result.content.includes('\n\nAppended.'));
  });
});

// ── ADD_OPEN_QUESTION ──────────────────────────────────────────

describe('addOpenQuestion', () => {
  it('adds question under existing h1 category', () => {
    const doc = '# Technology\n\n- Existing question?\n';
    const result = addOpenQuestion(doc, 'Technology', 'New question?');
    assert.ok(result.success);
    assert.ok(result.content.includes('- New question?'));
    assert.ok(result.content.includes('- Existing question?'));
  });

  it('adds question under existing h2 category', () => {
    const doc = '# Questions\n\n## Technology\n\n- Old question?\n\n## Governance\n\nGov stuff.\n';
    const result = addOpenQuestion(doc, 'Technology', 'Is Kubernetes ready?');
    assert.ok(result.success);
    assert.ok(result.content.includes('- Is Kubernetes ready?'));
    assert.ok(result.content.includes('## Governance'));
  });

  it('adds question under existing h3 category', () => {
    const doc = '## Phase A\n\n### Technology\n\n- Old.\n';
    const result = addOpenQuestion(doc, 'Technology', 'New under h3?');
    assert.ok(result.success);
    assert.ok(result.content.includes('- New under h3?'));
  });

  it('creates new category section when not found', () => {
    const doc = '# Questions\n\nGeneral content.\n';
    const result = addOpenQuestion(doc, 'Security', 'Is SSO configured?');
    assert.ok(result.success);
    assert.ok(result.content.includes('## Security'));
    assert.ok(result.content.includes('- Is SSO configured?'));
  });
});

// ── UPDATE_YAML_METADATA ───────────────────────────────────────

describe('updateYamlMetadata (core)', () => {
  it('updates existing fields', () => {
    const doc = '---\nstatus: draft\nversion: 0.1.0\n---\n# Title\n';
    const result = updateYamlMetadata(doc, { status: 'approved', version: '1.0.0' });
    assert.ok(result.success);
    assert.ok(result.content.includes('status: approved'));
    assert.ok(result.content.includes('version: 1.0.0'));
    assert.ok(!result.content.includes('status: draft'));
  });

  it('adds new fields', () => {
    const doc = '---\ntype: test\n---\n# Title\n';
    const result = updateYamlMetadata(doc, { owner: 'Jane' });
    assert.ok(result.success);
    assert.ok(result.content.includes('owner: Jane'));
    assert.ok(result.content.includes('type: test'));
  });

  it('returns failure when no YAML front matter exists', () => {
    const doc = '# No YAML\n\nContent.';
    const result = updateYamlMetadata(doc, { status: 'approved' });
    assert.strictEqual(result.success, false);
    assert.ok(result.message.includes('No YAML'));
  });
});

// ── PATH CONTAINMENT ───────────────────────────────────────────

describe('isPathContained', () => {
  it('allows files within the vault', () => {
    assert.ok(isPathContained('/vault', '/vault/file.md'));
    assert.ok(isPathContained('/vault', '/vault/subdir/file.md'));
  });

  it('blocks paths outside the vault', () => {
    assert.strictEqual(isPathContained('/vault', '/etc/passwd'), false);
    assert.strictEqual(isPathContained('/vault', '/vault-other/file.md'), false);
  });

  it('blocks parent directory traversal', () => {
    // path.resolve would turn /vault/../etc into /etc
    assert.strictEqual(isPathContained('/vault', '/etc'), false);
  });

  it('handles vault path with trailing slash', () => {
    assert.ok(isPathContained('/vault/', '/vault/file.md'));
  });

  it('allows the vault root itself', () => {
    assert.ok(isPathContained('/vault', '/vault'));
  });
});
