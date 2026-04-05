import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createOllama } from "ai-sdk-ollama";
import type { LanguageModel } from "ai";
import { config } from "../config";
import type { ProviderName } from "../types";

const gemini = createGoogleGenerativeAI({
  apiKey: config.GOOGLE_GENERATIVE_AI_API_KEY ?? "",
});

const openai = createOpenAI({
  apiKey: config.OPENAI_API_KEY ?? "",
});

const nebius = createOpenAICompatible({
  name: "nebius",
  // baseURL: "https://api.studio.nebius.ai/v1/",
  baseURL: "https://api.tokenfactory.us-central1.nebius.com/v1/",
  apiKey: config.NEBIUS_API_KEY ?? "",
});

const ollamaClient = createOllama({ baseURL: config.OLLAMA_BASE_URL });

const MODELS: Record<ProviderName, LanguageModel> = {
  //gemini: gemini("gemini-2.5-flash-lite"),
  gemini: gemini("gemini-2.5-flash"),
  openai: openai("gpt-4o"),
  nebius: nebius("meta-llama/Meta-Llama-3.1-70B-Instruct"),
  ollama: ollamaClient(config.OLLAMA_MODEL),
};

export function getProvider(name: ProviderName = config.DEFAULT_PROVIDER): LanguageModel {
  const model = MODELS[name];
  if (!model) throw new Error(`Unknown provider: ${name}`);
  return model;
}
