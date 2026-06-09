-- Tenant-defined asset types (beyond vehicle / equipment / tool).
CREATE TABLE IF NOT EXISTS asset_type_catalog (
  type_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(80) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_asset_type_catalog_name_lower
  ON asset_type_catalog (LOWER(TRIM(name)));

-- Allow custom type names on assets (built-ins remain vehicle, equipment, tool).
ALTER TABLE assets ALTER COLUMN asset_type TYPE VARCHAR(80) USING asset_type::text;
