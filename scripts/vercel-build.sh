#!/usr/bin/env bash
# Build na Vercel. Migrações e seed rodam só em produção (VERCEL_ENV=production);
# deploys de preview nunca alteram o banco de produção.
set -euo pipefail
npx prisma generate
if [ "${VERCEL_ENV:-}" = "production" ]; then
  npx prisma migrate deploy
  SEED_DEMO_USERS="${SEED_DEMO_USERS:-0}" npx tsx prisma/seed.ts
fi
npx next build
