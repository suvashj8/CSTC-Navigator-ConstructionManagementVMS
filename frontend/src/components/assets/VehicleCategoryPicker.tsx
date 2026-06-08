import { useState } from "react";
import { filterOptionsByQuery } from "@/data/nepalTransportOffices";
import { SearchableAutocomplete } from "@/components/ui/searchable-autocomplete";
import { Label } from "@/components/ui/label";
import { AddVehicleCategoryDialog } from "@/components/assets/AddVehicleCategoryDialog";
import { useVehicleCategories } from "@/hooks/useVehicleCategories";
import {
  defaultModeForCategory,
  VEHICLE_CATEGORY_OTHER,
  type VehicleCategoryMeta,
} from "@/lib/vehicleCategory";
import type { OperationMode } from "@/lib/vehicleOperation";

type Props = {
  value: string;
  onCategoryChange: (name: string, meta: VehicleCategoryMeta | undefined, defaultMode: OperationMode) => void;
  required?: boolean;
  label?: string;
  showDropdownIcon?: boolean;
  hideHint?: boolean;
  className?: string;
};

export function VehicleCategoryPicker({
  value,
  onCategoryChange,
  required,
  label = "Vehicle category",
  showDropdownIcon = false,
  hideHint = false,
  className,
}: Props) {
  const { catalog, names, findCategory } = useVehicleCategories();
  const [addOpen, setAddOpen] = useState(false);

  const applyCategory = (name: string) => {
    const meta = findCategory(name);
    onCategoryChange(name, meta, defaultModeForCategory(name, catalog));
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
              onCategoryChange("", undefined, "km");
              return;
            }
            const exact = findCategory(v.trim());
            if (exact) {
              applyCategory(exact.name);
            } else {
              onCategoryChange(v, undefined, "km");
            }
          }}
          onPick={(name) => {
            if (name === VEHICLE_CATEGORY_OTHER) {
              onCategoryChange("", undefined, "km");
              setAddOpen(true);
              return;
            }
            applyCategory(name);
          }}
          options={names}
          placeholder=""
          filterFn={filterOptionsByQuery}
          required={required}
        />
        {!hideHint ? (
          <p className="text-xs text-muted-foreground">
            Type to search (e.g. T for Truck). Choose <strong>Other</strong> to add a custom category.
          </p>
        ) : null}
      </div>

      <AddVehicleCategoryDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={(meta) => {
          onCategoryChange(meta.name, meta, defaultModeForCategory(meta.name, [...catalog, meta]));
        }}
      />
    </>
  );
}
