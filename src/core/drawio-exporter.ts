/**
 * Draw.io (diagrams.net) Exporter
 *
 * Pure module (zero vscode dependencies) that transforms a TOGAF-aligned
 * Obsidian vault into Draw.io XML files (.drawio), importable by
 * diagrams.net (desktop & web), Confluence, and VS Code Draw.io extension.
 *
 * Produces three diagrams:
 *   1. **As-Is Architecture** – Current/baseline state (all elements blue/default)
 *   2. **Target Architecture** – Future state (all elements blue/default)
 *   3. **Migration Architecture** – Overlay showing:
 *        - 🔴 Red   → Items to REMOVE (exist in As-Is but not in Target)
 *        - 🟢 Green → Items to ADD    (exist in Target but not in As-Is)
 *        - 🔵 Blue  → Items to KEEP   (exist in both)
 *
 * Reuses the ArchiMate model extraction from archimate-exporter.ts.
 *
 * @module drawio-exporter
 */

import type { VaultFile } from '../types.js';
import {
  extractModel,
  escapeXml,
  parseFrontMatter,
  parseTables,
  parseMermaidGraphs,
} from './archimate-exporter.js';
import type {
  ArchiModel,
  ArchiElement,
  ArchiRelationship,
  ArchiLayer,
} from './archimate-exporter.js';

// ────────────────────────────────────────────────────────────────────────────
// Public Types
// ────────────────────────────────────────────────────────────────────────────

/** Migration status for an architecture element */
export type MigrationStatus = 'keep' | 'add' | 'remove';

/** An element with its migration classification */
export interface DrawioElement {
  id: string;
  name: string;
  layer: ArchiLayer;
  type: string;
  documentation?: string;
  migrationStatus: MigrationStatus;
  source?: string;
}

/** A relationship with its migration classification */
export interface DrawioRelationship {
  id: string;
  sourceId: string;
  targetId: string;
  name?: string;
  migrationStatus: MigrationStatus;
}

/** Summary statistics from a Draw.io export */
export interface DrawioExportSummary {
  totalElements: number;
  totalRelationships: number;
  diagramCount: number;
  byMigrationStatus: Record<MigrationStatus, number>;
  byLayer: Record<string, number>;
  sourceFiles: string[];
}

/** Result of the full Draw.io export pipeline */
export interface DrawioExportResult {
  /** As-Is architecture diagram XML */
  asIsXml: string;
  /** Target architecture diagram XML */
  targetXml: string;
  /** Migration architecture diagram XML (color-coded) */
  migrationXml: string;
  /** Combined multi-page diagram XML (all three tabs in one file) */
  combinedXml: string;
  /** Export summary */
  summary: DrawioExportSummary;
  /** Underlying ArchiMate model */
  model: ArchiModel;
}

// ────────────────────────────────────────────────────────────────────────────
// Color & Style Constants
// ────────────────────────────────────────────────────────────────────────────

/** Color palette for migration status */
const COLORS = {
  keep: {
    fill: '#dae8fc',     // Light blue
    stroke: '#6c8ebf',   // Medium blue
    font: '#333333',
  },
  add: {
    fill: '#d5e8d4',     // Light green
    stroke: '#82b366',   // Medium green
    font: '#333333',
  },
  remove: {
    fill: '#f8cecc',     // Light red
    stroke: '#b85450',   // Medium red
    font: '#333333',
  },
} as const;

/** Layer colors for As-Is and Target diagrams (standard blue palette) */
const LAYER_COLORS: Record<string, { fill: string; stroke: string }> = {
  Business:       { fill: '#fff2cc', stroke: '#d6b656' },   // Yellow
  Application:    { fill: '#dae8fc', stroke: '#6c8ebf' },   // Blue
  Technology:     { fill: '#d5e8d4', stroke: '#82b366' },   // Green
  Motivation:     { fill: '#e1d5e7', stroke: '#9673a6' },   // Purple
  Strategy:       { fill: '#f8cecc', stroke: '#b85450' },   // Red
  Implementation: { fill: '#fff2cc', stroke: '#d6b656' },   // Yellow
};

