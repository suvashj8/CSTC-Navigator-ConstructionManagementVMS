export type StackHealth = {
  status?: string;
  postgres?: string;
  redis?: string;
  demo_tenant?: string;
  demo_admin?: string;
  api?: string;
  warnings?: string[];
  hint?: string;
};

export function stackHintFromHealth(payload: StackHealth | null | undefined): string | null {
  if (!payload) return "API not running — open a terminal in the project folder and run: npm run dev";

  if (payload.api === "down") {
    return "API is not running. From the project folder run: npm run dev";
  }

  if (payload.status === "ok") return null;

  if (payload.postgres && payload.postgres !== "ok") {
    return "Database not reachable. Stop Docker web/worker if running, then from project folder run: npm run dev";
  }

  const warnings = payload.warnings ?? [];
  if (warnings.length > 0) {
    return warnings.join(" ");
  }

  return payload.hint ?? "From the project folder run: npm run dev";
}

export function loginErrorHint(message: string): { title: string; description: string } {
  const lower = message.toLowerCase();

  if (
    lower.includes("cannot reach api") ||
    lower.includes("err_network") ||
    lower.includes("network error") ||
    lower.includes("request failed (0)")
  ) {
    return {
      title: "API not running",
      description: "From the project folder run: npm run dev",
    };
  }

  if (
    lower.includes("database") ||
    lower.includes("econnrefused") ||
    lower.includes("docker engine") ||
    lower.includes("postgres")
  ) {
    return {
      title: "Database not ready",
      description:
        "Do not run Docker web and npm run dev together.\n1) npm run dev  (recommended)\n   — or —\n2) npm run dev:docker  (API inside Docker)",
    };
  }

  if (lower.includes("demo setup") || lower.includes("reseed")) {
    return {
      title: "Demo data needs refresh",
      description: "Run: npm run docker:reseed — then sign in again",
    };
  }

  return { title: message, description: "From the project folder run: npm run dev" };
}
