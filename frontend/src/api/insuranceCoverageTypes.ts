import type { CustomInsuranceCoverage } from "@/lib/insuranceCoverageCatalog";
import { api, unwrap, unwrapList } from "./client";

const useMock = import.meta.env.VITE_USE_MOCK === "true";
let mockRows: CustomInsuranceCoverage[] = [];

export async function listInsuranceCoverageTypes() {
  if (useMock) return [...mockRows];
  return unwrapList(api.get("/api/v1/insurance-coverage-types")) as Promise<CustomInsuranceCoverage[]>;
}

export async function createInsuranceCoverageType(body: { name: string; description?: string }) {
  if (useMock) {
    const row: CustomInsuranceCoverage = {
      id: `ic-${Date.now()}`,
      name: body.name.trim(),
      description: body.description?.trim() ?? "",
    };
    mockRows = [row, ...mockRows.filter((c) => c.name.toLowerCase() !== row.name.toLowerCase())];
    return row;
  }
  return unwrap(api.post("/api/v1/insurance-coverage-types", body)) as Promise<CustomInsuranceCoverage>;
}
