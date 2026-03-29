import type { App } from "@slack/bolt";
import { generateText } from "ai";
import { getProvider } from "../lib/ai";
import { getHistory, appendHistory, threadKey, dmKey, slashKey } from "../memory/store";
import { getActivePersona } from "../personas";
import { config } from "../config";

export function registerSlashHandler(app: App): void {
  app.command("/ask", async ({ command, ack, respond, logger }) => {
    // Must ack within 3 seconds — do it immediately before any async work
    await ack();

    const { text, channel_id, user_id, thread_ts, channel_name } = command;
    const prompt = text.trim();

    if (!prompt) {
      await respond({
        response_type: "ephemeral",
        text: "Usage: `/ask <your question>`",
      });
      return;
    }

    // Resolve memory key based on context
    const memKey = thread_ts
      ? threadKey(thread_ts)
      : channel_name === "directmessage"
        ? dmKey(channel_id, user_id)
        : slashKey(channel_id, user_id);

    try {
      const history = getHistory(memKey);
      const { text: response } = await generateText({
        model: getProvider(config.DEFAULT_PROVIDER),
        system: getActivePersona(user_id),
        messages: [...history, { role: "user", content: prompt }],
      });

      appendHistory(memKey, prompt, response);

      await respond({
        response_type: "in_channel",
        blocks: [
          {
            type: "section",
            text: { type: "mrkdwn", text: `*You asked:* ${prompt}` },
          },
          { type: "divider" },
          {
            type: "section",
            text: { type: "mrkdwn", text: response },
          },
        ],
        text: response, // fallback for notifications
      });
    } catch (err) {
      logger.error("/ask: generateText failed", err);
      await respond({
        response_type: "ephemeral",
        text: "Sorry, something went wrong. Please try again.",
      });
    }
  });
}
