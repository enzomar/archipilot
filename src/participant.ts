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
  buildDecideAnalysisPrompt,
  buildDecideRecordPrompt,
  buildUpdatePrompt,
  buildStatusPrompt,
  buildDefaultPrompt,
  buildC4Prompt,
  buildSizingPrompt,
  buildTimelinePrompt,
  buildArchimatePrompt,
  buildDrawioPrompt,
  buildTodoPrompt,
  buildReviewPrompt,
  buildGatePrompt,
  buildScanPrompt,
  buildAuditPrompt,
} from './prompts.js';
import type { AuditScope } from './prompts.js';
import { scanWorkspaceFiles, formatScanContext } from './source-scanner.js';
import {
  exportToArchimate,
  extractModel,
  generateExportSummary,
  formatSummaryMarkdown,
  exportToDrawio,
  formatDrawioSummaryMarkdown,
  extractTodos,
  formatTodoMarkdown,
  extractC4Scaffold,
  formatC4ScaffoldMarkdown,
  extractSizingScaffold,
  formatSizingScaffoldMarkdown,
  extractTimelineScaffold,
  formatTimelineScaffoldMarkdown,
  ADR_DEFAULT_CONTENT,
  nextAdrId,
  formatAdrEntry,
  extractWikiLinks,
  generateContextDiagramMermaid,
  generateVaultGraphMermaid,
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

    // ── Handle /c4 command (deterministic scaffold + LLM) ──
    if (request.command === 'c4') {
      return this._handleC4(request, chatContext, stream, token);
    }

    // ── Handle /sizing command (deterministic scaffold + LLM) ──
    if (request.command === 'sizing') {
      return this._handleSizing(request, chatContext, stream, token);
    }

    // ── Handle /timeline command (deterministic scaffold + LLM) ──
    if (request.command === 'timeline') {
      return this._handleTimeline(request, chatContext, stream, token);
    }

    // ── Handle /adr command ──
    if (request.command === 'adr') {
      return this._handleADR(request, stream);
    }

    // ── Handle /diagram command ──
    if (request.command === 'diagram') {
      return this._handleDiagram(stream);
    }

    // ── Handle /graph command ──
    if (request.command === 'graph') {
      return this._handleGraph(stream);
    }

    // ── Handle /impact command ──
    if (request.command === 'impact') {
      return this._handleImpact(request, stream);
    }

    // ── Handle /status command (pre-computed dashboard) ──
    if (request.command === 'status') {
      return this._handleStatus(request, chatContext, stream, token);
    }

    // ── Handle /review command (alias → /audit) ──
    if (request.command === 'review') {
      return this._handleAudit(request, chatContext, stream, token, 'full');
    }

    // ── Handle /gate command (alias → /audit) ──
    if (request.command === 'gate') {
      return this._handleAudit(request, chatContext, stream, token, 'full');
    }

    // ── Handle /audit command (unified health check) ──
    if (request.command === 'audit') {
      const scope: AuditScope = request.prompt.includes('--quick') ? 'quick' : 'full';
      return this._handleAudit(request, chatContext, stream, token, scope);
    }

    // ── Handle /scan command ──
    if (request.command === 'scan') {
      return this._handleScan(request, stream, token);
    }

    // ── Handle /decide command (two-step: analysis → record) ──
    if (request.command === 'decide') {
      return this._handleDecide(request, chatContext, stream, token);
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

    // ── Load vault context (scoped by command mode) ──
    stream.progress('Loading vault context...');
    const vaultInfo = await this._vaultManager.loadVault();
    const ctxMode = (request.command as import('./core/context.js').ContextMode) ?? 'default';
    const vaultContext = this._vaultManager.buildContext(undefined, undefined, ctxMode);

    // ── Build system prompt based on command ──
    let systemPrompt: string;
    switch (request.command) {
      case 'analyze':
        systemPrompt = buildAnalysisPrompt(vaultContext);
        break;
      case 'update':
        systemPrompt = buildUpdatePrompt(vaultContext, this._vaultManager.getYamlSummaryTable());
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
        let validCommands = commands.filter((cmd) => {
          const invalid = validationErrors.find((ve) => ve.command === cmd);
          return !invalid;
        });

        const previews = await this._fileUpdater.previewCommands(validCommands);
        stream.markdown(`📋 **${previews.length} proposed change(s):**\n\n`);

        let hasBlockingErrors = false;
        for (const preview of previews) {
          stream.markdown(`### ${preview.isNewFile ? '🆕' : '✏️'} \`${preview.command}\` → \`${preview.file}\`\n`);
          stream.markdown(`${preview.summary}\n\n`);

          // Show vault validation issues
          if (preview.validationErrors?.length) {
            hasBlockingErrors = true;
            stream.markdown(`> 🛑 **Validation errors:**\n`);
            for (const e of preview.validationErrors) {
              stream.markdown(`> - ${e}\n`);
            }
            stream.markdown('\n');
          }
          if (preview.validationWarnings?.length) {
            for (const w of preview.validationWarnings) {
              stream.markdown(`> ⚠️ ${w}\n`);
            }
            stream.markdown('\n');
          }
          if (preview.validationSuggestions?.length) {
            for (const s of preview.validationSuggestions) {
              stream.markdown(`> 💡 ${s}\n`);
            }
            stream.markdown('\n');
          }

          // Prefer unified diff when available
          if (preview.unifiedDiff) {
            stream.markdown(`\`\`\`diff\n${preview.unifiedDiff}\n\`\`\`\n\n`);
          } else {
            if (preview.before) {
              stream.markdown(`**Before:**\n\`\`\`\n${preview.before}\n\`\`\`\n`);
            }
            stream.markdown(`**After:**\n\`\`\`\n${preview.after}\n\`\`\`\n\n`);
          }
        }

        if (hasBlockingErrors) {
          stream.markdown('\n> 🛑 **Some commands have validation errors.** Fix them and try again, or the errored commands will be skipped.\n\n');
          // Remove commands with validation errors
          const blockedFiles = new Set(
            previews
              .filter((p) => p.validationErrors?.length)
              .map((p) => JSON.stringify({ file: p.file, command: p.command }))
          );
          const safeCommands = validCommands.filter(
            (cmd) => !blockedFiles.has(JSON.stringify({ file: cmd.file, command: cmd.command }))
          );
          if (safeCommands.length === 0 || isDryRun) {
            stream.markdown('> No valid commands to apply.\n');
            return {};
          }
          // Replace validCommands with safe subset for apply step
          validCommands = safeCommands;
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
          `- \`/adr <title>\` – record a new Architecture Decision\n` +
          `- \`/diagram\` – context diagram for the active file\n` +
          `- \`/graph\` – full vault dependency graph\n` +
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
    const vaultContext = this._vaultManager.buildContext(undefined, undefined, 'archimate');

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
    const vaultContext = this._vaultManager.buildContext(undefined, undefined, 'drawio');

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
    const vaultContext = this._vaultManager.buildContext(undefined, undefined, 'todo');

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

  /**
   * Handle /c4 – deterministic C4 scaffold + optional LLM refinement.
   */
  private async _handleC4(
    request: vscode.ChatRequest,
    chatContext: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<vscode.ChatResult> {
    try {
      await this._ensureVault(stream);
    } catch {
      stream.markdown(
        '⚠️ **No architecture vault found.**\n\n' +
          'Use `/switch` to select a vault folder, or set `archipilot.vaultPath` in settings.'
      );
      return {};
    }

    stream.progress('Extracting C4 model data from vault...');
    const vaultInfo = await this._vaultManager.loadVault();
    const vaultContext = this._vaultManager.buildContext(undefined, undefined, 'c4');

    // ── Step 1: Deterministic scaffold ──
    stream.progress('Building C4 scaffold from components, integrations, and diagrams...');
    const scaffold = extractC4Scaffold(vaultInfo.files);
    const scaffoldMd = formatC4ScaffoldMarkdown(scaffold);

    // ── Step 2: Show the scaffold ──
    stream.markdown(scaffoldMd);

    // ── Step 3: LLM refinement ──
    const wantAnalysis = !request.prompt.includes('--no-analysis');

    if (wantAnalysis && !token.isCancellationRequested) {
      stream.progress('Generating C4 diagrams with AI...');

      const systemPrompt = buildC4Prompt(vaultContext, scaffoldMd);
      const messages: vscode.LanguageModelChatMessage[] = [
        vscode.LanguageModelChatMessage.User(systemPrompt),
      ];

      const userPrompt = request.prompt.replace(/--no-analysis/g, '').trim() ||
        'Generate C4 diagrams (System Context + Container) from the scaffold above.';
      messages.push(vscode.LanguageModelChatMessage.Assistant('(ready)'));
      messages.push(vscode.LanguageModelChatMessage.User(userPrompt));

      try {
        const chatResponse = await request.model.sendRequest(messages, {}, token);
        stream.markdown('\n\n---\n\n### 🧠 AI C4 Model\n\n');
        for await (const fragment of chatResponse.text) {
          stream.markdown(fragment);
        }
      } catch (err) {
        if (err instanceof vscode.LanguageModelError) {
          stream.markdown(`\n\n⚠️ **LLM Error:** ${err.message}`);
        }
      }
    }

    stream.markdown(`\n\n---\n*Vault: ${vaultInfo.name} (${vaultInfo.fileCount} files) — C4 Model*`);
    return {};
  }

  /**
   * Handle /sizing – deterministic sizing scaffold + optional LLM refinement.
   */
  private async _handleSizing(
    request: vscode.ChatRequest,
    chatContext: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<vscode.ChatResult> {
    try {
      await this._ensureVault(stream);
    } catch {
      stream.markdown(
        '⚠️ **No architecture vault found.**\n\n' +
          'Use `/switch` to select a vault folder, or set `archipilot.vaultPath` in settings.'
      );
      return {};
    }

    stream.progress('Extracting sizing data from vault...');
    const vaultInfo = await this._vaultManager.loadVault();
    const vaultContext = this._vaultManager.buildContext(undefined, undefined, 'sizing');

    // ── Step 1: Deterministic scaffold ──
    stream.progress('Building sizing scaffold from components, NFRs, and scenarios...');
    const scaffold = extractSizingScaffold(vaultInfo.files);
    const scaffoldMd = formatSizingScaffoldMarkdown(scaffold);

    // ── Step 2: Show the scaffold ──
    stream.markdown(scaffoldMd);

    // ── Step 3: LLM refinement ──
    const wantAnalysis = !request.prompt.includes('--no-analysis');

    if (wantAnalysis && !token.isCancellationRequested) {
      stream.progress('Generating sizing estimates with AI...');

      const systemPrompt = buildSizingPrompt(vaultContext, scaffoldMd);
      const messages: vscode.LanguageModelChatMessage[] = [
        vscode.LanguageModelChatMessage.User(systemPrompt),
      ];

      const userPrompt = request.prompt.replace(/--no-analysis/g, '').trim() ||
        'Fill in sizing estimates for TBD values and provide cost analysis based on the scaffold above.';
      messages.push(vscode.LanguageModelChatMessage.Assistant('(ready)'));
      messages.push(vscode.LanguageModelChatMessage.User(userPrompt));

      try {
        const chatResponse = await request.model.sendRequest(messages, {}, token);
        stream.markdown('\n\n---\n\n### 🧠 AI Sizing Analysis\n\n');
        for await (const fragment of chatResponse.text) {
          stream.markdown(fragment);
        }
      } catch (err) {
        if (err instanceof vscode.LanguageModelError) {
          stream.markdown(`\n\n⚠️ **LLM Error:** ${err.message}`);
        }
      }
    }

    stream.markdown(`\n\n---\n*Vault: ${vaultInfo.name} (${vaultInfo.fileCount} files) — Sizing Catalogue*`);
    return {};
  }

  /**
   * Handle /timeline – deterministic timeline scaffold + optional LLM refinement.
   */
  private async _handleTimeline(
    request: vscode.ChatRequest,
    chatContext: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<vscode.ChatResult> {
    try {
      await this._ensureVault(stream);
    } catch {
      stream.markdown(
        '⚠️ **No architecture vault found.**\n\n' +
          'Use `/switch` to select a vault folder, or set `archipilot.vaultPath` in settings.'
      );
      return {};
    }

    stream.progress('Extracting timeline data from vault...');
    const vaultInfo = await this._vaultManager.loadVault();
    const vaultContext = this._vaultManager.buildContext(undefined, undefined, 'timeline');

    // ── Step 1: Deterministic scaffold ──
    stream.progress('Building timeline scaffold from roadmap, milestones, and risks...');
    const scaffold = extractTimelineScaffold(vaultInfo.files);
    const scaffoldMd = formatTimelineScaffoldMarkdown(scaffold);

    // ── Step 2: Show the scaffold ──
    stream.markdown(scaffoldMd);

    // ── Step 3: LLM refinement ──
    const wantAnalysis = !request.prompt.includes('--no-analysis');

    if (wantAnalysis && !token.isCancellationRequested) {
      stream.progress('Generating Gantt timeline with AI...');

      const systemPrompt = buildTimelinePrompt(vaultContext, scaffoldMd);
      const messages: vscode.LanguageModelChatMessage[] = [
        vscode.LanguageModelChatMessage.User(systemPrompt),
      ];

      const userPrompt = request.prompt.replace(/--no-analysis/g, '').trim() ||
        'Generate a Mermaid Gantt chart and critical path analysis from the scaffold above.';
      messages.push(vscode.LanguageModelChatMessage.Assistant('(ready)'));
      messages.push(vscode.LanguageModelChatMessage.User(userPrompt));

      try {
        const chatResponse = await request.model.sendRequest(messages, {}, token);
        stream.markdown('\n\n---\n\n### 🧠 AI Timeline Analysis\n\n');
        for await (const fragment of chatResponse.text) {
          stream.markdown(fragment);
        }
      } catch (err) {
        if (err instanceof vscode.LanguageModelError) {
          stream.markdown(`\n\n⚠️ **LLM Error:** ${err.message}`);
        }
      }
    }

    stream.markdown(`\n\n---\n*Vault: ${vaultInfo.name} (${vaultInfo.fileCount} files) — Timeline*`);
    return {};
  }

  /**
   * Handle /adr – record a new Architecture Decision Record.
   */
  private async _handleADR(
    request: vscode.ChatRequest,
    stream: vscode.ChatResponseStream
  ): Promise<vscode.ChatResult> {
    const title = request.prompt.trim();
    if (!title) {
      stream.markdown(
        '⚠️ **No decision title provided.**\n\n' +
        'Usage: `@architect /adr Use PostgreSQL for transactional data`'
      );
      return {};
    }

    try {
      await this._ensureVault(stream);
    } catch {
      stream.markdown('⚠️ **No architecture vault found.**\n\nUse `/switch` to select a vault folder.');
      return {};
    }

    stream.progress('Recording Architecture Decision...');
    const vaultPath = this._vaultManager.activeVaultPath!;
    const decisionLogUri = vscode.Uri.file(`${vaultPath}/X1_ADR_Decision_Log.md`);

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
      Buffer.from(content + newEntry, 'utf-8')
    );

    this._vaultManager.invalidateCache();
    vscode.commands.executeCommand('archipilot.refreshSidebar');

    stream.markdown(
      `✅ **Recorded:** \`${idString}\` — ${title}\n\n` +
      `| Field | Value |\n|-------|-------|\n` +
      `| **ID** | \`${idString}\` |\n` +
      `| **Status** | 🟡 Proposed |\n` +
      `| **Date** | ${date} |\n\n` +
      `Added to \`X1_ADR_Decision_Log.md\`. Open it to fill in context, options, and final decision.\n\n` +
      `> 💡 Use \`@architect /decide ${idString} ${title}\` to get AI analysis on this decision.`
    );
    stream.anchor(decisionLogUri, 'X1_ADR_Decision_Log.md');

    return {};
  }

  /**
   * Handle /diagram – generate a Mermaid context diagram from the active file's WikiLinks.
   */
  private async _handleDiagram(
    stream: vscode.ChatResponseStream
  ): Promise<vscode.ChatResult> {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !editor.document.fileName.endsWith('.md')) {
      stream.markdown(
        '⚠️ **No Markdown file active.**\n\n' +
        'Open a vault Markdown file in the editor, then run `@architect /diagram`.'
      );
      return {};
    }

    stream.progress('Scanning file for WikiLinks...');
    const text = editor.document.getText();
    const fileName = editor.document.fileName.split('/').pop()?.replace(/\.md$/, '') || 'Current';

    const links = extractWikiLinks(text, fileName);

    if (links.size === 0) {
      stream.markdown(
        `ℹ️ **No \`[[WikiLinks]]\` found** in \`${fileName}.md\`.\n\n` +
        'Add links to other vault files and try again.'
      );
      return {};
    }

    const mermaid = generateContextDiagramMermaid(fileName, links);

    const insertText = `\n\n## Context Diagram\n\n\`\`\`mermaid\n${mermaid}\`\`\`\n`;
    await editor.edit((eb) => {
      eb.insert(editor.document.positionAt(text.length), insertText);
    });

    stream.markdown(
      `✅ **Context diagram generated for \`${fileName}\`** (${links.size} connections)\n\n` +
      `\`\`\`mermaid\n${mermaid}\`\`\`\n\n` +
      `The diagram has also been inserted at the bottom of \`${fileName}.md\`.`
    );

    return {};
  }

  /**
   * Handle /graph – generate a full vault dependency graph as Mermaid.
   */
  private async _handleGraph(
    stream: vscode.ChatResponseStream
  ): Promise<vscode.ChatResult> {
    try {
      await this._ensureVault(stream);
    } catch {
      stream.markdown('⚠️ **No architecture vault found.**\n\nUse `/switch` to select a vault folder.');
      return {};
    }

    stream.progress('Building vault dependency graph...');
    const vaultInfo = await this._vaultManager.loadVault();
    const vaultPath = this._vaultManager.activeVaultPath!;

    const { mermaid, nodeCount, edgeCount } = generateVaultGraphMermaid(vaultInfo.files);

    const graphUri = vscode.Uri.file(`${vaultPath}/Vault-Graph.mermaid`);
    await vscode.workspace.fs.writeFile(graphUri, Buffer.from(mermaid, 'utf-8'));

    const preview = mermaid.length > 2000 ? mermaid.slice(0, 2000) + '\n    ... (truncated for chat)' : mermaid;

    stream.markdown(
      `✅ **Vault Graph generated** — ${nodeCount} nodes, ${edgeCount} edges\n\n` +
      `Saved to \`Vault-Graph.mermaid\` in your vault root.\n\n` +
      `> 💡 Install the **Mermaid Preview** extension to render this file visually.\n\n` +
      `\`\`\`mermaid\n${preview}\n\`\`\``
    );
    stream.anchor(graphUri, 'Vault-Graph.mermaid');

    return {};
  }

  /**
   * Handle /status – pre-computed vault dashboard with optional LLM follow-up.
   */
  private async _handleStatus(
    request: vscode.ChatRequest,
    chatContext: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<vscode.ChatResult> {
    try {
      await this._ensureVault(stream);
    } catch {
      stream.markdown(
        '⚠️ **No architecture vault found.**\n\n' +
          'Use `/switch` to select a vault folder, or set `archipilot.vaultPath` in settings.'
      );
      return {};
    }

    stream.progress('Computing vault dashboard...');
    const vaultInfo = await this._vaultManager.loadVault();

    // ── Pre-compute structured data ──
    const summary = extractTodos(vaultInfo.files);

    // Document maturity breakdown
    const statusCounts: Record<string, number> = {};
    for (const f of vaultInfo.files) {
      const fmMatch = f.content.match(/^---\n([\s\S]*?)\n---/);
      let status = 'unknown';
      if (fmMatch) {
        const sm = fmMatch[1].match(/^status:\s*(.+)$/m);
        if (sm) status = sm[1].trim().toLowerCase();
      }
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    }

    // Build dashboard markdown
    const lines: string[] = [];
    lines.push(`## 📊 Architecture Vault Dashboard\n`);
    lines.push(`**Vault:** ${vaultInfo.name}  ·  **Files:** ${vaultInfo.fileCount}\n`);

    // Document maturity table
    lines.push(`### Document Maturity\n`);
    lines.push(`| Status | Count |`);
    lines.push(`|--------|-------|`);
    for (const [st, count] of Object.entries(statusCounts).sort((a, b) => b[1] - a[1])) {
      const icon = st.includes('approved') ? '✅' : st.includes('draft') ? '📝' : st.includes('review') ? '👁️' : '❓';
      lines.push(`| ${icon} ${st} | ${count} |`);
    }
    lines.push(``);

    // Key metrics
    const decisions = summary.byCategoryCount['decision'] || 0;
    const pendingDecisions = summary.byCategoryCount['decision-pending'] || 0;
    const risks = summary.byCategoryCount['risk'] || 0;
    const risksNoOwner = summary.byCategoryCount['risk-no-owner'] || 0;
    const questions = summary.byCategoryCount['question'] || 0;
    const brokenLinks = summary.byCategoryCount['broken-link'] || 0;

    lines.push(`### Key Metrics\n`);
    lines.push(`| Metric | Count | Status |`);
    lines.push(`|--------|-------|--------|`);
    lines.push(`| Open Decisions | ${decisions} | ${decisions > 3 ? '🔴 Needs attention' : decisions > 0 ? '🟡 Review' : '✅ Clear'} |`);
    lines.push(`| Proposed Decisions | ${pendingDecisions} | ${pendingDecisions > 5 ? '🔴' : pendingDecisions > 0 ? '🟡' : '✅'} |`);
    lines.push(`| Open Risks | ${risks} | ${risks > 5 ? '🔴' : risks > 0 ? '🟡' : '✅'} |`);
    lines.push(`| Risks without Owners | ${risksNoOwner} | ${risksNoOwner > 0 ? '🔴 Assign ASAP' : '✅'} |`);
    lines.push(`| Open Questions | ${questions} | ${questions > 10 ? '🟡' : '✅'} |`);
    lines.push(`| Broken WikiLinks | ${brokenLinks} | ${brokenLinks > 0 ? '🟡 Fix references' : '✅'} |`);
    lines.push(`| TBD Ownership | ${summary.tbd_ownership_count} | ${summary.tbd_ownership_count > 3 ? '🔴' : summary.tbd_ownership_count > 0 ? '🟡' : '✅'} |`);
    lines.push(`| **Total Open Items** | **${summary.totalCount}** | |`);
    lines.push(``);

    // Phase distribution
    const phaseKeys = Object.keys(summary.byPhaseCount).sort();
    if (phaseKeys.length > 0) {
      lines.push(`### Open Items by Phase\n`);
      lines.push(`| Phase | Count |`);
      lines.push(`|-------|-------|`);
      for (const phase of phaseKeys) {
        lines.push(`| ${phase} | ${summary.byPhaseCount[phase]} |`);
      }
      lines.push(``);
    }

    const dashboardMd = lines.join('\n');
    stream.markdown(dashboardMd);

    // ── Optional LLM follow-up if the user asked a specific question ──
    const userPrompt = request.prompt.trim();
    const wantAnalysis = userPrompt.length > 0 && !userPrompt.includes('--no-analysis');

    if (wantAnalysis && !token.isCancellationRequested) {
      stream.progress('Analyzing vault status...');
      const vaultContext = this._vaultManager.buildContext(undefined, undefined, 'status');
      const systemPrompt = buildStatusPrompt(vaultContext);
      const messages: vscode.LanguageModelChatMessage[] = [
        vscode.LanguageModelChatMessage.User(systemPrompt),
        vscode.LanguageModelChatMessage.Assistant(dashboardMd),
        vscode.LanguageModelChatMessage.User(userPrompt),
      ];

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

    stream.markdown(`\n\n---\n*Vault: ${vaultInfo.name} (${vaultInfo.fileCount} files)*`);
    return {};
  }

  /**
   * Handle /review – automated file-level architecture review.
   * Uses AI to assess quality, completeness, and TOGAF compliance of vault files.
   */
  private async _handleReview(
    request: vscode.ChatRequest,
    chatContext: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<vscode.ChatResult> {
    try {
      await this._ensureVault(stream);
    } catch {
      stream.markdown(
        '⚠️ **No architecture vault found.**\n\n' +
          'Use `/switch` to select a vault folder, or set `archipilot.vaultPath` in settings.'
      );
      return {};
    }

    stream.progress('Loading vault for architecture review...');
    const vaultInfo = await this._vaultManager.loadVault();
    const vaultContext = this._vaultManager.buildContext(undefined, undefined, 'review');

    // Determine scope: specific file or full vault
    const userPrompt = request.prompt.trim();
    const targetFile = userPrompt
      ? vaultInfo.files.find((f) => f.name.toLowerCase().includes(userPrompt.toLowerCase()))
      : undefined;

    const scope = targetFile
      ? `Review the file "${targetFile.name}" in detail.`
      : userPrompt || 'Perform a full architecture review of the vault.';

    stream.progress('Reviewing architecture quality...');
    const systemPrompt = buildReviewPrompt(vaultContext);
    const messages: vscode.LanguageModelChatMessage[] = [
      vscode.LanguageModelChatMessage.User(systemPrompt),
      vscode.LanguageModelChatMessage.Assistant('(ready)'),
      vscode.LanguageModelChatMessage.User(scope),
    ];

    try {
      const chatResponse = await request.model.sendRequest(messages, {}, token);
      for await (const fragment of chatResponse.text) {
        stream.markdown(fragment);
      }
    } catch (err) {
      if (err instanceof vscode.LanguageModelError) {
        stream.markdown(`\n\n⚠️ **LLM Error:** ${err.message}`);
      } else {
        throw err;
      }
    }

    stream.markdown(`\n\n---\n*Vault: ${vaultInfo.name} (${vaultInfo.fileCount} files) — Architecture Review*`);
    return {};
  }

  /**
   * Handle /gate – phase gate checklist assessment.
   * Evaluates whether a TOGAF ADM phase has met its exit criteria.
   */
  private async _handleGate(
    request: vscode.ChatRequest,
    chatContext: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<vscode.ChatResult> {
    try {
      await this._ensureVault(stream);
    } catch {
      stream.markdown(
        '⚠️ **No architecture vault found.**\n\n' +
          'Use `/switch` to select a vault folder, or set `archipilot.vaultPath` in settings.'
      );
      return {};
    }

    stream.progress('Loading vault for gate assessment...');
    const vaultInfo = await this._vaultManager.loadVault();
    const vaultContext = this._vaultManager.buildContext(undefined, undefined, 'gate');

    // Extract phase from user prompt
    const userPrompt = request.prompt.trim() || 'Assess all TOGAF ADM phases for gate readiness.';

    stream.progress('Evaluating phase gate criteria...');
    const systemPrompt = buildGatePrompt(vaultContext);
    const messages: vscode.LanguageModelChatMessage[] = [
      vscode.LanguageModelChatMessage.User(systemPrompt),
      vscode.LanguageModelChatMessage.Assistant('(ready)'),
      vscode.LanguageModelChatMessage.User(userPrompt),
    ];

    try {
      const chatResponse = await request.model.sendRequest(messages, {}, token);
      for await (const fragment of chatResponse.text) {
        stream.markdown(fragment);
      }
    } catch (err) {
      if (err instanceof vscode.LanguageModelError) {
        stream.markdown(`\n\n⚠️ **LLM Error:** ${err.message}`);
      } else {
        throw err;
      }
    }

    stream.markdown(`\n\n---\n*Vault: ${vaultInfo.name} (${vaultInfo.fileCount} files) — Phase Gate Assessment*`);
    return {};
  }

  /**
   * /impact <ID> — scan the entire vault for all cross-references to a TOGAF ID
   * (decision, risk, question, work package, requirement, etc.) and return a
   * structured impact chain showing every file and section that mentions it.
   */
  private async _handleImpact(
    request: vscode.ChatRequest,
    stream: vscode.ChatResponseStream,
  ): Promise<vscode.ChatResult> {
    // Extract the TOGAF ID from the prompt (e.g. AD-02, R-05, Q-12, WP-03)
    const idMatch = request.prompt.match(/\b([A-Z]+-\d+)\b/);
    if (!idMatch) {
      stream.markdown(
        '⚠️ **No valid ID found.**\n\n' +
        'Usage: `/impact AD-02` or `/impact R-05`\n\n' +
        'IDs must match the pattern `PREFIX-number` (e.g. `AD-02`, `R-05`, `WP-03`, `Q-12`).'
      );
      return {};
    }
    const targetId = idMatch[1];

    const vaultPath = this._vaultManager.activeVaultPath;
    if (!vaultPath) {
      stream.markdown('⚠️ **No active vault.** Use `/switch` to select a vault folder first.');
      return {};
    }

    stream.markdown(`🔍 **Impact chain for \`${targetId}\`** — scanning vault...\n\n`);

    let vaultInfo;
    try {
      vaultInfo = await this._vaultManager.loadVault();
    } catch {
      stream.markdown('❌ Failed to load vault.');
      return {};
    }

    interface Hit { file: string; section: string; line: string; }
    const hits: Hit[] = [];

    for (const f of vaultInfo.files) {
      const lines = f.content.split('\n');
      let currentSection = '(preamble)';
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Track current section heading
        const headingMatch = line.match(/^#{1,3}\s+(.+)/);
        if (headingMatch) {
          currentSection = headingMatch[1].trim();
        }
        // Check if this line references the target ID
        if (new RegExp(`\\b${targetId}\\b`).test(line)) {
          const preview = line.trim().slice(0, 120);
          hits.push({ file: f.name, section: currentSection, line: preview });
        }
      }
    }

    if (hits.length === 0) {
      stream.markdown(`No references to **${targetId}** found in the vault.\n\n`);
      stream.markdown('_Tip: Make sure the ID format is exact, e.g. `AD-02` not `ad-02`._');
      return {};
    }

    // Group by file for cleaner output
    const byFile = new Map<string, Hit[]>();
    for (const h of hits) {
      if (!byFile.has(h.file)) { byFile.set(h.file, []); }
      byFile.get(h.file)!.push(h);
    }

    stream.markdown(
      `Found **${hits.length} reference${hits.length === 1 ? '' : 's'}** to \`${targetId}\` across **${byFile.size} file${byFile.size === 1 ? '' : 's'}**:\n\n` +
      `| File | Section | Context |\n` +
      `|------|---------|--------|\n` +
      [...byFile.entries()]
        .map(([file, fileHits]) =>
          fileHits.map((h) => `| \`${file}\` | ${h.section} | ${h.line.replace(/\|/g, '\\|')} |`).join('\n')
        ).join('\n') +
      '\n\n---\n\n' +
      '_Use `@architect /decide` or `@architect /update` to act on any of these references._'
    );

    return {};
  }

  /**
   * Handle /audit – unified vault health check combining status + review + gate.
   *
   * Flags:
   *   --quick : concise summary (top issues + actions)
   *   --full  : comprehensive three-part audit (default)
   */
  private async _handleAudit(
    request: vscode.ChatRequest,
    chatContext: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken,
    scope: AuditScope = 'full'
  ): Promise<vscode.ChatResult> {
    try {
      await this._ensureVault(stream);
    } catch {
      stream.markdown(
        '⚠️ **No architecture vault found.**\n\n' +
          'Use `/switch` to select a vault folder, or set `archipilot.vaultPath` in settings.'
      );
      return {};
    }

    stream.progress(`Running ${scope} architecture audit...`);
    const vaultInfo = await this._vaultManager.loadVault();

    // ── Pre-compute dashboard (same as /status) ──
    const summary = extractTodos(vaultInfo.files);
    const statusCounts: Record<string, number> = {};
    for (const f of vaultInfo.files) {
      const fmMatch = f.content.match(/^---\n([\s\S]*?)\n---/);
      let status = 'unknown';
      if (fmMatch) {
        const sm = fmMatch[1].match(/^status:\s*(.+)$/m);
        if (sm) status = sm[1].trim().toLowerCase();
      }
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    }

    const lines: string[] = [];
    lines.push(`## 🔍 Architecture Audit — ${scope === 'quick' ? 'Quick' : 'Full'}\n`);
    lines.push(`**Vault:** ${vaultInfo.name}  ·  **Files:** ${vaultInfo.fileCount}\n`);

    // Document maturity
    lines.push(`### Document Maturity\n`);
    lines.push(`| Status | Count |`);
    lines.push(`|--------|-------|`);
    for (const [st, count] of Object.entries(statusCounts).sort((a, b) => b[1] - a[1])) {
      const icon = st.includes('approved') ? '✅' : st.includes('draft') ? '📝' : st.includes('review') ? '👁️' : '❓';
      lines.push(`| ${icon} ${st} | ${count} |`);
    }
    lines.push(``);

    // Key metrics
    const decisions = summary.byCategoryCount['decision'] || 0;
    const pendingDecisions = summary.byCategoryCount['decision-pending'] || 0;
    const risks = summary.byCategoryCount['risk'] || 0;
    const risksNoOwner = summary.byCategoryCount['risk-no-owner'] || 0;
    const questions = summary.byCategoryCount['question'] || 0;
    const brokenLinks = summary.byCategoryCount['broken-link'] || 0;

    lines.push(`### Key Metrics\n`);
    lines.push(`| Metric | Count | Status |`);
    lines.push(`|--------|-------|--------|`);
    lines.push(`| Open Decisions | ${decisions} | ${decisions > 3 ? '🔴' : decisions > 0 ? '🟡' : '✅'} |`);
    lines.push(`| Proposed Decisions | ${pendingDecisions} | ${pendingDecisions > 5 ? '🔴' : pendingDecisions > 0 ? '🟡' : '✅'} |`);
    lines.push(`| Open Risks | ${risks} | ${risks > 5 ? '🔴' : risks > 0 ? '🟡' : '✅'} |`);
    lines.push(`| Risks w/o Owners | ${risksNoOwner} | ${risksNoOwner > 0 ? '🔴' : '✅'} |`);
    lines.push(`| Open Questions | ${questions} | ${questions > 10 ? '🟡' : '✅'} |`);
    lines.push(`| Broken WikiLinks | ${brokenLinks} | ${brokenLinks > 0 ? '🟡' : '✅'} |`);
    lines.push(`| TBD Ownership | ${summary.tbd_ownership_count} | ${summary.tbd_ownership_count > 3 ? '🔴' : summary.tbd_ownership_count > 0 ? '🟡' : '✅'} |`);
    lines.push(`| **Total Open Items** | **${summary.totalCount}** | |`);
    lines.push(``);

    const dashboardMd = lines.join('\n');
    stream.markdown(dashboardMd);

    // ── Call LLM with unified audit prompt ──
    stream.progress('AI analyzing vault health...');
    const vaultContext = this._vaultManager.buildContext(undefined, undefined, 'audit');
    const yamlSummary = this._vaultManager.getYamlSummaryTable();
    const userPrompt = request.prompt.replace(/--(?:quick|full)\b/gi, '').trim();

    const systemPrompt = buildAuditPrompt(vaultContext, dashboardMd, scope, yamlSummary);
    const messages: vscode.LanguageModelChatMessage[] = [
      vscode.LanguageModelChatMessage.User(systemPrompt),
      vscode.LanguageModelChatMessage.Assistant(dashboardMd),
      vscode.LanguageModelChatMessage.User(
        userPrompt || `Perform a ${scope} architecture audit of the vault.`
      ),
    ];

    try {
      const chatResponse = await request.model.sendRequest(messages, {}, token);
      stream.markdown('\n\n---\n\n');
      for await (const fragment of chatResponse.text) {
        stream.markdown(fragment);
      }
    } catch (err) {
      if (err instanceof vscode.LanguageModelError) {
        stream.markdown(`\n\n⚠️ **LLM Error:** ${err.message}`);
      }
    }

    stream.markdown(`\n\n---\n*Audit: ${vaultInfo.name} (${vaultInfo.fileCount} files) · scope: ${scope}*`);
    return {};
  }

  /**
   * Handle /decide – two-step decision support.
   *
   * Step 1: If the conversation has no prior decide analysis, run analysis-only
   *         (no JSON commands) and ask user to confirm their choice.
   * Step 2: If prior turns contain a decide analysis, detect confirmation
   *         keywords and generate the ADD_DECISION command.
   */
  private async _handleDecide(
    request: vscode.ChatRequest,
    chatContext: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<vscode.ChatResult> {
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

    stream.progress('Loading vault for decision support...');
    await this._vaultManager.loadVault();
    const vaultContext = this._vaultManager.buildContext(undefined, undefined, 'decide');

    // Detect if user is confirming a previous decision analysis
    const userPrompt = request.prompt.trim();
    const confirmKeywords = /\b(approve|confirm|accept|go with|choose|select|record|yes)\b/i;
    const hasPriorDecideAnalysis = chatContext.history.some(
      (turn) => 'participant' in turn && turn.participant === 'archipilot.architect' &&
        'command' in turn && turn.command === 'decide'
    );
    const isConfirmation = hasPriorDecideAnalysis && confirmKeywords.test(userPrompt);

    if (isConfirmation) {
      // ── Step 2: Record decision ──
      stream.progress('Generating decision record...');
      const systemPrompt = buildDecideRecordPrompt(vaultContext);
      const messages: vscode.LanguageModelChatMessage[] = [
        vscode.LanguageModelChatMessage.User(systemPrompt),
      ];

      // Include conversation history for context
      for (const turn of chatContext.history) {
        if ('prompt' in turn) {
          messages.push(vscode.LanguageModelChatMessage.User(turn.prompt));
        } else if ('response' in turn) {
          const text = turn.response.map((r: any) => r.value ?? '').join('');
          if (text) {
            messages.push(vscode.LanguageModelChatMessage.Assistant(text));
          }
        }
      }

      messages.push(vscode.LanguageModelChatMessage.User(userPrompt));

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
        }
        return {};
      }

      // Parse and apply command from response
      const commands = this._fileUpdater.parseCommands(fullResponse);
      if (commands.length > 0) {
        const validationErrors = this._fileUpdater.validateCommands(commands);
        const validCommands = commands.filter(
          (cmd) => !validationErrors.some((ve) => ve.command === cmd)
        );

        if (validCommands.length > 0) {
          const previews = await this._fileUpdater.previewCommands(validCommands);
          stream.markdown('\n\n---\n\n📋 **Proposed decision record:**\n\n');
          for (const preview of previews) {
            stream.markdown(`### ${preview.isNewFile ? '🆕' : '✏️'} \`${preview.command}\` → \`${preview.file}\`\n`);
            stream.markdown(`${preview.summary}\n\n`);
            if (preview.unifiedDiff) {
              stream.markdown(`\`\`\`diff\n${preview.unifiedDiff}\n\`\`\`\n\n`);
            }
          }

          const confirm = await vscode.window.showWarningMessage(
            `archipilot: Record ${validCommands.length} decision(s)?`,
            { modal: true, detail: previews.map((p) => `• ${p.summary}`).join('\n') },
            'Record Decision',
            'Cancel'
          );

          if (confirm === 'Record Decision') {
            const promptHash = this._hashString(request.prompt);
            const results = await this._fileUpdater.applyCommands(validCommands, promptHash);
            for (const result of results) {
              stream.markdown(result.success ? `\n✅ ${result.message}\n` : `\n❌ ${result.message}\n`);
            }
            await this._vaultManager.loadVault();
            vscode.commands.executeCommand('archipilot.refreshSidebar');
          } else {
            stream.markdown('\n> ℹ️ **Decision not recorded** — no files were modified.\n');
          }
        }
      }
    } else {
      // ── Step 1: Analysis only ──
      stream.progress('Analyzing decision options...');
      const systemPrompt = buildDecideAnalysisPrompt(vaultContext);
      const messages: vscode.LanguageModelChatMessage[] = [
        vscode.LanguageModelChatMessage.User(systemPrompt),
        vscode.LanguageModelChatMessage.Assistant('(ready)'),
        vscode.LanguageModelChatMessage.User(
          userPrompt || 'What architecture decisions need to be resolved?'
        ),
      ];

      try {
        const chatResponse = await request.model.sendRequest(messages, {}, token);
        for await (const fragment of chatResponse.text) {
          stream.markdown(fragment);
        }
      } catch (err) {
        if (err instanceof vscode.LanguageModelError) {
          stream.markdown(`\n\n⚠️ **LLM Error:** ${err.message}`);
        }
      }
    }

    return {};
  }

  /**
   * Handle /scan – generate or enrich a TOGAF vault by scanning workspace source code.
   *
   * Flags:
   *   --append   : append/update an existing vault instead of creating a new one
   *
   * Usage:
   *   @architect /scan                 → create a new vault populated from source code
   *   @architect /scan --append        → enrich the active vault from the current workspace
   */
  private async _handleScan(
    request: vscode.ChatRequest,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<vscode.ChatResult> {
    const isAppendMode =
      /--append\b/i.test(request.prompt) || !!this._vaultManager.activeVaultPath;

    // ── Step 1: Determine workspace root to scan ─────────────────────────
    const workspaceRoot =
      vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';

    if (!workspaceRoot) {
      stream.markdown(
        '⚠️ **No workspace folder open.**\n\n' +
          'Open a project folder first, then run `/scan` again.'
      );
      return {};
    }

    // ── Step 2: Scan workspace for architectural signals ─────────────────
    stream.progress(`Scanning workspace: ${workspaceRoot.split('/').pop()}...`);
    const scan = await scanWorkspaceFiles(workspaceRoot);

    if (scan.totalFilesScanned === 0) {
      stream.markdown(
        '⚠️ **No source files found.**\n\n' +
          'The workspace appears empty or all files are excluded. ' +
          'Make sure the folder contains source code (package.json, models, services, etc.).'
      );
      return {};
    }

    stream.markdown(
      `🔍 **Scan complete** — found **${scan.totalFilesScanned} file(s)** across architectural layers:\n\n` +
        (scan.packageFiles.length > 0
          ? `- 📦 **Technology:** ${scan.packageFiles.map((f) => f.relativePath).join(', ')}\n`
          : '') +
        (scan.apiSpecFiles.length > 0
          ? `- 📋 **API Specs:** ${scan.apiSpecFiles.map((f) => f.relativePath).join(', ')}\n`
          : '') +
        (scan.modelFiles.length > 0
          ? `- 🗄️ **Data Models:** ${scan.modelFiles.length} file(s)\n`
          : '') +
        (scan.serviceFiles.length > 0
          ? `- ⚙️ **Services/Controllers:** ${scan.serviceFiles.length} file(s)\n`
          : '') +
        (scan.infraFiles.length > 0
          ? `- 🐳 **Infrastructure:** ${scan.infraFiles.length} file(s)\n`
          : '') +
        (scan.readmeFiles.length > 0
          ? `- 📄 **Documentation:** ${scan.readmeFiles.map((f) => f.relativePath).join(', ')}\n`
          : '') +
        (scan.openEditorFiles.length > 0
          ? `- 🖊️ **Open Editors:** ${scan.openEditorFiles.map((f) => f.relativePath).join(', ')}\n`
          : '') +
        (scan.directoryTree
          ? `- 🌳 **Directory tree:** captured\n`
          : '') +
        `\n**Project name detected:** \`${scan.projectName}\`\n\n`
    );

    // ── Step 3: Ensure vault exists (create from template if new) ────────
    let vaultInfo: Awaited<ReturnType<typeof this._vaultManager.loadVault>>;
    let existingVaultContext: string | null = null;

    if (isAppendMode) {
      // Append to existing vault
      try {
        await this._ensureVault(stream);
      } catch {
        stream.markdown(
          '⚠️ **No architecture vault found for append.**\n\n' +
            'Use `/scan` (without `--append`) to create a new vault, or `/switch` to select one.'
        );
        return {};
      }
      stream.progress('Loading existing vault context...');
      vaultInfo = await this._vaultManager.loadVault();
      existingVaultContext = this._vaultManager.buildContext(undefined, undefined, 'scan');
      stream.markdown(
        `📂 **Appending to vault:** \`${vaultInfo.name}\` (${vaultInfo.fileCount} files)\n\n`
      );
    } else {
      // Create a new vault from template, then populate it
      const safeName = scan.projectName
        .replace(/[^a-zA-Z0-9_\- ]/g, '')
        .replace(/\s+/g, '-');

      let parentPath: string | undefined =
        await this._vaultManager.getProjectsRoot();

      if (!parentPath) {
        const folderUri = await vscode.window.showOpenDialog({
          canSelectFolders: true,
          canSelectFiles: false,
          canSelectMany: false,
          openLabel: 'Select parent folder for the new vault',
          title: 'Where to create the TOGAF vault?',
        });
        if (!folderUri || folderUri.length === 0) {
          stream.markdown('ℹ️ No folder selected. Operation cancelled.');
          return {};
        }
        parentPath = folderUri[0].fsPath;
      }

      const vaultUri = vscode.Uri.file(`${parentPath}/${safeName}`);
      stream.progress(`Creating TOGAF vault "${safeName}" from template...`);

      const { buildVaultTemplate } = await import('./vault-template.js');
      const templateFiles = buildVaultTemplate(scan.projectName);
      await vscode.workspace.fs.createDirectory(vaultUri);
      for (const file of templateFiles) {
        await vscode.workspace.fs.writeFile(
          vscode.Uri.joinPath(vaultUri, file.name),
          Buffer.from(file.content, 'utf-8')
        );
      }

      await this._vaultManager.setActiveVault(vaultUri.fsPath);
      vaultInfo = await this._vaultManager.loadVault();
      stream.markdown(
        `✅ **Vault created:** \`${safeName}\` (${templateFiles.length} TOGAF template files)\n\n` +
          `📁 Path: \`${vaultUri.fsPath}\`\n\n` +
          `⏳ **Now populating vault from source code scan...**\n\n`
      );
    }

    // ── Step 4: Build LLM prompt with scan context ───────────────────────
    const scanContext = formatScanContext(scan);
    const yamlSummary = isAppendMode ? this._vaultManager.getYamlSummaryTable() : undefined;
    const systemPrompt = buildScanPrompt(
      scanContext,
      existingVaultContext,
      scan.projectName,
      isAppendMode,
      yamlSummary
    );

    const messages: vscode.LanguageModelChatMessage[] = [
      vscode.LanguageModelChatMessage.User(systemPrompt),
    ];

    const userInstruction =
      request.prompt.replace(/--append\b/gi, '').trim() ||
      (isAppendMode
        ? `Enrich the vault for project "${scan.projectName}" using the source code scan. Focus on adding new information not yet in the vault.`
        : `Generate TOGAF vault content for project "${scan.projectName}" from the source code scan. Populate as many sections as the scan data supports.`);

    messages.push(vscode.LanguageModelChatMessage.Assistant('(ready)'));
    messages.push(vscode.LanguageModelChatMessage.User(userInstruction));

    // ── Step 5: Stream LLM response ──────────────────────────────────────
    stream.progress('Analyzing source code with AI...');
    stream.markdown(`---\n\n### 🧠 AI Analysis & Generated Update Commands\n\n`);

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

    // ── Step 6: Parse, validate, preview and apply commands ─────────────
    const commands = this._fileUpdater.parseCommands(fullResponse);
    if (commands.length === 0) {
      stream.markdown(
        '\n\n---\n\n⚠️ **No update commands detected** in the AI response.\n\n' +
          'Try adding more source files (models, services, API specs) to the workspace and run `/scan` again.'
      );
      return {};
    }

    stream.markdown('\n\n---\n\n');

    // Validate
    const validationErrors = this._fileUpdater.validateCommands(commands);
    if (validationErrors.length > 0) {
      stream.markdown(
        `⚠️ **Validation failed for ${validationErrors.length} command(s):**\n\n`
      );
      for (const ve of validationErrors) {
        stream.markdown(
          `- \`${ve.command.command}\` on \`${ve.command.file}\`: ${ve.errors.join('; ')}\n`
        );
      }
      stream.markdown('\n> Commands with errors were skipped.\n\n');
    }

    const invalidSet = new Set(
      validationErrors.map((ve) => JSON.stringify(ve.command))
    );
    const validCommands = commands.filter(
      (cmd) => !invalidSet.has(JSON.stringify(cmd))
    );

    if (validCommands.length === 0) {
      stream.markdown('❌ No valid commands to apply after validation.\n');
      return {};
    }

    // Preview with vault-aware validation
    const previews = await this._fileUpdater.previewCommands(validCommands);

    // ── Extraction summary table ──
    stream.markdown(
      `📋 **Extraction Summary — ${previews.length} proposed change(s) to vault \`${vaultInfo.name}\`:**\n\n`
    );
    stream.markdown(`| # | Command | Target File | Summary | Status |\n`);
    stream.markdown(`|---|---------|-------------|---------|--------|\n`);
    let rowNum = 0;
    for (const preview of previews) {
      rowNum++;
      const hasError = (preview.validationErrors?.length ?? 0) > 0;
      const hasWarn = (preview.validationWarnings?.length ?? 0) > 0;
      const statusIcon = hasError ? '🛑 Error' : hasWarn ? '⚠️ Warning' : '✅ Ready';
      stream.markdown(
        `| ${rowNum} | \`${preview.command}\` | \`${preview.file}\` | ${preview.summary} | ${statusIcon} |\n`
      );
    }
    stream.markdown('\n');

    // ── Detailed diffs ──
    let hasBlockingErrors = false;
    stream.markdown(`<details><summary>📝 <strong>Detailed diffs (click to expand)</strong></summary>\n\n`);
    for (const preview of previews) {
      stream.markdown(`### ${preview.isNewFile ? '🆕' : '✏️'} \`${preview.command}\` → \`${preview.file}\`\n`);
      stream.markdown(`${preview.summary}\n\n`);

      // Show vault validation issues
      if (preview.validationErrors?.length) {
        hasBlockingErrors = true;
        stream.markdown(`> 🛑 **Validation errors:**\n`);
        for (const e of preview.validationErrors) {
          stream.markdown(`> - ${e}\n`);
        }
        stream.markdown('\n');
      }
      if (preview.validationWarnings?.length) {
        for (const w of preview.validationWarnings) {
          stream.markdown(`> ⚠️ ${w}\n`);
        }
        stream.markdown('\n');
      }
      if (preview.validationSuggestions?.length) {
        for (const s of preview.validationSuggestions) {
          stream.markdown(`> 💡 ${s}\n`);
        }
        stream.markdown('\n');
      }

      // Prefer unified diff when available
      if (preview.unifiedDiff) {
        stream.markdown(`\`\`\`diff\n${preview.unifiedDiff}\n\`\`\`\n\n`);
      } else {
        if (preview.before) {
          stream.markdown(`**Before:**\n\`\`\`\n${preview.before}\n\`\`\`\n`);
        }
        stream.markdown(`**After:**\n\`\`\`\n${preview.after}\n\`\`\`\n\n`);
      }
    }
    stream.markdown(`</details>\n\n`);

    if (hasBlockingErrors) {
      stream.markdown('> 🛑 **Some commands have validation errors and will be skipped.**\n\n');
      const blockedFiles = new Set(
        previews
          .filter((p) => p.validationErrors?.length)
          .map((p) => JSON.stringify({ file: p.file, command: p.command }))
      );
      const safeCommands = validCommands.filter(
        (cmd) => !blockedFiles.has(JSON.stringify({ file: cmd.file, command: cmd.command }))
      );
      validCommands.length = 0;
      for (const c of safeCommands) validCommands.push(c);
      if (validCommands.length === 0) {
        stream.markdown('❌ No valid commands to apply after validation.\n');
        return {};
      }
    }

    // Confirm
    const confirm = await vscode.window.showWarningMessage(
      `archipilot: Apply ${validCommands.length} change(s) to vault "${vaultInfo.name}"?`,
      { modal: true, detail: previews.map((p) => `• ${p.summary}`).join('\n') },
      'Apply All',
      'Cancel'
    );

    if (confirm !== 'Apply All') {
      stream.markdown('\n> ℹ️ **Changes cancelled** — no files were modified.\n');
      return {};
    }

    // Apply
    stream.markdown('\n**Applying changes...**\n\n');
    const promptHash = this._hashString(
      request.prompt + scanContext.slice(0, 100)
    );
    const results = await this._fileUpdater.applyCommands(validCommands, promptHash);
    for (const result of results) {
      if (result.success) {
        stream.markdown(`✅ ${result.message}\n\n`);
      } else {
        stream.markdown(`❌ ${result.message}\n\n`);
      }
    }

    // Refresh sidebar
    await this._vaultManager.loadVault();
    vscode.commands.executeCommand('archipilot.refreshSidebar');

    stream.markdown(
      `\n---\n\n✅ **Vault ${isAppendMode ? 'enriched' : 'generated'} from source code scan.**\n\n` +
        `Next steps:\n` +
        `- \`/status\` — review vault completeness\n` +
        `- \`/review\` — automated TOGAF quality check\n` +
        `- \`/scan --append\` — add another service or repo to this vault\n` +
        `- \`/update\` — refine any generated content\n\n` +
        `> 💡 Use \`Ctrl+Z\` / \`Cmd+Z\` in each file to undo changes.`
    );

    return {};
  }

  dispose(): void {
    this._participant?.dispose();
  }
}
