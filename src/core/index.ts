/**
 * Core module barrel export.
 * All exports here are free of VS Code API dependencies.
 */
export { parseCommands } from './parser.js';
export { validateCommands, validateMetamodel, validateCommandsAgainstVault, COMMAND_SCHEMAS, VALID_COMMANDS } from './validator.js';
export type { ValidationError, MetamodelWarning, VaultValidationResult } from './validator.js';
export { buildContext, summarizeFile, MODE_RELEVANT_FILES, extractYamlSummary, formatYamlSummaryTable } from './context.js';
export type { ContextMode, YamlMeta } from './context.js';
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
export {
  ADR_DEFAULT_CONTENT,
  nextAdrId,
  formatAdrEntry,
  safeNodeId,
  extractWikiLinks,
  generateContextDiagramMermaid,
  generateVaultGraphMermaid,
} from './diagram-helpers.js';
export {
  extractC4Scaffold,
  formatC4ScaffoldMarkdown,
} from './c4-scaffold.js';
export type {
  C4Scaffold,
  C4Person,
  C4ExternalSystem,
  C4Container,
  C4Component,
  C4Integration,
  C4GraphData,
} from './c4-scaffold.js';
export {
  extractSizingScaffold,
  formatSizingScaffoldMarkdown,
} from './sizing-scaffold.js';
export type {
  SizingScaffold,
  SizingComponent,
  CostEstimate,
  CapacityAssumption,
  NfrTarget,
  ScenarioHint,
} from './sizing-scaffold.js';
export {
  extractTimelineScaffold,
  formatTimelineScaffoldMarkdown,
} from './timeline-scaffold.js';
export type {
  TimelineScaffold,
  TimelinePhase,
  TimelineWorkPackage,
  TimelineMilestone,
  GanttTask,
  GanttMilestone,
  ExistingGantt,
  TransitionState,
  TimelineRisk,
  TimelineQuestion,
} from './timeline-scaffold.js';
