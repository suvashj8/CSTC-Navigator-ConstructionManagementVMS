import { useMemo } from "react";
import { useAuthStore } from "@/store/auth";
import type { UserRole } from "@/types/domain";

const ROLE_RANK: Record<UserRole, number> = {
  super_user: 6,
  admin: 5,
  manager: 4,
  supervisor: 3,
  employee: 2,
  driver: 1,
};

type Permission =
  | "manage_users"
  | "manage_drivers"
  | "manage_locations"
  | "manage_assets"
  | "create_allocation"
  | "approve_allocation"
  | "dispatch_allocation"
  | "manage_insurance"
  | "manage_suppliers"
  | "view_reports"
  | "tenant_settings";

const PERMISSIONS: Record<Permission, UserRole[]> = {
  manage_users: ["super_user", "admin"],
  manage_drivers: ["super_user", "admin", "manager"],
  manage_locations: ["super_user", "admin", "manager", "supervisor"],
  manage_assets: ["super_user", "admin", "manager", "supervisor"],
  create_allocation: ["super_user", "admin", "manager", "supervisor", "employee"],
  approve_allocation: ["super_user", "admin", "manager", "supervisor"],
  dispatch_allocation: ["super_user", "admin", "manager", "supervisor"],
  manage_insurance: ["super_user", "admin", "manager"],
  manage_suppliers: ["super_user", "admin", "manager"],
  view_reports: ["super_user", "admin", "manager", "supervisor"],
  tenant_settings: ["super_user", "admin"],
};

export function usePermissions() {
  const user = useAuthStore((s) => s.user);

  return useMemo(() => {
    const role = user?.role;
    const locationIds = user?.location_ids ?? [];

    const hasRole = (...roles: UserRole[]) => !!role && roles.includes(role);
    const atLeast = (minRole: UserRole) => !!role && ROLE_RANK[role] >= ROLE_RANK[minRole];
    const can = (permission: Permission) => !!role && PERMISSIONS[permission].includes(role);
    const inLocation = (locationId: string | null | undefined) => {
      if (!locationId) return true;
      if (!role || role === "admin" || role === "manager" || role === "super_user") return true;
      return locationIds.includes(locationId);
    };

    return { user, role, locationIds, hasRole, atLeast, can, inLocation };
  }, [user]);
}

export function minRoleRank(role: UserRole) {
  return ROLE_RANK[role];
}
