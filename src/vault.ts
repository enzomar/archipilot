/**
 * VaultManager – Discovers, loads, and manages Obsidian architecture vaults
 * within the VS Code workspace.
 *
 * Pure context-windowing logic lives in src/core/context.ts (zero vscode deps).
 */
import * as vscode from 'vscode';
import * as path from 'path';
import { VaultFile, VaultInfo } from './types.js';
import { buildContext as coreBuildContext } from './core/context.js';
import { extractYamlSummary, formatYamlSummaryTable } from './core/context.js';
import type { YamlMeta } from './core/context.js';

export class VaultManager {
  private _activeVaultPath: string | undefined;
  private _cachedFiles: VaultFile[] = [];
  private _cachedInfo: VaultInfo | undefined;
  private _cacheTimestamp = 0;
  private static readonly CACHE_TTL_MS = 3000;
  private _onDidChangeVault = new vscode.EventEmitter<VaultInfo | undefined>();
  public readonly onDidChangeVault = this._onDidChangeVault.event;

  constructor(private readonly _context: vscode.ExtensionContext) {
    // Restore last active vault from workspace state
    this._activeVaultPath = _context.workspaceState.get<string>('archipilot.activeVault');
  }

  /** Current active vault path */
  get activeVaultPath(): string | undefined {
    return this._activeVaultPath;
  }

  /** Cached vault files (read-only access for validation, etc.) */
  get cachedFiles(): VaultFile[] {
    return this._cachedFiles;
  }

