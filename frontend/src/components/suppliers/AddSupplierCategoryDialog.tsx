import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { createSupplierCategory } from "@/api/supplierCategories";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DIALOG_FORM_FIELD, DIALOG_FORM_FULL, DialogForm } from "@/components/ui/dialog-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { isReservedBuiltinSupplierCategoryName, type SupplierCategoryMeta } from "@/lib/supplierCategoryCatalog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (meta: SupplierCategoryMeta) => void;
};

export function AddSupplierCategoryDialog({ open, onOpenChange, onCreated }: Props) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const createMut = useMutation({
    mutationFn: createSupplierCategory,
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: ["supplier-categories"] });
      onCreated({ id: row.id, key: row.name, name: row.name, description: row.description, isCustom: true });
      toast.success(`Category “${row.name}” added`);
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
          <DialogTitle>Add supplier category</DialogTitle>
          <DialogDescription>Custom vendor type for your procurement and maintenance workflows.</DialogDescription>
        </DialogHeader>
        <DialogForm
          onSubmit={(e) => {
            e.preventDefault();
            const n = name.trim();
            if (!n) return toast.error("Enter a category name");
            if (isReservedBuiltinSupplierCategoryName(n)) return toast.error("That name is reserved — pick it from the list");
            createMut.mutate({ name: n, description: description.trim() });
          }}
        >
          <div className={DIALOG_FORM_FIELD}>
            <Label>Category name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Welding services" autoFocus required />
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
