-- Search and join performance indexes

-- Enable pg_trgm for trigram similarity search (run once per database)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram index for assets search (reg_serial_no, make, model)
-- Used by listAssets WHERE LOWER(...) LIKE '%term%'
CREATE INDEX IF NOT EXISTS idx_assets_search_trgm
  ON assets USING gin (reg_serial_no gin_trgm_ops, make gin_trgm_ops, model gin_trgm_ops);

-- Supplier join index for fuel_logs
-- Used by listFuelLogs LEFT JOIN suppliers ON supplier_id
CREATE INDEX IF NOT EXISTS idx_fuel_logs_supplier
  ON fuel_logs (supplier_id)
  WHERE supplier_id IS NOT NULL;

-- Supplier join index for maintenance_jobs
-- Used by listMaintenance LEFT JOIN suppliers ON supplier_id
CREATE INDEX IF NOT EXISTS idx_maintenance_supplier
  ON maintenance_jobs (supplier_id)
  WHERE supplier_id IS NOT NULL;