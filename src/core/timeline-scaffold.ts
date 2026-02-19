/**
 * timeline-scaffold.ts – Deterministic timeline scaffold extractor.
 *
 * Zero VS Code dependencies – works with plain VaultFile arrays.
 *
 * Parses vault files to build a structured timeline scaffold containing:
 *   - Phases with target dates (from F1_Architecture_Roadmap)
 *   - Work packages with duration & dependencies (from F1)
 *   - Milestones with target dates (from F1)
 *   - Existing Gantt data (from .mermaid files)
 *   - Migration states & transitions (from F2_Migration_Plan)
 *   - Risks to timeline (from X2_Risk_Issue_Register)
 *   - Open questions affecting timing (from X3_Open_Questions)
 *
 * The scaffold is streamed to the user BEFORE the LLM pass so the AI
 * can refine rather than invent.
 *
 * @module timeline-scaffold
 */

import { parseTables } from './archimate-exporter.js';
import type { TableRow } from './archimate-exporter.js';

// ── Types ──────────────────────────────────────────────────────────

interface VaultFile {
  name: string;
  content: string;
}

export interface TimelinePhase {
  number: number;
  name: string;
  targetDate: string;
  workPackages: TimelineWorkPackage[];
}

export interface TimelineWorkPackage {
  name: string;
  duration: string;
  dependencies: string;
  owner: string;
  status: string;
  phase: number;
}

export interface TimelineMilestone {
  name: string;
  targetDate: string;
  phase: string;
  status: string;
}

export interface GanttTask {
  id: string;
  name: string;
  section: string;
  startOrDep: string;
  duration: string;
  flags: string[];
}

export interface GanttMilestone {
  id: string;
  name: string;
  date: string;
  section: string;
}

export interface ExistingGantt {
  tasks: GanttTask[];
  milestones: GanttMilestone[];
  dateFormat: string;
  title: string;
  sections: string[];
  sourceFile: string;
  rawContent: string;
}

export interface TransitionState {
  state: string;
  description: string;
  entryCriteria: string;
  exitCriteria: string;
}

export interface TimelineRisk {
  id: string;
  description: string;
  probability: string;
  impact: string;
  mitigation: string;
  source: string;
}

export interface TimelineQuestion {
  id: string;
  question: string;
  owner: string;
  targetDate: string;
  source: string;
}

export interface TimelineScaffold {
  /** Parsed phases from F1 */
  phases: TimelinePhase[];
  /** Key milestones from F1 */
  milestones: TimelineMilestone[];
  /** Existing Gantt chart if present (F3 or inline) */
  existingGantt: ExistingGantt | null;
  /** Migration transition states from F2 */
  transitionStates: TransitionState[];
  /** Risks that could affect timeline (from X2) */
  risks: TimelineRisk[];
  /** Open questions affecting timing (from X3) */
  openQuestions: TimelineQuestion[];
  /** Total work packages across all phases */
  totalWorkPackages: number;
  /** Phases with all work packages completed */
  completedPhases: number;
  /** Source files that contributed */
  sourceFiles: string[];
}

// ── Extraction ─────────────────────────────────────────────────────

function findFile(files: VaultFile[], pattern: RegExp): VaultFile | undefined {
  return files.find((f) => pattern.test(f.name));
}

function findFiles(files: VaultFile[], pattern: RegExp): VaultFile[] {
  return files.filter((f) => pattern.test(f.name));
}

