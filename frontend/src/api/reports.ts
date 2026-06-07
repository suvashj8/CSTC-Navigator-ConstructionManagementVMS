import { api, unwrap } from "./client";

const useMock = import.meta.env.VITE_USE_MOCK === "true";

export type ReportJob = {
  id: string;
  report_type: string;
  export_format: string;
  status: "pending" | "processing" | "completed" | "failed";
  result?: unknown;
  file_name?: string;
  download_url?: string | null;
  error_message?: string;
  created_at?: string;
  completed_at?: string;
};

const MOCK_RESULTS: Record<string, unknown[]> = {
  "location-assets": [
    { name: "Bhaktapur Ring Road Site", asset_count: 2 },
    { name: "Pokhara Lakeside Project", asset_count: 1 },
  ],
  "insurance-expiry": [{ asset: "Ba 1 Pa 4521", policy_no: "POL-2025-88421", expiry_date: "2026-06-30" }],
  "driver-license-expiry": [{ driver: "Bikash Rai", license_no: "01-06-0023456", expiry_date: "2026-08-20" }],
  "fleet-utilization": [
    { metric: "Active assets", value: 2 },
    { metric: "In transit", value: 1 },
  ],
  "overdue-allocations": [],
};

function mockJob(reportType: string, exportFormat: string): ReportJob {
  return {
    id: `mock-job-${Date.now()}`,
    report_type: reportType,
    export_format: exportFormat,
    status: "completed",
    result: MOCK_RESULTS[reportType] ?? [],
    file_name: exportFormat === "json" ? undefined : `${reportType}.${exportFormat === "pdf" ? "pdf" : "xlsx"}`,
    download_url: exportFormat === "json" ? null : `/api/v1/reports/jobs/mock/download`,
    completed_at: new Date().toISOString(),
  };
}

export async function createReportJob(body: {
  report_type: string;
  export_format?: "json" | "pdf" | "xlsx";
  params?: Record<string, unknown>;
}) {
  if (useMock) {
    await new Promise((r) => setTimeout(r, 600));
    return mockJob(body.report_type, body.export_format ?? "json");
  }
  return unwrap(api.post("/api/v1/reports/jobs", body)) as Promise<ReportJob>;
}

export async function getReportJob(id: string) {
  if (useMock) {
    return {
      id,
      report_type: "location-assets",
      export_format: "json",
      status: "completed" as const,
      result: MOCK_RESULTS["location-assets"],
    };
  }
  return unwrap(api.get(`/api/v1/reports/jobs/${id}`)) as Promise<ReportJob>;
}

export function reportDownloadPath(jobId: string) {
  return `/api/v1/reports/jobs/${jobId}/download`;
}
