# Seed

`Seed` is a minimal Bun/TypeScript agent template built around Codex subscription authentication and the ChatGPT Codex Responses endpoint.

The library is the stable surface. The CLI is intentionally a thin development harness for end-to-end testing and local experimentation.

## Quickstart

```bash
bun install
bun run test
bun run typecheck
bun run agent
```

The CLI stores local development state under `.agent/`, which is gitignored:

- `.agent/auth.json` for local Codex OAuth tokens.
- `.agent/sessions/*.jsonl` for append-only session trees.

If `.agent/auth.json` does not exist, `bun run agent` starts the local OAuth flow before opening the chat. Use `bun run agent --headless-auth` to print the authorization URL without opening a browser.

## Configuration

New sessions snapshot `agent.config.json` into the session trunk:

```json
{
  "systemPrompt": "You are a minimal coding agent.",
  "model": "gpt-5.5",
  "reasoning": {
    "effort": "medium",
    "summary": "auto"
  },
  "responseOverrides": {}
}
```

Known fields provide ergonomics. `responseOverrides` is the escape hatch for arbitrary Responses API parameters.

## Architecture

The source tree is organized by seam ownership:

```text
src/
  core/           Framework-neutral orchestration, contracts, and session model
  adapters/       Replaceable Codex, filesystem, and tool implementations
  config/         Version-controlled project config loading and validation
  apps/cli/       Thin runnable harness that composes core + adapters
```

Core code depends on explicit ports instead of constructing defaults internally:

- `SessionStore` persists versioned tree sessions.
- `TokenStore` persists local Codex subscription tokens.
- `ResponsesTransport` streams normalized Responses events.
- `ToolRegistry` lists and executes tools.

Concrete adapters are replaceable:

- `JsonlSessionStore` writes append-only JSONL session files.
- `JsonFileTokenStore` writes project-local auth JSON.
- `CodexResponsesTransport` calls the internal Codex Responses endpoint with injected `fetch`.
- `EmptyToolRegistry` exposes no tools and returns structured unavailable-tool results.

The intended dependency rule is:

```text
core/*        -> core/* only
adapters/*    -> core/* only
config/*      -> core/* allowed
apps/cli/*    -> core/* + adapters/* + config/*
```

There are no barrel files. Direct imports are preferred so the seam being used is visible at each call site.

## Sessions

Sessions are versioned JSONL trees. Every entry has an `id`, `parentId`, and timestamp. New sessions start with a shared trunk:

1. `system_prompt`
2. `settings`

User turns append descendants from the current leaf. Branch-local settings are represented as entries, so future tree navigation can diverge model, reasoning, or arbitrary Responses overrides per branch.

Compaction is not implemented yet, but the `compaction` entry contract exists so downstream projects can add summarization without changing the session format shape.

## Reasoning And Outputs

The transport normalizes streaming Responses events into text deltas, reasoning-summary deltas, tool calls, completion, and failure events.

Reasoning summaries are displayed and persisted as explicit summary blocks. Raw reasoning is not replayed into future model context.

## CLI Harness

The CLI supports:

- browser OAuth when no local token exists
- `--headless-auth` for URL-only OAuth
- `/model <model>`
- `/reasoning <effort>`
- `/set-json <json>`
- `/new`
- `/resume`
- `/exit`

The CLI is not intended as the downstream product interface. It composes the file stores, Codex auth client, Codex transport, empty tools, and `Agent` to prove the library works end-to-end.

## Testing

The test suite uses Vitest and covers:

- Config validation.
- JSONL session trunk and context building.
- File token persistence and lazy refresh.
- Streaming Responses parsing and request construction.
- Library-level agent turns with missing tool-call recovery.
- CLI command parsing and one process-level smoke test.

Run all checks before using the template as a base:

```bash
bun run lint
bun run typecheck
bun run test
bun run knip
```
