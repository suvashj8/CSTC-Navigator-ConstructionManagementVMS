import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createDriver, listDrivers } from "@/api/drivers";
import { listLocations } from "@/api/locations";
import { PageShell, FilterRow } from "@/components/layout/page-shell";
import { PaginationBar } from "@/components/layout/pagination-bar";
import { DEFAULT_PER_PAGE } from "@/lib/pagination";
import { MobileCard, MobileCardList } from "@/components/layout/mobile-card";
import { ResponsiveTable } from "@/components/layout/responsive-table";
import { LicenseStatusBadge } from "@/components/shared/status-badges";
import { PermissionGate } from "@/guards/ProtectedRoute";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectEmpty, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const LICENSE_CLASSES = ["A", "B", "B+", "C", "D", "E"] as const;

type DriverForm = {
  name: string;
  email: string;
  password: string;
  location_id: string;
  license_no: string;
  license_class: string;
  issue_date: string;
  expiry_date: string;
  endorsements: string;
};

const emptyForm = (): DriverForm => ({
  name: "",
  email: "",
  password: "",
  location_id: "",
  license_no: "",
  license_class: "B",
  issue_date: "",
  expiry_date: "",
  endorsements: "",
});

export default function DriversPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<DriverForm>(emptyForm);

  useEffect(() => setPage(1), [search]);

  const { data, isLoading } = useQuery({
    queryKey: ["drivers", page, search],
    queryFn: () => listDrivers({ page, per_page: DEFAULT_PER_PAGE, search: search || undefined }),
  });
  const { data: locations = [] } = useQuery({ queryKey: ["locations"], queryFn: listLocations });

  const createMut = useMutation({
    mutationFn: createDriver,
    onSuccess: () => {
      toast.success("Driver registered");
      qc.invalidateQueries({ queryKey: ["drivers"] });
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setOpen(false);
      setForm(emptyForm());
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setField = <K extends keyof DriverForm>(key: K, value: DriverForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.license_no.trim()) {
      toast.error("Name, email, and license number are required");
      return;
    }
    if (!form.issue_date || !form.expiry_date) {
      toast.error("License issue and expiry dates are required");
      return;
    }
    createMut.mutate({
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password || undefined,
      location_id: form.location_id || null,
      license_no: form.license_no.trim(),
      license_class: form.license_class,
      issue_date: form.issue_date,
      expiry_date: form.expiry_date,
      endorsements: form.endorsements.trim() || undefined,
    });
  };

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;

  return (
    <PageShell
      title="Drivers"
      description="Driver profiles, license classes, and expiry tracking."
      actions={
        <PermissionGate permission="manage_drivers">
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Add driver
          </Button>
        </PermissionGate>
      }
    >
      <FilterRow>
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name or license no."
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
                  Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
                {!isLoading && rows.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">No drivers found.</p>
                )}
                {rows.map((d) => (
                  <MobileCard
                    key={d.id}
                    title={d.name}
                    subtitle={d.license_no}
                    fields={[
                      { label: "Class", value: d.license_class },
                      { label: "Expiry", value: d.expiry_date },
                      { label: "Status", value: <LicenseStatusBadge status={d.status} /> },
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
                    <TableHead>License no.</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Issue date</TableHead>
                    <TableHead>Expiry date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading &&
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 7 }).map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  {!isLoading && rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                        No drivers found.
                      </TableCell>
                    </TableRow>
                  )}
                  {rows.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell>{d.email}</TableCell>
                      <TableCell className="font-mono text-sm">{d.license_no}</TableCell>
                      <TableCell>{d.license_class}</TableCell>
                      <TableCell>{d.issue_date}</TableCell>
                      <TableCell>{d.expiry_date}</TableCell>
                      <TableCell>
                        <LicenseStatusBadge status={d.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            }
          />
          <PaginationBar page={page} total={total} label="drivers" onPageChange={setPage} />
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add driver</DialogTitle>
            <DialogDescription>
              Creates a driver user account and license profile. Expiry dates feed dashboard and notification alerts.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Full name</Label>
              <Input value={form.name} onChange={(e) => setField("name", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                placeholder="Default: driver123 if empty"
                value={form.password}
                onChange={(e) => setField("password", e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Work location</Label>
              <Select
                value={form.location_id || "none"}
                onValueChange={(v) => setField("location_id", v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not assigned</SelectItem>
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

            <div className="space-y-2 sm:col-span-2 border-t pt-4">
              <p className="text-sm font-medium">Driving license</p>
            </div>

            <div className="space-y-2">
              <Label>License number</Label>
              <Input
                placeholder="e.g. 01-06-0023456"
                value={form.license_no}
                onChange={(e) => setField("license_no", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>License class</Label>
              <Select value={form.license_class} onValueChange={(v) => setField("license_class", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LICENSE_CLASSES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Issue date</Label>
              <Input
                type="date"
                value={form.issue_date}
                onChange={(e) => setField("issue_date", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Expiry date</Label>
              <Input
                type="date"
                value={form.expiry_date}
                onChange={(e) => setField("expiry_date", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Endorsements (optional)</Label>
              <Input
                placeholder="e.g. Heavy vehicle"
                value={form.endorsements}
                onChange={(e) => setField("endorsements", e.target.value)}
              />
            </div>

            <Button type="submit" className="sm:col-span-2" disabled={createMut.isPending}>
              {createMut.isPending ? "Saving…" : "Create driver"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
