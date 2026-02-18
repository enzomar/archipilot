/**
 * ArchitectParticipant – The @architect chat participant handler.
 * Routes user messages through the correct mode and streams LLM responses.
 */
import * as vscode from 'vscode';
import { VaultManager } from './vault.js';
import { FileUpdater } from './updater.js';
import { buildVaultTemplate } from './vault-template.js';
import {
  buildAnalysisPrompt,
  buildDecidePrompt,
  buildUpdatePrompt,
  buildStatusPrompt,
  buildDefaultPrompt,
  buildC4Prompt,
  buildSizingPrompt,
  buildTimelinePrompt,
  buildArchimatePrompt,
  buildDrawioPrompt,
  buildTodoPrompt,
} from './prompts.js';
import {
  exportToArchimate,
  extractModel,
  generateExportSummary,
  formatSummaryMarkdown,
  exportToDrawio,
  formatDrawioSummaryMarkdown,
  extractTodos,
  formatTodoMarkdown,
} from './core/index.js';

export class ArchitectParticipant {
  private _participant: vscode.ChatParticipant | undefined;

  constructor(
    private readonly _vaultManager: VaultManager,
    private readonly _fileUpdater: FileUpdater
  ) {}

  /**
   * Register the chat participant with VS Code.
   */
  register(context: vscode.ExtensionContext): void {
    this._participant = vscode.chat.createChatParticipant(
      'archipilot.architect',
      this._handler.bind(this)
    );

    this._participant.iconPath = vscode.Uri.joinPath(
      context.extensionUri,
      'media',
      'icon.svg'
    );

    context.subscriptions.push(this._participant);
  }

