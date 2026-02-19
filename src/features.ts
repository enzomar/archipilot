import * as vscode from 'vscode';
import * as path from 'path';
import { VaultManager } from './vault.js';
import {
  ADR_DEFAULT_CONTENT,
  nextAdrId,
  formatAdrEntry,
  extractWikiLinks,
  generateContextDiagramMermaid,
  generateVaultGraphMermaid,
} from './core/index.js';

// ── 1. Smart ADR Creation ──────────────────────────────────────────

export async function registerSmartADRCommand(context: vscode.ExtensionContext, vault: VaultManager) {
    context.subscriptions.push(
        vscode.commands.registerCommand('archipilot.recordDecision', async () => {
            if (!vault.activeVaultPath) {
                vscode.window.showErrorMessage('No active vault found.');
                return;
            }

            const title = await vscode.window.showInputBox({ 
                prompt: 'Enter Decision Title', 
                placeHolder: 'e.g., Use Postgres for transactional data' 
            });
            if (!title) return;

            const decisionLogUri = vscode.Uri.file(
                path.join(vault.activeVaultPath, 'X1_ADR_Decision_Log.md'),
            );
            let content = '';

            try {
                const bytes = await vscode.workspace.fs.readFile(decisionLogUri);
                content = Buffer.from(bytes).toString('utf-8');
            } catch {
                content = ADR_DEFAULT_CONTENT;
            }

            const idString = nextAdrId(content);
            const date = new Date().toISOString().split('T')[0];
            const newEntry = formatAdrEntry(idString, title, date);

            await vscode.workspace.fs.writeFile(
                decisionLogUri,
                Buffer.from(content + '\n' + newEntry, 'utf-8'),
            );

            vscode.window.showInformationMessage(`Recorded Decision: ${idString}`);

            const doc = await vscode.workspace.openTextDocument(decisionLogUri);
            await vscode.window.showTextDocument(doc);

            // Append reference to current editor if open
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor && activeEditor.document.uri.fsPath !== decisionLogUri.fsPath) {
                const ref = `\n\nReference: [[X1_ADR_Decision_Log#${idString}]]`;
                await activeEditor.edit(editBuilder => {
                    editBuilder.insert(activeEditor.document.positionAt(activeEditor.document.getText().length), ref);
                });
            }
        })
    );
}

// ── 2. Auto-Diagramming ──────────────────────────────────────────────

export async function registerAutoDiagramCommand(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('archipilot.generateContextDiagram', async () => {
             const editor = vscode.window.activeTextEditor;
             if (!editor) return;

             const text = editor.document.getText();
             const filename = path.basename(editor.document.fileName, path.extname(editor.document.fileName));

             const links = extractWikiLinks(text, filename);

             if (links.size === 0) {
                 vscode.window.showInformationMessage('No links found to generate a diagram.');
                 return;
             }

             const mermaid = generateContextDiagramMermaid(filename, links);
             const insertText = `\n\n## Context Diagram\n\n\`\`\`mermaid\n${mermaid}\`\`\`\n`;

             await editor.edit(editBuilder => {
                 editBuilder.insert(editor.document.positionAt(text.length), insertText);
             });
        })
    );
}

// ── 4. Visualize Vault (Graph View) ──────────────────────────────────

export async function registerGraphViewCommand(context: vscode.ExtensionContext, vault: VaultManager) {
    context.subscriptions.push(
        vscode.commands.registerCommand('archipilot.showGraph', async () => {
            if (!vault.activeVaultPath) {
                vscode.window.showErrorMessage('No active vault found.');
                return;
            }

            const vaultInfo = await vault.loadVault();

            const { mermaid } = generateVaultGraphMermaid(vaultInfo.files);

            const graphUri = vscode.Uri.file(
                path.join(vault.activeVaultPath, 'Vault-Graph.mermaid'),
            );
            await vscode.workspace.fs.writeFile(graphUri, Buffer.from(mermaid, 'utf-8'));

            const doc = await vscode.workspace.openTextDocument(graphUri);
            await vscode.window.showTextDocument(doc);
        })
    );
}
