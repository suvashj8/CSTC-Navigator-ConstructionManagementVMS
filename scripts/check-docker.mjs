import { execSync } from "node:child_process";

try {
  execSync("docker info", { stdio: "ignore" });
} catch {
  console.error("");
  console.error("Docker Desktop is not running.");
  console.error("");
  console.error("  1. Open Docker Desktop from the Start menu");
  console.error('  2. Wait until the status shows "Engine running"');
  console.error("  3. Run:  npm run docker:up");
  console.error("  4. Run:  npm run dev");
  console.error("");
  console.error("To start the UI only (no database):  npm run dev:ui");
  console.error("");
  process.exit(1);
}
