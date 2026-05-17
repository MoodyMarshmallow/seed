#!/usr/bin/env bun
import { applyCliSettingsCommand, helpText } from "./commands";
import { composeCliAgent } from "./compose";
import { renderConversationHistory } from "./conversationHistory";
import { selectInitialConversation } from "./conversationSelection";
import { createCliReadline } from "./readline";
import { CliTurnRenderer } from "./render";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    process.stdout.write(helpText());
    return;
  }

  const cwd = process.env.SEED_CWD ?? process.cwd();
  const { config, sessions, memory, agent } = await composeCliAgent(cwd, {
    headlessAuth: args.includes("--headless-auth"),
  });
  const rl = createCliReadline();
  let session = args.includes("--resume")
    ? await sessions.continueRecentOrCreate(config)
    : await selectInitialConversation({
        sessions,
        config,
        io: {
          question: (prompt) => rl.question(prompt),
          write: (text) => process.stdout.write(text),
        },
      });
  process.stdout.write(`Conversation ${session.id}\n`);
  process.stdout.write(await renderConversationHistory(sessions, session.id));
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
        process.stdout.write(`Conversation ${session.id}\n`);
        continue;
      }
      if (input === "/resume") {
        session = await sessions.continueRecentOrCreate(config);
        process.stdout.write(`Conversation ${session.id}\n`);
        process.stdout.write(
          await renderConversationHistory(sessions, session.id),
        );
        continue;
      }
      if (
        input.startsWith("/model ") ||
        input.startsWith("/reasoning ") ||
        input.startsWith("/set-json ")
      ) {
        const context = await memory.prepareTurn({
          conversationId: session.id,
        });
        await memory.record({
          type: "settings_changed",
          conversationId: session.id,
          settings: applyCliSettingsCommand(context.settings, input),
        });
        process.stdout.write("Settings updated.\n");
        continue;
      }

      const renderer = new CliTurnRenderer();
      for await (const event of agent.runTurn({
        conversationId: session.id,
        input,
      })) {
        const rendered = renderer.render(event);
        if (rendered.length > 0) {
          process.stdout.write(rendered);
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
