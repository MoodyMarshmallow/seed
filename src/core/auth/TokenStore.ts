export interface CodexTokenRecord {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAt: number;
  readonly account: {
    readonly email: string | null;
    readonly planType: string | null;
  } | null;
}

export interface TokenStore {
  readonly read: () => Promise<CodexTokenRecord | null>;
  readonly write: (record: CodexTokenRecord) => Promise<void>;
  readonly clear: () => Promise<void>;
}
