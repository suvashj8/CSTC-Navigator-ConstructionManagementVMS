import { useState } from "react";
import { AddAssetTypeDialog } from "@/components/assets/AddAssetTypeDialog";
import { CatalogSelect } from "@/components/ui/catalog-select";
import { useAssetTypes } from "@/hooks/useAssetTypes";
import { ASSET_TYPE_OTHER, type AssetTypeMeta } from "@/lib/assetTypeCatalog";

type Props = {
  value: string;
  onChange: (key: string) => void;
  required?: boolean;
  label?: string;
  showDropdownIcon?: boolean;
  hideHint?: boolean;
  className?: string;
  assetTypeCatalog?: AssetTypeMeta[];
  assetTypeNames?: string[];
};

export function AssetTypePicker({
  value,
  onChange,
  required,
  label = "Asset type",
  hideHint = false,
  className,
  assetTypeCatalog: catalogProp,
}: Props) {
  const hook = useAssetTypes(catalogProp === undefined);
  const catalog = catalogProp ?? hook.catalog;
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      <CatalogSelect
        className={className}
        label={label}
        value={value}
        items={catalog.map((t) => ({ key: t.key, name: t.name }))}
        otherLabel={ASSET_TYPE_OTHER}
        onOther={() => setAddOpen(true)}
        hideHint={hideHint}
        hint={
          hideHint
            ? undefined
            : `Choose ${ASSET_TYPE_OTHER} to add a custom asset type.`
        }
        onChange={onChange}
      />
      <AddAssetTypeDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={(meta: AssetTypeMeta) => onChange(meta.key)}
      />
    </>
  );
}
