import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { JsonlConversationStore } from "../../../src/adapters/file-system/JsonlConversationStore";
import { SimpleLinearMemory } from "../../../src/adapters/memory/simple-linear/SimpleLinearMemory";
import { Agent } from "../../../src/core/agent/Agent";
import { ConversationManager } from "../../../src/core/conversations/ConversationManager";
import type {
  ModelRequest,
  ModelStreamEvent,
} from "../../../src/core/model/ModelClient.interface";
import { ToolRegistry } from "../../../src/core/tools/ToolRegistry";

class ScriptedModelClient {
  readonly requests: ModelRequest[] = [];
  #turn = 0;

  async *stream(request: ModelRequest): AsyncGenerator<ModelStreamEvent> {
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
      yield {
        type: "tool_call",
        callId: "call_2",
        name: "math",
        input: { operation: "add", left: 2, right: 3 },
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
  const model = new ScriptedModelClient();
  const memory = new SimpleLinearMemory(conversations);
  const agent = new Agent({
    memory,
    model,
    tools: new ToolRegistry([]),
  });

  const observed = [];
  for await (const event of agent.runTurn({
    conversationId: conversation.id,
    userMessage: "Please inspect.",
  })) {
    observed.push(event.type);
  }

  const context = await conversations.buildContext(conversation.id);

  expect(observed).toEqual([
    "reasoning_summary.delta",
    "text.delta",
    "tool_call",
    "tool_call",
    "tool_result",
    "tool_result",
    "text.delta",
    "completed",
  ]);
  expect(model.requests).toHaveLength(2);
  expect(model.requests[1]?.messages).toEqual([
    { role: "user", content: "Please inspect." },
    { role: "assistant", content: "Checking..." },
    { role: "tool_call", callId: "call_1", name: "bash", input: {} },
    {
      role: "tool_call",
      callId: "call_2",
      name: "math",
      input: { operation: "add", left: 2, right: 3 },
    },
    {
      role: "tool_result",
      callId: "call_1",
      content: "Tool 'bash' is not available in this agent.",
    },
    {
      role: "tool_result",
      callId: "call_2",
      content: "Tool 'math' is not available in this agent.",
    },
  ]);
  expect(context.messages.map((message) => message.role)).toEqual([
    "user",
    "assistant",
    "tool_result",
    "tool_result",
    "assistant",
  ]);
  expect(context.messages[1]?.content).toEqual([
    { type: "reasoning_summary", text: "Need a tool." },
    { type: "text", text: "Checking..." },
    { type: "tool_call", raw: { callId: "call_1", name: "bash", input: {} } },
    {
      type: "tool_call",
      raw: {
        callId: "call_2",
        name: "math",
        input: { operation: "add", left: 2, right: 3 },
      },
    },
  ]);
});

test("agent turn yields streaming text before the model finishes", async () => {
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
  let releaseModel: () => void = () => undefined;
  const modelGate = new Promise<void>((resolve) => {
    releaseModel = resolve;
  });
  const model = {
    async *stream(): AsyncGenerator<ModelStreamEvent> {
      yield { type: "text.delta", delta: "streamed", raw: {} };
      await modelGate;
      yield { type: "completed", raw: {} };
    },
  };
  const memory = new SimpleLinearMemory(conversations);
  const agent = new Agent({
    memory,
    model,
    tools: new ToolRegistry([]),
  });

  const iterator = agent.runTurn({
    conversationId: conversation.id,
    userMessage: "Say hi.",
  });
  const first = await iterator.next();

  expect(first).toEqual({
    done: false,
    value: { type: "text.delta", delta: "streamed" },
  });

  releaseModel();
  await expect(iterator.next()).resolves.toEqual({
    done: false,
    value: { type: "completed" },
  });
});
