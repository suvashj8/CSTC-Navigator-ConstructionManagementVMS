import { useState } from "react";
import { AddMaintenanceStatusDialog } from "@/components/maintenance/AddMaintenanceStatusDialog";
import { CatalogSelect } from "@/components/ui/catalog-select";
import { useMaintenanceStatuses } from "@/hooks/useMaintenanceStatuses";
import { MAINTENANCE_STATUS_OTHER, type MaintenanceStatusMeta } from "@/lib/maintenanceStatusCatalog";

type Props = {
  value: string;
  onChange: (name: string) => void;
  required?: boolean;
  label?: string;
  hideHint?: boolean;
  className?: string;
  catalog?: MaintenanceStatusMeta[];
};

export function MaintenanceStatusPicker({
  value,
  onChange,
  label = "Status",
  hideHint = false,
  className,
  catalog: catalogProp,
}: Props) {
  const hook = useMaintenanceStatuses(catalogProp === undefined);
  const catalog = catalogProp ?? hook.catalog;
  const [addOpen, setAddOpen] = useState(false);

  const items = catalog
    .filter((s) => s.name !== MAINTENANCE_STATUS_OTHER)
    .map((s) => ({ key: s.name, name: s.name }));

  return (
    <>
      <CatalogSelect
        className={className}
        label={label}
        value={value}
        items={items}
        otherLabel={MAINTENANCE_STATUS_OTHER}
        onOther={() => setAddOpen(true)}
        hideHint={hideHint}
        hint={hideHint ? undefined : "Choose Other to add a custom status."}
        onChange={onChange}
      />
      <AddMaintenanceStatusDialog open={addOpen} onOpenChange={setAddOpen} onCreated={(m) => onChange(m.name)} />
    </>
  );
}
