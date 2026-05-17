import { renderSessionHistory } from "../../src/apps/cli/history";

test("renders active session chat history for resumed sessions", async () => {
  const output = await renderSessionHistory(
    {
      buildContext: async () => ({
        sessionId: "session_1",
        leafId: "leaf_1",
        systemPrompt: "Be useful.",
        settings: { model: "gpt-5.5", responseOverrides: {} },
        messages: [
          {
            type: "message",
            id: "user_1",
            parentId: "settings_1",
            timestamp: "2026-05-16T12:00:00.000Z",
            role: "user",
            content: [{ type: "text", text: "tell me about yourself" }],
          },
          {
            type: "message",
            id: "assistant_1",
            parentId: "user_1",
            timestamp: "2026-05-16T12:00:01.000Z",
            role: "assistant",
            content: [
              { type: "reasoning_summary", text: "Answer directly." },
              { type: "text", text: "I'm an AI assistant." },
            ],
          },
        ],
      }),
    },
    "session_1",
  );

  expect(output).toContain("Previous conversation:");
  expect(output).toContain("You:\ntell me about yourself");
  expect(output).toContain("Assistant:\n[reasoning] Answer directly.");
  expect(output).toContain("I'm an AI assistant.");
});

test("renders consecutive history text chunks inline like streaming output", async () => {
  const output = await renderSessionHistory(
    {
      buildContext: async () => ({
        sessionId: "session_1",
        leafId: "leaf_1",
        systemPrompt: "Be useful.",
        settings: { model: "gpt-5.5", responseOverrides: {} },
        messages: [
          {
            type: "message",
            id: "assistant_1",
            parentId: "user_1",
            timestamp: "2026-05-16T12:00:01.000Z",
            role: "assistant",
            content: [
              { type: "text", text: "I" },
              { type: "text", text: "'m" },
              { type: "text", text: " an AI assistant." },
            ],
          },
        ],
      }),
    },
    "session_1",
  );

  expect(output).toContain("Assistant:\nI'm an AI assistant.");
  expect(output).not.toContain("I\n'm\n an AI assistant.");
});

test("renders no history block for a new empty session", async () => {
  await expect(
    renderSessionHistory(
      {
        buildContext: async () => ({
          sessionId: "session_1",
          leafId: "leaf_1",
          systemPrompt: "Be useful.",
          settings: { model: "gpt-5.5", responseOverrides: {} },
          messages: [],
        }),
      },
      "session_1",
    ),
  ).resolves.toBe("");
});
