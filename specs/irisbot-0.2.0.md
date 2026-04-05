# IrisBot — Technical Specification

**Version:** 0.2.0
**Date:** 2026-04-05
**Base:** 0.1.0

---

## Overview

Version 0.2.0 adds a local [Ollama](https://ollama.com) provider, enabling IrisBot to route requests to any model running on a local or self-hosted Ollama instance. No API key is required. The Ollama host URL and model are configurable via environment variables.

All existing providers, handlers, personas, and memory behaviour are unchanged.

---

## Changes from 0.1.0

### New provider: `ollama`

| Area | Change |
|------|--------|
| `src/types.ts` | Add `"ollama"` to `ProviderName` union |
| `src/lib/ai.ts` | Add Ollama branch using `@ai-sdk/ollama` |
| `src/config.ts` | Add `OLLAMA_BASE_URL`, `OLLAMA_MODEL`; extend `DEFAULT_PROVIDER` enum |
| `.env.example` | Document new optional vars |
| `package.json` | Add `ai-sdk-ollama` dependency |

No handler, persona, memory, or UI files change.

---

## New Dependency

```
ai-sdk-ollama
```

Provides a Vercel AI SDK-compatible `LanguageModel` backed by a local Ollama HTTP server.

---

## Configuration

Two new optional environment variables. Both have sensible defaults so an out-of-the-box Ollama install works without any configuration beyond setting `DEFAULT_PROVIDER=ollama`.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OLLAMA_BASE_URL` | No | `http://localhost:11434` | Base URL of the Ollama server |
| `OLLAMA_MODEL` | No | `llama3.2` | Model tag to use (must be pulled on the Ollama host) |

All existing variables are unchanged. The `DEFAULT_PROVIDER` enum is extended:

```
gemini | openai | nebius | ollama
```

Zod validation rejects any value not in the enum. If `DEFAULT_PROVIDER=ollama` and the Ollama server is unreachable, the process starts normally — the error surfaces only when the first request is made (consistent with existing cloud provider behaviour).

---

## AI Providers (updated)

| Provider | SDK | Model |
|----------|-----|-------|
| `gemini` | `@ai-sdk/google` | `gemini-2.5-flash` |
| `openai` | `@ai-sdk/openai` | `gpt-4o` |
| `nebius` | `@ai-sdk/openai-compatible` | `meta-llama/Meta-Llama-3.1-70B-Instruct` |
| `ollama` | `ai-sdk-ollama` | `config.ollamaModel` (env: `OLLAMA_MODEL`) |

`getProvider("ollama")` instantiates the Ollama client pointed at `config.ollamaBaseUrl` and returns a `LanguageModel` for `config.ollamaModel`.

---

## Implementation Details

### `src/config.ts`

Add to the Zod schema:

```ts
ollamaBaseUrl: z.string().url().default("http://localhost:11434"),
ollamaModel:   z.string().default("llama3.2"),
defaultProvider: z.enum(["gemini", "openai", "nebius", "ollama"]).default("gemini"),
```

Sourced from `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, and `DEFAULT_PROVIDER` respectively.

### `src/types.ts`

```ts
export type ProviderName = "gemini" | "openai" | "nebius" | "ollama";
```

### `src/lib/ai.ts`

```ts
import { createOllama } from "ai-sdk-ollama";

case "ollama": {
  const ollama = createOllama({ baseURL: config.ollamaBaseUrl });
  return ollama(config.ollamaModel);
}
```

---

## Limitations

- **Model availability** — The requested `OLLAMA_MODEL` must already be pulled on the Ollama host (`ollama pull <model>`). IrisBot does not pull models automatically.
- **No runtime model switching** — Like other providers, the Ollama model is fixed at startup via env config.
- **Network locality** — When deployed remotely, `OLLAMA_BASE_URL` must point to a reachable Ollama host; `localhost` only works for local dev.
- **No streaming** — Consistent with all other providers; uses `generateText` (batch).
