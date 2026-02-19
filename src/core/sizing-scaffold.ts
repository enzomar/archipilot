/**
 * sizing-scaffold.ts – Deterministic sizing scaffold extractor.
 *
 * Zero VS Code dependencies – works with plain VaultFile arrays.
 *
 * Parses vault files to build a structured sizing scaffold containing:
 *   - Component inventory (from C1, D1, E1)
 *   - Existing sizing data (from X4_Sizing_Catalogue)
 *   - NFR / performance targets (from R1_Architecture_Requirements)
 *   - Scenario load hints (from B3_Business_Scenarios)
 *   - Cost estimation baseline (from X4)
 *   - Capacity planning assumptions (from X4)
 *
 * The scaffold is streamed to the user BEFORE the LLM pass so the AI
 * can refine rather than invent.
 *
 * @module sizing-scaffold
 */

import { parseFrontMatter, parseTables } from './archimate-exporter.js';
import type { TableRow } from './archimate-exporter.js';

// ── Types ──────────────────────────────────────────────────────────

interface VaultFile {
  name: string;
  content: string;
}

export interface SizingComponent {
  name: string;
  users?: string;
  peakTps?: string;
  storage?: string;
  compute?: string;
  notes?: string;
  source: string;
}

export interface CostEstimate {
  category: string;
  monthlyCost: string;
  notes?: string;
}

export interface CapacityAssumption {
  assumption: string;
  value: string;
  source?: string;
}

export interface NfrTarget {
  id: string;
  description: string;
  priority?: string;
  category?: string;
  source: string;
}

export interface ScenarioHint {
  name: string;
  actors: string;
  implications: string[];
  source: string;
}

export interface SizingScaffold {
  /** All components from C1, D1, E1 merged with X4 data */
  components: SizingComponent[];
  /** Existing cost estimates from X4 */
  costs: CostEstimate[];
  /** Capacity planning assumptions from X4 */
  assumptions: CapacityAssumption[];
  /** Non-functional requirements with performance targets */
  nfrTargets: NfrTarget[];
  /** Business scenario load hints */
  scenarioHints: ScenarioHint[];
  /** Technology stack from D1 */
  technologyStack: { name: string; technology: string; scaling?: string; sla?: string }[];
  /** Whether X4 already exists and has data */
  hasExistingSizing: boolean;
  /** Source files that contributed */
  sourceFiles: string[];
}

// ── Extraction ─────────────────────────────────────────────────────

function findFile(files: VaultFile[], pattern: RegExp): VaultFile | undefined {
  return files.find((f) => pattern.test(f.name));
}

function isTbd(val: string): boolean {
  return !val || /^(tbd|—|–|-|n\/a|todo|\?)$/i.test(val.trim());
}

function extractExistingSizing(files: VaultFile[]): {
  components: SizingComponent[];
  costs: CostEstimate[];
  assumptions: CapacityAssumption[];
  exists: boolean;
} {
  const x4 = findFile(files, /X4_.*Sizing/i);
  if (!x4) return { components: [], costs: [], assumptions: [], exists: false };

  const tables = parseTables(x4.content);
  const components: SizingComponent[] = [];
  const costs: CostEstimate[] = [];
  const assumptions: CapacityAssumption[] = [];

  for (const table of tables) {
    if (table.length === 0) continue;
    const cols = Object.keys(table[0]);

    // Component Sizing table
    if (cols.some((c) => /component/i.test(c)) && cols.some((c) => /tps|users|storage|compute/i.test(c))) {
      for (const row of table) {
        const name = row['Component'] || row['Service'] || '';
        if (!name) continue;
        components.push({
          name,
          users: row['Users'] || undefined,
          peakTps: row['Peak TPS'] || row['TPS'] || undefined,
          storage: row['Storage'] || undefined,
          compute: row['Compute'] || undefined,
          notes: row['Notes'] || undefined,
          source: 'X4_Sizing_Catalogue',
        });
      }
      continue;
    }

    // Cost Estimation table
    if (cols.some((c) => /category/i.test(c)) && cols.some((c) => /cost/i.test(c))) {
      for (const row of table) {
        const category = row['Category'] || '';
        const cost = row['Monthly Cost'] || row['Cost'] || '';
        if (category) {
          costs.push({ category, monthlyCost: cost, notes: row['Notes'] || undefined });
        }
      }
      continue;
    }

    // Capacity Assumptions table
    if (cols.some((c) => /assumption/i.test(c)) && cols.some((c) => /value/i.test(c))) {
      for (const row of table) {
        const assumption = row['Assumption'] || '';
        const value = row['Value'] || '';
        if (assumption) {
          assumptions.push({ assumption, value, source: row['Source'] || undefined });
        }
      }
      continue;
    }
  }

  return { components, costs, assumptions, exists: true };
}

