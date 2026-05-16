import { spawn } from "node:child_process";

import type { CodexOAuthLogin } from "../../adapters/codex/auth/CodexOAuthFlow";
import type { TokenStore } from "../../core/auth/TokenStore";

interface OAuthFlowPort {
  readonly start: () => Promise<CodexOAuthLogin>;
}

interface EnsureCliAuthOptions {
  readonly tokenStore: TokenStore;
  readonly oauthFlow: OAuthFlowPort;
  readonly exchangeAuthorizationCode: (input: {
    readonly code: string;
    readonly redirectUri: string;
    readonly codeVerifier: string;
  }) => Promise<unknown>;
  readonly headless: boolean;
  readonly output: (line: string) => void;
  readonly openUrl?: (url: string) => Promise<void>;
}

/** Ensures the CLI has local Codex auth, starting OAuth when no token exists. */
export async function ensureCliAuth(
  options: EnsureCliAuthOptions,
): Promise<void> {
  const existing = await options.tokenStore.read();
  if (existing) {
    return;
  }

  options.output("No local Codex login found. Starting OAuth login.");
  const login = await options.oauthFlow.start();
  options.output(`Open this URL to authorize the agent:\n${login.authUrl}`);

  if (!options.headless) {
    await (options.openUrl ?? openBrowser)(login.authUrl);
  }

  const code = await login.waitForCode();
  await options.exchangeAuthorizationCode({
    code,
    redirectUri: login.redirectUri,
    codeVerifier: login.codeVerifier,
  });
  options.output("Codex login saved locally.");
}

async function openBrowser(url: string): Promise<void> {
  const command =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "cmd"
        : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  const child = spawn(command, args, { detached: true, stdio: "ignore" });
  child.unref();
}
