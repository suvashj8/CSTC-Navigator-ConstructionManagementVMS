import { NavLink, useNavigate } from "react-router-dom";
import {
  Bell,
  Building2,
  FileBarChart,
  LayoutDashboard,
  LogOut,
  MapPin,
  Shield,
  Truck,
  UserCog,
  Users,
  Route,
  Fuel,
  ClipboardList,
  Store,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/auth";
import { usePermissions, minRoleRank } from "@/hooks/usePermissions";
import { listNotifications, unreadCount } from "@/api/notifications";
import type { UserRole } from "@/types/domain";

type NavItem = {
  to: string;
  label: string;
  icon: typeof Truck;
  minRole: UserRole;
  /** Indented sub-item under Operation */
  sub?: boolean;
  end?: boolean;
};

const mainNav: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, minRole: "employee" },
  { to: "/assets", label: "Assets & Fleet", icon: Truck, minRole: "employee" },
  { to: "/allocations", label: "Allocations", icon: MapPin, minRole: "employee" },
];

const peopleNav: NavItem[] = [
  { to: "/users", label: "Users", icon: Users, minRole: "admin" },
  { to: "/drivers", label: "Drivers", icon: UserCog, minRole: "supervisor" },
];

/** Operation + sub-menus: Fuel logs, Maintenance */
const operationNav: NavItem[] = [
  { to: "/operations", label: "Operation", icon: Route, minRole: "supervisor", end: true },
  { to: "/operations/fuel", label: "Fuel logs", icon: Fuel, minRole: "supervisor", sub: true },
  { to: "/operations/maintenance", label: "Maintenance", icon: ClipboardList, minRole: "manager", sub: true },
];

/** Separate from Operation per product spec */
const siteNav: NavItem[] = [
  { to: "/locations", label: "Locations", icon: Building2, minRole: "supervisor" },
  { to: "/insurance", label: "Insurance", icon: Shield, minRole: "manager" },
  { to: "/suppliers", label: "Suppliers", icon: Store, minRole: "manager" },
];

const insightNav: NavItem[] = [
  { to: "/reports", label: "Reports", icon: FileBarChart, minRole: "supervisor" },
  { to: "/notifications", label: "Notifications", icon: Bell, minRole: "employee" },
];

function NavSection({ title, items, role }: { title: string; items: NavItem[]; role?: UserRole }) {
  const visible = items.filter((item) => !role || minRoleRank(role) >= minRoleRank(item.minRole));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-1">
      <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/50">{title}</p>
      {visible.map(({ to, label, icon: Icon, sub, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-all",
              sub ? "ml-4 mr-1 border-l-2 border-sidebar-border pl-4 pr-2" : "px-3",
              isActive
                ? sub
                  ? "border-primary bg-primary/15 text-primary"
                  : "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            )
          }
        >
          <Icon className="h-4 w-4 shrink-0" />
          {label}
        </NavLink>
      ))}
    </div>
  );
}

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const nav = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { role } = usePermissions();

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: listNotifications,
    enabled: !!user,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });

  const unread = unreadCount(notifications);

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:sticky lg:top-0">
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/30">
          <Truck className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-bold tracking-tight">VMS</p>
          <p className="text-[11px] text-sidebar-foreground/60">Vehicle Management</p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4">
        <NavSection title="Overview" items={mainNav} role={role} />
        <NavSection title="People" items={peopleNav} role={role} />
        <NavSection title="Operation" items={operationNav} role={role} />
        <NavSection title="Site" items={siteNav} role={role} />
        <NavSection title="Insights" items={insightNav} role={role} />
        {role && minRoleRank(role) >= minRoleRank("admin") && (
          <NavSection title="Admin" items={[{ to: "/settings", label: "Settings", icon: UserCog, minRole: "admin" }]} role={role} />
        )}
      </nav>

      <Separator className="bg-sidebar-border" />
      <div className="space-y-3 p-4">
        <div className="rounded-lg bg-sidebar-accent px-3 py-2.5">
          <p className="truncate text-xs font-medium">{user?.name ?? user?.email}</p>
          <p className="truncate text-[11px] text-sidebar-foreground/60">{user?.tenant_name}</p>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] capitalize">
              {user?.role?.replace(/_/g, " ")}
            </Badge>
            {unread > 0 && (
              <Badge className="h-5 px-1.5 text-[10px]">{unread} new</Badge>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          onClick={() => {
            logout();
            onNavigate?.();
            nav("/login");
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
