import { useMemo, useState } from "react";
import { SearchableAutocomplete } from "@/components/ui/searchable-autocomplete";
import { Label } from "@/components/ui/label";
import { AddOperationModeDialog } from "@/components/assets/AddOperationModeDialog";
import { useOperationModes } from "@/hooks/useOperationModes";
import {
  OPERATION_MODE_OTHER,
  filterOperationModeOptions,
  operationModeOptionsForCategory,
  resolveOperationFromPick,
  type OperationModeMeta,
} from "@/lib/operationModeCatalog";
import type { VehicleCategoryMeta } from "@/lib/vehicleCategory";
import type { OperationMode } from "@/lib/vehicleOperation";

type Props = {
  value: string;
  vehicleCategory: string;
  categoryCatalog: VehicleCategoryMeta[];
  onModeChange: (pick: string, mode: OperationMode, label: string | null) => void;
  label?: string;
  showDropdownIcon?: boolean;
  hideHint?: boolean;
  className?: string;
  required?: boolean;
};

export function OperationModePicker({
  value,
  vehicleCategory,
  categoryCatalog,
  onModeChange,
  label = "Mode",
  showDropdownIcon = false,
  hideHint = false,
  className,
  required,
}: Props) {
  const { catalog, findMode } = useOperationModes();
  const [addOpen, setAddOpen] = useState(false);

  const options = useMemo(
    () => operationModeOptionsForCategory(vehicleCategory, categoryCatalog, catalog),
    [vehicleCategory, categoryCatalog, catalog]
  );

  const applyPick = (pick: string) => {
    const resolved = resolveOperationFromPick(pick, catalog);
    onModeChange(pick, resolved.mode, resolved.label);
  };

  return (
    <>
      <div className={className ?? "space-y-2"}>
        <Label>{label}</Label>
        <SearchableAutocomplete
          showDropdownIcon={showDropdownIcon}
          revealAllOnOpen
          value={value}
          onChange={(v) => {
            if (!v.trim()) {
              onModeChange("", "km", null);
              return;
            }
            const exact = findMode(v.trim());
            if (exact) applyPick(exact.name);
            else onModeChange(v, "km", null);
          }}
          onPick={(name) => {
            if (name === OPERATION_MODE_OTHER) {
              onModeChange("", "km", null);
              setAddOpen(true);
              return;
            }
            applyPick(name);
          }}
          options={options}
          placeholder=""
          filterFn={filterOperationModeOptions}
          required={required}
        />
        {!hideHint ? (
          <p className="text-xs text-muted-foreground">
            <strong>Route + KM</strong> or <strong>Place + Hr / Min</strong>, or choose <strong>Other</strong> for a
            custom mode.
          </p>
        ) : (
          <p className="text-[10px] leading-tight text-muted-foreground">
            Route + KM · Place + Hr / Min · Other
          </p>
        )}
      </div>

      <AddOperationModeDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={(meta: OperationModeMeta) => {
          const resolved = resolveOperationFromPick(meta.name, [...catalog, meta]);
          onModeChange(meta.name, resolved.mode, resolved.label);
        }}
      />
    </>
  );
}
