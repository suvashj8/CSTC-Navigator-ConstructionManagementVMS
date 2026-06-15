-- Tenant-defined vehicle manufacturers (beyond built-in fleet brands).
CREATE TABLE IF NOT EXISTS vehicle_make_catalog (
  make_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(80) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicle_make_catalog_name_lower
  ON vehicle_make_catalog (LOWER(TRIM(name)));
