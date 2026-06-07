package handler

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/navigator/vms/pkg/response"
)

func normalizeMaintStatus(s string) string {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "in progress", "in_progress", "inprogress":
		return "In progress"
	case "completed", "done":
		return "Completed"
	default:
		return "Scheduled"
	}
}

func (a *API) listFuelLogs(c *gin.Context) {
	tid, _ := a.tenantPool(c)
	pool, _ := a.TM.Pool(c.Request.Context(), *tid)
	p := pageFromContext(c)
	assetID := c.Query("asset_id")
	where := "WHERE 1=1"
	args := []any{}
	if assetID != "" {
		if aid, err := uuid.Parse(assetID); err == nil {
			args = append(args, aid)
			where += fmt.Sprintf(" AND f.asset_id = $%d", len(args))
		}
	}
	from := ` FROM fuel_logs f
		LEFT JOIN assets a ON a.asset_id = f.asset_id
		LEFT JOIN suppliers s ON s.supplier_id = f.supplier_id `
	dataSQL := `SELECT f.fuel_log_id, f.asset_id, a.reg_serial_no, f.supplier_id, s.name,
		f.fueled_at, f.odometer_km, f.liters, f.total_cost, f.notes` + from + where + ` ORDER BY f.fueled_at DESC`
	list, total, err := paginatedQuery(c.Request.Context(), pool, p,
		`SELECT COUNT(*) `+from+where, args, dataSQL, args,
		func(rows pgx.Rows) (gin.H, error) {
			var id, aid uuid.UUID
			var sid *uuid.UUID
			var assetLabel, supplierName, notes *string
			var fueledAt time.Time
			var odo *int32
			var liters, cost *float64
			if err := rows.Scan(&id, &aid, &assetLabel, &sid, &supplierName, &fueledAt, &odo, &liters, &cost, &notes); err != nil {
				return nil, err
			}
			return gin.H{
				"id": id.String(), "asset_id": aid.String(), "asset_label": derefStr(assetLabel),
				"supplier_id": uuidToStr(sid), "supplier_name": derefStr(supplierName),
				"fueled_at": fueledAt.Format(time.RFC3339), "odometer_km": intPtr(odo),
				"liters": floatPtr(liters), "total_cost": floatPtr(cost), "notes": derefStr(notes),
			}, nil
		})
	if err != nil {
		response.Internal(c, err.Error())
		return
	}
	respondPaginated(c, list, total, p)
}

func (a *API) createFuelLog(c *gin.Context) {
	tid, _ := a.tenantPool(c)
	pool, _ := a.TM.Pool(c.Request.Context(), *tid)
	var body struct {
		AssetID    string   `json:"asset_id"`
		SupplierID *string  `json:"supplier_id"`
		FueledAt   string   `json:"fueled_at"`
		OdometerKm *int     `json:"odometer_km"`
		Liters     *float64 `json:"liters"`
		TotalCost  *float64 `json:"total_cost"`
		Notes      string   `json:"notes"`
	}
	if err := c.BindJSON(&body); err != nil || body.AssetID == "" {
		response.BadRequest(c, "asset_id is required")
		return
	}
	aid, err := uuid.Parse(body.AssetID)
	if err != nil {
		response.BadRequest(c, "invalid asset_id")
		return
	}
	sid, _ := optionalUUID(body.SupplierID)
	fueledAt := time.Now().UTC()
	if body.FueledAt != "" {
		if t, err := time.Parse(time.RFC3339, body.FueledAt); err == nil {
			fueledAt = t
		}
	}
	var id uuid.UUID
	err = pool.QueryRow(c.Request.Context(), `
		INSERT INTO fuel_logs (asset_id, supplier_id, fueled_at, odometer_km, liters, total_cost, notes)
		VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING fuel_log_id`,
		aid, sid, fueledAt, body.OdometerKm, body.Liters, body.TotalCost, nullIfEmpty(body.Notes)).Scan(&id)
	if err != nil {
		response.Internal(c, err.Error())
		return
	}
	row, _ := fetchFuelLog(c.Request.Context(), pool, id)
	response.Created(c, row)
}

