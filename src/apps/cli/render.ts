import type { AgentTurnEvent } from "../../core/agent/events";

export class CliTurnRenderer {
  #inTextBlock = false;

  /** Renders streaming text inline while keeping metadata events readable. */
  render(event: AgentTurnEvent): string {
    switch (event.type) {
      case "reasoning_summary.delta":
        return `${this.#breakTextBlock()}[reasoning] ${event.delta}\n`;
      case "text.delta":
        this.#inTextBlock = true;
        return event.delta;
      case "tool_call":
        return `${this.#breakTextBlock()}[tool call] ${event.name} ${event.callId}\n`;
      case "tool_result":
        return `${this.#breakTextBlock()}[tool result] ${event.isError ? "error" : "ok"}: ${event.output}\n`;
      case "completed":
        return this.#breakTextBlock();
    }
  }

  #breakTextBlock(): string {
    if (!this.#inTextBlock) {
      return "";
    }
    this.#inTextBlock = false;
    return "\n";
  }
}
