import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { createAssetType } from "@/api/assetTypes";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DIALOG_FORM_FIELD, DIALOG_FORM_FULL, DialogForm } from "@/components/ui/dialog-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { isReservedBuiltinAssetTypeName, type AssetTypeMeta } from "@/lib/assetTypeCatalog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (meta: AssetTypeMeta) => void;
};

const emptyForm = () => ({
  name: "",
  description: "",
});

export function AddAssetTypeDialog({ open, onOpenChange, onCreated }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState(emptyForm);

  const createMut = useMutation({
    mutationFn: createAssetType,
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: ["asset-types"] });
      onCreated({
        id: row.id,
        key: row.name,
        name: row.name,
        description: row.description,
        isCustom: true,
      });
      toast.success(`Asset type “${row.name}” added`);
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
          <DialogTitle>Add asset type</DialogTitle>
          <DialogDescription>
            Define a custom asset type for your fleet. It will appear in the asset type dropdown for future registrations.
          </DialogDescription>
        </DialogHeader>
        <DialogForm
          onSubmit={(e) => {
            e.preventDefault();
            const name = form.name.trim();
            if (!name) {
              toast.error("Enter an asset type name");
              return;
            }
            if (isReservedBuiltinAssetTypeName(name)) {
              toast.error("That name is reserved — pick it from the list instead");
              return;
            }
            createMut.mutate({ name, description: form.description.trim() });
          }}
        >
          <div className={DIALOG_FORM_FIELD}>
            <Label>Type name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Generator, Mobile crane"
              autoFocus
              required
            />
          </div>
          <div className={DIALOG_FORM_FULL}>
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="What this asset type is used for on site"
              rows={3}
              className="mt-2"
            />
          </div>
          <Button type="submit" className={DIALOG_FORM_FULL} disabled={createMut.isPending}>
            {createMut.isPending ? "Saving…" : "Save asset type"}
          </Button>
        </DialogForm>
      </DialogContent>
    </Dialog>
  );
}
