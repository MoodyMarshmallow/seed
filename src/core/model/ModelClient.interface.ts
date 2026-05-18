import type { ResponseSettings } from "../conversations/entries";
import type { ToolDefinition } from "../tools/Tool.interface";

export type ModelMessageInput =
  | {
      readonly role: "user" | "assistant";
      readonly content: string;
    }
  | {
      readonly role: "tool_call";
      readonly callId: string;
      readonly name: string;
      readonly input: unknown;
    }
  | {
      readonly role: "tool_result";
      readonly callId: string;
      readonly content: string;
    };

export interface ModelRequest {
  readonly systemPrompt: string;
  readonly settings: ResponseSettings;
  readonly messages: readonly ModelMessageInput[];
  readonly tools: readonly ToolDefinition[];
}

export type ModelStreamEvent =
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
export interface ModelClient {
  /**
   * Starts a response for the supplied context and tools.
   * Events must be yielded in model order with one terminal event.
   */
  readonly stream: (request: ModelRequest) => AsyncIterable<ModelStreamEvent>;
}
