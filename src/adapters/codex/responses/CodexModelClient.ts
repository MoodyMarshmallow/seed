import { AgentError } from "../../../core/errors/AgentError";
import type {
  ModelClient,
  ModelRequest,
  ModelStreamEvent,
} from "../../../core/model/ModelClient.interface";
import { mapResponsesEvent, parseSseMessages } from "./responsesEvents";
import { buildCodexResponsesBody } from "./responsesRequest";

const CODEX_RESPONSES_ENDPOINT =
  "https://chatgpt.com/backend-api/codex/responses";

interface CodexModelClientOptions {
  readonly getAccessToken: () => Promise<string>;
  readonly fetch?: (input: string, init?: RequestInit) => Promise<Response>;
}

/** Direct model client for the Codex subscription Responses endpoint. */
export class CodexModelClient implements ModelClient {
  readonly #getAccessToken: () => Promise<string>;
  readonly #fetch: (input: string, init?: RequestInit) => Promise<Response>;

  constructor(options: CodexModelClientOptions) {
    this.#getAccessToken = options.getAccessToken;
    this.#fetch = options.fetch ?? fetch;
  }

  async *stream(request: ModelRequest): AsyncGenerator<ModelStreamEvent> {
    const accessToken = await this.#getAccessToken();
    const response = await this.#fetch(CODEX_RESPONSES_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildCodexResponsesBody(request)),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new AgentError({
        code: "transport_failed",
        message: `Codex Responses request failed with status ${response.status}.${detail ? ` ${detail}` : ""}`,
        retryable: response.status >= 500,
      });
    }

    if (!response.body) {
      throw new AgentError({
        code: "transport_failed",
        message: "Codex Responses request did not include a stream body.",
      });
    }

    for await (const message of parseSseMessages(response.body)) {
      const mapped = mapResponsesEvent(JSON.parse(message.data));
      if (mapped) {
        yield mapped;
      }
    }
  }
}
