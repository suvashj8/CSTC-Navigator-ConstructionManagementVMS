import type { Paginated, Supplier, SupplierCategory } from "@/types/domain";
import { api, unwrap, unwrapPaginated } from "./client";
import { MOCK_SUPPLIERS, delay, paginate } from "./mock/data";

const useMock = import.meta.env.VITE_USE_MOCK === "true";

let mockSuppliers = [...MOCK_SUPPLIERS];

export async function listSuppliers(
  params: { page?: number; per_page?: number; search?: string } = {}
): Promise<Paginated<Supplier>> {
  if (useMock) {
    await delay();
    return paginate(mockSuppliers, params.page ?? 1, params.per_page ?? 10, params.search, (s, q) =>
      `${s.name} ${s.category}`.toLowerCase().includes(q)
    ) as Paginated<Supplier>;
  }
  return unwrapPaginated<Supplier>(api.get("/api/v1/suppliers", { params }));
}

export async function createSupplier(body: {
  name: string;
  category: SupplierCategory;
  contact_name?: string;
  email?: string;
  phone?: string;
  rating?: number;
  is_preferred?: boolean;
}) {
  if (useMock) {
    await delay();
    const sup: Supplier = {
      id: `sup-${Date.now()}`,
      name: body.name,
      category: body.category,
      contact_name: body.contact_name ?? "",
      email: body.email ?? "",
      phone: body.phone ?? "",
      rating: body.rating ?? 3,
      is_preferred: body.is_preferred ?? false,
    };
    mockSuppliers = [sup, ...mockSuppliers];
    return sup;
  }
  return unwrap(api.post("/api/v1/suppliers", body)) as Promise<Supplier>;
}

export async function updateSupplier(
  id: string,
  body: Partial<{
    name: string;
    category: SupplierCategory;
    contact_name: string;
    email: string;
    phone: string;
    rating: number;
    is_preferred: boolean;
  }>
) {
  if (useMock) {
    await delay();
    mockSuppliers = mockSuppliers.map((s) => (s.id === id ? { ...s, ...body } : s));
    const sup = mockSuppliers.find((s) => s.id === id);
    if (!sup) throw new Error("Supplier not found");
    return sup;
  }
  return unwrap(api.put(`/api/v1/suppliers/${id}`, body)) as Promise<Supplier>;
}
