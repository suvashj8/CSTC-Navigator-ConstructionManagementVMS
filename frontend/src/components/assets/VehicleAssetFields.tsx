import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SearchableAutocomplete } from "@/components/ui/searchable-autocomplete";
import { filterOptionsByQuery, filterRtaOfficesByQuery } from "@/data/nepalTransportOffices";
import { VehicleDepartmentPicker } from "@/components/assets/VehicleDepartmentPicker";
import { VEHICLE_MAKES, modelsForMake } from "@/data/vehicleCatalog";
import { useVehicleCategories } from "@/hooks/useVehicleCategories";
import {
  defaultOperationModePick,
  isDynamicCustomMode,
  isHourlyFromOperationPick,
  operationModePickFromAsset,
  resolveOperationFromPick,
} from "@/lib/operationModeCatalog";
import type { VehicleCategoryMeta } from "@/lib/vehicleCategory";
import type { OperationModeMeta } from "@/lib/operationModeCatalog";
import type { VehicleDepartmentMeta } from "@/lib/vehicleDepartment";
import type { Asset } from "@/types/domain";
import {
  DIALOG_FORM_FIELD,
  DIALOG_FORM_FIELD_COMPACT,
  DIALOG_FORM_FULL,
  DIALOG_FORM_ROW,
} from "@/components/ui/dialog-form";
import { defaultOperationMode, type OperationMode } from "@/lib/vehicleOperation";
import { cn } from "@/lib/utils";
import {
  emptyOperationFields,
  VehicleOperationFields,
  type OperationFieldState,
} from "@/components/assets/VehicleOperationFields";

export type { OperationFieldState };

export type VehicleFieldState = {
  vehicle_category: string;
  makeInput: string;
  modelInput: string;
  department: string;
  rta_office: string;
  alert_cell_number: string;
  registration_date: string;
  bluebook_no: string;
  bluebook_issued_at: string;
  bluebook_expires_at: string;
} & OperationFieldState;

export const emptyVehicleFields = (): VehicleFieldState => ({
  vehicle_category: "",
  makeInput: "",
  modelInput: "",
  department: "",
  rta_office: "",
  alert_cell_number: "",
  registration_date: "",
  bluebook_no: "",
  bluebook_issued_at: "",
  bluebook_expires_at: "",
  ...emptyOperationFields(),
});

export type ResolvedVehicle = {
  make: string;
  model: string;
  vehicle_category: string | null;
  department: string | null;
  rta_office: string | null;
  alert_cell_number: string | null;
  registration_date: string | null;
  bluebook_no: string | null;
  bluebook_issued_at: string | null;
  bluebook_expires_at: string | null;
  operation_mode: OperationMode | null;
  operation_mode_label: string | null;
  route_from: string | null;
  route_to: string | null;
  operation_km: number | null;
  operation_place: string | null;
  operation_hours: number | null;
  operation_minutes: number | null;
  operation_custom_fields: Record<string, string> | null;
};