function extractComponentInventory(files: VaultFile[]): SizingComponent[] {
  const components: SizingComponent[] = [];
  const seen = new Set<string>();

  // C1: Application components
  const c1 = findFile(files, /C1_.*Application/i);
  if (c1) {
    for (const table of parseTables(c1.content)) {
      for (const row of table) {
        const name = row['Component'] || row['Application'] || row['Service'] || '';
        if (name && !seen.has(name.toLowerCase())) {
          seen.add(name.toLowerCase());
          components.push({ name, notes: row['Purpose'] || undefined, source: 'C1_Application_Architecture' });
        }
      }
    }
  }

  // D1: Platform / technology components
  const d1 = findFile(files, /D1_.*Technology/i);
  if (d1) {
    for (const table of parseTables(d1.content)) {
      for (const row of table) {
        const name = row['Component'] || row['Platform'] || '';
        if (name && !seen.has(name.toLowerCase())) {
          seen.add(name.toLowerCase());
          components.push({ name, notes: row['Technology'] || undefined, source: 'D1_Technology_Architecture' });
        }
      }
    }
  }

  // E1: SBB components
  const e1 = findFile(files, /E1_.*Building.*Block/i);
  if (e1) {
    for (const table of parseTables(e1.content)) {
      for (const row of table) {
        const sbb = row['SBB'] || row['SBB (Physical)'] || row['Product'] || '';
        if (sbb && !seen.has(sbb.toLowerCase())) {
          seen.add(sbb.toLowerCase());
          components.push({
            name: sbb,
            notes: `ABB: ${row['ABB'] || row['ABB (Logical)'] || '?'}`,
            source: 'E1_Solutions_Building_Blocks',
          });
        }
      }
    }
  }

  return components;
}

