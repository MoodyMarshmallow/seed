import type { SessionHeader, SessionRecord, SessionSummary } from "./entries";

export interface SessionStore {
  readonly create: (record: SessionRecord) => Promise<string>;
  readonly read: (sessionId: string) => Promise<SessionRecord>;
  readonly writeHeader: (header: SessionHeader) => Promise<void>;
  readonly append: (
    sessionId: string,
    entry: SessionRecord["entries"][number],
  ) => Promise<void>;
  readonly list: () => Promise<readonly SessionSummary[]>;
}
