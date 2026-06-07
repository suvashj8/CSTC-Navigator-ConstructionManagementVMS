package handler

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/navigator/vms/internal/auth"
	"github.com/navigator/vms/internal/config"
	"github.com/navigator/vms/internal/health"
	"github.com/navigator/vms/internal/middleware"
	"github.com/navigator/vms/internal/queue"
	"github.com/navigator/vms/internal/reports"
	"github.com/navigator/vms/pkg/response"
	"github.com/navigator/vms/pkg/tenantmgr"
	"golang.org/x/crypto/bcrypt"
)

type API struct {
	Cfg    *config.Config
	TM     *tenantmgr.Manager
	Queue  *asynq.Client
}

func (a *API) Register(r *gin.Engine) {
	r.Use(middleware.CORS(a.Cfg.AllowedOrigins))
	r.GET("/health", a.healthCheck)

	v1 := r.Group("/api/v1")
	v1.POST("/auth/login", a.tenantLogin)
	v1.POST("/platform/auth/login", a.platformLogin)

	platform := v1.Group("/platform", middleware.JWT(a.Cfg.JWTSecret), middleware.RequirePlatform)
	platform.GET("/tenants", a.listTenants)
	platform.POST("/tenants", a.createTenant)
	platform.PUT("/tenants/:id/status", a.updateTenantStatus)
	platform.POST("/tenants/:id/switch", a.switchTenant)
	platform.POST("/jobs/expiry-scan", a.triggerExpiryScan)

	tenant := v1.Group("", middleware.JWT(a.Cfg.JWTSecret), middleware.RequireTenant)
	tenant.GET("/dashboard/stats", a.dashboardStats)
	tenant.GET("/assets", a.listAssets)
	tenant.POST("/assets", middleware.RequireRoles("admin", "manager", "supervisor"), a.createAsset)
	tenant.PUT("/assets/:id", middleware.RequireRoles("admin", "manager", "supervisor"), a.updateAsset)
	tenant.DELETE("/assets/:id", middleware.RequireRoles("admin", "manager", "supervisor"), a.decommissionAsset)
	tenant.GET("/allocations", a.listAllocations)
	tenant.POST("/allocations", a.createAllocation)
	tenant.PUT("/allocations/:id/:action", a.transitionAllocation)
	tenant.GET("/locations", a.listLocations)
	tenant.POST("/locations", middleware.RequireRoles("admin", "manager"), a.createLocation)
	tenant.PUT("/locations/:id", middleware.RequireRoles("admin", "manager"), a.updateLocation)
	tenant.GET("/users", middleware.RequireRoles("admin"), a.listUsers)
	tenant.POST("/users", middleware.RequireRoles("admin"), a.createUser)
	tenant.PUT("/users/:id", middleware.RequireRoles("admin"), a.updateUser)
	tenant.GET("/drivers", a.listDrivers)
	tenant.POST("/drivers", middleware.RequireRoles("admin", "manager"), a.createDriver)
	tenant.PUT("/drivers/:id", middleware.RequireRoles("admin", "manager"), a.updateDriver)
	tenant.GET("/insurance", a.listInsurance)
	tenant.POST("/insurance", middleware.RequireRoles("admin", "manager"), a.createInsurance)
	tenant.PUT("/insurance/:id", middleware.RequireRoles("admin", "manager"), a.updateInsurance)
	tenant.GET("/suppliers", a.listSuppliers)
	tenant.POST("/suppliers", middleware.RequireRoles("admin", "manager"), a.createSupplier)
	tenant.PUT("/suppliers/:id", middleware.RequireRoles("admin", "manager"), a.updateSupplier)
	tenant.GET("/fuel-logs", a.listFuelLogs)
	tenant.POST("/fuel-logs", middleware.RequireRoles("admin", "manager", "supervisor"), a.createFuelLog)
	tenant.PUT("/fuel-logs/:id", middleware.RequireRoles("admin", "manager"), a.updateFuelLog)
	tenant.DELETE("/fuel-logs/:id", middleware.RequireRoles("admin", "manager"), a.deleteFuelLog)
	tenant.GET("/maintenance", a.listMaintenance)
	tenant.POST("/maintenance", middleware.RequireRoles("admin", "manager"), a.createMaintenance)
	tenant.PUT("/maintenance/:id", middleware.RequireRoles("admin", "manager"), a.updateMaintenance)
	tenant.DELETE("/maintenance/:id", middleware.RequireRoles("admin", "manager"), a.deleteMaintenance)
	tenant.GET("/notifications", a.listNotifications)
	tenant.PUT("/notifications/:id/read", a.markNotificationRead)
	tenant.POST("/reports/jobs", a.createReportJob)
	tenant.GET("/reports/jobs/:id", a.getReportJob)
	tenant.GET("/reports/jobs/:id/download", a.downloadReport)
}

