/**
 * Shared types and helpers for vault template modules.
 */

export interface TemplateFile {
  name: string;
  content: string;
}

export type YamlFn = (fields: Record<string, string | string[]>) => string;

/**
 * Signature every template builder must implement.
 *
 * @param d           - Today's date string (YYYY-MM-DD)
 * @param projectName - Name of the architecture project
 * @param yaml        - Helper that builds a YAML front-matter block
 */
export type TemplateBuilder = (d: string, projectName: string, yaml: YamlFn) => TemplateFile;