func (a *API) updateFuelLog(c *gin.Context) {
	tid, _ := a.tenantPool(c)
	pool, _ := a.TM.Pool(c.Request.Context(), *tid)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "invalid id")
		return
	}
	var body struct {
		SupplierID *string  `json:"supplier_id"`
		FueledAt   string   `json:"fueled_at"`
		OdometerKm *int     `json:"odometer_km"`
		Liters     *float64 `json:"liters"`
		TotalCost  *float64 `json:"total_cost"`
		Notes      string   `json:"notes"`
	}
	if err := c.BindJSON(&body); err != nil {
		response.BadRequest(c, "invalid body")
		return
	}
	sid, _ := optionalUUID(body.SupplierID)
	fueledAt := time.Now().UTC()
	if body.FueledAt != "" {
		if t, err := time.Parse(time.RFC3339, body.FueledAt); err == nil {
			fueledAt = t
		}
	}
	_, err = pool.Exec(c.Request.Context(), `
		UPDATE fuel_logs SET supplier_id=$1, fueled_at=$2, odometer_km=$3, liters=$4, total_cost=$5, notes=$6
		WHERE fuel_log_id=$7`, sid, fueledAt, body.OdometerKm, body.Liters, body.TotalCost, nullIfEmpty(body.Notes), id)
	if err != nil {
		response.Internal(c, err.Error())
		return
	}
	row, _ := fetchFuelLog(c.Request.Context(), pool, id)
	response.OK(c, row)
}

func (a *API) deleteFuelLog(c *gin.Context) {
	tid, _ := a.tenantPool(c)
	pool, _ := a.TM.Pool(c.Request.Context(), *tid)
	id, _ := uuid.Parse(c.Param("id"))
	_, err := pool.Exec(c.Request.Context(), `DELETE FROM fuel_logs WHERE fuel_log_id=$1`, id)
	if err != nil {
		response.Internal(c, err.Error())
		return
	}
	response.OK(c, gin.H{"ok": true})
}

func fetchFuelLog(ctx context.Context, pool interface {
	QueryRow(context.Context, string, ...any) pgx.Row
}, id uuid.UUID) (gin.H, error) {
	var aid uuid.UUID
	var sid *uuid.UUID
	var assetLabel, supplierName, notes *string
	var fueledAt time.Time
	var odo *int32
	var liters, cost *float64
	err := pool.QueryRow(ctx, `
		SELECT f.fuel_log_id, f.asset_id, a.reg_serial_no, f.supplier_id, s.name,
			f.fueled_at, f.odometer_km, f.liters, f.total_cost, f.notes
		FROM fuel_logs f
		LEFT JOIN assets a ON a.asset_id = f.asset_id
		LEFT JOIN suppliers s ON s.supplier_id = f.supplier_id
		WHERE f.fuel_log_id = $1`, id).Scan(&id, &aid, &assetLabel, &sid, &supplierName, &fueledAt, &odo, &liters, &cost, &notes)
	if err != nil {
		return nil, err
	}
	return gin.H{
		"id": id.String(), "asset_id": aid.String(), "asset_label": derefStr(assetLabel),
		"supplier_id": uuidToStr(sid), "supplier_name": derefStr(supplierName),
		"fueled_at": fueledAt.Format(time.RFC3339), "odometer_km": intPtr(odo),
		"liters": floatPtr(liters), "total_cost": floatPtr(cost), "notes": derefStr(notes),
	}, nil
}

