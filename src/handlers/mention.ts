import type { App } from "@slack/bolt";
import { generateText } from "ai";
import { getProvider } from "../lib/ai";
import { getHistory, appendHistory, threadKey } from "../memory/store";
import { getActivePersona } from "../personas";
import { config } from "../config";

export function registerMentionHandler(app: App): void {
  app.event("app_mention", async ({ event, client, logger }) => {
    logger.info(`Received app_mention event: ${JSON.stringify(event)}`);
    const { text, thread_ts, ts, channel, user } = event as any;

    // The thread root is thread_ts if we're in a thread, otherwise this message's ts
    const rootTs = thread_ts ?? ts;
    const memKey = threadKey(rootTs);

    // Strip bot mention tag from the prompt
    const prompt = text.replace(/<@[A-Z0-9]+>/g, "").trim();

    if (!prompt) {
      await client.chat.postMessage({
        channel,
        thread_ts: rootTs,
        text: "Hi! Mention me with a question and I'll answer. Try `/mode` to change my persona.",
      });
      return;
    }

    // Post a "thinking" placeholder immediately so the user gets feedback
    let thinkingTs: string | undefined;
    try {
      const placeholder = await client.chat.postMessage({
        channel,
        thread_ts: rootTs,
        text: "_Thinking..._",
      });
      thinkingTs = placeholder.ts as string;
    } catch (err) {
      logger.error("Failed to post thinking placeholder", err);
    }

    try {
      const history = getHistory(memKey);
      const { text: response } = await generateText({
        model: getProvider(config.DEFAULT_PROVIDER),
        system: getActivePersona(user ?? ""),
        messages: [...history, { role: "user", content: prompt }],
      });

      appendHistory(memKey, prompt, response);

      // Update the placeholder with the real response
      if (thinkingTs) {
        await client.chat.update({
          channel,
          ts: thinkingTs,
          text: response,
        });
      } else {
        await client.chat.postMessage({ channel, thread_ts: rootTs, text: response });
      }
    } catch (err) {
      logger.error("mention handler: generateText failed", err);
      const errorMsg = "Sorry, something went wrong. Please try again.";
      if (thinkingTs) {
        await client.chat.update({ channel, ts: thinkingTs, text: errorMsg });
      } else {
        await client.chat.postMessage({ channel, thread_ts: rootTs, text: errorMsg });
      }
    }
  });
}
