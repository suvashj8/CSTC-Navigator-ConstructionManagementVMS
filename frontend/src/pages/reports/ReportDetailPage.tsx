import { useParams } from "react-router-dom";
import { FileDown, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MobileCard, MobileCardList } from "@/components/layout/mobile-card";
import { ResponsiveTable } from "@/components/layout/responsive-table";
import { TableScroll } from "@/components/layout/table-scroll";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useReportJob } from "@/hooks/useReportJob";
import { reportDownloadPath } from "@/api/reports";
import { saveReportFile } from "@/lib/download-file";

const titles: Record<string, string> = {
  "location-assets": "Location-wise assets",
  "insurance-expiry": "Insurance expiry report",
  "driver-license-expiry": "Driver license expiry",
  "fleet-utilization": "Fleet utilization",
  "overdue-allocations": "Overdue allocations",
};

export default function ReportDetailPage() {
  const { type = "" } = useParams();
  const title = titles[type] ?? "Report";
  const { job, loading, error, run, runAndWait } = useReportJob();

  const rows = Array.isArray(job?.result) ? (job.result as Record<string, unknown>[]) : [];

  const handleExport = async (format: "pdf" | "xlsx") => {
    try {
      const result = await runAndWait(type, format);
      if (result.download_url && result.file_name) {
        await saveReportFile(reportDownloadPath(result.id), result.file_name);
        toast.success(`${format.toUpperCase()} export ready`);
      }
    } catch {
      toast.error("Export failed");
    }
  };

  return (
    <PageShell
      title={title}
      description="Run report via background worker. Export works on web and mobile (share sheet)."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={loading} onClick={() => void run(type, "json")}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Run preview
          </Button>
          <Button variant="outline" disabled={loading} onClick={() => void handleExport("pdf")}>
            <FileDown className="h-4 w-4" />
            Export PDF
          </Button>
          <Button variant="outline" disabled={loading} onClick={() => void handleExport("xlsx")}>
            <FileSpreadsheet className="h-4 w-4" />
            Export Excel
          </Button>
        </div>
      }
    >
      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>
            {job?.status === "completed"
              ? `Completed ${job.completed_at ? new Date(job.completed_at).toLocaleString() : ""}`
              : loading
                ? "Generating report…"
                : "Click Run preview or export to generate."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && !rows.length && <Skeleton className="h-40 w-full" />}
          {!loading && rows.length > 0 && (
            <ResponsiveTable
              mobile={
                <MobileCardList>
                  {rows.map((row, i) => {
                    const keys = Object.keys(rows[0]);
                    const titleKey = keys[0];
                    return (
                      <MobileCard
                        key={i}
                        title={String(row[titleKey] ?? `Row ${i + 1}`)}
                        fields={keys.slice(1).map((k) => ({
                          label: k.replace(/_/g, " "),
                          value: String(row[k] ?? ""),
                        }))}
                      />
                    );
                  })}
                </MobileCardList>
              }
              desktop={
                <TableScroll>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Object.keys(rows[0]).map((k) => (
                          <TableHead key={k} className="capitalize">
                            {k.replace(/_/g, " ")}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row, i) => (
                        <TableRow key={i}>
                          {Object.keys(rows[0]).map((k) => (
                            <TableCell key={k}>{String(row[k] ?? "")}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableScroll>
              }
            />
          )}
          {!loading && job?.status === "completed" && rows.length === 0 && (
            <p className="text-sm text-muted-foreground">No rows returned for this report.</p>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
