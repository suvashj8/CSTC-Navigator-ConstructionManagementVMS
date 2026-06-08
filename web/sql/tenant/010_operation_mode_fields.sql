-- Custom operation modes: user-defined field labels + stored values on assets.
ALTER TABLE operation_mode_catalog ADD COLUMN IF NOT EXISTS field_labels JSONB NOT NULL DEFAULT '[]';

ALTER TABLE operation_mode_catalog DROP CONSTRAINT IF EXISTS operation_mode_catalog_tracking_chk;
ALTER TABLE operation_mode_catalog ADD CONSTRAINT operation_mode_catalog_tracking_chk
  CHECK (tracking_type IN ('km', 'hour', 'both', 'custom'));

ALTER TABLE assets ADD COLUMN IF NOT EXISTS operation_custom_fields JSONB NOT NULL DEFAULT '{}';

ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_operation_mode_chk;
-- operation_mode may be km | hour | custom (VARCHAR(10) on assets)
