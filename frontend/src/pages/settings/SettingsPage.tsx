import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/auth";

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <PageShell title="Settings" description="Tenant configuration and notification preferences.">
      <div className="grid max-w-2xl gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Organization</CardTitle>
            <CardDescription>Tenant profile (read-only in demo mode).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Tenant:</span> {user?.tenant_name}
            </p>
            <p>
              <span className="text-muted-foreground">Tenant ID:</span> {user?.tenant_id}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notification rules</CardTitle>
            <CardDescription>Per-tenant notification config (UI preview).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { id: "insurance", label: "Insurance expiry alerts", desc: "90 / 60 / 30 / 7 day lead times" },
              { id: "allocation", label: "Allocation transfer alerts", desc: "Notify source and destination supervisors" },
              { id: "license", label: "Driver license expiry", desc: "Email and SMS to driver and supervisor" },
            ].map(({ id, label, desc }) => (
              <div key={id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label htmlFor={id}>{label}</Label>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <Switch id={id} defaultChecked />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
