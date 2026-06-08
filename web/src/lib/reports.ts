import fs from "fs";
import path from "path";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import type { Pool } from "pg";
import { randomUUID } from "crypto";

const REPORT_TITLES: Record<string, string> = {
  "location-assets": "Location-wise assets",
  "insurance-expiry": "Insurance expiry",
  "driver-license-expiry": "Driver license expiry",
  "fleet-utilization": "Fleet utilization",
  "overdue-allocations": "Overdue allocations",
};

function formatColumnHeader(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

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

  const title = REPORT_TITLES[reportType] ?? reportType;
  const doc = new PDFDocument({ margin: 48, size: "A4" });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  doc.fontSize(18).font("Helvetica-Bold").text(`Navigator VMS — ${title}`);
  doc.moveDown(0.4);
  doc.fontSize(10).font("Helvetica").fillColor("#555555").text(`Generated ${new Date().toLocaleString()}`);
  doc.moveDown(1);
  doc.fillColor("#000000");

  if (rows.length === 0) {
    doc.fontSize(12).text("No data returned for this report.");
  } else {
    const keys = Object.keys(rows[0]);
    const headers = keys.map(formatColumnHeader);
    const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colWidth = contentWidth / keys.length;
    const rowHeight = 18;
    const left = doc.page.margins.left;

    const drawHeader = (y: number) => {
      doc.fontSize(10).font("Helvetica-Bold").fillColor("#111111");
      let x = left;
      for (const header of headers) {
        doc.text(header, x + 2, y, { width: colWidth - 4, lineBreak: false });
        x += colWidth;
      }
      doc
        .moveTo(left, y + rowHeight - 4)
        .lineTo(left + contentWidth, y + rowHeight - 4)
        .strokeColor("#cccccc")
        .stroke();
    };

    let y = doc.y;
    drawHeader(y);
    y += rowHeight;
    doc.font("Helvetica").fillColor("#000000");

    for (const row of rows) {
      if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        y = doc.page.margins.top;
        drawHeader(y);
        y += rowHeight;
        doc.font("Helvetica").fillColor("#000000");
      }
      let x = left;
      doc.fontSize(9);
      for (const key of keys) {
        doc.text(String(row[key] ?? ""), x + 2, y, { width: colWidth - 4, lineBreak: false });
        x += colWidth;
      }
      y += rowHeight;
    }
    doc.y = y;
  }

  doc.end();
  await new Promise<void>((resolve, reject) => {
    stream.on("finish", () => resolve());
    stream.on("error", reject);
  });

  return { path: filePath, name };
}

/** Serialize report rows for the `report_jobs.result` JSONB column. */
export function rowsToJson(rows: Record<string, unknown>[]): string {
  return JSON.stringify(rows);
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