func (a *API) healthCheck(c *gin.Context) {
	st := health.Check(c.Request.Context(), a.TM.Main(), a.Cfg.RedisAddr)
	if st.Status != "ok" {
		response.Error(c, 503, "SERVICE_UNAVAILABLE", st.Status)
		return
	}
	response.OK(c, st)
}

func hashParams(reportType, format string, params json.RawMessage) string {
	h := sha256.Sum256([]byte(reportType + format + string(params)))
	return hex.EncodeToString(h[:])
}

func pageQuery(c *gin.Context) (int, int) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	per, _ := strconv.Atoi(c.DefaultQuery("per_page", "10"))
	if page < 1 {
		page = 1
	}
	if per < 1 {
		per = 10
	}
	return page, per
}

func (a *API) tenantPool(c *gin.Context) (*uuid.UUID, error) {
	id, err := middleware.TenantUUID(c)
	if err != nil {
		return nil, err
	}
	return &id, nil
}

func (a *API) tenantLogin(c *gin.Context) {
	sub := c.GetHeader("X-Tenant-Subdomain")
	if sub == "" {
		response.BadRequest(c, "X-Tenant-Subdomain header is required")
		return
	}
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.BindJSON(&body); err != nil {
		response.BadRequest(c, "invalid body")
		return
	}
	info, err := a.TM.BySubdomain(c.Request.Context(), strings.ToLower(sub))
	if err != nil {
		response.Unauthorized(c, "invalid tenant or credentials")
		return
	}
	pool, err := a.TM.Pool(c.Request.Context(), info.ID)
	if err != nil {
		response.Internal(c, "tenant connection failed")
		return
	}
	var userID uuid.UUID
	var name, email, role, hash string
	var locUUIDs []uuid.UUID
	err = pool.QueryRow(c.Request.Context(), `
		SELECT user_id, name, email, role::text, password_hash, location_ids
		FROM users WHERE email = $1 AND status = 'active'`, strings.ToLower(body.Email)).Scan(
		&userID, &name, &email, &role, &hash, &locUUIDs)
	locIDs := uuidSliceToStrings(locUUIDs)
	if err != nil || bcrypt.CompareHashAndPassword([]byte(hash), []byte(body.Password)) != nil {
		response.Unauthorized(c, "invalid tenant or credentials")
		return
	}
	res, err := auth.SignTenant(a.Cfg.JWTSecret, a.Cfg.JWTExpiry, userID, email, name, role, info.ID.String(), info.Name, locIDs)
	if err != nil {
		response.Internal(c, "token error")
		return
	}
	response.OK(c, res)
}

func (a *API) platformLogin(c *gin.Context) {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.BindJSON(&body); err != nil {
		response.BadRequest(c, "invalid body")
		return
	}
	var id uuid.UUID
	var name, hash string
	err := a.TM.Main().QueryRow(c.Request.Context(),
		`SELECT user_id, name, password_hash FROM super_users WHERE email = $1`, strings.ToLower(body.Email)).Scan(&id, &name, &hash)
	if err != nil || bcrypt.CompareHashAndPassword([]byte(hash), []byte(body.Password)) != nil {
		response.Unauthorized(c, "invalid credentials")
		return
	}
	res, err := auth.SignPlatform(a.Cfg.JWTSecret, id, body.Email, name)
	if err != nil {
		response.Internal(c, "token error")
		return
	}
	response.OK(c, res)
}

func (a *API) listTenants(c *gin.Context) {
	rows, err := a.TM.Main().Query(c.Request.Context(), `
		SELECT tenant_id, name, subdomain, db_name, plan_tier, status, created_at FROM tenants ORDER BY created_at DESC`)
	if err != nil {
		response.Internal(c, err.Error())
		return
	}
	defer rows.Close()
	var list []gin.H
	for rows.Next() {
		var id uuid.UUID
		var name, subdomain, dbName, plan, status string
		var created interface{}
		_ = rows.Scan(&id, &name, &subdomain, &dbName, &plan, &status, &created)
		list = append(list, gin.H{"id": id, "name": name, "subdomain": subdomain, "db_name": dbName, "plan_tier": plan, "status": status, "created_at": created})
	}
	response.OK(c, list)
}

