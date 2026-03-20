import type { Response } from "express";

interface CacheEntry {
  body: string;
  expiresAt: number;
  status: number;
}

const MAX_ENTRIES = 64;
const responseCache = new Map<string, CacheEntry>();

function pruneExpiredEntries(now = Date.now()) {
  for (const [key, entry] of responseCache) {
    if (entry.expiresAt <= now) {
      responseCache.delete(key);
    }
  }
}

function trimCacheSize() {
  while (responseCache.size > MAX_ENTRIES) {
    const oldestKey = responseCache.keys().next().value;
    if (oldestKey == null) {
      return;
    }

    responseCache.delete(oldestKey);
  }
}

export function clearResponseCache() {
  responseCache.clear();
}

export function invalidateResponseCacheByPrefix(...prefixes: string[]) {
  if (prefixes.length === 0) {
    responseCache.clear();
    return;
  }

  for (const key of responseCache.keys()) {
    if (prefixes.some((prefix) => key.startsWith(prefix))) {
      responseCache.delete(key);
    }
  }
}

export function trySendCachedJson(res: Response, cacheKey: string): boolean {
  pruneExpiredEntries();

  const entry = responseCache.get(cacheKey);
  if (entry == null) {
    return false;
  }

  responseCache.delete(cacheKey);
  responseCache.set(cacheKey, entry);
  res.status(entry.status).type("application/json").send(entry.body);
  return true;
}

export function sendCachedJson(
  res: Response,
  cacheKey: string,
  payload: unknown,
  {
    status = 200,
    ttlMs = 10_000,
  }: {
    status?: number;
    ttlMs?: number;
  } = {},
) {
  pruneExpiredEntries();

  const body = JSON.stringify(payload);
  responseCache.delete(cacheKey);
  responseCache.set(cacheKey, {
    body,
    expiresAt: Date.now() + ttlMs,
    status,
  });
  trimCacheSize();

  return res.status(status).type("application/json").send(body);
}
