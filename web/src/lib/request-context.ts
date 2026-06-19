import { randomUUID } from "crypto";
import { AsyncLocalStorage } from "async_hooks";
import type { NextRequest } from "next/server";

const REQUEST_ID_HEADER = "x-request-id";
const REQUEST_ID_RESPONSE_HEADER = "x-request-id";

export function getOrCreateRequestId(req: NextRequest): string {
  const existing = req.headers.get(REQUEST_ID_HEADER);
  if (existing?.trim()) return existing.trim();
  return randomUUID();
}

export function withRequestId(res: Response, requestId: string): Response {
  res.headers.set(REQUEST_ID_RESPONSE_HEADER, requestId);
  return res;
}

export interface RequestContext {
  requestId: string;
  startTime: number;
}

const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext | null {
  return requestContextStorage.getStore() ?? null;
}

export function clearRequestContext(): void {
  // AsyncLocalStorage automatically exits the active context when the `run`
  // callback resolves. Do not call `disable()` per request because it clears
  // all active stores on this shared instance and can affect concurrent
  // requests in the same Node process.
}

export function createRequestContext(req: NextRequest): RequestContext {
  const requestId = getOrCreateRequestId(req);
  const ctx: RequestContext = {
    requestId,
    startTime: Date.now(),
  };
  return ctx;
}

export function runWithRequestContext<T>(ctx: RequestContext, callback: () => T): T {
  return requestContextStorage.run(ctx, callback);
}