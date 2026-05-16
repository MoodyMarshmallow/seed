import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { AgentError } from "../core/errors/AgentError";
import { type AgentConfig, agentConfigSchema } from "./schema";

/** Loads and validates the version-controlled defaults used to seed new sessions. */
export async function loadAgentConfig(cwd: string): Promise<AgentConfig> {
  const configPath = join(cwd, "agent.config.json");
  let raw: string;

  try {
    raw = await readFile(configPath, "utf8");
  } catch (cause) {
    throw new AgentError({
      code: "config_missing",
      message: `Missing agent config at ${configPath}.`,
      cause,
    });
  }

  try {
    return agentConfigSchema.parse(JSON.parse(raw));
  } catch (cause) {
    throw new AgentError({
      code: "config_invalid",
      message: `Invalid agent config at ${configPath}.`,
      cause,
    });
  }
}
