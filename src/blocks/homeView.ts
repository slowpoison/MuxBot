import type { View, Block, KnownBlock } from "@slack/types";
import type { CoreMessage } from "../types";
import type { Persona } from "../personas";
import { PERSONAS } from "../personas";

export function buildHomeView(messages: CoreMessage[], activePersona: Persona): View {
  const historyBlocks: (KnownBlock | Block)[] = messages.flatMap((msg) => {
    const isUser = msg.role === "user";
    const label = isUser ? ":bust_in_silhouette: *You*" : `${activePersona.emoji} *IrisBot*`;
    const text = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
    return [
      {
        type: "section" as const,
        text: { type: "mrkdwn" as const, text: `${label}\n${text}` },
      },
      { type: "divider" as const },
    ];
  });

  const personaOptions = Object.values(PERSONAS).map((p) => ({
    text: { type: "plain_text" as const, text: `${p.emoji} ${p.label}`, emoji: true },
    value: p.name,
  }));

  return {
    type: "home",
    callback_id: "home_view",
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "🃏 IrisBot", emoji: true },
      },
      {
        type: "actions",
        block_id: "home_persona_block",
        elements: [
          {
            type: "static_select",
            action_id: "home_persona_select",
            placeholder: {
              type: "plain_text",
              text: `${activePersona.emoji} ${activePersona.label}`,
            },
            options: personaOptions,
          },
        ],
      },
      { type: "divider" },
      ...(historyBlocks.length > 0
        ? historyBlocks
        : [
            {
              type: "section" as const,
              text: {
                type: "mrkdwn" as const,
                text: "_No messages yet. Say something below!_",
              },
            },
            { type: "divider" as const },
          ]),
      {
        type: "input",
        block_id: "home_input_block",
        dispatch_action: false,
        element: {
          type: "plain_text_input",
          action_id: "home_message_input",
          placeholder: { type: "plain_text", text: "Type your message..." },
          multiline: true,
        },
        label: { type: "plain_text", text: "Message", emoji: false },
      },
      {
        type: "actions",
        block_id: "home_actions_block",
        elements: [
          {
            type: "button",
            action_id: "home_submit_button",
            text: { type: "plain_text", text: "Send", emoji: false },
            style: "primary",
          },
          {
            type: "button",
            action_id: "home_clear_button",
            text: { type: "plain_text", text: "Clear History", emoji: false },
            style: "danger",
            confirm: {
              title: { type: "plain_text", text: "Clear history?" },
              text: {
                type: "mrkdwn",
                text: "This will erase your entire conversation with IrisBot.",
              },
              confirm: { type: "plain_text", text: "Yes, clear it" },
              deny: { type: "plain_text", text: "Cancel" },
            },
          },
        ],
      },
    ],
  };
}
