-- Multi-asset requests, optional driver, and receiving authority.

ALTER TABLE allocations ALTER COLUMN driver_id DROP NOT NULL;

ALTER TABLE allocations ADD COLUMN IF NOT EXISTS group_id UUID;
ALTER TABLE allocations ADD COLUMN IF NOT EXISTS external_driver_name VARCHAR(120);
ALTER TABLE allocations ADD COLUMN IF NOT EXISTS external_driver_contact VARCHAR(40);
ALTER TABLE allocations ADD COLUMN IF NOT EXISTS receiver_user_id UUID REFERENCES users(user_id);
ALTER TABLE allocations ADD COLUMN IF NOT EXISTS receiver_role VARCHAR(20);
ALTER TABLE allocations ADD COLUMN IF NOT EXISTS receiver_name VARCHAR(120);
ALTER TABLE allocations ADD COLUMN IF NOT EXISTS receiver_contact VARCHAR(40);

CREATE INDEX IF NOT EXISTS idx_allocations_group_id ON allocations(group_id);
