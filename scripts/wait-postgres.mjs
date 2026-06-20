import { execSync } from "node:child_process";
import net from "node:net";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(root, "web/package.json"));
const pg = require("pg");

const host = process.env.MAIN_DB_HOST ?? "localhost";
const port = Number(process.env.MAIN_DB_PORT ?? 7002);
const user = process.env.MAIN_DB_USER ?? "vms";
const password = process.env.MAIN_DB_PASSWORD ?? "vms";
const database = process.env.MAIN_DB_NAME ?? "vms_main";
const maxWaitMs = Number(process.env.WAIT_POSTGRES_MS ?? 90_000);
const stepMs = 1500;

function canConnectTcp() {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const done = (ok) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(2000);
    socket.on("connect", () => done(true));
    socket.on("error", () => done(false));
    socket.on("timeout", () => done(false));
  });
}

async function canQuery() {
  const pool = new pg.Pool({
    host,
    port,
    user,
    password,
    database,
    connectionTimeoutMillis: 2500,
    max: 1,
  });
  try {
    await pool.query("SELECT 1");
    return true;
  } catch {
    return false;
  } finally {
    await pool.end().catch(() => {});
  }
}

async function wait() {
  const start = Date.now();
  process.stdout.write(`Waiting for Postgres at ${host}:${port}`);
  while (Date.now() - start < maxWaitMs) {
    if (await canConnectTcp()) {
      if (await canQuery()) {
        console.log(" — ready");
        return;
      }
    }
    process.stdout.write(".");
    await new Promise((r) => setTimeout(r, stepMs));
  }
  console.error("");
  console.error(`Postgres not ready at ${host}:${port} after ${maxWaitMs / 1000}s.`);
  console.error("Try: docker compose down && npm run docker:infra");
  process.exit(1);
}

try {
  execSync("docker info", { stdio: "ignore" });
} catch {
  console.warn("Docker not running — will still try localhost Postgres.");
}

await wait();
