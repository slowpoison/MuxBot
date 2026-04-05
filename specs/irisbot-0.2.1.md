# IrisBot — Technical Specification

**Version:** 0.2.1
**Date:** 2026-04-05
**Base:** 0.2.0

---

## Overview

Version 0.2.1 makes provider selection intelligent. Instead of requiring `DEFAULT_PROVIDER` to be set explicitly, IrisBot inspects which API keys are present at startup and selects the first configured provider automatically.

`DEFAULT_PROVIDER` remains supported as an explicit override. Startup fails fast with a clear error if no provider can be resolved.

All handlers, personas, memory, and UI are unchanged.

---

## Changes from 0.2.0

| Area | Change |
|------|--------|
| `src/config.ts` | `DEFAULT_PROVIDER` becomes optional (no default); add `resolveProvider()` helper |
| `src/lib/ai.ts` | Call `resolveProvider()` to determine active provider at startup |
| `.env.example` | Mark `DEFAULT_PROVIDER` as optional with a note on auto-detection |

No handler, persona, memory, UI, or dependency files change.

---

## Provider Resolution Logic

At startup, `resolveProvider()` returns the active `ProviderName` using this ordered priority:

1. If `DEFAULT_PROVIDER` is set in env → use it (validate it is a known provider name).
2. Otherwise, probe in order: `gemini` → `openai` → `nebius` → `ollama`.
   - `gemini`: selected if `GOOGLE_GENERATIVE_AI_API_KEY` is a non-empty string.
   - `openai`: selected if `OPENAI_API_KEY` is a non-empty string.
   - `nebius`: selected if `NEBIUS_API_KEY` is a non-empty string.
   - `ollama`: always considered available (no key required); selected as the final fallback.
3. If no provider can be resolved (impossible today because Ollama is always available, but guarded for future provider additions), throw a startup error.

The resolved provider is logged at `info` level on startup, e.g.:

```
[info] provider: gemini (auto-detected)
[info] provider: openai (DEFAULT_PROVIDER)
```

---

## Implementation Details

### `src/config.ts`

Remove `.default("gemini")` from the `DEFAULT_PROVIDER` field and make it fully optional:

```ts
DEFAULT_PROVIDER: z.enum(["gemini", "openai", "nebius", "ollama"]).optional(),
```

Add a `resolveProvider()` function:

```ts
export function resolveProvider(cfg: Config): { provider: ProviderName; source: "explicit" | "auto" } {
  if (cfg.DEFAULT_PROVIDER) {
    return { provider: cfg.DEFAULT_PROVIDER, source: "explicit" };
  }
  if (cfg.GOOGLE_GENERATIVE_AI_API_KEY) return { provider: "gemini",  source: "auto" };
  if (cfg.OPENAI_API_KEY)               return { provider: "openai",  source: "auto" };
  if (cfg.NEBIUS_API_KEY)               return { provider: "nebius",  source: "auto" };
  return { provider: "ollama", source: "auto" };
}
```

### `src/lib/ai.ts`

Replace any hardcoded `config.DEFAULT_PROVIDER` reference with a module-level constant resolved at import time:

```ts
import { config, resolveProvider } from "../config";

const { provider: activeProvider, source } = resolveProvider(config);
logger.info(`provider: ${activeProvider} (${source === "explicit" ? "DEFAULT_PROVIDER" : "auto-detected"})`);

export function getProvider(name: ProviderName = activeProvider): LanguageModel {
  // existing switch unchanged
}
```

All call sites that pass no argument to `getProvider()` automatically use the resolved provider.

---

## Startup Behaviour

| Scenario | Outcome |
|----------|---------|
| `DEFAULT_PROVIDER=gemini` set, key present | Uses `gemini`; logs `(DEFAULT_PROVIDER)` |
| `DEFAULT_PROVIDER=gemini` set, key absent | Starts normally; error surfaces on first request (consistent with 0.2.0) |
| `DEFAULT_PROVIDER` unset, only `OPENAI_API_KEY` present | Auto-selects `openai`; logs `(auto-detected)` |
| `DEFAULT_PROVIDER` unset, multiple keys present | Selects highest-priority key in probe order |
| `DEFAULT_PROVIDER` unset, no cloud keys present | Falls back to `ollama`; logs `(auto-detected)` |
| `DEFAULT_PROVIDER` set to unknown value | Zod rejects at startup with a validation error |

---

## Limitations

- **Key presence ≠ key validity** — Auto-detection checks that a key string is non-empty; it does not validate the key against the provider's API. An invalid key surfaces as a runtime error on the first request.
- **Ollama reachability** — When Ollama is the fallback and the server is not running, the error surfaces on first request, not at startup.
- **Probe order is fixed** — There is no config option to change the auto-detection priority order; set `DEFAULT_PROVIDER` explicitly if the default order does not suit your setup.
