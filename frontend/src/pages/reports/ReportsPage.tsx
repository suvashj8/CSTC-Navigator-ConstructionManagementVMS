import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRightLeft, BarChart3, MapPin, Shield } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const reports = [
  {
    to: "/reports/location-assets",
    title: "Location-wise assets",
    description: "Asset distribution across construction sites and workshops.",
    icon: MapPin,
  },
  {
    to: "/reports/insurance-expiry",
    title: "Insurance expiry",
    description: "Policies expiring within the next 90 days.",
    icon: Shield,
  },
  {
    to: "/reports/driver-license-expiry",
    title: "Driver license expiry",
    description: "Licenses approaching renewal deadlines.",
    icon: AlertTriangle,
  },
  {
    to: "/reports/fleet-utilization",
    title: "Fleet utilization",
    description: "Active vs idle asset days by location.",
    icon: BarChart3,
  },
  {
    to: "/reports/overdue-allocations",
    title: "Overdue allocations",
    description: "Assets past expected return date.",
    icon: ArrowRightLeft,
  },
];

export default function ReportsPage() {
  return (
    <PageShell title="Reports" description="Operational and compliance reports for fleet management.">
      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-3">
        {reports.map(({ to, title, description, icon: Icon }) => (
          <Link key={to} to={to}>
            <Card className="h-full transition-colors hover:border-primary/40 hover:bg-accent/20">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-base">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
