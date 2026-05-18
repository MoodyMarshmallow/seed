import type { ReasoningSettings } from "../config/AgentConfigStore.interface";

export const CONVERSATION_SCHEMA_VERSION = 1;

export interface ResponseSettings {
  readonly model: string;
  readonly reasoning?: ReasoningSettings | undefined;
  readonly responseOverrides: Readonly<Record<string, unknown>>;
}

interface ConversationHeader {
  readonly type: "conversation";
  readonly version: typeof CONVERSATION_SCHEMA_VERSION;
  readonly id: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly cwd: string;
  readonly title?: string | undefined;
  readonly systemPrompt: string;
  readonly settings: ResponseSettings;
}

export interface MessageContentBlock {
  readonly type: "text" | "reasoning_summary" | "tool_call" | "error";
  readonly text?: string;
  readonly raw?: unknown;
}

type MessageRole = "user" | "assistant" | "tool_result";

export interface ConversationMessage {
  readonly role: MessageRole;
  readonly content: readonly MessageContentBlock[];
  readonly raw?: unknown;
}

export interface ConversationTurn {
  readonly id: string;
  readonly timestamp: string;
  readonly status: "open" | "completed" | "failed" | "cancelled";
  readonly messages: readonly ConversationMessage[];
}

export interface ConversationRecord {
  readonly header: ConversationHeader;
  readonly turns: readonly ConversationTurn[];
}

export interface ConversationSummary {
  readonly id: string;
  readonly filePath: string;
  readonly timestamp: string;
  readonly updatedAt: string;
  readonly title?: string | undefined;
}

export interface ConversationContext {
  readonly conversationId: string;
  readonly systemPrompt: string;
  readonly settings: ResponseSettings;
  readonly messages: readonly ConversationMessage[];
}
