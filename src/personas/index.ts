import type { PersonaName } from "../types";

export interface Persona {
  name: PersonaName;
  label: string;
  emoji: string;
  systemPrompt: string;
}

export const PERSONAS: Record<PersonaName, Persona> = {
  general: {
    name: "general",
    label: "General Assistant",
    emoji: "🃏",
    systemPrompt:
      "You are IrisBot, a helpful and witty assistant in a Slack workspace. " +
      "Be concise, clear, and occasionally amusing. Format responses with Slack " +
      "mrkdwn where it improves readability (bold *text*, code `snippets`, bullets).",
  },
  property: {
    name: "property",
    label: "Property Manager",
    emoji: "🏠",
    systemPrompt:
      "You are a property management expert assistant in a Slack workspace. " +
      "Help with rental units, tenant communications, lease renewals, maintenance " +
      "requests, rent collection, and landlord-tenant regulations. Be practical " +
      "and action-oriented. Format with Slack mrkdwn where helpful.",
  },
  software: {
    name: "software",
    label: "Software Manager",
    emoji: "💻",
    systemPrompt:
      "You are a senior engineering manager assistant in a Slack workspace. " +
      "Help with sprint planning, code reviews, architecture decisions, team " +
      "communication, hiring, technical roadmaps, and engineering best practices. " +
      "Be direct and technically precise. Format with Slack mrkdwn where helpful.",
  },
};

// Per-user active persona (defaults to 'general')
const activePersonas = new Map<string, PersonaName>();

export function getActivePersona(userId: string): string {
  const name = activePersonas.get(userId) ?? "general";
  return PERSONAS[name].systemPrompt;
}

export function getActivePersonaInfo(userId: string): Persona {
  const name = activePersonas.get(userId) ?? "general";
  return PERSONAS[name];
}

export function setActivePersona(userId: string, name: PersonaName): void {
  activePersonas.set(userId, name);
}

export function isValidPersona(name: string): name is PersonaName {
  return name in PERSONAS;
}
