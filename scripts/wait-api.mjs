import http from "node:http";

const port = Number(process.env.API_PORT ?? 3000);
const maxWaitMs = Number(process.env.WAIT_API_MS ?? 120_000);
const stepMs = 1500;

function probe() {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/health`, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.setTimeout(2500, () => {
      req.destroy();
      resolve(false);
    });
    req.on("error", () => resolve(false));
  });
}

async function wait() {
  const start = Date.now();
  process.stdout.write(`Waiting for API on :${port}`);
  while (Date.now() - start < maxWaitMs) {
    if (await probe()) {
      console.log(" — ready");
      return;
    }
    process.stdout.write(".");
    await new Promise((r) => setTimeout(r, stepMs));
  }
  console.error("");
  console.error(`API not responding on :${port}. Check docker compose logs web`);
  process.exit(1);
}

await wait();
