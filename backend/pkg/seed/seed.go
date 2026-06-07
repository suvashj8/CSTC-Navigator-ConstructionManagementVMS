package seed

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/navigator/vms/internal/config"
	"github.com/navigator/vms/pkg/tenantmgr"
	"golang.org/x/crypto/bcrypt"
)

const (
	superEmail    = "super@vms.local"
	superPassword = "super123"
	demoSubdomain = "demo"
	adminEmail    = "admin@vms.local"
	adminPassword = "admin123"
)

type roleAccount struct {
	Name     string
	Email    string
	Password string
	Role     string
}

// Demo accounts shown on the login page — must exist in the tenant DB when using the real API.
var demoRoleAccounts = []roleAccount{
	{Name: "Ram Thapa", Email: "manager@vms.local", Password: "manager123", Role: "manager"},
	{Name: "Sita Sharma", Email: "supervisor@vms.local", Password: "super123", Role: "supervisor"},
	{Name: "Hari KC", Email: "employee@vms.local", Password: "employee123", Role: "employee"},
	{Name: "Bikash Rai", Email: "driver@vms.local", Password: "driver123", Role: "driver"},
}

func Run(ctx context.Context, cfg *config.Config, tm *tenantmgr.Manager) error {
	if err := seedSuperUser(ctx, tm); err != nil {
		return fmt.Errorf("super user: %w", err)
	}

	info, err := tm.BySubdomain(ctx, demoSubdomain)
	if err != nil {
		id, provErr := tm.Provision(ctx, "Demo Construction Co.", demoSubdomain, adminEmail, adminPassword, "Demo Admin")
		if provErr != nil {
			return fmt.Errorf("demo tenant: %w", provErr)
		}
		if err := seedDemoData(ctx, tm, id); err != nil {
			return fmt.Errorf("demo data: %w", err)
		}
		return nil
	}

	// Demo tenant already exists — still ensure role accounts (idempotent).
	if err := ensureDemoRoleUsers(ctx, tm, info.ID); err != nil {
		return fmt.Errorf("demo users: %w", err)
	}
	return nil
}

func seedSuperUser(ctx context.Context, tm *tenantmgr.Manager) error {
	var exists int
	err := tm.Main().QueryRow(ctx, `SELECT 1 FROM super_users WHERE email = $1`, superEmail).Scan(&exists)
	if err == nil {
		return nil
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(superPassword), 10)
	if err != nil {
		return err
	}
	_, err = tm.Main().Exec(ctx, `INSERT INTO super_users (name, email, password_hash) VALUES ($1,$2,$3)`, "Platform Admin", superEmail, string(hash))
	return err
}

