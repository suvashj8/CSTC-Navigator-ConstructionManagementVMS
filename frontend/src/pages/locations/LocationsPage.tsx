import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { createLocation, listLocations, updateLocation } from "@/api/locations";
import { listUsers } from "@/api/users";
import { PageShell } from "@/components/layout/page-shell";
import { MobileCard, MobileCardList } from "@/components/layout/mobile-card";
import { ResponsiveTable } from "@/components/layout/responsive-table";
import { PermissionGate } from "@/guards/ProtectedRoute";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DIALOG_FORM_FIELD, DIALOG_FORM_FULL, DialogForm } from "@/components/ui/dialog-form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectEmpty, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { WorkLocation } from "@/types/domain";

const LOCATION_TYPES = [
  { value: "construction", label: "Construction site" },
  { value: "workshop", label: "Workshop" },
  { value: "yard", label: "Yard / depot" },
  { value: "office", label: "Office" },
] as const;

type LocationForm = {
  name: string;
  type: string;
  address: string;
  manager_id: string;
};

const emptyForm = (): LocationForm => ({
  name: "",
  type: "construction",
  address: "",
  manager_id: "",
});

function locationToForm(l: WorkLocation): LocationForm {
  return {
    name: l.name,
    type: l.type,
    address: l.address ?? "",
    manager_id: l.manager_id ?? "",
  };
}

export default function LocationsPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<WorkLocation | null>(null);
  const [form, setForm] = useState<LocationForm>(emptyForm());

  const { data = [], isLoading } = useQuery({ queryKey: ["locations"], queryFn: listLocations });
  const { data: usersData } = useQuery({
    queryKey: ["users", "managers"],
    queryFn: () => listUsers({ per_page: 50 }),
    enabled: modal !== null,
    staleTime: 120_000,
  });
  const managers = (usersData?.rows ?? []).filter((u) => u.role === "manager" || u.role === "admin");

  const closeModal = () => {
    setModal(null);
    setEditing(null);
    setForm(emptyForm());
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setModal("create");
  };

  const openEdit = (l: WorkLocation) => {
    setEditing(l);
    setForm(locationToForm(l));
    setModal("edit");
  };

  const onSuccess = (message: string) => {
    toast.success(message);
    qc.invalidateQueries({ queryKey: ["locations"] });
    closeModal();
  };

  const createMut = useMutation({
    mutationFn: createLocation,
    onSuccess: () => onSuccess("Location added"),
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof updateLocation>[1] }) => updateLocation(id, body),
    onSuccess: () => onSuccess("Location updated"),
    onError: (e: Error) => toast.error(e.message),
  });

  const setField = <K extends keyof LocationForm>(key: K, value: LocationForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Location name is required");
      return;
    }
    const body = {
      name: form.name.trim(),
      type: form.type,
      address: form.address.trim(),
      manager_id: form.manager_id || null,
    };
    if (modal === "create") createMut.mutate(body);
    else if (editing) updateMut.mutate({ id: editing.id, body });
  };

  const saving = createMut.isPending || updateMut.isPending;

  const editButton = (l: WorkLocation) => (
    <PermissionGate permission="manage_locations" roles={["admin", "manager"]}>
      <Button size="sm" variant="ghost" onClick={() => openEdit(l)}>
        <Pencil className="h-4 w-4" />
        Edit
      </Button>
    </PermissionGate>
  );

  return (
    <PageShell
      title="Work locations"
      description="Construction sites, workshops, and yards where assets are deployed."
      actions={
        <PermissionGate permission="manage_locations" roles={["admin", "manager"]}>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add location
          </Button>
        </PermissionGate>
      }
    >
      <Card>
        <CardContent className="p-0">
          <ResponsiveTable
            mobile={
              <MobileCardList className="p-3">
                {isLoading && <Skeleton className="h-24 w-full" />}
                {!isLoading && data.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">No locations yet.</p>
                )}
                {data.map((l) => (
                  <MobileCard
                    key={l.id}
                    title={l.name}
                    subtitle={l.type}
                    fields={[
                      { label: "Manager", value: l.manager_name ?? "—" },
                      { label: "Address", value: l.address || "—" },
                    ]}
                    actions={editButton(l)}
                  />
                ))}
              </MobileCardList>
            }
            desktop={
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Custom</TableHead>
                    <TableHead className="w-[90px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    </TableRow>
                  ) : data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                        No locations yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="font-medium">{l.name}</TableCell>
                        <TableCell className="capitalize">{l.type.replace(/_/g, " ")}</TableCell>
                        <TableCell>{l.manager_name ?? "—"}</TableCell>
                        <TableCell>{l.address || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={l.is_custom ? "secondary" : "outline"}>
                            {l.is_custom ? "Custom" : "Standard"}
                          </Badge>
                        </TableCell>
                        <TableCell>{editButton(l)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            }
          />
        </CardContent>
      </Card>

      <Dialog open={modal !== null} onOpenChange={(o) => !o && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{modal === "edit" ? "Edit location" : "Add location"}</DialogTitle>
            <DialogDescription>
              {modal === "edit"
                ? "Update site details, type, or assigned manager."
                : "Register a construction site, workshop, or yard for asset deployment and allocations."}
            </DialogDescription>
          </DialogHeader>
          <DialogForm onSubmit={handleSubmit}>
            <div className={DIALOG_FORM_FIELD}>
              <Label>Name</Label>
              <Input
                placeholder="e.g. Bhaktapur Ring Road Site"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                required
              />
            </div>
            <div className={DIALOG_FORM_FIELD}>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setField("type", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOCATION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={DIALOG_FORM_FIELD}>
              <Label>Address</Label>
              <Input
                placeholder="City, province"
                value={form.address}
                onChange={(e) => setField("address", e.target.value)}
              />
            </div>
            <div className={DIALOG_FORM_FIELD}>
              <Label>Site manager</Label>
              <Select
                value={form.manager_id || "none"}
                onValueChange={(v) => setField("manager_id", v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not assigned</SelectItem>
                  {managers.length === 0 ? (
                    <SelectEmpty message="No managers available" />
                  ) : (
                    managers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className={DIALOG_FORM_FULL} disabled={saving}>
              {saving ? "Saving…" : modal === "edit" ? "Save changes" : "Create location"}
            </Button>
          </DialogForm>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
