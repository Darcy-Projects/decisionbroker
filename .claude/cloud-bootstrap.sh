#!/usr/bin/env bash
# Bootstrap an Anthropic cloud sandbox for DecisionBroker.
# No-op outside the cloud so it never touches the local dev machine.
set -euo pipefail
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0

echo "[cloud-bootstrap] installing dependencies…"
npm install

# Fresh cloud sandboxes start with the Docker daemon stopped (no
# /var/run/docker.sock). Start it before db:up, or `set -e` aborts the whole
# bootstrap here — leaving no .env.local and no migrations.
if ! docker info >/dev/null 2>&1; then
  echo "[cloud-bootstrap] docker daemon not running — starting it…"
  if ! sudo service docker start >/dev/null 2>&1; then
    sudo dockerd >/tmp/dockerd.log 2>&1 &
  fi
  for i in $(seq 1 30); do
    docker info >/dev/null 2>&1 && break
    sleep 1
  done
  docker info >/dev/null 2>&1 || {
    echo "[cloud-bootstrap] ERROR: docker daemon did not start (see /tmp/dockerd.log)"
    exit 1
  }
fi

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
