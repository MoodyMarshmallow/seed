import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { JsonlSessionStore } from "../../src/adapters/file-system/JsonlSessionStore";
import { EmptyToolRegistry } from "../../src/adapters/tools/EmptyToolRegistry";
import { Agent } from "../../src/core/agent/Agent";
import type {
  ResponsesRequest,
  ResponsesStreamEvent,
} from "../../src/core/responses/ResponsesTransport";
import { SessionManager } from "../../src/core/sessions/SessionManager";

class ScriptedTransport {
  readonly requests: ResponsesRequest[] = [];
  #turn = 0;

  async *stream(
    request: ResponsesRequest,
  ): AsyncGenerator<ResponsesStreamEvent> {
    this.requests.push(request);
    this.#turn += 1;
    if (this.#turn === 1) {
      yield { type: "reasoning_summary.delta", delta: "Need a tool.", raw: {} };
      yield { type: "text.delta", delta: "Checking...", raw: {} };
      yield {
        type: "tool_call",
        callId: "call_1",
        name: "bash",
        input: {},
        raw: {},
      };
      yield { type: "completed", raw: {} };
      return;
    }
    yield {
      type: "text.delta",
      delta: "No tool is available, so I will answer directly.",
      raw: {},
    };
    yield { type: "completed", raw: {} };
  }
}

test("agent turn persists user, assistant, reasoning summary, and missing tool result", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "agent-turn-"));
  const sessions = new SessionManager({
    cwd,
    store: new JsonlSessionStore({ rootDir: join(cwd, ".agent", "sessions") }),
  });
  const session = await sessions.createSession({
    systemPrompt: "Be direct.",
    model: "gpt-5.1",
    reasoning: { effort: "medium", summary: "auto" },
    responseOverrides: {},
  });
  const transport = new ScriptedTransport();
  const agent = new Agent({
    sessions,
    transport,
    tools: new EmptyToolRegistry(),
  });

  const observed = [];
  for await (const event of agent.runTurn({
    sessionId: session.id,
    input: "Please inspect.",
  })) {
    observed.push(event.type);
  }

  const context = await sessions.buildContext(session.id);

  expect(observed).toEqual([
    "reasoning_summary.delta",
    "text.delta",
    "tool_call",
    "tool_result",
    "text.delta",
    "completed",
  ]);
  expect(transport.requests).toHaveLength(2);
  expect(transport.requests[1]?.messages.at(-1)).toMatchObject({
    role: "tool_result",
    callId: "call_1",
  });
  expect(context.messages.map((message) => message.role)).toEqual([
    "user",
    "assistant",
    "tool_result",
    "assistant",
  ]);
  expect(context.messages[1]?.content).toEqual([
    { type: "reasoning_summary", text: "Need a tool." },
    { type: "text", text: "Checking..." },
    { type: "tool_call", raw: { callId: "call_1", name: "bash", input: {} } },
  ]);
});
