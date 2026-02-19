/**
 * c4-scaffold.ts – Deterministic C4 model scaffold extractor.
 *
 * Zero VS Code dependencies – works with plain VaultFile arrays.
 *
 * Parses vault files to build a structured C4 scaffold containing:
 *   - System Context (Level 1): actors, external systems, the system boundary
 *   - Container (Level 2): logical components with technology & interfaces
 *   - Component (Level 3): ABB→SBB mapping, integration edges
 *   - Relationships: extracted from Mermaid diagrams + integration catalog
 *
 * The scaffold is streamed to the user BEFORE the LLM pass so the AI
 * can refine rather than invent.
 *
 * @module c4-scaffold
 */

import { parseFrontMatter, parseTables, parseMermaidGraphs } from './archimate-exporter.js';
import type { MermaidNode, MermaidEdge, TableRow } from './archimate-exporter.js';

// ── Types ──────────────────────────────────────────────────────────

interface VaultFile {
  name: string;
  content: string;
}

export interface C4Person {
  name: string;
  role: string;
  description?: string;
}

export interface C4ExternalSystem {
  name: string;
  owner?: string;
  description?: string;
  protocol?: string;
}

export interface C4Container {
  id: string;
  name: string;
  purpose: string;
  technology?: string;
  owner?: string;
  interfaces?: string;
}

export interface C4Component {
  abb: string;
  sbb: string;
  vendor?: string;
  buildOrBuy?: string;
  status?: string;
}

export interface C4Integration {
  source: string;
  target: string;
  pattern?: string;
  protocol?: string;
  dataFormat?: string;
  frequency?: string;
}

export interface C4GraphData {
  nodes: MermaidNode[];
  edges: MermaidEdge[];
  sourceFile: string;
}

export interface C4Scaffold {
  /** System name from A1 vision or vault name */
  systemName: string;
  /** High-level description from A1 */
  systemDescription: string;
  /** External actors / stakeholders (Level 1) */
  persons: C4Person[];
  /** External systems (Level 1) */
  externalSystems: C4ExternalSystem[];
  /** Logical containers / components (Level 2) */
  containers: C4Container[];
  /** ABB → SBB components (Level 3) */
  components: C4Component[];
  /** System-to-system integrations (edges) */
  integrations: C4Integration[];
  /** Parsed Mermaid architecture graphs */
  graphs: C4GraphData[];
  /** Technology platform components */
  platformComponents: C4Container[];
  /** Deployment subgraphs (from Mermaid topology) */
  deploymentZones: string[];
  /** Source files that contributed data */
  sourceFiles: string[];
}

// ── Extraction ─────────────────────────────────────────────────────

function findFile(files: VaultFile[], pattern: RegExp): VaultFile | undefined {
  return files.find((f) => pattern.test(f.name));
}

