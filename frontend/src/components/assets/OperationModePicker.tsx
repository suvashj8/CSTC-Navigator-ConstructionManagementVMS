import { useMemo, useState } from "react";
import { AddOperationModeDialog } from "@/components/assets/AddOperationModeDialog";
import { CatalogSelect } from "@/components/ui/catalog-select";
import { useOperationModes } from "@/hooks/useOperationModes";
import {
  OPERATION_MODE_OTHER,
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
  operationCatalog?: OperationModeMeta[];
};

export function OperationModePicker({
  value,
  vehicleCategory,
  categoryCatalog,
  onModeChange,
  label = "Mode",
  hideHint = false,
  className,
  operationCatalog: catalogProp,
}: Props) {
  const hook = useOperationModes(catalogProp === undefined);
  const catalog = catalogProp ?? hook.catalog;
  const [addOpen, setAddOpen] = useState(false);

  const options = useMemo(
    () => operationModeOptionsForCategory(vehicleCategory, categoryCatalog, catalog),
    [vehicleCategory, categoryCatalog, catalog]
  );

  const applyPick = (pick: string) => {
    const resolved = resolveOperationFromPick(pick, catalog);
    onModeChange(pick, resolved.mode, resolved.label);
  };

  const items = useMemo(
    () =>
      options
        .filter((name) => name !== OPERATION_MODE_OTHER)
        .map((name) => ({ key: name, name })),
    [options]
  );

  return (
    <>
      <CatalogSelect
        className={className}
        label={label}
        value={value}
        items={items}
        otherLabel={OPERATION_MODE_OTHER}
        onOther={() => setAddOpen(true)}
        hideHint={hideHint}
        hint={
          hideHint
            ? undefined
            : "Route + KM, Place + Hr / Min, or Other for a custom mode."
        }
        onChange={applyPick}
      />
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
