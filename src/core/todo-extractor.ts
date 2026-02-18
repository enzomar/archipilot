/**
 * todo-extractor.ts – Pure module that scans vault files and extracts
 * actionable TODOs from a TOGAF perspective.
 *
 * Zero VS Code dependencies – works with plain VaultFile arrays.
 *
 * Extracts:
 *  - Open decisions (X1_ADR_Decision_Log)
 *  - Open risks (X2_Risk_Issue_Register)
 *  - Open questions (X3_Open_Questions)
 *  - Pending work packages & milestones (F1_Architecture_Roadmap)
 *  - Open requirements (R1_Architecture_Requirements)
 *  - Incomplete compliance checks (G1_Compliance_Assessment)
 *  - Pending change requests (H1_Change_Request_Log)
 *  - Draft / review documents (YAML front matter status)
 *  - Unassigned ownership (owner = TBD)
 */

// ── Types ──────────────────────────────────────────────────────────

export type TodoCategory =
  | 'decision'
  | 'decision-pending'
  | 'risk'
  | 'risk-no-owner'
  | 'orphaned-entity'
  | 'question'
  | 'work-package'
  | 'milestone'
  | 'requirement'
  | 'compliance'
  | 'change-request'
  | 'document-maturity'
  | 'ownership';

export type TodoPriority = 'critical' | 'high' | 'medium' | 'low';

export type TogafPhase =
  | 'Preliminary'
  | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H'
  | 'Requirements'
  | 'Cross-phase';

export interface TodoItem {
  /** Unique identifier (e.g. "AD-02", "R-01", "Q-07") */
  id: string;
  /** Human-readable summary */
  title: string;
  /** Which category of TOGAF artifact */
  category: TodoCategory;
  /** Suggested priority */
  priority: TodoPriority;
  /** Related TOGAF ADM phase */
  phase: TogafPhase;
  /** Source vault file */
  sourceFile: string;
  /** Current owner (may be "TBD") */
  owner: string;
  /** Additional context (e.g. severity, target date) */
  detail?: string;
}

export interface TodoSummary {
  items: TodoItem[];
  totalCount: number;
  byCategoryCount: Record<TodoCategory, number>;
  byPriorityCount: Record<TodoPriority, number>;
  byPhaseCount: Record<string, number>;
  tbd_ownership_count: number;
}

interface VaultFile {
  name: string;
  content: string;
}

// ── Helpers ────────────────────────────────────────────────────────

function filePrefix(name: string): string {
  return name.replace(/^(\w+)_.*/, '$1').toUpperCase();
}

/** Map a file's TOGAF prefix to a phase label. */
function prefixToPhase(name: string): TogafPhase {
  const p = filePrefix(name);
  if (p.startsWith('P')) return 'Preliminary';
  if (p.startsWith('A')) return 'A';
  if (p.startsWith('B')) return 'B';
  if (p.startsWith('C')) return 'C';
  if (p.startsWith('D')) return 'D';
  if (p.startsWith('E')) return 'E';
  if (p.startsWith('F')) return 'F';
  if (p.startsWith('G')) return 'G';
  if (p.startsWith('H')) return 'H';
  if (p.startsWith('R')) return 'Requirements';
  if (p.startsWith('X')) return 'Cross-phase';
  return 'Cross-phase';
}

/** Extract the YAML front matter value for a given key. */
function yamlValue(content: string, key: string): string | undefined {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return undefined;
  const re = new RegExp(`^${key}:\\s*(.+)$`, 'm');
  const m = fmMatch[1].match(re);
  return m ? m[1].trim() : undefined;
}

/** Map a severity/probability string to a priority. */
function severityToPriority(sev: string): TodoPriority {
  const s = sev.toLowerCase();
  if (s.includes('critical')) return 'critical';
  if (s.includes('high')) return 'high';
  if (s.includes('medium')) return 'medium';
  return 'low';
}

/**
 * Parse markdown table rows, returning cells for each data row.
 * Handles `| a | b | c |` format.
 */
