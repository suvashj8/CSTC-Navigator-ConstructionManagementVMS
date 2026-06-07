import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createSupplier, listSuppliers, updateSupplier } from "@/api/suppliers";
import { FilterRow, PageShell } from "@/components/layout/page-shell";
import { PaginationBar } from "@/components/layout/pagination-bar";
import { DEFAULT_PER_PAGE } from "@/lib/pagination";
import { MobileCard, MobileCardList } from "@/components/layout/mobile-card";
import { ResponsiveTable } from "@/components/layout/responsive-table";
import { PermissionGate } from "@/guards/ProtectedRoute";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { Supplier, SupplierCategory } from "@/types/domain";

const SUPPLIER_CATEGORIES: { value: SupplierCategory; label: string }[] = [
  { value: "repair", label: "Repair shop" },
  { value: "parts", label: "Parts vendor" },
  { value: "fuel", label: "Fuel depot" },
  { value: "rental", label: "Rental partner" },
  { value: "other", label: "Other" },
];

type SupplierForm = {
  name: string;
  category: SupplierCategory;
  contact_name: string;
  email: string;
  phone: string;
  rating: string;
  is_preferred: boolean;
};

const emptyForm = (): SupplierForm => ({
  name: "",
  category: "repair",
  contact_name: "",
  email: "",
  phone: "",
  rating: "3",
  is_preferred: false,
});

function supplierToForm(s: Supplier): SupplierForm {
  return {
    name: s.name,
    category: s.category,
    contact_name: s.contact_name,
    email: s.email,
    phone: s.phone,
    rating: String(s.rating),
    is_preferred: s.is_preferred,
  };
}

export default function SuppliersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState<SupplierForm>(emptyForm());

  useEffect(() => setPage(1), [search]);

  const { data, isLoading } = useQuery({
    queryKey: ["suppliers", page, search],
    queryFn: () => listSuppliers({ page, per_page: DEFAULT_PER_PAGE, search: search || undefined }),
  });

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

  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm(supplierToForm(s));
    setModal("edit");
  };

  const onSuccess = (message: string) => {
    toast.success(message);
    qc.invalidateQueries({ queryKey: ["suppliers"] });
    qc.invalidateQueries({ queryKey: ["suppliers-picker"] });
    closeModal();
  };

  const createMut = useMutation({
    mutationFn: createSupplier,
    onSuccess: () => onSuccess("Supplier added"),
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof updateSupplier>[1] }) => updateSupplier(id, body),
    onSuccess: () => onSuccess("Supplier updated"),
    onError: (e: Error) => toast.error(e.message),
  });

  const setField = <K extends keyof SupplierForm>(key: K, value: SupplierForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const buildBody = () => {
    const rating = Math.min(5, Math.max(1, parseInt(form.rating, 10) || 3));
    return {
      name: form.name.trim(),
      category: form.category,
      contact_name: form.contact_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      rating,
      is_preferred: form.is_preferred,
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Supplier name is required");
      return;
    }
    const body = buildBody();
    if (modal === "create") createMut.mutate(body);
    else if (editing) updateMut.mutate({ id: editing.id, body });
  };

  const saving = createMut.isPending || updateMut.isPending;
  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;

  const editButton = (s: Supplier) => (
    <PermissionGate permission="manage_suppliers">
      <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>
        <Pencil className="h-4 w-4" />
        Edit
      </Button>
    </PermissionGate>
  );

  return (
    <PageShell
      title="Suppliers"
      description="Master list of vendors. Repair shops and parts suppliers appear as selectable vendors on Operation → Maintenance work orders."
      actions={
        <PermissionGate permission="manage_suppliers">
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add supplier
          </Button>
        </PermissionGate>
      }
    >
      <FilterRow>
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name or category"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setSearch(searchInput)}
            className="pl-9"
          />
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            setSearch(searchInput);
            setPage(1);
          }}
        >
          Search
        </Button>
      </FilterRow>

      <Card>
        <CardContent className="p-0">
          <ResponsiveTable
            mobile={
              <MobileCardList className="p-3">
                {isLoading &&
                  Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
                {!isLoading && rows.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">No suppliers yet.</p>
                )}
                {rows.map((s) => (
                  <MobileCard
                    key={s.id}
                    title={s.name}
                    subtitle={s.category}
                    fields={[
                      { label: "Contact", value: s.contact_name || "—" },
                      { label: "Phone", value: s.phone || "—" },
                      { label: "Rating", value: `${s.rating}/5` },
                    ]}
                    actions={editButton(s)}
                  />
                ))}
              </MobileCardList>
            }
            desktop={
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Preferred</TableHead>
                    <TableHead className="w-[90px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading &&
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 7 }).map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  {!isLoading && rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                        No suppliers yet.
                      </TableCell>
                    </TableRow>
                  )}
                  {rows.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="capitalize">{s.category}</TableCell>
                      <TableCell>{s.contact_name}</TableCell>
                      <TableCell>{s.phone}</TableCell>
                      <TableCell>{s.rating}/5</TableCell>
                      <TableCell>
                        <Badge variant={s.is_preferred ? "default" : "outline"}>
                          {s.is_preferred ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell>{editButton(s)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            }
          />
          <PaginationBar page={page} total={total} label="suppliers" onPageChange={setPage} />
        </CardContent>
      </Card>

      <Dialog open={modal !== null} onOpenChange={(o) => !o && closeModal()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{modal === "edit" ? "Edit supplier" : "Add supplier"}</DialogTitle>
            <DialogDescription>
              {modal === "edit"
                ? "Update vendor contact details, category, or preferred status."
                : "Register vendors for repairs, fuel, parts, and rentals used across your fleet operations."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Company name</Label>
              <Input value={form.name} onChange={(e) => setField("name", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setField("category", v as SupplierCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPLIER_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Rating (1–5)</Label>
              <Select value={form.rating} onValueChange={(v) => setField("rating", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} / 5
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Contact person</Label>
              <Input value={form.contact_name} onChange={(e) => setField("contact_name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
              <div>
                <Label>Preferred vendor</Label>
                <p className="text-xs text-muted-foreground">Mark for quick selection in repairs and procurement</p>
              </div>
              <Switch checked={form.is_preferred} onCheckedChange={(v) => setField("is_preferred", v)} />
            </div>
            <Button type="submit" className="sm:col-span-2" disabled={saving}>
              {saving ? "Saving…" : modal === "edit" ? "Save changes" : "Create supplier"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
