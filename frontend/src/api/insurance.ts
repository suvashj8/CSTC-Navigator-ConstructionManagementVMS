import type { CoverageType, InsurancePolicy, Paginated } from "@/types/domain";
import { api, unwrap, unwrapPaginated } from "./client";
import { MOCK_INSURANCE, delay, paginate } from "./mock/data";

const useMock = import.meta.env.VITE_USE_MOCK === "true";

let mockInsurance = [...MOCK_INSURANCE];

function policyStatus(expiry: string): InsurancePolicy["status"] {
  const exp = new Date(expiry);
  const now = new Date();
  const days = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (days < 0) return "expired";
  if (days <= 30) return "expiring";
  return "active";
}

export async function listInsurance(params: { page?: number; per_page?: number } = {}) {
  if (useMock) {
    await delay();
    return paginate(mockInsurance, params.page ?? 1, params.per_page ?? 10) as Paginated<InsurancePolicy>;
  }
  return unwrapPaginated(api.get("/api/v1/insurance", { params }));
}

export async function createInsurance(body: {
  asset_id: string;
  policy_no: string;
  insurer_name?: string;
  coverage_type?: CoverageType;
  insured_value?: number;
  premium_amount?: number;
  start_date?: string;
  expiry_date?: string;
  status?: InsurancePolicy["status"];
}) {
  if (useMock) {
    await delay();
    const pol: InsurancePolicy = {
      id: `ins-${Date.now()}`,
      asset_id: body.asset_id,
      asset_label: body.asset_id,
      policy_no: body.policy_no,
      insurer_name: body.insurer_name ?? "",
      coverage_type: body.coverage_type ?? "comprehensive",
      insured_value: body.insured_value ?? 0,
      premium_amount: body.premium_amount ?? 0,
      start_date: body.start_date ?? "",
      expiry_date: body.expiry_date ?? "",
      status: body.expiry_date ? policyStatus(body.expiry_date) : "active",
    };
    mockInsurance = [pol, ...mockInsurance];
    return pol;
  }
  return unwrap(api.post("/api/v1/insurance", body)) as Promise<InsurancePolicy>;
}

export async function updateInsurance(
  id: string,
  body: Partial<{
    policy_no: string;
    insurer_name: string;
    coverage_type: CoverageType;
    insured_value: number;
    premium_amount: number;
    start_date: string;
    expiry_date: string;
    status: InsurancePolicy["status"];
  }>
) {
  if (useMock) {
    await delay();
    mockInsurance = mockInsurance.map((p) => {
      if (p.id !== id) return p;
      const next = { ...p, ...body };
      if (body.expiry_date) next.status = policyStatus(body.expiry_date);
      return next;
    });
    const pol = mockInsurance.find((p) => p.id === id);
    if (!pol) throw new Error("Policy not found");
    return pol;
  }
  return unwrap(api.put(`/api/v1/insurance/${id}`, body)) as Promise<InsurancePolicy>;
}
