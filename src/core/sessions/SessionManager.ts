import { randomUUID } from "node:crypto";

import type { SessionStore } from "./SessionStore.interface";
import type {
  MessageEntry,
  ResponseSettings,
  SessionContext,
  SessionEntry,
  SessionRecord,
} from "./entries";
import { SESSION_SCHEMA_VERSION } from "./entries";
import { createEntryId, nowIso } from "./ids";

interface SessionManagerOptions {
  readonly cwd: string;
  readonly store: SessionStore;
}

interface CreateSessionInput extends ResponseSettings {
  readonly systemPrompt: string;
}

export interface CreatedSession {
  readonly id: string;
  readonly filePath: string;
  readonly trunkLeafId: string;
}

/** Manages versioned tree conversations and builds the active root-to-leaf context. */
export class SessionManager {
  readonly #cwd: string;
  readonly #store: SessionStore;

  constructor(options: SessionManagerOptions) {
    this.#cwd = options.cwd;
    this.#store = options.store;
  }

  async createSession(input: CreateSessionInput): Promise<CreatedSession> {
    const sessionId = randomUUID();
    const timestamp = nowIso();
    const systemEntry: SessionEntry = {
      type: "system_prompt",
      id: createEntryId(),
      parentId: null,
      timestamp,
      content: input.systemPrompt,
    };
    const settingsEntry: SessionEntry = {
      type: "settings",
      id: createEntryId(),
      parentId: systemEntry.id,
      timestamp,
      settings: {
        model: input.model,
        reasoning: input.reasoning,
        responseOverrides: input.responseOverrides,
      },
    };
    const record: SessionRecord = {
      header: {
        type: "session",
        version: SESSION_SCHEMA_VERSION,
        id: sessionId,
        timestamp,
        cwd: this.#cwd,
        leafId: settingsEntry.id,
      },
      entries: [systemEntry, settingsEntry],
    };
    const filePath = await this.#store.create(record);
    return { id: sessionId, filePath, trunkLeafId: settingsEntry.id };
  }

  async continueRecentOrCreate(
    input: CreateSessionInput,
  ): Promise<CreatedSession> {
    const [recent] = await this.#store.list();
    if (recent) {
      const record = await this.#store.read(recent.id);
      return {
        id: recent.id,
        filePath: recent.filePath,
        trunkLeafId: record.header.leafId ?? record.entries.at(-1)?.id ?? "",
      };
    }
    return this.createSession(input);
  }

  async appendMessage(
    sessionId: string,
    input: Omit<MessageEntry, "type" | "id" | "parentId" | "timestamp">,
  ): Promise<MessageEntry> {
    const record = await this.#store.read(sessionId);
    const entry: MessageEntry = {
      type: "message",
      id: createEntryId(),
      parentId: record.header.leafId,
      timestamp: nowIso(),
      ...input,
    };
    await this.#store.append(sessionId, entry);
    return entry;
  }

  async appendSettings(
    sessionId: string,
    settings: ResponseSettings,
  ): Promise<void> {
    const record = await this.#store.read(sessionId);
    await this.#store.append(sessionId, {
      type: "settings",
      id: createEntryId(),
      parentId: record.header.leafId,
      timestamp: nowIso(),
      settings,
    });
  }

  async buildContext(sessionId: string): Promise<SessionContext> {
    const record = await this.#store.read(sessionId);
    const path = this.#activePath(record);
    const systemPrompt = [...path]
      .reverse()
      .find((entry) => entry.type === "system_prompt")?.content;
    const settings = [...path]
      .reverse()
      .find((entry) => entry.type === "settings")?.settings;

    return {
      sessionId,
      leafId: record.header.leafId,
      systemPrompt: systemPrompt ?? "",
      settings: settings ?? { model: "", responseOverrides: {} },
      messages: path.filter(
        (entry): entry is MessageEntry => entry.type === "message",
      ),
    };
  }

  async listSessions() {
    return this.#store.list();
  }

  #activePath(record: SessionRecord): SessionEntry[] {
    const byId = new Map(record.entries.map((entry) => [entry.id, entry]));
    const path: SessionEntry[] = [];
    let cursor = record.header.leafId;
    while (cursor) {
      const entry = byId.get(cursor);
      if (!entry) {
        break;
      }
      path.unshift(entry);
      cursor = entry.parentId;
    }
    return path;
  }
}
