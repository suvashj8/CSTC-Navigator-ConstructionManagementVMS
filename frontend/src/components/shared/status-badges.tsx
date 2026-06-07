import type { AllocState, AssetStatus } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const assetStatusStyle: Record<AssetStatus, string> = {
  active: "bg-emerald-100 text-emerald-800 border-emerald-200",
  in_repair: "bg-amber-100 text-amber-800 border-amber-200",
  in_transit: "bg-sky-100 text-sky-800 border-sky-200",
  decommissioned: "bg-zinc-100 text-zinc-600 border-zinc-200",
};

const allocStateStyle: Record<AllocState, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  approved: "bg-blue-100 text-blue-800 border-blue-200",
  in_transit: "bg-sky-100 text-sky-800 border-sky-200",
  active: "bg-emerald-100 text-emerald-800 border-emerald-200",
  released: "bg-zinc-100 text-zinc-600 border-zinc-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

export function AssetStatusBadge({ status }: { status: AssetStatus }) {
  return (
    <Badge variant="outline" className={cn("font-medium capitalize", assetStatusStyle[status])}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

export function AllocStateBadge({ state }: { state: AllocState }) {
  return (
    <Badge variant="outline" className={cn("font-medium capitalize", allocStateStyle[state])}>
      {state.replace(/_/g, " ")}
    </Badge>
  );
}

export function LicenseStatusBadge({ status }: { status: "valid" | "expiring" | "expired" }) {
  const styles = {
    valid: "bg-emerald-100 text-emerald-800 border-emerald-200",
    expiring: "bg-amber-100 text-amber-800 border-amber-200",
    expired: "bg-red-100 text-red-700 border-red-200",
  };
  return (
    <Badge variant="outline" className={cn("font-medium capitalize", styles[status])}>
      {status}
    </Badge>
  );
}
