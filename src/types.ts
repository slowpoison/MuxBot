import type { CoreMessage } from "ai";

export type { CoreMessage };

export type MemoryKey = string;

export type ProviderName = "gemini" | "openai" | "nebius";

export type PersonaName = "general" | "property" | "software";

export interface MemoryEntry {
  messages: CoreMessage[];
  lastUpdated: number;
}
