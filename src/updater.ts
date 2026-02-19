/**
 * FileUpdater – Parses structured architecture commands from LLM output,
 * validates them, previews diffs, and applies them to vault files on disk.
 *
 * Pure parsing/validation logic lives in src/core/ (zero vscode deps).
 * This module handles VS Code filesystem operations and diff previews.
 */
import * as vscode from 'vscode';
import * as path from 'path';
import {
  ArchCommand, ArchCommandType, CommandResult,
  AddDecisionCommand, UpdateSectionCommand, AppendToFileCommand,
  AddOpenQuestionCommand, CreateFileCommand, UpdateYamlMetadataCommand,
} from './types.js';
import { VaultManager } from './vault.js';
import { parseCommands as coreParse } from './core/parser.js';
import {
  validateCommands as coreValidate,
  COMMAND_SCHEMAS,
  VALID_COMMANDS,
} from './core/validator.js';
import {
  updateSection as coreUpdateSection,
  addDecision as coreAddDecision,
  appendContent as coreAppendContent,
  addOpenQuestion as coreAddOpenQuestion,
  updateYamlMetadata as coreUpdateYamlMetadata,
  isPathContained,
} from './core/mutations.js';
export type { ValidationError } from './core/validator.js';

/** Audit log entry written for every mutation */
export interface AuditEntry {
  timestamp: string;
  command: ArchCommandType;
  file: string;
  promptHash: string;
  user: string;
  success: boolean;
  message: string;
}

export interface DiffPreview {
  file: string;
  command: ArchCommandType;
  summary: string;
  before: string;
  after: string;
  isNewFile: boolean;
}

export class FileUpdater {
  constructor(private readonly _vaultManager: VaultManager) {}

  // ── Parsing (delegates to core) ──────────────────────────────────

  parseCommands(responseText: string): ArchCommand[] {
    return coreParse(responseText);
  }

  // ── Validation (delegates to core) ───────────────────────────────

  validateCommands(commands: ArchCommand[]) {
    return coreValidate(commands);
  }

  // ── Diff preview ─────────────────────────────────────────────────

  /**
   * Generate diff previews for all commands WITHOUT applying them.
   * Returns before/after content for user review.
   */
  async previewCommands(commands: ArchCommand[]): Promise<DiffPreview[]> {
    const previews: DiffPreview[] = [];
    const vaultPath = this._vaultManager.activeVaultPath;
    if (!vaultPath) { return previews; }

    for (const cmd of commands) {
      try {
        const preview = await this._buildPreview(vaultPath, cmd);
        if (preview) { previews.push(preview); }
      } catch (err) {
        previews.push({
          file: cmd.file,
          command: cmd.command,
          summary: `⚠️ Preview failed: ${err}`,
          before: '',
          after: '',
          isNewFile: false,
        });
      }
    }

    return previews;
  }

