import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { createAsset, deleteAsset, listAssets, updateAsset, type Asset } from "@/api/assets";
import { listLocations } from "@/api/locations";
import { FilterRow, PageShell } from "@/components/layout/page-shell";
import { PaginationBar } from "@/components/layout/pagination-bar";
import { DEFAULT_PER_PAGE } from "@/lib/pagination";
import { MobileCard, MobileCardList } from "@/components/layout/mobile-card";
import { ResponsiveTable } from "@/components/layout/responsive-table";
import { AssetStatusBadge } from "@/components/shared/status-badges";
import { PermissionGate } from "@/guards/ProtectedRoute";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ASSET_REGISTER_DENSITY,
  ASSET_REGISTER_FORM,
  DIALOG_FORM_FIELD_COMPACT,
  DIALOG_FORM_ROW,
  DialogForm,
} from "@/components/ui/dialog-form";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectEmpty, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AssetStatus, AssetType, OwnershipType } from "@/types/domain";
import { VehicleCategoryPicker } from "@/components/assets/VehicleCategoryPicker";
import {
  emptyVehicleFields,
  resolveVehicleAsset,
  vehicleFieldsFromAsset,
  VehicleAssetFields,
  type VehicleFieldState,
} from "@/components/assets/VehicleAssetFields";
import type { OperationMode } from "@/lib/vehicleOperation";
import { useOperationModes } from "@/hooks/useOperationModes";
import { useVehicleCategories } from "@/hooks/useVehicleCategories";
import {
  defaultOperationModePick,
  isHourlyFromOperationPick,
  OPERATION_MODE_OTHER,
} from "@/lib/operationModeCatalog";
import { VEHICLE_CATEGORY_OTHER } from "@/lib/vehicleCategory";
import { VEHICLE_DEPARTMENT_OTHER } from "@/lib/vehicleDepartment";

type FormState = {
  asset_type: AssetType;
  reg_serial_no: string;
  make: string;
  model: string;
  year: string;
  ownership_type: OwnershipType;
  status: AssetStatus;
  location_id: string;
  vehicle: VehicleFieldState;
};

const emptyForm = (): FormState => ({
  asset_type: "vehicle",
  reg_serial_no: "",
  make: "",
  model: "",
  year: String(new Date().getFullYear()),
  ownership_type: "owned",
  status: "active",
  location_id: "",
  vehicle: emptyVehicleFields(),
});

function assetToForm(a: Asset): FormState {
  return {
    asset_type: a.asset_type,
    reg_serial_no: a.reg_serial_no,
    make: a.make,
    model: a.model,
    year: String(a.year),
    ownership_type: a.ownership_type,
    status: a.status,
    location_id: a.location_id,
    vehicle: a.asset_type === "vehicle" ? vehicleFieldsFromAsset(a) : emptyVehicleFields(),
  };
}

