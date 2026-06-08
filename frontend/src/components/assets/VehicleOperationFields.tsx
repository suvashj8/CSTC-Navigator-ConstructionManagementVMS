import { DIALOG_FORM_FIELD, DIALOG_FORM_FULL } from "@/components/ui/dialog-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableAutocomplete } from "@/components/ui/searchable-autocomplete";
import { OperationModePicker } from "@/components/assets/OperationModePicker";
import { useOperationModes } from "@/hooks/useOperationModes";
import { filterNepalPlacesByPrefix } from "@/data/nepalPlaces";
import type { AssetType } from "@/types/domain";
import { type VehicleCategoryMeta } from "@/lib/vehicleCategory";
import {
  customFieldLabelsForPick,
  defaultOperationModePick,
  isDynamicCustomMode,
  isHourlyFromOperationPick,
  needsOperationBasisToggle,
  ROUTE_KM_LABEL,
  shouldShowOperationModePicker,
} from "@/lib/operationModeCatalog";
import { type OperationMode } from "@/lib/vehicleOperation";
import { cn } from "@/lib/utils";

export type OperationFieldState = {
  operation_mode: OperationMode;
  operation_mode_pick: string;
  operation_mode_label: string | null;
  route_from: string;
  route_to: string;
  operation_km: string;
  operation_place: string;
  operation_hours: string;
  operation_minutes: string;
  operation_custom_fields: Record<string, string>;
};

export const emptyOperationFields = (): OperationFieldState => ({
  operation_mode: "km",
  operation_mode_pick: ROUTE_KM_LABEL,
  operation_mode_label: null,
  route_from: "",
  route_to: "",
  operation_km: "",
  operation_place: "",
  operation_hours: "",
  operation_minutes: "",
  operation_custom_fields: {},
});

type Props = {
  assetType?: AssetType;
  vehicleCategory: string;
  categoryCatalog?: VehicleCategoryMeta[];
  operation: OperationFieldState;
  onChange: (next: OperationFieldState) => void;
  compact?: boolean;
};

const clearOperationValues = (): Pick<
  OperationFieldState,
  | "route_from"
  | "route_to"
  | "operation_km"
  | "operation_place"
  | "operation_hours"
  | "operation_minutes"
  | "operation_custom_fields"
> => ({
  route_from: "",
  route_to: "",
  operation_km: "",
  operation_place: "",
  operation_hours: "",
  operation_minutes: "",
  operation_custom_fields: {},
});

