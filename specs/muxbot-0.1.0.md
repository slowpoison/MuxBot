# Muxbot — Technical Specification

**Version:** 0.1.0
**Date:** 2026-04-05

---

## Overview

Muxbot is a multi-provider Slack AI bot built with TypeScript and the Vercel AI SDK. Users interact with it via Slack mentions, direct messages, slash commands, and an App Home UI. It supports multiple LLM backends and user-selectable personas, with per-session conversation memory.

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js + TypeScript 5 |
| Slack integration | `@slack/bolt` v3 (Socket Mode) |
| AI abstraction | Vercel AI SDK (`ai` v4) |
| Config validation | Zod |
| Dev tooling | ts-node, nodemon |
| Package manager | pnpm |

---

## Architecture

```
src/
├── index.ts              # App bootstrap: registers all handlers
├── config.ts             # Zod-validated env config
├── types.ts              # Shared types (ProviderName, PersonaName, MemoryEntry)
├── lib/
│   └── ai.ts             # Provider factory: returns LanguageModel by name
├── personas/
│   └── index.ts          # Persona definitions + per-user active persona tracking
├── memory/
│   └── store.ts          # In-memory conversation store (TTL + max messages)
├── handlers/
│   ├── mention.ts        # app_mention event handler
│   ├── message.ts        # DM message handler
│   ├── slash.ts          # /ask command handler
│   ├── mode.ts           # /mode command handler
│   └── home.ts           # App Home events (open, submit, clear, persona select)
└── blocks/
    └── homeView.ts       # Block Kit view builder for App Home
```

---

## Configuration

Environment variables are validated at startup via Zod. Missing required vars cause a hard crash.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SLACK_BOT_TOKEN` | Yes | — | Bot OAuth token (`xoxb-`) |
| `SLACK_APP_TOKEN` | Yes | — | Socket Mode app token (`xapp-`) |
| `SLACK_SIGNING_SECRET` | Yes | — | Request signing verification |
| `GOOGLE_GENERATIVE_AI_API_KEY` | No | — | Gemini provider API key |
| `OPENAI_API_KEY` | No | — | OpenAI provider API key |
| `NEBIUS_API_KEY` | No | — | Nebius provider API key |
| `DEFAULT_PROVIDER` | No | `gemini` | Active LLM provider (`gemini` \| `openai` \| `nebius`) |
| `PORT` | No | `3000` | HTTP port |
| `LOG_LEVEL` | No | `info` | `debug` \| `info` \| `warn` \| `error` |
| `NODE_ENV` | No | `development` | `development` \| `production` \| `test` |

---

## AI Providers

Configured in `src/lib/ai.ts`. All providers are instantiated at startup; `getProvider(name)` returns the appropriate `LanguageModel`.

| Provider | SDK | Model |
|----------|-----|-------|
| `gemini` | `@ai-sdk/google` | `gemini-2.5-flash` |
| `openai` | `@ai-sdk/openai` | `gpt-4o` |
| `nebius` | `@ai-sdk/openai-compatible` | `meta-llama/Meta-Llama-3.1-70B-Instruct` |

Nebius uses the OpenAI-compatible endpoint at `https://api.studio.nebius.ai/v1/`.

All handlers call `generateText()` from the Vercel AI SDK with `model`, `system` (persona prompt), and `messages` (conversation history).

---

## Personas

Defined in `src/personas/index.ts`. Each persona has a name, label, emoji, and system prompt. Active persona is tracked per user in an in-memory Map (defaults to `general` on first use).

| Name | Emoji | Label | Focus |
|------|-------|-------|-------|
| `general` | 🃏 | General Assistant | Helpful, witty, concise; Slack mrkdwn formatting |
| `property` | 🏠 | Property Manager | Rentals, tenant comms, leases, maintenance, regulations |
| `software` | 💻 | Software Manager | Sprint planning, architecture, code review, hiring, roadmaps |

**API:**
- `getActivePersona(userId)` → system prompt string
- `getActivePersonaInfo(userId)` → full `Persona` object
- `setActivePersona(userId, name)` → updates active persona
- `isValidPersona(name)` → type guard