const DEFAULT_LAYER_COLOR = { fill: '#f5f5f5', stroke: '#666666' };

// ────────────────────────────────────────────────────────────────────────────
// Layout Constants
// ────────────────────────────────────────────────────────────────────────────

const NODE_WIDTH = 200;
const NODE_HEIGHT = 60;
const HORIZONTAL_GAP = 40;
const VERTICAL_GAP = 30;
const LAYER_PADDING = 20;
const LAYER_HEADER_HEIGHT = 30;
const SWIMLANE_INITIAL_Y = 20;

// ────────────────────────────────────────────────────────────────────────────
// Internal ID counter
// ────────────────────────────────────────────────────────────────────────────

let _drawioIdCounter = 0;

function drawioId(prefix: string): string {
  _drawioIdCounter++;
  return `dio-${prefix}-${_drawioIdCounter.toString(36).padStart(6, '0')}`;
}

/** Reset for testing */
export function resetDrawioIdCounter(): void {
  _drawioIdCounter = 0;
}

// ────────────────────────────────────────────────────────────────────────────
// Migration Classification
// ────────────────────────────────────────────────────────────────────────────

/**
 * Classify vault elements into As-Is and Target sets based on:
 *   - Gap analysis tables (Baseline | Target | Gap columns)
 *   - Roadmap/migration plan phase references
 *   - YAML metadata status field
 *   - Explicit "Baseline" / "Target" / "As-Is" / "To-Be" headings
 *
 * Elements found only in "baseline" context → remove
 * Elements found only in "target" context → add
 * Elements found in both (or no explicit context) → keep
 */