func (a *API) createTenant(c *gin.Context) {
	var body struct {
		Name          string `json:"name"`
		Subdomain     string `json:"subdomain"`
		AdminEmail    string `json:"admin_email"`
		AdminPassword string `json:"admin_password"`
		AdminName     string `json:"admin_name"`
	}
	if err := c.BindJSON(&body); err != nil {
		response.BadRequest(c, "invalid body")
		return
	}
	id, err := a.TM.Provision(c.Request.Context(), body.Name, body.Subdomain, body.AdminEmail, body.AdminPassword, body.AdminName)
	if err != nil {
		response.Internal(c, err.Error())
		return
	}
	response.Created(c, gin.H{"tenantId": id, "subdomain": body.Subdomain})
}

func (a *API) updateTenantStatus(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "invalid id")
		return
	}
	var body struct {
		Status string `json:"status"`
	}
	if err := c.BindJSON(&body); err != nil {
		response.BadRequest(c, "invalid body")
		return
	}
	_, err = a.TM.Main().Exec(c.Request.Context(), `UPDATE tenants SET status = $1 WHERE tenant_id = $2`, body.Status, id)
	if err != nil {
		response.Internal(c, err.Error())
		return
	}
	response.OK(c, gin.H{"tenant_id": id, "status": body.Status})
}

func (a *API) switchTenant(c *gin.Context) {
	cl, _ := middleware.ClaimsFrom(c)
	superID, err := uuid.Parse(cl.RegisteredClaims.Subject)
	if err != nil {
		superID, _ = uuid.Parse(cl.Sub)
	}
	tid, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "invalid id")
		return
	}
	info, err := a.TM.ByID(c.Request.Context(), tid)
	if err != nil {
		response.NotFound(c, "tenant not found")
		return
	}
	pool, err := a.TM.Pool(c.Request.Context(), tid)
	if err != nil {
		response.Internal(c, err.Error())
		return
	}
	var uid uuid.UUID
	var name, email, role string
	var locUUIDs []uuid.UUID
	err = pool.QueryRow(c.Request.Context(), `
		SELECT user_id, name, email, role::text, location_ids FROM users WHERE role = 'admin' ORDER BY created_at LIMIT 1`).Scan(&uid, &name, &email, &role, &locUUIDs)
	locIDs := uuidSliceToStrings(locUUIDs)
	if err != nil {
		response.NotFound(c, "tenant admin not found")
		return
	}
	user := auth.LoginUser{ID: uid.String(), Name: name, Email: email, Role: role, LocationIDs: locIDs, TenantID: tid.String(), TenantName: info.Name}
	res, err := auth.SignImpersonation(a.Cfg.JWTSecret, a.Cfg.JWTExpiry, superID, user)
	if err != nil {
		response.Internal(c, err.Error())
		return
	}
	response.OK(c, res)
}

// --- tenant handlers continue in tenant_handlers.go ---

func (a *API) dashboardStats(c *gin.Context) {
	tid, err := a.tenantPool(c)
	if err != nil {
		response.Forbidden(c)
		return
	}
	pool, _ := a.TM.Pool(c.Request.Context(), *tid)
	var total, active, pending, ins, lic, overdue int
	_ = pool.QueryRow(c.Request.Context(), `SELECT COUNT(*) FROM assets WHERE status != 'decommissioned'`).Scan(&total)
	_ = pool.QueryRow(c.Request.Context(), `SELECT COUNT(*) FROM allocations WHERE state IN ('active','in_transit')`).Scan(&active)
	_ = pool.QueryRow(c.Request.Context(), `SELECT COUNT(*) FROM allocations WHERE state = 'pending'`).Scan(&pending)
	_ = pool.QueryRow(c.Request.Context(), `SELECT COUNT(*) FROM insurance_policies WHERE expiry_date <= CURRENT_DATE + INTERVAL '30 days'`).Scan(&ins)
	_ = pool.QueryRow(c.Request.Context(), `SELECT COUNT(*) FROM driver_profiles WHERE expiry_date <= CURRENT_DATE + INTERVAL '60 days'`).Scan(&lic)
	_ = pool.QueryRow(c.Request.Context(), `SELECT COUNT(*) FROM allocations WHERE state IN ('active','in_transit') AND expected_return < CURRENT_DATE`).Scan(&overdue)
	response.OK(c, gin.H{"total_assets": total, "active_allocations": active, "pending_approvals": pending, "expiring_insurance": ins, "expiring_licenses": lic, "overdue_returns": overdue})
}

