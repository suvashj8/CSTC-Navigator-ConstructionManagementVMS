-- Vehicle registry fields (Suvash VMS alignment)
ALTER TABLE assets ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS rta_office TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS alert_cell_number VARCHAR(30);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS registration_date DATE;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS bluebook_no VARCHAR(80);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS bluebook_issued_at DATE;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS bluebook_expires_at DATE;
