import type { App } from "@slack/bolt";
import {
  PERSONAS,
  setActivePersona,
  getActivePersonaInfo,
  isValidPersona,
} from "../personas";

export function registerModeHandler(app: App): void {
  app.command("/mode", async ({ command, ack, respond }) => {
    await ack();

    const { user_id, text } = command;
    const requested = text.trim().toLowerCase();

    // No argument: show current mode and available options
    if (!requested) {
      const current = getActivePersonaInfo(user_id);
      const options = Object.values(PERSONAS)
        .map((p) => `• \`${p.name}\` ${p.emoji} — ${p.label}`)
        .join("\n");

      await respond({
        response_type: "ephemeral",
        text: `Current mode: ${current.emoji} *${current.label}*\n\nAvailable modes:\n${options}\n\nUsage: \`/mode <name>\``,
      });
      return;
    }

    if (!isValidPersona(requested)) {
      const names = Object.keys(PERSONAS).join(", ");
      await respond({
        response_type: "ephemeral",
        text: `Unknown mode \`${requested}\`. Available: ${names}`,
      });
      return;
    }

    setActivePersona(user_id, requested);
    const persona = PERSONAS[requested];

    await respond({
      response_type: "ephemeral",
      text: `${persona.emoji} Switched to *${persona.label}* mode. Your next messages will use this persona.`,
    });
  });
}
