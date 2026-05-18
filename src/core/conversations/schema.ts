import { z } from "zod";

import { CONVERSATION_SCHEMA_VERSION } from "./entries";

const responseSettingsSchema = z.object({
  model: z.string().min(1),
  reasoning: z
    .object({
      effort: z.enum(["minimal", "low", "medium", "high"]),
      summary: z.enum(["auto", "concise", "detailed"]).optional(),
    })
    .optional(),
  responseOverrides: z.record(z.string(), z.unknown()),
});

export const conversationHeaderSchema = z.object({
  type: z.literal("conversation"),
  version: z.literal(CONVERSATION_SCHEMA_VERSION),
  id: z.string().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  cwd: z.string(),
  title: z.string().optional(),
  systemPrompt: z.string(),
  settings: responseSettingsSchema,
});

export const conversationTurnSchema = z.object({
  id: z.string().min(1),
  timestamp: z.string().min(1),
  status: z.enum(["open", "completed", "failed", "cancelled"]),
  messages: z.array(
    z.object({
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
  ),
});
