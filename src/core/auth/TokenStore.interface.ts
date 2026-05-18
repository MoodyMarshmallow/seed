export interface CodexTokenRecord {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAt: number;
  readonly account: {
    readonly email: string | null;
    readonly planType: string | null;
  } | null;
}

/**
 * Persistence interface for Codex subscription auth tokens.
 */
export interface TokenStore {
  /**
   * Returns the current record, or null when none exists.
   */
  readonly read: () => Promise<CodexTokenRecord | null>;

  /**
   * Replaces any existing record with the supplied record.
   */
  readonly write: (record: CodexTokenRecord) => Promise<void>;

  /**
   * Leaves the store empty, even when it was already empty.
   */
  readonly clear: () => Promise<void>;
}
