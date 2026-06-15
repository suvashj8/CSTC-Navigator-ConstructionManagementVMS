/**
 * Host dev uses Next.js on :3000. Stop Docker web/worker so they do not fight for the port
 * or serve a different API build than the local code you are editing.
 */
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

try {
  execSync("docker compose stop web worker", { cwd: root, stdio: "ignore", timeout: 60_000 });
} catch {
  /* docker not running or services absent */
}

try {
  execSync("npx --yes kill-port 3000", { cwd: root, stdio: "ignore", timeout: 30_000 });
} catch {
  /* port already free */
}
