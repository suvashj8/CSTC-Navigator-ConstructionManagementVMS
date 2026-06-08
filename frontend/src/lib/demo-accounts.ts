/** Demo tenant credentials — must match web/src/lib/demo-accounts.ts */
export const DEMO_SUBDOMAIN = "demo";

export const DEMO_ACCOUNTS = [
  { email: "admin@vms.local", password: "admin123", role: "Admin" },
  { email: "manager@vms.local", password: "manager123", role: "Manager" },
  { email: "supervisor@vms.local", password: "super123", role: "Supervisor" },
  { email: "employee@vms.local", password: "employee123", role: "Employee" },
  { email: "driver@vms.local", password: "driver123", role: "Driver" },
] as const;

export const DEMO_SUPER_USER = {
  email: "super@vms.local",
  password: "super123",
} as const;
