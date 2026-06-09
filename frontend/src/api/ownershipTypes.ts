import type { CustomOwnershipType } from "@/lib/ownershipTypeCatalog";
import { api, unwrap, unwrapList } from "./client";

const useMock = import.meta.env.VITE_USE_MOCK === "true";
let mockRows: CustomOwnershipType[] = [];

export async function listOwnershipTypes() {
  if (useMock) return [...mockRows];
  return unwrapList(api.get("/api/v1/ownership-types")) as Promise<CustomOwnershipType[]>;
}

export async function createOwnershipType(body: { name: string; description?: string }) {
  if (useMock) {
    const row: CustomOwnershipType = {
      id: `ot-${Date.now()}`,
      name: body.name.trim(),
      description: body.description?.trim() ?? "",
    };
    mockRows = [row, ...mockRows.filter((t) => t.name.toLowerCase() !== row.name.toLowerCase())];
    return row;
  }
  return unwrap(api.post("/api/v1/ownership-types", body)) as Promise<CustomOwnershipType>;
}
