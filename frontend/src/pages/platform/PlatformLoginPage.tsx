import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Shield, Lock, Mail } from "lucide-react";
import { loginPlatform } from "@/api/auth";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AuthUser } from "@/types/domain";

export default function PlatformLoginPage() {
  const nav = useNavigate();
  const setPlatformAuth = useAuthStore((s) => s.setPlatformAuth);
  const [loading, setLoading] = useState(false);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center p-4 mesh-bg">
      <Card className="w-full max-w-md border-0 shadow-xl">
        <CardHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <CardTitle>Platform console</CardTitle>
          <CardDescription>Super-user access for tenant management</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              setLoading(true);
              try {
                const res = await loginPlatform(String(fd.get("email")), String(fd.get("password")));
                const user: AuthUser = {
                  id: res.user.id,
                  name: res.user.name,
                  email: res.user.email,
                  role: "super_user",
                  location_ids: res.user.location_ids ?? [],
                  tenant_name: "Platform",
                };
                setPlatformAuth(res.access_token, user);
                toast.success("Platform sign-in successful");
                nav("/platform/tenants", { replace: true });
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Sign in failed");
              } finally {
                setLoading(false);
              }
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" name="email" type="email" className="pl-10" defaultValue="super@vms.local" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" name="password" type="password" className="pl-10" defaultValue="super123" required />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in to platform"}
            </Button>
          </form>
          <Button variant="link" className="mt-4 w-full" onClick={() => nav("/login")}>
            Back to tenant login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
