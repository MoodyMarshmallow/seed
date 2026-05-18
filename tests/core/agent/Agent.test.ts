import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { JsonlConversationStore } from "../../../src/adapters/file-system/JsonlConversationStore";
import { ConversationMemory } from "../../../src/adapters/memory/conversation/ConversationMemory";
import { EmptyToolRegistry } from "../../../src/adapters/tools/EmptyToolRegistry";
import { Agent } from "../../../src/core/agent/Agent";
import { ConversationManager } from "../../../src/core/conversations/ConversationManager";
import type {
  ResponsesRequest,
  ResponsesStreamEvent,
} from "../../../src/core/responses/ResponsesTransport.interface";

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
  const conversations = new ConversationManager({
    cwd,
    store: new JsonlConversationStore({
      rootDir: join(cwd, ".agent", "conversations"),
    }),
  });
  const conversation = await conversations.createConversation({
    systemPrompt: "Be direct.",
    model: "gpt-5.1",
    reasoning: { effort: "medium", summary: "auto" },
    responseOverrides: {},
  });
  const transport = new ScriptedTransport();
  const memory = new ConversationMemory(conversations);
  const agent = new Agent({
    memory,
    transport,
    tools: new EmptyToolRegistry(),
  });

  const observed = [];
  for await (const event of agent.runTurn({
    conversationId: conversation.id,
    input: "Please inspect.",
  })) {
    observed.push(event.type);
  }

  const context = await conversations.buildContext(conversation.id);

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

test("agent turn yields streaming text before the transport finishes", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "agent-streaming-"));
  const conversations = new ConversationManager({
    cwd,
    store: new JsonlConversationStore({
      rootDir: join(cwd, ".agent", "conversations"),
    }),
  });
  const conversation = await conversations.createConversation({
    systemPrompt: "Be direct.",
    model: "gpt-5.5",
    reasoning: { effort: "medium", summary: "auto" },
    responseOverrides: {},
  });
  let releaseTransport: () => void = () => undefined;
  const transportGate = new Promise<void>((resolve) => {
    releaseTransport = resolve;
  });
  const transport = {
    async *stream(): AsyncGenerator<ResponsesStreamEvent> {
      yield { type: "text.delta", delta: "streamed", raw: {} };
      await transportGate;
      yield { type: "completed", raw: {} };
    },
  };
  const memory = new ConversationMemory(conversations);
  const agent = new Agent({
    memory,
    transport,
    tools: new EmptyToolRegistry(),
  });

  const iterator = agent.runTurn({
    conversationId: conversation.id,
    input: "Say hi.",
  });
  const first = await iterator.next();

  expect(first).toEqual({
    done: false,
    value: { type: "text.delta", delta: "streamed" },
  });

  releaseTransport();
  await expect(iterator.next()).resolves.toEqual({
    done: false,
    value: { type: "completed" },
  });
});
