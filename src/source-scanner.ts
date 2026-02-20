/**
 * source-scanner.ts – Workspace source code scanner for vault generation.
 *
 * Scans the active workspace for architectural signals (package manifests,
 * data models, service/controller files, infrastructure configs, API specs,
 * READMEs) and returns a structured ScanResult that can be fed to the LLM
 * to populate or enrich a TOGAF-aligned vault.
 *
 * NOTE: This module uses the VS Code API so it lives in src/ (not src/core/).
 */
import * as vscode from 'vscode';

/** A single file that was scanned – relative path + (possibly truncated) content. */
export interface ScannedFile {
  path: string;
  relativePath: string;
  content: string;
}

/** The full result of a workspace scan, grouped by TOGAF domain signals. */
export interface ScanResult {
  /** Inferred project name (from package.json "name", or workspace folder name). */
  projectName: string;
  /** package.json, requirements.txt, pom.xml, Cargo.toml, go.mod, etc. */
  packageFiles: ScannedFile[];
  /** ORM models, Prisma schemas, SQL migrations, TypeScript interfaces, etc. */
  modelFiles: ScannedFile[];
  /** Services, controllers, routes, handlers, use-cases. */
  serviceFiles: ScannedFile[];
  /** Dockerfiles, docker-compose, Terraform, Kubernetes manifests. */
  infraFiles: ScannedFile[];
  /** OpenAPI / Swagger specs. */
  apiSpecFiles: ScannedFile[];
  /** README and top-level documentation. */
  readmeFiles: ScannedFile[];
  /** .env.example, config files. */
  configFiles: ScannedFile[];
  /** Total number of files scanned across all categories. */
  totalFilesScanned: number;
}

// ── Scan tuning knobs ──────────────────────────────────────────────────────
/** Maximum characters read per file before truncation. */
const MAX_FILE_CHARS = 4000;
/** Maximum files picked up per category (to stay within token limits). */
const MAX_FILES_PER_CATEGORY = 6;

const IGNORE_GLOB =
  '{**/node_modules/**,**/.git/**,**/dist/**,**/out/**,**/build/**,' +
  '**/__pycache__/**,**/.venv/**,**/venv/**,**/.tox/**,**/target/**,' +
  '**/vendor/**,**/.next/**,**/.nuxt/**}';

// ── Helpers ────────────────────────────────────────────────────────────────

/** Read a file safely, returning null on failure, and truncating large files. */
async function readFileSafe(
  uri: vscode.Uri,
  workspaceRoot: string
): Promise<ScannedFile | null> {
  try {
    const bytes = await vscode.workspace.fs.readFile(uri);
    let content = Buffer.from(bytes).toString('utf-8');
    if (content.length > MAX_FILE_CHARS) {
      content = content.slice(0, MAX_FILE_CHARS) + '\n... (truncated)';
    }
    const relativePath = uri.fsPath.startsWith(workspaceRoot)
      ? uri.fsPath.slice(workspaceRoot.length + 1)
      : uri.fsPath;
    return { path: uri.fsPath, relativePath, content };
  } catch {
    return null;
  }
}

