# Safety Model

archipilot enforces multiple safety layers to ensure you stay in control of all vault changes.

---

## Safety Features

| Feature | Description |
|---------|-------------|
| **Diff preview** | Every `/update` shows a visual diff before applying changes |
| **Confirmation dialog** | "Apply All" / "Cancel" modal before any write operation |
| **Dry-run mode** | Append `--dry-run` or `--preview` to see changes without writing |
| **File backup** | Pre-write copy saved to `.archipilot/backups/{name}.{timestamp}.md` |
| **Audit log** | Every mutation logged to `.archipilot/audit.log` (JSONL format) |
| **Schema validation** | Commands validated for required fields, safe paths, and known types |
| **Confidence markers** | LLM prefixes extrapolations with ⚠️ to reduce hallucination risk |

---

## How It Works

### 1. Diff Preview

When you run `/update`, archipilot:

1. Parses your natural language instruction
2. Generates structured mutation commands
3. Shows a **side-by-side diff** of every file that would change
4. Waits for your explicit confirmation

You see exactly what will change before anything is written.

### 2. Confirmation Dialog

A modal dialog appears with two options:

- **Apply All** — Write the changes to disk
- **Cancel** — Discard everything, no files touched

No changes are made until you click "Apply All".

### 3. Dry-Run Mode

Append `--dry-run` or `--preview` to any `/update` command:

```
@architect /update Add risk R-06 --dry-run
```

This shows the full diff preview but **never writes to disk**, regardless of what you click.

### 4. File Backup

Before any file is modified, a timestamped copy is saved:

```
.archipilot/backups/C1_Application_Architecture.2026-02-19T14-30-00.md
```

To restore, simply copy the backup over the current file.

### 5. Audit Log

Every mutation is appended to `.archipilot/audit.log` in JSONL format:

```json
{
  "timestamp": "2026-02-19T14:30:00.000Z",
  "command": "update",
  "file": "C1_Application_Architecture.md",
  "operation": "add_row",
  "details": "Added dependency DEP-07"
}
```

Use this for traceability, compliance, and debugging.

### 6. Schema Validation

Before execution, every command is validated for:

- Required fields are present
- File paths are within the vault (no path traversal)
- Operation types are known and supported
- Values match expected formats

Invalid commands are rejected with a clear error message.

### 7. Confidence Markers

When the LLM infers information not explicitly stated in the vault, it prefixes those sections with ⚠️. This helps you distinguish between:

- **Vault-sourced facts** — directly extracted from your files
- **AI-inferred suggestions** — extrapolated by the model

---

## Read-Only Commands Are Safe

Commands like `/status`, `/analyze`, `/decide`, `/todo`, `/review`, and `/gate` **never modify files**. They only read vault content and generate responses in the chat.

See the [[Commands-Overview]] for which commands write files.

---

**See also:** [[Commands-Overview]] · [[Mutation-Commands]] · [[Phase-Gates]]
