/**
 * Tests for vault template generation.
 *
 * Run: npx tsx src/test/vault-template.test.ts
 */
import assert from 'node:assert';
import { describe, it } from 'node:test';
import { buildVaultTemplate } from '../vault-template.js';

describe('buildVaultTemplate', () => {
  const files = buildVaultTemplate('Test-Project');

  it('generates at least 23 template files', () => {
    assert.ok(files.length >= 23, `Expected ≥23 files, got ${files.length}`);
  });

  it('includes the repository index (00_Architecture_Repository)', () => {
    const index = files.find((f) => f.name === '00_Architecture_Repository.md');
    assert.ok(index, 'Index file not found');
    assert.ok(index.content.includes('Architecture Repository'), 'Missing title');
  });

  it('includes files for all TOGAF ADM phases', () => {
    const prefixes = ['P', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'R', 'X'];
    for (const prefix of prefixes) {
      const found = files.some((f) => f.name.startsWith(prefix));
      assert.ok(found, `No file found with prefix "${prefix}"`);
    }
  });

  it('all files have YAML front matter', () => {
    for (const file of files) {
      assert.ok(
        file.content.startsWith('---'),
        `${file.name} missing YAML front matter`
      );
      const yamlEnd = file.content.indexOf('---', 4);
      assert.ok(yamlEnd > 0, `${file.name} has unclosed YAML front matter`);
    }
  });

  it('YAML contains required fields', () => {
    const requiredFields = ['togaf_phase', 'artifact_type', 'version', 'status'];
    for (const file of files) {
      for (const field of requiredFields) {
        assert.ok(
          file.content.includes(`${field}:`),
          `${file.name} missing YAML field: ${field}`
        );
      }
    }
  });

  it('file names end with .md', () => {
    for (const file of files) {
      assert.ok(file.name.endsWith('.md'), `${file.name} is not a .md file`);
    }
  });

  it('file names contain no spaces', () => {
    for (const file of files) {
      assert.ok(!file.name.includes(' '), `${file.name} contains spaces`);
    }
  });

  it('generates G2_Architecture_Contracts template', () => {
    const contract = files.find((f) => f.name === 'G2_Architecture_Contracts.md');
    assert.ok(contract, 'G2_Architecture_Contracts.md not found in template');
    assert.ok(contract.content.includes('Architecture Contract'), 'Missing contract title');
  });

  it('generates X5_Traceability_Matrix template', () => {
    const matrix = files.find((f) => f.name === 'X5_Traceability_Matrix.md');
    assert.ok(matrix, 'X5_Traceability_Matrix.md not found in template');
    assert.ok(matrix.content.includes('Traceability'), 'Missing traceability title');
  });

  it('includes project name in the index', () => {
    const index = files.find((f) => f.name === '00_Architecture_Repository.md');
    assert.ok(index?.content.includes('Test-Project'), 'Project name not in index');
  });
});
