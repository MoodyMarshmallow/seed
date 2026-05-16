import { z } from "zod";

import { SESSION_SCHEMA_VERSION } from "./entries";

const baseEntrySchema = z.object({
  id: z.string().min(1),
  parentId: z.string().min(1).nullable(),
  timestamp: z.string().min(1),
});

const reasoningSettingsSchema = z
  .object({
    effort: z.string().optional(),
    summary: z.string().optional(),
  })
  .catchall(z.unknown());

const responseSettingsSchema = z.object({
  model: z.string().min(1),
  reasoning: reasoningSettingsSchema.optional(),
  responseOverrides: z.record(z.string(), z.unknown()).default({}),
});

export const sessionHeaderSchema = z.object({
  type: z.literal("session"),
  version: z.literal(SESSION_SCHEMA_VERSION),
  id: z.string().min(1),
  timestamp: z.string().min(1),
  cwd: z.string().min(1),
  leafId: z.string().min(1).nullable(),
});

export const sessionEntrySchema = z.discriminatedUnion("type", [
  baseEntrySchema.extend({
    type: z.literal("system_prompt"),
    content: z.string(),
  }),
  baseEntrySchema.extend({
    type: z.literal("settings"),
    settings: responseSettingsSchema,
  }),
  baseEntrySchema.extend({
    type: z.literal("message"),
    role: z.enum(["user", "assistant", "tool_result"]),
    content: z.array(
      z.object({
        type: z.enum(["text", "reasoning_summary", "tool_call", "error"]),
        text: z.string().optional(),
        raw: z.unknown().optional(),
      }),
    ),
    raw: z.unknown().optional(),
  }),
  baseEntrySchema.extend({
    type: z.literal("compaction"),
    summary: z.string(),
    firstKeptEntryId: z.string().min(1),
    details: z.unknown().optional(),
  }),
]);
