/**
 * Integration tests for file operations – uses real temp files on disk.
 * Tests the core parsing/validation pipeline end-to-end and vault template writing.
 *
 * Run: npm test
 */
import assert from 'node:assert';
import { describe, it, before, after } from 'node:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

import { parseCommands } from '../core/parser.js';
import { validateCommands } from '../core/validator.js';
import { buildVaultTemplate } from '../vault-template.js';

// ── Temp directory management ──────────────────────────────────

let tmpDir: string;

function setup() {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'archipilot-test-'));
}

function teardown() {
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ── Helpers that simulate what FileUpdater does, without vscode API ──

function appendToFile(vaultPath: string, fileName: string, content: string): { success: boolean; message: string } {
  const filePath = path.join(vaultPath, fileName);
  const existing = fs.readFileSync(filePath, 'utf-8');
  fs.writeFileSync(filePath, existing.trimEnd() + '\n\n' + content + '\n', 'utf-8');
  return { success: true, message: `Appended content to ${fileName}` };
}

function createFileCmd(vaultPath: string, fileName: string, content: string): { success: boolean; message: string } {
  const filePath = path.join(vaultPath, fileName);
  if (fs.existsSync(filePath)) {
    return { success: false, message: `File ${fileName} already exists.` };
  }
  fs.writeFileSync(filePath, content, 'utf-8');
  return { success: true, message: `Created file ${fileName}` };
}

function updateYamlMetadata(vaultPath: string, fileName: string, fields: Record<string, string>): { success: boolean; message: string } {
  const filePath = path.join(vaultPath, fileName);
  const existing = fs.readFileSync(filePath, 'utf-8');
  const yamlMatch = existing.match(/^---\n([\s\S]*?)\n---/m);
  if (!yamlMatch) {
    return { success: false, message: `No YAML front matter found in ${fileName}` };
  }
  let yaml = yamlMatch[1];
  for (const [key, value] of Object.entries(fields)) {
    const fieldRegex = new RegExp(`^${key}:\\s*.*$`, 'm');
    if (yaml.match(fieldRegex)) {
      yaml = yaml.replace(fieldRegex, `${key}: ${value}`);
    } else {
      yaml += `\n${key}: ${value}`;
    }
  }
  const updated = existing.replace(/^---\n[\s\S]*?\n---/m, `---\n${yaml}\n---`);
  fs.writeFileSync(filePath, updated, 'utf-8');
  return { success: true, message: `Updated YAML metadata in ${fileName}` };
}

function backupFile(vaultPath: string, fileName: string): void {
  const source = path.join(vaultPath, fileName);
  if (!fs.existsSync(source)) { return; }
  const backupDir = path.join(vaultPath, '.archipilot', 'backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const baseName = fileName.replace(/\.md$/, '');
  const dest = path.join(backupDir, `${baseName}.${ts}.md`);
  fs.copyFileSync(source, dest);
}

// ── Tests ───────────────────────────────────────────────────────

describe('integration: vault template write + read', () => {
  before(setup);
  after(teardown);

  it('writes all template files to disk and reads them back', () => {
    const files = buildVaultTemplate('Integration-Test');
    for (const f of files) {
      fs.writeFileSync(path.join(tmpDir, f.name), f.content, 'utf-8');
    }

    const written = fs.readdirSync(tmpDir).filter((n) => n.endsWith('.md'));
    assert.ok(written.length >= 23, `Expected ≥23 md files, got ${written.length}`);

    // Verify a sample file can be read back correctly
    const index = fs.readFileSync(path.join(tmpDir, '00_Architecture_Repository.md'), 'utf-8');
    assert.ok(index.includes('Integration-Test'));
    assert.ok(index.startsWith('---'));
  });
});

describe('integration: APPEND_TO_FILE on real file', () => {
  before(setup);
  after(teardown);

  it('appends content to an existing file', () => {
    const fileName = 'X1_ADR_Decision_Log.md';
    fs.writeFileSync(
      path.join(tmpDir, fileName),
      '---\ntype: decision-log\n---\n# Decision Log\n\nInitial content.',
      'utf-8'
    );

    const result = appendToFile(tmpDir, fileName, '## AD-01 – Test Decision\nStatus: Proposed');
    assert.ok(result.success);

    const content = fs.readFileSync(path.join(tmpDir, fileName), 'utf-8');
    assert.ok(content.includes('AD-01'));
    assert.ok(content.includes('Initial content'));
  });
});

describe('integration: CREATE_FILE prevents overwrite', () => {
  before(setup);
  after(teardown);

  it('creates a new file', () => {
    const result = createFileCmd(tmpDir, 'new_artifact.md', '---\ntype: test\n---\n# New');
    assert.ok(result.success);
    assert.ok(fs.existsSync(path.join(tmpDir, 'new_artifact.md')));
  });

  it('refuses to overwrite an existing file', () => {
    fs.writeFileSync(path.join(tmpDir, 'existing.md'), 'content', 'utf-8');
    const result = createFileCmd(tmpDir, 'existing.md', 'new content');
    assert.strictEqual(result.success, false);

    // Original content is preserved
    const content = fs.readFileSync(path.join(tmpDir, 'existing.md'), 'utf-8');
    assert.strictEqual(content, 'content');
  });
});

describe('integration: UPDATE_YAML_METADATA on real file', () => {
  before(setup);
  after(teardown);

  it('updates existing YAML fields', () => {
    const fileName = 'A1_Architecture_Vision.md';
    fs.writeFileSync(
      path.join(tmpDir, fileName),
      '---\ntype: architecture-vision\nstatus: draft\nversion: 0.1.0\n---\n# Vision\n\nContent.',
      'utf-8'
    );

    const result = updateYamlMetadata(tmpDir, fileName, { status: 'approved', version: '1.0.0' });
    assert.ok(result.success);

    const content = fs.readFileSync(path.join(tmpDir, fileName), 'utf-8');
    assert.ok(content.includes('status: approved'));
    assert.ok(content.includes('version: 1.0.0'));
    assert.ok(!content.includes('status: draft'));
  });

  it('adds new YAML fields', () => {
    const fileName = 'B1_Business.md';
    fs.writeFileSync(
      path.join(tmpDir, fileName),
      '---\ntype: business-architecture\n---\n# Business\n',
      'utf-8'
    );

    const result = updateYamlMetadata(tmpDir, fileName, { owner: 'Jane Doe' });
    assert.ok(result.success);

    const content = fs.readFileSync(path.join(tmpDir, fileName), 'utf-8');
    assert.ok(content.includes('owner: Jane Doe'));
  });
});

describe('integration: pre-write backup', () => {
  before(setup);
  after(teardown);

  it('creates a backup before modifying a file', () => {
    const fileName = 'test_backup.md';
    const original = '---\ntype: test\n---\n# Original Content';
    fs.writeFileSync(path.join(tmpDir, fileName), original, 'utf-8');

    backupFile(tmpDir, fileName);

    const backupDir = path.join(tmpDir, '.archipilot', 'backups');
    assert.ok(fs.existsSync(backupDir), 'Backup directory should exist');

    const backups = fs.readdirSync(backupDir);
    assert.ok(backups.length >= 1, 'Should have at least one backup');
    assert.ok(backups[0].startsWith('test_backup.'), 'Backup should have the right prefix');

    // Verify backup content matches original
    const backupContent = fs.readFileSync(path.join(backupDir, backups[0]), 'utf-8');
    assert.strictEqual(backupContent, original);
  });
});

describe('integration: end-to-end parse → validate → apply', () => {
  before(setup);
  after(teardown);

  it('parses LLM output, validates, and applies to disk', () => {
    // Set up the target file
    const fileName = 'X3_Open_Questions.md';
    fs.writeFileSync(
      path.join(tmpDir, fileName),
      '---\ntype: open-questions\n---\n# Open Questions\n',
      'utf-8'
    );

    // Simulated LLM output
    const llmResponse = `Here's the update:

\`\`\`json
{
  "command": "APPEND_TO_FILE",
  "file": "X3_Open_Questions.md",
  "content": "## Technology\\n- Should we adopt Kubernetes or ECS?"
}
\`\`\`
`;

    // Parse
    const commands = parseCommands(llmResponse);
    assert.strictEqual(commands.length, 1);

    // Validate
    const errors = validateCommands(commands);
    assert.strictEqual(errors.length, 0);

    // Apply
    const result = appendToFile(tmpDir, commands[0].file, (commands[0] as { content: string }).content);
    assert.ok(result.success);

    // Verify
    const content = fs.readFileSync(path.join(tmpDir, fileName), 'utf-8');
    assert.ok(content.includes('Kubernetes'));
    assert.ok(content.includes('Open Questions'));
  });
});
