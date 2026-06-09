import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const CATALOG_SELECT_OTHER = "__catalog_other__";

export type CatalogSelectItem = {
  key: string;
  name: string;
};

type Props = {
  value: string;
  onChange: (key: string) => void;
  items: CatalogSelectItem[];
  otherLabel?: string;
  onOther?: () => void;
  label?: string;
  placeholder?: string;
  className?: string;
  hideHint?: boolean;
  hint?: string;
};

/** Standard Radix select for tenant catalogs — same behavior as Work location dropdown. */
export function CatalogSelect({
  value,
  onChange,
  items,
  otherLabel = "Other",
  onOther,
  label,
  placeholder = "Select…",
  className,
  hideHint,
  hint,
}: Props) {
  const [resetKey, setResetKey] = useState(0);
  const selectable = items.filter((i) => i.name !== otherLabel && i.key !== otherLabel);

  return (
    <div className={cn("space-y-2", className)}>
      {label ? <Label>{label}</Label> : null}
      <Select
        key={resetKey}
        value={value || undefined}
        onValueChange={(v) => {
          if (v === CATALOG_SELECT_OTHER) {
            onOther?.();
            setResetKey((k) => k + 1);
            return;
          }
          onChange(v);
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent position="popper" sideOffset={4} collisionPadding={16}>
          {selectable.map((item) => (
            <SelectItem key={item.key} value={item.key}>
              {item.name}
            </SelectItem>
          ))}
          {onOther ? <SelectItem value={CATALOG_SELECT_OTHER}>{otherLabel}</SelectItem> : null}
        </SelectContent>
      </Select>
      {!hideHint && hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