func (a *API) listMaintenance(c *gin.Context) {
	tid, _ := a.tenantPool(c)
	pool, _ := a.TM.Pool(c.Request.Context(), *tid)
	p := pageFromContext(c)
	assetID := c.Query("asset_id")
	where := "WHERE 1=1"
	args := []any{}
	if assetID != "" {
		if aid, err := uuid.Parse(assetID); err == nil {
			args = append(args, aid)
			where += fmt.Sprintf(" AND m.asset_id = $%d", len(args))
		}
	}
	from := ` FROM maintenance_jobs m
		LEFT JOIN assets a ON a.asset_id = m.asset_id
		LEFT JOIN suppliers s ON s.supplier_id = m.supplier_id `
	dataSQL := `SELECT m.job_id, m.asset_id, a.reg_serial_no, m.supplier_id, s.name,
		m.scheduled_at, m.completed_at, m.status, m.description, m.parts_cost, m.labor_cost,
		m.odometer_at_service, m.notes` + from + where + ` ORDER BY m.created_at DESC`
	list, total, err := paginatedQuery(c.Request.Context(), pool, p,
		`SELECT COUNT(*) `+from+where, args, dataSQL, args,
		func(rows pgx.Rows) (gin.H, error) {
			var id, aid uuid.UUID
			var sid *uuid.UUID
			var assetLabel, supplierName, status, desc, notes *string
			var sched, comp *time.Time
			var parts, labor *float64
			var odo *int32
			if err := rows.Scan(&id, &aid, &assetLabel, &sid, &supplierName, &sched, &comp, &status, &desc, &parts, &labor, &odo, &notes); err != nil {
				return nil, err
			}
			return gin.H{
				"id": id.String(), "asset_id": aid.String(), "asset_label": derefStr(assetLabel),
				"supplier_id": uuidToStr(sid), "supplier_name": derefStr(supplierName),
				"scheduled_at": datePtr(sched), "completed_at": datePtr(comp),
				"status": derefStr(status), "description": derefStr(desc),
				"parts_cost": floatPtr(parts), "labor_cost": floatPtr(labor),
				"odometer_at_service": intPtr(odo), "notes": derefStr(notes),
			}, nil
		})
	if err != nil {
		response.Internal(c, err.Error())
		return
	}
	respondPaginated(c, list, total, p)
}

func (a *API) createMaintenance(c *gin.Context) {
	tid, _ := a.tenantPool(c)
	pool, _ := a.TM.Pool(c.Request.Context(), *tid)
	var body struct {
		AssetID           string   `json:"asset_id"`
		SupplierID        *string  `json:"supplier_id"`
		ScheduledAt       string   `json:"scheduled_at"`
		CompletedAt       string   `json:"completed_at"`
		Status            string   `json:"status"`
		Description       string   `json:"description"`
		PartsCost         *float64 `json:"parts_cost"`
		LaborCost         *float64 `json:"labor_cost"`
		OdometerAtService *int     `json:"odometer_at_service"`
		Notes             string   `json:"notes"`
	}
	if err := c.BindJSON(&body); err != nil || body.AssetID == "" {
		response.BadRequest(c, "asset_id is required")
		return
	}
	aid, err := uuid.Parse(body.AssetID)
	if err != nil {
		response.BadRequest(c, "invalid asset_id")
		return
	}
	sid, _ := optionalUUID(body.SupplierID)
	status := normalizeMaintStatus(body.Status)
	sched := parseDate(body.ScheduledAt)
	comp := parseDate(body.CompletedAt)
	if status == "Completed" && comp == nil {
		t := time.Now().UTC()
		comp = &t
	}
	var id uuid.UUID
	err = pool.QueryRow(c.Request.Context(), `
		INSERT INTO maintenance_jobs (asset_id, supplier_id, scheduled_at, completed_at, status, description,
			parts_cost, labor_cost, odometer_at_service, notes)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING job_id`,
		aid, sid, sched, comp, status, nullIfEmpty(body.Description), body.PartsCost, body.LaborCost,
		body.OdometerAtService, nullIfEmpty(body.Notes)).Scan(&id)
	if err != nil {
		response.Internal(c, err.Error())
		return
	}
	row, _ := fetchMaintenance(c.Request.Context(), pool, id)
	response.Created(c, row)
}

