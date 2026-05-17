import type { SessionManager } from "../../core/sessions/SessionManager";
import type { MessageEntry } from "../../core/sessions/entries";

/** Renders the active branch history for a resumed session. */
export async function renderSessionHistory(
  sessions: Pick<SessionManager, "buildContext">,
  sessionId: string,
): Promise<string> {
  const context = await sessions.buildContext(sessionId);
  if (context.messages.length === 0) {
    return "";
  }

  return `\nPrevious conversation:\n${context.messages.map(renderMessage).join("\n\n")}\n\n`;
}

function renderMessage(message: MessageEntry): string {
  const label =
    message.role === "user"
      ? "You"
      : message.role === "assistant"
        ? "Assistant"
        : "Tool";
  const body = renderContentBlocks(message.content);
  return `${label}:\n${body}`;
}

function renderContentBlocks(content: MessageEntry["content"]): string {
  const lines: string[] = [];
  let textBuffer = "";

  for (const block of content) {
    if (block.type === "text") {
      textBuffer += block.text ?? formatRaw(block.raw);
      continue;
    }

    if (textBuffer.length > 0) {
      lines.push(textBuffer);
      textBuffer = "";
    }

    const rendered = renderContentBlock(block);
    if (rendered.length > 0) {
      lines.push(rendered);
    }
  }

  if (textBuffer.length > 0) {
    lines.push(textBuffer);
  }

  return lines.join("\n");
}

function renderContentBlock(block: MessageEntry["content"][number]): string {
  if (block.type === "reasoning_summary") {
    return `[reasoning] ${block.text ?? ""}`;
  }
  if (block.type === "tool_call") {
    return `[tool call] ${formatRaw(block.raw)}`;
  }
  if (block.type === "error") {
    return `[error] ${block.text ?? formatRaw(block.raw)}`;
  }
  return block.text ?? formatRaw(block.raw);
}

function formatRaw(raw: unknown): string {
  if (raw === undefined) {
    return "";
  }
  if (typeof raw === "string") {
    return raw;
  }
  return JSON.stringify(raw);
}
