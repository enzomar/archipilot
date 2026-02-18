/**
 * Core context windowing – builds LLM context from vault files with priority-based budgeting.
 * Zero VS Code dependencies – safe to import in tests and non-VS-Code contexts.
 */
import { VaultFile } from '../types.js';

/** Default priority file patterns — always included in full */
const DEFAULT_PRIORITY_PATTERNS = [
  'X1_', 'X2_', 'X3_', 'X4_', 'X5_',  // Cross-phase: decisions, risks, questions, sizing, traceability
  '00_',                                 // Index
  'A1_',                                 // Vision
  'R1_',                                 // Requirements
  'P1_', 'P2_',                          // Principles, governance
];

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
 *  1. Always include priority files in full (cross-phase, index, vision, principles).
 *  2. Include full content for files that fit within the remaining budget.
 *  3. Summarize files (YAML + headings) when budget is getting tight.
 *  4. Mark omitted files when budget is exhausted.
 *
 * @param files Array of vault files
 * @param maxChars Approximate character budget (default ~120K ≈ ~30K tokens)
 * @param priorityPatterns File name prefixes to always include in full
 */
export function buildContext(
  files: VaultFile[],
  maxChars: number = 120_000,
  priorityPatterns?: string[]
): string {
  if (files.length === 0) {
    return '(No vault files loaded)';
  }

  const patterns = priorityPatterns ?? DEFAULT_PRIORITY_PATTERNS;

  const isPriority = (name: string) =>
    patterns.some((p) => name.startsWith(p));

  // Sort: priority files first, then alphabetically
  const sorted = [...files].sort((a, b) => {
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
