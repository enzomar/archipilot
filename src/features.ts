import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { VaultManager } from './vault.js';
import { extractTodos } from './core/index.js';

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

            const decisionLogPath = path.join(vault.activeVaultPath, 'X1_ADR_Decision_Log.md');
            let content = '';
            
            // Create file if it doesn't exist
            if (!fs.existsSync(decisionLogPath)) {
                content = `---
type: decision-log
status: draft
---

# Architecture Decision Log

`;
            } else {
                content = fs.readFileSync(decisionLogPath, 'utf-8');
            }

            // Find next ID
            const matches = content.match(/AD-(\d+)/g);
            let nextId = 1;
            if (matches) {
                const ids = matches.map(m => parseInt(m.split('-')[1]));
                nextId = Math.max(...ids) + 1;
            }
            const idString = `AD-${String(nextId).padStart(2, '0')}`;
            const date = new Date().toISOString().split('T')[0];

            // Template for new decision
            const newEntry = `
## ${idString} — ${title}

| Field | Value |
|-------|-------|
| **Status** | 🟡 Proposed |
| **Date Raised** | ${date} |
| **Owner** | ${process.env.USER || 'Author'} |
| **Phase** | Cross-phase |
| **Priority** | Medium |

### Context
Why do we need to make this decision?

### Options
- **Option A**
- **Option B**

### Decision
Pending...
`;

            // Append to file
            const newContent = content + '\n' + newEntry;
            fs.writeFileSync(decisionLogPath, newContent, 'utf-8');

            vscode.window.showInformationMessage(`Recorded Decision: ${idString}`);
            
            // Open the file
            const doc = await vscode.workspace.openTextDocument(decisionLogPath);
            await vscode.window.showTextDocument(doc);

            // Append reference to current editor if open
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor && activeEditor.document.uri.fsPath !== decisionLogPath) {
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
             
             // Find wikilinks
             const regex = /\[\[(.*?)\]\]/g;
             const links = new Set<string>();
             let match;
             while ((match = regex.exec(text)) !== null) {
                 // specific logic to handle aliasing [[Link|Alias]] or [[Link#Anchor]]
                 let link = match[1].split('|')[0];
                 link = link.split('#')[0];
                 if (link !== filename) {
                     links.add(link);
                 }
             }

             if (links.size === 0) {
                 vscode.window.showInformationMessage('No links found to generate a diagram.');
                 return;
             }

             // Generate Mermaid
             let originalMermaid = `
\`\`\`mermaid
flowchart LR
    Center["${filename}"]
    style Center fill:#f9f,stroke:#333,stroke-width:2px
`;
             links.forEach(link => {
                 originalMermaid += `    Center --> ${link.replace(/ /g, '_')}["${link}"]\n`;
             });
             originalMermaid += `\`\`\`\n`;

             // Insert at bottom
             await editor.edit(editBuilder => {
                 editBuilder.insert(editor.document.positionAt(text.length), '\n\n## Context Diagram\n' + originalMermaid);
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
            const edges: string[] = [];
            const nodes = new Set<string>();

            for (const file of vaultInfo.files) {
                const filename = file.name.replace('.md', '');
                nodes.add(filename);

                const regex = /\[\[(.*?)\]\]/g;
                let match;
                while ((match = regex.exec(file.content)) !== null) {
                     let link = match[1].split('|')[0];
                     link = link.split('#')[0];
                     
                     // Check if link exists in vault (approximate)
                     if (vaultInfo.files.some(f => f.name.includes(link))) {
                         edges.push(`    ${filename.replace(/ /g, '_')} --> ${link.replace(/ /g, '_')}["${link}"]`);
                         nodes.add(link);
                     }
                }
            }

            const mermaidContent = `flowchart LR\n${Array.from(nodes).map(n => `    ${n.replace(/ /g, '_')}["${n}"]`).join('\n')}\n${edges.join('\n')}`;
            
            const tempFilePath = path.join(vault.activeVaultPath, 'Vault-Graph.mermaid');
            fs.writeFileSync(tempFilePath, mermaidContent, 'utf-8');
            
            const doc = await vscode.workspace.openTextDocument(tempFilePath);
            await vscode.window.showTextDocument(doc);
        })
    );
}
