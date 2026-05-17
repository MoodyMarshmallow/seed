import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { JsonlSessionStore } from "../../../src/adapters/file-system/JsonlSessionStore";
import { SessionManager } from "../../../src/core/sessions/SessionManager";

test("new conversations snapshot system prompt and settings into initial context", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "agent-session-"));
  const sessions = new SessionManager({
    cwd,
    store: new JsonlSessionStore({ rootDir: join(cwd, ".agent", "sessions") }),
  });

  const session = await sessions.createSession({
    systemPrompt: "Stay minimal.",
    model: "gpt-5.1",
    reasoning: { effort: "medium", summary: "auto" },
    responseOverrides: { temperature: 0.1 },
  });

  const context = await sessions.buildContext(session.id);

  expect(context.systemPrompt).toBe("Stay minimal.");
  expect(context.settings).toEqual({
    model: "gpt-5.1",
    reasoning: { effort: "medium", summary: "auto" },
    responseOverrides: { temperature: 0.1 },
  });
  expect(context.messages).toEqual([]);
  expect(context.leafId).toBe(session.trunkLeafId);
});
