import type {
  Allocation,
  AppNotification,
  Asset,
  AuthUser,
  DashboardStats,
  DriverProfile,
  InsurancePolicy,
  Supplier,
  User,
  WorkLocation,
} from "@/types/domain";

export const MOCK_TENANT = { id: "tenant-demo-001", name: "Himal Construction Pvt. Ltd." };

export const MOCK_LOCATIONS: WorkLocation[] = [
  {
    id: "loc-1",
    name: "Bhaktapur Ring Road Site",
    type: "construction",
    address: "Bhaktapur, Bagmati",
    manager_id: "user-3",
    manager_name: "Sita Sharma",
    latitude: 27.671,
    longitude: 85.429,
    is_custom: false,
  },
  {
    id: "loc-2",
    name: "Pokhara Lakeside Project",
    type: "construction",
    address: "Pokhara, Gandaki",
    manager_id: "user-3",
    manager_name: "Sita Sharma",
    latitude: 28.209,
    longitude: 83.985,
    is_custom: false,
  },
  {
    id: "loc-3",
    name: "Central Workshop",
    type: "workshop",
    address: "Balaju, Kathmandu",
    manager_id: "user-2",
    manager_name: "Ram Thapa",
    is_custom: true,
  },
];

export const MOCK_USERS: User[] = [
  { id: "user-1", name: "Admin User", email: "admin@vms.local", role: "admin", status: "active", location_id: null },
  { id: "user-2", name: "Ram Thapa", email: "manager@vms.local", role: "manager", status: "active", location_id: null },
  {
    id: "user-3",
    name: "Sita Sharma",
    email: "supervisor@vms.local",
    role: "supervisor",
    status: "active",
    location_id: "loc-1",
    location_name: "Bhaktapur Ring Road Site",
  },
  {
    id: "user-4",
    name: "Hari KC",
    email: "employee@vms.local",
    role: "employee",
    status: "active",
    location_id: "loc-1",
    location_name: "Bhaktapur Ring Road Site",
  },
  {
    id: "user-5",
    name: "Bikash Rai",
    email: "driver@vms.local",
    role: "driver",
    status: "active",
    location_id: "loc-1",
    location_name: "Bhaktapur Ring Road Site",
  },
];

export const MOCK_DRIVERS: DriverProfile[] = [
  {
    id: "drv-1",
    user_id: "user-5",
    name: "Bikash Rai",
    email: "driver@vms.local",
    license_no: "01-06-0023456",
    license_class: "B+",
    issue_date: "2022-03-15",
    expiry_date: "2026-08-20",
    endorsements: "Heavy vehicle",
    status: "valid",
  },
  {
    id: "drv-2",
    user_id: "user-6",
    name: "Prakash Gurung",
    email: "prakash@vms.local",
    license_no: "04-05-0011223",
    license_class: "B",
    issue_date: "2020-01-10",
    expiry_date: "2026-07-05",
    status: "expiring",
  },
];

export const MOCK_ASSETS: Asset[] = [
  {
    id: "ast-1",
    asset_type: "vehicle",
    reg_serial_no: "Ba 1 Pa 4521",
    make: "Tata",
    model: "Prima 4928",
    year: 2022,
    ownership_type: "owned",
    status: "active",
    location_id: "loc-1",
    location_name: "Bhaktapur Ring Road Site",
    assigned_driver_id: "user-5",
    assigned_driver_name: "Bikash Rai",
  },
  {
    id: "ast-2",
    asset_type: "vehicle",
    reg_serial_no: "Ba 2 Cha 8890",
    make: "Mahindra",
    model: "Bolero Pickup",
    year: 2021,
    ownership_type: "leased",
    status: "in_transit",
    location_id: "loc-2",
    location_name: "Pokhara Lakeside Project",
    assigned_driver_id: "user-6",
    assigned_driver_name: "Prakash Gurung",
  },
  {
    id: "ast-3",
    asset_type: "equipment",
    reg_serial_no: "EXC-JCB-0042",
    make: "JCB",
    model: "3DX Super",
    year: 2020,
    ownership_type: "owned",
    status: "active",
    location_id: "loc-1",
    location_name: "Bhaktapur Ring Road Site",
  },
  {
    id: "ast-4",
    asset_type: "equipment",
    reg_serial_no: "GEN-CAT-1188",
    make: "Caterpillar",
    model: "DE6500",
    year: 2019,
    ownership_type: "rented",
    status: "in_repair",
    location_id: "loc-3",
    location_name: "Central Workshop",
  },
  {
    id: "ast-5",
    asset_type: "tool",
    reg_serial_no: "TL-WR-220",
    make: "Bosch",
    model: "GWS 750",
    year: 2023,
    ownership_type: "owned",
    status: "active",
    location_id: "loc-2",
    location_name: "Pokhara Lakeside Project",
  },
];

