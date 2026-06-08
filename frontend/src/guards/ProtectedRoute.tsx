import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { usePermissions, minRoleRank } from "@/hooks/usePermissions";
import type { UserRole } from "@/types/domain";

export function ProtectedRoute({
  children,
  minRole = "driver",
  redirectTo = "/login",
}: {
  children: ReactNode;
  minRole?: UserRole;
  redirectTo?: string;
}) {
  const { user, role } = usePermissions();

  if (!user) return <Navigate to={redirectTo} replace />;
  if (!role || minRoleRank(role) < minRoleRank(minRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export function PermissionGate({
  children,
  fallback = null,
  permission,
  roles,
}: {
  children: ReactNode;
  fallback?: ReactNode;
  permission?: Parameters<ReturnType<typeof usePermissions>["can"]>[0];
  roles?: UserRole[];
}) {
  const { can, hasRole } = usePermissions();

  if (permission && !can(permission)) return <>{fallback}</>;
  if (roles && !hasRole(...roles)) return <>{fallback}</>;

  return <>{children}</>;
}