function extractSystemInfo(files: VaultFile[]): { name: string; description: string } {
  const a1 = findFile(files, /A1_.*Architecture.*Vision/i);
  if (!a1) return { name: 'System', description: '' };

  // Try to get system name from the first H1 heading
  const h1 = a1.content.match(/^#\s+(.+)/m);
  const frontMatter = parseFrontMatter(a1.content);

  // Extract the scope / drivers / description paragraph
  const scopeMatch = a1.content.match(/##\s*(?:Scope|Vision|Overview|Purpose)\b[\s\S]*?\n\n([\s\S]*?)(?=\n##|\n---|\z)/i);
  const description = scopeMatch?.[1]?.trim()?.slice(0, 300) || '';

  return {
    name: h1?.[1]?.replace(/^#\s*/, '').trim() || frontMatter['type'] || 'System',
    description,
  };
}

function extractPersons(files: VaultFile[]): C4Person[] {
  const a2 = findFile(files, /A2_.*Stakeholder/i);
  if (!a2) return [];

  const tables = parseTables(a2.content);
  const persons: C4Person[] = [];

  for (const table of tables) {
    for (const row of table) {
      const name = row['Stakeholder'] || row['Name'] || row['Actor'];
      const role = row['Role'] || row['Function'] || '';
      const concern = row['Concern'] || row['Interest'] || '';
      if (name && !persons.some((p) => p.name === name)) {
        persons.push({ name, role, description: concern });
      }
    }
  }
  return persons;
}

function extractExternalSystems(files: VaultFile[]): C4ExternalSystem[] {
  const e2 = findFile(files, /E2_.*Integration/i);
  if (!e2) return [];

  const tables = parseTables(e2.content);
  const systems: C4ExternalSystem[] = [];

  for (const table of tables) {
    for (const row of table) {
      const sysName = row['System'] || row['External System'];
      const owner = row['Owner'] || '';
      const protocol = row['Protocol'] || row['API Version'] || '';
      const sla = row['SLA'] || '';
      if (sysName && !systems.some((s) => s.name === sysName)) {
        systems.push({ name: sysName, owner, protocol, description: sla ? `SLA: ${sla}` : undefined });
      }
    }
  }
  return systems;
}

function extractContainers(files: VaultFile[]): C4Container[] {
  const c1 = findFile(files, /C1_.*Application/i);
  if (!c1) return [];

  const tables = parseTables(c1.content);
  const containers: C4Container[] = [];

  for (const table of tables) {
    for (const row of table) {
      const name = row['Component'] || row['Application'] || row['Service'];
      const purpose = row['Purpose'] || row['Description'] || '';
      const intf = row['Interfaces'] || row['Interface'] || '';
      const owner = row['Owner'] || '';
      if (name && purpose && !containers.some((c) => c.name === name)) {
        containers.push({
          id: safeId(name),
          name,
          purpose,
          interfaces: intf || undefined,
          owner: owner || undefined,
        });
      }
    }
  }
  return containers;
}

function extractPlatformComponents(files: VaultFile[]): C4Container[] {
  const d1 = findFile(files, /D1_.*Technology/i);
  if (!d1) return [];

  const tables = parseTables(d1.content);
  const components: C4Container[] = [];

  for (const table of tables) {
    for (const row of table) {
      const name = row['Component'] || row['Platform'] || row['Service'];
      const tech = row['Technology'] || row['Stack'] || '';
      const env = row['Environment'] || '';
      const scaling = row['Scaling'] || '';
      const sla = row['SLA'] || '';
      if (name && !components.some((c) => c.name === name)) {
        components.push({
          id: safeId(name),
          name,
          purpose: [env, scaling, sla].filter(Boolean).join(' · '),
          technology: tech || undefined,
        });
      }
    }
  }
  return components;
}

function extractBuildingBlocks(files: VaultFile[]): C4Component[] {
  const e1 = findFile(files, /E1_.*Building.*Block/i);
  if (!e1) return [];

  const tables = parseTables(e1.content);
  const components: C4Component[] = [];

  for (const table of tables) {
    for (const row of table) {
      const abb = row['ABB'] || row['ABB (Logical)'] || row['Capability'];
      const sbb = row['SBB'] || row['SBB (Physical)'] || row['Product'];
      const vendor = row['Vendor'] || row['Vendor / Product'] || '';
      const buildBuy = row['Buy / Build'] || row['Build / Buy'] || row['Recommendation'] || '';
      const status = row['Status'] || '';
      if (abb && sbb) {
        components.push({
          abb,
          sbb,
          vendor: vendor || undefined,
          buildOrBuy: buildBuy || undefined,
          status: status || undefined,
        });
      }
    }
  }
  return components;
}

function extractIntegrations(files: VaultFile[]): C4Integration[] {
  const e2 = findFile(files, /E2_.*Integration/i);
  if (!e2) return [];

  const tables = parseTables(e2.content);
  const integrations: C4Integration[] = [];

  for (const table of tables) {
    for (const row of table) {
      const source = row['Source'] || '';
      const target = row['Target'] || '';
      if (source && target) {
        integrations.push({
          source,
          target,
          pattern: row['Pattern'] || undefined,
          protocol: row['Protocol'] || undefined,
          dataFormat: row['Data Format'] || undefined,
          frequency: row['Frequency'] || undefined,
        });
      }
    }
  }
  return integrations;
}

function extractGraphs(files: VaultFile[]): C4GraphData[] {
  const graphs: C4GraphData[] = [];
  const relevantFiles = files.filter((f) =>
    /C1_|D1_|E2_|A3_/i.test(f.name)
  );

  for (const file of relevantFiles) {
    const parsed = parseMermaidGraphs(file.content);
    for (const g of parsed) {
      if (g.nodes.length > 0) {
        graphs.push({ nodes: g.nodes, edges: g.edges, sourceFile: file.name });
      }
    }
  }
  return graphs;
}

function extractDeploymentZones(files: VaultFile[]): string[] {
  const d1 = findFile(files, /D1_.*Technology/i);
  if (!d1) return [];

  const zones = new Set<string>();
  const subgraphMatches = d1.content.matchAll(/subgraph\s+(?:["']([^"']+)["']|(\S+))/gi);
  for (const m of subgraphMatches) {
    zones.add(m[1] || m[2]);
  }
  return [...zones];
}

function safeId(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

// ── Public API ─────────────────────────────────────────────────────

/**
 * Extract a deterministic C4 scaffold from the vault.
 */
export function extractC4Scaffold(files: VaultFile[]): C4Scaffold {
  const systemInfo = extractSystemInfo(files);
  const persons = extractPersons(files);
  const externalSystems = extractExternalSystems(files);
  const containers = extractContainers(files);
  const platformComponents = extractPlatformComponents(files);
  const components = extractBuildingBlocks(files);
  const integrations = extractIntegrations(files);
  const graphs = extractGraphs(files);
  const deploymentZones = extractDeploymentZones(files);

  const sourceFiles = new Set<string>();
  for (const pattern of [/A1_/i, /A2_/i, /C1_/i, /D1_/i, /E1_/i, /E2_/i]) {
    const f = files.find((v) => pattern.test(v.name));
    if (f) sourceFiles.add(f.name);
  }

  return {
    systemName: systemInfo.name,
    systemDescription: systemInfo.description,
    persons,
    externalSystems,
    containers,
    components,
    integrations,
    graphs,
    platformComponents,
    deploymentZones,
    sourceFiles: [...sourceFiles],
  };
}

// ── Formatting ─────────────────────────────────────────────────────

/**
 * Format the C4 scaffold as Markdown ready for display / LLM context.
 */
export function formatC4ScaffoldMarkdown(scaffold: C4Scaffold): string {
  const lines: string[] = [];

  lines.push(`## 📐 C4 Model Scaffold — ${scaffold.systemName}\n`);
  if (scaffold.systemDescription) {
    lines.push(`> ${scaffold.systemDescription.slice(0, 200)}\n`);
  }

  // ── Level 1: System Context ──
  lines.push('### Level 1 — System Context\n');

  if (scaffold.persons.length > 0) {
    lines.push('**Actors / Stakeholders:**\n');
    lines.push('| Person | Role | Concern |');
    lines.push('|--------|------|---------|');
    for (const p of scaffold.persons) {
      lines.push(`| ${p.name} | ${p.role} | ${p.description || '—'} |`);
    }
    lines.push('');
  }

  if (scaffold.externalSystems.length > 0) {
    lines.push('**External Systems:**\n');
    lines.push('| System | Owner | Protocol | Notes |');
    lines.push('|--------|-------|----------|-------|');
    for (const s of scaffold.externalSystems) {
      lines.push(`| ${s.name} | ${s.owner || '—'} | ${s.protocol || '—'} | ${s.description || '—'} |`);
    }
    lines.push('');
  }

  // ── Level 2: Containers ──
  lines.push('### Level 2 — Containers\n');

  if (scaffold.containers.length > 0) {
    lines.push('**Application Components (from C1):**\n');
    lines.push('| Component | Purpose | Interfaces | Owner |');
    lines.push('|-----------|---------|------------|-------|');
    for (const c of scaffold.containers) {
      lines.push(`| ${c.name} | ${c.purpose} | ${c.interfaces || '—'} | ${c.owner || '—'} |`);
    }
    lines.push('');
  }

  if (scaffold.platformComponents.length > 0) {
    lines.push('**Platform / Technology (from D1):**\n');
    lines.push('| Component | Technology | Details |');
    lines.push('|-----------|-----------|---------|');
    for (const c of scaffold.platformComponents) {
      lines.push(`| ${c.name} | ${c.technology || '—'} | ${c.purpose} |`);
    }
    lines.push('');
  }

  if (scaffold.deploymentZones.length > 0) {
    lines.push(`**Deployment Zones:** ${scaffold.deploymentZones.join(', ')}\n`);
  }

  // ── Level 3: Components ──
  if (scaffold.components.length > 0) {
    lines.push('### Level 3 — Components (ABB → SBB)\n');
    lines.push('| ABB (Logical) | SBB (Physical) | Vendor | Build/Buy | Status |');
    lines.push('|---------------|----------------|--------|-----------|--------|');
    for (const c of scaffold.components) {
      lines.push(`| ${c.abb} | ${c.sbb} | ${c.vendor || '—'} | ${c.buildOrBuy || '—'} | ${c.status || '—'} |`);
    }
    lines.push('');
  }

  // ── Relationships ──
  if (scaffold.integrations.length > 0) {
    lines.push('### Integration Edges\n');
    lines.push('| Source | Target | Pattern | Protocol | Format | Frequency |');
    lines.push('|--------|--------|---------|----------|--------|-----------|');
    for (const i of scaffold.integrations) {
      lines.push(`| ${i.source} | ${i.target} | ${i.pattern || '—'} | ${i.protocol || '—'} | ${i.dataFormat || '—'} | ${i.frequency || '—'} |`);
    }
    lines.push('');
  }

  // ── Existing Mermaid Diagrams ──
  if (scaffold.graphs.length > 0) {
    lines.push('### Existing Architecture Diagrams\n');
    for (const g of scaffold.graphs) {
      lines.push(`**From ${g.sourceFile}:** ${g.nodes.length} nodes, ${g.edges.length} edges`);
      if (g.nodes.length > 0) {
        const nodeList = g.nodes.slice(0, 15).map((n) => {
          const sub = n.subgraph ? ` (${n.subgraph})` : '';
          return `\`${n.label}\`${sub}`;
        });
        lines.push(`- Nodes: ${nodeList.join(', ')}${g.nodes.length > 15 ? `, … (+${g.nodes.length - 15})` : ''}`);
      }
      lines.push('');
    }
  }

  // ── Summary ──
  const total = scaffold.persons.length +
    scaffold.externalSystems.length +
    scaffold.containers.length +
    scaffold.platformComponents.length +
    scaffold.components.length;
  lines.push(`---\n*Scaffold: ${total} elements extracted from ${scaffold.sourceFiles.length} files. ` +
    `${scaffold.integrations.length} integration edges, ${scaffold.graphs.length} diagrams.*\n`);

  return lines.join('\n');
}
