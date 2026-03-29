import type { App } from "@slack/bolt";
import { generateText } from "ai";
import { getProvider } from "../lib/ai";
import { getHistory, appendHistory, clearHistory, homeKey } from "../memory/store";
import { getActivePersona, getActivePersonaInfo, setActivePersona, isValidPersona } from "../personas";
import { buildHomeView } from "../blocks/homeView";
import { config } from "../config";

export function registerHomeHandlers(app: App): void {
  // Render home tab when user opens it
  app.event("app_home_opened", async ({ event, client, logger }) => {
    if (event.tab !== "home") return;

    const userId = event.user;
    try {
      await client.views.publish({
        user_id: userId,
        view: buildHomeView(getHistory(homeKey(userId)), getActivePersonaInfo(userId)),
      });
    } catch (err) {
      logger.error("app_home_opened: views.publish failed", err);
    }
  });

  // Handle "Send" button
  app.action("home_submit_button", async ({ body, client, ack, logger }) => {
    await ack();

    const userId = body.user.id;
    const state = (body as any).view?.state?.values as Record<string, Record<string, any>>;
    const prompt: string = state?.home_input_block?.home_message_input?.value?.trim() ?? "";

    if (!prompt) return;

    const key = homeKey(userId);

    // Optimistically re-render with thinking indicator
    try {
      await client.views.publish({
        user_id: userId,
        view: buildHomeView(
          [...getHistory(key), { role: "user", content: prompt }, { role: "assistant", content: "_Thinking..._" }],
          getActivePersonaInfo(userId)
        ),
      });
    } catch (_) { /* non-critical */ }

    try {
      const history = getHistory(key);
      const { text: response } = await generateText({
        model: getProvider(config.DEFAULT_PROVIDER),
        system: getActivePersona(userId),
        messages: [...history, { role: "user", content: prompt }],
      });

      appendHistory(key, prompt, response);

      await client.views.publish({
        user_id: userId,
        view: buildHomeView(getHistory(key), getActivePersonaInfo(userId)),
      });
    } catch (err) {
      logger.error("home_submit: generateText failed", err);
    }
  });

  // Handle "Clear History" button
  app.action("home_clear_button", async ({ body, client, ack, logger }) => {
    await ack();

    const userId = body.user.id;
    clearHistory(homeKey(userId));

    try {
      await client.views.publish({
        user_id: userId,
        view: buildHomeView([], getActivePersonaInfo(userId)),
      });
    } catch (err) {
      logger.error("home_clear: views.publish failed", err);
    }
  });

  // Handle persona selector in App Home
  app.action("home_persona_select", async ({ body, client, ack, logger }) => {
    await ack();

    const userId = body.user.id;
    const selected = (body as any).actions?.[0]?.selected_option?.value ?? "";

    if (isValidPersona(selected)) {
      setActivePersona(userId, selected);
    }

    try {
      await client.views.publish({
        user_id: userId,
        view: buildHomeView(getHistory(homeKey(userId)), getActivePersonaInfo(userId)),
      });
    } catch (err) {
      logger.error("home_persona_select: views.publish failed", err);
    }
  });
}
