import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { PaginationBar } from "@/components/layout/pagination-bar";
import { formatNepalDate, toDateInputValue } from "@/lib/nepalDate";
import { cn } from "@/lib/utils";
import { DEFAULT_PER_PAGE } from "@/lib/pagination";
import { toast } from "sonner";
import { createInsurance, listInsurance, updateInsurance } from "@/api/insurance";
import { listAssets } from "@/api/assets";
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
import type { CoverageType, InsurancePolicy } from "@/types/domain";

const COVERAGE_TYPES: { value: CoverageType; label: string }[] = [
  { value: "comprehensive", label: "Comprehensive" },
  { value: "third_party", label: "Third party" },
  { value: "fire_theft", label: "Fire & theft" },
  { value: "liability", label: "Liability" },
];

const POLICY_STATUSES: { value: InsurancePolicy["status"]; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "expiring", label: "Expiring" },
  { value: "expired", label: "Expired" },
];

type InsuranceForm = {
  asset_id: string;
  policy_no: string;
  insurer_name: string;
  coverage_type: CoverageType;
  insured_value: string;
  premium_amount: string;
  start_date: string;
  expiry_date: string;
  status: InsurancePolicy["status"];
};

const emptyForm = (): InsuranceForm => ({
  asset_id: "",
  policy_no: "",
  insurer_name: "",
  coverage_type: "comprehensive",
  insured_value: "",
  premium_amount: "",
  start_date: "",
  expiry_date: "",
  status: "active",
});

function policyToForm(p: InsurancePolicy): InsuranceForm {
  return {
    asset_id: p.asset_id,
    policy_no: p.policy_no,
    insurer_name: p.insurer_name,
    coverage_type: p.coverage_type,
    insured_value: String(p.insured_value),
    premium_amount: String(p.premium_amount),
    start_date: toDateInputValue(p.start_date),
    expiry_date: toDateInputValue(p.expiry_date),
    status: p.status,
  };
}

function statusBadgeClass(status: string) {
  if (status === "expiring") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "expired") return "border-red-200 bg-red-50 text-red-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

