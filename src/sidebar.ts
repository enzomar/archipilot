/**
 * Sidebar tree-view providers for archipilot.
 *
 * Three views:
 *  1. Vault Explorer   – vault files grouped by TOGAF ADM phase
 *  2. Quick Actions     – common commands as clickable items
 *  3. Architecture Health – live summary of decisions, risks, questions
 */
import * as vscode from 'vscode';
import * as path from 'path';
import { VaultManager } from './vault.js';
import { VaultFile } from './types.js';
import { extractTodos, TodoSummary, TodoCategory, TodoPriority } from './core/index.js';

// ── TOGAF Phase Grouping ───────────────────────────────────────────

interface PhaseGroup {
  label: string;
  icon: string;
  prefixes: string[];
}

const TOGAF_PHASES: PhaseGroup[] = [
  { label: 'Preliminary & Principles', icon: 'shield',        prefixes: ['P', '00'] },
  { label: 'Phase A – Architecture Vision', icon: 'lightbulb', prefixes: ['A'] },
  { label: 'Phase B – Business Architecture', icon: 'briefcase', prefixes: ['B'] },
  { label: 'Phase C – IS Architecture', icon: 'server',        prefixes: ['C'] },
  { label: 'Phase D – Technology Architecture', icon: 'circuit-board', prefixes: ['D'] },
  { label: 'Phase E – Opportunities & Solutions', icon: 'tools', prefixes: ['E'] },
  { label: 'Phase F – Migration Planning', icon: 'rocket',     prefixes: ['F'] },
  { label: 'Phase G – Governance', icon: 'law',                prefixes: ['G'] },
  { label: 'Phase H – Change Management', icon: 'git-pull-request', prefixes: ['H'] },
  { label: 'Requirements Management', icon: 'checklist',       prefixes: ['R'] },
  { label: 'Cross-cutting Artifacts', icon: 'file-text',       prefixes: ['X'] },
];

function phaseForFile(fileName: string): PhaseGroup | undefined {
  const prefix = fileName.replace(/^(\w+)\d*_.*/, '$1').toUpperCase();
  return TOGAF_PHASES.find((p) => p.prefixes.some((pfx) => prefix.startsWith(pfx)));
}

// ── Tree Items ─────────────────────────────────────────────────────

class SidebarItem extends vscode.TreeItem {
  constructor(
    label: string,
    collapsible: vscode.TreeItemCollapsibleState,
    options?: {
      icon?: string;
      description?: string;
      tooltip?: string;
      command?: vscode.Command;
      contextValue?: string;
      resourceUri?: vscode.Uri;
    },
  ) {
    super(label, collapsible);
    if (options?.icon) {
      this.iconPath = new vscode.ThemeIcon(options.icon);
    }
    if (options?.description) {
      this.description = options.description;
    }
    if (options?.tooltip) {
      this.tooltip = options.tooltip;
    }
    if (options?.command) {
      this.command = options.command;
    }
    if (options?.contextValue) {
      this.contextValue = options.contextValue;
    }
    if (options?.resourceUri) {
      this.resourceUri = options.resourceUri;
    }
  }
}

// ── 1. Vault Explorer ──────────────────────────────────────────────

export class VaultExplorerProvider implements vscode.TreeDataProvider<SidebarItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<SidebarItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private readonly vault: VaultManager) {
    vault.onDidChangeVault(() => this.refresh());
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: SidebarItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: SidebarItem): Promise<SidebarItem[]> {
    if (!this.vault.activeVaultPath) {
      return []; // welcome view will show instead
    }

    // Top level → phase groups
    if (!element) {
      try {
        const info = await this.vault.loadVault();
        const items: SidebarItem[] = [];

        // Vault header
        items.push(
          new SidebarItem(
            info.name,
            vscode.TreeItemCollapsibleState.None,
            {
              icon: 'book',
              description: `${info.fileCount} documents`,
              tooltip: `Vault: ${info.path}`,
              command: {
                command: 'archipilot.switchVault',
                title: 'Switch Vault',
              },
            },
          ),
        );

        // Group files by phase
        for (const phase of TOGAF_PHASES) {
          const phaseFiles = info.files.filter((f) => {
            const group = phaseForFile(f.name);
            return group?.label === phase.label;
          });
          if (phaseFiles.length > 0) {
            const item = new SidebarItem(
              phase.label,
              vscode.TreeItemCollapsibleState.Collapsed,
              {
                icon: phase.icon,
                description: `${phaseFiles.length}`,
              },
            );
            // Stash files for getChildren
            (item as any)._phaseFiles = phaseFiles;
            items.push(item);
          }
        }

        return items;
      } catch {
        return [
          new SidebarItem('Error loading vault', vscode.TreeItemCollapsibleState.None, {
            icon: 'error',
          }),
        ];
      }
    }

    // Children → individual files
    const files: VaultFile[] = (element as any)._phaseFiles;
    if (files) {
      return files.map((f) => {
        const status = extractFrontMatterStatus(f.content);
        return new SidebarItem(
          f.name.replace(/\.md$/, ''),
          vscode.TreeItemCollapsibleState.None,
          {
            icon: statusIcon(status),
            description: status || '',
            tooltip: `${f.name}\nStatus: ${status || 'N/A'}\nPath: ${f.path}`,
            contextValue: 'vaultFile',
            resourceUri: vscode.Uri.file(f.path),
            command: {
              command: 'vscode.open',
              title: 'Open Document',
              arguments: [vscode.Uri.file(f.path)],
            },
          },
        );
      });
    }

    return [];
  }
}

