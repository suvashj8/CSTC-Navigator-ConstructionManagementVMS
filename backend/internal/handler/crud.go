package handler

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/hibiken/asynq"
	"github.com/navigator/vms/internal/queue"
	"github.com/navigator/vms/pkg/response"
	"golang.org/x/crypto/bcrypt"
)

func (a *API) createLocation(c *gin.Context) {
	tid, _ := a.tenantPool(c)
	pool, _ := a.TM.Pool(c.Request.Context(), *tid)
	var body struct {
		Name      string  `json:"name"`
		Type      string  `json:"type"`
		Address   string  `json:"address"`
		ManagerID *string `json:"manager_id"`
	}
	if err := c.BindJSON(&body); err != nil || body.Name == "" {
		response.BadRequest(c, "name is required")
		return
	}
	if body.Type == "" {
		body.Type = "construction"
	}
	mid, _ := optionalUUID(body.ManagerID)
	var id uuid.UUID
	err := pool.QueryRow(c.Request.Context(), `
		INSERT INTO work_locations (name, type, address, manager_id) VALUES ($1,$2,$3,$4) RETURNING location_id`,
		body.Name, body.Type, body.Address, mid).Scan(&id)
	if err != nil {
		response.Internal(c, err.Error())
		return
	}
	loc, _ := fetchLocation(c.Request.Context(), pool, id)
	response.Created(c, loc)
}

func (a *API) updateLocation(c *gin.Context) {
	tid, _ := a.tenantPool(c)
	pool, _ := a.TM.Pool(c.Request.Context(), *tid)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "invalid id")
		return
	}
	var body struct {
		Name      string  `json:"name"`
		Type      string  `json:"type"`
		Address   string  `json:"address"`
		ManagerID *string `json:"manager_id"`
	}
	if err := c.BindJSON(&body); err != nil {
		response.BadRequest(c, "invalid body")
		return
	}
	mid, _ := optionalUUID(body.ManagerID)
	_, err = pool.Exec(c.Request.Context(), `
		UPDATE work_locations SET name=$1, type=$2, address=$3, manager_id=$4 WHERE location_id=$5`,
		body.Name, body.Type, body.Address, mid, id)
	if err != nil {
		response.Internal(c, err.Error())
		return
	}
	loc, _ := fetchLocation(c.Request.Context(), pool, id)
	response.OK(c, loc)
}

func (a *API) createUser(c *gin.Context) {
	tid, _ := a.tenantPool(c)
	pool, _ := a.TM.Pool(c.Request.Context(), *tid)
	var body struct {
		Name       string  `json:"name"`
		Email      string  `json:"email"`
		Role       string  `json:"role"`
		Password   string  `json:"password"`
		LocationID *string `json:"location_id"`
	}
	if err := c.BindJSON(&body); err != nil || body.Name == "" || body.Email == "" || body.Password == "" {
		response.BadRequest(c, "name, email, and password are required")
		return
	}
	if body.Role == "" {
		body.Role = "employee"
	}
	locID, _ := optionalUUID(body.LocationID)
	hash, err := bcrypt.GenerateFromPassword([]byte(body.Password), 10)
	if err != nil {
		response.Internal(c, "password hash failed")
		return
	}
	var id uuid.UUID
	err = pool.QueryRow(c.Request.Context(), `
		INSERT INTO users (name, email, role, password_hash, location_id)
		VALUES ($1,$2,$3,$4,$5) RETURNING user_id`,
		body.Name, strings.ToLower(body.Email), body.Role, string(hash), locID).Scan(&id)
	if err != nil {
		response.Internal(c, err.Error())
		return
	}
	user, _ := fetchUser(c.Request.Context(), pool, id)
	response.Created(c, user)
}

func (a *API) updateUser(c *gin.Context) {
	tid, _ := a.tenantPool(c)
	pool, _ := a.TM.Pool(c.Request.Context(), *tid)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "invalid id")
		return
	}
	var body struct {
		Name       string  `json:"name"`
		Role       string  `json:"role"`
		Status     string  `json:"status"`
		LocationID *string `json:"location_id"`
		Password   string  `json:"password"`
	}
	if err := c.BindJSON(&body); err != nil {
		response.BadRequest(c, "invalid body")
		return
	}
	locID, _ := optionalUUID(body.LocationID)
	if body.Password != "" {
		hash, _ := bcrypt.GenerateFromPassword([]byte(body.Password), 10)
		_, err = pool.Exec(c.Request.Context(), `
			UPDATE users SET name=$1, role=$2, status=$3, location_id=$4, password_hash=$5 WHERE user_id=$6`,
			body.Name, body.Role, body.Status, locID, string(hash), id)
	} else {
		_, err = pool.Exec(c.Request.Context(), `
			UPDATE users SET name=$1, role=$2, status=$3, location_id=$4 WHERE user_id=$5`,
			body.Name, body.Role, body.Status, locID, id)
	}
	if err != nil {
		response.Internal(c, err.Error())
		return
	}
	user, _ := fetchUser(c.Request.Context(), pool, id)
	response.OK(c, user)
}

