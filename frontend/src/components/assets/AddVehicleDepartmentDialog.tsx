import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { createVehicleDepartment } from "@/api/vehicleDepartments";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DIALOG_FORM_FIELD, DIALOG_FORM_FULL, DialogForm } from "@/components/ui/dialog-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { isReservedBuiltinDepartmentName, type VehicleDepartmentMeta } from "@/lib/vehicleDepartment";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (meta: VehicleDepartmentMeta) => void;
};

const emptyForm = () => ({
  name: "",
  description: "",
});

export function AddVehicleDepartmentDialog({ open, onOpenChange, onCreated }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState(emptyForm);

  const createMut = useMutation({
    mutationFn: createVehicleDepartment,
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: ["vehicle-departments"] });
      onCreated({
        id: row.id,
        name: row.name,
        description: row.description,
        isCustom: true,
      });
      toast.success(`Department “${row.name}” added`);
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
          <DialogTitle>Add department</DialogTitle>
          <DialogDescription>Register a fleet department for vehicle assignment and reporting.</DialogDescription>
        </DialogHeader>
        <DialogForm
          onSubmit={(e) => {
            e.preventDefault();
            const name = form.name.trim();
            if (!name) {
              toast.error("Enter a department name");
              return;
            }
            if (isReservedBuiltinDepartmentName(name)) {
              toast.error("That name is reserved — pick it from the list instead");
              return;
            }
            createMut.mutate({ name, description: form.description.trim() });
          }}
        >
          <div className={DIALOG_FORM_FIELD}>
            <Label>Department name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              autoFocus
              required
            />
          </div>
          <div className={DIALOG_FORM_FULL}>
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="mt-2"
            />
          </div>
          <Button type="submit" className={DIALOG_FORM_FULL} disabled={createMut.isPending}>
            {createMut.isPending ? "Saving…" : "Save department"}
          </Button>
        </DialogForm>
      </DialogContent>
    </Dialog>
  );
}
