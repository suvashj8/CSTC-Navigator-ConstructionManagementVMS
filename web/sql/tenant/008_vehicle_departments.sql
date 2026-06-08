-- Tenant-defined vehicle departments (fleet org units).
CREATE TABLE IF NOT EXISTS vehicle_departments (
  department_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicle_departments_name_lower
  ON vehicle_departments (LOWER(TRIM(name)));
