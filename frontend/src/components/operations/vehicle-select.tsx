import { useQuery } from "@tanstack/react-query";
import { listAssets } from "@/api/assets";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectEmpty, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

type VehicleSelectProps = {
  value: string;
  onChange: (id: string) => void;
  label?: string;
  required?: boolean;
  className?: string;
};

export function VehicleSelect({ value, onChange, label = "Vehicle", required, className }: VehicleSelectProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["vehicles-picker"],
    queryFn: () => listAssets({ asset_type: "vehicle", per_page: 100, page: 1 }),
    staleTime: 60_000,
  });

  const vehicles = data?.rows ?? [];

  return (
    <div className={className ?? "flex flex-col gap-2"}>
      <Label className="h-5 leading-none">
        {label}
        {required ? " *" : ""}
      </Label>
      {isLoading ? (
        <Skeleton className="h-10 w-full" />
      ) : (
        <Select value={value || undefined} onValueChange={onChange}>
          <SelectTrigger className="h-10 w-full">
            <SelectValue placeholder="Select vehicle" />
          </SelectTrigger>
          <SelectContent>
            {vehicles.length === 0 ? (
              <SelectEmpty message="No vehicles found" />
            ) : (
              vehicles.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.reg_serial_no}
                  {v.make ? ` — ${v.make} ${v.model}` : ""}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
