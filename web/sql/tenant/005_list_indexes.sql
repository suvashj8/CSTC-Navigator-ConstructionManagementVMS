-- Indexes for paginated list queries and expiry scans

CREATE INDEX IF NOT EXISTS idx_assets_status_created
  ON assets (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_assets_type_status_created
  ON assets (asset_type, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_assets_operation_mode
  ON assets (operation_mode)
  WHERE operation_mode IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_allocations_state_created
  ON allocations (state, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_insurance_expiry
  ON insurance_policies (expiry_date);

CREATE INDEX IF NOT EXISTS idx_insurance_asset
  ON insurance_policies (asset_id);

CREATE INDEX IF NOT EXISTS idx_driver_license_expiry
  ON driver_profiles (expiry_date);

CREATE INDEX IF NOT EXISTS idx_users_role_created
  ON users (role, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_suppliers_category
  ON suppliers (category);

CREATE INDEX IF NOT EXISTS idx_suppliers_name_lower
  ON suppliers (LOWER(name));
