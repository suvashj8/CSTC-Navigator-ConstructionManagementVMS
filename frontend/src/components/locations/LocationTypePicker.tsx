import { useState } from "react";
import { AddLocationTypeDialog } from "@/components/locations/AddLocationTypeDialog";
import { CatalogSelect } from "@/components/ui/catalog-select";
import { useLocationTypes } from "@/hooks/useLocationTypes";
import { LOCATION_TYPE_OTHER, type LocationTypeMeta } from "@/lib/locationTypeCatalog";

type Props = {
  value: string;
  onChange: (key: string) => void;
  label?: string;
  hideHint?: boolean;
  className?: string;
  catalog?: LocationTypeMeta[];
};

export function LocationTypePicker({
  value,
  onChange,
  label = "Type",
  hideHint = false,
  className,
  catalog: catalogProp,
}: Props) {
  const hook = useLocationTypes(catalogProp === undefined);
  const catalog = catalogProp ?? hook.catalog;
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      <CatalogSelect
        className={className}
        label={label}
        value={value}
        items={catalog.map((t) => ({ key: t.key, name: t.name }))}
        otherLabel={LOCATION_TYPE_OTHER}
        onOther={() => setAddOpen(true)}
        hideHint={hideHint}
        hint={hideHint ? undefined : `Choose ${LOCATION_TYPE_OTHER} to define a new location type.`}
        onChange={onChange}
      />
      <AddLocationTypeDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={(m) => onChange(m.key)}
      />
    </>
  );
}
