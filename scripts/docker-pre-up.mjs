/**
 * Stop stale containers before docker compose up — avoids "port already in use" on 7000–7003.
 */
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

try {
  execSync("docker compose down --remove-orphans", { cwd: root, stdio: "inherit" });
} catch {
  /* no project running */
}