export function resolveVehicleAsset(
  assetType: string,
  vehicle: VehicleFieldState,
  plainMake: string,
  plainModel: string,
  categoryCatalog: VehicleCategoryMeta[] = [],
  operationCatalog: import("@/lib/operationModeCatalog").OperationModeMeta[] = []
): ResolvedVehicle {
  if (assetType !== "vehicle") {
    return {
      make: plainMake.trim(),
      model: plainModel.trim(),
      vehicle_category: null,
      department: null,
      rta_office: null,
      alert_cell_number: null,
      registration_date: null,
      bluebook_no: null,
      bluebook_issued_at: null,
      bluebook_expires_at: null,
      operation_mode: null,
      operation_mode_label: null,
      route_from: null,
      route_to: null,
      operation_km: null,
      operation_place: null,
      operation_hours: null,
      operation_minutes: null,
      operation_custom_fields: null,
    };
  }
  const opt = (s: string) => {
    const t = s.trim();
    return t || null;
  };
  const pick =
    vehicle.operation_mode_pick ||
    defaultOperationModePick(vehicle.vehicle_category, categoryCatalog);
  const hourly = isHourlyFromOperationPick(
    pick,
    vehicle.operation_mode ?? "km",
    vehicle.vehicle_category,
    categoryCatalog,
    operationCatalog
  );
  const { mode, label } = resolveOperationFromPick(pick, operationCatalog);
  const customDynamic = isDynamicCustomMode(pick, operationCatalog);
  const parseNum = (s: string) => {
    const t = s.trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  };
  const parseIntOpt = (s: string) => {
    const t = s.trim();
    if (!t) return null;
    const n = parseInt(t, 10);
    return Number.isFinite(n) ? n : null;
  };
  return {
    make: vehicle.makeInput.trim(),
    model: vehicle.modelInput.trim(),
    vehicle_category: opt(vehicle.vehicle_category),
    department: opt(vehicle.department),
    rta_office: opt(vehicle.rta_office),
    alert_cell_number: opt(vehicle.alert_cell_number),
    registration_date: opt(vehicle.registration_date),
    bluebook_no: opt(vehicle.bluebook_no),
    bluebook_issued_at: opt(vehicle.bluebook_issued_at),
    bluebook_expires_at: opt(vehicle.bluebook_expires_at),
    operation_mode: customDynamic ? "custom" : hourly ? "hour" : mode,
    operation_mode_label: label,
    route_from: customDynamic || hourly ? null : opt(vehicle.route_from),
    route_to: customDynamic || hourly ? null : opt(vehicle.route_to),
    operation_km: customDynamic || hourly ? null : parseNum(vehicle.operation_km),
    operation_place: customDynamic || !hourly ? null : opt(vehicle.operation_place),
    operation_hours: customDynamic || !hourly ? null : parseIntOpt(vehicle.operation_hours),
    operation_minutes: customDynamic || !hourly ? null : parseIntOpt(vehicle.operation_minutes),
    operation_custom_fields: customDynamic
      ? Object.fromEntries(
          Object.entries(vehicle.operation_custom_fields)
            .map(([k, v]) => [k, v.trim()] as const)
            .filter(([, v]) => v)
        )
      : null,
  };
}

export function vehicleFieldsFromAsset(a: Asset): VehicleFieldState {
  return {
    vehicle_category: a.vehicle_category ?? "",
    makeInput: a.make ?? "",
    modelInput: a.model ?? "",
    department: a.department ?? "",
    rta_office: a.rta_office ?? "",
    alert_cell_number: a.alert_cell_number ?? "",
    registration_date: a.registration_date ?? "",
    bluebook_no: a.bluebook_no ?? "",
    bluebook_issued_at: a.bluebook_issued_at ?? "",
    bluebook_expires_at: a.bluebook_expires_at ?? "",
    operation_mode: (a.operation_mode as OperationMode) ?? defaultOperationMode(a.vehicle_category ?? ""),
    operation_mode_pick: operationModePickFromAsset(
      a.operation_mode,
      a.operation_mode_label,
      a.vehicle_category ?? "",
      []
    ),
    operation_mode_label: a.operation_mode_label ?? null,
    route_from: a.route_from ?? "",
    route_to: a.route_to ?? "",
    operation_km: a.operation_km != null ? String(a.operation_km) : "",
    operation_place: a.operation_place ?? "",
    operation_hours: a.operation_hours != null ? String(a.operation_hours) : "",
    operation_minutes: a.operation_minutes != null ? String(a.operation_minutes) : "",
    operation_custom_fields: (a.operation_custom_fields as Record<string, string> | undefined) ?? {},
  };
}

type Props = {
  vehicle: VehicleFieldState;
  onChange: (next: VehicleFieldState) => void;
  compact?: boolean;
  year?: string;
  onYearChange?: (year: string) => void;
  categoryCatalog?: VehicleCategoryMeta[];
  departmentCatalog?: VehicleDepartmentMeta[];
  departmentNames?: string[];
  operationCatalog?: OperationModeMeta[];
};

