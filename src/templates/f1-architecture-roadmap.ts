import type { TemplateBuilder } from './types.js';

export const buildF1ArchitectureRoadmap: TemplateBuilder = (d, _projectName, yaml) => ({
  name: 'F1_Architecture_Roadmap.md',
  content: `${yaml({
    type: 'architecture-roadmap',
    togaf_phase: 'F',
    artifact_type: 'deliverable',
    version: '0.1.0',
    status: 'draft',
    created: d,
    last_modified: d,
    owner: 'TBD',
    reviewers: [],
  })}

# Architecture Roadmap

> Phase F — Phased delivery plan with transition architectures.

## Phase 1 — Foundation (Target: TBD)

**Objective:** Establish architecture baseline and governance.

| Work Package | Duration | Dependencies | Owner | Status |
|-------------|----------|--------------|-------|--------|
| | | | | Not started |

## Phase 2 — Pilot (Target: TBD)

**Objective:** Controlled deployment and validation.

| Work Package | Duration | Dependencies | Owner | Status |
|-------------|----------|--------------|-------|--------|
| | | | | Not started |

## Phase 3 — Production (Target: TBD)

**Objective:** Governed, scalable deployment.

| Work Package | Duration | Dependencies | Owner | Status |
|-------------|----------|--------------|-------|--------|
| | | | | Not started |

## Phase 4 — Extension (Target: TBD)

**Objective:** Expand scope and capabilities.

| Work Package | Duration | Dependencies | Owner | Status |
|-------------|----------|--------------|-------|--------|
| | | | | Not started |

## Status Legend
- **Not started** — Work not yet begun
- **In progress** — Actively being worked on
- **Blocked** — Cannot proceed; dependency or issue outstanding
- **Complete** — Delivered and verified
- **Deferred** — Postponed to a later phase

## Key Milestones

| Milestone | Target Date | Phase | Status |
|-----------|-------------|-------|--------|
| | | | |
`,
});
