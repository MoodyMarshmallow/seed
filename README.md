# Seed

## Intro

`seed` is a minimal Bun/TypeScript coding-agent template. It provides a small core Agent with replaceable seams for memory, model clients, auth token storage, conversation storage, and tools.

There is an included CLI for demonstration and testing purpoposes. It wires the core Agent to Codex subscription auth, the OpenAI Responses API, JSONL conversation storage, and a small example math tool so the template can run end-to-end locally.

## Quickstart

```bash
bun install
bun run agent # run the CLI
```

On first run, the CLI starts a Codex OAuth flow and stores local state in `.agent/`, which is gitignored.

Useful commands:

```bash
bun run agent --headless-auth
bun run lint
bun run typecheck
bun run test
bun run knip
```

## Architecture

The architecture has two layers: core code that defines agent behavior, and extensible code that supplies concrete runtime choices.

### Core

```text
src/core/
  agent/          Turn orchestration
  conversations/  Linear conversation lifecycle and replay context
  memory/         Agent-facing memory interface
  model/          Model-client interface
  auth/           Token-store interface
  tools/          Tool interface and registry
  errors/         Shared agent errors
```

Core owns:

- `Agent`, which records user messages, streams model output, executes tools, records tool results, and performs one recovery pass.
- `ConversationManager`, which creates/resumes conversations, records messages, updates settings, undoes turns, and builds replay context.
- `ToolRegistry`, which lists registered tool definitions and dispatches tool calls by exact name.

Interfaces that extend the core are:

- `AgentMemory.interface.ts` for preparing model context and recording conversation events.
- `ModelClient.interface.ts` for streaming normalized model events.
- `ConversationStore.interface.ts` for persisting complete conversation records.
- `TokenStore.interface.ts` for local auth token persistence.
- `Tool.interface.ts` for executable model tools.

### Extensible Parts

```text
src/
  adapters/       Codex, filesystem, memory, and tool implementations
  config/         Project config loading and validation
  apps/cli/       Thin runnable harness that composes core + adapters
```

Included extensible implementations are:

- `SimpleLinearMemory` is a placeholder `AgentMemory` implementation backed by one linear conversation timeline.
- `JsonlConversationStore` stores conversations as JSONL records.
- `JsonFileTokenStore` stores local Codex auth tokens.
- `CodexModelClient` calls the Codex Responses endpoint.
- `CodexAuthClient` refreshes and exchanges Codex tokens.
- `MathTool` demonstrates adding a concrete tool.

The CLI is also replaceable. It composes config, auth, storage, memory, model client, tools, and `Agent` so the template can be demonstrated and tested end-to-end.
