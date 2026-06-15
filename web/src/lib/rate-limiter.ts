import type { NextRequest } from "next/server";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

function getStore(key: string): Map<string, RateLimitEntry> {
  let store = stores.get(key);
  if (!store) {
    store = new Map();
    stores.set(key, store);
  }
  return store;
}

function cleanupStore(key: string): void {
  const store = stores.get(key);
  if (!store) return;
  const now = Date.now();
  for (const [ip, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(ip);
    }
  }
  if (store.size === 0) {
    stores.delete(key);
  }
}

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  total: number;
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.headers.get("x-real-ip") ?? "unknown";
}

export function createRateLimiter(options: RateLimitOptions) {
  const { windowMs, maxRequests, keyPrefix = "default" } = options;
  const storeKey = `ratelimit:${keyPrefix}`;

  return async function rateLimit(req: NextRequest): Promise<RateLimitResult> {
    const ip = getClientIp(req);
    const store = getStore(storeKey);
    const now = Date.now();
    const entry = store.get(ip);

    if (!entry || entry.resetAt < now) {
      const resetAt = now + windowMs;
      store.set(ip, { count: 1, resetAt });
      cleanupStore(storeKey);
      return { allowed: true, remaining: maxRequests - 1, resetAt, total: maxRequests };
    }

    entry.count++;
    const allowed = entry.count <= maxRequests;
    const remaining = Math.max(0, maxRequests - entry.count);

    cleanupStore(storeKey);

    return { allowed, remaining, resetAt: entry.resetAt, total: maxRequests };
  };
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.total),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}

export function applyRateLimitHeaders(res: Response, result: RateLimitResult): void {
  for (const [key, value] of Object.entries(rateLimitHeaders(result))) {
    res.headers.set(key, value);
  }
}

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  keyPrefix: "auth",
});

export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100,
  keyPrefix: "api",
});