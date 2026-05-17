import { join } from "node:path";

import { CodexAuthClient } from "../../adapters/codex/auth/CodexAuthClient";
import { CodexOAuthFlow } from "../../adapters/codex/auth/CodexOAuthFlow";
import { CodexResponsesTransport } from "../../adapters/codex/responses/CodexResponsesTransport";
import { JsonFileTokenStore } from "../../adapters/file-system/JsonFileTokenStore";
import { JsonlSessionStore } from "../../adapters/file-system/JsonlSessionStore";
import { TreeSessionMemory } from "../../adapters/memory/tree/TreeSessionMemory";
import { EmptyToolRegistry } from "../../adapters/tools/EmptyToolRegistry";
import { loadAgentConfig } from "../../config/config";
import { Agent } from "../../core/agent/Agent";
import { SessionManager } from "../../core/sessions/SessionManager";
import { ensureCliAuth } from "./auth";

export async function composeCliAgent(
  cwd: string,
  options: { readonly headlessAuth?: boolean } = {},
) {
  const config = await loadAgentConfig(cwd);
  const sessions = new SessionManager({
    cwd,
    store: new JsonlSessionStore({ rootDir: join(cwd, ".agent", "sessions") }),
  });
  const tokenStore = new JsonFileTokenStore({
    filePath: join(cwd, ".agent", "auth.json"),
  });
  const auth = new CodexAuthClient({ tokenStore });
  await ensureCliAuth({
    tokenStore,
    oauthFlow: new CodexOAuthFlow(),
    exchangeAuthorizationCode: (input) =>
      auth.exchangeAuthorizationCode({
        code: input.authorizationCode,
        redirectUri: input.redirectUri,
        codeVerifier: input.codeVerifier,
      }),
    headless: options.headlessAuth ?? false,
    output: (line) => process.stdout.write(`${line}\n`),
  });
  const transport = new CodexResponsesTransport({
    getAccessToken: () => auth.getAccessToken(),
  });
  const tools = new EmptyToolRegistry();
  const memory = new TreeSessionMemory(sessions);
  return {
    config,
    sessions,
    memory,
    agent: new Agent({ memory, transport, tools }),
  };
}
