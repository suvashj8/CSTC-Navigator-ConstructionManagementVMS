import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableAutocomplete } from "@/components/ui/searchable-autocomplete";
import {
  filterOptionsByQuery,
  filterRtaOfficesByQuery,
  VEHICLE_DEPARTMENTS,
} from "@/data/nepalTransportOffices";
import {
  VEHICLE_CATEGORIES,
  VEHICLE_MAKES,
  modelsForMake,
} from "@/data/vehicleCatalog";
import type { Asset } from "@/types/domain";
import { defaultOperationMode, type OperationMode, usesHourlyOperation } from "@/lib/vehicleOperation";
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
  route_from: string | null;
  route_to: string | null;
  operation_km: number | null;
  operation_place: string | null;
  operation_hours: number | null;
  operation_minutes: number | null;
};

export function resolveVehicleAsset(
  assetType: string,
  vehicle: VehicleFieldState,
  plainMake: string,
  plainModel: string
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
      route_from: null,
      route_to: null,
      operation_km: null,
      operation_place: null,
      operation_hours: null,
      operation_minutes: null,
    };
  }
  const opt = (s: string) => {
    const t = s.trim();
    return t || null;
  };
  const hourly = usesHourlyOperation(vehicle.vehicle_category, vehicle.operation_mode);
  const mode: OperationMode = hourly ? "hour" : "km";
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
    operation_mode: mode,
    route_from: hourly ? null : opt(vehicle.route_from),
    route_to: hourly ? null : opt(vehicle.route_to),
    operation_km: hourly ? null : parseNum(vehicle.operation_km),
    operation_place: hourly ? opt(vehicle.operation_place) : null,
    operation_hours: hourly ? parseIntOpt(vehicle.operation_hours) : null,
    operation_minutes: hourly ? parseIntOpt(vehicle.operation_minutes) : null,
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
    route_from: a.route_from ?? "",
    route_to: a.route_to ?? "",
    operation_km: a.operation_km != null ? String(a.operation_km) : "",
    operation_place: a.operation_place ?? "",
    operation_hours: a.operation_hours != null ? String(a.operation_hours) : "",
    operation_minutes: a.operation_minutes != null ? String(a.operation_minutes) : "",
  };
}

type Props = {
  vehicle: VehicleFieldState;
  onChange: (next: VehicleFieldState) => void;
};

export function VehicleAssetFields({ vehicle, onChange }: Props) {
  const set = <K extends keyof VehicleFieldState>(key: K, value: VehicleFieldState[K]) =>
    onChange({ ...vehicle, [key]: value });

  const modelOptions = modelsForMake(
    VEHICLE_MAKES.find((m) => m.toLowerCase() === vehicle.makeInput.trim().toLowerCase()) ??
      vehicle.makeInput.trim()
  );

  return (
    <>
      <div className="space-y-2 sm:col-span-2">
        <Label>Vehicle category</Label>
        <Select
          value={vehicle.vehicle_category || undefined}
          onValueChange={(v) => {
            const mode = defaultOperationMode(v);
            onChange({
              ...vehicle,
              vehicle_category: v,
              operation_mode: mode,
              route_from: "",
              route_to: "",
              operation_km: "",
              operation_place: "",
              operation_hours: "",
              operation_minutes: "",
            });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select category (Car, Bus, Truck…)" />
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

      <div className="space-y-2">
        <Label>Manufacturer (Make)</Label>
        <SearchableAutocomplete
          value={vehicle.makeInput}
          onChange={(v) => onChange({ ...vehicle, makeInput: v, modelInput: "" })}
          options={VEHICLE_MAKES}
          placeholder="Type e.g. D for Daewoo, Datsun, Dodge…"
          filterFn={filterOptionsByQuery}
          onPick={(v) => onChange({ ...vehicle, makeInput: v, modelInput: "" })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Model</Label>
        <SearchableAutocomplete
          value={vehicle.modelInput}
          onChange={(v) => set("modelInput", v)}
          options={modelOptions.length > 0 ? modelOptions : []}
          placeholder={modelOptions.length ? "Type to search models…" : "e.g. Hilux, Prima"}
          filterFn={filterOptionsByQuery}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Department</Label>
        <Select value={vehicle.department || undefined} onValueChange={(v) => set("department", v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select department" />
          </SelectTrigger>
          <SelectContent>
            {VEHICLE_DEPARTMENTS.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>RTA / Yatayat office</Label>
        <SearchableAutocomplete
          value={vehicle.rta_office}
          onChange={(v) => set("rta_office", v)}
          options={[]}
          placeholder="Type e.g. K for Kathmandu, Koshi…"
          filterFn={(_, q, limit) => filterRtaOfficesByQuery(q, limit)}
          maxSuggestions={18}
        />
      </div>

      <div className="space-y-2">
        <Label>Registration date</Label>
        <Input
          type="date"
          value={vehicle.registration_date}
          onChange={(e) => set("registration_date", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Alert cell number</Label>
        <Input
          type="tel"
          inputMode="tel"
          placeholder="SMS alert mobile number"
          value={vehicle.alert_cell_number}
          onChange={(e) => set("alert_cell_number", e.target.value)}
        />
      </div>

      <div className="space-y-2 sm:col-span-2 border-t pt-4">
        <p className="text-sm font-medium">Bluebook (vehicle registration)</p>
        <p className="text-xs text-muted-foreground">
          Nepal vehicle registration book — expiry feeds compliance alerts.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Bluebook no.</Label>
        <Input
          placeholder="Optional"
          value={vehicle.bluebook_no}
          onChange={(e) => set("bluebook_no", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Bluebook issued</Label>
        <Input
          type="date"
          value={vehicle.bluebook_issued_at}
          onChange={(e) => set("bluebook_issued_at", e.target.value)}
        />
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label>Bluebook expires</Label>
        <Input
          type="date"
          value={vehicle.bluebook_expires_at}
          onChange={(e) => set("bluebook_expires_at", e.target.value)}
        />
      </div>

      <VehicleOperationFields
        vehicleCategory={vehicle.vehicle_category}
        operation={{
          operation_mode: vehicle.operation_mode,
          route_from: vehicle.route_from,
          route_to: vehicle.route_to,
          operation_km: vehicle.operation_km,
          operation_place: vehicle.operation_place,
          operation_hours: vehicle.operation_hours,
          operation_minutes: vehicle.operation_minutes,
        }}
        onChange={(op) => onChange({ ...vehicle, ...op })}
      />
    </>
  );
}
