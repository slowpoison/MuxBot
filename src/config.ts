import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  SLACK_BOT_TOKEN: z.string().startsWith("xoxb-"),
  SLACK_APP_TOKEN: z.string().startsWith("xapp-"),
  SLACK_SIGNING_SECRET: z.string().min(8),

  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  NEBIUS_API_KEY: z.string().optional(),

  DEFAULT_PROVIDER: z.enum(["gemini", "openai", "nebius"]).default("gemini"),

  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

export type Config = z.infer<typeof schema>;
export const config = schema.parse(process.env);
