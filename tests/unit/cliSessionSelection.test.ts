import {
  formatConversationChoices,
  resolveConversationSelection,
  selectInitialConversation,
} from "../../src/apps/cli/conversationSelection";
import type { AgentConfig } from "../../src/config/schema";

const config: AgentConfig = {
  systemPrompt: "Be useful.",
  model: "gpt-5.5",
  reasoning: { effort: "medium", summary: "auto" },
  responseOverrides: {},
};

test("formats existing conversations as a numbered startup menu", () => {
  const menu = formatConversationChoices([
    {
      id: "da5a5db6-4498-4d09-8729-3c2a222c2853",
      filePath: "/tmp/session.jsonl",
      timestamp: "2026-05-16T12:00:00.000Z",
      leafId: "leaf_1",
    },
  ]);

  expect(menu).toContain("1. New conversation");
  expect(menu).toContain("2.");
  expect(menu).toContain("da5a5db6");
});

test("resolves numbered conversation selections", () => {
  expect(resolveConversationSelection("1", 2)).toEqual({ type: "new" });
  expect(resolveConversationSelection("2", 2)).toEqual({
    type: "existing",
    index: 0,
  });
  expect(resolveConversationSelection("3", 2)).toEqual({
    type: "existing",
    index: 1,
  });
  expect(resolveConversationSelection("4", 2)).toBeNull();
  expect(resolveConversationSelection("nope", 2)).toBeNull();
});

test("selects an existing conversation by number without requiring users to remember IDs", async () => {
  const writes: string[] = [];
  const session = await selectInitialConversation({
    config,
    sessions: {
      listSessions: async () => [
        {
          id: "session_1",
          filePath: "/tmp/session_1.jsonl",
          timestamp: "2026-05-16T12:00:00.000Z",
          leafId: "leaf_1",
        },
      ],
      createSession: async () => {
        throw new Error("should not create");
      },
    },
    io: {
      question: async () => "2",
      write: (text) => writes.push(text),
    },
  });

  expect(session).toEqual({
    id: "session_1",
    filePath: "/tmp/session_1.jsonl",
    trunkLeafId: "leaf_1",
  });
  expect(writes.join("\n")).toContain("Choose a conversation");
});
