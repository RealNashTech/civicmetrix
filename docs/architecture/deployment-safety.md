# Deployment Safety

## Health Checks
Endpoint:
- `GET /api/health`

Purpose:
- verify application process liveness
- verify database connectivity with a lightweight query (`SELECT 1`)

Response shape:
- `status`
- `uptime`
- `timestamp`

Failure behavior:
- returns HTTP `500` when database connectivity check fails

## Readiness Checks
Endpoint:
- `GET /api/ready`

Purpose:
- verify runtime readiness for serving traffic
- verify critical dependencies:
  - database
  - Redis
  - worker queue connection

Success behavior:
- returns HTTP `200` with `{ "status": "ready" }`

Failure behavior:
- returns HTTP `503` when any dependency check fails

## Deployment Verification
Script:
- `scripts/deploy-check.sh`

Checks:
- `/api/health`
- `/api/ready`
- `/api/metrics`

Behavior:
- exits non-zero (`exit 1`) if any endpoint does not return a 2xx status

Usage:
- `scripts/deploy-check.sh`
- `scripts/deploy-check.sh https://your-domain.example`

## Rollback Process
Script:
- `scripts/rollback.sh`

Behavior:
- logs rollback start time
- runs `pm2 reload ecosystem.config.js --update-env`
- logs rollback completion time

Usage:
- `scripts/rollback.sh`
