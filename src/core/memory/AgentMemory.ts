import type { ResponsesMessageInput } from "../responses/ResponsesTransport";
import type { ResponseSettings } from "../sessions/entries";
import type { ToolCallRequest, ToolCallResult } from "../tools/ToolRegistry";

interface PreparedTurn {
  readonly systemPrompt: string;
  readonly settings: ResponseSettings;
  readonly messages: readonly ResponsesMessageInput[];
}

export type AssistantContentBlock =
  | { readonly type: "text"; readonly text: string }
  | { readonly type: "reasoning_summary"; readonly text: string }
  | { readonly type: "tool_call"; readonly toolCall: ToolCallRequest }
  | { readonly type: "error"; readonly text: string; readonly raw?: unknown };

export type MemoryRecord =
  | {
      readonly type: "user_message";
      readonly conversationId: string;
      readonly content: string;
    }
  | {
      readonly type: "assistant_message";
      readonly conversationId: string;
      readonly content: readonly AssistantContentBlock[];
      readonly raw?: unknown;
    }
  | {
      readonly type: "tool_result";
      readonly conversationId: string;
      readonly result: ToolCallResult;
    }
  | {
      readonly type: "settings_changed";
      readonly conversationId: string;
      readonly settings: ResponseSettings;
    };

export interface AgentMemory {
  readonly prepareTurn: (input: {
    readonly conversationId: string;
  }) => Promise<PreparedTurn>;
  readonly record: (record: MemoryRecord) => Promise<void>;
}
