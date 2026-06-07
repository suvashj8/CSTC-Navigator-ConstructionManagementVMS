import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRightLeft, Shield, Truck, UserCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { getDashboardStats } from "@/api/dashboard";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/auth";

const statCards = [
  { key: "total_assets", label: "Total assets", icon: Truck, href: "/assets", color: "text-primary" },
  { key: "active_allocations", label: "Active allocations", icon: ArrowRightLeft, href: "/allocations", color: "text-sky-600" },
  { key: "pending_approvals", label: "Pending approvals", icon: UserCheck, href: "/allocations?state=pending", color: "text-amber-600" },
  { key: "expiring_insurance", label: "Expiring insurance", icon: Shield, href: "/insurance", color: "text-orange-600" },
  { key: "expiring_licenses", label: "Expiring licenses", icon: AlertTriangle, href: "/drivers", color: "text-red-600" },
  { key: "overdue_returns", label: "Overdue returns", icon: ArrowRightLeft, href: "/reports/overdue-allocations", color: "text-rose-600" },
] as const;

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useQuery({ queryKey: ["dashboard-stats"], queryFn: getDashboardStats });

  return (
    <PageShell
      title="Dashboard"
      description={`Fleet overview for ${user?.tenant_name ?? "your organization"}.`}
    >
      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-3">
        {statCards.map(({ key, label, icon: Icon, href, color }) => (
          <Link key={key} to={href}>
            <Card className="h-full transition-colors hover:border-primary/40 hover:bg-accent/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                <Icon className={cnIcon(color, "h-5 w-5")} />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-3xl font-bold tabular-nums">{data?.[key] ?? 0}</p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick actions</CardTitle>
            <CardDescription>Common tasks for site supervisors and managers.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {[
              { to: "/assets", label: "Register asset" },
              { to: "/allocations", label: "New allocation" },
              { to: "/drivers", label: "Check driver licenses" },
              { to: "/reports", label: "View reports" },
            ].map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="rounded-lg border px-4 py-3 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-accent/30"
              >
                {label}
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Today&apos;s focus</CardTitle>
            <CardDescription>Items that may need attention on site.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {!isLoading && (data?.pending_approvals ?? 0) > 0 && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                {data?.pending_approvals} allocation(s) awaiting approval.
              </p>
            )}
            {!isLoading && (data?.expiring_insurance ?? 0) > 0 && (
              <p className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-orange-900">
                {data?.expiring_insurance} insurance policy(ies) expiring within 30 days.
              </p>
            )}
            {!isLoading && (data?.expiring_licenses ?? 0) > 0 && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-900">
                {data?.expiring_licenses} driver license(s) expiring soon.
              </p>
            )}
            {!isLoading &&
              !data?.pending_approvals &&
              !data?.expiring_insurance &&
              !data?.expiring_licenses && (
                <p className="text-muted-foreground">No urgent items. Fleet operations look healthy.</p>
              )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

function cnIcon(color: string, size: string) {
  return `${color} ${size}`;
}
