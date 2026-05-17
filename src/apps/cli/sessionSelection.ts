import type { AgentConfig } from "../../config/schema";
import type {
  CreatedSession,
  SessionManager,
} from "../../core/sessions/SessionManager";
import type { SessionSummary } from "../../core/sessions/entries";

type SessionSelectionManager = Pick<
  SessionManager,
  "listSessions" | "createSession"
>;

export interface SessionSelectionIo {
  readonly question: (prompt: string) => Promise<string>;
  readonly write: (text: string) => void;
}

export function formatSessionChoices(
  sessions: readonly SessionSummary[],
): string {
  const lines = ["Choose a session:", "  1. New session"];
  sessions.forEach((session, index) => {
    lines.push(`  ${index + 2}. ${formatSessionLabel(session)}`);
  });
  return `${lines.join("\n")}\n`;
}

export function resolveSessionSelection(
  input: string,
  sessionCount: number,
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
  if (index >= 0 && index < sessionCount) {
    return { type: "existing", index };
  }
  return null;
}

/** Presents saved sessions by number so users do not need to remember IDs. */
export async function selectInitialSession(input: {
  readonly sessions: SessionSelectionManager;
  readonly config: AgentConfig;
  readonly io: SessionSelectionIo;
}): Promise<CreatedSession> {
  const existing = await input.sessions.listSessions();
  if (existing.length === 0) {
    input.io.write("No existing sessions found. Creating a new session.\n");
    return input.sessions.createSession(input.config);
  }

  input.io.write(formatSessionChoices(existing));
  while (true) {
    const answer = await input.io.question("Select session number: ");
    const selection = resolveSessionSelection(answer, existing.length);
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

function formatSessionLabel(session: SessionSummary): string {
  return `${new Date(session.timestamp).toLocaleString()} (${session.id.slice(0, 8)})`;
}
