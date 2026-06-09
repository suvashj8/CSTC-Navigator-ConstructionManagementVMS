-- Ownership types (beyond owned / leased / rented).
CREATE TABLE IF NOT EXISTS ownership_type_catalog (
  ownership_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(80) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ownership_type_catalog_name_lower
  ON ownership_type_catalog (LOWER(TRIM(name)));

ALTER TABLE assets ALTER COLUMN ownership_type TYPE VARCHAR(80) USING ownership_type::text;

-- Maintenance job statuses (beyond Scheduled / In progress / Completed).
CREATE TABLE IF NOT EXISTS maintenance_status_catalog (
  status_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(80) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_maintenance_status_catalog_name_lower
  ON maintenance_status_catalog (LOWER(TRIM(name)));

-- Supplier categories (beyond repair / parts / fuel / rental / other).
CREATE TABLE IF NOT EXISTS supplier_category_catalog (
  category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(80) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_supplier_category_catalog_name_lower
  ON supplier_category_catalog (LOWER(TRIM(name)));

ALTER TABLE suppliers ALTER COLUMN category TYPE VARCHAR(80) USING category::text;

-- Driver contact number on profile.
ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20) NOT NULL DEFAULT '';
