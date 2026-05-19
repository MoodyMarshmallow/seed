import { z } from "zod";

const reasoningSettingsSchema = z
  .object({
    effort: z.string().optional(),
    summary: z.string().optional(),
  })
  .catchall(z.unknown());

export const agentConfigSchema = z.object({
  systemPrompt: z.string().min(1),
  model: z.string().min(1),
  reasoning: reasoningSettingsSchema.optional(),
  responseOverrides: z.record(z.string(), z.unknown()).default({}),
});

export type ReasoningSettings = z.infer<typeof reasoningSettingsSchema>;
export type AgentConfig = z.infer<typeof agentConfigSchema>;

/**
 * Loads Agent defaults from a concrete configuration source.
 * Implementations must validate external input before returning it and supply a
 * complete config shape, including defaulted response overrides.
 */
export interface AgentConfigStore {
  /**
   * Returns validated initial Agent defaults.
   */
  readonly load: () => Promise<AgentConfig>;
}
