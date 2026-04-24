#!/bin/bash
set -e

npm install

cd floodguard-backend
npx prisma generate
npx prisma migrate deploy
