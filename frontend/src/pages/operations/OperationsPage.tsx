import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Route, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { vehicleFieldsFromAsset } from "@/components/assets/VehicleAssetFields";
import { VEHICLE_CATEGORIES } from "@/data/vehicleCatalog";
import { Label } from "@/components/ui/label";
import { PermissionGate } from "@/guards/ProtectedRoute";
import {
  assetTypeLabel,
  defaultOperationModeForAsset,
  formatAssetTypeDetail,
  matchesOperationModeFilter,
  resolveAssetOperation,
} from "@/lib/assetOperation";
import { formatOperationSummary, operationModeLabel } from "@/lib/operationDisplay";
import { DEFAULT_PER_PAGE } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import { defaultOperationMode, usesHourlyOperation } from "@/lib/vehicleOperation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DIALOG_FORM_FIELD, DIALOG_FORM_FULL, DialogForm } from "@/components/ui/dialog-form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AssetType } from "@/types/domain";

export default function OperationsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | AssetType>("all");
  const [modeFilter, setModeFilter] = useState<"all" | "km" | "hour">("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [editCategory, setEditCategory] = useState("");
  const [operation, setOperation] = useState<OperationFieldState>(emptyOperationFields());

  useEffect(() => {
    setPage(1);
  }, [search, modeFilter, typeFilter]);

  const { data, isLoading } = useQuery({
    queryKey: ["assets", "operations", search, typeFilter],
    queryFn: () =>
      listAssets({
        page: 1,
        per_page: 100,
        search: search || undefined,
        operational_only: true,
        asset_type: typeFilter === "all" ? undefined : typeFilter,
      }),
  });

  const filteredAssets = useMemo(() => {
    const rows = data?.rows ?? [];
    return rows.filter((a) => matchesOperationModeFilter(a, modeFilter));
  }, [data?.rows, modeFilter]);

  const total = filteredAssets.length;
  const assets = useMemo(() => {
    const start = (page - 1) * DEFAULT_PER_PAGE;
    return filteredAssets.slice(start, start + DEFAULT_PER_PAGE);
  }, [filteredAssets, page]);

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
    const category = asset.vehicle_category ?? "";
    setEditing(asset);
    setEditCategory(category);
    setOperation({
      operation_mode: vf.operation_mode || defaultOperationModeForAsset(asset),
      route_from: vf.route_from,
      route_to: vf.route_to,
      operation_km: vf.operation_km,
      operation_place: vf.operation_place,
      operation_hours: vf.operation_hours,
      operation_minutes: vf.operation_minutes,
    });
    setOpen(true);
  };

  const resolvedCategory = (asset: Asset | null) =>
    asset?.vehicle_category?.trim() || editCategory.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;

    if (editing.asset_type === "vehicle") {
      const category = resolvedCategory(editing);
      if (!category) {
        toast.error("Select a vehicle category before saving the operation");
        return;
      }
    }

    const category = resolvedCategory(editing);
    const resolved = resolveAssetOperation(editing, category, operation);
    const hourly =
      editing.asset_type !== "vehicle"
        ? true
        : usesHourlyOperation(category, operation.operation_mode);

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
        vehicle_category: resolved.vehicle_category,
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
      title="Asset operations"
      description="Track how each asset is being used — route trips (From → To + KM) for vehicles, or place + Hr/Min for equipment and tools."
    >
      <FilterRow>
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search reg no., make, or model"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            className="pl-9"
          />
        </div>
        <Select
          value={typeFilter}
          onValueChange={(v) => {
            setTypeFilter(v as typeof typeFilter);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All assets</SelectItem>
            <SelectItem value="vehicle">Vehicles</SelectItem>
            <SelectItem value="equipment">Equipment</SelectItem>
            <SelectItem value="tool">Tools</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={modeFilter}
          onValueChange={(v) => {
            setModeFilter(v as typeof modeFilter);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All modes" />
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
            scrollMinClass="min-w-[52rem]"
            mobile={
              <MobileCardList className="p-3">
                {isLoading &&
                  Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-lg" />)}
                {!isLoading && assets.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">No active assets found.</p>
                )}
                {assets.map((a) => (
                  <MobileCard
                    key={a.id}
                    title={a.reg_serial_no}
                    subtitle={`${a.make} ${a.model} · ${formatAssetTypeDetail(a)}`}
                    fields={[
                      { label: "Type", value: assetTypeLabel(a.asset_type) },
                      { label: "Mode", value: operationModeLabel(a) },
                      { label: "Operation", value: formatOperationSummary(a) },
                      { label: "Site", value: a.location_name ?? "—" },
                    ]}
                    actions={
                      <PermissionGate permission="manage_assets">
                        <Button size="sm" variant="outline" onClick={() => openRecord(a)}>
                          <Pencil className="h-3.5 w-3.5" />
                          {formatOperationSummary(a) === "Not recorded" ? "Add operation" : "Edit"}
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
                    <TableHead>Asset</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Current operation</TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading &&
                    Array.from({ length: DEFAULT_PER_PAGE }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 5 }).map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  {!isLoading && assets.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                        No active assets found.
                      </TableCell>
                    </TableRow>
                  )}
                  {assets.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div className="font-medium">{a.reg_serial_no}</div>
                        <div className="text-xs text-muted-foreground">
                          {a.make} {a.model}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>{assetTypeLabel(a.asset_type)}</div>
                        {a.asset_type === "vehicle" && a.vehicle_category && (
                          <div className="text-xs text-muted-foreground">{a.vehicle_category}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <PermissionGate
                          permission="manage_assets"
                          fallback={
                            <Badge variant="outline" className="gap-1">
                              <Route className="h-3 w-3" />
                              {operationModeLabel(a)}
                            </Badge>
                          }
                        >
                          <button
                            type="button"
                            onClick={() => openRecord(a)}
                            className="inline-flex rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                            title="Set mode and record operation"
                          >
                            <Badge variant="outline" className="cursor-pointer gap-1 hover:bg-muted">
                              <Route className="h-3 w-3" />
                              {operationModeLabel(a)}
                            </Badge>
                          </button>
                        </PermissionGate>
                      </TableCell>
                      <TableCell className="max-w-[16rem]">
                        <PermissionGate
                          permission="manage_assets"
                          fallback={<span className="text-muted-foreground">{formatOperationSummary(a)}</span>}
                        >
                          {formatOperationSummary(a) === "Not recorded" ? (
                            <Button
                              type="button"
                              variant="link"
                              className="h-auto p-0 text-primary"
                              onClick={() => openRecord(a)}
                            >
                              Add operation
                            </Button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openRecord(a)}
                              className="wrap text-left hover:underline"
                              title="Edit operation"
                            >
                              {formatOperationSummary(a)}
                            </button>
                          )}
                        </PermissionGate>
                      </TableCell>
                      <TableCell>{a.location_name ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            }
          />
          <PaginationBar page={page} total={total} label="assets" onPageChange={setPage} />
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing && formatOperationSummary(editing) === "Not recorded"
                ? "Add operation"
                : "Record operation"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Set how this asset is being operated and save the current usage."
                : "Update trip or hourly usage for this asset."}
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <DialogForm onSubmit={handleSubmit} className="overflow-visible desktop:grid-cols-4">
              <div className={cn(DIALOG_FORM_FIELD, DIALOG_FORM_FULL, "rounded-lg border bg-muted/30 px-3 py-3 text-sm")}>
                <div className="font-medium">
                  {editing.reg_serial_no} — {editing.make} {editing.model}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
                  <span>Type: {assetTypeLabel(editing.asset_type)}</span>
                  {editing.asset_type === "vehicle" && editing.vehicle_category && (
                    <span>Category: {editing.vehicle_category}</span>
                  )}
                  <span>Site: {editing.location_name ?? "—"}</span>
                </div>
              </div>

              {editing.asset_type === "vehicle" && !editing.vehicle_category ? (
                <>
                  <div className={DIALOG_FORM_FIELD}>
                    <Label>Vehicle category *</Label>
                    <Select
                      value={editCategory || undefined}
                      onValueChange={(v) => {
                        setEditCategory(v);
                        setOperation((prev) => ({
                          ...emptyOperationFields(),
                          operation_mode: defaultOperationMode(v),
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category (e.g. Truck, Dozer)" />
                      </SelectTrigger>
                      <SelectContent>
                        {VEHICLE_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className={cn(DIALOG_FORM_FIELD, "sm:col-span-2 flex items-end pb-2")}>
                    <p className="text-xs text-muted-foreground">
                      Required for vehicles before recording route or hourly operation.
                    </p>
                  </div>
                </>
              ) : null}

              <VehicleOperationFields
                assetType={editing.asset_type}
                vehicleCategory={resolvedCategory(editing)}
                operation={operation}
                onChange={setOperation}
              />
              <Button type="submit" className={DIALOG_FORM_FULL} disabled={updateMut.isPending}>
                {updateMut.isPending ? "Saving…" : "Save operation"}
              </Button>
            </DialogForm>
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
