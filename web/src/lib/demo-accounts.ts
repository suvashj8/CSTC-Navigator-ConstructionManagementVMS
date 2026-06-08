/** Demo tenant credentials — kept in sync with seed and login UI. */
export const DEMO_SUBDOMAIN = "demo";

export const DEMO_SUPER_USER = {
  email: "super@vms.local",
  password: "super123",
} as const;

export type DemoAccount = {
  name: string;
  email: string;
  password: string;
  role: "admin" | "manager" | "supervisor" | "employee" | "driver";
  label: string;
};

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { name: "Demo Admin", email: "admin@vms.local", password: "admin123", role: "admin", label: "Admin" },
  { name: "Ram Thapa", email: "manager@vms.local", password: "manager123", role: "manager", label: "Manager" },
  { name: "Sita Sharma", email: "supervisor@vms.local", password: "super123", role: "supervisor", label: "Supervisor" },
  { name: "Hari KC", email: "employee@vms.local", password: "employee123", role: "employee", label: "Employee" },
  { name: "Bikash Rai", email: "driver@vms.local", password: "driver123", role: "driver", label: "Driver" },
];
