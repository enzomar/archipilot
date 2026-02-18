# Contributing to AchiPilot

Thank you for your interest in contributing to AchiPilot! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## How to Contribute

### Reporting Bugs

1. Check [existing issues](https://github.com/enzomar/achipilot/issues) to avoid duplicates.
2. Use the **Bug Report** issue template.
3. Include: VS Code version, extension version, steps to reproduce, expected vs. actual behavior.

### Suggesting Features

1. Open a **Feature Request** issue.
2. Describe the use case and how it relates to TOGAF or architecture workflows.
3. If possible, include examples of the expected interaction with `@architect`.

### Pull Requests

1. Fork the repository and create a branch from `main`.
2. Follow the coding standards below.
3. Test your changes in the Extension Development Host (`F5`).
4. Update documentation if you add or change commands.
5. Submit a PR using the pull request template.

## Development Setup

```bash
# Clone your fork
git clone https://github.com/<your-username>/achipilot.git
cd achipilot

# Install dependencies
npm install

# Compile
npm run compile

# Launch Extension Development Host
# Press F5 in VS Code
```

### Project Structure

```
src/
  extension.ts        – Entry point, registration
  participant.ts      – @architect chat handler & command routing
  vault.ts            – Vault discovery, loading, switching
  prompts.ts          – TOGAF system prompts per mode
  updater.ts          – Structured command parser & file editor
  vault-template.ts   – TOGAF vault scaffolding template
  types.ts            – TypeScript interfaces
```

## Coding Standards

- **TypeScript** strict mode — no `any` unless absolutely necessary.
- Use `async/await` over raw promises.
- Keep functions small and focused.
- Add JSDoc comments for public functions.
- Follow existing naming conventions (camelCase for variables/functions, PascalCase for types).

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add /compliance command for Phase G checks
fix: prevent empty message error on /status
docs: update README with /sizing examples
refactor: extract message builder from participant
```

## TOGAF Alignment

AchiPilot follows TOGAF ADM phases. When contributing:

- Map new features to the appropriate ADM phase.
- Use the established file prefix convention (`P*`, `A*`–`H*`, `R*`, `X*`).
- Maintain wiki-link cross-references between artifacts.
- Respect YAML front matter schema (version, status, owner, togaf_phase).

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
