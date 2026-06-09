import { useState } from "react";
import { AddInsuranceStatusDialog } from "@/components/insurance/AddInsuranceStatusDialog";
import { CatalogSelect } from "@/components/ui/catalog-select";
import { useInsuranceStatuses } from "@/hooks/useInsuranceStatuses";
import { INSURANCE_STATUS_OTHER, type InsuranceStatusMeta } from "@/lib/insuranceStatusCatalog";

type Props = {
  value: string;
  onChange: (key: string) => void;
  label?: string;
  hideHint?: boolean;
  className?: string;
  catalog?: InsuranceStatusMeta[];
};

export function InsuranceStatusPicker({
  value,
  onChange,
  label = "Status",
  hideHint = false,
  className,
  catalog: catalogProp,
}: Props) {
  const hook = useInsuranceStatuses(catalogProp === undefined);
  const catalog = catalogProp ?? hook.catalog;
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      <CatalogSelect
        className={className}
        label={label}
        value={value}
        items={catalog.map((s) => ({ key: s.key, name: s.name }))}
        otherLabel={INSURANCE_STATUS_OTHER}
        onOther={() => setAddOpen(true)}
        hideHint={hideHint}
        hint={hideHint ? undefined : `Choose ${INSURANCE_STATUS_OTHER} to add a custom status.`}
        onChange={onChange}
      />
      <AddInsuranceStatusDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={(m) => onChange(m.key)}
      />
    </>
  );
}
