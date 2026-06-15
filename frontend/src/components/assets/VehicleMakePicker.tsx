import { useState } from "react";
import { AddVehicleMakeDialog } from "@/components/assets/AddVehicleMakeDialog";
import { CatalogSelect } from "@/components/ui/catalog-select";
import { useVehicleMakes } from "@/hooks/useVehicleMakes";
import { VEHICLE_MAKE_OTHER, type VehicleMakeMeta } from "@/lib/vehicleMakeCatalog";

type Props = {
  value: string;
  onChange: (name: string) => void;
  label?: string;
  hideHint?: boolean;
  className?: string;
  catalog?: VehicleMakeMeta[];
};

export function VehicleMakePicker({
  value,
  onChange,
  label = "Make",
  hideHint = false,
  className,
  catalog: catalogProp,
}: Props) {
  const hook = useVehicleMakes(catalogProp === undefined);
  const catalog = catalogProp ?? hook.catalog;
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      <CatalogSelect
        className={className}
        label={label}
        value={value}
        placeholder="Select manufacturer…"
        items={catalog.map((m) => ({ key: m.name, name: m.name }))}
        otherLabel={VEHICLE_MAKE_OTHER}
        onOther={() => setAddOpen(true)}
        hideHint={hideHint}
        hint={hideHint ? undefined : `Choose ${VEHICLE_MAKE_OTHER} to register a new manufacturer.`}
        onChange={onChange}
      />
      <AddVehicleMakeDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={(m) => onChange(m.name)}
      />
    </>
  );
}
