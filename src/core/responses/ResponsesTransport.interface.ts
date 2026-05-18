import type { ResponseSettings } from "../conversations/entries";
import type { ToolDefinition } from "../tools/ToolRegistry.interface";

export interface ResponsesMessageInput {
  readonly role: "user" | "assistant" | "tool_result";
  readonly content: string;
  readonly callId?: string | undefined;
}

export interface ResponsesRequest {
  readonly systemPrompt: string;
  readonly settings: ResponseSettings;
  readonly messages: readonly ResponsesMessageInput[];
  readonly tools: readonly ToolDefinition[];
}

export type ResponsesStreamEvent =
  | {
      readonly type: "text.delta";
      readonly delta: string;
      readonly raw: unknown;
    }
  | {
      readonly type: "reasoning_summary.delta";
      readonly delta: string;
      readonly raw: unknown;
    }
  | {
      readonly type: "tool_call";
      readonly callId: string;
      readonly name: string;
      readonly input: unknown;
      readonly raw: unknown;
    }
  | { readonly type: "completed"; readonly raw: unknown }
  | { readonly type: "failed"; readonly error: string; readonly raw: unknown };

/**
 * Streams normalized model response events.
 */
export interface ResponsesTransport {
  /**
   * Starts a response for the supplied context and tools.
   * Events must be yielded in model order with one terminal event.
   */
  readonly stream: (
    request: ResponsesRequest,
  ) => AsyncIterable<ResponsesStreamEvent>;
}
