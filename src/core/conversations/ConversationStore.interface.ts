import type { ConversationRecord, ConversationSummary } from "./entries";

/**
 * Stores complete conversation records.
 */
export interface ConversationStore {
  /**
   * Creates a conversation and returns its storage location.
   */
  readonly create: (record: ConversationRecord) => Promise<string>;

  /**
   * Reads the complete conversation record.
   */
  readonly read: (conversationId: string) => Promise<ConversationRecord>;

  /**
   * Replaces the complete conversation record.
   * Turn order and open-turn invariants must be preserved.
   */
  readonly write: (record: ConversationRecord) => Promise<void>;

  /**
   * Lists known conversations with enough metadata to resume them.
   */
  readonly list: () => Promise<readonly ConversationSummary[]>;
}