func (a *API) updateMaintenance(c *gin.Context) {
	tid, _ := a.tenantPool(c)
	pool, _ := a.TM.Pool(c.Request.Context(), *tid)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "invalid id")
		return
	}
	var body struct {
		SupplierID        *string  `json:"supplier_id"`
		ScheduledAt       string   `json:"scheduled_at"`
		CompletedAt       string   `json:"completed_at"`
		Status            string   `json:"status"`
		Description       string   `json:"description"`
		PartsCost         *float64 `json:"parts_cost"`
		LaborCost         *float64 `json:"labor_cost"`
		OdometerAtService *int     `json:"odometer_at_service"`
		Notes             string   `json:"notes"`
	}
	if err := c.BindJSON(&body); err != nil {
		response.BadRequest(c, "invalid body")
		return
	}
	sid, _ := optionalUUID(body.SupplierID)
	status := normalizeMaintStatus(body.Status)
	sched := parseDate(body.ScheduledAt)
	comp := parseDate(body.CompletedAt)
	_, err = pool.Exec(c.Request.Context(), `
		UPDATE maintenance_jobs SET supplier_id=$1, scheduled_at=$2, completed_at=$3, status=$4, description=$5,
			parts_cost=$6, labor_cost=$7, odometer_at_service=$8, notes=$9 WHERE job_id=$10`,
		sid, sched, comp, status, nullIfEmpty(body.Description), body.PartsCost, body.LaborCost,
		body.OdometerAtService, nullIfEmpty(body.Notes), id)
	if err != nil {
		response.Internal(c, err.Error())
		return
	}
	row, _ := fetchMaintenance(c.Request.Context(), pool, id)
	response.OK(c, row)
}

func (a *API) deleteMaintenance(c *gin.Context) {
	tid, _ := a.tenantPool(c)
	pool, _ := a.TM.Pool(c.Request.Context(), *tid)
	id, _ := uuid.Parse(c.Param("id"))
	_, err := pool.Exec(c.Request.Context(), `DELETE FROM maintenance_jobs WHERE job_id=$1`, id)
	if err != nil {
		response.Internal(c, err.Error())
		return
	}
	response.OK(c, gin.H{"ok": true})
}

func fetchMaintenance(ctx context.Context, pool interface {
	QueryRow(context.Context, string, ...any) pgx.Row
}, id uuid.UUID) (gin.H, error) {
	var aid uuid.UUID
	var sid *uuid.UUID
	var assetLabel, supplierName, status, desc, notes *string
	var sched, comp *time.Time
	var parts, labor *float64
	var odo *int32
	err := pool.QueryRow(ctx, `
		SELECT m.job_id, m.asset_id, a.reg_serial_no, m.supplier_id, s.name,
			m.scheduled_at, m.completed_at, m.status, m.description, m.parts_cost, m.labor_cost,
			m.odometer_at_service, m.notes
		FROM maintenance_jobs m
		LEFT JOIN assets a ON a.asset_id = m.asset_id
		LEFT JOIN suppliers s ON s.supplier_id = m.supplier_id
		WHERE m.job_id = $1`, id).Scan(&id, &aid, &assetLabel, &sid, &supplierName, &sched, &comp, &status, &desc, &parts, &labor, &odo, &notes)
	if err != nil {
		return nil, err
	}
	return gin.H{
		"id": id.String(), "asset_id": aid.String(), "asset_label": derefStr(assetLabel),
		"supplier_id": uuidToStr(sid), "supplier_name": derefStr(supplierName),
		"scheduled_at": datePtr(sched), "completed_at": datePtr(comp),
		"status": derefStr(status), "description": derefStr(desc),
		"parts_cost": floatPtr(parts), "labor_cost": floatPtr(labor),
		"odometer_at_service": intPtr(odo), "notes": derefStr(notes),
	}, nil
}

