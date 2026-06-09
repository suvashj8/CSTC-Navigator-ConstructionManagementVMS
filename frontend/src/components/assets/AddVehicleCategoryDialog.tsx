import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { createVehicleCategory } from "@/api/vehicleCategories";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DIALOG_FORM_FIELD, DIALOG_FORM_FULL, DialogForm } from "@/components/ui/dialog-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { VehicleCategoryMeta } from "@/lib/vehicleCategory";
import { isReservedBuiltinCategoryName } from "@/lib/vehicleCategory";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (meta: VehicleCategoryMeta) => void;
};

const emptyForm = () => ({
  name: "",
  description: "",
});

export function AddVehicleCategoryDialog({ open, onOpenChange, onCreated }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState(emptyForm);

  const createMut = useMutation({
    mutationFn: createVehicleCategory,
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: ["vehicle-categories"] });
      const meta: VehicleCategoryMeta = {
        id: row.id,
        name: row.name,
        description: row.description,
        operationModes: row.operation_modes,
        isCustom: true,
      };
      onCreated(meta);
      toast.success(`Category “${row.name}” added`);
      setForm(emptyForm());
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleClose = (next: boolean) => {
    if (!next) setForm(emptyForm());
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add vehicle category</DialogTitle>
          <DialogDescription>
            Register a custom category (e.g. Crane, Mixer). Operation mode is chosen separately when recording
            usage.
          </DialogDescription>
        </DialogHeader>
        <DialogForm
          onSubmit={(e) => {
            e.preventDefault();
            const name = form.name.trim();
            if (!name) {
              toast.error("Enter a category name");
              return;
            }
            if (isReservedBuiltinCategoryName(name)) {
              toast.error("That name is reserved — pick it from the list instead");
              return;
            }
            createMut.mutate({
              name,
              description: form.description.trim(),
            });
          }}
        >
          <div className={DIALOG_FORM_FIELD}>
            <Label>Category name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              autoFocus
              required
            />
          </div>
          <div className={cn(DIALOG_FORM_FIELD, DIALOG_FORM_FULL)}>
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
            />
          </div>
          <Button type="submit" className={DIALOG_FORM_FULL} disabled={createMut.isPending}>
            {createMut.isPending ? "Saving…" : "Save category"}
          </Button>
        </DialogForm>
      </DialogContent>
    </Dialog>
  );
}
