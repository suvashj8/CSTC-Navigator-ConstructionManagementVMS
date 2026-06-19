import { beforeAll, afterAll } from "vitest";
import { getMainPool, resetMainPool } from "../lib/db";

let testPool: ReturnType<typeof getMainPool> | null = null;

beforeAll(async () => {
  testPool = getMainPool();
  await testPool.query("SELECT 1");
  console.log("[integration] Connected to test database");
}, 30000);

afterAll(async () => {
  if (testPool) {
    await testPool.end();
    resetMainPool();
    console.log("[integration] Test database disconnected");
  }
}, 10000);

export { testPool };