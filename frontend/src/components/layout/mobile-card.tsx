import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export type MobileCardField = { label: string; value: React.ReactNode };

export function MobileCardList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid gap-3 desktop:hidden", className)}>{children}</div>;
}

/**
 * Card row for phone / narrow layouts (< 7 inch). Actions render below fields with full-width touch targets.
 */
export function MobileCard({
  title,
  subtitle,
  fields,
  actions,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  fields: MobileCardField[];
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="space-y-3 p-4">
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{title}</p>
          {subtitle != null && subtitle !== "" && (
            <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
          {fields.map(({ label, value }) => (
            <div key={label} className="min-w-0">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
              <dd className="truncate font-medium tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        {actions ? (
          <div className="mobile-action-row border-t border-border/60 pt-3">{actions}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}