  private async _buildPreview(vaultPath: string, cmd: ArchCommand): Promise<DiffPreview | null> {
    const filePath = path.join(vaultPath, cmd.file);
    const fileUri = vscode.Uri.file(filePath);

    switch (cmd.command) {
      case 'CREATE_FILE': {
        return {
          file: cmd.file,
          command: cmd.command,
          summary: `Create new file: ${cmd.file}`,
          before: '',
          after: cmd.content.slice(0, 500) + (cmd.content.length > 500 ? '\n...(truncated)' : ''),
          isNewFile: true,
        };
      }

      case 'ADD_DECISION': {
        const existing = await this._readFileSafe(fileUri);
        const block = `\n## ${cmd.decision_id} – ${cmd.title}\nStatus: ${cmd.status}\n\n${cmd.content}\n\nImpact: ${cmd.impact}\n`;
        return {
          file: cmd.file,
          command: cmd.command,
          summary: `Add decision ${cmd.decision_id}: ${cmd.title}`,
          before: this._tail(existing, 5),
          after: this._tail(existing, 3) + '\n---' + block,
          isNewFile: false,
        };
      }

      case 'UPDATE_SECTION': {
        const existing = await this._readFileSafe(fileUri);
        const sectionHeading = cmd.section;
        const headingLevel = (sectionHeading.match(/^#+/) || ['##'])[0];
        const escapedHeading = sectionHeading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const sectionRegex = new RegExp(
          `(${escapedHeading}\\s*\\n)([\\s\\S]*?)(?=\\n${headingLevel} |\\n---\\s*$|$)`, 'm'
        );
        const match = existing.match(sectionRegex);
        return {
          file: cmd.file,
          command: cmd.command,
          summary: `Update section "${sectionHeading}" in ${cmd.file}`,
          before: match ? match[0].slice(0, 300) : '(section not found)',
          after: `${sectionHeading}\n${cmd.content.slice(0, 300)}`,
          isNewFile: false,
        };
      }

      case 'APPEND_TO_FILE': {
        return {
          file: cmd.file,
          command: cmd.command,
          summary: `Append content to ${cmd.file}`,
          before: '(...end of file)',
          after: cmd.content.slice(0, 300),
          isNewFile: false,
        };
      }

      case 'ADD_OPEN_QUESTION': {
        return {
          file: cmd.file,
          command: cmd.command,
          summary: `Add question under "${cmd.category}": ${cmd.question}`,
          before: '',
          after: `- ${cmd.question}`,
          isNewFile: false,
        };
      }

      case 'UPDATE_YAML_METADATA': {
        return {
          file: cmd.file,
          command: cmd.command,
          summary: `Update YAML metadata: ${Object.entries(cmd.fields).map(([k, v]) => `${k}=${v}`).join(', ')}`,
          before: '(current front matter)',
          after: Object.entries(cmd.fields).map(([k, v]) => `${k}: ${v}`).join('\n'),
          isNewFile: false,
        };
      }

      default:
        return null;
    }
  }

  private async _readFileSafe(fileUri: vscode.Uri): Promise<string> {
    try {
      return await this._readFileText(fileUri);
    } catch {
      return '';
    }
  }

  private _tail(text: string, lines: number): string {
    const allLines = text.split('\n');
    return allLines.slice(-lines).join('\n');
  }

  /**
   * Apply a single architecture command to the vault.
   * Creates a backup of the target file before writing and logs the mutation.
   */
  async applyCommand(cmd: ArchCommand, promptHash: string = ''): Promise<CommandResult> {
    const vaultPath = this._vaultManager.activeVaultPath;
    if (!vaultPath) {
      return { success: false, file: cmd.file, message: 'No active vault' };
    }

    // Path containment check — prevent traversal beyond vault
    const resolvedPath = path.resolve(vaultPath, cmd.file);
    if (!isPathContained(path.resolve(vaultPath), resolvedPath)) {
      return {
        success: false,
        file: cmd.file,
        message: `Path traversal blocked: "${cmd.file}" resolves outside the vault directory.`,
      };
    }

    // Pre-write backup (skip for CREATE_FILE — file doesn't exist yet)
    if (cmd.command !== 'CREATE_FILE') {
      await this._backupFile(vaultPath, cmd.file);
    }

    let result: CommandResult;
    try {
      switch (cmd.command) {
        case 'ADD_DECISION':
          result = await this._addDecision(vaultPath, cmd);
          break;
        case 'UPDATE_SECTION':
          result = await this._updateSection(vaultPath, cmd);
          break;
        case 'APPEND_TO_FILE':
          result = await this._appendToFile(vaultPath, cmd);
          break;
        case 'ADD_OPEN_QUESTION':
          result = await this._addOpenQuestion(vaultPath, cmd);
          break;
        case 'CREATE_FILE':
          result = await this._createFile(vaultPath, cmd);
          break;
        case 'UPDATE_YAML_METADATA':
          result = await this._updateYamlMetadata(vaultPath, cmd);
          break;
        default: {
          const _exhaustive: never = cmd;
          result = { success: false, file: (cmd as ArchCommand).file, message: `Unknown command: ${(cmd as ArchCommand).command}` };
        }
      }
    } catch (err) {
      result = { success: false, file: cmd.file, message: `Error: ${err}` };
    }

    // Auto-stamp last_modified for successful mutations (CREATE_FILE sets it at creation)
    if (result.success && cmd.command !== 'CREATE_FILE') {
      await this._stampLastModified(vaultPath, cmd.file);
    }

    // Audit log
    await this._writeAuditEntry(vaultPath, {
      timestamp: new Date().toISOString(),
      command: cmd.command,
      file: cmd.file,
      promptHash,
      user: this._getCurrentUser(),
      success: result.success,
      message: result.message,
    });

    return result;
  }

  /**
   * Apply multiple commands sequentially, returning all results.
   */
  async applyCommands(cmds: ArchCommand[], promptHash: string = ''): Promise<CommandResult[]> {
    const results: CommandResult[] = [];
    for (const cmd of cmds) {
      results.push(await this.applyCommand(cmd, promptHash));
    }
    // Reload vault after changes
    if (results.some((r) => r.success)) {
      await this._vaultManager.loadVault();
    }
    return results;
  }

  // ── Backup ───────────────────────────────────────────────────────

  /**
   * Copy the original file to .archipilot/backups/{filename}.{timestamp}.md
   * before overwriting. Silently skips if the file doesn't exist.
   */
  private async _backupFile(vaultPath: string, fileName: string): Promise<void> {
    const sourceUri = vscode.Uri.file(path.join(vaultPath, fileName));
    try {
      await vscode.workspace.fs.stat(sourceUri);
    } catch {
      return; // file doesn't exist — nothing to back up
    }

    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = vscode.Uri.file(path.join(vaultPath, '.archipilot', 'backups'));
    try {
      await vscode.workspace.fs.createDirectory(backupDir);
    } catch { /* ignore — may already exist */ }

    const baseName = fileName.replace(/\.md$/, '');
    const backupUri = vscode.Uri.joinPath(backupDir, `${baseName}.${ts}.md`);

    try {
      const content = await vscode.workspace.fs.readFile(sourceUri);
      await vscode.workspace.fs.writeFile(backupUri, content);
    } catch {
      // Non-fatal — log but don't block the operation
      console.warn(`archipilot: failed to backup ${fileName}`);
    }

    // Prune old backups — keep only the most recent N per file
    await this._pruneBackups(backupDir, baseName);
  }

  /** Maximum number of backup copies to retain per file */
  private static readonly MAX_BACKUPS_PER_FILE = 10;

  /**
   * Remove oldest backups when the count exceeds MAX_BACKUPS_PER_FILE.
   */
  private async _pruneBackups(backupDir: vscode.Uri, baseName: string): Promise<void> {
    try {
      const entries = await vscode.workspace.fs.readDirectory(backupDir);
      const prefix = `${baseName}.`;
      const backups = entries
        .filter(([name, type]) => type === vscode.FileType.File && name.startsWith(prefix))
        .map(([name]) => name)
        .sort(); // ISO timestamp naming ensures lexicographic = chronological

      if (backups.length <= FileUpdater.MAX_BACKUPS_PER_FILE) { return; }

      const toDelete = backups.slice(0, backups.length - FileUpdater.MAX_BACKUPS_PER_FILE);
      for (const name of toDelete) {
        try {
          await vscode.workspace.fs.delete(vscode.Uri.joinPath(backupDir, name));
        } catch { /* non-fatal */ }
      }
    } catch {
      // Backup directory listing failed — non-fatal
    }
  }

  // ── Audit log ────────────────────────────────────────────────────

  /**
   * Maximum number of JSONL entries before the audit log is rotated.
   * Keeps the active log under ~1 MB assuming ~500 bytes/entry.
   */
  private static readonly AUDIT_MAX_ENTRIES = 2000;

  /** Maximum number of rotated log files to retain. */
  private static readonly AUDIT_MAX_ROTATIONS = 3;

  /**
   * Append a JSON entry to .archipilot/audit.log for governance traceability.
   * When the log exceeds `AUDIT_MAX_ENTRIES`, it is rotated (audit.log → audit.log.1)
   * and older rotations are pruned beyond `AUDIT_MAX_ROTATIONS`.
   */
  private async _writeAuditEntry(vaultPath: string, entry: AuditEntry): Promise<void> {
    const auditDir = vscode.Uri.file(path.join(vaultPath, '.archipilot'));
    try {
      await vscode.workspace.fs.createDirectory(auditDir);
    } catch { /* ignore */ }

    const logUri = vscode.Uri.joinPath(auditDir, 'audit.log');

    let existing = '';
    try {
      const bytes = await vscode.workspace.fs.readFile(logUri);
      existing = Buffer.from(bytes).toString('utf-8');
    } catch {
      // file doesn't exist yet — that's fine
    }

    const line = JSON.stringify(entry) + '\n';
    const updated = existing + line;
    await vscode.workspace.fs.writeFile(logUri, Buffer.from(updated, 'utf-8'));

    // ── Rotation check ──
    const lineCount = updated.split('\n').filter(Boolean).length;
    if (lineCount >= FileUpdater.AUDIT_MAX_ENTRIES) {
      await this._rotateAuditLog(auditDir);
    }
  }

  /**
   * Rotate the audit log: audit.log → audit.log.1, audit.log.1 → audit.log.2, etc.
   * Prune any rotation beyond AUDIT_MAX_ROTATIONS.
   */
  private async _rotateAuditLog(auditDir: vscode.Uri): Promise<void> {
    // Delete the oldest rotation if it exists
    for (let i = FileUpdater.AUDIT_MAX_ROTATIONS; i >= 1; i--) {
      const src = vscode.Uri.joinPath(auditDir, i === 1 ? 'audit.log' : `audit.log.${i - 1}`);
      const dst = vscode.Uri.joinPath(auditDir, `audit.log.${i}`);
      if (i === FileUpdater.AUDIT_MAX_ROTATIONS) {
        // Delete the overflow file
        try { await vscode.workspace.fs.delete(dst); } catch { /* no-op */ }
      }
      try {
        const bytes = await vscode.workspace.fs.readFile(src);
        await vscode.workspace.fs.writeFile(dst, bytes);
      } catch { /* source doesn't exist — skip */ }
    }
    // Truncate the active log
    await vscode.workspace.fs.writeFile(
      vscode.Uri.joinPath(auditDir, 'audit.log'),
      Buffer.from('', 'utf-8'),
    );
  }

  /**
   * Get the current VS Code user for audit entries.
   */
  private _getCurrentUser(): string {
    // VS Code doesn't expose authenticated user directly;
    // use the OS username as a reasonable fallback.
    return process.env.USER || process.env.USERNAME || 'unknown';
  }

  // ── Command implementations ──────────────────────────────────────

  private async _addDecision(vaultPath: string, cmd: AddDecisionCommand): Promise<CommandResult> {
    const filePath = path.join(vaultPath, cmd.file);
    const fileUri = vscode.Uri.file(filePath);

    const existing = await this._readFileText(fileUri);

    // Idempotency: skip if this decision_id already exists in the file
    if (existing.includes(cmd.decision_id)) {
      return {
        success: false,
        file: cmd.file,
        message: `Duplicate skipped: decision "${cmd.decision_id}" already exists in ${cmd.file}`,
      };
    }

    const result = coreAddDecision(
      existing,
      cmd.decision_id,
      cmd.title,
      cmd.status,
      cmd.content,
      cmd.impact,
    );

    await vscode.workspace.fs.writeFile(fileUri, Buffer.from(result.content, 'utf-8'));

    return {
      success: result.success,
      file: cmd.file,
      message: result.message || `Added decision ${cmd.decision_id}: ${cmd.title}`,
    };
  }

  private async _updateSection(vaultPath: string, cmd: UpdateSectionCommand): Promise<CommandResult> {
    const filePath = path.join(vaultPath, cmd.file);
    const fileUri = vscode.Uri.file(filePath);

    const existing = await this._readFileText(fileUri);
    const result = coreUpdateSection(existing, cmd.section, cmd.content);

    if (!result.success) {
      return {
        success: false,
        file: cmd.file,
        message: `${result.message} in ${cmd.file}`,
      };
    }

    await vscode.workspace.fs.writeFile(fileUri, Buffer.from(result.content, 'utf-8'));

    return {
      success: true,
      file: cmd.file,
      message: `${result.message} in ${cmd.file}`,
    };
  }

  private async _appendToFile(vaultPath: string, cmd: AppendToFileCommand): Promise<CommandResult> {
    const filePath = path.join(vaultPath, cmd.file);
    const fileUri = vscode.Uri.file(filePath);

    const existing = await this._readFileText(fileUri);

    // Idempotency: check if any TOGAF IDs in the new content already exist in the file
    const idPattern = /\b([A-Z]+-\d+)\b/g;
    const newIds = [...cmd.content.matchAll(idPattern)].map((m) => m[1]);
    for (const id of newIds) {
      if (existing.includes(id)) {
        return {
          success: false,
          file: cmd.file,
          message: `Duplicate skipped: "${id}" already exists in ${cmd.file}`,
        };
      }
    }

    const result = coreAppendContent(existing, cmd.content);
    await vscode.workspace.fs.writeFile(fileUri, Buffer.from(result.content, 'utf-8'));

    return {
      success: true,
      file: cmd.file,
      message: `Appended content to ${cmd.file}`,
    };
  }

  private async _addOpenQuestion(vaultPath: string, cmd: AddOpenQuestionCommand): Promise<CommandResult> {
    const filePath = path.join(vaultPath, cmd.file);
    const fileUri = vscode.Uri.file(filePath);

    const existing = await this._readFileText(fileUri);
    const result = coreAddOpenQuestion(existing, cmd.category, cmd.question);
    await vscode.workspace.fs.writeFile(fileUri, Buffer.from(result.content, 'utf-8'));

    return {
      success: true,
      file: cmd.file,
      message: `Added question under "${cmd.category}": ${cmd.question}`,
    };
  }

  private async _createFile(vaultPath: string, cmd: CreateFileCommand): Promise<CommandResult> {
    const filePath = path.join(vaultPath, cmd.file);
    const fileUri = vscode.Uri.file(filePath);

    // Safety: don't overwrite existing files
    try {
      await vscode.workspace.fs.stat(fileUri);
      return {
        success: false,
        file: cmd.file,
        message: `File ${cmd.file} already exists. Use UPDATE_SECTION or APPEND_TO_FILE instead.`,
      };
    } catch {
      // File doesn't exist, good
    }

    await vscode.workspace.fs.writeFile(
      fileUri,
      Buffer.from(cmd.content, 'utf-8')
    );

    return {
      success: true,
      file: cmd.file,
      message: `Created file ${cmd.file}`,
    };
  }

  private async _updateYamlMetadata(
    vaultPath: string,
    cmd: UpdateYamlMetadataCommand
  ): Promise<CommandResult> {
    const filePath = path.join(vaultPath, cmd.file);
    const fileUri = vscode.Uri.file(filePath);

    const existing = await this._readFileText(fileUri);
    const result = coreUpdateYamlMetadata(existing, cmd.fields);
    if (!result.success) {
      return {
        success: false,
        file: cmd.file,
        message: `${result.message} in ${cmd.file}`,
      };
    }

    await vscode.workspace.fs.writeFile(fileUri, Buffer.from(result.content, 'utf-8'));

    return {
      success: true,
      file: cmd.file,
      message: `Updated YAML metadata in ${cmd.file}: ${Object.keys(cmd.fields).join(', ')}`,
    };
  }

  // ── Helpers ──────────────────────────────────────────────────────

  /**
   * Update the `last_modified` field in YAML front matter to today's date.
   * Non-fatal — stamp failure does not block the main mutation.
   */
  private async _stampLastModified(vaultPath: string, file: string): Promise<void> {
    try {
      const fileUri = vscode.Uri.file(path.join(vaultPath, file));
      const existing = await this._readFileText(fileUri);
      const today = new Date().toISOString().slice(0, 10);
      const result = coreUpdateYamlMetadata(existing, { last_modified: today });
      if (result.success) {
        await vscode.workspace.fs.writeFile(fileUri, Buffer.from(result.content, 'utf-8'));
      }
    } catch {
      // Non-fatal — stamp failure does not block the main mutation
    }
  }

  private async _readFileText(fileUri: vscode.Uri): Promise<string> {
    const bytes = await vscode.workspace.fs.readFile(fileUri);
    return Buffer.from(bytes).toString('utf-8');
  }
}
