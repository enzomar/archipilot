/**
 * AchiPilot – Extension entry point.
 * Registers the @architect chat participant, commands, and status bar.
 */
import * as vscode from 'vscode';
import { VaultManager } from './vault.js';
import { FileUpdater } from './updater.js';
import { ArchitectParticipant } from './participant.js';
import { exportToArchimate, extractModel, generateExportSummary, formatSummaryMarkdown, exportToDrawio, formatDrawioSummaryMarkdown } from './core/index.js';

let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext): void {
  // ── Core services ──
  const vaultManager = new VaultManager(context);
  const fileUpdater = new FileUpdater(vaultManager);
  const participant = new ArchitectParticipant(vaultManager, fileUpdater);

  // ── Register chat participant ──
  participant.register(context);

  // ── Status bar ──
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    50
  );
  statusBarItem.command = 'achipilot.switchVault';
  statusBarItem.tooltip = 'AchiPilot – Click to switch architecture vault';
  updateStatusBar(vaultManager);
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Update status bar when vault changes
  vaultManager.onDidChangeVault(() => updateStatusBar(vaultManager));

  // ── Commands ──
  context.subscriptions.push(
    vscode.commands.registerCommand('achipilot.switchVault', async () => {
      const info = await vaultManager.promptSwitchVault();
      if (info) {
        vscode.window.showInformationMessage(
          `AchiPilot: Switched to vault "${info.name}" (${info.fileCount} files)`
        );
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('achipilot.showStatus', async () => {
      try {
        const vaultPath = await vaultManager.autoDetectVault();
        if (vaultPath) {
          await vaultManager.setActiveVault(vaultPath);
          const info = await vaultManager.loadVault();
          const fileList = info.files.map((f) => `  • ${f.name}`).join('\n');
          vscode.window.showInformationMessage(
            `Vault: ${info.name}\nFiles: ${info.fileCount}\n${fileList}`,
            { modal: true }
          );
        } else {
          vscode.window.showWarningMessage(
            'AchiPilot: No vault found. Use "AchiPilot: Switch Architecture Vault" to select one.'
          );
        }
      } catch (err) {
        vscode.window.showErrorMessage(`AchiPilot: ${err}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'achipilot.applyCommand',
      async (cmdJson: string) => {
        try {
          const cmd = JSON.parse(cmdJson);
          const result = await fileUpdater.applyCommand(cmd);
          if (result.success) {
            vscode.window.showInformationMessage(`AchiPilot: ${result.message}`);
            await vaultManager.loadVault();
          } else {
            vscode.window.showErrorMessage(`AchiPilot: ${result.message}`);
          }
        } catch (err) {
          vscode.window.showErrorMessage(`AchiPilot: Failed to apply command – ${err}`);
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('achipilot.newVault', async () => {
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
    vscode.commands.registerCommand('achipilot.exportArchimate', async () => {
      try {
        const vaultPath = vaultManager.activeVaultPath || await vaultManager.autoDetectVault();
        if (!vaultPath) {
          vscode.window.showWarningMessage(
            'AchiPilot: No vault found. Use "AchiPilot: Switch Architecture Vault" to select one.'
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
        vscode.window.showErrorMessage(`AchiPilot: Export failed – ${err}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('achipilot.exportDrawio', async () => {
      try {
        const vaultPath = vaultManager.activeVaultPath || await vaultManager.autoDetectVault();
        if (!vaultPath) {
          vscode.window.showWarningMessage(
            'AchiPilot: No vault found. Use "AchiPilot: Switch Architecture Vault" to select one.'
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
        vscode.window.showErrorMessage(`AchiPilot: Draw.io export failed – ${err}`);
      }
    })
  );

  // ── Auto-detect vault on startup ──
  vaultManager.autoDetectVault().then((vaultPath) => {
    if (vaultPath) {
      vaultManager.setActiveVault(vaultPath).then(() => {
        updateStatusBar(vaultManager);
      });
    }
  });

  console.log('AchiPilot activated');
}

function updateStatusBar(vaultManager: VaultManager): void {
  const vault = vaultManager.activeVaultPath;
  if (vault) {
    const name = vault.split('/').pop() || vault;
    statusBarItem.text = `$(book) AchiPilot: ${name}`;
  } else {
    statusBarItem.text = '$(book) AchiPilot: No vault';
  }
}

export function deactivate(): void {
  // cleanup handled by disposables
}
