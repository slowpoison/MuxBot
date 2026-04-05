import type { ModelMessage } from "ai";

export type { ModelMessage as CoreMessage };

export type MemoryKey = string;

export type ProviderName = "gemini" | "openai" | "nebius" | "ollama";

export type PersonaName = "general" | "property" | "software";

export interface MemoryEntry {
  messages: ModelMessage[];
  lastUpdated: number;
}
