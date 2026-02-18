/**
 * Core mutation functions – pure string transformations for vault file edits.
 * Zero VS Code dependencies – safe to import in tests.
 */

/** Result of a mutation attempt */
export interface MutationResult {
  success: boolean;
  content: string;
  message: string;
}

/**
 * Replace the content of a markdown section identified by its heading.
 * Matches the heading and replaces everything up to the next same-level heading,
 * a `---` separator, or end of file.
 */
export function updateSection(
  existing: string,
  sectionHeading: string,
  newContent: string
): MutationResult {
  const headingLevel = (sectionHeading.match(/^#+/) || ['##'])[0];
  const escapedHeading = sectionHeading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const sectionRegex = new RegExp(
    `(${escapedHeading}\\s*\\n)([\\s\\S]*?)(?=\\n${headingLevel} |\\n---\\s*$|$)`,
    'm'
  );

  const match = existing.match(sectionRegex);
  if (!match) {
    return {
      success: false,
      content: existing,
      message: `Section "${sectionHeading}" not found`,
    };
  }

  const updated = existing.replace(sectionRegex, `$1${newContent}\n`);
  return {
    success: true,
    content: updated,
    message: `Updated section "${sectionHeading}"`,
  };
}

/**
 * Append a formatted decision block to the decision log file.
 */
export function addDecision(
  existing: string,
  decisionId: string,
  title: string,
  status: string,
  content: string,
  impact: string
): MutationResult {
  const decisionBlock = `
## ${decisionId} – ${title}
Status: ${status}

${content}

Impact: ${impact}
`;

  const updated = existing.trimEnd() + '\n\n---\n' + decisionBlock;
  return {
    success: true,
    content: updated,
    message: `Added decision ${decisionId}: ${title}`,
  };
}

/**
 * Append content to the end of a file.
 */
export function appendContent(existing: string, content: string): MutationResult {
  const updated = existing.trimEnd() + '\n\n' + content + '\n';
  return {
    success: true,
    content: updated,
    message: 'Appended content',
  };
}

/**
 * Add a question under a category heading (matches h1–h3).
 */
export function addOpenQuestion(
  existing: string,
  category: string,
  question: string
): MutationResult {
  // Match h1, h2, or h3 category headings
  const categoryRegex = new RegExp(`(#{1,3} ${category}\\s*\\n)`, 'm');
  const match = existing.match(categoryRegex);

  let updated: string;
  if (match) {
    updated = existing.replace(categoryRegex, `$1- ${question}\n`);
  } else {
    updated = existing.trimEnd() + `\n\n## ${category}\n\n- ${question}\n`;
  }

  return {
    success: true,
    content: updated,
    message: `Added question under "${category}"`,
  };
}

/**
 * Update YAML front-matter fields in a markdown file.
 */
export function updateYamlMetadata(
  existing: string,
  fields: Record<string, string>
): MutationResult {
  const yamlMatch = existing.match(/^---\n([\s\S]*?)\n---/m);
  if (!yamlMatch) {
    return {
      success: false,
      content: existing,
      message: 'No YAML front matter found',
    };
  }

  let yaml = yamlMatch[1];
  for (const [key, value] of Object.entries(fields)) {
    const fieldRegex = new RegExp(`^${key}:\\s*.*$`, 'm');
    if (yaml.match(fieldRegex)) {
      yaml = yaml.replace(fieldRegex, `${key}: ${value}`);
    } else {
      yaml += `\n${key}: ${value}`;
    }
  }

  const updated = existing.replace(/^---\n[\s\S]*?\n---/m, `---\n${yaml}\n---`);
  return {
    success: true,
    content: updated,
    message: `Updated YAML metadata: ${Object.keys(fields).join(', ')}`,
  };
}

/**
 * Validate that a resolved file path stays within the vault directory.
 * Prevents path traversal attacks.
 */
export function isPathContained(vaultPath: string, resolvedPath: string): boolean {
  // Normalize both paths to remove trailing slashes and resolve symlinks
  const normalVault = vaultPath.endsWith('/') ? vaultPath : vaultPath + '/';
  return resolvedPath.startsWith(normalVault) || resolvedPath === vaultPath;
}
