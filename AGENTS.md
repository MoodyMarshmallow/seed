# seed

## Project Introduction

`seed` is a minimal Bun/TypeScript coding-agent template. It is intended to be copied into new projects and adapted quickly, while keeping the core Agent independent from concrete storage, auth, model client, tool, and CLI decisions.

## Main Objectives

- Keep the codebase minimal: add the smallest correct module or interface that solves the current need.
- Keep the codebase extensible: make future Memory, model client, auth, and tool adapters easy to add without rewriting the Agent.
- Prefer deep modules: put meaningful behavior behind small interfaces, and avoid shallow pass-through helpers.
- Maintain clear seams: `*.interface.ts` files define stable interfaces; adapters provide concrete implementations; feature modules provide runtime behavior and orchestration.
- Preserve full test coverage for behavior that defines a seam, adapter, or user-visible flow.
- Prioritize readability: direct imports, explicit names, small files, and domain vocabulary over clever abstractions.

## Development Practice

Always use the `tdd` skill for code changes. Follow TDD best practices:

- Write one failing behavior test first.
- Implement the smallest change that makes that test pass.
- Refactor only after tests are green.
- Prefer tests through public interfaces and real seams rather than implementation details.
- Add regression tests for bugs before fixing them when a correct seam exists.
- When exporting a new interface, add a docstring that explains what implementations should do and the invariants they must uphold.
- Run `bun run lint`, `bun run typecheck`, `bun run test`, and `bun run knip` before considering work complete.

## Agent skills

### Issue tracker

Issues and PRDs are tracked in GitHub Issues. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default canonical triage labels. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repo. See `docs/agents/domain.md`.
