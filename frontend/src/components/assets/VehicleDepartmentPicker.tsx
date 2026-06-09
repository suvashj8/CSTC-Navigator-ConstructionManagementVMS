import { useState } from "react";
import { AddVehicleDepartmentDialog } from "@/components/assets/AddVehicleDepartmentDialog";
import { CatalogSelect } from "@/components/ui/catalog-select";
import { useVehicleDepartments } from "@/hooks/useVehicleDepartments";
import {
  findDepartmentInCatalog,
  VEHICLE_DEPARTMENT_OTHER,
  type VehicleDepartmentMeta,
} from "@/lib/vehicleDepartment";

type Props = {
  value: string;
  onChange: (name: string) => void;
  required?: boolean;
  label?: string;
  showDropdownIcon?: boolean;
  hideHint?: boolean;
  className?: string;
  departmentCatalog?: VehicleDepartmentMeta[];
  departmentNames?: string[];
};

export function VehicleDepartmentPicker({
  value,
  onChange,
  label = "Department",
  hideHint = false,
  className,
  departmentCatalog: catalogProp,
}: Props) {
  const hook = useVehicleDepartments(catalogProp === undefined);
  const catalog = catalogProp ?? hook.catalog;
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      <CatalogSelect
        className={className}
        label={label}
        value={value}
        items={catalog.map((d) => ({ key: d.name, name: d.name }))}
        otherLabel={VEHICLE_DEPARTMENT_OTHER}
        onOther={() => setAddOpen(true)}
        hideHint={hideHint}
        hint={hideHint ? undefined : `Choose ${VEHICLE_DEPARTMENT_OTHER} to add a custom department.`}
        onChange={(name) => {
          const meta = findDepartmentInCatalog(name, catalog);
          onChange(meta?.name ?? name);
        }}
      />
      <AddVehicleDepartmentDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={(meta: VehicleDepartmentMeta) => onChange(meta.name)}
      />
    </>
  );
}
