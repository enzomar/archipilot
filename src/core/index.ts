/**
 * Core module barrel export.
 * All exports here are free of VS Code API dependencies.
 */
export { parseCommands } from './parser.js';
export { validateCommands, validateMetamodel, COMMAND_SCHEMAS, VALID_COMMANDS } from './validator.js';
export type { ValidationError, MetamodelWarning } from './validator.js';
export { buildContext, summarizeFile } from './context.js';
export {
  updateSection,
  addDecision,
  appendContent,
  addOpenQuestion,
  updateYamlMetadata,
  isPathContained,
} from './mutations.js';
export type { MutationResult } from './mutations.js';
export {
  extractModel,
  serializeToXml,
  exportToArchimate,
  generateExportSummary,
  formatSummaryMarkdown,
  escapeXml,
  parseFrontMatter,
  parseTables,
  parseMermaidGraphs,
  resetIdCounter,
} from './archimate-exporter.js';
export type {
  ArchiModel,
  ArchiElement,
  ArchiRelationship,
  ArchiView,
  ArchiViewNode,
  ArchiViewConnection,
  ArchiExportSummary,
  ArchiLayer,
  ArchiElementType,
  ArchiRelationshipType,
  TableRow,
  MermaidEdge,
  MermaidNode,
} from './archimate-exporter.js';
export {
  exportToDrawio,
  classifyMigration,
  generateDrawioSummary,
  formatDrawioSummaryMarkdown,
  resetDrawioIdCounter,
} from './drawio-exporter.js';
export type {
  DrawioExportResult,
  DrawioExportSummary,
  DrawioElement,
  DrawioRelationship,
  MigrationStatus,
} from './drawio-exporter.js';
export {
  extractTodos,
  formatTodoMarkdown,
} from './todo-extractor.js';
export type {
  TodoItem,
  TodoSummary,
  TodoCategory,
  TodoPriority,
  TogafPhase,
} from './todo-extractor.js';
