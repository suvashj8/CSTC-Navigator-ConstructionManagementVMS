-- Tenant-defined operation mode labels (how trips / usage are recorded).
CREATE TABLE IF NOT EXISTS operation_mode_catalog (
  mode_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(80) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  tracking_type VARCHAR(10) NOT NULL DEFAULT 'km',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT operation_mode_catalog_tracking_chk CHECK (tracking_type IN ('km', 'hour', 'both'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_operation_mode_catalog_name_lower
  ON operation_mode_catalog (LOWER(TRIM(name)));

ALTER TABLE assets ADD COLUMN IF NOT EXISTS operation_mode_label VARCHAR(80);