func ensureDemoRoleUsers(ctx context.Context, tm *tenantmgr.Manager, tenantID uuid.UUID) error {
	pool, err := tm.Pool(ctx, tenantID)
	if err != nil {
		return err
	}

	var loc1 uuid.UUID
	err = pool.QueryRow(ctx, `SELECT location_id FROM work_locations ORDER BY created_at LIMIT 1`).Scan(&loc1)
	if err != nil {
		return fmt.Errorf("work location: %w", err)
	}

	var locIDs []uuid.UUID
	rows, err := pool.Query(ctx, `SELECT location_id FROM work_locations ORDER BY created_at LIMIT 2`)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return err
		}
		locIDs = append(locIDs, id)
	}
	if len(locIDs) == 0 {
		locIDs = []uuid.UUID{loc1}
	}

	for _, acct := range demoRoleAccounts {
		hash, err := bcrypt.GenerateFromPassword([]byte(acct.Password), 10)
		if err != nil {
			return err
		}

		var locationID *uuid.UUID
		locationIDs := []uuid.UUID{}
		switch acct.Role {
		case "manager":
			locationID = &loc1
		case "supervisor":
			locationIDs = append([]uuid.UUID{}, locIDs...)
		case "employee", "driver":
			locationIDs = []uuid.UUID{loc1}
			if acct.Role == "driver" {
				locationID = &loc1
			}
		}

		tag, err := pool.Exec(ctx, `
			INSERT INTO users (name, email, role, password_hash, location_id, location_ids)
			VALUES ($1, $2, $3, $4, $5, $6)
			ON CONFLICT (email) DO NOTHING`,
			acct.Name, acct.Email, acct.Role, string(hash), locationID, locationIDs)
		if err != nil {
			return fmt.Errorf("insert %s: %w", acct.Email, err)
		}
		if tag.RowsAffected() == 0 {
			// Refresh password for existing demo accounts so login page credentials stay valid.
			_, err = pool.Exec(ctx, `
				UPDATE users SET password_hash = $1, name = $2, role = $3, location_id = $4, location_ids = $5
				WHERE email = $6`,
				string(hash), acct.Name, acct.Role, locationID, locationIDs, acct.Email)
			if err != nil {
				return fmt.Errorf("update %s: %w", acct.Email, err)
			}
		}
	}

	var driverUserID uuid.UUID
	err = pool.QueryRow(ctx, `SELECT user_id FROM users WHERE email = $1`, "driver@vms.local").Scan(&driverUserID)
	if err != nil {
		return fmt.Errorf("driver user: %w", err)
	}

	var profileExists int
	_ = pool.QueryRow(ctx, `SELECT 1 FROM driver_profiles WHERE user_id = $1`, driverUserID).Scan(&profileExists)
	if profileExists != 1 {
		_, err = pool.Exec(ctx, `
			INSERT INTO driver_profiles (user_id, license_no, license_class, issue_date, expiry_date)
			VALUES ($1, '01-06-0023456', 'B', '2020-01-15', '2026-08-20')`, driverUserID)
		if err != nil {
			return fmt.Errorf("driver profile: %w", err)
		}
	}

	return nil
}

