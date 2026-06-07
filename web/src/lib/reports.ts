import fs from "fs";
import path from "path";
import ExcelJS from "exceljs";
import type { Pool } from "pg";
import { randomUUID } from "crypto";

export async function runQuery(pool: Pool, reportType: string): Promise<Record<string, unknown>[]> {
  let q: string;
  switch (reportType) {
    case "location-assets":
      q = `SELECT wl.name, COUNT(a.asset_id)::int AS asset_count
           FROM work_locations wl LEFT JOIN assets a ON a.location_id = wl.location_id AND a.status != 'decommissioned'
           GROUP BY wl.location_id, wl.name ORDER BY wl.name`;
      break;
    case "insurance-expiry":
      q = `SELECT a.reg_serial_no AS asset, ip.policy_no, ip.insurer_name, ip.expiry_date::text, ip.status
           FROM insurance_policies ip JOIN assets a ON a.asset_id = ip.asset_id
           WHERE ip.expiry_date <= CURRENT_DATE + INTERVAL '90 days' ORDER BY ip.expiry_date`;
      break;
    case "driver-license-expiry":
      q = `SELECT u.name AS driver, d.license_no, d.expiry_date::text
           FROM driver_profiles d JOIN users u ON u.user_id = d.user_id
           WHERE d.expiry_date <= CURRENT_DATE + INTERVAL '90 days' ORDER BY d.expiry_date`;
      break;
    case "fleet-utilization":
      q = `SELECT 'active_assets' AS metric, COUNT(*)::text AS value FROM assets WHERE status = 'active'
           UNION ALL SELECT 'in_transit', COUNT(*)::text FROM assets WHERE status = 'in_transit'
           UNION ALL SELECT 'active_allocations', COUNT(*)::text FROM allocations WHERE state = 'active'`;
      break;
    case "overdue-allocations":
      q = `SELECT a.reg_serial_no AS asset, al.expected_return::text, al.state::text
           FROM allocations al JOIN assets a ON a.asset_id = al.asset_id
           WHERE al.state IN ('active','in_transit') AND al.expected_return < CURRENT_DATE`;
      break;
    default:
      return [];
  }
  const res = await pool.query(q);
  return res.rows;
}

export async function exportExcel(dir: string, reportType: string, rows: Record<string, unknown>[]): Promise<{ path: string; name: string }> {
  const name = `${reportType}-${randomUUID().slice(0, 8)}.xlsx`;
  const filePath = path.join(dir, name);
  await fs.promises.mkdir(dir, { recursive: true, mode: 0o755 });
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("Report");
  if (rows.length > 0) {
    const keys = Object.keys(rows[0]);
    sheet.addRow(keys);
    for (const row of rows) {
      sheet.addRow(keys.map((k) => row[k]));
    }
  }
  await wb.xlsx.writeFile(filePath);
  return { path: filePath, name };
}

export async function exportPdf(dir: string, reportType: string, rows: Record<string, unknown>[]): Promise<{ path: string; name: string }> {
  const name = `${reportType}-${randomUUID().slice(0, 8)}.pdf`;
  const filePath = path.join(dir, name);
  await fs.promises.mkdir(dir, { recursive: true, mode: 0o755 });
  let content = `VMS Report: ${reportType}\n\n`;
  if (rows.length === 0) {
    content += "No data\n";
  } else {
    for (const row of rows) {
      const line = Object.entries(row)
        .map(([k, v]) => `${k}: ${v}`)
        .join("  ");
      content += line + "\n";
    }
  }
  await fs.promises.writeFile(filePath, content, "utf8");
  return { path: filePath, name };
}

export function rowsToJson(rows: Record<string, unknown>[]): Buffer {
  return Buffer.from(JSON.stringify(rows));
}

export async function findCachedJob(pool: Pool, hash: string): Promise<string | null> {
  const res = await pool.query(
    `SELECT job_id FROM report_jobs WHERE params_hash = $1 AND status = 'completed'
     AND created_at > NOW() - INTERVAL '10 minutes' ORDER BY created_at DESC LIMIT 1`,
    [hash]
  );
  return res.rows[0]?.job_id ?? null;
}

export function exportDir(): string {
  return process.env.EXPORT_DIR ?? path.join(process.cwd(), "exports");
}
