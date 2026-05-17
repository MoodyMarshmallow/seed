# seed Context

`seed` is a single-package Bun/TypeScript coding-agent template.

## Domain Terms

- **Agent**: The core orchestrator that runs turns through injected interfaces.
- **Interface**: A stable replaceable contract, such as memory, token storage, model transport, or tool execution.
- **Adapter**: A concrete implementation of an interface shipped for local template use.
- **Feature module**: Runtime behavior or orchestration code, such as the Agent, SessionManager, config loader, or CLI harness.
- **Conversation**: A user-facing chat history that can be resumed, displayed, and extended.
- **Memory**: The agent-facing module that prepares model context and records conversation events. The Agent must not depend on a tree, JSONL, or conversation implementation directly.
- **Initial context**: The system prompt and initial settings used when a conversation is created.
- **Branch-local settings**: Settings entries that affect only descendants on their tree path.
- **CLI harness**: The runnable command used for local E2E development, not the stable downstream product interface.

## Architectural Intent

Keep the core library modular and dependency-injected. Concrete file stores and Codex transport exist to make the template runnable, but downstream projects should be able to replace them without changing agent orchestration.
