import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { createOwnershipType } from "@/api/ownershipTypes";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DIALOG_FORM_FIELD, DIALOG_FORM_FULL, DialogForm } from "@/components/ui/dialog-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { isReservedBuiltinOwnershipName, type OwnershipTypeMeta } from "@/lib/ownershipTypeCatalog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (meta: OwnershipTypeMeta) => void;
};

export function AddOwnershipTypeDialog({ open, onOpenChange, onCreated }: Props) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const createMut = useMutation({
    mutationFn: createOwnershipType,
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: ["ownership-types"] });
      onCreated({ id: row.id, key: row.name, name: row.name, description: row.description, isCustom: true });
      toast.success(`Ownership type “${row.name}” added`);
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
          <DialogTitle>Add ownership type</DialogTitle>
          <DialogDescription>Define how this asset is held (e.g. subcontracted, hired with operator).</DialogDescription>
        </DialogHeader>
        <DialogForm
          onSubmit={(e) => {
            e.preventDefault();
            const n = name.trim();
            if (!n) return toast.error("Enter a name");
            if (isReservedBuiltinOwnershipName(n)) return toast.error("That name is reserved — pick it from the list");
            createMut.mutate({ name: n, description: description.trim() });
          }}
        >
          <div className={DIALOG_FORM_FIELD}>
            <Label>Type name *</Label>
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
