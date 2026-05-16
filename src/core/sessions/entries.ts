import type { ReasoningSettings } from "../../config/schema";

export const SESSION_SCHEMA_VERSION = 1;

export interface ResponseSettings {
  readonly model: string;
  readonly reasoning?: ReasoningSettings | undefined;
  readonly responseOverrides: Readonly<Record<string, unknown>>;
}

export interface SessionHeader {
  readonly type: "session";
  readonly version: typeof SESSION_SCHEMA_VERSION;
  readonly id: string;
  readonly timestamp: string;
  readonly cwd: string;
  readonly leafId: string | null;
}

interface SessionEntryBase {
  readonly type: string;
  readonly id: string;
  readonly parentId: string | null;
  readonly timestamp: string;
}

interface SystemPromptEntry extends SessionEntryBase {
  readonly type: "system_prompt";
  readonly content: string;
}

interface SettingsEntry extends SessionEntryBase {
  readonly type: "settings";
  readonly settings: ResponseSettings;
}

type MessageRole = "user" | "assistant" | "tool_result";

export interface MessageContentBlock {
  readonly type: "text" | "reasoning_summary" | "tool_call" | "error";
  readonly text?: string;
  readonly raw?: unknown;
}

export interface MessageEntry extends SessionEntryBase {
  readonly type: "message";
  readonly role: MessageRole;
  readonly content: readonly MessageContentBlock[];
  readonly raw?: unknown;
}

interface CompactionEntry extends SessionEntryBase {
  readonly type: "compaction";
  readonly summary: string;
  readonly firstKeptEntryId: string;
  readonly details?: unknown;
}

export type SessionEntry =
  | SystemPromptEntry
  | SettingsEntry
  | MessageEntry
  | CompactionEntry;

export interface SessionRecord {
  readonly header: SessionHeader;
  readonly entries: readonly SessionEntry[];
}

export interface SessionSummary {
  readonly id: string;
  readonly filePath: string;
  readonly timestamp: string;
  readonly leafId: string | null;
}

export interface SessionContext {
  readonly sessionId: string;
  readonly leafId: string | null;
  readonly systemPrompt: string;
  readonly settings: ResponseSettings;
  readonly messages: readonly MessageEntry[];
}
