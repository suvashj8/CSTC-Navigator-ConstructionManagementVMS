import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { createOperationMode } from "@/api/operationModes";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DIALOG_FORM_FIELD, DIALOG_FORM_FULL, DialogForm } from "@/components/ui/dialog-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  isReservedBuiltinOperationModeName,
  normalizeFieldLabels,
  PLACE_HR_LABEL,
  ROUTE_KM_LABEL,
  type OperationModeMeta,
} from "@/lib/operationModeCatalog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (meta: OperationModeMeta) => void;
};

const emptyForm = () => ({
  name: "",
  description: "",
  fields: ["", ""],
});

export function AddOperationModeDialog({ open, onOpenChange, onCreated }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState(emptyForm);

  const createMut = useMutation({
    mutationFn: createOperationMode,
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: ["operation-modes"] });
      const fieldLabels = normalizeFieldLabels(row.field_labels);
      onCreated({
        id: row.id,
        name: row.name,
        description: row.description,
        trackingType: "custom",
        fieldLabels,
        isCustom: true,
      });
      toast.success(`Operation mode “${row.name}” added`);
      setForm(emptyForm());
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleClose = (next: boolean) => {
    if (!next) setForm(emptyForm());
    onOpenChange(next);
  };

  const setField = (index: number, value: string) => {
    setForm((f) => {
      const fields = [...f.fields];
      fields[index] = value;
      return { ...f, fields };
    });
  };

  const addField = () => setForm((f) => ({ ...f, fields: [...f.fields, ""] }));

  const removeField = (index: number) => {
    setForm((f) => {
      if (f.fields.length <= 1) return f;
      return { ...f, fields: f.fields.filter((_, i) => i !== index) };
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add operation mode</DialogTitle>
          <DialogDescription>
            Name your mode and choose which fields appear when recording operation (e.g. Site, Load, Depth).
          </DialogDescription>
        </DialogHeader>
        <DialogForm
          onSubmit={(e) => {
            e.preventDefault();
            const name = form.name.trim();
            if (!name) {
              toast.error("Enter a mode name");
              return;
            }
            if (isReservedBuiltinOperationModeName(name)) {
              toast.error("That name is reserved — pick it from the list instead");
              return;
            }
            const field_labels = normalizeFieldLabels(form.fields);
            if (field_labels.length === 0) {
              toast.error("Add at least one field label");
              return;
            }
            createMut.mutate({
              name,
              description: form.description.trim(),
              field_labels,
            });
          }}
        >
          <div className={DIALOG_FORM_FIELD}>
            <Label>Mode name *</Label>
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
              rows={2}
              className="mt-2"
            />
          </div>
          <div className={DIALOG_FORM_FULL}>
            <Label>How it works — field labels *</Label>
            <p className="mb-2 text-xs text-muted-foreground">
              Each label becomes an input on the form. Or start from a built-in template:
            </p>
            <div className="mb-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setForm((f) => ({ ...f, fields: ["From", "To", "KM"] }))
                }
              >
                Like {ROUTE_KM_LABEL}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setForm((f) => ({ ...f, fields: ["Place", "Hr", "Min"] }))
                }
              >
                Like {PLACE_HR_LABEL}
              </Button>
            </div>
            <div className="space-y-2">
              {form.fields.map((field, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={field}
                    onChange={(e) => setField(index, e.target.value)}
                    placeholder={`Field ${index + 1} name`}
                  />
                  {form.fields.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      aria-label="Remove field"
                      onClick={() => removeField(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={addField}>
              <Plus className="h-4 w-4" />
              Add field
            </Button>
          </div>
          <Button type="submit" className={DIALOG_FORM_FULL} disabled={createMut.isPending}>
            {createMut.isPending ? "Saving…" : "Save mode"}
          </Button>
        </DialogForm>
      </DialogContent>
    </Dialog>
  );
}
