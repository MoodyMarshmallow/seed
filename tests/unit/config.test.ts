import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { loadAgentConfig } from "../../src/config/config";

test("loads a version-controlled agent config with known fields and response overrides", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "agent-config-"));
  await writeFile(
    join(cwd, "agent.config.json"),
    JSON.stringify({
      systemPrompt: "Ship carefully.",
      model: "gpt-5.1",
      reasoning: { effort: "medium", summary: "auto" },
      responseOverrides: { temperature: 0.2, parallel_tool_calls: false },
    }),
  );

  await expect(loadAgentConfig(cwd)).resolves.toEqual({
    systemPrompt: "Ship carefully.",
    model: "gpt-5.1",
    reasoning: { effort: "medium", summary: "auto" },
    responseOverrides: { temperature: 0.2, parallel_tool_calls: false },
  });
});
