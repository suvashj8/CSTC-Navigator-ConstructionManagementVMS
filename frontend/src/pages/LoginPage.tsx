import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { HardHat, Lock, Mail, Sparkles, Truck } from "lucide-react";
import { login } from "@/api/auth";
import { useAuthStore } from "@/store/auth";
import { DEMO_ACCOUNTS, DEMO_SUBDOMAIN } from "@/lib/demo-accounts";
import { loginErrorHint, stackHintFromHealth, type StackHealth } from "@/lib/stack-hint";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const nav = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const tenantSubdomain = useAuthStore((s) => s.tenantSubdomain);
  const setTenantSubdomain = useAuthStore((s) => s.setTenantSubdomain);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState("Admin");
  const [email, setEmail] = useState("admin@vms.local");
  const [password, setPassword] = useState("admin123");
  const [stackHint, setStackHint] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/health")
      .then(async (res) => {
        const json = (await res.json()) as {
          success?: boolean;
          data?: StackHealth;
          error?: { message?: string };
        };
        if (cancelled) return;
        const payload = json.data;
        const hint = stackHintFromHealth(payload);
        if (hint) setStackHint(hint);
      })
      .catch(() => {
        if (!cancelled) {
          setStackHint(stackHintFromHealth({ api: "down" }));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function pickDemoAccount(account: (typeof DEMO_ACCOUNTS)[number]) {
    setSelectedRole(account.role);
    setEmail(account.email);
    setPassword(account.password);
    setTenantSubdomain(DEMO_SUBDOMAIN);
  }

  async function signIn(subdomain: string, loginEmail: string, loginPassword: string) {
    const sub = subdomain.trim().toLowerCase() || DEMO_SUBDOMAIN;
    const normalizedEmail = loginEmail.trim().toLowerCase();
    const normalizedPassword = loginPassword.trim();
    if (!sub || !normalizedEmail || !normalizedPassword) {
      toast.error("Subdomain, email, and password are required");
      return;
    }
    setTenantSubdomain(sub);
    setLoading(true);
    try {
      const res = await login(normalizedEmail, normalizedPassword, sub);
      setAuth(res.access_token, res.user);
      toast.success("Signed in successfully");
      nav("/dashboard", { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign in failed";
      const lower = msg.toLowerCase();
      const isDemoCreds =
        sub === DEMO_SUBDOMAIN &&
        DEMO_ACCOUNTS.some((a) => a.email === normalizedEmail && a.password === normalizedPassword);

      if (lower.includes("invalid") && isDemoCreds) {
        toast.error("Demo data may be out of date", {
          description: "Run: npm run docker:reseed — then sign in again",
          duration: 12000,
        });
        return;
      }
      if (lower.includes("invalid")) {
        toast.error(msg, {
          description: `Use subdomain "${DEMO_SUBDOMAIN}" and tap a demo role below.`,
          duration: 12000,
        });
        return;
      }

      const { title, description } = loginErrorHint(msg);
      toast.error(title, { description, duration: 12000 });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid h-screen desktop:min-h-screen desktop:grid-cols-2 overflow-hidden">
      <div className="relative hidden overflow-hidden bg-sidebar desktop:flex desktop:flex-col desktop:justify-between desktop:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/40">
            <Truck className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-sidebar-foreground">VMS</span>
        </div>
        <div className="relative space-y-6">
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-sidebar-foreground">
            Fleet control for construction sites
          </h1>
          <p className="max-w-md text-sidebar-foreground/70">
            Track vehicles, equipment, allocations, insurance, and driver compliance across every work location.
          </p>
          <div className="flex flex-wrap gap-3">
            {["Multi-site allocations", "Insurance alerts", "Driver licenses", "Role-based access"].map((t) => (
              <span
                key={t}
                className="rounded-full border border-sidebar-border bg-sidebar-accent px-3 py-1 text-xs text-sidebar-foreground/80"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
        <p className="relative flex items-center gap-2 text-xs text-sidebar-foreground/50">
          <HardHat className="h-3.5 w-3.5" />
          Vehicle Management System · Subdomain: {DEMO_SUBDOMAIN}
        </p>
      </div>

      <div className="flex flex-col items-center justify-center overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] mesh-bg sm:p-6">
        <div className="mb-6 flex items-center gap-3 desktop:hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/30">
            <Truck className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <p className="font-bold">VMS</p>
            <p className="text-xs text-muted-foreground">Vehicle Management</p>
          </div>
        </div>
        <Card className="w-full max-w-md border-0 shadow-xl shadow-primary/5">
          <CardHeader className="space-y-1 text-center sm:text-left">
            <div className="mb-2 flex justify-center sm:justify-start">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>Sign in to your VMS workspace</CardDescription>
          </CardHeader>
          <CardContent>
            {stackHint && (
              <div
                role="alert"
                className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100"
              >
                {stackHint}
              </div>
            )}
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                void signIn(
                  String(fd.get("subdomain")),
                  String(fd.get("email")),
                  String(fd.get("password"))
                );
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="subdomain">Tenant subdomain</Label>
                <Input
                  id="subdomain"
                  name="subdomain"
                  placeholder={DEMO_SUBDOMAIN}
                  value={tenantSubdomain || DEMO_SUBDOMAIN}
                  onChange={(e) => setTenantSubdomain(e.target.value.trim().toLowerCase())}
                  required
                />
              </div>
              {selectedRole && (
                <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-foreground">
                  Signing in as <span className="font-semibold">{selectedRole}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{email}</span>
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </Button>
              <Button type="button" variant="link" className="w-full" onClick={() => nav("/platform/login")}>
                Super-user platform console
              </Button>
            </form>
            <div className="mt-4 space-y-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Demo accounts (subdomain: {DEMO_SUBDOMAIN})</p>
              <p>Tap a role to fill credentials, then sign in.</p>
              <div className="flex flex-wrap gap-2">
                {DEMO_ACCOUNTS.map((a) => (
                  <Button
                    key={a.email}
                    type="button"
                    variant={selectedRole === a.role ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs"
                    disabled={loading}
                    onClick={() => pickDemoAccount(a)}
                  >
                    {a.role}
                  </Button>
                ))}
              </div>
              <div className="space-y-1 pt-1">
                {DEMO_ACCOUNTS.map((a) => (
                  <p key={a.email}>
                    <code className="rounded bg-muted px-1">{a.role}</code> {a.email} / {a.password}
                  </p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
