/**
 * Core command validator – validates architecture commands against schemas.
 * Zero VS Code dependencies – safe to import in tests and non-VS-Code contexts.
 *
 * Supports two levels of validation:
 * 1. Schema validation (structural) via validateCommands()
 * 2. Vault-aware validation (semantic) via validateCommandsAgainstVault()
 */
import { ArchCommand, ArchCommandType, VaultFile } from '../types.js';

/** Required fields per command type */
export const COMMAND_SCHEMAS: Record<ArchCommandType, string[]> = {
  ADD_DECISION: ['file', 'decision_id', 'title', 'status', 'content'],
  UPDATE_SECTION: ['file', 'section', 'content'],
  APPEND_TO_FILE: ['file', 'content'],
  ADD_OPEN_QUESTION: ['file', 'category', 'question'],
  CREATE_FILE: ['file', 'content'],
  UPDATE_YAML_METADATA: ['file', 'fields'],
};

export const VALID_COMMANDS: Set<string> = new Set(Object.keys(COMMAND_SCHEMAS));

export interface ValidationError {
  command: ArchCommand;
  errors: string[];
}

/**
 * Validate parsed commands against their schemas.
 * Returns an array of validation errors (empty = all valid).
 */
export function validateCommands(commands: ArchCommand[]): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const cmd of commands) {
    const cmdErrors: string[] = [];
    // Dynamic field access for validation — cmd originates from untrusted JSON
    const record = cmd as unknown as Record<string, unknown>;

    // Check command type is known
    if (!VALID_COMMANDS.has(cmd.command)) {
      cmdErrors.push(`Unknown command type: "${cmd.command}". Valid: ${[...VALID_COMMANDS].join(', ')}`);
      errors.push({ command: cmd, errors: cmdErrors });
      continue;
    }

    // Check required fields
    const required = COMMAND_SCHEMAS[cmd.command];
    for (const field of required) {
      if (record[field] === undefined || record[field] === null || record[field] === '') {
        cmdErrors.push(`Missing required field: "${field}"`);
      }
    }

    // Type-specific validations
    if (cmd.command === 'UPDATE_YAML_METADATA') {
      if (cmd.fields && typeof cmd.fields !== 'object') {
        cmdErrors.push(`"fields" must be an object, got ${typeof cmd.fields}`);
      }
    }

    if (cmd.file && typeof cmd.file === 'string') {
      // Basic filename safety
      if (cmd.file.includes('..') || cmd.file.startsWith('/')) {
        cmdErrors.push(`Unsafe file path: "${cmd.file}". Must be relative, no ".." allowed.`);
      }
      // Windows path safety
      if (cmd.file.includes('\\') || /^[a-zA-Z]:/.test(cmd.file)) {
        cmdErrors.push(`Unsafe file path: "${cmd.file}". Backslashes and drive letters are not allowed.`);
      }
    }

    if (cmdErrors.length > 0) {
      errors.push({ command: cmd, errors: cmdErrors });
    }
  }

  return errors;
}

// ── TOGAF metamodel checks ─────────────────────────────────────

/** Known TOGAF file type prefixes and their expected naming patterns */
const TOGAF_FILE_PATTERNS: Record<string, RegExp> = {
  decisions: /^X1_|ADR|Decision/i,
  risks: /^X2_|Risk|Issue/i,
  requirements: /^R1_|Requirement/i,
  principles: /^P1_|Principle/i,
  vision: /^A1_|Vision/i,
  business: /^B\d_|Business/i,
  information: /^C\d_|Information|Data/i,
  technology: /^D\d_|Technology/i,
};

export interface MetamodelWarning {
  severity: 'warning' | 'info';
  message: string;
}

/**
 * Validate TOGAF metamodel conventions for a batch of commands.
 * Returns advisory warnings (non-blocking) about best practices.
 */
export function validateMetamodel(commands: ArchCommand[]): MetamodelWarning[] {
  const warnings: MetamodelWarning[] = [];

  for (const cmd of commands) {
    // ADR decisions should target the decision log
    if (cmd.command === 'ADD_DECISION') {
      if (!TOGAF_FILE_PATTERNS.decisions.test(cmd.file)) {
        warnings.push({
          severity: 'warning',
          message: `Decision "${cmd.decision_id}" targets "${cmd.file}" — expected a decision log file (X1_ADR_Decision_Log.md).`,
        });
      }
      // Decisions should have a meaningful impact field
      if (cmd.impact && cmd.impact.trim().length < 10) {
        warnings.push({
          severity: 'info',
          message: `Decision "${cmd.decision_id}" has a very short impact statement. Consider elaborating on business and technical impact.`,
        });
      }
    }

    // Open questions should target appropriate governance files
    if (cmd.command === 'ADD_OPEN_QUESTION') {
      if (TOGAF_FILE_PATTERNS.decisions.test(cmd.file)) {
        warnings.push({
          severity: 'info',
          message: `Open question added to decision log "${cmd.file}" — consider adding to the relevant architecture phase document instead.`,
        });
      }
    }

    // YAML metadata updates on principles should preserve required fields
    if (cmd.command === 'UPDATE_YAML_METADATA') {
      if (TOGAF_FILE_PATTERNS.principles.test(cmd.file)) {
        const hasStatus = 'status' in cmd.fields;
        if (!hasStatus) {
          warnings.push({
            severity: 'info',
            message: `YAML update to principles file "${cmd.file}" — consider including a "status" field.`,
          });
        }
      }
    }
  }

  return warnings;
}