  /**
   * Main chat handler – receives user messages, loads vault, calls LLM, streams response.
   */
  private async _handler(
    request: vscode.ChatRequest,
    chatContext: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<vscode.ChatResult> {
    // ── Handle /switch command ──
    if (request.command === 'switch') {
      return this._handleSwitch(stream);
    }

    // ── Handle /new command ──
    if (request.command === 'new') {
      return this._handleNewVault(request, stream);
    }

    // ── Handle /archimate command ──
    if (request.command === 'archimate') {
      return this._handleArchimateExport(request, chatContext, stream, token);
    }

    // ── Handle /drawio command ──
    if (request.command === 'drawio') {
      return this._handleDrawioExport(request, chatContext, stream, token);
    }

    // ── Handle /todo command ──
    if (request.command === 'todo') {
      return this._handleTodo(request, chatContext, stream, token);
    }

    // ── Ensure vault is loaded ──
    try {
      await this._ensureVault(stream);
    } catch {
      stream.markdown(
        '⚠️ **No architecture vault found.**\n\n' +
          'Use `/switch` to select a vault folder, or set `archipilot.vaultPath` in settings.'
      );
      return {};
    }

    // ── Load vault context ──
    stream.progress('Loading vault context...');
    const vaultInfo = await this._vaultManager.loadVault();
    const vaultContext = this._vaultManager.buildContext();

    // ── Build system prompt based on command ──
    let systemPrompt: string;
    switch (request.command) {
      case 'analyze':
        systemPrompt = buildAnalysisPrompt(vaultContext);
        break;
      case 'decide':
        systemPrompt = buildDecidePrompt(vaultContext);
        break;
      case 'update':
        systemPrompt = buildUpdatePrompt(vaultContext);
        break;
      case 'status':
        systemPrompt = buildStatusPrompt(vaultContext);
        break;
      case 'c4':
        systemPrompt = buildC4Prompt(vaultContext);
        break;
      case 'sizing':
        systemPrompt = buildSizingPrompt(vaultContext);
        break;
      case 'timeline':
        systemPrompt = buildTimelinePrompt(vaultContext);
        break;
      default:
        systemPrompt = buildDefaultPrompt(vaultContext);
        break;
    }

    // ── Build message history ──
    const messages: vscode.LanguageModelChatMessage[] = [
      vscode.LanguageModelChatMessage.User(systemPrompt),
    ];

    // Add relevant conversation history (last few turns),
    // ensuring alternating User/Assistant roles (no consecutive same-role messages).
    const recentHistory = chatContext.history.slice(-6);
    let lastRole: 'user' | 'assistant' = 'user'; // system prompt counts as user

    for (const turn of recentHistory) {
      if (turn instanceof vscode.ChatRequestTurn) {
        if (turn.prompt.trim()) {
          if (lastRole === 'user') {
            // Merge consecutive user messages or insert a placeholder assistant
            messages.push(vscode.LanguageModelChatMessage.Assistant('(acknowledged)'));
          }
          messages.push(vscode.LanguageModelChatMessage.User(turn.prompt));
          lastRole = 'user';
        }
      } else if (turn instanceof vscode.ChatResponseTurn) {
        let text = '';
        for (const part of turn.response) {
          if (part instanceof vscode.ChatResponseMarkdownPart) {
            text += part.value.value;
          }
        }
        if (text.trim()) {
          if (lastRole === 'assistant') {
            // Merge consecutive assistant messages or insert a placeholder user
            messages.push(vscode.LanguageModelChatMessage.User('(continue)'));
          }
          messages.push(vscode.LanguageModelChatMessage.Assistant(text));
          lastRole = 'assistant';
        }
      }
    }

    // Add current user message – ensure it's never empty
    const userPrompt = request.prompt.trim()
      || (request.command ? `Run /${request.command} analysis on the vault.` : 'Provide an architecture overview.');
    if (lastRole === 'user') {
      // The system prompt (or a history user turn) was last, insert a placeholder assistant turn
      messages.push(vscode.LanguageModelChatMessage.Assistant('(ready)'));
    }
    messages.push(vscode.LanguageModelChatMessage.User(userPrompt));

    // ── Call LLM ──
    stream.progress('Thinking...');
    let fullResponse = '';

    try {
      const chatResponse = await request.model.sendRequest(messages, {}, token);

      for await (const fragment of chatResponse.text) {
        stream.markdown(fragment);
        fullResponse += fragment;
      }
    } catch (err) {
      if (err instanceof vscode.LanguageModelError) {
        stream.markdown(`\n\n⚠️ **LLM Error:** ${err.message}`);
      } else {
        throw err;
      }
      return {};
    }

    // ── Handle /update: parse, validate, preview, and apply commands ──
    if (request.command === 'update' || this._responseContainsCommands(fullResponse)) {
      const commands = this._fileUpdater.parseCommands(fullResponse);
      if (commands.length > 0) {
        stream.markdown('\n\n---\n\n');

        // Detect dry-run mode: user typed "--dry-run" or "--preview" in the prompt
        const isDryRun = /--(?:dry-run|preview)\b/i.test(request.prompt);

        // Step 1: Schema validation
        const validationErrors = this._fileUpdater.validateCommands(commands);
        if (validationErrors.length > 0) {
          stream.markdown(`⚠️ **Validation failed for ${validationErrors.length} command(s):**\n\n`);
          for (const ve of validationErrors) {
            stream.markdown(`- \`${ve.command.command}\` on \`${ve.command.file}\`: ${ve.errors.join('; ')}\n`);
          }
          stream.markdown('\n> Commands with validation errors were **not applied**. Ask the agent to fix them.\n');

          // Filter to only valid commands
          const invalidFiles = new Set(validationErrors.map((ve) => JSON.stringify(ve.command)));
          const validCommands = commands.filter((cmd) => !invalidFiles.has(JSON.stringify(cmd)));
          if (validCommands.length === 0) {
            return {};
          }
          stream.markdown(`\n✅ ${validCommands.length} valid command(s) remain.\n\n`);
        }

        // Step 2: Diff preview
        const validCommands = commands.filter((cmd) => {
          const invalid = validationErrors.find((ve) => ve.command === cmd);
          return !invalid;
        });

        const previews = await this._fileUpdater.previewCommands(validCommands);
        stream.markdown(`📋 **${previews.length} proposed change(s):**\n\n`);

        for (const preview of previews) {
          stream.markdown(`### ${preview.isNewFile ? '🆕' : '✏️'} \`${preview.command}\` → \`${preview.file}\`\n`);
          stream.markdown(`${preview.summary}\n\n`);
          if (preview.before) {
            stream.markdown(`**Before:**\n\`\`\`\n${preview.before}\n\`\`\`\n`);
          }
          stream.markdown(`**After:**\n\`\`\`\n${preview.after}\n\`\`\`\n\n`);
        }

        // Dry-run mode: show preview only, no confirmation or apply
        if (isDryRun) {
          stream.markdown('\n> 🔍 **Dry-run mode** — preview only. No files were modified.\n');
          stream.markdown('> Remove `--dry-run` from your prompt to apply changes.\n');
          return {};
        }

        // Step 3: Ask for confirmation
        const confirm = await vscode.window.showWarningMessage(
          `archipilot: Apply ${validCommands.length} change(s) to your vault?`,
          { modal: true, detail: previews.map((p) => `• ${p.summary}`).join('\n') },
          'Apply All',
          'Cancel'
        );

        if (confirm !== 'Apply All') {
          stream.markdown('\n> ℹ️ **Changes cancelled** — no files were modified.\n');
          return {};
        }

        // Step 4: Apply (with audit log + backups)
        stream.markdown('\n**Applying changes...**\n\n');

        // Generate a hash of the user prompt for audit traceability
        const promptHash = this._hashString(request.prompt);
        const results = await this._fileUpdater.applyCommands(validCommands, promptHash);
        for (const result of results) {
          if (result.success) {
            stream.markdown(`✅ ${result.message}\n\n`);
          } else {
            stream.markdown(`❌ ${result.message}\n\n`);
          }
        }

        // Add file references for changed files
        for (const result of results) {
          if (result.success) {
            const file = this._vaultManager.getFile(result.file);
            if (file) {
              stream.anchor(vscode.Uri.file(file.path), result.file);
              stream.markdown(' ');
            }
          }
        }

        // Refresh sidebar views to reflect mutations
        await this._vaultManager.loadVault();
        vscode.commands.executeCommand('archipilot.refreshSidebar');

        stream.markdown('\n\n> 💡 Changes applied. Use `Ctrl+Z` / `Cmd+Z` in each file to undo.');
      }
    }

    // ── Add vault reference ──
    stream.markdown(`\n\n---\n*Vault: ${vaultInfo.name} (${vaultInfo.fileCount} files)*`);

    return {};
  }

  /**
   * Handle /switch – prompt user to select a vault.
   */
  private async _handleSwitch(
    stream: vscode.ChatResponseStream
  ): Promise<vscode.ChatResult> {
    stream.progress('Scanning for vaults...');
    const vaultInfo = await this._vaultManager.promptSwitchVault();

    if (vaultInfo) {
      stream.markdown(
        `✅ **Switched to vault:** ${vaultInfo.name}\n\n` +
          `📁 Path: \`${vaultInfo.path}\`\n` +
          `📄 Files: ${vaultInfo.fileCount}\n\n` +
          `Ready for architecture work. Try:\n` +
          `- \`/status\` – vault overview\n` +
          `- \`/analyze\` – architecture analysis\n` +
          `- \`/decide\` – decision support\n` +
          `- \`/update\` – modify documents\n` +
          `- \`/c4\` – generate C4 model\n` +
          `- \`/sizing\` – sizing catalogue\n` +
          `- \`/timeline\` – delivery timeline\n` +
          `- \`/drawio\` – Draw.io export (As-Is / Target / Migration)\n` +
          `- \`/todo\` – TOGAF action items\n` +
          `- \`/new\` – create empty vault`
      );
    } else {
      stream.markdown('ℹ️ No vault selected. Operation cancelled.');
    }

    return {};
  }

  /**
   * Ensure a vault is loaded, auto-detecting if needed.
   */
  private async _ensureVault(stream: vscode.ChatResponseStream): Promise<void> {
    if (!this._vaultManager.activeVaultPath) {
      stream.progress('Auto-detecting vault...');
      const detected = await this._vaultManager.autoDetectVault();
      if (detected) {
        await this._vaultManager.setActiveVault(detected);
      } else {
        throw new Error('No vault found');
      }
    }
  }

  /**
   * Check if the LLM response contains structured commands.
   */
  private _responseContainsCommands(text: string): boolean {
    return /```json\s*\n\s*\{\s*"command"\s*:/.test(text);
  }

  /**
   * Simple hash for audit traceability (not cryptographic).
   */
  private _hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  /**
   * Handle /new – scaffold a new empty architecture vault.
   */
  private async _handleNewVault(
    request: vscode.ChatRequest,
    stream: vscode.ChatResponseStream
  ): Promise<vscode.ChatResult> {
    const projectName = request.prompt.trim() || 'New-Architecture-Project';
    const safeName = projectName.replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '-');

    // Determine parent directory — use the configured projects root
    let parentPath: string | undefined;

    parentPath = await this._vaultManager.getProjectsRoot();

    if (!parentPath) {
      const folderUri = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false,
        openLabel: 'Select parent folder',
        title: 'Where to create the new vault?',
      });
      if (!folderUri || folderUri.length === 0) {
        stream.markdown('ℹ️ No folder selected. Operation cancelled.');
        return {};
      }
      parentPath = folderUri[0].fsPath;
    }

    const vaultPath = vscode.Uri.file(`${parentPath}/${safeName}`);

    stream.progress(`Creating TOGAF-aligned vault "${safeName}"...`);

    // Generate template files from the TOGAF-aligned template
    const templateFiles = buildVaultTemplate(projectName);

    try {
      await vscode.workspace.fs.createDirectory(vaultPath);

      for (const file of templateFiles) {
        const fileUri = vscode.Uri.joinPath(vaultPath, file.name);
        await vscode.workspace.fs.writeFile(fileUri, Buffer.from(file.content, 'utf-8'));
      }

      // Switch to the new vault
      await this._vaultManager.setActiveVault(vaultPath.fsPath);

      // Build a structured summary grouped by ADM phase
      const phaseGroups: Record<string, string[]> = {
        'Preliminary': [],
        'Phase A — Vision': [],
        'Phase B — Business': [],
        'Phase C — Info Systems': [],
        'Phase D — Technology': [],
        'Phase E — Solutions': [],
        'Phase F — Migration': [],
        'Phase G — Governance': [],
        'Phase H — Change Mgmt': [],
        'Requirements': [],
        'Cross-Phase': [],
      };

      for (const f of templateFiles) {
        const prefix = f.name.split('_')[0];
        if (prefix === '00') { continue; }
        else if (prefix.startsWith('P')) { phaseGroups['Preliminary'].push(f.name); }
        else if (prefix.startsWith('A')) { phaseGroups['Phase A — Vision'].push(f.name); }
        else if (prefix.startsWith('B')) { phaseGroups['Phase B — Business'].push(f.name); }
        else if (prefix.startsWith('C')) { phaseGroups['Phase C — Info Systems'].push(f.name); }
        else if (prefix.startsWith('D')) { phaseGroups['Phase D — Technology'].push(f.name); }
        else if (prefix.startsWith('E')) { phaseGroups['Phase E — Solutions'].push(f.name); }
        else if (prefix.startsWith('F')) { phaseGroups['Phase F — Migration'].push(f.name); }
        else if (prefix.startsWith('G')) { phaseGroups['Phase G — Governance'].push(f.name); }
        else if (prefix.startsWith('H')) { phaseGroups['Phase H — Change Mgmt'].push(f.name); }
        else if (prefix.startsWith('R')) { phaseGroups['Requirements'].push(f.name); }
        else if (prefix.startsWith('X')) { phaseGroups['Cross-Phase'].push(f.name); }
      }

      let fileTree = '';
      for (const [phase, files] of Object.entries(phaseGroups)) {
        if (files.length > 0) {
          fileTree += `\n**${phase}**\n`;
          fileTree += files.map((f) => `- \`${f}\``).join('\n') + '\n';
        }
      }

      stream.markdown(
        `✅ **Vault created:** ${safeName}\n\n` +
          `📁 Path: \`${vaultPath.fsPath}\`\n` +
          `📄 Files: ${templateFiles.length} TOGAF ADM-aligned documents\n` +
          `📐 Version: 0.1.0 (all files)\n\n` +
          `### Structure (by ADM Phase)\n` +
          fileTree + '\n' +
          `### YAML Front Matter\n\n` +
          `Every file includes: \`togaf_phase\`, \`artifact_type\`, \`version\`, \`status\`, \`created\`, \`last_modified\`, \`owner\`\n\n` +
          `The vault is now your active project. Start with:\n` +
          `- \`/status\` — see overview\n` +
          `- \`/analyze\` — start architecture work\n` +
          `- \`/update\` — populate documents`
      );
    } catch (err) {
      stream.markdown(`❌ **Failed to create vault:** ${err}`);
    }

    return {};
  }

  /**
   * Handle /archimate – export vault to ArchiMate Open Exchange Format 3.2 XML.
   */
  private async _handleArchimateExport(
    request: vscode.ChatRequest,
    chatContext: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<vscode.ChatResult> {
    // Ensure vault is loaded
    try {
      await this._ensureVault(stream);
    } catch {
      stream.markdown(
        '⚠️ **No architecture vault found.**\n\n' +
          'Use `/switch` to select a vault folder, or set `archipilot.vaultPath` in settings.'
      );
      return {};
    }

    stream.progress('Loading vault for ArchiMate export...');
    const vaultInfo = await this._vaultManager.loadVault();
    const vaultContext = this._vaultManager.buildContext();

    // ── Step 1: Extract and serialize ──
    stream.progress('Extracting ArchiMate model from vault...');
    const model = extractModel(vaultInfo.files, vaultInfo.name);
    const xml = exportToArchimate(vaultInfo.files, vaultInfo.name);
    const summary = generateExportSummary(model);
    const summaryMd = formatSummaryMarkdown(summary);

    // ── Step 2: Write XML file into exports/archimate/ ──
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `${vaultInfo.name}_ArchiMate_${timestamp}.xml`;
    const vaultPath = this._vaultManager.activeVaultPath!;
    const exportDir = `${vaultPath}/exports/archimate`;
    const exportPath = `${exportDir}/${fileName}`;

    try {
      // Ensure exports/archimate/ folder exists
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(exportDir));
      const exportUri = vscode.Uri.file(exportPath);
      await vscode.workspace.fs.writeFile(exportUri, Buffer.from(xml, 'utf-8'));

      stream.markdown(`✅ **ArchiMate export saved:**\n\n`);
      stream.markdown(`📁 \`exports/archimate/${fileName}\`\n\n`);
      stream.anchor(exportUri, fileName);
      stream.markdown('\n\n');
    } catch (err) {
      stream.markdown(`❌ **Failed to write export file:** ${err}\n\n`);
      stream.markdown('The XML content was generated but could not be saved.\n\n');
    }

    // ── Step 3: Show summary ──
    stream.markdown(summaryMd);

    stream.markdown('\n\n### 🔧 Compatibility\n\n');
    stream.markdown('| Tool | Import Method |\n');
    stream.markdown('|------|---------------|\n');
    stream.markdown('| **Archi** | File → Import → Open Exchange File |\n');
    stream.markdown('| **BiZZdesign** | File → Import → ArchiMate Exchange |\n');
    stream.markdown('| **Sparx EA** | Publish → Model Exchange → Import |\n');
    stream.markdown('| **ADOIT** | Import → ArchiMate Open Exchange |\n');

    // ── Step 4: Optionally call LLM for analysis ──
    const wantAnalysis = !request.prompt.includes('--no-analysis');

    if (wantAnalysis && !token.isCancellationRequested) {
      stream.progress('Analyzing export quality...');

      const systemPrompt = buildArchimatePrompt(vaultContext, summaryMd);
      const messages: vscode.LanguageModelChatMessage[] = [
        vscode.LanguageModelChatMessage.User(systemPrompt),
      ];

      const userPrompt = request.prompt.trim() || 'Analyze this ArchiMate export for completeness and quality.';
      messages.push(vscode.LanguageModelChatMessage.Assistant('(ready)'));
      messages.push(vscode.LanguageModelChatMessage.User(userPrompt));

      try {
        const chatResponse = await request.model.sendRequest(messages, {}, token);
        stream.markdown('\n\n---\n\n### 🧠 AI Analysis\n\n');
        for await (const fragment of chatResponse.text) {
          stream.markdown(fragment);
        }
      } catch (err) {
        if (err instanceof vscode.LanguageModelError) {
          stream.markdown(`\n\n⚠️ **LLM Analysis Error:** ${err.message}`);
        }
        // Non-fatal: export succeeded even if analysis fails
      }
    }

    stream.markdown(`\n\n---\n*Vault: ${vaultInfo.name} (${vaultInfo.fileCount} files) — ArchiMate 3.2 Open Exchange Format*`);

    return {};
  }

  /**
   * Handle /drawio – export vault to Draw.io diagrams (As-Is, Target, Migration).
   */
  private async _handleDrawioExport(
    request: vscode.ChatRequest,
    chatContext: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<vscode.ChatResult> {
    // Ensure vault is loaded
    try {
      await this._ensureVault(stream);
    } catch {
      stream.markdown(
        '⚠️ **No architecture vault found.**\n\n' +
          'Use `/switch` to select a vault folder, or set `archipilot.vaultPath` in settings.'
      );
      return {};
    }

    stream.progress('Loading vault for Draw.io export...');
    const vaultInfo = await this._vaultManager.loadVault();
    const vaultContext = this._vaultManager.buildContext();

    // ── Step 1: Generate Draw.io diagrams ──
    stream.progress('Generating Draw.io diagrams (As-Is, Target, Migration)...');
    const result = exportToDrawio(vaultInfo.files, vaultInfo.name);
    const summaryMd = formatDrawioSummaryMarkdown(result.summary);

    // ── Step 2: Write files into exports/drawio/ ──
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const vaultPath = this._vaultManager.activeVaultPath!;
    const drawioDir = `${vaultPath}/exports/drawio`;
    const fileNames = {
      combined: `${vaultInfo.name}_DrawIO_${timestamp}.drawio`,
      asIs: `${vaultInfo.name}_AsIs_${timestamp}.drawio`,
      target: `${vaultInfo.name}_Target_${timestamp}.drawio`,
      migration: `${vaultInfo.name}_Migration_${timestamp}.drawio`,
    };

    try {
      // Ensure exports/drawio/ folder exists
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(drawioDir));

      // Write combined multi-tab file (primary output)
      const combinedUri = vscode.Uri.file(`${drawioDir}/${fileNames.combined}`);
      await vscode.workspace.fs.writeFile(combinedUri, Buffer.from(result.combinedXml, 'utf-8'));

      // Write individual files
      const asIsUri = vscode.Uri.file(`${drawioDir}/${fileNames.asIs}`);
      await vscode.workspace.fs.writeFile(asIsUri, Buffer.from(result.asIsXml, 'utf-8'));

      const targetUri = vscode.Uri.file(`${drawioDir}/${fileNames.target}`);
      await vscode.workspace.fs.writeFile(targetUri, Buffer.from(result.targetXml, 'utf-8'));

      const migrationUri = vscode.Uri.file(`${drawioDir}/${fileNames.migration}`);
      await vscode.workspace.fs.writeFile(migrationUri, Buffer.from(result.migrationXml, 'utf-8'));

      stream.markdown(`✅ **Draw.io export saved — 4 files in \`exports/drawio/\`:**\n\n`);
      stream.markdown(`📁 **Combined (3 tabs):** \`exports/drawio/${fileNames.combined}\`\n`);
      stream.anchor(combinedUri, fileNames.combined);
      stream.markdown('\n');
      stream.markdown(`📁 **As-Is:** \`exports/drawio/${fileNames.asIs}\`\n`);
      stream.anchor(asIsUri, fileNames.asIs);
      stream.markdown('\n');
      stream.markdown(`📁 **Target:** \`exports/drawio/${fileNames.target}\`\n`);
      stream.anchor(targetUri, fileNames.target);
      stream.markdown('\n');
      stream.markdown(`📁 **Migration:** \`exports/drawio/${fileNames.migration}\`\n`);
      stream.anchor(migrationUri, fileNames.migration);
      stream.markdown('\n\n');
    } catch (err) {
      stream.markdown(`❌ **Failed to write export files:** ${err}\n\n`);
    }

    // ── Step 3: Show summary ──
    stream.markdown(summaryMd);

    stream.markdown('\n\n### 🎨 Color Legend (Migration Diagram)\n\n');
    stream.markdown('| Color | Meaning | Description |\n');
    stream.markdown('|-------|---------|-------------|\n');
    stream.markdown('| 🔴 Red | **Remove** | Exists in As-Is but not in Target — to be retired |\n');
    stream.markdown('| 🟢 Green | **Add** | New in Target — to be implemented |\n');
    stream.markdown('| 🔵 Blue | **Keep** | Unchanged — carried over from As-Is to Target |\n');

    stream.markdown('\n\n### 🔧 How to Open\n\n');
    stream.markdown('| Tool | Method |\n');
    stream.markdown('|------|--------|\n');
    stream.markdown('| **VS Code** | Install "Draw.io Integration" extension, then click the .drawio file |\n');
    stream.markdown('| **diagrams.net** | File → Open From → Device |\n');
    stream.markdown('| **Confluence** | Insert → Draw.io Diagram → Import |\n');

    // ── Step 4: Optionally call LLM for analysis ──
    const wantAnalysis = !request.prompt.includes('--no-analysis');

    if (wantAnalysis && !token.isCancellationRequested) {
      stream.progress('Analyzing migration classification...');

      const systemPrompt = buildDrawioPrompt(vaultContext, summaryMd);
      const messages: vscode.LanguageModelChatMessage[] = [
        vscode.LanguageModelChatMessage.User(systemPrompt),
      ];

      const userPrompt = request.prompt.trim() || 'Analyze this Draw.io export for migration completeness and classification accuracy.';
      messages.push(vscode.LanguageModelChatMessage.Assistant('(ready)'));
      messages.push(vscode.LanguageModelChatMessage.User(userPrompt));

      try {
        const chatResponse = await request.model.sendRequest(messages, {}, token);
        stream.markdown('\n\n---\n\n### 🧠 AI Analysis\n\n');
        for await (const fragment of chatResponse.text) {
          stream.markdown(fragment);
        }
      } catch (err) {
        if (err instanceof vscode.LanguageModelError) {
          stream.markdown(`\n\n⚠️ **LLM Analysis Error:** ${err.message}`);
        }
      }
    }

    stream.markdown(`\n\n---\n*Vault: ${vaultInfo.name} (${vaultInfo.fileCount} files) — Draw.io Architecture Export*`);

    return {};
  }

  /**
   * Handle /todo – extract and display TOGAF action items from the vault.
   */
  private async _handleTodo(
    request: vscode.ChatRequest,
    chatContext: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<vscode.ChatResult> {
    // Ensure vault is loaded
    try {
      await this._ensureVault(stream);
    } catch {
      stream.markdown(
        '⚠️ **No architecture vault found.**\n\n' +
          'Use `/switch` to select a vault folder, or set `archipilot.vaultPath` in settings.'
      );
      return {};
    }

    stream.progress('Scanning vault for TOGAF action items...');
    const vaultInfo = await this._vaultManager.loadVault();
    const vaultContext = this._vaultManager.buildContext();

    // ── Step 1: Extract structured TODOs ──
    stream.progress('Extracting open decisions, risks, questions, work packages...');
    const summary = extractTodos(vaultInfo.files);
    const todoMd = formatTodoMarkdown(summary);

    // ── Step 2: Show the structured list ──
    stream.markdown(todoMd);

    // ── Step 3: Optionally call LLM for prioritisation & analysis ──
    const wantAnalysis = !request.prompt.includes('--no-analysis');

    if (wantAnalysis && !token.isCancellationRequested) {
      stream.progress('Analyzing priorities and dependencies...');

      const systemPrompt = buildTodoPrompt(vaultContext, todoMd);
      const messages: vscode.LanguageModelChatMessage[] = [
        vscode.LanguageModelChatMessage.User(systemPrompt),
      ];

      const userPrompt = request.prompt.trim() || 'Prioritize these TODOs and suggest the next sprint actions.';
      messages.push(vscode.LanguageModelChatMessage.Assistant('(ready)'));
      messages.push(vscode.LanguageModelChatMessage.User(userPrompt));

      try {
        const chatResponse = await request.model.sendRequest(messages, {}, token);
        stream.markdown('\n\n---\n\n### 🧠 AI Prioritisation & Analysis\n\n');
        for await (const fragment of chatResponse.text) {
          stream.markdown(fragment);
        }
      } catch (err) {
        if (err instanceof vscode.LanguageModelError) {
          stream.markdown(`\n\n⚠️ **LLM Analysis Error:** ${err.message}`);
        }
      }
    }

    stream.markdown(`\n\n---\n*Vault: ${vaultInfo.name} (${vaultInfo.fileCount} files) — TOGAF TODO Scan*`);

    return {};
  }

  dispose(): void {
    this._participant?.dispose();
  }
}
