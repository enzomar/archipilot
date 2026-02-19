/**
 * Shared pure helpers for ADR, Diagram, and Graph features.
 * Used by both palette commands (features.ts) and chat handlers (participant.ts).
 * Zero VS Code dependencies.
 */

// ── ADR helpers ────────────────────────────────────────────────────

/** Default ADR front-matter when creating a fresh decision log file. */
export const ADR_DEFAULT_CONTENT =
  `---\ntype: decision-log\nstatus: draft\n---\n\n# Architecture Decision Log\n\n`;

/**
 * Compute the next ADR identifier (e.g. "AD-03") from existing file content.
 */
export function nextAdrId(content: string): string {
  const matches = content.match(/AD-(\d+)/g);
  let nextId = 1;
  if (matches) {
    const ids = matches.map((m) => parseInt(m.split('-')[1], 10));
    nextId = Math.max(...ids) + 1;
  }
  return `AD-${String(nextId).padStart(2, '0')}`;
}

/**
 * Format a new ADR entry block ready for appending.
 */
export function formatAdrEntry(idString: string, title: string, date: string): string {
  return (
    `\n## ${idString} — ${title}\n\n` +
    `| Field | Value |\n|-------|-------|\n` +
    `| **Status** | 🟡 Proposed |\n` +
    `| **Date Raised** | ${date} |\n` +
    `| **Owner** | TBD |\n` +
    `| **Phase** | Cross-phase |\n\n` +
    `### Context\n_Why do we need to make this decision?_\n\n` +
    `### Options\n- **Option A**\n- **Option B**\n\n` +
    `### Decision\n_Pending..._\n`
  );
}

// ── Diagram / graph helpers ────────────────────────────────────────

/**
 * Sanitise a string into a Mermaid-safe node identifier.
 * Prefixes with `n_` and replaces all non-alphanumeric characters.
 */
export function safeNodeId(s: string): string {
  return `n_${s.replace(/[^a-zA-Z0-9]/g, '_')}`;
}

/**
 * Extract `[[WikiLinks]]` from markdown text, handling `[[Link|Alias]]`
 * and `[[Link#Anchor]]` variants.
 *
 * @param text - Full markdown content.
 * @param excludeName - Optional filename to omit (avoids self-links).
 */
export function extractWikiLinks(text: string, excludeName?: string): Set<string> {
  const regex = /\[\[(.*?)\]\]/g;
  const links = new Set<string>();
  let match;
  while ((match = regex.exec(text)) !== null) {
    const link = match[1].split('|')[0].split('#')[0].trim();
    if (link && link !== excludeName) {
      links.add(link);
    }
  }
  return links;
}

/**
 * Generate a Mermaid flowchart for a single file's WikiLink connections.
 */
export function generateContextDiagramMermaid(
  fileName: string,
  links: Set<string>,
): string {
  let mermaid =
    `flowchart LR\n` +
    `    ${safeNodeId(fileName)}["${fileName}"]\n` +
    `    style ${safeNodeId(fileName)} fill:#6366f1,color:#fff,stroke:#4338ca\n`;
  links.forEach((link) => {
    mermaid += `    ${safeNodeId(fileName)} --> ${safeNodeId(link)}["${link}"]\n`;
  });
  return mermaid;
}

/**
 * Generate a full vault dependency graph as Mermaid flowchart.
 *
 * @param files - Array of `{ name, content }` vault file entries.
 * @returns `{ mermaid, nodeCount, edgeCount }`
 */
export function generateVaultGraphMermaid(
  files: ReadonlyArray<{ name: string; content: string }>,
): { mermaid: string; nodeCount: number; edgeCount: number } {
  const allNames = new Set(files.map((f) => f.name.replace(/\.md$/, '')));
  const edgeSet = new Set<string>();

  for (const file of files) {
    const from = file.name.replace(/\.md$/, '');
    const links = extractWikiLinks(file.content, from);
    for (const to of links) {
      if (allNames.has(to)) {
        edgeSet.add(`    ${safeNodeId(from)} --> ${safeNodeId(to)}`);
      }
    }
  }

  const nodeDecls = Array.from(allNames)
    .map((n) => `    ${safeNodeId(n)}["${n}"]`)
    .join('\n');
  const mermaid = `flowchart LR\n${nodeDecls}\n${[...edgeSet].join('\n')}`;

  return { mermaid, nodeCount: allNames.size, edgeCount: edgeSet.size };
}
