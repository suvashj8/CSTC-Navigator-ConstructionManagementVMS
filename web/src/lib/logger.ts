import { getRequestContext } from "./request-context";
import type { NextRequest } from "next/server";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  requestId?: string;
  [key: string]: unknown;
}

class Logger {
  private baseMeta: Record<string, unknown> = {};

  child(meta: Record<string, unknown>): Logger {
    const childLogger = new Logger();
    childLogger.baseMeta = { ...this.baseMeta, ...meta };
    return childLogger;
  }

  private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    const ctx = getRequestContext();
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      requestId: ctx?.requestId,
      ...this.baseMeta,
      ...meta,
    };

    const output = JSON.stringify(entry);
    switch (level) {
      case "debug":
      case "info":
        console.log(output);
        break;
      case "warn":
        console.warn(output);
        break;
      case "error":
        console.error(output);
        break;
    }
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.log("debug", message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log("info", message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log("warn", message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.log("error", message, meta);
  }
}

export const logger = new Logger();

export function createRequestLogger(requestId: string): Logger {
  return logger.child({ requestId });
}

export function getContextLogger(): Logger {
  const ctx = getRequestContext();
  return ctx?.requestId ? logger.child({ requestId: ctx.requestId }) : logger;
}

export function logRequest(req: NextRequest, message: string, meta?: Record<string, unknown>): void {
  const ctx = getRequestContext();
  logger.info(message, {
    requestId: ctx?.requestId,
    method: req.method,
    url: req.url,
    ...meta,
  });
}

export function logError(req: NextRequest, error: Error, meta?: Record<string, unknown>): void {
  const ctx = getRequestContext();
  logger.error(error.message, {
    requestId: ctx?.requestId,
    method: req.method,
    url: req.url,
    stack: error.stack,
    ...meta,
  });
}

export function logResponse(req: NextRequest, status: number, durationMs: number, meta?: Record<string, unknown>): void {
  const ctx = getRequestContext();
  logger.info("request completed", {
    requestId: ctx?.requestId,
    method: req.method,
    url: req.url,
    status,
    durationMs,
    ...meta,
  });
}