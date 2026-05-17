import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { AgentError } from "../../core/errors/AgentError";
import type { SessionStore } from "../../core/sessions/SessionStore";
import type {
  SessionEntry,
  SessionHeader,
  SessionRecord,
  SessionSummary,
} from "../../core/sessions/entries";
import {
  sessionEntrySchema,
  sessionHeaderSchema,
} from "../../core/sessions/schema";

interface JsonlSessionStoreOptions {
  readonly rootDir: string;
}

/** File-backed append-only JSONL conversation store used by the CLI harness and tests. */
export class JsonlSessionStore implements SessionStore {
  readonly #rootDir: string;
  readonly #pathsById = new Map<string, string>();

  constructor(options: JsonlSessionStoreOptions) {
    this.#rootDir = options.rootDir;
  }

  async create(record: SessionRecord): Promise<string> {
    await mkdir(this.#rootDir, { recursive: true });
    const filePath = join(
      this.#rootDir,
      `${record.header.timestamp.replaceAll(":", "-")}_${record.header.id}.jsonl`,
    );
    const lines = [record.header, ...record.entries].map((entry) =>
      JSON.stringify(entry),
    );
    await writeFile(filePath, `${lines.join("\n")}\n`, "utf8");
    this.#pathsById.set(record.header.id, filePath);
    return filePath;
  }

  async read(sessionId: string): Promise<SessionRecord> {
    const filePath = await this.#pathForSession(sessionId);
    const lines = (await readFile(filePath, "utf8"))
      .split("\n")
      .filter((line) => line.trim().length > 0);
    const [headerLine, ...entryLines] = lines;
    if (!headerLine) {
      throw new AgentError({
        code: "session_invalid",
        message: `Session file ${filePath} is empty.`,
      });
    }

    try {
      return {
        header: sessionHeaderSchema.parse(JSON.parse(headerLine)),
        entries: entryLines.map((line) =>
          sessionEntrySchema.parse(JSON.parse(line)),
        ) as SessionEntry[],
      };
    } catch (cause) {
      throw new AgentError({
        code: "session_invalid",
        message: `Session file ${filePath} is invalid.`,
        cause,
      });
    }
  }

  async writeHeader(header: SessionHeader): Promise<void> {
    const record = await this.read(header.id);
    const filePath = await this.#pathForSession(header.id);
    const lines = [header, ...record.entries].map((entry) =>
      JSON.stringify(entry),
    );
    await writeFile(filePath, `${lines.join("\n")}\n`, "utf8");
  }

  async append(sessionId: string, entry: SessionEntry): Promise<void> {
    const record = await this.read(sessionId);
    const filePath = await this.#pathForSession(sessionId);
    const header = { ...record.header, leafId: entry.id };
    const lines = [header, ...record.entries, entry].map((line) =>
      JSON.stringify(line),
    );
    await writeFile(filePath, `${lines.join("\n")}\n`, "utf8");
  }

  async list(): Promise<readonly SessionSummary[]> {
    await mkdir(this.#rootDir, { recursive: true });
    const names = await readdir(this.#rootDir);
    const summaries: SessionSummary[] = [];
    for (const name of names.filter((file) => file.endsWith(".jsonl"))) {
      const filePath = join(this.#rootDir, name);
      const firstLine = (await readFile(filePath, "utf8")).split("\n")[0];
      if (!firstLine) {
        continue;
      }
      const header = sessionHeaderSchema.parse(JSON.parse(firstLine));
      this.#pathsById.set(header.id, filePath);
      summaries.push({
        id: header.id,
        filePath,
        timestamp: header.timestamp,
        leafId: header.leafId,
      });
    }
    return summaries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  async #pathForSession(sessionId: string): Promise<string> {
    const cached = this.#pathsById.get(sessionId);
    if (cached) {
      return cached;
    }
    const match = (await this.list()).find(
      (summary) => summary.id === sessionId,
    );
    if (!match) {
      throw new AgentError({
        code: "session_missing",
        message: `Session ${sessionId} does not exist.`,
      });
    }
    return match.filePath;
  }
}
