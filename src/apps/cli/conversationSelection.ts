import type { AgentConfig } from "../../config/schema";
import type {
  CreatedSession,
  SessionManager,
} from "../../core/sessions/SessionManager";
import type { SessionSummary } from "../../core/sessions/entries";

type ConversationSelectionManager = Pick<
  SessionManager,
  "listSessions" | "createSession"
>;

export interface ConversationSelectionIo {
  readonly question: (prompt: string) => Promise<string>;
  readonly write: (text: string) => void;
}

export function formatConversationChoices(
  conversations: readonly SessionSummary[],
): string {
  const lines = ["Choose a conversation:", "  1. New conversation"];
  conversations.forEach((conversation, index) => {
    lines.push(`  ${index + 2}. ${formatConversationLabel(conversation)}`);
  });
  return `${lines.join("\n")}\n`;
}

export function resolveConversationSelection(
  input: string,
  conversationCount: number,
):
  | { readonly type: "new" }
  | { readonly type: "existing"; readonly index: number }
  | null {
  const selected = Number.parseInt(input.trim(), 10);
  if (!Number.isInteger(selected)) {
    return null;
  }
  if (selected === 1) {
    return { type: "new" };
  }
  const index = selected - 2;
  if (index >= 0 && index < conversationCount) {
    return { type: "existing", index };
  }
  return null;
}

/** Presents saved conversations by number so users do not need to remember IDs. */
export async function selectInitialConversation(input: {
  readonly sessions: ConversationSelectionManager;
  readonly config: AgentConfig;
  readonly io: ConversationSelectionIo;
}): Promise<CreatedSession> {
  const existing = await input.sessions.listSessions();
  if (existing.length === 0) {
    input.io.write(
      "No existing conversations found. Creating a new conversation.\n",
    );
    return input.sessions.createSession(input.config);
  }

  input.io.write(formatConversationChoices(existing));
  while (true) {
    const answer = await input.io.question("Select conversation number: ");
    const selection = resolveConversationSelection(answer, existing.length);
    if (!selection) {
      input.io.write(`Enter a number from 1 to ${existing.length + 1}.\n`);
      continue;
    }
    if (selection.type === "new") {
      return input.sessions.createSession(input.config);
    }

    const selected = existing[selection.index];
    if (!selected) {
      input.io.write(`Enter a number from 1 to ${existing.length + 1}.\n`);
      continue;
    }
    return {
      id: selected.id,
      filePath: selected.filePath,
      trunkLeafId: selected.leafId ?? "",
    };
  }
}

function formatConversationLabel(conversation: SessionSummary): string {
  return `${new Date(conversation.timestamp).toLocaleString()} (${conversation.id.slice(0, 8)})`;
}
