/**
 * source-scanner.ts – Aggressive workspace source code scanner for vault generation.
 *
 * Strategy: discover ALL source files broadly by extension, then classify them
 * into TOGAF-relevant categories using path heuristics AND content analysis.
 * No assumptions about folder naming conventions — works on any codebase.
 *
 * Additional signals come from currently open editors in VS Code and the
 * workspace file tree structure itself.
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
  /** High-priority files from open editors that don't fit other categories. */
  openEditorFiles: ScannedFile[];
  /** Directory tree overview of the workspace (for structural analysis). */
  directoryTree: string;
  /** Total number of files scanned across all categories. */
  totalFilesScanned: number;
}

// ── Scan tuning knobs ──────────────────────────────────────────────────────
/** Maximum characters read per file before truncation. */
const MAX_FILE_CHARS = 4000;
/** Maximum files picked up per category (to stay within token limits). */
const MAX_FILES_PER_CATEGORY = 8;
/** Maximum total source files to discover in broad scan. */
const MAX_DISCOVERY_FILES = 200;
/** Maximum depth for directory tree. */
const MAX_TREE_DEPTH = 4;

/** Directories to skip during scanning. */
const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'out', 'build', '__pycache__',
  '.venv', 'venv', '.tox', 'target', 'vendor', '.next', '.nuxt',
  '.cache', '.idea', '.vscode', '.gradle', 'coverage', '.nyc_output',
  'tmp', 'temp', '.eggs', '*.egg-info', '.mypy_cache', '.pytest_cache',
  '.terraform', '.serverless', 'bower_components', 'jspm_packages',
]);

const IGNORE_GLOB =
  '{**/node_modules/**,**/.git/**,**/dist/**,**/out/**,**/build/**,' +
  '**/__pycache__/**,**/.venv/**,**/venv/**,**/.tox/**,**/target/**,' +
  '**/vendor/**,**/.next/**,**/.nuxt/**,**/.cache/**,**/coverage/**}';

// ── Source file extensions we care about ──────────────────────────────────
const SOURCE_EXTENSIONS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs',
  'py', 'pyi',
  'java', 'kt', 'kts', 'scala',
  'cs', 'fs', 'vb',
  'go',
  'rs',
  'rb', 'erb',
  'php',
  'swift',
  'dart',
  'ex', 'exs',
  'clj', 'cljs',
  'lua',
  'r', 'R',
  'cpp', 'cc', 'c', 'h', 'hpp',
  'prisma',
  'proto',
  'graphql', 'gql',
  'sql',
]);

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

/**
 * Find files matching MULTIPLE simple glob patterns (avoids nested {} groups).
 * Each pattern is searched individually and results are merged & deduplicated.
 */
async function findAndReadMulti(
  patterns: string[],
  workspaceRoot: string,
  limit = MAX_FILES_PER_CATEGORY
): Promise<ScannedFile[]> {
  const seen = new Set<string>();
  const results: ScannedFile[] = [];
  const allUris = await Promise.all(
    patterns.map((p) => vscode.workspace.findFiles(p, IGNORE_GLOB, limit))
  );
  for (const uris of allUris) {
    for (const uri of uris) {
      if (seen.has(uri.fsPath) || results.length >= limit) {
        continue;
      }
      seen.add(uri.fsPath);
      const f = await readFileSafe(uri, workspaceRoot);
      if (f) {
        results.push(f);
      }
    }
  }
  return results;
}

// ── Content-based classification ───────────────────────────────────────────

type FileCategory = 'model' | 'service' | 'infra' | 'config' | 'api-spec' | 'general';

