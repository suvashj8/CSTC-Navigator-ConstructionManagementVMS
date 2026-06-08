import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { createFuelLog, deleteFuelLog, listFuelLogs } from "@/api/fuel";
import { VehicleSelect } from "@/components/operations/vehicle-select";
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
import { DEFAULT_PER_PAGE } from "@/lib/pagination";
import { buildFuelInsights } from "@/lib/fuelInsights";
import type { FuelLog } from "@/types/domain";

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return iso.slice(0, 16).replace("T", " ");
}

export default function FuelLogsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [vehicleId, setVehicleId] = useState("");
  const [odometer, setOdometer] = useState("");
  const [liters, setLiters] = useState("");
  const [cost, setCost] = useState("");

  useEffect(() => setPage(1), [vehicleId]);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["fuel-logs", page, vehicleId],
    queryFn: () =>
      listFuelLogs({
        page,
        per_page: DEFAULT_PER_PAGE,
        asset_id: vehicleId || undefined,
      }),
    staleTime: 30_000,
  });

  const { data: insightData } = useQuery({
    queryKey: ["fuel-logs-insights", vehicleId],
    queryFn: () =>
      listFuelLogs({
        page: 1,
        per_page: 200,
        asset_id: vehicleId || undefined,
      }),
    enabled: !!vehicleId,
    staleTime: 30_000,
  });

  const insights = useMemo(
    () => buildFuelInsights(insightData?.rows ?? data?.rows ?? []),
    [insightData?.rows, data?.rows]
  );

  const createMut = useMutation({
    mutationFn: createFuelLog,
    onSuccess: () => {
      toast.success("Fuel log added");
      setOdometer("");
      setLiters("");
      setCost("");
      void qc.invalidateQueries({ queryKey: ["fuel-logs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: deleteFuelLog,
    onSuccess: () => {
      toast.success("Fuel log removed");
      void qc.invalidateQueries({ queryKey: ["fuel-logs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = data?.rows ?? [];

  const renderRow = (f: FuelLog) => {
    const ins = insights.get(f.id);
    return (
      <>
        <TableCell className="whitespace-nowrap">{formatDate(f.fueled_at)}</TableCell>
        <TableCell>{f.odometer_km ?? "—"}</TableCell>
        <TableCell>{f.liters ?? "—"}</TableCell>
        <TableCell>{ins?.deltaKm != null ? Math.round(ins.deltaKm) : "—"}</TableCell>
        <TableCell>
          {ins?.kmPerL != null && Number.isFinite(ins.kmPerL) ? ins.kmPerL.toFixed(1) : "—"}
        </TableCell>
        <TableCell className="max-w-[12rem] text-xs text-muted-foreground">
          {ins?.flags?.length ? ins.flags.join("; ") : "—"}
        </TableCell>
        <TableCell>{f.total_cost != null ? `NPR ${f.total_cost}` : "—"}</TableCell>
        <TableCell>
          <PermissionGate roles={["super_user", "admin", "manager"]}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => deleteMut.mutate(f.id)}
              disabled={deleteMut.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </PermissionGate>
        </TableCell>
      </>
    );
  };

  return (
    <PageShell
      title={vehicleId ? "Fuel logs (this vehicle)" : "Fuel logs"}
      description="Enter odometer on each fill to calculate km/L between consecutive fills on this vehicle."
      actions={
        <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      }
    >
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 sm:grid-cols-2 desktop:grid-cols-4">
            <VehicleSelect
              value={vehicleId}
              onChange={setVehicleId}
              label="Vehicle"
              required
              className="space-y-2 sm:col-span-2 lg:col-span-1"
            />
            <div className="space-y-2">
              <Label htmlFor="odo">Odometer km</Label>
              <Input
                id="odo"
                inputMode="numeric"
                placeholder="48500"
                value={odometer}
                onChange={(e) => setOdometer(e.target.value.replace(/[^\d]/g, ""))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="liters">Liters</Label>
              <Input
                id="liters"
                inputMode="decimal"
                placeholder="95"
                value={liters}
                onChange={(e) => setLiters(e.target.value.replace(/[^\d.]/g, ""))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost">Cost (NPR)</Label>
              <Input
                id="cost"
                inputMode="decimal"
                placeholder="15400"
                value={cost}
                onChange={(e) => setCost(e.target.value.replace(/[^\d.]/g, ""))}
              />
            </div>
          </div>

          <PermissionGate permission="manage_fuel">
            <Button
              className="w-full sm:w-auto"
              disabled={!vehicleId || createMut.isPending}
              onClick={() =>
                createMut.mutate({
                  asset_id: vehicleId,
                  odometer_km: odometer ? Number(odometer) : undefined,
                  liters: liters ? Number(liters) : undefined,
                  total_cost: cost ? Number(cost) : undefined,
                  fueled_at: new Date().toISOString(),
                })
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Add fuel log
            </Button>
          </PermissionGate>
        </CardContent>
      </Card>

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
                      <p className="py-8 text-center text-sm text-muted-foreground">No fuel logs</p>
                    ) : (
                      rows.map((f) => {
                        const ins = insights.get(f.id);
                        return (
                          <MobileCard
                            key={f.id}
                            title={formatDate(f.fueled_at)}
                            subtitle={f.asset_label}
                            fields={[
                              { label: "ODO", value: f.odometer_km ?? "—" },
                              { label: "Liters", value: f.liters ?? "—" },
                              {
                                label: "Δ km",
                                value: ins?.deltaKm != null ? Math.round(ins.deltaKm) : "—",
                              },
                              {
                                label: "km/L",
                                value:
                                  ins?.kmPerL != null && Number.isFinite(ins.kmPerL)
                                    ? ins.kmPerL.toFixed(1)
                                    : "—",
                              },
                              {
                                label: "Flags",
                                value: ins?.flags?.length ? (
                                  <span className="flex flex-wrap gap-1">
                                    {ins.flags.map((flag) => (
                                      <Badge key={flag} variant="outline" className="text-[10px]">
                                        {flag}
                                      </Badge>
                                    ))}
                                  </span>
                                ) : (
                                  "—"
                                ),
                              },
                              {
                                label: "Cost",
                                value: f.total_cost != null ? `NPR ${f.total_cost}` : "—",
                              },
                            ]}
                            actions={
                              <PermissionGate roles={["super_user", "admin", "manager"]}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-destructive"
                                  onClick={() => deleteMut.mutate(f.id)}
                                >
                                  Delete
                                </Button>
                              </PermissionGate>
                            }
                          />
                        );
                      })
                    )}
                  </MobileCardList>
                }
                desktop={
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>DATE</TableHead>
                        <TableHead>ODO</TableHead>
                        <TableHead>L</TableHead>
                        <TableHead>Δ KM</TableHead>
                        <TableHead>KM/L</TableHead>
                        <TableHead>FLAGS</TableHead>
                        <TableHead>COST</TableHead>
                        <TableHead className="w-12" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground">
                            No fuel logs
                          </TableCell>
                        </TableRow>
                      ) : (
                        rows.map((f) => (
                          <TableRow key={f.id}>{renderRow(f)}</TableRow>
                        ))
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
