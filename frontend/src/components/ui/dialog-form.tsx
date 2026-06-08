import * as React from "react";
import { cn } from "@/lib/utils";

/** Horizontal dialog form: 1 col mobile (< 7 inch) → 2 cols desktop → 3 cols wide. */
export const DIALOG_FORM_CLASS =
  "grid grid-cols-1 items-start gap-x-4 gap-y-4 desktop:grid-cols-2 xl:grid-cols-3";

/** Span full width of the horizontal form (works with 3- or 4-column grids). */
export const DIALOG_FORM_FULL = "col-span-full";

/** Standard field wrapper inside dialog forms. */
export const DIALOG_FORM_FIELD = "space-y-2";

export function DialogForm({
  className,
  ...props
}: React.FormHTMLAttributes<HTMLFormElement>) {
  return <form className={cn(DIALOG_FORM_CLASS, className)} {...props} />;
}
