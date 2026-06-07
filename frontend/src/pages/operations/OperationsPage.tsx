import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Route, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { listAssets, updateAsset, type Asset } from "@/api/assets";
import { FilterRow, PageShell } from "@/components/layout/page-shell";
import { MobileCard, MobileCardList } from "@/components/layout/mobile-card";
import { PaginationBar } from "@/components/layout/pagination-bar";
import { ResponsiveTable } from "@/components/layout/responsive-table";
import {
  emptyOperationFields,
  VehicleOperationFields,
  type OperationFieldState,
} from "@/components/assets/VehicleOperationFields";
import { resolveVehicleAsset, vehicleFieldsFromAsset } from "@/components/assets/VehicleAssetFields";
import { PermissionGate } from "@/guards/ProtectedRoute";
import { formatOperationSummary, operationModeLabel } from "@/lib/operationDisplay";
import { DEFAULT_PER_PAGE } from "@/lib/pagination";
import { usesHourlyOperation } from "@/lib/vehicleOperation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function OperationsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState<"all" | "km" | "hour">("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [operation, setOperation] = useState<OperationFieldState>(emptyOperationFields());

  useEffect(() => {
    setPage(1);
  }, [search, modeFilter]);

  const { data, isLoading } = useQuery({
    queryKey: ["assets", "operations", page, search, modeFilter],
    queryFn: () =>
      listAssets({
        page,
        per_page: DEFAULT_PER_PAGE,
        search: search || undefined,
        status: "active",
        asset_type: "vehicle",
        operation_mode: modeFilter === "all" ? undefined : modeFilter,
      }),
  });

  const vehicles = data?.rows ?? [];
  const total = data?.total ?? 0;

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Asset> }) => updateAsset(id, body),
    onSuccess: () => {
      toast.success("Operation recorded");
      qc.invalidateQueries({ queryKey: ["assets"] });
      setOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openRecord = (asset: Asset) => {
    const vf = vehicleFieldsFromAsset(asset);
    setEditing(asset);
    setOperation({
      operation_mode: vf.operation_mode,
      route_from: vf.route_from,
      route_to: vf.route_to,
      operation_km: vf.operation_km,
      operation_place: vf.operation_place,
      operation_hours: vf.operation_hours,
      operation_minutes: vf.operation_minutes,
    });
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const category = editing.vehicle_category ?? "";
    const resolved = resolveVehicleAsset(
      "vehicle",
      { ...vehicleFieldsFromAsset(editing), ...operation },
      editing.make,
      editing.model
    );
    const hourly = usesHourlyOperation(category, operation.operation_mode);

    if (hourly) {
      if (!resolved.operation_place && !resolved.operation_hours && !resolved.operation_minutes) {
        toast.error("Enter operation place and/or hours");
        return;
      }
    } else if (resolved.route_from || resolved.route_to) {
      if (!resolved.route_from || !resolved.route_to) {
        toast.error("Enter both From and To for the route");
        return;
      }
    }

    updateMut.mutate({
      id: editing.id,
      body: {
        asset_type: editing.asset_type,
        reg_serial_no: editing.reg_serial_no,
        make: editing.make,
        model: editing.model,
        year: editing.year,
        ownership_type: editing.ownership_type,
        status: editing.status,
        location_id: editing.location_id,
        vehicle_category: editing.vehicle_category,
        department: editing.department,
        rta_office: editing.rta_office,
        alert_cell_number: editing.alert_cell_number,
        registration_date: editing.registration_date,
        bluebook_no: editing.bluebook_no,
        bluebook_issued_at: editing.bluebook_issued_at,
        bluebook_expires_at: editing.bluebook_expires_at,
        operation_mode: resolved.operation_mode,
        route_from: resolved.route_from,
        route_to: resolved.route_to,
        operation_km: resolved.operation_km,
        operation_place: resolved.operation_place,
        operation_hours: resolved.operation_hours,
        operation_minutes: resolved.operation_minutes,
        assigned_driver_id: editing.assigned_driver_id,
      },
    });
  };

  const runSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <PageShell
      title="Vehicle operations"
      description="Record route-based trips (From → To + KM) or hourly equipment usage (place + Hr/Min), per VMS operation tracking."
    >
      <FilterRow>
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search reg no. or make"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            className="pl-9"
          />
        </div>
        <Select
          value={modeFilter}
          onValueChange={(v) => {
            setModeFilter(v as typeof modeFilter);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All modes</SelectItem>
            <SelectItem value="km">Route + KM</SelectItem>
            <SelectItem value="hour">Hourly</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="secondary" onClick={runSearch}>
          Search
        </Button>
      </FilterRow>

      <Card>
        <CardContent className="p-0">
          <ResponsiveTable
            scrollMinClass="min-w-[48rem]"
            mobile={
              <MobileCardList className="p-3">
                {isLoading &&
                  Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-lg" />)}
                {!isLoading && vehicles.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">No active vehicles found.</p>
                )}
                {vehicles.map((v) => (
                  <MobileCard
                    key={v.id}
                    title={v.reg_serial_no}
                    subtitle={`${v.make} ${v.model} · ${v.vehicle_category ?? "Vehicle"}`}
                    fields={[
                      { label: "Mode", value: operationModeLabel(v) },
                      { label: "Operation", value: formatOperationSummary(v) },
                      { label: "Site", value: v.location_name ?? "—" },
                    ]}
                    actions={
                      <PermissionGate permission="manage_assets">
                        <Button size="sm" variant="outline" onClick={() => openRecord(v)}>
                          <Pencil className="h-3.5 w-3.5" />
                          Record
                        </Button>
                      </PermissionGate>
                    }
                  />
                ))}
              </MobileCardList>
            }
            desktop={
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Current operation</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="w-[100px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading &&
                    Array.from({ length: DEFAULT_PER_PAGE }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 6 }).map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  {!isLoading && vehicles.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                        No active vehicles found.
                      </TableCell>
                    </TableRow>
                  )}
                  {vehicles.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell>
                        <div className="font-medium">{v.reg_serial_no}</div>
                        <div className="text-xs text-muted-foreground">
                          {v.make} {v.model}
                        </div>
                      </TableCell>
                      <TableCell>{v.vehicle_category ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          <Route className="h-3 w-3" />
                          {operationModeLabel(v)}
                        </Badge>
                      </TableCell>
                      <TableCell className="wrap max-w-[14rem]">{formatOperationSummary(v)}</TableCell>
                      <TableCell>{v.location_name ?? "—"}</TableCell>
                      <TableCell>
                        <PermissionGate permission="manage_assets">
                          <Button size="sm" variant="ghost" onClick={() => openRecord(v)}>
                            <Pencil className="h-4 w-4" />
                            Record
                          </Button>
                        </PermissionGate>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            }
          />
          <PaginationBar
            page={page}
            total={total}
            label="vehicles"
            onPageChange={setPage}
          />
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Record operation</DialogTitle>
            <DialogDescription>
              {editing
                ? `${editing.reg_serial_no} — ${editing.make} ${editing.model}`
                : "Update trip or hourly usage for this vehicle."}
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Category: </span>
                <span className="font-medium">{editing.vehicle_category ?? "—"}</span>
              </div>
              <VehicleOperationFields
                vehicleCategory={editing.vehicle_category ?? ""}
                operation={operation}
                onChange={setOperation}
              />
              <Button type="submit" className="sm:col-span-2" disabled={updateMut.isPending}>
                {updateMut.isPending ? "Saving…" : "Save operation"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
