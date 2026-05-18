import { AgentError } from "../errors/AgentError";
import type {
  Tool,
  ToolCallRequest,
  ToolCallResult,
  ToolDefinition,
} from "./Tool.interface";

/** Lists available tools and dispatches tool calls by name. */
export class ToolRegistry {
  readonly #tools: ReadonlyMap<string, Tool>;

  constructor(tools: readonly Tool[]) {
    this.#tools = new Map(tools.map((tool) => [tool.definition.name, tool]));
  }

  async list(): Promise<readonly ToolDefinition[]> {
    return [...this.#tools.values()].map((tool) => tool.definition);
  }

  async execute(request: ToolCallRequest): Promise<ToolCallResult> {
    const tool = this.#tools.get(request.name);
    if (!tool) {
      return {
        callId: request.callId,
        name: request.name,
        output: new AgentError({
          code: "tool_unavailable",
          message: `Tool '${request.name}' is not available in this agent.`,
        }).message,
        isError: true,
      };
    }
    return tool.execute(request);
  }
}
