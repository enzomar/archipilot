/**
 * ArchiMate Open Exchange Format (OEFF) 3.2 Exporter
 *
 * Pure module (zero vscode dependencies) that transforms a TOGAF-aligned
 * Obsidian vault into a standards-compliant ArchiMate 3.2 XML file,
 * importable by Archi, BiZZdesign, Sparx EA, and other modelling tools.
 *
 * Mapping strategy:
 *   TOGAF Phase B  → Business Layer
 *   TOGAF Phase C  → Application Layer
 *   TOGAF Phase D  → Technology Layer
 *   TOGAF Phase E  → Implementation & Migration
 *   Preliminary    → Strategy & Motivation (Principles)
 *   Requirements   → Motivation (Requirements, Constraints)
 *   Decision Log   → Motivation (Assessments)
 *   Risk Register  → Motivation (Assessments)
 *   Stakeholders   → Motivation (Stakeholders)
 *
 * @module archimate-exporter
 */

import type { VaultFile } from '../types.js';

// ────────────────────────────────────────────────────────────────────────────
// Public Types
// ────────────────────────────────────────────────────────────────────────────

/** ArchiMate 3.2 element layer */
export type ArchiLayer =
  | 'Business'
  | 'Application'
  | 'Technology'
  | 'Motivation'
  | 'Strategy'
  | 'Implementation';

/** ArchiMate 3.2 element type (subset most relevant to TOGAF vaults) */
export type ArchiElementType =
  // Business Layer
  | 'BusinessActor'
  | 'BusinessRole'
  | 'BusinessProcess'
  | 'BusinessService'
  | 'BusinessObject'
  | 'BusinessFunction'
  | 'BusinessEvent'
  | 'BusinessCollaboration'
  // Application Layer
  | 'ApplicationComponent'
  | 'ApplicationService'
  | 'ApplicationInterface'
  | 'ApplicationFunction'
  | 'DataObject'
  // Technology Layer
  | 'Node'
  | 'SystemSoftware'
  | 'Artifact'
  | 'TechnologyService'
  | 'TechnologyInterface'
  | 'CommunicationNetwork'
  | 'Device'
  // Motivation
  | 'Stakeholder'
  | 'Principle'
  | 'Requirement'
  | 'Constraint'
  | 'Goal'
  | 'Assessment'
  | 'Driver'
  | 'Value'
  // Strategy
  | 'Resource'
  | 'Capability'
  | 'CourseOfAction'
  // Implementation & Migration
  | 'WorkPackage'
  | 'Deliverable'
  | 'Plateau'
  | 'Gap';

/** ArchiMate 3.2 relationship type */
export type ArchiRelationshipType =
  | 'CompositionRelationship'
  | 'AggregationRelationship'
  | 'AssignmentRelationship'
  | 'RealizationRelationship'
  | 'ServingRelationship'
  | 'AccessRelationship'
  | 'InfluenceRelationship'
  | 'TriggeringRelationship'
  | 'FlowRelationship'
  | 'SpecializationRelationship'
  | 'AssociationRelationship';

/** A single ArchiMate element */
export interface ArchiElement {
  id: string;
  type: ArchiElementType;
  name: string;
  documentation?: string;
  layer: ArchiLayer;
  /** Source vault file that originated this element */
  source?: string;
  properties?: Record<string, string>;
}

/** A relationship between two ArchiMate elements */
export interface ArchiRelationship {
  id: string;
  type: ArchiRelationshipType;
  name?: string;
  source: string; // element id
  target: string; // element id
  documentation?: string;
}

/** A node within an ArchiMate view (position/size on canvas) */
export interface ArchiViewNode {
  elementRef: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A connection (edge) within an ArchiMate view */
export interface ArchiViewConnection {
  relationshipRef: string;
  sourceRef: string;
  targetRef: string;
}

/** An ArchiMate view (diagram) */
export interface ArchiView {
  id: string;
  name: string;
  viewpoint?: string;
  nodes: ArchiViewNode[];
  connections: ArchiViewConnection[];
}

/** The complete ArchiMate model produced from a vault */
export interface ArchiModel {
  name: string;
  documentation?: string;
  elements: ArchiElement[];
  relationships: ArchiRelationship[];
  views: ArchiView[];
  metadata: {
    exportedAt: string;
    vaultPath?: string;
    vaultFileCount: number;
    generatorVersion: string;
  };
}

/** Summary statistics from an export */
export interface ArchiExportSummary {
  totalElements: number;
  totalRelationships: number;
  totalViews: number;
  byLayer: Record<string, number>;
  byType: Record<string, number>;
  sourceFiles: string[];
}

// ────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ────────────────────────────────────────────────────────────────────────────

let _idCounter = 0;

/** Generate a deterministic-style identifier */
function newId(prefix: string): string {
  _idCounter++;
  return `id-${prefix}-${_idCounter.toString(36).padStart(6, '0')}`;
}

/** Reset the ID counter (useful for testing reproducibility) */
export function resetIdCounter(): void {
  _idCounter = 0;
}

/** Escape special characters for XML */
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Parse YAML front-matter from a markdown file */
export function parseFrontMatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const yaml: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const colon = line.indexOf(':');
    if (colon > 0) {
      const key = line.slice(0, colon).trim();
      const val = line.slice(colon + 1).trim().replace(/^["']|["']$/g, '');
      if (key && val) yaml[key] = val;
    }
  }
  return yaml;
}

/** Row type from a parsed markdown table */
export interface TableRow {
  [column: string]: string;
}

/** Parse markdown tables into arrays of key-value rows */
export function parseTables(content: string): TableRow[][] {
  const tables: TableRow[][] = [];
  const lines = content.split('\n');

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    // Detect a table header row: starts/ends with | and contains at least one |
    if (line.startsWith('|') && line.endsWith('|') && line.split('|').length >= 3) {
      // Next line should be the separator (---|---)
      const nextLine = (lines[i + 1] || '').trim();
      if (nextLine.startsWith('|') && /^[\s|:-]+$/.test(nextLine)) {
        // Parse headers
        const headers = line
          .split('|')
          .map((h) => h.trim())
          .filter(Boolean);
        const rows: TableRow[] = [];

        // Parse data rows
        let j = i + 2;
        while (j < lines.length) {
          const dataLine = lines[j].trim();
          if (!dataLine.startsWith('|') || !dataLine.endsWith('|')) break;
          const cells = dataLine
            .split('|')
            .map((c) => c.trim())
            .filter((_, idx, arr) => idx > 0 && idx < arr.length); // trim leading/trailing empty splits
          if (cells.length === 0) break;

          const row: TableRow = {};
          for (let k = 0; k < headers.length; k++) {
            row[headers[k]] = cells[k] || '';
          }
          rows.push(row);
          j++;
        }

        if (rows.length > 0) {
          tables.push(rows);
        }
        i = j;
        continue;
      }
    }
    i++;
  }
  return tables;
}

