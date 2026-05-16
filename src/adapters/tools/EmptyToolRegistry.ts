import { AgentError } from "../../core/errors/AgentError";
import type {
  ToolCallRequest,
  ToolRegistry,
} from "../../core/tools/ToolRegistry";

/** Tool registry for projects that have not wired external tools yet. */
export class EmptyToolRegistry implements ToolRegistry {
  async list() {
    return [];
  }

  async execute(request: ToolCallRequest) {
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
}
