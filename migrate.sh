#!/bin/sh
set -e

echo "Waiting for Postgres at db:5432..."

# Wait until TCP connection is ready
until pg_isready -h db -U "$POSTGRES_USER" -d "$POSTGRES_DB"; do
    sleep 1
done

echo "Postgres ready, running migrations..."

for f in /migrations/*.sql; do
    echo "Running $f..."
    psql "postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DB" -f "$f"
done

echo "DB migrations complete."