/** Find files matching a glob, read them, and return structured results. */
async function findAndRead(
  pattern: string,
  workspaceRoot: string,
  limit = MAX_FILES_PER_CATEGORY
): Promise<ScannedFile[]> {
  const uris = await vscode.workspace.findFiles(pattern, IGNORE_GLOB, limit);
  const results: ScannedFile[] = [];
  for (const uri of uris) {
    const f = await readFileSafe(uri, workspaceRoot);
    if (f) {
      results.push(f);
    }
  }
  return results;
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Scan the workspace for architectural signals.
 *
 * @param workspaceRoot Absolute path to the workspace root folder.
 * @returns A structured ScanResult grouped by TOGAF domain.
 */
export async function scanWorkspaceFiles(workspaceRoot: string): Promise<ScanResult> {
  const [
    packageFiles,
    modelFiles,
    serviceFiles,
    infraFiles,
    apiSpecFiles,
    readmeFiles,
    configFiles,
  ] = await Promise.all([
    // ── Technology layer ──
    // Dependency / package manifests reveal the tech stack and frameworks.
    findAndRead(
      '{package.json,requirements.txt,Pipfile,pyproject.toml,pom.xml,build.gradle,' +
      'Cargo.toml,go.mod,*.gemspec,composer.json,mix.exs}',
      workspaceRoot
    ),

    // ── Data layer ──
    // ORM models, Prisma schemas, SQL migrations, TypeScript interfaces.
    findAndRead(
      '{**/models/**/*.{py,ts,js,java,cs,rb,go,rs},' +
      '**/entities/**/*.{py,ts,js,java,cs,rb},' +
      '**/schemas/**/*.{py,ts,js,json},' +
      '**/*.prisma,' +
      '**/migrations/**/*.{sql,py,ts,js},' +
      '**/db/**/*.{sql,ts,js,py}}',
      workspaceRoot
    ),

    // ── Application layer ──
    // Services, controllers, route handlers, use-cases.
    findAndRead(
      '{**/services/**/*.{py,ts,js,java,cs,rb,go},' +
      '**/controllers/**/*.{py,ts,js,java,cs,rb},' +
      '**/routes/**/*.{py,ts,js},' +
      '**/handlers/**/*.{py,ts,js,java,cs,go},' +
      '**/use-cases/**/*.{py,ts,js},' +
      '**/api/**/*.{py,ts,js,java,go},' +
      '**/usecases/**/*.{py,ts,js}}',
      workspaceRoot
    ),

    // ── Technology / Infrastructure layer ──
    // Docker, Kubernetes, Terraform, cloud configs.
    findAndRead(
      '{Dockerfile,Dockerfile.*,' +
      'docker-compose.yml,docker-compose.yaml,' +
      'docker-compose.*.yml,docker-compose.*.yaml,' +
      '**/*.tf,**/*.tfvars,' +
      '**/k8s/**/*.{yaml,yml},' +
      '**/kubernetes/**/*.{yaml,yml},' +
      '**/helm/**/*.{yaml,yml},' +
      '**/.github/workflows/*.{yml,yaml},' +
      '**/ci/**/*.{yml,yaml}}',
      workspaceRoot
    ),

    // ── Business / Application layer ──
    // OpenAPI / Swagger specs reveal APIs, operations, and business capabilities.
    findAndRead(
      '{**/openapi*.{yaml,yml,json},' +
      '**/swagger*.{yaml,yml,json},' +
      '**/api-spec*.{yaml,yml,json},' +
      '**/api-docs*.{yaml,yml,json}}',
      workspaceRoot
    ),

    // ── Business / Vision layer ──
    // READMEs and top-level docs reveal intent, context, and objectives.
    findAndRead(
      '{README.md,README.rst,README.txt,' +
      'ARCHITECTURE.md,docs/ARCHITECTURE.md,' +
      'docs/overview.md,docs/README.md}',
      workspaceRoot,
      4
    ),

    // ── Technology / Config layer ──
    // Environment templates and config files reveal integration points.
    findAndRead(
      '{.env.example,.env.sample,' +
      '**/config/**/*.{yaml,yml,json,toml},' +
      '**/application.{yaml,yml,properties},' +
      '**/settings.{py,ts,js},' +
      '**/appsettings.json}',
      workspaceRoot
    ),
  ]);

  // ── Infer project name ────────────────────────────────────────────────────
  let projectName = workspaceRoot.split('/').pop() || 'Scanned-Project';

  // Prefer package.json "name" field
  const pkgJson = packageFiles.find(
    (f) => f.relativePath === 'package.json' || f.relativePath.endsWith('/package.json')
  );
  if (pkgJson) {
    try {
      const parsed = JSON.parse(pkgJson.content.replace(/\.\.\. \(truncated\)$/, ''));
      if (parsed?.name) {
        projectName = parsed.name;
      }
    } catch {
      // ignore parse errors
    }
  }

  // Fallback: pyproject.toml [project] name
  if (projectName === workspaceRoot.split('/').pop()) {
    const pyproject = packageFiles.find((f) => f.relativePath === 'pyproject.toml');
    if (pyproject) {
      const match = pyproject.content.match(/name\s*=\s*["']([^"']+)["']/);
      if (match) {
        projectName = match[1];
      }
    }
  }

  return {
    projectName,
    packageFiles,
    modelFiles,
    serviceFiles,
    infraFiles,
    apiSpecFiles,
    readmeFiles,
    configFiles,
    totalFilesScanned:
      packageFiles.length +
      modelFiles.length +
      serviceFiles.length +
      infraFiles.length +
      apiSpecFiles.length +
      readmeFiles.length +
      configFiles.length,
  };
}

/**
 * Serialize a ScanResult into a structured markdown block suitable
 * for inclusion in an LLM prompt.
 */
export function formatScanContext(scan: ScanResult): string {
  const sections: string[] = [`# Source Code Scan: ${scan.projectName}\n`];

  function addSection(title: string, files: ScannedFile[]): void {
    if (files.length === 0) {
      return;
    }
    sections.push(`\n## ${title}\n`);
    for (const f of files) {
      const ext = f.relativePath.split('.').pop() ?? '';
      const lang = EXT_LANG[ext] ?? ext;
      sections.push(`### ${f.relativePath}\n\`\`\`${lang}\n${f.content}\n\`\`\`\n`);
    }
  }

  addSection('README / Documentation', scan.readmeFiles);
  addSection('Package / Dependency Files (Technology Stack)', scan.packageFiles);
  addSection('API Specifications (Business Capabilities)', scan.apiSpecFiles);
  addSection('Data Models / Schemas (Data Architecture)', scan.modelFiles);
  addSection('Services / Controllers / Routes (Application Architecture)', scan.serviceFiles);
  addSection('Infrastructure / Deployment (Technology Architecture)', scan.infraFiles);
  addSection('Configuration / Environment Files (Integration Points)', scan.configFiles);

  return sections.join('\n');
}

/** Map common file extensions to language identifiers for code fences. */
const EXT_LANG: Record<string, string> = {
  ts: 'typescript',
  js: 'javascript',
  py: 'python',
  java: 'java',
  cs: 'csharp',
  go: 'go',
  rs: 'rust',
  rb: 'ruby',
  yaml: 'yaml',
  yml: 'yaml',
  json: 'json',
  toml: 'toml',
  tf: 'hcl',
  sql: 'sql',
  md: 'markdown',
  prisma: 'prisma',
  dockerfile: 'dockerfile',
};
