import type { DriverProfile, Paginated } from "@/types/domain";
import { api, unwrap, unwrapPaginated } from "./client";
import { MOCK_DRIVERS, delay, paginate } from "./mock/data";

const useMock = import.meta.env.VITE_USE_MOCK === "true";

let mockDrivers = [...MOCK_DRIVERS];

function licenseStatus(expiry: string): DriverProfile["status"] {
  const exp = new Date(expiry);
  const now = new Date();
  const days = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (days < 0) return "expired";
  if (days <= 60) return "expiring";
  return "valid";
}

export async function listDrivers(
  params: { page?: number; per_page?: number; search?: string } = {}
): Promise<Paginated<DriverProfile>> {
  if (useMock) {
    await delay();
    return paginate(mockDrivers, params.page ?? 1, params.per_page ?? 10, params.search, (d, q) =>
      `${d.name} ${d.license_no}`.toLowerCase().includes(q)
    ) as Paginated<DriverProfile>;
  }
  return unwrapPaginated<DriverProfile>(api.get("/api/v1/drivers", { params }));
}

export async function createDriver(body: {
  name: string;
  email: string;
  password?: string;
  location_id?: string | null;
  license_no: string;
  license_class: string;
  issue_date: string;
  expiry_date: string;
  endorsements?: string;
  contact_phone?: string;
}) {
  if (useMock) {
    await delay();
    const driver: DriverProfile = {
      id: `drv-${Date.now()}`,
      user_id: `user-${Date.now()}`,
      name: body.name,
      email: body.email.toLowerCase(),
      license_no: body.license_no,
      license_class: body.license_class,
      issue_date: body.issue_date,
      expiry_date: body.expiry_date,
      endorsements: body.endorsements,
      contact_phone: body.contact_phone,
      status: licenseStatus(body.expiry_date),
    };
    mockDrivers = [driver, ...mockDrivers];
    return driver;
  }
  return unwrap(api.post("/api/v1/drivers", body)) as Promise<DriverProfile>;
}

export async function updateDriver(
  id: string,
  body: Partial<{
    license_no: string;
    license_class: string;
    issue_date: string;
    expiry_date: string;
    endorsements: string;
  }>
) {
  if (useMock) {
    await delay();
    mockDrivers = mockDrivers.map((d) => {
      if (d.id !== id) return d;
      const next = { ...d, ...body };
      if (body.expiry_date) next.status = licenseStatus(body.expiry_date);
      return next;
    });
    const driver = mockDrivers.find((d) => d.id === id);
    if (!driver) throw new Error("Driver not found");
    return driver;
  }
  return unwrap(api.put(`/api/v1/drivers/${id}`, body)) as Promise<DriverProfile>;
}
