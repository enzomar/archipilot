# Draw.io Export

Export your vault to **Draw.io (diagrams.net)** XML files with three architectural views.

---

## Usage

```
@architect /drawio
@architect /drawio Analyze migration classification accuracy
@architect /drawio Focus on cross-layer gaps in the target state
@architect /drawio --no-analysis   (export only, skip AI analysis)
```

Or from the Command Palette:

```
archipilot: Export Vault to Draw.io
```

## Three Views

### As-Is View
Current-state architecture extracted from baseline sections in B1, C1, D1 files.

### Target View
Future-state architecture extracted from target sections in B1, C1, D1 files.

### Migration View
Color-coded overlay showing what changes between states:

| Color | Meaning | Description |
|-------|---------|-------------|
| 🔴 Red | **Remove** | Exists in As-Is but not in Target — to be retired |
| 🟢 Green | **Add** | New in Target — to be implemented |
| 🔵 Blue | **Keep** | Unchanged — carried over from As-Is to Target |

## Output Location

Files are saved to `exports/drawio/` in your vault:

```
my-vault/
  exports/
    drawio/
      My-Vault-Architecture.drawio          (combined, multi-tab)
      My-Vault-Architecture-AsIs.drawio     (As-Is only)
      My-Vault-Architecture-Target.drawio   (Target only)
      My-Vault-Architecture-Migration.drawio (Migration only)
```

## How to Open

| Tool | How |
|------|-----|
| **VS Code** | Install the [Draw.io Integration](https://marketplace.visualstudio.com/items?itemName=hediet.vscode-drawio) extension |
| **diagrams.net** | Open [app.diagrams.net](https://app.diagrams.net/) → File → Open |
| **Confluence** | Use the Draw.io Confluence plugin to embed diagrams |
| **Desktop app** | Download from [diagrams.net](https://www.diagrams.net/) |

---

**See also:** [[Export-Commands]] · [[ArchiMate-Export]] · [[Export-Folder-Layout]]