// ── 2. Quick Actions ───────────────────────────────────────────────

interface ActionDef {
  label: string;
  icon: string;
  command: string;
  args?: any[];
  description?: string;
}

const QUICK_ACTIONS: ActionDef[] = [
  {
    label: 'Analyze Architecture',
    icon: 'search',
    command: 'workbench.action.chat.open',
    args: [{ query: '@architect /analyze ' }],
    description: '/analyze',
  },
  {
    label: 'Show Vault Status',
    icon: 'info',
    command: 'workbench.action.chat.open',
    args: [{ query: '@architect /status' }],
    description: '/status',
  },
  {
    label: 'Record a Decision',
    icon: 'note',
    command: 'workbench.action.chat.open',
    args: [{ query: '@architect /decide ' }],
    description: '/decide',
  },
  {
    label: 'Update Vault',
    icon: 'edit',
    command: 'workbench.action.chat.open',
    args: [{ query: '@architect /update ' }],
    description: '/update',
  },
  {
    label: 'List TODO Items',
    icon: 'tasklist',
    command: 'workbench.action.chat.open',
    args: [{ query: '@architect /todo' }],
    description: '/todo',
  },
  {
    label: 'Generate C4 Diagram',
    icon: 'type-hierarchy',
    command: 'workbench.action.chat.open',
    args: [{ query: '@architect /c4 ' }],
    description: '/c4',
  },
  {
    label: 'Generate Timeline',
    icon: 'calendar',
    command: 'workbench.action.chat.open',
    args: [{ query: '@architect /timeline' }],
    description: '/timeline',
  },
  {
    label: 'Sizing Catalogue',
    icon: 'dashboard',
    command: 'workbench.action.chat.open',
    args: [{ query: '@architect /sizing ' }],
    description: '/sizing',
  },
  {
    label: 'Export to ArchiMate',
    icon: 'export',
    command: 'archipilot.exportArchimate',
    description: 'XML export',
  },
  {
    label: 'Export to Draw.io',
    icon: 'file-media',
    command: 'archipilot.exportDrawio',
    description: 'Draw.io export',
  },
  {
    label: 'Create New Vault',
    icon: 'new-folder',
    command: 'archipilot.newVault',
    description: 'Scaffold project',
  },
  {
    label: 'Switch Vault',
    icon: 'folder-opened',
    command: 'archipilot.switchVault',
    description: 'Change active vault',
  },
];

export class QuickActionsProvider implements vscode.TreeDataProvider<SidebarItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<SidebarItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: SidebarItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<SidebarItem[]> {
    return QUICK_ACTIONS.map(
      (a) =>
        new SidebarItem(a.label, vscode.TreeItemCollapsibleState.None, {
          icon: a.icon,
          description: a.description,
          command: {
            command: a.command,
            title: a.label,
            arguments: a.args,
          },
        }),
    );
  }
}

// ── 3. Architecture Health ─────────────────────────────────────────

const CATEGORY_LABELS: Record<TodoCategory, { label: string; icon: string }> = {
  'decision':           { label: 'Open Decisions',          icon: 'law' },
  'risk':               { label: 'Open Risks',              icon: 'warning' },
  'question':           { label: 'Open Questions',          icon: 'question' },
  'work-package':       { label: 'Pending Work Packages',   icon: 'package' },
  'milestone':          { label: 'Upcoming Milestones',     icon: 'milestone' },
  'requirement':        { label: 'Open Requirements',       icon: 'checklist' },
  'compliance':         { label: 'Compliance Gaps',         icon: 'shield' },
  'change-request':     { label: 'Pending Change Requests', icon: 'git-pull-request' },
  'document-maturity':  { label: 'Draft Documents',         icon: 'file' },
  'ownership':          { label: 'Unassigned Ownership',    icon: 'person' },
};

