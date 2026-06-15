import * as React from "react";
import { cn } from "@/lib/utils";

/** Horizontal dialog form: 1 col mobile (< 7 inch) → 2 cols desktop → 3 cols wide. */
export const DIALOG_FORM_CLASS =
  "grid grid-cols-1 items-start gap-x-4 gap-y-4 desktop:grid-cols-2 xl:grid-cols-3";

/** Dense 4-column grid for asset register / large dialogs. */
export const ASSET_REGISTER_FORM =
  "grid grid-cols-2 items-start gap-x-2 gap-y-2 sm:grid-cols-3 lg:grid-cols-4";

/** Smaller labels and controls on desktop only — mobile keeps default 44px-friendly touch targets. */
export const ASSET_REGISTER_DENSITY =
  "desktop:[&_label]:text-[11px] desktop:[&_label]:font-medium desktop:[&_label]:leading-tight desktop:[&_input]:h-8 desktop:[&_input]:min-h-8 desktop:[&_input]:text-xs desktop:[&_input]:px-2 desktop:[&_input]:py-1 desktop:[&_[role=combobox]]:h-8 desktop:[&_[role=combobox]]:min-h-8 desktop:[&_[role=combobox]]:text-xs desktop:[&_[role=combobox]]:px-2";

/** Full-width row sub-grid (matches parent column count). */
export const DIALOG_FORM_ROW =
  "col-span-full grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4";

/** Span full width of the horizontal form (works with 3- or 4-column grids). */
export const DIALOG_FORM_FULL = "col-span-full";

/** Standard field wrapper inside dialog forms. */
export const DIALOG_FORM_FIELD = "space-y-2";

/** Tighter field wrapper for dense dialogs. */
export const DIALOG_FORM_FIELD_COMPACT = "min-w-0 space-y-0.5";

export function DialogForm({
  className,
  ...props
}: React.FormHTMLAttributes<HTMLFormElement>) {
  return <form className={cn(DIALOG_FORM_CLASS, className)} {...props} />;
}