export default function AssetsPage() {
  const qc = useQueryClient();
  const { catalog } = useVehicleCategories();
  const { catalog: operationCatalog } = useOperationModes();
  const [page, setPage] = useState(1);
  const perPage = DEFAULT_PER_PAGE;
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => setPage(1), [search]);

  const { data, isLoading } = useQuery({
    queryKey: ["assets", page, search],
    queryFn: () => listAssets({ page, per_page: perPage, search: search || undefined }),
  });
  const { data: locations = [] } = useQuery({ queryKey: ["locations"], queryFn: listLocations });

  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null);

  const locationName = useMemo(
    () => locations.find((l) => l.id === form.location_id)?.name,
    [locations, form.location_id]
  );

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const createMut = useMutation({
    mutationFn: createAsset,
    onSuccess: () => {
      toast.success("Asset registered");
      qc.invalidateQueries({ queryKey: ["assets"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setModal(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Asset> }) => updateAsset(id, body),
    onSuccess: () => {
      toast.success("Asset updated");
      qc.invalidateQueries({ queryKey: ["assets"] });
      setModal(null);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: deleteAsset,
    onSuccess: () => {
      toast.success("Asset decommissioned");
      qc.invalidateQueries({ queryKey: ["assets"] });
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setModal("create");
  };

  const openEdit = (a: Asset) => {
    setEditing(a);
    setForm(assetToForm(a));
    setModal("edit");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const resolved = resolveVehicleAsset(
      form.asset_type,
      form.vehicle,
      form.make,
      form.model,
      catalog,
      operationCatalog
    );
    if (form.asset_type === "vehicle") {
      if (!resolved.vehicle_category) {
        toast.error("Select a vehicle category (Car, Bus, Truck, etc.)");
        return;
      }
      if (resolved.vehicle_category === VEHICLE_CATEGORY_OTHER) {
        toast.error("Choose Other to add a custom category, or pick an existing one");
        return;
      }
      if (!resolved.make || !resolved.model) {
        toast.error("Select or enter manufacturer and model");
        return;
      }
      if (!resolved.department) {
        toast.error("Select a department");
        return;
      }
      if (resolved.department === VEHICLE_DEPARTMENT_OTHER) {
        toast.error("Choose Other to add a custom department, or pick an existing one");
        return;
      }
      const pick =
        form.vehicle.operation_mode_pick ||
        defaultOperationModePick(resolved.vehicle_category ?? "", catalog);
      if (pick === OPERATION_MODE_OTHER || !pick.trim()) {
        toast.error("Choose Other to add a custom operation mode, or pick an existing one");
        return;
      }
      const hourly = isHourlyFromOperationPick(
        pick,
        form.vehicle.operation_mode,
        resolved.vehicle_category ?? "",
        catalog,
        operationCatalog
      );
      if (resolved.operation_mode === "custom") {
        const filled = Object.keys(resolved.operation_custom_fields ?? {}).length > 0;
        if (!filled && (resolved.route_from || resolved.route_to || resolved.operation_place)) {
          toast.error("Fill in the custom operation fields for this mode");
          return;
        }
      } else if (hourly) {
        if (!resolved.operation_place && !resolved.operation_hours && !resolved.operation_minutes) {
          toast.error("Enter operation place and/or hours for hourly equipment");
          return;
        }
      } else if (resolved.route_from || resolved.route_to) {
        if (!resolved.route_from || !resolved.route_to) {
          toast.error("Enter both From and To for the operation route");
          return;
        }
      }
    }
    const body = {
      asset_type: form.asset_type,
      reg_serial_no: form.reg_serial_no,
      make: resolved.make,
      model: resolved.model,
      year: parseInt(form.year, 10) || new Date().getFullYear(),
      ownership_type: form.ownership_type,
      status: form.status,
      location_id: form.location_id,
      vehicle_category: resolved.vehicle_category,
      department: resolved.department,
      rta_office: resolved.rta_office,
      alert_cell_number: resolved.alert_cell_number,
      registration_date: resolved.registration_date,
      bluebook_no: resolved.bluebook_no,
      bluebook_issued_at: resolved.bluebook_issued_at,
      bluebook_expires_at: resolved.bluebook_expires_at,
      operation_mode: resolved.operation_mode,
      operation_mode_label: resolved.operation_mode_label,
      operation_custom_fields: resolved.operation_custom_fields,
      route_from: resolved.route_from,
      route_to: resolved.route_to,
      operation_km: resolved.operation_km,
      operation_place: resolved.operation_place,
      operation_hours: resolved.operation_hours,
      operation_minutes: resolved.operation_minutes,
      assigned_driver_id: editing?.assigned_driver_id ?? null,
    };
    if (modal === "create") createMut.mutate(body as Parameters<typeof createAsset>[0]);
    else if (editing) updateMut.mutate({ id: editing.id, body });
  };

  const total = data?.total ?? 0;
  const saving = createMut.isPending || updateMut.isPending;

  return (
    <PageShell
      title="Assets & Fleet"
      description="Register and track vehicles, equipment, and tools across construction sites."
      actions={
        <PermissionGate permission="manage_assets">
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New asset
          </Button>
        </PermissionGate>
      }
    >
      <FilterRow>
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search reg no, make, model"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setSearch(searchInput)}
            className="w-full pl-9"
          />
        </div>
        <Button
          variant="secondary"
          className="w-full sm:w-auto"
          onClick={() => {
            setSearch(searchInput);
            setPage(1);
          }}
        >
          Search
        </Button>
      </FilterRow>

      {modal !== null && locationName && (
        <p className="text-sm text-muted-foreground">Location: {locationName}</p>
      )}

      <Card>
        <CardContent className="p-0">
          <ResponsiveTable
            scrollMinClass="min-w-[48rem]"
            mobile={
              <MobileCardList className="p-3">
                {isLoading &&
                  Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-lg" />)}
                {!isLoading && (data?.rows ?? []).length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">No assets found.</p>
                )}
                {!isLoading &&
                  (data?.rows ?? []).map((r) => (
                    <MobileCard
                      key={r.id}
                      title={r.reg_serial_no}
                      subtitle={`${r.make} ${r.model}`}
                      fields={[
                        { label: "Type", value: r.asset_type },
                        { label: "Location", value: r.location_name ?? "—" },
                        { label: "Status", value: <AssetStatusBadge status={r.status} /> },
                      ]}
                      actions={
                        <PermissionGate permission="manage_assets">
                          <>
                            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => openEdit(r)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-destructive"
                              onClick={() => setDeleteTarget(r)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
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
                    <TableHead>Reg / Serial</TableHead>
                    <TableHead>Make & Model</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading &&
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 6 }).map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  {!isLoading && (data?.rows ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                        No assets found.
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading &&
                    (data?.rows ?? []).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-sm">{r.reg_serial_no}</TableCell>
                        <TableCell>
                          {r.make} {r.model} ({r.year})
                        </TableCell>
                        <TableCell className="capitalize">
                          {r.asset_type === "vehicle" && r.vehicle_category
                            ? `${r.vehicle_category} · vehicle`
                            : r.asset_type}
                        </TableCell>
                        <TableCell>{r.location_name}</TableCell>
                        <TableCell>
                          <AssetStatusBadge status={r.status} />
                        </TableCell>
                        <TableCell>
                          <PermissionGate permission="manage_assets">
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setDeleteTarget(r)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </PermissionGate>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            }
          />
          <PaginationBar page={page} total={total} label="assets" onPageChange={setPage} />
        </CardContent>
      </Card>

      <Dialog open={modal !== null} onOpenChange={(o) => !o && (setModal(null), setEditing(null))}>
        <DialogContent className="gap-2 p-3 sm:max-w-6xl sm:p-4 lg:max-w-7xl">
          <DialogHeader className="space-y-0.5 pr-8">
            <DialogTitle className="text-base">{modal === "edit" ? "Edit asset" : "Register asset"}</DialogTitle>
            <DialogDescription className="sr-only">
              {form.asset_type === "vehicle"
                ? "Vehicle registry form"
                : "Asset registration form"}
            </DialogDescription>
          </DialogHeader>
          <DialogForm
            onSubmit={handleSubmit}
            className={cn(ASSET_REGISTER_FORM, ASSET_REGISTER_DENSITY)}
          >
            <div className={DIALOG_FORM_ROW}>
              <div className={DIALOG_FORM_FIELD_COMPACT}>
                <Label>Asset type</Label>
                <Select
                  value={form.asset_type}
                  onValueChange={(v) => {
                    const next = v as AssetType;
                    setForm((f) => ({
                      ...f,
                      asset_type: next,
                      vehicle: next === "vehicle" ? f.vehicle : emptyVehicleFields(),
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vehicle">Vehicle</SelectItem>
                    <SelectItem value="equipment">Equipment</SelectItem>
                    <SelectItem value="tool">Tool</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className={DIALOG_FORM_FIELD_COMPACT}>
                <Label>Reg / Serial</Label>
                <Input
                  value={form.reg_serial_no}
                  onChange={(e) => setField("reg_serial_no", e.target.value)}
                  required
                />
              </div>
              {form.asset_type === "vehicle" ? (
                <VehicleCategoryPicker
                  value={form.vehicle.vehicle_category}
                  onCategoryChange={(name, _meta, defaultMode: OperationMode) => {
                    const modePick = defaultOperationModePick(name, catalog);
                    setForm((f) => ({
                      ...f,
                      vehicle: {
                        ...f.vehicle,
                        vehicle_category: name,
                        operation_mode: defaultMode,
                        operation_mode_pick: modePick,
                        operation_mode_label: null,
                        operation_custom_fields: {},
                        route_from: "",
                        route_to: "",
                        operation_km: "",
                        operation_place: "",
                        operation_hours: "",
                        operation_minutes: "",
                      },
                    }));
                  }}
                  showDropdownIcon
                  hideHint
                  required
                />
              ) : null}
            </div>

            {form.asset_type === "vehicle" ? (
              <VehicleAssetFields
                compact
                year={form.year}
                onYearChange={(year) => setField("year", year)}
                vehicle={form.vehicle}
                onChange={(vehicle) => setForm((f) => ({ ...f, vehicle }))}
              />
            ) : (
              <>
                <div className={DIALOG_FORM_FIELD_COMPACT}>
                  <Label>Make</Label>
                  <Input value={form.make} onChange={(e) => setField("make", e.target.value)} required />
                </div>
                <div className={DIALOG_FORM_FIELD_COMPACT}>
                  <Label>Model</Label>
                  <Input value={form.model} onChange={(e) => setField("model", e.target.value)} required />
                </div>
              </>
            )}

            <div className={DIALOG_FORM_ROW}>
              {form.asset_type !== "vehicle" ? (
                <div className={DIALOG_FORM_FIELD_COMPACT}>
                  <Label>Year</Label>
                  <Input type="number" value={form.year} onChange={(e) => setField("year", e.target.value)} required />
                </div>
              ) : null}
              <div className={DIALOG_FORM_FIELD_COMPACT}>
                <Label>Ownership</Label>
                <Select value={form.ownership_type} onValueChange={(v) => setField("ownership_type", v as OwnershipType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owned">Owned</SelectItem>
                    <SelectItem value="leased">Leased</SelectItem>
                    <SelectItem value="rented">Rented</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className={DIALOG_FORM_FIELD_COMPACT}>
                <Label>Work location</Label>
                <Select value={form.location_id || undefined} onValueChange={(v) => setField("location_id", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Location" />
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
              {modal === "edit" ? (
                <div className={DIALOG_FORM_FIELD_COMPACT}>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setField("status", v as AssetStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="in_repair">In repair</SelectItem>
                      <SelectItem value="in_transit">In transit</SelectItem>
                      <SelectItem value="decommissioned">Decommissioned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className={cn(DIALOG_FORM_FIELD_COMPACT, "flex items-end")}>
                  <Button type="submit" className="h-8 w-full text-xs" disabled={saving}>
                    {saving ? "Saving…" : "Save"}
                  </Button>
                </div>
              )}
            </div>
            {modal === "edit" ? (
              <Button type="submit" className="col-span-full h-8 text-xs sm:ml-auto sm:w-32" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            ) : null}
          </DialogForm>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decommission asset?</AlertDialogTitle>
            <AlertDialogDescription>
              This marks <strong>{deleteTarget?.reg_serial_no}</strong> as decommissioned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && delMut.mutate(deleteTarget.id)}
            >
              Decommission
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