func seedDemoData(ctx context.Context, tm *tenantmgr.Manager, tenantID uuid.UUID) error {
	pool, err := tm.Pool(ctx, tenantID)
	if err != nil {
		return err
	}

	if err := ensureDemoRoleUsers(ctx, tm, tenantID); err != nil {
		return err
	}

	var loc1 uuid.UUID
	err = pool.QueryRow(ctx, `SELECT location_id FROM work_locations WHERE name = 'Main Site'`).Scan(&loc1)
	if err != nil {
		return err
	}

	var loc2 uuid.UUID
	err = pool.QueryRow(ctx, `
		INSERT INTO work_locations (name, type, address) VALUES ('Pokhara Lakeside Project', 'construction', 'Pokhara')
		RETURNING location_id`).Scan(&loc2)
	if err != nil {
		_ = pool.QueryRow(ctx, `SELECT location_id FROM work_locations WHERE name = 'Pokhara Lakeside Project'`).Scan(&loc2)
	}
	_, _ = pool.Exec(ctx, `
		INSERT INTO work_locations (name, type, address) VALUES ('Bhaktapur Ring Road Site', 'construction', 'Bhaktapur')`)

	var driverUserID uuid.UUID
	err = pool.QueryRow(ctx, `SELECT user_id FROM users WHERE email = 'driver@vms.local'`).Scan(&driverUserID)
	if err != nil {
		return err
	}

	var assetCount int
	_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM assets`).Scan(&assetCount)
	if assetCount > 0 {
		return nil
	}

	var asset1, asset2 uuid.UUID
	err = pool.QueryRow(ctx, `
		INSERT INTO assets (location_id, asset_type, reg_serial_no, make, model, year, ownership_type, status, assigned_driver_id,
			vehicle_category, department, rta_office, alert_cell_number, registration_date, bluebook_no, bluebook_issued_at, bluebook_expires_at,
			operation_mode, route_from, route_to, operation_km, operation_place, operation_hours, operation_minutes)
		VALUES ($1, 'vehicle', 'Ba 1 Pa 4521', 'Tata', 'Prima', 2022, 'owned', 'active', $2,
			'Truck', 'Transport', 'Yatayat / Transport Management Office — Kathmandu (Bagmati Province)',
			'9801112233', '2022-01-15', 'BB-4521-2022', '2022-01-15', '2027-01-14',
			'km', 'Kathmandu', 'Pokhara', 200.00, NULL, NULL, NULL) RETURNING asset_id`, loc1, driverUserID).Scan(&asset1)
	if err != nil {
		return err
	}
	err = pool.QueryRow(ctx, `
		INSERT INTO assets (location_id, asset_type, reg_serial_no, make, model, year, ownership_type, status,
			vehicle_category, department, operation_mode, operation_place, operation_hours, operation_minutes)
		VALUES ($1, 'vehicle', 'DOZ-9901', 'JCB', '3DX', 2020, 'owned', 'active',
			'Dozer', 'Operations', 'hour', 'Bhaktapur Ring Road Site', 6, 30) RETURNING asset_id`, loc1).Scan(&asset2)
	if err != nil {
		return err
	}

	_, _ = pool.Exec(ctx, `
		INSERT INTO insurance_policies (asset_id, policy_no, insurer_name, coverage_type, insured_value, premium_amount, start_date, expiry_date)
		VALUES ($1, 'POL-2025-88421', 'Nepal Insurance', 'comprehensive', 3500000, 45000, '2025-07-01', '2026-06-30')`, asset1)

	if loc2 != uuid.Nil {
		_, _ = pool.Exec(ctx, `
			INSERT INTO allocations (asset_id, from_location_id, to_location_id, driver_id, state, start_date, expected_return)
			VALUES ($1, $2, $3, $4, 'in_transit', CURRENT_DATE - 2, CURRENT_DATE + 5)`, asset2, loc1, loc2, driverUserID)
	}

	var supplierID uuid.UUID
	_ = pool.QueryRow(ctx, `
		INSERT INTO suppliers (name, category, contact_name, email, phone, rating, is_preferred)
		VALUES ('Kathmandu Auto Works', 'repair', 'Gopal Thapa', 'service@kaw.np', '9809988776', 5, true)
		RETURNING supplier_id`).Scan(&supplierID)
	if supplierID == uuid.Nil {
		_ = pool.QueryRow(ctx, `SELECT supplier_id FROM suppliers WHERE name = 'Kathmandu Auto Works' LIMIT 1`).Scan(&supplierID)
	}
	_, _ = pool.Exec(ctx, `
		INSERT INTO suppliers (name, category, contact_name, email, phone, rating, is_preferred)
		VALUES ('Himalayan Parts Ltd', 'parts', 'Ram Shrestha', 'parts@himalayan.np', '9801234567', 4, true)`)

	_, _ = pool.Exec(ctx, `
		INSERT INTO fuel_logs (asset_id, fueled_at, odometer_km, liters, total_cost, notes)
		VALUES
			($1, NOW() - INTERVAL '45 days', 47200, 110, 17800, 'Demo fill — Kathmandu'),
			($1, NOW() - INTERVAL '15 days', 48500, 95, 15400, 'Demo fill — Pokhara route')`, asset1)

	_, _ = pool.Exec(ctx, `
		INSERT INTO maintenance_jobs (asset_id, supplier_id, scheduled_at, status, description, parts_cost, labor_cost, odometer_at_service, notes)
		VALUES ($1, $2, CURRENT_DATE + 14, 'Scheduled', 'Oil change & filter', 3500, 1500, 48500, 'Demo work order')`, asset1, supplierID)

	_, _ = pool.Exec(ctx, `
		INSERT INTO notifications (recipient_id, type, title, message, channel, status, sent_at)
		SELECT user_id, 'insurance', 'Policy expiring soon', 'Insurance for Ba 1 Pa 4521 expires in 30 days', 'in_app', 'sent', NOW()
		FROM users WHERE email = $1`, adminEmail)

	return nil
}
