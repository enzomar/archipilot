/**
 * Type definitions for AchiPilot
 */

/** Supported architecture commands for vault updates */
export type ArchCommandType =
  | 'ADD_DECISION'
  | 'UPDATE_SECTION'
  | 'APPEND_TO_FILE'
  | 'ADD_OPEN_QUESTION'
  | 'CREATE_FILE'
  | 'UPDATE_YAML_METADATA';

// ── Discriminated union for architecture commands ──────────────────

interface BaseArchCommand {
  file: string;
}

export interface AddDecisionCommand extends BaseArchCommand {
  command: 'ADD_DECISION';
  decision_id: string;
  title: string;
  status: string;
  content: string;
  impact: string;
}

export interface UpdateSectionCommand extends BaseArchCommand {
  command: 'UPDATE_SECTION';
  section: string;
  content: string;
}

export interface AppendToFileCommand extends BaseArchCommand {
  command: 'APPEND_TO_FILE';
  content: string;
}

export interface AddOpenQuestionCommand extends BaseArchCommand {
  command: 'ADD_OPEN_QUESTION';
  category: string;
  question: string;
}

export interface CreateFileCommand extends BaseArchCommand {
  command: 'CREATE_FILE';
  content: string;
}

export interface UpdateYamlMetadataCommand extends BaseArchCommand {
  command: 'UPDATE_YAML_METADATA';
  fields: Record<string, string>;
}

/** A structured architecture command parsed from LLM output */
export type ArchCommand =
  | AddDecisionCommand
  | UpdateSectionCommand
  | AppendToFileCommand
  | AddOpenQuestionCommand
  | CreateFileCommand
  | UpdateYamlMetadataCommand;

/** Represents a single vault file with its content and metadata */
export interface VaultFile {
  /** File name (e.g. "01_Architecture_Vision.md") */
  name: string;
  /** Absolute path on disk */
  path: string;
  /** Relative path from vault root */
  relativePath: string;
  /** Full file content */
  content: string;
  /** YAML front-matter type, if present */
  type?: string;
}

/** Summary info about the active vault */
export interface VaultInfo {
  /** Display name of the vault (folder name) */
  name: string;
  /** Absolute path to vault folder */
  path: string;
  /** Number of markdown files */
  fileCount: number;
  /** List of loaded files */
  files: VaultFile[];
}

/** Result of applying an architecture command */
export interface CommandResult {
  success: boolean;
  file: string;
  message: string;
}
