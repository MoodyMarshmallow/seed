import { AgentError } from "../../../core/errors/AgentError";
import type {
  ResponsesRequest,
  ResponsesStreamEvent,
  ResponsesTransport,
} from "../../../core/responses/ResponsesTransport";
import { mapResponsesEvent, parseSseMessages } from "./responsesEvents";
import { buildCodexResponsesBody } from "./responsesRequest";

const CODEX_RESPONSES_ENDPOINT =
  "https://chatgpt.com/backend-api/codex/responses";

interface CodexResponsesTransportOptions {
  readonly getAccessToken: () => Promise<string>;
  readonly fetch?: (input: string, init?: RequestInit) => Promise<Response>;
}

/** Direct streaming transport for the Codex subscription Responses endpoint. */
export class CodexResponsesTransport implements ResponsesTransport {
  readonly #getAccessToken: () => Promise<string>;
  readonly #fetch: (input: string, init?: RequestInit) => Promise<Response>;

  constructor(options: CodexResponsesTransportOptions) {
    this.#getAccessToken = options.getAccessToken;
    this.#fetch = options.fetch ?? fetch;
  }

  async *stream(
    request: ResponsesRequest,
  ): AsyncGenerator<ResponsesStreamEvent> {
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
