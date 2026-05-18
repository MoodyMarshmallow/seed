import type { ResponseSettings } from "../conversations/entries";
import type { ResponsesMessageInput } from "../responses/ResponsesTransport.interface";
import type {
  ToolCallRequest,
  ToolCallResult,
} from "../tools/ToolRegistry.interface";

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

/**
 * Prepares model context and records conversation events.
 */
export interface AgentMemory {
  /**
   * Returns the active settings and replayable messages for the conversation.
   * Raw reasoning must not be included.
   */
  readonly prepareTurn: (input: {
    readonly conversationId: string;
  }) => Promise<PreparedTurn>;

  /**
   * Appends one event to the conversation.
   * Once resolved, the event must be visible to later `prepareTurn` calls.
   */
  readonly record: (record: MemoryRecord) => Promise<void>;
}
