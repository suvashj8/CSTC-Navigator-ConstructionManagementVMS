import { describe, it, expect, vi, beforeEach } from "vitest";
import { logger, createRequestLogger, getContextLogger } from "@/lib/logger";

describe("logger", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("logs info level with message", () => {
    logger.info("test message", { key: "value" });
    expect(console.log).toHaveBeenCalled();
    const logged = JSON.parse((console.log as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(logged.level).toBe("info");
    expect(logged.message).toBe("test message");
    expect(logged.key).toBe("value");
  });

  it("logs error level with message", () => {
    logger.error("error message", { err: "detail" });
    expect(console.error).toHaveBeenCalled();
    const logged = JSON.parse((console.error as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(logged.level).toBe("error");
    expect(logged.message).toBe("error message");
  });

  it("creates child logger with requestId", () => {
    const child = createRequestLogger("req-123");
    child.info("child message");
    expect(console.log).toHaveBeenCalled();
    const logged = JSON.parse((console.log as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(logged.requestId).toBe("req-123");
  });

  it("getContextLogger returns base logger when no context", () => {
    const ctxLogger = getContextLogger();
    ctxLogger.info("context message");
    expect(console.log).toHaveBeenCalled();
    const logged = JSON.parse((console.log as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(logged.requestId).toBeUndefined();
  });
});