function extractNfrTargets(files: VaultFile[]): NfrTarget[] {
  const r1 = findFile(files, /R1_.*Requirements/i);
  if (!r1) return [];

  const targets: NfrTarget[] = [];
  const tables = parseTables(r1.content);

  for (const table of tables) {
    for (const row of table) {
      const id = row['ID'] || row['Req ID'] || row['#'] || '';
      const desc = row['Requirement'] || row['Description'] || '';
      const priority = row['Priority'] || row['MoSCoW'] || '';
      const category = row['Category'] || row['Type'] || '';

      // Focus on NFRs that have sizing implications
      if (id && desc && /nfr|non.?func|performance|capacity|scalab|avail|latency/i.test(`${category} ${desc}`)) {
        targets.push({
          id,
          description: desc,
          priority: priority || undefined,
          category: category || undefined,
          source: 'R1_Architecture_Requirements',
        });
      }
    }
  }

  // Also scan for inline NFR-like content even if not in a strict table
  const nfrSection = r1.content.match(/##\s*(?:Non[- ]?Functional|NFR|Quality)[\s\S]*?(?=\n##\s|\n---|$)/i);
  if (nfrSection && targets.length === 0) {
    const bulletItems = nfrSection[0].matchAll(/^[\s]*[-*]\s*\*?\*?(\S.+)/gm);
    let idx = 1;
    for (const m of bulletItems) {
      if (/performance|latency|throughput|capacity|scalab|avail|uptime|rto|rpo/i.test(m[1])) {
        targets.push({
          id: `NFR-${idx++}`,
          description: m[1].replace(/\*\*/g, '').trim(),
          source: 'R1_Architecture_Requirements',
        });
      }
    }
  }

  return targets;
}

function extractScenarioHints(files: VaultFile[]): ScenarioHint[] {
  const b3 = findFile(files, /B3_.*Scenario/i);
  if (!b3) return [];

  const hints: ScenarioHint[] = [];
  // Match scenario headers: "## Scenario N — Name" or "## Scenario: Name"
  const scenarioBlocks = b3.content.split(/(?=^##\s+Scenario\b)/m).slice(1);

  for (const block of scenarioBlocks) {
    const nameMatch = block.match(/^##\s+(.+)/m);
    if (!nameMatch) continue;

    // Extract actors from key-value table
    const tables = parseTables(block);
    let actors = '';
    for (const table of tables) {
      for (const row of table) {
        if (/actor/i.test(row['Field'] || '')) {
          actors = row['Value'] || '';
        }
      }
    }

    // Extract architecture implications as load hints
    const implSection = block.match(/###?\s*(?:Architecture Implications|Implications)[\s\S]*?(?=\n###?\s|$)/i);
    const implications: string[] = [];
    if (implSection) {
      const bullets = implSection[0].matchAll(/^[\s]*[-*]\s+(.+)/gm);
      for (const b of bullets) {
        implications.push(b[1].trim());
      }
    }

    hints.push({
      name: nameMatch[1].trim(),
      actors: actors || 'Not specified',
      implications,
      source: 'B3_Business_Scenarios',
    });
  }

  return hints;
}

function extractTechnologyStack(files: VaultFile[]): { name: string; technology: string; scaling?: string; sla?: string }[] {
  const d1 = findFile(files, /D1_.*Technology/i);
  if (!d1) return [];

  const stack: { name: string; technology: string; scaling?: string; sla?: string }[] = [];
  const tables = parseTables(d1.content);

  for (const table of tables) {
    for (const row of table) {
      const name = row['Component'] || row['Platform'] || '';
      const tech = row['Technology'] || row['Stack'] || '';
      if (name && tech) {
        stack.push({
          name,
          technology: tech,
          scaling: row['Scaling'] || undefined,
          sla: row['SLA'] || undefined,
        });
      }
    }
  }
  return stack;
}

// ── Public API ─────────────────────────────────────────────────────

/**
 * Extract a deterministic sizing scaffold from the vault.
 */
export function extractSizingScaffold(files: VaultFile[]): SizingScaffold {
  const existing = extractExistingSizing(files);
  const componentInventory = extractComponentInventory(files);
  const nfrTargets = extractNfrTargets(files);
  const scenarioHints = extractScenarioHints(files);
  const technologyStack = extractTechnologyStack(files);

  // Merge: existing X4 data takes precedence, fill gaps from component inventory
  const mergedComponents: SizingComponent[] = [...existing.components];
  const existingNames = new Set(existing.components.map((c) => c.name.toLowerCase()));
  for (const comp of componentInventory) {
    if (!existingNames.has(comp.name.toLowerCase())) {
      mergedComponents.push(comp);
    }
  }

  const sourceFiles = new Set<string>();
  for (const pattern of [/X4_/i, /C1_/i, /D1_/i, /E1_/i, /R1_/i, /B3_/i]) {
    const f = files.find((v) => pattern.test(v.name));
    if (f) sourceFiles.add(f.name);
  }

  return {
    components: mergedComponents,
    costs: existing.costs,
    assumptions: existing.assumptions,
    nfrTargets,
    scenarioHints,
    technologyStack,
    hasExistingSizing: existing.exists,
    sourceFiles: [...sourceFiles],
  };
}

// ── Formatting ─────────────────────────────────────────────────────

/**
 * Format the sizing scaffold as Markdown ready for display / LLM context.
 */
export function formatSizingScaffoldMarkdown(scaffold: SizingScaffold): string {
  const lines: string[] = [];

  lines.push('## 📊 Sizing Scaffold\n');

  // ── Component Inventory ──
  lines.push('### Component Inventory\n');
  if (scaffold.components.length > 0) {
    lines.push('| Component | Users | Peak TPS | Storage | Compute | Source | Notes |');
    lines.push('|-----------|-------|----------|---------|---------|--------|-------|');
    for (const c of scaffold.components) {
      lines.push(`| ${c.name} | ${c.users || '—'} | ${c.peakTps || '—'} | ${c.storage || '—'} | ${c.compute || '—'} | ${c.source} | ${c.notes || '—'} |`);
    }
    lines.push('');
  } else {
    lines.push('*No components found in C1, D1, E1, or X4.*\n');
  }

  // ── Technology Stack ──
  if (scaffold.technologyStack.length > 0) {
    lines.push('### Technology Stack (from D1)\n');
    lines.push('| Component | Technology | Scaling | SLA |');
    lines.push('|-----------|-----------|---------|-----|');
    for (const t of scaffold.technologyStack) {
      lines.push(`| ${t.name} | ${t.technology} | ${t.scaling || '—'} | ${t.sla || '—'} |`);
    }
    lines.push('');
  }

  // ── Cost Estimates ──
  if (scaffold.costs.length > 0) {
    lines.push('### Cost Estimation (from X4)\n');
    lines.push('| Category | Monthly Cost | Notes |');
    lines.push('|----------|-------------|-------|');
    for (const c of scaffold.costs) {
      lines.push(`| ${c.category} | ${c.monthlyCost} | ${c.notes || '—'} |`);
    }
    lines.push('');
  }

  // ── Capacity Assumptions ──
  if (scaffold.assumptions.length > 0) {
    lines.push('### Capacity Planning Assumptions (from X4)\n');
    lines.push('| Assumption | Value | Source |');
    lines.push('|------------|-------|--------|');
    for (const a of scaffold.assumptions) {
      lines.push(`| ${a.assumption} | ${a.value} | ${a.source || '—'} |`);
    }
    lines.push('');
  }

  // ── NFR Targets ──
  if (scaffold.nfrTargets.length > 0) {
    lines.push('### Performance & Quality Targets (from R1)\n');
    lines.push('| ID | Description | Priority | Category |');
    lines.push('|----|-------------|----------|----------|');
    for (const n of scaffold.nfrTargets) {
      lines.push(`| ${n.id} | ${n.description} | ${n.priority || '—'} | ${n.category || '—'} |`);
    }
    lines.push('');
  }

  // ── Scenario Load Hints ──
  if (scaffold.scenarioHints.length > 0) {
    lines.push('### Business Scenario Load Hints (from B3)\n');
    for (const s of scaffold.scenarioHints) {
      lines.push(`**${s.name}**`);
      lines.push(`- Actors: ${s.actors}`);
      if (s.implications.length > 0) {
        lines.push('- Architecture implications:');
        for (const impl of s.implications) {
          lines.push(`  - ${impl}`);
        }
      }
      lines.push('');
    }
  }

  // ── Summary ──
  const tbdCount = scaffold.components.filter(
    (c) => !c.peakTps || isTbd(c.peakTps || '')
  ).length;

  lines.push('---');
  lines.push(
    `*Scaffold: ${scaffold.components.length} components, ` +
    `${scaffold.costs.length} cost lines, ` +
    `${scaffold.nfrTargets.length} NFR targets, ` +
    `${scaffold.scenarioHints.length} scenario hints. ` +
    `${scaffold.hasExistingSizing ? 'X4 exists' : 'X4 not found'}. ` +
    `${tbdCount} components need sizing data.*\n`
  );

  return lines.join('\n');
}
