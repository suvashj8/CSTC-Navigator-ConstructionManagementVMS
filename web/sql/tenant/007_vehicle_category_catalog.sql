-- Tenant-defined vehicle categories (Crane, Mixer, etc.) with operation mode defaults.
CREATE TABLE IF NOT EXISTS vehicle_category_catalog (
  category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(80) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  operation_modes VARCHAR(10) NOT NULL DEFAULT 'km',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT vehicle_category_catalog_modes_chk CHECK (operation_modes IN ('km', 'hour', 'both'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicle_category_catalog_name_lower
  ON vehicle_category_catalog (LOWER(TRIM(name)));
