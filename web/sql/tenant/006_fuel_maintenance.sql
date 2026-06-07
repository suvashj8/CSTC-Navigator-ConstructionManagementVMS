-- Fuel logs and maintenance work orders (Suvash VMS pattern)

CREATE TABLE IF NOT EXISTS fuel_logs (
  fuel_log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(asset_id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(supplier_id) ON DELETE SET NULL,
  fueled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  odometer_km INTEGER,
  liters NUMERIC(10,2),
  total_cost NUMERIC(12,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fuel_logs_asset_fueled ON fuel_logs(asset_id, fueled_at DESC);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_created ON fuel_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS maintenance_jobs (
  job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(asset_id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(supplier_id) ON DELETE SET NULL,
  scheduled_at DATE,
  completed_at DATE,
  status TEXT NOT NULL DEFAULT 'Scheduled',
  description TEXT,
  parts_cost NUMERIC(12,2) DEFAULT 0,
  labor_cost NUMERIC(12,2) DEFAULT 0,
  odometer_at_service INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_asset_created ON maintenance_jobs(asset_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_jobs(status);
