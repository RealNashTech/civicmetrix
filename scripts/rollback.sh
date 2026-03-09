#!/usr/bin/env bash
set -euo pipefail

timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "[rollback] started at ${timestamp}"

pm2 reload ecosystem.config.js --update-env

echo "[rollback] completed at $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
