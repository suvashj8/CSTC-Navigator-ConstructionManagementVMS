import { api, unwrap, unwrapList } from "./client";

const useMock = import.meta.env.VITE_USE_MOCK === "true";

const MOCK_TENANTS = [
  {
    id: "tenant-demo-001",
    name: "Himal Construction Pvt. Ltd.",
    subdomain: "demo",
    db_name: "vms_tenant_demo",
    plan_tier: "standard",
    status: "active",
    created_at: new Date().toISOString(),
  },
];

export type TenantRow = {
  id: string;
  name: string;
  subdomain: string;
  db_name: string;
  plan_tier: string;
  status: string;
  created_at: string;
};

export async function listTenants() {
  if (useMock) return MOCK_TENANTS;
  return unwrapList(api.get("/api/v1/platform/tenants")) as Promise<TenantRow[]>;
}

export async function createTenant(body: {
  name: string;
  subdomain: string;
  admin_email: string;
  admin_password: string;
  admin_name: string;
}) {
  if (useMock) {
    return { tenantId: "new", subdomain: body.subdomain, dbName: `vms_tenant_${body.subdomain}` };
  }
  return unwrap(api.post("/api/v1/platform/tenants", body));
}

export async function updateTenantStatus(id: string, status: string) {
  if (useMock) return { tenant_id: id, status };
  return unwrap(api.put(`/api/v1/platform/tenants/${id}/status`, { status }));
}

export async function switchTenant(id: string) {
  if (useMock) {
    return {
      access_token: "mock-impersonation",
      user: {
        id: "user-1",
        name: "Admin User",
        email: "admin@vms.local",
        role: "super_user",
        location_ids: [],
        tenant_id: id,
        tenant_name: "Himal Construction Pvt. Ltd.",
      },
    };
  }
  return unwrap(api.post(`/api/v1/platform/tenants/${id}/switch`)) as Promise<{
    access_token: string;
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      location_ids: string[];
      tenant_id: string;
      tenant_name: string;
    };
  }>;
}
