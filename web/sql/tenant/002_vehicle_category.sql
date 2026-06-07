-- Add vehicle category for fleet vehicles (Car, Bus, Truck, etc.)
ALTER TABLE assets ADD COLUMN IF NOT EXISTS vehicle_category VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_assets_vehicle_category ON assets(vehicle_category) WHERE vehicle_category IS NOT NULL;
