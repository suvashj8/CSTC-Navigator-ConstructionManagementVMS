#!/bin/sh
# Docker entrypoint for production
# Runs database migrations, seeds demo data, then starts the application

set -e

echo "🚀 Starting Navigator VMS API..."

# Wait for database to be ready
echo "⏳ Waiting for database..."
until pg_isready -h "${POSTGRES_HOST:-postgres}" -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER:-vms}" -d "${POSTGRES_DB:-vms_main}" > /dev/null 2>&1; do
    sleep 2
done
echo "✅ Database is ready!"

# Wait for Redis if required
if [ "${VMS_REDIS_REQUIRED:-false}" = "true" ] && [ -n "${REDIS_ADDR}" ]; then
    echo "⏳ Waiting for Redis..."
    REDIS_HOST=$(echo "${REDIS_ADDR}" | cut -d: -f1)
    REDIS_PORT=$(echo "${REDIS_ADDR}" | cut -d: -f2)
    until redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" -a "${REDIS_PASSWORD}" ping > /dev/null 2>&1; do
        sleep 2
    done
    echo "✅ Redis is ready!"
fi

# Run main database migrations
echo "🔄 Running main database migrations..."
node -e "
const { mainUp } = require('./lib/migrate');
const { getMainPool } = require('./lib/db');
(async () => {
    try {
        await mainUp(getMainPool());
        console.log('✅ Main migrations completed');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
})();
"

# Seed demo data if enabled
if [ "${SEED_ON_STARTUP:-false}" = "true" ]; then
    echo "🌱 Seeding demo data..."
    node -e "
    const { getTenantManager } = require('./lib/tenant-manager');
    const { warmDemoOnStartup } = require('./lib/ensure-demo');
    (async () => {
        try {
            const tm = getTenantManager();
            await tm.ensureReady();
            await warmDemoOnStartup(tm);
            console.log('✅ Demo seeding completed');
        } catch (err) {
            console.error('❌ Demo seeding failed:', err);
            process.exit(1);
        }
    })();
    "
fi

# Start the application
echo "🎯 Starting application..."
exec "$@"