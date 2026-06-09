import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { createMaintenanceStatus } from "@/api/maintenanceStatuses";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DIALOG_FORM_FIELD, DIALOG_FORM_FULL, DialogForm } from "@/components/ui/dialog-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { isReservedBuiltinMaintenanceStatus, type MaintenanceStatusMeta } from "@/lib/maintenanceStatusCatalog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (meta: MaintenanceStatusMeta) => void;
};

export function AddMaintenanceStatusDialog({ open, onOpenChange, onCreated }: Props) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const createMut = useMutation({
    mutationFn: createMaintenanceStatus,
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: ["maintenance-statuses"] });
      onCreated({ id: row.id, name: row.name, description: row.description, isCustom: true });
      toast.success(`Status “${row.name}” added`);
      setName("");
      setDescription("");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setName(""); setDescription(""); } onOpenChange(o); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add maintenance status</DialogTitle>
          <DialogDescription>Custom work-order status for your site workflow.</DialogDescription>
        </DialogHeader>
        <DialogForm
          onSubmit={(e) => {
            e.preventDefault();
            const n = name.trim();
            if (!n) return toast.error("Enter a status name");
            if (isReservedBuiltinMaintenanceStatus(n)) return toast.error("That name is reserved — pick it from the list");
            createMut.mutate({ name: n, description: description.trim() });
          }}
        >
          <div className={DIALOG_FORM_FIELD}>
            <Label>Status name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Awaiting parts" autoFocus required />
          </div>
          <div className={DIALOG_FORM_FULL}>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-2" />
          </div>
          <Button type="submit" className={DIALOG_FORM_FULL} disabled={createMut.isPending}>
            {createMut.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogForm>
      </DialogContent>
    </Dialog>
  );
}