export function classifyMigration(
  model: ArchiModel,
  files: VaultFile[]
): { elements: DrawioElement[]; relationships: DrawioRelationship[] } {
  // Sets of element names that appear in baseline-only or target-only contexts
  const baselineNames = new Set<string>();
  const targetNames = new Set<string>();
  const gapElements = new Map<string, MigrationStatus>(); // name → status

  for (const file of files) {
    const tables = parseTables(file.content);
    const content = file.content;

    // 1. Parse gap analysis tables: Baseline | Target | Gap | Action
    for (const table of tables) {
      for (const row of table) {
        if (row['Baseline'] && row['Target'] && row['Gap']) {
          const baseline = row['Baseline'].trim();
          const target = row['Target'].trim();
          const gap = row['Gap'].trim();

          if (baseline && baseline !== '-' && baseline !== 'N/A') {
            baselineNames.add(baseline);
          }
          if (target && target !== '-' && target !== 'N/A') {
            targetNames.add(target);
          }
          // The gap itself is something to add/change
          if (gap && gap !== '-' && gap !== 'N/A') {
            gapElements.set(gap, 'add');
          }
        }

        // Application portfolio: Status column (Retire → remove, New/Planned → add)
        const status = (row['Status'] || row['Lifecycle'] || '').toLowerCase();
        const name = row['Component'] || row['Application'] || row['Name'] || '';
        if (name) {
          if (/retire|decommission|sunset|phase.?out|remove|obsolete/i.test(status)) {
            gapElements.set(name, 'remove');
          } else if (/new|planned|proposed|emerging|future/i.test(status)) {
            gapElements.set(name, 'add');
          }
        }
      }
    }

    // 2. Detect section-based classification ("## As-Is" / "## Baseline" / "## Target" / "## To-Be")
    const sections = content.split(/^(#{1,3})\s+/m);
    let currentContext: 'baseline' | 'target' | 'neutral' = 'neutral';
    for (const section of sections) {
      if (/as.?is|baseline|current\s+state/i.test(section)) {
        currentContext = 'baseline';
      } else if (/to.?be|target|future\s+state/i.test(section)) {
        currentContext = 'target';
      } else if (/^#{1,3}/.test(section)) {
        currentContext = 'neutral';
      }
    }
  }

  // 3. Classify each element
  const elements: DrawioElement[] = model.elements.map((el) => {
    let status: MigrationStatus = 'keep';

    // Check explicit gap classification first
    if (gapElements.has(el.name)) {
      status = gapElements.get(el.name)!;
    }
    // Check if name appears in baseline-only or target-only
    else {
      const inBaseline = baselineNames.has(el.name) ||
        [...baselineNames].some((b) => el.name.toLowerCase().includes(b.toLowerCase()));
      const inTarget = targetNames.has(el.name) ||
        [...targetNames].some((t) => el.name.toLowerCase().includes(t.toLowerCase()));

      if (inBaseline && !inTarget) {
        status = 'remove';
      } else if (!inBaseline && inTarget) {
        status = 'add';
      }
      // else: keep (default — appears in both or no explicit classification)

      // Check element properties for status hints
      const elStatus = (el.properties?.['status'] || '').toLowerCase();
      if (/retire|decommission|remove|sunset/i.test(elStatus)) {
        status = 'remove';
      } else if (/new|planned|proposed|future/i.test(elStatus)) {
        status = 'add';
      }
    }

    // Gap-type elements are always "add" (they represent missing capabilities)
    if (el.type === 'Gap') {
      status = 'add';
    }

    return {
      id: el.id,
      name: el.name,
      layer: el.layer,
      type: el.type,
      documentation: el.documentation,
      migrationStatus: status,
      source: el.source,
    };
  });

  // 4. Classify relationships based on their connected elements
  const elementStatusMap = new Map(elements.map((e) => [e.id, e.migrationStatus]));

  const relationships: DrawioRelationship[] = model.relationships.map((rel) => {
    const srcStatus = elementStatusMap.get(rel.source) || 'keep';
    const tgtStatus = elementStatusMap.get(rel.target) || 'keep';

    let status: MigrationStatus = 'keep';
    if (srcStatus === 'remove' || tgtStatus === 'remove') {
      status = 'remove';
    } else if (srcStatus === 'add' || tgtStatus === 'add') {
      status = 'add';
    }

    return {
      id: rel.id,
      sourceId: rel.source,
      targetId: rel.target,
      name: rel.name,
      migrationStatus: status,
    };
  });

  return { elements, relationships };
}

// ────────────────────────────────────────────────────────────────────────────
// Draw.io XML Generation
// ────────────────────────────────────────────────────────────────────────────

interface LayoutResult {
  cellXml: string[];
  totalWidth: number;
  totalHeight: number;
}

/**
 * Layout elements in horizontal swimlanes grouped by ArchiMate layer.
 * Returns the Draw.io XML cells and total canvas dimensions.
 */
function layoutElements(
  elements: DrawioElement[],
  relationships: DrawioRelationship[],
  mode: 'as-is' | 'target' | 'migration'
): LayoutResult {
  const cells: string[] = [];

  // Group elements by layer
  const layerOrder: ArchiLayer[] = ['Motivation', 'Strategy', 'Business', 'Application', 'Technology', 'Implementation'];
  const grouped = new Map<ArchiLayer, DrawioElement[]>();
  for (const layer of layerOrder) {
    grouped.set(layer, []);
  }
  for (const el of elements) {
    const arr = grouped.get(el.layer);
    if (arr) arr.push(el);
  }

  // Filter for mode
  const filteredElements = mode === 'as-is'
    ? elements.filter((e) => e.migrationStatus !== 'add')      // As-Is: keep + remove (current state)
    : mode === 'target'
      ? elements.filter((e) => e.migrationStatus !== 'remove') // Target: keep + add (future state)
      : elements;                                               // Migration: all

  const filteredIds = new Set(filteredElements.map((e) => e.id));

  // Re-group after filtering
  const filteredGrouped = new Map<ArchiLayer, DrawioElement[]>();
  for (const layer of layerOrder) {
    filteredGrouped.set(layer, []);
  }
  for (const el of filteredElements) {
    const arr = filteredGrouped.get(el.layer);
    if (arr) arr.push(el);
  }

  let yOffset = SWIMLANE_INITIAL_Y;
  let maxWidth = 600; // minimum canvas width
  const elementPositions = new Map<string, { x: number; y: number }>();

  for (const layer of layerOrder) {
    const layerElements = filteredGrouped.get(layer) || [];
    if (layerElements.length === 0) continue;

    const cols = Math.max(1, Math.min(5, layerElements.length));
    const rows = Math.ceil(layerElements.length / cols);
    const swimlaneWidth = cols * (NODE_WIDTH + HORIZONTAL_GAP) + LAYER_PADDING * 2;
    const swimlaneHeight = rows * (NODE_HEIGHT + VERTICAL_GAP) + LAYER_HEADER_HEIGHT + LAYER_PADDING * 2;
    maxWidth = Math.max(maxWidth, swimlaneWidth + 40);

    // Swimlane (layer container)
    const layerColor = LAYER_COLORS[layer] || DEFAULT_LAYER_COLOR;
    const swimlaneId = drawioId('lane');
    cells.push(
      `      <mxCell id="${swimlaneId}" value="${escapeXml(layer)} Layer" ` +
      `style="swimlane;startSize=${LAYER_HEADER_HEIGHT};fillColor=${layerColor.fill};` +
      `strokeColor=${layerColor.stroke};rounded=1;arcSize=8;fontStyle=1;fontSize=13;" ` +
      `vertex="1" parent="1">` +
      `<mxGeometry x="20" y="${yOffset}" width="${swimlaneWidth}" height="${swimlaneHeight}" as="geometry" />` +
      `</mxCell>`
    );

    // Place elements inside the swimlane
    layerElements.forEach((el, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = LAYER_PADDING + col * (NODE_WIDTH + HORIZONTAL_GAP);
      const y = LAYER_HEADER_HEIGHT + LAYER_PADDING + row * (NODE_HEIGHT + VERTICAL_GAP);

      // Determine colors
      let fillColor: string;
      let strokeColor: string;
      let fontColor: string;
      let extraLabel = '';

      if (mode === 'migration') {
        const palette = COLORS[el.migrationStatus];
        fillColor = palette.fill;
        strokeColor = palette.stroke;
        fontColor = palette.font;
        if (el.migrationStatus === 'add') extraLabel = ' [NEW]';
        else if (el.migrationStatus === 'remove') extraLabel = ' [REMOVE]';
      } else {
        fillColor = layerColor.fill;
        strokeColor = layerColor.stroke;
        fontColor = '#333333';
      }

      const cellId = `cell-${el.id}`;
      const label = escapeXml(truncate(el.name, 40) + extraLabel);
      const tooltip = escapeXml(el.documentation || `${el.type} — ${el.layer} Layer`);

      cells.push(
        `      <mxCell id="${cellId}" value="${label}" ` +
        `style="rounded=1;whiteSpace=wrap;html=1;fillColor=${fillColor};` +
        `strokeColor=${strokeColor};fontColor=${fontColor};fontSize=11;arcSize=12;" ` +
        `vertex="1" parent="${swimlaneId}">` +
        `<mxGeometry x="${x}" y="${y}" width="${NODE_WIDTH}" height="${NODE_HEIGHT}" as="geometry" />` +
        `</mxCell>`
      );

      // Track absolute position for edge routing
      elementPositions.set(el.id, { x: 20 + x, y: yOffset + y });
    });

    yOffset += swimlaneHeight + VERTICAL_GAP;
  }

  // Edges (relationships)
  const filteredRelationships = relationships.filter(
    (r) => filteredIds.has(r.sourceId) && filteredIds.has(r.targetId)
  );

  for (const rel of filteredRelationships) {
    let edgeStyle = 'edgeStyle=orthogonalEdgeStyle;rounded=1;';
    if (mode === 'migration') {
      const palette = COLORS[rel.migrationStatus];
      edgeStyle += `strokeColor=${palette.stroke};`;
      if (rel.migrationStatus === 'remove') {
        edgeStyle += 'dashed=1;dashPattern=8 4;';
      }
    } else {
      edgeStyle += 'strokeColor=#666666;';
    }

    const edgeId = drawioId('edge');
    const label = rel.name ? escapeXml(truncate(rel.name, 30)) : '';
    cells.push(
      `      <mxCell id="${edgeId}" value="${label}" ` +
      `style="${edgeStyle}fontSize=9;" ` +
      `edge="1" parent="1" source="cell-${rel.sourceId}" target="cell-${rel.targetId}">` +
      `<mxGeometry relative="1" as="geometry" />` +
      `</mxCell>`
    );
  }

  return { cellXml: cells, totalWidth: maxWidth + 40, totalHeight: yOffset + 40 };
}

/**
 * Build a Draw.io legend explaining colors (only for migration diagram).
 */
function buildLegend(x: number, y: number): string[] {
  const cells: string[] = [];
  const legendId = drawioId('legend');

  cells.push(
    `      <mxCell id="${legendId}" value="Legend" ` +
    `style="swimlane;startSize=24;fillColor=#f5f5f5;strokeColor=#666666;rounded=1;fontSize=12;fontStyle=1;" ` +
    `vertex="1" parent="1">` +
    `<mxGeometry x="${x}" y="${y}" width="260" height="140" as="geometry" />` +
    `</mxCell>`
  );

  // Keep (Blue)
  cells.push(
    `      <mxCell id="${drawioId('lgnd')}" value="KEEP (unchanged)" ` +
    `style="rounded=1;whiteSpace=wrap;html=1;fillColor=${COLORS.keep.fill};` +
    `strokeColor=${COLORS.keep.stroke};fontSize=10;" ` +
    `vertex="1" parent="${legendId}">` +
    `<mxGeometry x="10" y="34" width="110" height="30" as="geometry" />` +
    `</mxCell>`
  );

  // Add (Green)
  cells.push(
    `      <mxCell id="${drawioId('lgnd')}" value="ADD (new)" ` +
    `style="rounded=1;whiteSpace=wrap;html=1;fillColor=${COLORS.add.fill};` +
    `strokeColor=${COLORS.add.stroke};fontSize=10;" ` +
    `vertex="1" parent="${legendId}">` +
    `<mxGeometry x="130" y="34" width="110" height="30" as="geometry" />` +
    `</mxCell>`
  );

  // Remove (Red)
  cells.push(
    `      <mxCell id="${drawioId('lgnd')}" value="REMOVE (retire)" ` +
    `style="rounded=1;whiteSpace=wrap;html=1;fillColor=${COLORS.remove.fill};` +
    `strokeColor=${COLORS.remove.stroke};fontSize=10;" ` +
    `vertex="1" parent="${legendId}">` +
    `<mxGeometry x="10" y="74" width="110" height="30" as="geometry" />` +
    `</mxCell>`
  );

  // Dashed edge
  cells.push(
    `      <mxCell id="${drawioId('lgnd')}" value="Removed link (dashed)" ` +
    `style="rounded=1;whiteSpace=wrap;html=1;fillColor=#f5f5f5;` +
    `strokeColor=${COLORS.remove.stroke};dashed=1;dashPattern=8 4;fontSize=10;" ` +
    `vertex="1" parent="${legendId}">` +
    `<mxGeometry x="130" y="74" width="110" height="30" as="geometry" />` +
    `</mxCell>`
  );

  return cells;
}

/**
 * Wrap cell XML into a complete Draw.io XML document (single page).
 */
function wrapInDrawioXml(
  pageName: string,
  cells: string[],
  width: number,
  height: number
): string {
  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<mxfile host="archipilot" modified="' + new Date().toISOString() + '" type="device">');
  lines.push(`  <diagram name="${escapeXml(pageName)}" id="${drawioId('diag')}">`);
  lines.push('    <mxGraphModel dx="1024" dy="768" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="' + Math.max(width, 800) + '" pageHeight="' + Math.max(height, 600) + '">');
  lines.push('      <root>');
  lines.push('      <mxCell id="0" />');
  lines.push('      <mxCell id="1" parent="0" />');
  lines.push(cells.join('\n'));
  lines.push('      </root>');
  lines.push('    </mxGraphModel>');
  lines.push('  </diagram>');
  lines.push('</mxfile>');
  return lines.join('\n');
}

/**
 * Wrap multiple pages into a single multi-tab Draw.io XML file.
 */
function wrapMultiPageDrawioXml(
  pages: Array<{ name: string; cells: string[]; width: number; height: number }>
): string {
  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<mxfile host="archipilot" modified="' + new Date().toISOString() + '" type="device">');

  for (const page of pages) {
    lines.push(`  <diagram name="${escapeXml(page.name)}" id="${drawioId('diag')}">`);
    lines.push('    <mxGraphModel dx="1024" dy="768" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="' + Math.max(page.width, 800) + '" pageHeight="' + Math.max(page.height, 600) + '">');
    lines.push('      <root>');
    lines.push('      <mxCell id="0" />');
    lines.push('      <mxCell id="1" parent="0" />');
    lines.push(page.cells.join('\n'));
    lines.push('      </root>');
    lines.push('    </mxGraphModel>');
    lines.push('  </diagram>');
  }

  lines.push('</mxfile>');
  return lines.join('\n');
}

// ────────────────────────────────────────────────────────────────────────────
// Utility
// ────────────────────────────────────────────────────────────────────────────

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}

// ────────────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────────────

/**
 * Export vault files to Draw.io diagrams.
 *
 * Produces three diagrams:
 *   - As-Is Architecture (current state, elements that will be removed or kept)
 *   - Target Architecture (future state, elements that will be added or kept)
 *   - Migration Architecture (all elements, color-coded by migration status)
 *
 * Returns individual XML strings plus a combined multi-tab file.
 */
export function exportToDrawio(files: VaultFile[], vaultName?: string): DrawioExportResult {
  resetDrawioIdCounter();

  // 1. Extract the ArchiMate model (reuses existing extraction logic)
  const model = extractModel(files, vaultName);

  // 2. Classify elements into migration statuses
  const { elements, relationships } = classifyMigration(model, files);

  // 3. Generate As-Is diagram
  resetDrawioIdCounter();
  const asIsLayout = layoutElements(elements, relationships, 'as-is');
  const asIsXml = wrapInDrawioXml(
    'As-Is Architecture',
    asIsLayout.cellXml,
    asIsLayout.totalWidth,
    asIsLayout.totalHeight
  );

  // 4. Generate Target diagram
  resetDrawioIdCounter();
  const targetLayout = layoutElements(elements, relationships, 'target');
  const targetXml = wrapInDrawioXml(
    'Target Architecture',
    targetLayout.cellXml,
    targetLayout.totalWidth,
    targetLayout.totalHeight
  );

  // 5. Generate Migration diagram (with legend)
  resetDrawioIdCounter();
  const migrationLayout = layoutElements(elements, relationships, 'migration');
  const legendCells = buildLegend(migrationLayout.totalWidth - 280, 20);
  const migrationCells = [...migrationLayout.cellXml, ...legendCells];
  const migrationXml = wrapInDrawioXml(
    'Migration Architecture',
    migrationCells,
    migrationLayout.totalWidth,
    migrationLayout.totalHeight
  );

  // 6. Combined multi-tab file
  resetDrawioIdCounter();
  const asIsLayout2 = layoutElements(elements, relationships, 'as-is');
  resetDrawioIdCounter();
  const targetLayout2 = layoutElements(elements, relationships, 'target');
  resetDrawioIdCounter();
  const migrationLayout2 = layoutElements(elements, relationships, 'migration');
  const legendCells2 = buildLegend(migrationLayout2.totalWidth - 280, 20);

  const combinedXml = wrapMultiPageDrawioXml([
    {
      name: 'As-Is Architecture',
      cells: asIsLayout2.cellXml,
      width: asIsLayout2.totalWidth,
      height: asIsLayout2.totalHeight,
    },
    {
      name: 'Target Architecture',
      cells: targetLayout2.cellXml,
      width: targetLayout2.totalWidth,
      height: targetLayout2.totalHeight,
    },
    {
      name: 'Migration Architecture',
      cells: [...migrationLayout2.cellXml, ...legendCells2],
      width: migrationLayout2.totalWidth,
      height: migrationLayout2.totalHeight,
    },
  ]);

  // 7. Summary
  const summary = generateDrawioSummary(elements, relationships);

  return {
    asIsXml,
    targetXml,
    migrationXml,
    combinedXml,
    summary,
    model,
  };
}

/**
 * Generate a summary of the Draw.io export.
 */
export function generateDrawioSummary(
  elements: DrawioElement[],
  relationships: DrawioRelationship[]
): DrawioExportSummary {
  const byMigrationStatus: Record<MigrationStatus, number> = { keep: 0, add: 0, remove: 0 };
  const byLayer: Record<string, number> = {};
  const sourceFiles = new Set<string>();

  for (const el of elements) {
    byMigrationStatus[el.migrationStatus]++;
    byLayer[el.layer] = (byLayer[el.layer] || 0) + 1;
    if (el.source) sourceFiles.add(el.source);
  }

  return {
    totalElements: elements.length,
    totalRelationships: relationships.length,
    diagramCount: 3,
    byMigrationStatus,
    byLayer,
    sourceFiles: [...sourceFiles].sort(),
  };
}

/**
 * Format Draw.io export summary as Markdown for display in chat.
 */
export function formatDrawioSummaryMarkdown(summary: DrawioExportSummary): string {
  const lines: string[] = [];
  lines.push('## 📊 Draw.io Export Summary\n');

  lines.push('| Metric | Count |');
  lines.push('|--------|------:|');
  lines.push(`| Total Elements | ${summary.totalElements} |`);
  lines.push(`| Total Relationships | ${summary.totalRelationships} |`);
  lines.push(`| Diagrams Generated | ${summary.diagramCount} |`);

  lines.push('\n### Migration Classification\n');
  lines.push('| Status | Elements | Description |');
  lines.push('|--------|--------:|-------------|');
  lines.push(`| 🔵 Keep | ${summary.byMigrationStatus.keep} | Unchanged between As-Is and Target |`);
  lines.push(`| 🟢 Add | ${summary.byMigrationStatus.add} | New in Target Architecture |`);
  lines.push(`| 🔴 Remove | ${summary.byMigrationStatus.remove} | Retired from As-Is Architecture |`);

  lines.push('\n### By Layer\n');
  lines.push('| Layer | Elements |');
  lines.push('|-------|--------:|');
  for (const [layer, count] of Object.entries(summary.byLayer).sort(([, a], [, b]) => b - a)) {
    lines.push(`| ${layer} | ${count} |`);
  }

  lines.push('\n### Diagrams Produced\n');
  lines.push('1. **As-Is Architecture** — Current state (baseline elements)');
  lines.push('2. **Target Architecture** — Future state (target elements)');
  lines.push('3. **Migration Architecture** — Color-coded overlay:');
  lines.push('   - 🔴 Red = Remove   🟢 Green = Add   🔵 Blue = Keep');

  lines.push('\n### Source Files\n');
  for (const f of summary.sourceFiles) {
    lines.push(`- \`${f}\``);
  }

  return lines.join('\n');
}
