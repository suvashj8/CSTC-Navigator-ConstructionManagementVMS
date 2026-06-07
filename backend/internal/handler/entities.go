package handler

import (
	"context"
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

const assetRegistrySelect = `, a.vehicle_category, a.department, a.rta_office, a.alert_cell_number,
		a.registration_date, a.bluebook_no, a.bluebook_issued_at, a.bluebook_expires_at,
		a.operation_mode, a.route_from, a.route_to, a.operation_km,
		a.operation_place, a.operation_hours, a.operation_minutes`

func assetRegistryMap(
	vehicleCategory, department, rtaOffice, alertCell, bluebookNo, opMode, routeFrom, routeTo, opPlace *string,
	regDate, bbIssued, bbExpires interface{},
	opKm *float64,
	opHours, opMinutes *int16,
) gin.H {
	return gin.H{
		"vehicle_category":    vehicleCategory,
		"department":        department,
		"rta_office":        rtaOffice,
		"alert_cell_number": alertCell,
		"registration_date": regDate,
		"bluebook_no":       bluebookNo,
		"bluebook_issued_at": bbIssued,
		"bluebook_expires_at": bbExpires,
		"operation_mode":    opMode,
		"route_from":        routeFrom,
		"route_to":          routeTo,
		"operation_km":      opKm,
		"operation_place":   opPlace,
		"operation_hours":   opHours,
		"operation_minutes": opMinutes,
	}
}

func fetchAsset(ctx context.Context, pool *pgxpool.Pool, id uuid.UUID) (gin.H, error) {
	var assetID, locID uuid.UUID
	var atype, reg, make, model, otype, status string
	var year int16
	var locName, driverName *string
	var driverID *uuid.UUID
	var vehicleCategory, department, rtaOffice, alertCell, bluebookNo, opMode, routeFrom, routeTo, opPlace *string
	var regDate, bbIssued, bbExpires interface{}
	var opKm *float64
	var opHours, opMinutes *int16
	err := pool.QueryRow(ctx, `
		SELECT a.asset_id, a.asset_type, a.reg_serial_no, a.make, a.model, a.year, a.ownership_type, a.status,
		       a.location_id, wl.name, a.assigned_driver_id, u.name`+assetRegistrySelect+`
		FROM assets a
		LEFT JOIN work_locations wl ON wl.location_id = a.location_id
		LEFT JOIN users u ON u.user_id = a.assigned_driver_id
		WHERE a.asset_id = $1`, id).Scan(
		&assetID, &atype, &reg, &make, &model, &year, &otype, &status, &locID, &locName, &driverID, &driverName,
		&vehicleCategory, &department, &rtaOffice, &alertCell, &regDate, &bluebookNo, &bbIssued, &bbExpires,
		&opMode, &routeFrom, &routeTo, &opKm, &opPlace, &opHours, &opMinutes)
	if err != nil {
		return nil, err
	}
	h := gin.H{
		"id": assetID, "asset_type": atype, "reg_serial_no": reg, "make": make, "model": model,
		"year": year, "ownership_type": otype, "status": status, "location_id": locID,
		"location_name": locName, "assigned_driver_id": driverID, "assigned_driver_name": driverName,
	}
	for k, v := range assetRegistryMap(vehicleCategory, department, rtaOffice, alertCell, bluebookNo, opMode, routeFrom, routeTo, opPlace, regDate, bbIssued, bbExpires, opKm, opHours, opMinutes) {
		h[k] = v
	}
	return h, nil
}

func fetchAllocation(ctx context.Context, pool *pgxpool.Pool, id uuid.UUID) (gin.H, error) {
	var allocID, assetID, fromID, toID, driverID uuid.UUID
	var label, fl, tl, driver, st string
	var start, exp, actual interface{}
	var approvedBy *uuid.UUID
	err := pool.QueryRow(ctx, `
		SELECT al.alloc_id, al.asset_id, a.reg_serial_no || ' — ' || a.make || ' ' || a.model,
		       al.from_location_id, fl.name, al.to_location_id, tl.name,
		       al.driver_id, d.name, al.approved_by, al.state, al.start_date, al.expected_return, al.actual_return
		FROM allocations al
		JOIN assets a ON a.asset_id = al.asset_id
		JOIN work_locations fl ON fl.location_id = al.from_location_id
		JOIN work_locations tl ON tl.location_id = al.to_location_id
		JOIN users d ON d.user_id = al.driver_id
		WHERE al.alloc_id = $1`, id).Scan(
		&allocID, &assetID, &label, &fromID, &fl, &toID, &tl, &driverID, &driver, &approvedBy, &st, &start, &exp, &actual)
	if err != nil {
		return nil, err
	}
	return gin.H{
		"id": allocID, "asset_id": assetID, "asset_label": label,
		"from_location_id": fromID, "from_location_name": fl,
		"to_location_id": toID, "to_location_name": tl,
		"driver_id": driverID, "driver_name": driver, "approved_by": approvedBy,
		"state": st, "start_date": start, "expected_return": exp, "actual_return": actual,
	}, nil
}

func fetchLocation(ctx context.Context, pool *pgxpool.Pool, id uuid.UUID) (gin.H, error) {
	var locID uuid.UUID
	var name, typ, addr string
	var mid *uuid.UUID
	var mname *string
	var custom bool
	err := pool.QueryRow(ctx, `
		SELECT wl.location_id, wl.name, wl.type, wl.address, wl.manager_id, u.name, wl.is_custom
		FROM work_locations wl LEFT JOIN users u ON u.user_id = wl.manager_id
		WHERE wl.location_id = $1`, id).Scan(&locID, &name, &typ, &addr, &mid, &mname, &custom)
	if err != nil {
		return nil, err
	}
	return gin.H{"id": locID, "name": name, "type": typ, "address": addr, "manager_id": mid, "manager_name": mname, "is_custom": custom}, nil
}

func fetchUser(ctx context.Context, pool *pgxpool.Pool, id uuid.UUID) (gin.H, error) {
	var uid uuid.UUID
	var name, email, role, status string
	var locID *uuid.UUID
	var locName *string
	err := pool.QueryRow(ctx, `
		SELECT u.user_id, u.name, u.email, u.role, u.status, u.location_id, wl.name
		FROM users u LEFT JOIN work_locations wl ON wl.location_id = u.location_id
		WHERE u.user_id = $1`, id).Scan(&uid, &name, &email, &role, &status, &locID, &locName)
	if err != nil {
		return nil, err
	}
	return gin.H{"id": uid, "name": name, "email": email, "role": role, "status": status, "location_id": locID, "location_name": locName}, nil
}

func fetchDriver(ctx context.Context, pool *pgxpool.Pool, id uuid.UUID) (gin.H, error) {
	var did, uid uuid.UUID
	var name, email, lno, lclass, status string
	var issue, exp interface{}
	err := pool.QueryRow(ctx, `
		SELECT d.driver_id, d.user_id, u.name, u.email, d.license_no, d.license_class, d.issue_date, d.expiry_date,
		CASE WHEN d.expiry_date < CURRENT_DATE THEN 'expired' WHEN d.expiry_date <= CURRENT_DATE + 60 THEN 'expiring' ELSE 'valid' END
		FROM driver_profiles d JOIN users u ON u.user_id = d.user_id WHERE d.driver_id = $1`, id).Scan(
		&did, &uid, &name, &email, &lno, &lclass, &issue, &exp, &status)
	if err != nil {
		return nil, err
	}
	return gin.H{"id": did, "user_id": uid, "name": name, "email": email, "license_no": lno, "license_class": lclass, "issue_date": issue, "expiry_date": exp, "status": status}, nil
}

func fetchInsurance(ctx context.Context, pool *pgxpool.Pool, id uuid.UUID) (gin.H, error) {
	var pid, aid uuid.UUID
	var asset, pno, insurer, cov, status string
	var iv, prem float64
	var start, exp interface{}
	err := pool.QueryRow(ctx, `
		SELECT ip.policy_id, ip.asset_id, a.reg_serial_no, ip.policy_no, ip.insurer_name, ip.coverage_type,
		       ip.insured_value, ip.premium_amount, ip.start_date, ip.expiry_date, ip.status
		FROM insurance_policies ip JOIN assets a ON a.asset_id = ip.asset_id WHERE ip.policy_id = $1`, id).Scan(
		&pid, &aid, &asset, &pno, &insurer, &cov, &iv, &prem, &start, &exp, &status)
	if err != nil {
		return nil, err
	}
	return gin.H{"id": pid, "asset_id": aid, "asset_label": asset, "policy_no": pno, "insurer_name": insurer, "coverage_type": cov, "insured_value": iv, "premium_amount": prem, "start_date": start, "expiry_date": exp, "status": status}, nil
}

func fetchSupplier(ctx context.Context, pool *pgxpool.Pool, id uuid.UUID) (gin.H, error) {
	var sid uuid.UUID
	var name, cat string
	var contact, email, phone *string
	var rating int16
	var pref bool
	err := pool.QueryRow(ctx, `
		SELECT supplier_id, name, category, contact_name, email, phone, rating, is_preferred
		FROM suppliers WHERE supplier_id = $1`, id).Scan(&sid, &name, &cat, &contact, &email, &phone, &rating, &pref)
	if err != nil {
		return nil, err
	}
	return gin.H{"id": sid, "name": name, "category": cat, "contact_name": contact, "email": email, "phone": phone, "rating": rating, "is_preferred": pref}, nil
}

func scanAssetRow(rows interface {
	Scan(dest ...any) error
}) (gin.H, error) {
	var id, locID uuid.UUID
	var atype, reg, make, model, otype, status string
	var year int16
	var locName, driverName *string
	var driverID *uuid.UUID
	var vehicleCategory, department, rtaOffice, alertCell, bluebookNo, opMode, routeFrom, routeTo, opPlace *string
	var regDate, bbIssued, bbExpires interface{}
	var opKm *float64
	var opHours, opMinutes *int16
	if err := rows.Scan(&id, &atype, &reg, &make, &model, &year, &otype, &status, &locID, &locName, &driverID, &driverName,
		&vehicleCategory, &department, &rtaOffice, &alertCell, &regDate, &bluebookNo, &bbIssued, &bbExpires,
		&opMode, &routeFrom, &routeTo, &opKm, &opPlace, &opHours, &opMinutes); err != nil {
		return nil, err
	}
	h := gin.H{"id": id, "asset_type": atype, "reg_serial_no": reg, "make": make, "model": model, "year": year, "ownership_type": otype, "status": status, "location_id": locID, "location_name": locName, "assigned_driver_id": driverID, "assigned_driver_name": driverName}
	for k, v := range assetRegistryMap(vehicleCategory, department, rtaOffice, alertCell, bluebookNo, opMode, routeFrom, routeTo, opPlace, regDate, bbIssued, bbExpires, opKm, opHours, opMinutes) {
		h[k] = v
	}
	return h, nil
}

func scanAllocationRow(rows interface {
	Scan(dest ...any) error
}) (gin.H, error) {
	var id, aid, fromID, toID, driverID uuid.UUID
	var label, fl, tl, driver, st string
	var start, exp interface{}
	if err := rows.Scan(&id, &aid, &label, &fromID, &fl, &toID, &tl, &driverID, &driver, &st, &start, &exp); err != nil {
		return nil, err
	}
	return gin.H{"id": id, "asset_id": aid, "asset_label": label, "from_location_id": fromID, "from_location_name": fl, "to_location_id": toID, "to_location_name": tl, "driver_id": driverID, "driver_name": driver, "state": st, "start_date": start, "expected_return": exp}, nil
}

func optionalUUID(v interface{}) (*uuid.UUID, error) {
	if v == nil {
		return nil, nil
	}
	switch t := v.(type) {
	case string:
		if t == "" {
			return nil, nil
		}
		id, err := uuid.Parse(t)
		if err != nil {
			return nil, err
		}
		return &id, nil
	default:
		return nil, fmt.Errorf("invalid uuid")
	}
}
