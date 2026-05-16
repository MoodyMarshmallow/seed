import type {
  ResponsesMessageInput,
  ResponsesTransport,
} from "../responses/ResponsesTransport";
import type { SessionManager } from "../sessions/SessionManager";
import type { MessageContentBlock, MessageEntry } from "../sessions/entries";
import type { ToolCallRequest, ToolRegistry } from "../tools/ToolRegistry";
import type { AgentTurnEvent } from "./events";

export interface AgentOptions {
  readonly sessions: SessionManager;
  readonly transport: ResponsesTransport;
  readonly tools: ToolRegistry;
}

export interface RunTurnInput {
  readonly sessionId: string;
  readonly input: string;
}

/** Core agent orchestrator. It depends only on ports and session APIs. */
export class Agent {
  readonly #sessions: SessionManager;
  readonly #transport: ResponsesTransport;
  readonly #tools: ToolRegistry;

  constructor(options: AgentOptions) {
    this.#sessions = options.sessions;
    this.#transport = options.transport;
    this.#tools = options.tools;
  }

  async *runTurn(input: RunTurnInput): AsyncGenerator<AgentTurnEvent> {
    await this.#sessions.appendMessage(input.sessionId, {
      role: "user",
      content: [{ type: "text", text: input.input }],
    });

    const firstPass = await this.#collectAssistantPass(input.sessionId);
    yield* firstPass.events;

    if (firstPass.toolCalls.length === 0) {
      yield { type: "completed" };
      return;
    }

    for (const toolCall of firstPass.toolCalls) {
      const result = await this.#tools.execute(toolCall);
      await this.#sessions.appendMessage(input.sessionId, {
        role: "tool_result",
        content: [{ type: "text", text: result.output }],
        raw: result,
      });
      yield { type: "tool_result", ...result };
    }

    const secondPass = await this.#collectAssistantPass(input.sessionId);
    yield* secondPass.events;
    yield { type: "completed" };
  }

  async #collectAssistantPass(sessionId: string): Promise<{
    readonly events: readonly AgentTurnEvent[];
    readonly toolCalls: readonly ToolCallRequest[];
  }> {
    const context = await this.#sessions.buildContext(sessionId);
    const tools = await this.#tools.list();
    const events: AgentTurnEvent[] = [];
    const content: MessageContentBlock[] = [];
    const toolCalls: ToolCallRequest[] = [];

    for await (const event of this.#transport.stream({
      systemPrompt: context.systemPrompt,
      settings: context.settings,
      messages: this.#toResponsesMessages(context.messages),
      tools,
    })) {
      switch (event.type) {
        case "reasoning_summary.delta":
          content.push({ type: "reasoning_summary", text: event.delta });
          events.push({ type: event.type, delta: event.delta });
          break;
        case "text.delta":
          content.push({ type: "text", text: event.delta });
          events.push({ type: event.type, delta: event.delta });
          break;
        case "tool_call": {
          const toolCall = {
            callId: event.callId,
            name: event.name,
            input: event.input,
          };
          toolCalls.push(toolCall);
          content.push({ type: "tool_call", raw: toolCall });
          events.push({ type: "tool_call", ...toolCall });
          break;
        }
        case "failed":
          content.push({ type: "error", text: event.error, raw: event.raw });
          break;
        case "completed":
          break;
      }
    }

    await this.#sessions.appendMessage(sessionId, {
      role: "assistant",
      content,
    });

    return { events, toolCalls };
  }

  #toResponsesMessages(
    messages: readonly MessageEntry[],
  ): readonly ResponsesMessageInput[] {
    return messages.map((message) => {
      const callId =
        message.role === "tool_result" &&
        typeof message.raw === "object" &&
        message.raw &&
        "callId" in message.raw
          ? String(message.raw.callId)
          : undefined;
      return {
        role: message.role,
        content: message.content
          .filter((block) => block.type !== "reasoning_summary")
          .map((block) => block.text ?? JSON.stringify(block.raw))
          .join(""),
        ...(callId ? { callId } : {}),
      };
    });
  }
}
