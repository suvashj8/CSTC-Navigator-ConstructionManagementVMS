import { vi } from "vitest";

vi.mock("pg", () => ({
  Pool: vi.fn().mockImplementation(() => ({
    query: vi.fn(),
    connect: vi.fn(),
    end: vi.fn(),
  })),
}));

vi.mock("ioredis", () => ({
  default: vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    quit: vi.fn(),
  })),
}));

vi.mock("@/lib/tenant-manager", () => ({
  getTenantManager: vi.fn().mockReturnValue({
    ensureReady: vi.fn(),
    getPool: vi.fn(),
  }),
}));

vi.mock("@/lib/ensure-demo", () => ({
  warmDemoOnStartup: vi.fn(),
}));

beforeAll(() => {
  process.env.MAIN_DB_HOST = "localhost";
  process.env.MAIN_DB_PORT = "5432";
  process.env.MAIN_DB_NAME = "test";
  process.env.MAIN_DB_USER = "test";
  process.env.MAIN_DB_PASSWORD = "test";
  process.env.REDIS_HOST = "localhost";
  process.env.REDIS_PORT = "6379";
  process.env.JWT_SECRET = "test-secret";
});