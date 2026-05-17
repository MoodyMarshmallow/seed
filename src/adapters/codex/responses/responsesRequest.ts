import type { ResponsesRequest } from "../../../core/responses/ResponsesTransport";

export function buildCodexResponsesBody(
  request: ResponsesRequest,
): Record<string, unknown> {
  return {
    ...request.settings.responseOverrides,
    model: request.settings.model,
    instructions: request.systemPrompt,
    store: false,
    reasoning: request.settings.reasoning,
    input: request.messages.map((message) => {
      if (message.role === "tool_result") {
        return {
          type: "function_call_output",
          call_id: message.callId,
          output: message.content,
        };
      }
      return {
        role: message.role,
        content: [
          {
            type: message.role === "assistant" ? "output_text" : "input_text",
            text: message.content,
          },
        ],
      };
    }),
    tools: request.tools.map((tool) => ({
      type: "function",
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    })),
    stream: true,
  };
}
