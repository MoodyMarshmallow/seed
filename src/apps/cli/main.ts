#!/usr/bin/env bun
import { applyCliSettingsCommand, helpText } from "./commands";
import { composeCliAgent } from "./compose";
import { createCliReadline } from "./readline";
import { renderEvent } from "./render";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    process.stdout.write(helpText());
    return;
  }

  const cwd = process.env.AGENT_SEED_CWD ?? process.cwd();
  const { config, sessions, agent } = await composeCliAgent(cwd, {
    headlessAuth: args.includes("--headless-auth"),
  });
  let session = args.includes("--resume")
    ? await sessions.continueRecentOrCreate(config)
    : await sessions.createSession(config);

  const rl = createCliReadline();
  process.stdout.write(`Session ${session.id}\n`);
  try {
    while (true) {
      const input = (await rl.question("> ")).trim();
      if (input.length === 0) {
        continue;
      }
      if (input === "/exit") {
        return;
      }
      if (input === "/new") {
        session = await sessions.createSession(config);
        process.stdout.write(`Session ${session.id}\n`);
        continue;
      }
      if (input === "/resume") {
        session = await sessions.continueRecentOrCreate(config);
        process.stdout.write(`Session ${session.id}\n`);
        continue;
      }
      if (
        input.startsWith("/model ") ||
        input.startsWith("/reasoning ") ||
        input.startsWith("/set-json ")
      ) {
        const context = await sessions.buildContext(session.id);
        await sessions.appendSettings(
          session.id,
          applyCliSettingsCommand(context.settings, input),
        );
        process.stdout.write("Settings updated.\n");
        continue;
      }

      for await (const event of agent.runTurn({
        sessionId: session.id,
        input,
      })) {
        const rendered = renderEvent(event);
        if (rendered.length > 0) {
          process.stdout.write(`${rendered}\n`);
        }
      }
    }
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