func (a *API) createDriver(c *gin.Context) {
	tid, _ := a.tenantPool(c)
	pool, _ := a.TM.Pool(c.Request.Context(), *tid)
	var body struct {
		Name         string  `json:"name"`
		Email        string  `json:"email"`
		Password     string  `json:"password"`
		LocationID   *string `json:"location_id"`
		LicenseNo    string  `json:"license_no"`
		LicenseClass string  `json:"license_class"`
		IssueDate    string  `json:"issue_date"`
		ExpiryDate   string  `json:"expiry_date"`
		Endorsements string  `json:"endorsements"`
	}
	if err := c.BindJSON(&body); err != nil || body.Name == "" || body.Email == "" || body.LicenseNo == "" {
		response.BadRequest(c, "name, email, and license_no are required")
		return
	}
	if body.Password == "" {
		body.Password = "driver123"
	}
	if body.LicenseClass == "" {
		body.LicenseClass = "B"
	}
	locID, _ := optionalUUID(body.LocationID)
	hash, _ := bcrypt.GenerateFromPassword([]byte(body.Password), 10)
	tx, err := pool.Begin(c.Request.Context())
	if err != nil {
		response.Internal(c, err.Error())
		return
	}
	defer tx.Rollback(c.Request.Context())
	var uid uuid.UUID
	err = tx.QueryRow(c.Request.Context(), `
		INSERT INTO users (name, email, role, password_hash, location_id)
		VALUES ($1,$2,'driver',$3,$4) RETURNING user_id`,
		body.Name, strings.ToLower(body.Email), string(hash), locID).Scan(&uid)
	if err != nil {
		response.Internal(c, err.Error())
		return
	}
	var did uuid.UUID
	err = tx.QueryRow(c.Request.Context(), `
		INSERT INTO driver_profiles (user_id, license_no, license_class, issue_date, expiry_date, endorsements)
		VALUES ($1,$2,$3,$4,$5,$6) RETURNING driver_id`,
		uid, body.LicenseNo, body.LicenseClass, body.IssueDate, body.ExpiryDate, body.Endorsements).Scan(&did)
	if err != nil {
		response.Internal(c, err.Error())
		return
	}
	if err := tx.Commit(c.Request.Context()); err != nil {
		response.Internal(c, err.Error())
		return
	}
	driver, _ := fetchDriver(c.Request.Context(), pool, did)
	response.Created(c, driver)
}

func (a *API) updateDriver(c *gin.Context) {
	tid, _ := a.tenantPool(c)
	pool, _ := a.TM.Pool(c.Request.Context(), *tid)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "invalid id")
		return
	}
	var body struct {
		LicenseNo    string `json:"license_no"`
		LicenseClass string `json:"license_class"`
		IssueDate    string `json:"issue_date"`
		ExpiryDate   string `json:"expiry_date"`
		Endorsements string `json:"endorsements"`
	}
	if err := c.BindJSON(&body); err != nil {
		response.BadRequest(c, "invalid body")
		return
	}
	_, err = pool.Exec(c.Request.Context(), `
		UPDATE driver_profiles SET license_no=$1, license_class=$2, issue_date=$3, expiry_date=$4, endorsements=$5
		WHERE driver_id=$6`, body.LicenseNo, body.LicenseClass, body.IssueDate, body.ExpiryDate, body.Endorsements, id)
	if err != nil {
		response.Internal(c, err.Error())
		return
	}
	driver, _ := fetchDriver(c.Request.Context(), pool, id)
	response.OK(c, driver)
}

func (a *API) createInsurance(c *gin.Context) {
	tid, _ := a.tenantPool(c)
	pool, _ := a.TM.Pool(c.Request.Context(), *tid)
	var body struct {
		AssetID       string  `json:"asset_id"`
		PolicyNo      string  `json:"policy_no"`
		InsurerName   string  `json:"insurer_name"`
		CoverageType  string  `json:"coverage_type"`
		InsuredValue  float64 `json:"insured_value"`
		PremiumAmount float64 `json:"premium_amount"`
		StartDate     string  `json:"start_date"`
		ExpiryDate    string  `json:"expiry_date"`
		Status        string  `json:"status"`
	}
	if err := c.BindJSON(&body); err != nil || body.AssetID == "" || body.PolicyNo == "" {
		response.BadRequest(c, "asset_id and policy_no are required")
		return
	}
	if body.Status == "" {
		body.Status = "active"
	}
	aid, _ := uuid.Parse(body.AssetID)
	var id uuid.UUID
	err := pool.QueryRow(c.Request.Context(), `
		INSERT INTO insurance_policies (asset_id, policy_no, insurer_name, coverage_type, insured_value, premium_amount, start_date, expiry_date, status)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING policy_id`,
		aid, body.PolicyNo, body.InsurerName, body.CoverageType, body.InsuredValue, body.PremiumAmount, body.StartDate, body.ExpiryDate, body.Status).Scan(&id)
	if err != nil {
		response.Internal(c, err.Error())
		return
	}
	pol, _ := fetchInsurance(c.Request.Context(), pool, id)
	response.Created(c, pol)
}