function extractPhases(files: VaultFile[]): { phases: TimelinePhase[]; milestones: TimelineMilestone[] } {
  const f1 = findFile(files, /F1_.*Roadmap/i);
  if (!f1) return { phases: [], milestones: [] };

  const phases: TimelinePhase[] = [];
  const milestones: TimelineMilestone[] = [];

  // Split by phase headers: "## Phase N — Name (Target: Qx YYYY)" or similar
  const phaseBlocks = f1.content.split(/(?=^##\s+Phase\s+\d)/m);

  for (const block of phaseBlocks) {
    const headerMatch = block.match(
      /^##\s+Phase\s+(\d+)\s*[—–-]\s*(.+?)(?:\(Target:\s*(.+?)\))?$/m
    );
    if (!headerMatch) continue;

    const phaseNum = parseInt(headerMatch[1], 10);
    const phaseName = headerMatch[2].trim();
    const targetDate = headerMatch[3]?.trim() || '';

    // Parse work package tables within this phase block
    const tables = parseTables(block);
    const workPackages: TimelineWorkPackage[] = [];

    for (const table of tables) {
      for (const row of table) {
        const wpName = row['Work Package'] || row['Task'] || row['Deliverable'] || '';
        const duration = row['Duration'] || row['Effort'] || '';
        const deps = row['Dependencies'] || row['Depends On'] || '';
        const owner = row['Owner'] || row['Responsible'] || '';
        const status = row['Status'] || '';
        if (wpName) {
          workPackages.push({
            name: wpName,
            duration,
            dependencies: deps,
            owner,
            status,
            phase: phaseNum,
          });
        }
      }
    }

    phases.push({
      number: phaseNum,
      name: phaseName,
      targetDate,
      workPackages,
    });
  }

  // Extract milestones section
  const milestoneSection = f1.content.match(
    /##\s*(?:Key\s+)?Milestones[\s\S]*?(?=\n##\s|\n---|$)/i
  );
  if (milestoneSection) {
    const tables = parseTables(milestoneSection[0]);
    for (const table of tables) {
      for (const row of table) {
        const name = row['Milestone'] || row['Name'] || '';
        const date = row['Target Date'] || row['Date'] || row['Target'] || '';
        const phase = row['Phase'] || '';
        const status = row['Status'] || '';
        if (name) {
          milestones.push({ name, targetDate: date, phase, status });
        }
      }
    }
  }

  return { phases, milestones };
}

function extractExistingGantt(files: VaultFile[]): ExistingGantt | null {
  // Check for standalone .mermaid files first
  const mermaidFiles = files.filter((f) => /\.mermaid$/i.test(f.name));
  for (const file of mermaidFiles) {
    const gantt = parseGanttContent(file.content, file.name);
    if (gantt) return gantt;
  }

  // Then check for inline Gantt in F1, F2, or F3 files
  const fFiles = findFiles(files, /F[1-3]_/i);
  for (const file of fFiles) {
    const mermaidBlocks = file.content.matchAll(/```mermaid\s*\n([\s\S]*?)```/g);
    for (const block of mermaidBlocks) {
      if (/^\s*gantt\b/m.test(block[1])) {
        const gantt = parseGanttContent(block[1], file.name);
        if (gantt) return gantt;
      }
    }
  }

  return null;
}

function parseGanttContent(content: string, sourceFile: string): ExistingGantt | null {
  if (!/gantt\b/i.test(content)) return null;

  const lines = content.split('\n');
  const tasks: GanttTask[] = [];
  const milestones: GanttMilestone[] = [];
  const sections: string[] = [];
  let dateFormat = 'YYYY-MM-DD';
  let title = '';
  let currentSection = '';

  for (const line of lines) {
    const trimmed = line.trim();

    // Parse metadata
    const dfMatch = trimmed.match(/^dateFormat\s+(.+)/);
    if (dfMatch) {
      dateFormat = dfMatch[1].trim();
      continue;
    }

    const titleMatch = trimmed.match(/^title\s+(.+)/);
    if (titleMatch) {
      title = titleMatch[1].trim();
      continue;
    }

    const sectionMatch = trimmed.match(/^section\s+(.+)/);
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim();
      sections.push(currentSection);
      continue;
    }

    // Parse task lines: "Task Name :flags, id, start, duration" variations
    // Milestone: "Milestone Name :milestone, id, date, 0d"
    const taskMatch = trimmed.match(/^(.+?)\s*:(.*)/);
    if (taskMatch) {
      const taskName = taskMatch[1].trim();
      const metadata = taskMatch[2].trim();

      // Skip reserved directives
      if (/^(gantt|dateFormat|axisFormat|excludes|includes|todayMarker|title|section)/i.test(taskName)) {
        continue;
      }

      const parts = metadata.split(',').map((p) => p.trim());
      const flags: string[] = [];
      let id = '';
      let startOrDep = '';
      let duration = '';

      // Classify parts
      for (const part of parts) {
        if (/^(done|crit|active|milestone)$/i.test(part)) {
          flags.push(part.toLowerCase());
        } else if (/^after\s+/i.test(part)) {
          startOrDep = part;
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(part)) {
          startOrDep = part;
        } else if (/^\d+d$/.test(part)) {
          duration = part;
        } else if (/^[a-z]\w*$/i.test(part) && !id) {
          id = part;
        }
      }

      if (flags.includes('milestone')) {
        milestones.push({
          id,
          name: taskName,
          date: startOrDep,
          section: currentSection,
        });
      } else {
        tasks.push({
          id,
          name: taskName,
          section: currentSection,
          startOrDep,
          duration,
          flags,
        });
      }
    }
  }

  if (tasks.length === 0 && milestones.length === 0) return null;

  return {
    tasks,
    milestones,
    dateFormat,
    title,
    sections,
    sourceFile,
    rawContent: content,
  };
}

function extractTransitionStates(files: VaultFile[]): TransitionState[] {
  const f2 = findFile(files, /F2_.*Migration/i);
  if (!f2) return [];

  const tables = parseTables(f2.content);
  const states: TransitionState[] = [];

  for (const table of tables) {
    for (const row of table) {
      const state = row['State'] || row['Transition'] || '';
      const desc = row['Description'] || '';
      const entry = row['Entry Criteria'] || '';
      const exit = row['Exit Criteria'] || '';
      if (state && (desc || entry || exit)) {
        states.push({ state, description: desc, entryCriteria: entry, exitCriteria: exit });
      }
    }
  }
  return states;
}

function extractTimelineRisks(files: VaultFile[]): TimelineRisk[] {
  const x2 = findFile(files, /X2_.*Risk/i);
  if (!x2) return [];

  const tables = parseTables(x2.content);
  const risks: TimelineRisk[] = [];

  for (const table of tables) {
    for (const row of table) {
      const id = row['ID'] || row['Risk ID'] || row['#'] || '';
      const desc = row['Risk'] || row['Description'] || row['Title'] || '';
      const prob = row['Probability'] || row['Likelihood'] || '';
      const impact = row['Impact'] || row['Severity'] || '';
      const mitigation = row['Mitigation'] || row['Response'] || '';
      if (id && desc) {
        risks.push({
          id,
          description: desc,
          probability: prob,
          impact: impact,
          mitigation,
          source: 'X2_Risk_Issue_Register',
        });
      }
    }
  }
  return risks;
}

function extractTimelineQuestions(files: VaultFile[]): TimelineQuestion[] {
  const x3 = findFile(files, /X3_.*Question/i);
  if (!x3) return [];

  const tables = parseTables(x3.content);
  const questions: TimelineQuestion[] = [];

  for (const table of tables) {
    for (const row of table) {
      const id = row['ID'] || row['Q ID'] || row['#'] || '';
      const question = row['Question'] || row['Description'] || '';
      const owner = row['Owner'] || '';
      const target = row['Target Date'] || row['Due'] || '';

      // Focus on timeline-relevant questions
      if (id && question && /time|schedule|deadline|phase|milestone|date|delivery|resource|capacity|delay|block/i.test(question)) {
        questions.push({
          id,
          question,
          owner,
          targetDate: target,
          source: 'X3_Open_Questions',
        });
      }
    }
  }

  // If no timeline-specific questions found, include all open questions
  if (questions.length === 0) {
    for (const table of tables) {
      for (const row of table) {
        const id = row['ID'] || row['Q ID'] || row['#'] || '';
        const question = row['Question'] || row['Description'] || '';
        const owner = row['Owner'] || '';
        const target = row['Target Date'] || row['Due'] || '';
        if (id && question) {
          questions.push({
            id,
            question,
            owner,
            targetDate: target,
            source: 'X3_Open_Questions',
          });
        }
      }
    }
  }

  return questions;
}

// ── Public API ─────────────────────────────────────────────────────

/**
 * Extract a deterministic timeline scaffold from the vault.
 */
export function extractTimelineScaffold(files: VaultFile[]): TimelineScaffold {
  const { phases, milestones } = extractPhases(files);
  const existingGantt = extractExistingGantt(files);
  const transitionStates = extractTransitionStates(files);
  const risks = extractTimelineRisks(files);
  const openQuestions = extractTimelineQuestions(files);

  const totalWorkPackages = phases.reduce((sum, p) => sum + p.workPackages.length, 0);
  const completedPhases = phases.filter((p) =>
    p.workPackages.length > 0 &&
    p.workPackages.every((wp) => /done|complete|✅/i.test(wp.status))
  ).length;

  const sourceFiles = new Set<string>();
  for (const pattern of [/F1_/i, /F2_/i, /F3_/i, /X2_/i, /X3_/i]) {
    const f = files.find((v) => pattern.test(v.name));
    if (f) sourceFiles.add(f.name);
  }
  // Include .mermaid files
  for (const f of files) {
    if (/\.mermaid$/i.test(f.name)) sourceFiles.add(f.name);
  }

  return {
    phases,
    milestones,
    existingGantt,
    transitionStates,
    risks,
    openQuestions,
    totalWorkPackages,
    completedPhases,
    sourceFiles: [...sourceFiles],
  };
}

// ── Formatting ─────────────────────────────────────────────────────

/**
 * Format the timeline scaffold as Markdown ready for display / LLM context.
 */
export function formatTimelineScaffoldMarkdown(scaffold: TimelineScaffold): string {
  const lines: string[] = [];

  lines.push('## 📅 Timeline Scaffold\n');

  // ── Phases Summary ──
  if (scaffold.phases.length > 0) {
    lines.push('### Phases & Work Packages\n');
    for (const phase of scaffold.phases) {
      const wpDone = phase.workPackages.filter((wp) => /done|complete|✅/i.test(wp.status)).length;
      const wpTotal = phase.workPackages.length;
      const progress = wpTotal > 0 ? ` (${wpDone}/${wpTotal} complete)` : '';
      lines.push(`#### Phase ${phase.number} — ${phase.name}${phase.targetDate ? ` *(Target: ${phase.targetDate})*` : ''}${progress}\n`);

      if (phase.workPackages.length > 0) {
        lines.push('| Work Package | Duration | Dependencies | Owner | Status |');
        lines.push('|-------------|----------|-------------|-------|--------|');
        for (const wp of phase.workPackages) {
          lines.push(`| ${wp.name} | ${wp.duration || '—'} | ${wp.dependencies || '—'} | ${wp.owner || '—'} | ${wp.status || '—'} |`);
        }
        lines.push('');
      }
    }
  } else {
    lines.push('*No phases found in F1_Architecture_Roadmap.*\n');
  }

  // ── Key Milestones ──
  if (scaffold.milestones.length > 0) {
    lines.push('### Key Milestones\n');
    lines.push('| Milestone | Target Date | Phase | Status |');
    lines.push('|-----------|------------|-------|--------|');
    for (const m of scaffold.milestones) {
      lines.push(`| ${m.name} | ${m.targetDate || '—'} | ${m.phase || '—'} | ${m.status || '—'} |`);
    }
    lines.push('');
  }

  // ── Existing Gantt ──
  if (scaffold.existingGantt) {
    const g = scaffold.existingGantt;
    lines.push(`### Existing Gantt Chart (from ${g.sourceFile})\n`);
    lines.push(`- **Title:** ${g.title || '(untitled)'}`);
    lines.push(`- **Tasks:** ${g.tasks.length}`);
    lines.push(`- **Milestones:** ${g.milestones.length}`);
    lines.push(`- **Sections:** ${g.sections.join(', ') || '(none)'}`);
    lines.push(`- **Date format:** ${g.dateFormat}`);

    // Show completed / critical tasks
    const done = g.tasks.filter((t) => t.flags.includes('done'));
    const crit = g.tasks.filter((t) => t.flags.includes('crit'));
    if (done.length > 0) {
      lines.push(`- **Completed tasks:** ${done.map((t) => t.name).join(', ')}`);
    }
    if (crit.length > 0) {
      lines.push(`- **Critical path:** ${crit.map((t) => t.name).join(', ')}`);
    }
    lines.push('');

    // Include the raw Gantt for reference
    if (g.rawContent.length < 3000) {
      lines.push('<details><summary>Raw Gantt source</summary>\n');
      lines.push('```mermaid');
      lines.push(g.rawContent.trim());
      lines.push('```');
      lines.push('</details>\n');
    }
  }

  // ── Transition States ──
  if (scaffold.transitionStates.length > 0) {
    lines.push('### Migration Transition States (from F2)\n');
    lines.push('| State | Description | Entry Criteria | Exit Criteria |');
    lines.push('|-------|------------|----------------|---------------|');
    for (const ts of scaffold.transitionStates) {
      lines.push(`| ${ts.state} | ${ts.description} | ${ts.entryCriteria || '—'} | ${ts.exitCriteria || '—'} |`);
    }
    lines.push('');
  }

  // ── Risks to Timeline ──
  if (scaffold.risks.length > 0) {
    lines.push('### Risks to Timeline (from X2)\n');
    lines.push('| ID | Risk | Probability | Impact | Mitigation |');
    lines.push('|----|------|------------|--------|-----------|');
    for (const r of scaffold.risks) {
      lines.push(`| ${r.id} | ${r.description} | ${r.probability || '—'} | ${r.impact || '—'} | ${r.mitigation || '—'} |`);
    }
    lines.push('');
  }

  // ── Open Questions ──
  if (scaffold.openQuestions.length > 0) {
    lines.push('### Open Questions Affecting Timeline (from X3)\n');
    lines.push('| ID | Question | Owner | Target Date |');
    lines.push('|----|---------|-------|------------|');
    for (const q of scaffold.openQuestions) {
      lines.push(`| ${q.id} | ${q.question} | ${q.owner || '—'} | ${q.targetDate || '—'} |`);
    }
    lines.push('');
  }

  // ── Summary ──
  lines.push('---');
  lines.push(
    `*Scaffold: ${scaffold.phases.length} phases, ` +
    `${scaffold.totalWorkPackages} work packages ` +
    `(${scaffold.completedPhases} phases done), ` +
    `${scaffold.milestones.length} milestones, ` +
    `${scaffold.risks.length} risks, ` +
    `${scaffold.openQuestions.length} open questions. ` +
    `Gantt: ${scaffold.existingGantt ? 'found' : 'none'}.*\n`
  );

  return lines.join('\n');
}