const PRIORITY_ICONS: Record<TodoPriority, string> = {
  critical: 'error',
  high: 'warning',
  medium: 'info',
  low: 'circle-outline',
};

export class ArchitectureHealthProvider implements vscode.TreeDataProvider<SidebarItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<SidebarItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  private _summary: TodoSummary | undefined;

  constructor(private readonly vault: VaultManager) {
    vault.onDidChangeVault(() => this.refresh());
  }

  refresh(): void {
    this._summary = undefined;
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: SidebarItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: SidebarItem): Promise<SidebarItem[]> {
    if (!this.vault.activeVaultPath) {
      return [
        new SidebarItem('No vault loaded', vscode.TreeItemCollapsibleState.None, {
          icon: 'info',
        }),
      ];
    }

    // Compute summary once
    if (!this._summary) {
      try {
        const info = await this.vault.loadVault();
        this._summary = extractTodos(info.files);
      } catch {
        return [
          new SidebarItem('Failed to analyze vault', vscode.TreeItemCollapsibleState.None, {
            icon: 'error',
          }),
        ];
      }
    }

    const summary = this._summary;

    // Top-level: show categories that have items
    if (!element) {
      const items: SidebarItem[] = [];

      // Overall score
      const total = summary.totalCount;
      const criticalCount = summary.byPriorityCount.critical || 0;
      const highCount = summary.byPriorityCount.high || 0;
      const healthIcon = criticalCount > 0 ? 'error' : highCount > 0 ? 'warning' : total > 0 ? 'info' : 'pass';
      const healthLabel = criticalCount > 0
        ? 'Needs Attention'
        : highCount > 0
          ? 'Some Issues'
          : total > 0
            ? 'Good Shape'
            : 'All Clear';

      items.push(
        new SidebarItem(
          healthLabel,
          vscode.TreeItemCollapsibleState.None,
          {
            icon: healthIcon,
            description: `${total} open items`,
            tooltip: `Critical: ${criticalCount} | High: ${highCount} | Medium: ${summary.byPriorityCount.medium || 0} | Low: ${summary.byPriorityCount.low || 0}`,
          },
        ),
      );

      // Category breakdown
      for (const [cat, meta] of Object.entries(CATEGORY_LABELS)) {
        const count = summary.byCategoryCount[cat as TodoCategory] || 0;
        if (count > 0) {
          const item = new SidebarItem(
            meta.label,
            vscode.TreeItemCollapsibleState.Collapsed,
            {
              icon: meta.icon,
              description: `${count}`,
            },
          );
          (item as any)._category = cat;
          items.push(item);
        }
      }

      return items;
    }

    // Children: individual todo items in a category
    const cat = (element as any)._category as TodoCategory | undefined;
    if (cat && summary) {
      const filtered = summary.items.filter((t) => t.category === cat);
      return filtered.map(
        (t) =>
          new SidebarItem(t.title, vscode.TreeItemCollapsibleState.None, {
            icon: PRIORITY_ICONS[t.priority],
            description: `${t.id} · ${t.priority}`,
            tooltip: `${t.title}\n\nID: ${t.id}\nPriority: ${t.priority}\nPhase: ${t.phase}\nOwner: ${t.owner}\nSource: ${t.sourceFile}${t.detail ? '\n\n' + t.detail : ''}`,
            command: {
              command: 'vscode.open',
              title: 'Open Source File',
              arguments: [vscode.Uri.file(
                path.join(this.vault.activeVaultPath!, t.sourceFile),
              )],
            },
          }),
      );
    }

    return [];
  }
}

// ── Helpers ────────────────────────────────────────────────────────

function extractFrontMatterStatus(content: string): string | undefined {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return undefined;
  const statusMatch = fmMatch[1].match(/^status:\s*(.+)$/m);
  return statusMatch ? statusMatch[1].trim() : undefined;
}

function statusIcon(status: string | undefined): string {
  if (!status) return 'file';
  const s = status.toLowerCase();
  if (s.includes('approved') || s.includes('accepted') || s.includes('complete')) return 'pass';
  if (s.includes('draft')) return 'edit';
  if (s.includes('review')) return 'eye';
  if (s.includes('deprecated') || s.includes('superseded')) return 'circle-slash';
  if (s.includes('proposed')) return 'lightbulb';
  return 'file';
}
