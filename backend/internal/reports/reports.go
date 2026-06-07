package reports

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jung-kurt/gofpdf"
	"github.com/xuri/excelize/v2"
)

func RunQuery(ctx context.Context, pool *pgxpool.Pool, reportType string) ([]map[string]interface{}, error) {
	var q string
	switch reportType {
	case "location-assets":
		q = `SELECT wl.name, COUNT(a.asset_id)::int AS asset_count
		     FROM work_locations wl LEFT JOIN assets a ON a.location_id = wl.location_id AND a.status != 'decommissioned'
		     GROUP BY wl.location_id, wl.name ORDER BY wl.name`
	case "insurance-expiry":
		q = `SELECT a.reg_serial_no AS asset, ip.policy_no, ip.insurer_name, ip.expiry_date::text, ip.status
		     FROM insurance_policies ip JOIN assets a ON a.asset_id = ip.asset_id
		     WHERE ip.expiry_date <= CURRENT_DATE + INTERVAL '90 days' ORDER BY ip.expiry_date`
	case "driver-license-expiry":
		q = `SELECT u.name AS driver, d.license_no, d.expiry_date::text
		     FROM driver_profiles d JOIN users u ON u.user_id = d.user_id
		     WHERE d.expiry_date <= CURRENT_DATE + INTERVAL '90 days' ORDER BY d.expiry_date`
	case "fleet-utilization":
		q = `SELECT 'active_assets' AS metric, COUNT(*)::text AS value FROM assets WHERE status = 'active'
		     UNION ALL SELECT 'in_transit', COUNT(*)::text FROM assets WHERE status = 'in_transit'
		     UNION ALL SELECT 'active_allocations', COUNT(*)::text FROM allocations WHERE state = 'active'`
	case "overdue-allocations":
		q = `SELECT a.reg_serial_no AS asset, al.expected_return::text, al.state::text
		     FROM allocations al JOIN assets a ON a.asset_id = al.asset_id
		     WHERE al.state IN ('active','in_transit') AND al.expected_return < CURRENT_DATE`
	default:
		return []map[string]interface{}{}, nil
	}
	rows, err := pool.Query(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	cols := rows.FieldDescriptions()
	var out []map[string]interface{}
	for rows.Next() {
		vals, err := rows.Values()
		if err != nil {
			return nil, err
		}
		m := map[string]interface{}{}
		for i, c := range cols {
			m[string(c.Name)] = vals[i]
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

func ExportPDF(dir, reportType string, rows []map[string]interface{}) (string, string, error) {
	name := fmt.Sprintf("%s-%s.pdf", reportType, uuid.New().String()[:8])
	path := filepath.Join(dir, name)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", "", err
	}
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()
	pdf.SetFont("Arial", "B", 14)
	pdf.Cell(40, 10, fmt.Sprintf("VMS Report: %s", reportType))
	pdf.Ln(12)
	pdf.SetFont("Arial", "", 10)
	if len(rows) == 0 {
		pdf.Cell(40, 8, "No data")
	} else {
		for _, row := range rows {
			line := ""
			for k, v := range row {
				line += fmt.Sprintf("%s: %v  ", k, v)
			}
			pdf.MultiCell(190, 6, line, "", "", false)
		}
	}
	return path, name, pdf.OutputFileAndClose(path)
}

func ExportExcel(dir, reportType string, rows []map[string]interface{}) (string, string, error) {
	name := fmt.Sprintf("%s-%s.xlsx", reportType, uuid.New().String()[:8])
	path := filepath.Join(dir, name)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", "", err
	}
	f := excelize.NewFile()
	sheet := "Report"
	f.SetSheetName("Sheet1", sheet)
	if len(rows) > 0 {
		col := 1
		for k := range rows[0] {
			cell, _ := excelize.CoordinatesToCellName(col, 1)
			f.SetCellValue(sheet, cell, k)
			col++
		}
		keys := make([]string, 0, len(rows[0]))
		for k := range rows[0] {
			keys = append(keys, k)
		}
		for ri, row := range rows {
			for ci, k := range keys {
				cell, _ := excelize.CoordinatesToCellName(ci+1, ri+2)
				f.SetCellValue(sheet, cell, row[k])
			}
		}
	}
	return path, name, f.SaveAs(path)
}

func RowsToJSON(rows []map[string]interface{}) ([]byte, error) {
	return json.Marshal(rows)
}
