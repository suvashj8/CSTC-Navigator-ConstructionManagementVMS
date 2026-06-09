-- Location types (beyond construction / workshop / yard / office).
CREATE TABLE IF NOT EXISTS location_type_catalog (
  type_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(80) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_location_type_catalog_name_lower
  ON location_type_catalog (LOWER(TRIM(name)));

-- Insurance policy status labels (beyond active / expiring / expired).
CREATE TABLE IF NOT EXISTS insurance_status_catalog (
  status_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(80) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_insurance_status_catalog_name_lower
  ON insurance_status_catalog (LOWER(TRIM(name)));

-- Insurance coverage types (beyond comprehensive / third_party / etc.).
CREATE TABLE IF NOT EXISTS insurance_coverage_catalog (
  coverage_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(80) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_insurance_coverage_catalog_name_lower
  ON insurance_coverage_catalog (LOWER(TRIM(name)));

ALTER TABLE insurance_policies ALTER COLUMN coverage_type TYPE VARCHAR(80) USING coverage_type::text;