// ── Vault-aware validation ─────────────────────────────────────

export interface VaultValidationResult {
  command: ArchCommand;
  errors: string[];
  warnings: string[];
  /** Suggested fix (e.g. closest matching file or section) */
  suggestions: string[];
}

/**
 * Validate commands against the actual vault (file existence, section headings, etc.).
 * Returns per-command results with errors, warnings, and auto-fix suggestions.
 */
export function validateCommandsAgainstVault(
  commands: ArchCommand[],
  vaultFiles: VaultFile[]
): VaultValidationResult[] {
  const fileNames = new Set(vaultFiles.map((f) => f.name));
  const fileMap = new Map(vaultFiles.map((f) => [f.name, f]));
  const results: VaultValidationResult[] = [];

  for (const cmd of commands) {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // ── File existence checks ──
    if (cmd.command === 'CREATE_FILE') {
      if (fileNames.has(cmd.file)) {
        errors.push(`File "${cmd.file}" already exists in vault. Use UPDATE_SECTION or APPEND_TO_FILE instead.`);
      }
    } else {
      // All non-create commands require the target file to exist
      if (!fileNames.has(cmd.file)) {
        errors.push(`File "${cmd.file}" not found in vault.`);
        // Suggest closest match
        const closest = findClosestFileName(cmd.file, [...fileNames]);
        if (closest) {
          suggestions.push(`Did you mean "${closest}"?`);
        }
      }
    }

    // ── Section heading validation for UPDATE_SECTION ──
    if (cmd.command === 'UPDATE_SECTION') {
      const targetFile = fileMap.get(cmd.file);
      if (targetFile) {
        const headings = extractHeadings(targetFile.content);
        const normalizedSection = cmd.section.trim();

        if (!headings.some((h) => h === normalizedSection)) {
          // Try fuzzy match
          const closest = findClosestHeading(normalizedSection, headings);
          if (closest) {
            warnings.push(
              `Section "${normalizedSection}" not found exactly. Closest match: "${closest}".`
            );
            suggestions.push(`Consider using "${closest}" as the section heading.`);
          } else {
            errors.push(
              `Section "${normalizedSection}" not found in "${cmd.file}". ` +
              `Available headings: ${headings.slice(0, 8).join(', ')}${headings.length > 8 ? '...' : ''}`
            );
          }
        }
      }
    }

    // ── ADD_DECISION: check for duplicate decision IDs ──
    if (cmd.command === 'ADD_DECISION') {
      const targetFile = fileMap.get(cmd.file);
      if (targetFile && targetFile.content.includes(cmd.decision_id)) {
        errors.push(`Decision "${cmd.decision_id}" already exists in "${cmd.file}".`);
      }
    }

    results.push({ command: cmd, errors, warnings, suggestions });
  }

  return results;
}

/** Extract markdown headings from content */
function extractHeadings(content: string): string[] {
  return content
    .split('\n')
    .filter((line) => /^#{1,6}\s/.test(line))
    .map((line) => line.trim());
}

/** Levenshtein distance for fuzzy matching */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const d: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return d[m][n];
}

/** Find closest matching file name (within reasonable edit distance) */
function findClosestFileName(target: string, candidates: string[]): string | null {
  const lower = target.toLowerCase();
  let best: string | null = null;
  let bestDist = Infinity;

  for (const c of candidates) {
    const dist = levenshtein(lower, c.toLowerCase());
    if (dist < bestDist && dist <= Math.max(3, target.length * 0.4)) {
      bestDist = dist;
      best = c;
    }
  }
  return best;
}

/** Find closest matching heading (case-insensitive, ignoring leading #) */
function findClosestHeading(target: string, headings: string[]): string | null {
  const normalizedTarget = target.replace(/^#+\s*/, '').toLowerCase();
  let best: string | null = null;
  let bestDist = Infinity;

  for (const h of headings) {
    const normalizedH = h.replace(/^#+\s*/, '').toLowerCase();
    const dist = levenshtein(normalizedTarget, normalizedH);
    if (dist < bestDist && dist <= Math.max(3, normalizedTarget.length * 0.4)) {
      bestDist = dist;
      best = h;
    }
  }
  return best;
}