func (a *API) listAssets(c *gin.Context) {
	tid, _ := a.tenantPool(c)
	pool, _ := a.TM.Pool(c.Request.Context(), *tid)
	p := pageFromContext(c)
	search := c.Query("search")
	status := c.Query("status")
	assetType := c.Query("asset_type")
	operationMode := c.Query("operation_mode")
	where := "WHERE 1=1"
	args := []any{}
	if status != "" {
		args = append(args, status)
		where += fmt.Sprintf(" AND a.status = $%d", len(args))
	}
	if assetType != "" {
		args = append(args, assetType)
		where += fmt.Sprintf(" AND a.asset_type = $%d", len(args))
	}
	if operationMode == "hour" {
		where += " AND (a.operation_mode = 'hour' OR a.vehicle_category = 'Dozer')"
	} else if operationMode == "km" {
		where += " AND NOT (a.operation_mode = 'hour' OR a.vehicle_category = 'Dozer')"
	}
	if search != "" {
		args = append(args, "%"+strings.ToLower(search)+"%")
		where += fmt.Sprintf(" AND (LOWER(a.reg_serial_no) LIKE $%d OR LOWER(a.make) LIKE $%d OR LOWER(a.model) LIKE $%d)", len(args), len(args), len(args))
	}
	from := ` FROM assets a
		LEFT JOIN work_locations wl ON wl.location_id = a.location_id
		LEFT JOIN users u ON u.user_id = a.assigned_driver_id `
	dataSQL := `SELECT a.asset_id, a.asset_type, a.reg_serial_no, a.make, a.model, a.year, a.ownership_type, a.status,
		a.location_id, wl.name, a.assigned_driver_id, u.name` + assetRegistrySelect + from + where + ` ORDER BY a.created_at DESC`
	list, total, err := paginatedQuery(c.Request.Context(), pool, p,
		`SELECT COUNT(*) `+from+where, args, dataSQL, args,
		func(rows pgx.Rows) (gin.H, error) { return scanAssetRow(rows) })
	if err != nil {
		response.Internal(c, err.Error())
		return
	}
	respondPaginated(c, list, total, p)
}

func (a *API) createAsset(c *gin.Context) {
	tid, _ := a.tenantPool(c)
	pool, _ := a.TM.Pool(c.Request.Context(), *tid)
	var body map[string]interface{}
	_ = c.BindJSON(&body)
	var id uuid.UUID
	err := pool.QueryRow(c.Request.Context(), `
		INSERT INTO assets (asset_type, reg_serial_no, make, model, year, ownership_type, status, location_id,
			vehicle_category, department, rta_office, alert_cell_number, registration_date, bluebook_no, bluebook_issued_at, bluebook_expires_at,
			operation_mode, route_from, route_to, operation_km, operation_place, operation_hours, operation_minutes)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23) RETURNING asset_id`,
		body["asset_type"], body["reg_serial_no"], body["make"], body["model"], body["year"],
		body["ownership_type"], body["status"], body["location_id"],
		body["vehicle_category"], body["department"], body["rta_office"], body["alert_cell_number"],
		body["registration_date"], body["bluebook_no"], body["bluebook_issued_at"], body["bluebook_expires_at"],
		body["operation_mode"], body["route_from"], body["route_to"], body["operation_km"],
		body["operation_place"], body["operation_hours"], body["operation_minutes"]).Scan(&id)
	if err != nil {
		response.Internal(c, err.Error())
		return
	}
	asset, err := fetchAsset(c.Request.Context(), pool, id)
	if err != nil {
		response.Created(c, gin.H{"id": id})
		return
	}
	response.Created(c, asset)
}

func (a *API) updateAsset(c *gin.Context) {
	tid, _ := a.tenantPool(c)
	pool, _ := a.TM.Pool(c.Request.Context(), *tid)
	id, _ := uuid.Parse(c.Param("id"))
	var body map[string]interface{}
	_ = c.BindJSON(&body)
	_, err := pool.Exec(c.Request.Context(), `
		UPDATE assets SET asset_type=$1, reg_serial_no=$2, make=$3, model=$4, year=$5, ownership_type=$6, status=$7, location_id=$8,
			vehicle_category=$9, department=$10, rta_office=$11, alert_cell_number=$12, registration_date=$13,
			bluebook_no=$14, bluebook_issued_at=$15, bluebook_expires_at=$16,
			operation_mode=$17, route_from=$18, route_to=$19, operation_km=$20,
			operation_place=$21, operation_hours=$22, operation_minutes=$23
		WHERE asset_id=$24`,
		body["asset_type"], body["reg_serial_no"], body["make"], body["model"], body["year"], body["ownership_type"], body["status"], body["location_id"],
		body["vehicle_category"], body["department"], body["rta_office"], body["alert_cell_number"], body["registration_date"],
		body["bluebook_no"], body["bluebook_issued_at"], body["bluebook_expires_at"],
		body["operation_mode"], body["route_from"], body["route_to"], body["operation_km"],
		body["operation_place"], body["operation_hours"], body["operation_minutes"], id)
	if err != nil {
		response.Internal(c, err.Error())
		return
	}
	asset, err := fetchAsset(c.Request.Context(), pool, id)
	if err != nil {
		response.OK(c, gin.H{"id": id})
		return
	}
	response.OK(c, asset)
}

