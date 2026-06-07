import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableAutocomplete } from "@/components/ui/searchable-autocomplete";
import { filterNepalPlacesByPrefix } from "@/data/nepalPlaces";
import {
  canChooseOperationMode,
  type OperationMode,
  usesHourlyOperation,
} from "@/lib/vehicleOperation";

export type OperationFieldState = {
  operation_mode: OperationMode;
  route_from: string;
  route_to: string;
  operation_km: string;
  operation_place: string;
  operation_hours: string;
  operation_minutes: string;
};

export const emptyOperationFields = (): OperationFieldState => ({
  operation_mode: "km",
  route_from: "",
  route_to: "",
  operation_km: "",
  operation_place: "",
  operation_hours: "",
  operation_minutes: "",
});

type Props = {
  vehicleCategory: string;
  operation: OperationFieldState;
  onChange: (next: OperationFieldState) => void;
};

export function VehicleOperationFields({ vehicleCategory, operation, onChange }: Props) {
  if (!vehicleCategory) return null;

  const hourly = usesHourlyOperation(vehicleCategory, operation.operation_mode);
  const set = <K extends keyof OperationFieldState>(key: K, value: OperationFieldState[K]) =>
    onChange({ ...operation, [key]: value });

  return (
    <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2 border-t pt-4">
      <div className="sm:col-span-2">
        <p className="text-sm font-medium">Operation tracking</p>
        <p className="text-xs text-muted-foreground mt-1">
          {hourly
            ? "Hourly equipment — record operation place and time in Hr / Min (not route or KM)."
            : "Route-based — enter From → To in Nepal and distance in KM."}
        </p>
      </div>

      {canChooseOperationMode(vehicleCategory) && (
        <div className="space-y-2 sm:col-span-2">
          <Label>Operating basis</Label>
          <Select
            value={operation.operation_mode}
            onValueChange={(v) =>
              onChange({
                ...operation,
                operation_mode: v as OperationMode,
                route_from: "",
                route_to: "",
                operation_km: "",
                operation_place: "",
                operation_hours: "",
                operation_minutes: "",
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="km">Route + KM</SelectItem>
              <SelectItem value="hour">Place + Hr / Min</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {hourly ? (
        <>
          <div className="space-y-2 sm:col-span-2">
            <Label>Operation place</Label>
            <SearchableAutocomplete
              value={operation.operation_place}
              onChange={(v) => set("operation_place", v)}
              options={[]}
              placeholder="Site or location name"
              filterFn={(_, q, limit) => filterNepalPlacesByPrefix(q, limit)}
            />
          </div>
          <div className="space-y-2">
            <Label>Hours (Hr)</Label>
            <Input
              inputMode="numeric"
              placeholder="Hours"
              value={operation.operation_hours}
              onChange={(e) => set("operation_hours", e.target.value.replace(/\D/g, "").slice(0, 4))}
            />
          </div>
          <div className="space-y-2">
            <Label>Minutes (Min)</Label>
            <Input
              inputMode="numeric"
              placeholder="0–59"
              value={operation.operation_minutes}
              onChange={(e) => {
                const d = e.target.value.replace(/\D/g, "").slice(0, 2);
                if (d === "") {
                  set("operation_minutes", "");
                  return;
                }
                set("operation_minutes", String(Math.min(59, parseInt(d, 10) || 0)));
              }}
            />
          </div>
        </>
      ) : (
        <>
          <div className="space-y-2 sm:col-span-2">
            <Label>Operation route (From → To, Nepal)</Label>
            <p className="text-xs text-muted-foreground">
              Type first letters to pick from Nepal places.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <SearchableAutocomplete
                value={operation.route_from}
                onChange={(v) => set("route_from", v)}
                options={[]}
                placeholder="From (Nepal)"
                filterFn={(_, q, limit) => filterNepalPlacesByPrefix(q, limit)}
              />
              <SearchableAutocomplete
                value={operation.route_to}
                onChange={(v) => set("route_to", v)}
                options={[]}
                placeholder="To (Nepal)"
                filterFn={(_, q, limit) => filterNepalPlacesByPrefix(q, limit)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Distance (KM)</Label>
            <Input
              inputMode="decimal"
              placeholder="e.g. 125"
              value={operation.operation_km}
              onChange={(e) => set("operation_km", e.target.value.replace(/[^\d.]/g, ""))}
            />
          </div>
        </>
      )}
    </div>
  );
}
