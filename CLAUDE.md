# IrisBot — Project Context
Use specs/ dir for detailed context on versions

## What this is

A multi-provider Slack AI bot built with the Vercel AI SDK. It supports switching between LLM providers (Gemini, OpenAI, Nebius) and user-selectable personas. Interaction happens via Slack mentions, DMs, slash commands, and an App Home UI.

## Package manager

Use `pnpm` for all package operations.

## Dev workflow

```bash
pnpm dev        # ts-node + nodemon watch (auto-reload)
pnpm build      # tsc compile to dist/
pnpm start      # run dist/index.js
pnpm typecheck  # type check without emit
```

Requires a `.env` file — see `.env.example` for required vars.

## Architecture

### Entry & config

- `src/index.ts` — Slack app init (Socket Mode), registers all handlers, starts server
- `src/config.ts` — Zod-validated env config; exports typed `config` object
- `src/types.ts` — Shared types: `ProviderName`, `PersonaName`, `MemoryEntry`, re-exports `CoreMessage`

### AI layer

- `src/lib/ai.ts` — `getProvider(name)` returns a `LanguageModel` from the Vercel AI SDK
  - **gemini** → `gemini-2.5-flash`
  - **openai** → `gpt-4o`
  - **nebius** → `meta-llama/Meta-Llama-3.1-70B-Instruct` (OpenAI-compatible endpoint)

### Personas

- `src/personas/index.ts` — Three system prompts with per-user in-memory tracking
  - `general` (🃏) — general helpful assistant
  - `property` (🏠) — property management expert
  - `software` (💻) — senior engineering manager

### Conversation memory

- `src/memory/store.ts` — In-memory Map, TTL 4 hours, max 20 messages/thread
  - Memory keys: thread ts, DM (channel+user), home (user), slash (channel+user)
  - Auto-cleanup every 30 min

### Handlers

| File | Trigger | Notes |
|------|---------|-------|
| `src/handlers/mention.ts` | `app_mention` | Thread-aware, strips bot mention |
| `src/handlers/message.ts` | DM messages | Skips subtypes and bot messages |
| `src/handlers/slash.ts` | `/ask` | Block Kit response, ephemeral errors |
| `src/handlers/mode.ts` | `/mode` | Per-user persona switch |
| `src/handlers/home.ts` | App Home events | Submit, clear history, persona select |

### UI

- `src/blocks/homeView.ts` — Slack Block Kit view for App Home: persona dropdown, history, input, buttons

## Key design decisions

- **Socket Mode** (not webhooks) — no public endpoint needed, simpler local dev
- **In-memory only** — no persistence layer; conversation history and personas reset on restart
- **Vercel AI SDK** — unified `generateText` interface abstracts all providers
- **Zod config validation** — fails fast on startup if env is missing or malformed

## Environment variables

| Variable | Purpose |
|----------|---------|
| `SLACK_BOT_TOKEN` | Bot user OAuth token (starts `xoxb-`) |
| `SLACK_APP_TOKEN` | App-level token for Socket Mode (starts `xapp-`) |
| `SLACK_SIGNING_SECRET` | Request signing verification |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini provider |
| `OPENAI_API_KEY` | OpenAI provider |
| `NEBIUS_API_KEY` | Nebius provider |
| `DEFAULT_PROVIDER` | `gemini` \| `openai` \| `nebius` (default: `gemini`) |
| `PORT` | HTTP port (default: `3000`) |
| `LOG_LEVEL` | `debug` \| `info` \| `warn` \| `error` (default: `info`) |
| `NODE_ENV` | `development` \| `production` |