func (a *API) decommissionAsset(c *gin.Context) {
	tid, _ := a.tenantPool(c)
	pool, _ := a.TM.Pool(c.Request.Context(), *tid)
	id, _ := uuid.Parse(c.Param("id"))
	_, _ = pool.Exec(c.Request.Context(), `UPDATE assets SET status = 'decommissioned' WHERE asset_id = $1`, id)
	response.OK(c, gin.H{"ok": true})
}

func (a *API) listAllocations(c *gin.Context) {
	tid, _ := a.tenantPool(c)
	pool, _ := a.TM.Pool(c.Request.Context(), *tid)
	p := pageFromContext(c)
	state := c.Query("state")
	where := ""
	args := []any{}
	if state != "" {
		args = append(args, state)
		where = fmt.Sprintf(" WHERE al.state = $%d", len(args))
	}
	from := ` FROM allocations al
		JOIN assets a ON a.asset_id = al.asset_id
		JOIN work_locations fl ON fl.location_id = al.from_location_id
		JOIN work_locations tl ON tl.location_id = al.to_location_id
		JOIN users d ON d.user_id = al.driver_id`
	dataSQL := `SELECT al.alloc_id, al.asset_id, a.reg_serial_no || ' — ' || a.make || ' ' || a.model,
		al.from_location_id, fl.name, al.to_location_id, tl.name, al.driver_id, d.name, al.state, al.start_date, al.expected_return` + from + where + ` ORDER BY al.created_at DESC`
	list, total, err := paginatedQuery(c.Request.Context(), pool, p,
		`SELECT COUNT(*) `+from+where, args, dataSQL, args,
		func(rows pgx.Rows) (gin.H, error) { return scanAllocationRow(rows) })
	if err != nil {
		response.Internal(c, err.Error())
		return
	}
	respondPaginated(c, list, total, p)
}

func (a *API) createAllocation(c *gin.Context) {
	tid, _ := a.tenantPool(c)
	pool, _ := a.TM.Pool(c.Request.Context(), *tid)
	var body map[string]interface{}
	_ = c.BindJSON(&body)
	var id uuid.UUID
	err := pool.QueryRow(c.Request.Context(), `
		INSERT INTO allocations (asset_id, from_location_id, to_location_id, driver_id, start_date, expected_return)
		VALUES ($1,$2,$3,$4,$5,$6) RETURNING alloc_id`,
		body["asset_id"], body["from_location_id"], body["to_location_id"], body["driver_id"], body["start_date"], body["expected_return"]).Scan(&id)
	if err != nil {
		response.Internal(c, err.Error())
		return
	}
	alloc, err := fetchAllocation(c.Request.Context(), pool, id)
	if err != nil {
		response.Created(c, gin.H{"id": id, "state": "pending"})
		return
	}
	response.Created(c, alloc)
}

func (a *API) transitionAllocation(c *gin.Context) {
	tid, _ := a.tenantPool(c)
	pool, _ := a.TM.Pool(c.Request.Context(), *tid)
	id, _ := uuid.Parse(c.Param("id"))
	action := c.Param("action")
	next := map[string]string{"approve": "approved", "dispatch": "in_transit", "receive": "active", "release": "released", "cancel": "cancelled"}[action]
	if next == "" {
		response.BadRequest(c, "invalid action")
		return
	}
	_, err := pool.Exec(c.Request.Context(), `UPDATE allocations SET state = $1 WHERE alloc_id = $2`, next, id)
	if err != nil {
		response.Internal(c, err.Error())
		return
	}
	alloc, err := fetchAllocation(c.Request.Context(), pool, id)
	if err != nil {
		response.OK(c, gin.H{"id": id, "state": next})
		return
	}
	response.OK(c, alloc)
}

func (a *API) listLocations(c *gin.Context) {
	tid, _ := a.tenantPool(c)
	pool, _ := a.TM.Pool(c.Request.Context(), *tid)
	rows, _ := pool.Query(c.Request.Context(), `SELECT wl.location_id, wl.name, wl.type, wl.address, wl.manager_id, u.name, wl.is_custom FROM work_locations wl LEFT JOIN users u ON u.user_id = wl.manager_id ORDER BY wl.name`)
	defer rows.Close()
	var list []gin.H
	for rows.Next() {
		var id uuid.UUID
		var name, typ, addr string
		var mid *uuid.UUID
		var mname *string
		var custom bool
		_ = rows.Scan(&id, &name, &typ, &addr, &mid, &mname, &custom)
		list = append(list, gin.H{"id": id, "name": name, "type": typ, "address": addr, "manager_id": mid, "manager_name": mname, "is_custom": custom})
	}
	response.OK(c, list)
}