export const MOCK_ALLOCATIONS: Allocation[] = [
  {
    id: "alloc-1",
    asset_id: "ast-2",
    asset_label: "Ba 2 Cha 8890 — Mahindra Bolero",
    from_location_id: "loc-1",
    from_location_name: "Bhaktapur Ring Road Site",
    to_location_id: "loc-2",
    to_location_name: "Pokhara Lakeside Project",
    driver_id: "user-6",
    driver_name: "Prakash Gurung",
    approved_by: "user-3",
    state: "in_transit",
    start_date: "2026-06-05",
    expected_return: "2026-06-20",
  },
  {
    id: "alloc-2",
    asset_id: "ast-1",
    asset_label: "Ba 1 Pa 4521 — Tata Prima",
    from_location_id: "loc-3",
    from_location_name: "Central Workshop",
    to_location_id: "loc-1",
    to_location_name: "Bhaktapur Ring Road Site",
    driver_id: "user-5",
    driver_name: "Bikash Rai",
    approved_by: "user-2",
    state: "active",
    start_date: "2026-05-28",
    expected_return: "2026-07-15",
  },
  {
    id: "alloc-3",
    asset_id: "ast-3",
    asset_label: "EXC-JCB-0042 — JCB 3DX",
    from_location_id: "loc-1",
    from_location_name: "Bhaktapur Ring Road Site",
    to_location_id: "loc-2",
    to_location_name: "Pokhara Lakeside Project",
    driver_id: "user-5",
    driver_name: "Bikash Rai",
    state: "pending",
    start_date: "2026-06-10",
    expected_return: "2026-06-25",
  },
];

export const MOCK_INSURANCE: InsurancePolicy[] = [
  {
    id: "ins-1",
    asset_id: "ast-1",
    asset_label: "Ba 1 Pa 4521",
    policy_no: "POL-2025-88421",
    insurer_name: "Sagarmatha Insurance",
    coverage_type: "comprehensive",
    insured_value: 8500000,
    premium_amount: 125000,
    start_date: "2025-07-01",
    expiry_date: "2026-06-30",
    status: "expiring",
  },
  {
    id: "ins-2",
    asset_id: "ast-2",
    asset_label: "Ba 2 Cha 8890",
    policy_no: "POL-2025-77210",
    insurer_name: "Nepal Insurance",
    coverage_type: "third_party",
    insured_value: 3200000,
    premium_amount: 45000,
    start_date: "2025-09-01",
    expiry_date: "2026-08-31",
    status: "active",
  },
];

export const MOCK_SUPPLIERS: Supplier[] = [
  {
    id: "sup-1",
    name: "Kathmandu Auto Works",
    category: "repair",
    contact_name: "Anil Shrestha",
    email: "service@kaw.com.np",
    phone: "9841000001",
    rating: 5,
    is_preferred: true,
  },
  {
    id: "sup-2",
    name: "Highway Fuel Depot",
    category: "fuel",
    contact_name: "Mina Tamang",
    email: "orders@hfd.com.np",
    phone: "9841000002",
    rating: 4,
    is_preferred: true,
  },
  {
    id: "sup-3",
    name: "Heavy Parts Nepal",
    category: "parts",
    contact_name: "Suresh Karki",
    email: "sales@hpn.com.np",
    phone: "9841000003",
    rating: 4,
    is_preferred: false,
  },
];