func (a *API) updateInsurance(c *gin.Context) {
	tid, _ := a.tenantPool(c)
	pool, _ := a.TM.Pool(c.Request.Context(), *tid)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "invalid id")
		return
	}
	var body struct {
		PolicyNo      string  `json:"policy_no"`
		InsurerName   string  `json:"insurer_name"`
		CoverageType  string  `json:"coverage_type"`
		InsuredValue  float64 `json:"insured_value"`
		PremiumAmount float64 `json:"premium_amount"`
		StartDate     string  `json:"start_date"`
		ExpiryDate    string  `json:"expiry_date"`
		Status        string  `json:"status"`
	}
	if err := c.BindJSON(&body); err != nil {
		response.BadRequest(c, "invalid body")
		return
	}
	_, err = pool.Exec(c.Request.Context(), `
		UPDATE insurance_policies SET policy_no=$1, insurer_name=$2, coverage_type=$3, insured_value=$4,
		premium_amount=$5, start_date=$6, expiry_date=$7, status=$8 WHERE policy_id=$9`,
		body.PolicyNo, body.InsurerName, body.CoverageType, body.InsuredValue, body.PremiumAmount, body.StartDate, body.ExpiryDate, body.Status, id)
	if err != nil {
		response.Internal(c, err.Error())
		return
	}
	pol, _ := fetchInsurance(c.Request.Context(), pool, id)
	response.OK(c, pol)
}

func (a *API) createSupplier(c *gin.Context) {
	tid, _ := a.tenantPool(c)
	pool, _ := a.TM.Pool(c.Request.Context(), *tid)
	var body struct {
		Name        string `json:"name"`
		Category    string `json:"category"`
		ContactName string `json:"contact_name"`
		Email       string `json:"email"`
		Phone       string `json:"phone"`
		Rating      int16  `json:"rating"`
		IsPreferred bool   `json:"is_preferred"`
	}
	if err := c.BindJSON(&body); err != nil || body.Name == "" || body.Category == "" {
		response.BadRequest(c, "name and category are required")
		return
	}
	if body.Rating == 0 {
		body.Rating = 3
	}
	var id uuid.UUID
	err := pool.QueryRow(c.Request.Context(), `
		INSERT INTO suppliers (name, category, contact_name, email, phone, rating, is_preferred)
		VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING supplier_id`,
		body.Name, body.Category, body.ContactName, body.Email, body.Phone, body.Rating, body.IsPreferred).Scan(&id)
	if err != nil {
		response.Internal(c, err.Error())
		return
	}
	sup, _ := fetchSupplier(c.Request.Context(), pool, id)
	response.Created(c, sup)
}

func (a *API) updateSupplier(c *gin.Context) {
	tid, _ := a.tenantPool(c)
	pool, _ := a.TM.Pool(c.Request.Context(), *tid)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "invalid id")
		return
	}
	var body struct {
		Name        string `json:"name"`
		Category    string `json:"category"`
		ContactName string `json:"contact_name"`
		Email       string `json:"email"`
		Phone       string `json:"phone"`
		Rating      int16  `json:"rating"`
		IsPreferred bool   `json:"is_preferred"`
	}
	if err := c.BindJSON(&body); err != nil {
		response.BadRequest(c, "invalid body")
		return
	}
	_, err = pool.Exec(c.Request.Context(), `
		UPDATE suppliers SET name=$1, category=$2, contact_name=$3, email=$4, phone=$5, rating=$6, is_preferred=$7
		WHERE supplier_id=$8`, body.Name, body.Category, body.ContactName, body.Email, body.Phone, body.Rating, body.IsPreferred, id)
	if err != nil {
		response.Internal(c, err.Error())
		return
	}
	sup, _ := fetchSupplier(c.Request.Context(), pool, id)
	response.OK(c, sup)
}

func (a *API) triggerExpiryScan(c *gin.Context) {
	if a.Queue == nil {
		response.Internal(c, "queue unavailable")
		return
	}
	_, err := a.Queue.Enqueue(asynq.NewTask(queue.TypeExpiryScanAll, nil))
	if err != nil {
		response.Internal(c, err.Error())
		return
	}
	response.OK(c, gin.H{"queued": true})
}
