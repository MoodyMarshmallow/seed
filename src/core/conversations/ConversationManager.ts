import { randomUUID } from "node:crypto";

import { AgentError } from "../errors/AgentError";
import type { ConversationStore } from "./ConversationStore.interface";
import type {
  ConversationContext,
  ConversationMessage,
  ConversationRecord,
  ConversationTurn,
  ResponseSettings,
} from "./entries";
import { CONVERSATION_SCHEMA_VERSION } from "./entries";
import { createTurnId, nowIso } from "./ids";

interface ConversationManagerOptions {
  readonly cwd: string;
  readonly store: ConversationStore;
}

interface CreateConversationInput extends ResponseSettings {
  readonly systemPrompt: string;
}

export interface CreatedConversation {
  readonly id: string;
  readonly filePath: string;
}

/** Manages linear conversations and builds replay context. */
export class ConversationManager {
  readonly #cwd: string;
  readonly #store: ConversationStore;

  constructor(options: ConversationManagerOptions) {
    this.#cwd = options.cwd;
    this.#store = options.store;
  }

  async createConversation(
    input: CreateConversationInput,
  ): Promise<CreatedConversation> {
    const conversationId = randomUUID();
    const timestamp = nowIso();
    const record: ConversationRecord = {
      header: {
        type: "conversation",
        version: CONVERSATION_SCHEMA_VERSION,
        id: conversationId,
        createdAt: timestamp,
        updatedAt: timestamp,
        cwd: this.#cwd,
        systemPrompt: input.systemPrompt,
        settings: {
          model: input.model,
          reasoning: input.reasoning,
          responseOverrides: input.responseOverrides,
        },
      },
      turns: [],
    };
    const filePath = await this.#store.create(record);
    return { id: conversationId, filePath };
  }

  async continueRecentOrCreate(
    input: CreateConversationInput,
  ): Promise<CreatedConversation> {
    const [recent] = await this.#store.list();
    if (recent) {
      return { id: recent.id, filePath: recent.filePath };
    }
    return this.createConversation(input);
  }

  async appendMessage(
    conversationId: string,
    message: ConversationMessage,
  ): Promise<ConversationMessage> {
    const record = await this.#store.read(conversationId);
    const turns = [...record.turns];
    const latest = turns.at(-1);

    if (message.role === "user") {
      if (latest?.status === "open") {
        throw new AgentError({
          code: "conversation_invalid",
          message: "Cannot start a new turn while another turn is open.",
        });
      }
      turns.push({
        id: createTurnId(),
        timestamp: nowIso(),
        status: "open",
        messages: [message],
      });
    } else if (latest?.status === "open") {
      turns[turns.length - 1] = {
        ...latest,
        status: completesTurn(message) ? "completed" : latest.status,
        messages: [...latest.messages, message],
      };
    } else {
      throw new AgentError({
        code: "conversation_invalid",
        message: "Cannot append an agent message without an open turn.",
      });
    }

    await this.#store.write({
      header: { ...record.header, updatedAt: nowIso() },
      turns,
    });
    return message;
  }

  async updateSettings(
    conversationId: string,
    settings: ResponseSettings,
  ): Promise<void> {
    const record = await this.#store.read(conversationId);
    await this.#store.write({
      ...record,
      header: { ...record.header, updatedAt: nowIso(), settings },
    });
  }

  async undoLatestTurn(conversationId: string): Promise<void> {
    const record = await this.#store.read(conversationId);
    await this.#store.write({
      header: { ...record.header, updatedAt: nowIso() },
      turns: record.turns.slice(0, -1),
    });
  }

  async buildContext(conversationId: string): Promise<ConversationContext> {
    const record = await this.#store.read(conversationId);
    return {
      conversationId,
      systemPrompt: record.header.systemPrompt,
      settings: record.header.settings,
      messages: record.turns.flatMap((turn) => turn.messages),
    };
  }

  async listConversations() {
    return this.#store.list();
  }
}

function completesTurn(message: ConversationMessage) {
  if (message.role !== "assistant") {
    return false;
  }
  return !message.content.some((block) => block.type === "tool_call");
}