export default function InsurancePage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<InsurancePolicy | null>(null);
  const [form, setForm] = useState<InsuranceForm>(emptyForm());

  const { data, isLoading } = useQuery({
    queryKey: ["insurance", page],
    queryFn: () => listInsurance({ page, per_page: DEFAULT_PER_PAGE }),
  });
  const { data: assetsData } = useQuery({
    queryKey: ["assets", "insurance-pick"],
    queryFn: () => listAssets({ per_page: 30, status: "active" }),
    enabled: modal !== null,
    staleTime: 120_000,
  });
  const assets = assetsData?.rows ?? [];

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

  const openEdit = (p: InsurancePolicy) => {
    setEditing(p);
    setForm(policyToForm(p));
    setModal("edit");
  };

  const onSuccess = (message: string) => {
    toast.success(message);
    qc.invalidateQueries({ queryKey: ["insurance"] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    closeModal();
  };

  const createMut = useMutation({
    mutationFn: createInsurance,
    onSuccess: () => onSuccess("Insurance policy added"),
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof updateInsurance>[1] }) => updateInsurance(id, body),
    onSuccess: () => onSuccess("Policy updated"),
    onError: (e: Error) => toast.error(e.message),
  });

  const setField = <K extends keyof InsuranceForm>(key: K, value: InsuranceForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.policy_no.trim()) {
      toast.error("Policy number is required");
      return;
    }
    if (!form.expiry_date) {
      toast.error("Expiry date is required for monitoring");
      return;
    }
    if (modal === "create") {
      if (!form.asset_id) {
        toast.error("Select an asset");
        return;
      }
      createMut.mutate({
        asset_id: form.asset_id,
        policy_no: form.policy_no.trim(),
        insurer_name: form.insurer_name.trim(),
        coverage_type: form.coverage_type,
        insured_value: parseFloat(form.insured_value) || 0,
        premium_amount: parseFloat(form.premium_amount) || 0,
        start_date: form.start_date,
        expiry_date: form.expiry_date,
        status: form.status,
      });
    } else if (editing) {
      updateMut.mutate({
        id: editing.id,
        body: {
          policy_no: form.policy_no.trim(),
          insurer_name: form.insurer_name.trim(),
          coverage_type: form.coverage_type,
          insured_value: parseFloat(form.insured_value) || 0,
          premium_amount: parseFloat(form.premium_amount) || 0,
          start_date: form.start_date,
          expiry_date: form.expiry_date,
          status: form.status,
        },
      });
    }
  };

  const saving = createMut.isPending || updateMut.isPending;
  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;

  const editButton = (p: InsurancePolicy) => (
    <PermissionGate permission="manage_insurance">
      <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>
        <Pencil className="h-4 w-4" />
        Edit
      </Button>
    </PermissionGate>
  );

  return (
    <PageShell
      title="Insurance"
      description="Vehicle and equipment insurance policies with expiry monitoring."
      actions={
        <PermissionGate permission="manage_insurance">
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add policy
          </Button>
        </PermissionGate>
      }
    >
      <Card>
        <CardContent className="p-0">
          <ResponsiveTable
            scrollMinClass="min-w-[52rem]"
            mobile={
              <MobileCardList className="p-3">
                {isLoading &&
                  Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
                {!isLoading && rows.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">No policies yet.</p>
                )}
                {rows.map((p) => (
                  <MobileCard
                    key={p.id}
                    title={p.asset_label ?? p.asset_id}
                    subtitle={p.policy_no}
                    fields={[
                      { label: "Insurer", value: p.insurer_name },
                      { label: "Expiry", value: formatNepalDate(p.expiry_date) },
                      {
                        label: "Status",
                        value: (
                          <Badge variant="outline" className={statusBadgeClass(p.status)}>
                            {p.status}
                          </Badge>
                        ),
                      },
                    ]}
                    actions={editButton(p)}
                  />
                ))}
              </MobileCardList>
            }
            desktop={
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Policy no.</TableHead>
                    <TableHead>Insurer</TableHead>
                    <TableHead>Coverage</TableHead>
                    <TableHead>Insured value</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[90px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading &&
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }).map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  {!isLoading && rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                        No policies yet.
                      </TableCell>
                    </TableRow>
                  )}
                  {rows.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.asset_label}</TableCell>
                      <TableCell className="font-mono text-sm">{p.policy_no}</TableCell>
                      <TableCell>{p.insurer_name}</TableCell>
                      <TableCell className="capitalize">{p.coverage_type.replace(/_/g, " ")}</TableCell>
                      <TableCell>{p.insured_value.toLocaleString()}</TableCell>
                      <TableCell>{formatNepalDate(p.expiry_date)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusBadgeClass(p.status)}>
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{editButton(p)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            }
          />
          <PaginationBar page={page} total={total} label="policies" onPageChange={setPage} />
        </CardContent>
      </Card>

      <Dialog open={modal !== null} onOpenChange={(o) => !o && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{modal === "edit" ? "Edit insurance policy" : "Add insurance policy"}</DialogTitle>
            <DialogDescription>
              {modal === "edit"
                ? "Update policy details, coverage, or expiry. The linked asset cannot be changed."
                : "Link a policy to an asset. Expiry dates trigger dashboard alerts and scheduled notifications."}
            </DialogDescription>
          </DialogHeader>
          <DialogForm onSubmit={handleSubmit}>
            <div className={cn(DIALOG_FORM_FIELD, DIALOG_FORM_FULL)}>
              <Label>Asset</Label>
              {modal === "edit" ? (
                <Input value={editing?.asset_label ?? editing?.asset_id ?? ""} disabled />
              ) : (
                <Select value={form.asset_id || undefined} onValueChange={(v) => setField("asset_id", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle or equipment" />
                  </SelectTrigger>
                  <SelectContent>
                    {assets.length === 0 ? (
                      <SelectEmpty message="No active assets" />
                    ) : (
                      assets.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.reg_serial_no} — {a.make} {a.model}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className={DIALOG_FORM_FIELD}>
              <Label>Policy number</Label>
              <Input
                placeholder="POL-2026-00001"
                value={form.policy_no}
                onChange={(e) => setField("policy_no", e.target.value)}
                required
              />
            </div>
            <div className={DIALOG_FORM_FIELD}>
              <Label>Insurer</Label>
              <Input
                placeholder="e.g. Sagarmatha Insurance"
                value={form.insurer_name}
                onChange={(e) => setField("insurer_name", e.target.value)}
              />
            </div>
            <div className={DIALOG_FORM_FIELD}>
              <Label>Coverage type</Label>
              <Select
                value={form.coverage_type}
                onValueChange={(v) => setField("coverage_type", v as CoverageType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COVERAGE_TYPES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={DIALOG_FORM_FIELD}>
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setField("status", v as InsurancePolicy["status"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POLICY_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={DIALOG_FORM_FIELD}>
              <Label>Insured value (NPR)</Label>
              <Input
                inputMode="decimal"
                value={form.insured_value}
                onChange={(e) => setField("insured_value", e.target.value.replace(/[^\d.]/g, ""))}
              />
            </div>
            <div className={DIALOG_FORM_FIELD}>
              <Label>Premium (NPR)</Label>
              <Input
                inputMode="decimal"
                value={form.premium_amount}
                onChange={(e) => setField("premium_amount", e.target.value.replace(/[^\d.]/g, ""))}
              />
            </div>
            <div className={DIALOG_FORM_FIELD}>
              <Label>Start date</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setField("start_date", e.target.value)}
              />
            </div>
            <div className={DIALOG_FORM_FIELD}>
              <Label>Expiry date</Label>
              <Input
                type="date"
                value={form.expiry_date}
                onChange={(e) => setField("expiry_date", e.target.value)}
                required
              />
            </div>
            <Button type="submit" className={DIALOG_FORM_FULL} disabled={saving}>
              {saving ? "Saving…" : modal === "edit" ? "Save changes" : "Create policy"}
            </Button>
          </DialogForm>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
