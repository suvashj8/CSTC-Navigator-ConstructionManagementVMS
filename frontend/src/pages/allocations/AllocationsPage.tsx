import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { createAllocation, listAllocations, transitionAllocation } from "@/api/allocations";
import { listAssets } from "@/api/assets";
import { listLocations } from "@/api/locations";
import { listUsers } from "@/api/users";
import { FilterRow, PageShell } from "@/components/layout/page-shell";
import { PaginationBar } from "@/components/layout/pagination-bar";
import { DEFAULT_PER_PAGE } from "@/lib/pagination";
import { MobileCard, MobileCardList } from "@/components/layout/mobile-card";
import { ResponsiveTable } from "@/components/layout/responsive-table";
import { AllocStateBadge } from "@/components/shared/status-badges";
import { PermissionGate } from "@/guards/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectEmpty, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AllocState } from "@/types/domain";

const states: { value: AllocState | "all"; label: string }[] = [
  { value: "all", label: "All states" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "in_transit", label: "In transit" },
  { value: "active", label: "Active" },
  { value: "released", label: "Released" },
];

export default function AllocationsPage() {
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const stateFilter = (searchParams.get("state") as AllocState | null) ?? undefined;
  const [page, setPage] = useState(1);
  const perPage = DEFAULT_PER_PAGE;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    asset_id: "",
    from_location_id: "",
    to_location_id: "",
    driver_id: "",
    start_date: "",
    expected_return: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["allocations", page, stateFilter],
    queryFn: () => listAllocations({ page, per_page: perPage, state: stateFilter }),
  });
  const { data: assetsData } = useQuery({
    queryKey: ["assets", "allocation-pick"],
    queryFn: () => listAssets({ page: 1, per_page: 50, status: "active" }),
    enabled: open,
    staleTime: 120_000,
  });
  const { data: locations = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: listLocations,
    enabled: open,
    staleTime: 120_000,
  });
  const { data: usersData } = useQuery({
    queryKey: ["users", "allocation-drivers"],
    queryFn: () => listUsers({ page: 1, per_page: 50 }),
    enabled: open,
    staleTime: 120_000,
  });

  const assets = assetsData?.rows ?? [];
  const drivers = (usersData?.rows ?? []).filter((u) => u.role === "driver");

  const transitionMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "approve" | "dispatch" | "receive" | "release" | "cancel" }) =>
      transitionAllocation(id, action),
    onSuccess: () => {
      toast.success("Allocation updated");
      qc.invalidateQueries({ queryKey: ["allocations"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createMut = useMutation({
    mutationFn: createAllocation,
    onSuccess: () => {
      toast.success("Allocation request created");
      qc.invalidateQueries({ queryKey: ["allocations"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const total = data?.total ?? 0;

  const actionButtons = (id: string, state: AllocState) => {
    const btn = (label: string, action: "approve" | "dispatch" | "receive" | "release" | "cancel") => (
      <Button
        key={action}
        variant="outline"
        size="sm"
        disabled={transitionMut.isPending}
        onClick={() => transitionMut.mutate({ id, action })}
      >
        {label}
      </Button>
    );

    if (state === "pending") {
      return (
        <PermissionGate permission="approve_allocation">
          <div className="flex flex-wrap gap-1">
            {btn("Approve", "approve")}
            {btn("Cancel", "cancel")}
          </div>
        </PermissionGate>
      );
    }
    if (state === "approved") {
      return (
        <PermissionGate permission="dispatch_allocation">
          <div className="flex flex-wrap gap-1">{btn("Dispatch", "dispatch")}</div>
        </PermissionGate>
      );
    }
    if (state === "in_transit") {
      return (
        <PermissionGate permission="dispatch_allocation">
          <div className="flex flex-wrap gap-1">{btn("Receive", "receive")}</div>
        </PermissionGate>
      );
    }
    if (state === "active") {
      return (
        <PermissionGate permission="dispatch_allocation">
          <div className="flex flex-wrap gap-1">{btn("Release", "release")}</div>
        </PermissionGate>
      );
    }
    return null;
  };

  return (
    <PageShell
      title="Allocations"
      description="Track asset transfers between construction sites with approval workflow."
      actions={
        <PermissionGate permission="create_allocation">
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            New request
          </Button>
        </PermissionGate>
      }
    >
      <FilterRow>
        <div className="space-y-2">
          <Label>State</Label>
          <Select
            value={stateFilter ?? "all"}
            onValueChange={(v) => {
              if (v === "all") searchParams.delete("state");
              else searchParams.set("state", v);
              setSearchParams(searchParams);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {states.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FilterRow>

      <Card>
        <CardContent className="p-0">
          <ResponsiveTable
            scrollMinClass="min-w-[56rem]"
            mobile={
              <MobileCardList className="p-3">
                {isLoading &&
                  Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}
                {!isLoading &&
                  (data?.rows ?? []).map((r) => (
                    <MobileCard
                      key={r.id}
                      title={r.asset_label ?? r.asset_id}
                      subtitle={`${r.from_location_name} → ${r.to_location_name}`}
                      fields={[
                        { label: "Driver", value: r.driver_name ?? "—" },
                        { label: "Start", value: r.start_date },
                        { label: "State", value: <AllocStateBadge state={r.state} /> },
                      ]}
                      actions={actionButtons(r.id, r.state)}
                    />
                  ))}
              </MobileCardList>
            }
            desktop={
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>From → To</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>Expected return</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead className="min-w-[180px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading &&
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 7 }).map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  {!isLoading &&
                    (data?.rows ?? []).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.asset_label}</TableCell>
                        <TableCell>
                          {r.from_location_name} → {r.to_location_name}
                        </TableCell>
                        <TableCell>{r.driver_name}</TableCell>
                        <TableCell>{r.start_date}</TableCell>
                        <TableCell>{r.expected_return}</TableCell>
                        <TableCell>
                          <AllocStateBadge state={r.state} />
                        </TableCell>
                        <TableCell>{actionButtons(r.id, r.state)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            }
          />
          <PaginationBar page={page} total={total} label="allocations" onPageChange={setPage} />
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New allocation request</DialogTitle>
            <DialogDescription>Request transfer of an asset to another work location.</DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              createMut.mutate(form);
            }}
          >
            <div className="space-y-2">
              <Label>Asset</Label>
              <Select value={form.asset_id || undefined} onValueChange={(v) => setForm((f) => ({ ...f, asset_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select asset" />
                </SelectTrigger>
                <SelectContent>
                  {assets.length === 0 ? (
                    <SelectEmpty message="No active assets" />
                  ) : (
                    assets.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.reg_serial_no} — {a.make} {a.model}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>From location</Label>
                <Select
                  value={form.from_location_id || undefined}
                  onValueChange={(v) => setForm((f) => ({ ...f, from_location_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="From" />
                  </SelectTrigger>
                  <SelectContent>
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
              <div className="space-y-2">
                <Label>To location</Label>
                <Select
                  value={form.to_location_id || undefined}
                  onValueChange={(v) => setForm((f) => ({ ...f, to_location_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="To" />
                  </SelectTrigger>
                  <SelectContent>
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
            </div>
            <div className="space-y-2">
              <Label>Driver</Label>
              <Select value={form.driver_id || undefined} onValueChange={(v) => setForm((f) => ({ ...f, driver_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select driver" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.length === 0 ? (
                    <SelectEmpty message="No drivers" />
                  ) : (
                    drivers.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Start date</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Expected return</Label>
                <Input
                  type="date"
                  value={form.expected_return}
                  onChange={(e) => setForm((f) => ({ ...f, expected_return: e.target.value }))}
                  required
                />
              </div>
            </div>
            <Button type="submit" disabled={createMut.isPending}>
              {createMut.isPending ? "Submitting…" : "Submit request"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
