interface SseMessage {
  readonly data: string;
}

export async function* parseSseMessages(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<SseMessage> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    let frameEnd = buffer.indexOf("\n\n");
    while (frameEnd !== -1) {
      const frame = buffer.slice(0, frameEnd).trim();
      buffer = buffer.slice(frameEnd + 2);
      const data = frame
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .join("\n");
      if (data.length > 0 && data !== "[DONE]") {
        yield { data };
      }
      frameEnd = buffer.indexOf("\n\n");
    }
  }
}

function parseToolArguments(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export function mapResponsesEvent(raw: unknown) {
  if (typeof raw !== "object" || raw === null || !("type" in raw)) {
    return null;
  }
  const event = raw as Record<string, unknown>;

  if (
    event.type === "response.output_text.delta" &&
    typeof event.delta === "string"
  ) {
    return { type: "text.delta" as const, delta: event.delta, raw };
  }
  if (
    (event.type === "response.reasoning_summary_text.delta" ||
      event.type === "response.reasoning_summary.delta") &&
    typeof event.delta === "string"
  ) {
    return {
      type: "reasoning_summary.delta" as const,
      delta: event.delta,
      raw,
    };
  }
  if (event.type === "response.output_item.done") {
    const item = event.item as Record<string, unknown> | undefined;
    if (item?.type === "function_call" && typeof item.name === "string") {
      return {
        type: "tool_call" as const,
        callId: typeof item.call_id === "string" ? item.call_id : "",
        name: item.name,
        input: parseToolArguments(item.arguments),
        raw,
      };
    }
  }
  if (event.type === "response.completed") {
    return { type: "completed" as const, raw };
  }
  if (event.type === "response.failed") {
    return {
      type: "failed" as const,
      error: typeof event.error === "string" ? event.error : "Response failed.",
      raw,
    };
  }
  return null;
}