func (a *API) listUsers(c *gin.Context) {
	tid, _ := a.tenantPool(c)
	pool, _ := a.TM.Pool(c.Request.Context(), *tid)
	p := pageFromContext(c)
	search := c.Query("search")
	where := ""
	args := []any{}
	if search != "" {
		args = append(args, "%"+strings.ToLower(search)+"%")
		where = fmt.Sprintf(" WHERE LOWER(u.name) LIKE $1 OR LOWER(u.email) LIKE $1 OR LOWER(u.role::text) LIKE $1")
	}
	from := ` FROM users u LEFT JOIN work_locations wl ON wl.location_id = u.location_id`
	dataSQL := `SELECT u.user_id, u.name, u.email, u.role, u.status, u.location_id, wl.name` + from + where + ` ORDER BY u.created_at DESC`
	list, total, err := paginatedQuery(c.Request.Context(), pool, p,
		`SELECT COUNT(*) `+from+where, args, dataSQL, args,
		func(rows pgx.Rows) (gin.H, error) {
			var id uuid.UUID
			var name, email, role, status string
			var locID *uuid.UUID
			var loc *string
			if err := rows.Scan(&id, &name, &email, &role, &status, &locID, &loc); err != nil {
				return nil, err
			}
			return gin.H{"id": id, "name": name, "email": email, "role": role, "status": status, "location_id": locID, "location_name": loc}, nil
		})
	if err != nil {
		response.Internal(c, err.Error())
		return
	}
	respondPaginated(c, list, total, p)
}

func (a *API) listDrivers(c *gin.Context) {
	tid, _ := a.tenantPool(c)
	pool, _ := a.TM.Pool(c.Request.Context(), *tid)
	p := pageFromContext(c)
	search := c.Query("search")
	where := ""
	args := []any{}
	if search != "" {
		args = append(args, "%"+strings.ToLower(search)+"%")
		where = ` WHERE LOWER(u.name) LIKE $1 OR LOWER(d.license_no) LIKE $1`
	}
	from := ` FROM driver_profiles d JOIN users u ON u.user_id = d.user_id`
	dataSQL := `SELECT d.driver_id, d.user_id, u.name, u.email, d.license_no, d.license_class, d.issue_date, d.expiry_date,
		CASE WHEN d.expiry_date < CURRENT_DATE THEN 'expired' WHEN d.expiry_date <= CURRENT_DATE + 60 THEN 'expiring' ELSE 'valid' END` + from + where + ` ORDER BY d.expiry_date`
	list, total, err := paginatedQuery(c.Request.Context(), pool, p,
		`SELECT COUNT(*) `+from+where, args, dataSQL, args,
		func(rows pgx.Rows) (gin.H, error) {
			var did, uid uuid.UUID
			var name, email, lno, lclass, status string
			var issue, exp interface{}
			if err := rows.Scan(&did, &uid, &name, &email, &lno, &lclass, &issue, &exp, &status); err != nil {
				return nil, err
			}
			return gin.H{"id": did, "user_id": uid, "name": name, "email": email, "license_no": lno, "license_class": lclass, "issue_date": issue, "expiry_date": exp, "status": status}, nil
		})
	if err != nil {
		response.Internal(c, err.Error())
		return
	}
	respondPaginated(c, list, total, p)
}

func (a *API) listInsurance(c *gin.Context) {
	tid, _ := a.tenantPool(c)
	pool, _ := a.TM.Pool(c.Request.Context(), *tid)
	p := pageFromContext(c)
	from := ` FROM insurance_policies ip JOIN assets a ON a.asset_id = ip.asset_id`
	dataSQL := `SELECT ip.policy_id, ip.asset_id, a.reg_serial_no, ip.policy_no, ip.insurer_name, ip.coverage_type, ip.insured_value, ip.premium_amount, ip.start_date, ip.expiry_date, ip.status` + from + ` ORDER BY ip.expiry_date`
	list, total, err := paginatedQuery(c.Request.Context(), pool, p,
		`SELECT COUNT(*) `+from, nil, dataSQL, nil,
		func(rows pgx.Rows) (gin.H, error) {
			var pid, aid uuid.UUID
			var asset, pno, insurer, cov, status string
			var iv, prem float64
			var start, exp interface{}
			if err := rows.Scan(&pid, &aid, &asset, &pno, &insurer, &cov, &iv, &prem, &start, &exp, &status); err != nil {
				return nil, err
			}
			return gin.H{"id": pid, "asset_id": aid, "asset_label": asset, "policy_no": pno, "insurer_name": insurer, "coverage_type": cov, "insured_value": iv, "premium_amount": prem, "start_date": start, "expiry_date": exp, "status": status}, nil
		})
	if err != nil {
		response.Internal(c, err.Error())
		return
	}
	respondPaginated(c, list, total, p)
}

