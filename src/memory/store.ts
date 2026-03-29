import type { CoreMessage, MemoryEntry, MemoryKey } from "../types";

const TTL_MS = 4 * 60 * 60 * 1000; // 4 hours
const MAX_MESSAGES = 20; // ~10 exchanges

const store = new Map<MemoryKey, MemoryEntry>();

export function getHistory(key: MemoryKey): CoreMessage[] {
  const entry = store.get(key);
  if (!entry) return [];
  if (Date.now() - entry.lastUpdated > TTL_MS) {
    store.delete(key);
    return [];
  }
  return entry.messages;
}

export function appendHistory(
  key: MemoryKey,
  userText: string,
  assistantText: string
): void {
  const existing = getHistory(key);
  const next: CoreMessage[] = [
    ...existing,
    { role: "user", content: userText },
    { role: "assistant", content: assistantText },
  ];
  // Trim oldest pairs to stay under limit
  const trimmed =
    next.length > MAX_MESSAGES ? next.slice(next.length - MAX_MESSAGES) : next;
  store.set(key, { messages: trimmed, lastUpdated: Date.now() });
}

export function clearHistory(key: MemoryKey): void {
  store.delete(key);
}

// Memory key constructors
export const threadKey = (threadTs: string): MemoryKey =>
  `thread:${threadTs}`;

export const dmKey = (channelId: string, userId: string): MemoryKey =>
  `dm:${channelId}:${userId}`;

export const homeKey = (userId: string): MemoryKey => `home:${userId}`;

export const slashKey = (channelId: string, userId: string): MemoryKey =>
  `slash:${channelId}:${userId}`;

// Periodic TTL cleanup
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now - entry.lastUpdated > TTL_MS) store.delete(key);
  }
}, 30 * 60 * 1000);
