export interface ToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Readonly<Record<string, unknown>>;
}

export interface ToolCallRequest {
  readonly callId: string;
  readonly name: string;
  readonly input: unknown;
}

interface ToolCallResult {
  readonly callId: string;
  readonly name: string;
  readonly output: string;
  readonly isError: boolean;
}

export interface ToolRegistry {
  readonly list: () => Promise<readonly ToolDefinition[]>;
  readonly execute: (request: ToolCallRequest) => Promise<ToolCallResult>;
}
