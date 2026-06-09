import type { CustomSupplierCategory } from "@/lib/supplierCategoryCatalog";
import { api, unwrap, unwrapList } from "./client";

const useMock = import.meta.env.VITE_USE_MOCK === "true";
let mockRows: CustomSupplierCategory[] = [];

export async function listSupplierCategories() {
  if (useMock) return [...mockRows];
  return unwrapList(api.get("/api/v1/supplier-categories")) as Promise<CustomSupplierCategory[]>;
}

export async function createSupplierCategory(body: { name: string; description?: string }) {
  if (useMock) {
    const row: CustomSupplierCategory = {
      id: `sc-${Date.now()}`,
      name: body.name.trim(),
      description: body.description?.trim() ?? "",
    };
    mockRows = [row, ...mockRows.filter((c) => c.name.toLowerCase() !== row.name.toLowerCase())];
    return row;
  }
  return unwrap(api.post("/api/v1/supplier-categories", body)) as Promise<CustomSupplierCategory>;
}
