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
  const { config, conversations, memory, agent } = await composeCliAgent(cwd, {
    headlessAuth: args.includes("--headless-auth"),
  });
  const rl = createCliReadline();
  let conversation = args.includes("--resume")
    ? await conversations.continueRecentOrCreate(config)
    : await selectInitialConversation({
        conversations,
        config,
        io: {
          question: (prompt) => rl.question(prompt),
          write: (text) => process.stdout.write(text),
        },
      });
  process.stdout.write(`Conversation ${conversation.id}\n`);
  process.stdout.write(
    await renderConversationHistory(conversations, conversation.id),
  );
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
        conversation = await conversations.createConversation(config);
        process.stdout.write(`Conversation ${conversation.id}\n`);
        continue;
      }
      if (input === "/resume") {
        conversation = await conversations.continueRecentOrCreate(config);
        process.stdout.write(`Conversation ${conversation.id}\n`);
        process.stdout.write(
          await renderConversationHistory(conversations, conversation.id),
        );
        continue;
      }
      if (
        input.startsWith("/model ") ||
        input.startsWith("/reasoning ") ||
        input.startsWith("/set-json ")
      ) {
        const context = await memory.prepareTurn({
          conversationId: conversation.id,
        });
        await memory.record({
          type: "settings_changed",
          conversationId: conversation.id,
          settings: applyCliSettingsCommand(context.settings, input),
        });
        process.stdout.write("Settings updated.\n");
        continue;
      }

      const renderer = new CliTurnRenderer();
      for await (const event of agent.runTurn({
        conversationId: conversation.id,
        userMessage: input,
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
