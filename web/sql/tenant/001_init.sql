-- Per-tenant database schema
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'manager', 'supervisor', 'employee', 'driver');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE asset_type AS ENUM ('vehicle', 'equipment', 'tool');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE asset_status AS ENUM ('active', 'in_repair', 'in_transit', 'decommissioned');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ownership_type AS ENUM ('owned', 'leased', 'rented');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE alloc_state AS ENUM ('pending', 'approved', 'in_transit', 'active', 'released', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE coverage_type AS ENUM ('comprehensive', 'third_party', 'fire_theft', 'liability');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE supplier_category AS ENUM ('repair', 'parts', 'fuel', 'rental', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notif_channel AS ENUM ('email', 'sms', 'in_app');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notif_status AS ENUM ('pending', 'sent', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS work_locations (
  location_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'construction',
  address TEXT,
  manager_id UUID,
  latitude DECIMAL(9,6),
  longitude DECIMAL(9,6),
  is_custom BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES work_locations(location_id),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'employee',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  password_hash TEXT NOT NULL,
  location_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS driver_profiles (
  driver_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
  license_no VARCHAR(50) NOT NULL,
  license_class VARCHAR(20) NOT NULL,
  issue_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  endorsements TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assets (
  asset_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES work_locations(location_id),
  asset_type asset_type NOT NULL,
  reg_serial_no VARCHAR(80) NOT NULL,
  make VARCHAR(80) NOT NULL,
  model VARCHAR(80) NOT NULL,
  year SMALLINT NOT NULL,
  ownership_type ownership_type NOT NULL DEFAULT 'owned',
  status asset_status NOT NULL DEFAULT 'active',
  assigned_driver_id UUID REFERENCES users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS allocations (
  alloc_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(asset_id),
  from_location_id UUID NOT NULL REFERENCES work_locations(location_id),
  to_location_id UUID NOT NULL REFERENCES work_locations(location_id),
  driver_id UUID NOT NULL REFERENCES users(user_id),
  approved_by UUID REFERENCES users(user_id),
  state alloc_state NOT NULL DEFAULT 'pending',
  start_date DATE NOT NULL,
  expected_return DATE NOT NULL,
  actual_return DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS insurance_policies (
  policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(asset_id),
  policy_no VARCHAR(80) NOT NULL,
  insurer_name VARCHAR(100) NOT NULL,
  coverage_type coverage_type NOT NULL,
  insured_value DECIMAL(15,2) NOT NULL DEFAULT 0,
  premium_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  start_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suppliers (
  supplier_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  category supplier_category NOT NULL,
  contact_name VARCHAR(80),
  email VARCHAR(150),
  phone VARCHAR(20),
  rating SMALLINT NOT NULL DEFAULT 3,
  is_preferred BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  notif_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID REFERENCES users(user_id),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  channel notif_channel NOT NULL DEFAULT 'in_app',
  status notif_status NOT NULL DEFAULT 'pending',
  read_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report_jobs (
  job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type VARCHAR(50) NOT NULL,
  export_format VARCHAR(10) NOT NULL DEFAULT 'json',
  params JSONB NOT NULL DEFAULT '{}',
  params_hash VARCHAR(64) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  result JSONB,
  file_path TEXT,
  file_name TEXT,
  error_message TEXT,
  requested_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS audit_logs (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(user_id),
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_alloc_asset_state ON allocations(asset_id, state);
CREATE INDEX IF NOT EXISTS idx_insurance_expiry ON insurance_policies(expiry_date, status);
CREATE INDEX IF NOT EXISTS idx_driver_expiry ON driver_profiles(expiry_date);
CREATE INDEX IF NOT EXISTS idx_notif_recipient ON notifications(recipient_id, read_at);
CREATE INDEX IF NOT EXISTS idx_report_jobs_hash ON report_jobs(params_hash, status, created_at);
