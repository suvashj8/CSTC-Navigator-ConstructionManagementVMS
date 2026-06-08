import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createUser, listUsers } from "@/api/users";
import { listLocations } from "@/api/locations";
import { FilterRow, PageShell } from "@/components/layout/page-shell";
import { PaginationBar } from "@/components/layout/pagination-bar";
import { DEFAULT_PER_PAGE } from "@/lib/pagination";
import { MobileCard, MobileCardList } from "@/components/layout/mobile-card";
import { ResponsiveTable } from "@/components/layout/responsive-table";
import { PermissionGate } from "@/guards/ProtectedRoute";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DIALOG_FORM_FIELD, DIALOG_FORM_FULL, DialogForm } from "@/components/ui/dialog-form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectEmpty, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { UserRole } from "@/types/domain";

const USER_ROLES: { value: UserRole; label: string }[] = [
  { value: "manager", label: "Manager" },
  { value: "supervisor", label: "Supervisor" },
  { value: "employee", label: "Employee" },
];

type UserForm = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  location_id: string;
};

const emptyForm = (): UserForm => ({
  name: "",
  email: "",
  password: "",
  role: "employee",
  location_id: "",
});

export default function UsersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<UserForm>(emptyForm);

  useEffect(() => setPage(1), [search]);

  const { data, isLoading } = useQuery({
    queryKey: ["users", page, search],
    queryFn: () => listUsers({ page, per_page: DEFAULT_PER_PAGE, search: search || undefined }),
  });
  const { data: locations = [] } = useQuery({ queryKey: ["locations"], queryFn: listLocations });

  const createMut = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      toast.success("User created");
      qc.invalidateQueries({ queryKey: ["users"] });
      setOpen(false);
      setForm(emptyForm());
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setField = <K extends keyof UserForm>(key: K, value: UserForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      toast.error("Name, email, and password are required");
      return;
    }
    createMut.mutate({
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
      role: form.role,
      location_id: form.location_id || null,
    });
  };

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;

  return (
    <PageShell
      title="Users"
      description="Manage tenant users and role assignments. Drivers are added from the Drivers page."
      actions={
        <PermissionGate permission="manage_users">
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Add user
          </Button>
        </PermissionGate>
      }
    >
      <FilterRow>
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name or email"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setSearch(searchInput)}
            className="pl-9"
          />
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            setSearch(searchInput);
            setPage(1);
          }}
        >
          Search
        </Button>
      </FilterRow>

      <Card>
        <CardContent className="p-0">
          <ResponsiveTable
            mobile={
              <MobileCardList className="p-3">
                {isLoading &&
                  Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
                {!isLoading && rows.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">No users found.</p>
                )}
                {rows.map((u) => (
                  <MobileCard
                    key={u.id}
                    title={u.name}
                    subtitle={u.email}
                    fields={[
                      { label: "Role", value: <Badge variant="secondary" className="capitalize">{u.role}</Badge> },
                      { label: "Location", value: u.location_name ?? "All locations" },
                      { label: "Status", value: u.status },
                    ]}
                  />
                ))}
              </MobileCardList>
            }
            desktop={
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading &&
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 5 }).map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  {!isLoading && rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                        No users found.
                      </TableCell>
                    </TableRow>
                  )}
                  {rows.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {u.role.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>{u.location_name ?? "All locations"}</TableCell>
                      <TableCell className="capitalize">{u.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            }
          />
          <PaginationBar page={page} total={total} label="users" onPageChange={setPage} />
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add user</DialogTitle>
            <DialogDescription>
              Create a staff account with role and optional work location (per VMS user management).
            </DialogDescription>
          </DialogHeader>
          <DialogForm onSubmit={handleSubmit}>
            <div className={DIALOG_FORM_FIELD}>
              <Label>Full name</Label>
              <Input value={form.name} onChange={(e) => setField("name", e.target.value)} required />
            </div>
            <div className={DIALOG_FORM_FIELD}>
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                required
              />
            </div>
            <div className={DIALOG_FORM_FIELD}>
              <Label>Password</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setField("password", e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className={DIALOG_FORM_FIELD}>
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setField("role", v as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USER_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={DIALOG_FORM_FIELD}>
              <Label>Work location</Label>
              <Select
                value={form.location_id || "none"}
                onValueChange={(v) => setField("location_id", v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All locations</SelectItem>
                  {locations.length === 0 ? (
                    <SelectEmpty message="No locations" />
                  ) : (
                    locations.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className={DIALOG_FORM_FULL} disabled={createMut.isPending}>
              {createMut.isPending ? "Saving…" : "Create user"}
            </Button>
          </DialogForm>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
