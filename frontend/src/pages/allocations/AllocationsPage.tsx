import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { createAllocation, listAllocations, transitionAllocation } from "@/api/allocations";
import { listLocations } from "@/api/locations";
import { listUsers } from "@/api/users";
import { FilterRow, PageShell } from "@/components/layout/page-shell";
import { PaginationBar } from "@/components/layout/pagination-bar";
import { DEFAULT_PER_PAGE } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import { MobileCard, MobileCardList } from "@/components/layout/mobile-card";
import { ResponsiveTable } from "@/components/layout/responsive-table";
import { AllocStateBadge } from "@/components/shared/status-badges";
import { PermissionGate } from "@/guards/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DIALOG_FORM_FIELD, DIALOG_FORM_FULL, DialogForm } from "@/components/ui/dialog-form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableAutocomplete } from "@/components/ui/searchable-autocomplete";
import { Select, SelectContent, SelectEmpty, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  addDaysToDateString,
  dateTimeLocalToApiDate,
  formatNepalDateTime,
  nowNepalDateTimeLocal,
  todayNepalDate,
  toDateTimeLocalNpt,
} from "@/lib/nepalDate";
import { MultiAssetPicker } from "@/components/operations/multi-asset-picker";
import type { Allocation, AllocState, AllocationReceiverRole, WorkLocation } from "@/types/domain";

const RECEIVER_ROLES: { value: AllocationReceiverRole; label: string }[] = [
  { value: "manager", label: "Manager" },
  { value: "employee", label: "Employee" },
  { value: "supervisor", label: "Supervisor" },
  { value: "other", label: "Other person" },
];

const emptyAllocationForm = () => {
  const start = todayNepalDate();
  return {
    asset_ids: [] as string[],
    from_location: "",
    to_location: "",
    driver_mode: "none" as "none" | "internal" | "external",
    driver_id: "",
    external_driver_name: "",
    external_driver_contact: "",
    receiver_role: "" as AllocationReceiverRole | "",
    receiver_user_id: "",
    receiver_name: "",
    receiver_contact: "",
    start_at: nowNepalDateTimeLocal(),
    expected_return_at: toDateTimeLocalNpt(addDaysToDateString(start, 7)),
  };
};

