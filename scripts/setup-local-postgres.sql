-- One-time setup for local PostgreSQL (run as superuser)
--   npm run setup:db
--
-- Creates the VMS role and main database for host dev and Docker API containers.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'vms') THEN
    CREATE ROLE vms LOGIN PASSWORD 'vms';
  END IF;
END
$$;

ALTER ROLE vms WITH LOGIN PASSWORD 'vms';

SELECT 'CREATE DATABASE vms_main OWNER vms'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'vms_main')\gexec

GRANT ALL PRIVILEGES ON DATABASE vms_main TO vms;
