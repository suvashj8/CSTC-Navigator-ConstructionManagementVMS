import { useState } from "react";
import { AddSupplierCategoryDialog } from "@/components/suppliers/AddSupplierCategoryDialog";
import { CatalogSelect } from "@/components/ui/catalog-select";
import { useSupplierCategories } from "@/hooks/useSupplierCategories";
import { SUPPLIER_CATEGORY_OTHER, type SupplierCategoryMeta } from "@/lib/supplierCategoryCatalog";

type Props = {
  value: string;
  onChange: (key: string) => void;
  required?: boolean;
  label?: string;
  hideHint?: boolean;
  className?: string;
  catalog?: SupplierCategoryMeta[];
};

export function SupplierCategoryPicker({
  value,
  onChange,
  label = "Category",
  hideHint = false,
  className,
  catalog: catalogProp,
}: Props) {
  const hook = useSupplierCategories(catalogProp === undefined);
  const catalog = catalogProp ?? hook.catalog;
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      <CatalogSelect
        className={className}
        label={label}
        value={value}
        items={catalog
          .filter((c) => c.name !== SUPPLIER_CATEGORY_OTHER)
          .map((c) => ({ key: c.key, name: c.name }))}
        otherLabel={SUPPLIER_CATEGORY_OTHER}
        onOther={() => setAddOpen(true)}
        hideHint={hideHint}
        hint={hideHint ? undefined : "Choose Other to add a custom category."}
        onChange={onChange}
      />
      <AddSupplierCategoryDialog open={addOpen} onOpenChange={setAddOpen} onCreated={(m) => onChange(m.key)} />
    </>
  );
}