export function VehicleOperationFields({
  assetType = "vehicle",
  vehicleCategory,
  categoryCatalog = [],
  operation,
  onChange,
  compact = false,
}: Props) {
  const { catalog: operationCatalog } = useOperationModes(assetType === "vehicle");
  const fieldClass = compact ? "min-w-0 space-y-0.5" : DIALOG_FORM_FIELD;
  const pick =
    operation.operation_mode_pick ||
    defaultOperationModePick(vehicleCategory, categoryCatalog);
  const dynamicFields = customFieldLabelsForPick(pick, operationCatalog);
  const isCustomDynamic = isDynamicCustomMode(pick, operationCatalog);
  const hourly =
    assetType !== "vehicle"
      ? true
      : isHourlyFromOperationPick(
          pick,
          operation.operation_mode,
          vehicleCategory,
          categoryCatalog,
          operationCatalog
        );
  const set = <K extends keyof OperationFieldState>(key: K, value: OperationFieldState[K]) =>
    onChange({ ...operation, [key]: value });
  const showModePicker =
    assetType === "vehicle" && shouldShowOperationModePicker(assetType, vehicleCategory, categoryCatalog);
  const showBasisToggle =
    showModePicker &&
    needsOperationBasisToggle(pick, vehicleCategory, categoryCatalog, operationCatalog);

  const setCustomField = (label: string, value: string) => {
    onChange({
      ...operation,
      operation_custom_fields: { ...operation.operation_custom_fields, [label]: value },
    });
  };

  return (
    <>
      <div
        className={cn(
          DIALOG_FORM_FULL,
          compact ? "border-t border-border/60 pt-1.5" : "border-t pt-4"
        )}
      >
        <p className={cn("font-medium", compact ? "text-[11px] text-muted-foreground" : "text-sm")}>
          Operation
        </p>
        {!compact ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {assetType === "equipment"
              ? "Equipment — record where it is working and time in Hr / Min."
              : assetType === "tool"
                ? "Tool — record usage place and time in Hr / Min."
                : isCustomDynamic
                  ? "Custom mode — fill in the fields defined for this operation type."
                  : !vehicleCategory
                    ? "Select vehicle category above, then record the trip or hourly usage below."
                    : hourly
                      ? "Hourly — record operation place and time in Hr / Min."
                      : "Route-based — enter From → To and distance in KM."}
          </p>
        ) : null}
      </div>

      {showModePicker && (
        <OperationModePicker
          className={fieldClass}
          label={vehicleCategory ? "Mode" : "Mode"}
          value={pick}
          vehicleCategory={vehicleCategory}
          categoryCatalog={categoryCatalog}
          showDropdownIcon
          hideHint={compact}
          onModeChange={(nextPick, mode, label) =>
            onChange({
              ...operation,
              operation_mode_pick: nextPick,
              operation_mode: mode,
              operation_mode_label: label,
              ...clearOperationValues(),
            })
          }
        />
      )}

      {showBasisToggle && (
        <div className={fieldClass}>
          <Label>Basis</Label>
          <Select
            value={operation.operation_mode === "custom" ? "km" : operation.operation_mode}
            onValueChange={(v) =>
              onChange({
                ...operation,
                operation_mode: v as OperationMode,
                ...clearOperationValues(),
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

      {isCustomDynamic ? (
        dynamicFields.map((label) => (
          <div key={label} className={fieldClass}>
            <Label>{label}</Label>
            {/place|from|to/i.test(label) ? (
              <SearchableAutocomplete
                value={operation.operation_custom_fields[label] ?? ""}
                onChange={(v) => setCustomField(label, v)}
                options={[]}
                placeholder=""
                filterFn={(_, q, limit) => filterNepalPlacesByPrefix(q, limit)}
              />
            ) : (
              <Input
                value={operation.operation_custom_fields[label] ?? ""}
                onChange={(e) => setCustomField(label, e.target.value)}
              />
            )}
          </div>
        ))
      ) : hourly ? (
        <>
          <div className={cn(fieldClass, !showModePicker && !showBasisToggle && !compact && "sm:col-span-2")}>
            <Label>Place</Label>
            <SearchableAutocomplete
              value={operation.operation_place}
              onChange={(v) => set("operation_place", v)}
              options={[]}
              placeholder={compact ? "" : "Site or location name"}
              filterFn={(_, q, limit) => filterNepalPlacesByPrefix(q, limit)}
            />
          </div>
          <div className={fieldClass}>
            <Label>Hr</Label>
            <Input
              inputMode="numeric"
              placeholder={compact ? "" : "Hours"}
              value={operation.operation_hours}
              onChange={(e) => set("operation_hours", e.target.value.replace(/\D/g, "").slice(0, 4))}
            />
          </div>
          <div className={fieldClass}>
            <Label>Min</Label>
            <Input
              inputMode="numeric"
              placeholder={compact ? "" : "0–59"}
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
          <div className={fieldClass}>
            <Label>{compact ? "From" : "From (Nepal)"}</Label>
            <SearchableAutocomplete
              value={operation.route_from}
              onChange={(v) => set("route_from", v)}
              options={[]}
              placeholder=""
              filterFn={(_, q, limit) => filterNepalPlacesByPrefix(q, limit)}
            />
          </div>
          <div className={fieldClass}>
            <Label>{compact ? "To" : "To (Nepal)"}</Label>
            <SearchableAutocomplete
              value={operation.route_to}
              onChange={(v) => set("route_to", v)}
              options={[]}
              placeholder=""
              filterFn={(_, q, limit) => filterNepalPlacesByPrefix(q, limit)}
            />
          </div>
          <div className={fieldClass}>
            <Label>{compact ? "KM" : "Distance (KM)"}</Label>
            <Input
              inputMode="decimal"
              placeholder={compact ? "" : "e.g. 125"}
              value={operation.operation_km}
              onChange={(e) => set("operation_km", e.target.value.replace(/[^\d.]/g, ""))}
            />
          </div>
        </>
      )}
    </>
  );
}
