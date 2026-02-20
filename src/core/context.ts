/**
 * Core context windowing – builds LLM context from vault files with priority-based budgeting.
 * Zero VS Code dependencies – safe to import in tests and non-VS-Code contexts.
 *
 * Supports mode-scoped context loading: each command mode declares which file
 * prefixes are relevant, so only architecturally pertinent files are injected
 * into the LLM prompt — reducing token usage and improving response quality.
 */
import { VaultFile } from '../types.js';

// ── YAML front-matter pre-processing ───────────────────────────────

export interface YamlMeta {
  file: string;
  version: string;
  status: string;
  owner: string;
  togafPhase: string;
  lastModified: string;
}

/**
 * Extract structured YAML front-matter metadata from all vault files.
 * LLM no longer needs to parse YAML — gets a pre-processed table.
 */
export function extractYamlSummary(files: VaultFile[]): YamlMeta[] {
  const results: YamlMeta[] = [];
  for (const file of files) {
    const fmMatch = file.content.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) {
      results.push({
        file: file.name,
        version: 'N/A',
        status: 'N/A',
        owner: 'N/A',
        togafPhase: 'N/A',
        lastModified: 'N/A',
      });
      continue;
    }
    const fm = fmMatch[1];
    const get = (key: string): string => {
      const m = fm.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
      return m ? m[1].trim().replace(/^["']|["']$/g, '') : 'N/A';
    };
    results.push({
      file: file.name,
      version: get('version'),
      status: get('status'),
      owner: get('owner'),
      togafPhase: get('togaf_phase'),
      lastModified: get('last_modified'),
    });
  }
  return results;
}

/**
 * Format YAML metadata as a markdown table for injection into LLM prompts.
 */
export function formatYamlSummaryTable(metas: YamlMeta[]): string {
  const lines: string[] = [
    '| File | Version | Status | Owner | Phase | Last Modified |',
    '|------|---------|--------|-------|-------|---------------|',
  ];
  for (const m of metas) {
    lines.push(`| ${m.file} | ${m.version} | ${m.status} | ${m.owner} | ${m.togafPhase} | ${m.lastModified} |`);
  }
  return lines.join('\n');
}

/** Default priority file patterns — always included in full */
const DEFAULT_PRIORITY_PATTERNS = [
  'X1_', 'X2_', 'X3_', 'X4_', 'X5_',  // Cross-phase: decisions, risks, questions, sizing, traceability
  '00_',                                 // Index
  'A1_',                                 // Vision
  'R1_',                                 // Requirements
  'P1_', 'P2_',                          // Principles, governance
];

// ── Mode-scoped context configuration ──────────────────────────────
// Maps each command mode to the file prefixes (and cross-phase artifacts)
// that are relevant. '*' means include all files (full vault).

export type ContextMode =
  | 'analyze' | 'decide' | 'update' | 'status' | 'review' | 'gate' | 'audit'
  | 'c4' | 'sizing' | 'timeline' | 'archimate' | 'drawio' | 'todo' | 'scan'
  | 'default' | '*';

/**
 * Configurable mapping from command mode → relevant file prefixes.
 * Cross-phase files (X1–X5, P1, P2, 00) are always included regardless.
 * Use '*' as a prefix to include everything.
 */
export const MODE_RELEVANT_FILES: Record<ContextMode, string[]> = {
  // Analysis / decision modes — need cross-phase + context
  'analyze': ['*'],  // full vault needed for impact analysis
  'decide': ['X1_', 'X2_', 'X3_', 'P1_', 'P2_', 'A1_', 'R1_', '00_'],
  'update': ['*'],   // user may update any file
  'default': ['*'],  // conversational — needs full context

  // Status / governance modes
  'status': ['*'],   // dashboard reads all files
  'review': ['*'],   // quality review needs full vault
  'gate': ['*'],     // gate assessment checks all phases
  'audit': ['*'],    // combined audit needs full vault

  // Diagram / export modes — scoped to relevant layers
  'c4': ['C1_', 'C2_', 'C3_', 'D1_', 'D2_', 'B1_', 'B2_', 'E2_', 'A1_', 'X1_', 'X2_', 'P1_', '00_'],
  'sizing': ['D1_', 'D2_', 'C1_', 'C3_', 'F1_', 'X4_', 'A1_', 'X1_', 'P1_', '00_'],
  'timeline': ['F1_', 'F2_', 'X2_', 'X3_', 'E2_', 'A1_', 'R1_', 'P1_', '00_'],
  'archimate': ['*'],  // full model export
  'drawio': ['*'],     // full model export
  'todo': ['X1_', 'X2_', 'X3_', 'R1_', 'F1_', 'G1_', 'H1_', 'P1_', '00_'],

  // Scan — no vault context needed (source code is the input)
  'scan': [],

  // Wildcard
  '*': ['*'],
};

/**
 * Extract YAML front matter + markdown headings as a compact summary.
 */
export function summarizeFile(file: VaultFile): string {
  const lines = file.content.split('\n');
  const parts: string[] = [];

  // Extract YAML front matter
  let inYaml = false;
  for (const line of lines) {
    if (line.trim() === '---') {
      if (!inYaml) { inYaml = true; parts.push(line); continue; }
      else { parts.push(line); inYaml = false; continue; }
    }
    if (inYaml) { parts.push(line); }
  }

  // Extract headings and first table row after a heading
  for (const line of lines) {
    if (line.match(/^#{1,4}\s/)) {
      parts.push(line);
    } else if (line.match(/^\|.*\|.*\|/) && line.includes('---')) {
      // Skip table separator lines
    } else if (line.match(/^\|.*\|/) && parts.length > 0 && parts[parts.length - 1].match(/^#{1,4}\s/)) {
      // Include the first table row (header row) after a heading
      parts.push(line);
    }
  }

  parts.push('\n(summarized — use @architect to request full content)');
  return parts.join('\n');
}

/**
 * Build LLM context string from vault files, with smart windowing to stay within token limits.
 *
 * Strategy:
 *  1. Filter files to those relevant for the active mode (if specified).
 *  2. Always include priority files in full (cross-phase, index, vision, principles).
 *  3. Include full content for files that fit within the remaining budget.
 *  4. Summarize files (YAML + headings) when budget is getting tight.
 *  5. Mark omitted files when budget is exhausted.
 *
 * @param files Array of vault files
 * @param maxChars Approximate character budget (default ~120K ≈ ~30K tokens)
 * @param priorityPatterns File name prefixes to always include in full
 * @param mode Optional command mode — scopes which files are included
 */
export function buildContext(
  files: VaultFile[],
  maxChars: number = 120_000,
  priorityPatterns?: string[],
  mode?: ContextMode
): string {
  if (files.length === 0) {
    return '(No vault files loaded)';
  }

  const patterns = priorityPatterns ?? DEFAULT_PRIORITY_PATTERNS;

  // ── Mode-based file filtering ──
  let filteredFiles = files;
  if (mode && mode !== '*') {
    const relevantPrefixes = MODE_RELEVANT_FILES[mode] ?? ['*'];
    if (!relevantPrefixes.includes('*') && relevantPrefixes.length > 0) {
      filteredFiles = files.filter((f) =>
        relevantPrefixes.some((prefix) => f.name.startsWith(prefix))
      );
      // Always include cross-phase files even if the mode didn't explicitly list them
      const crossPhaseFiles = files.filter((f) =>
        DEFAULT_PRIORITY_PATTERNS.some((p) => f.name.startsWith(p)) &&
        !filteredFiles.some((ff) => ff.name === f.name)
      );
      filteredFiles = [...filteredFiles, ...crossPhaseFiles];
    }
  }

  const isPriority = (name: string) =>
    patterns.some((p) => name.startsWith(p));

  // Sort: priority files first, then alphabetically
  const sorted = [...filteredFiles].sort((a, b) => {
    const ap = isPriority(a.name) ? 0 : 1;
    const bp = isPriority(b.name) ? 0 : 1;
    if (ap !== bp) { return ap - bp; }
    return a.name.localeCompare(b.name);
  });

  const sections: string[] = [];
  let totalChars = 0;

  for (const file of sorted) {
    const header = `===== ${file.name} =====\n`;

    if (isPriority(file.name) || totalChars + file.content.length + header.length < maxChars) {
      // Include full content
      const section = header + file.content;
      sections.push(section);
      totalChars += section.length;
    } else if (totalChars < maxChars) {
      // Include summarized: YAML front matter + headings only
      const summary = summarizeFile(file);
      const section = header + summary;
      sections.push(section);
      totalChars += section.length;
    } else {
      // Budget exhausted — include only file name
      sections.push(header + '(content omitted — file available on request)\n');
      totalChars += header.length + 50;
    }
  }

  return sections.join('\n\n');
}
