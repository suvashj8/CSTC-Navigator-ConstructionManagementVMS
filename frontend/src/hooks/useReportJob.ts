import { useCallback, useEffect, useRef, useState } from "react";
import { createReportJob, getReportJob, type ReportJob } from "@/api/reports";

const POLL_MS = 400;

export function useReportJob() {
  const [job, setJob] = useState<ReportJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setJob(null);
    setError(null);
    setLoading(false);
  }, []);

  const poll = useCallback(async (id: string) => {
    try {
      const j = await getReportJob(id);
      setJob(j);
      if (j.status === "completed" || j.status === "failed") {
        setLoading(false);
        if (j.status === "failed") setError(j.error_message ?? "Report failed");
        return;
      }
      timer.current = setTimeout(() => void poll(id), POLL_MS);
    } catch (e) {
      setLoading(false);
      setError(e instanceof Error ? e.message : "Poll failed");
    }
  }, []);

  const run = useCallback(
    async (reportType: string, exportFormat: "json" | "pdf" | "xlsx" = "json", params?: Record<string, unknown>) => {
      clear();
      setLoading(true);
      try {
        const created = await createReportJob({ report_type: reportType, export_format: exportFormat, params });
        setJob(created);
        if (created.status === "completed") {
          setLoading(false);
          return created;
        }
        timer.current = setTimeout(() => void poll(created.id), POLL_MS);
        return created;
      } catch (e) {
        setLoading(false);
        setError(e instanceof Error ? e.message : "Failed to start report");
        throw e;
      }
    },
    [clear, poll]
  );

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const runAndWait = useCallback(
    async (reportType: string, exportFormat: "json" | "pdf" | "xlsx" = "json", params?: Record<string, unknown>) => {
      setLoading(true);
      setError(null);
      try {
        let j = await createReportJob({ report_type: reportType, export_format: exportFormat, params });
        setJob(j);
        while (j.status === "pending" || j.status === "processing") {
          await new Promise((r) => setTimeout(r, POLL_MS));
          j = await getReportJob(j.id);
          setJob(j);
        }
        setLoading(false);
        if (j.status === "failed") throw new Error(j.error_message ?? "Report failed");
        return j;
      } catch (e) {
        setLoading(false);
        const msg = e instanceof Error ? e.message : "Report failed";
        setError(msg);
        throw e;
      }
    },
    []
  );

  return { job, loading, error, run, runAndWait, clear };
}