/** Edge type from parsed Mermaid graphs */
export interface MermaidEdge {
  from: string;
  to: string;
  label?: string;
}

/** Node type from parsed Mermaid graphs */
export interface MermaidNode {
  id: string;
  label: string;
  subgraph?: string;
}

/** Parse Mermaid graph TD / graph LR diagrams */
export function parseMermaidGraphs(content: string): { nodes: MermaidNode[]; edges: MermaidEdge[] }[] {
  const graphs: { nodes: MermaidNode[]; edges: MermaidEdge[] }[] = [];

  // Match ```mermaid ... ``` blocks
  const mermaidBlocks = content.matchAll(/```mermaid\s*\n([\s\S]*?)```/g);

  for (const block of mermaidBlocks) {
    const body = block[1];
    if (!/graph\s+(TD|LR|TB|RL|BT)/i.test(body)) continue;

    const nodes: MermaidNode[] = [];
    const edges: MermaidEdge[] = [];
    const nodeSet = new Set<string>();
    let currentSubgraph: string | undefined;

    for (const line of body.split('\n')) {
      const trimmed = line.trim();

      // Subgraph detection
      const subMatch = trimmed.match(/^subgraph\s+(.+)/i);
      if (subMatch) {
        currentSubgraph = subMatch[1].trim();
        continue;
      }
      if (/^\s*end\s*$/i.test(trimmed)) {
        currentSubgraph = undefined;
        continue;
      }

      // Edge patterns:  A --> B,  A -->|label| B,  A -- label --> B
      const edgeMatch = trimmed.match(
        /^([A-Za-z0-9_]+)(?:\[.*?\])?\s*--+(?:>|\|([^|]*)\|>?)\s*(?:\|([^|]*)\|)?\s*([A-Za-z0-9_]+)(?:\[.*?\])?/
      );
      if (edgeMatch) {
        const from = edgeMatch[1];
        const to = edgeMatch[4];
        const label = edgeMatch[2] || edgeMatch[3] || undefined;
        edges.push({ from, to, label });

        // Register nodes
        for (const nid of [from, to]) {
          if (!nodeSet.has(nid)) {
            nodeSet.add(nid);
            nodes.push({ id: nid, label: nid, subgraph: currentSubgraph });
          }
        }
        continue;
      }

      // Standalone node definition:  A["Label"]  or  A[Label]
      const nodeMatch = trimmed.match(/^([A-Za-z0-9_]+)\[["']?([^"\]]+)["']?\]/);
      if (nodeMatch && !nodeSet.has(nodeMatch[1])) {
        nodeSet.add(nodeMatch[1]);
        nodes.push({ id: nodeMatch[1], label: nodeMatch[2], subgraph: currentSubgraph });
      }
    }

    if (nodes.length > 0 || edges.length > 0) {
      graphs.push({ nodes, edges });
    }
  }

  return graphs;
}

// ────────────────────────────────────────────────────────────────────────────
// Phase-specific extractors
// ────────────────────────────────────────────────────────────────────────────

function extractStakeholders(file: VaultFile, elements: ArchiElement[], relationships: ArchiRelationship[]): void {
  const tables = parseTables(file.content);
  for (const table of tables) {
    for (const row of table) {
      const name = row['Stakeholder'] || row['Name'] || row['Actor'];
      if (!name) continue;
      const role = row['Role'] || '';
      elements.push({
        id: newId('stkh'),
        type: 'Stakeholder',
        name,
        documentation: role ? `Role: ${role}` : undefined,
        layer: 'Motivation',
        source: file.name,
        properties: {
          ...(row['Interest'] ? { interest: row['Interest'] } : {}),
          ...(row['Influence'] ? { influence: row['Influence'] } : {}),
          ...(row['Concern'] ? { concern: row['Concern'] } : {}),
        },
      });
    }
  }
  // Create driver elements from stakeholder concerns
  const stakeholderEls = elements.filter((e) => e.source === file.name && e.type === 'Stakeholder');
  for (const stkh of stakeholderEls) {
    if (stkh.properties?.['concern']) {
      const driverId = newId('drv');
      elements.push({
        id: driverId,
        type: 'Driver',
        name: stkh.properties['concern'],
        layer: 'Motivation',
        source: file.name,
      });
      relationships.push({
        id: newId('rel'),
        type: 'AssociationRelationship',
        source: stkh.id,
        target: driverId,
        name: 'has concern',
      });
    }
  }
}

function extractPrinciples(file: VaultFile, elements: ArchiElement[], relationships: ArchiRelationship[]): void {
  const tables = parseTables(file.content);
  for (const table of tables) {
    for (const row of table) {
      const name = row['Principle'] || row['Name'];
      const id_str = row['ID'] || row['Id'];
      if (!name) continue;
      elements.push({
        id: newId('prin'),
        type: 'Principle',
        name: id_str ? `${id_str}: ${name}` : name,
        documentation: row['Rationale'] || row['Description'] || undefined,
        layer: 'Motivation',
        source: file.name,
        properties: {
          ...(row['Implications'] ? { implications: row['Implications'] } : {}),
        },
      });
    }
  }

  // Also extract principles from markdown headings (### P-xx: Name)
  const headingPrinciples = file.content.matchAll(/^#{2,4}\s+(P-\d+)[\s:]+(.+)/gm);
  for (const m of headingPrinciples) {
    const existing = elements.find((e) => e.name.startsWith(m[1]));
    if (!existing) {
      elements.push({
        id: newId('prin'),
        type: 'Principle',
        name: `${m[1]}: ${m[2].trim()}`,
        layer: 'Motivation',
        source: file.name,
      });
    }
  }
}

function extractBusinessArchitecture(
  file: VaultFile,
  elements: ArchiElement[],
  relationships: ArchiRelationship[]
): void {
  const tables = parseTables(file.content);
  const graphs = parseMermaidGraphs(file.content);

  // Extract from tables — look for process / capability / service tables
  for (const table of tables) {
    for (const row of table) {
      // Business capabilities
      if (row['Capability'] || row['Business Capability']) {
        const name = row['Capability'] || row['Business Capability'];
        elements.push({
          id: newId('bcap'),
          type: 'Capability',
          name,
          documentation: row['Description'] || undefined,
          layer: 'Strategy',
          source: file.name,
        });
        continue;
      }
      // Business processes
      if (row['Process'] || row['Business Process']) {
        const name = row['Process'] || row['Business Process'];
        elements.push({
          id: newId('bprc'),
          type: 'BusinessProcess',
          name,
          documentation: row['Description'] || undefined,
          layer: 'Business',
          source: file.name,
        });
        continue;
      }
      // Gap analysis (Baseline | Target | Gap | Action)
      if (row['Baseline'] && row['Target'] && row['Gap']) {
        // Create a Gap element
        elements.push({
          id: newId('gap'),
          type: 'Gap',
          name: row['Gap'],
          documentation: `Baseline: ${row['Baseline']} → Target: ${row['Target']}. Action: ${row['Action'] || 'TBD'}`,
          layer: 'Implementation',
          source: file.name,
        });
      }
      // Generic: if row has columns like Scenario, Function, Service
      if (row['Scenario']) {
        elements.push({
          id: newId('bscn'),
          type: 'BusinessEvent',
          name: row['Scenario'],
          documentation: row['Description'] || row['Outcome'] || undefined,
          layer: 'Business',
          source: file.name,
        });
      }
      if (row['Function'] || row['Business Function']) {
        const name = row['Function'] || row['Business Function'];
        elements.push({
          id: newId('bfn'),
          type: 'BusinessFunction',
          name,
          documentation: row['Description'] || undefined,
          layer: 'Business',
          source: file.name,
        });
      }
    }
  }

  // Extract from Mermaid graphs
  for (const graph of graphs) {
    for (const node of graph.nodes) {
      const existing = elements.find((e) => e.name === node.label && e.source === file.name);
      if (!existing) {
        elements.push({
          id: newId('bnode'),
          type: 'BusinessProcess',
          name: node.label,
          layer: 'Business',
          source: file.name,
        });
      }
    }
    // Edges → TriggeringRelationship between business processes
    for (const edge of graph.edges) {
      const fromEl = elements.find((e) => e.name === edge.from || e.name === edge.from.replace(/_/g, ' '));
      const toEl = elements.find((e) => e.name === edge.to || e.name === edge.to.replace(/_/g, ' '));
      if (fromEl && toEl) {
        relationships.push({
          id: newId('rel'),
          type: 'TriggeringRelationship',
          source: fromEl.id,
          target: toEl.id,
          name: edge.label,
        });
      }
    }
  }
}

function extractApplicationArchitecture(
  file: VaultFile,
  elements: ArchiElement[],
  relationships: ArchiRelationship[]
): void {
  const tables = parseTables(file.content);
  const graphs = parseMermaidGraphs(file.content);

  // Extract from tables
  for (const table of tables) {
    for (const row of table) {
      // Application components (Component | Purpose | Interfaces | Owner)
      if (row['Component'] || row['Application']) {
        const name = row['Component'] || row['Application'];
        const compId = newId('acomp');
        elements.push({
          id: compId,
          type: 'ApplicationComponent',
          name,
          documentation: row['Purpose'] || row['Description'] || undefined,
          layer: 'Application',
          source: file.name,
          properties: {
            ...(row['Owner'] ? { owner: row['Owner'] } : {}),
            ...(row['Status'] ? { status: row['Status'] } : {}),
          },
        });

        // Create interfaces if listed
        if (row['Interfaces'] || row['Interface']) {
          const ifaces = (row['Interfaces'] || row['Interface']).split(/[,;]/);
          for (const iface of ifaces) {
            const ifaceName = iface.trim();
            if (!ifaceName) continue;
            const ifaceId = newId('aifc');
            elements.push({
              id: ifaceId,
              type: 'ApplicationInterface',
              name: ifaceName,
              layer: 'Application',
              source: file.name,
            });
            relationships.push({
              id: newId('rel'),
              type: 'CompositionRelationship',
              source: compId,
              target: ifaceId,
            });
          }
        }
        continue;
      }

      // Data objects
      if (row['Data Object'] || row['Entity'] || row['Data Entity']) {
        const name = row['Data Object'] || row['Entity'] || row['Data Entity'];
        elements.push({
          id: newId('dobj'),
          type: 'DataObject',
          name,
          documentation: row['Description'] || undefined,
          layer: 'Application',
          source: file.name,
        });
        continue;
      }

      // Application services
      if (row['Service'] || row['Application Service']) {
        const name = row['Service'] || row['Application Service'];
        elements.push({
          id: newId('asvc'),
          type: 'ApplicationService',
          name,
          documentation: row['Description'] || undefined,
          layer: 'Application',
          source: file.name,
        });
      }

      // Gap analysis
      if (row['Baseline'] && row['Target'] && row['Gap']) {
        elements.push({
          id: newId('gap'),
          type: 'Gap',
          name: row['Gap'],
          documentation: `Baseline: ${row['Baseline']} → Target: ${row['Target']}. Action: ${row['Action'] || 'TBD'}`,
          layer: 'Implementation',
          source: file.name,
        });
      }
    }
  }

  // Extract from Mermaid graphs — nodes become ApplicationComponents
  for (const graph of graphs) {
    for (const node of graph.nodes) {
      const existing = elements.find((e) => e.name === node.label && e.source === file.name);
      if (!existing) {
        elements.push({
          id: newId('anode'),
          type: 'ApplicationComponent',
          name: node.label,
          layer: 'Application',
          source: file.name,
          properties: node.subgraph ? { group: node.subgraph } : undefined,
        });
      }
    }
    for (const edge of graph.edges) {
      const fromEl = elements.find(
        (e) => (e.name === edge.from || e.name === edge.from.replace(/_/g, ' ')) && e.source === file.name
      );
      const toEl = elements.find(
        (e) => (e.name === edge.to || e.name === edge.to.replace(/_/g, ' ')) && e.source === file.name
      );
      if (fromEl && toEl) {
        relationships.push({
          id: newId('rel'),
          type: 'FlowRelationship',
          source: fromEl.id,
          target: toEl.id,
          name: edge.label,
        });
      }
    }
  }
}

function extractTechnologyArchitecture(
  file: VaultFile,
  elements: ArchiElement[],
  relationships: ArchiRelationship[]
): void {
  const tables = parseTables(file.content);
  const graphs = parseMermaidGraphs(file.content);

  for (const table of tables) {
    for (const row of table) {
      // Platform / technology components
      if (row['Component'] || row['Technology'] || row['Platform']) {
        const name = row['Component'] || row['Platform'];
        const tech = row['Technology'] || '';
        const nodeId = newId('tnode');

        // Decide type: if tech contains keywords, map to more specific type
        let type: ArchiElementType = 'Node';
        const techLower = (tech + ' ' + name).toLowerCase();
        if (/kubernetes|docker|container|k8s/i.test(techLower)) type = 'SystemSoftware';
        else if (/database|postgres|mysql|redis|mongo|dynamo|rds/i.test(techLower)) type = 'SystemSoftware';
        else if (/api|gateway|load.?balancer|cdn|cloudfront/i.test(techLower)) type = 'TechnologyService';
        else if (/network|vpc|subnet|firewall|dns/i.test(techLower)) type = 'CommunicationNetwork';
        else if (/server|instance|vm|ec2|compute/i.test(techLower)) type = 'Device';

        elements.push({
          id: nodeId,
          type,
          name: name || tech,
          documentation: row['Description'] || undefined,
          layer: 'Technology',
          source: file.name,
          properties: {
            ...(tech ? { technology: tech } : {}),
            ...(row['Environment'] ? { environment: row['Environment'] } : {}),
            ...(row['Scaling'] ? { scaling: row['Scaling'] } : {}),
            ...(row['SLA'] ? { sla: row['SLA'] } : {}),
          },
        });
        continue;
      }

      // Standards
      if (row['Standard'] || row['Technology Standard']) {
        const name = row['Standard'] || row['Technology Standard'];
        elements.push({
          id: newId('tstd'),
          type: 'Constraint',
          name,
          documentation: row['Rationale'] || row['Description'] || undefined,
          layer: 'Motivation',
          source: file.name,
        });
      }

      // Gap analysis
      if (row['Baseline'] && row['Target'] && row['Gap']) {
        elements.push({
          id: newId('gap'),
          type: 'Gap',
          name: row['Gap'],
          documentation: `Baseline: ${row['Baseline']} → Target: ${row['Target']}. Action: ${row['Action'] || 'TBD'}`,
          layer: 'Implementation',
          source: file.name,
        });
      }
    }
  }

  // Mermaid deployment diagrams
  for (const graph of graphs) {
    for (const node of graph.nodes) {
      const existing = elements.find((e) => e.name === node.label && e.source === file.name);
      if (!existing) {
        elements.push({
          id: newId('tgnode'),
          type: 'Node',
          name: node.label,
          layer: 'Technology',
          source: file.name,
          properties: node.subgraph ? { environment: node.subgraph } : undefined,
        });
      }
    }
    for (const edge of graph.edges) {
      const fromEl = elements.find((e) => e.name === edge.from && e.source === file.name);
      const toEl = elements.find((e) => e.name === edge.to && e.source === file.name);
      if (fromEl && toEl) {
        relationships.push({
          id: newId('rel'),
          type: 'ServingRelationship',
          source: fromEl.id,
          target: toEl.id,
          name: edge.label,
        });
      }
    }
  }
}

function extractSolutionsBuildingBlocks(
  file: VaultFile,
  elements: ArchiElement[],
  relationships: ArchiRelationship[],
  allElements: ArchiElement[]
): void {
  const tables = parseTables(file.content);

  for (const table of tables) {
    for (const row of table) {
      // ABB → SBB mapping
      if (row['ABB'] && row['SBB']) {
        const abbName = row['ABB'];
        const sbbName = row['SBB'];

        // SBB as a Deliverable / WorkPackage
        const sbbId = newId('sbb');
        elements.push({
          id: sbbId,
          type: 'Deliverable',
          name: sbbName,
          documentation: row['Vendor'] ? `Vendor: ${row['Vendor']}` : undefined,
          layer: 'Implementation',
          source: file.name,
          properties: {
            ...(row['Buy/Build'] ? { acquisition: row['Buy/Build'] } : {}),
            ...(row['Status'] ? { status: row['Status'] } : {}),
            ...(row['Vendor'] ? { vendor: row['Vendor'] } : {}),
          },
        });

        // Find or create the ABB (it may exist as an ApplicationComponent or Node)
        let abbEl = allElements.find(
          (e) => e.name === abbName || e.name.includes(abbName)
        );
        if (!abbEl) {
          abbEl = {
            id: newId('abb'),
            type: 'ApplicationComponent',
            name: abbName,
            layer: 'Application',
            source: file.name,
          };
          elements.push(abbEl);
        }

        // SBB realizes ABB
        relationships.push({
          id: newId('rel'),
          type: 'RealizationRelationship',
          source: sbbId,
          target: abbEl.id,
          name: `${sbbName} realizes ${abbName}`,
        });
        continue;
      }

      // Build vs Buy analysis
      if (row['Option'] && (row['Buy/Build'] || row['Type'])) {
        const name = row['Option'];
        elements.push({
          id: newId('coa'),
          type: 'CourseOfAction',
          name,
          documentation: row['Rationale'] || row['Pros'] || undefined,
          layer: 'Strategy',
          source: file.name,
        });
      }
    }
  }
}

function extractRequirements(file: VaultFile, elements: ArchiElement[], relationships: ArchiRelationship[]): void {
  const tables = parseTables(file.content);

  for (const table of tables) {
    for (const row of table) {
      // Functional / non-functional requirements
      const reqId = row['ID'] || row['Id'] || row['Req ID'];
      const name =
        row['Requirement'] || row['Name'] || row['Description'] || row['Title'];
      if (!name) continue;

      const type: ArchiElementType =
        row['Type']?.toLowerCase() === 'nfr' || row['Category']?.toLowerCase() === 'nfr'
          ? 'Constraint'
          : 'Requirement';

      elements.push({
        id: newId('req'),
        type,
        name: reqId ? `${reqId}: ${name}` : name,
        documentation: row['Description'] || row['Detail'] || row['Acceptance Criteria'] || undefined,
        layer: 'Motivation',
        source: file.name,
        properties: {
          ...(row['Priority'] ? { priority: row['Priority'] } : {}),
          ...(row['Status'] ? { status: row['Status'] } : {}),
          ...(row['Target'] ? { target: row['Target'] } : {}),
        },
      });
    }
  }
}

function extractDecisionLog(file: VaultFile, elements: ArchiElement[], relationships: ArchiRelationship[]): void {
  // Extract ADR entries from headings and tables
  const adrPattern = /^##\s+(AD-\d+)[:\s]+(.+)/gm;
  for (const m of file.content.matchAll(adrPattern)) {
    const adrId = m[1];
    const title = m[2].trim();

    // Find status nearby
    const statusMatch = file.content.match(
      new RegExp(`${adrId}[\\s\\S]*?\\*\\*Status\\*\\*[:\\s]*([^\\n*]+)`, 'i')
    );
    const status = statusMatch?.[1]?.trim() || 'Unknown';

    elements.push({
      id: newId('adr'),
      type: 'Assessment',
      name: `${adrId}: ${title}`,
      documentation: `Status: ${status}`,
      layer: 'Motivation',
      source: file.name,
      properties: { status },
    });
  }

  // Also parse tables in the decision log
  const tables = parseTables(file.content);
  for (const table of tables) {
    for (const row of table) {
      const decId = row['ID'] || row['Decision ID'];
      const title = row['Title'] || row['Decision'] || row['Name'];
      if (!decId || !title) continue;
      const existing = elements.find((e) => e.name.startsWith(decId));
      if (existing) continue;
      elements.push({
        id: newId('adr'),
        type: 'Assessment',
        name: `${decId}: ${title}`,
        documentation: row['Status'] ? `Status: ${row['Status']}` : undefined,
        layer: 'Motivation',
        source: file.name,
        properties: {
          ...(row['Status'] ? { status: row['Status'] } : {}),
        },
      });
    }
  }
}

function extractRiskRegister(file: VaultFile, elements: ArchiElement[], relationships: ArchiRelationship[]): void {
  const tables = parseTables(file.content);
  for (const table of tables) {
    for (const row of table) {
      const name = row['Risk'] || row['Title'] || row['Name'] || row['Issue'];
      const riskId = row['ID'] || row['Risk ID'];
      if (!name) continue;
      elements.push({
        id: newId('risk'),
        type: 'Assessment',
        name: riskId ? `${riskId}: ${name}` : name,
        documentation: row['Mitigation'] || row['Response'] || undefined,
        layer: 'Motivation',
        source: file.name,
        properties: {
          ...(row['Probability'] ? { probability: row['Probability'] } : {}),
          ...(row['Impact'] ? { impact: row['Impact'] } : {}),
          ...(row['Status'] ? { status: row['Status'] } : {}),
          ...(row['Owner'] ? { owner: row['Owner'] } : {}),
        },
      });
    }
  }
}

function extractRoadmap(file: VaultFile, elements: ArchiElement[], relationships: ArchiRelationship[]): void {
  const tables = parseTables(file.content);
  for (const table of tables) {
    for (const row of table) {
      const name = row['Initiative'] || row['Work Package'] || row['Phase'] || row['Milestone'];
      if (!name) continue;
      elements.push({
        id: newId('wp'),
        type: 'WorkPackage',
        name,
        documentation: row['Description'] || undefined,
        layer: 'Implementation',
        source: file.name,
        properties: {
          ...(row['Timeline'] ? { timeline: row['Timeline'] } : {}),
          ...(row['Quarter'] ? { quarter: row['Quarter'] } : {}),
          ...(row['Start'] ? { start: row['Start'] } : {}),
          ...(row['End'] ? { end: row['End'] } : {}),
          ...(row['Status'] ? { status: row['Status'] } : {}),
          ...(row['Priority'] ? { priority: row['Priority'] } : {}),
          ...(row['Owner'] ? { owner: row['Owner'] } : {}),
        },
      });
    }
  }
}

function extractGovernance(file: VaultFile, elements: ArchiElement[]): void {
  const tables = parseTables(file.content);
  for (const table of tables) {
    for (const row of table) {
      const name =
        row['Control'] || row['Checkpoint'] || row['Governance'] || row['Review'];
      if (!name) continue;
      elements.push({
        id: newId('gov'),
        type: 'Constraint',
        name,
        documentation: row['Description'] || row['Frequency'] || undefined,
        layer: 'Motivation',
        source: file.name,
      });
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Cross-layer relationship inference
// ────────────────────────────────────────────────────────────────────────────

function inferCrossLayerRelationships(elements: ArchiElement[], relationships: ArchiRelationship[]): void {
  const businessEls = elements.filter((e) => e.layer === 'Business');
  const appEls = elements.filter((e) => e.layer === 'Application');
  const techEls = elements.filter((e) => e.layer === 'Technology');
  const reqEls = elements.filter((e) => e.type === 'Requirement' || e.type === 'Constraint');
  const principleEls = elements.filter((e) => e.type === 'Principle');

  // App components serve business processes (name similarity heuristic)
  for (const app of appEls) {
    for (const biz of businessEls) {
      if (nameOverlap(app.name, biz.name)) {
        relationships.push({
          id: newId('xrel'),
          type: 'ServingRelationship',
          source: app.id,
          target: biz.id,
        });
      }
    }
  }

  // Technology nodes realize app components (name similarity)
  for (const tech of techEls) {
    for (const app of appEls) {
      if (nameOverlap(tech.name, app.name)) {
        relationships.push({
          id: newId('xrel'),
          type: 'RealizationRelationship',
          source: tech.id,
          target: app.id,
        });
      }
    }
  }

  // Requirements influence principles
  for (const req of reqEls) {
    for (const prin of principleEls) {
      if (nameOverlap(req.name, prin.name)) {
        relationships.push({
          id: newId('xrel'),
          type: 'InfluenceRelationship',
          source: req.id,
          target: prin.id,
        });
      }
    }
  }
}

/** Check if two names share a significant word (heuristic for cross-layer linking) */
function nameOverlap(a: string, b: string): boolean {
  const stop = new Set(['the', 'and', 'for', 'from', 'with', 'that', 'this', 'are', 'was', 'not', 'but', 'has']);
  const wordsA = a.toLowerCase().split(/[\s_\-/]+/).filter((w) => w.length > 3 && !stop.has(w));
  const wordsB = new Set(b.toLowerCase().split(/[\s_\-/]+/).filter((w) => w.length > 3 && !stop.has(w)));
  return wordsA.some((w) => wordsB.has(w));
}

// ────────────────────────────────────────────────────────────────────────────
// View generation
// ────────────────────────────────────────────────────────────────────────────

function generateViews(elements: ArchiElement[], relationships: ArchiRelationship[]): ArchiView[] {
  const views: ArchiView[] = [];
  const SPACING_X = 200;
  const SPACING_Y = 120;
  const NODE_W = 160;
  const NODE_H = 80;

  // 1. Full Layered View
  const layeredView = createLayeredView('view-full', 'Full Layered View', elements, relationships, SPACING_X, SPACING_Y, NODE_W, NODE_H);
  if (layeredView.nodes.length > 0) views.push(layeredView);

  // 2. Business & Motivation View
  const bizMotivEls = elements.filter(
    (e) => e.layer === 'Business' || e.layer === 'Motivation' || e.layer === 'Strategy'
  );
  const bizMotivView = createFilteredView(
    'view-biz-motiv',
    'Business & Motivation',
    bizMotivEls,
    relationships,
    SPACING_X,
    SPACING_Y,
    NODE_W,
    NODE_H
  );
  if (bizMotivView.nodes.length > 0) views.push(bizMotivView);

  // 3. Application Layer View
  const appEls = elements.filter((e) => e.layer === 'Application');
  const appView = createFilteredView(
    'view-app',
    'Application Layer',
    appEls,
    relationships,
    SPACING_X,
    SPACING_Y,
    NODE_W,
    NODE_H
  );
  if (appView.nodes.length > 0) views.push(appView);

  // 4. Technology Layer View
  const techEls = elements.filter((e) => e.layer === 'Technology');
  const techView = createFilteredView(
    'view-tech',
    'Technology Layer',
    techEls,
    relationships,
    SPACING_X,
    SPACING_Y,
    NODE_W,
    NODE_H
  );
  if (techView.nodes.length > 0) views.push(techView);

  // 5. Implementation & Migration View
  const implEls = elements.filter((e) => e.layer === 'Implementation');
  const implView = createFilteredView(
    'view-impl',
    'Implementation & Migration',
    implEls,
    relationships,
    SPACING_X,
    SPACING_Y,
    NODE_W,
    NODE_H
  );
  if (implView.nodes.length > 0) views.push(implView);

  return views;
}

function createLayeredView(
  id: string,
  name: string,
  elements: ArchiElement[],
  relationships: ArchiRelationship[],
  spacingX: number,
  spacingY: number,
  nodeW: number,
  nodeH: number
): ArchiView {
  const layerOrder: ArchiLayer[] = ['Motivation', 'Strategy', 'Business', 'Application', 'Technology', 'Implementation'];
  const nodes: ArchiViewNode[] = [];
  const elIds = new Set<string>();

  let yOffset = 40;
  for (const layer of layerOrder) {
    const layerEls = elements.filter((e) => e.layer === layer);
    let xOffset = 40;
    for (const el of layerEls) {
      nodes.push({ elementRef: el.id, x: xOffset, y: yOffset, w: nodeW, h: nodeH });
      elIds.add(el.id);
      xOffset += spacingX;
    }
    if (layerEls.length > 0) yOffset += spacingY + 40;
  }

  const connections: ArchiViewConnection[] = relationships
    .filter((r) => elIds.has(r.source) && elIds.has(r.target))
    .map((r) => ({ relationshipRef: r.id, sourceRef: r.source, targetRef: r.target }));

  return { id, name, viewpoint: 'Layered', nodes, connections };
}

function createFilteredView(
  id: string,
  name: string,
  filteredElements: ArchiElement[],
  allRelationships: ArchiRelationship[],
  spacingX: number,
  spacingY: number,
  nodeW: number,
  nodeH: number
): ArchiView {
  const elIds = new Set(filteredElements.map((e) => e.id));
  const nodes: ArchiViewNode[] = filteredElements.map((el, i) => ({
    elementRef: el.id,
    x: 40 + (i % 5) * spacingX,
    y: 40 + Math.floor(i / 5) * (spacingY + 20),
    w: nodeW,
    h: nodeH,
  }));

  const connections = allRelationships
    .filter((r) => elIds.has(r.source) && elIds.has(r.target))
    .map((r) => ({ relationshipRef: r.id, sourceRef: r.source, targetRef: r.target }));

  return { id, name, nodes, connections };
}

// ────────────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────────────

/**
 * Extract an ArchiMate model from a set of vault files.
 *
 * This is the primary pure-logic entry point. It scans each file for
 * TOGAF phase indicators and delegates to the appropriate phase extractor.
 */
export function extractModel(files: VaultFile[], vaultName?: string): ArchiModel {
  resetIdCounter();

  const elements: ArchiElement[] = [];
  const relationships: ArchiRelationship[] = [];

  for (const file of files) {
    const fm = parseFrontMatter(file.content);
    const phase = fm['togaf_phase'] || '';
    const prefix = file.name.split('_')[0].toUpperCase();

    // Route to the correct extractor based on phase prefix
    if (prefix.startsWith('A') && /stakeholder/i.test(file.name)) {
      extractStakeholders(file, elements, relationships);
    } else if (prefix.startsWith('P') && /principle/i.test(file.name)) {
      extractPrinciples(file, elements, relationships);
    } else if (prefix.startsWith('P') && /governance/i.test(file.name)) {
      extractGovernance(file, elements);
    } else if (prefix.startsWith('B') || phase.toLowerCase().includes('business')) {
      extractBusinessArchitecture(file, elements, relationships);
    } else if (prefix.startsWith('C') || phase.toLowerCase().includes('application') || phase.toLowerCase().includes('information')) {
      extractApplicationArchitecture(file, elements, relationships);
    } else if (prefix.startsWith('D') || phase.toLowerCase().includes('technology')) {
      extractTechnologyArchitecture(file, elements, relationships);
    } else if (prefix.startsWith('E') || phase.toLowerCase().includes('solution')) {
      extractSolutionsBuildingBlocks(file, elements, relationships, elements);
    } else if (prefix.startsWith('R') || phase.toLowerCase().includes('requirement')) {
      extractRequirements(file, elements, relationships);
    } else if (prefix.startsWith('X1') || /decision/i.test(file.name) || /adr/i.test(file.name)) {
      extractDecisionLog(file, elements, relationships);
    } else if (prefix.startsWith('X2') || /risk/i.test(file.name)) {
      extractRiskRegister(file, elements, relationships);
    } else if (prefix.startsWith('F') || /roadmap|migration/i.test(file.name)) {
      extractRoadmap(file, elements, relationships);
    } else if (prefix.startsWith('G') || /governance/i.test(file.name)) {
      extractGovernance(file, elements);
    }
  }

  // Infer cross-layer relationships
  inferCrossLayerRelationships(elements, relationships);

  // Generate views
  const views = generateViews(elements, relationships);

  return {
    name: vaultName || 'ArchiMate Export',
    documentation: `Exported from TOGAF vault "${vaultName || 'unknown'}" by archipilot`,
    elements,
    relationships,
    views,
    metadata: {
      exportedAt: new Date().toISOString(),
      vaultFileCount: files.length,
      generatorVersion: '0.5.0-beta',
    },
  };
}

/**
 * Serialize an ArchiMate model to the Open Exchange Format 3.2 XML string.
 *
 * Produces standards-compliant XML compatible with Archi, BiZZdesign,
 * Sparx EA, and other tools supporting the ArchiMate Model Exchange
 * File Format.
 */
export function serializeToXml(model: ArchiModel): string {
  const lines: string[] = [];

  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push(
    '<model xmlns="http://www.opengroup.org/xsd/archimate/3.0/"' +
      ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"' +
      ' xsi:schemaLocation="http://www.opengroup.org/xsd/archimate/3.0/ http://www.opengroup.org/xsd/archimate/3.1/archimate3_Diagram.xsd"' +
      ` identifier="model-archipilot">`
  );

  // Name & documentation
  lines.push(`  <name xml:lang="en">${escapeXml(model.name)}</name>`);
  if (model.documentation) {
    lines.push(`  <documentation xml:lang="en">${escapeXml(model.documentation)}</documentation>`);
  }

  // ── Elements ──
  lines.push('  <elements>');
  for (const el of model.elements) {
    lines.push(
      `    <element identifier="${escapeXml(el.id)}" xsi:type="${escapeXml(el.type)}">`
    );
    lines.push(`      <name xml:lang="en">${escapeXml(el.name)}</name>`);
    if (el.documentation) {
      lines.push(`      <documentation xml:lang="en">${escapeXml(el.documentation)}</documentation>`);
    }
    // Properties
    if (el.properties && Object.keys(el.properties).length > 0) {
      lines.push('      <properties>');
      for (const [key, val] of Object.entries(el.properties)) {
        lines.push(
          `        <property propertyDefinitionRef="prop-${escapeXml(key)}">` +
            `<value xml:lang="en">${escapeXml(val)}</value>` +
            '</property>'
        );
      }
      lines.push('      </properties>');
    }
    lines.push('    </element>');
  }
  lines.push('  </elements>');

  // ── Relationships ──
  lines.push('  <relationships>');
  for (const rel of model.relationships) {
    lines.push(
      `    <relationship identifier="${escapeXml(rel.id)}"` +
        ` xsi:type="${escapeXml(rel.type)}"` +
        ` source="${escapeXml(rel.source)}"` +
        ` target="${escapeXml(rel.target)}">`
    );
    if (rel.name) {
      lines.push(`      <name xml:lang="en">${escapeXml(rel.name)}</name>`);
    }
    if (rel.documentation) {
      lines.push(`      <documentation xml:lang="en">${escapeXml(rel.documentation)}</documentation>`);
    }
    lines.push('    </relationship>');
  }
  lines.push('  </relationships>');

  // ── Property Definitions (collect unique keys) ──
  const propKeys = new Set<string>();
  for (const el of model.elements) {
    if (el.properties) {
      for (const key of Object.keys(el.properties)) {
        propKeys.add(key);
      }
    }
  }
  if (propKeys.size > 0) {
    lines.push('  <propertyDefinitions>');
    for (const key of propKeys) {
      lines.push(
        `    <propertyDefinition identifier="prop-${escapeXml(key)}" type="string">` +
          `<name xml:lang="en">${escapeXml(key)}</name>` +
          '</propertyDefinition>'
      );
    }
    lines.push('  </propertyDefinitions>');
  }

  // ── Views / Diagrams ──
  if (model.views.length > 0) {
    lines.push('  <views>');
    lines.push('    <diagrams>');
    for (const view of model.views) {
      const vpAttr = view.viewpoint ? ` viewpoint="${escapeXml(view.viewpoint)}"` : '';
      lines.push(`      <view identifier="${escapeXml(view.id)}"${vpAttr}>`);
      lines.push(`        <name xml:lang="en">${escapeXml(view.name)}</name>`);

      for (const node of view.nodes) {
        lines.push(
          `        <node identifier="vn-${escapeXml(node.elementRef)}"` +
            ` elementRef="${escapeXml(node.elementRef)}"` +
            ` x="${node.x}" y="${node.y}" w="${node.w}" h="${node.h}" />`
        );
      }

      for (const conn of view.connections) {
        lines.push(
          `        <connection identifier="vc-${escapeXml(conn.relationshipRef)}"` +
            ` relationshipRef="${escapeXml(conn.relationshipRef)}"` +
            ` source="vn-${escapeXml(conn.sourceRef)}"` +
            ` target="vn-${escapeXml(conn.targetRef)}" />`
        );
      }

      lines.push('      </view>');
    }
    lines.push('    </diagrams>');
    lines.push('  </views>');
  }

  // ── Metadata (as organization/label) ──
  lines.push('  <organizations>');
  lines.push('    <item>');
  lines.push(`      <label xml:lang="en">archipilot Export</label>`);
  lines.push(`      <documentation xml:lang="en">Generated by archipilot v${model.metadata.generatorVersion} at ${model.metadata.exportedAt}</documentation>`);
  lines.push('    </item>');
  lines.push('  </organizations>');

  lines.push('</model>');
  return lines.join('\n');
}

/**
 * Full pipeline: extract model from vault files and serialize to XML.
 */
export function exportToArchimate(files: VaultFile[], vaultName?: string): string {
  const model = extractModel(files, vaultName);
  return serializeToXml(model);
}

/**
 * Generate a human-readable summary of an ArchiMate export.
 */
export function generateExportSummary(model: ArchiModel): ArchiExportSummary {
  const byLayer: Record<string, number> = {};
  const byType: Record<string, number> = {};
  const sourceFiles = new Set<string>();

  for (const el of model.elements) {
    byLayer[el.layer] = (byLayer[el.layer] || 0) + 1;
    byType[el.type] = (byType[el.type] || 0) + 1;
    if (el.source) sourceFiles.add(el.source);
  }

  return {
    totalElements: model.elements.length,
    totalRelationships: model.relationships.length,
    totalViews: model.views.length,
    byLayer,
    byType,
    sourceFiles: [...sourceFiles].sort(),
  };
}

/**
 * Format an export summary as a markdown string for display in chat.
 */
export function formatSummaryMarkdown(summary: ArchiExportSummary): string {
  const lines: string[] = [];
  lines.push('## 📐 ArchiMate Export Summary\n');
  lines.push(`| Metric | Count |`);
  lines.push(`|--------|------:|`);
  lines.push(`| Elements | ${summary.totalElements} |`);
  lines.push(`| Relationships | ${summary.totalRelationships} |`);
  lines.push(`| Views | ${summary.totalViews} |`);

  lines.push('\n### By Layer\n');
  lines.push('| Layer | Elements |');
  lines.push('|-------|--------:|');
  for (const [layer, count] of Object.entries(summary.byLayer).sort(([, a], [, b]) => b - a)) {
    lines.push(`| ${layer} | ${count} |`);
  }

  lines.push('\n### By Element Type\n');
  lines.push('| Type | Count |');
  lines.push('|------|------:|');
  for (const [type, count] of Object.entries(summary.byType).sort(([, a], [, b]) => b - a)) {
    lines.push(`| ${type} | ${count} |`);
  }

  lines.push('\n### Source Files\n');
  for (const f of summary.sourceFiles) {
    lines.push(`- \`${f}\``);
  }

  return lines.join('\n');
}