  /**
   * Resolve the projects root folder.
   * Returns the absolute path to the folder where architecture projects live.
   * Creates the folder if it doesn't exist.
   */
  async getProjectsRoot(): Promise<string | undefined> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return undefined;
    }

    const configured = vscode.workspace
      .getConfiguration('archipilot')
      .get<string>('projectsRoot', 'architectures');

    const rootUri = vscode.Uri.joinPath(workspaceFolders[0].uri, configured || 'architectures');

    // Ensure the folder exists
    try {
      await vscode.workspace.fs.createDirectory(rootUri);
    } catch {
      // ignore — may already exist
    }

    return rootUri.fsPath;
  }

  /** Set active vault and reload */
  async setActiveVault(vaultPath: string): Promise<VaultInfo> {
    this._activeVaultPath = vaultPath;
    this.invalidateCache();
    await this._context.workspaceState.update('archipilot.activeVault', vaultPath);
    const info = await this.loadVault();
    this._onDidChangeVault.fire(info);
    return info;
  }

  /**
   * Scan workspace folders for directories that look like architecture vaults
   * (contain multiple .md files).
   */
  async discoverVaults(): Promise<{ name: string; path: string }[]> {
    const vaults: { name: string; path: string }[] = [];
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      return vaults;
    }

    for (const folder of workspaceFolders) {
      // Check top-level: is it itself a vault?
      const topMds = await this._countMarkdownFiles(folder.uri);
      if (topMds >= 3) {
        vaults.push({ name: folder.name, path: folder.uri.fsPath });
      }

      // Check immediate subdirectories
      try {
        const entries = await vscode.workspace.fs.readDirectory(folder.uri);
        for (const [name, type] of entries) {
          if (type === vscode.FileType.Directory && !name.startsWith('.')) {
            const subUri = vscode.Uri.joinPath(folder.uri, name);
            const subMds = await this._countMarkdownFiles(subUri);
            if (subMds >= 3) {
              vaults.push({ name, path: subUri.fsPath });
            }
          }
        }
      } catch {
        // ignore read errors
      }

      // Also scan the configured projects root (may be nested deeper)
      const projectsRoot = vscode.workspace
        .getConfiguration('archipilot')
        .get<string>('projectsRoot', 'architectures');
      if (projectsRoot) {
        const rootUri = vscode.Uri.joinPath(folder.uri, projectsRoot);
        try {
          const rootEntries = await vscode.workspace.fs.readDirectory(rootUri);
          for (const [name, type] of rootEntries) {
            if (type === vscode.FileType.Directory && !name.startsWith('.')) {
              const subUri = vscode.Uri.joinPath(rootUri, name);
              const subMds = await this._countMarkdownFiles(subUri);
              if (subMds >= 3) {
                // Avoid duplicates
                const fullPath = subUri.fsPath;
                if (!vaults.some((v) => v.path === fullPath)) {
                  vaults.push({ name, path: fullPath });
                }
              }
            }
          }
        } catch {
          // projects root doesn't exist yet — that's fine
        }
      }
    }

    return vaults;
  }

  /**
   * Auto-detect vault: use configured path, or discover, or ask user.
   */
  async autoDetectVault(): Promise<string | undefined> {
    // 1. Check saved state
    if (this._activeVaultPath) {
      try {
        await vscode.workspace.fs.stat(vscode.Uri.file(this._activeVaultPath));
        return this._activeVaultPath;
      } catch {
        // stale path, continue
      }
    }

    // 2. Check setting
    const configured = vscode.workspace.getConfiguration('archipilot').get<string>('vaultPath');
    if (configured) {
      try {
        await vscode.workspace.fs.stat(vscode.Uri.file(configured));
        return configured;
      } catch {
        // invalid setting, continue
      }
    }

    // 3. Discover
    const vaults = await this.discoverVaults();
    if (vaults.length === 1) {
      return vaults[0].path;
    }
    if (vaults.length > 1) {
      // Return first one; user can switch with /switch
      return vaults[0].path;
    }

    return undefined;
  }

  /**
   * Load all markdown files from the active vault into memory.
   * Returns cached result if called within the TTL window.
   */
  async loadVault(): Promise<VaultInfo> {
    const vaultPath = this._activeVaultPath;
    if (!vaultPath) {
      throw new Error('No active vault. Use /switch to select one.');
    }

    // Return cached if fresh
    const now = Date.now();
    if (this._cachedInfo && this._cachedInfo.path === vaultPath && (now - this._cacheTimestamp) < VaultManager.CACHE_TTL_MS) {
      return this._cachedInfo;
    }

    const vaultUri = vscode.Uri.file(vaultPath);
    const files: VaultFile[] = [];

    try {
      const entries = await vscode.workspace.fs.readDirectory(vaultUri);

      // Sort entries by name for consistent ordering
      const sorted = entries
        .filter(([name, type]) => type === vscode.FileType.File && name.endsWith('.md'))
        .sort(([a], [b]) => a.localeCompare(b));

      for (const [name] of sorted) {
        const fileUri = vscode.Uri.joinPath(vaultUri, name);
        const contentBytes = await vscode.workspace.fs.readFile(fileUri);
        const content = Buffer.from(contentBytes).toString('utf-8');

        // Extract YAML front-matter type
        const typeMatch = content.match(/^---[\s\S]*?type:\s*(.+?)[\s\r\n]/m);
        const type = typeMatch ? typeMatch[1].trim() : undefined;

        files.push({
          name,
          path: fileUri.fsPath,
          relativePath: name,
          content,
          type,
        });
      }
    } catch (err) {
      throw new Error(`Failed to read vault at ${vaultPath}: ${err}`);
    }

    this._cachedFiles = files;

    const info: VaultInfo = {
      name: path.basename(vaultPath),
      path: vaultPath,
      fileCount: files.length,
      files,
    };
    this._cachedInfo = info;
    this._cacheTimestamp = Date.now();

    return info;
  }

  /** Invalidate the load cache — forces next loadVault() to re-read from disk */
  invalidateCache(): void {
    this._cachedInfo = undefined;
    this._cacheTimestamp = 0;
  }

  /** Get cached files (call loadVault first) */
  get files(): VaultFile[] {
    return this._cachedFiles;
  }

  /** Get a specific file by name pattern */
  getFile(namePattern: string): VaultFile | undefined {
    const lower = namePattern.toLowerCase();
    return this._cachedFiles.find(
      (f) =>
        f.name.toLowerCase().includes(lower) ||
        (f.type && f.type.toLowerCase().includes(lower))
    );
  }

  /**
   * Build context for the LLM, with smart windowing to stay within token limits.
   * Delegates to src/core/context.ts for the pure logic.
   *
   * @param maxChars Approximate character budget (default ~120K ≈ ~30K tokens)
   * @param priorityFiles File name patterns to always include in full
   * @param mode Optional command mode — scopes which files are included
   */
  buildContext(maxChars: number = 120_000, priorityFiles?: string[], mode?: import('./core/context.js').ContextMode): string {
    // Respect user setting: when contextScoping is disabled, ignore mode
    const cfg = vscode.workspace.getConfiguration('archipilot');
    const scopingEnabled = cfg.get<boolean>('contextScoping', true);
    const effectiveMode = scopingEnabled ? mode : undefined;
    return coreBuildContext(this._cachedFiles, maxChars, priorityFiles, effectiveMode);
  }

  /**
   * Pre-process YAML front matter from all vault files into structured data.
   * Returns a markdown table suitable for injection into LLM prompts.
   */
  getYamlSummaryTable(): string {
    const metas = extractYamlSummary(this._cachedFiles);
    return formatYamlSummaryTable(metas);
  }

  /**
   * Get structured YAML metadata for all vault files.
   */
  getYamlSummary(): YamlMeta[] {
    return extractYamlSummary(this._cachedFiles);
  }

  /**
   * Show quick-pick to switch vaults.
   */
  async promptSwitchVault(): Promise<VaultInfo | undefined> {
    const vaults = await this.discoverVaults();

    if (vaults.length === 0) {
      const folderUri = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false,
        openLabel: 'Select Architecture Vault',
        title: 'Select an Obsidian architecture vault folder',
      });

      if (folderUri && folderUri.length > 0) {
        return this.setActiveVault(folderUri[0].fsPath);
      }
      return undefined;
    }

    const items = vaults.map((v) => ({
      label: v.name,
      description: v.path,
      vaultPath: v.path,
    }));

    // Add browse option
    items.push({
      label: '$(folder-opened) Browse for folder...',
      description: '',
      vaultPath: '__browse__',
    });

    const picked = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select an architecture vault',
      title: 'archipilot – Switch Vault',
    });

    if (!picked) {
      return undefined;
    }

    if (picked.vaultPath === '__browse__') {
      const folderUri = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false,
        openLabel: 'Select Architecture Vault',
      });
      if (folderUri && folderUri.length > 0) {
        return this.setActiveVault(folderUri[0].fsPath);
      }
      return undefined;
    }

    return this.setActiveVault(picked.vaultPath);
  }

  /** Count .md files in a directory */
  private async _countMarkdownFiles(dirUri: vscode.Uri): Promise<number> {
    try {
      const entries = await vscode.workspace.fs.readDirectory(dirUri);
      return entries.filter(
        ([name, type]) => type === vscode.FileType.File && name.endsWith('.md')
      ).length;
    } catch {
      return 0;
    }
  }

  dispose(): void {
    this._onDidChangeVault.dispose();
  }
}
