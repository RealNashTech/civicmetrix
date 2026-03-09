#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://127.0.0.1:3000}"

echo "[deploy-check] running migration safety checks"
npm run check:migrations

check_endpoint() {
  local path="$1"
  local code
  code="$(curl -sS -o /tmp/deploy-check-body -w "%{http_code}" "${BASE_URL}${path}")"

  if [[ "$code" -lt 200 || "$code" -ge 300 ]]; then
    echo "[deploy-check] failed: ${path} returned ${code}"
    echo "[deploy-check] response body:"
    cat /tmp/deploy-check-body
    exit 1
  fi

  echo "[deploy-check] ok: ${path} (${code})"
}

check_endpoint "/api/health"
check_endpoint "/api/ready"
check_endpoint "/api/metrics"

echo "[deploy-check] all checks passed"
