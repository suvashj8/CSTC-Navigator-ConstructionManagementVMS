import { execSync } from "node:child_process";
import net from "node:net";

const host = process.env.MAIN_DB_HOST ?? "localhost";
const port = Number(process.env.MAIN_DB_PORT ?? 15432);
const maxWaitMs = Number(process.env.WAIT_POSTGRES_MS ?? 90_000);
const stepMs = 1500;

function canConnect() {
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

async function wait() {
  const start = Date.now();
  process.stdout.write(`Waiting for Postgres at ${host}:${port}`);
  while (Date.now() - start < maxWaitMs) {
    if (await canConnect()) {
      console.log(" — ready");
      return;
    }
    process.stdout.write(".");
    await new Promise((r) => setTimeout(r, stepMs));
  }
  console.error("");
  console.error(`Postgres not reachable at ${host}:${port} after ${maxWaitMs / 1000}s.`);
  console.error("Start Docker Desktop, then: npm run docker:infra");
  process.exit(1);
}

try {
  execSync("docker info", { stdio: "ignore" });
} catch {
  console.warn("Docker not running — will still try localhost Postgres.");
}

await wait();
