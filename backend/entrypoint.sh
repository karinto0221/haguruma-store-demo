#!/bin/sh
set -e

# 必須環境変数チェック
: "${JWT_SECRET:?ERROR: JWT_SECRET is not set}"

echo "Running database migrations..."
node node_modules/.bin/typeorm migration:run --dataSource dist/database/data-source.js

echo "Starting server..."
exec node dist/main
