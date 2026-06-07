-- Vehicle operation: route+KM vs place+hours (dozer)
ALTER TABLE assets ADD COLUMN IF NOT EXISTS operation_mode VARCHAR(10);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS route_from TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS route_to TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS operation_km DECIMAL(10, 2);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS operation_place VARCHAR(200);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS operation_hours SMALLINT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS operation_minutes SMALLINT;
