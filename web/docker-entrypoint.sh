#!/bin/sh
# Docker entrypoint for production
# Waits for dependencies, then starts the application (migrations run via instrumentation.ts)

set -e

echo "Starting Navigator VMS API..."

DB_HOST="${MAIN_DB_HOST:-host.docker.internal}"
DB_PORT="${MAIN_DB_PORT:-${POSTGRES_PORT:-5432}}"
DB_USER="${MAIN_DB_USER:-${POSTGRES_USER:-vms}}"
DB_PASSWORD="${MAIN_DB_PASSWORD:-${POSTGRES_PASSWORD:-vms}}"
DB_NAME="${MAIN_DB_NAME:-${POSTGRES_DB:-vms_main}}"

# Wait for database login (pg_isready alone does not verify credentials)
echo "Waiting for database (${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME})..."
attempt=0
until PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT 1" > /dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -eq 1 ] || [ $((attempt % 15)) -eq 0 ]; then
    echo "Database not ready yet (attempt ${attempt})."
    echo "On the host, create the VMS role/database:"
    echo "  npm run setup:db"
    echo "Or set MAIN_DB_* in .env to match your local PostgreSQL."
  fi
  sleep 2
done
echo "Database is ready."

# Wait for Redis if required
if [ "${VMS_REDIS_REQUIRED:-false}" = "true" ] && [ -n "${REDIS_ADDR}" ]; then
    echo "Waiting for Redis..."
    REDIS_HOST=$(echo "${REDIS_ADDR}" | cut -d: -f1)
    REDIS_PORT=$(echo "${REDIS_ADDR}" | cut -d: -f2)
    if [ -n "${REDIS_PASSWORD}" ]; then
        until redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" -a "${REDIS_PASSWORD}" ping > /dev/null 2>&1; do
            sleep 2
        done
    else
        until redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" ping > /dev/null 2>&1; do
            sleep 2
        done
    fi
    echo "Redis is ready."
fi

echo "Starting application..."
exec "$@"