func (a *API) listSuppliers(c *gin.Context) {
	tid, _ := a.tenantPool(c)
	pool, _ := a.TM.Pool(c.Request.Context(), *tid)
	p := pageFromContext(c)
	from := ` FROM suppliers`
	dataSQL := `SELECT supplier_id, name, category, contact_name, email, phone, rating, is_preferred` + from + ` ORDER BY name`
	list, total, err := paginatedQuery(c.Request.Context(), pool, p,
		`SELECT COUNT(*) `+from, nil, dataSQL, nil,
		func(rows pgx.Rows) (gin.H, error) {
			var id uuid.UUID
			var name, cat string
			var contact, email, phone *string
			var rating int16
			var pref bool
			if err := rows.Scan(&id, &name, &cat, &contact, &email, &phone, &rating, &pref); err != nil {
				return nil, err
			}
			return gin.H{"id": id, "name": name, "category": cat, "contact_name": contact, "email": email, "phone": phone, "rating": rating, "is_preferred": pref}, nil
		})
	if err != nil {
		response.Internal(c, err.Error())
		return
	}
	respondPaginated(c, list, total, p)
}

func (a *API) listNotifications(c *gin.Context) {
	tid, _ := a.tenantPool(c)
	cl, _ := middleware.ClaimsFrom(c)
	pool, _ := a.TM.Pool(c.Request.Context(), *tid)
	uid, _ := uuid.Parse(cl.Sub)
	rows, _ := pool.Query(c.Request.Context(), `
		SELECT notif_id, type, title, message, channel, COALESCE(sent_at, created_at), status, read_at IS NOT NULL
		FROM notifications WHERE recipient_id = $1 OR recipient_id IS NULL ORDER BY created_at DESC LIMIT 100`, uid)
	defer rows.Close()
	var list []gin.H
	for rows.Next() {
		var id uuid.UUID
		var typ, title, msg, ch, st string
		var sent interface{}
		var read bool
		_ = rows.Scan(&id, &typ, &title, &msg, &ch, &sent, &st, &read)
		list = append(list, gin.H{"id": id, "type": typ, "title": title, "message": msg, "channel": ch, "sent_at": sent, "status": st, "read": read})
	}
	response.OK(c, list)
}

func (a *API) markNotificationRead(c *gin.Context) {
	tid, _ := a.tenantPool(c)
	pool, _ := a.TM.Pool(c.Request.Context(), *tid)
	id, _ := uuid.Parse(c.Param("id"))
	_, _ = pool.Exec(c.Request.Context(), `UPDATE notifications SET read_at = NOW() WHERE notif_id = $1`, id)
	response.OK(c, gin.H{"ok": true})
}

func (a *API) createReportJob(c *gin.Context) {
	tid, _ := a.tenantPool(c)
	cl, _ := middleware.ClaimsFrom(c)
	pool, _ := a.TM.Pool(c.Request.Context(), *tid)
	var body struct {
		ReportType   string          `json:"report_type"`
		ExportFormat string          `json:"export_format"`
		Params       json.RawMessage `json:"params"`
	}
	if err := c.BindJSON(&body); err != nil {
		response.BadRequest(c, "invalid body")
		return
	}
	if body.ExportFormat == "" {
		body.ExportFormat = "json"
	}
	if body.Params == nil {
		body.Params = json.RawMessage(`{}`)
	}
	h := hashParams(body.ReportType, body.ExportFormat, body.Params)
	if cached, ok := queue.FindCachedJob(c.Request.Context(), pool, h); ok {
		a.getReportJobByID(c, pool, cached)
		return
	}
	var jobID uuid.UUID
	uid, _ := uuid.Parse(cl.Sub)
	err := pool.QueryRow(c.Request.Context(), `
		INSERT INTO report_jobs (report_type, export_format, params, params_hash, requested_by, status)
		VALUES ($1,$2,$3,$4,$5,'pending') RETURNING job_id`,
		body.ReportType, body.ExportFormat, body.Params, h, uid).Scan(&jobID)
	if err != nil {
		response.Internal(c, err.Error())
		return
	}
	if a.Queue != nil {
		_ = queue.EnqueueReport(a.Queue, queue.ReportPayload{
			JobID: jobID.String(), TenantID: tid.String(), ReportType: body.ReportType, ExportFormat: body.ExportFormat,
		})
	} else {
		a.runReportSync(c.Request.Context(), pool, *tid, jobID, body.ReportType, body.ExportFormat)
	}
	a.getReportJobByID(c, pool, jobID)
}

