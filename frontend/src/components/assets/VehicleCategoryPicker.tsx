import { useState } from "react";
import { AddVehicleCategoryDialog } from "@/components/assets/AddVehicleCategoryDialog";
import { CatalogSelect } from "@/components/ui/catalog-select";
import { useVehicleCategories } from "@/hooks/useVehicleCategories";
import {
  defaultModeForCategory,
  findCategoryInCatalog,
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
  categoryCatalog?: VehicleCategoryMeta[];
  categoryNames?: string[];
};

export function VehicleCategoryPicker({
  value,
  onCategoryChange,
  label = "Vehicle category",
  hideHint = false,
  className,
  categoryCatalog: catalogProp,
}: Props) {
  const hook = useVehicleCategories(catalogProp === undefined);
  const catalog = catalogProp ?? hook.catalog;
  const findCategory = (name: string) => findCategoryInCatalog(name, catalog);
  const [addOpen, setAddOpen] = useState(false);

  const applyCategory = (name: string) => {
    const meta = findCategory(name);
    onCategoryChange(name, meta, defaultModeForCategory(name, catalog));
  };

  return (
    <>
      <CatalogSelect
        className={className}
        label={label}
        value={value}
        items={catalog.map((c) => ({ key: c.name, name: c.name }))}
        otherLabel={VEHICLE_CATEGORY_OTHER}
        onOther={() => setAddOpen(true)}
        hideHint={hideHint}
        hint={hideHint ? undefined : `Choose ${VEHICLE_CATEGORY_OTHER} to add a custom category.`}
        onChange={applyCategory}
      />
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
