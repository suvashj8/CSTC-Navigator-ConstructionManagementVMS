import { execSync } from "node:child_process";

const attempts = 3;
const delayMs = 2000;

function dockerReady() {
  try {
    execSync("docker info", { stdio: "ignore", timeout: 20_000 });
    return true;
  } catch {
    return false;
  }
}

for (let i = 1; i <= attempts; i++) {
  if (dockerReady()) process.exit(0);
  if (i < attempts) {
    console.warn(`Docker engine not ready (attempt ${i}/${attempts}) — retrying...`);
    await new Promise((r) => setTimeout(r, delayMs));
  }
}

console.error("");
console.error("Docker Desktop engine is not responding.");
console.error("");
console.error("  1. Fully quit Docker Desktop (right-click tray icon → Quit)");
console.error('  2. Reopen Docker Desktop and wait until it says "Engine running"');
console.error("  3. Run:  npm run dev");
console.error("");
console.error("UI only (API must already be on :3000):  npm run dev:ui-only");
console.error("");
process.exit(1);
