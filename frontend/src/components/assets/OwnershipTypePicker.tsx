import { useState } from "react";
import { AddOwnershipTypeDialog } from "@/components/assets/AddOwnershipTypeDialog";
import { CatalogSelect } from "@/components/ui/catalog-select";
import { useOwnershipTypes } from "@/hooks/useOwnershipTypes";
import { OWNERSHIP_TYPE_OTHER, type OwnershipTypeMeta } from "@/lib/ownershipTypeCatalog";

type Props = {
  value: string;
  onChange: (key: string) => void;
  required?: boolean;
  label?: string;
  showDropdownIcon?: boolean;
  hideHint?: boolean;
  className?: string;
  catalog?: OwnershipTypeMeta[];
  names?: string[];
};

export function OwnershipTypePicker({
  value,
  onChange,
  required,
  label = "Ownership",
  hideHint = false,
  className,
  catalog: catalogProp,
}: Props) {
  const hook = useOwnershipTypes(catalogProp === undefined);
  const catalog = catalogProp ?? hook.catalog;
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      <CatalogSelect
        className={className}
        label={label}
        value={value}
        items={catalog.map((t) => ({ key: t.key, name: t.name }))}
        otherLabel={OWNERSHIP_TYPE_OTHER}
        onOther={() => setAddOpen(true)}
        hideHint={hideHint}
        hint={
          hideHint
            ? undefined
            : `Choose ${OWNERSHIP_TYPE_OTHER} to add a custom ownership type.`
        }
        onChange={onChange}
      />
      <AddOwnershipTypeDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={(m) => onChange(m.key)}
      />
    </>
  );
}
