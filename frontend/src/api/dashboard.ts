import type { DashboardStats } from "@/types/domain";
import { api, unwrap } from "./client";
import { MOCK_DASHBOARD, delay } from "./mock/data";

const useMock = import.meta.env.VITE_USE_MOCK === "true";

export async function getDashboardStats() {
  if (useMock) {
    await delay();
    return { ...MOCK_DASHBOARD };
  }
  return unwrap(api.get("/api/v1/dashboard/stats")) as Promise<DashboardStats>;
}