export function VehicleAssetFields({
  vehicle,
  onChange,
  compact = false,
  year,
  onYearChange,
  categoryCatalog: catalogProp,
  departmentCatalog,
  departmentNames,
  operationCatalog,
}: Props) {
  const field = compact ? DIALOG_FORM_FIELD_COMPACT : DIALOG_FORM_FIELD;
  const { catalog: hookCatalog } = useVehicleCategories(catalogProp === undefined);
  const catalog = catalogProp ?? hookCatalog;
  const set = <K extends keyof VehicleFieldState>(key: K, value: VehicleFieldState[K]) =>
    onChange({ ...vehicle, [key]: value });

  const modelOptions = modelsForMake(
    VEHICLE_MAKES.find((m) => m.toLowerCase() === vehicle.makeInput.trim().toLowerCase()) ??
      vehicle.makeInput.trim()
  );

  return (
    <>
      <div className={field}>
        <Label>Make</Label>
        <SearchableAutocomplete
          value={vehicle.makeInput}
          onChange={(v) => onChange({ ...vehicle, makeInput: v, modelInput: "" })}
          options={VEHICLE_MAKES}
          placeholder={compact ? "" : "Type e.g. D for Daewoo, Datsun, Dodge…"}
          filterFn={filterOptionsByQuery}
          onPick={(v) => onChange({ ...vehicle, makeInput: v, modelInput: "" })}
          required
        />
      </div>

      <div className={field}>
        <Label>Model</Label>
        <SearchableAutocomplete
          value={vehicle.modelInput}
          onChange={(v) => set("modelInput", v)}
          onPick={(v) => set("modelInput", v)}
          options={modelOptions.length > 0 ? modelOptions : []}
          placeholder={compact ? "" : modelOptions.length ? "Type to search models…" : "e.g. Hilux, Prima"}
          filterFn={filterOptionsByQuery}
          required
        />
      </div>

      {compact && year != null && onYearChange ? (
        <div className={field}>
          <Label>Year</Label>
          <Input type="number" value={year} onChange={(e) => onYearChange(e.target.value)} required />
        </div>
      ) : null}

      <div className={field}>
        <Label>Reg. date</Label>
        <Input
          type="date"
          value={vehicle.registration_date}
          onChange={(e) => set("registration_date", e.target.value)}
        />
      </div>

      <div className={field}>
        <Label>Alert mobile</Label>
        <Input
          type="tel"
          inputMode="tel"
          placeholder={compact ? "" : "SMS alert mobile number"}
          value={vehicle.alert_cell_number}
          onChange={(e) => set("alert_cell_number", e.target.value)}
        />
      </div>

      <div className={cn(DIALOG_FORM_ROW, compact ? "lg:grid-cols-2" : "")}>
        <VehicleDepartmentPicker
          value={vehicle.department}
          onChange={(name) => set("department", name)}
          showDropdownIcon
          hideHint
          required
          className={field}
          departmentCatalog={departmentCatalog}
          departmentNames={departmentNames}
        />
        <div className={field}>
          <Label>RTA office</Label>
          <SearchableAutocomplete
            value={vehicle.rta_office}
            onChange={(v) => set("rta_office", v)}
            options={[]}
            placeholder={compact ? "" : "Type e.g. K for Kathmandu, Koshi…"}
            filterFn={(_, q, limit) => filterRtaOfficesByQuery(q, limit)}
            maxSuggestions={18}
          />
        </div>
      </div>

      {!compact ? (
        <div className={cn(DIALOG_FORM_FULL, "border-t pt-4")}>
          <p className="text-sm font-medium">Bluebook (vehicle registration)</p>
          <p className="text-xs text-muted-foreground">
            Nepal vehicle registration book — expiry feeds compliance alerts.
          </p>
        </div>
      ) : (
        <div className={cn(DIALOG_FORM_FULL, "border-t border-border/60 pt-1.5")}>
          <p className="text-[11px] font-medium text-muted-foreground">Bluebook</p>
        </div>
      )}

      <div className={field}>
        <Label>Bluebook no.</Label>
        <Input
          placeholder={compact ? "" : "Optional"}
          value={vehicle.bluebook_no}
          onChange={(e) => set("bluebook_no", e.target.value)}
        />
      </div>

      <div className={field}>
        <Label>Issued</Label>
        <Input
          type="date"
          value={vehicle.bluebook_issued_at}
          onChange={(e) => set("bluebook_issued_at", e.target.value)}
        />
      </div>

      <div className={field}>
        <Label>Expires</Label>
        <Input
          type="date"
          value={vehicle.bluebook_expires_at}
          onChange={(e) => set("bluebook_expires_at", e.target.value)}
        />
      </div>

      <VehicleOperationFields
        compact={compact}
        vehicleCategory={vehicle.vehicle_category}
        categoryCatalog={catalog}
        operationCatalog={operationCatalog}
        operation={{
          operation_mode: vehicle.operation_mode ?? "km",
          operation_mode_pick: vehicle.operation_mode_pick,
          operation_mode_label: vehicle.operation_mode_label,
          route_from: vehicle.route_from,
          route_to: vehicle.route_to,
          operation_km: vehicle.operation_km,
          operation_place: vehicle.operation_place,
          operation_hours: vehicle.operation_hours,
          operation_minutes: vehicle.operation_minutes,
          operation_custom_fields: vehicle.operation_custom_fields,
        }}
        onChange={(op) => onChange({ ...vehicle, ...op })}
      />
    </>
  );
}
