import type { ConversationManager } from "../../../core/conversations/ConversationManager";
import type {
  ConversationMessage,
  MessageContentBlock,
} from "../../../core/conversations/entries";
import type {
  AgentMemory,
  AssistantContentBlock,
  MemoryRecord,
} from "../../../core/memory/AgentMemory.interface";
import type { ResponsesMessageInput } from "../../../core/responses/ResponsesTransport.interface";

/** Adapts linear conversations to the Agent Memory seam. */
export class ConversationMemory implements AgentMemory {
  readonly #conversations: ConversationManager;

  constructor(conversations: ConversationManager) {
    this.#conversations = conversations;
  }

  async prepareTurn(input: { readonly conversationId: string }) {
    const context = await this.#conversations.buildContext(
      input.conversationId,
    );
    return {
      systemPrompt: context.systemPrompt,
      settings: context.settings,
      messages: context.messages.map(toResponsesMessage),
    };
  }

  async record(record: MemoryRecord): Promise<void> {
    switch (record.type) {
      case "user_message":
        await this.#conversations.appendMessage(record.conversationId, {
          role: "user",
          content: [{ type: "text", text: record.content }],
        });
        return;
      case "assistant_message":
        await this.#conversations.appendMessage(record.conversationId, {
          role: "assistant",
          content: record.content.map(toConversationContentBlock),
          raw: record.raw,
        });
        return;
      case "tool_result":
        await this.#conversations.appendMessage(record.conversationId, {
          role: "tool_result",
          content: [{ type: "text", text: record.result.output }],
          raw: record.result,
        });
        return;
      case "settings_changed":
        await this.#conversations.updateSettings(
          record.conversationId,
          record.settings,
        );
        return;
    }
  }
}

function toResponsesMessage(
  message: ConversationMessage,
): ResponsesMessageInput {
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
}

function toConversationContentBlock(
  block: AssistantContentBlock,
): MessageContentBlock {
  if (block.type === "tool_call") {
    return { type: "tool_call", raw: block.toolCall };
  }
  if (block.type === "error") {
    return { type: "error", text: block.text, raw: block.raw };
  }
  return block;
}
