import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { JsonlSessionStore } from "../../../../src/adapters/file-system/JsonlSessionStore";
import { TreeSessionMemory } from "../../../../src/adapters/memory/tree/TreeSessionMemory";
import { SessionManager } from "../../../../src/core/sessions/SessionManager";

test("tree session memory records conversation events and prepares model input", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "tree-memory-"));
  const sessions = new SessionManager({
    cwd,
    store: new JsonlSessionStore({ rootDir: join(cwd, ".agent", "sessions") }),
  });
  const conversation = await sessions.createSession({
    systemPrompt: "Be direct.",
    model: "gpt-5.5",
    reasoning: { effort: "medium", summary: "auto" },
    responseOverrides: {},
  });
  const memory = new TreeSessionMemory(sessions);

  await memory.record({
    type: "user_message",
    conversationId: conversation.id,
    content: "Use the tool.",
  });
  await memory.record({
    type: "assistant_message",
    conversationId: conversation.id,
    content: [
      { type: "reasoning_summary", text: "Need a tool." },
      { type: "text", text: "Checking..." },
      {
        type: "tool_call",
        toolCall: { callId: "call_1", name: "bash", input: {} },
      },
    ],
  });
  await memory.record({
    type: "tool_result",
    conversationId: conversation.id,
    result: {
      callId: "call_1",
      name: "bash",
      output: "Tool unavailable.",
      isError: true,
    },
  });

  await expect(
    memory.prepareTurn({ conversationId: conversation.id }),
  ).resolves.toMatchObject({
    systemPrompt: "Be direct.",
    settings: { model: "gpt-5.5" },
    messages: [
      { role: "user", content: "Use the tool." },
      {
        role: "assistant",
        content: 'Checking...{"callId":"call_1","name":"bash","input":{}}',
      },
      { role: "tool_result", content: "Tool unavailable.", callId: "call_1" },
    ],
  });
});
