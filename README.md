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
- `.agent/conversations/*.jsonl` for local conversation storage.

If `.agent/auth.json` does not exist, `bun run agent` starts the local OAuth flow before opening the chat. Use `bun run agent --headless-auth` to print the authorization URL without opening a browser.

## Configuration

New conversations snapshot `agent.config.json` into their initial context:

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
  core/           Framework-neutral orchestration, contracts, and memory model
  adapters/       Replaceable Codex, filesystem, and tool implementations
  config/         Version-controlled project config loading and validation
  apps/cli/       Thin runnable harness that composes core + adapters
```

Core code depends on explicit interfaces instead of constructing defaults internally:

- `AgentMemory.interface.ts` prepares model context and records conversation events.
- `ConversationStore.interface.ts` persists complete conversation records.
- `TokenStore.interface.ts` persists local Codex subscription tokens.
- `ModelClient.interface.ts` streams normalized model events.
- `ToolRegistry` lists and executes tools.

Concrete adapters are replaceable:

- `JsonlConversationStore` writes JSONL conversation files.
- `ConversationMemory` adapts linear conversation storage to `AgentMemory`.
- `JsonFileTokenStore` writes project-local auth JSON.
- `CodexModelClient` calls the internal Codex Responses endpoint with injected `fetch`.
- `MathTool` demonstrates a concrete tool adapter.

The intended dependency rule is:

```text
core/*        -> core/* only
adapters/*    -> core/* only
config/*      -> core/* allowed
apps/cli/*    -> core/* + adapters/* + config/*
```

There are no barrel files. Direct imports are preferred so the seam being used is visible at each call site.

File roles are named explicitly:

- `*.interface.ts` files contain replaceable contracts only.
- `src/adapters/**` files contain concrete implementations of interfaces.
- Other source files are feature modules that implement runtime behavior, orchestration, parsing, or composition.

## Conversations

Conversations are currently stored as versioned JSONL records. New conversations start with initial context:

1. system prompt
2. latest model settings

Conversations are linear, turn-based chats between one user and one agent. A turn starts with a user message, may include tool interactions, and completes with an assistant message. Latest model settings live on the conversation and are not part of undo history.

Compaction and pruning are not implemented yet, but the store replaces complete conversation records so future cleanup can remove unused turns without changing the manager-facing interface.

## Reasoning And Outputs

The model client normalizes streaming provider events into text deltas, reasoning-summary deltas, tool calls, completion, and failure events.

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

The CLI is not intended as the downstream product interface. It composes the file stores, conversation memory adapter, Codex auth client, Codex model client, tools, and `Agent` to prove the system works end-to-end.

## Testing

The test suite uses Vitest and covers:

- Config validation.
- JSONL conversation initial context and context building.
- Conversation-backed Memory projection into model input.
- File token persistence and lazy refresh.
- Streaming Responses parsing and request construction.
- Library-level agent turns with missing tool-call recovery.
- CLI command parsing and one process-level smoke test.

Tests are grouped by ownership:

- `tests/core/` for core Agent and conversation modules.
- `tests/adapters/` for concrete Codex, filesystem, Memory, and tool adapters.
- `tests/apps/cli/` for the CLI harness.
- `tests/config/` for config loading and validation.

Run all checks before using the template as a base:

```bash
bun run lint
bun run typecheck
bun run test
bun run knip
```
