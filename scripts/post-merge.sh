#!/bin/bash
set -e

npm install

cd floodguard-backend
npx prisma generate
npx prisma migrate deploy

# Seed baseline + demo scenario data into the database
# Uses raw SQL to bypass Prisma 5.x binary Float encoding issue (PostgreSQL error 22P03)
echo "Running database seed (includes demo scenario data)…"
npx prisma db seed || true
echo "Post-merge setup complete."
