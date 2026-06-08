import { useState } from "react";
import { filterOptionsByQuery } from "@/data/nepalTransportOffices";
import { SearchableAutocomplete } from "@/components/ui/searchable-autocomplete";
import { Label } from "@/components/ui/label";
import { AddVehicleDepartmentDialog } from "@/components/assets/AddVehicleDepartmentDialog";
import { useVehicleDepartments } from "@/hooks/useVehicleDepartments";
import { VEHICLE_DEPARTMENT_OTHER, type VehicleDepartmentMeta } from "@/lib/vehicleDepartment";

type Props = {
  value: string;
  onChange: (name: string) => void;
  required?: boolean;
  label?: string;
  showDropdownIcon?: boolean;
  hideHint?: boolean;
  className?: string;
};

export function VehicleDepartmentPicker({
  value,
  onChange,
  required,
  label = "Department",
  showDropdownIcon = false,
  hideHint = false,
  className,
}: Props) {
  const { catalog, names, findDepartment } = useVehicleDepartments();
  const [addOpen, setAddOpen] = useState(false);

  const applyDepartment = (name: string) => {
    const meta = findDepartment(name);
    onChange(meta?.name ?? name);
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
              onChange("");
              return;
            }
            const exact = findDepartment(v.trim());
            onChange(exact?.name ?? v);
          }}
          onPick={(name) => {
            if (name === VEHICLE_DEPARTMENT_OTHER) {
              onChange("");
              setAddOpen(true);
              return;
            }
            applyDepartment(name);
          }}
          options={names}
          placeholder=""
          filterFn={filterOptionsByQuery}
          required={required}
        />
        {!hideHint ? (
          <p className="text-xs text-muted-foreground">
            Type to search. Choose <strong>Other</strong> to add a custom department.
          </p>
        ) : null}
      </div>

      <AddVehicleDepartmentDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={(meta: VehicleDepartmentMeta) => onChange(meta.name)}
      />
    </>
  );
}
