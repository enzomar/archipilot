# ArchiMate Export

Export your vault to an **ArchiMate 3.2 Open Exchange Format (OEFF)** XML file, importable by Archi, BiZZdesign, Sparx EA, ADOIT, and any tool supporting the standard.

---

## Usage

```
@architect /archimate
@architect /archimate Analyze this export for completeness
@architect /archimate Focus on cross-layer traceability gaps
@architect /archimate --no-analysis   (export only, skip AI analysis)
```

Or from the Command Palette:

```
archipilot: Export Vault to ArchiMate (XML)
```

## What Gets Exported

| Vault Phase | ArchiMate Layer | Elements |
|-------------|----------------|----------|
| Phase B | Business Layer | Processes, capabilities, functions |
| Phase C | Application Layer | Components, interfaces, data objects |
| Phase D | Technology Layer | Nodes, system software, devices |
| Phase E | Implementation & Migration | SBB deliverables, work packages |
| Preliminary | Motivation | Principles |
| Requirements | Motivation | Requirements, constraints |
| Decision Log | Motivation | Assessments |
| Risk Register | Motivation | Assessments |
| Stakeholders | Motivation | Stakeholders, drivers |

## Relationship Extraction

Relationships are extracted from:

- **Mermaid diagrams** embedded in vault files
- **Table columns** (e.g. dependency tables linking components)
- **Cross-layer name matching** (e.g. a business process name appearing in an application description)

## Generated Views

Five views are auto-generated in the export:

| View | Content |
|------|---------|
| **Full Layered** | All layers in a single view |
| **Business & Motivation** | Business processes + principles + stakeholders |
| **Application** | Application components and data objects |
| **Technology** | Infrastructure and platform elements |
| **Implementation** | Work packages and deliverables |

## Output Location

Files are saved to `exports/archimate/` in your vault:

```
my-vault/
  exports/
    archimate/
      My-Vault-ArchiMate.xml
```

## Compatible Tools

| Tool | Cost | Notes |
|------|------|-------|
| [Archi](https://www.archimatetool.com/) | Free, open-source | Recommended |
| BiZZdesign | Commercial | Enterprise modelling suite |
| Sparx EA | Commercial | UML + ArchiMate |
| ADOIT | Commercial | EA management platform |

---

**See also:** [[Export-Commands]] · [[DrawIO-Export]] · [[Export-Folder-Layout]]
