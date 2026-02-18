/**
 * Core command validator – validates architecture commands against schemas.
 * Zero VS Code dependencies – safe to import in tests and non-VS-Code contexts.
 */
import { ArchCommand, ArchCommandType } from '../types.js';

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
