import type { AgentTurnEvent } from "../../core/agent/events";

export function renderEvent(event: AgentTurnEvent): string {
  switch (event.type) {
    case "reasoning_summary.delta":
      return `[reasoning] ${event.delta}`;
    case "text.delta":
      return event.delta;
    case "tool_call":
      return `[tool call] ${event.name} ${event.callId}`;
    case "tool_result":
      return `[tool result] ${event.isError ? "error" : "ok"}: ${event.output}`;
    case "completed":
      return "";
  }
}
