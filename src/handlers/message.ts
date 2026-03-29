import type { App } from "@slack/bolt";
import { generateText } from "ai";
import { getProvider } from "../lib/ai";
import { getHistory, appendHistory, dmKey } from "../memory/store";
import { getActivePersona } from "../personas";
import { config } from "../config";

export function registerMessageHandler(app: App): void {
  // Only handle human messages in DM channels (im), skip bot messages and subtypes
  app.message(async ({ message, client, logger }) => {
    const msg = message as any;
    const isDM = msg.channel?.startsWith("D");
    const isGroup = msg.channel?.startsWith("G");
    const isPublic = msg.channel?.startsWith("C");

    logger.info(`Received message event: channel=${msg.channel}, type=${msg.channel_type}, subtype=${msg.subtype}`);

    if (msg.subtype !== undefined) {
      return;
    }

    // Only respond to DMs or when explicitly mentioned in channels
    // (app_mention handles mentions better, but we can check here too)
    if (!isDM && msg.channel_type !== "im") {
      // If it's not a DM, we only care if it's an app_mention which is handled elsewhere
      // However, some messages in channels might not have channel_type set.
      return;
    }

    if (!msg.user || !msg.text) {
      logger.warn("Message missing user or text");
      return;
    }

    const { text, channel, user, thread_ts } = msg;
    const memKey = dmKey(channel, user);
    const prompt = (text as string).trim();
    if (!prompt) return;

    // Post thinking placeholder
    let thinkingTs: string | undefined;
    try {
      const placeholder = await client.chat.postMessage({
        channel,
        text: "_Thinking..._",
        ...(thread_ts ? { thread_ts } : {}),
      });
      thinkingTs = placeholder.ts as string;
    } catch (err) {
      logger.error("DM: failed to post placeholder", err);
    }

    try {
      const history = getHistory(memKey);
      const { text: response } = await generateText({
        model: getProvider(config.DEFAULT_PROVIDER),
        system: getActivePersona(user),
        messages: [...history, { role: "user", content: prompt }],
      });

      appendHistory(memKey, prompt, response);

      if (thinkingTs) {
        await client.chat.update({ channel, ts: thinkingTs, text: response });
      } else {
        await client.chat.postMessage({ channel, text: response });
      }
    } catch (err) {
      logger.error("DM handler: generateText failed", err);
      const errorMsg = "Sorry, something went wrong. Please try again.";
      if (thinkingTs) {
        await client.chat.update({ channel, ts: thinkingTs, text: errorMsg });
      } else {
        await client.chat.postMessage({ channel, text: errorMsg });
      }
    }
  });
}
