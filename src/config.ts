import "dotenv/config";
import { z } from "zod";
import type { ProviderName } from "./types";

const schema = z.object({
  SLACK_BOT_TOKEN: z.string().startsWith("xoxb-"),
  SLACK_APP_TOKEN: z.string().startsWith("xapp-"),
  SLACK_SIGNING_SECRET: z.string().min(8),

  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  NEBIUS_API_KEY: z.string().optional(),

  OLLAMA_BASE_URL: z.string().url().default("http://localhost:11434"),
  OLLAMA_MODEL: z.string().default("llama3.2"),

  DEFAULT_PROVIDER: z.enum(["gemini", "openai", "nebius", "ollama"]).optional(),

  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

export type Config = z.infer<typeof schema>;
export const config = schema.parse(process.env);

export function resolveProvider(cfg: Config): {
  provider: ProviderName;
  source: "explicit" | "auto";
} {
  if (cfg.DEFAULT_PROVIDER) {
    return { provider: cfg.DEFAULT_PROVIDER, source: "explicit" };
  }
  if (cfg.GOOGLE_GENERATIVE_AI_API_KEY) return { provider: "gemini", source: "auto" };
  if (cfg.OPENAI_API_KEY) return { provider: "openai", source: "auto" };
  if (cfg.NEBIUS_API_KEY) return { provider: "nebius", source: "auto" };
  return { provider: "ollama", source: "auto" };
}
