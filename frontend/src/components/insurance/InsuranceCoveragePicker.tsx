import { useState } from "react";
import { AddInsuranceCoverageDialog } from "@/components/insurance/AddInsuranceCoverageDialog";
import { CatalogSelect } from "@/components/ui/catalog-select";
import { useInsuranceCoverageTypes } from "@/hooks/useInsuranceCoverageTypes";
import { INSURANCE_COVERAGE_OTHER, type InsuranceCoverageMeta } from "@/lib/insuranceCoverageCatalog";

type Props = {
  value: string;
  onChange: (key: string) => void;
  label?: string;
  hideHint?: boolean;
  className?: string;
  catalog?: InsuranceCoverageMeta[];
};

export function InsuranceCoveragePicker({
  value,
  onChange,
  label = "Coverage type",
  hideHint = false,
  className,
  catalog: catalogProp,
}: Props) {
  const hook = useInsuranceCoverageTypes(catalogProp === undefined);
  const catalog = catalogProp ?? hook.catalog;
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      <CatalogSelect
        className={className}
        label={label}
        value={value}
        items={catalog.map((c) => ({ key: c.key, name: c.name }))}
        otherLabel={INSURANCE_COVERAGE_OTHER}
        onOther={() => setAddOpen(true)}
        hideHint={hideHint}
        hint={hideHint ? undefined : `Choose ${INSURANCE_COVERAGE_OTHER} to add a custom coverage type.`}
        onChange={onChange}
      />
      <AddInsuranceCoverageDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={(m) => onChange(m.key)}
      />
    </>
  );
}
