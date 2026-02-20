import type { TemplateBuilder } from './types.js';

export const buildA1ArchitectureVision: TemplateBuilder = (d, projectName, yaml) => ({
  name: 'A1_Architecture_Vision.md',
  content: `${yaml({
    type: 'architecture-vision',
    togaf_phase: 'A',
    artifact_type: 'deliverable',
    version: '0.1.0',
    status: 'draft',
    created: d,
    last_modified: d,
    owner: 'TBD',
    reviewers: [],
  })}

# Architecture Vision

> Phase A — Statement of Architecture Work

## Initiative Name

${projectName}

## Executive Summary

(Describe the initiative purpose, strategic value, and transformation intent)

## Business Context & Drivers

- (Driver 1)
- (Driver 2)

## Scope

### In Scope
- 

### Out of Scope
- 

## Objectives

1. 
2. 
3. 

## Value Proposition

| Benefit | Measure | Target |
|---------|---------|--------|
| | | |

## Key Constraints

- 

## Architecture Work Plan

| Deliverable | Target Date | Owner |
|-------------|-------------|-------|
| Architecture Vision (this doc) | ${d} | TBD |
| Business Architecture | TBD | TBD |
| Target Architecture | TBD | TBD |
| Roadmap | TBD | TBD |
`,
});