function allocationLocationFields(
  value: string,
  locations: WorkLocation[],
  side: "from" | "to"
): { from_location_id?: string; from_location_name?: string; to_location_id?: string; to_location_name?: string } {
  const trimmed = value.trim();
  const match = locations.find((l) => l.name.toLowerCase() === trimmed.toLowerCase());
  if (match) {
    return side === "from" ? { from_location_id: match.id } : { to_location_id: match.id };
  }
  return side === "from" ? { from_location_name: trimmed } : { to_location_name: trimmed };
}

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
  const [form, setForm] = useState(emptyAllocationForm);

  const { data, isLoading } = useQuery({
    queryKey: ["allocations", page, stateFilter],
    queryFn: () => listAllocations({ page, per_page: perPage, state: stateFilter }),
  });
  const { data: locations = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: listLocations,
    enabled: open,
    staleTime: 120_000,
  });
  const { data: usersData } = useQuery({
    queryKey: ["users", "allocation-staff"],
    queryFn: () => listUsers({ page: 1, per_page: 100 }),
    enabled: open,
    staleTime: 120_000,
  });

  const allUsers = usersData?.rows ?? [];
  const drivers = allUsers.filter((u) => u.role === "driver");
  const receiversForRole = (role: AllocationReceiverRole) => {
    if (role === "manager") return allUsers.filter((u) => u.role === "manager" || u.role === "admin");
    return allUsers.filter((u) => u.role === role);
  };
  const locationNames = useMemo(() => locations.map((l) => l.name), [locations]);
  const rows = data?.rows ?? [];

  const { groupSizeById, isGroupActionRow } = useMemo(() => {
    const sizes = new Map<string, number>();
    for (const r of rows) {
      if (r.group_id) sizes.set(r.group_id, (sizes.get(r.group_id) ?? 0) + 1);
    }
    const seenGroups = new Set<string>();
    const actionRows = new Set<string>();
    for (const r of rows) {
      if (!r.group_id) {
        actionRows.add(r.id);
        continue;
      }
      if (!seenGroups.has(r.group_id)) {
        seenGroups.add(r.group_id);
        actionRows.add(r.id);
      }
    }
    const groupSizeById = new Map<string, number>();
    for (const r of rows) {
      groupSizeById.set(r.id, r.group_id ? (sizes.get(r.group_id) ?? 1) : 1);
    }
    return { groupSizeById, isGroupActionRow: actionRows };
  }, [rows]);

  const transitionMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "approve" | "dispatch" | "receive" | "release" | "cancel" }) =>
      transitionAllocation(id, action),
    onSuccess: (result) => {
      const n = result.affected_count ?? 1;
      toast.success(n > 1 ? `Updated ${n} allocations in this request` : "Allocation updated");
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
      qc.invalidateQueries({ queryKey: ["locations"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setOpen(false);
      setForm(emptyAllocationForm());
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const total = data?.total ?? 0;

  const actionButtons = (row: Allocation) => {
    const { id, state } = row;
    const batch = groupSizeById.get(id) ?? 1;
    const suffix = batch > 1 ? ` all (${batch})` : "";
    if (!isGroupActionRow.has(id)) {
      return <span className="text-xs text-muted-foreground">Same request</span>;
    }

    const btn = (label: string, action: "approve" | "dispatch" | "receive" | "release" | "cancel") => (
      <Button
        key={action}
        variant="outline"
        size="sm"
        disabled={transitionMut.isPending}
        onClick={() => transitionMut.mutate({ id, action })}
      >
        {label}
        {suffix}
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

  const assetCell = (row: Allocation) => {
    const batch = groupSizeById.get(row.id) ?? 1;
    const isFollower = row.group_id && !isGroupActionRow.has(row.id);
    return (
      <div className="space-y-0.5">
        {isFollower ? <span className="text-xs text-muted-foreground">↳ </span> : null}
        <span className={isFollower ? "text-muted-foreground" : undefined}>{row.asset_label}</span>
        {batch > 1 && isGroupActionRow.has(row.id) ? (
          <p className="text-[10px] text-muted-foreground">{batch} assets in this request</p>
        ) : null}
      </div>
    );
  };

  return (
    <PageShell
      title="Allocations"
      description="Track asset transfers between construction sites with approval workflow."
      actions={
        <PermissionGate permission="create_allocation">
          <Button onClick={() => (setForm(emptyAllocationForm()), setOpen(true))}>
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
                  rows.map((r) => (
                    <MobileCard
                      key={r.id}
                      title={r.asset_label ?? r.asset_id}
                      subtitle={`${r.from_location_name} → ${r.to_location_name}`}
                      fields={[
                        { label: "Driver", value: r.driver_name ?? "No driver" },
                        { label: "Receiver", value: r.receiver_name ?? "—" },
                        { label: "Start", value: formatNepalDateTime(r.start_date) },
                        { label: "State", value: <AllocStateBadge state={r.state} /> },
                      ]}
                      actions={actionButtons(r)}
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
                    <TableHead>Receiver</TableHead>
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
                        {Array.from({ length: 8 }).map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  {!isLoading &&
                    rows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{assetCell(r)}</TableCell>
                        <TableCell>
                          {r.from_location_name} → {r.to_location_name}
                        </TableCell>
                        <TableCell>{r.driver_name ?? "No driver"}</TableCell>
                        <TableCell>{r.receiver_name ?? "—"}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatNepalDateTime(r.start_date)}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatNepalDateTime(r.expected_return)}</TableCell>
                        <TableCell>
                          <AllocStateBadge state={r.state} />
                        </TableCell>
                        <TableCell>{actionButtons(r)}</TableCell>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New allocation request</DialogTitle>
            <DialogDescription>
              Request transfer of one or more assets. Assign an optional driver, and name who receives the assets and
              in-app notifications at destination.
            </DialogDescription>
          </DialogHeader>
          <DialogForm
            onSubmit={(e) => {
              e.preventDefault();
              if (form.asset_ids.length === 0) {
                toast.error("Select at least one asset");
                return;
              }
              if (!form.from_location.trim() || !form.to_location.trim()) {
                toast.error("Enter both from and to locations");
                return;
              }
              if (!form.receiver_role) {
                toast.error("Select who receives the assets");
                return;
              }
              if (form.receiver_role === "other") {
                if (!form.receiver_name.trim()) {
                  toast.error("Enter receiver name");
                  return;
                }
                if (!form.receiver_contact.trim()) {
                  toast.error("Enter receiver contact number");
                  return;
                }
              } else if (!form.receiver_user_id) {
                toast.error("Select a receiving authority");
                return;
              }
              if (form.driver_mode === "internal" && !form.driver_id) {
                toast.error("Select a driver or choose No driver / External");
                return;
              }
              if (form.driver_mode === "external" && !form.external_driver_name.trim()) {
                toast.error("Enter external driver name");
                return;
              }
              createMut.mutate({
                asset_ids: form.asset_ids,
                driver_mode: form.driver_mode,
                driver_id: form.driver_mode === "internal" ? form.driver_id : null,
                external_driver_name:
                  form.driver_mode === "external" ? form.external_driver_name.trim() : undefined,
                external_driver_contact:
                  form.driver_mode === "external" ? form.external_driver_contact.trim() : undefined,
                receiver_role: form.receiver_role,
                receiver_user_id: form.receiver_role === "other" ? null : form.receiver_user_id,
                receiver_name: form.receiver_role === "other" ? form.receiver_name.trim() : undefined,
                receiver_contact: form.receiver_role === "other" ? form.receiver_contact.trim() : undefined,
                start_date: dateTimeLocalToApiDate(form.start_at),
                expected_return: dateTimeLocalToApiDate(form.expected_return_at),
                ...allocationLocationFields(form.from_location, locations, "from"),
                ...allocationLocationFields(form.to_location, locations, "to"),
              });
            }}
          >
            <MultiAssetPicker
              className={DIALOG_FORM_FULL}
              locations={locations}
              value={form.asset_ids}
              onChange={(asset_ids, meta) =>
                setForm((f) => ({
                  ...f,
                  asset_ids,
                  from_location:
                    meta?.fromLocation && asset_ids.length > 0 ? meta.fromLocation : f.from_location,
                }))
              }
            />
            <div className={DIALOG_FORM_FIELD}>
              <Label>From location</Label>
              <SearchableAutocomplete
                value={form.from_location}
                onChange={(v) => setForm((f) => ({ ...f, from_location: v }))}
                options={locationNames}
                placeholder="Site or custom place"
                required
              />
              <p className="text-xs text-muted-foreground">Registered site or type a custom origin</p>
            </div>
            <div className={DIALOG_FORM_FIELD}>
              <Label>To location</Label>
              <SearchableAutocomplete
                value={form.to_location}
                onChange={(v) => setForm((f) => ({ ...f, to_location: v }))}
                options={locationNames}
                placeholder="Site or custom place"
                required
              />
              <p className="text-xs text-muted-foreground">Registered site or type a custom destination</p>
            </div>
            <div className={cn(DIALOG_FORM_FIELD, DIALOG_FORM_FULL)}>
              <Label>Driver (optional)</Label>
              <Select
                value={form.driver_mode}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    driver_mode: v as "none" | "internal" | "external",
                    driver_id: "",
                    external_driver_name: "",
                    external_driver_contact: "",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No driver assigned</SelectItem>
                  <SelectItem value="internal">Company driver</SelectItem>
                  <SelectItem value="external">External driver</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Leave unassigned, pick a registered driver, or record an outside operator.
              </p>
            </div>
            {form.driver_mode === "internal" ? (
              <div className={cn(DIALOG_FORM_FIELD, DIALOG_FORM_FULL)}>
                <Label>Company driver</Label>
                <Select
                  value={form.driver_id || undefined}
                  onValueChange={(v) => setForm((f) => ({ ...f, driver_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select driver" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.length === 0 ? (
                      <SelectEmpty message="No drivers registered" />
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
            ) : null}
            {form.driver_mode === "external" ? (
              <>
                <div className={DIALOG_FORM_FIELD}>
                  <Label>External driver name</Label>
                  <Input
                    value={form.external_driver_name}
                    onChange={(e) => setForm((f) => ({ ...f, external_driver_name: e.target.value }))}
                    placeholder="e.g. hired operator"
                    required
                  />
                </div>
                <div className={DIALOG_FORM_FIELD}>
                  <Label>Contact number</Label>
                  <Input
                    type="tel"
                    inputMode="tel"
                    value={form.external_driver_contact}
                    onChange={(e) => setForm((f) => ({ ...f, external_driver_contact: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>
              </>
            ) : null}
            <div className={cn(DIALOG_FORM_FULL, "col-span-full border-t border-border/60 pt-3")}>
              <p className="text-sm font-medium">Receiving authority</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Person responsible for receiving assets at destination. Staff with an account get an in-app notification.
              </p>
            </div>
            <div className={DIALOG_FORM_FIELD}>
              <Label>Role</Label>
              <Select
                value={form.receiver_role || undefined}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    receiver_role: v as AllocationReceiverRole,
                    receiver_user_id: "",
                    receiver_name: "",
                    receiver_contact: "",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {RECEIVER_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.receiver_role && form.receiver_role !== "other" ? (
              <div className={DIALOG_FORM_FIELD}>
                <Label>Person</Label>
                <Select
                  value={form.receiver_user_id || undefined}
                  onValueChange={(v) => setForm((f) => ({ ...f, receiver_user_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select person" />
                  </SelectTrigger>
                  <SelectContent>
                    {receiversForRole(form.receiver_role).length === 0 ? (
                      <SelectEmpty message={`No ${form.receiver_role}s found`} />
                    ) : (
                      receiversForRole(form.receiver_role).map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            {form.receiver_role === "other" ? (
              <>
                <div className={DIALOG_FORM_FIELD}>
                  <Label>Receiver name</Label>
                  <Input
                    value={form.receiver_name}
                    onChange={(e) => setForm((f) => ({ ...f, receiver_name: e.target.value }))}
                    required
                  />
                </div>
                <div className={DIALOG_FORM_FIELD}>
                  <Label>Contact number</Label>
                  <Input
                    type="tel"
                    inputMode="tel"
                    value={form.receiver_contact}
                    onChange={(e) => setForm((f) => ({ ...f, receiver_contact: e.target.value }))}
                    required
                  />
                </div>
                <p className={cn(DIALOG_FORM_FULL, "text-xs text-muted-foreground")}>
                  External contacts are recorded on the request; in-app alerts require a staff account.
                </p>
              </>
            ) : null}
            <div className={DIALOG_FORM_FIELD}>
              <Label>Start date &amp; time (NPT)</Label>
                <Input
                  type="datetime-local"
                  value={form.start_at}
                  onChange={(e) => setForm((f) => ({ ...f, start_at: e.target.value }))}
                  required
                />
              <p className="text-xs text-muted-foreground">Nepal Standard Time (UTC+5:45)</p>
            </div>
            <div className={DIALOG_FORM_FIELD}>
              <Label>Expected return (NPT)</Label>
                <Input
                  type="datetime-local"
                  value={form.expected_return_at}
                  onChange={(e) => setForm((f) => ({ ...f, expected_return_at: e.target.value }))}
                  required
                />
              <p className="text-xs text-muted-foreground">Nepal Standard Time (UTC+5:45)</p>
            </div>
            <Button type="submit" className={DIALOG_FORM_FULL} disabled={createMut.isPending}>
              {createMut.isPending ? "Submitting…" : "Submit request"}
            </Button>
          </DialogForm>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