func (a *API) runReportSync(ctx context.Context, pool *pgxpool.Pool, tid, jobID uuid.UUID, reportType, format string) {
	_, _ = pool.Exec(ctx, `UPDATE report_jobs SET status = 'processing' WHERE job_id = $1`, jobID)
	rows, err := reports.RunQuery(ctx, pool, reportType)
	if err != nil {
		_, _ = pool.Exec(ctx, `UPDATE report_jobs SET status = 'failed', error_message = $2 WHERE job_id = $1`, jobID, err.Error())
		return
	}
	result, _ := reports.RowsToJSON(rows)
	var filePath, fileName *string
	if format == "pdf" {
		fp, fn, err := reports.ExportPDF(a.Cfg.ExportDir, reportType, rows)
		if err != nil {
			_, _ = pool.Exec(ctx, `UPDATE report_jobs SET status = 'failed', error_message = $2 WHERE job_id = $1`, jobID, err.Error())
			return
		}
		filePath, fileName = &fp, &fn
	} else if format == "xlsx" {
		fp, fn, err := reports.ExportExcel(a.Cfg.ExportDir, reportType, rows)
		if err != nil {
			_, _ = pool.Exec(ctx, `UPDATE report_jobs SET status = 'failed', error_message = $2 WHERE job_id = $1`, jobID, err.Error())
			return
		}
		filePath, fileName = &fp, &fn
	}
	_, _ = pool.Exec(ctx, `
		UPDATE report_jobs SET status = 'completed', result = $2, file_path = $3, file_name = $4, completed_at = NOW()
		WHERE job_id = $1`, jobID, result, filePath, fileName)
}

func (a *API) getReportJob(c *gin.Context) {
	tid, _ := a.tenantPool(c)
	pool, _ := a.TM.Pool(c.Request.Context(), *tid)
	id, _ := uuid.Parse(c.Param("id"))
	a.getReportJobByID(c, pool, id)
}

func (a *API) getReportJobByID(c *gin.Context, pool *pgxpool.Pool, id uuid.UUID) {
	var jobID uuid.UUID
	var reportType, exportFormat, status string
	var result []byte
	var fileName, errMsg *string
	var createdAt, completedAt interface{}
	err := pool.QueryRow(c.Request.Context(), `
		SELECT job_id, report_type, export_format, status, result, file_name, error_message, created_at, completed_at
		FROM report_jobs WHERE job_id = $1`, id).Scan(
		&jobID, &reportType, &exportFormat, &status, &result, &fileName, &errMsg, &createdAt, &completedAt)
	if err != nil {
		response.NotFound(c, "report job not found")
		return
	}
	job := gin.H{
		"id": jobID, "report_type": reportType, "export_format": exportFormat, "status": status,
		"created_at": createdAt, "completed_at": completedAt,
	}
	if len(result) > 0 {
		var parsed interface{}
		if json.Unmarshal(result, &parsed) == nil {
			job["result"] = parsed
		}
	}
	if errMsg != nil {
		job["error_message"] = *errMsg
	}
	if fileName != nil {
		job["file_name"] = *fileName
	}
	if exportFormat != "json" && status == "completed" && fileName != nil {
		job["download_url"] = fmt.Sprintf("/api/v1/reports/jobs/%s/download", jobID)
	} else {
		job["download_url"] = nil
	}
	response.OK(c, job)
}

func uuidSliceToStrings(ids []uuid.UUID) []string {
	if len(ids) == 0 {
		return []string{}
	}
	out := make([]string, len(ids))
	for i, id := range ids {
		out[i] = id.String()
	}
	return out
}

func (a *API) downloadReport(c *gin.Context) {
	tid, _ := a.tenantPool(c)
	pool, _ := a.TM.Pool(c.Request.Context(), *tid)
	id, _ := uuid.Parse(c.Param("id"))
	var path, name, format *string
	err := pool.QueryRow(c.Request.Context(), `SELECT file_path, file_name, export_format FROM report_jobs WHERE job_id = $1`, id).Scan(&path, &name, &format)
	if err != nil || path == nil {
		response.NotFound(c, "export file not found")
		return
	}
	f, err := os.Open(*path)
	if err != nil {
		response.NotFound(c, "export file not found")
		return
	}
	defer f.Close()
	mime := "application/octet-stream"
	if format != nil && *format == "pdf" {
		mime = "application/pdf"
	} else if format != nil && *format == "xlsx" {
		mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
	}
	c.Header("Content-Type", mime)
	c.Header("Content-Disposition", "attachment; filename="+*name)
	io.Copy(c.Writer, f)
}
