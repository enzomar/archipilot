/**
 * Core command parser – extracts structured architecture commands from LLM response text.
 * Zero VS Code dependencies – safe to import in tests and non-VS-Code contexts.
 */
import { ArchCommand } from '../types.js';

/**
 * Extract JSON command blocks from LLM response text.
 * Commands are expected inside ```json ... ``` code fences.
 */
export function parseCommands(responseText: string): ArchCommand[] {
  const commands: ArchCommand[] = [];
  const jsonBlockRegex = /```json\s*\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;

  while ((match = jsonBlockRegex.exec(responseText)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (parsed.command && parsed.file) {
        commands.push(parsed as ArchCommand);
      }
    } catch {
      // skip malformed JSON
    }
  }

  return commands;
}