---

## Conversation Memory

Implemented in `src/memory/store.ts` as an in-memory `Map<MemoryKey, MemoryEntry>`.

| Parameter | Value |
|-----------|-------|
| TTL | 4 hours |
| Max messages per key | 20 (approximately 10 exchanges) |
| Cleanup interval | Every 30 minutes |

Memory resets on process restart — no persistence layer.

### Memory Key Scheme

| Context | Key Format | Example |
|---------|-----------|---------|
| Channel thread | `thread:<thread_ts>` | `thread:1712345678.123456` |
| DM | `dm:<channelId>:<userId>` | `dm:D123:U456` |
| App Home | `home:<userId>` | `home:U456` |
| `/ask` in channel | `slash:<channelId>:<userId>` | `slash:C123:U456` |

The `/ask` handler selects the key based on context: thread > DM > slash.

---

## Slack Event Handlers

### `app_mention` — `src/handlers/mention.ts`

- Trigger: Bot is `@mentioned` in any channel or thread
- Behavior:
  1. Strips bot mention tag from text
  2. Posts `_Thinking..._` placeholder immediately (user feedback)
  3. Calls `generateText` with thread history and active persona
  4. Updates placeholder with the real response (or posts new message if placeholder failed)
  5. Appends exchange to thread memory
- Memory key: `thread:<rootTs>` (uses `thread_ts` if in a thread, else the message `ts`)
- Empty prompt: responds with a help hint

### `message` — `src/handlers/message.ts`

- Trigger: All messages; filtered to DMs only (`channel` starts with `D` or `channel_type === "im"`)
- Skips: Messages with any `subtype` (bot messages, edits, etc.)
- Behavior: Same thinking-placeholder pattern as mention handler
- Memory key: `dm:<channelId>:<userId>`

### `/ask` — `src/handlers/slash.ts`

- Trigger: `/ask <question>`
- Behavior:
  1. Acks immediately (Slack 3-second requirement)
  2. Calls `generateText` with context-appropriate history and active persona
  3. Responds with Block Kit: "You asked" header + divider + answer
  4. Errors respond ephemerally
- Empty prompt: responds ephemerally with usage hint
- Memory key: thread > DM > `slash:<channelId>:<userId>`

### `/mode` — `src/handlers/mode.ts`

- Trigger: `/mode [persona]`
- No argument: Shows current persona and lists all available options
- With argument: Validates and sets persona for the calling user
- All responses are ephemeral
- Invalid persona: shows available options

### App Home — `src/handlers/home.ts`

Four event/action handlers:

| Event/Action | Trigger | Behavior |
|--------------|---------|---------|
| `app_home_opened` | User opens Home tab | Publishes home view with current history and persona |
| `home_submit_button` | Send button clicked | Optimistic re-render with thinking indicator → generateText → re-render with response |
| `home_clear_button` | Clear History clicked | Clears memory, re-renders empty view |
| `home_persona_select` | Persona dropdown changed | Updates active persona, re-renders view |

---

## App Home UI

Built in `src/blocks/homeView.ts` using Slack Block Kit.

Layout (top to bottom):
1. Header: "🃏 Muxbot"
2. Persona selector (static_select dropdown, `action_id: home_persona_select`)
3. Divider
4. Conversation history — alternating user/bot section blocks with dividers (or "No messages yet" placeholder)
5. Input block (multiline text, `action_id: home_message_input`)
6. Action buttons: **Send** (primary) and **Clear History** (danger, with confirmation modal)

---

## Application Bootstrap

`src/index.ts` initializes the Bolt app in Socket Mode using validated config, registers all five handler modules, then starts the server. Fatal startup errors (including config validation failures) exit the process with code 1.

---

## Limitations & Design Constraints

- **No persistence** — all memory (conversation history and persona selections) is lost on restart
- **Single provider at a time** — `DEFAULT_PROVIDER` is a static config value; there is no runtime per-user provider switching
- **No streaming** — uses `generateText` (batch), not `streamText`
- **No auth/ACL** — any Slack workspace member can use all features
- **Socket Mode only** — no public webhook endpoint; requires an `xapp-` token
