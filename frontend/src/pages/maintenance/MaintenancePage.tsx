import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createMaintenance, deleteMaintenance, listMaintenance } from "@/api/maintenance";
import { SupplierLink, SupplierSelect } from "@/components/operations/supplier-select";
import { VehicleSelect } from "@/components/operations/vehicle-select";
import { MAINTENANCE_SUPPLIER_CATEGORIES } from "@/lib/supplier-categories";
import { PageShell } from "@/components/layout/page-shell";
import { PaginationBar } from "@/components/layout/pagination-bar";
import { MobileCard, MobileCardList } from "@/components/layout/mobile-card";
import { ResponsiveTable } from "@/components/layout/responsive-table";
import { PermissionGate } from "@/guards/ProtectedRoute";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEFAULT_PER_PAGE } from "@/lib/pagination";
import type { MaintenanceJob, MaintenanceStatus } from "@/types/domain";

const STATUSES: MaintenanceStatus[] = ["Scheduled", "In progress", "Completed"];

function statusVariant(status: string): "default" | "secondary" | "outline" {
  if (status === "Completed") return "default";
  if (status === "In progress") return "secondary";
  return "outline";
}

export default function MaintenancePage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [vehicleId, setVehicleId] = useState("");
  const [desc, setDesc] = useState("");
  const [status, setStatus] = useState<MaintenanceStatus>("Scheduled");
  const [vendorId, setVendorId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [completedAt, setCompletedAt] = useState("");
  const [odometer, setOdometer] = useState("");
  const [partsCost, setPartsCost] = useState("");
  const [laborCost, setLaborCost] = useState("");

  useEffect(() => setPage(1), [vehicleId]);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["maintenance", page, vehicleId],
    queryFn: () =>
      listMaintenance({
        page,
        per_page: DEFAULT_PER_PAGE,
        asset_id: vehicleId || undefined,
      }),
    staleTime: 30_000,
  });

  const createMut = useMutation({
    mutationFn: createMaintenance,
    onSuccess: () => {
      toast.success("Work order added");
      setDesc("");
      setScheduledAt("");
      setCompletedAt("");
      setOdometer("");
      setPartsCost("");
      setLaborCost("");
      setStatus("Scheduled");
      setVendorId("");
      void qc.invalidateQueries({ queryKey: ["maintenance"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: deleteMaintenance,
    onSuccess: () => {
      toast.success("Work order removed");
      void qc.invalidateQueries({ queryKey: ["maintenance"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = data?.rows ?? [];

  return (
    <PageShell
      title="Maintenance"
      description="Work orders: Scheduled → In progress → Completed. Vendors are linked to records in Suppliers (repair / parts)."
      actions={
        <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      }
    >
      <PermissionGate minRole="manager">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <h2 className="text-sm font-semibold">Work orders</h2>
            <div className="grid items-end gap-4 sm:grid-cols-2 desktop:grid-cols-4">
              <VehicleSelect value={vehicleId} onChange={setVehicleId} label="Vehicle" required />
              <div className="flex flex-col gap-2">
                <Label className="h-5 leading-none">Description</Label>
                <Input className="h-10" placeholder="Oil change" value={desc} onChange={(e) => setDesc(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label className="h-5 leading-none">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as MaintenanceStatus)}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <SupplierSelect
                value={vendorId}
                onChange={setVendorId}
                categories={MAINTENANCE_SUPPLIER_CATEGORIES}
                label="Supplier"
              />
              <div className="flex flex-col gap-2">
                <Label className="h-5 leading-none">Scheduled date</Label>
                <Input className="h-10" type="date" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label className="h-5 leading-none">Completed date</Label>
                <Input className="h-10" type="date" value={completedAt} onChange={(e) => setCompletedAt(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label className="h-5 leading-none">Odometer at service (km)</Label>
                <Input
                  className="h-10"
                  inputMode="numeric"
                  value={odometer}
                  onChange={(e) => setOdometer(e.target.value.replace(/[^\d]/g, ""))}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label className="h-5 leading-none">Parts cost (NPR)</Label>
                <Input
                  className="h-10"
                  inputMode="decimal"
                  value={partsCost}
                  onChange={(e) => setPartsCost(e.target.value.replace(/[^\d.]/g, ""))}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label className="h-5 leading-none">Labor cost (NPR)</Label>
                <Input
                  className="h-10"
                  inputMode="decimal"
                  value={laborCost}
                  onChange={(e) => setLaborCost(e.target.value.replace(/[^\d.]/g, ""))}
                />
              </div>
            </div>
            <Button
              className="w-full sm:w-auto"
              disabled={!vehicleId || !desc.trim() || createMut.isPending}
              onClick={() =>
                createMut.mutate({
                  asset_id: vehicleId,
                  supplier_id: vendorId || undefined,
                  scheduled_at: scheduledAt || undefined,
                  completed_at: completedAt || undefined,
                  status,
                  description: desc.trim(),
                  odometer_at_service: odometer ? Number(odometer) : undefined,
                  parts_cost: partsCost ? Number(partsCost) : undefined,
                  labor_cost: laborCost ? Number(laborCost) : undefined,
                })
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Add work order
            </Button>
          </CardContent>
        </Card>
      </PermissionGate>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <>
              <ResponsiveTable
                mobile={
                  <MobileCardList>
                    {rows.length === 0 ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">No work orders</p>
                    ) : (
                      rows.map((m: MaintenanceJob) => (
                        <MobileCard key={m.id} title={m.description || "Work order"}>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant={statusVariant(m.status)}>{m.status}</Badge>
                            {m.asset_label ? (
                              <Badge variant="outline">{m.asset_label}</Badge>
                            ) : null}
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                            <span className="text-muted-foreground">Scheduled</span>
                            <span>{m.scheduled_at ?? "—"}</span>
                            <span className="text-muted-foreground">Supplier</span>
                            <span>
                              <SupplierLink supplierId={m.supplier_id} supplierName={m.supplier_name} />
                            </span>
                            <span className="text-muted-foreground">ODO</span>
                            <span>{m.odometer_at_service ?? "—"}</span>
                            <span className="text-muted-foreground">Parts</span>
                            <span>{m.parts_cost != null ? `NPR ${m.parts_cost}` : "—"}</span>
                            <span className="text-muted-foreground">Labor</span>
                            <span>{m.labor_cost != null ? `NPR ${m.labor_cost}` : "—"}</span>
                          </div>
                          <PermissionGate minRole="manager">
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-3 w-full text-destructive"
                              onClick={() => deleteMut.mutate(m.id)}
                            >
                              Delete
                            </Button>
                          </PermissionGate>
                        </MobileCard>
                      ))
                    )}
                  </MobileCardList>
                }
                desktop={
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>VEHICLE</TableHead>
                        <TableHead>DESCRIPTION</TableHead>
                        <TableHead>STATUS</TableHead>
                        <TableHead>SCHEDULED</TableHead>
                        <TableHead>SUPPLIER</TableHead>
                        <TableHead>ODO</TableHead>
                        <TableHead>COST</TableHead>
                        <TableHead className="w-12" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground">
                            No work orders
                          </TableCell>
                        </TableRow>
                      ) : (
                        rows.map((m) => {
                          const total =
                            (m.parts_cost ?? 0) + (m.labor_cost ?? 0) || null;
                          return (
                            <TableRow key={m.id}>
                              <TableCell className="whitespace-nowrap">
                                {m.asset_label ?? "—"}
                              </TableCell>
                              <TableCell>{m.description ?? "—"}</TableCell>
                              <TableCell>
                                <Badge variant={statusVariant(m.status)}>{m.status}</Badge>
                              </TableCell>
                              <TableCell>{m.scheduled_at ?? "—"}</TableCell>
                              <TableCell>
                                <SupplierLink supplierId={m.supplier_id} supplierName={m.supplier_name} />
                              </TableCell>
                              <TableCell>{m.odometer_at_service ?? "—"}</TableCell>
                              <TableCell>
                                {total != null && total > 0 ? `NPR ${total}` : "—"}
                              </TableCell>
                              <TableCell>
                                <PermissionGate minRole="manager">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive"
                                    onClick={() => deleteMut.mutate(m.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </PermissionGate>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                }
              />
              <PaginationBar
                page={page}
                total={data?.total ?? 0}
                perPage={DEFAULT_PER_PAGE}
                onPageChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
