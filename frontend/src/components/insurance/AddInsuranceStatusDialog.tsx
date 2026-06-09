import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { createInsuranceStatus } from "@/api/insuranceStatuses";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DIALOG_FORM_FIELD, DIALOG_FORM_FULL, DialogForm } from "@/components/ui/dialog-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { isReservedBuiltinInsuranceStatusName, type InsuranceStatusMeta } from "@/lib/insuranceStatusCatalog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (meta: InsuranceStatusMeta) => void;
};

export function AddInsuranceStatusDialog({ open, onOpenChange, onCreated }: Props) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const createMut = useMutation({
    mutationFn: createInsuranceStatus,
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: ["insurance-statuses"] });
      onCreated({ id: row.id, key: row.name, name: row.name, description: row.description, isCustom: true });
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
          <DialogTitle>Add custom policy status</DialogTitle>
          <DialogDescription>Define a status label beyond active, expiring, or expired.</DialogDescription>
        </DialogHeader>
        <DialogForm
          onSubmit={(e) => {
            e.preventDefault();
            const n = name.trim();
            if (!n) return toast.error("Enter a name");
            if (isReservedBuiltinInsuranceStatusName(n)) return toast.error("That name is reserved — pick it from the list");
            createMut.mutate({ name: n, description: description.trim() });
          }}
        >
          <div className={DIALOG_FORM_FIELD}>
            <Label>Status name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
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