/** Classify a file by its path AND content into a TOGAF-relevant category. */
function classifyFile(file: ScannedFile): FileCategory {
  const p = file.relativePath.toLowerCase();
  const c = file.content.toLowerCase();

  // ── API specs (check first, very specific) ──
  if (/openapi|swagger/.test(p) ||
      /["']openapi["']\s*:\s*["']\d/.test(c) ||
      /swagger\s*:\s*["']\d/.test(c)) {
    return 'api-spec';
  }

  // ── Infrastructure (Docker, K8s, Terraform, CI/CD) ──
  if (/dockerfile/i.test(p) ||
      /docker-compose/i.test(p) ||
      /\.tf$|\.tfvars$/.test(p) ||
      /\.github\/workflows\//.test(p) ||
      /k8s|kubernetes|helm|\.chart/i.test(p) ||
      /jenkinsfile/i.test(p) ||
      /\.gitlab-ci/i.test(p) ||
      /cloudbuild/i.test(p) ||
      /serverless\.(yml|yaml|json|ts)$/i.test(p) ||
      /^from\s+\w+.*\n.*\b(run|cmd|entrypoint|expose)\b/m.test(c) ||
      /resource\s+"(aws|azurerm|google)_/.test(c) ||
      /apiversion:\s*apps\/v1/i.test(c) ||
      /kind:\s*(deployment|service|ingress|statefulset|daemonset)/i.test(c)) {
    return 'infra';
  }

  // ── Config files ──
  if (/\.env(\.(example|sample|local|dev|prod|staging))?$/.test(p) ||
      /appsettings.*\.json$/.test(p) ||
      /application\.(yaml|yml|properties)$/.test(p) ||
      /settings\.(py|ts|js)$/.test(p) ||
      /(^|\/)config\.(ts|js|py|yaml|yml|json|toml)$/.test(p) ||
      /\.config\.(ts|js|mjs|cjs)$/.test(p)) {
    return 'config';
  }

  // ── Data models (content-based: ORMs, schemas, SQL, entities) ──
  if (/\.prisma$|\.proto$|\.graphql$|\.gql$|\.sql$/.test(p) ||
      /migration/i.test(p) ||
      // ORM / model decorators and patterns
      /@entity|@table|@column|@model|@field/.test(c) ||
      /class\s+\w+.*extends\s+(model|baseentity|entity|activerecord)/i.test(c) ||
      /sequelize\.define|mongoose\.schema|mongoose\.model/i.test(c) ||
      /db\.model|typeorm|prisma|drizzle/i.test(c) ||
      /create\s+table\b|alter\s+table\b/i.test(c) ||
      /schema\s*=\s*(new\s+)?schema\s*\(/i.test(c) ||
      // SQLAlchemy / Django models
      /class\s+\w+\s*\(\s*(db\.model|models\.model|base)\s*\)/i.test(c) ||
      /mapped_column|declarative_base|__tablename__/i.test(c) ||
      // Type definitions / DTOs / interfaces that look like data models
      /(export\s+)?(interface|type)\s+\w+(entity|model|dto|schema|record)\b/i.test(c) ||
      // Protobuf / gRPC
      /^syntax\s*=\s*"proto[23]"/m.test(c) ||
      /message\s+\w+\s*\{[^}]*\bint32\b|\bstring\b|\bbool\b/i.test(c)) {
    return 'model';
  }

  // ── Services / Controllers / Handlers / Routes ──
  if (// Filename hints (soft — path anywhere, not just folder names)
      /(service|controller|handler|route|router|middleware|resolver|endpoint|use[_-]?case)/i.test(p) ||
      // Express / Koa / Fastify route definitions
      /\.(get|post|put|patch|delete|all)\s*\(\s*['"`\/]/.test(c) ||
      /app\.(get|post|put|patch|delete)\s*\(/.test(c) ||
      /router\.(get|post|put|patch|delete)\s*\(/.test(c) ||
      // Spring / Java annotations
      /@(rest)?controller|@requestmapping|@getmapping|@postmapping/i.test(c) ||
      /@service\b/i.test(c) ||
      // ASP.NET
      /\[http(get|post|put|delete|patch)\]/i.test(c) ||
      /controllerbase|apicontroller/i.test(c) ||
      // Python frameworks (Flask, FastAPI, Django)
      /@app\.(get|post|put|patch|delete|route)\b/.test(c) ||
      /apiview|viewset|genericapiview/i.test(c) ||
      // Go HTTP handlers
      /func\s+\w+\(w\s+http\.ResponseWriter/i.test(c) ||
      /http\.handle(func)?\s*\(/.test(c) ||
      // Ruby on Rails
      /class\s+\w+controller\s*</i.test(c) ||
      // NestJS / Angular decorators
      /@controller\s*\(|@injectable\s*\(/i.test(c) ||
      // gRPC service implementations
      /implements\s+\w+server/i.test(c) ||
      /grpc\.\w+server/i.test(c)) {
    return 'service';
  }

  return 'general';
}

/**
 * Collect open editor files as high-priority scan candidates.
 * These files are what the developer is actively working on.
 */
async function collectOpenEditorFiles(
  workspaceRoot: string
): Promise<ScannedFile[]> {
  const results: ScannedFile[] = [];
  const seen = new Set<string>();
  for (const tabGroup of vscode.window.tabGroups.all) {
    for (const tab of tabGroup.tabs) {
      if (results.length >= MAX_FILES_PER_CATEGORY) {
        break;
      }
      const input = tab.input;
      if (input instanceof vscode.TabInputText) {
        const uri = input.uri;
        if (uri.scheme !== 'file' || seen.has(uri.fsPath)) {
          continue;
        }
        // Skip files outside workspace
        if (!uri.fsPath.startsWith(workspaceRoot)) {
          continue;
        }
        seen.add(uri.fsPath);
        const f = await readFileSafe(uri, workspaceRoot);
        if (f) {
          results.push(f);
        }
      }
    }
  }
  return results;
}

/**
 * Build a compact directory tree of the workspace for structural analysis.
 * The LLM can use this to understand the project layout even for files we
 * didn't read.
 */
async function buildDirectoryTree(
  rootUri: vscode.Uri,
  depth = 0,
  prefix = ''
): Promise<string> {
  if (depth >= MAX_TREE_DEPTH) {
    return prefix + '...\n';
  }
  let result = '';
  try {
    const entries = await vscode.workspace.fs.readDirectory(rootUri);
    // Sort: folders first, then files
    entries.sort((a, b) => {
      if (a[1] === b[1]) {
        return a[0].localeCompare(b[0]);
      }
      return a[1] === vscode.FileType.Directory ? -1 : 1;
    });
    for (const [name, type] of entries) {
      if (IGNORE_DIRS.has(name) || name.startsWith('.')) {
        continue;
      }
      if (type === vscode.FileType.Directory) {
        result += `${prefix}${name}/\n`;
        const childUri = vscode.Uri.joinPath(rootUri, name);
        result += await buildDirectoryTree(childUri, depth + 1, prefix + '  ');
      } else {
        result += `${prefix}${name}\n`;
      }
    }
  } catch {
    // permission errors, etc.
  }
  return result;
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Scan the workspace aggressively for architectural signals.
 *
 * Strategy:
 * 1. Discover ALL source files by extension (no folder name assumptions).
 * 2. Classify each file by path hints AND content analysis.
 * 3. Collect currently open editor files as high-priority signals.
 * 4. Build a directory tree for structural context.
 * 5. Return everything grouped by TOGAF domain.
 *
 * @param workspaceRoot Absolute path to the workspace root folder.
 * @returns A structured ScanResult grouped by TOGAF domain.
 */
export async function scanWorkspaceFiles(workspaceRoot: string): Promise<ScanResult> {
  // ── Phase 1: Collect files from well-known globs (no nested alternation) ──

  // Package manifests — each is a simple top-level glob
  const packagePatterns = [
    'package.json',
    '**/package.json',
    'requirements.txt',
    '**/requirements.txt',
    'Pipfile',
    'pyproject.toml',
    'pom.xml',
    '**/pom.xml',
    'build.gradle',
    '**/build.gradle',
    'build.gradle.kts',
    'Cargo.toml',
    'go.mod',
    '*.gemspec',
    'Gemfile',
    'composer.json',
    'mix.exs',
    'pubspec.yaml',
    'Package.swift',
    'CMakeLists.txt',
    'Makefile',
    '*.csproj',
    '*.fsproj',
    '*.sln',
  ];

  // Infrastructure files — each is a simple glob
  const infraPatterns = [
    'Dockerfile',
    '**/Dockerfile',
    '**/Dockerfile.*',
    'docker-compose.yml',
    'docker-compose.yaml',
    '**/docker-compose*.yml',
    '**/docker-compose*.yaml',
    '**/*.tf',
    '**/*.tfvars',
    '**/*.yaml',   // we'll filter by content for k8s
    '**/*.yml',    // we'll filter by content for k8s
    '**/.github/workflows/*.yml',
    '**/.github/workflows/*.yaml',
    '.gitlab-ci.yml',
    '**/Jenkinsfile',
    '**/cloudbuild.yaml',
    '**/serverless.yml',
    '**/serverless.yaml',
    '**/serverless.ts',
  ];

  // API spec files
  const apiSpecPatterns = [
    '**/openapi*.yaml',
    '**/openapi*.yml',
    '**/openapi*.json',
    '**/swagger*.yaml',
    '**/swagger*.yml',
    '**/swagger*.json',
    '**/api-spec*.yaml',
    '**/api-spec*.yml',
    '**/api-spec*.json',
    '**/api-docs*.yaml',
    '**/api-docs*.yml',
    '**/api-docs*.json',
  ];

  // README / documentation files
  const readmePatterns = [
    'README.md',
    'README.rst',
    'README.txt',
    'README',
    'ARCHITECTURE.md',
    '**/ARCHITECTURE.md',
    'docs/README.md',
    'docs/overview.md',
    'doc/README.md',
    'DESIGN.md',
    '**/DESIGN.md',
    'CONTRIBUTING.md',
  ];

  // Config files
  const configPatterns = [
    '.env.example',
    '.env.sample',
    '.env.local',
    '.env.development',
    '.env.production',
    '**/appsettings*.json',
    '**/application.yaml',
    '**/application.yml',
    '**/application.properties',
    '**/application-*.yaml',
    '**/application-*.yml',
    '**/*.config.ts',
    '**/*.config.js',
    '**/*.config.mjs',
    '**/*.config.cjs',
    '**/config.yaml',
    '**/config.yml',
    '**/config.json',
    '**/config.toml',
    '**/settings.py',
    '**/settings.ts',
    '**/settings.js',
  ];

  // ── Phase 2: Broad discovery — ALL source files by extension ──
  // This is the key change: we don't assume folder structure.
  // We scan every source file and classify by content.
  const sourcePatterns = Array.from(SOURCE_EXTENSIONS).map((ext) => `**/*.${ext}`);

  // Run all discovery in parallel
  const [
    packageFiles,
    readmeFiles,
    apiSpecFiles,
    configFiles,
    openEditorFiles,
    directoryTree,
    ...sourceUriArrays
  ] = await Promise.all([
    findAndReadMulti(packagePatterns, workspaceRoot, MAX_FILES_PER_CATEGORY),
    findAndReadMulti(readmePatterns, workspaceRoot, 6),
    findAndReadMulti(apiSpecPatterns, workspaceRoot, MAX_FILES_PER_CATEGORY),
    findAndReadMulti(configPatterns, workspaceRoot, MAX_FILES_PER_CATEGORY),
    collectOpenEditorFiles(workspaceRoot),
    buildDirectoryTree(vscode.Uri.file(workspaceRoot)),
    // Discover all source files by extension (flattened later)
    ...sourcePatterns.map((p) =>
      vscode.workspace.findFiles(p, IGNORE_GLOB, MAX_DISCOVERY_FILES)
    ),
  ]);

  // Merge all discovered source URIs
  const allSourceUris: vscode.Uri[] = [];
  const seenPaths = new Set<string>();
  // Also collect paths we already categorized
  for (const list of [packageFiles, readmeFiles, apiSpecFiles, configFiles]) {
    for (const f of list) {
      seenPaths.add(f.path);
    }
  }
  for (const uriArr of sourceUriArrays) {
    for (const uri of uriArr as vscode.Uri[]) {
      if (!seenPaths.has(uri.fsPath)) {
        seenPaths.add(uri.fsPath);
        allSourceUris.push(uri);
      }
    }
  }

  // ── Phase 3: Read & classify a sample of discovered source files ──
  // Prioritise: open editors first, then top-level files, then deeper files
  const openEditorPaths = new Set(openEditorFiles.map((f) => f.path));
  allSourceUris.sort((a, b) => {
    // Open editors get top priority
    const aOpen = openEditorPaths.has(a.fsPath) ? 0 : 1;
    const bOpen = openEditorPaths.has(b.fsPath) ? 0 : 1;
    if (aOpen !== bOpen) {
      return aOpen - bOpen;
    }
    // Prefer shallower files (closer to root = more architecturally significant)
    const aDepth = a.fsPath.split('/').length;
    const bDepth = b.fsPath.split('/').length;
    return aDepth - bDepth;
  });

  // Read up to a generous limit, then classify
  const MAX_TO_CLASSIFY = 60;
  const modelFiles: ScannedFile[] = [];
  const serviceFiles: ScannedFile[] = [];
  const infraFiles: ScannedFile[] = [];
  const extraApiSpecs: ScannedFile[] = [];
  const extraConfigFiles: ScannedFile[] = [];
  const generalFiles: ScannedFile[] = [];

  for (const uri of allSourceUris.slice(0, MAX_TO_CLASSIFY)) {
    const f = await readFileSafe(uri, workspaceRoot);
    if (!f) {
      continue;
    }
    const category = classifyFile(f);
    switch (category) {
      case 'model':
        if (modelFiles.length < MAX_FILES_PER_CATEGORY) {
          modelFiles.push(f);
        }
        break;
      case 'service':
        if (serviceFiles.length < MAX_FILES_PER_CATEGORY) {
          serviceFiles.push(f);
        }
        break;
      case 'infra':
        if (infraFiles.length < MAX_FILES_PER_CATEGORY) {
          infraFiles.push(f);
        }
        break;
      case 'api-spec':
        if (extraApiSpecs.length < MAX_FILES_PER_CATEGORY) {
          extraApiSpecs.push(f);
        }
        break;
      case 'config':
        if (extraConfigFiles.length < MAX_FILES_PER_CATEGORY) {
          extraConfigFiles.push(f);
        }
        break;
      default:
        if (generalFiles.length < MAX_FILES_PER_CATEGORY) {
          generalFiles.push(f);
        }
        break;
    }
  }

  // Also scan infra-specific files separately (Dockerfiles, yaml etc.)
  // but only read the ones that look like infra by content
  const infraCandidateUris = await Promise.all(
    infraPatterns
      .filter((p) => !p.endsWith('.yaml') && !p.endsWith('.yml'))
      .map((p) => vscode.workspace.findFiles(p, IGNORE_GLOB, 6))
  );
  for (const uriArr of infraCandidateUris) {
    for (const uri of uriArr) {
      if (seenPaths.has(uri.fsPath) || infraFiles.length >= MAX_FILES_PER_CATEGORY) {
        continue;
      }
      seenPaths.add(uri.fsPath);
      const f = await readFileSafe(uri, workspaceRoot);
      if (f) {
        infraFiles.push(f);
      }
    }
  }

  // Merge extra api-specs and configs discovered via content classification
  const mergedApiSpecs = dedup([...apiSpecFiles, ...extraApiSpecs]);
  const mergedConfigFiles = dedup([...configFiles, ...extraConfigFiles]);

  // Identify open editor files that weren't already classified elsewhere
  const allClassified = new Set([
    ...packageFiles.map((f) => f.path),
    ...modelFiles.map((f) => f.path),
    ...serviceFiles.map((f) => f.path),
    ...infraFiles.map((f) => f.path),
    ...mergedApiSpecs.map((f) => f.path),
    ...readmeFiles.map((f) => f.path),
    ...mergedConfigFiles.map((f) => f.path),
  ]);
  const uniqueEditorFiles = openEditorFiles.filter((f) => !allClassified.has(f.path));

  // ── Infer project name ────────────────────────────────────────────────────
  let projectName = workspaceRoot.split('/').pop() || 'Scanned-Project';

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

  // Fallback: pyproject.toml
  if (projectName === workspaceRoot.split('/').pop()) {
    const pyproject = packageFiles.find((f) => f.relativePath === 'pyproject.toml');
    if (pyproject) {
      const match = pyproject.content.match(/name\s*=\s*["']([^"']+)["']/);
      if (match) {
        projectName = match[1];
      }
    }
  }

  // Fallback: Cargo.toml
  if (projectName === workspaceRoot.split('/').pop()) {
    const cargoToml = packageFiles.find((f) => f.relativePath === 'Cargo.toml');
    if (cargoToml) {
      const match = cargoToml.content.match(/name\s*=\s*["']([^"']+)["']/);
      if (match) {
        projectName = match[1];
      }
    }
  }

  // Fallback: pom.xml artifactId
  if (projectName === workspaceRoot.split('/').pop()) {
    const pomXml = packageFiles.find((f) => f.relativePath === 'pom.xml');
    if (pomXml) {
      const match = pomXml.content.match(/<artifactId>([^<]+)<\/artifactId>/);
      if (match) {
        projectName = match[1];
      }
    }
  }

  // Fallback: go.mod module
  if (projectName === workspaceRoot.split('/').pop()) {
    const goMod = packageFiles.find((f) => f.relativePath === 'go.mod');
    if (goMod) {
      const match = goMod.content.match(/module\s+(\S+)/);
      if (match) {
        projectName = match[1].split('/').pop() || match[1];
      }
    }
  }

  const totalFilesScanned =
    packageFiles.length +
    modelFiles.length +
    serviceFiles.length +
    infraFiles.length +
    mergedApiSpecs.length +
    readmeFiles.length +
    mergedConfigFiles.length +
    uniqueEditorFiles.length;

  return {
    projectName,
    packageFiles,
    modelFiles,
    serviceFiles,
    infraFiles,
    apiSpecFiles: mergedApiSpecs,
    readmeFiles,
    configFiles: mergedConfigFiles,
    openEditorFiles: uniqueEditorFiles,
    directoryTree,
    totalFilesScanned,
  };
}

/** Deduplicate ScannedFile arrays by path. */
function dedup(files: ScannedFile[]): ScannedFile[] {
  const seen = new Set<string>();
  return files.filter((f) => {
    if (seen.has(f.path)) {
      return false;
    }
    seen.add(f.path);
    return true;
  });
}

/**
 * Serialize a ScanResult into a structured markdown block suitable
 * for inclusion in an LLM prompt.
 */
export function formatScanContext(scan: ScanResult): string {
  const sections: string[] = [`# Source Code Scan: ${scan.projectName}\n`];

  // Include directory tree so the LLM can understand the project layout
  if (scan.directoryTree) {
    sections.push(`\n## Project Directory Structure\n`);
    sections.push('```\n' + scan.directoryTree + '```\n');
  }

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
  addSection('Open Editor Files (Active Development Context)', scan.openEditorFiles);

  return sections.join('\n');
}

/** Map common file extensions to language identifiers for code fences. */
const EXT_LANG: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  py: 'python',
  pyi: 'python',
  java: 'java',
  kt: 'kotlin',
  kts: 'kotlin',
  scala: 'scala',
  cs: 'csharp',
  fs: 'fsharp',
  go: 'go',
  rs: 'rust',
  rb: 'ruby',
  php: 'php',
  swift: 'swift',
  dart: 'dart',
  ex: 'elixir',
  exs: 'elixir',
  clj: 'clojure',
  lua: 'lua',
  r: 'r',
  R: 'r',
  cpp: 'cpp',
  cc: 'cpp',
  c: 'c',
  h: 'c',
  hpp: 'cpp',
  yaml: 'yaml',
  yml: 'yaml',
  json: 'json',
  toml: 'toml',
  tf: 'hcl',
  sql: 'sql',
  md: 'markdown',
  prisma: 'prisma',
  proto: 'protobuf',
  graphql: 'graphql',
  gql: 'graphql',
  dockerfile: 'dockerfile',
};
