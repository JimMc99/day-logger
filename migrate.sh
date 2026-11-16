#!/bin/sh
set -e

echo "Waiting for Postgres..."
until pg_isready -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB"; do
    sleep 1
done

echo "Postgres ready."

DB_URL="postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DB"

# Create the migrations tracking table if it doesn't exist
psql "$DB_URL" -c "
  CREATE TABLE IF NOT EXISTS schema_migrations (
    filename VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
"

echo "Running migrations..."

for f in $(ls /migrations/*.sql | sort); do
    filename=$(basename "$f")

    # Check if this migration has already been applied
    already_run=$(psql "$DB_URL" -tAc "SELECT COUNT(*) FROM schema_migrations WHERE filename = '$filename';")

    if [ "$already_run" = "1" ]; then
        echo "Skipping $filename (already applied)"
    else
        echo "Applying $filename..."
        psql "$DB_URL" -1 -v ON_ERROR_STOP=1 -f "$f"
        psql "$DB_URL" -c "INSERT INTO schema_migrations (filename) VALUES ('$filename');"
        echo "Applied $filename."
    fi
done

echo "All migrations complete."
