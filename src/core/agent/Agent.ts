import type {
  AgentMemory,
  AssistantContentBlock,
} from "../memory/AgentMemory.interface";
import type { ModelClient } from "../model/ModelClient.interface";
import type { ToolCallRequest } from "../tools/Tool.interface";
import type { ToolRegistry } from "../tools/ToolRegistry";
import type { AgentTurnEvent } from "./events";

export interface AgentDependencies {
  readonly memory: AgentMemory;
  readonly model: ModelClient;
  readonly tools: ToolRegistry;
}

export interface RunTurnInput {
  readonly conversationId: string;
  readonly input: string;
}

interface AssistantPassResult {
  readonly toolCalls: ToolCallRequest[];
}

/** Core agent orchestrator. It depends on Memory, model client, and tools. */
export class Agent {
  readonly #memory: AgentMemory;
  readonly #model: ModelClient;
  readonly #tools: ToolRegistry;

  constructor(dependencies: AgentDependencies) {
    this.#memory = dependencies.memory;
    this.#model = dependencies.model;
    this.#tools = dependencies.tools;
  }

  async *runTurn(input: RunTurnInput): AsyncGenerator<AgentTurnEvent> {
    await this.#memory.record({
      type: "user_message",
      conversationId: input.conversationId,
      content: input.input,
    });

    const firstPass: AssistantPassResult = { toolCalls: [] };
    yield* this.#streamAssistantPass(input.conversationId, firstPass);

    if (firstPass.toolCalls.length === 0) {
      yield { type: "completed" };
      return;
    }

    for (const toolCall of firstPass.toolCalls) {
      const result = await this.#tools.execute(toolCall);
      await this.#memory.record({
        type: "tool_result",
        conversationId: input.conversationId,
        result,
      });
      yield { type: "tool_result", ...result };
    }

    yield* this.#streamAssistantPass(input.conversationId, { toolCalls: [] });
    yield { type: "completed" };
  }

  async *#streamAssistantPass(
    conversationId: string,
    result: AssistantPassResult,
  ): AsyncGenerator<AgentTurnEvent> {
    const context = await this.#memory.prepareTurn({ conversationId });
    const tools = await this.#tools.list();
    const content: AssistantContentBlock[] = [];

    for await (const event of this.#model.stream({
      systemPrompt: context.systemPrompt,
      settings: context.settings,
      messages: context.messages,
      tools,
    })) {
      switch (event.type) {
        case "reasoning_summary.delta":
          content.push({ type: "reasoning_summary", text: event.delta });
          yield { type: event.type, delta: event.delta };
          break;
        case "text.delta":
          content.push({ type: "text", text: event.delta });
          yield { type: event.type, delta: event.delta };
          break;
        case "tool_call": {
          const toolCall = {
            callId: event.callId,
            name: event.name,
            input: event.input,
          };
          result.toolCalls.push(toolCall);
          content.push({ type: "tool_call", toolCall });
          yield { type: "tool_call", ...toolCall };
          break;
        }
        case "failed":
          content.push({ type: "error", text: event.error, raw: event.raw });
          break;
        case "completed":
          break;
      }
    }

    await this.#memory.record({
      type: "assistant_message",
      conversationId,
      content,
    });
  }
}
