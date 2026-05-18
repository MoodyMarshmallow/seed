import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { JsonlConversationStore } from "../../../src/adapters/file-system/JsonlConversationStore";
import { ConversationManager } from "../../../src/core/conversations/ConversationManager";

test("conversations keep latest settings and undo removes the latest turn from replay", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "agent-conversation-"));
  const conversations = new ConversationManager({
    cwd,
    store: new JsonlConversationStore({
      rootDir: join(cwd, ".agent", "conversations"),
    }),
  });

  const conversation = await conversations.createConversation({
    systemPrompt: "Stay minimal.",
    model: "gpt-5.1",
    reasoning: { effort: "medium", summary: "auto" },
    responseOverrides: { temperature: 0.1 },
  });

  await conversations.appendMessage(conversation.id, {
    role: "user",
    content: [{ type: "text", text: "First" }],
  });
  await conversations.appendMessage(conversation.id, {
    role: "assistant",
    content: [{ type: "text", text: "Done" }],
  });
  await conversations.updateSettings(conversation.id, {
    model: "gpt-5.5",
    reasoning: { effort: "low", summary: "auto" },
    responseOverrides: {},
  });
  await conversations.appendMessage(conversation.id, {
    role: "user",
    content: [{ type: "text", text: "Second" }],
  });

  await conversations.undoLatestTurn(conversation.id);
  const context = await conversations.buildContext(conversation.id);

  expect(context.systemPrompt).toBe("Stay minimal.");
  expect(context.settings).toEqual({
    model: "gpt-5.5",
    reasoning: { effort: "low", summary: "auto" },
    responseOverrides: {},
  });
  expect(context.messages.map((message) => message.role)).toEqual([
    "user",
    "assistant",
  ]);
  expect(context.messages[0]?.content).toEqual([
    { type: "text", text: "First" },
  ]);
});

test("conversations allow only one open turn", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "agent-conversation-"));
  const conversations = new ConversationManager({
    cwd,
    store: new JsonlConversationStore({
      rootDir: join(cwd, ".agent", "conversations"),
    }),
  });
  const conversation = await conversations.createConversation({
    systemPrompt: "Stay minimal.",
    model: "gpt-5.1",
    reasoning: { effort: "medium", summary: "auto" },
    responseOverrides: {},
  });

  await conversations.appendMessage(conversation.id, {
    role: "user",
    content: [{ type: "text", text: "First" }],
  });

  await expect(
    conversations.appendMessage(conversation.id, {
      role: "user",
      content: [{ type: "text", text: "Second" }],
    }),
  ).rejects.toMatchObject({ code: "conversation_invalid" });
});
