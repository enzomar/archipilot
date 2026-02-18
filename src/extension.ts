/**
 * archipilot – Extension entry point.
 * Registers the @architect chat participant, commands, and status bar.
 */
import * as vscode from 'vscode';
import { VaultManager } from './vault.js';
import { FileUpdater } from './updater.js';
import { ArchitectParticipant } from './participant.js';
import { exportToArchimate, extractModel, generateExportSummary, formatSummaryMarkdown, exportToDrawio, formatDrawioSummaryMarkdown } from './core/index.js';
import { VaultExplorerProvider, QuickActionsProvider, ArchitectureHealthProvider } from './sidebar.js';
import { registerSmartADRCommand, registerAutoDiagramCommand, registerGraphViewCommand } from './features.js';

let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext): void {
  // ── Core services ──
  const vaultManager = new VaultManager(context);
  const fileUpdater = new FileUpdater(vaultManager);
  const participant = new ArchitectParticipant(vaultManager, fileUpdater);

  // ── Register chat participant ──
  participant.register(context);

  // ── Register Feature Commands ──
  registerSmartADRCommand(context, vaultManager);
  registerAutoDiagramCommand(context);
  registerGraphViewCommand(context, vaultManager);

  // ── Status bar ──
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    50
  );
  statusBarItem.command = 'archipilot.switchVault';
  statusBarItem.tooltip = 'archipilot – Click to switch architecture vault';
  updateStatusBar(vaultManager);
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Update status bar when vault changes
  vaultManager.onDidChangeVault(() => updateStatusBar(vaultManager));

  // ── Sidebar views ──
  const vaultExplorer = new VaultExplorerProvider(vaultManager);
  const quickActions = new QuickActionsProvider();
  const healthProvider = new ArchitectureHealthProvider(vaultManager);

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('archipilot.vaultExplorer', vaultExplorer),
    vscode.window.registerTreeDataProvider('archipilot.quickActions', quickActions),
    vscode.window.registerTreeDataProvider('archipilot.architectureHealth', healthProvider),
  );

  // ── Commands ──
  context.subscriptions.push(
    vscode.commands.registerCommand('archipilot.switchVault', async () => {
      const info = await vaultManager.promptSwitchVault();
      if (info) {
        vscode.window.showInformationMessage(
          `archipilot: Switched to vault "${info.name}" (${info.fileCount} files)`
        );
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('archipilot.showStatus', async () => {
      const vaultPath = await vaultManager.autoDetectVault();
      if (vaultPath) {
        vscode.commands.executeCommand('workbench.action.chat.open', {
          query: '@architect /status',
        });
      } else {
        vscode.window.showWarningMessage(
          'archipilot: No vault found. Use "archipilot: Switch Architecture Vault" to select one.'
        );
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'archipilot.applyCommand',
      async (cmdJson: string) => {
        try {
          const cmd = JSON.parse(cmdJson);
          const result = await fileUpdater.applyCommand(cmd);
          if (result.success) {
            vscode.window.showInformationMessage(`archipilot: ${result.message}`);
            await vaultManager.loadVault();
            vscode.commands.executeCommand('archipilot.refreshSidebar');
          } else {
            vscode.window.showErrorMessage(`archipilot: ${result.message}`);
          }
        } catch (err) {
          vscode.window.showErrorMessage(`archipilot: Failed to apply command – ${err}`);
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('archipilot.newVault', async () => {
      // Trigger the /new flow via a chat message hint
      vscode.window.showInputBox({
        prompt: 'Enter a name for the new architecture project',
        placeHolder: 'My-Architecture-Project',
      }).then(async (name) => {
        if (name) {
          vscode.commands.executeCommand('workbench.action.chat.open', {
            query: `@architect /new ${name}`,
          });
        }
      });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('archipilot.exportArchimate', async () => {
      try {
        const vaultPath = vaultManager.activeVaultPath || await vaultManager.autoDetectVault();
        if (!vaultPath) {
          vscode.window.showWarningMessage(
            'archipilot: No vault found. Use "archipilot: Switch Architecture Vault" to select one.'
          );
          return;
        }
        await vaultManager.setActiveVault(vaultPath);
        const info = await vaultManager.loadVault();
        const model = extractModel(info.files, info.name);
        const xml = exportToArchimate(info.files, info.name);
        const summary = generateExportSummary(model);

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const fileName = `${info.name}_ArchiMate_${timestamp}.xml`;
        const exportDir = vscode.Uri.file(`${vaultPath}/exports/archimate`);
        await vscode.workspace.fs.createDirectory(exportDir);
        const exportUri = vscode.Uri.file(`${vaultPath}/exports/archimate/${fileName}`);

        await vscode.workspace.fs.writeFile(exportUri, Buffer.from(xml, 'utf-8'));

        const summaryMd = formatSummaryMarkdown(summary);
        const choice = await vscode.window.showInformationMessage(
          `ArchiMate export saved: exports/archimate/${fileName} (${summary.totalElements} elements, ${summary.totalRelationships} relationships)`,
          'Open File',
          'Analyze in Chat'
        );

        if (choice === 'Open File') {
          const doc = await vscode.workspace.openTextDocument(exportUri);
          await vscode.window.showTextDocument(doc);
        } else if (choice === 'Analyze in Chat') {
          vscode.commands.executeCommand('workbench.action.chat.open', {
            query: '@architect /archimate Analyze this export',
          });
        }
      } catch (err) {
        vscode.window.showErrorMessage(`archipilot: Export failed – ${err}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('archipilot.exportDrawio', async () => {
      try {
        const vaultPath = vaultManager.activeVaultPath || await vaultManager.autoDetectVault();
        if (!vaultPath) {
          vscode.window.showWarningMessage(
            'archipilot: No vault found. Use "archipilot: Switch Architecture Vault" to select one.'
          );
          return;
        }
        await vaultManager.setActiveVault(vaultPath);
        const info = await vaultManager.loadVault();
        const result = exportToDrawio(info.files, info.name);

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const fileName = `${info.name}_DrawIO_${timestamp}.drawio`;
        const drawioDir = vscode.Uri.file(`${vaultPath}/exports/drawio`);
        await vscode.workspace.fs.createDirectory(drawioDir);
        const exportUri = vscode.Uri.file(`${vaultPath}/exports/drawio/${fileName}`);

        await vscode.workspace.fs.writeFile(exportUri, Buffer.from(result.combinedXml, 'utf-8'));

        const summary = result.summary;
        const choice = await vscode.window.showInformationMessage(
          `Draw.io export saved: exports/drawio/${fileName} (${summary.totalElements} elements, ` +
          `${summary.byMigrationStatus.keep} keep / ${summary.byMigrationStatus.add} add / ${summary.byMigrationStatus.remove} remove)`,
          'Open File',
          'Analyze in Chat'
        );

        if (choice === 'Open File') {
          const doc = await vscode.workspace.openTextDocument(exportUri);
          await vscode.window.showTextDocument(doc);
        } else if (choice === 'Analyze in Chat') {
          vscode.commands.executeCommand('workbench.action.chat.open', {
            query: '@architect /drawio Analyze this export',
          });
        }
      } catch (err) {
        vscode.window.showErrorMessage(`archipilot: Draw.io export failed – ${err}`);
      }
    })
  );

  // ── Sidebar commands ──
  context.subscriptions.push(
    vscode.commands.registerCommand('archipilot.refreshSidebar', () => {
      vaultExplorer.refresh();
      quickActions.refresh();
      healthProvider.refresh();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('archipilot.openDocument', (item: any) => {
      if (item?.resourceUri) {
        vscode.commands.executeCommand('vscode.open', item.resourceUri);
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('archipilot.askCopilot', (item: any) => {
      if (item?.resourceUri) {
        const fileName = item.resourceUri.fsPath.split('/').pop()?.replace(/\.md$/, '') || '';
        vscode.commands.executeCommand('workbench.action.chat.open', {
          query: `@architect /analyze Review the current state of ${fileName} — identify gaps, missing sections, and recommended next actions`,
        });
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('archipilot.openSplitPreview', (item: any) => {
      if (item?.resourceUri) {
        vscode.commands.executeCommand('markdown.showPreviewToSide', item.resourceUri);
      }
    }),
  );

  // ── File-save watcher: auto-refresh sidebar when vault files change ──
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((doc) => {
      const vaultPath = vaultManager.activeVaultPath;
      if (vaultPath && doc.uri.fsPath.startsWith(vaultPath) && doc.uri.fsPath.endsWith('.md')) {
        vaultManager.invalidateCache();
        vscode.commands.executeCommand('archipilot.refreshSidebar');
      }
    }),
  );

  // ── Auto-detect vault on startup ──
  vaultManager.autoDetectVault().then((vaultPath) => {
    if (vaultPath) {
      vaultManager.setActiveVault(vaultPath).then(() => {
        updateStatusBar(vaultManager);
      });
    }
  });

  console.log('archipilot activated');
}

function updateStatusBar(vaultManager: VaultManager): void {
  const vault = vaultManager.activeVaultPath;
  if (vault) {
    const name = vault.split('/').pop() || vault;
    statusBarItem.text = `$(book) archipilot: ${name}`;
  } else {
    statusBarItem.text = '$(book) archipilot: No vault';
  }
}

export function deactivate(): void {
  // cleanup handled by disposables
}
