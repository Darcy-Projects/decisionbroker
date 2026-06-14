#!/usr/bin/env bash
# Bootstrap an Anthropic cloud sandbox for DecisionBroker.
# No-op outside the cloud so it never touches the local dev machine.
set -euo pipefail
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0

echo "[cloud-bootstrap] installing dependencies…"
npm install

echo "[cloud-bootstrap] starting local Postgres (docker compose)…"
npm run db:up

# Provide the standard local connection string the same way .env.local does.
# Safe to write here because this branch only runs in the cloud sandbox.
if [ ! -f .env.local ]; then
  echo 'DATABASE_URL="postgresql://postgres:postgres@localhost:5432/decisionbroker"' > .env.local
fi

echo "[cloud-bootstrap] waiting for Postgres to accept connections…"
for i in $(seq 1 30); do
  if docker exec decisionbroker-postgres pg_isready -U postgres >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "[cloud-bootstrap] applying migrations…"
npm run db:migrate

echo "[cloud-bootstrap] ready."
