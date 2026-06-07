package queue

import (
	"context"
	"fmt"
	"log"

	"github.com/google/uuid"
	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/navigator/vms/pkg/tenantmgr"
)

const TypeExpiryScanAll = "expiry:scan_all"

var insuranceLeadDays = []int{90, 60, 30, 7}
var licenseLeadDays = []int{60, 30, 7}

func (s *Server) RegisterExpiry(mux *asynq.ServeMux) {
	mux.HandleFunc(TypeExpiryScanAll, s.handleExpiryScanAll)
}

func (s *Server) handleExpiryScanAll(ctx context.Context, t *asynq.Task) error {
	tenants, err := s.TM.ListActiveTenants(ctx)
	if err != nil {
		return err
	}
	for _, tid := range tenants {
		if err := scanTenantExpiries(ctx, s.TM, tid); err != nil {
			log.Printf("expiry scan tenant %s: %v", tid, err)
		}
	}
	return nil
}

func scanTenantExpiries(ctx context.Context, tm *tenantmgr.Manager, tenantID uuid.UUID) error {
	pool, err := tm.Pool(ctx, tenantID)
	if err != nil {
		return err
	}
	adminIDs, err := adminUserIDs(ctx, pool)
	if err != nil {
		return err
	}
	if err := scanInsuranceExpiries(ctx, pool, adminIDs); err != nil {
		return err
	}
	if err := scanLicenseExpiries(ctx, pool, adminIDs); err != nil {
		return err
	}
	return scanOverdueAllocations(ctx, pool, adminIDs)
}

func adminUserIDs(ctx context.Context, pool *pgxpool.Pool) ([]uuid.UUID, error) {
	rows, err := pool.Query(ctx, `SELECT user_id FROM users WHERE role IN ('admin','manager') AND status = 'active'`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []uuid.UUID
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, nil
}

func scanInsuranceExpiries(ctx context.Context, pool *pgxpool.Pool, adminIDs []uuid.UUID) error {
	for _, days := range insuranceLeadDays {
		rows, err := pool.Query(ctx, `
			SELECT ip.policy_id, a.reg_serial_no, ip.policy_no, ip.expiry_date
			FROM insurance_policies ip
			JOIN assets a ON a.asset_id = ip.asset_id
			WHERE ip.status = 'active'
		  AND ip.expiry_date = CURRENT_DATE + $1`, days)
		if err != nil {
			return err
		}
		for rows.Next() {
			var pid uuid.UUID
			var asset, policyNo string
			var expiry interface{}
			if err := rows.Scan(&pid, &asset, &policyNo, &expiry); err != nil {
				rows.Close()
				return err
			}
			title := fmt.Sprintf("Insurance expires in %d days", days)
			msg := fmt.Sprintf("Policy %s for asset %s expires on %v", policyNo, asset, expiry)
			for _, rid := range adminIDs {
				_ = insertNotificationIfNew(ctx, pool, &rid, "insurance", title, msg)
			}
		}
		rows.Close()
	}
	return nil
}

func scanLicenseExpiries(ctx context.Context, pool *pgxpool.Pool, adminIDs []uuid.UUID) error {
	for _, days := range licenseLeadDays {
		rows, err := pool.Query(ctx, `
			SELECT d.user_id, u.name, d.license_no, d.expiry_date
			FROM driver_profiles d
			JOIN users u ON u.user_id = d.user_id
			WHERE u.status = 'active'
			  AND d.expiry_date = CURRENT_DATE + $1`, days)
		if err != nil {
			return err
		}
		for rows.Next() {
			var uid uuid.UUID
			var name, licenseNo string
			var expiry interface{}
			if err := rows.Scan(&uid, &name, &licenseNo, &expiry); err != nil {
				rows.Close()
				return err
			}
			title := fmt.Sprintf("Driver license expires in %d days", days)
			msg := fmt.Sprintf("%s (license %s) expires on %v", name, licenseNo, expiry)
			_ = insertNotificationIfNew(ctx, pool, &uid, "license", title, msg)
			for _, rid := range adminIDs {
				_ = insertNotificationIfNew(ctx, pool, &rid, "license", title, msg)
			}
		}
		rows.Close()
	}
	return nil
}

func scanOverdueAllocations(ctx context.Context, pool *pgxpool.Pool, adminIDs []uuid.UUID) error {
	rows, err := pool.Query(ctx, `
		SELECT al.alloc_id, a.reg_serial_no, al.expected_return
		FROM allocations al
		JOIN assets a ON a.asset_id = al.asset_id
		WHERE al.state IN ('active','in_transit')
		  AND al.expected_return < CURRENT_DATE`)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var aid uuid.UUID
		var asset string
		var expected interface{}
		if err := rows.Scan(&aid, &asset, &expected); err != nil {
			return err
		}
		title := "Overdue asset return"
		msg := fmt.Sprintf("Asset %s was expected back by %v (allocation %s)", asset, expected, aid)
		for _, rid := range adminIDs {
			_ = insertNotificationIfNew(ctx, pool, &rid, "allocation", title, msg)
		}
	}
	return nil
}

func insertNotificationIfNew(ctx context.Context, pool *pgxpool.Pool, recipientID *uuid.UUID, typ, title, message string) error {
	var exists int
	err := pool.QueryRow(ctx, `
		SELECT 1 FROM notifications
		WHERE recipient_id IS NOT DISTINCT FROM $1
		  AND type = $2 AND title = $3 AND message = $4
		  AND created_at > NOW() - INTERVAL '23 hours'
		LIMIT 1`, recipientID, typ, title, message).Scan(&exists)
	if err == nil {
		return nil
	}
	_, err = pool.Exec(ctx, `
		INSERT INTO notifications (recipient_id, type, title, message, channel, status, sent_at)
		VALUES ($1,$2,$3,$4,'in_app','sent',NOW())`, recipientID, typ, title, message)
	return err
}

func RegisterExpirySchedule(scheduler *asynq.Scheduler) error {
	_, err := scheduler.Register("0 6 * * *", asynq.NewTask(TypeExpiryScanAll, nil))
	return err
}

func StartScheduler(redisAddr string) (*asynq.Scheduler, error) {
	scheduler := asynq.NewScheduler(asynq.RedisClientOpt{Addr: redisAddr}, nil)
	if err := RegisterExpirySchedule(scheduler); err != nil {
		return nil, err
	}
	go func() {
		if err := scheduler.Run(); err != nil {
			log.Printf("scheduler stopped: %v", err)
		}
	}()
	return scheduler, nil
}
