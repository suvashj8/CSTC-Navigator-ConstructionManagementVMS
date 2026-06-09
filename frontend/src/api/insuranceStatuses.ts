import type { CustomInsuranceStatus } from "@/lib/insuranceStatusCatalog";
import { api, unwrap, unwrapList } from "./client";

const useMock = import.meta.env.VITE_USE_MOCK === "true";
let mockRows: CustomInsuranceStatus[] = [];

export async function listInsuranceStatuses() {
  if (useMock) return [...mockRows];
  return unwrapList(api.get("/api/v1/insurance-statuses")) as Promise<CustomInsuranceStatus[]>;
}

export async function createInsuranceStatus(body: { name: string; description?: string }) {
  if (useMock) {
    const row: CustomInsuranceStatus = {
      id: `is-${Date.now()}`,
      name: body.name.trim(),
      description: body.description?.trim() ?? "",
    };
    mockRows = [row, ...mockRows.filter((s) => s.name.toLowerCase() !== row.name.toLowerCase())];
    return row;
  }
  return unwrap(api.post("/api/v1/insurance-statuses", body)) as Promise<CustomInsuranceStatus>;
}
