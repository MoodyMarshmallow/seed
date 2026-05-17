import { z } from "zod";

import type { ResponseSettings } from "../../core/sessions/entries";

const jsonObjectSchema = z.record(z.string(), z.unknown());

export function helpText(): string {
  return `seed

Usage:
  bun run agent [--new] [--resume] [--headless-auth]

Options:
  --headless-auth        Print the OAuth URL instead of opening a browser

Chat commands:
  /model <model>          Change the branch-local model setting
  /reasoning <effort>     Change branch-local reasoning effort
  /set-json <json>        Merge arbitrary Responses overrides
  /new                    Start a new session
  /resume                 Resume the most recent session
  /exit                   Quit
`;
}

/** Applies CLI-only settings commands to the current branch-local settings snapshot. */
export function applyCliSettingsCommand(
  settings: ResponseSettings,
  command: string,
): ResponseSettings {
  const trimmed = command.trim();
  if (trimmed.startsWith("/model ")) {
    return { ...settings, model: trimmed.slice("/model ".length).trim() };
  }
  if (trimmed.startsWith("/reasoning ")) {
    return {
      ...settings,
      reasoning: {
        ...(settings.reasoning ?? {}),
        effort: trimmed.slice("/reasoning ".length).trim(),
      },
    };
  }
  if (trimmed.startsWith("/set-json ")) {
    const parsed = jsonObjectSchema.parse(
      JSON.parse(trimmed.slice("/set-json ".length)),
    );
    return {
      ...settings,
      responseOverrides: { ...settings.responseOverrides, ...parsed },
    };
  }
  return settings;
}
