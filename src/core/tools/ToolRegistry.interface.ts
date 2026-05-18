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

export interface ToolCallResult {
  readonly callId: string;
  readonly name: string;
  readonly output: string;
  readonly isError: boolean;
}

/**
 * Lists available tools and executes tool calls.
 */
export interface ToolRegistry {
  /**
   * Returns the tool definitions exposed to the next model pass.
   */
  readonly list: () => Promise<readonly ToolDefinition[]>;

  /**
   * Executes one tool call.
   * The returned `callId` must match the request.
   */
  readonly execute: (request: ToolCallRequest) => Promise<ToolCallResult>;
}