function parseTableRows(tableBlock: string): string[][] {
  const lines = tableBlock.split('\n').filter((l) => l.trim().startsWith('|'));
  if (lines.length < 2) return [];

  // Skip header and separator
  const dataLines = lines.slice(2);
  return dataLines
    .filter((l) => l.trim().length > 1)
    .map((line) =>
      line
        .split('|')
        .map((c) => c.trim())
        .filter((_, i, arr) => i > 0 && i < arr.length) // drop leading/trailing empty
    );
}

// ── Extractors ─────────────────────────────────────────────────────

/** Extract open decisions from the ADR Decision Log. */
function extractOpenDecisions(files: VaultFile[]): TodoItem[] {
  const items: TodoItem[] = [];
  const file = files.find((f) => f.name.includes('ADR_Decision_Log') || f.name.includes('Decision_Log'));
  if (!file) return items;

  // Look for decision blocks: ## AD-xx — Title ... | **Status** | 🟡 Open |
  const decisionBlocks = file.content.split(/(?=^## AD-)/m);
  for (const block of decisionBlocks) {
    const headerMatch = block.match(/^## (AD-\d+)\s*[—–-]\s*(.+)/m);
    if (!headerMatch) continue;

    const id = headerMatch[1]; or Proposed
    const statusMatch = block.match(/\*\*Status\*\*\s*\|\s*(.*?)\s*\|/);
    if (!statusMatch) continue;
    const status = statusMatch[1].trim();
    if (!status.includes('Open') && !status.includes('Proposed')) continue;

    const ownerMatch = block.match(/\*\*Owner\*\*\s*\|\s*(.*?)\s*\|/);
    const owner = ownerMatch ? ownerMatch[1].trim() : 'TBD';

    const priorityMatch = block.match(/\*\*Priority\*\*\s*\|\s*(.*?)\s*\|/);
    const priority = priorityMatch ? severityToPriority(priorityMatch[1]) : 'medium'; // Default to medium for proposed

    const phaseMatch = block.match(/\*\*Phase\*\*\s*\|\s*(.*?)\s*\|/);
    let phase: TogafPhase = 'Cross-phase';
    if (phaseMatch) {
      const phaseLetter = phaseMatch[1].charAt(0).toUpperCase();
      if ('ABCDEFGH'.includes(phaseLetter)) phase = phaseLetter as TogafPhase;
    }

    items.push({
      id,
      title: `${status.includes('Proposed') ? 'Review Proposed' : 'Decide'}: ${title}`,
      category: status.includes('Proposed') ? 'decision-pending' ({
      id,
      title: `Decide: ${title}`,
      category: 'decision',
      priority,
      phase,
      sourceFile: file.name,
      owner,
      detail: `Status: ${status}`,
    });
  }

  return items;
}

/** Extract open risks from the Risk & Issue Register. */
function extractOpenRisks(files: VaultFile[]): TodoItem[] {
  const items: TodoItem[] = [];
  const file = files.find((f) => f.name.includes('Risk') && f.name.includes('Register'));
  if (!file) return items;

  // Find the risk register table
  const riskSection = file.content.match(
    /## Risk Register\s*\n([\s\S]*?)(?=\n## |\n---|$)/
  );
  if (!riskSection) return items;

  const rows = parseTableRows(riskSection[1]);
  for (const cells of rows) {
    if (cells.length < 8) continue;
    const [id, risk, probability, impact, severity, mitigation, owner, status] = cells;

    if (!id.match(/R-\d+/) || !status.toLowerCase().includes('open')) continue;

    const riskName = risk.replace(/\*\*/g, '').replace(/\s*—.*/, '').trim();

    const isMissingOwner = !owner || owner.trim() === '' || owner.trim() === 'TBD';

    items.push({
      id,
      title: `Mitigate risk: ${riskName}`,
      category: isMissingOwner ? 'risk-no-owner' : 'risk',
      priority: severityToPriority(severity),
      phase: 'Cross-phase',
      sourceFile: file.name,
      owner: owner || 'TBD',
      detail: `${probability} probability × ${impact} impact — ${mitigation.slice(0, 80)}`,
    });
  }

  return items;
}

/** Extract open questions. */
function extractOpenQuestions(files: VaultFile[]): TodoItem[] {
  const items: TodoItem[] = [];
  const file = files.find((f) => f.name.includes('Open_Questions'));
  if (!file) return items;

  // Find all tables in the file with question rows
  const tablePattern = /\|\s*Q-\d+.*\|/g;
  let match: RegExpExecArray | null;
  while ((match = tablePattern.exec(file.content)) !== null) {
    const line = match[0];
    const cells = line.split('|').map((c) => c.trim()).filter(Boolean);
    if (cells.length < 6) continue;

    const [id, question, phaseStr, owner, _targetDate, status] = cells;
    if (!id.match(/Q-\d+/) || !status.includes('Open')) continue;

    let phase: TogafPhase = 'Cross-phase';
    const pChar = phaseStr.trim().charAt(0).toUpperCase();
    if ('ABCDEFGH'.includes(pChar)) phase = pChar as TogafPhase;
    else if (pChar === 'P') phase = 'Preliminary';

    items.push({
      id,
      title: `Resolve: ${question.slice(0, 80)}`,
      category: 'question',
      priority: 'medium',
      phase,
      sourceFile: file.name,
      owner: owner || 'TBD',
    });
  }

  return items;
}

/** Extract pending work packages from the Architecture Roadmap. */
function extractPendingWorkPackages(files: VaultFile[]): TodoItem[] {
  const items: TodoItem[] = [];
  const file = files.find((f) => f.name.includes('Architecture_Roadmap') || f.name.includes('Roadmap'));
  if (!file) return items;

  // Split by phase sections
  const phaseSections = file.content.split(/(?=^## Phase \d)/m);

  for (const section of phaseSections) {
    const phaseHeader = section.match(/^## Phase (\d+)\s*[—–-]\s*(.+)/m);
    if (!phaseHeader) continue;

    const phaseNum = phaseHeader[1];
    const phaseName = phaseHeader[2].trim();

    // Parse the work package table
    const tableMatch = section.match(/\|.*Work Package.*\|[\s\S]*?(?=\n\n|\n## |\$)/);
    if (!tableMatch) continue;

    const rows = parseTableRows(tableMatch[0]);
    for (const cells of rows) {
      if (cells.length < 5) continue;
      const [workPackage, duration, _deps, owner, status] = cells;

      const statusClean = status.replace(/[✅❌⬜🟡]/g, '').trim().toLowerCase();
      if (statusClean.includes('decided') || statusClean.includes('done') || statusClean.includes('completed')) continue;

      const isInProgress = statusClean.includes('in progress');
      const priority: TodoPriority = isInProgress ? 'high' : (phaseNum === '1' ? 'high' : 'medium');

      items.push({
        id: `WP-P${phaseNum}`,
        title: `${isInProgress ? '▶' : '○'} ${workPackage.replace(/\*\*/g, '').trim()}`,
        category: 'work-package',
        priority,
        phase: 'F',
        sourceFile: file.name,
        owner: owner || 'TBD',
        detail: `Phase ${phaseNum} (${phaseName}) — ${duration} — ${status.trim()}`,
      });
    }
  }

  return items;
}

/** Extract pending milestones from the Architecture Roadmap. */
function extractPendingMilestones(files: VaultFile[]): TodoItem[] {
  const items: TodoItem[] = [];
  const file = files.find((f) => f.name.includes('Architecture_Roadmap') || f.name.includes('Roadmap'));
  if (!file) return items;

  const milestoneSection = file.content.match(
    /## Key Milestones\s*\n([\s\S]*?)(?=\n## |\n---|$)/
  );
  if (!milestoneSection) return items;

  const rows = parseTableRows(milestoneSection[1]);
  for (const cells of rows) {
    if (cells.length < 4) continue;
    const [milestone, targetDate, phase, status] = cells;

    const statusClean = status.replace(/[✅❌⬜🟡]/g, '').trim().toLowerCase();
    if (statusClean.includes('decided') || statusClean.includes('done') || statusClean.includes('completed')) continue;

    items.push({
      id: `MS-P${phase.trim()}`,
      title: `Milestone: ${milestone.trim()}`,
      category: 'milestone',
      priority: 'high',
      phase: 'F',
      sourceFile: file.name,
      owner: 'TBD',
      detail: `Target: ${targetDate.trim()} — ${status.trim()}`,
    });
  }

  return items;
}

/** Extract open requirements. */
function extractOpenRequirements(files: VaultFile[]): TodoItem[] {
  const items: TodoItem[] = [];
  const file = files.find(
    (f) => f.name.includes('Architecture_Requirements') || f.name.includes('Requirements_Catalogue')
  );
  if (!file) return items;

  // Functional requirements table
  const frSection = file.content.match(
    /## Functional Requirements\s*\n([\s\S]*?)(?=\n## |\n---|$)/
  );
  if (frSection) {
    const rows = parseTableRows(frSection[1]);
    for (const cells of rows) {
      if (cells.length < 6) continue;
      const [id, requirement, priority, _source, _phase, status] = cells;
      if (!id.match(/FR-\d+/) || !status.toLowerCase().includes('open')) continue;

      items.push({
        id,
        title: `Requirement: ${requirement.slice(0, 70)}`,
        category: 'requirement',
        priority: priority.toLowerCase().includes('must') ? 'high' : 'medium',
        phase: 'Requirements',
        sourceFile: file.name,
        owner: 'TBD',
        detail: `Priority: ${priority}`,
      });
    }
  }

  // Non-functional requirements table
  const nfrSection = file.content.match(
    /## Non-Functional Requirements\s*\n([\s\S]*?)(?=\n## |\n---|$)/
  );
  if (nfrSection) {
    const rows = parseTableRows(nfrSection[1]);
    for (const cells of rows) {
      if (cells.length < 6) continue;
      const [id, _category, requirement, _target, _measure, status] = cells;
      if (!id.match(/NFR-\d+/) || !status.toLowerCase().includes('open')) continue;

      items.push({
        id,
        title: `NFR: ${requirement.slice(0, 70)}`,
        category: 'requirement',
        priority: 'high',
        phase: 'Requirements',
        sourceFile: file.name,
        owner: 'TBD',
      });
    }
  }

  return items;
}

/** Extract incomplete compliance checks. */
function extractComplianceItems(files: VaultFile[]): TodoItem[] {
  const items: TodoItem[] = [];
  const file = files.find((f) => f.name.includes('Compliance'));
  if (!file) return items;

  const checklistSection = file.content.match(
    /## Compliance Checklist\s*\n([\s\S]*?)(?=\n## |\n---|$)/
  );
  if (!checklistSection) return items;

  const rows = parseTableRows(checklistSection[1]);
  for (const cells of rows) {
    if (cells.length < 4) continue;
    const [num, criterion, status, _evidence] = cells;

    // ⬜ means not checked
    if (!status.includes('⬜')) continue;

    items.push({
      id: `CC-${num.trim()}`,
      title: `Compliance: ${criterion.replace(/\[\[.*?\]\]/g, '').trim().slice(0, 60)}`,
      category: 'compliance',
      priority: 'medium',
      phase: 'G',
      sourceFile: file.name,
      owner: cells.length >= 5 ? (cells[4] || 'TBD') : 'TBD',
    });
  }

  return items;
}

/** Extract pending change requests. */
function extractChangeRequests(files: VaultFile[]): TodoItem[] {
  const items: TodoItem[] = [];
  const file = files.find((f) => f.name.includes('Change_Request'));
  if (!file) return items;

  // Find the CR table
  const tablePattern = /\|\s*CR-\d+.*\|/g;
  let match: RegExpExecArray | null;
  while ((match = tablePattern.exec(file.content)) !== null) {
    const line = match[0];
    const cells = line.split('|').map((c) => c.trim()).filter(Boolean);
    if (cells.length < 7) continue;

    const [id, _date, requestor, description, _impact, priority, status] = cells;
    if (!id.match(/CR-\d+/) || !status.toLowerCase().includes('open')) continue;

    items.push({
      id,
      title: `Change request: ${description.slice(0, 60)}`,
      category: 'change-request',
      priority: severityToPriority(priority),
      phase: 'H',
      sourceFile: file.name,
      owner: requestor || 'TBD',
    });
  }

  return items;
}

/** Identify documents that are still in draft or review status. */
function extractDocumentMaturity(files: VaultFile[]): TodoItem[] {
  const items: TodoItem[] = [];

  for (const file of files) {
    const status = yamlValue(file.content, 'status');
    if (!status) continue;

    const statusLower = status.toLowerCase();
    if (statusLower !== 'draft' && statusLower !== 'review' && statusLower !== 'in-review') continue;

    const owner = yamlValue(file.content, 'owner') || 'TBD';
    const phase = prefixToPhase(file.name);

    const isDraft = statusLower === 'draft';

    items.push({
      id: file.name.replace(/\.md$/, ''),
      title: `${isDraft ? '📝 Promote from draft' : '👁️ Complete review'}: ${file.name}`,
      category: 'document-maturity',
      priority: isDraft ? 'medium' : 'high',
      phase,
      sourceFile: file.name,
      owner,
      detail: `Status: ${status}`,
    });
  }

  return items;
}

/** Identify items with TBD ownership that need assignment. */
function extractUnassignedOwnership(files: VaultFile[]): TodoItem[] {
  const items: TodoItem[] = [];

  for (const file of files) {
    const owner = yamlValue(file.content, 'owner');
    if (owner && owner.toUpperCase() === 'TBD') {
      items.push({
        id: file.name.replace(/\.md$/, ''),
        title: `Assign owner: ${file.name}`,
        category: 'ownership',
        priority: 'low',
        phase: prefixToPhase(file.name),
        sourceFile: file.name,
        owner: 'TBD',
      });
    }
  }

  return items;
}** Identify files with no incoming or outgoing links. */
function extractOrphanedEntities(files: VaultFile[]): TodoItem[] {
  const items: TodoItem[] = [];
  const linkValues = new Set<string>();
  const fileMap = new Map<string, VaultFile>();

  // 1. Build map and collect all outgoing links
  for (const file of files) {
    const baseName = file.name.replace('.md', '');
    fileMap.set(baseName, file);

    const regex = /\[\[(.*?)\]\]/g;
    let match;
    while ((match = regex.exec(file.content)) !== null) {
      let link = match[1].split('|')[0];
      link = link.split('#')[0];
      linkValues.add(link);
    }
  }

  // 2. Check each file for orphans
  for (const file of files) {
    const baseName = file.name.replace('.md', '');
    
    // Ignore meta files
    if (baseName.startsWith('00_') || baseName.startsWith('X')) continue;

    // Has outgoing links?
    const hasOutgoing = /\[\[.*?\]\]/.test(file.content);
    
    // Has incoming links?
    // Note: linkValues contains *targets*. If baseName is in linkValues, it is referenced.
    const hasIncoming = linkValues.has(baseName);

    if (!hasOutgoing && !hasIncoming) {
       items.push({
        id: baseName,
        title: `Orphaned: ${baseName}`,
        category: 'orphaned-entity',
        priority: 'low',
        phase: prefixToPhase(file.name),
        sourceFile: file.name,
        owner: yamlValue(file.content, 'owner') || 'TBD',
        detail: 'No incoming or outgoing links found'
      });
    }
  }

  return items;
}

// ── Main public API ────────────────────────────────────────────────

/**
 * Scan all vault files and extract a structured TODO list from a TOGAF perspective.
 */
export function extractTodos(files: VaultFile[]): TodoSummary {
  const all: TodoItem[] = [
    ...extractOpenDecisions(files),
    ...extractOpenRisks(files),
    ...extractOpenQuestions(files),
    ...extractPendingWorkPackages(files),
    ...extractPendingMilestones(files),
    ...extractOpenRequirements(files),
    ...extractComplianceItems(files),
    ...extractChangeRequests(files),
    ...extractDocumentMaturity(files),
    ...extractUnassignedOwnership(files),
    ...extractOrphanedEntities(files),
  ];

  // Sort by priority (critical > high > medium > low)
  const priorityOrder: Record<TodoPriority, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  all.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // Build counts
  const byCategoryCount: Record<string, number> = {} as Record<TodoCategory, number>;
  const byPriorityCount: Record<string, number> = {} as Record<TodoPriority, number>;
  const byPhaseCount: Record<string, number> = {};
  let tbdCount = 0;

  for (const item of all) {
    byCategoryCount[item.category] = (byCategoryCount[item.category] || 0) + 1;
    byPriorityCount[item.priority] = (byPriorityCount[item.priority] || 0) + 1;
    byPhaseCount[item.phase] = (byPhaseCount[item.phase] || 0) + 1;
    if (item.owner.toUpperCase() === 'TBD') tbdCount++;
  }

  return {
    items: all,
    totalCount: all.length,
    byCategoryCount: byCategoryCount as Record<TodoCategory, number>,
    byPriorityCount: byPriorityCount as Record<TodoPriority, number>,
    byPhaseCount,
    tbd_ownership_count: tbdCount,
  };
}

/**
 * Format the TODO summary as structured markdown.
 */
export function formatTodoMarkdown(summary: TodoSummary): string {
  const lines: string[] = [];

  // ── Header ──
  lines.push(`## 📋 TOGAF Architecture TODO List\n`);
  lines.push(`> **${summary.totalCount} actionable items** found across the vault.\n`);

  // ── Summary counters ──
  lines.push(`### Overview\n`);
  lines.push(`| Metric | Count |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total items | ${summary.totalCount} |`);

  const priorityEmoji: Record<string, string> = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '⚪',
  };

  for (const p of ['critical', 'high', 'medium', 'low'] as TodoPriority[]) {
    const count = summary.byPriorityCount[p] || 0;
    if (count > 0) {
      lines.push(`| ${priorityEmoji[p]} ${p.charAt(0).toUpperCase() + p.slice(1)} priority | ${count} |`);
    }
  }

  lines.push(`| 👤 Unassigned (TBD) | ${summary.tbd_ownership_count} |`);
  lines.push(``);

  // ── By category ──
  const categoryLabels: Record<TodoCategory, string> = {
    decision: '🔷 Open Decisions',
    'decision-pending': '💡 Pending Decisions',
    risk: '⚠️ Open Risks',
    'risk-no-owner': '🚨 Risks without Owners',
    'orphaned-entity': '🕸 Orphaned Entities',
    question: '❓ Open Questions',
    'work-package': '📦 Pending Work Packages',
    milestone: '🏁 Pending Milestones',
    requirement: '📐 Open Requirements',
    compliance: '✅ Compliance Checks',
    'change-request': '🔄 Change Requests',
    'document-maturity': '📝 Document Maturity',
    ownership: '👤 Unassigned Ownership',
  };

  const categoryOrder: TodoCategory[] = [
    'decision',
    'decision-pending',
    'risk',
    'risk-no-owner',
    'orphaned-entity',
    'work-package',
    'milestone',
    'requirement',
    'question',
    'compliance',
    'change-request',
    'document-maturity',
    'ownership',
  ];

  for (const cat of categoryOrder) {
    const catItems = summary.items.filter((i) => i.category === cat);
    if (catItems.length === 0) continue;

    lines.push(`### ${categoryLabels[cat]} (${catItems.length})\n`);

    lines.push(`| Priority | ID | Action | Owner | Phase | Detail |`);
    lines.push(`|----------|-----|--------|-------|-------|--------|`);

    for (const item of catItems) {
      const emoji = priorityEmoji[item.priority] || '⚪';
      const detail = item.detail ? item.detail.slice(0, 60) : '—';
      lines.push(
        `| ${emoji} ${item.priority} | ${item.id} | ${item.title} | ${item.owner} | ${item.phase} | ${detail} |`
      );
    }

    lines.push(``);
  }

  // ── Phase distribution ──
  const phaseKeys = Object.keys(summary.byPhaseCount).sort();
  if (phaseKeys.length > 0) {
    lines.push(`### 📊 Distribution by ADM Phase\n`);
    lines.push(`| Phase | Open Items |`);
    lines.push(`|-------|-----------|`);
    for (const phase of phaseKeys) {
      lines.push(`| ${phase} | ${summary.byPhaseCount[phase]} |`);
    }
    lines.push(``);
  }

  return lines.join('\n');
}
