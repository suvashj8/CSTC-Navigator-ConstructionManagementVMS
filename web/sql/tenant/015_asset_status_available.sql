-- Add 'available' to asset_status enum
-- An asset is 'available' when it exists in the fleet but is not yet assigned/active.
ALTER TYPE asset_status ADD VALUE IF NOT EXISTS 'available';