export const MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: "n-1",
    type: "insurance_expiry",
    title: "Insurance expiring soon",
    message: "Policy POL-2025-88421 for Ba 1 Pa 4521 expires in 23 days.",
    channel: "in_app",
    sent_at: "2026-06-07T06:00:00Z",
    status: "sent",
    read: false,
  },
  {
    id: "n-2",
    type: "allocation_approval",
    title: "Allocation approval required",
    message: "JCB 3DX transfer to Pokhara awaits supervisor approval.",
    channel: "in_app",
    sent_at: "2026-06-06T14:30:00Z",
    status: "sent",
    read: false,
  },
  {
    id: "n-3",
    type: "driver_license",
    title: "Driver license expiring",
    message: "Prakash Gurung license expires on 2026-07-05.",
    channel: "email",
    sent_at: "2026-06-06T06:30:00Z",
    status: "sent",
    read: true,
  },
];

export const MOCK_DASHBOARD: DashboardStats = {
  total_assets: MOCK_ASSETS.filter((a) => a.status !== "decommissioned").length,
  active_allocations: MOCK_ALLOCATIONS.filter((a) => a.state === "active" || a.state === "in_transit").length,
  pending_approvals: MOCK_ALLOCATIONS.filter((a) => a.state === "pending").length,
  expiring_insurance: MOCK_INSURANCE.filter((i) => i.status === "expiring").length,
  expiring_licenses: MOCK_DRIVERS.filter((d) => d.status === "expiring").length,
  overdue_returns: 0,
};

export const MOCK_CREDENTIALS: Record<string, { password: string; user: AuthUser }> = {
  "admin@vms.local": {
    password: "admin123",
    user: {
      id: "user-1",
      name: "Admin User",
      email: "admin@vms.local",
      role: "admin",
      location_ids: [],
      tenant_id: MOCK_TENANT.id,
      tenant_name: MOCK_TENANT.name,
    },
  },
  "manager@vms.local": {
    password: "manager123",
    user: {
      id: "user-2",
      name: "Ram Thapa",
      email: "manager@vms.local",
      role: "manager",
      location_ids: [],
      tenant_id: MOCK_TENANT.id,
      tenant_name: MOCK_TENANT.name,
    },
  },
  "supervisor@vms.local": {
    password: "super123",
    user: {
      id: "user-3",
      name: "Sita Sharma",
      email: "supervisor@vms.local",
      role: "supervisor",
      location_ids: ["loc-1", "loc-2"],
      tenant_id: MOCK_TENANT.id,
      tenant_name: MOCK_TENANT.name,
    },
  },
  "employee@vms.local": {
    password: "employee123",
    user: {
      id: "user-4",
      name: "Hari KC",
      email: "employee@vms.local",
      role: "employee",
      location_ids: ["loc-1"],
      tenant_id: MOCK_TENANT.id,
      tenant_name: MOCK_TENANT.name,
    },
  },
  "driver@vms.local": {
    password: "driver123",
    user: {
      id: "user-5",
      name: "Bikash Rai",
      email: "driver@vms.local",
      role: "driver",
      location_ids: ["loc-1"],
      tenant_id: MOCK_TENANT.id,
      tenant_name: MOCK_TENANT.name,
    },
  },
};

export function paginate<T>(items: T[], page: number, perPage: number, search?: string, searchFn?: (item: T, q: string) => boolean) {
  let filtered = items;
  if (search && searchFn) {
    const q = search.toLowerCase();
    filtered = items.filter((item) => searchFn(item, q));
  }
  const total = filtered.length;
  const start = (page - 1) * perPage;
  return { rows: filtered.slice(start, start + perPage), total, page, per_page: perPage };
}

export function delay(ms = 300) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
