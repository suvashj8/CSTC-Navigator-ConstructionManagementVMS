import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, LogIn, Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { createTenant, listTenants, switchTenant, updateTenantStatus } from "@/api/platform";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/auth";
import type { AuthUser } from "@/types/domain";

export default function PlatformTenantsPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setTenantSubdomain = useAuthStore((s) => s.setTenantSubdomain);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    subdomain: "",
    admin_name: "",
    admin_email: "",
    admin_password: "",
  });

  const { data = [], isLoading } = useQuery({ queryKey: ["platform-tenants"], queryFn: listTenants });

  const createMut = useMutation({
    mutationFn: createTenant,
    onSuccess: () => {
      toast.success("Tenant provisioned");
      qc.invalidateQueries({ queryKey: ["platform-tenants"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const switchMut = useMutation({
    mutationFn: switchTenant,
    onSuccess: (res, tenantId) => {
      const tenant = data.find((t) => t.id === tenantId);
      if (tenant) setTenantSubdomain(tenant.subdomain);
      const user: AuthUser = {
        id: res.user.id,
        name: res.user.name,
        email: res.user.email,
        role: "super_user",
        location_ids: res.user.location_ids ?? [],
        tenant_id: res.user.tenant_id,
        tenant_name: res.user.tenant_name,
      };
      setAuth(res.access_token, user);
      toast.success(`Switched to ${res.user.tenant_name}`);
      nav("/dashboard");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateTenantStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platform-tenants"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <PageShell
      title="Platform tenants"
      description="Provision and manage multi-tenant organizations (database-per-tenant)."
      actions={
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          New tenant
        </Button>
      }
    >
      <Card>
        <CardContent className="divide-y p-0">
          {isLoading && (
            <div className="p-4">
              <Skeleton className="h-16 w-full" />
            </div>
          )}
          {data.map((t) => (
            <div key={t.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {t.subdomain}.vms.app · {t.db_name}
                  </p>
                  <div className="mt-1 flex gap-2">
                    <Badge variant="outline" className="capitalize">
                      {t.status}
                    </Badge>
                    <Badge variant="secondary">{t.plan_tier}</Badge>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => switchMut.mutate(t.id)} disabled={t.status !== "active"}>
                  <LogIn className="h-3.5 w-3.5" />
                  Enter tenant
                </Button>
                {t.status === "active" ? (
                  <Button size="sm" variant="outline" onClick={() => statusMut.mutate({ id: t.id, status: "suspended" })}>
                    Suspend
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => statusMut.mutate({ id: t.id, status: "active" })}>
                    Activate
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Provision new tenant</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              createMut.mutate(form);
            }}
          >
            {[
              ["name", "Organization name"],
              ["subdomain", "Subdomain"],
              ["admin_name", "Admin name"],
              ["admin_email", "Admin email"],
              ["admin_password", "Admin password"],
            ].map(([key, label]) => (
              <div key={key} className="space-y-1">
                <Label>{label}</Label>
                <Input
                  type={key.includes("password") ? "password" : key.includes("email") ? "email" : "text"}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  required
                />
              </div>
            ))}
            <Button type="submit" disabled={createMut.isPending}>
              {createMut.isPending ? "Provisioning…" : "Create tenant"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
